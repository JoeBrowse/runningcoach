/* Tests for src/shared/wear.js (the Wear OS link) and the parity
   fixture for the watch app.

   The watch app (wear/) has a Kotlin port of the recorder logic. This
   file writes the expected results of the JS code into
   wear/app/src/test/resources/parity.json, and the Kotlin ParityTest
   checks the port against it. When the recorder changes, run
     UPDATE_WEAR_FIXTURE=1 npm test
   and then run the watch tests (cd wear && ./gradlew testDebugUnitTest). */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};

const wear = await import("../src/shared/wear.js");
const engine = await import("../src/run/engine.js");
const store = await import("../src/shared/store.js");
const ps = await import("../src/plan/planState.js");
const rec = await import("../src/runui/recorder.js");
const steps = await import("../src/runui/steps.js");

const TODAY = "2026-11-25"; // a Wednesday
const PROFILE = { level: "some", goal: "10k", raceDate: "2027-03-07", experience: "some", currentWeeklyKm: 25, units: "km", onboarded: true };
const MASTER = { runDays: [2, 4, 6, 0], longRunDay: 0, gymDays: [] };

beforeEach(() => {
  mem.clear();
  wear.setWearPluginForTest(undefined);
});

function plan10k() {
  return engine.buildPlan({ goal: "10k", today: TODAY, raceDate: "2027-03-07", runDays: [2, 4, 6, 0], longRunDay: 0, experience: "some", currentWeeklyKm: 25 });
}

/* ---------- plan JSON ---------- */

test("buildWatchPlan: run days of the next 7 days with steps and warm-ups", () => {
  const plan = plan10k();
  const out = wear.buildWatchPlan({ plan, today: TODAY, units: "km", simple: false, voice: { pace: false }, autoPause: false, profile: PROFILE, tempC: 2, now: "2026-11-25T08:00:00Z" });
  assert.equal(out.v, 1);
  assert.equal(out.updatedAt, "2026-11-25T08:00:00.000Z");
  assert.equal(out.today, TODAY);
  assert.equal(out.units, "km");
  assert.equal(out.simple, false);
  assert.equal(out.autoPause, false);
  assert.deepEqual(out.voice, { on: true, rate: 1, km: true, step: true, half: true, pace: false });
  assert.ok(out.days.length >= 1 && out.days.length <= 7, `days: ${out.days.length}`);
  const expected = engine.allDays(plan).filter((d) => d.iso >= TODAY && d.iso <= "2026-12-01" && engine.isRun(d));
  assert.deepEqual(out.days.map((d) => d.iso), expected.map((d) => d.iso));
  for (const d of out.days) {
    assert.ok(d.iso >= TODAY && d.iso <= "2026-12-01");
    assert.ok(Array.isArray(d.steps) && d.steps.length > 0, `${d.iso} has steps`);
    assert.equal(typeof d.title, "string");
    assert.equal(typeof d.showPace, "boolean");
    assert.ok(d.warmup && Array.isArray(d.warmup.phases), `${d.iso} has a warm-up`);
    for (const p of d.warmup.phases) for (const m of p.items) assert.deepEqual(Object.keys(m).sort(), ["dose", "name"]);
  }
  // The JSON is small enough for one DataItem (limit 100 KB).
  const json = JSON.stringify(out);
  assert.ok(json.length < 60000, `size ${json.length}`);
  assert.deepEqual(JSON.parse(json), out);
});

test("buildWatchPlan: no plan gives no days; miles and Simple mode go through", () => {
  const out = wear.buildWatchPlan({ plan: null, today: TODAY, units: "mi", simple: true });
  assert.deepEqual(out.days, []);
  assert.equal(out.units, "mi");
  assert.equal(out.simple, true);
  assert.equal(out.autoPause, true);
  assert.equal(out.voice.on, true);
});

