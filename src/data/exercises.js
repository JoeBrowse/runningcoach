export const EXERCISES = {
  Chest: [
    { id: "bench-press", name: "Bench Press", type: "compound", pattern: "press", cue: "Hold the shoulder blades back and down. Lower the bar to the lower chest. Do not let the elbows go out to 90 degrees." },
    { id: "incline-press", name: "Incline Press", type: "compound", pattern: "press-incline", cue: "Set the bench at 30-45 degrees. A steeper angle makes it a shoulder press." },
    { id: "dips", name: "Dips", type: "compound", pattern: "press-dip", cue: "Lean the torso forward. Let the elbows move out a little. An upright body with tucked elbows trains the triceps more." },
    { id: "cable-fly", name: "Cable Fly", type: "isolation", pattern: "fly", cue: "Keep a small bend in the elbows. Bring the hands together and slightly across. Control the weight on the way back." },
    { id: "pec-deck", name: "Pec Deck", type: "isolation", pattern: "fly", cue: "Set the seat so that the handles are at chest height. Squeeze for one second at the middle. Control the return." },
    { id: "push-up", name: "Push-Up", type: "compound", pattern: "press-bodyweight", cue: "Keep a straight line from the shoulders to the ankles. Lower the chest to the floor. Keep the elbows at about 45 degrees." },
  ],
  Back: [
    { id: "pull-ups", name: "Pull-Up", type: "compound", pattern: "vertical-pull", cue: "Start from a full hang. Pull the elbows down and back. Stop at the top, then lower slowly." },
    { id: "bent-over-row", name: "Bent-Over Row", type: "compound", pattern: "horizontal-pull", cue: "Bend at the hips to about 45 degrees and hold that angle. Pull to the belly button. Squeeze the shoulder blades, then lower slowly." },
    { id: "lat-pulldown", name: "Lat Pulldown", type: "compound", pattern: "vertical-pull", cue: "Pull with the elbows first. Pull the bar to the upper chest. Control the bar all the way back up." },
    { id: "chest-supported-row", name: "Chest-Supported Row", type: "compound", pattern: "horizontal-pull", cue: "Keep the chest on the pad for the full set. If the chest comes off the pad, the weight is too heavy." },
    { id: "cable-row", name: "Seated Cable Row", type: "compound", pattern: "horizontal-pull", cue: "Pull to the torso with the elbows close to the body. Squeeze the shoulder blades together for one second. Stay upright." },
    { id: "db-row", name: "Dumbbell Row", type: "compound", pattern: "horizontal-pull", cue: "Stretch fully at the bottom. Pull the elbow toward the hip. Keep the torso square. Do not turn the torso." },
    { id: "straight-arm-pulldown", name: "Straight-Arm Pulldown", type: "isolation", pattern: "isolation-pull", cue: "Keep the arms almost straight. Pull with the lats, not the triceps. Stop when the bar touches the thighs." },
    { id: "pullover", name: "Pullover", type: "isolation", pattern: "pullover", cue: "Keep the ribs down. Stretch overhead, but do not arch the lower back. Pull back with the arms almost straight." },
  ],
  "Front Delts": [
    { id: "overhead-press", name: "Overhead Press", type: "compound", pattern: "press-overhead", cue: "Tighten the core before each rep. Push the bar straight up past the face. Finish with the biceps next to the ears." },
    { id: "front-raise", name: "Front Raise", type: "isolation", pattern: "front-raise", cue: "Lift to shoulder height with a small bend in the elbow. Do not swing the hips. Lower more slowly than you lift." },
  ],
  "Side Delts": [
    { id: "lateral-raise", name: "Lateral Raise", type: "isolation", pattern: "lateral", cue: "Lift with the elbow, not the hand. Stop at shoulder height. Lower the weight slowly all the way down." },
    { id: "upright-row", name: "Upright Row", type: "compound", pattern: "upright-row", cue: "Pull to chest height with the elbows first. If the shoulder hurts, use a wider grip or pull less high." },
  ],
  "Rear Delts": [
    { id: "reverse-fly", name: "Reverse Fly", type: "isolation", pattern: "rear-fly", cue: "Open the arms wide. Keep the elbow angle the same. Pull the hands apart. Do not lift the shoulders." },
    { id: "face-pull", name: "Face Pull", type: "isolation", pattern: "rear-pull", cue: "Pull to eye level. Turn the hands back at the end and squeeze. Keep the elbows high." },
  ],
  Biceps: [
    { id: "preacher-curl", name: "Preacher Curl", type: "isolation", pattern: "curl-strict", cue: "Put the armpits on the top of the pad. Stop just before the arms are straight. Squeeze at the top." },
    { id: "cable-curl", name: "Cable Curl", type: "isolation", pattern: "curl-standard", cue: "Keep the muscle under tension. Lower as slowly as you lift. Keep the elbows at your sides." },
    { id: "hammer-curl", name: "Hammer Curl", type: "isolation", pattern: "curl-hammer", cue: "Keep the palms facing each other. Do not swing. Lower slowly. This trains the brachialis under the bicep." },
    { id: "incline-curl", name: "Incline Curl", type: "isolation", pattern: "curl-stretch", cue: "Let the arms hang behind the body for a full stretch. Do not let the shoulders move forward when you curl." },
  ],
  Triceps: [
    { id: "overhead-extension", name: "Overhead Extension", type: "isolation", pattern: "extension-overhead", cue: "Keep the elbows pointed forward and still. The stretch overhead trains the long head." },
    { id: "pushdown", name: "Pushdown", type: "isolation", pattern: "extension-pushdown", cue: "Keep the upper arms against the ribs. Straighten the arms fully. Let the bar come back only while the elbows stay still." },
    { id: "seated-dips", name: "Seated Dips", type: "compound", pattern: "press-dip", cue: "Stay upright. Keep the elbows close to the body. This keeps the load on the triceps, not the chest." },
    { id: "skull-crusher", name: "Skull Crusher", type: "isolation", pattern: "extension-lying", cue: "Lower the weight behind the head, not to the forehead. Keep the elbows still. Do not let the elbows move apart." },
    { id: "close-grip-bench", name: "Close-Grip Bench Press", type: "compound", pattern: "press", cue: "Put the hands about shoulder width apart. A narrower grip can hurt the wrists. Keep the elbows in. Lower the bar to the lower chest." },
    { id: "hack-dips", name: "Hack Dips", type: "compound", pattern: "press-dip", cue: "Keep the back flat against the pad. Push through the heels of the hands. Straighten the arms, but do not lift the shoulders." },
  ],
  Quads: [
    { id: "squat", name: "Squat", type: "compound", pattern: "squat", cue: "Tighten the core before you lift the bar off the rack. Sit down between the hips. Keep the knees over the toes. Push the floor away." },
    { id: "leg-extension", name: "Leg Extension", type: "isolation", pattern: "isolation-extension", cue: "Align the knee joint with the machine pivot. Squeeze hard at the top. Lower slowly." },
    { id: "leg-press", name: "Leg Press", type: "compound", pattern: "leg-press", cue: "Put the feet in the middle of the platform. Keep the knees over the toes. Stop before the lower back comes off the pad." },
    { id: "lunge", name: "Lunge", type: "compound", pattern: "lunge", cue: "Take a step long enough to keep the front shin almost vertical. Lower until the back knee almost touches the floor." },
  ],
  Hamstrings: [
    { id: "romanian-deadlift", name: "Romanian Deadlift", type: "compound", pattern: "hinge", cue: "Push the hips back with a small bend in the knees. Keep the bar against the legs. Stop when the back starts to round." },
    { id: "seated-leg-curl", name: "Seated Leg Curl", type: "isolation", pattern: "flexion-seated", cue: "Keep the hips down in the seat. The stretch at the top is the most useful part of this exercise." },
    { id: "leg-curl", name: "Lying Leg Curl", type: "isolation", pattern: "flexion", cue: "Push the hips into the pad. Curl all the way. Lower slowly. Do not let the weight stack drop." },
    { id: "nordic-curl", name: "Nordic Curl", type: "isolation", pattern: "flexion", cue: "Lower as slowly as possible. Keep the hips straight. Use the hands only when you cannot hold the position." },
    { id: "good-morning", name: "Good Morning", type: "compound", pattern: "hinge", cue: "Use a light weight. Bend at the hips and keep the spine neutral. Push the hips forward to stand up. Do not pull with the back." },
    { id: "glute-ham-raise", name: "Glute-Ham Raise", type: "compound", pattern: "flexion", cue: "Keep the hips straight. If you bend at the hip, it becomes a back raise. Lower slowly. Pull with the hamstrings." },
  ],
  Glutes: [
    { id: "hip-thrust", name: "Hip Thrust", type: "compound", pattern: "hip-extension", cue: "Tuck the chin. Keep the ribs down. Push through the heels until the hips are straight. Hold the squeeze for one second." },
    { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", type: "compound", pattern: "unilateral-squat", cue: "Put the front foot far enough forward to lean forward a little. Lower straight down. Push through the full front foot." },
    { id: "cable-kickback", name: "Cable Kickback", type: "isolation", pattern: "isolation-extension", cue: "Keep the working knee slightly bent. Move only from the hip. Do not arch the lower back to move further." },
    { id: "reverse-lunge", name: "Reverse Lunge", type: "compound", pattern: "lunge", cue: "Step back and lower slowly. Keep the weight on the front heel. Stand up again. Do not push with the back foot." },
    { id: "hip-abduction", name: "Hip Abduction", type: "isolation", pattern: "abduction", cue: "Lean the torso forward a little to train the upper glute more. Push out slowly. Control the return." },
    { id: "hip-adduction", name: "Hip Adduction", type: "isolation", pattern: "adduction", cue: "Let the legs open until you feel a stretch in the inner thigh. Squeeze the legs together. Do not move the hips." },
  ],
  Calves: [
    { id: "standing-calf-raise", name: "Standing Calf Raise", type: "isolation", pattern: "standing", cue: "Stretch fully at the bottom. Go all the way up onto the toes. Stop at the top and the bottom. Do not bounce." },
    { id: "seated-calf-raise", name: "Seated Calf Raise", type: "isolation", pattern: "seated", cue: "Bent knees train the soleus. Move slowly and hold the top. A fast tempo does not help here." },
  ],
  Shins: [
    { id: "tibialis-raise", name: "Tibialis Raise", type: "isolation", pattern: "tibialis", cue: "Keep the heels on the floor. Pull the toes up as far as possible. Lower slowly. At first, the muscle can cramp before it fails." },
  ],
  Forearms: [
    { id: "reverse-curl", name: "Reverse Curl", type: "isolation", pattern: "curl-reverse", cue: "Use an overhand grip. Keep the wrists straight. Do not let the wrists bend back. Use a light weight." },
    { id: "eugene-curl", name: "Eugene Curl", type: "isolation", pattern: "curl-reverse", cue: "Keep the elbow behind the torso for the full set. The stretch at the bottom is important. Use a light weight and good form." },
    { id: "reverse-eugene-curl", name: "Reverse Eugene Curl", type: "isolation", pattern: "curl-reverse", cue: "Keep the elbow behind the body, as in the Eugene curl. Use an overhand grip. This trains the brachioradialis in a deep stretch." },
    { id: "wrist-curl", name: "Wrist Curl", type: "isolation", pattern: "flexion-wrist", cue: "Put the forearms on a bench or on the thighs. Move only the wrist. At the bottom, let the bar roll to the fingertips." },
    { id: "reverse-wrist-curl", name: "Reverse Wrist Curl", type: "isolation", pattern: "extension-wrist", cue: "Turn the palms down. Keep the forearms still. Lift with the back of the hand. Use a very light weight. The range of movement is small." },
    { id: "plate-pinch", name: "Plate Pinch", type: "isolation", pattern: "isometric-grip", cue: "Pinch the smooth sides of the plates together. Stand tall. Hold for time. Stop the set when the fingers start to open." },
    { id: "dead-hang", name: "Dead Hang", type: "isolation", pattern: "isometric", cue: "Relax into a full hang. Breathe steadily. Hold for time, not for reps." },
  ],
  Traps: [
    { id: "shrug", name: "Shrug", type: "isolation", pattern: "shrug", cue: "Move straight up and down. Do not roll the shoulders. Hold the top for one second on each rep." },
    { id: "farmers-carry", name: "Farmer's Carry", type: "compound", pattern: "carry", cue: "Stand tall. Keep the shoulders back. Grip hard. Take short, controlled steps. Carry for distance or for time." },
  ],
  Core: [
    { id: "cable-crunch", name: "Cable Crunch", type: "isolation", pattern: "flexion", cue: "Keep the hips still. Bring the ribs toward the pelvis. Do not bend at the hip. Squeeze hard at the bottom." },
    { id: "hanging-leg-raise", name: "Hanging Leg Raise", type: "isolation", pattern: "flexion", cue: "Curl the pelvis up. Do not only lift the legs. Stop all swing between reps." },
    { id: "wood-chop", name: "Cable Woodchop", type: "isolation", pattern: "rotation", cue: "Turn the torso and keep the arms long. Let the hips turn too. Control the return." },
    { id: "ab-wheel", name: "Ab Wheel", type: "compound", pattern: "anti-extension", cue: "Put the ribs down and tuck the hips before you roll. Roll out only as far as you can hold that position." },
    { id: "reverse-crunch", name: "Reverse Crunch", type: "isolation", pattern: "flexion", cue: "Lift the hips off the floor. Do not swing the knees. Lower the back slowly, one part at a time." },
    { id: "plank", name: "Plank", type: "isolation", pattern: "isometric", cue: "Squeeze the glutes and tuck the hips. Hold good form for 30 seconds. This is better than two minutes with bad form." },
  ],
  "Lower Back": [
    { id: "deadlift", name: "Deadlift", type: "compound", pattern: "hinge", cue: "Tighten the core before each rep. Keep the bar against the shins. Push the floor away. Do not pull with the back." },
    { id: "back-extension", name: "45° Back Extension", type: "isolation", pattern: "extension-back", cue: "Choose a round or a neutral back. Keep that position. Squeeze the glutes at the top. Do not bend back past straight." },
  ],
};

/* ---------------------------------------------------------------
   SECONDARY MUSCLES

   Muscles a lift works hard enough to matter without being what the lift
   is for. Read by the readiness map, which gives them partial fatigue,
   and by the weekly volume screen, which counts them as half a set.

   Started from the source table. Where the table names something with no
   group of its own — hip flexors, adductors, obliques — it is dropped
   rather than approximated, except that obliques fold into Core because
   that is the group they belong to here.

   One rule added on top: if the load hangs from your hands, the traps
   are holding it. That covers the hinges and rows where the bar sits at
   arm's length between reps, plus the carries, hangs and pinches. It
   does not cover lifts where the weight rests on your back or a machine
   supports it, and it does not cover a lunge or split squat, since the
   implement there might be a barbell across the shoulders.
--------------------------------------------------------------- */

/* Extra search terms per exercise, so looking for a movement by the name you
   actually call it finds it.

   Search matches on the display name alone, which means a British lifter
   typing "press up" gets nothing at all — the entry is called Push-Up. That
   reads as a missing exercise rather than a vocabulary mismatch, and the
   obvious response is to add a duplicate, which then splits the history for
   one movement across two ids. Aliases instead: one entry, several names. */
export const EXERCISE_ALIASES = {
  "push-up": ["press-up", "press ups", "pressup", "pushup"],
  "pull-ups": ["pullup", "chin up", "chinup"],
  "overhead-press": ["ohp", "military press", "shoulder press", "strict press"],
  "romanian-deadlift": ["rdl", "stiff leg deadlift"],
  "lateral-raise": ["side raise", "lat raise", "side lateral"],
  "leg-press": ["legpress"],
  "bent-over-row": ["barbell row", "bent over row", "pendlay row"],
  "lat-pulldown": ["pulldown", "lat pull down"],
  "standing-calf-raise": ["calf raise", "calves"],
  "seated-calf-raise": ["calf raise", "calves", "soleus"],
  "hip-thrust": ["glute bridge"],
  "skull-crusher": ["lying tricep extension", "french press"],
  "pushdown": ["tricep pushdown", "cable pushdown"],
  "face-pull": ["facepull", "rear delt pull"],
};

export const SECONDARY_MUSCLES = {
  "bench-press": ["Triceps", "Front Delts"],
  "incline-press": ["Triceps", "Front Delts"],
  "dips": ["Triceps", "Front Delts"],
  "push-up": ["Triceps", "Front Delts", "Core"],
  "pull-ups": ["Biceps", "Core"],
  "bent-over-row": ["Rear Delts", "Biceps", "Lower Back", "Traps"],
  "lat-pulldown": ["Biceps"],
  "chest-supported-row": ["Rear Delts", "Biceps"],
  "cable-row": ["Biceps", "Rear Delts"],
  "db-row": ["Biceps", "Rear Delts", "Traps"],
  "overhead-press": ["Side Delts"],
  "upright-row": ["Traps", "Rear Delts", "Biceps"],
  "reverse-fly": ["Back"],
  "face-pull": ["Back", "Traps"],
  "preacher-curl": ["Forearms"],
  "cable-curl": ["Forearms"],
  "hammer-curl": ["Forearms"],
  "incline-curl": ["Forearms"],
  "seated-dips": ["Chest", "Front Delts"],
  "close-grip-bench": ["Chest", "Front Delts"],
  "hack-dips": ["Chest", "Front Delts"],
  "squat": ["Glutes", "Hamstrings", "Core"],
  "leg-press": ["Glutes"],
  "lunge": ["Glutes", "Hamstrings"],
  "romanian-deadlift": ["Glutes", "Lower Back", "Traps"],
  "seated-leg-curl": ["Calves"],
  "leg-curl": ["Calves"],
  "nordic-curl": ["Glutes", "Calves"],
  "good-morning": ["Glutes", "Lower Back"],
  "glute-ham-raise": ["Glutes", "Calves"],
  "hip-thrust": ["Hamstrings"],
  "bulgarian-split-squat": ["Quads"],
  "reverse-lunge": ["Quads", "Hamstrings"],
  "reverse-curl": ["Biceps"],
  "eugene-curl": ["Biceps"],
  "reverse-eugene-curl": ["Biceps"],
  "dead-hang": ["Back", "Front Delts", "Traps"],
  "plate-pinch": ["Traps"],
  "shrug": ["Forearms"],
  "farmers-carry": ["Forearms", "Core"],
  "ab-wheel": ["Back", "Front Delts"],
  "plank": ["Glutes"],
  "deadlift": ["Glutes", "Hamstrings", "Traps"],
  "back-extension": ["Glutes", "Hamstrings"],
};

/* ---------------------------------------------------------------
   IMPLEMENTS

   One movement, several ways to load it. A bench press is a bench press
   whether the weight is on a barbell, a pair of dumbbells or a Smith
   machine — the same progression, the same slot in a programme — so it is
   one exercise with the implement recorded per session rather than four
   near-duplicate entries cluttering the ranking.

   Only listed where the choice is real. A pec deck is a machine and a
   cable fly is a cable; offering "Barbell" there would be noise. The
   first entry of each list is the default, taken from the preferred
   method in the source table.
--------------------------------------------------------------- */

/* CALISTHENICS — one movement, several ways to load it.

   A dip done on the assist machine, unloaded, and with a plate hanging off
   you is the same movement at three different loads. Treating those as
   three exercises splits one progression into three graphs that each look
   flat; treating the load as a choice keeps the history in one place and
   makes the progression visible.

   Assistance is only offered where it genuinely exists — an assist machine
   or a band for that movement. Nobody assists a hanging leg raise or a
   bench dip, so those get the two-way choice instead of a third option
   that would never be picked. Either way the defining trait is the same:
   the load is your own body, so an empty weight column means bodyweight
   rather than nothing, and the charts have to add the lifter in. */
export const CALISTHENIC_LOADINGS = ["Bodyweight", "Assisted", "Weighted"];
export const BODYWEIGHT_LOADINGS = ["Bodyweight", "Weighted"];

export const CALISTHENIC_LOADING_BY_ID = {
  "dips": CALISTHENIC_LOADINGS,
  "pull-ups": CALISTHENIC_LOADINGS,
  "push-up": CALISTHENIC_LOADINGS,
  "nordic-curl": CALISTHENIC_LOADINGS,
  // Hung, propped or braced against your own weight, with a plate, a
  // dumbbell between the feet or a belt as the only way to add to it.
  "hanging-leg-raise": BODYWEIGHT_LOADINGS,
  "reverse-crunch": BODYWEIGHT_LOADINGS,
  "ab-wheel": BODYWEIGHT_LOADINGS,
  "plank": BODYWEIGHT_LOADINGS,
  "dead-hang": BODYWEIGHT_LOADINGS,
  "seated-dips": BODYWEIGHT_LOADINGS,
  "back-extension": BODYWEIGHT_LOADINGS,
  "glute-ham-raise": BODYWEIGHT_LOADINGS,
};

export const EXERCISE_METHODS = {
  "bench-press": ["Barbell", "Dumbbell", "Smith Machine", "Machine"],
  // Bodyweight movements are not listed here — their choices come from
  // CALISTHENIC_LOADING_BY_ID, so that how a dip is loaded is defined in
  // one place rather than kept in step across two tables.
  "incline-press": ["Dumbbell", "Barbell", "Smith Machine", "Machine"],
  "bent-over-row": ["Barbell", "Dumbbell", "Smith Machine"],
  "chest-supported-row": ["Machine", "Dumbbell"],
  "pullover": ["Dumbbell", "Cable"],
  "overhead-press": ["Barbell", "Dumbbell", "Smith Machine", "Machine"],
  "front-raise": ["Dumbbell", "Cable", "Barbell"],
  "lateral-raise": ["Cable", "Dumbbell", "Machine"],
  "upright-row": ["Cable", "Barbell", "Dumbbell", "Smith Machine"],
  "reverse-fly": ["Cable", "Dumbbell", "Machine"],
  "preacher-curl": ["EZ Bar", "Dumbbell", "Machine", "Cable"],
  "hammer-curl": ["Dumbbell", "Cable"],
  "eugene-curl": ["Cable", "Dumbbell"],
  "reverse-eugene-curl": ["Cable", "Dumbbell"],
  "overhead-extension": ["Cable", "Dumbbell", "EZ Bar"],
  "skull-crusher": ["Dumbbell", "EZ Bar", "Barbell"],
  "close-grip-bench": ["Barbell", "Smith Machine"],
  "squat": ["Back", "Front", "Hack", "Smith Machine"],
  "lunge": ["Dumbbell", "Barbell", "Smith Machine"],
  "romanian-deadlift": ["Barbell", "Dumbbell", "Smith Machine"],
  "good-morning": ["Barbell", "Smith Machine"],
  "hip-thrust": ["Barbell", "Smith Machine", "Machine", "Dumbbell"],
  "bulgarian-split-squat": ["Dumbbell", "Barbell", "Smith Machine"],
  "reverse-lunge": ["Dumbbell", "Barbell", "Smith Machine"],
  "hip-abduction": ["Machine", "Cable"],
  "hip-adduction": ["Machine", "Cable"],
  "standing-calf-raise": ["Machine", "Smith Machine", "Dumbbell"],
  "tibialis-raise": ["Kettlebell", "Machine", "Bodyweight"],
  "reverse-curl": ["Barbell", "EZ Bar", "Dumbbell", "Cable"],
  "wrist-curl": ["Dumbbell", "Barbell"],
  "reverse-wrist-curl": ["Dumbbell", "Barbell"],
  "shrug": ["Dumbbell", "Barbell", "Smith Machine", "Machine", "Cable"],
  "farmers-carry": ["Kettlebell", "Dumbbell", "Barbell"],
  "deadlift": ["Barbell", "Dumbbell", "Smith Machine"],
};

// Implements that put the load on a machine rather than a free weight.
// Whether an exercise offers a brand field now follows from the implement
// chosen for the session, which is more correct than the hardcoded list of
// exercise ids it replaces: a Smith bench has a brand worth recording, the
// same exercise with a barbell does not.
export const MACHINE_METHODS = new Set(["Smith Machine", "Machine", "Cable", "Assisted", "Hack"]);

/* ---------------------------------------------------------------
   CABLE MACHINES & GRIPS
   Two identical loads on two different cable stacks rarely feel the
   same — pulley ratios, bearing friction and stack increments all vary
   by brand, and the attachment/grip changes the leverage too. So for any
   cable movement we capture the machine (brand) and the grip/attachment
   used, and surface them next to the previous performance so the numbers
   are compared like-for-like.
--------------------------------------------------------------- */

// Per-exercise attachment/grip options, for the movements that are always
// done on a cable and for any exercise whose chosen implement is a cable.
// The first entry is the sensible default; anything cable-based without an
// entry falls back to CABLE_GRIPS_GENERIC.
export const CABLE_GRIPS = {
  "cable-fly": ["D-handles (neutral)", "Bare strap", "Single D-handle"],
  "cable-row": ["V-bar (close neutral)", "Wide lat bar (pronated)", "Straight bar (pronated)", "Rope", "Single D-handle"],
  "lat-pulldown": ["Wide bar (pronated)", "Close V-bar (neutral)", "Wide bar (underhand)", "Single handles (neutral)", "MAG grip"],
  "straight-arm-pulldown": ["Straight bar", "Rope", "Wide lat bar"],
  "lateral-raise": ["Single D-handle", "Ankle strap"],
  "face-pull": ["Rope", "Dual D-handles"],
  "reverse-fly": ["D-handles (neutral)", "Bare strap"],
  "cable-curl": ["Straight bar (supinated)", "EZ bar", "Rope (neutral)", "Single D-handle"],
  "pushdown": ["Straight bar", "Rope", "V-bar", "EZ bar"],
  "overhead-extension": ["Rope", "EZ bar", "Straight bar"],
  "cable-kickback": ["Ankle strap", "Single D-handle"],
  "cable-crunch": ["Rope", "Straight bar"],
  "wood-chop": ["Rope", "Single D-handle"],
  "front-raise": ["Single D-handle", "Straight bar", "Rope"],
  "upright-row": ["Straight bar", "Rope", "V-bar"],
  "hip-abduction": ["Ankle strap"],
  "shrug": ["Straight bar", "V-bar"],
  "pullover": ["Straight bar", "Rope"],
  "hammer-curl": ["Rope"],
  "preacher-curl": ["Straight bar", "EZ bar"],
  "reverse-curl": ["Straight bar", "EZ bar"],
};

export const CABLE_GRIPS_GENERIC = ["Straight bar", "Rope", "D-handle", "V-bar", "Wide bar", "EZ bar", "Ankle strap"];

// Movements that only ever happen on a pulley stack, whatever else the
// database says. Everything else becomes a cable exercise only when the
// implement chosen for the session is one.
export const ALWAYS_CABLE_IDS = new Set([
  "cable-fly",
  "cable-row",
  "lat-pulldown",
  "straight-arm-pulldown",
  "face-pull",
  "cable-curl",
  "pushdown",
  "cable-kickback",
  "cable-crunch",
  "wood-chop",
]);

// Movements always performed on a fixed machine, again regardless of any
// implement choice.
export const ALWAYS_MACHINE_IDS = new Set([
  "pec-deck",
  "leg-press",
  "leg-extension",
  "leg-curl",
  "seated-leg-curl",
  "seated-calf-raise",
  "seated-dips",
  "hack-dips",
]);

// Generic mobility/cooldown pool, appended to the end of built workouts.
export const MOBILITY_EXERCISES = [
  { id: "worlds-greatest-stretch", name: "World's Greatest Stretch", type: "mobility", pattern: "mobility", cue: "Move slowly through each position. Breathe. Do not force the range of movement." },
  { id: "couch-stretch", name: "Couch Stretch", type: "mobility", pattern: "mobility", cue: "Keep the hips square. Move into the stretch slowly. Hold each side for 30-60 seconds." },
  { id: "ninety-ninety-hip-switch", name: "90/90 Hip Switch", type: "mobility", pattern: "mobility", cue: "Keep your chest up. Turn slowly through the hips. Do both sides." },
  { id: "thoracic-rotations", name: "Thoracic Spine Rotations", type: "mobility", pattern: "mobility", cue: "Keep one hip above the other. Turn from the upper back. Do both directions." },
  { id: "cat-cow", name: "Cat-Cow", type: "mobility", pattern: "mobility", cue: "Move with your breath. Round and arch the full spine." },
  { id: "doorway-chest-stretch", name: "Doorway Chest Stretch", type: "mobility", pattern: "mobility", cue: "Step forward gently. Hold for 30 seconds on each side. Do not bounce." },
  { id: "standing-quad-stretch", name: "Standing Quad Stretch", type: "mobility", pattern: "mobility", cue: "Keep the knees together. Pull the heel toward the glute. Hold each side." },
  { id: "childs-pose", name: "Child's Pose", type: "mobility", pattern: "mobility", cue: "Sit back onto your heels. Reach forward. Breathe deeply and relax." },
];
EXERCISES["Mobility"] = MOBILITY_EXERCISES;

// Flatten EXERCISES once so any exercise can be looked up by id.
export const ALL_EXERCISES_BY_ID = {};
Object.values(EXERCISES).forEach((list) => list.forEach((e) => {
  if (!ALL_EXERCISES_BY_ID[e.id]) ALL_EXERCISES_BY_ID[e.id] = e;
}));

// What the app shipped with, frozen before any stored edit is applied. A
// built-in exercise lives in a module constant, so an edit to one is stored
// as an overlay rather than a rewrite — which means "revert to default" needs
// the originals still to be here to revert to. Nothing below ever mutates an
// exercise object in place for this reason: an edit builds a new object and
// swaps it in, leaving the shipped one untouched for the snapshot to hold.
export const SHIPPED_EXERCISE_BY_ID = { ...ALL_EXERCISES_BY_ID };
export const SHIPPED_SECONDARY_MUSCLES = { ...SECONDARY_MUSCLES };
// An exercise object carries no muscle of its own — which bucket of EXERCISES
// it sits in is what says where it belongs, which is why muscleOfExerciseId
// exists at all. That works right up until an edit moves one, at which point
// the shipped answer is no longer discoverable by looking. So record it now.
export const SHIPPED_MUSCLE_BY_ID = {};
Object.entries(EXERCISES).forEach(([m, list]) => list.forEach((e) => {
  if (SHIPPED_MUSCLE_BY_ID[e.id] === undefined) SHIPPED_MUSCLE_BY_ID[e.id] = m;
}));

/* ---------------------------------------------------------------
   HOW TAXING AN EXERCISE IS

   Not the same thing as how many muscles it works, and the difference
   matters. A push-up reaches four muscle groups and costs almost nothing; a
   standing overhead press reaches two and costs a great deal. Coverage can be
   read off the database. Demand cannot, so it is stated here.

   These are the lifts you can only fit two or three of into one session
   before the rest of it suffers — heavy axial loading, or a full bodyweight
   moved through a long range. Two isolation lifts are in the list because
   fatigue, not classification, is what the budget is rationing: a nordic curl
   and a glute-ham raise cost more than most compounds do.
--------------------------------------------------------------- */

export const HEAVY_EXERCISE_IDS = new Set([
  // Named as most fatiguing in the priority table below.
  "squat", "romanian-deadlift", "leg-press",
  "pull-ups", "bent-over-row", "deadlift",
  "dips",
  // Not in the table, so judged here on the same basis. Note the table's
  // verdict on the bench press stands: flat and incline pressing are ranked
  // below dips and are not counted as fatiguing, so neither is in this list.
  "good-morning", "glute-ham-raise", "nordic-curl",
  "bulgarian-split-squat", "hip-thrust",
  "overhead-press", "close-grip-bench", "farmers-carry",
]);

export const DEMAND_HEAVY = 2;
export const DEMAND_COMPOUND = 1;
export const DEMAND_ISOLATION = 0;

export function exerciseDemand(ex) {
  if (!ex) return DEMAND_ISOLATION;
  if (HEAVY_EXERCISE_IDS.has(ex.id)) return DEMAND_HEAVY;
  return ex.type === "compound" ? DEMAND_COMPOUND : DEMAND_ISOLATION;
}

export function isHeavyExercise(ex) {
  return exerciseDemand(ex) === DEMAND_HEAVY;
}

// EXERCISES[muscle] order doubles as the priority ranking the auto-picker
// walks, so it should open with the most productive lift and end with the
// least. Mostly it already did, but not everywhere: leg extensions sat above
// the leg press, shrugs above the farmer's carry, lateral raises above the
// upright row — fifteen isolation exercises ranked ahead of a compound in
// their own list.
//
// This is a stable sort by demand, not a re-ranking. Order within a tier is
// left exactly as it was, because that order was chosen deliberately and
// encodes preferences no rule here knows about. Only the inversions move.
//
// A user who has reordered a muscle themselves has that saved under
// "exercise-order" and it is applied after this, so their ranking still wins.
Object.keys(EXERCISES).forEach((m) => {
  EXERCISES[m] = EXERCISES[m]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => exerciseDemand(b.e) - exerciseDemand(a.e) || a.i - b.i)
    .map((x) => x.e);
});
