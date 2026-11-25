import { Sparkles } from "lucide-react";
import { formatReleaseDate } from "../data/releaseNotes.js";
import { hexToRgba, COLORS } from "../theme.js";

// Full-screen rather than a modal: on the first launch after an update this
// is the only thing on screen, and a changelog worth reading needs room.
export function WhatsNewScreen({ notes, onDismiss }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 210, background: COLORS.bg, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "40px 22px 20px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${COLORS.accent}`, borderRadius: 999, padding: "5px 12px", marginBottom: 18 }}>
          <Sparkles size={13} color={COLORS.accent} />
          <span style={{ color: COLORS.accent, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Version {notes.version}
          </span>
        </div>

        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 30, textTransform: "uppercase", lineHeight: 1.1, letterSpacing: 0.5, marginBottom: 8 }}>
          What Is New
        </div>
        <div style={{ color: COLORS.text, fontSize: 14.5, lineHeight: 1.55, marginBottom: 6 }}>{notes.headline}</div>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", marginBottom: 24 }}>{formatReleaseDate(notes.released)}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.items.map((item) => (
            <div key={item.title} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.accent}`, borderRadius: 12, padding: "13px 15px" }}>
              <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>{item.body}</div>
            </div>
          ))}
        </div>

        <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: "center", marginTop: 22 }}>
          The update did not change your workouts or settings.
        </div>
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: `16px 22px calc(20px + env(safe-area-inset-bottom, 0px))`, background: `linear-gradient(to top, ${COLORS.bg} 65%, transparent)` }}>
        <button
          onClick={onDismiss}
          style={{ width: "100%", maxWidth: 460, margin: "0 auto", display: "block", background: COLORS.accent, border: "none", borderRadius: 14, padding: "17px 0", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          Start Training
        </button>
      </div>
    </div>
  );
}
