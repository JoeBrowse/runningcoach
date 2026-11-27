/* Tests for the 2.1 UI helpers (spec docs/v1.1-spec.md sections 1, 2 and 4):
   src/plan/weekSetup.js ("Your week" answers -> planWeek input -> master
   record, the rule check for changed days, the Lift wizard pre-fill) and
   src/plan/unplanned.js (intensity and areas of an unplanned session, and
   the call to the plan). Node has no localStorage, so this file installs
   a small in-memory one first. */
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

const engine = await import("../src/run/engine.js");
const ws = await import("../src/plan/weekSetup.js");
const un = await import("../src/plan/unplanned.js");
const ps = await import("../src/plan/planState.js");
const store = await import("../src/shared/store.js");

beforeEach(() => mem.clear());

/* ---------- Your week ---------- */

test("defaultAnswers: counts come from engine.recommendWeek for each use", () => {
  const run = ws.defaultAnswers("run", { levels: { runLevel: "some" }, recommend: engine.recommendWeek });
  assert.equal(run.use, "run");
  assert.equal(run.liftDays, 0);
  assert.equal(run.runDays, engine.recommendWeek({ use: "run", runLevel: "some" }).runDays);
  assert.equal(run.priority, "run");
  assert.equal(run.doubles, false);
  assert.deepEqual(run.availableDays, [1, 2, 3, 4, 5, 6, 0]);

  const lift = ws.defaultAnswers("lift", { levels: { liftLevel: "advanced" }, recommend: engine.recommendWeek });
  assert.equal(lift.runDays, 0);
  assert.equal(lift.liftDays, engine.recommendWeek({ use: "lift", liftLevel: "advanced" }).liftDays);
  assert.equal(lift.priority, "lift");

  const both = ws.defaultAnswers("both", { levels: { runLevel: "new", liftLevel: "beginner" }, recommend: engine.recommendWeek });
  const rec = engine.recommendWeek({ use: "both", runLevel: "new", liftLevel: "beginner", priority: "equal" });
  assert.equal(both.runDays, rec.runDays);
  assert.equal(both.liftDays, rec.liftDays);
  assert.equal(both.priority, "equal");
  assert.equal(both.doubles, false, "two sessions a day: the default is no");
});

test("defaultAnswers: an earlier week from Settings keeps its days and counts", () => {
  const prev = { use: "both", availableDays: [1, 3, 5, 6], runCount: 2, liftCount: 2, priority: "lift", doubles: true, longRunDay: 6 };
  const a = ws.defaultAnswers("both", { prev, recommend: engine.recommendWeek });
  assert.deepEqual(a.availableDays, [1, 3, 5, 6]);
  assert.equal(a.runDays, 2);
  assert.equal(a.liftDays, 2);
  assert.equal(a.priority, "lift");
  assert.equal(a.doubles, true);
  assert.equal(a.longRunDay, 6);
});

test("toPlanWeekInput: the answers map to the planWeek contract", () => {
  const input = ws.toPlanWeekInput({ use: "both", availableDays: [0, 2, 1, 2], runDays: 3, liftDays: 2, priority: "run", doubles: true, runLevel: "experienced", liftLevel: "intermediate", longRunDay: 0 });
  assert.deepEqual(input, { use: "both", availableDays: [1, 2, 0], runDays: 3, liftDays: 2, priority: "run", doubles: true, runLevel: "experienced", liftLevel: "intermediate", longRunDay: 0 });
  const runOnly = ws.toPlanWeekInput({ use: "run", availableDays: [1, 3], runDays: 2, liftDays: 3, priority: "lift", doubles: true });
  assert.equal(runOnly.liftDays, 0);
  assert.equal(runOnly.priority, "run");
  assert.equal(runOnly.doubles, false);
  const liftOnly = ws.toPlanWeekInput({ use: "lift", availableDays: [1, 3], runDays: 4, liftDays: 2, longRunDay: 3 });
  assert.equal(liftOnly.runDays, 0);
  assert.equal(liftOnly.priority, "lift");
  assert.equal(liftOnly.longRunDay, undefined);
});

