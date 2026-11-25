import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
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
  const listStyle = { margin: "6px 0", paddingLeft: 18 };
  return (
    <div style={{ paddingBottom: 40 }}>
      <TopBar title="Feature List" onBack={onBack} />
      <div style={{ padding: "0 20px 20px", color: COLORS.textDim, fontSize: 13, lineHeight: 1.5 }}>
        This list shows the Lift features of Skid Marks. Tap a section to open it.
      </div>

      <div style={{ padding: "0 20px" }}>
        <FeatureSection title="Starting a Workout" defaultOpen>
          <FeatureItem name="Free Mode">
            Tap a muscle one or more times to add exercises for it. In Advanced Mode, select "Choose specific exercises instead". Then select the exact exercises from a list. The list has a section for each body part. You can open and close each section.
          </FeatureItem>
          <FeatureItem name="Programmes">
            Build a plan for a number of weeks. Use Push/Pull/Legs, Upper/Lower or Bro Split, or make a fully custom plan. The app automatically selects your next training day. It shows your progress through the block until you finish it.
          </FeatureItem>
          <FeatureItem name="Guided Programme (Recommended)">
            This is the highlighted option when you create a programme. Answer three short questions: your experience level, your session length, and the body parts that you want to make a priority. The app then builds a split for you. It shows recommendations for rep ranges and protein. Then it shows the exact programme before you accept it. If you decline it, the app opens the normal builder. There you can make your own programme.
          </FeatureItem>
          <FeatureItem name="Train Ready Muscles">
            The muscle readiness map on Home gives each muscle a colour. The colour shows how much recovery time the muscle still needs. Green means that the muscle is ready. Amber means that it needs less than one more day. Red means that it needs more than one more day. The recovery time depends on the muscle and on how hard you trained it. After a session to failure, the lower back needs four days. After a session with reps left, it needs two and a half days. The side delts need one and a half days or one day. Muscles that an exercise works indirectly have their own shorter recovery times. Thus after a hard bench press, your chest is red, but your triceps recover sooner. Select how much time you have. The app then builds a session from the green muscles.
          </FeatureItem>
          <FeatureItem name="Backup">
            Settings → Backup saves all your data to one JSON file in your Downloads folder. This includes history, programmes, settings and exercise order. The app shows the exact path of the file. Restore puts all the data back. Your data does not leave the phone in any other way. Thus if you lose the phone, this file is the only copy of your data.
          </FeatureItem>
          <FeatureItem name="Effort: RIR or RPE">
            In Advanced Mode, a blue circle shows next to each set. Tap it once to record the effort of the set. The app uses the scale that you selected in Settings → Training Defaults. Reps in reserve goes from 0 (failure) to 3+. RPE goes from 10 (failure) down to 7 or less. The two scales are the same measurement, counted from opposite ends. Thus the app stores the same value for both. If you change the scale, the app changes the labels on your full history. It does not change the data. The readiness map uses this value directly. A set at 0-1 RIR (RPE 9-10) gives the muscle its failure recovery time. An easier set gives the muscle its buffer recovery time. The difference is large. A hard set of squats needs 84 hours. A set of squats with reps left needs 54 hours. The hardest set of the session sets the recovery time. If you leave the effort empty, the app uses the buffer recovery time.
          </FeatureItem>
          <FeatureItem name="Exercise Notes">
            Write a note for an exercise, for example the seat height, a small pain or the pin position. The note shows again under "last time" when you next do the exercise.
          </FeatureItem>
          <FeatureItem name="Measurements">
            Record your chest, waist, hips, arms, thighs and calves in cm or inches. You find this in Personal Info. Each measurement shows the change since your first record.
          </FeatureItem>
          <FeatureItem name="Copy Previous">
            Do a past workout again exactly as you logged it, with the same exercises in the same order.
          </FeatureItem>
          <FeatureItem name="Templates (Advanced Mode)">
            On the "Choose specific exercises" screen, save your selected exercises as a template. Then use the template again from Home.
          </FeatureItem>
          <FeatureItem name="1RM Session">
            A guided workout for maximum attempts. The app builds it from your saved 1RM goals. It includes warm-up sets that increase in weight.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Picking Exercises">
          <FeatureItem name="Body-part dropdowns">
            All exercise pickers in the app put exercises into groups by body part. This includes the programme builder, "Add Exercise" during a workout, the editor for past sessions, and Free Mode. Each group stays closed until you tap it.
          </FeatureItem>
          <FeatureItem name="Variant tiles (Advanced Mode)">
            The list has one entry for each movement. A bench press is the same movement with a barbell, dumbbells or a Smith machine. Thus you select the implement for each session. You do not have to search through four almost identical entries.
          </FeatureItem>
          <FeatureItem name="Bodyweight, assisted or weighted">
            Dips, pull-ups, push-ups and nordic curls have a button on the exercise card. Use it to set how you load the exercise today. Assisted asks for the assistance weight. Weighted asks for the weight that you added. Bodyweight asks for no weight. When you first touch the weight box, the app suggests the weight that you used last time with the same loading.
          </FeatureItem>
          <FeatureItem name="Calisthenics progression">
            Progress charts show the weight that you actually moved. This is your bodyweight minus the assistance, or your bodyweight plus the added weight. Thus when you stop using the assist machine, the chart shows progress. It does not show a sudden drop. This feature needs your bodyweight in Personal Info.
          </FeatureItem>
          <FeatureItem name="Share a workout to Strava">
            Turn on Settings → Share to Strava. A share button then shows when you finish a workout. It also shows on each past workout in History. The button puts the session into text. The text starts with the split, exercises, sets and total weight moved. Then it shows each lift with its sets and implement. The app sends the text to the share sheet of your phone and opens Strava. Paste the text into the activity. The app cannot post directly to Strava. A direct post needs a secret key, and Skid Marks has no server to keep that key. Also, Strava has no structured fields for sets and reps.
          </FeatureItem>
          <FeatureItem name="Repeat last session in one tap">
            The "last time" panel on an exercise is a button. Tap it to copy those weights and reps onto the card. The app adds one row for each set that you did last time. If the exercise is empty, the app fills it immediately. If you already typed values, the app asks first. It replaces your values only after a second tap. The app never copies reps in reserve. Reps in reserve measures the set that you are about to do. It is not a plan.
          </FeatureItem>
          <FeatureItem name="Change the Implement (Advanced Mode)">
            During a workout, open the menu of an exercise (gear icon) to change how you load it. The exercise stays the same. Thus your history and supersets stay with it. Only the comparison changes. The app then compares only with sessions that used the same implement.
          </FeatureItem>
          <FeatureItem name="Light mode">
            Go to Settings → Colour &amp; Display. Select dark, light, or the same theme as your phone. The light theme is not an inverted dark theme. Each colour that has a meaning has a second value for a pale background. This is necessary because most colours that are clear on black are difficult to see on white.
          </FeatureItem>
          <FeatureItem name="Colour schemes for colour blindness">
            Go to Settings → Colour &amp; Display. The readiness map uses colour to show which muscles have recovered. Red, amber and green are the worst three colours for the most common type of colour blindness. Select the scheme that matches how you see colour: red–green, blue–yellow, or monochrome. Monochrome uses only brightness. Each scheme has its own palette for the light theme and for the dark theme. All parts of the app that use colour to show a meaning change with the scheme. In all schemes except the original, the muscles also get outlines. Thus colour is never the only sign. High Contrast is a separate switch. It gives pure black, brighter text and thicker lines.
          </FeatureItem>
          <FeatureItem name="Exercise Database">
            Open it from the Home screen. It shows all exercises by body part. You can change the order of all exercises. The app uses this order as the priority when it selects exercises for you. For example, if you move cable pushdowns to the top, you get them first. Remove the exercises that you cannot do or do not want to do. The app then removes them from all pickers. You can restore them at any time. You can also add your own exercises.
          </FeatureItem>
          <FeatureItem name="Edit any exercise">
            In the Exercise Database, tap the pencil next to an exercise. This works for your exercises and for built-in exercises. You can change the name, the muscle, the type, the other muscles that it works, or the cue. The exercise keeps its identity. Thus all sets that you logged for it stay with it. If you rename it or move it to a different muscle, the app also updates your past workouts. If you add an indirect muscle, the app also applies it to past sessions. Those sessions then count immediately in the readiness map and in the weekly volume for that muscle. The app marks a changed built-in exercise as Edited. You can change it back to the built-in version at any time.
          </FeatureItem>
          <FeatureItem name="Custom exercises (Advanced Mode)">
            To add your own exercise, tap "+ New" on an exercise picker or use the Exercise Database screen. The app saves the exercise. You can then use it everywhere in the app.
          </FeatureItem>
          <FeatureItem name="Indirect muscles on your own compounds">
            When you add a compound exercise, tick the other muscles that it works. These muscles get partial fatigue on the readiness map. Each one also gets half a set in weekly volume. This is the same as for the built-in exercises.
          </FeatureItem>
          <FeatureItem name="Search by other names">
            The Exercise Database has a search box. The search knows common alternative names. For example, press-up finds Push-Up, OHP finds Overhead Press and RDL finds Romanian Deadlift.
          </FeatureItem>
          <FeatureItem name="Pause an exercise (Advanced Mode)">
            On the "Choose specific exercises" screen, tap the pause icon next to an exercise. The app then does not use that exercise in the sessions that it builds (Train Ready Muscles and muscle tap). The app does not delete the exercise.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Logging a Workout">
          <FeatureItem name="Sets, weight & reps">
            Enter the weight and reps for each set. Tick the box when you finish the set. You can plan the full exercise before you start. Then tick each set when you complete it.
          </FeatureItem>
          <FeatureItem name="Rest timer">
            Start a timer between sets from any exercise. The timer stays at the top of the screen when you scroll. You can pause it, add time or skip it.
          </FeatureItem>
          <FeatureItem name="Form videos">
            A play button next to each exercise name opens a YouTube search for that lift. The search includes the implement that you use. Thus a search for a Smith machine bench press does not show a barbell bench press.
          </FeatureItem>
          <FeatureItem name="Supersets & drop sets (Advanced Mode)">
            From the menu of an exercise, link it to a different exercise as a superset. You can also add a drop set to a working set for more intensity.
          </FeatureItem>
          <FeatureItem name="Cable & machine tracking (Advanced Mode)">
            For machine and cable exercises, you can log the brand of the machine and the grip. Thus you compare weights on the same equipment over time. When you name the machine, "last time" shows your last session on that machine. If you have not used that machine before, "last time" tells you. Progress charts get a dropdown to show one machine only. You can also add the machine to a past session. To do this, edit the session in your history.
          </FeatureItem>
          <FeatureItem name="Backdating">
            Tap "Logging for now" at the top of a workout. Then set the exact day and time when the workout occurred.
          </FeatureItem>
          <FeatureItem name="Add exercise mid-workout">
            Tap "Add Exercise" at the bottom of a workout to add an exercise that you did not plan.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="After a Workout">
          <FeatureItem name="Training Log / History">
            The app saves each finished session. Open a past workout to look at it or to edit it. You can correct a typing error, change a set, or add an exercise that you did not log.
          </FeatureItem>
          <FeatureItem name="Progress Charts">
            A graph for each exercise over time. It shows estimated 1RM, top-set weight or total volume. Estimated 1RM is the first option. It is the only value that stays accurate when the rep target changes. For example, a lighter set with more reps still shows as progress. The chart shows when an exercise has two logged sessions.
          </FeatureItem>
          <FeatureItem name="1RM Goals">
            Set a one-rep max target. The app then gives you a weekly progression to that target. Log a max yourself, or let the app estimate it from your workouts.
          </FeatureItem>
          <FeatureItem name="Personal Info & Weight Tracking">
            Keep your weight, height and age in one place. Turn on weight tracking to set a goal and to see a chart of your weight over time.
          </FeatureItem>
          <FeatureItem name="Consistency">
            The Home screen shows a week streak. It counts the weeks in a row with at least one activity. Rest days do not break it. The Consistency screen shows a square for each day of the year, month by month. Use the year picker to see past years.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Settings">
          <FeatureItem name="Simple / Advanced Mode">
            Simple Mode is the default. It gives muscle-tap selection, weight and reps logging, and a rest timer. Advanced Mode adds the implement picker, reps in reserve, supersets, drop sets, machine and grip tracking, custom exercises and templates. You can change the mode at any time. A change of mode does not change the data that you logged.
          </FeatureItem>
          <FeatureItem name="Exercise Cues (off by default)">
            Shows a short tip about hypertrophy or form under each exercise while you train.
          </FeatureItem>
          <FeatureItem name="Warm-Up Suggestions (off by default)">
            Adds warm-up sets before the first exercise for each muscle in a workout. The sets increase in weight, and you can tick each one.
          </FeatureItem>
          <FeatureItem name="Mobility Finisher (off by default)">
            Adds a mobility or stretch exercise at the end of each workout that the app builds.
          </FeatureItem>
          <FeatureItem name="Last Top Set">
            Shows the last top set that you logged for an exercise. It shows while you log the new set.
          </FeatureItem>
          <FeatureItem name="Cardio & Activity">
            A panel at the bottom of Home. Cardio does not count in your lifting stats, but it does change the readiness map above the panel. There are seventeen activities in two groups. Outdoor: run, walk, hike, cycle, swim, football and team sport. Indoor: treadmill, incline walk, stationary bike, spin, rowing machine, elliptical, stair climber, assault bike, jump rope and Other. Select a date and time, a duration, a distance if the activity has one, and an effort from RPE 1 to 10. The app calculates pace in the usual unit for each sport: min/km on foot, km/h on a bike, a /500m split on the rower and /100m in the pool. Each activity has its own muscles. A run fatigues the quads, calves and hamstrings directly. It fatigues the glutes, shins and core indirectly. A rower works the quads and back, and the erectors keep the body stable. A swim works the back and front delts. Football and team sports work the legs, like a run. A walk works all its muscles indirectly. If a walk counted as direct leg work, the map would show red legs for all people who walk to work. RPE 9 or 10 counts as hard. This is the same limit as a set at 0-1 RIR. The app records the time of an "Other" activity and logs it, but it does not change the map. The app cannot know which muscles that activity worked. All activities count towards your week streak and your consistency calendar.
          </FeatureItem>
          <FeatureItem name="Stats for Nerds">
            At the bottom of the Consistency screen. It has twelve panels:
            <ul style={listStyle}>
              <li>Lifetime sessions, sets, reps and tonnage, with a comparison that helps you understand the tonnage.</li>
              <li>A body diagram. The shade of each muscle shows its part of your total work.</li>
              <li>A donut chart of how often you go to failure. It counts only the sets where you recorded an effort.</li>
              <li>Reps by range, from strength to endurance.</li>
              <li>The balance of push, pull and legs.</li>
              <li>Your most frequent exercises.</li>
              <li>The largest changes in estimated 1RM, up and down, for lifts with at least six sessions.</li>
              <li>The hour of day when you train. This panel uses only sessions that the app timed itself. Thus imported sessions cannot make a false pattern.</li>
              <li>Your busiest weekday.</li>
              <li>Weight moved per week over six months.</li>
              <li>A record book: longest streak, longest break, busiest month and biggest session.</li>
              <li>Cardio time and distance by sport.</li>
            </ul>
            Tonnage counts only external load. Bodyweight and assisted work do not add to it. The app hides a panel until it has enough data.
          </FeatureItem>
          <FeatureItem name="Form">
            A gauge under the readiness map. It shows fitness, fatigue and form for all your training: lift sessions, runs and other sports. It is information only. It cannot predict injury. Each session gets a load: the effort (1 to 10) multiplied by the minutes. This is Foster's session-RPE method. For a lift session, the app gets the effort from your logged RIR. Fitness is the average daily load of about the last 42 days. Fatigue is the average daily load of about the last 7 days. Recent days count more. Form is fitness minus fatigue. After hard days, form is below zero. After rest days, form goes up. The gauge needs about four weeks of history before it shows a value. Tap the info button to see your numbers and the zones.
          </FeatureItem>
          <FeatureItem name="Muscle Readiness Map">
            Shows or hides the body diagram recovery map on the Home screen.
          </FeatureItem>
          <FeatureItem name="Training Defaults">
            A separate screen that you open from Settings. It holds values that the app selected for you before. You can set the rest time for compound and isolation exercises (30 seconds to 10 minutes). You can set if the timer starts automatically, and if it beeps and vibrates when it ends. You can also set the number of set rows for a new exercise, the recovery speed of muscles, and the number of past sessions of a lift that the charts can use.
          </FeatureItem>
          <FeatureItem name="Randomize Exercise Selection">
            When this setting is off, the workouts that the app builds use exercises in a fixed ranked order. When it is on, the app selects exercises in random order for variety.
          </FeatureItem>
          <FeatureItem name="Replay App Tour">
            Shows the first-run tour again. Use it at any time from the bottom of Settings.
          </FeatureItem>
        </FeatureSection>

        <FeatureSection title="Free for Everyone">
          <FeatureItem name="All features are free">
            Skid Marks is free and open source (GPL-3.0). There is no trial, no subscription and no purchase. Nothing expires.
          </FeatureItem>
          <FeatureItem name="Your data is yours">
            All your data stays on your phone. There is no account and there are no ads. Backup in Settings always works.
          </FeatureItem>
        </FeatureSection>
      </div>
    </div>
  );
}
