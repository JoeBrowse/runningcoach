import { Timer, Pause, Play, SkipForward } from "lucide-react";
import { formatTime } from "../lib/rest.js";
import { COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   REST TIMER BAR
--------------------------------------------------------------- */

export function RestTimer({ timer, onTogglePause, onAddTime, onSkip }) {
  if (!timer) return null;
  const pct = Math.max(0, Math.min(100, Math.round((timer.seconds / timer.total) * 100)));
  return (
    <div
      style={{
        position: "sticky",
        top: "env(safe-area-inset-top, 0px)",
        zIndex: 40,
        margin: "0 20px 14px",
        background: COLORS.surface,
        border: `1px solid ${COLORS.accent}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
          <Timer size={13} /> Resting · {timer.label}
        </div>
        <div data-testid="rest-remaining" style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600 }}>
          {formatTime(timer.seconds)}
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: COLORS.surfaceRaised, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: COLORS.accent, transition: "width 1s linear" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onTogglePause}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
        >
          {timer.paused ? <Play size={13} /> : <Pause size={13} />} {timer.paused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={() => onAddTime(15)}
          style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
        >
          +15s
        </button>
        <button
          onClick={onSkip}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
        >
          <SkipForward size={13} /> Skip
        </button>
      </div>
    </div>
  );
}
