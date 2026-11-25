import * as engine from "../run/engine.js";
import { KEYS, getKey, setKey, listActivities, getRunSettings, setRunSettings } from "../shared/store.js";
import { todayStr, dateStrOf } from "../lib/dates.js";

/* ---------------------------------------------------------------
   PLAN STATE

   One helper for the stored running plan ("run-plan"). Plan mode and
   Run mode both use it. Do not write "run-plan" in another way.

   Stored shape:
     { version: 1, plan, undo: [plan, ...] (newest first, max 20),
       log: [{ id, at, kind, message, changes: [{date, before, after, reason}],
               undoable, undone }] }

   The engine plan holds only ISO date strings and plain objects. It
   has no Date objects. revivePlan() is the one place that would turn
   stored values back into live values, if the plan shape ever changes.

   API (all async unless the name ends in "For" or "Sync"):
     loadPlanState()                       -> state
     savePlanState(state)                  -> state
     currentPlan()                         -> plan | null
     applyEvent(event, {today})            -> { state, result }
     undo()                                -> state
     planOptions(profile, master, races, {today, seed})  (sync)
     previewPlan(profile, master, races, {today})        -> { plan, seed }
     rebuildPlan(profile, master, races, {today, message}) -> { state, plan, seed }
     markDone(iso, activityId, {kind: 'run'|'gym'})        -> state
     todayInfo(today)                      -> { run, gym, nextRun, weekIndex, day, week, plan }
     todayInfoFor(plan, today, master)     (sync version of todayInfo)
     seedHistory(today)                    -> engine.seedFromHistory result
     onPlanSaved(fn)                       -> unsubscribe function
--------------------------------------------------------------- */

export const UNDO_MAX = 20;
export const LOG_MAX = 300;

const listeners = new Set();

/* Called after each save, with the new state. Reminders use this to
   schedule again when the plan changes. */
export function onPlanSaved(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function localToday(today) {
  if (!today) return todayStr();
  return engine.toISO(today);
}

/* The one place that revives a stored plan. The engine uses ISO strings,
   so this only checks the shape and turns any Date value into an ISO
   string (old data or a hand-made plan). */
export function revivePlan(plan) {
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.weeks)) return null;
  const fix = (v) => {
    if (v instanceof Date) return engine.toISO(v);
    if (Array.isArray(v)) return v.map(fix);
    if (v && typeof v === "object") {
      for (const k of Object.keys(v)) v[k] = fix(v[k]);
    }
    return v;
  };
  return fix(plan);
}

function emptyState() {
  return { version: 1, plan: null, undo: [], log: [] };
}

export async function loadPlanState() {
  const raw = await getKey(KEYS.runPlan, null);
  if (!raw || typeof raw !== "object") return emptyState();
  // An older shape stored the plan on its own.
  if (Array.isArray(raw.weeks)) return { ...emptyState(), plan: revivePlan(raw) };
  return {
    version: 1,
    plan: revivePlan(raw.plan),
    undo: (Array.isArray(raw.undo) ? raw.undo : []).map(revivePlan).filter(Boolean).slice(0, UNDO_MAX),
    log: Array.isArray(raw.log) ? raw.log : [],
  };
}

export async function savePlanState(state) {
  const next = {
    version: 1,
    plan: state.plan || null,
    undo: (state.undo || []).slice(0, UNDO_MAX),
    log: (state.log || []).slice(-LOG_MAX),
  };
  await setKey(KEYS.runPlan, next);
  for (const fn of listeners) {
    try {
      fn(next);
    } catch (e) {
      /* a listener must not stop a save */
    }
  }
  return next;
}

export async function currentPlan() {
  return (await loadPlanState()).plan;
}

function logEntry(kind, message, changes, undoable = true) {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    kind,
    message: message || "",
    changes: (changes || []).map((c) => ({ date: c.iso || c.date || null, before: c.before || "", after: c.after || "", reason: c.reason || "" })),
    undoable,
    undone: false,
  };
}

