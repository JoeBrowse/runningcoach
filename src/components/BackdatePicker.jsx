import { MONTH_NAMES, daysInMonth, clampToNow } from "../lib/dates.js";
import { COLORS } from "../theme.js";

// Custom back-date/time picker built from plain <select> dropdowns rather than
// a native <input type="datetime-local">. Native date/time inputs are
// unreliable in Android WebViews (many render as a bare text field with no
// picker UI, and a value that doesn't match the exact expected format is
// silently dropped) — dropdowns behave identically everywhere, including
// inside a packaged APK.
export function BackdatePicker({ value, onChange, onDone }) {
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const hour12 = ((hour24 + 11) % 12) + 1;
  const isPM = hour24 >= 12;
  const dayCount = daysInMonth(year, month);
  const years = [year, year - 1].filter((y, i, arr) => arr.indexOf(y) === i);

  function setPart(patch) {
    const next = new Date(value);
    if ("year" in patch) next.setFullYear(patch.year);
    if ("month" in patch) {
      const maxDay = daysInMonth(patch.year ?? year, patch.month);
      next.setMonth(patch.month, Math.min(next.getDate(), maxDay));
    }
    if ("day" in patch) next.setDate(patch.day);
    if ("hour12" in patch || "isPM" in patch) {
      const h12 = patch.hour12 ?? hour12;
      const pm = "isPM" in patch ? patch.isPM : isPM;
      const h24 = (h12 % 12) + (pm ? 12 : 0);
      next.setHours(h24);
    }
    if ("minute" in patch) next.setMinutes(patch.minute);
    onChange(clampToNow(next));
  }

  function quickPick(daysAgo) {
    const d = new Date(value);
    const base = new Date();
    base.setDate(base.getDate() - daysAgo);
    d.setFullYear(base.getFullYear(), base.getMonth(), base.getDate());
    onChange(clampToNow(d));
  }

  const selectStyle = {
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 12.5,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "7px 6px",
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button onClick={() => onChange(new Date())} style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>Now</button>
        <button onClick={() => quickPick(1)} style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>Yesterday</button>
        <button onClick={() => quickPick(2)} style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 0", color: COLORS.text, fontSize: 11.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>2 Days Ago</button>
      </div>

      <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Date</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <select value={day} onChange={(e) => setPart({ day: parseInt(e.target.value, 10) })} style={{ ...selectStyle, flex: 1 }}>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => setPart({ month: parseInt(e.target.value, 10) })} style={{ ...selectStyle, flex: 1.3 }}>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setPart({ year: parseInt(e.target.value, 10) })} style={{ ...selectStyle, flex: 1 }}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Time</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <select value={hour12} onChange={(e) => setPart({ hour12: parseInt(e.target.value, 10) })} style={{ ...selectStyle, flex: 1 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span style={{ color: COLORS.textDim }}>:</span>
        <select value={minute} onChange={(e) => setPart({ minute: parseInt(e.target.value, 10) })} style={{ ...selectStyle, flex: 1 }}>
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
        <select value={isPM ? "PM" : "AM"} onChange={(e) => setPart({ isPM: e.target.value === "PM" })} style={{ ...selectStyle, flex: 1 }}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>

      <button onClick={onDone} style={{ width: "100%", background: COLORS.accent, border: "none", borderRadius: 8, padding: "9px 0", color: COLORS.onAccent, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}>
        Done
      </button>
    </div>
  );
}
