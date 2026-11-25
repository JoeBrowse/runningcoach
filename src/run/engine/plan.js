/* Plan engine. Deterministic rules. Every change has a reason.
   Order of work:
   1. options -> weekly pattern (long day, quality days, gym days)
   2. timeline (weeks, phases, cutbacks, taper, race week, recovery) and targets
   3. build each week to its target
   4. overlay other races (A, B, C)
   5. attach gym days and gym advice
   6. fix touching hard days (also across weeks) and heavy-legs spacing
   7. per week, in order: volume caps, long-run rules, 80/20 rule
   8. engine strength sessions (only when the user does not lift in Lift mode)
   9. stats and safety checks (computed again from the real days) */

import { clamp, round, sum, toISO, addDays, daysBetween, weekdayOf, mondayOf, mondayOnOrAfter, DAY_NAMES_LONG } from './util.js';
import { paces, predict, isValidScore, fitnessScore, runWalk, RUN_WALK_TOP } from './science.js';
import { makeWorkout, isRun, isHardRun, hardMinutes, countedMinutes, qualityMinMinutes, qualityRepsMin, qualityRepsStep, QUALITY_TYPES } from './workouts.js';

export const GOALS = {
  runwalk: { name: 'Run/walk to 5K', km: 5, peak: { new: 14, some: 16, experienced: 18 }, longCap: { new: 6, some: 6, experienced: 6 }, taper: [0.8], minWeeks: 8, maxBlock: 16, defaultWeeks: 14, recoveryDays: 3, restAfter: 2 },
  '5k': { name: '5K', km: 5, peak: { new: 25, some: 35, experienced: 50 }, longCap: { new: 10, some: 14, experienced: 16 }, taper: [0.7], minWeeks: 6, maxBlock: 12, defaultWeeks: 10, recoveryDays: 4, restAfter: 1 },
  '10k': { name: '10K', km: 10, peak: { new: 30, some: 42, experienced: 58 }, longCap: { new: 12, some: 16, experienced: 19 }, taper: [0.85, 0.6], minWeeks: 6, maxBlock: 14, defaultWeeks: 12, recoveryDays: 7, restAfter: 2 },
  half: { name: 'Half marathon', km: 21.0975, peak: { new: 35, some: 50, experienced: 68 }, longCap: { new: 18, some: 21, experienced: 24 }, taper: [0.75, 0.5], minWeeks: 8, maxBlock: 18, defaultWeeks: 14, recoveryDays: 10, restAfter: 3 },
  marathon: { name: 'Marathon', km: 42.195, peak: { new: 45, some: 62, experienced: 85 }, longCap: { new: 28, some: 32, experienced: 35 }, taper: [0.8, 0.65, 0.45], minWeeks: 12, maxBlock: 22, defaultWeeks: 18, recoveryDays: 21, restAfter: 5 },
  ultra50: { name: '50K trail', km: 50, peak: { new: 50, some: 70, experienced: 95 }, longCap: { new: 30, some: 35, experienced: 40 }, taper: [0.75, 0.5], minWeeks: 14, maxBlock: 24, defaultWeeks: 20, recoveryDays: 28, restAfter: 7 },
  keepfit: { name: 'Keep fit', noDate: true, km: 5, peak: { new: 15, some: 25, experienced: 40 }, longCap: { new: 8, some: 12, experienced: 18 } },
  faster5k: { name: 'Get faster at 5K', noDate: true, km: 5, peak: { new: 25, some: 35, experienced: 50 }, longCap: { new: 10, some: 13, experienced: 16 } },
  build10k: { name: 'Build to 10K', noDate: true, km: 10, peak: { new: 25, some: 35, experienced: 45 }, longCap: { new: 10, some: 13, experienced: 16 } },
};

export const SAFETY = {
  maxWeeklyIncrease: 0.10, afterCutbackIncrease: 0.05, cutbackEvery: 4, cutbackFactor: 0.8, cutbackMaxShare: 0.9,
  longRunMaxMin: 180, hardShareMax: 0.20, maxHardPerWeek: { new: 1, some: 2, experienced: 2 },
  minRunKm: 2.5, gentleWeeks: 3, maxRunDays: { runwalk: 4, new: 5 }, checkEps: 0.1,
  legsBeforeQualityDays: 2, legsBeforeLongDays: 3, maintenanceDays: 10, raceWeekDays: 7, maxPlanWeeks: 104,
};
export const LEG_TYPES = new Set(['legs', 'lower', 'full']);
const GYM_TYPES = new Set(['upper', 'lower', 'full', 'legs', 'other']);

/** Largest share of the week's training distance that the long run may take. */
export function longShareCap(nRuns) { return nRuns <= 1 ? 1 : nRuns === 2 ? 0.62 : nRuns === 3 ? 0.45 : 0.36; }
function longShareTarget(n) { return n <= 1 ? 1 : n === 2 ? 0.55 : n === 3 ? 0.40 : n === 4 ? 0.32 : n === 5 ? 0.29 : n === 6 ? 0.27 : 0.25; }

const DEFAULT_SCORE = { new: 28, some: 36, experienced: 45 };
const DEFAULT_KM = { new: 0, some: 15, experienced: 35 };
const DEFAULT_DAYS = { 1: [0], 2: [3, 0], 3: [2, 4, 0], 4: [2, 3, 5, 0], 5: [1, 2, 4, 5, 0], 6: [1, 2, 3, 4, 5, 0], 7: [0, 1, 2, 3, 4, 5, 6] };
const monIdx = (d) => (d + 6) % 7;
const cd = (a, b) => { const x = Math.abs(a - b) % 7; return Math.min(x, 7 - x); };

/* ---------- change log (grouped, so a rule that acts every week shows once) ---------- */
export class ChangeLog {
  constructor() { this.items = []; this.map = new Map(); }
  add(rule, change, reason, iso) {
    const key = rule + '|' + change + '|' + reason;
    let e = this.map.get(key);
    if (!e) { e = { rule, change, reason, dates: [] }; this.map.set(key, e); this.items.push(e); }
    if (iso && !e.dates.includes(iso)) e.dates.push(iso);
    return e;
  }
}

/* ---------- options ---------- */
function spreadDays(days, longDay, n) {
  const chosen = [longDay]; const rest = days.filter((d) => d !== longDay).sort((a, b) => monIdx(a) - monIdx(b));
  while (chosen.length < n && rest.length) {
    let best = null, bestScore = -1;
    for (const d of rest) { const s = Math.min(...chosen.map((c) => cd(c, d))); if (s > bestScore) { bestScore = s; best = d; } }
    chosen.push(best); rest.splice(rest.indexOf(best), 1);
  }
  return chosen.sort((a, b) => monIdx(a) - monIdx(b));
}

