// Property tests: build many plans and check the safety rules on the real planned days.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, GOALS, safetyChecks } from '../src/run/engine.js';
import { verdicts, CHECK_MAP, days, isRun, hardRun, heavyLegs, LONG, QUALITY, isoAdd, weekKm } from './engine-helpers.mjs';

const TODAY = '2026-11-25'; // a Wednesday
const DAYSETS = { 2: [3, 0], 3: [2, 4, 0], 4: [2, 3, 5, 0], 5: [1, 2, 4, 5, 6], 6: [1, 2, 3, 4, 5, 0], 7: [0, 1, 2, 3, 4, 5, 6] };
const GYMS = {
  none: [],
  heavyLegs: [{ day: 3, type: 'legs', intensity: 'heavy', note: 'strength' }],
  upperLower: [{ day: 1, type: 'upper', intensity: 'heavy' }, { day: 4, type: 'lower', intensity: 'heavy' }, { day: 5, type: 'full', intensity: 'light' }],
};
const EXPS = ['new', 'some', 'experienced'];
const B_DIST = [5, 10, 21.1];

function racePlusWeeks(w, extraDays = 6) { return isoAdd('2026-11-30', w * 7 + extraDays); }

function cases() {
  const out = [];
  let k = 0;
  for (const goal of Object.keys(GOALS)) for (const [cnt, runDays] of Object.entries(DAYSETS)) for (const experience of EXPS) for (const [gymName, gymDays] of Object.entries(GYMS)) {
    k++;
    const longRunDay = runDays.includes(0) ? 0 : runDays[runDays.length - 1];
    const dated = !GOALS[goal].noDate;
    const weeks = dated ? [14, 22, 9][k % 3] : null;
    const raceDate = dated ? racePlusWeeks(weeks - 1, k % 2 ? 6 : 5) : undefined;
    const races = [];
    if ((dated && weeks >= 12) || !dated) {
      races.push({ date: racePlusWeeks(6, 2 + (k % 5)), distKm: B_DIST[k % 3], priority: 'B', name: 'B race' });
      races.push({ date: racePlusWeeks(3, k % 7), distKm: 5, priority: 'C', name: 'C race' });
    }
    const currentWeeklyKm = [0, 12, 30, 60][k % 4];
    out.push({ goal, runDays, longRunDay, experience, gymDays, gymName, raceDate, races, currentWeeklyKm, score: [30, 40, 52][k % 3], today: TODAY, label: `${goal} ${cnt}d ${experience} gym:${gymName} cur:${currentWeeklyKm} race:${raceDate || '-'}` });
  }
  // far races (more than 30 weeks away) and a long-run day that clashes with heavy legs
  for (const goal of ['10k', 'half', 'marathon']) {
    out.push({ goal, runDays: [2, 4, 6, 0], longRunDay: 0, experience: 'some', gymDays: [], gymName: 'none', raceDate: racePlusWeeks(39), races: [], currentWeeklyKm: 20, score: 40, today: TODAY, label: `${goal} far race` });
    out.push({ goal, runDays: [1, 3, 5, 0], longRunDay: 0, experience: 'some', gymDays: [{ day: 6, type: 'legs', intensity: 'heavy' }], gymName: 'legsSat', raceDate: racePlusWeeks(15), races: [], currentWeeklyKm: 25, score: 40, today: TODAY, label: `${goal} legs before long run` });
  }
  return out;
}

const ALL = cases();
const PLANS = ALL.map((c) => ({ c, plan: buildPlan(c) }));

test(`built ${ALL.length} plans without errors`, () => {
  assert.ok(PLANS.length > 400);
  for (const { plan } of PLANS) assert.equal(plan.kind, 'plan');
});

test('every plan passes every independent safety verdict', () => {
  const bad = [];
  for (const { c, plan } of PLANS) {
    const v = verdicts(plan);
    for (const [rule, fails] of Object.entries(v)) if (fails.length) bad.push(`${c.label} :: ${rule}: ${fails[0]}`);
  }
  assert.deepEqual(bad.slice(0, 10), []);
});

