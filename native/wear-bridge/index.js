/* WearBridge: the link between the Skid Marks phone app and the watch app.

   Methods (Android only):
     sendPlan({ json })       puts the plan JSON at the DataItem "/skidmarks/plan".
     getPendingRuns()         -> { runs: [run JSON objects] } that came from the watch.
     ackRun({ id })           removes the run from the queue and tells the watch.
     status({ all? })         -> { connected, nodes: [{ id, name, nearby }], error? }
                              all: true also lists paired watches that are not connected now.
   Event:
     "runReceived" { id }     a run came from the watch while the app was open.

   src/shared/wear.js uses this plugin. */
import { registerPlugin } from "@capacitor/core";

export const WearBridge = registerPlugin("WearBridge");
