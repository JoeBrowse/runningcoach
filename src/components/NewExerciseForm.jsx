import { useState } from "react";
import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { slugify } from "../lib/exerciseLibrary.js";
import { hexToRgba, COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   NEW EXERCISE FORM
   Reusable form for adding a custom exercise to the live database,
   used both from the muscle-selection page and mid-workout.
--------------------------------------------------------------- */

// Doubles as the edit form. Passed an `initial` exercise it opens filled in
// and keeps that exercise's id on save, which is the whole point: the id is
// what every logged set, PB and chart hangs off, so editing must not mint a
// new one the way adding does.
export function NewExerciseForm({ muscles, defaultMuscle, onSave, onCancel, initial }) {
  const editing = !!initial;
  const [name, setName] = useState(initial ? initial.name : "");
  const [muscle, setMuscle] = useState((initial && initial.muscle) || defaultMuscle || muscles[0]);
  const [type, setType] = useState((initial && initial.type) || "compound");
  const [cue, setCue] = useState((initial && initial.cue) || "");
  const [secondary, setSecondary] = useState((initial && initial.secondary) || []);

  // When adding, only compounds are asked for indirect work — that is what
  // makes them compound — and anything picked before switching to isolation
  // is dropped rather than kept invisibly, so what you see is what is saved.
  //
  // Editing always asks, whatever the type. Seventeen of the shipped
  // isolation exercises do carry indirect work: a hammer curl reaches the
  // forearms, a leg curl the calves. Hiding the picker for those would mean
  // opening one and pressing save quietly deleted what it hits.
  const wantsSecondary = editing || type === "compound";
  // Offer whatever the caller considers a real muscle group, minus the one
  // already chosen as primary. Not MUSCLE_GROUPS, which is keyed off
  // EXERCISES and therefore includes "Mobility" — a category with no
  // recovery window, so picking it would silently do nothing.
  const secondaryOptions = muscles.filter((m) => m !== muscle && m !== "Mobility");
  const chosenSecondary = wantsSecondary ? secondary.filter((m) => m !== muscle) : [];

  function toggleSecondary(m) {
    setSecondary((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function handleSave() {
    if (!name.trim()) return;
    let id;
    if (editing) {
      id = initial.id;
    } else {
      const baseId = slugify(name);
      id = baseId;
      let n = 2;
      while (ALL_EXERCISES_BY_ID[id]) {
        id = `${baseId}-${n}`;
        n += 1;
      }
    }
    const ex = { ...(editing ? initial : {}), id, name: name.trim(), type, cue: cue.trim() || "Control the weight through a full range of motion.", muscle };
    if (chosenSecondary.length) ex.secondary = chosenSecondary;
    else delete ex.secondary;
    onSave(ex);
  }

  const inputStyle = {
    width: "100%",
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: COLORS.text,
    fontSize: 13.5,
    marginBottom: 10,
  };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
        {editing ? "Edit Exercise" : "New Exercise"}
      </div>
      {editing && (
        <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>
          Your logged sets stay with this exercise. This form changes the exercise, not your history. If you change the name or the muscle, the app updates all past workouts.
        </div>
      )}
      <input autoFocus type="text" placeholder="Exercise name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <select value={muscle} onChange={(e) => setMuscle(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
        {muscles.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["compound", "isolation"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: `1px solid ${type === t ? COLORS.accent : COLORS.line}`,
              background: type === t ? COLORS.accent : COLORS.surfaceRaised,
              color: type === t ? COLORS.onAccent : COLORS.textDim,
              fontFamily: "'Oswald', sans-serif",
              fontSize: 12.5,
              textTransform: "uppercase",
            }}
          >
            {t === "compound" ? "Compound" : "Isolation"}
          </button>
        ))}
      </div>
      {wantsSecondary && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            Also works (optional)
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45, marginBottom: 8 }}>
            Select the muscles that this exercise works indirectly. The readiness map shows partial fatigue for them. Weekly volume counts each set as half a set for them.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {secondaryOptions.map((m) => {
              const on = chosenSecondary.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleSecondary(m)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${on ? COLORS.accent : COLORS.line}`,
                    background: on ? hexToRgba(COLORS.accent, 0.14) : COLORS.surfaceRaised,
                    color: on ? COLORS.accent : COLORS.textDim,
                    fontSize: 11.5,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <textarea
        placeholder="Cue / technique tip (optional)"
        value={cue}
        onChange={(e) => setCue(e.target.value)}
        rows={2}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          style={{ flex: 1, background: name.trim() ? COLORS.accent : COLORS.surfaceRaised, color: name.trim() ? COLORS.onAccent : COLORS.textDim, border: "none", borderRadius: 8, padding: "10px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase" }}
        >
          {editing ? "Save Changes" : "Add Exercise"}
        </button>
        <button
          onClick={onCancel}
          style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 0", color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