test('engine safety checks equal the independent verdicts', () => {
  const bad = [];
  for (const { c, plan } of PLANS) {
    const v = verdicts(plan);
    const byId = Object.fromEntries(plan.safety.map((s) => [s.id, s]));
    for (const [id, key] of Object.entries(CHECK_MAP)) {
      if (!byId[id]) { bad.push(`${c.label}: missing check ${id}`); continue; }
      if (byId[id].ok !== (v[key].length === 0)) bad.push(`${c.label}: ${id} engine=${byId[id].ok} test=${v[key].length === 0}`);
    }
    const spacingOk = byId.hardSpacing.ok && byId.beforeLong.ok;
    if (spacingOk !== (v.hardSpacing.length === 0)) bad.push(`${c.label}: hard spacing differs`);
    if (!plan.safety.every((s) => s.ok)) bad.push(`${c.label}: a check fails: ${plan.safety.filter((s) => !s.ok).map((s) => s.id)}`);
  }
  assert.deepEqual(bad.slice(0, 10), []);
});

test('no two hard days touch, also across weeks and with heavy legs days', () => {
  for (const { c, plan } of PLANS) {
    const flat = days(plan);
    for (let i = 0; i + 1 < flat.length; i++) {
      const a = flat[i], b = flat[i + 1];
      if (a.type === 'race' && b.type === 'race') continue;
      assert.ok(!((hardRun(a) || heavyLegs(a)) && (hardRun(b) || heavyLegs(b))), `${c.label}: ${a.iso} ${a.type} touches ${b.iso} ${b.type}`);
    }
  }
});

test('the long run is the longest run of its week', () => {
  for (const { c, plan } of PLANS) for (const wk of plan.weeks) {
    const runs = wk.days.filter((d) => isRun(d) && d.type !== 'race' && d.type !== 'timetrial');
    const long = runs.find((d) => LONG.has(d.type)); if (!long) continue;
    for (const d of runs) assert.ok(d.km <= long.km, `${c.label} week ${wk.n}: ${d.type} ${d.km} > long ${long.km}`);
  }
});

test('week 1 is at most the current distance plus 10% (or the small starter floor)', () => {
  for (const { c, plan } of PLANS) {
    const floor = Math.min(plan.settings.runDays.length, 3) * 3;
    const cap = Math.max(c.currentWeeklyKm * 1.1, floor);
    assert.ok(weekKm(plan.weeks[0]) <= cap + 0.1 || plan.weeks[0].exempt, `${c.label}: week 1 ${weekKm(plan.weeks[0])} > ${cap}`);
    if (c.currentWeeklyKm * 1.1 >= floor) assert.ok(weekKm(plan.weeks[0]) <= c.currentWeeklyKm * 1.1 + 0.1, `${c.label}: week 1 above current + 10%`);
    if (c.currentWeeklyKm * 1.1 < floor) assert.ok(plan.warnings.some((w) => /Week 1/.test(w)), `${c.label}: floor used without a warning`);
  }
});

test('planned weeks grow by 10% or less, except after cutbacks; cutbacks come every 4th week', () => {
  for (const { c, plan } of PLANS) {
    const v = verdicts(plan);
    assert.deepEqual(v.growth, [], c.label);
    assert.deepEqual(v.cutback, [], c.label);
    for (const wk of plan.weeks) if (wk.km > 0 && wk.targetKm != null && !wk.days.some((d) => d.type === 'race')) assert.ok(wk.km <= wk.targetKm + 0.4, `${c.label} week ${wk.n}: planned ${wk.km} above target ${wk.targetKm}`);
  }
});

test('peak week is the largest planned normal training week, not the race week', () => {
  for (const { c, plan } of PLANS) {
    const normal = plan.weeks.filter((w) => w.check === 'normal' && !w.exempt);
    if (!normal.length) continue;
    assert.equal(plan.peakKm, Math.max(...normal.map((w) => w.km)), c.label);
    assert.ok(!plan.weeks.find((w) => w.n === plan.peakWeek).days.some((d) => d.type === 'race'), c.label);
  }
});

test('about 80% of running time is easy in every week', () => {
  for (const { c, plan } of PLANS) assert.deepEqual(verdicts(plan).easy8020, [], c.label);
});

