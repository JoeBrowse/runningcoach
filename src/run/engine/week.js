/* Hybrid week: places runs, gym days and rest days in one week (spec v1.1 section 3).
   The rules come from docs/research/concurrent-training.md ("Rules that Skid Marks uses").
   Pure functions. No DOM, no storage, no network.

   How planWeek works:
   1. Clean the input. Apply the caps (4 lift days at most, 4 only with lifting priority;
      5 runs at most for new runners).
   2. Search every layout of the week for the session counts. The long run day is fixed first
      (preferred day, else a weekend day, else the last available day). Hard rules make a
      layout not valid. Soft rules give each valid layout a cost. The layout with the lowest
      cost wins.
   3. When no layout is valid, reduce the lower-priority side by one session and search again.
   4. Write the reasons (one per rule applied) and the warnings. */

import { DAY_NAMES_LONG } from './util.js';

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const monIdx = (d) => (d + 6) % 7;
const cd = (a, b) => { const x = Math.abs(a - b) % 7; return Math.min(x, 7 - x); };
const ahead = (a, b) => (b - a + 7) % 7; // days from a forward to b
const bit = (d) => 1 << d;
const pop = (m) => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
const byWeek = (a, b) => monIdx(a) - monIdx(b);
const LEG = new Set(['lower', 'full', 'legs']);
const TYPE_NAME = { upper: 'Upper body', lower: 'Lower body', full: 'Full body', legs: 'Legs' };
const SIDE_NAME = { run: 'running', lift: 'lifting' };
const SESSION_NAME = { upper: 'an upper-body session', lower: 'a lower-body session', full: 'a full-body session', legs: 'a leg session' };

/* Cost of the soft rules. A lower cost is better. */
const COST = {
  pair: 100, // two sessions on one day
  pairLegs: 20, // extra: heavy or lower-body lift on a run day
  qualityHasLift: 50, // every free hard-run day also has a lift
  runsTouch: 10, // two run days next to each other
  runsTouchNew: 40, // the same for a new runner: new runners run on alternate days
  runStreak: 60, // each run day after 2 run days in a row
  runAfterLong: 8, // a run on the day after the long run
  runAfterLongNew: 60, // the same for a new runner
  sameLiftTouch: 20, // two lift days of the same kind next to each other
  liftTouch: 2, // two lift days of a different kind next to each other
  upperAfterLong: 3,
  upperBeforeLong: 2,
  legsBeforeLong: 30, // a light leg session on the day before the long run
  legsAfterLong: 20, // a light leg session on the day after the long run
  streak: 5, // each training day after 3 in a row
};

/* The costs that the priority sets (spec v1.1 section 3: "priority first").
   - lightLegs: a leg session that must be light so that a hard run fits.
   - noQuality: no run day is free for a hard run (too close to the long run or next to heavy legs).
     noQuality3 is the same with 3 or more runs a week. Runners with 2 runs or fewer start with
     easy weeks (docs/v1-spec.md, rule 5), so a hard run matters more with 3 runs or more.
   - noSecondQuality: room for only one hard run when the runner can do two.
   Running priority: a light leg day costs less than a lost hard run.
   Lifting priority or equal: the leg days stay heavy, and the runs stay easy. */
const PRIORITY_COST = {
  run: { lightLegs: 200, noQuality: 600, noQuality3: 1500, noSecondQuality: 250 },
  equal: { lightLegs: 1000, noQuality: 300, noQuality3: 1200, noSecondQuality: 40 },
  lift: { lightLegs: 2000, noQuality: 150, noQuality3: 400, noSecondQuality: 20 },
};
/* New runners do no hard runs for the first weeks: a lost hard-run day costs little. */
const NEW_RUNNER_NO_QUALITY = 60;

