import { Onboarding } from "./Onboarding.jsx";
import { PlanSetup } from "./PlanSetup.jsx";
import { WeekScreen } from "./WeekScreen.jsx";
import { LifeEvents } from "./LifeEvents.jsx";
import { WeeklyReview } from "./WeeklyReview.jsx";
import { RacesScreen } from "./RacesScreen.jsx";
import { AfterRace } from "./AfterRace.jsx";
import { BodyScreen } from "./BodyScreen.jsx";
import { ChangesScreen } from "./ChangesScreen.jsx";
import { SampleDemo } from "./SampleDemo.jsx";
// Imported for its side effect: reminders are scheduled again on each plan save.
import "./reminders.js";

/* Plan mode screens. Ids must start with "plan:". See src/modes/README.md. */
export const PLAN_SCREENS = {
  "plan:onboarding": { Component: Onboarding },
  "plan:setup": { Component: PlanSetup },
  "plan:week": { Component: WeekScreen },
  "plan:life": { Component: LifeEvents },
  "plan:review": { Component: WeeklyReview },
  "plan:races": { Component: RacesScreen },
  "plan:after-race": { Component: AfterRace },
  "plan:body": { Component: BodyScreen },
  "plan:changes": { Component: ChangesScreen },
  "plan:demo": { Component: SampleDemo },
};
