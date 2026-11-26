# Modes: how to add screens

Skid Marks has three modes: **Plan**, **Run** and **Lift**.
The mode is saved in `settings.mode` (`"plan" | "run" | "lift"`).
Every mode home shows the switch "Plan · Run · Lift" at the top.

## Files

| File | Purpose |
|---|---|
| `src/modes/modeList.js` | The mode list (id, label, description). Data only. |
| `src/modes/index.js` | The registry. It joins each mode to its home and collects all screens. |
| `src/modes/ModeHeader.jsx` | The logo, the Settings button and the switch. Put it at the top of each mode home. |
| `src/plan/PlanHome.jsx` | The Plan home. |
| `src/plan/screens.js` | The Plan screens (`PLAN_SCREENS`). |
| `src/runui/RunHome.jsx` | The Run home. |
| `src/runui/screens.js` | The Run screens (`RUN_SCREENS`). |
| `src/modes/sharedScreens.js` | Screens for all modes (`SHARED_SCREENS`), for example Data. |

The run engine (no UI) is in `src/run/`. Run screens go in `src/runui/`.
Lift is the gym tracker. Its screens stay in `src/screens/` and use the old `setScreen` routing in `App.jsx`.

## Add a screen to a mode

1. Write the component. It gets one prop: `nav`.

   ```jsx
   // src/runui/RecordScreen.jsx
   import { TopBar } from "../components/TopBar.jsx";

   export function RecordScreen({ nav }) {
     return (
       <div>
         <TopBar title="Record" onBack={nav.back} />
         {/* ... */}
       </div>
     );
   }
   ```

2. Register it in the mode's `screens.js`. The id must start with the mode name and a colon.

   ```js
   // src/runui/screens.js
   import { RecordScreen } from "./RecordScreen.jsx";

   export const RUN_SCREENS = {
     "run:record": { Component: RecordScreen },
   };
   ```

   Use `plan:` in `src/plan/screens.js`. Use `shared:` in `src/modes/sharedScreens.js`.
   The registry throws an error at start if an id has the wrong prefix.

3. Open it from a home or another screen:

   ```jsx
   <button onClick={() => nav.go("run:record", { workoutId: "w12" })}>GO</button>
   ```

You do not need to edit `App.jsx`.

## The `nav` prop

| Field | What it does |
|---|---|
| `nav.mode` | The current mode id. |
| `nav.setMode(id)` | Changes the mode, saves it and opens that mode's home. |
| `nav.go(id, params)` | Opens a registry screen. It puts the current screen on the back stack. `params` is any value. |
| `nav.params` | The `params` of the current screen (or `null`). |
| `nav.back()` | Goes back one screen. With an empty stack, it opens the mode home. |
| `nav.home()` | Clears the stack and opens the mode home. |
| `nav.openSettings()` | Opens Settings. Its back button opens the mode home. |
| `nav.openLiftScreen(id)` | Opens a Lift screen by id (`"history"`, `"streak"`, `"progress"`, ...). Its back button opens the mode home. |
| `nav.settings` | The app settings object. |
| `nav.updateSettings(next)` | Saves new settings (pass the full object). |
| `nav.reloadKey` | A number that changes when data changes. Use it as an effect dependency. |
| `nav.reload()` | Changes `reloadKey`. Call it after you write data that other screens show. |

## Replace a placeholder home

Edit `src/plan/PlanHome.jsx` or `src/runui/RunHome.jsx`.
Keep `<ModeHeader mode={nav.mode} onModeChange={nav.setMode} onViewSettings={nav.openSettings} />` at the top.

## Data and load

- Use `src/shared/store.js` for activities and the run keys (`listActivities`, `saveRun`, `addActivities`, `isDuplicate`, `getRunPlan`, ...).
- Use `src/shared/load.js` for training load, fitness / fatigue / form and the week streak.
- Use `src/components/FormGauge.jsx` to show the Form gauge.
- Do not read or write `localStorage` directly. Use `safeGet` and `safeSet` from `src/lib/storage.js` (the key prefix stays `iron-log:`).

## Text

All UI text is ASD-STE100 Simplified Technical English.
Use short sentences, active voice and common words. Do not use contractions or idioms.
