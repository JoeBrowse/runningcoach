/* Adaptation: changes to a plan after real life happens.
   Rules: questions come before the change; every change has a reason;
   a move that breaks a safety rule is refused with the reason;
   a return ladder lives only on the plan that needs it and ends on its end date. */

import { toISO, addDays, daysBetween, round, sum, fmtTime, fmtDate } from './util.js';
import { paces, predict, checkResult, isValidScore, SCORE_MIN, SCORE_MAX } from './science.js';
import { makeWorkout, isRun, isHardRun } from './workouts.js';
import { allDays, reconcile, enforceWeeks, fixSpacing, overlayRace, ctxForPlan, classifyWeek, weekKm, recoveryDaysFor, buildPlan, GOALS, SAFETY, ChangeLog, isHeavyLegsDay } from './plan.js';

const clone = (plan) => structuredClone(plan);
function describe(w) { return w ? w.title + (w.km ? ` ${round(w.km)} km` : '') : '-'; }
function locate(plan, iso) {
  for (let wi = 0; wi < plan.weeks.length; wi++) {
    const di = plan.weeks[wi].days.findIndex((d) => d.iso === iso);
    if (di >= 0) return { wi, di, day: plan.weeks[wi].days[di], week: plan.weeks[wi] };
  }
  return null;
}
function markDisrupted(week) {
  if (week.disrupted || week.rebuild) return;
  if (classifyWeek(week) === 'normal' && !week.exempt) week.refKm = weekKm(week);
  week.disrupted = true;
}
function setDay(plan, iso, spec, reason, changes, mark = 'disrupted') {
  const loc = locate(plan, iso); if (!loc) return null;
  const before = loc.day;
  if (mark === 'disrupted') markDisrupted(loc.week);
  const nw = makeWorkout(iso, spec, ctxForPlan(plan)(loc.wi));
  nw.gym = before.gym; nw.adjusted = reason;
  if (before.done) nw.done = before.done;
  if (before.gymDone) nw.gymDone = before.gymDone; // marks of the date stay with the date
  if (before.unplanned) nw.unplanned = before.unplanned;
  loc.week.days[loc.di] = nw;
  if (mark === 'rebuild') { loc.week.rebuild = true; delete loc.week.disrupted; }
  changes.push({ iso, before: describe(before), after: describe(nw), reason });
  return nw;
}
function daysFrom(plan, fromIso, n) { return allDays(plan).filter((w) => w.iso >= fromIso).slice(0, n); }
const safetyFails = (checks) => checks.filter((c) => !c.ok);

/* ---------- gym days (spec v1.1 section 4) ----------
   A plan day can carry `gym` ({day, type, intensity, note, heavyLegs, advice, reason}).
   advice: 'normal' | 'maintenance' | 'skip-heavy' (lift light) | 'rest' (no gym session today).
   Advice only goes up. A gym day that is done (`gymDone`) does not change. */
const ADVICE_RANK = { normal: 0, maintenance: 1, 'skip-heavy': 2, rest: 3 };
const GYM_NAME = { upper: 'Upper body', lower: 'Lower body', full: 'Full body', legs: 'Legs', other: 'Gym' };
const LEG_GYM = new Set(['legs', 'lower', 'full']);
function gymText(g) {
  const label = g.advice === 'rest' ? 'rest' : g.advice === 'skip-heavy' ? 'light' : g.advice === 'maintenance' ? 'maintenance' : g.intensity;
  return `${GYM_NAME[g.type] || 'Gym'} (${label})`;
}
function setGymAdvice(P, iso, advice, reason, changes) {
  const loc = locate(P, iso);
  if (!loc || !loc.day.gym || loc.day.gymDone) return false;
  const g = loc.day.gym;
  if (ADVICE_RANK[advice] <= (ADVICE_RANK[g.advice] || 0)) return false;
  if ((advice === 'skip-heavy' || advice === 'maintenance') && g.intensity !== 'heavy') return false; // already light
  const ng = { ...g, advice, reason };
  if (advice === 'rest') { ng.plannedIntensity = g.plannedIntensity || g.intensity; ng.intensity = 'light'; ng.heavyLegs = false; }
  loc.day.gym = ng;
  changes.push({ iso, before: gymText(g), after: gymText(ng), reason, kind: 'gym' });
  return true;
}
const isHeavyGym = (d) => !!(d && d.gym && !d.gymDone && d.gym.intensity === 'heavy' && d.gym.advice !== 'skip-heavy' && d.gym.advice !== 'rest');
const isHeavyLegsGym = (d) => isHeavyGym(d) && LEG_GYM.has(d.gym.type);
const failKeys = (T) => { reconcile(T); return new Set(T.safety.flatMap((c) => c.failures.map((f) => `${c.id}: ${f}`))); };

function finish(P, changes, extra = {}) {
  const log = new ChangeLog();
  fixSpacing(P, ctxForPlan(P), log, P.warnings);
  enforceWeeks(P, ctxForPlan(P), log, P.warnings);
  for (const e of log.items) for (const iso of e.dates) changes.push({ iso, before: '', after: e.change, reason: e.reason });
  reconcile(P);
  return { plan: P, changes, questions: [], message: '', needsAnswers: false, ...extra };
}

/** Return-to-run stages (information). */
export function returnLadder(daysOff, cause) {
  if (cause === 'injury') return [
    { stage: 1, title: 'Walk', detail: 'Walk briskly for 30 minutes. Pain must stay at 3 out of 10 or less.' },
    { stage: 2, title: 'Walk/run 1:4', detail: 'Jog 1 minute, walk 4 minutes, 6 times. Every second day.' },
    { stage: 3, title: 'Walk/run 2:3', detail: 'Jog 2 minutes, walk 3 minutes, 6 times.' },
    { stage: 4, title: 'Walk/run 4:1', detail: 'Jog 4 minutes, walk 1 minute, 5 times.' },
    { stage: 5, title: 'Easy 20 to 30 minutes', detail: 'Easy running without a stop. No speed work yet.' },
    { stage: 6, title: 'Back to plan', detail: 'Rejoin the plan at lower distance. Speed work comes back last.' },
  ];
  if (daysOff <= 4) return [{ stage: 1, title: 'Continue', detail: 'No change is necessary. Do not make up missed runs.' }];
  if (daysOff <= 10) return [{ stage: 1, title: '3 easy days', detail: 'Easy runs only for 3 days.' }, { stage: 2, title: 'Week at 75%', detail: 'Then rejoin the plan.' }];
  if (daysOff <= 28) return [{ stage: 1, title: 'Week 1 at 50 to 60%', detail: 'Easy running only.' }, { stage: 2, title: 'Week 2 at 70 to 80%', detail: 'Strides come back.' }, { stage: 3, title: 'Back to plan', detail: 'Hard sessions come back.' }];
  return [{ stage: 1, title: 'Rebuild', detail: 'More than 4 weeks off. The plan starts again from your current level.' }];
}

