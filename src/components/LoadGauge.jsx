import { useState, useRef } from "react";
import { Info } from "lucide-react";
import { HOUR_MS } from "../lib/dates.js";
import { QUOTED_RPE, hoursOfRestToReach, sessionLoadToReach, formatWhen, LOAD_SCALE_MAX, loadZone } from "../lib/load.js";
import { COLORS, STAGE_COLORS } from "../theme.js";

/* Training load, as a scale with a marker rather than a filling bar.

   A bar that fills says "more is worse", and that is not what the ratio
   means: too little is its own risk, and the target is a band in the
   middle. So the colour belongs to the scale and the marker says where
   on it you are — the same way a fuel gauge or a tuner reads.

   No advice line underneath. The zone is named, the marker is placed,
   and the numbers under the track say where the boundaries fall; a
   paragraph repeating that in words is just something to scroll past. */
/* What the scale is, behind a button rather than under the bar.

   The gauge itself says nothing in words on purpose, which only works if
   the words are somewhere. Terminology, the arithmetic behind both
   numbers, the zone boundaries and the papers they come from live here,
   one tap away and shut by default. */
const LOAD_SOURCES = [
  {
    cite: "Foster C. Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc, 1998.",
    what: "Session RPE: effort multiplied by duration gives one training load value.",
    url: "https://pubmed.ncbi.nlm.nih.gov/9662690/",
  },
  {
    cite: "Gabbett TJ. The training—injury prevention paradox. Br J Sports Med, 2016;50:273–280.",
    what: "The source of the zones on the scale.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26758673/",
  },
  {
    cite: "Williams S, West S, Cross MJ, Stokes KA. Better way to determine the acute:chronic workload ratio? Br J Sports Med, 2017;51:209–210.",
    what: "Exponentially weighted averages instead of rolling averages.",
    url: "https://pubmed.ncbi.nlm.nih.gov/28003238/",
  },
  {
    cite: "Lolli L, Batterham AM, Hawkins R, et al. Mathematical coupling causes spurious correlation within the conventional acute-to-chronic workload ratio calculations. Br J Sports Med, 2019;53:921–922.",
    what: "Why the ratio cannot predict injury. This is why the scale is information only.",
    url: "https://bjsm.bmj.com/content/53/15/921.full",
  },
];

