import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Watch } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { exportWorkoutFit } from "../shared/export.js";
import { currentPlan } from "../plan/planState.js";
import { builderToWorkout, flattenSteps, getProfile, getRunPrefs, newId, saveRunPrefs, stepsToFitSteps, totalSeconds, unitsOf } from "./runData.js";
import { Btn, Chip, ChipRow, Confirm, Loading, MONO, Note, NumField, Ribbon, S, Segmented, parsePace } from "./ui.jsx";

/* ---------------------------------------------------------------
   WORKOUT BUILDER (run:builder)

   Warm-up, repeat blocks (time or distance, pace range or effort),
   cool-down. Live ribbon and totals. Save to a small library
   (run-settings.workouts). "Use in a run" opens the recorder.
   "Send to watch" writes a FIT workout file.
--------------------------------------------------------------- */

const EFFORTS = ["Hard: you can say a few words only.", "Comfortably hard.", "Steady: you can talk in short sentences.", "Fast and relaxed. Not a sprint."];
const EFFORT_LABEL = ["Hard", "Comfortably hard", "Steady", "Fast, relaxed"];

const newBlock = () => ({ times: 5, work: { by: "time", value: 3, target: "effort", paceLo: "", paceHi: "", effort: EFFORTS[0] }, rest: { by: "time", value: 2 } });
const newDraft = () => ({ id: null, name: "My intervals", warmMin: 10, coolMin: 10, blocks: [newBlock()] });

/* The draft keeps pace text in the user's unit. This makes the engine-style draft. */
function toEngineDraft(d, units) {
  const conv = (txt) => {
    const s = parsePace(txt);
    if (!s) return null;
    return units === "mi" ? s / engine.KM_PER_MI : s;
  };
  return {
    ...d,
    blocks: d.blocks.map((b) => ({
      times: b.times,
      work: { ...b.work, value: b.work.by === "dist" ? engineKm(b.work.value, units) : b.work.value, paceLo: conv(b.work.paceLo), paceHi: conv(b.work.paceHi) },
      rest: { ...b.rest, value: b.rest.by === "dist" ? engineKm(b.rest.value, units) : b.rest.value },
    })),
  };
}
const engineKm = (v, units) => engine.unitsToKm(Number(v) || 0, units);

