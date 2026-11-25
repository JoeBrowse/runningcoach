import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { KEYS, getKey, setKey, getRaces } from "../shared/store.js";
import { previewPlan, rebuildPlan, seedHistory, localToday, GYM_TYPE_LABEL } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Field, TextInput, Segmented, Toggle, TickBox, Notice, SafetyList, DayPicker, Loading, parseTime, st, DAY_LONG, WEEK_ORDER, niceDates } from "./ui.jsx";
import { RACE_DISTANCES } from "./RacesScreen.jsx";

/* ---------------------------------------------------------------
   PLAN SETUP (spec section 4)

   Goal, race date and goal time (optional), run days and long-run
   day, gym days (the master week), current fitness, experience,
   units, heart-rate values (optional), the medical disclaimer. The
   result screen shows the plan, warnings, the engine's changes, the
   safety checks and gym conflicts. Save makes the plan.
--------------------------------------------------------------- */

export const GOAL_OPTIONS = [
  { id: "runwalk", label: "Run/walk to 5K", detail: "For new runners. Walk breaks get shorter week by week." },
  { id: "5k", label: "5K race" },
  { id: "10k", label: "10K race" },
  { id: "half", label: "Half marathon" },
  { id: "marathon", label: "Marathon" },
  { id: "ultra50", label: "50K trail" },
  { id: "keepfit", label: "Keep fit", detail: "No race date. Rolling 4-week blocks." },
  { id: "faster5k", label: "Get faster at 5K", detail: "No race date. A 5K time trial every 4 weeks." },
  { id: "build10k", label: "Build to 10K", detail: "No race date. Distance grows slowly." },
];

const STEPS = ["Goal", "Days", "Gym", "Fitness", "About you", "Check"];

export const DISCLAIMER =
  "Skid Marks gives general training information. It is not medical advice and it cannot diagnose or predict injury. Talk to a doctor before you start if you have a heart condition, chest pain, dizziness, a long-term illness, an injury or if you are pregnant. Stop and get help if you feel unwell during exercise.";

/* A weekly distance or long run that the user typed, in the user's units, for the form.
   A value with no flag comes from an older version. In history mode it is
   usually a copy of an old seed (for example 0 from before an import), so the
   form leaves it empty and the plan uses the fresh history. */
function typedForForm(value, flag, p) {
  if (value == null || !Number.isFinite(Number(value))) return "";
  const legacyTyped = flag === undefined && p.fitnessSource !== "history" && p.fitnessSource !== "new" && Number(value) > 0;
  if (flag !== true && !legacyTyped) return "";
  return String(Math.round(engine.kmToUnits(Number(value), p.units || "km") * 10) / 10);
}

function defaultsFrom(profile, master, level) {
  const p = profile || {};
  const m = master || {};
  const lvl = p.level || level || "some";
  return {
    level: lvl,
    goal: p.goal || (lvl === "new" ? "runwalk" : lvl === "racer" ? "10k" : "keepfit"),
    raceDate: p.raceDate || "",
    goalText: p.goalTimeSec ? engine.fmtTime(p.goalTimeSec) : "",
    runDays: (m.runDays && m.runDays.length ? m.runDays : p.runDays) || (lvl === "new" ? [2, 4, 6] : [2, 4, 0]),
    longRunDay: Number.isInteger(m.longRunDay) ? m.longRunDay : Number.isInteger(p.longRunDay) ? p.longRunDay : null,
    gymDays: (m.gymDays || []).map((g) => ({ ...g })),
    usesLift: p.usesLift != null ? !!p.usesLift : (m.gymDays || []).length > 0,
    fitness: p.fitnessSource || (lvl === "new" ? "new" : "history"),
    resultKm: p.resultKm || 5,
    resultText: p.resultSec ? engine.fmtTime(p.resultSec) : "",
    weeklyKm: typedForForm(p.currentWeeklyKm, p.weeklyKmTyped, p),
    longRunKm: typedForForm(p.usualLongRunKm, p.usualLongRunTyped, p),
    experience: p.experience || (lvl === "new" ? "new" : lvl === "racer" ? "experienced" : "some"),
    units: p.units || "km",
    maxHR: p.maxHR || "",
    restHR: p.restHR || "",
    lthr: p.lthr || "",
    consent: !!p.consentAt,
  };
}

