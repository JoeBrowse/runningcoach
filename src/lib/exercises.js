import { EXERCISES, EXERCISE_ALIASES, SECONDARY_MUSCLES, CALISTHENIC_LOADING_BY_ID, EXERCISE_METHODS, MACHINE_METHODS, CABLE_GRIPS, CABLE_GRIPS_GENERIC, ALWAYS_CABLE_IDS, ALWAYS_MACHINE_IDS } from "../data/exercises.js";

// True when a query matches the exercise's name or any of its aliases. One
// place, so every search box behaves the same way.
export function exerciseMatchesQuery(ex, q) {
  const query = String(q || "").trim().toLowerCase();
  if (!query) return true;
  if (ex.name.toLowerCase().includes(query)) return true;
  return (EXERCISE_ALIASES[ex.id] || []).some((a) => a.includes(query));
}

// The loadings offered for a bodyweight movement, or null for everything
// else — which is also the test for whether an exercise is one of these.
export function loadingsFor(id) {
  return CALISTHENIC_LOADING_BY_ID[id] || null;
}

export function isCalisthenic(id) {
  return !!CALISTHENIC_LOADING_BY_ID[id];
}

/* Which of the three a logged set was, including for sessions recorded
   before the choice existed. Rather than migrating that history, the
   loading is inferred where it is missing: a weight on a bodyweight
   movement could only ever have meant added weight, and no weight could
   only have meant unloaded. That is right for every old row and needs no
   schema change. */
export function loadingOf(exId, method, weight) {
  const loadings = loadingsFor(exId);
  if (!loadings) return null;
  if (loadings.includes(method)) return method;
  const w = parseFloat(weight);
  return Number.isFinite(w) && w > 0 ? "Weighted" : "Bodyweight";
}

/* A set carrying no external load — blank, or a zero typed into a weight
   box on a movement that never needed one. Both mean the same thing and
   both should read as bodyweight: "0kg × 7" is not something anybody did. */
export function isUnloadedSet(weight) {
  if (weight === "" || weight === null || weight === undefined) return true;
  const w = parseFloat(weight);
  return Number.isFinite(w) && w <= 0;
}

/* One set as it reads in a summary line. */
export function formatSet(weight, reps, unit) {
  const r = reps || "–";
  return isUnloadedSet(weight) ? `BW×${r}` : `${weight}${unit}×${r}`;
}

/* Bodyweight in the unit the app is currently logging in.

   Set weights are stored as bare numbers in whatever settings.weightUnit
   was at the time, while the bodyweight record carries its own unit — so
   the two have to be reconciled before they can be added together. */
export function bodyweightIn(unit, record) {
  if (!record || !record.value) return null;
  const v = Number(record.value);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (!record.unit || record.unit === unit) return v;
  return record.unit === "lb" ? v * 0.453592 : v / 0.453592;
}

/* What the lifter actually moved, which is the only number a progression
   chart can honestly plot for these.

   An assisted pull-up at 30kg of assistance is not "30kg" — it is bodyweight
   minus 30, and getting stronger means that number going UP while the
   assistance comes down. Plotting the raw entry would show a beginner's
   progress running backwards. */
export function effectiveLoad(exId, method, weight, bodyweight) {
  const w = parseFloat(weight);
  if (!isCalisthenic(exId)) return Number.isFinite(w) ? w : null;
  if (!bodyweight) return null;
  const extra = Number.isFinite(w) ? Math.abs(w) : 0;
  const loading = loadingOf(exId, method, weight);
  if (loading === "Assisted") return Math.max(0, bodyweight - extra);
  if (loading === "Weighted") return bodyweight + extra;
  return bodyweight;
}

/* The bodyweight in force on a given date, from the weigh-in history.

   Today's figure is the wrong one to use for a session logged a year ago:
   a chart of pull-ups would then shift its whole history every time the
   scale moved, which is the opposite of what a progress chart is for.
   Before the first weigh-in, the earliest reading is the closest thing to
   the truth available. */
export function bodyweightOnOrBefore(dateStr, history, current, unit) {
  const list = (history || [])
    .filter((h) => h && h.date && h.value)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  let chosen = null;
  for (const h of list) {
    if (h.date <= dateStr) chosen = h;
    else break;
  }
  return bodyweightIn(unit, chosen || list[0] || current);
}

// The implements offered for an exercise, or an empty list where the
// movement only comes one way.
export function methodsFor(id) {
  return loadingsFor(id) || EXERCISE_METHODS[id] || [];
}

// First entry is the preferred one from the source table.
export function defaultMethodFor(id) {
  const list = methodsFor(id);
  return list.length ? list[0] : null;
}

export function hasMethodChoice(id) {
  return methodsFor(id).length > 1;
}

// Free text never enters here — methods come from a fixed list — but the
// comparison is normalised anyway so a value stored by an older build
// still matches.
export function normaliseMethod(method) {
  return typeof method === "string" ? method.trim().toLowerCase() : "";
}

// Whether an exercise is on a cable now depends mostly on how it is being
// loaded this session, which is more honest than the fixed list of exercise
// ids this replaces: a cable lateral raise wants a grip selector, the same
// movement with dumbbells does not.
export function isCableExercise(ex, method) {
  if (!ex) return false;
  if (ex.mechanism === "cable") return true; // custom exercises can opt in
  if (ALWAYS_CABLE_IDS.has(ex.id)) return true;
  const chosen = method || defaultMethodFor(ex.id);
  return chosen === "Cable";
}

export function getCableGrips(ex) {
  return CABLE_GRIPS[ex.id] || CABLE_GRIPS_GENERIC;
}

// True where the brand of the machine could meaningfully change how a given
// weight feels: cable stacks, fixed machines, and anything being done on a
// Smith or a plate-loaded machine this session. A barbell is a barbell
// everywhere, so it gets no brand field.
export function isMachineExercise(ex, method) {
  if (!ex) return false;
  if (ex.mechanism === "machine") return true; // custom exercises can opt in
  if (ALWAYS_MACHINE_IDS.has(ex.id)) return true;
  if (isCableExercise(ex, method)) return true;
  const chosen = method || defaultMethodFor(ex.id);
  return !!chosen && MACHINE_METHODS.has(chosen);
}

/* A YouTube search for how to perform a lift, rather than a curated video id.

   Three reasons it is a search and not a fixed link. A search never rots,
   where a specific video gets deleted or made private and leaves a dead
   button in the app. There is nothing to license, attribute or ship. And
   most importantly it follows the implement: barbell, dumbbell and Smith
   machine bench are genuinely different movements, so a single video per
   exercise id would be the wrong video for whichever one the lifter
   actually picked today. */
export function formVideoUrl(name, method) {
  // "Barbell" and the like read as noise on an exercise that is only ever
  // done one way, but the database only lists a method when there is a
  // real choice, so anything present here is worth searching for.
  const query = [method, name, "form"].filter(Boolean).join(" ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// Which group an exercise belongs to. Needed wherever a stored record has
// an id but a stale muscle name — the database is the authority, not the
// copy written into a session months ago.
export function muscleOfExerciseId(id) {
  for (const [muscle, list] of Object.entries(EXERCISES)) {
    if (list.some((e) => e.id === id)) return muscle;
  }
  return null;
}

// Every muscle group an exercise trains, direct and indirect.
export function musclesHitBy(ex, muscle) {
  const primary = muscle || ex.muscle || muscleOfExerciseId(ex.id);
  const out = new Set(SECONDARY_MUSCLES[ex.id] || []);
  if (primary) out.add(primary);
  return out;
}
