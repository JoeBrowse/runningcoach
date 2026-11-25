import { todayStr } from "../lib/dates.js";
import { COLORS } from "../theme.js";

/* A date box for a log form, so every entry can be back-dated.
   The value is a local "YYYY-MM-DD". Future dates are not allowed. */
export function LogDateField({ value, onChange, label = "Date", style }) {
  return (
    <input
      type="date"
      value={value}
      max={todayStr()}
      aria-label={label}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onChange(v > todayStr() ? todayStr() : v);
      }}
      style={{
        background: COLORS.surfaceRaised,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 8,
        color: COLORS.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        padding: "9px 10px",
        boxSizing: "border-box",
        minWidth: 0,
        ...style,
      }}
    />
  );
}