const QUESTIONS = {
  illness: [
    { id: 'where', text: 'Where are your symptoms?', type: 'choice', options: [{ value: 'above', label: 'Only nose or throat' }, { value: 'below', label: 'Chest, stomach or whole body' }] },
    { id: 'fever', text: 'Do you have a fever?', type: 'bool' },
    { id: 'days', text: 'How many days have you felt unwell?', type: 'number' },
  ],
  injury: [
    { id: 'area', text: 'Where is the pain?', type: 'text' },
    { id: 'pain', text: 'Pain score from 0 to 10 when you run or walk?', type: 'number' },
    { id: 'limping', text: 'Do you limp?', type: 'bool' },
    { id: 'worseNextMorning', text: 'Is it worse the next morning?', type: 'bool' },
    { id: 'days', text: 'How many days have you had it?', type: 'number' },
  ],
  break: [
    { id: 'days', text: 'How many days did you not run?', type: 'number' },
    { id: 'cause', text: 'Why did you stop?', type: 'choice', options: [{ value: 'illness', label: 'Illness' }, { value: 'injury', label: 'Injury' }, { value: 'life', label: 'Life, work or travel' }] },
    { id: 'otherExercise', text: 'Did you do other exercise?', type: 'bool' },
    { id: 'painNow', text: 'Do you have pain now?', type: 'bool' },
  ],
};
function answersOf(event) { return { ...event, ...(event.answers || {}) }; }
function missing(kind, a) {
  const need = { illness: ['where', 'fever'], injury: ['area', 'pain', 'limping', 'worseNextMorning'], break: ['days', 'cause'] }[kind] || [];
  return need.filter((k) => a[k] == null || a[k] === '');
}
function ask(plan, kind, a) {
  const miss = missing(kind, a);
  if (!miss.length) return null;
  return { plan, changes: [], questions: QUESTIONS[kind], missing: miss, needsAnswers: true, message: 'Please answer these questions first. The plan changes after your answers.' };
}

function regeneratePaces(P, today, changes, before, reason) {
  const ctxFor = ctxForPlan(P);
  P.weeks.forEach((wk, wi) => wk.days.forEach((d, di) => {
    if (d.iso < today || !isRun(d) || d.done) return;
    const nw = makeWorkout(d.iso, d.spec, ctxFor(wi)); nw.gym = d.gym; nw.extra = d.extra; if (d.adjusted) nw.adjusted = d.adjusted;
    wk.days[di] = nw;
  }));
  changes.push({ iso: today, before: `Fitness score ${before}`, after: `Fitness score ${P.score}`, reason });
}

function trySafe(P, mutate) {
  const T = clone(P); mutate(T); reconcile(T);
  const fails = safetyFails(T.safety);
  return { ok: fails.length === 0, plan: T, fails };
}

function swapDays(P, fromIso, toIso) {
  const a = locate(P, fromIso), b = locate(P, toIso);
  const ctxFor = ctxForPlan(P);
  const A = a.day, B = b.day;
  const movedA = makeWorkout(toIso, A.spec, ctxFor(b.wi)); movedA.gym = B.gym; movedA.moved = { from: fromIso };
  const movedB = isRun(B) || B.type === 'strength' ? makeWorkout(fromIso, B.spec, ctxFor(a.wi)) : makeWorkout(fromIso, { type: 'rest' }, ctxFor(a.wi));
  movedB.gym = A.gym; if (isRun(B)) movedB.moved = { from: toIso };
  for (const k of ['gymDone', 'unplanned']) { if (B[k]) movedA[k] = B[k]; if (A[k]) movedB[k] = A[k]; } // marks of the date stay with the date
  b.week.days[b.di] = movedA; a.week.days[a.di] = movedB;
}

/** Checks a move. Returns {ok, reason}. */
export function checkMove(plan, fromIso, toIso, today) {
  const t = toISO(today || plan.createdIso);
  const a = locate(plan, fromIso), b = locate(plan, toIso);
  if (!a || !b) return { ok: false, reason: 'Both days must be inside the plan.' };
  if (fromIso === toIso) return { ok: false, reason: 'Choose a different day.' };
  if (toIso < t || fromIso < t) return { ok: false, reason: 'You cannot move a session to or from a past day.' };
  if (a.day.type === 'race' || b.day.type === 'race') return { ok: false, reason: 'Races do not move. Change the race date in Races.' };
  if (!isRun(a.day) && a.day.type !== 'strength') return { ok: false, reason: 'There is no session on that day.' };
  const res = trySafe(plan, (T) => swapDays(T, fromIso, toIso));
  if (!res.ok) return { ok: false, reason: `This move breaks a safety rule: ${res.fails[0].rule}. ${res.fails[0].failures[0]}`, failedRule: res.fails[0].id, plan: res.plan };
  return { ok: true, reason: b.day.km ? `Swaps with ${describe(b.day)}. All safety rules still pass.` : 'All safety rules still pass.', plan: res.plan };
}

/** Marks which days are safe for the session on `iso`. Looks 6 days back and 7 days ahead. */
export function suggestDays(plan, iso, ctx = {}) {
  const today = toISO(ctx.today || plan.createdIso);
  const out = [];
  for (let k = -6; k <= 7; k++) {
    if (!k) continue;
    const c = addDays(iso, k);
    if (c < today || !locate(plan, c)) continue;
    const r = checkMove(plan, iso, c, today);
    out.push({ iso: c, ok: r.ok, reason: r.reason });
  }
  return { iso, safe: out.filter((x) => x.ok).map((x) => x.iso), days: out };
}

