import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { KEYS, getKey } from "../shared/store.js";
import { Btn, Segmented, st, oswald } from "./ui.jsx";
import { YourWeek, saveYourWeek } from "./YourWeek.jsx";
import { WEB_LIMITS_SHORT, isWebApp } from "../lib/webApp.js";

/* ---------------------------------------------------------------
   FIRST OPEN (spec v1.1 section 1)

   When the app opens for the first time:
     1. "What do you want to use Skid Marks for?" Running, Lifting, Both.
     2. Tour cards (Next and Skip): Running, Lifting, or both and one
        card about the shared week.
     3. "Your week": the questions and the proposed week (YourWeek.jsx).
   Save writes the master week and run-profile.use. App.jsx then opens
   Plan (Both), Run (Running) or Lift (Lifting).

   Users who upgrade with old gym data never see this flow (App.jsx skips it).

   <FirstOpen onDone={({ use, appMode }) => ...} />
--------------------------------------------------------------- */

export const USE_CHOICES = [
  { id: "run", label: "Running", detail: "A running plan that fits your week. Record runs with voice cues." },
  { id: "lift", label: "Lifting", detail: "Log your sets, follow a programme and see your progress." },
  { id: "both", label: "Both", detail: "Runs and gym days in one week. Each side respects the other." },
];

export const MODE_FOR_USE = { run: "run", lift: "lift", both: "plan" };

const RUN_CARDS = [
  { icon: "plan", title: "A plan that fits your week", body: "The plan uses your days and your level. When life changes, the plan changes too: a missed run, an illness or a holiday. Each change shows its reason." },
  { icon: "record", title: "Record your runs", body: "Record a run with GPS. Voice cues tell you when to run, walk or change pace. You can also import runs from your watch." },
  { icon: "progress", title: "Progress and races", body: "See your weekly distance and your fitness over time. Add a race. The plan builds up to it and then makes the last weeks easier." },
];

const LIFT_CARDS = [
  { icon: "log", title: "Log your sets", body: "Record the weight and the reps of each set. The app shows your last top set and your personal bests." },
  { icon: "programme", title: "Programmes", body: "Enter your own plan, use a ready programme, or let the app make a plan for you. The app shows the next day of your programme." },
  { icon: "map", title: "Muscle readiness map", body: "A body map shows which muscles are ready to train again. Runs count too: your legs need rest after a long run." },
];

const BOTH_CARD = { icon: "week", title: "One shared week", body: "Runs and gym days are in one week. Each side respects the other. Heavy leg days stay away from hard runs and from the long run." };

// Browser only: one honest card about the limits of the web version.
export const WEB_CARD = { icon: "web", title: "The web version", body: WEB_LIMITS_SHORT };

export function tourCardsFor(use, web = isWebApp()) {
  const cards = use === "run" ? RUN_CARDS : use === "lift" ? LIFT_CARDS : [...RUN_CARDS, ...LIFT_CARDS, BOTH_CARD];
  return web ? [...cards, WEB_CARD] : cards;
}

