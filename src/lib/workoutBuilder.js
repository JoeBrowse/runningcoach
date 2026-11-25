import { EXERCISES, ALL_EXERCISES_BY_ID, isHeavyExercise } from "../data/exercises.js";
import { SPLITS } from "../data/splits.js";
import { PAUSED_EXERCISE_IDS, HIDDEN_EXERCISE_IDS, visibleExercises, MANUAL_ORDER_MUSCLES } from "./exerciseLibrary.js";
import { muscleOfExerciseId, musclesHitBy } from "./exercises.js";

/* ---------------------------------------------------------------
   WORKOUT BUILDER
--------------------------------------------------------------- */

// Fisher-Yates shuffle — returns a new array, doesn't mutate the input.
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------------------------------
   SESSION PLAN
   Day builders pick one exercise at a time, and every fresh pick used to
   restart at the muscle's highest-ranked movement pattern. So a push day
   came back as bench press, dumbbell bench, machine press, overhead
   press, close-grip bench — five different exercises, one movement, and
   a miserable session. Triceps had the same problem in miniature,
   returning a pushdown and then another pushdown.

   A session plan is threaded through every pick in a day and fixes both:
   patterns already used in this session drop to the back of the priority
   order (so Triceps follows a pushdown with an overhead extension), and
   pressing movements get a hard cap on top of that.
--------------------------------------------------------------- */

export const PRESS_PATTERNS = new Set(["press", "press-incline", "press-overhead", "press-dip", "press-bodyweight"]);
export const MAX_PRESSES_PER_DAY = 3;
export const MAX_PRESSES_PER_MUSCLE = 2;

export function isPressPattern(pattern) {
  return PRESS_PATTERNS.has(pattern);
}
// heavyBudget caps how many DEMAND_HEAVY lifts the session may contain (see
// heavyBudgetFor). Left undefined it is unlimited, which is what a hand-built
// workout should be — the budget is there to stop the app from handing you
// five brutal lifts, not to stop you from choosing them.
export function makeSessionPlan(heavyBudget) {
  return {
    pressTotal: 0,
    pressByMuscle: {},
    usedPatterns: {},
    heavyUsed: 0,
    heavyBudget: heavyBudget === undefined ? Infinity : heavyBudget,
    // covered counts indirect work too; direct is only the muscles an
    // exercise was actually chosen for. The difference is what stops a
    // session's spare slots going to a second calf raise while another
    // muscle has had nothing of its own.
    covered: new Set(),
    direct: new Set(),
  };
}
export function canTakeHeavy(plan) {
  return plan.heavyUsed < plan.heavyBudget;
}
export function canTakePress(plan, muscle) {
  if (plan.pressTotal >= MAX_PRESSES_PER_DAY) return false;
  return (plan.pressByMuscle[muscle] || 0) < MAX_PRESSES_PER_MUSCLE;
}
// Pattern history is tracked per muscle, not globally: a bench press and an
// overhead press share the "press" pattern but are different movements, so
// Chest using it must not push Front Delts off its top-ranked lift. The global
// press cap is what stops the day filling up with presses.
export function patternUsedFor(plan, muscle, pattern) {
  return !!(plan.usedPatterns[muscle] && plan.usedPatterns[muscle].has(pattern));
}
export function recordPick(plan, muscle, pattern, ex) {
  if (!plan.usedPatterns[muscle]) plan.usedPatterns[muscle] = new Set();
  plan.usedPatterns[muscle].add(pattern);
  if (ex) {
    if (isHeavyExercise(ex)) plan.heavyUsed += 1;
    musclesHitBy(ex, muscle).forEach((m) => plan.covered.add(m));
    plan.direct.add(muscle);
  }
  if (!isPressPattern(pattern)) return;
  plan.pressTotal += 1;
  plan.pressByMuscle[muscle] = (plan.pressByMuscle[muscle] || 0) + 1;
}