test("dayForWatch: a quality run keeps the warm-up phases after the easy jog (inSteps)", () => {
  const plan = plan10k();
  const q = engine.allDays(plan).find((d) => ["tempo", "cruise", "intervals", "reps", "hills", "fartlek"].includes(d.type) && d.steps.some((s) => s.kind === "warmup"));
  assert.ok(q, "the plan has a quality run");
  const day = wear.dayForWatch(q, wear.watchWarmupContext(plan, PROFILE, null));
  assert.equal(day.warmup.kind, "quality");
  assert.equal(day.warmup.inSteps, true);
  assert.equal(day.id, q.id);
  const segs = rec.buildSegments(day, day.warmup, true);
  assert.equal(segs[0].role, "warmup");
  assert.equal(segs[1].role, "warmup-phase");
});

/* ---------- runs from the watch ---------- */

function watchRun(over = {}) {
  return {
    id: "watch-1764057600000-ab12",
    type: "run",
    startedAt: "2026-11-25T08:00:00.000Z",
    durationSec: 1800,
    minutes: 30,
    seconds: 0,
    km: 5.02,
    rpe: 5,
    avgHR: 150,
    maxHR: 171,
    splits: [{ n: 1, km: 1, sec: 360, partial: false }],
    splitUnit: "km",
    hrSeries: [[0, 120], [5, 130]],
    track: [{ t: 1764057600000, lat: 51.5, lon: -0.12, ele: 20 }],
    workoutId: "w-2026-11-25",
    planIso: "2026-11-25",
    source: "watch",
    ...over,
  };
}

function mockDeps(known = []) {
  const calls = { saved: [], acked: [], marked: [] };
  const deps = {
    listActivities: async () => known,
    saveRun: async (r) => {
      calls.saved.push(r);
      return store.runToActivity(r);
    },
    isDuplicate: store.isDuplicate,
    markDone: async (iso, id) => calls.marked.push([iso, id]),
    ackRun: async ({ id }) => calls.acked.push(id),
  };
  return { deps, calls };
}

test("importWatchRuns: saves a new run, marks the plan day and sends the receipt", async () => {
  const { deps, calls } = mockDeps();
  const out = await wear.importWatchRuns([watchRun()], deps);
  assert.deepEqual(out.saved, ["watch-1764057600000-ab12"]);
  assert.deepEqual(out.duplicates, []);
  assert.equal(calls.saved.length, 1);
  const saved = calls.saved[0];
  assert.equal(saved.source, "watch");
  assert.equal(saved.minutes, undefined, "durationSec is the duration");
  assert.deepEqual(calls.marked, [["2026-11-25", "watch-1764057600000-ab12"]]);
  assert.deepEqual(calls.acked, ["watch-1764057600000-ab12"]);
  const record = store.runToActivity(saved);
  assert.equal(record.minutes, 30);
  assert.equal(record.distance, 5.02);
  assert.equal(record.rpe, 5);
  assert.deepEqual(record.hrSeries, [[0, 120], [5, 130]]);
});

test("importWatchRuns: a run that is already saved gets a receipt but is not saved again", async () => {
  const phoneRun = store.normaliseActivity(store.runToActivity({ id: "phone-1", startedAt: "2026-11-25T08:01:00.000Z", durationSec: 1790, km: 5.0 }));
  const { deps, calls } = mockDeps([phoneRun]);
  const out = await wear.importWatchRuns([watchRun(), JSON.stringify(watchRun({ id: "watch-2", startedAt: "2026-11-26T08:00:00.000Z" })), watchRun({ id: "watch-2", startedAt: "2026-11-26T08:00:00.000Z" })], deps);
  assert.deepEqual(out.duplicates, ["watch-1764057600000-ab12", "watch-2"]);
  assert.deepEqual(out.saved, ["watch-2"]);
  assert.deepEqual(calls.acked, ["watch-1764057600000-ab12", "watch-2", "watch-2"]);
  assert.equal(calls.saved.length, 1);
});