const numOrNull = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/* A typed distance in the user's units to km, or null when the field is empty. */
const typedKm = (v, units) => {
  const n = numOrNull(v);
  if (n === null || n < 0) return null;
  return units === "mi" ? Math.round(engine.unitsToKm(n, "mi") * 10) / 10 : n;
};

/* The profile and master week that the form describes.
   Only typed values go into currentWeeklyKm and usualLongRunKm (with
   weeklyKmTyped / usualLongRunTyped). With an empty field, the plan reads
   the run history each time it is made, so an old copy cannot hide new runs. */
export function formToProfile(f, prev, seed) {
  const G = engine.GOALS[f.goal];
  const resultSec = parseTime(f.resultText);
  let score = null;
  let currentWeeklyKm = typedKm(f.weeklyKm, f.units);
  const weeklyKmTyped = currentWeeklyKm !== null;
  const usualLongRunKm = f.fitness === "new" ? null : typedKm(f.longRunKm, f.units);
  if (f.fitness === "result" && resultSec) score = engine.fitnessScore(Number(f.resultKm), resultSec);
  if (f.fitness === "history" && seed) {
    // Save the score only when the user typed a different result. Else
    // keep it empty, so each new plan reads the score fresh from history.
    score = resultSec && f.resultText !== (seed.scoreRun ? engine.fmtTime(seed.scoreRun.sec) : "") ? engine.fitnessScore(Number(f.resultKm), resultSec) : null;
  }
  if (f.fitness === "new") {
    score = null;
    if (currentWeeklyKm === null) currentWeeklyKm = 0;
  }
  const profile = {
    ...(prev || {}),
    level: f.level,
    goal: f.goal,
    raceDate: G && !G.noDate && f.raceDate ? f.raceDate : null,
    goalTimeSec: G && !G.noDate ? parseTime(f.goalText) : null,
    runDays: f.runDays,
    longRunDay: f.longRunDay,
    experience: f.experience,
    units: f.units,
    maxHR: numOrNull(f.maxHR),
    restHR: numOrNull(f.restHR),
    lthr: numOrNull(f.lthr),
    score: score,
    currentWeeklyKm,
    weeklyKmTyped,
    usualLongRunKm: usualLongRunKm !== null && usualLongRunKm > 0 ? usualLongRunKm : null,
    usualLongRunTyped: usualLongRunKm !== null && usualLongRunKm > 0,
    fitnessSource: f.fitness,
    useHistory: f.fitness === "history",
    resultKm: Number(f.resultKm),
    resultSec: resultSec || null,
    usesLift: !!f.usesLift,
    consentAt: f.consent ? (prev && prev.consentAt) || new Date().toISOString() : null,
  };
  const master = { runDays: f.runDays, longRunDay: f.longRunDay, gymDays: f.gymDays.map((g) => ({ day: g.day, type: g.type, intensity: g.intensity, note: g.note || "", split: g.split || null })) };
  return { profile, master };
}

function GymRow({ g, onChange, onRemove, idx }) {
  return (
    <Card testId={`gym-row-${idx}`} style={{ padding: 12 }}>
      <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <select data-testid={`gym-day-${idx}`} value={g.day} onChange={(e) => onChange({ ...g, day: Number(e.target.value) })} style={{ ...st.field(), width: "auto", flex: 1 }}>
          {WEEK_ORDER.map((d) => (
            <option key={d} value={d}>
              {DAY_LONG[d]}
            </option>
          ))}
        </select>
        <button aria-label="Remove gym day" data-testid={`gym-remove-${idx}`} onClick={onRemove} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim }}>
          <Trash2 size={17} />
        </button>
      </Row>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {Object.keys(GYM_TYPE_LABEL).map((t) => (
          <Chip key={t} testId={`gym-${idx}-type-${t}`} active={g.type === t} onClick={() => onChange({ ...g, type: t })}>
            {GYM_TYPE_LABEL[t]}
          </Chip>
        ))}
      </div>
      <Segmented testId={`gym-${idx}-intensity`} value={g.intensity} onChange={(v) => onChange({ ...g, intensity: v })} options={[{ value: "light", label: "Light" }, { value: "heavy", label: "Heavy" }]} />
      <div style={{ marginTop: 8 }}>
        <TextInput testId={`gym-${idx}-note`} value={g.note} onChange={(v) => onChange({ ...g, note: v })} placeholder="Note: strength, hypertrophy, calisthenics" />
      </div>
    </Card>
  );
}

