import * as engine from "../run/engine.js";
import { sessionRPE, sessionMinutes } from "../lib/load.js";
import { dateStrOf, todayStr } from "../lib/dates.js";
import { loadPlanState, applyEvent, undo } from "./planState.js";

/* ---------------------------------------------------------------
   UNPLANNED SESSIONS (spec v1.1 section 4, UI part)

   When a lift session is saved on a day with no planned gym session,
   or a run on a day with no planned run, the app tells the engine:
     applyEvent({ type: 'unplannedSession', kind, date, intensity, areas, minutes })
   and shows a short "Plan updated" notice with the changes and Undo.

   Only sessions dated today or yesterday count (also imported and watch
   runs). The app does not plan again for old history.

   Pure helpers (tests: test/onboarding.test.mjs):
     liftAreas(session), liftIntensity(session), runIntensity({rpe, minutes}),
     liftEvent(session, settings), runEvent(activity), isRecentDate(iso, today),
     plannedOn(plan, iso)
--------------------------------------------------------------- */

// Muscles that make a lift session a leg session.
export const LEG_MUSCLES = new Set(["Quads", "Hamstrings", "Glutes", "Calves"]);
// Muscles that do not count as upper body (core, mobility).
const NEUTRAL_MUSCLES = new Set(["Core", "Mobility", "Shins", "Lower Back"]);

// Session RPE at or above this value makes a lift session hard.
export const HARD_LIFT_RPE = 7;
// A run at or below this RPE is easy.
export const EASY_RUN_RPE = 4;
// A run longer than this is a long run.
export const LONG_RUN_MIN = 75;

const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// A working set: a set with reps or weight in it.
function isWorkingSet(s) {
  if (!s) return false;
  const reps = num(s.reps);
  const weight = num(s.weight);
  return (reps !== null && reps > 0) || (weight !== null && weight > 0);
}

function workingSets(ex) {
  return (ex && Array.isArray(ex.sets) ? ex.sets : []).filter(isWorkingSet).length;
}

/* ['legs'], ['upper'] or ['full'] from the muscles that the session
   trained with working sets. */
export function liftAreas(session) {
  let legs = 0;
  let upper = 0;
  for (const ex of (session && session.exercises) || []) {
    const n = workingSets(ex);
    if (!n) continue;
    if (LEG_MUSCLES.has(ex.muscle)) legs += n;
    else if (!NEUTRAL_MUSCLES.has(ex.muscle)) upper += n;
  }
  if (legs && upper) return ["full"];
  if (legs) return ["legs"];
  return ["upper"];
}

/* 'hard' or 'easy' from the session RPE (10 - RIR of each set). A
   session with no RIR uses the Lift default value 7, so it counts as hard.
   That is the safe side for a leg session. */
export function liftIntensity(session) {
  const rpe = sessionRPE(session || {});
  return rpe >= HARD_LIFT_RPE ? "hard" : "easy";
}

/* 'easy' at RPE 4 or less, 'hard' above it, 'long' when the run is over
   75 minutes. A run with no RPE counts as easy. */
export function runIntensity({ rpe, minutes } = {}) {
  const m = num(minutes);
  if (m !== null && m > LONG_RUN_MIN) return "long";
  const r = num(rpe);
  if (r !== null && r > EASY_RUN_RPE) return "hard";
  return "easy";
}

export function liftEvent(session, settings) {
  const iso = session && (session.date || (session.at ? dateStrOf(new Date(session.at)) : null));
  let minutes = 0;
  try {
    minutes = Math.round(sessionMinutes(session || {}, settings || {}));
  } catch (e) {
    minutes = 0;
  }
  return { type: "unplannedSession", kind: "lift", date: iso, intensity: liftIntensity(session), areas: liftAreas(session), minutes };
}

/* activity: a store record or a normalised activity ({ date, minutes |
   durationSec, rpe }). */
