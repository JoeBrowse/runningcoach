import { useState } from "react";
import { Info } from "lucide-react";
import { FORM_SCALE, FORM_ZONES, FITNESS_DAYS, FATIGUE_DAYS, MIN_DAYS_FOR_FORM } from "../shared/load.js";
import { COLORS, STAGE_COLORS } from "../theme.js";

/* The Form gauge (fitness / fatigue / form, src/shared/load.js).

   One scale with a marker. The colour belongs to the scale, and the
   marker shows where you are. The words are behind the info button.
   It is information only, the same as the old Iron Log load gauge. */

const FORM_SOURCES = [
  {
    cite: "Foster C. Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc, 1998.",
    what: "Session RPE: effort multiplied by minutes gives one training load value.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9662690/",
  },
  {
    cite: "Banister EW, Calvert TW, Savage MV, Bach T. A systems model of training for athletic performance. Aust J Sports Med, 1975.",
    what: "The fitness and fatigue model.",
    url: null,
  },
  {
    cite: "Lolli L, Batterham AM, Hawkins R, et al. Mathematical coupling causes spurious correlation within the conventional acute-to-chronic workload ratio calculations. Br J Sports Med, 2019;53:921–922.",
    what: "Why load numbers cannot predict injury. This is why the gauge is information only.",
    url: "https://bjsm.bmj.com/content/53/15/921.full",
  },
];

