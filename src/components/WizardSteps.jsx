import { COLORS } from "../theme.js";

// Progress rail shared by the two programme wizards — the manual builder
// and the guided one. Both walk a fixed list of named steps, so the only
// thing that differs is the labels.
export function WizardSteps({ labels, step }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "0 20px 14px" }}>
      {labels.map((lbl, i) => (
        <div key={lbl} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ height: 4, borderRadius: 2, background: i <= step ? COLORS.accent : COLORS.line, marginBottom: 5 }} />
          <div style={{ fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: "uppercase", color: i <= step ? COLORS.accent : COLORS.textDim }}>
            {lbl}
          </div>
        </div>
      ))}
    </div>
  );
}
