import { FitBaseType, FitEncoder } from "fit-file-parser/encoder";
import { BACKUP_TARGETS, backupFilename, capPlugin, collectBackup } from "../lib/backup.js";
import { isNativeRuntime } from "../lib/platform.js";
import { safeGet } from "../lib/storage.js";
import { KEYS, listActivities } from "./store.js";

/* ---------------------------------------------------------------
   EXPORT

   - activitiesCsv(): one row for each activity (runs, other sports and
     lift sessions) from listActivities().
   - setsCsv(): one row for each lift set (and each drop of a drop set).
   - runToGpx(run): a GPX file of a run with a track. The recorder keeps
     the track as `track: [{ t, lat, lon, ele }]` on the run.
   - Full backup: Iron Log's backup (lib/backup.js). It has every key
     under the storage prefix, so it has the run data too.
   - workoutToFit(workout): a FIT workout file (file_id, workout,
     workout_step) that a Garmin or COROS user can copy to the watch.
   - writeExportFile(): saves a file. The Android app writes to
     Downloads (or the next folder that works). A browser downloads it.
--------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const exportFilename = (what, ext, d) => `skid-marks-${what}-${stamp(d)}.${ext}`;

/* ---------- CSV ---------- */

// Quotes a cell when it must. A text cell that starts with = + - @ gets
// a leading apostrophe, so a spreadsheet does not run it as a formula.
export function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const r1 = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 10) / 10);
const r3 = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 1000) / 1000);

export const ACTIVITY_CSV_HEADER = ["date", "start_time", "type", "name", "minutes", "distance_km", "avg_hr", "max_hr", "effort_rpe", "origin"];

export function activitiesToCsv(list) {
  const rows = (list || []).map((a) => {
    const raw = a.raw || {};
    const origin = a.source === "lift" ? "lift" : raw.origin || (raw.source === "import" ? "import" : "app");
    // The store shows a type label ("Run") as the name. The CSV keeps the
    // name that the user or the file gave, when there is one.
    const name = a.source === "lift" ? a.name : raw.name || a.name;
    return [a.date, a.startedAt, a.type, name, r1(a.minutes), r3(a.km), a.avgHR, a.maxHR, r1(a.rpe), origin];
  });
  return toCsv(ACTIVITY_CSV_HEADER, rows);
}

export async function activitiesCsv() {
  return activitiesToCsv(await listActivities());
}

export const SETS_CSV_HEADER = ["date", "session", "exercise", "set", "weight", "unit", "reps", "rir", "rpe", "drop"];

export function setsToCsv(sessions, unit = "kg") {
  const rows = [];
  for (const s of sessions || []) {
    const session = s.dayName || s.split || "Lift";
    for (const ex of s.exercises || []) {
      (ex.sets || []).forEach((st, i) => {
        const rir = st.rir !== null && st.rir !== undefined && st.rir !== "" && Number.isFinite(Number(st.rir)) ? Number(st.rir) : null;
        const num = (v) => (v === "" || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : String(v));
        rows.push([s.date, session, ex.name || ex.id, i + 1, num(st.weight), unit, num(st.reps), rir, rir === null ? null : 10 - rir, ""]);
        (st.drops || []).forEach((d, j) => {
          rows.push([s.date, session, ex.name || ex.id, i + 1, num(d.weight), unit, num(d.reps), null, null, j + 1]);
        });
      });
    }
  }
  return toCsv(SETS_CSV_HEADER, rows);
}

export async function setsCsv() {
  const sessions = (await safeGet(KEYS.workoutHistory)) || [];
  const settings = (await safeGet(KEYS.settings)) || {};
  return setsToCsv(sessions, settings.weightUnit || "kg");
}

/* ---------- GPX ---------- */

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

export function hasTrack(run) {
  return !!(run && Array.isArray(run.track) && run.track.filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))).length >= 2);
}

// A stored run (raw record) with a track to GPX 1.1 text.
export function runToGpx(run) {
  if (!hasTrack(run)) throw new Error("This run has no GPS track.");
  const name = run.name || `Run ${run.date || ""}`.trim();
  const pts = run.track
    .filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
    .map((p) => {
      const t = p.t !== undefined && p.t !== null ? new Date(p.t) : null;
      const time = t && Number.isFinite(t.getTime()) ? `<time>${t.toISOString()}</time>` : "";
      const ele = Number.isFinite(Number(p.ele)) && p.ele !== null ? `<ele>${Number(p.ele).toFixed(1)}</ele>` : "";
      return `   <trkpt lat="${Number(p.lat).toFixed(6)}" lon="${Number(p.lon).toFixed(6)}">${ele}${time}</trkpt>`;
    });
  const start = run.startedAt || run.at;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Skid Marks" xmlns="http://www.topografix.com/GPX/1/1">',
    start ? ` <metadata><time>${new Date(start).toISOString()}</time></metadata>` : "",
    " <trk>",
    `  <name>${xmlEscape(name)}</name>`,
    `  <type>${run.type === "walk" ? "walking" : run.type === "hike" ? "hiking" : "running"}</type>`,
    "  <trkseg>",
    ...pts,
    "  </trkseg>",
    " </trk>",
    "</gpx>",
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// The newest stored activity with a track, or null.
export async function lastRunWithTrack() {
  const list = (await safeGet(KEYS.activityHistory)) || [];
  for (let i = list.length - 1; i >= 0; i--) if (hasTrack(list[i])) return list[i];
  return null;
}

export function gpxFilename(run) {
  const d = run && (run.startedAt || run.at) ? new Date(run.startedAt || run.at) : new Date();
  return `skid-marks-run-${stamp(d)}-${pad(d.getHours())}${pad(d.getMinutes())}.gpx`;
}

/* ---------- writing files ---------- */

function toBase64(bytes) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}

