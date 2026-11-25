import { useEffect, useState } from "react";
import { CloudSun, Download, Link2, RefreshCw, Watch } from "lucide-react";
import { TopBar } from "../../components/TopBar.jsx";
import { SettingsToggleRow } from "../../components/SettingsToggleRow.jsx";
import { COLORS } from "../../theme.js";
import { getImportLog } from "../store.js";
import { getIntervalsSettings, maskKey, saveIntervalsSettings, syncIntervals } from "../intervals.js";
import { getCachedWeather, getWeather, getWeatherSettings, saveWeatherSettings, validLatLon } from "../weather.js";
import { exportActivitiesCsv, exportFullBackup, exportLastRunGpx, exportSetsCsv } from "../export.js";
import { HistoryImport } from "./HistoryImport.jsx";
import { WEAR_GUIDE_URL, pullWatchRuns, pushPlanToWatch, watchStatus } from "../wear.js";
import { body, card, cardTitle, field, fmtInt, legend, mono, primaryBtn, resultBox, resultDetail, resultTitle, secondaryBtn, sectionLabel } from "./dataStyles.js";

/* ---------------------------------------------------------------
   DATA SCREEN (shared:data)

   Bring your history (import), links (Intervals.icu, Strava note,
   Health Connect / HealthKit), local weather, export and the import
   log. See docs/v1-spec.md section 9.
--------------------------------------------------------------- */

function fmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const SOURCE_LABEL = { strava: "Strava export", garmin: "Garmin export", file: "Files", mixed: "Files", intervals: "Intervals.icu" };

function Result({ result }) {
  if (!result) return null;
  return (
    <div data-testid="data-result" style={resultBox(result.ok)}>
      <div style={resultTitle(result.ok)}>{result.title}</div>
      {result.detail && <div style={resultDetail()}>{result.detail}</div>}
    </div>
  );
}

/* ---------- Intervals.icu ---------- */

