import { useState, useEffect } from "react";
import { computeProgrammeStats } from "../lib/programmes.js";
import { safeGet } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

export function ProgrammeStatsScreen({ programme, isFinished, onBack, onHome }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hist = (await safeGet("workout-history")) || [];
      if (!cancelled) setStats(computeProgrammeStats(programme, hist));
    }
    load();
    return () => { cancelled = true; };
  }, [programme]);

  const tile = { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14, flex: 1 };
  const big = { color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 24, lineHeight: 1 };
  const small = { color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 5 };

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title={isFinished ? "Programme Complete" : "Programme Progress"} onBack={onBack} />
      <div style={{ padding: "0 20px" }}>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 20, textTransform: "uppercase", marginBottom: 2 }}>{programme.name}</div>
        <div style={{ color: COLORS.textDim, fontSize: 12.5, marginBottom: 18 }}>
          {stats && stats.firstDate ? `${stats.firstDate} → ${stats.lastDate || "…"}` : "No sessions logged yet."}
          {isFinished && programme.endedEarly ? " · ended early" : ""}
        </div>

        {!stats ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 20 }}>Crunching numbers…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={tile}><div style={big}>{stats.sessions}</div><div style={small}>of {stats.planned} sessions</div></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <div style={tile}><div style={big}>{stats.totalSets}</div><div style={small}>sets logged</div></div>
              <div style={tile}><div style={big}>{(stats.totalVolume / 1000).toFixed(1)}t</div><div style={small}>total volume</div></div>
            </div>

            <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Biggest strength gains
            </div>
            {stats.gainers.length === 0 ? (
              <div style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 18 }}>
                Not enough repeat sessions yet to measure progression. Keep logging and this fills in.
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                {stats.gainers.slice(0, 8).map((g) => {
                  const up = g.pct >= 0;
                  return (
                    <div key={g.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.line}` }}>
                      <div style={{ minWidth: 0, marginRight: 10 }}>
                        <div style={{ color: COLORS.text, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                        <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>e1RM {g.from} → {g.to} kg</div>
                      </div>
                      <div style={{ color: up ? "#5FB86B" : COLORS.bad, fontFamily: "'Oswald', sans-serif", fontSize: 15, flexShrink: 0 }}>
                        {up ? "+" : ""}{g.pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isFinished && onHome && (
              <button onClick={onHome} style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 12, padding: "15px 0", color: COLORS.onAccent, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Back to Home
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
