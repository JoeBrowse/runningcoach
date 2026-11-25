import { EXERCISES, ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { LICENSE_KEY } from "./billing.js";
import { sortByAt } from "./dates.js";
import { methodsFor, muscleOfExerciseId } from "./exercises.js";
import { capHistory } from "./settings.js";
import { safeGet, safeSet, safeList, safeDelete } from "./storage.js";

/* ---------------------------------------------------------------
   SCHEMA VERSIONING / MIGRATIONS
   Every persisted key lives in durable storage (Capacitor Preferences on
   device — see capPrefs() above — which survives app updates/reinstalls
   of the same app, so this is the store an update can never wipe).
   "schema-version" tracks how many migrations have run. On launch,
   runMigrations() replays whichever migrations haven't executed yet, in
   order, so old data is upgraded in place instead of erased when a new
   version ships.

   Rules for every migration function:
   - Additive/normalizing only — add or default a field, never delete or
     overwrite an existing user record.
   - If it can't safely apply (unexpected shape, missing dependency), do
     nothing rather than guess and risk data loss.
   - Idempotent — safe to run more than once, since a partially-applied
     migration could in principle be retried after a failure.

   To ship a new migration: append one function to MIGRATIONS below.
   Nothing else needs to change — its version number is just its index.
--------------------------------------------------------------- */

export const MIGRATIONS = [
  // v0 -> v1: introduce the on-device license/trial record. Only creates
  // it if missing; never touches an existing trialStartedAt or purchased
  // flag, so replaying this (or upgrading again later) can't reset a
  // user's trial or silently un-purchase the app.
  async function migrateAddLicense() {
    const existing = await safeGet(LICENSE_KEY);
    if (!existing) {
      await safeSet(LICENSE_KEY, { trialStartedAt: new Date().toISOString(), purchased: false });
    }
  },
  // v1 -> v2: "Shoulders" split into "Front Delts" and "Side Delts".
  // Stored data records the muscle name on every logged exercise, on
  // programme days, on templates and as the key of the custom exercise
  // order, so all of it has to move or those entries stop matching any
  // muscle the app knows about — invisible in readiness, absent from the
  // volume screen. Exercise instances remap by id, which is exact; only
  // things with no id to look up need a default, and that is Front Delts,
  // where the pressing movements went.
  async function migrateSplitShoulders() {
    const OLD = "Shoulders";
    const SPLIT_INTO = ["Front Delts", "Side Delts"];
    const FALLBACK = "Front Delts";

    const muscleOfId = {};
    for (const [muscle, list] of Object.entries(EXERCISES)) {
      for (const e of list) if (!muscleOfId[e.id]) muscleOfId[e.id] = muscle;
    }
    const fixExercise = (ex) =>
      ex && ex.muscle === OLD ? { ...ex, muscle: muscleOfId[ex.id] || FALLBACK } : ex;
    const fixExercises = (list) => (Array.isArray(list) ? list.map(fixExercise) : list);
    const fixMuscleList = (list) =>
      Array.isArray(list) && list.includes(OLD)
        ? [...new Set(list.flatMap((m) => (m === OLD ? SPLIT_INTO : [m])))]
        : list;
    const fixProgramme = (prog) =>
      prog && Array.isArray(prog.days)
        ? { ...prog, days: prog.days.map((d) => ({ ...d, muscles: fixMuscleList(d.muscles), exercises: fixExercises(d.exercises) })) }
        : prog;

    const history = await safeGet("workout-history");
    if (Array.isArray(history)) {
      await safeSet("workout-history", history.map((sn) => ({ ...sn, exercises: fixExercises(sn.exercises) })));
    }

    const templates = await safeGet("templates");
    if (Array.isArray(templates)) {
      await safeSet(
        "templates",
        templates.map((t) => {
          const next = { ...t, exercises: fixExercises(t.exercises) };
          // A "tap" template stores a count per muscle. One count cannot be
          // split across two groups without inventing a number, so it goes
          // to the group that kept the compound presses.
          if (next.selection && next.selection[OLD] !== undefined) {
            const { [OLD]: count, ...rest } = next.selection;
            next.selection = { ...rest, [FALLBACK]: (rest[FALLBACK] || 0) + count };
          }
          return next;
        }),
      );
    }

    const active = await safeGet("active-programme");
    if (active) await safeSet("active-programme", fixProgramme(active));

    const finished = await safeGet("finished-programmes");
    if (Array.isArray(finished)) await safeSet("finished-programmes", finished.map(fixProgramme));

    const snapshot = await safeGet("in-progress-workout");
    if (snapshot && Array.isArray(snapshot.exercises)) {
      await safeSet("in-progress-workout", { ...snapshot, exercises: fixExercises(snapshot.exercises) });
    }

    const custom = await safeGet("custom-exercises");
    if (Array.isArray(custom)) {
      await safeSet("custom-exercises", custom.map((e) => (e.muscle === OLD ? { ...e, muscle: FALLBACK } : e)));
    }

    // The saved ordering is keyed by muscle. Deal the old list out to
    // whichever group each exercise now belongs to, keeping relative order,
    // so a ranking someone set by hand survives the split.
    const order = await safeGet("exercise-order");
    if (order && Array.isArray(order[OLD])) {
      const { [OLD]: ids, ...rest } = order;
      const next = { ...rest };
      for (const id of ids) {
        const muscle = muscleOfId[id] || FALLBACK;
        next[muscle] = [...(next[muscle] || []), id];
      }
      await safeSet("exercise-order", next);
    }
  },
  // v2 -> v3: the database was rebuilt around one entry per movement, with
  // the implement (barbell, dumbbell, Smith, machine, cable) recorded per
  // session instead of a separate exercise for each. Every id below is one
  // the old database had and the new one does not.
  //
  // Each maps to [newId, impliedMethod]. Where the old name said how the
  // lift was loaded, that becomes the method on the migrated entry, so a
  // Smith bench press stays a Smith bench press rather than silently
  // becoming a barbell one. Exercises dropped entirely map to their nearest
  // surviving movement — a Zercher squat becomes a front squat — because a
  // logged session pointing at an id the app no longer knows shows up as a
  // nameless row that nothing can chart.
  async function migrateRebuildExerciseDatabase() {
    const MAP = {
  "ab-wheel-rollout": ["ab-wheel", null],
  "arnold-press": ["overhead-press", "Dumbbell"],
  "barbell-bench-press": ["bench-press", "Barbell"],
  "barbell-curl": ["cable-curl", null],
  "barbell-hip-thrust": ["hip-thrust", "Barbell"],
  "barbell-lunge": ["lunge", "Barbell"],
  "barbell-ohp": ["overhead-press", "Barbell"],
  "barbell-overhead-extension": ["overhead-extension", "EZ Bar"],
  "barbell-reverse-curl": ["reverse-curl", "Barbell"],
  "barbell-reverse-wrist-curl": ["reverse-wrist-curl", "Barbell"],
  "barbell-row": ["bent-over-row", "Barbell"],
  "barbell-shrug": ["shrug", "Barbell"],
  "barbell-skullcrusher": ["skull-crusher", "Barbell"],
  "barbell-upright-row": ["upright-row", "Barbell"],
  "barbell-wrist-curl": ["wrist-curl", "Barbell"],
  "bench-dip": ["seated-dips", null],
  "bicycle-crunch": ["wood-chop", null],
  "box-squat": ["squat", "Back"],
  "cable-crossover": ["cable-fly", null],
  "cable-face-pull": ["face-pull", null],
  "cable-front-raise": ["front-raise", "Cable"],
  "cable-hip-abduction": ["hip-abduction", "Cable"],
  "cable-lateral-raise": ["lateral-raise", "Cable"],
  "cable-overhead-extension": ["overhead-extension", "Cable"],
  "cable-pull-through": ["romanian-deadlift", null],
  "cable-pullover": ["pullover", "Cable"],
  "cable-pushdown": ["pushdown", null],
  "cable-reverse-fly": ["reverse-fly", "Cable"],
  "cable-rope-hammer-curl": ["hammer-curl", "Cable"],
  "cable-shrug": ["shrug", "Cable"],
  "cable-upright-row": ["upright-row", "Cable"],
  "concentration-curl": ["preacher-curl", "Dumbbell"],
  "curtsy-lunge": ["reverse-lunge", "Dumbbell"],
  "db-bench-press": ["bench-press", "Dumbbell"],
  "db-chest-supported-row": ["chest-supported-row", "Dumbbell"],
  "db-curl": ["cable-curl", null],
  "db-fly": ["cable-fly", null],
  "db-front-raise": ["front-raise", "Dumbbell"],
  "db-glute-bridge": ["hip-thrust", "Dumbbell"],
  "db-lateral-raise": ["lateral-raise", "Dumbbell"],
  "db-ohp": ["overhead-press", "Dumbbell"],
  "db-overhead-extension": ["overhead-extension", "Dumbbell"],
  "db-reverse-fly": ["reverse-fly", "Dumbbell"],
  "db-reverse-wrist-curl": ["reverse-wrist-curl", "Dumbbell"],
  "db-romanian-deadlift": ["romanian-deadlift", "Dumbbell"],
  "db-shrug": ["shrug", "Dumbbell"],
  "db-skullcrusher": ["skull-crusher", "Dumbbell"],
  "db-step-up": ["lunge", "Dumbbell"],
  "db-tricep-kickback": ["pushdown", null],
  "db-wrist-curl": ["wrist-curl", "Dumbbell"],
  "dead-bug": ["plank", null],
  "decline-barbell-bench-press": ["bench-press", "Barbell"],
  "decline-db-bench-press": ["bench-press", "Dumbbell"],
  "decline-sit-up": ["reverse-crunch", null],
  "diamond-push-up": ["close-grip-bench", null],
  "donkey-calf-raise": ["standing-calf-raise", "Machine"],
  "drag-curl": ["cable-curl", null],
  "dumbbell-pullover": ["pullover", "Dumbbell"],
  "ez-bar-curl": ["preacher-curl", "EZ Bar"],
  "ez-skullcrusher": ["skull-crusher", "EZ Bar"],
  "farmer-carry": ["farmers-carry", "Kettlebell"],
  "floor-press": ["bench-press", null],
  "french-press": ["skull-crusher", "EZ Bar"],
  "frog-pump": ["hip-thrust", null],
  "goblet-squat": ["squat", "Front"],
  "hip-abduction-machine": ["hip-abduction", "Machine"],
  "incline-barbell-press": ["incline-press", "Barbell"],
  "incline-cable-fly": ["cable-fly", null],
  "incline-db-curl": ["incline-curl", "Dumbbell"],
  "incline-db-press": ["incline-press", "Dumbbell"],
  "incline-db-reverse-fly": ["reverse-fly", "Dumbbell"],
  "inverted-row": ["bent-over-row", null],
  "landmine-press": ["overhead-press", null],
  "landmine-row": ["bent-over-row", "Barbell"],
  "leg-press-calf-raise": ["standing-calf-raise", "Machine"],
  "machine-chest-press": ["bench-press", "Machine"],
  "machine-crunch": ["cable-crunch", null],
  "machine-lateral-raise": ["lateral-raise", "Machine"],
  "machine-reverse-fly": ["reverse-fly", "Machine"],
  "machine-row": ["chest-supported-row", "Machine"],
  "machine-shoulder-press": ["overhead-press", "Machine"],
  "meadows-row": ["bent-over-row", "Barbell"],
  "mountain-climbers": ["plank", null],
  "pallof-press": ["wood-chop", null],
  "pendlay-row": ["bent-over-row", "Barbell"],
  "plate-pinch-hold": ["plate-pinch", null],
  "rack-pull": ["deadlift", null],
  "rear-delt-cable-fly": ["reverse-fly", "Cable"],
  "renegade-row": ["bent-over-row", null],
  "russian-twist": ["wood-chop", null],
  "side-plank": ["plank", null],
  "single-arm-cable-pushdown": ["pushdown", null],
  "single-leg-calf-raise": ["standing-calf-raise", null],
  "single-leg-romanian-deadlift": ["romanian-deadlift", null],
  "sissy-squat": ["leg-extension", null],
  "sit-up": ["reverse-crunch", null],
  "smith-bench-press": ["bench-press", "Smith Machine"],
  "smith-calf-raise": ["standing-calf-raise", "Smith Machine"],
  "smith-close-grip-bench": ["close-grip-bench", "Smith Machine"],
  "smith-hip-thrust": ["hip-thrust", "Smith Machine"],
  "smith-incline-bench-press": ["incline-press", "Smith Machine"],
  "smith-lunge": ["lunge", "Smith Machine"],
  "smith-ohp": ["overhead-press", "Smith Machine"],
  "smith-romanian-deadlift": ["romanian-deadlift", "Smith Machine"],
  "smith-row": ["bent-over-row", "Smith Machine"],
  "smith-shrug": ["shrug", "Smith Machine"],
  "smith-squat": ["squat", "Smith Machine"],
  "smith-upright-row": ["upright-row", "Smith Machine"],
  "spider-curl": ["preacher-curl", "Dumbbell"],
  "stability-ball-leg-curl": ["leg-curl", null],
  "t-bar-row": ["bent-over-row", "Barbell"],
  "tate-press": ["skull-crusher", "Dumbbell"],
  "v-up": ["reverse-crunch", null],
  "walking-lunge": ["lunge", "Dumbbell"],
  "wrist-roller": ["wrist-curl", null],
  "zercher-squat": ["squat", "Front"],
  "zottman-curl": ["reverse-curl", "Dumbbell"],
    };
    const remapId = (id) => (MAP[id] ? MAP[id][0] : id);

    const fixExercise = (ex) => {
      if (!ex || !ex.id) return ex;
      const mapped = MAP[ex.id];
      const newId = mapped ? mapped[0] : ex.id;
      const method = mapped ? mapped[1] : null;
      const known = ALL_EXERCISES_BY_ID[newId];
      // An id that survived the rebuild untouched can still have moved group —
      // deadlifts are a Lower Back exercise now — so anything the database
      // still recognises gets refreshed, mapped or not. Custom exercises load
      // after migrations, so they are unknown here and pass through unchanged.
      if (!mapped && !known) return ex;
      const next = { ...ex, id: newId };
      if (known) {
        next.name = known.name;
        next.type = known.type;
      }
      const muscle = muscleOfExerciseId(newId);
      if (muscle) next.muscle = muscle;
      if (method && !next.method && methodsFor(newId).length > 1) next.method = method;
      return next;
    };

    // Collapsing variants can leave the same exercise twice in one session.
    // Merge rather than drop: both sets were really done.
    const fixExercises = (list) => {
      if (!Array.isArray(list)) return list;
      const out = [];
      const byId = new Map();
      for (const ex of list.map(fixExercise)) {
        const seen = byId.get(ex.id);
        // Only merge when the implement matches, or a barbell bench and a
        // dumbbell bench done in the same session would become one row.
        if (seen && (seen.method || "") === (ex.method || "")) {
          seen.sets = [...(seen.sets || []), ...(ex.sets || [])];
          continue;
        }
        byId.set(ex.id, ex);
        out.push(ex);
      }
      return out;
    };

    const history = await safeGet("workout-history");
    if (Array.isArray(history)) {
      await safeSet("workout-history", history.map((s) => ({ ...s, exercises: fixExercises(s.exercises) })));
    }

    // Per-exercise history is keyed by id, so entries have to be moved to
    // the new key and merged with anything already there, oldest first.
    const oldKeys = await safeList("ex-history:");
    const merged = {};
    for (const key of oldKeys) {
      const id = key.slice("ex-history:".length);
      const rows = (await safeGet(key)) || [];
      const target = remapId(id);
      const method = MAP[id] ? MAP[id][1] : null;
      const tagged = rows.map((r) => (method && !r.method ? { ...r, method } : r));
      merged[target] = [...(merged[target] || []), ...tagged];
      if (target !== id) await safeDelete(key);
    }
    for (const [id, rows] of Object.entries(merged)) {
      const sorted = capHistory(sortByAt(rows));
      await safeSet(`ex-history:${id}`, sorted);
    }

    // PBs, manual 1RMs and goals are all keyed by exercise id.
    for (const prefix of ["pb:", "manual-1rm:"]) {
      for (const key of await safeList(prefix)) {
        const id = key.slice(prefix.length);
        const target = remapId(id);
        if (target === id) continue;
        const value = await safeGet(key);
        await safeDelete(key);
        if (value && !(await safeGet(prefix + target))) {
          await safeSet(prefix + target, value.exerciseId ? { ...value, exerciseId: target } : value);
        }
      }
    }
    const goals = await safeGet("1rm-goals");
    if (goals && typeof goals === "object") {
      const next = {};
      for (const [id, v] of Object.entries(goals)) {
        const target = remapId(id);
        // A goal repeats its own id inside the record, so moving the key
        // alone would leave the two disagreeing.
        next[target] = v && v.exerciseId ? { ...v, exerciseId: target } : v;
      }
      await safeSet("1rm-goals", next);
    }

    const templates = await safeGet("templates");
    if (Array.isArray(templates)) {
      await safeSet("templates", templates.map((t) => ({ ...t, exercises: fixExercises(t.exercises) })));
    }

    const fixProgramme = (p) =>
      p && Array.isArray(p.days)
        ? { ...p, days: p.days.map((d) => ({ ...d, exercises: fixExercises(d.exercises), muscles: fixMuscleList(d.muscles) })) }
        : p;
    // Deadlifts moving to Lower Back means a day that programmed them needs
    // the group in its list or the day no longer claims to train it.
    const fixMuscleList = (list) => {
      if (!Array.isArray(list)) return list;
      return [...new Set(list.map((m) => (m === "Shoulders" ? "Front Delts" : m)))];
    };
    const active = await safeGet("active-programme");
    if (active) await safeSet("active-programme", fixProgramme(active));
    const finished = await safeGet("finished-programmes");
    if (Array.isArray(finished)) await safeSet("finished-programmes", finished.map(fixProgramme));

    const snapshot = await safeGet("in-progress-workout");
    if (snapshot && Array.isArray(snapshot.exercises)) {
      await safeSet("in-progress-workout", { ...snapshot, exercises: fixExercises(snapshot.exercises) });
    }

    // Id lists: remap, drop anything that collapsed onto an id already there,
    // and move an id whose group changed into the list it now belongs to —
    // a rank filed under Back does nothing for an exercise that is Lower Back.
    const order = await safeGet("exercise-order");
    if (order && typeof order === "object") {
      const next = {};
      const seen = {};
      const push = (muscle, id) => {
        seen[muscle] = seen[muscle] || new Set();
        if (seen[muscle].has(id)) return;
        seen[muscle].add(id);
        next[muscle].push(id);
      };
      for (const [muscle, ids] of Object.entries(order)) {
        if (!Array.isArray(ids)) continue;
        next[muscle] = next[muscle] || [];
        for (const id of ids.map(remapId)) {
          // Anything the database no longer knows — a custom exercise, say —
          // stays under its original group rather than being thrown away.
          const home = muscleOfExerciseId(id) || muscle;
          next[home] = next[home] || [];
          push(home, id);
        }
      }
      await safeSet("exercise-order", next);
    }
    for (const key of ["hidden-exercises", "paused-exercises"]) {
      const list = await safeGet(key);
      if (Array.isArray(list)) await safeSet(key, [...new Set(list.map(remapId))]);
    }
  },

  // v3 -> v4: Assisted Dips and Weighted Dips fold into Dips, with how you
  // load them becoming a choice on the exercise. Generated days were
  // programming "Assisted Dips" outright, which is not something a
  // programme should decide for you.
  async () => {
    const MAP = {
      "assisted-dips": ["dips", "Assisted"],
      "weighted-dips": ["dips", "Weighted"],
    };
    const remapId = (id) => (MAP[id] ? MAP[id][0] : id);

    const fixExercise = (ex) => {
      if (!ex || !MAP[ex.id]) return ex;
      const [newId, method] = MAP[ex.id];
      const known = ALL_EXERCISES_BY_ID[newId];
      const next = { ...ex, id: newId };
      if (known) next.name = known.name;
      if (!next.method) next.method = method;
      return next;
    };
    // Two of the three in one session is unlikely but was legal, and they
    // are different loadings of the same movement, so keep both rows.
    const fixExercises = (list) => (Array.isArray(list) ? list.map(fixExercise) : list);

    const history = await safeGet("workout-history");
    if (Array.isArray(history)) {
      await safeSet("workout-history", history.map((s) => ({ ...s, exercises: fixExercises(s.exercises) })));
    }

    const merged = {};
    for (const key of await safeList("ex-history:")) {
      const id = key.slice("ex-history:".length);
      const target = remapId(id);
      const method = MAP[id] ? MAP[id][1] : null;
      const rows = (await safeGet(key)) || [];
      merged[target] = [...(merged[target] || []), ...rows.map((r) => (method && !r.method ? { ...r, method } : r))];
      if (target !== id) await safeDelete(key);
    }
    for (const [id, rows] of Object.entries(merged)) {
      if (id === "dips") await safeSet(`ex-history:${id}`, capHistory(sortByAt(rows)));
    }

    // The bodyweight and weighted versions set records on different scales,
    // so the surviving PB is whichever is already on the plain id — the
    // variants' records would read as regressions against it.
    for (const prefix of ["pb:", "manual-1rm:"]) {
      for (const key of await safeList(prefix)) {
        const id = key.slice(prefix.length);
        if (!MAP[id]) continue;
        const value = await safeGet(key);
        await safeDelete(key);
        const target = prefix + remapId(id);
        if (value && !(await safeGet(target))) {
          await safeSet(target, value.exerciseId ? { ...value, exerciseId: remapId(id) } : value);
        }
      }
    }
    const goals = await safeGet("1rm-goals");
    if (goals && typeof goals === "object") {
      const next = {};
      for (const [id, v] of Object.entries(goals)) {
        const target = remapId(id);
        if (target !== id && next[target]) continue;
        next[target] = v && v.exerciseId ? { ...v, exerciseId: target } : v;
      }
      await safeSet("1rm-goals", next);
    }

    const templates = await safeGet("templates");
    if (Array.isArray(templates)) {
      await safeSet("templates", templates.map((t) => ({ ...t, exercises: fixExercises(t.exercises) })));
    }
    const fixProgramme = (p) =>
      p && Array.isArray(p.days) ? { ...p, days: p.days.map((d) => ({ ...d, exercises: fixExercises(d.exercises) })) } : p;
    const active = await safeGet("active-programme");
    if (active) await safeSet("active-programme", fixProgramme(active));
    const finished = await safeGet("finished-programmes");
    if (Array.isArray(finished)) await safeSet("finished-programmes", finished.map(fixProgramme));

    const snapshot = await safeGet("in-progress-workout");
    if (snapshot && Array.isArray(snapshot.exercises)) {
      await safeSet("in-progress-workout", { ...snapshot, exercises: fixExercises(snapshot.exercises) });
    }

    const order = await safeGet("exercise-order");
    if (order && typeof order === "object") {
      const next = {};
      for (const [muscle, ids] of Object.entries(order)) {
        if (!Array.isArray(ids)) continue;
        next[muscle] = [...new Set(ids.map(remapId))];
      }
      await safeSet("exercise-order", next);
    }
    for (const key of ["hidden-exercises", "paused-exercises"]) {
      const list = await safeGet(key);
      if (Array.isArray(list)) await safeSet(key, [...new Set(list.map(remapId))]);
    }
  },

  // v4 -> v5: Back, Front and Hack Squat fold into one Squat, with which one
  // you did chosen per session. Same argument as the dips: it is one movement
  // pattern loaded three ways, and a programme should not decide which bar
  // you walk up to on the day.
  async () => {
    const MAP = {
      "back-squat": ["squat", "Back"],
      "front-squat": ["squat", "Front"],
      "hack-squat": ["squat", "Hack"],
    };
    const remapId = (id) => (MAP[id] ? MAP[id][0] : id);

    const fixExercise = (ex) => {
      if (!ex || !MAP[ex.id]) return ex;
      const [newId, method] = MAP[ex.id];
      const known = ALL_EXERCISES_BY_ID[newId];
      const next = { ...ex, id: newId };
      if (known) next.name = known.name;
      if (!next.method) next.method = method;
      return next;
    };
    // Two squat variations in one session is a real thing to have done, so
    // both rows are kept rather than merged.
    const fixExercises = (list) => (Array.isArray(list) ? list.map(fixExercise) : list);

    const history = await safeGet("workout-history");
    if (Array.isArray(history)) {
      await safeSet("workout-history", history.map((s) => ({ ...s, exercises: fixExercises(s.exercises) })));
    }

    const merged = {};
    for (const key of await safeList("ex-history:")) {
      const id = key.slice("ex-history:".length);
      const target = remapId(id);
      const method = MAP[id] ? MAP[id][1] : null;
      const rows = (await safeGet(key)) || [];
      merged[target] = [...(merged[target] || []), ...rows.map((r) => (method && !r.method ? { ...r, method } : r))];
      if (target !== id) await safeDelete(key);
    }
    for (const [id, rows] of Object.entries(merged)) {
      if (id === "squat") await safeSet(`ex-history:${id}`, capHistory(sortByAt(rows)));
    }

    // The back squat is the one the PB was tracked against, so it wins where
    // more than one variation carries a record.
    const PB_ORDER = ["back-squat", "front-squat", "hack-squat"];
    for (const prefix of ["pb:", "manual-1rm:"]) {
      let winner = null;
      for (const id of PB_ORDER) {
        const value = await safeGet(prefix + id);
        if (value) {
          if (!winner) winner = value;
          await safeDelete(prefix + id);
        }
      }
      if (winner && !(await safeGet(prefix + "squat"))) {
        await safeSet(prefix + "squat", winner.exerciseId ? { ...winner, exerciseId: "squat", name: "Squat" } : winner);
      }
    }
    const goals = await safeGet("1rm-goals");
    if (goals && typeof goals === "object") {
      const next = {};
      for (const [id, v] of Object.entries(goals)) {
        const target = remapId(id);
        if (target !== id && next[target]) continue;
        next[target] = v && v.exerciseId ? { ...v, exerciseId: target } : v;
      }
      await safeSet("1rm-goals", next);
    }

    const templates = await safeGet("templates");
    if (Array.isArray(templates)) {
      await safeSet("templates", templates.map((t) => ({ ...t, exercises: fixExercises(t.exercises) })));
    }
    const fixProgramme = (p) =>
      p && Array.isArray(p.days) ? { ...p, days: p.days.map((d) => ({ ...d, exercises: fixExercises(d.exercises) })) } : p;
    const active = await safeGet("active-programme");
    if (active) await safeSet("active-programme", fixProgramme(active));
    const finished = await safeGet("finished-programmes");
    if (Array.isArray(finished)) await safeSet("finished-programmes", finished.map(fixProgramme));

    const snapshot = await safeGet("in-progress-workout");
    if (snapshot && Array.isArray(snapshot.exercises)) {
      await safeSet("in-progress-workout", { ...snapshot, exercises: fixExercises(snapshot.exercises) });
    }

    const order = await safeGet("exercise-order");
    if (order && typeof order === "object") {
      const next = {};
      for (const [muscle, ids] of Object.entries(order)) {
        if (!Array.isArray(ids)) continue;
        next[muscle] = [...new Set(ids.map(remapId))];
      }
      await safeSet("exercise-order", next);
    }
    for (const key of ["hidden-exercises", "paused-exercises"]) {
      const list = await safeGet(key);
      if (Array.isArray(list)) await safeSet(key, [...new Set(list.map(remapId))]);
    }
  },
];

export async function runMigrations() {
  let version = (await safeGet("schema-version")) || 0;
  for (let v = version; v < MIGRATIONS.length; v++) {
    try {
      await MIGRATIONS[v]();
      version = v + 1;
      await safeSet("schema-version", version);
    } catch (e) {
      console.error("migration", v, "failed — leaving data as-is", e);
      break; // don't advance past a failed migration; retried next launch
    }
  }
}
