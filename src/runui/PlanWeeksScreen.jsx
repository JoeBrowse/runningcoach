import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS, hexToRgba } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { listActivities } from "../shared/store.js";
import { currentPlan } from "../plan/planState.js";
import { getProfile, isRunActivity, jargonOn, today, toUnit, unitLabel, unitsOf } from "./runData.js";
import { Btn, Loading, MONO, OSWALD, Row, S, useWidth } from "./ui.jsx";

/* ---------------------------------------------------------------
   PLAN WEEKS (run:plan)

   Season chart (SVG at real pixel size): planned weekly distance,
   done distance on top, phase bands (Advanced), cutback and taper
   marks, race flags A/B/C, today. Grey bars show the weeks before the
   plan. Below: every week; a tap opens the master week (plan:week).
--------------------------------------------------------------- */

const BEFORE_WEEKS = 8;

function doneByWeek(acts, starts) {
  const out = starts.map(() => 0);
  for (const a of acts) {
    if (!isRunActivity(a) || !a.date || !(a.km > 0)) continue;
    const m = engine.mondayOf(a.date);
    const i = starts.indexOf(m);
    if (i >= 0) out[i] += a.km;
  }
  return out;
}

function SeasonChart({ plan, acts, units, showPhases, iso }) {
  const [ref, width] = useWidth();
  const before = Array.from({ length: BEFORE_WEEKS }, (_, i) => engine.addDays(plan.weeks[0].startIso, -7 * (BEFORE_WEEKS - i)));
  const beforeDone = doneByWeek(acts, before);
  const firstUsed = beforeDone.findIndex((x) => x > 0);
  const pre = firstUsed < 0 ? [] : before.slice(firstUsed).map((s, i) => ({ startIso: s, done: beforeDone[firstUsed + i], pre: true }));
  const starts = plan.weeks.map((w) => w.startIso);
  const done = doneByWeek(acts, starts);
  const cols = [...pre, ...plan.weeks.map((w, i) => ({ ...w, done: done[i] }))];
  const H = 190;
  const top = 26;
  const bottom = 22;
  const plotH = H - top - bottom;
  const max = Math.max(5, ...cols.map((c) => Math.max(c.km || 0, c.done || 0))) * 1.08;
  const plotW = Math.max(40, width - 40);
  const cw = plotW / cols.length;
  const y = (km) => top + plotH - (km / max) * plotH;
  const bw = Math.max(1.5, cw * 0.72);
  const todayX = (() => {
    const i = cols.findIndex((c) => iso >= c.startIso && iso <= engine.addDays(c.startIso, 6));
    if (i < 0) return null;
    return (i + (engine.daysBetween(cols[i].startIso, iso) + 0.5) / 7) * cw;
  })();
  // Phase bands: runs of the same phase.
  const bands = [];
  if (showPhases) {
    cols.forEach((c, i) => {
      const ph = c.pre ? "Before the plan" : c.phase || "";
      const last = bands[bands.length - 1];
      if (last && last.ph === ph) last.to = i + 1;
      else bands.push({ ph, from: i, to: i + 1 });
    });
  }
  const races = (plan.races || []).filter((r) => r && r.iso);
  const ticks = [max / 2, max].map((v) => Math.round(toUnit(v, units) / 5) * 5).filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  return (
    <div ref={ref} data-testid="season-chart" style={{ width: "100%" }}>
      <svg width={width} height={H} role="img" aria-label="Season chart of weekly distance" style={{ display: "block" }}>
        {bands.map((b, i) => (
          <g key={i}>
            <rect x={b.from * cw} y={0} width={(b.to - b.from) * cw - 1} height={10} rx={2} fill={b.ph === "Before the plan" ? COLORS.surfaceRaised : hexToRgba(COLORS.accent, i % 2 ? 0.22 : 0.4)} />
            {(b.to - b.from) * cw > 40 && (
              <text x={b.from * cw + 3} y={21} fill={COLORS.textDim} fontSize={9.5} fontFamily={OSWALD} style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {b.ph.length * 5.5 > (b.to - b.from) * cw ? b.ph.slice(0, Math.max(3, Math.floor(((b.to - b.from) * cw) / 6))) : b.ph}
              </text>
            )}
          </g>
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={plotW} y1={y(engine.unitsToKm(t, units))} y2={y(engine.unitsToKm(t, units))} stroke={COLORS.line} strokeWidth={1} strokeDasharray="2 4" />
            <text x={width - 2} y={y(engine.unitsToKm(t, units)) - 3} textAnchor="end" fill={COLORS.textDim} fontSize={9.5} fontFamily={MONO}>
              {t} {unitLabel(units)}
            </text>
          </g>
        ))}
        {cols.map((c, i) => {
          const x = i * cw + (cw - bw) / 2;
          const planned = c.km || 0;
          const isTaper = !c.pre && (c.kind === "taper" || c.kind === "race");
          return (
            <g key={i}>
              {!c.pre && planned > 0 && (
                <rect x={x} y={y(planned)} width={bw} height={top + plotH - y(planned)} rx={1.5} fill={hexToRgba(COLORS.accent, c.cutback ? 0.1 : 0.22)} stroke={c.cutback ? COLORS.accent : "none"} strokeDasharray={c.cutback ? "3 2" : undefined} strokeWidth={c.cutback ? 1 : 0} />
              )}
              {c.done > 0 && <rect x={x + bw * 0.18} y={y(c.done)} width={Math.max(1, bw * 0.64)} height={top + plotH - y(c.done)} rx={1} fill={c.pre ? COLORS.textDim : COLORS.accent} opacity={c.pre ? 0.55 : 1} />}
              {isTaper && cw >= 7 && (
                <text x={i * cw + cw / 2} y={H - 8} textAnchor="middle" fill={COLORS.textDim} fontSize={9} fontFamily={OSWALD}>
                  T
                </text>
              )}
              {c.cutback && cw >= 7 && (
                <text x={i * cw + cw / 2} y={H - 8} textAnchor="middle" fill={COLORS.textDim} fontSize={9} fontFamily={OSWALD}>
                  C
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={plotW} y1={top + plotH + 0.5} y2={top + plotH + 0.5} stroke={COLORS.line} />
        {races.map((r, k) => {
          const i = cols.findIndex((c) => r.iso >= c.startIso && r.iso <= engine.addDays(c.startIso, 6));
          if (i < 0) return null;
          const x = (i + (engine.daysBetween(cols[i].startIso, r.iso) + 0.5) / 7) * cw;
          const pr = r.priority || "C";
          const col = pr === "A" ? COLORS.accent : pr === "B" ? COLORS.text : COLORS.textDim;
          return (
            <g key={k} data-testid={`race-flag-${pr}`}>
              <line x1={x} x2={x} y1={top - 2} y2={top + plotH} stroke={col} strokeWidth={1.5} />
              <rect x={x + 13 > width ? x - 13 : x} y={top - 4} width={13} height={10} fill={col} />
              <text x={(x + 13 > width ? x - 13 : x) + 6.5} y={top + 4} textAnchor="middle" fill={COLORS.bg} fontSize={8.5} fontFamily={OSWALD}>
                {pr}
              </text>
            </g>
          );
        })}
        {todayX !== null && (
          <g data-testid="today-marker">
            <line x1={todayX} x2={todayX} y1={top - 4} y2={top + plotH + 4} stroke={COLORS.text} strokeWidth={2} />
            <text x={Math.min(width - 30, Math.max(0, todayX - 14))} y={H - 8} fill={COLORS.text} fontSize={9.5} fontFamily={OSWALD}>
              TODAY
            </text>
          </g>
        )}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
        <Legend color={hexToRgba(COLORS.accent, 0.22)} text="Planned" />
        <Legend color={COLORS.accent} text="Done" />
        {pre.length > 0 && <Legend color={COLORS.textDim} text="Before the plan" />}
        <Legend text="C = easier week, T = taper" />
        {races.length > 0 && <Legend text="Flags = races A, B, C" />}
      </div>
    </div>
  );
}

function Legend({ color, text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: COLORS.textDim, fontSize: 11 }}>
      {color && <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />}
      {text}
    </span>
  );
}

export function PlanWeeksScreen({ nav }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all([currentPlan(), listActivities(nav.settings), getProfile()]).then(([plan, acts, profile]) => live && setData({ plan, acts, profile }));
    return () => {
      live = false;
    };
  }, [nav.reloadKey, nav.settings]);

  if (!data) {
    return (
      <div data-testid="plan-weeks-screen" style={S.page()}>
        <TopBar title="Plan weeks" onBack={nav.back} />
        <Loading />
      </div>
    );
  }
  const { plan, acts, profile } = data;
  const units = unitsOf(profile);
  const iso = today();
  if (!plan) {
    return (
      <div data-testid="plan-weeks-screen" style={S.page()}>
        <TopBar title="Plan weeks" onBack={nav.back} />
        <div style={S.card()}>
          <div style={{ ...S.body(), marginBottom: 12 }}>There is no plan yet.</div>
          <Btn kind="primary" onClick={() => nav.go("plan:setup")} testId="make-plan">
            Make a plan
          </Btn>
        </div>
      </div>
    );
  }
  const adv = jargonOn(nav.settings, plan, acts, iso);
  const starts = plan.weeks.map((w) => w.startIso);
  const done = doneByWeek(acts, starts);
  const peak = Math.max(...plan.weeks.filter((w) => w.kind !== "race" && w.kind !== "taper" && w.kind !== "recovery").map((w) => w.km || 0), 0);

  return (
    <div data-testid="plan-weeks-screen" style={S.page()}>
      <TopBar title="Plan weeks" onBack={nav.back} />
      <div style={S.card()}>
        <div style={S.title()}>{plan.goalName || "Your plan"}</div>
        <div style={{ ...S.body(), marginBottom: 10, fontFamily: MONO, fontSize: 11.5 }}>
          {plan.weeks.length} weeks · {engine.fmtDate(plan.weeks[0].startIso)} to {engine.fmtDate(engine.addDays(plan.weeks[plan.weeks.length - 1].startIso, 6))}
          {peak > 0 ? ` · largest week ${engine.fmtKm(peak, units)}` : ""}
        </div>
        <SeasonChart plan={plan} acts={acts} units={units} showPhases={adv} iso={iso} />
      </div>
      <div style={S.section()}>All weeks</div>
      <div data-testid="weeks-list" style={{ ...S.card({ paddingTop: 4, paddingBottom: 4 }) }}>
        {plan.weeks.map((w, i) => {
          const end = engine.addDays(w.startIso, 6);
          const now = iso >= w.startIso && iso <= end;
          const tags = [];
          if (adv && w.phase) tags.push(w.phase);
          if (w.cutback) tags.push(adv ? "Cutback" : "Easier week");
          if (!adv && (w.kind === "taper" || w.kind === "race")) tags.push(w.kind === "race" ? "Race week" : "Before the race");
          const races = (plan.races || []).filter((r) => r.iso >= w.startIso && r.iso <= end);
          for (const r of races) tags.push(adv ? `${r.priority || "C"} race` : "Race");
          return (
            <Row key={i} onClick={() => nav.go("plan:week", { weekIndex: i })} testId={`week-row-${i}`} right={<ChevronRight size={18} color={COLORS.textDim} />}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontFamily: OSWALD, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, color: now ? COLORS.accent : COLORS.text }}>
                  Week {w.n} {now ? "· now" : ""}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text, whiteSpace: "nowrap" }}>
                  {done[i] > 0 ? `${toUnit(done[i], units).toFixed(1)} / ` : ""}
                  {engine.fmtKm(w.km || 0, units)}
                </span>
              </div>
              <div style={{ ...S.body(), fontSize: 11.5 }}>
                {engine.fmtDate(w.startIso)}
                {tags.length ? ` · ${tags.join(" · ")}` : ""}
              </div>
            </Row>
          );
        })}
      </div>
    </div>
  );
}
