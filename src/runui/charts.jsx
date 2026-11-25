import { COLORS } from "../theme.js";
import { MONO, OSWALD, useWidth } from "./ui.jsx";

/* Small SVG charts drawn at real pixel size. Colours from COLORS at
   render time, so every theme and colour scheme works. */

export function LineChart({ series, height = 150, zero = false, xLabels = null, testId = "line-chart", yFmt = (v) => Math.round(v), area = false }) {
  const [ref, width] = useWidth();
  const all = series.flatMap((s) => s.data.filter((v) => Number.isFinite(v)));
  if (!all.length) return <div ref={ref} />;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (zero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (hi - lo < 1e-6) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  const n = Math.max(...series.map((s) => s.data.length));
  const left = 4;
  const right = 40;
  const top = 6;
  const bottom = xLabels ? 18 : 6;
  const w = Math.max(10, width - left - right);
  const h = height - top - bottom;
  const x = (i) => left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => top + h - ((v - lo) / (hi - lo)) * h;
  const path = (data) => {
    let d = "";
    data.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return d;
  };
  return (
    <div ref={ref} data-testid={testId} style={{ width: "100%" }}>
      <svg width={width} height={height} role="img" style={{ display: "block" }}>
        {[hi - pad, lo + pad].map((v, i) => (
          <g key={i}>
            <line x1={left} x2={left + w} y1={y(v)} y2={y(v)} stroke={COLORS.line} strokeDasharray="2 4" />
            <text x={width - 2} y={y(v) + 3} textAnchor="end" fill={COLORS.textDim} fontSize={9.5} fontFamily={MONO}>
              {yFmt(v)}
            </text>
          </g>
        ))}
        {zero && lo < 0 && hi > 0 && <line x1={left} x2={left + w} y1={y(0)} y2={y(0)} stroke={COLORS.textDim} strokeWidth={1} />}
        {series.map((s, k) =>
          area && k === 0 ? (
            <path key={`a${k}`} d={`${path(s.data)}L${x(s.data.length - 1)},${top + h}L${x(0)},${top + h}Z`} fill={s.color} opacity={0.15} />
          ) : null
        )}
        {series.map((s, k) => (
          <path key={k} d={path(s.data)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dash || undefined} strokeLinejoin="round" />
        ))}
        {xLabels &&
          xLabels.map((l, i) =>
            l ? (
              <text key={i} x={Math.min(left + w - 20, Math.max(left, x(i) - 12))} y={height - 4} fill={COLORS.textDim} fontSize={9.5} fontFamily={OSWALD}>
                {l}
              </text>
            ) : null
          )}
      </svg>
    </div>
  );
}

export function BarChart({ values, height = 120, labels = null, highlight = null, testId = "bar-chart", yFmt = (v) => Math.round(v) }) {
  const [ref, width] = useWidth();
  const max = Math.max(1, ...values) * 1.1;
  const right = 36;
  const bottom = labels ? 16 : 4;
  const w = Math.max(10, width - right);
  const h = height - bottom - 4;
  const cw = values.length ? w / values.length : w;
  return (
    <div ref={ref} data-testid={testId} style={{ width: "100%" }}>
      <svg width={width} height={height} role="img" style={{ display: "block" }}>
        <line x1={0} x2={w} y1={4} y2={4} stroke={COLORS.line} strokeDasharray="2 4" />
        <text x={width - 2} y={10} textAnchor="end" fill={COLORS.textDim} fontSize={9.5} fontFamily={MONO}>
          {yFmt(max / 1.1)}
        </text>
        {values.map((v, i) => {
          const bh = (v / max) * h;
          return <rect key={i} x={i * cw + cw * 0.15} y={4 + h - bh} width={Math.max(1, cw * 0.7)} height={bh} rx={1.5} fill={COLORS.accent} opacity={highlight === i ? 1 : 0.6} />;
        })}
        <line x1={0} x2={w} y1={4 + h + 0.5} y2={4 + h + 0.5} stroke={COLORS.line} />
        {labels &&
          labels.map((l, i) =>
            l ? (
              <text key={i} x={Math.min(w - 20, i * cw)} y={height - 3} fill={COLORS.textDim} fontSize={9.5} fontFamily={OSWALD}>
                {l}
              </text>
            ) : null
          )}
      </svg>
    </div>
  );
}

export function ChartLegend({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6 }}>
      {items.map((it) => (
        <span key={it.text} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontSize: 11 }}>
          <svg width={18} height={8}>
            <line x1={0} x2={18} y1={4} y2={4} stroke={it.color} strokeWidth={2.5} strokeDasharray={it.dash || undefined} />
          </svg>
          {it.text}
        </span>
      ))}
    </div>
  );
}
