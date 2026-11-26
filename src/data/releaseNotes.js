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
    headline: "Skid Marks: a free running coach and gym tracker in one app.",
    items: [
      {
        title: "A new name",
        body: "The app has a new name: Skid Marks. The gym tracker is now called Lift. All your workouts, programmes and settings are still here. Your old backups still restore.",
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
