import { useEffect, useRef, useState } from "react";
import { COLORS, hexToRgba } from "../theme.js";
import { flattenSteps } from "./steps.js";

/* ---------------------------------------------------------------
   RUN MODE UI PARTS

   App look: COLORS from theme.js at render time (never fixed
   colours), Oswald uppercase labels, JetBrains Mono numbers, 44 px
   touch targets. Style helpers are functions because COLORS changes
   in place when the theme changes.
--------------------------------------------------------------- */

export const OSWALD = "'Oswald', sans-serif";
export const MONO = "'JetBrains Mono', monospace";

export const S = {
  page: () => ({ paddingBottom: 48, overflowX: "hidden" }),
  card: (extra) => ({ margin: "0 20px 12px", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, boxSizing: "border-box", ...(extra || {}) }),
  title: () => ({ color: COLORS.text, fontFamily: OSWALD, fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }),
  label: () => ({ color: COLORS.textDim, fontSize: 10.5, fontFamily: OSWALD, letterSpacing: 1.5, textTransform: "uppercase" }),
  section: () => ({ padding: "10px 20px 8px", color: COLORS.textDim, fontSize: 10.5, fontFamily: OSWALD, letterSpacing: 1.5, textTransform: "uppercase" }),
  body: () => ({ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.5 }),
  text: () => ({ color: COLORS.text, fontSize: 13.5, lineHeight: 1.5 }),
  mono: (size = 13) => ({ fontFamily: MONO, fontSize: size, color: COLORS.text }),
  field: () => ({ width: "100%", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, color: COLORS.text, fontFamily: MONO, fontSize: 14, padding: "10px 10px", minHeight: 44, boxSizing: "border-box", minWidth: 0 }),
};

const btnBase = { width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, padding: "11px 12px", fontFamily: OSWALD, fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.6, boxSizing: "border-box" };

export function Btn({ kind = "secondary", disabled, onClick, children, style, testId, ariaLabel }) {
  const look =
    kind === "primary"
      ? { background: COLORS.accent, border: "none", color: COLORS.onAccent }
      : kind === "danger"
        ? { background: "transparent", border: `1px solid ${COLORS.bad}`, color: COLORS.bad }
        : kind === "ghost"
          ? { background: "transparent", border: "none", color: COLORS.accent }
          : { background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, color: COLORS.text };
  return (
    <button data-testid={testId} aria-label={ariaLabel} disabled={disabled} onClick={onClick} style={{ ...btnBase, ...look, opacity: disabled ? 0.5 : 1, ...(style || {}) }}>
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, testId, style }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      aria-pressed={!!active}
      style={{
        minHeight: 40,
        padding: "8px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? COLORS.accent : COLORS.line}`,
        background: active ? hexToRgba(COLORS.accent, 0.14) : COLORS.surfaceRaised,
        color: active ? COLORS.accent : COLORS.text,
        fontFamily: OSWALD,
        fontSize: 12.5,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...(style || {}),
      }}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, wrap = true }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: wrap ? "wrap" : "nowrap", overflowX: wrap ? "visible" : "auto" }}>{children}</div>;
}

