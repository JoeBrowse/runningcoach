import { useState } from "react";
import { ChevronRight, Plus, Check, Trash2, X, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { EXERCISES } from "../data/exercises.js";
import { PROGRAMME_PRESETS, PROGRAMME_LENGTHS } from "../data/programmes.js";
import { registerCustomExercise } from "../lib/exerciseLibrary.js";
import { makeProgrammeDays } from "../lib/programmes.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { hexToRgba, COLORS } from "../theme.js";
import { ExerciseSearchPicker } from "../components/ExercisePicker.jsx";
import { NewExerciseForm } from "../components/NewExerciseForm.jsx";
import { TopBar } from "../components/TopBar.jsx";
import { WizardSteps } from "../components/WizardSteps.jsx";

export function ProgrammeBuilderScreen({ onBack, onCreate, onGuided }) {
  const [step, setStep] = useState(0); // 0 split · 1 exercises · 2 length · 3 name
  const [presetKey, setPresetKey] = useState(null);
  const [days, setDays] = useState([]);
  const [weeks, setWeeks] = useState(6);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState(0);
  const [addTo, setAddTo] = useState(null); // day index being added to
  const [addPanel, setAddPanel] = useState("db"); // "db" | "new"
  const [, forceRefresh] = useState(0);

  function choosePreset(preset) {
    setPresetKey(preset.key);
    setName(preset.key === "custom" ? "My Programme" : preset.name);
    const built = makeProgrammeDays(preset);
    setDays(built.length ? built : [{ key: `d0-${Math.random().toString(36).slice(2, 7)}`, name: "Day 1", muscles: [], exercises: [] }]);
    setExpanded(0);
    setStep(1);
  }

  function renameDay(i, value) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, name: value } : d)));
  }
  function removeExercise(dayIdx, exId) {
    setDays((prev) => prev.map((d, idx) => (idx === dayIdx ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)));
  }
  // Appended rather than sorted in: the arrows below make the order yours,
  // and a type sort would keep undoing it.
  function addExercise(dayIdx, ex, muscle) {
    setDays((prev) => prev.map((d, idx) => {
      if (idx !== dayIdx) return d;
      if (d.exercises.some((e) => e.id === ex.id)) return d;
      return { ...d, exercises: [...d.exercises, { id: ex.id, name: ex.name, muscle, type: ex.type }] };
    }));
  }
  function moveExercise(dayIdx, index, direction) {
    setDays((prev) => prev.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const target = index + direction;
      if (target < 0 || target >= d.exercises.length) return d;
      const next = [...d.exercises];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, exercises: next };
    }));
  }
  // A new exercise goes into the database proper, not just this programme, so
  // it is there next time and rankable in the Exercise Database like any other.
  async function saveNewExercise(dayIdx, ex) {
    registerCustomExercise(ex);
    const saved = (await safeGet("custom-exercises")) || [];
    await safeSet("custom-exercises", [...saved, ex]);
    addExercise(dayIdx, ex, ex.muscle);
    setAddPanel("db");
    forceRefresh((n) => n + 1);
  }
  function addDay() {
    setDays((prev) => [...prev, { key: `d${prev.length}-${Math.random().toString(36).slice(2, 7)}`, name: `Day ${prev.length + 1}`, muscles: [], exercises: [] }]);
    setExpanded(days.length);
  }
  function removeDay(i) {
    setDays((prev) => prev.filter((_, idx) => idx !== i));
  }

  const validDays = days.filter((d) => d.exercises.length > 0);
  const canContinueExercises = validDays.length > 0;

  function create() {
    const programme = {
      id: `prog-${Date.now()}`,
      name: name.trim() || "My Programme",
      presetKey,
      createdAt: new Date().toISOString(),
      weeks,
      days: validDays.map((d) => ({
        key: d.key,
        name: d.name.trim() || "Day",
        muscles: [...new Set(d.exercises.map((e) => e.muscle))],
        exercises: d.exercises,
      })),
      log: [],
    };
    onCreate(programme);
  }

  const stepLabels = ["Split", "Exercises", "Length", "Name"];

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="New Programme" onBack={step === 0 ? onBack : () => setStep(step - 1)} />

      <WizardSteps labels={stepLabels} step={step} />

      <div style={{ padding: "0 20px" }}>
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 2 }}>Choose a split to base your programme on. You can tweak everything next.</div>
            <button
              onClick={onGuided}
              style={{ textAlign: "left", background: hexToRgba(COLORS.accent, 0.1), border: `1.5px solid ${COLORS.accent}`, borderRadius: 14, padding: 14 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 15.5, textTransform: "uppercase" }}>
                  <Sparkles size={16} /> Guided
                </span>
                <span style={{ color: COLORS.accent, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", border: `1px solid ${COLORS.accent}`, borderRadius: 999, padding: "2px 7px" }}>
                  Recommended
                </span>
              </div>
              <div style={{ color: COLORS.text, fontSize: 12, marginTop: 3 }}>Answer a few quick questions and Iron Log builds a split for you — accept it or tweak it yourself.</div>
            </button>
            {PROGRAMME_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => choosePreset(p)}
                style={{ textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15.5, textTransform: "uppercase" }}>{p.name}</span>
                  {p.days.length > 0 && <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{p.days.length} days</span>}
                </div>
                <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 3 }}>{p.blurb}</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 12 }}>
              Set the exercises for each workout. Add, remove, rename days — this is your template.
            </div>
            {days.map((day, di) => {
              const isOpen = expanded === di;
              return (
                <div key={day.key} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px" }}>
                    <button onClick={() => setExpanded(isOpen ? -1 : di)} style={{ flexShrink: 0, color: COLORS.textDim }}>
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <input
                      value={day.name}
                      onChange={(e) => renameDay(di, e.target.value)}
                      style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}
                    />
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{day.exercises.length} ex</span>
                    {days.length > 1 && (
                      <button onClick={() => removeDay(di)} style={{ color: COLORS.textDim, flexShrink: 0 }}><Trash2 size={14} /></button>
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ padding: "0 14px 14px" }}>
                      {day.exercises.length === 0 && (
                        <div style={{ color: COLORS.textDim, fontSize: 12.5, padding: "4px 0 10px" }}>No exercises yet — add some below.</div>
                      )}
                      {/* The order here is the order you train in, so it is
                          yours to set — same up/down pair the live workout
                          uses, rather than a drag handle that fights the
                          page scroll on a phone. */}
                      {day.exercises.map((ex, ei) => (
                        <div key={ex.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: COLORS.surfaceRaised, borderRadius: 8, marginBottom: 6 }}>
                          <div style={{ width: 24, flexShrink: 0, borderRadius: 6, border: `1px solid ${COLORS.line}`, display: "flex", flexDirection: "column", overflow: "hidden", alignSelf: "stretch" }}>
                            <button
                              onClick={() => moveExercise(di, ei, -1)}
                              disabled={ei === 0}
                              title="Move up"
                              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.line}`, color: ei === 0 ? COLORS.line : COLORS.textDim, padding: 0 }}
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              onClick={() => moveExercise(di, ei, 1)}
                              disabled={ei === day.exercises.length - 1}
                              title="Move down"
                              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: ei === day.exercises.length - 1 ? COLORS.line : COLORS.textDim, padding: 0 }}
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: COLORS.text, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.name}</div>
                            <div style={{ color: COLORS.textDim, fontSize: 11 }}>{ex.muscle}</div>
                          </div>
                          <button onClick={() => removeExercise(di, ex.id)} title={`Remove ${ex.name}`} style={{ color: COLORS.textDim, flexShrink: 0 }}><X size={15} /></button>
                        </div>
                      ))}

                      {addTo === di ? (
                        <div style={{ marginTop: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>Add exercise</span>
                            <button onClick={() => { setAddTo(null); setAddPanel("db"); }} style={{ color: COLORS.textDim }}><X size={15} /></button>
                          </div>
                          {/* Building a programme is exactly when you notice
                              your gym has a machine the database does not, so
                              the form is here rather than only mid-workout. */}
                          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                            {[["db", "From Database"], ["new", "New Exercise"]].map(([key, label]) => {
                              const active = addPanel === key;
                              return (
                                <button
                                  key={key}
                                  onClick={() => setAddPanel(key)}
                                  style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? hexToRgba(COLORS.accent, 0.14) : "transparent", color: active ? COLORS.accent : COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4 }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {addPanel === "new" ? (
                            <NewExerciseForm
                              muscles={Object.keys(EXERCISES)}
                              defaultMuscle={day.muscles && day.muscles.length ? day.muscles[0] : Object.keys(EXERCISES)[0]}
                              onSave={(ex) => saveNewExercise(di, ex)}
                              onCancel={() => setAddPanel("db")}
                            />
                          ) : (
                            <ExerciseSearchPicker
                              key={day.exercises.length}
                              autoFocus
                              surface={COLORS.surface}
                              maxHeight={320}
                              excludeIds={new Set(day.exercises.map((e) => e.id))}
                              onAdd={(ex, m) => addExercise(di, ex, m)}
                            />
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddTo(di); setAddPanel("db"); }}
                          style={{ width: "100%", marginTop: 4, background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.textDim, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Plus size={13} /> Add exercise
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={addDay}
              style={{ width: "100%", background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 12, padding: "11px 0", color: COLORS.textDim, fontSize: 13, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 }}
            >
              <Plus size={14} /> Add day
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canContinueExercises}
              style={{ width: "100%", background: canContinueExercises ? COLORS.accent : COLORS.surfaceRaised, border: "none", borderRadius: 12, padding: "14px 0", color: canContinueExercises ? COLORS.onAccent : COLORS.textDim, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Next: length
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 12 }}>How long will you run this programme?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {PROGRAMME_LENGTHS.map((opt) => {
                const active = weeks === opt.weeks;
                return (
                  <button
                    key={opt.weeks}
                    onClick={() => setWeeks(opt.weeks)}
                    style={{ textAlign: "left", background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: 14 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: active ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15.5, textTransform: "uppercase" }}>{opt.label}</span>
                      {opt.recommended && <span style={{ color: COLORS.accent, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", border: `1px solid ${COLORS.accent}`, borderRadius: 999, padding: "2px 7px" }}>Recommended</span>}
                    </div>
                    <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 3 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 12.5, marginBottom: 16, textAlign: "center" }}>
              {weeks} weeks × {validDays.length} workouts ≈ <span style={{ color: COLORS.text }}>{weeks * validDays.length} sessions</span>
            </div>
            <button onClick={() => setStep(3)} style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 12, padding: "14px 0", color: COLORS.onAccent, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Next: name
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 10 }}>Name your programme.</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", color: COLORS.text, fontSize: 15, marginBottom: 16 }}
            />
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Summary</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: COLORS.textDim }}>Length</span><span style={{ color: COLORS.text }}>{weeks} weeks</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: COLORS.textDim }}>Workouts</span><span style={{ color: COLORS.text }}>{validDays.length} per cycle</span>
              </div>
              {validDays.map((d) => (
                <div key={d.key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${COLORS.line}`, fontSize: 12.5 }}>
                  <span style={{ color: COLORS.text }}>{d.name}</span>
                  <span style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{d.exercises.length} ex</span>
                </div>
              ))}
            </div>
            <button onClick={create} style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 12, padding: "16px 0", color: COLORS.onAccent, fontSize: 15, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Check size={18} /> Create Programme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
