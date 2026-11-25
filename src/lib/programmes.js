import { EXERCISES, isHeavyExercise } from "../data/exercises.js";
import { DAY_BLUEPRINTS } from "../data/programmes.js";
import { PAUSED_EXERCISE_IDS, visibleExercises } from "./exerciseLibrary.js";
import { getTopSet } from "./history.js";
import { estimateOneRM } from "./progression.js";
import { safeGet, safeSet, safeDelete } from "./storage.js";
import { makeSessionPlan, canTakeHeavy, recordPick, pickSmartForMuscle, reorderByType, heavyBudgetFor } from "./workoutBuilder.js";

/* ---------------------------------------------------------------
   PROGRAMMES
   A programme is an ordered set of workout "days" (e.g. Push / Pull /
   Legs / Upper) that the user follows for a fixed number of weeks. Unlike
   free-mode workouts, the day templates persist, so the same sessions —
   with last time's weights ready — are one tap away, and the app tracks
   which day comes next and how the block is progressing.
--------------------------------------------------------------- */

// Looks up exercises by id for hand-authored programme days. EXERCISES is
// keyed by muscle group, but individual entries don't carry that muscle name
// themselves, so this walks the database once to attach it.
export function exercisesFromIds(ids) {
  const out = [];
  for (const entry of ids) {
    // An entry is an id, or [id, method] where the programme means one
    // particular variation — a hack squat rather than whichever squat.
    const [id, method] = Array.isArray(entry) ? entry : [entry, null];
    let found = null;
    for (const [muscle, list] of Object.entries(EXERCISES)) {
      const hit = list.find((e) => e.id === id);
      if (hit) {
        found = { id: hit.id, name: hit.name, muscle, type: hit.type };
        if (method) found.method = method;
        break;
      }
    }
    if (found) out.push(found);
  }
  return out;
}

// Sensible starting exercises for a day, given its muscles. Primary (first two)
// muscles get two movements, the rest one, capped so a day isn't overloaded.
// Used for Custom days, which have no hand-authored exercise list.
export function defaultExercisesForDay(muscles) {
  const usedIds = new Set();
  const plan = makeSessionPlan(heavyBudgetFor(7));
  const out = [];
  muscles.forEach((m, i) => {
    const count = i < 2 ? 2 : 1;
    const picks = pickSmartForMuscle(m, count, usedIds, false, null, plan);
    picks.forEach((e) => out.push({ id: e.id, name: e.name, muscle: m, type: e.type }));
  });
  // Keep it to a reasonable session size; user can add more.
  return reorderByType(out).slice(0, 7);
}

