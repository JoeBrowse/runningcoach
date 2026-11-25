import * as engine from "../run/engine.js";
import { KEYS, getKey, getRunProfile, getRunSettings, setRunSettings } from "../shared/store.js";
import { todayStr } from "../lib/dates.js";

/* ---------------------------------------------------------------
   RUN MODE DATA HELPERS

   Small helpers that the Run screens share. No React here.
   - Run preferences in "run-settings" (voice, auto-pause, check-in,
     workout library). Always read, merge and write, because the
     weather helper keeps its own fields in the same key.
   - Units, jargon gate (Simple / Advanced), step text.
   - Records and milestones from the activity list.
--------------------------------------------------------------- */

export const RUN_PREF_DEFAULTS = {
  voice: { on: true, rate: 1, km: true, step: true, half: true },
  autoPause: true,
  dailyCheckin: false,
  keepOnNoteSeen: false,
  workouts: [],
  lastRunWalkLevel: 1,
  treadmill: { speedKmh: 9, incline: 1 },
};

export async function getRunPrefs() {
  const rs = (await getRunSettings()) || {};
  return {
    ...RUN_PREF_DEFAULTS,
    ...rs,
    voice: { ...RUN_PREF_DEFAULTS.voice, ...(rs.voice || {}) },
    treadmill: { ...RUN_PREF_DEFAULTS.treadmill, ...(rs.treadmill || {}) },
    workouts: Array.isArray(rs.workouts) ? rs.workouts : [],
  };
}

export async function saveRunPrefs(patch) {
  const rs = (await getRunSettings()) || {};
  const next = { ...rs, ...patch };
  await setRunSettings(next);
  return getRunPrefs();
}

export async function getProfile() {
  return (await getRunProfile()) || {};
}

export const unitsOf = (profile) => (profile && profile.units === "mi" ? "mi" : "km");
export const unitLabel = (units) => (units === "mi" ? "mi" : "km");
export const today = () => todayStr();

// Number in the user's unit, for inputs and charts.
export const toUnit = (km, units) => engine.kmToUnits(Number(km) || 0, units);
export const fromUnit = (v, units) => engine.unitsToKm(Number(v) || 0, units);

/* Run activities only (normalised list from store.listActivities). */
export const RUN_TYPES = new Set(["run", "treadmill", "trail-run", "track"]);
export const isRunActivity = (a) => !!a && a.source === "activity" && (RUN_TYPES.has(a.type) || /run/i.test(a.type || ""));

/* Weeks since the first run, for the Simple mode gate (spec 1.5). */
export function runWeeks(activities, iso = todayStr()) {
  const runs = (activities || []).filter(isRunActivity).filter((a) => a.date);
  if (!runs.length) return 0;
  const first = runs.reduce((m, a) => (a.date < m ? a.date : m), runs[0].date);
  return Math.floor(engine.daysBetween(first, iso) / 7);
}

/* True when the screen may show fitness score, form, zones, phases,
   predictions and pace targets. */
export function jargonOn(settings, plan, activities, iso = todayStr()) {
  if (settings && settings.appMode === "advanced") return true;
  if (plan && engine.daysBetween(plan.createdIso || plan.startIso, iso) >= 28) return true;
  return runWeeks(activities, iso) >= 4;
}

export { stepSeconds, stepClass, flattenSteps, totalSeconds, stepLines, workoutForVoice, runWalkWorkout, runWalkLabel, builderToWorkout, stepsToFitSteps, durText } from "./steps.js";

/* ---------- words ---------- */

export const RPE_WORDS = {
  1: "Very, very easy",
  2: "Very easy",
  3: "Easy. I can talk with no effort",
  4: "Comfortable",
  5: "Steady. I can talk in sentences",
  6: "Moderately hard",
  7: "Hard. I can say a few words",
  8: "Very hard",
  9: "Very, very hard",
  10: "Maximum effort",
};

export const FEELS = [
  { id: "great", label: "Great" },
  { id: "good", label: "Good" },
  { id: "ok", label: "OK" },
  { id: "tired", label: "Tired" },
  { id: "bad", label: "Bad" },
];

/* ---------- records and milestones ---------- */

export const RECORD_DISTANCES = [
  { id: "5k", label: "5K", km: 5 },
  { id: "10k", label: "10K", km: 10 },
  { id: "half", label: "Half marathon", km: 21.0975 },
  { id: "marathon", label: "Marathon", km: 42.195 },
];

const secOf = (a) => (a.minutes ? a.minutes * 60 : null);

/* Best time over a distance from km splits (a recorded run), or null. */
export function bestFromSplits(splits, km) {
  const list = (splits || []).filter((s) => s && s.sec > 0 && s.km > 0);
  const n = Math.round(km);
  if (list.length < n || Math.abs(km - n) > 0.01) return null;
  let best = null;
  for (let i = 0; i + n <= list.length; i++) {
    const part = list.slice(i, i + n);
    if (part.some((s) => Math.abs(s.km - 1) > 0.02)) continue;
    const t = part.reduce((s, x) => s + x.sec, 0);
    if (best === null || t < best) best = t;
  }
  return best;
}

/* Records from run activities: best time for each distance (a run of
   that distance, up to 10% longer, scaled to the distance; or a block of
   whole km splits) and the longest run. */
