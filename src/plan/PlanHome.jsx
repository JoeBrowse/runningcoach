import { useEffect, useState } from "react";
import { Play, Dumbbell, Check, CalendarDays, Trophy, Activity, ClipboardList, History, Settings2, X } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { ModeHeader } from "../modes/ModeHeader.jsx";
import * as engine from "../run/engine.js";
import { KEYS, getKey, setKey, getRunSettings, setRunSettings, listActivities } from "../shared/store.js";
import { todayInfoFor, gymLabel, saveMasterAndRebuild, ranWithinHours } from "./planState.js";
import { st, oswald, Card, Label, Btn, Chip, Row, WorkoutShape, StepsList, Notice, LinkRow, WarmupBlock, dayLine, usePlanData, Loading, WEEK_ORDER, DAY_SHORT, DAY_LONG } from "./ui.jsx";
import { RemindersCard } from "./Reminders.jsx";
import { targetMinutesNote } from "./planText.js";
import { loadTempC, warmupContext } from "../runui/RunHome.jsx";

/* ---------------------------------------------------------------
   PLAN HOME

   Today first (prototype A): today's run and gym session from the
   master week, "Something changed?", this week as a strip, the Sunday
   review prompt, the goal gap (Advanced), niggle follow-up and gym
   conflicts.
--------------------------------------------------------------- */

export const LIFE_CHIPS = [
  { kind: "missed", label: "I missed a run" },
  { kind: "illness", label: "I am ill" },
  { kind: "injury", label: "Something hurts" },
  { kind: "holiday", label: "Holiday" },
  { kind: "break", label: "Back after a break" },
  { kind: "legs", label: "Legs feel heavy" },
  { kind: "tired", label: "I feel really tired" },
  { kind: "feedback", label: "Too hard / too easy" },
];

const PHASE_WORD = { base: "Base", build: "Build", peak: "Peak", taper: "Taper", race: "Race week", recovery: "Recovery" };

export function phaseName(week) {
  if (!week) return "";
  if (week.cutback) return "Cutback week";
  return PHASE_WORD[week.phase] || PHASE_WORD[week.kind] || "";
}

function RunBlock({ run, units, jargon, plan, nav, testId, compact, profile, tempC }) {
  const showPace = jargon && run.showPace;
  const warm = engine.warmupFor(run, warmupContext(plan, profile, tempC));
  const target = targetMinutesNote(run, profile);
  const done = !!run.done;
  return (
    <div data-testid={testId}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={st.title(compact ? 16 : 20)}>{run.title}</div>
        {done && (
          <span data-testid="today-run-done" style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.ok, fontFamily: oswald, fontSize: 12, textTransform: "uppercase" }}>
            <Check size={14} /> Done
          </span>
        )}
      </div>
      <div style={{ ...st.mono(13), color: COLORS.textDim, margin: "4px 0 10px" }}>
        {[run.km ? engine.fmtKm(run.km, units) : null, run.min ? `about ${run.min} min` : null].filter(Boolean).join(" · ")}
      </div>
      <WorkoutShape workout={run} paces={plan.paces} testId={`${testId}-shape`} />
      <div style={{ ...st.text(), marginTop: 10 }}>{run.effortText}</div>
      {target && !done && (
        <div data-testid={`${testId}-target`} style={{ ...st.body(), marginTop: 6, color: COLORS.text }}>
          {target}
        </div>
      )}
      {showPace && (
        <div style={{ marginTop: 8 }}>
          <StepsList workout={run} units={units} showPace />
        </div>
      )}
      {!compact && <div style={{ ...st.body(), marginTop: 8 }}>{run.why}</div>}
      {run.adjusted && (
        <div style={{ ...st.body(), marginTop: 6, color: COLORS.accent, fontSize: 12.5 }}>Changed: {run.adjusted}</div>
      )}
      {!compact && <WarmupBlock warmup={warm} testId={`${testId}-warmup`} />}
      {!compact && !done && run.type !== "race" && (
        <div style={{ marginTop: 12 }}>
          <Btn testId="start-run" onClick={() => nav.go("run:record", { iso: run.iso, mode: "plan" })}>
            <Play size={18} /> Start run
          </Btn>
        </div>
      )}
      {!compact && !done && run.type === "race" && (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <Btn testId="start-race" onClick={() => nav.go("run:record", { iso: run.iso, mode: "plan" })}>
            <Play size={18} /> Start race
          </Btn>
          <Btn kind="secondary" small testId="race-done" onClick={() => nav.go("plan:races", {})}>
            Race done? Add the result
          </Btn>
        </div>
      )}
    </div>
  );
}