function IntervalsCard({ onSynced, reloadKey }) {
  const [cfg, setCfg] = useState(null);
  const [keyInput, setKeyInput] = useState("");
  const [athlete, setAthlete] = useState("0");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true;
    getIntervalsSettings().then((c) => {
      if (!live) return;
      setCfg(c);
      setAthlete(c.athleteId || "0");
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  async function save() {
    const patch = { athleteId: athlete || "0" };
    if (keyInput.trim()) patch.apiKey = keyInput.trim();
    const next = await saveIntervalsSettings(patch);
    setCfg((c) => ({ ...c, ...next }));
    setKeyInput("");
    return next;
  }

  async function sync() {
    setBusy(true);
    setResult(null);
    try {
      await save();
      const r = await syncIntervals();
      const lines = [`Added: ${fmtInt(r.added)}`, `Duplicates: ${fmtInt(r.duplicates)}`, `Wellness days: ${fmtInt(r.wellnessDays)}`];
      if (r.skipped.length) lines.push(`Skipped: ${fmtInt(r.skipped.length)}`, ...[...new Set(r.skipped.map((s) => s.reason))]);
      setResult({ ok: true, title: "Sync complete", detail: lines.join("\n") });
      setCfg(await getIntervalsSettings());
      if (onSynced) onSynced();
    } catch (e) {
      setResult({ ok: false, title: "Sync did not work", detail: String((e && e.message) || e) });
    }
    setBusy(false);
  }

  async function unlink() {
    const next = await saveIntervalsSettings({ apiKey: "", lastSync: null, lastResult: null });
    setCfg((c) => ({ ...c, ...next }));
    setResult({ ok: true, title: "Link removed", detail: "The app removed the API key from this phone. The activities that you added stay in the app." });
  }

  const linked = !!(cfg && cfg.apiKey);
  return (
    <div style={card()}>
      <div style={cardTitle()}>Intervals.icu</div>
      <div style={{ ...body(), marginBottom: 10 }}>
        The app gets your activities and your wellness data (resting heart rate, HRV and sleep). It uses your own API key. Find the key in Intervals.icu: Settings, then Developer Settings. The app connects only when you select "Sync Now".
      </div>
      <div style={legend()}>API key</div>
      <input
        data-testid="icu-key"
        type="password"
        autoComplete="off"
        placeholder={linked ? `Saved (${maskKey(cfg.apiKey)})` : "Paste your API key"}
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        style={{ ...field(), marginBottom: 10 }}
      />
      <div style={legend()}>Athlete ID</div>
      <input data-testid="icu-athlete" type="text" autoComplete="off" value={athlete} onChange={(e) => setAthlete(e.target.value)} style={{ ...field(), marginBottom: 4 }} />
      <div style={{ ...body(), fontSize: 11, marginBottom: 12 }}>Use 0 for your own data.</div>
      <button data-testid="icu-sync" onClick={sync} disabled={busy || (!linked && !keyInput.trim())} style={{ ...primaryBtn(busy || (!linked && !keyInput.trim())), marginBottom: 8 }}>
        <RefreshCw size={14} /> {busy ? "Working…" : "Sync Now"}
      </button>
      {linked && (
        <button onClick={unlink} disabled={busy} style={secondaryBtn(busy)}>
          Remove Link
        </button>
      )}
      <div style={{ ...body(), fontSize: 11.5, marginTop: 10 }}>
        Last sync: <span style={{ ...mono(), color: COLORS.text }}>{cfg && cfg.lastSync ? fmtWhen(cfg.lastSync) : "never"}</span>
      </div>
      <div style={{ ...body(), fontSize: 11, marginTop: 6 }}>
        Intervals.icu does not share activities that came from Strava. The app skips them and tells you.
      </div>
      <Result result={result} />
    </div>
  );
}

/* ---------- Wear OS watch ---------- */

function WatchCard({ onSynced, reloadKey }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true;
    watchStatus().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  async function sendNow() {
    setBusy(true);
    setResult(null);
    const runs = await pullWatchRuns();
    const sent = await pushPlanToWatch();
    setStatus(await watchStatus());
    const lines = [];
    if (sent.sent) lines.push(`The phone sent ${fmtInt(sent.days)} run days to the watch. The watch gets them when it is connected.`);
    if (runs.saved && runs.saved.length) lines.push(`Runs from the watch saved: ${fmtInt(runs.saved.length)}.`);
    if (sent.sent) setResult({ ok: true, title: "Plan sent", detail: lines.join("\n") });
    else setResult({ ok: false, title: "Plan not sent", detail: sent.reason === "unavailable" ? "The watch link works only in the Android app." : sent.reason });
    if (runs.saved && runs.saved.length && onSynced) onSynced();
    setBusy(false);
  }

  const available = !!(status && status.available);
  const names = status && status.nodes ? status.nodes.map((n) => n.name).filter(Boolean).join(", ") : "";
  let line = "Looking for the watch…";
  if (status && !available) line = "The watch link works only in the Android app.";
  else if (status && status.connected) line = `Connected${names ? `: ${names}` : ""}.`;
  else if (status) line = "No watch found. Install Skid Marks on the watch and keep the watch near the phone.";

  return (
    <div data-testid="watch-card" style={card()}>
      <div style={{ ...cardTitle(), display: "flex", alignItems: "center", gap: 8 }}>
        <Watch size={15} color={COLORS.accent} /> Wear OS watch
      </div>
      <div style={{ ...body(), marginBottom: 10 }}>
        Run with only the watch and headphones. The watch gets the plan for the next 7 days and speaks the coach cues. Your runs come back to this phone. No account is necessary.
      </div>
      <div data-testid="watch-status" style={{ ...body(), color: COLORS.text, marginBottom: 12 }}>
        {line}
      </div>
      <button data-testid="watch-send" onClick={sendNow} disabled={busy || !available} style={{ ...primaryBtn(busy || !available), marginBottom: 8 }}>
        <RefreshCw size={14} /> {busy ? "Working…" : "Send Plan to Watch Now"}
      </button>
      <div style={{ ...body(), fontSize: 11.5, marginTop: 6 }}>
        How to install the watch app:{" "}
        <a href={WEAR_GUIDE_URL} target="_blank" rel="noreferrer" style={{ color: COLORS.accent }}>
          docs/wear-os.md
        </a>
      </div>
      <Result result={result} />
    </div>
  );
}

/* ---------- Weather ---------- */

function WeatherCard({ reloadKey }) {
  const [cfg, setCfg] = useState(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [place, setPlace] = useState("");
  const [weather, setWeather] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getWeatherSettings(), getCachedWeather()]).then(([c, w]) => {
      if (!live) return;
      setCfg(c);
      setLat(c.lat === null || c.lat === undefined ? "" : String(c.lat));
      setLon(c.lon === null || c.lon === undefined ? "" : String(c.lon));
      setPlace(c.place || "");
      setWeather(w);
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  async function update(patch) {
    const next = await saveWeatherSettings(patch);
    setCfg((c) => ({ ...c, ...next }));
    if ("mode" in patch || "lat" in patch || patch.enabled === false) setWeather(null);
    setResult(null);
    return next;
  }

  async function savePlace() {
    if (!validLatLon(lat, lon)) {
      setResult({ ok: false, title: "Place not saved", detail: "Type a latitude from -90 to 90 and a longitude from -180 to 180. For example: 51.51 and -0.13." });
      return;
    }
    await update({ lat: Number(lat), lon: Number(lon), place: place.trim() });
    setResult({ ok: true, title: "Place saved", detail: null });
  }

  async function fetchNow() {
    setBusy(true);
    setResult(null);
    try {
      const w = await getWeather({ force: true });
      setWeather(w);
    } catch (e) {
      setResult({ ok: false, title: "No weather", detail: String((e && e.message) || e) });
    }
    setBusy(false);
  }

  if (!cfg) return null;
  const mode = cfg.mode === "manual" ? "manual" : "auto";
  const modeBtn = (active) => ({ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.5 });

  return (
    <div style={{ margin: "0 20px 12px" }}>
      <div data-testid="weather-toggle">
        <SettingsToggleRow
          label="Local weather"
          desc="The app gets the weather for your runs from Open-Meteo. This service is free and needs no account. The app sends only a rounded location (about 1 km)."
          value={!!cfg.enabled}
          onToggle={() => update({ enabled: !cfg.enabled })}
        />
      </div>
      {cfg.enabled && (
        <div data-testid="weather-panel" style={{ marginTop: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
          <div style={legend()}>Location</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button data-testid="weather-auto" onClick={() => update({ mode: "auto" })} style={modeBtn(mode === "auto")}>
              Phone location
            </button>
            <button data-testid="weather-manual" onClick={() => update({ mode: "manual" })} style={modeBtn(mode === "manual")}>
              Type a place
            </button>
          </div>
          {mode === "auto" ? (
            <div style={{ ...body(), marginBottom: 12 }}>The phone asks for permission to use the location. The app does not keep a history of locations.</div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div style={legend()}>Place name</div>
              <input data-testid="weather-place" type="text" placeholder="For example: Home" value={place} onChange={(e) => setPlace(e.target.value)} style={{ ...field(), marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={legend()}>Latitude</div>
                  <input data-testid="weather-lat" type="text" inputMode="decimal" placeholder="51.51" value={lat} onChange={(e) => setLat(e.target.value)} style={field()} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={legend()}>Longitude</div>
                  <input data-testid="weather-lon" type="text" inputMode="decimal" placeholder="-0.13" value={lon} onChange={(e) => setLon(e.target.value)} style={field()} />
                </div>
              </div>
              <button data-testid="weather-save-place" onClick={savePlace} style={secondaryBtn(false)}>
                Save Place
              </button>
            </div>
          )}
          <button data-testid="weather-fetch" onClick={fetchNow} disabled={busy} style={primaryBtn(busy)}>
            <CloudSun size={14} /> {busy ? "Working…" : "Get Weather Now"}
          </button>
          {weather && weather.current && (
            <div data-testid="weather-now" style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {[
                ["Temp", weather.current.tempC, "°C"],
                ["Humidity", weather.current.humidity, "%"],
                ["Wind", weather.current.windKmh, "km/h"],
              ].map(([label, v, unit]) => (
                <div key={label} style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 6px", textAlign: "center", minWidth: 0 }}>
                  <div style={{ ...mono(), color: COLORS.text, fontSize: 17 }}>
                    {v === null || v === undefined ? "—" : Math.round(v)}
                    <span style={{ fontSize: 11, color: COLORS.textDim }}> {unit}</span>
                  </div>
                  <div style={{ ...legend(), fontSize: 9.5, marginBottom: 0, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          {weather && weather.at && <div style={{ ...body(), fontSize: 11, marginTop: 6 }}>Updated {fmtWhen(weather.at)}. The app keeps the result for 1 hour.</div>}
          <Result result={result} />
        </div>
      )}
    </div>
  );
}

/* ---------- Export ---------- */

function ExportCard() {
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  async function run(id, fn, what) {
    setBusy(id);
    setResult(null);
    try {
      const where = await fn();
      const extra = where.items ? `\n${fmtInt(where.items)} items · ${fmtInt(where.kb)} kB` : "";
      setResult({ ok: true, title: `Saved to ${where.label}`, detail: `${where.path}${extra}` });
    } catch (e) {
      setResult({ ok: false, title: `Could not save the ${what}`, detail: String((e && e.message) || e) });
    }
    setBusy(null);
  }

  const items = [
    ["csv-activities", "Activities (CSV)", "All runs, other sports and lift sessions. One row for each activity.", exportActivitiesCsv, "file"],
    ["csv-sets", "Lift sets (CSV)", "All lift sets with weight, reps and effort.", exportSetsCsv, "file"],
    ["gpx-last", "Last run (GPX)", "The GPS track of your last recorded run.", exportLastRunGpx, "GPX file"],
    ["backup", "Full backup (JSON)", "All the data in the app. Use it to restore the app on a new phone.", exportFullBackup, "backup"],
  ];
  return (
    <div style={card()}>
      <div style={cardTitle()}>Export</div>
      <div style={{ ...body(), marginBottom: 12 }}>Your data is yours. Save a copy in a file. You can open a CSV file in a spreadsheet.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(([id, label, desc, fn, what]) => (
          <button
            key={id}
            data-testid={`export-${id}`}
            onClick={() => run(id, fn, what)}
            disabled={!!busy}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 12px", textAlign: "left", opacity: busy && busy !== id ? 0.6 : 1 }}
          >
            <Download size={15} color={COLORS.accent} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {busy === id ? "Working…" : label}
              </span>
              <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.4 }}>{desc}</span>
            </span>
          </button>
        ))}
      </div>
      <Result result={result} />
    </div>
  );
}

/* ---------- Import log ---------- */

function ImportLog({ reloadKey }) {
  const [log, setLog] = useState([]);
  useEffect(() => {
    let live = true;
    getImportLog().then((l) => {
      if (live) setLog((l || []).slice(-20).reverse());
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  return (
    <div data-testid="import-log" style={card()}>
      <div style={cardTitle()}>Import log</div>
      {!log.length ? (
        <div style={body()}>No imports yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {log.map((e, i) => (
            <div key={`${e.at}-${i}`} style={{ borderTop: i ? `1px solid ${COLORS.line}` : "none", paddingTop: i ? 8 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: COLORS.text, fontSize: 12.5 }}>{SOURCE_LABEL[e.source] || "Import"}</span>
                <span style={{ ...mono(), color: COLORS.textDim, fontSize: 11 }}>{fmtWhen(e.at)}</span>
              </div>
              <div style={{ ...mono(), color: COLORS.textDim, fontSize: 11, marginTop: 2 }}>
                +{fmtInt(e.added)} added · {fmtInt(e.duplicates)} duplicates{e.skipped ? ` · ${fmtInt(e.skipped)} skipped` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- screen ---------- */

export function DataScreen({ nav }) {
  const [logKey, setLogKey] = useState(0);
  const reloadKey = `${nav.reloadKey}-${logKey}`;
  const changed = () => {
    setLogKey((n) => n + 1);
    nav.reload();
  };

  return (
    <div data-testid="data-screen" style={{ paddingBottom: 40 }}>
      <TopBar title="Data" onBack={nav.back} />
      <div style={{ padding: "0 20px 12px", ...body(), fontSize: 13 }}>
        Bring in your past training, link other services and save your data in files. All data stays on this phone.
      </div>

      <div style={{ margin: "0 20px 12px" }}>
        <HistoryImport onDone={changed} />
      </div>

      <div style={sectionLabel()}>Links</div>
      <IntervalsCard onSynced={changed} reloadKey={nav.reloadKey} />
      <div style={card()}>
        <div style={{ ...cardTitle(), display: "flex", alignItems: "center", gap: 8 }}>
          <Link2 size={15} color={COLORS.accent} /> Strava
        </div>
        <div data-testid="strava-note" style={{ ...body(), color: COLORS.text }}>
          Strava data is shown only to you and is never sent to an AI.
        </div>
        <div style={{ ...body(), marginTop: 6 }}>
          The app has no direct Strava link. To bring your Strava activities, use the Strava bulk export in "Bring your history".
        </div>
      </div>
      <WatchCard onSynced={changed} reloadKey={nav.reloadKey} />
      <div style={card()}>
        <div style={cardTitle()}>Health Connect and HealthKit</div>
        <div style={body()}>Not in this version. Export files from your health app or your watch app, and import them above.</div>
      </div>

      <WeatherCard reloadKey={nav.reloadKey} />

      <ExportCard />

      <ImportLog reloadKey={reloadKey} />
    </div>
  );
}
