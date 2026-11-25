import { byName, childText, childrenByName, mapSport, metresBetween, parseXml, round, splitsFromPoints, summarisePoints, toNum, toTime } from "./common.js";

/* ---------------------------------------------------------------
   TCX READER

   Reads the first activity of a TCX file (text) into one activity:
     { type, sport, name, startedAt, durationSec, elapsedSec, km,
       avgHR, maxHR, laps, splits, points }
   The totals come from the laps (TotalTimeSeconds, DistanceMeters).
   When the laps have no totals, the track points give them.
--------------------------------------------------------------- */

function bpm(node, name) {
  const el = childrenByName(node, name)[0];
  return el ? toNum(childText(el, "Value")) : null;
}

export function parseTcx(text, options = {}) {
  const doc = parseXml(text, options);
  const activity = byName(doc, "Activity")[0];
  if (!activity) throw new Error("The file has no activity.");
  const sport = activity.getAttribute("Sport") || null;
  const idTime = toTime(childText(activity, "Id"));
  const notes = childText(activity, "Notes");

  const laps = [];
  const points = [];
  let lastD = null;
  let geoD = 0;
  let prevGeo = null;
  for (const lapNode of childrenByName(activity, "Lap")) {
    const lap = {
      startedAt: lapNode.getAttribute("StartTime") || null,
      sec: toNum(childText(lapNode, "TotalTimeSeconds")),
      km: toNum(childText(lapNode, "DistanceMeters")),
      avgHR: bpm(lapNode, "AverageHeartRateBpm"),
      maxHR: bpm(lapNode, "MaximumHeartRateBpm"),
    };
    if (lap.km !== null) lap.km = round(lap.km / 1000, 3);
    laps.push(lap);
    for (const tp of byName(lapNode, "Trackpoint")) {
      const t = toTime(childText(tp, "Time"));
      if (t === null) continue;
      const pos = childrenByName(tp, "Position")[0];
      const lat = pos ? toNum(childText(pos, "LatitudeDegrees")) : null;
      const lon = pos ? toNum(childText(pos, "LongitudeDegrees")) : null;
      let d = toNum(childText(tp, "DistanceMeters"));
      if (lat !== null && lon !== null) {
        const here = { lat, lon };
        if (prevGeo) geoD += metresBetween(prevGeo, here);
        prevGeo = here;
        if (d === null) d = geoD;
      }
      if (d === null) d = lastD;
      lastD = d;
      const hr = bpm(tp, "HeartRateBpm");
      points.push({ t, lat, lon, ele: toNum(childText(tp, "AltitudeMeters")), d, hr: hr && hr > 20 && hr < 260 ? hr : null });
    }
  }

  const sum = summarisePoints(points);
  const lapSec = laps.reduce((s, l) => s + (l.sec || 0), 0);
  const lapKm = laps.reduce((s, l) => s + (l.km || 0), 0);
  const firstLapMs = laps.length ? toTime(laps[0].startedAt) : null;
  const startMs = idTime || firstLapMs || (sum && sum.startMs);
  if (!startMs) throw new Error("The file has no time.");

  let durationSec = lapSec > 0 ? Math.round(lapSec) : sum ? sum.movingSec || sum.elapsedSec : 0;
  if (!(durationSec > 0)) throw new Error("The file has no duration.");
  const km = lapKm > 0 ? round(lapKm, 3) : sum && sum.metres ? round(sum.metres / 1000, 3) : null;

  // Heart rate: time-weighted from the laps when they have it.
  let avgHR = null;
  const hrLaps = laps.filter((l) => l.avgHR && l.sec);
  if (hrLaps.length) {
    const t = hrLaps.reduce((s, l) => s + l.sec, 0);
    avgHR = Math.round(hrLaps.reduce((s, l) => s + l.avgHR * l.sec, 0) / t);
  } else if (sum) avgHR = sum.avgHR;
  const lapMax = laps.reduce((m, l) => (l.maxHR && (m === null || l.maxHR > m) ? l.maxHR : m), null);
  const maxHR = lapMax || (sum ? sum.maxHR : null);

  return {
    type: mapSport(sport),
    sport,
    name: notes || null,
    startedAt: new Date(startMs).toISOString(),
    durationSec,
    elapsedSec: sum ? sum.elapsedSec : durationSec,
    km,
    avgHR,
    maxHR,
    laps: laps.map((l) => ({ sec: l.sec !== null ? Math.round(l.sec) : null, km: l.km, avgHR: l.avgHR, maxHR: l.maxHR })),
    splits: splitsFromPoints(points),
    points,
  };
}
