/* Libraries, audio cues, run simulation, loop routes, export and the on-device coach. */

import { clamp, round, rng, toISO, addDays, daysBetween, mondayOf, fmtPace, fmtTime, fmtKm, fmtDate, fmtSpeed, KM_PER_MI } from './util.js';
import { WALK_PACE, fitnessScore, fuel, carbLoad, heatAdjust, predict } from './science.js';
import { stepsSec, isRun } from './workouts.js';
import { buildPlan, allDays, todayWorkout, GOALS, recoveryDaysFor } from './plan.js';
import { sessionLoad, LOAD_NOTE } from './load.js';
import { suggestDays } from './adapt.js';

/* ---------- libraries ---------- */
export const STRENGTH = [
  { id: 'core', name: 'Runner core', min: 20, level: 'All', items: [
    { name: 'Dead bug', dose: '3 x 10 each side', how: 'Lie on your back. Arms up, knees bent at 90 degrees. Lower one arm and the other leg slowly. Keep your lower back on the floor.' },
    { name: 'Side plank', dose: '3 x 30 s each side', how: 'Lie on your side on one elbow. Lift your hips. Keep a straight line from head to feet.' },
    { name: 'Glute bridge', dose: '3 x 12', how: 'Lie on your back, knees bent. Push through your heels and lift your hips. Hold 1 second at the top.' },
    { name: 'Bird dog', dose: '3 x 10 each side', how: 'Kneel on hands and knees. Reach one arm forward and the other leg back. Keep your back flat.' },
    { name: 'Calf raise', dose: '3 x 15, slow down', how: 'Stand on a step. Rise onto your toes. Lower your heels slowly for 3 seconds.' },
  ] },
  { id: 'legs', name: 'Legs and hips', min: 30, level: 'Some experience', items: [
    { name: 'Goblet squat', dose: '3 x 10', how: 'Hold a weight at your chest. Sit down between your knees. Keep your chest up.' },
    { name: 'Reverse lunge', dose: '3 x 8 each leg', how: 'Step back. Lower your back knee near the floor. Push back up through the front heel.' },
    { name: 'Single-leg Romanian deadlift', dose: '3 x 8 each leg', how: 'Stand on one leg. Hinge at the hips and reach down. Keep your back straight.' },
    { name: 'Step-up', dose: '3 x 10 each leg', how: 'Step onto a box or a stair with one foot. Stand up tall. Step down slowly.' },
    { name: 'Single-leg calf raise', dose: '3 x 12 each leg', how: 'Stand on one foot on a step. Rise up. Lower slowly.' },
  ] },
  { id: 'mobility', name: '10-minute mobility', min: 10, level: 'All', items: [
    { name: 'Hip flexor stretch', dose: '45 s each side', how: 'Kneel on one knee. Push your hips forward gently.' },
    { name: "World's greatest stretch", dose: '5 each side', how: 'Lunge forward. Put the same-side elbow down inside the front foot. Rotate and reach up.' },
    { name: 'Ankle rocks', dose: '10 each side', how: 'Kneel with one foot forward. Push the knee over the toes. Keep the heel down.' },
    { name: 'Thoracic rotation', dose: '8 each side', how: 'Lie on your side, knees bent. Open your top arm to the other side.' },
    { name: 'Leg swings', dose: '10 each way', how: 'Hold a wall. Swing one leg forward and back, then side to side.' },
  ] },
  { id: 'plyo', name: 'Power and plyometrics', min: 20, level: 'Experienced', items: [
    { name: 'Pogo hops', dose: '3 x 20', how: 'Small, quick hops on your toes. Keep your knees almost straight.' },
    { name: 'A-skip', dose: '3 x 20 m', how: 'Skip with high knees. Land under your hips.' },
    { name: 'Low box jump', dose: '3 x 6', how: 'Jump onto a low box. Land softly. Step down.' },
    { name: 'Bounding', dose: '3 x 20 m', how: 'Long, springy steps. Drive your knee forward.' },
    { name: 'Single-leg hop', dose: '3 x 8 each leg', how: 'Hop forward on one leg. Land softly and balance.' },
  ] },
];
export const DRILLS = ['High knees', 'Butt kicks', 'A-skips', 'B-skips', 'Carioca', 'Straight-leg bounds'];
export const CYCLE = {
  note: 'Optional. Stored only on this phone. Tips follow your symptoms, not a fixed phase rule.',
  tips: [
    { s: 'Cramps or heavy flow', t: 'An easy run or cross-training is fine. Heat and light movement can help.' },
    { s: 'Low energy', t: 'Keep the intensity. Run a shorter distance. Eat more carbohydrate before the run.' },
    { s: 'Feeling strong', t: 'A good day for the planned hard session.' },
    { s: 'Poor sleep', t: 'Follow your readiness. Change a hard run to an easy run if necessary.' },
  ],
};

