import { useEffect, useState } from "react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { getRunSettings, setRunSettings } from "../shared/store.js";
import { applyEvent, undo } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Notice, Field, TextInput, Segmented, Toggle, Loading, usePlanData, dayLine, st } from "./ui.jsx";
import { LIFE_CHIPS } from "./PlanHome.jsx";
import { ResultPanel } from "./WeekScreen.jsx";

/* ---------------------------------------------------------------
   SOMETHING CHANGED

   Each event asks its questions first. The engine changes the plan
   only after the answers. Then the screen shows what changed and why,
   the return ladder when there is one, and Undo.
--------------------------------------------------------------- */

const TITLES = {
  missed: "I missed a run",
  illness: "I am ill",
  injury: "Something hurts",
  holiday: "Holiday",
  break: "Back after a break",
  legs: "Legs feel heavy",
  feedback: "Too hard or too easy",
};

function Question({ q, value, onChange }) {
  if (q.type === "choice") {
    return (
      <Field label={q.text}>
        <div style={{ display: "grid", gap: 6 }}>
          {q.options.map((o) => (
            <Chip key={o.value} testId={`q-${q.id}-${o.value}`} active={value === o.value} onClick={() => onChange(o.value)} style={{ textAlign: "left", borderRadius: 12 }}>
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>
    );
  }
  if (q.type === "bool") {
    return (
      <Field label={q.text}>
        <Segmented testId={`q-${q.id}`} value={value} onChange={onChange} options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
      </Field>
    );
  }
  if (q.type === "number") {
    return (
      <Field label={q.text}>
        <TextInput testId={`q-${q.id}`} type="number" inputMode="numeric" value={value} onChange={(v) => onChange(v === "" ? "" : Number(v))} />
      </Field>
    );
  }
  return (
    <Field label={q.text}>
      <TextInput testId={`q-${q.id}`} value={value} onChange={onChange} placeholder="For example: left calf" />
    </Field>
  );
}

function Ladder({ ladder }) {
  if (!ladder || !ladder.stages) return null;
  return (
    <Card testId="return-ladder">
      <div style={{ ...st.title(14), marginBottom: 6 }}>Return ladder</div>
      <div style={{ ...st.body(), marginBottom: 8 }}>
        From {engine.fmtDate(ladder.startIso)} to {engine.fmtDate(ladder.endIso)}. Go to the next step only when the pain stays at 3/10 or less, also the next morning.
      </div>
      {ladder.stages.map((s) => (
        <div key={s.stage} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: `1px solid ${COLORS.line}` }}>
          <span style={{ ...st.mono(12), color: COLORS.accent, width: 18 }}>{s.stage}</span>
          <span style={{ flex: 1 }}>
            <span style={{ ...st.text(), fontSize: 13, display: "block" }}>{s.title}</span>
            <span style={{ ...st.body(), fontSize: 12 }}>{s.detail}</span>
          </span>
        </div>
      ))}
    </Card>
  );
}

export function LifeEvents({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const kind = (nav.params && nav.params.kind) || null;
  const [answers, setAnswers] = useState(() => (nav.params && nav.params.area ? { area: nav.params.area } : {}));
  const [questions, setQuestions] = useState(null);
  const [result, setResult] = useState(null);
  const [offers, setOffers] = useState(null);
  const [busy, setBusy] = useState(false);
  const [missedIso, setMissedIso] = useState(null);
  const [legIso, setLegIso] = useState(null);
  const [holiday, setHoliday] = useState({ fromIso: "", toIso: "", canRun: false });
  const [fb, setFb] = useState(null);

  useEffect(() => {
    if (!data || !data.plan || !["illness", "injury", "break"].includes(kind) || questions) return;
    // The engine gives the questions. Nothing changes yet.
    applyEvent({ type: kind }, { today: data.today }).then(({ result: r }) => setQuestions(r.questions || []));
  }, [data, kind]);

  if (!data) return <Screen title="Something changed" onBack={nav.back}><Loading /></Screen>;
  const { plan, today, units } = data;

  if (!plan) {
    return (
      <Screen title="Something changed" onBack={nav.back} testId="life-screen">
        <Notice>You have no running plan yet. Make a plan first.</Notice>
        <Btn onClick={() => nav.go("plan:onboarding", {})}>Make a plan</Btn>
      </Screen>
    );
  }

  if (!kind) {
    return (
      <Screen title="Something changed" onBack={nav.back} testId="life-screen">
        <div style={{ ...st.body(), marginBottom: 12 }}>Tell us what happened. We ask a few questions first. Then we change the plan and show why.</div>
        <div style={{ display: "grid", gap: 8 }}>
          {LIFE_CHIPS.map((c) => (
            <Btn key={c.kind} kind="secondary" testId={`life-pick-${c.kind}`} onClick={() => nav.go("plan:life", { kind: c.kind })}>
              {c.label}
            </Btn>
          ))}
        </div>
      </Screen>
    );
  }

  async function run(ev) {
    setBusy(true);
    const { result: r } = await applyEvent(ev, { today });
    setBusy(false);
    if (r.needsAnswers) {
      setQuestions(r.questions || []);
      setResult({ refused: true, reason: r.message });
      return;
    }
    if (ev.type === "legHeavyDay" && !ev.apply && r.offers && r.offers.length) {
      setOffers(r);
      return;
    }
    if (ev.type === "injury" || (ev.type === "break" && r.followUps && r.followUps.length && answers.area)) {
      const s = (await getRunSettings()) || {};
      await setRunSettings({ ...s, niggle: { area: answers.area || "pain", startIso: today, answers: [] } });
    }
    setOffers(null);
    setResult(r);
    nav.reload();
    refresh();
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
  }

  async function doUndo() {
    await undo();
    setResult({ message: "The change was taken back. Your plan is as it was.", changes: [], undone: true });
    nav.reload();
    refresh();
  }

  const ladder = result && !result.refused && result.plan && result.plan.activeLadder;

  if (result && !result.refused) {
    return (
      <Screen title={TITLES[kind]} onBack={nav.back} testId="life-screen">
        <ResultPanel result={result} onUndo={result.undone ? null : doUndo} testId="life-result" />
        {!result.undone && <Ladder ladder={ladder} />}
        {result.followUps && result.followUps.length > 0 && !result.undone && (
          <div style={{ ...st.body(), marginBottom: 12 }}>We ask how you feel each day for the next {result.followUps.length} days.</div>
        )}
        {kind === "injury" && !result.undone && <Notice title="Medical note">This app cannot diagnose an injury. See a physio or doctor if the pain is sharp, gets worse, or makes you limp.</Notice>}
        <Btn testId="life-done" onClick={() => nav.home()}>
          Back to today
        </Btn>
      </Screen>
    );
  }

  const recentRuns = engine
    .allDays(plan)
    .filter((d) => engine.isRun(d) && d.type !== "race" && !d.done && d.iso <= today && engine.daysBetween(d.iso, today) <= 6);
  const legDays = [0, 1, 2].map((k) => engine.addDays(today, k - 1));

  return (
    <Screen title={TITLES[kind]} onBack={nav.back} testId="life-screen">
      <ResultPanel result={result} />

      {kind === "missed" && (
        <>
          <div style={{ ...st.body(), marginBottom: 10 }}>Which run did you miss?</div>
          {!recentRuns.length && <Notice>No open runs in the last 7 days.</Notice>}
          <div style={{ display: "grid", gap: 6 }}>
            {recentRuns.map((d) => (
              <Chip key={d.iso} testId={`missed-${d.iso}`} active={missedIso === d.iso} onClick={() => setMissedIso(d.iso)} style={{ textAlign: "left", borderRadius: 12 }}>
                {engine.fmtDate(d.iso)} · {dayLine(d, units)}
              </Chip>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn testId="life-apply" disabled={!missedIso || busy} onClick={() => run({ type: "missed", iso: missedIso })}>
              Change my plan
            </Btn>
          </div>
        </>
      )}

      {["illness", "injury", "break"].includes(kind) && (
        <>
          <div style={{ ...st.body(), marginBottom: 12 }}>Please answer these questions first. The plan changes only after your answers.</div>
          {!questions ? (
            <Loading />
          ) : (
            questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />)
          )}
          {kind === "break" && (answers.cause === "injury" || answers.painNow === true) && (
            <div style={{ ...st.body(), marginBottom: 10 }}>You have pain. The next step asks about the pain.</div>
          )}
          <Btn testId="life-apply" disabled={busy || !questions} onClick={() => run({ type: kind, answers })}>
            Change my plan
          </Btn>
        </>
      )}

      {kind === "holiday" && (
        <>
          <Field label="First day">
            <input data-testid="holiday-from" type="date" value={holiday.fromIso} min={today} onChange={(e) => setHoliday({ ...holiday, fromIso: e.target.value })} style={st.field()} />
          </Field>
          <Field label="Last day">
            <input data-testid="holiday-to" type="date" value={holiday.toIso} min={holiday.fromIso || today} onChange={(e) => setHoliday({ ...holiday, toIso: e.target.value })} style={st.field()} />
          </Field>
          <Toggle testId="holiday-canrun" on={holiday.canRun} onChange={(v) => setHoliday({ ...holiday, canRun: v })} label="I can run on holiday" detail="Short easy runs only. Otherwise full rest." />
          <div style={{ marginTop: 12 }}>
            <Btn testId="life-apply" disabled={!holiday.fromIso || !holiday.toIso || busy} onClick={() => run({ type: "holiday", ...holiday })}>
              Change my plan
            </Btn>
          </div>
        </>
      )}

      {kind === "legs" && !offers && (
        <>
          <div style={{ ...st.body(), marginBottom: 10 }}>Which day were your legs worked hard (heavy legs, football, a long hike)?</div>
          <Row gap={6} wrap>
            {legDays.map((iso) => (
              <Chip key={iso} testId={`legs-${iso}`} active={(legIso || today) === iso} onClick={() => setLegIso(iso)}>
                {iso === today ? "Today" : engine.fmtDate(iso)}
              </Chip>
            ))}
          </Row>
          <div style={{ marginTop: 14 }}>
            <Btn testId="life-apply" disabled={busy} onClick={() => run({ type: "legHeavyDay", iso: legIso || today })}>
              Check my next runs
            </Btn>
          </div>
        </>
      )}
      {kind === "legs" && offers && (
        <>
          {offers.offers.map((o, i) => (
            <Notice key={i} title={o.action === "swap" ? "Swap the days?" : "Run it easy?"}>
              {o.reason}
            </Notice>
          ))}
          <Row gap={8}>
            <Btn testId="legs-accept" disabled={busy} onClick={() => run({ type: "legHeavyDay", iso: legIso || today, apply: true })}>
              Yes, change it
            </Btn>
            <Btn kind="secondary" onClick={() => nav.back()}>
              No, keep it
            </Btn>
          </Row>
        </>
      )}

      {kind === "feedback" && (
        <>
          <div style={{ ...st.body(), marginBottom: 10 }}>How do your runs feel? Paces change by about 2%. A race or time trial gives a better update.</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Chip testId="fb-tooHard" active={fb === "tooHard"} onClick={() => setFb("tooHard")} style={{ borderRadius: 12 }}>
              The runs feel too hard
            </Chip>
            <Chip testId="fb-tooEasy" active={fb === "tooEasy"} onClick={() => setFb("tooEasy")} style={{ borderRadius: 12 }}>
              The runs feel too easy
            </Chip>
          </div>
          <div style={{ marginTop: 14 }}>
            <Btn testId="life-apply" disabled={!fb || busy} onClick={() => run({ type: "feedback", kind: fb })}>
              Change my paces
            </Btn>
          </div>
        </>
      )}
      <Label>Note</Label>
      <div style={{ ...st.body(), fontSize: 12 }}>Each change shows its reason. You can undo it.</div>
    </Screen>
  );
}
