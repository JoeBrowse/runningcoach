import { useEffect, useState } from "react";
import { Dumbbell, Check } from "lucide-react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { todayInfo, gymLabel, ranWithinHours } from "./planState.js";

/* ---------------------------------------------------------------
   TODAY'S GYM SESSION ON LIFT HOME

   One small card: "Today: Legs (heavy)", the note, the plan advice
   (for example "Race week: no heavy lifting.") and one warm-up line.
   It reads the master week and the plan. Nothing shows on a day
   without a planned gym session.
--------------------------------------------------------------- */

export function liftWarmupLine(w) {
  if (!w) return "";
  const names = w.phases.map((p) => p.title).join(", ");
  return `Warm-up${w.minutes ? ` ${w.minutes} min` : ""}: ${names}.`;
}

export function LiftToday({ reloadKey }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let off = false;
    Promise.all([todayInfo(), ranWithinHours(2)])
      .then(([info, afterRun]) => {
        if (!off) setState({ gym: info.gym, run: info.run, afterRun });
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [reloadKey]);
  if (!state || !state.gym) return null;
  const g = state.gym;
  const warm = engine.liftWarmup({ afterRun: state.afterRun, heavy: g.intensity === "heavy" && g.advice === "normal" });
  return (
    <div data-testid="lift-today" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Dumbbell size={16} color={COLORS.accent} />
        <span style={{ flex: 1, color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 }}>Today: {gymLabel(g)}</span>
        {g.done && <Check size={16} color={COLORS.ok} />}
      </div>
      {g.note && <div style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 3 }}>{g.note}</div>}
      {g.advice && g.advice !== "normal" && <div style={{ color: COLORS.accent, fontSize: 12.5, marginTop: 3 }}>{g.reason}</div>}
      {state.run && <div style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 3 }}>Also today: {state.run.title}.</div>}
      <div data-testid="lift-today-warmup" style={{ color: COLORS.textDim, fontSize: 12.5, marginTop: 3 }}>{liftWarmupLine(warm)}</div>
    </div>
  );
}
