import { useEffect, useMemo, useState } from "react";
import * as engine from "../run/engine.js";
import { COLORS, hexToRgba } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { getShoes, saveRun, setShoes } from "../shared/store.js";
import { markDone } from "../plan/planState.js";
import { reportUnplannedRun } from "../plan/unplanned.js";
import { correctDistance, timeInZones } from "./recorder.js";
import { FEELS, RPE_WORDS, fmtDuration, fromUnit, getProfile, getRunPrefs, unitsOf } from "./runData.js";
import { Btn, Chip, ChipRow, Confirm, Loading, MONO, NumField, Note, OSWALD, S, Stat, Toggle } from "./ui.jsx";

/* ---------------------------------------------------------------
   SUMMARY (run:summary)

   params: { run (draft from RunSession.result()), workout, iso }
   Distance, time, pace, splits, time in heart-rate zones (when there is
   heart rate), "How hard was it?", feel, shoe, note, treadmill
   correction. Save writes one activity with store.saveRun (Lift's
   Cardio & Activity list and the muscle map read the same record) and
   marks the plan day as done.
--------------------------------------------------------------- */

export function zonesFor(profile, run) {
  const p = profile || {};
  const z = engine.hrZones({ maxHR: Number(p.maxHR), restHR: Number(p.restHR) }, "karvonen") || engine.hrZones({ lthr: Number(p.lthr) }, "lthr") || engine.hrZones({ maxHR: Number(p.maxHR) }, "max");
  if (z) return { zones: z, demo: false };
  if (run && run.simulated) return { zones: engine.hrZones({ maxHR: 188, restHR: 55 }, "karvonen"), demo: true };
  return { zones: null, demo: false };
}

export function SplitsTable({ splits, units, testId = "splits" }) {
  if (!splits || !splits.length) return <div style={S.body()}>No splits. The run is shorter than 1 {units === "mi" ? "mile" : "km"} or has no distance.</div>;
  const best = Math.min(...splits.filter((s) => !s.partial).map((s) => s.sec / s.km));
  const worst = Math.max(...splits.map((s) => s.sec / s.km));
  return (
    <div data-testid={testId}>
      {splits.map((s) => {
        const pace = s.sec / s.km; // seconds per km
        const perKm = pace;
        const w = worst > 0 ? Math.max(0.15, Math.min(1, (best * 0.85) / pace + 0.15)) : 0.5;
        return (
          <div key={s.n} style={{ display: "grid", gridTemplateColumns: "34px 1fr 76px", alignItems: "center", gap: 8, minHeight: 28 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.textDim }}>{s.partial ? `${(units === "mi" ? s.km / engine.KM_PER_MI : s.km).toFixed(2)}` : s.n}</span>
            <div style={{ height: 10, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.round(w * 100)}%`, height: "100%", background: !s.partial && pace === best ? COLORS.accent : hexToRgba(COLORS.accent, 0.45) }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text, textAlign: "right" }}>{engine.fmtPace(perKm, units)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ZoneBars({ seconds, zones, testId = "hr-zones" }) {
  const total = seconds.reduce((s, x) => s + x, 0);
  if (!total) return null;
  return (
    <div data-testid={testId}>
      {zones.map((z, i) => (
        <div key={z.z} style={{ display: "grid", gridTemplateColumns: "92px 1fr 52px", alignItems: "center", gap: 8, minHeight: 26 }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>
            Z{z.z} {z.name}
          </span>
          <div style={{ height: 10, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${Math.round((seconds[i] / total) * 100)}%`, height: "100%", background: hexToRgba(COLORS.accent, 0.3 + i * 0.17) }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.text, textAlign: "right" }}>{fmtDuration(seconds[i])}</span>
        </div>
      ))}
    </div>
  );
}