export function makeProgrammeDays(preset) {
  return preset.days.map(([name, muscles, exerciseIds], i) => ({
    key: `d${i}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    muscles,
    // Used verbatim: a hand-authored list is already in the order its author
    // meant, and re-sorting it by type drags a finisher like a farmer's carry
    // to the front of an arms day. Custom days, which are generated rather
    // than authored, still get the compounds-first pass.
    exercises: exerciseIds && exerciseIds.length ? exercisesFromIds(exerciseIds) : defaultExercisesForDay(muscles),
  }));
}

// Draws the best available lift for a slot straight off the user's ranked
// list. Anything hidden, paused, already picked, or from a family already
// used is out. Where a slot could be satisfied by
// a pattern already used in this session, an unused pattern wins, so a
// second chest slot becomes an incline rather than a second flat press.
export function fillSlot(slot, usedIds, usedPatterns, plan) {
  let pool = visibleExercises(slot.muscle).filter(
    (e) =>
      e.type === slot.type &&
      slot.patterns.includes(e.pattern) &&
      !usedIds.has(e.id) &&
      !PAUSED_EXERCISE_IDS.has(e.id)
  );
  // The blueprints are written slot by slot and front-load the big lifts, so
  // a short day took the first N slots and came back nearly all heavy — a
  // five-exercise Upper day was bench, row, overhead press, pull-up. Past the
  // budget a slot takes the best lighter option it has; if it has none it
  // still fills, because an empty slot is worse than one lift over.
  if (plan && !canTakeHeavy(plan)) {
    const lighter = pool.filter((e) => !isHeavyExercise(e));
    if (lighter.length) pool = lighter;
  }
  if (pool.length === 0) return null;
  return pool.find((e) => !usedPatterns.has(`${slot.muscle}:${e.pattern}`)) || pool[0];
}

// Muscles get 2 movements instead of 1 where room allows, and each day that
// touches a chosen muscle gets one extra exercise slot — a mild, not
// overwhelming, bias toward what the user said they most want to improve.
export function buildGuidedDays(preset, exerciseCount, focusMuscles) {
  const focus = new Set(focusMuscles || []);
  return preset.days.map(([name, muscles], i) => {
    const blueprint = DAY_BLUEPRINTS[name];
    // The extra slot is judged against what this day actually trains. The
    // preset's muscle list is a coarse label ("Quads, Front Delts, Back") and
    // misses the arm and core work the blueprint includes, so a day that
    // does train the focus muscle would otherwise be denied its extra slot.
    const dayMuscles = blueprint ? blueprint.map((sl) => sl.muscle) : muscles;
    const targetCount = Math.min(9, focus.size > 0 && dayMuscles.some((m) => focus.has(m)) ? exerciseCount + 1 : exerciseCount);
    let picked;

    if (blueprint) {
      // The two opening slots anchor the session and stay put; below them,
      // slots for a muscle the user asked to prioritise float up. Sort is
      // stable, so everything else keeps its written order.
      const head = blueprint.slice(0, 2);
      const rank = (x) => (x.slot.type === "compound" ? 0 : 1);
      const tail = blueprint
        .slice(2)
        .map((slot, idx) => ({ slot, idx }))
        // Compounds stay ahead of isolations no matter what is prioritised;
        // the focus boost only reorders within each of those two bands.
        .sort((a, b) => rank(a) - rank(b) || (focus.has(b.slot.muscle) ? 1 : 0) - (focus.has(a.slot.muscle) ? 1 : 0) || a.idx - b.idx)
        .map((x) => x.slot);

      const usedIds = new Set();
      const usedPatterns = new Set();
      const plan = makeSessionPlan(heavyBudgetFor(targetCount));
      picked = [];
      for (const slot of [...head, ...tail]) {
        if (picked.length >= targetCount) break;
        const ex = fillSlot(slot, usedIds, usedPatterns, plan);
        if (!ex) continue; // nothing left that fits — let the next slot through
        usedIds.add(ex.id);
        usedPatterns.add(`${slot.muscle}:${ex.pattern}`);
        recordPick(plan, slot.muscle, ex.pattern || ex.type, ex);
        picked.push({ ...ex, muscle: slot.muscle });
      }
      // Only if the user has removed so much that the blueprint ran dry.
      if (picked.length < targetCount) {
        for (const m of muscles) {
          if (picked.length >= targetCount) break;
          const extra = pickSmartForMuscle(m, targetCount - picked.length, usedIds, false, null, plan);
          extra.forEach((e) => {
            usedIds.add(e.id);
            picked.push(e);
          });
        }
      }
    } else {
      // No blueprint for this day name (a preset the guided flow does not
      // currently offer) — fall back to the ranked round-robin.
      const usedIds = new Set();
      const plan = makeSessionPlan(heavyBudgetFor(targetCount));
      const focusInDay = muscles.filter((m) => focus.has(m));
      const orderedMuscles = [...focusInDay, ...muscles.filter((m) => !focusInDay.includes(m))];
      picked = [];
      orderedMuscles.forEach((m) => {
        if (picked.length >= targetCount) return;
        const n = Math.min(focusInDay.includes(m) ? 2 : 1, targetCount - picked.length);
        picked.push(...pickSmartForMuscle(m, n, usedIds, false, null, plan));
      });
      let guard = 0;
      while (picked.length < targetCount && guard < 20) {
        const before = picked.length;
        for (const m of orderedMuscles) {
          if (picked.length >= targetCount) break;
          const extra = pickSmartForMuscle(m, 1, usedIds, false, null, plan);
          if (extra.length) picked.push(...extra);
        }
        if (picked.length === before) break;
        guard++;
      }
    }

    return {
      key: `d${i}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      muscles: [...new Set(picked.map((e) => e.muscle))],
      exercises: picked.map((e) => ({ id: e.id, name: e.name, muscle: e.muscle, type: e.type })),
    };
  });
}

