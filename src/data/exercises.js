export const EXERCISES = {
  Chest: [
    { id: "bench-press", name: "Bench Press", type: "compound", pattern: "press", cue: "Shoulder blades pinned back and down, lower to the lower chest, press without letting the elbows flare to 90." },
    { id: "incline-press", name: "Incline Press", type: "compound", pattern: "press-incline", cue: "Bench at 30-45 degrees. Any steeper and it becomes a shoulder press." },
    { id: "dips", name: "Dips", type: "compound", pattern: "press-dip", cue: "Lean the torso forward and let the elbows travel out a little — upright and tucked turns it into a triceps exercise." },
    { id: "cable-fly", name: "Cable Fly", type: "isolation", pattern: "fly", cue: "Soft elbow bend held throughout, bring the hands together and slightly across, resist the stretch on the way back." },
    { id: "pec-deck", name: "Pec Deck", type: "isolation", pattern: "fly", cue: "Set the seat so the handles sit at chest height, squeeze for a beat at the middle, control the return." },
    { id: "push-up", name: "Push-Up", type: "compound", pattern: "press-bodyweight", cue: "Straight line from shoulders to ankles, chest to the floor, elbows at about 45 degrees rather than flared." },
  ],
  Back: [
    { id: "pull-ups", name: "Pull-Up", type: "compound", pattern: "vertical-pull", cue: "Full dead hang at the bottom, drive the elbows down and back, pause at the top before lowering under control." },
    { id: "bent-over-row", name: "Bent-Over Row", type: "compound", pattern: "horizontal-pull", cue: "Hinge to about 45 degrees and hold it, row to the belly button, squeeze the shoulder blades before lowering slowly." },
    { id: "lat-pulldown", name: "Lat Pulldown", type: "compound", pattern: "vertical-pull", cue: "Lead with the elbows, pull to the upper chest, resist all the way back up rather than letting it snap." },
    { id: "chest-supported-row", name: "Chest-Supported Row", type: "compound", pattern: "horizontal-pull", cue: "Chest stays on the pad the whole set — if you have to peel off it to finish a rep, the weight is too heavy." },
    { id: "cable-row", name: "Seated Cable Row", type: "compound", pattern: "horizontal-pull", cue: "Row to the torso with the elbows close, pause a second squeezing the shoulder blades together, stay upright." },
    { id: "db-row", name: "Dumbbell Row", type: "compound", pattern: "horizontal-pull", cue: "Stretch fully at the bottom, pull the elbow toward the hip, keep the torso square rather than twisting into it." },
    { id: "straight-arm-pulldown", name: "Straight-Arm Pulldown", type: "isolation", pattern: "isolation-pull", cue: "Arms almost straight throughout, pull from the lats not the triceps, stop when the bar reaches the thighs." },
    { id: "pullover", name: "Pullover", type: "isolation", pattern: "pullover", cue: "Ribs down, stretch overhead without arching the lower back, pull back over with the arms nearly locked." },
  ],
  "Front Delts": [
    { id: "overhead-press", name: "Overhead Press", type: "compound", pattern: "press-overhead", cue: "Brace hard before the rep, press straight past the face, finish with the biceps by the ears." },
    { id: "front-raise", name: "Front Raise", type: "isolation", pattern: "front-raise", cue: "Raise to shoulder height with a soft elbow, no swing from the hips, lower slower than you lifted." },
  ],
  "Side Delts": [
    { id: "lateral-raise", name: "Lateral Raise", type: "isolation", pattern: "lateral", cue: "Lead with the elbow rather than the hand, stop at shoulder height, fight the weight all the way down." },
    { id: "upright-row", name: "Upright Row", type: "compound", pattern: "upright-row", cue: "Pull to chest height leading with the elbows. If the shoulder pinches, widen the grip or drop the height." },
  ],
  "Rear Delts": [
    { id: "reverse-fly", name: "Reverse Fly", type: "isolation", pattern: "rear-fly", cue: "Open the arms wide with a fixed elbow angle, think about pulling the hands apart, do not shrug into it." },
    { id: "face-pull", name: "Face Pull", type: "isolation", pattern: "rear-pull", cue: "Pull to eye level and rotate the hands back at the finish, squeeze, keep the elbows high throughout." },
  ],
  Biceps: [
    { id: "preacher-curl", name: "Preacher Curl", type: "isolation", pattern: "curl-strict", cue: "Armpits into the top of the pad, stop just short of lockout at the bottom to keep tension, squeeze at the top." },
    { id: "cable-curl", name: "Cable Curl", type: "isolation", pattern: "curl-standard", cue: "Constant tension is the point — control the lowering as deliberately as the lift, elbows pinned to the sides." },
    { id: "hammer-curl", name: "Hammer Curl", type: "isolation", pattern: "curl-hammer", cue: "Neutral grip throughout, no swing. The slow negative is what builds the brachialis underneath the bicep." },
    { id: "incline-curl", name: "Incline Curl", type: "isolation", pattern: "curl-stretch", cue: "Let the arms hang behind the body for a full stretch, curl without the shoulders drifting forward." },
  ],
  Triceps: [
    { id: "overhead-extension", name: "Overhead Extension", type: "isolation", pattern: "extension-overhead", cue: "Elbows stay pointed forward and still. The stretch overhead is where the long head does its work." },
    { id: "pushdown", name: "Pushdown", type: "isolation", pattern: "extension-pushdown", cue: "Upper arms locked to the ribs, extend fully, let it come back only as far as the elbows can stay put." },
    { id: "seated-dips", name: "Seated Dips", type: "compound", pattern: "press-dip", cue: "Stay upright with the elbows tucked — the whole point is to keep the load on the triceps rather than the chest." },
    { id: "skull-crusher", name: "Skull Crusher", type: "isolation", pattern: "extension-lying", cue: "Lower behind the head rather than to the forehead, elbows still, extend without letting them drift apart." },
    { id: "close-grip-bench", name: "Close-Grip Bench Press", type: "compound", pattern: "press", cue: "Hands roughly shoulder width — narrower wrecks the wrists. Elbows tucked, bar to the lower chest." },
    { id: "hack-dips", name: "Hack Dips", type: "compound", pattern: "press-dip", cue: "Back flat against the pad, press through the heels of the hands, lock out without shrugging." },
  ],
  Quads: [
    { id: "squat", name: "Squat", type: "compound", pattern: "squat", cue: "Brace before you unrack. Sit between the hips, knees tracking over the toes, drive the floor away." },
    { id: "leg-extension", name: "Leg Extension", type: "isolation", pattern: "isolation-extension", cue: "Pin the knee joint level with the machine pivot, squeeze hard at the top, lower under control." },
    { id: "leg-press", name: "Leg Press", type: "compound", pattern: "leg-press", cue: "Feet mid-platform, knees tracking over the toes, stop before the lower back rounds off the pad." },
    { id: "lunge", name: "Lunge", type: "compound", pattern: "lunge", cue: "Step out far enough that the front shin stays near vertical, lower until the back knee grazes the floor." },
  ],
  Hamstrings: [
    { id: "romanian-deadlift", name: "Romanian Deadlift", type: "compound", pattern: "hinge", cue: "Push the hips back with soft knees, bar dragging the legs, stop where the hamstrings stop and the back starts." },
    { id: "seated-leg-curl", name: "Seated Leg Curl", type: "isolation", pattern: "flexion-seated", cue: "Hips stay down in the seat. The stretched position at the top is where seated curls earn their keep." },
    { id: "leg-curl", name: "Lying Leg Curl", type: "isolation", pattern: "flexion", cue: "Hips pressed into the pad, curl all the way, resist the return rather than letting the stack drop." },
    { id: "nordic-curl", name: "Nordic Curl", type: "isolation", pattern: "flexion", cue: "Lower as slowly as you can hold, hips locked straight, catch with the hands only when you have to." },
    { id: "good-morning", name: "Good Morning", type: "compound", pattern: "hinge", cue: "Light. Hinge at the hips with a neutral spine and stand by driving the hips forward, not by pulling with the back." },
    { id: "glute-ham-raise", name: "Glute-Ham Raise", type: "compound", pattern: "flexion", cue: "Hips stay extended throughout — bending at the hip turns it into a back raise. Lower slowly, pull with the hamstrings." },
  ],
  Glutes: [
    { id: "hip-thrust", name: "Hip Thrust", type: "compound", pattern: "hip-extension", cue: "Chin tucked, ribs down, drive through the heels to full lockout and hold the squeeze for a beat." },
    { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", type: "compound", pattern: "unilateral-squat", cue: "Front foot far enough forward to lean slightly into it, drop straight down, drive through the whole front foot." },
    { id: "cable-kickback", name: "Cable Kickback", type: "isolation", pattern: "isolation-extension", cue: "Keep the working knee slightly bent, drive from the hip alone, do not arch the lower back to get more range." },
    { id: "reverse-lunge", name: "Reverse Lunge", type: "compound", pattern: "lunge", cue: "Step back and lower under control, keep the weight in the front heel, drive back to standing without pushing off the back foot." },
    { id: "hip-abduction", name: "Hip Abduction", type: "isolation", pattern: "abduction", cue: "Lean the torso forward a touch to bias the upper glute, push out slowly, control the way back in." },
    { id: "hip-adduction", name: "Hip Adduction", type: "isolation", pattern: "adduction", cue: "Let the legs open until you feel the stretch on the inner thigh, squeeze them together without rocking the hips." },
  ],
  Calves: [
    { id: "standing-calf-raise", name: "Standing Calf Raise", type: "isolation", pattern: "standing", cue: "Full stretch at the bottom, all the way up onto the toes, pause at both ends rather than bouncing." },
    { id: "seated-calf-raise", name: "Seated Calf Raise", type: "isolation", pattern: "seated", cue: "Knees bent puts the soleus to work, so go slow and hold the top. Speed gets you nothing here." },
  ],
  Shins: [
    { id: "tibialis-raise", name: "Tibialis Raise", type: "isolation", pattern: "tibialis", cue: "Heels planted, pull the toes up as far as they go, lower slowly. It will cramp before it fails at first." },
  ],
  Forearms: [
    { id: "reverse-curl", name: "Reverse Curl", type: "isolation", pattern: "curl-reverse", cue: "Overhand grip, wrists locked straight, curl without letting them break backward. Lighter than you think." },
    { id: "eugene-curl", name: "Eugene Curl", type: "isolation", pattern: "curl-reverse", cue: "Elbow stays behind the torso the whole set. The stretch at the bottom is the point, so keep it light and honest." },
    { id: "reverse-eugene-curl", name: "Reverse Eugene Curl", type: "isolation", pattern: "curl-reverse", cue: "Same elbow-behind-the-body position as the Eugene curl, overhand. Hits the brachioradialis in a deep stretch." },
    { id: "wrist-curl", name: "Wrist Curl", type: "isolation", pattern: "flexion-wrist", cue: "Forearms braced on a bench or the thighs, move only at the wrist, let it roll to the fingertips at the bottom." },
    { id: "reverse-wrist-curl", name: "Reverse Wrist Curl", type: "isolation", pattern: "extension-wrist", cue: "Palms down, forearms still, lift with the back of the hand. Very light — the range is tiny." },
    { id: "plate-pinch", name: "Plate Pinch", type: "isolation", pattern: "isometric-grip", cue: "Pinch the smooth sides together, stand tall, hold for time. Stop the set when the fingers start to open." },
    { id: "dead-hang", name: "Dead Hang", type: "isolation", pattern: "isometric", cue: "Relax into a full hang, breathe steadily, hold for time rather than reps." },
  ],
  Traps: [
    { id: "shrug", name: "Shrug", type: "isolation", pattern: "shrug", cue: "Straight up and down — rolling the shoulders adds nothing. Hold the top for a second on every rep." },
    { id: "farmers-carry", name: "Farmer's Carry", type: "compound", pattern: "carry", cue: "Stand tall, shoulders back, grip hard and take short controlled steps. Carry for distance or time." },
  ],
  Core: [
    { id: "cable-crunch", name: "Cable Crunch", type: "isolation", pattern: "flexion", cue: "Hips fixed — crunch the ribs toward the pelvis rather than bending at the hip. Squeeze hard at the bottom." },
    { id: "hanging-leg-raise", name: "Hanging Leg Raise", type: "isolation", pattern: "flexion", cue: "Curl the pelvis up rather than just lifting the legs, and stop the swing completely between reps." },
    { id: "wood-chop", name: "Cable Woodchop", type: "isolation", pattern: "rotation", cue: "Rotate through the torso with the arms staying long, hips turning with it, control the way back." },
    { id: "ab-wheel", name: "Ab Wheel", type: "compound", pattern: "anti-extension", cue: "Ribs down and hips tucked before you roll. Go only as far as you can hold that position, not as far as you can reach." },
    { id: "reverse-crunch", name: "Reverse Crunch", type: "isolation", pattern: "flexion", cue: "Lift the hips off the floor rather than swinging the knees, and lower one vertebra at a time." },
    { id: "plank", name: "Plank", type: "isolation", pattern: "isometric", cue: "Squeeze the glutes and tuck the hips. A hard 30 seconds beats a sagging two minutes." },
  ],
  "Lower Back": [
    { id: "deadlift", name: "Deadlift", type: "compound", pattern: "hinge", cue: "Brace hard before every rep, bar against the shins, push the floor away rather than pulling with the back." },
    { id: "back-extension", name: "45° Back Extension", type: "isolation", pattern: "extension-back", cue: "Round or stay neutral by choice, not by accident. Squeeze the glutes at the top, no hyperextension past straight." },
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
  { id: "worlds-greatest-stretch", name: "World's Greatest Stretch", type: "mobility", pattern: "mobility", cue: "Move slowly through each position, breathe, don't force the range." },
  { id: "couch-stretch", name: "Couch Stretch", type: "mobility", pattern: "mobility", cue: "Keep hips square, ease into it gradually, hold each side for 30-60s." },
  { id: "ninety-ninety-hip-switch", name: "90/90 Hip Switch", type: "mobility", pattern: "mobility", cue: "Keep your chest tall, rotate slowly through the hips, both sides." },
  { id: "thoracic-rotations", name: "Thoracic Spine Rotations", type: "mobility", pattern: "mobility", cue: "Hips stay stacked, rotate from the upper back, both directions." },
  { id: "cat-cow", name: "Cat-Cow", type: "mobility", pattern: "mobility", cue: "Move with your breath, round and arch through the full spine." },
  { id: "doorway-chest-stretch", name: "Doorway Chest Stretch", type: "mobility", pattern: "mobility", cue: "Step through gently, hold 30s per side, don't bounce." },
  { id: "standing-quad-stretch", name: "Standing Quad Stretch", type: "mobility", pattern: "mobility", cue: "Keep knees together, pull the heel toward the glute, hold each side." },
  { id: "childs-pose", name: "Child's Pose", type: "mobility", pattern: "mobility", cue: "Sit back onto your heels, reach forward, breathe deeply and relax." },
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