function GymBlock({ gym, nav, afterRun, testId }) {
  const done = !!gym.done;
  const warm = engine.liftWarmup({ afterRun, heavy: gym.intensity === "heavy" && gym.advice === "normal" });
  return (
    <div data-testid={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Dumbbell size={17} color={COLORS.accent} />
        <div style={{ ...st.title(17), flex: 1 }}>Gym: {gymLabel(gym)}</div>
        {done && (
          <span data-testid="today-gym-done" style={{ display: "flex", alignItems: "center", gap: 4, color: COLORS.ok, fontFamily: oswald, fontSize: 12, textTransform: "uppercase" }}>
            <Check size={14} /> Done
          </span>
        )}
      </div>
      {gym.note && <div style={{ ...st.text(), marginTop: 4 }}>{gym.note}</div>}
      {gym.advice && gym.advice !== "normal" && <div style={{ ...st.body(), color: COLORS.accent, marginTop: 4 }}>{gym.reason}</div>}
      <WarmupBlock warmup={warm} testId={`${testId}-warmup`} />
      {!done && (
        <div style={{ marginTop: 12 }}>
          <Btn testId="start-gym" kind="secondary" onClick={() => nav.openLiftScreen("startChoice")}>
            <Dumbbell size={17} /> Start gym session
          </Btn>
        </div>
      )}
    </div>
  );
}

function TodayCard({ data, nav, afterRun, tempC }) {
  const { plan, master, units, jargon, today, profile } = data;
  const info = todayInfoFor(plan, today, master);
  const notStarted = plan && today < plan.startIso;
  const ended = plan && !info.day && !notStarted;
  return (
    <Card testId="today-card" accent>
      <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span style={st.label()}>Today · {engine.fmtDate(today)}</span>
        {jargon && info.week && <span data-testid="today-phase" style={{ ...st.label(), color: COLORS.accent }}>Week {info.week.n} · {phaseName(info.week)}</span>}
      </Row>
      {notStarted && <div style={{ ...st.text(), marginBottom: 10 }}>Your plan starts on {engine.fmtDate(plan.startIso)}. Rest or do an easy activity until then.</div>}
      {ended && <div style={{ ...st.text(), marginBottom: 10 }}>Your plan has ended. Choose a new goal in Plan setup.</div>}
      {info.run && <RunBlock run={info.run} units={units} jargon={jargon} plan={plan} nav={nav} testId="today-run" profile={profile} tempC={tempC} />}
      {info.run && info.gym && <div style={{ height: 1, background: COLORS.line, margin: "14px 0" }} />}
      {info.gym && <GymBlock gym={info.gym} nav={nav} afterRun={afterRun} testId="today-gym" />}
      {!info.run && !info.gym && info.day && (
        <div data-testid="today-rest">
          <div style={st.title(20)}>{info.day.type === "rest" ? "Rest day" : info.day.title}</div>
          <div style={{ ...st.body(), marginTop: 6 }}>{info.day.why}</div>
          {info.day.adjusted && <div style={{ ...st.body(), marginTop: 6, color: COLORS.accent }}>Changed: {info.day.adjusted}</div>}
        </div>
      )}
      {!info.run && info.nextRun && (
        <div data-testid="next-run" style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.line}` }}>
          <div style={{ ...st.label(), marginBottom: 6 }}>Next run · {engine.fmtDate(info.nextRun.iso)}</div>
          <RunBlock run={info.nextRun} units={units} jargon={jargon} plan={plan} nav={nav} testId="next-run-block" compact profile={profile} tempC={tempC} />
        </div>
      )}
    </Card>
  );
}

function WeekStrip({ data, nav }) {
  const { plan, today, master } = data;
  let week = plan ? engine.weekOf(plan, today) : null;
  if (plan && !week && today < plan.startIso) week = plan.weeks[0];
  const monday = week ? week.startIso : engine.mondayOf(today);
  const days = WEEK_ORDER.map((dow, i) => {
    const iso = engine.addDays(monday, i);
    const d = week ? week.days[i] : null;
    const gym = d ? d.gym : master && (master.gymDays || []).find((g) => Number(g.day) === dow);
    return { iso, dow, d, gym };
  });
  return (
    <div data-testid="week-strip" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
      {days.map(({ iso, dow, d, gym }) => {
        const isToday = iso === today;
        const run = d && engine.isRun(d);
        const hard = d && (d.intensity === "hard" || d.intensity === "race" || d.intensity === "long");
        return (
          <button
            key={iso}
            data-testid={`strip-${iso}`}
            onClick={() => nav.go("plan:week", { iso })}
            aria-label={`${DAY_LONG[dow]}${run ? `: ${d.title}` : ""}${gym ? `, gym` : ""}`}
            style={{
              minHeight: 72,
              borderRadius: 10,
              background: isToday ? hexToRgba(COLORS.accent, 0.12) : COLORS.surface,
              border: `1px solid ${isToday ? COLORS.accent : COLORS.line}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 4,
              padding: "6px 0",
              minWidth: 0,
            }}
          >
            <span style={{ ...st.label(), fontSize: 10, letterSpacing: 0.6, color: isToday ? COLORS.accent : COLORS.textDim }}>{DAY_SHORT[dow]}</span>
            <span style={{ ...st.mono(12), color: COLORS.text }}>{Number(iso.slice(8))}</span>
            <span style={{ display: "flex", gap: 3, alignItems: "center", height: 14 }}>
              {run && (
                d.done ? <Check size={13} color={COLORS.ok} /> : <span style={{ width: d.intensity === "long" ? 12 : 9, height: 9, borderRadius: 5, background: hard ? COLORS.accent : "transparent", border: `1.5px solid ${COLORS.accent}` }} />
              )}
              {gym && (d && d.gymDone ? <Check size={13} color={COLORS.ok} /> : <Dumbbell size={11} color={COLORS.textDim} />)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ConflictNotice({ data, nav, refresh }) {
  const { plan, master } = data;
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState([]);
  useEffect(() => {
    getRunSettings().then((s) => setDismissed((s && s.dismissedConflicts) || []));
  }, [plan && plan.id]);
  if (!plan || !plan.conflicts || !plan.conflicts.length || !master) return null;
  const keyOf = (c) => `${plan.id}|${c.kind}|${c.day}`;
  const list = plan.conflicts.filter((c) => !dismissed.includes(keyOf(c)));
  if (!list.length) return null;

  function fixFor(c) {
    const gymDays = master.gymDays || [];
    if (c.kind === "gym-light") {
      return { label: `Make ${DAY_LONG[c.day]} light`, next: { ...master, gymDays: gymDays.map((g) => (Number(g.day) === c.day ? { ...g, intensity: "light" } : g)) } };
    }
    if (c.kind === "long-run-moved" && plan.settings && Number.isInteger(plan.settings.effectiveLongRunDay)) {
      const L = plan.settings.effectiveLongRunDay;
      return { label: `Keep the long run on ${DAY_LONG[L]}`, next: { ...master, longRunDay: L, runDays: [...new Set([...(master.runDays || []), L])] } };
    }
    if (c.kind === "fewer-quality") {
      const m = /Move heavy legs to (\w+)\./.exec(c.suggestion || "");
      const to = m ? DAY_LONG.indexOf(m[1]) : -1;
      if (to >= 0 && !gymDays.some((g) => Number(g.day) === to)) {
        return { label: `Move legs to ${DAY_LONG[to]}`, next: { ...master, gymDays: gymDays.map((g) => (Number(g.day) === c.day ? { ...g, day: to } : g)) } };
      }
    }
    return null;
  }

  async function apply(c, fix) {
    setBusy(true);
    await saveMasterAndRebuild(fix.next, { message: `Gym conflict fixed: ${fix.label}.`, changes: [{ iso: data.today, before: c.reason, after: fix.label, reason: c.suggestion }] });
    setBusy(false);
    nav.reload();
    refresh();
  }
  async function dismiss(c) {
    const s = (await getRunSettings()) || {};
    const next = [...((s && s.dismissedConflicts) || []), keyOf(c)].slice(-50);
    await setRunSettings({ ...s, dismissedConflicts: next });
    setDismissed(next);
  }

  return (
    <div data-testid="conflicts">
      {list.map((c, i) => {
        const fix = fixFor(c);
        return (
          <Notice key={i} title="Gym and run clash">
            <div>{c.reason}</div>
            <div style={{ ...st.body(), marginTop: 6 }}>Suggestion: {c.suggestion}</div>
            <Row gap={8} style={{ marginTop: 10 }}>
              {fix && (
                <Btn small testId={`conflict-apply-${i}`} disabled={busy} onClick={() => apply(c, fix)}>
                  {fix.label}
                </Btn>
              )}
              <Btn small kind="secondary" testId={`conflict-keep-${i}`} onClick={() => dismiss(c)}>
                Keep as it is
              </Btn>
            </Row>
          </Notice>
        );
      })}
    </div>
  );
}

/* Asks about a niggle once a day for 7 days after an injury report. */
function NiggleFollowUp({ data, nav }) {
  const [niggle, setNiggle] = useState(null);
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    getRunSettings().then((s) => setNiggle((s && s.niggle) || null));
  }, [data.state]);
  if (!niggle || !niggle.area || !niggle.startIso) return null;
  const k = engine.daysBetween(niggle.startIso, data.today);
  if (k < 1 || k > 7) return null;
  const answered = (niggle.answers || []).find((a) => a.iso === data.today);
  const pain = answer != null ? answer : answered ? answered.pain : null;

  async function save(p) {
    setAnswer(p);
    const s = (await getRunSettings()) || {};
    const n = { ...(s.niggle || niggle) };
    n.answers = [...(n.answers || []).filter((a) => a.iso !== data.today), { iso: data.today, pain: p }];
    await setRunSettings({ ...s, niggle: n });
  }

  const area = String(niggle.area).trim();
  return (
    <Card testId="niggle-card">
      <div style={st.title(15)}>{area.charAt(0).toUpperCase() + area.slice(1)} today?</div>
      <div style={{ ...st.body(), margin: "4px 0 10px" }}>Day {k} of 7. Pain from 0 to 10 when you walk or run?</div>
      {pain == null ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
            <button key={p} data-testid={`niggle-${p}`} onClick={() => save(p)} style={{ minHeight: 44, borderRadius: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>
              {p}
            </button>
          ))}
        </div>
      ) : pain <= 3 ? (
        <div data-testid="niggle-ok" style={st.text()}>Pain {pain}/10. Good. Keep to the plan. Stop a run if the pain is more than 3/10 or you limp.</div>
      ) : (
        <div data-testid="niggle-bad">
          <div style={{ ...st.text(), marginBottom: 10 }}>Pain {pain}/10. Do not run on it today. Please see a physio or doctor if it does not get better.</div>
          <Btn small onClick={() => nav.go("plan:life", { kind: "injury", area })}>Change my plan</Btn>
        </div>
      )}
    </Card>
  );
}

