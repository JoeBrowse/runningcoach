import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Undo2, X } from "lucide-react";
import { COLORS, hexToRgba } from "../theme.js";
import * as engine from "../run/engine.js";
import { onPlanNotice, undoLast } from "./unplanned.js";
import { niceDates, st, oswald } from "./ui.jsx";

/* ---------------------------------------------------------------
   "PLAN UPDATED" NOTICE (spec v1.1 section 4, UI part)

   App.jsx shows it on every screen. It appears when an unplanned run
   or lift session changed the plan (src/plan/unplanned.js). It lists
   the changes with the reasons and has Undo and "What changed and why"
   (the plan:changes screen).
--------------------------------------------------------------- */

const MAX_LINES = 3;

export function PlanNotice({ nav }) {
  const [notice, setNotice] = useState(null);
  const [undone, setUndone] = useState(false);
  const [busy, setBusy] = useState(false);
  // App.jsx makes a new nav on each render. The listener reads the newest one.
  const navRef = useRef(nav);
  navRef.current = nav;

  useEffect(
    () =>
      onPlanNotice((n) => {
        setUndone(false);
        setNotice(n);
        if (navRef.current && navRef.current.reload) navRef.current.reload();
      }),
    []
  );

  // A notice with no change goes away by itself.
  useEffect(() => {
    if (!notice || notice.changed) return undefined;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice) return null;
  const r = notice.result || {};
  const changes = (r.changes || []).slice().sort((a, b) => String(a.iso || a.date || "").localeCompare(String(b.iso || b.date || "")));
  const what = notice.kind === "lift" ? "A gym session that was not in the plan" : "A run that was not in the plan";
  // The title already says "Plan updated".
  const message = String(r.message || "").replace(/^Plan updated\.\s*/i, "");

  async function doUndo() {
    setBusy(true);
    await undoLast();
    setBusy(false);
    setUndone(true);
    if (navRef.current && navRef.current.reload) navRef.current.reload();
  }

  return (
    <div
      data-testid="plan-notice"
      role="status"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        maxWidth: 388,
        margin: "0 auto",
        zIndex: 190,
        background: COLORS.surface,
        border: `1px solid ${COLORS.accent}`,
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        maxHeight: "60vh",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: hexToRgba(COLORS.accent, 0.14), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarCheck size={16} color={COLORS.accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-testid="plan-notice-title" style={{ color: COLORS.accent, fontFamily: oswald, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6 }}>
            {undone ? "Change taken back" : notice.changed ? "Plan updated" : "Plan checked"}
          </div>
          <div style={{ ...st.body(), fontSize: 12.5, marginTop: 2 }}>
            {undone ? "Your plan is as it was before." : `${what}. ${niceDates(message || (notice.changed ? "The next days changed." : "No change was necessary."))}`}
          </div>
        </div>
        <button aria-label="Close" data-testid="plan-notice-close" onClick={() => setNotice(null)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
      {!undone && changes.length > 0 && (
        <div data-testid="plan-notice-changes" style={{ marginTop: 8 }}>
          {changes.slice(0, MAX_LINES).map((c, i) => (
            <div key={i} style={{ padding: "6px 0", borderTop: `1px solid ${COLORS.line}` }}>
              <div style={{ ...st.text(), fontSize: 12.5 }}>
                <span style={{ ...st.mono(11.5), color: COLORS.textDim }}>{c.iso || c.date ? engine.fmtDate(c.iso || c.date) : ""} </span>
                {c.before ? <span style={{ color: COLORS.textDim, textDecoration: "line-through" }}>{c.before}</span> : null}
                {c.before && c.after ? " -> " : ""}
                {c.after || ""}
              </div>
              {c.reason && <div style={{ ...st.body(), fontSize: 12 }}>{niceDates(c.reason)}</div>}
            </div>
          ))}
          {changes.length > MAX_LINES && <div style={{ ...st.body(), fontSize: 12 }}>And {changes.length - MAX_LINES} more.</div>}
        </div>
      )}
      {!undone && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {notice.changed && (
            <button data-testid="plan-notice-undo" disabled={busy} onClick={doUndo} style={smallBtn()}>
              <Undo2 size={14} /> Undo
            </button>
          )}
          <button
            data-testid="plan-notice-details"
            onClick={() => {
              setNotice(null);
              if (navRef.current) navRef.current.go("plan:changes", {});
            }}
            style={smallBtn()}
          >
            What changed and why
          </button>
        </div>
      )}
    </div>
  );
}

function smallBtn() {
  return {
    flex: 1,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    background: COLORS.surfaceRaised,
    border: `1px solid ${COLORS.line}`,
    color: COLORS.text,
    fontFamily: oswald,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    padding: "6px 8px",
  };
}
