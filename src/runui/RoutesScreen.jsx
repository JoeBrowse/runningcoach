import { useEffect, useMemo, useState } from "react";
import { Download, MapPin, Shuffle } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { runToGpx, writeExportFile } from "../shared/export.js";
import { currentPosition, getCachedWeather, getWeatherSettings, validLatLon } from "../shared/weather.js";
import { scaledRoute } from "./recorder.js";
import { fromUnit, getProfile, toUnit, unitsOf } from "./runData.js";
import { RouteShape } from "./ActivityScreen.jsx";
import { LineChart } from "./charts.jsx";
import { Btn, Chip, ChipRow, Loading, MONO, Note, S } from "./ui.jsx";

/* ---------------------------------------------------------------
   ROUTES (run:routes)

   A loop of the distance you choose (engine.loopRoute), with km marks
   and a height profile. Export it as GPX from a start point (your
   location, or the place in the weather settings). Street maps are not
   in this version: the loop is a shape, not a street route.
--------------------------------------------------------------- */

const PRESETS = [3, 5, 8, 10, 15, 21];

export function RoutesScreen({ nav }) {
  const [profile, setProfile] = useState(null);
  const [dist, setDist] = useState(5);
  const [seed, setSeed] = useState(1);
  const [start, setStart] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([getProfile(), getWeatherSettings(), getCachedWeather()]).then(([p, cfg, w]) => {
      if (!live) return;
      setProfile(p);
      if (cfg.enabled && cfg.mode === "manual" && validLatLon(cfg.lat, cfg.lon)) setStart({ lat: Number(cfg.lat), lon: Number(cfg.lon), label: cfg.place || "Weather place" });
      else if (cfg.enabled && w && validLatLon(w.lat, w.lon)) setStart({ lat: w.lat, lon: w.lon, label: "Weather place" });
    });
    return () => {
      live = false;
    };
  }, []);

  const units = unitsOf(profile);
  const km = fromUnit(dist, units);
  const route = useMemo(() => {
    const r = engine.loopRoute(km, seed);
    let pts = scaledRoute(r.points, km, r.elev, start);
    if (start) {
      // Move the loop so that it starts and ends at the start point.
      const dLat = start.lat - pts[0].lat;
      const dLon = start.lon - pts[0].lon;
      pts = pts.map((p) => ({ ...p, lat: p.lat + dLat, lon: p.lon + dLon }));
    }
    const unitKm = units === "mi" ? engine.KM_PER_MI : 1;
    const markers = [];
    for (let u = 1; u * unitKm < km - 0.05; u++) {
      const target = u * unitKm;
      const i = pts.findIndex((p) => p.km >= target);
      if (i > 0) {
        const a = pts[i - 1];
        const b = pts[i];
        const f = (target - a.km) / (b.km - a.km || 1);
        markers.push({ lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, label: String(u) });
      }
    }
    return { pts, markers, elev: r.elev, gain: r.gain };
  }, [km, seed, start, units]);

  async function pickLocation() {
    setBusy(true);
    setMsg(null);
    try {
      const pos = await currentPosition();
      setStart({ lat: pos.lat, lon: pos.lon, label: "Your location" });
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || "The app cannot find your location." });
    }
    setBusy(false);
  }

  async function exportGpx() {
    if (!start) {
      setMsg({ ok: false, text: "Set a start point first. Use your location, or set a place in the weather settings in Data." });
      return;
    }
    try {
      const name = `Loop ${toUnit(km, units).toFixed(1)} ${units}`;
      const gpx = runToGpx({ name, type: "run", track: route.pts.map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele })) });
      const where = await writeExportFile(`skid-marks-loop-${Math.round(toUnit(km, units) * 10) / 10}${units}.gpx`, gpx, "application/gpx+xml");
      setMsg({ ok: true, text: `Saved to ${where.label}: ${where.path}` });
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || "The app cannot save the file." });
    }
  }

  if (!profile) {
    return (
      <div data-testid="routes-screen" style={S.page()}>
        <TopBar title="Routes" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  return (
    <div data-testid="routes-screen" style={S.page()}>
      <TopBar title="Routes" onBack={nav.back} />
      <div style={{ padding: "0 20px 12px" }}>
        <Note>Street maps are not in this version. The loop shows a shape and a distance. Check the streets yourself before you run.</Note>
      </div>
      <div style={S.card()}>
        <div style={{ ...S.label(), marginBottom: 6 }}>Distance ({units})</div>
        <ChipRow>
          {PRESETS.map((d) => (
            <Chip key={d} active={dist === d} onClick={() => setDist(d)} testId={`route-${d}`}>
              {d}
            </Chip>
          ))}
        </ChipRow>
        <div style={{ marginTop: 12 }}>
          <RouteShape points={route.pts} markers={route.markers} testId="route-preview" height={240} />
        </div>
        <div style={{ ...S.body(), marginTop: 6 }}>
          Green: start and finish. Numbers: each {units === "mi" ? "mile" : "kilometre"}.
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={S.label()}>Height (example)</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: COLORS.textDim }}>up {route.gain} m</span>
          </div>
          <LineChart testId="route-elevation" height={90} area series={[{ data: route.elev, color: COLORS.accent, width: 1.5 }]} yFmt={(v) => `${Math.round(v)} m`} />
          <div style={S.body()}>The height profile is an example. The app has no height data for real streets.</div>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <Btn onClick={() => setSeed(seed + 1)} testId="new-route">
            <Shuffle size={16} /> New route
          </Btn>
          <Btn onClick={pickLocation} disabled={busy} testId="route-location">
            <MapPin size={16} /> {start ? `Start: ${start.label}` : "Start from my location"}
          </Btn>
          <Btn kind="primary" onClick={exportGpx} testId="route-gpx">
            <Download size={16} /> Export GPX
          </Btn>
        </div>
        {msg && (
          <div style={{ marginTop: 10 }}>
            <Note tone={msg.ok ? "ok" : "warn"}>{msg.text}</Note>
          </div>
        )}
      </div>
    </div>
  );
}
