/* Seed a plan from past runs.
   Best effort: races and time trials of the last 12 weeks first. Without them,
   the fastest sustained run (3 km or more, 15 minutes or more, not a workout).
   Volume: the 4-week average, the 12-week average and past peak weeks.
   One low or empty week (for example a holiday) does not pull the weekly
   value down. A real break (3 or more of the last 4 weeks nearly empty) does.
   Habits: the usual number of runs a week and the usual long run (the middle
   value of each recent week's longest run).
   The result lists the runs it used, so the user can check and edit the values. */

import { round, toISO, addDays, daysBetween, mondayOf } from './util.js';
import { checkResult } from './science.js';
import { activityMinutes } from './load.js';

const RUN_RE = /run|race|jog|trail|treadmill|easy|long|tempo|interval|threshold|hill|fartlek|stride|time ?trial|parkrun/i;
const NOT_RUN_RE = /bike|cycl|ride|swim|walk|hike|row|lift|gym|strength|yoga|ski|football|soccer/i;
const WORKOUT_RE = /interval|tempo|threshold|reps?\b|hill|fartlek|stride|workout|track|session|cruise|\d+ ?x ?\d|\bx\d/i;
const RACE_RE = /race|parkrun|time ?trial|\btt\b|\b(5|10) ?k\b|half|marathon/i;

