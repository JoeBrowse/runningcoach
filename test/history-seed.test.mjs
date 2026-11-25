/* Tests for the run history seed and the week 1 rules that use it:
   - a robust weekly distance (one low week does not pull it down, a real break does),
   - runs a week and the usual long run,
   - new run days start as short easy runs,
   - the week 1 long run starts at about the usual long run, inside the caps,
   - the path from a Strava import to the plan, with the store's real data shapes,
   - the user report: a 28:00 5K runner with about 20 km a week got a 9 km first week. */
import { test } from "node:test";
import assert from "node:assert/strict";

// lib/storage.js uses localStorage when there is no window. Node has none.
if (typeof globalThis.localStorage === "undefined") {
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
}

const E = await import("../src/run/engine.js");
const ps = await import("../src/plan/planState.js");
const store = await import("../src/shared/store.js");
const { importFiles } = await import("../src/shared/import/index.js");
const { verdicts, CHECK_MAP, isRun, LONG, QUALITY, weekKm } = await import("./engine-helpers.mjs");

const TODAY = "2026-11-25"; // a Wednesday
const SCORE_28 = E.fitnessScore(5, 28 * 60);

/* Activities in the shape of ps.engineActivities(): one entry for each run.
   weeks[w] lists the run distances of the 7-day block w (0 = the last 7 days). */
function history(weeks, { pace = 440 } = {}) {
  const out = [];
  weeks.forEach((runs, w) => {
    runs.forEach((km, i) => {
      const iso = E.addDays(TODAY, -(w * 7 + 1 + i * 2));
      out.push({ id: `w${w}r${i}`, iso, date: iso, type: "run", title: "Run", name: "Run", km, min: (km * pace) / 60 });
    });
  });
  return out;
}
const repeat = (n, runs) => Array.from({ length: n }, () => runs.slice());

const allOk = (plan) => plan.safety.every((s) => s.ok);
const verdictsOk = (plan) => Object.values(verdicts(plan)).every((f) => f.length === 0);
const week1Runs = (plan) => plan.weeks[0].days.filter((d) => isRun(d) && d.type !== "race");

/* ---------- seed ---------- */

test("seed: one empty week (a holiday) does not pull the weekly distance down", () => {
  const s = E.seedFromHistory(history([[], ...repeat(11, [10, 10])]), TODAY);
  assert.equal(s.avg4WeeksKm, 15);
  assert.equal(s.avg12WeeksKm, Math.round((220 / 12) * 10) / 10);
  assert.equal(s.weeklyKmSource, "steady");
  assert.ok(s.currentWeeklyKm > s.avg4WeeksKm, "the value is above the 4-week average");
  assert.ok(s.currentWeeklyKm <= s.avg12WeeksKm, "never more than the 12-week average");
  assert.ok(s.currentWeeklyKm <= 20 * 1.1, "never more than 1.1 x the highest of the last 4 weeks");
  assert.ok(s.notes.some((n) => /middle value of your last 6 weeks/.test(n)), "a note says which value and why");
  assert.match(s.weeklyKmNote, /last 6 weeks/);

  const low = E.seedFromHistory(history([[5], ...repeat(11, [10, 10])]), TODAY);
  assert.equal(low.weeklyKmSource, "steady");
  assert.equal(low.currentWeeklyKm, Math.round(((5 + 220) / 12) * 10) / 10, "capped at the 12-week average");
});

test("seed: a real break (3 of the last 4 weeks nearly empty) still lowers the weekly distance", () => {
  const s = E.seedFromHistory(history([[], [], [1], ...repeat(9, [10, 10])]), TODAY);
  assert.equal(s.weeklyKmSource, "break");
  assert.equal(s.currentWeeklyKm, s.avg4WeeksKm);
  assert.ok(s.currentWeeklyKm < 6);
  assert.ok(s.notes.some((n) => /almost no running/.test(n)));
});

test("seed: steady training keeps the 4-week average", () => {
  const s = E.seedFromHistory(history(repeat(12, [8, 6, 12])), TODAY);
  assert.equal(s.weeklyKmSource, "last4");
  assert.equal(s.currentWeeklyKm, 26);
  assert.equal(s.currentWeeklyKm, s.avg4WeeksKm);
});