// Beginner guidance is spelled out in full; more experienced lifters get
// terser, more assumed-knowledge notes. Protein is only computed from a
// real number if the user has actually logged their bodyweight.
export function guidedRecommendations(experience, bodyweightKg) {
  const recs = [];
  if (experience === "new") {
    recs.push({ title: "Rep Ranges", body: "Aim for 8–12 reps on most exercises. If you hit 12 clean reps and it still feels easy, add a little weight next session — that's how you'll know it's time to progress." });
    recs.push({ title: "Rest Between Sets", body: "60–90 seconds between sets is plenty — enough to recover without losing the session's pace." });
    recs.push({ title: "Focus On Form First", body: "In the first few months, learning each movement properly matters more than the weight on the bar. Small, steady increases beat big jumps." });
  } else if (experience === "some") {
    recs.push({ title: "Rep Ranges", body: "5–8 reps on your main compound lifts works well for strength; 10–15 on isolation work for size." });
    recs.push({ title: "Rest Between Sets", body: "90–120 seconds on heavy compounds, 45–60 seconds on isolation work." });
    recs.push({ title: "Progression", body: "Track your top set each session and aim to beat it — more weight or more reps — roughly every 1–2 weeks." });
  } else {
    recs.push({ title: "Rep Ranges", body: "Structure blocks around a goal — lower reps (3–6) for strength phases, higher (8–15) for hypertrophy phases." });
    recs.push({ title: "Rest Between Sets", body: "2–3 minutes on your heaviest compounds is normal — don't rush the lifts that matter most." });
    recs.push({ title: "Progression", body: "Watch weekly volume per muscle, not just weight on the bar — that's usually the lever with the most room left this far in." });
  }
  if (bodyweightKg) {
    const lo = Math.round(bodyweightKg * 1.6);
    const hi = Math.round(bodyweightKg * 2.2);
    recs.push({ title: "Protein Intake", body: `Based on your logged bodyweight (${Math.round(bodyweightKg)}kg), aim for roughly ${lo}–${hi}g of protein a day (1.6–2.2g per kg of bodyweight) to support recovery and growth.` });
  } else {
    recs.push({ title: "Protein Intake", body: "A well-supported target is 1.6–2.2g of protein per kg of bodyweight per day. Log your weight in Personal Info and this can be a precise number next time." });
  }
  return recs;
}

export function programmeNextIndex(programme) {
  const log = programme.log || [];
  if (log.length === 0) return 0;
  const lastKey = log[log.length - 1].dayKey;
  const idx = programme.days.findIndex((d) => d.key === lastKey);
  if (idx === -1) return 0;
  return (idx + 1) % programme.days.length;
}
export function programmePlanned(programme) {
  return (programme.weeks || 0) * ((programme.days || []).length || 0);
}
export function programmeCompleted(programme) {
  return (programme.log || []).length;
}
// When the block actually started: the first session logged against it, or
// failing that the day it was created. Creation is the weaker answer — a
// programme built on Sunday night and started on Wednesday should not be
// three days into week one — so a real session wins wherever there is one.
export function programmeStartDate(programme) {
  const log = programme && programme.log;
  if (Array.isArray(log) && log.length) {
    const first = log.reduce((a, b) => ((a.at || a.date) <= (b.at || b.date) ? a : b));
    return first.at || first.date || null;
  }
  return (programme && programme.createdAt) || null;
}

