/* ---------------------------------------------------------------
   IMPORT HELPERS

   Small helpers that the GPX, TCX and FIT readers share:
   - the XML parser (DOMParser; tests can inject one),
   - distance between two points,
   - the sport mapping to the store's activity type ids,
   - splits per kilometre from track points.
--------------------------------------------------------------- */

let injectedParser = null;

// Tests in Node have no DOMParser. They can give one here (for example
// the DOMParser of jsdom). The browser and the WebView use their own.
export function setDOMParser(Parser) {
  injectedParser = Parser || null;
}

export function parseXml(text, options = {}) {
  const Parser = options.DOMParser || injectedParser || (typeof DOMParser !== "undefined" ? DOMParser : null);
  if (!Parser) throw new Error("This device cannot read XML files.");
  // Strava writes spaces before "<?xml" in TCX files. An XML parser
  // refuses that, so remove them.
  const clean = String(text || "").replace(/^﻿/, "").trim();
  const doc = new Parser().parseFromString(clean, "application/xml");
  const err = doc.getElementsByTagName("parsererror");
  if (err && err.length) throw new Error("The file is not valid XML.");
  return doc;
}

// All elements with this local name, with or without a namespace prefix.
export function byName(node, localName) {
  if (!node) return [];
  if (node.getElementsByTagNameNS) return Array.from(node.getElementsByTagNameNS("*", localName));
  return Array.from(node.getElementsByTagName(localName));
}

// Direct children with this local name.
export function childrenByName(node, localName) {
  if (!node || !node.childNodes) return [];
  return Array.from(node.childNodes).filter((c) => c.nodeType === 1 && (c.localName || c.nodeName) === localName);
}

export function firstText(node, localName) {
  const el = byName(node, localName)[0];
  return el && el.textContent != null ? el.textContent.trim() : null;
}

export function childText(node, localName) {
  const el = childrenByName(node, localName)[0];
  return el && el.textContent != null ? el.textContent.trim() : null;
}

export function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function toTime(v) {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : new Date(String(v).trim()).getTime();
  return Number.isFinite(t) ? t : null;
}

const R_EARTH = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;

// Distance in metres between two points (haversine).
export function metresBetween(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* Sport words from files (GPX <type>, TCX Sport, FIT sport, Strava and
   Intervals.icu types) to the store's activity type ids. The store keeps
   an unknown id as "run", so every value here must be a real id from
   src/data/activities.js. */
// Strava writes a number in the GPX <type> field.
const STRAVA_NUMERIC = { 1: "cycle", 4: "hike", 9: "run", 10: "walk" };

const SPORT_MAP = [
  [/^(virtual ?run|treadmill|treadmill_running|indoor_running)$/, "treadmill"],
  [/^(trail ?run|trail_running|street_running|track_running|ultra ?run)$/, "run"],
  [/(^|_| )run(ning)?$/, "run"],
  [/^(virtual ?ride|indoor_cycling|spinning|stationary ?bike)$/, "stationary-bike"],
  [/(ride|bik(e|ing)|cycl(e|ing))/, "cycle"],
  [/^(hike|hiking|mountaineering)$/, "hike"],
  [/(walk|walking)$/, "walk"],
  [/(swim|swimming|lap_swimming|open_water)/, "swim"],
  [/^(rowing|indoor_rowing|row|virtual ?row)$/, "rower"],
  [/^(elliptical)$/, "elliptical"],
  [/^(soccer|football)$/, "football"],
  [/^(stair ?stepper|stair_climbing)$/, "stair-climber"],
];

export function mapSport(value) {
  if (value === null || value === undefined) return "other";
  const v = String(value).trim().toLowerCase();
  if (!v) return "other";
  if (/^\d+$/.test(v)) return STRAVA_NUMERIC[Number(v)] || "other";
  for (const [re, id] of SPORT_MAP) if (re.test(v)) return id;
  return "other";
}

// Strength sessions from other apps. Lift mode logs these itself.
export function isStrengthSport(value) {
  return /^(weight ?training|strength_training|training|crossfit|workout|weighttraining)$/i.test(String(value || "").trim());
}

/* Splits per kilometre from points with { t (ms), d (cumulative metres),
   hr }. Returns [{ km, sec, hr }] where `km` is the split number and the
   last split can be shorter (then it has `dist` in km). */
export function splitsFromPoints(points, maxSplits = 100) {
  const pts = (points || []).filter((p) => p.t !== null && p.d !== null);
  if (pts.length < 2) return [];
  const out = [];
  let mark = 1000;
  let lastT = pts[0].t;
  let hrSum = 0;
  let hrN = 0;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[i - 1];
    if (p.hr) {
      hrSum += p.hr;
      hrN++;
    }
    while (p.d >= mark && out.length < maxSplits) {
      const span = p.d - prev.d;
      const share = span > 0 ? (mark - prev.d) / span : 1;
      const at = prev.t + (p.t - prev.t) * share;
      out.push({ km: out.length + 1, sec: Math.round((at - lastT) / 1000), hr: hrN ? Math.round(hrSum / hrN) : null });
      lastT = at;
      hrSum = 0;
      hrN = 0;
      mark += 1000;
    }
  }
  const last = pts[pts.length - 1];
  const rest = last.d - (mark - 1000);
  if (rest >= 100 && out.length < maxSplits) {
    out.push({ km: out.length + 1, sec: Math.round((last.t - lastT) / 1000), hr: hrN ? Math.round(hrSum / hrN) : null, dist: Math.round(rest) / 1000 });
  }
  return out;
}

/* Summary of a point list: { startMs, endMs, elapsedSec, movingSec,
   metres, avgHR, maxHR }. Moving time counts each step that is shorter
   than 60 seconds and faster than 0.5 m/s (or each step with no
   position when the file gives distance). */
export function summarisePoints(points) {
  const pts = (points || []).filter((p) => p.t !== null);
  if (!pts.length) return null;
  let moving = 0;
  let hrSum = 0;
  let hrN = 0;
  let maxHR = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.hr) {
      hrSum += p.hr;
      hrN++;
      if (maxHR === null || p.hr > maxHR) maxHR = p.hr;
    }
    if (i === 0) continue;
    const prev = pts[i - 1];
    const dt = (p.t - prev.t) / 1000;
    if (!(dt > 0) || dt > 60) continue;
    const dd = p.d !== null && prev.d !== null ? p.d - prev.d : null;
    if (dd === null || dd / dt >= 0.5) moving += dt;
  }
  const withD = pts.filter((p) => p.d !== null);
  return {
    startMs: pts[0].t,
    endMs: pts[pts.length - 1].t,
    elapsedSec: Math.round((pts[pts.length - 1].t - pts[0].t) / 1000),
    movingSec: Math.round(moving),
    metres: withD.length ? withD[withD.length - 1].d : null,
    avgHR: hrN ? Math.round(hrSum / hrN) : null,
    maxHR,
  };
}

export const round = (v, dp = 0) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

// The last part of a path, for messages.
export function baseName(path) {
  return String(path || "").split(/[\\/]/).pop();
}
