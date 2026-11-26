/* ---------------------------------------------------------------
   WHAT'S NEW

   Shown once per version, on the first launch after an update. Upgrades
   are silent otherwise — someone who installed a new APK has no idea what
   changed unless the app tells them.

   Deliberately not shown on a brand-new install: a first-time user gets
   the tour instead, and a changelog for a release they never saw is
   noise. The stored version is set on first run without the screen ever
   appearing, so the first thing they see is the tour and the first
   changelog they get is the next real update.

   To ship a release: bump "version" in package.json (Vite reads it into
   __APP_VERSION__) and add an entry at the top of RELEASE_NOTES. If the
   version has no entry the screen never appears, so forgetting the notes
   fails quietly rather than showing an empty modal.
--------------------------------------------------------------- */

export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
export const LAST_SEEN_VERSION_KEY = "last-seen-version";


export const RELEASE_NOTES = [
  {
    version: "2.2.0",
    released: "2026-11-26",
    headline: "Skid Marks is now also a website. Use it on an iPhone, an Android phone or a computer.",
    items: [
      {
        title: "Web app",
        body: "Open joebrowse.github.io/skidmarks/app/ in a browser. On an iPhone, tap Share, then Add to Home Screen. On Android, tap Install app. The web app has the same features, with some limits.",
      },
      {
        title: "Honest limits",
        body: "In a browser, GPS and voice cues stop when the screen locks. Reminders and the watch link need the Android app. Settings > Web version shows all the limits.",
      },
      {
        title: "Source code link",
        body: "Settings has a link to the source code on GitHub. Skid Marks is free and open source (GPL-3.0).",
      },
    ],
  },
  {
    version: "2.1.1",
    released: "2026-11-26",
    headline: "The app opens faster.",
    items: [
      {
        title: "No opening animation",
        body: "The opening animation is removed. The app opens directly.",
      },
      {
        title: "No quote on Lift home",
        body: "The daily quote is removed from Lift home. The screen shows your training first.",
      },
    ],
  },
  {
    version: "2.1.0",
    released: "2026-11-26",
    headline: "Choose running, lifting or both. The app plans one week for you.",
    items: [
      {
        title: "Running, lifting or both",
        body: "A new first screen asks what you use the app for: running, lifting or both. You can change this later in Settings. A short tour then shows each part.",
      },
      {
        title: "Your week",
        body: "Tell the app which days you can train, how many runs and lift sessions you want, and what matters most. The app proposes a week and gives a reason for each choice. Heavy leg days stay away from hard runs and the long run. You can change any day.",
      },
      {
        title: "A setup on each page",
        body: "Run and Lift each have their own setup. Lift asks your level. Then enter your current plan, or let the app make one for you.",
      },
      {
        title: "Unplanned sessions change the plan",
        body: "Log a run or a lift session on a day with no plan for it, and the week adjusts. For example, an unplanned leg day makes the next hard run easy. You see each change and its reason, and you can undo it.",
      },
      {
        title: "I feel really tired",
        body: "A new button makes today easier. Illness, injury, readiness and tiredness now also change your gym days.",
      },
      {
        title: "Strava file import removed",
        body: "The import of Strava export files is removed. You can still import GPX, TCX and FIT files from your watch.",
      },
    ],
  },
  {
    version: "2.0.0",
    released: "2026-11-25",
    headline: "Iron Log is now Skid Marks. It is a free running coach and gym tracker in one app.",
    items: [
      {
        title: "A new name",
        body: "The app has a new name: Skid Marks. The gym tracker is now called Lift. Lift works as Iron Log did. All your workouts, programmes and settings are still here. Your old Iron Log backups still restore.",
      },
      {
        title: "All features are free",
        body: "There is no trial, no subscription and no paywall. All features are free for all users. There are no ads and no account. The app sells no data. Skid Marks is open source under the GPL-3.0 licence.",
      },
      {
        title: "Plan, Run and Lift",
        body: "The app now has three modes. A switch at the top of each home screen shows Plan, Run and Lift. Tap a mode to open it. You can also tap the name at the top. Plan shows your week of runs and gym days. Run is the running coach. Lift is the gym tracker. Plan and Run are new. They get more features in the next versions.",
      },
      {
        title: "One training load for all modes",
        body: "Runs, gym sessions and other sports now share one training load. The load of a session is its effort multiplied by its minutes. A new Form gauge shows fitness, fatigue and form. It replaces the old load scale on the home screen. It is information only. It cannot predict injury. The streak now counts weeks, not days. A rest day does not break it.",
      },
      {
        title: "Runner presets",
        body: "Three new programmes are available. Runner strength, 1 day, is one full-body session for runners. Runner strength, 2 days, has a legs and core day and an upper day. Beginner machines has five machine moves at 2 sets of 10 reps, with hints to start light.",
      },
      {
        title: "More sports and back-dated logs",
        body: "Cardio and Activity now has Football and Team Sport. They count as leg work on the readiness map, as a run does. Each log form now has a date field, so you can log a past day.",
      },
      {
        title: "A shorter start",
        body: "The opening animation plays on the first start only. You can turn it on for each start in Settings. In Simple Mode, the first tour has four cards. The full tour is in Settings.",
      },
    ],
  },
  {
    version: "1.29.0",
    released: "2026-10-26",
    headline: "We removed the Strava strength file. Sharing to Strava works as it did before.",
    items: [
      {
        title: "One button again",
        body: "This version removes the strength file that version 1.28.0 added. To send the file, you had to use the Strava web uploader in a browser, not the Strava app. Also, Strava did not show the result as a correct strength log. So the method was worse, and the result was also worse. Share to Strava is one button again. It puts the session into text and gives the text to the share sheet. Then the Strava app opens with the post ready. No other part of sharing changed. This change has no effect on the data that you logged.",
      },
    ],
  },
  {
    version: "1.28.0",
    released: "2026-10-26",
    headline: "Iron Log sends your lifts to Strava as strength data, not as a paragraph of text.",
    items: [
      {
        title: "A Strava strength file (removed in 1.29.0)",
        body: "In May 2026, Strava made a new version of its strength training feature. The new workout log holds sets, reps and weight. A muscle map shows the muscles from the exercises in the activity. On the same day, Strava started to read set data from uploaded FIT files. Iron Log now makes this type of file. On a finished workout or on a session in History, tap Strava strength file. Then upload the file. The activity arrives in Strava as weight training, with each set, rep and weight. The data is not text in the description.",
      },
      {
        title: "Matched to the exercise types of the file format",
        body: "The app matches each exercise to an exercise type that the file format defines, for example bench press, row, squat or pull-up. If the format has a variant that is truly the same movement, the app uses that variant. It selects the barbell or dumbbell version from the implement that you logged. Fifty-three of the seventy-four exercises go across by name. These include all eight mobility stretches. The other twenty-one exercises send only their category. The format has no correct name for them, and the muscle map reads the category. A wrong name would show your work on the wrong muscle.",
      },
      {
        title: "The app asks about your own exercises and does not guess",
        body: "An exercise that you added yourself has no Strava type. The first time that you send a session with such an exercise, the app tells you. It asks you to select the nearest type. The app selects its own guess first, from the muscle that you gave the exercise. The list has all the types that the format knows. These include sleds, sandbags, battle ropes, tyres, suspension straps and bands, and also the lifts. If a movement has no correct type in the list, the first option is to not send that exercise. The app remembers your answer, so it asks about each exercise only one time. The app asks only when you send to Strava. It asks only about the exercises where it must guess. If you add a second copy of a lift that already exists, the app knows that it is the same lift. If you change the name of a built-in exercise, the app does not ask. If you never use Strava, the app never asks.",
      },
      {
        title: "What the app measures and what it divides",
        body: "Each rep, each weight and the exercise of each set come from your log. The start time, finish time and length of the session also come from your log. The time of each set in the session does not come from your log. Iron Log records the time of the session, not of each set. So the app puts the sets in the order that you logged them. Each set gets an equal part of the real session length. Bodyweight and assisted sets have no weight value. They do not show a weight of zero.",
      },
      {
        title: "The rest timer works when the screen is locked",
        body: "Before, the timer subtracted one each second. This works only while something runs the clock. When the screen locks or you change to a different app, nothing runs the clock. A browser slows a hidden page to about one tick each minute. A locked phone stops the clock fully. So two minutes in your pocket showed as only ten seconds. Now the timer counts to a fixed end time. It does not count down a number. When you come back, the time on the screen is correct. Pause still stops the timer, and +15s still adds fifteen seconds. If an alert is more than three seconds late, the app cancels it. You do not get an alert for a rest that ended minutes before.",
      },
      {
        title: "The web app asks to keep your data",
        body: "On the web, the app keeps all data in the browser storage. By default, a browser can clear this storage when it needs the space. The app now asks the browser to make this storage persistent. Chrome gives this permission without a prompt to an installed app that you use. The Android version does not need this. It writes to the storage of the phone, and that storage was never at risk.",
      },
      {
        title: "The description text is still available",
        body: "The second button does what the old button did. It puts the session into text for the activity description. The description is the only part that a reader can see before they open the activity.",
      },
    ],
  },
  {
    version: "1.27.0",
    released: "2026-10-12",
    headline: "The app now opens with an animation. You can also change the order of a programme.",
    items: [
      {
        title: "An opening animation",
        body: "First, a point of light and a shockwave appear. Then an icosahedron turns in space. It has twelve vertices from the golden ratio and thirty edges. It has real rotation and real perspective. Then the icosahedron breaks apart. Each piece moves at the velocity that it had at the time of the break. The pieces then move together to make the words IRON LOG. The app reads the positions from the pixels of the wordmark. So the letters are the real letters, at the correct size for your phone. Then the screen opens from the middle and shows the app. The app runs below the animation for all of this time.",
      },
      {
        title: "You control it",
        body: "Tap anywhere to skip the animation. It plays one time each launch. It does not play each time that you come back from your music app. If your phone is set to reduce motion, the animation does not play. To turn it off permanently, use the Opening Animation switch in Settings.",
      },
      {
        title: "Change the order of programme exercises",
        body: "Before, you could add exercises to a day of an active programme and remove them. You could not change their order. The order stayed as the builder made it. Now each exercise has up and down arrows. These are the same arrows as in the builder and in the live workout. The app saves the new order immediately when you tap. You do not need a save button.",
      },
    ],
  },
  {
    version: "1.26.0",
    released: "2026-09-22",
    headline: "A list of all versions of the app, with the date of each one.",
    items: [
      {
        title: "Version History, at the bottom of Settings",
        body: "The list shows each release, from the first release to the release that you use now. The newest release is first. Each release shows the date when it came out and one line about its changes. Tap a release to read all of its notes. These are the same notes that the app showed on the day of that release. The list marks the version that you have.",
      },
      {
        title: "The first version",
        body: "The list starts at v1.0.0 on 17 July 2026. That version had no changelog, because it had no previous version. It has one now. The notes show what the app had on the first day: workouts logged by split, the readiness map, a rest timer that starts automatically, history, personal bests, estimated 1RMs, charts and templates.",
      },
      {
        title: "Exact dates in the changelog",
        body: "Before, each release showed only a month, so four releases showed \"August 2026\". Now each release shows the exact day when it came to the app. The app writes the date in full, for example 21 September 2026, not 21/09/2026. In about half of the world, 21/09/2026 has a different meaning.",
      },
    ],
  },
  {
    version: "1.25.0",
    released: "2026-09-21",
    headline: "The app now calculates training load with the method from sports research.",
    items: [
      {
        title: "Stats for Nerds",
        body: "A button at the bottom of Consistency opens twelve panels. One panel shows your total tonnage, with an object of the same weight for comparison. One panel shows a body diagram, with shading for the muscles that do your work. One panel shows how often you train to failure. It counts only the sets where you recorded the effort. Other panels show your reps by range, and push compared with pull and legs. Others show your most frequent exercises, and the lifts that increased most and decreased most. Others show the hour and the day when you train, and the weight that you move each week. A record book shows your streaks, gaps and biggest session. The last panel shows your cardio totals by sport. A panel that has no data does not appear.",
      },
      {
        title: "The fatigue bar is now the acute:chronic workload ratio",
        body: "The old bar used our own formula, and it showed your week incorrectly. The new bar uses a common sports-science measure. The app gives each session a load with Foster's session-RPE method. The load is how hard the session felt, multiplied by how long it lasted. The app compares the last 7 days with the last 28 days. Both use exponential weighting. Gabbett's zones give the colours of the bar. After this release, the app labelled the scale as information only. Research disputes the ratio as a predictor of injury. The ratio divides by your own 28-day average. So it can tell the difference between a heavy week for you and a heavy week for any person.",
      },
      {
        title: "An info button on the training load",
        body: "The button is at the top right of the scale. It shows what the ratio is. It shows your acute and chronic numbers and the time window of each number. It shows where the load of a session comes from. It shows all four zones and their limits, and what the drag function does. It also gives links to the three papers that the feature uses: Foster for session RPE, Gabbett for the zones and Williams for the weighting. A fourth link goes to Lolli. This paper explains why the ratio is information only and cannot predict injury. The panel is closed by default, so the bar itself shows no words.",
      },
      {
        title: "Drag the marker to see a target",
        body: "Move the line along the scale. The app then tells you what you must do to get to that point. If you move it down, the app shows the hours of rest that you need. It also shows the time and date when you get there. Only rest lowers the ratio. The ratio decreases by a fixed factor each day, so the answer is exact and not a guess. If you move it up, rest cannot get you there. So the app shows a session: the minutes at RPE 8 that would put you at that point today. When you release the marker, it goes back to its position. The marker does not set or change any data.",
      },
      {
        title: "A scale with a marker, not a bar that fills",
        body: "A bar that fills tells you that more is worse. The ratio does not mean that. A value that is too low is also a risk, and the target is a band in the middle. Now the colour is part of the scale: red, then green, then red again. A line shows your position. The paragraph below the scale is removed.",
      },
      {
        title: "A different quote each day",
        body: "Before, the home screen showed \"Ready to train?\" each day. After one week, people do not see it any more. Now the home screen shows one of 365 quotes. The date selects the quote. All users see the same quote on the same day, and a new quote the next day. No quote repeats until the next year. The quotes come from philosophers, physicists, comedians, novelists, boxers and pop stars. Examples are Marcus Aurelius, Marilyn Monroe, Alan Turing, Churchill, Nina Simone, Groucho Marx, Dolly Parton and Terry Pratchett. Not all quotes are about motivation. No quote is anonymous. Each quote shows the person who said it and the year. \"c.\" shows that the year is a best estimate. \"attributed to\" shows that it is not certain that the person said it.",
      },
      {
        title: "Two numbers removed",
        body: "The adherence percentage is removed from the progress screen of a programme. The screen still shows sessions against the plan, sets logged, total volume and your biggest lifts. It shows what you did. It does not give you a score out of ten. The bodyweight graph also has no fitted trend line now. It shows your weigh-ins, connects them with a line and marks your goal. You decide what the graph means. The progress charts for each lift keep their trend lines.",
      },
      {
        title: "Edit an activity later",
        body: "To change a logged run, ride or swim, tap its pencil. You can change all of it: the type, the date and time, the distance and the effort. If you move an activity to a different day, the app puts it in the correct order. All parts that use the activity also change: the map, the streak and the load scale.",
      },
    ],
  },
  {
    version: "1.24.0",
    released: "2026-09-21",
    headline: "See when to take a rest day, and log the cardio that you do.",
    items: [
      {
        title: "Training load, below the readiness map",
        body: "This is a measure that sports science already uses. It is not our own measure. Each session gets a load from Foster's session-RPE method. The load is how hard the session felt, multiplied by how long it lasted. The app compares the last 7 days of load with the last 28 days. Below 0.8 is less than your usual training. From 0.8 to 1.3 is near your usual training. Above 1.5 is a sharp increase. Since then, the app labels the scale as information only. The scale cannot predict injury. The zones give the colours of the bar. A marker shows your position, so you can read the bar quickly without text below it. The measure compares you with your own fitness level. So the same week can be a normal week for one person and a sharp increase for a different person.",
      },
      {
        title: "Fifteen cardio options, indoor and outdoor",
        body: "Outdoor: run, walk, hike, cycle and swim. Indoor: treadmill, incline walk, stationary bike, spin, rower, elliptical, stair climber, assault bike and jump rope. Each option knows the muscles that it trains. For example, a rower trains the quads and back, a swim trains the back and delts, and an assault bike trains almost all muscles. Each option uses its own unit: min/km on foot, km/h on a bike, a /500m split on the rowing machine and /100m in the pool.",
      },
      {
        title: "Log a run later",
        body: "The activity form now has a date and a time. Before, the app used the time when you logged the activity. If the time of a run is six hours wrong, the readiness map shows incorrect data.",
      },
      {
        title: "Cardio counts for your streak",
        body: "A day with a run or a hike now counts for the day streak. It also fills a square on the consistency calendar, the same as a day in the gym.",
      },
    ],
  },
  {
    version: "1.23.0",
    released: "2026-09-13",
    headline: "Log effort with the scale that you already use. Also log the days when you do not lift.",
    items: [
      {
        title: "Runs, walks and rides, at the bottom of Home",
        body: "A small panel below Stats records training that is not lifting. Enter a time and a distance, and the app calculates your pace. Add an effort from RPE 1 to 10, and the readiness map uses it. After a hard run, the quads, calves and hamstrings need more time to recover. A walk has almost no effect. For \"Other\", the app records only the time. It does not guess which muscles you trained. These activities do not change your set counts, weekly volume or training log.",
      },
      {
        title: "RIR or RPE, your choice",
        body: "You can now read the circle next to each set in two ways: reps in reserve as before, or RPE out of 10. Select the scale in Settings → Training Defaults. The two scales are the same measurement, counted from opposite ends. For example, 2 reps in reserve is RPE 8. So this setting changes only the labels. The app does not change data that you already logged. The readiness map reads the data in the same way as before. If you change back, the app shows all your history in the old scale again.",
      },
    ],
  },
  {
    version: "1.22.0",
    released: "2026-09-12",
    headline: "Progress charts show the real trend. One unusual session no longer makes the chart hard to read.",
    items: [
      {
        title: "A trend line on every progress chart",
        body: "A straight blue line on your history shows the real direction of a lift. The total change over the period shows next to it.",
      },
      {
        title: "Unusual sessions no longer change the chart",
        body: "Sometimes you load the same lift in a different way. For example, you do an incline press with a barbell, not with dumbbells. The weight is then higher, but you are not stronger. A weight that you typed incorrectly can be even higher. The app now finds both types of session and does not show them on the chart. So the chart shows the work that you did. One unusual session no longer pushes all other data to the bottom of the chart. The app shows the number of hidden sessions next to the trend. The app does not change or remove data in your history.",
      },
      {
        title: "Your weight goal on the weight chart",
        body: "A dotted blue line on the bodyweight graph shows the goal that you set. You can quickly see how far you are from it.",
      },
      {
        title: "Enter your weight only once",
        body: "Personal Info and Weight Tracking are on the same screen, and both record your weight. If you change one of them, the other now changes immediately.",
      },
      {
        title: "Training Defaults: you set the numbers",
        body: "Go to Settings → Training Defaults. Set the rest time for compound and isolation exercises, from 30 seconds to 10 minutes. Set whether the timer starts automatically, beeps and vibrates. The vibration is new. A gym is loud, and a phone is usually in a pocket. Set the number of set rows that an exercise starts with. Set how fast you recover. This changes the full readiness map, but chest and side delts still keep their different times. Set how much history each exercise keeps. Before, this was always 20 sessions. Now it can be up to 250 sessions. The three rest switches moved from the main Settings list to the rest time settings. So the main list is now shorter.",
      },
      {
        title: "Bodyweight lifts now have a bodyweight option",
        body: "Hanging leg raises, planks, ab wheel, reverse crunches, dead hangs, bench dips, back extensions and glute-ham raises now have Bodyweight or Weighted options. Dips and pull-ups already had these options. With Bodyweight, the weight box shows a BW tile, not an empty field. The progress chart now shows these sets. Before, it showed nothing.",
      },
    ],
  },
  {
    version: "1.21.0",
    released: "2026-09-04",
    headline: "The rest timer now starts automatically. Also, a new breakdown shows the results of a session.",
    items: [
      {
        title: "Fixed: auto-start rest timer",
        body: "When you ticked a set, the rest countdown had to start automatically. But the app read the tick too early, so the timer never started. Now it starts each time, as it always had to.",
      },
      {
        title: "Tick boxes off: reps start the timer",
        body: "If you hide the tick boxes (Settings → Set Tick Boxes), there is nothing to tick. So the rest timer now starts when you enter the reps of a set.",
      },
      {
        title: "Session Breakdown on the finish screen",
        body: "A donut chart shows each set that you did. The colour of each set compares it with the same set in the last session. Green means more reps. Amber means the same reps or one fewer. Red means two or more fewer reps. The chart shows when there is a previous session to compare.",
      },
      {
        title: "Same colours during the workout",
        body: "During the workout, the border of a set uses the same scale. Amber replaces the old grey for \"held\". The border now shows one rep fewer (amber) differently from a real drop (red).",
      },
    ],
  },
  {
    version: "1.20.0",
    released: "2026-08-31",
    headline: "Share a workout to Strava.",
    items: [
      {
        title: "Turn it on in Settings",
        body: "Go to Settings → Share to Strava. This adds a button when you finish a workout. It also adds the button to each past workout in History.",
      },
      {
        title: "Your lifts, ready to paste",
        body: "The app puts the session into text. The text has the split, the number of exercises, the number of sets and the total weight moved. Then it lists each exercise with its sets and the implement that you used. The app gives the text to the share sheet. Then it opens Strava, so you can paste the text into the activity description.",
      },
      {
        title: "Why you paste and do not upload",
        body: "A direct post to Strava needs a secret key at sign-in. Iron Log has no server to keep a key. The key would have to be in the app, and anyone could take it. Also, Strava has no structured place for sets and reps. An activity has a name, a type, a duration and a description. So with both methods, the lifts are in the description text.",
      },
    ],
  },
  {
    version: "1.19.0",
    released: "2026-08-29",
    headline: "Tap the numbers from your last session to log them again.",
    items: [
      {
        title: "Repeat the last session with one tap",
        body: "The “last time” panel on each exercise is now a button. Tap it, and the app writes those weights and reps onto the card, with one row for each set that you did. Most sessions repeat the last session. Before, you had to type three identical rows again. This was the most frequent task in the app.",
      },
      {
        title: "It does not erase what you typed",
        body: "On an empty exercise, it fills the rows immediately. If you already logged data, the app asks first. It replaces the data only when you tap a second time.",
      },
      {
        title: "The app does not copy effort",
        body: "Weight and reps are a plan. Your distance from failure is a measurement. The app leaves reps in reserve empty, so you can log it. So the readiness map never gets a number that you did not give.",
      },
    ],
  },
  {
    version: "1.18.0",
    released: "2026-08-25",
    headline: "Light mode, and all display settings on one screen.",
    items: [
      {
        title: "Light mode",
        body: "Go to Settings → Colour & Display. Select dark, light, or the setting of your phone. Light mode is not the dark theme with inverted colours. Each colour has a second value for a pale background. Most colours that work on black are difficult to see on white.",
      },
      {
        title: "One screen for all display settings",
        body: "Theme, colour scheme and contrast are now together on one page. Before, they were in different parts of Settings. Each of these settings has an effect on the others, so they are together.",
      },
      {
        title: "The colour schemes work in both themes",
        body: "Each of the four schemes has its own light palette. It is not a lighter copy. Monochrome changes the order but does not invert: \"ready\" is always the most visible state. It is brightest on dark and darkest on light.",
      },
      {
        title: "Outlines that you can see",
        body: "The app draws each readiness outline in black or white. It selects the colour that is easier to see on the muscle below. So the outlines stay visible in the light theme, where the fills are dark. The outline is the backup for colour. If you cannot see the outline, it has no use.",
      },
    ],
  },
  {
    version: "1.17.0",
    released: "2026-08-25",
    headline: "The readiness map, for people who cannot see red and green.",
    items: [
      {
        title: "Colour schemes in Settings",
        body: "The map showed recovery with red, amber and green. This is the worst choice for the most common type of colour blindness. About one man in twelve could not always see the difference between recovering and ready. Settings now has a Colour & Contrast section with four schemes. These are the original scheme, a scheme for red–green deficiency and a scheme for blue–yellow deficiency. The fourth is a monochrome scheme that uses only brightness.",
      },
      {
        title: "All colours that have a meaning change",
        body: "The change is not only on the body map. The accent colour, the superset colours and the effort dial also change with the scheme. The set outlines that show a better or worse set than last time also change.",
      },
      {
        title: "Outlines, so colour is not the only signal",
        body: "In all schemes except the original, recovering muscles have a solid outline. Muscles that are almost ready have a dashed outline. A bad screen or an unusual type of colour blindness can make a palette fail. An outline does not fail in this way.",
      },
      {
        title: "High contrast",
        body: "This is a separate switch. It gives a pure black background, brighter text and thicker lines. It also turns on the outlines in all schemes. Use it for low vision, or for a phone at arm's length in a bright gym.",
      },
      {
        title: "See each scheme before you select it",
        body: "The page where you select the scheme shows the three states as they will look.",
      },
    ],
  },
  {
    version: "1.16.0",
    released: "2026-08-25",
    headline: "Better sessions when Iron Log selects the exercises for you.",
    items: [
      {
        title: "A ranking selects your exercises",
        body: "Auto-built workouts now follow a fixed priority list. Before, the app calculated the order during the build. A full-body session is squat, pull-up, dips, lateral raise, curl, pushdown and hanging leg raise. This is the best lift for each area, biggest first. If you train only some muscles, the app uses the same list without the parts that do not apply.",
      },
      {
        title: "Muscles alternate in the session",
        body: "Before, two chest exercises and one back exercise came in the order chest, chest, back. So the second chest exercise trained a chest that the first exercise had already made tired. Now the app puts the exercises in order one muscle at a time.",
      },
      {
        title: "Not more than three hard lifts",
        body: "A generated session has a maximum of three lifts that cause much fatigue. A short session uses these lifts and does not remove them. For example, a fifteen-minute session is squat, pull-up and dips, not a squat and two curls.",
      },
      {
        title: "Your own order has priority",
        body: "Use the arrows in the Exercise Database to change the order for a muscle. Your ranking then fills the slot for that muscle, not the built-in ranking. If the two rankings are different, the app uses yours.",
      },
      {
        title: "A week is seven days",
        body: "Before, programme progress counted sessions and called them weeks. So seven repeats of one full-body day showed as week four. Now the app counts real weeks from the day when you started the block. The session count next to it did not change, so you can still see how much of the block you did.",
      },
      {
        title: "One fewer question before you start",
        body: "Train Ready Muscles now asks only how much time you have. The strength or size option is removed. The ranking selects your exercises, so the extra tap had no effect.",
      },
    ],
  },
  {
    version: "1.15.0",
    released: "2026-08-25",
    headline: "Correct an exercise. You do not need to replace it.",
    items: [
      {
        title: "Edit each exercise in the database",
        body: "Tap the pencil next to an exercise. This can be your own exercise or an Iron Log exercise. You can change its name, its muscle, whether it is a compound, the other muscles that it trains and its cue. Before, the only method to correct an exercise was to delete it and add it again. This deleted all the sets that you logged for it.",
      },
      {
        title: "Your history stays with it",
        body: "The exercise keeps its identity, so your logged sets, records and charts stay with it. If you change its name or its muscle, the app updates each past workout. So your history is not split between the old name and the new name.",
      },
      {
        title: "A new indirect muscle also applies to past sessions",
        body: "Tick a muscle that an exercise also trains. Sessions that you logged months before then count for that muscle immediately. This applies to the readiness map and to weekly volume. You do not need to enter data again.",
      },
      {
        title: "Undo your changes",
        body: "The list marks a changed built-in exercise as Edited. You can reset it to the Iron Log version at any time. Your history then also goes back to the Iron Log version.",
      },
    ],
  },
  {
    version: "1.14.0",
    released: "2026-08-25",
    headline: "Dips and pull-ups now show the difference between assistance and added load.",
    items: [
      {
        title: "One button for the type of load",
        body: "Dips, pull-ups, push-ups and nordic curls now have one button on the card: bodyweight, assisted or weighted. Bodyweight needs no number. Assisted asks for the amount of assistance. Weighted asks for the weight that you added. If you change the option, the app clears the weights. It does not convert them, because assistance and added weight are opposite quantities.",
      },
      {
        title: "It remembers what you used",
        body: "The first time that you touch the weight box, the app shows the value from your last session with the same type of load. It shows the assisted value when you use assistance, and the weighted value when you add weight. Tap it to use it for all sets, or enter a new value.",
      },
      {
        title: "Progress shows in the correct direction",
        body: "Charts show the weight that you moved: bodyweight minus the assistance, or bodyweight plus the added weight. Before, a change from 40kg of assistance to 20kg looked like your numbers fell by half. Now it shows as progress. To turn this on, add your bodyweight in Personal Info. Without a weigh-in, the app has no correct number to show, so it does not make one up.",
      },
    ],
  },
  {
    version: "1.13.0",
    released: "2026-08-24",
    headline: "Find an exercise, and tell Iron Log which muscles your own exercises train.",
    items: [
      {
        title: "The database has a search box",
        body: "Before, the database listed exercises only by body part. This did not help if you did not know the body part of an exercise. Now there is a search box at the top of the database.",
      },
      {
        title: "It knows other names",
        body: "The search finds common alternative names and also the name on the entry. For example, Press-up finds Push-Up, OHP finds Overhead Press, RDL finds Romanian Deadlift and bent over row finds Bent-Over Row.",
      },
      {
        title: "Your own compounds can list their indirect muscles",
        body: "When you add a compound, the app now shows a list of other muscles that it trains. These muscles get partial fatigue on the readiness map and half a set each in weekly volume. The built-in exercises get the same treatment. Before, a custom exercise marked only one muscle.",
      },
    ],
  },
  {
    version: "1.12.0",
    released: "2026-08-21",
    headline: "A form video for each exercise, with one tap.",
    items: [
      {
        title: "Play button next to each lift",
        body: "Use this button to see how to do an exercise, or to check your setup during a session. Tap the play button next to the exercise name. Iron Log then opens a YouTube search for the exercise.",
      },
      {
        title: "It uses the implement",
        body: "The search includes the implement that you selected. So a search for a Smith machine bench press does not show a barbell bench press. For this reason, the button opens a search and not one fixed video for each exercise. Also, the link can never break.",
      },
      {
        title: "Still nothing to download",
        body: "The app contains no videos, and it keeps no copies of videos. The button opens YouTube. The app itself works offline, as before.",
      },
    ],
  },
  {
    version: "1.11.1",
    released: "2026-08-20",
    headline: "The tour now only shows you the app.",
    items: [
      {
        title: "The tour no longer darkens the screen",
        body: "Before, the tour made the screen grey and drew a ring around the item that it described. The ring was often in the wrong place, so it gave incorrect information. Its background also covered the text of the explanation. For this reason, the text sometimes looked pale. The tour no longer does these things. Now it shows the real screen and the text that explains it.",
      },
      {
        title: "It still opens each screen",
        body: "Each step still opens its screen and scrolls to the related part. That part always worked correctly. Only the box on top of it did not work.",
      },
    ],
  },
  {
    version: "1.11.0",
    released: "2026-08-20",
    headline: "Google now gives the free trial, and Iron Log is a subscription.",
    items: [
      {
        title: "7 days free, with a real trial",
        body: "Before, the app stored the trial date on your phone. So a reinstall reset the trial. Now it is a Google Play free trial. Play allows one trial for each account and enforces this rule. So the trial is the same for all users. Before, some users knew how to reset it.",
      },
      {
        title: "Monthly or annual",
        body: "Select one when you start the trial. The price is the Play price in your own currency. You can change or cancel the subscription at any time from Settings or from Google Play.",
      },
      {
        title: "It still works without a signal",
        body: "Iron Log must connect to Play only sometimes, to confirm the subscription. The app works for two weeks between confirmations. If your gym has no signal, the app does not lock your workout.",
      },
      {
        title: "You always keep your history",
        body: "Home, Settings and Backup stay open, with or without a subscription. If you cancel, the app stops, but you keep your training log. You can always export it.",
      },
      {
        title: "Lifetime unlock",
        body: "If you paid for the old one-time lifetime unlock, you keep it permanently. The app will never ask you to subscribe.",
      },
    ],
  },
  {
    version: "1.10.0",
    released: "2026-08-19",
    headline: "The readiness map now shows a real body.",
    items: [
      {
        title: "A real anatomical figure",
        body: "The simple block figure is removed. The front and rear views come from a correct anatomical chart. The chart has sixty-four muscle bellies. So your lats, traps, delts and triceps are in their real positions, not in a stack of rectangles.",
      },
      {
        title: "Each group still acts as one muscle",
        body: "Some groups have many bellies. For example, the lats have three segments on each side, the trapezius has six segments and the calf has three heads. Each group fills and responds to a tap as one muscle. So the map works as before when you read it or tap it for details.",
      },
      {
        title: "The rest of the body is visible",
        body: "The head, hands, feet, knees and hips are now grey, not almost black. So the figure stays complete on the dark background and does not look like separate pieces.",
      },
    ],
  },
  {
    version: "1.9.0",
    released: "2026-08-19",
    headline: "A new programme, one Squat in place of three, and a builder where you set the order.",
    items: [
      {
        title: "Project Arms",
        body: "This is a new preset: Upper, Lower, Arms, rest, and then the same four days again. It has two arm sessions each week. Both arm sessions have direct forearm work and end with grip work. Select it in the same way as a split. Before you start, change what you want.",
      },
      {
        title: "One Squat, four ways to do it",
        body: "Back Squat, Front Squat and Hack Squat are now one exercise, Squat. You select the variation for each session, as you select barbell or dumbbell for other exercises. A programme day can still specify a variation. For example, Project Arms specifies the hack squat. The chart shows each variation separately. The app moved all your logged data to Squat and tagged it with the variation.",
      },
      {
        title: "Three new exercises",
        body: "Hip Adduction, Eugene Curl and Reverse Eugene Curl are now in the database. So all programmes and the workout builder can use them, not only Project Arms. Both Eugene curls are in the Forearms group.",
      },
      {
        title: "Set the order of a day yourself",
        body: "Each exercise in the programme builder has up and down arrows. Preset days now also keep their original order. Before, the app put compounds first. So a farmer's carry could be at the top of your arms day.",
      },
      {
        title: "Add an exercise in the builder",
        body: "The add panel has two tabs. Select an exercise from the database, or make a new exercise immediately. The app saves each new exercise to the database correctly, so it also shows in all other parts of the app.",
      },
    ],
  },
  {
    version: "1.8.0",
    released: "2026-08-19",
    headline: "Recovery times now depend on the muscle and on how hard you trained it.",
    items: [
      {
        title: "Four recovery times for each muscle",
        body: "Each muscle now has its own time for four cases: trained hard, trained with reps in reserve, trained indirectly and hard, and trained indirectly with reps in reserve. The lower back needs four days after a session to failure. It needs one and a quarter days after indirect work with reps in reserve. Side delts need a maximum of one and a half days.",
      },
      {
        title: "Your RIR selects the recovery time",
        body: "With 0 or 1 reps in reserve, the muscle uses its time for failure. With 2 or more, it uses its time for reps in reserve. The difference is large. For example, squats to failure need 84 hours, and squats with reps in reserve need 54 hours. The hardest set of the session sets the time. If you do not log effort, the app uses 2+. So nothing changes if you do not want to record effort.",
      },
      {
        title: "Indirect work can now show red",
        body: "Before, indirect work always stayed at amber. The reason was that a synergist muscle is never fully tired. But after a hard bench press, the triceps really need 30 hours. Now the map shows this and does not round it down. Each muscle has its own indirect times. Before, all muscles used one shared fraction.",
      },
      {
        title: "The colours have the same meaning",
        body: "Green means ready. Amber means less than one day to go. Red means more than one day to go. Only the hours behind the colours changed.",
      },
    ],
  },
  {
    version: "1.7.0",
    released: "2026-08-11",
    headline: "Change an active programme. Also, you can no longer end a workout by accident.",
    items: [
      {
        title: "Edit your active programme",
        body: "Open Programme and tap a workout to see its exercises. Remove an exercise that does not work for you, and add a better one. You do not need to delete the programme and make it again. Changes start from your next session. The app does not change sessions that you already logged.",
      },
      {
        title: "Finish Workout needs two taps",
        body: "The Finish Workout button is now at the end of the list. It does not float over the list. The first tap only arms the button. The app saves nothing until you tap again. After a few seconds, the button disarms automatically.",
      },
      {
        title: "The superset panel stays visible",
        body: "To link exercises, you sometimes tap exercises far down the list. The panel now floats above the list, so you can always reach Link and Cancel.",
      },
      {
        title: "Dips are one exercise again",
        body: "Assisted and weighted are ways to load a dip. They are not different exercises. So they are now an option on the exercise, as barbell or dumbbell are for other exercises. Generated days now use plain Dips, and you select the load. The app moved all your Assisted Dips and Weighted Dips data to Dips and tagged it with the type of load.",
      },
      {
        title: "Better warm-up suggestions",
        body: "Before, the app rounded each warm-up step to the nearest 5kg for all lifts. So a 5.7kg cable set got three warm-up sets of 5kg. That was heavier than the working set. Now the steps change with the weight and never get to the top set. They show only on compounds, as the setting always said.",
      },
      {
        title: "Turn the tick boxes off",
        body: "Settings → Set Tick Boxes hides the box next to each set and warm-up set. Use it if you want to only type your numbers. This does not change the data that the app saves. The rest timer does not start automatically, so tap Start Rest when you want a rest.",
      },
      {
        title: "Progress charts are in body-part groups",
        body: "The list below the chart now has muscle groups that you can open and close. Before, it was one long list of all the exercises that you logged. The group of the exercise on the chart opens automatically.",
      },
    ],
  },
  {
    version: "1.6.0",
    released: "2026-08-04",
    headline: "A new exercise list, and each lift asks which implement you use.",
    items: [
      {
        title: "A new exercise list",
        body: "The list has sixty-six exercises in sixteen muscle groups. Each exercise has a good reason to be in the list. Near-duplicates that had only a different bar are now one entry. The groups are in the order that most people would select them.",
      },
      {
        title: "Barbell, dumbbell, Smith or machine: you select",
        body: "There is no longer a separate Barbell Bench Press and Dumbbell Bench Press. There is one Bench Press, with a row of implements that you tap. This works in the same way as grip and machine brand. Thirty-two exercises have this choice. Exercises that you can do in only one way do not ask.",
      },
      {
        title: "Programmes select and show an implement",
        body: "A generated day shows the implement that it selected. You can change it immediately. Your “last time” comparison also uses the implement. For example, if you change from barbell to dumbbell, the target changes to your last dumbbell session. It does not show a number that you cannot do.",
      },
      {
        title: "Lower Back and Shins are new groups",
        body: "Deadlifts and back extensions are now Lower Back exercises, not Back exercises. Tibialis raises now have a group. Both groups have their own area on the readiness map and their own recovery time.",
      },
      {
        title: "Four types of dip",
        body: "Dips, Assisted Dips and Weighted Dips are in Chest. Seated Dips are in Triceps, because that is the correct group for that version.",
      },
      {
        title: "All your logged data moved with the changes",
        body: "The app changed each old exercise to its replacement and kept the implement of the old exercise. For example, a Smith bench is now a Bench Press marked Smith Machine. History, PBs, 1RM goals, templates, programmes and your custom order all moved with the exercises. When two entries became one, the app merged the data and did not delete it.",
      },
    ],
  },
  {
    version: "1.5.0",
    released: "2026-08-03",
    headline: "Backups, effort tracking and clear information about your numbers.",
    items: [
      {
        title: "Front, side and rear delts are separate",
        body: "“Shoulders” is removed. Overhead presses and front raises are Front Delts. Lateral raises and upright rows are Side Delts. Face pulls and reverse flys stay in Rear Delts. Each group has its own position in the exercise order and its own area on the readiness map.",
      },
      {
        title: "Each delt group has its own recovery time",
        body: "Front delts do the heavy pressing work, so they need 48 hours. Side delts and rear delts need 24 hours. Lateral raises on the day after an overhead press session no longer look like you train a muscle that has not recovered. They do not train the same muscle.",
      },
      {
        title: "Presses show the correct muscles",
        body: "Bench press now marks your front delts, not all of your shoulder. Overhead presses count for the side delts as indirect work.",
      },
      {
        title: "Your history moved with the change",
        body: "The app moved all logged data to the correct group for each exercise. Past sessions, saved templates, programmes and your custom exercise order all stay correct. You do not need to do anything again.",
      },
      {
        title: "Progress charts filter by machine",
        body: "If you logged an exercise on more than one machine, a list shows next to its name. Select a brand, and the chart shows only that machine. So the chart does not show the weights from two gyms as one irregular line.",
      },
      {
        title: "“Last time” matches your current machine",
        body: "Enter the machine, and the comparison changes to your last session on that machine. If you never used the machine, the app tells you. It does not give you a target from a different machine. The most recent session stays below for reference.",
      },
      {
        title: "Tag past sessions",
        body: "When you edit a workout in your history, you can now add the machine and grip that you used. Use this for sessions that you logged before you started to record these details.",
      },
      {
        title: "Back up all data to one file",
        body: "Settings → Backup writes all your training history to your Downloads folder. It shows you the exact filename and path. Use the same screen to restore the data. Make a backup today. The app keeps your data only on this phone.",
      },
      {
        title: "Log the effort of a set",
        body: "Advanced Mode adds a blue circle to each set. With one tap, select how many reps you had in reserve: 0 for failure, 3+ for a set that stopped well before failure. On the readiness map, sets to failure now make the recovery time of that muscle longer. Easy sets make it shorter.",
      },
      {
        title: "Charts that show progress correctly",
        body: "Progress now shows estimated 1RM by default. So 100kg for 5 reps, then 95kg for 10 reps, shows as an improvement, not a decrease. Top-set weight and total volume are still available with one tap.",
      },
      {
        title: "Notes, and a rest timer that starts automatically",
        body: "Add a note to an exercise, for example seat height or how it felt. The note shows again the next time that you do the exercise. When you tick a set, the rest countdown now starts automatically.",
      },
      {
        title: "Tape measurements",
        body: "Personal Info records chest, waist, hips, arms, thighs and calves, and also bodyweight. It shows the change since your first measurement. Your bodyweight can stay the same for months while these measurements change.",
      },
      {
        title: "Select Simple or Advanced at the start",
        body: "New installs now show the two modes on the first screen. A simple table next to them shows what the trial includes and what the one-off unlock keeps.",
      },
    ],
  },
  {
    version: "1.4.0",
    released: "2026-08-01",
    headline: "One rule for the readiness colours: amber always means ready tomorrow.",
    items: [
      {
        title: "Amber now has the same meaning for all muscles",
        body: "Green means ready. Amber means less than one day to go. Red means more than one day to go. All muscles use the same rule. So you do not have to remember different limits for different muscles. Amber always means that you can train the muscle tomorrow.",
      },
      {
        title: "Muscles that recover quickly no longer show red",
        body: "Arms, side delts, rear delts, abs, calves and forearms need one day. So they are never more than one day from ready. They go directly to amber and then become ready.",
      },
      {
        title: "Indirect work always shows amber",
        body: "Some muscles work in a lift but are not its target. These muscles recover in half their usual time, and never need more than one day. So indirect work can never make them show red.",
      },
    ],
  },
  {
    version: "1.3.0",
    released: "2026-08-01",
    headline: "The readiness map now shows the effect of your compound lifts on other muscles.",
    items: [
      {
        title: "Face pulls train your rear delts again",
        body: "Cable Face Pull and Rear Delt Cable Fly were in Shoulders. So after these exercises, the rear delts showed as fully recovered. They are now Rear Delts exercises, which is the correct group.",
      },
      {
        title: "Indirect work counts",
        body: "Bench press makes your triceps and front delts tired, but it is a chest exercise. Now, muscles that do hard work in a lift but are not its target show amber on the map, never red. They recover in half the usual time. For example, after bench press your chest is red and your triceps are amber.",
      },
      {
        title: "Traps and forearms are on the map",
        body: "The app recorded both muscles before, but the map did not show them. Now they have their own areas. This is important when deadlifts, rows, shrugs and hammer curls count for them.",
      },
      {
        title: "Tap a muscle to see the type of work",
        body: "If only indirect work keeps a muscle from ready, the app tells you, for example “worked indirectly 4h ago”. So when the app tells you to rest your triceps after a chest day, you know why.",
      },
      {
        title: "Leg press no longer counts as a press",
        body: "Leg press had the same movement label as bench press and overhead press. So in a generated full-body session, it used up the limit on press movements.",
      },
    ],
  },
  {
    version: "1.2.0",
    released: "2026-08-01",
    headline: "Muscle readiness now counts hours, and each muscle has its own recovery time.",
    items: [
      {
        title: "The app measures recovery in real hours",
        body: "Before, readiness used the date of a session, not the time. So if you trained at 8pm and came back at midnight, the app counted a full day of recovery. Now it counts the real hours since the session.",
      },
      {
        title: "Red, amber, green for each muscle",
        body: "Each muscle has its own two limits, not one shared scale. Arms, side delts, rear delts, abs, calves and forearms recover in 24 hours. Chest, front delts, back, traps and quads need 48 hours. Hamstrings and glutes need 72 hours. Amber is the last period before ready.",
      },
      {
        title: "It shows the time that remains",
        body: "Tap a muscle to see how long ago you trained it and how many hours remain until it is ready. The same countdown shows next to each muscle when you select what to train.",
      },
      {
        title: "The map updates automatically",
        body: "Readiness updates automatically. When a muscle becomes green, you do not have to open the app again to see it.",
      },
    ],
  },
  {
    version: "1.1.0",
    released: "2026-07-30",
    headline: "Many fixes, and the app now looks as it was designed.",
    items: [
      {
        title: "The correct typeface",
        body: "Iron Log always specified its condensed display font, but it never loaded the font. So each phone used a different font. Now the app includes the correct font, and the font works offline.",
      },
      {
        title: "Better guided programmes",
        body: "Before, generated sessions sometimes made strange choices. For example, a session had a deadlift on an upper day, or a pull day had no pull exercise. Now each day follows a correct template. Compounds come first. The app adds isolation exercises only when you have time.",
      },
      {
        title: "The app uses your exercise order",
        body: "The Exercise Database shows all variations in one ranking. You can put Bench Press, Dips and Incline Press in the order that you want. Auto-built workouts use this order.",
      },
      {
        title: "Sets show progress when you log",
        body: "The weight and reps get a green outline when you do better than last time. They get a red outline when you do less, and a grey outline when you do the same. You do not have to calculate during a set.",
      },
      {
        title: "The app remembers supersets",
        body: "Each exercise shows its superset partner from last time. When you copy a past workout, the app also copies its superset pairs.",
      },
      {
        title: "A full-year consistency calendar",
        body: "The calendar has one square for each day of the year, month by month. Use the arrows to see previous years.",
      },
      {
        title: "Programme Progress now opens",
        body: "The Progress button on an active programme did not work before. Now it works. Biggest Strength Gains no longer shows a loss only because a block ended with a deload.",
      },
      {
        title: "Easier to read",
        body: "Small text is bigger and contrast is better on all screens. The Home screen and the feature list are simpler.",
      },
    ],
  },
  // Where it started. No changelog was written at the time — there was
  // nothing to change from — so this one is a description of what shipped
  // rather than a list of what moved, taken from the code as it stood on the
  // day. It exists so Version History has a beginning.
  {
    version: "1.0.0",
    released: "2026-07-17",
    headline: "The first version: log a session and see its effect on your muscles.",
    items: [
      {
        title: "Log by split",
        body: "Select a split, select your exercises, and log the weight and reps for each set. When you finish, the app keeps the session on the phone. You do not need to sign in.",
      },
      {
        title: "The muscle readiness map",
        body: "A body diagram shows colours for the muscles that you trained recently. The colours show how long each muscle needs to recover. A Train Ready Muscles button makes a session from the green muscles.",
      },
      {
        title: "A rest timer that starts automatically",
        body: "When you log a set, the timer starts. The rest time depends on the type of lift: compound or isolation.",
      },
      {
        title: "History, personal bests and estimated 1RMs",
        body: "The app keeps each session, and you can search them. It shows your best set for each lift. It estimates your one-rep max from your top set. You do not have to test it.",
      },
      {
        title: "Charts from the first day",
        body: "The app has progress charts for each exercise, weekly volume for each muscle and a training streak.",
      },
      {
        title: "Templates",
        body: "Save a session that you like. Next week, start the same session again.",
      },
    ],
  },
];

export function releaseNotesFor(version) {
  return RELEASE_NOTES.find((r) => r.version === version) || null;
}

/* Releases carry an ISO date so they can be sorted and formatted rather than
   read as prose. Written out longhand because "21/09/2026" and "09/21/2026"
   are the same eleven characters and mean different days. */
export const RELEASE_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatReleaseDate(iso, short) {
  const parts = String(iso || "").split("-");
  if (parts.length !== 3) return iso || "";
  const [y, m, d] = parts.map(Number);
  const month = RELEASE_MONTHS[m - 1];
  if (!month) return iso;
  return `${d} ${short ? month.slice(0, 3) : month} ${y}`;
}