test("seed: runs a week and the usual long run come from the last 6 weeks with a run", () => {
  const weeks = [[4, 12, 5], [], [4, 10, 6], [3, 9, 5], [4, 11], [5, 10, 4], ...repeat(6, [30])];
  const s = E.seedFromHistory(history(weeks), TODAY);
  assert.equal(s.runsPerWeek, 3, "the median of 3, 3, 3, 2, 3 runs");
  assert.equal(s.usualLongRunKm, 10, "the median of 12, 10, 9, 11, 10");
  assert.equal(s.longestRecentKm, 30, "the longest run of the last 12 weeks stays");
  assert.equal(s.peak12WeeksKm, 30);
  const none = E.seedFromHistory([], TODAY);
  assert.equal(none.runsPerWeek, 0);
  assert.equal(none.usualLongRunKm, 0);
  assert.equal(none.currentWeeklyKm, 0);
});

/* ---------- week 1 from the history ---------- */

const half3 = (extra = {}) => E.buildPlan({ goal: "half", today: TODAY, runDays: [2, 4, 6], longRunDay: 6, score: SCORE_28, experience: "some", ...extra });

test("week 1: a new run day starts as a short easy run, and the usual runs keep their distance", () => {
  const plan = E.buildPlan({ goal: "10k", today: TODAY, runDays: [1, 2, 4, 5, 0], longRunDay: 0, score: 40, experience: "some", currentWeeklyKm: 30, runsPerWeek: 3, usualLongRunKm: 12, longestRecentKm: 13, peakWeekKm: 36 });
  const runs = week1Runs(plan);
  const fresh = runs.filter((d) => /new run day/i.test(d.why || ""));
  assert.equal(fresh.length, 2, "two new run days");
  for (const d of fresh) {
    assert.equal(d.type, "easy");
    assert.ok(d.km >= E.SAFETY.minRunKm && d.km <= 5, `new run ${d.km} km is short`);
  }
  assert.ok(!runs.some((d) => QUALITY.has(d.type)), "week 1 has no hard session when it adds a run day");
  const usual = runs.filter((d) => !fresh.includes(d)).reduce((s, d) => s + d.km, 0);
  assert.ok(usual >= 30 * 0.95, `the usual runs keep about their distance (${usual} km)`);
  const lim = E.week1Limit({ currentWeeklyKm: 30, nRunDays: 5, runsPerWeek: 3, peakWeekKm: 36, newRunKm: plan.settings.newRunKm });
  assert.equal(plan.limits.week1MaxKm, lim.maxKm);
  assert.equal(lim.rule, "newDays");
  assert.ok(lim.maxKm <= 30 * 1.25 && lim.maxKm <= 36);
  assert.ok(weekKm(plan.weeks[0]) <= lim.maxKm + 0.1);
  assert.ok(plan.changesFromRules.some((c) => c.reason.startsWith("A new run day starts as a short easy run.")));
  const w1 = plan.safety.find((c) => c.id === "week1");
  assert.ok(w1.ok && /short new runs/.test(w1.rule), "the week 1 check names the new rule");
  assert.ok(allOk(plan) && verdictsOk(plan), JSON.stringify(plan.safety.filter((c) => !c.ok)));
});

test("week 1 limit: current + 10%, or current + the new short runs, at most + 25% and the peak week", () => {
  const L = (o) => E.week1Limit({ newRunKm: 3.5, ...o });
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 3 }).maxKm, 22);
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 3, runsPerWeek: 2 }).maxKm, 23.5);
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 5, runsPerWeek: 2 }).maxKm, 25, "never more than current + 25%");
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 5, runsPerWeek: 2, peakWeekKm: 23 }).maxKm, 23, "never more than the peak week");
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 5, runsPerWeek: 2, peakWeekKm: 19 }).maxKm, 22, "current + 10% stays allowed");
  assert.equal(L({ currentWeeklyKm: 40, nRunDays: 4, runsPerWeek: 3 }).maxKm, 44, "+10% is larger than one new run");
  const starter = L({ currentWeeklyKm: 2, nRunDays: 3, runsPerWeek: 1 });
  assert.equal(starter.rule, "floor");
  assert.equal(starter.maxKm, 9, "the starter floor is only for runners near zero");
  assert.equal(L({ currentWeeklyKm: 20, nRunDays: 3, runsPerWeek: 3 }).rule, "base");
  assert.ok(E.newRunKmFor(E.paces(SCORE_28)) >= 3 && E.newRunKmFor(E.paces(SCORE_28)) <= 5);
  assert.equal(E.newRunKmFor(E.paces(80)), 5);
  assert.equal(E.newRunKmFor(E.paces(15)), 3);
});

