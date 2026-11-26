// planWeek and recommendWeek (spec v1.1 sections 3 and 6).
// Property test: every use, level, priority, doubles setting, day set and session count.
// The checks below do not use the week.js code. The plans from buildPlan are checked with the
// engine's own safety checks and with the independent verdicts in engine-helpers.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planWeek, recommendWeek, buildPlan, rng } from '../src/run/engine.js';
import { verdicts, days, hardRun, heavyLegs, LONG } from './engine-helpers.mjs';

const TODAY = '2026-11-25'; // a Wednesday
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LEG = new Set(['lower', 'full', 'legs']);
const cdist = (a, b) => { const x = Math.abs(a - b) % 7; return Math.min(x, 7 - x); };
const plus = (d, n) => (((d + n) % 7) + 7) % 7;

function randomSets() {
  const r = rng(2101);
  const out = [];
  while (out.length < 3) {
    const n = 3 + Math.floor(r() * 4); // 3 to 6 days
    const pool = WEEK.slice(); const s = [];
    while (s.length < n) s.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const key = s.slice().sort().join(',');
    if (!out.some((x) => x.slice().sort().join(',') === key)) out.push(s);
  }
  return out;
}
const DAYSETS = { all7: [0, 1, 2, 3, 4, 5, 6], weekdays: [1, 2, 3, 4, 5], ...Object.fromEntries(randomSets().map((s, i) => [`random${i + 1}`, s])), two: [3, 6] };
const USES = ['run', 'lift', 'both'];
const RUN_LEVELS = ['new', 'some', 'experienced'];
const LIFT_LEVELS = ['beginner', 'intermediate', 'advanced'];
const PRIORITIES = ['run', 'lift', 'equal'];
const COUNTS = [0, 1, 2, 3, 4, 5, 6];

function cases() {
  const out = [];
  let k = 0;
  for (const use of USES) for (const runLevel of RUN_LEVELS) for (const liftLevel of LIFT_LEVELS) for (const priority of PRIORITIES) for (const doubles of [false, true]) for (const [setName, availableDays] of Object.entries(DAYSETS)) {
    // The count of the side that the user does not use is ignored: two values are enough to show it.
    const runCounts = use === 'lift' ? [0, 4] : COUNTS;
    const liftCounts = use === 'run' ? [0, 4] : COUNTS;
    for (const runDays of runCounts) for (const liftDays of liftCounts) {
      k++;
      const longRunDay = k % 4 === 0 ? 6 : k % 4 === 1 ? undefined : k % 4 === 2 ? 3 : 0;
      out.push({ use, runLevel, liftLevel, priority, doubles, availableDays, runDays, liftDays, longRunDay, label: `${use} run:${runLevel} lift:${liftLevel} prio:${priority} dbl:${doubles} ${setName} r${runDays} l${liftDays} long:${longRunDay}` });
    }
  }
  return out;
}

/* What the rules expect, from the input only. */
function expectations(c) {
  const prio = c.use === 'run' ? 'run' : c.use === 'lift' ? 'lift' : c.priority;
  const beginner = (c.use !== 'lift' && c.runLevel === 'new') || (c.use !== 'run' && c.liftLevel === 'beginner');
  const restMin = beginner ? 2 : 1;
  const maxTrain = Math.min(c.availableDays.length, 7 - restMin);
  let capR = c.use === 'lift' ? 0 : c.runDays;
  if (c.runLevel === 'new') capR = Math.min(capR, 5);
  let capL = c.use === 'run' ? 0 : c.liftDays;
  if (capL > 4) capL = prio === 'lift' ? 4 : 3;
  else if (capL === 4 && prio !== 'lift') capL = 3;
  return { prio, restMin, maxTrain, capR, capL };
}

