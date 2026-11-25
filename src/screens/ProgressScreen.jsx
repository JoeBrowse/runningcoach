import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { EXERCISES, ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { isCalisthenic, effectiveLoad, bodyweightOnOrBefore, muscleOfExerciseId } from "../lib/exercises.js";
import { getTopSet, UNTAGGED_BRAND, variationsInHistory, matchesVariation } from "../lib/history.js";
import { estimateOneRM } from "../lib/progression.js";
import { safeGet, safeList } from "../lib/storage.js";
import { hexToRgba, COLORS } from "../theme.js";
import { MuscleAccordion } from "../components/ExercisePicker.jsx";
import { SimpleLineChart } from "../components/SimpleLineChart.jsx";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   PROGRESS CHARTS
--------------------------------------------------------------- */

// A plain-SVG line chart. This used to be recharts, which cost roughly
// half the JS bundle to draw one line with an axis pair — a poor trade in
// an app that ships as an APK and starts on cheap phones. Everything the
// two call sites actually used is here: dashed horizontal grid, both axes,
// a line with dots, and a tap/hover readout.
//
// Width is measured off the wrapper rather than assumed, because a chart
// laid out at 0x0 (sandboxed iframes, some WebViews) silently renders
// blank. Falls back to a sensible width until the first measurement lands.
// What the Progress line plots. Estimated 1RM is the default because it
// is the only one of the three that stays honest when the rep target
// moves; the other two are still worth having, so all three are offered.
const CHART_METRICS = [
  { key: "e1rm", label: "Est. 1RM", blurb: "Estimated one-rep max over time — accounts for reps, so a lighter set for more reps still reads as progress." },
  { key: "top", label: "Top Set", blurb: "Heaviest set of each session, ignoring how many reps it was for." },
  { key: "volume", label: "Volume", blurb: "Total weight moved each session — sets x reps x weight, drop sets included." },
];

/* One logged session reduced to the number a chart plots.

   `entry` carries the exercise id, the loading and the lifter's bodyweight
   at the time, because for a calisthenic movement the figure in the weight
   column is not the load. Thirty kilos of assistance is bodyweight minus
   thirty, and it goes DOWN as you get stronger — plotting it raw draws a
   beginner's progress running backwards. */
function metricValue(metric, sets, entry) {
  const list = sets || [];
  const ctx = entry || {};
  const loadOf = (w) =>
    ctx.exerciseId && isCalisthenic(ctx.exerciseId)
      ? effectiveLoad(ctx.exerciseId, ctx.method, w, ctx.bodyweight)
      : parseFloat(w);
  if (metric === "volume") {
    let total = 0;
    for (const set of list) {
      total += (loadOf(set.weight) || 0) * (parseFloat(set.reps) || 0);
      // A drop set's own load follows the same rule as the set it hangs off.
      for (const d of set.drops || []) total += (loadOf(d.weight) || 0) * (parseFloat(d.reps) || 0);
    }
    return Math.round(total);
  }
  const top = getTopSet(list) || {};
  const load = loadOf(top.weight);
  if (metric === "e1rm") return estimateOneRM(load, top.reps) || 0;
  return load || 0;
}

export function ProgressScreen({ onBack }) {
  const [exerciseIds, setExerciseIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [exHistory, setExHistory] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState(""); // "" = every machine
  const [metric, setMetric] = useState("e1rm");
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState(null); // null until the user opens or closes one
  // Needed to plot calisthenics at all: an assisted pull-up's load is
  // bodyweight minus the assistance, so without a weigh-in there is no
  // number to draw.
  const [bwHistory, setBwHistory] = useState([]);
  const [bwCurrent, setBwCurrent] = useState(null);
  const [unit, setUnit] = useState("kg");
  const bodyweightOnDate = (d) => bodyweightOnOrBefore(d, bwHistory, bwCurrent, unit);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hist, cur, cfg] = await Promise.all([
        safeGet("bodyweight-history"),
        safeGet("bodyweight"),
        safeGet("settings"),
      ]);
      if (cancelled) return;
      setBwHistory(Array.isArray(hist) ? hist : []);
      setBwCurrent(cur || null);
      if (cfg && cfg.weightUnit) setUnit(cfg.weightUnit);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let ids = [];
      const keys = await safeList("ex-history:");
      if (keys && keys.length > 0) {
        ids = keys.map((k) => k.replace("ex-history:", ""));
      } else {
        const allIds = Object.keys(ALL_EXERCISES_BY_ID);
        const checks = await Promise.all(allIds.map(async (id) => [id, await safeGet(`ex-history:${id}`)]));
        ids = checks.filter(([, h]) => h && h.length > 0).map(([id]) => id);
      }
      if (cancelled) return;
      setExerciseIds(ids);
      if (ids.length > 0) setSelectedId(ids[0]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    async function load() {
      setChartLoading(true);
      const hist = (await safeGet(`ex-history:${selectedId}`)) || [];
      if (cancelled) return;
      setExHistory(hist);
      setBrands(variationsInHistory(hist, selectedId));
      setBrandFilter(""); // a different exercise was done different ways
      setChartLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Weights from two different machines on one line make a sawtooth that says
  // nothing about progress, so the chart can be narrowed to a single stack.
  const chartData = exHistory
    .filter((h) => h && h.date)
    .filter((h) => {
      if (!brandFilter) return true;
      const v = brandFilter === UNTAGGED_BRAND ? { label: UNTAGGED_BRAND } : brands.find((x) => x.label === brandFilter);
      return matchesVariation(h, selectedId, v);
    })
    .map((h) => ({
      date: String(h.date).slice(5),
      // Carried so the chart can tell a change of loading from a change of
      // strength: the same lift on a barbell and on dumbbells is two series.
      method: h.method || "",
      weight: metricValue(metric, h.sets, {
        exerciseId: selectedId,
        method: h.method,
        // The bodyweight recorded nearest that session, not today's — a
        // year of charted pull-ups should not shift every time the scale
        // moves.
        bodyweight: bodyweightOnDate(h.date),
      }),
    }))
    .filter((p) => p.weight > 0);

  // Everything you have logged, filed under the body part it trains and in
  // the same order as the database, so a group reads the way it does
  // everywhere else in the app.
  const muscleOf = (id) => {
    const ex = ALL_EXERCISES_BY_ID[id];
    return (ex && ex.muscle) || muscleOfExerciseId(id) || "Other";
  };
  const exerciseGroups = (() => {
    const byMuscle = {};
    for (const id of exerciseIds) {
      if (!ALL_EXERCISES_BY_ID[id]) continue;
      const muscle = muscleOf(id);
      (byMuscle[muscle] = byMuscle[muscle] || []).push(ALL_EXERCISES_BY_ID[id]);
    }
    const groupOrder = Object.keys(EXERCISES);
    const rank = (m) => {
      const i = groupOrder.indexOf(m);
      return i < 0 ? groupOrder.length : i;
    };
    return Object.keys(byMuscle)
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((muscle) => {
        const order = (EXERCISES[muscle] || []).map((e) => e.id);
        const items = [...byMuscle[muscle]].sort((a, b) => {
          const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
          return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.name.localeCompare(b.name);
        });
        return { muscle, items };
      });
  })();

  // Until you touch one, the only group open is the one holding the chart
  // on screen — arriving on a collapsed list with no idea where you are
  // would be worse than the flat list this replaced.
  const openMuscles = openGroups || new Set(selectedId ? [muscleOf(selectedId)] : []);
  const toggleGroup = (muscle) => {
    const next = new Set(openMuscles);
    if (next.has(muscle)) next.delete(muscle);
    else next.add(muscle);
    setOpenGroups(next);
  };

  // Only worth offering when there is actually something to switch between.
  const hasUntagged = exHistory.some((h) => h && h.date && matchesVariation(h, selectedId, { label: UNTAGGED_BRAND }));
  const labels = brands.map((b) => b.label);
  const brandOptions = labels.length > 1 || (labels.length === 1 && hasUntagged)
    ? [...labels, ...(hasUntagged ? [UNTAGGED_BRAND] : [])]
    : [];

  return (
    <div>
      <TopBar title="Progress" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        {CHART_METRICS.find((m) => m.key === metric).blurb}
      </div>

      {loading ? (
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
      ) : exerciseIds.length === 0 ? (
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30, fontSize: 13.5 }}>
          No logged exercises yet. Finish a workout to start tracking progress.
        </div>
      ) : (
        <>
          <div style={{ padding: "10px 20px" }}>
            {selectedId && (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, textTransform: "uppercase", minWidth: 0 }}>
                    {ALL_EXERCISES_BY_ID[selectedId] ? ALL_EXERCISES_BY_ID[selectedId].name : selectedId}
                  </div>
                  {brandOptions.length > 0 && (
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      style={{ flexShrink: 0, maxWidth: "45%", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "6px 8px", color: COLORS.text, fontFamily: "system-ui, sans-serif", fontSize: 12, appearance: "none", WebkitAppearance: "none" }}
                    >
                      <option value="">All</option>
                      {brandOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Top-set weight alone lies when the rep target changes:
                    100kg x 5 followed by 95kg x 10 is progress drawn as a
                    drop. Estimated 1RM folds the reps in, so it leads. */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {CHART_METRICS.map((m) => {
                    const active = metric === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMetric(m.key)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? hexToRgba(COLORS.accent, 0.14) : "transparent", color: active ? COLORS.accent : COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4 }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                {chartLoading ? (
                  <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
                ) : chartData.length < 2 ? (
                  <div style={{ color: COLORS.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>
                    {brandFilter
                      ? `Only ${chartData.length === 1 ? "one session" : "no sessions"} logged ${brandFilter === UNTAGGED_BRAND ? "without a machine or implement recorded" : `on ${brandFilter}`}.`
                      : "Log a couple more sessions to see a trend."}
                  </div>
                ) : (
                  <SimpleLineChart data={chartData} dataKey="weight" height={200} trend flagOutliers />
                )}
              </div>
            )}
          </div>

          {/* Two years of lifting is a long flat list to scroll, and you
              nearly always arrive knowing which body part you want to look
              at. Same accordions as the exercise picker, so the grouping is
              the one you already know. */}
          <div style={{ padding: "0 20px 40px" }}>
            {exerciseGroups.map(({ muscle, items }) => (
              <MuscleAccordion
                key={muscle}
                muscle={muscle}
                count={items.length}
                isOpen={openMuscles.has(muscle)}
                onToggle={() => toggleGroup(muscle)}
              >
                {items.map((ex) => {
                  const isSelected = selectedId === ex.id;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedId(ex.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: isSelected ? COLORS.surfaceRaised : "transparent",
                        border: `1px solid ${isSelected ? COLORS.accent : COLORS.line}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        color: isSelected ? COLORS.text : COLORS.textDim,
                        fontSize: 13.5,
                        fontFamily: "'Oswald', sans-serif",
                        textTransform: "uppercase",
                        textAlign: "left",
                      }}
                    >
                      <TrendingUp size={13} /> {ex.name}
                    </button>
                  );
                })}
              </MuscleAccordion>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
