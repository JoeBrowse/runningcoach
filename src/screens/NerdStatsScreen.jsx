import { useState, useEffect } from "react";
import { Dumbbell, Clock, Trophy, History as HistoryIcon, Bookmark, TrendingUp, Sparkles, User, PieChart, Footprints } from "lucide-react";
import { formatDuration } from "../lib/activities.js";
import { MONTH_ABBREV } from "../lib/dates.js";
import { REP_BANDS, WEEKDAY_LABELS, MOVER_MIN_SESSIONS, computeNerdStats } from "../lib/stats.js";
import { safeGet } from "../lib/storage.js";
import { hexToRgba, COLORS, STAGE_COLORS } from "../theme.js";
import { BodySide } from "../components/BodyMap.jsx";
import { SimpleLineChart } from "../components/SimpleLineChart.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   STATS FOR NERDS — the screen

   Twelve panels off the foot of Consistency. Everything here is drawn
   rather than listed wherever a shape says it faster than a number
   would: which muscles get the work is a body, when you train is a
   clock, and how your reps fall is a histogram.

   Every panel hides itself when it has nothing honest to say, so a
   first-week user sees three cards rather than nine empty ones.
--------------------------------------------------------------- */

// Roughly what a pile of that weight would be. Not a conversion anyone
// needs — it is there because 437,000 is a number the eye slides off and
// "36 London buses" is not.
const TONNAGE_SCALE = [
  { kg: 150000, one: "blue whale", many: "blue whales" },
  { kg: 12000, one: "London bus", many: "London buses" },
  { kg: 1400, one: "small car", many: "small cars" },
  { kg: 100, one: "bag of cement", many: "bags of cement" },
];

function tonnageComparison(kg) {
  // Prefer a count you can picture. Three blue whales and thirty-six buses
  // are the same weight, but only one of them lands, so a count between 5
  // and 200 wins and the rest are only a fallback.
  const options = TONNAGE_SCALE.map((unit) => ({ unit, n: kg / unit.kg })).filter((o) => o.n >= 1.5);
  const nice = options.find((o) => o.n >= 5 && o.n <= 200) || options[options.length - 1];
  if (!nice) return null;
  const count = Math.round(nice.n);
  return `about ${count} ${count === 1 ? nice.unit.one : nice.unit.many}`;
}

function NerdCard({ title, icon, note, children }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 15, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: note ? 4 : 12 }}>
        {icon} {title}
      </div>
      {note && <div style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.4, marginBottom: 12 }}>{note}</div>}
      {children}
    </div>
  );
}