function applyLadder(P, startIso, today, changes, cause) {
  // a return ladder over about 3 weeks on the run days, then hard sessions wait 2 more weeks
  const levels = [1, 1, 2, 3, 3, 4, 5, 6, 7, 8];
  const days = allDays(P).filter((d) => d.iso >= startIso && (isRun(d) && d.type !== 'race'));
  let k = 0; let endIso = startIso;
  for (const d of days) {
    if (daysBetween(startIso, d.iso) > 21 || k >= levels.length) break;
    setDay(P, d.iso, { type: 'runwalk', level: levels[k], mainMin: 20, walkMin: 5, why: `Return-to-run step ${k + 1} of ${levels.length}.` }, cause === 'injury' ? 'Return-to-run ladder after injury. Stop if pain is more than 3 out of 10.' : 'Return-to-run ladder after a long break.', changes, 'rebuild');
    endIso = d.iso; k++;
  }
  for (const d of allDays(P).filter((x) => x.iso > endIso && daysBetween(endIso, x.iso) <= 14)) {
    if (d.intensity === 'hard') setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 8)) }, 'Speed work comes back last after a return.', changes, 'rebuild');
  }
  P.activeLadder = { cause, startIso, endIso, stages: returnLadder(14, cause === 'injury' ? 'injury' : 'life'), planId: P.id, createdIso: today };
  return endIso;
}

/**
 * Changes the plan for an event. Returns
 * {plan, changes:[{iso, before, after, reason}], questions, needsAnswers, message, offers?, refused?, reason?, followUps?}.
 * The input plan is never changed.
 */
