import { useState } from "react";
import { Settings as SettingsIcon, X, Check, ChevronDown } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { MODE_LIST } from "./modeList.js";

/* The top of every mode's home screen.

   Row 1: the logo (tap it to open the mode sheet) and the Settings button.
   Row 2: the segmented switch "Plan · Run · Lift".

   Props:
     mode            current mode id ("plan" | "run" | "lift")
     onModeChange    (id) => void
     onViewSettings  () => void (optional; no button when it is missing) */

export function ModeSwitch({ mode, onModeChange }) {
  return (
    <div
      role="tablist"
      aria-label="App mode"
      data-testid="mode-switch"
      style={{ display: "flex", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 3, gap: 3 }}
    >
      {MODE_LIST.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            data-testid={`mode-tab-${m.id}`}
            onClick={() => !active && onModeChange(m.id)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              background: active ? COLORS.accent : "transparent",
              color: active ? COLORS.onAccent : COLORS.textDim,
              fontFamily: "'Oswald', sans-serif",
              fontSize: 13.5,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function ModeSheet({ mode, onPick, onClose }) {
  return (
    <div
      data-testid="mode-sheet"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 412,
          boxSizing: "border-box",
          background: COLORS.bg,
          borderBottom: `1px solid ${COLORS.line}`,
          borderRadius: "0 0 18px 18px",
          padding: "calc(20px + env(safe-area-inset-top, 0px)) 20px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 3, textTransform: "uppercase" }}>Skid Marks</span>
          <button onClick={onClose} aria-label="Close" style={{ color: COLORS.textDim, display: "flex" }}>
            <X size={18} />
          </button>
        </div>
        {MODE_LIST.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              data-testid={`mode-sheet-${m.id}`}
              onClick={() => onPick(m.id)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface,
                border: `1px solid ${active ? COLORS.accent : COLORS.line}`,
                borderRadius: 14,
                padding: "13px 14px",
                marginBottom: 8,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: active ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 17, textTransform: "uppercase", letterSpacing: 0.8 }}>{m.label}</span>
                <span style={{ display: "block", color: COLORS.textDim, fontSize: 12, lineHeight: 1.45, marginTop: 2 }}>{m.desc}</span>
              </span>
              {active && <Check size={16} color={COLORS.accent} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ModeHeader({ mode, onModeChange, onViewSettings }) {
  const [sheet, setSheet] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button
          data-testid="mode-logo"
          onClick={() => setSheet(true)}
          aria-label="Change mode"
          style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 3, textTransform: "uppercase" }}
        >
          Skid Marks <ChevronDown size={14} />
        </button>
        {onViewSettings ? (
          <button
            onClick={onViewSettings}
            aria-label="Settings"
            style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <SettingsIcon size={17} color={COLORS.textDim} />
          </button>
        ) : (
          <div style={{ height: 38 }} />
        )}
      </div>
      <ModeSwitch mode={mode} onModeChange={onModeChange} />
      {sheet && (
        <ModeSheet
          mode={mode}
          onClose={() => setSheet(false)}
          onPick={(id) => {
            setSheet(false);
            if (id !== mode) onModeChange(id);
          }}
        />
      )}
    </div>
  );
}
