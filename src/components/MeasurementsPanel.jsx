import { useState, useEffect } from "react";
import { todayStr } from "../lib/dates.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { COLORS } from "../theme.js";

// Bodyweight alone hides recomposition: the number on the scale can sit
// still for months while the tape says the training is working. One row
// per day, same shape as bodyweight-history so the two read alike.
const BODY_MEASUREMENTS = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "arms", label: "Arm" },
  { key: "thighs", label: "Thigh" },
  { key: "calves", label: "Calf" },
];

export function MeasurementsPanel() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [unit, setUnit] = useState("cm");
  const [draft, setDraft] = useState({});
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const hist = (await safeGet("measurements-history")) || [];
      const cfg = (await safeGet("measurements-config")) || {};
      if (cancelled) return;
      setHistory(hist);
      if (cfg.unit) setUnit(cfg.unit);
      // Prefill from the latest reading so a small change is a small edit.
      const latest = hist.length ? hist[hist.length - 1] : null;
      if (latest) {
        const next = {};
        BODY_MEASUREMENTS.forEach(({ key }) => {
          if (latest[key] != null) next[key] = String(latest[key]);
        });
        setDraft(next);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    const record = { date: todayStr() };
    let any = false;
    BODY_MEASUREMENTS.forEach(({ key }) => {
      const v = parseFloat(draft[key]);
      if (Number.isFinite(v) && v > 0) { record[key] = v; any = true; }
    });
    if (!any) return;
    // One row per day, so correcting a mistyped number replaces it rather
    // than leaving two readings for the same morning.
    const next = [...history.filter((h) => h.date !== record.date), record].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-400);
    await safeSet("measurements-history", next);
    await safeSet("measurements-config", { unit });
    setHistory(next);
    setFlash("Measurements saved ✓");
    setTimeout(() => setFlash(""), 1600);
  }

  async function changeUnit(u) {
    setUnit(u);
    await safeSet("measurements-config", { unit: u });
  }

  if (loading) return null;

  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const label = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
        <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Measurements
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["cm", "in"].map((u) => (
            <button
              key={u}
              onClick={() => changeUnit(u)}
              style={{ width: 38, padding: "5px 0", borderRadius: 7, border: `1px solid ${unit === u ? COLORS.accent : COLORS.line}`, background: unit === u ? COLORS.accent : COLORS.surfaceRaised, color: unit === u ? COLORS.onAccent : COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12, lineHeight: 1.45 }}>
        The scale can sit still for months while these move. Fill in whichever you track and leave the rest blank.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {BODY_MEASUREMENTS.map(({ key, label: name }) => {
          const start = first && first[key] != null ? first[key] : null;
          const now = latest && latest[key] != null ? latest[key] : null;
          const delta = start != null && now != null ? Math.round((now - start) * 10) / 10 : null;
          return (
            <div key={key}>
              <div style={{ ...label, marginBottom: 5, display: "flex", justifyContent: "space-between", gap: 4 }}>
                <span>{name}</span>
                {delta ? (
                  <span style={{ color: delta > 0 ? COLORS.ok : COLORS.textDim }}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                ) : null}
              </div>
              <input
                type="number"
                inputMode="decimal"
                placeholder={unit}
                value={draft[key] || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={save}
        style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 10, padding: "11px 0", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        Save Today's Measurements
      </button>
      {flash && <div style={{ color: COLORS.ok, fontSize: 12, marginTop: 8, textAlign: "center" }}>{flash}</div>}
      {history.length > 1 && (
        <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 10, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>
          {history.length} readings · since {first.date}
        </div>
      )}
    </div>
  );
}