/* Simple drawn icons, one for each tour card. Lines only, in the accent colour. */
export function TourIcon({ name, size = 84 }) {
  const c = COLORS.accent;
  const p = { fill: "none", stroke: c, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" };
  const soft = hexToRgba(c, 0.18);
  let body = null;
  if (name === "plan") {
    body = (
      <>
        <rect x="10" y="14" width="44" height="40" rx="6" {...p} />
        <path d="M10 25h44M22 9v9M42 9v9" {...p} />
        <path d="M22 39l7 7 13-14" {...p} />
      </>
    );
  } else if (name === "record") {
    body = (
      <>
        <path d="M12 26h8l11-9v30l-11-9h-8z" {...p} fill={soft} />
        <path d="M39 24c4 5 4 11 0 16M45 18c8 8 8 20 0 28" {...p} />
      </>
    );
  } else if (name === "progress") {
    body = (
      <>
        <path d="M8 54h48" {...p} />
        <rect x="13" y="38" width="8" height="16" rx="2" {...p} fill={soft} />
        <rect x="28" y="28" width="8" height="26" rx="2" {...p} fill={soft} />
        <rect x="43" y="16" width="8" height="38" rx="2" {...p} fill={soft} />
        <path d="M14 26l14-8 15-9" {...p} />
      </>
    );
  } else if (name === "log") {
    body = (
      <>
        <rect x="7" y="24" width="6" height="16" rx="2" {...p} />
        <rect x="14" y="19" width="7" height="26" rx="2" {...p} fill={soft} />
        <path d="M21 32h22" {...p} />
        <rect x="43" y="19" width="7" height="26" rx="2" {...p} fill={soft} />
        <rect x="51" y="24" width="6" height="16" rx="2" {...p} />
      </>
    );
  } else if (name === "programme") {
    body = (
      <>
        <rect x="14" y="11" width="36" height="45" rx="5" {...p} />
        <rect x="24" y="7" width="16" height="8" rx="3" {...p} fill={soft} />
        <path d="M22 27h4M30 27h12M22 37h4M30 37h12M22 47h4M30 47h8" {...p} />
      </>
    );
  } else if (name === "map") {
    body = (
      <>
        <circle cx="32" cy="11" r="6" {...p} />
        <path d="M22 21h20l-3 19H25z" {...p} />
        <path d="M22 23l-8 14M42 23l8 14" {...p} />
        <path d="M27 40l-2 18M37 40l2 18" {...p} stroke={c} strokeWidth="5" />
      </>
    );
  } else if (name === "web") {
    // a phone with a browser address bar
    body = (
      <>
        <rect x="16" y="4" width="32" height="56" rx="6" {...p} />
        <path d="M16 16h32M28 54h8" {...p} />
        <circle cx="32" cy="34" r="9" {...p} fill={soft} />
        <path d="M23 34h18M32 25c-4 5-4 13 0 18M32 25c4 5 4 13 0 18" {...p} strokeWidth="2" />
      </>
    );
  } else {
    // week: seven days, runs as rings, gym as bars
    const marks = ["run", "gym", "rest", "run", "gym", "rest", "long"];
    body = (
      <>
        <rect x="4" y="16" width="56" height="32" rx="6" {...p} />
        {marks.map((m, i) => {
          const x = 10 + i * 7.4;
          if (m === "run") return <circle key={i} cx={x} cy="32" r="2.6" {...p} strokeWidth="2.2" />;
          if (m === "long") return <circle key={i} cx={x} cy="32" r="3" fill={c} stroke={c} />;
          if (m === "gym") return <path key={i} d={`M${x - 3} 32h6`} {...p} strokeWidth="3.4" />;
          return <path key={i} d={`M${x - 1} 32h2`} {...p} stroke={COLORS.textDim} strokeWidth="2" />;
        })}
      </>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: "block" }}>
      {body}
    </svg>
  );
}

const shell = {
  position: "fixed",
  inset: 0,
  zIndex: 220,
  overflowY: "auto",
  overflowX: "hidden",
  display: "flex",
  flexDirection: "column",
};

