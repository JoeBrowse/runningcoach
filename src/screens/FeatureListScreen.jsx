import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { UNLOCKED_BUILD } from "../lib/billing.js";
import { COLORS } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";

/* ---------------------------------------------------------------
   FEATURE LIST
   The in-app "read me" — every feature and every setting, grouped the
   same way the app itself is. Reachable from Settings any time, and
   pointed at once, right after the first-run tour, so a lost user has
   somewhere to go besides guessing.
--------------------------------------------------------------- */

// Collapsed by default. The list runs to five screens of solid prose, which
// is unreadable as a wall — closed sections turn it into a short contents
// page you can scan and open the one part you came for.
function FeatureSection({ title, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const count = React.Children.count(children);
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: open ? COLORS.surfaceRaised : COLORS.surface,
          border: `1px solid ${open ? COLORS.accent : COLORS.line}`,
          borderRadius: 12,
          padding: "12px 14px",
          textAlign: "left",
        }}
      >
        <span style={{ color: open ? COLORS.accent : COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>
          {title}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textDim, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {count}
          {open ? <ChevronDown size={15} color={COLORS.accent} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {open && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{children}</div>}
    </div>
  );
}

function FeatureItem({ name, children }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13.5, textTransform: "uppercase", marginBottom: 3 }}>{name}</div>
      <div style={{ color: COLORS.textDim, fontSize: 12.5, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export function FeatureListScreen({ onBack }) {
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Feature List" onBack={onBack} />
      <div style={{ padding: "0 20px 20px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
        Everything Iron Log can do. Tap a section to open it.
      </div>

      <div style={{ padding: "0 20px" }}>
        <FeatureSection title="Starting a Workout" defaultOpen>
          <FeatureItem name="Free Mode">
            Tap a muscle repeatedly to add exercises for it. In Advanced Mode, switch to "Choose specific exercises instead" to pick exact exercises from a collapsible, body-part-by-body-part list.
          </FeatureItem>
          <FeatureItem name="Programmes">
            Build a multi-week plan (Push/Pull/Legs, Upper/Lower, Bro Split, or fully custom). Iron Log queues your next day automatically and tracks how the block is progressing until you finish it.
          </FeatureItem>
          <FeatureItem name="Guided Programme (Recommended)">
            The highlighted option when creating a programme. Answer three quick questions — experience level, session length, and any body part you want to prioritize — and Iron Log builds a split for you, shows rep-range and protein recommendations, then previews the exact programme before you commit. Decline it and you're dropped back into the normal builder to make your own.
          </FeatureItem>
          <FeatureItem name="Train Ready Muscles">
            The muscle-readiness map on Home colours each muscle by how long it still needs: green once it is ready, amber inside the last day, red while more than a day remains. How long depends on the muscle and on how hard you trained it — the lower back needs four days after a session taken to failure and two and a half after one with reps left; side delts need a day and a half, or one. Muscles worked indirectly get their own shorter windows, so a hard bench leaves your chest red and your triceps somewhere behind it. Pick how long you have and Iron Log builds a session from whatever is green.
          </FeatureItem>
          <FeatureItem name="Backup">
            Settings → Backup saves everything — history, programmes, settings, exercise order — to one JSON file in your Downloads, and names the exact path it wrote to. Restore puts it all back. Your data never leaves the phone otherwise, so this file is the only copy that survives losing it.
          </FeatureItem>
          <FeatureItem name="Effort — RIR or RPE">
            Advanced Mode puts a blue circle beside every set. One tap records how hard it was, on whichever scale you picked in Settings → Training Defaults: reps in reserve (0 for failure through to 3+) or RPE (10 for failure down to 7 or less). They are the same measurement counted from opposite ends, so the stored value is identical and switching scales relabels your whole history rather than rewriting it. The readiness map reads it directly: 0-1 RIR — RPE 9-10 — puts the muscle on its failure window, anything easier on its buffer window, and the gap is large: a hard set of squats needs 84 hours where one with reps left needs 54. The hardest set of the session decides. Leave it blank and the buffer window is assumed.
          </FeatureItem>
          <FeatureItem name="Exercise Notes">
            Jot anything against an exercise — seat height, a niggle, which pin. It reappears under "last time" when you next do it.
          </FeatureItem>
          <FeatureItem name="Measurements">
            Chest, waist, hips, arms, thighs and calves, in cm or inches, in Personal Info. Each shows the change since your first reading.
          </FeatureItem>
          <FeatureItem name="Copy Previous">
            Redo any past workout exactly as it was logged — same exercises, same order.
          </FeatureItem>
          <FeatureItem name="Templates (Advanced Mode)">
            Save any hand-picked exercise selection as a template from the "Choose specific exercises" screen, then reuse it from Home.
          </FeatureItem>
          <FeatureItem name="1RM Session">
            A guided max-attempt workout built from your saved 1RM goals, with a warm-up ramp built in.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Picking Exercises">
          <FeatureItem name="Body-part dropdowns">
            Every exercise picker in the app (program builder, mid-workout "Add Exercise", editing a past session, Free Mode) groups exercises by body part, collapsed until you tap one open.
          </FeatureItem>
          <FeatureItem name="Variant tiles (Advanced Mode)">
One entry per movement. A bench press is a bench press whether it is loaded with a barbell, dumbbells or a Smith machine, so you pick the implement per session instead of hunting through four near-identical entries.
          </FeatureItem>
          <FeatureItem name="Bodyweight, assisted or weighted">
            Dips, pull-ups, push-ups and nordic curls have one button on the exercise card for how you are loading them today. Assisted asks for the assistance, weighted asks for what you added, and bodyweight asks for nothing. The first time you touch the weight box it offers the figure you used last time at that same loading.
          </FeatureItem>
          <FeatureItem name="Calisthenics progression">
            Progress charts plot what you actually moved: bodyweight minus the assistance, or bodyweight plus what you hung off yourself. Coming off the assist machine therefore reads as progress instead of your numbers appearing to collapse. Needs a bodyweight in Personal Info to work.
          </FeatureItem>
          <FeatureItem name="Share a workout to Strava">
            Turn on Settings → Share to Strava and a share button appears when you finish a workout and on every past one in History. It builds the session into text — split, exercises, sets, total weight moved, then each lift with its sets and implement — hands it to your phone's share sheet, and opens Strava so you can paste it into the activity. It is a paste rather than a direct post because posting needs a secret key Iron Log has no server to hold, and Strava has nowhere structured to put sets and reps anyway.
          </FeatureItem>
          <FeatureItem name="Repeat last session in one tap">
            The "last time" panel on an exercise is a button. Tap it and those weights and reps go straight onto the card, one row per set you did last time. On an empty exercise it fills immediately; if you have already typed something it asks first and only replaces on a second tap. Reps in reserve is never copied — that is a measurement of the set you are about to do, not a plan.
          </FeatureItem>
          <FeatureItem name="Change the Implement (Advanced Mode)">
            Mid-workout, open an exercise's menu (gear icon) to change how you're loading it. The exercise stays the same, so your history and any superset stay attached — only the comparison narrows to sessions done the same way.
          </FeatureItem>
          <FeatureItem name="Light mode">
            Settings → Colour &amp; Display. Dark, light, or follow your phone. Light is not the dark theme inverted — every colour that means something has a second value picked for a pale background, since most of what works on black disappears on white.
          </FeatureItem>
          <FeatureItem name="Colour schemes for colour blindness">
            Settings → Colour &amp; Display. The readiness map uses colour to say what is recovered, and red/amber/green is the worst triple for the commonest kind of colour blindness. Pick the scheme that matches how you see: red–green, blue–yellow, or monochrome, which uses brightness alone. Each has its own palette for light and for dark. Everything in the app that carries meaning through colour changes with it, and in any scheme but the original the muscles gain outlines so colour is never the only clue. High Contrast is a separate switch — pure black, brighter text, heavier lines.
          </FeatureItem>
          <FeatureItem name="Exercise Database">
            From the Home screen: browse every exercise by body part. Reorder anything — the order is the priority the app uses when it picks exercises for you, so moving cable pushdowns to the top means you get them first. Remove exercises you can't or won't do (they vanish from every picker, and you can restore them any time), and add your own.
          </FeatureItem>
          <FeatureItem name="Edit any exercise">
            Tap the pencil beside anything in the Exercise Database — yours or one of Iron Log's — to change its name, its muscle, its type, the muscles it also hits, or its cue. The exercise keeps its identity, so every set you have logged against it stays attached; renaming it or moving it to another muscle updates your past workouts to match. Adding an indirect muscle counts backwards too, so old sessions start feeding the readiness map and weekly volume for it immediately. An edited built-in is marked Edited and can be put back to Iron Log's version whenever you like.
          </FeatureItem>
          <FeatureItem name="Custom exercises (Advanced Mode)">
            Tap "+ New" on any exercise picker — or use the Exercise Database screen — to add your own exercise. It's saved and reusable everywhere afterward.
          </FeatureItem>
          <FeatureItem name="Indirect muscles on your own compounds">
            When the exercise you are adding is a compound, tick the muscles it also hits. They get partial fatigue on the readiness map and half a set each in weekly volume, exactly like the built-in exercises.
          </FeatureItem>
          <FeatureItem name="Search by whatever you call it">
            The Exercise Database has a search box, and it knows common alternative names — press-up finds Push-Up, OHP finds Overhead Press, RDL finds Romanian Deadlift.
          </FeatureItem>
          <FeatureItem name="Pause an exercise (Advanced Mode)">
            On the "Choose specific exercises" screen, tap the pause icon next to any exercise to exclude it from auto-built (Train Ready Muscles / muscle-tap) sessions without deleting it.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Logging a Workout">
          <FeatureItem name="Sets, weight & reps">
            Enter weight and reps per set and tick the box as you finish it — plan the whole exercise ahead, then check things off as you go.
          </FeatureItem>
          <FeatureItem name="Rest timer">
            Start a timer between sets from any exercise. It pins to the top of the screen and stays visible while you scroll — pause it, add time, or skip it.
          </FeatureItem>
          <FeatureItem name="Form videos">
            A play button beside every exercise name opens a YouTube search for that lift. It includes the implement you are using, so a Smith machine bench press does not show you a barbell one.
          </FeatureItem>
          <FeatureItem name="Supersets & drop sets (Advanced Mode)">
            From an exercise's menu, link it with another into a superset, or add a drop set to a working set for extra intensity.
          </FeatureItem>
          <FeatureItem name="Cable & machine tracking (Advanced Mode)">
            Machine and cable work lets you log the gym's brand and the grip used, so weight comparisons over time are like-for-like. Name the machine and "last time" switches to your last session on that one — or tells you when you have never used it. Progress charts get a dropdown to plot a single machine, and you can add the machine to a past session by editing it in your history.
          </FeatureItem>
          <FeatureItem name="Backdating">
            Tap "Logging for now" at the top of a workout to back-date it to the exact day and time it actually happened.
          </FeatureItem>
          <FeatureItem name="Add exercise mid-workout">
            Tap "Add Exercise" at the bottom of any workout to bring in something you didn't originally plan for.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="After a Workout">
          <FeatureItem name="Training Log / History">
            Every finished session is saved. Open any past workout to review it, or edit it — fix a typo, adjust a set, or add an exercise you forgot to log.
          </FeatureItem>
          <FeatureItem name="Progress Charts">
            A per-exercise graph over time, plotted as estimated 1RM, top-set weight or total volume. Estimated 1RM leads because it is the only one that stays honest when the rep target changes — a lighter set for more reps still counts as progress. Appears once an exercise has two logged sessions.
          </FeatureItem>
          <FeatureItem name="1RM Goals">
            Set a one-rep-max target and get a week-by-week progression toward it. Log a max by hand or let Iron Log estimate it from your workouts.
          </FeatureItem>
          <FeatureItem name="Personal Info & Weight Tracking">
            Keep your weight, height and age in one place. Turn on weight tracking to set a goal and see your weight plotted over time.
          </FeatureItem>
          <FeatureItem name="Consistency">
            A streak counter on the Home screen, and its own screen showing a square for every day of the year, month by month, with a year picker to look back over past years.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Settings">
          <FeatureItem name="Simple / Advanced Mode">
            Simple Mode (the default) keeps things to muscle-tap selection, weight/reps logging and a rest timer. Advanced Mode unlocks the implement picker, reps-in-reserve, supersets, drop sets, machine and grip tracking, custom exercises and templates. Switch anytime — nothing you've logged is affected either way.
          </FeatureItem>
          <FeatureItem name="Exercise Cues (off by default)">
            Shows a short hypertrophy/form tip under each exercise while you train.
          </FeatureItem>
          <FeatureItem name="Warm-Up Suggestions (off by default)">
            Adds tickable ramp-up sets before the first exercise of each muscle in a workout.
          </FeatureItem>
          <FeatureItem name="Mobility Finisher (off by default)">
            Tacks a mobility/stretch exercise onto the end of every auto-built workout.
          </FeatureItem>
          <FeatureItem name="Last Top Set">
            Shows your last logged top set for an exercise, right there while you log the new one.
          </FeatureItem>
          <FeatureItem name="Cardio & Activity">
            A panel at the foot of Home, kept out of your lifting stats but wired into the readiness map above it. Fifteen options grouped indoor and outdoor: run, walk, hike, cycle and swim outside; treadmill, incline walk, stationary bike, spin, rowing machine, elliptical, stair climber, assault bike, jump rope and Other inside. Pick a date and time, a duration, a distance where the activity has one, and an effort from RPE 1 to 10. Pace is worked out in the unit the sport is read in — min/km on foot, km/h on a bike, a /500m split on the rower, /100m in the pool. Each activity knows what it works: a run tires quads, calves and hamstrings directly and glutes, shins and core indirectly; a rower is quads and back with the erectors holding it together; a swim is back and front delts; a walk is indirect throughout, because treating a stroll as direct leg work would paint the map red for anyone who commutes on foot. RPE 9 or 10 counts as hard, the same threshold a set at 0-1 RIR meets. "Other" is timed and logged but leaves the map alone, since the app has no way to know what it worked. Every activity counts towards your day streak and consistency calendar.
          </FeatureItem>
          <FeatureItem name="Stats for Nerds">
            At the foot of Consistency. Twelve panels: lifetime sessions, sets, reps and tonnage, with a comparison to make the tonnage mean something; a body diagram shaded by how much of your work each muscle takes; a donut of how often you go to failure, counted against the sets where you actually recorded an effort and never against the ones you did not; reps by range from strength to endurance; a push/pull/legs balance; your most-done exercises; biggest movers by estimated 1RM, in both directions, for lifts with at least six sessions behind them; the hour of day you train, built only from sessions the app timed itself so imported ones cannot invent a pattern; which weekday is your busiest; weight moved per week over six months; a record book of longest streak, longest lay-off, busiest month and biggest session; and cardio time and distance by sport. Tonnage counts external load, so bodyweight and assisted work add nothing to it. Any panel without enough behind it stays hidden.
          </FeatureItem>
          <FeatureItem name="Training Load">
            Drag the marker along the scale to ask what it would take to be somewhere else on it. Downwards it answers in rest: the hours, and the 24-hour time and date you would get there. That number is exact rather than estimated — with no training at all a day multiplies the 7-day average by 0.75 and the 28-day by 0.931, so the ratio falls by the same factor every day and the time to any lower value comes straight out of that. Upwards it cannot answer in rest, because nothing but training raises the ratio, so it prices a session instead: the minutes at RPE 8 that would land you there today. The readout only exists while you are dragging, a faint mark stays where you actually are for comparison, and letting go snaps it back — it is a question, not a setting.
          </FeatureItem>
          <FeatureItem name="Training Load">
            A scale under the readiness map for the question the map cannot answer: not "can I train chest" but "should I train at all". The map remembers only each muscle's most recent session, so a training block never accumulates in it. This is the acute:chronic workload ratio, a common sports-science measure. It is information only: it cannot predict injury, and research disputes it as an injury predictor. Every session gets a load — Foster's session-RPE, how hard it felt multiplied by how long it lasted, which puts a set of squats and a 10k in the same units. Lifting sessions take their RPE from your logged RIR and their minutes from the clock, or from their sets at your configured rest lengths for sessions logged before the app timed them. The last 7 days are averaged against the last 28, both exponentially weighted the way Williams et al. showed detects injury risk better than plain rolling windows. The zones follow Gabbett: under 0.8 is less than you are used to, 0.8–1.3 is close to your usual training, 1.3–1.5 is ramping up, and over 1.5 is a sharp rise. The bar is coloured by zone with a marker for where you sit. Because it divides by your own 28-day average it judges you against your own conditioning, not an absolute anyone has to live up to. It needs a few weeks of history before it will show a number.
          </FeatureItem>
          <FeatureItem name="Muscle Readiness Map">
            Toggles the body-diagram recovery map on the Home screen.
          </FeatureItem>
          <FeatureItem name="Training Defaults">
            Its own screen off Settings, holding the numbers the app used to pick for you: how long compound and isolation rests run (30 seconds to 10 minutes), whether the timer starts itself, beeps and buzzes when it ends, how many set rows an exercise opens with, how fast a muscle is treated as recovering, and how many past sessions of a lift the charts can see.
          </FeatureItem>
          <FeatureItem name="Randomize Exercise Selection">
            When off, auto-built workouts pick exercises in a fixed ranked order; when on, they shuffle for variety.
          </FeatureItem>
          <FeatureItem name="Replay App Tour">
            Re-runs the first-run walkthrough any time, from the bottom of Settings.
          </FeatureItem>
        </FeatureSection>

        {UNLOCKED_BUILD ? (
          <FeatureSection title="Your Copy">
            <FeatureItem name="Fully unlocked">
              This build has every feature switched on permanently — no trial, no purchase, nothing to expire.
            </FeatureItem>
          </FeatureSection>
        ) : (
          <FeatureSection title="Trial & Subscription">
            <FeatureItem name="7-day free trial">
              Every feature unlocked for 7 days, run by Google Play. Cancel before it ends and you are not charged.
            </FeatureItem>
            <FeatureItem name="Monthly or annual">
              Pick either when you start the trial. Manage or cancel any time from Settings or Google Play.
            </FeatureItem>
            <FeatureItem name="Works offline">
              Iron Log keeps working without a signal. It only needs to reach Google Play occasionally to confirm the subscription.
            </FeatureItem>
            <FeatureItem name="Your data is yours">
              Everything stays on your phone, subscribed or not, and Backup in Settings always works — cancelling never locks you out of your own history.
            </FeatureItem>
            <FeatureItem name="Restore Subscription">
              Reinstalled the app or switched devices? Restore from Settings using the same Google account.
            </FeatureItem>
          </FeatureSection>
        )}
      </div>
    </div>
  );
}
