import { useState } from "react";
import { ChevronLeft, Dumbbell, RotateCcw } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { TierTable } from "./WelcomeScreen.jsx";

/* ---------------------------------------------------------------
   PAYWALL
   Shown in place of any gated screen once the free trial has ended and
   the app hasn't been purchased (see ALLOWED_WHEN_LOCKED_SCREENS and
   setScreen() in App()). Home and Settings stay reachable regardless.
--------------------------------------------------------------- */

function PlanCard({ label, price, note, selected, onSelect, badge }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: selected ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface,
        border: `1.5px solid ${selected ? COLORS.accent : COLORS.line}`,
        borderRadius: 14, padding: "14px 16px", marginBottom: 10,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
          {badge && (
            <span style={{ background: COLORS.accent, color: COLORS.onAccent, fontSize: 9.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, borderRadius: 5, padding: "2px 6px" }}>{badge}</span>
          )}
        </div>
        {note && <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 3 }}>{note}</div>}
      </div>
      {/* Null while the store is still answering. Showing nothing beats
          showing a number we invented — the price is Play Console's, per
          country, and this screen only ever repeats what Play said. */}
      <div style={{ color: selected ? COLORS.accent : COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
        {price || "—"}
      </div>
    </button>
  );
}

export function PaywallScreen({ onBack, onBuy, onRestore, busy, message, offers, trialDays }) {
  const [plan, setPlan] = useState("annual");
  const annual = offers && offers.annual;
  const monthly = offers && offers.monthly;
  const days = trialDays || 7;

  return (
    <div style={{ padding: "20px 24px 40px", display: "flex", flexDirection: "column", minHeight: "100vh", boxSizing: "border-box" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", marginBottom: 30, alignSelf: "flex-start" }}>
        <ChevronLeft size={16} /> Home
      </button>

      <div style={{ width: 60, height: 60, borderRadius: 16, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${COLORS.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, marginBottom: 20 }}>
        <Dumbbell size={28} />
      </div>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 26, textTransform: "uppercase", lineHeight: 1.15, marginBottom: 10 }}>
        {days} days free
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        You get all features for {days} days. Cancel in Google Play during the trial and you do not pay. There are no ads and no account. Your data does not leave your phone.
      </div>

      <PlanCard
        label="Annual"
        price={annual && annual.price}
        note="You pay once a year"
        badge="Best value"
        selected={plan === "annual"}
        onSelect={() => setPlan("annual")}
      />
      <PlanCard
        label="Monthly"
        price={monthly && monthly.price}
        note="You pay every month"
        selected={plan === "monthly"}
        onSelect={() => setPlan("monthly")}
      />

      {/* The same table shown on first launch, so what the subscription
          buys is the same answer at both ends of the trial. */}
      <div style={{ margin: "12px 0 22px" }}>
        <TierTable />
      </div>

      <button
        onClick={() => onBuy(plan)}
        disabled={busy}
        style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 14, padding: "17px 0", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}
      >
        {busy ? "Working…" : `Start ${days}-Day Free Trial`}
      </button>
      <button
        onClick={onRestore}
        disabled={busy}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "15px 0", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase" }}
      >
        <RotateCcw size={14} /> Restore Subscription
      </button>
      {message && <div style={{ marginTop: 14, color: COLORS.textDim, fontSize: 12.5, textAlign: "center" }}>{message}</div>}
      <div style={{ marginTop: 16, color: COLORS.textDim, fontSize: 11, lineHeight: 1.55, textAlign: "center", opacity: 0.85 }}>
        The subscription renews automatically until you cancel it. You can manage or cancel it
        in Google Play at any time. Your workouts stay on your phone if you subscribe or not.
        Backup in Settings always works.
      </div>
    </div>
  );
}
