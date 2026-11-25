import { useState, useEffect } from "react";
import { ChevronRight, Plus, Check, Trash2, Pencil, X } from "lucide-react";
import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { sortByAt } from "../lib/dates.js";
import { methodsFor, defaultMethodFor, hasMethodChoice, isCableExercise, getCableGrips, isMachineExercise } from "../lib/exercises.js";
import { setHasData } from "../lib/history.js";
import { capHistory } from "../lib/settings.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { ExerciseSearchPicker } from "../components/ExercisePicker.jsx";
import { SessionSummary } from "../components/SessionSummary.jsx";
import { StravaShareButton } from "../components/StravaShareButton.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   WORKOUT HISTORY
--------------------------------------------------------------- */

export function HistoryScreen({ onBack, settings }) {
  const [rawSessions, setRawSessions] = useState([]); // chronological, as stored
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [addExOpen, setAddExOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hist = (await safeGet("workout-history")) || [];
      if (!cancelled) {
        setRawSessions(hist);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = [...rawSessions].reverse();

  function startEdit(s) {
    setEditingId(s.id);
    setAddExOpen(false);
    setEditDraft(s.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((st) => ({ ...st })) })));
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setAddExOpen(false);
  }
  // Machine brand / grip, added after the fact. Recording it later is the
  // normal case: you notice it matters only once two gyms' numbers stop
  // lining up.
  function updateDraftMeta(exIdx, field, value) {
    setEditDraft((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, [field]: value } : ex)));
  }
  function updateDraftSet(exIdx, setIdx, field, value) {
    setEditDraft((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.map((st, j) => (j === setIdx ? { ...st, [field]: value } : st)) } : ex)));
  }
  function addDraftSet(exIdx) {
    setEditDraft((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, sets: [...ex.sets, { weight: "", reps: "" }] } : ex)));
  }
  function removeDraftSet(exIdx, setIdx) {
    setEditDraft((prev) => prev.map((ex, i) => (i === exIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex)));
  }
  function removeDraftExercise(exIdx) {
    setEditDraft((prev) => prev.filter((_, i) => i !== exIdx));
  }
  function addDraftExercise(ex, muscle) {
    setEditDraft((prev) => {
      if (prev.some((e) => e.id === ex.id)) return prev; // already in this session
      return [...prev, { id: ex.id, name: ex.name, muscle: muscle || ex.muscle, type: ex.type, sets: [{ weight: "", reps: "" }] }];
    });
    setAddExOpen(false);
  }

  async function saveEdit(session) {
    // Clean: drop empty sets (keep a set that only has drops), then drop
    // exercises with nothing logged. This also removes an added-but-unfilled
    // exercise automatically.
    const cleaned = editDraft
      .map((ex) => ({
        ...ex,
        sets: (ex.sets || []).filter(setHasData),
      }))
      .filter((ex) => ex.sets.length > 0);

    const total = cleaned.length;
    const updatedRaw = rawSessions
      .map((s) => (s.id === session.id ? { ...s, exercises: cleaned } : s))
      .filter((s) => s.exercises.length > 0);
    await safeSet("workout-history", updatedRaw);

    // Reconcile per-exercise history for every exercise that was in the session
    // before or after the edit (added, removed, or changed).
    const matchesSession = (h) => (session.at && h.at ? h.at === session.at : h.date === session.date);
    const ids = new Set([...session.exercises.map((e) => e.id), ...cleaned.map((e) => e.id)]);
    for (const id of ids) {
      const prevHist = (await safeGet(`ex-history:${id}`)) || [];
      const idx = cleaned.findIndex((e) => e.id === id);
      if (idx === -1) {
        await safeSet(`ex-history:${id}`, prevHist.filter((h) => !matchesSession(h)));
        continue;
      }
      const ex = cleaned[idx];
      // Written unconditionally so clearing a brand actually removes it,
      // rather than leaving the previous value behind in the merge below.
      const patch = {
        date: session.date,
        at: session.at || session.date,
        sets: ex.sets,
        order: idx + 1,
        total,
        brand: ex.brand || null,
        grip: ex.grip || null,
        method: ex.method || null,
        notes: ex.notes || null,
      };
      const existingIdx = prevHist.findIndex(matchesSession);
      const nextHist = existingIdx === -1
        ? capHistory(sortByAt([...prevHist, patch]))
        : prevHist.map((h, i) => (i === existingIdx ? { ...h, ...patch } : h));
      await safeSet(`ex-history:${id}`, nextHist);
    }

    setRawSessions(updatedRaw);
    setEditingId(null);
    setEditDraft(null);
    setAddExOpen(false);
  }

  async function deleteSession(session) {
    if (!window.confirm(`Delete this ${session.split} workout from ${session.date}? You cannot undo this action.`)) return;
    const updatedRaw = rawSessions.filter((s) => s.id !== session.id);
    await safeSet("workout-history", updatedRaw);
    for (const ex of session.exercises) {
      const prevHist = (await safeGet(`ex-history:${ex.id}`)) || [];
      const newHist = prevHist.filter((h) => h.date !== session.date);
      await safeSet(`ex-history:${ex.id}`, newHist);
    }
    setRawSessions(updatedRaw);
    setExpanded(null);
  }

  return (
    <div>
      <TopBar title="Workout History" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        This list shows all logged workouts. The most recent workout is first.
      </div>
      <div style={{ padding: "10px 20px 40px" }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30, fontSize: 13.5 }}>
            There are no workouts in the log. When you finish a workout, it shows here.
          </div>
        ) : (
          sessions.map((s) => {
            const muscles = [...new Set(s.exercises.map((e) => e.muscle))];
            const isOpen = expanded === s.id;
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 10 }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
                >
                  <SessionSummary session={s} muscles={muscles} />
                  <ChevronRight size={18} color={COLORS.textDim} style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />
                </button>

                {isOpen && !isEditing && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
                    {s.exercises.map((ex) => (
                      <div key={ex.id} style={{ marginBottom: 10 }}>
                        <div style={{ color: COLORS.text, fontSize: 13.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", marginBottom: 3 }}>
                          {ex.name}
                        </div>
                        <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                          {ex.sets.map((set, i) => `${set.weight || "–"}×${set.reps || "–"}`).join("  ·  ")}
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => startEdit(s)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => deleteSession(s)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.bad, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                    {settings.stravaShare && (
                      <div style={{ marginTop: 8 }}>
                        <StravaShareButton session={s} unit={settings.weightUnit} compact />
                      </div>
                    )}
                  </div>
                )}

                {isOpen && isEditing && editDraft && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
                    {editDraft.map((ex, exIdx) => (
                      <div key={ex.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ color: COLORS.text, fontSize: 13.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                            {ex.name}
                          </span>
                          <button
                            onClick={() => removeDraftExercise(exIdx)}
                            style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                          >
                            <X size={12} /> Remove
                          </button>
                        </div>
                        {(() => {
                          const full = ALL_EXERCISES_BY_ID[ex.id] || ex;
                          if (settings.appMode !== "advanced") return null;
                          const chosen = ex.method || defaultMethodFor(ex.id);
                          const showMethod = hasMethodChoice(ex.id);
                          if (!showMethod && !isMachineExercise(full, chosen)) return null;
                          const isCable = isCableExercise(full, chosen);
                          const showBrand = isMachineExercise(full, chosen);
                          const fieldStyle = { flex: 1, minWidth: 0, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 9px", color: COLORS.text, fontFamily: "system-ui, sans-serif", fontSize: 12.5 };
                          const selectStyle = { ...fieldStyle, appearance: "none", WebkitAppearance: "none" };
                          return (
                            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                              {showMethod && (
                                <select
                                  value={chosen || ""}
                                  onChange={(e) => updateDraftMeta(exIdx, "method", e.target.value)}
                                  style={selectStyle}
                                >
                                  {methodsFor(ex.id).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              )}
                              {showBrand && (
                              <input
                                type="text"
                                placeholder="Machine brand"
                                value={ex.brand || ""}
                                onChange={(e) => updateDraftMeta(exIdx, "brand", e.target.value)}
                                style={fieldStyle}
                              />
                              )}
                              {showBrand && isCable && (
                                <select
                                  value={ex.grip || ""}
                                  onChange={(e) => updateDraftMeta(exIdx, "grip", e.target.value)}
                                  style={selectStyle}
                                >
                                  <option value="">Grip…</option>
                                  {getCableGrips(full).map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })()}
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                            <div style={{ width: 16, color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{setIdx + 1}</div>
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="wt"
                              value={set.weight}
                              onChange={(e) => updateDraftSet(exIdx, setIdx, "weight", e.target.value)}
                              style={{ flex: 1, minWidth: 0, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                            />
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="reps"
                              value={set.reps}
                              onChange={(e) => updateDraftSet(exIdx, setIdx, "reps", e.target.value)}
                              style={{ flex: 1, minWidth: 0, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                            />
                            <button
                              onClick={() => removeDraftSet(exIdx, setIdx)}
                              style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addDraftSet(exIdx)}
                          style={{ width: "100%", background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 8, padding: "7px 0", color: COLORS.textDim, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Plus size={12} /> Add set
                        </button>
                      </div>
                    ))}

                    {/* Add an exercise you forgot to log for this past session */}
                    {!addExOpen ? (
                      <button
                        onClick={() => setAddExOpen(true)}
                        style={{ width: "100%", background: "transparent", border: `1px dashed ${COLORS.accent}`, borderRadius: 10, padding: "10px 0", color: COLORS.accent, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 }}
                      >
                        <Plus size={13} /> Add forgotten exercise
                      </button>
                    ) : (
                      <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>Add exercise</span>
                          <button onClick={() => { setAddExOpen(false); }} style={{ background: "transparent", border: "none", color: COLORS.textDim }}>
                            <X size={15} />
                          </button>
                        </div>
                        <ExerciseSearchPicker
                          surface={COLORS.surface}
                          maxHeight={320}
                          excludeIds={new Set(editDraft.map((e) => e.id))}
                          onAdd={(ex, m) => addDraftExercise(ex, m)}
                        />
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => saveEdit(s)}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.accent, border: "none", borderRadius: 8, padding: "10px 0", color: COLORS.onAccent, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                      >
                        <Check size={13} /> Save Changes
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 0", color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