function ReviewPrompt({ data, nav }) {
  const [last, setLast] = useState(undefined);
  useEffect(() => {
    getRunSettings().then((s) => setLast((s && s.reviewedWeek) || null));
  }, [data.state]);
  const dow = engine.weekdayOf(data.today);
  if (!data.plan || last === undefined || (dow !== 0 && dow !== 1)) return null;
  const weekStart = dow === 0 ? engine.mondayOf(data.today) : engine.addDays(engine.mondayOf(data.today), -7);
  if (last === weekStart || weekStart < engine.mondayOf(data.plan.startIso)) return null;
  return (
    <Card testId="review-prompt" onClick={() => nav.go("plan:review", { weekStart })}>
      <Row>
        <ClipboardList size={18} color={COLORS.accent} />
        <div style={{ flex: 1 }}>
          <div style={st.title(15)}>Weekly review</div>
          <div style={st.body()}>See what you did, check next week and accept it. It takes one minute.</div>
        </div>
      </Row>
    </Card>
  );
}

function GoalGapCard({ data }) {
  const { plan, today } = data;
  if (!plan || !data.jargon) return null;
  const gap = engine.goalGap(plan);
  const tt = engine.timeTrialDue(plan, today);
  return (
    <Card testId="goal-gap">
      <div style={{ ...st.label(), marginBottom: 6 }}>Goal · {plan.goalName}</div>
      {gap.hasGoal ? (
        <Row gap={14} style={{ marginBottom: 8 }}>
          <div>
            <div style={st.label()}>Goal</div>
            <div style={{ ...st.mono(18), color: COLORS.text }}>{engine.fmtTime(gap.goalSec)}</div>
          </div>
          <div>
            <div style={st.label()}>Predicted</div>
            <div style={{ ...st.mono(18), color: gap.status === "behind" ? COLORS.bad : gap.status === "on-track" ? COLORS.ok : COLORS.text }}>{engine.fmtTime(gap.predictedSec)}</div>
          </div>
        </Row>
      ) : null}
      <div style={st.text()}>{gap.text}</div>
      <div data-testid="time-trial" style={{ ...st.body(), marginTop: 6, color: tt.due ? COLORS.accent : COLORS.textDim }}>{tt.reason}</div>
      <div style={{ ...st.body(), fontSize: 11.5, marginTop: 6 }}>Running fitness score: {plan.score}. Predictions are estimates, not promises.</div>
    </Card>
  );
}

