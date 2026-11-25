# Run plan engine (V1)

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
- `gymDays`: `[{day, type: 'upper'|'lower'|'full'|'legs'|'other', intensity: 'heavy'|'light', note}]`.
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
2. Each week grows by 10% or less against the last normal week. Every 4th week is a cutback week. The taper follows the target. The peak is the largest normal training week. A week that is much larger than its 10% limit (for example after a race lowered the week before) is planned again at the limit. Cuts to fit a limit shrink the easy runs and the long run by the same share.
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
