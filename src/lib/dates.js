/* ---------------------------------------------------------------
   DATE / TIME HELPERS FOR BACK-DATED WORKOUTS
--------------------------------------------------------------- */

export function dateStrOf(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function friendlyDateTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
// Keep an exercise's history entries in chronological order after a back-dated
// insert, so "last time" always means the most recent calendar session.
export function sortByAt(entries) {
  return [...entries].sort((a, b) => {
    const ka = a.at || a.date || "";
    const kb = b.at || b.date || "";
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
export function clampToNow(d) {
  const now = new Date();
  return d > now ? now : d;
}

export function todayStr() {
  // Local date, matching dateStrOf (used for workout dates). Using UTC here
  // could tag an evening entry with tomorrow's date and mismatch its workout.
  return dateStrOf(new Date());
}

// "HH:MM" now, in local time, for a form that defaults to the moment.
export function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* A date box and a time box back into the timestamp the readiness map
   reads. Built through the local Date constructor rather than by pasting
   the two strings together with a "T": that would be parsed as UTC and
   shift a morning run by the whole timezone offset, which is exactly the
   sort of error that makes recovery hours quietly wrong. */
export function atFromDateTime(dateStr, timeStr) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  const [hh, mm] = String(timeStr || "").split(":").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const dt = new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 12, Number.isFinite(mm) ? mm : 0, 0, 0);
  return dt.toISOString();
}

export const HOUR_MS = 1000 * 60 * 60;

// new Date("YYYY-MM-DD") parses as UTC midnight, which shifts a reading by the
// whole timezone offset, so build a local date instead. Rows carrying only a
// date have no time of day at all: noon is the midpoint, keeping the error
// under 12 hours either way rather than adding the full day that assuming
// midnight would.
export function dateOnlyTime(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0).getTime();
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) ? t : null;
}

// Sessions record `at`, a full ISO timestamp. Only much older rows lack it.
export function sessionTime(session) {
  if (!session) return null;
  if (session.at) {
    const t = new Date(session.at).getTime();
    if (Number.isFinite(t)) return t;
  }
  return dateOnlyTime(session.date);
}

export function hoursSince(at) {
  if (!at) return null;
  return Math.max(0, (Date.now() - at) / HOUR_MS);
}

export const MONTH_ABBREV = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