export function computeRecords(activities) {
  const runs = (activities || []).filter(isRunActivity).filter((a) => a.km > 0 && secOf(a));
  const out = {};
  for (const d of RECORD_DISTANCES) {
    let best = null;
    for (const a of runs) {
      let t = null;
      if (a.km >= d.km * 0.995 && a.km <= d.km * 1.1) t = (secOf(a) * d.km) / a.km;
      const fromSplits = a.raw && a.raw.splits ? bestFromSplits(a.raw.splits, d.km) : null;
      if (fromSplits && (t === null || fromSplits < t)) t = fromSplits;
      if (t === null) continue;
      // A time faster than a world record is a GPS or typing error.
      if (t / d.km < 160) continue;
      if (!best || t < best.sec) best = { sec: t, date: a.date, id: a.id };
    }
    out[d.id] = best;
  }
  const longest = runs.reduce((m, a) => (!m || a.km > m.km ? { km: a.km, date: a.date, id: a.id } : m), null);
  out.longest = longest;
  return out;
}

/* Milestones that keep coming. Each: { id, label, done, date } in order.
   No streak goals: a missed week never takes a badge away. */
export function computeMilestones(activities, units = "km") {
  const runs = (activities || []).filter(isRunActivity).sort((a, b) => (a.startedAt || a.date || "").localeCompare(b.startedAt || b.date || ""));
  const firstWhere = (fn) => {
    const r = runs.find(fn);
    return r ? r.date : null;
  };
  const nonStop = (a) => a.minutes >= 30 && !(a.raw && (a.raw.mode === "runwalk" || (a.raw.workoutType === "runwalk" && !/without a stop/i.test(a.raw.workoutTitle || ""))));
  const items = [
    { id: "first", label: "First run", date: firstWhere(() => true) },
    { id: "30min", label: "First 30 minutes without a stop", date: firstWhere(nonStop) },
    { id: "5k", label: "First 5K", date: firstWhere((a) => a.km >= 4.98) },
    { id: "10k", label: "First 10K", date: firstWhere((a) => a.km >= 9.97) },
    { id: "15k", label: "First 15K", date: firstWhere((a) => a.km >= 14.95) },
    { id: "half", label: "First half marathon distance", date: firstWhere((a) => a.km >= 21.05) },
    { id: "30k", label: "First 30K", date: firstWhere((a) => a.km >= 29.9) },
    { id: "marathon", label: "First marathon distance", date: firstWhere((a) => a.km >= 42.1) },
  ];
  for (const n of [10, 25, 50, 100, 200, 300, 500, 1000]) items.push({ id: `runs${n}`, label: `${n} runs`, date: runs[n - 1] ? runs[n - 1].date : null });
  let tot = 0;
  // Total distance marks in the user's units (miles: 50, 100, 250, ...).
  const mi = units === "mi";
  const marks = mi ? [50, 100, 250, 500, 1000, 2500, 5000] : [100, 250, 500, 1000, 2500, 5000, 10000];
  const toKm = (m) => (mi ? m * 1.609344 : m);
  const kmDates = {};
  for (const a of runs) {
    tot += a.km || 0;
    for (const k of marks) if (!kmDates[k] && tot >= toKm(k)) kmDates[k] = a.date;
  }
  for (const k of marks) items.push({ id: `${mi ? "mi" : "km"}${k}`, label: `${k.toLocaleString("en-GB")} ${mi ? "mi" : "km"} in total`, date: kmDates[k] || null });
  // Personal bests: each time a distance record improves.
  for (const d of RECORD_DISTANCES.slice(0, 2)) {
    let best = null;
    let count = 0;
    let last = null;
    for (const a of runs) {
      if (!(a.km >= d.km * 0.995 && a.km <= d.km * 1.1) || !secOf(a)) continue;
      const t = (secOf(a) * d.km) / a.km;
      if (best !== null && t < best) {
        count++;
        last = a.date;
      }
      if (best === null || t < best) best = t;
    }
    if (count) items.push({ id: `pb${d.id}`, label: `${d.label} personal best${count > 1 ? ` (${count} times)` : ""}`, date: last });
  }
  return items.map((x) => ({ ...x, done: !!x.date }));
}

/* ---------- misc ---------- */

export async function getWellnessToday(iso = todayStr()) {
  const rows = (await getKey("wellness", [])) || [];
  if (!rows.length) return { today: null, baseline: null };
  const todayRow = rows.find((r) => r.date === iso) || rows.find((r) => r.date === engine.addDays(iso, -1)) || null;
  const past = rows.filter((r) => r.date < iso && r.date >= engine.addDays(iso, -28));
  const avg = (k) => {
    const v = past.map((r) => r[k]).filter((x) => Number.isFinite(x) && x > 0);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  return { today: todayRow, baseline: { restingHR: avg("restingHR"), hrv: avg("hrv") } };
}

export async function getActivityRecord(id) {
  const list = (await getKey(KEYS.activityHistory, [])) || [];
  return list.find((a) => a.id === id) || null;
}

export function fmtDuration(sec) {
  return engine.fmtTime(Math.max(0, Math.round(Number(sec) || 0)));
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
