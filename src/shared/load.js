import { activitySeconds } from "../lib/activities.js";
import { dateStrOf, todayStr } from "../lib/dates.js";
import { ASSUMED_SESSION_RPE, sessionTrainingLoad } from "../lib/load.js";
import { listActivities, getKey, KEYS } from "./store.js";

/* ---------------------------------------------------------------
   UNIFIED TRAINING LOAD

   One load model for Plan, Run and Lift (spec section 6).

   LOAD of one activity = effort (RPE 1-10) x minutes. This is Foster's
   session-RPE method, the same scale that Lift uses.
   - A lift session uses Lift's sessionTrainingLoad (effort from the
     logged RIR, minutes from the timer or from the sets).
   - Any other activity uses its RPE. When there is no RPE but there is an
     average heart rate and a maximum heart rate (from the run profile),
     the heart rate gives the effort. Else the app uses RPE 7, as Lift
     did.

   FITNESS, FATIGUE AND FORM (Banister impulse-response model):
   - fitness = exponential average of daily load, time constant 42 days
   - fatigue = exponential average of daily load, time constant 7 days
   - form    = fitness - fatigue
   Each day uses k = 1 - exp(-1/N). A rest day is a real zero.

   INFORMATION ONLY. These numbers describe your recent training. They
   cannot predict injury. Do not show them as a risk.
--------------------------------------------------------------- */

export const FITNESS_DAYS = 42;
export const FATIGUE_DAYS = 7;
export const FITNESS_K = 1 - Math.exp(-1 / FITNESS_DAYS);
export const FATIGUE_K = 1 - Math.exp(-1 / FATIGUE_DAYS);
// Days from the first activity before the form value means anything.
// Four weeks, the same limit at which Simple mode shows jargon (spec 1.5).
export const MIN_DAYS_FOR_FORM = 28;
// A long-dormant history should not cost a long loop for nothing.
const MAX_SERIES_DAYS = 1500;

// Effort 1-10 from heart rate as a share of maximum heart rate.
// 50% of max is effort 1, 100% is effort 10.
export function effortFromHeartRate(avgHR, maxHR) {
  const a = Number(avgHR);
  const m = Number(maxHR);
  if (!(a > 0) || !(m > 0)) return null;
  const share = a / m;
  return Math.max(1, Math.min(10, Math.round(((share - 0.5) / 0.5) * 10 * 10) / 10));
}

/* Load of one item from listActivities(), or of one raw Lift record.
   options: { settings, maxHR } — maxHR is the runner's maximum heart rate. */
export function activityLoad(item, options = {}) {
  if (!item) return 0;
  const isNormalised = item.source === "lift" || item.source === "activity";
  if (item.source === "lift") return sessionTrainingLoad(item.raw || {}, options.settings);
  if (!isNormalised && Array.isArray(item.exercises)) return sessionTrainingLoad(item, options.settings);
  const minutes = isNormalised ? item.minutes : (activitySeconds(item) || 0) / 60;
  if (!(minutes > 0)) return 0;
  const rpe = Number(item.rpe);
  let effort = Number.isFinite(rpe) && rpe > 0 ? rpe : null;
  if (effort === null) effort = effortFromHeartRate(item.avgHR, options.maxHR);
  if (effort === null) effort = ASSUMED_SESSION_RPE;
  return effort * minutes;
}

// { "YYYY-MM-DD": load } for a list of normalised activities.
export function dailyLoads(activities, options = {}) {
  const byDay = {};
  for (const a of activities || []) {
    const day = a.date || (a.startedAt ? dateStrOf(new Date(a.startedAt)) : null);
    const load = activityLoad(a, options);
    if (!day || !load) continue;
    byDay[day] = (byDay[day] || 0) + load;
  }
  return byDay;
}

/* One row per day from the first activity to `until` (default today):
     [{ date, load, fitness, fatigue, form }]
   options: { settings, maxHR, until: "YYYY-MM-DD" } */
