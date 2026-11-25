import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { listActivities } from "../shared/store.js";
import { getCachedWeather, getWeather, getWeatherSettings } from "../shared/weather.js";
import { currentPlan } from "../plan/planState.js";
import { getProfile, jargonOn, unitsOf } from "./runData.js";
import { Btn, Loading, MONO, Note, S, Stat } from "./ui.jsx";

/* ---------------------------------------------------------------
   WEATHER (run:weather)

   Local weather from Open-Meteo only when the user turned it on in
   Data (shared/weather.js). Else, or to test other values, the
   sliders set temperature and humidity. engine.heatAdjust gives the
   change and the adjusted paces.
--------------------------------------------------------------- */

function Slider({ label, value, min, max, step = 1, onChange, unit, testId }) {
  return (
    <label style={{ display: "block", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={S.label()}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text }}>
          {value} {unit}
        </span>
      </div>
      <input data-testid={testId} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", height: 32, accentColor: COLORS.accent }} />
    </label>
  );
}

export function WeatherScreen({ nav }) {
  const [data, setData] = useState(null);
  const [temp, setTemp] = useState(15);
  const [hum, setHum] = useState(60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function applyWeather(w) {
    if (w && w.current) {
      if (Number.isFinite(w.current.tempC)) setTemp(Math.round(w.current.tempC));
      if (Number.isFinite(w.current.humidity)) setHum(Math.round(w.current.humidity));
    }
  }

  useEffect(() => {
    let live = true;
    Promise.all([getWeatherSettings(), getCachedWeather(), currentPlan(), getProfile(), listActivities(nav.settings)]).then(async ([cfg, cached, plan, profile, acts]) => {
      if (!live) return;
      setData({ cfg, weather: cfg.enabled ? cached : null, plan, profile, acts });
      if (cfg.enabled) {
        applyWeather(cached);
        if (!cached) {
          try {
            const w = await getWeather();
            if (live && w) {
              setData((d) => ({ ...d, weather: w }));
              applyWeather(w);
            }
          } catch (e) {
            if (live) setErr(e.message || "The app cannot get the weather.");
          }
        }
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setBusy(true);
    setErr("");
    try {
      const w = await getWeather({ force: true });
      setData((d) => ({ ...d, weather: w }));
      applyWeather(w);
    } catch (e) {
      setErr(e.message || "The app cannot get the weather.");
    }
    setBusy(false);
  }

  if (!data) {
    return (
      <div data-testid="weather-screen" style={S.page()}>
        <TopBar title="Weather" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const { cfg, weather, plan, profile, acts } = data;
  const units = unitsOf(profile);
  const adv = jargonOn(nav.settings, plan, acts);
  const h = engine.heatAdjust({ tempC: temp, humidity: hum });
  const p = plan && plan.paces;
  const f = 1 + h.pct / 100;

  return (
    <div data-testid="weather-screen" style={S.page()}>
      <TopBar title="Weather" onBack={nav.back} />
      <div data-testid="weather-local" style={S.card()}>
        <div style={S.title()}>Local weather</div>
        {cfg.enabled ? (
          <>
            {weather && weather.current ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, margin: "6px 0 10px" }}>
                <Stat label="Temperature" value={`${Math.round(weather.current.tempC)} °C`} />
                <Stat label="Humidity" value={`${Math.round(weather.current.humidity)} %`} />
                <Stat label="Wind" value={weather.current.windKmh !== null ? `${Math.round(weather.current.windKmh)} km/h` : "-"} />
              </div>
            ) : (
              <div style={{ ...S.body(), margin: "6px 0 10px" }}>No weather yet.</div>
            )}
            {weather && weather.at && <div style={{ ...S.body(), marginBottom: 8 }}>From Open-Meteo at {new Date(weather.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.</div>}
            <Btn onClick={refresh} disabled={busy} testId="weather-refresh">
              <RefreshCw size={16} /> Get the weather now
            </Btn>
          </>
        ) : (
          <>
            <div style={{ ...S.body(), marginBottom: 10 }}>Local weather is off. The app makes no network call. Turn it on in Data, or use the sliders below.</div>
            <Btn onClick={() => nav.go("shared:data")} testId="weather-open-data">
              Open Data
            </Btn>
          </>
        )}
        {err && (
          <div style={{ marginTop: 10 }}>
            <Note tone="warn">{err}</Note>
          </div>
        )}
      </div>

      <div data-testid="heat-card" style={S.card()}>
        <div style={S.title()}>Heat and your run</div>
        <Slider label="Temperature" value={temp} min={-15} max={42} unit="°C" onChange={setTemp} testId="temp-slider" />
        <Slider label="Humidity" value={hum} min={0} max={100} unit="%" onChange={setHum} testId="hum-slider" />
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
          <span data-testid="heat-pct" style={{ fontFamily: MONO, fontSize: 28, color: h.pct ? COLORS.accent : COLORS.ok }}>
            {h.pct ? `+${h.pct}%` : "0%"}
          </span>
          <span style={S.body()}>dew point {h.dewC} °C</span>
        </div>
        <div style={{ ...S.text(), marginTop: 6 }} data-testid="heat-note">
          {h.note}
        </div>
        {adv && p && h.pct > 0 && (
          <div data-testid="adjusted-paces" style={{ marginTop: 10 }}>
            <div style={S.label()}>Adjusted paces</div>
            {[
              ["Easy", p.easy],
              ["Long run", p.long],
              ["Marathon", p.marathon],
              ["Threshold", p.threshold],
              ["Intervals", p.interval],
            ].map(([name, v]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <span style={{ ...S.text(), fontSize: 13 }}>{name}</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text }}>
                  <span style={{ color: COLORS.textDim }}>{engine.fmtPace(v, units)}</span> → {engine.fmtPace(v * f, units)}
                </span>
              </div>
            ))}
          </div>
        )}
        {!adv && h.pct > 0 && <div style={{ ...S.body(), marginTop: 8 }}>Run by effort. Slow down until you can talk easily. Drink water.</div>}
      </div>
    </div>
  );
}
