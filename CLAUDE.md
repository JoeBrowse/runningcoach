# CLAUDE.md: runningcoach

## Project goal

Build a **free running coach app**. Anyone can download it and use it at no cost.
All coaching features stay free: plans, adaptation and safety features.
There are no ads. We do not sell data.

The repository has no code yet. This file holds the market research (November 2026).
Use it to make design decisions.

## Writing style

The owner asks for **ASD-STE100 Simplified Technical English**.
Use short sentences (about 20 words or fewer). Use active voice and common words.
Write one fact or one instruction in each sentence.
Apply this to documents, comments, commit messages and replies.

## Research files

- Full report (tables for 37 apps, per-app insights, sources): `reports/Running coach app comparison.md`
- Raw research notes: `research_notes/Running coach app comparison/`
  - `dedicated_plan_apps.md`: Runna, Coopah, V.O2, McMillan, TrainAsONE, Campus Coach, Run With Hal, Marathon Handbook
  - `ai_coaching_apps.md`: HumanGO, Enduco, Athletica, AI Endurance, Kotcha, ChatGPT, WHOOP, Google, Garmin AI
  - `training_platforms.md`: Strava, TrainingPeaks, Final Surge, Intervals.icu, Stryd, Runalyze, SportTracks
  - `watch_ecosystems.md`: Garmin, COROS, Polar, Suunto, Apple, Google, Samsung, WHOOP
  - `mass_market_apps.md`: Nike Run Club, adidas Running, Runkeeper, MapMyRun, Peloton, NHS Couch to 5K, Zwift, Zen Labs C25K
  - `gaps_and_open_source.md`: runner pain points, open-source tools, training science, legal limits

Facts marked with `*`, `[BK]` or `[U]` are not verified. Check them before you rely on them.

## Market summary (late 2026)

- Most plan apps and AI coaches cost **$15 to $20 a month**.
- Runna costs $19.99 a month or $119.99 a year. UK price rises to £17.99 a month from 10 Dec 2026.
- Runna made its beginner plans paid on 5 June 2026.
- **Strava owns Runna** (April 2025). **Garmin owns TrainingPeaks** (22 July 2026).
- Watch brands (Garmin, COROS, Polar, Suunto, Samsung) give plans free, but only on their own watches.
- Mass-market apps (Nike Run Club, NHS Couch to 5K) give free audio coaching, but their plans do not adapt.
- Chat AI coaching is becoming a paid add-on (Garmin Connect+, Suunto from Jan 2027, Google Health Premium, WHOOP).
- "Bring your own AI" through MCP is now common (COROS, Strava, Intervals.icu, Runalyze, AI Endurance).
- Only **TrainAsONE** gives full adaptive plans free. Its reviews report unsafe schedules.
- Intervals.icu gives deep free analytics and an open API. It is not open source.

### Monthly cost of key apps

| App | Monthly cost | Free tier |
|---|---|---|
| Runna | $19.99 / £15.99 (£17.99 from 10 Dec 2026) | Week 1 of a plan only |
| Coopah | $14.99 / £14.99 | Partial |
| V.O2 (Jack Daniels VDOT) | $12.99 | Partial |
| TrainAsONE | $9.99 / £9.99 | Yes, almost all features |
| Campus Coach | $19.99 | 2 weeks of plan |
| Run With Hal | $6.99 | Partial |
| HumanGO | $8.99 to $28.99 | No |
| Enduco | €14.99 / €21.99 | No |
| Athletica | $19.90 | Trial only |
| AI Endurance | $20 / £15 | Trial only |
| Kotcha | $14.99 to $19.99 | Trial only |
| Strava | $11.99 | Yes (log, social) |
| TrainingPeaks Premium | $19.95 | Basic free |
| Intervals.icu | Free ($4 supporter) | Yes |
| Stryd | $14.99 plus foot pod | Partial |
| Garmin Connect+ | $6.99 / £6.99 | Garmin Coach free with watch |
| COROS | Free with watch | Yes |
| Polar Fitness Program | €9.99 / $8.99 | Flow free |
| Google Health Premium | $9.99 | App free |
| WHOOP | About $16.58 to $29.92 (annual only) | No |
| Nike Run Club | Free | Yes |
| ASICS Runkeeper Go | $9.99 to $11.99 | Yes |
| Peloton App One | $15.99 | No |
| NHS Couch to 5K | Free | Yes |

See the full report for all 37 apps against 21 features.

## What runners want but do not get

