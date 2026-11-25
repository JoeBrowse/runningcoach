/* Workout builder. A workout is one entry for one day.
   Steps are the parts of a run. Paces are seconds per km.
   "Hard time" is time at marathon pace or faster (used for the 80/20 rule). */

import { clamp, round, weekdayOf } from './util.js';
import { WALK_PACE, runWalk, predict } from './science.js';

export const TITLES = {
  easy: 'Easy run', strides: 'Easy run + strides', recovery: 'Recovery run', long: 'Long run', longfinish: 'Long run, steady finish',
  tempo: 'Threshold run', cruise: 'Cruise intervals', intervals: 'Intervals', reps: 'Speed reps', hills: 'Hill repeats',
  fartlek: 'Fartlek', racepace: 'Race-pace run', sharpener: 'Race sharpener', runwalk: 'Run/walk', shakeout: 'Shake-out run',
  race: 'Race day', timetrial: 'Time trial', rest: 'Rest', strength: 'Strength and mobility', cross: 'Cross-training (optional)',
};

/* Two or three versions of each reason, so the text changes from week to week. */
export const WHY = {
  easy: ['Easy running builds your aerobic base. Keep it easy enough to talk.', 'Most of your fitness comes from easy runs like this one. Do not run it fast.', 'An easy day helps you recover from hard days. Slow is correct today.'],
  strides: ['Short, relaxed strides keep your legs quick. They do not make you tired.', 'Strides teach good form at speed. Walk back slowly between them.'],
  recovery: ['A short, very easy run helps blood flow after a hard effort.', 'Recovery comes first. Keep this run short and very easy.'],
  long: ['The long run builds endurance. Start slowly and keep it easy.', 'Long, easy running makes your heart and legs stronger for race day.', 'Time on your feet is the goal today, not speed.'],
  longfinish: ['A steady finish teaches you to hold pace on tired legs.', 'The last part is at steady effort. This is like the second half of a race.'],
  tempo: ['Threshold work raises the pace you can hold for a long time. It feels comfortably hard.', 'This run trains you to run fast and stay relaxed.'],
  cruise: ['Threshold in blocks gives the benefit of a tempo run with less strain.', 'Short jogs between blocks let you keep good form at threshold effort.'],
  intervals: ['Hard reps of about 3 minutes raise your top aerobic power.', 'Intervals make race pace feel easier. Jog slowly between reps.'],
  reps: ['Short fast reps improve form and running economy. Recover fully between reps.', 'Fast, relaxed running. Do not sprint. Stop if your form breaks down.'],
  hills: ['Hills build strength and power with less impact than flat speed work.', 'Run up with strong arms and short steps. Jog down slowly.'],
  fartlek: ['Fartlek mixes faster and easy running. It is a gentle start to speed work.', 'Play with speed today. The fast parts are strong, not all-out.'],
  racepace: ['Practise goal pace so it feels normal on race day. Practise your fuel too.', 'Race-pace work teaches your body the rhythm of the race.'],
  sharpener: ['A short session keeps you sharp before the race. It does not make you tired.'],
  runwalk: ['Run/walk builds fitness safely. The run parts get longer as you progress.', 'Walk breaks are part of the plan. They let you train more with less risk.'],
  shakeout: ['A short easy run the day before a race keeps you loose. Do not do more.'],
  race: ['Race day. Start slower than you want. Eat and drink early. Enjoy it.'],
  timetrial: ['A time trial shows your current fitness. The app updates your paces from it.'],
  rest: ['Rest lets your body adapt to the training. Fitness grows on rest days.', 'A rest day is part of the plan. Sleep well and eat well.'],
  strength: ['Strength work makes tendons and muscles stronger. It helps you stay healthy.'],
  cross: ['Optional low-impact exercise: cycling, swimming or walking. Keep it easy.'],
};

