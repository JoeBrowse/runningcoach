import { Plus, Check, Dumbbell, Clock, Trophy, History as HistoryIcon, Timer, Play, RotateCcw, Bookmark, TrendingUp, ChevronDown, Settings as SettingsIcon, Sparkles, User, BookOpen } from "lucide-react";

/* ---------------------------------------------------------------
   FEATURE TOUR
   A first-open walkthrough of every feature, with Skip/Back/Next. Shown
   once (flag stored under "tour-seen"); replayable from Settings.

   Each step names a real `screen` router value (see App()'s `screen`
   state) — as the tour advances, App() actually navigates there, so the
   real screen sits behind/around the tour card instead of a static
   slideshow image. Steps that describe things that only happen *inside*
   an active workout (logging sets, the rest timer, supersets, back-
   dating) use the special screen value "workoutPreview" instead: App()
   renders a static, inert TourWorkoutPreviewScreen for those, rather
   than mounting the real WorkoutScreen. The real WorkoutScreen
   auto-saves an "in-progress-workout" snapshot the moment it mounts
   (see the effect in WorkoutScreen), so navigating into it with no
   actual exercises picked would silently overwrite — or wipe out — any
   real unfinished workout the user already had saved. The preview
   screen is the least-risky way to show the same UI without touching
   storage at all.
--------------------------------------------------------------- */

