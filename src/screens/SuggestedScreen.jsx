import { useState, useEffect } from "react";
import { MUSCLE_GROUPS, readinessPercent, loadRecoveryMap } from "../lib/recovery.js";
import { DURATION_OPTIONS, DURATION_EXERCISE_COUNTS, buildSuggestedWorkout } from "../lib/workoutBuilder.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   SUGGESTED WORKOUT SCREEN
--------------------------------------------------------------- */

export function SuggestedScreen({ onBack, onBuild }) {
  const [duration, setDuration] = useState(null);
  const [readiness, setReadiness] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const muscles = MUSCLE_GROUPS;
      const lastMap = await loadRecoveryMap();
      if (cancelled) return;
      const map = {};
      muscles.forEach((m) => (map[m] = readinessPercent(lastMap[m], m)));
      setReadiness(map);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleBuild() {
    const exerciseCount = DURATION_EXERCISE_COUNTS[duration];
    // Freshest first, then keep only what the map calls ready — the screen is
    // "Train Ready Muscles", so an amber muscle should not qualify while a
    // green one exists. Falls back to the freshest six when too few are ready
    // to fill a session.
    const sorted = Object.entries(readiness).sort((a, b) => b[1] - a[1]);
    let readyMuscles = sorted.filter(([, pct]) => pct >= 100).map(([m]) => m);
    if (readyMuscles.length < 3) readyMuscles = sorted.slice(0, 6).map(([m]) => m);
    const list = buildSuggestedWorkout(readyMuscles, exerciseCount);
    onBuild(list);
  }

  const ready = !!duration;

  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="Train Ready Muscles" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        {loading ? "Checking muscle readiness…" : "The app makes this workout from the muscles that have recovered the most."}
      </div>

      <div data-tour="suggested-options" style={{ padding: "16px 20px 0" }}>
        <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
          How long do you have?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              style={{
                padding: "14px 0",
                borderRadius: 12,
                border: `1px solid ${duration === d.value ? COLORS.accent : COLORS.line}`,
                background: duration === d.value ? COLORS.accent : COLORS.surface,
                color: duration === d.value ? COLORS.onAccent : COLORS.text,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 16, background: `linear-gradient(to top, ${COLORS.bg} 60%, transparent)` }}>
        <button
          onClick={handleBuild}
          disabled={!ready || loading}
          style={{
            width: "100%",
            background: ready ? COLORS.accent : COLORS.surfaceRaised,
            color: ready ? COLORS.onAccent : COLORS.textDim,
            border: "none",
            borderRadius: 14,
            padding: "18px 0",
            fontFamily: "'Oswald', sans-serif",
            fontSize: 17,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {ready ? "Build Workout" : "Pick a duration"}
        </button>
      </div>
    </div>
  );
}
