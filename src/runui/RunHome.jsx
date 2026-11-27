import { useEffect, useState } from "react";
import {
  Activity, BarChart3, CalendarDays, ChevronDown, ChevronRight, ChevronUp, CloudSun, Database, Dumbbell, Flag, Footprints, Gauge, HeartPulse, ListChecks, Map as MapIcon, MessageCircle, Soup, Wrench,
} from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS, hexToRgba } from "../theme.js";
import { ModeHeader } from "../modes/ModeHeader.jsx";
import { listActivities, getReadinessLog } from "../shared/store.js";
import { getCachedWeather, getWeatherSettings } from "../shared/weather.js";
import { todayInfo, gymLabel } from "../plan/planState.js";
import { targetMinutesNote } from "../plan/planText.js";
import { getProfile, getRunPrefs, isRunActivity, jargonOn, paceOn, stepLines, unitsOf } from "./runData.js";
import { Btn, Loading, MONO, Note, OSWALD, Ribbon, S } from "./ui.jsx";

/* ---------------------------------------------------------------
   RUN HOME

   Today's run (title, lane ribbon, effort words or paces, why, warm-up,
   GO), or on a rest or gym day: that day plus the next run, with no
   GO button. Then quick links and "Something changed?".
--------------------------------------------------------------- */

/* Version 2.4 keeps Run simple: the plan, progress, and data (import and
   the watch). The other run screens stay in the code (src/runui/screens.js)
   but have no link here while Run is in beta. */
const LINKS = [
  { id: "run:plan", label: "Plan weeks", Icon: CalendarDays },
  { id: "run:progress", label: "Progress", Icon: BarChart3 },
  { id: "shared:data", label: "Watch and data", Icon: Database },
];

export const BETA_ISSUES_URL = "https://github.com/JoeBrowse/skidmarks/issues";

