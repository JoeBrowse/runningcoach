import { Plus, Minus } from "lucide-react";
import { EFFORT_SCALES, effortScaleOf } from "../lib/effort.js";
import { REST_RANGE, restSecondsFor, formatTime } from "../lib/rest.js";
import { RECOVERY_PACES } from "../lib/settings.js";
import { hexToRgba, COLORS, effortColor } from "../theme.js";
import { SettingsToggleRow } from "../components/SettingsToggleRow.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   TRAINING DEFAULTS
   The numbers the app was choosing on the lifter's behalf: how long a
   rest is, how many set rows an exercise opens with, how fast a muscle
   is treated as recovering, and how far back the per-exercise history
   goes. Every one of them shipped as a single hardcoded value that was
   right for most people and wrong for some.

   They live on their own screen rather than as four more rows on
   Settings. Settings is a list you scan for the one switch you came
   for, and that only works while it stays a list of switches — a
   number you nudge up and down is a different kind of control and
   dilutes it. Two toggles that were only ever about the rest timer
   came here too, so all of resting is in one place and the main list
   is shorter than it was.
--------------------------------------------------------------- */

// A number you nudge rather than type. A gym phone is held one-handed
// and often through a sleeve, so the targets are big and there is no
// keyboard to dismiss.
function StepperRow({ label, desc, value, display, onChange, min, max, step }) {
  const btn = (dir, icon, disabled) => (
    <button
      onClick={() => onChange(Math.min(max, Math.max(min, value + dir * step)))}
      disabled={disabled}
      aria-label={dir > 0 ? `Increase ${label}` : `Decrease ${label}`}
      style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: disabled ? COLORS.surface : COLORS.surfaceRaised,
        border: `1px solid ${disabled ? COLORS.line : COLORS.accent}`,
        color: disabled ? COLORS.textDim : COLORS.accent,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase" }}>{label}</div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {btn(-1, <Minus size={16} />, value <= min)}
          <div style={{ minWidth: 54, textAlign: "center", color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>
            {display}
          </div>
          {btn(1, <Plus size={16} />, value >= max)}
        </div>
      </div>
    </div>
  );
}

// One row of mutually exclusive choices, with the chosen one explaining
// itself underneath so the difference is legible without tapping each.
function ChoiceRow({ label, options, value, onChange }) {
  const chosen = options.find((o) => o.value === value) || options[0];
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {options.map((o) => {
          const active = chosen.value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.3 }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45 }}>{chosen.desc}</div>
    </div>
  );
}

const HISTORY_DEPTHS = [10, 20, 50, 100, 250];

export function TrainingScreen({ settings, onChange, onBack }) {
  const set = (patch) => onChange({ ...settings, ...patch });
  const num = (key, fallback) => {
    const v = parseInt(settings[key], 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const depth = num("historyDepth", 20);
  const chosenScale = effortScaleOf(settings);
  const sectionLabel = {
    color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
  };
  const group = { padding: "0 20px 22px", display: "flex", flexDirection: "column", gap: 10 };

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Training Defaults" onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
        The app uses these values when you do not set different values. These settings do not change the data that you logged before.
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        <div style={sectionLabel}>Rest Timer</div>
      </div>
      <div style={group}>
        <StepperRow
          label="Compound Rest"
          desc="Squats, presses, rows, pull-ups and other exercises that work several muscles at the same time."
          value={restSecondsFor({ type: "compound" }, settings)}
          display={formatTime(restSecondsFor({ type: "compound" }, settings))}
          onChange={(v) => set({ restCompound: v })}
          min={REST_RANGE.min}
          max={REST_RANGE.max}
          step={REST_RANGE.step}
        />
        <StepperRow
          label="Isolation Rest"
          desc="Curls, raises, extensions, calf raises and other exercises that work one muscle with one joint."
          value={restSecondsFor({ type: "isolation" }, settings)}
          display={formatTime(restSecondsFor({ type: "isolation" }, settings))}
          onChange={(v) => set({ restIsolation: v })}
          min={REST_RANGE.min}
          max={REST_RANGE.max}
          step={REST_RANGE.step}
        />
        <SettingsToggleRow
          label="Auto-Start Rest Timer"
          desc="Start the countdown when you tick a set. If the tick boxes are hidden, start it when you enter the reps for a set."
          value={settings.autoRestTimer !== false}
          onToggle={() => set({ autoRestTimer: settings.autoRestTimer === false })}
        />
        <SettingsToggleRow
          label="Rest Timer Sound"
          desc="Play a beep when the rest timer finishes."
          value={settings.restTimerSound !== false}
          onToggle={() => set({ restTimerSound: settings.restTimerSound === false })}
        />
        <SettingsToggleRow
          label="Rest Timer Vibration"
          desc="Vibrate the phone when the rest timer finishes. A gym is loud and your phone is usually in a pocket. You can feel the vibration when you cannot hear the beep."
          value={settings.restVibrate !== false}
          onToggle={() => set({ restVibrate: settings.restVibrate === false })}
        />
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        <div style={sectionLabel}>Logging</div>
      </div>
      <div style={group}>
        <StepperRow
          label="Sets Per Exercise"
          desc="The number of empty rows that a new exercise shows. You can add more rows or leave rows empty."
          value={num("startingSets", 1)}
          display={String(num("startingSets", 1))}
          onChange={(v) => set({ startingSets: v })}
          min={1}
          max={10}
          step={1}
        />
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase", marginBottom: 4 }}>
            Effort Scale
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2, marginBottom: 10, lineHeight: 1.4 }}>
            Select how you record the effort of a set. In Advanced Mode, you record it on the circle next to each set. The two scales are the same measurement, counted from opposite ends. Thus this setting changes only the labels. The app does not change the data that you logged. If you change back, the app shows all of it again with no changes.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {EFFORT_SCALES.map((sc) => {
              const active = chosenScale.value === sc.value;
              return (
                <button
                  key={sc.value}
                  onClick={() => set({ effortScale: sc.value })}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.3 }}
                >
                  {sc.name}
                </button>
              );
            })}
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>
            {chosenScale.full} — {chosenScale.desc}
          </div>
          {/* The labels themselves, in the order they appear in the popout,
              so the difference is visible before committing to it. */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {chosenScale.options.map((o) => (
              <div
                key={o.value}
                title={o.desc}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${effortColor()}`, background: hexToRgba(effortColor(), 0.18), color: effortColor(), fontFamily: "'JetBrains Mono', monospace", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                {o.label}
              </div>
            ))}
            <span style={{ color: COLORS.textDim, fontSize: 11, marginLeft: 4, lineHeight: 1.35 }}>
              {chosenScale.sweep}
            </span>
          </div>
        </div>
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14.5, textTransform: "uppercase", marginBottom: 4 }}>
            History Kept Per Exercise
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2, marginBottom: 10, lineHeight: 1.4 }}>
            The number of past sessions of a lift that the progress chart and &ldquo;last time&rdquo; can use. Your workout history and calendar keep all sessions. This setting controls only the list for each exercise. A higher value starts to apply when you log. A lower value removes old sessions from the list at the next session of that lift.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {HISTORY_DEPTHS.map((d) => {
              const active = depth === d;
              return (
                <button
                  key={d}
                  onClick={() => set({ historyDepth: d })}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        <div style={sectionLabel}>Recovery</div>
      </div>
      <div style={group}>
        <ChoiceRow
          label="Recovery Pace"
          options={RECOVERY_PACES}
          value={settings.recoveryPace || "normal"}
          onChange={(v) => set({ recoveryPace: v })}
        />
        <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.5 }}>
          This setting changes the speed of the full readiness map. The chest still needs more time than the side delts. A hard set still needs more recovery than an easy set. The setting changes only how fast you go through these recovery times.
        </div>
      </div>
    </div>
  );
}