test("week 1: the long run starts at about the usual long run, inside the caps", () => {
  const a = half3({ currentWeeklyKm: 30, runsPerWeek: 3, usualLongRunKm: 13, longestRecentKm: 14 });
  const longA = week1Runs(a).find((d) => LONG.has(d.type));
  assert.ok(longA.km >= 13 && longA.km <= 14 * 1.1 + 0.05, `long run ${longA.km} km`);
  assert.ok(week1Runs(a).every((d) => d.km <= longA.km), "the long run is the longest run of the week");
  assert.ok(allOk(a) && verdictsOk(a));

  // The longest recent run + 10% caps a usual long run that is too high.
  const b = half3({ currentWeeklyKm: 30, runsPerWeek: 3, usualLongRunKm: 15, longestRecentKm: 10 });
  assert.ok(week1Runs(b).find((d) => LONG.has(d.type)).km <= 11 + 0.05);
  assert.ok(allOk(b) && verdictsOk(b));

  // The goal cap, 3 hours and the share of the week still apply.
  const c = half3({ currentWeeklyKm: 40, runsPerWeek: 3, usualLongRunKm: 30, longestRecentKm: 31 });
  const longC = week1Runs(c).find((d) => LONG.has(d.type));
  assert.ok(longC.km <= c.limits.longCapKm + 0.05 && longC.min <= E.SAFETY.longRunMaxMin + 1);
  assert.ok(longC.km <= 0.45 * c.weeks[0].trainingKm + 0.1);
  assert.ok(c.changesFromRules.some((x) => /not your usual 30 km/.test(x.change)), "the plan says why the long run is shorter");
  assert.ok(allOk(c) && verdictsOk(c));

  // Without the history, nothing changes.
  const plain = half3({ currentWeeklyKm: 30 });
  assert.equal(plain.limits.week1Rule, "base");
  assert.equal(plain.settings.runsPerWeek, null);
});

test("week 1 from the history: many plans pass every safety check and the independent verdicts", () => {
  const sets = { 2: [3, 0], 3: [2, 4, 6], 4: [2, 3, 5, 0], 5: [1, 2, 4, 5, 0], 6: [1, 2, 3, 4, 5, 0] };
  let n = 0;
  for (const goal of ["5k", "10k", "half", "marathon", "keepfit", "build10k"]) for (const [cnt, runDays] of Object.entries(sets)) for (const cur of [6, 12, 20, 35, 60]) for (const rpw of [1, 2, 3, 5]) {
    n++;
    const usual = [4, 9, 14, 25][n % 4];
    const opts = { goal, today: TODAY, runDays, longRunDay: runDays.includes(0) ? 0 : runDays.at(-1), experience: ["new", "some", "experienced"][n % 3], score: [30, 40, 52][n % 3], currentWeeklyKm: cur, runsPerWeek: rpw, usualLongRunKm: usual, longestRecentKm: usual * [1, 1.3][n % 2], peakWeekKm: n % 3 ? cur * 1.3 : undefined, gymDays: n % 4 === 0 ? [{ day: 3, type: "legs", intensity: "heavy" }] : [] };
    if (goal !== "keepfit" && goal !== "build10k") opts.raceDate = E.addDays("2026-11-30", 7 * (n % 2 ? 13 : 20) + 6);
    const plan = E.buildPlan(opts);
    const v = verdicts(plan);
    for (const [id, key] of Object.entries(CHECK_MAP)) {
      const check = plan.safety.find((c) => c.id === id);
      if (!check) continue;
      assert.equal(check.ok, v[key].length === 0, `${goal} ${cnt}d cur ${cur} rpw ${rpw}: check ${id} ${JSON.stringify(check.failures)} vs ${JSON.stringify(v[key])}`);
    }
    assert.ok(allOk(plan), `${goal} ${cnt}d cur ${cur} rpw ${rpw}: ${JSON.stringify(plan.safety.filter((c) => !c.ok).map((c) => c.failures))}`);
    assert.ok(verdictsOk(plan), `${goal} ${cnt}d cur ${cur} rpw ${rpw}: ${JSON.stringify(Object.entries(v).filter(([, f]) => f.length))}`);
    assert.ok(weekKm(plan.weeks[0]) <= Math.max(cur * 1.25, 9) + 0.1, "week 1 is never more than current + 25% (or the starter floor)");
  }
  assert.ok(n >= 500);
});

