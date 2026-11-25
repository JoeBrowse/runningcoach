/* Tests for src/plan/planState.js (the stored plan helper).
   lib/storage.js uses localStorage when there is no window. Node has no
   localStorage, so this file installs a small in-memory one first. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

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

const ps = await import("../src/plan/planState.js");
const engine = await import("../src/run/engine.js");
const store = await import("../src/shared/store.js");
const { reminderSchedule, effectiveTime, inQuiet } = await import("../src/plan/reminders.js");

const TODAY = "2026-11-25"; // a Wednesday
const PROFILE = { level: "some", goal: "10k", raceDate: "2027-03-07", experience: "some", currentWeeklyKm: 20, units: "km", onboarded: true };
const MASTER = { runDays: [2, 4, 0], longRunDay: 0, gymDays: [{ day: 1, type: "legs", intensity: "heavy", note: "Strength" }, { day: 3, type: "upper", intensity: "light" }] };

beforeEach(() => mem.clear());

test("rebuildPlan saves a safe plan with the gym days and an empty undo stack", async () => {
  const { state, plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  assert.equal(plan.goal, "10k");
  assert.equal(plan.raceIso, "2027-03-07");
  assert.ok(plan.safety.every((c) => c.ok), "a new plan passes every safety check");
  assert.equal(state.undo.length, 0);
  assert.equal(state.log.length, 1);
  assert.equal(state.log[0].kind, "rebuild");
  const stored = await store.getRunPlan();
  assert.equal(stored.version, 1);
  assert.equal(stored.plan.id, plan.id);
  assert.ok(engine.allDays(plan).some((d) => d.gym && d.gym.type === "legs"));
});

test("a second rebuild goes on the undo stack and undo restores the first plan", async () => {
  const first = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const second = await ps.rebuildPlan({ ...PROFILE, goal: "half", raceDate: "2027-04-18" }, MASTER, [], { today: TODAY });
  assert.equal(second.state.undo.length, 1);
  assert.equal((await ps.currentPlan()).goal, "half");
  const back = await ps.undo();
  assert.equal(back.plan.id, first.plan.id);
  assert.equal(back.undo.length, 0);
  assert.ok(back.log.some((e) => e.kind === "rebuild" && e.undone));
});

test("applyEvent asks questions first and saves nothing until the answers come", async () => {
  await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const { state, result } = await ps.applyEvent({ type: "illness" }, { today: TODAY });
  assert.equal(result.needsAnswers, true);
  assert.ok(result.questions.length >= 2);
  assert.equal(state.undo.length, 0);
  assert.equal(state.log.length, 1);
});

test("applyEvent with answers changes the plan, logs the reasons and undo takes it back", async () => {
  const { plan: before } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const start = before.startIso;
  const { state, result } = await ps.applyEvent({ type: "illness", answers: { where: "below", fever: true } }, { today: start });
  assert.ok(result.changes.length > 0);
  assert.equal(state.undo.length, 1);
  const entry = state.log.at(-1);
  assert.equal(entry.kind, "illness");
  assert.ok(entry.changes.every((c) => c.reason && c.date));
  const back = await ps.undo();
  assert.deepEqual(back.plan.weeks[0].days.map((d) => d.type), before.weeks[0].days.map((d) => d.type));
});

test("a refused move does not save and gives the engine's reason; a safe move saves", async () => {
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const run = engine.allDays(plan).find((d) => engine.isRun(d) && d.type !== "race");
  const refused = await ps.applyEvent({ type: "move", fromIso: run.iso, toIso: "2026-11-20" }, { today: TODAY });
  assert.equal(refused.result.refused, true);
  assert.ok(refused.result.reason.length > 0);
  assert.equal(refused.state.undo.length, 0);
  const sug = engine.suggestDays(plan, run.iso, { today: TODAY });
  if (sug.safe.length) {
    const ok = await ps.applyEvent({ type: "move", fromIso: run.iso, toIso: sug.safe[0] }, { today: TODAY });
    assert.equal(ok.state.undo.length, 1);
    assert.ok(ok.state.plan.safety.every((c) => c.ok));
  }
});

test("markDone marks the run, and a gym session marks the gym day", async () => {
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const run = engine.allDays(plan).find((d) => engine.isRun(d));
  const s1 = await ps.markDone(run.iso, "run-1");
  const d1 = engine.allDays(s1.plan).find((d) => d.iso === run.iso);
  assert.equal(d1.done.activityId, "run-1");
  assert.equal(s1.undo.length, 0, "a done mark is not a plan change");
  const gymDay = engine.allDays(plan).find((d) => d.gym);
  await ps.markGymSession({ id: "lift-9", date: gymDay.iso });
  const d2 = engine.allDays(await ps.currentPlan()).find((d) => d.iso === gymDay.iso);
  assert.equal(d2.gymDone.activityId, "lift-9");
});

test("done marks survive a rebuild on the same dates", async () => {
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const run = engine.allDays(plan).find((d) => engine.isRun(d));
  await ps.markDone(run.iso, "run-1");
  const { plan: next } = await ps.rebuildPlan({ ...PROFILE, currentWeeklyKm: 22 }, MASTER, [], { today: TODAY });
  const d = engine.allDays(next).find((x) => x.iso === run.iso);
  if (d && engine.isRun(d)) assert.equal(d.done.activityId, "run-1");
});

test("todayInfo gives today's run, gym and next run", async () => {
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const monday = plan.startIso; // the plan starts on a Monday: heavy legs day
  const info = await ps.todayInfo(monday);
  assert.equal(info.weekIndex, 0);
  assert.ok(info.gym && info.gym.type === "legs");
  assert.ok(info.nextRun && info.nextRun.iso > monday);
  const runDay = engine.allDays(plan).find((d) => engine.isRun(d));
  const info2 = ps.todayInfoFor(plan, runDay.iso, MASTER);
  assert.equal(info2.run.iso, runDay.iso);
});

test("todayInfo without a plan reads the gym day from the master week", async () => {
  await store.setMasterPlan(MASTER);
  const info = await ps.todayInfo("2026-11-30"); // Monday
  assert.equal(info.run, null);
  assert.equal(info.gym.type, "legs");
  assert.equal(info.weekIndex, -1);
});

test("saveMasterAndRebuild changes the plan and undo puts the old master week back", async () => {
  await store.setRunProfile(PROFILE);
  await store.setMasterPlan(MASTER);
  await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const next = { ...MASTER, gymDays: [{ day: 1, type: "legs", intensity: "light" }] };
  await ps.saveMasterAndRebuild(next, { today: TODAY });
  assert.equal((await store.getMasterPlan()).gymDays[0].intensity, "light");
  await ps.undo();
  assert.equal((await store.getMasterPlan()).gymDays[0].intensity, "heavy");
});

test("planOptions uses typed values before history, and drops past races", () => {
  const seed = { score: 40, currentWeeklyKm: 30 };
  const o = ps.planOptions({ ...PROFILE, score: 38 }, MASTER, [{ date: "2026-01-01", distKm: 5, priority: "B" }, { date: "2027-01-10", distKm: 5, priority: "C", name: "Parkrun" }], { today: TODAY, seed });
  assert.equal(o.score, 38);
  assert.equal(o.currentWeeklyKm, 20);
  assert.equal(o.races.length, 1);
  assert.equal(o.usesLift, true);
  const n = ps.planOptions({ level: "new" }, {}, [], { today: TODAY, seed });
  assert.equal(n.goal, "runwalk");
  assert.equal(n.currentWeeklyKm, 0);
  assert.equal(n.score, undefined);
});

test("reminders: quiet hours move the time, and the text names tomorrow's sessions", async () => {
  assert.equal(inQuiet("23:00", "22:00", "07:00"), true);
  assert.equal(inQuiet("20:00", "22:00", "07:00"), false);
  assert.equal(effectiveTime({ time: "23:15", quietFrom: "22:00", quietTo: "07:00" }), "21:30");
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  const list = reminderSchedule(plan, MASTER, { on: true, time: "20:00" }, new Date(2026, 10, 30, 8, 0));
  assert.ok(list.length > 0);
  assert.ok(list.every((n) => n.body.startsWith("Tomorrow: ")));
  assert.equal(reminderSchedule(plan, MASTER, { on: false }).length, 0);
});
