# Run plan engine (V1, hybrid week in V2.1)

`src/run/engine.js` is the running plan engine of Skid Marks V1.
It is an ES module with named exports. It has no DOM code and no window globals.
All functions are pure. Give `today` (ISO string or Date) where dates matter.
The code is in `src/run/engine/*.js`. `engine.js` exports all of it.

Tests: `node --test test/` (Node 22). The tests build more than 500 plans and check the safety rules on the real planned days.

## Words

- Dates are ISO strings, for example `"2026-12-01"`. Weeks start on Monday.
- Distances are in km. Paces are seconds per km. The UI converts units.
- "Running fitness score" comes from the Daniels and Gilbert equations. Do not call it VDOT.
- "Training load" is RPE (1 to 10) x minutes, the Iron Log scale. Do not call it TSS.
- Load numbers are information only. They cannot predict injury.

## Formatting and dates

| Function | Result |
|---|---|
| `fmtPace(secPerKm, units)` | `"5:12 /km"` or `"8:22 /mi"` (whole seconds) |
| `fmtKm(km, units)`, `fmtTime(sec)`, `fmtDate(iso)`, `fmtDay(iso)`, `fmtSpeed(secPerKm, units)` | Display text |
| `toISO(x)`, `addDays(iso, n)`, `daysBetween(a, b)`, `mondayOf(iso)`, `weekdayOf(iso)`, `parseISO(iso)` | Date helpers (0 = Sunday) |

## Fitness, paces and zones

| Function | Result |
|---|---|
| `checkResult(km, sec)` | `{ok, score}` or `{ok:false, error}`. Scores outside 15 to 85 are refused. |
| `fitnessScore(km, sec)` | Score, or `null` for input that is not valid (22:30 for 10K gives `null`). |
| `paces(score)` | `{easyLo, easyHi, easy, long, marathon, threshold, interval, rep, walk}` |
| `predict(score, km)`, `predictions(score)`, `riegel(t1, d1, d2)` | Race times in seconds |
| `hrZones({maxHR, restHR, lthr}, 'karvonen' \| 'lthr' \| 'max')` | 5 zones, or `null` when values are missing |
| `heatAdjust`, `fuel`, `carbLoad`, `runWalk(level)` | Heat, fuel and the run/walk ladder |

## Plans

`buildPlan(opts)` returns a plan. Options:

- `goal`: `runwalk`, `5k`, `10k`, `half`, `marathon`, `ultra50`, or a goal with no date: `keepfit`, `faster5k`, `build10k` (rolling 4-week blocks; `blocks` sets the count).
- `raceDate`, `goalTimeSec` (both optional). With no race date, a dated goal ends with a goal-day run.
- `runDays`: weekday numbers (0 = Sunday). `longRunDay`: any day.
- `gymDays`: `[{day, type: 'upper'|'lower'|'full'|'legs'|'other', intensity: 'heavy'|'light', note}]`. `planWeek` makes them (see "Hybrid week").
- `usesLift`: when true, the engine adds no strength sessions. The default is true when there are gym days.
- `currentWeeklyKm`, `score`, `experience` (`new` | `some` | `experienced`), `races` (`[{date, distKm, priority: 'A'|'B'|'C', name}]`), `today`.
- Habits from the run history (all optional, from `seedFromHistory`): `runsPerWeek`, `usualLongRunKm`, `longestRecentKm`, `peakWeekKm`. They shape week 1 only. A value that the user typed wins over the history (see `planOptions` in `src/plan/planState.js`).

Plan fields: `weeks[]` (each with `n`, `startIso`, `kind`, `phase`, `cutback`, `targetKm`, `km`, `trainingKm`, `check`, `days[7]`), `races`, `warnings`, `conflicts` (gym clashes with a reason and a suggestion), `changesFromRules` (what the engine changed, with the reason and the dates), `gymAdvice` (`normal` | `maintenance` | `skip-heavy`, with a reason), `peakKm`, `limits`, `safety`.

A workout has `iso`, `type`, `title`, `intensity`, `km`, `min`, `steps`, `why`, `effortText`, `showPace`, `gym`, `extra`, `adjusted`.

Other plan functions: `todayWorkout(plan, iso)`, `weekOf(plan, iso)`, `allDays(plan)`, `extendPlan(plan)` (adds one block to a plan with no date), `reconcile(plan)` (recomputes stats and checks), `safetyChecks(plan)`.

### Rules that the engine keeps