export function adapt(plan, event, ctx = {}) {
  const today = toISO(ctx.today || event.today || plan.createdIso);
  const P = clone(plan);
  const changes = [];
  // a ladder ends on its end date and belongs only to this plan
  if (P.activeLadder && (P.activeLadder.planId !== P.id || P.activeLadder.endIso < today)) P.activeLadder = null;
  const type = event && event.type;

  if (type === 'missed') {
    const w = locate(P, event.iso || event.date);
    if (!w || !isRun(w.day)) return { plan, changes, questions: [], message: 'There is no run on that day.', needsAnswers: false };
    const d = w.day;
    if (d.type === 'race') { d.missed = true; return finish(P, changes, { message: 'The race is marked as missed. Tell the coach if you want a new goal.' }); }
    if (d.intensity === 'easy') {
      setDay(P, d.iso, { type: 'rest', note: `Missed: ${describe(d)}` }, 'Missed easy run. Do not make up easy runs. Your week stays safe.', changes);
      return finish(P, changes, { message: 'No catch-up is necessary. One missed easy run does not change your fitness.' });
    }
    setDay(P, d.iso, { type: 'rest', note: `Missed: ${describe(d)}` }, 'Session missed.', changes);
    for (let k = 1; k <= 4; k++) {
      const c = addDays(d.iso, k); const loc = locate(P, c);
      if (!loc || c < today || loc.day.type === 'race' || isHardRun(loc.day)) continue;
      if (d.intensity === 'long' && loc.week !== w.week) break; // one long run a week
      const spec = d.intensity === 'long' ? { ...d.spec, km: round(d.km * 0.85, 1) } : d.spec;
      const res = trySafe(P, (T) => { const l = locate(T, c); const nw = makeWorkout(c, spec, ctxForPlan(T)(l.wi)); nw.gym = l.day.gym; markDisrupted(l.week); l.week.days[l.di] = nw; });
      if (res.ok) {
        setDay(P, c, spec, d.intensity === 'long' ? 'Long run moved here and made 15% shorter. No hard day touches it.' : 'Key session moved to the next safe day. It does not touch another hard day.', changes);
        return finish(P, changes, { message: d.intensity === 'long' ? 'We moved the long run and made it a little shorter.' : 'We moved the session to a safe day.' });
      }
    }
    return finish(P, changes, { message: 'No safe day is free in the next 4 days. We dropped the session. Two hard days together raise the risk of injury.' });
  }

  if (type === 'illness') {
    const a = answersOf(event); const q = ask(plan, 'illness', a); if (q) return q;
    const severe = a.where === 'below' || a.fever === true;
    const n = severe ? Math.max(3, Number(a.daysLeft) || 3) : Math.max(1, Number(a.daysLeft) || 2);
    for (const d of daysFrom(P, today, n)) {
      if (d.type === 'race' || d.type === 'rest') continue;
      if (severe || d.type === 'strength' || d.type === 'cross') setDay(P, d.iso, { type: 'rest' }, severe ? 'Fever or symptoms below the neck. Rest until you have had no symptoms for 24 hours.' : 'Illness: no strength session today.', changes);
      else if (isRun(d)) setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 5)) }, 'Symptoms above the neck only. A short easy run is OK if you feel fine. Stop if you feel worse.', changes);
    }
    for (const d of daysFrom(P, addDays(today, n), 4)) if (d.intensity === 'hard' || d.intensity === 'long') setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 6)) }, 'Easing back in after illness. Hard work comes back in a few days.', changes);
    for (const iso of daysFrom(P, today, n).map((d) => d.iso)) {
      setGymAdvice(P, iso, severe ? 'rest' : 'skip-heavy', severe ? 'Fever or symptoms below the neck. No gym session until you have had no symptoms for 24 hours.' : 'Symptoms above the neck only. A light session is OK if you feel fine. Stop if you feel worse.', changes);
    }
    for (const iso of daysFrom(P, addDays(today, n), 4).map((d) => d.iso)) setGymAdvice(P, iso, 'skip-heavy', 'Easing back in after illness. Lift light for a few days.', changes);
    return finish(P, changes, { message: severe ? 'Rest is training now. We cleared the next days and made the return gentle.' : 'Keep runs short and easy. We removed hard sessions for now.', followUps: Array.from({ length: 3 }, (_, i) => ({ iso: addDays(today, i + 1), question: 'How do you feel today?' })) });
  }

  if (type === 'injury') {
    const a = answersOf(event); const q = ask(plan, 'injury', a); if (q) return q;
    const pain = Number(a.pain);
    const severe = pain >= 4 || a.limping === true || a.worseNextMorning === true;
    const followUps = Array.from({ length: 7 }, (_, i) => ({ iso: addDays(today, i + 1), question: `How is your ${a.area}? Pain from 0 to 10?` }));
    if (severe) {
      const end = addDays(today, 13);
      for (const d of allDays(P).filter((x) => x.iso >= today && x.iso <= end)) {
        if (d.type === 'race' || d.type === 'rest') continue; // rest days stay rest days
        if (isRun(d)) setDay(P, d.iso, { type: 'cross', why: 'Only if it is pain-free.' }, `Pain ${pain}/10 in ${a.area}${a.limping ? ' with a limp' : ''}. No running. Pain-free cross-training only, if you want it.`, changes);
        else if (d.type === 'strength') setDay(P, d.iso, { type: 'rest' }, 'Injury: rest instead of strength until a physio or doctor says it is OK.', changes);
      }
      for (const iso of allDays(P).filter((x) => x.iso >= today && x.iso <= end && x.gym).map((x) => x.iso)) {
        const g = locate(P, iso).day.gym;
        if (LEG_GYM.has(g.type)) setGymAdvice(P, iso, 'rest', 'Injury: no leg or full-body gym session until a physio or doctor says it is OK.', changes);
        else setGymAdvice(P, iso, 'skip-heavy', 'Injury: light upper-body work only, if it is pain-free and does not load the painful area. Ask a physio or doctor first.', changes);
      }
      applyLadder(P, addDays(end, 1), today, changes, 'injury');
      return finish(P, changes, { message: 'Please see a physio or doctor. We stopped running for 2 weeks and added a return-to-run ladder. The app cannot diagnose injuries.', followUps });
    }
    for (const d of daysFrom(P, today, 5)) {
      if (!isRun(d) || d.type === 'race') continue;
      setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 4)) }, `Mild pain (${pain}/10) in ${a.area}. Short easy runs only, if pain stays at 3/10 or less during the run and the next morning.`, changes);
    }
    for (const iso of daysFrom(P, today, 5).filter((d) => d.gym && LEG_GYM.has(d.gym.type)).map((d) => d.iso)) {
      setGymAdvice(P, iso, 'skip-heavy', `Mild pain (${pain}/10) in ${a.area}. Light leg work only, if it is pain-free. See a physio or doctor if the pain stays.`, changes);
    }
    return finish(P, changes, { message: 'We made the next 5 days short and easy. Use the pain rule: 3/10 or less, and not worse the next morning.', followUps });
  }

  if (type === 'holiday') {
    const from = toISO(event.fromIso || event.from), to = toISO(event.toIso || event.to);
    if (to < from) return { plan, changes, questions: [], message: 'The end date is before the start date.', needsAnswers: false, refused: true, reason: 'The end date is before the start date.' };
    for (const d of allDays(P).filter((x) => x.iso >= from && x.iso <= to)) {
      if (d.type === 'race' || d.type === 'rest') continue;
      if (event.canRun && isRun(d)) setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 6)) }, 'Holiday. Optional short easy runs only. Enjoy it.', changes);
      else setDay(P, d.iso, { type: 'rest' }, 'Holiday. Full rest.', changes);
    }
    const off = daysBetween(from, to) + 1;
    if (!event.canRun && off > 4) for (const d of daysFrom(P, addDays(to, 1), 7)) if (d.intensity === 'hard') setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 6)) }, `Return week after ${off} days off. Hard sessions wait a week.`, changes);
    return finish(P, changes, { message: `Holiday set. ${changes.length} days changed. The return week is gentle.` });
  }

  if (type === 'break') {
    const a = answersOf(event); const q = ask(plan, 'break', a); if (q) return q;
    if (a.painNow === true || a.cause === 'injury') {
      const qi = ask(plan, 'injury', a);
      if (qi) return { ...qi, message: 'You have pain or an injury. Please answer these questions first.' };
      return adapt(plan, { ...a, type: 'injury' }, { today });
    }
    const days = Number(a.days);
    if (days <= 4) return finish(P, changes, { message: 'Welcome back. Carry on with the plan. Do not make up missed runs.' });
    if (days > 28) {
      const prevNormal = plan.weeks.filter((w) => w.check === 'normal' && w.startIso < today).at(-1);
      const fresh = buildPlan({ ...plan.opts, usualLongRunKm: undefined, runsPerWeek: undefined, peakWeekKm: undefined, longestRecentKm: undefined, today, startDate: undefined, currentWeeklyKm: round((prevNormal ? prevNormal.km : plan.limits.currentWeeklyKm) * (a.otherExercise ? 0.35 : 0.2), 1), score: Math.max(SCORE_MIN, round(plan.score - (days > 56 ? 3 : 2), 1)) });
      return { plan: fresh, changes: [{ iso: today, before: plan.goalName, after: `${fresh.goalName} (new start)`, reason: `${days} days off. The plan starts again from your current level.` }], questions: [], needsAnswers: false, message: 'Welcome back. We made a new plan that starts from your current level.' };
    }
    if (days <= 10) {
      for (const d of daysFrom(P, today, 7)) {
        if (!isRun(d) || d.type === 'race') continue;
        if (d.intensity === 'hard' || d.intensity === 'long' || daysBetween(today, d.iso) < 3) setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, round(Math.min(d.km, 8) * 0.75, 1)) }, `Back after ${days} days off. Easy running only for now.`, changes);
        else setDay(P, d.iso, { ...d.spec, km: Math.max(SAFETY.minRunKm, round(d.km * 0.75, 1)) }, `Back after ${days} days off. Distance at 75%.`, changes);
      }
      return finish(P, changes, { message: 'Welcome back. We made this week easier so you rebuild safely.' });
    }
    // 11-28 days: two rebuild weeks, then the plan grows again by 10% a week at most
    for (const d of daysFrom(P, today, 14)) {
      if (!isRun(d) || d.type === 'race') continue;
      const wk1 = daysBetween(today, d.iso) < 7; const f = wk1 ? 0.55 : 0.75;
      setDay(P, d.iso, { type: wk1 ? 'easy' : (d.type === 'strides' ? 'strides' : 'easy'), km: Math.max(SAFETY.minRunKm, round(Math.min(d.km, 10) * f, 1)) }, `Back after ${days} days off. Week ${wk1 ? 1 : 2} of the rebuild at ${Math.round(f * 100)}%. Easy running only.`, changes, 'rebuild');
    }
    P.activeLadder = { cause: a.cause || 'life', startIso: today, endIso: addDays(today, 13), stages: returnLadder(days, a.cause), planId: P.id };
    return finish(P, changes, { message: 'Welcome back. Two easy weeks first. Then the plan grows by 10% a week at most.' });
  }

  if (type === 'readiness') {
    const score = Number(event.score);
    const loc = locate(P, today); const w = loc && loc.day;
    let message = score >= 60 ? 'You are good to go. Train as planned.' : 'Take it easy today. No change to the plan was necessary.';
    if (w && score < 40 && (w.intensity === 'hard' || w.intensity === 'long')) { setDay(P, w.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(w.km, 6)) }, `Readiness is low (${score}/100). Today is easy instead. The hard session can wait.`, changes); message = 'We changed today to match how you feel.'; }
    else if (w && score < 60 && w.intensity === 'hard' && w.spec.reps != null) {
      const step = w.type === 'tempo' || w.type === 'racepace' ? 6 : 2;
      setDay(P, w.iso, { ...w.spec, reps: Math.max(1, w.spec.reps - step) }, `Readiness ${score}/100. A shorter session today.`, changes);
      message = 'We made today a little shorter to match how you feel.';
    }
    if (loc && score < 40 && setGymAdvice(P, today, 'skip-heavy', `Readiness is low (${score}/100). Lift light today, or rest.`, changes)) message = 'We changed today to match how you feel.';
    else if (loc && score < 60 && setGymAdvice(P, today, 'maintenance', `Readiness ${score}/100. Keep the weight, do fewer sets, and stop 3 or more reps before failure.`, changes) && !changes.some((c) => c.kind !== 'gym')) message = 'We made the gym session a little easier to match how you feel.';
    return finish(P, changes, { message });
  }

  if (type === 'feedback') {
    const f = event.kind === 'tooHard' ? -1 : event.kind === 'tooEasy' ? 0.8 : 0;
    if (!f) return { plan, changes, questions: [], needsAnswers: false, message: 'Use tooHard or tooEasy.', refused: true, reason: 'Unknown feedback.' };
    const before = P.score; P.score = round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, P.score + f)), 1); P.paces = paces(P.score); P.scoreSource = 'feedback';
    regeneratePaces(P, today, changes, before, event.kind === 'tooHard' ? 'You said the sessions feel too hard. Paces are about 2% slower.' : 'You said the sessions feel too easy. Paces are about 2% faster. A race or time trial gives a better update.');
    return finish(P, changes, { message: 'Paces are updated for all future sessions.' });
  }

  if (type === 'race' || type === 'result') {
    const r = checkResult(Number(event.distKm), Number(event.timeSec));
    if (!r.ok) return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: r.error, message: r.error };
    const before = P.score; const capped = Math.min(r.score, P.score + 3);
    P.score = round(capped, 1); P.paces = paces(P.score); P.scoreIso = toISO(event.iso || today); P.scoreSource = 'result';
    regeneratePaces(P, today, changes, before, `New result: ${fmtTime(event.timeSec)} for ${event.distKm} km.` + (r.score > capped ? ' A jump is limited to +3 for safety.' : ''));
    return finish(P, changes, { message: 'Good result. Paces are updated.' });
  }

  if (type === 'legHeavyDay') {
    const iso = toISO(event.iso || today);
    const mark = (T) => { const l = locate(T, iso); if (l) l.day.gym = { day: l.day.dow, type: 'legs', intensity: 'heavy', note: event.note || 'Logged leg-heavy activity', heavyLegs: true, advice: 'normal', reason: 'Logged.' }; };
    const T0 = clone(P); mark(T0);
    const offers = [];
    for (const k of [0, 1, 2]) {
      const c = addDays(iso, k); const loc = locate(T0, c); if (!loc) continue;
      const d = loc.day;
      const clash = (k <= 1 && isHardRun(d)) || (k === 2 && (d.intensity === 'long' || d.intensity === 'race'));
      if (!clash || d.type === 'race') continue;
      const why = `${d.title} on ${fmtDate(c)} is ${k === 0 ? 'on the same day as' : k === 1 ? 'the day after' : '2 days after'} a leg-heavy day. Heavy legs need 48 hours before a quality run and 72 hours before a long run.`;
      let found = null;
      for (let j = 1; j <= 6 && !found; j++) {
        const t = addDays(c, j); const tl = locate(T0, t);
        if (!tl || tl.day.type === 'race' || isHardRun(tl.day)) continue;
        const res = trySafe(T0, (X) => swapDays(X, c, t));
        if (res.ok) found = t;
      }
      offers.push(found ? { action: 'swap', fromIso: c, toIso: found, reason: `${why} Swap it with ${fmtDate(found)}?` } : { action: 'easy', iso: c, reason: `${why} No safe day is free, so run it easy.` });
    }
    if (!offers.length) return finish(P, changes, { message: 'Your next key runs are far enough away. No change is necessary.', offers });
    if (!event.apply) return { plan, changes, questions: [], needsAnswers: false, offers, message: offers[0].reason };
    mark(P);
    for (const o of offers) {
      if (o.action === 'swap') { swapDays(P, o.fromIso, o.toIso); changes.push({ iso: o.fromIso, before: '', after: `Moved to ${o.toIso}`, reason: o.reason }); } else { const d = locate(P, o.iso).day; setDay(P, o.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 8)) }, o.reason, changes); }
    }
    return finish(P, changes, { offers, message: 'Done. Your key runs are now far enough from the leg-heavy day.' });
  }

  if (type === 'tired') return tired(P, today, changes);
  if (type === 'unplannedSession') return unplannedSession(plan, P, event, today, changes);

  if (type === 'move') {
    const r = checkMove(P, toISO(event.fromIso), toISO(event.toIso), today);
    if (!r.ok) return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: r.reason, message: r.reason };
    const before = locate(P, event.fromIso).day;
    swapDays(P, event.fromIso, event.toIso);
    changes.push({ iso: event.toIso, before: describe(locate(plan, event.toIso).day), after: describe(before), reason: `Moved from ${event.fromIso} by you. ${r.reason}` });
    reconcile(P);
    return { plan: P, changes, questions: [], needsAnswers: false, message: 'Moved. All safety rules still pass.' };
  }

  if (type === 'drop') {
    const loc = locate(P, toISO(event.iso));
    if (!loc || (!isRun(loc.day) && loc.day.type !== 'strength' && loc.day.type !== 'cross')) return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: 'There is no session on that day.', message: 'There is no session on that day.' };
    if (loc.day.type === 'race') return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: 'The engine never drops a race. Remove it in Races.', message: 'The engine never drops a race. Remove it in Races.' };
    setDay(P, loc.day.iso, { type: 'rest', note: `Dropped: ${describe(loc.day)}` }, 'You dropped this session. Do not make it up later.', changes);
    return finish(P, changes, { message: 'Session dropped. Fewer runs are always safe.' });
  }

  if (type === 'repeatWeek') {
    const wn = Number(event.weekN || event.week);
    const idx = P.weeks.findIndex((w) => w.n === wn);
    const lastBuild = P.weeks.findIndex((w) => ['taper', 'race', 'recovery'].includes(w.kind));
    const end = lastBuild < 0 ? P.weeks.length : lastBuild;
    if (idx < 0 || idx >= end - 1) return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: 'This week cannot repeat. The taper or the end of the plan comes next.', message: 'This week cannot repeat.' };
    const ctxFor = ctxForPlan(P);
    for (let wi = end - 1; wi > idx; wi--) {
      const src = plan.weeks[wi - 1]; const dst = P.weeks[wi];
      dst.runWalkLevel = src.runWalkLevel; // cutback flags and targets stay on their calendar weeks
      dst.days = src.days.map((d, k) => {
        const iso = addDays(dst.startIso, k);
        if (d.type === 'race') return makeWorkout(iso, { type: 'rest' }, ctxFor(wi));
        const nw = makeWorkout(iso, d.spec, ctxFor(wi)); nw.gym = P.weeks[wi].days[k] ? P.weeks[wi].days[k].gym : null; nw.extra = d.extra; return nw;
      });
    }
    changes.push({ iso: P.weeks[idx + 1].startIso, before: `Week ${idx + 2}`, after: `Repeat of week ${wn}`, reason: 'You chose to repeat this week. The next steps wait one week.' });
    // races stay on their dates
    const log = new ChangeLog();
    for (const r of P.races.filter((x) => x.inPlan !== false && !x.goal)) overlayRace(P, r, { today, experience: P.settings.experience }, ctxForPlan(P), log, P.warnings);
    for (const e of log.items) for (const iso of e.dates) changes.push({ iso, before: '', after: e.change, reason: e.reason });
    const res = finish(P, changes, { message: `Week ${wn} repeats. Later weeks move back by one week before the taper.` });
    return res;
  }

  return { plan, changes, questions: [], needsAnswers: false, refused: true, reason: `Unknown event: ${type}`, message: `Unknown event: ${type}` };
}

