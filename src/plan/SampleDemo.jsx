import { useMemo, useState } from "react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { localToday, todayInfoFor, gymLabel } from "./planState.js";
import { Screen, Card, Notice, Label, Btn, WorkoutShape, StepsList, dayLine, st, WEEK_ORDER } from "./ui.jsx";
import { PlanResult } from "./PlanSetup.jsx";

/* ---------------------------------------------------------------
   TRY WITH SAMPLE DATA (Settings only)

   A read-only look at a sample plan. The sample lives in memory on
   this screen only. Nothing is saved, so it never mixes with real
   data. Close the screen to clear it.
--------------------------------------------------------------- */

export function SampleDemo({ nav }) {
  const today = localToday();
  const sample = useMemo(() => engine.sample(today), [today]);
  const [wi, setWi] = useState(0);
  const plan = sample.plan;
  const info = todayInfoFor(plan, today, null);
  const show = info.run || info.nextRun;
  const week = plan.weeks[wi];
  return (
    <Screen title="Sample plan" onBack={nav.back} testId="sample-demo">
      <Notice testId="sample-note" title="Sample data">
        This is a sample runner ({sample.profile.name}). Nothing here is saved. Your own data does not change. Close this screen to clear the sample.
      </Notice>
      {show && (
        <Card accent>
          <div style={st.label()}>{info.run ? `Today · ${engine.fmtDate(today)}` : `Next run · ${engine.fmtDate(show.iso)}`}</div>
          <div style={{ ...st.title(18), margin: "4px 0 8px" }}>{show.title}</div>
          <WorkoutShape workout={show} paces={plan.paces} />
          <div style={{ ...st.text(), marginTop: 8 }}>{show.effortText}</div>
          <div style={{ marginTop: 6 }}>
            <StepsList workout={show} units="km" showPace />
          </div>
          <div style={{ ...st.body(), marginTop: 6 }}>{show.why}</div>
        </Card>
      )}
      <Label>Week {week.n}</Label>
      <Card>
        {week.days.map((d, i) => (
          <div key={d.iso} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: i ? `1px solid ${COLORS.line}` : "none", fontSize: 13, color: COLORS.text }}>
            <span style={{ ...st.mono(11.5), color: COLORS.textDim, width: 34 }}>{engine.DAY_NAMES[WEEK_ORDER[i]]}</span>
            <span style={{ flex: 1 }}>
              {dayLine(d)}
              {d.gym ? ` · Gym: ${gymLabel(d.gym)}` : ""}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn small kind="secondary" disabled={wi === 0} onClick={() => setWi(wi - 1)}>Previous week</Btn>
          <Btn small kind="secondary" disabled={wi >= plan.weeks.length - 1} onClick={() => setWi(wi + 1)}>Next week</Btn>
        </div>
      </Card>
      <PlanResult plan={plan} units="km" jargon />
    </Screen>
  );
}
