import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { stravaSummary, shareText, openStrava } from "../lib/share.js";
import { COLORS } from "../theme.js";

// One button, used on the finish screen and on any past workout. Two steps
// rather than one: share the text, then open Strava. Doing both on a single
// tap would launch Strava while the share sheet was still up, and the text
// has to be somewhere the user can paste from before Strava is any use.
export function StravaShareButton({ session, unit, compact }) {
  const [state, setState] = useState("idle");

  async function handleShare() {
    const result = await shareText("Workout", stravaSummary(session, unit));
    setState(result);
  }

  const label = {
    idle: "Share to Strava",
    shared: "Shared — open Strava",
    copied: "Copied — open Strava",
    failed: "Could not share",
  }[state];

  return (
    <div style={{ width: "100%" }}>
      <button
        data-testid="strava-text"
        onClick={state === "shared" || state === "copied" ? openStrava : handleShare}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: compact ? 8 : 12,
          padding: compact ? "9px 0" : "13px 0", color: COLORS.text,
          fontFamily: "'Oswald', sans-serif", fontSize: compact ? 12.5 : 13.5,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}
      >
        <TrendingUp size={compact ? 13 : 15} /> {label}
      </button>
      {state === "copied" && (
        <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
          The app copied your workout to the clipboard. Paste it into the description of the activity.
        </div>
      )}
      {state === "failed" && (
        <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
          This device cannot share or copy the workout. You can see the workout in History.
        </div>
      )}
    </div>
  );
}