test("importWatchRuns: a save error gives no receipt, so the watch sends the run again", async () => {
  const { deps, calls } = mockDeps();
  deps.saveRun = async () => {
    throw new Error("disk full");
  };
  const out = await wear.importWatchRuns([watchRun(), "not json", { no: "id" }], deps);
  assert.deepEqual(out.failed, ["watch-1764057600000-ab12"]);
  assert.deepEqual(calls.acked, []);
});

test("importWatchRuns: a free run (no planIso) marks no plan day", async () => {
  const { deps, calls } = mockDeps();
  await wear.importWatchRuns([watchRun({ planIso: null, workoutId: null })], deps);
  assert.deepEqual(calls.marked, []);
  assert.equal(calls.acked.length, 1);
});

/* ---------- live functions with a mock plugin ---------- */

test("no plugin (browser): every function does nothing and does not throw", async () => {
  wear.setWearPluginForTest(null);
  assert.deepEqual(await wear.pushPlanToWatch(), { sent: false, reason: "unavailable" });
  assert.deepEqual((await wear.pullWatchRuns()).saved, []);
  assert.deepEqual(await wear.watchStatus(), { available: false, connected: false, nodes: [] });
  wear.startWatchSync(); // not native: no effect
});

test("pushPlanToWatch and pullWatchRuns use the plugin and the real store", async () => {
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const runDay = engine.allDays(plan).find((d) => d.iso >= TODAY && engine.isRun(d));
  const sent = [];
  const acked = [];
  const queue = [watchRun({ planIso: runDay.iso, startedAt: `${runDay.iso}T08:00:00.000Z` })];
  wear.setWearPluginForTest({
    sendPlan: async ({ json }) => sent.push(JSON.parse(json)),
    getPendingRuns: async () => ({ runs: queue.splice(0) }),
    ackRun: async ({ id }) => acked.push(id),
    status: async () => ({ connected: true, nodes: [{ id: "n1", name: "OnePlus Watch 3" }] }),
  });
  const r = await wear.pushPlanToWatch({ today: TODAY, onlyWithWatch: true });
  assert.equal(r.sent, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].units, "km");
  assert.equal(sent[0].simple, true, "a new plan is in Simple mode");
  assert.equal(sent[0].days.length, r.days);
  const pulled = await wear.pullWatchRuns();
  assert.deepEqual(pulled.saved, ["watch-1764057600000-ab12"]);
  assert.deepEqual(acked, ["watch-1764057600000-ab12"]);
  const list = await store.listActivities();
  assert.equal(list.length, 1);
  assert.equal(list[0].raw.source, "watch");
  assert.equal(list[0].km, 5.02);
  const marked = engine.allDays(await ps.currentPlan()).find((d) => d.iso === runDay.iso);
  assert.equal(marked.done.activityId, "watch-1764057600000-ab12");
  // A second pull with the same run again: no second record.
  queue.push(watchRun({ planIso: runDay.iso, startedAt: `${runDay.iso}T08:00:00.000Z` }));
  const again = await wear.pullWatchRuns();
  assert.deepEqual(again.duplicates, ["watch-1764057600000-ab12"]);
  assert.equal((await store.listActivities()).length, 1);
  // An automatic send with no paired watch sends nothing.
  const noWatch = [];
  wear.setWearPluginForTest({ sendPlan: async (x) => noWatch.push(x), status: async () => ({ connected: false, nodes: [] }) });
  assert.deepEqual(await wear.pushPlanToWatch({ today: TODAY, onlyWithWatch: true }), { sent: false, reason: "no-watch" });
  assert.equal(noWatch.length, 0);
  assert.equal((await wear.pushPlanToWatch({ today: TODAY })).sent, true, "the button sends always");
  wear.setWearPluginForTest({ status: async () => ({ connected: true, nodes: [{ id: "n1", name: "OnePlus Watch 3" }] }) });
  const st = await wear.watchStatus();
  assert.equal(st.connected, true);
  assert.equal(st.nodes[0].name, "OnePlus Watch 3");
});

/* ---------- parity fixture for the Kotlin port ---------- */

