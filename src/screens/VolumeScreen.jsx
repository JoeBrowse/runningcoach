import { useState, useEffect } from "react";
import { MUSCLE_GROUPS } from "../lib/recovery.js";
import { computeWeeklyVolume, formatSets } from "../lib/stats.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   WEEKLY VOLUME SCREEN
--------------------------------------------------------------- */

export function VolumeScreen({ onBack }) {
  const [volume, setVolume] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    computeWeeklyVolume().then((v) => {
      if (cancelled) return;
      setVolume(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxCount = Math.max(1, ...Object.values(volume));

  return (
    <div>
      <TopBar title="Weekly Volume" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        Sets logged per muscle, trailing 7 days. Work where a muscle is a secondary counts as half a set.
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 11, padding: "4px 20px 16px", lineHeight: 1.45 }}>
        No target is marked, because there isn't one. Taken close enough to failure, four to six hard sets a week is
        plenty for a muscle; what you need depends on your goals, your experience and whether you're natural.
      </div>
      <div style={{ padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
        ) : (
          MUSCLE_GROUPS.map((m) => {
            const count = volume[m] || 0;
            const pct = Math.min(100, (count / maxCount) * 100);
            return (
              <div key={m}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase" }}>{m}</div>
                  <div style={{ color: COLORS.textDim, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{formatSets(count)} sets</div>
                </div>
                {/* One neutral colour for every bar: the length is the
                    comparison, and a hue would be a verdict. */}
                <div style={{ height: 8, borderRadius: 4, background: COLORS.surfaceRaised, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: count > 0 ? COLORS.textDim : "transparent", transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
