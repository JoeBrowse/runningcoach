import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { activitySeconds } from "./activities.js";
import { dateStrOf, todayStr, MONTH_ABBREV } from "./dates.js";
import { restSecondsFor } from "./rest.js";
import { safeGet } from "./storage.js";

/* ---------------------------------------------------------------
   TRAINING LOAD — ACUTE:CHRONIC WORKLOAD RATIO

   The readiness map answers "can I train chest today". It cannot answer
   "should I train at all", and it cannot be made to: it remembers only
   each muscle's most recent session, so Monday's legs have left it by
   Thursday and a four-day block reads like a single day.

   Rather than invent a second measure, this is the one sports science
   already uses, built the way the literature builds it.

   LOAD — session RPE. Foster's method: how hard the session felt, 0-10,
   multiplied by how many minutes it lasted. One number in arbitrary
   units that puts a set of squats and a 10k on the same scale, which is
   the whole reason it is the standard for mixed training.

   For a lift, the session's RPE is the mean across its logged sets
   (10 - RIR); minutes come from the session's own elapsed time where it
   was recorded, and otherwise from the sets it contains at the rest
   lengths configured in Training Defaults. Sessions logged before the
   app stored elapsed time therefore get an estimate rather than nothing.
   For a run or a row, both numbers are already exact.

   ACUTE AND CHRONIC — exponentially weighted moving averages, 7 days and
   28 days, with lambda = 2/(N+1). Williams et al. (2017) showed EWMA to
   be a more sensitive predictor of injury than the rolling averages the
   method originally used, because a rolling window treats a session
   nine days ago as worth exactly as much as one yesterday and then worth
   nothing at all the next morning.

   THE RATIO — acute over chronic. What you have done this week measured
   against what you are conditioned for, which is the point: the same
   week is a normal week for one person and a spike for another, and an
   absolute number cannot tell them apart.

   INFORMATION ONLY. The zones below follow Gabbett (2016), but later work
   (Lolli et al. 2019; Impellizzeri et al. 2020, 2021) shows the ratio is
   a poor injury predictor: acute and chronic share data, which creates a
   spurious correlation. So the app shows the ratio as a description of
   how this week compares with your usual training, never as an injury
   risk or an injury rate.

     below 0.8   less than you are used to
     0.8 - 1.3   close to what you are used to
     1.3 - 1.5   more than you are used to
     above 1.5   a sharp rise on your usual training

   Sources: Foster (1998) session RPE; Banister's impulse-response model;
   Gabbett, Br J Sports Med 2016; Williams et al., Br J Sports Med 2017;
   Lolli et al., Br J Sports Med 2019 (the criticism).
--------------------------------------------------------------- */

export const ACUTE_DAYS = 7;
export const CHRONIC_DAYS = 28;
export const ACUTE_LAMBDA = 2 / (ACUTE_DAYS + 1);
export const CHRONIC_LAMBDA = 2 / (CHRONIC_DAYS + 1);

// Working time for one set, in seconds. Rest is far the larger part of a
// set's clock and comes from the user's own configured rest lengths.
export const SET_WORK_SECONDS = 45;
// A session RPE for sets logged without one. 7 is "hard but not to
// failure", which is what an untagged working set most often was, and
// matches the readiness map's own assumption that unlogged effort is not
// failure work.
export const ASSUMED_SESSION_RPE = 7;
// Below this the chronic average is too thin to divide by — a fortnight
// of training is the least that makes a 28-day average mean anything.
export const MIN_CHRONIC_LOAD = 20;

// Minutes a lifting session took: measured if the session recorded it,
// otherwise its sets at the rest lengths in force.
export function sessionMinutes(session, settings) {
  if (session.startedAt && session.at) {
    const mins = (new Date(session.at) - new Date(session.startedAt)) / 60000;
    // A session left open overnight is not a six-hour workout.
    if (mins > 0 && mins < 240) return mins;
  }
  let seconds = 0;
  for (const ex of session.exercises || []) {
    const full = ALL_EXERCISES_BY_ID[ex.id];
    const type = ex.type || (full && full.type) || "isolation";
    const rest = restSecondsFor({ type }, settings);
    const count = (ex.sets || []).length;
    seconds += count * (SET_WORK_SECONDS + rest);
  }
  return seconds / 60;
}

// Foster session RPE: how hard it felt, times how long it lasted.
export function sessionRPE(session) {
  let sum = 0, n = 0;
  for (const ex of session.exercises || []) {
    for (const st of ex.sets || []) {
      if (st.rir !== null && st.rir !== undefined && st.rir !== "") {
        const rir = Number(st.rir);
        if (Number.isFinite(rir)) { sum += 10 - rir; n++; }
      }
    }
  }
  return n ? sum / n : ASSUMED_SESSION_RPE;
}

export function sessionTrainingLoad(session, settings) {
  const sets = (session.exercises || []).reduce((t, ex) => t + (ex.sets || []).length, 0);
  if (!sets) return 0;
  return sessionRPE(session) * sessionMinutes(session, settings);
}

