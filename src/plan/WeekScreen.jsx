import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Check, Undo2 } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { applyEvent, undo, markDone, clearDone, saveMasterAndRebuild, gymLabel, GYM_TYPE_LABEL } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Notice, ChangeList, StepsList, WorkoutShape, Segmented, TextInput, Field, LinkRow, Loading, usePlanData, dayLine, niceDates, st, oswald, WEEK_ORDER, DAY_LONG } from "./ui.jsx";
import { phaseName } from "./PlanHome.jsx";

/* ---------------------------------------------------------------
   MASTER WEEK

   Seven rows with the run and the gym session of each day. Tap a day
   for detail and actions: done, missed, drop, move (safe days are
   marked before the tap) and gym edit.
--------------------------------------------------------------- */

export function ResultPanel({ result, onUndo, testId = "result-panel" }) {
  if (!result) return null;
  if (result.refused) {
    return (
      <Notice testId={`${testId}-refused`} tone="bad" title="Not changed">
        {niceDates(result.reason || result.message)}
      </Notice>
    );
  }
  return (
    <Card testId={testId} accent>
      <div style={{ ...st.title(14), marginBottom: 4 }}>What changed and why</div>
      {result.message && <div style={{ ...st.text(), marginBottom: 8 }}>{niceDates(result.message)}</div>}
      <ChangeList changes={(result.changes || []).map((c) => ({ date: c.iso || c.date, before: c.before, after: c.after, reason: c.reason })).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))} testId={`${testId}-changes`} />
      {onUndo && (
        <div style={{ marginTop: 10 }}>
          <Btn small kind="secondary" testId={`${testId}-undo`} onClick={onUndo}>
            <Undo2 size={15} /> Undo
          </Btn>
        </div>
      )}
    </Card>
  );
}