const segOut = (s) => ({ label: s.label, sec: s.sec, by: s.by, km: s.km ?? null, pace: s.pace ?? null, cls: s.cls, role: s.role, rep: s.rep ?? null, reps: s.reps ?? null, start: s.start, end: s.end, walk: !!s.walk });

function fixtureWorkouts() {
  const plans = [
    { plan: plan10k(), profile: PROFILE },
    { plan: engine.buildPlan({ goal: "runwalk", today: TODAY, runDays: [1, 3, 5], experience: "new", currentWeeklyKm: 0 }), profile: { experience: "new" } },
    { plan: engine.buildPlan({ goal: "marathon", today: TODAY, raceDate: "2027-04-25", runDays: [1, 2, 4, 6, 0], longRunDay: 0, experience: "experienced", currentWeeklyKm: 50 }), profile: { experience: "experienced" } },
    { plan: engine.buildPlan({ goal: "half", today: TODAY, raceDate: "2027-01-31", runDays: [2, 4, 0], longRunDay: 0, experience: "some", currentWeeklyKm: 30 }), profile: PROFILE },
  ];
  const out = [];
  const seen = new Set();
  for (const { plan, profile } of plans) {
    for (const d of engine.allDays(plan)) {
      if (!engine.isRun(d)) continue;
      const key = d.type;
      if (seen.has(key)) continue;
      seen.add(key);
      const tempC = out.length % 3 === 0 ? -2 : out.length % 3 === 1 ? 28 : null;
      out.push({ name: `${plan.goal} ${d.type} ${d.iso}`, day: wear.dayForWatch(d, wear.watchWarmupContext(plan, profile, tempC)) });
    }
  }
  const rw = steps.runWalkWorkout(2);
  out.push({ name: "run/walk level 2", day: wear.dayForWatch({ ...rw, iso: TODAY }, { experience: "new" }) });
  const custom = steps.builderToWorkout({ name: "My reps", warmMin: 10, coolMin: 5, blocks: [{ times: 4, work: { by: "dist", value: 0.8, target: "pace", paceLo: 250, paceHi: 262 }, rest: { by: "time", value: 2 } }, { times: 2, work: { by: "time", value: 3, target: "effort" }, rest: { by: "time", value: 1 } }] }, null);
  out.push({ name: "builder custom", day: wear.dayForWatch({ ...custom, iso: TODAY, type: "intervals" }, { experience: "some" }) });
  return out;
}

/* workouts: [{ name, day }]. They come from the engine only when the
   fixture is written; the check reuses the stored workouts, so a plan
   change in the engine does not make this test fail. */
