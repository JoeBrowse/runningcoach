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
  // 2 rest days for a new runner, or for a beginner who only lifts. A new lifter who runs keeps 1.
  const beginner = (c.use !== 'lift' && c.runLevel === 'new') || (c.use === 'lift' && c.liftLevel === 'beginner');
  const restMin = beginner ? 2 : 1;
  const maxTrain = Math.min(c.availableDays.length, 7 - restMin);
  const lightStart = c.use === 'both' && c.liftLevel === 'beginner';
  let capR = c.use === 'lift' ? 0 : c.runDays;
  if (c.runLevel === 'new') capR = Math.min(capR, 5);
  let capL = c.use === 'run' ? 0 : c.liftDays;
  if (capL > 4) capL = prio === 'lift' ? 4 : 3;
  else if (capL === 4 && prio !== 'lift') capL = 3;
  return { prio, restMin, maxTrain, capR, capL, lightStart };
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
  // room for a hard run (the same test as buildPlan uses to choose quality days).
  // With running priority, a leg day becomes light before a hard-run day is lost.
  if (w.runDays.length >= 2) {
    const geo = w.runDays.filter((d) => d !== L && cdist(d, L) >= 2);
    const clean = geo.filter((d) => ![plus(d, -1), d, plus(d, 1)].some((x) => heavy.includes(x)));
    if (e.prio === 'run' && c.runLevel !== 'new' && geo.length && !clean.length) f.push('running priority, but no run day is free for a hard run');
    if (geo.length && !clean.length && !w.reasons.some((r) => r.startsWith('All your runs stay easy.'))) f.push('runs stay easy with no reason');
  }
  // a new lifter who also runs: no heavy session
  if (e.lightStart && w.gymDays.some((g) => g.intensity === 'heavy')) f.push('heavy session for a new lifter who runs');
  // runs spread: no 3 runs in a row and no run the day after the long run for a new runner,
  // when every day is free and the week has 3 runs or fewer
  if (c.availableDays.length === 7 && w.runDays.length <= 3) {
    for (const d of WEEK) if ([d, plus(d, 1), plus(d, 2)].every((x) => w.runDays.includes(x))) f.push(`3 runs in a row from ${d}`);
    if (c.runLevel === 'new' && L != null && w.runDays.includes(plus(L, 1))) f.push('a new runner runs the day after the long run');
  }
  // doubles: the days with a run and a lift
  const pairs = w.runDays.filter((d) => gymDays.includes(d));
  if (pairs.join() !== w.doubles.map((d) => d.day).join()) f.push(`doubles ${w.doubles.map((d) => d.day)} are not the shared days ${pairs}`);
  for (const d of w.doubles) {
    if (d.gapHours !== 6) f.push('gapHours is not 6');
    if (d.first !== (e.prio === 'lift' ? 'lift' : 'run')) f.push(`first is ${d.first}, priority ${e.prio}`);
  }
  // "No" to two sessions on one day is firm (one available day is the only exception, and it drops a side)
  if (!c.doubles && pairs.length) f.push(`no doubles, but day ${pairs[0]} has a run and a lift`);
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
  // honest texts
  if (w.reasons.some((r) => /72 hours or more before the long run/.test(r))) f.push('reason claims 72 hours from calendar days');
  if (c.use === 'lift' && w.reasons.some((r) => /\bruns?\b/.test(r))) f.push('lift only, but a reason talks about runs');
  if (c.use !== 'lift' && c.runLevel === 'new' && w.reasons.some((r) => /can have a hard run/.test(r))) f.push('a new runner is told about a hard run');
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
    if (expectations(c).prio === 'run' && c.runLevel !== 'new' && free.get(fk) >= 1 && plan.settings.qualityDays.length < 1) bad.push(`${tag} :: running priority, but no quality day is left`);
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} failures`);
});

test('planWeek: an example week with reasons', () => {
  const w = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 4, liftDays: 3, priority: 'equal', doubles: true, runLevel: 'some', liftLevel: 'intermediate' });
  assert.equal(w.longRunDay, 0);
  assert.equal(w.split, 'upper-lower-upper');
  const lower = w.gymDays.find((g) => g.type === 'lower');
  assert.equal(lower.intensity, 'heavy');
  assert.ok(![6, 5, 0, 1].includes(lower.day), 'lower body is 3 or more days before the long run');
  assert.ok(w.reasons.some((r) => r === `Lower body is on ${NAMES[lower.day]}. The long run is on Sunday, ${(7 - lower.day) % 7} days later.`), w.reasons.join('\n'));
  assert.ok(w.reasons.includes('Heavy legs are 3 or more days before the long run, and not on the day after it.'));
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

test('planWeek: 4 lift days only with lifting priority; no doubles means no shared day', () => {
  const w4 = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 3, liftDays: 4, priority: 'equal', doubles: false, runLevel: 'some', liftLevel: 'advanced' });
  assert.equal(w4.gymDays.length, 3);
  assert.match(w4.warnings.join(' '), /4 lift days are only for people who make lifting the priority/);
  const l4 = planWeek({ use: 'lift', availableDays: [0, 1, 2, 3, 4, 5, 6], liftDays: 4, liftLevel: 'advanced' });
  assert.equal(l4.split, 'upper-lower');
  assert.deepEqual(l4.runDays, []);
  assert.equal(l4.longRunDay, null);
  const fit = planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 3, liftDays: 3, priority: 'run', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.deepEqual(fit.doubles, [], 'the sessions fit, so no day has two sessions');
  // 6 sessions on 5 days with no doubles: one session goes (lifting, because running is the priority). No shared day.
  const tight = planWeek({ use: 'both', availableDays: [1, 2, 3, 4, 5], runDays: 3, liftDays: 3, priority: 'run', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.deepEqual(tight.doubles, []);
  assert.deepEqual([tight.runDays.length, tight.gymDays.length], [3, 2]);
  assert.ok(tight.warnings.some((x) => x.startsWith('Too many sessions for your days. We reduced lifting to 2.')));
  assert.ok(!tight.reasons.some((r) => /shares a day/.test(r)));
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

/* ---------- personas (the review of 27 November 2026) ----------
   Each persona had a fault in the old planner. The comment says which one. */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6;
const inRow3 = (runs) => WEEK.some((d) => [d, plus(d, 1), plus(d, 2)].every((x) => runs.includes(x)));
const heavyLegDays = (w) => w.gymDays.filter((g) => LEG.has(g.type) && g.intensity === 'heavy').map((g) => g.day);
const qualityDays = (w) => w.runDays.filter((d) => d !== w.longRunDay && cdist(d, w.longRunDay) >= 2 && ![plus(d, -1), d, plus(d, 1)].some((x) => heavyLegDays(w).includes(x)));

test('persona: runner who lifts, 2 runs and 2 lifts, equal priority (runs were back to back before the long run)', () => {
  const base = { use: 'both', availableDays: ALL_DAYS, runDays: 2, liftDays: 2, priority: 'equal', doubles: true, runLevel: 'some', liftLevel: 'intermediate', longRunDay: SAT };
  const w = planWeek(base);
  assert.deepEqual(w.runDays, [TUE, SAT]);
  assert.deepEqual(w.gymDays.map((g) => [g.day, g.type, g.intensity]), [[MON, 'full', 'heavy'], [WED, 'full', 'heavy']]);
  assert.ok(w.reasons.some((r) => r.startsWith('All your runs stay easy. A hard run on Tuesday would be next to a heavy leg day.')));
  assert.ok(w.reasons.includes('Lift early in the day on Wednesday. Then the long run is 72 hours or more later.'));
  // the priority changes the week: with running priority, one leg day is light and a hard run fits
  const run = planWeek({ ...base, priority: 'run' });
  assert.equal(qualityDays(run).length, 1);
  assert.ok(run.gymDays.some((g) => g.intensity === 'light'));
  assert.notDeepEqual(run.gymDays, w.gymDays);
  // 3 runs: spread over the week, not 3 in a row
  const three = planWeek({ ...base, runDays: 3 });
  assert.ok(!inRow3(three.runDays), `runs ${three.runDays}`);
  assert.ok(!three.runDays.includes(SUN), 'no run the day after the long run');
});

test('persona: returning runner aged 55, new runner and new lifter (3 runs in a row and heavy lifts before)', () => {
  const w = planWeek({ use: 'both', availableDays: ALL_DAYS, runDays: 3, liftDays: 2, priority: 'run', doubles: false, runLevel: 'new', liftLevel: 'beginner' });
  assert.ok(!inRow3(w.runDays), `runs ${w.runDays}`);
  for (const a of w.runDays) for (const b of w.runDays) if (a !== b) assert.ok(cdist(a, b) >= 2, `runs on alternate days: ${w.runDays}`);
  assert.ok(w.gymDays.every((g) => g.intensity === 'light'));
  assert.ok(w.restDays.length >= 2);
  assert.ok(w.reasons.some((r) => r.includes('because you are new to lifting')));
  assert.ok(w.reasons.some((r) => r.startsWith('New runners start with easy runs.')));
});

test('persona: experienced runner who is new to the gym keeps 6 runs and 1 rest day (lost a run before)', () => {
  const w = planWeek({ use: 'both', availableDays: ALL_DAYS, runDays: 6, liftDays: 2, priority: 'run', doubles: true, runLevel: 'experienced', liftLevel: 'beginner', longRunDay: SUN });
  assert.equal(w.runDays.length, 6);
  assert.equal(w.gymDays.length, 2);
  assert.equal(w.restDays.length, 1);
  assert.ok(w.gymDays.every((g) => g.intensity === 'light'), 'the first lift sessions are light');
  assert.ok(qualityDays(w).length >= 2);
  assert.deepEqual(w.warnings, []);
});

test('persona: gym regular who starts to run, "no" to two sessions on one day (a shared day was planned before)', () => {
  const w = planWeek({ use: 'both', availableDays: ALL_DAYS, runDays: 2, liftDays: 4, priority: 'lift', doubles: false, runLevel: 'new', liftLevel: 'advanced' });
  assert.deepEqual(w.doubles, []);
  assert.equal(w.gymDays.length, 4, 'lifting is the priority');
  assert.equal(w.runDays.length, 1);
  assert.ok(w.warnings.some((x) => x.startsWith('Too many sessions for your days. We reduced running to 1. Lifting is your priority. New runners need at least 2 rest days a week.')));
});

test('persona: marathon runner with running priority gets 2 hard-run days', () => {
  const w = planWeek({ use: 'both', availableDays: ALL_DAYS, runDays: 5, liftDays: 2, priority: 'run', doubles: false, runLevel: 'experienced', liftLevel: 'intermediate', longRunDay: SUN });
  assert.equal(w.runDays.length, 5);
  const q = qualityDays(w);
  assert.ok(q.some((a) => q.some((b) => cdist(a, b) >= 2)), `hard-run days ${q}`);
});

test('persona: the other weeks of the review stay as good as before', () => {
  // Couch to 5K: runs on alternate days
  const c25 = planWeek({ use: 'run', availableDays: [MON, WED, FRI, SAT, SUN], runDays: 3, runLevel: 'new' });
  assert.deepEqual(c25.runDays, [WED, FRI, SUN]);
  assert.ok(!c25.reasons.some((r) => /can have a hard run/.test(r)));
  // Hybrid race athlete: the shared day is an easy run and upper body, run first
  const hyb = planWeek({ use: 'both', availableDays: ALL_DAYS, runDays: 4, liftDays: 3, priority: 'equal', doubles: true, runLevel: 'experienced', liftLevel: 'advanced' });
  assert.equal(hyb.doubles.length, 1);
  assert.equal(hyb.gymDays.find((g) => g.day === hyb.doubles[0].day).type, 'upper');
  assert.equal(qualityDays(hyb).length >= 1, true);
  // Busy parent: 3 days, one lift is cut with a warning
  const bp = planWeek({ use: 'both', availableDays: [TUE, THU, SAT], runDays: 2, liftDays: 2, priority: 'equal', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
  assert.deepEqual([bp.runDays, bp.gymDays.map((g) => g.day)], [[THU, SAT], [TUE]]);
  // Lifter only: no text about runs
  const lo = planWeek({ use: 'lift', availableDays: [MON, TUE, WED, THU, FRI], liftDays: 4, liftLevel: 'intermediate' });
  assert.ok(!lo.reasons.some((r) => /\bruns?\b/.test(r)), lo.reasons.join(' '));
  assert.ok(cdist(...lo.gymDays.filter((g) => g.type === 'lower').map((g) => g.day)) >= 2);
});
