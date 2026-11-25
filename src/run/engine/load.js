/* Training load. One model for runs, gym sessions and other sports:
   load = session effort (RPE 1-10) x minutes. This is the Iron Log scale (Foster session RPE).
   Fitness (42 days), fatigue (7 days) and form (fitness - fatigue) follow the Banister model.
   INFORMATION ONLY. The load numbers cannot predict injury. */

import { clamp, round, toISO, addDays, daysBetween, mondayOf } from './util.js';
import { hrZones } from './science.js';

export const LOAD_NOTE = 'Training load is information only. It cannot predict injury.';
export const FITNESS_DAYS = 42;
export const FATIGUE_DAYS = 7;

const HRR_TO_RPE = [[0, 1], [0.4, 1.5], [0.5, 2], [0.6, 3], [0.7, 4], [0.8, 6], [0.85, 7], [0.9, 8], [0.95, 9], [1, 10]];
const TYPE_RPE = {
  easy: 3, recovery: 2, strides: 3, runwalk: 3, shakeout: 2, long: 4, longfinish: 5, tempo: 7, cruise: 7, intervals: 8, reps: 8,
  hills: 7, fartlek: 6, racepace: 6, sharpener: 6, race: 9, timetrial: 9, strength: 6, gym: 6, lift: 6, cross: 3, walk: 2, run: 4, other: 4,
};
const HARD_TYPES = new Set(['tempo', 'cruise', 'intervals', 'reps', 'hills', 'fartlek', 'racepace', 'sharpener', 'race', 'timetrial']);

/** RPE from heart rate reserve (Karvonen). */
export function rpeFromHR(avgHR, maxHR, restHR) {
  if (![avgHR, maxHR, restHR].every(Number.isFinite) || maxHR <= restHR) return null;
  const hrr = clamp((avgHR - restHR) / (maxHR - restHR), 0, 1);
  for (let i = 1; i < HRR_TO_RPE.length; i++) {
    const [x1, y1] = HRR_TO_RPE[i - 1], [x2, y2] = HRR_TO_RPE[i];
    if (hrr <= x2) return round(y1 + ((hrr - x1) / (x2 - x1)) * (y2 - y1), 1);
  }
  return 10;
}

export function activityMinutes(a) {
  if (!a) return 0;
  if (Number.isFinite(a.min)) return a.min;
  if (Number.isFinite(a.sec)) return a.sec / 60;
  if (Number.isFinite(a.durationSec)) return a.durationSec / 60;
  if (Number.isFinite(a.movingTimeSec)) return a.movingTimeSec / 60;
  return 0;
}
export function activityISO(a) { return toISO(a.iso || a.date || a.startTime || a.start); }

/** Session effort: {rpe, source: 'rpe' | 'hr' | 'type'}. */
export function sessionRpe(a) {
  if (Number.isFinite(a.rpe) && a.rpe >= 1 && a.rpe <= 10) return { rpe: a.rpe, source: 'rpe' };
  const hr = rpeFromHR(a.avgHR, a.maxHR, a.restHR);
  if (hr != null) return { rpe: hr, source: 'hr' };
  return { rpe: TYPE_RPE[a.type] || TYPE_RPE[a.sport] || 4, source: 'type' };
}
/** Load points = RPE x minutes. */
export function sessionLoad(a) { return Math.round(sessionRpe(a).rpe * activityMinutes(a)); }

/** Daily load with fitness (42-day), fatigue (7-day) and form, for the `days` days that end on `today`. */
export function loadSeries(activities = [], days = 90, today) {
  const end = toISO(today || new Date());
  const byDay = new Map();
  let first = end;
  for (const a of activities) {
    let iso; try { iso = activityISO(a); } catch { continue; }
    if (iso > end) continue;
    if (iso < first) first = iso;
    byDay.set(iso, (byDay.get(iso) || 0) + (Number.isFinite(a.load) ? a.load : sessionLoad(a)));
  }
  const start = addDays(end, -(days - 1));
  const warm = first < start ? first : start;
  const k1 = 1 - Math.exp(-1 / FITNESS_DAYS), k2 = 1 - Math.exp(-1 / FATIGUE_DAYS);
  let fit = 0, fat = 0; const out = [];
  for (let iso = warm; iso <= end; iso = addDays(iso, 1)) {
    const L = byDay.get(iso) || 0;
    fit += (L - fit) * k1; fat += (L - fat) * k2;
    if (iso >= start) out.push({ iso, load: L, fitness: round(fit), fatigue: round(fat), form: round(fit - fat) });
  }
  return out;
}