export function runEvent(activity) {
  const a = activity || {};
  let minutes = num(a.durationSec) !== null ? num(a.durationSec) / 60 : num(a.minutes);
  if (num(a.durationSec) === null && minutes !== null && num(a.seconds) !== null) minutes += num(a.seconds) / 60;
  const iso = a.date || (a.startedAt ? dateStrOf(new Date(a.startedAt)) : null);
  return { type: "unplannedSession", kind: "run", date: iso, intensity: runIntensity({ rpe: a.rpe, minutes }), areas: ["legs"], minutes: minutes === null ? 0 : Math.round(minutes) };
}

/* True for today or yesterday. */
export function isRecentDate(iso, today) {
  if (!iso) return false;
  const t = today || todayStr();
  const k = engine.daysBetween(iso, t);
  return k === 0 || k === 1;
}

/* What the plan has on a date: { inPlan, run, gym }. */
export function plannedOn(plan, iso) {
  if (!plan || !iso) return { inPlan: false, run: false, gym: false };
  const day = engine.allDays(plan).find((d) => d.iso === iso);
  if (!day) return { inPlan: false, run: false, gym: false };
  return { inPlan: true, run: engine.isRun(day), gym: !!day.gym };
}

// The same run types as runui/runData.js isRunActivity.
const RUN_TYPE_IDS = new Set(["run", "treadmill", "trail-run", "track"]);
export function isRunType(type) {
  return RUN_TYPE_IDS.has(type) || /run/i.test(String(type || ""));
}

/* ---------- notice bus ---------- */

const listeners = new Set();

/* App.jsx shows the "Plan updated" notice. */
export function onPlanNotice(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(notice) {
  for (const fn of listeners) {
    try {
      fn(notice);
    } catch (e) {
      /* a listener must not stop the save */
    }
  }
}

/* ---------- apply ---------- */

/* Sends the event when the plan has no session of that kind on the
   date. Returns the notice ({ kind, result, changed }) or null. Never
   throws: a saved session must not fail because of the plan. */
export async function reportUnplanned(event, { today, emitNotice = true } = {}) {
  try {
    if (!event || !event.date) return null;
    const state = await loadPlanState();
    const on = plannedOn(state.plan, event.date);
    if (!on.inPlan) return null;
    if (event.kind === "lift" && on.gym) return null;
    if (event.kind === "run" && on.run) return null;
    const t = today || todayStr();
    // Only a session from today or yesterday changes the plan. An older
    // (back-dated or imported) session is history.
    if (!isRecentDate(event.date, t)) return null;
    const { state: after, result } = await applyEvent(event, { today: t });
    if (!result || result.refused || result.needsAnswers) return null;
    // "changed": the engine changed a planned session. The engine can also
    // only note the session in the plan (for example the week counts an
    // easy run); then the notice says "Plan checked" and has no Undo.
    const saved = after.plan !== state.plan;
    const changed = saved && Array.isArray(result.changes) && result.changes.length > 0;
    const notice = { id: `n-${Date.now()}`, kind: event.kind, event, result, changed, saved };
    if (emitNotice && (changed || result.message)) emit(notice);
    return notice;
  } catch (e) {
    return null;
  }
}

export async function reportUnplannedLift(session, settings, opts) {
  if (!session) return null;
  return reportUnplanned(liftEvent(session, settings), opts);
}

export async function reportUnplannedRun(activity, opts) {
  if (!activity) return null;
  return reportUnplanned(runEvent(activity), opts);
}

/* Imported or watch runs: only runs dated today or yesterday. Each run
   that changes the plan sends a notice; the newest one stays on screen. */
export async function reportImportedRuns(activities, opts = {}) {
  const t = opts.today || todayStr();
  const recent = (activities || []).filter((a) => a && isRunType(a.type) && isRecentDate(a.date || (a.startedAt ? dateStrOf(new Date(a.startedAt)) : null), t));
  let last = null;
  for (const a of recent) {
    const n = await reportUnplanned(runEvent(a), { ...opts, today: t });
    if (n) last = n;
  }
  return last;
}

export async function undoLast() {
  return undo();
}
