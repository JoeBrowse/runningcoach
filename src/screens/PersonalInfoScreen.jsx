import { COLORS } from "../theme.js";
import { MeasurementsPanel } from "../components/MeasurementsPanel.jsx";
import { PersonalStatsPanel } from "../components/PersonalStatsPanel.jsx";
import { TopBar } from "../components/TopBar.jsx";
import { WeightTrackingPanel } from "../components/WeightTrackingPanel.jsx";

/* ---------------------------------------------------------------
   PERSONAL INFO SCREEN
--------------------------------------------------------------- */

export function PersonalInfoScreen({ onBack }) {
  return (
    <div>
      <TopBar title="Personal Info" onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13 }}>
        Your weight, height, age and tape measurements. Weight is shared with the rest of the app for bodyweight-based calculations.
      </div>
      <div style={{ padding: "0 20px 40px" }}>
        <PersonalStatsPanel />
        <div data-tour="weight-tracking" style={{ marginTop: 12 }}>
          <WeightTrackingPanel />
        </div>
        <div style={{ marginTop: 12 }}>
          <MeasurementsPanel />
        </div>
      </div>
    </div>
  );
}
