import { tourDemoValue } from "../data/tourDemo.js";
import { isNativeRuntime } from "./platform.js";

/* ---------------------------------------------------------------
   STORAGE HELPERS
--------------------------------------------------------------- */

// Persisted via the Claude-artifact window.storage API (per-user, not shared).
export const STORAGE_PREFIX = "iron-log:";

// Best-effort localStorage mirror. window.storage is the primary store, but in
// some runtimes it can be unavailable or slow to read back a just-written value;
// mirroring to localStorage (guarded — it may throw in sandboxed frames) means a
// write survives either way and reads can recover it.
export function lsGet(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v == null ? null : v;
  } catch (e) {
    return null;
  }
}
export function lsSet(key, str) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_PREFIX + key, str);
  } catch (e) {
    /* sandboxed / quota — ignore */
  }
}
export function lsDelete(key) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    /* ignore */
  }
}

// Durable native key/value store, available only when the app is running as a
// packaged Capacitor build with the @capacitor/preferences plugin installed.
// Resolved defensively via the global Capacitor object (no static import) so the
// exact same code runs in a normal browser, the Claude artifact sandbox, and an
// installed APK. When present, this is what makes data survive app restarts on a
// phone — window.storage doesn't exist there, and WebView localStorage can be
// evicted by the OS.
export function capPrefs() {
  // Only in the APK. In a browser, @capacitor/core also loads a web
  // Preferences plugin. Its key list holds only its own keys, so a
  // backup in an upgraded web app would miss the older data.
  if (!isNativeRuntime()) return null;
  try {
    const C = typeof window !== "undefined" ? window.Capacitor : null;
    if (C && C.Plugins && C.Plugins.Preferences) return C.Plugins.Preferences;
  } catch (e) {
    /* not a Capacitor runtime */
  }
  return null;
}
// The Claude-artifact / host-provided async store.
export function hasWindowStorage() {
  try {
    return typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
  } catch (e) {
    return false;
  }
}

// Reads try the most durable store first, then fall back. Writes go to every
// available backend so a value is never stranded in only one place.
export async function safeGet(key) {
  const demo = tourDemoValue(key);
  if (demo !== undefined) return demo;
  const full = STORAGE_PREFIX + key;
  let raw = null;
  const prefs = capPrefs();
  if (prefs) {
    try {
      const r = await prefs.get({ key: full });
      if (r && r.value != null) raw = r.value;
    } catch (e) {
      raw = null;
    }
  }
  if (raw == null && hasWindowStorage()) {
    try {
      const r = await window.storage.get(full);
      if (r && r.value != null) raw = r.value;
    } catch (e) {
      raw = null;
    }
  }
  if (raw == null) raw = lsGet(key); // synchronous mirror (browser / WebView)
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
export async function safeSet(key, val) {
  const full = STORAGE_PREFIX + key;
  const str = JSON.stringify(val);
  lsSet(key, str); // sync mirror first, so a value is saved even if async writes fail
  const prefs = capPrefs();
  if (prefs) {
    try {
      await prefs.set({ key: full, value: str });
    } catch (e) {
      console.error("preferences set failed", key, e);
    }
  }
  if (hasWindowStorage()) {
    try {
      await window.storage.set(full, str);
    } catch (e) {
      console.error("storage set failed", key, e);
    }
  }
}
export async function safeList(prefix) {
  const full = STORAGE_PREFIX + prefix;
  const prefs = capPrefs();
  if (prefs) {
    try {
      const r = await prefs.keys();
      if (r && r.keys) return r.keys.filter((k) => k.startsWith(full)).map((k) => k.slice(STORAGE_PREFIX.length));
    } catch (e) {
      /* fall through */
    }
  }
  if (hasWindowStorage()) {
    try {
      const r = await window.storage.list(full);
      if (r && r.keys) return r.keys.map((k) => k.slice(STORAGE_PREFIX.length));
    } catch (e) {
      /* fall through */
    }
  }
  try {
    if (typeof localStorage !== "undefined") {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(full)) out.push(k.slice(STORAGE_PREFIX.length));
      }
      return out;
    }
  } catch (e) {
    /* ignore */
  }
  return [];
}
export async function safeDelete(key) {
  const full = STORAGE_PREFIX + key;
  lsDelete(key);
  const prefs = capPrefs();
  if (prefs) {
    try {
      await prefs.remove({ key: full });
    } catch (e) {
      /* nothing to clean up */
    }
  }
  if (hasWindowStorage()) {
    try {
      await window.storage.delete(full);
    } catch (e) {
      /* nothing to clean up */
    }
  }
}

/* On the web the whole training log lives in the browser's storage, which by
   default is evictable: the browser may clear it under storage pressure, and
   "clear site data" takes it without asking twice. Persisted storage is the
   browser's promise not to do that on its own. Chrome grants it silently to
   an installed app with any history of use; Firefox asks. Either way it is
   requested once and only on the web — the APK writes to native storage,
   which was never at risk.

   Nothing depends on the answer. A refusal means the data is exactly as safe
   as it was before, which is why this neither waits for it nor reports it. */
export async function requestPersistentStorage() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.persist) return false;
    if (capPrefs()) return false; // native build: not the browser's to evict
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch (e) {
    return false;
  }
}
