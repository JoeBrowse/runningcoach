import { RecordScreen } from "./RecordScreen.jsx";
import { SummaryScreen } from "./SummaryScreen.jsx";
import { PlanWeeksScreen } from "./PlanWeeksScreen.jsx";
import { ProgressScreen } from "./ProgressScreen.jsx";
import { ActivityScreen } from "./ActivityScreen.jsx";
import { ZonesScreen } from "./ZonesScreen.jsx";
import { FuelScreen } from "./FuelScreen.jsx";
import { WeatherScreen } from "./WeatherScreen.jsx";
import { RoutesScreen } from "./RoutesScreen.jsx";
import { CoachScreen } from "./CoachScreen.jsx";
import { ShoesScreen } from "./ShoesScreen.jsx";
import { CycleScreen } from "./CycleScreen.jsx";
import { BuilderScreen } from "./BuilderScreen.jsx";
import { CheckinScreen } from "./CheckinScreen.jsx";

/* Run mode screens. Ids must start with "run:". See src/modes/README.md.
   The run engine (no UI) lives in src/run/. */
export const RUN_SCREENS = {
  "run:record": { Component: RecordScreen },
  "run:summary": { Component: SummaryScreen },
  "run:plan": { Component: PlanWeeksScreen },
  "run:progress": { Component: ProgressScreen },
  "run:activity": { Component: ActivityScreen },
  "run:zones": { Component: ZonesScreen },
  "run:fuel": { Component: FuelScreen },
  "run:weather": { Component: WeatherScreen },
  "run:routes": { Component: RoutesScreen },
  "run:coach": { Component: CoachScreen },
  "run:shoes": { Component: ShoesScreen },
  "run:cycle": { Component: CycleScreen },
  "run:builder": { Component: BuilderScreen },
  "run:checkin": { Component: CheckinScreen },
};
