// Independent safety verdicts for the engine tests.
// These functions do not use the engine's own check code. They read the planned days only.

export const QUALITY = new Set(['tempo', 'cruise', 'intervals', 'reps', 'hills', 'fartlek', 'racepace', 'sharpener']);
export const LONG = new Set(['long', 'longfinish']);
export const RACE = new Set(['race', 'timetrial']);
export const EASY = new Set(['easy', 'strides', 'recovery', 'runwalk', 'shakeout']);
export const RUN = new Set([...QUALITY, ...LONG, ...RACE, ...EASY]);
export const EPS = 0.1;

export const isRun = (d) => RUN.has(d.type);
export const hardRun = (d) => QUALITY.has(d.type) || LONG.has(d.type) || RACE.has(d.type);
export const heavyLegs = (d) => !!(d.gym && d.gym.intensity === 'heavy' && ['legs', 'lower', 'full'].includes(d.gym.type) && d.gym.advice !== 'skip-heavy');
export const hardDay = (d) => hardRun(d) || heavyLegs(d);
export const days = (plan) => plan.weeks.flatMap((w) => w.days);
const r1 = (x) => Math.round(x * 10) / 10;
export const weekKm = (wk) => r1(wk.days.filter(isRun).reduce((s, d) => s + d.km, 0));
export const trainingKm = (wk) => r1(wk.days.filter((d) => isRun(d) && !RACE.has(d.type)).reduce((s, d) => s + d.km, 0));

function sec(x) { return x.min ? x.min * 60 : x.sec ? x.sec : x.km && x.pace ? x.km * x.pace : 0; }
export function workoutMinutes(d) {
  let s = 0;
  for (const x of d.steps || []) s += x.kind === 'repeat' ? x.times * (sec(x.work) + (x.rest ? sec(x.rest) : 0)) : sec(x);
  return s / 60;
}
export function workoutHardMinutes(d, paces) {
  const lim = paces.marathon * 1.01; let s = 0;
  for (const x of d.steps || []) {
    if (x.kind === 'repeat') { if (x.work.pace && x.work.pace <= lim) s += x.times * sec(x.work); } else if (x.pace && x.pace <= lim) s += sec(x);
  }
  return s / 60;
}