export function normalizeOpts(opts = {}) {
  const warnings = []; const changes = [];
  const goal = opts.goal || 'half';
  const G = GOALS[goal];
  if (!G) throw new RangeError(`Unknown goal: ${goal}. Use one of: ${Object.keys(GOALS).join(', ')}.`);
  const today = toISO(opts.today || new Date());
  const experience = ['new', 'some', 'experienced'].includes(opts.experience) ? opts.experience : 'some';

  let runDays = Array.isArray(opts.runDays) ? [...new Set(opts.runDays.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
  if (!runDays.length) runDays = [...DEFAULT_DAYS[clamp(Math.round(opts.daysPerWeek || 4), 1, 7)]];
  let longRunDay = Number.isInteger(opts.longRunDay) && opts.longRunDay >= 0 && opts.longRunDay <= 6 ? opts.longRunDay
    : runDays.includes(0) ? 0 : runDays.includes(6) ? 6 : [...runDays].sort((a, b) => monIdx(a) - monIdx(b)).at(-1);
  if (!runDays.includes(longRunDay)) {
    runDays.push(longRunDay);
    changes.push({ rule: 'Long run', change: `${DAY_NAMES_LONG[longRunDay]} is now a run day.`, reason: 'The long-run day must be a run day.' });
  }
  const maxDays = goal === 'runwalk' ? SAFETY.maxRunDays.runwalk : experience === 'new' ? SAFETY.maxRunDays.new : 7;
  if (runDays.length > maxDays) {
    const before = runDays.length;
    runDays = spreadDays(runDays, longRunDay, maxDays);
    changes.push({ rule: 'Run days', change: `${before} run days became ${maxDays}: ${runDays.map((d) => DAY_NAMES_LONG[d]).join(', ')}.`, reason: goal === 'runwalk' ? 'Run/walk plans use at most 4 days a week. Rest days let your body adapt.' : 'New runners run at most 5 days a week. Rest days let your body adapt.' });
  }
  runDays.sort((a, b) => monIdx(a) - monIdx(b));
  if (runDays.length < 2) warnings.push('You chose 1 run day. The plan has 1 run a week and no speed work. 2 or more days work better.');

  const gymByDay = new Map();
  for (const g of Array.isArray(opts.gymDays) ? opts.gymDays : []) {
    const day = Number(g && g.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const type = GYM_TYPES.has(g.type) ? g.type : 'other';
    const intensity = g.intensity === 'heavy' ? 'heavy' : 'light';
    const entry = { day, type, intensity, note: g.note ? String(g.note) : '' };
    const old = gymByDay.get(day);
    if (!old || (entry.intensity === 'heavy' && LEG_TYPES.has(entry.type))) gymByDay.set(day, entry);
  }
  const gymDays = [...gymByDay.values()].sort((a, b) => monIdx(a.day) - monIdx(b.day));
  const usesLift = opts.usesLift != null ? !!opts.usesLift : gymDays.length > 0;

  let currentWeeklyKm = Number(opts.currentWeeklyKm);
  if (!Number.isFinite(currentWeeklyKm) || currentWeeklyKm < 0) {
    currentWeeklyKm = DEFAULT_KM[experience];
    if (opts.currentWeeklyKm != null) warnings.push('The current weekly distance was not valid. The plan uses a default value.');
  }
  currentWeeklyKm = Math.min(currentWeeklyKm, 250);
  // Habits from the run history (all optional). They shape week 1 only.
  const pos = (v, max) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null; };
  const usualLongRunKm = pos(opts.usualLongRunKm, 60);
  const longestRecentKm = pos(opts.longestRecentKm, 100);
  const peakWeekKm = pos(opts.peakWeekKm, 300);
  const rpw = pos(opts.runsPerWeek, 14);
  const runsPerWeek = rpw == null ? null : Math.max(1, Math.round(rpw));

  let score = opts.score; let scoreSource = 'given';
  if (score == null) { score = goal === 'runwalk' ? 25 : DEFAULT_SCORE[experience]; scoreSource = 'default'; warnings.push('No recent result. Paces are estimates. Use effort words, or add a race or time trial.'); }
  else if (!isValidScore(score)) throw new RangeError('Fitness score must be between 15 and 85.');

  let raceIso = opts.raceDate ? toISO(opts.raceDate) : null;
  if (raceIso && G.noDate) { warnings.push(`"${G.name}" has no race date. Add the race to your race list instead.`); raceIso = null; }

  let goalTimeSec = Number.isFinite(opts.goalTimeSec) && opts.goalTimeSec > 0 && !G.noDate ? opts.goalTimeSec : null;
  if (goalTimeSec && fitnessScore(G.km, goalTimeSec) == null) { warnings.push('The goal time is not realistic for this distance. The plan does not use it.'); goalTimeSec = null; }

  const races = [];
  for (const r of Array.isArray(opts.races) ? opts.races : []) {
    if (!r) continue;
    let iso; try { iso = toISO(r.date || r.iso); } catch { warnings.push('A race without a valid date was not added.'); continue; }
    const distKm = Number(r.distKm);
    if (!Number.isFinite(distKm) || distKm <= 0 || distKm > 250) { warnings.push(`Race "${r.name || iso}" has no valid distance. It was not added.`); continue; }
    races.push({ iso, distKm, priority: ['A', 'B', 'C'].includes(r.priority) ? r.priority : 'B', name: r.name ? String(r.name) : `${round(distKm, 1)} km race` });
  }
  races.sort((a, b) => (a.iso < b.iso ? -1 : 1));

  return {
    goal, today, experience, runDays, longRunDay, gymDays, usesLift, currentWeeklyKm, score, scoreSource,
    usualLongRunKm, longestRecentKm, peakWeekKm, runsPerWeek,
    raceIso, raceName: opts.raceName || null, goalTimeSec, races, blocks: clamp(Math.round(opts.blocks || 3), 1, 26),
    startIso: opts.startDate ? toISO(opts.startDate) : null, _warnings: warnings, _changes: changes,
  };
}

/* ---------- weekly pattern ---------- */
function heavyLegDays(gymDays) { return new Set(gymDays.filter((g) => g.intensity === 'heavy' && LEG_TYPES.has(g.type)).map((g) => g.day)); }

function chooseQuality(runDays, L, H) {
  const ok = (d) => d !== L && cd(d, L) >= 2 && !H.has(d) && !H.has((d + 6) % 7) && !H.has((d + 1) % 7);
  const C = runDays.filter(ok);
  let best = null, bestScore = -1;
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) {
    const a = C[i], b = C[j]; if (cd(a, b) < 2) continue;
    const s = Math.min(cd(a, L), cd(b, L), cd(a, b)) * 100 + cd(a, L) + cd(b, L) + cd(a, b);
    if (s > bestScore) { bestScore = s; best = [a, b]; }
  }
  const fwd = (d) => (d - L + 7) % 7;
  if (best) { best.sort((a, b) => cd(b, L) - cd(a, L) || fwd(a) - fwd(b)); return best; }
  const single = [...C].sort((a, b) => cd(b, L) - cd(a, L) || fwd(a) - fwd(b));
  return single.slice(0, 1);
}

function weeklyPattern(o, log, conflicts) {
  const runSet = new Set(o.runDays);
  const H = heavyLegDays(o.gymDays);
  const lightened = new Map(); // weekday -> reason
  const validLong = (d, h) => runSet.has(d) && !h.has(d) && !h.has((d + 6) % 7) && !h.has((d + 5) % 7) && !h.has((d + 1) % 7);
  let L = o.longRunDay;
  if (H.size && !validLong(L, H)) {
    const alts = o.runDays.filter((d) => validLong(d, H)).sort((a, b) => cd(a, o.longRunDay) - cd(b, o.longRunDay) || (b === 6 || b === 0 ? 1 : 0) - (a === 6 || a === 0 ? 1 : 0));
    const legsNames = [...H].map((d) => DAY_NAMES_LONG[d]).join(' and ');
    if (alts.length && o.goal !== 'runwalk') {
      const old = L; L = alts[0];
      conflicts.push({ kind: 'long-run-moved', day: old, reason: `Heavy legs on ${legsNames} is too close to a long run on ${DAY_NAMES_LONG[old]}. Heavy legs must be 72 hours or more before the long run, and not on the day after it.`, suggestion: `The long run moves to ${DAY_NAMES_LONG[L]}. You can also move the legs day, then make the plan again.` });
      log.add('Gym days', `Long run moved from ${DAY_NAMES_LONG[old]} to ${DAY_NAMES_LONG[L]}.`, 'Heavy legs must not be in the 72 hours before the long run or on the day after it.');
    } else if (o.goal !== 'runwalk') {
      for (const h of H) {
        if ([L, (L + 6) % 7, (L + 5) % 7, (L + 1) % 7].includes(h)) {
          const reason = `Heavy legs on ${DAY_NAMES_LONG[h]} is too close to the long run on ${DAY_NAMES_LONG[L]}. No other run day is safe for the long run.`;
          lightened.set(h, reason);
          const good = [2, 3, 4, 1, 5, 6, 0].map((x) => (L + x) % 7).find((x) => ![L, (L + 6) % 7, (L + 5) % 7, (L + 1) % 7].includes(x));
          conflicts.push({ kind: 'gym-light', day: h, reason, suggestion: `Make ${DAY_NAMES_LONG[h]} a light session, or move the heavy legs day to ${DAY_NAMES_LONG[good]}.` });
          log.add('Gym days', `Heavy legs on ${DAY_NAMES_LONG[h]} set to light.`, reason);
        }
      }
    }
  }
  const Heff = new Set([...H].filter((h) => !lightened.has(h)));
  const runwalk = o.goal === 'runwalk';
  const quality = runwalk ? [] : chooseQuality(o.runDays, L, Heff);
  if (!runwalk && Heff.size) {
    const free = chooseQuality(o.runDays, L, new Set());
    if (free.length > quality.length) {
      let best = null;
      if (Heff.size === 1) {
        const others = new Set([...Heff]);
        for (const h of [1, 2, 3, 4, 5, 6, 0]) {
          if (others.has(h) || h === L || [(L + 6) % 7, (L + 5) % 7, (L + 1) % 7].includes(h)) continue;
          const q = chooseQuality(o.runDays, L, new Set([h])).length;
          if (q > quality.length && (!best || q > best.q)) best = { h, q };
        }
      }
      const suggestion = best ? `Move heavy legs to ${DAY_NAMES_LONG[best.h]}. Then ${best.q} quality run${best.q === 1 ? '' : 's'} a week fit.` : 'Put heavy legs on the same day as an easy run, 2 or more days before a quality run.';
      conflicts.push({ kind: 'fewer-quality', day: [...Heff][0], reason: `Your gym days leave room for ${quality.length} quality run${quality.length === 1 ? '' : 's'} a week, not ${free.length}. Heavy legs count as a hard day.`, suggestion });
      log.add('Gym days', `Quality runs a week: ${quality.length}, not ${free.length}.`, 'Heavy legs count as a hard day. Hard days must not touch.');
    }
  }
  return { runSet, runDays: o.runDays, longDay: L, quality, heavy: Heff, lightened };
}

/* ---------- timeline and targets ---------- */
const ROTATION = {
  base: { def: ['hills', 'fartlek'], new: ['fartlek', 'hills'] },
  build: { '5k': ['intervals', 'hills', 'tempo', 'reps'], '10k': ['intervals', 'tempo', 'hills', 'cruise'], half: ['tempo', 'hills', 'cruise', 'intervals'], marathon: ['tempo', 'cruise', 'racepace', 'hills'], ultra50: ['hills', 'tempo', 'cruise'], keepfit: ['fartlek', 'hills', 'tempo'], faster5k: ['intervals', 'reps', 'tempo', 'hills'], build10k: ['fartlek', 'tempo', 'hills', 'cruise'] },
  peak: { '5k': ['intervals', 'racepace', 'reps'], '10k': ['intervals', 'racepace', 'cruise'], half: ['racepace', 'cruise', 'intervals'], marathon: ['racepace', 'cruise', 'tempo'], ultra50: ['hills', 'racepace', 'tempo'] },
  taper: ['racepace', 'cruise'],
};
const PHASE_LABEL = { 'base-block': 'Base block', base: 'Base', build: 'Build', peak: 'Peak', taper: 'Taper', race: 'Race week', recovery: 'Recovery', block: 'Block', runwalk: 'Run/walk' };

function makeTimeline(o, G, warnings, log) {
  let start = o.startIso ? mondayOf(o.startIso) : mondayOnOrAfter(o.today);
  let goalRace = null;
  let raceIso = o.raceIso;
  if (!G.noDate && !raceIso) {
    raceIso = addDays(start, 7 * (G.defaultWeeks - 1) + 6);
    goalRace = { iso: raceIso, distKm: G.km, priority: 'A', name: o.goal === 'runwalk' ? 'Your first 5K' : `Goal day: ${G.name}`, goal: true, virtual: true };
    warnings.push(`No race date. The plan ends with a goal-day run on ${raceIso}.`);
  } else if (raceIso) {
    if (raceIso < o.today) throw new RangeError('The race date is in the past.');
    if (raceIso < start) start = mondayOf(o.today);
    goalRace = { iso: raceIso, distKm: G.km, priority: 'A', name: o.raceName || G.name, goal: true, virtual: false };
  }
  const weeks = [];
  const mk = (idx, kind, extra = {}) => ({ idx, n: idx + 1, startIso: addDays(start, idx * 7), kind, phase: PHASE_LABEL[kind], cutback: false, ...extra });
  if (goalRace) {
    const N = daysBetween(start, mondayOf(goalRace.iso)) / 7 + 1;
    if (N > SAFETY.maxPlanWeeks) throw new RangeError('The race is more than 2 years away. Make the plan when the race is nearer.');
    if (N < (G.minWeeks || 0)) warnings.push(`Only ${N} week${N === 1 ? '' : 's'} to race day. ${G.minWeeks} or more weeks is safer for a ${G.name}. The plan stays careful.`);
    const taperLen = Math.min(G.taper.length, N);
    const buildN = N - taperLen;
    const specific = Math.max(0, (G.maxBlock || 30) - taperLen);
    const baseBlock = N > 30 ? Math.max(0, buildN - specific) : 0;
    if (baseBlock > 0) log.add('Far race', `The first ${baseBlock} weeks are a base block.`, `The race is ${N} weeks away. A base block comes first. The race stays in the plan.`);
    const sN = buildN - baseBlock;
    const peakN = Math.min(3, Math.floor(sN / 3));
    const baseN = Math.round(sN * 0.3);
    for (let i = 0; i < N; i++) {
      let kind;
      if (o.goal === 'runwalk') kind = i >= buildN ? (i === N - 1 ? 'race' : 'taper') : 'runwalk';
      else if (i < baseBlock) kind = 'base-block';
      else if (i < buildN) { const j = i - baseBlock; kind = j < baseN ? 'base' : j < sN - peakN ? 'build' : 'peak'; } else kind = i === N - 1 ? 'race' : 'taper';
      const w = mk(i, kind);
      if (i >= buildN) w.taperFrac = G.taper[G.taper.length - taperLen + (i - buildN)];
      if (i < buildN && i % SAFETY.cutbackEvery === SAFETY.cutbackEvery - 1) w.cutback = true;
      if (kind === 'race') w.raceIso = goalRace.iso;
      weeks.push(w);
    }
    const left = 6 - monIdx(weekdayOf(goalRace.iso));
    const R = Math.ceil(Math.max(0, G.recoveryDays - left) / 7);
    for (let r = 0; r < R; r++) weeks.push(mk(N + r, 'recovery', { recoveryIdx: r + 1, raceIso: goalRace.iso }));
  } else {
    let N = o.blocks * 4;
    const lastRace = o.races.filter((r) => r.iso >= start).at(-1);
    if (lastRace) {
      const need = daysBetween(start, mondayOf(lastRace.iso)) / 7 + 2;
      if (need > N) { N = Math.min(SAFETY.maxPlanWeeks, Math.ceil(need / 4) * 4); log.add('Races', `The plan has ${N} weeks.`, 'It now reaches past your last race.'); }
    }
    for (let i = 0; i < N; i++) {
      const kind = o.goal === 'keepfit' ? 'block' : o.goal === 'build10k' ? (i < 4 ? 'base' : 'block') : (i < 4 ? 'base' : 'build');
      const w = mk(i, kind);
      if (i % 4 === 3) w.cutback = true;
      weeks.push(w);
    }
  }
  const gentleN = o.goal !== 'runwalk' && (o.runDays.length <= 2 || o.experience === 'new') ? SAFETY.gentleWeeks : 0;
  for (const w of weeks) {
    w.isos = Array.from({ length: 7 }, (_, k) => addDays(w.startIso, k));
    w.gentle = w.idx < gentleN;
  }
  return { start, weeks, goalRace, gentleN };
}

function computeTargets(tl, o, G, limits, warnings) {
  const exp = o.experience; const n = o.runDays.length;
  const longCap = G.longCap[exp];
  const capacity = n <= 1 ? longCap : longCap + (n - 1) * longCap * 0.85;
  const peakGoal = G.peak[exp];
  const peakT = Math.min(Math.max(peakGoal, o.currentWeeklyKm), capacity);
  if (capacity < peakGoal * 0.8 && o.goal !== 'runwalk') warnings.push(`With ${n} run day${n === 1 ? '' : 's'}, the plan peaks near ${Math.round(capacity)} km a week, not ${peakGoal} km. More run days allow more distance.`);
  const startT = Math.min(limits.week1MaxKm, peakT);
  const baseCeil = Math.max(peakT * 0.8, Math.min(o.currentWeeklyKm, peakT), startT);
  const keepCeil = o.goal === 'keepfit' ? Math.max(startT, Math.min(peakT, Math.max(o.currentWeeklyKm, peakGoal))) : peakT;
  let lastNormal = null, afterCut = false, peakSoFar = startT;
  const recFrac = [0.4, 0.55, 0.65, 0.7];
  for (const w of tl.weeks) {
    if (w.kind === 'taper' || w.kind === 'race') w.targetKm = w.taperFrac * peakSoFar;
    else if (w.kind === 'recovery') w.targetKm = recFrac[Math.min(w.recoveryIdx - 1, 3)] * peakSoFar;
    else if (w.cutback && lastNormal != null) { w.targetKm = lastNormal * SAFETY.cutbackFactor; afterCut = true; } else {
      const ceil = w.kind === 'base-block' ? baseCeil : o.goal === 'keepfit' ? keepCeil : peakT;
      const t = lastNormal == null ? startT : Math.min(Math.max(ceil, Math.min(lastNormal, ceil)), lastNormal * (1 + (afterCut ? SAFETY.afterCutbackIncrease : SAFETY.maxWeeklyIncrease)));
      w.targetKm = Math.min(t, Math.max(ceil, startT)); afterCut = false; lastNormal = w.targetKm; peakSoFar = Math.max(peakSoFar, w.targetKm);
    }
    w.targetKm = round(w.targetKm, 1);
  }
  if (!G.noDate && o.goal !== 'runwalk' && peakSoFar < peakGoal * 0.8 && capacity >= peakGoal * 0.8) {
    warnings.push(`Your peak week is about ${Math.round(peakSoFar)} km, not ${peakGoal} km. The 10% rule limits growth. This is fine for finishing, and it is safer than a fast build.`);
  }
  return { peakT };
}

/* ---------- week building ---------- */
function racePaceFor(o, G, p) {
  const dist = G.km || 5;
  let pred; try { pred = predict(o.score, dist) / dist; } catch { pred = p.threshold; }
  if (o.goalTimeSec) return Math.max(o.goalTimeSec / dist, pred * 0.97);
  return pred;
}

function qualityTypeFor(w, o, k) {
  let list;
  const kind = w.kind === 'base-block' ? 'base' : w.kind;
  if (kind === 'base') list = o.experience === 'new' ? ROTATION.base.new : ROTATION.base.def;
  else if (kind === 'build' || kind === 'block') list = ROTATION.build[o.goal] || ROTATION.build.keepfit;
  else if (kind === 'peak') list = ROTATION.peak[o.goal] || ROTATION.build[o.goal] || ROTATION.build.keepfit;
  else list = ROTATION.taper;
  if (o.goal === 'keepfit') list = ROTATION.build.keepfit;
  if (o.experience === 'new') list = list.filter((t) => t !== 'reps' && t !== 'intervals').concat(list.length ? [] : ['fartlek']);
  if (!list.length) list = ['fartlek'];
  return list[(w.idx + k) % list.length];
}

function qualityCount(w, o, pattern) {
  if (o.goal === 'runwalk' || w.kind === 'recovery' || w.gentle) return 0;
  const n = o.runDays.length;
  if (n < 2) return 0;
  let q;
  if (w.kind === 'taper') q = 1;
  else if (w.kind === 'base' || w.kind === 'base-block') q = 1;
  else if (o.goal === 'keepfit' || o.goal === 'build10k') q = 1;
  else q = n <= 3 ? 1 : SAFETY.maxHardPerWeek[o.experience];
  if (w.cutback) q = Math.min(q, 1);
  if (w.idx === 0) q = Math.min(q, 1);
  return Math.min(q, SAFETY.maxHardPerWeek[o.experience], pattern.quality.length);
}

function longCapKm(o, G, p) { return Math.min(G.longCap[o.experience], (SAFETY.longRunMaxMin * 60) / p.long); }

/** Distance of a new run day in week 1: about 25 minutes at easy pace, 3 to 5 km. */
export function newRunKmFor(p) { return clamp(Math.floor(((25 * 60) / p.easy) * 10) / 10, 3, 5); }

/** The week 1 limit. The safety check uses this function with the values in plan.settings.
    - base: the current weekly distance + 10% (or the starter floor of 3 km a run day, at most 9 km,
      when the current distance is near zero).
    - new run days: when the plan has more run days than the runner's recent runs a week, the limit
      can also be the current distance + one short easy run for each new day. This part is never more
      than the current distance + 25% and never more than the recent peak week. */
export function week1Limit({ currentWeeklyKm, nRunDays, runsPerWeek = null, peakWeekKm = null, newRunKm = 3 }) {
  const C = currentWeeklyKm || 0;
  const floorKm = Math.min(nRunDays, 3) * 3;
  const starter = C * 1.1 < floorKm;
  const baseKm = round(Math.max(C * 1.1, floorKm), 1);
  const extraDays = !starter && runsPerWeek >= 1 ? Math.max(0, nRunDays - runsPerWeek) : 0;
  const addOnKm = extraDays ? round(Math.min(C + extraDays * newRunKm, C * 1.25, peakWeekKm > 0 ? peakWeekKm : Infinity), 1) : 0;
  const maxKm = round(Math.max(baseKm, addOnKm), 1);
  return { maxKm, baseKm, floorKm, starter, extraDays, newRunKm, addOnKm, rule: maxKm > baseKm ? 'newDays' : starter ? 'floor' : 'base' };
}

/* The usual long run, inside the safety caps: 3 hours or less, 32 km or less, the goal cap,
   the longest recent run + 10% and the current weekly distance. */
function longFloorKm(o, G, p) {
  if (!o.usualLongRunKm) return 0;
  let f = Math.min(o.usualLongRunKm, longCapKm(o, G, p), 32, o.currentWeeklyKm);
  if (o.longestRecentKm) f = Math.min(f, o.longestRecentKm * 1.1);
  return Math.floor(f * 10) / 10;
}

function buildRunWeek(w, T, o, G, pattern, ctx, log) {
  const days = new Map();
  const isos = w.isos;
  const pre = (iso) => iso < o.today;
  let runIsos = isos.filter((iso) => pattern.runSet.has(weekdayOf(iso)) && !pre(iso));
  const longIso = runIsos.find((iso) => weekdayOf(iso) === pattern.longDay) || null;
  // Week 1 with more run days than the runner's recent runs a week: the new days start as short
  // easy runs. The future quality days come first, then the days just before the long run.
  const w1 = w.idx === 0 && o._w1 && o._w1.extraDays > 0 ? o._w1 : null;
  let newIsos = [];
  if (w1) {
    const qRank = (iso) => { const k = pattern.quality.indexOf(weekdayOf(iso)); return k < 0 ? 9 : k; };
    const toLong = (iso) => (pattern.longDay - weekdayOf(iso) + 7) % 7;
    newIsos = runIsos.filter((iso) => iso !== longIso).sort((a, b) => qRank(a) - qRank(b) || toLong(a) - toLong(b)).slice(0, w1.extraDays);
  }
  const qN = newIsos.length ? 0 : qualityCount(w, o, pattern);
  const qIsos = pattern.quality.slice(0, qN).map((d) => runIsos.find((iso) => weekdayOf(iso) === d)).filter(Boolean);
  // fewer runs when the week is small
  const maxRuns = Math.max(1, Math.floor(T / SAFETY.minRunKm));
  const dropOrder = () => runIsos.filter((iso) => iso !== longIso && !qIsos.includes(iso)).sort((a, b) => dropScore(b) - dropScore(a));
  const dropScore = (iso) => { const prev = addDays(iso, -1), next = addDays(iso, 1); return (prev === longIso || qIsos.includes(prev) ? 2 : 0) + (next === longIso || qIsos.includes(next) ? 1 : 0); };
  while (runIsos.length > maxRuns) {
    const cand = dropOrder(); if (!cand.length) break;
    runIsos = runIsos.filter((x) => x !== cand[0]);
    log.add('Low distance', 'Fewer runs this week.', `Each run must be ${SAFETY.minRunKm} km or more. Fewer, longer runs suit a small weekly distance.`, cand[0]);
  }
  const p = ctx.p;
  const history = w.idx === 0 && (o.usualLongRunKm || o.runsPerWeek);
  let longKm = 0; let workouts = [];
  const build = () => {
    workouts = [];
    const n = runIsos.length;
    const share = ['half', 'marathon', 'ultra50'].includes(o.goal) && n > 1 ? Math.max(longShareTarget(n), longShareCap(n) * 0.94) : longShareTarget(n);
    const capKm = longCapKm(o, G, p);
    longKm = longIso && runIsos.includes(longIso) ? Math.min(T * share, capKm) : 0;
    // Week 1 long run: not more than the longest recent run + 10%, and not less than the usual long run.
    let longTop = capKm;
    if (longKm && history && o.longestRecentKm) longTop = Math.min(capKm, Math.max(o.longestRecentKm * 1.1, longFloorKm(o, G, p)));
    if (longKm) longKm = Math.min(longKm, longTop);
    if (longKm && !w.cutback && o.usualLongRunKm) longKm = Math.max(longKm, Math.min(longFloorKm(o, G, p), n > 1 ? longShareCap(n) * T * 0.98 : Infinity));
    longKm = round(longKm, 1);
    let qKm = 0; const qW = [];
    qIsos.filter((x) => runIsos.includes(x)).forEach((iso, k) => {
      let type = qualityTypeFor(w, o, k);
      if (w.kind === 'peak' && o.goal === 'marathon' && k === 0 && w.idx % 2 === 1) type = 'racepace';
      const budgetKm = clamp(T * 0.16, 0, Math.min(14, longKm ? longKm * 0.8 : T * 0.35));
      let budgetMin = (budgetKm * p.easy) / 60;
      if (w.kind === 'taper') budgetMin = Math.min(budgetMin, 40);
      if (budgetMin < qualityMinMinutes(type)) type = ['fartlek', 'hills'].find((t) => qualityMinMinutes(t) <= budgetMin) || null;
      if (!type) return;
      const wk = makeWorkout(iso, { type, budgetMin }, ctx);
      if (wk.intensity !== 'hard') return;
      qW.push(wk); qKm += wk.km;
    });
    const qDone = new Set(qW.map((x) => x.iso));
    const fresh = newIsos.filter((iso) => runIsos.includes(iso) && !qDone.has(iso));
    const easyIsos = runIsos.filter((iso) => iso !== longIso && !qDone.has(iso) && !fresh.includes(iso));
    const nE = easyIsos.length;
    // The runner's usual runs keep their distance. The new days get the rest: 2.5 km to about 5 km each.
    const lo = fresh.length ? Math.floor(Math.min(w1.newRunKm, Math.max(SAFETY.minRunKm, (T - Math.min(o.currentWeeklyKm, T)) / fresh.length)) * 10) / 10 : 0;
    let newKm = longKm ? Math.min(lo, Math.floor(longKm * 9.5) / 10) : lo;
    if (history && longKm && !w.cutback) {
      // Week 1 from the run history. The long run must stay the longest run and a safe share of the
      // real week. The easy runs must not pass it. The long run takes more of the week, inside its caps,
      // so the week keeps its distance. Longer new runs (up to about 5 km) are used only when the share
      // rule would otherwise cut the week.
      const capS = n > 1 ? longShareCap(n) : 1;
      const solve = (nk) => {
        const fixed = qKm + nk * fresh.length;
        let L = longKm;
        const want = nE ? (T - fixed) / (1 + 0.95 * nE) : T - fixed;
        if (want > L) L = Math.min(want, longTop);
        let e = 0;
        for (let i = 0; i < 30; i++) {
          e = nE ? Math.max(0, Math.min((T - L - fixed) / nE, 0.95 * L)) : 0;
          const maxL = capS < 1 ? (capS / (1 - capS)) * (fixed + nE * e) * 0.99 : Infinity;
          if (L <= maxL + 1e-9) break;
          L = maxL;
        }
        L = Math.floor(L * 10) / 10;
        e = nE ? Math.floor(Math.max(0, Math.min((T - L - fixed) / nE, 0.95 * L)) * 10) / 10 : 0;
        return { nk, L, total: L + fixed + nE * e, ok: nk <= 0.95 * L + 1e-9 || nk === newKm };
      };
      let best = solve(newKm);
      for (let nk = lo + 0.1; fresh.length && nk <= w1.newRunKm + 1e-9; nk = round(nk + 0.1, 1)) {
        const c = solve(round(nk, 1));
        if (c.ok && c.total > best.total + 0.05) best = c;
      }
      longKm = best.L; newKm = best.nk;
    }
    const fixedKm = qKm + newKm * fresh.length;
    let E = easyIsos.length ? (T - longKm - fixedKm) / easyIsos.length : 0;
    if (longKm) E = Math.min(E, longKm * 0.95);
    return { qW, easyIsos, E, fresh, newKm };
  };
  let r = build();
  while (r.easyIsos.length && r.E < SAFETY.minRunKm) {
    const cand = r.easyIsos.slice().sort((a, b) => dropScore(b) - dropScore(a));
    runIsos = runIsos.filter((x) => x !== cand[0]);
    log.add('Low distance', 'Fewer runs this week.', `Each run must be ${SAFETY.minRunKm} km or more. Fewer, longer runs suit a small weekly distance.`, cand[0]);
    r = build();
  }
  for (const q of r.qW) days.set(q.iso, q);
  for (const iso of r.fresh) days.set(iso, makeWorkout(iso, { type: 'easy', km: r.newKm, why: 'A new run day. It starts as a short easy run.' }, ctx));
  if (w1) w1.newIsos = r.fresh.slice();
  if (longKm) {
    const finish = (w.kind === 'build' || w.kind === 'peak') && (o.goal === 'half' || o.goal === 'marathon') && !w.cutback && o.experience !== 'new' && w.idx % 2 === 0;
    days.set(longIso, makeWorkout(longIso, { type: finish ? 'longfinish' : 'long', km: longKm }, ctx));
  }
  const stridesOk = !w.cutback && w.kind !== 'taper' && !(w.gentle && w.idx === 0) && r.E >= 4;
  let stridesDone = false;
  for (const iso of r.easyIsos) {
    const km = Math.floor(r.E * 10) / 10;
    const strides = stridesOk && !stridesDone && addDays(iso, 1) !== longIso;
    if (strides) stridesDone = true;
    days.set(iso, makeWorkout(iso, { type: strides ? 'strides' : 'easy', km }, ctx));
  }
  return isos.map((iso) => days.get(iso) || makeWorkout(iso, { type: 'rest', note: pre(iso) ? 'Before your plan starts.' : undefined }, ctx));
}

function buildRaceWeek(w, T, o, G, pattern, ctx, race, rwLevel) {
  const r = race.iso; const days = [];
  const runwalk = o.goal === 'runwalk';
  const restAfter = G.restAfter || 2;
  const pre = (iso) => iso < o.today;
  const isRunDay = (iso) => pattern.runSet.has(weekdayOf(iso));
  const qDay = pattern.quality[0];
  const easyIsos = []; let fixedKm = 0;
  for (const iso of w.isos) {
    const k = daysBetween(iso, r);
    if (pre(iso)) { days.push(makeWorkout(iso, { type: 'rest', note: 'Before your plan starts.' }, ctx)); continue; }
    if (k === 0) { days.push(makeWorkout(iso, { type: 'race', distKm: race.distKm, name: race.name, priority: 'A', goal: true, runWalkLevel: runwalk && rwLevel < 8 ? rwLevel : 0 }, ctx)); continue; }
    if (k < 0) {
      const j = -k;
      if (j > restAfter && isRunDay(iso)) { const wk = runwalk ? makeWorkout(iso, { type: 'runwalk', level: rwLevel, mainMin: 15, walkMin: 5 }, ctx) : makeWorkout(iso, { type: 'recovery', km: clamp(T * 0.15, SAFETY.minRunKm, 5) }, ctx); fixedKm += wk.km; days.push(wk); } else days.push(makeWorkout(iso, { type: 'rest', why: 'Recovery after the race.' }, ctx));
      continue;
    }
    if (k === 1) {
      if (!runwalk && isRunDay(iso) && o.experience !== 'new') { const wk = makeWorkout(iso, { type: 'shakeout', min: 15 }, ctx); fixedKm += wk.km; days.push(wk); } else days.push(makeWorkout(iso, { type: 'rest', why: 'Rest before the race.' }, ctx));
      continue;
    }
    if (k === 2 && (G.km >= 21 || o.experience === 'new' || runwalk)) { days.push(makeWorkout(iso, { type: 'rest', why: 'Rest before the race.' }, ctx)); continue; }
    if (!isRunDay(iso)) { days.push(makeWorkout(iso, { type: 'rest' }, ctx)); continue; }
    if (runwalk) { const wk = makeWorkout(iso, { type: 'runwalk', level: rwLevel, mainMin: 15, walkMin: 5 }, ctx); fixedKm += wk.km; days.push(wk); continue; }
    if (k >= 3 && weekdayOf(iso) === qDay && o.experience !== 'new' && o.runDays.length >= 2) {
      const wk = makeWorkout(iso, { type: 'sharpener', budgetMin: 30 }, ctx); fixedKm += wk.km; days.push(wk); continue;
    }
    easyIsos.push(iso); days.push(null);
  }
  let left = easyIsos.slice();
  let E = left.length ? (T - fixedKm) / left.length : 0;
  while (left.length && E < SAFETY.minRunKm) { left.pop(); E = left.length ? (T - fixedKm) / left.length : 0; }
  return days.map((d, i) => d || (left.includes(w.isos[i]) ? makeWorkout(w.isos[i], { type: 'easy', km: Math.floor(Math.min(E, G.longCap[o.experience] * 0.5, 10) * 10) / 10 }, ctx) : makeWorkout(w.isos[i], { type: 'rest', why: 'Taper: less running this week.' }, ctx)));
}

function buildRecoveryWeek(w, T, o, G, pattern, ctx, rwLevel) {
  const restAfter = G.restAfter || 2;
  const runIsos = w.isos.filter((iso) => pattern.runSet.has(weekdayOf(iso)) && daysBetween(w.raceIso, iso) > restAfter);
  let n = runIsos.length; while (n > 0 && T / n < SAFETY.minRunKm) n--;
  const use = runIsos.slice(0, n);
  return w.isos.map((iso) => {
    if (!use.includes(iso)) return makeWorkout(iso, { type: 'rest', why: daysBetween(w.raceIso, iso) <= restAfter ? 'Recovery after the race.' : '' }, ctx);
    if (o.goal === 'runwalk') return makeWorkout(iso, { type: 'runwalk', level: rwLevel, mainMin: 15, walkMin: 5 }, ctx);
    return makeWorkout(iso, { type: w.recoveryIdx === 1 ? 'recovery' : 'easy', km: Math.floor(Math.min(T / n, w.recoveryIdx === 1 ? 6 : 10) * 10) / 10, why: 'Recovery block after your race. Easy runs only.' }, ctx);
  });
}

/* Run/walk weeks are built in order, so each week keeps the 10% rule against the last one.
   Each week the sessions step up: one more rep, or the next ladder level (one session first). */
function runWalkWeek(w, o, pattern, ctx, state, cap) {
  const runIsos = w.isos.filter((iso) => pattern.runSet.has(weekdayOf(iso)) && iso >= o.today);
  const info = (l) => runWalk(l);
  const cycle = (l) => info(l).run + info(l).walk;
  const runSec = (x) => (info(x.level).continuous ? info(x.level).run : x.reps * info(x.level).run + (x.extraSec || 0));
  const mainSec = (x) => (info(x.level).continuous ? info(x.level).run : x.reps * cycle(x.level) + (x.extraSec || 0));
  const mk = (sess, walkMin = 5) => w.isos.map((iso) => {
    const k = runIsos.indexOf(iso);
    return k >= 0 && sess[k] ? makeWorkout(iso, { type: 'runwalk', level: sess[k].level, reps: sess[k].reps, extraSec: sess[k].extraSec || 0, walkMin }, ctx) : makeWorkout(iso, { type: 'rest' }, ctx);
  });
  const km = (days) => sum(days, (d) => d.km);
  const fits = (sess, walkMin) => km(mk(sess, walkMin)) <= cap + 1e-9;
  const n = runIsos.length;
  const first = (l) => (info(l).continuous ? { level: l } : { level: l, reps: Math.max(1, Math.round(1200 / cycle(l))), extraSec: 0 });
  let sess = state.sessions ? Array.from({ length: n }, (_, i) => ({ ...(state.sessions[i] || state.sessions[state.sessions.length - 1]) })) : Array.from({ length: n }, () => first(state.level));
  const M = clamp(20 + w.idx, 20, 30) * 60;
  const normal = w.kind === 'runwalk' && !w.cutback;
  const stepOptions = (cur, top) => {
    const opts = []; const L = cur.level + 1;
    if (cur.level < RUN_WALK_TOP && cur.level <= top) {
      if (info(L).continuous) { if (info(cur.level).continuous || runSec(cur) >= 1080) opts.push({ level: L }); } else {
        const keep = Math.max(1, Math.floor(mainSec(cur) / cycle(L)));
        const rest = Math.max(0, Math.min(info(L).run - 60, Math.round((mainSec(cur) - keep * cycle(L)) / 60) * 60));
        opts.push({ level: L, reps: keep, extraSec: rest });
        if (keep > 1) opts.push({ level: L, reps: keep - 1, extraSec: 0 });
      }
    }
    if (!info(cur.level).continuous && mainSec(cur) + 60 <= M) {
      const extra = (cur.extraSec || 0) + 120;
      opts.push(extra >= info(cur.level).run ? { level: cur.level, reps: cur.reps + 1, extraSec: 0 } : { level: cur.level, reps: cur.reps, extraSec: extra });
    }
    return opts;
  };
  const wm = state.walkMin || 5;
  if (normal && w.idx > 0) {
    const touched = new Set();
    for (let guard = 0; guard < 4 * n; guard++) {
      const top = Math.max(...sess.map((x) => x.level));
      let applied = false;
      const order = sess.map((x, i) => i).sort((a, b) => sess[a].level - sess[b].level || runSec(sess[a]) - runSec(sess[b]));
      for (const i of order) {
        if (touched.has(i)) continue;
        for (const op of stepOptions(sess[i], top)) {
          const trial = sess.map((x, j) => (j === i ? op : x));
          if (fits(trial, wm)) { sess = trial; touched.add(i); applied = true; break; }
        }
        if (applied) break;
      }
      if (!applied) break;
    }
  } else if (!normal) {
    const f = w.cutback ? 0.8 : 0.75;
    sess = sess.map((x) => (info(x.level).continuous ? { ...x } : { level: x.level, reps: Math.max(1, Math.floor(x.reps * f)), extraSec: 0 }));
  }
  for (const walkMin of [5, 3, 2].filter((x) => x <= Math.max(wm + 1, normal ? wm : 5) || x === 2)) if (fits(sess, walkMin)) return { days: mk(sess, walkMin), sessions: sess, walkMin };
  const trial = sess.map((x) => ({ ...x }));
  for (let guard = 0; guard < 80; guard++) {
    if (fits(trial, 2)) return { days: mk(trial, 2), sessions: normal ? trial.filter(Boolean) : state.sessions || sess, walkMin: 2 };
    const big = trial.map((x, i) => i).filter((i) => trial[i] && !info(trial[i].level).continuous && (trial[i].extraSec > 0 || trial[i].reps > 1)).sort((a, b) => mainSec(trial[b]) - mainSec(trial[a]))[0];
    if (big != null) { const x = trial[big]; trial[big] = x.extraSec > 0 ? { ...x, extraSec: 0 } : { ...x, reps: x.reps - 1 }; continue; }
    const live = trial.map((x, i) => i).filter((i) => trial[i]).sort((a, b) => trial[a].level - trial[b].level || runSec(trial[a]) - runSec(trial[b]));
    if (live.length > 1) { trial[live[0]] = null; continue; }
    break;
  }
  return { days: mk(trial, 2), sessions: normal ? trial.filter(Boolean) : state.sessions || sess, walkMin: 2 };
}

/* ---------- other races ---------- */
export function recoveryDaysFor(distKm) { return distKm <= 5 ? 2 : distKm <= 10 ? 3 : distKm <= 21.1 ? 5 : distKm <= 42.2 ? 10 : 14; }

function overlayRaces(plan, o, ctxFor, log, warnings) {
  for (const race of plan.races) {
    if (race.goal) continue;
    overlayRace(plan, race, o, ctxFor, log, warnings);
  }
}

/** Puts one non-goal race into the plan with its taper and easy days. o: {today, experience}. */
export function overlayRace(plan, race, o, ctxFor, log, warnings = []) {
  const all = allDays(plan);
  const byIso = new Map(all.map((d) => [d.iso, d]));
  const weekIdxOf = (iso) => plan.weeks.findIndex((wk) => iso >= wk.startIso && iso <= addDays(wk.startIso, 6));
  const set = (iso, spec, reason) => {
    const wi = weekIdxOf(iso); if (wi < 0) return null;
    const di = plan.weeks[wi].days.findIndex((d) => d.iso === iso);
    const old = plan.weeks[wi].days[di];
    if (old.type === 'race' && spec.type !== 'race') return old;
    const nw = makeWorkout(iso, spec, ctxFor(wi));
    if (reason) { nw.adjusted = reason; log.add('Races', `${old.title} became ${nw.title}.`, reason, iso); }
    plan.weeks[wi].days[di] = nw; byIso.set(iso, nw); return nw;
  };
  {
    const wi = weekIdxOf(race.iso);
    if (wi < 0 || race.iso < o.today) { race.inPlan = false; warnings.push(`"${race.name}" on ${race.iso} is outside this plan. Make a new plan after your goal race to include it.`); return; }
    const cur = byIso.get(race.iso);
    if (cur && cur.type === 'race') { race.inPlan = true; if (!(cur.race && cur.race.name === race.name)) warnings.push(`"${race.name}" is on the same day as another race.`); return; }
    race.inPlan = true;
    set(race.iso, { type: 'race', distKm: race.distKm, name: race.name, priority: race.priority }, null);
    log.add('Races', `${race.priority} race "${race.name}" added.`, race.priority === 'A' ? 'A race: 7 to 10 easier days before it and a recovery block after it.' : race.priority === 'B' ? 'B race: a 3-day mini taper before it and easy days after it.' : 'C race: it replaces a quality session this week.', race.iso);
    const easyOf = (d, f, why) => set(d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.floor(d.km * f * 10) / 10) }, why);
    if (race.priority === 'C') {
      const wk = plan.weeks[wi];
      const q = wk.days.filter((d) => d.intensity === 'hard').sort((a, b) => Math.abs(daysBetween(a.iso, race.iso)) - Math.abs(daysBetween(b.iso, race.iso)))[0];
      if (q) easyOf(q, 1, 'A C race replaces one quality session this week.');
    } else {
      const before = race.priority === 'A' ? (race.distKm >= 21 ? 10 : 7) : 3;
      const after = race.priority === 'A' ? recoveryDaysFor(race.distKm) : race.distKm <= 10 ? 2 : race.distKm <= 21.1 ? 3 : 4;
      const label = race.priority === 'A' ? 'Taper before your A race.' : 'Mini taper before your B race.';
      for (let k = 1; k <= before; k++) {
        const d = byIso.get(addDays(race.iso, -k)); if (!d || !isRun(d) || d.type === 'race') continue;
        if (d.intensity === 'hard' || d.intensity === 'long') easyOf(d, k <= 2 ? 0.6 : 0.75, label);
        else if (d.km > SAFETY.minRunKm && k <= 3) easyOf(d, 0.75, label);
      }
      for (let k = 1; k <= after; k++) {
        const d = byIso.get(addDays(race.iso, k)); if (!d || d.type === 'race') continue;
        const why = race.priority === 'A' ? 'Recovery after your A race.' : 'Easy days after your B race.';
        if (k === 1 && race.distKm >= 21 && isRun(d)) set(d.iso, { type: 'rest', why }, why);
        else if (d.intensity === 'hard' || d.intensity === 'long') set(d.iso, { type: 'recovery', km: Math.max(SAFETY.minRunKm, Math.floor(Math.min(d.km, 6) * 6) / 10) }, why);
      }
    }
    // a race replaces the time trial of that week
    for (const d of plan.weeks[wi].days.filter((x) => x.type === 'timetrial')) set(d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.floor(Math.min(d.km, 8) * 10) / 10) }, 'The race replaces the time trial this week.');
    // keep the hard count per week: races count as hard sessions
    const wk = plan.weeks[wi];
    const maxHard = SAFETY.maxHardPerWeek[o.experience];
    let hard = wk.days.filter((d) => d.intensity === 'hard' || d.intensity === 'race').length;
    for (const d of wk.days.filter((x) => x.intensity === 'hard')) {
      if (hard <= maxHard) break;
      easyOf(d, 1, 'Races count as hard sessions. The week keeps its limit of hard sessions.'); hard--;
    }
  }
}