// Weeks are calendar weeks, counted from the start of the block.
//
// This used to be completed sessions divided by the number of days in the
// cycle, which is a cycle counter wearing the word "week". It could not tell
// seven repeats of one full-body day from a fortnight of proper training —
// both read as week four — and someone training six days a week on a
// three-day split reached "week two" after seven days. A week is seven days.
export function programmeWeekNumber(programme) {
  const started = programmeStartDate(programme);
  if (!started) return 1;
  const ms = Date.now() - Date.parse(started);
  if (!Number.isFinite(ms)) return 1;
  const wk = Math.floor(Math.max(0, ms) / (7 * 86400000)) + 1;
  return Math.min(Math.max(1, wk), programme.weeks || wk);
}
export function lastDoneForDay(programme, dayKey) {
  const entries = (programme.log || []).filter((e) => e.dayKey === dayKey);
  return entries.length ? entries[entries.length - 1].date : null;
}

export async function getActiveProgramme() {
  return (await safeGet("active-programme")) || null;
}
export async function saveActiveProgramme(p) {
  await safeSet("active-programme", p);
}
export async function getFinishedProgrammes() {
  return (await safeGet("finished-programmes")) || [];
}
// Remove a finished programme from history by id.
export async function deleteFinishedProgramme(id) {
  const list = await getFinishedProgrammes();
  const next = list.filter((p) => p.id !== id);
  await safeSet("finished-programmes", next);
  return next;
}
// Move the active programme into the finished list (most recent last).
export async function archiveActiveProgramme(endedEarly) {
  const active = await getActiveProgramme();
  if (!active) return null;
  const finished = { ...active, finishedAt: new Date().toISOString(), endedEarly: !!endedEarly };
  const list = await getFinishedProgrammes();
  await safeSet("finished-programmes", [...list, finished].slice(-20));
  await safeDelete("active-programme");
  return finished;
}
// Append a completed session to the active programme's log.
export async function recordProgrammeSession(entry) {
  const active = await getActiveProgramme();
  if (!active) return null;
  const log = [...(active.log || []), entry];
  const updated = { ...active, log };
  await saveActiveProgramme(updated);
  return updated;
}

// Aggregate stats for a programme from the workout-history sessions tagged with
// its id: totals plus per-exercise first→last e1RM progression (top gainers).
export function computeProgrammeStats(programme, allSessions) {
  const sessions = (allSessions || [])
    .filter((s) => s.programmeId === programme.id)
    .sort((a, b) => ((a.at || a.date) < (b.at || b.date) ? -1 : 1));

  let totalSets = 0;
  let totalVolume = 0;
  const perExercise = {}; // id -> { name, first:{e1rm,date}, last:{e1rm,date} }

  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      const allSets = ex.sets || [];
      allSets.forEach((set) => {
        totalSets += 1;
        const w = parseFloat(set.weight) || 0;
        const r = parseFloat(set.reps) || 0;
        totalVolume += w * r;
        (set.drops || []).forEach((d) => {
          totalVolume += (parseFloat(d.weight) || 0) * (parseFloat(d.reps) || 0);
        });
      });
      const top = getTopSet(allSets);
      const e1 = top ? estimateOneRM(top.weight, top.reps) : null;
      if (e1) {
        if (!perExercise[ex.id]) perExercise[ex.id] = { name: ex.name, first: { e1rm: e1, date: s.date }, best: { e1rm: e1, date: s.date } };
        else if (e1 > perExercise[ex.id].best.e1rm) perExercise[ex.id].best = { e1rm: e1, date: s.date };
      }
    });
  });

  // Measured against the best session of the block, not the last one. Most
  // programmes end on a deload week, so comparing first to last reported a
  // loss on every lift and made a section headed "biggest strength gains"
  // read as a list of things that got worse.
  const gainers = Object.values(perExercise)
    .filter((x) => x.first.e1rm > 0 && x.best.e1rm > x.first.e1rm)
    .map((x) => ({
      name: x.name,
      from: x.first.e1rm,
      to: x.best.e1rm,
      pct: Math.round(((x.best.e1rm - x.first.e1rm) / x.first.e1rm) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  const planned = programmePlanned(programme);
  const done = sessions.length;
  return {
    sessions: done,
    planned,
    totalSets,
    totalVolume: Math.round(totalVolume),
    gainers,
    firstDate: sessions.length ? sessions[0].date : null,
    lastDate: sessions.length ? sessions[sessions.length - 1].date : null,
  };
}
