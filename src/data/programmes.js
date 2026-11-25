import { DURATION_OPTIONS } from "../lib/workoutBuilder.js";

// Preset day structures. Each day is [name, [muscles...], [exerciseIds...]].
// The exercise list is hand-picked to mirror a real, well-known published
// programme rather than generated algorithmically. "Custom" starts empty
// and has no exercise list, so its days fall back to the algorithmic picker.
export const PROGRAMME_PRESETS = [
  {
    key: "pplul",
    name: "Push Pull Legs Upper Lower",
    blurb: "5 sessions over ~7 days — PPL plus dedicated upper/lower days for extra frequency.",
    days: [
      ["Push", ["Chest", "Front Delts", "Side Delts", "Triceps"], ["bench-press", "incline-press", "overhead-press", "lateral-raise", "pushdown", "overhead-extension"]],
      ["Pull", ["Back", "Rear Delts", "Biceps"], ["pull-ups", "bent-over-row", "face-pull", "cable-curl", "hammer-curl"]],
      ["Legs", ["Quads", "Hamstrings", "Calves"], ["squat", "romanian-deadlift", "leg-extension", "leg-curl", "standing-calf-raise"]],
      ["Upper", ["Chest", "Back", "Front Delts", "Side Delts", "Biceps", "Triceps"], ["incline-press", "cable-row", "overhead-press", "lateral-raise", "cable-curl", "pushdown"]],
      ["Lower", ["Quads", "Hamstrings", "Glutes", "Calves"], [["squat", "Front"], "good-morning", "hip-thrust", "lunge", "glute-ham-raise", "seated-calf-raise"]],
    ],
  },
  {
    key: "ppl",
    name: "Push Pull Legs",
    blurb: "The classic 3-day rotation. Run it once or twice per week.",
    days: [
      ["Push", ["Chest", "Front Delts", "Side Delts", "Triceps"], ["bench-press", "incline-press", "overhead-press", "lateral-raise", "pushdown", "overhead-extension"]],
      ["Pull", ["Back", "Rear Delts", "Biceps"], ["deadlift", "pull-ups", "bent-over-row", "face-pull", "cable-curl", "hammer-curl"]],
      ["Legs", ["Quads", "Hamstrings", "Calves"], ["squat", "romanian-deadlift", "leg-press", "leg-curl", "leg-extension", "standing-calf-raise"]],
    ],
  },
  {
    key: "upper-lower",
    name: "Upper Lower",
    blurb: "4 sessions/week hitting each half twice. Balanced and simple.",
    days: [
      ["Upper", ["Chest", "Back", "Front Delts", "Side Delts", "Biceps", "Triceps"], ["bench-press", "bent-over-row", "overhead-press", "lat-pulldown", "lateral-raise", "cable-curl", "pushdown"]],
      ["Lower", ["Quads", "Hamstrings", "Glutes", "Calves"], ["squat", "romanian-deadlift", "leg-press", "leg-curl", "hip-thrust", "standing-calf-raise"]],
    ],
  },
  {
    key: "full-body",
    name: "Full Body",
    blurb: "Two alternating full-body sessions, 3x/week. Simple, heavy, effective.",
    days: [
      ["Full Body A", ["Quads", "Chest", "Back"], ["squat", "bench-press", "bent-over-row"]],
      ["Full Body B", ["Quads", "Front Delts", "Back"], ["squat", "overhead-press", "deadlift"]],
    ],
  },
  {
    key: "bro",
    name: "Bro Split",
    blurb: "One muscle group per day, 5 days. Maximum focus per session.",
    days: [
      ["Chest", ["Chest"], ["bench-press", "incline-press", "dips", "cable-fly", "pec-deck"]],
      ["Back", ["Back"], ["deadlift", "pull-ups", "bent-over-row", "lat-pulldown", "straight-arm-pulldown"]],
      ["Shoulders", ["Front Delts", "Side Delts", "Rear Delts"], ["overhead-press", "lateral-raise", "face-pull", "reverse-fly"]],
      ["Legs", ["Quads", "Hamstrings", "Calves"], ["squat", "romanian-deadlift", "leg-press", "leg-curl", "leg-extension", "standing-calf-raise"]],
      ["Arms", ["Biceps", "Triceps"], ["cable-curl", "incline-curl", "hammer-curl", "pushdown", "skull-crusher", "overhead-extension"]],
    ],
  },
  {
    key: "arnold",
    name: "Arnold Split",
    blurb: "6 sessions/week: Chest & Back, Shoulders & Arms, Legs — repeated twice. High volume, old-school.",
    days: [
      ["Chest & Back", ["Chest", "Back"], ["bench-press", "incline-press", "dips", "pull-ups", "bent-over-row", "straight-arm-pulldown"]],
      ["Shoulders & Arms", ["Front Delts", "Side Delts", "Rear Delts", "Biceps", "Triceps"], ["overhead-press", "close-grip-bench", "lateral-raise", "face-pull", "cable-curl", "preacher-curl", "pushdown"]],
      ["Legs", ["Quads", "Hamstrings", "Calves"], ["squat", "leg-press", "leg-extension", "romanian-deadlift", "leg-curl", "standing-calf-raise", "seated-calf-raise"]],
    ],
  },
  {
    key: "project-arms",
    name: "Project Arms",
    blurb: "Upper, lower, arms — twice through, with a rest day after each block. Two dedicated arm sessions a week and direct forearm and grip work.",
    days: [
      ["Upper A", ["Back", "Chest", "Front Delts", "Side Delts", "Rear Delts"], ["pull-ups", "bench-press", "overhead-press", "cable-fly", "lateral-raise", "face-pull"]],
      ["Lower A", ["Quads", "Hamstrings", "Glutes", "Calves", "Core"], [["squat", "Hack"], "romanian-deadlift", "hip-thrust", "hip-adduction", "standing-calf-raise", "cable-crunch"]],
      ["Arms A", ["Triceps", "Biceps", "Forearms", "Traps"], ["overhead-extension", "cable-curl", "hammer-curl", "wrist-curl", "reverse-wrist-curl", "farmers-carry"]],
      ["Upper B", ["Chest", "Back", "Side Delts", "Rear Delts"], ["incline-press", "bent-over-row", "dips", "lat-pulldown", "lateral-raise", "reverse-fly"]],
      ["Lower B", ["Quads", "Hamstrings", "Glutes", "Shins", "Core"], ["leg-press", "leg-curl", "leg-extension", "hip-abduction", "tibialis-raise", "hanging-leg-raise"]],
      ["Arms B", ["Triceps", "Biceps", "Forearms"], ["pushdown", "preacher-curl", "reverse-curl", "eugene-curl", "reverse-eugene-curl", "plate-pinch"]],
    ],
  },
  {
    key: "custom",
    name: "Custom",
    blurb: "Build your own days from scratch.",
    days: [],
  },
];

