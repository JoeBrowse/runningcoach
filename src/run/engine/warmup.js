/* Warm-up routines for runs, races and lifting sessions.
   Pure functions. All text is ASD-STE100 Simplified Technical English.

   Rules (summary):
   - Run/walk and new runners: a brisk walk and three easy moves. No drills or strides.
   - Easy and long runs: optional mobility, then start slower than the target.
   - Quality runs: the plan already starts with an easy jog. Add mobility, drills
     and strides between the jog and the main set.
   - Races and time trials: shorter races need a longer, sharper warm-up.
     A marathon or ultra needs a short, gentle warm-up, to save energy.
   - Cold weather adds minutes. Hot weather removes some.
   - Lifting: a general warm-up and ramp-up sets. After a run, skip the general part. */

import { clamp } from './util.js';
import { QUALITY_TYPES } from './workouts.js';

export const WARMUP_MOVES = {
  walk: { id: 'walk', name: 'Brisk walk', dose: '5 min', how: 'Walk fast. Swing your arms.', why: 'It raises your heart rate slowly.' },
  jog: { id: 'jog', name: 'Easy jog', dose: '10 min', how: 'Jog very slowly. You can talk easily.', why: 'It warms your muscles and makes your joints move freely.' },
  legSwings: { id: 'legSwings', name: 'Leg swings', dose: '10 each way, each leg', how: 'Hold a wall. Swing one leg forward and back, then side to side.', why: 'It loosens the hips and hamstrings.' },
  hipCircles: { id: 'hipCircles', name: 'Hip circles', dose: '8 each way', how: 'Stand with your hands on your hips. Move your hips in large circles.', why: 'It moves the hips through their full range.' },
  ankleCircles: { id: 'ankleCircles', name: 'Ankle circles', dose: '8 each way, each foot', how: 'Lift one foot. Turn the ankle in slow circles.', why: 'It prepares the ankles and calves.' },
  walkingLunges: { id: 'walkingLunges', name: 'Walking lunges', dose: '8 each leg', how: 'Step forward into a lunge. Keep your chest up. Step through to the next lunge.', why: 'It warms the quads and glutes.' },
  calfRaises: { id: 'calfRaises', name: 'Calf raises', dose: '15', how: 'Stand tall. Rise onto your toes, then lower slowly.', why: 'It prepares the calves and Achilles tendons.' },
  highKnees: { id: 'highKnees', name: 'High knees', dose: '2 x 20 m', how: 'Jog forward with quick, high knee lifts. Stay tall.', why: 'It makes your legs move faster.' },
  buttKicks: { id: 'buttKicks', name: 'Butt kicks', dose: '2 x 20 m', how: 'Jog forward. Bring your heels up towards your seat.', why: 'It loosens the quads.' },
  aSkips: { id: 'aSkips', name: 'A-skips', dose: '2 x 20 m', how: 'Skip with high knees. Land under your hips.', why: 'It practises good running form.' },
  strides: { id: 'strides', name: 'Strides', dose: '4 x 20 s', how: 'Run fast but relaxed for 20 seconds. Walk back. Do not sprint.', why: 'It prepares your body for fast running.' },
  slowStart: { id: 'slowStart', name: 'Start slowly', dose: 'First 5 to 10 min', how: 'Run the first part slower than the target. Then go to the target.', why: 'The run itself becomes the warm-up.' },
  rowerOrBike: { id: 'rowerOrBike', name: 'Rower, bike or brisk walk', dose: '5 min', how: 'Move at an easy effort. Breathe a little harder at the end.', why: 'It raises your body temperature before you lift.' },
  rampSets: { id: 'rampSets', name: 'Ramp-up sets', dose: '2 to 3 lighter sets', how: 'Before the first heavy lift, do 2 or 3 sets with lighter weights and fewer reps.', why: 'It prepares the muscles and the movement for the heavy sets.' },
};

const MOBILITY_BASIC = ['legSwings', 'hipCircles', 'ankleCircles'];
const MOBILITY_FULL = ['legSwings', 'hipCircles', 'walkingLunges', 'calfRaises'];
const DRILLS_SET = ['highKnees', 'buttKicks', 'aSkips'];


function move(id, dose) {
  const m = WARMUP_MOVES[id];
  return dose ? { ...m, dose } : { ...m };
}

function phase(id, title, min, items, note) {
  return { id, title, min, items, ...(note ? { note } : {}) };
}

function weatherAdjust(tempC) {
  if (tempC == null || Number.isNaN(Number(tempC))) return { extra: 0, note: null };
  const t = Number(tempC);
  if (t < 0) return { extra: 5, note: 'It is below 0 °C. Warm up 5 minutes longer. Wear layers and take them off before the main part.' };
  if (t < 5) return { extra: 3, note: 'It is cold. Warm up 3 minutes longer. Wear layers and take them off before the main part.' };
  if (t > 24) return { extra: -3, note: 'It is hot. Keep the warm-up short and easy. Drink water before you start.' };
  return { extra: 0, note: null };
}

