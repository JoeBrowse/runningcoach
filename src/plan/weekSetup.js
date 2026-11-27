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
    ? (w.gymDays || []).map((g) => ({ day: Number(g.day), type: g.type || "full", intensity: g.intensity === "heavy" ? "heavy" : "light", note: g.note || "", ...(g.name ? { name: g.name } : {}) }))
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
    liftProgramme: usesLift(use) && answers.programme ? answers.programme : (prev && prev.liftProgramme) || null,
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
      gym: g ? { type: g.type, intensity: g.intensity, note: g.note || "", ...(g.name ? { name: g.name } : {}) } : null,
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
      if (!a.doubles) {
        out.push({ day, rule: "doubles", text: `${name(day)} has a run and a gym session. You chose no training twice on one day. Move one session, or change your answer.` });
      } else if (heavyLegs && L === day) {
        out.push({ day, rule: "legs-long", text: `${name(day)} has the long run and heavy legs. Do not do heavy legs on the day of the long run.` });
      }
    }
  }

  const rest = ALL_DAYS.filter((d) => !runs.includes(d) && !gyms.some((g) => Number(g.day) === d));
  // The same rule as engine.planWeek: a new runner, or a beginner who only lifts.
  const newRunner = usesRun(a.use) && a.runLevel === "new";
  const beginner = newRunner || (a.use === "lift" && a.liftLevel === "beginner");
  const need = beginner ? 2 : 1;
  if (rest.length < need) {
    out.push({ day: null, rule: "rest", text: need === 2 ? (newRunner ? "New runners keep at least two full rest days a week." : "Beginners keep at least two full rest days a week.") : "Keep at least one full rest day a week." });
  }
  return out;
}

/* ---------- Lift setup card: wizard pre-fill ---------- */

export const LIFT_LEVEL_EXPERIENCE = { beginner: "new", intermediate: "some", advanced: "experienced" };
export const SPLIT_PRESET = { full: "full-body", "upper-lower-upper": "upper-lower", "upper-lower": "upper-lower", ppl: "ppl" };
export const SPLIT_LABEL = { full: "Full body", "upper-lower-upper": "Upper, lower, upper", "upper-lower": "Upper and lower", ppl: "Push, pull, legs" };

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

/* ---------- Your week from direct picks (version 2.4) ----------
   The user picks the lift days, the lift programme, the run days and the
   long-run day. The app does not choose the days. It only chooses which
   lift days are leg days (so that heavy legs stay away from the long run)
   and it says when a session must be light.

   picks: { use, liftDays: [0..6], programme: 'full'|'upper-lower'|'ppl',
            runDays: [0..6], longRunDay: number|null } */

export const PROGRAMMES = [
  { id: "full", label: "Full body", detail: "Each session trains the whole body." },
  { id: "upper-lower", label: "Upper and lower", detail: "Upper-body days and leg days in turn." },
  { id: "ppl", label: "Push, pull, legs", detail: "Push day, pull day, leg day in turn." },
];
const PROGRAMME_IDS = PROGRAMMES.map((p) => p.id);
export const PROGRAMME_SPLIT = { full: "full", "upper-lower": "upper-lower", ppl: "ppl" };

// Heavy legs must not be on the long-run day, the day after it, or the 2 days before it.
const nearLong = (d, L) => L !== null && [L, (L + 1) % 7, (L + 6) % 7, (L + 5) % 7].includes(d);
const cdist = (a, b) => { const x = Math.abs(a - b) % 7; return Math.min(x, 7 - x); };

function combos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combos(t, k - 1).map((c) => [h, ...c]), ...combos(t, k)];
}

/* How many leg days a programme has for n lift days. */
export function legDayCount(programme, n) {
  if (programme === "full") return n;
  if (programme === "ppl") return n >= 3 ? Math.floor(n / 3) : 0;
  return Math.floor(n / 2); // upper and lower
}

/* The gym days for the picks. Leg days go where they are farthest from
   trouble: not near the long run, not next to each other, not next to a
   run day that could hold a hard run. A leg day that cannot be heavy is
   light, with a note. */
export function layoutGym(liftDays, programme, runDays = [], longRunDay = null) {
  const days = sortDays(liftDays);
  const prog = pick(programme, PROGRAMME_IDS, "full");
  const runs = sortDays(runDays);
  const L = Number.isInteger(longRunDay) && runs.includes(longRunDay) ? longRunDay : null;
  const k = legDayCount(prog, days.length);
  const quality = L === null ? [] : runs.filter((r) => r !== L && cdist(r, L) >= 2);
  const cost = (legs) => {
    let c = 0;
    for (const d of legs) {
      if (nearLong(d, L)) c += 100;
      if (legs.some((e) => e !== d && cdist(d, e) === 1)) c += 50;
      c += quality.filter((q) => cdist(q, d) <= 1).length * 5;
      if (runs.includes(d)) c += 3;
    }
    return c;
  };
  let legs = [];
  if (k > 0) {
    let best = null;
    for (const set of combos(days, k)) {
      const c = cost(set);
      if (!best || c < best.c) best = { c, set };
    }
    legs = best.set;
  }
  let pushNext = true;
  return days.map((day) => {
    const isLeg = legs.includes(day);
    let type; let name;
    if (prog === "full") { type = "full"; name = "Full body"; }
    else if (!isLeg) {
      type = "upper";
      if (prog === "ppl") { name = pushNext ? "Push" : "Pull"; pushNext = !pushNext; } else name = "Upper body";
    } else { type = prog === "ppl" ? "legs" : "lower"; name = prog === "ppl" ? "Legs" : "Lower body"; }
    const legsToday = type !== "upper";
    const light = legsToday && nearLong(day, L);
    let note = "";
    if (light) {
      const ahead = L === null ? 0 : (L - day + 7) % 7;
      note = day === L ? "Light: the long run is on the same day." : ahead === 6 ? "Light: it is the day after the long run." : `Light: the long run is ${ahead === 1 ? "the next day" : "2 days later"}.`;
    }
    return { day, type, intensity: light ? "light" : "heavy", note, name };
  });
}