/* "From your history" on the result screen. It shows the values that the
   plan uses. Edit lets the user change the weekly distance and the usual
   long run before the save. Typed values win over the history. */
export function HistoryCard({ seed, f, units, onApply }) {
  const [editing, setEditing] = useState(false);
  const [weekly, setWeekly] = useState(f.weeklyKm);
  const [longRun, setLongRun] = useState(f.longRunKm);
  if (!seed) return null;
  const inKm = (v) => typedKm(v, units);
  const weeklyKm = inKm(f.weeklyKm) !== null ? inKm(f.weeklyKm) : seed.currentWeeklyKm;
  const longKm = inKm(f.longRunKm) !== null && inKm(f.longRunKm) > 0 ? inKm(f.longRunKm) : seed.usualLongRunKm;
  const resultSec = parseTime(f.resultText);
  const result = resultSec && Number(f.resultKm) > 0 ? `${engine.fmtKm(Number(f.resultKm), units)} in ${engine.fmtTime(resultSec)}` : null;
  const bad = (v) => v !== "" && v != null && (numOrNull(v) === null || numOrNull(v) < 0);
  const mine = " (your value)";
  return (
    <Card testId="history-card">
      <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <div style={st.title(14)}>From your history</div>
        {!editing && (
          <button data-testid="history-edit" onClick={() => { setWeekly(f.weeklyKm); setLongRun(f.longRunKm); setEditing(true); }} style={{ ...st.label(), color: COLORS.accent, minHeight: 44, padding: "0 4px" }}>
            Edit
          </button>
        )}
      </Row>
      <div data-testid="history-summary" style={st.text()}>
        {seed.runsPerWeek === 0 && inKm(f.weeklyKm) === null ? "Your history has no runs in the last 6 weeks. " : ""}You run about {engine.fmtKm(weeklyKm, units)} a week{inKm(f.weeklyKm) !== null ? mine : ""}, {seed.runsPerWeek} run{seed.runsPerWeek === 1 ? "" : "s"} a week. Your usual long run is {engine.fmtKm(longKm, units)}{inKm(f.longRunKm) !== null && inKm(f.longRunKm) > 0 ? mine : ""}. Your best recent result: {result || "none in the last 12 weeks"}.
      </div>
      {seed.weeklyKmSource && seed.weeklyKmSource !== "last4" && inKm(f.weeklyKm) === null && (
        <div data-testid="history-weekly-note" style={{ ...st.body(), fontSize: 12, marginTop: 4 }}>
          {seed.weeklyKmSource === "steady"
            ? `One or more of your last 4 weeks is low or empty. The plan uses the middle value of your last 6 weeks with a run. Your last 4 weeks give ${engine.fmtKm(seed.avg4WeeksKm, units)} a week. Your 12-week average is ${engine.fmtKm(seed.avg12WeeksKm, units)} a week.`
            : `Most of your last 4 weeks have almost no running. The plan starts from your last 4 weeks (${engine.fmtKm(seed.avg4WeeksKm, units)} a week). This is safer after a break.`}
        </div>
      )}
      {editing && (
        <div style={{ marginTop: 10 }}>
          <Field label={`Distance a week (${units})`} hint={`Empty: the plan uses ${engine.fmtKm(seed.currentWeeklyKm, units)} from your runs.`}>
            <TextInput testId="history-weekly" type="number" inputMode="decimal" value={weekly} onChange={setWeekly} />
          </Field>
          <Field label={`Usual long run (${units})`} hint={`Empty: the plan uses ${engine.fmtKm(seed.usualLongRunKm, units)} from your runs.`}>
            <TextInput testId="history-long" type="number" inputMode="decimal" value={longRun} onChange={setLongRun} />
          </Field>
          {(bad(weekly) || bad(longRun)) && <div style={{ ...st.body(), color: COLORS.bad, marginBottom: 8 }}>Type a number, or leave the field empty.</div>}
          <Row gap={8}>
            <Btn kind="secondary" small testId="history-cancel" onClick={() => setEditing(false)}>
              Cancel
            </Btn>
            <Btn small testId="history-apply" disabled={bad(weekly) || bad(longRun)} onClick={() => { setEditing(false); onApply({ weeklyKm: weekly == null ? "" : String(weekly).trim(), longRunKm: longRun == null ? "" : String(longRun).trim() }); }}>
              Use these values
            </Btn>
          </Row>
        </div>
      )}
    </Card>
  );
}