/* Independent checks of one week. Returns a list of failures. */
function checkWeek(c, w) {
  const f = [];
  const e = expectations(c);
  const avail = new Set(c.availableDays);
  const gymDays = w.gymDays.map((g) => g.day);
  const train = new Set([...w.runDays, ...gymDays]);
  const L = w.longRunDay;
  // no session on an unavailable day; one gym session a day; no repeats
  for (const d of train) if (!avail.has(d)) f.push(`session on unavailable day ${d}`);
  if (new Set(w.runDays).size !== w.runDays.length) f.push('a run day repeats');
  if (new Set(gymDays).size !== gymDays.length) f.push('two gym sessions on one day');
  // rest days: the other days, the minimum, unavailable days are rest
  const rest = WEEK.filter((d) => !train.has(d));
  if (rest.join() !== w.restDays.join()) f.push(`restDays ${w.restDays} are not the free days ${rest}`);
  if (w.restDays.length < e.restMin) f.push(`${w.restDays.length} rest days, need ${e.restMin}`);
  for (const d of WEEK) if (!avail.has(d) && !w.restDays.includes(d)) f.push(`unavailable day ${d} is not a rest day`);
  // long run
  if (w.runDays.length) {
    const want = c.longRunDay != null && avail.has(c.longRunDay) ? c.longRunDay : avail.has(0) ? 0 : avail.has(6) ? 6 : c.availableDays.slice().sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b)).at(-1);
    if (L !== want) f.push(`long run on ${L}, expected ${want}`);
    if (!w.runDays.includes(L)) f.push('long run is not a run day');
    if (gymDays.includes(L) && !(c.availableDays.length === 1)) f.push('a lift on the long-run day');
  } else if (L !== null) f.push('long run with no runs');
  // heavy legs: not on the long-run day, the day after it or the 2 days before it; heavy leg days do not touch
  const heavy = w.gymDays.filter((g) => LEG.has(g.type) && g.intensity === 'heavy').map((g) => g.day);
  for (const h of heavy) {
    if (L != null && [L, plus(L, 1), plus(L, -1), plus(L, -2)].includes(h)) f.push(`heavy legs on ${h}, long run on ${L}`);
    if (heavy.some((k) => k !== h && cdist(h, k) === 1)) f.push(`heavy leg days touch at ${h}`);
  }
  // room for a hard run (the same test as buildPlan uses to choose quality days)
  if (w.runDays.length >= 2) {
    const geo = w.runDays.filter((d) => d !== L && cdist(d, L) >= 2);
    const clean = geo.filter((d) => ![plus(d, -1), d, plus(d, 1)].some((x) => heavy.includes(x)));
    if (geo.length && !clean.length) f.push('no run day is free for a hard run');
  }
  // doubles: the days with a run and a lift
  const pairs = w.runDays.filter((d) => gymDays.includes(d));
  if (pairs.join() !== w.doubles.map((d) => d.day).join()) f.push(`doubles ${w.doubles.map((d) => d.day)} are not the shared days ${pairs}`);
  for (const d of w.doubles) {
    if (d.gapHours !== 6) f.push('gapHours is not 6');
    if (d.first !== (e.prio === 'lift' ? 'lift' : 'run')) f.push(`first is ${d.first}, priority ${e.prio}`);
    const g = w.gymDays.find((x) => x.day === d.day);
    if (!c.doubles && g.type !== 'upper') f.push(`no doubles, but ${g.type} shares ${d.day} with a run`);
  }
  if (!c.doubles && pairs.length && w.runDays.length + w.gymDays.length <= e.maxTrain) f.push('a shared day without doubles, but the sessions fit the days');
  // split matches the lift days
  const n = w.gymDays.length;
  const types = w.gymDays.map((g) => g.type).sort().join(',');
  const wantSplit = n === 0 ? null : n <= 2 ? 'full' : n === 3 ? 'upper-lower-upper' : 'upper-lower';
  if (w.split !== wantSplit) f.push(`split ${w.split} for ${n} lift days`);
  const wantTypes = n === 0 ? '' : n <= 2 ? Array(n).fill('full').join(',') : n === 3 ? 'lower,upper,upper' : 'lower,lower,upper,upper';
  if (types !== wantTypes) f.push(`types ${types} for ${n} lift days`);
  if (n === 4 && e.prio !== 'lift') f.push('4 lift days without lifting priority');
  for (const g of w.gymDays) if (!['heavy', 'light'].includes(g.intensity) || typeof g.note !== 'string') f.push('gym day shape');
  // reductions: only on the lower-priority side, with a warning, and never below 1
  const outR = w.runDays.length, outL = w.gymDays.length;
  if (outR > e.capR) f.push(`${outR} runs, more than ${e.capR}`);
  if (outL > e.capL) f.push(`${outL} lifts, more than ${e.capL}`);
  if (e.capR >= 1 && outR < 1) f.push('running reduced below 1');
  if (e.capL >= 1 && outL < 1) f.push('lifting reduced below 1');
  const redR = e.capR - outR, redL = e.capL - outL;
  if (redR > 0 && !w.warnings.some((x) => x.includes(`reduced running to ${outR}`))) f.push('running reduced with no warning');
  if (redL > 0 && !w.warnings.some((x) => x.includes(`reduced lifting to ${outL}`))) f.push('lifting reduced with no warning');
  if (e.prio === 'run' && redR > 0 && outL > Math.min(1, e.capL)) f.push(`running reduced while lifting has ${outL}`);
  if (e.prio === 'lift' && redL > 0 && outR > Math.min(1, e.capR)) f.push(`lifting reduced while running has ${outR}`);
  if (e.prio === 'equal' && redR > 0 && redL > 0 && Math.abs(redR - redL) > 1 && outR > 1 && outL > 1) f.push(`equal priority: running -${redR}, lifting -${redL}`);
  if (e.prio === 'equal' && redR > redL && outL > 1) f.push(`equal priority: running reduced first (-${redR}, lifting -${redL})`);
  if (e.capR + e.capL <= e.maxTrain && (redR || redL)) f.push('reduced, but the sessions fit the days');
  if (c.use !== 'lift' && c.runLevel === 'new' && c.runDays > 5 && !w.warnings.some((x) => /at most 5 days/.test(x))) f.push('no warning for the 5-run cap');
  if (c.use !== 'run' && e.capL < c.liftDays && !w.warnings.some((x) => /lift days/.test(x))) f.push('no warning for the lift-day cap');
  // reasons: present, plain STE sentences, no banned words
  if (train.size && !w.reasons.length) f.push('no reasons');
  for (const r of [...w.reasons, ...w.warnings]) {
    if (typeof r !== 'string' || !r.trim().endsWith('.')) f.push(`reason is not a sentence: ${r}`);
    if (/'|\bTSS\b|VDOT|Training Stress/i.test(r)) f.push(`banned text: ${r}`);
    for (const s of r.split(/(?<=\.)\s+/)) if (s.split(/\s+/).length > 26) f.push(`long sentence: ${s}`);
  }
  if (L != null && !w.reasons.some((r) => r.includes(`long run is on ${NAMES[L]}`))) f.push('no reason for the long-run day');
  for (const h of heavy) if (L != null && !w.reasons.some((r) => r.includes(`on ${NAMES[h]}. The long run is on ${NAMES[L]}`))) f.push(`no spacing reason for heavy legs on ${h}`);
  for (const g of w.gymDays.filter((x) => LEG.has(x.type) && x.intensity === 'light')) if (!w.reasons.some((r) => r.includes(`on ${NAMES[g.day]} is light`))) f.push(`no reason for light legs on ${g.day}`);
  if (w.restDays.length && !w.reasons.some((r) => /rest day/.test(r))) f.push('no rest-day reason');
  return f;
}

