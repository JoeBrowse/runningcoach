import { ChevronRight, History as HistoryIcon, Lock, RotateCcw, Sparkles, BookOpen } from "lucide-react";
import { APP_VERSION, releaseNotesFor } from "../data/releaseNotes.js";
import { UNLOCKED_BUILD, isLicenseUnlocked, manageSubscriptionUrl } from "../lib/billing.js";
import { APP_MODES } from "../lib/settings.js";
import { hexToRgba, COLORS } from "../theme.js";
import { BackupPanel } from "../components/BackupPanel.jsx";
import { SettingsToggleRow } from "../components/SettingsToggleRow.jsx";
import { TopBar } from "../components/TopBar.jsx";

export function SettingsScreen({ settings, onChange, onBack, onViewColour, onViewTraining, onReplayTour, onViewFeatureList, onViewWhatsNew, onViewVersionHistory, license, onBuy, onRestore, purchaseBusy, purchaseMsg }) {
  function toggle(key) {
    onChange({ ...settings, [key]: !settings[key] });
  }

  // These three ship OFF so a first workout stays uncluttered — grouped
  // together and called out in the tour so they aren't easy to miss.
  const optInItems = [
    { key: "showCues", label: "Exercise Cues", desc: "Show the hypertrophy tip under each exercise." },
    { key: "showWarmups", label: "Warm-Up Suggestions", desc: "Suggest ramp-up sets before compound lifts." },
    { key: "includeMobility", label: "Mobility Finisher", desc: "Add a mobility/stretch exercise to the end of every built workout." },
  ];
  const items = [
    { key: "showLastSet", label: "Last Top Set", desc: "Show your last top set for each exercise." },
    { key: "showSetTicks", label: "Set Tick Boxes", desc: "Show the tick box beside every set and warm-up. Off is a cleaner list — what you type is still saved either way, but the rest timer stops starting itself." },
    { key: "showBodyMap", label: "Muscle Readiness Map", desc: "Show the body diagram on the home screen." },
    // Auto-start, sound and vibration moved to Training Defaults, next to
    // the rest lengths themselves — the timer is one subject, not three
    // switches scattered down a list.
    { key: "stravaShare", label: "Share to Strava", desc: "Add a share button when you finish a workout and on every past one. It builds your lifts into text, hands them to the share sheet, and opens Strava for you to paste into the activity." },
    { key: "randomizeSelection", label: "Randomize Exercise Selection", desc: "Off: pick exercises in ranked order. On: shuffle for variety." },
    { key: "showIntro", label: "Opening Animation", desc: "The geometric sequence when the app starts. Tap it to skip; turn it off here to go straight in. Skipped automatically if your phone is set to reduce motion." },
  ];

  const subscribed = isLicenseUnlocked(license);

  const appMode = settings.appMode === "advanced" ? "advanced" : "simple";

  return (
    <div>
      <TopBar title="Settings" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        Customize what shows up while you train.
      </div>

      <div data-tour="app-mode" style={{ padding: "0 20px 16px" }}>
        <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          App Mode
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {APP_MODES.map((m) => {
            const active = appMode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => onChange({ ...settings, appMode: m.value })}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surface, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.4 }}>
          {APP_MODES.find((m) => m.value === appMode).desc}
        </div>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <button
          onClick={onViewColour}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", textAlign: "left" }}
        >
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
              Colour &amp; Display
            </span>
            <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.4 }}>
              Light or dark, colour schemes for colour blindness, and high contrast.
            </span>
          </span>
          <ChevronRight size={16} color={COLORS.accent} style={{ flexShrink: 0 }} />
        </button>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <button
          data-tour="training-defaults"
          onClick={onViewTraining}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px", textAlign: "left" }}
        >
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
              Training Defaults
            </span>
            <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.4 }}>
              Rest lengths and alerts, sets per exercise, RIR or RPE, recovery pace, and how far back history goes.
            </span>
          </span>
          <ChevronRight size={16} color={COLORS.accent} style={{ flexShrink: 0 }} />
        </button>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <button
          data-tour="feature-list-btn"
          onClick={onViewFeatureList}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: hexToRgba(COLORS.accent, 0.1), border: `1px solid ${COLORS.accent}`, borderRadius: 12, padding: "13px 0", color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          <BookOpen size={15} /> Feature List
        </button>
        {/* The changelog shows itself once after an update, so it needs a
            permanent home for anyone who dismissed it too quickly. */}
        {releaseNotesFor(APP_VERSION) && (
          <button
            onClick={onViewWhatsNew}
            style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 0", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            <Sparkles size={14} color={COLORS.accent} /> What's New in {APP_VERSION}
          </button>
        )}
        <button
          data-tour="version-history-btn"
          onClick={onViewVersionHistory}
          style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 0", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          <HistoryIcon size={14} color={COLORS.accent} /> Version History
        </button>
      </div>

      <BackupPanel />

      {license && !UNLOCKED_BUILD && (
        <div style={{ margin: "10px 20px 20px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <Lock size={14} color={COLORS.accent} /> Subscription
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
            {subscribed
              ? "Iron Log is active on this device. Manage or cancel any time in Google Play — your workouts stay on your phone either way."
              : "Start a free trial to unlock everything. Cancel any time in Google Play."}
          </div>
          {!subscribed && (
            <button
              onClick={onBuy}
              disabled={purchaseBusy}
              style={{ width: "100%", marginBottom: 8, background: COLORS.accent, border: "none", borderRadius: 10, padding: "12px 0", color: COLORS.onAccent, fontSize: 13.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
            >
              {purchaseBusy ? "Working…" : "Start Free Trial"}
            </button>
          )}
          {/* Play requires cancellation to be reachable from inside the app,
              and hiding it is a listing rejection. */}
          {subscribed && (
            <a
              href={manageSubscriptionUrl()}
              target="_blank"
              rel="noreferrer"
              style={{ width: "100%", marginBottom: 8, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", textDecoration: "none" }}
            >
              Manage Subscription
            </a>
          )}
          <button
            onClick={onRestore}
            disabled={purchaseBusy}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
          >
            <RotateCcw size={13} /> Restore Subscription
          </button>
          {purchaseMsg && <div style={{ marginTop: 8, color: COLORS.textDim, fontSize: 11.5 }}>{purchaseMsg}</div>}
        </div>
      )}

      <div data-tour="opt-in-features" style={{ padding: "0 20px 10px" }}>
        <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          Off by default
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {optInItems.map((item) => (
            <SettingsToggleRow key={item.key} label={item.label} desc={item.desc} value={settings[item.key]} onToggle={() => toggle(item.key)} />
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <SettingsToggleRow key={item.key} label={item.label} desc={item.desc} value={settings[item.key]} onToggle={() => toggle(item.key)} />
        ))}
      </div>

      {onReplayTour && (
        <div style={{ padding: "0 20px 40px" }}>
          <button
            onClick={onReplayTour}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 0", color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            <Sparkles size={15} color={COLORS.accent} /> Replay App Tour
          </button>
        </div>
      )}

      {/* The readiness map ships someone else's artwork, and Apache 2.0 asks
          that the NOTICE travel with it. An installed APK has nowhere else to
          put that, so it lives at the foot of Settings alongside the version. */}
      <div style={{ padding: "0 20px 40px", textAlign: "center" }}>
        <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>Iron Log v{APP_VERSION}</div>
        <div style={{ color: COLORS.textDim, fontSize: 10.5, marginTop: 6, opacity: 0.8, lineHeight: 1.5 }}>
          Muscle map artwork from Body Muscles, © 2024 Ivan Vulović,
          used under the Apache License 2.0.
          <br />
          github.com/vulovix/body-muscles
        </div>
      </div>
    </div>
  );
}