/* ---------- gym days and advice ---------- */
const ADVICE_RANK = { normal: 0, maintenance: 1, 'skip-heavy': 2 };
function attachGym(plan, o, pattern) {
  const byDay = new Map(o.gymDays.map((g) => [g.day, g]));
  const races = plan.races.filter((r) => r.inPlan !== false);
  for (const wk of plan.weeks) for (const d of wk.days) {
    const g = byDay.get(d.dow);
    if (!g || d.iso < o.today) { d.gym = null; continue; }
    const gym = { day: g.day, type: g.type, intensity: g.intensity, note: g.note, heavyLegs: g.intensity === 'heavy' && LEG_TYPES.has(g.type), advice: 'normal', reason: 'Lift as planned.' };
    const raise = (advice, reason) => { if (ADVICE_RANK[advice] > ADVICE_RANK[gym.advice]) { gym.advice = advice; gym.reason = reason; } };
    if (pattern.lightened.has(g.day) && gym.heavyLegs) raise('skip-heavy', pattern.lightened.get(g.day) + ' Do a light session today.');
    for (const r of races) {
      const k = daysBetween(d.iso, r.iso); // days before the race
      if (r.priority === 'A') {
        if (k >= 0 && k < SAFETY.raceWeekDays) raise(g.intensity === 'heavy' ? 'skip-heavy' : 'maintenance', g.intensity === 'heavy' ? 'Race week: no heavy lifting.' : 'Race week: keep it light and short.');
        else if (k >= SAFETY.raceWeekDays && k <= SAFETY.maintenanceDays && g.intensity === 'heavy') raise('maintenance', 'Last 10 days before an A race: maintenance only. Keep the weight, do half the sets, stop 3 or more reps before failure.');
        else if (k < 0 && -k <= 2 && gym.heavyLegs) raise('skip-heavy', 'Recovery after the race: no heavy legs.');
        else if (k < 0 && -k <= recoveryDaysFor(r.distKm) && g.intensity === 'heavy') raise('maintenance', 'Recovery after the race: light lifting only.');
      } else {
        if (k === 0 && g.intensity === 'heavy') raise('skip-heavy', 'Race day: no heavy lifting.');
        else if (k > 0 && k < SAFETY.legsBeforeLongDays && gym.heavyLegs) raise('skip-heavy', 'No heavy legs in the 72 hours before a race.');
        else if (k < 0 && -k <= 2 && gym.heavyLegs) raise('skip-heavy', 'Recovery after the race: no heavy legs.');
      }
    }
    d.gym = gym;
  }
}
export const isHeavyLegsDay = (d) => !!(d && d.gym && d.gym.heavyLegs && d.gym.advice !== 'skip-heavy');
export const isHardDay = (d) => isHardRun(d) || isHeavyLegsDay(d);

