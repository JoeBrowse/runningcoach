import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { listActivities, getRunSettings, setRunSettings } from "../shared/store.js";
import { dailyLoads, loadSummary, runnerMaxHR } from "../shared/load.js";
import { FormGauge } from "../components/FormGauge.jsx";
import { gymLabel } from "./planState.js";
import { Screen, Card, Btn, Label, Loading, Notice, usePlanData, dayLine, st, monoFont } from "./ui.jsx";

/* ---------------------------------------------------------------
   WEEKLY REVIEW (Sunday or Monday)

   Last week: planned against done, for runs and lifts. The load
   trend (shared/load.js only). Next week. Then Accept.
--------------------------------------------------------------- */

const isRunType = (t) => /run|jog|trail|treadmill/i.test(t || "");

export function weekReview(plan, activities, weekStart) {
  const end = engine.addDays(weekStart, 6);
  const inWeek = activities.filter((a) => a.date >= weekStart && a.date <= end);
  const runsDone = inWeek.filter((a) => a.source === "activity" && isRunType(a.type));
  const liftsDone = inWeek.filter((a) => a.source === "lift");
  const other = inWeek.filter((a) => a.source === "activity" && !isRunType(a.type));
  const week = plan ? plan.weeks.find((w) => w.startIso === weekStart) : null;
  const days = week ? week.days : [];
  const runDates = new Set(runsDone.map((a) => a.date));
  const liftDates = new Set(liftsDone.map((a) => a.date));
  const rows = days.map((d) => ({
    d,
    run: engine.isRun(d) ? { planned: true, done: !!d.done || runDates.has(d.iso) } : null,
    gym: d.gym ? { planned: true, done: !!d.gymDone || liftDates.has(d.iso) } : null,
  }));
  return {
    week,
    rows,
    runsPlanned: rows.filter((r) => r.run).length,
    runsDoneCount: rows.filter((r) => r.run && r.run.done).length,
    gymPlanned: rows.filter((r) => r.gym).length,
    gymDoneCount: rows.filter((r) => r.gym && r.gym.done).length,
    runsDone,
    liftsDone,
    other,
    km: Math.round(runsDone.reduce((s, a) => s + (a.km || 0), 0) * 10) / 10,
    plannedKm: week ? week.km : 0,
  };
}

function Mark({ ok }) {
  return ok ? <Check size={15} color={COLORS.ok} /> : <X size={15} color={COLORS.textDim} />;
}