function SetupCard({ data, nav }) {
  const [hidden, setHidden] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    getKey("plan-setup-card-dismissed", false).then((v) => {
      setHidden(!!v);
      setChecked(true);
    });
  }, []);
  if (!checked) return null;
  if (hidden) {
    return (
      <LinkRow testId="setup-running-link" onClick={() => nav.go("plan:setup", {})}>
        Set up running
      </LinkRow>
    );
  }
  return (
    <Card testId="setup-running" accent>
      <Row style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={st.title(18)}>Set up running</div>
          <div style={{ ...st.body(), margin: "6px 0 12px" }}>
            Make a free running plan that fits around your gym days. Your Lift data stays as it is.
          </div>
        </div>
        <button
          aria-label="Hide"
          data-testid="setup-running-hide"
          onClick={async () => {
            await setKey("plan-setup-card-dismissed", true);
            setHidden(true);
          }}
          style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim }}
        >
          <X size={18} />
        </button>
      </Row>
      <Btn testId="setup-running-go" onClick={() => nav.go("plan:setup", {})}>
        Start
      </Btn>
      {!(data.master && data.master.use) && (
        <div style={{ marginTop: 8 }}>
          <Btn kind="secondary" small testId="setup-week-go" onClick={() => nav.go("plan:your-week", { use: "both" })}>
            Plan my week first
          </Btn>
        </div>
      )}
      {data.master && data.master.gymDays && data.master.gymDays.length > 0 && <div style={{ ...st.body(), fontSize: 12, marginTop: 8 }}>Your gym days are already in your master week.</div>}
    </Card>
  );
}

