import { EXERCISES, SECONDARY_MUSCLES, ALL_EXERCISES_BY_ID, SHIPPED_EXERCISE_BY_ID, SHIPPED_SECONDARY_MUSCLES, SHIPPED_MUSCLE_BY_ID } from "../data/exercises.js";
import { muscleOfExerciseId } from "./exercises.js";
import { safeGet, safeSet } from "./storage.js";

export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Adds a user-created exercise to the live, in-memory exercise database (both
// EXERCISES[muscle] and the id lookup) so it's immediately selectable
// everywhere in the app, exactly like a built-in exercise.
export function registerCustomExercise(ex) {
  if (!EXERCISES[ex.muscle]) EXERCISES[ex.muscle] = [];
  const exists = EXERCISES[ex.muscle].some((e) => e.id === ex.id);
  if (!exists) EXERCISES[ex.muscle].push(ex);
  ALL_EXERCISES_BY_ID[ex.id] = ex;
  // A custom compound's indirect muscles go into the same table the built-in
  // ones use, rather than being read from the exercise object at each call
  // site. Everything downstream — the readiness map's partial fatigue, the
  // half-set credit in weekly volume — keys off SECONDARY_MUSCLES[id], so
  // registering here makes a custom exercise behave like a built-in one with
  // no changes anywhere else.
  if (Array.isArray(ex.secondary) && ex.secondary.length) {
    SECONDARY_MUSCLES[ex.id] = ex.secondary.filter((m) => m !== ex.muscle);
  }
}

// Loads any previously saved custom exercises from storage into the live
// database. Call once when the app mounts, before anything reads EXERCISES.
export async function loadCustomExercises() {
  const saved = (await safeGet("custom-exercises")) || [];
  saved.forEach(registerCustomExercise);
  return saved;
}

/* ---------------------------------------------------------------
   PAUSED / AVOIDED EXERCISES
   Paused exercises are excluded from automatic selection (tap-mode,
   Train Ready Muscles) but remain fully choosable by hand (specific-exercise
   picker, Add From Database mid-workout) — "don't auto-suggest this,"
   not "hide this."
--------------------------------------------------------------- */

export const PAUSED_EXERCISE_IDS = new Set();

export async function loadPausedExercises() {
  const saved = (await safeGet("paused-exercises")) || [];
  saved.forEach((id) => PAUSED_EXERCISE_IDS.add(id));
  return saved;
}

export async function togglePausedExercise(id) {
  if (PAUSED_EXERCISE_IDS.has(id)) PAUSED_EXERCISE_IDS.delete(id);
  else PAUSED_EXERCISE_IDS.add(id);
  await safeSet("paused-exercises", [...PAUSED_EXERCISE_IDS]);
}

/* ---------------------------------------------------------------
   EXERCISE LIBRARY CUSTOMIZATION
   Backs the Exercise Database screen. Two kinds of change are stored:

   - Removed exercises are hidden from every picker and from automatic
     selection. Built-in exercises live in a module constant and can't
     truly be deleted, so "remove" is a hide that stays reversible —
     history already logged against them is never touched.
   - A custom order per muscle. EXERCISES[muscle] order doubles as the
     priority ranking pickSmartForMuscle walks, so reordering here is
     what actually changes which exercises the app reaches for first.
--------------------------------------------------------------- */

export const HIDDEN_EXERCISE_IDS = new Set();

export async function loadHiddenExercises() {
  const saved = (await safeGet("hidden-exercises")) || [];
  saved.forEach((id) => HIDDEN_EXERCISE_IDS.add(id));
  return saved;
}

export async function setExerciseHidden(id, hidden) {
  if (hidden) HIDDEN_EXERCISE_IDS.add(id);
  else HIDDEN_EXERCISE_IDS.delete(id);
  await safeSet("hidden-exercises", [...HIDDEN_EXERCISE_IDS]);
}

// Every picker and the auto-selector read through this rather than
// EXERCISES[muscle] directly, so a removed exercise disappears everywhere
// at once.
export function visibleExercises(muscle) {
  return (EXERCISES[muscle] || []).filter((e) => !HIDDEN_EXERCISE_IDS.has(e.id));
}

// Reorders EXERCISES[muscle] in place to match a saved id order. Ids the
// save doesn't know about (a new built-in shipped in an app update, or a
// custom exercise added since) keep their relative order and land at the
// end, so an old save can never silently drop an exercise.
export function applyStoredOrder(muscle, orderedIds) {
  const list = EXERCISES[muscle];
  if (!list) return;
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  const known = [];
  const unknown = [];
  list.forEach((e) => (rank.has(e.id) ? known : unknown).push(e));
  known.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  EXERCISES[muscle] = [...known, ...unknown];
}

// Muscles whose ranking the user has deliberately rearranged with the arrows
// on the Exercise Database screen. Kept apart from "exercise-order" itself
// because that key is also rewritten whenever an exercise is added, deleted
// or edited — which is bookkeeping, not a preference, and must not be read as
// one. Only a press of the up/down arrows lands a muscle in here.
//
// It exists because two things the app promises can disagree. The priority
// table decides what an auto-built workout reaches for; the database screen
// promises that reordering a muscle changes what gets suggested first. Where
// someone has actually reordered a muscle, their ranking wins for it and the
// table stands aside.
export const MANUAL_ORDER_MUSCLES = new Set();

export async function loadManualOrderMuscles() {
  const saved = (await safeGet("exercise-order-manual")) || [];
  saved.forEach((m) => MANUAL_ORDER_MUSCLES.add(m));
  return saved;
}

export async function markMuscleManuallyOrdered(muscle) {
  if (!muscle || MANUAL_ORDER_MUSCLES.has(muscle)) return;
  MANUAL_ORDER_MUSCLES.add(muscle);
  await safeSet("exercise-order-manual", [...MANUAL_ORDER_MUSCLES]);
}

export async function loadExerciseOrder() {
  const saved = (await safeGet("exercise-order")) || {};
  Object.entries(saved).forEach(([muscle, ids]) => applyStoredOrder(muscle, ids));
  return saved;
}

export async function saveMuscleOrder(muscle) {
  const saved = (await safeGet("exercise-order")) || {};
  saved[muscle] = (EXERCISES[muscle] || []).map((e) => e.id);
  await safeSet("exercise-order", saved);
}

/* ---------------------------------------------------------------
   EDITING AN EXERCISE

   Before this, correcting an exercise meant deleting it and adding it
   back, which orphaned every set ever logged against it: history, PBs and
   charts all key off the id, and a re-add mints a new one.

   So an edit keeps the id and changes only the description hanging off it.
   Custom exercises are rewritten where they are stored. Built-ins cannot
   be — they live in a module constant — so their changes are kept as a
   sparse overlay under "exercise-edits" and reapplied at boot, which also
   makes reverting to the shipped values a matter of dropping the entry.

   Most of an edit needs nothing else done. Indirect muscles, the implement
   list, the cue and the type are all read live from the database at the
   point of use, so changing them applies to sessions logged years ago with
   no rewrite at all — add Traps to an exercise and last month's rows start
   counting toward them immediately.

   Name and primary muscle are the exceptions. Both are copied into each
   session as it is saved, so a session records what the exercise was called
   on the day. Those copies are what rewriteExerciseIdentity goes and fixes.
--------------------------------------------------------------- */

export const EXERCISE_EDITS = {};

// The fields an edit may change. The id is deliberately not among them: it
// is the identity every stored record hangs off, and changing it would be
// the delete-and-re-add this feature exists to avoid.
export const EDITABLE_FIELDS = ["name", "muscle", "type", "cue", "secondary"];

// Neither of the two fields an edit cares most about is actually on the
// exercise object. A built-in's indirect muscles live in SECONDARY_MUSCLES
// keyed by id, and its primary muscle is only implied by which EXERCISES
// bucket holds it — the shipped objects carry no muscle field at all.
// Read either one straight off the object and you get undefined, and saving
// that back would strip a hammer curl's forearms and file it under whatever
// muscle happened to be first in the list. So everything that reads or
// compares an exercise for editing goes through here, which resolves both
// and makes the two storage shapes look like one.
export function editableForm(ex, secondaryTable, muscleTable) {
  if (!ex) return null;
  const sec = secondaryTable || SECONDARY_MUSCLES;
  const mus = muscleTable || null;
  return {
    ...ex,
    muscle: ex.muscle || (mus ? mus[ex.id] : muscleOfExerciseId(ex.id)) || null,
    secondary: ex.secondary || sec[ex.id] || [],
  };
}

export function patchOf(base, next) {
  const patch = {};
  for (const f of EDITABLE_FIELDS) {
    const a = base[f];
    const b = next[f];
    const norm = (v) => JSON.stringify(v === undefined || v === null || (Array.isArray(v) && !v.length) ? null : v);
    if (norm(a) !== norm(b)) patch[f] = b;
  }
  return patch;
}

// Rebuilds the exercise from a patch and swaps the new object into both
// EXERCISES[muscle] and the id lookup, moving it between muscle buckets if
// the primary muscle changed. In memory only — the caller persists.
export function applyExercisePatch(id, patch) {
  const current = ALL_EXERCISES_BY_ID[id];
  if (!current) return null;
  const from = muscleOfExerciseId(id);
  const wasAt = from ? (EXERCISES[from] || []).findIndex((e) => e.id === id) : -1;
  const next = { ...current };
  for (const f of EDITABLE_FIELDS) {
    if (!(f in patch)) continue;
    if (patch[f] === undefined || patch[f] === null || (Array.isArray(patch[f]) && !patch[f].length)) delete next[f];
    else next[f] = patch[f];
  }
  const to = next.muscle || from;
  next.muscle = to;

  if (from && EXERCISES[from]) EXERCISES[from] = EXERCISES[from].filter((e) => e.id !== id);
  if (!EXERCISES[to]) EXERCISES[to] = [];
  // Land it back where it sat rather than at the bottom, so an edit that
  // does not move it leaves the priority ranking alone. A genuine move to
  // another muscle goes on the end of that muscle's list, which is where a
  // newly added exercise goes too.
  const at = from === to && wasAt >= 0 ? Math.min(wasAt, EXERCISES[to].length) : EXERCISES[to].length;
  EXERCISES[to].splice(at, 0, next);
  ALL_EXERCISES_BY_ID[id] = next;

  // Clearing every secondary has to delete the key, not write an empty
  // array — readiness and volume both test the array's contents, and a
  // built-in reverting to its shipped value needs the key gone first.
  const sec = (next.secondary || []).filter((m) => m !== to);
  if (sec.length) SECONDARY_MUSCLES[id] = sec;
  else delete SECONDARY_MUSCLES[id];

  return { from, to, exercise: next };
}

// Rewrites the copies of an exercise's name and muscle that were written
// into stored records at the time they were saved. Everything else about an
// exercise is looked up live, so this is the whole of what an edit has to
// chase down. Each key is only written if it actually changed.
export async function rewriteExerciseIdentity(id, name, muscle) {
  const fixList = (list) =>
    Array.isArray(list) ? list.map((e) => (e && e.id === id ? { ...e, ...(e.name !== undefined ? { name } : {}), ...(e.muscle !== undefined ? { muscle } : {}) } : e)) : list;
  const changed = (before, after) => JSON.stringify(before) !== JSON.stringify(after);

  const history = await safeGet("workout-history");
  if (Array.isArray(history)) {
    const next = history.map((s) => ({ ...s, exercises: fixList(s.exercises) }));
    if (changed(history, next)) await safeSet("workout-history", next);
  }

  const snapshot = await safeGet("in-progress-workout");
  if (snapshot && Array.isArray(snapshot.exercises)) {
    const next = { ...snapshot, exercises: fixList(snapshot.exercises) };
    if (changed(snapshot, next)) await safeSet("in-progress-workout", next);
  }

  const templates = await safeGet("templates");
  if (Array.isArray(templates)) {
    const next = templates.map((t) => ({ ...t, exercises: fixList(t.exercises) }));
    if (changed(templates, next)) await safeSet("templates", next);
  }

  const fixProgramme = (p) => (p && Array.isArray(p.days) ? { ...p, days: p.days.map((d) => ({ ...d, exercises: fixList(d.exercises) })) } : p);
  const active = await safeGet("active-programme");
  if (active) {
    const next = fixProgramme(active);
    if (changed(active, next)) await safeSet("active-programme", next);
  }
  const finished = await safeGet("finished-programmes");
  if (Array.isArray(finished)) {
    const next = finished.map(fixProgramme);
    if (changed(finished, next)) await safeSet("finished-programmes", next);
  }

  // A personal best carries the name it was set under, so a rename that
  // missed it would leave the PB screen disagreeing with everything else.
  const pb = await safeGet(`pb:${id}`);
  if (pb && pb.name !== undefined && pb.name !== name) await safeSet(`pb:${id}`, { ...pb, name });
}

// Keeps the saved priority ranking honest after an edit: the id leaves the
// muscle it came from and joins the one it moved to.
export async function reorderAfterMove(from, to) {
  if (from) await saveMuscleOrder(from);
  if (to && to !== from) await saveMuscleOrder(to);
}

export async function saveExerciseEdit(id, next) {
  const current = ALL_EXERCISES_BY_ID[id];
  if (!current) return;
  const patch = patchOf(editableForm(current), next);
  if (!Object.keys(patch).length) return;
  const result = applyExercisePatch(id, patch);
  if (!result) return;

  if (current.custom) {
    const saved = (await safeGet("custom-exercises")) || [];
    await safeSet("custom-exercises", saved.map((e) => (e.id === id ? { ...result.exercise } : e)));
  } else {
    // Overlay, not a rewrite. Accumulated against the shipped values rather
    // than the current ones, so a second edit does not depend on the first
    // still being applied when it is replayed at boot.
    EXERCISE_EDITS[id] = patchOf(
      editableForm(SHIPPED_EXERCISE_BY_ID[id] || current, SHIPPED_SECONDARY_MUSCLES, SHIPPED_MUSCLE_BY_ID),
      editableForm(result.exercise),
    );
    if (!Object.keys(EXERCISE_EDITS[id]).length) delete EXERCISE_EDITS[id];
    await safeSet("exercise-edits", EXERCISE_EDITS);
  }

  await reorderAfterMove(result.from, result.to);
  await rewriteExerciseIdentity(id, result.exercise.name, result.exercise.muscle);
}

// Built-ins only. Puts the shipped name, muscle, type, cue and indirect
// muscles back, and takes the history with it — a revert is just an edit
// whose target happens to be what the app came with.
export async function revertExerciseEdit(id) {
  const shipped = SHIPPED_EXERCISE_BY_ID[id];
  if (!shipped) return;
  delete EXERCISE_EDITS[id];
  await safeSet("exercise-edits", EXERCISE_EDITS);
  const shippedMuscle = SHIPPED_MUSCLE_BY_ID[id] || muscleOfExerciseId(id);
  const result = applyExercisePatch(id, {
    name: shipped.name,
    muscle: shippedMuscle,
    type: shipped.type,
    cue: shipped.cue,
    secondary: SHIPPED_SECONDARY_MUSCLES[id] || null,
  });
  if (!result) return;
  await reorderAfterMove(result.from, result.to);
  await rewriteExerciseIdentity(id, shipped.name, shippedMuscle);
}

export function isEdited(id) {
  return Object.prototype.hasOwnProperty.call(EXERCISE_EDITS, id);
}

// Replays stored edits into the live database. Runs after custom exercises
// are registered, so an edit to one of those is applied to the entry it
// belongs to rather than to nothing.
export async function loadExerciseEdits() {
  const saved = (await safeGet("exercise-edits")) || {};
  Object.entries(saved).forEach(([id, patch]) => {
    if (!ALL_EXERCISES_BY_ID[id] || !patch || typeof patch !== "object") return;
    EXERCISE_EDITS[id] = patch;
    applyExercisePatch(id, patch);
  });
  return EXERCISE_EDITS;
}

// Custom exercises are the only ones that can be deleted outright, since
// nothing in the shipped database depends on them existing.
export async function deleteCustomExercise(id, muscle) {
  if (EXERCISES[muscle]) EXERCISES[muscle] = EXERCISES[muscle].filter((e) => e.id !== id);
  delete ALL_EXERCISES_BY_ID[id];
  const prev = (await safeGet("custom-exercises")) || [];
  await safeSet("custom-exercises", prev.filter((e) => e.id !== id));
  await saveMuscleOrder(muscle);
}
