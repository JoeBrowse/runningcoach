/* ---------------------------------------------------------------
   "YOUR WEEK" HELPERS (spec v1.1 sections 1 and 2)

   Pure functions. No DOM, no storage. The first-open flow, the
   Settings "I use Skid Marks for" change and the Lift setup card use
   them. Tests: test/onboarding.test.mjs.

   answers (the form):
     { use: 'run'|'lift'|'both', availableDays: [0..6], runDays: n,
       liftDays: n, priority: 'run'|'lift'|'equal', doubles: bool,
       runLevel: 'new'|'some'|'experienced',
       liftLevel: 'beginner'|'intermediate'|'advanced',
       longRunDay: number|undefined }

   week (the engine.planWeek result, maybe changed by the user):
     { runDays, longRunDay, gymDays: [{day, type, intensity, note}],
       doubles: [{day, first, gapHours}], restDays, split, reasons,
       warnings }
--------------------------------------------------------------- */

export const USES = ["run", "lift", "both"];
export const RUN_LEVELS = ["new", "some", "experienced"];
export const LIFT_LEVELS = ["beginner", "intermediate", "advanced"];
export const PRIORITIES = ["run", "lift", "equal"];
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Gym types that load the legs (the same set as the plan engine).
export const LEG_GYM_TYPES = new Set(["legs", "lower", "full"]);

export const usesRun = (use) => use === "run" || use === "both";
export const usesLift = (use) => use === "lift" || use === "both";

const intOr = (v, d) => (Number.isInteger(Number(v)) && v !== null && v !== "" ? Number(v) : d);
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const pick = (v, list, d) => (list.includes(v) ? v : d);

export function normaliseUse(v) {
  return pick(v, USES, null);
}

/* Default counts from engine.recommendWeek. The result can name the
   counts runDays/liftDays or runs/lifts. */
export function recommendedCounts(rec, use) {
  const r = rec || {};
  const run = intOr(r.runDays != null ? r.runDays : r.runs, use === "lift" ? 0 : 3);
  const lift = intOr(r.liftDays != null ? r.liftDays : r.lifts, use === "run" ? 0 : 2);
  return {
    runDays: usesRun(use) ? clampInt(run, 1, 7) : 0,
    liftDays: usesLift(use) ? clampInt(lift, 1, 6) : 0,
    doubles: !!r.doubles,
  };
}

/* The first answers for a use. `prev` is an earlier master week (from
   Settings) and `levels` holds known levels. `recommend` is
   engine.recommendWeek (optional, so the tests can pass a stub). */
export function defaultAnswers(use, { prev, levels = {}, recommend } = {}) {
  const u = normaliseUse(use) || "both";
  const runLevel = pick(levels.runLevel, RUN_LEVELS, "some");
  const liftLevel = pick(levels.liftLevel, LIFT_LEVELS, "beginner");
  const priority = pick(prev && prev.priority, PRIORITIES, u === "lift" ? "lift" : u === "run" ? "run" : "equal");
  let rec = null;
  if (typeof recommend === "function") {
    try {
      rec = recommend({ use: u, runLevel, liftLevel, priority });
    } catch (e) {
      rec = null;
    }
  }
  const counts = recommendedCounts(rec, u);
  const p = prev || {};
  const days = Array.isArray(p.availableDays) && p.availableDays.length ? p.availableDays.filter((d) => ALL_DAYS.includes(d)) : ALL_DAYS.slice();
  return {
    use: u,
    availableDays: sortDays(days),
    runDays: usesRun(u) ? clampInt(p.use === u && p.runCount ? p.runCount : counts.runDays, 1, 7) : 0,
    liftDays: usesLift(u) ? clampInt(p.use === u && p.liftCount ? p.liftCount : counts.liftDays, 1, 6) : 0,
    priority: u === "both" ? priority : u === "lift" ? "lift" : "run",
    doubles: u === "both" ? (typeof p.doubles === "boolean" && p.use === u ? p.doubles : false) : false,
    runLevel,
    liftLevel,
    longRunDay: usesRun(u) && Number.isInteger(p.longRunDay) ? p.longRunDay : undefined,
  };
}

export function sortDays(days) {
  return [...new Set((days || []).map(Number).filter((d) => ALL_DAYS.includes(d)))].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
}

/* The engine.planWeek input from the answers. */
export function toPlanWeekInput(a) {
  const use = normaliseUse(a.use) || "both";
  const input = {
    use,
    availableDays: sortDays(a.availableDays),
    runDays: usesRun(use) ? clampInt(a.runDays, 0, 7) : 0,
    liftDays: usesLift(use) ? clampInt(a.liftDays, 0, 7) : 0,
    priority: use === "both" ? pick(a.priority, PRIORITIES, "equal") : use === "lift" ? "lift" : "run",
    doubles: use === "both" ? !!a.doubles : false,
    runLevel: pick(a.runLevel, RUN_LEVELS, "some"),
    liftLevel: pick(a.liftLevel, LIFT_LEVELS, "beginner"),
  };
  if (usesRun(use) && Number.isInteger(a.longRunDay)) input.longRunDay = a.longRunDay;
  return input;
}

