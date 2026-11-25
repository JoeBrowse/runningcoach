import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS, hexToRgba } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { getRaces } from "../shared/store.js";
import { getCachedWeather, getWeatherSettings } from "../shared/weather.js";
import { currentPlan } from "../plan/planState.js";
import { getProfile, today, unitsOf } from "./runData.js";
import { warmupContext } from "./RunHome.jsx";
import { Chip, ChipRow, Loading, Note, S } from "./ui.jsx";

/* ---------------------------------------------------------------
   COACH (run:coach)

   On-device rules (engine.coachAnswer) with the real plan, dates,
   races, profile and units. Warm-up questions use engine.warmupFor.
   No AI service. No data leaves the phone.
--------------------------------------------------------------- */

const SUGGESTIONS = ["Why is today like this?", "How should I warm up?", "I feel ill", "Something hurts", "Can I move my long run?", "What should I eat?", "How do I recover after my race?", "Should I skip the gym before my race?"];

/* Action chip text -> where it goes. */
const ACTIONS = {
  "Log a race result": { go: "plan:races" },
  "Add a race": { go: "plan:races" },
  "Show my paces": { go: "run:zones" },
  "Update from a race": { go: "run:zones" },
  "I am ill": { go: "plan:life", params: { kind: "illness" } },
  "Report pain": { go: "plan:life", params: { kind: "injury" } },
  "Move a session": { go: "plan:week" },
  "Mark as missed": { go: "plan:life", params: { kind: "missed" } },
  "Open fuel planner": { go: "run:fuel" },
  "Open strength": { mode: "lift" },
  "Show the warm-up": { go: "run:record" },
};

function warmupAnswer(plan, profile, tempC, iso) {
  const day = plan ? engine.todayWorkout(plan, iso) : null;
  const target = day && engine.isRun(day) ? day : plan ? engine.allDays(plan).find((d) => d.iso > iso && engine.isRun(d)) : null;
  const w = engine.warmupFor(target || { type: "easy", steps: [] }, warmupContext(plan, profile, tempC));
  if (!w) return { text: "There is no run to warm up for.", actions: [] };
  const when = target ? (target.iso === iso ? `Today is "${target.title}".` : `Your next run is "${target.title}" on ${engine.fmtDate(target.iso)}.`) : "For an easy run:";
  if (w.kind === "easy") return { text: `${when} Start slowly: run the first 5 to 10 minutes slower than the target. The run itself is the warm-up. Leg swings and hip circles before the run are optional. ${w.notes.join(" ")}`.trim(), actions: [] };
  const parts = w.phases.filter((p) => p.min > 0).map((p) => `${p.title} ${p.min} min (${p.items.map((m) => m.name).join(", ")})`);
  return { text: `${when} Warm up for about ${w.minutes} minutes: ${parts.join("; ")}. ${w.notes.join(" ")} The recorder can guide you with voice cues.`.trim(), actions: target && target.iso === iso ? ["Show the warm-up"] : [] };
}

export function CoachScreen({ nav }) {
  const [ctx, setCtx] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [plan, profile, races, cfg, w] = await Promise.all([currentPlan(), getProfile(), getRaces(), getWeatherSettings(), getCachedWeather()]);
      if (!live) return;
      const weather = cfg.enabled && w && w.current && Number.isFinite(w.current.tempC) ? { tempC: w.current.tempC, humidity: w.current.humidity } : null;
      setCtx({ plan, profile, races, weather });
      setMsgs([{ from: "coach", text: plan ? `Hello. I know your plan (${plan.goalName}) and your dates. Ask me a question, or tap one below.` : "Hello. You have no plan yet. I can still answer general questions. Make a plan in Plan mode for answers from your dates.", actions: [] }]);
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ block: "end" });
  }, [msgs]);

  function ask(q) {
    const question = String(q || "").trim();
    if (!question || !ctx) return;
    const iso = today();
    let answer;
    try {
      if (/warm.?up|warming/i.test(question)) answer = warmupAnswer(ctx.plan, ctx.profile, ctx.weather ? ctx.weather.tempC : null, iso);
      else answer = engine.coachAnswer(question, { plan: ctx.plan, today: iso, units: unitsOf(ctx.profile), profile: ctx.profile, weather: ctx.weather || undefined, races: ctx.races });
    } catch (e) {
      answer = { text: "I cannot answer that from your data. Try another question.", actions: [] };
    }
    setMsgs((m) => [...m, { from: "me", text: question }, { from: "coach", text: answer.text, actions: answer.actions || [] }]);
    setText("");
  }

  function act(a) {
    const target = ACTIONS[a];
    if (!target) {
      ask(a);
      return;
    }
    if (target.mode) nav.setMode(target.mode);
    else nav.go(target.go, target.params);
  }

  if (!ctx) {
    return (
      <div data-testid="coach-screen" style={S.page()}>
        <TopBar title="Coach" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  return (
    <div data-testid="coach-screen" style={S.page()}>
      <TopBar title="Coach" onBack={nav.back} />
      <div style={{ padding: "0 20px 10px" }}>
        <Note testId="coach-note">On-device coach. No AI service. No data leaves the phone.</Note>
      </div>
      <div data-testid="coach-messages" style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} data-testid={m.from === "coach" ? "coach-answer" : "coach-question"} style={{ alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div
              style={{
                background: m.from === "me" ? hexToRgba(COLORS.accent, 0.16) : COLORS.surface,
                border: `1px solid ${m.from === "me" ? COLORS.accentDim : COLORS.line}`,
                borderRadius: 12,
                padding: "10px 12px",
                color: COLORS.text,
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              {m.text}
            </div>
            {m.actions && m.actions.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <ChipRow>
                  {m.actions.map((a) => (
                    <Chip key={a} onClick={() => act(a)} testId="coach-action">
                      {a}
                    </Chip>
                  ))}
                </ChipRow>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={S.section()}>Ask about</div>
      <div style={{ padding: "0 20px 12px" }}>
        <ChipRow>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} onClick={() => ask(s)} testId="coach-suggestion" style={{ whiteSpace: "normal", textAlign: "left" }}>
              {s}
            </Chip>
          ))}
        </ChipRow>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        style={{ display: "flex", gap: 8, padding: "0 20px" }}
      >
        <input data-testid="coach-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question" maxLength={300} style={{ ...S.field(), fontFamily: "inherit" }} />
        <button type="submit" aria-label="Ask" data-testid="coach-send" style={{ width: 48, height: 44, borderRadius: 10, background: COLORS.accent, color: COLORS.onAccent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
