# Running coaching built into watch and wearable ecosystems (Garmin, COROS, Polar, Suunto, Apple, Google/Fitbit, Samsung, WHOOP), as of 25 Nov 2026

Conventions used in these notes:
- **[BK]** = background knowledge from before 2026. It was NOT re-verified with a source in this session. Treat it as probable but unconfirmed, and confirm it before stating it as fact in the final report. Per the researcher rules, these items also appear under Gaps.
- Items with a link were found or confirmed in this session (Nov 2026).
- Search results showed many 2026 developments that postdate older knowledge: Garmin bought TrainingPeaks, Google renamed Fitbit to Google Health, Suunto launched a paid AI Coach, COROS launched an MCP, Garmin paused then reportedly reopened its developer program, and Fitbit's Web API was shut down.

---

## Q1. What does each ecosystem offer, what is free with the device, and what needs a subscription? (Per-ecosystem profiles)

### Takeaway
COROS, Samsung, Polar (core) and Suunto (core) give their coaching free with the hardware. Garmin's core coaching (Garmin Coach, Daily Suggested Workouts, race-adaptive plans) is free, but its AI layer is behind Connect+ ($6.99/mo, $69.99/yr; £6.99/mo, £69.99/yr). Polar's adaptive Fitness Program costs €9.99/mo. Suunto's new chat AI Coach becomes paid from Jan 2027 at a price not yet announced. Google's Gemini coach needs Google Health Premium ($9.99/mo, $99/yr). Apple's running coaching is free in watchOS (Workout Buddy, custom workouts, Training Load), and Fitness+ ($9.99/£9.99 per month) is classes and strength, not run plans. WHOOP has no free tier: membership runs $199–$359/yr with the AI coach included.

### Cited Findings

#### Garmin (Garmin Connect / Garmin Coach / Connect+)
- **Free coaching in Garmin Connect:**
  - **Garmin Coach:** "free access to personal coaches within the Garmin Connect app". You pick a race goal and level, workouts sync to the watch and "adjust based on your performance", and the plan includes training-tip videos. The coaches are Jeff Galloway, Greg McMillan and Amy Parkerson-Mitchell. Distances are 5K, 10K and half marathon — [Garmin UK blog](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/).
  - **Race Adaptive Training Plans:** you add a race (from a list, or your own with a course). Garmin predicts race time using terrain, direction and wind, and the plan "adapts to your performance and recovery" using VO2 max and history (wearing the watch overnight helps) — [Garmin UK blog](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/).
  - **Daily Suggested Workouts:** not tied to a race; Firstbeat Analytics uses sleep, stress, training load and recovery to suggest a workout each day — [Garmin UK blog](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/).
