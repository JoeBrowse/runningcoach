import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { PROGRAMME_PRESETS, GUIDED_EXPERIENCE_OPTIONS, GUIDED_DURATION_OPTIONS } from "../data/programmes.js";
import { SPLITS } from "../data/splits.js";
import { buildGuidedDays, guidedRecommendations } from "../lib/programmes.js";
import { safeGet } from "../lib/storage.js";
import { DURATION_EXERCISE_COUNTS } from "../lib/workoutBuilder.js";
import { hexToRgba, COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { WizardSteps } from "../components/WizardSteps.jsx";

/* ---------------------------------------------------------------
   GUIDED PROGRAMME WIZARD
   Questionnaire (0) → recommendations (1) → generated programme
   preview (2), reachable from the "Guided" card on the programme
   builder's split-choice step. Accept creates it immediately; decline
   drops the user back at the normal builder to make their own.
--------------------------------------------------------------- */

export function GuidedProgrammeWizard({ onBack, onCreate, onDecline }) {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState(null);
  const [duration, setDuration] = useState(null);
  const [focusMuscles, setFocusMuscles] = useState(new Set());
  const [bodyweightKg, setBodyweightKg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bw = await safeGet("bodyweight");
      if (cancelled || !bw || !bw.value) return;
      const kg = bw.unit === "lb" ? Number(bw.value) * 0.453592 : Number(bw.value);
      setBodyweightKg(kg);
    })();
    return () => { cancelled = true; };
  }, []);

  function toggleFocus(m) {
    setFocusMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  }

  const canContinue = !!experience && !!duration;
  const preset = experience ? PROGRAMME_PRESETS.find((p) => p.key === GUIDED_EXPERIENCE_OPTIONS.find((o) => o.value === experience).presetKey) : null;
  const exerciseCount = duration ? DURATION_EXERCISE_COUNTS[duration] : null;
  const generatedDays = step === 2 && preset ? buildGuidedDays(preset, exerciseCount, [...focusMuscles]) : [];

  function accept() {
    const programme = {
      id: `prog-${Date.now()}`,
      name: `Guided — ${preset.name}`,
      presetKey: preset.key,
      createdAt: new Date().toISOString(),
      weeks: 6,
      days: generatedDays.map((d) => ({ key: d.key, name: d.name, muscles: d.muscles, exercises: d.exercises })),
      log: [],
    };
    onCreate(programme);
  }

  const stepLabels = ["Questions", "Recommendations", "Your Programme"];

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Guided Programme" onBack={step === 0 ? onBack : () => setStep(step - 1)} />

      <WizardSteps labels={stepLabels} step={step} />

      <div style={{ padding: "0 20px" }}>
        {step === 0 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              How new are you to training?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {GUIDED_EXPERIENCE_OPTIONS.map((opt) => {
                const active = experience === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setExperience(opt.value)}
                    style={{ textAlign: "left", background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: 14 }}
                  >
                    <div style={{ color: active ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>{opt.label}</div>
                    <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 3 }}>{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              How long do you want to work out?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
              {GUIDED_DURATION_OPTIONS.map((d) => {
                const active = duration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    style={{ padding: "14px 0", borderRadius: 12, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surface, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase" }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              Anything you want to improve most?
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 10 }}>Optional — pick as many as you like, or skip this.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {SPLITS["Full Body"].map((m) => {
                const active = focusMuscles.has(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleFocus(m)}
                    style={{ padding: "9px 14px", borderRadius: 999, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surface, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!canContinue}
              style={{ width: "100%", background: canContinue ? COLORS.accent : COLORS.surfaceRaised, border: "none", borderRadius: 12, padding: "14px 0", color: canContinue ? COLORS.onAccent : COLORS.textDim, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              See My Recommendations
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>
              A few things worth knowing before you start.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {guidedRecommendations(experience, bodyweightKg).map((rec) => (
                <div key={rec.title} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{rec.title}</div>
                  <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.55 }}>{rec.body}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 12, padding: "14px 0", color: COLORS.onAccent, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Show My Programme
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>
              Based on your answers, here's what Iron Log recommends.
            </div>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 19, textTransform: "uppercase", marginBottom: 4 }}>{preset.name}</div>
              <div style={{ color: COLORS.textDim, fontSize: 12.5, marginBottom: 14 }}>{preset.blurb}</div>
              {generatedDays.map((d) => (
                <div key={d.key} style={{ borderTop: `1px solid ${COLORS.line}`, padding: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase" }}>{d.name}</span>
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{d.exercises.length} ex</span>
                  </div>
                  <div style={{ color: COLORS.textDim, fontSize: 12 }}>{d.exercises.map((e) => e.name).join(" · ")}</div>
                </div>
              ))}
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: "center", marginBottom: 20 }}>
              6-week block · {generatedDays.length} day{generatedDays.length === 1 ? "" : "s"} · you can edit any exercise once it's created.
            </div>
            <button
              onClick={accept}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: COLORS.accent, border: "none", borderRadius: 12, padding: "16px 0", color: COLORS.onAccent, fontSize: 15, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}
            >
              <Check size={18} /> Accept This Programme
            </button>
            <button
              onClick={onDecline}
              style={{ width: "100%", background: "transparent", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 0", color: COLORS.textDim, fontSize: 13.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
            >
              Not For Me — Build My Own
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