test('heavy legs: not within 48 h before quality or 72 h before the long run or a race', () => {
  let heavySeen = 0;
  for (const { c, plan } of PLANS) {
    assert.deepEqual(verdicts(plan).legsSpacing, [], c.label);
    heavySeen += days(plan).filter(heavyLegs).length;
  }
  assert.ok(heavySeen > 100, 'heavy legs days stay in many plans');
});

test('a heavy legs day next to the long-run day gives a conflict with a suggestion', () => {
  for (const { c, plan } of PLANS.filter((x) => x.c.gymName === 'legsSat')) {
    assert.ok(plan.conflicts.length > 0, c.label);
    for (const k of plan.conflicts) { assert.ok(k.reason.length > 10); assert.ok(k.suggestion.length > 10); }
    assert.notEqual(plan.settings.effectiveLongRunDay, 0, `${c.label}: the long run moves off Sunday`);
  }
});

test('dated goals: the race is on race day; far races keep the race and get a base block', () => {
  for (const { c, plan } of PLANS) {
    assert.deepEqual(verdicts(plan).races, [], c.label);
    if (c.raceDate) {
      const d = days(plan).find((x) => x.iso === c.raceDate);
      assert.ok(d && d.type === 'race' && d.race.priority === 'A', `${c.label}: race missing`);
      const after = days(plan).filter((x) => x.iso > c.raceDate);
      assert.ok(after.length >= 1, `${c.label}: plan continues after the race (recovery)`);
      assert.ok(after.every((x) => !hardRun(x) || x.type === 'race'), `${c.label}: no hard days in the recovery block`);
    }
  }
  for (const { c, plan } of PLANS.filter((x) => /far race/.test(x.c.label))) {
    assert.ok(plan.weeks.some((w) => w.kind === 'base-block'), c.label);
    assert.ok(plan.changesFromRules.some((x) => x.rule === 'Far race'), c.label);
  }
});

test('B races get a mini taper and easy days after; C races replace a quality session', () => {
  let bSeen = 0;
  for (const { c, plan } of PLANS) {
    const flat = days(plan); const idx = new Map(flat.map((d, i) => [d.iso, i]));
    for (const r of plan.races.filter((x) => x.priority === 'B' && x.inPlan !== false)) {
      const i = idx.get(r.iso); assert.equal(flat[i].type, 'race', c.label); bSeen++;
      for (const k of [-3, -2, -1, 1, 2]) { const d = flat[i + k]; if (d) assert.ok(!hardRun(d) || d.type === 'race' || d.type === 'timetrial', `${c.label}: ${d.type} ${k} days from B race`); }
      if (r.distKm >= 21) { const d = flat[i + 1]; if (d) assert.ok(!isRun(d), `${c.label}: rest the day after a long B race`); }
    }
    for (const r of plan.races.filter((x) => x.priority === 'C' && x.inPlan !== false)) {
      const wk = plan.weeks.find((w) => w.days.some((d) => d.iso === r.iso));
      const hard = wk.days.filter((d) => QUALITY.has(d.type) || d.type === 'race' || d.type === 'timetrial').length;
      assert.ok(hard <= (plan.settings.experience === 'new' ? 1 : 2) || wk.days.filter((d) => d.type === 'race').length === hard, c.label);
    }
  }
  assert.ok(bSeen > 50);
});

test('race weeks: lifting is maintenance in the last 10 days and never heavy in race week', () => {
  for (const { c, plan } of PLANS) assert.deepEqual(verdicts(plan).raceLifting, [], c.label);
  const p = PLANS.find((x) => x.c.gymName === 'upperLower' && x.c.raceDate);
  assert.ok(p.plan.gymAdvice.some((g) => g.advice === 'skip-heavy'));
  assert.ok(p.plan.gymAdvice.some((g) => g.advice === 'maintenance'));
  for (const g of p.plan.gymAdvice) assert.ok(['normal', 'maintenance', 'skip-heavy'].includes(g.advice) && g.reason);
});

