import { getTopSet } from "./history.js";
import { safeGet } from "./storage.js";

/* ---------------------------------------------------------------
   PERSONAL RECORDS
--------------------------------------------------------------- */

// The "big lift" exercise ids that track a stored PB, used to seed 1RM
// estimates and progress milestones.
export const PB_EXERCISE_IDS = ["bench-press", "pull-ups", "dips", "overhead-press", "deadlift", "squat"];

// A set beats a stored PB if it's a heavier weight, or ties the weight with more reps.
export function beatsRecord(candidate, stored) {
  if (!candidate) return false;
  if (!stored) return true;
  const w = parseFloat(candidate.weight) || 0;
  const sw = parseFloat(stored.weight) || 0;
  if (w > sw) return true;
  if (w === sw && (parseFloat(candidate.reps) || 0) > (parseFloat(stored.reps) || 0)) return true;
  return false;
}
export function bodyWeightPct(weight, bw) {
  const w = parseFloat(weight);
  if (!w || !bw) return null;
  return Math.round((w / bw) * 100);
}

/* ---------------------------------------------------------------
   ONE-REP MAX GOALS
   Weighted lifts use the Epley formula and an NSCA-style progressive
   warm-up ramp (50/70/85/92% before the attempt, resting longer as
   intensity climbs). Pull-Ups and Dips are tracked by bodyweight reps,
   not added load, per how they're actually trained.
--------------------------------------------------------------- */

// Assisted variants belong here too: their "weight" is how much load is
// taken off you, so more of it means a weaker lift. Running that through
// the Epley formula would read backwards, whereas max reps stays honest.
export const BODYWEIGHT_LIFT_IDS = ["pull-ups", "dips"];

// Epley formula: a standard, widely-cited way to estimate 1RM from a
// submaximal set. Most reliable within ~1-10 reps of true failure.
export function estimateOneRM(weight, reps) {
  const w = parseFloat(weight);
  const r = parseFloat(reps);
  if (!w || !r) return null;
  return Math.round(w * (1 + r / 30));
}

export function roundToPlate(weight, unit) {
  const increment = unit === "kg" ? 2.5 : 5;
  return Math.max(increment, Math.round(weight / increment) * increment);
}

// Best current estimate for a lift: a manually logged 1RM if the person has
// entered one (an exact real number beats a formula guess), otherwise the
// stored PB if one exists, otherwise derived from the most recent session's
// top set. Bodyweight lifts use max reps directly — no load math needed.
// Returns { value, isManual, date } so the UI can show whether a number is a
// logged fact or an estimate.
export async function getCurrentEstimate(exerciseId) {
  const manual = await safeGet(`manual-1rm:${exerciseId}`);
  if (manual && manual.value) return { value: manual.value, isManual: true, date: manual.date };
  const isBodyweight = BODYWEIGHT_LIFT_IDS.includes(exerciseId);
  const pb = await safeGet(`pb:${exerciseId}`);
  if (isBodyweight) {
    if (pb && pb.reps) return { value: parseFloat(pb.reps), isManual: false };
    const hist = (await safeGet(`ex-history:${exerciseId}`)) || [];
    let best = 0;
    hist.forEach((h) => h.sets.forEach((s) => (best = Math.max(best, parseFloat(s.reps) || 0))));
    return { value: best || null, isManual: false };
  }
  if (pb && pb.weight && pb.reps) return { value: estimateOneRM(pb.weight, pb.reps), isManual: false };
  const hist = (await safeGet(`ex-history:${exerciseId}`)) || [];
  if (hist.length === 0) return { value: null, isManual: false };
  const latest = hist[hist.length - 1];
  const top = getTopSet(latest.sets);
  return { value: top ? estimateOneRM(top.weight, top.reps) : null, isManual: false };
}

// Rough weekly progression rates by training experience, drawn from general
// strength-training literature: novices see fast early gains (untrained
// lifters often add ~15-30% over 12 weeks), intermediates progress roughly
// monthly, advanced lifters see single-digit % gains per year. These are
// population averages, not a guarantee for any individual.
export const PROGRESSION_RATES = {
  beginner: { pctPerWeek: 0.01, repsPerWeek: 0.5 },
  intermediate: { pctPerWeek: 0.0035, repsPerWeek: 0.25 },
  advanced: { pctPerWeek: 0.0015, repsPerWeek: 0.125 },
};