1. Week 1 is at most the current weekly distance + 10% (a small starter floor of 3 km a run day, at most 9 km, applies only below that, with a warning). `week1Limit()` gives the limit, and the safety check uses the same function with `plan.settings`.
   - New run days: when the plan has more run days than `runsPerWeek`, each new day starts as a short easy run (about 25 minutes at easy pace, 3 to 5 km, `newRunKmFor(paces)`). The usual runs keep their distance. Week 1 has no hard session. The week 1 limit is then the larger of current + 10% and current + the new short runs, but never more than current + 25% and never more than `peakWeekKm`.
   - Long run: week 1 starts at about `usualLongRunKm` (not less), inside the caps: 3 hours or less, the goal cap, 32 km or less, `longestRecentKm` + 10%, and a safe share of the week. The long run stays the longest run of the week. `changesFromRules` gives the reason, also when a cap makes it shorter.
2. Each week grows by 10% or less against the last normal week. A week that an event changed (`disrupted`) counts at its planned distance and must not grow. A changed week 1 has no normal week before it, so its limit is the week 1 limit (rule 1). Every 4th week is a cutback week. The taper follows the target. The peak is the largest normal training week. A week that is much larger than its 10% limit (for example after a race lowered the week before) is planned again at the limit. Cuts to fit a limit shrink the easy runs and the long run by the same share.
3. No two hard days touch, also across week ends. No hard day before the long run. At most 1 hard session a week for new runners, 2 for others. Races count as hard sessions.
4. The long run is the longest run of the week, about one third of the week or less (more with 2 or 3 run days), and 3 hours or less.
5. About 80% of running time is easy. Hard time is time at marathon pace or faster.
6. Runners with 2 or fewer run days, or new runners, get 3 easy weeks first.
7. Run/walk goes up the ladder 60/90, 90/90, 120/60, 180/60, 300/60, 480/60, 600/30 seconds, then 20 to 30 minutes without a stop.
8. Heavy legs, lower or full-body days count as hard days. No heavy legs within 48 hours before a quality run or 72 hours before a long run or a race. The engine plans runs around fixed gym days. When this is not possible, it adds a `conflicts` entry.
9. Lifting is maintenance in the last 10 days before an A race. There is no heavy lifting in race week.
10. A race more than 30 weeks away gets a base block first. The engine never drops a race.
11. A race: full taper. B race: 3-day mini taper and 2 to 4 easy days after. C race: it replaces a quality session. A recovery block follows the goal race.
12. Quality sessions rotate from week to week.

`safety` is computed again from the real days. A check is never "Pass" when the plan breaks its rule.

## Hybrid week (V2.1)

The code is in `src/run/engine/week.js`. The rules come from `docs/research/concurrent-training.md`. Tests: `test/week.test.mjs`.

### `planWeek(input)`

Input: `{use: 'run'|'lift'|'both', availableDays: [0..6], runDays: n, liftDays: n, priority: 'run'|'lift'|'equal', doubles: bool, runLevel: 'new'|'some'|'experienced', liftLevel: 'beginner'|'intermediate'|'advanced', longRunDay?: 0..6}`.

- For `use: 'run'` the engine ignores `liftDays` and uses priority `run`. For `use: 'lift'` it ignores `runDays` and uses priority `lift`.
- Defaults: `use` both, priority equal, `runLevel` some, `liftLevel` intermediate, `doubles` false.

Output: `{runDays, longRunDay, gymDays: [{day, type, intensity, note}], doubles: [{day, first, gapHours: 6}], restDays, split, reasons, warnings}`.

- Day lists are in week order (Monday first). `longRunDay` is `null` when there are no runs. `split` is `null` when there are no lift days.
- `gymDays` go to `buildPlan` with no change. `type` is `upper`, `lower` or `full`. `note` is empty, or it tells how to do a shared day or why a leg session is light.
- `doubles` lists each day with a run and a lift. `first` is the priority side (`run` for equal priority). Wait 6 hours or more between the two sessions.
- `reasons`: one STE sentence (or two short ones) for each rule that the week uses. `warnings`: caps and reductions.

How it works:

1. Caps. New runners: 5 runs or fewer. Lift days: 4 or fewer, and 4 only with lifting priority (else 3). Each cap gives a warning.
2. Rest days. At least 1 rest day, 2 for beginners (`runLevel: 'new'` when the user runs, or `liftLevel: 'beginner'` when the user lifts). Unavailable days are always rest days. So the training days are at most `min(available days, 7 - minimum rest days)`.
3. Long run first. The preferred `longRunDay` when it is available, else Sunday, else Saturday, else the last available day of the week.
4. Search. The engine tests every layout of the other runs and the lift days on the available days and keeps the valid layout with the lowest cost.
   - Hard rules (a layout that breaks one is not valid):
     - No lift on the long-run day.
     - Heavy legs (lower or full body, heavy) are not on the day after the long run or on the 2 days before it (72 hours).
     - Heavy leg days do not touch.
     - Room for a hard run: with 2 or more runs, one run day 2 or more days from the long run has no heavy legs on that day, the day before or the day after. This is the same test that `buildPlan` uses to choose quality days. (When no run day is 2 or more days from the long run, there is no room. The cost is then high.)
     - A run and a lift share a day only on a day that is not the long-run day. With `doubles: false`, only an easy run and upper body share a day, and only when the sessions are more than the training days.
   - Costs (lower is better): a shared day, a leg session that must be light (only when no heavy place is valid), no room for a second hard run (4 or more runs, not a new runner), run days or lift days next to each other, more than 3 training days in a row.
