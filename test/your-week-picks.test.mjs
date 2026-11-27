// Your week from direct picks (version 2.4): lift days + programme, run days + long-run day.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ws from '../src/plan/weekSetup.js';
import { buildPlan } from '../src/run/engine.js';
import { verdicts } from './engine-helpers.mjs';

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;
const near = (d, L) => [L, (L + 1) % 7, (L + 6) % 7, (L + 5) % 7].includes(d);

test("the owner's week: push, pull, legs on Mon, Wed, Fri, runs Tue, Thu, Sat", () => {
  const w = ws.weekFromPicks({ use: 'both', liftDays: [MON, WED, FRI], programme: 'ppl', runDays: [TUE, THU, SAT], longRunDay: SAT });
  assert.deepEqual(w.gymDays.map((g) => [g.day, g.name, g.intensity]), [[MON, 'Legs', 'heavy'], [WED, 'Push', 'heavy'], [FRI, 'Pull', 'heavy']]);
  assert.equal(w.longRunDay, SAT);
  assert.deepEqual(w.restDays, [SUN]);
  assert.deepEqual(w.doubles, []);
  assert.deepEqual(w.warnings, []);
  assert.ok(w.reasons.includes('Monday: Legs. It is 5 days before the long run.'));
});

test('leg days go away from the long run; a leg day that cannot be heavy is light, with a note', () => {
  const ul = ws.weekFromPicks({ use: 'both', liftDays: [WED, FRI], programme: 'upper-lower', runDays: [TUE, SAT], longRunDay: SAT });
  assert.deepEqual(ul.gymDays.map((g) => [g.day, g.type]), [[WED, 'lower'], [FRI, 'upper']], 'the lower day is Wednesday, not Friday (the day before the long run)');
  assert.equal(ul.gymDays[0].intensity, 'heavy');
  const fb = ws.weekFromPicks({ use: 'both', liftDays: [MON, FRI], programme: 'full', runDays: [TUE, THU, SAT], longRunDay: SAT });
  const fri = fb.gymDays.find((g) => g.day === FRI);
  assert.equal(fri.intensity, 'light');
  assert.match(fri.note, /the long run is the next day/);
  assert.ok(fb.reasons.some((r) => r.startsWith('Full body on Friday is light.')));
});

test('a run and a lift on one day: run first; no rest day gives a warning; few days for push, pull, legs give a warning', () => {
  const w = ws.weekFromPicks({ use: 'both', liftDays: [MON, TUE, WED, THU], programme: 'upper-lower', runDays: [TUE, FRI, SAT, SUN], longRunDay: SUN });
  assert.deepEqual(w.doubles, [{ day: TUE, first: 'run', gapHours: 6 }]);
  assert.ok(w.warnings.some((x) => /no rest day/.test(x)));
  const ppl2 = ws.weekFromPicks({ use: 'both', liftDays: [MON, WED], programme: 'ppl', runDays: [SAT], longRunDay: SAT });
  assert.ok(ppl2.gymDays.every((g) => g.type === 'upper'));
  assert.ok(ppl2.warnings.some((x) => /3 lift days or more/.test(x)));
});

test('lift only and run only', () => {
  const lift = ws.weekFromPicks({ use: 'lift', liftDays: [MON, WED, FRI], programme: 'full', runDays: [TUE] });
  assert.deepEqual(lift.runDays, []);
  assert.ok(lift.gymDays.every((g) => g.type === 'full' && g.intensity === 'heavy'));
  const run = ws.weekFromPicks({ use: 'run', liftDays: [MON], runDays: [TUE, THU, SUN] });
  assert.deepEqual(run.gymDays, []);
  assert.equal(run.longRunDay, SUN, 'no long-run pick: the weekend run day');
});

test('defaultPicks keeps an earlier week; picksToAnswers and toMasterRecord keep the programme and the names', () => {
  const prev = { runDays: [TUE, SAT], longRunDay: SAT, gymDays: [{ day: MON, type: 'legs' }, { day: THU, type: 'upper' }], liftProgramme: 'ppl' };
  const p = ws.defaultPicks('both', prev);
  assert.deepEqual([p.runDays, p.longRunDay, p.liftDays, p.programme], [[TUE, SAT], SAT, [MON, THU], 'ppl']);
  const w = ws.weekFromPicks(p);
  const a = ws.picksToAnswers(p, { experience: 'some', liftLevel: 'advanced' });
  const m = ws.toMasterRecord(w, a, {});
  assert.equal(m.liftProgramme, 'ppl');
  assert.equal(m.liftSplit, 'ppl');
  assert.ok(m.gymDays.every((g) => typeof g.name === 'string'));
  assert.equal(ws.guidedPrefill(m, 'advanced').presetKey, 'ppl');
  const fresh = ws.defaultPicks('both', null);
  assert.ok(fresh.runDays.length && fresh.liftDays.length && fresh.runDays.includes(fresh.longRunDay));
});

test('every picked week: heavy legs never near the long run, and the plan from it keeps every safety rule', () => {
  const sets = [[MON, WED, FRI], [MON, THU], [TUE, THU], [MON, TUE, THU, FRI], [WED], [MON, WED, FRI, SAT]];
  const runSets = [[TUE, THU, SAT], [TUE, SAT], [WED, SUN], [MON, WED, FRI, SUN], [TUE, THU, SAT, SUN]];
  const bad = [];
  let n = 0;
  for (const programme of ['full', 'upper-lower', 'ppl']) for (const liftDays of sets) for (const runDays of runSets) for (const L of runDays) {
    const w = ws.weekFromPicks({ use: 'both', liftDays, programme, runDays, longRunDay: L });
    for (const g of w.gymDays) if (g.type !== 'upper' && g.intensity === 'heavy' && near(g.day, L)) bad.push(`${programme} ${liftDays} ${runDays} L${L}: heavy legs on ${g.day}`);
    if (n++ % 3) continue; // build a plan for a third of the weeks (time)
    const plan = buildPlan({ goal: 'half', runDays: w.runDays, longRunDay: w.longRunDay, gymDays: w.gymDays, experience: 'some', currentWeeklyKm: 20, score: 36, today: '2026-11-25' });
    for (const s of plan.safety) if (!s.ok) bad.push(`${programme} ${liftDays} ${runDays} L${L}: ${s.id}: ${s.failures[0]}`);
    for (const [rule, f] of Object.entries(verdicts(plan))) if (f.length) bad.push(`${programme} ${liftDays} ${runDays} L${L}: verdict ${rule}: ${f[0]}`);
    if (plan.settings.effectiveLongRunDay !== L) bad.push(`${programme} ${liftDays} ${runDays} L${L}: long run moved`);
  }
  assert.ok(n > 250, `${n} weeks`);
  assert.deepEqual(bad.slice(0, 8), [], `${bad.length} failures`);
});
