import { useState } from "react";
import { ChevronRight, Plus, RotateCcw, Trash2, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { EXERCISES } from "../data/exercises.js";
import { registerCustomExercise, HIDDEN_EXERCISE_IDS, setExerciseHidden, visibleExercises, markMuscleManuallyOrdered, saveMuscleOrder, editableForm, saveExerciseEdit, revertExerciseEdit, isEdited, deleteCustomExercise } from "../lib/exerciseLibrary.js";
import { exerciseMatchesQuery } from "../lib/exercises.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { NewExerciseForm } from "../components/NewExerciseForm.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   EXERCISE DATABASE
   Two levels, drilled into from Home: muscle groups, then the movements
   in that group. Inside a group the user can reorder (which genuinely
   re-ranks what the app auto-picks first — EXERCISES[muscle] order is the
   priority list pickSmartForMuscle walks), remove, restore, and add their
   own.
--------------------------------------------------------------- */

function ExerciseRowControls({ onUp, onDown, canUp, canDown, onEdit, onRemove, removed, onRestore }) {
  const box = (enabled) => ({
    width: 30,
    height: 30,
    borderRadius: 8,
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    color: enabled ? COLORS.text : COLORS.line,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });
  if (removed) {
    return (
      <button onClick={onRestore} style={{ ...box(true), width: "auto", padding: "0 10px", color: COLORS.accent, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", gap: 5 }}>
        <RotateCcw size={12} /> Restore
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <button onClick={canUp ? onUp : undefined} disabled={!canUp} style={box(canUp)} title="Move up"><ChevronUp size={15} /></button>
      <button onClick={canDown ? onDown : undefined} disabled={!canDown} style={box(canDown)} title="Move down"><ChevronDown size={15} /></button>
      <button onClick={onEdit} style={box(true)} title="Edit"><Pencil size={14} /></button>
      <button onClick={onRemove} style={{ ...box(true), color: COLORS.bad }} title="Remove"><Trash2 size={14} /></button>
    </div>
  );
}

export function ExerciseDatabaseScreen({ onBack }) {
  const [muscle, setMuscle] = useState(null);
  const [query, setQuery] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [, forceRefresh] = useState(0);
  const refresh = () => forceRefresh((n) => n + 1);

  const muscles = Object.keys(EXERCISES).filter((m) => m !== "Mobility");

  // Moves an exercise one place up or down the muscle's priority ranking.
  // The step is measured against the rows currently on screen rather than
  // the raw array, so a removed exercise sitting between two visible ones
  // doesn't swallow a press of the button — the exercise is lifted out and
  // reinserted where its visible neighbour sits.
  async function moveExercise(m, shownIds, id, direction) {
    const all = EXERCISES[m] || [];
    const shownAt = shownIds.indexOf(id);
    const neighbourId = shownIds[shownAt + direction];
    if (shownAt < 0 || neighbourId === undefined) return;
    const next = all.filter((e) => e.id !== id);
    const target = next.findIndex((e) => e.id === neighbourId);
    if (target < 0) return;
    next.splice(direction < 0 ? target : target + 1, 0, all.find((e) => e.id === id));
    EXERCISES[m] = next;
    await saveMuscleOrder(m);
    await markMuscleManuallyOrdered(m);
    refresh();
  }

  async function remove(ex, m) {
    if (ex.custom) await deleteCustomExercise(ex.id, m);
    else await setExerciseHidden(ex.id, true);
    refresh();
  }
  async function restore(ex) {
    await setExerciseHidden(ex.id, false);
    refresh();
  }

  async function handleSaveCustom(ex) {
    registerCustomExercise({ ...ex, custom: true });
    const prev = (await safeGet("custom-exercises")) || [];
    await safeSet("custom-exercises", [...prev, { ...ex, custom: true }]);
    await saveMuscleOrder(ex.muscle);
    setAdding(false);
    refresh();
  }

  async function handleSaveEdit(ex) {
    // The muscle can be changed in the form, so the row may be leaving the
    // list that is currently on screen. Follow it rather than dropping the
    // user on a list their exercise just left.
    const movedTo = ex.muscle;
    await saveExerciseEdit(ex.id, ex);
    setEditingId(null);
    if (movedTo !== muscle) setMuscle(movedTo);
    refresh();
  }

  async function handleRevert(id) {
    await revertExerciseEdit(id);
    setEditingId(null);
    refresh();
  }

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 12,
    padding: "11px 12px",
  };

  /* ---- Level 1: muscle groups, or search results across all of them ---- */
  if (!muscle) {
    // Browsing by body part only works if you already know which body part
    // the app filed something under, and it silently fails for anyone whose
    // word for a movement is not the one on the entry — a press-up is a
    // Push-Up here. Search matches aliases as well as names.
    const q = query.trim();
    const results = q
      ? muscles
          .map((m) => ({ muscle: m, matches: visibleExercises(m).filter((e) => exerciseMatchesQuery(e, q)) }))
          .filter((g) => g.matches.length)
      : null;

    return (
      <div style={{ paddingBottom: 40 }}>
        <TopBar title="Exercise Database" onBack={onBack} />
        <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
          Every exercise Iron Log knows, by body part. Reorder them to change which ones the app suggests first, edit any of them, remove the ones you can’t or won’t do, and add your own.
        </div>
        <div style={{ padding: "0 20px 12px" }}>
          <input
            type="text"
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", color: COLORS.text, fontSize: 13.5 }}
          />
        </div>

        {results && (
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {results.length === 0 && (
              <div style={{ color: COLORS.textDim, fontSize: 13, padding: "8px 2px" }}>
                Nothing matches “{q}”. Open a body part below to add it yourself.
              </div>
            )}
            {results.map((g) => (
              <div key={g.muscle}>
                <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.2, textTransform: "uppercase", margin: "6px 2px 6px" }}>
                  {g.muscle}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.matches.map((e) => (
                    <button key={e.id} onClick={() => { setQuery(""); setMuscle(g.muscle); setShowRemoved(false); }} style={{ ...rowStyle, textAlign: "left" }}>
                      <span style={{ color: COLORS.text, fontSize: 13.5 }}>{e.name}</span>
                      <ChevronRight size={15} color={COLORS.accent} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8, ...(results ? { display: "none" } : {}) }}>
          {muscles.map((m, mi) => {
            const visible = visibleExercises(m).length;
            const hidden = (EXERCISES[m] || []).length - visible;
            return (
              <button key={m} data-tour={mi === 0 ? "exercise-db-list" : undefined} onClick={() => { setMuscle(m); setShowRemoved(false); }} style={{ ...rowStyle, textAlign: "left" }}>
                <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>{m}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textDim, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                  {visible}{hidden > 0 ? ` (+${hidden} removed)` : ""}
                  <ChevronRight size={15} color={COLORS.accent} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---- Level 2: every exercise in this muscle group, one flat ranking ---- */
  const all = EXERCISES[muscle] || [];
  const shown = showRemoved ? all : all.filter((e) => !HIDDEN_EXERCISE_IDS.has(e.id));
  const shownIds = shown.map((e) => e.id);
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title={muscle} onBack={() => setMuscle(null)} />
      <div style={{ padding: "0 20px 14px", color: COLORS.textDim, fontSize: 12.5 }}>
        Every variation, in one ranking. Top of the list gets suggested first. Tap the pencil to change a name, its muscles or its cue — your logged sets stay attached.
      </div>

      {adding && (
        <div style={{ padding: "0 20px 12px" }}>
          <NewExerciseForm
            muscles={muscles}
            defaultMuscle={muscle}
            onSave={handleSaveCustom}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((ex, i) => {
          const removed = HIDDEN_EXERCISE_IDS.has(ex.id);
          if (editingId === ex.id) {
            return (
              <div key={ex.id}>
                <NewExerciseForm
                  muscles={muscles}
                  initial={editableForm(ex)}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
                {!ex.custom && isEdited(ex.id) && (
                  <button
                    onClick={() => handleRevert(ex.id)}
                    style={{ display: "block", margin: "-4px 0 12px", background: "transparent", border: "none", color: COLORS.textDim, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    <RotateCcw size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                    Revert to Iron Log&rsquo;s version
                  </button>
                )}
              </div>
            );
          }
          const edited = !ex.custom && isEdited(ex.id);
          return (
            <div key={ex.id} style={{ ...rowStyle, opacity: removed ? 0.5 : 1 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ color: COLORS.text, fontSize: 13, minWidth: 0 }}>{ex.name}</span>
                {(ex.custom || edited) && (
                  <span style={{ color: COLORS.textDim, fontSize: 9.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
                    {ex.custom ? "Yours" : "Edited"}
                  </span>
                )}
              </span>
              <ExerciseRowControls
                canUp={i > 0}
                canDown={i < shown.length - 1}
                onUp={() => moveExercise(muscle, shownIds, ex.id, -1)}
                onDown={() => moveExercise(muscle, shownIds, ex.id, 1)}
                onEdit={() => { setAdding(false); setEditingId(ex.id); }}
                onRemove={() => remove(ex, muscle)}
                removed={removed}
                onRestore={() => restore(ex)}
              />
            </div>
          );
        })}
      </div>

      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <button onClick={() => setShowRemoved((v) => !v)} style={{ color: COLORS.textDim, background: "transparent", border: "none", fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {showRemoved ? "Hide removed" : "Show removed"}
        </button>
        {!adding && (
          <button onClick={() => { setEditingId(null); setAdding(true); }} style={{ display: "flex", alignItems: "center", gap: 5, color: COLORS.accent, background: "transparent", border: "none", fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
            <Plus size={13} /> Add Exercise
          </button>
        )}
      </div>
    </div>
  );
}
