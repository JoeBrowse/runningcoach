# Persona 1: beginner, new user

## 1. Persona in one paragraph

I am Sam, 34, and I have never run regularly. I want to "maybe do a 5K one day", but I have no race and no date. I go to the gym once a week at most, and I do not know what to do there. I have a basic Android phone and no watch or heart-rate strap. I do not know RIR, RPE, zones, threshold, taper or VDOT. I have two kids and a job, so I have 25-30 minutes, 2-3 times a week. I fear two things: getting hurt and looking stupid. I open the app for the first time today (Wed 25 Nov). I want to know what I do today, how slowly I should go, and what I do at the gym.

## 2. Fit scores

| App | Score | One-line reason |
|---|---|---|
| A "Coach" | 6/10 | Calm Today screen, clear live run/walk screen and plain "why" notes. But it opens on Alex's half-marathon plan, and the beginner path is buried. |
| B "Logbook" | 3/10 | It opens on "Fitness score 41.5", "Form -8" and a 13-week bar chart. I do not understand any of it. Built for data people. |
| C "Track" | 6/10 | A big GO button and the best wizard defaults: choosing R/W sets "new", 3 days and run/walk for me. But "R/W", "8x 4:33" and the red wall look intense. |
| Lift (gym tracker) | 4/10 | A good Simple mode and good beginner tips in the code, but a 20-step tour, muscle jargon and a first workout of squat, pull-ups and dips with blank boxes. |

## 3. What works

**A (Coach)**
- The Today card says "Rest day. No run today", then shows the next run with a clear bar diagram. I always know what is next.
- The "Coach · Why this session" line is in plain words: "Fitness grows on rest days."
- The "Something changed?" buttons ("I feel ill", "Something hurts", "I'm back after a break") speak my language. They lower my fear of injury.
- In the wizard, "I am new" shows "Change goal to run/walk" when I choose a 5K. That is a kind nudge.
- The live run/walk screen is very good: a huge timer, "Brisk walk · 0:52 left in this step · Next: Run 1 min", a progress strip and a big Pause button. I could use this with sweaty hands.
- The post-run question says "How hard was it?", not "RPE".

**B (Logbook)**
- The wizard admits "No race? Choose a date for a time trial." It is the only one that thinks about people with no race (but "time trial" is jargon).
- It has the clearest safety list with ticks.

**C (Track)**
- When I tap "R/W" in the wizard, it sets "I am new", "New" and 3 days for me. That is the fewest decisions of the three (10 taps from Me to a plan).
- GO is impossible to miss. For a nervous first run, one obvious button is right.
- "Last change: New plan ... Undo" sits on the run screen, so I am not trapped.

**Lift**
- The "How much do you want on screen? Simple / Advanced" choice is excellent. It says "You do not lose data when you change it."
- The play button opens a video search for each exercise, so I can learn the movement.
- The code has good beginner tips ("Do 8-12 reps... Focus on form first... Rest 60-90 seconds"). I did not see them in Free mode.
- "Last time: no history yet" is honest.

## 4. What fails or is missing

**All three run prototypes (shared engine)**
- **The run/walk plan never gets me to run.** I checked the engine. Every session is "6 x Run 1 min, walk 1.5 min". Only the repeat count grows, up to 12 at week 7. After that it is identical for up to 9 more weeks. On race day I must run 5 km, but I have never run more than 1 minute without a break. The coach text says "Each week the run parts get a little longer". That is false. The engine has a `runWalk(level)` ladder (60/90 up to 10 min/30 s) that the plan does not use.
- **The safety checks pass when they should not.** Cutback weeks do not cut (week 4: target 7.7 km, planned 10.2 km). The taper week is the biggest week of the plan (16.3 km against a 9 km target). The plan still shows four green "Pass" ticks. B's result chart even shows the race week as the tallest bar. For an app that sells safety, this is the worst bug.
- **They ask for a race date I do not have.** It is required, with at least 3 weeks. B's default is 16 weeks away and A's is 9 weeks away.
- **Paces for a beginner.** "Run 1 min, 8:23 /km" (A), "6x 8:50" (C) and audio "target 8:23 per km". I do not know what a pace is. I need "slow enough to talk".
- **Predicted times scare me.** B shows "Predicted First 5K 30:38" and C shows "predicted time 32:26" before I have run one step.
- **Jargon.** Base/Build/Peak/Taper, B-race, Fitness score, Form -8, "Hard" legend, Threshold, Cutback.
- **Sample data leaks into my plan.** "B-race" flags appear in weeks 2 and 7 of my first-5K plan. C marks Tuesday's run/walk "Done" from Alex's history ("2.6 km done of 7.8 km"). A says "311.5 km logged". The change log says "Half marathon plan → First 5K".
- **The heart-rate step shows Alex's numbers** (188 / 52 / 171) in A, B and C. I will press Next and save someone else's heart rate. The live screen shows "Wrist HR 143" when I have no watch.
- **The experience question repeats** after I already said "I am new" (A step 2, B and C step 4). A defaults it to "Some".
- **My first day is a gym day.** Wednesday says "Start strength session", not a run. The plan gives strength twice a week (Mon and Wed). I asked for once a week or less. The only control is on/off.
- **The strength player is not usable.** "Dead bug, 3 x 10 each side" with a 60-second timer. There is no picture and no explanation. I do not know what a dead bug or a bird dog is.