/* "I feel really tired": today's hard run or heavy lift becomes easy or light; the next day stays easy. */
function tired(P, today, changes) {
  const next = addDays(today, 1);
  for (const [iso, first] of [[today, true], [next, false]]) {
    const loc = locate(P, iso); if (!loc) continue;
    const d = loc.day;
    if (!d.done && (d.intensity === 'hard' || d.intensity === 'long')) {
      setDay(P, iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 6)) }, first ? 'You feel really tired. Today is a short easy run instead. The hard session can wait.' : 'You felt really tired yesterday. Today stays easy.', changes);
    }
    if (isHeavyGym(locate(P, iso).day)) setGymAdvice(P, iso, 'skip-heavy', first ? 'You feel really tired. Lift light today, or rest.' : 'You felt really tired yesterday. Lift light today.', changes);
  }
  const race = [today, next].map((iso) => locate(P, iso)).find((l) => l && l.day.type === 'race');
  const message = changes.length ? 'We made today and tomorrow easy. Sleep well, eat well and drink water.' : race ? 'Your race stays in the plan. Rest as much as you can before it.' : 'Today and tomorrow are already easy. No change is necessary. Rest if you need it.';
  return finish(P, changes, { message });
}

/* Swaps a key run on `c` to the first safe day in the next 4 days that is at least `minGap` days after `fromIso`.
   A long run stays in its week. Returns the new day or null. */