// Picks `count` exercises for a muscle, prioritizing movement-pattern
// diversity (e.g. one horizontal pull + one vertical pull for Back, rather
// than three rows in a row). Falls back to dataset order — treated as an
// effectiveness ranking, big compound lifts listed first — unless
// randomize is on, in which case pattern order and picks within a pattern
// are shuffled instead. Pass a shared `plan` (see makeSessionPlan) to keep a
// whole session's picks varied rather than each pick independently reaching
// for the same top-ranked movement pattern.
export function pickSmartForMuscle(muscle, count, usedIds, randomize, typeFilter, plan) {
  let pool = visibleExercises(muscle).filter((e) => !usedIds.has(e.id) && !PAUSED_EXERCISE_IDS.has(e.id));
  if (typeFilter) pool = pool.filter((e) => e.type === typeFilter);
  if (plan) pool = pool.filter((e) => !isPressPattern(e.pattern) || canTakePress(plan, muscle));
  // Once the session's heavy lifts are spent, drop them from the pool — but
  // only if something is left to pick instead. A muscle whose every option is
  // heavy (Lower Back is deadlift and good-morning) would otherwise be
  // silently skipped, which is worse than one lift over budget.
  if (plan && !canTakeHeavy(plan)) {
    const lighter = pool.filter((e) => !isHeavyExercise(e));
    if (lighter.length) pool = lighter;
  }
  if (pool.length === 0 || count <= 0) return [];

  const groups = {};
  const order = [];
  pool.forEach((e) => {
    const key = e.pattern || e.type;
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(e);
  });

  let patternKeys = randomize ? shuffle(order) : order;
  if (randomize) {
    Object.keys(groups).forEach((key) => {
      groups[key] = shuffle(groups[key]);
    });
  }
  // Patterns this session has already used sink to the back, so consecutive
  // picks from one muscle vary the movement (pushdown then overhead
  // extension) instead of repeating it (pushdown then another pushdown).
  if (plan) {
    const fresh = patternKeys.filter((k) => !patternUsedFor(plan, muscle, k));
    const stale = patternKeys.filter((k) => patternUsedFor(plan, muscle, k));
    patternKeys = [...fresh, ...stale];
  }

  const picked = [];
  let round = 0;
  while (picked.length < count) {
    let addedThisRound = false;
    for (const key of patternKeys) {
      if (picked.length >= count) break;
      const candidate = groups[key][round];
      if (!candidate) continue;
      // Re-checked per pick (not just when building the pool) so a single
      // call asking for several exercises can't blow the day's press budget.
      if (plan && isPressPattern(candidate.pattern) && !canTakePress(plan, muscle)) continue;
      // Re-checked per pick for the same reason the press cap is: one call
      // asking for three exercises must not spend the whole day's budget.
      if (plan && isHeavyExercise(candidate) && !canTakeHeavy(plan) && groups[key].some((c, ci) => ci > round && !isHeavyExercise(c))) continue;
      if (plan) recordPick(plan, muscle, candidate.pattern || candidate.type, candidate);
      picked.push({ ...candidate, muscle });
      usedIds.add(candidate.id);
      addedThisRound = true;
    }
    if (!addedThisRound) break;
    round++;
  }
  return picked;
}

