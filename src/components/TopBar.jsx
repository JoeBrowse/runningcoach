import { ChevronLeft } from "lucide-react";
import { COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   UI PRIMITIVES
--------------------------------------------------------------- */

export function TopBar({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "22px 20px 14px", gap: 10 }}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 12,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.text,
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 22,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: COLORS.text,
        }}
      >
        {title}
      </div>
    </div>
  );
}