export const TOUR_STEPS = [
  {
    icon: <Dumbbell size={26} />,
    title: "Welcome to Iron Log",
    body: "A fast, focused gym tracker. You're starting in Simple Mode — just the essentials, so you can get straight into training. Switch to Advanced anytime in Settings for exercise variants, supersets, drop sets and more. Tap Skip anytime to jump straight in.",
    screen: "home",
  },
  {
    icon: <Plus size={26} />,
    title: "Start a Workout",
    body: "Pick a split (Push, Pull, Legs…) or choose specific muscles, and Iron Log builds a balanced session for you. Or go fully freestyle and add exercises by hand.",
    screen: "split",
    target: "split-list",
  },
  {
    icon: <Bookmark size={26} />,
    title: "Programmes",
    body: "Follow a multi-week plan like Push/Pull/Legs, Upper/Lower or a Bro Split. The app queues your next day automatically and tracks how the block is progressing.",
    screen: "programme",
  },
  {
    icon: <BookOpen size={26} />,
    title: "Your Order of Importance",
    body: "When Iron Log builds a session it works down this list, so whatever sits at the top of a muscle group is what you get first. Move your favourites up with the arrows, remove the ones your gym doesn't have, and add your own. Prefer variety? Turn on Randomize Exercise Selection in Settings and it shuffles instead of following the ranking.",
    screen: "exerciseDb",
    target: "exercise-db-list",
  },
  {
    icon: <Sparkles size={26} />,
    title: "Train Ready Muscles",
    body: "The muscle-readiness map colours each muscle by how long it still needs, in real hours: green once it is ready, amber inside the last day, red while more than a day remains. Tap 'Train Ready Muscles' to build a session from whatever is green.",
    screen: "suggested",
    target: "suggested-options",
  },
  {
    icon: <Check size={26} />,
    title: "Logging Your Sets",
    body: "Enter weight and reps for each set, and tick the box as you finish it — a handy way to plan ahead then check things off. Warm-up sets and per-exercise cues are optional features, off by default — flip them on in Settings if you want them.",
    screen: "workoutPreview",
    target: "set-rows",
  },
  {
    icon: <Play size={26} />,
    title: "Not Sure How It's Done?",
    body: "Every exercise has a play button beside its name. Tap it and Iron Log opens a YouTube search for that lift — and it follows the implement you picked, so asking about a Smith machine bench press does not show you a barbell one.",
    screen: "workoutPreview",
    target: "form-video",
  },
  {
    icon: <Sparkles size={26} />,
    title: "How Hard Was That Set?",
    body: "In Advanced Mode each set gets a blue circle on the right. Tap it and say how hard the set was — reps left in the tank, or RPE out of 10 if that is how you think; pick which in Settings \u2192 Training Defaults. It takes one tap and it changes the readiness map: a muscle taken to failure is given longer to recover than one worked comfortably.",
    screen: "workoutPreview",
    target: "set-rows",
  },
  {
    icon: <Timer size={26} />,
    title: "Rest Timer",
    body: "Tick a set off and the rest countdown starts on its own. It pins to the top of the screen and stays there while you scroll, so it's always visible — pause, add time, or skip it. Settings → Training Defaults sets how long a rest runs for compounds and for isolation work, and turns the automatic start, the beep and the buzz on or off.",
    screen: "workoutPreview",
    target: "rest-timer",
  },
  {
    icon: <ChevronDown size={26} />,
    title: "Supersets & Drop Sets",
    body: "Advanced Mode adds a menu to every exercise: superset it with another, add drop sets, note the brand and grip on machine work, or change how you're loading it — barbell, dumbbell, Smith, machine. Turn on Advanced Mode in Settings if you don't see this yet.",
    screen: "workoutPreview",
    target: "superset-dropset",
  },
  {
    icon: <Clock size={26} />,
    title: "Logged It Late?",
    body: "Forgot to log at the gym? Tap 'Logging for now' at the top of a workout to back-date it to the exact day and time it actually happened.",
    screen: "workoutPreview",
    target: "log-time-pill",
  },
  {
    icon: <RotateCcw size={26} />,
    title: "Back Up Your Training",
    body: "Everything lives on this phone and nowhere else, so a lost or wiped phone would take it all with it. Settings → Backup saves the lot as one file in your Downloads and tells you exactly where it went. The same screen restores it.",
    screen: "settings",
    target: "backup",
  },
  {
    icon: <HistoryIcon size={26} />,
    title: "History & Editing",
    body: "Every session is saved to your Training Log. Open any past workout to review it, fix a typo, or even add an exercise you forgot to record.",
    screen: "history",
  },
  {
    icon: <TrendingUp size={26} />,
    title: "Progress Charts",
    body: "Track any exercise over time as estimated 1RM, top-set weight or total volume. Estimated 1RM is the honest one — a lighter set for more reps still counts as progress. Logged an exercise on more than one machine? A dropdown by its name plots them separately.",
    screen: "progress",
  },
  {
    icon: <Trophy size={26} />,
    title: "1RM Goals",
    body: "Set a one-rep-max target and get a week-by-week progression toward it. Log your max by hand or let the app estimate it from your workouts, then generate a test day when you're ready.",
    screen: "onerm",
    target: "onerm-list",
  },
  {
    icon: <User size={26} />,
    title: "Personal Info",
    body: "Keep your weight, height and age in one place. Turn on weight tracking to set a goal, log your weight over time, and see it on a graph.",
    screen: "pb",
    target: "weight-tracking",
  },
  {
    icon: <Clock size={26} />,
    title: "Consistency",
    body: "A square for every day of the year, month by month, filled in on the days you trained. Step back through previous years with the arrows. Consistency is the thing that matters most over the long run.",
    screen: "streak",
    target: "streak-heatmap",
  },
  {
    icon: <SettingsIcon size={26} />,
    title: "Settings",
    body: "Exercise Cues, Warm-Up Suggestions and a Mobility Finisher all exist — they just ship off, so your first workout stays uncluttered. Turn any of them on right here whenever you want them.",
    screen: "settings",
    target: "opt-in-features",
  },
  {
    icon: <BookOpen size={26} />,
    title: "Lost? Start Here",
    body: "Every feature and every setting in Iron Log, explained in one place. If you're ever not sure how to do something, this is the first place to check.",
    screen: "settings",
    target: "feature-list-btn",
  },
  {
    icon: <Check size={26} />,
    title: "You're All Set",
    body: "That's the whole app. You can replay this tour anytime from Settings. Now go lift something heavy.",
    screen: "home",
  },
];