// Recommended block lengths. 6–8 weeks is the usual sweet spot before a
// deload or exercise swap, so those are flagged as recommended.
export const PROGRAMME_LENGTHS = [
  { weeks: 4, label: "4 weeks", desc: "Short block or a test run." },
  { weeks: 6, label: "6 weeks", desc: "Recommended — long enough to progress, short enough to stay fresh.", recommended: true },
  { weeks: 8, label: "8 weeks", desc: "Recommended — a full training block with room to peak.", recommended: true },
  { weeks: 12, label: "12 weeks", desc: "Long build. Consider a deload around the midpoint." },
];

/* ---------------------------------------------------------------
   GUIDED PROGRAMME
   A short questionnaire (experience, session length, muscles to
   prioritize) maps to one of the existing presets and generates its
   day exercises algorithmically — same building blocks as "Train Ready
   Muscles", just seeded from the preset's day/muscle structure instead
   of live readiness.
--------------------------------------------------------------- */

export const GUIDED_EXPERIENCE_OPTIONS = [
  { value: "new", label: "New To Training", desc: "Just starting out, or getting back into it after a long break.", presetKey: "full-body" },
  { value: "some", label: "Some Experience", desc: "You've trained fairly consistently for a while now.", presetKey: "upper-lower" },
  { value: "experienced", label: "Very Experienced", desc: "You know your way around the gym and want more frequency.", presetKey: "ppl" },
];

// Same duration → exercise-count mapping "Train Ready Muscles" uses, so a
// guided session and a suggested one feel the same size for the same answer.
export const GUIDED_DURATION_OPTIONS = DURATION_OPTIONS;

/* ---------------------------------------------------------------
   GUIDED DAY BLUEPRINTS

   Picking purely by muscle ranking produced sessions that were wrong in
   ways a coach would spot instantly: a deadlift on an upper day, a pull
   day with no row or pulldown in it, both calf raises together, squats
   and deadlifts opening every session of a beginner's week.

   The problem is that "which exercise" and "what job does it do in this
   session" are different questions, and only the first was being asked.
   A blueprint answers the second: an ordered list of slots, each naming a
   muscle, whether it wants a compound or an isolation, and which movement
   patterns satisfy it. Slots are filled from the user's own ranked,
   visible exercises, so reordering or removing things in the Exercise
   Database still decides *which* lift shows up — the blueprint only
   decides what kind of lift belongs there.

   Order is the time budget. The list is written hardest-and-most-useful
   first, so a 15-minute session takes the top three slots and gets three
   compounds, while an hour reaches the isolation work at the bottom.
   That is the whole mechanism behind "more time means more isolation".
--------------------------------------------------------------- */

export const S = (muscle, type, patterns) => ({ muscle, type, patterns });

