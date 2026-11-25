import { EXERCISES, SECONDARY_MUSCLES } from "../data/exercises.js";
import { activityType, HARD_ACTIVITY_RPE } from "./activities.js";
import { sessionTime, hoursSince } from "./dates.js";
import { wasHardEffort } from "./effort.js";
import { TRAINING } from "./settings.js";
import { safeGet } from "./storage.js";

/* ---------------------------------------------------------------
   RECOVERY MODEL

   Four numbers per muscle, not one. How long a muscle needs depends on
   two things the app already knows: whether the work was what the
   exercise was for or something it caught along the way, and how close
   to failure the hardest set went.

     direct   0-1 RIR   trained hard, taken to or near failure
     direct   2+  RIR   trained, with reps left in the tank
     indirect 0-1 RIR   a synergist in someone else's hard set
     indirect 2+  RIR   a synergist in a set with a buffer

   The limiter differs by muscle. The erectors carry axial load and the
   central-nervous cost that comes with it; quads and hamstrings take
   severe damage in the lengthened position; the small delts and the
   calves are mostly endurance fibre and clear fast. Hence a spread from
   96 hours down to 12.

   RIR comes from the hardest set of the session — the lowest number
   logged, not an average, because one all-out set among five easy ones
   still has to be paid for. Unlogged effort is read as 2+ RIR: it is the
   honest assumption for someone not tracking it, and Simple Mode never
   asks.

   The colour follows from how long is left, not from how long it has
   been — green once ready, amber inside the last day, red while more
   than a day remains. One rule everywhere, so amber always means
   "tomorrow".

   These are wall-clock hours, not calendar days — training at 8pm and
   coming back at midnight is four hours of recovery, not "the next day".
--------------------------------------------------------------- */

export const RECOVERY_WINDOWS = {
  // [direct 0-1 RIR, direct 2+ RIR, indirect 0-1 RIR, indirect 2+ RIR]
  "Lower Back": [96, 60, 48, 30], // erectors: axial load, high CNS cost
  Quads: [84, 54, 36, 24],
  Hamstrings: [84, 54, 36, 24],
  Glutes: [84, 54, 42, 24],
  Chest: [60, 42, 36, 20],
  Back: [60, 42, 36, 20], // lats
  Triceps: [60, 36, 30, 18],
  Biceps: [60, 36, 30, 18],
  Traps: [48, 36, 24, 16], // traps and rhomboids
  "Front Delts": [48, 30, 24, 12],
  "Side Delts": [36, 24, 18, 12],
  "Rear Delts": [36, 24, 18, 12],
  Forearms: [36, 24, 18, 12],
  Calves: [36, 24, 18, 12],
  Core: [36, 24, 18, 12],
  // Not in the source table. Tibialis is small, endurance-heavy and takes
  // no indirect work from anything else here, so it follows the calves.
  Shins: [36, 24, 18, 12],
};

// Amber is the last day before ready, whatever the muscle.
export const AMBER_LEAD_HOURS = 24;
// Only reached by a muscle with no window of its own, which the audit
// checks for; the middle of the table is the least wrong guess.
export const DEFAULT_RECOVERY_WINDOW = [60, 42, 36, 20];
// Ordered as the exercise database is, so every screen listing muscles
// lists them the same way.
export const MUSCLE_GROUPS = Object.keys(EXERCISES);

// Which of the four columns applies. `hard` means the hardest set went to
// 0 or 1 RIR; `direct` means the muscle was what the exercise was for.
export function recoveryHoursFor(muscle, direct, hard) {
  const w = RECOVERY_WINDOWS[muscle] || DEFAULT_RECOVERY_WINDOW;
  // The table's shape is the research — which muscles take longer, and how
  // much direct hard work costs over indirect easy work. How fast a given
  // body moves through it is not, so the pace scales the whole table rather
  // than letting anyone edit sixty numbers one at a time.
  return w[(direct ? 0 : 2) + (hard ? 0 : 1)] * TRAINING.recoveryPace;
}

/* Indirect work counts, but not as much.

   A muscle can be hit two ways in a session: it is what the exercise is
   for (primary), or it takes a real share of the load anyway (secondary,
   see SECONDARY_MUSCLES). Bench press leaves the chest properly worked
   and the triceps meaningfully tired, and treating those the same is
   wrong in both directions — the triceps are not fresh, but they are not
   as beaten up as they would be after a session built around them.

   The two indirect columns of RECOVERY_WINDOWS say how much less, per
   muscle, rather than applying one blanket fraction. Where both apply,
   whichever finishes last wins.

   Readiness entries are { primary, secondary }, each an epoch timestamp
   or null, each with a `Hard` flag for the effort that earned it. */

