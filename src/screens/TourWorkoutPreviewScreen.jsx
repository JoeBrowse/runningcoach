import { Check, Clock, Timer, Play, ChevronDown, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";

// Static, non-interactive stand-in for the real WorkoutScreen, used only
// while the tour is illustrating in-workout features (see the comment
// above TOUR_STEPS for why the real screen isn't used here). Nothing on
// this screen reads or writes storage.
export function TourWorkoutPreviewScreen() {
  const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${COLORS.line}` };
  const inputStyle = { width: 56, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "7px 0", textAlign: "center" };
  const pillStyle = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.3 };
  return (
    <div style={{ padding: "20px 20px 40px" }}>
      <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
        Preview only. The app saves nothing here.
      </div>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 20, textTransform: "uppercase", marginBottom: 16 }}>
        In a Real Workout
      </div>

      <div data-tour="log-time-pill" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "7px 12px", color: COLORS.textDim, fontSize: 12.5, marginBottom: 14 }}>
        <Clock size={13} /> Logging for now
      </div>

      <div data-tour="rest-timer" style={{ background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${COLORS.accent}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}>
          <Timer size={14} /> Resting
        </div>
        <div style={{ color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>01:30</div>
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>
              Barbell Bench Press
            </div>
            {/* Inert, like everything else on this preview — the tour should
                not launch YouTube out from under the person reading it. */}
            <div data-tour="form-video" style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Play size={11} />
            </div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <SettingsIcon size={14} />
          </div>
        </div>
        <div data-tour="superset-dropset" style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <div style={pillStyle}>
            <ChevronDown size={13} color={COLORS.accent} /> Dropset
          </div>
          <div style={pillStyle}>
            <Sparkles size={13} color={COLORS.accent} /> Superset
          </div>
        </div>
        <div data-tour="set-rows">
          <div style={rowStyle}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${COLORS.line}` }} />
            <div style={{ ...inputStyle }}>40%</div>
            <div style={{ ...inputStyle }}>8</div>
            <div style={{ color: COLORS.textDim, fontSize: 11 }}>warm-up</div>
          </div>
          <div style={rowStyle}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={13} color={COLORS.onAccent} />
            </div>
            <div style={{ ...inputStyle }}>60</div>
            <div style={{ ...inputStyle }}>8</div>
            <div style={{ color: COLORS.textDim, fontSize: 11 }}>set 1</div>
          </div>
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${COLORS.line}` }} />
            <div style={{ ...inputStyle }}>60</div>
            <div style={{ ...inputStyle }}>7</div>
            <div style={{ color: COLORS.textDim, fontSize: 11 }}>set 2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