// Pattern groups, named for the job rather than the equipment.
export const P = {
  horizPush: ["press", "press-incline", "press-bodyweight", "press-dip"],
  vertPush: ["press-overhead"],
  horizPull: ["horizontal-pull"],
  vertPull: ["vertical-pull"],
  backIso: ["isolation-pull", "pullover"],
  squat: ["squat", "lunge", "unilateral-squat"],
  legPress: ["leg-press", "lunge"],
  quadIso: ["isolation-extension"],
  hinge: ["hinge"],
  hamIso: ["flexion", "flexion-seated"],
  glute: ["hip-extension", "unilateral-squat"],
  gluteIso: ["abduction", "isolation-extension"],
  lateral: ["lateral", "upright-row"],
  rearDelt: ["rear-fly", "rear-pull"],
  chestIso: ["fly"],
  triPush: ["extension-pushdown", "press-dip"],
  triOverhead: ["extension-overhead", "extension-lying"],
  bicep: ["curl-standard", "curl-strict", "curl-stretch"],
  bicepAlt: ["curl-hammer", "curl-reverse"],
  calf: ["standing"],
  calfSeated: ["seated"],
  core: ["anti-extension", "flexion", "rotation", "isometric"],
  shrug: ["shrug"],
  lowerBack: ["hinge", "extension-back"],
  shin: ["tibialis"],
};

export const DAY_BLUEPRINTS = {
  // Beginner full body: one big pattern per session, alternating emphasis,
  // so squat and deadlift never land in the same workout.
  "Full Body A": [
    S("Quads", "compound", P.squat),
    S("Chest", "compound", P.horizPush),
    S("Back", "compound", P.horizPull),
    S("Hamstrings", "compound", P.hinge),
    S("Side Delts", "isolation", P.lateral),
    S("Triceps", "isolation", P.triPush),
    S("Biceps", "isolation", P.bicep),
    S("Core", "isolation", P.core),
    S("Calves", "isolation", P.calf),
  ],
  "Full Body B": [
    S("Hamstrings", "compound", P.hinge),
    S("Front Delts", "compound", P.vertPush),
    S("Back", "compound", P.vertPull),
    S("Quads", "compound", P.legPress),
    S("Chest", "compound", P.horizPush),
    S("Biceps", "isolation", P.bicepAlt),
    S("Calves", "isolation", P.calf),
    S("Core", "isolation", P.core),
    S("Triceps", "isolation", P.triOverhead),
  ],
  // Upper: push and pull matched pair for pair before anything else.
  Upper: [
    S("Chest", "compound", P.horizPush),
    S("Back", "compound", P.horizPull),
    S("Front Delts", "compound", P.vertPush),
    S("Back", "compound", P.vertPull),
    S("Triceps", "isolation", P.triPush),
    S("Biceps", "isolation", P.bicep),
    S("Side Delts", "isolation", P.lateral),
    S("Chest", "isolation", P.chestIso),
    S("Rear Delts", "isolation", P.rearDelt),
  ],
  Lower: [
    S("Quads", "compound", P.squat),
    S("Hamstrings", "compound", P.hinge),
    S("Quads", "compound", P.legPress),
    S("Glutes", "compound", P.glute),
    S("Hamstrings", "isolation", P.hamIso),
    S("Calves", "isolation", P.calf),
    S("Quads", "isolation", P.quadIso),
    S("Lower Back", "isolation", P.lowerBack),
    S("Core", "isolation", P.core),
    S("Glutes", "isolation", P.gluteIso),
  ],
  Push: [
    S("Chest", "compound", P.horizPush),
    S("Front Delts", "compound", P.vertPush),
    S("Chest", "compound", P.horizPush),
    S("Side Delts", "isolation", P.lateral),
    S("Triceps", "isolation", P.triPush),
    S("Chest", "isolation", P.chestIso),
    S("Triceps", "isolation", P.triOverhead),
    S("Rear Delts", "isolation", P.rearDelt),
    S("Core", "isolation", P.core),
  ],
  // A pull day leads with actual pulling. The hinge sits mid-list so a
  // short session is rows and pulldowns, not a deadlift and two curls.
  Pull: [
    S("Back", "compound", P.vertPull),
    S("Back", "compound", P.horizPull),
    S("Lower Back", "compound", P.lowerBack),
    S("Rear Delts", "isolation", P.rearDelt),
    S("Biceps", "isolation", P.bicep),
    S("Back", "isolation", P.backIso),
    S("Biceps", "isolation", P.bicepAlt),
    S("Traps", "isolation", P.shrug),
    S("Core", "isolation", P.core),
  ],
  Legs: [
    S("Quads", "compound", P.squat),
    S("Hamstrings", "compound", P.hinge),
    S("Quads", "compound", P.legPress),
    S("Glutes", "compound", P.glute),
    S("Hamstrings", "isolation", P.hamIso),
    S("Calves", "isolation", P.calf),
    S("Quads", "isolation", P.quadIso),
    S("Calves", "isolation", P.calfSeated),
    S("Shins", "isolation", P.shin),
    S("Core", "isolation", P.core),
  ],
};
