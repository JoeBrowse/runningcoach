import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, PieChart } from "lucide-react";
import { MONTH_NAMES, todayStr } from "../lib/dates.js";
import { loadTrainedDates, computeCurrentStreak, buildHeatmapDays } from "../lib/stats.js";
import { hexToRgba, COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   STREAK / CONSISTENCY SCREEN
--------------------------------------------------------------- */

// One square per day of a calendar year, laid out as twelve month blocks.
// Each block is a Monday-first week grid, so a column is always the same
// weekday and the shape reads like a calendar rather than one long ribbon.
// Dates are assembled from the parts rather than via toISOString, which
// would shift the day either side of midnight depending on the timezone.
function YearHeatmap({ year, trainedDates, today }) {
  const pad = (n) => String(n).padStart(2, "0");
  // The tour highlights whichever month has the most training in it, so the
  // ring lands on filled squares instead of an empty January.
  const monthTotals = MONTH_NAMES.map((_, m) => {
    const days = new Date(year, m + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => `${year}-${pad(m + 1)}-${pad(i + 1)}`).filter((d) => trainedDates.has(d)).length;
  });
  const busiestMonth = monthTotals.indexOf(Math.max(...monthTotals));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(98px, 1fr))", gap: 14 }}>
      {MONTH_NAMES.map((label, m) => {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        // getDay() is Sunday-first; shift so Monday starts the week.
        const lead = (new Date(year, m, 1).getDay() + 6) % 7;
        const trainedThisMonth = Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(m + 1)}-${pad(i + 1)}`).filter((ds) => trainedDates.has(ds)).length;
        return (
          <div key={label} data-tour={m === busiestMonth ? "streak-heatmap" : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
              {trainedThisMonth > 0 && (
                <span style={{ color: COLORS.accent, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>{trainedThisMonth}</span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: lead }).map((_, i) => (
                <div key={`lead-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const ds = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
                const trained = trainedDates.has(ds);
                const isToday = ds === today;
                return (
                  <div
                    key={ds}
                    title={`${ds}${trained ? " · trained" : ""}`}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 2.5,
                      background: trained ? COLORS.accent : COLORS.surfaceRaised,
                      border: isToday ? `1.5px solid ${COLORS.text}` : undefined,
                      boxSizing: "border-box",
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StreakScreen({ onBack, onViewNerdStats }) {
  const [trainedDates, setTrainedDates] = useState(new Set());
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const dates = await loadTrainedDates();
      if (cancelled) return;
      setTrainedDates(dates);
      setTotalWorkouts(dates.size);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayStr();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const streak = computeCurrentStreak(trainedDates);
  const thisWeekCount = buildHeatmapDays(trainedDates, 1).filter((d) => d.trained).length;

  // Only offer years the user could actually have trained in: back to their
  // first logged session, forward no further than the current year.
  const firstYear = trainedDates.size
    ? Math.min(thisYear, ...[...trainedDates].map((d) => parseInt(d.slice(0, 4), 10)).filter(Number.isFinite))
    : thisYear;
  const yearCount = [...trainedDates].filter((d) => d.startsWith(`${year}-`)).length;
  const arrow = (enabled) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    background: COLORS.surface,
    border: `1px solid ${COLORS.line}`,
    color: enabled ? COLORS.text : COLORS.line,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div>
      <TopBar title="Consistency" onBack={onBack} />
      <div style={{ padding: "0 20px 16px", color: COLORS.textDim, fontSize: 13 }}>
        Each square is one day. A filled square shows a day that you trained. Lifting and cardio both count.
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
        {[
          { label: "Current Streak", value: streak },
          { label: "This Week", value: thisWeekCount },
          { label: "Days Trained", value: totalWorkouts },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 22 }}>{loading ? "–" : s.value}</div>
            <div style={{ color: COLORS.textDim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={() => setYear((y) => Math.max(firstYear, y - 1))}
          disabled={year <= firstYear}
          title="Previous year"
          style={arrow(year > firstYear)}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 20, letterSpacing: 1 }}>{year}</div>
          <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
            {loading ? "…" : `${yearCount} workout${yearCount === 1 ? "" : "s"}`}
          </div>
        </div>
        <button
          onClick={() => setYear((y) => Math.min(thisYear, y + 1))}
          disabled={year >= thisYear}
          title="Next year"
          style={arrow(year < thisYear)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
        ) : (
          <YearHeatmap year={year} trainedDates={trainedDates} today={today} />
        )}
      </div>

      {/* The calendar answers "did I train"; everything behind this button
          answers "what did I actually do". It lives at the foot of the
          screen rather than on Home because none of it is needed mid-set. */}
      <div style={{ padding: "0 20px 40px" }}>
        <button
          data-tour="nerd-stats-btn"
          onClick={onViewNerdStats}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: hexToRgba(COLORS.accent, 0.1), border: `1px solid ${COLORS.accent}`, borderRadius: 12, padding: "13px 14px", textAlign: "left" }}
        >
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
              <PieChart size={14} /> Stats for Nerds
            </span>
            <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.4 }}>
              Tonnage, rep ranges, sets per muscle, sets to failure and training times.
            </span>
          </span>
          <ChevronRight size={16} color={COLORS.accent} style={{ flexShrink: 0 }} />
        </button>
      </div>
    </div>
  );
}
