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


/* New runners choose "minutes a session" (20, 30 or 45). The engine has
   no cap for the session length, so the Today card shows the choice as
   the target. Returns null when no note is needed. */
export function targetMinutesNote(run, profile) {
  const target = profile && profile.level === "new" ? Number(profile.minutesPerSession) : 0;
  if (!run || !target || run.type !== "runwalk") return null;
  if (!run.min || run.min <= target + 2) return `Your target: about ${target} min.`;
  return `Your target: about ${target} min. The full session is about ${run.min} min. You can stop after ${target} min. Do the full session when it feels easy.`;
}