5. Reductions. When no layout is valid, the lower-priority side loses one session and the search runs again. Run priority: lifting goes down to 1, then running. Lift priority: running goes down to 1, then lifting. Equal: one session from each side in turn, lifting first. A side that the user chose never goes below 1. Each reduction gives a warning, for example "Too many sessions for your days. We reduced lifting to 2."
   - Only 1 available day for both sides: with doubles, the run and a light full-body lift share the day. With no doubles, the lower-priority side (lifting for equal) goes to 0, with a warning.
6. Split: 1 or 2 lift days: full body. 3: upper, lower, upper. 4: upper, lower, upper, lower.
7. Intensity: lower and full body are heavy (light only when no heavy place is valid, with a reason). Upper body is light for run priority, heavy for the other priorities.

The plan engine then builds the plan with `buildPlan({runDays, longRunDay, gymDays, ...})`, as before. The tests build a plan from each different week and check that every safety check passes, that `buildPlan` does not move the long run or make a gym day light, and that a quality day is still possible.

### `recommendWeek({use, runLevel, liftLevel, priority})`

Default counts from the "Starting weeks" table. Returns `{use, runDays, liftDays, priority, split, doublesAllowed, minRestDays, trainingDays: {min, max}, restDays: {min, max}, reasons}`.

- Run only: 3 runs (new, run/walk), 4 (some), 5 (experienced).
- Lift only: 2 lift days (beginner), 3 (intermediate), 4 (advanced).
- Both: runs 3 (new, some) or 4 (experienced), plus 1 with run priority (not for new runners). Lift days 1 (beginner) or 2, or 2 / 3 / 4 with lift priority. The total fits the training days of the lower level band (beginner 5, intermediate 6, advanced 6). The lower-priority side gives first, down to 3 runs or 2 lift days (1 for beginners).
- `doublesAllowed` is true only for an experienced runner who is an advanced lifter. It is information only: the default answer to "Can you train twice on one day?" stays no.
- The counts always fit `planWeek` with all 7 days available, with no warning.

## Adaptation

`adapt(plan, event, {today})` never changes the input plan. It returns `{plan, changes, questions, needsAnswers, message, offers?, refused?, reason?, followUps?}`.

| Event | Notes |
|---|---|
| `{type:'missed', iso}` | Easy runs are not made up. A key session moves to a safe day in the next 4 days, or it is dropped. |
| `{type:'illness', answers:{where, fever}}` | Without answers: `needsAnswers` and `questions`. No change. |
| `{type:'injury', answers:{area, pain, limping, worseNextMorning}}` | Severe: 2 weeks with no running (rest days stay rest days), then a return ladder. Follow-up questions for 7 days. |
| `{type:'holiday', fromIso, toIso, canRun}` | Easy runs or rest. A gentle return week. |
| `{type:'break', answers:{days, cause}}` | 4 days or less: no change. Up to 28 days: easier weeks. More: a new plan from the current level. |
| `{type:'readiness', score}`, `{type:'feedback', kind:'tooHard'\|'tooEasy'}`, `{type:'result', distKm, timeSec}` | Today or paces change. A score can go up by 3 or less. |
| `{type:'legHeavyDay', iso, apply?}` | Offers a swap (or an easy run) with the reason. `apply: true` makes the change. |
| `{type:'move', fromIso, toIso}` | Any week. Refused with the reason when a safety rule fails. |
| `{type:'drop', iso}`, `{type:'repeatWeek', weekN}` | Drop a session. Repeat a week (later weeks move back by one week). |
| `{type:'unplannedSession', kind:'run'\|'lift', date, intensity:'easy'\|'hard'\|'long', areas:['legs'\|'upper'\|'full'], minutes, km?}` | A session that was not in the plan (V2.1). See below. |
| `{type:'tired'}` | "I feel really tired". Today's hard run or long run becomes a short easy run, and a heavy lift becomes light. The next day stays easy in the same way. A race does not change. |

`illness`, `injury` and `readiness` also act on gym days (V2.1):

- Illness: fever or symptoms below the neck: gym days in the rest period (3 days or more) are `rest`. Symptoms above the neck: heavy gym days are light. The 4 days after: heavy gym days are light.
- Injury, severe: for 2 weeks, leg and full-body days are `rest`, and heavy upper-body days are light (pain-free only). Mild: heavy leg days in the next 5 days are light. The message always says to see a physio or doctor.
- Readiness: below 40, a heavy gym day today is light. Below 60, it is `maintenance`.

