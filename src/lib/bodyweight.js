import { safeGet, safeSet } from "./storage.js";

// Single place that records a bodyweight reading: updates the app-wide current
// weight and upserts today's entry into the dated history (one per day), sorted
// oldest-first. Returns the new history array so callers holding it in state can
// refresh. Both the Personal Info stats panel and the weight-tracking panel go
// through here, so their storage shape can't drift apart.
// Both panels sit on the same screen, so a weight typed into one has to show
// up in the other without a trip back to the home screen. They each hold their
// own state, so storage being shared is not enough — the write has to say so.
export const bodyweightListeners = new Set();
export function onBodyweightChange(fn) {
  bodyweightListeners.add(fn);
  return () => bodyweightListeners.delete(fn);
}

export async function upsertBodyweight(record) {
  const hist = (await safeGet("bodyweight-history")) || [];
  const next = [...hist.filter((h) => h.date !== record.date), record].sort((a, b) => (a.date < b.date ? -1 : 1));
  // A back-dated reading goes into the history. The current weight is
  // always the newest reading.
  await safeSet("bodyweight", next[next.length - 1] || record);
  await safeSet("bodyweight-history", next);
  bodyweightListeners.forEach((fn) => {
    try {
      fn(next[next.length - 1] || record, next);
    } catch (e) {
      /* one panel failing to refresh must not stop the others */
    }
  });
  return next;
}
