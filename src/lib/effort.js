/* ---------------------------------------------------------------
   EFFORT — REPS IN RESERVE, OR RPE

   Weight and reps alone cannot tell a set taken to failure from one that
   stopped four short, and those two cost wildly different amounts of
   recovery. One tap per set is the cheapest way to capture that, on
   whichever of the two scales the lifter already thinks in.

   It feeds the readiness map. A muscle trained to failure genuinely needs
   longer than one worked comfortably, so the session's hardest set picks
   which recovery window that muscle is on — see RECOVERY_WINDOWS, where
   every muscle has one figure for failure work and one for work with a
   buffer.
--------------------------------------------------------------- */

export const RIR_OPTIONS = [
  { value: 0, label: "0", desc: "To failure" },
  { value: 1, label: "1", desc: "1 left" },
  { value: 2, label: "2", desc: "2 left" },
  { value: 3, label: "3+", desc: "3 or more left" },
];

/* RPE is the same measurement counted from the other end: RPE = 10 − RIR.
   A set with two reps left is an RPE 8 and a 2 RIR, and no lifter means
   anything different by the two.

   So the choice is a display, not a second field. Sets keep storing `rir`
   whichever scale is on screen, which is what makes it safe: the readiness
   map, every backup ever exported, and a year of already-logged history all
   keep working, switching scales mid-programme loses nothing, and a lifter
   who logs in RPE can hand their file to one who reads RIR.

   Below 8 the scale stops being useful for hypertrophy work and RPE users
   stop distinguishing, so 3+ RIR is shown as "≤7" rather than pretending to
   a precision the tap never had. The order is reversed because RPE is read
   upwards — 7 is easy, 10 is failure — while RIR counts down to nothing. */
export const RPE_OPTIONS = [
  { value: 3, label: "≤7", desc: "3 or more reps left" },
  { value: 2, label: "8", desc: "2 reps left" },
  { value: 1, label: "9", desc: "1 rep left" },
  { value: 0, label: "10", desc: "Max effort — nothing left" },
];

export const EFFORT_SCALES = [
  {
    value: "rir",
    name: "RIR",
    full: "Reps in Reserve",
    options: RIR_OPTIONS,
    desc: "How many reps you could still have done. 0 is failure.",
    sweep: "hardest to easiest",
  },
  {
    value: "rpe",
    name: "RPE",
    full: "Rate of Perceived Exertion",
    options: RPE_OPTIONS,
    desc: "How hard the set was, out of 10. 10 is failure.",
    sweep: "easiest to hardest",
  },
];

export function effortScaleOf(settings) {
  const key = (settings || {}).effortScale;
  return EFFORT_SCALES.find((s) => s.value === key) || EFFORT_SCALES[0];
}

// The label a stored effort value wears on the scale in use, or null when
// nothing was logged for that set.
export function effortLabel(value, scale) {
  if (value === null || value === undefined || value === "") return null;
  const opt = (scale || EFFORT_SCALES[0]).options.find((o) => o.value === Number(value));
  return opt || null;
}

// The lowest RIR logged across an exercise's sets, or null if none were.
// The hardest set is what sets the recovery cost, not an average — one
// all-out set among five easy ones still has to be paid for.
export function hardestRir(sets) {
  let lowest = null;
  for (const set of sets || []) {
    if (set && set.rir !== null && set.rir !== undefined && set.rir !== "") {
      const v = Number(set.rir);
      if (Number.isFinite(v) && (lowest === null || v < lowest)) lowest = v;
    }
  }
  return lowest;
}

// Which pair of columns in RECOVERY_WINDOWS applies. Unlogged effort reads
// as 2+ RIR: Simple Mode never asks, so assuming failure there would leave
// half the map red for people who never opted into tracking it.
export function wasHardEffort(sets) {
  const rir = hardestRir(sets);
  return rir !== null && rir <= 1;
}
