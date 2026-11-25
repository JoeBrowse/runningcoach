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
    body: "Iron Log is a fast and simple gym tracker. The app starts in Simple Mode. Simple Mode shows only the basic features, so you can start to train quickly. For exercise variants, supersets, drop sets and more, select Advanced Mode in Settings. You can change the mode at any time. To close the tour, tap Skip at any time.",
    screen: "home",
  },
  {
    icon: <Plus size={26} />,
    title: "Start a Workout",
    body: "Select a split (Push, Pull, Legs and more) or select specific muscles. Iron Log then makes a balanced session for you. You can also make your own session and add each exercise yourself.",
    screen: "split",
    target: "split-list",
  },
  {
    icon: <Bookmark size={26} />,
    title: "Programmes",
    body: "Follow a plan that lasts many weeks, for example Push/Pull/Legs, Upper/Lower or a Bro Split. The app selects your next day automatically. It also shows your progress through the block.",
    screen: "programme",
  },
  {
    icon: <BookOpen size={26} />,
    title: "Your Order of Importance",
    body: "Iron Log uses this list when it makes a session. It starts at the top of each muscle group, so you get the top exercise first. Use the arrows to move your favourite exercises up. Remove the exercises that your gym does not have. Add your own exercises. For more variety, turn on Randomize Exercise Selection in Settings. The app then selects exercises at random and does not use the ranking.",
    screen: "exerciseDb",
    target: "exercise-db-list",
  },
  {
    icon: <Sparkles size={26} />,
    title: "Train Ready Muscles",
    body: "The muscle readiness map gives each muscle a colour. The colour shows how many more hours the muscle needs to recover. The app counts real hours. Green means that the muscle is ready. Amber means that the muscle needs less than one more day. Red means that the muscle needs more than one more day. Tap 'Train Ready Muscles' to make a session from the green muscles.",
    screen: "suggested",
    target: "suggested-options",
  },
  {
    icon: <Check size={26} />,
    title: "Log Your Sets",
    body: "Enter the weight and reps for each set. Tick the box when you complete the set. You can also enter your plan first, then tick each set when you do it. Warm-up sets and exercise cues are optional features. They are off by default. To use them, turn them on in Settings.",
    screen: "workoutPreview",
    target: "set-rows",
  },
  {
    icon: <Play size={26} />,
    title: "How to Do an Exercise",
    body: "Each exercise has a play button next to its name. Tap it, and Iron Log opens a YouTube search for that exercise. The search uses the implement that you selected. For example, a search for a Smith machine bench press does not show a barbell bench press.",
    screen: "workoutPreview",
    target: "form-video",
  },
  {
    icon: <Sparkles size={26} />,
    title: "Record the Effort of a Set",
    body: "In Advanced Mode, each set has a blue circle on the right. Tap it to record how hard the set was. Use reps in reserve (RIR) or RPE out of 10. Select the scale in Settings \u2192 Training Defaults. This takes one tap, and it changes the readiness map. A muscle that you train to failure gets more time to recover than a muscle that you train easily.",
    screen: "workoutPreview",
    target: "set-rows",
  },
  {
    icon: <Timer size={26} />,
    title: "Rest Timer",
    body: "When you tick a set, the rest countdown starts automatically. The timer stays at the top of the screen when you scroll, so you can always see it. You can pause the timer, add time or skip the rest. In Settings → Training Defaults, set the rest time for compound and isolation exercises. You can also turn on or off the automatic start, the beep and the vibration.",
    screen: "workoutPreview",
    target: "rest-timer",
  },
  {
    icon: <ChevronDown size={26} />,
    title: "Supersets & Drop Sets",
    body: "Advanced Mode adds a menu to each exercise. Use it to make a superset with another exercise or to add drop sets. You can also record the brand and grip for a machine exercise. You can also change the implement: barbell, dumbbell, Smith or machine. If you cannot see this menu, turn on Advanced Mode in Settings.",
    screen: "workoutPreview",
    target: "superset-dropset",
  },
  {
    icon: <Clock size={26} />,
    title: "Log a Past Workout",
    body: "If you did not log a workout at the gym, you can log it later. Tap 'Logging for now' at the top of the workout. Then set the exact day and time of the workout.",
    screen: "workoutPreview",
    target: "log-time-pill",
  },
  {
    icon: <RotateCcw size={26} />,
    title: "Back Up Your Training",
    body: "Make a backup of your data. The app keeps all your data on this phone only. If you lose or erase the phone, you lose all your data. Settings → Backup saves all your data as one file in your Downloads folder. It shows you the exact location of the file. Use the same screen to restore your data.",
    screen: "settings",
    target: "backup",
  },
  {
    icon: <HistoryIcon size={26} />,
    title: "History & Editing",
    body: "The app saves each session in your Training Log. Open a past workout to see it, to correct an error or to add an exercise that you did not record.",
    screen: "history",
  },
  {
    icon: <TrendingUp size={26} />,
    title: "Progress Charts",
    body: "See the progress of each exercise over time. The chart can show estimated 1RM, top-set weight or total volume. Estimated 1RM gives the most correct view of progress. With this measure, a lighter set with more reps also shows as progress. If you logged an exercise on more than one machine, use the list next to its name. The chart then shows each machine separately.",
    screen: "progress",
  },
  {
    icon: <Trophy size={26} />,
    title: "1RM Goals",
    body: "Set a target for your one-rep max (1RM). The app gives you a weekly plan to get to your target. Enter your max yourself, or let the app estimate it from your workouts. When you are ready, make a test day.",
    screen: "onerm",
    target: "onerm-list",
  },
  {
    icon: <User size={26} />,
    title: "Personal Info",
    body: "Keep your weight, height and age in one place. Turn on weight tracking to set a goal, record your weight over time and see it on a graph.",
    screen: "pb",
    target: "weight-tracking",
  },
  {
    icon: <Clock size={26} />,
    title: "Consistency",
    body: "The calendar has one square for each day of the year, month by month. The app fills the square for each day that you trained. Use the arrows to see previous years. Over a long time, consistency is the most important thing.",
    screen: "streak",
    target: "streak-heatmap",
  },
  {
    icon: <SettingsIcon size={26} />,
    title: "Settings",
    body: "Exercise Cues, Warm-Up Suggestions and a Mobility Finisher are available. They are off by default, so your first workout stays simple. You can turn on each of them here at any time.",
    screen: "settings",
    target: "opt-in-features",
  },
  {
    icon: <BookOpen size={26} />,
    title: "Help Starts Here",
    body: "This list explains each feature and each setting in Iron Log. If you do not know how to do something, look here first.",
    screen: "settings",
    target: "feature-list-btn",
  },
  {
    icon: <Check size={26} />,
    title: "The Tour Is Complete",
    body: "The tour showed all of the app. You can start this tour again at any time from Settings. Now start your first workout.",
    screen: "home",
  },
];