export function fitnessSeries(activities, options = {}) {
  const byDay = dailyLoads(activities, options);
  const days = Object.keys(byDay).sort();
  if (!days.length) return [];
  const until = options.until || todayStr();
  const cursor = new Date(`${days[0]}T12:00:00`);
  const end = new Date(`${until}T12:00:00`);
  if ((end - cursor) / 86400000 > MAX_SERIES_DAYS) cursor.setTime(end.getTime() - MAX_SERIES_DAYS * 86400000);
  const out = [];
  let fitness = 0;
  let fatigue = 0;
  while (cursor <= end) {
    const date = dateStrOf(cursor);
    const load = byDay[date] || 0;
    fitness += (load - fitness) * FITNESS_K;
    fatigue += (load - fatigue) * FATIGUE_K;
    out.push({ date, load, fitness, fatigue, form: fitness - fatigue });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/* Form zones. The share is form as a part of fitness, so the same form
   value means the same thing for a new runner and for a marathoner.
   Words only describe. They never say "risk". */
export const FORM_ZONES = [
  { min: -Infinity, max: -0.3, label: "Very tired", stage: "red", note: "Much more training than usual. An easier day may help." },
  { min: -0.3, max: -0.1, label: "Tired", stage: "amber", note: "Normal in a hard training block." },
  { min: -0.1, max: 0.05, label: "Neutral", stage: "green", note: "Your training is close to your usual training." },
  { min: 0.05, max: 0.25, label: "Fresh", stage: "green", note: "You rested more than usual. Good before a race." },
  { min: 0.25, max: Infinity, label: "Rested", stage: "amber", note: "A long rest. Fitness slowly goes down." },
];
// The gauge shows this range of form share.
export const FORM_SCALE = { min: -0.5, max: 0.4 };

export function formShare(row) {
  if (!row || !(row.fitness > 0)) return 0;
  return row.form / row.fitness;
}

export function formZone(share) {
  return FORM_ZONES.find((z) => share < z.max) || FORM_ZONES[FORM_ZONES.length - 1];
}

/* Today's values, for a gauge or a card.
   Returns { ready, fitness, fatigue, form, share, zone, days, weeksOfData, series } */
export function loadSummary(activities, options = {}) {
  const series = fitnessSeries(activities, options);
  const last = series[series.length - 1] || { fitness: 0, fatigue: 0, form: 0 };
  const days = series.length;
  const share = formShare(last);
  return {
    ready: days >= MIN_DAYS_FOR_FORM && last.fitness > 0,
    fitness: last.fitness,
    fatigue: last.fatigue,
    form: last.form,
    share,
    zone: formZone(share),
    days,
    weeksOfData: Math.floor(days / 7),
    series,
  };
}

/* ---------- week streak ---------- */

// Monday of the week that holds `date`, as "YYYY-MM-DD" (local).
export function weekKey(date) {
  const d = date instanceof Date ? new Date(date) : new Date(`${date}T12:00:00`);
  d.setHours(12, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - shift);
  return dateStrOf(d);
}

/* Weeks in a row with at least one activity, counted back from this week.
   A week with no activity yet does not break the streak until it ends.
   Rest days never break it. */
export function weekStreak(activities, now = new Date()) {
  const weeks = new Set();
  for (const a of activities || []) {
    const day = a.date || (a.startedAt ? dateStrOf(new Date(a.startedAt)) : null);
    if (day) weeks.add(weekKey(day));
  }
  const cursor = new Date(`${weekKey(now)}T12:00:00`);
  if (!weeks.has(dateStrOf(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(dateStrOf(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/* ---------- async helpers that read the store ---------- */

export async function loadFormSummary(settings, maxHR) {
  const activities = await listActivities(settings);
  return loadSummary(activities, { settings, maxHR: maxHR || (await runnerMaxHR()) });
}

export async function loadWeekStreak() {
  return weekStreak(await listActivities());
}

/* The runner's maximum heart rate from the run profile (or undefined).
   Every screen that shows fitness, fatigue or form passes it, so that a
   run with heart rate but no effort gets the same load everywhere. */
export async function runnerMaxHR() {
  try {
    const p = await getKey(KEYS.runProfile, null);
    const m = Number(p && p.maxHR);
    return m > 0 ? m : undefined;
  } catch (e) {
    return undefined;
  }
}
