// Tests for the pure recorder functions (src/runui/recorder.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm, filterPoint, kmAt, paceFromWindow, speedOverWindow, nextAutoPause, computeSplits, thinTrack,
  buildSegments, advanceStep, stepProgress, ribbonFraction, segmentCueTexts, splitCueText, timeInZones, correctDistance,
  scaledRoute, pointOnRoute,
} from '../src/runui/recorder.js';
import { builderToWorkout, runWalkWorkout, stepsToFitSteps, flattenSteps } from '../src/runui/steps.js';
import * as engine from '../src/run/engine.js';

test('haversine: one degree of latitude is about 111.2 km', () => {
  const d = haversineKm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(Math.abs(d - 111.19) < 0.1, `got ${d}`);
  assert.equal(haversineKm({ lat: 51.5, lon: -0.12 }, { lat: 51.5, lon: -0.12 }), 0);
  // 0.001 degree of longitude at 51.5 N is about 69 m
  const e = haversineKm({ lat: 51.5, lon: 0 }, { lat: 51.5, lon: 0.001 }) * 1000;
  assert.ok(e > 68 && e < 70, `got ${e}`);
});

test('filterPoint: refuses poor accuracy, jumps, bad time and invalid points', () => {
  const a = { lat: 51.5, lon: -0.1, t: 0, acc: 5 };
  assert.equal(filterPoint(null, a).ok, true);
  assert.equal(filterPoint(null, { ...a, acc: 45 }).reason, 'accuracy');
  assert.equal(filterPoint(null, { lat: NaN, lon: 0, t: 0 }).ok, false);
  assert.equal(filterPoint(null, { lat: 0, lon: 0, t: 0 }).ok, false);
  // 10 m in 3 s: a normal run
  const b = { lat: 51.50009, lon: -0.1, t: 3000, acc: 6 };
  const fb = filterPoint(a, b);
  assert.equal(fb.ok, true);
  assert.equal(fb.reason, 'move');
  assert.ok(Math.abs(fb.km - 0.01) < 0.001);
  // 200 m in 2 s: a jump
  assert.equal(filterPoint(a, { lat: 51.5018, lon: -0.1, t: 2000, acc: 5 }).reason, 'jump');
  // same time stamp
  assert.equal(filterPoint(a, { ...b, t: 0 }).reason, 'time');
  // 1 m: still
  assert.equal(filterPoint(a, { lat: 51.500009, lon: -0.1, t: 1000, acc: 5 }).reason, 'still');
});

test('kmAt and paceFromWindow use the last 30 s only', () => {
  const s = [];
  // 5:00 /km for 120 s, then 4:00 /km for 60 s
  for (let t = 0; t <= 120; t += 5) s.push({ t, km: t / 300 });
  for (let t = 125; t <= 180; t += 5) s.push({ t, km: 120 / 300 + (t - 120) / 240 });
  assert.ok(Math.abs(kmAt(s, 60) - 0.2) < 1e-9);
  assert.ok(Math.abs(kmAt(s, 62.5) - 62.5 / 300) < 1e-9);
  const p = paceFromWindow(s, 30);
  assert.ok(Math.abs(p - 240) < 0.5, `got ${p}`);
  assert.equal(paceFromWindow([{ t: 0, km: 0 }, { t: 5, km: 0.01 }]), null, 'too little time');
  assert.equal(paceFromWindow([{ t: 0, km: 0 }, { t: 40, km: 0.001 }]), null, 'no movement');
});

test('speedOverWindow and auto-pause with two limits', () => {
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push({ t: i * 1000, km: i * 0.003 }); // 3 m/s
  assert.ok(Math.abs(speedOverWindow(pts, 10) - 3) < 1e-6);
  const still = [];
  for (let i = 0; i <= 20; i++) still.push({ t: i * 1000, km: 0.06 + i * 0.0001 }); // 0.1 m/s
  const sp = speedOverWindow(still, 10);
  assert.ok(sp < 0.5);
  assert.equal(nextAutoPause(false, sp), true);
  assert.equal(nextAutoPause(true, 0.8), true, 'between the limits: stays paused');
  assert.equal(nextAutoPause(true, 1.5), false);
  assert.equal(nextAutoPause(false, 0.8), false, 'between the limits: stays running');
  assert.equal(nextAutoPause(true, null), true, 'no data: no change');
  assert.equal(speedOverWindow([{ t: 0, km: 0 }]), null);
});

