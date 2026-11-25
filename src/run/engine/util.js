/* Shared helpers: numbers, ISO dates and formatting.
   All plan dates are ISO strings ("2026-12-01"). Date arithmetic uses UTC,
   so time zones and daylight saving time cannot move a day. */

export const DAY_MS = 86400000;
export const KM_PER_MI = 1.609344;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (f(x) || 0), 0);

/** Seeded random number generator (Park-Miller). Returns a function that gives 0..1. */
export function rng(seed) {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Converts a Date (local calendar day) or an ISO string to "YYYY-MM-DD". */
export function toISO(x) {
  if (x == null) throw new TypeError('A date is necessary.');
  if (typeof x === 'string') {
    const m = ISO_RE.exec(x);
    if (!m) throw new TypeError(`Not an ISO date: ${x}`);
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) throw new TypeError('Not a valid date.');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function utc(iso) {
  const m = ISO_RE.exec(iso);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}
function fromUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Local Date object for an ISO day (for display code). */
export function parseISO(iso) {
  const m = ISO_RE.exec(toISO(iso));
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
export function addDays(iso, n) { return fromUtc(utc(toISO(iso)) + n * DAY_MS); }
export function daysBetween(a, b) { return Math.round((utc(toISO(b)) - utc(toISO(a))) / DAY_MS); }
/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(iso) { return new Date(utc(toISO(iso))).getUTCDay(); }
/** Monday of the week that holds the day. Weeks run Monday to Sunday. */
export function mondayOf(iso) { const s = toISO(iso); return addDays(s, -((weekdayOf(s) + 6) % 7)); }
/** Monday on or after the day. */
export function mondayOnOrAfter(iso) { const s = toISO(iso); const wd = weekdayOf(s); return wd === 1 ? s : addDays(s, (8 - wd) % 7); }

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDay(iso) { return DAY_NAMES[weekdayOf(iso)]; }
export function fmtDate(iso) {
  const s = toISO(iso); const m = ISO_RE.exec(s);
  return `${DAY_NAMES[weekdayOf(s)]} ${+m[3]} ${MONTHS[+m[2] - 1]}`;
}
/** "1:45:03" or "48:30". */
export function fmtTime(sec) {
  if (!Number.isFinite(sec)) return '-';
  const r = Math.round(sec); const h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60), s = r % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
/** Pace in whole seconds: "5:12 /km" or "8:22 /mi". */
export function fmtPace(secPerKm, units = 'km') {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '-';
  const r = Math.round(units === 'mi' ? secPerKm * KM_PER_MI : secPerKm);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')} ${units === 'mi' ? '/mi' : '/km'}`;
}
/** Distance: "12.4 km" or "7.7 mi". */
export function fmtKm(km, units = 'km') {
  if (!Number.isFinite(km)) return '-';
  return units === 'mi' ? `${round(km / KM_PER_MI, 1)} mi` : `${round(km, 1)} km`;
}
/** Speed for a treadmill display: "11.5 km/h" or "7.1 mph". */
export function fmtSpeed(secPerKm, units = 'km') {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '-';
  const kmh = 3600 / secPerKm;
  return units === 'mi' ? `${round(kmh / KM_PER_MI, 1)} mph` : `${round(kmh, 1)} km/h`;
}
export const kmToUnits = (km, units = 'km') => (units === 'mi' ? km / KM_PER_MI : km);
export const unitsToKm = (v, units = 'km') => (units === 'mi' ? v * KM_PER_MI : v);