/* Keeps "done" marks from the old plan on the same dates in a new plan. */
function carryDone(fromPlan, toPlan) {
  if (!fromPlan || !toPlan) return toPlan;
  const marks = new Map();
  for (const d of engine.allDays(fromPlan)) if (d.done || d.gymDone) marks.set(d.iso, d);
  if (!marks.size) return toPlan;
  for (const d of engine.allDays(toPlan)) {
    const m = marks.get(d.iso);
    if (!m) continue;
    if (m.done && engine.isRun(d)) d.done = m.done;
    if (m.gymDone && d.gym) d.gymDone = m.gymDone;
  }
  return toPlan;
}

/* Commits a new plan: the old plan goes on the undo stack, the log gets
   one entry. */
export async function commitPlan(plan, { kind = "rebuild", message = "", changes = [], state: given, masterBefore } = {}) {
  const state = given || (await loadPlanState());
  const next = {
    ...state,
    plan,
    undo: state.plan ? [state.plan, ...(state.undo || [])].slice(0, UNDO_MAX) : state.undo || [],
    log: [...(state.log || []), { ...logEntry(kind, message, changes, !!state.plan), ...(masterBefore !== undefined ? { masterBefore } : {}) }],
  };
  return savePlanState(next);
}

/* Runs engine.adapt and saves the result when the plan changed.
   Questions (needsAnswers), refusals and offers do not save. */
export async function applyEvent(event, { today } = {}) {
  const state = await loadPlanState();
  const t = localToday(today);
  if (!state.plan) {
    return { state, result: { plan: null, changes: [], questions: [], needsAnswers: false, refused: true, reason: "There is no plan yet. Make a plan first.", message: "There is no plan yet. Make a plan first." } };
  }
  const result = engine.adapt(state.plan, event, { today: t });
  if (result.needsAnswers || result.refused || !result.plan || result.plan === state.plan) return { state, result };
  // A plan made again after a long break keeps the done marks.
  const plan = result.plan.id !== state.plan.id ? carryDone(state.plan, result.plan) : result.plan;
  const saved = await commitPlan(plan, { kind: event.type, message: result.message, changes: result.changes, state });
  return { state: saved, result };
}

/* Takes back the newest change. The log keeps the entry, marked as undone. */
export async function undo() {
  const state = await loadPlanState();
  if (!state.undo || !state.undo.length) return state;
  const [prev, ...rest] = state.undo;
  const log = [...(state.log || [])];
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].undoable && !log[i].undone) {
      // A change that also changed the master week puts the old week back.
      if (log[i].masterBefore !== undefined) await setKey(KEYS.masterPlan, log[i].masterBefore);
      // An injury report starts the daily pain questions. Undo stops them.
      if (log[i].kind === "injury" || log[i].kind === "break") {
        try {
          const rs = (await getRunSettings()) || {};
          if (rs.niggle) await setRunSettings({ ...rs, niggle: null });
        } catch (e) {
          /* the plan undo still works */
        }
      }
      log[i] = { ...log[i], undone: true, masterBefore: undefined };
      break;
    }
  }
  log.push(logEntry("undo", "You took back the last change.", [], false));
  return savePlanState({ ...state, plan: prev, undo: rest, log });
}

/* ---------- making a plan ---------- */

// Activities from the store in the shape that the engine reads.
export function engineActivities(list) {
  return (list || []).map((a) => ({
    id: a.id,
    iso: a.date,
    date: a.date,
    type: a.type,
    // The run's own name (for example "Parkrun" from Strava) helps the
    // seed find races. a.name is only the type label.
    title: (a.raw && a.raw.name) || a.name,
    name: (a.raw && a.raw.name) || a.name,
    km: a.km == null ? 0 : a.km,
    min: a.minutes == null ? 0 : a.minutes,
    rpe: a.rpe == null ? undefined : a.rpe,
    avgHR: a.avgHR == null ? undefined : a.avgHR,
    maxHR: a.maxHR == null ? undefined : a.maxHR,
    isRace: !!(a.raw && (a.raw.isRace || a.raw.race)),
  }));
}