// selection is a { muscle: tapCount } map. Each tap on a muscle adds one more
// exercise for it. Picks favor movement-pattern diversity within a muscle
// (see pickSmartForMuscle). The final list is grouped compounds-first,
// isolation-last, regardless of tap order.
export function buildWorkout(split, selection, randomize) {
  const usedIds = new Set();
  const wanted = SPLITS[split].filter((m) => (selection[m] || 0) > 0);
  const total = wanted.reduce((a, m) => a + selection[m], 0);
  const plan = makeSessionPlan(heavyBudgetFor(total));

  // The priority table first, since these are chosen muscles and the table is
  // what says which lift each one should reach for.
  const fromTable = buildByPriority(wanted, selection, total, usedIds, plan, randomize);

  // Then anything it could not fill: muscles the table does not cover, or a
  // muscle tapped more times than the table has entries for.
  const fallback = [];
  for (const m of wanted) {
    const already = fromTable.filter((e) => e.muscle === m).length;
    const short = selection[m] - already;
    if (short > 0) fallback.push(...pickSmartForMuscle(m, short, usedIds, randomize, null, plan));
  }

  // The table's own order is the order the session should run in, so its
  // picks are left exactly as they came. Only the fallback needs arranging,
  // and it goes after — it is the accessory work by definition.
  return [...fromTable, ...staggerByMuscle(fallback)];
}