function moveKeyRun(P, c, fromIso, minGap, today) {
  const src = locate(P, c);
  for (let j = 1; j <= 4; j++) {
    const t = addDays(c, j); const tl = locate(P, t);
    if (!tl || t < today || daysBetween(fromIso, t) < minGap) continue;
    if (src.day.intensity === 'long' && tl.week !== src.week) break;
    if (tl.day.done || tl.day.type === 'race' || isHardRun(tl.day)) continue;
    const res = trySafe(P, (X) => swapDays(X, c, t));
    if (res.ok) return t;
  }
  return null;
}

/* Unplanned session (spec v1.1 section 4). The plan day records it in `unplanned`.
   A lift also marks the day's gym session as done, when this keeps every safety rule. */
function unplannedSession(plan, P, event, today, changes) {
  const refuse = (reason) => ({ plan, changes: [], questions: [], needsAnswers: false, refused: true, reason, message: reason });
  const kind = event.kind === 'lift' || event.kind === 'run' ? event.kind : null;
  if (!kind) return refuse('Use kind "run" or "lift".');
  let iso; try { iso = toISO(event.date || event.iso || today); } catch { return refuse('The date is not valid.'); }
  const intensity = ['easy', 'hard', 'long'].includes(event.intensity) ? event.intensity : kind === 'lift' ? 'hard' : 'easy';
  let areas = (Array.isArray(event.areas) ? event.areas : []).filter((a) => ['legs', 'upper', 'full'].includes(a));
  if (!areas.length) areas = [kind === 'run' ? 'legs' : 'full']; // unknown lift areas: the safe side
  const minutes = Number(event.minutes) > 0 ? Number(event.minutes) : 0;
  const home = locate(P, iso);
  if (!home) return { plan, changes: [], questions: [], needsAnswers: false, message: 'This day is not in the plan. The plan does not change.' };
  const p = P.paces;
  const km = Number(event.km) > 0 ? round(Number(event.km), 1) : kind === 'run' && minutes && p ? round((minutes * 60) / p.easy, 1) : 0;
  const session = { kind, intensity, areas, minutes, ...(kind === 'run' ? { km } : {}) };
  // The plan day records the session. Other rules can replace the day object, so it is written again at the end.
  const record = (X) => { const l = locate(X, iso); if (l) l.day.unplanned = [...(home.day.unplanned || []), session]; };
  const done = (extra) => {
    let markedGym = null;
    { const l = locate(P, iso); if (l && l.day.gym && l.day.gym.unplanned) markedGym = { gym: l.day.gym, gymDone: l.day.gymDone }; }
    const out = finish(P, changes, extra);
    record(out.plan);
    const l = locate(out.plan, iso);
    if (markedGym && l) { l.day.gym = markedGym.gym; l.day.gymDone = markedGym.gymDone; }
    return out;
  };
  const when = fmtDate(iso);
  const dayAt = (k) => { const c = addDays(iso, k); const l = c >= today ? locate(P, c) : null; return l && !l.day.done ? l : null; };
  const gymAt = (k) => { const c = addDays(iso, k); const l = c >= today ? locate(P, c) : null; return l && l.day.gym && !l.day.gymDone ? l : null; };
  const notes = [];

  if (kind === 'lift') {
    const legs = areas.includes('legs') || areas.includes('full');
    const upper = areas.includes('upper') || areas.includes('full');
    const heavy = intensity !== 'easy';
    const what = areas.includes('full') ? 'full-body' : legs ? 'leg' : 'upper-body';
    if (legs && heavy) {
      // key runs: no hard run within 48 hours and no long run within 72 hours after heavy legs
      for (let k = 0; k <= 2; k++) {
        const l = dayAt(k); if (!l) continue;
        const d = l.day;
        if (d.type === 'race') { notes.push(`${d.title} is on ${fmtDate(d.iso)}. The race stays in the plan. Keep the legs fresh until then.`); continue; }
        const clash = (k <= 1 && d.intensity === 'hard') || (k <= 2 && d.intensity === 'long');
        if (!clash) continue;
        const why = `You did a heavy ${what} session on ${when}. Heavy legs need 48 hours before a hard run and 72 hours before the long run.`;
        const t = moveKeyRun(P, d.iso, iso, d.intensity === 'long' ? 3 : 2, today);
        if (t) {
          const after = locate(P, t).day;
          swapDays(P, d.iso, t);
          changes.push({ iso: d.iso, before: describe(d), after: `Moved to ${fmtDate(t)}`, reason: `${why} ${d.title} moves to ${fmtDate(t)}.` });
          changes.push({ iso: t, before: describe(after), after: describe(d), reason: `${d.title} moved here from ${fmtDate(d.iso)}. No hard day touches it.` });
        } else {
          const easyKm = Math.max(SAFETY.minRunKm, d.intensity === 'long' ? Math.floor(d.km * 6) / 10 : Math.min(d.km, 8));
          setDay(P, d.iso, { type: 'easy', km: easyKm }, `${why} No safe day is free, so this run is easy.`, changes);
        }
      }
    }
    // the next gym sessions on the same muscles
    for (let k = 0; k <= 1; k++) {
      const l = gymAt(k); if (!l) continue;
      const g = l.day.gym;
      if (legs && LEG_GYM.has(g.type) && isHeavyGym(l.day)) setGymAdvice(P, l.day.iso, 'skip-heavy', `You did a ${what} session on ${when}. Your legs need time to recover. This session is light.`, changes);
      else if (upper && g.type === 'upper' && isHeavyGym(l.day)) setGymAdvice(P, l.day.iso, 'skip-heavy', `You did a ${what} session on ${when}. Your upper body needs 48 hours to recover. This session is light.`, changes);
    }
    // mark the day's gym session as done, when this keeps every safety rule
    if (!home.day.gym || !home.day.gymDone) {
      const type = areas.includes('full') || (legs && upper) ? 'full' : legs ? 'legs' : 'upper';
      const gym = { day: home.day.dow, type, intensity: heavy ? 'heavy' : 'light', note: 'Unplanned session', heavyLegs: heavy && LEG_GYM.has(type), advice: 'normal', reason: 'You logged this session.', unplanned: true };
      const mark = (X) => { const l = locate(X, iso); if (l.day.gym) gym.planned = l.day.gym; l.day.gym = { ...gym }; l.day.gymDone = { activityId: null, at: null, unplanned: true }; };
      const before = failKeys(clone(P));
      const T = clone(P); mark(T);
      const fresh = [...failKeys(T)].filter((f) => !before.has(f));
      if (!fresh.length) mark(P);
    }
    const message = changes.length ? 'Plan updated. Your next sessions now respect the extra lift session.' : 'The lift session is saved. Your next sessions are far enough away. No change is necessary.';
    return done({ message: notes.length ? `${message} ${notes.join(' ')}` : message });
  }

  // run
  if (intensity === 'hard' || intensity === 'long') {
    const what = intensity === 'long' ? 'long run' : 'hard run';
    for (let k = 0; k <= 1; k++) {
      const l = dayAt(k); if (!l) continue;
      const d = l.day;
      if (d.type === 'race') { notes.push(`${d.title} is on ${fmtDate(d.iso)}. The race stays in the plan. Run it by feel.`); continue; }
      const why = `You did a ${what} on ${when} that was not in the plan. Hard days must not touch.`;
      if (d.intensity === 'hard') setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.min(d.km, 8)) }, `${why} This run is easy now.`, changes);
      else if (d.intensity === 'long') {
        const t = moveKeyRun(P, d.iso, iso, 2, today);
        if (t) {
          const after = locate(P, t).day;
          swapDays(P, d.iso, t);
          changes.push({ iso: d.iso, before: describe(d), after: `Moved to ${fmtDate(t)}`, reason: `${why} ${d.title} moves to ${fmtDate(t)}.` });
          changes.push({ iso: t, before: describe(after), after: describe(d), reason: `${d.title} moved here from ${fmtDate(d.iso)}. No hard day touches it.` });
        } else setDay(P, d.iso, { type: 'easy', km: Math.max(SAFETY.minRunKm, Math.floor(d.km * 6) / 10) }, `${why} No safe day is free, so this run is easy.`, changes);
      }
    }
    for (let k = 0; k <= 1; k++) {
      const l = gymAt(k);
      if (l && isHeavyLegsGym(l.day)) setGymAdvice(P, l.day.iso, 'skip-heavy', `You did a ${what} on ${when}. Hard days must not touch. Heavy legs are light this time.`, changes);
    }
    const message = changes.length ? `Plan updated. The next days are easier after your extra ${what}.` : `The ${what} is saved. Your next key sessions are far enough away. No change is necessary.`;
    return done({ message: notes.length ? `${message} ${notes.join(' ')}` : message });
  }

  // easy run: the week counts it; the next easy run in the next 2 days can get shorter
  const week = home.week;
  const extraKm = round(sum(week.days.flatMap((d) => (d.unplanned || []).filter((u) => u.kind === 'run')), (u) => u.km || 0) + km, 1);
  const target = Number.isFinite(week.targetKm) ? week.targetKm : weekKm(week);
  const total = round(weekKm(week) + extraKm, 1);
  if (!km) return done({ message: 'The run is saved. The plan does not change.' });
  if (total <= target + SAFETY.checkEps) return done({ message: `The week counts this run (${km} km). The week is still at or under its target of ${round(target, 1)} km, so the plan does not change.` });
  const over = round(total - target, 1);
  const floorKm = Math.ceil(Math.max(3, p ? (20 * 60) / p.easy : 3) * 10) / 10; // not below 3 km or 20 minutes
  for (let k = 1; k <= 2; k++) {
    const l = dayAt(k); if (!l) continue;
    const d = l.day;
    if (!['easy', 'recovery', 'strides'].includes(d.type)) continue;
    const goal = Math.max(floorKm, round(d.km - over, 1));
    if (goal >= d.km - 0.05) return done({ message: `The week counts this run (${km} km). Your next easy run is already short, so the plan does not change.` });
    // A changed week counts at its planned distance (markDisrupted).
    // safe, and no other day must change (a smaller week can make later weeks shrink)
    const fits = (newKm) => {
      const T = clone(P); const x = locate(T, d.iso);
      const nw = makeWorkout(d.iso, { ...d.spec, km: newKm }, ctxForPlan(T)(x.wi)); nw.gym = x.day.gym;
      markDisrupted(x.week);
      x.week.days[x.di] = nw;
      const side = [];
      finish(T, side);
      return !side.length && !safetyFails(T.safety).length;
    };
    // the shortest distance that fits (0.1 km steps; a longer run is never less safe here)
    let lo = Math.round(goal * 10), hi = Math.round(d.km * 10) - 1;
    let best = null;
    if (lo <= hi && fits(hi / 10)) {
      best = hi;
      while (lo < best) { const mid = Math.floor((lo + best) / 2); if (fits(mid / 10)) best = mid; else lo = mid + 1; }
    }
    if (best != null) {
      const newKm = best / 10;
      setDay(P, d.iso, { ...d.spec, km: newKm }, `You ran ${km} km on ${when} that was not in the plan. This easy run is ${newKm} km, not ${round(d.km, 1)} km. The week stays near its target.`, changes);
      return done({ message: 'Plan updated. The week counts your extra run, so the next easy run is shorter.' });
    }
    return done({ message: `The week counts this run (${km} km). A shorter easy run would break a safety rule, so the plan does not change.` });
  }
  return done({ message: `The week counts this run (${km} km). There is no easy run in the next 2 days, so the plan does not change.` });
}

