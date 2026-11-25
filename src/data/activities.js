/* ---------------------------------------------------------------
   CARDIO & OTHER ACTIVITY

   A run is not a workout in this app's sense — it has no sets, no
   weights and no exercises — but the legs it just spent an hour on are
   the same legs Tuesday's squats are for, and a readiness map that
   ignores that is lying by omission.

   So activities are stored apart from workout-history, where they
   cannot distort set counts, weekly volume or the training log, and are
   fed into the readiness map alongside it.

   Effort is RPE 1-10 rather than the four-point tap used for sets: RIR
   is meaningless for a run, and a gentle walk sits at 3, far below
   anything the lifting scale bothers to distinguish. The threshold for
   "hard" is the same one lifting uses, though — RPE 9 is 1 RIR — so one
   rule decides which recovery column applies, whatever produced the
   fatigue.
--------------------------------------------------------------- */

/* The catalogue. Grouped indoor and outdoor because that is how the
   choice is actually made — you know which door you went through.

   Each entry carries what it works and what unit it is read in, since
   both are properties of the sport rather than of the app. A rower reads
   a /500m split, a swimmer reads /100m, a cyclist reads km/h and a
   runner reads min/km; showing any of them the wrong one is the sort of
   detail that makes software feel written by someone who has never done
   it. Where an activity has no meaningful distance — a stair climber, a
   skipping rope — no pace is offered rather than a fabricated one. */
export const ACTIVITY_TYPES = [
  // ---- Outdoor ----
  {
    id: "run",
    label: "Run",
    group: "Outdoor",
    // Impact and repeated eccentric braking: the calves and quads take
    // the most of it, the posterior chain and shins a real share.
    primary: ["Quads", "Calves", "Hamstrings"],
    secondary: ["Glutes", "Shins", "Core"],
    pace: "min/km",
    distanceUnit: "km",
  },
  {
    id: "walk",
    label: "Walk",
    group: "Outdoor",
    // Nothing here is primary. Walking is what legs are for; treating a
    // half-hour stroll as direct leg work would paint the map red for
    // people who simply commute on foot.
    primary: [],
    secondary: ["Calves", "Quads", "Glutes"],
    pace: "min/km",
    distanceUnit: "km",
  },
  {
    id: "hike",
    label: "Hike",
    group: "Outdoor",
    // Gradient and a pack turn a walk into leg work, and uneven ground
    // asks something of the trunk that flat pavement does not.
    primary: ["Quads", "Calves"],
    secondary: ["Glutes", "Hamstrings", "Core", "Lower Back"],
    pace: "min/km",
    distanceUnit: "km",
  },
  {
    id: "cycle",
    label: "Cycle",
    group: "Outdoor",
    // Concentric-dominant and quad-led, with far less eccentric damage
    // than running, so the hamstrings and calves stay indirect.
    primary: ["Quads"],
    secondary: ["Glutes", "Hamstrings", "Calves"],
    pace: "km/h",
    distanceUnit: "km",
  },
  {
    id: "swim",
    label: "Swim",
    group: "Outdoor",
    // The one piece of cardio here that is mostly upper body.
    primary: ["Back", "Front Delts"],
    secondary: ["Chest", "Triceps", "Rear Delts", "Core"],
    pace: "min/100m",
    distanceUnit: "m",
  },
  // ---- Indoor ----
  {
    id: "treadmill",
    label: "Treadmill Run",
    group: "Indoor",
    primary: ["Quads", "Calves", "Hamstrings"],
    secondary: ["Glutes", "Shins", "Core"],
    pace: "min/km",
    distanceUnit: "km",
  },
  {
    id: "incline-walk",
    label: "Incline Walk",
    group: "Indoor",
    // The gradient is what makes this different from a walk: the calves
    // do real work and the quads follow.
    primary: ["Calves"],
    secondary: ["Quads", "Glutes", "Hamstrings"],
    pace: "min/km",
    distanceUnit: "km",
  },
  {
    id: "stationary-bike",
    label: "Stationary Bike",
    group: "Indoor",
    primary: ["Quads"],
    secondary: ["Glutes", "Hamstrings", "Calves"],
    pace: "km/h",
    distanceUnit: "km",
  },
  {
    id: "spin",
    label: "Spin Class",
    group: "Indoor",
    // Out of the saddle and against resistance, which brings the glutes
    // in properly and asks more of the trunk than steady riding.
    primary: ["Quads", "Glutes"],
    secondary: ["Hamstrings", "Calves", "Core"],
    pace: "km/h",
    distanceUnit: "km",
  },
  {
    id: "rower",
    label: "Rowing Machine",
    group: "Indoor",
    // A leg press with a pull on the end. The erectors hold the whole
    // thing together, which is why they are in here and not in the bike.
    primary: ["Quads", "Back"],
    secondary: ["Glutes", "Hamstrings", "Biceps", "Core", "Lower Back"],
    pace: "min/500m",
    distanceUnit: "m",
  },
  {
    id: "elliptical",
    label: "Elliptical",
    group: "Indoor",
    primary: ["Quads"],
    secondary: ["Glutes", "Hamstrings", "Calves", "Core"],
    pace: "km/h",
    distanceUnit: "km",
  },
  {
    id: "stair-climber",
    label: "Stair Climber",
    group: "Indoor",
    // Step after step of hip and knee extension against bodyweight.
    primary: ["Quads", "Glutes", "Calves"],
    secondary: ["Hamstrings", "Core"],
    pace: null,
    distanceUnit: null,
  },
  {
    id: "assault-bike",
    label: "Assault Bike",
    group: "Indoor",
    // The arms drive as hard as the legs, which is the whole point of it
    // and the reason it is the most systemically brutal thing on here.
    primary: ["Quads"],
    secondary: ["Glutes", "Hamstrings", "Chest", "Back", "Front Delts", "Core"],
    pace: null,
    distanceUnit: null,
  },
  {
    id: "jump-rope",
    label: "Jump Rope",
    group: "Indoor",
    primary: ["Calves"],
    secondary: ["Quads", "Shins", "Core"],
    pace: null,
    distanceUnit: null,
  },
  {
    id: "other",
    label: "Other",
    group: "Indoor",
    // Five-a-side, a climbing session, a martial arts class. The app
    // cannot know what these worked, and guessing would be worse than
    // the gap, so they are logged and timed but leave the map alone.
    // The form says so rather than letting it look like a bug.
    primary: [],
    secondary: [],
    pace: null,
    distanceUnit: null,
  },
];

export const ACTIVITY_GROUPS = ["Outdoor", "Indoor"];
