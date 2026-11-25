import { useState, useEffect, useCallback, useRef } from "react";
import { hexToRgba, COLORS } from "../theme.js";

/* ---------------------------------------------------------------
   THE OPENING

   Two and a bit seconds of geometry between the tap and the app.

   The shape is a real icosahedron: twelve vertices built from the
   golden ratio, and its thirty edges found by taking every pair of
   vertices exactly one edge-length apart rather than typing out a
   table of index pairs that nobody could check. It is rotated by
   actual rotation matrices and projected with a real perspective
   divide, so the spin reads as a solid turning in space rather than
   a picture being skewed.

   Then it comes apart. Every edge is cut loose with the velocity it
   had at the moment of the break — the cross product of the spin and
   the point's position, which is the velocity that point genuinely
   had — so the shatter flies the way the shape was moving instead of
   exploding evenly in all directions.

   What the fragments reassemble into is read off the wordmark itself:
   "SKID MARKS" is drawn once to an offscreen canvas in the app's own
   typeface and its pixels sampled, so the particles converge on the
   real letterforms at whatever size the phone is, and the sequence
   cannot drift out of step with the branding.

   Rules it obeys:
   - Tap anywhere to skip. Always. It is a flourish, not a gate.
   - prefers-reduced-motion gets a still frame and a short fade. An
     animation someone's system has asked not to see is not epic, it
     is rude.
   - It plays on the first launch only (Settings can turn it on for every
     launch), because the tenth time you open the app in
     a day is not the first.
   - It never blocks the app: the whole thing runs on one canvas over
     the top, the app is already mounted and interactive underneath,
     and a single rAF loop ends itself.
--------------------------------------------------------------- */

const PHI = (1 + Math.sqrt(5)) / 2;

// (0, ±1, ±φ) and its two cyclic rotations — the standard construction.
function icosahedronVertices() {
  const out = [];
  [-1, 1].forEach((a) => {
    [-PHI, PHI].forEach((b) => {
      out.push([0, a, b], [a, b, 0], [b, 0, a]);
    });
  });
  return out;
}

// In that construction every edge is exactly 2 long, and no non-edge pair is
// anywhere near it, so the edge list is a property of the vertices rather
// than a table to be trusted.
function icosahedronEdges(vertices) {
  const edges = [];
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const [ax, ay, az] = vertices[i];
      const [bx, by, bz] = vertices[j];
      const d = Math.hypot(ax - bx, ay - by, az - bz);
      if (Math.abs(d - 2) < 1e-6) edges.push([i, j]);
    }
  }
  return edges;
}

function rotatePoint([x, y, z], rx, ry) {
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const y1 = y * cx - z1 * sx;
  const z2 = y * sx + z1 * cx;
  return [x1, y1, z2];
}

// Sample the wordmark's own pixels. Drawn at the size it will appear, so the
// points are the letterforms rather than an approximation of them.
function sampleWordmark(text, width, height, font) {
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.round(width));
  off.height = Math.max(1, Math.round(height));
  const g = off.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  // Shrink to fit rather than overflow: a wordmark clipped at the edges of a
  // narrow phone is worse than a smaller one.
  let size = Math.min(height * 0.62, width / (text.length * 0.44));
  for (let i = 0; i < 8; i++) {
    g.font = `600 ${size}px ${font}`;
    if (g.measureText(text).width <= width * 0.84) break;
    size *= 0.9;
  }
  g.fillText(text, off.width / 2, off.height / 2);
  let data;
  try {
    data = g.getImageData(0, 0, off.width, off.height).data;
  } catch (e) {
    return [];
  }
  const points = [];
  const step = Math.max(2, Math.round(Math.min(off.width, off.height) / 90));
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 128) points.push([x, y]);
    }
  }
  return points;
}

function shuffleInPlace(list, seed) {
  let s = seed || 1;
  for (let i = list.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// Four movements, in milliseconds from the first frame.
const INTRO = {
  ignite: 420,    // a point, and the shockwave off it
  solid: 1180,    // the icosahedron, turning
  shatter: 1760,  // the edges cut loose
  forge: 2400,    // the fragments pulled into the wordmark
  hold: 2760,     // it stands...
  iris: 3180,     // ...and the screen opens on the app behind it
};
const INTRO_FADE = 200;

function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return false;
  }
}