const ALL = cases();
const WEEKS = ALL.map((c) => ({ c, w: planWeek(c) }));

test(`planWeek: ${ALL.length} weeks keep every rule`, () => {
  assert.ok(ALL.length > 20000);
  const bad = [];
  for (const { c, w } of WEEKS) for (const msg of checkWeek(c, w)) bad.push(`${c.label} :: ${msg}`);
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} failures`);
});

test('planWeek: the plans that buildPlan makes from the weeks keep every safety rule and leave room for a hard run', () => {
  const seen = new Map();
  for (const { c, w } of WEEKS) {
    if (!w.runDays.length) continue;
    const key = `${c.runLevel}|${w.runDays}|${w.longRunDay}|${JSON.stringify(w.gymDays.map((g) => [g.day, g.type, g.intensity]))}`;
    if (!seen.has(key)) seen.set(key, { c, w });
  }
  assert.ok(seen.size > 300, `${seen.size} different weeks`);
  const free = new Map();
  const bad = [];
  for (const { c, w } of seen.values()) {
    const opts = { goal: 'keepfit', blocks: 1, runDays: w.runDays, longRunDay: w.longRunDay, gymDays: w.gymDays, experience: c.runLevel, currentWeeklyKm: 25, score: 40, today: TODAY };
    const plan = buildPlan(opts);
    const tag = `${c.label} -> runs ${w.runDays} long ${w.longRunDay} gym ${JSON.stringify(w.gymDays.map((g) => [g.day, g.type[0], g.intensity[0]]))}`;
    // the engine's own safety checks
    for (const s of plan.safety) if (!s.ok) bad.push(`${tag} :: ${s.id}: ${s.failures[0]}`);
    // the independent verdicts
    for (const [rule, fails] of Object.entries(verdicts(plan))) if (fails.length) bad.push(`${tag} :: verdict ${rule}: ${fails[0]}`);
    // buildPlan did not have to move the long run or make a gym day light
    if (plan.settings.effectiveLongRunDay !== w.longRunDay) bad.push(`${tag} :: long run moved to ${plan.settings.effectiveLongRunDay}`);
    for (const k of plan.conflicts) if (k.kind !== 'fewer-quality') bad.push(`${tag} :: conflict ${k.kind}: ${k.reason}`);
    for (const g of plan.gymAdvice) if (g.advice !== 'normal') bad.push(`${tag} :: gym on ${g.iso} is ${g.advice}: ${g.reason}`);
    // independent: heavy legs never within 72 hours before a long run, nor the day before a hard run
    const flat = days(plan);
    flat.forEach((d, i) => {
      if (!heavyLegs(d)) return;
      if (flat[i + 1] && hardRun(flat[i + 1])) bad.push(`${tag} :: heavy legs on ${d.iso}, ${flat[i + 1].type} the next day`);
      for (const k of [1, 2]) if (flat[i + k] && LONG.has(flat[i + k].type)) bad.push(`${tag} :: heavy legs on ${d.iso}, long run ${k} days later`);
    });
    const H = w.gymDays.filter((g) => LEG.has(g.type) && g.intensity === 'heavy').map((g) => g.day);
    for (const q of plan.settings.qualityDays) for (const h of H) if (cdist(q, h) <= 1) bad.push(`${tag} :: quality day ${q} next to heavy legs on ${h}`);
    // room for a hard run: when the run days allow a quality day with no gym days, they still allow one
    const fk = `${c.runLevel}|${w.runDays}|${w.longRunDay}`;
    if (!free.has(fk)) free.set(fk, buildPlan({ ...opts, gymDays: [] }).settings.qualityDays.length);
    if (free.get(fk) >= 1 && plan.settings.qualityDays.length < 1) bad.push(`${tag} :: no quality day is left`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} failures`);
});

