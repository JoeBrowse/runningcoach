import { useEffect, useState } from "react";
import { Trophy, Undo2 } from "lucide-react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { getRaces, setRaces, setRunProfile, getMasterPlan } from "../shared/store.js";
import { commitPlan, rebuildPlan, undo, loadPlanState } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Field, TextInput, Notice, ChangeList, Loading, usePlanData, parseTime, st, monoFont } from "./ui.jsx";
import { PBCard, isPB, distLabel } from "./RacesScreen.jsx";

/* ---------------------------------------------------------------
   RACE DONE

   Result and feel, a PB card, the recovery block from
   engine.afterRace, then "What next?": rejoin the plan, a new goal,
   or keep fit.
--------------------------------------------------------------- */

const FEEL = [
  { rpe: 6, label: "Comfortable" },
  { rpe: 8, label: "Hard" },
  { rpe: 9, label: "Very hard" },
  { rpe: 10, label: "All out" },
];

export function AfterRace({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const [races, setList] = useState(null);
  const [timeText, setTimeText] = useState("");
  const [rpe, setRpe] = useState(null);
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);
  const raceId = nav.params && nav.params.raceId;
  useEffect(() => {
    getRaces().then((l) => setList(l || []));
  }, [nav.reloadKey]);
  if (!data || !races) return <Screen title="Race done" onBack={nav.back}><Loading /></Screen>;
  const race = races.find((r) => r.id === raceId) || null;
  const { plan, profile, today } = data;

  if (!race) {
    return (
      <Screen title="Race done" onBack={nav.back} testId="after-race">
        <Notice>Choose a race in Goals and races first.</Notice>
        <Btn onClick={() => nav.go("plan:races", {})}>Goals and races</Btn>
      </Screen>
    );
  }
  const resultSec = race.resultSec || parseTime(timeText);
  const pb = race.resultSec && isPB(race, races);
  const preview = plan && resultSec && rpe ? engine.afterRace(plan, { iso: race.date, distKm: race.distKm, timeSec: resultSec, rpe }) : null;

  async function saveResult() {
    const list = races.map((x) => (x.id === race.id ? { ...x, resultSec, feelRpe: rpe } : x));
    await setRaces(list);
    setList(list);
  }

  async function applyRecovery() {
    setBusy(true);
    await saveResult();
    if (preview) {
      const state = await loadPlanState();
      await commitPlan(preview.plan, { kind: "afterRace", message: preview.message, changes: preview.changes, state });
      // The next plan starts from the new fitness score.
      if (preview.score && profile) await setRunProfile({ ...profile, score: preview.score.after });
    }
    setBusy(false);
    setApplied(preview ? { message: preview.message, changes: preview.changes } : { message: "Result saved.", changes: [] });
    nav.reload();
    refresh();
  }

  async function keepFit() {
    setBusy(true);
    const p = { ...(profile || {}), goal: "keepfit", raceDate: null, goalTimeSec: null };
    const before = profile;
    await setRunProfile(p);
    const master = await getMasterPlan();
    const { state } = await rebuildPlan(p, master, races, { today, message: "Keep fit: rolling 4-week blocks with no race date." });
    void state;
    setBusy(false);
    setApplied({ message: "New plan: Keep fit. Rolling 4-week blocks. The first days are easy.", changes: [], profileBefore: before, keepfit: true });
    nav.reload();
    refresh();
  }

  async function doUndo() {
    await undo();
    if (applied && applied.profileBefore !== undefined) await setRunProfile(applied.profileBefore);
    setApplied(null);
    nav.reload();
    refresh();
  }

  return (
    <Screen title="Race done" onBack={nav.back} testId="after-race">
      <Card accent testId="race-result-card">
        <div style={st.label()}>{engine.fmtDate(race.date)} · {distLabel(race.distKm)}</div>
        <div style={{ ...st.title(20), marginTop: 2 }}>{race.name}</div>
        {race.resultSec ? (
          <div style={{ fontFamily: monoFont, fontSize: 30, color: COLORS.text, marginTop: 6 }}>{engine.fmtTime(race.resultSec)}</div>
        ) : (
          <Field label="Your time">
            <TextInput testId="after-time" value={timeText} onChange={setTimeText} placeholder="h:mm:ss" />
          </Field>
        )}
        <div style={{ ...st.text(), marginTop: 6 }}>Well done. You trained for this and you did it.</div>
      </Card>
      {pb && (
        <Notice testId="pb-new" tone="ok" title="New personal best">
          <Row>
            <Trophy size={16} color={COLORS.ok} /> {distLabel(race.distKm)} in {engine.fmtTime(race.resultSec)}.
          </Row>
        </Notice>
      )}

      {!applied && (
        <>
          <Label>How did it feel?</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {FEEL.map((f) => (
              <Chip key={f.rpe} testId={`feel-${f.rpe}`} active={rpe === f.rpe} onClick={() => setRpe(f.rpe)} style={{ borderRadius: 12 }}>
                {f.label}
              </Chip>
            ))}
          </div>
          {preview && (
            <>
              <Label>Recovery</Label>
              <Card testId="recovery-preview">
                <div style={{ ...st.text(), marginBottom: 6 }}>{preview.message}</div>
                {preview.score && preview.score.after !== preview.score.before && data.jargon && (
                  <div style={{ ...st.body(), marginBottom: 6 }}>
                    Running fitness score {preview.score.before} {"->"} {preview.score.after}
                    {preview.score.capped ? ". A jump is limited to +3 for safety." : "."}
                  </div>
                )}
                {preview.error && <div style={{ ...st.body(), color: COLORS.bad }}>{preview.error}</div>}
                <ChangeList changes={preview.changes.slice(0, 12).map((c) => ({ date: c.iso, before: c.before, after: c.after, reason: c.reason }))} />
              </Card>
            </>
          )}
          {!plan && <Notice>You have no running plan. The result is saved in your race list.</Notice>}
          <Btn testId="after-apply" disabled={!resultSec || !rpe || busy} onClick={applyRecovery}>
            {plan ? "Save result and add recovery" : "Save result"}
          </Btn>
        </>
      )}

      {applied && (
        <>
          <Card testId="after-applied">
            <div style={{ ...st.title(14), marginBottom: 4 }}>What changed and why</div>
            <div style={{ ...st.text(), marginBottom: 6 }}>{applied.message}</div>
            {applied.changes && applied.changes.length > 0 && <ChangeList changes={applied.changes.slice(0, 12).map((c) => ({ date: c.iso, before: c.before, after: c.after, reason: c.reason }))} />}
            {plan && (
              <div style={{ marginTop: 10 }}>
                <Btn small kind="secondary" testId="after-undo" onClick={doUndo}>
                  <Undo2 size={15} /> Undo
                </Btn>
              </div>
            )}
          </Card>
          {!applied.keepfit && (
            <>
              <Label>What next?</Label>
              <Card testId="what-next">
                <div style={{ display: "grid", gap: 8 }}>
                  <Btn testId="next-rejoin" onClick={() => nav.home()}>
                    Rejoin the plan
                  </Btn>
                  <Btn kind="secondary" testId="next-goal" onClick={() => nav.go("plan:setup", {})}>
                    Choose a new goal
                  </Btn>
                  <Btn kind="secondary" testId="next-keepfit" disabled={busy} onClick={keepFit}>
                    Keep fit for now
                  </Btn>
                </div>
                <div style={{ ...st.body(), fontSize: 12, marginTop: 8 }}>A new goal starts from your new fitness. Your done runs stay done.</div>
              </Card>
            </>
          )}
          {applied.keepfit && (
            <Btn testId="after-home" onClick={() => nav.home()}>
              Back to today
            </Btn>
          )}
        </>
      )}
      <PBCard races={races} highlight={race.id} />
    </Screen>
  );
}