function isoAdd(iso, n) { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
export { isoAdd };

/** Independent verdicts: {rule: [failure strings]}. Empty array = pass. */
export function verdicts(plan) {
  const out = {};
  const flat = days(plan);
  const byIso = new Map(flat.map((d) => [d.iso, d]));

  // dates are continuous and each week has 7 days
  out.calendar = [];
  for (let i = 1; i < flat.length; i++) if (isoAdd(flat[i - 1].iso, 1) !== flat[i].iso) out.calendar.push(`gap at ${flat[i].iso}`);
  plan.weeks.forEach((w) => { if (w.days.length !== 7) out.calendar.push(`week ${w.n} has ${w.days.length} days`); });

  out.hardSpacing = [];
  for (let i = 0; i + 1 < flat.length; i++) {
    const a = flat[i], b = flat[i + 1];
    if (hardDay(a) && hardDay(b) && !(a.type === 'race' && b.type === 'race')) out.hardSpacing.push(`${a.iso} ${a.type} / ${b.iso} ${b.type}`);
  }
  out.legsSpacing = [];
  flat.forEach((d, i) => {
    if (!heavyLegs(d)) return;
    if (hardRun(d)) out.legsSpacing.push(`${d.iso} same day ${d.type}`);
    if (flat[i + 1] && hardRun(flat[i + 1])) out.legsSpacing.push(`${d.iso} day before ${flat[i + 1].type}`);
    if (flat[i + 2] && (LONG.has(flat[i + 2].type) || flat[i + 2].type === 'race')) out.legsSpacing.push(`${d.iso} 2 days before ${flat[i + 2].type}`);
  });

  out.longLongest = []; out.longShare = []; out.easy8020 = []; out.hardPerWeek = [];
  const maxHard = plan.settings.experience === 'new' ? 1 : 2;
  for (const wk of plan.weeks) {
    const runs = wk.days.filter((d) => isRun(d) && !RACE.has(d.type));
    const long = runs.find((d) => LONG.has(d.type));
    if (runs.filter((d) => LONG.has(d.type)).length > 1) out.longLongest.push(`week ${wk.n}: two long runs`);
    if (long) {
      for (const d of runs) if (d !== long && d.km > long.km + 1e-9) out.longLongest.push(`week ${wk.n}: ${d.type} ${d.km} > long ${long.km}`);
      const n = runs.length; const cap = n <= 1 ? 1 : n === 2 ? 0.62 : n === 3 ? 0.45 : 0.36;
      const t = trainingKm(wk);
      if (n > 1 && long.km > cap * t + EPS) out.longShare.push(`week ${wk.n}: long ${long.km} of ${t}`);
      if (workoutMinutes(long) > 181) out.longShare.push(`week ${wk.n}: long run ${Math.round(workoutMinutes(long))} min`);
    }
    const tot = runs.reduce((s, d) => s + workoutMinutes(d), 0);
    const hard = runs.reduce((s, d) => s + workoutHardMinutes(d, plan.paces), 0);
    if (tot > 0 && hard / tot > 0.21) out.easy8020.push(`week ${wk.n}: ${Math.round((hard / tot) * 100)}% hard`);
    const hardCount = wk.days.filter((d) => QUALITY.has(d.type) || RACE.has(d.type)).length;
    const raceCount = wk.days.filter((d) => RACE.has(d.type)).length;
    if (hardCount > maxHard && raceCount < hardCount) out.hardPerWeek.push(`week ${wk.n}: ${hardCount} hard`);
  }

  // volume
  out.week1 = [];
  const n = Math.min(plan.settings.runDays.length, 4);
  const floor = Math.min(n, 3) * 3;
  const C = plan.settings.currentWeeklyKm;
  let cap1 = Math.max(C * 1.1, floor);
  // New run days (from the run history): current + one short easy run for each new day,
  // never more than current + 25% or the recent peak week. Not for runners near zero.
  const S = plan.settings;
  if (C * 1.1 >= floor && S.runsPerWeek >= 1 && S.runDays.length > S.runsPerWeek) {
    if (!(S.newRunKm >= 3 && S.newRunKm <= 5)) out.week1.push(`new run day distance ${S.newRunKm} km is not 3 to 5 km`);
    const extra = S.runDays.length - S.runsPerWeek;
    cap1 = Math.max(cap1, Math.min(C + extra * S.newRunKm, C * 1.25, S.peakWeekKm > 0 ? S.peakWeekKm : Infinity));
  }
  if (cap1 > Math.max(C * 1.25, floor) + 1e-9) out.week1.push(`limit ${r1(cap1)} is more than current + 25%`);
  if (Math.abs(plan.limits.week1MaxKm - r1(cap1)) > 0.05) out.week1.push(`limit ${plan.limits.week1MaxKm} != ${r1(cap1)}`);
  if (!plan.weeks[0].exempt && weekKm(plan.weeks[0]) > cap1 + EPS) out.week1.push(`week 1 ${weekKm(plan.weeks[0])} > ${r1(cap1)}`);

  out.growth = []; out.cutback = []; out.taper = [];
  let ref = null; let peak = 0; let streak = 0; let prevTaper = null;
  for (const wk of plan.weeks) {
    const k = weekKm(wk);
    const hasRace = wk.days.some((d) => d.type === 'race');
    const taper = wk.kind === 'taper' || wk.kind === 'race';
    const down = taper || wk.kind === 'recovery' || wk.disrupted;
    const r = ref == null ? cap1 / 1.1 : ref;
    if (!wk.exempt) {
      if (taper) {
        const t = trainingKm(wk); const lim = Math.min((wk.taperFrac || 1) * (peak || r * 1.1), r * 1.1);
        if (t > lim + EPS) out.taper.push(`week ${wk.n}: taper ${t} > ${r1(lim)}`);
        if (prevTaper != null && t > prevTaper + EPS) out.taper.push(`week ${wk.n}: taper grows`);
        prevTaper = t;
      } else if (down) { if (k > r + EPS) out.growth.push(`week ${wk.n}: down week ${k} > ${r1(r)}`); } else if (wk.cutback) {
        if (wk.n > 1 && k > r * 0.9 + EPS) out.cutback.push(`week ${wk.n}: cutback ${k} vs ref ${r1(r)}`);
      } else if (wk.n > 1 && k > r * 1.1 + EPS) out.growth.push(`week ${wk.n}: ${k} after ref ${r1(r)}`);
    }
    if (!down && !wk.cutback) { streak++; if (streak > 3) out.cutback.push(`week ${wk.n}: 4 weeks without a cutback`); } else streak = 0;
    if (!down && !wk.cutback && !hasRace && !wk.exempt && !wk.rebuild) { ref = k; peak = Math.max(peak, k); }
    if (wk.rebuild && !down && !wk.cutback && !hasRace && !wk.exempt) ref = k;
    if (wk.disrupted && wk.refKm != null && !taper) ref = wk.refKm;
  }

  out.races = [];
  for (const r of plan.races) if (r.inPlan !== false) { const d = byIso.get(r.iso); if (!d || d.type !== 'race') out.races.push(`${r.name} missing on ${r.iso}`); }

  out.gentleStart = [];
  const gentle = plan.goal !== 'runwalk' && (plan.settings.runDays.length <= 2 || plan.settings.experience === 'new') ? 3 : 0;
  plan.weeks.slice(0, gentle).forEach((wk) => wk.days.forEach((d) => { if (QUALITY.has(d.type)) out.gentleStart.push(`week ${wk.n}: ${d.type}`); }));

  out.raceLifting = [];
  for (const r of plan.races.filter((x) => x.priority === 'A' && x.inPlan !== false)) {
    for (const d of flat) {
      if (!d.gym || d.gym.intensity !== 'heavy') continue;
      const k = Math.round((Date.parse(r.iso) - Date.parse(d.iso)) / 864e5);
      if (k >= 0 && k <= 6 && d.gym.advice !== 'skip-heavy') out.raceLifting.push(`${d.iso} heavy in race week`);
      if (k >= 7 && k <= 10 && d.gym.advice === 'normal') out.raceLifting.push(`${d.iso} full lifting 10 days out`);
    }
  }
  return out;
}

/** Maps engine safety check ids to independent verdict keys. */
export const CHECK_MAP = { week1: 'week1', growth: 'growth', cutback: 'cutback', taper: 'taper', longLongest: 'longLongest', longShare: 'longShare', easy8020: 'easy8020', legsSpacing: 'legsSpacing', races: 'races', hardPerWeek: 'hardPerWeek', gentleStart: 'gentleStart', raceLifting: 'raceLifting' };