export function PlanResult({ plan, units, jargon }) {
  if (!plan) return null;
  const w1 = plan.weeks[0];
  // Simple mode shows effort words, not paces, so a note about pace
  // estimates only confuses.
  const warnings = jargon ? plan.warnings : plan.warnings.filter((w) => !/^No recent result\. Paces are estimates/.test(w));
  return (
    <div data-testid="plan-result">
      <Card accent>
        <div style={st.title(18)}>{plan.goalName}</div>
        <div style={{ ...st.mono(12.5), color: COLORS.textDim, marginTop: 4 }}>
          {plan.weeks.length} weeks · starts {engine.fmtDate(plan.startIso)}
          {plan.raceIso ? ` · ${(plan.races || []).some((r) => r.iso === plan.raceIso && r.virtual) ? "goal day" : "race"} ${engine.fmtDate(plan.raceIso)}` : ""}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div>
            <div style={st.label()}>Week 1</div>
            <div style={{ ...st.mono(17), color: COLORS.text }}>{engine.fmtKm(w1.km, units)}</div>
          </div>
          <div>
            <div style={st.label()}>Biggest week</div>
            <div style={{ ...st.mono(17), color: COLORS.text }}>{engine.fmtKm(plan.peakKm, units)}</div>
          </div>
          <div>
            <div style={st.label()}>Runs a week</div>
            <div style={{ ...st.mono(17), color: COLORS.text }}>{plan.settings.runDays.length}</div>
          </div>
        </div>
        {jargon && plan.goalTimeSec && <div style={{ ...st.body(), marginTop: 8 }}>{engine.goalGap(plan).text}</div>}
        <div style={{ ...st.body(), marginTop: 8 }}>
          Week 1: {w1.days.filter(engine.isRun).map((d) => `${engine.DAY_NAMES[d.dow]} ${d.title.toLowerCase()}`).join(", ") || "rest"}.
        </div>
      </Card>
      {warnings.length > 0 && (
        <>
          <Label>Warnings</Label>
          {warnings.map((w, i) => (
            <Notice key={i} testId="plan-warning">
              {niceDates(w)}
            </Notice>
          ))}
        </>
      )}
      {plan.conflicts.length > 0 && (
        <>
          <Label>Gym and run clashes</Label>
          {plan.conflicts.map((c, i) => (
            <Notice key={i} testId="plan-conflict" title="Clash">
              {niceDates(c.reason)}
              <div style={{ ...st.body(), marginTop: 4 }}>Suggestion: {niceDates(c.suggestion)}</div>
            </Notice>
          ))}
        </>
      )}
      {plan.changesFromRules.length > 0 && (
        <>
          <Label>What the rules changed</Label>
          <Card testId="plan-rule-changes">
            {plan.changesFromRules.map((c, i) => (
              <div key={i} style={{ padding: "7px 0", borderTop: i ? `1px solid ${COLORS.line}` : "none" }}>
                <div style={{ ...st.text(), fontSize: 13 }}>{niceDates(c.change)}</div>
                {c.dates && c.dates.length > 0 && (
                  <div style={{ ...st.mono(11.5), color: COLORS.textDim }}>
                    {c.dates.slice(0, 3).map((d) => engine.fmtDate(d)).join(", ")}
                    {c.dates.length > 3 ? ` and ${c.dates.length - 3} more` : ""}
                  </div>
                )}
                <div style={{ ...st.body(), fontSize: 12 }}>{niceDates(c.reason)}</div>
              </div>
            ))}
          </Card>
        </>
      )}
      <Label>Safety checks</Label>
      <Card>
        <div style={{ ...st.body(), fontSize: 12, marginBottom: 4 }}>Each check tests the real planned days. A check shows FAIL when the plan breaks the rule.</div>
        <SafetyList checks={plan.safety} testId="plan-safety" />
      </Card>
    </div>
  );
}

