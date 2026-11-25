import { byName, childText, firstText, mapSport, metresBetween, parseXml, round, splitsFromPoints, summarisePoints, toNum, toTime } from "./common.js";

/* ---------------------------------------------------------------
   GPX READER

   Reads one GPX file (text) into one activity:
     { type, sport, name, startedAt, durationSec, elapsedSec, km,
       avgHR, maxHR, splits, points }
   The start time comes from the first track point (or the metadata
   time). It never comes from the clock of the phone.
   Heart rate comes from any extension element named "hr" or
   "heartrate" (Garmin TrackPointExtension and others).
   Throws an Error with a plain message when the file has no use.
--------------------------------------------------------------- */

function pointHR(trkpt) {
  for (const name of ["hr", "heartrate", "HeartRate"]) {
    const v = toNum(firstText(trkpt, name));
    if (v && v > 20 && v < 260) return v;
  }
  return null;
}

export function parseGpx(text, options = {}) {
  const doc = parseXml(text, options);
  const root = doc.documentElement;
  if (!root || (root.localName || root.nodeName) !== "gpx") throw new Error("The file is not a GPX file.");

  const trk = byName(root, "trk")[0] || null;
  const name = (trk && childText(trk, "name")) || firstText(byName(root, "metadata")[0], "name") || null;
  const sport = (trk && childText(trk, "type")) || null;
  const metaTime = toTime(firstText(byName(root, "metadata")[0], "time"));

  let nodes = byName(root, "trkpt");
  if (!nodes.length) nodes = byName(root, "rtept");
  const points = [];
  let d = 0;
  let prev = null;
  for (const node of nodes) {
    const lat = toNum(node.getAttribute("lat"));
    const lon = toNum(node.getAttribute("lon"));
    if (lat === null || lon === null) continue;
    const p = { lat, lon, ele: toNum(childText(node, "ele")), t: toTime(childText(node, "time")), hr: pointHR(node), d: 0 };
    if (prev) d += metresBetween(prev, p);
    p.d = d;
    points.push(p);
    prev = p;
  }

  const sum = summarisePoints(points);
  const startMs = (sum && sum.startMs) || metaTime;
  if (!startMs) throw new Error("The file has no time.");
  if (!sum || sum.elapsedSec <= 0) throw new Error("The file has no track with time.");

  return {
    type: mapSport(sport),
    sport,
    name,
    startedAt: new Date(startMs).toISOString(),
    durationSec: sum.movingSec || sum.elapsedSec,
    elapsedSec: sum.elapsedSec,
    km: round(d / 1000, 3),
    avgHR: sum.avgHR,
    maxHR: sum.maxHR,
    splits: splitsFromPoints(points),
    points,
  };
}