test('planWeek: an example week with reasons', () => {
  const w = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 4, liftDays: 3, priority: 'run', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.equal(w.longRunDay, 0);
  assert.equal(w.split, 'upper-lower-upper');
  const lower = w.gymDays.find((g) => g.type === 'lower');
  assert.equal(lower.intensity, 'heavy');
  assert.ok(![6, 5, 0, 1].includes(lower.day), 'lower body is 72 hours or more before the long run');
  assert.ok(w.reasons.some((r) => r === `Lower body is on ${NAMES[lower.day]}. The long run is on Sunday, ${(7 - lower.day) % 7} days later.`), w.reasons.join('\n'));
  assert.ok(w.restDays.length >= 1);
  assert.deepEqual(w.warnings, []);
});

test('planWeek: unavailable days are rest, the preferred long-run day wins, beginners get 2 rest days', () => {
  const w = planWeek({ use: 'both', availableDays: [1, 3, 5, 6], runDays: 3, liftDays: 1, priority: 'equal', doubles: false, runLevel: 'new', liftLevel: 'beginner', longRunDay: 6 });
  assert.equal(w.longRunDay, 6);
  for (const d of [0, 2, 4]) assert.ok(w.restDays.includes(d));
  assert.ok(w.restDays.length >= 2);
  assert.match(w.reasons.join(' '), /You chose this day/);
  const pref = planWeek({ use: 'run', availableDays: [1, 3, 5], runDays: 3, runLevel: 'some', longRunDay: 0 });
  assert.equal(pref.longRunDay, 5, 'the last available day when no weekend day is free');
  assert.match(pref.reasons.join(' '), /Your long-run day \(Sunday\) is not a training day/);
});

