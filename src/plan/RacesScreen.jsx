import { useEffect, useState } from "react";
import { Trophy, Plus, Undo2 } from "lucide-react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { getRaces, setRaces, getRunProfile, setRunProfile, getMasterPlan, listActivities } from "../shared/store.js";
import { rebuildPlan, undo } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Field, TextInput, Segmented, Notice, Loading, usePlanData, parseTime, st } from "./ui.jsx";

/* ---------------------------------------------------------------
   GOALS AND RACES

   List, add and edit races (priority A, B or C), set a race as the
   plan goal (a new plan, with Undo), link an activity as the result,
   and a personal-best card.
--------------------------------------------------------------- */

export const RACE_DISTANCES = [
  { id: "5k", label: "5K", km: 5 },
  { id: "10k", label: "10K", km: 10 },
  { id: "15k", label: "15K", km: 15 },
  { id: "10mi", label: "10 mile", km: 16.0934 },
  { id: "half", label: "Half marathon", km: 21.0975 },
  { id: "30k", label: "30K trail", km: 30 },
  { id: "marathon", label: "Marathon", km: 42.195 },
  { id: "ultra50", label: "50K trail", km: 50 },
];

// Engine goals that a race can be. Other distances stay A, B or C races.
export function goalForKm(km) {
  const k = Number(km);
  if (Math.abs(k - 5) < 0.2) return "5k";
  if (Math.abs(k - 10) < 0.3) return "10k";
  if (Math.abs(k - 21.0975) < 0.5) return "half";
  if (Math.abs(k - 42.195) < 0.8) return "marathon";
  if (Math.abs(k - 50) < 1) return "ultra50";
  return null;
}

export function distLabel(km) {
  const d = RACE_DISTANCES.find((x) => Math.abs(x.km - Number(km)) < 0.05);
  return d ? d.label : `${Math.round(Number(km) * 10) / 10} km`;
}

/* Best result for each distance: { [label]: race }. */
export function personalBests(races) {
  const out = {};
  for (const r of races || []) {
    if (!r.resultSec || !r.distKm) continue;
    const key = distLabel(r.distKm);
    if (!out[key] || r.resultSec < out[key].resultSec) out[key] = r;
  }
  return out;
}

export function isPB(race, races) {
  if (!race || !race.resultSec) return false;
  const pb = personalBests(races)[distLabel(race.distKm)];
  return !!pb && pb.id === race.id;
}