/* The 7-day week from the picks. Same shape as an engine.planWeek result. */
export function weekFromPicks(picks) {
  const p = picks || {};
  const use = normaliseUse(p.use) || "both";
  const runDays = usesRun(use) ? sortDays(p.runDays) : [];
  let longRunDay = Number.isInteger(p.longRunDay) && runDays.includes(p.longRunDay) ? p.longRunDay : null;
  if (longRunDay === null && runDays.length) longRunDay = runDays.includes(0) ? 0 : runDays.includes(6) ? 6 : runDays[runDays.length - 1];
  const prog = pick(p.programme, PROGRAMME_IDS, "full");
  const gymDays = usesLift(use) ? layoutGym(p.liftDays, prog, runDays, longRunDay) : [];
  const doubles = gymDays.filter((g) => runDays.includes(g.day)).map((g) => ({ day: g.day, first: "run", gapHours: 6 }));
  const restDays = ALL_DAYS.filter((d) => !runDays.includes(d) && !gymDays.some((g) => g.day === d));
  const name = (d) => DAY_NAMES_LONG[d];
  const reasons = [];
  const warnings = [];
  if (longRunDay !== null) reasons.push(`The long run is on ${name(longRunDay)}.`);
  for (const g of gymDays) {
    if (g.type === "upper") continue;
    if (g.intensity === "light") reasons.push(`${g.name} on ${name(g.day)} is light. ${g.note.replace(/^Light: /, "").replace(/^./, (c) => c.toUpperCase())}`);
    else if (longRunDay !== null) reasons.push(`${name(g.day)}: ${g.name}. It is ${(longRunDay - g.day + 7) % 7} days before the long run.`);
  }
  for (const d of doubles) reasons.push(`${name(d.day)} has a run and a lift. Run first. Wait 6 hours or more before you lift.`);
  if (restDays.length) reasons.push(`${restDays.map(name).join(", ").replace(/, ([^,]*)$/, " and $1")} ${restDays.length === 1 ? "is a rest day" : "are rest days"}.`);
  else warnings.push("You have no rest day. Keep at least one full rest day a week.");
  if (usesLift(use) && prog === "ppl" && gymDays.length < 3) warnings.push("Push, pull, legs needs 3 lift days or more for a leg day. With fewer days, your week has no leg day.");
  return { runDays, longRunDay, gymDays, doubles, restDays, split: PROGRAMME_SPLIT[prog], programme: prog, reasons, warnings };
}

/* The first picks: the earlier week if there is one, else a simple default. */
export function defaultPicks(use, prev) {
  const u = normaliseUse(use) || "both";
  const m = prev || {};
  const prevRuns = Array.isArray(m.runDays) && m.runDays.length ? sortDays(m.runDays) : null;
  const prevLifts = Array.isArray(m.gymDays) && m.gymDays.length ? sortDays(m.gymDays.map((g) => g.day)) : null;
  const programme = pick(m.liftProgramme, PROGRAMME_IDS, m.liftSplit === "upper-lower" || m.liftSplit === "upper-lower-upper" ? "upper-lower" : "full");
  const runDays = usesRun(u) ? prevRuns || [2, 4, 6] : [];
  const liftDays = usesLift(u) ? prevLifts || (u === "lift" ? [1, 3, 5] : [1, 3]) : [];
  const longRunDay = usesRun(u) ? (Number.isInteger(m.longRunDay) && runDays.includes(m.longRunDay) ? m.longRunDay : runDays.includes(6) ? 6 : runDays[runDays.length - 1]) : null;
  return { use: u, liftDays, programme, runDays, longRunDay };
}

/* The answers that toMasterRecord, toProfilePatch and checkWeek expect, from the picks. */
export function picksToAnswers(picks, profile = {}) {
  const p = picks || {};
  const use = normaliseUse(p.use) || "both";
  const overlap = sortDays(p.runDays).some((d) => sortDays(p.liftDays).includes(d));
  return {
    use,
    availableDays: ALL_DAYS.slice(),
    runDays: usesRun(use) ? sortDays(p.runDays).length : 0,
    liftDays: usesLift(use) ? sortDays(p.liftDays).length : 0,
    priority: use === "both" ? "equal" : use === "lift" ? "lift" : "run",
    doubles: use === "both" && overlap,
    runLevel: pick(profile && profile.experience, RUN_LEVELS, "some"),
    liftLevel: pick(profile && profile.liftLevel, LIFT_LEVELS, "intermediate"),
    longRunDay: Number.isInteger(p.longRunDay) ? p.longRunDay : undefined,
    programme: pick(p.programme, PROGRAMME_IDS, "full"),
  };
}