export function PlanSetup({ nav }) {
  const params = nav.params || {};
  const [step, setStep] = useState(0);
  const [f, setF] = useState(null);
  const [prev, setPrev] = useState(null);
  const [seed, setSeed] = useState(null);
  const [races, setRacesList] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    (async () => {
      const [profile, master, r] = await Promise.all([getKey(KEYS.runProfile, null), getKey(KEYS.masterPlan, null), getRaces()]);
      setPrev(profile);
      setRacesList(r || []);
      setF(defaultsFrom(profile, master, params.level));
    })();
  }, []);

  useEffect(() => {
    if (!f || f.fitness !== "history" || seed) return;
    seedHistory().then((s) => {
      setSeed(s);
      if (s && s.scoreRun) setF((x) => ({ ...x, resultKm: s.scoreRun.km, resultText: x.resultText || engine.fmtTime(s.scoreRun.sec) }));
    });
  }, [f && f.fitness]);

  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const G = f ? engine.GOALS[f.goal] : null;

  useEffect(() => {
    if (!f || step !== STEPS.length - 1) return;
    setError("");
    try {
      const { profile, master } = formToProfile(f, prev, seed);
      previewPlan(profile, master, races, { seed: f.fitness === "history" ? seed : null })
        .then((r) => setPreview(r.plan))
        .catch((e) => setError(e.message || String(e)));
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [step, previewKey]);

  if (!f) return <Screen title="Plan setup" onBack={nav.back}><Loading /></Screen>;

  const units = f.units;
  const jargon = nav.settings && nav.settings.appMode === "advanced";
  const resultSec = parseTime(f.resultText);
  const resultCheck = resultSec && f.fitness !== "new" ? engine.checkResult(Number(f.resultKm), resultSec) : null;
  const longDay = f.longRunDay != null ? f.longRunDay : f.runDays.includes(0) ? 0 : f.runDays.includes(6) ? 6 : f.runDays[f.runDays.length - 1];

  const canNext = [
    () => !!f.goal && (!f.raceDate || f.raceDate > localToday()),
    () => f.runDays.length > 0,
    () => true,
    () => f.fitness === "new" || f.fitness === "history" || (resultCheck && resultCheck.ok),
    () => f.consent,
    () => !!preview && !error,
  ][step]();

  async function save() {
    setSaving(true);
    const { profile, master } = formToProfile({ ...f, longRunDay: longDay }, prev, seed);
    const p = { ...profile, onboarded: true };
    await setKey(KEYS.runProfile, p);
    await setKey(KEYS.masterPlan, master);
    await rebuildPlan(p, master, races, { seed: f.fitness === "history" ? seed : null, message: `New plan: ${preview.goalName}.` });
    if (params.appMode && nav.settings.appMode !== params.appMode) await nav.updateSettings({ ...nav.settings, appMode: params.appMode, mode: "plan" });
    else if (nav.settings.mode !== "plan") await nav.updateSettings({ ...nav.settings, mode: "plan" });
    setSaving(false);
    nav.reload();
    nav.home();
  }

  return (
    <Screen title="Plan setup" onBack={step ? () => setStep(step - 1) : nav.back} testId="plan-setup">
      <div data-testid="setup-steps" style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? COLORS.accent : COLORS.surfaceRaised }} />
        ))}
      </div>
      <div style={{ ...st.label(), marginBottom: 10 }}>
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </div>

      {step === 0 && (
        <>
          <div style={{ display: "grid", gap: 6 }}>
            {GOAL_OPTIONS.map((g) => (
              <Chip key={g.id} testId={`goal-${g.id}`} active={f.goal === g.id} onClick={() => set({ goal: g.id })} style={{ textAlign: "left", borderRadius: 12, padding: "10px 14px" }}>
                <span style={{ display: "block", fontSize: 14 }}>{g.label}</span>
                {g.detail && <span style={{ display: "block", ...st.body(), fontSize: 12 }}>{g.detail}</span>}
              </Chip>
            ))}
          </div>
          {G && !G.noDate && (
            <>
              <Label>Race date (optional)</Label>
              <input data-testid="setup-race-date" type="date" value={f.raceDate} min={localToday()} onChange={(e) => set({ raceDate: e.target.value })} style={st.field()} />
              <div style={{ ...st.body(), fontSize: 12, marginTop: 4 }}>With no date, the plan ends with a goal-day run after about {G.defaultWeeks} weeks.</div>
              {f.goal !== "runwalk" && (
                <>
                  <Label>Goal time (optional)</Label>
                  <TextInput testId="setup-goal-time" value={f.goalText} onChange={(v) => set({ goalText: v })} placeholder="For example 55:00 or 1:59:00" />
                  {f.goalText && !parseTime(f.goalText) && <div style={{ ...st.body(), color: COLORS.bad, marginTop: 4 }}>Use the form 55:00 or 1:59:00.</div>}
                </>
              )}
            </>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <Label style={{ marginTop: 0 }}>Run days</Label>
          <DayPicker testId="setup-run-days" value={f.runDays} onChange={(v) => set({ runDays: v, longRunDay: v.includes(f.longRunDay) ? f.longRunDay : null })} />
          <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>Select the days that you can run. {f.goal === "runwalk" ? "Run/walk plans use 4 days or fewer." : ""}</div>
          <Label>Long-run day</Label>
          <DayPicker testId="setup-long-day" multi={false} value={longDay} onChange={(d) => set({ longRunDay: d, runDays: f.runDays.includes(d) ? f.runDays : [...f.runDays, d].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)) })} />
          <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>Any day is OK. It becomes a run day.</div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ ...st.body(), marginBottom: 10 }}>Your gym days are real plan days. The plan keeps heavy leg days away from hard runs and the long run.</div>
          {f.gymDays.map((g, i) => (
            <GymRow key={i} idx={i} g={g} onChange={(ng) => set({ gymDays: f.gymDays.map((x, k) => (k === i ? ng : x)) })} onRemove={() => set({ gymDays: f.gymDays.filter((_, k) => k !== i) })} />
          ))}
          {f.gymDays.length < 7 && (
            <Btn kind="secondary" small testId="gym-add" onClick={() => { const free = WEEK_ORDER.find((d) => !f.gymDays.some((g) => g.day === d) && !f.runDays.includes(d)); set({ gymDays: [...f.gymDays, { day: free != null ? free : 1, type: "upper", intensity: "light", note: "" }], usesLift: true }); }}>
              <Plus size={16} /> Add a gym day
            </Btn>
          )}
          <div style={{ marginTop: 10 }}>
            <Toggle testId="setup-uses-lift" on={f.usesLift} onChange={(v) => set({ usesLift: v })} label="I do my strength work in Lift" detail="When this is on, the plan adds no extra strength sessions." />
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Segmented testId="setup-fitness" value={f.fitness} onChange={(v) => set({ fitness: v })} options={[{ value: "result", label: "Recent result" }, { value: "history", label: "My past runs" }, { value: "new", label: "I am new" }]} />
          <div style={{ height: 12 }} />
          {f.fitness === "new" && <div style={st.text()}>The plan starts gently with effort words, not paces. You can add a result later.</div>}
          {f.fitness === "history" && (
            <Card testId="seed-card">
              {!seed ? (
                <Loading />
              ) : (
                <>
                  <div style={{ ...st.title(14), marginBottom: 6 }}>From your past runs</div>
                  {seed.scoreRun ? (
                    <div style={st.text()}>
                      Best effort: {engine.fmtKm(seed.scoreRun.km, units)} in {engine.fmtTime(seed.scoreRun.sec)} on {engine.fmtDate(seed.scoreRun.iso)} ({seed.scoreSource === "race" ? "race" : "training run"}).
                    </div>
                  ) : (
                    <div style={st.text()}>No usable best effort in the last 12 weeks.</div>
                  )}
                  <div style={{ ...st.text(), marginTop: 4 }}>
                    Weekly distance: {engine.fmtKm(seed.avg4WeeksKm != null ? seed.avg4WeeksKm : seed.currentWeeklyKm, units)} (last 4 weeks), {engine.fmtKm(seed.avg12WeeksKm, units)} (last 12 weeks). The plan uses {engine.fmtKm(seed.currentWeeklyKm, units)}.
                  </div>
                  {seed.runsPerWeek > 0 && (
                    <div style={{ ...st.text(), marginTop: 4 }}>
                      {seed.runsPerWeek} run{seed.runsPerWeek === 1 ? "" : "s"} a week. Usual long run: {engine.fmtKm(seed.usualLongRunKm, units)}. Longest recent run: {engine.fmtKm(seed.longestRecentKm, units)}.
                    </div>
                  )}
                  <div data-testid="seed-runs" style={{ ...st.body(), fontSize: 12, marginTop: 4 }}>
                    Runs used: {seed.runsUsed.volume.length} for distance, {seed.runsUsed.score.length} for the best effort.
                  </div>
                  {seed.notes.map((n, i) => (
                    <div key={i} style={{ ...st.body(), fontSize: 12, marginTop: 4 }}>{niceDates(n)}</div>
                  ))}
                  <div style={{ ...st.body(), fontSize: 12, marginTop: 8 }}>Check the values below. You can change them.</div>
                </>
              )}
            </Card>
          )}
          {f.fitness !== "new" && (
            <>
              <Field label={f.fitness === "history" ? "Best effort distance" : "Distance of a recent race or time trial"}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {RACE_DISTANCES.slice(0, 7).map((d) => (
                    <Chip key={d.id} testId={`result-dist-${d.id}`} active={Math.abs(Number(f.resultKm) - d.km) < 0.05} onClick={() => set({ resultKm: d.km })}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
                <div style={{ marginTop: 6 }}>
                  <TextInput testId="result-km" type="number" inputMode="decimal" value={f.resultKm} onChange={(v) => set({ resultKm: v })} placeholder="km" />
                </div>
              </Field>
              <Field label="Time">
                <TextInput testId="result-time" value={f.resultText} onChange={(v) => set({ resultText: v })} placeholder="For example 26:30" />
              </Field>
              {resultCheck && !resultCheck.ok && <div style={{ ...st.body(), color: COLORS.bad, marginBottom: 8 }}>{resultCheck.error}</div>}
            </>
          )}
          <Field label={`Distance a week now (${units}, optional)`} hint={f.fitness === "history" && seed ? `Empty: the plan uses ${engine.fmtKm(seed.currentWeeklyKm, units)} from your runs.` : "Empty: the plan uses a safe default for your experience."}>
            <TextInput testId="weekly-km" type="number" inputMode="decimal" value={f.weeklyKm} onChange={(v) => set({ weeklyKm: v })} />
          </Field>
        </>
      )}

      {step === 4 && (
        <>
          <Field label="Running experience">
            <Segmented testId="setup-experience" value={f.experience} onChange={(v) => set({ experience: v })} options={[{ value: "new", label: "New" }, { value: "some", label: "Some" }, { value: "experienced", label: "A lot" }]} />
          </Field>
          <Field label="Units">
            <Segmented testId="setup-units" value={f.units} onChange={(v) => set({ units: v })} options={[{ value: "km", label: "Kilometres" }, { value: "mi", label: "Miles" }]} />
          </Field>
          <Label>Heart rate (optional)</Label>
          <div style={{ ...st.body(), fontSize: 12, marginBottom: 8 }}>Leave these empty if you do not know them. The plan uses effort words.</div>
          <Row gap={8}>
            <div style={{ flex: 1 }}>
              <Field label="Max">
                <TextInput testId="hr-max" type="number" inputMode="numeric" value={f.maxHR} onChange={(v) => set({ maxHR: v })} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Resting">
                <TextInput testId="hr-rest" type="number" inputMode="numeric" value={f.restHR} onChange={(v) => set({ restHR: v })} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Threshold">
                <TextInput testId="hr-lthr" type="number" inputMode="numeric" value={f.lthr} onChange={(v) => set({ lthr: v })} />
              </Field>
            </div>
          </Row>
          <Label>Medical note</Label>
          <Card>
            <div style={{ ...st.text(), fontSize: 13, marginBottom: 8 }}>{DISCLAIMER}</div>
            <TickBox testId="setup-consent" on={f.consent} onChange={(v) => set({ consent: v })}>
              I read this. I train at my own risk.
            </TickBox>
          </Card>
        </>
      )}

      {step === 5 && (
        <>
          {error && <Notice tone="bad" title="The plan could not be made">{error}</Notice>}
          {!preview && !error && <Loading />}
          {f.fitness === "history" && seed && (
            <HistoryCard
              key={`${f.weeklyKm}|${f.longRunKm}`}
              seed={seed}
              f={f}
              units={units}
              onApply={(v) => { setPreview(null); set(v); setPreviewKey((k) => k + 1); }}
            />
          )}
          {preview && <PlanResult plan={preview} units={units} jargon={jargon || f.level === "racer"} />}
        </>
      )}

      <div style={{ marginTop: 16 }}>
        {step < STEPS.length - 1 ? (
          <Btn testId="setup-next" disabled={!canNext} onClick={() => { setPreview(null); setStep(step + 1); if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0); }}>
            Next
          </Btn>
        ) : (
          <Btn testId="setup-save" disabled={!canNext || saving} onClick={save}>
            Save the plan
          </Btn>
        )}
      </div>
    </Screen>
  );
}
