import { useState, useEffect } from "react";
import { FRONT_MUSCLES, BACK_MUSCLES } from "body-muscles";
import { MUSCLE_GROUPS, recoveryStage, isIndirectOnly, hoursUntilReady, lastWorkedAt, trainedAgoLabel } from "../lib/recovery.js";
import { COLORS, STAGE_COLORS, STAGE_SHAPES, outlineColorFor, THEME, STAGE_LABELS, STAGE_LEGEND, NEUTRAL_BOX } from "../theme.js";

/* ---------------------------------------------------------------
   BODY MAP
   An anatomical figure, front + rear. Each coloured region maps to one
   muscle group and is shaded along the red -> yellow -> green readiness
   scale. Neutral (non-muscle) segments stay grey.
--------------------------------------------------------------- */

/* The figure comes from `body-muscles` (Apache 2.0, (c) 2024 Ivan Vulovic,
   https://github.com/vulovix/body-muscles) — a front and rear human split
   into 89 named regions. We take its path data only: its own BodyChart
   renderer builds the SVG imperatively and its palette is a 0..1 intensity
   gradient, neither of which fits a React tree painted in three flat
   readiness colours.

   BODY_REGIONS maps its region ids onto our sixteen groups. A group made of
   several bellies — three triceps and lat segments a side, six trapezius
   segments, three calf heads — fills and selects as one thing. Anything left
   unmapped (head, neck, hands, feet, knees, elbows, spine, adductors, hip
   flexors) draws in NEUTRAL, and that grey is what gives the figure its
   silhouette. */

const BODY_REGIONS = {};
Object.entries({
  Chest: ["chest-upper", "chest-lower"],
  Back: ["lats-upper", "lats-mid", "lats-lower"],
  "Lower Back": ["lower-back-erectors", "lower-back-ql"],
  "Front Delts": ["shoulder-front"],
  "Side Delts": ["shoulder-side"],
  "Rear Delts": ["deltoid-rear"],
  Traps: ["traps-upper", "traps-mid", "traps-lower"],
  Biceps: ["biceps"],
  Triceps: ["triceps-long", "triceps-lateral"],
  Forearms: ["forearm", "forearm-flexors", "forearm-extensors"],
  Core: ["abs-upper", "abs-lower", "obliques", "serratus-anterior"],
  Quads: ["quads"],
  Hamstrings: ["hamstrings-medial", "hamstrings-lateral"],
  Glutes: ["gluteus-maximus", "gluteus-medius"],
  Calves: ["calves-gastroc-medial", "calves-gastroc-lateral", "calves-soleus"],
  Shins: ["tibialis-anterior"],
  // Every region in the library is sided, so each stem covers a -left and a
  // -right id.
}).forEach(([group, stems]) => stems.forEach((stem) => {
  BODY_REGIONS[`${stem}-left`] = group;
  BODY_REGIONS[`${stem}-right`] = group;
}));

const toParts = (defs) => defs.map((m) => ({ key: m.id, d: m.path, muscle: BODY_REGIONS[m.id] }));
const BODY_FIGURE = { front: toParts(FRONT_MUSCLES), back: toParts(BACK_MUSCLES) };
// The rear view is drawn to the right of the front one in the library's own
// coordinate space, so it needs its own window onto the same canvas.
const BODY_VIEWBOX = { front: "0 0 35 93", back: "37 0 35 93" };

export function BodySide({ label, view, stages, selected, onSelect, fillFor, compact }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox={BODY_VIEWBOX[view]} style={{ width: "100%", maxWidth: compact ? 120 : 155 }}>
        {BODY_FIGURE[view].map((p) => {
          const isMuscle = !!p.muscle;
          const isSelected = isMuscle && selected === p.muscle;
            const stage = isMuscle ? stages[p.muscle] || "green" : null;
            // The outline is the channel that does not need colour vision:
            // a ring for recovering, a dashed ring for almost ready, none
            // for ready. Selection still overrides it, since knowing which
            // muscle you have tapped matters more for that instant.
            const shape = THEME.shapes && stage ? STAGE_SHAPES[stage] : null;
            return (
            <path
              key={p.key}
              d={p.d}
              data-muscle={p.muscle || undefined}
              data-stage={stage || undefined}
              fill={isMuscle ? (fillFor ? fillFor(p.muscle) : STAGE_COLORS[stage]) : NEUTRAL_BOX.value}
              stroke={
                isSelected
                  ? outlineColorFor(fillFor ? fillFor(p.muscle) : STAGE_COLORS[stage])
                  : shape && shape.width && !fillFor
                    ? outlineColorFor(STAGE_COLORS[stage])
                    : COLORS.bg
              }
              strokeWidth={isSelected ? 0.4 : shape ? shape.width : 0.12}
              strokeDasharray={!isSelected && shape && shape.dash ? shape.dash : undefined}
              strokeLinejoin="round"
              onClick={isMuscle ? () => onSelect(p.muscle) : undefined}
              style={isMuscle ? { cursor: "pointer" } : undefined}
            />
          );
        })}
      </svg>
      <div style={{ color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

export function BodyMap({ dates }) {
  const [selected, setSelected] = useState(null);
  // Bands are measured in hours, so the map has to move on its own — sitting
  // on Home should not freeze a muscle in red past the point it turned green.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const stages = {};
  MUSCLE_GROUPS.forEach((m) => {
    stages[m] = recoveryStage(dates[m], m);
  });

  const detail = (() => {
    if (!selected) return "Tap a muscle to see recovery detail.";
    const entry = dates[selected];
    if (!entry) return `${selected} — ready · no logged sessions`;
    const stage = recoveryStage(entry, selected);
    // "worked" rather than "trained" when nothing was aimed at this muscle —
    // being told your triceps need rest is confusing on a chest day otherwise.
    const indirect = isIndirectOnly(entry, selected);
    const verb = indirect ? "worked indirectly" : "trained";
    const ago = trainedAgoLabel(lastWorkedAt(entry));
    if (stage === "green") return `${selected} — ready · ${verb} ${ago}`;
    const left = hoursUntilReady(entry, selected);
    return `${selected} — ${STAGE_LABELS[stage]} · ${verb} ${ago} · ready in ${left}h`;
  })();

  return (
    <div>
      <div style={{ display: "flex", gap: 16 }}>
        <BodySide label="Front" view="front" stages={stages} selected={selected} onSelect={setSelected} />
        <BodySide label="Rear" view="back" stages={stages} selected={selected} onSelect={setSelected} />
      </div>
      {/* Three keyed swatches rather than a gradient bar: the fills are three
          flat colours now, so a blended scale would not describe them. */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, margin: "14px 0 12px", flexWrap: "wrap" }}>
        {STAGE_LEGEND.map(([s, text]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2.5, background: STAGE_COLORS[s] }} />
            <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{ color: COLORS.textDim, fontSize: 12.5, textAlign: "center", minHeight: 16 }}>{detail}</div>
    </div>
  );
}
