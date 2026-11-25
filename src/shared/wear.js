import * as engine from "../run/engine.js";
import { isNativeRuntime } from "../lib/platform.js";
import { todayStr } from "../lib/dates.js";
import { KEYS, getKey, getRunProfile, isDuplicate, listActivities, saveRun } from "./store.js";
import { currentPlan, markDone, onPlanSaved } from "../plan/planState.js";
import { RUN_PREF_DEFAULTS, getRunPrefs, jargonOn, unitsOf } from "../runui/runData.js";

/* ---------------------------------------------------------------
   WEAR OS LINK

   Sends the plan to the Skid Marks watch app and takes the runs that
   the watch recorded. It uses the local Capacitor plugin in
   native/wear-bridge (the Wear OS Data Layer). Only the Android app
   has the plugin. In a browser every function does nothing and never
   throws.

   Plan (DataItem "/skidmarks/plan", JSON):
     { v, updatedAt, today, units, simple, autoPause, voice, goalName,
       days: [{ id, iso, type, intensity, title, km, min, steps,
                effortText, showPace, custom, done, warmup }] }
     `days` holds the run days of the next 7 days. `warmup` is the
     engine.warmupFor() result (moves have names and doses only).

   Run (from the watch): the run JSON that the watch saved
     { id, type, startedAt, durationSec, km, rpe, avgHR, maxHR, splits,
       splitUnit, laps, hrSeries, track, workoutId, workoutType,
       workoutTitle, planIso, warmupMin, source: "watch", ... }
   The phone saves it with store.saveRun (no duplicates), marks the
   plan day as done and then sends the receipt (ackRun) to the watch.
--------------------------------------------------------------- */

export const WATCH_DAYS = 7;
export const WATCH_PLAN_VERSION = 1;
export const WEAR_GUIDE_URL = "https://github.com/JoeBrowse/runningcoach/blob/main/docs/wear-os.md";

const numOrNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

/* ---------- plan JSON (pure) ---------- */

/* The warm-up in the small shape that the watch reads. */
export function warmupForWatch(w) {
  if (!w) return null;
  return {
    kind: w.kind,
    minutes: numOrNull(w.minutes) || 0,
    inSteps: !!w.inSteps,
    notes: Array.isArray(w.notes) ? w.notes.slice() : [],
    phases: (w.phases || []).map((p) => ({
      id: p.id,
      title: p.title,
      min: numOrNull(p.min) || 0,
      items: (p.items || []).map((m) => ({ name: m.name, dose: m.dose || null })),
    })),
  };
}

/* The warm-up context, the same values as RunHome.warmupContext. */
export function watchWarmupContext(plan, profile, tempC) {
  return { experience: (plan && plan.settings && plan.settings.experience) || (profile && profile.experience) || "some", tempC, goal: plan ? plan.goal : undefined };
}

/* One plan day for the watch. */
export function dayForWatch(day, warmCtx = {}) {
  const d = day || {};
  return {
    id: d.id || `${d.iso}-${d.type}`,
    iso: d.iso,
    type: d.type,
    intensity: d.intensity || null,
    title: d.title || "Run",
    km: numOrNull(d.km),
    min: numOrNull(d.min),
    steps: plain(d.steps || []),
    effortText: d.effortText || "",
    showPace: d.showPace !== false,
    custom: !!d.custom,
    done: !!d.done,
    warmup: warmupForWatch(engine.warmupFor(d, warmCtx)),
  };
}

/* The plan JSON for the watch.
   opts: { plan, today, units, simple, voice, autoPause, profile, tempC, now }
   tempC (today's temperature) changes only today's warm-up. */
export function buildWatchPlan(opts = {}) {
  const { plan = null, units = "km", simple = true, voice = {}, autoPause = true, profile = null, tempC = null } = opts;
  const today = opts.today ? engine.toISO(opts.today) : todayStr();
  const now = opts.now ? new Date(opts.now) : new Date();
  const last = engine.addDays(today, WATCH_DAYS - 1);
  const days = plan ? engine.allDays(plan).filter((d) => d && d.iso >= today && d.iso <= last && engine.isRun(d)) : [];
  return {
    v: WATCH_PLAN_VERSION,
    updatedAt: now.toISOString(),
    today,
    units: units === "mi" ? "mi" : "km",
    simple: !!simple,
    autoPause: !!autoPause,
    voice: { ...RUN_PREF_DEFAULTS.voice, ...(voice || {}) },
    goalName: (plan && plan.goalName) || null,
    days: days.map((d) => dayForWatch(d, watchWarmupContext(plan, profile, d.iso === today ? tempC : null))),
  };
}

/* ---------- runs from the watch (pure with deps) ---------- */

/* The run record for store.saveRun. */
export function watchRunToStore(run) {
  const r = { ...run };
  delete r.minutes;
  delete r.seconds;
  return { ...r, type: r.type || "run", source: "watch", origin: r.origin || "watch" };
}

/* Saves runs from the watch.
   runs: run objects (or JSON strings).
   deps: { listActivities, saveRun, isDuplicate, markDone, ackRun }
   A run that is already saved (same id, or the same start and distance)
   is not saved again, but it gets a receipt, so the watch stops sending it.
   Returns { saved: [ids], duplicates: [ids], failed: [ids] }. */
