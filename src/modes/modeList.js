/* The three modes, in switch order. Data only (no components), so any
   file can import it without an import cycle. The home components are
   joined to these in src/modes/index.js. */
export const MODE_LIST = [
  { id: "plan", label: "Plan", desc: "Your week: run days and gym days together." },
  { id: "run", label: "Run", desc: "The running coach: today's run, record, plan and progress." },
  { id: "lift", label: "Lift", desc: "The gym tracker: workouts, programmes and muscle readiness." },
];

export const MODE_IDS = MODE_LIST.map((m) => m.id);
export const DEFAULT_MODE = "lift";

export function normaliseMode(value) {
  return MODE_IDS.includes(value) ? value : DEFAULT_MODE;
}