test('run/walk progression: the run parts grow (or hold) and reach longer runs', () => {
  for (const { c, plan } of PLANS.filter((x) => x.c.goal === 'runwalk')) {
    const levels = plan.weeks.filter((w) => w.kind !== 'recovery' && !w.days.some((d) => d.type === 'race')).map((w) => Math.max(0, ...w.days.filter((d) => d.type === 'runwalk').map((d) => d.runWalk.level))).filter(Boolean);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] >= levels[i - 1], `${c.label}: level drops ${levels}`);
    if (plan.weeks.length >= 9) assert.ok(levels[levels.length - 1] >= levels[0] + 4, `${c.label}: levels ${levels}`);
    for (const d of days(plan).filter(isRun)) assert.ok(d.effortText && d.showPace === false, `${c.label}: effort words, not paces`);
  }
  const long = buildPlan({ goal: 'runwalk', runDays: [2, 4, 6], experience: 'new', today: TODAY });
  const top = Math.max(...days(long).filter((d) => d.type === 'runwalk').map((d) => d.runWalk.level));
  assert.ok(top >= 9, `default run/walk plan reaches 20+ minutes of continuous running (level ${top})`);
});

test('beginners and gentle starts: effort words on every workout; no hills or intervals early', () => {
  for (const { c, plan } of PLANS) {
    assert.deepEqual(verdicts(plan).gentleStart, [], c.label);
    if (c.experience === 'new') for (const d of days(plan)) assert.ok(typeof d.effortText === 'string' && d.effortText.length > 5, `${c.label}: ${d.type} without effort words`);
  }
});

test('hard sessions per week: at most 1 for new runners, 2 for others', () => {
  for (const { c, plan } of PLANS) assert.deepEqual(verdicts(plan).hardPerWeek, [], c.label);
});

test('quality sessions rotate from week to week', () => {
  const p = PLANS.filter((x) => ['10k', 'half', 'marathon', 'faster5k'].includes(x.c.goal) && x.c.experience !== 'new' && x.c.gymName === 'none' && x.c.runDays.length >= 4 && x.c.currentWeeklyKm >= 20);
  assert.ok(p.length > 5);
  for (const { c, plan } of p) {
    const types = new Set(days(plan).filter((d) => QUALITY.has(d.type)).map((d) => d.type));
    assert.ok(types.size >= 3, `${c.label}: only ${[...types]}`);
  }
});

test('engine strength: none when the user lifts; never on the day before a hard day; none in A race week', () => {
  for (const { c, plan } of PLANS) {
    const flat = days(plan);
    const strength = flat.filter((d) => d.type === 'strength' || (d.extra && d.extra.kind === 'strength'));
    if (c.gymDays.length) assert.equal(strength.length, 0, `${c.label}: double strength`);
    flat.forEach((d, i) => {
      if (!(d.type === 'strength' || (d.extra && d.extra.kind === 'strength'))) return;
      const next = flat[i + 1];
      if (next) assert.ok(!hardRun(next), `${c.label}: strength on ${d.iso} before ${next.type}`);
      for (const r of plan.races.filter((x) => x.priority === 'A')) { const k = (Date.parse(r.iso) - Date.parse(d.iso)) / 864e5; assert.ok(!(k >= 0 && k < 7), `${c.label}: strength in race week`); }
    });
  }
});

test('plans return warnings, changesFromRules and safety lists with reasons', () => {
  for (const { plan } of PLANS) {
    assert.ok(Array.isArray(plan.warnings) && Array.isArray(plan.changesFromRules) && Array.isArray(plan.conflicts));
    for (const ch of plan.changesFromRules) assert.ok(ch.rule && ch.change && ch.reason);
    for (const s of plan.safety) assert.ok(typeof s.ok === 'boolean' && s.rule && Array.isArray(s.failures));
  }
});

