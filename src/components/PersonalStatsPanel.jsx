import { useState, useEffect } from "react";
import { onBodyweightChange, upsertBodyweight } from "../lib/bodyweight.js";
import { todayStr } from "../lib/dates.js";
import { safeGet, safeSet } from "../lib/storage.js";
import { COLORS } from "../theme.js";

// Weight is stored under the shared "bodyweight" key (the same one PB%
// bodyweight math uses), so entering it here or in the weight-tracking panel
// stays in sync. Height and age are new, stored together under "personal-stats".
export function PersonalStatsPanel() {
  const [weightInput, setWeightInput] = useState("");
  const [weightUnit, setWeightUnit] = useState("lb");
  const [weightLogged, setWeightLogged] = useState(null);
  const [heightInput, setHeightInput] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [ageInput, setAgeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const bw = await safeGet("bodyweight");
      const stats = await safeGet("personal-stats");
      if (cancelled) return;
      if (bw) {
        setWeightInput(String(bw.value));
        setWeightUnit(bw.unit || "lb");
        setWeightLogged(bw);
      }
      if (stats) {
        if (stats.height) setHeightInput(String(stats.height));
        if (stats.heightUnit) setHeightUnit(stats.heightUnit);
        if (stats.age) setAgeInput(String(stats.age));
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // The weight-tracking panel below writes the same reading.
  useEffect(
    () =>
      onBodyweightChange((record) => {
        setWeightInput(String(record.value));
        setWeightUnit(record.unit || "kg");
        setWeightLogged(record);
      }),
    []
  );

  async function save() {
    setSaving(true);
    if (weightInput) {
      const record = { value: parseFloat(weightInput), unit: weightUnit, date: todayStr() };
      await upsertBodyweight(record);
      setWeightLogged(record);
    }
    await safeSet("personal-stats", {
      height: heightInput ? parseFloat(heightInput) : null,
      heightUnit,
      age: ageInput ? parseInt(ageInput, 10) : null,
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  const fieldLabel = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 };
  const inputStyle = { flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 10px", color: COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 };
  const unitBtn = (active) => ({ width: 42, borderRadius: 8, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surfaceRaised, color: active ? COLORS.onAccent : COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 });

  if (loading) {
    return (
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
        <div style={{ color: COLORS.textDim, textAlign: "center", padding: 10 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={fieldLabel}>Weight</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" inputMode="decimal" placeholder="e.g. 175" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={inputStyle} />
          {["lb", "kg"].map((u) => (
            <button key={u} onClick={() => setWeightUnit(u)} style={unitBtn(weightUnit === u)}>{u}</button>
          ))}
        </div>
        {weightLogged && <div style={{ color: COLORS.textDim, fontSize: 11, marginTop: 5 }}>logged {weightLogged.date}</div>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={fieldLabel}>Height</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" inputMode="decimal" placeholder={heightUnit === "cm" ? "e.g. 178" : "e.g. 70"} value={heightInput} onChange={(e) => setHeightInput(e.target.value)} style={inputStyle} />
          {["cm", "in"].map((u) => (
            <button key={u} onClick={() => setHeightUnit(u)} style={unitBtn(heightUnit === u)}>{u}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={fieldLabel}>Age</div>
        <input type="number" inputMode="numeric" placeholder="e.g. 28" value={ageInput} onChange={(e) => setAgeInput(e.target.value)} style={{ ...inputStyle, maxWidth: 100 }} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 10, padding: "11px 0", color: COLORS.onAccent, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {savedFlash ? "Saved ✓" : saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