function setGymLight(d, reason, log) {
  if (!d.gym || d.gym.advice === 'skip-heavy') return;
  d.gym.advice = 'skip-heavy'; d.gym.reason = reason;
  log.add('Gym days', 'Heavy legs set to light.', reason, d.iso);
}

export function fixSpacing(plan, ctxFor, log, warnings) {
  const flat = []; plan.weeks.forEach((wk, wi) => wk.days.forEach((d, di) => flat.push({ wi, di })));
  const get = (i) => plan.weeks[flat[i].wi].days[flat[i].di];
  const downgrade = (i, reason) => {
    const d = get(i); const { wi, di } = flat[i];
    const nw = makeWorkout(d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.floor((d.intensity === 'long' ? d.km * 0.6 : d.km) * 10) / 10) }, ctxFor(wi));
    nw.gym = d.gym; nw.adjusted = reason; plan.weeks[wi].days[di] = nw;
    log.add('Hard days', `${d.title} became ${nw.title}.`, reason, d.iso);
  };
  const rank = (d) => (d.type === 'race' ? 3 : d.type === 'timetrial' ? 2.5 : d.intensity === 'long' ? 2 : d.intensity === 'hard' ? 1 : 0);
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let i = 0; i < flat.length; i++) {
      const a = get(i);
      // same day: heavy legs with a hard run
      if (isHeavyLegsDay(a) && isHardRun(a)) {
        if (a.intensity === 'hard') downgrade(i, 'Heavy legs on the same day. No quality run within 48 hours after heavy legs.');
        else setGymLight(a, a.intensity === 'race' ? 'Race today. No heavy lifting.' : 'Long run today. No heavy legs on a long-run day.', log);
        changed = true;
      }
      if (i + 1 < flat.length) {
        const b = get(i + 1);
        if (isHardDay(a) && isHardDay(b)) {
          const ra = isHardRun(a) ? rank(a) : -1, rb = isHardRun(b) ? rank(b) : -1;
          if (ra === 3 && rb === 3) {
            if (!a._pairWarned) { warnings.push(`Two races on ${a.iso} and ${b.iso} touch. The engine never drops a race. Run one of them easy.`); a._pairWarned = true; }
          } else if (ra === -1 || rb === -1) {
            // one side is a gym day
            const run = ra === -1 ? b : a; const gymDay = ra === -1 ? a : b; const ri = ra === -1 ? i + 1 : i;
            if (run.intensity === 'hard' && !(isHardRun(gymDay))) downgrade(ri, 'Heavy legs on the day next to it. Hard days must not touch.');
            else setGymLight(gymDay, run.intensity === 'race' ? 'A race is on the next day or the day before. No heavy legs.' : 'The long run is on the next day or the day before. No heavy legs.', log);
            changed = true;
          } else {
            const li = ra <= rb ? i : i + 1; const low = get(li);
            downgrade(li, low.intensity === 'long' ? 'It touches a race. Hard days must not touch.' : (get(li === i ? i + 1 : i).intensity === 'long' ? 'It touches the long run. No hard day next to the long run.' : 'It touches another hard day. Hard days must not touch.'));
            changed = true;
          }
        }
      }
      // 72 hours before a long run or a race
      if (isHeavyLegsDay(a) && i + 2 < flat.length) {
        const c = get(i + 2);
        if (c.intensity === 'long' || c.intensity === 'race') { setGymLight(a, `The ${c.intensity === 'race' ? 'race' : 'long run'} is 2 days later. No heavy legs in the 72 hours before it.`, log); changed = true; }
      }
    }
    if (!changed) break;
  }
}

