import { activityType, activitySeconds, activityLabel, ACTIVITY_CAP } from "../lib/activities.js";
import { dateStrOf, dateOnlyTime, sessionTime } from "../lib/dates.js";
import { sessionMinutes, sessionRPE } from "../lib/load.js";
import { safeGet, safeSet } from "../lib/storage.js";

/* ---------------------------------------------------------------
   SHARED STORE

   One data layer for Plan, Run and Lift. It sits on top of
   lib/storage.js, so every key keeps the "iron-log:" prefix and old
   Iron Log data still loads.

   Activities are saved once. Lift sessions stay in "workout-history".
   Runs and other sports go into "activity-history" in the Iron Log
   activity format, so the muscle readiness map, the history and the
   consistency calendar read them with no change.

   listActivities() gives one normalised list of both. Each item:
     {
       id,                       stored id
       source: "lift" | "activity",
       type,                     "lift" for a lift session, else the
                                 activity type id ("run", "football", ...)
       date,                     local day "YYYY-MM-DD"
       startedAt,                ISO timestamp of the start
       minutes,                  duration in minutes (number or null)
       km,                       distance in km (number or null)
       rpe,                      session effort 1-10 (number or null)
       avgHR, maxHR,             heart rate (number or null)
       name,                     label to show
       raw,                      the stored record, unchanged
     }
   The list is sorted by start time, oldest first.
--------------------------------------------------------------- */

export const KEYS = {
  // Iron Log keys (do not rename: old data uses them).
  activityHistory: "activity-history",
  workoutHistory: "workout-history",
  settings: "settings",
  // Skid Marks keys.
  runPlan: "run-plan",
  masterPlan: "master-plan",
  races: "races",
  shoes: "shoes",
  readinessLog: "readiness-log",
  runProfile: "run-profile",
  cycleLog: "cycle-log",
  runSettings: "run-settings",
  importLog: "import-log",
};

// Two starts closer than this, with distances inside DUPLICATE_DISTANCE_SHARE,
// are one activity (spec section 6).
export const DUPLICATE_START_MS = 2 * 60 * 1000;
export const DUPLICATE_DISTANCE_SHARE = 0.03;

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------- normalising ---------- */

// Distance of a stored Iron Log activity, in km. Swims and rows store
// metres; the type says which unit it uses.
export function activityKm(a) {
  const d = num(a && a.distance);
  if (d === null || d <= 0) return null;
  const unit = activityType(a.type).distanceUnit;
  if (!unit) return null;
  return unit === "m" ? d / 1000 : d;
}