export async function seedHistory(today) {
  const list = await listActivities();
  return engine.seedFromHistory(engineActivities(list), localToday(today));
}

const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/* engine.buildPlan options from the stored profile, master plan and races.
   `seed` is the seedFromHistory result (optional). Values that the user
   typed win over the seed.

   Weekly distance and usual long run: the profile keeps a typed value with
   `weeklyKmTyped: true` (or `usualLongRunTyped: true`). A profile saved by an
   older version has no flag. Its value is often a copy of an old seed (for
   example 0 from a time before a Strava import), so the fresh seed wins when
   the profile uses the run history. */
export function planOptions(profile = {}, master = {}, races = [], { today, seed } = {}) {
  const t = localToday(today);
  const p = profile || {};
  const m = master || {};
  const level = p.level || "some";
  const experience = p.experience || (level === "new" ? "new" : level === "racer" ? "experienced" : "some");
  const goal = p.goal || (level === "new" ? "runwalk" : "keepfit");
  const runDays = Array.isArray(m.runDays) && m.runDays.length ? m.runDays : p.runDays;
  const longRunDay = Number.isInteger(m.longRunDay) ? m.longRunDay : p.longRunDay;
  const gymDays = (Array.isArray(m.gymDays) ? m.gymDays : []).map((g) => ({ day: g.day, type: g.type, intensity: g.intensity, note: g.note || "" }));
  const historyMode = p.fitnessSource === "history" || p.useHistory === true;
  const useSeed = !!seed && (level !== "new" || historyMode) && p.fitnessSource !== "new";
  const typed = (value, flag) => {
    const v = num(value);
    if (v === null || flag === false) return null;
    if (flag === true) return v;
    // No flag: an older profile. In history mode the stored value is an old seed copy.
    return historyMode && useSeed ? null : v;
  };
  let currentWeeklyKm = typed(p.currentWeeklyKm, p.weeklyKmTyped);
  const weeklyTyped = currentWeeklyKm !== null;
  if (currentWeeklyKm === null && useSeed) currentWeeklyKm = num(seed.currentWeeklyKm);
  if (currentWeeklyKm === null && (level === "new" || p.fitnessSource === "new")) currentWeeklyKm = 0;
  let usualLongRunKm = typed(p.usualLongRunKm, p.usualLongRunTyped === undefined ? (p.usualLongRunKm == null ? undefined : true) : p.usualLongRunTyped);
  const longTyped = usualLongRunKm !== null && usualLongRunKm > 0;
  if (!longTyped && useSeed) usualLongRunKm = num(seed.usualLongRunKm);
  let score = num(p.score);
  if (score === null && useSeed && p.useHistory !== false) score = num(seed.score);
  if (score !== null && !engine.isValidScore(score)) score = null;
  const raceList = (races || [])
    .filter((r) => r && r.date && r.date >= t && !r.resultSec && Number(r.distKm) > 0)
    .map((r) => ({ date: r.date, distKm: Number(r.distKm), priority: r.priority || "B", name: r.name || "" }));
  const opts = {
    goal,
    today: t,
    experience,
    runDays: Array.isArray(runDays) && runDays.length ? runDays : undefined,
    longRunDay: Number.isInteger(longRunDay) ? longRunDay : undefined,
    gymDays,
    usesLift: p.usesLift != null ? !!p.usesLift : gymDays.length > 0,
    races: raceList,
  };
  if (currentWeeklyKm !== null) opts.currentWeeklyKm = currentWeeklyKm;
  if (score !== null) opts.score = score;
  // Habits from the run history. They shape week 1: the usual long run and new run days.
  if (usualLongRunKm !== null && usualLongRunKm > 0) opts.usualLongRunKm = usualLongRunKm;
  if (useSeed && num(seed.runsPerWeek) > 0) opts.runsPerWeek = num(seed.runsPerWeek);
  if (useSeed && !weeklyTyped && num(seed.peak12WeeksKm) > 0) opts.peakWeekKm = num(seed.peak12WeeksKm);
  // A typed long run wins over the history, so the cap from the longest recent run applies only to the seed value.
  if (useSeed && !longTyped && num(seed.longestRecentKm) > 0) opts.longestRecentKm = num(seed.longestRecentKm);
  const G = engine.GOALS[goal];
  if (G && !G.noDate) {
    if (p.raceDate && p.raceDate > t) opts.raceDate = p.raceDate;
    if (num(p.goalTimeSec)) opts.goalTimeSec = num(p.goalTimeSec);
    const a = (races || []).find((r) => r && r.date === opts.raceDate);
    if (a && a.name) opts.raceName = a.name;
  }
  if (p.minutesPerSession && level === "new") opts.daysPerWeek = (runDays || []).length || undefined;
  return opts;
}

