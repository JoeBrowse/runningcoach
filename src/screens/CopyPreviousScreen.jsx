import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { safeGet } from "../lib/storage.js";
import { COLORS } from "../theme.js";
import { SessionSummary } from "../components/SessionSummary.jsx";
import { TopBar } from "../components/TopBar.jsx";

export function CopyPreviousScreen({ onBack, onPick }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hist = (await safeGet("workout-history")) || [];
      if (!cancelled) {
        setSessions([...hist].reverse());
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <TopBar title="Copy Previous" onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        Select a past workout. The new workout uses the same exercises.
      </div>
      <div style={{ padding: "10px 20px 40px" }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ color: COLORS.textDim, textAlign: "center", padding: 30, fontSize: 13.5 }}>
            There are no past workouts yet. Finish a workout. Then it shows here.
          </div>
        ) : (
          sessions.map((s) => {
            const muscles = [...new Set(s.exercises.map((e) => e.muscle))];
            return (
              <button
                key={s.id}
                onClick={() => onPick(s)}
                style={{
                  width: "100%",
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                }}
              >
                <SessionSummary session={s} muscles={muscles} />
                <ChevronRight size={18} color={COLORS.textDim} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
