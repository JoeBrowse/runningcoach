import { isNativeRuntime } from "../lib/platform.js";
import { getRunSettings, setRunSettings } from "./store.js";

/* ---------------------------------------------------------------
   LOCAL WEATHER (optional)

   Weather from Open-Meteo: free, no key, no account. The app asks for
   it only when the user turned on "Local weather" in Data. Then:
   - Location "auto": the phone location (Capacitor Geolocation in the
     Android app, navigator.geolocation in a browser).
   - Location "manual": the latitude and longitude that the user typed.
   The result stays in a cache for 1 hour (run-settings.weatherCache).

   Settings: run-settings.weather = { enabled, mode: "auto" | "manual",
     lat, lon, place }.
   Result: { at, lat, lon, current: { tempC, humidity, windKmh },
     hourly: [{ time, tempC, humidity }] }.
--------------------------------------------------------------- */

export const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
export const WEATHER_CACHE_MS = 60 * 60 * 1000;

export const WEATHER_ERRORS = {
  off: "Local weather is off.",
  noPlace: "Type a latitude and a longitude, or use the phone location.",
  denied: "The app cannot use the phone location. Allow location for the app, or type a place.",
  noLocation: "The app cannot find the phone location. Try again outside, or type a place.",
  noNetwork: "The app cannot get the weather. Make sure that the phone has a network connection.",
  server: "The weather service sent an error. Try again later.",
};

export class WeatherError extends Error {
  constructor(code) {
    super(WEATHER_ERRORS[code] || WEATHER_ERRORS.server);
    this.code = code;
  }
}

export async function getWeatherSettings() {
  const rs = (await getRunSettings()) || {};
  return { enabled: false, mode: "auto", lat: null, lon: null, place: "", ...(rs.weather || {}) };
}

export async function saveWeatherSettings(patch) {
  const rs = (await getRunSettings()) || {};
  const next = { ...(rs.weather || {}), ...patch };
  const out = { ...rs, weather: next };
  // A new place or mode makes the cache wrong.
  if ("mode" in patch || "lat" in patch || "lon" in patch || patch.enabled === false) delete out.weatherCache;
  await setRunSettings(out);
  return next;
}

export function validLatLon(lat, lon) {
  const a = Number(lat);
  const b = Number(lon);
  return lat !== null && lat !== "" && lon !== null && lon !== "" && Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
}

async function nativePosition() {
  const { Geolocation } = await import("@capacitor/geolocation");
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      const asked = await Geolocation.requestPermissions({ permissions: ["coarseLocation"] });
      if (asked.location !== "granted" && asked.coarseLocation !== "granted") throw new WeatherError("denied");
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60 * 1000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch (e) {
    if (e instanceof WeatherError) throw e;
    if (/denied|permission/i.test(String((e && e.message) || ""))) throw new WeatherError("denied");
    throw new WeatherError("noLocation");
  }
}

function browserPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new WeatherError("noLocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new WeatherError(err && err.code === 1 ? "denied" : "noLocation")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30 * 60 * 1000 }
    );
  });
}

export async function currentPosition() {
  return isNativeRuntime() ? nativePosition() : browserPosition();
}

export function weatherUrl(lat, lon) {
  const p = new URLSearchParams({
    latitude: String(Math.round(lat * 100) / 100),
    longitude: String(Math.round(lon * 100) / 100),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    hourly: "temperature_2m,relative_humidity_2m",
    forecast_days: "2",
    timezone: "auto",
  });
  return `${WEATHER_URL}?${p.toString()}`;
}

export function mapWeather(json, lat, lon, now = Date.now()) {
  const c = (json && json.current) || {};
  const h = (json && json.hourly) || {};
  const times = Array.isArray(h.time) ? h.time : [];
  return {
    at: new Date(now).toISOString(),
    lat,
    lon,
    current: {
      tempC: Number.isFinite(c.temperature_2m) ? c.temperature_2m : null,
      humidity: Number.isFinite(c.relative_humidity_2m) ? c.relative_humidity_2m : null,
      windKmh: Number.isFinite(c.wind_speed_10m) ? c.wind_speed_10m : null,
    },
    hourly: times.map((time, i) => ({
      time,
      tempC: h.temperature_2m ? h.temperature_2m[i] ?? null : null,
      humidity: h.relative_humidity_2m ? h.relative_humidity_2m[i] ?? null : null,
    })),
  };
}

/* The weather, or null when the setting is off.
   options: { force: true } skips the cache; { fetch } for tests. */
export async function getWeather(options = {}) {
  const cfg = await getWeatherSettings();
  if (!cfg.enabled) return null;
  const rs = (await getRunSettings()) || {};
  const cache = rs.weatherCache;
  const now = Date.now();
  if (!options.force && cache && cache.at && now - new Date(cache.at).getTime() < WEATHER_CACHE_MS) return cache;

  let lat;
  let lon;
  if (cfg.mode === "manual") {
    if (!validLatLon(cfg.lat, cfg.lon)) throw new WeatherError("noPlace");
    lat = Number(cfg.lat);
    lon = Number(cfg.lon);
  } else {
    ({ lat, lon } = await currentPosition());
  }

  const f = options.fetch || (typeof fetch === "function" ? fetch : null);
  if (!f) throw new WeatherError("noNetwork");
  let res;
  try {
    res = await f(weatherUrl(lat, lon));
  } catch (e) {
    throw new WeatherError("noNetwork");
  }
  if (!res.ok) throw new WeatherError("server");
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new WeatherError("server");
  }
  const result = mapWeather(json, Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, now);
  const latest = (await getRunSettings()) || {};
  await setRunSettings({ ...latest, weatherCache: result });
  return result;
}

export async function getCachedWeather() {
  const rs = (await getRunSettings()) || {};
  return rs.weatherCache || null;
}