function PartEditor({ part, onChange, units, isWork, testId }) {
  return (
    <div data-testid={testId}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "end" }}>
        <Segmented value={part.by} options={[{ value: "time", label: "Time" }, { value: "dist", label: "Distance" }]} onChange={(by) => onChange({ ...part, by, value: by === "dist" ? (isWork ? 1 : 0.2) : isWork ? 3 : 2 })} />
        <NumField label={part.by === "dist" ? units : "min"} value={part.value} onChange={(v) => onChange({ ...part, value: v })} step={part.by === "dist" ? "0.1" : "0.5"} min="0" testId={`${testId}-value`} />
      </div>
      {isWork && (
        <div style={{ marginTop: 8 }}>
          <Segmented value={part.target} options={[{ value: "effort", label: "Effort" }, { value: "pace", label: "Pace range" }]} onChange={(target) => onChange({ ...part, target })} />
          {part.target === "pace" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <label>
                <div style={{ ...S.label(), marginBottom: 4 }}>Fastest (m:ss /{units})</div>
                <input data-testid={`${testId}-pace-lo`} value={part.paceLo} onChange={(e) => onChange({ ...part, paceLo: e.target.value })} placeholder="4:10" style={S.field()} />
              </label>
              <label>
                <div style={{ ...S.label(), marginBottom: 4 }}>Slowest (m:ss /{units})</div>
                <input data-testid={`${testId}-pace-hi`} value={part.paceHi} onChange={(e) => onChange({ ...part, paceHi: e.target.value })} placeholder="4:20" style={S.field()} />
              </label>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <ChipRow>
                {EFFORTS.map((e, i) => (
                  <Chip key={e} active={part.effort === e} onClick={() => onChange({ ...part, effort: e })}>
                    {EFFORT_LABEL[i]}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BuilderScreen({ nav }) {
  const [ctx, setCtx] = useState(null);
  const [draft, setDraft] = useState(newDraft);
  const [msg, setMsg] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getProfile(), getRunPrefs(), currentPlan()]).then(([profile, prefs, plan]) => live && setCtx({ profile, prefs, plan }));
    return () => {
      live = false;
    };
  }, []);

  const units = unitsOf(ctx && ctx.profile);
  const workout = useMemo(() => (ctx ? builderToWorkout(toEngineDraft(draft, units), ctx.plan) : null), [draft, units, ctx]);

  if (!ctx) {
    return (
      <div data-testid="builder-screen" style={S.page()}>
        <TopBar title="Workout builder" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  const segs = flattenSteps(workout);
  const total = totalSeconds(segs);
  const km = segs.reduce((s, x) => s + (x.km || (x.sec && (x.pace || x.estPace) ? x.sec / (x.pace || x.estPace) : 0)), 0);
  const setBlock = (i, b) => setDraft({ ...draft, blocks: draft.blocks.map((x, k) => (k === i ? b : x)) });
  const badPace = draft.blocks.some((b) => b.work.target === "pace" && (!parsePace(b.work.paceLo) || !parsePace(b.work.paceHi)));

  async function saveLib() {
    const id = draft.id || newId("wo");
    const entry = { id, name: draft.name || "My workout", draft: { ...draft, id }, workout: { ...workout, id } };
    const list = ctx.prefs.workouts.filter((w) => w.id !== id);
    const prefs = await saveRunPrefs({ workouts: [entry, ...list].slice(0, 30) });
    setCtx({ ...ctx, prefs });
    setDraft({ ...draft, id });
    setMsg({ ok: true, text: "Saved to your library." });
  }

  async function delLib(id) {
    const prefs = await saveRunPrefs({ workouts: ctx.prefs.workouts.filter((w) => w.id !== id) });
    setCtx({ ...ctx, prefs });
    if (draft.id === id) setDraft({ ...draft, id: null });
    setConfirmDel(null);
  }

  async function sendToWatch() {
    try {
      const where = await exportWorkoutFit({ name: draft.name || "Skid Marks run", steps: stepsToFitSteps(workout.steps) });
      setMsg({ ok: true, text: `Saved to ${where.label}: ${where.path}`, help: true });
    } catch (e) {
      setMsg({ ok: false, text: (e && e.message) || "The app cannot make the file." });
    }
  }

  return (
    <div data-testid="builder-screen" style={S.page()}>
      <TopBar title="Workout builder" onBack={nav.back} />
      <div style={S.card()}>
        <label style={{ display: "block" }}>
          <div style={{ ...S.label(), marginBottom: 4 }}>Name</div>
          <input data-testid="builder-name" value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ ...S.field(), fontFamily: "inherit" }} />
        </label>
        <div data-testid="builder-preview" style={{ marginTop: 12 }}>
          <Ribbon segments={segs} />
        </div>
        <div data-testid="builder-totals" style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text, marginTop: 6 }}>
          About {engine.fmtTime(total)} · about {engine.fmtKm(km, units)}
        </div>
        <div style={{ ...S.body(), fontSize: 11.5 }}>The distance of time steps is an estimate from your easy and threshold paces.</div>
      </div>

      <div style={S.card()}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <NumField label="Warm-up (min)" value={draft.warmMin} onChange={(v) => setDraft({ ...draft, warmMin: v })} step="1" min="0" testId="builder-warm" />
          <NumField label="Cool-down (min)" value={draft.coolMin} onChange={(v) => setDraft({ ...draft, coolMin: v })} step="1" min="0" testId="builder-cool" />
        </div>
      </div>

      {draft.blocks.map((b, i) => (
        <div key={i} data-testid="builder-block" style={S.card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={S.title()}>Block {i + 1}</div>
            {draft.blocks.length > 1 && (
              <button aria-label="Remove block" onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, k) => k !== i) })} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim }}>
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <NumField label="Repeats" value={b.times} onChange={(v) => setBlock(i, { ...b, times: v })} step="1" min="1" inputMode="numeric" testId={`block-${i}-times`} />
          <div style={{ ...S.label(), margin: "12px 0 6px", color: COLORS.accent }}>Hard part</div>
          <PartEditor part={b.work} isWork units={units} onChange={(work) => setBlock(i, { ...b, work })} testId={`block-${i}-work`} />
          <div style={{ ...S.label(), margin: "12px 0 6px" }}>Recovery (easy jog or walk; 0 for none)</div>
          <PartEditor part={b.rest} units={units} onChange={(rest) => setBlock(i, { ...b, rest })} testId={`block-${i}-rest`} />
        </div>
      ))}
      <div style={{ padding: "0 20px 12px" }}>
        <Btn onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, newBlock()] })} disabled={draft.blocks.length >= 6} testId="add-block">
          <Plus size={16} /> Add a block
        </Btn>
      </div>

      {badPace && (
        <div style={{ padding: "0 20px 12px" }}>
          <Note tone="warn">Type each pace as minutes and seconds, for example 4:15.</Note>
        </div>
      )}
      <div style={{ padding: "0 20px", display: "grid", gap: 10 }}>
        <Btn kind="primary" onClick={() => nav.go("run:record", { mode: "custom", workout: { ...workout, title: draft.name || "My workout" } })} disabled={badPace} testId="builder-use">
          Use in a run
        </Btn>
        <Btn onClick={saveLib} disabled={badPace} testId="builder-save">
          Save to my library
        </Btn>
        <Btn onClick={sendToWatch} disabled={badPace} testId="builder-watch">
          <Watch size={16} /> Send to watch (FIT file)
        </Btn>
        {msg && (
          <Note tone={msg.ok ? "ok" : "warn"} testId="builder-msg">
            <div style={{ color: COLORS.text }}>{msg.text}</div>
            {msg.help && (
              <div style={{ marginTop: 6 }}>
                Garmin: connect the watch to a computer with a cable. Copy the file to the folder GARMIN/NEWFILES. Disconnect the watch. The workout shows in Training, Workouts. Other watches: open the file with the watch app on the phone, if the app can import FIT workouts.
              </div>
            )}
          </Note>
        )}
      </div>

      <div style={S.section()}>My library</div>
      <div style={S.card()}>
        {ctx.prefs.workouts.length === 0 && <div style={S.body()}>No saved workouts yet.</div>}
        {ctx.prefs.workouts.map((w) => (
          <div key={w.id} data-testid="library-item" style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${COLORS.line}`, minHeight: 48 }}>
            <button onClick={() => setDraft({ ...newDraft(), ...w.draft })} style={{ flex: 1, textAlign: "left", minHeight: 44, color: COLORS.text, fontSize: 14 }}>
              {w.name}
              {draft.id === w.id && <span style={{ ...S.label(), color: COLORS.accent }}> · open</span>}
            </button>
            <button aria-label={`Delete ${w.name}`} onClick={() => setConfirmDel(w.id)} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim }}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        {confirmDel && <Confirm text="Delete this workout from your library?" yes="Delete" onYes={() => delLib(confirmDel)} onNo={() => setConfirmDel(null)} testId="library-delete-confirm" />}
      </div>
    </div>
  );
}
