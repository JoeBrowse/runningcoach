import { useState, useEffect, useRef } from "react";
import { COLORS } from "../theme.js";

const CHART_PAD = { top: 8, right: 12, bottom: 20, left: 38 };

/* An axis label that fits in the gutter.

   A tenth of a kilo matters on a 12.5kg lateral raise and is noise on a
   12,368kg training week — and at five figures the decimal does not fit
   in the space anyway, so it was being clipped. Thousands are abbreviated
   rather than truncated. */
function axisTick(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 10000) return `${Math.round(v / 1000)}k`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (abs >= 100) return String(Math.round(v));
  return String(Math.round(v * 10) / 10);
}

// Least-squares fit, returned as a slope and intercept over point indices.
function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

/* A spike on a lift chart is usually not a sudden jump in strength. It is the
   same movement loaded a different way — an incline press taken on a barbell
   reads twenty kilos above the same effort on dumbbells — or a number typed
   wrong. Neither describes a gradient, so both are marked and left out of the
   fit while staying on the line: the session happened and the record is right,
   it just should not be what the trend is drawn through.

   Returns a reason per point, or null where the point is unremarkable. */
function senseCheck(points, values) {
  const none = new Array(values.length).fill(null);
  if (values.length < 5) return none;
  const flags = [...none];

  // How it was loaded explains most of it, so ask that first.
  const methods = points.map((p) => p.method || "");
  const counts = {};
  methods.forEach((m) => { if (m) counts[m] = (counts[m] || 0) + 1; });
  const named = Object.keys(counts);
  if (named.length > 1) {
    const dominant = named.sort((a, b) => counts[b] - counts[a])[0];
    methods.forEach((m, i) => { if (m && m !== dominant) flags[i] = m; });
    // If a third of the chart is "the odd one out", there is no odd one out —
    // the lift is genuinely trained several ways and no single loading is the
    // series. Drop that reading, but keep checking the numbers themselves.
    if (flags.filter(Boolean).length > values.length / 3) flags.fill(null);
  }

  // Whatever the loading does not account for, judge on spread — median
  // absolute deviation rather than standard deviation, because one wild
  // value widens a standard deviation enough to hide itself inside it.
  const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const m = med(values);
  const mad = med(values.map((v) => Math.abs(v - m)));
  if (mad > 0) {
    values.forEach((v, i) => {
      if (!flags[i] && Math.abs(v - m) / (1.4826 * mad) > 3.5) flags[i] = "unusual";
    });
  }

  return flags;
}

