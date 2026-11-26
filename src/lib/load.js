import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { activitySeconds } from "./activities.js";
import { restSecondsFor } from "./rest.js";

/* ---------------------------------------------------------------
   SESSION LOAD (Lift)

   LOAD — session RPE. Foster's method: how hard the session felt, 0-10,
   multiplied by how many minutes it lasted. One number in arbitrary
   units that puts a set of squats and a 10k on the same scale.

   For a lift, the session's RPE is the mean across its logged sets
   (10 - RIR); minutes come from the session's own elapsed time where it
   was recorded, and otherwise from the sets it contains at the rest
   lengths configured in Training Defaults.

   The fitness / fatigue / form model that uses these numbers is in
   src/shared/load.js. The old acute:chronic ratio and its gauge were
   removed in 2.0.0: research shows that the ratio cannot predict injury,
   and Skid Marks shows one load model for all modes.

   Source: Foster (1998) session RPE.
--------------------------------------------------------------- */

// Working time for one set, in seconds. Rest is far the larger part of a
// set's clock and comes from the user's own configured rest lengths.
export const SET_WORK_SECONDS = 45;
// A session RPE for sets logged without one. 7 is "hard but not to
// failure", which is what an untagged working set most often was.
export const ASSUMED_SESSION_RPE = 7;

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
