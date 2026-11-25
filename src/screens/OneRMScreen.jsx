import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { todayStr } from "../lib/dates.js";
import { PB_EXERCISE_IDS, BODYWEIGHT_LIFT_IDS, getCurrentEstimate, TRAINING_LEVELS, calculateWeeksNeeded, buildProgressionJourney, currentMilestone } from "../lib/progression.js";
import { safeGet, safeSet, safeDelete } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   ONE-REP MAX GOALS SCREEN
--------------------------------------------------------------- */

function OneRMGoalForm({ current, isBodyweight, unit, onSave, onCancel }) {
  const [currentInput, setCurrentInput] = useState(current ? String(current) : "");
  const [target, setTarget] = useState("");
  const [level, setLevel] = useState("intermediate");

  const c = parseFloat(currentInput);
  const t = parseFloat(target);
  const weeksPreview = c && t && t > c ? calculateWeeksNeeded(c, t, level, isBodyweight) : null;

  return (
    <div style={{ background: COLORS.surfaceRaised, borderRadius: 10, padding: 12, marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            {isBodyweight ? "Current max reps" : `Current 1RM (${unit})`}
          </div>
          <input
            type="number"
            inputMode="decimal"
            placeholder={isBodyweight ? "e.g. 10" : "e.g. 80"}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 12px", color: COLORS.text, fontSize: 13.5 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            {isBodyweight ? "Target max reps" : `Target 1RM (${unit})`}
          </div>
          <input
            type="number"
            inputMode="decimal"
            placeholder={isBodyweight ? "e.g. 15" : "e.g. 100"}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 12px", color: COLORS.text, fontSize: 13.5 }}
          />
        </div>
      </div>

      <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
        Training Experience
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {TRAINING_LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            title={l.desc}
            style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${level === l.value ? COLORS.accent : COLORS.line}`, background: level === l.value ? COLORS.accent : COLORS.surface, color: level === l.value ? COLORS.onAccent : COLORS.textDim, fontSize: 11 }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div style={{ color: COLORS.textDim, fontSize: 11.5, marginBottom: 12, fontStyle: "italic" }}>
        {weeksPreview ? `The app will make a plan of about ${weeksPreview} week${weeksPreview === 1 ? "" : "s"}. It uses typical progress rates for the ${level} level.` : t && c && t <= c ? "Make the target higher than your current number." : "Enter the two numbers to see the estimated time."}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => weeksPreview && onSave(c, t, level, weeksPreview)}
          disabled={!weeksPreview}
          style={{ flex: 1, background: weeksPreview ? COLORS.accent : COLORS.surface, color: weeksPreview ? COLORS.onAccent : COLORS.textDim, border: "none", borderRadius: 8, padding: "10px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
        >
          Save Goal
        </button>
        <button onClick={onCancel} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 0", color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function OneRMScreen({ settings, onBack, onGenerateWorkout }) {
  const [estimates, setEstimates] = useState({});
  const [goals, setGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(null); // exerciseId or null
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [logForm, setLogForm] = useState(null); // exerciseId or null
  const [logInput, setLogInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const savedGoals = (await safeGet("1rm-goals")) || {};
      const estEntries = await Promise.all(PB_EXERCISE_IDS.map(async (id) => [id, await getCurrentEstimate(id)]));
      if (cancelled) return;
      const estMap = {};
      estEntries.forEach(([id, v]) => (estMap[id] = v));
      setEstimates(estMap);
      setGoals(savedGoals);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveGoal(exerciseId, current, target, level, weeks) {
    const isBodyweight = BODYWEIGHT_LIFT_IDS.includes(exerciseId);
    const milestones = buildProgressionJourney(current, target, weeks, isBodyweight, settings.weightUnit);
    const goal = { exerciseId, current, target, level, weeks, isBodyweight, createdAt: new Date().toISOString(), milestones };
    const updated = { ...goals, [exerciseId]: goal };
    await safeSet("1rm-goals", updated);
    setGoals(updated);
    setOpenForm(null);
  }

  async function clearGoal(exerciseId) {
    const updated = { ...goals };
    delete updated[exerciseId];
    await safeSet("1rm-goals", updated);
    setGoals(updated);
    setExpandedGoal(null);
  }

  async function saveManual1RM(exerciseId) {
    const val = parseFloat(logInput);
    if (!val) return;
    const record = { value: val, date: todayStr() };
    await safeSet(`manual-1rm:${exerciseId}`, record);
    setEstimates((prev) => ({ ...prev, [exerciseId]: { value: val, isManual: true, date: record.date } }));
    setLogForm(null);
    setLogInput("");
  }

  async function clearManual1RM(exerciseId) {
    await safeDelete(`manual-1rm:${exerciseId}`);
    const fresh = await getCurrentEstimate(exerciseId);
    setEstimates((prev) => ({ ...prev, [exerciseId]: fresh }));
  }

  return (
    <div>
      <TopBar title="1RM Goals" onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13 }}>
        Set a target. The app gives you a weekly plan to reach it. When you are ready, make a test day for your attempt.
      </div>
      <div style={{ padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
        ) : (
          PB_EXERCISE_IDS.map((id, idx) => {
            const ex = ALL_EXERCISES_BY_ID[id];
            const isBodyweight = BODYWEIGHT_LIFT_IDS.includes(id);
            const est = estimates[id];
            const goal = goals[id];
            const unit = isBodyweight ? "reps" : settings.weightUnit;
            const isExpanded = expandedGoal === id;
            const milestone = goal ? currentMilestone(goal) : null;

            return (
              <div key={id} data-tour={idx === 0 ? "onerm-list" : undefined} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase" }}>{ex ? ex.name : id}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {est && est.value
                        ? est.isManual
                          ? `current: ${est.value}${isBodyweight ? " reps" : unit} · logged ${est.date}`
                          : `current: ~${est.value}${isBodyweight ? " reps" : unit} (estimated)`
                        : "current: no data yet"}
                    </div>
                    {logForm === id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          placeholder={isBodyweight ? "reps" : `1RM (${unit})`}
                          value={logInput}
                          onChange={(e) => setLogInput(e.target.value)}
                          style={{ width: 90, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                        />
                        <button onClick={() => saveManual1RM(id)} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "7px 12px", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase" }}>
                          Save
                        </button>
                        <button onClick={() => { setLogForm(null); setLogInput(""); }} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                        <button
                          onClick={() => { setLogForm(id); setLogInput(est && est.value ? String(est.value) : ""); }}
                          style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.accent, background: "transparent", border: "none", fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                        >
                          <Plus size={11} /> Log {isBodyweight ? "Max Reps" : "1RM"}
                        </button>
                        {est && est.isManual && (
                          <button onClick={() => clearManual1RM(id)} style={{ color: COLORS.textDim, background: "transparent", border: "none", fontSize: 11.5 }}>
                            Reset to auto
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {goal && (
                    <button onClick={() => onGenerateWorkout(id, milestone.value, isBodyweight)} style={{ background: COLORS.accent, color: COLORS.onAccent, border: "none", borderRadius: 8, padding: "8px 12px", fontFamily: "'Oswald', sans-serif", fontSize: 11.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      Test Day
                    </button>
                  )}
                </div>

                {goal ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ color: COLORS.textDim, fontSize: 11.5 }}>
                        This week's target: <span style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace" }}>{milestone.value}{isBodyweight ? " reps" : unit}</span>
                      </div>
                      <div style={{ color: COLORS.textDim, fontSize: 11.5 }}>Goal: {goal.target}{isBodyweight ? " reps" : unit}</div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: COLORS.surfaceRaised, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, ((milestone.value - goal.current) / (goal.target - goal.current || 1)) * 100)}%`, background: COLORS.accent }} />
                    </div>
                    <button onClick={() => setExpandedGoal(isExpanded ? null : id)} style={{ color: COLORS.textDim, fontSize: 11.5, background: "transparent", border: "none", padding: "4px 0" }}>
                      {isExpanded ? "Hide weekly plan" : "Show weekly plan"}
                    </button>
                    {isExpanded && (
                      <div style={{ marginTop: 6 }}>
                        {goal.milestones.map((m) => (
                          <div key={m.week} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11.5, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                            <span>Week {m.week}</span>
                            <span>{m.value}{isBodyweight ? " reps" : unit}</span>
                          </div>
                        ))}
                        <button onClick={() => clearGoal(id)} style={{ marginTop: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.bad}`, borderRadius: 8, padding: "8px 0", color: COLORS.bad, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                          <Trash2 size={12} /> Clear Goal
                        </button>
                      </div>
                    )}
                  </div>
                ) : openForm === id ? (
                  <OneRMGoalForm
                    current={est ? est.value : null}
                    isBodyweight={isBodyweight}
                    unit={settings.weightUnit}
                    onSave={(current, target, level, weeks) => saveGoal(id, current, target, level, weeks)}
                    onCancel={() => setOpenForm(null)}
                  />
                ) : (
                  <button onClick={() => setOpenForm(id)} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, background: "transparent", border: "none", fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                    <Plus size={13} /> Set a Goal
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