test("Your week: every proposed week passes the UI rule check and maps to a master record", () => {
  let n = 0;
  for (const use of ws.USES)
    for (const runLevel of ws.RUN_LEVELS)
      for (const liftLevel of ws.LIFT_LEVELS)
        for (const priority of ws.PRIORITIES)
          for (const doubles of [false, true])
            for (const k of [2, 4, 7]) {
              const a = { ...ws.defaultAnswers(use, { levels: { runLevel, liftLevel }, recommend: engine.recommendWeek }), availableDays: [1, 2, 3, 4, 5, 6, 0].slice(0, k), priority, doubles };
              const week = engine.planWeek(ws.toPlanWeekInput(a));
              assert.deepEqual(ws.checkWeek(week, a), [], `${use} ${runLevel} ${liftLevel} ${priority} ${doubles} ${k}`);
              const m = ws.toMasterRecord(week, a, { keep: 1 });
              assert.equal(m.keep, 1, "keys that the flow does not own stay");
              assert.equal(m.use, use);
              assert.equal(m.doubles, use === "both" ? doubles : false);
              assert.ok(Array.isArray(m.runDays) && Array.isArray(m.gymDays));
              for (const d of [...m.runDays, ...m.gymDays.map((g) => g.day)]) assert.ok(a.availableDays.includes(d), "nothing on an unavailable day");
              if (use === "lift") assert.deepEqual(m.runDays, []);
              if (use === "run") assert.deepEqual(m.gymDays, []);
              if (m.runDays.length) assert.ok(m.runDays.includes(m.longRunDay), "the long run is on a run day");
              for (const g of m.gymDays) {
                assert.ok(["upper", "lower", "full", "legs"].includes(g.type));
                assert.ok(["heavy", "light"].includes(g.intensity));
              }
              n++;
            }
  assert.ok(n > 400);
});

test("checkWeek: a changed day shows the rule that it breaks", () => {
  const a = { use: "both", availableDays: [1, 2, 3, 4, 5, 6, 0], runDays: 3, liftDays: 2, priority: "equal", doubles: false, runLevel: "some", liftLevel: "intermediate" };
  const week = { runDays: [2, 4, 0], longRunDay: 0, gymDays: [{ day: 1, type: "upper", intensity: "heavy" }, { day: 3, type: "lower", intensity: "light" }], doubles: [] };
  assert.deepEqual(ws.checkWeek(week, a), []);

  // Heavy legs on Friday: less than 72 hours before the long run on Sunday.
  const legsFri = ws.applyDayEdit(week, 5, { run: null, gym: { type: "legs", intensity: "heavy" } }, a);
  assert.deepEqual(ws.checkWeek(legsFri, a).map((b) => b.rule), ["legs-long"]);
  // Light legs on Friday is fine.
  const lightFri = ws.applyDayEdit(week, 5, { run: null, gym: { type: "legs", intensity: "light" } }, a);
  assert.deepEqual(ws.checkWeek(lightFri, a), []);

  // A lower-body session on a run day needs two sessions a day.
  const lowerTue = ws.applyDayEdit(week, 2, { run: "run", gym: { type: "lower", intensity: "light" } }, a);
  assert.deepEqual(ws.checkWeek(lowerTue, a).map((b) => b.rule), ["doubles"]);
  assert.deepEqual(ws.checkWeek(lowerTue, { ...a, doubles: true }), []);
  assert.equal(lowerTue.doubles.length, 1);
  assert.equal(lowerTue.doubles[0].gapHours, 6);
  // "No" to two sessions on one day is firm: upper body and an easy run also need it.
  const upperTue = ws.applyDayEdit(week, 2, { run: "run", gym: { type: "upper", intensity: "light" } }, a);
  assert.deepEqual(ws.checkWeek(upperTue, a).map((b) => b.rule), ["doubles"]);
  assert.match(ws.checkWeek(upperTue, a)[0].text, /You chose no training twice on one day/);
  assert.deepEqual(ws.checkWeek(upperTue, { ...a, doubles: true }), []);
  const upperSun = ws.applyDayEdit(week, 0, { run: "long", gym: { type: "upper", intensity: "light" } }, a);
  assert.deepEqual(ws.checkWeek(upperSun, a).map((b) => b.rule), ["doubles"]);

  // An unavailable day.
  const noFri = { ...a, availableDays: [1, 2, 3, 4, 6, 0] };
  const runFri = ws.applyDayEdit(week, 5, { run: "run", gym: null }, noFri);
  assert.ok(ws.checkWeek(runFri, noFri).some((b) => b.rule === "available" && b.day === 5));

  // No rest day.
  let full = week;
  for (const d of [5, 6]) full = ws.applyDayEdit(full, d, { run: "run", gym: null }, a);
  assert.ok(ws.checkWeek(full, a).some((b) => b.rule === "rest"));
  // Beginners need two rest days.
  const beginner = { ...a, runLevel: "new" };
  const oneRest = ws.applyDayEdit(week, 5, { run: "run", gym: null }, beginner);
  assert.ok(ws.checkWeek(oneRest, beginner).some((b) => b.rule === "rest"));
  for (const b of ws.checkWeek(full, a)) assert.ok(b.text.length > 0 && b.text.split(". ").every((x) => x.split(" ").length <= 22), "short STE sentences");
});

