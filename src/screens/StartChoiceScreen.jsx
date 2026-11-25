import { ChevronRight, Plus, Dumbbell, Play } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   PROGRAMME SCREENS
--------------------------------------------------------------- */

export function StartChoiceScreen({ hasActive, activeName, nextDayName, onContinue, onNew, onFree, onBack }) {
  const card = { width: "100%", textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 14 };
  const iconWrap = (active) => ({ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: active ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: active ? COLORS.onAccent : COLORS.textDim });
  const title = { color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 17, textTransform: "uppercase" };
  const sub = { color: COLORS.textDim, fontSize: 12.5, marginTop: 2 };
  return (
    <div>
      <TopBar title="Start Workout" onBack={onBack} />
      <div style={{ padding: "4px 20px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        {hasActive && (
          <button onClick={onContinue} style={{ ...card, borderColor: COLORS.accent, background: hexToRgba(COLORS.accent, 0.08) }}>
            <div style={iconWrap(true)}><Play size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={title}>Continue Programme</div>
              <div style={sub}>{activeName}{nextDayName ? ` · next: ${nextDayName}` : ""}</div>
            </div>
            <ChevronRight size={18} color={COLORS.textDim} />
          </button>
        )}
        <button onClick={onNew} style={card}>
          <div style={iconWrap(false)}><Plus size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={title}>New Programme</div>
            <div style={sub}>Select a split and your exercises. Then follow the programme for weeks.</div>
          </div>
          <ChevronRight size={18} color={COLORS.textDim} />
        </button>
        <button onClick={onFree} style={card}>
          <div style={iconWrap(false)}><Dumbbell size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={title}>Free Mode</div>
            <div style={sub}>A single workout. You choose the exercises.</div>
          </div>
          <ChevronRight size={18} color={COLORS.textDim} />
        </button>
        {hasActive && (
          <div style={{ color: COLORS.textDim, fontSize: 11.5, textAlign: "center", marginTop: 6, lineHeight: 1.5 }}>
            If you start a new programme, the app moves your current programme to Finished Programmes.
          </div>
        )}
      </div>
    </div>
  );
}
