import { useState } from "react";
import { Check } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { safeSet } from "../lib/storage.js";
import { KEYS, getKey, setKey, getRaces } from "../shared/store.js";
import { HistoryImport } from "../shared/ui/HistoryImport.jsx";
import { rebuildPlan } from "./planState.js";
import { Screen, Card, Btn, Chip, Row, Label, Segmented, DayPicker, TickBox, Notice, st, oswald, DAY_LONG } from "./ui.jsx";
import { DISCLAIMER, PlanResult } from "./PlanSetup.jsx";

/* ---------------------------------------------------------------
   FIRST OPEN (spec section 3)

   "Who are you?" replaces the old Simple/Advanced welcome step:
     new to running  -> Simple mode, 3 questions, run/walk plan
     runs sometimes  -> asks Simple or Advanced in one line, history, wizard
     trains for races-> Advanced mode, history, wizard
     only the gym    -> asks Simple or Advanced, Lift mode
   Upgraded Iron Log users (with lift history) never see it: App.jsx
   skips it and Plan home shows a "Set up running" card instead.
--------------------------------------------------------------- */

export const LEVELS = [
  { id: "new", label: "I am new to running", detail: "A gentle run/walk plan. No race date." },
  { id: "some", label: "I run sometimes", detail: "A plan that fits your week and your gym days." },
  { id: "racer", label: "I train for races", detail: "Race plans, paces, zones and predictions." },
  { id: "gym-only", label: "Only the gym", detail: "Lift mode. You can start running later." },
];

export const LEVEL_APP_MODE = { new: "simple", racer: "advanced" };

