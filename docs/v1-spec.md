# Skid Marks V1 specification

Skid Marks is a free running coach and gym tracker in one app. It joins a gym tracker with the running coach designed in this repository. This document gives the decisions for version 1 (app version 2.0.0).

The decisions come from the market research (`docs/research/`) and from six user reviews of three running prototypes and the gym tracker (beginner, intermediate and advanced; new and long-term users).

## 1. Principles

1. **Free.** All features are free. There are no ads, no accounts and no paywall. The app sells no data.
2. **On the phone.** All data stays on the phone. Network calls happen only when the user turns on an optional link (weather, Intervals.icu).
3. **One week, one load.** Run sessions and gym sessions share one plan and one training load. Each side respects the other.
4. **Safe and honest.** Every plan change shows its reason. Safety checks test the real plan. A check never shows "Pass" when the plan breaks the rule. The load numbers are information only. They cannot predict injury.
5. **Simple first.** Simple mode hides jargon (fitness score, form, zones, phases, predictions) until the user has 4 or more weeks of data or turns on Advanced mode.
6. **One look.** Dark theme by default, light theme and colour-blind schemes. Orange accent `#FF6A1A`. Oswald for headings, JetBrains Mono for numbers.
7. **ASD-STE100.** All text is in Simplified Technical English.

## 2. Structure

The app has three modes. A switch at the top of each home screen shows **Plan · Run · Lift**. A tap on the logo also opens the switch.

