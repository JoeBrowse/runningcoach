import { useEffect, useMemo, useState } from "react";
import { Award, ChevronRight } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { listActivities } from "../shared/store.js";
import { fitnessSeries, formShare, formZone } from "../shared/load.js";
import { currentPlan } from "../plan/planState.js";
import { RECORD_DISTANCES, computeMilestones, computeRecords, fmtDuration, getProfile, isRunActivity, jargonOn, today, toUnit, unitLabel, unitsOf } from "./runData.js";
import { BarChart, ChartLegend, LineChart } from "./charts.jsx";
import { Btn, Chip, ChipRow, Loading, MONO, OSWALD, Row, S, Segmented } from "./ui.jsx";

/* ---------------------------------------------------------------
   PROGRESS (run:progress)

   Range, fitness / fatigue / form (shared/load.js, information only),
   weekly distance, easy/hard split (engine.easyHardSplit, with the
   method), goal against predicted time (Advanced), records,
   milestones, and the history list (filter, search, 50 at a time).
--------------------------------------------------------------- */

const RANGES = [
  { value: 56, label: "8 weeks" },
  { value: 182, label: "6 months" },
  { value: 365, label: "1 year" },
  { value: 0, label: "All" },
];
const PAGE = 50;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabels(isos) {
  const step = Math.max(1, Math.ceil(isos.length / 5));
  return isos.map((iso, i) => (i % step === 0 ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}` : null));
}

/* Matches the search box. "> 25" or "over 25" finds runs longer than 25 (units). */
function matches(a, q, units) {
  if (!q) return true;
  const m = /^(?:>|over|more than)\s*(\d+(?:\.\d+)?)$/i.exec(q.trim());
  if (m) return a.km > 0 && toUnit(a.km, units) > Number(m[1]);
  const text = `${a.name || ""} ${a.type || ""} ${a.date || ""} ${(a.raw && a.raw.note) || ""} ${(a.raw && a.raw.workoutTitle) || ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => text.includes(w));
}

export function ProgressScreen({ nav }) {
  const [data, setData] = useState(null);
  const [range, setRange] = useState(56);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    Promise.all([listActivities(nav.settings), getProfile(), currentPlan()]).then(([acts, profile, plan]) => live && setData({ acts, profile, plan }));
    return () => {
      live = false;
    };
  }, [nav.reloadKey, nav.settings]);

  const iso = today();
  const derived = useMemo(() => {
    if (!data) return null;
    const { acts, profile, plan } = data;
    const firstDate = acts.length ? acts[0].date : iso;
    const from = range ? engine.addDays(iso, -range + 1) : firstDate || iso;
    const series = fitnessSeries(acts, { settings: nav.settings, maxHR: Number(profile.maxHR) || undefined, until: iso }).filter((r) => r.date >= from);
    const runs = acts.filter(isRunActivity);
    const inRange = runs.filter((a) => a.date >= from && a.date <= iso);
    // Weekly distance
    const weeks = [];
    for (let m = engine.mondayOf(from); m <= iso; m = engine.addDays(m, 7)) weeks.push(m);
    const weekKm = weeks.map((m) => inRange.filter((a) => engine.mondayOf(a.date) === m).reduce((s, a) => s + (a.km || 0), 0));
    // Easy / hard
    const hrVals = { maxHR: Number(profile.maxHR) || undefined, restHR: Number(profile.restHR) || undefined, lthr: Number(profile.lthr) || undefined };
    const split = engine.easyHardSplit(
      inRange.map((a) => ({ min: a.minutes || 0, avgHR: a.avgHR || undefined, maxHR: hrVals.maxHR ? undefined : a.maxHR || undefined, type: (a.raw && a.raw.workoutType) || "easy", zoneSec: a.raw && a.raw.zoneSec })),
      hrVals
    );
    // Goal against predicted (best run in the 6 weeks before each week end)
    const goalKm = plan && plan.goalKm ? plan.goalKm : null;
    const goalSec = (plan && plan.goalTimeSec) || Number(profile.goalTimeSec) || null;
    let trend = null;
    if (goalKm) {
      const scored = runs.filter((a) => a.km >= 3 && a.minutes >= 12).map((a) => ({ date: a.date, score: engine.fitnessScore(a.km, a.minutes * 60) })).filter((x) => x.score);
      const vals = weeks.map((m) => {
        const end = engine.addDays(m, 6);
        const start = engine.addDays(end, -42);
        const best = scored.filter((x) => x.date > start && x.date <= end).reduce((b, x) => Math.max(b, x.score), 0);
        return best ? engine.predict(best, goalKm) : null;
      });
      if (vals.some((v) => v)) trend = { vals, goalSec, goalKm };
    }
    return { series, weeks, weekKm, split, trend, from, inRange };
  }, [data, range, iso, nav.settings]);

  if (!data || !derived) {
    return (
      <div data-testid="progress-screen" style={S.page()}>
        <TopBar title="Progress" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const { acts, profile, plan } = data;
  const units = unitsOf(profile);
  const adv = jargonOn(nav.settings, plan, acts, iso);
  const { series, weeks, weekKm, split, trend, inRange } = derived;
  const records = computeRecords(acts);
  const milestones = computeMilestones(acts);
  const earned = milestones.filter((m) => m.done).sort((a, b) => b.date.localeCompare(a.date));
  const next = milestones.filter((m) => !m.done).slice(0, 3);
  const last = series[series.length - 1];
  const zone = last ? formZone(formShare(last)) : null;

  const history = acts
    .slice()
    .reverse()
    .filter((a) => (filter === "all" ? true : filter === "run" ? isRunActivity(a) : filter === "lift" ? a.source === "lift" : a.source === "activity" && !isRunActivity(a)))
    .filter((a) => matches(a, query, units));

  const totalKm = inRange.reduce((s, a) => s + (a.km || 0), 0);

  return (
    <div data-testid="progress-screen" style={S.page()}>
      <TopBar title="Progress" onBack={nav.back} />
      <div style={{ padding: "0 20px 12px" }}>
        <Segmented value={range} options={RANGES} onChange={setRange} testId="range-select" />
      </div>

      <div data-testid="fitness-card" style={S.card()}>
        <div style={S.title()}>{adv ? "Fitness, fatigue and form" : "Fitness and fatigue"}</div>
        {series.length > 1 ? (
          <>
            <LineChart
              testId="fitness-chart"
              zero={adv}
              xLabels={monthLabels(series.map((r) => r.date))}
              series={[
                { data: series.map((r) => r.fitness), color: COLORS.accent },
                { data: series.map((r) => r.fatigue), color: COLORS.trend, width: 1.5 },
                ...(adv ? [{ data: series.map((r) => r.form), color: COLORS.textDim, dash: "4 3", width: 1.5 }] : []),
              ]}
            />
            <ChartLegend items={[{ color: COLORS.accent, text: "Fitness (6 weeks)" }, { color: COLORS.trend, text: "Fatigue (1 week)" }, ...(adv ? [{ color: COLORS.textDim, dash: "4 3", text: "Form" }] : [])]} />
            <div style={{ ...S.body(), marginTop: 8 }}>
              Fitness is your training of the last 6 weeks. Fatigue is your training of the last week. Runs, gym sessions and other sports all count (effort × minutes).
              {adv && zone ? ` Form now: ${zone.label}. ${zone.note}` : ""}
            </div>
            <div style={{ ...S.label(), marginTop: 8 }}>Information only. It cannot predict injury.</div>
          </>
        ) : (
          <div style={S.body()}>No training in this range yet.</div>
        )}
      </div>

      <div style={S.card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.title()}>Weekly distance</div>
          <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.textDim }}>{engine.fmtKm(totalKm, units)} in total</span>
        </div>
        <BarChart testId="weekly-chart" values={weekKm.map((k) => toUnit(k, units))} labels={monthLabels(weeks)} highlight={weekKm.length - 1} yFmt={(v) => `${Math.round(v)} ${unitLabel(units)}`} />
      </div>

      <div data-testid="easy-hard" style={S.card()}>
        <div style={S.title()}>Easy and hard running</div>
        {split.count ? (
          <>
            <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", margin: "8px 0" }}>
              <div style={{ width: `${split.easyPct}%`, background: COLORS.accentDim }} />
              <div style={{ width: `${split.hardPct}%`, background: COLORS.accent }} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 13, color: COLORS.text }}>
              Easy {split.easyPct}% ({split.easyMin} min) · Hard {split.hardPct}% ({split.hardMin} min)
            </div>
            <div style={{ ...S.body(), marginTop: 6 }}>About 80% easy is the aim. Method: {split.note}</div>
          </>
        ) : (
          <div style={S.body()}>No runs in this range yet.</div>
        )}
      </div>

      {adv && trend && (
        <div data-testid="goal-trend" style={S.card()}>
          <div style={S.title()}>Goal and predicted time</div>
          <LineChart
            testId="goal-chart"
            xLabels={monthLabels(weeks)}
            yFmt={(v) => engine.fmtTime(v)}
            series={[{ data: trend.vals.map((v) => (v ? v : NaN)), color: COLORS.accent }, ...(trend.goalSec ? [{ data: trend.vals.map(() => trend.goalSec), color: COLORS.ok, dash: "5 4", width: 1.5 }] : [])]}
          />
          <ChartLegend items={[{ color: COLORS.accent, text: "Predicted" }, ...(trend.goalSec ? [{ color: COLORS.ok, dash: "5 4", text: `Goal ${engine.fmtTime(trend.goalSec)}` }] : [])]} />
          <div style={{ ...S.body(), marginTop: 6 }}>An estimate from your best run in the 6 weeks before each week, for {engine.fmtKm(trend.goalKm, units)}. A race or time trial gives a better value.</div>
        </div>
      )}

      <div data-testid="records" style={S.card()}>
        <div style={{ ...S.title(), marginBottom: 6 }}>Records</div>
        {RECORD_DISTANCES.map((d) => {
          const r = records[d.id];
          return (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", minHeight: 30, alignItems: "center", borderBottom: `1px solid ${COLORS.line}` }}>
              <span style={{ ...S.text(), fontSize: 13 }}>{d.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: r ? COLORS.text : COLORS.textDim }}>{r ? `${fmtDuration(r.sec)} · ${engine.fmtDate(r.date)}` : "-"}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", minHeight: 30, alignItems: "center" }}>
          <span style={{ ...S.text(), fontSize: 13 }}>Longest run</span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: records.longest ? COLORS.text : COLORS.textDim }}>{records.longest ? `${engine.fmtKm(records.longest.km, units)} · ${engine.fmtDate(records.longest.date)}` : "-"}</span>
        </div>
        <div style={{ ...S.body(), marginTop: 6 }}>From runs of the distance (up to 10% longer) and from km splits.</div>
      </div>

      <div data-testid="milestones" style={S.card()}>
        <div style={{ ...S.title(), marginBottom: 6 }}>Milestones</div>
        {earned.length === 0 && <div style={S.body()}>Your first milestone comes with your first run.</div>}
        {earned.slice(0, 12).map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 32 }}>
            <Award size={16} color={COLORS.accent} />
            <span style={{ flex: 1, ...S.text(), fontSize: 13 }}>{m.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: COLORS.textDim }}>{engine.fmtDate(m.date)}</span>
          </div>
        ))}
        {next.length > 0 && (
          <>
            <div style={{ ...S.label(), margin: "10px 0 4px" }}>Next</div>
            {next.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 28 }}>
                <Award size={16} color={COLORS.line} />
                <span style={{ ...S.body(), fontSize: 13 }}>{m.label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={S.section()}>History</div>
      <div data-testid="history" style={S.card()}>
        <ChipRow>
          {[
            ["all", "All"],
            ["run", "Runs"],
            ["other", "Other sports"],
            ["lift", "Lift"],
          ].map(([id, label]) => (
            <Chip
              key={id}
              active={filter === id}
              testId={`filter-${id}`}
              onClick={() => {
                setFilter(id);
                setShown(PAGE);
              }}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <input
          data-testid="history-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder={`Search. "> 20" finds runs over 20 ${unitLabel(units)}`}
          style={{ ...S.field(), fontFamily: "inherit", marginTop: 10 }}
        />
        <div style={{ ...S.body(), margin: "8px 0 2px" }}>
          {history.length} item{history.length === 1 ? "" : "s"}
        </div>
        {history.slice(0, shown).map((a) => (
          <Row key={`${a.source}-${a.id}`} testId="history-row" onClick={() => (a.source === "lift" ? nav.openLiftScreen("history") : nav.go("run:activity", { id: a.id }))} right={<ChevronRight size={16} color={COLORS.textDim} />}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: OSWALD, fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(a.raw && a.raw.workoutTitle) || a.name}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.text, whiteSpace: "nowrap" }}>{a.km ? engine.fmtKm(a.km, units) : a.minutes ? `${Math.round(a.minutes)} min` : ""}</span>
            </div>
            <div style={{ ...S.body(), fontSize: 11.5 }}>
              {a.date ? engine.fmtDate(a.date) : ""}
              {a.minutes ? ` · ${fmtDuration(a.minutes * 60)}` : ""}
              {a.km && a.minutes ? ` · ${engine.fmtPace((a.minutes * 60) / a.km, units)}` : ""}
              {a.raw && a.raw.simulated ? " · simulated" : ""}
            </div>
          </Row>
        ))}
        {history.length > shown && (
          <div style={{ marginTop: 10 }}>
            <Btn onClick={() => setShown(shown + PAGE)} testId="history-more">
              Show {Math.min(PAGE, history.length - shown)} more
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