1. **Free adaptive plans.** Paid apps keep removing free features.
2. **Safe return after injury, illness or a break.** Runna's injury plan did not ask what the injury was. Runna had an injury controversy in 2026 (WSJ report).
3. **Plans that use past training history.** Garmin Coach ignores years of data.
4. **Structured periodisation plus daily readiness plus plain explanation.** No app combines all three.
5. **Audio guidance plus adaptation.** AI planners adapt but have no audio. Audio apps do not adapt.
6. **Support for every watch brand.** Runna skips Polar and Wear OS. Samsung's coach needs a Galaxy Watch 8.
7. **Women's health support.** Cycle features are weak or paid everywhere.
8. **Data ownership.** Runners fear lock-in after Strava and Garmin changes.
9. **Easy cancellation and stable prices.** Many complaints are about billing, not features.

## Must-have features for this app

- Goal-race plans from run/walk to marathon (later: ultra and trail).
- Conservative automatic adaptation after missed runs, illness, holidays and injury.
- Questions on return from a break (what happened, how long).
- Plan seeded from past runs.
- Phone GPS recording with audio cues. Bluetooth heart-rate and footpod sensors.
- Treadmill mode.
- Structured workouts sent to the watch.
- Pace zones, heart-rate zones and race prediction.
- Fitness / fatigue / form chart (Banister-type model).
- Basic strength and mobility sessions.
- Full data export: FIT, GPX, TCX, CSV.
- Hard safety caps on weekly increase and long-run length. Show the reason for each change.

## Legal and technical rules

- **Do not use the names "TSS", "Training Stress Score", "Normalized Power" or "Intensity Factor".** They are trademarks (TrainingPeaks, now Garmin). Use "training load" and "fitness / fatigue / form".
- **Do not use the name "VDOT".** It is listed as a trademark of The Run SMART Project. Use a neutral name such as "running fitness score". You may use the published Daniels and Gilbert equations. Do not imply endorsement.
- **Strava is optional.** Show Strava data only to its owner. **Never send Strava data to an AI model** (Strava API terms, Nov 2024 and June 2026). June 2026 rules may need a paid Strava subscription for developers.
- **Do not depend on the Garmin Connect Developer Program.** New applications were paused in 2026. Reports conflict on whether it reopened. Do not use unofficial Garmin libraries.
- Use **FIT / GPX / TCX file import and export**. Verify the FIT SDK licence at developer.garmin.com/fit before release.
- Use **Apple HealthKit** to read runs and **WorkoutKit** to push workouts to Apple Watch. Check Apple's health-data rules.
- Use **Android Health Connect** to read runs. Workout push to Wear OS watches is not openly supported.
- Polar AccessLink is open but read-focused. COROS and Suunto workout push needs a partner deal.
- **Do not claim to predict injury.** The acute:chronic workload ratio is criticised in research. Show load trends as information only.
- **Do not copy published plan tables** (Hal Higdon, NHS, Pfitzinger). Generate plans from rules.
- GDPR and medical-device rules are not yet researched. Get legal advice before any injury or medical claim.
- Add a clear medical disclaimer.

## Suggested architecture

Build the app **local-first**. Keep data on the phone by default. This removes lock-in and keeps server cost near zero.

| Layer | Choice |
|---|---|
| Storage | On-device database. Optional end-to-end encrypted sync. |
| Input | FIT/GPX/TCX import. HealthKit (iOS). Health Connect (Android). Optional Intervals.icu API key. |
| Plan engine | Deterministic rules. Riegel prediction, Daniels-type pace equations (neutral name), Banister load, HR zones, about 80/20 intensity, taper. Hard safety caps. |
| Adaptation | Re-plan after missed runs, illness, injury, holidays and readiness changes. |
| Recording | Phone GPS with audio cues. Bluetooth sensors. Treadmill mode. |
| Output | WorkoutKit (Apple Watch). Workout FIT files (Garmin, COROS and others). Connect IQ app later. Calendar (.ics) export. |
| AI (optional) | On-device model or bring-your-own LLM through MCP. The LLM explains. The rules engine calculates. Never use Strava data. |

## Free model

- Keep all coaching free. No ads. No data sales.
- Use a copyleft licence (GPL or AGPL) and a protected project name.
- Optional supporter tier only for extras that cost money to run (for example hosted sync). Never put plans, adaptation or safety behind it.
- Examples: Intervals.icu (free core, $4 supporter), Endurain (AGPL plus trademarked name), OpenTracks (privacy first, no internet access).

## Main risk

Safety. A free app that hurts runners will lose trust fast. Safety caps and honest limits are core features from the first release.