| Mode | Purpose | Main screens |
|---|---|---|
| Plan | The master week: run days and gym days together | Today, Week, Weekly review, Goals and races, Body (muscle readiness) |
| Run | The running coach | Run home (today's run, GO), Record, Plan weeks, Progress, Zones and prediction, Races, Fuel, Weather, Routes, Coach, Shoes |
| Lift | The gym tracker | All gym tracker screens, plus runner presets |

Shared: Settings, Data (import and export), Women's health, About.

## 3. First open

> Replaced in version 2.1. See `docs/v1.1-spec.md` section 1.

1. A short intro (once only; the animation does not repeat on each launch).
2. "Who are you?": **I am new to running**, **I run sometimes**, **I train for races**, or **Only the gym**.
3. **New to running**: three questions (days a week, minutes a session, gym yes/no). No race date. A run/walk plan starts.
4. **Runs sometimes / Races**: "Bring your history" (import files or link Intervals.icu; optional), then the plan setup.
5. **Only the gym**: Lift mode opens. Running can start later.
6. A sample-data demo is available from Settings only. Sample data never mixes with real data.

## 4. Plan setup (wizard)

- Goal: run/walk to 5K, 5K, 10K, half marathon, marathon, 50K trail, or a **goal without a race date**: Keep fit, Get faster at 5K, Build to 10K (rolling 4-week blocks with a cutback week).
- Race date (optional), goal time (optional).
- **Run days**: the user selects the days, not only a count. The long-run day can be any day.
- **Gym days**: weekday, type (upper, lower, full body, legs, other), intensity (heavy or light), note (for example hypertrophy, strength, calisthenics). These come from the master week.
- Current fitness: a recent race or time trial, "use my past runs" (best efforts of the last 6 to 12 weeks and the 4-week average distance), or "I am new".
- Experience, units, optional heart-rate values (empty by default).
- Medical disclaimer with a consent tick.
- The result screen shows the plan, any warnings, and the safety checks. A new plan always passes; when a rule would fail, the engine changes the plan and says why.

## 5. Plan engine rules

1. **Volume.** Week 1 is at most the current weekly distance plus 10%. Each planned week grows by at most 10% over the previous planned week. Every 4th week is a cutback week. The taper follows the target. "Peak week" means the largest planned training week, not the race week.
2. **Hard days.** No two hard days touch, also across week ends (no hard session on the day after the long run). Never a hard session on the day before the long run. At most 2 hard sessions a week (1 for new runners).
3. **Long run.** The long run is the longest run of the week. It is at most about one third of the week and at most 3 hours.
4. **80/20.** About 80% of running time is easy. The plan passes this check by design.
5. **Starts gently.** Runners with 2 or fewer runs a week get 2 to 3 easy weeks before hills or intervals.
6. **Run/walk.** The run parts grow through the ladder 1, 1.5, 2, 3, 5, 8, 10 minutes until the runner can run 20 to 30 minutes without a stop. "Repeat this week" holds the level. Beginners get effort words ("slow enough to talk"), not paces.
7. **Gym days.** A heavy lower or legs day counts as a hard day for spacing. No heavy legs within 48 hours before a quality run or 72 hours before the long run or a race. Lifting turns to maintenance in the last 10 days before an A race. No heavy lifting in race week. When the user lifts in Lift mode, the engine does not add its own strength sessions.
8. **Far races.** A race more than 30 weeks away gets a base block first. The engine never drops a race.
9. **Races.** Each race has a priority. **A**: full taper. **B**: a 2-to-3-day mini taper and 2 to 4 easy days after. **C**: replaces a quality session.
10. **After a race.** A recovery block scales with race distance and effort. Then the app asks "What next?": rejoin the plan, a new goal, or keep fit.
11. **Variety.** Quality sessions rotate from week to week.
12. **Adaptation.** Missed runs, illness, injury, holiday, breaks, readiness, "too hard / too easy", new results, and a leg-heavy day before a hard run (the app offers a swap, with the reason). Moves can go to another week. "Suggest a day" marks safe days before the tap. "Drop this session" is available. Questions come before the change. Niggle follow-up runs daily for 7 days.
13. **Goal time.** The app shows the goal time against the predicted time. It offers a time trial every 4 to 6 weeks.

## 6. Shared data and load

- One activity store. Runs (recorded, imported or typed), gym sessions and other sports are each saved once. Plan, Run and Lift read the same store.
- Duplicate check: the same start time (within 2 minutes) and the same distance (within 3%) count as one activity.
- One load model: session effort (RPE 1-10) × minutes, the gym tracker scale, for every activity. Heart rate gives effort when it is present.
- One fitness / fatigue / form chart (Banister model, 42 and 7 days) for both modes. It replaces the separate acute:chronic gauge on the home screens. It stays "information only".
- One streak, counted in weeks. Rest days never break it.
- The muscle readiness map from Lift is the shared body screen. Runs and other sports feed it.

## 7. Run features

- Today card with the "why", the session drawn as a shape, the target in effort words or paces, and the next run on rest days. No GO button on a rest day.
- Recording: phone GPS (Capacitor Geolocation; screen stays on while recording), treadmill mode, run/walk mode, voice cues (native text-to-speech in the APK), on-screen captions, pause, lap, end with confirm, summary with splits, effort, feel, shoe and note. A simulated mode exists for the browser demo.
- Readiness check-in: one question after a run; the daily check-in is optional.
- Zones and prediction; the plan updates from a new result.
- Progress: season chart, weekly distance, easy/hard split (from heart-rate zones when present, else from session types; the screen says which), records, badges, history with filters and ranges (8 weeks, 6 months, 1 year, all).
- Races: list, add, priority A/B/C, link an activity as the result, PB card.
- Fuel and race-day pacing; weather and heat adjustment (optional local weather from Open-Meteo, free and with no key; otherwise manual).
- Routes: loop generator with a height profile; GPX export. Street maps are not in V1.
- Coach: on-device rules. It answers questions about today, illness, pain, moves, missed runs, paces, fuel, heat, taper, B races, recovery after a race and gym before a race, from the user's real dates.
- Shoes with distance limits.
- Night-before reminder with quiet hours (local notification).

## 8. Lift changes

- Paywall and billing removed.
- Intro animation on first launch only. Tour: 4 cards in Simple mode; the full tour stays in Settings.
- Runner presets: "Runner strength, 1 day", "Runner strength, 2 days (legs and core)", "Beginner machines" (4 to 5 moves, 2 × 10, start-light hints, no pull-ups or dips).
- Lift sessions mark planned gym days as done in Plan mode.
- Lift home shows today's planned gym session from the master week.
- Activity types include football and other team sports. Every log form has a date field.

## 9. Import and export

- Files: GPX, TCX, FIT, FIT.GZ, and ZIP archives (Strava bulk export, Garmin account export). Many files at once. A summary shows what was added and what was a duplicate.
- Strava export: reads `activities.csv` and the activity files in the archive.
- Intervals.icu: the user's own API key; pulls activities and wellness (HRV, resting heart rate, sleep).
- Strava data is shown only to the user and never goes to an AI.
- Export: full JSON backup (the Lift format plus the run data), CSV of all activities and all sets, GPX per run, calendar (.ics) of the plan.
- Not in V1: Health Connect and HealthKit links, Garmin workout push (the Garmin developer program is closed to new applications), FIT workout export, street maps. These are listed as future work.

## 10. Repository

- `src/` app code: `lib/`, `data/`, `components/`, `screens/` (Lift), `run/` (engine and run screens), `plan/` (master week), `shared/` (store, load, import, native).
- `docs/research/` market research and user reviews; `docs/v1-spec.md` this file.
- `npm test` runs engine tests, including safety invariants for many goal, day and experience combinations.
- GitHub Actions builds a debug APK on every push and publishes it on a release for `main`.