/* ---------- per-week enforcement ---------- */
const EASY_TYPES = new Set(['easy', 'strides', 'recovery']);
export function trainingKm(wk) { return round(sum(wk.days.filter((d) => isRun(d) && d.intensity !== 'race'), (d) => d.km), 1); }
export function weekKm(wk) { return round(sum(wk.days.filter(isRun), (d) => d.km), 1); }

function replaceIn(wk, d, spec, ctx, reason, log, rule) {
  const i = wk.days.indexOf(d);
  const nw = makeWorkout(d.iso, spec, ctx);
  nw.gym = d.gym; nw.extra = d.extra; if (d.adjusted) nw.adjusted = d.adjusted;
  if (reason) { nw.adjusted = reason; if (log) log.add(rule || 'Volume', `${d.title} changed.`, reason, d.iso); }
  wk.days[i] = nw; return nw;
}

function shrinkWeek(wk, cap, measure, ctx, log, reason) {
  const val = () => (measure === 'training' ? trainingKm(wk) : weekKm(wk));
  for (let guard = 0; guard < 80 && val() > cap + 1e-9; guard++) {
    const excess = val() - cap;
    const runs = wk.days.filter(isRun);
    const long = runs.find((d) => d.intensity === 'long');
    const easies = runs.filter((d) => EASY_TYPES.has(d.type));
    // The long run shrinks with the easy runs, by the same share. When only
    // the easy runs shrink, the long run becomes too large a part of the
    // week, the long-run rule cuts it, and the week ends far below its cap.
    // The next week then grows from that low week, so the plan falls away.
    const pool = long && (long.type === 'long' || long.type === 'longfinish') ? [...easies, long] : easies;
    const reducible = sum(pool, (d) => Math.max(0, d.km - SAFETY.minRunKm));
    if (reducible > 0.1) {
      const f = Math.min(1, (excess + 0.05) / reducible);
      for (const d of pool) {
        const nk = Math.max(SAFETY.minRunKm, Math.floor((d.km - (d.km - SAFETY.minRunKm) * f) * 10) / 10);
        if (nk < d.km) { const nw = replaceIn(wk, d, { ...d.spec, km: nk }, ctx, reason, log); if (nw.km >= d.km) replaceIn(wk, nw, { type: d === long ? 'long' : 'easy', km: nk }, ctx, reason, log); }
      }
      continue;
    }
    const rws = runs.filter((d) => d.type === 'runwalk');
    const rwBig = rws.filter((d) => !d.runWalk.continuous && d.runWalk.reps > 1).sort((a, b) => b.runWalk.reps - a.runWalk.reps)[0];
    if (rwBig) { replaceIn(wk, rwBig, { ...rwBig.spec, reps: rwBig.runWalk.reps - 1 }, ctx, reason, log); continue; }
    const rwWalk = rws.find((d) => (d.spec.walkMin == null ? 5 : d.spec.walkMin) > 2);
    if (rwWalk) { replaceIn(wk, rwWalk, { ...rwWalk.spec, walkMin: 2 }, ctx, reason, log); continue; }
    const drop = [...easies, ...rws].sort((a, b) => a.km - b.km)[0];
    if (drop && runs.length > 1) { replaceIn(wk, drop, { type: 'rest' }, ctx, reason || 'Fewer runs keep the week inside the safe limit.', log); continue; }
    const others = runs.filter((d) => d !== long && d.intensity !== 'race');
    if (long && long.km > SAFETY.minRunKm) {
      const maxOther = others.reduce((m, d) => Math.max(m, d.km), 0);
      const nk = Math.max(SAFETY.minRunKm, Math.floor(Math.max(long.km - excess - 0.05, Math.min(maxOther, long.km - 0.1)) * 10) / 10);
      if (nk < long.km) { replaceIn(wk, long, { type: 'long', km: nk }, ctx, reason, log); continue; }
    }
    const q = others.filter((d) => d.intensity === 'hard').sort((a, b) => b.km - a.km)[0];
    if (q) {
      if (q.spec.reps != null && q.spec.reps - qualityRepsStep(q.type) >= qualityRepsMin(q.type)) replaceIn(wk, q, { ...q.spec, reps: q.spec.reps - qualityRepsStep(q.type) }, ctx, reason, log);
      else replaceIn(wk, q, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.floor((q.km - excess) * 10) / 10) }, ctx, reason, log);
      continue;
    }
    const shake = runs.find((d) => d.type === 'shakeout');
    if (shake) { replaceIn(wk, shake, { type: 'rest' }, ctx, reason, log); continue; }
    if (long) { replaceIn(wk, long, { type: 'long', km: Math.max(1, Math.floor((long.km - excess) * 10) / 10) }, ctx, reason, log); continue; }
    break;
  }
  return val() <= cap + 1e-9;
}

