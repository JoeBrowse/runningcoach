import { ChevronRight, Trophy, History as HistoryIcon } from "lucide-react";
import { SPLITS } from "../data/splits.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

export function SplitScreen({ onBack, onPick, onCopyPrevious, onOneRMSession }) {
  return (
    <div>
      <TopBar title="Choose Split" onBack={onBack} />
      <div style={{ padding: "4px 20px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={onCopyPrevious}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px dashed ${COLORS.accent}`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HistoryIcon size={18} color={COLORS.accent} />
            <div>
              <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Copy Previous
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>Redo a past workout exactly as logged</div>
            </div>
          </div>
          <ChevronRight size={20} color={COLORS.accent} />
        </button>
        <button
          onClick={onOneRMSession}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px dashed ${COLORS.accent}`,
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Trophy size={18} color={COLORS.accent} />
            <div>
              <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                1RM Session
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>Guided max attempt, built from your 1RM goals</div>
            </div>
          </div>
          <ChevronRight size={20} color={COLORS.accent} />
        </button>
      </div>
      <div style={{ padding: "0 20px 4px", color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
        Or start fresh
      </div>
      <div style={{ padding: "10px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.keys(SPLITS).map((split, idx) => (
          <button
            key={split}
            data-tour={idx === 0 ? "split-list" : undefined}
            onClick={() => onPick(split)}
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 14,
              padding: "18px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left",
            }}
          >
            <div>
              <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 18, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {split}
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 3 }}>
                {SPLITS[split].join(" · ")}
              </div>
            </div>
            <ChevronRight size={20} color={COLORS.textDim} />
          </button>
        ))}
      </div>
    </div>
  );
}
