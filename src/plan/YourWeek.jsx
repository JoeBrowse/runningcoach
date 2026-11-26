import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Minus, Plus, Undo2 } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { KEYS, getKey, setKey } from "../shared/store.js";
import { GYM_TYPE_LABEL, saveMasterAndRebuild, loadPlanState } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Segmented, DayPicker, Notice, Loading, st, oswald, DAY_LONG } from "./ui.jsx";
import {
  defaultAnswers, toPlanWeekInput, toMasterRecord, toProfilePatch, weekRows, applyDayEdit, checkWeek, usesRun, usesLift, normaliseUse,
} from "./weekSetup.js";

/* ---------------------------------------------------------------
   YOUR WEEK (spec v1.1 section 1, step 4)

   Questions: available days, levels, runs a week, lift days a week,
   priority and two sessions a day (Both). The app proposes a week with
   engine.planWeek and shows it as 7 rows with the reasons and the
   warnings. The user can tap a day to change it; the app then checks
   the changed week against the rules and shows each rule that the
   change breaks. Save writes the master week.

   <YourWeek use prevMaster profile onSave={(answers, week) => ...} />
   The first-open flow and the "plan:your-week" screen (from Settings)
   use it.
--------------------------------------------------------------- */

const GYM_TYPES = ["upper", "lower", "full", "legs"];