function fixLongRun(wk, ctx, log) {
  for (let it = 0; it < 8; it++) {
    const runs = wk.days.filter((d) => isRun(d) && d.intensity !== 'race');
    const long = runs.find((d) => d.intensity === 'long');
    if (!long) return;
    let changed = false;
    const maxKm = Math.floor(((SAFETY.longRunMaxMin * 60) / ctx.p.long) * 10) / 10;
    if (long.km > maxKm) { replaceIn(wk, long, { ...long.spec, km: maxKm }, ctx, 'The long run is 3 hours or less.', log, 'Long run'); continue; }
    if (runs.some((d) => d.type === 'runwalk' && d.km > long.km)) {
      replaceIn(wk, long, { type: 'easy', km: long.km }, ctx, 'A week with return-to-run steps has no long run.', log, 'Long run');
      continue;
    }
    for (const d of runs) {
      if (d === long || d.km <= long.km) continue;
      changed = true;
      if (d.intensity === 'hard' && d.spec.reps != null && d.spec.reps - qualityRepsStep(d.type) >= qualityRepsMin(d.type)) replaceIn(wk, d, { ...d.spec, reps: d.spec.reps - qualityRepsStep(d.type) }, ctx, 'The long run must be the longest run of the week.', log, 'Long run');
      else replaceIn(wk, d, { type: d.type === 'runwalk' ? 'runwalk' : 'easy', ...(d.type === 'runwalk' ? d.spec : {}), km: Math.max(1, Math.floor(long.km * 0.9 * 10) / 10) }, ctx, 'The long run must be the longest run of the week.', log, 'Long run');
    }
    const tr = trainingKm(wk); const n = runs.length;
    const capShare = longShareCap(n);
    if (n > 1 && long.km > capShare * tr + 1e-9) {
      const others = tr - long.km;
      const nk = Math.floor(((capShare / (1 - capShare)) * others) * 10) / 10;
      replaceIn(wk, long, { ...long.spec, km: Math.max(1, nk) }, ctx, 'The long run is at most about one third of the week.', log, 'Long run');
      changed = true;
    }
    if (!changed) return;
  }
}

function longRunOk(wk) {
  const runs = wk.days.filter((d) => isRun(d) && d.intensity !== 'race');
  const long = runs.find((d) => d.intensity === 'long');
  if (!long) return true;
  if (runs.some((d) => d !== long && d.km > long.km)) return false;
  return runs.length <= 1 || long.km <= longShareCap(runs.length) * trainingKm(wk) + 1e-9;
}

function enforce8020(wk, p, ctx, log) {
  const ratio = () => { const tot = sum(wk.days, countedMinutes); return tot > 0 ? sum(wk.days, (d) => hardMinutes(d, p)) / tot : 0; };
  const reason = 'About 80% of running time is easy.';
  for (let guard = 0; guard < 40 && ratio() > SAFETY.hardShareMax; guard++) {
    const q = wk.days.filter((d) => d.intensity === 'hard' && d.spec.reps != null && d.spec.reps - qualityRepsStep(d.type) >= qualityRepsMin(d.type)).sort((a, b) => hardMinutes(b, p) - hardMinutes(a, p))[0];
    if (q) { replaceIn(wk, q, { ...q.spec, reps: q.spec.reps - qualityRepsStep(q.type) }, ctx, reason, log, '80/20'); continue; }
    const lf = wk.days.find((d) => d.type === 'longfinish');
    if (lf) { replaceIn(wk, lf, { type: 'long', km: lf.km }, ctx, reason, log, '80/20'); continue; }
    const hq = wk.days.find((d) => d.intensity === 'hard');
    if (hq) { replaceIn(wk, hq, { type: 'easy', km: hq.km }, ctx, reason, log, '80/20'); continue; }
    const st = wk.days.find((d) => d.type === 'strides' || d.type === 'shakeout');
    if (st) { replaceIn(wk, st, st.type === 'strides' ? { type: 'easy', km: st.km } : { type: 'rest' }, ctx, reason, log, '80/20'); continue; }
    break;
  }
}

export function classifyWeek(wk) {
  if (wk.kind === 'taper' || wk.kind === 'race') return 'taper';
  if (wk.kind === 'recovery' || wk.disrupted) return 'recovery';
  if (wk.cutback) return 'cutback';
  if (wk.days.some((d) => d.type === 'race')) return 'event';
  if (wk.rebuild) return 'rebuild';
  return 'normal';
}

export function enforceWeeks(plan, ctxFor, log, warnings, rebuildWeek = null) {
  const p = plan.paces; const cap1 = plan.limits.week1MaxKm;
  let lastNormal = null; let peak = 0; let prevTaperTr = null;
  const raceIsos = (plan.races || []).filter((r) => r.inPlan !== false).map((r) => r.iso);
  const nearRace = (iso) => raceIsos.some((r) => Math.abs(daysBetween(iso, r)) <= 4);
  plan.weeks.forEach((wk, wi) => {
    const ctx = ctxFor(wi);
    wk.check = classifyWeek(wk);
    const ref = lastNormal != null ? lastNormal : cap1 / (1 + SAFETY.maxWeeklyIncrease);
    let cap = wk.targetKm != null ? wk.targetKm + 0.3 : Infinity; let measure = 'km';
    if (wk.check === 'normal' || wk.check === 'event' || wk.check === 'rebuild') cap = Math.min(cap, ref * (1 + SAFETY.maxWeeklyIncrease));
    if (wk.check === 'cutback') cap = Math.min(cap, ref * 0.88);
    if (wk.check === 'recovery') cap = Math.min(cap, ref);
    if (wk.check === 'taper') {
      measure = 'training';
      cap = Math.min(wk.targetKm != null ? wk.targetKm : Infinity, (wk.taperFrac || 1) * (peak || ref * (1 + SAFETY.maxWeeklyIncrease)), prevTaperTr != null ? prevTaperTr : Infinity, ref * (1 + SAFETY.maxWeeklyIncrease));
    }
    if (wi === 0) cap = Math.min(cap, cap1);
    // A week that is much larger than its cap (for example after a race
    // lowered the week before) is planned again at the cap. Cuts to the
    // easy runs alone would leave a week of long and quality runs only.
    // The long-run rules then cut it far below the cap, and the next week
    // grows from that low week, so the plan falls away week by week.
    if (rebuildWeek && (wk.check === 'normal' || wk.check === 'cutback') && Number.isFinite(cap) && weekKm(wk) > cap * 1.08 && !wk.days.some((d) => d.adjusted || d.type === 'race' || d.type === 'timetrial' || nearRace(d.iso))) {
      const days = rebuildWeek(wk, wi, Math.max(0, cap));
      if (days) {
        const gymOf = new Map(wk.days.map((d) => [d.iso, d.gym]));
        for (const d of days) if (gymOf.get(d.iso) !== undefined) d.gym = gymOf.get(d.iso);
        wk.days = days;
      }
    }
    const reason = wk.check === 'taper' ? 'Taper: less running before the race.' : wi === 0 ? 'Week 1 is at most your current weekly distance plus 10%.' : wk.check === 'cutback' ? 'Every 4th week is a cutback week.' : 'Each week grows by 10% or less.';
    const ok = shrinkWeek(wk, Math.max(0, cap), measure, ctx, log, reason);
    if (!ok) {
      wk.exempt = 'The race distance alone is more than the weekly limit. Other runs this week are short.';
      warnings.push(`Week ${wk.n}: ${wk.exempt}`);
    }
    for (let it = 0; it < 6; it++) {
      fixLongRun(wk, ctx, log);
      enforce8020(wk, p, ctx, log);
      if (longRunOk(wk)) break;
    }
    if (wk.check === 'normal' && !wk.exempt) { lastNormal = weekKm(wk); peak = Math.max(peak, lastNormal); }
    if (wk.check === 'rebuild' && !wk.exempt) lastNormal = weekKm(wk);
    if (wk.disrupted && wk.refKm != null && wk.check === 'recovery') lastNormal = wk.refKm;
    if (wk.check === 'taper') prevTaperTr = trainingKm(wk);
  });
}