/**
 * Easy/hard split. Uses time in heart-rate zones when an activity has `zoneSec` [z1..z5],
 * else average heart rate against zones, else the session type. `method` says which.
 */
export function easyHardSplit(activities = [], hr = {}) {
  let easy = 0, hard = 0; const methods = new Set(); let count = 0;
  for (const a of activities) {
    const min = activityMinutes(a); if (!min) continue;
    count++;
    if (Array.isArray(a.zoneSec) && a.zoneSec.length >= 5) {
      const z = a.zoneSec.map((x) => Number(x) || 0);
      easy += (z[0] + z[1]) / 60; hard += (z[2] + z[3] + z[4]) / 60; methods.add('hr-zones'); continue;
    }
    const zones = hrZones({ maxHR: a.maxHR || hr.maxHR, restHR: a.restHR || hr.restHR, lthr: hr.lthr }, hr.method || 'karvonen') || hrZones({ maxHR: a.maxHR || hr.maxHR }, 'max');
    if (Number.isFinite(a.avgHR) && zones) {
      if (a.avgHR <= zones[1].hi) easy += min; else hard += min;
      methods.add('hr-average'); continue;
    }
    if (HARD_TYPES.has(a.type)) { const h = a.type === 'race' || a.type === 'timetrial' ? min : min * 0.4; hard += h; easy += min - h; } else easy += min;
    methods.add('session-type');
  }
  const tot = easy + hard;
  const method = methods.size === 0 ? 'none' : methods.size === 1 ? [...methods][0] : 'mixed';
  const note = { 'hr-zones': 'From time in heart-rate zones.', 'hr-average': 'From average heart rate of each session.', 'session-type': 'Estimate from session types. Heart rate gives a better value.', mixed: 'From heart rate where present, else from session types.', none: 'No data yet.' }[method];
  return { easyMin: Math.round(easy), hardMin: Math.round(hard), easyPct: tot ? Math.round((easy / tot) * 100) : 0, hardPct: tot ? Math.round((hard / tot) * 100) : 0, method, note, count };
}

/** Streak in weeks (Monday to Sunday) with at least one activity. Rest days never break it. */
export function weekStreak(activities = [], today) {
  const t = toISO(today || new Date());
  const weeks = new Set();
  for (const a of activities) { let iso; try { iso = activityISO(a); } catch { continue; } if (iso <= t) weeks.add(mondayOf(iso)); }
  const thisWeek = mondayOf(t);
  const thisWeekDone = weeks.has(thisWeek);
  let n = 0; let w = thisWeekDone ? thisWeek : addDays(thisWeek, -7);
  while (weeks.has(w)) { n++; w = addDays(w, -7); }
  return { weeks: n, thisWeekDone, note: thisWeekDone || n === 0 ? '' : 'Do one activity this week to keep your streak.' };
}

/** Readiness check-in (optional). */
export function readiness({ sleepH = 7, sleepQ = 3, soreness = 2, stress = 2, hrvDelta = 0, rhrDelta = 0 } = {}) {
  let s = 50 + (sleepH - 7) * 8 + (sleepQ - 3) * 6 - (soreness - 2) * 8 - (stress - 2) * 6 + hrvDelta * 1.2 - rhrDelta * 2.5;
  s = Math.round(clamp(s, 5, 99));
  const label = s >= 70 ? 'Ready' : s >= 50 ? 'Moderate' : s >= 35 ? 'Low' : 'Very low';
  const advice = s >= 70 ? 'Train as planned.' : s >= 50 ? 'Train, but cut hard reps if you feel flat.' : s >= 35 ? 'Change hard work to an easy run.' : 'Rest or walk today.';
  return { score: s, label, advice };
}

export { daysBetween };
