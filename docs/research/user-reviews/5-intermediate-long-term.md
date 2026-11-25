# Persona 5: intermediate, long-term user (6 months of run + gym)

## 1. Persona in one paragraph

I am Sam, 34. I have used the app for six months. I lift three times a week for hypertrophy (Push, Pull, Legs). I run three or four times a week. Some Saturdays I play five-a-side football. Some Sundays I ride with friends. My goal is a half marathon in about five months, from 2:05 to under 1:55. I wear a Garmin. My job moves at least two days of my week, every week. I tested A, B and C with the sample plan. In Iron Log (Advanced) I logged an 8 km run and checked the body map and load bar.

## 2. Fit scores

| App | Score | Reason |
|---|---|---|
| A Coach | 6 | Clear daily flow and good refusal text. It does not know my gym days. |
| B Logbook | 7 | Week grid, backdated cross-training and Analysis suit a long-term user. Moves go one day per tap. |
| C Track | 4 | Built for one run at a time. A big GO button shows even on a rest day. |
| Iron Log (Lift) | 7 | Good lifting log. Its body map shows that a run tires my legs. Its load number disagrees with Run. |

## 3. What works

**A Coach.** Today shows "Rest day" and then "NEXT RUN · THU 26 NOV Hill repeats". I see tomorrow before I plan the gym. Refusals are clear: "Not moved. Hill repeats on Saturday would touch long run on Sunday." Progress explains "Fitness 40 / Fatigue 58 / Form -17" and says it does not predict injury.

**B Logbook.** Week shows all seven days with km, pace and time. One arrow tap moved Thu Hills to Fri, and "What changed and why" logged it. B is the only prototype with a **Date** field on cross-training. I log my Sunday ride on Monday all the time. Analysis shows "36 runs and 3 cross-training sessions" and the 80/20 split for the last 8 and next 4 weeks.

**C Track.** The Thu 26 Nov workout card is very easy to read. Move says "The two days swap." That is honest.

**Iron Log.** After "Run, 50 min, 8 km, RPE 7", my quads and hamstrings turned red ("24h+ to go") and my calves and glutes amber. This is the best feature for my life. One app can know that my legs are tired from a run.

## 4. What fails or is missing

**All three prototypes (shared engine).**
- No gym days. The wizard asks only "days per week" and "long-run day". The engine picks run days from a fixed table (4 days = Tue, Thu, Fri, Sun). I cannot say "Monday is legs" or "no runs on Wednesday".
- "Strength on" adds a Monday "Strength and mobility" session and "Add 20 min strength after this run" on Friday. I already lift three times. This doubles my strength work.
- In A, I logged "Gym, 45 min, effort 8" on Wednesday. Nothing changed. The coach still said "Your next run is hill repeats on Thursday." The screen even says cross-training "gives your legs a rest". A leg day does not.
- "Gym" has no body area. There is no "Football" type.
- Moves stay inside one week, so a Sunday-to-Monday slip is refused. Moves are swaps, so I cannot simply drop a run.
- A and C refuse unsafe days only after the tap. They never say which day is safe. The coach says "If no safe day exists, I drop the session", but the screens only refuse.

**A.** Cross-training saves "to today" only. **B.** Thu to Sun takes three taps, and any tap can be refused. **C.** "GO" sits on the Rest screen. Gym and data hide under "Me".

**Iron Log.** The opening animation plays on every launch. After one run with no history, the load bar jumped to a red **"SPIKE 3.63"**. Iron Log uses a 7/28-day ratio; Run uses fitness / fatigue / form. Two numbers for one body. I also type each Garmin run twice: into Run, then into Lift.

## 5. Long-term grievances and wishes

1. **Double logging.** Garmin run into Run, then again by hand into Iron Log. My lifts never reach the run plan. After six months that is hundreds of extra taps.
2. **The plan ignores my week shape.** Every Sunday night I move Thursday hills because Wednesday is legs. Let me pin gym days and plan runs around them.
3. **Moving is a fight.** I want "move to next week", "drop this run" and safe days shown in green before I tap.
4. **Load does not match how I feel.** After legs I feel heavy, but a light upper-body day drops Form just as much. I want a legs-fatigue line and a one-tap "legs feel heavy" check that changes tomorrow.
5. **Two load systems.** "Form -17" in Run and "SPIKE" in Lift. After a month I trust neither.
6. **Slow progress is invisible.** I want my fitness score and predicted half time as a trend from month 1, with my start marked.
7. **Repeated text.** The same "Why" ("Hills build strength and power...") every week. By month 3 I ignore it.
8. **Football is second-class.** It is my hardest leg day, logged as "Other".
9. **No Sunday review.** One screen: runs and lifts done vs planned, load trend, next week. Then "Accept".
10. **Nags.** I want one evening note: "Tomorrow: Hills. Today was legs. Move hills to Friday?" Not streak nags. "11-week streak" breaks whenever life happens.
11. **Split exports.** Run exports CSV/GPX/ICS; Iron Log exports JSON. I want one backup.

## 6. Top 10 recommendations for V1 (ranked)

1. **One shared activity store.** A FIT / Health Connect import or a gym session is logged once. Plan, Run and Lift all read it.
2. **Gym days as plan days.** The wizard asks lifting days and split. The engine spaces Legs like a hard day.
3. **Adapt after leg-heavy days.** Legs or football before a hard run or long run triggers "Swap with Friday?" with the reason.
4. **One load model.** Fitness / fatigue / form everywhere, plus a legs-fatigue value from Iron Log's muscle map. Drop the "SPIKE" ratio from the home screen.
5. **Smarter moves.** Safe days marked before the tap. Moves into next week. "Drop" and "suggest a day".
6. **No double strength.** When Lift is used, replace runner "Strength and mobility" with my real Legs day.
7. **Backdate and type every log.** Date field on all forms (as in B). Add Football and Team sport. Tag Gym by body area.
8. **Sunday weekly review** with planned vs done for runs and lifts and one-tap accept.
9. **Long-goal view.** Fitness trend and predicted half time since day 1, and the full plan on one timeline.
10. **Calm long-term UX.** Intro animation on first launch only. "Why" only on changes. Forgiving weekly streaks. No GO on rest days.

## 7. Design verdict

- **Plan mode:** **B's Week grid** with "What changed and why" and Undo. Add gym rows to the same grid. Replace the arrows with A's "Move to another day" chips, with safe days in green.
- **Today:** **A's Today card**, showing "Today: Legs" and "Next run: Thu Hill repeats" together. Coach bubble only for changes.
- **Run recording:** **C's** big card and GO button, inside Run mode only.
- **Long view:** **B's Analysis** and Season chart, plus lifting volume and legs fatigue.
- **From Iron Log:** keep the **muscle readiness body map** as the shared body screen, fed by runs, football and lifts. Keep its sport-specific activity catalogue and "information only" labels. Drop the separate ratio gauge and the repeat intro.
