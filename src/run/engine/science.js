/* Running science: fitness score, paces, predictions, heart-rate zones,
   heat, fuel and the run/walk ladder.
   The fitness score uses the published Daniels and Gilbert (1979) equations.
   The app calls it "running fitness score". It is not endorsed by anyone. */

import { clamp, round } from './util.js';

export const SCORE_MIN = 15;
export const SCORE_MAX = 85;
export const WALK_PACE = 660; // sec per km, brisk walk (about 5.5 km/h)

const vo2 = (v) => -4.60 + 0.182258 * v + 0.000104 * v * v; // v in m/min
const pctMax = (t) => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t); // t in min
const vFromVo2 = (o) => (-0.182258 + Math.sqrt(0.182258 ** 2 + 4 * 0.000104 * (4.60 + o))) / (2 * 0.000104);

/** Raw equation value, no checks. Internal use. */
export function rawScore(distKm, timeSec) {
  const t = timeSec / 60; const v = (distKm * 1000) / t;
  return vo2(v) / pctMax(t);
}

/**
 * Checks a result and gives the running fitness score.
 * Returns {ok, score} or {ok:false, error}. Scores outside 15-85 are refused:
 * they come from typing errors or GPS faults, not from real runners.
 */
export function checkResult(distKm, timeSec) {
  if (!Number.isFinite(distKm) || distKm < 0.8 || distKm > 250) return { ok: false, error: 'Distance must be between 0.8 km and 250 km.' };
  if (!Number.isFinite(timeSec) || timeSec <= 0) return { ok: false, error: 'Time must be more than zero.' };
  const pace = timeSec / distKm;
  if (pace < 150) return { ok: false, error: 'This pace is faster than 2:30 per km. Check the time and the distance.' };
  const t = timeSec / 60;
  if (t < 3 || t > 60 * 30) return { ok: false, error: 'Use a result between 3 minutes and 30 hours.' };
  const s = rawScore(distKm, timeSec);
  if (!Number.isFinite(s) || s > SCORE_MAX) return { ok: false, error: `This result gives a score above ${SCORE_MAX}. That is faster than world records. Check the time and the distance.` };
  if (s < SCORE_MIN) return { ok: false, error: `This result gives a score below ${SCORE_MIN}. Use "I am new" or a run/walk plan instead.` };
  return { ok: true, score: round(s, 1) };
}

/** Running fitness score, or null when the input is not valid (see checkResult). */
export function fitnessScore(distKm, timeSec) {
  const r = checkResult(distKm, timeSec);
  return r.ok ? r.score : null;
}

export function isValidScore(score) { return Number.isFinite(score) && score >= SCORE_MIN && score <= SCORE_MAX; }

function assertScore(score) {
  if (!isValidScore(score)) throw new RangeError(`Fitness score must be between ${SCORE_MIN} and ${SCORE_MAX}.`);
}