/** Recovery block and "what next" options after a race result. */
export function afterRace(plan, result) {
  const iso = toISO(result.iso);
  const dist = Number(result.distKm);
  const r = checkResult(dist, Number(result.timeSec));
  const P = clone(plan); const changes = [];
  const days = recoveryDaysFor(dist) + (Number(result.rpe) >= 9 ? 2 : 0);
  const restDays = dist <= 10 ? 1 : dist <= 21.1 ? 2 : 3;
  for (const d of allDays(P).filter((x) => x.iso > iso && daysBetween(iso, x.iso) <= days)) {
    if (d.type === 'race') continue;
    const k = daysBetween(iso, d.iso);
    if (k <= restDays && (isRun(d) || d.type === 'strength')) setDay(P, d.iso, { type: 'rest', why: 'Recovery after your race.' }, `Day ${k} after the race: rest.`, changes);
    else if (d.intensity === 'hard' || d.intensity === 'long') setDay(P, d.iso, { type: 'recovery', km: Math.max(SAFETY.minRunKm, round(Math.min(d.km, 6) * 0.8, 1)) }, `Recovery block: ${days} easy days after a ${round(dist, 1)} km race.`, changes);
  }
  let score = null;
  if (r.ok) {
    const before = P.score; const after = round(Math.min(r.score, P.score + 3), 1);
    score = { before, after, raw: r.score, capped: r.score > after };
    if (after !== before) { P.score = after; P.paces = paces(after); P.scoreIso = iso; regeneratePaces(P, addDays(iso, 1), changes, before, `Race result ${fmtTime(result.timeSec)} for ${round(dist, 2)} km.`); }
  }
  const out = finish(P, changes, {});
  const block = allDays(out.plan).filter((x) => x.iso > iso && daysBetween(iso, x.iso) <= days);
  return {
    plan: out.plan, changes, recoveryDays: days, days: block, score, error: r.ok ? null : r.error,
    options: [
      { id: 'rejoin', label: 'Rejoin the plan', detail: `Easy running for ${days} days, then the plan continues.` },
      { id: 'newGoal', label: 'Choose a new goal', detail: 'Make a new plan from your new fitness score.' },
      { id: 'keepfit', label: 'Keep fit for now', detail: 'Rolling 4-week blocks with no race date.' },
    ],
    message: `Well done. Take ${days} easy days. Then choose what comes next.`,
  };
}

