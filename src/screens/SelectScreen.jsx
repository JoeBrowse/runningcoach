import { useState, useEffect } from "react";
import { Plus, Minus, Check, Clock, Pause, Play, Bookmark, X } from "lucide-react";
import { SPLITS } from "../data/splits.js";
import { todayStr } from "../lib/dates.js";
import { registerCustomExercise, PAUSED_EXERCISE_IDS, togglePausedExercise, visibleExercises } from "../lib/exerciseLibrary.js";
import { exerciseMatchesQuery } from "../lib/exercises.js";
import { recoveryStage, hoursUntilReady, lastWorkedAt, trainedAgoLabel, loadRecoveryMap } from "../lib/recovery.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { buildFromSpecificSelection } from "../lib/workoutBuilder.js";
import { COLORS, STAGE_COLORS } from "../theme.js";
import { MuscleAccordion } from "../components/ExercisePicker.jsx";
import { NewExerciseForm } from "../components/NewExerciseForm.jsx";
import { TopBar } from "../components/TopBar.jsx";

export function SelectScreen({ split, settings, onBack, onContinue, onContinueSpecific }) {
  const isAdvanced = settings.appMode === "advanced";
  const [recovery, setRecovery] = useState({});
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({});
  const [mode, setMode] = useState("tap"); // "tap" | "specific"
  const [specificSelected, setSpecificSelected] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [, setPausedTick] = useState(0);
  const [openMuscles, setOpenMuscles] = useState(new Set()); // body-part accordions expanded in "specific exercises" mode

  async function handleTogglePaused(id) {
    await togglePausedExercise(id);
    setPausedTick((n) => n + 1);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const map = await loadRecoveryMap();
      if (!cancelled) {
        setRecovery(map);
        setLoading(false);
      }
    }
    setSelection({});
    setSpecificSelected(new Set());
    load();
    return () => {
      cancelled = true;
    };
  }, [split]);

  function addTap(m) {
    const max = visibleExercises(m).length;
    setSelection((prev) => {
      const cur = prev[m] || 0;
      if (cur >= max) return prev;
      return { ...prev, [m]: cur + 1 };
    });
  }
  function removeTap(m) {
    setSelection((prev) => {
      const cur = prev[m] || 0;
      if (cur <= 0) return prev;
      const next = { ...prev, [m]: cur - 1 };
      if (next[m] === 0) delete next[m];
      return next;
    });
  }
  function toggleSpecific(m, id) {
    setSpecificSelected((prev) => {
      const next = new Set(prev);
      const key = `${m}:${id}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = Object.values(selection).reduce((a, b) => a + b, 0);
  const specificTotal = specificSelected.size;
  const activeTotal = mode === "specific" ? specificTotal : total;

  const [showNameInput, setShowNameInput] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);

  async function saveTemplate() {
    const name = templateName.trim() || `${split} Workout`;
    const prev = (await safeGet("templates")) || [];
    const template =
      mode === "specific"
        ? { id: `tpl-${Date.now()}`, name, split, mode: "specific", exercises: buildFromSpecificSelection(split, specificSelected).map((e) => ({ id: e.id, muscle: e.muscle })), createdAt: todayStr() }
        : { id: `tpl-${Date.now()}`, name, split, mode: "tap", selection, createdAt: todayStr() };
    await safeSet("templates", [...prev, template]);
    setShowNameInput(false);
    setTemplateName("");
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  function handleBuild() {
    if (mode === "specific") {
      onContinueSpecific(buildFromSpecificSelection(split, specificSelected));
    } else {
      onContinue(selection);
    }
  }

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [, forceRefresh] = useState(0);

  async function handleSaveCustomExercise(ex) {
    registerCustomExercise(ex);
    const prev = (await safeGet("custom-exercises")) || [];
    await safeSet("custom-exercises", [...prev, ex]);
    setShowAddExercise(false);
    forceRefresh((n) => n + 1); // EXERCISES mutated in place — force a re-render to reflect it
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title={split} onBack={onBack} />
      <div style={{ padding: "0 20px 4px", color: COLORS.textDim, fontSize: 13 }}>
        {mode === "tap" ? "Tap a muscle to add an exercise for it. Tap again to add another." : "Pick exactly the exercises you want."}
      </div>
      {isAdvanced && (
        <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setMode(mode === "tap" ? "specific" : "tap")}
            style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, background: "transparent", border: "none", padding: "4px 0" }}
          >
            {mode === "tap" ? "Choose specific exercises instead" : "Back to muscle-tap mode"}
          </button>
          <button
            onClick={() => setShowAddExercise((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.textDim, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, background: "transparent", border: "none", padding: "4px 0" }}
          >
            <Plus size={13} /> New
          </button>
        </div>
      )}

      {showAddExercise && isAdvanced && (
        <div style={{ padding: "0 20px 12px" }}>
          <NewExerciseForm
            muscles={SPLITS[split]}
            defaultMuscle={SPLITS[split][0]}
            onSave={handleSaveCustomExercise}
            onCancel={() => setShowAddExercise(false)}
          />
        </div>
      )}

      {mode === "tap" ? (
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {SPLITS[split].map((m) => {
            const last = recovery[m];
            const stage = recoveryStage(last, m);
            const count = selection[m] || 0;
            const max = visibleExercises(m).filter((e) => !PAUSED_EXERCISE_IDS.has(e.id)).length;
            return (
              <button
                key={m}
                onClick={() => addTap(m)}
                disabled={count >= max}
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${count > 0 ? COLORS.accent : COLORS.line}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: count >= max ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 17, textTransform: "uppercase" }}>
                    {m}
                  </div>
                  {/* Same red/amber/green banding as the readiness map, so the
                      screen where muscles get picked agrees with it. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    {loading ? (
                      <>
                        <Clock size={12} /> …
                      </>
                    ) : (
                      <>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_COLORS[stage], flexShrink: 0 }} />
                        {trainedAgoLabel(lastWorkedAt(last))}
                        {last && stage !== "green" ? ` · ready in ${hoursUntilReady(last, m)}h` : ""}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {count > 0 && (
                    <div
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTap(m);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: COLORS.surfaceRaised,
                        border: `1px solid ${COLORS.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: COLORS.textDim,
                      }}
                    >
                      <Minus size={14} />
                    </div>
                  )}
                  <div
                    style={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: 8,
                      background: count > 0 ? COLORS.accent : COLORS.surfaceRaised,
                      border: `1px solid ${count > 0 ? COLORS.accent : COLORS.line}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: count > 0 ? COLORS.onAccent : COLORS.textDim,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "0 6px",
                    }}
                  >
                    {count}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          <input
            type="text"
            placeholder="Search exercises…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 12px", color: COLORS.text, fontSize: 13.5, marginBottom: 16 }}
          />
          {SPLITS[split].map((m) => {
            const filtered = visibleExercises(m).filter((ex) => exerciseMatchesQuery(ex, searchQuery));
            if (filtered.length === 0) return null;
            const isOpen = searchQuery.trim() ? true : openMuscles.has(m);
            return (
              <div key={m} style={{ marginBottom: 10 }}>
                <MuscleAccordion
                  muscle={m}
                  count={filtered.length}
                  isOpen={isOpen}
                  onToggle={() => setOpenMuscles((prev) => {
                    const next = new Set(prev);
                    if (next.has(m)) next.delete(m); else next.add(m);
                    return next;
                  })}
                >
                  {filtered.map((ex) => {
                    const key = `${m}:${ex.id}`;
                    const isSelected = specificSelected.has(key);
                    const isPaused = PAUSED_EXERCISE_IDS.has(ex.id);
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: COLORS.surface,
                          border: `1px solid ${isSelected ? COLORS.accent : COLORS.line}`,
                          borderRadius: 12,
                          padding: "12px 14px",
                          opacity: isPaused ? 0.55 : 1,
                        }}
                      >
                        <button
                          onClick={() => toggleSpecific(m, ex.id)}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", textAlign: "left" }}
                        >
                          <div>
                            <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase" }}>
                              {ex.name}
                            </div>
                            <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>
                              {ex.type === "compound" ? "Compound" : ex.type === "isolation" ? "Isolation" : "Mobility"}{isPaused ? " · Paused" : ""}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              border: `1.5px solid ${isSelected ? COLORS.accent : COLORS.line}`,
                              background: isSelected ? COLORS.accent : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check size={14} color={COLORS.onAccent} />}
                          </div>
                        </button>
                        <button
                          onClick={() => handleTogglePaused(ex.id)}
                          title={isPaused ? "Unpause — allow auto-selection again" : "Pause — exclude from auto-selection"}
                          style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: isPaused ? COLORS.accent : COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        >
                          {isPaused ? <Play size={13} /> : <Pause size={13} />}
                        </button>
                      </div>
                    );
                  })}
                </MuscleAccordion>
              </div>
            );
          })}
        </div>
      )}

      {activeTotal > 0 && isAdvanced && (
        <div style={{ padding: "0 20px 100px" }}>
          {!showNameInput ? (
            <button
              onClick={() => setShowNameInput(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, background: "transparent", border: "none", padding: "6px 0" }}
            >
              <Bookmark size={13} /> {savedMsg ? "Saved as template" : "Save this as a template"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                type="text"
                placeholder={`${split} Workout`}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px", color: COLORS.text, fontSize: 13.5 }}
              />
              <button onClick={saveTemplate} style={{ width: 40, borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.onAccent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={16} />
              </button>
              <button onClick={() => setShowNameInput(false)} style={{ width: 40, borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surfaceRaised, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 16, background: `linear-gradient(to top, ${COLORS.bg} 60%, transparent)` }}>
        <button
          onClick={handleBuild}
          disabled={activeTotal === 0}
          style={{
            width: "100%",
            background: activeTotal === 0 ? COLORS.surfaceRaised : COLORS.accent,
            color: activeTotal === 0 ? COLORS.textDim : COLORS.onAccent,
            border: "none",
            borderRadius: 14,
            padding: "18px 0",
            fontFamily: "'Oswald', sans-serif",
            fontSize: 17,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {activeTotal === 0 ? "Select at least one exercise" : `Build Workout · ${activeTotal} exercise${activeTotal === 1 ? "" : "s"}`}
        </button>
      </div>

    </div>
  );
}