function raceWarmup(km, ctx, w) {
  const strides = ctx.experience === 'new' ? 2 : km <= 10 ? 6 : 3;
  if (km >= 30) {
    return [
      phase('general', 'Walk and light jog', clamp(8 + w.extra, 5, 15), [move('walk', '5 min'), move('jog', '3 to 5 min, very easy')]),
      phase('mobility', 'Mobility', 4, MOBILITY_BASIC.map((id) => move(id))),
    ];
  }
  if (km >= 15) {
    return [
      phase('general', 'Easy jog', clamp(10 + w.extra, 6, 18), [move('jog', '10 min')]),
      phase('mobility', 'Mobility', 4, MOBILITY_FULL.map((id) => move(id))),
      phase('strides', 'Strides', 3, [move('strides', `${strides} x 20 s`)]),
    ];
  }
  return [
    phase('general', 'Easy jog', clamp(15 + w.extra, 10, 22), [move('jog', '15 min')]),
    phase('mobility', 'Mobility', 5, MOBILITY_FULL.map((id) => move(id))),
    phase('drills', 'Drills', 4, DRILLS_SET.map((id) => move(id))),
    phase('strides', 'Strides', 4, [move('strides', `${strides} x 20 s`)]),
  ];
}

/**
 * The warm-up for one workout.
 * ctx: { experience: 'new'|'some'|'experienced', tempC, goal }
 * Returns null for rest, cross-training and gym days (use liftWarmup for those),
 * or { kind, minutes, phases: [{id, title, min, items: [move], note?}], notes: [], inSteps }.
 * `inSteps` is true when the plan's steps already include the easy jog (quality runs);
 * the recorder then plays only the extra phases after that jog.
 */
export function warmupFor(workout, ctx = {}) {
  if (!workout || !workout.type) return null;
  const t = workout.type;
  if (['rest', 'cross', 'strength', 'gym'].includes(t)) return null;
  const w = weatherAdjust(ctx.tempC);
  const notes = w.note ? [w.note] : [];
  const isNew = ctx.experience === 'new' || t === 'runwalk';
  let kind; let phases; let inSteps = false;

  if (t === 'race' || t === 'timetrial') {
    kind = 'race';
    const km = Number(workout.km) || 10;
    if (t === 'race' && (workout.goal || ctx.goal) === 'runwalk') {
      phases = [phase('general', 'Brisk walk', clamp(8 + w.extra, 5, 12), [move('walk', '8 min')]), phase('mobility', 'Mobility', 3, MOBILITY_BASIC.map((id) => move(id)))];
    } else {
      phases = raceWarmup(km, ctx, w);
    }
    notes.push(km >= 30 ? 'Save your energy. The first kilometres of the race finish the warm-up.' : 'Finish the warm-up about 10 minutes before the start. Keep warm while you wait.');
  } else if (t === 'runwalk' || isNew) {
    kind = 'gentle';
    phases = [
      phase('general', 'Brisk walk', clamp(5 + w.extra, 3, 10), [move('walk')]),
      phase('mobility', 'Easy moves', 3, MOBILITY_BASIC.map((id) => move(id))),
    ];
    notes.push('Go slowly at first. You can talk the whole time.');
  } else if (QUALITY_TYPES.has(t)) {
    kind = 'quality';
    inSteps = (workout.steps || []).some((s) => s.kind === 'warmup');
    phases = [
      ...(inSteps ? [] : [phase('general', 'Easy jog', clamp(10 + w.extra, 6, 15), [move('jog')])]),
      phase('mobility', 'Mobility', 4, MOBILITY_FULL.map((id) => move(id))),
      phase('drills', 'Drills', 3, DRILLS_SET.map((id) => move(id))),
      phase('strides', 'Strides', 3, [move('strides', ctx.experience === 'new' ? '2 x 20 s' : '4 x 20 s')]),
    ];
    if (inSteps) notes.push('Do these after the easy jog at the start of the session, before the main set.');
    if (w.extra > 0 && inSteps) notes.push(`Make the easy jog ${w.extra} minutes longer.`);
  } else {
    kind = 'easy';
    phases = [
      phase('mobility', 'Mobility (optional)', clamp(4 + Math.max(0, w.extra), 3, 8), MOBILITY_FULL.map((id) => move(id))),
      phase('start', 'Start slowly', 0, [move('slowStart', t === 'long' || t === 'longfinish' ? 'First 10 min' : 'First 5 min')]),
    ];
  }
  const minutes = phases.reduce((s, p) => s + (p.min || 0), 0);
  return { kind, minutes, phases, notes, inSteps };
}

/**
 * The warm-up before a lifting session.
 * ctx: { afterRun: bool (a run in the last 2 hours), heavy: bool }
 */
export function liftWarmup(ctx = {}) {
  const phases = [];
  if (!ctx.afterRun) phases.push(phase('general', 'General warm-up', 5, [move('rowerOrBike')]));
  phases.push(phase('mobility', 'Mobility', 3, ['legSwings', 'hipCircles', 'walkingLunges'].map((id) => move(id))));
  phases.push(phase('ramp', 'Ramp-up sets', 0, [move('rampSets', ctx.heavy === false ? '1 to 2 lighter sets' : '2 to 3 lighter sets')]));
  const notes = ctx.afterRun
    ? ['You ran in the last 2 hours. Your body is warm, so skip the general warm-up. Still do the ramp-up sets.']
    : [];
  return { kind: 'lift', minutes: phases.reduce((s, p) => s + p.min, 0), phases, notes };
}

/** Voice cues for the warm-up phases: [{t (seconds from start), text}]. */
export function warmupCues(warmup) {
  if (!warmup) return [];
  const cues = []; let t = 0;
  for (const p of warmup.phases) {
    if (!p.min) continue;
    const names = p.items.map((m) => m.name).join(', ');
    cues.push({ t, text: `${p.title}. ${p.min} minutes. ${names}.` });
    t += p.min * 60;
  }
  cues.push({ t, text: 'Warm-up complete. Start the session.' });
  return cues;
}
