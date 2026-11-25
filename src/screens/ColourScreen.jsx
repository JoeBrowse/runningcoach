import { hexToRgba, COLOUR_SCHEMES, COLOUR_SCHEME_ORDER, THEME_MODES, COLORS, STAGE_COLORS, STAGE_SHAPES, outlineColorFor, THEME, STAGE_LABELS, STAGE_LEGEND } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

// The three readiness states as they will actually look, on the page where
// you choose them. Picking a scheme from four names and finding out what it
// did by going back to Home is a poor way to make this decision, especially
// for the person most likely to be making it.
function StagePreview() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {STAGE_LEGEND.map(([stage, note]) => {
        const shape = THEME.shapes ? STAGE_SHAPES[stage] : null;
        return (
          <div key={stage} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                margin: "0 auto 7px",
                background: STAGE_COLORS[stage],
                border: shape && shape.width ? `2px ${shape.dash ? "dashed" : "solid"} ${outlineColorFor(STAGE_COLORS[stage])}` : "2px solid transparent",
              }}
            />
            <div style={{ color: COLORS.text, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {STAGE_LABELS[stage]}
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 10, marginTop: 2 }}>{note}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   COLOUR & DISPLAY

   Everything about how the app looks, on one screen: light or dark, the
   colour scheme, and high contrast. They belong together because they
   interact — a scheme's palette is different in each theme, and high
   contrast changes both — and because someone who needs one of them
   usually needs to try the others too.
--------------------------------------------------------------- */

export function ColourScreen({ settings, onChange, onBack }) {
  const scheme = settings.colourScheme || "default";
  const mode = settings.theme || "system";
  const set = (patch) => onChange({ ...settings, ...patch });

  const sectionLabel = {
    color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
  };
  const note = { color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.5, marginBottom: 12 };

  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Colour & Display" onBack={onBack} />

      <div style={{ padding: "0 20px 22px" }}>
        <div style={sectionLabel}>Theme</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {THEME_MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => set({ theme: m.value })}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accent : COLORS.surface, color: active ? COLORS.onAccent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45 }}>
          {(THEME_MODES.find((m) => m.value === mode) || THEME_MODES[0]).desc}
        </div>
      </div>

      <div style={{ padding: "0 20px 22px" }}>
        <div style={sectionLabel}>Colour Scheme</div>
        <div style={note}>
          The readiness map tells you what is recovered using colour, and red, amber and green is the worst possible set for the commonest kind of colour blindness. Pick the one that matches how you see. Every colour in the app that means something changes with it, and the muscles gain outlines so you are never relying on colour alone.
        </div>

        <StagePreview />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {COLOUR_SCHEME_ORDER.map((key) => {
            const sch = COLOUR_SCHEMES[key];
            const pal = sch[THEME.theme] || sch.dark;
            const active = scheme === key;
            return (
              <button
                key={key}
                onClick={() => set({ colourScheme: key })}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? hexToRgba(COLORS.accent, 0.12) : COLORS.surface }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: active ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {sch.label}
                  </span>
                  <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {["red", "amber", "green"].map((st) => (
                      <span key={st} style={{ width: 16, height: 16, borderRadius: 4, background: pal.stages[st], border: sch.shapes && st !== "green" ? `1.5px ${st === "amber" ? "dashed" : "solid"} ${outlineColorFor(pal.stages[st])}` : "none" }} />
                    ))}
                  </span>
                </div>
                <div style={{ color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45 }}>{sch.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <div style={sectionLabel}>Contrast</div>
        <button
          onClick={() => set({ highContrast: !settings.highContrast })}
          style={{ width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1px solid ${settings.highContrast ? COLORS.accent : COLORS.line}`, background: settings.highContrast ? hexToRgba(COLORS.accent, 0.12) : COLORS.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: settings.highContrast ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              High Contrast
            </span>
            <span style={{ display: "block", color: COLORS.textDim, fontSize: 11.5, lineHeight: 1.45 }}>
              Pure black or pure white behind everything, stronger text, heavier lines. For bad lighting, low vision, or a phone held at arm&rsquo;s length in a bright gym. Turns the readiness outlines on whatever scheme you are using.
            </span>
          </span>
          <span style={{ width: 42, height: 24, borderRadius: 12, background: settings.highContrast ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${settings.highContrast ? COLORS.accent : COLORS.line}`, flexShrink: 0, position: "relative" }}>
            <span style={{ position: "absolute", top: 2, left: settings.highContrast ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: settings.highContrast ? COLORS.onAccent : COLORS.textDim }} />
          </span>
        </button>
      </div>
    </div>
  );
}