function LoadBars({ activities, today, options }) {
  const byDay = dailyLoads(activities, options || {});
  const monday = engine.mondayOf(today);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = engine.addDays(monday, -7 * (7 - i));
    let sum = 0;
    for (let k = 0; k < 7; k++) sum += byDay[engine.addDays(start, k)] || 0;
    return { start, load: Math.round(sum) };
  });
  const max = Math.max(1, ...weeks.map((w) => w.load));
  return (
    <div data-testid="load-bars">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
        {weeks.map((w, i) => (
          <div key={w.start} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: monoFont, fontSize: 9.5, color: COLORS.textDim }}>{w.load || ""}</span>
            <div style={{ width: "100%", height: Math.max(2, (w.load / max) * 64), borderRadius: 3, background: i === 7 ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${i === 7 ? COLORS.accent : COLORS.line}` }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", ...st.body(), fontSize: 10.5, marginTop: 4 }}>
        <span>8 weeks ago</span>
        <span>This week</span>
      </div>
    </div>
  );
}

export function WeeklyReview({ nav }) {
  const [data] = usePlanData(nav);
  const [acts, setActs] = useState(null);
  const [saved, setSaved] = useState(false);
  const [maxHR, setMaxHR] = useState(undefined);
  useEffect(() => {
    listActivities(nav.settings).then(setActs);
    runnerMaxHR().then(setMaxHR);
  }, [nav.reloadKey]);
  if (!data || !acts) return <Screen title="Weekly review" onBack={nav.back}><Loading /></Screen>;
  const { plan, today, units, jargon } = data;
  const dow = engine.weekdayOf(today);
  const weekStart = (nav.params && nav.params.weekStart) || (dow === 0 ? engine.mondayOf(today) : engine.addDays(engine.mondayOf(today), -7));
  const rv = weekReview(plan, acts, weekStart);
  const nextStart = engine.addDays(weekStart, 7);
  const next = plan ? plan.weeks.find((w) => w.startIso === nextStart) : null;
  const summary = loadSummary(acts, { settings: nav.settings, maxHR });

  async function accept() {
    const s = (await getRunSettings()) || {};
    await setRunSettings({ ...s, reviewedWeek: weekStart });
    setSaved(true);
    nav.reload();
    nav.home();
  }

  return (
    <Screen title="Weekly review" onBack={nav.back} testId="review-screen">
      <div style={{ ...st.body(), marginBottom: 10 }}>
        Week of {engine.fmtDate(weekStart)}. Missed sessions are normal. Do not make them up.
      </div>
      <Card testId="review-summary">
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={st.label()}>Runs</div>
            <div data-testid="review-runs" style={{ ...st.mono(20), color: COLORS.text }}>
              {rv.runsDoneCount}/{rv.runsPlanned}
            </div>
          </div>
          <div>
            <div style={st.label()}>Gym</div>
            <div data-testid="review-gym" style={{ ...st.mono(20), color: COLORS.text }}>
              {rv.gymDoneCount}/{rv.gymPlanned}
            </div>
          </div>
          <div>
            <div style={st.label()}>Distance</div>
            <div style={{ ...st.mono(20), color: COLORS.text }}>{engine.fmtKm(rv.km, units)}</div>
            <div style={{ ...st.mono(11), color: COLORS.textDim }}>plan {engine.fmtKm(rv.plannedKm, units)}</div>
          </div>
        </div>
        {rv.other.length > 0 && <div style={{ ...st.body(), marginTop: 8 }}>Other sports: {rv.other.map((a) => a.name).join(", ")}.</div>}
      </Card>
      {rv.rows.length > 0 && (
        <Card>
          {rv.rows.map(({ d, run, gym }) => (
            <div key={d.iso} style={{ display: "flex", gap: 10, padding: "7px 0", borderTop: `1px solid ${COLORS.line}`, alignItems: "flex-start" }}>
              <span style={{ ...st.mono(11.5), color: COLORS.textDim, width: 70, flexShrink: 0 }}>{engine.fmtDate(d.iso)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {run && (
                  <span style={{ display: "flex", gap: 6, alignItems: "center", ...st.text(), fontSize: 13 }}>
                    <Mark ok={run.done} /> {dayLine(d, units)}
                  </span>
                )}
                {gym && (
                  <span style={{ display: "flex", gap: 6, alignItems: "center", ...st.text(), fontSize: 13 }}>
                    <Mark ok={gym.done} /> Gym: {gymLabel(d.gym)}
                  </span>
                )}
                {!run && !gym && <span style={{ ...st.body(), fontSize: 13 }}>Rest</span>}
              </span>
            </div>
          ))}
        </Card>
      )}
      {!plan && <Notice>You have no running plan. The numbers come from your logged activities.</Notice>}

      <Label>Training load</Label>
      <Card>
        <LoadBars activities={acts} today={today} options={{ settings: nav.settings, maxHR }} />
        <div style={{ ...st.body(), fontSize: 11.5, marginTop: 8 }}>Weekly load is effort (1 to 10) x minutes for runs, lifts and other sports. It is information only. It cannot predict injury.</div>
        {jargon && summary.ready && (
          <div style={{ marginTop: 10 }}>
            <FormGauge summary={summary} />
          </div>
        )}
      </Card>

      {next && (
        <>
          <Label>Next week</Label>
          <Card testId="review-next">
            <div style={{ ...st.mono(12), color: COLORS.textDim, marginBottom: 6 }}>{engine.fmtKm(next.km, units)} planned</div>
            {next.days.map((d) => (
              <div key={d.iso} style={{ display: "flex", gap: 10, padding: "5px 0", ...st.text(), fontSize: 13 }}>
                <span style={{ ...st.mono(11.5), color: COLORS.textDim, width: 70, flexShrink: 0 }}>{engine.fmtDate(d.iso)}</span>
                <span style={{ flex: 1 }}>
                  {dayLine(d, units)}
                  {d.gym ? ` · Gym: ${gymLabel(d.gym)}` : ""}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
      <Btn testId="review-accept" disabled={saved} onClick={accept}>
        Accept next week
      </Btn>
      <div style={{ height: 8 }} />
      <Btn kind="secondary" small onClick={() => nav.go("plan:week", { iso: nextStart })}>
        Change next week
      </Btn>
    </Screen>
  );
}
