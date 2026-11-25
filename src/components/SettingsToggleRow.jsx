import { COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   SETTINGS
--------------------------------------------------------------- */

export function SettingsToggleRow({ label, desc, value, onToggle }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase" }}>{label}</div>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2 }}>{desc}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          background: value ? COLORS.accent : COLORS.surfaceRaised,
          border: `1px solid ${value ? COLORS.accent : COLORS.line}`,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            background: value ? COLORS.onAccent : COLORS.textDim,
            position: "absolute",
            top: 2,
            left: value ? 21 : 2,
            transition: "left 0.15s",
          }}
        />
      </button>
    </div>
  );
}