export function WhoAreYou({ onChoose, overlay }) {
  const [level, setLevel] = useState(null);
  const [appMode, setAppMode] = useState("simple");
  const needsAsk = level === "some" || level === "gym-only";
  const wrap = overlay
    ? { position: "fixed", inset: 0, zIndex: 220, background: COLORS.bg, overflowY: "auto", display: "flex", flexDirection: "column" }
    : {};
  return (
    <div data-testid="who-are-you" style={wrap}>
      <div style={{ flex: 1, padding: overlay ? "44px 20px 16px" : "0 0 8px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {overlay && <div style={{ color: COLORS.accent, fontFamily: oswald, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8 }}>Skid Marks</div>}
        <div style={{ color: COLORS.text, fontFamily: oswald, fontSize: overlay ? 30 : 24, textTransform: "uppercase", lineHeight: 1.1, letterSpacing: 0.5, marginBottom: 10 }}>Who are you?</div>
        <div style={{ ...st.body(), marginBottom: 18 }}>Select one. You can change everything later. All features are free, with no account and no ads. Your data stays on your phone.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {LEVELS.map((l) => {
            const active = level === l.id;
            return (
              <button
                key={l.id}
                data-testid={`who-${l.id}`}
                onClick={() => setLevel(l.id)}
                style={{ textAlign: "left", background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: "14px 16px", minHeight: 64 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                  <span style={{ width: 17, height: 17, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {active && <Check size={11} color={COLORS.onAccent} />}
                  </span>
                  <span style={{ color: COLORS.text, fontFamily: oswald, fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>{l.label}</span>
                </div>
                <div style={{ ...st.body(), fontSize: 12.5, paddingLeft: 26 }}>{l.detail}</div>
              </button>
            );
          })}
        </div>
        {needsAsk && (
          <div data-testid="who-appmode" style={{ marginBottom: 12 }}>
            <div style={{ ...st.text(), fontSize: 13, marginBottom: 6 }}>How much do you want on screen?</div>
            <Segmented testId="who-mode" value={appMode} onChange={setAppMode} options={[{ value: "simple", label: "Simple" }, { value: "advanced", label: "All features" }]} />
          </div>
        )}
      </div>
      <div style={{ position: overlay ? "sticky" : "static", bottom: 0, padding: overlay ? "14px 20px calc(18px + env(safe-area-inset-bottom, 0px))" : 0, background: overlay ? `linear-gradient(to top, ${COLORS.bg} 65%, transparent)` : "none" }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <Btn testId="who-continue" disabled={!level} onClick={() => onChoose({ level, appMode: LEVEL_APP_MODE[level] || appMode })}>
            {level ? "Continue" : "Pick one to continue"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* Called by App.jsx after "Who are you?" on a first launch.
   ctx: { settings, updateSettings, startTour, openOnboarding } */
export async function handleFirstChoice({ level, appMode }, ctx) {
  const mode = level === "gym-only" ? "lift" : "plan";
  await ctx.updateSettings({ ...ctx.settings, appMode, mode });
  await safeSet("mode-chosen", true);
  if (level === "gym-only") {
    const prev = (await getKey(KEYS.runProfile, null)) || {};
    await setKey(KEYS.runProfile, { ...prev, level: "gym-only", onboarded: true });
    ctx.startTour(appMode);
    return;
  }
  // The Lift tour describes Iron Log screens. A runner gets the plan
  // setup instead; the full tour stays in Settings.
  await safeSet("tour-seen", true);
  ctx.openOnboarding({ level, appMode });
}

const DAY_SETS = { 2: [3, 6], 3: [2, 4, 6], 4: [1, 3, 5, 6] };

function NewRunner({ nav, appMode }) {
  const [days, setDays] = useState(3);
  const [runDays, setRunDays] = useState(DAY_SETS[3]);
  const [minutes, setMinutes] = useState(30);
  const [gym, setGym] = useState(false);
  const [gymDay, setGymDay] = useState(1);
  const [consent, setConsent] = useState(false);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const gymClash = gym && runDays.includes(gymDay);

  async function make() {
    setBusy(true);
    const prevProfile = (await getKey(KEYS.runProfile, null)) || {};
    const prevMaster = (await getKey(KEYS.masterPlan, null)) || {};
    const longRunDay = runDays.includes(6) ? 6 : runDays.includes(0) ? 0 : runDays[runDays.length - 1];
    const profile = {
      ...prevProfile,
      level: "new",
      goal: "runwalk",
      experience: "new",
      units: prevProfile.units || "km",
      runDays,
      longRunDay,
      minutesPerSession: minutes,
      currentWeeklyKm: 0,
      score: null,
      raceDate: null,
      goalTimeSec: null,
      usesLift: gym,
      fitnessSource: "new",
      consentAt: new Date().toISOString(),
      onboarded: true,
    };
    const otherGym = (prevMaster.gymDays || []).filter((g) => Number(g.day) !== gymDay);
    const master = { runDays, longRunDay, gymDays: gym ? [...otherGym, { day: gymDay, type: "full", intensity: "light", note: "Beginner machines" }] : otherGym };
    await setKey(KEYS.runProfile, profile);
    await setKey(KEYS.masterPlan, master);
    const { plan: p } = await rebuildPlan(profile, master, await getRaces(), { message: "New plan: run/walk to 5K." });
    if (appMode && nav.settings.appMode !== appMode) await nav.updateSettings({ ...nav.settings, appMode, mode: "plan" });
    setPlan(p);
    setBusy(false);
    nav.reload();
  }

  if (plan) {
    return (
      <>
        <Notice tone="ok" title="Your plan is ready">
          Run/walk sessions of about {minutes} minutes, {runDays.length} days a week. The run parts get longer as you get fitter. There is no race date.
        </Notice>
        <PlanResult plan={plan} units="km" jargon={false} />
        <Btn testId="onboarding-finish" onClick={() => nav.home()}>
          See today
        </Btn>
      </>
    );
  }

  return (
    <div data-testid="new-runner">
      <Label style={{ marginTop: 0 }}>1. How many days a week can you run?</Label>
      <Row gap={6}>
        {[2, 3, 4].map((n) => (
          <Chip key={n} testId={`new-days-${n}`} active={days === n} onClick={() => { setDays(n); setRunDays(DAY_SETS[n]); }} style={{ flex: 1 }}>
            {n} days
          </Chip>
        ))}
      </Row>
      <div style={{ ...st.body(), fontSize: 12, margin: "8px 0 6px" }}>These days. Tap to change them.</div>
      <DayPicker testId="new-run-days" value={runDays} onChange={(v) => v.length <= 4 && v.length > 0 && setRunDays(v)} />
      <Label>2. How many minutes a session?</Label>
      <Row gap={6}>
        {[20, 30, 45].map((m) => (
          <Chip key={m} testId={`new-min-${m}`} active={minutes === m} onClick={() => setMinutes(m)} style={{ flex: 1 }}>
            {m} min
          </Chip>
        ))}
      </Row>
      <Label>3. Do you go to the gym?</Label>
      <Segmented testId="new-gym" value={gym} onChange={setGym} options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
      {gym && (
        <>
          <div style={{ ...st.body(), fontSize: 12, margin: "8px 0 6px" }}>Which day? A day without a run is best.</div>
          <DayPicker testId="new-gym-day" multi={false} value={gymDay} onChange={setGymDay} />
          {gymClash && <div style={{ ...st.body(), fontSize: 12, marginTop: 6, color: COLORS.accent }}>{DAY_LONG[gymDay]} is also a run day. That is OK. Keep the gym session light.</div>}
        </>
      )}
      <Label>Medical note</Label>
      <Card>
        <div style={{ ...st.text(), fontSize: 13, marginBottom: 8 }}>{DISCLAIMER}</div>
        <TickBox testId="new-consent" on={consent} onChange={setConsent}>
          I read this. I train at my own risk.
        </TickBox>
      </Card>
      <Btn testId="new-make" disabled={!consent || busy} onClick={make}>
        Make my plan
      </Btn>
    </div>
  );
}

function BringHistory({ nav, level, appMode }) {
  const [summary, setSummary] = useState(null);
  return (
    <div data-testid="bring-history">
      <div style={{ ...st.title(18), marginBottom: 6 }}>Bring your history</div>
      <div style={{ ...st.body(), marginBottom: 12 }}>
        Optional. Import files from your watch app or a Strava or Garmin export. The plan then starts from your real training. Strava data is shown only to you and is never sent to an AI.
      </div>
      <HistoryImport onDone={(s) => { setSummary(s); nav.reload(); }} />
      <div style={{ height: 14 }} />
      <Btn testId="history-next" onClick={() => nav.go("plan:setup", { level, appMode, fromOnboarding: true })}>
        {summary && summary.added ? "Next: make my plan" : "Skip this step"}
      </Btn>
    </div>
  );
}

export function Onboarding({ nav }) {
  const params = nav.params || {};
  const [choice, setChoice] = useState(params.level ? { level: params.level, appMode: params.appMode } : null);

  async function chosen(c) {
    if (c.level === "gym-only") {
      const prev = (await getKey(KEYS.runProfile, null)) || {};
      await setKey(KEYS.runProfile, { ...prev, level: "gym-only", onboarded: true });
      await nav.updateSettings({ ...nav.settings, appMode: c.appMode, mode: "lift" });
      return;
    }
    setChoice(c);
  }

  return (
    <Screen title="Set up running" onBack={nav.back} testId="onboarding">
      {!choice && <WhoAreYou onChoose={chosen} />}
      {choice && choice.level === "new" && <NewRunner nav={nav} appMode={choice.appMode} />}
      {choice && (choice.level === "some" || choice.level === "racer") && <BringHistory nav={nav} level={choice.level} appMode={choice.appMode} />}
    </Screen>
  );
}