**B only:** It opens on a dashboard of numbers. The "New plan" button is the only door for me, and its wizard shows a race-date picker before it knows who I am.

**C only:** "R/W", "21K" and "42K" labels and the all-red home screen feel like an athlete app. The "Me" tab holds 17 items in one list.

**Lift (gym tracker)**
- There are 20 tour steps, even in Simple mode. The tour preview shows "DROPSET", "SUPERSET" and "1RM SESSION", which Simple mode hides.
- To start a workout: Start workout → New programme / Free mode → Copy previous / 1RM session / Full body... → tap muscles called "Front Delts", "Side Delts" and "Hamstrings". It took 7 taps to see one exercise.
- My first workout was Squat, Pull-up (I cannot do one) and Dips (I cannot do one). There was no starting weight, no suggested reps and "COMPOUND" labels. The beginner tips did not appear.
- The smallest programme is "Full Body ... 3 times each week ... with heavy weights". There is no 1-day-a-week option.
- **No link to running.** Nothing stops a squat session the day before my run/walk. Lift has no idea I run.

## 5. What I predict will annoy me in month 2

- The same 1-minute run/walk, every time, for weeks, then a 5K I am not ready for. I will feel like a failure on race day, or I will quit at week 8.
- Missed days. Kids get sick. If "I missed a run" makes me do it again rather than move on, I will feel behind all the time.
- Two apps in one: a "Run" world with charts and a "Lift" world with muscle maps and a different look (A is light and warm, Lift is dark and orange). I will only open one.
- Morning "Check in" prompts I do not understand ("HRV change", "resting HR change"). I will ignore them, and then the readiness score is fake.
- Gym DOMS. One leg session gives me sore legs for three days. If the app still says "Run/walk today", I will either skip or hurt myself.
- Badges and streaks that break when life happens.
- Numbers I never asked for (fitness score, form, predictions) creeping onto every screen.

## 6. Top 10 recommendations for V1

1. **Fix the run/walk progression.** Use `runWalk(level)` so the run parts grow (1 → 1.5 → 2 → 3 → 5 → 8 min) until I can run 20-30 minutes non-stop. Add a "repeat this week" option.
2. **Make the safety checks honest.** Run/walk volume must follow cutback and taper targets. A check that fails must show "Fail", never a green tick.
3. **First open = a short "Who are you?" screen**, not Alex's sample plan. "I am new" should go to a 3-question beginner path (days, minutes, gym yes/no). No race date needed ("No date, just get me running").
4. **Use effort words, not paces, for beginners.** "Jog slowly enough to talk. Walk briskly." Hide pace targets in run/walk audio and plans until I ask.
5. **Remove sample data from real plans.** No Alex B-races, no history-based "Done", no prefilled heart-rate values (leave them empty and skip the step for phone-only users).
6. **Gym frequency control: 0, 1 or 2 per week.** Place the gym session at least 48 hours before the next run for new lifters, and say why.
7. **One beginner gym template in Lift**: 4-5 machine or dumbbell moves, 2 sets of 10, a "start light" weight hint, short form notes and a picture. Show the existing beginner tips. No pull-ups or dips for "new".
8. **Shared Plan week in plain words**: "Mon: walk-run 25 min · Thu: gym 30 min · Sat: walk-run". One list, one colour key, no Base/Peak/Taper.
9. **Hide jargon behind "Show more"**: fitness score, form, predictions, zones, cutback and B-race stay off beginner screens until 4+ weeks of runs. Explain each term in one line when it first appears.
10. **Shorten Lift onboarding to 3-4 cards in Simple mode**, matched to the run side's look. Offer the full tour from Settings.

## 7. Design verdict

- **Keep A's look and Today-first flow** for the main app and the Plan week. It is the calmest, and the "why" notes build trust. Move "New plan / I am new" onto the first screen.
- **Take C's wizard logic** (choosing run/walk sets new, 3 days and gentle defaults) and **C's big GO button** for the start of a run.
- **Take A's live run screen** (large timer, "left in this step · Next") for run/walk recording.
- **Use B only as an optional "Data" view** for later. Never use it as the default home for a new user.
- **From Lift, take** the Simple/Advanced choice (apply it to the whole app, run side included), the exercise video link, "last time" memory and the beginner guidance text. Restyle Lift to A's palette so Run and Lift feel like one app, and feed Lift sessions into the shared load and Plan week.
