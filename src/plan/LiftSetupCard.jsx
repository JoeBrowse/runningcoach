import { useEffect, useState } from "react";
import { X, ClipboardList, Sparkles } from "lucide-react";
import { COLORS } from "../theme.js";
import { KEYS, getKey, setKey } from "../shared/store.js";
import { Btn, Segmented, st } from "./ui.jsx";
import { guidedPrefill, LIFT_LEVELS } from "./weekSetup.js";

/* ---------------------------------------------------------------
   SET UP LIFTING (spec v1.1 section 2)

   On Lift home until lifting is set up: the level (Beginner,
   Intermediate, Advanced), then "Enter my current plan" (the programme
   builder) or "Make a plan for me" (the guided wizard, pre-filled from
   the level, the lift days of the master week and the split).

   Lifting is set up when a programme is active (Iron Log stores it in
   "active-programme", lib/programmes.js) or when the user made one
   with this card ("lift-setup-done"). The X hides the card.
--------------------------------------------------------------- */

export const LIFT_SETUP_DONE_KEY = "lift-setup-done";
export const LIFT_SETUP_HIDDEN_KEY = "lift-setup-card-dismissed";

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export function LiftSetupCard({ activeProgramme, reloadKey, onEnterPlan, onMakePlan }) {
  const [ctx, setCtx] = useState(null);
  const [level, setLevel] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([getKey(KEYS.masterPlan, null), getKey(KEYS.runProfile, null), getKey(LIFT_SETUP_DONE_KEY, false), getKey(LIFT_SETUP_HIDDEN_KEY, false)]).then(([master, profile, done, hidden]) => {
      if (!live) return;
      setCtx({ master, profile, done: !!done, hidden: !!hidden });
      setLevel((l) => l || (profile && LIFT_LEVELS.includes(profile.liftLevel) ? profile.liftLevel : "beginner"));
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  if (!ctx || activeProgramme || ctx.done || ctx.hidden) return null;
  const prefill = guidedPrefill(ctx.master, level);

  async function saveLevel() {
    const p = (await getKey(KEYS.runProfile, null)) || {};
    if (p.liftLevel !== level) await setKey(KEYS.runProfile, { ...p, liftLevel: level });
  }

  return (
    <div data-testid="setup-lifting" style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={st.title(18)}>Set up lifting</div>
          <div style={{ ...st.body(), margin: "6px 0 12px" }}>
            {prefill.sessions > 0
              ? `Your week has ${prefill.sessions} lift ${prefill.sessions === 1 ? "day" : "days"}. Enter your plan, or let the app make one.`
              : "Enter your plan, or let the app make one."}
          </div>
        </div>
        <button
          aria-label="Hide"
          data-testid="setup-lifting-hide"
          onClick={async () => {
            await setKey(LIFT_SETUP_HIDDEN_KEY, true);
            setCtx({ ...ctx, hidden: true });
          }}
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim, flexShrink: 0 }}
        >
          <X size={18} />
        </button>
      </div>
      <div style={{ ...st.label(), marginBottom: 6 }}>1. Your level</div>
      <Segmented testId="lift-level" value={level} onChange={setLevel} options={LIFT_LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))} />
      <div style={{ ...st.label(), margin: "14px 0 6px" }}>2. Your plan</div>
      <div style={{ display: "grid", gap: 8 }}>
        <Btn
          kind="secondary"
          testId="lift-enter-plan"
          onClick={async () => {
            await saveLevel();
            onEnterPlan(level);
          }}
        >
          <ClipboardList size={16} /> Enter my current plan
        </Btn>
        <Btn
          testId="lift-make-plan"
          onClick={async () => {
            await saveLevel();
            onMakePlan(prefill, level);
          }}
        >
          <Sparkles size={16} /> Make a plan for me
        </Btn>
      </div>
      {prefill.splitLabel && <div style={{ ...st.body(), fontSize: 12, marginTop: 8 }}>A plan from the app uses the split of your week: {prefill.splitLabel.toLowerCase()}.</div>}
    </div>
  );
}
