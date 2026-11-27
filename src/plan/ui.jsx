import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { hexToRgba, COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import * as engine from "../run/engine.js";
import { KEYS, getKey, listActivities } from "../shared/store.js";
import { runWeeks } from "../runui/runData.js";
import { loadPlanState, showJargon, localToday } from "./planState.js";
import { dayLine } from "./planText.js";

export { dayLine };

/* ---------------------------------------------------------------
   PLAN MODE UI PIECES

   Small shared parts for the Plan screens. Styles are functions,
   because COLORS changes in place when the theme changes.
--------------------------------------------------------------- */

export const oswald = "'Oswald', sans-serif";
export const monoFont = "'JetBrains Mono', monospace";

export const st = {
  card: (accent) => ({ background: COLORS.surface, border: `1px solid ${accent ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 12 }),
  label: () => ({ color: COLORS.textDim, fontSize: 10.5, fontFamily: oswald, letterSpacing: 1.5, textTransform: "uppercase" }),
  title: (size = 16) => ({ color: COLORS.text, fontFamily: oswald, fontSize: size, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.2 }),
  body: () => ({ color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }),
  text: () => ({ color: COLORS.text, fontSize: 13.5, lineHeight: 1.5 }),
  mono: (size = 13) => ({ fontFamily: monoFont, fontSize: size }),
  field: () => ({ width: "100%", minHeight: 44, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, color: COLORS.text, fontFamily: monoFont, fontSize: 14, padding: "10px 12px", boxSizing: "border-box", minWidth: 0 }),
};

export function Screen({ title, onBack, children, testId }) {
  return (
    <div data-testid={testId} style={{ paddingBottom: 48 }}>
      <TopBar title={title} onBack={onBack} />
      <div style={{ padding: "0 20px" }}>{children}</div>
    </div>
  );
}

export function Card({ children, accent, style, testId, onClick }) {
  const s = { ...st.card(accent), ...(style || {}) };
  if (onClick) {
    return (
      <button data-testid={testId} onClick={onClick} style={{ ...s, display: "block", width: "100%", textAlign: "left" }}>
        {children}
      </button>
    );
  }
  return (
    <div data-testid={testId} style={s}>
      {children}
    </div>
  );
}

export function Label({ children, style }) {
  return <div style={{ ...st.label(), margin: "18px 0 8px", ...(style || {}) }}>{children}</div>;
}

export function Btn({ kind = "primary", onClick, children, disabled, testId, style, small }) {
  const base = {
    width: "100%",
    minHeight: small ? 44 : 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    padding: small ? "10px 12px" : "14px 12px",
    fontFamily: oswald,
    fontSize: small ? 13 : 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: disabled ? 0.55 : 1,
    boxSizing: "border-box",
  };
  const look =
    kind === "primary"
      ? { background: COLORS.accent, color: COLORS.onAccent, border: "none" }
      : kind === "danger"
        ? { background: "transparent", color: COLORS.bad, border: `1px solid ${COLORS.bad}` }
        : kind === "ghost"
          ? { background: "transparent", color: COLORS.accent, border: "none" }
          : { background: COLORS.surfaceRaised, color: COLORS.text, border: `1px solid ${COLORS.line}` };
  return (
    <button data-testid={testId} onClick={disabled ? undefined : onClick} disabled={disabled} style={{ ...base, ...look, ...(style || {}) }}>
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, testId, tone, style }) {
  const c = tone === "safe" ? COLORS.accent : tone === "bad" ? COLORS.bad : COLORS.accent;
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={!!active}
      style={{
        minHeight: 44,
        padding: "8px 13px",
        borderRadius: 999,
        background: active ? hexToRgba(c, 0.16) : COLORS.surface,
        border: `1px solid ${active || tone === "safe" ? c : COLORS.line}`,
        color: active ? COLORS.text : tone === "safe" ? c : COLORS.text,
        fontSize: 13,
        lineHeight: 1.2,
        textAlign: "center",
        boxSizing: "border-box",
        ...(style || {}),
      }}
    >
      {children}
    </button>
  );
}

export function Row({ children, gap = 8, wrap, style }) {
  return <div style={{ display: "flex", gap, flexWrap: wrap ? "wrap" : "nowrap", alignItems: "center", ...(style || {}) }}>{children}</div>;
}

export function Segmented({ options, value, onChange, testId }) {
  return (
    <div data-testid={testId} style={{ display: "flex", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            data-testid={testId ? `${testId}-${o.value}` : undefined}
            onClick={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, background: active ? COLORS.accent : "transparent", color: active ? COLORS.onAccent : COLORS.textDim, fontFamily: oswald, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.4 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Monday first, as the plan weeks are.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = engine.DAY_NAMES;
export const DAY_LONG = engine.DAY_NAMES_LONG;

export function DayPicker({ value, onChange, multi = true, testId, marks }) {
  const sel = new Set(multi ? value || [] : value == null ? [] : [value]);
  return (
    <div data-testid={testId} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
      {WEEK_ORDER.map((d) => {
        const on = sel.has(d);
        return (
          <button
            key={d}
            data-testid={testId ? `${testId}-${d}` : undefined}
            aria-pressed={on}
            onClick={() => {
              if (!multi) return onChange(d);
              const next = new Set(sel);
              if (on) next.delete(d);
              else next.add(d);
              onChange([...next].sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b)));
            }}
            style={{
              minHeight: 44,
              borderRadius: 10,
              background: on ? COLORS.accent : COLORS.surface,
              color: on ? COLORS.onAccent : COLORS.text,
              border: `1px solid ${on ? COLORS.accent : COLORS.line}`,
              fontFamily: oswald,
              fontSize: 12.5,
              textTransform: "uppercase",
              position: "relative",
              minWidth: 0,
            }}
          >
            {DAY_SHORT[d]}
            {marks && marks[d] && <span style={{ position: "absolute", top: 3, right: 4, fontSize: 9, color: on ? COLORS.onAccent : COLORS.textDim }}>{marks[d]}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      {label && <div style={{ ...st.label(), marginBottom: 6 }}>{label}</div>}
      {children}
      {hint && <div style={{ ...st.body(), fontSize: 11.5, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", testId, inputMode }) {
  return (
    <input
      data-testid={testId}
      type={type}
      inputMode={inputMode}
      value={value == null ? "" : value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={st.field()}
    />
  );
}

/* "48:30", "1:45:00" or "25" (minutes) -> seconds. */
export function parseTime(text) {
  if (text == null) return null;
  const s = String(text).trim();
  if (!s) return null;
  const parts = s.split(":").map((x) => Number(x));
  if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null;
  let sec;
  if (parts.length === 1) sec = parts[0] * 60;
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
  else if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else return null;
  return sec > 0 ? Math.round(sec) : null;
}

export function Toggle({ on, onChange, label, testId, detail }) {
  return (
    <button
      data-testid={testId}
      role="switch"
      aria-checked={!!on}
      onClick={() => onChange(!on)}
      style={{ display: "flex", width: "100%", alignItems: "center", gap: 12, minHeight: 48, textAlign: "left", padding: "6px 0" }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", color: COLORS.text, fontSize: 14 }}>{label}</span>
        {detail && <span style={{ display: "block", ...st.body(), fontSize: 12 }}>{detail}</span>}
      </span>
      <span style={{ width: 44, height: 26, borderRadius: 13, background: on ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${on ? COLORS.accent : COLORS.line}`, position: "relative", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: on ? COLORS.onAccent : COLORS.textDim, transition: "left .15s" }} />
      </span>
    </button>
  );
}