/* Lift split from the number of lift days (research rule 5). planWeek
   gives the split too; this is the fall-back. */
export function splitFor(liftDays, priority) {
  if (liftDays >= 4 && priority === "lift") return "upper-lower";
  if (liftDays >= 3) return "upper-lower-upper";
  return "full";
}

/* The master-plan record that "Save" writes. `prev` is the old record:
   keys that this flow does not own stay. */
export function toMasterRecord(week, answers, prev = {}) {
  const w = week || {};
  const use = normaliseUse(answers.use) || "both";
  const runDays = usesRun(use) ? sortDays(w.runDays) : [];
  const gymDays = usesLift(use)
    ? (w.gymDays || []).map((g) => ({ day: Number(g.day), type: g.type || "full", intensity: g.intensity === "heavy" ? "heavy" : "light", note: g.note || "" }))
    : [];
  gymDays.sort((a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day));
  let longRunDay = Number.isInteger(w.longRunDay) && runDays.includes(w.longRunDay) ? w.longRunDay : null;
  if (longRunDay === null && runDays.length) longRunDay = runDays.includes(0) ? 0 : runDays.includes(6) ? 6 : runDays[runDays.length - 1];
  return {
    ...(prev || {}),
    runDays,
    longRunDay,
    gymDays,
    doubles: use === "both" ? !!answers.doubles : false,
    doubleDays: use === "both" && answers.doubles ? (w.doubles || []).filter((d) => runDays.includes(d.day) && gymDays.some((g) => g.day === d.day)) : [],
    use,
    priority: use === "both" ? pick(answers.priority, PRIORITIES, "equal") : use === "lift" ? "lift" : "run",
    liftSplit: usesLift(use) ? w.split || splitFor(gymDays.length, answers.priority) : null,
    availableDays: sortDays(answers.availableDays),
    runCount: usesRun(use) ? runDays.length : 0,
    liftCount: usesLift(use) ? gymDays.length : 0,
  };
}

/* The run-profile fields that "Save" writes. Running stays "not set
   up" (onboarded is not changed): the Run page asks the rest. */
export function toProfilePatch(answers, prev = {}) {
  const p = prev || {};
  const use = normaliseUse(answers.use) || "both";
  const patch = { use, liftLevel: pick(answers.liftLevel, LIFT_LEVELS, p.liftLevel || "beginner") };
  if (usesRun(use)) {
    const runLevel = pick(answers.runLevel, RUN_LEVELS, "some");
    if (!p.onboarded || p.level === "gym-only") {
      patch.experience = runLevel;
      patch.level = runLevel === "new" ? "new" : runLevel === "experienced" ? "racer" : "some";
    }
    patch.usesLift = usesLift(use);
  }
  return patch;
}

/* ---------- the 7 rows ---------- */

/* One row for each day, Monday first:
   { day, available, run: null|'run'|'long', gym: null|{type, intensity, note}, double: null|{first, gapHours} } */
export function weekRows(week, answers) {
  const w = week || {};
  const avail = new Set(sortDays(answers && answers.availableDays));
  const runs = new Set(sortDays(w.runDays));
  return ALL_DAYS.map((day) => {
    const g = (w.gymDays || []).find((x) => Number(x.day) === day) || null;
    const dbl = (w.doubles || []).find((x) => Number(x.day) === day) || null;
    return {
      day,
      available: avail.has(day),
      run: runs.has(day) ? (w.longRunDay === day ? "long" : "run") : null,
      gym: g ? { type: g.type, intensity: g.intensity, note: g.note || "" } : null,
      double: dbl ? { first: dbl.first, gapHours: dbl.gapHours || 6 } : null,
    };
  });
}

/* Changes one day. edit: { run: null|'run'|'long', gym: null|{type, intensity} }.
   Returns a new week. The long run moves when another day gets it. */