// Deals the list out one muscle at a time instead of finishing one muscle
// before starting the next. Asking for two Chest and one Back used to give
// bench, incline, pull-up — both chest lifts back to back, the second one
// done on a chest already cooked by the first. It now gives bench, pull-up,
// incline, which is the same work with a rest for each muscle built into the
// order of it.
//
// Order within a muscle is preserved exactly, so the ranking that decided
// which lifts to pick still decides which comes first.
export function staggerByMuscle(list) {
  const byMuscle = new Map();
  for (const e of list) {
    const key = e.muscle || "";
    if (!byMuscle.has(key)) byMuscle.set(key, []);
    byMuscle.get(key).push(e);
  }
  const queues = [...byMuscle.values()];
  const out = [];
  for (let round = 0; out.length < list.length; round++) {
    let addedThisRound = false;
    for (const q of queues) {
      if (q[round]) {
        out.push(q[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
  }
  return out;
}

// The house rule for what order a workout runs in: compounds while you are
// fresh, isolation after, and within each of those, muscles staggered rather
// than blocked together.
export function orderWorkout(list) {
  const compounds = list.filter((e) => e.type === "compound");
  const isolations = list.filter((e) => e.type !== "compound");
  return [...staggerByMuscle(compounds), ...staggerByMuscle(isolations)];
}

// Re-applies the ordering rule to an arbitrary list — used when an exercise
// is added mid-workout.
export function reorderByType(list) {
  return orderWorkout(list);
}

/* ---------------------------------------------------------------
   SUGGESTED WORKOUT
--------------------------------------------------------------- */

export const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60+ min" },
];
export const DURATION_EXERCISE_COUNTS = { 15: 3, 30: 5, 45: 6, 60: 8 };

// Round-robin across muscles picking one exercise of a given type at a time
// (pattern-aware via pickSmartForMuscle), so the result isn't dominated by
// whichever muscle happens to have the most exercises.
export function roundRobinPick(muscles, type, count, usedIds, randomize, plan) {
  const picked = [];
  const orderedMuscles = randomize ? shuffle(muscles) : muscles;
  let added = true;
  while (picked.length < count && added) {
    added = false;
    for (const m of orderedMuscles) {
      if (picked.length >= count) break;
      const next = pickSmartForMuscle(m, 1, usedIds, randomize, type, plan);
      if (next.length) {
        picked.push(next[0]);
        added = true;
      }
    }
  }
  return picked;
}

// Builds a workout from whichever muscles are most recovered right now.
//
// Two rules shape it beyond that. The session gets a heavy-lift budget so it
// can never come back as four brutal compounds in a row (see heavyBudgetFor),
// and the compounds are chosen for how much ground they cover between them
// rather than one muscle at a time. Isolation work then goes to whatever the
// compounds left untouched, which is what isolation work is for.
export function buildSuggestedWorkout(readyMuscles, exerciseCount, randomize) {
  const usedIds = new Set();
  const plan = makeSessionPlan(heavyBudgetFor(exerciseCount));

  // The table decides what gets picked and in what order. With every muscle
  // ready this is a whole-body session read straight across it; with four
  // muscles green it is the same walk over the families those muscles belong
  // to. Either way the heavy budget still applies.
  const fromTable = buildByPriority(readyMuscles, null, exerciseCount, usedIds, plan, randomize);

  // Whatever is left goes to muscles the table does not cover and to any the
  // session has not trained directly yet — calves, forearms, traps, shins.
  // Isolation first, because the table has already supplied the compounds.
  const fallback = [];
  const leastServed = () => [
    ...readyMuscles.filter((m) => !plan.direct.has(m)),
    ...readyMuscles.filter((m) => plan.direct.has(m)),
  ];
  const need = () => exerciseCount - fromTable.length - fallback.length;
  if (need() > 0) fallback.push(...roundRobinPick(leastServed(), "isolation", need(), usedIds, randomize, plan));
  if (need() > 0) fallback.push(...roundRobinPick(leastServed(), "compound", need(), usedIds, randomize, plan));

  return [...fromTable, ...staggerByMuscle(fallback)];
}

// selectedKeys is a Set of "Muscle:exerciseId" strings from the specific-exercise
// picker. Same final ordering rule as buildWorkout: compounds first, isolation last.
export function buildFromSpecificSelection(split, selectedKeys) {
  const picked = [];
  for (const m of SPLITS[split]) {
    for (const ex of EXERCISES[m] || []) {
      if (selectedKeys.has(`${m}:${ex.id}`)) {
        picked.push({ ...ex, muscle: m });
      }
    }
  }
  return orderWorkout(picked);
}

/* ---------------------------------------------------------------
   HOW MANY HEAVY LIFTS FIT IN ONE SESSION

   Three, and a session with fewer exercises than that is all of them.

   The cap does not scale with length, which is the opposite of what it looks
   like it should do. A quarter of an hour is squat, pull-up and dips and then
   you go home — nothing about being short of time makes a big lift the wrong
   choice, it makes the accessories the wrong choice. Length decides how much
   is added after the big lifts, not how many there are. Scaling the budget
   down for short sessions produced exactly the wrong thing: fifteen minutes
   came back as a squat and two isolation lifts.

   Three is where it sits because that is the top row of the priority table —
   the one heavy lift each in Legs, Back and Chest — and a fourth means a
   second heavy lift for a muscle that has already had one.
--------------------------------------------------------------- */

export const MAX_HEAVY_PER_SESSION = 3;

export function heavyBudgetFor(exerciseCount) {
  return Math.max(1, Math.min(MAX_HEAVY_PER_SESSION, exerciseCount || 1));
}

/* ---------------------------------------------------------------
   THE PRIORITY TABLE

   A hand-written ranking: seven families, each listing its exercises best
   first. It is the authority on what an auto-built workout reaches for.

   Read it the way it is built — across, then down. Rank one of every family
   in order is a whole-body session:

       Squat, Pull-Up, Dips, Lateral Raise, Curl, Pushdown, Hanging Leg Raise

   and a longer session carries on into rank two: RDL, Bent-Over Row, Incline
   Press, Reverse Fly, Hammer Curl, Overhead Extension, Cable Crunch. Because
   the families run largest to smallest, sweeping across them puts the big
   lifts first and the small ones last without anything having to sort it,
   and alternates the muscle worked at every step for free.

   Choosing specific muscles — a Push day, or Train Ready Muscles finding
   four muscles green — walks the same table with the families that do not
   apply left out. The ranking does not change; only which rows are in play.

   Exercises the table does not name (calves, shins, forearms, traps, glute
   accessories) are not covered by it, and fall back to the per-muscle
   ranking in EXERCISES the way everything did before.
--------------------------------------------------------------- */

export const PRIORITY_FAMILIES = [
  { name: "Legs", ranked: ["squat", "romanian-deadlift", "leg-press", "leg-curl", "leg-extension"] },
  { name: "Back", ranked: ["pull-ups", "bent-over-row", "deadlift", "lat-pulldown", "chest-supported-row"] },
  { name: "Chest", ranked: ["dips", "incline-press", "pec-deck", "bench-press", "push-up"] },
  { name: "Shoulders", ranked: ["lateral-raise", "reverse-fly"] },
  { name: "Biceps", ranked: ["cable-curl", "hammer-curl"] },
  { name: "Triceps", ranked: ["pushdown", "overhead-extension"] },
  { name: "Core", ranked: ["hanging-leg-raise", "cable-crunch"] },
];

export const PRIORITY_MAX_RANK = Math.max(...PRIORITY_FAMILIES.map((f) => f.ranked.length));

// Which muscle an entry in the table trains. Read live rather than written
// down, so an exercise the user has moved to another muscle stays correct.
export function priorityMuscleOf(id) {
  const ex = ALL_EXERCISES_BY_ID[id];
  if (!ex) return null;
  return ex.muscle || muscleOfExerciseId(id);
}

export function priorityAvailable(id, targetMuscles, usedIds) {
  const named = ALL_EXERCISES_BY_ID[id];
  if (!named) return null;
  const muscle = priorityMuscleOf(id);
  if (!muscle || !targetMuscles.has(muscle)) return null;

  // For a muscle the user has ranked themselves, the table still decides
  // *when* that muscle comes up in the session — its place among the families
  // is a training decision, not a preference — but their list decides which
  // exercise fills the slot. Substituting rather than skipping matters: skip
  // it and the muscle drops out of the workout altogether while the other
  // families quietly take its slots.
  if (MANUAL_ORDER_MUSCLES.has(muscle)) {
    const own = visibleExercises(muscle).find((e) => !usedIds.has(e.id) && !PAUSED_EXERCISE_IDS.has(e.id));
    return own ? { ...own, muscle } : null;
  }

  if (usedIds.has(id) || HIDDEN_EXERCISE_IDS.has(id) || PAUSED_EXERCISE_IDS.has(id)) return null;
  return { ...named, muscle };
}

// Walks the table across-then-down and returns what it picked, in the order
// it picked it. That order is the answer — it is not re-sorted afterwards,
// because the table already puts the session in the right shape.
//
// perMuscleCap limits how many exercises a single muscle may contribute,
// which is what the muscle-tap screen means by tapping Chest twice. Pass null
// for no cap.
//
// randomize offsets each family's starting rank by one, so asking again gives
// a different session without leaving the ranking — an RDL where the first
// pass gave a squat.
export function buildByPriority(targetMuscles, perMuscleCap, exerciseCount, usedIds, plan, randomize) {
  const target = new Set(targetMuscles);
  const taken = {};
  const out = [];
  const offsets = PRIORITY_FAMILIES.map((f) => (randomize && f.ranked.length > 1 ? Math.floor(Math.random() * 2) : 0));

  for (let step = 0; step < PRIORITY_MAX_RANK && out.length < exerciseCount; step++) {
    for (let fi = 0; fi < PRIORITY_FAMILIES.length; fi++) {
      if (out.length >= exerciseCount) break;
      const fam = PRIORITY_FAMILIES[fi];
      const rank = (step + offsets[fi]) % fam.ranked.length;
      const id = fam.ranked[rank];
      if (!id) continue;
      const ex = priorityAvailable(id, target, usedIds);
      if (!ex) continue;
      const cap = perMuscleCap ? perMuscleCap[ex.muscle] || 0 : Infinity;
      if ((taken[ex.muscle] || 0) >= cap) continue;
      // The fatiguing lifts are rationed the same way here as everywhere else;
      // over budget, the family's next entry gets the slot instead.
      if (isHeavyExercise(ex) && !canTakeHeavy(plan)) continue;
      recordPick(plan, ex.muscle, ex.pattern || ex.type, ex);
      usedIds.add(ex.id);
      taken[ex.muscle] = (taken[ex.muscle] || 0) + 1;
      out.push(ex);
    }
  }
  return out;
}
