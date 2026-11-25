import { useState, useEffect } from "react";
import { ChevronRight, Plus, Check, Play, TrendingUp, X, ChevronUp, ChevronDown } from "lucide-react";
import { programmeNextIndex, programmePlanned, programmeCompleted, programmeWeekNumber, lastDoneForDay, getActiveProgramme, saveActiveProgramme } from "../lib/programmes.js";
import { reorderByType } from "../lib/workoutBuilder.js";
import { COLORS } from "../theme.js";
import { ExerciseSearchPicker } from "../components/ExercisePicker.jsx";
import { TopBar } from "../components/TopBar.jsx";

export function ProgrammeScreen({ programme: programmeProp, onBack, onStartDay, onFinishProgramme, onViewStats, onProgrammeChange }) {
  const [programme, setProgramme] = useState(programmeProp || null);
  const [loading, setLoading] = useState(!programmeProp);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [openDay, setOpenDay] = useState(null); // day key whose exercises are showing
  const [addTo, setAddTo] = useState(null); // day key being added to

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const p = await getActiveProgramme();
      if (!cancelled) {
        if (p) setProgramme(p); // refresh with the persisted copy (latest log)
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Editing a running programme saves as you go — there is no draft to keep,
  // and a plan you have already started is exactly the one you are most
  // likely to want to change.
  async function updateDay(dayKey, mutate) {
    if (!programme) return;
    const next = {
      ...programme,
      days: programme.days.map((d) => {
        if (d.key !== dayKey) return d;
        const exercises = mutate(d.exercises);
        return { ...d, exercises, muscles: [...new Set(exercises.map((e) => e.muscle))] };
      }),
    };
    setProgramme(next);
    await saveActiveProgramme(next);
    if (onProgrammeChange) onProgrammeChange(next);
  }

  const removeExercise = (dayKey, exId) =>
    updateDay(dayKey, (list) => (list.length > 1 ? list.filter((e) => e.id !== exId) : list));

  const addExercise = (dayKey, ex, muscle) =>
    updateDay(dayKey, (list) =>
      list.some((e) => e.id === ex.id)
        ? list
        : reorderByType([...list, { id: ex.id, name: ex.name, muscle, type: ex.type }]),
    );

  // The order of a day is the order you train it in, and the builder and the
  // live workout both already let you set it. This screen was the one place
  // that did not, so a plan you had started could be added to and taken from
  // but never rearranged. Same up/down pair as the other two rather than a
  // drag handle, which on a phone fights the page scroll. Saves on the tap,
  // like every other edit here.
  const moveExercise = (dayKey, index, delta) =>
    updateDay(dayKey, (list) => {
      const to = index + delta;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  if (loading) {
    return (
      <div>
        <TopBar title="Programme" onBack={onBack} />
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
      </div>
    );
  }
  if (!programme) {
    return (
      <div>
        <TopBar title="Programme" onBack={onBack} />
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30, fontSize: 13.5 }}>No active programme.</div>
      </div>
    );
  }

  const nextIdx = programmeNextIndex(programme);
  const ordered = [...programme.days.slice(nextIdx), ...programme.days.slice(0, nextIdx)];
  const done = programmeCompleted(programme);
  const planned = programmePlanned(programme);
  const week = programmeWeekNumber(programme);
  const pct = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Programme" onBack={onBack} />
      <div style={{ padding: "0 20px" }}>
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 19, textTransform: "uppercase", marginBottom: 4 }}>{programme.name}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: COLORS.textDim, fontSize: 12.5 }}>Week {week} of {programme.weeks}</span>
            <span style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{done}/{planned} sessions</span>
          </div>
          <div style={{ height: 6, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: COLORS.accent }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Must pass the programme explicitly — wiring onViewStats
                straight to onClick handed the click event to the stats
                screen instead, which then had no id to match sessions
                against and no days array to size the plan from. */}
            <button onClick={() => onViewStats(programme)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
              <TrendingUp size={13} color={COLORS.accent} /> Progress
            </button>
            <button onClick={() => setConfirmingFinish(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.accent}`, borderRadius: 8, padding: "9px 0", color: COLORS.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
              <Check size={13} /> Finish
            </button>
          </div>
          {confirmingFinish && (
            <div style={{ marginTop: 12, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 12 }}>
              <div style={{ color: COLORS.text, fontSize: 12.5, marginBottom: 10 }}>
                {done < planned
                  ? "Finish this programme now? The app moves it to Finished Programmes with your stats to this point."
                  : "Complete this programme? The app moves it to Finished Programmes."}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmingFinish(false)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.textDim, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                  Cancel
                </button>
                <button onClick={() => { setConfirmingFinish(false); onFinishProgramme(); }} style={{ flex: 1, background: COLORS.accent, border: "none", borderRadius: 8, padding: "9px 0", color: COLORS.onAccent, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                  Finish
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
          Your workouts
        </div>
        {ordered.map((day, i) => {
          const isNext = i === 0;
          const lastDone = lastDoneForDay(programme, day.key);
          const isOpen = openDay === day.key;
          const onlyOne = day.exercises.length === 1;
          return (
            <div key={day.key} style={{ background: COLORS.surface, border: `1px solid ${isNext ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <button
                  onClick={() => { setOpenDay(isOpen ? null : day.key); setAddTo(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, background: "transparent", border: "none", padding: 0, textAlign: "left" }}
                >
                  <span style={{ color: COLORS.textDim, flexShrink: 0, display: "flex" }}>
                    {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase" }}>{day.name}</span>
                      {isNext && <span style={{ color: COLORS.accent, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", border: `1px solid ${COLORS.accent}`, borderRadius: 999, padding: "2px 7px" }}>Next</span>}
                    </span>
                    <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, marginTop: 2 }}>
                      {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"} · {lastDone ? `last: ${lastDone}` : "not done yet"}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => onStartDay(day, programme)}
                  style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: isNext ? COLORS.accent : COLORS.surfaceRaised, border: isNext ? "none" : `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 16px", color: isNext ? COLORS.onAccent : COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                >
                  <Play size={14} /> Start
                </button>
              </div>

              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
                  {day.exercises.map((ex, ei) => (
                    <div key={ex.id} data-testid="programme-exercise" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: COLORS.surfaceRaised, borderRadius: 8, marginBottom: 6 }}>
                      <div style={{ width: 24, flexShrink: 0, borderRadius: 6, border: `1px solid ${COLORS.line}`, display: "flex", flexDirection: "column", overflow: "hidden", alignSelf: "stretch" }}>
                        <button
                          onClick={() => moveExercise(day.key, ei, -1)}
                          disabled={ei === 0}
                          title="Move up"
                          aria-label={`Move ${ex.name} up`}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.line}`, color: ei === 0 ? COLORS.line : COLORS.textDim, padding: 0 }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          onClick={() => moveExercise(day.key, ei, 1)}
                          disabled={ei === day.exercises.length - 1}
                          title="Move down"
                          aria-label={`Move ${ex.name} down`}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: ei === day.exercises.length - 1 ? COLORS.line : COLORS.textDim, padding: 0 }}
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: COLORS.text, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.name}</div>
                        <div style={{ color: COLORS.textDim, fontSize: 11 }}>{ex.muscle}</div>
                      </div>
                      {/* A day with nothing in it would start an empty
                          workout, so the last exercise cannot be removed —
                          swap it instead by adding the replacement first. */}
                      <button
                        onClick={() => removeExercise(day.key, ex.id)}
                        disabled={onlyOne}
                        title={onlyOne ? "Add another exercise before you remove this one" : `Remove ${ex.name}`}
                        style={{ color: onlyOne ? COLORS.line : COLORS.textDim, flexShrink: 0, marginLeft: 8 }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}

                  {addTo === day.key ? (
                    <div style={{ marginTop: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: COLORS.text, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>Add exercise</span>
                        <button onClick={() => setAddTo(null)} style={{ color: COLORS.textDim }}><X size={15} /></button>
                      </div>
                      {/* Remounts after each add so the search box clears —
                          otherwise the term you just used sits there matching
                          the exercise it is now excluding. */}
                      <ExerciseSearchPicker
                        key={day.exercises.length}
                        autoFocus
                        surface={COLORS.surface}
                        maxHeight={300}
                        excludeIds={new Set(day.exercises.map((e) => e.id))}
                        onAdd={(ex, m) => addExercise(day.key, ex, m)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddTo(day.key)}
                      style={{ width: "100%", marginTop: 4, background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.textDim, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Plus size={13} /> Add exercise
                    </button>
                  )}

                  <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 10 }}>
                    The app saves each change immediately. Changes apply from your next session. Sessions that you logged before do not change.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
