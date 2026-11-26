// Hybrid adapt events (spec v1.1 section 4): unplannedSession, tired, and illness, injury and
// readiness on gym days. Every result must keep every safety check, and adapt must not change its input.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/run/engine.js';
import { verdicts, days, QUALITY, LONG } from './engine-helpers.mjs';

const TODAY = '2026-11-25'; // a Wednesday
const LEG = new Set(['legs', 'lower', 'full']);
const WEEK = E.planWeek({ use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 4, liftDays: 3, priority: 'equal', doubles: false, runLevel: 'some', liftLevel: 'intermediate' });
const PLAN = E.buildPlan({ goal: 'half', raceDate: '2027-04-18', runDays: WEEK.runDays, longRunDay: WEEK.longRunDay, gymDays: WEEK.gymDays, currentWeeklyKm: 30, score: 42, experience: 'some', today: TODAY });
const SNAPSHOT = JSON.stringify(PLAN);
const PLAN0 = PLAN;
const dayOf = (plan, iso) => days(plan).find((d) => d.iso === iso);
const heavyGym = (d) => !!(d && d.gym && d.gym.intensity === 'heavy' && d.gym.advice !== 'skip-heavy' && d.gym.advice !== 'rest');
const allOk = (plan) => plan.safety.every((s) => s.ok) && Object.values(verdicts(plan)).every((f) => f.length === 0);
const failText = (plan) => [...plan.safety.filter((s) => !s.ok).map((s) => `${s.id}: ${s.failures[0]}`), ...Object.entries(verdicts(plan)).filter(([, f]) => f.length).map(([k, f]) => `verdict ${k}: ${f[0]}`)].join('; ');

test('the base hybrid plan is safe and has gym days of every kind', () => {
  assert.ok(allOk(PLAN), failText(PLAN));
  const types = new Set(days(PLAN).filter((d) => d.gym).map((d) => d.gym.type));
  assert.ok(types.has('upper') && types.has('lower'));
});

const LIFTS = [
  { name: 'heavy legs', ev: { kind: 'lift', intensity: 'hard', areas: ['legs'], minutes: 60 } },
  { name: 'heavy full body', ev: { kind: 'lift', intensity: 'hard', areas: ['full'], minutes: 60 } },
  { name: 'light legs', ev: { kind: 'lift', intensity: 'easy', areas: ['legs'], minutes: 40 } },
  { name: 'heavy upper body', ev: { kind: 'lift', intensity: 'hard', areas: ['upper'], minutes: 50 } },
  { name: 'light upper body', ev: { kind: 'lift', intensity: 'easy', areas: ['upper'], minutes: 30 } },
];
const RUNS = [
  { name: 'hard run', ev: { kind: 'run', intensity: 'hard', areas: ['legs'], minutes: 45 } },
  { name: 'long run', ev: { kind: 'run', intensity: 'long', areas: ['legs'], minutes: 100 } },
  { name: 'long easy run', ev: { kind: 'run', intensity: 'easy', areas: ['legs'], minutes: 70 } },
  { name: 'short easy run', ev: { kind: 'run', intensity: 'easy', areas: ['legs'], minutes: 15 } },
];

// More hybrid plans from planWeek: a new runner with 2 full-body days, and an experienced runner with doubles.
const OTHER_PLANS = [
  { week: { use: 'both', availableDays: [1, 2, 4, 6, 0], runDays: 3, liftDays: 2, priority: 'run', doubles: false, runLevel: 'new', liftLevel: 'beginner' }, goal: 'keepfit', experience: 'new', currentWeeklyKm: 12 },
  { week: { use: 'both', availableDays: [0, 1, 2, 3, 4, 5, 6], runDays: 6, liftDays: 3, priority: 'lift', doubles: true, runLevel: 'experienced', liftLevel: 'advanced' }, goal: '10k', raceDate: '2027-03-07', experience: 'experienced', currentWeeklyKm: 45 },
].map((x) => {
  const w = E.planWeek(x.week);
  return E.buildPlan({ goal: x.goal, raceDate: x.raceDate, runDays: w.runDays, longRunDay: w.longRunDay, gymDays: w.gymDays, currentWeeklyKm: x.currentWeeklyKm, score: 40, experience: x.experience, today: TODAY });
});