export async function importWatchRuns(runs, deps) {
  const out = { saved: [], duplicates: [], failed: [] };
  const list = Array.isArray(runs) ? runs : [];
  if (!list.length) return out;
  const known = [...((await deps.listActivities()) || [])];
  for (const item of list) {
    let run = item;
    if (typeof item === "string") {
      try {
        run = JSON.parse(item);
      } catch (e) {
        run = null;
      }
    }
    if (!run || typeof run !== "object" || !run.id) continue;
    try {
      const dupe = known.some((k) => k && k.id === run.id) || deps.isDuplicate(run, known);
      if (dupe) {
        out.duplicates.push(run.id);
      } else {
        const record = await deps.saveRun(watchRunToStore(run));
        known.push({ ...record, km: numOrNull(run.km) });
        if (run.planIso && deps.markDone) {
          try {
            await deps.markDone(run.planIso, record.id);
          } catch (e) {
            /* the run is saved; the plan mark is not important enough to fail */
          }
        }
        out.saved.push(record.id);
      }
      await deps.ackRun({ id: run.id });
    } catch (e) {
      out.failed.push(run.id);
    }
  }
  return out;
}

/* ---------- plugin ---------- */

let pluginPromise = null;
let testPlugin;

/* Tests only: give a mock plugin (null for "no plugin"). */
export function setWearPluginForTest(p) {
  testPlugin = p;
  pluginPromise = null;
}

/* The WearBridge plugin, or null (browser, or an APK without it). */
export async function getWearPlugin() {
  if (testPlugin !== undefined) return testPlugin;
  if (!isNativeRuntime()) return null;
  if (!pluginPromise) {
    pluginPromise = (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isPluginAvailable("WearBridge")) return null;
        const mod = await import("skid-marks-wear-bridge");
        return mod.WearBridge || null;
      } catch (e) {
        return null;
      }
    })();
  }
  return pluginPromise;
}

/* ---------- live functions ---------- */

async function todayTempC() {
  try {
    const { getCachedWeather, getWeatherSettings } = await import("./weather.js");
    const cfg = await getWeatherSettings();
    if (!cfg.enabled) return null;
    const w = await getCachedWeather();
    const t = w && w.current ? w.current.tempC : null;
    return Number.isFinite(t) ? t : null;
  } catch (e) {
    return null;
  }
}

/* The plan JSON from the stored plan and settings. */
export async function currentWatchPlan(today) {
  const t = today ? engine.toISO(today) : todayStr();
  const [plan, profile, prefs, settings, acts, tempC] = await Promise.all([
    currentPlan(),
    getRunProfile(),
    getRunPrefs(),
    getKey(KEYS.settings, {}),
    listActivities().catch(() => []),
    todayTempC(),
  ]);
  const p = profile || {};
  return buildWatchPlan({
    plan,
    today: t,
    units: unitsOf(p),
    simple: !jargonOn(settings || {}, plan, acts, t),
    voice: prefs.voice,
    autoPause: prefs.autoPause !== false,
    profile: p,
    tempC,
  });
}

/* Sends the plan to the watch. Returns { sent, days } or { sent: false, reason }.
   onlyWithWatch: send only when a paired watch has the Skid Marks app
   (the automatic sends use it, so a phone with no watch sends nothing). */
export async function pushPlanToWatch({ today, onlyWithWatch = false } = {}) {
  try {
    const plugin = await getWearPlugin();
    if (!plugin) return { sent: false, reason: "unavailable" };
    if (onlyWithWatch) {
      const s = (await plugin.status({ all: true })) || {};
      if (!Array.isArray(s.nodes) || !s.nodes.length) return { sent: false, reason: "no-watch" };
    }
    const payload = await currentWatchPlan(today);
    await plugin.sendPlan({ json: JSON.stringify(payload) });
    return { sent: true, days: payload.days.length };
  } catch (e) {
    return { sent: false, reason: String((e && e.message) || e) };
  }
}

const liveDeps = { listActivities: () => listActivities(), saveRun, isDuplicate, markDone, ackRun: null };

let pulling = null;

/* Takes the runs that came from the watch and saves them. */
export async function pullWatchRuns() {
  if (pulling) return pulling;
  pulling = (async () => {
    try {
      const plugin = await getWearPlugin();
      if (!plugin) return { saved: [], duplicates: [], failed: [] };
      const res = await plugin.getPendingRuns();
      const runs = (res && res.runs) || [];
      const out = await importWatchRuns(runs, { ...liveDeps, ackRun: (x) => plugin.ackRun(x) });
      if (out.saved.length && typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("skidmarks:watch-runs", { detail: out }));
        } catch (e) {
          /* old WebView */
        }
      }
      return out;
    } catch (e) {
      return { saved: [], duplicates: [], failed: [], error: String((e && e.message) || e) };
    } finally {
      pulling = null;
    }
  })();
  return pulling;
}

/* Watch connection: { available, connected, nodes: [{id, name}] }. */
export async function watchStatus() {
  try {
    const plugin = await getWearPlugin();
    if (!plugin) return { available: false, connected: false, nodes: [] };
    const s = (await plugin.status()) || {};
    return { available: true, connected: !!s.connected, nodes: Array.isArray(s.nodes) ? s.nodes : [], error: s.error || null };
  } catch (e) {
    return { available: true, connected: false, nodes: [], error: String((e && e.message) || e) };
  }
}

let started = false;

/* Starts the watch link (once): sends the plan now and after each plan
   save (only when a paired watch has the Skid Marks app), and takes runs
   now, when the app comes back to the front and when the watch sends a
   run. Never throws. */
export function startWatchSync() {
  if (started || !isNativeRuntime()) return;
  started = true;
  (async () => {
    const plugin = await getWearPlugin();
    if (!plugin) return;
    let timer = null;
    onPlanSaved(() => {
      clearTimeout(timer);
      timer = setTimeout(() => pushPlanToWatch({ onlyWithWatch: true }), 500);
    });
    try {
      await plugin.addListener("runReceived", () => pullWatchRuns());
    } catch (e) {
      /* the app still takes runs on start and on resume */
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") pullWatchRuns();
      });
    }
    await pullWatchRuns();
    await pushPlanToWatch({ onlyWithWatch: true });
  })().catch(() => {});
}