/* Segmented control: options [{value, label}]. */
export function Segmented({ value, options, onChange, testId }) {
  return (
    <div data-testid={testId} role="tablist" style={{ display: "flex", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 38, borderRadius: 8, background: on ? COLORS.accent : "transparent", color: on ? COLORS.onAccent : COLORS.textDim, fontFamily: OSWALD, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", padding: "0 4px" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ label, desc, value, onToggle, testId }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: COLORS.text, fontFamily: OSWALD, fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
        {desc && <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <button
        data-testid={testId}
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        onClick={onToggle}
        style={{ width: 48, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <span style={{ width: 44, height: 26, borderRadius: 13, background: value ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${value ? COLORS.accent : COLORS.line}`, position: "relative", display: "block", boxSizing: "border-box" }}>
          <span style={{ width: 20, height: 20, borderRadius: 10, background: value ? COLORS.onAccent : COLORS.textDim, position: "absolute", top: 2, left: value ? 21 : 2, transition: "left 0.15s" }} />
        </span>
      </button>
    </div>
  );
}

export function Stat({ label, value, sub, big, testId, align = "left" }) {
  return (
    <div data-testid={testId} style={{ minWidth: 0, textAlign: align }}>
      <div style={S.label()}>{label}</div>
      <div style={{ fontFamily: MONO, color: COLORS.text, fontSize: big ? 30 : 18, lineHeight: 1.15, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {sub && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Note({ children, tone = "dim", testId }) {
  const border = tone === "warn" ? COLORS.bad : tone === "ok" ? COLORS.ok : COLORS.line;
  return (
    <div data-testid={testId} style={{ background: COLORS.surfaceRaised, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 12px", color: tone === "warn" ? COLORS.text : COLORS.textDim, fontSize: 12, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

/* Inline confirm (no browser dialog). */
export function Confirm({ text, yes, no = "Cancel", onYes, onNo, danger = true, testId }) {
  return (
    <div data-testid={testId} style={{ background: COLORS.surfaceRaised, border: `1px solid ${danger ? COLORS.bad : COLORS.accent}`, borderRadius: 12, padding: 12, marginTop: 10 }}>
      <div style={{ ...S.text(), marginBottom: 10 }}>{text}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn kind={danger ? "danger" : "primary"} onClick={onYes} testId={testId ? `${testId}-yes` : undefined}>
          {yes}
        </Btn>
        <Btn onClick={onNo} testId={testId ? `${testId}-no` : undefined}>
          {no}
        </Btn>
      </div>
    </div>
  );
}

/* Measures the width of a box for SVG charts drawn at real pixel size. */
export function useWidth(fallback = 350) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = () => {
      const v = Math.floor(el.getBoundingClientRect().width);
      if (v > 0) setW(v);
    };
    set();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* Colour and height of a ribbon block for an intensity class. */
export function ribbonLook(cls) {
  switch (cls) {
    case "walk":
      return { fill: COLORS.surfaceRaised, stroke: COLORS.line, h: 0.3 };
    case "easy":
      return { fill: hexToRgba(COLORS.accent, 0.35), stroke: null, h: 0.5 };
    case "steady":
      return { fill: hexToRgba(COLORS.accent, 0.65), stroke: null, h: 0.72 };
    case "race":
      return { fill: COLORS.accent, stroke: null, h: 1 };
    case "hard":
    default:
      return { fill: COLORS.accent, stroke: null, h: 0.92 };
  }
}

/* Lane ribbon: one block for each step. Width = time, colour and height
   = intensity. `segments` from steps.flattenSteps or recorder.buildSegments.
   marker: 0..1 for a moving marker (recording). */
export function Ribbon({ workout, segments, height = 54, marker = null, labels = true, testId = "ribbon", currentIndex = null }) {
  const [ref, width] = useWidth();
  const segs = segments || flattenSteps(workout);
  const total = segs.length ? segs[segs.length - 1].end : 0;
  if (!total) return null;
  const gap = segs.length > 40 ? 0.5 : 1.5;
  const x = (t) => (t / total) * width;
  // Labels: only blocks wide enough get a word.
  const labelBlocks = [];
  if (labels) {
    let lastEnd = -999;
    for (const s of segs) {
      const x0 = x(s.start);
      const w = x(s.end) - x0;
      if (w >= 34 && x0 >= lastEnd + 4) {
        labelBlocks.push({ x: x0, w, text: s.reps && s.role === "work" ? `${s.reps}×` : s.label });
        lastEnd = x0 + w;
      }
    }
  }
  return (
    <div ref={ref} data-testid={testId} style={{ width: "100%" }}>
      <svg width={width} height={height + (labels ? 16 : 0)} role="img" aria-label="Workout shape" style={{ display: "block" }}>
        <line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke={COLORS.line} strokeWidth={1} />
        {segs.map((s, i) => {
          const look = ribbonLook(s.cls);
          const x0 = x(s.start);
          const w = Math.max(1, x(s.end) - x0 - gap);
          const h = Math.max(6, (height - 4) * look.h);
          const dim = currentIndex !== null && i < currentIndex;
          return <rect key={i} x={x0} y={height - h} width={w} height={h} rx={2} fill={look.fill} stroke={look.stroke || "none"} strokeWidth={look.stroke ? 1 : 0} opacity={dim ? 0.45 : 1} />;
        })}
        {marker !== null && (
          <g data-testid="ribbon-marker">
            <line x1={Math.min(width - 1.5, Math.max(1.5, marker * width))} x2={Math.min(width - 1.5, Math.max(1.5, marker * width))} y1={0} y2={height} stroke={COLORS.text} strokeWidth={3} />
          </g>
        )}
        {labelBlocks.map((b, i) => (
          <text key={i} x={b.x + 2} y={height + 12} fill={COLORS.textDim} fontSize={10} fontFamily={OSWALD} style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
            {fitText(b.text, b.w)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function fitText(text, w) {
  const max = Math.max(2, Math.floor(w / 6.2));
  const s = String(text || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* Simple list row with a chevron, 44 px or more. */
export function Row({ onClick, children, right, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "10px 0", borderBottom: `1px solid ${COLORS.line}`, color: COLORS.text }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {right}
    </button>
  );
}

export function Loading() {
  return <div style={{ ...S.body(), padding: "20px" }}>Loading…</div>;
}

/* Small number input with a label. */
export function NumField({ label, value, onChange, step = "any", min, max, suffix, testId, inputMode = "decimal", placeholder }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <div style={{ ...S.label(), marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          data-testid={testId}
          type="number"
          inputMode={inputMode}
          step={step}
          min={min}
          max={max}
          value={value === null || value === undefined ? "" : value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
          style={S.field()}
        />
        {suffix && <span style={{ ...S.body(), whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </label>
  );
}

/* Time input "h:mm:ss" or "mm:ss" -> seconds (null when not valid). */
export function parseTime(text) {
  const parts = String(text || "")
    .trim()
    .split(":")
    .map((x) => x.trim());
  if (!parts.length || parts.some((p) => p === "" || !/^\d+(\.\d+)?$/.test(p))) return null;
  const n = parts.map(Number);
  if (n.length === 1) return n[0] * 60;
  if (n.length === 2) return n[0] * 60 + n[1];
  if (n.length === 3) return n[0] * 3600 + n[1] * 60 + n[2];
  return null;
}

/* Pace text "m:ss" -> seconds per unit (null when not valid). */
export function parsePace(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || "").trim());
  if (!m) return null;
  const s = Number(m[1]) * 60 + Number(m[2]);
  return s > 0 ? s : null;
}
