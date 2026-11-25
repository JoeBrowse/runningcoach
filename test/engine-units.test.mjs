// Unit tests for the engine functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as E from '../src/run/engine.js';
import { verdicts, days, hardRun, isoAdd } from './engine-helpers.mjs';

const TODAY = '2026-11-25';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} vs ${b}`);
const halfPlan = (extra = {}) => E.buildPlan({ goal: 'half', raceDate: '2027-03-21', runDays: [1, 2, 4, 6, 0], longRunDay: 0, currentWeeklyKm: 30, score: 42, experience: 'some', today: TODAY, ...extra });
const allOk = (plan) => plan.safety.every((s) => s.ok) && Object.values(verdicts(plan)).every((f) => f.length === 0);

test('formatting helpers are units-aware', () => {
  assert.equal(E.fmtPace(312, 'km'), '5:12 /km');
  assert.equal(E.fmtPace(312, 'mi'), '8:22 /mi');
  assert.equal(E.fmtPace(299.6), '5:00 /km');
  assert.equal(E.fmtKm(10, 'mi'), '6.2 mi');
  assert.equal(E.fmtTime(6303), '1:45:03');
  assert.equal(E.fmtTime(2910), '48:30');
  assert.equal(E.fmtDate('2026-12-01'), 'Tue 1 Dec');
  assert.equal(E.addDays('2026-03-28', 2), '2026-03-30'); // across daylight saving time
  assert.equal(E.mondayOf('2026-11-29'), '2026-11-23');
  assert.equal(E.weekdayOf('2026-11-25'), 3);
});

test('fitness score: Daniels-Gilbert values and input validation', () => {
  near(E.fitnessScore(10, 48 * 60 + 30), 41.5, 0.2, '10K 48:30');
  near(E.fitnessScore(5, 20 * 60), 49.8, 0.3, '5K 20:00');
  assert.equal(E.fitnessScore(10, 22 * 60 + 30), null, '22:30 for 10K is not real');
  assert.equal(E.checkResult(10, 22 * 60 + 30).ok, false);
  assert.match(E.checkResult(10, 22 * 60 + 30).error, /Check the time/);
  assert.equal(E.fitnessScore(5, 26 * 60 * 0 + 11 * 60), null, '5K in 11 minutes is above the maximum');
  assert.equal(E.fitnessScore(5, 60 * 60), null, '5K in 60 minutes is below the minimum');
  assert.equal(E.fitnessScore(-1, 600), null);
  assert.equal(E.fitnessScore(10, NaN), null);
  assert.ok(E.isValidScore(40) && !E.isValidScore(90) && !E.isValidScore(10));
  assert.throws(() => E.paces(102.5), RangeError);
  assert.throws(() => E.buildPlan({ goal: '10k', score: 102.5, today: TODAY }), RangeError);
});

test('predict, riegel and predictions agree with the score', () => {
  const s = E.fitnessScore(10, 2910);
  near(E.predict(s, 10), 2910, 15, 'round trip');
  const pr = E.predictions(45);
  assert.deepEqual(pr.map((x) => x.name), ['5K', '10K', 'Half marathon', 'Marathon']);
  for (let i = 1; i < pr.length; i++) assert.ok(pr[i].sec > pr[i - 1].sec);
  near(E.riegel(1200, 5, 10), 2502, 2);
  const p = E.paces(45);
  assert.ok(p.rep < p.interval && p.interval < p.threshold && p.threshold < p.marathon && p.marathon < p.easyLo && p.easyLo < p.easyHi);
});

test('hrZones: karvonen, lthr and max; null when values are missing', () => {
  const k = E.hrZones({ maxHR: 190, restHR: 50 }, 'karvonen');
  assert.equal(k.length, 5); assert.equal(k[0].lo, 120); assert.equal(k[4].hi, 190);
  const l = E.hrZones({ lthr: 170 }, 'lthr'); assert.equal(l[3].lo, 162);
  const m = E.hrZones({ maxHR: 200 }, 'max'); assert.equal(m[1].lo, 120);
  assert.equal(E.hrZones({}, 'karvonen'), null);
  assert.equal(E.hrZones({ maxHR: 190 }, 'karvonen'), null);
  assert.equal(E.hrZones({ lthr: 30 }, 'lthr'), null);
});

test('heat, fuel, carb load and run/walk ladder', () => {
  assert.equal(E.heatAdjust({ tempC: 10, humidity: 50 }).pct, 0);
  assert.ok(E.heatAdjust({ tempC: 30, humidity: 80 }).pct >= 5);
  assert.equal(E.fuel({ min: 45 }).carbsPerHour, 0);
  assert.equal(E.fuel({ min: 120 }).carbsPerHour, 60);
  assert.equal(E.carbLoad(70).gramsPerDay, 560);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((l) => [E.runWalk(l).run, E.runWalk(l).walk]), [[60, 90], [90, 90], [120, 60], [180, 60], [300, 60], [480, 60], [600, 30]]);
  assert.ok(E.runWalk(8).continuous && E.runWalk(12).run === 1800);
});

test('buildPlan: run days, any long-run day, gym days and races are used', () => {
  const plan = E.buildPlan({ goal: '10k', raceDate: '2027-03-14', runDays: [1, 3, 5], longRunDay: 3, currentWeeklyKm: 20, score: 38, experience: 'some', today: TODAY, gymDays: [{ day: 2, type: 'upper', intensity: 'heavy', note: 'hypertrophy' }], races: [{ date: '2027-02-07', distKm: 5, priority: 'C', name: 'parkrun' }] });
  assert.ok(allOk(plan));
  for (const d of days(plan)) if (E.isRun(d) && d.type !== 'race') assert.ok([1, 3, 5].includes(d.dow), `run on ${d.iso}`);
  const longs = days(plan).filter((d) => d.type === 'long' || d.type === 'longfinish');
  assert.ok(longs.length > 5 && longs.every((d) => d.dow === 3), 'long run on Wednesday');
  assert.ok(days(plan).filter((d) => d.gym).every((d) => d.dow === 2 && d.gym.note === 'hypertrophy'));
  assert.equal(days(plan).find((d) => d.iso === '2027-02-07').type, 'race');
  assert.equal(plan.startIso, '2026-11-30');
});

test('week 1 respects current distance; the stated distance is not exceeded by 36%', () => {
  for (const cur of [10, 20, 35, 50]) for (const runDays of [[2, 4, 0], [1, 2, 4, 5, 6, 0]]) {
    const plan = E.buildPlan({ goal: 'half', raceDate: '2027-04-11', runDays, currentWeeklyKm: cur, score: 40, experience: 'some', today: TODAY });
    assert.ok(plan.weeks[0].km <= cur * 1.1 + 0.1, `${cur}: ${plan.weeks[0].km}`);
  }
});

test('far race: base block first, race kept, never cut to 30 weeks', () => {
  const plan = E.buildPlan({ goal: 'marathon', raceDate: '2027-10-10', runDays: [2, 4, 6, 0], currentWeeklyKm: 30, score: 40, today: TODAY });
  assert.ok(plan.weeks.length > 40);
  assert.equal(days(plan).find((d) => d.iso === '2027-10-10').type, 'race');
  assert.ok(plan.weeks[0].kind === 'base-block');
  assert.ok(allOk(plan));
  assert.throws(() => E.buildPlan({ goal: 'marathon', raceDate: '2029-10-10', today: TODAY }), /2 years/);
  assert.throws(() => E.buildPlan({ goal: 'marathon', raceDate: '2026-10-10', today: TODAY }), /past/);
});

test('no-date goals: rolling 4-week blocks with a cutback; extendPlan adds a block', () => {
  for (const goal of ['keepfit', 'faster5k', 'build10k']) {
    const plan = E.buildPlan({ goal, runDays: [2, 4, 6], currentWeeklyKm: 20, score: 40, today: TODAY });
    assert.equal(plan.raceIso, null);
    assert.equal(plan.weeks.length % 4, 0);
    plan.weeks.forEach((w, i) => assert.equal(w.cutback, i % 4 === 3));
    assert.ok(allOk(plan));
    const ext = E.extendPlan(plan);
    assert.equal(ext.weeks.length, plan.weeks.length + 4);
    assert.deepEqual(ext.weeks[0].days.map((d) => d.km), plan.weeks[0].days.map((d) => d.km));
    assert.ok(ext.safety.every((s) => s.ok));
  }
  const f5 = E.buildPlan({ goal: 'faster5k', runDays: [1, 3, 5, 6], currentWeeklyKm: 25, score: 42, today: TODAY });
  assert.ok(days(f5).some((d) => d.type === 'timetrial'), 'time trial in cutback weeks');
});

test('goal-race week, taper and recovery block', () => {
  const plan = halfPlan();
  const raceWeek = plan.weeks.find((w) => w.kind === 'race');
  assert.ok(raceWeek.days.some((d) => d.type === 'race' && d.race.goal));
  const taper = plan.weeks.filter((w) => w.kind === 'taper' || w.kind === 'race');
  assert.ok(taper.length === 2);
  for (const w of taper) assert.ok(w.trainingKm <= plan.peakKm * w.taperFrac + 0.1);
  const rec = plan.weeks.filter((w) => w.kind === 'recovery');
  assert.ok(rec.length >= 1);
  assert.ok(rec.flatMap((w) => w.days).every((d) => !hardRun(d)));
  assert.ok(plan.peakKm < raceWeek.km + 100 && plan.peakWeek !== raceWeek.n);
});

test('gym: heavy legs day before the long run is resolved; usesLift stops engine strength', () => {
  const plan = halfPlan({ runDays: [1, 3, 4, 6, 0], gymDays: [{ day: 6, type: 'legs', intensity: 'heavy' }] });
  assert.ok(plan.conflicts.length >= 1);
  assert.ok(allOk(plan));
  const lift = halfPlan({ usesLift: true });
  assert.equal(days(lift).filter((d) => d.type === 'strength' || d.extra).length, 0);
  const own = halfPlan({ usesLift: false });
  assert.ok(days(own).filter((d) => d.type === 'strength' || d.extra).length > 5);
});

test('gymAdvice: maintenance in the last 10 days, skip heavy in race week, normal before', () => {
  const plan = halfPlan({ gymDays: [{ day: 2, type: 'lower', intensity: 'heavy' }, { day: 5, type: 'upper', intensity: 'heavy' }] });
  const race = plan.raceIso;
  for (const g of plan.gymAdvice) {
    const k = E.daysBetween(g.iso, race);
    if (k >= 0 && k <= 6) assert.equal(g.advice, 'skip-heavy', g.iso);
    else if (k >= 7 && k <= 10) assert.notEqual(g.advice, 'normal', g.iso);
  }
  assert.ok(plan.gymAdvice.filter((g) => g.advice === 'normal').length > 10);
});

test('adapt: questions come before the change (illness, injury, break)', () => {
  const plan = halfPlan();
  for (const type of ['illness', 'injury', 'break']) {
    const r = E.adapt(plan, { type }, { today: '2026-12-08' });
    assert.equal(r.needsAnswers, true, type);
    assert.equal(r.plan, plan, `${type}: plan unchanged before answers`);
    assert.equal(r.changes.length, 0);
    assert.ok(r.questions.length >= 2);
  }
});

test('adapt: illness below the neck rests, above the neck keeps short easy runs', () => {
  const plan = halfPlan();
  const below = E.adapt(plan, { type: 'illness', answers: { where: 'below', fever: true } }, { today: '2026-12-08' });
  const d3 = days(below.plan).filter((d) => d.iso >= '2026-12-08' && d.iso < '2026-12-11');
  assert.ok(d3.every((d) => !E.isRun(d) || d.type === 'race'));
  assert.ok(allOk(below.plan));
  const above = E.adapt(plan, { type: 'illness', answers: { where: 'above', fever: false } }, { today: '2026-12-08' });
  assert.ok(days(above.plan).filter((d) => d.iso >= '2026-12-08' && d.iso < '2026-12-10' && E.isRun(d)).every((d) => d.type === 'easy' && d.km <= 5));
  assert.ok(above.changes.every((c) => c.reason));
});

test('adapt: severe injury keeps rest days as rest, adds a ladder that never leaks', () => {
  const plan = halfPlan();
  const r = E.adapt(plan, { type: 'injury', answers: { area: 'knee', pain: 6, limping: true, worseNextMorning: false } }, { today: '2026-12-08' });
  const before = new Map(days(plan).map((d) => [d.iso, d]));
  for (const d of days(r.plan).filter((x) => x.iso >= '2026-12-08' && x.iso <= '2026-12-21')) {
    if (before.get(d.iso).type === 'rest') assert.equal(d.type, 'rest', `${d.iso} rest stays rest`);
    assert.ok(!E.isRun(d), `${d.iso}: no running`);
  }
  assert.ok(r.plan.activeLadder && r.plan.activeLadder.stages.length === 6);
  assert.equal(r.followUps.length, 7, 'niggle follow-up for 7 days');
  assert.ok(allOk(r.plan));
  // the ladder ends on its end date
  const later = E.adapt(r.plan, { type: 'readiness', score: 80 }, { today: E.addDays(r.plan.activeLadder.endIso, 1) });
  assert.equal(later.plan.activeLadder, null);
  // and a new plan never copies it
  assert.equal(E.buildPlan({ ...r.plan.opts, today: '2026-12-08' }).activeLadder, null);
  // an unrelated plan does not get it
  const other = halfPlan({ goal: '10k', raceDate: '2027-03-14' });
  assert.equal(E.adapt(other, { type: 'readiness', score: 80 }, { today: '2026-12-08' }).plan.activeLadder, null);
});

test('adapt: mild injury, holiday, breaks, readiness, feedback and results', () => {
  const plan = halfPlan();
  const mild = E.adapt(plan, { type: 'injury', answers: { area: 'calf', pain: 2, limping: false, worseNextMorning: false } }, { today: '2026-12-08' });
  assert.ok(days(mild.plan).filter((d) => d.iso >= '2026-12-08' && d.iso < '2026-12-13' && E.isRun(d)).every((d) => d.type === 'easy' && d.km <= 4));
  const hol = E.adapt(plan, { type: 'holiday', fromIso: '2026-12-20', toIso: '2026-12-27', canRun: false }, { today: '2026-12-08' });
  assert.ok(days(hol.plan).filter((d) => d.iso >= '2026-12-20' && d.iso <= '2026-12-27').every((d) => d.type === 'rest'));
  assert.ok(allOk(hol.plan));
  const short = E.adapt(plan, { type: 'break', answers: { days: 3, cause: 'life' } }, { today: '2026-12-08' });
  assert.equal(short.changes.length, 0);
  const mid = E.adapt(plan, { type: 'break', answers: { days: 18, cause: 'life' } }, { today: '2026-12-08' });
  assert.ok(allOk(mid.plan));
  const after = mid.plan.weeks.find((w) => w.startIso === '2026-12-21');
  assert.ok(after.km < plan.weeks.find((w) => w.startIso === '2026-12-21').km, 'volume rebuilds slowly');
  const long = E.adapt(plan, { type: 'break', answers: { days: 45, cause: 'life', otherExercise: false } }, { today: '2026-12-08' });
  assert.ok(long.plan.limits.currentWeeklyKm < 15 && long.plan.score < plan.score);
  const tired = E.adapt(plan, { type: 'readiness', score: 30 }, { today: plan.weeks[1].days.find((d) => d.intensity === 'long').iso });
  assert.equal(tired.changes.length, 1);
  const hard = E.adapt(plan, { type: 'feedback', kind: 'tooHard' }, { today: '2026-12-08' });
  assert.equal(hard.plan.score, 41);
  assert.ok(hard.plan.paces.easy > plan.paces.easy);
  const res = E.adapt(plan, { type: 'result', distKm: 10, timeSec: 36 * 60 }, { today: '2026-12-08' });
  assert.equal(res.plan.score, 45, 'jump limited to +3');
  const bad = E.adapt(plan, { type: 'result', distKm: 10, timeSec: 22 * 60 + 30 }, { today: '2026-12-08' });
  assert.equal(bad.refused, true);
  for (const r of [mild, hol, mid, tired, hard, res]) assert.ok(r.plan.safety.every((s) => s.ok));
});

test('adapt: missed sessions are not made up; a missed long run moves only to a safe day', () => {
  const plan = halfPlan();
  const easy = days(plan).find((d) => d.type === 'easy' && d.iso > '2026-12-07');
  const r1 = E.adapt(plan, { type: 'missed', iso: easy.iso }, { today: easy.iso });
  assert.equal(days(r1.plan).find((d) => d.iso === easy.iso).type, 'rest');
  assert.equal(r1.changes[0].iso, easy.iso);
  assert.ok(r1.changes.every((c) => c.reason) && allOk(r1.plan));
  assert.ok(days(r1.plan).filter((d) => d.iso > easy.iso && E.mondayOf(d.iso) === E.mondayOf(easy.iso)).every((d) => d.km <= (days(plan).find((x) => x.iso === d.iso).km)), 'no make-up distance');
  const long = days(plan).find((d) => (d.type === 'long' || d.type === 'longfinish') && d.iso > '2026-12-07');
  const r2 = E.adapt(plan, { type: 'missed', iso: long.iso }, { today: long.iso });
  assert.ok(allOk(r2.plan));
  assert.ok(/moved|dropped/i.test(r2.message));
});

test('adapt: move across weeks, refuse unsafe moves with a reason, suggestDays marks safe days', () => {
  const plan = halfPlan();
  const q = days(plan).find((d) => d.intensity === 'hard' && d.iso > '2026-12-14');
  const s = E.suggestDays(plan, q.iso, { today: TODAY });
  assert.ok(s.days.length > 5);
  assert.ok(s.days.some((d) => !d.ok && /safety rule/.test(d.reason)));
  for (const iso of s.safe) {
    const r = E.adapt(plan, { type: 'move', fromIso: q.iso, toIso: iso }, { today: TODAY });
    assert.ok(!r.refused, r.reason); assert.ok(allOk(r.plan));
  }
  const long = days(plan).find((d) => d.type.startsWith('long') && d.iso > '2026-12-14');
  const bad = E.adapt(plan, { type: 'move', fromIso: q.iso, toIso: E.addDays(long.iso, -1) }, { today: TODAY });
  if (E.addDays(long.iso, -1) !== q.iso) { assert.equal(bad.refused, true); assert.match(bad.reason, /safety rule/); }
  const past = E.adapt(plan, { type: 'move', fromIso: q.iso, toIso: '2026-11-01' }, { today: TODAY });
  assert.equal(past.refused, true);
  const race = E.adapt(plan, { type: 'move', fromIso: plan.raceIso, toIso: E.addDays(plan.raceIso, -1) }, { today: TODAY });
  assert.equal(race.refused, true);
  // a move into another week is possible when it is safe
  const cross = days(plan).filter((d) => d.type === 'easy' && d.dow === 6 && d.iso > '2026-12-14')[0];
  if (cross) { const sd = E.suggestDays(plan, cross.iso, { today: TODAY }); assert.ok(sd.days.some((d) => E.mondayOf(d.iso) !== E.mondayOf(cross.iso))); }
});

test('adapt: drop, leg-heavy day swap offer, repeat week', () => {
  const plan = halfPlan();
  const q = days(plan).find((d) => d.intensity === 'hard' && d.iso > '2026-12-14');
  const dr = E.adapt(plan, { type: 'drop', iso: q.iso }, { today: TODAY });
  assert.equal(days(dr.plan).find((d) => d.iso === q.iso).type, 'rest');
  assert.equal(E.adapt(plan, { type: 'drop', iso: plan.raceIso }, { today: TODAY }).refused, true);
  const legs = E.adapt(plan, { type: 'legHeavyDay', iso: E.addDays(q.iso, -1) }, { today: TODAY });
  assert.ok(legs.offers.length >= 1);
  assert.ok(legs.offers.every((o) => o.reason.length > 20));
  assert.equal(legs.plan, plan, 'offer only, no change');
  const applied = E.adapt(plan, { type: 'legHeavyDay', iso: E.addDays(q.iso, -1), apply: true }, { today: TODAY });
  assert.ok(applied.plan.safety.every((s) => s.ok));
  const rw = E.buildPlan({ goal: 'runwalk', runDays: [2, 4, 6], experience: 'new', today: TODAY });
  const rep = E.adapt(rw, { type: 'repeatWeek', weekN: 2 }, { today: TODAY });
  const lv = (p, n) => Math.max(...p.weeks[n - 1].days.filter((d) => d.type === 'runwalk').map((d) => d.runWalk.level));
  assert.equal(lv(rep.plan, 3), lv(rw, 2), 'week 3 repeats the level of week 2');
  assert.ok(rep.plan.safety.every((s) => s.ok));
});

test('afterRace, goalGap and timeTrialDue', () => {
  const plan = halfPlan({ goalTimeSec: 6300 });
  const ar = E.afterRace(plan, { iso: '2027-01-10', distKm: 10, timeSec: 46 * 60, rpe: 9 });
  assert.equal(ar.recoveryDays, 5);
  assert.deepEqual(ar.options.map((o) => o.id), ['rejoin', 'newGoal', 'keepfit']);
  assert.ok(ar.days.every((d) => !hardRun(d)));
  assert.ok(ar.plan.safety.every((s) => s.ok));
  const g = E.goalGap(plan);
  assert.ok(g.hasGoal && Number.isFinite(g.gapSec) && ['on-track', 'close', 'behind'].includes(g.status));
  assert.equal(E.goalGap(halfPlan()).hasGoal, false);
  assert.equal(E.timeTrialDue(plan, '2026-12-10').due, false);
  assert.equal(E.timeTrialDue(plan, '2027-01-20').due, true);
});

test('seedFromHistory: race or time trial first, no threshold sessions, a 12-week window', () => {
  const acts = [
    { id: 'old', iso: '2026-05-01', km: 10, sec: 38 * 60, title: '10K race' }, // too old
    { id: 'thr', iso: '2026-11-10', km: 8, sec: 33 * 60, title: 'Threshold 3x10', type: 'tempo' },
    { id: 'rep', iso: '2026-11-12', km: 1, sec: 200, title: '1 km rep' },
    { id: 'race', iso: '2026-10-25', km: 10, sec: 46 * 60, title: 'Autumn 10K', isRace: true },
    { id: 'e1', iso: '2026-11-20', km: 8, sec: 46 * 60, title: 'Easy run' },
    { id: 'e2', iso: '2026-11-15', km: 15, sec: 90 * 60, title: 'Long run' },
    { id: 'e3', iso: '2026-11-05', km: 6, sec: 35 * 60, title: 'Easy run' },
    { id: 'gps', iso: '2026-11-18', km: 10, sec: 20 * 60, title: 'Easy run' }, // GPS fault
    { id: 'bike', iso: '2026-11-19', km: 40, sec: 90 * 60, type: 'ride' },
  ];
  const s = E.seedFromHistory(acts, TODAY);
  assert.equal(s.scoreRun.id, 'race');
  assert.equal(s.scoreSource, 'race');
  near(s.score, E.fitnessScore(10, 46 * 60), 0.01);
  assert.ok(!s.runsUsed.score.some((r) => ['old', 'thr', 'rep', 'gps'].includes(r.id)));
  assert.equal(s.currentWeeklyKm, Math.round(((8 + 15 + 1 + 8 + 6) / 4) * 10) / 10, 'the GPS fault is not counted');
  assert.ok(s.runsUsed.volume.length >= 4 && !s.runsUsed.volume.some((r) => r.id === 'bike'));
  assert.ok(s.peakWeeks.length >= 1);
  assert.ok(s.notes.some((n) => /2:30/.test(n)), 'the GPS fault is reported');
  const noRace = E.seedFromHistory(acts.filter((a) => a.id !== 'race'), TODAY);
  assert.equal(noRace.scoreSource, 'training');
  assert.ok(noRace.notes.some((n) => /time trial/.test(n)));
  assert.equal(E.seedFromHistory([], TODAY).score, null);
});

test('load: RPE x minutes (Iron Log scale), HR mapping, Banister series', () => {
  assert.equal(E.sessionLoad({ rpe: 6, min: 50 }), 300);
  assert.equal(E.sessionLoad({ rpe: 3, sec: 3600 }), 180);
  const hr = E.sessionRpe({ avgHR: 150, maxHR: 190, restHR: 50, min: 60 });
  assert.equal(hr.source, 'hr'); assert.ok(hr.rpe > 3 && hr.rpe < 6);
  assert.equal(E.rpeFromHR(190, 190, 50), 10);
  assert.equal(E.sessionRpe({ type: 'intervals', min: 50 }).source, 'type');
  const acts = Array.from({ length: 120 }, (_, i) => ({ iso: E.addDays(TODAY, -i), rpe: 5, min: 60 }));
  const series = E.loadSeries(acts, 30, TODAY);
  assert.equal(series.length, 30);
  assert.equal(series[29].iso, TODAY);
  near(series[29].fitness, 300, 20, 'fitness approaches the daily load');
  near(series[29].fatigue, 300, 1);
  const spike = E.loadSeries([...acts.slice(10), { iso: TODAY, rpe: 9, min: 180 }], 10, TODAY);
  assert.ok(spike[9].form < 0, 'form drops after a big day');
  assert.match(E.LOAD_NOTE, /information only/);
});

test('easyHardSplit says which method it used', () => {
  assert.equal(E.easyHardSplit([{ min: 60, zoneSec: [600, 2400, 300, 300, 0] }]).method, 'hr-zones');
  const z = E.easyHardSplit([{ min: 60, zoneSec: [600, 2400, 300, 300, 0] }]); assert.equal(z.easyMin, 50); assert.equal(z.hardMin, 10);
  assert.equal(E.easyHardSplit([{ min: 40, avgHR: 135, maxHR: 190, restHR: 50 }]).method, 'hr-average');
  const t = E.easyHardSplit([{ min: 40, type: 'easy' }, { min: 50, type: 'intervals' }]);
  assert.equal(t.method, 'session-type'); assert.equal(t.hardMin, 20);
  assert.equal(E.easyHardSplit([{ min: 40, type: 'easy' }, { min: 60, zoneSec: [0, 3600, 0, 0, 0] }]).method, 'mixed');
});

test('weekStreak counts weeks; rest days and an empty current week do not break it', () => {
  const acts = [{ iso: '2026-11-02' }, { iso: '2026-11-11' }, { iso: '2026-11-16' }, { iso: '2026-11-22' }];
  assert.deepEqual(E.weekStreak(acts, TODAY).weeks, 3);
  assert.equal(E.weekStreak(acts, TODAY).thisWeekDone, false);
  assert.equal(E.weekStreak([...acts, { iso: '2026-11-24' }], TODAY).weeks, 4);
  assert.equal(E.weekStreak([{ iso: '2026-10-01' }], TODAY).weeks, 0);
});

test('audio cues and simulation: units, effort words, walk pace, treadmill', () => {
  const plan = halfPlan();
  const q = days(plan).find((d) => d.type === 'intervals' || d.type === 'cruise' || d.type === 'tempo');
  assert.ok(E.audioCues(q, 'mi').some((c) => /per mile/.test(c.text)));
  assert.ok(E.audioCues(q, 'km').some((c) => /per kilometre/.test(c.text)));
  const rw = E.buildPlan({ goal: 'runwalk', runDays: [2, 4, 6], experience: 'new', today: TODAY });
  const s = rw.weeks[0].days.find((d) => d.type === 'runwalk');
  const cues = E.audioCues(s, 'km');
  assert.ok(cues.every((c) => !/per kilometre/.test(c.text)), 'beginners hear effort words');
  assert.ok(cues.some((c) => /slowly enough to talk/.test(c.text)));
  const sim = E.simulateRun(s, { units: 'mi', paceSec: 480 });
  const walkTicks = sim.ticks.filter((t) => t.walk);
  assert.ok(walkTicks.length > 5 && walkTicks.every((t) => t.pace > 600), 'walk steps at walking pace');
  assert.ok(sim.ticks.every((t) => Math.abs(t.dist - t.km / E.KM_PER_MI) < 0.002));
  const tm = E.simulateRun(q, { treadmill: true, units: 'km' });
  assert.ok(tm.treadmill && tm.cues.some((c) => /treadmill to [\d.]+ km\/h/.test(c.text)));
});

test('export: ICS, GPX, CSV and workout JSON (whole-second paces)', () => {
  const plan = halfPlan();
  const ics = E.toICS(plan);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR') && ics.includes('\r\nEND:VCALENDAR'));
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75));
  const gpx = E.toGPX({ name: 'Run & <fun>', track: [{ lat: 51.5, lon: -0.1, ele: 12, time: '2026-11-20T08:00:00Z' }] });
  assert.ok(gpx.includes('Run &amp; &lt;fun&gt;') && gpx.includes('lat="51.500000"'));
  assert.ok(E.toGPX(E.loopRoute(5, 2)).includes('<trkpt'));
  const csv = E.toCSV([{ iso: '2026-11-20', type: 'easy', title: 'Easy, slow', km: 8, min: 45.5, rpe: 3 }]);
  const row = csv.split('\n')[1];
  assert.ok(row.includes('"Easy, slow"') && row.includes(',341,'));
  const q = days(plan).find((d) => d.intensity === 'hard');
  const json = JSON.parse(E.toWorkoutJSON(q));
  const pacesIn = JSON.stringify(json).match(/"paceSecPerKm":[\d.]+/g);
  assert.ok(pacesIn.length > 0 && pacesIn.every((x) => !x.includes('.')));
});

test('coach answers from the real plan and dates', () => {
  const plan = halfPlan({ races: [{ date: '2027-02-14', distKm: 10, priority: 'B', name: 'Winter 10K' }], gymDays: [{ day: 2, type: 'legs', intensity: 'heavy' }] });
  assert.match(E.coachAnswer('I have a 10K B race in 3 weeks', { plan, today: TODAY }).text, /Winter 10K on Sun 14 Feb/);
  assert.match(E.coachAnswer('How should I recover after my race?', { plan, today: '2027-03-25' }).text, /Half marathon/);
  assert.match(E.coachAnswer('Should I skip the gym before my race?', { plan, today: TODAY }).text, /Sun 21 Mar/);
  assert.match(E.coachAnswer('why is today easy?', { plan, today: '2026-12-01' }).text, /Today is/);
  assert.match(E.coachAnswer('can I move my run?', { plan, today: TODAY }).text, /safe|no other/);
  assert.ok(E.coachAnswer('hello', {}).text.length > 20);
});

test('sample data is clearly marked and safe', () => {
  const s = E.sample(TODAY);
  assert.equal(s.sample, true); assert.equal(s.plan.sample, true); assert.equal(s.profile.sample, true);
  assert.ok(s.history.length > 20 && s.history.every((a) => a.sample === true));
  assert.ok(s.plan.safety.every((c) => c.ok));
});

test('engine source avoids trademarked names and browser globals', () => {
  const dir = new URL('../src/run/engine/', import.meta.url);
  const files = [new URL('../src/run/engine.js', import.meta.url), ...readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => new URL(f, dir))];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/\bTSS\b|Training Stress Score|Normali[sz]ed Power|Intensity Factor|VDOT/i.test(src.replace(/Never use the names TSS or VDOT in this engine\./, '')), `${f.pathname} uses a trademarked name`);
    assert.ok(!/\bwindow\.|\bdocument\.|localStorage/.test(src), `${f.pathname} uses a browser global`);
  }
});

test('dates: a race inside the lead-in week is still in the plan', () => {
  const plan = E.buildPlan({ goal: '5k', raceDate: '2026-11-28', runDays: [2, 4, 6], currentWeeklyKm: 20, score: 40, today: TODAY });
  assert.equal(days(plan).find((d) => d.iso === '2026-11-28').type, 'race');
  assert.ok(days(plan).filter((d) => d.iso < TODAY).every((d) => d.type === 'rest'));
  assert.ok(plan.safety.every((c) => c.ok));
  assert.equal(isoAdd('2026-12-31', 1), '2027-01-01');
});