test('computeSplits: whole km splits and a partial last split, also in miles', () => {
  const s = [];
  // 2.5 km at 5:00 /km
  for (let t = 0; t <= 750; t += 10) s.push({ t, km: t / 300 });
  const sp = computeSplits(s, 1);
  assert.equal(sp.length, 3);
  assert.ok(Math.abs(sp[0].sec - 300) < 1e-6);
  assert.ok(Math.abs(sp[1].sec - 300) < 1e-6);
  assert.equal(sp[2].partial, true);
  assert.ok(Math.abs(sp[2].km - 0.5) < 1e-9);
  assert.ok(Math.abs(sp[2].pace - 300) < 1e-6);
  const mi = computeSplits(s, engine.KM_PER_MI);
  assert.equal(mi.filter((x) => !x.partial).length, 1);
  assert.ok(Math.abs(mi[0].sec - 300 * engine.KM_PER_MI) < 1e-6);
  assert.deepEqual(computeSplits([{ t: 0, km: 0 }], 1), []);
});

test('thinTrack keeps first, last and spaced points', () => {
  const pts = [];
  for (let i = 0; i < 100; i++) pts.push({ lat: 51.5 + i * 0.00002, lon: 0, t: i * 1000 }); // about 2.2 m apart
  const th = thinTrack(pts, 15, 20);
  assert.equal(th[0], pts[0]);
  assert.equal(th[th.length - 1], pts[99]);
  assert.ok(th.length < 20 && th.length > 10, `got ${th.length}`);
});

const plan = engine.buildPlan({ goal: '10k', today: '2026-11-25', runDays: [1, 3, 6], longRunDay: 6, currentWeeklyKm: 25, score: 42, experience: 'some' });
const quality = engine.allDays(plan).find((d) => d.intensity === 'hard' && d.steps.some((s) => s.kind === 'repeat'));

test('buildSegments: warm-up phases go after the jog for quality runs, before the steps for races, none for easy runs', () => {
  assert.ok(quality, 'the plan has an interval session');
  const wu = engine.warmupFor(quality, { experience: 'some' });
  assert.equal(wu.inSteps, true);
  const plain = buildSegments(quality, wu, false);
  const withWu = buildSegments(quality, wu, true);
  const phases = wu.phases.filter((p) => p.min > 0).length;
  assert.equal(withWu.length, plain.length + phases);
  assert.equal(withWu[0].role, 'warmup');
  assert.equal(withWu[1].role, 'warmup-phase');
  assert.equal(withWu[withWu.length - 1].end, plain[plain.length - 1].end + wu.minutes * 60);
  // starts and ends are continuous
  for (let i = 1; i < withWu.length; i++) assert.equal(withWu[i].start, withWu[i - 1].end);

  const race = engine.makeWorkout('2026-12-06', { type: 'race', distKm: 5, name: 'Park 5K', priority: 'B' }, { p: engine.paces(42), score: 42 });
  const rw = engine.warmupFor(race, { experience: 'some' });
  const rs = buildSegments(race, rw, true);
  assert.equal(rs[0].role, 'warmup-phase');
  assert.equal(rs[rs.length - 1].label, race.steps[0].label);

  const easy = engine.allDays(plan).find((d) => d.type === 'easy');
  const ew = engine.warmupFor(easy, {});
  assert.equal(ew.kind, 'easy');
  assert.equal(buildSegments(easy, ew, true).length, flattenSteps(easy).length);
});