/* Saves text or bytes. Returns { label, path } of the place it used.
   Same pattern as writeBackupFile in lib/backup.js, with one change: the
   Filesystem plugin is used only in the Android app. In a browser,
   Capacitor also registers a web Filesystem that writes to IndexedDB,
   where the user cannot find the file. A browser gets a download. */
export async function writeExportFile(filename, data, mime = "text/plain") {
  const binary = data instanceof Uint8Array;
  const Filesystem = isNativeRuntime() ? capPlugin("Filesystem") : null;
  if (Filesystem) {
    let lastError = null;
    for (const target of BACKUP_TARGETS) {
      try {
        const opts = { path: target.prefix + filename, directory: target.directory, recursive: true };
        if (binary) opts.data = toBase64(data);
        else {
          opts.data = data;
          opts.encoding = "utf8";
        }
        const res = await Filesystem.writeFile(opts);
        return { label: target.label, path: (res && res.uri) || target.prefix + filename };
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("The app could not write the file.");
  }
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    throw new Error("This version of the app cannot save files.");
  }
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { label: "Downloads", path: filename };
}

export async function exportActivitiesCsv() {
  return writeExportFile(exportFilename("activities", "csv"), await activitiesCsv(), "text/csv");
}
export async function exportSetsCsv() {
  return writeExportFile(exportFilename("sets", "csv"), await setsCsv(), "text/csv");
}
export async function exportLastRunGpx() {
  const run = await lastRunWithTrack();
  if (!run) throw new Error("No run has a GPS track yet. Record a run with GPS first.");
  return writeExportFile(gpxFilename(run), runToGpx(run), "application/gpx+xml");
}
export async function exportFullBackup() {
  const backup = await collectBackup();
  const text = JSON.stringify(backup, null, 2);
  const where = await writeExportFile(backupFilename(), text, "application/json");
  return { ...where, items: Object.keys(backup.data).length, kb: Math.max(1, Math.round(text.length / 1024)) };
}

/* ---------- FIT workout ---------- */

/* workoutToFit(workout) -> Uint8Array (a .fit file).

   workout = {
     name: "6 x 400 m",
     steps: [
       { type: "warmup", sec: 600 },
       { repeat: 6, steps: [
         { type: "interval", m: 400, pace: { fast: 230, slow: 240 } },
         { type: "recover", sec: 90 },
       ] },
       { type: "cooldown", sec: 600 },
     ],
   }
   Step types: warmup, cooldown, run (or active, easy, interval),
   recover (or recovery), rest. Each step has `sec` (time) or `m`
   (distance), or neither (the step ends with the lap button).
   Targets: `pace: { fast, slow }` in seconds per km (or `secPerKm` for
   a window of +/- 5 s), or `hr: { low, high }` in beats per minute.
   The engine calculates the values. This function only writes them. */

const MSG = { fileId: 0, workout: 26, workoutStep: 27 };
const DURATION = { time: 0, distance: 1, open: 5, repeat: 6 };
const TARGET = { speed: 0, heartRate: 1, open: 2 };
const INTENSITY = { active: 0, rest: 1, warmup: 2, cooldown: 3, recovery: 4 };
const NAME_BYTES = 16;
const U32_MAX = 0xffffffff;

function fixedString(text, size = NAME_BYTES) {
  const out = new Uint8Array(size);
  const bytes = new TextEncoder().encode(String(text || ""));
  let n = Math.min(bytes.length, size - 1);
  // Do not cut a UTF-8 character in two.
  while (n > 0 && n < bytes.length && (bytes[n] & 0xc0) === 0x80) n--;
  out.set(bytes.subarray(0, n));
  return out;
}

function intensityOf(type) {
  const t = String(type || "").toLowerCase();
  if (t === "warmup" || t === "warm-up") return INTENSITY.warmup;
  if (t === "cooldown" || t === "cool-down") return INTENSITY.cooldown;
  if (t === "rest") return INTENSITY.rest;
  if (t === "recover" || t === "recovery") return INTENSITY.recovery;
  return INTENSITY.active;
}

const clampU32 = (v) => Math.max(0, Math.min(U32_MAX - 1, Math.round(v)));

function stepTarget(step) {
  const pace = step.pace || (step.secPerKm ? { fast: step.secPerKm - 5, slow: step.secPerKm + 5 } : null);
  if (pace && Number(pace.fast) > 0 && Number(pace.slow) > 0) {
    const fast = Math.min(Number(pace.fast), Number(pace.slow));
    const slow = Math.max(Number(pace.fast), Number(pace.slow));
    // Speed in m/s x 1000. The low speed is the slow pace.
    return { type: TARGET.speed, low: clampU32((1000 / slow) * 1000), high: clampU32((1000 / fast) * 1000) };
  }
  if (step.hr && Number(step.hr.low) > 0 && Number(step.hr.high) > 0) {
    // Heart rate in bpm is written as bpm + 100 (0-100 is % of maximum).
    return { type: TARGET.heartRate, low: clampU32(Math.min(step.hr.low, step.hr.high) + 100), high: clampU32(Math.max(step.hr.low, step.hr.high) + 100) };
  }
  return { type: TARGET.open, low: 0, high: 0 };
}

function stepLabel(step) {
  if (step.name) return step.name;
  const t = String(step.type || "run").toLowerCase();
  return { warmup: "Warm up", cooldown: "Cool down", rest: "Rest", recover: "Recover", recovery: "Recover", interval: "Hard" }[t] || "Run";
}

// Flattens the step tree into FIT step rows. A repeat block writes its
// child steps first, then one "repeat" row that points back to them.
export function flattenWorkoutSteps(steps) {
  const rows = [];
  function walk(list) {
    for (const step of list || []) {
      if (!step) continue;
      if (Array.isArray(step.steps) && step.steps.length) {
        const first = rows.length;
        walk(step.steps);
        const times = Math.max(1, Math.round(Number(step.repeat) || 1));
        rows.push({ name: step.name || `Repeat ${times}x`, durationType: DURATION.repeat, durationValue: first, target: { type: TARGET.open, low: 0, high: 0 }, targetValue: times, intensity: INTENSITY.active });
        continue;
      }
      let durationType = DURATION.open;
      let durationValue = 0;
      const sec = Number(step.sec ?? step.seconds ?? (step.min ? step.min * 60 : NaN));
      const metres = Number(step.m ?? step.metres ?? (step.km ? step.km * 1000 : NaN));
      if (sec > 0) {
        durationType = DURATION.time;
        durationValue = clampU32(sec * 1000);
      } else if (metres > 0) {
        durationType = DURATION.distance;
        durationValue = clampU32(metres * 100);
      }
      rows.push({ name: stepLabel(step), durationType, durationValue, target: stepTarget(step), targetValue: 0, intensity: intensityOf(step.type) });
    }
  }
  walk(steps);
  return rows;
}

export function workoutToFit(workout, now = new Date()) {
  const w = workout || {};
  const rows = flattenWorkoutSteps(w.steps);
  if (!rows.length) throw new Error("The workout has no steps.");
  const enc = new FitEncoder();
  enc.writeMessage(MSG.fileId, [
    { number: 0, size: 1, baseType: FitBaseType.Enum, value: 5 }, // type: workout
    { number: 1, size: 2, baseType: FitBaseType.Uint16, value: 255 }, // manufacturer: development
    { number: 2, size: 2, baseType: FitBaseType.Uint16, value: 0 },
    { number: 3, size: 4, baseType: FitBaseType.Uint32z, value: clampU32((now.getTime() / 1000) % 4e9) || 1 },
    { number: 4, size: 4, baseType: FitBaseType.Uint32, value: FitEncoder.toFitTimestamp(now) },
  ]);
  enc.writeMessage(MSG.workout, [
    { number: 4, size: 1, baseType: FitBaseType.Enum, value: 1 }, // sport: running
    { number: 6, size: 2, baseType: FitBaseType.Uint16, value: rows.length },
    { number: 8, size: NAME_BYTES, baseType: FitBaseType.String, value: fixedString(w.name || "Skid Marks run") },
  ], 1);
  rows.forEach((row, i) => {
    enc.writeMessage(MSG.workoutStep, [
      { number: 254, size: 2, baseType: FitBaseType.Uint16, value: i },
      { number: 0, size: NAME_BYTES, baseType: FitBaseType.String, value: fixedString(row.name) },
      { number: 1, size: 1, baseType: FitBaseType.Enum, value: row.durationType },
      { number: 2, size: 4, baseType: FitBaseType.Uint32, value: row.durationValue },
      { number: 3, size: 1, baseType: FitBaseType.Enum, value: row.target.type },
      { number: 4, size: 4, baseType: FitBaseType.Uint32, value: row.targetValue },
      { number: 5, size: 4, baseType: FitBaseType.Uint32, value: row.target.low },
      { number: 6, size: 4, baseType: FitBaseType.Uint32, value: row.target.high },
      { number: 7, size: 1, baseType: FitBaseType.Enum, value: row.intensity },
    ], 2);
  });
  return enc.close();
}

export function workoutFilename(workout, d = new Date()) {
  const slug = String((workout && workout.name) || "workout").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "workout";
  return `skid-marks-${slug}-${stamp(d)}.fit`;
}

export async function exportWorkoutFit(workout) {
  return writeExportFile(workoutFilename(workout), workoutToFit(workout), "application/vnd.ant.fit");
}