function listDays(days) {
  const n = days.map((d) => DAY_NAMES_LONG[d]);
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n.at(-1)}`;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function combos(arr, k) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i <= arr.length - (k - acc.length); i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  if (k >= 0 && k <= arr.length) rec(0, []);
  return out;
}

/** The split for a number of lift days. 1 or 2: full body. 3: upper, lower, upper. 4: upper, lower, upper, lower. */
export function splitFor(liftDays) {
  if (liftDays <= 0) return null;
  if (liftDays <= 2) return 'full';
  if (liftDays === 3) return 'upper-lower-upper';
  return 'upper-lower';
}

/* The possible type orders for the lift days (in week order). */
function typeOptions(n) {
  if (n <= 0) return [[]];
  if (n <= 2) return [Array(n).fill('full')];
  if (n === 3) return [['lower', 'upper', 'upper'], ['upper', 'lower', 'upper'], ['upper', 'upper', 'lower']];
  return [['upper', 'lower', 'upper', 'lower'], ['lower', 'upper', 'lower', 'upper']];
}

function normalize(input = {}) {
  const use = ['run', 'lift', 'both'].includes(input.use) ? input.use : 'both';
  const avail = [...new Set((Array.isArray(input.availableDays) ? input.availableDays : []).map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort(byWeek);
  const runLevel = ['new', 'some', 'experienced'].includes(input.runLevel) ? input.runLevel : 'some';
  const liftLevel = ['beginner', 'intermediate', 'advanced'].includes(input.liftLevel) ? input.liftLevel : 'intermediate';
  const priority = use === 'run' ? 'run' : use === 'lift' ? 'lift' : ['run', 'lift', 'equal'].includes(input.priority) ? input.priority : 'equal';
  const count = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(7, n)) : 0; };
  const runs = use === 'lift' ? 0 : count(input.runDays);
  const lifts = use === 'run' ? 0 : count(input.liftDays);
  const pref = Number.isInteger(input.longRunDay) && input.longRunDay >= 0 && input.longRunDay <= 6 ? input.longRunDay : null;
  // 2 rest days for a new runner (impact on bones and tendons is new), or for a new lifter who
  // only lifts. A new lifter who already runs keeps 1 rest day: the lift sessions start light.
  const beginner = (use !== 'lift' && runLevel === 'new') || (use === 'lift' && liftLevel === 'beginner');
  // A new lifter who also runs starts with light sessions (no heavy legs).
  const lightStart = use === 'both' && liftLevel === 'beginner';
  const cost = { ...PRIORITY_COST[priority] };
  if (runLevel === 'new') { cost.noQuality = NEW_RUNNER_NO_QUALITY; cost.noQuality3 = NEW_RUNNER_NO_QUALITY; }
  return { use, avail, runLevel, liftLevel, priority, doubles: input.doubles === true, runs, lifts, pref, beginner, lightStart, cost, restMin: beginner ? 2 : 1 };
}

/* The long-run day: the preferred day if it is available, else Sunday, else Saturday,
   else the last available day of the week. */
function chooseLong(o) {
  if (o.pref != null && o.avail.includes(o.pref)) return { day: o.pref, why: 'pref' };
  if (o.avail.includes(0)) return { day: 0, why: 'weekend' };
  if (o.avail.includes(6)) return { day: 6, why: 'weekend' };
  return { day: o.avail.at(-1), why: 'last' };
}

/* Heavy legs days must not be the day of, the day after, or the 2 days before the long run. */
const legsNearLong = (h, L) => L != null && (h === L || h === (L + 1) % 7 || h === (L + 6) % 7 || h === (L + 5) % 7);

/* Scores one layout. Returns null when a hard rule fails. */
function evaluate(o, L, runDays, liftDays, types, R, Lf) {
  const runMask = runDays.reduce((m, d) => m | bit(d), 0);
  const liftMask = liftDays.reduce((m, d) => m | bit(d), 0);
  const typeOf = new Map(liftDays.map((d, i) => [d, types[i]]));
  let cost = 0;
  // pairs: a lift on a run day. Never on the long-run day.
  const pairs = liftDays.filter((d) => runMask & bit(d));
  // "No" to two sessions on one day is a firm rule. When the sessions do not fit, planWeek
  // reduces the lower-priority side instead.
  if (!o.doubles && pairs.length) return null;
  for (const p of pairs) {
    if (p === L) return null;
    cost += COST.pair + (LEG.has(typeOf.get(p)) ? COST.pairLegs : 0);
  }

  // quality room: run days 2 or more days from the long run (the same test as buildPlan)
  const geo = R >= 2 ? runDays.filter((d) => d !== L && (L == null || cd(d, L) >= 2)) : [];
  // leg days: each one is heavy or light. Try every choice (2 leg days at most).
  const legDays = liftDays.filter((d) => LEG.has(typeOf.get(d)));
  let best = null;
  // A new lifter who also runs: every session is light (no heavy choice).
  const masks = o.lightStart ? 1 : 1 << legDays.length;
  for (let mask = 0; mask < masks; mask++) {
    const heavy = legDays.filter((_, i) => mask & (1 << i));
    if (heavy.some((h) => legsNearLong(h, L))) continue;
    if (heavy.some((h) => heavy.some((k) => k !== h && cd(h, k) === 1))) continue; // hard days must not touch
    const H = new Set(heavy);
    const clean = geo.filter((d) => !H.has(d) && !H.has((d + 6) % 7) && !H.has((d + 1) % 7));
    // A run day next to heavy legs is an easy run. Losing the hard-run day is a cost, not a hard rule.
    let c = o.lightStart ? 0 : (legDays.length - heavy.length) * o.cost.lightLegs;
    if (R >= 2 && !clean.length) c += R >= 3 ? o.cost.noQuality3 : o.cost.noQuality;
    if (clean.length && clean.every((d) => liftMask & bit(d))) c += COST.qualityHasLift;
    if (R >= 4 && o.runLevel !== 'new' && clean.length && !clean.some((a) => clean.some((b) => cd(a, b) >= 2))) c += o.cost.noSecondQuality;
    if (!best || c < best.c) best = { c, heavy: H, clean };
  }
  if (!best) return null;
  cost += best.c;

  // spread runs and lifts
  const isNew = o.runLevel === 'new';
  for (let i = 0; i < runDays.length; i++) for (let j = i + 1; j < runDays.length; j++) if (cd(runDays[i], runDays[j]) === 1) cost += isNew ? COST.runsTouchNew : COST.runsTouch;
  if (L != null && runMask & bit((L + 1) % 7)) cost += isNew ? COST.runAfterLongNew : COST.runAfterLong;
  // three or more runs in a row (also across the end of the week)
  if (R >= 3 && R < 7) {
    const start = WEEK.findIndex((d) => !(runMask & bit(d)));
    let run = 0;
    for (let k = 1; k <= 7; k++) {
      if (runMask & bit(WEEK[(start + k) % 7])) { run++; if (run > 2) cost += COST.runStreak; } else run = 0;
    }
  }
  for (let i = 0; i < liftDays.length; i++) for (let j = i + 1; j < liftDays.length; j++) {
    if (cd(liftDays[i], liftDays[j]) !== 1) continue;
    const a = typeOf.get(liftDays[i]), b = typeOf.get(liftDays[j]);
    cost += a === b || (LEG.has(a) && LEG.has(b)) ? COST.sameLiftTouch : COST.liftTouch;
  }
  if (L != null) for (const d of liftDays) {
    if (LEG.has(typeOf.get(d)) && d === (L + 6) % 7) cost += COST.legsBeforeLong;
    if (LEG.has(typeOf.get(d)) && d === (L + 1) % 7) cost += COST.legsAfterLong;
    if (typeOf.get(d) !== 'upper') continue;
    if (d === (L + 1) % 7) cost += COST.upperAfterLong;
    if (d === (L + 6) % 7) cost += COST.upperBeforeLong;
  }
  // long blocks of training days with no rest
  const train = runMask | liftMask;
  if (pop(train) < 7) {
    let start = WEEK.findIndex((d) => !(train & bit(d)));
    let run = 0;
    for (let k = 1; k <= 7; k++) {
      const d = WEEK[(start + k) % 7];
      if (train & bit(d)) { run++; if (run > 3) cost += COST.streak; } else run = 0;
    }
  }
  return { cost, heavy: best.heavy, clean: best.clean, geo, pairs, typeOf };
}

/* The best layout for R runs and Lf lifts, or null. */
function search(o, R, Lf) {
  const A = o.avail;
  if (R > A.length || Lf > A.length) return null;
  const long = R ? chooseLong(o) : null;
  const L = long ? long.day : null;
  const others = A.filter((d) => d !== L);
  const liftPool = A.filter((d) => d !== L);
  const runSets = R ? combos(others, R - 1).map((s) => [L, ...s].sort(byWeek)) : [[]];
  const liftSets = combos(liftPool, Lf);
  const opts = typeOptions(Lf);
  let best = null;
  for (const runDays of runSets) {
    const runMask = runDays.reduce((m, d) => m | bit(d), 0);
    for (const liftDays of liftSets) {
      const liftMask = liftDays.reduce((m, d) => m | bit(d), 0);
      if (pop(runMask | liftMask) > o.maxTrain) continue;
      for (const types of opts) {
        const ev = evaluate(o, L, runDays, liftDays, types, R, Lf);
        if (ev && (!best || ev.cost < best.cost)) best = { ...ev, runDays, liftDays, types, L, long };
      }
    }
  }
  return best;
}

/**
 * Plans one hybrid week (spec v1.1 section 3).
 * input: {use, availableDays, runDays, liftDays, priority, doubles, runLevel, liftLevel, longRunDay?}
 * Returns {runDays, longRunDay, gymDays, doubles, restDays, split, reasons, warnings}.
 * Day lists are in week order (Monday first). 0 = Sunday.
 */
export function planWeek(input = {}) {
  const o = normalize(input);
  const warnings = [];
  const reasons = [];
  const empty = (msg) => {
    if (msg) warnings.push(msg);
    return { runDays: [], longRunDay: null, gymDays: [], doubles: [], restDays: WEEK.slice(), split: null, reasons, warnings };
  };
  if (!o.avail.length) {
    if (o.runs + o.lifts > 0) return empty('Choose at least 1 day for training. We cannot plan a week with no training days.');
    return empty(null);
  }
  o.maxTrain = Math.min(o.avail.length, 7 - o.restMin);

  // caps
  let R = o.runs, Lf = o.lifts;
  if (o.runLevel === 'new' && R > 5) { R = 5; warnings.push('New runners run at most 5 days a week. We planned 5 runs. Rest days let your body adapt.'); }
  if (Lf > 4) { Lf = o.priority === 'lift' ? 4 : 3; warnings.push(`Skid Marks plans ${Lf} lift days a week at most${o.priority === 'lift' ? '' : ' when lifting is not your priority'}. We planned ${Lf} lift days.`); }
  else if (Lf === 4 && o.priority !== 'lift') { Lf = 3; warnings.push('4 lift days are only for people who make lifting the priority. We planned 3 lift days: upper, lower, upper.'); }
  const capR = R, capL = Lf;
  const floorR = R > 0 ? 1 : 0, floorL = Lf > 0 ? 1 : 0;

  // fit: reduce the lower-priority side first
  let layout = search(o, R, Lf);
  let turn = 'lift';
  while (!layout) {
    let side = null;
    if (o.priority === 'run') side = Lf > floorL ? 'lift' : R > floorR ? 'run' : null;
    else if (o.priority === 'lift') side = R > floorR ? 'run' : Lf > floorL ? 'lift' : null;
    else {
      side = turn;
      if (side === 'lift' && Lf <= floorL) side = 'run';
      if (side === 'run' && R <= floorR) side = Lf > floorL ? 'lift' : null;
      turn = side === 'lift' ? 'run' : 'lift';
    }
    if (!side) break;
    if (side === 'lift') Lf--; else R--;
    layout = search(o, R, Lf);
  }

  let forcedPair = false;
  if (!layout) {
    // Only 1 training day, and both sides chosen (the only case that reaches here).
    if (o.doubles) { forcedPair = true; layout = onePairDay(o); } else {
      const drop = o.priority === 'lift' ? 'run' : 'lift';
      if (drop === 'lift') Lf = 0; else R = 0;
      layout = search(o, R, Lf);
      warnings.push(`You have 1 training day, and you cannot train twice on one day. We planned only ${SIDE_NAME[drop === 'lift' ? 'run' : 'lift']}.`);
    }
    if (!layout) return empty('We cannot fit a session in your days. Choose more training days.');
  }
  if (forcedPair) { R = 1; Lf = 1; }

  const why = restWhy(o);
  const prioText = o.use !== 'both' ? '' : o.priority === 'equal' ? 'Running and lifting are equal. Each side gives one session in turn, lifting first.' : `${o.priority === 'run' ? 'Running' : 'Lifting'} is your priority.`;
  if (Lf < capL) warnings.push(`Too many sessions for your days. We reduced lifting to ${Lf}. ${prioText ? prioText + ' ' : ''}${why}`);
  if (R < capR) warnings.push(`Too many sessions for your days. We reduced running to ${R}. ${prioText ? prioText + ' ' : ''}${why}`);

  return describe(o, layout, R, Lf, reasons, warnings, forcedPair);
}

function restWhy(o) {
  if (o.restMin === 2) return o.use === 'lift' ? 'Beginners need at least 2 rest days a week.' : 'New runners need at least 2 rest days a week.';
  return 'You need at least 1 rest day a week.';
}

/* One available day, both sides, doubles allowed: the run and a light full-body lift share it. */
function onePairDay(o) {
  const L = o.avail[0];
  return { cost: 0, heavy: new Set(), clean: [], geo: [], pairs: [L], typeOf: new Map([[L, 'full']]), runDays: [L], liftDays: [L], types: ['full'], L, long: chooseLong(o), forced: true };
}

function describe(o, lay, R, Lf, reasons, warnings, forcedPair) {
  const L = lay.L;
  const first = o.priority === 'lift' ? 'lift' : 'run';
  const firstText = first === 'run' ? 'Do the run first.' : 'Do the lift first.';
  const runDays = lay.runDays.slice().sort(byWeek);
  const split = splitFor(Lf);
  const gymDays = lay.liftDays.slice().sort(byWeek).map((day) => {
    const type = lay.typeOf.get(day);
    const legs = LEG.has(type);
    const intensity = legs ? (lay.heavy.has(day) ? 'heavy' : 'light') : o.priority === 'run' || o.lightStart ? 'light' : 'heavy';
    let note = '';
    if (lay.pairs.includes(day)) note = `Same day as ${day === L ? 'the long run' : 'an easy run'}. ${firstText} Wait 6 hours or more.`;
    else if (o.lightStart) note = 'Light session. You are new to lifting.';
    else if (legs && intensity === 'light') note = 'Light session. A heavy leg session here is too close to a key run.';
    return { day, type, intensity, note };
  });
  const doubles = lay.pairs.slice().sort(byWeek).map((day) => ({ day, first, gapHours: 6 }));
  const train = new Set([...runDays, ...gymDays.map((g) => g.day)]);
  const restDays = WEEK.filter((d) => !train.has(d));
  const unavailable = WEEK.filter((d) => !o.avail.includes(d));

  // reasons: one per rule applied
  if (unavailable.length) reasons.push(`You cannot train on ${listDays(unavailable)}. ${unavailable.length === 1 ? 'This day is a rest day' : 'These days are rest days'}.`);
  if (L != null) {
    const n = DAY_NAMES_LONG[L];
    if (lay.long.why === 'pref') reasons.push(`The long run is on ${n}. You chose this day.`);
    else {
      const pre = o.pref != null ? `Your long-run day (${DAY_NAMES_LONG[o.pref]}) is not a training day. ` : '';
      reasons.push(lay.long.why === 'weekend' ? `${pre}The long run is on ${n}, a weekend day.` : `${pre}The long run is on ${n}, your last training day of the week.`);
    }
  }
  if (R >= 2) {
    const isNew = o.runLevel === 'new';
    if (lay.clean.length) {
      const q = lay.clean.slice().sort((a, b) => cd(b, L) - cd(a, L) || ahead(L, a) - ahead(L, b))[0];
      if (isNew) reasons.push(`New runners start with easy runs. Later in the plan, ${DAY_NAMES_LONG[q]} can have a harder run.`);
      else reasons.push(lay.heavy.size
        ? `${DAY_NAMES_LONG[q]} can have a hard run. No heavy leg session is in the 48 hours before it.`
        : `${DAY_NAMES_LONG[q]} can have a hard run. It is 2 or more days from the long run.`);
    } else if (!lay.geo.length) reasons.push(isNew ? 'New runners start with easy runs. No run day is 2 or more days from the long run, so all your runs stay easy.' : 'No run day is 2 or more days from the long run. All your runs stay easy.');
    else {
      const d = lay.geo.slice().sort(byWeek)[0];
      const why = isNew ? 'New runners start with easy runs.' : o.priority === 'lift' ? 'Lifting is your priority, so the leg days stay heavy.' : 'Running and lifting are equal, so the leg days stay heavy.';
      reasons.push(`All your runs stay easy. A hard run on ${DAY_NAMES_LONG[d]} would be next to a heavy leg day. ${why}`);
    }
  }
  if (split) {
    reasons.push(split === 'full' ? `${plural(Lf, 'lift day')}: full body each time.`
      : split === 'upper-lower-upper' ? '3 lift days: upper, lower, upper. This gives 1 leg day a week.'
        : '4 lift days: upper, lower, upper, lower. Lifting is your priority.');
  }
  for (const g of gymDays) {
    if (!LEG.has(g.type)) continue;
    const name = TYPE_NAME[g.type];
    if (g.intensity === 'heavy') {
      reasons.push(L != null ? `${name} is on ${DAY_NAMES_LONG[g.day]}. The long run is on ${DAY_NAMES_LONG[L]}, ${plural(ahead(g.day, L), 'day')} later.` : `${name} is on ${DAY_NAMES_LONG[g.day]}. It is a heavy session.`);
    } else if (forcedPair) {
      reasons.push(`${name} on ${DAY_NAMES_LONG[g.day]} is light. It is on the same day as the long run.`);
    } else if (o.lightStart) {
      reasons.push(`${name} on ${DAY_NAMES_LONG[g.day]} is light, because you are new to lifting.`);
    } else {
      reasons.push(`${name} on ${DAY_NAMES_LONG[g.day]} is light. A heavy leg session there is too close to the long run or to the day for a hard run.`);
    }
  }
  const heavyLegs = gymDays.filter((g) => LEG.has(g.type) && g.intensity === 'heavy');
  if (heavyLegs.length && L != null) {
    reasons.push('Heavy legs are 3 or more days before the long run, and not on the day after it.');
    const close = heavyLegs.find((g) => ahead(g.day, L) === 3);
    if (close) reasons.push(`Lift early in the day on ${DAY_NAMES_LONG[close.day]}. Then the long run is 72 hours or more later.`);
  }
  if (o.lightStart && gymDays.length) reasons.push('After 6 to 8 weeks of light sessions, you can change a session to heavy.');
  const uppers = gymDays.filter((g) => g.type === 'upper').map((g) => g.day);
  if (uppers.length) reasons.push(o.use === 'lift' ? `Upper body is on ${listDays(uppers)}.` : `Upper body is on ${listDays(uppers)}. Upper-body work has little effect on your runs.`);
  for (const d of doubles) {
    const g = gymDays.find((x) => x.day === d.day);
    const what = d.day === L ? 'the long run' : 'an easy run';
    reasons.push(`${DAY_NAMES_LONG[d.day]} has ${what} and ${SESSION_NAME[g.type]}. ${firstText} Wait 6 hours or more before the second session.`);
  }
  if (restDays.length) reasons.push(`${listDays(restDays)} ${restDays.length === 1 ? 'is a rest day' : 'are rest days'}. ${restWhy(o)}`);

  return { runDays, longRunDay: L, gymDays, doubles, restDays, split, reasons, warnings };
}

/* ---------- starting weeks ---------- */

const BANDS = {
  beginner: { trainingDays: { min: 4, max: 5 }, restDays: { min: 2, max: 3 }, minRestDays: 2 },
  intermediate: { trainingDays: { min: 5, max: 6 }, restDays: { min: 1, max: 2 }, minRestDays: 1 },
  advanced: { trainingDays: { min: 6, max: 6 }, restDays: { min: 1, max: 1 }, minRestDays: 1 },
};
const RUN_BAND = { new: 'beginner', some: 'intermediate', experienced: 'advanced' };
const RUN_BASE = { new: 3, some: 3, experienced: 4 };
const LIFT_BASE = { beginner: 1, intermediate: 2, advanced: 2 };
const LIFT_PRIORITY = { beginner: 2, intermediate: 3, advanced: 4 };
const BAND_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * Default counts from the "Starting weeks" table of the research note.
 * Returns {use, runDays, liftDays, priority, split, doublesAllowed, minRestDays, trainingDays:{min,max}, restDays:{min,max}, reasons}.
 * `doublesAllowed` is information only: the default answer to "Can you train twice on one day?" stays no.
 */
export function recommendWeek({ use, runLevel, liftLevel, priority } = {}) {
  const u = ['run', 'lift', 'both'].includes(use) ? use : 'both';
  const rl = ['new', 'some', 'experienced'].includes(runLevel) ? runLevel : 'some';
  const ll = ['beginner', 'intermediate', 'advanced'].includes(liftLevel) ? liftLevel : 'intermediate';
  const pr = u === 'run' ? 'run' : u === 'lift' ? 'lift' : ['run', 'lift', 'equal'].includes(priority) ? priority : 'equal';
  const reasons = [];
  let runs = 0, lifts = 0, band;
  if (u === 'run') {
    band = RUN_BAND[rl];
    runs = RUN_BASE[rl] + (rl === 'new' ? 0 : 1);
    reasons.push(rl === 'new' ? 'New runners start with 3 run/walk days a week.' : `${runs} runs a week suit your level.`);
  } else if (u === 'lift') {
    band = ll;
    lifts = LIFT_PRIORITY[ll];
    reasons.push(`${lifts} lift days a week suit your level.`);
  } else {
    // A new runner is a beginner. A new lifter who already runs counts as intermediate at most
    // (1 rest day, light lift sessions at the start), the same rule as planWeek.
    const liftBand = ll === 'beginner' ? 'intermediate' : ll;
    band = rl === 'new' ? 'beginner' : BAND_RANK[RUN_BAND[rl]] <= BAND_RANK[liftBand] ? RUN_BAND[rl] : liftBand;
    const max = BANDS[band].trainingDays.max;
    runs = RUN_BASE[rl]; lifts = LIFT_BASE[ll];
    const runFloor = 3, liftFloor = ll === 'beginner' ? 1 : 2;
    if (pr === 'run' && rl !== 'new') runs += 1;
    if (pr === 'lift') lifts = LIFT_PRIORITY[ll];
    // fit the training days: the lower-priority side gives first, then the priority side
    while (runs + lifts > max) {
      if (pr === 'run') { if (lifts > liftFloor) lifts--; else runs--; } else if (pr === 'lift') { if (runs > runFloor) runs--; else lifts--; } else if (lifts >= runs && lifts > liftFloor) lifts--; else runs--;
    }
    reasons.push(rl === 'new' ? 'New runners start with 3 run/walk days a week.' : `${runs} runs a week suit your running level.`);
    reasons.push(ll === 'beginner' && lifts === 1 ? 'Beginners gain strength with 1 lift day a week.' : lifts <= 2 ? 'Two lift days a week give most of the strength gains for people who run.' : `${lifts} lift days a week, because lifting is your priority.`);
  }
  const b = BANDS[band];
  reasons.push(b.minRestDays === 2 ? 'Beginners need at least 2 rest days a week.' : 'You need at least 1 rest day a week.');
  return {
    use: u, runDays: runs, liftDays: lifts, priority: pr, split: splitFor(lifts),
    doublesAllowed: u === 'both' && band === 'advanced',
    minRestDays: b.minRestDays, trainingDays: { ...b.trainingDays }, restDays: { ...b.restDays }, reasons,
  };
}
