import { useState } from "react";
import { ChevronRight, Plus, ChevronDown } from "lucide-react";
import { EXERCISES } from "../data/exercises.js";
import { visibleExercises } from "../lib/exerciseLibrary.js";
import { exerciseMatchesQuery } from "../lib/exercises.js";
import { COLORS } from "../theme.js";

// A single row in an "add exercise" list — renders as a plain add button
// for a standalone exercise, or as a "N versions" row for a variant family
// that opens the tile sheet above when tapped.
function ExercisePickerRow({ exercise, onAdd, addIcon, buttonStyle }) {
  return (
    <button onClick={() => onAdd(exercise)} style={buttonStyle}>
      <span style={{ color: COLORS.text, fontSize: 13 }}>{exercise.name}</span>
      {addIcon}
    </button>
  );
}

// Collapsed-by-default body-part section used by every "add exercise"
// picker — keeps a long exercise database from turning into one giant
// scrolling list. isOpen is driven by the parent (collapsed unless the
// user has tapped it open, or a search query is active and this muscle
// has matches).
export function MuscleAccordion({ muscle, count, isOpen, onToggle, children }) {
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surfaceRaised, border: "none", padding: "11px 12px" }}
      >
        <span style={{ color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
          {muscle}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          {count}
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// The "search the database and add one exercise" panel, shared by the
// programme day editor, the mid-workout add button and the history editor.
// All three had their own copy of this — same search box, same body-part
// accordions, same grouped rows — differing only in surface colour and what
// they did with the pick.
//
// Search text and which accordions are open live in here rather than in the
// callers: every site renders this conditionally, so unmounting the panel
// resets both, which is the behaviour each caller was hand-rolling anyway.
// Picking a variant family is delegated upward, since the callers own the
// sheet and need their own context (which day, which draft) to add to it.
export function ExerciseSearchPicker({ excludeIds, onAdd, surface, autoFocus, maxHeight }) {
  const [query, setQuery] = useState("");
  const [openMuscles, setOpenMuscles] = useState(new Set());
  const bg = surface || COLORS.surfaceRaised;
  const q = query.trim().toLowerCase();
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: bg,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "9px 12px",
    textAlign: "left",
  };
  const toggle = (m) =>
    setOpenMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  const sections = Object.keys(EXERCISES)
    .map((m) => ({ muscle: m, options: visibleExercises(m).filter((e) => !excludeIds.has(e.id) && exerciseMatchesQuery(e, q)) }))
    .filter((sec) => sec.options.length > 0);

  return (
    <>
      <input
        type="text"
        autoFocus={autoFocus}
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: bg, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 12px", color: COLORS.text, fontSize: 13, marginBottom: 12 }}
      />
      <div style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}>
        {sections.length === 0 ? (
          <div style={{ color: COLORS.textDim, fontSize: 12.5, padding: "6px 2px" }}>No matches.</div>
        ) : (
          sections.map(({ muscle, options }) => (
            <div key={muscle} style={{ marginBottom: 8 }}>
              <MuscleAccordion muscle={muscle} count={options.length} isOpen={q ? true : openMuscles.has(muscle)} onToggle={() => toggle(muscle)}>
                {options.map((ex) => (
                  <ExercisePickerRow
                    key={ex.id}
                    exercise={ex}
                    buttonStyle={rowStyle}
                    addIcon={<Plus size={14} color={COLORS.accent} />}
                    onAdd={(picked) => onAdd(picked, muscle)}
                  />
                ))}
              </MuscleAccordion>
            </div>
          ))
        )}
      </div>
    </>
  );
}
