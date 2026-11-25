/* Preferences that pure helpers need but cannot be handed.

   Recovery windows and the history cap are read deep inside functions that
   take a muscle or a set list and nothing else — threading settings down to
   every one of them would mean changing dozens of signatures to carry a
   value that is the same everywhere. The palette has the same problem and
   solves it with a module object rewritten when settings change (see
   applyTheme); these follow it rather than inventing a second pattern. */
export const TRAINING = { historyDepth: 20, recoveryPace: 1 };

// How much longer a muscle is treated as needing. Someone who recovers fast
// and trains a muscle every third day is not served by a table that says
// otherwise, and someone older or on a deficit is not served by rushing them.
export const RECOVERY_PACES = [
  { value: "faster", label: "Faster", factor: 0.75, desc: "Muscles show as ready about 25% sooner." },
  { value: "normal", label: "Normal", factor: 1, desc: "The app uses the recovery times from research, with no change." },
  { value: "slower", label: "Slower", factor: 1.35, desc: "Muscles show as ready about 35% later." },
];

export function applyTrainingPrefs(settings) {
  const s = settings || {};
  const depth = parseInt(s.historyDepth, 10);
  TRAINING.historyDepth = Number.isFinite(depth) && depth > 0 ? depth : 20;
  const pace = RECOVERY_PACES.find((p) => p.value === s.recoveryPace);
  TRAINING.recoveryPace = pace ? pace.factor : 1;
}

// Every per-exercise history write trims to the same depth, so the cap is
// asked for rather than repeated as a literal at each call site.
export function capHistory(list) {
  return (list || []).slice(-TRAINING.historyDepth);
}

/* ---------------------------------------------------------------
   SETTINGS
--------------------------------------------------------------- */

export const DEFAULT_SETTINGS = {
  appMode: "simple", // "simple" | "advanced" — see APP_MODES below
  showCues: false,
  showWarmups: false,
  showLastSet: true,
  showSetTicks: true,
  showBodyMap: true,
  autoRestTimer: true,
  restTimerSound: true,
  restVibrate: true,
  // Seconds. The defaults are the science-backed windows described above
  // REST_SECONDS; these are what a lifter who disagrees can move them to.
  restCompound: 120,
  restIsolation: 90,
  startingSets: 1,
  effortScale: "rir", // "rir" | "rpe" — a display choice; both store the same value
  recoveryPace: "normal", // "faster" | "normal" | "slower"
  historyDepth: 20,
  includeMobility: false,
  randomizeSelection: false,
  weightUnit: "kg",
  theme: "system",
  colourScheme: "default",
  highContrast: false,
  stravaShare: false,
  showIntro: true,
  // Skid Marks: the top-level mode ("plan" | "run" | "lift"). See src/modes/.
  mode: "lift",
  // The opening animation plays on the first launch only, unless this is on.
  introEachLaunch: false,
};


// Simple mode keeps a first-time lifter to the essentials: muscle-tap
// exercise selection, weight/reps logging, and a rest timer — no
// no implement picker, no supersets or
// drop sets, no cable/machine brand+grip tracking, no custom exercises
// or templates. Advanced mode is the full app, unchanged. Toggled from
// Settings; gated with `settings.appMode === "advanced"` at each site
// rather than a prop drilled everywhere, since it only touches a handful
// of screens (SelectScreen, WorkoutScreen, ExerciseCard).
export const APP_MODES = [
  { value: "simple", label: "Simple", desc: "Only the basic features. Select a muscle and record your sets. Runs use effort words, not paces." },
  { value: "advanced", label: "Advanced", desc: "All features: implement choice, supersets, drop sets, effort, machine and grip records, and templates. Runs show paces, zones, plan phases and the running fitness score." },
];