// A labelled row with a bar behind the number. Used wherever the ranking
// matters as much as the values.
function NerdBars({ rows, colour, unit }) {
  const max = rows.reduce((m, r) => Math.max(m, Math.abs(r.value)), 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
            <span style={{ color: COLORS.text, fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <span style={{ color: r.colour || colour || COLORS.accent, fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
              {r.display !== undefined ? r.display : `${r.value}${unit || ""}`}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: COLORS.surfaceRaised, overflow: "hidden" }}>
            <div style={{ width: `${(Math.abs(r.value) / max) * 100}%`, height: "100%", background: r.colour || colour || COLORS.accent, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Vertical bars for anything read along an axis of time — hours of the
// day, days of the week.
function NerdColumns({ values, labels, colour, highlight }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 84 }}>
      {values.map((v, i) => {
        const on = v > 0;
        const isPeak = highlight && v === max && v > 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
            <div
              title={`${labels[i]}: ${v}`}
              style={{
                width: "100%",
                height: Math.max(on ? 3 : 1, (v / max) * 62),
                borderRadius: 2,
                background: on ? (isPeak ? colour || COLORS.accent : hexToRgba(colour || COLORS.accent, 0.45)) : COLORS.surfaceRaised,
              }}
            />
            <span style={{ color: isPeak ? COLORS.text : COLORS.textDim, fontSize: 8.5, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NerdDonut({ rows, centreValue, centreLabel }) {
  const total = rows.reduce((n, r) => n + r.value, 0);
  if (!total) return null;
  const size = 118, stroke = 19;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.surfaceRaised} strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {rows.filter((row) => row.value > 0).map((row) => {
            const dash = (row.value / total) * c;
            const el = (
              <circle key={row.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={row.colour}
                strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-cumulative} />
            );
            cumulative += dash;
            return el;
          })}
        </g>
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fill={COLORS.text} fontSize={19} fontFamily="'Oswald', sans-serif">{centreValue}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill={COLORS.textDim} fontSize={9} fontFamily="'Oswald', sans-serif" letterSpacing={1}>{centreLabel}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: row.colour, flexShrink: 0 }} />
            <span style={{ color: COLORS.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
            <span style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {total ? Math.round((row.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* The body, coloured by how much of your work each muscle takes.

   A single hue at varying strength rather than red-to-green: this is one
   quantity, not a good-to-bad judgement, and the readiness map above
   already owns the traffic lights. Untouched muscles stay at the base
   tint so "never trained" reads as absence rather than as a low score. */
function MuscleHeatBody({ muscleSets }) {
  const max = Math.max(1, ...Object.values(muscleSets));
  const fillFor = (muscle) => {
    const n = muscleSets[muscle] || 0;
    if (!n) return COLORS.surfaceRaised;
    // Square root, because the top muscle is often several times the
    // median and a linear ramp leaves everything below it looking equally
    // untouched.
    const share = Math.sqrt(n / max);
    return hexToRgba(COLORS.accent, 0.16 + share * 0.84);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <BodySide label="Front" view="front" stages={{}} selected={null} onSelect={() => {}} fillFor={fillFor} compact />
        <BodySide label="Rear" view="back" stages={{}} selected={null} onSelect={() => {}} fillFor={fillFor} compact />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" }}>
        <span style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>less</span>
        <span style={{ flex: 1, maxWidth: 130, height: 7, borderRadius: 4, background: `linear-gradient(to right, ${hexToRgba(COLORS.accent, 0.16)}, ${COLORS.accent})` }} />
        <span style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>more</span>
      </div>
    </div>
  );
}

export function NerdStatsScreen({ onBack }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hist = (await safeGet("workout-history")) || [];
      const acts = (await safeGet("activity-history")) || [];
      if (!cancelled) setStats(computeNerdStats(hist, acts));
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!stats) {
    return (
      <div>
        <TopBar title="Stats for Nerds" onBack={onBack} />
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Crunching…</div>
      </div>
    );
  }
  if (!stats.sessions && !stats.cardio.count) {
    return (
      <div>
        <TopBar title="Stats for Nerds" onBack={onBack} />
        <div style={{ padding: "0 20px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
          Nothing logged yet. Train a few times and this fills up.
        </div>
      </div>
    );
  }

  const n = (v) => Math.round(v).toLocaleString();
  const tiles = [
    { label: "Sessions", value: n(stats.sessions) },
    { label: "Sets", value: n(stats.sets) },
    { label: "Reps", value: n(stats.reps) },
    { label: "Tonnes", value: n(stats.tonnage / 1000) },
  ];
  const compare = tonnageComparison(stats.tonnage);
  const topMuscles = Object.entries(stats.muscleSets).sort((a, b) => b[1] - a[1]);
  const topExercises = Object.entries(stats.exerciseSets).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const effortRows = [
    { label: "To failure", value: stats.effort.byRir[0], colour: STAGE_COLORS.red },
    { label: "1 left", value: stats.effort.byRir[1], colour: STAGE_COLORS.amber },
    { label: "2 left", value: stats.effort.byRir[2], colour: COLORS.accent },
    { label: "3+ left", value: stats.effort.byRir[3], colour: STAGE_COLORS.green },
  ];
  const pplRows = [
    { label: "Push", value: stats.ppl.Push, colour: STAGE_COLORS.red },
    { label: "Pull", value: stats.ppl.Pull, colour: COLORS.accent },
    { label: "Legs", value: stats.ppl.Legs, colour: STAGE_COLORS.green },
  ];
  const gainers = stats.movers.filter((m) => m.pct > 0).slice(0, 4);
  const fallers = stats.movers.filter((m) => m.pct < 0).slice(-3).reverse();
  const cardioRows = Object.entries(stats.cardio.byType)
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .map(([label, v]) => ({
      label,
      value: Math.round(v.seconds / 60),
      display: `${formatDuration(v.seconds)}${v.distance ? ` · ${Math.round(v.distance * 10) / 10}${v.unit || ""}` : ""}`,
    }));
  const failurePct = stats.effort.total ? Math.round((stats.effort.byRir[0] / stats.effort.total) * 100) : 0;
  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const quietDay = WEEKDAY_LABELS[stats.byWeekday.indexOf(Math.min(...stats.byWeekday))];
  const busyDay = WEEKDAY_LABELS[stats.byWeekday.indexOf(Math.max(...stats.byWeekday))];
  const weeklyData = stats.weekly.slice(-26).map((w) => ({ date: w.week, tonnage: w.tonnage }));

  const factRow = { display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderBottom: `1px solid ${COLORS.line}`, fontSize: 12.5 };
  const factValue = { color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, flexShrink: 0 };

  return (
    <div style={{ paddingBottom: 40 }} data-tour="nerd-stats">
      <TopBar title="Stats for Nerds" onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
        {stats.firstDate ? `Everything logged since ${stats.firstDate}.` : "Everything you have logged."}
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* ---- the four big ones ---- */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          {tiles.map((t) => (
            <div key={t.label} style={{ width: "calc(50% - 5px)", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14 }}>
              <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 24, lineHeight: 1 }}>{t.value}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 }}>{t.label}</div>
            </div>
          ))}
        </div>
        {compare && (
          <div style={{ color: COLORS.textDim, fontSize: 11.5, textAlign: "center", marginBottom: 16, lineHeight: 1.4 }}>
            {n(stats.tonnage)}kg of external load — {compare}. Bodyweight and assisted work carry no bar, so they add nothing here.
          </div>
        )}

        {/* ---- where the work goes ---- */}
        {topMuscles.length > 0 && (
          <NerdCard
            title="Where the work goes"
            icon={<User size={13} color={COLORS.accent} />}
            note={`${topMuscles[0][0]} takes the most of it — ${topMuscles[0][1]} sets, ${Math.round((topMuscles[0][1] / stats.sets) * 100)}% of everything you have logged.`}
          >
            <MuscleHeatBody muscleSets={stats.muscleSets} />
            <div style={{ marginTop: 14 }}>
              <NerdBars rows={topMuscles.slice(0, 5).map(([label, value]) => ({ label, value }))} unit=" sets" />
            </div>
          </NerdCard>
        )}

        {/* ---- effort ---- */}
        {stats.effort.total > 0 && (
          <NerdCard
            title="How hard you push"
            icon={<Sparkles size={13} color={COLORS.accent} />}
            note={`You go to failure on ${stats.effort.byRir[0]} of ${stats.effort.total} sets where you recorded the effort — ${failurePct}%.${stats.effort.hardestMuscle ? ` ${stats.effort.hardestMuscle[0]} is what you empty the tank on most.` : ""}`}
          >
            <NerdDonut rows={effortRows} centreValue={`${failurePct}%`} centreLabel="TO FAILURE" />
          </NerdCard>
        )}

        {/* ---- rep ranges ---- */}
        {stats.reps > 0 && (
          <NerdCard title="Rep ranges" icon={<Dumbbell size={13} color={COLORS.accent} />}>
            <NerdBars
              rows={REP_BANDS.map((band) => ({
                label: `${band.label}  ·  ${band.note}`,
                value: stats.repBands[band.key],
                display: `${stats.repBands[band.key]}`,
              }))}
            />
          </NerdCard>
        )}

        {/* ---- balance ---- */}
        {(stats.ppl.Push + stats.ppl.Pull + stats.ppl.Legs) > 0 && (
          <NerdCard title="Push · Pull · Legs" icon={<PieChart size={13} color={COLORS.accent} />}>
            <NerdDonut rows={pplRows} centreValue={n(stats.sets)} centreLabel="SETS" />
          </NerdCard>
        )}

        {/* ---- most-done exercises ---- */}
        {topExercises.length > 0 && (
          <NerdCard
            title="Most-done exercises"
            icon={<Trophy size={13} color={COLORS.accent} />}
            note={`${stats.distinctExercises} different exercises logged.`}
          >
            <NerdBars rows={topExercises.map(([label, value]) => ({ label, value }))} unit=" sets" />
          </NerdCard>
        )}

        {/* ---- movers ---- */}
        {gainers.length > 0 && (
          <NerdCard
            title="Biggest movers"
            icon={<TrendingUp size={13} color={COLORS.accent} />}
            note={`Estimated 1RM, first three sessions against the last three. Lifts with at least ${MOVER_MIN_SESSIONS} sessions behind them.`}
          >
            <NerdBars
              rows={gainers.map((m) => ({ label: m.name, value: m.pct, display: `+${Math.round(m.pct)}%`, colour: STAGE_COLORS.green }))}
            />
            {fallers.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>
                  Going backwards
                </div>
                <NerdBars
                  rows={fallers.map((m) => ({ label: m.name, value: m.pct, display: `${Math.round(m.pct)}%`, colour: STAGE_COLORS.red }))}
                />
              </div>
            )}
          </NerdCard>
        )}

        {/* ---- clock ---- */}
        {stats.timedSessions >= 3 && (
          <NerdCard
            title="When you train"
            icon={<Clock size={13} color={COLORS.accent} />}
            note={`Peak hour is ${peakHour}:00. From the ${stats.timedSessions} session${stats.timedSessions === 1 ? "" : "s"} the app timed itself — imported ones carry no real clock.`}
          >
            <NerdColumns
              values={stats.byHour}
              labels={stats.byHour.map((_, i) => (i % 6 === 0 ? `${i}` : ""))}
              colour={COLORS.accent}
              highlight
            />
          </NerdCard>
        )}

        {/* ---- weekdays ---- */}
        <NerdCard
          title="Which days"
          icon={<HistoryIcon size={13} color={COLORS.accent} />}
          note={`${busyDay} is your busiest, ${quietDay} your quietest.`}
        >
          <NerdColumns values={stats.byWeekday} labels={WEEKDAY_LABELS} colour={COLORS.accent} highlight />
        </NerdCard>

        {/* ---- weekly tonnage ---- */}
        {weeklyData.length >= 4 && (
          <NerdCard title="Weight moved per week" icon={<TrendingUp size={13} color={COLORS.accent} />} note="Last six months, kilograms.">
            <SimpleLineChart
              data={weeklyData}
              dataKey="tonnage"
              height={150}
              trend
              labelFor={(d) => MONTH_ABBREV[parseInt(String(d.date).slice(5, 7), 10) - 1] || ""}
            />
          </NerdCard>
        )}

        {/* ---- the record book ---- */}
        <NerdCard title="Record book" icon={<Bookmark size={13} color={COLORS.accent} />}>
          <div>
            {[
              ["Days trained", n(stats.daysTrained)],
              ["Longest streak", `${stats.longestStreak} day${stats.longestStreak === 1 ? "" : "s"}`],
              ["Longest time off", `${stats.longestGap} day${stats.longestGap === 1 ? "" : "s"}`],
              stats.busiestMonth ? ["Busiest month", `${stats.busiestMonth.month} · ${stats.busiestMonth.count} sessions`] : null,
              ["Sets per session", stats.setsPerSession.toFixed(1)],
              stats.biggestSession ? ["Biggest session", `${stats.biggestSession.sets} sets · ${stats.biggestSession.date}`] : null,
            ].filter(Boolean).map(([label, value], i, arr) => (
              <div key={label} style={{ ...factRow, borderBottom: i === arr.length - 1 ? "none" : factRow.borderBottom }}>
                <span style={{ color: COLORS.textDim }}>{label}</span>
                <span style={factValue}>{value}</span>
              </div>
            ))}
          </div>
        </NerdCard>

        {/* ---- cardio ---- */}
        {cardioRows.length > 0 && (
          <NerdCard
            title="Cardio"
            icon={<Footprints size={13} color={COLORS.accent} />}
            note={`${stats.cardio.count} session${stats.cardio.count === 1 ? "" : "s"}, ${formatDuration(stats.cardio.seconds)} on your feet and wheels.`}
          >
            <NerdBars rows={cardioRows} />
          </NerdCard>
        )}
      </div>
    </div>
  );
}
