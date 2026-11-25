import * as engine from "../run/engine.js";

/* Pure step helpers for Run mode (no storage, no React).
   Engine steps: { kind: warmup|cooldown|steady|repeat, label, min|sec|km, pace, effort, walk }.
   A repeat: { kind: "repeat", times, work, rest }. */

/* ---------- workout steps ---------- */

// Seconds of one step (time, or distance x pace).
export function stepSeconds(x, fallbackPace = 390) {
  if (!x) return 0;
  if (x.min) return x.min * 60;
  if (x.sec) return x.sec;
  if (x.km) return x.km * (x.pace || x.estPace || fallbackPace);
  return 0;
}

const isWalkStep = (x) => !!(x && (x.walk || /walk/i.test(x.label || "")));

/* Intensity class of one step, for the ribbon colour and height:
   walk | easy | steady | hard | race. */
export function stepClass(x, role, workout) {
  if (isWalkStep(x)) return "walk";
  if (x.cls) return x.cls;
  if (role === "rest") return "walk";
  if (x.kind === "warmup" || x.kind === "cooldown") return "easy";
  const w = workout || {};
  if (role === "work") {
    if (w.type === "runwalk" || w.type === "strides" || w.type === "shakeout") return /stride/i.test(x.label || "") ? "hard" : "easy";
    return "hard";
  }
  if (/steady|finish|race pace|goal race/i.test(x.label || "")) return "steady";
  if (w.intensity === "race") return "race";
  if (w.intensity === "hard") return /threshold/i.test(x.label || "") ? "hard" : "steady";
  return "easy";
}

/* Flat list of segments from engine steps:
   [{ label, sec, km, pace, by: 'time'|'dist', cls, role, rep, reps, start, end, step }]
   `start` and `end` are planned seconds from the start. */
export function flattenSteps(workout, fallbackPace = 390) {
  const steps = (workout && workout.steps) || [];
  const out = [];
  let t = 0;
  const push = (x, role, rep, reps) => {
    const sec = stepSeconds(x, fallbackPace);
    const by = x.km && !x.min && !x.sec ? "dist" : "time";
    out.push({ label: x.label || "Run", sec, km: x.km || null, pace: x.pace || null, estPace: x.estPace || null, effort: x.effort || null, by, cls: stepClass(x, role, workout), role, rep, reps, start: t, end: t + sec, walk: isWalkStep(x), step: x });
    t += sec;
  };
  for (const s of steps) {
    if (s.kind === "repeat") {
      for (let i = 1; i <= s.times; i++) {
        push(s.work, "work", i, s.times);
        if (s.rest) push(s.rest, "rest", i, s.times);
      }
    } else push(s, s.kind || "steady", null, null);
  }
  return out;
}

export const totalSeconds = (segs) => (segs.length ? segs[segs.length - 1].end : 0);

export const durText = (sec) => {
  if (!sec) return "";
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = sec / 60;
  return Number.isInteger(m) ? `${m} min` : `${Math.floor(m)} min ${Math.round(sec % 60)} s`;
};

/* One line for each step, for the Today card.
   showPace false gives effort words, true gives target paces. */
export function stepLines(workout, units, showPace) {
  const steps = (workout && workout.steps) || [];
  const amount = (x) => (x.km ? engine.fmtKm(x.km, units) : durText(stepSeconds(x)));
  const target = (x) => {
    if (isWalkStep(x)) return "brisk walk";
    if (showPace && x.pace) return engine.fmtPace(x.pace, units);
    if (showPace && x.paceLo && x.paceHi) return `${engine.fmtPace(x.paceLo, units)} to ${engine.fmtPace(x.paceHi, units)}`;
    return x.effort || "";
  };
  return steps.map((s) => {
    if (s.kind === "repeat") {
      const w = `${s.times} × ${s.work.label} ${amount(s.work)}`;
      const wt = target(s.work);
      const r = s.rest ? `${s.rest.label.toLowerCase()} ${amount(s.rest)}${showPace && s.rest.pace && !isWalkStep(s.rest) ? ` (${engine.fmtPace(s.rest.pace, units)})` : ""}` : "";
      return `${w}${wt ? ` at ${wt}` : ""}${r ? `, ${r}` : ""}`;
    }
    const tt = target(s);
    return `${s.label} ${amount(s)}${tt ? ` · ${tt}` : ""}`;
  });
}

/* A copy of the workout for the recorder: in Simple mode the voice says
   effort words, not paces. */
export function workoutForVoice(workout, showPace) {
  if (!workout) return null;
  return { ...workout, showPace: !!(showPace && workout.showPace !== false) };
}

/* ---------- run/walk ---------- */

