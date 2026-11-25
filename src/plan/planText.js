import * as engine from "../run/engine.js";

/* Plain text helpers for Plan mode (no JSX, so Node tests can use them). */

/* "Easy run 6 km" style one-line label for a plan day. */
export function dayLine(d, units = "km") {
  if (!d) return "";
  if (d.type === "rest") return d.note ? `Rest (${d.note.replace(/^Missed: |^Dropped: /, (m) => m.toLowerCase())})` : "Rest";
  if (d.type === "strength" || d.type === "cross") return d.title;
  const amount = d.km ? engine.fmtKm(d.km, units) : d.min ? `${d.min} min` : "";
  return amount && !/^Run/.test(d.title) ? `${d.title} · ${amount}` : d.title + (d.min && /^Run/.test(d.title) ? ` · ${d.min} min` : "");
}

