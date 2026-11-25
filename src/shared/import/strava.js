import { isStrengthSport, mapSport, round } from "./common.js";

/* ---------------------------------------------------------------
   STRAVA activities.csv READER

   A Strava bulk export has one activities.csv file. It has one row for
   each activity. Some column names occur two times:
     - the first "Distance" is in km (or miles), the second is in metres,
     - the first "Elapsed Time" and the second are both in seconds.
   The reader uses the metres column when it has a value.

   "Activity Date" is in UTC, for example "Nov 3, 2024, 7:12:45 AM".

   Strava data is shown only to its owner. It is never sent to an AI.
--------------------------------------------------------------- */

// RFC 4180 CSV: quotes, "" inside quotes, new lines inside quotes.
export function parseCsv(text) {
  const s = String(text || "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
}

// "5.02", "5,02", "1,234.5" and "" to a number or null.
export function csvNumber(v) {
  if (v === null || v === undefined) return null;
  let t = String(v).trim();
  if (!t) return null;
  if (/^-?\d+,\d+$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

// Strava "Activity Date" (UTC) to milliseconds, or null.
export function parseStravaDate(v) {
  const t = String(v || "").trim();
  if (!t) return null;
  let m = t.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AaPp][Mm])?$/);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    let h = Number(m[4]);
    const ap = (m[7] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return Date.UTC(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]), h, Number(m[5]), Number(m[6] || 0));
  }
  // "3 Nov 2024, 07:12:45" (some locales).
  m = t.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  }
  // "2024-11-03 07:12:45" or ISO.
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?Z?$/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  return null;
}

export function isStravaCsv(text) {
  const head = String(text || "").slice(0, 2000).split(/\r?\n/)[0] || "";
  return /Activity ID/i.test(head) && /Activity Type/i.test(head) && /Activity Date/i.test(head);
}

/* Returns { rows: [...], errors: [{ line, reason }] }. Each row:
     { id, startedAt, type, sport, strength, name, description,
       km, movingSec, elapsedSec, avgHR, maxHR, file }
   `file` is the path in the export, for example "activities/123.gpx.gz",
   or null for an activity with no file. */
export function parseStravaCsv(text) {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], errors: [] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const cols = {};
  header.forEach((h, i) => {
    (cols[h] = cols[h] || []).push(i);
  });
  const at = (row, name, which = 0) => {
    const idx = cols[name];
    if (!idx || idx[which] === undefined) return null;
    const v = row[idx[which]];
    return v === undefined ? null : v;
  };
  const rows = [];
  const errors = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const startMs = parseStravaDate(at(row, "activity date"));
    if (startMs === null) {
      errors.push({ line: r + 1, reason: "The date in this row is not clear." });
      continue;
    }
    const sport = (at(row, "activity type") || "").trim() || null;
    const metres = csvNumber(at(row, "distance", 1));
    const firstKm = csvNumber(at(row, "distance", 0));
    const km = metres !== null ? metres / 1000 : firstKm;
    const elapsed = csvNumber(at(row, "elapsed time", 0)) ?? csvNumber(at(row, "elapsed time", 1));
    const moving = csvNumber(at(row, "moving time"));
    const hrMax = csvNumber(at(row, "max heart rate", 0)) ?? csvNumber(at(row, "max heart rate", 1));
    const hrAvg = csvNumber(at(row, "average heart rate"));
    const file = (at(row, "filename") || "").trim() || null;
    rows.push({
      id: (at(row, "activity id") || "").trim() || null,
      startedAt: new Date(startMs).toISOString(),
      type: mapSport(sport),
      sport,
      strength: isStrengthSport(sport),
      name: (at(row, "activity name") || "").trim() || null,
      description: (at(row, "activity description") || "").trim() || null,
      km: km !== null && km > 0 ? round(km, 3) : null,
      movingSec: moving !== null && moving > 0 ? Math.round(moving) : null,
      elapsedSec: elapsed !== null && elapsed > 0 ? Math.round(elapsed) : null,
      avgHR: hrAvg && hrAvg > 20 ? Math.round(hrAvg) : null,
      maxHR: hrMax && hrMax > 20 ? Math.round(hrMax) : null,
      file,
    });
  }
  return { rows, errors };
}