export async function previewPlan(profile, master, races, { today, seed } = {}) {
  const p = profile || {};
  const wantsHistory = p.fitnessSource !== "new" && (p.level !== "new" || p.fitnessSource === "history" || p.useHistory === true);
  const s = seed || (profile && wantsHistory ? await seedHistory(today) : null);
  const opts = planOptions(profile, master, races, { today, seed: s });
  return { plan: engine.buildPlan(opts), seed: s, opts };
}

/* Builds a plan with engine.buildPlan and saves it. The old plan goes on
   the undo stack. */
export async function rebuildPlan(profile, master, races, { today, message, seed, masterBefore, kind = "rebuild", changes = [] } = {}) {
  const { plan: built, seed: s } = await previewPlan(profile, master, races, { today, seed });
  const state = await loadPlanState();
  const plan = carryDone(state.plan, built);
  const saved = await commitPlan(plan, { kind, message: message || `New plan: ${plan.goalName}.`, changes, state, masterBefore });
  return { state: saved, plan, seed: s };
}

/* ---------- done marks ---------- */

/* Marks the planned session on `iso` as done. kind 'run' marks the run,
   kind 'gym' marks the gym session. With no kind: the run, else the gym. */
export async function markDone(iso, activityId, { kind } = {}) {
  const state = await loadPlanState();
  if (!state.plan || !iso) return state;
  const day = engine.allDays(state.plan).find((d) => d.iso === iso);
  if (!day) return state;
  const mark = { activityId: activityId == null ? null : activityId, at: new Date().toISOString() };
  const k = kind || (engine.isRun(day) ? "run" : day.gym ? "gym" : "run");
  if (k === "gym") {
    if (!day.gym) return state;
    day.gymDone = mark;
  } else {
    if (!engine.isRun(day) && day.type !== "strength" && day.type !== "cross") return state;
    day.done = mark;
  }
  return savePlanState(state);
}

/* Takes back a done mark (for example a wrong tap). */
export async function clearDone(iso, { kind = "run" } = {}) {
  const state = await loadPlanState();
  if (!state.plan) return state;
  const day = engine.allDays(state.plan).find((d) => d.iso === iso);
  if (!day) return state;
  if (kind === "gym") delete day.gymDone;
  else day.done = false;
  return savePlanState(state);
}

/* Lift calls this when a lift session is saved: it marks the planned gym
   day on that date as done. */
export async function markGymSession(session) {
  try {
    const iso = session && (session.date || (session.at ? dateStrOf(new Date(session.at)) : null));
    if (!iso) return null;
    return await markDone(iso, session.id || null, { kind: "gym" });
  } catch (e) {
    return null;
  }
}

/* ---------- today ---------- */