export function runWalkWorkout(level, reps) {
  const rw = engine.runWalk(level);
  const walkPace = engine.WALK_PACE;
  const runEffort = "Run slowly enough to talk.";
  const main = rw.continuous
    ? [{ kind: "steady", label: "Run", sec: rw.run, effort: runEffort, estPace: 450 }]
    : [{ kind: "repeat", times: Math.max(1, reps || Math.round((20 * 60) / (rw.run + rw.walk))), work: { label: "Run", sec: rw.run, effort: runEffort, estPace: 450 }, rest: { label: "Walk", sec: rw.walk, pace: walkPace, walk: true } }];
  const steps = [{ kind: "warmup", label: "Brisk walk", min: 5, pace: walkPace, walk: true }, ...main, { kind: "cooldown", label: "Walk", min: 5, pace: walkPace, walk: true }];
  const title = rw.continuous ? `Run ${Math.round(rw.run / 60)} min without a stop` : `Run/walk: run ${durText(rw.run)}, walk ${durText(rw.walk)}`;
  return { id: `rw-${rw.level}`, type: "runwalk", intensity: "easy", title, steps, showPace: false, effortText: "Run slowly enough to talk. Walk briskly.", runWalk: rw };
}

export function runWalkLabel(level) {
  const rw = engine.runWalk(level);
  return rw.continuous ? `Level ${rw.level}: run ${Math.round(rw.run / 60)} min` : `Level ${rw.level}: run ${durText(rw.run)}, walk ${durText(rw.walk)}`;
}

/* ---------- builder workouts ---------- */

/* Builder draft -> engine-style workout.
   draft: { name, warmMin, coolMin, blocks: [{ times, work: {by, value, target: 'pace'|'effort', paceLo, paceHi, effort}, rest: {by, value} }] }
   value is minutes (time) or km (distance). Paces are sec per km. */
export function builderToWorkout(draft, plan) {
  const d = draft || {};
  const p = (plan && plan.paces) || null;
  const easy = p ? p.easyHi : 400;
  const hardEst = p ? p.threshold : 330;
  const steps = [];
  const mk = (part, label, est, cls) => {
    const st = { label, cls };
    if (part.by === "dist") st.km = Number(part.value) || 0.4;
    else st.sec = Math.round((Number(part.value) || 1) * 60);
    if (part.target === "pace" && Number(part.paceLo) > 0 && Number(part.paceHi) > 0) {
      st.paceLo = Math.min(part.paceLo, part.paceHi);
      st.paceHi = Math.max(part.paceLo, part.paceHi);
      st.pace = (st.paceLo + st.paceHi) / 2;
    } else {
      st.effort = part.effort || (cls === "hard" ? "Hard: you can say a few words only." : "Easy jog.");
      st.estPace = est;
    }
    return st;
  };
  if (Number(d.warmMin) > 0) steps.push({ kind: "warmup", label: "Warm up", min: Number(d.warmMin), effort: "Easy: slow enough to talk.", estPace: easy, cls: "easy" });
  for (const b of d.blocks || []) {
    const times = Math.max(1, Math.round(Number(b.times) || 1));
    const work = mk(b.work || {}, "Hard", hardEst, "hard");
    const rest = b.rest && Number(b.rest.value) > 0 ? mk({ ...b.rest, target: "effort", effort: "Easy jog or walk." }, "Recover", easy, "walk") : null;
    steps.push({ kind: "repeat", times, work, rest });
  }
  if (Number(d.coolMin) > 0) steps.push({ kind: "cooldown", label: "Cool down", min: Number(d.coolMin), effort: "Easy: slow enough to talk.", estPace: easy, cls: "easy" });
  return { id: d.id || "custom", type: "custom", intensity: "hard", title: d.name || "My workout", steps, showPace: steps.some((s) => s.pace || (s.work && s.work.pace)), effortText: "Follow the targets for each step.", custom: true };
}

/* Engine-style steps -> the step format of shared/export.js workoutToFit. */
export function stepsToFitSteps(steps) {
  const one = (x, type) => {
    const st = { type, name: (x.label || "").slice(0, 15) };
    if (x.km && !x.min && !x.sec) st.m = Math.round(x.km * 1000);
    else st.sec = Math.round(stepSeconds(x));
    if (x.paceLo && x.paceHi) st.pace = { fast: Math.round(x.paceLo), slow: Math.round(x.paceHi) };
    else if (x.pace && !x.walk && !/walk/i.test(x.label || "")) st.pace = { fast: Math.round(x.pace) - 5, slow: Math.round(x.pace) + 5 };
    return st;
  };
  return (steps || []).map((s) => {
    if (s.kind === "repeat") return { repeat: s.times, steps: [one(s.work, "interval"), ...(s.rest ? [one(s.rest, "recover")] : [])] };
    return one(s, s.kind === "warmup" ? "warmup" : s.kind === "cooldown" ? "cooldown" : "run");
  });
}

