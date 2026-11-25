import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { removeActivity, activityType } from "../lib/activities.js";
import { getShoes, normaliseActivity, setShoes } from "../shared/store.js";
import { gpxFilename, hasTrack, runToGpx, writeExportFile } from "../shared/export.js";
import { clearDone, currentPlan } from "../plan/planState.js";
import { haversineKm, timeInZones } from "./recorder.js";
import { FEELS, RPE_WORDS, fmtDuration, getActivityRecord, getProfile, unitsOf } from "./runData.js";
import { LineChart } from "./charts.jsx";
import { SplitsTable, ZoneBars, zonesFor } from "./SummaryScreen.jsx";
import { Btn, Confirm, Loading, MONO, Note, S, Stat, useWidth } from "./ui.jsx";

/* ---------------------------------------------------------------
   ACTIVITY (run:activity, params { id })

   Route shape from the track points (no street map), height profile,
   splits, heart rate, effort, shoe and note. Export GPX. Delete with a
   confirm (the shoe distance and the plan mark go back too).
--------------------------------------------------------------- */

export function RouteShape({ points, height = 220, testId = "route-shape", markers = [] }) {
  const [ref, width] = useWidth();
  const pts = (points || []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (pts.length < 2) return <div ref={ref} />;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xy = pts.map((p) => [p.lon * k, -p.lat]);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 14;
  const s = Math.min((width - 2 * pad) / Math.max(1e-9, maxX - minX), (height - 2 * pad) / Math.max(1e-9, maxY - minY));
  const ox = (width - (maxX - minX) * s) / 2;
  const oy = (height - (maxY - minY) * s) / 2;
  const P = ([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s];
  const d = xy.map((p, i) => `${i ? "L" : "M"}${P(p)[0].toFixed(1)},${P(p)[1].toFixed(1)}`).join("");
  const a = P(xy[0]);
  const b = P(xy[xy.length - 1]);
  return (
    <div ref={ref} data-testid={testId} style={{ width: "100%", background: COLORS.surfaceRaised, borderRadius: 10 }}>
      <svg width={width} height={height} role="img" aria-label="Route shape" style={{ display: "block" }}>
        <path d={d} fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {markers.map((m, i) => {
          const q = P([m.lon * k, -m.lat]);
          return (
            <g key={i}>
              <circle cx={q[0]} cy={q[1]} r={8} fill={COLORS.bg} stroke={COLORS.text} strokeWidth={1} />
              <text x={q[0]} y={q[1] + 3} textAnchor="middle" fontSize={8.5} fill={COLORS.text} fontFamily={MONO}>
                {m.label}
              </text>
            </g>
          );
        })}
        <circle cx={a[0]} cy={a[1]} r={6} fill={COLORS.ok} stroke={COLORS.bg} strokeWidth={2} />
        <circle cx={b[0]} cy={b[1]} r={6} fill={COLORS.bad} stroke={COLORS.bg} strokeWidth={2} />
      </svg>
    </div>
  );
}

/* Height in metres against distance, from track points. */
export function elevationProfile(track) {
  const out = [];
  let km = 0;
  for (let i = 0; i < (track || []).length; i++) {
    if (i) km += haversineKm(track[i - 1], track[i]);
    if (Number.isFinite(track[i].ele) && track[i].ele !== null) out.push({ km, ele: track[i].ele });
  }
  if (out.length < 2) return null;
  let gain = 0;
  for (let i = 1; i < out.length; i++) if (out[i].ele > out[i - 1].ele) gain += out[i].ele - out[i - 1].ele;
  return { rows: out, gain: Math.round(gain), min: Math.min(...out.map((r) => r.ele)), max: Math.max(...out.map((r) => r.ele)) };
}

export function ActivityScreen({ nav }) {
  const id = nav.params && nav.params.id;
  const [data, setData] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getActivityRecord(id), getProfile(), getShoes()]).then(([rec, profile, shoes]) => live && setData({ rec, profile, shoes: shoes || [] }));
    return () => {
      live = false;
    };
  }, [id]);

  if (!data) {
    return (
      <div data-testid="activity-screen" style={S.page()}>
        <TopBar title="Activity" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const { rec, profile, shoes } = data;
  if (!rec) {
    return (
      <div data-testid="activity-screen" style={S.page()}>
        <TopBar title="Activity" onBack={nav.back} />
        <div style={S.card()}>
          <div style={S.body()}>The app cannot find this activity. It was perhaps deleted.</div>
        </div>
      </div>
    );
  }
  const units = unitsOf(profile);
  const a = normaliseActivity(rec);
  const secs = a.minutes ? a.minutes * 60 : 0;
  const pace = a.km > 0 && secs ? secs / a.km : null;
  const elev = hasTrack(rec) ? elevationProfile(rec.track) : null;
  const shoe = rec.shoe ? shoes.find((s) => s.id === rec.shoe) : null;
  const feel = rec.feel ? FEELS.find((f) => f.id === rec.feel) : null;
  const { zones, demo } = zonesFor(profile, rec);
  const zoneSec = rec.zoneSec && zones ? rec.zoneSec : rec.hrSeries && zones ? timeInZones(rec.hrSeries, zones) : null;
  const splitUnits = rec.splitUnit || units;
  const title = rec.workoutTitle || rec.name || activityType(rec.type).label;

  async function exportGpx() {
    try {
      const where = await writeExportFile(gpxFilename(rec), runToGpx(rec), "application/gpx+xml");
      setMsg({ ok: true, text: `Saved to ${where.label}: ${where.path}` });
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || "The app cannot save the file." });
    }
  }

  async function del() {
    await removeActivity(rec.id);
    if (rec.shoe && a.km > 0) {
      await setShoes(shoes.map((s) => (s.id === rec.shoe ? { ...s, km: Math.max(0, Math.round(((Number(s.km) || 0) - a.km) * 10) / 10) } : s)));
    }
    if (rec.planIso) {
      try {
        const plan = await currentPlan();
        const day = plan ? engine.allDays(plan).find((d) => d.iso === rec.planIso) : null;
        if (day && day.done && day.done.activityId === rec.id) await clearDone(rec.planIso);
      } catch (e) {
        /* the plan mark stays; the run is deleted */
      }
    }
    nav.reload();
    nav.back();
  }

  return (
    <div data-testid="activity-screen" style={S.page()}>
      <TopBar title="Activity" onBack={nav.back} />
      <div style={S.card()}>
        <div style={{ ...S.title(), fontSize: 18 }}>{title}</div>
        <div style={{ ...S.body(), marginBottom: 10 }}>
          {a.date ? engine.fmtDate(a.date) : ""}
          {a.startedAt ? ` · ${new Date(a.startedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}
          {rec.simulated ? " · simulated (demo)" : ""}
          {rec.recordedWith === "treadmill" || rec.type === "treadmill" ? " · treadmill" : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <Stat label="Distance" value={a.km ? engine.fmtKm(a.km, units) : "-"} testId="act-distance" />
          <Stat label="Time" value={secs ? fmtDuration(secs) : "-"} />
          <Stat label="Pace" value={pace ? engine.fmtPace(pace, units) : "-"} />
        </div>
        {rec.distanceCorrected && <div style={{ ...S.body(), marginTop: 6 }}>Distance corrected from {engine.fmtKm(rec.measuredKm, units)}.</div>}
      </div>

      {hasTrack(rec) ? (
        <div style={S.card()}>
          <div style={{ ...S.title(), marginBottom: 8 }}>Route</div>
          <RouteShape points={rec.track} />
          <div style={{ ...S.body(), marginTop: 6 }}>Green: start. Red: finish. Street maps are not in this version.</div>
          {elev && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={S.label()}>Height</span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: COLORS.textDim }}>
                  up {elev.gain} m · {Math.round(elev.min)} to {Math.round(elev.max)} m
                </span>
              </div>
              <LineChart testId="elevation-chart" height={100} area series={[{ data: elev.rows.map((r) => r.ele), color: COLORS.accent, width: 1.5 }]} yFmt={(v) => `${Math.round(v)} m`} />
            </div>
          )}
        </div>
      ) : (
        <div style={S.card()}>
          <div style={S.body()}>This activity has no GPS track.</div>
        </div>
      )}

      {rec.splits && rec.splits.length > 0 && (
        <div style={S.card()}>
          <div style={{ ...S.title(), marginBottom: 8 }}>Splits</div>
          <SplitsTable splits={rec.splits} units={splitUnits} />
        </div>
      )}

      {(a.avgHR || zoneSec) && (
        <div style={S.card()}>
          <div style={{ ...S.title(), marginBottom: 8 }}>Heart rate</div>
          {a.avgHR && (
            <div style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text, marginBottom: 8 }}>
              {a.avgHR} average{a.maxHR ? ` · ${a.maxHR} max` : ""}
            </div>
          )}
          {zoneSec && zones && <ZoneBars seconds={zoneSec} zones={zones} />}
          {demo && <div style={{ ...S.body(), marginTop: 6 }}>Example zones. Add your heart-rate values in Zones.</div>}
        </div>
      )}

      <div style={S.card()}>
        <div style={{ ...S.title(), marginBottom: 6 }}>Notes</div>
        <div style={{ ...S.text(), fontSize: 13 }}>Effort: {a.rpe ? `${a.rpe} · ${RPE_WORDS[Math.round(a.rpe)] || ""}` : "not given"}</div>
        {feel && <div style={{ ...S.text(), fontSize: 13 }}>Feel: {feel.label}</div>}
        <div style={{ ...S.text(), fontSize: 13 }}>Shoe: {shoe ? shoe.name : "none"}</div>
        {rec.note && <div style={{ ...S.text(), fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>{rec.note}</div>}
      </div>

      <div style={{ padding: "0 20px", display: "grid", gap: 10 }}>
        {hasTrack(rec) && (
          <Btn onClick={exportGpx} testId="export-gpx">
            <Download size={16} /> Export GPX
          </Btn>
        )}
        {msg && <Note tone={msg.ok ? "ok" : "warn"}>{msg.text}</Note>}
        {!confirmDel ? (
          <Btn kind="danger" onClick={() => setConfirmDel(true)} testId="delete-activity">
            <Trash2 size={16} /> Delete
          </Btn>
        ) : (
          <Confirm text="Delete this activity? You cannot undo this." yes="Delete" no="Keep it" onYes={del} onNo={() => setConfirmDel(false)} testId="delete-confirm" />
        )}
      </div>
    </div>
  );
}