export const EFFORT = {
  easy: 'Easy: slow enough to talk in full sentences.',
  strides: 'Easy run. Strides are fast and relaxed, not a sprint.',
  recovery: 'Very easy: slower than your normal easy pace.',
  long: 'Easy and steady: you can still talk.',
  longfinish: 'Easy first. Steady at the end: you can talk in short sentences.',
  tempo: 'Comfortably hard: you can say a few words only.',
  cruise: 'Comfortably hard in each block. Easy jog between blocks.',
  intervals: 'Hard: you can say one or two words. Jog slowly between reps.',
  reps: 'Fast and relaxed: not a sprint. Walk or jog to recover.',
  hills: 'Strong effort up the hill. Easy jog down.',
  fartlek: 'Strong in the fast parts. Easy in the slow parts.',
  racepace: 'Goal race effort: controlled and steady.',
  sharpener: 'Race effort for short parts. Stay relaxed.',
  runwalk: 'Run slowly enough to talk. Walk briskly.',
  shakeout: 'Very easy and short.',
  race: 'Race: start steady, finish strong.',
  timetrial: 'Hard, even effort for the whole distance.',
  rest: 'Rest day. No running today.',
  strength: 'Controlled. Stop 2 to 3 reps before failure.',
  cross: 'Optional. Easy effort only.',
};

export const RUN_TYPES = new Set(['easy', 'strides', 'recovery', 'long', 'longfinish', 'tempo', 'cruise', 'intervals', 'reps', 'hills', 'fartlek', 'racepace', 'sharpener', 'runwalk', 'shakeout', 'race', 'timetrial']);
export const QUALITY_TYPES = new Set(['tempo', 'cruise', 'intervals', 'reps', 'hills', 'fartlek', 'racepace', 'sharpener']);

export function intensityOf(type) {
  if (type === 'rest' || type === 'strength' || type === 'cross') return type;
  if (type === 'long' || type === 'longfinish') return 'long';
  if (type === 'race' || type === 'timetrial') return 'race';
  if (QUALITY_TYPES.has(type)) return 'hard';
  return 'easy';
}
export const isRun = (w) => !!w && RUN_TYPES.has(w.type);
/** A day that counts as hard for spacing: quality, long run, race or time trial. */
export const isHardRun = (w) => !!w && (w.intensity === 'hard' || w.intensity === 'long' || w.intensity === 'race');

/* Quality session shapes. Work and rest in seconds. */
const Q = {
  hills: { work: 60, rest: 90, workLabel: 'Hill up', restLabel: 'Jog down', pace: 'interval', minReps: 4, maxReps: 10 },
  fartlek: { work: 60, rest: 90, workLabel: 'Fast', restLabel: 'Easy', pace: 'fartlek', minReps: 5, maxReps: 10 },
  intervals: { work: 180, rest: 120, workLabel: 'Hard', restLabel: 'Jog', pace: 'interval', minReps: 3, maxReps: 6 },
  reps: { work: 60, rest: 120, workLabel: 'Fast', restLabel: 'Walk or jog', pace: 'rep', minReps: 5, maxReps: 10 },
  cruise: { work: 360, rest: 90, workLabel: 'Threshold', restLabel: 'Jog', pace: 'threshold', minReps: 2, maxReps: 5 },
  sharpener: { work: 120, rest: 120, workLabel: 'Race pace', restLabel: 'Jog', pace: 'race', minReps: 3, maxReps: 5 },
  tempo: { continuous: true, label: 'Threshold', pace: 'threshold', minMin: 12, maxMin: 30 },
  racepace: { continuous: true, label: 'Goal race pace', pace: 'race', minMin: 15, maxMin: 75 },
};

function paceFor(key, p, ctx) {
  if (key === 'fartlek') return (p.threshold + p.interval) / 2;
  if (key === 'race') return ctx.racePace || p.threshold;
  return p[key];
}

/** Smallest budget (minutes) that a quality session needs. */
export function qualityMinMinutes(type) {
  const q = Q[type]; if (!q) return 0;
  return 10 + (q.continuous ? q.minMin : q.minReps * (q.work + q.rest) / 60);
}

function qualitySteps(type, budgetMin, p, ctx, repsOverride) {
  const q = Q[type];
  const wu = clamp(Math.round(budgetMin * 0.2), 5, 15);
  const main = budgetMin - 2 * wu;
  const warm = { kind: 'warmup', label: 'Warm up', min: wu, pace: p.easyHi };
  const cool = { kind: 'cooldown', label: 'Cool down', min: wu, pace: p.easyHi };
  const pace = paceFor(q.pace, p, ctx);
  if (q.continuous) {
    const maxMin = type === 'racepace' && ctx.goal !== 'marathon' && ctx.goal !== 'ultra50' ? 40 : q.maxMin;
    let mins = repsOverride != null ? repsOverride : clamp(Math.floor(main), q.minMin, maxMin);
    if (mins < q.minMin) return null;
    return { steps: [warm, { kind: 'steady', label: q.label, min: mins, pace, effort: EFFORT[type] }, cool], reps: mins };
  }
  let reps = repsOverride != null ? repsOverride : clamp(Math.floor((main * 60) / (q.work + q.rest)), q.minReps, q.maxReps);
  if (reps < q.minReps) return null;
  return {
    steps: [warm, { kind: 'repeat', times: reps, work: { label: q.workLabel, sec: q.work, pace }, rest: { label: q.restLabel, sec: q.rest, pace: q.restLabel.startsWith('Walk') ? WALK_PACE : p.easyHi } }, cool],
    reps,
  };
}
export function qualityRepsMin(type) { const q = Q[type]; return q ? (q.continuous ? q.minMin : q.minReps) : 0; }
export function qualityRepsStep(type) { const q = Q[type]; return q && q.continuous ? 3 : 1; }