export function activityTrainingLoad(activity) {
  const secs = activitySeconds(activity);
  if (!secs) return 0;
  const rpe = Number(activity.rpe);
  return (Number.isFinite(rpe) && rpe > 0 ? rpe : ASSUMED_SESSION_RPE) * (secs / 60);
}

/* The two averages and the ratio between them.

   Walked forward a day at a time from the first thing ever logged, so a
   rest day is a real zero rather than a gap — that is what makes the
   acute average fall when you stop, and the whole measure depends on it. */
export function trainingLoadRatio(sessions, activities, settings) {
  const byDay = {};
  const addDay = (date, load) => {
    if (!date || !load) return;
    byDay[date] = (byDay[date] || 0) + load;
  };
  for (const s of sessions || []) addDay(s.date, sessionTrainingLoad(s, settings));
  for (const a of activities || []) addDay(a.date, activityTrainingLoad(a));

  const days = Object.keys(byDay).sort();
  if (!days.length) return { acute: 0, chronic: 0, ratio: null, ready: false };

  const today = todayStr();
  let acute = 0, chronic = 0;
  const cursor = new Date(`${days[0]}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  // A very long-dormant history should not cost a long loop for nothing.
  if ((end - cursor) / 86400000 > 800) cursor.setTime(end - 800 * 86400000);
  while (cursor <= end) {
    const load = byDay[dateStrOf(cursor)] || 0;
    acute = load * ACUTE_LAMBDA + (1 - ACUTE_LAMBDA) * acute;
    chronic = load * CHRONIC_LAMBDA + (1 - CHRONIC_LAMBDA) * chronic;
    cursor.setDate(cursor.getDate() + 1);
  }
  const ready = chronic >= MIN_CHRONIC_LOAD;
  return { acute, chronic, ratio: ready ? acute / chronic : null, ready };
}

/* What the scale can answer if you drag the marker off where you are.

   Both directions have an exact answer, and they are different questions.

   DOWN is a rest calculation. With no training at all, a day multiplies
   acute by (1 - ACUTE_LAMBDA) and chronic by (1 - CHRONIC_LAMBDA), so the
   ratio falls by a fixed factor every day regardless of where it started
   — 0.806 with these constants. Inverting that gives the time to any
   lower ratio in closed form rather than by simulating days forward.

   UP cannot be waited for; it takes a session. Putting a load L into
   today gives acute' = L·λa + (1-λa)·acute and chronic' = L·λc +
   (1-λc)·chronic, and setting acute'/chronic' to the target solves for L
   directly. The answer is a session-RPE load, so it is quoted back as the
   minutes at RPE 8 that would produce it — which is the form you can act
   on. Above λa/λc (3.63) no single session reaches the target; the scale
   stops at 2.0, so that never bites here. */
export const REST_DAY_DECAY = (1 - ACUTE_LAMBDA) / (1 - CHRONIC_LAMBDA);
// The effort a quoted session is priced at. Hard, but not the once-a-month
// kind, so the minutes it implies are minutes anyone recognises.
export const QUOTED_RPE = 8;

export function hoursOfRestToReach(current, target) {
  if (!(current > 0) || !(target > 0) || target >= current) return null;
  return (Math.log(target / current) / Math.log(REST_DAY_DECAY)) * 24;
}

export function sessionLoadToReach(acute, chronic, target) {
  const denominator = ACUTE_LAMBDA - target * CHRONIC_LAMBDA;
  if (denominator <= 0) return null;
  const load = (target * (1 - CHRONIC_LAMBDA) * chronic - (1 - ACUTE_LAMBDA) * acute) / denominator;
  return load > 0 ? load : null;
}

// "09:00 Tue 16 Sep" — 24-hour, because the question was "when", and a
// weekday because "in 38 hours" is not a thing anyone can picture.
export function formatWhen(date) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} ${dayNames[date.getDay()]} ${date.getDate()} ${MONTH_ABBREV[date.getMonth()]}`;
}

/* Gabbett's zones. The colours are the map's own three stages, so the bar
   needs no legend and follows every colour scheme including the
   colour-blind ones. */
export const LOAD_ZONES = [
  { min: 0, max: 0.8, label: "Low", stage: "amber" },
  { min: 0.8, max: 1.3, label: "Usual", stage: "green" },
  { min: 1.3, max: 1.5, label: "Ramping up", stage: "amber" },
  { min: 1.5, max: Infinity, label: "Spike", stage: "red" },
];
// The bar runs to 2.0: past that the ratio has stopped saying anything
// more than "far too much, too fast".
export const LOAD_SCALE_MAX = 2;

export function loadZone(ratio) {
  return LOAD_ZONES.find((z) => ratio < z.max) || LOAD_ZONES[LOAD_ZONES.length - 1];
}

// Both halves of the history, since a run counts towards this as much as
// a leg day does.
export async function loadTrainingLoad(settings) {
  const hist = (await safeGet("workout-history")) || [];
  const activities = (await safeGet("activity-history")) || [];
  return trainingLoadRatio(hist, activities, settings);
}
