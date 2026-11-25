import { isNativeRuntime } from "../lib/platform.js";
import { dateStrOf } from "../lib/dates.js";
import { addActivities, getKey, getRunSettings, setKey, setRunSettings } from "./store.js";
import { mapSport, round } from "./import/common.js";

/* ---------------------------------------------------------------
   INTERVALS.ICU LINK

   The user gives their own API key (intervals.icu > Settings >
   Developer settings) and an athlete id ("0" means "the owner of the
   key"). The app calls the API only when the user taps "Sync now".

   - Activities since a date go into the store (origin "intervals").
     Duplicates are skipped.
   - Activities that came to Intervals.icu from Strava are skipped. The
     Strava API rules do not let other apps get that data. The API gives
     no data for them in any case.
   - Wellness (resting heart rate, HRV, sleep) goes into the "wellness"
     key: [{ date, restingHR, hrv, sleepSecs }], newest last.

   The key is kept in run-settings.intervals. The app never logs it and
   never shows it in full.

   In a browser, Intervals.icu can refuse the call (CORS). The Android
   app uses a native HTTP client, so the call works there.
--------------------------------------------------------------- */

export const INTERVALS_BASE = "https://intervals.icu/api/v1";
export const WELLNESS_KEY = "wellness";
const FIRST_SYNC_DAYS = 365;
const OVERLAP_DAYS = 3;
const WELLNESS_CAP = 800;

export const INTERVALS_ERRORS = {
  noKey: "Type your API key first.",
  badKey: "Intervals.icu did not accept the API key or the athlete ID. Make sure that they are correct.",
  noNetwork: "The app cannot connect to Intervals.icu. Make sure that the phone has a network connection.",
  browser: "The browser blocked this link. Use the Android app for this link.",
  server: "Intervals.icu sent an error. Try again later.",
  notFound: "Intervals.icu cannot find this athlete. Use athlete ID 0 for your own data.",
};

export class IntervalsError extends Error {
  constructor(code) {
    super(INTERVALS_ERRORS[code] || INTERVALS_ERRORS.server);
    this.code = code;
  }
}

export async function getIntervalsSettings() {
  const rs = (await getRunSettings()) || {};
  return { apiKey: "", athleteId: "0", lastSync: null, lastResult: null, ...(rs.intervals || {}) };
}

// Merges a change into run-settings.intervals. Reads the newest value
// first, so a change from another screen is not lost.
export async function saveIntervalsSettings(patch) {
  const rs = (await getRunSettings()) || {};
  const next = { ...(rs.intervals || {}), ...patch };
  if (typeof next.apiKey === "string") next.apiKey = next.apiKey.trim();
  if (typeof next.athleteId === "string") next.athleteId = next.athleteId.trim() || "0";
  await setRunSettings({ ...rs, intervals: next });
  return next;
}

export function maskKey(key) {
  const k = String(key || "");
  if (!k) return "";
  return k.length <= 4 ? "••••" : `••••${k.slice(-4)}`;
}

function base64(text) {
  if (typeof btoa === "function") {
    let s = "";
    for (const b of new TextEncoder().encode(text)) s += String.fromCharCode(b);
    return btoa(s);
  }
  return Buffer.from(text, "utf8").toString("base64");
}

export function authHeader(apiKey) {
  return `Basic ${base64(`API_KEY:${apiKey}`)}`;
}

async function getJson(path, apiKey, fetchImpl) {
  const f = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!f) throw new IntervalsError("noNetwork");
  let res;
  try {
    res = await f(`${INTERVALS_BASE}${path}`, { headers: { Authorization: authHeader(apiKey), Accept: "application/json" } });
  } catch (e) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (!offline && !isNativeRuntime() && typeof window !== "undefined") throw new IntervalsError("browser");
    throw new IntervalsError("noNetwork");
  }
  if (res.status === 401 || res.status === 403) throw new IntervalsError("badKey");
  if (res.status === 404) throw new IntervalsError("notFound");
  if (!res.ok) throw new IntervalsError("server");
  try {
    return await res.json();
  } catch (e) {
    throw new IntervalsError("server");
  }
}

const isoDay = (d) => dateStrOf(d);