// Once per launch, not once per render and not once per reload. A cold start
// of the app is a new webview, so sessionStorage is empty and it plays; coming
// back to a backgrounded app does not reload the page, so it does not replay
// every time you switch back from your music. The module flag covers React
// remounting the tree within one page.
const INTRO_SESSION_KEY = "iron-log:intro-played";
let INTRO_PLAYED = false;

export function introAlreadyPlayed() {
  if (INTRO_PLAYED) return true;
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function markIntroPlayed() {
  INTRO_PLAYED = true;
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
  } catch (e) {
    /* private mode, blocked storage: the module flag still holds for this page */
  }
}

export function OpeningSequence({ onDone }) {
  const canvasRef = useRef(null);
  const doneRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  // The hint goes before the screen opens, so it is not left sitting over the
  // app during the reveal.
  const [hint, setHint] = useState(true);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markIntroPlayed();
    setLeaving(true);
    setTimeout(() => onDone && onDone(), INTRO_FADE);
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) { finish(); return undefined; }

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const accent = COLORS.accent;
    const warm = (a) => hexToRgba(accent, a);

    const vertices = icosahedronVertices();
    const edges = icosahedronEdges(vertices);
    const radius = Math.min(w, h) * 0.17;

    // Where the fragments are going: the wordmark's own pixels, in the band
    // the finished mark occupies.
    const bandH = Math.min(h * 0.3, 190);
    const marks = sampleWordmark("SKID MARKS", w, bandH, "'Oswald', 'Arial Narrow', sans-serif");

    // Thin the sampled pixels by striding through them in scan order rather
    // than taking a random subset: a random subset of a letterform leaves
    // holes in it, and the whole point is that the word can be read. The
    // shuffle afterwards only decides which fragment flies to which point, so
    // the paths cross instead of the swarm folding neatly in on itself.
    const want = Math.min(900, Math.max(380, Math.round((w * h) / 620)));
    const stride = Math.max(1, Math.floor(marks.length / want));
    const chosen = marks.filter((_, i) => i % stride === 0).slice(0, want);
    shuffleInPlace(chosen, 7);
    const targets = chosen.map(([x, y]) => [x, cy - bandH / 2 + y]);

    // One fragment per target, so every sampled point of the word is filled.
    const count = Math.max(edges.length, targets.length);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const e = edges[i % edges.length];
      particles.push({
        a: vertices[e[0]], b: vertices[e[1]],
        lead: (i % 7) / 7,            // where along its edge the fragment sits
        x: cx, y: cy, vx: 0, vy: 0,
        tx: targets.length ? targets[i % targets.length][0] : cx,
        ty: targets.length ? targets[i % targets.length][1] : cy,
        seed: (i * 2654435761) % 1000 / 1000,
        size: 1 + ((i * 7) % 5) * 0.28,
      });
    }

    let raf = 0;
    const start = performance.now();

    function draw(now) {
      const t = now - start;

      // Reduced motion: the finished mark, held, then gone. No flight, no
      // flashing, no spin.
      if (reduced) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);
        const a = clamp01(t / 300);
        ctx.fillStyle = warm(a);
        particles.forEach((p) => ctx.fillRect(p.tx - 1, p.ty - 1, 2.2, 2.2));
        if (t > 700) { finish(); return; }
        raf = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // A lattice of hexagons turning against each other, far enough back to
      // read as depth rather than decoration. Up during the build, gone by
      // the time the word matters.
      const latticeIn = clamp01(t / 700);
      const latticeOut = 1 - clamp01((t - INTRO.shatter) / 700);
      const lattice = latticeIn * latticeOut * 0.55;
      if (lattice > 0.01) {
        for (let r = 0; r < 4; r++) {
          const base = (0.26 + r * 0.19) * Math.min(w, h);
          const rad = base * (0.94 + 0.06 * Math.sin(t / 820 + r * 1.3));
          const rot = (t / 3400) * (r % 2 ? -1 : 1) + r * 0.3;
          ctx.strokeStyle = warm(lattice * (0.12 - r * 0.02));
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const a = rot + (k / 6) * Math.PI * 2;
            const px = cx + Math.cos(a) * rad;
            const py = cy + Math.sin(a) * rad;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      // --- the shockwave off the first point
      if (t < INTRO.solid) {
        const k = clamp01(t / INTRO.ignite);
        const r = easeOutCubic(k) * Math.min(w, h) * 0.46;
        ctx.strokeStyle = warm((1 - k) * 0.5);
        ctx.lineWidth = 2.5 * (1 - k) + 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        const spark = (1 - k) * 9 + 1.5;
        ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k * 0.6)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, spark, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the solid, turning
      const spin = t / 1000;
      const rx = spin * 1.15;
      const ry = spin * 1.6;
      const grow = easeOutCubic(clamp01((t - INTRO.ignite * 0.5) / (INTRO.solid - INTRO.ignite * 0.5)));
      const breaking = clamp01((t - INTRO.solid) / (INTRO.shatter - INTRO.solid));

      if (t < INTRO.shatter) {
        const project = (v) => {
          const [x, y, z] = rotatePoint(v, rx, ry);
          const f = 3.2 / (3.2 - z * 0.42);
          return [cx + x * radius * grow * f, cy + y * radius * grow * f, z, f];
        };
        const pts = vertices.map(project);
        edges.forEach(([i, j], n) => {
          const A = pts[i];
          const B = pts[j];
          const depth = (A[2] + B[2]) / 4 + 0.5;
          // Edges let go one after another rather than all at once.
          const gone = clamp01((breaking - (n / edges.length) * 0.5) * 2);
          if (gone >= 1) return;
          ctx.strokeStyle = warm((0.25 + depth * 0.75) * (1 - gone) * Math.min(1, grow * 1.4));
          ctx.lineWidth = (0.6 + depth * 1.5) * A[3];
          ctx.beginPath();
          ctx.moveTo(A[0], A[1]);
          ctx.lineTo(B[0], B[1]);
          ctx.stroke();
        });
        pts.forEach(([x, y, z, f]) => {
          const depth = z / 4 + 0.5;
          ctx.fillStyle = `rgba(255,255,255,${(0.25 + depth * 0.6) * grow * (1 - breaking)})`;
          ctx.beginPath();
          ctx.arc(x, y, (1.1 + depth * 1.3) * f, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // --- the break itself: a ring off the shape and a flash across the glass
      if (t > INTRO.solid && t < INTRO.solid + 900) {
        const k = clamp01((t - INTRO.solid) / 900);
        ctx.strokeStyle = warm((1 - k) * 0.45);
        ctx.lineWidth = 3.5 * (1 - k) + 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + easeOutCubic(k) * Math.min(w, h) * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (t > INTRO.solid && t < INTRO.solid + 200) {
        // Light off the break, not a white sheet over the screen: additive
        // white across the whole frame lifts the background to grey and the
        // shot looks washed rather than struck.
        const k = clamp01((t - INTRO.solid) / 200);
        const reach = radius * (1 + k * 3.5);
        const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
        flash.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - k)})`);
        flash.addColorStop(0.45, warm(0.3 * (1 - k)));
        flash.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(cx, cy, reach, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the fragments: flung with the velocity they actually had, then
      //     pulled into the letterforms
      if (t >= INTRO.solid) {
        const flight = clamp01((t - INTRO.solid) / (INTRO.shatter - INTRO.solid));
        const pull = clamp01((t - INTRO.shatter) / (INTRO.forge - INTRO.shatter));
        particles.forEach((p, n) => {
          if (p.vx === 0 && p.vy === 0 && flight > (n / particles.length) * 0.5) {
            // Cut loose: position is a point along its edge, velocity is
            // omega x r — the real tangential velocity of that point on a
            // body spinning at this rate.
            const A = rotatePoint(p.a, rx, ry);
            const B = rotatePoint(p.b, rx, ry);
            const px = A[0] + (B[0] - A[0]) * p.lead;
            const py = A[1] + (B[1] - A[1]) * p.lead;
            const pz = A[2] + (B[2] - A[2]) * p.lead;
            const wx = 1.15, wy = 1.6; // the angular velocity used above
            const vx = wy * pz - 0 * py;
            const vy = 0 * px - wx * pz;
            p.x = cx + px * radius;
            p.y = cy + py * radius;
            p.vx = vx * radius * 0.016 + (p.seed - 0.5) * 1.6;
            p.vy = vy * radius * 0.016 + (p.seed - 0.5) * 1.6;
            p.born = t;
          }
          if (p.born === undefined) return;

          if (pull <= 0) {
            p.vx *= 0.985;
            p.vy *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
          } else {
            // A spring that stiffens as the sequence closes, so they arrive
            // together instead of straggling.
            const k = 0.006 + 0.05 * easeInCubic(pull);
            p.vx += (p.tx - p.x) * k;
            p.vy += (p.ty - p.y) * k;
            p.vx *= 0.9 - pull * 0.18;
            p.vy *= 0.9 - pull * 0.18;
            p.x += p.vx;
            p.y += p.vy;
          }

          const speed = Math.hypot(p.vx, p.vy);
          const heat = clamp01(speed / 7);
          const alpha = Math.min(1, 0.35 + pull * 0.65 + heat * 0.4);
          // Fast fragments streak; settled ones are points of light.
          if (speed > 1.2 && pull < 0.9) {
            ctx.strokeStyle = warm(alpha * 0.8);
            ctx.lineWidth = p.size * 0.9;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8);
            ctx.stroke();
          } else {
            const settled = pull > 0.72;
            const size = settled ? p.size + 1.3 : p.size;
            ctx.fillStyle = heat > 0.25 ? `rgba(255,255,255,${alpha})` : warm(alpha);
            ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
            if (settled) {
              // A second, softer pass so the letters glow rather than
              // looking like a grid of dots.
              ctx.fillStyle = warm(0.22 * easeOutCubic(clamp01((pull - 0.72) / 0.28)));
              ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
            }
          }
        });
      }

      // --- a bar of light sweeps the finished mark
      if (t > INTRO.forge - 260) {
        const k = clamp01((t - (INTRO.forge - 260)) / 520);
        const x = -w * 0.25 + easeOutCubic(k) * w * 1.5;
        const grad = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, `rgba(255,255,255,${0.5 * (1 - k)})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 90, cy - bandH / 2, 180, bandH);
      }

      ctx.globalCompositeOperation = "source-over";

      // The opening ends by opening: a hole cut in the canvas itself, growing
      // past the corners, with the live app already running behind it.
      if (t >= INTRO.hold) {
        const k = clamp01((t - INTRO.hold) / (INTRO.iris - INTRO.hold));
        const reach = Math.hypot(w, h) / 2;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(cx, cy, easeInCubic(k) * reach * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        // The rim of the hole catches the light as it goes.
        ctx.strokeStyle = warm((1 - k) * 0.6);
        ctx.lineWidth = 2.5 * (1 - k) + 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, easeInCubic(k) * reach * 1.05, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (t >= INTRO.iris) { finish(); return; }
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    const hintOff = setTimeout(() => setHint(false), INTRO.hold - 250);
    // However well it runs, it ends. A frozen rAF loop must not be able to
    // leave the app behind a black sheet.
    const failsafe = setTimeout(finish, INTRO.iris + 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
      clearTimeout(hintOff);
    };
  }, [finish]);

  return (
    <div
      data-testid="opening"
      onPointerDown={finish}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "transparent",
        opacity: leaving ? 0 : 1,
        transition: `opacity ${INTRO_FADE}ms ease-out`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: `calc(26px + env(safe-area-inset-bottom, 0px))`,
          textAlign: "center",
          color: COLORS.textDim,
          fontSize: 10.5,
          fontFamily: "'Oswald', sans-serif",
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: hint ? 0.6 : 0,
          transition: "opacity 220ms ease-out",
          pointerEvents: "none",
        }}
      >
        Tap to skip
      </div>
    </div>
  );
}
