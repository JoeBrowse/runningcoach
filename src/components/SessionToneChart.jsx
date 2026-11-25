import { PieChart } from "lucide-react";
import { COLORS, STAGE_COLORS } from "../theme.js";

// A donut, not a bar list — three raw counts rarely add up to anything
// meaningful on their own, but the shape of a session (mostly green with one
// red wedge) reads in a glance the way a column of numbers never does. Each
// wedge is the same red/amber/green a set's border showed live, compared to
// the same slot last time this exercise was done.
export function SessionToneChart({ tally }) {
  const rows = [
    { key: "up", label: "More reps", color: STAGE_COLORS.green, value: tally.up || 0 },
    { key: "amber", label: "Held", color: STAGE_COLORS.amber, value: tally.amber || 0 },
    { key: "down", label: "Fewer reps", color: STAGE_COLORS.red, value: tally.down || 0 },
  ];
  const total = rows.reduce((n, r) => n + r.value, 0);
  if (total === 0) return null;

  const size = 128;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
        <PieChart size={14} /> Session Breakdown
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.surfaceRaised} strokeWidth={stroke} />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {rows
              .filter((row) => row.value > 0)
              .map((row) => {
                const dash = (row.value / total) * c;
                const el = (
                  <circle
                    key={row.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={row.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-cumulative}
                  />
                );
                cumulative += dash;
                return el;
              })}
          </g>
          <text x={size / 2} y={size / 2 - 3} textAnchor="middle" fill={COLORS.text} fontSize={20} fontFamily="'Oswald', sans-serif">
            {total}
          </text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill={COLORS.textDim} fontSize={9.5} fontFamily="'Oswald', sans-serif" letterSpacing={1}>
            SETS
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {rows.map((row) => (
            <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
              <span style={{ color: COLORS.text, flex: 1 }}>{row.label}</span>
              <span style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