// One Intervals.icu activity to a store input, or { skip: reason }.
export function mapIntervalsActivity(a) {
  if (!a || typeof a !== "object") return { skip: "The activity has no data." };
  if (String(a.source || "").toUpperCase() === "STRAVA") {
    return { skip: "This activity came from Strava. The Strava rules do not let the app get it through Intervals.icu." };
  }
  const startIso = a.start_date || (a.start_date_local ? new Date(a.start_date_local).toISOString() : null);
  const startMs = startIso ? new Date(startIso).getTime() : NaN;
  if (!Number.isFinite(startMs)) return { skip: "The activity has no start time." };
  const sec = Number(a.moving_time) || Number(a.elapsed_time) || 0;
  if (!(sec > 0)) return { skip: "The activity has no duration." };
  const metres = Number(a.distance);
  const hr = (v) => (Number(v) > 20 && Number(v) < 260 ? Math.round(Number(v)) : null);
  const type = mapSport(a.type);
  const out = {
    id: `icu-${a.id || startMs}`,
    type,
    startedAt: new Date(startMs).toISOString(),
    durationSec: Math.round(sec),
    km: Number.isFinite(metres) && metres > 0 ? round(metres / 1000, 3) : null,
    avgHR: hr(a.average_heartrate),
    maxHR: hr(a.max_heartrate),
    name: a.name ? String(a.name) : null,
    source: "import",
    origin: "intervals",
    externalId: a.id ? `intervals:${a.id}` : null,
    sport: a.type ? String(a.type) : null,
  };
  if (Number(a.elapsed_time) && Number(a.elapsed_time) !== out.durationSec) out.elapsedSec = Math.round(Number(a.elapsed_time));
  if (/^(weight ?training|workout)$/i.test(String(a.type || ""))) out.strength = true;
  if (Number(a.icu_rpe) > 0) out.rpe = Number(a.icu_rpe);
  return out;
}

export function mapWellness(w) {
  if (!w || !w.id) return null;
  const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
  const row = { date: String(w.id).slice(0, 10), restingHR: n(w.restingHR), hrv: n(w.hrv) || n(w.hrvSDNN), sleepSecs: n(w.sleepSecs) };
  return row.restingHR || row.hrv || row.sleepSecs ? row : null;
}

export async function getWellness() {
  return (await getKey(WELLNESS_KEY, [])) || [];
}

async function mergeWellness(rows) {
  const byDate = new Map((await getWellness()).map((r) => [r.date, r]));
  for (const r of rows) byDate.set(r.date, { ...(byDate.get(r.date) || {}), ...r });
  const next = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-WELLNESS_CAP);
  await setKey(WELLNESS_KEY, next);
  return next;
}

/* Sync now. Returns { added, duplicates, skipped: [{ file, reason }],
   wellnessDays, oldest, newest }. Throws IntervalsError with a plain
   message. options: { fetch, now } (for tests). */
export async function syncIntervals(options = {}) {
  const cfg = await getIntervalsSettings();
  if (!cfg.apiKey) throw new IntervalsError("noKey");
  const athlete = encodeURIComponent(cfg.athleteId || "0");
  const now = options.now ? new Date(options.now) : new Date();
  let oldest;
  if (cfg.lastSync) {
    oldest = new Date(cfg.lastSync);
    oldest.setDate(oldest.getDate() - OVERLAP_DAYS);
  } else {
    oldest = new Date(now);
    oldest.setDate(oldest.getDate() - FIRST_SYNC_DAYS);
  }
  const q = `oldest=${isoDay(oldest)}&newest=${isoDay(now)}`;

  const acts = await getJson(`/athlete/${athlete}/activities?${q}`, cfg.apiKey, options.fetch);
  const list = Array.isArray(acts) ? acts : [];
  const skipped = [];
  const fresh = [];
  for (const a of list) {
    const m = mapIntervalsActivity(a);
    if (m.skip) skipped.push({ file: (a && (a.name || a.id)) || "activity", reason: m.skip });
    else fresh.push(m);
  }
  const res = fresh.length ? await addActivities(fresh, { source: "intervals" }) : { added: 0, duplicates: 0 };

  let wellnessDays = 0;
  try {
    const well = await getJson(`/athlete/${athlete}/wellness?${q}`, cfg.apiKey, options.fetch);
    const rows = (Array.isArray(well) ? well : []).map(mapWellness).filter(Boolean);
    if (rows.length) await mergeWellness(rows);
    wellnessDays = rows.length;
  } catch (e) {
    // Wellness is extra. The activities are already saved.
    skipped.push({ file: "wellness", reason: e.message || INTERVALS_ERRORS.server });
  }

  const result = { added: res.added, duplicates: res.duplicates, skipped, wellnessDays, oldest: isoDay(oldest), newest: isoDay(now) };
  await saveIntervalsSettings({
    lastSync: now.toISOString(),
    lastResult: { added: result.added, duplicates: result.duplicates, skipped: skipped.length, wellnessDays },
  });
  return result;
}