/* Run is in beta (version 2.4). */
export function BetaBanner({ testId = "run-beta" }) {
  return (
    <div data-testid={testId} style={{ ...S.card(), borderColor: COLORS.accent, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ background: COLORS.accent, color: COLORS.onAccent, fontFamily: OSWALD, fontSize: 11, letterSpacing: 1, borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>BETA</span>
      <span style={{ ...S.body(), color: COLORS.text }}>
        Run is in beta. Tell us what does not work on{" "}
        <a href={BETA_ISSUES_URL} target="_blank" rel="noreferrer" style={{ color: COLORS.accent }}>
          GitHub
        </a>
        .
      </span>
    </div>
  );
}

export async function loadTempC() {
  try {
    const cfg = await getWeatherSettings();
    if (!cfg.enabled) return null;
    const w = await getCachedWeather();
    const t = w && w.current ? w.current.tempC : null;
    return Number.isFinite(t) ? t : null;
  } catch (e) {
    return null;
  }
}

export function warmupContext(plan, profile, tempC) {
  return { experience: (plan && plan.settings && plan.settings.experience) || (profile && profile.experience) || "some", tempC, goal: plan ? plan.goal : undefined };
}

export function WarmupRow({ warmup, testId = "warmup-row" }) {
  const [open, setOpen] = useState(false);
  if (!warmup) return null;
  const easy = warmup.kind === "easy";
  const head = easy ? "Warm-up: start slowly" : `Warm-up: ${warmup.minutes} min`;
  return (
    <div data-testid={testId} style={{ borderTop: `1px solid ${COLORS.line}`, marginTop: 12 }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", color: COLORS.text }}>
        <span style={{ fontFamily: OSWALD, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>{head}</span>
        {open ? <ChevronUp size={18} color={COLORS.textDim} /> : <ChevronDown size={18} color={COLORS.textDim} />}
      </button>
      {open && (
        <div data-testid={`${testId}-detail`} style={{ paddingBottom: 4 }}>
          {warmup.phases.map((p) => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ ...S.label(), color: COLORS.accent }}>{p.title}</span>
                {p.min > 0 && <span style={{ fontFamily: MONO, fontSize: 11.5, color: COLORS.textDim }}>{p.min} min</span>}
              </div>
              {p.items.map((m) => (
                <div key={m.id} style={{ marginTop: 6 }}>
                  <div style={{ color: COLORS.text, fontSize: 13 }}>
                    {m.name} <span style={{ color: COLORS.textDim, fontFamily: MONO, fontSize: 11.5 }}>· {m.dose}</span>
                  </div>
                  <div style={{ ...S.body(), fontSize: 12 }}>{m.how}</div>
                </div>
              ))}
              {p.note && <div style={{ ...S.body(), marginTop: 4 }}>{p.note}</div>}
            </div>
          ))}
          {warmup.notes.map((n, i) => (
            <div key={i} style={{ ...S.body(), marginTop: 4 }}>
              {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoButton({ onClick }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <button
        data-testid="go-button"
        onClick={onClick}
        aria-label="Go. Start the run"
        style={{
          width: 132,
          height: 132,
          borderRadius: "50%",
          background: COLORS.accent,
          color: COLORS.onAccent,
          fontFamily: OSWALD,
          fontSize: 40,
          letterSpacing: 3,
          boxShadow: `0 0 0 8px ${hexToRgba(COLORS.accent, 0.16)}, 0 0 0 16px ${hexToRgba(COLORS.accent, 0.07)}`,
        }}
      >
        GO
      </button>
    </div>
  );
}

function WorkoutBody({ w, units, showPace, testId }) {
  const lines = stepLines(w, units, showPace && w.showPace !== false);
  return (
    <div data-testid={testId}>
      <div style={{ marginTop: 10 }}>
        <Ribbon workout={w} />
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
        {w.km > 0 && <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text }}>{engine.fmtKm(w.km, units)}</span>}
        {w.min > 0 && <span style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text }}>about {w.min} min</span>}
      </div>
      {showPace && w.showPace !== false ? (
        <div style={{ marginTop: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 12, color: COLORS.textDim, lineHeight: 1.6 }}>
              {l}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...S.text(), marginTop: 8 }}>{w.effortText}</div>
      )}
    </div>
  );
}

export function RunHome({ nav }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [info, profile, acts, prefs, tempC, rlog] = await Promise.all([todayInfo(), getProfile(), listActivities(nav.settings), getRunPrefs(), loadTempC(), getReadinessLog()]);
        if (!live) return;
        setData({ info, profile, acts, prefs, tempC, rlog });
      } catch (e) {
        if (live) setError("The app cannot read your plan. Try again.");
      }
    })();
    return () => {
      live = false;
    };
  }, [nav.reloadKey, nav.settings]);

  const header = <ModeHeader mode={nav.mode} onModeChange={nav.setMode} onViewSettings={nav.openSettings} />;
  if (!data) {
    return (
      <div data-testid="run-home" style={{ padding: "28px 24px 40px" }}>
        {header}
        {error ? <Note tone="warn">{error}</Note> : <Loading />}
      </div>
    );
  }

  const { info, profile, acts, prefs, tempC, rlog } = data;
  const plan = info.plan;
  const units = unitsOf(profile);
  const showPace = paceOn(nav.settings, plan, acts, info.iso, profile);
  const jargon = jargonOn(nav.settings, plan, acts, info.iso);
  const run = info.run;
  const wctx = warmupContext(plan, profile, tempC);
  const checkedIn = (rlog || []).some((r) => r.date === info.iso);

  // This week's distance, done against planned.
  const week = info.week;
  let weekLine = null;
  if (week) {
    const end = engine.addDays(week.startIso, 6);
    const done = acts.filter((a) => isRunActivity(a) && a.date >= week.startIso && a.date <= end).reduce((s, a) => s + (a.km || 0), 0);
    weekLine = `This week: ${engine.fmtKm(done, units)} of ${engine.fmtKm(week.km || 0, units)}`;
  }

  const startRun = (w) => nav.go("run:record", { iso: w.iso, mode: "plan", workout: w });

  let todayCard;
  // Running is set up after the run setup (spec v1.1 section 2). An old
  // "Only the gym" profile counts as not set up.
  const runningSetUp = !!(profile && profile.onboarded && profile.level !== "gym-only");
  if (!plan && !runningSetUp) {
    todayCard = (
      <div data-testid="setup-running-card" style={{ ...S.card(), border: `1px solid ${COLORS.accent}` }}>
        <div style={{ ...S.title(), fontSize: 20 }}>Set up running</div>
        <div style={{ ...S.body(), margin: "6px 0 12px" }}>
          {profile && (profile.use === "run" || profile.use === "both") ? "Your run days come from your week. Tell the app your goal and your fitness. Then it makes your plan." : "Tell the app your goal, your days and your fitness. Then it makes your plan."}
        </div>
        <Btn kind="primary" testId="setup-running-start" onClick={() => nav.go("plan:setup", { from: "run" })}>
          Set up running
        </Btn>
        <div style={{ height: 8 }} />
        <Btn testId="free-run" onClick={() => nav.go("run:record", { mode: "free" })}>
          Free run
        </Btn>
      </div>
    );
  } else if (!plan) {
    todayCard = (
      <div data-testid="no-plan" style={S.card()}>
        <div style={S.label()}>Today</div>
        <div style={{ ...S.title(), fontSize: 20, marginTop: 4 }}>No plan yet</div>
        <div style={{ ...S.body(), marginBottom: 12 }}>Make a plan. The coach then shows your run for each day. You can also record a free run now.</div>
        <Btn kind="primary" testId="make-plan" onClick={() => nav.go("plan:setup")}>
          Make a plan
        </Btn>
        <div style={{ height: 8 }} />
        <Btn testId="free-run" onClick={() => nav.go("run:record", { mode: "free" })}>
          Free run
        </Btn>
      </div>
    );
  } else if (run) {
    const done = !!run.done;
    const warm = engine.warmupFor(run, wctx);
    todayCard = (
      <div data-testid="today-run" style={S.card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={S.label()}>Today · {engine.fmtDate(info.iso)}</span>
          {jargon && week && week.phase && <span style={{ ...S.label(), color: COLORS.accent }}>{week.phase}</span>}
        </div>
        <div style={{ ...S.title(), fontSize: 22, marginTop: 4 }} data-testid="today-title">
          {run.title}
        </div>
        {info.gym && <div style={{ ...S.body(), marginTop: 2 }}>Also today: {gymLabel(info.gym)}</div>}
        <WorkoutBody w={run} units={units} showPace={showPace} testId="today-body" />
        {!done && targetMinutesNote(run, profile) && (
          <div data-testid="today-target" style={{ ...S.body(), marginTop: 6, color: COLORS.text }}>
            {targetMinutesNote(run, profile)}
          </div>
        )}
        {run.adjusted && <div style={{ ...S.body(), marginTop: 8, color: COLORS.text }}>Change: {run.adjusted}</div>}
        <div style={{ marginTop: 10, borderLeft: `3px solid ${COLORS.accent}`, paddingLeft: 10 }}>
          <div style={S.label()}>Why this session</div>
          <div style={{ ...S.text(), marginTop: 2 }} data-testid="today-why">
            {run.why}
          </div>
        </div>
        <WarmupRow warmup={warm} />
        {done ? (
          <div data-testid="today-done" style={{ marginTop: 14 }}>
            <Note tone="ok">Done. Well done. Rest well and eat well.</Note>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {run.done.activityId && (
                <Btn onClick={() => nav.go("run:activity", { id: run.done.activityId })} testId="today-view-run">
                  See the run
                </Btn>
              )}
              <Btn onClick={() => nav.go("run:record", { mode: "free" })} testId="free-run">
                Free run
              </Btn>
            </div>
          </div>
        ) : (
          <GoButton onClick={() => startRun(run)} />
        )}
      </div>
    );
  } else {
    const day = info.day;
    const next = info.nextRun;
    const gym = info.gym;
    const restTitle = gym ? `Gym day: ${gymLabel(gym)}` : day && day.type === "strength" ? day.title : day && day.type === "cross" ? day.title : "Rest day";
    const restWhy = gym ? gym.reason || "Your gym session from the master week." : day ? day.why : "There is no run today.";
    todayCard = (
      <div data-testid="today-rest" style={S.card()}>
        <div style={S.label()}>Today · {engine.fmtDate(info.iso)}</div>
        <div style={{ ...S.title(), fontSize: 22, marginTop: 4 }} data-testid="today-title">
          {restTitle}
        </div>
        <div style={{ ...S.text(), marginTop: 4 }}>{restWhy}</div>
        {gym && (
          <div style={{ marginTop: 10 }}>
            {gym.done ? (
              <Note tone="ok">Gym session done.</Note>
            ) : (
              <Btn onClick={() => nav.setMode("lift")} testId="open-lift">
                <Dumbbell size={16} /> Open Lift
              </Btn>
            )}
          </div>
        )}
        {next && (
          <div data-testid="next-run" style={{ marginTop: 14, borderTop: `1px solid ${COLORS.line}`, paddingTop: 12 }}>
            <div style={S.label()}>Next run · {engine.fmtDate(next.iso)}</div>
            <div style={{ ...S.title(), marginTop: 4 }}>{next.title}</div>
            <WorkoutBody w={next} units={units} showPace={showPace} testId="next-body" />
            {next.type === "race" && <WarmupRow warmup={engine.warmupFor(next, wctx)} testId="next-warmup" />}
          </div>
        )}
        <button data-testid="free-run" onClick={() => nav.go("run:record", { mode: "free" })} style={{ marginTop: 12, minHeight: 44, color: COLORS.accent, fontFamily: OSWALD, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 4 }}>
          Free run <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div data-testid="run-home" style={{ paddingBottom: 40, overflowX: "hidden" }}>
      <div style={{ padding: "28px 24px 0" }}>{header}</div>
      <BetaBanner />
      {todayCard}
      {weekLine && (
        <div data-testid="week-line" style={{ ...S.body(), padding: "0 24px 10px", fontFamily: MONO, fontSize: 12 }}>
          {weekLine}
        </div>
      )}
      {prefs.dailyCheckin && !checkedIn && (
        <div style={S.card({ display: "flex", alignItems: "center", gap: 12 })}>
          <ListChecks size={20} color={COLORS.accent} />
          <div style={{ flex: 1, ...S.text() }}>Daily check-in. It takes 10 seconds.</div>
          <Btn style={{ width: "auto", padding: "10px 14px" }} onClick={() => nav.go("run:checkin")} testId="home-checkin">
            Check in
          </Btn>
        </div>
      )}
      <div style={{ padding: "0 20px 12px" }}>
        <Btn onClick={() => nav.go("plan:life")} testId="something-changed">
          <Activity size={16} /> Something changed?
        </Btn>
      </div>
      <div style={S.section()}>More</div>
      <div data-testid="quick-links" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, padding: "0 20px" }}>
        {LINKS.map(({ id, label, Icon }) => (
          <button
            key={id}
            data-testid={`link-${id}`}
            onClick={() => nav.go(id)}
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, minHeight: 78, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: COLORS.text, minWidth: 0 }}
          >
            <Icon size={20} color={COLORS.accent} />
            <span style={{ fontFamily: OSWALD, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", lineHeight: 1.25 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
