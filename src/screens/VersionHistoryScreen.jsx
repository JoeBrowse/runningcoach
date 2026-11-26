import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { APP_VERSION, RELEASE_NOTES, formatReleaseDate } from "../data/releaseNotes.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   VERSION HISTORY

   What's New shows one release, once. This is the whole run of them,
   newest first, each a line you can open. The summary line is the
   release's own headline, so there is no second description to write
   and nothing to keep in step; tapping a release shows exactly what
   the changelog showed on the day it shipped.

   The dates are the day each version reached main, read off the
   repository rather than typed, which is why several of them share a
   date — some days shipped more than one.
--------------------------------------------------------------- */

export function VersionHistoryScreen({ onBack }) {
  const [open, setOpen] = useState(null);
  const first = RELEASE_NOTES[RELEASE_NOTES.length - 1];
  const latest = RELEASE_NOTES[0];

  return (
    <div style={{ paddingBottom: 40 }} data-testid="version-history">
      <TopBar title="Version History" onBack={onBack} />
      <div style={{ padding: "0 20px" }}>
        <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.5, marginBottom: 18 }}>
          {`${RELEASE_NOTES.length} releases, ${formatReleaseDate(first.released, true)} to ${formatReleaseDate(latest.released, true)}. Tap a release to see its changes.`}
        </div>

        {RELEASE_NOTES.map((notes) => {
          const isOpen = open === notes.version;
          const isCurrent = notes.version === APP_VERSION;
          return (
            <div
              key={notes.version}
              data-testid="version-row"
              style={{ background: COLORS.surface, border: `1px solid ${isCurrent ? COLORS.accent : COLORS.line}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : notes.version)}
                style={{ width: "100%", background: "transparent", border: "none", padding: 0, textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ color: isCurrent ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      v{notes.version}
                    </span>
                    <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatReleaseDate(notes.released, true)}
                    </span>
                    {isCurrent && (
                      <span style={{ color: COLORS.accent, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
                        installed
                      </span>
                    )}
                  </span>
                  <span style={{ display: "block", color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.45 }}>{notes.headline}</span>
                </span>
                {isOpen ? <ChevronUp size={16} color={COLORS.textDim} style={{ flexShrink: 0, marginTop: 2 }} /> : <ChevronDown size={16} color={COLORS.textDim} style={{ flexShrink: 0, marginTop: 2 }} />}
              </button>

              {isOpen && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.items.map((item) => (
                    <div key={item.title} style={{ background: COLORS.surfaceRaised, borderLeft: `3px solid ${COLORS.accent}`, borderRadius: 10, padding: "11px 13px" }}>
                      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
                        {item.title}
                      </div>
                      <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.5 }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.5, textAlign: "center", marginTop: 16 }}>
          {`The first release of Skid Marks was on ${formatReleaseDate(first.released)}.`}
        </div>
      </div>
    </div>
  );
}