/* ---------- the user report ---------- */

test("regression: 28:00 5K, about 20 km a week in 2 runs, usual long run 9 km, half marathon on 3 days", () => {
  const plan = half3({ currentWeeklyKm: 20, runsPerWeek: 2, usualLongRunKm: 9, longestRecentKm: 10, peakWeekKm: 23 });
  const runs = week1Runs(plan);
  const long = runs.find((d) => LONG.has(d.type));
  assert.ok(long && long.dow === 6, "the long run is on Saturday");
  assert.ok(long.km >= 8.5, `week 1 long run ${long.km} km`);
  assert.ok(weekKm(plan.weeks[0]) >= 20, `week 1 total ${weekKm(plan.weeks[0])} km`);
  assert.ok(runs.every((d) => d.km <= long.km));
  assert.ok(allOk(plan), JSON.stringify(plan.safety.filter((c) => !c.ok)));
  assert.ok(verdictsOk(plan));
  // Without a peak week value, the same result.
  const p2 = half3({ currentWeeklyKm: 20, runsPerWeek: 2, usualLongRunKm: 9 });
  assert.ok(weekKm(p2.weeks[0]) >= 20 && week1Runs(p2).find((d) => LONG.has(d.type)).km >= 8.5 && allOk(p2) && verdictsOk(p2));
  // The reported week (2.6 + 2.6 + 3.6 km) is the starter floor: it comes only from a weekly distance near zero.
  const old = half3({ currentWeeklyKm: 0 });
  assert.ok(weekKm(old.weeks[0]) <= 9.1);
  assert.equal(old.limits.week1Rule, "floor");
});