function GymEditor({ master, dow, onSave, onCancel }) {
  const existing = (master.gymDays || []).find((g) => Number(g.day) === dow);
  const [g, setG] = useState(existing ? { ...existing } : { day: dow, type: "upper", intensity: "light", note: "" });
  return (
    <div data-testid="gym-editor" style={{ marginTop: 10 }}>
      <div style={{ ...st.body(), marginBottom: 8 }}>This changes every {DAY_LONG[dow]} in your master week. The plan is made again around it.</div>
      <Field label="Type">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.keys(GYM_TYPE_LABEL).map((t) => (
            <Chip key={t} testId={`gym-type-${t}`} active={g.type === t} onClick={() => setG({ ...g, type: t })}>
              {GYM_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Intensity">
        <Segmented testId="gym-intensity" value={g.intensity} onChange={(v) => setG({ ...g, intensity: v })} options={[{ value: "light", label: "Light" }, { value: "heavy", label: "Heavy" }]} />
      </Field>
      <Field label="Note (optional)">
        <TextInput testId="gym-note" value={g.note} onChange={(v) => setG({ ...g, note: v })} placeholder="For example: strength, hypertrophy" />
      </Field>
      <Row gap={8}>
        <Btn small testId="gym-save" onClick={() => onSave(g)}>
          Save
        </Btn>
        {existing && (
          <Btn small kind="danger" testId="gym-remove" onClick={() => onSave(null)}>
            Remove
          </Btn>
        )}
        <Btn small kind="secondary" onClick={onCancel}>
          Cancel
        </Btn>
      </Row>
    </div>
  );
}

function MovePicker({ plan, day, today, onMove, onCancel }) {
  const sug = engine.suggestDays(plan, day.iso, { today });
  // Safe days first, then the days that break a rule (each group by date).
  const options = [...sug.days.filter((x) => x.ok), ...sug.days.filter((x) => !x.ok)];
  const [picked, setPicked] = useState(null);
  const [other, setOther] = useState("");
  const check = picked ? sug.days.find((x) => x.iso === picked) || engine.checkMove(plan, day.iso, picked, today) : null;
  const otherCheck = other && other !== day.iso ? engine.checkMove(plan, day.iso, other, today) : null;
  return (
    <div data-testid="move-picker" style={{ marginTop: 10 }}>
      <div style={{ ...st.body(), marginBottom: 8 }}>Orange days are safe. All safety rules still pass on those days. Grey days break a rule.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((x) => (
          <Chip key={x.iso} testId={`move-to-${x.iso}`} tone={x.ok ? "safe" : undefined} active={picked === x.iso} onClick={() => setPicked(x.iso)} style={x.ok ? {} : { color: COLORS.textDim }}>
            {engine.fmtDate(x.iso)}
          </Chip>
        ))}
      </div>
      {check && (
        <div data-testid="move-check" style={{ ...st.text(), fontSize: 13, marginTop: 8, color: check.ok ? COLORS.text : COLORS.bad }}>
          {niceDates(check.reason)}
        </div>
      )}
      <Field label="Or pick another date (also in another week)">
        <input data-testid="move-other" type="date" value={other} min={today} onChange={(e) => setOther(e.target.value)} style={st.field()} />
      </Field>
      {otherCheck && <div data-testid="move-other-check" style={{ ...st.text(), fontSize: 13, marginBottom: 8, color: otherCheck.ok ? COLORS.text : COLORS.bad }}>{niceDates(otherCheck.reason)}</div>}
      <Row gap={8}>
        <Btn small testId="move-confirm" disabled={!((check && check.ok) || (otherCheck && otherCheck.ok))} onClick={() => onMove(otherCheck && otherCheck.ok ? other : picked)}>
          Move
        </Btn>
        <Btn small kind="secondary" onClick={onCancel}>
          Cancel
        </Btn>
      </Row>
    </div>
  );
}

function DayDetail({ d, data, nav, onResult, refresh }) {
  const { plan, master, units, jargon, today } = data;
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = engine.isRun(d);
  const past = d.iso < today;
  const showPace = jargon && d.showPace;

  async function event(ev) {
    setBusy(true);
    const { result } = await applyEvent(ev, { today });
    setBusy(false);
    setMode(null);
    onResult(result);
  }
  async function done(kind, on) {
    if (on) await markDone(d.iso, null, { kind });
    else await clearDone(d.iso, { kind });
    nav.reload();
    refresh();
  }
  async function saveGym(g) {
    const gymDays = (master && master.gymDays ? master.gymDays : []).filter((x) => Number(x.day) !== d.dow);
    if (g) gymDays.push({ ...g, day: d.dow });
    const next = { ...(master || {}), gymDays };
    setBusy(true);
    await saveMasterAndRebuild(next, { message: g ? `${DAY_LONG[d.dow]} gym: ${GYM_TYPE_LABEL[g.type]} (${g.intensity}).` : `${DAY_LONG[d.dow]} gym day removed.`, changes: [{ iso: d.iso, before: d.gym ? gymLabel(d.gym) : "No gym", after: g ? `${GYM_TYPE_LABEL[g.type]} (${g.intensity})` : "No gym", reason: "You changed your master week. The runs were planned again around the gym days." }] });
    setBusy(false);
    setMode(null);
    onResult({ message: "Master week saved. The plan was made again around your gym days.", changes: [], rebuilt: true });
  }

  return (
    <div data-testid={`day-detail-${d.iso}`} style={{ padding: "10px 0 4px" }}>
      {run && (
        <>
          <WorkoutShape workout={d} paces={plan.paces} />
          <div style={{ ...st.text(), marginTop: 8 }}>{d.effortText}</div>
          <div style={{ marginTop: 6 }}>
            <StepsList workout={d} units={units} showPace={showPace} />
          </div>
        </>
      )}
      <div style={{ ...st.body(), marginTop: 6 }}>{d.why}</div>
      {d.adjusted && <div style={{ ...st.body(), color: COLORS.accent, marginTop: 4 }}>Changed: {d.adjusted}</div>}
      {d.extra && d.extra.text && <div style={{ ...st.body(), marginTop: 4 }}>{d.extra.text}</div>}
      {d.gym && (
        <div style={{ ...st.text(), fontSize: 13, marginTop: 8 }}>
          Gym: {gymLabel(d.gym)}
          {d.gym.note ? ` · ${d.gym.note}` : ""}
          {d.gym.advice !== "normal" && <div style={{ ...st.body(), color: COLORS.accent }}>{d.gym.reason}</div>}
        </div>
      )}
      {!mode && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {run && !d.done && d.iso <= today && <Chip testId="act-done" onClick={() => done("run", true)}>Mark run done</Chip>}
          {run && d.done && <Chip testId="act-undone" onClick={() => done("run", false)}>Not done</Chip>}
          {d.gym && !d.gymDone && d.iso <= today && <Chip testId="act-gym-done" onClick={() => done("gym", true)}>Mark gym done</Chip>}
          {d.gym && d.gymDone && <Chip testId="act-gym-undone" onClick={() => done("gym", false)}>Gym not done</Chip>}
          {run && !d.done && d.type !== "race" && d.iso <= today && <Chip testId="act-missed" onClick={() => event({ type: "missed", iso: d.iso })}>I missed it</Chip>}
          {run && !d.done && !past && d.type !== "race" && <Chip testId="act-move" onClick={() => setMode("move")}>Move</Chip>}
          {(run || d.type === "strength" || d.type === "cross") && !d.done && !past && d.type !== "race" && <Chip testId="act-drop" onClick={() => setMode("drop")}>Drop</Chip>}
          {!past && <Chip testId="act-gym-edit" onClick={() => setMode("gym")}>{d.gym ? "Edit gym day" : "Add gym day"}</Chip>}
          {run && !d.done && d.iso === today && <Chip onClick={() => nav.go("run:record", { iso: d.iso, mode: "plan" })}>Start run</Chip>}
        </div>
      )}
      {mode === "move" && <MovePicker plan={plan} day={d} today={today} onCancel={() => setMode(null)} onMove={(to) => event({ type: "move", fromIso: d.iso, toIso: to })} />}
      {mode === "drop" && (
        <div data-testid="drop-confirm" style={{ marginTop: 10 }}>
          <div style={{ ...st.text(), fontSize: 13, marginBottom: 8 }}>Drop {dayLine(d, units)}? Fewer runs are always safe. Do not make it up later.</div>
          <Row gap={8}>
            <Btn small kind="danger" testId="drop-yes" disabled={busy} onClick={() => event({ type: "drop", iso: d.iso })}>
              Drop it
            </Btn>
            <Btn small kind="secondary" onClick={() => setMode(null)}>
              Keep it
            </Btn>
          </Row>
        </div>
      )}
      {mode === "gym" && <GymEditor master={master || {}} dow={d.dow} onSave={saveGym} onCancel={() => setMode(null)} />}
    </div>
  );
}

export function WeekScreen({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const [wi, setWi] = useState(null);
  const [open, setOpen] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!data || !data.plan || wi !== null) return;
    const iso = (nav.params && nav.params.iso) || data.today;
    // Plan weeks (Run mode) opens a week by its index.
    const given = nav.params && Number.isInteger(nav.params.weekIndex) ? nav.params.weekIndex : -1;
    let idx = given >= 0 && given < data.plan.weeks.length ? given : data.plan.weeks.findIndex((w) => iso >= w.startIso && iso <= engine.addDays(w.startIso, 6));
    if (idx < 0) idx = iso < data.plan.startIso ? 0 : data.plan.weeks.length - 1;
    setWi(idx);
    if (nav.params && nav.params.iso) setOpen(nav.params.iso);
  }, [data]);

  if (!data) return <Screen title="Master week" onBack={nav.back}><Loading /></Screen>;
  const { plan, units, jargon, today, master } = data;

  if (!plan) {
    return (
      <Screen title="Master week" onBack={nav.back} testId="week-screen">
        <Card>
          <div style={st.text()}>You have no running plan yet.</div>
          {master && master.gymDays && master.gymDays.length > 0 && (
            <div style={{ ...st.body(), marginTop: 6 }}>
              Gym days: {master.gymDays.map((g) => `${DAY_LONG[g.day]} ${gymLabel(g)}`).join(", ")}.
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Btn onClick={() => nav.go("plan:onboarding", {})}>Make a plan</Btn>
          </div>
        </Card>
      </Screen>
    );
  }
  const idx = wi === null ? 0 : wi;
  const week = plan.weeks[idx];

  async function doUndo() {
    await undo();
    setResult(null);
    nav.reload();
    refresh();
  }
  function onResult(r) {
    setResult(r);
    setOpen(null);
    nav.reload();
    refresh();
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
  }

  return (
    <Screen title="Master week" onBack={nav.back} testId="week-screen">
      <ResultPanel result={result} onUndo={result && !result.refused ? doUndo : null} />
      <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <button aria-label="Previous week" data-testid="week-prev" disabled={idx === 0} onClick={() => { setWi(idx - 1); setOpen(null); }} style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.4 : 1 }}>
          <ChevronLeft size={20} color={COLORS.text} />
        </button>
        <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
          <div data-testid="week-title" style={st.title(16)}>
            Week {week.n} of {plan.weeks.length}
          </div>
          <div style={{ ...st.mono(12), color: COLORS.textDim }}>
            {engine.fmtDate(week.startIso)} · {engine.fmtKm(week.km, units)}
            {jargon && phaseName(week) ? ` · ${phaseName(week)}` : ""}
          </div>
        </div>
        <button aria-label="Next week" data-testid="week-next" disabled={idx >= plan.weeks.length - 1} onClick={() => { setWi(idx + 1); setOpen(null); }} style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.surface, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx >= plan.weeks.length - 1 ? 0.4 : 1 }}>
          <ChevronRight size={20} color={COLORS.text} />
        </button>
      </Row>

      {week.days.map((d, i) => {
        const dow = WEEK_ORDER[i];
        const isToday = d.iso === today;
        const isOpen = open === d.iso;
        const run = engine.isRun(d);
        return (
          <div key={d.iso} data-testid={`week-day-${d.iso}`} style={{ background: COLORS.surface, border: `1px solid ${isToday ? COLORS.accent : COLORS.line}`, borderRadius: 12, marginBottom: 8, padding: "0 12px" }}>
            <button onClick={() => setOpen(isOpen ? null : d.iso)} aria-expanded={isOpen} style={{ display: "flex", width: "100%", alignItems: "flex-start", gap: 10, minHeight: 56, padding: "10px 0", textAlign: "left" }}>
              <div style={{ width: 44, flexShrink: 0 }}>
                <div style={{ fontFamily: oswald, fontSize: 13, textTransform: "uppercase", color: isToday ? COLORS.accent : COLORS.text }}>{engine.DAY_NAMES[dow]}</div>
                <div style={{ ...st.mono(11), color: COLORS.textDim }}>{Number(d.iso.slice(8))}/{Number(d.iso.slice(5, 7))}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: run ? COLORS.text : COLORS.textDim, fontSize: 14 }}>
                  {run && <span style={{ width: 9, height: 9, borderRadius: 5, flexShrink: 0, background: d.intensity === "easy" ? "transparent" : COLORS.accent, border: `1.5px solid ${COLORS.accent}` }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{dayLine(d, units)}</span>
                  {d.done && <Check size={14} color={COLORS.ok} aria-label="Done" role="img" />}
                </div>
                {d.gym && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 13, marginTop: 3 }}>
                    <Dumbbell size={12} /> {gymLabel(d.gym)}
                    {d.gymDone && <Check size={13} color={COLORS.ok} aria-label="Gym done" role="img" />}
                  </div>
                )}
                {d.adjusted && !isOpen && <div style={{ fontSize: 11.5, color: COLORS.accent, marginTop: 2 }}>Changed</div>}
              </div>
              <ChevronRight size={16} color={COLORS.textDim} style={{ transform: isOpen ? "rotate(90deg)" : "none", marginTop: 4 }} />
            </button>
            {isOpen && <DayDetail d={d} data={data} nav={nav} onResult={onResult} refresh={refresh} />}
          </div>
        );
      })}

      {week.check && week.check !== "normal" && (
        <div style={{ ...st.body(), fontSize: 12, marginBottom: 8 }}>
          {week.check === "cutback" ? "This is an easier week. Your body adapts on easier weeks." : week.check === "taper" ? "The plan gets smaller before the race, so you are fresh." : ""}
        </div>
      )}
      <Label>More</Label>
      {idx < plan.weeks.length - 1 && (
        <Btn kind="secondary" small testId="repeat-week" onClick={async () => { const { result: r } = await applyEvent({ type: "repeatWeek", weekN: week.n }, { today }); onResult(r); }}>
          Repeat this week
        </Btn>
      )}
      <div style={{ height: 8 }} />
      <LinkRow testId="link-changes" onClick={() => nav.go("plan:changes", {})}>
        What changed and why
      </LinkRow>
      <div style={{ ...st.body(), fontSize: 11.5, marginTop: 4 }}>
        <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: COLORS.accent, marginRight: 5 }} />
        Hard or long run
        <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, border: `1.5px solid ${COLORS.accent}`, margin: "0 5px 0 12px", background: hexToRgba(COLORS.accent, 0) }} />
        Easy run
      </div>
    </Screen>
  );
}
