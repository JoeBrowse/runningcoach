import { COLORS } from "../theme.js";
import { ModeHeader } from "../modes/ModeHeader.jsx";

/* Placeholder home for Plan mode. The Plan builder replaces the body.
   Keep the ModeHeader at the top. `nav` is described in
   src/modes/README.md. */
export function PlanHome({ nav }) {
  return (
    <div data-testid="plan-home" style={{ padding: "28px 24px 40px" }}>
      <ModeHeader mode={nav.mode} onModeChange={nav.setMode} onViewSettings={nav.openSettings} />
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 22, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Plan
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 13.5, lineHeight: 1.5 }}>
        Plan mode. Your week of runs and gym days comes here.
      </div>
    </div>
  );
}
