import { useState, useEffect } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { onBodyweightChange, upsertBodyweight } from "../lib/bodyweight.js";
import { todayStr } from "../lib/dates.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { hexToRgba, COLORS } from "../theme.js";
import { SimpleLineChart } from "./SimpleLineChart.jsx";

// Opt-in weight tracking: off by default. Once turned on, the user can set a
// goal weight, log their weight over time, and see a graph of the trend.
// History is stored under "bodyweight-history"; the on/off flag + goal live
// under "weight-tracking".
export function WeightTrackingPanel() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goal, setGoal] = useState(null);
  const [unit, setUnit] = useState("lb");
  const [history, setHistory] = useState([]);
  const [logInput, setLogInput] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cfg = (await safeGet("weight-tracking")) || {};
      const hist = (await safeGet("bodyweight-history")) || [];
      const bw = await safeGet("bodyweight");
      if (cancelled) return;
      setEnabled(!!cfg.enabled);
      if (cfg.goal) { setGoal(cfg.goal); setGoalInput(String(cfg.goal)); }
      if (cfg.unit) setUnit(cfg.unit);
      else if (bw && bw.unit) setUnit(bw.unit);
      setHistory(hist);
      if (bw && bw.value) setLogInput(String(bw.value));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // The personal stats panel above writes the same reading.
  useEffect(
    () =>
      onBodyweightChange((record, nextHistory) => {
        setLogInput(String(record.value));
        if (record.unit) setUnit(record.unit);
        setHistory(nextHistory);
      }),
    []
  );

  async function persistConfig(next) {
    await safeSet("weight-tracking", { enabled, goal, unit, ...next });
  }

  async function turnOn() {
    setEnabled(true);
    await persistConfig({ enabled: true });
  }

  async function saveGoal() {
    const g = parseFloat(goalInput);
    if (!g) return;
    setGoal(g);
    await persistConfig({ enabled: true, goal: g });
    setFlash("Goal saved ✓");
    setTimeout(() => setFlash(""), 1600);
  }

  async function logWeight() {
    const v = parseFloat(logInput);
    if (!v) return;
    const record = { value: v, unit, date: todayStr() };
    const next = await upsertBodyweight(record);
    setHistory(next);
    setFlash("Weight logged ✓");
    setTimeout(() => setFlash(""), 1600);
  }

  const fieldLabel = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 };
  const inputStyle = { flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 };
  const unitBtn = (active) => ({ width: 42, borderRadius: 8, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 });

  if (loading) return null;

  if (!enabled) {
    return (
      <button
        onClick={turnOn}
        style={{ width: "100%", textAlign: "left", background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: hexToRgba(COLORS.accent, 0.12), border: `1px solid ${COLORS.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent }}>
          <TrendingUp size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>Turn on weight tracking</div>
          <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 2 }}>Set a goal, log your weight over time, and see it on a graph.</div>
        </div>
        <ChevronRight size={18} color={COLORS.textDim} />
      </button>
    );
  }

  const chartData = history.map((h) => ({ date: h.date.slice(5), weight: h.value }));
  const latest = history.length ? history[history.length - 1] : null;
  const start = history.length ? history[0] : null;
  const delta = latest && start ? +(latest.value - start.value).toFixed(1) : null;

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase" }}>Weight Tracking</div>
        {flash && <span style={{ color: COLORS.accent, fontSize: 11.5 }}>{flash}</span>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={fieldLabel}>Goal Weight</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" inputMode="decimal" placeholder="e.g. 165" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} style={inputStyle} />
          {["lb", "kg"].map((u) => (
            <button key={u} onClick={() => setUnit(u)} style={unitBtn(unit === u)}>{u}</button>
          ))}
          <button onClick={saveGoal} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 12, textTransform: "uppercase" }}>Set</button>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabel}>Log Today's Weight</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" inputMode="decimal" placeholder="e.g. 172" value={logInput} onChange={(e) => setLogInput(e.target.value)} style={inputStyle} />
          <button onClick={logWeight} style={{ padding: "0 16px", borderRadius: 8, border: "none", background: COLORS.accent, color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 12.5, textTransform: "uppercase" }}>Log</button>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, background: COLORS.surfaceRaised, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{latest.value}{unit}</div>
            <div style={{ color: COLORS.textDim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Current</div>
          </div>
          {delta !== null && (
            <div style={{ flex: 1, background: COLORS.surfaceRaised, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{delta > 0 ? "+" : ""}{delta}{unit}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Change</div>
            </div>
          )}
          {goal && (
            <div style={{ flex: 1, background: COLORS.surfaceRaised, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ color: COLORS.accent, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{+(goal - latest.value).toFixed(1)}{unit}</div>
              <div style={{ color: COLORS.textDim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>To Goal</div>
            </div>
          )}
        </div>
      )}

      {chartData.length < 2 ? (
        <div style={{ color: COLORS.textDim, fontSize: 12.5, textAlign: "center", padding: "14px 0" }}>
          Log your weight on at least two days to see a graph.
        </div>
      ) : (
        <SimpleLineChart data={chartData} dataKey="weight" height={190} goal={goal} />
      )}
    </div>
  );
}