/** Goal time against predicted time. */
export function goalGap(plan, score = plan.score) {
  if (!isValidScore(score) || !plan.goalKm) return { hasGoal: false, predictedSec: null, text: 'No prediction is available.' };
  const predictedSec = Math.round(predict(score, plan.goalKm));
  if (!plan.goalTimeSec) return { hasGoal: false, predictedSec, text: `Predicted ${plan.goalName}: ${fmtTime(predictedSec)}.` };
  const gapSec = predictedSec - plan.goalTimeSec; const pct = round((gapSec / plan.goalTimeSec) * 100, 1);
  const status = gapSec <= 0 ? 'on-track' : pct <= 3 ? 'close' : 'behind';
  const text = status === 'on-track' ? `Predicted ${fmtTime(predictedSec)}. Your goal of ${fmtTime(plan.goalTimeSec)} is in reach.`
    : status === 'close' ? `Predicted ${fmtTime(predictedSec)}. You are ${fmtTime(gapSec)} from your goal. Keep going.`
      : `Predicted ${fmtTime(predictedSec)}. Your goal is ${fmtTime(gapSec)} faster. Think about a safer goal. Fitness grows slowly.`;
  return { hasGoal: true, predictedSec, goalSec: plan.goalTimeSec, gapSec, pct, status, text };
}

/** A time trial every 4 to 6 weeks. */
export function timeTrialDue(plan, today) {
  const t = toISO(today);
  const next = allDays(plan).find((d) => d.iso >= t && (d.type === 'timetrial' || d.type === 'race'));
  if (next && daysBetween(t, next.iso) <= 14) return { due: false, nextIso: next.iso, reason: `${next.title} is on ${fmtDate(next.iso)}. It updates your paces.` };
  const since = daysBetween(plan.scoreIso || plan.createdIso, t);
  if (since < 28) return { due: false, daysSince: since, reason: `Your paces are ${since} days old. A time trial is useful every 4 to 6 weeks.` };
  let suggestIso = null;
  for (let k = 1; k <= 10 && !suggestIso; k++) {
    const c = addDays(t, k); const loc = locate(plan, c);
    if (!loc || !isRun(loc.day) || loc.day.intensity !== 'easy') continue;
    const res = trySafe(plan, (T) => { const l = locate(T, c); const nw = makeWorkout(c, { type: 'timetrial', distKm: 5, name: '5K time trial' }, ctxForPlan(T)(l.wi)); nw.gym = l.day.gym; markDisrupted(l.week); l.week.days[l.di] = nw; });
    if (res.ok) suggestIso = c;
  }
  return { due: true, daysSince: since, suggestIso, reason: `Your paces are ${since} days old. A 5K time trial ${suggestIso ? 'on ' + fmtDate(suggestIso) + ' ' : ''}updates them.` };
}

export { isHeavyLegsDay, GOALS };