export function TickBox({ on, onChange, children, testId }) {
  return (
    <button data-testid={testId} role="checkbox" aria-checked={!!on} onClick={() => onChange(!on)} style={{ display: "flex", gap: 12, alignItems: "flex-start", textAlign: "left", width: "100%", minHeight: 44, padding: "6px 0" }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${on ? COLORS.accent : COLORS.line}`, background: on ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {on && <Check size={15} color={COLORS.onAccent} />}
      </span>
      <span style={{ ...st.text(), fontSize: 13 }}>{children}</span>
    </button>
  );
}

export function LinkRow({ children, onClick, testId, icon }) {
  return (
    <button data-testid={testId} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 48, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, marginBottom: 8, color: COLORS.text, fontSize: 14, textAlign: "left" }}>
      {icon}
      <span style={{ flex: 1 }}>{children}</span>
      <ChevronRight size={17} color={COLORS.textDim} />
    </button>
  );
}

export function Notice({ tone = "info", title, children, testId }) {
  const c = tone === "bad" ? COLORS.bad : tone === "ok" ? COLORS.ok : COLORS.accent;
  return (
    <div data-testid={testId} style={{ background: hexToRgba(c, 0.08), border: `1px solid ${c}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
      {title && <div style={{ color: c, fontFamily: oswald, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{title}</div>}
      <div style={{ ...st.text(), fontSize: 13 }}>{children}</div>
    </div>
  );
}

/* ---------- workouts ---------- */

const STEP_HEIGHT = { warmup: 0.35, cooldown: 0.35, walk: 0.25 };

function blockLevel(step, w) {
  if (step.walk) return 0.25;
  if (STEP_HEIGHT[step.kind]) return STEP_HEIGHT[step.kind];
  const p = step.pace;
  if (!p || !w) return 0.5;
  // Faster pace, higher block. Easy pace is about 0.45, rep pace is 1.
  return Math.max(0.3, Math.min(1, 0.45 + ((w.easy || p) - p) / Math.max(1, (w.easy || p) - (w.rep || p) || 1) * 0.55));
}

function stepSeconds(x) {
  if (!x) return 0;
  if (x.min) return x.min * 60;
  if (x.sec) return x.sec;
  if (x.km && x.pace) return x.km * x.pace;
  return 0;
}

/* The workout drawn as a row of blocks: width is time, height is effort. */
export function WorkoutShape({ workout, paces, height = 46, testId }) {
  if (!workout || !workout.steps || !workout.steps.length) return null;
  const blocks = [];
  for (const s of workout.steps) {
    if (s.kind === "repeat") {
      const times = Math.min(s.times, 24);
      for (let i = 0; i < times; i++) {
        blocks.push({ sec: stepSeconds(s.work) * (s.times / times), lvl: blockLevel(s.work, paces), hard: !s.work.walk });
        if (s.rest) blocks.push({ sec: stepSeconds(s.rest) * (s.times / times), lvl: blockLevel({ ...s.rest, walk: s.rest.walk || s.rest.label === "Walk" || s.rest.label === "Walk back" }, paces), hard: false });
      }
    } else blocks.push({ sec: stepSeconds(s), lvl: blockLevel(s, paces), hard: false });
  }
  const total = blocks.reduce((a, b) => a + b.sec, 0) || 1;
  const W = 300;
  let x = 0;
  return (
    <svg data-testid={testId} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} aria-label="Shape of the session">
      {blocks.map((b, i) => {
        const w = Math.max(1.5, (b.sec / total) * W);
        const h = Math.max(4, b.lvl * height);
        const r = <rect key={i} x={x + 0.5} y={height - h} width={Math.max(1, w - 1)} height={h} rx={2} fill={b.lvl >= 0.6 ? COLORS.accent : b.lvl <= 0.3 ? COLORS.line : hexToRgba(COLORS.accent, 0.45)} />;
        x += w;
        return r;
      })}
    </svg>
  );
}

function stepText(s, units, showPace) {
  const dist = s.km ? engine.fmtKm(s.km, units) : s.min ? `${s.min} min` : s.sec ? (s.sec % 60 ? `${s.sec} s` : `${s.sec / 60} min`) : "";
  const pace = showPace && s.pace && !s.walk ? ` at ${engine.fmtPace(s.pace, units)}` : "";
  return `${s.label || ""} ${dist}${pace}`.trim();
}

export function StepsList({ workout, units = "km", showPace }) {
  if (!workout || !workout.steps || !workout.steps.length) return null;
  return (
    <ol style={{ margin: 0, padding: "0 0 0 18px", ...st.text(), fontSize: 13 }}>
      {workout.steps.map((s, i) => (
        <li key={i} style={{ marginBottom: 3 }}>
          {s.kind === "repeat"
            ? `${s.times} x (${stepText(s.work, units, showPace)}${s.rest ? `, then ${stepText(s.rest, units, showPace)}` : ""})`
            : stepText(s, units, showPace)}
        </li>
      ))}
    </ol>
  );
}

/* The engine writes ISO dates ("2026-12-02") in some reasons. Show
   them as "Wed 2 Dec", the same as the rest of the screen. */
export function niceDates(text) {
  if (typeof text !== "string") return text;
  return text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (m) => {
    try {
      return engine.fmtDate(m);
    } catch (e) {
      return m;
    }
  });
}

export function ChangeList({ changes, testId }) {
  if (!changes || !changes.length) return <div style={st.body()}>No days changed.</div>;
  return (
    <div data-testid={testId}>
      {changes.map((c, i) => (
        <div key={i} style={{ padding: "10px 0", borderTop: i ? `1px solid ${COLORS.line}` : "none" }}>
          <div style={{ ...st.mono(12), color: COLORS.textDim, marginBottom: 2 }}>{c.date || c.iso ? engine.fmtDate(c.date || c.iso) : ""}</div>
          {(c.before || c.after) && (
            <div style={{ ...st.text(), fontSize: 13 }}>
              {c.before ? <span style={{ color: COLORS.textDim, textDecoration: "line-through" }}>{c.before}</span> : null}
              {c.before && c.after ? " -> " : ""}
              {c.after ? <span>{c.after}</span> : null}
            </div>
          )}
          {c.reason && <div style={{ ...st.body(), fontSize: 12.5 }}>{niceDates(c.reason)}</div>}
        </div>
      ))}
    </div>
  );
}

export function SafetyList({ checks, testId }) {
  if (!checks || !checks.length) return null;
  return (
    <div data-testid={testId}>
      {checks.map((c) => (
        <div key={c.id} data-testid={`safety-${c.id}`} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: `1px solid ${COLORS.line}` }}>
          <span style={{ ...st.mono(11), color: c.ok ? COLORS.ok : COLORS.bad, minWidth: 34, fontWeight: 600 }}>{c.ok ? "PASS" : "FAIL"}</span>
          <span style={{ flex: 1 }}>
            <span style={{ ...st.text(), fontSize: 13, display: "block" }}>{c.rule}</span>
            <span style={{ ...st.body(), fontSize: 11.5 }}>{c.ok ? c.detail : niceDates((c.failures || []).slice(0, 2).join(" "))}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- data hook ---------- */

/* Loads the plan state, profile, master plan and races. `tick` and
   `refresh` let a screen load again after it saves. */
export function usePlanData(nav) {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let off = false;
    (async () => {
      const [state, profile, master, races, acts] = await Promise.all([loadPlanState(), getKey(KEYS.runProfile, null), getKey(KEYS.masterPlan, null), getKey(KEYS.races, []), listActivities().catch(() => [])]);
      if (off) return;
      const today = localToday();
      const units = (profile && profile.units) || "km";
      const jargon = showJargon(nav.settings, state.plan, today, runWeeks(acts, today));
      // Pace targets follow "Coach me by" (runData.paceOn); phase names follow jargon.
      const pace = profile && profile.coachBy === "pace" ? true : profile && profile.coachBy === "feel" ? !!(nav.settings && nav.settings.appMode === "advanced") : jargon;
      setData({ state, plan: state.plan, profile, master, races: races || [], today, units, jargon, pace });
    })();
    return () => {
      off = true;
    };
  }, [nav.reloadKey, tick]);
  return [data, () => setTick((n) => n + 1)];
}

export function Loading() {
  return <div style={{ color: COLORS.textDim, textAlign: "center", padding: 40, fontFamily: oswald, textTransform: "uppercase", fontSize: 13, letterSpacing: 1 }}>Loading…</div>;
}

/* "Warm-up: N min" line that opens to the phases and moves. `warmup` is
   the result of engine.warmupFor() or engine.liftWarmup(). */
export function WarmupBlock({ warmup, testId, label = "Warm-up" }) {
  const [open, setOpen] = useState(false);
  if (!warmup || !warmup.phases || !warmup.phases.length) return null;
  return (
    <div data-testid={testId} style={{ marginTop: 10, borderTop: `1px solid ${COLORS.line}`, paddingTop: 8 }}>
      <button data-testid={testId ? `${testId}-toggle` : undefined} aria-expanded={open} onClick={() => setOpen(!open)} style={{ display: "flex", width: "100%", alignItems: "center", minHeight: 44, gap: 8, textAlign: "left" }}>
        <span style={{ ...st.label(), color: COLORS.accent }}>{label}</span>
        <span style={{ ...st.mono(12.5), color: COLORS.text, flex: 1 }}>{warmup.minutes ? `${warmup.minutes} min` : warmup.phases.map((p) => p.title).join(", ")}</span>
        <ChevronRight size={16} color={COLORS.textDim} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div>
          {warmup.phases.map((p) => (
            <div key={p.id} style={{ marginBottom: 8 }}>
              <div style={{ ...st.title(13), marginBottom: 3 }}>
                {p.title}
                {p.min ? <span style={{ ...st.mono(11.5), color: COLORS.textDim, textTransform: "none" }}> · {p.min} min</span> : null}
              </div>
              {p.items.map((m) => (
                <div key={m.id} style={{ padding: "3px 0 3px 10px", borderLeft: `2px solid ${COLORS.line}`, marginBottom: 3 }}>
                  <div style={{ ...st.text(), fontSize: 13 }}>
                    {m.name} <span style={{ ...st.mono(11.5), color: COLORS.textDim }}>{m.dose}</span>
                  </div>
                  <div style={{ ...st.body(), fontSize: 12 }}>{m.how}</div>
                </div>
              ))}
              {p.note && <div style={{ ...st.body(), fontSize: 12 }}>{p.note}</div>}
            </div>
          ))}
          {(warmup.notes || []).map((n, i) => (
            <div key={i} style={{ ...st.body(), fontSize: 12, marginTop: 4 }}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}