Gym days on plan days: `day.gym = {day, type, intensity, note, heavyLegs, advice, reason}`. `advice` is `normal`, `maintenance`, `skip-heavy` (lift light) or `rest` (V2.1: no gym session today). `rest` also sets `intensity: 'light'`, `heavyLegs: false` and keeps the planned value in `plannedIntensity`. Advice only goes up. A gym day with `gymDone` does not change. Each gym change is in `changes` as `{iso, before, after, reason, kind: 'gym'}`, for example "Lower body (heavy)" to "Lower body (light)". `plan.gymAdvice` shows the same advice.

`unplannedSession` rules. "Within 48 hours" means the same day or the next day, as in the safety checks. Past days and done sessions do not change.

- The plan day records the session in `day.unplanned` (`[{kind, intensity, areas, minutes, km}]`). It does not add a workout, so the week distance and the safety checks stay as they were.
- Heavy legs or full body (lift, `intensity` not `easy`): a hard run on the same day or the next day, and a long run in the next 2 days, move to a safe day (2 or more days later for a hard run, 3 for a long run; a long run stays in its week), or become easy. A planned heavy leg session on the same day or the next day becomes light. A race does not change: the message tells the user.
- Light legs: no run change. A planned heavy leg session within 48 hours becomes light.
- Upper body (also full body): no run change. A planned heavy upper-body session within 48 hours becomes light.
- A lift also writes a done gym session on the day (`gym.unplanned: true`, `gymDone`), but only when this keeps every safety check. So later moves respect it.
- Hard or long run: a hard run on the same day or the next day becomes easy. A long run there moves to a safe day or becomes easy. A heavy leg day on the same day or the next day becomes light.
- Easy run: the week counts it (`km`, or `minutes` at easy pace). When the week, with all its unplanned runs, is still at or under `targetKm`, nothing changes. Else the next easy run in the next 2 days gets shorter by the extra distance, but not below 3 km or 20 minutes. The engine uses the shortest distance that keeps every safety check and changes no other day.

`plan.activeLadder` exists only on the plan that needs it. It ends on its end date. `buildPlan` never copies it.

Also: `suggestDays(plan, iso, {today})` (safe days before the tap), `checkMove(plan, from, to, today)`, `afterRace(plan, result)` (recovery block and "What next?" options), `goalGap(plan, score)`, `timeTrialDue(plan, today)`, `returnLadder(days, cause)`.

## History, load and streak

- `seedFromHistory(activities, today)`: best effort from the last 12 weeks (races and time trials first; no workouts, short reps or GPS faults), the 4-week and 12-week average distance (`avg4WeeksKm`, `avg12WeeksKm`), `peak12WeeksKm`, past peak weeks, `longestRecentKm`, and `runsUsed`.
  - `currentWeeklyKm`: the 4-week average. When one low or empty week (for example a holiday) pulls it below the 12-week average, the value is the middle value of the last 6 weeks with a run, but not more than the 12-week average or 1.1 x the best of the last 4 weeks. When 3 or more of the last 4 weeks are nearly empty (a real break), the 4-week average stays. `weeklyKmSource` (`last4` | `steady` | `break`) and `weeklyKmNote` say which value and why.
  - `runsPerWeek`: the middle value of the runs a week in the last 6 weeks with a run. `usualLongRunKm`: the middle value of each of those weeks' longest run.
- `sessionLoad(a)` = RPE x minutes. RPE comes from `a.rpe`, else from heart rate (`avgHR`, `maxHR`, `restHR`), else from the session type. `sessionRpe(a)` gives the source.
- `loadSeries(activities, days, today)`: `[{iso, load, fitness (42 days), fatigue (7 days), form}]`.
- `easyHardSplit(activities, hr)`: easy and hard minutes, with `method` (`hr-zones`, `hr-average`, `session-type` or `mixed`).
- `weekStreak(activities, today)`: `{weeks, thisWeekDone}`. Rest days never break it.

## Other

- `STRENGTH`, `DRILLS`, `CYCLE`: libraries (each exercise has a "how" text).
- `audioCues(workout, units)`: voice cues. Beginners hear effort words.
- `simulateRun(workout, {paceSec, units, treadmill})`: demo only. Walk steps use walking pace. Treadmill mode gives speed cues.
- `loopRoute(km, seed)`, `toICS(plan)`, `toGPX(run)`, `toCSV(activities)`, `toWorkoutJSON(workout)` (paces in whole seconds).
- `coachAnswer(question, {plan, today, units})`: on-device rules. It uses the real plan dates.
- `sample(today)`: sample data for the demo only. Every object has `sample: true`.
