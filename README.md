# Iron Log

**A gym tracker that keeps your data on your phone.**

📄 **[ironlog product page →](https://joebrowse.github.io/IronLogV3/)**

Log your sets. See which muscles have recovered. See your progress. No account,
no cloud and no uploads. Iron Log has no server.

---

## What it is

An Android workout tracker that works offline. It uses React and Capacitor.
The app keeps all data in the storage on your device.

* **Muscle readiness**: a body map of the muscles, front and rear. The colour
  of each muscle shows if it has recovered. Each muscle has its own recovery
  time. How hard you trained the muscle sets which time applies.
* **Guided workouts**: select a split, and Iron Log makes the session. It uses
  the exercise order that you set and prefers muscles that have recovered.
* **Programmes**: plans of many weeks that you follow day by day. Presets
  include Push/Pull/Legs and Project Arms. You can make your own plan or edit
  any plan.
* **Progress charts**: estimated 1RM over time for each exercise, grouped by
  muscle. The app records machines and variations separately.
* **Simple and Advanced modes**: start with sets, reps and weight. Add RIR,
  machine records, volume analysis and 1RM tests when you want them.

## Privacy

Privacy is part of the design, not only a promise:

* There is no Iron Log server and no Iron Log account.
* No analytics, no tracking and no ads. No third party collects data.
* The app connects only to Google Play. It does this sometimes, to check if
  this account has a subscription.
* Backup writes a plain JSON file to your Downloads folder. You can read your
  data in this format.
* If you cancel the subscription, the app stops. Your history stays on your
  device.

Full policy: [docs/privacy-policy.md](docs/privacy-policy.md)

## Pricing

Iron Log is now free. It is free software under the GPL-3.0 licence (see
"Licence" below).

Earlier versions used a Google Play subscription with a 7-day free trial.
Play Console set the prices, and the app showed them in your currency.
This repository does not hard-code a price.

## Building it

```bash
npm install
npm run dev     # local dev server
npm run lint    # JSX parse check
npm run build   # production bundle into dist/
```

Capacitor wraps `dist/` to make the Android app. This repository has no build
workflow and no signing keys. See "About this repository".

## About this repository

This is the public mirror of Iron Log. It has the application source, the
assets, the privacy policy and the product page. You can use these files to
read, build and understand the app.

It does **not** have the release automation. This is intentional. Debug builds
of Iron Log have the paywall switched off, so that testers can side-load them.
Thus a debug APK is a free, fully unlocked copy of a paid app. Anyone can
download build artifacts from a public repository. Thus the workflow that makes
them is in the private repository.

## Licence

Iron Log is free software under the GNU General Public License, version 3 or
any later version (GPL-3.0-or-later). See [LICENSE](LICENSE).

## Third-party attribution

The muscle readiness map uses the region data from
[body-muscles](https://github.com/vulovix/body-muscles) by Ivan Vulović, under
the Apache License 2.0. See [NOTICE](NOTICE).

## AI assistance disclaimer

The developer used Claude AI (Anthropic) as a coding assistant for Iron Log.
Claude helped to write, review, debug and improve parts of the application.
The developer controlled the concept, requirements, testing and final
decisions. The developer reviewed all generated code before it went into the
app. The developer gave no user data, private information or device data to
Claude during development.