export const TRAINING_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "< 1 year consistent training" },
  { value: "intermediate", label: "Intermediate", desc: "1-3 years consistent training" },
  { value: "advanced", label: "Advanced", desc: "3+ years consistent training" },
];

// Estimates how many weeks a target realistically needs from current, given
// training experience. Clamped to a sane 2-52 week range — outside that it
// stops being a useful weekly plan either way.
export function calculateWeeksNeeded(current, target, level, isBodyweight) {
  const rate = PROGRESSION_RATES[level] || PROGRESSION_RATES.intermediate;
  const diff = target - current;
  if (diff <= 0) return 2;
  const weeklyGain = isBodyweight ? rate.repsPerWeek : current * rate.pctPerWeek;
  const weeksNeeded = diff / Math.max(weeklyGain, 0.0001);
  return Math.min(52, Math.max(2, Math.ceil(weeksNeeded)));
}

// Linear ramp from current to target across N weeks. Deliberately simple —
// presented as a steady weekly progression, not a scientifically optimized
// periodization model.
export function buildProgressionJourney(current, target, weeks, isBodyweight, unit) {
  const milestones = [];
  const start = new Date();
  for (let w = 1; w <= weeks; w++) {
    const frac = w / weeks;
    let value = current + (target - current) * frac;
    value = isBodyweight ? Math.round(value) : roundToPlate(value, unit);
    const d = new Date(start);
    d.setDate(d.getDate() + w * 7);
    milestones.push({ week: w, date: d.toISOString().slice(0, 10), value });
  }
  return milestones;
}

// Which milestone applies right now, based on weeks elapsed since the goal was created.
export function currentMilestone(goal) {
  const weeksElapsed = Math.floor((Date.now() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7));
  const idx = Math.min(goal.milestones.length - 1, Math.max(0, weeksElapsed));
  return goal.milestones[idx];
}

// NSCA-style progressive ramp toward a single-rep attempt: ~50%/70%/85%/92%
// at descending reps, then the attempt itself, with rest increasing as
// intensity climbs.
export function buildOneRMRamp(target, isBodyweight, unit) {
  if (isBodyweight) {
    return [
      { label: "Warm-up 1", reps: Math.max(1, Math.round(target * 0.5)), rest: 90 },
      { label: "Warm-up 2", reps: Math.max(1, Math.round(target * 0.7)), rest: 120 },
      { label: "Attempt", reps: target, rest: null },
    ];
  }
  return [
    { label: "Warm-up 1", weight: roundToPlate(target * 0.5, unit), reps: 8, rest: 120 },
    { label: "Warm-up 2", weight: roundToPlate(target * 0.7, unit), reps: 3, rest: 150 },
    { label: "Warm-up 3", weight: roundToPlate(target * 0.85, unit), reps: 2, rest: 180 },
    { label: "Warm-up 4", weight: roundToPlate(target * 0.92, unit), reps: 1, rest: 240 },
    { label: "Attempt", weight: target, reps: 1, rest: null },
  ];
}

// Ramps up to the last top-set weight: 40% x8, 60% x5, 80% x3.
//
// The rounding step has to follow the load rather than sit at a fixed 5kg.
// A cable stack at 5.7kg used to round all three steps to 5kg and then floor
// them there, so the "warm-up" was three identical sets heavier than the
// working set. Steps now scale with the weight, nothing is suggested at or
// above the top set, and a ramp that collapses to fewer than two distinct
// steps is dropped — a lift that light has nothing to ramp through.
export function warmupSets(topWeight) {
  const w = parseFloat(topWeight);
  const scheme = [
    { pct: 40, reps: 8 },
    { pct: 60, reps: 5 },
    { pct: 80, reps: 3 },
  ];
  if (!w || w <= 0) {
    // No prior weight to base loads on — still give tickable ramp-up steps,
    // labelled by intensity rather than an exact number.
    return scheme.map((s) => ({ weight: `${s.pct}%`, reps: s.reps, placeholder: true }));
  }
  const step = w < 20 ? 0.5 : w < 60 ? 2.5 : 5;
  const seen = new Set();
  const out = [];
  for (const s of scheme) {
    const weight = Math.round((w * s.pct) / 100 / step) * step;
    if (weight <= 0 || weight >= w) continue;
    const label = String(Math.round(weight * 10) / 10);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ weight: label, reps: s.reps });
  }
  return out.length >= 2 ? out : [];
}