test('planWeek: too many sessions reduce the lower-priority side first', () => {
  const base = { use: 'both', availableDays: [1, 2, 3, 4, 5], doubles: false, runLevel: 'some', liftLevel: 'intermediate' };
  // 4 runs + 2 full-body days on 5 days with no doubles: one session must go
  const run = planWeek({ ...base, runDays: 4, liftDays: 2, priority: 'run' });
  assert.deepEqual([run.runDays.length, run.gymDays.length], [4, 1]);
  assert.ok(run.warnings.some((x) => x.startsWith('Too many sessions for your days. We reduced lifting to 1.')));
  const lift = planWeek({ ...base, runDays: 4, liftDays: 2, priority: 'lift' });
  assert.deepEqual([lift.runDays.length, lift.gymDays.length], [3, 2]);
  assert.ok(lift.warnings.some((x) => x.startsWith('Too many sessions for your days. We reduced running to 3.')));
  assert.ok(!lift.warnings.some((x) => /reduced lifting/.test(x)));
  const equal = planWeek({ ...base, runDays: 4, liftDays: 2, priority: 'equal' });
  assert.deepEqual([equal.runDays.length, equal.gymDays.length], [4, 1], 'equal priority: lifting gives first');
  const both = planWeek({ ...base, runDays: 5, liftDays: 3, priority: 'run' });
  assert.deepEqual([both.runDays.length, both.gymDays.length], [4, 1], 'lifting goes down to 1 before running goes down');
  const two = planWeek({ ...base, availableDays: [3, 6], runDays: 4, liftDays: 3, priority: 'equal' });
  assert.ok(two.runDays.length >= 1 && two.gymDays.length >= 1, 'never below 1 of a chosen side');
  assert.ok(two.warnings.some((x) => /reduced lifting/.test(x)) && two.warnings.some((x) => /reduced running/.test(x)));
});

test('planWeek: 4 lift days only with lifting priority; upper body shares a day with an easy run only when needed', () => {
  const w4 = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 3, liftDays: 4, priority: 'equal', doubles: false, runLevel: 'some', liftLevel: 'advanced' });
  assert.equal(w4.gymDays.length, 3);
  assert.match(w4.warnings.join(' '), /4 lift days are only for people who make lifting the priority/);
  const l4 = planWeek({ use: 'lift', availableDays: [0, 1, 2, 3, 4, 5, 6], liftDays: 4, liftLevel: 'advanced' });
  assert.equal(l4.split, 'upper-lower');
  assert.deepEqual(l4.runDays, []);
  assert.equal(l4.longRunDay, null);
  const fit = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 3, liftDays: 3, priority: 'run', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.deepEqual(fit.doubles, [], 'the sessions fit, so no day has two sessions');
  const tight = planWeek({ use: 'both', availableDays: [1, 2, 3, 4, 5], runDays: 3, liftDays: 3, priority: 'run', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.equal(tight.doubles.length, 1);
  const shared = tight.gymDays.find((g) => g.day === tight.doubles[0].day);
  assert.equal(shared.type, 'upper');
  assert.deepEqual(tight.doubles[0], { day: shared.day, first: 'run', gapHours: 6 });
});

test('planWeek: doubles let a lower-body session share a day with an easy run; the priority goes first', () => {
  const w = planWeek({ use: 'both', availableDays: [2, 4, 6, 0], runDays: 4, liftDays: 2, priority: 'lift', doubles: true, runLevel: 'experienced', liftLevel: 'advanced' });
  assert.equal(w.runDays.length, 4);
  assert.equal(w.gymDays.length, 2);
  assert.ok(w.doubles.length >= 1 && w.doubles.every((d) => d.first === 'lift' && d.gapHours === 6));
  assert.ok(!w.gymDays.some((g) => g.day === w.longRunDay));
});

