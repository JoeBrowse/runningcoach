import { COLORS } from "../../theme.js";

/* Shared inline styles for the Data screen and the history import.
   Functions, not constants: COLORS changes in place when the theme
   changes, so each render must read it again. */

export const card = () => ({ margin: "0 20px 12px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 });

export const cardTitle = () => ({ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 });

export const sectionLabel = () => ({ padding: "8px 20px 8px", color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" });

export const body = () => ({ color: COLORS.textDim, fontSize: 12, lineHeight: 1.45 });

export const legend = () => ({ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 });

export const mono = () => ({ fontFamily: "'JetBrains Mono', monospace" });

export const field = () => ({
  width: "100%",
  background: COLORS.surfaceRaised,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  color: COLORS.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  padding: "9px 10px",
  boxSizing: "border-box",
  minWidth: 0,
});

const btnBase = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 10,
  padding: "12px 0",
  fontFamily: "'Oswald', sans-serif",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

export const primaryBtn = (disabled) => ({ ...btnBase, background: COLORS.accent, border: "none", color: COLORS.onAccent, opacity: disabled ? 0.6 : 1 });

export const secondaryBtn = (disabled) => ({ ...btnBase, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, opacity: disabled ? 0.6 : 1 });

export const resultBox = (ok) => ({ marginTop: 12, background: COLORS.surfaceRaised, border: `1px solid ${ok ? COLORS.ok : COLORS.bad}`, borderRadius: 10, padding: "10px 12px" });

export const resultTitle = (ok) => ({ color: ok ? COLORS.ok : COLORS.bad, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 });

export const resultDetail = () => ({ color: COLORS.textDim, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" });

export const fmtInt = (n) => (Number(n) || 0).toLocaleString("en-GB");