export function PBCard({ races, highlight }) {
  const pbs = personalBests(races);
  const keys = Object.keys(pbs);
  if (!keys.length) return null;
  return (
    <Card testId="pb-card">
      <Row style={{ marginBottom: 6 }}>
        <Trophy size={16} color={COLORS.accent} />
        <div style={st.title(14)}>Personal bests</div>
      </Row>
      {keys.map((k) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${COLORS.line}`, color: highlight && pbs[k].id === highlight ? COLORS.accent : COLORS.text }}>
          <span style={{ fontSize: 13 }}>{k}</span>
          <span style={st.mono(13)}>
            {engine.fmtTime(pbs[k].resultSec)} · {engine.fmtDate(pbs[k].date)}
          </span>
        </div>
      ))}
    </Card>
  );
}

function RaceForm({ race, onSave, onCancel, onDelete }) {
  const [r, setR] = useState(() => ({ name: "", date: "", distKm: 10, priority: "B", goalText: "", ...race, goalText: race && race.goalTimeSec ? engine.fmtTime(race.goalTimeSec) : "" }));
  const [custom, setCustom] = useState(() => (race && race.distKm && !RACE_DISTANCES.some((d) => Math.abs(d.km - race.distKm) < 0.05) ? String(race.distKm) : ""));
  const goalSec = parseTime(r.goalText);
  const ok = r.date && Number(r.distKm) > 0;
  return (
    <Card testId="race-form" accent>
      <Field label="Name">
        <TextInput testId="race-name" value={r.name} onChange={(v) => setR({ ...r, name: v })} placeholder="For example: City 10K" />
      </Field>
      <Field label="Date">
        <input data-testid="race-date" type="date" value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} style={st.field()} />
      </Field>
      <Field label="Distance">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {RACE_DISTANCES.map((d) => (
            <Chip key={d.id} testId={`race-dist-${d.id}`} active={!custom && Math.abs(Number(r.distKm) - d.km) < 0.05} onClick={() => { setCustom(""); setR({ ...r, distKm: d.km }); }}>
              {d.label}
            </Chip>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <TextInput testId="race-dist-custom" type="number" inputMode="decimal" value={custom} placeholder="Other distance in km" onChange={(v) => { setCustom(v); if (Number(v) > 0) setR({ ...r, distKm: Number(v) }); }} />
        </div>
      </Field>
      <Field label="Priority" hint="A: your main race, with a full taper. B: a 2 to 3 day mini taper. C: it replaces a hard session.">
        <Segmented testId="race-priority" value={r.priority} onChange={(v) => setR({ ...r, priority: v })} options={[{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }]} />
      </Field>
      <Field label="Goal time (optional)" hint="For example 52:00 or 1:55:00.">
        <TextInput testId="race-goal" value={r.goalText} onChange={(v) => setR({ ...r, goalText: v })} placeholder="h:mm:ss" />
      </Field>
      {r.goalText && !goalSec && <div style={{ ...st.body(), color: COLORS.bad, marginBottom: 8 }}>Use the form 52:00 or 1:55:00.</div>}
      <Row gap={8}>
        <Btn small testId="race-save" disabled={!ok} onClick={() => { const { goalText, ...rest } = r; void goalText; onSave({ ...rest, goalTimeSec: goalSec || null, name: r.name || `${distLabel(r.distKm)} race` }); }}>
          Save
        </Btn>
        {onDelete && (
          <Btn small kind="danger" testId="race-delete" onClick={onDelete}>
            Delete
          </Btn>
        )}
        <Btn small kind="secondary" onClick={onCancel}>
          Cancel
        </Btn>
      </Row>
    </Card>
  );
}

function LinkResult({ race, onLinked, onCancel }) {
  const [acts, setActs] = useState(null);
  const [manual, setManual] = useState("");
  useEffect(() => {
    listActivities().then((l) => setActs(l.filter((a) => a.source === "activity" && /run|trail|treadmill/i.test(a.type) && Math.abs(engine.daysBetween(race.date, a.date)) <= 2)));
  }, [race.id]);
  const sec = parseTime(manual);
  return (
    <Card testId="link-result">
      <div style={{ ...st.title(14), marginBottom: 6 }}>Race result</div>
      {!acts ? (
        <Loading />
      ) : acts.length ? (
        <>
          <div style={{ ...st.body(), marginBottom: 8 }}>Use one of these activities as the result:</div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {acts.map((a) => (
              <Chip key={a.id} testId={`link-act-${a.id}`} onClick={() => onLinked({ resultSec: Math.round((a.minutes || 0) * 60), activityId: a.id })} style={{ textAlign: "left", borderRadius: 12 }}>
                {engine.fmtDate(a.date)} · {a.name} · {a.km ? engine.fmtKm(a.km) : ""} · {a.minutes ? engine.fmtTime(a.minutes * 60) : ""}
              </Chip>
            ))}
          </div>
        </>
      ) : (
        <div style={{ ...st.body(), marginBottom: 8 }}>No run found within 2 days of the race. Type your time.</div>
      )}
      <Field label="Or type your time">
        <TextInput testId="result-time" value={manual} onChange={setManual} placeholder="h:mm:ss" />
      </Field>
      <Row gap={8}>
        <Btn small testId="result-save" disabled={!sec} onClick={() => onLinked({ resultSec: sec, activityId: null })}>
          Save result
        </Btn>
        <Btn small kind="secondary" onClick={onCancel}>
          Cancel
        </Btn>
      </Row>
    </Card>
  );
}

export function RacesScreen({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const [races, setList] = useState(null);
  const [edit, setEdit] = useState(null); // race object or "new"
  const [linking, setLinking] = useState(null);
  const [confirmGoal, setConfirmGoal] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    getRaces().then((l) => setList(l || []));
  }, [nav.reloadKey]);
  if (!data || !races) return <Screen title="Goals and races" onBack={nav.back}><Loading /></Screen>;
  const { plan, profile, today } = data;

  async function replan(list, message) {
    if (!plan || !profile) return false;
    const master = await getMasterPlan();
    await rebuildPlan(profile, master, list, { today, message });
    return true;
  }
  async function saveList(list, message) {
    await setRaces(list);
    setList(list);
    const changed = await replan(list, message);
    setMsg(changed ? { text: `${message} The plan was made again with your races.`, undo: true } : { text: message });
    nav.reload();
    refresh();
  }
  async function save(r) {
    const id = r.id || `race-${Date.now()}`;
    const list = [...races.filter((x) => x.id !== id), { ...r, id }].sort((a, b) => (a.date < b.date ? -1 : 1));
    setEdit(null);
    await saveList(list, r.id ? `Race "${r.name}" changed.` : `Race "${r.name}" added.`);
  }
  async function remove(r) {
    setEdit(null);
    await saveList(races.filter((x) => x.id !== r.id), `Race "${r.name}" deleted.`);
  }
  async function setGoal(r) {
    const goal = goalForKm(r.distKm);
    const p = { ...(profile || {}), goal, raceDate: r.date, goalTimeSec: r.goalTimeSec || null };
    await setRunProfile(p);
    const list = races.map((x) => (x.id === r.id ? { ...x, priority: "A" } : x));
    await setRaces(list);
    setList(list);
    const master = await getMasterPlan();
    await rebuildPlan(p, master, list, { today, message: `New goal: ${r.name} on ${engine.fmtDate(r.date)}.` });
    setConfirmGoal(null);
    setMsg({ text: `New plan for ${r.name}. Your done runs stay done.`, undo: true, profileBefore: profile });
    nav.reload();
    refresh();
  }
  async function linked(r, res) {
    const list = races.map((x) => (x.id === r.id ? { ...x, ...res } : x));
    await setRaces(list);
    setList(list);
    setLinking(null);
    nav.go("plan:after-race", { raceId: r.id });
  }
  async function doUndo() {
    await undo();
    if (msg && msg.profileBefore !== undefined) await setRunProfile(msg.profileBefore);
    setMsg({ text: "The plan change was taken back. Your race list stays as it is." });
    nav.reload();
    refresh();
  }

  const upcoming = races.filter((r) => r.date >= today && !r.resultSec);
  const past = races.filter((r) => r.date < today || r.resultSec);
  const goalRace = plan && plan.raceIso;

  return (
    <Screen title="Goals and races" onBack={nav.back} testId="races-screen">
      {plan && (
        <Card testId="current-goal">
          <div style={st.label()}>Current goal</div>
          <div style={{ ...st.title(17), marginTop: 2 }}>{plan.goalName}</div>
          <div style={{ ...st.body(), marginTop: 2 }}>{plan.raceIso ? `Race day: ${engine.fmtDate(plan.raceIso)}` : "No race date. The plan runs in 4-week blocks."}</div>
          <div style={{ marginTop: 10 }}>
            <Btn small kind="secondary" testId="change-goal" onClick={() => nav.go("plan:setup", {})}>
              Change goal
            </Btn>
          </div>
        </Card>
      )}
      {msg && (
        <Notice testId="races-msg" tone="ok">
          {msg.text}
          {msg.undo && (
            <div style={{ marginTop: 8 }}>
              <Btn small kind="secondary" testId="races-undo" onClick={doUndo}>
                <Undo2 size={15} /> Undo
              </Btn>
            </div>
          )}
        </Notice>
      )}
      {edit ? (
        <RaceForm race={edit === "new" ? null : edit} onSave={save} onCancel={() => setEdit(null)} onDelete={edit !== "new" ? () => remove(edit) : null} />
      ) : (
        <Btn testId="race-add" onClick={() => setEdit("new")}>
          <Plus size={17} /> Add a race
        </Btn>
      )}
      <Label>Coming races</Label>
      {!upcoming.length && <div style={st.body()}>No races yet. A race is optional.</div>}
      {upcoming.map((r) => {
        const canGoal = !!goalForKm(r.distKm);
        const isGoal = goalRace === r.date;
        return (
          <Card key={r.id} testId={`race-${r.id}`}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={st.title(15)}>{r.name}</div>
                <div style={{ ...st.mono(12), color: COLORS.textDim, marginTop: 2 }}>
                  {engine.fmtDate(r.date)} · {distLabel(r.distKm)}
                  {r.goalTimeSec ? ` · goal ${engine.fmtTime(r.goalTimeSec)}` : ""}
                </div>
              </div>
              <span style={{ ...st.mono(13), color: r.priority === "A" ? COLORS.accent : COLORS.textDim, border: `1px solid ${r.priority === "A" ? COLORS.accent : COLORS.line}`, borderRadius: 6, padding: "2px 8px" }}>{r.priority}</span>
            </Row>
            {isGoal && <div style={{ ...st.label(), color: COLORS.accent, marginTop: 6 }}>Plan goal</div>}
            {confirmGoal === r.id ? (
              <div data-testid="goal-confirm" style={{ marginTop: 10 }}>
                <div style={{ ...st.text(), fontSize: 13, marginBottom: 8 }}>This makes a new plan for this race. Done runs stay done. You can undo it.</div>
                <Row gap={8}>
                  <Btn small testId="goal-yes" onClick={() => setGoal(r)}>
                    Make the plan
                  </Btn>
                  <Btn small kind="secondary" onClick={() => setConfirmGoal(null)}>
                    Cancel
                  </Btn>
                </Row>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                <Chip testId={`race-edit-${r.id}`} onClick={() => setEdit(r)}>Edit</Chip>
                {!isGoal && canGoal && profile && profile.onboarded && <Chip testId={`race-goal-${r.id}`} onClick={() => setConfirmGoal(r.id)}>Set as A goal</Chip>}
                {r.date <= today && <Chip testId={`race-result-${r.id}`} onClick={() => setLinking(r.id)}>Add result</Chip>}
              </div>
            )}
            {!canGoal && <div style={{ ...st.body(), fontSize: 11.5, marginTop: 6 }}>This distance cannot be the plan goal. As an A race, the plan still tapers for it.</div>}
            {linking === r.id && <LinkResult race={r} onCancel={() => setLinking(null)} onLinked={(res) => linked(r, res)} />}
          </Card>
        );
      })}
      <PBCard races={races} />
      {past.length > 0 && <Label>Past races</Label>}
      {past.map((r) => (
        <Card key={r.id} testId={`race-${r.id}`}>
          <div style={st.title(14)}>{r.name}</div>
          <div style={{ ...st.mono(12), color: COLORS.textDim, marginTop: 2 }}>
            {engine.fmtDate(r.date)} · {distLabel(r.distKm)} · {r.resultSec ? engine.fmtTime(r.resultSec) : "no result"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {!r.resultSec && <Chip testId={`race-result-${r.id}`} onClick={() => setLinking(r.id)}>Add result</Chip>}
            {r.resultSec && <Chip onClick={() => nav.go("plan:after-race", { raceId: r.id })}>Race done: what next?</Chip>}
            <Chip onClick={() => setEdit(r)}>Edit</Chip>
          </div>
          {linking === r.id && <LinkResult race={r} onCancel={() => setLinking(null)} onLinked={(res) => linked(r, res)} />}
        </Card>
      ))}
    </Screen>
  );
}
