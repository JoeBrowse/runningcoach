import { isStrengthSport, mapSport, round, splitsFromPoints, toNum, toTime } from "./common.js";

/* ---------------------------------------------------------------
   FIT READER

   Reads a FIT activity file (bytes) with fit-file-parser. One FIT file
   can hold more than one session (for example a triathlon). The reader
   gives one activity for each session:
     { type, sport, name, startedAt, durationSec, elapsedSec, km,
       avgHR, maxHR, laps, splits, points }
   Files with no session and no records (settings, sleep, monitoring
   files in a Garmin export) are not activities. The reader throws
   "Not an activity file." for them.
   The parser module loads only when the first FIT file arrives, so the
   app starts fast.
--------------------------------------------------------------- */

let parserModule = null;
async function loadParser() {
  if (!parserModule) parserModule = await import("fit-file-parser");
  return parserModule.default || parserModule;
}

function toArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

function sportOf(session) {
  const sub = String(session.sub_sport || "").toLowerCase();
  const sport = String(session.sport || "").toLowerCase();
  if (sub === "treadmill" && sport === "running") return { type: "treadmill", raw: "treadmill" };
  if ((sub === "indoor_cycling" || sub === "spin" || sub === "virtual_activity") && sport === "cycling") return { type: "stationary-bike", raw: sub };
  if (sub === "indoor_rowing" || sport === "rowing") return { type: "rower", raw: sport };
  if (sport === "training" || isStrengthSport(sport) || sub === "strength_training") return { type: "other", raw: "strength_training", strength: true };
  return { type: mapSport(sport), raw: sport || null };
}

const hrOk = (v) => (v && v > 20 && v < 260 ? Math.round(v) : null);

function inWindow(t, start, end) {
  return t !== null && t >= start - 1000 && t <= end + 1000;
}

export async function parseFit(bytes) {
  const FitParser = await loadParser();
  const parser = new FitParser({ force: true, mode: "list", speedUnit: "m/s", lengthUnit: "m" });
  let data;
  try {
    data = await parser.parseAsync(toArrayBuffer(bytes));
  } catch (e) {
    throw new Error("The FIT file is damaged.");
  }
  const sessions = (data && data.sessions) || [];
  const allLaps = (data && data.laps) || [];
  const records = ((data && data.records) || []).map((r) => ({
    t: toTime(r.timestamp),
    d: toNum(r.distance),
    hr: hrOk(toNum(r.heart_rate)),
    lat: toNum(r.position_lat),
    lon: toNum(r.position_long),
    ele: toNum(r.enhanced_altitude !== undefined ? r.enhanced_altitude : r.altitude),
  }));

  // Some devices write records but no session. Build one from the records.
  if (!sessions.length) {
    const timed = records.filter((r) => r.t !== null);
    const fileType = data && data.file_id ? String(data.file_id.type || "") : "";
    if (timed.length < 2 || (fileType && fileType !== "activity")) throw new Error("Not an activity file.");
    sessions.push({
      start_time: new Date(timed[0].t),
      total_elapsed_time: (timed[timed.length - 1].t - timed[0].t) / 1000,
      total_distance: timed.reduce((m, r) => (r.d !== null && r.d > m ? r.d : m), 0),
      sport: (data.sport && data.sport.sport) || null,
    });
  }

  return sessions.map((s) => {
    const startMs = toTime(s.start_time) || toTime(s.timestamp);
    if (!startMs) throw new Error("The file has no time.");
    const elapsed = toNum(s.total_elapsed_time);
    const timer = toNum(s.total_timer_time);
    const endMs = startMs + (elapsed || timer || 0) * 1000;
    const pts = records.filter((r) => inWindow(r.t, startMs, endMs));
    const laps = allLaps.filter((l) => inWindow(toTime(l.start_time), startMs, endMs)).map((l) => ({
      sec: toNum(l.total_timer_time) !== null ? Math.round(l.total_timer_time) : null,
      km: toNum(l.total_distance) !== null ? round(l.total_distance / 1000, 3) : null,
      avgHR: hrOk(toNum(l.avg_heart_rate)),
      maxHR: hrOk(toNum(l.max_heart_rate)),
    }));
    let metres = toNum(s.total_distance);
    if (metres === null) metres = pts.reduce((m, r) => (r.d !== null && r.d > m ? r.d : m), 0) || null;
    let avgHR = hrOk(toNum(s.avg_heart_rate));
    let maxHR = hrOk(toNum(s.max_heart_rate));
    if (!avgHR || !maxHR) {
      const hrs = pts.map((p) => p.hr).filter(Boolean);
      if (hrs.length) {
        if (!avgHR) avgHR = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
        if (!maxHR) maxHR = Math.max(...hrs);
      }
    }
    const sport = sportOf(s);
    const durationSec = Math.round(timer || elapsed || 0);
    if (!(durationSec > 0)) throw new Error("The file has no duration.");
    return {
      type: sport.type,
      sport: sport.raw,
      strength: !!sport.strength,
      name: null,
      startedAt: new Date(startMs).toISOString(),
      durationSec,
      elapsedSec: Math.round(elapsed || timer || 0),
      km: metres ? round(metres / 1000, 3) : null,
      avgHR,
      maxHR,
      laps,
      splits: splitsFromPoints(pts),
      points: pts,
    };
  });
}