/* ---------- audio cues ---------- */
function stepLen(x) { return x.min ? x.min * 60 : x.sec ? x.sec : x.km && x.pace ? x.km * x.pace : 0; }
function dur(sec) { return sec >= 60 ? `${round(sec / 60, 1)} minute${sec === 60 ? '' : 's'}` : `${sec} seconds`; }
function target(x, w, units) {
  if (x.walk || /walk/i.test(x.label)) return 'Walk briskly.';
  if (w.showPace === false || !x.pace) return x.effort || w.effortText || '';
  return `Target ${fmtPace(x.pace, units).replace(' /', ' per ').replace('mi', 'mile').replace('km', 'kilometre')}.`;
}
/** Voice cue script for the steps: [{t (seconds from start), text}]. Units-aware. */
export function audioCues(w, units = 'km') {
  const cues = []; if (!w || !w.steps || !w.steps.length) return cues;
  let t = 0;
  for (const s of w.steps) {
    if (s.kind === 'repeat') {
      for (let i = 1; i <= s.times; i++) {
        cues.push({ t, text: `Rep ${i} of ${s.times}. ${s.work.label}, ${dur(s.work.sec || (s.work.min || 0) * 60)}. ${target(s.work, w, units)}` });
        t += stepLen(s.work);
        if (s.rest) { cues.push({ t, text: `${s.rest.label}. ${i === s.times ? 'Last one done.' : 'Recover.'} ${target(s.rest, w, units)}`.trim() }); t += stepLen(s.rest); }
      }
    } else {
      const amount = s.km ? fmtKm(s.km, units).replace('km', 'kilometres').replace('mi', 'miles') : dur(stepLen(s));
      cues.push({ t, text: `${s.label}, ${amount}. ${target(s, w, units)}`.trim() });
      t += stepLen(s);
    }
  }
  cues.push({ t: Math.round(t), text: 'Workout complete. Well done.' });
  return cues.map((c) => ({ t: Math.round(c.t), text: c.text }));
}

/* ---------- run simulation (browser demo) ---------- */
/** Simulated run. Walk steps use walking pace. Treadmill: no GPS noise and speed cues. */
export function simulateRun(w, { paceSec = 330, units = 'km', treadmill = false, maxHR = 188, restHR = 52, seed = 7, tickSec = 10 } = {}) {
  const r = rng(seed); const cues = audioCues(w, units);
  const steps = (w && w.steps) || [];
  const total = Math.max(60, Math.round(stepsSec(steps) || (w && w.min ? w.min * 60 : 1800)));
  const segs = []; let acc = 0;
  const push = (x) => { const len = stepLen(x) || 300; segs.push({ from: acc, to: acc + len, pace: x.walk || /walk/i.test(x.label || '') ? (x.pace || WALK_PACE) : (x.pace || paceSec), walk: !!(x.walk || /walk/i.test(x.label || '')), label: x.label }); acc += len; };
  for (const s of steps) { if (s.kind === 'repeat') for (let i = 0; i < s.times; i++) { push(s.work); if (s.rest) push(s.rest); } else push(s); }
  const segAt = (tt) => segs.find((s) => tt < s.to) || segs[segs.length - 1] || { pace: paceSec, walk: false, label: 'Run' };
  if (treadmill) {
    let last = null;
    for (const s of segs) { if (s.walk || s.pace === last) continue; cues.push({ t: Math.round(s.from), text: `Set the treadmill to ${fmtSpeed(s.pace, units)}.` }); last = s.pace; }
    cues.sort((a, b) => a.t - b.t);
  }
  const ticks = []; let km = 0, hr = restHR + 30;
  for (let t = 0; t <= total; t += tickSec) {
    const s = segAt(t);
    const pace = treadmill ? s.pace : s.pace * (0.97 + r() * 0.06);
    km += tickSec / pace;
    const effort = s.walk ? 0.25 : clamp((600 - pace) / 400, 0.3, 1);
    hr += (restHR + (maxHR - restHR) * (0.5 + 0.45 * effort) - hr) * 0.15;
    ticks.push({ t, km: round(km, 3), dist: round(units === 'mi' ? km / KM_PER_MI : km, 3), pace: Math.round(pace), pacePerUnit: Math.round(units === 'mi' ? pace * KM_PER_MI : pace), hr: Math.round(hr), walk: s.walk, step: s.label });
  }
  return { ticks, cues, totalSec: total, km: round(km, 2), units, treadmill, gps: !treadmill, simulated: true };
}