test("applyDayEdit: the long run moves and there is always one long run", () => {
  const a = { use: "run", availableDays: [1, 2, 3, 4, 5, 6, 0] };
  const week = { runDays: [2, 4, 0], longRunDay: 0, gymDays: [], doubles: [] };
  const moved = ws.applyDayEdit(week, 6, { run: "long", gym: null }, a);
  assert.equal(moved.longRunDay, 6);
  assert.deepEqual(moved.runDays, [2, 4, 6, 0]);
  const removed = ws.applyDayEdit(week, 0, { run: null, gym: null }, a);
  assert.deepEqual(removed.runDays, [2, 4]);
  assert.equal(removed.longRunDay, 4);
  assert.deepEqual(removed.restDays, [1, 3, 5, 6, 0]);
  const rows = ws.weekRows(moved, a);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].day, 1, "Monday first");
  assert.equal(rows.find((r) => r.day === 6).run, "long");
  assert.equal(rows.find((r) => r.day === 0).run, "run");
});

test("toProfilePatch: running stays not set up; levels are kept", () => {
  const p = ws.toProfilePatch({ use: "both", runLevel: "new", liftLevel: "advanced" }, {});
  assert.deepEqual(p, { use: "both", liftLevel: "advanced", experience: "new", level: "new", usesLift: true });
  assert.equal(p.onboarded, undefined);
  const onboarded = ws.toProfilePatch({ use: "run", runLevel: "new" }, { onboarded: true, level: "racer", experience: "experienced" });
  assert.equal(onboarded.experience, undefined, "a set-up runner keeps the experience");
  assert.equal(onboarded.usesLift, false);
  const lift = ws.toProfilePatch({ use: "lift", liftLevel: "intermediate" }, {});
  assert.deepEqual(lift, { use: "lift", liftLevel: "intermediate" });
});

test("guidedPrefill: level -> experience, lift days -> sessions, split -> preset", () => {
  const two = ws.guidedPrefill({ gymDays: [{ day: 1 }, { day: 4 }], liftSplit: "full" }, "beginner");
  assert.deepEqual(two, { experience: "new", presetKey: "full-body", sessions: 2, split: "full", splitLabel: "Full body" });
  const three = ws.guidedPrefill({ gymDays: [{ day: 1 }, { day: 3 }, { day: 5 }] }, "intermediate");
  assert.equal(three.experience, "some");
  assert.equal(three.split, "upper-lower-upper");
  assert.equal(three.presetKey, "upper-lower");
  const four = ws.guidedPrefill({ gymDays: [1, 2, 4, 5].map((day) => ({ day })), liftSplit: "upper-lower" }, "advanced");
  assert.equal(four.experience, "experienced");
  assert.equal(four.presetKey, "upper-lower");
  const none = ws.guidedPrefill(null, "advanced");
  assert.equal(none.sessions, 0);
  assert.equal(none.presetKey, null);
});

/* ---------- unplanned sessions ---------- */

const set = (weight, reps, rir) => ({ weight, reps, ...(rir === undefined ? {} : { rir }) });

