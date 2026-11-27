# CLAUDE.md: Skid Marks

## What this is

**Skid Marks** is a free running coach and gym tracker in one Android app (React 18 + Vite, wrapped with Capacitor 8). It has three modes: **Plan** (the master week), **Run** (the running coach) and **Lift** (the gym tracker). All features are free. No ads, no accounts, no data sales. Data stays on the phone. Licence: GPL-3.0-or-later.

- Package ID: `com.skidmarks.app`. App version: see `package.json`.
- The decisions for V1 are in `docs/v1-spec.md`, and for 2.1 in `docs/v1.1-spec.md` (first open, hybrid week, setups; section 7: the simpler 2.4 Plan and Run, with Run in beta). Read them before you change behaviour. The rules for running and lifting together come from `docs/research/concurrent-training.md`.

## Writing style

The owner asks for **ASD-STE100 Simplified Technical English** everywhere: UI text, documents, comments in new code, commit messages and replies. Short sentences (about 20 words or fewer), active voice, common words, one fact or instruction per sentence, no contractions, no idioms.

Do not change these when you edit text: exercise, muscle and split names, technical terms (RIR, RPE, 1RM), and any string that code stores, compares or uses as a key.

## Commands

```bash
npm install
npm run dev     # development server
npm test        # node --test test/ (engine, warm-up, import, plan state, recorder)
npm run lint    # parses every file under src/
npm run build   # production build into dist/
```

Web: `.github/workflows/pages.yml` publishes GitHub Pages on each push to `main`: `docs/index.html` at `https://joebrowse.github.io/skidmarks/` and the web app (the same Vite build) at `/app/`. The limits of the web version are in `WEB_LIMITS` (`src/lib/webApp.js`) and in the limits table of `docs/index.html`. Change both together (`test/web-app.test.mjs` checks the titles).

Android: GitHub Actions (`.github/workflows/android.yml`) builds a debug APK on every push and publishes it on a release for each push to `main`. The latest APK: `https://github.com/JoeBrowse/skidmarks/releases/latest/download/skid-marks.apk`. The workflow runs `npx cap add android`, then `scripts/android-permissions.mjs` (location and notification permissions) and `scripts/android-signing.mjs` (signs with the fixed test key in `signing/`), then `cap sync` and Gradle. The `android/` folder is generated and not committed.

## Code map

| Path | Contents |
|---|---|
| `src/run/` | Plan engine (pure functions, no DOM). API: `src/run/ENGINE.md`. Warm-ups: `src/run/engine/warmup.js`. |
| `src/plan/` | First open (`FirstOpen.jsx`: running, lifting or both; tour), "Your week" (`YourWeek.jsx`, `weekSetup.js`: the user picks lift days, programme, run days and long-run day; `weekFromPicks` places the leg days), Lift setup card, unplanned-session handling (`unplanned.js`), plan wizard, master week, life events, weekly review, races, reminders. `planState.js` loads, saves, adapts and undoes the plan. |
| `src/runui/` | Run mode: run home, GPS recorder, summary, season chart, progress, zones, fuel, weather, routes, coach, shoes, cycle log, workout builder. |
| `src/shared/` | `store.js` (one activity store and storage keys), `load.js` (one load model), `import/` (GPX, TCX, FIT, ZIP), `intervals.js`, `weather.js` (Open-Meteo), `export.js`, `ui/DataScreen.jsx`, `ui/WebInstall.jsx` (install hint and the web version panel). |
| `src/modes/` | Mode switch and screen registry. How to add a screen: `src/modes/README.md`. |
| `src/lib/webApp.js` | Web version: browser or app, installed or not, the install prompt, install steps and `WEB_LIMITS`. |
| `src/screens/`, `src/components/`, `src/lib/`, `src/data/`, `src/theme.js` | Lift mode. The storage key prefix stays `iron-log:` (`STORAGE_PREFIX` in `src/lib/storage.js`) so that old data still loads. Do not change it. |
| `wear/` | Wear OS watch app (Kotlin, Compose for Wear OS, Health Services). Own Gradle project: `cd wear && ./gradlew assembleDebug testDebugUnitTest`. `app/src/main/java/com/skidmarks/app/coach/` is a pure Kotlin port of the recorder logic; `ParityTest` checks it against `parity.json`, which `test/wear.test.mjs` writes (`UPDATE_WEAR_FIXTURE=1 npm test`). Guide: `docs/wear-os.md`. |
| `native/wear-bridge/` | Local Capacitor plugin `WearBridge` (Wear OS Data Layer): plan to the watch, runs from the watch. JS side: `src/shared/wear.js`. |
| `test/` | `node:test` suites. `test/index.js` loads every `*.test.mjs`. |
| `docs/` | `v1-spec.md`, privacy policy, product page, `research/` (market report, notes, six user reviews). |

## Design rules

- **Look:** Use `COLORS`/`THEME` from `src/theme.js` (never hard-coded colours; every colour scheme and light/dark must work), Oswald uppercase labels, JetBrains Mono numbers, orange accent `#FF6A1A`.
- **Simple and Advanced:** Simple mode hides fitness score, form, zones, phase names and predictions, and uses effort words.
- **One store, one load:** every activity is saved once through `src/shared/store.js`. Load is RPE × minutes for every activity, with fitness / fatigue / form from `src/shared/load.js`. Do not add a second load model.
- **Safety:** every plan change has a reason. Safety checks test the real planned days and must be honest. Keep the tests that check thousands of generated plans green.

## Legal and technical rules

- **Do not use the names "TSS", "Training Stress Score", "Normalized Power", "Intensity Factor" or "VDOT".** Use "training load", "fitness / fatigue / form" and "running fitness score". The Daniels and Gilbert equations are fine; do not imply endorsement.
- **Do not claim to predict injury.** Load values are information only. The injury flow always says to see a physio or doctor.
- **Strava:** show Strava data only to its owner. **Never send Strava data to an AI model.** The Intervals.icu sync skips activities that came from Strava.
- **Garmin:** do not depend on the Garmin Connect Developer Program (closed to new applications in 2026). Do not use unofficial Garmin libraries. Use FIT files and the Intervals.icu link.
- **Plans:** generate plans from rules. Do not copy published plan tables (Hal Higdon, NHS, Pfitzinger).
- **Network:** the app calls the network only for links that the user turns on (Open-Meteo weather, Intervals.icu). Location only while recording a run. The web version loads its files from GitHub Pages; it sends no user data.
- **Web version:** be honest about its limits. Native-only features (reminders, the watch link) are hidden or say that they need the Android app.
- **Not yet researched:** GDPR and medical-device rules. Keep the medical disclaimer. Get legal advice before any injury or medical claim.
- Verify the FIT SDK licence before a store release (the app uses the MIT-licensed `fit-file-parser`).

## Research

- Market report (37 apps, 21 features, prices): `docs/research/report/Running coach app comparison.md`
- Notes: `docs/research/notes/Running coach app comparison/`
- Six user reviews (beginner, intermediate, advanced; new and long-term): `docs/research/user-reviews/`

Facts marked `*`, `[BK]` or `[U]` in the research are not verified.

## Main risk

Safety. A free app that hurts runners loses trust fast. Safety caps and honest limits stay core features.