test('advanceStep moves through time and distance steps', () => {
  const w = { steps: [{ kind: 'warmup', label: 'Warm up', min: 1, pace: 400 }, { kind: 'steady', label: 'Run', km: 1, pace: 300 }, { kind: 'repeat', times: 2, work: { label: 'Fast', sec: 30, pace: 240 }, rest: { label: 'Walk', sec: 30, pace: 660, walk: true } }] };
  const segs = buildSegments(w, null, false);
  assert.equal(segs.length, 6);
  let st = { index: 0, startSec: 0, startKm: 0 };
  let r = advanceStep(st, segs, 30, 0.08);
  assert.equal(r.changed, false);
  assert.ok(Math.abs(stepProgress(r.state, segs, 30, 0.08).fraction - 0.5) < 1e-9);
  r = advanceStep(r.state, segs, 61, 0.15);
  assert.equal(r.state.index, 1);
  assert.equal(r.state.startSec, 60);
  assert.ok(Math.abs(r.state.startKm - 0.15) < 1e-9);
  // the distance step needs 1 km from 0.15 km, time does not end it
  r = advanceStep(r.state, segs, 500, 1.0);
  assert.equal(r.state.index, 1);
  assert.ok(Math.abs(stepProgress(r.state, segs, 500, 1.0).leftKm - 0.15) < 1e-9);
  r = advanceStep(r.state, segs, 520, 1.15);
  assert.equal(r.state.index, 2);
  r = advanceStep(r.state, segs, 640, 1.4);
  assert.equal(r.complete, true);
  assert.equal(ribbonFraction(r.state, segs, 640, 1.4), 1);
});

test('segmentCueTexts uses engine cues for plan sessions and warm-up cues for phases', () => {
  const wu = engine.warmupFor(quality, { experience: 'some' });
  const segs = buildSegments(quality, wu, true);
  const texts = segmentCueTexts(quality, segs, 'km', wu);
  assert.equal(texts.length, segs.length);
  const engineCues = engine.audioCues(quality, 'km');
  assert.equal(texts[0], engineCues[0].text);
  assert.equal(texts[1], engine.warmupCues(wu)[0].text);
  assert.ok(texts.every((t) => typeof t === 'string' && t.length > 3));
  // run/walk in Simple mode: no paces in the voice
  const rw = runWalkWorkout(2);
  const rsegs = buildSegments(rw, null, false);
  const rtexts = segmentCueTexts(rw, rsegs, 'km', null);
  assert.ok(rtexts.every((t) => !/per kilometre|\/km/.test(t)), rtexts.join(' | '));
  assert.match(splitCueText({ n: 3, sec: 312 }, 'km', 950), /3 kilometres\. Time 15 minutes 50 seconds\. Last kilometre 5 minutes 12 seconds\./);
  assert.match(splitCueText({ n: 1, sec: 500 }, 'mi', 500), /1 mile\./);
});

test('builder workouts: distance reps with pace ranges become FIT steps', () => {
  const w = builderToWorkout({ name: '6 x 1 km', warmMin: 10, coolMin: 10, blocks: [{ times: 6, work: { by: 'dist', value: 1, target: 'pace', paceLo: 250, paceHi: 260 }, rest: { by: 'time', value: 1.5 } }] }, plan);
  assert.equal(w.steps.length, 3);
  assert.equal(w.steps[1].times, 6);
  assert.equal(w.steps[1].work.km, 1);
  assert.equal(w.steps[1].rest.sec, 90);
  const fit = stepsToFitSteps(w.steps);
  assert.deepEqual(fit[1].steps[0].pace, { fast: 250, slow: 260 });
  assert.equal(fit[1].steps[0].m, 1000);
  assert.equal(fit[1].repeat, 6);
  const segs = buildSegments(w, null, false);
  assert.equal(segs.length, 1 + 12 + 1);
  assert.equal(segs[1].by, 'dist');
});

test('timeInZones and correctDistance', () => {
  const zones = engine.hrZones({ maxHR: 190, restHR: 50 }, 'karvonen');
  const series = [[0, 120], [60, 125], [120, 160], [180, 185]];
  const z = timeInZones(series, zones);
  assert.equal(z.reduce((s, x) => s + x, 0), 180);
  const run = { km: 5, splitUnit: 'km', splits: [{ sec: 300, km: 1 }, { sec: 300, km: 1 }, { sec: 300, km: 1 }, { sec: 300, km: 1 }, { sec: 300, km: 1 }] };
  const c = correctDistance(run, 5.5);
  assert.equal(c.km, 5.5);
  assert.equal(c.measuredKm, 5);
  assert.equal(c.splits.filter((s) => !s.partial).length, 5);
  assert.ok(c.splits[5].partial);
});

