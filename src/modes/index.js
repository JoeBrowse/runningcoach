import { PlanHome } from "../plan/PlanHome.jsx";
import { PLAN_SCREENS } from "../plan/screens.js";
import { RunHome } from "../runui/RunHome.jsx";
import { RUN_SCREENS } from "../runui/screens.js";
import { SHARED_SCREENS } from "./sharedScreens.js";
import { MODE_LIST } from "./modeList.js";

export { MODE_LIST, MODE_IDS, DEFAULT_MODE, normaliseMode } from "./modeList.js";
export { ModeHeader, ModeSwitch } from "./ModeHeader.jsx";

/* ---------------------------------------------------------------
   MODE REGISTRY

   See src/modes/README.md for the extension pattern.

   MODES: each mode with its home component. Lift has no `Home` here:
   App.jsx renders the Lift HomeScreen for it, because that screen
   needs many Lift callbacks.

   MODE_SCREENS: every extra screen, keyed by a namespaced id
   ("plan:week", "run:record", "shared:data"). App.jsx renders the
   component for the current screen id and gives it one `nav` prop.
--------------------------------------------------------------- */

const HOMES = { plan: PlanHome, run: RunHome, lift: null };

export const MODES = MODE_LIST.map((m) => ({ ...m, Home: HOMES[m.id] }));

export function modeById(id) {
  return MODES.find((m) => m.id === id) || null;
}

function checkScreens(prefix, screens) {
  for (const id of Object.keys(screens)) {
    if (!id.startsWith(`${prefix}:`)) throw new Error(`Screen id "${id}" must start with "${prefix}:"`);
    if (!screens[id] || !screens[id].Component) throw new Error(`Screen "${id}" has no Component`);
  }
  return screens;
}

export const MODE_SCREENS = {
  ...checkScreens("plan", PLAN_SCREENS),
  ...checkScreens("run", RUN_SCREENS),
  ...checkScreens("shared", SHARED_SCREENS),
};

export function isModeScreen(id) {
  return Object.prototype.hasOwnProperty.call(MODE_SCREENS, id);
}
