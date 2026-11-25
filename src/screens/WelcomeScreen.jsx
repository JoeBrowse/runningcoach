import { useState } from "react";
import { Check } from "lucide-react";
import { UNLOCKED_BUILD } from "../lib/billing.js";
import { APP_MODES } from "../lib/settings.js";
import { hexToRgba, COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   FIRST LAUNCH

   The very first decision, before the tour and before the app proper:
   Simple or Advanced. Burying it in Settings meant most people never
   found Advanced Mode at all, and the tour kept having to apologise for
   describing features that were switched off.

   The tier table lives here too. Someone deciding whether to keep an app
   is owed a plain answer about what the trial includes and what the
   one-off unlock costs, up front rather than at the moment it locks.
--------------------------------------------------------------- */

const TIER_ROWS = [
  ["Log sets, reps and weight", true, true],
  ["Full exercise database", true, true],
  ["Muscle readiness map", true, true],
  ["Programmes and guided plans", true, true],
  ["Progress charts and history", true, true],
  ["Backups", true, true],
  ["Works after day 7", false, true],
];

export function TierTable() {
  const cell = { padding: "9px 6px", fontSize: 12, textAlign: "center" };
  const mark = (on) =>
    on ? (
      <Check size={14} color={COLORS.ok} />
    ) : (
      <span style={{ color: COLORS.textDim, fontSize: 13 }}>—</span>
    );
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px", alignItems: "center", background: COLORS.surfaceRaised, borderBottom: `1px solid ${COLORS.line}` }}>
        <div style={{ ...cell, textAlign: "left", paddingLeft: 13, color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase" }}>
          What you get
        </div>
        <div style={{ ...cell, color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase" }}>
          Trial
        </div>
        <div style={{ ...cell, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 11, textTransform: "uppercase" }}>
          Subscribed
        </div>
      </div>
      {TIER_ROWS.map(([label, free, paid], i) => (
        <div
          key={label}
          style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px", alignItems: "center", borderBottom: i === TIER_ROWS.length - 1 ? "none" : `1px solid ${COLORS.line}` }}
        >
          <div style={{ ...cell, textAlign: "left", paddingLeft: 13, color: COLORS.text, lineHeight: 1.35 }}>{label}</div>
          <div style={cell}>{mark(free)}</div>
          <div style={{ ...cell, background: hexToRgba(COLORS.accent, 0.07) }}>{mark(paid)}</div>
        </div>
      ))}
      <div style={{ padding: "10px 13px", borderTop: `1px solid ${COLORS.line}`, color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45 }}>
        All features are free for 7 days. After that, you need a subscription. You can pay monthly or annually. You can cancel at any time in Google Play. There is no account and there are no ads. Your data does not leave your phone in either case.
      </div>
    </div>
  );
}

export function WelcomeScreen({ onChoose }) {
  const [picked, setPicked] = useState(null);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 220, background: COLORS.bg, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "44px 22px 16px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8 }}>
          Iron Log
        </div>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 30, textTransform: "uppercase", lineHeight: 1.1, letterSpacing: 0.5, marginBottom: 10 }}>
          How much do you want on screen?
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 13.5, lineHeight: 1.5, marginBottom: 22 }}>
          Select one mode to start. You can change it at any time in Settings. You do not lose data when you change it.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {APP_MODES.map((m) => {
            const active = picked === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setPicked(m.value)}
                style={{
                  textAlign: "left",
                  background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface,
                  border: `1px solid ${active ? COLORS.accent : COLORS.line}`,
                  borderRadius: 14,
                  padding: "15px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  <div
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: "50%",
                      flexShrink: 0,
                      border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`,
                      background: active ? COLORS.accent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && <Check size={11} color={COLORS.onAccent} />}
                  </div>
                  <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 17, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {m.label}
                  </span>
                </div>
                <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.45, paddingLeft: 26 }}>{m.desc}</div>
              </button>
            );
          })}
        </div>

        {!UNLOCKED_BUILD && <TierTable />}
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: `14px 22px calc(18px + env(safe-area-inset-bottom, 0px))`, background: `linear-gradient(to top, ${COLORS.bg} 65%, transparent)` }}>
        <button
          onClick={() => onChoose(picked)}
          disabled={!picked}
          style={{
            width: "100%",
            maxWidth: 460,
            margin: "0 auto",
            display: "block",
            background: picked ? COLORS.accent : COLORS.surfaceRaised,
            border: picked ? "none" : `1px solid ${COLORS.line}`,
            borderRadius: 14,
            padding: "17px 0",
            color: picked ? COLORS.onAccent : COLORS.textDim,
            fontFamily: "'Oswald', sans-serif",
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {picked ? "Continue" : "Pick one to continue"}
        </button>
      </div>
    </div>
  );
}
