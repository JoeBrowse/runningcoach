import { Check, Trophy } from "lucide-react";
import { COLORS } from "../theme.js";
import { SessionToneChart } from "../components/SessionToneChart.jsx";
import { StravaShareButton } from "../components/StravaShareButton.jsx";

export function DoneScreen({ onHome, newPBs, programmeInfo, session, settings }) {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <Check size={32} color={COLORS.onAccent} />
      </div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, textTransform: "uppercase", color: COLORS.text, marginBottom: 6 }}>
        Workout saved
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: (newPBs && newPBs.length) || programmeInfo ? 20 : 32, textAlign: "center" }}>
        The app saved your weights and reps for your next workout.
      </div>

      {programmeInfo && (
        <div style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            {programmeInfo.name}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ color: COLORS.text, fontSize: 13.5 }}>
              Week {programmeInfo.week} of {programmeInfo.weeks}
            </span>
            <span style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              {programmeInfo.done}/{programmeInfo.planned} sessions
            </span>
          </div>
          <div style={{ height: 6, background: COLORS.surfaceRaised, borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${programmeInfo.planned ? Math.min(100, Math.round((programmeInfo.done / programmeInfo.planned) * 100)) : 0}%`, height: "100%", background: COLORS.accent }} />
          </div>
          {programmeInfo.complete ? (
            <div style={{ color: COLORS.accent, fontSize: 12.5 }}>You did all the sessions in this programme. Finish the programme to see all your statistics. 🎉</div>
          ) : (
            <div style={{ color: COLORS.textDim, fontSize: 12.5 }}>Next: <span style={{ color: COLORS.text }}>{programmeInfo.nextDayName}</span></div>
          )}
        </div>
      )}

      {newPBs && newPBs.length > 0 && (
        <div style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.accent}`, borderRadius: 14, padding: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            <Trophy size={15} /> New Personal Record{newPBs.length > 1 ? "s" : ""}
          </div>
          {newPBs.map((pb) => (
            <div key={pb.exerciseId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5 }}>
              <span style={{ color: COLORS.text }}>{pb.name}</span>
              <span style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                {pb.weight || "–"} × {pb.reps || "–"}
              </span>
            </div>
          ))}
        </div>
      )}

      {session && session.toneTally && <SessionToneChart tally={session.toneTally} />}

      {settings && settings.stravaShare && session && (
        <div style={{ width: "100%", marginBottom: 16 }}>
          <StravaShareButton session={session} unit={settings.weightUnit} />
        </div>
      )}

      <button
        onClick={onHome}
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.line}`,
          color: COLORS.text,
          borderRadius: 12,
          padding: "14px 28px",
          fontFamily: "'Oswald', sans-serif",
          fontSize: 15,
          textTransform: "uppercase",
        }}
      >
        Back to Home
      </button>
    </div>
  );
}