test('simulated route: a loop of the right length', () => {
  const r = engine.loopRoute(5, 5);
  const route = scaledRoute(r.points, 5, r.elev);
  assert.ok(Math.abs(route[route.length - 1].km - 5) < 1e-6);
  let d = 0;
  for (let i = 1; i < route.length; i++) d += haversineKm(route[i - 1], route[i]);
  assert.ok(Math.abs(d - 5) < 0.1, `got ${d}`);
  const p = pointOnRoute(route, 2.5);
  assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon));
});

test('buildSegments: run/walk warm-up moves follow the brisk walk, with no second walk', () => {
  const rw = runWalkWorkout(3);
  const wu = engine.warmupFor(rw, { experience: 'new' });
  assert.equal(wu.kind, 'gentle');
  const segs = buildSegments(rw, wu, true);
  assert.equal(segs[0].label, 'Brisk walk');
  assert.equal(segs[1].role, 'warmup-phase');
  assert.notEqual(segs[1].phase.id, 'general');
  assert.equal(segs.filter((s) => s.role === 'warmup-phase').length, wu.phases.filter((p) => p.min > 0 && p.id !== 'general').length);
  const texts = segmentCueTexts(rw, segs, 'km', wu);
  assert.match(texts[1], /^Easy moves\./);
});

import { paceBand, paceGuidance, PACE_GUIDE } from '../src/runui/recorder.js';

test('pace guidance: band from target pace and step class', () => {
  assert.equal(paceBand({ walk: true, pace: 600 }), null);
  assert.equal(paceBand({ role: 'warmup-phase', pace: 300 }), null);
  assert.equal(paceBand({ cls: 'hard' }), null);
  const b = paceBand({ cls: 'hard', pace: 300 });
  assert.ok(Math.abs(b.lo - 288) < 0.01 && Math.abs(b.hi - 312) < 0.01);
  const r = paceBand({ cls: 'steady', pace: 300, step: { paceLo: 290, paceHi: 310 } });
  assert.deepEqual([r.lo, r.hi], [290, 310]);
});

function run(seg, paces, opts = {}) {
  let g = null; const out = [];
  paces.forEach((pace, i) => {
    const t = 40 + i * 5;
    const r = paceGuidance(g, { seg, pace, segElapsed: t, now: t, showPace: opts.showPace, units: 'km' });
    g = r.g; if (r.text) out.push({ t, text: r.text });
  });
  return out;
}

test('pace guidance: speaks after 20 s off target, then waits 60 s', () => {
  const seg = { cls: 'hard', pace: 300, effort: 'Hard but controlled.' };
  const cues = run(seg, Array(30).fill(270), { showPace: true });
  assert.equal(cues[0].t, 60);
  assert.match(cues[0].text, /^Slow down\. Target .* per kilometre\. You are at 4:30 per kilometre\.$/);
  assert.ok(cues.length >= 2 && cues[1].t - cues[0].t >= PACE_GUIDE.gapSec);
});

test('pace guidance: no cue inside the band, in the first 30 s, or for slow easy running', () => {
  assert.equal(run({ cls: 'hard', pace: 300 }, Array(20).fill(305)).length, 0);
  const early = paceGuidance(null, { seg: { cls: 'hard', pace: 300 }, pace: 250, segElapsed: 10, now: 10 });
  assert.equal(early.text, null);
  assert.equal(run({ cls: 'easy', pace: 360 }, Array(20).fill(420)).length, 0);
  const fastEasy = run({ cls: 'easy', pace: 360 }, Array(20).fill(300));
  assert.match(fastEasy[0].text, /slowly enough to talk/);
});

test('pace guidance: Simple mode uses effort words, slow quality step says speed up', () => {
  const cues = run({ cls: 'hard', pace: 300, effort: 'Hard but controlled.' }, Array(20).fill(340));
  assert.equal(cues[0].text, 'Speed up a little. Hard but controlled.');
});
