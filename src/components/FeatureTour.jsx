import { useEffect } from "react";
import { TOUR_STEPS } from "../data/tourSteps.jsx";
import { hexToRgba, COLORS } from "../theme.js";

// Brings the element a step refers to into the band above the tour text, so
// the thing being described is actually on screen when it is described.
//
// It deliberately does not measure the target or draw anything around it.
// Three attempts at a spotlight ring all produced highlights that landed in
// the wrong place on some steps, and a box drawn around the wrong thing is
// worse than no box at all — it tells the reader to look somewhere the text
// isn't talking about. Scrolling is the part that was always working.
function useScrollTourTargetIntoView(targetKey) {
  useEffect(() => {
    if (!targetKey) return undefined;
    let frame = null;
    let found = false;
    function bring() {
      const el = document.querySelector(`[data-tour="${targetKey}"]`);
      if (!el) return;
      found = true;
      const r = el.getBoundingClientRect();
      // The text panel owns roughly the bottom half, so aim for the middle
      // of the band above it rather than the middle of the screen.
      const safeCenter = window.innerHeight * 0.26;
      if (r.top < 56 || r.bottom > window.innerHeight * 0.52) {
        window.scrollBy({ top: r.top + r.height / 2 - safeCenter, behavior: "smooth" });
      }
    }
    bring();
    // The target usually does not exist on the render where stepIndex
    // changes — App() navigates to the step's screen in its own effect a
    // beat later, mounting the target after this one runs.
    const observer = new MutationObserver(() => {
      if (found) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(bring);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetKey]);
}

// Controlled by App() — stepIndex/onNext/onPrev/onSkip live there so the
// same step change that advances the card also drives navigation.
// `steps` is TOUR_STEPS (full tour) or SIMPLE_TOUR_STEPS (4 cards).
export function FeatureTour({ steps = TOUR_STEPS, stepIndex, onNext, onPrev, onSkip }) {
  const step = steps[stepIndex] || steps[0];
  const last = stepIndex >= steps.length - 1;
  useScrollTourTargetIntoView(step.target);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      {/* Nothing is drawn over the screen. The old spotlight dimmed the app
          with a 9999px box-shadow, and because it was position:fixed while
          the panel below is not, that shadow painted on top of the panel —
          which is why the text read as greyed on exactly the steps that had
          a target. No overlay, no ring, no dimming: the real screen, and the
          text explaining it. This transparent layer only stops taps reaching
          the app mid-tour, which would desync the step-driven navigation. */}
      <div
        style={{
          width: "100%",
          maxWidth: 412,
          // Without this the horizontal padding is added on top of the full
          // width, pushing the card wider than the screen and cutting the
          // Skip link and the Next button off the right edge.
          boxSizing: "border-box",
          // Fully opaque and flush to the bottom edge. Nothing translucent
          // anywhere in the tour any more, so the copy is always at full
          // contrast whatever is behind it.
          background: COLORS.bg,
          borderTop: `1px solid ${COLORS.line}`,
          padding: "18px 22px calc(22px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
            {stepIndex + 1} / {steps.length}
          </div>
          <button onClick={onSkip} style={{ color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Skip
          </button>
        </div>

        <div style={{ width: 54, height: 54, borderRadius: 14, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${COLORS.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, marginBottom: 16 }}>
          {step.icon}
        </div>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 22, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          {step.title}
        </div>
        <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.55, marginBottom: 18, minHeight: 84 }}>
          {step.body}
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
          {steps.map((_, idx) => (
            <div key={idx} style={{ flex: 1, height: 3, borderRadius: 2, background: idx <= stepIndex ? COLORS.accent : COLORS.surfaceRaised }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {stepIndex > 0 && (
            <button onClick={onPrev} style={{ flex: "0 0 auto", padding: "13px 18px", borderRadius: 12, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase" }}>
              Back
            </button>
          )}
          <button onClick={() => (last ? onSkip() : onNext())} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: COLORS.accent, color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {last ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
