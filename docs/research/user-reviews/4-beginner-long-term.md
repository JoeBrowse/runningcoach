# Persona 4: beginner, long-term user (4 months in)

## 1. Persona in one paragraph

I am Sam, 38. Four months ago I could not run for two minutes. I did the run/walk plan. Last Sunday I finished my first 5K (parkrun, 33:40). I want to continue, but I do not know what comes next: a faster 5K or a 10K in spring. I run three mornings a week before work. I go to the gym once a week for 45 minutes, with some squats. Android phone, cheap fitness band (sleep and heart rate go to Health Connect). A cold took most of week 9. My left calf has been tight since week 12. My motivation drops on dark, wet mornings.

## 2. Fit scores

| App | Score | Reason |
|---|---|---|
| A "Coach" | 6/10 | Friendliest daily screen. Best explanations. No plan for life after the race. |
| B "Logbook" | 5/10 | Only design that shows my months before the plan. Too many numbers for daily use. |
| C "Track" | 6/10 | Best "just go" screen. "Too hard or too easy" is easy to find. Feels thin after month 2. |
| Iron Log (Lift) | 4/10 | Good muscle map and cardio logging. Bodybuilding presets. Day streak punishes rest days. |

## 3. What works

**A**: On a rest day, Today shows "Next run · Thu 26 Nov · Hill repeats". "I'm back after a break" (10 days, "Life got busy") eased four sessions, each with a reason ("Back after 10 days off. Distance at 75%") and a return ladder. "Something hurts" asks the area, pain 0 to 10 and "Do you limp?", and says to see a physio.

**B**: The Season chart shows grey "Before the plan" bars. After four months, my history is my pride. The Week screen gives pace and time per run, with "Too hard / Too easy" below.

**C**: The red Today screen with the big GO button suits a cold morning. "Something changed" item 6, "Sessions feel too hard or too easy", matters because I get fitter every month. "Add 20 min strength after this run" is a good nudge.

**Iron Log**: Cardio & Activity logs a run with distance and RPE, and a run marks quads, calves and hamstrings on the muscle map. This is the base for "no heavy legs before a long run". Simple mode suits me.

## 4. What fails or is missing

**All three prototypes (shared engine)**
- **Nothing happens after race day.** The plan stops after race week. No screen asks "How did it go?" or "What next?" In A, when no week matches the date, the screen falls back to week 1, so I could see "Week 1 · Base" again.
- **No goal without a race.** Every goal needs a race date. "Get faster at 5K" or "Keep fit over winter" does not exist. That is my situation now.
- **The wizard defaults to "Half marathon".** Wrong and scary after a first 5K.
- **A new plan failed its own safety checks.** My 3-day 10K plan showed two red crosses on "Your plan is ready": "Weekly distance grows by 10% or less: Check this" and "Long run is a safe share of the week: Check this". There was no fix button.
- **Targets do not match the plan.** Weeks 5 to 7 say "target 42 km" but plan 28.4 km. The cutback week (34.6 km) and the taper week (33.3 km) are longer than the peak weeks.
- **Seeding used a training run as my best effort** ("Threshold run, 8 km in 39:00"). It ignored my 5K race.
- **Strength ignores my gym day.** The plan added "Strength and mobility" on Monday and Friday. It does not know I lift legs on Wednesday.
- **"Gym" cross-training is only minutes and effort.** "Add to today" cannot log yesterday. No muscles.
- **The coach asks after it acts.** After the break it lists "Why did you stop? Did you do any other exercise? Any pain now?" The answers go nowhere. My gym log could answer the second one.
- **No reminders** anywhere.

**A**: "Too hard / too easy" is hidden in Zones. The More menu has 14 items; I use four.
**B**: "Form -9" still means nothing to me for Saturday's run. It is a desktop layout on a phone.
**C**: The Me tab is 15 rows, with Progress buried. The GO screen is the same every day; by month 3 it feels like a timer, not a coach.
**Iron Log**: Presets are Push Pull Legs, Bro Split, Arnold Split, Project Arms. Nothing for "once a week, for runners". "Full Body B" puts squat and deadlift together. The "DAY STREAK" counts days in a row, while the run side counts "11 weeks in a row" and says rest builds fitness.

## 5. Long-term grievances and wishes

1. **The app forgets me at the finish line.** My first 5K was the best day in four months. No "Well done", no PB card, no "What next?". I had to rerun the wizard, tick the disclaimer again and re-enter heart-rate values.
2. **Paces go stale.** I get faster each month. Paces change only after a race entry or a hidden "Too easy". I want: "Your easy runs look easier. Update paces?"
3. **Repetition.** Easy, long, one hard session, every week. I want safe variety: fartlek, parkrun as a workout, trail, a run with a friend.
4. **Badges run out.** Six badges, the easy ones gone in month 1. I want new milestones: first 30 minutes non-stop, first 10 km, 100 runs, a 5K PB.
5. **Missed weeks feel like failure.** After the cold I wanted a calm "Welcome back, here is your week", and a choice: move the race or keep it with a smaller goal.
6. **No niggle follow-up.** I entered "Calf, 3/10" once. Nobody asked again. I want "Calf today?" each morning for a week.
7. **Two apps, two truths.** Lift says my legs are red. Run says I am fresh. I want one week with run days and gym day together, and one load.
8. **The band is ignored.** My sleep and resting HR are in Health Connect, but the check-in asks me to type them. After 120 mornings I stopped.
9. **Dark mornings.** I want one reminder the night before ("Tomorrow: 30 min easy"), easy to turn off.

## 6. Top 10 recommendations for V1

1. **Add a "Race done" flow**: ask the result and feel, show a PB card, give 1 to 2 recovery weeks, then offer "What next?" with three choices.
2. **Add goals without a race date** ("Get faster at 5K", "Build to 10K", "Keep fit") as rolling 4-week blocks with a cutback.
3. **Never show a red safety check on a new plan.** Fix target, cutback and taper volumes in the engine. If a rule fails, change the plan and explain.
4. **Make Plan the master week.** Ask for the gym day. Never put leg work the day before the long run or a hard run.
5. **One shared load and one week-based streak** that Lift and Run both feed. Rest days never break it.
6. **Suggest pace updates automatically** from easy-run heart rate and parkrun times, with a reason and an Accept button.
7. **Follow up niggles daily for 7 days.** Step the plan back up only when pain stays at 3/10 or less.
8. **Read sleep and resting HR from Health Connect.** Cut the check-in to one question when data exists.
9. **Add a night-before reminder** with quiet hours and one off switch.
10. **Add milestones over time and safe variety sessions** in "Keep fit" blocks.

## 7. Design verdict

- **Daily screen**: C's Today with the big GO button, plus A's "Next run" card and A's "Something changed" list below. Keep "too hard or too easy" in that list.
- **Life events**: Keep A's "What changed and why" sheet and return ladder. Ask the questions before the change.
- **Progress**: Take B's season chart with "Before the plan", and show all past plans in a row (run/walk, 5K, next). Keep B's density off daily screens.
- **Menus**: Cut A's More (14) and C's Me (15) to about six items. Hide fuel, routes and 50K for beginners.
- **From Iron Log**: Keep Simple/Advanced modes, the muscle map, the cardio-to-muscle rules and the JSON backup. Add a "runner strength, once a week" preset. Replace the day streak with a week streak. Feed every recorded run into the map automatically.
