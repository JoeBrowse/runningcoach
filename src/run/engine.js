/* Skid Marks V1 running plan engine.
   ES module. Pure functions. No DOM, no window globals, no network.
   Inject `today` (ISO string or Date) where dates matter.
   See ENGINE.md for the API. Never use the names TSS or VDOT in this engine. */

export {
  DAY_MS, KM_PER_MI, clamp, round, sum, rng, toISO, parseISO, addDays, daysBetween, weekdayOf, mondayOf, mondayOnOrAfter,
  DAY_NAMES, DAY_NAMES_LONG, fmtDay, fmtDate, fmtTime, fmtPace, fmtKm, fmtSpeed, kmToUnits, unitsToKm,
} from './engine/util.js';

export {
  SCORE_MIN, SCORE_MAX, WALK_PACE, checkResult, fitnessScore, isValidScore, predict, paces, riegel, RACE_DISTANCES, predictions,
  hrZones, heatAdjust, fuel, carbLoad, RUN_WALK_LADDER, RUN_WALK_TOP, runWalk,
} from './engine/science.js';

export {
  TITLES, WHY, EFFORT, RUN_TYPES, QUALITY_TYPES, intensityOf, isRun, isHardRun, makeWorkout, stepsKm, stepsMin, stepsSec, hardMinutes, countedMinutes,
} from './engine/workouts.js';

export {
  GOALS, SAFETY, LEG_TYPES, longShareCap, normalizeOpts, buildPlan, extendPlan, reconcile, safetyChecks, safetyOk, allDays, todayWorkout, weekOf,
  weekStats, classifyWeek, trainingKm, weekKm, isHeavyLegsDay, isHardDay, recoveryDaysFor, week1Limit, newRunKmFor,
} from './engine/plan.js';

export { adapt, checkMove, suggestDays, returnLadder, afterRace, goalGap, timeTrialDue } from './engine/adapt.js';

export { LOAD_NOTE, FITNESS_DAYS, FATIGUE_DAYS, rpeFromHR, activityMinutes, sessionRpe, sessionLoad, loadSeries, easyHardSplit, weekStreak, readiness } from './engine/load.js';

export { seedFromHistory } from './engine/history.js';

export { STRENGTH, DRILLS, CYCLE, audioCues, simulateRun, loopRoute, toICS, toGPX, toCSV, toWorkoutJSON, coachAnswer, sample } from './engine/extras.js';

export { WARMUP_MOVES, warmupFor, liftWarmup, warmupCues } from './engine/warmup.js';