/* ---------- engine strength ---------- */
function placeStrength(plan, o, ctxFor) {
  if (o.usesLift) return;
  const flat = allDays(plan);
  const idx = new Map(flat.map((d, i) => [d.iso, i]));
  const aRaces = plan.races.filter((r) => r.priority === 'A' && r.inPlan !== false);
  plan.weeks.forEach((wk, wi) => {
    let n = o.goal === 'runwalk' || o.experience === 'new' ? 1 : wk.kind === 'peak' || wk.cutback || wk.kind === 'taper' ? 1 : wk.kind === 'race' ? 0 : 2;
    if (wk.kind === 'recovery') n = wk.recoveryIdx > 1 ? 1 : 0;
    const nearA = (iso) => aRaces.some((r) => { const k = daysBetween(iso, r.iso); return k >= 0 && k < SAFETY.raceWeekDays; });
    const okDay = (d) => {
      const i = idx.get(d.iso); const next = flat[i + 1]; const next2 = flat[i + 2];
      if (d.iso < o.today || d.gym || nearA(d.iso)) return false;
      if (next && (isHardDay(next) || next.type === 'race')) return false;
      if (next2 && next2.type === 'race') return false;
      return true;
    };
    const session = (k) => (o.experience === 'new' || o.goal === 'runwalk' ? 'core' : wk.kind === 'taper' || wk.kind === 'peak' ? 'mobility' : k % 2 === 0 ? 'core' : 'legs');
    let k = 0;
    for (const d of wk.days) {
      if (k >= n) break;
      if (d.type !== 'rest' || !okDay(d)) continue;
      const i = wk.days.indexOf(d);
      const nw = makeWorkout(d.iso, { type: 'strength', session: session(k), min: 20, why: wk.kind === 'taper' ? 'Taper: a short, light session only.' : '' }, ctxFor(wi));
      nw.gym = d.gym; wk.days[i] = nw; flat[idx.get(d.iso)] = nw; k++;
    }
    for (const d of wk.days) {
      if (k >= n) break;
      if (!(d.type === 'easy' || d.type === 'runwalk') || !okDay(d)) continue;
      d.extra = { kind: 'strength', session: session(k), min: 15, text: 'Add 15 minutes of strength after this run.' }; k++;
    }
  });
}

/* ---------- public ---------- */
export function ctxForPlan(plan) {
  const exp = plan.settings ? plan.settings.experience : 'some';
  return (wi) => ({ p: plan.paces, score: plan.score, goal: plan.goal, racePace: plan.racePace, weekIdx: wi, showPace: exp !== 'new' && plan.goal !== 'runwalk' });
}
export function allDays(plan) { return plan.weeks.flatMap((w) => w.days); }
export function todayWorkout(plan, today) { const k = toISO(today); return allDays(plan).find((w) => w.iso === k) || null; }
export function weekOf(plan, day) { const k = toISO(day); return plan.weeks.find((w) => k >= w.startIso && k <= addDays(w.startIso, 6)) || null; }

export function weekStats(wk, p) {
  const runs = wk.days.filter(isRun);
  const long = runs.find((d) => d.intensity === 'long');
  const tot = sum(wk.days, countedMinutes); const hard = sum(wk.days, (d) => hardMinutes(d, p));
  wk.km = weekKm(wk); wk.trainingKm = trainingKm(wk); wk.min = Math.round(sum(runs, (d) => d.min));
  wk.longKm = long ? long.km : 0; wk.runs = runs.length; wk.hardMin = Math.round(hard); wk.easyShare = tot ? round(1 - hard / tot, 3) : 1;
  return wk;
}

/** Recomputes week stats, peak and safety checks. Use it after any change to the days. */
export function reconcile(plan) {
  plan.weeks.forEach((wk) => { wk.check = classifyWeek(wk); weekStats(wk, plan.paces); });
  const normal = plan.weeks.filter((w) => w.check === 'normal' && !w.exempt);
  const pool = normal.length ? normal : plan.weeks.filter((w) => !w.days.some((d) => d.type === 'race'));
  const pk = pool.reduce((m, w) => (w.km > (m ? m.km : -1) ? w : m), null);
  plan.peakKm = pk ? pk.km : 0; plan.peakWeek = pk ? pk.n : null;
  plan.gymAdvice = allDays(plan).filter((d) => d.gym).map((d) => ({ iso: d.iso, day: d.gym.day, type: d.gym.type, intensity: d.gym.intensity, note: d.gym.note, advice: d.gym.advice, reason: d.gym.reason }));
  plan.safety = safetyChecks(plan);
  return plan;
}

/* Plain reasons for the week 1 values that come from the run history. */
function logWeek1History(plan, o, w1, log) {
  const wk = plan.weeks[0]; if (!wk || !wk.days) return;
  const runs = wk.days.filter((d) => isRun(d) && d.intensity !== 'race');
  const fresh = (w1.newIsos || []).map((iso) => wk.days.find((d) => d.iso === iso)).filter((d) => d && d.type === 'easy');
  if (fresh.length) {
    log.add('Run days', 'Week 1 has no hard session.', 'Week 1 adds a new run day. One change at a time is safer.');
    for (const d of fresh) log.add('Run days', `${DAY_NAMES_LONG[d.dow]} is a short easy run of ${d.km} km in week 1.`, 'A new run day starts as a short easy run. Your usual runs keep their distance.', d.iso);
  }
  if (w1.rule === 'newDays') log.add('Week 1', `Week 1 can have up to ${w1.maxKm} km, not ${w1.baseKm} km.`, `Your current distance (${o.currentWeeklyKm} km) plus the new short runs. This is not more than your current distance + 25% or your recent peak week.`);
  const long = runs.find((d) => d.intensity === 'long');
  if (long && o.usualLongRunKm) {
    if (long.km + 0.3 >= o.usualLongRunKm) log.add('Long run', `The week 1 long run is ${long.km} km.`, `It starts at about your usual long run (${o.usualLongRunKm} km), inside the safety caps.`, long.iso);
    else log.add('Long run', `The week 1 long run is ${long.km} km, not your usual ${o.usualLongRunKm} km.`, 'A safety cap limits it: 3 hours or less, the goal cap, your longest recent run + 10%, or a safe share of the week.', long.iso);
  }
}

export function buildPlan(opts = {}) {
  const o = normalizeOpts(opts);
  const G = GOALS[o.goal];
  const p = paces(o.score);
  const warnings = [...o._warnings];
  const log = new ChangeLog();
  for (const c of o._changes) log.add(c.rule, c.change, c.reason);
  const conflicts = [];
  const pattern = weeklyPattern(o, log, conflicts);
  const tl = makeTimeline(o, G, warnings, log);
  const nRuns = o.runDays.length;
  const newRunKm = newRunKmFor(p);
  const w1 = week1Limit({ currentWeeklyKm: o.currentWeeklyKm, nRunDays: nRuns, runsPerWeek: o.goal === 'runwalk' ? null : o.runsPerWeek, peakWeekKm: o.peakWeekKm, newRunKm });
  o._w1 = w1;
  const floorKm = w1.floorKm;
  const week1MaxKm = w1.maxKm;
  if (w1.starter) warnings.push(o.goal === 'runwalk' ? `Week 1 starts at about ${week1MaxKm} km, with walking included.` : `Your current weekly distance is low for this goal. Week 1 starts at up to ${week1MaxKm} km. A run/walk plan is a gentler start.`);
  const limits = { week1MaxKm, week1Rule: w1.rule, week1BaseKm: w1.baseKm, newRunDays: w1.extraDays, newRunKm, floorKm, currentWeeklyKm: o.currentWeeklyKm, maxHardPerWeek: SAFETY.maxHardPerWeek[o.experience], gentleWeeks: tl.gentleN, hardShareMax: SAFETY.hardShareMax, longRunMaxMin: SAFETY.longRunMaxMin, longCapKm: round(longCapKm(o, G, p), 1) };
  computeTargets(tl, o, G, limits, warnings);
  const racePace = racePaceFor(o, G, p);
  if (o.goalTimeSec) {
    try { const pred = predict(o.score, G.km); if (o.goalTimeSec < pred * 0.95) warnings.push(`Your goal time is more than 5% faster than your current prediction (${Math.round(pred / 60)} min). Race-pace sessions use a safer pace.`); } catch { /* score checked above */ }
  }
  const ctxFor = (wi) => ({ p, score: o.score, goal: o.goal, racePace, weekIdx: wi, showPace: o.experience !== 'new' && o.goal !== 'runwalk' });
  const races = [];
  if (tl.goalRace) races.push({ ...tl.goalRace, inPlan: true });
  for (const r of o.races) {
    if (tl.goalRace && r.iso === tl.goalRace.iso) { if (!tl.goalRace.virtual) races[0].name = r.name || races[0].name; continue; }
    races.push({ ...r, goal: false });
  }

  // build weeks
  const weeks = [];
  const rw = { level: o.goal === 'runwalk' ? ({ new: 1, some: 2, experienced: 3 })[o.experience] : 0, main: 20 };
  let rwLastNormal = null, rwPeak = 0, rwPrevTaper = null;
  tl.weeks.forEach((w, wi) => {
    const ctx = ctxFor(wi); let days;
    if (o.goal === 'runwalk') {
      if (w.kind === 'race') days = buildRaceWeek(w, w.targetKm, o, G, pattern, ctx, tl.goalRace, rw.level);
      else if (w.kind === 'recovery') days = buildRecoveryWeek(w, w.targetKm, o, G, pattern, ctx, rw.level);
      else {
        const ref = rwLastNormal != null ? rwLastNormal : week1MaxKm / 1.1;
        let cap = w.cutback ? ref * 0.88 : w.kind === 'taper' ? Math.min((w.taperFrac || 0.8) * (rwPeak || ref * 1.1), rwPrevTaper != null ? rwPrevTaper : Infinity) : ref * 1.1;
        if (wi === 0) cap = Math.min(cap, week1MaxKm);
        const res = runWalkWeek(w, o, pattern, ctx, rw, cap);
        days = res.days;
        const k = sum(days, (d) => d.km);
        w.targetKm = round(k, 1);
        if (!w.cutback && w.kind === 'runwalk') {
          if (res.sessions && res.sessions.length) { rw.sessions = res.sessions.map((x) => ({ ...x })); rw.level = Math.max(rw.level, ...res.sessions.map((x) => x.level)); }
          rw.walkMin = res.walkMin || rw.walkMin;
          rwLastNormal = k; rwPeak = Math.max(rwPeak, k);
        }
        if (w.kind === 'taper') rwPrevTaper = k;
      }
      w.runWalkLevel = rw.level;
    } else if (w.kind === 'race') days = buildRaceWeek(w, w.targetKm, o, G, pattern, ctx, tl.goalRace, 0);
    else if (w.kind === 'recovery') days = buildRecoveryWeek(w, w.targetKm, o, G, pattern, ctx, 0);
    else {
      days = buildRunWeek(w, w.targetKm, o, G, pattern, ctx, log);
      if (o.goal === 'faster5k' && w.cutback) {
        const q = days.find((d) => d.intensity === 'hard') || days.find((d) => d.intensity === 'easy' && weekdayOf(d.iso) === pattern.quality[0]);
        if (q) { const i = days.indexOf(q); days[i] = makeWorkout(q.iso, { type: 'timetrial', distKm: 5, name: '5K time trial' }, ctx); log.add('Goal', 'A 5K time trial is in each cutback week.', 'A time trial every 4 weeks shows your progress. Paces update from it.'); }
      }
    }
    const { isos, ...meta } = w;
    void isos;
    weeks.push({ ...meta, days });
  });

  const plan = {
    version: 1, kind: 'plan', id: `plan-${o.goal}-${tl.start}`, createdIso: o.today, startIso: tl.start,
    goal: o.goal, goalName: G.name, raceIso: tl.goalRace ? tl.goalRace.iso : null, goalKm: G.km || null, goalTimeSec: o.goalTimeSec,
    score: o.score, scoreSource: o.scoreSource, scoreIso: o.today, paces: p, racePace,
    opts: { ...opts, today: o.today }, settings: { runDays: o.runDays, longRunDay: o.longRunDay, effectiveLongRunDay: pattern.longDay, qualityDays: pattern.quality, gymDays: o.gymDays, usesLift: o.usesLift, experience: o.experience, currentWeeklyKm: o.currentWeeklyKm, runsPerWeek: o.goal === 'runwalk' ? null : o.runsPerWeek, usualLongRunKm: o.usualLongRunKm, longestRecentKm: o.longestRecentKm, peakWeekKm: o.peakWeekKm, newRunKm },
    limits, races, weeks, warnings, conflicts, changesFromRules: log.items, activeLadder: null, gymAdvice: [], safety: [],
  };
  overlayRaces(plan, o, ctxFor, log, warnings);
  attachGym(plan, o, pattern);
  fixSpacing(plan, ctxFor, log, warnings);
  const rebuildWeek = o.goal === 'runwalk' ? null : (wk, wi, T) => {
    const w = { ...wk, isos: Array.from({ length: 7 }, (_, k) => addDays(wk.startIso, k)) };
    return buildRunWeek(w, T, o, G, pattern, ctxFor(wi), log);
  };
  enforceWeeks(plan, ctxFor, log, warnings, rebuildWeek);
  logWeek1History(plan, o, w1, log);
  placeStrength(plan, o, ctxFor);
  for (const d of allDays(plan)) delete d._pairWarned;
  plan.changesFromRules = log.items;
  plan.next = { options: [{ id: 'rejoin', label: 'Rejoin a plan' }, { id: 'newGoal', label: 'Choose a new goal' }, { id: 'keepfit', label: 'Keep fit' }] };
  return reconcile(plan);
}