export function RpePicker({ value, onChange }) {
  return (
    <div data-testid="rpe-picker">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              data-testid={`rpe-${n}`}
              aria-pressed={on}
              aria-label={`${n}: ${RPE_WORDS[n]}`}
              onClick={() => onChange(n)}
              style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${on ? COLORS.accent : COLORS.line}`, background: on ? COLORS.accent : COLORS.surfaceRaised, color: on ? COLORS.onAccent : COLORS.text, fontFamily: MONO, fontSize: 16 }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div data-testid="rpe-words" style={{ ...S.text(), marginTop: 8, minHeight: 21 }}>
        {value ? `${value}: ${RPE_WORDS[value]}` : "Tap a number. 1 is very easy. 10 is maximum effort."}
      </div>
    </div>
  );
}

export function SummaryScreen({ nav }) {
  const params = nav.params || {};
  const draft = params.run || null;
  const [ctx, setCtx] = useState(null);
  const [rpe, setRpe] = useState(null);
  const [feel, setFeel] = useState(null);
  const [shoe, setShoe] = useState(null);
  const [note, setNote] = useState("");
  const [tmKm, setTmKm] = useState("");
  const [markPlan, setMarkPlan] = useState(!!(draft && draft.planIso && !draft.simulated));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saved, setSaved] = useState(draft && draft.savedId ? { id: draft.savedId } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([getProfile(), getShoes(), getRunPrefs()]).then(([profile, shoes, prefs]) => {
      if (!live) return;
      const active = (shoes || []).filter((s) => !s.retired);
      setCtx({ profile, shoes: active, allShoes: shoes || [], prefs });
      const d = active.find((s) => s.isDefault);
      if (d) setShoe(d.id);
    });
    return () => {
      live = false;
    };
  }, []);

  const units = unitsOf(ctx && ctx.profile);
  const run = useMemo(() => {
    if (!draft) return null;
    if (draft.type === "treadmill" && Number(tmKm) > 0) return correctDistance(draft, fromUnit(tmKm, units));
    return draft;
  }, [draft, tmKm, units]);

  if (!draft) {
    return (
      <div data-testid="summary-screen" style={S.page()}>
        <TopBar title="Run summary" onBack={nav.back} />
        <div style={S.card()}>
          <div style={S.body()}>There is no run to save.</div>
        </div>
      </div>
    );
  }
  if (!ctx) {
    return (
      <div data-testid="summary-screen" style={S.page()}>
        <TopBar title="Run summary" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  const pace = run.km > 0.05 ? run.durationSec / run.km : null;
  const { zones, demo } = zonesFor(ctx.profile, run);
  const zoneSec = run.hrSeries && zones ? timeInZones(run.hrSeries, zones) : null;

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const rec = { ...run, rpe, feel, shoe, note: note.trim() || null };
      if (zoneSec && !demo) rec.zoneSec = zoneSec.map((x) => Math.round(x));
      const record = await saveRun(rec);
      if (shoe && run.km > 0) {
        const next = ctx.allShoes.map((s) => (s.id === shoe ? { ...s, km: Math.round(((Number(s.km) || 0) + run.km) * 10) / 10 } : s));
        await setShoes(next);
      }
      if (markPlan && run.planIso) {
        try {
          await markDone(run.planIso, record.id);
        } catch (e) {
          /* the run is saved; the plan mark is not important enough to fail */
        }
      }
      // A run on a day with no planned run can change the next days
      // (spec v1.1 section 4). A planned run done on another day is not
      // unplanned. It never throws.
      if (!(markPlan && run.planIso)) await reportUnplannedRun(record);
      // The back stack keeps this draft: mark it, so a return to this
      // screen shows "saved" and never saves the run twice.
      draft.savedId = record.id;
      nav.reload();
      setSaved(record);
      if (ctx.prefs.dailyCheckin) nav.go("run:checkin", { afterRun: true });
    } catch (e) {
      setError("The app cannot save the run. Try again. If the phone is full, export your data first.");
    }
    setBusy(false);
  }

  if (saved) {
    return (
      <div data-testid="summary-screen" style={S.page()}>
        <TopBar title="Run saved" onBack={nav.home} />
        <div data-testid="summary-saved" style={S.card()}>
          <div style={{ ...S.title(), fontSize: 20 }}>Well done</div>
          <div style={S.body()}>
            {engine.fmtKm(run.km, units)} in {fmtDuration(run.durationSec)}. The run is in your history, in Lift's Cardio and Activity list and on the muscle map.
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <Btn kind="primary" onClick={() => nav.go("run:activity", { id: saved.id })} testId="summary-view">
              See the run
            </Btn>
            <Btn onClick={nav.home} testId="summary-done">
              Done
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="summary-screen" style={S.page()}>
      <TopBar title="Run summary" onBack={() => setConfirmDiscard(true)} />
      {run.simulated && (
        <div style={{ padding: "0 20px 12px" }}>
          <Note tone="warn" testId="sim-warning">
            This run is simulated (demo). Save it only to test the app. You can delete it later in Progress.
          </Note>
        </div>
      )}
      <div style={S.card()}>
        <div style={{ ...S.label(), marginBottom: 8 }}>{run.workoutTitle || (run.type === "treadmill" ? "Treadmill run" : "Free run")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <Stat label="Distance" value={engine.fmtKm(run.km, units)} testId="sum-distance" />
          <Stat label="Time" value={fmtDuration(run.durationSec)} testId="sum-time" />
          <Stat label="Pace" value={pace ? engine.fmtPace(pace, units) : "-"} testId="sum-pace" />
        </div>
        {run.avgHR && (
          <div style={{ ...S.body(), marginTop: 8, fontFamily: MONO }}>
            Heart rate {run.avgHR} average · {run.maxHR} max{run.simulated ? " (simulated)" : ""}
          </div>
        )}
        {run.warmupMin > 0 && <div style={{ ...S.body(), marginTop: 4 }}>The time includes {run.warmupMin} min of warm-up.</div>}
      </div>

      {run.type === "treadmill" && (
        <div data-testid="treadmill-correct" style={S.card()}>
          <div style={S.title()}>Treadmill distance</div>
          <div style={{ ...S.body(), marginBottom: 8 }}>The app calculated {engine.fmtKm(draft.km, units)} from the speed. Type the distance from the treadmill display to correct it.</div>
          <NumField label={`Distance (${units})`} value={tmKm} onChange={setTmKm} step="0.01" min="0" testId="treadmill-km" />
        </div>
      )}

      <div style={S.card()}>
        <div style={{ ...S.title(), marginBottom: 8 }}>Splits</div>
        <SplitsTable splits={run.splits} units={units} />
        {run.laps && run.laps.length > 0 && <div style={{ ...S.body(), marginTop: 8 }}>{run.laps.length} lap{run.laps.length === 1 ? "" : "s"}: {run.laps.map((l) => fmtDuration(l.sec)).join(", ")}</div>}
      </div>

      {/* Simple mode hides zones, except when the user typed real heart-rate values. */}
      {zoneSec && (!demo || (nav.settings && nav.settings.appMode === "advanced")) && (
        <div style={S.card()}>
          <div style={{ ...S.title(), marginBottom: 8 }}>Time in heart-rate zones</div>
          <ZoneBars seconds={zoneSec} zones={zones} />
          {demo && <div style={{ ...S.body(), marginTop: 6 }}>Example zones. Add your heart-rate values in Zones.</div>}
        </div>
      )}

      <div style={S.card()}>
        <div style={{ ...S.title(), marginBottom: 8 }}>How hard was it?</div>
        <RpePicker value={rpe} onChange={setRpe} />
        <div style={{ ...S.label(), margin: "14px 0 6px" }}>How do you feel?</div>
        <ChipRow>
          {FEELS.map((f) => (
            <Chip key={f.id} active={feel === f.id} onClick={() => setFeel(feel === f.id ? null : f.id)} testId={`feel-${f.id}`}>
              {f.label}
            </Chip>
          ))}
        </ChipRow>
        <div style={{ ...S.label(), margin: "14px 0 6px" }}>Shoe</div>
        {ctx.shoes.length ? (
          <ChipRow>
            {ctx.shoes.map((s) => (
              <Chip key={s.id} active={shoe === s.id} onClick={() => setShoe(shoe === s.id ? null : s.id)} testId={`shoe-${s.id}`}>
                {s.name}
              </Chip>
            ))}
          </ChipRow>
        ) : (
          <button onClick={() => nav.go("run:shoes")} style={{ minHeight: 44, color: COLORS.accent, fontFamily: OSWALD, fontSize: 12.5, textTransform: "uppercase" }}>
            Add a shoe
          </button>
        )}
        <div style={{ ...S.label(), margin: "14px 0 6px" }}>Note</div>
        <textarea data-testid="sum-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Optional" style={{ ...S.field(), fontFamily: "inherit", resize: "vertical" }} />
        {run.planIso && <Toggle label="Mark the plan session as done" desc={engine.fmtDate(run.planIso)} value={markPlan} onToggle={() => setMarkPlan(!markPlan)} testId="mark-plan" />}
      </div>

      {error && (
        <div style={{ padding: "0 20px 12px" }}>
          <Note tone="warn">{error}</Note>
        </div>
      )}
      <div style={{ padding: "0 20px", display: "grid", gap: 10 }}>
        <Btn kind="primary" onClick={save} disabled={busy} testId="save-run" style={{ minHeight: 56, fontSize: 16 }}>
          Save
        </Btn>
        {!confirmDiscard ? (
          <Btn kind="danger" onClick={() => setConfirmDiscard(true)} testId="discard-run">
            Discard
          </Btn>
        ) : (
          <Confirm text="Discard this run? The app does not keep it." yes="Discard" no="Keep it" onYes={nav.home} onNo={() => setConfirmDiscard(false)} testId="discard-confirm" />
        )}
      </div>
    </div>
  );
}
