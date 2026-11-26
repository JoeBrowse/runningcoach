# Persona 2 review: intermediate runner, new user, gym 2-3 times a week

## 1. Persona in one paragraph

I am Sam, 31. I run once or twice a week, 5 to 8 km, with no plan (about 12 km a week; 10K in about 55:00). I lift upper/lower: Monday upper, Wednesday lower, Friday upper when I can. I wear a Garmin Forerunner 265 with an Android phone. I want a sub-50 10K by March 2027, then a half marathon in October 2027. I keep the gym. I want one app that knows both sides. I will not log a session twice or fill in a daily survey.

Method: I ran the wizard in A, B and C with my answers (10K, 14 Mar 2027, 55:00, 12 km a week, 3 days) and checked the engine output. In Lift I took Simple, logged a run, used "Train ready muscles" and opened the programme builder. Screenshots: `personas/p2/`.

## 2. Fit scores

| App | Score | Reason |
|---|---|---|
| A Coach | 6 | The best daily screen and honest week targets. The plan ignores my gym days. |
| B Logbook | 6 | The season chart suits a goal that is months away. It is dense on a phone, and the long run can only be on Sat, Sun or Wed. |
| C Track | 5 | The clearest week list. Its strength is audio-first running, which I need least. The peak number it shows is wrong. |
| Lift (gym tracker) | 7 | The only part that knows a run made my legs tired. Programmes do not use weekdays, and it does not ask if I run. |

## 3. What works

**A Coach.** "Today" shows the next session as a clear chart with paces. The wizard result shows safety checks and a week-1 preview before I commit. The plan card is honest ("16.3 km, target 12 km"). Every change shows a reason, and Undo works.

**B Logbook.** The season chart shows past weeks, today, phases, cutbacks and race day together. It is the only screen that feels like a long-term journey. The "All weeks" table suits weekend planning on a desktop.

**C Track.** The "Week" tab is the best week overview: day, session, distance and a shape bar on one row. "Move" swaps two days and checks that hard days do not touch.

**Lift.** After a logged 7 km run at RPE 6, quads and hamstrings turned red, and "Train ready muscles" gave me an upper-body session. This is the run-and-gym link I want. Logging took about 20 seconds.

## 4. What fails or is missing

**All three prototypes (shared engine):**
- **The wizard never asks for my gym days.** There is only a "Strength sessions" toggle. The plan puts a 25 min core session on Mon and Fri, calls Wednesday a "Rest day" while I squat, and puts **Hill repeats** on Thursday, the day after legs. With 2 run days, strength lands Mon *and* Tue.
- **Week 1 is too big.** I said 12 km a week. Week 1 is 16.3 km (+36%), and "Weekly distance grows by 10% or less" still says Pass. The check reads the target, not the planned distance.
- **80/20 fails on my fresh plan.** A shows "Check this", B a red X, with no fix offered. Bad for trust on day one.
- **The long run is my shortest run.** Week 1: long run 4.8 km, easy + strides 6 km, hills 5.5 km. I already run 7 km on a weekend.
- **Hill repeats in week 1** for someone who runs once or twice a week, with no easy weeks first.
- **No goal time.** The apps show "Predicted 10K 54:54" (my current fitness). Nothing tracks my gap to sub-50.
- **The long-term goal breaks.** A half on 10 Oct 2027 (46 weeks) gives a 30-week plan that ends 20 Jun 2027 with no taper and no race, and no warning. I cannot chain "10K, then half".
- **"Peak week" is wrong.** A shows 29.1 km (the race week). B and C show 34 km; no training week passes 26 km.
- **I cannot choose run days**, only a count and a long-run day (B: Sat, Sun or Wed only). A "Gym" log adds load but never moves a run.

**A:** The floating "Ask coach" button covers the "Details" button on Today.
**B:** The wizard "Safety" step shows four green ticks before the plan exists; the result then shows a red X. Heavy scrolling on a phone.
**C:** On a rest day the Run tab is a giant red "Rest" and a GO button. It says nothing about my gym session.

**Lift:**
- "Upper Lower" assumes 4 sessions a week; I do 2 or 3. Programmes are a session list, not weekdays, so they cannot line up with a run plan.
- The guided wizard never asks "Do you also run? Which days?".
- Runs are typed by hand, though my Garmin already has them.
- A 20-step tour, and a toast covered the time and distance fields of the activity form.

## 5. What I predict will annoy me in month 2

1. **Logging twice.** A lower day done in Lift leaves the Run plan's strength day open. Garmin runs must be retyped into Lift.
2. **Weekly swaps.** Thursday hills always follow Wednesday legs. I swap days every Sunday; the app never learns my pattern.
3. **Red legs.** If every easy run paints my legs red, I will stop trusting the map or skip lower days.
4. **Duplicate strength.** "Add 20 min strength after this run" when I already lift three times a week.
5. **Goal drift.** In February: "Am I on track for sub-50?" No screen answers, and no time trial is planned.
6. **The second goal.** In March I start a new plan for the half, cut off from my 10K block.
7. **Daily check-ins.** Four questions every morning. I will stop after a week; my watch already has sleep and HRV.
8. **Stale calendar.** The .ics export is a one-off and goes out of date after each swap.

## 6. Top 10 recommendations for V1

1. **Add "My gym days" (weekday + upper/lower/full) to the wizard.** No hard or long run the day after a lower day. Drop generic strength for Lift users.
2. **Fix the week-1 jump and the safety check.** Week 1 must be at or below the stated weekly distance plus 10%. The check must test planned km, not the target.
3. **One shared calendar.** Lift sessions mark Plan days done; watch runs (Health Connect, HealthKit, FIT) feed the body map. No double logging.
4. **Support goals far away and chained goals.** Allow race dates over 30 weeks (or split them into blocks). Never drop the race silently. Use B's season chart as the timeline for "10K, then half".
5. **Add a goal time.** Show goal vs predicted time on the Progress screen. Plan a time trial every 4 to 6 weeks to update it.
6. **Fix plans for low-frequency runners.** The long run is never shorter than other runs. No hill or interval work until 2 to 3 easy weeks are done. A new plan must pass 80/20 before the app shows it.
7. **Let me choose run days, not only the count.** Allow any long-run day (B allows only three).
8. **Show honest summary numbers.** "Peak week" is the largest planned training week, not the target and not the race week.
9. **Make check-ins optional and light.** Use watch sleep/HRV when it is available. Ask one question after a run. Do not ask a daily survey.
10. **Lift onboarding for runners.** Ask "Do you run? Which days?". Offer Upper/Lower 2x and 3x a week, linked to weekdays. Shorten the 20-step tour, and do not show toasts over form fields.

## 7. Design verdict

- **Daily use: A.** Its "Today" (chart, "why", reasons) is the right home. Add today's Lift session to it.
- **Week view: C.** Use its Week tab as the **Plan** master week, with run and gym rows mixed ("Wed: Lower body").
- **Long-term goals: B.** Use its season chart; keep its table for desktop.
- **C's GO and audio** belong on the recording screen only.
- **From Lift, keep:** the run-fed body map, "Train ready muscles", fast logging, "load is information only" and Simple/Advanced. Merge its dark style with the prototypes into one visual system.