function stepSec(x) {
  if (x.min) return x.min * 60;
  if (x.sec) return x.sec;
  if (x.km && x.pace) return x.km * x.pace;
  return 0;
}
function stepKm(x) {
  if (x.km) return x.km;
  const t = x.min ? x.min * 60 : x.sec || 0;
  return t / (x.pace || WALK_PACE);
}
export function stepsSec(steps = []) {
  let s = 0;
  for (const x of steps) s += x.kind === 'repeat' ? x.times * (stepSec(x.work) + (x.rest ? stepSec(x.rest) : 0)) : stepSec(x);
  return s;
}
export function stepsMin(steps = []) { return Math.round(stepsSec(steps) / 60); }
export function stepsKm(steps = []) {
  let k = 0;
  for (const x of steps) k += x.kind === 'repeat' ? x.times * (stepKm(x.work) + (x.rest ? stepKm(x.rest) : 0)) : stepKm(x);
  return round(k, 1);
}

/** Minutes at marathon pace or faster in a workout. Races and time trials give 0 (they are not counted). */
export function hardMinutes(w, p) {
  if (!w || !w.steps || w.intensity === 'race') return 0;
  const lim = p.marathon * 1.01;
  let m = 0;
  for (const x of w.steps) {
    if (x.kind === 'repeat') { if (x.work.pace && x.work.pace <= lim) m += (x.times * stepSec(x.work)) / 60; } else if (x.pace && x.pace <= lim) m += stepSec(x) / 60;
  }
  return m;
}
/** Running minutes that count for the 80/20 rule (races and time trials are not counted). */
export function countedMinutes(w) { return w && isRun(w) && w.intensity !== 'race' ? stepsSec(w.steps) / 60 : 0; }

/**
 * Builds one workout.
 * spec: {type, km (easy/long), budgetMin (quality), reps (quality override),
 *        level + mainMin + walkMin (run/walk), distKm + name + priority (race)}
 * ctx: {p (paces), score, goal, racePace, weekIdx, showPace, phase}
 */