/** Adds one more 4-week block to a plan without a race date. Earlier weeks stay as they are. */
export function extendPlan(plan) {
  if (!GOALS[plan.goal].noDate) throw new Error('Only plans without a race date can be extended.');
  const blocks = Math.round(plan.weeks.length / 4) + 1;
  const fresh = buildPlan({ ...plan.opts, blocks, startDate: plan.startIso, today: plan.opts.today });
  const out = structuredClone(plan);
  out.weeks = out.weeks.concat(fresh.weeks.slice(plan.weeks.length));
  return reconcile(out);
}

/* ---------- safety checks (computed again from the real days) ---------- */
export function safetyChecks(plan) {
  const eps = SAFETY.checkEps; const p = plan.paces; const L = plan.limits || {};
  const weeks = plan.weeks; const flat = allDays(plan);
  const out = [];
  const add = (id, rule, detail, failures) => out.push({ id, ok: failures.length === 0, rule, detail, failures });
  const km = (wk) => round(sum(wk.days.filter(isRun), (d) => d.km), 1);
  const tkm = (wk) => round(sum(wk.days.filter((d) => isRun(d) && d.intensity !== 'race'), (d) => d.km), 1);
  const cls = (wk) => classifyWeek(wk);

  // volume
  const S = plan.settings || {};
  const lim1 = S.runDays && Number.isFinite(S.currentWeeklyKm)
    ? week1Limit({ currentWeeklyKm: S.currentWeeklyKm, nRunDays: S.runDays.length, runsPerWeek: S.runsPerWeek, peakWeekKm: S.peakWeekKm, newRunKm: S.newRunKm || L.newRunKm || 3 })
    : { maxKm: L.week1MaxKm ?? Infinity, baseKm: L.week1MaxKm, rule: 'base', extraDays: 0 };
  const f1 = [];
  if (L.week1MaxKm != null && Math.abs(L.week1MaxKm - lim1.maxKm) > 0.05) f1.push(`The plan uses a week 1 limit of ${L.week1MaxKm} km, but the rule gives ${lim1.maxKm} km.`);
  if (weeks.length && !weeks[0].exempt && km(weeks[0]) > lim1.maxKm + eps) f1.push(`Week 1 has ${km(weeks[0])} km. The limit is ${lim1.maxKm} km.`);
  add('week1', lim1.rule === 'newDays' ? 'Week 1 is at most your current distance plus 10%, or plus the short new runs' : 'Week 1 is at most your current distance plus 10%',
    lim1.rule === 'newDays' ? `Limit: ${lim1.maxKm} km. Your current distance plus ${lim1.extraDays} short easy run${lim1.extraDays === 1 ? '' : 's'} for the new run day${lim1.extraDays === 1 ? '' : 's'}. Never more than your current distance + 25% or your recent peak week.` : `Limit: ${lim1.maxKm} km.`, f1);
  const fg = [], fc = [], ft = []; let lastNormal = null; let peak = 0; let run = 0; let prevT = null;
  weeks.forEach((wk, i) => {
    const c = cls(wk); const k = km(wk);
    const ref = lastNormal != null ? lastNormal : (L.week1MaxKm ?? Infinity) / 1.1;
    if (!wk.exempt) {
      if ((c === 'normal' || c === 'event' || c === 'rebuild') && i > 0 && k > ref * 1.1 + eps) fg.push(`Week ${wk.n}: ${k} km after ${round(ref, 1)} km.`);
      if (c === 'recovery' && k > ref + eps) fg.push(`Week ${wk.n} (recovery): ${k} km is more than ${round(ref, 1)} km.`);
      if (c === 'cutback' && i > 0 && k > ref * SAFETY.cutbackMaxShare + eps) fc.push(`Week ${wk.n} is a cutback week but has ${k} km (limit ${round(ref * SAFETY.cutbackMaxShare, 1)} km).`);
      if (c === 'taper') { const t = tkm(wk); const lim = Math.min((wk.taperFrac || 1) * (peak || ref * 1.1), ref * 1.1); if (t > lim + eps) ft.push(`Week ${wk.n}: ${t} km. Taper limit ${round(lim, 1)} km.`); if (prevT != null && t > prevT + eps) ft.push(`Week ${wk.n}: the taper grows again.`); prevT = t; }
    }
    if (c === 'normal' || c === 'event') { run++; if (run > 3) fc.push(`Weeks ${wk.n - 3} to ${wk.n}: 4 weeks with no cutback.`); } else run = 0;
    if (c === 'normal' && !wk.exempt) { lastNormal = k; peak = Math.max(peak, k); }
    if (c === 'rebuild' && !wk.exempt) lastNormal = k;
    if (wk.disrupted && wk.refKm != null && c === 'recovery') lastNormal = wk.refKm;
  });
  add('growth', 'Each week grows by 10% or less', 'The week is compared with the last normal training week. Cutback, taper, race and recovery weeks are lower. A week with missed or dropped runs counts at its planned distance.', fg);
  add('cutback', 'Every 4th week is a cutback week', 'A cutback week is 10% or more below the last normal week.', fc);
  add('taper', 'The taper follows the target', 'Taper weeks get smaller toward the race.', ft);

  // hard days
  const fa = [], fb = [];
  for (let i = 0; i + 1 < flat.length; i++) {
    const a = flat[i], b = flat[i + 1];
    if (isHardDay(a) && isHardDay(b) && !(a.type === 'race' && b.type === 'race')) {
      (b.intensity === 'long' && isHardDay(a) ? fb : fa).push(`${a.iso} ${a.title}${isHeavyLegsDay(a) ? ' + heavy legs' : ''} touches ${b.iso} ${b.title}${isHeavyLegsDay(b) ? ' + heavy legs' : ''}.`);
    }
  }
  add('hardSpacing', 'No two hard days touch', 'This includes week ends and heavy legs days.', fa);
  add('beforeLong', 'No hard day before the long run', 'The day before the long run is easy or rest.', fb);
  const fh = [];
  weeks.forEach((wk) => {
    const hard = wk.days.filter((d) => d.intensity === 'hard' || d.intensity === 'race');
    const races = hard.filter((d) => d.intensity === 'race').length;
    if (hard.length > (L.maxHardPerWeek ?? 2) && races < hard.length) fh.push(`Week ${wk.n}: ${hard.length} hard sessions (limit ${L.maxHardPerWeek}).`);
  });
  add('hardPerWeek', `At most ${L.maxHardPerWeek} hard session${L.maxHardPerWeek === 1 ? '' : 's'} a week`, 'Races and time trials count as hard sessions.', fh);
  const fgs = [];
  weeks.slice(0, L.gentleWeeks || 0).forEach((wk) => { wk.days.filter((d) => d.intensity === 'hard').forEach((d) => fgs.push(`Week ${wk.n}: ${d.title} on ${d.iso}.`)); });
  add('gentleStart', 'Easy weeks first', L.gentleWeeks ? `The first ${L.gentleWeeks} weeks have no hills or intervals.` : 'Not needed for this plan.', fgs);

  // long run
  const fl = [], fs = [];
  weeks.forEach((wk) => {
    const runs = wk.days.filter((d) => isRun(d) && d.intensity !== 'race');
    const long = runs.find((d) => d.intensity === 'long'); if (!long) return;
    if (runs.filter((d) => d.intensity === 'long').length > 1) fl.push(`Week ${wk.n} has two long runs.`);
    for (const d of runs) if (d !== long && d.km > long.km + 1e-9) fl.push(`Week ${wk.n}: ${d.title} (${d.km} km) is longer than the long run (${long.km} km).`);
    const t = tkm(wk); const capS = longShareCap(runs.length);
    if (runs.length > 1 && long.km > capS * t + eps) fs.push(`Week ${wk.n}: long run ${long.km} km is ${Math.round((long.km / t) * 100)}% of ${t} km.`);
    if (long.min > SAFETY.longRunMaxMin + 1) fs.push(`Week ${wk.n}: long run takes ${long.min} minutes.`);
    if (L.longCapKm && long.km > L.longCapKm + eps) fs.push(`Week ${wk.n}: long run ${long.km} km is above the cap of ${L.longCapKm} km.`);
  });
  add('longLongest', 'The long run is the longest run of the week', 'Easy and quality runs are shorter than the long run.', fl);
  add('longShare', 'The long run is a safe share of the week', 'About one third of the week (more with 2 or 3 runs) and 3 hours or less.', fs);

  // 80/20
  const fe = [];
  weeks.forEach((wk) => {
    const tot = sum(wk.days, countedMinutes); if (!tot) return;
    const h = sum(wk.days, (d) => hardMinutes(d, p));
    if (h / tot > SAFETY.hardShareMax + 0.005) fe.push(`Week ${wk.n}: ${Math.round((h / tot) * 100)}% of running time is hard.`);
  });
  add('easy8020', 'About 80% of running is easy', 'Hard time is time at marathon pace or faster. Races and time trials are not counted.', fe);

  // gym
  const fgy = [];
  flat.forEach((d, i) => {
    if (!isHeavyLegsDay(d)) return;
    if (isHardRun(d)) fgy.push(`${d.iso}: heavy legs on the same day as ${d.title}.`);
    const n1 = flat[i + 1], n2 = flat[i + 2];
    if (n1 && isHardRun(n1)) fgy.push(`${d.iso}: heavy legs the day before ${n1.title}.`);
    if (n2 && (n2.intensity === 'long' || n2.intensity === 'race')) fgy.push(`${d.iso}: heavy legs 2 days before ${n2.title}.`);
  });
  add('legsSpacing', 'Heavy legs are far enough from key runs', 'No heavy legs within 48 hours before a quality run or 72 hours before the long run or a race.', fgy);
  const flr = [];
  for (const r of (plan.races || []).filter((x) => x.priority === 'A' && x.inPlan !== false)) {
    for (const d of flat) {
      if (!d.gym || d.gym.intensity !== 'heavy') continue;
      const k = daysBetween(d.iso, r.iso);
      if (k >= 0 && k < SAFETY.raceWeekDays && d.gym.advice !== 'skip-heavy') flr.push(`${d.iso}: heavy lifting in race week.`);
      if (k >= SAFETY.raceWeekDays && k <= SAFETY.maintenanceDays && d.gym.advice === 'normal') flr.push(`${d.iso}: full lifting in the last 10 days before an A race.`);
    }
  }
  add('raceLifting', 'Lifting backs off before an A race', 'Maintenance in the last 10 days. No heavy lifting in race week.', flr);

  // races
  const fr = [];
  for (const r of plan.races || []) {
    if (r.inPlan === false) continue;
    const d = flat.find((x) => x.iso === r.iso);
    if (!d || d.type !== 'race') fr.push(`${r.name} on ${r.iso} is not in the plan.`);
  }
  add('races', 'Every race is in the plan', 'The engine never drops a race.', fr);

  if (plan.goal === 'runwalk') {
    const fw = []; let last = 0;
    weeks.filter((wk) => wk.kind !== 'recovery' && !wk.days.some((d) => d.type === 'race')).forEach((wk) => {
      if (wk.rebuild || wk.disrupted) { last = 0; return; } // a return after a break or an injury starts lower
      const lv = Math.max(0, ...wk.days.filter((d) => d.type === 'runwalk').map((d) => d.runWalk.level));
      if (lv && lv < last) fw.push(`Week ${wk.n}: run/walk level goes down from ${last} to ${lv}.`);
      if (lv) last = Math.max(last, lv);
    });
    add('runWalkProgress', 'Run/walk steps grow or hold', 'The run parts get longer. "Repeat this week" holds the level. After a break or an injury, the steps start lower again.', fw);
  }
  return out;
}
export const safetyOk = (plan) => plan.safety.every((c) => c.ok);
