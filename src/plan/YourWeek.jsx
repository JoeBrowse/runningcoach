import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Minus, Plus, Undo2 } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import * as engine from "../run/engine.js";
import { KEYS, getKey, setKey } from "../shared/store.js";
import { GYM_TYPE_LABEL, saveMasterAndRebuild, loadPlanState } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Segmented, DayPicker, Notice, Loading, st, oswald, DAY_LONG } from "./ui.jsx";
import {
  toPlanWeekInput, toMasterRecord, toProfilePatch, weekRows, applyDayEdit, checkWeek, usesRun, usesLift, normaliseUse,
  PROGRAMMES, weekFromPicks, defaultPicks, picksToAnswers,
} from "./weekSetup.js";

/* ---------------------------------------------------------------
   YOUR WEEK (version 2.4; spec v1.1 section 1, step 4)

   Picks: the lift days and the programme (full body, upper and lower,
   or push, pull, legs), the run days and the long-run day. The app
   places the leg days away from the long run (weekSetup.weekFromPicks)
   and shows the week as 7 rows. The user can tap a day to change it;
   the app then checks the changed week against the rules. Save writes
   the master week.

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
  return `${g.name || GYM_TYPE_LABEL[g.type] || "Gym"} · ${g.intensity === "heavy" ? "heavy" : "light"}`;
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

/* The proposed week for the answers (engine.planWeek). Kept for tests and
   for a later "Suggest a week" button. Returns { week, error }. */
export function proposeWeek(answers) {
  if (typeof engine.planWeek !== "function") return { week: null, error: "The app cannot plan a week in this version." };
  try {
    return { week: engine.planWeek(toPlanWeekInput(answers)), error: "" };
  } catch (e) {
    return { week: null, error: (e && e.message) || String(e) };
  }
}

/* YOUR WEEK (version 2.4): you pick the days. The app only places the leg
   days and says when a session must be light (weekSetup.weekFromPicks). */
export function YourWeek({ use, prevMaster, profile, onSave, saveLabel = "Save my week", busy }) {
  const [picks, setPicks] = useState(() => defaultPicks(use, prevMaster));
  const [edits, setEdits] = useState([]); // stack of edited weeks, newest last
  const [editingDay, setEditingDay] = useState(null);
  const u = picks.use;
  const answers = useMemo(() => picksToAnswers(picks, profile || {}), [picks, profile]);

  const proposed = useMemo(() => weekFromPicks(picks), [picks]);
  const week = edits.length ? edits[edits.length - 1] : proposed;
  const broken = useMemo(() => (edits.length && week ? checkWeek(week, { ...answers, doubles: true }) : []), [edits, week, answers]);
  const rows = week ? weekRows(week, answers) : [];

  // A new pick makes a new week. Changed days are cleared.
  function set(patch) {
    setEdits([]);
    setEditingDay(null);
    setPicks((p) => {
      const next = { ...p, ...patch };
      if (next.runDays && !next.runDays.includes(next.longRunDay)) next.longRunDay = next.runDays.includes(6) ? 6 : next.runDays.includes(0) ? 0 : next.runDays[next.runDays.length - 1] ?? null;
      return next;
    });
  }

  function applyEdit(edit) {
    const next = applyDayEdit(week, editingDay, edit, answers);
    setEdits((list) => [...list, next]);
    setEditingDay(null);
  }

  const sessions = week ? (week.runDays || []).length + (week.gymDays || []).length : 0;
  const restCount = rows.filter((r) => !r.run && !r.gym).length;

  return (
    <div data-testid="your-week">
      {usesLift(u) && (
        <>
          <Label style={{ marginTop: 0 }}>Which days do you lift?</Label>
          <DayPicker testId="week-lift-days" value={picks.liftDays} onChange={(v) => set({ liftDays: v })} />
          <Label>Your programme</Label>
          <div style={{ display: "grid", gap: 6 }}>
            {PROGRAMMES.map((p) => (
              <Chip key={p.id} testId={`week-programme-${p.id}`} active={picks.programme === p.id} onClick={() => set({ programme: p.id })} style={{ textAlign: "left", borderRadius: 12, padding: "10px 14px" }}>
                <span style={{ display: "block", fontSize: 14 }}>{p.label}</span>
                <span style={{ display: "block", ...st.body(), fontSize: 12 }}>{p.detail}</span>
              </Chip>
            ))}
          </div>
          <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>The app puts the leg days away from your long run. Change your programme here at any time.</div>
        </>
      )}

      {usesRun(u) && (
        <>
          <Label style={usesLift(u) ? undefined : { marginTop: 0 }}>Which days do you run?</Label>
          <DayPicker testId="week-run-days" value={picks.runDays} onChange={(v) => set({ runDays: v })} />
          {picks.runDays.length > 0 && (
            <>
              <Label>Long-run day</Label>
              <div data-testid="week-long-day" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {picks.runDays.map((d) => (
                  <Chip key={d} testId={`week-long-day-${d}`} active={picks.longRunDay === d} onClick={() => set({ longRunDay: d })}>
                    {DAY_LONG[d]}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Label>Your week</Label>
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
                Start again
              </Btn>
            </Row>
          )}
          {(proposed.warnings || []).map((w, i) => (
            <Notice key={i} testId="week-warning">
              {w}
            </Notice>
          ))}
          {proposed.reasons.length > 0 && !edits.length && (
            <Card testId="week-reasons">
              <div style={{ ...st.title(14), marginBottom: 6 }}>About this week</div>
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
        <Btn testId="week-save" disabled={!week || busy || sessions === 0} onClick={() => onSave(answers, week)}>
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
        You use Skid Marks for {use === "both" ? "running and lifting" : use === "run" ? "running" : "lifting"}. Pick your days. The app keeps the leg days away from your long run.
      </div>
      <YourWeek key={use} use={use} prevMaster={ctx.master} profile={ctx.profile} onSave={save} busy={busy} />
    </Screen>
  );
}