- **Plan setup:** asks current weekly distance and available days; 10K and half-marathon plans also ask for a long-run day. Garmin Coach covers 5K, 10K and half marathon only; Wareable says this makes it mainly for beginner and intermediate runners — [Wareable](https://www.wareable.com/garmin/garmin-coach-guide-6595).
- **Run Coach update (2024):** a 2024 beta (Connect public beta 20.15) made Run Coach plans, previously fixed plans written by coaches, adjust to Training Readiness, Sleep Score and total training load, like DSW. It also improved race-time predictions. Devices: Fenix, Epix, Forerunner. This article is from Aug 2024 (older) — [TechRadar NL, Aug 2024](https://global.techradar.com/nl-nl/health-fitness/garmin-run-coach-wordt-slimmer-zo-probeer-je-de-update-als-eerste-uit).
- **Connect+ (launched March 2025):**
  - Price: £6.99/mo or £69.99/yr, 30-day free trial; Garmin promised the free app "is not going away" — [TechRadar](https://www.techradar.com/health-fitness/garmin-adds-premium-garmin-connect-tier-with-ai-features-but-promises-your-free-experience-is-not-going-away); [DC Rainmaker walkthrough](https://dcrainmaker.com/2025/03/garmin-connect-plus-subscription-walkthrough.html).
  - US price: $6.99/mo — [the5krunner, Nov 2026](https://the5krunner.com/2026/11/08/quick-read-garmin-ai-coaches/).
  - Launch features: Active Intelligence (AI insights, beta), a performance dashboard with custom graphs, live activity, expanded LiveTrack (text alerts when an activity starts, a LiveTrack profile page), training guidance, live workouts and badges. Availability varies by device — [Tom's Guide](https://www.tomsguide.com/wellness/smartwatches/garmin-launches-a-paywall-here-are-all-the-premium-connect-features-that-will-cost-you-usd6-99-a-month); [Android Central](https://www.androidcentral.com/wearables/new-garmin-connect-plus-subscription-adds-active-intelligence-beta-enhanced-smarts).
  - 2026 addition: Connect+-only nutrition logging (calorie goals, barcode scan, AI photo food recognition), dated about Jan 2026 — [Yahoo Tech](https://tech.yahoo.com/wearables/articles/garmin-added-another-ai-powered-170038784.html).
  - A competitor's blog describes Connect+ AI as daily training-advice cards, structured workout suggestions synced to the watch, recovery explanations, and race predictions or goal coaching tied to a race date. It calls Connect+ "advice, not coaching" and notes it cannot answer follow-up questions (no chat). This source sells a rival AI coach — [ShouldITrain](https://www.shoulditrain.com/blog/garmin-connect-plus-review).
- **No AI chat coach as of Nov 2026:**
  - Active Intelligence is the only AI feature, producing plain-language summaries. Many owners call Connect+ overpriced.
  - Garmin COO Brad Trenkle (Nov 2026): AI "needs to keep a very keen sense of authenticity". People who want a human coach can go through TrainingPeaks — [the5krunner, 8 Nov 2026](https://the5krunner.com/2026/11/08/quick-read-garmin-ai-coaches/).
- **TrainingPeaks deal:** Garmin bought TrainingPeaks and TrainHeroic (including TrainingPeaks Virtual) from Peaksware on 22 Jul 2026. About 120 staff joined Garmin; terms were not disclosed. Commentators expect possible bundling into Connect+, but nothing is announced — [Bicycle Retailer](https://bicycleretailer.com/industry-news/2026/07/22/garmin-acquires-trainingpeaks-trainheroic-platforms); [the5krunner](https://the5krunner.com/2026/07/22/garmin-acquires-trainingpeaks-what-changes/).
- **Garmin Cirqa band:** TechRadar's headline says the new screenless "Cirqa" smart band "puts access to its coaching software behind the Connect+ premium tier". The article body could not be retrieved, so details are unverified — [TechRadar](https://techradar.com/health-fitness/garmins-trainingpeaks-acquisition-and-the-garmin-cirqa-smart-band-could-have-a-surprise-connection-as-the-cirqa-puts-access-to-its-coaching-software-behind-the-connect-premium-tier).
- **Current running watches named by Garmin:** Forerunner 70/170, 570 and 970 — [Garmin UK blog](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/).
- **Watch required?** Yes. Garmin Coach, DSW and race plans all need a compatible Garmin watch ([Garmin UK blog](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/)).

#### COROS (COROS app, Training Hub, EvoLab, MCP)
- **Free human coaching:** COROS Coaches gives free personalised training advice by email (coach@coros.com) based on your Training Hub data — [COROS](https://coros.com/stories/coros-coaches/c/coros-coaches-your-personal-training-support); [the5krunner 2023 (older)](https://the5krunner.com/2023/03/19/coros-coaches-a-good-idea-but/).
- **Plans:**
  - COROS offers downloadable trail and ultramarathon plans — [COROS](https://coros.com/ca/stories/coros-coaches/c/download-coros-trail-and-ultramarathon-plans).
  - Personalised marathon plans (Nov 2023 launch, older) build from past training data toward a goal. Library plans can be dragged onto the calendar and edited — [COROS](https://coros.com/november2023).
- **No native in-app AI trainer found.** A search for one turned up human coaches, plan templates and the MCP. One review mentions a native "AI Trainer", but this could not be confirmed and may blur it with the MCP — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/); search synthesis.
- **COROS official MCP (13 May 2026):**
  - First official MCP from a major endurance-watch brand. It connects COROS data to Claude, ChatGPT (developer mode only), Cursor and Gemini CLI.
  - 15 tools expose: profile; devices; activity list, detail and summaries; daily steps, HR, RHR, stress and sleep; HRV, recovery, training load (short-term, long-term, ratio), VO2max, running level, threshold pace, and race predictions for 5K/10K/HM/M; and the current calendar plan.
  - Not exposed: GPS tracks, per-second streams, laps, power, running dynamics, structured workout upload.
  - Read-only at launch. The reviewer got "temporarily unavailable" errors on test day — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).
- **MCP write access (from 21 Sep 2026):** the AI can create plans and workouts that sync to the COROS library. Plans must be 4–16 weeks, the AI cannot delete them, and more activity types are "coming soon". This comes from COROS's update log as quoted in search results; the official support page returned 403 — [COROS support](https://support.coros.com/hc/en-us/articles/50841795180948-Connect-Your-COROS-to-AI); [GearJunkie](https://gearjunkie.com/technology/coros-partner-chatgpt-claude).
- **Cost of the MCP route:** the user needs their own AI subscription. A Claude Pro or ChatGPT Plus account (about $20/mo) is needed for practical use, because free-tier message limits make regular use impractical — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).

#### Polar (Polar Flow, Running Program, FitSpark, Fitness Program)
- **Fitness Program (paid, launched 2025):**
  - €9.99/$8.99 per month, monthly only (no annual option at launch), 14-day free trial.
  - Runs in 4-week cycles with weekly feedback. Workouts are HR-based and adapt to recovery, goals and lifestyle.
  - Available in the EU, Norway, UK and US, on Android and iOS — [Polar media](https://www.polar.com/en/media-room/polar-introduces-fitness-program); [the5krunner](https://the5krunner.com/2025/04/10/new-polar-subscription-fitness-program-details/); [Polar US/iOS expansion](https://www.polar.com/en/media-room/polar-expands-fitness-program-ios-and-us-market).
  - FAQ: €9.99/mo charged until cancelled. Weekly training-time goals and daily targets you can move or skip, HR-zone guidance, adjustment from Nightly Recharge and Cardio Load, based on WHO activity guidelines.
  - Needs a Polar watch: Grit X/X Pro/X2/X2 Pro, Ignite 1–3, Pacer/Pacer Pro, Unite, Vantage M/M2/M3/V2/V3, Street X — [Polar FAQ](https://support.polar.com/en/fitness-program-faqs).
- **Fitness Program billing caveat:** cancelling mid-cycle can leave a 4-week plan unfinished. Reviewers say it costs more than Garmin Connect+ — [watchesreviewed](https://watchesreviewed.com/polar_subscription_training_plans/); [TechRadar](https://www.techradar.com/health-fitness/fitness-trackers/hot-on-the-heels-of-garmins-controversial-subscription-plan-polars-just-unveiled-its-own).
- **What stays free:** Polar Flow is free, and "it is not required to fully enjoy Polar products". The free Running Program and imported plans remain — [Polar FAQ](https://support.polar.com/en/fitness-program-faqs); [watchesreviewed](https://watchesreviewed.com/polar_subscription_training_plans/).
- **2026 updates are small; no AI:**
  - Flow 7.35.0 (Feb 2026) added a preview of the 4-week Fitness Program plan — [Polar support](https://support.polar.com/en/updates/polar-flow-app-version-7350-for-ios).
  - Firmware 6.0.18 (30 Sep 2026) added sleep and recovery trend graphs and Running Index history — [the5krunner](https://the5krunner.com/2026/09/30/polar-2026-feature-update/).
  - Flow 7.38.0 (9 Nov 2026) added H10 memory recording — [Polar support](https://support.polar.com/en/updates/polar-flow-app-version-7380-for-ios).
  - The Flow app rebuild promised in 2025 has not arrived — search synthesis via [the5krunner](https://the5krunner.com/2026/09/30/polar-2026-feature-update/).
- **Polar Loop** (screenless band, 2025): TechRadar calls it "good on heart rate, but a software let-down" — [TechRadar](https://www.techradar.com/health-fitness/fitness-trackers/polar-loop-review).

#### Suunto (Suunto app, SuuntoPlus, Suunto Coach, AI Coach)
- **AI Coach (launched 15 Oct 2026 with the Race 3S):**
  - A paid, chat-based coach in the Suunto app. It explains your data with charts, tables and maps, reads training load, recovery and recent sessions, and builds structured workouts, training plans and routes from typed requests. These save to the app and sync to the watch.
  - Price after the free period is unpublished. Race 3S buyers get 3 months free if they activate by 31 Dec 2026.
  - Watches, offline maps and SuuntoPlus apps have no ongoing charges — [the5krunner](https://the5krunner.com/2026/10/15/suunto-ai-coach/).
  - Paid plans start Jan 2027, when AI Coach also opens to other compatible watches (models to be confirmed) — [ActionHub](https://www.actionhub.com/news/2026/10/21/understanding-what-suunto-ai-coach-can-do/).
- **Race 3S:** from $599 or £435; 1.32" AMOLED, 38 h dual-band GPS — [the5krunner](https://the5krunner.com/2026/10/15/suunto-ai-coach/).
- **Free Suunto app:**
  - Run analysis, Training Zone (load against long-term training), Suunto Coach insights (load, intensity, recovery, sleep changes), route planning, heatmaps, and Strava starred-route import.
  - Structured workout creation and scheduling, sent to the watch via SuuntoPlus Guides.
  - TrainingPeaks planned sessions arrive via SuuntoPlus Guides.
  - Suunto Coach "expanded with AI-powered training plans": choose a goal in the calendar and answer questions. Features vary by watch and software version. It is unclear whether this is the paid AI Coach — [Sapphire Running Zone, 2026](https://www.sapphirerunningzone.com/post/suunto-app-explained-training-navigation-suunto-coach-and-more).
- **Value Pack:** a new watch includes a 60-day Strava Premium trial and a 30-day TrainingPeaks Premium trial — [Suunto](https://us.suunto.com/pages/value-pack).
- **Conflicting reports on Premium:** a third-party guide says the AI plan, workout push and adaptive updates are "Premium", with a 30-day trial — [afasteryou](https://afasteryou.com/blog/en/suunto-connect-training-plan/). This refers to that third-party app's own Premium, not Suunto's; read in context.

#### Apple (watchOS Workout app, Fitness app, Workout Buddy, Fitness+)
- **watchOS 27 (announced 8 Jun 2026, shipped Sep 2026):**
  - Workout Buddy adds history-aware progress callouts (pace, distance, duration compared with recent history) and works without an iPhone nearby. That needs Wi-Fi or cellular, on Series 9 and later, SE 3, or Ultra 2 and later. Spanish is added.
  - Better treadmill distance from the wrist; more precise route maps — [MacRumors](https://www.macrumors.com/2026/06/08/watchos-27-workout-buddy-upgrades-better-sleep-tracking/); [The Apple Post](https://www.theapplepost.com/2026/09/09/71976/workout-buddy-no-longer-needs-your-iphone-nearby-with-watchos-27/).
  - Extended Workout mode turns on Low Power Mode, so some running metrics are unavailable — [RunnersPicks](https://www.runnerspicks.com/blog/apple-watchos-27-for-runners-whats-new/).
- **Training Load:** listed by Apple (Jan 2026) as a key metric alongside cardio fitness and cardio recovery — [Apple Newsroom](https://www.apple.com/ca/newsroom/2026/01/stay-active-in-the-new-year-with-apple-watch).
- **Fitness+ price:** $9.99/£9.99/AU$14.99 per month, or $79.99/£79.99/AU$119.99 per year — [TechRadar](https://www.techradar.com/health-fitness/apple-fitness-is-kicking-off-2026-with-new-workout-programs-and-theres-a-lot-to-like). Also in Apple One Premier ($39.95/mo US). Family sharing covers up to 5. New subscribers get 1 month free; eligible device purchases get 3 months — [9to5Mac](https://9to5mac.com/2026/11/03/apple-announces-fitness-gym-strength-program-with-personalized-workout-plans/).
- **Fitness+ Gym Strength (beta, 3 Nov 2026):**
  - 4-week progressive strength plans that adjust weekly from logged reps and weight. Over 350 exercises and 30+ equipment types, with an optional "Training Note" from Apple Intelligence.
  - Needs iOS/iPadOS 27.3; the watch is optional. Included in Fitness+. Not running — [9to5Mac](https://9to5mac.com/2026/11/03/apple-announces-fitness-gym-strength-program-with-personalized-workout-plans/).
- **Custom Plans:** Fitness+ schedules workouts with new sessions weekly. These are classes (including treadmill runs), not race plans — [9to5Mac via search](https://9to5mac.com/?p=1076390).

#### Google (Fitbit, now Google Health, and Pixel Watch)
- **Rebrand and launch:** the Fitbit app became **Google Health** on 19 May 2026.
  - The Gemini-powered Google Health Coach left preview and acts as fitness coach, sleep expert and wellness advisor.
  - Onboarding covers goals, routine, equipment, injuries and lifestyle. You chat to update goals and can log workouts, meals and records by voice, photo or file.
  - Launched first for some Fitbit and Pixel Watch users, with "other devices coming soon".
  - **Google Health Premium** (formerly Fitbit Premium) costs $9.99/mo or $99/yr and is free for Google AI Pro/Ultra subscribers.
  - The screenless **Fitbit Air** band launched the same day — [TechCrunch](https://techcrunch.com/2026/05/07/googles-9-99-per-month-ai-health-coach-launches-may-19/).
  - The annual price rose from $79.99 to $99 — [Sensai (commercial)](https://www.sensai.fit/blog/google-health-premium-fitbit-ai-coach-2026).
  - One source says the coach reached all users by 26 May and works on iPhone — [How-To Geek](https://www.howtogeek.com/googles-gemini-powered-health-coach-is-rolling-out/).
- **Running plans:**
  - One reviewer built a multi-week marathon plan with the coach and had it swap a day's workout. Plans are "weeks-long, personalized … across dozens of sports" after 5–10 minutes of AI Q&A — [Android Central](https://www.androidcentral.com/wearables/google-pixel-watch-4-review).
  - Another (commercial) review says the coach does not generate structured workout plans. The sources conflict — [askvora](https://askvora.com/blog/ai-health-coaching-fitbit-google-apple-vora-2026).
- **Pixel Watch 4 gaps:** no running power, no race-time predictions, no post-run recovery-time suggestions — [Yahoo Tech](https://tech.yahoo.com/wearables/articles/google-vs-garmin-pixel-watch-144400977.html).
  - In a half-marathon test against a Garmin, GPS closely overlapped. HR read slightly low above threshold — [Android Central](https://www.androidcentral.com/wearables/google-pixel-watch-4-fitness-test).

#### Samsung (Galaxy Watch, Samsung Health Running Coach)
- **Running Coach (Seoul briefing, 14 May 2026):**
  - Built over about 2 years with former national marathoner Kwon Eun-ju.
  - A 12-minute running test sets a running level from 1 to 10. Users get a matched course from about 160 programmes, including HR-based programmes.
  - Samsung Health also offers race goals, VO2 max, sweat loss, and running-form analysis on six items (asymmetry, ground contact time, flight time, regularity, vertical amplitude, stiffness) — [ETNews](https://en.etnews.com/20260515200004).
  - Samsung is reviewing extending the coach to other sports and targeting 10 million runners — [Seoul Economic Daily](https://en.sedaily.com/news/2026/05/14/samsung-to-evolve-galaxy-watch-into-fitness-coach-targeting).
- **Oct 2026 update:**
  - Running Coach goes from 10 to 12 levels for intermediate and advanced runners. Strava Routes import into Samsung Health. Faster Sleep Coaching.
  - Requirements: Samsung Health 6.30.2 on Galaxy Watch 8 or later — [Wareable](https://www.wareable.com/samsung/samsung-health-update-strava-routes-expanded-running-coach-sleep-coaching); [Eastern Herald](https://easternherald.com/2026/10/14/samsung-health-sleep-coaching-running-strava-update-october-2026/).
  - Also needs Android 10+ and a Samsung account (global listing). US: One UI 8 Watch or later; outdoor only; setup needs 12+ minutes of continuous GPS running. Plans can come from the test or from run history — [Eastern Herald](https://easternherald.com/2026/10/14/samsung-health-sleep-coaching-running-strava-update-october-2026/).
- **Cost:** no subscription was mentioned in any source. [BK] Samsung Health has no paid tier for Running Coach.

#### WHOOP
- **Membership (no free tier):** One $199/yr, Peak $239/yr, Life $359/yr — [WHOOP join page](https://join.whoop.com/us/en/?advancedLabs=1).
  - One includes Strain, Sleep, Recovery, Strength Trainer, VO2 Max, AI Coach, Journal and Trends. Healthspan comes with Peak; ECG and Blood Pressure Insights with Life — [Sensai (commercial)](https://www.sensai.fit/blog/best-whoop-alternatives-2026).
  - Advanced Labs is a separate add-on; free lab uploads get coaching from WHOOP Coach — [WHOOP press](https://www.whoop.com/us/en/press-center/whoop-launches-advanced-labs-uploads-us/).
- **Running in 2026:** imported activities keep GPS, distance and pace if the source device recorded them, and recorded GPS activities get a distance/duration/pace summary — [WHOOP What's New 2026](https://www.whoop.com/us/en/thelocker/2026-whats-new/).
  - The community is still asking for splits, pace planning, haptic pacing and target-pace/HR alerts. These are requests, not features — [WHOOP community](https://www.community.whoop.com/t/feature-request-run-splits-pace-planning-and-haptic-pacing-for-runners/16409).
  - Cyclingnews reported (2023, older) that the ChatGPT-style coach could, for example, produce a 5K plan at a target pace — [Cyclingnews](https://www.cyclingnews.com/news/whoop-to-integrate-chatgpt-style-coach-to-help-users-train).
  - A TrackerVs review (Apr 2026) says WHOOP has no GPS or pace tracking. This conflicts with WHOOP's own page — [TrackerVs](https://trackervs.com/review/whoop-for-running/).

### Inferences
- **Pricing pattern for 2026:** the base coaching (plans, daily suggestions, load and recovery) is free on the watch-first brands (Garmin, COROS, Polar, Suunto, Samsung). Conversational or "AI" coaching is turning into a separate paid layer: Garmin Connect+ (no chat yet), Suunto AI Coach (paid 2027), Google Health Premium, WHOOP membership. COROS is the outlier: it outsources AI to the user's own Claude or ChatGPT through its MCP.
- **Apple and Samsung** offer free on-wrist coaching (voice motivation, level-based programmes), but neither generates race-goal marathon plans the way Garmin, COROS or Polar do. That gap is what third-party apps (Runna and others) fill.
- **The cheapest "AI coach chat" tied to a wearable** in Nov 2026 is either Google Health Premium ($9.99/mo) or BYO-LLM through COROS MCP. Garmin, the market leader, deliberately has no chat coach.

### Gaps
- **Garmin:**
  - [BK] Whether Garmin Run Coach plans now include the marathon. The Garmin blog lists only 5K/10K/HM for Garmin Coach. [BK] Race-adaptive DSW (Race widget, launched with Forerunner 265/965 in Mar 2023) covers any race distance, including marathon.
  - The full current Connect+ feature list as of Nov 2026, the US annual price ([BK] $69.99), and whether any Garmin Coach features moved behind Connect+.
  - One blog claims an Aug 2026 free firmware added auto workout suggestions and voice control. Unverified.
  - Cirqa band details (only the headline was seen).
- **Polar:**
  - Current Fitness Program GBP price (likely £8.99–£9.99, not confirmed) and whether an annual option now exists.
  - [BK] Polar Running Program is free: 5K/10K/HM/marathon, up to about 18 weeks for marathon, adjusts somewhat by Running Index.
  - [BK] FitSpark daily suggestions are free.
- **Suunto:** the AI Coach price; which watches qualify in 2027; whether the in-app "AI-powered training plans" in Suunto Coach are free or part of AI Coach.
- **Google:** UK pricing for Google Health Premium ([BK] Fitbit Premium was £7.99/mo, £79.99/yr). Whether Google Health Coach plans push structured workouts to the watch.
- **WHOOP:** UK pricing; whether WHOOP Coach generates race plans in 2026.
- **Samsung:** whether Running Coach includes race-date plans (e.g., marathon) or only level progression; voice guidance details.
- **Apple:** [BK] No native race-plan generator. Custom workouts (watchOS 9+) support intervals, pace/HR/power alerts and Race Route. Training Load uses a 1–10 effort rating (watchOS 11). Workout Buddy (watchOS 26) needs Apple Intelligence and, before watchOS 27, an AI-capable iPhone nearby.

---

## Q2. How adaptive are the plans, and how good are they according to reviewers?

### Takeaway
Garmin's plans are the most widely used "adaptive" option: daily changes driven by readiness, sleep and load. Reviewers find them conservative and reactive, with too few long runs and no multi-week periodisation logic. Polar's Fitness Program adapts only within 4-week cycles and is general fitness, not race-specific. Samsung adapts by level and programme. Google's Gemini coach and Suunto's AI Coach adapt through conversation but are too new for solid reviews. COROS plans are mostly static templates unless an external AI rewrites them through the MCP.

### Cited Findings
- **Garmin, too easy, no arc:** "most athletes using DSW find suggestions slightly too easy". Each day's suggestion rests on yesterday's data, with "no multi-week arc, no peaking strategy, no taper". Competitor blog — [gneta](https://www.gneta.app/blog/garmin-coach-review).
- **Garmin, one marathon user's review:** "too few of the long runs", plan both too easy and too hard, the watch often flagged pace as too slow in speed sessions, race predictions were "way too fast", very few true rest days — [Medium / Runner's Life](https://medium.com/runners-life/garmins-adaptive-training-coach-this-is-my-grandma-s-marathon-plan-4da320157e33).
- **Garmin, readiness adaptation (Aug 2024):** Run Coach moved from fixed coach-written plans to readiness-adaptive plans in an Aug 2024 beta (older) — [TechRadar NL](https://global.techradar.com/nl-nl/health-fitness/garmin-run-coach-wordt-slimmer-zo-probeer-je-de-update-als-eerste-uit).
- **Garmin Connect+ AI, mixed reviews:**
  - Active Intelligence "was clearly just looking at the average overall pace rather than the breakdown of the run" — [TechRadar](https://www.techradar.com/health-fitness/garmin-connect-plus).
  - Another two-month tester found it "works surprisingly well", placing sessions within your long-term plan — [Samsung Magazine EU, Aug 2026](https://samsungmagazine.eu/en/2026/08/11/garmin-active-intelligence-connect/) (via search snippet).
  - A third: "by most accounts not yet delivering meaningful AI coaching" — [Lifestack (commercial)](https://lifestack.ai/blog/is-garmin-connect-plus-worth-it) (via search snippet).
- **Polar Fitness Program:** the plan updates every 4 weeks, with weekly feedback and workouts that adapt to recovery (Nightly Recharge, Cardio Load) — [Polar](https://www.polar.com/en/media-room/polar-introduces-fitness-program); [Polar FAQ](https://support.polar.com/en/fitness-program-faqs). It is HR-zone general fitness based on WHO guidelines, not race-specific — [Polar FAQ](https://support.polar.com/en/fitness-program-faqs).
- **Samsung:** the plan comes from a 12-minute test or run history, with a level of 1–10 (now 1–12) and about 160 programmes — [ETNews](https://en.etnews.com/20260515200004); [Eastern Herald](https://easternherald.com/2026/10/14/samsung-health-sleep-coaching-running-strava-update-october-2026/).
- **Google:** you can ask the coach to swap a day's workout, and it allows more rest days — [Android Central](https://www.androidcentral.com/wearables/google-pixel-watch-4-review). One guide says it is best as a supporting tool for half or full marathon training, not the sole decision-maker — [Sapphire Running Zone](https://www.sapphirerunningzone.com/post/google-health-explained-the-complete-guide-for-runners).
- **Suunto AI Coach:** "price and the quality of the workouts and plans will decide its long-term success". No quality verdict yet — [the5krunner](https://the5krunner.com/2026/10/15/suunto-ai-coach/).
- **COROS:** library plans are dragged onto the calendar and edited by hand. The marathon planner builds from history — [COROS](https://coros.com/november2023). AI plans arrived via the MCP (4–16 weeks) in Sep 2026 — [COROS support](https://support.coros.com/hc/en-us/articles/50841795180948-Connect-Your-COROS-to-AI).
- **General caution:** TechRadar asked a human coach about injury risk from AI training apps — [TechRadar](https://www.techradar.com/health-fitness/are-ai-training-apps-like-runna-putting-you-at-risk-of-injury-i-asked-a-real-life-running-coach).

### Inferences
- **Graded by adaptivity** (most to least, on available evidence): Garmin DSW / race-adaptive (daily, automatic, metric-driven) > Google Health Coach and Suunto AI Coach (conversational, on request; unclear whether automatic) > Polar Fitness Program (4-week cycles plus daily recovery tweaks) > Samsung (level and programme changes) > COROS native and Apple (static or manual).
- **Quality gap for an independent coach app to target:** watch-native plans are either conservative and reactive (Garmin) or general fitness (Polar, Samsung). None combines real periodisation (build, peak, taper) with daily readiness adaptation and natural-language explanation. That combination is open.

### Gaps
- No systematic Reddit (r/Garmin, r/running, r/AdvancedRunning) evidence was retrieved this session; searches returned blogs only.
- No DC Rainmaker 2026 in-depth review of Connect+ AI or Suunto AI Coach was found.
- No independent review of Samsung Running Coach plan quality.
- No reviewer test of Google Health Coach plan quality for a goal race.

---

## Q3. Top complaints, praise, unique features, and features runners would miss

### Takeaway
Praise centres on deep free metrics and plan integration with the watch (Garmin, COROS), free human coach email (COROS), on-wrist voice motivation (Apple), and conversational planning (Google, Suunto). Complaints centre on subscription creep (Garmin Connect+, Polar, Suunto), generic AI output, conservative plans, a slow-moving Polar app, and WHOOP's weak running-specific features.

### Cited Findings
- **Garmin:**
  - Complaints: Connect+ "paywall" outrage at launch — [Tom's Guide](https://www.tomsguide.com/wellness/smartwatches/garmin-sparks-outrage-with-connect-subscription-paywall-have-your-say). Many owners call it overpriced — [the5krunner](https://the5krunner.com/2026/11/08/quick-read-garmin-ai-coaches/). Fear that free LiveTrack features moved behind the paywall — [TechRadar](https://www.techradar.com/health-fitness/garmin-connect-plus). AI advice is generic, with no follow-up Q&A — [ShouldITrain](https://www.shoulditrain.com/blog/garmin-connect-plus-review).
  - Praise: seamless data integration and workouts you can actually execute — [ShouldITrain](https://www.shoulditrain.com/blog/garmin-connect-plus-review).
  - Unique: race-course-aware time prediction (terrain, wind) and the race-adaptive plan — [Garmin](https://www.garmin.com/en-GB/blog/garmin-training-plans-for-runners/); ownership of TrainingPeaks for human coaching — [the5krunner](https://the5krunner.com/2026/07/22/garmin-acquires-trainingpeaks-what-changes/).
- **COROS:**
  - Unique: free email human coaching — [COROS](https://coros.com/stories/coros-coaches/c/coros-coaches-your-personal-training-support); first official watch-brand MCP — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).
  - Complaints: the MCP exposes only summaries, not raw streams, so the AI cannot verify metrics; launch errors; one reader called it "more of a marketing move" — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).
- **Polar:** subscription costs more than Connect+ with no annual option at launch, and the 4-week billing traps users mid-cycle — [watchesreviewed](https://watchesreviewed.com/polar_subscription_training_plans/). The Flow app rebuild is overdue — [the5krunner](https://the5krunner.com/2026/09/30/polar-2026-feature-update/). Loop software is a "let-down" — [TechRadar](https://www.techradar.com/health-fitness/fitness-trackers/polar-loop-review).
- **Suunto:** praise for the conversational coach producing workouts, plans and routes the watch can use directly. Concerns: unknown price, and generic AI tools gaining Strava and phone health data could erode the advantage. The author thinks it will appeal most to less technical runners — [the5krunner](https://the5krunner.com/2026/10/15/suunto-ai-coach/). The app has a terminology learning curve, compatibility varies by watch, and it is mobile-first — [Sapphire Running Zone](https://www.sapphirerunningzone.com/post/suunto-app-explained-training-navigation-suunto-coach-and-more).
- **Apple:** reviewer verdict on watchOS 27 is "a solid incremental update for runners" — [RunnersPicks](https://www.runnerspicks.com/blog/apple-watchos-27-for-runners-whats-new/). Workout Buddy's phone-free mode needs cellular or Wi-Fi — [MacObserver](https://www.macobserver.com/tips/round-ups/how-to-use-workout-buddy-apple-watch-without-iphone-nearby-watchos-27/).
- **Google:** Android Central "doesn't hate" the new Google Health app but says it needs work — [Android Central](https://www.androidcentral.com/apps-software/google-health-app-impressions). Pixel Watch 4 lacks running power, race predictions and recovery time — [Yahoo](https://tech.yahoo.com/wearables/articles/google-vs-garmin-pixel-watch-144400977.html).
- **WHOOP:** runners repeatedly request splits, pace targets, haptic pacing and per-km audio prompts — [WHOOP community](https://www.community.whoop.com/t/audio-prompts-with-average-pace-and-hr-for-runs-every-kilometer/13691).
- **Samsung:** the new Running Coach is limited to Galaxy Watch 8 and later, and to Android — [Wareable](https://www.wareable.com/samsung/samsung-health-update-strava-routes-expanded-running-coach-sleep-coaching); [Eastern Herald](https://easternherald.com/2026/10/14/samsung-health-sleep-coaching-running-strava-update-october-2026/).

### Inferences
- **Features runners would most miss** when leaving a watch ecosystem for a standalone coach app (inferred from what is unique and free):
  - Garmin: Training Readiness, HRV status, race-adaptive DSW and course-aware prediction.
  - COROS: EvoLab load, fatigue and race predictor, plus free human coach email.
  - Polar: Nightly Recharge and Running Index.
  - Apple: Workout Buddy voice motivation.
  - Samsung: running-form metrics.
  - A third-party coach must either read these metrics (via APIs) or replicate them.

### Gaps
- Direct Reddit quotes were not collected. DC Rainmaker coverage was found only for the Connect+ walkthrough (Mar 2025), not read in full.

---

## Q4. Standard feature matrix (for the comparison table)

Legend: Y = Yes, P = Partial, N = No. Source tags: [G] Garmin UK blog; [CP] Connect+ sources (Tom's Guide, TechRadar, the5krunner); [C] COROS sources; [CM] the5krunner COROS MCP; [P] Polar FAQ and media; [S] the5krunner Suunto AI Coach and Sapphire; [A] MacRumors, 9to5Mac, Apple; [GH] TechCrunch, Android Central, Yahoo; [SM] ETNews, Wareable, Eastern Herald; [W] WHOOP pages; [BK] unverified background knowledge.

| # | Feature | Garmin | COROS | Polar | Suunto | Apple | Google Health / Fitbit / Pixel | Samsung | WHOOP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Goal-race plan (5K–marathon/ultra) | Y: Garmin Coach 5K/10K/HM; race-adaptive plans for added races [G] (marathon via race plan, [BK]) | Y: library incl. trail/ultra; marathon planner [C] | Y: free Running Program 5K–marathon [BK]; Fitness Program is general fitness [P] | P/Y: AI Coach builds plans on request (paid from 2027) [S]; free Suunto Coach plans [S] | N: no native race plans [BK] | P: Gemini coach can build a marathon plan via chat [GH]; conflicting reports | P: level-based programmes; race goals tracked, race-date plans unclear [SM] | P: AI coach can draft plans (2023 report) [W]; no structured race plans confirmed |
| 2 | Adaptive plan | Y: DSW and race plans adjust to readiness, sleep, load [G] | P: static library; MCP AI can regenerate (since Sep 2026) [C] | P: Fitness Program 4-week cycles plus recovery tweaks (paid) [P] | P: AI Coach on request [S] | N [BK] | P: chat-driven swaps [GH] | P: level re-test, 12 tiers [SM] | P: daily strain target from recovery [BK] |
| 3 | AI chat / NL Q&A | N: Active Intelligence is summaries, not chat [CP] | P: via user's own Claude or ChatGPT through MCP [CM] | N [P] | Y: AI Coach (paid) [S] | P: Workout Buddy speaks but no Q&A chat [A]; Training Note is strength only | Y: Gemini coach (Premium) [GH] | N (none found) | Y: WHOOP Coach (included) [W] |
| 4 | Human coach access | P: via TrainingPeaks (now Garmin-owned, separate paid) [the5krunner] | Y: free COROS Coaches email [C] | P: Polar Flow for Coach platform [BK] | P: TrainingPeaks integration [S] | N | N | N | N [BK] |
| 5 | Audio / voice cues | P: Garmin Coach tip videos [G]; phone audio prompts [BK] | P: watch alerts [BK] | P [BK] | P [BK] | Y: Workout Buddy voice [A] | P [BK] | Y: running coach guidance on watch [BK] | N (users request it) [W] |
| 6 | Own GPS tracking | Y | Y | Y | Y | Y | Y: Pixel Watch GPS [GH] | Y | P: phone or imported GPS only [W] |
| 7 | Third-party device support | P: Garmin only for plans; imports limited [BK] | N: COROS devices [BK] | P: Polar watches; imports plans from other platforms [P] | N: Suunto devices [S] | P: HealthKit aggregates [BK] | P: Fitbit and Pixel first; "other devices coming soon" [GH] | N: Galaxy Watch 8+ [SM] | P: imports activities with GPS from other devices [W] |
| 8 | Structured workouts pushed to watch | Y [G] | Y [C] | Y [BK] | Y: SuuntoPlus Guides; AI Coach output syncs [S] | Y: custom workouts, WorkoutKit [BK] | P/unknown | Y: programmes run on watch [SM] | N [BK] |
| 9 | Pace zones / VDOT / race prediction | Y: race predictor with course and weather [G] | Y: threshold pace, 5K–M predictions [CM] | Y: Running Index, race predictor [BK]; RI history graph [the5krunner] | P [BK] | P: pace alerts; no race predictor [BK] | N: no race predictions on Pixel Watch 4 [GH] | P: level-based pace [SM] | N |
| 10 | HR zones | Y | Y | Y [P] | Y [S] | Y [BK] | Y [BK] | Y [SM] | Y [BK] |
| 11 | Training load / fitness | Y [G] | Y: EvoLab load, ratio [CM] | Y: Cardio Load [P] | Y: Training Zone [S] | Y: Training Load [A] | P [BK] | P [BK] | Y: Strain [W] |
| 12 | Recovery / readiness (HRV, sleep) | Y [G] | Y: HRV, recovery [CM] | Y: Nightly Recharge [P] | Y: Suunto Coach recovery and sleep [S] | P: Vitals and sleep [BK] | Y [GH] | Y: sleep coaching [SM] | Y: core product [W] |
| 13 | Strength / mobility plans | P: strength workouts; TrainHeroic now owned [BK]/[the5krunner] | P: strength workouts [BK] | P: FitSpark strength [BK] | P | Y: Fitness+ Gym Strength (paid, beta) [A] | P: coach suggestions [GH] | P | Y: Strength Trainer [W] |
| 14 | Cross-training / multisport | Y | Y | Y | Y | Y | Y: "dozens of sports" [GH] | P: expansion planned [SM] | Y |
| 15 | Injury prevention / return-from-injury | N/P | N | N | N | N | P: onboarding asks about injuries [GH] | P: form and asymmetry metrics [SM] | N |
| 16 | Nutrition / fuelling | P: Connect+ food logging (paid) [Yahoo] | N | N | N | N | Y: meal logging via coach [GH] | P: Samsung Health food log [BK] | N/P |
| 17 | Social / community | Y: Connect groups, badges [CP] | P | P | P: heatmaps [S] | P: activity sharing [BK] | P [BK] | P [BK] | Y: teams [BK] |
| 18 | Route planning | Y: courses [BK] | Y [BK] | P: Komoot import [BK] | Y: routes, heatmaps, AI routes [S] | P: Race Route only [BK] | N | P: Strava route import [SM] | N |
| 19 | Treadmill | Y | Y | Y | Y | Y: improved wrist distance (watchOS 27) [A] | Y [BK] | Y [BK] | P |
| 20 | Data export / open API | P: FIT export; business API paused or reopened; personal read-only API (Oct 2026) [Q5] | Y: MCP plus partner API [CM] | Y: AccessLink open [Q5] | P: partner API [Q5] | Y: HealthKit / WorkoutKit (on-device) [BK] | P: Google Health API (restricted) [Q5] | P: Health Connect [BK] | P: developer API [BK] |
| 21 | Free tier | Y: most coaching free; Connect+ $6.99/mo [CP] | Y: everything free [BK] | Y: Flow free; Fitness Program €9.99/mo [P] | Y: app free; AI Coach paid from 2027 [S] | Y: watchOS free; Fitness+ $9.99/mo [A] | P: free app; coach needs Premium $9.99/mo [GH] | Y [BK] | N: $199–$359/yr [W] |
| — | Platforms | iOS, Android, web | iOS, Android, web (Training Hub) | iOS, Android, web (Flow) [P] | iOS, Android | iOS only (watch needs iPhone) | Android, iOS [How-To Geek] | Android only (Android 10+) [SM] | iOS, Android |
| — | Watch purchase required? | Yes | Yes | Yes (Fitness Program list) [P] | Yes; AI Coach tied to Race 3S at launch [S] | Yes for Workout Buddy; Fitness+ works without a watch [A] | Coach launched for Fitbit and Pixel owners [GH] | Yes, Galaxy Watch 8+ [SM] | Yes (band included in membership) [BK] |

### Takeaway
Use the table with care. Cells tagged [BK] need verification before publication, especially rows 4, 5, 7, 13, 17, 18 and 20.

### Cited Findings
- See tags in the table; every tag maps to a source cited in Q1–Q3 or Q5.

### Inferences
- **No watch ecosystem scores Y on injury-return plans or fuelling guidance for runners.** Google's coach is the closest on nutrition, and Garmin Connect+ adds food logging only.
- **AI chat that writes to the watch** exists only in Suunto AI Coach (paid) and COROS via BYO-LLM MCP.

### Gaps
- All [BK] cells.

---

## Q5. Developer APIs: what can a free third-party app use to push workouts and read data?

### Takeaway
As of Nov 2026, Polar AccessLink and Apple HealthKit/WorkoutKit (on device) are the easiest routes for a small or free app. COROS and Suunto require partner approval (COROS also has a self-service MCP/OAuth route). Garmin's business APIs, which are the only way to push workouts to Garmin, were frozen to new applicants for most of 2026. The5krunner reported a new read-only personal API and a reopened program in late Oct 2026, so status should be re-checked. Fitbit's Web API was replaced by the restricted-scope Google Health API (legacy shutdown Sep–Nov 2026). Garmin Connect IQ (on-watch apps) remains open.

### Cited Findings
- **Garmin Training API:**
  - Lets approved business developers publish workouts and training plans to the Garmin Connect calendar. Access is free for approved business developers, with throttled production testing after approval — [Garmin Developers](https://developer.garmin.com/gc-developer-program/training-api).
  - Starter tier (Activity, Courses, Health, Training, Women's Health; push-only, no history, limited users) versus Enterprise (negotiated) — search synthesis of [Garmin overview](https://developer.garmin.com/gc-developer-program/overview).
- **Garmin program pause (2026):**
  - The application form was removed in spring 2026 ("Stay tuned"). On 20 May 2026 Garmin cited a "significant redesign and modernisation" with no resume date.
  - Blocks (applied 16 Jul) was told in mid-Sep that no new connections were being accepted. Hevy was reportedly refused and pointed to Connect IQ.
  - Existing integrations keep working, and FIT and bulk export still work.
  - Connect IQ is unaffected (SDK 9.2.0, 25 Aug 2026).
  - Background: Garmin's Jul 2025 API brand-attribution rules led to a Strava lawsuit, dropped about 3 weeks later — [the5krunner, 14 Sep 2026](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/).
- **Garmin personal API (Oct 2026):**
  - Any athlete can get a key from Connect account settings, with no approval. It covers only your own data: activity JSON plus full FIT files, and health JSON.
  - It is read-only and pull-only, and cannot push workouts or routes (Training and Courses APIs stay business-only). API files may strip undocumented fields (VO2max, recovery time).
  - The article states the Connect Developer Program "reopened after being closed to new applicants for seven months". This conflicts with the Sep report and was not independently verified — [the5krunner, 22 Oct 2026](https://the5krunner.com/2026/10/22/garmin-personal-api/).
- **COROS:**
  - The Partner API is for "established platforms" with a demonstrated user base and a registered company; apply to api@coros.com.
  - It covers workout and training-plan push, GPX routes and FIT downloads, at 1,000 calls/min. Smaller developers can use a self-service MCP-based OAuth option.
  - Source: search synthesis of a COROS support article; the page itself returned 403 — [COROS support](https://support.coros.com/hc/en-us/articles/53181766856724).
  - MCP: read access to summaries; write access for plans since Sep 2026 — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/); [COROS support](https://support.coros.com/hc/en-us/articles/50841795180948-Connect-Your-COROS-to-AI).
- **Suunto:** the Cloud API is through the partner program. You apply, sign an agreement and get API Zone access, with a reply within about 2 weeks. It can push routes and workouts (FIT upload); no sleep push or fetch — [Suunto API Zone FAQ](https://apizone.suunto.com/faq); [Suunto workout upload how-to](https://apizone.suunto.com/how-to-workout-upload).
- **Polar AccessLink v3:** any registered Polar Flow user can create an API client in the admin portal, with webhooks available — [Polar AccessLink](https://polar.com/accesslink-api). [BK] AccessLink is read-focused (exercises, daily activity, sleep, Nightly Recharge); it does not offer a public endpoint for pushing planned workouts.
- **Google Health API (successor to the Fitbit Web API):**
  - The legacy API is being turned down: 30 Sep 2026 per the Aug newsletter, and 2 Nov 2026 for HTTP 410 per the About page. The dates conflict.
  - Auth moves to Google OAuth. Data comes in bundles with auto-subscribing webhooks and intraday data, plus a "Reconciled Stream".
  - All scopes are Restricted, needing a privacy and security review. A CLI is aimed at AI agents — [Google Health API about](https://developers.google.com/health/about); [Aug 2026 newsletter](https://developers.google.com/health/newsletters).
- **Health Connect / Samsung:** a coaching app reading Health Connect can use Galaxy Watch runs without Strava in between. The source is commercial — [therunninggenie](https://therunninggenie.com/blog/best-ai-running-coach-for-samsung-galaxy-watch-users).
- **Consumer AI access to phone health data:** Claude and ChatGPT gained Apple Health and Android Health Connect read access in Jan 2026 — [the5krunner](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).
- **Workarounds for pushing to Garmin:** intervals.icu as a bridge, and generated FIT workout files — [the5krunner](https://the5krunner.com/2026/09/14/garmin-developer-api-access-paused/). Tredict's MCP (per-second data plus write) and intervals.icu "IcuSync" can write workouts to calendars — [the5krunner comments](https://the5krunner.com/2026/05/13/coros-mcp-ai-data/).

### Inferences
- **What a free indie running-coach app can realistically do in late 2026:**
  - **iOS:** HealthKit read plus WorkoutKit push to Apple Watch, free and on device ([BK] WorkoutKit, iOS 17+, lets apps create and schedule custom workouts that appear in the Workout app).
  - **Android:** Health Connect read. Pushing workouts to Samsung or Pixel watches is not openly supported ([BK]).
  - **Polar:** read via AccessLink; workouts are not pushed.
  - **Garmin:** read your own data only via the personal API, or read and push only with approved business access, which was unreliable to obtain in 2026. Alternatives are a Connect IQ watch app/data field or a FIT file the user imports. Routing through intervals.icu or TrainingPeaks is another option, and TrainingPeaks is now Garmin-owned.
  - **COROS / Suunto:** partner agreements are needed to push workouts; for COROS, the user can also connect their own AI through the MCP.
- **Platform risk:** Garmin's API pause and Strava's AI-training data restrictions show that relying on one platform's API is a material risk for a third-party coach.

### Gaps
- Whether the Garmin Connect Developer Program is actually accepting new business applications as of 25 Nov 2026 (the Sep and Oct reports conflict).
- [BK] WHOOP Developer API: free, OAuth, read-only (recovery, sleep, strain, workouts); no workout push.
- [BK] Samsung Health Data SDK: needs partner approval for some data types. Not verified for 2026.
- [BK] Apple WorkoutKit limits (custom/pacer/race-route workout types; no plan-level adaptation API).
- Whether Polar AccessLink added any workout-push endpoint by 2026 (none found).