function median(list) {
  const v = [...list].sort((a, b) => a - b); const n = v.length;
  if (!n) return 0;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

function norm(a, i) {
  let iso; try { iso = toISO(a.iso || a.date || a.startTime || a.start); } catch { return null; }
  const km = Number.isFinite(a.km) ? a.km : Number.isFinite(a.distanceKm) ? a.distanceKm : Number.isFinite(a.distanceM) ? a.distanceM / 1000 : Number.isFinite(a.distance) ? (a.distance > 500 ? a.distance / 1000 : a.distance) : 0;
  const sec = activityMinutes(a) * 60;
  const label = `${a.type || ''} ${a.sport || ''} ${a.title || a.name || ''}`;
  const isRun = (RUN_RE.test(label) || (!a.type && !a.sport)) && !NOT_RUN_RE.test(`${a.type || ''} ${a.sport || ''}`);
  const isRace = !!(a.isRace || a.workoutType === 1 || a.type === 'race' || a.type === 'timetrial' || RACE_RE.test(a.title || a.name || ''));
  const isWorkout = !isRace && WORKOUT_RE.test(`${a.type || ''} ${a.title || a.name || ''}`);
  return { id: a.id != null ? a.id : `a${i}`, iso, km, sec, title: a.title || a.name || a.type || 'Run', isRun, isRace, isWorkout };
}

export function seedFromHistory(activities = [], today) {
  const t = toISO(today || new Date());
  const runs = activities.map(norm).filter((r) => r && r.isRun && r.km > 0 && r.iso <= t && !(r.sec > 0 && r.sec / r.km < 150)); // no GPS faults
  const notes = [];
  const recent = runs.filter((r) => daysBetween(r.iso, t) < 84);
  const scored = [];
  for (const a of activities.map(norm)) if (a && a.isRun && a.km > 0 && a.sec > 0 && a.sec / a.km < 150 && a.iso <= t) notes.push(`${a.iso} "${a.title}" was not used: the pace is faster than 2:30 per km. Check the time and the distance.`);
  for (const r of recent) {
    if (r.km < 3 || r.sec < 15 * 60) continue; // short reps and partial files
    if (r.isWorkout) continue; // a threshold or interval session is not a best effort
    const c = checkResult(r.km, r.sec);
    if (!c.ok) { notes.push(`${r.iso} "${r.title}" was not used: ${c.error}`); continue; }
    scored.push({ ...r, score: c.score });
  }
  const races = scored.filter((r) => r.isRace);
  const pool = races.length ? races : scored;
  const best = pool.reduce((m, r) => (!m || r.score > m.score ? r : m), null);
  if (best && !races.length) notes.push('No race or time trial in the last 12 weeks. The score comes from your fastest steady run. A race or time trial gives a better value.');
  if (!best) notes.push('No usable run in the last 12 weeks. Add a recent race or time trial, or choose "I am new".');

  const kmIn = (from, to) => round(runs.filter((r) => { const k = daysBetween(r.iso, t); return k >= from && k < to; }).reduce((s, r) => s + r.km, 0), 1);
  const inWeek = (w) => runs.filter((r) => { const k = daysBetween(r.iso, t); return k >= w * 7 && k < w * 7 + 7; });
  const weeks12 = Array.from({ length: 12 }, (_, w) => kmIn(w * 7, w * 7 + 7)); // 7-day blocks, newest first
  const weeks = weeks12.slice(0, 4);
  const avg4 = round(weeks.reduce((s, x) => s + x, 0) / 4, 1);
  const avg12 = round(kmIn(0, 84) / 12, 1);
  const peak12 = round(Math.max(0, ...weeks12), 1);
  const byWeek = new Map();
  for (const r of runs) if (daysBetween(r.iso, t) < 365) { const m = mondayOf(r.iso); byWeek.set(m, (byWeek.get(m) || 0) + r.km); }
  const peakWeeks = [...byWeek.entries()].map(([startIso, km]) => ({ startIso, km: round(km, 1) })).sort((a, b) => b.km - a.km).slice(0, 3);
  const longestRecentKm = round(recent.reduce((m, r) => Math.max(m, r.km), 0), 1);
  const volumeRuns = runs.filter((r) => daysBetween(r.iso, t) < 28);

  // Habits from the last 6 weeks. Only weeks with a run count, so a holiday week does not change them.
  const habitWeeks = [0, 1, 2, 3, 4, 5].map(inWeek).filter((list) => list.length > 0);
  const runsPerWeek = habitWeeks.length ? Math.round(median(habitWeeks.map((list) => list.length))) : 0;
  const usualLongRunKm = habitWeeks.length ? round(median(habitWeeks.map((list) => Math.max(...list.map((r) => r.km)))), 1) : 0;

  // Weekly distance. A week is nearly empty below a quarter of the 12-week average (and below 2 km).
  const nearlyEmpty = (km) => km < Math.max(2, avg12 * 0.25);
  const emptyWeeks = weeks.filter(nearlyEmpty).length;
  let currentWeeklyKm = avg4; let weeklyKmSource = 'last4'; let weeklyKmNote = `The plan uses your last 4 weeks: ${avg4} km a week.`;
  if (avg12 > 0 && emptyWeeks >= 3) {
    weeklyKmSource = 'break';
    notes.push(weeklyKmNote = `${emptyWeeks} of your last 4 weeks have almost no running. The plan starts from your last 4 weeks (${avg4} km a week), not from your 12-week average (${avg12} km a week). This is safer after a break.`);
  } else if (avg4 < avg12) {
    const withRun = weeks12.slice(0, 6).filter((km) => km > 0);
    const mid = withRun.length ? median(withRun) : 0;
    const steady = round(Math.max(avg4, Math.min(mid, avg12, Math.max(...weeks) * 1.1)), 1);
    if (steady > avg4) {
      currentWeeklyKm = steady; weeklyKmSource = 'steady';
      notes.push(weeklyKmNote = `One or more of your last 4 weeks is low or empty. The plan uses ${steady} km a week: the middle value of your last 6 weeks with a run. This is not more than your 12-week average (${avg12} km) or your best recent week plus 10%. Your last 4 weeks give ${avg4} km a week.`);
    }
  }
  if (avg4 < avg12 * 0.6 && avg12 > 0 && weeklyKmSource === 'last4') notes.push('The last 4 weeks are much lower than your 12-week average. The plan starts from the last 4 weeks.');
  return {
    score: best ? best.score : null,
    scoreSource: best ? (best.isRace ? 'race' : 'training') : null,
    scoreRun: best ? { id: best.id, iso: best.iso, km: round(best.km, 2), sec: Math.round(best.sec), title: best.title } : null,
    currentWeeklyKm, weeklyKmSource, weeklyKmNote, avg4WeeksKm: avg4, weeksKm: weeks, avg12WeeksKm: avg12, peak12WeeksKm: peak12, peakWeeks, longestRecentKm,
    runsPerWeek, usualLongRunKm,
    runsUsed: { score: pool.map((r) => ({ id: r.id, iso: r.iso, km: round(r.km, 2), sec: Math.round(r.sec), score: r.score, race: r.isRace })), volume: volumeRuns.map((r) => ({ id: r.id, iso: r.iso, km: round(r.km, 2) })) },
    window: { from: addDays(t, -83), to: t },
    notes,
  };
}