// Hours still to go before a muscle is ready, counting whichever kind of work
// finishes last. 0 once it is ready.
export function hoursLeftToReady(entry, muscle) {
  if (!entry) return 0;
  const left = [];
  if (entry.primary) left.push(recoveryHoursFor(muscle, true, entry.primaryHard) - hoursSince(entry.primary));
  if (entry.secondary) left.push(recoveryHoursFor(muscle, false, entry.secondaryHard) - hoursSince(entry.secondary));
  return Math.max(0, ...left);
}

// Progress toward fully recovered, 0-100, taking whichever kind of work is
// furthest from done. Used for ordering muscles by how fresh they are; the
// red/amber/green banding is recoveryStage() below.
export function readinessPercent(entry, muscle) {
  if (!entry) return 100;
  const ratios = [];
  const primaryHours = hoursSince(entry.primary);
  const secondaryHours = hoursSince(entry.secondary);
  if (primaryHours !== null) ratios.push(primaryHours / recoveryHoursFor(muscle, true, entry.primaryHard));
  if (secondaryHours !== null) ratios.push(secondaryHours / recoveryHoursFor(muscle, false, entry.secondaryHard));
  if (!ratios.length) return 100;
  return Math.max(0, Math.min(100, Math.round(Math.min(...ratios) * 100)));
}

export function recoveryStage(entry, muscle) {
  const left = hoursLeftToReady(entry, muscle);
  if (left <= 0) return "green";
  return left <= AMBER_LEAD_HOURS ? "amber" : "red";
}

// True when the only thing holding a muscle back is indirect work — worth
// saying out loud, because "your triceps are not ready" is confusing if you
// never trained triceps.
export function isIndirectOnly(entry, muscle) {
  if (!entry || !entry.secondary) return false;
  const primaryHours = hoursSince(entry.primary);
  const primaryDone = primaryHours === null || primaryHours >= recoveryHoursFor(muscle, true, entry.primaryHard);
  return primaryDone && hoursSince(entry.secondary) < recoveryHoursFor(muscle, false, entry.secondaryHard);
}

// Whole hours until a muscle turns green, or 0 once it has.
export function hoursUntilReady(entry, muscle) {
  return Math.ceil(hoursLeftToReady(entry, muscle));
}

// The most recent work of any kind, which is what "last trained" means to
// someone looking at the map.
export function lastWorkedAt(entry) {
  if (!entry) return null;
  return Math.max(entry.primary || 0, entry.secondary || 0) || null;
}

// "4h ago" / "2d ago" — hours while they are the number that matters, days
// once the count gets unwieldy.
export function trainedAgoLabel(at) {
  if (!at) return "never trained";
  const hours = hoursSince(at);
  if (hours < 1) return "just now";
  if (hours < 48) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Derives what each muscle has had done to it directly from workout-history
// rather than a separately-cached value. This is what makes deleting or
// editing a session immediately reflect in muscle readiness — there's no
// stale cache to go out of sync, since it's recomputed from the source of
// truth every time. Secondary muscles are looked up from the exercise id, so
// history logged before they existed picks them up with no migration.
export function computeMuscleLastMap(sessions, activities) {
  const map = {};
  // The effort flag is kept beside the timestamp it belongs to, so a
  // brutal session last week cannot go on stretching the window after an
  // easy one has replaced it as the most recent.
  const touch = (muscle, kind, at, hard) => {
    if (!muscle) return;
    const entry = (map[muscle] = map[muscle] || { primary: null, secondary: null, primaryHard: false, secondaryHard: false });
    if (!entry[kind] || at > entry[kind]) {
      entry[kind] = at;
      entry[kind === "primary" ? "primaryHard" : "secondaryHard"] = hard;
    }
  };
  for (const s of sessions || []) {
    const at = sessionTime(s);
    if (at === null) continue;
    for (const ex of s.exercises || []) {
      const hard = wasHardEffort(ex.sets);
      touch(ex.muscle, "primary", at, hard);
      // Same effort, but the indirect columns of the window table.
      for (const m of SECONDARY_MUSCLES[ex.id] || []) touch(m, "secondary", at, hard);
    }
  }
  // Runs, rides and walks land in the same map through the same door, so
  // a muscle shows whichever kind of work tired it most recently.
  for (const a of activities || []) {
    const at = sessionTime(a);
    if (at === null) continue;
    const type = activityType(a.type);
    const hard = Number(a.rpe) >= HARD_ACTIVITY_RPE;
    for (const m of type.primary) touch(m, "primary", at, hard);
    for (const m of type.secondary) touch(m, "secondary", at, hard);
  }
  return map;
}

// Every screen that draws readiness reads both halves of it, so the
// reading is made in one place rather than three that can drift apart.
export async function loadRecoveryMap() {
  const hist = (await safeGet("workout-history")) || [];
  const activities = (await safeGet("activity-history")) || [];
  return computeMuscleLastMap(hist, activities);
}
