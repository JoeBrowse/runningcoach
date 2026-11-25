import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmupFor, liftWarmup, warmupCues, buildPlan, allDays, QUALITY_TYPES } from '../src/run/engine.js';

const w = (type, extra = {}) => ({ type, km: 8, steps: [], ...extra });

test('rest, gym and cross days have no run warm-up', () => {
  for (const t of ['rest', 'cross', 'strength', 'gym']) assert.equal(warmupFor(w(t)), null);
});

test('run/walk and new runners get a gentle warm-up with no strides', () => {
  for (const wu of [warmupFor(w('runwalk')), warmupFor(w('easy'), { experience: 'new' })]) {
    assert.equal(wu.kind, 'gentle');
    const ids = wu.phases.flatMap((p) => p.items.map((m) => m.id));
    assert.ok(ids.includes('walk'));
    assert.ok(!ids.includes('strides'));
  }
});

test('easy and long runs start slowly, with optional mobility', () => {
  const wu = warmupFor(w('long'), { experience: 'some' });
  assert.equal(wu.kind, 'easy');
  assert.ok(wu.phases.some((p) => p.items.some((m) => m.id === 'slowStart' && m.dose === 'First 10 min')));
});

test('quality runs add mobility, drills and strides after the jog in the steps', () => {
  for (const t of QUALITY_TYPES) {
    const wu = warmupFor(w(t, { steps: [{ kind: 'warmup', min: 10 }] }), { experience: 'some' });
    assert.equal(wu.kind, 'quality');
    assert.equal(wu.inSteps, true);
    const ids = wu.phases.map((p) => p.id);
    assert.deepEqual(ids, ['mobility', 'drills', 'strides']);
  }
});

test('race warm-up gets shorter as the race gets longer', () => {
  const m5 = warmupFor(w('race', { km: 5 }), { experience: 'some' }).minutes;
  const mh = warmupFor(w('race', { km: 21.1 }), { experience: 'some' }).minutes;
  const mm = warmupFor(w('race', { km: 42.2 }), { experience: 'some' }).minutes;
  assert.ok(m5 > mh && mh > mm, `${m5} > ${mh} > ${mm}`);
  const marathonIds = warmupFor(w('race', { km: 42.2 })).phases.flatMap((p) => p.items.map((m) => m.id));
  assert.ok(!marathonIds.includes('strides'));
});

test('cold weather adds time and a note; hot weather shortens it', () => {
  const base = warmupFor(w('race', { km: 10 }), { tempC: 12 }).minutes;
  const cold = warmupFor(w('race', { km: 10 }), { tempC: -2 });
  const hot = warmupFor(w('race', { km: 10 }), { tempC: 28 });
  assert.ok(cold.minutes > base && hot.minutes < base);
  assert.ok(cold.notes.some((n) => /below 0/.test(n)));
});

test('lift warm-up skips the general part after a run', () => {
  assert.ok(liftWarmup({}).phases.some((p) => p.id === 'general'));
  const after = liftWarmup({ afterRun: true });
  assert.ok(!after.phases.some((p) => p.id === 'general'));
  assert.ok(after.notes.length === 1);
});

test('every planned run has a warm-up and the cues end with a finish cue', () => {
  const plan = buildPlan({ goal: '10k', raceDate: '2027-03-14', runDays: [2, 4, 6, 0], longRunDay: 0, currentWeeklyKm: 25, score: 42, experience: 'some', today: '2026-11-25' });
  for (const d of allDays(plan)) {
    const wu = warmupFor(d, { experience: 'some' });
    if (['rest', 'cross', 'strength', 'gym'].includes(d.type)) continue;
    if (!d.km && !d.min) continue;
    assert.ok(wu, `warm-up for ${d.type}`);
    const cues = warmupCues(wu);
    assert.match(cues[cues.length - 1].text, /Warm-up complete/);
  }
});