test('unplannedSession: every case on every free day of 8 weeks keeps the safety checks and the rules of section 4', () => {
  const bad = [];
  let applied = 0, changed = 0;
  for (const PLAN of [PLAN0, ...OTHER_PLANS]) {
  const snap = JSON.stringify(PLAN);
  assert.ok(allOk(PLAN), failText(PLAN));
  const dates = days(PLAN).filter((d) => d.iso >= TODAY && d.iso <= E.addDays(TODAY, 56));
  for (const day of dates) {
    const D = day.iso;
    for (const { name, ev } of [...LIFTS, ...RUNS]) {
      if (ev.kind === 'lift' && day.gym) continue; // the app sends the event only for a day with no plan of that kind
      if (ev.kind === 'run' && E.isRun(day)) continue;
      const r = E.adapt(PLAN, { type: 'unplannedSession', date: D, ...ev }, { today: D });
      const tag = `${PLAN.goal}/${PLAN.settings.experience}: ${name} on ${D}`;
      applied++;
      if (r.refused || r.needsAnswers) { bad.push(`${tag}: refused ${r.reason}`); continue; }
      if (r.changes.length) changed++;
      if (!allOk(r.plan)) bad.push(`${tag}: ${failText(r.plan)}`);
      for (const c of r.changes) if (!c.reason || !c.reason.endsWith('.')) bad.push(`${tag}: change with no reason ${JSON.stringify(c)}`);
      if (!r.message) bad.push(`${tag}: no message`);
      const rec = dayOf(r.plan, D).unplanned;
      if (!rec || rec.at(-1).kind !== ev.kind || rec.at(-1).intensity !== ev.intensity) bad.push(`${tag}: the session is not recorded on the day`);
      const at = (k) => dayOf(r.plan, E.addDays(D, k));
      const was = (k) => dayOf(PLAN, E.addDays(D, k));
      const heavyLegsLift = ev.kind === 'lift' && ev.intensity !== 'easy' && (ev.areas.includes('legs') || ev.areas.includes('full'));
      if (heavyLegsLift) {
        for (const k of [0, 1]) if (at(k) && QUALITY.has(at(k).type)) bad.push(`${tag}: ${at(k).type} ${k} days after heavy legs`);
        for (const k of [0, 1, 2]) if (at(k) && LONG.has(at(k).type)) bad.push(`${tag}: long run ${k} days after heavy legs`);
        for (const k of [0, 1, 2]) {
          const w = was(k);
          if (w && (QUALITY.has(w.type) || LONG.has(w.type)) && (k <= 1 || LONG.has(w.type)) && !r.changes.some((c) => c.iso === w.iso && /Heavy legs need 48 hours/.test(c.reason))) bad.push(`${tag}: ${w.type} on ${w.iso} changed with no reason`);
        }
        if (at(1) && at(1).gym && LEG.has(at(1).gym.type) && heavyGym(at(1))) bad.push(`${tag}: heavy legs again the next day`);
      }
      if (ev.kind === 'lift' && !heavyLegsLift) {
        // no run change
        for (const d of days(r.plan)) { const o = dayOf(PLAN, d.iso); if (o.type !== d.type || o.km !== d.km) bad.push(`${tag}: run changed on ${d.iso}`); }
        if (ev.areas.includes('upper')) for (const k of [0, 1]) { const d = at(k); if (d && d.gym && d.gym.type === 'upper' && heavyGym(d) && !(k === 0)) bad.push(`${tag}: planned upper body on ${d.iso} is still heavy`); }
      }
      if (ev.kind === 'run' && ev.intensity !== 'easy') {
        for (const k of [0, 1]) if (at(k) && QUALITY.has(at(k).type)) bad.push(`${tag}: ${at(k).type} ${k} days after the ${name}`);
        for (const k of [0, 1]) if (at(k) && at(k).gym && LEG.has(at(k).gym.type) && heavyGym(at(k))) bad.push(`${tag}: heavy legs ${k} days after the ${name}`);
      }
      if (ev.kind === 'run' && ev.intensity === 'easy') {
        const diff = days(r.plan).filter((d) => { const o = dayOf(PLAN, d.iso); return o.type !== d.type || Math.abs(o.km - d.km) > 1e-9; });
        if (diff.length > 1) bad.push(`${tag}: ${diff.length} days changed`);
        for (const d of diff) {
          const o = dayOf(PLAN, d.iso); const k = E.daysBetween(D, d.iso);
          if (k < 1 || k > 2 || d.type !== o.type || d.km >= o.km) bad.push(`${tag}: wrong change on ${d.iso}`);
          if (d.km < 3 - 1e-9 || d.min < 20) bad.push(`${tag}: easy run is ${d.km} km / ${d.min} min`);
        }
        // no change when the week is still under its target
        const wk = r.plan.weeks.find((w) => w.days.some((x) => x.iso === D));
        const extra = wk.days.flatMap((x) => x.unplanned || []).reduce((s, u) => s + (u.km || 0), 0);
        const planned = PLAN.weeks.find((w) => w.startIso === wk.startIso);
        if (E.weekKm(planned) + extra <= planned.targetKm + 0.1 && diff.length) bad.push(`${tag}: changed although the week is under its target`);
      }
    }
  }
  assert.equal(JSON.stringify(PLAN), snap, 'adapt must not change the input plan');
  }
  assert.ok(applied > 450, `${applied} events`);
  assert.ok(changed > 60, `${changed} events changed the plan`);
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} failures`);
});

// a day pattern finder over the first weeks (after today)
const future = days(PLAN).filter((d) => d.iso > TODAY);
const findDay = (pred) => future.find((d, i) => pred(d, future[i + 1], future[i + 2], future[i - 1]));

test('unplannedSession: heavy legs the day before a quality run move the run or make it easy', () => {
  const q = findDay((d, n) => n && QUALITY.has(n.type) && !d.gym && !E.isRun(d));
  assert.ok(q, 'a free day before a quality run');
  const quality = dayOf(PLAN, E.addDays(q.iso, 1));
  const r = E.adapt(PLAN, { type: 'unplannedSession', kind: 'lift', date: q.iso, intensity: 'hard', areas: ['legs'], minutes: 60 }, { today: q.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  const after = dayOf(r.plan, quality.iso);
  assert.ok(!QUALITY.has(after.type));
  const moved = days(r.plan).find((d) => d.moved && d.moved.from === quality.iso);
  if (moved) assert.ok(E.daysBetween(q.iso, moved.iso) >= 2 && moved.type === quality.type);
  else assert.equal(after.type, 'easy');
  assert.ok(r.changes.some((c) => c.iso === quality.iso && /heavy leg session/.test(c.reason)));
  // the lift is on the plan day as a done gym session, so later moves respect it
  const home = dayOf(r.plan, q.iso);
  assert.ok(home.gym && home.gym.unplanned && home.gym.heavyLegs && home.gymDone);
  const laterHard = days(r.plan).find((d) => d.iso > E.addDays(q.iso, 3) && QUALITY.has(d.type));
  const back = E.checkMove(r.plan, laterHard.iso, E.addDays(q.iso, 1), q.iso);
  assert.equal(back.ok, false, 'a hard run cannot move to the day after the heavy legs');
  // only the key run changed: the other days of the week keep their distance
  for (const d of days(r.plan).filter((x) => x.iso > q.iso && x.iso <= E.addDays(q.iso, 6) && x.iso !== quality.iso && !(moved && x.iso === moved.iso))) assert.equal(d.km, dayOf(PLAN, d.iso).km, d.iso);
});

test('unplannedSession: heavy full body 2 days before the long run moves it or makes it easy', () => {
  const q = findDay((d, n, n2) => n2 && LONG.has(n2.type) && !d.gym);
  assert.ok(q);
  const long = dayOf(PLAN, E.addDays(q.iso, 2));
  const r = E.adapt(PLAN, { type: 'unplannedSession', kind: 'lift', date: q.iso, intensity: 'hard', areas: ['full'], minutes: 60 }, { today: q.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  assert.ok(!LONG.has(dayOf(r.plan, long.iso).type));
  for (const k of [0, 1, 2]) assert.ok(!LONG.has(dayOf(r.plan, E.addDays(q.iso, k)).type));
  assert.ok(r.changes.some((c) => c.iso === long.iso && c.reason.includes('72 hours before the long run')));
});

test('unplannedSession: a hard run makes the next hard run easy and the next heavy legs light', () => {
  const q = findDay((d, n) => n && QUALITY.has(n.type) && !E.isRun(d));
  const r = E.adapt(PLAN, { type: 'unplannedSession', kind: 'run', date: q.iso, intensity: 'hard', areas: ['legs'], minutes: 50 }, { today: q.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  const next = dayOf(r.plan, E.addDays(q.iso, 1));
  assert.equal(next.type, 'easy');
  assert.ok(r.changes.some((c) => c.iso === next.iso && /Hard days must not touch/.test(c.reason)));
  const g = findDay((d, n) => n && n.gym && LEG.has(n.gym.type) && heavyGym(n) && !E.isRun(d));
  assert.ok(g, 'a free day before a heavy leg day');
  const r2 = E.adapt(PLAN, { type: 'unplannedSession', kind: 'run', date: g.iso, intensity: 'long', areas: ['legs'], minutes: 100 }, { today: g.iso });
  assert.ok(allOk(r2.plan), failText(r2.plan));
  const legs = dayOf(r2.plan, E.addDays(g.iso, 1));
  assert.equal(legs.gym.advice, 'skip-heavy');
  assert.match(legs.gym.reason, /Heavy legs are light this time/);
  assert.ok(r2.changes.some((c) => c.kind === 'gym' && c.iso === legs.iso && c.after.endsWith('(light)')));
  assert.equal(r2.plan.gymAdvice.find((x) => x.iso === legs.iso).advice, 'skip-heavy');
});

test('unplannedSession: an easy run counts; the next easy run gets shorter only when the week is over its target', () => {
  const q = findDay((d, n) => n && n.type === 'easy' && n.km >= 5 && !E.isRun(d));
  assert.ok(q, 'a free day before an easy run');
  const ev = { type: 'unplannedSession', kind: 'run', date: q.iso, intensity: 'easy', areas: ['legs'], minutes: 60 };
  const r = E.adapt(PLAN, ev, { today: q.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  const before = dayOf(PLAN, E.addDays(q.iso, 1)); const after = dayOf(r.plan, before.iso);
  assert.ok(after.km < before.km && after.km >= 3 && after.min >= 20, `${before.km} -> ${after.km}`);
  assert.match(r.changes[0].reason, /not in the plan/);
  // the same run in a week with a higher target: no change
  const roomy = structuredClone(PLAN);
  roomy.weeks.find((w) => w.days.some((d) => d.iso === q.iso)).targetKm += 30;
  const r2 = E.adapt(roomy, ev, { today: q.iso });
  assert.deepEqual(r2.changes, []);
  assert.match(r2.message, /still at or under its target/);
  assert.equal(dayOf(r2.plan, before.iso).km, before.km);
});

test('unplannedSession: an upper-body lift makes a planned upper session within 48 hours light and changes no run', () => {
  const q = findDay((d, n) => n && n.gym && n.gym.type === 'upper' && heavyGym(n) && !d.gym);
  assert.ok(q, 'a free day before a heavy upper-body day');
  const r = E.adapt(PLAN, { type: 'unplannedSession', kind: 'lift', date: q.iso, intensity: 'hard', areas: ['upper'], minutes: 45 }, { today: q.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  const up = dayOf(r.plan, E.addDays(q.iso, 1));
  assert.equal(up.gym.advice, 'skip-heavy');
  assert.match(up.gym.reason, /upper body needs 48 hours/);
  for (const d of days(r.plan)) { const o = dayOf(PLAN, d.iso); assert.equal(d.type, o.type); assert.equal(d.km, o.km); }
  assert.equal(dayOf(r.plan, q.iso).gym.type, 'upper');
});

test('unplannedSession: bad input is refused, a date outside the plan changes nothing', () => {
  assert.equal(E.adapt(PLAN, { type: 'unplannedSession', kind: 'swim', date: TODAY }, { today: TODAY }).refused, true);
  const out = E.adapt(PLAN, { type: 'unplannedSession', kind: 'run', date: '2020-01-01', intensity: 'hard', areas: ['legs'], minutes: 30 }, { today: TODAY });
  assert.equal(out.plan, PLAN);
  assert.deepEqual(out.changes, []);
});

test('tired: today and tomorrow become easy; heavy lifting becomes light', () => {
  const hard = findDay((d, n) => (QUALITY.has(d.type) || LONG.has(d.type)) && n);
  const r = E.adapt(PLAN, { type: 'tired' }, { today: hard.iso });
  assert.ok(allOk(r.plan), failText(r.plan));
  assert.equal(dayOf(r.plan, hard.iso).type, 'easy');
  assert.ok(r.changes.some((c) => c.iso === hard.iso && /really tired/.test(c.reason)));
  const next = dayOf(r.plan, E.addDays(hard.iso, 1));
  assert.ok(!QUALITY.has(next.type) && !LONG.has(next.type));
  const gymDay = findDay((d) => heavyGym(d));
  const r2 = E.adapt(PLAN, { type: 'tired' }, { today: gymDay.iso });
  assert.ok(allOk(r2.plan), failText(r2.plan));
  assert.equal(dayOf(r2.plan, gymDay.iso).gym.advice, 'skip-heavy');
  assert.ok(r2.changes.some((c) => c.kind === 'gym' && /really tired/.test(c.reason)));
  const nextGym = dayOf(r2.plan, E.addDays(gymDay.iso, 1));
  if (nextGym.gym) assert.ok(!heavyGym(nextGym));
  // a quiet day: no change
  const quiet = findDay((d, n) => d.type === 'rest' && !d.gym && n && n.type === 'rest' && !n.gym);
  if (quiet) assert.deepEqual(E.adapt(PLAN, { type: 'tired' }, { today: quiet.iso }).changes, []);
  assert.equal(JSON.stringify(PLAN), SNAPSHOT);
});

test('illness, injury and readiness act on gym days', () => {
  const g = findDay((d) => heavyGym(d) && LEG.has(d.gym.type));
  const t = E.addDays(g.iso, -1);
  const sick = E.adapt(PLAN, { type: 'illness', answers: { where: 'below', fever: true } }, { today: t });
  assert.ok(allOk(sick.plan), failText(sick.plan));
  assert.equal(dayOf(sick.plan, g.iso).gym.advice, 'rest');
  assert.equal(dayOf(sick.plan, g.iso).gym.intensity, 'light');
  assert.equal(dayOf(sick.plan, g.iso).gym.plannedIntensity, 'heavy');
  assert.ok(sick.changes.some((c) => c.kind === 'gym' && c.iso === g.iso && c.after.endsWith('(rest)')));
  const cold = E.adapt(PLAN, { type: 'illness', answers: { where: 'above', fever: false } }, { today: t });
  assert.ok(allOk(cold.plan), failText(cold.plan));
  assert.equal(dayOf(cold.plan, g.iso).gym.advice, 'skip-heavy');
  const hurt = E.adapt(PLAN, { type: 'injury', answers: { area: 'knee', pain: 6, limping: true, worseNextMorning: false } }, { today: t });
  assert.ok(allOk(hurt.plan), failText(hurt.plan));
  const gyms = days(hurt.plan).filter((d) => d.gym && d.iso >= t && d.iso <= E.addDays(t, 13));
  assert.ok(gyms.length >= 4);
  for (const d of gyms) assert.ok(LEG.has(d.gym.type) ? d.gym.advice === 'rest' : d.gym.advice === 'skip-heavy' || d.gym.intensity === 'light', `${d.iso} ${d.gym.type} ${d.gym.advice}`);
  assert.match(hurt.message, /physio or doctor/);
  const mild = E.adapt(PLAN, { type: 'injury', answers: { area: 'calf', pain: 2, limping: false, worseNextMorning: false } }, { today: t });
  assert.ok(allOk(mild.plan), failText(mild.plan));
  assert.equal(dayOf(mild.plan, g.iso).gym.advice, 'skip-heavy');
  const low = E.adapt(PLAN, { type: 'readiness', score: 30 }, { today: g.iso });
  assert.ok(allOk(low.plan), failText(low.plan));
  assert.equal(dayOf(low.plan, g.iso).gym.advice, 'skip-heavy');
  const mid = E.adapt(PLAN, { type: 'readiness', score: 50 }, { today: g.iso });
  assert.equal(dayOf(mid.plan, g.iso).gym.advice, 'maintenance');
  const ok = E.adapt(PLAN, { type: 'readiness', score: 80 }, { today: g.iso });
  assert.equal(dayOf(ok.plan, g.iso).gym.advice, 'normal');
  assert.equal(JSON.stringify(PLAN), SNAPSHOT, 'adapt must not change the input plan');
});

test('a gym day that is done does not change, and a race week keeps its lifting rule after illness', () => {
  const g = findDay((d) => heavyGym(d));
  const P = structuredClone(PLAN);
  dayOf(P, g.iso).gymDone = { activityId: 'x', at: null };
  const r = E.adapt(P, { type: 'tired' }, { today: g.iso });
  assert.equal(dayOf(r.plan, g.iso).gym.advice, 'normal');
  const raceWeek = days(PLAN).filter((d) => d.gym && d.gym.advice === 'skip-heavy' && d.iso > E.addDays(PLAN.raceIso, -7));
  assert.ok(raceWeek.length);
  const sick = E.adapt(PLAN, { type: 'illness', answers: { where: 'below', fever: true } }, { today: E.addDays(raceWeek[0].iso, -1) });
  assert.ok(allOk(sick.plan), failText(sick.plan));
});

test('a changed week 1 keeps the week 1 limit: events do not cut the whole week, and the check stays honest', () => {
  const wk1 = (p) => p.weeks[0].days.map((d) => `${d.iso}:${d.km}`);
  const hard = PLAN.weeks[0].days.find((d) => QUALITY.has(d.type) && d.iso > TODAY);
  assert.ok(hard, 'week 1 has a quality run');
  for (const ev of [{ type: 'readiness', score: 30 }, { type: 'tired' }]) {
    const r = E.adapt(PLAN, ev, { today: hard.iso });
    assert.ok(allOk(r.plan), failText(r.plan));
    assert.equal(r.plan.weeks[0].disrupted, true);
    assert.ok(!r.changes.some((c) => /Week 1 is at most/.test(c.reason)), `${ev.type}: week 1 was cut`);
    const changedDays = wk1(r.plan).filter((x, i) => x !== wk1(PLAN)[i]);
    assert.ok(changedDays.length <= 2, `${ev.type}: ${changedDays}`);
  }
  // honest: a changed week 1 above the week 1 limit still fails
  const P = structuredClone(PLAN);
  P.weeks[0].disrupted = true;
  const easy = P.weeks[0].days.find((d) => d.type === 'easy' && d.iso > TODAY);
  const k = P.limits.week1MaxKm - E.weekKm(P.weeks[0]) + 3;
  easy.km += k; easy.steps[0].km = Math.round((easy.steps[0].km + k) * 10) / 10;
  E.reconcile(P);
  assert.equal(P.safety.find((s) => s.id === 'growth').ok, false);
  assert.ok(verdicts(P).growth.length > 0);
});