function FormInfo({ fitness, fatigue, form }) {
  const label = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 };
  const body = { color: COLORS.text, fontSize: 11.5, lineHeight: 1.5 };
  const dim = { color: COLORS.textDim, fontSize: 11, lineHeight: 1.5 };
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  return (
    <div data-testid="form-info" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginTop: 10 }}>
      <div style={label}>What this is</div>
      <div style={{ ...body, marginBottom: 14 }}>
        This gauge compares your recent training with your usual training. Runs, lift
        sessions and other sports all count.
      </div>

      <div style={label}>Information only</div>
      <div data-testid="form-info-only" style={{ ...body, marginBottom: 14 }}>
        This gauge is information only. It cannot predict injury. Use it together with
        how you feel. If something hurts, see a physio or a doctor.
      </div>

      <div style={label}>Fitness, fatigue and form</div>
      <div style={{ marginBottom: 14 }}>
        {[
          ["Fitness", Math.round(fitness), `average daily load of about the last ${FITNESS_DAYS} days`],
          ["Fatigue", Math.round(fatigue), `average daily load of about the last ${FATIGUE_DAYS} days`],
          ["Form", Math.round(form), "fitness minus fatigue"],
        ].map(([name, value, note]) => (
          <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
            <span style={{ ...body, width: 58, flexShrink: 0 }}>{name}</span>
            <span style={{ ...mono, color: COLORS.accent, fontSize: 12, width: 44, flexShrink: 0 }}>{value}</span>
            <span style={{ ...dim, flex: 1, minWidth: 0 }}>{note}</span>
          </div>
        ))}
      </div>
      <div style={{ ...dim, marginBottom: 14 }}>
        Fitness changes slowly. Fatigue changes quickly. After hard days, fatigue is
        higher than fitness and form is below zero. After rest days, form goes up.
        Recent days count more than old days.
      </div>

      <div style={label}>How the app calculates load</div>
      <div style={{ ...dim, marginBottom: 14 }}>
        Load is effort (1 to 10) multiplied by minutes. A run or another sport uses
        the effort that you give it. If there is no effort, the app uses heart rate,
        or else effort 7. A lift session uses the average effort of its sets. The effort
        of a set is 10 − RIR. The numbers have no unit. Compare them only with your own
        numbers.
      </div>

      <div style={label}>The zones</div>
      <div style={{ marginBottom: 14 }}>
        {[...FORM_ZONES].reverse().map((z) => (
          <div key={z.label} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_COLORS[z.stage], flexShrink: 0, alignSelf: "center" }} />
            <span style={{ ...body, width: 74, flexShrink: 0 }}>{z.label}</span>
            <span style={{ ...dim, flex: 1, minWidth: 0 }}>{z.note}</span>
          </div>
        ))}
      </div>

      <div style={label}>Papers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FORM_SOURCES.map((src) => {
          const inner = (
            <>
              <span style={{ ...dim, display: "block", color: src.url ? COLORS.accent : COLORS.text }}>{src.what}</span>
              <span style={{ ...dim, display: "block", fontSize: 10.5 }}>{src.cite}</span>
            </>
          );
          return src.url ? (
            <a key={src.cite} href={src.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block" }}>{inner}</a>
          ) : (
            <div key={src.cite}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

// `summary` is the result of loadSummary() / loadFormSummary().
export function FormGauge({ summary }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const s = summary || { ready: false, fitness: 0, fatigue: 0, form: 0, share: 0, zone: FORM_ZONES[2] };
  const span = FORM_SCALE.max - FORM_SCALE.min;
  const pct = (v) => `${Math.max(0, Math.min(100, ((v - FORM_SCALE.min) / span) * 100))}%`;

  const header = (right) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
      <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
        Form
        <span data-testid="form-info-only-tag" style={{ marginLeft: 6, letterSpacing: 0.5, textTransform: "none", opacity: 0.85 }}>· information only</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {right}
        <button
          data-testid="form-info-btn"
          onClick={() => setInfoOpen((v) => !v)}
          aria-label="What fitness, fatigue and form mean"
          aria-expanded={infoOpen}
          style={{
            width: 20, height: 20, borderRadius: 10, flexShrink: 0, padding: 0,
            background: infoOpen ? COLORS.accent : "transparent",
            border: `1px solid ${infoOpen ? COLORS.accent : COLORS.line}`,
            color: infoOpen ? COLORS.onAccent : COLORS.textDim,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Info size={12} />
        </button>
      </span>
    </div>
  );

  if (!s.ready) {
    return (
      <div data-testid="form-gauge" data-tour="form-gauge" style={{ marginTop: 18 }}>
        {header(null)}
        <div style={{ height: 14, borderRadius: 7, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}` }} />
        <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 7 }}>
          The app needs about {Math.round(MIN_DAYS_FOR_FORM / 7)} weeks of training data. Then it can show your form.
        </div>
        {infoOpen && <FormInfo fitness={s.fitness} fatigue={s.fatigue} form={s.form} />}
      </div>
    );
  }

  const colour = STAGE_COLORS[s.zone.stage];
  const gradient = `linear-gradient(to right,
    ${STAGE_COLORS.red} 0%,
    ${STAGE_COLORS.red} ${pct(-0.35)},
    ${STAGE_COLORS.amber} ${pct(-0.22)},
    ${STAGE_COLORS.green} ${pct(-0.05)},
    ${STAGE_COLORS.green} ${pct(0.18)},
    ${STAGE_COLORS.amber} ${pct(0.3)},
    ${STAGE_COLORS.amber} 100%)`;

  return (
    <div data-testid="form-gauge" data-tour="form-gauge" style={{ marginTop: 18 }}>
      {header(
        <span data-testid="form-zone" style={{ color: colour, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {s.zone.label}
        </span>
      )}
      <div
        role="meter"
        aria-label="Form: fitness minus fatigue"
        aria-valuenow={Math.round(s.form)}
        aria-valuetext={`Form ${Math.round(s.form)}, ${s.zone.label}`}
        style={{ position: "relative", height: 14, borderRadius: 7, background: gradient, border: `1px solid ${COLORS.line}` }}
      >
        <div
          data-testid="form-marker"
          style={{ position: "absolute", left: pct(s.share), top: -4, bottom: -4, width: 3, marginLeft: -1.5, borderRadius: 2, background: COLORS.text, boxShadow: `0 0 0 1.5px ${COLORS.bg}` }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
        {[
          ["Fitness", s.fitness],
          ["Fatigue", s.fatigue],
          ["Form", s.form],
        ].map(([name, v]) => (
          <div key={name} style={{ flex: 1, textAlign: name === "Fitness" ? "left" : name === "Form" ? "right" : "center" }}>
            <div style={{ color: name === "Form" ? colour : COLORS.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
              {name === "Form" && v > 0 ? "+" : ""}{Math.round(v)}
            </div>
            <div style={{ color: COLORS.textDim, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>{name}</div>
          </div>
        ))}
      </div>
      {infoOpen && <FormInfo fitness={s.fitness} fatigue={s.fatigue} form={s.form} />}
    </div>
  );
}