/* ---------- routes ---------- */
export function loopRoute(km = 8, seed = 3) {
  const r = rng(seed * 997 + Math.round(km * 10)); const n = 28; const pts = [];
  const wob = Array.from({ length: 5 }, () => [r() * 0.25, r() * Math.PI * 2]);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; let rad = 1; wob.forEach(([amp, ph], k) => { rad += amp * Math.sin(a * (k + 2) + ph); }); pts.push([Math.cos(a) * rad * 1.25, Math.sin(a) * rad * 0.85]); }
  pts.push(pts[0]);
  const elev = []; let e = 40 + r() * 30, gain = 0;
  for (let i = 0; i < 60; i++) { const ne = clamp(e + (r() - 0.5) * 9 + Math.sin(i / 7) * 2, 5, 220); if (ne > e) gain += ne - e; e = ne; elev.push(round(e)); }
  return { points: pts, elev, gain: Math.round(gain), km, generated: true };
}

/* ---------- export ---------- */
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); }
/** Calendar file of the plan (rest days are not included). */
export function toICS(plan) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Skid Marks//Run plan//EN', 'CALSCALE:GREGORIAN'];
  for (const w of allDays(plan)) {
    if (w.type === 'rest') continue;
    const d = w.iso.replace(/-/g, ''); const e = addDays(w.iso, 1).replace(/-/g, '');
    L.push('BEGIN:VEVENT', `UID:${w.id}-${plan.id}@skidmarks`, `DTSTAMP:${(plan.createdIso || w.iso).replace(/-/g, '')}T000000Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`,
      fold(`SUMMARY:${icsEsc(w.title + (w.km ? ` ${round(w.km)} km` : ''))}`), fold(`DESCRIPTION:${icsEsc(`${w.effortText} ${w.why}`.trim())}`), 'END:VEVENT');
    if (w.gym) L.push('BEGIN:VEVENT', `UID:gym-${w.iso}-${plan.id}@skidmarks`, `DTSTAMP:${(plan.createdIso || w.iso).replace(/-/g, '')}T000000Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`, fold(`SUMMARY:${icsEsc(`Gym: ${w.gym.type} (${w.gym.advice})`)}`), fold(`DESCRIPTION:${icsEsc(w.gym.reason)}`), 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** GPX track. Uses run.track [{lat, lon, ele, time}] when present, else a generated loop (sample only). */
export function toGPX(run) {
  let pts;
  if (Array.isArray(run.track) && run.track.length) pts = run.track.map((p) => `    <trkpt lat="${(+p.lat).toFixed(6)}" lon="${(+p.lon).toFixed(6)}">${p.ele != null ? `<ele>${round(p.ele, 1)}</ele>` : ''}${p.time ? `<time>${xmlEsc(p.time)}</time>` : ''}</trkpt>`);
  else pts = (run.points || []).map(([x, y], i) => `    <trkpt lat="${(51.5 + y * 0.01).toFixed(6)}" lon="${(-0.12 + x * 0.015).toFixed(6)}"><ele>${run.elev ? run.elev[i % run.elev.length] : 30}</ele></trkpt>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Skid Marks" xmlns="http://www.topografix.com/GPX/1/1">\n <trk><name>${xmlEsc(run.name || run.title || 'Run')}</name><trkseg>\n${pts.join('\n')}\n </trkseg></trk>\n</gpx>`;
}
const csvEsc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** CSV of activities. Pace in whole seconds per km. */
export function toCSV(acts = []) {
  const head = 'date,type,title,distance_km,duration_min,avg_pace_s_per_km,avg_hr,rpe,load';
  const rows = acts.map((a) => {
    const min = Number.isFinite(a.min) ? a.min : (a.sec || a.durationSec || 0) / 60;
    const pace = a.km > 0 ? Math.round((min * 60) / a.km) : '';
    return [a.iso || a.date, a.type, a.title || '', a.km != null ? round(a.km, 2) : '', round(min, 1), pace, a.avgHR || '', a.rpe || '', Number.isFinite(a.load) ? a.load : sessionLoad(a)].map(csvEsc).join(',');
  });
  return [head, ...rows].join('\n');
}
const rp = (x) => { if (!x) return x; const o = { ...x }; if (o.pace != null) { o.paceSecPerKm = Math.round(o.pace); delete o.pace; } return o; };
/** Structured workout as JSON (paces rounded to whole seconds per km). */
export function toWorkoutJSON(w) {
  return JSON.stringify({ name: w.title, sport: 'running', date: w.iso, effort: w.effortText, steps: (w.steps || []).map((s) => (s.kind === 'repeat' ? { repeat: s.times, work: rp(s.work), recover: rp(s.rest) } : rp(s))) }, null, 2);
}

/* ---------- coach (rules, on device) ---------- */
/** Answers a question from the plan and real dates. state: {plan, today, units, weather, profile}. */
export function coachAnswer(question, state = {}) {
  const s = String(question || '').toLowerCase();
  const plan = state.plan; const u = state.units || 'km';
  const today = toISO(state.today || (plan && plan.createdIso) || new Date());
  const t = plan ? todayWorkout(plan, today) : null;
  const p = plan && plan.paces;
  const days = plan ? allDays(plan) : [];
  const nextRace = (pr) => (plan ? (plan.races || []).filter((r) => r.iso >= today && (!pr || r.priority === pr)).sort((a, b) => (a.iso < b.iso ? -1 : 1))[0] : null);
  const lastRace = plan ? (plan.races || []).filter((r) => r.iso < today).sort((a, b) => (a.iso < b.iso ? 1 : -1))[0] : null;
  const beginner = plan && plan.settings && plan.settings.experience === 'new';

  if (/(recover|after (my|the) race|post.?race)/.test(s)) {
    const r = lastRace || nextRace();
    const n = r ? recoveryDaysFor(r.distKm) : 7;
    return { text: r ? `After ${r.name} (${fmtDate(r.iso)}), take about ${n} easy days. Rest on day 1. Then run short and easy. Hard sessions come back after day ${n}. Then choose: rejoin the plan, a new goal, or keep fit.` : 'After a race, rest on day 1. Then run easy for 2 to 14 days. Longer races need more days. Then choose what comes next.', actions: ['Log a race result'] };
  }
  if (/\bb[- ]?race\b|b race|tune.?up/.test(s)) {
    const r = nextRace('B');
    return { text: `A B race gets a mini taper: 2 to 3 easy days before it, and 2 to 4 easy days after it. It counts as a hard session that week.${r ? ` Your next B race is ${r.name} on ${fmtDate(r.iso)} (${daysBetween(today, r.iso)} days).` : ' Add it in Races and the plan changes around it.'}`, actions: ['Add a race'] };
  }
  if (/(gym|lift|weights|squat|strength)/.test(s) && /(race|before)/.test(s)) {
    const r = nextRace('A');
    const g = plan ? (plan.gymAdvice || []).find((x) => x.iso >= today && x.advice !== 'normal') : null;
    return { text: `Lifting turns to maintenance in the last 10 days before an A race: keep the weight, do half the sets. In race week, no heavy lifting. No heavy legs in the 72 hours before any race.${r ? ` Your A race is on ${fmtDate(r.iso)}. Maintenance starts on ${fmtDate(addDays(r.iso, -10))}. Race week starts on ${fmtDate(addDays(r.iso, -6))}.` : ''}${g ? ` Next change: ${fmtDate(g.iso)}, ${g.advice}. ${g.reason}` : ''}`, actions: [] };
  }
  if (/why/.test(s) && /(today|easy|slow|this)/.test(s)) {
    if (!t) return { text: 'There is no plan for today.', actions: [] };
    const pace = p && !beginner ? ` Your easy pace is ${fmtPace(p.easyLo, u)} to ${fmtPace(p.easyHi, u)}.` : ` ${t.effortText}`;
    return { text: `Today is "${t.title}". ${t.why}${t.adjusted ? ' Change: ' + t.adjusted : ''}${pace}`, actions: ['Show my paces'] };
  }
  if (/(sick|ill|cold|flu|fever)/.test(s)) return { text: 'Use the neck rule. Only nose or throat symptoms: a short easy run is OK if you feel fine. Fever, chest or body aches: rest until you have had no symptoms for 24 hours. Tell me, and I will change the plan.', actions: ['I am ill'] };
  if (/(pain|hurt|injur|sore|knee|shin|ankle|achilles|hip|calf)/.test(s)) return { text: 'Use the pain rule. Pain of 3/10 or less that does not get worse during the run, and is not worse the next morning, is usually OK for easy running. More pain, or a limp: stop running and see a physio or doctor. I cannot diagnose injuries. I can pause the plan and add a return ladder.', actions: ['Report pain'] };
  if (/(move|swap|reschedul|busy|travel)/.test(s)) {
    const next = days.find((d) => d.iso >= today && isRun(d) && d.type !== 'race');
    let extra = '';
    if (plan && next) { const sd = suggestDays(plan, next.iso, { today }); extra = sd.safe.length ? ` Your next session (${next.title}, ${fmtDate(next.iso)}) can go to: ${sd.safe.slice(0, 4).map(fmtDate).join(', ')}.` : ` Your next session (${next.title}) has no other safe day this week.`; }
    return { text: `Yes. You can move a session to another day, also in another week. I keep hard days apart and never put a hard day before the long run. If no safe day is free, I tell you why.${extra}`, actions: ['Move a session'] };
  }
  if (/(miss|skipp)/.test(s)) return { text: 'Do not make up missed easy runs. A missed key session moves to the next safe day. A missed week means a gentle return week.', actions: ['Mark as missed'] };
  if (/(taper|race week|race day)/.test(s)) {
    const r = nextRace('A');
    return { text: `In the taper, distance goes down but some short fast work stays. You can feel restless. That is normal. Sleep, eat well and do not add runs.${r ? ` Your race is on ${fmtDate(r.iso)}, in ${daysBetween(today, r.iso)} days.` : ''}`, actions: [] };
  }
  if (/(pace|zone|fast|slow)/.test(s) && plan) {
    const km = plan.goalKm || 5;
    return { text: `Your running fitness score is ${plan.score}. Easy ${fmtPace(p.easyLo, u)} to ${fmtPace(p.easyHi, u)}. Threshold ${fmtPace(p.threshold, u)}. Intervals ${fmtPace(p.interval, u)}. Predicted ${plan.goalName}: ${fmtTime(predict(plan.score, km))}.`, actions: ['Update from a race'] };
  }
  if (/(eat|fuel|gel|carb|drink|nutrition)/.test(s)) { const w = (state.profile && state.profile.weightKg) || 70; const f = fuel({ min: 120, weightKg: w }); return { text: `For runs longer than 90 minutes, take about ${f.carbsPerHour} g of carbohydrate and ${f.fluidMlPerHour} ml of fluid per hour. ${f.note} In the 2 days before a long race, eat about ${carbLoad(w).gramsPerDay} g of carbohydrate a day.`, actions: ['Open fuel planner'] }; }
  if (/(hot|heat|weather|humid)/.test(s)) { const h = heatAdjust(state.weather || {}); return { text: `${h.note} Heat adjustment changes your targets on hot days.`, actions: [] }; }
  if (/(strength|gym|weights)/.test(s)) return { text: 'One or two short strength sessions a week help most runners. Do them on easy days or after an easy run, not on the day before a hard session. Heavy legs count as a hard day.', actions: ['Open strength'] };
  if (/(load|fitness|fatigue|form)/.test(s)) return { text: `Fitness is your 42-day load. Fatigue is your 7-day load. Form is fitness minus fatigue. ${LOAD_NOTE}`, actions: [] };
  return { text: 'I am the on-device coach. I follow published training rules and explain every change. Ask me why a session is in your plan, what to do when ill or sore, how to move a run, about B races, recovery after a race, gym before a race, or what to eat.', actions: ['Why is today like this?', 'I feel ill', 'Can I move my long run?'] };
}

/* ---------- sample data (demo only) ---------- */
/** SAMPLE DATA for the demo. Every object has sample: true. Never mix it with real data. */
export function sample(today) {
  const t0 = toISO(today || new Date());
  const profile = { name: 'Alex (sample)', sample: true, age: 34, weightKg: 68, maxHR: 188, restHR: 52, lthr: 171, units: 'km', recent: { distKm: 10, timeSec: 48 * 60 + 30, label: '10K in 48:30' }, experience: 'some', runDays: [2, 4, 6, 0], longRunDay: 0 };
  const score = fitnessScore(10, profile.recent.timeSec);
  const race = addDays(mondayOf(t0), 7 * 12 + 6);
  const plan = buildPlan({ goal: 'half', raceDate: race, today: t0, runDays: profile.runDays, longRunDay: 0, currentWeeklyKm: 28, score, experience: 'some', gymDays: [{ day: 1, type: 'upper', intensity: 'heavy', note: 'Strength' }, { day: 3, type: 'legs', intensity: 'light', note: 'Runner legs' }], races: [{ date: addDays(mondayOf(t0), 7 * 6 + 6), distKm: 10, priority: 'B', name: 'Winter 10K (sample)' }] });
  plan.sample = true;
  const r = rng(42); const history = [];
  const types = [['easy', 3], ['tempo', 6], ['easy', 3], ['long', 4]];
  for (let wk = 10; wk >= 1; wk--) {
    const ws = addDays(mondayOf(t0), -7 * wk); const f = wk % 4 === 0 ? 0.8 : 1;
    [[1, 0], [3, 1], [5, 2], [6, 3]].forEach(([dd, k]) => {
      if (r() < 0.08) return;
      const [type, rpe] = types[k];
      const km = round((type === 'long' ? 12 + (10 - wk) * 0.4 : type === 'tempo' ? 8 : 6 + r() * 1.5) * f, 1);
      const pace = type === 'tempo' ? 290 + r() * 12 : type === 'long' ? 345 + r() * 15 : 335 + r() * 20;
      const iso = addDays(ws, dd); const min = Math.round((km * pace) / 60);
      history.push({ id: 'h' + history.length, sample: true, iso, type, title: type === 'tempo' ? 'Tempo run' : type === 'long' ? 'Long run' : 'Easy run', km, min, avgHR: Math.round(type === 'tempo' ? 166 + r() * 4 : 140 + r() * 8), maxHR: 188, restHR: 52, rpe, shoe: type === 'tempo' ? 's2' : 's1', source: 'Sample' });
    });
  }
  history.forEach((a) => { a.load = sessionLoad(a); });
  const shoes = [{ id: 's1', sample: true, name: 'Daily trainer (grey)', km: 412, limit: 700 }, { id: 's2', sample: true, name: 'Light racer (orange)', km: 168, limit: 500 }];
  const races = plan.races.map((x) => ({ ...x, sample: true }));
  const readinessLog = Array.from({ length: 14 }, (_, i) => ({ iso: addDays(t0, i - 13), score: Math.round(55 + 20 * Math.sin(i / 2.3) + r() * 10), sample: true }));
  const weather = { tempC: 9, humidity: 78, wind: 14, desc: 'Cloudy, light wind', sample: true };
  return { sample: true, profile, plan, history, shoes, races, readinessLog, weather, today: t0, units: 'km', goals: Object.keys(GOALS) };
}
