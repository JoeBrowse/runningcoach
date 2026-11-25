import { capHistory } from "../lib/settings.js";

/* ---------------------------------------------------------------
   TOUR SAMPLE DATA

   On a fresh install the tour walks onto Progress Charts, Consistency,
   History and 1RM Goals and finds them all empty, so the steps explaining
   them have nothing to point at. This fills those screens with a worked
   example for the duration of the tour only.

   It works by answering reads, never writes. safeGet() below returns this
   sample for the handful of history keys while the tour is running;
   safeSet() is untouched, so nothing is ever persisted and the moment the
   tour ends the screens go back to the user's real (empty) data.
--------------------------------------------------------------- */

export let TOUR_DEMO_ACTIVE = false;
export function setTourDemoData(on) {
  TOUR_DEMO_ACTIVE = !!on;
}

export const TOUR_DEMO_LIFTS = [
  { id: "bench-press", name: "Bench Press", muscle: "Chest", from: 60, step: 2.5 },
  { id: "squat", name: "Squat", muscle: "Quads", from: 80, step: 5 },
  { id: "bent-over-row", name: "Bent-Over Row", muscle: "Back", from: 50, step: 2.5 },
];

// Six months of training at three sessions a week. The volume matters: a
// handful of sessions left the consistency calendar looking almost empty on
// the very step that exists to show it off, and the history list too short
// to look like a real log.
export const TOUR_DEMO = (() => {
  const pad = (n) => String(n).padStart(2, "0");
  const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const sessions = [];
  const exHistory = {};
  const WEEKS = 26;
  const DAYS_IN_WEEK = [0, 2, 4]; // Mon/Wed/Fri, the shape of a real routine
  for (let w = WEEKS - 1; w >= 0; w--) {
    // A fortnight off partway through, so the calendar shows a real pattern
    // rather than a machine-perfect grid.
    if (w === 11 || w === 12) continue;
    for (const offset of DAYS_IN_WEEK) {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      d.setDate(d.getDate() - (w * 7 + (6 - offset)));
      if (d > new Date()) continue;
      const date = dayStr(d);
      const at = d.toISOString();
      // Load climbs over the block with a lighter week every seventh.
      const progress = (WEEKS - 1 - w) / 2;
      const step = (w % 7 === 0 ? progress - 2 : progress);
      const exercises = TOUR_DEMO_LIFTS.map((lift, idx) => {
        const weight = String(Math.max(lift.from, Math.round((lift.from + lift.step * step) / lift.step) * lift.step));
        const sets = [
          { weight, reps: "8" },
          { weight, reps: "8" },
          { weight, reps: "7" },
        ];
        (exHistory[lift.id] = exHistory[lift.id] || []).push({ date, at, sets, order: idx + 1, total: TOUR_DEMO_LIFTS.length });
        return { id: lift.id, name: lift.name, muscle: lift.muscle, sets };
      });
      sessions.push({ id: `tour-${date}`, date, at, split: "Full Body", exercises });
    }
  }
  sessions.sort((a, b) => (a.at < b.at ? -1 : 1));
  // Per-exercise history is capped elsewhere in the app, so match it.
  Object.keys(exHistory).forEach((k) => { exHistory[k] = capHistory(exHistory[k]); });
  const bodyweight = [];
  for (let w = 26; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - w * 7);
    bodyweight.push({ value: Math.round((78 - w * 0.12) * 10) / 10, unit: "kg", date: dayStr(d) });
  }
  const pbs = {};
  TOUR_DEMO_LIFTS.forEach((lift) => {
    const last = exHistory[lift.id][exHistory[lift.id].length - 1];
    pbs[lift.id] = { exerciseId: lift.id, name: lift.name, weight: last.sets[0].weight, reps: "8", date: last.date, bodyWeightPct: null };
  });
  // The 1RM screen lists six lifts, so the three that aren't in the sample
  // sessions still get a record — otherwise most of that screen reads
  // "no data yet" during the step explaining it. Pull-Ups and Dips are
  // tracked by reps, so theirs carry no weight.
  const lastDate = sessions[sessions.length - 1].date;
  const extraPBs = [
    ["overhead-press", "Overhead Press", "55", "6"],
    ["deadlift", "Deadlift", "140", "5"],
    ["pull-ups", "Pull-Ups", "", "12"],
    ["dips", "Dips", "", "15"],
  ];
  extraPBs.forEach(([id, name, weight, reps]) => {
    pbs[id] = { exerciseId: id, name, weight, reps, date: lastDate, bodyWeightPct: null };
  });
  const goalStart = new Date();
  goalStart.setDate(goalStart.getDate() - 28);
  const milestones = [];
  for (let wk = 1; wk <= 16; wk++) {
    const d = new Date(goalStart);
    d.setDate(d.getDate() + wk * 7);
    milestones.push({ week: wk, date: d.toISOString().slice(0, 10), value: Math.round((95 + (120 - 95) * (wk / 16)) / 2.5) * 2.5 });
  }
  return {
    sessions,
    exHistory,
    bodyweight,
    pbs,
    goals: {
      "barbell-bench-press": {
        exerciseId: "barbell-bench-press",
        current: 95,
        target: 120,
        level: "intermediate",
        weeks: 16,
        isBodyweight: false,
        createdAt: goalStart.toISOString(),
        milestones,
      },
    },
  };
})();

// Returns the sample value for a key the tour needs populated, or
// undefined to let the real read proceed.
export function tourDemoValue(key) {
  if (!TOUR_DEMO_ACTIVE) return undefined;
  if (key === "workout-history") return TOUR_DEMO.sessions;
  if (key === "bodyweight-history") return TOUR_DEMO.bodyweight;
  if (key === "bodyweight") return TOUR_DEMO.bodyweight[TOUR_DEMO.bodyweight.length - 1];
  if (key === "weight-tracking") return { enabled: true, goal: 82, unit: "kg" };
  if (key === "1rm-goals") return TOUR_DEMO.goals;
  if (key.startsWith("ex-history:")) return TOUR_DEMO.exHistory[key.slice(11)] || [];
  if (key.startsWith("pb:")) return TOUR_DEMO.pbs[key.slice(3)] || null;
  return undefined;
}