function LoadGaugeInfo({ acute, chronic, ratio }) {
  const label = { color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 };
  const body = { color: COLORS.text, fontSize: 11.5, lineHeight: 1.5 };
  const dim = { color: COLORS.textDim, fontSize: 11, lineHeight: 1.5 };
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  return (
    <div data-testid="load-info" style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14, marginTop: 10 }}>
      <div style={label}>What this is</div>
      <div style={{ ...body, marginBottom: 14 }}>
        This scale compares your recent training with the training that your body is
        used to. Its name is the acute:chronic workload ratio.
      </div>

      <div style={label}>Information only</div>
      <div data-testid="load-info-only" style={{ ...body, marginBottom: 14 }}>
        This scale is information only. It cannot predict injury. Research disputes the
        ratio as an injury predictor. Use it together with how you feel. If something
        hurts, see a physio or a doctor.
      </div>

      <div style={label}>Your numbers</div>
      <div style={{ marginBottom: 14 }}>
        {[
          ["Acute", `${Math.round(acute)} AU`, "last 7 days, recent days count more"],
          ["Chronic", `${Math.round(chronic)} AU`, "last 28 days, same weighting"],
          ["Ratio", ratio.toFixed(2), "acute ÷ chronic"],
        ].map(([name, value, note]) => (
          <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
            <span style={{ ...body, width: 58, flexShrink: 0 }}>{name}</span>
            <span style={{ ...mono, color: COLORS.accent, fontSize: 12, width: 58, flexShrink: 0 }}>{value}</span>
            <span style={{ ...dim, flex: 1, minWidth: 0 }}>{note}</span>
          </div>
        ))}
      </div>

      <div style={label}>How the app calculates session load</div>
      <div style={{ ...dim, marginBottom: 14 }}>
        Session load is effort (out of 10) multiplied by minutes. The effort of a lift is
        the average effort of its logged sets. The effort of a set is 10 − RIR, so a set
        to failure is 10. The minutes come from the session timer. For a session that the
        app did not time, the app calculates the minutes from the sets and your rest times.
        A run already has effort and minutes. AU means arbitrary units. Compare this number
        only with your other sessions.
      </div>

      <div style={label}>The zones</div>
      <div style={{ marginBottom: 14 }}>
        {[
          ["under 0.8", "Low", "amber", "less than you are used to"],
          ["0.8 – 1.3", "Usual", "green", "close to what you are used to"],
          ["1.3 – 1.5", "Ramping up", "amber", "more than you are used to"],
          ["over 1.5", "Spike", "red", "a sharp increase. An easier day may help."],
        ].map(([range, name, stage, note]) => (
          <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: STAGE_COLORS[stage], flexShrink: 0, alignSelf: "center" }} />
            <span style={{ ...mono, color: COLORS.textDim, fontSize: 10.5, width: 58, flexShrink: 0 }}>{range}</span>
            <span style={{ ...body, width: 84, flexShrink: 0 }}>{name}</span>
            <span style={{ ...dim, flex: 1, minWidth: 0 }}>{note}</span>
          </div>
        ))}
      </div>

      <div style={label}>Drag the marker</div>
      <div style={{ ...dim, marginBottom: 14 }}>
        Drag down: the app shows how much rest gets you to that value. Only rest lowers
        the ratio. The ratio falls by the same factor each day, so the hours are exact,
        not estimates. Drag up: rest cannot raise the ratio. The app shows the session
        that gets you to that value. The app does not save the marker position.
      </div>

      <div style={label}>Papers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LOAD_SOURCES.map((src) => (
          <a
            key={src.url}
            href={src.url}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none", display: "block" }}
          >
            <span style={{ ...dim, display: "block", color: COLORS.accent }}>{src.what}</span>
            <span style={{ ...dim, display: "block", fontSize: 10.5 }}>{src.cite}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function LoadGauge({ ratio, ready, acute, chronic }) {
  // Where the marker is being dragged to, or null when it is just showing
  // where you are. A drag never changes anything — it lets go and snaps
  // back — so this is view state and nothing else.
  const [target, setTarget] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const trackRef = useRef(null);

  const pct = (v) => `${Math.max(0, Math.min(100, (v / LOAD_SCALE_MAX) * 100))}%`;
  if (!ready) {
    return (
      <div data-tour="load-gauge" style={{ marginTop: 18 }}>
        <div style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>
          Training Load
          <span style={{ marginLeft: 6, letterSpacing: 0.5, textTransform: "none", opacity: 0.85 }}>· information only</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}` }} />
        <div style={{ color: COLORS.textDim, fontSize: 11.5, marginTop: 7 }}>
          The app needs a few weeks of training data. Then it can show this value.
        </div>
      </div>
    );
  }
  const zone = loadZone(ratio);
  const colour = STAGE_COLORS[zone.stage];
  const shown = target === null ? ratio : target;
  const shownZone = loadZone(shown);
  const shownColour = STAGE_COLORS[shownZone.stage];

  // Red where the ratio is dangerous at either end, green through the
  // sweet spot, amber over the shoulders between them.
  const gradient = `linear-gradient(to right,
    ${STAGE_COLORS.red} 0%,
    ${STAGE_COLORS.amber} ${pct(0.5)},
    ${STAGE_COLORS.green} ${pct(0.9)},
    ${STAGE_COLORS.green} ${pct(1.2)},
    ${STAGE_COLORS.amber} ${pct(1.4)},
    ${STAGE_COLORS.red} ${pct(1.7)},
    ${STAGE_COLORS.red} 100%)`;

  function ratioAt(clientX) {
    const box = trackRef.current && trackRef.current.getBoundingClientRect();
    if (!box || !box.width) return ratio;
    const share = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    return Math.round(share * LOAD_SCALE_MAX * 100) / 100;
  }
  const onDown = (e) => {
    // Capture, so a finger that slides off the track keeps dragging rather
    // than handing the gesture to the page underneath.
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    setTarget(ratioAt(e.clientX));
  };
  const onMove = (e) => {
    if (target === null) return;
    setTarget(ratioAt(e.clientX));
  };
  const onUp = () => setTarget(null);

  /* What the bubble says. Two different questions, decided by which way
     the marker was dragged, and each answered in the terms you would act
     on rather than in ratio arithmetic. */
  const readout = (() => {
    if (target === null) return null;
    if (Math.abs(target - ratio) < 0.02) return "where you are";
    if (target < ratio) {
      const exact = hoursOfRestToReach(ratio, target);
      if (exact === null || !Number.isFinite(exact)) return null;
      // Round once and build the clock time from the rounded figure, so the
      // two halves of the answer agree: "51h" pointing at a time 50.6 hours
      // away is the sort of thing someone checks and does not trust again.
      const hours = Math.round(exact);
      const when = new Date(Date.now() + hours * HOUR_MS);
      return `rest ${hours}h · ${formatWhen(when)}`;
    }
    const load = sessionLoadToReach(acute, chronic, target);
    if (load === null) return "not in one session";
    const minutes = Math.round(load / QUOTED_RPE);
    if (minutes > 300) return "more than one session";
    return `train ${minutes} min @ RPE ${QUOTED_RPE} today`;
  })();

  return (
    <div data-tour="load-gauge" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
        <span style={{ color: COLORS.textDim, fontSize: 10.5, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Training Load
          <span data-testid="load-info-only-tag" style={{ marginLeft: 6, letterSpacing: 0.5, textTransform: "none", fontFamily: "inherit", opacity: 0.85 }}>· information only</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ color: colour, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {zone.label}
          </span>
          {/* The bar says nothing in words on purpose. This is where the
              words are: terminology, the arithmetic, and the papers. */}
          <button
            data-testid="load-info-btn"
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="What the training load numbers mean"
            aria-expanded={infoOpen}
            title="What these numbers mean"
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

      {/* The bubble exists only mid-drag, and sits above the track so a
          thumb is not covering the answer it is asking for. */}
      <div style={{ position: "relative", height: target === null ? 0 : 40, transition: "height 0.12s" }}>
        {target !== null && (
          <div
            data-testid="load-readout"
            style={{
              position: "absolute",
              bottom: 6,
              left: pct(shown),
              transform: `translateX(${shown < 0.4 ? "0" : shown > 1.6 ? "-100%" : "-50%"})`,
              background: COLORS.surfaceRaised,
              border: `1px solid ${shownColour}`,
              borderRadius: 10,
              padding: "5px 9px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
            }}
          >
            <span style={{ color: shownColour, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>
              {shown.toFixed(2)}
            </span>
            {readout && (
              <span style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, marginLeft: 7 }}>
                {readout}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        role="meter"
        aria-label="Acute to chronic training load ratio"
        aria-valuenow={Number(ratio.toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={LOAD_SCALE_MAX}
        aria-valuetext={`${ratio.toFixed(2)}, ${zone.label}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: "relative",
          height: 14,
          borderRadius: 7,
          background: gradient,
          border: `1px solid ${COLORS.line}`,
          // Without this a drag scrolls the page instead of moving the marker.
          touchAction: "none",
          cursor: "ew-resize",
          // Room to grab without making the bar itself fatter.
          padding: "10px 0",
          backgroundClip: "content-box",
          boxSizing: "content-box",
          marginTop: -10,
          marginBottom: -10,
          borderWidth: 0,
        }}
      >
        {/* Where you are. Drawn over the gradient with a dark core and a
            light outline so it stays visible on red, amber and green. */}
        <div
          data-testid="load-marker"
          style={{
            position: "absolute",
            left: pct(shown),
            top: 6,
            bottom: 6,
            width: 3,
            marginLeft: -1.5,
            borderRadius: 2,
            background: COLORS.text,
            boxShadow: `0 0 0 1.5px ${COLORS.bg}`,
          }}
        />
        {/* While dragging, a faint mark stays where you actually are, so the
            comparison the drag is asking for is still on screen. */}
        {target !== null && (
          <div
            data-testid="load-anchor"
            style={{
              position: "absolute",
              left: pct(ratio),
              top: 10,
              bottom: 10,
              width: 2,
              marginLeft: -1,
              borderRadius: 1,
              background: COLORS.bg,
              opacity: 0.75,
            }}
          />
        )}
      </div>
      {/* The scale, so the marker has something to be read against. */}
      <div style={{ position: "relative", height: 14, marginTop: 3 }}>
        {[0.8, 1.3, 1.5].map((t) => (
          <span
            key={t}
            style={{ position: "absolute", left: pct(t), transform: "translateX(-50%)", color: COLORS.textDim, fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {t}
          </span>
        ))}
        <span style={{ position: "absolute", right: 0, color: colour, fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>
          {ratio.toFixed(2)}
        </span>
      </div>
      {infoOpen && <LoadGaugeInfo acute={acute} chronic={chronic} ratio={ratio} />}
    </div>
  );
}