test("liftAreas: legs from quads, hamstrings, glutes or calves with working sets", () => {
  assert.deepEqual(un.liftAreas({ exercises: [{ muscle: "Quads", sets: [set(100, 5)] }, { muscle: "Core", sets: [set("", 20)] }] }), ["legs"]);
  assert.deepEqual(un.liftAreas({ exercises: [{ muscle: "Chest", sets: [set(60, 8)] }, { muscle: "Back", sets: [set(50, 10)] }] }), ["upper"]);
  assert.deepEqual(un.liftAreas({ exercises: [{ muscle: "Glutes", sets: [set(80, 8)] }, { muscle: "Chest", sets: [set(60, 8)] }] }), ["full"]);
  // An empty set is not a working set.
  assert.deepEqual(un.liftAreas({ exercises: [{ muscle: "Hamstrings", sets: [set("", "")] }, { muscle: "Biceps", sets: [set(12, 10)] }] }), ["upper"]);
  assert.deepEqual(un.liftAreas({ exercises: [] }), ["upper"]);
});

test("liftIntensity: hard from RIR 3 or less, easy above; no RIR counts as hard", () => {
  assert.equal(un.liftIntensity({ exercises: [{ muscle: "Quads", sets: [set(100, 5, 2), set(100, 5, 3)] }] }), "hard");
  assert.equal(un.liftIntensity({ exercises: [{ muscle: "Quads", sets: [set(40, 10, 5), set(40, 10, 4)] }] }), "easy");
  assert.equal(un.liftIntensity({ exercises: [{ muscle: "Quads", sets: [set(100, 5)] }] }), "hard", "the safe side");
});

test("runIntensity: easy at RPE 4 or less, hard above, long over 75 minutes", () => {
  assert.equal(un.runIntensity({ rpe: 3, minutes: 30 }), "easy");
  assert.equal(un.runIntensity({ rpe: 4, minutes: 30 }), "easy");
  assert.equal(un.runIntensity({ rpe: 5, minutes: 30 }), "hard");
  assert.equal(un.runIntensity({ rpe: 3, minutes: 80 }), "long");
  assert.equal(un.runIntensity({ rpe: 9, minutes: 76 }), "long");
  assert.equal(un.runIntensity({ minutes: 40 }), "easy");
});

test("runEvent / liftEvent: the adapt event shape", () => {
  const r = un.runEvent({ type: "run", date: "2026-12-02", minutes: 50, seconds: 30, rpe: 6 });
  assert.deepEqual(r, { type: "unplannedSession", kind: "run", date: "2026-12-02", intensity: "hard", areas: ["legs"], minutes: 51 });
  const r2 = un.runEvent({ startedAt: "2026-12-02T07:00:00Z", durationSec: 5400 });
  assert.equal(r2.intensity, "long");
  assert.equal(r2.minutes, 90);
  const l = un.liftEvent({ date: "2026-12-03", startedAt: "2026-12-03T17:00:00Z", at: "2026-12-03T18:00:00Z", exercises: [{ muscle: "Quads", sets: [set(100, 5, 1)] }] }, {});
  assert.deepEqual(l, { type: "unplannedSession", kind: "lift", date: "2026-12-03", intensity: "hard", areas: ["legs"], minutes: 60 });
});

test("isRecentDate: today and yesterday only", () => {
  assert.equal(un.isRecentDate("2026-12-02", "2026-12-02"), true);
  assert.equal(un.isRecentDate("2026-12-01", "2026-12-02"), true);
  assert.equal(un.isRecentDate("2026-11-30", "2026-12-02"), false);
  assert.equal(un.isRecentDate("2026-12-03", "2026-12-02"), false);
  assert.equal(un.isRecentDate(null, "2026-12-02"), false);
});

/* A plan that starts on Monday 30 Nov 2026:
   Mon upper (heavy), Tue easy run, Wed upper (light), Thu hard run, Sun long run. */
const TODAY = "2026-11-30";
const PROFILE = { level: "some", goal: "10k", raceDate: "2027-03-07", experience: "some", currentWeeklyKm: 25, units: "km", onboarded: true };
const MASTER = { runDays: [2, 4, 0], longRunDay: 0, gymDays: [{ day: 1, type: "upper", intensity: "heavy", note: "" }, { day: 3, type: "upper", intensity: "light", note: "" }] };