// Gym session from the master plan for a weekday (when there is no plan).
export function masterGymFor(master, iso) {
  if (!master || !Array.isArray(master.gymDays)) return null;
  const dow = engine.weekdayOf(iso);
  const g = master.gymDays.find((x) => Number(x.day) === dow);
  return g ? { day: g.day, type: g.type, intensity: g.intensity, note: g.note || "", advice: "normal", reason: "From your master week.", fromMaster: true } : null;
}

export function todayInfoFor(plan, today, master = null) {
  const t = localToday(today);
  if (!plan) return { run: null, gym: masterGymFor(master, t), nextRun: null, weekIndex: -1, day: null, week: null, plan: null, iso: t };
  const days = engine.allDays(plan);
  const day = days.find((d) => d.iso === t) || null;
  const run = day && engine.isRun(day) ? day : null;
  const gym = day && day.gym ? { ...day.gym, done: day.gymDone || null } : day ? null : masterGymFor(master, t);
  const nextRun = days.find((d) => d.iso > t && engine.isRun(d)) || null;
  const weekIndex = plan.weeks.findIndex((w) => t >= w.startIso && t <= engine.addDays(w.startIso, 6));
  return { run, gym, nextRun, weekIndex, day, week: weekIndex >= 0 ? plan.weeks[weekIndex] : null, plan, iso: t };
}

export async function todayInfo(today) {
  const [state, master] = await Promise.all([loadPlanState(), getKey(KEYS.masterPlan, null)]);
  return todayInfoFor(state.plan, today, master);
}

/* ---------- small shared helpers for the screens ---------- */

export const GYM_TYPE_LABEL = { upper: "Upper body", lower: "Lower body", full: "Full body", legs: "Legs", other: "Gym" };

export function gymLabel(g) {
  if (!g) return "";
  const name = GYM_TYPE_LABEL[g.type] || "Gym";
  const light = g.advice === "skip-heavy" ? "light" : g.advice === "maintenance" ? "maintenance" : g.intensity;
  return `${name} (${light})`;
}

/* Simple mode hides jargon until 4 weeks of data (spec 1.5): a plan 4
   weeks old, or 4 weeks since the first run. `runWeeks` is the second
   value (runui/runData.js runWeeks), so Plan and Run screens agree. */
export function showJargon(settings, plan, today, runWeeks = 0) {
  if (settings && settings.appMode === "advanced") return true;
  if (runWeeks >= 4) return true;
  if (!plan) return false;
  return engine.daysBetween(plan.createdIso || plan.startIso, localToday(today)) >= 28;
}

/* True when a run was saved in the last `hours` hours (for the lift
   warm-up: a warm body skips the general part). */
export async function ranWithinHours(hours = 2, list) {
  const items = list || (await listActivities());
  const now = Date.now();
  return items.some((a) => {
    if (a.source !== "activity" || !/run|jog|trail|treadmill/i.test(a.type || "")) return false;
    const start = a.startedAt ? new Date(a.startedAt).getTime() : NaN;
    if (!Number.isFinite(start)) return false;
    const end = start + (a.minutes || 0) * 60000;
    return end <= now + 60000 && now - end <= hours * 3600000;
  });
}

/* Saves a new master week and makes the plan again. Undo puts the old
   master week and the old plan back. With no plan yet, it only saves
   the master week. */
export async function saveMasterAndRebuild(nextMaster, { today, message, changes } = {}) {
  const [before, profile, races, state] = await Promise.all([getKey(KEYS.masterPlan, null), getKey(KEYS.runProfile, null), getKey(KEYS.races, []), loadPlanState()]);
  await setKey(KEYS.masterPlan, nextMaster);
  if (!state.plan || !profile) return { state, plan: null };
  return rebuildPlan(profile, nextMaster, races, { today, message: message || "Master week changed. The plan was made again.", masterBefore: before, kind: "master", changes });
}