function buildFixture(workouts) {
  const cases = [];
  const guidance = [];
  for (const [w, { name, day }] of workouts.entries()) {
    for (const units of ["km", "mi"]) {
      for (const useWarmup of [false, true]) {
        for (const simple of [false, true]) {
          if (units === "mi" && (simple || useWarmup)) continue;
          const showPace = !simple && day.showPace !== false;
          const voiceWorkout = steps.workoutForVoice(day, !simple || !!day.custom);
          const segs = rec.buildSegments(voiceWorkout, day.warmup, useWarmup);
          const cueTexts = rec.segmentCueTexts(voiceWorkout, segs, units, useWarmup ? day.warmup : null);
          cases.push({ w, name, units, useWarmup, simple, showPace: voiceWorkout.showPace, segments: segs.map(segOut), cueTexts });
          void showPace;
        }
      }
    }
  }
  // Pace guidance: for some segments with a target, a pace that is fast, then on target, then slow.
  const withBand = [];
  for (const c of cases) {
    if (c.units !== "km" || c.useWarmup || c.simple) continue;
    const day = workouts[c.w].day;
    const segs = rec.buildSegments(steps.workoutForVoice(day, true), day.warmup, false);
    segs.forEach((s, i) => {
      const band = rec.paceBand(s);
      if (band && !withBand.some((x) => x.cls === s.cls && x.name === c.name)) withBand.push({ name: c.name, segIndex: i, cls: s.cls, band });
    });
  }
  for (const w of withBand.slice(0, 10)) {
    for (const showPace of [true, false]) {
      for (const units of ["km", "mi"]) {
        const segs = rec.buildSegments(steps.workoutForVoice(workouts.find((x) => x.name === w.name).day, true), null, false);
        const seg = segs[w.segIndex];
        let g = null;
        const texts = [];
        for (let t = 0; t <= 420; t += 1) {
          const pace = t < 150 ? w.band.lo * 0.9 : t < 200 ? (w.band.lo + w.band.hi) / 2 : t < 230 ? null : w.band.hi * 1.12;
          const r = rec.paceGuidance(g, { seg, pace, segElapsed: t, now: t + 1000, showPace, units });
          g = r.g;
          if (r.text) texts.push({ t, text: r.text });
        }
        guidance.push({ w: workouts.findIndex((x) => x.name === w.name), segIndex: w.segIndex, showPace, units, texts });
      }
    }
  }
  // Splits: a run with pace changes and a stop.
  const samples = [{ t: 0, km: 0 }];
  let km = 0;
  for (let t = 1; t <= 3000; t++) {
    const pace = t < 600 ? 330 : t < 900 ? 280 : t < 1000 ? 100000 : t < 2000 ? 360 : 300;
    km += 1 / pace;
    if (t % 5 === 0) samples.push({ t, km: Math.round(km * 1e6) / 1e6 });
  }
  const splits = {};
  for (const units of ["km", "mi"]) {
    const unitKm = units === "mi" ? engine.KM_PER_MI : 1;
    const sp = rec.computeSplits(samples, unitKm);
    splits[units] = { splits: sp, cues: sp.filter((s) => !s.partial).map((s) => rec.splitCueText(s, units, s.n * 400 + 7.4)) };
  }
  const paces = [1, 2, 3, 24, 180, 199, 300, 599].map((n) => ({ n, pace: rec.paceFromWindow(samples.slice(0, n + 1), 30) }));
  const formats = [0.04, 1, 4.95, 5, 12.449, 12.45, 42.195, 100].map((k) => ({ km: k, fmtKm: engine.fmtKm(k, "km"), fmtMi: engine.fmtKm(k, "mi") }));
  const paceFormats = [179.5, 240, 299.6, 330, 395.25, 660].map((p) => ({ pace: p, km: engine.fmtPace(p, "km"), mi: engine.fmtPace(p, "mi") }));
  return { note: "Written by test/wear.test.mjs. Do not edit by hand.", workoutNames: workouts.map((x) => x.name), workouts: workouts.map((x) => x.day), cases, guidance, samples, splits, paces, formats, paceFormats };
}

const FIXTURE = new URL("../wear/app/src/test/resources/parity.json", import.meta.url);

test("parity fixture for the watch app is up to date", () => {
  const write = process.env.UPDATE_WEAR_FIXTURE === "1" || !existsSync(FIXTURE);
  const storedText = write ? null : readFileSync(FIXTURE, "utf8").trim();
  const stored = storedText ? JSON.parse(storedText) : null;
  const workouts = stored ? stored.workouts.map((day, i) => ({ name: stored.workoutNames[i], day })) : fixtureWorkouts();
  const fresh = buildFixture(workouts);
  assert.ok(fresh.cases.length >= 50, `cases: ${fresh.cases.length}`);
  assert.ok(fresh.guidance.length >= 8, `guidance: ${fresh.guidance.length}`);
  assert.ok(fresh.guidance.every((g) => g.texts.length > 0), "each guidance run gives cues");
  const text = JSON.stringify(fresh);
  if (write) {
    writeFileSync(FIXTURE, text + "\n");
    return;
  }
  assert.ok(storedText === text, "The recorder changed. Update the watch port, then run: UPDATE_WEAR_FIXTURE=1 npm test");
});