async function freshPlan() {
  await store.setKey(store.KEYS.runProfile, PROFILE);
  await store.setKey(store.KEYS.masterPlan, MASTER);
  const { plan } = await ps.rebuildPlan(PROFILE, MASTER, [], { today: TODAY });
  return plan;
}

test("reportUnplanned: a heavy leg session on a run day changes the hard run, with Undo", async () => {
  const plan = await freshPlan();
  const thu = engine.allDays(plan).find((d) => d.iso === "2026-12-03");
  assert.equal(thu.intensity, "hard");
  assert.equal(un.plannedOn(plan, "2026-12-03").gym, false);
  const seen = [];
  const off = un.onPlanNotice((n) => seen.push(n));
  const session = { id: "s1", date: "2026-12-03", exercises: [{ id: "squat", muscle: "Quads", sets: [set(100, 5, 1), set(100, 5, 1)] }] };
  const n = await un.reportUnplannedLift(session, {}, { today: "2026-12-03" });
  off();
  assert.ok(n && n.changed, "the plan changed");
  assert.equal(seen.length, 1, "one notice");
  assert.ok(n.result.changes.every((c) => c.reason), "each change has a reason");
  const after = await ps.currentPlan();
  assert.ok(after.safety.every((c) => c.ok), "every safety check still passes");
  const state = await ps.loadPlanState();
  assert.equal(state.log[state.log.length - 1].kind, "unplannedSession");
  await un.undoLast();
  const back = await ps.currentPlan();
  assert.equal(engine.allDays(back).find((d) => d.iso === "2026-12-03").intensity, "hard", "Undo puts the hard run back");
});

test("reportUnplanned: a hard run on a gym day eases the next hard run", async () => {
  await freshPlan();
  // Wednesday has a planned gym session and no run.
  const n = await un.reportUnplannedRun({ type: "run", date: "2026-12-02", minutes: 45, rpe: 8 }, { today: "2026-12-02", emitNotice: false });
  assert.ok(n && n.changed);
  const thu = engine.allDays(await ps.currentPlan()).find((d) => d.iso === "2026-12-03");
  assert.notEqual(thu.intensity, "hard");
});

test("reportUnplanned: no call for a planned session, an old date or a day outside the plan", async () => {
  await freshPlan();
  const before = (await ps.loadPlanState()).log.length;
  // Tuesday has a planned run; Monday has a planned gym session.
  assert.equal(await un.reportUnplannedRun({ type: "run", date: "2026-12-01", minutes: 30, rpe: 3 }, { today: "2026-12-01", emitNotice: false }), null);
  assert.equal(await un.reportUnplannedLift({ date: "2026-11-30", exercises: [{ muscle: "Chest", sets: [set(60, 8)] }] }, {}, { today: "2026-11-30", emitNotice: false }), null);
  // Before the plan starts.
  assert.equal(await un.reportUnplannedRun({ type: "run", date: "2026-11-20", minutes: 30 }, { today: "2026-11-20", emitNotice: false }), null);
  // Imported runs: only today or yesterday.
  assert.equal(await un.reportImportedRuns([{ type: "run", date: "2026-12-02", minutes: 40, rpe: 8 }], { today: "2026-12-06", emitNotice: false }), null);
  assert.equal((await ps.loadPlanState()).log.length, before, "the plan did not change");
  const n = await un.reportImportedRuns([{ type: "cycle", date: "2026-12-02", minutes: 40 }, { type: "run", date: "2026-12-02", minutes: 40, rpe: 8 }], { today: "2026-12-02", emitNotice: false });
  assert.ok(n && n.kind === "run");
});

test("tired: the engine event runs through planState and keeps the plan safe", async () => {
  await freshPlan();
  const { result } = await ps.applyEvent({ type: "tired" }, { today: "2026-12-03" });
  assert.ok(!result.refused);
  assert.ok(result.changes.some((c) => c.iso === "2026-12-03" && c.reason));
  const after = await ps.currentPlan();
  assert.notEqual(engine.allDays(after).find((d) => d.iso === "2026-12-03").intensity, "hard");
  assert.ok(after.safety.every((c) => c.ok));
});
