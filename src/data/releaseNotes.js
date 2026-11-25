/* ---------------------------------------------------------------
   WHAT'S NEW

   Shown once per version, on the first launch after an update. Upgrades
   are silent otherwise — someone who installed a new APK has no idea what
   changed unless the app tells them.

   Deliberately not shown on a brand-new install: a first-time user gets
   the tour instead, and a changelog for a release they never saw is
   noise. The stored version is set on first run without the screen ever
   appearing, so the first thing they see is the tour and the first
   changelog they get is the next real update.

   To ship a release: bump "version" in package.json (Vite reads it into
   __APP_VERSION__) and add an entry at the top of RELEASE_NOTES. If the
   version has no entry the screen never appears, so forgetting the notes
   fails quietly rather than showing an empty modal.
--------------------------------------------------------------- */

export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
export const LAST_SEEN_VERSION_KEY = "last-seen-version";


export const RELEASE_NOTES = [
  {
    version: "1.29.0",
    released: "2026-10-26",
    headline: "The Strava strength file is gone; sharing works the way it did.",
    items: [
      {
        title: "Back to one button",
        body: "The strength file added in 1.28.0 is removed. Sending one meant Strava's web uploader in a browser rather than the Strava app, and what arrived did not read as a proper strength log \u2014 a worse route to a worse result. Share to Strava is one button again: it builds the session into text, hands it to the share sheet, and the Strava app opens with the post ready for it. Nothing else about sharing changed, and nothing you have logged is affected.",
      },
    ],
  },
  {
    version: "1.28.0",
    released: "2026-10-26",
    headline: "Your lifts go to Strava as lifts, not as a paragraph about lifts.",
    items: [
      {
        title: "A Strava strength file (removed in 1.29.0)",
        body: "Strava rebuilt strength training in May 2026 \u2014 a workout log that holds sets, reps and weight, and a muscle map drawn from the exercises in the activity \u2014 and on the same day started reading set data out of uploaded FIT files. Iron Log now writes one. Tap Strava strength file on a finished workout or any session in History, upload it, and the activity arrives as weight training with every set, rep and weight on it rather than as text in the description.",
      },
      {
        title: "Mapped to Strava's own exercise taxonomy",
        body: "Every exercise is matched to the exercise type the file format defines \u2014 bench press, row, squat, pull-up, and so on \u2014 and to the specific variant where it is genuinely the same movement, picking the barbell or dumbbell version from the implement you logged. Fifty-three of the seventy-four go across by name, including all eight mobility stretches; the other twenty-one send their category alone, because there is no honest name for them in the format and the category is what the muscle map reads. A wrong name would put your work on the wrong muscle.",
      },
      {
        title: "Your own exercises are asked about, not guessed at",
        body: "An exercise you added yourself has no Strava type behind it. The first time you send a session containing one, the app says so and asks you to pick the closest type, with its own guess from the muscle you gave it already selected. The list covers everything the format knows \u2014 sleds, sandbags, battle ropes, tyres, suspension straps and bands as well as the lifts \u2014 and if a movement genuinely has no home in it, the first choice is not to send that exercise at all. Either answer is remembered, so each exercise is asked about once and never again. It only happens on the way to Strava and only for the ones it would otherwise be guessing at: a second copy of a lift that already exists is recognised as that lift, renaming a built-in changes nothing, and if you never open Strava you are never asked.",
      },
      {
        title: "What is measured and what is divided up",
        body: "Every rep, every weight, the exercise each set belongs to and the session's start, finish and length are what you logged. Where each set sits inside the session is not: Iron Log times the session, not each set, so sets are laid out in the order you logged them with an equal share of the real session length. Bodyweight and assisted sets carry no weight at all rather than a zero.",
      },
      {
        title: "The rest timer survives your pocket",
        body: "It counted down by subtracting one every second, which only works while something is running that clock \u2014 and nothing is, once the screen locks or you switch apps. A browser throttles a hidden page to about one tick a minute and a locked phone stops it dead, so two minutes in your pocket read as ten seconds gone. It now counts to a time rather than counting down a number: whatever happened while you were away, the figure you come back to is the truth. Pause still holds, +15s still adds fifteen, and an alert that is more than three seconds late is dropped rather than buzzing at you about a rest that ended minutes ago.",
      },
      {
        title: "The web app asks to keep your data",
        body: "On the web everything lives in the browser's storage, which by default a browser may clear when it needs the space. The app now asks for that storage to be made persistent, which Chrome grants quietly to an installed app you actually use. The Android build never needed it \u2014 it writes to the phone's own storage, which was never at risk.",
      },
      {
        title: "The description text is still there",
        body: "The second button does what the old one did \u2014 builds the session into text for the activity description \u2014 since a description is the only part a reader sees without opening the activity.",
      },
    ],
  },
  {
    version: "1.27.0",
    released: "2026-10-12",
    headline: "The app opens with something worth watching, and a programme's order is yours.",
    items: [
      {
        title: "An opening sequence",
        body: "A point of light, a shockwave, and an icosahedron turning in space \u2014 twelve vertices built from the golden ratio, thirty edges, real rotation and real perspective. It breaks apart with the velocity each fragment actually had at the moment of the break, and the pieces are pulled into IRON LOG, read off the wordmark's own pixels so the letters are the real ones at whatever size your phone is. Then the screen opens from the middle onto the app, which has been running underneath the whole time.",
      },
      {
        title: "On your terms",
        body: "Tap anywhere to skip it. It plays once per launch, not every time you come back from your music. If your phone is set to reduce motion it does not animate at all, and there is a switch in Settings \u2014 Opening Animation \u2014 to turn it off for good.",
      },
      {
        title: "Reorder a programme's exercises",
        body: "The day list on a running programme could be added to and taken from but never rearranged, which left the order fixed at whatever the builder produced. Up and down arrows on every exercise now, the same pair the builder and the live workout use, and the new order saves the moment you tap \u2014 no save button to hunt for.",
      },
    ],
  },
  {
    version: "1.26.0",
    released: "2026-09-22",
    headline: "Every version the app has ever been, with the day it arrived.",
    items: [
      {
        title: "Version History, at the foot of Settings",
        body: "Every release from the first one to the one you are running, newest first, each with the date it shipped and a line saying what it brought. Tap any of them to read that release's notes in full \u2014 the same ones that appeared on the day it landed. The version you have is marked.",
      },
      {
        title: "Where it started",
        body: "The list goes back to v1.0.0 on 17 July 2026, which never had a changelog of its own because there was nothing to change from. It has one now: what the app was on the first day \u2014 logging by split, the readiness map, a rest timer that starts itself, history, personal bests, estimated 1RMs, charts and templates.",
      },
      {
        title: "Real dates on the changelog",
        body: "Releases used to be dated by month, so four of them read \"August 2026\". Every release now carries the day it actually reached the app, written out longhand \u2014 21 September 2026, not 21/09/2026, which means something else again in half the world.",
      },
    ],
  },
  {
    version: "1.25.0",
    released: "2026-09-21",
    headline: "Training load, done the way the research does it.",
    items: [
      {
        title: "Stats for Nerds",
        body: "A button at the foot of Consistency, and twelve panels behind it. Total tonnage with something to picture it against; a body diagram shaded by which muscles actually get your work; how often you go to failure, out of the sets where you recorded the effort rather than out of all of them; your reps by range; push against pull against legs; most-done exercises; which lifts have moved most and which have gone backwards; what hour you train and which day; weight moved per week; a record book of streaks, gaps and your biggest session; and your cardio totals by sport. Panels with nothing to say do not appear.",
      },
      {
        title: "The fatigue bar is now the acute:chronic workload ratio",
        body: "The old one was our own invention and it read your week wrong. This is a common sports-science measure: every session scored by Foster's session-RPE \u2014 how hard it felt times how long it lasted \u2014 with the last 7 days weighed against the last 28, both exponentially weighted. Gabbett's zones colour the bar. (Since then the scale is labelled information only: research disputes the ratio as an injury predictor.) Because it divides by your own 28-day average, it knows the difference between a heavy week for you and a heavy week for anybody.",
      },
      {
        title: "An info button on the training load",
        body: "Top right of the scale. What the ratio is, your own acute and chronic numbers with the windows they cover, where a session's load comes from, all four zones and their boundaries, what dragging does, and links to the three papers the whole thing is built on \u2014 Foster for session RPE, Gabbett for the zones, Williams for the weighting \u2014 plus Lolli, on why the ratio is information only and cannot predict injury. Shut by default, so the bar itself still says nothing in words.",
      },
      {
        title: "Drag the marker to ask it a question",
        body: "Pull the line along the scale and it tells you what it would take to get there. Drag it down and you get the hours of rest, with the time and date you would arrive \u2014 rest is the only thing that lowers the ratio, and it falls by a fixed factor each day, so the answer is exact rather than a guess. Drag it up and resting will not do it, so it prices the session instead: the minutes at RPE 8 that would put you there today. Let go and it snaps back. Nothing is set or changed by it.",
      },
      {
        title: "A scale with a marker, not a bar that fills",
        body: "A filling bar says more is worse, and that is not what the ratio means \u2014 too little is its own risk and the target is a band in the middle. The colour now belongs to the scale, red through green and back to red, with a line showing where you are. The paragraph underneath is gone.",
      },
      {
        title: "A different quote every morning",
        body: "The home screen used to ask \"Ready to train?\" every single day, which after a week is wallpaper. It now opens with one of 365 quotes, chosen by the date \u2014 the same one for everybody on the same day, a new one tomorrow, and no repeat until the year comes round. Philosophers, physicists, comedians, novelists, boxers and pop stars: Marcus Aurelius, Marilyn Monroe, Alan Turing, Churchill, Nina Simone, Groucho Marx, Dolly Parton, Terry Pratchett. Not all of it is motivation, and none of it is anonymous \u2014 every line carries who said it and when, with \"c.\" where the year is a best estimate and \"attributed to\" where the world is not sure it was really them.",
      },
      {
        title: "Two numbers taken out",
        body: "The adherence percentage is gone from a programme's progress screen. Sessions against the plan, sets logged, total volume and your biggest lifts are all still there \u2014 what you did, rather than a mark out of ten for doing it. The bodyweight graph has lost its fitted trend line too: it now draws your weigh-ins, joins them up and marks your goal, and leaves the reading of it to you. Progress charts for individual lifts keep theirs.",
      },
      {
        title: "Edit an activity after the fact",
        body: "Tap the pencil on any logged run, ride or swim to change any of it \u2014 what it was, the date and time, the distance, the effort. Moving one to a different day re-files it in order and everything that reads it, the map, the streak and the load scale, follows.",
      },
    ],
  },
  {
    version: "1.24.0",
    released: "2026-09-21",
    headline: "Know when to take the day off, and log the cardio you actually do.",
    items: [
      {
        title: "Training load, under the readiness map",
        body: "The measure sports science already uses, rather than one of ours. Every session gets a load \u2014 how hard it felt times how long it lasted, Foster's session-RPE \u2014 and the last 7 days of it are weighed against the last 28. Below 0.8 is less than you are used to, 0.8 to 1.3 is close to your usual training, and above 1.5 is a sharp rise. (Now labelled information only: it cannot predict injury.) The bar is coloured by those zones with a marker showing where you are, so it reads at a glance without a paragraph under it. It compares you to your own conditioning, so the same week is a normal week for one person and a spike for another.",
      },
      {
        title: "Fifteen cardio options, indoor and out",
        body: "Run, walk, hike, cycle and swim outdoors; treadmill, incline walk, stationary bike, spin, rower, elliptical, stair climber, assault bike and jump rope indoors. Each knows what it works \u2014 a rower is quads and back, a swim is back and delts, an assault bike is close to everything \u2014 and each is read in its own unit: min/km on foot, km/h on a bike, a /500m split on the erg, /100m in the pool.",
      },
      {
        title: "Log a run whenever you get round to it",
        body: "The activity form now takes a date and a time instead of assuming you are logging it the second you stop. A run stamped six hours late tells the readiness map the wrong thing.",
      },
      {
        title: "Cardio keeps your streak alive",
        body: "A day with a run or a hike on it now counts on the day streak and fills a square on the consistency calendar, the same as a day in the gym.",
      },
    ],
  },
  {
    version: "1.23.0",
    released: "2026-09-13",
    headline: "Log effort the way you already think about it \u2014 and log the days you do not lift.",
    items: [
      {
        title: "Runs, walks and rides, at the foot of Home",
        body: "A small panel under Stats for the training that is not lifting. Log a time and a distance and it works out your pace; add an effort from RPE 1 to 10 and the readiness map takes it into account — a hard run leaves quads, calves and hamstrings needing longer, a walk barely registers, and \"Other\" is timed without the app pretending to know what it worked. None of it touches your set counts, weekly volume or training log.",
      },
      {
        title: "RIR or RPE, your choice",
        body: "The circle beside every set can now be read either way: reps in reserve as before, or RPE out of 10. Settings \u2192 Training Defaults. They are the same measurement counted from opposite ends \u2014 2 reps left is an RPE 8 \u2014 so this only changes the labels. Nothing already logged is rewritten, the readiness map keeps reading it exactly as it did, and switching back shows your whole history in the old scale again.",
      },
    ],
  },
  {
    version: "1.22.0",
    released: "2026-09-12",
    headline: "Progress charts draw the actual trend, and stop letting one odd session wreck the view.",
    items: [
      {
        title: "A trend line on every progress chart",
        body: "A straight blue line through your history showing which way a lift is really going, with the total change over the period beside it.",
      },
      {
        title: "Odd sessions no longer bend the picture",
        body: "The same lift loaded a different way — an incline press taken on a barbell rather than dumbbells — reads heavier without being stronger, and a mistyped weight reads heavier still. Both are now spotted and left off the chart entirely, so the work you actually did fills it instead of being squashed into the bottom by one odd session. The count of anything hidden is shown next to the trend, and nothing is changed or removed from your history.",
      },
      {
        title: "Your weight goal on the weight chart",
        body: "A dotted blue line across the bodyweight graph marking the goal you set, so you can see how far off it you are at a glance.",
      },
      {
        title: "Weight only needs entering once",
        body: "Personal Info and Weight Tracking sit on the same screen and both record your weight. Update either and the other now follows immediately.",
      },
      {
        title: "Training Defaults — the numbers are yours now",
        body: "Settings → Training Defaults. Rest lengths for compounds and for isolation work, anywhere from 30 seconds to 10 minutes. Whether the timer starts itself, beeps, and buzzes — a gym is loud and a phone is usually in a pocket, so the buzz is new. How many set rows an exercise opens with. How fast you personally recover, which shifts the whole readiness map without flattening the difference between chest and side delts. And how far back the per-exercise history goes, up from a fixed 20 sessions to as many as 250. The three rest switches moved off the main Settings list to sit beside the rest lengths, so that list is shorter than it was.",
      },
      {
        title: "Bodyweight lifts know they are bodyweight lifts",
        body: "Hanging leg raises, planks, ab wheel, reverse crunches, dead hangs, bench dips, back extensions and glute-ham raises now offer Bodyweight or Weighted, the same way dips and pull-ups already did. On Bodyweight the weight box becomes a BW tile instead of an empty field, and the progress chart counts you rather than plotting nothing.",
      },
    ],
  },
  {
    version: "1.21.0",
    released: "2026-09-04",
    headline: "The rest timer actually starts itself now, plus a breakdown of how a session went.",
    items: [
      {
        title: "Fixed: auto-start rest timer",
        body: "Ticking a set off was supposed to start the rest countdown automatically — it read the tick back too early and never fired. It now starts every time, as it always should have.",
      },
      {
        title: "Set tick boxes off? Reps do the same job",
        body: "With tick boxes hidden (Settings → Set Tick Boxes) there is nothing to tick, so entering a set's reps now starts the rest timer instead.",
      },
      {
        title: "Session Breakdown on the finish screen",
        body: "A donut of every set you did, coloured against the same set last time: green for more reps, amber for the same or one fewer, red for two or more fewer. Shown whenever there is a previous session to compare against.",
      },
      {
        title: "Same colours, mid-set",
        body: "A set's border while you're training uses the same scale — amber replaces the old grey for \"held\", and it now distinguishes one rep down (amber) from a real drop (red).",
      },
    ],
  },
  {
    version: "1.20.0",
    released: "2026-08-31",
    headline: "Share a workout to Strava.",
    items: [
      {
        title: "Turn it on in Settings",
        body: "Settings \u2192 Share to Strava. It adds a button when you finish a workout and on every past one in History.",
      },
      {
        title: "Your lifts, ready to paste",
        body: "It builds the session into text \u2014 the split, exercise count, set count and total weight moved, then every exercise with its sets and the implement you used \u2014 hands it to the share sheet, and opens Strava for you to paste into the activity description.",
      },
      {
        title: "Why it is a paste and not an upload",
        body: "Posting straight into Strava needs a secret key at sign-in, and Iron Log has no server to keep one in \u2014 it would have to ship inside the app where anyone could take it. Strava also has nowhere structured to put sets and reps: an activity has a name, a type, a duration and a description, so the lifts end up as description text either way.",
      },
    ],
  },
  {
    version: "1.19.0",
    released: "2026-08-29",
    headline: "Tap last time's numbers to log them again.",
    items: [
      {
        title: "Repeat last session in one tap",
        body: "The \u201clast time\u201d panel on every exercise is a button now. Tap it and those weights and reps are written straight onto the card, one row per set you did. Most sessions are the last one repeated, and typing three identical rows back in was the most repeated thing in the app.",
      },
      {
        title: "It will not wipe what you have typed",
        body: "On an empty exercise it fills straight away. If you have already logged something it asks first, and only replaces on a second tap.",
      },
      {
        title: "Effort is not copied",
        body: "Weight and reps are a plan; how close to failure it put you is a measurement. Reps in reserve is left blank for you to log, so the readiness map is never fed a number nobody reported.",
      },
    ],
  },
  {
    version: "1.18.0",
    released: "2026-08-25",
    headline: "Light mode, and everything about how the app looks in one place.",
    items: [
      {
        title: "Light mode",
        body: "Settings \u2192 Colour & Display. Dark, light, or follow whatever your phone is set to. It is not the dark theme inverted \u2014 every colour has a second value chosen for a pale background, because the ones that work on black mostly vanish on white.",
      },
      {
        title: "One screen for all of it",
        body: "Theme, colour scheme and contrast now live together on their own page instead of being scattered through Settings. They affect each other, so they belong side by side.",
      },
      {
        title: "The colour schemes work in both themes",
        body: "Each of the four has its own light palette rather than a lightened copy. Monochrome turns over rather than inverting: ready is the most prominent either way \u2014 brightest on dark, darkest on light.",
      },
      {
        title: "Outlines you can actually see",
        body: "The readiness outlines are drawn in whichever of black or white stands out against the muscle underneath, so they stay visible on a light theme where the fills are dark. An outline that blends in is no use as the backup for colour.",
      },
    ],
  },
  {
    version: "1.17.0",
    released: "2026-08-25",
    headline: "The readiness map, for people who cannot see red and green.",
    items: [
      {
        title: "Colour schemes in Settings",
        body: "The map told you what was recovered using red, amber and green \u2014 which is the worst possible choice for the commonest kind of colour blindness. Roughly one man in twelve could not reliably tell recovering from ready. Settings now has a Colour & Contrast section with four schemes: the original, one for red\u2013green deficiency, one for blue\u2013yellow, and a monochrome one that uses brightness alone.",
      },
      {
        title: "Every colour that means something changes",
        body: "Not just the body map. The set outlines that mark a better or worse set than last time, the accent, the superset colours and the effort dial all move with the scheme.",
      },
      {
        title: "Outlines, so colour is never the only clue",
        body: "In any scheme but the original, recovering muscles get a solid outline and almost-ready ones a dashed outline. A palette can be beaten by a bad screen or a form of colour blindness no preset anticipated. An outline cannot.",
      },
      {
        title: "High contrast",
        body: "A separate switch: pure black behind everything, brighter text, heavier lines, and the outlines turned on whichever scheme you are using. For low vision, or a phone at arm's length in a bright gym.",
      },
      {
        title: "See it before you choose it",
        body: "The three states are shown as they will actually look, on the page where you pick the scheme.",
      },
    ],
  },
  {
    version: "1.16.0",
    released: "2026-08-25",
    headline: "Better sessions when Iron Log picks them for you.",
    items: [
      {
        title: "A ranking decides what you get",
        body: "Auto-built workouts now follow an explicit priority list rather than working it out on the fly. A whole-body session is squat, pull-up, dips, lateral raise, curl, pushdown, hanging leg raise \u2014 the best lift for each area, biggest first. Train only some muscles and it walks the same list with the parts that do not apply left out.",
      },
      {
        title: "Muscles alternate through the session",
        body: "Two chest exercises and one back used to come back as chest, chest, back, so the second chest lift landed on a chest the first had already cooked. They are dealt out one muscle at a time now.",
      },
      {
        title: "Never four brutal lifts in a row",
        body: "A generated session holds at most three of the genuinely fatiguing lifts, and a short one is made of them rather than robbed of them \u2014 fifteen minutes is squat, pull-up and dips, not a squat and two curls.",
      },
      {
        title: "Your own order still wins",
        body: "Reorder a muscle with the arrows in the Exercise Database and your ranking fills that muscle's slot instead of the built-in one. Where the two disagree, you win.",
      },
      {
        title: "A week is seven days",
        body: "Programme progress counted sessions and called them weeks, so seven repeats of one full-body day read as week four. It counts real weeks from the day you started the block now. The session tally beside it is unchanged, so you can still see how much of the block you have actually done.",
      },
      {
        title: "One less question before you start",
        body: "Train Ready Muscles asks how long you have, and nothing else. The strength-or-size choice is gone \u2014 the ranking decides what you get, and the extra tap was buying nothing.",
      },
    ],
  },
  {
    version: "1.15.0",
    released: "2026-08-25",
    headline: "Fix an exercise instead of replacing it.",
    items: [
      {
        title: "Edit anything in the database",
        body: "Tap the pencil beside any exercise \u2014 yours or one of Iron Log\u2019s \u2014 to change its name, its muscle, whether it counts as a compound, the muscles it also hits, and its cue. Before this the only way to correct something was to delete it and add it back, which threw away every set you had ever logged against it.",
      },
      {
        title: "Your history comes with it",
        body: "The exercise keeps its identity, so your logged sets, records and charts stay attached. Rename it or move it to another muscle and every past workout is updated to match, so your history does not end up half under the old name.",
      },
      {
        title: "Adding an indirect muscle counts backwards",
        body: "Tick a muscle an exercise also hits and sessions you logged months ago start counting toward it straight away, on the readiness map and in weekly volume. Nothing needs re-entering.",
      },
      {
        title: "Changed your mind",
        body: "An edited built-in is marked Edited in the list, and can be put back to Iron Log\u2019s version at any time \u2014 which takes your history back with it.",
      },
    ],
  },
  {
    version: "1.14.0",
    released: "2026-08-25",
    headline: "Dips and pull-ups know the difference between help and load.",
    items: [
      {
        title: "One button for how you are loading it",
        body: "Dips, pull-ups, push-ups and nordic curls now have a single button on the card: bodyweight, assisted, or weighted. Bodyweight asks for no number at all. Assisted asks how much help, weighted asks what you added. Changing it clears the weights rather than reinterpreting them, because assistance and added weight are opposite quantities.",
      },
      {
        title: "It remembers what you used",
        body: "The first time you touch the weight box it offers the figure from your last session at that same loading \u2014 the assisted number when you are assisted, the weighted one when you are weighted. Tap to reuse it across every set, or enter a new one.",
      },
      {
        title: "Progression that reads the right way round",
        body: "Charts plot what you actually moved: bodyweight minus the assistance, or bodyweight plus the belt. Going from 40kg of help to 20kg used to look like your numbers halving. It now reads as the progress it is. Add your bodyweight in Personal Info to switch this on \u2014 without a weigh-in there is no honest number to draw, so nothing is invented.",
      },
    ],
  },
  {
    version: "1.13.0",
    released: "2026-08-24",
    headline: "Find any exercise, and tell Iron Log what your own ones work.",
    items: [
      {
        title: "The database has a search box",
        body: "It only listed exercises by body part before, which is no help if you do not already know where something was filed. There is a search box on the front of it now.",
      },
      {
        title: "It knows what you call things",
        body: "Search matches common alternative names as well as the one on the entry. Press-up finds Push-Up, OHP finds Overhead Press, RDL finds Romanian Deadlift, bent over row finds Bent-Over Row.",
      },
      {
        title: "Your own compounds can name their indirect work",
        body: "Adding a compound now offers a list of muscles it also hits. They pick up partial fatigue on the readiness map and half a set each in weekly volume \u2014 the same treatment the built-in exercises get. Before this, a custom exercise only ever marked one muscle.",
      },
    ],
  },
  {
    version: "1.12.0",
    released: "2026-08-21",
    headline: "A form video for every exercise, one tap away.",
    items: [
      {
        title: "Play button beside every lift",
        body: "Not sure how something is done, or want to check your setup mid-session? Tap the play button next to the exercise name and Iron Log opens a YouTube search for it.",
      },
      {
        title: "It follows the implement",
        body: "The search includes whichever loading you picked, so asking about a Smith machine bench press does not show you a barbell one. That is why it is a search rather than one fixed video per exercise \u2014 and it means the link can never rot.",
      },
      {
        title: "Still nothing to download",
        body: "No videos are bundled and nothing is cached. The button opens YouTube and the app itself stays exactly as offline as it always was.",
      },
    ],
  },
  {
    version: "1.11.1",
    released: "2026-08-20",
    headline: "The tour just shows you the app now.",
    items: [
      {
        title: "No more dimming",
        body: "The tour used to grey out the screen and draw a ring around whatever it was describing. The ring landed in the wrong place often enough to be misleading, and its backdrop was painting over the explanation text, which is why that sometimes looked washed out. All of it is gone \u2014 the real screen, and the words explaining it.",
      },
      {
        title: "It still takes you there",
        body: "Each step still opens the screen it is about and scrolls the relevant part into view. That part always worked; it was only the box drawn on top that did not.",
      },
    ],
  },
  {
    version: "1.11.0",
    released: "2026-08-20",
    headline: "The free trial is Google's now, and Iron Log is a subscription.",
    items: [
      {
        title: "7 days free, properly",
        body: "The trial used to be a date stored on your phone, which meant reinstalling reset it. It is a Google Play free trial now \u2014 Play allows one per account and enforces it, so the trial is real for everyone rather than optional for anyone who knew the trick.",
      },
      {
        title: "Monthly or annual",
        body: "Pick either when you start the trial. The price shown is whatever Play quotes in your own currency, and you can change or cancel from Settings or from Google Play at any time.",
      },
      {
        title: "It still works in the basement",
        body: "Iron Log only needs to reach Play occasionally to confirm the subscription, and keeps working for two weeks between confirmations. No signal in your gym is not a reason to be locked out of your own workout.",
      },
      {
        title: "Your history is never held hostage",
        body: "Home, Settings and Backup stay open whether you are subscribed or not. Cancelling stops the app, it does not take your training log \u2014 you can always export it.",
      },
      {
        title: "Already bought it outright?",
        body: "Anyone who paid for the old one-time lifetime unlock keeps it, permanently. You will never be asked to subscribe.",
      },
    ],
  },
  {
    version: "1.10.0",
    released: "2026-08-19",
    headline: "The readiness map is an actual body now.",
    items: [
      {
        title: "A real anatomical figure",
        body: "The blocky mannequin is gone. Front and rear are drawn from a proper anatomical chart \u2014 sixty-four muscle bellies, so your lats, traps, delts and triceps sit where they actually sit rather than in a stack of rectangles.",
      },
      {
        title: "Groups still read as one thing",
        body: "A group made of several bellies \u2014 three lat segments a side, six trapezius segments, three calf heads \u2014 fills and taps as a single muscle, so nothing about reading the map or tapping it for detail has changed.",
      },
      {
        title: "The rest of the body is visible",
        body: "Head, hands, feet, knees and hips are drawn in grey rather than near-black, so the figure holds together against the dark background instead of floating in pieces.",
      },
    ],
  },
  {
    version: "1.9.0",
    released: "2026-08-19",
    headline: "A new programme to follow, one Squat instead of three, and a builder that lets you set the order.",
    items: [
      {
        title: "Project Arms",
        body: "A new preset: Upper, Lower, Arms, rest — twice through. Two dedicated arm sessions a week, direct forearm work in both, and grip work to finish. Pick it like any other split and change whatever you like before you start.",
      },
      {
        title: "One Squat, four ways to do it",
        body: "Back, Front and Hack Squat are a single Squat now, with which one you did picked per session like barbell or dumbbell anywhere else. A programme day can still name the variation it means \u2014 Project Arms asks for the hack \u2014 and the chart keeps them apart. Everything you had logged moved across, tagged with the variation.",
      },
      {
        title: "Three exercises came with it",
        body: "Hip Adduction, Eugene Curl and Reverse Eugene Curl are in the database now, so they are available to every programme and to the workout builder, not just this one. Both Eugene curls are filed under Forearms.",
      },
      {
        title: "Set the order of a day yourself",
        body: "Every exercise in the programme builder has up and down arrows. Preset days now keep the order they were written in too — no more finding a farmer's carry at the top of your arms day because the app decided compounds go first.",
      },
      {
        title: "Add an exercise without leaving the builder",
        body: "The add panel has two tabs: pick from the database, or create a new exercise there and then. Anything you create is saved to the database properly, so it turns up everywhere else as well.",
      },
    ],
  },
  {
    version: "1.8.0",
    released: "2026-08-19",
    headline: "Recovery windows now depend on the muscle and on how hard you trained it.",
    items: [
      {
        title: "Four windows per muscle, not one",
        body: "Every muscle now has its own figure for four cases: trained hard, trained with reps left, worked indirectly hard, worked indirectly with reps left. The lower back needs four days after a session to failure and a day and a quarter after catching indirect work with a buffer. Side delts need a day and a half at most.",
      },
      {
        title: "Your RIR decides which one applies",
        body: "0 or 1 reps left puts the muscle on its failure window; 2 or more puts it on the buffer window, and the difference is big — squats to failure need 84 hours where squats with reps left need 54. The hardest set of the session decides. Not logging effort reads as 2+, so nothing changes if you would rather not track it.",
      },
      {
        title: "Indirect work can be red now",
        body: "It used to be held at amber no matter what, on the theory that a synergist is never really wrecked. A hard bench genuinely does leave the triceps needing 30 hours, so the map says so instead of rounding it down. Every muscle has its own indirect windows rather than sharing one blanket fraction.",
      },
      {
        title: "The colours mean what they always did",
        body: "Green is ready, amber is less than a day to go, red is more than a day to go. Only the hours behind them have changed.",
      },
    ],
  },
  {
    version: "1.7.0",
    released: "2026-08-11",
    headline: "Change a programme you have already started, and stop ending workouts by accident.",
    items: [
      {
        title: "Edit the programme you are running",
        body: "Open Programme and tap any workout to see what is in it. Remove an exercise that is not working and add one that is — no need to scrap the programme and build it again. Changes apply from your next session; anything already logged stays exactly as you did it.",
      },
      {
        title: "Finishing takes two taps",
        body: "The Finish Workout button now sits at the end of the list instead of floating over it, and the first tap only arms it. Nothing is saved until you tap again, and it disarms itself after a few seconds.",
      },
      {
        title: "The superset panel follows you down the page",
        body: "Linking exercises means tapping ones that may be well down the list. The panel now floats above it, so Link and Cancel stay where you can reach them.",
      },
      {
        title: "Dips are one exercise again",
        body: "Assisted and weighted are how you load a dip, not different exercises, so they are a choice on the exercise like barbell or dumbbell anywhere else. Generated days now programme plain Dips and leave the loading to you. Anything you had logged as Assisted or Weighted Dips moved across, tagged with how it was done.",
      },
      {
        title: "Warm-up suggestions that make sense",
        body: "The ramp rounded to the nearest 5kg regardless of the lift, so a 5.7kg cable set was told to warm up with three sets of 5kg — heavier than the working set. Steps now scale with the weight, never reach the top set, and only appear on compounds, which is what the setting always said.",
      },
      {
        title: "Turn the tick boxes off",
        body: "Settings → Set Tick Boxes hides the box beside every set and warm-up if you would rather just type your numbers and move on. Nothing about what gets saved changes; the rest timer stops starting itself, so use Start Rest when you want it.",
      },
      {
        title: "Progress charts are filed by body part",
        body: "The list under the chart is grouped into muscle groups you open and close, instead of every exercise you have ever logged in one long run. The group holding the chart on screen opens itself.",
      },
    ],
  },
  {
    version: "1.6.0",
    released: "2026-08-04",
    headline: "A rebuilt exercise list, and every lift asks how you are doing it.",
    items: [
      {
        title: "The exercise list has been rewritten",
        body: "Sixty-six exercises across sixteen muscle groups, each one there because it earns its place. Near-duplicates that only differed by the bar in your hands have been folded into one entry, and the groups are ordered the way most people would pick them.",
      },
      {
        title: "Barbell, dumbbell, Smith or machine — your choice",
        body: "There is no longer a separate Barbell Bench Press and Dumbbell Bench Press. There is Bench Press, and a row of implements you tap, exactly like grip and machine brand. Thirty-two exercises offer the choice; the ones that only make sense one way do not ask.",
      },
      {
        title: "Programmes pick an implement and say so",
        body: "A generated day names the implement it has chosen, and you can change it on the spot. Your “last time” comparison follows it too — switch from barbell to dumbbell and the target switches to your last dumbbell session, not a number you cannot match.",
      },
      {
        title: "Lower Back and Shins are groups of their own",
        body: "Deadlifts and back extensions are Lower Back exercises rather than Back, and tibialis raises finally have somewhere to live. Both have their own region on the readiness map and their own recovery window.",
      },
      {
        title: "Four kinds of dip",
        body: "Dips, Assisted Dips and Weighted Dips sit under Chest; Seated Dips are filed under Triceps, where that version belongs.",
      },
      {
        title: "Everything you had logged came with it",
        body: "Old exercises were mapped onto their replacements, keeping the implement they implied — a Smith bench is now a Bench Press marked Smith Machine. History, PBs, 1RM goals, templates, programmes and your custom ordering all moved with them, merging rather than dropping where two entries became one.",
      },
    ],
  },
  {
    version: "1.5.0",
    released: "2026-08-03",
    headline: "Backups, effort tracking, and a straight answer about what your numbers mean.",
    items: [
      {
        title: "Front, side and rear delts are separate",
        body: "\u201cShoulders\u201d is gone. Overhead pressing and front raises are Front Delts; lateral raises and upright rows are Side Delts; face pulls and reverse flys stay Rear Delts. Each has its own place in the exercise order and its own region on the readiness map.",
      },
      {
        title: "They recover at their own rates",
        body: "Front delts take the heavy pressing, so they need 48 hours. Side and rear delts need 24. Lateral raises the day after an overhead press session no longer look like training a muscle that is still wrecked, because they are not the same muscle.",
      },
      {
        title: "Pressing shows where it actually lands",
        body: "Bench press now marks your front delts rather than your whole shoulder, and overhead pressing counts toward the side delts as indirect work.",
      },
      {
        title: "Your history came with it",
        body: "Everything already logged was moved to the right group by exercise, so past sessions, saved templates, programmes and your custom exercise order all still line up. Nothing to redo.",
      },
      {
        title: "Progress charts filter by machine",
        body: "Any exercise you have logged on more than one machine gets a dropdown beside its name. Pick a brand and the chart plots only that stack, so two gyms' weights stop being drawn as one jagged line.",
      },
      {
        title: "\u201cLast time\u201d matches the machine you are on",
        body: "Name the machine and the comparison switches to your last session on that one. If you have never used it, it says so rather than handing you a target set on a different stack \u2014 with the most recent session kept underneath for reference.",
      },
      {
        title: "Tag past sessions after the fact",
        body: "Editing a workout in your history now lets you add the machine and grip you used. Handy for filling in the sessions you logged before you started recording it.",
      },
      {
        title: "Back up everything to one file",
        body: "Settings \u2192 Backup writes your whole training history to your Downloads folder and tells you the exact filename and path \u2014 no more wondering where it went. The same screen restores it. Worth doing today: nothing is stored anywhere but this phone.",
      },
      {
        title: "Log how hard a set was",
        body: "Advanced Mode adds a blue circle to every set. One tap picks how many reps you had left \u2014 0 for failure, 3+ for stopping well short. Sets taken to failure now stretch that muscle's recovery on the readiness map, and easy ones shorten it.",
      },
      {
        title: "Charts that do not lie about progress",
        body: "Progress now plots estimated 1RM by default, so 100kg for 5 followed by 95kg for 10 reads as the improvement it is instead of a drop. Top-set weight and total volume are still a tap away.",
      },
      {
        title: "Notes, and a rest timer that starts itself",
        body: "Add a note to any exercise \u2014 seat height, how it felt \u2014 and it comes back next time you do it. Ticking a set off now starts the rest countdown on its own.",
      },
      {
        title: "Tape measurements",
        body: "Personal Info tracks chest, waist, hips, arms, thighs and calves alongside bodyweight, with the change since your first reading. The scale can sit still for months while these move.",
      },
      {
        title: "Simple or Advanced, asked up front",
        body: "New installs now choose between the two on the very first screen, next to a plain table of what the trial includes and what the one-off unlock keeps.",
      },
    ],
  },
  {
    version: "1.4.0",
    released: "2026-08-01",
    headline: "One rule for the readiness colours: amber always means ready tomorrow.",
    items: [
      {
        title: "Amber now means the same thing everywhere",
        body: "Green is ready. Amber is less than a day to go. Red is more than a day to go. Every muscle follows the same rule, so you no longer have to remember which ones use which thresholds — amber always means you can train it tomorrow.",
      },
      {
        title: "Quick-recovering muscles no longer show red",
        body: "Arms, side and rear delts, abs, calves and forearms need a day, so they are never more than a day from ready. They go straight to amber and clear from there.",
      },
      {
        title: "Indirect work always reads amber",
        body: "Muscles worked by a lift without being its target clear in half their window, and never sit longer than a day, so they can never show red on your behalf.",
      },
    ],
  },
  {
    version: "1.3.0",
    released: "2026-08-01",
    headline: "The readiness map now knows what your compound lifts do to everything else.",
    items: [
      {
        title: "Face pulls train your rear delts again",
        body: "Cable Face Pull and Rear Delt Cable Fly were filed under Shoulders, so doing them left the rear delts showing as fully recovered. They are Rear Delts exercises now, where they belong.",
      },
      {
        title: "Indirect work counts",
        body: "Bench press leaves your triceps and front delts tired even though it is a chest exercise. Muscles worked hard by a lift without being its target now go amber on the map — never red — and clear in half the usual time. Bench and your chest is red while your triceps sit amber.",
      },
      {
        title: "Traps and forearms are on the map",
        body: "Both were tracked but had nowhere to appear. They now have their own regions, which matters once deadlifts, rows, shrugs and hammer curls start counting toward them.",
      },
      {
        title: "Tap tells you which kind of work it was",
        body: "A muscle held back only by indirect work says so — \u201cworked indirectly 4h ago\u201d — so being told your triceps need rest after a chest day makes sense.",
      },
      {
        title: "Leg press no longer counts as a press",
        body: "It shared a movement label with bench and overhead press, which let it use up the cap on pressing movements in a generated full-body session.",
      },
    ],
  },
  {
    version: "1.2.0",
    released: "2026-08-01",
    headline: "Muscle readiness now counts hours, and every muscle has its own recovery window.",
    items: [
      {
        title: "Recovery is measured in real hours",
        body: "Readiness was working off the date of a session rather than the time of it, so training at 8pm and coming back at midnight counted as a full day of recovery. It now counts the hours that have actually passed.",
      },
      {
        title: "Red, amber, green — per muscle",
        body: "Each muscle has its own two thresholds instead of one blended scale. Arms, side and rear delts, abs, calves and forearms clear in 24 hours; chest, front delts, back, traps and quads take 48; hamstrings and glutes take 72. Amber is the last stretch before ready.",
      },
      {
        title: "It tells you how long is left",
        body: "Tap any muscle for how long ago you trained it and how many hours until it is ready. The same countdown shows next to each muscle when you are picking what to train.",
      },
      {
        title: "The map updates while you watch it",
        body: "Readiness refreshes on its own, so a muscle turning green no longer waits for you to reopen the app.",
      },
    ],
  },
  {
    version: "1.1.0",
    released: "2026-07-30",
    headline: "A big clean-up pass, and the app finally looks the way it was designed.",
    items: [
      {
        title: "The right typeface, at last",
        body: "Iron Log always specified its condensed display font but never actually loaded it, so every phone substituted its own. The real thing now ships with the app and works offline.",
      },
      {
        title: "Smarter guided programmes",
        body: "Generated sessions used to make odd choices — a deadlift on an upper day, a pull day with nothing that pulls. Every day now follows a proper template: compounds first, isolation added only when you have the time for it.",
      },
      {
        title: "Your exercise order, respected",
        body: "The Exercise Database lists every variation in one ranking, so you can put Bench Press, Dips and Incline Press in whatever order you actually want. Auto-built workouts follow it.",
      },
      {
        title: "Sets show progress as you log",
        body: "Weight and reps outline green when you beat last time, red when you drop, grey when you match — no arithmetic mid-set.",
      },
      {
        title: "Supersets remembered",
        body: "Each exercise shows what it was supersetted with last time, and copying a past workout brings its pairings with it.",
      },
      {
        title: "A full-year consistency calendar",
        body: "A square for every day of the year, month by month, with arrows to step back through previous years.",
      },
      {
        title: "Programme Progress actually opens",
        body: "The Progress button on an active programme never worked — it does now, and Biggest Strength Gains no longer reports a loss just because a block ended on a deload.",
      },
      {
        title: "Easier on the eye",
        body: "Bigger small text, better contrast throughout, and a tidier Home screen and feature list.",
      },
    ],
  },
  // Where it started. No changelog was written at the time — there was
  // nothing to change from — so this one is a description of what shipped
  // rather than a list of what moved, taken from the code as it stood on the
  // day. It exists so Version History has a beginning.
  {
    version: "1.0.0",
    released: "2026-07-17",
    headline: "The first version: log a session, and see what it did to you.",
    items: [
      {
        title: "Logging, by split",
        body: "Pick a split, pick your exercises, and log weight and reps set by set. Finish and it is kept on the phone, with nothing to sign into.",
      },
      {
        title: "The muscle readiness map",
        body: "A body diagram coloured by what you have trained recently and how long each muscle has left to recover, with a Train Ready Muscles button that builds a session out of whatever is green.",
      },
      {
        title: "A rest timer that starts itself",
        body: "Log a set and the clock starts, at a length that depends on whether the lift was a compound or an isolation.",
      },
      {
        title: "History, personal bests and estimated 1RMs",
        body: "Every session kept and searchable, your best set for each lift, and a one-rep max estimated from the top set rather than tested.",
      },
      {
        title: "Charts from day one",
        body: "Progress charts per exercise, weekly volume by muscle, and a training streak.",
      },
      {
        title: "Templates",
        body: "Save a session you like and start the same one again next week.",
      },
    ],
  },
];

export function releaseNotesFor(version) {
  return RELEASE_NOTES.find((r) => r.version === version) || null;
}

/* Releases carry an ISO date so they can be sorted and formatted rather than
   read as prose. Written out longhand because "21/09/2026" and "09/21/2026"
   are the same eleven characters and mean different days. */
export const RELEASE_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatReleaseDate(iso, short) {
  const parts = String(iso || "").split("-");
  if (parts.length !== 3) return iso || "";
  const [y, m, d] = parts.map(Number);
  const month = RELEASE_MONTHS[m - 1];
  if (!month) return iso;
  return `${d} ${short ? month.slice(0, 3) : month} ${y}`;
}