export function makeWorkout(iso, spec, ctx) {
  const { type } = spec; const p = ctx.p;
  const variants = WHY[type] || [''];
  const w = {
    id: 'w-' + iso, iso, dow: weekdayOf(iso), type, title: TITLES[type] || type, intensity: intensityOf(type),
    km: 0, min: 0, steps: [], why: variants[(ctx.weekIdx || 0) % variants.length] + (spec.why ? ' ' + spec.why : ''),
    effortText: EFFORT[type] || '', showPace: ctx.showPace !== false, done: false, rpe: null, gym: null, extra: null,
    spec: { ...spec },
  };
  if (spec.note) w.note = spec.note;
  switch (type) {
    case 'rest': return w;
    case 'cross': w.min = 30; return w;
    case 'strength': w.min = spec.min || 20; w.session = spec.session || 'core'; return w;
    case 'easy': case 'recovery':
      w.steps = [{ kind: 'steady', label: type === 'recovery' ? 'Recovery run' : 'Easy run', km: round(spec.km, 1), pace: type === 'recovery' ? p.easyHi : p.easy }];
      break;
    case 'strides': {
      const block = 6 * (20 / p.rep + 60 / WALK_PACE);
      const base = round(Math.max(spec.km - block, 1.5), 1);
      w.steps = [{ kind: 'steady', label: 'Easy run', km: base, pace: p.easy }, { kind: 'repeat', times: 6, work: { label: 'Stride', sec: 20, pace: p.rep }, rest: { label: 'Walk back', sec: 60, pace: WALK_PACE } }];
      break;
    }
    case 'long': w.steps = [{ kind: 'steady', label: 'Long run', km: round(spec.km, 1), pace: p.long }]; break;
    case 'longfinish': {
      const fin = round(spec.km * 0.2, 1);
      w.steps = [{ kind: 'steady', label: 'Long run', km: round(spec.km - fin, 1), pace: p.long }, { kind: 'steady', label: 'Steady finish', km: fin, pace: p.marathon }];
      break;
    }
    case 'shakeout':
      w.steps = [{ kind: 'steady', label: 'Shake-out', min: spec.min || 15, pace: p.easyHi }, { kind: 'repeat', times: 4, work: { label: 'Stride', sec: 15, pace: p.rep }, rest: { label: 'Walk', sec: 45, pace: WALK_PACE } }];
      break;
    case 'runwalk': {
      const rw = runWalk(spec.level || 1);
      const wm = spec.walkMin != null ? spec.walkMin : 5;
      const runPace = p.easyHi;
      const main = [];
      let reps = 1;
      if (rw.continuous) main.push({ kind: 'steady', label: 'Run', sec: rw.run, pace: runPace, effort: EFFORT.runwalk });
      else {
        reps = Math.max(1, spec.reps != null ? spec.reps : Math.round(((spec.mainMin || 20) * 60) / (rw.run + rw.walk)));
        main.push({ kind: 'repeat', times: reps, work: { label: 'Run', sec: rw.run, pace: runPace }, rest: { label: 'Walk', sec: rw.walk, pace: WALK_PACE, walk: true } });
        if (spec.extraSec > 0) main.push({ kind: 'steady', label: 'Run', sec: spec.extraSec, pace: runPace, effort: EFFORT.runwalk });
      }
      w.steps = [...(wm ? [{ kind: 'warmup', label: 'Brisk walk', min: wm, pace: WALK_PACE, walk: true }] : []), ...main, ...(wm ? [{ kind: 'cooldown', label: 'Walk', min: wm, pace: WALK_PACE, walk: true }] : [])];
      w.runWalk = { level: rw.level, run: rw.run, walk: rw.walk, reps, extraSec: rw.continuous ? 0 : spec.extraSec || 0, continuous: rw.continuous };
      w.title = rw.continuous ? `Run ${Math.round(rw.run / 60)} min without a stop` : `Run/walk: run ${fmtSec(rw.run)}, walk ${fmtSec(rw.walk)}`;
      w.spec.reps = rw.continuous ? undefined : reps;
      break;
    }
    case 'race': case 'timetrial': {
      const dist = spec.distKm || 5;
      let sec;
      try { sec = predict(ctx.score, dist); } catch { sec = dist * 420; }
      if (type === 'race' && spec.runWalkLevel) sec = dist * (p.easyHi * 0.6 + WALK_PACE * 0.4);
      const racePace = sec / dist;
      w.steps = type === 'timetrial'
        ? [{ kind: 'warmup', label: 'Warm up', min: 10, pace: p.easyHi }, { kind: 'steady', label: 'Time trial', km: dist, pace: racePace }, { kind: 'cooldown', label: 'Cool down', min: 10, pace: p.easyHi }]
        : [{ kind: 'steady', label: spec.runWalkLevel ? 'Race (walk breaks are OK)' : 'Race', km: dist, pace: racePace }];
      w.race = { name: spec.name || (type === 'race' ? 'Race' : 'Time trial'), distKm: dist, priority: spec.priority || 'C', goal: !!spec.goal };
      if (type === 'race') w.title = `${w.race.name} (${w.race.priority} race)`;
      if (type === 'timetrial') w.title = `Time trial ${dist} km`;
      break;
    }
    default: {
      if (!Q[type]) throw new Error(`Unknown workout type: ${type}`);
      const built = qualitySteps(type, spec.budgetMin || 30, p, ctx, spec.reps);
      if (!built) return makeWorkout(iso, { type: 'easy', km: Math.max(2.5, (spec.budgetMin || 25) * 60 / p.easy * 0.9), why: 'The session is too short for speed work this week.' }, ctx);
      w.steps = built.steps; w.spec.reps = built.reps;
    }
  }
  w.km = type === 'race' ? (spec.distKm || 5) : stepsKm(w.steps);
  w.min = stepsMin(w.steps);
  return w;
}

function fmtSec(s) { return s % 60 === 0 ? `${s / 60} min` : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; }

export function restDay(iso, ctx, why) { return makeWorkout(iso, { type: 'rest', why }, ctx); }