/* ---------- from a Strava import to the plan ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const stravaDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `"${MONTHS[m - 1]} ${d}, ${y}, 7:05:00 AM"`;
};

function stravaCsv() {
  const head = "Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Filename,Elapsed Time,Moving Time,Distance,Average Heart Rate";
  const rows = [head];
  let id = 1000;
  const row = (iso, name, type, km, sec) => rows.push(`${id++},${stravaDate(iso)},${name},${type},${sec + 30},"${km.toFixed(2)}",,,${sec + 30},${sec},"${(km * 1000).toFixed(1)}",`);
  for (let w = 0; w < 12; w++) {
    row(E.addDays(TODAY, -(w * 7 + 1)), "Morning Run", "Run", 10, 10 * 445); // 7:25 per km
    row(E.addDays(TODAY, -(w * 7 + 4)), "Weekend Run", "Run", 10, 10 * 440);
    row(E.addDays(TODAY, -(w * 7 + 3)), "Evening Ride", "Ride", 30, 3600);
  }
  row(E.addDays(TODAY, -16), "Parkrun", "Run", 5, 28 * 60);
  return rows.join("\n");
}

async function freshStore() {
  await store.setKey(store.KEYS.activityHistory, []);
  await store.setKey(store.KEYS.workoutHistory, []);
  await store.setKey(store.KEYS.importLog, []);
}

test("end to end: a Strava activities.csv import gives the right seed and a fair first week", async () => {
  await freshStore();
  const res = await importFiles([{ name: "activities.csv", bytes: new TextEncoder().encode(stravaCsv()) }]);
  assert.equal(res.added, 37);
  const list = await store.listActivities();
  const runs = list.filter((a) => a.type === "run");
  assert.equal(runs.length, 25);
  // The store gives km (not metres), minutes (not seconds) and local "YYYY-MM-DD" dates.
  const one = runs.find((a) => a.date === E.addDays(TODAY, -1));
  assert.equal(one.km, 10);
  assert.ok(Math.abs(one.minutes - (10 * 445) / 60) < 0.02);
  assert.match(one.date, /^\d{4}-\d{2}-\d{2}$/);

  const acts = ps.engineActivities(list);
  const seed = E.seedFromHistory(acts, TODAY);
  assert.deepEqual(await ps.seedHistory(TODAY), seed, "seedHistory reads the same store data");
  assert.ok(Math.abs(seed.score - SCORE_28) < 0.01, "the score comes from the 28:00 5K");
  assert.equal(seed.currentWeeklyKm, 21.3, "4 weeks of 2 x 10 km and the 5K; rides do not count; km are not metres");
  assert.equal(seed.runsPerWeek, 2);
  assert.equal(seed.usualLongRunKm, 10);
  assert.equal(seed.longestRecentKm, 10);
  assert.ok(seed.peak12WeeksKm >= 25);

  const master = { runDays: [2, 4, 6], longRunDay: 6, gymDays: [] };
  const profile = { level: "some", goal: "half", experience: "some", units: "km", fitnessSource: "history", useHistory: true, score: seed.score, onboarded: true };
  const { plan, opts } = await ps.previewPlan(profile, master, [], { today: TODAY });
  assert.equal(opts.currentWeeklyKm, 21.3);
  assert.equal(opts.runsPerWeek, 2);
  assert.equal(opts.usualLongRunKm, 10);
  const long = week1Runs(plan).find((d) => LONG.has(d.type));
  assert.ok(long.km >= 8.5, `long run ${long.km} km`);
  assert.ok(weekKm(plan.weeks[0]) >= 20, `week 1 ${weekKm(plan.weeks[0])} km`);
  assert.ok(allOk(plan) && verdictsOk(plan));
  await freshStore();
});

test("root cause: an old profile value of 0 (saved before the import) no longer hides the history", async () => {
  await freshStore();
  await importFiles([{ name: "activities.csv", bytes: new TextEncoder().encode(stravaCsv()) }]);
  const seed = await ps.seedHistory(TODAY);
  const master = { runDays: [2, 4, 6], longRunDay: 6, gymDays: [] };
  // An older version saved the seed value (0 before the import) in the profile with no flag.
  const legacy = { level: "some", goal: "half", experience: "some", fitnessSource: "history", useHistory: true, currentWeeklyKm: 0, score: seed.score };
  const o = ps.planOptions(legacy, master, [], { today: TODAY, seed });
  assert.equal(o.currentWeeklyKm, 21.3, "the fresh history wins over an old copy");
  const { plan } = await ps.previewPlan(legacy, master, [], { today: TODAY });
  assert.ok(weekKm(plan.weeks[0]) >= 20);
  // A value that the user typed still wins, even when it is low.
  const typed = ps.planOptions({ ...legacy, currentWeeklyKm: 12, weeklyKmTyped: true, usualLongRunKm: 7, usualLongRunTyped: true }, master, [], { today: TODAY, seed });
  assert.equal(typed.currentWeeklyKm, 12);
  assert.equal(typed.usualLongRunKm, 7);
  assert.equal(typed.longestRecentKm, undefined, "a typed long run is not capped by the history");
  assert.equal(typed.peakWeekKm, undefined);
  // An older profile that does not use the history keeps its value.
  assert.equal(ps.planOptions({ level: "some", goal: "10k", fitnessSource: "result", currentWeeklyKm: 18 }, master, [], { today: TODAY, seed }).currentWeeklyKm, 18);
  // "I am new" stays at 0.
  assert.equal(ps.planOptions({ level: "some", goal: "5k", fitnessSource: "new", currentWeeklyKm: 0 }, master, [], { today: TODAY, seed }).currentWeeklyKm, 0);
  await freshStore();
});

test("a plan made again after a long break does not use the old habits", () => {
  const plan = half3({ today: TODAY, raceDate: "2027-04-18", currentWeeklyKm: 20, runsPerWeek: 2, usualLongRunKm: 9, longestRecentKm: 10 });
  const r = E.adapt(plan, { type: "break", answers: { days: 40, cause: "other" } }, { today: "2026-12-30" });
  assert.ok(r.plan && r.plan !== plan);
  assert.equal(r.plan.settings.usualLongRunKm, null);
  assert.equal(r.plan.settings.runsPerWeek, null);
  assert.ok(allOk(r.plan));
});