function Brand() {
  return <div style={{ color: COLORS.accent, fontFamily: oswald, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", marginBottom: 8 }}>Skid Marks</div>;
}

function BigTitle({ children }) {
  return <div style={{ color: COLORS.text, fontFamily: oswald, fontSize: 30, textTransform: "uppercase", lineHeight: 1.1, letterSpacing: 0.5, marginBottom: 10 }}>{children}</div>;
}

function UseStep({ use, setUse, appMode, setAppMode, onNext }) {
  return (
    <>
      <div style={{ flex: 1, padding: "44px 20px 16px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <Brand />
        <BigTitle>What do you want to use Skid Marks for?</BigTitle>
        <div style={{ ...st.body(), fontSize: 14, marginBottom: 18 }}>All features are free, with no account and no ads. Your data stays on your phone.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          {USE_CHOICES.map((c) => {
            const active = use === c.id;
            return (
              <button
                key={c.id}
                data-testid={`use-${c.id}`}
                aria-pressed={active}
                onClick={() => setUse(c.id)}
                style={{ textAlign: "left", background: active ? hexToRgba(COLORS.accent, 0.1) : COLORS.surface, border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`, borderRadius: 16, padding: "16px 16px", minHeight: 78 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {active && <Check size={13} color={COLORS.onAccent} />}
                  </span>
                  <span style={{ color: COLORS.text, fontFamily: oswald, fontSize: 22, textTransform: "uppercase", letterSpacing: 0.6 }}>{c.label}</span>
                </div>
                <div style={{ ...st.body(), fontSize: 13, paddingLeft: 30 }}>{c.detail}</div>
              </button>
            );
          })}
        </div>
        <div data-testid="use-note" style={{ ...st.body(), fontSize: 13, marginBottom: 18 }}>You can change this later in Settings.</div>
        <div style={{ ...st.label(), marginBottom: 8 }}>How much do you want on screen?</div>
        <Segmented testId="first-appmode" value={appMode} onChange={setAppMode} options={[{ value: "simple", label: "Simple" }, { value: "advanced", label: "All features" }]} />
        <div style={{ ...st.body(), fontSize: 12, marginTop: 6 }}>{appMode === "simple" ? "Simple: effort words and the basic features. You can change this in Settings." : "All features: paces, zones, scores and every lift option."}</div>
      </div>
      <Footer>
        <Btn testId="use-continue" disabled={!use} onClick={onNext}>
          {use ? "Continue" : "Select one to continue"}
        </Btn>
      </Footer>
    </>
  );
}

function Footer({ children }) {
  return (
    <div style={{ position: "sticky", bottom: 0, padding: "14px 20px calc(18px + env(safe-area-inset-bottom, 0px))", background: `linear-gradient(to top, ${COLORS.bg} 70%, transparent)` }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function TourStep({ cards, index, onNext, onSkip, onBack }) {
  const card = cards[index];
  const last = index === cards.length - 1;
  return (
    <>
      <div data-testid="tour-card" style={{ flex: 1, padding: "28px 20px 16px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, minHeight: 44 }}>
          <button aria-label="Back" data-testid="tour-back" onClick={onBack} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "flex-start", color: COLORS.textDim }}>
            <ChevronLeft size={22} />
          </button>
          <div data-testid="tour-dots" style={{ display: "flex", gap: 6 }}>
            {cards.map((_, i) => (
              <span key={i} style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, background: i === index ? COLORS.accent : COLORS.line, transition: "width .15s" }} />
            ))}
          </div>
          <button data-testid="tour-skip" onClick={onSkip} style={{ minHeight: 44, padding: "0 4px", color: COLORS.textDim, fontFamily: oswald, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Skip
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, background: hexToRgba(COLORS.accent, 0.08), border: `1px solid ${hexToRgba(COLORS.accent, 0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26 }}>
            <TourIcon name={card.icon} />
          </div>
          <div style={{ ...st.label(), color: COLORS.accent, marginBottom: 8 }}>
            {index + 1} of {cards.length}
          </div>
          <div data-testid="tour-title" style={{ color: COLORS.text, fontFamily: oswald, fontSize: 32, textTransform: "uppercase", lineHeight: 1.08, letterSpacing: 0.5, marginBottom: 14 }}>
            {card.title}
          </div>
          <div style={{ color: COLORS.text, fontSize: 17, lineHeight: 1.55 }}>{card.body}</div>
        </div>
      </div>
      <Footer>
        <Btn testId="tour-next" onClick={onNext}>
          {last ? "Plan my week" : "Next"}
        </Btn>
      </Footer>
    </>
  );
}

export function FirstOpen({ onDone, initialAppMode = "simple" }) {
  const [step, setStep] = useState("use");
  const [use, setUse] = useState(null);
  const [appMode, setAppMode] = useState(initialAppMode === "advanced" ? "advanced" : "simple");
  const [card, setCard] = useState(0);
  const [ctx, setCtx] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getKey(KEYS.masterPlan, null), getKey(KEYS.runProfile, null)]).then(([master, profile]) => setCtx({ master, profile }));
  }, []);

  useEffect(() => {
    const el = document.querySelector("[data-testid='first-open']");
    if (el) el.scrollTop = 0;
  }, [step, card]);

  const cards = tourCardsFor(use);

  async function save(answers, week) {
    setBusy(true);
    setError("");
    try {
      await saveYourWeek(answers, week);
      await onDone({ use: answers.use, appMode });
    } catch (e) {
      setError("The app cannot save your week. Try again.");
      setBusy(false);
    }
  }

  return (
    <div data-testid="first-open" style={{ ...shell, background: COLORS.bg }}>
      {step === "use" && (
        <UseStep
          use={use}
          setUse={setUse}
          appMode={appMode}
          setAppMode={setAppMode}
          onNext={() => {
            setCard(0);
            setStep("tour");
          }}
        />
      )}
      {step === "tour" && (
        <TourStep
          cards={cards}
          index={Math.min(card, cards.length - 1)}
          onBack={() => (card > 0 ? setCard(card - 1) : setStep("use"))}
          onSkip={() => setStep("week")}
          onNext={() => (card < cards.length - 1 ? setCard(card + 1) : setStep("week"))}
        />
      )}
      {step === "week" && (
        <div data-testid="first-week" style={{ flex: 1, padding: "20px 20px 40px", maxWidth: 460, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          <button aria-label="Back" data-testid="week-back" onClick={() => setStep("tour")} style={{ width: 44, height: 44, display: "flex", alignItems: "center", color: COLORS.textDim, marginBottom: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <Brand />
          <BigTitle>Your week</BigTitle>
          <div style={{ ...st.body(), fontSize: 14, marginBottom: 16 }}>Answer the questions. The app then proposes a week. You can change each day.</div>
          {error && <div style={{ ...st.text(), color: COLORS.bad, marginBottom: 10 }}>{error}</div>}
          {ctx ? <YourWeek key={use} use={use} prevMaster={ctx.master} profile={ctx.profile} onSave={save} busy={busy} /> : null}
        </div>
      )}
    </div>
  );
}
