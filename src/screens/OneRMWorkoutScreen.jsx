import { useState } from "react";
import { Timer } from "lucide-react";
import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { todayStr } from "../lib/dates.js";
import { getTopSet } from "../lib/history.js";
import { PB_EXERCISE_IDS, beatsRecord, bodyWeightPct, buildOneRMRamp } from "../lib/progression.js";
import { startedRest, toggledRestPause, addedRestTime, useRestCountdown } from "../lib/rest.js";
import { capHistory } from "../lib/settings.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { RestTimer } from "../components/RestTimer.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   ONE-REP MAX TEST DAY
--------------------------------------------------------------- */

export function OneRMWorkoutScreen({ exerciseId, target, isBodyweight, settings, onBack, onDone }) {
  const ex = ALL_EXERCISES_BY_ID[exerciseId];
  const ramp = buildOneRMRamp(target, isBodyweight, settings.weightUnit);
  const [results, setResults] = useState(ramp.map(() => ({ weight: "", reps: "" })));
  const [timer, setTimer] = useState(null);
  const [saving, setSaving] = useState(false);

  useRestCountdown(timer, setTimer, settings.restTimerSound, settings.restVibrate);

  function startRest(seconds, label) {
    setTimer(startedRest(label, seconds));
  }

  function updateResult(i, field, value) {
    setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    setSaving(true);
    const date = todayStr();
    // Recovery is measured in hours, so a 1RM session has to carry the time it
    // happened like any other — a bare date leaves the muscles it worked
    // looking older than they are.
    const at = new Date().toISOString();
    const loggedSets = results
      .map((r, i) => (isBodyweight ? { weight: "", reps: r.reps || String(ramp[i].reps) } : { weight: r.weight || String(ramp[i].weight), reps: r.reps || String(ramp[i].reps) }))
      .filter((s) => s.reps !== "");

    const prevHist = (await safeGet(`ex-history:${exerciseId}`)) || [];
    await safeSet(`ex-history:${exerciseId}`, capHistory([...prevHist, { date, at, sets: loggedSets }]));

    if (PB_EXERCISE_IDS.includes(exerciseId)) {
      const topSet = getTopSet(loggedSets);
      const storedPB = await safeGet(`pb:${exerciseId}`);
      if (beatsRecord(topSet, storedPB)) {
        const bwRecord = await safeGet("bodyweight");
        const bw = bwRecord ? parseFloat(bwRecord.value) : null;
        await safeSet(`pb:${exerciseId}`, {
          exerciseId,
          name: ex.name,
          weight: topSet.weight,
          reps: topSet.reps,
          date,
          bodyWeightPct: bodyWeightPct(topSet.weight, bw),
        });
      }
    }

    const prevSessions = (await safeGet("workout-history")) || [];
    const session = { id: `${date}-${Date.now()}`, date, at, split: "1RM Test", exercises: [{ id: exerciseId, name: ex ? ex.name : exerciseId, muscle: ex ? ex.muscle : "", sets: loggedSets }] };
    await safeSet("workout-history", [...prevSessions, session].slice(-200));

    setSaving(false);
    onDone();
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title={ex ? ex.name : "1RM Test"} onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13 }}>
        Each step is heavier, up to today's attempt. Log what you did at each step. If a step feels wrong, adjust it during the session.
      </div>

      {timer && (
        <RestTimer timer={timer} onTogglePause={() => setTimer(toggledRestPause)} onAddTime={(s) => setTimer((p) => addedRestTime(p, s))} onSkip={() => setTimer(null)} />
      )}

      <div style={{ padding: "0 20px" }}>
        {ramp.map((step, i) => (
          <div key={i} style={{ background: COLORS.surface, border: `1px solid ${step.label === "Attempt" ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ color: step.label === "Attempt" ? COLORS.accent : COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase" }}>
                {step.label}
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                target: {isBodyweight ? `${step.reps} reps` : `${step.weight}${settings.weightUnit} × ${step.reps}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isBodyweight && (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={String(step.weight)}
                  value={results[i].weight}
                  onChange={(e) => updateResult(i, "weight", e.target.value)}
                  style={{ width: 70, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                />
              )}
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(step.reps)}
                value={results[i].reps}
                onChange={(e) => updateResult(i, "reps", e.target.value)}
                style={{ width: 70, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              />
              {step.rest && (
                <button
                  onClick={() => startRest(step.rest, `${step.label} → next`)}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "none", color: COLORS.accent, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                >
                  <Timer size={12} /> Rest {Math.floor(step.rest / 60)}:{String(step.rest % 60).padStart(2, "0")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 16, background: `linear-gradient(to top, ${COLORS.bg} 60%, transparent)` }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", background: COLORS.accent, color: COLORS.onAccent, border: "none", borderRadius: 14, padding: "18px 0", fontFamily: "'Oswald', sans-serif", fontSize: 17, letterSpacing: 1, textTransform: "uppercase" }}
        >
          {saving ? "Saving…" : "Save Result"}
        </button>
      </div>
    </div>
  );
}