export function applyDayEdit(week, day, edit, answers = {}) {
  const w = week || {};
  let runDays = sortDays(w.runDays).filter((d) => d !== day);
  let longRunDay = Number.isInteger(w.longRunDay) ? w.longRunDay : null;
  if (longRunDay === day) longRunDay = null;
  if (edit.run) runDays = sortDays([...runDays, day]);
  if (edit.run === "long") longRunDay = day;
  if (longRunDay === null && runDays.length && usesRun(answers.use || "both")) {
    // Keep one long run: the weekend day, else the last run day.
    longRunDay = runDays.includes(0) ? 0 : runDays.includes(6) ? 6 : runDays[runDays.length - 1];
  }
  let gymDays = (w.gymDays || []).filter((g) => Number(g.day) !== day).map((g) => ({ ...g }));
  if (edit.gym) gymDays.push({ day, type: edit.gym.type, intensity: edit.gym.intensity === "heavy" ? "heavy" : "light", note: edit.gym.note || "" });
  gymDays.sort((a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day));
  const priority = answers.priority || "equal";
  const doubles = [];
  for (const g of gymDays) {
    if (!runDays.includes(g.day)) continue;
    const old = (w.doubles || []).find((x) => Number(x.day) === g.day);
    doubles.push(old ? { ...old } : { day: g.day, first: priority === "lift" ? "lift" : "run", gapHours: 6 });
  }
  const restDays = ALL_DAYS.filter((d) => !runDays.includes(d) && !gymDays.some((g) => g.day === d));
  return { ...w, runDays, longRunDay, gymDays, doubles, restDays, edited: true };
}

/* ---------- rule check for a changed week ---------- */

// Days from day a forward to day b (0..6).
const daysAhead = (a, b) => (b - a + 7) % 7;

/* The rules that a week breaks (research rules 1, 2, 3, 6 and the
   available days). Returns [{ day, rule, text }] with STE text. The
   plan engine still checks the real planned days when it makes the
   plan; this check is for the 7 rows only. */
export function checkWeek(week, answers) {
  const w = week || {};
  const a = answers || {};
  const out = [];
  const runs = sortDays(w.runDays);
  const L = Number.isInteger(w.longRunDay) && runs.includes(w.longRunDay) ? w.longRunDay : null;
  const avail = new Set(sortDays(a.availableDays));
  const gyms = w.gymDays || [];
  const name = (d) => DAY_NAMES_LONG[d];

  for (const d of ALL_DAYS) {
    const used = runs.includes(d) || gyms.some((g) => Number(g.day) === d);
    if (used && !avail.has(d)) out.push({ day: d, rule: "available", text: `You cannot train on ${name(d)}. Remove the session or add ${name(d)} to your days.` });
  }

  for (const g of gyms) {
    const day = Number(g.day);
    const heavyLegs = g.intensity === "heavy" && LEG_GYM_TYPES.has(g.type);
    if (heavyLegs && L !== null) {
      const k = daysAhead(day, L);
      if (k >= 1 && k <= 2) out.push({ day, rule: "legs-long", text: `Heavy legs on ${name(day)} is less than 72 hours before the long run on ${name(L)}. Make it light, or move it.` });
    }
    if (runs.includes(day)) {
      const easyShare = g.type === "upper" && L !== day;
      if (!easyShare && !a.doubles) {
        out.push({ day, rule: "doubles", text: `${name(day)} has a run and a gym session. Two sessions on one day are off. Only upper body can share a day with an easy run.` });
      } else if (heavyLegs && L === day) {
        out.push({ day, rule: "legs-long", text: `${name(day)} has the long run and heavy legs. Do not do heavy legs on the day of the long run.` });
      }
    }
  }

  const rest = ALL_DAYS.filter((d) => !runs.includes(d) && !gyms.some((g) => Number(g.day) === d));
  // The same rule as engine.planWeek: a beginner on either side that the user does.
  const beginner = (usesRun(a.use) && a.runLevel === "new") || (usesLift(a.use) && a.liftLevel === "beginner");
  const need = beginner ? 2 : 1;
  if (rest.length < need) {
    out.push({ day: null, rule: "rest", text: need === 2 ? "Beginners keep at least two full rest days a week." : "Keep at least one full rest day a week." });
  }
  return out;
}

/* ---------- Lift setup card: wizard pre-fill ---------- */

export const LIFT_LEVEL_EXPERIENCE = { beginner: "new", intermediate: "some", advanced: "experienced" };
export const SPLIT_PRESET = { full: "full-body", "upper-lower-upper": "upper-lower", "upper-lower": "upper-lower" };
export const SPLIT_LABEL = { full: "Full body", "upper-lower-upper": "Upper, lower, upper", "upper-lower": "Upper, lower, upper, lower" };

/* The GuidedProgrammeWizard pre-fill from the level and the master week. */
export function guidedPrefill(master, level) {
  const m = master || {};
  const sessions = Array.isArray(m.gymDays) ? m.gymDays.length : 0;
  const split = m.liftSplit && SPLIT_PRESET[m.liftSplit] ? m.liftSplit : sessions ? splitFor(sessions, m.priority) : null;
  return {
    experience: LIFT_LEVEL_EXPERIENCE[level] || "new",
    presetKey: split ? SPLIT_PRESET[split] : null,
    sessions,
    split,
    splitLabel: split ? SPLIT_LABEL[split] : null,
  };
}