function startIso(record) {
  if (record.startedAt) {
    const t = new Date(record.startedAt).getTime();
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  const t = sessionTime(record);
  return t === null ? null : new Date(t).toISOString();
}

export function normaliseActivity(a) {
  const secs = activitySeconds(a);
  return {
    id: a.id,
    source: "activity",
    type: a.type || "other",
    date: a.date || (a.at ? dateStrOf(new Date(a.at)) : null),
    startedAt: startIso(a),
    minutes: secs ? secs / 60 : null,
    km: activityKm(a),
    rpe: num(a.rpe),
    avgHR: num(a.avgHR),
    maxHR: num(a.maxHR),
    name: activityLabel(a),
    raw: a,
  };
}

export function normaliseLiftSession(s, settings) {
  // `startedAt` on a lift is when the first set opened. A back-dated log
  // opens its first set today, so that value is only trusted when it is
  // on the same day as the session.
  let started = null;
  if (s.startedAt && s.date && dateStrOf(new Date(s.startedAt)) === s.date) started = new Date(s.startedAt).toISOString();
  const minutes = sessionMinutes(s, settings);
  if (!started) {
    const end = sessionTime(s);
    if (end !== null) started = new Date(end - (s.startedAt ? 0 : minutes * 60000)).toISOString();
  }
  return {
    id: s.id,
    source: "lift",
    type: "lift",
    date: s.date || null,
    startedAt: started,
    minutes: minutes || null,
    km: null,
    rpe: sessionRPE(s),
    avgHR: num(s.avgHR),
    maxHR: num(s.maxHR),
    name: s.dayName || s.split || "Lift",
    raw: s,
  };
}

const byStart = (a, b) => (a.startedAt || a.date || "").localeCompare(b.startedAt || b.date || "");

// One list of everything the user did, oldest first.
export async function listActivities(settings) {
  const s = settings || (await safeGet(KEYS.settings)) || {};
  const lifts = (await safeGet(KEYS.workoutHistory)) || [];
  const acts = (await safeGet(KEYS.activityHistory)) || [];
  return [...lifts.map((x) => normaliseLiftSession(x, s)), ...acts.map(normaliseActivity)].sort(byStart);
}

/* ---------- duplicates ---------- */

function startMs(x) {
  if (!x) return null;
  for (const v of [x.startedAt, x.at]) {
    if (v) {
      const t = new Date(v).getTime();
      if (Number.isFinite(t)) return t;
    }
  }
  return dateOnlyTime(x.date);
}

function kmOfAny(x) {
  if (!x) return null;
  if (num(x.km) !== null) return num(x.km);
  if (x.raw) return activityKm(x.raw);
  if (x.distance !== undefined) return activityKm(x);
  return null;
}

/* Same start (within 2 minutes) and same distance (within 3%).
   Takes normalised items, stored records or saveRun() input.
   A distance that one side does not know does not count against a match:
   a run typed by hand with no distance, at the same minute as an imported
   run, is the same run. */
export function isDuplicate(a, list) {
  const t = startMs(a);
  if (t === null) return false;
  const km = kmOfAny(a);
  return (list || []).some((b) => {
    if (b === a) return false;
    const tb = startMs(b);
    if (tb === null || Math.abs(tb - t) > DUPLICATE_START_MS) return false;
    const kb = kmOfAny(b);
    if (km === null || kb === null || (km === 0 && kb === 0)) return true;
    return Math.abs(km - kb) / Math.max(km, kb) <= DUPLICATE_DISTANCE_SHARE;
  });
}

/* ---------- writing runs ---------- */

// Fields saveRun() maps itself. Every other field on the input is kept on
// the stored record as it is.
const MAPPED = new Set(["id", "type", "date", "startedAt", "at", "durationSec", "minutes", "seconds", "km", "distance", "rpe", "name"]);

/* Builds an Iron Log activity record from a run.

   Input (all optional except a duration):
     id, type ("run" default; any ACTIVITY_TYPES id), startedAt (ISO),
     date ("YYYY-MM-DD", used when there is no startedAt),
     durationSec, or minutes + seconds,
     km (distance in km), rpe (1-10), avgHR, maxHR, name,
     splits, hr, workoutId, planIso, shoe, feel, note, track (summary),
     and any other extra field.

   Output: { id, date, at, startedAt, type, name, minutes, seconds,
     distance (in the type's unit), rpe, ...extras }. `at` is the start,
     the same moment the Cardio form calls "When". */
export function runToActivity(run) {
  const r = run || {};
  const type = activityType(r.type || "run").id === (r.type || "run") ? r.type || "run" : "run";
  const unit = activityType(type).distanceUnit;
  let startMsVal = startMs(r);
  if (startMsVal === null) startMsVal = Date.now();
  const startedAt = new Date(startMsVal).toISOString();
  let total = num(r.durationSec);
  if (total === null) total = (num(r.minutes) || 0) * 60 + (num(r.seconds) || 0);
  total = Math.max(0, Math.round(total || 0));
  let km = num(r.km);
  if (km === null && num(r.distance) !== null) km = unit === "m" ? num(r.distance) / 1000 : num(r.distance);
  const distance = km === null || !unit ? null : unit === "m" ? Math.round(km * 1000) : Math.round(km * 1000) / 1000;
  const extras = {};
  for (const [k, v] of Object.entries(r)) if (!MAPPED.has(k) && v !== undefined) extras[k] = v;
  return {
    ...extras,
    id: r.id || `run-${startMsVal}-${Math.random().toString(36).slice(2, 6)}`,
    date: r.date && !r.startedAt ? r.date : dateStrOf(new Date(startMsVal)),
    at: startedAt,
    startedAt,
    type,
    name: r.name ? String(r.name) : null,
    minutes: Math.floor(total / 60),
    seconds: total % 60,
    distance,
    rpe: num(r.rpe),
  };
}

const byAt = (a, b) => (sessionTime(a) || 0) - (sessionTime(b) || 0);

async function writeActivityHistory(list) {
  const next = [...list].sort(byAt).slice(-ACTIVITY_CAP);
  await safeSet(KEYS.activityHistory, next);
  return next;
}

// Saves one run (recorded, typed or imported). A record with the same id
// is replaced. Returns the stored record. No duplicate check: use
// isDuplicate() or addActivities() for that.
export async function saveRun(run) {
  const record = runToActivity(run);
  const list = (await safeGet(KEYS.activityHistory)) || [];
  await writeActivityHistory([...list.filter((a) => a.id !== record.id), record]);
  return record;
}

// Adds many activities (for example an import). Skips each one that
// matches an existing activity or an earlier one in the same batch.
// Returns { added, duplicates, records } (records: the saved activities).
// Also writes a line to the import log.
export async function addActivities(list, options = {}) {
  const existingRaw = (await safeGet(KEYS.activityHistory)) || [];
  const known = await listActivities();
  const fresh = [];
  let duplicates = 0;
  for (const item of list || []) {
    const record = runToActivity(item);
    if (isDuplicate(record, known) || isDuplicate(record, fresh)) {
      duplicates++;
      continue;
    }
    fresh.push(record);
  }
  if (fresh.length) await writeActivityHistory([...existingRaw, ...fresh]);
  const summary = { added: fresh.length, duplicates };
  await appendImportLog({ ...summary, source: options.source || null });
  return { ...summary, records: fresh };
}

/* ---------- other keys ---------- */

export async function getKey(key, fallback = null) {
  const v = await safeGet(key);
  return v === null || v === undefined ? fallback : v;
}
export async function setKey(key, value) {
  await safeSet(key, value);
  return value;
}

export const getRunPlan = () => getKey(KEYS.runPlan, null);
export const setRunPlan = (v) => setKey(KEYS.runPlan, v);
export const getMasterPlan = () => getKey(KEYS.masterPlan, null);
export const setMasterPlan = (v) => setKey(KEYS.masterPlan, v);
export const getRaces = () => getKey(KEYS.races, []);
export const setRaces = (v) => setKey(KEYS.races, v || []);
export const getShoes = () => getKey(KEYS.shoes, []);
export const setShoes = (v) => setKey(KEYS.shoes, v || []);
export const getReadinessLog = () => getKey(KEYS.readinessLog, []);
export const setReadinessLog = (v) => setKey(KEYS.readinessLog, v || []);
export const getRunProfile = () => getKey(KEYS.runProfile, null);
export const setRunProfile = (v) => setKey(KEYS.runProfile, v);
export const getCycleLog = () => getKey(KEYS.cycleLog, []);
export const setCycleLog = (v) => setKey(KEYS.cycleLog, v || []);
export const getRunSettings = () => getKey(KEYS.runSettings, {});
export const setRunSettings = (v) => setKey(KEYS.runSettings, v || {});
export const getImportLog = () => getKey(KEYS.importLog, []);

// Adds one entry to a list key and keeps the newest `cap` entries.
export async function appendToList(key, entry, cap = 1000) {
  const list = (await safeGet(key)) || [];
  const next = [...list, entry].slice(-cap);
  await safeSet(key, next);
  return next;
}

export function appendReadiness(entry) {
  return appendToList(KEYS.readinessLog, { at: new Date().toISOString(), ...entry });
}

export function appendImportLog(entry) {
  return appendToList(KEYS.importLog, { at: new Date().toISOString(), ...entry }, 200);
}