export function SimpleLineChart({ data, dataKey = "weight", height = 200, color, trend = false, flagOutliers = false, goal = null, labelFor = null }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);
  useEffect(() => {
    const measure = () => {
      if (ref.current && ref.current.clientWidth) setWidth(ref.current.clientWidth);
    };
    measure();
    let ro;
    const canWinListen = typeof window !== "undefined" && typeof window.addEventListener === "function";
    if (typeof ResizeObserver !== "undefined" && ref.current) {
      ro = new ResizeObserver(measure);
      ro.observe(ref.current);
    } else if (canWinListen) {
      window.addEventListener("resize", measure);
    }
    return () => {
      if (ro) ro.disconnect();
      else if (canWinListen) window.removeEventListener("resize", measure);
    };
  }, []);

  const stroke = color || COLORS.accent;
  const w = width || 320;
  const plotted = (data || []).filter((d) => Number.isFinite(parseFloat(d[dataKey])));
  if (plotted.length === 0) return <div ref={ref} style={{ width: "100%", height }} />;

  const goalVal = Number.isFinite(parseFloat(goal)) ? parseFloat(goal) : null;
  // A session logged with a different loading, or a weight typed wrong, is not
  // a point on this curve. It leaves the chart entirely — line, scale and all —
  // rather than being drawn some quieter way, because one barbell session among
  // thirty on dumbbells stretches the axis to twice the range actually being
  // trained in and flattens the real series into the bottom of the chart.
  // Nothing is removed from stored history; the count is reported beside the
  // trend so a chart never silently drops work.
  const allValues = plotted.map((d) => parseFloat(d[dataKey]));
  const flags = flagOutliers ? senseCheck(plotted, allValues) : new Array(allValues.length).fill(null);
  const keep = flags.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  // Hiding so much that nothing is left would be worse than the spikes.
  const useAll = keep.length < 2;
  const points = useAll ? plotted : keep.map((i) => plotted[i]);
  const values = useAll ? allValues : keep.map((i) => allValues[i]);
  const hidden = plotted.length - points.length;

  const fit = trend ? linearFit(values.map((_, i) => i), values) : null;
  // Matches the old domain of [dataMin - 2, dataMax + 2], but a flat series
  // would collapse to a zero-height band, so it keeps a minimum spread. A goal
  // is part of the domain too, or the line marking it sits off the chart.
  const domain = goalVal === null ? values : [...values, goalVal];
  const min = Math.min(...domain) - 2;
  const rawMax = Math.max(...domain) + 2;
  const max = rawMax > min ? rawMax : min + 4;
  const plotW = Math.max(1, w - CHART_PAD.left - CHART_PAD.right);
  const plotH = Math.max(1, height - CHART_PAD.top - CHART_PAD.bottom);
  const x = (i) => CHART_PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v) => CHART_PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  // A fitted line extended past the plotted points can leave the band.
  const clampY = (v) => Math.max(CHART_PAD.top, Math.min(height - CHART_PAD.bottom, y(v)));

  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  // Thin the date labels so they never collide on a narrow phone. A caller
  // plotting weeks or months can hand over shorter labels, which fit more
  // of them in — a full ISO date is ten characters and only three or four
  // will ever fit across a phone.
  const xLabel = (d) => (labelFor ? labelFor(d) : d.date);
  const labelWidth = labelFor ? 26 : 46;
  const labelStride = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotW / labelWidth))));
  const path = points.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${clampY(values[i]).toFixed(1)}`).join(" ");

  function pick(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches && e.touches[0] ? e.touches[0].clientX : 0;
    const px = clientX - box.left;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setActive(best);
  }

  return (
    <div ref={ref} style={{ width: "100%", height, position: "relative" }}>
      <svg
        width={w}
        height={height}
        onMouseMove={pick}
        onMouseLeave={() => setActive(null)}
        onTouchStart={pick}
        onTouchMove={pick}
        onTouchEnd={() => setActive(null)}
        style={{ touchAction: "pan-y" }}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={CHART_PAD.left} x2={w - CHART_PAD.right} y1={y(t)} y2={y(t)} stroke={COLORS.line} strokeDasharray="3 3" />
            <text x={CHART_PAD.left - 6} y={y(t) + 3.5} textAnchor="end" fill={COLORS.textDim} fontSize={10}>
              {axisTick(t)}
            </text>
          </g>
        ))}
        <line x1={CHART_PAD.left} x2={w - CHART_PAD.right} y1={height - CHART_PAD.bottom} y2={height - CHART_PAD.bottom} stroke={COLORS.line} />
        {points.map((d, i) =>
          // The last label is always drawn, so drop any strided label that
          // would sit on top of it.
          (i % labelStride === 0 && x(points.length - 1) - x(i) > labelWidth + 2) || i === points.length - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={height - CHART_PAD.bottom + 13}
              // The end labels sit against the plot edges, so anchoring them
              // centrally would hang half of each one off the chart.
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fill={COLORS.textDim}
              fontSize={10}
            >
              {xLabel(d)}
            </text>
          ) : null
        )}
        {goalVal !== null && (
          <g>
            <line
              x1={CHART_PAD.left}
              x2={w - CHART_PAD.right}
              y1={y(goalVal)}
              y2={y(goalVal)}
              stroke={COLORS.trend}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={w - CHART_PAD.right} y={y(goalVal) - 5} textAnchor="end" fill={COLORS.trend} fontSize={10}>
              goal {goalVal}
            </text>
          </g>
        )}
        <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {fit && (
          <line
            x1={x(0)}
            x2={x(points.length - 1)}
            y1={clampY(fit.intercept)}
            y2={clampY(fit.intercept + fit.slope * (points.length - 1))}
            stroke={COLORS.trend}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
        {points.map((d, i) => (
          <circle key={i} cx={x(i)} cy={clampY(values[i])} r={active === i ? 5 : 3} fill={stroke} />
        ))}
        {fit && (
          <text x={w - CHART_PAD.right} y={CHART_PAD.top + 9} textAnchor="end" fill={COLORS.trend} fontSize={10.5}>
            {`trend ${fit.slope >= 0 ? "+" : ""}${(fit.slope * (points.length - 1)).toFixed(1)}${hidden ? ` · ${hidden} hidden` : ""}`}
          </text>
        )}
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={CHART_PAD.top} y2={height - CHART_PAD.bottom} stroke={COLORS.textDim} strokeDasharray="2 3" />
        )}
      </svg>
      {active !== null && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(x(active) - 42, 0), Math.max(0, w - 88)),
            top: 2,
            pointerEvents: "none",
            background: COLORS.surfaceRaised,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 12,
          }}
        >
          <div style={{ color: COLORS.textDim, fontSize: 10.5 }}>{points[active].date}</div>
          <div style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{values[active]}</div>
        </div>
      )}
    </div>
  );
}