export function PlanHome({ nav }) {
  const [data, refresh] = usePlanData(nav);
  const [afterRun, setAfterRun] = useState(false);
  // The warm-up changes in the cold, so read the weather cache as Run home does.
  const [tempC, setTempC] = useState(null);
  useEffect(() => {
    loadTempC().then(setTempC).catch(() => setTempC(null));
  }, [nav.reloadKey]);
  useEffect(() => {
    listActivities()
      .then((l) => ranWithinHours(2, l))
      .then(setAfterRun)
      .catch(() => setAfterRun(false));
  }, [nav.reloadKey]);

  return (
    <div data-testid="plan-home" style={{ padding: "28px 20px 48px" }}>
      <ModeHeader mode={nav.mode} onModeChange={nav.setMode} onViewSettings={nav.openSettings} />
      {!data ? (
        <Loading />
      ) : (
        <>
          {(!data.plan || !(data.profile && data.profile.onboarded)) && <SetupCard data={data} nav={nav} />}
          {(data.plan || (data.master && data.master.gymDays && data.master.gymDays.length > 0)) && <TodayCard data={data} nav={nav} afterRun={afterRun} tempC={tempC} />}
          <NiggleFollowUp data={data} nav={nav} />
          <ConflictNotice data={data} nav={nav} refresh={refresh} />
          {data.plan && (
            <>
              <Label>Something changed?</Label>
              <div data-testid="life-chips" style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {LIFE_CHIPS.map((c) => (
                  <Chip key={c.kind} testId={`life-${c.kind}`} onClick={() => nav.go("plan:life", { kind: c.kind })}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            </>
          )}
          {(data.plan || data.master) && (
            <>
              <Label>{data.plan && data.today < data.plan.startIso ? "First week of the plan" : "This week"}</Label>
              <WeekStrip data={data} nav={nav} />
              <div style={{ ...st.body(), fontSize: 11.5, marginBottom: 12 }}>Filled mark: hard or long run. Ring: easy run. Dumbbell: gym.</div>
            </>
          )}
          <ReviewPrompt data={data} nav={nav} />
          <GoalGapCard data={data} />
          <Label>Plan</Label>
          <LinkRow testId="link-week" icon={<CalendarDays size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:week", {})}>
            Master week
          </LinkRow>
          <LinkRow testId="link-races" icon={<Trophy size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:races", {})}>
            Goals and races
          </LinkRow>
          <LinkRow testId="link-body" icon={<Activity size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:body", {})}>
            Body: muscle readiness
          </LinkRow>
          {data.plan && (
            <LinkRow testId="link-review" icon={<ClipboardList size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:review", {})}>
              Weekly review
            </LinkRow>
          )}
          {data.plan && (
            <LinkRow testId="link-changes" icon={<History size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:changes", {})}>
              What changed and why
            </LinkRow>
          )}
          <LinkRow testId="link-setup" icon={<Settings2 size={17} color={COLORS.accent} />} onClick={() => nav.go("plan:setup", {})}>
            {data.plan ? "Change goal or plan setup" : "Make a plan"}
          </LinkRow>
          <Label>Reminders</Label>
          <RemindersCard nav={nav} />
          <div style={{ ...st.body(), fontSize: 11.5, marginTop: 16 }}>
            This app gives general training information. It is not medical advice. Stop and get help if you feel pain, chest pain, faintness or very short of breath.
          </div>
        </>
      )}
    </div>
  );
}