test('planWeek: lift only, run only and no days', () => {
  const lift = planWeek({ use: 'lift', availableDays: [1, 2, 3, 4, 5, 6, 0], liftDays: 2, runDays: 5, liftLevel: 'beginner' });
  assert.deepEqual(lift.runDays, []);
  assert.equal(lift.gymDays.length, 2);
  assert.ok(lift.gymDays.every((g) => g.type === 'full' && g.intensity === 'heavy'));
  assert.ok(cdist(lift.gymDays[0].day, lift.gymDays[1].day) >= 2, 'full-body days are spread');
  const run = planWeek({ use: 'run', availableDays: [1, 2, 3, 4, 5, 6, 0], runDays: 7, liftDays: 3, runLevel: 'experienced' });
  assert.equal(run.runDays.length, 6);
  assert.deepEqual(run.gymDays, []);
  assert.equal(run.split, null);
  assert.match(run.warnings.join(' '), /reduced running to 6/);
  const none = planWeek({ use: 'both', availableDays: [], runDays: 3, liftDays: 2 });
  assert.deepEqual(none.restDays, WEEK);
  assert.ok(none.warnings.length === 1);
  const one = planWeek({ use: 'both', availableDays: [6], runDays: 2, liftDays: 2, priority: 'equal', doubles: true });
  assert.deepEqual(one.runDays, [6]);
  assert.deepEqual(one.gymDays.map((g) => [g.day, g.intensity]), [[6, 'light']]);
  const oneNo = planWeek({ use: 'both', availableDays: [6], runDays: 2, liftDays: 2, priority: 'lift', doubles: false });
  assert.deepEqual(oneNo.runDays, []);
  assert.equal(oneNo.gymDays.length, 1);
});

test('recommendWeek: the Starting weeks table', () => {
  const r = (use, runLevel, liftLevel, priority) => recommendWeek({ use, runLevel, liftLevel, priority });
  assert.deepEqual([r('run', 'new').runDays, r('run', 'some').runDays, r('run', 'experienced').runDays], [3, 4, 5]);
  assert.deepEqual([r('lift', null, 'beginner').liftDays, r('lift', null, 'intermediate').liftDays, r('lift', null, 'advanced').liftDays], [2, 3, 4]);
  assert.equal(r('run', 'new').liftDays, 0);
  assert.equal(r('lift', 'some', 'beginner').runDays, 0);
  const b = r('both', 'new', 'beginner', 'equal');
  assert.deepEqual([b.runDays, b.liftDays, b.minRestDays, b.split, b.doublesAllowed], [3, 1, 2, 'full', false]);
  assert.deepEqual(b.trainingDays, { min: 4, max: 5 });
  const i = r('both', 'some', 'intermediate', 'equal');
  assert.deepEqual([i.runDays, i.liftDays, i.minRestDays], [3, 2, 1]);
  assert.equal(r('both', 'some', 'intermediate', 'lift').liftDays, 3);
  assert.equal(r('both', 'some', 'intermediate', 'run').runDays, 4);
  const a = r('both', 'experienced', 'advanced', 'lift');
  assert.ok(a.doublesAllowed && a.liftDays >= 3 && a.runDays >= 3 && a.runDays + a.liftDays <= 6);
  for (const use of USES) for (const rl of RUN_LEVELS) for (const ll of LIFT_LEVELS) for (const p of PRIORITIES) {
    const x = r(use, rl, ll, p);
    assert.ok(x.runDays + x.liftDays <= x.trainingDays.max, `${use} ${rl} ${ll} ${p}: ${x.runDays}+${x.liftDays}`);
    if (use !== 'lift') assert.ok(x.runDays >= 3);
    if (use !== 'run') assert.ok(x.liftDays >= 1 && x.liftDays <= (x.priority === 'lift' ? 4 : 3));
    assert.ok(x.reasons.length >= 2 && x.reasons.every((s) => s.endsWith('.') && !s.includes("'")));
    // the counts go into planWeek with no reduction when all 7 days are free
    const w = planWeek({ use, runLevel: rl, liftLevel: ll, priority: x.priority, availableDays: WEEK, runDays: x.runDays, liftDays: x.liftDays, doubles: false });
    assert.deepEqual(w.warnings, [], `${use} ${rl} ${ll} ${p}`);
  }
});