test('safety checks are honest: a broken plan fails', () => {
  const base = PLANS.find((x) => x.c.goal === 'half' && x.c.experience === 'some' && x.c.gymName === 'none' && x.c.runDays.length === 5).plan;
  const flat = (p) => p.weeks.flatMap((w) => w.days);
  const ok = (p, id) => safetyChecks(p).find((s) => s.id === id).ok;

  // hard session the day after the long run (Monday after Sunday)
  let p = structuredClone(base);
  const longDay = flat(p).find((d) => d.type === 'long' || d.type === 'longfinish');
  const i = flat(p).indexOf(longDay); const next = flat(p)[i + 1];
  Object.assign(next, { type: 'intervals', intensity: 'hard' });
  assert.equal(ok(p, 'hardSpacing') && ok(p, 'beforeLong'), false);
  assert.ok(verdicts(p).hardSpacing.length > 0);

  // week 1 far above the current distance
  p = structuredClone(base); const e = p.weeks[0].days.find((d) => d.type === 'easy');
  e.km += 30; assert.equal(ok(p, 'week1'), false); assert.ok(verdicts(p).week1.length > 0);

  // an easy run longer than the long run
  p = structuredClone(base); const wk = p.weeks[2]; const lr = wk.days.find((d) => d.type === 'long' || d.type === 'longfinish'); const ez = wk.days.find((d) => d.type === 'easy' || d.type === 'strides');
  ez.km = lr.km + 1; assert.equal(ok(p, 'longLongest'), false);

  // a cutback week that does not cut
  p = structuredClone(base); const cb = p.weeks.find((w) => w.cutback); cb.days.find((d) => d.type === 'easy').km += 20; assert.equal(ok(p, 'cutback'), false);

  // the race removed
  p = structuredClone(base); const race = flat(p).find((d) => d.type === 'race' && d.race.goal); Object.assign(race, { type: 'rest', intensity: 'rest', km: 0 }); assert.equal(ok(p, 'races'), false);

  // too much hard running
  p = structuredClone(base); for (const d of p.weeks[5].days.filter((x) => x.type === 'easy')) d.steps = [{ kind: 'steady', label: 'x', km: d.km, pace: p.paces.threshold }];
  assert.equal(ok(p, 'easy8020'), false); assert.ok(verdicts(p).easy8020.length > 0);
});

test('adaptations keep plans safe (missed, illness, injury, holiday, drop, suggested moves)', async () => {
  const { adapt, suggestDays, addDays } = await import('../src/run/engine.js');
  const bad = [];
  const sample = PLANS.filter((_, i) => i % 9 === 0);
  for (const { c, plan } of sample) {
    const flat = days(plan);
    const today = addDays(plan.startIso, 15);
    const hard = flat.find((d) => d.iso >= today && (QUALITY.has(d.type) || LONG.has(d.type)));
    const easy = flat.find((d) => d.iso >= today && d.type === 'easy');
    const events = [
      hard && { type: 'missed', iso: hard.iso },
      easy && { type: 'missed', iso: easy.iso },
      { type: 'illness', answers: { where: 'below', fever: true } },
      { type: 'injury', answers: { area: 'shin', pain: 5, limping: false, worseNextMorning: true } },
      { type: 'holiday', fromIso: addDays(today, 3), toIso: addDays(today, 9), canRun: true },
      { type: 'break', answers: { days: 15, cause: 'life' } },
      easy && { type: 'drop', iso: easy.iso },
      { type: 'feedback', kind: 'tooEasy' },
    ].filter(Boolean);
    for (const ev of events) {
      const r = adapt(plan, ev, { today });
      const v = verdicts(r.plan);
      const fails = Object.entries(v).filter(([, f]) => f.length).map(([k, f]) => `${k}: ${f[0]}`);
      if (!r.plan.safety.every((s) => s.ok) || fails.length) bad.push(`${c.label} ${ev.type}: ${fails[0] || r.plan.safety.find((s) => !s.ok).failures[0]}`);
    }
    if (hard) {
      for (const iso of suggestDays(plan, hard.iso, { today }).safe.slice(0, 3)) {
        const r = adapt(plan, { type: 'move', fromIso: hard.iso, toIso: iso }, { today });
        const fails = Object.entries(verdicts(r.plan)).filter(([, f]) => f.length);
        if (r.refused || fails.length) bad.push(`${c.label} move ${hard.iso}->${iso}: ${r.reason || fails[0]}`);
      }
    }
  }
  assert.deepEqual(bad.slice(0, 8), []);
});
