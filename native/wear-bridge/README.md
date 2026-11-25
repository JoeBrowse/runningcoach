# skid-marks-wear-bridge

A local Capacitor plugin for the Skid Marks phone app. It uses the Wear OS Data Layer (Google Play services) to:

- send the plan to the watch (DataItem `/skidmarks/plan`),
- receive runs from the watch (DataItems `/skidmarks/run/<id>`), also when the phone app is closed,
- send a receipt to the watch (message `/skidmarks/ack/<id>`, and the run DataItem is deleted).

The phone app installs it with `npm install ./native/wear-bridge`. The JS code that uses it is `src/shared/wear.js`. The watch app is in `wear/`. See `docs/wear-os.md`.
