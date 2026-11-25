import { useState } from "react";
import { Undo2 } from "lucide-react";
import { COLORS } from "../theme.js";
import { undo } from "./planState.js";
import { Screen, Card, Btn, ChangeList, Loading, Notice, usePlanData, st } from "./ui.jsx";

/* ---------------------------------------------------------------
   WHAT CHANGED AND WHY

   The plan log, newest first. Each entry shows the date of the
   change, the message and each changed day (before -> after, reason).
   Undo takes back the newest change.
--------------------------------------------------------------- */

const KIND_TEXT = {
  rebuild: "New plan",
  master: "Master week changed",
  missed: "Missed run",
  illness: "Illness",
  injury: "Pain or injury",
  holiday: "Holiday",
  break: "Back after a break",
  readiness: "Readiness",
  feedback: "Too hard / too easy",
  result: "New result",
  race: "Race result",
  afterRace: "After the race",
  legHeavyDay: "Heavy legs",
  move: "Session moved",
  drop: "Session dropped",
  repeatWeek: "Week repeated",
  undo: "Undo",
};

export function ChangesScreen({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const [busy, setBusy] = useState(false);
  if (!data) return <Screen title="What changed" onBack={nav.back}><Loading /></Screen>;
  const log = [...(data.state.log || [])].reverse();
  const canUndo = (data.state.undo || []).length > 0;

  async function doUndo() {
    setBusy(true);
    await undo();
    setBusy(false);
    nav.reload();
    refresh();
  }

  return (
    <Screen title="What changed" onBack={nav.back} testId="changes-screen">
      <div style={{ ...st.body(), marginBottom: 12 }}>Every change to your plan, with the reason. The newest change is at the top.</div>
      {canUndo && (
        <div style={{ marginBottom: 12 }}>
          <Btn kind="secondary" small testId="changes-undo" disabled={busy} onClick={doUndo}>
            <Undo2 size={15} /> Undo the last change
          </Btn>
        </div>
      )}
      {!log.length && <Notice>No changes yet.</Notice>}
      {log.map((e) => (
        <Card key={e.id || e.at} testId="change-entry" style={e.undone ? { opacity: 0.6 } : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <span style={st.title(14)}>{KIND_TEXT[e.kind] || e.kind}</span>
            <span style={{ ...st.mono(11), color: COLORS.textDim }}>{new Date(e.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          </div>
          {e.undone && <div style={{ ...st.label(), color: COLORS.accent, marginBottom: 4 }}>Taken back</div>}
          {e.message && <div style={{ ...st.text(), fontSize: 13, marginBottom: 6 }}>{e.message}</div>}
          {e.changes && e.changes.length > 0 && <ChangeList changes={e.changes.slice(0, 30)} />}
          {e.changes && e.changes.length > 30 && <div style={st.body()}>And {e.changes.length - 30} more days.</div>}
        </Card>
      ))}
    </Screen>
  );
}