export function Stepper({ value, onChange, min, max, testId, unit }) {
  const btn = (disabled) => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    border: `1px solid ${COLORS.line}`,
    background: COLORS.surfaceRaised,
    color: disabled ? COLORS.textDim : COLORS.text,
    opacity: disabled ? 0.45 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  return (
    <div data-testid={testId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button aria-label="Less" data-testid={testId ? `${testId}-less` : undefined} disabled={value <= min} onClick={() => value > min && onChange(value - 1)} style={btn(value <= min)}>
        <Minus size={18} />
      </button>
      <div style={{ minWidth: 70, textAlign: "center" }}>
        <span data-testid={testId ? `${testId}-value` : undefined} style={{ ...st.mono(26), color: COLORS.text }}>{value}</span>
        {unit && <span style={{ ...st.body(), fontSize: 12, marginLeft: 6 }}>{unit}</span>}
      </div>
      <button aria-label="More" data-testid={testId ? `${testId}-more` : undefined} disabled={value >= max} onClick={() => value < max && onChange(value + 1)} style={btn(value >= max)}>
        <Plus size={18} />
      </button>
    </div>
  );
}

function Pill({ children, filled, dim, testId }) {
  return (
    <span
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 999,
        border: `1px solid ${dim ? COLORS.line : COLORS.accent}`,
        background: filled ? COLORS.accent : dim ? "transparent" : hexToRgba(COLORS.accent, 0.1),
        color: filled ? COLORS.onAccent : dim ? COLORS.textDim : COLORS.text,
        fontFamily: oswald,
        fontSize: 11.5,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function gymText(g) {
  return `${GYM_TYPE_LABEL[g.type] || "Gym"} · ${g.intensity === "heavy" ? "heavy" : "light"}`;
}

function DayEditor({ row, use, onApply, onCancel }) {
  const [run, setRun] = useState(row.run || null);
  const [gym, setGym] = useState(row.gym ? { type: row.gym.type, intensity: row.gym.intensity } : null);
  return (
    <div data-testid="day-editor" style={{ padding: "10px 12px 12px", borderTop: `1px solid ${COLORS.line}`, background: COLORS.surfaceRaised }}>
      {usesRun(use) && (
        <>
          <div style={{ ...st.label(), marginBottom: 6 }}>Run</div>
          <Segmented
            testId="edit-run"
            value={run || "none"}
            onChange={(v) => setRun(v === "none" ? null : v)}
            options={[{ value: "none", label: "No run" }, { value: "run", label: "Run" }, { value: "long", label: "Long run" }]}
          />
        </>
      )}
      {usesLift(use) && (
        <>
          <div style={{ ...st.label(), margin: "12px 0 6px" }}>Gym</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Chip testId="edit-gym-none" active={!gym} onClick={() => setGym(null)}>
              No gym
            </Chip>
            {GYM_TYPES.map((t) => (
              <Chip key={t} testId={`edit-gym-${t}`} active={gym && gym.type === t} onClick={() => setGym({ type: t, intensity: gym ? gym.intensity : "light" })}>
                {GYM_TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
          {gym && (
            <div style={{ marginTop: 8 }}>
              <Segmented testId="edit-gym-intensity" value={gym.intensity} onChange={(v) => setGym({ ...gym, intensity: v })} options={[{ value: "light", label: "Light" }, { value: "heavy", label: "Heavy" }]} />
            </div>
          )}
        </>
      )}
      <Row gap={8} style={{ marginTop: 12 }}>
        <Btn small kind="secondary" testId="edit-cancel" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn small testId="edit-apply" onClick={() => onApply({ run, gym })}>
          Change {DAY_LONG[row.day]}
        </Btn>
      </Row>
    </div>
  );
}

export function WeekRows({ rows, use, onEdit, editingDay, onApply, onCancel, broken = [] }) {
  return (
    <div data-testid="week-rows" style={{ border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden", background: COLORS.surface, marginBottom: 12 }}>
      {rows.map((r, i) => {
        const bad = broken.some((b) => b.day === r.day);
        const rest = !r.run && !r.gym;
        return (
          <div key={r.day} style={{ borderTop: i ? `1px solid ${COLORS.line}` : "none" }}>
            <button
              data-testid={`week-row-${r.day}`}
              aria-expanded={editingDay === r.day}
              aria-label={`${DAY_LONG[r.day]}. Tap to change.`}
              onClick={() => onEdit(editingDay === r.day ? null : r.day)}
              style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 12px", textAlign: "left", background: bad ? hexToRgba(COLORS.bad, 0.08) : "transparent" }}
            >
              <span style={{ width: 40, flexShrink: 0, fontFamily: oswald, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6, color: r.available ? COLORS.text : COLORS.textDim }}>{engine.DAY_NAMES[r.day]}</span>
              <span style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 5, minWidth: 0 }}>
                {r.run && (
                  <Pill filled={r.run === "long"} testId={`row-run-${r.day}`}>
                    {r.run === "long" ? "Long run" : "Run"}
                  </Pill>
                )}
                {r.gym && (
                  <Pill testId={`row-gym-${r.day}`}>
                    <Dumbbell size={11} /> {gymText(r.gym)}
                  </Pill>
                )}
                {rest && (
                  <Pill dim testId={`row-rest-${r.day}`}>
                    {r.available ? "Rest" : "Rest · not available"}
                  </Pill>
                )}
                {r.run && r.gym && r.double && (
                  <span style={{ ...st.body(), fontSize: 11.5, width: "100%" }}>
                    Two sessions: {r.double.first === "lift" ? "gym" : "run"} first, then {r.double.gapHours} hours or more.
                  </span>
                )}
              </span>
              <span style={{ ...st.label(), color: COLORS.accent, flexShrink: 0 }}>{editingDay === r.day ? "Close" : "Change"}</span>
            </button>
            {editingDay === r.day && <DayEditor row={r} use={use} onApply={onApply} onCancel={onCancel} />}
          </div>
        );
      })}
    </div>
  );
}

/* The proposed week for the answers. Returns { week, error }. */
export function proposeWeek(answers) {
  if (typeof engine.planWeek !== "function") return { week: null, error: "The app cannot plan a week in this version." };
  try {
    return { week: engine.planWeek(toPlanWeekInput(answers)), error: "" };
  } catch (e) {
    return { week: null, error: (e && e.message) || String(e) };
  }
}

const recommend = (x) => (typeof engine.recommendWeek === "function" ? engine.recommendWeek(x) : null);

export function YourWeek({ use, prevMaster, profile, onSave, saveLabel = "Save my week", busy }) {
  const [answers, setAnswers] = useState(() =>
    defaultAnswers(use, {
      prev: prevMaster,
      levels: { runLevel: profile && profile.experience, liftLevel: profile && profile.liftLevel },
      recommend,
    })
  );
  const [edits, setEdits] = useState([]); // stack of edited weeks, newest last
  const [editingDay, setEditingDay] = useState(null);
  const u = answers.use;

  const { week: proposed, error } = useMemo(() => proposeWeek(answers), [answers]);
  const week = edits.length ? edits[edits.length - 1] : proposed;
  const broken = useMemo(() => (edits.length && week ? checkWeek(week, answers) : []), [edits, week, answers]);
  const rows = week ? weekRows(week, answers) : [];

  // A new answer makes a new week. Changed days are cleared.
  function set(patch, { recount } = {}) {
    setEdits([]);
    setEditingDay(null);
    setAnswers((a) => {
      let next = { ...a, ...patch };
      if (recount) {
        const d = defaultAnswers(next.use, { levels: { runLevel: next.runLevel, liftLevel: next.liftLevel }, prev: { priority: next.priority }, recommend });
        next = { ...next, runDays: d.runDays, liftDays: d.liftDays };
      }
      return next;
    });
  }

  function applyEdit(edit) {
    const next = applyDayEdit(week, editingDay, edit, answers);
    setEdits((list) => [...list, next]);
    setEditingDay(null);
  }

  const availCount = answers.availableDays.length;
  const runMax = Math.max(1, Math.min(6, availCount));
  const liftMax = Math.max(1, Math.min(4, availCount));
  const sessions = week ? (week.runDays || []).length + (week.gymDays || []).length : 0;
  const restCount = rows.filter((r) => !r.run && !r.gym).length;

  return (
    <div data-testid="your-week">
      <Label style={{ marginTop: 0 }}>Which days can you train?</Label>
      <DayPicker
        testId="week-days"
        value={answers.availableDays}
        onChange={(v) => {
          if (!v.length) return;
          set({ availableDays: v, runDays: Math.min(answers.runDays, Math.max(1, Math.min(6, v.length))), liftDays: Math.min(answers.liftDays, Math.max(1, Math.min(4, v.length))) });
        }}
      />
      <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>Select every day that you can train. The app selects the rest days.</div>

      {usesRun(u) && (
        <>
          <Label>How much do you run now?</Label>
          <Segmented
            testId="week-run-level"
            value={answers.runLevel}
            onChange={(v) => set({ runLevel: v }, { recount: true })}
            options={[{ value: "new", label: "New" }, { value: "some", label: "Sometimes" }, { value: "experienced", label: "A lot" }]}
          />
          <Label>How many days a week can you run?</Label>
          <Stepper testId="week-runs" value={Math.min(answers.runDays, runMax)} min={1} max={runMax} unit={answers.runDays === 1 ? "run" : "runs"} onChange={(n) => set({ runDays: n })} />
        </>
      )}

      {usesLift(u) && (
        <>
          <Label>How long have you lifted?</Label>
          <Segmented
            testId="week-lift-level"
            value={answers.liftLevel}
            onChange={(v) => set({ liftLevel: v }, { recount: true })}
            options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]}
          />
          <Label>How many days a week can you lift?</Label>
          <Stepper testId="week-lifts" value={Math.min(answers.liftDays, liftMax)} min={1} max={liftMax} unit={answers.liftDays === 1 ? "day" : "days"} onChange={(n) => set({ liftDays: n })} />
        </>
      )}

      {u === "both" && (
        <>
          <Label>What matters most?</Label>
          <Segmented
            testId="week-priority"
            value={answers.priority}
            onChange={(v) => set({ priority: v }, { recount: true })}
            options={[{ value: "run", label: "Running" }, { value: "lift", label: "Lifting" }, { value: "equal", label: "Both the same" }]}
          />
          <Label>Can you train twice on one day?</Label>
          <Segmented testId="week-doubles" value={answers.doubles} onChange={(v) => set({ doubles: v })} options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
          <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>Yes: a run and a gym session can be on one day, with 6 hours or more between them.</div>
        </>
      )}

      <Label>Your week</Label>
      {error && (
        <Notice tone="bad" title="The app cannot make the week">
          {error}
        </Notice>
      )}
      {week && (
        <>
          <div data-testid="week-summary" style={{ ...st.body(), marginBottom: 8 }}>
            {usesRun(u) ? `${(week.runDays || []).length} ${(week.runDays || []).length === 1 ? "run" : "runs"}, ` : ""}
            {usesLift(u) ? `${(week.gymDays || []).length} lift ${(week.gymDays || []).length === 1 ? "day" : "days"}, ` : ""}
            {restCount} rest {restCount === 1 ? "day" : "days"}. Tap a day to change it.
          </div>
          <WeekRows rows={rows} use={u} editingDay={editingDay} onEdit={setEditingDay} onApply={applyEdit} onCancel={() => setEditingDay(null)} broken={broken} />
          {broken.length > 0 && (
            <Notice tone="bad" title="This change breaks a rule" testId="week-broken">
              {broken.map((b, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  {b.text}
                </div>
              ))}
            </Notice>
          )}
          {edits.length > 0 && (
            <Row gap={8} style={{ marginBottom: 12 }}>
              <Btn small kind="secondary" testId="week-undo-edit" onClick={() => setEdits((list) => list.slice(0, -1))}>
                <Undo2 size={15} /> Take back
              </Btn>
              <Btn small kind="secondary" testId="week-reset" onClick={() => setEdits([])}>
                Make the week again
              </Btn>
            </Row>
          )}
          {(week.warnings || []).map((w, i) => (
            <Notice key={i} testId="week-warning">
              {w}
            </Notice>
          ))}
          {(proposed && proposed.reasons && proposed.reasons.length > 0) && (
            <Card testId="week-reasons">
              <div style={{ ...st.title(14), marginBottom: 6 }}>Why this week</div>
              {edits.length > 0 && <div style={{ ...st.body(), fontSize: 12, marginBottom: 6 }}>You changed some days. These reasons are for the week that the app made.</div>}
              {proposed.reasons.map((r, i) => (
                <div key={i} style={{ ...st.text(), fontSize: 13, padding: "5px 0", borderTop: i ? `1px solid ${COLORS.line}` : "none" }}>
                  {r}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
      <div style={{ marginTop: 6 }}>
        <Btn testId="week-save" disabled={!week || !!error || busy || sessions === 0} onClick={() => onSave(answers, week)}>
          {busy ? "Saving…" : saveLabel}
        </Btn>
        {broken.length > 0 && <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>You can save this week. The plan then keeps each run safe, and it can make a gym session light.</div>}
      </div>
    </div>
  );
}

/* Saves the answers and the week. Returns the master record. */
export async function saveYourWeek(answers, week, { rebuild = false } = {}) {
  const [prevMaster, prevProfile] = await Promise.all([getKey(KEYS.masterPlan, null), getKey(KEYS.runProfile, null)]);
  const master = toMasterRecord(week, answers, prevMaster || {});
  const profile = { ...(prevProfile || {}), ...toProfilePatch(answers, prevProfile || {}) };
  await setKey(KEYS.runProfile, profile);
  if (rebuild && usesRun(answers.use) && profile.onboarded) {
    const state = await loadPlanState();
    if (state.plan) {
      await saveMasterAndRebuild(master, { message: "Your week changed. The plan was made again." });
      return master;
    }
  }
  await setKey(KEYS.masterPlan, master);
  return master;
}

/* plan:your-week. params: { use } (from Settings). */
export function YourWeekScreen({ nav }) {
  const params = nav.params || {};
  const [ctx, setCtx] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([getKey(KEYS.masterPlan, null), getKey(KEYS.runProfile, null)]).then(([master, profile]) => setCtx({ master, profile }));
  }, []);
  const use = normaliseUse(params.use) || (ctx && ((ctx.master && ctx.master.use) || (ctx.profile && ctx.profile.use))) || "both";
  if (!ctx) return <Screen title="Your week" onBack={nav.back}><Loading /></Screen>;

  async function save(answers, week) {
    setBusy(true);
    await saveYourWeek(answers, week, { rebuild: true });
    setBusy(false);
    nav.reload();
    nav.back();
  }

  return (
    <Screen title="Your week" onBack={nav.back} testId="your-week-screen">
      <div style={{ ...st.body(), marginBottom: 14 }}>
        You use Skid Marks for {use === "both" ? "running and lifting" : use === "run" ? "running" : "lifting"}. Answer the questions. The app then proposes a week.
      </div>
      <YourWeek key={use} use={use} prevMaster={ctx.master} profile={ctx.profile} onSave={save} busy={busy} />
    </Screen>
  );
}
