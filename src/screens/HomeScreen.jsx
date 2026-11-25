import { useState, useEffect } from "react";
import { ChevronRight, Plus, Dumbbell, Clock, History as HistoryIcon, Play, TrendingUp, Trash2, ChevronUp, ChevronDown, Sparkles, User } from "lucide-react";
import { setHasData } from "../lib/history.js";
import { programmeNextIndex, programmePlanned, programmeCompleted, programmeWeekNumber, getFinishedProgrammes, deleteFinishedProgramme } from "../lib/programmes.js";
import { MUSCLE_GROUPS, loadRecoveryMap } from "../lib/recovery.js";
import { safeGet, safeSet, safeDelete } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { ActivityPanel } from "../components/ActivityPanel.jsx";
import { BodyMap } from "../components/BodyMap.jsx";
import { DailyQuote } from "../components/DailyQuote.jsx";
import { FormGauge } from "../components/FormGauge.jsx";
import { ModeHeader } from "../modes/ModeHeader.jsx";
import { loadSummary, weekStreak } from "../shared/load.js";
import { listActivities } from "../shared/store.js";

export function HomeScreen({ onStart, onViewHistory, onViewPB, onViewProgress, onStartTemplate, onResumeWorkout, onViewSettings, onViewSuggested, onViewVolume, onViewStreak, onViewOneRM, onViewExerciseDb, onOpenProgramme, onStartProgrammeDay, onViewProgrammeStats, onNewProgramme, reloadKey, activeProgramme, settings, mode, onModeChange }) {
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [unfinished, setUnfinished] = useState(null);
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [streak, setStreak] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [bodyweight, setBodyweight] = useState(null);
  const [finishedProgrammes, setFinishedProgrammes] = useState([]);
  const [showFinished, setShowFinished] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Bumped when an activity is logged or deleted, so the readiness map
  // redraws without a full screen reload.
  const [activityTick, setActivityTick] = useState(0);
  const [form, setForm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const muscles = MUSCLE_GROUPS;
      const hist = (await safeGet("workout-history")) || [];
      const tpls = (await safeGet("templates")) || [];
      const snapshot = await safeGet("in-progress-workout");
      const savedGoals = (await safeGet("1rm-goals")) || {};
      const bw = await safeGet("bodyweight");
      const finished = await getFinishedProgrammes();
      if (cancelled) return;
      setBodyweight(bw || null);
      setFinishedProgrammes([...finished].reverse());
      const map = await loadRecoveryMap();
      setDates(map);
      // One list for the Form gauge and the week streak (src/shared/).
      const everything = await listActivities(settings);
      setForm(loadSummary(everything, { settings }));
      setStreak(weekStreak(everything));
      setRecentSessions([...hist].reverse().slice(0, 3));
      setTemplates(tpls);
      setGoalCount(Object.keys(savedGoals).length);
      const hasEnteredData =
        snapshot && snapshot.exercises && snapshot.exercises.length > 0 &&
        Object.values(snapshot.sets || {}).some((setList) => setList.some(setHasData));
      setUnfinished(hasEnteredData ? snapshot : null);

      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 6);
      const volMap = {};
      muscles.forEach((m) => (volMap[m] = 0));
      hist.forEach((session) => {
        const d = new Date(session.date);
        if (d < cutoff) return;
        session.exercises.forEach((ex) => {
          if (volMap[ex.muscle] !== undefined) volMap[ex.muscle] += ex.sets.length;
        });
      });
      setWeeklyVolume(volMap);

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, activityTick]);

  async function discardUnfinished() {
    await safeDelete("in-progress-workout");
    setUnfinished(null);
  }

  const nextDay = activeProgramme ? activeProgramme.days[programmeNextIndex(activeProgramme)] : null;
  const progDone = activeProgramme ? programmeCompleted(activeProgramme) : 0;
  const progPlanned = activeProgramme ? programmePlanned(activeProgramme) : 0;
  const progWeek = activeProgramme ? programmeWeekNumber(activeProgramme) : 0;
  const progPct = progPlanned ? Math.min(100, Math.round((progDone / progPlanned) * 100)) : 0;

  async function deleteTemplate(id) {
    const updated = templates.filter((t) => t.id !== id);
    await safeSet("templates", updated);
    setTemplates(updated);
  }

  async function removeFinished(id) {
    const next = await deleteFinishedProgramme(id);
    setFinishedProgrammes([...next].reverse());
    setConfirmDeleteId(null);
  }

  return (
    <div style={{ padding: "28px 24px 40px" }}>
      <ModeHeader mode={mode || "lift"} onModeChange={onModeChange || (() => {})} onViewSettings={onViewSettings} />
      <DailyQuote />

      {unfinished && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            <Clock size={13} /> Unfinished Workout
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 12.5, marginBottom: 12 }}>
            {unfinished.split} · {unfinished.exercises.length} exercise{unfinished.exercises.length === 1 ? "" : "s"}. You logged sets in this workout but did not finish it.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onResumeWorkout(unfinished)}
              style={{ flex: 1, background: COLORS.accent, color: COLORS.onAccent, border: "none", borderRadius: 8, padding: "10px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
            >
              Resume
            </button>
            <button
              onClick={discardUnfinished}
              style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 0", color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {activeProgramme && nextDay ? (
        <div style={{ marginBottom: templates.length > 0 ? 20 : 28 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>{activeProgramme.name}</span>
              <button onClick={onOpenProgramme} style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 3 }}>
                All workouts <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ color: COLORS.textDim, fontSize: 12 }}>Week {progWeek} of {activeProgramme.weeks}</span>
              <span style={{ color: COLORS.textDim, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace" }}>{progDone}/{progPlanned}</span>
            </div>
            <div style={{ height: 5, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: `${progPct}%`, height: "100%", background: COLORS.accent }} />
            </div>
            <button
              onClick={() => onStartProgrammeDay(nextDay, activeProgramme)}
              style={{ width: "100%", background: COLORS.accent, color: COLORS.onAccent, border: "none", borderRadius: 12, padding: "16px 0", fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 0.5, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Play size={18} /> Start {nextDay.name}
            </button>
          </div>
          <button
            onClick={onStart}
            style={{ width: "100%", background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 0", color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            New programme or free workout
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: templates.length > 0 ? 20 : 28 }}>
          <button
            onClick={onStart}
            style={{
              width: "100%",
              background: COLORS.accent,
              color: COLORS.onAccent,
              border: "none",
              borderRadius: 14,
              padding: "18px 0",
              fontFamily: "'Oswald', sans-serif",
              fontSize: 18,
              letterSpacing: 1,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Dumbbell size={20} />
            Start Workout
          </button>
          <button
            onClick={onNewProgramme}
            style={{ width: "100%", background: "transparent", border: `1px solid ${COLORS.accent}`, borderRadius: 12, padding: "12px 0", color: COLORS.accent, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Plus size={14} /> Start a programme
          </button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            Templates
          </div>
          {templates.map((t) => {
            const count = t.mode === "specific" ? t.exercises.length : Object.values(t.selection).reduce((a, b) => a + b, 0);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                <button
                  onClick={() => onStartTemplate(t)}
                  style={{ flex: 1, textAlign: "left", background: "transparent", border: "none" }}
                >
                  <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase" }}>{t.name}</div>
                  <div style={{ color: COLORS.textDim, fontSize: 11.5 }}>{t.split} · {count} exercises</div>
                </button>
                <button
                  onClick={() => onStartTemplate(t)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.accent, border: "none", color: COLORS.onAccent, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.text }}>
            Muscle Readiness
          </div>
          <button
            onClick={onViewSuggested}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3 }}
          >
            <Sparkles size={13} /> Train Ready Muscles
          </button>
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 16 }}>
        </div>
        {settings.showBodyMap && (
          loading ? (
            <div style={{ color: COLORS.textDim, textAlign: "center", padding: 20 }}>Loading…</div>
          ) : (
            <BodyMap dates={dates} />
          )
        )}
        {!loading && <FormGauge summary={form} />}
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.text, display: "flex", alignItems: "center", gap: 6 }}>
            <HistoryIcon size={15} color={COLORS.accent} /> Training Log
          </div>
          <button onClick={onViewHistory} style={{ color: COLORS.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 3 }}>
            View All <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Recent workouts</div>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 12, fontSize: 13 }}>Loading…</div>
        ) : recentSessions.length === 0 ? (
          <div style={{ color: COLORS.textDim, fontSize: 13, padding: "4px 0 8px" }}>There are no workouts in the log.</div>
        ) : (
          recentSessions.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.line}` }}>
              <div>
                <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase" }}>{s.dayName || s.split}</div>
                <div style={{ color: COLORS.textDim, fontSize: 11.5 }}>{s.date}{s.programmeId ? " · programme" : ""}</div>
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.exercises.length} ex
              </div>
            </div>
          ))
        )}

        {finishedProgrammes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {/* Folded away by default: after a year of training this is a
                dozen rows of history sitting between you and the stats,
                and none of it is something you act on day to day. */}
            <button
              onClick={() => setShowFinished((v) => !v)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "transparent", border: "none", padding: "4px 0 8px" }}
            >
              <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
                Finished programmes
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                {finishedProgrammes.length}
                {showFinished ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {showFinished && finishedProgrammes.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                <button
                  onClick={() => onViewProgrammeStats(p)}
                  style={{ flex: 1, minWidth: 0, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 11.5 }}>
                      {(p.log || []).length} sessions{p.endedEarly ? " · ended early" : " · completed"}
                    </div>
                  </div>
                  <ChevronRight size={16} color={COLORS.textDim} />
                </button>
                {confirmDeleteId === p.id ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                      Cancel
                    </button>
                    <button onClick={() => removeFinished(p.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: COLORS.bad, color: "#fff", fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
                    title="Delete from history"
                    style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.text, marginBottom: 12 }}>
          Stats
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(() => {
            const tileStyle = { width: "calc(50% - 5px)", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14, textAlign: "left" };
            const valStyle = { color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 22, lineHeight: 1 };
            const labelStyle = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 };
            const totalSets = Object.values(weeklyVolume).reduce((a, b) => a + b, 0);
            const tiles = [
              { key: "info", onClick: onViewPB, value: bodyweight ? `${bodyweight.value}${bodyweight.unit}` : "—", label: "Personal Info", icon: <User size={13} color={COLORS.accent} /> },
              { key: "vol", onClick: onViewVolume, value: totalSets, label: "Sets This Week", icon: <Dumbbell size={13} color={COLORS.accent} /> },
              { key: "streak", onClick: onViewStreak, value: streak, label: "Week Streak", icon: <Clock size={13} color={COLORS.accent} /> },
              { key: "goals", onClick: onViewOneRM, value: goalCount, label: "1RM Goals", icon: <TrendingUp size={13} color={COLORS.accent} /> },
            ];
            return tiles.map((t) => (
              <button key={t.key} onClick={t.onClick} style={tileStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>{t.icon}</div>
                <div style={valStyle}>{loading ? "–" : t.value}</div>
                <div style={labelStyle}>{t.label}</div>
              </button>
            ));
          })()}
          {[
            { key: "progress", onClick: onViewProgress, label: "Progress Charts", icon: <TrendingUp size={14} color={COLORS.accent} /> },
            { key: "exdb", onClick: onViewExerciseDb, label: "Exercise Database", icon: <Dumbbell size={14} color={COLORS.accent} /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={t.onClick}
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "13px 14px", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                {t.icon}
                <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", lineHeight: 1.2 }}>{t.label}</span>
              </span>
              <ChevronRight size={15} color={COLORS.textDim} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      <ActivityPanel onChanged={() => setActivityTick((n) => n + 1)} />
    </div>
  );
}
