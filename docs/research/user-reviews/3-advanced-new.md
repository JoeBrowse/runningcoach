# Persona 3: advanced runner, new user

## 1. Persona in one paragraph

I am 38. I run 6 days a week, 55 to 80 km. I have run 7 marathons (best 3:12). I use a Garmin Forerunner and Strava, with 9 years of history. I paid for Runna and TrainingPeaks Premium. I am tired of paying. I lift 1 or 2 times a week (squats, split squats, deadlifts, calves, core). My next goal is a spring marathon in 22 weeks. I use an Android phone. I want my history in with little effort, my real fitness on day 1, and no reset.

## 2. Fit scores

| App | Score | Reason |
|---|---|---|
| A "Coach" | 6/10 | Clear Today screen and reasons. The seed step cannot be edited. Data hides under More. |
| B "Logbook" | 7/10 | Season chart, load column and dense history suit me. Seed weekly distance is editable. |
| C "Track" | 4/10 | GO-first design is for beginners. Analysis is two taps deep. |
| Lift (gym tracker) | 5/10 | Good lift log and honest load gauge. Runs need manual entry. No runner strength plan. |

## 3. What works

**Engine:** The 10% cap, cutback weeks and reasons are good. If my volume is above the table peak, the plan holds my volume (half plan at 80 km: peak 80). A race result updates paces with a +3 cap and a reason. Paces from 3:12 look right (threshold 4:17/km, marathon 4:33/km).

**A:** The Today card shows the workout shape and paces. The wizard says "36 runs found on this phone" and names the best run it used. Safety checks show on "Your plan is ready". Zones offer Karvonen, LTHR and max HR.

**B:** "Half marathon season" with weekly bars, phases and B-races is the best overview. Analysis has a load value per run, fitness/fatigue/form, the 80/20 split (done and planned) and PRs. The week view refuses a bad move with an exact reason: "Hill repeats on Sat 28 Nov would touch Long run on Sun 29 Nov." Intervals.icu says "Paste your API key to sync activities."

**C:** The step bar on the GO screen reads well from a distance.

**Lift:** Cardio & Activity already feeds runs into the muscle readiness map. The load gauge says "information only. It cannot predict injury." The JSON backup is plain.

## 4. What fails or is missing

**Import (all three, my main failure):**
- One file at a time. My Strava export is a ZIP of about 2,000 files, many `.fit.gz`. The picker takes `.gpx,.fit,.tcx` only.
- FIT and TCX are fake: "Imported tempo.fit: 1 run (simulated in this prototype)." Garmin gives me FIT.
- GPX import ignores the file date, name and HR. My 22 Nov run landed today as "Imported run", type easy. In B it added 8.5 km to this week's "Done 14.6 km". Years of files would wreck the load chart.
- No duplicate check across Strava, Garmin and Health Connect.
- Connections are bare toggles. No screen says what came in or what failed.

**Seeding:**
- The seed score uses the best run of all time, with no date window. An old fast run or a GPS glitch sets paces too fast. PRs are not used.
- Weekly distance uses the last 4 weeks only. A holiday week cuts my start volume. A does not let me edit it.
- Peak volume comes from a table (marathon, experienced: 85 km), not from my past peak weeks.

**Plan engine at my level:**
- **Safety bug.** At 5 or 6 run days, the quality session lands on Monday, the day after the Sunday long run. My 22-week test plan had 15 such pairs. All four safety checks still say "Pass". The wizard says "Two hard days never touch." The check resets each week.
- **Strength conflict.** At 6 days, "Add 20 min strength after this run" lands the day before intervals in 15 weeks. This breaks the engine's own rule.
- Long runs top out at 27.2 km. I want 32 to 35 km. Marathon-pace work is thin (5.4 km in "Goal race pace").
- Peak volume arrives in week 5 and stays flat for 15 weeks. Planned weeks fall under target (85 target, 75.6 planned).
- I cannot pick hard days or move across weeks. B moves one day per tap.
- The builder has time reps only. No 6 x 1 km, pace ranges, saved library, or "put this in my plan".
- "Send to watch" shows JSON with raw paces ("392.037"). It does not explain how a FIT file reaches a Garmin.

**Trust:** A shows 77% easy and form -14. B shows 92% easy and form -9 for the same data.

**Run + gym:** Lift load is RPE x minutes. The run engine uses RPE x minutes / 10, or TRIMP. The scales differ by about 10x, so "one shared load" is not real yet. Lift makes me type each run by hand. It has Push/Pull/Legs and Bro Split, but no runner programme.

## 5. What I predict will annoy me in month 2

- Half my old runs carry the wrong date. I stop trusting the fitness chart and go back to Intervals.icu.
- Monday hard sessions after long Sundays leave me flat. I move them by hand each week, one tap per day.
- The same week pattern repeats for 15 weeks.
- I log gym days in Lift and again in Run. Neither side sees the real load.
- Each Garmin run needs a manual export. Without auto sync, I quit by week 6.
- Charts show about 12 weeks. I want the season and year-on-year.

## 6. Top 10 recommendations for V1

1. **Fix the safety bug.** Check hard/long adjacency across week boundaries and for strength notes. Make `safetyChecks` test the whole plan.
2. **Real bulk import.** Accept ZIP (Strava and Garmin exports), `.fit.gz` and many files. Parse FIT. Keep date, sport, HR, laps and name. Show a summary.
3. **Duplicate detection** on start time plus distance across all sources.
4. **Intervals.icu as the live link** with the user's API key. Pull activities, HRV, resting HR and sleep. Garmin syncs to Intervals.icu, so this avoids the closed Garmin program.
5. **History-based seeding.** Use best efforts from the last 6 to 12 weeks and PRs. Set start volume, peak and long-run cap from the 8 to 12 week average and past peaks. Show the runs used. Let me edit all values.
6. **Advanced plan controls.** Pick run, hard and rest days. Long-run cap up to 35 km. Longer MP blocks. Drag across weeks.
7. **Better builder and watch push.** Distance reps, pace ranges, saved library, insert into the plan, send a whole week, clear Garmin FIT steps.
8. **One load model for Run and Lift.** Same unit. Plan mode keeps heavy legs 36 to 48 hours from quality runs and the long run.
9. **Consistent, long-range analysis.** One method for 80/20 and form. Multi-year season view.
10. **Runner strength in Lift.** A "Runner: legs and core" programme. Imported runs feed the readiness map automatically.

**Best realistic import path (within the CLAUDE.md limits):**
1. Setup: the user's own **Strava bulk export** and **Garmin account export** files. The user owns these files. This is not the Strava API. Still, never send Strava-origin data to an AI.
2. Ongoing: **Intervals.icu API key** (Garmin to Intervals.icu to app). Intervals.icu may block API access to Strava-sourced activities. Verify this. Garmin-sourced activities are the safe route.
3. Ongoing: **Health Connect** and **HealthKit**. Verify what Garmin Connect writes to Health Connect.
4. Last: the Strava API, optional (paid developer tier from June 2026, owner-only display, no AI). Do not use the Garmin developer program or unofficial Garmin libraries.

## 7. Design verdict

- **B for the data side:** season chart, Analysis, history with load, week view with reasons and undo. Add a wide layout for tablet and desktop.
- **A for the daily screen:** the Today card, the "why", and the wizard with visible safety checks. Make "Bring your history" step 1 of the wizard. Move Data out of More.
- **C for the in-run screen only:** GO and the big step bar.
- **From Lift:** keep the readiness map (it already counts runs), the honest gauge text, Advanced mode and JSON backup. Replace the manual cardio form with imported runs. Merge the load model first.
