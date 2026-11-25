# Persona 6: advanced runner, one year of heavy use

## 1. Persona in one paragraph

I am Sam, 38. I have used Skid Marks daily for a year. I race 10 to 14 times a year. Each season has one A race and three or four B races. I run 6 days a week, 60 to 85 km. I use a Garmin, a chest strap and sometimes a foot pod. I lift once or twice a week: squat, RDL, step-ups, calves, plyos. My fitness score is about 52. I want a season planner that knows all my races, recovery that aims at the next race, a gym side that backs off near races, and analytics I can trust after 400 activities.

## 2. Fit scores

| App | Score | Reason |
|---|---|---|
| A "Coach" | 5/10 | Clear "why" text. But it plans for one race only and its charts cover 84 days. |
| B "Logbook" | 6/10 | The season chart with B-race flags matches how I think. The flags do not change the plan. |
| C "Track" | 3/10 | My Garmin records my runs, so the big GO button is no use to me. Analytics are hidden under "Me". |
| Iron Log (Lift) | 5/10 | Fast logging, 1RM charts, and a muscle map that counts runs. Bodybuilding presets only. |

## 3. What works

- **Engine.** Every change has a reason ("New result 38:30 for 10 km"). B's Week view shows "Safety rules 4 of 4 pass". The marathon taper (80/65/45%) is sound. Strength never sits the day before a hard day.
- **A.** The Today card shows the next run on rest days, with a step bar and paces.
- **B.** The Season chart puts "Before the plan" history next to planned weeks, with cutback and B-race markers. Analysis has fitness/fatigue/form, weekly distance, an 80/20 split for the last 8 and next 4 weeks, and a filterable history.
- **Iron Log.** Logging is quick. RIR and 1RM tracking suit a runner who lifts heavy. A run logged in "Cardio & Activity" turns the quads, calves and hamstrings red on the map. That is the right seed for a shared load model.

## 4. What fails or is missing

**B-races are labels, not training.** In the sample plan, week 7 holds the "Winter 10K" on Sun 10 Jan. The same Sunday still has "Long run, steady finish 14.4 km". Thursday has VO2 max intervals. Friday has a 15.3 km easy run plus "Add 20 min strength". A only adds the line "Run it as a hard session". Another note says "It replaces a hard day this week", but no day changes. There is no mini-taper, no recovery after the race, and no "race it or train through it" choice.

**The plan stops at the goal race.** After race day come a few rest days, then nothing. There is no recovery block and no link to the next A race. A plan can be 30 weeks at most, so a full year does not fit.

**The gym does not back off.** Race week in the sample half plan still says "Add 20 min strength after this run" on Thursday, 3 days before the race. Every strength day is the same 25-minute "core" session. The engine cannot tell heavy squats from mobility.

**The weeks repeat.** In my 22-week experienced marathon plan, weeks 5-7, 9-11, 13-15 and 17-19 are copies. The engine says the peak is 85 km, but no week goes above 77.6 km. Monday has a 14.6 km "Easy + strides" right after a 27 km long run. In the sample plan, a Friday easy run (15.3 km) is longer than the Sunday long run (14.4 km).

**The analytics disagree.** On the same sample data, A says "fitness 39, 75% easy, based on heart rate". B says "fitness 40, 92 / 8, an estimate from session types". The windows also differ: C uses 70 days, A 84 and B 90. Iron Log adds a fourth number, the acute:chronic ratio. After a year I would stop trusting all of them.

**Data volume.** Import takes one .fit/.gpx/.tcx file at a time. There is no bulk or Garmin-archive import. Export gives runs as CSV, the last route as GPX, an .ics file and a JSON backup. There is no FIT/TCX export per run. B's history list ends at "Show all 39". I will have 400.

**Coach chat.** "How should I recover after my race?" and "I have a 10K B race in 3 weeks" both got the generic "I am the on-device coach" reply. "Should I skip the gym before my race?" got the standard two-sessions-a-week text.

**Race list.** No A/B/C priority, goal time, result or elevation. No 15K, 10 mile or 30K trail.

**Iron Log as Lift.** Its presets are PPL, Upper/Lower, Bro split, Arnold and Project Arms. There is no runner strength preset. Programmes rotate in order and are not tied to calendar days, so they cannot line up with the run week. The tour has 20 steps.

## 5. Long-term grievances and wishes

1. **"I enter every race twice."** I add it in Races, then type the result again in Zones. The imported watch file should become the result.
2. **"Every new goal starts from zero."** "Set as goal" rebuilds the plan. My last block counts only as a starting km figure. I want a season chain: A race, recovery, rebuild, next A race.
3. **"Recovery is a guess."** Scale the reverse taper to race distance and effort. A 5K needs 1 to 2 easy days, not a week of rest.
4. **"Peaking is a black box."** Show my predicted form on race morning. Let me preview a different taper length.
5. **"The gym fights the run plan."** A heavy leg day in Lift does not move Thursday's intervals. Use one shared calendar. Keep heavy legs 48 h from quality runs and 72 h from the long run. Switch to maintenance in the last 10 days before an A race, and rebuild in steps after it.
6. **"The charts stop at 12 weeks."** I want 1-year views, block comparison and pace at fixed HR.
7. **"Daily busywork."** The readiness check-in asks six questions. My watch already knows my sleep and resting HR. Prefill them and let me confirm with one tap.
8. **"Undo is shallow."** I want a dated plan history with reasons.
9. **"Big history gets slow."** Lists render every row. Add paging and search ("long runs over 25 km").

## 6. Top 10 recommendations for V1

1. **Multi-race season model.** Give each race an A/B/C priority. A B-race gets an automatic 2-to-4-day mini-taper and recovery. A C-race replaces a quality session. Every change shows its reason.
2. **Post-race recovery block.** Scale easy days to distance and effort, then rejoin the plan or chain to the next A race.
3. **Race-aware strength rules.** No heavy legs within 48 h of quality or 72 h of a long run or race. Maintenance only in the final 10 days. No strength in race week.
4. **One load model for Run and Lift.** Use one fitness/fatigue/form engine. Count easy and hard from time in HR zones when HR exists. Drop the separate acute:chronic number.
5. **Bulk import and full export.** Import many files or a zip. Export FIT/TCX/GPX/CSV for every run and CSV for every lift set.
6. **Race result capture.** Link an imported activity to a race entry. Offer the fitness-score update on the same screen.
7. **Better plan weeks.** Vary sessions from week to week. Actually reach the stated peak. Fix an easy run longer than the long run, and a long Monday after the long run.
8. **Year-scale analytics.** 1-year and all-time ranges, block comparison, a pace-at-HR trend, and paging.
9. **Runner strength preset in Lift.** 1 to 2 days a week, placed on calendar days by the Plan. Heavier in Base, lighter in Peak, maintenance in Taper.
10. **Coach chat answers recovery, B-race and gym-before-race questions** from my real dates. Add a plan version history.

## 7. Design verdict

Use **B "Logbook"** as the base for Plan and Analysis. Its Season chart is the right home for a multi-race athlete, and it scales to desktop. Make its B-race flags change the bars. Take **A's** Today card, its "why" text and its "What changed and why" list for daily use. Use **C** only as the in-run screen for treadmill or phone-recorded runs. From **Iron Log**, keep quick set logging, 1RM charts and the muscle-readiness map, and let runs and races drive the map. Replace its bodybuilding-first programme picker with a runner preset on the shared calendar. Cut the tour to three cards.