/** Predicted race time in seconds for a score and a distance. */
export function predict(score, distKm) {
  assertScore(score);
  if (!Number.isFinite(distKm) || distKm <= 0) throw new RangeError('Distance must be more than zero.');
  let lo = distKm * 100, hi = distKm * 2400;
  for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (rawScore(distKm, mid) > score) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

const secPerKmAt = (score, frac) => 60000 / vFromVo2(score * frac);

/** Training paces in seconds per km. */
export function paces(score) {
  assertScore(score);
  const easyLo = secPerKmAt(score, 0.70), easyHi = secPerKmAt(score, 0.62);
  return {
    easyLo, easyHi, easy: (easyLo + easyHi) / 2,
    long: secPerKmAt(score, 0.66),
    marathon: predict(score, 42.195) / 42.195,
    threshold: secPerKmAt(score, 0.88),
    interval: secPerKmAt(score, 0.975),
    rep: secPerKmAt(score, 1.05),
    walk: WALK_PACE,
  };
}

/** Riegel time model: t2 = t1 * (d2/d1)^k. */
export const riegel = (t1, d1, d2, k = 1.06) => t1 * Math.pow(d2 / d1, k);

export const RACE_DISTANCES = [['5K', 5], ['10K', 10], ['Half marathon', 21.0975], ['Marathon', 42.195]];
export function predictions(score) {
  return RACE_DISTANCES.map(([name, km]) => ({ name, km, sec: Math.round(predict(score, km)) }));
}

/**
 * Heart-rate zones. method: 'karvonen' (needs maxHR and restHR), 'max' (maxHR),
 * 'lthr' (lthr). Returns null when the needed values are missing or not sensible.
 */
export function hrZones(values = {}, method = 'karvonen') {
  const { maxHR, restHR, lthr } = values || {};
  const ok = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const names = [
    ['Recovery', 'Very easy. Warm-up and recovery.'],
    ['Easy', 'Most of your running. It builds your base.'],
    ['Steady', 'Long-run finish and marathon effort.'],
    ['Threshold', 'Comfortably hard. About 1 hour race effort.'],
    ['VO2 max', 'Hard intervals of 3 to 5 minutes.'],
  ];
  let b;
  if (method === 'lthr') {
    if (!ok(lthr, 100, 210)) return null;
    b = [0.7, 0.85, 0.90, 0.95, 1.0, 1.06].map((f) => Math.round(lthr * f));
  } else if (method === 'max') {
    if (!ok(maxHR, 120, 230)) return null;
    b = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((f) => Math.round(maxHR * f));
  } else if (method === 'karvonen') {
    if (!ok(maxHR, 120, 230) || !ok(restHR, 30, 100) || restHR >= maxHR - 40) return null;
    b = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((f) => Math.round(restHR + (maxHR - restHR) * f));
  } else return null;
  return names.map((n, i) => ({ z: i + 1, name: n[0], purpose: n[1], lo: b[i], hi: b[i + 1] - (i < 4 ? 1 : 0) }));
}

/** Heat adjustment from temperature and humidity (sum of temperature and dew point in F). */
export function heatAdjust({ tempC = 15, humidity = 60 } = {}) {
  const dew = tempC - (100 - clamp(humidity, 0, 100)) / 5;
  const sumF = (tempC * 9) / 5 + 32 + (dew * 9) / 5 + 32;
  const pct = sumF <= 100 ? 0 : sumF <= 110 ? 0.5 : sumF <= 120 ? 1.5 : sumF <= 130 ? 3 : sumF <= 140 ? 4.5 : sumF <= 150 ? 6.5 : sumF <= 160 ? 8.5 : sumF <= 170 ? 11 : 13;
  const note = pct === 0 ? 'Good running weather. No change.'
    : pct < 5 ? `Warm. Run easy and long runs about ${pct}% slower.`
      : pct < 10 ? `Hot and humid. Run about ${pct}% slower. Run by effort or heart rate.`
        : 'Very hot. Run early, make the run shorter, or run indoors.';
  return { pct, note, dewC: round(dew) };
}

/** Fuel and fluid guide for a run of `min` minutes. */
export function fuel({ min = 90, weightKg = 70, hard = false } = {}) {
  const carbs = min < 60 ? 0 : min < 90 ? 30 : min < 150 ? 60 : 75;
  return {
    carbsPerHour: carbs,
    fluidMlPerHour: hard ? 600 : 500,
    sodiumMgPerHour: min < 60 ? 0 : 400,
    gels: Math.round((carbs * (min / 60)) / 25),
    weightKg,
    note: min < 60 ? 'Water is enough for runs shorter than 60 minutes.' : 'Start to eat at 30 to 40 minutes. Then eat every 20 to 30 minutes. Practise this in training.',
  };
}
export function carbLoad(weightKg = 70) { return { gramsPerDay: Math.round(weightKg * 8), days: 2 }; }

/**
 * Run/walk ladder. Levels 1-7 are run/walk in seconds. Levels 8-12 are
 * continuous runs of 20, 22, 25, 27 and 30 minutes.
 */
export const RUN_WALK_LADDER = [
  { run: 60, walk: 90 }, { run: 90, walk: 90 }, { run: 120, walk: 60 }, { run: 180, walk: 60 },
  { run: 300, walk: 60 }, { run: 480, walk: 60 }, { run: 600, walk: 30 },
  { run: 1200, walk: 0 }, { run: 1320, walk: 0 }, { run: 1500, walk: 0 }, { run: 1620, walk: 0 }, { run: 1800, walk: 0 },
];
export const RUN_WALK_TOP = RUN_WALK_LADDER.length;
export function runWalk(level = 1) {
  const l = clamp(Math.round(level) || 1, 1, RUN_WALK_LADDER.length);
  const r = RUN_WALK_LADDER[l - 1];
  return { level: l, run: r.run, walk: r.walk, continuous: r.walk === 0 };
}
