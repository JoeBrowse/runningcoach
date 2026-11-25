import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { APP_VERSION, LAST_SEEN_VERSION_KEY, releaseNotesFor } from "./data/releaseNotes.js";
import { setTourDemoData } from "./data/tourDemo.js";
import { TOUR_STEPS } from "./data/tourSteps.jsx";
import { UNLOCKED_BUILD, loadLicense, setLicenseEntitled, offlineGraceDaysLeft, isLicenseUnlocked, ALLOWED_WHEN_LOCKED_SCREENS, initBilling, subscribe, restorePurchases } from "./lib/billing.js";
import { loadCustomExercises, loadPausedExercises, loadHiddenExercises, loadManualOrderMuscles, loadExerciseOrder, loadExerciseEdits } from "./lib/exerciseLibrary.js";
import { runMigrations } from "./lib/migrations.js";
import { isNativeRuntime, registerServiceWorker } from "./lib/platform.js";
import { programmeNextIndex, programmePlanned, programmeCompleted, programmeWeekNumber, getActiveProgramme, saveActiveProgramme, archiveActiveProgramme } from "./lib/programmes.js";
import { applyTrainingPrefs, DEFAULT_SETTINGS } from "./lib/settings.js";
import { safeGet, safeSet, requestPersistentStorage } from "./lib/storage.js";
import { hexToRgba, COLORS, applyTheme } from "./theme.js";
import { FeatureTour } from "./components/FeatureTour.jsx";
import { introAlreadyPlayed, OpeningSequence } from "./components/OpeningSequence.jsx";
import { ColourScreen } from "./screens/ColourScreen.jsx";
import { CopyPreviousScreen } from "./screens/CopyPreviousScreen.jsx";
import { DoneScreen } from "./screens/DoneScreen.jsx";
import { ExerciseDatabaseScreen } from "./screens/ExerciseDatabaseScreen.jsx";
import { FeatureListScreen } from "./screens/FeatureListScreen.jsx";
import { GuidedProgrammeWizard } from "./screens/GuidedProgrammeWizard.jsx";
import { HistoryScreen } from "./screens/HistoryScreen.jsx";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { NerdStatsScreen } from "./screens/NerdStatsScreen.jsx";
import { OneRMScreen } from "./screens/OneRMScreen.jsx";
import { OneRMWorkoutScreen } from "./screens/OneRMWorkoutScreen.jsx";
import { PaywallScreen } from "./screens/PaywallScreen.jsx";
import { PersonalInfoScreen } from "./screens/PersonalInfoScreen.jsx";
import { ProgrammeBuilderScreen } from "./screens/ProgrammeBuilderScreen.jsx";
import { ProgrammeScreen } from "./screens/ProgrammeScreen.jsx";
import { ProgrammeStatsScreen } from "./screens/ProgrammeStatsScreen.jsx";
import { ProgressScreen } from "./screens/ProgressScreen.jsx";
import { SelectScreen } from "./screens/SelectScreen.jsx";
import { SettingsScreen } from "./screens/SettingsScreen.jsx";
import { SplitScreen } from "./screens/SplitScreen.jsx";
import { StartChoiceScreen } from "./screens/StartChoiceScreen.jsx";
import { StreakScreen } from "./screens/StreakScreen.jsx";
import { SuggestedScreen } from "./screens/SuggestedScreen.jsx";
import { TourWorkoutPreviewScreen } from "./screens/TourWorkoutPreviewScreen.jsx";
import { TrainingScreen } from "./screens/TrainingScreen.jsx";
import { VersionHistoryScreen } from "./screens/VersionHistoryScreen.jsx";
import { VolumeScreen } from "./screens/VolumeScreen.jsx";
import { WelcomeScreen } from "./screens/WelcomeScreen.jsx";
import { WhatsNewScreen } from "./screens/WhatsNewScreen.jsx";
import { WorkoutScreen } from "./screens/WorkoutScreen.jsx";

/* ---------------------------------------------------------------
   APP
--------------------------------------------------------------- */

export default function App() {
  const [screen, setScreenRaw] = useState("home");
  const [split, setSplit] = useState(null);
  const [selection, setSelection] = useState({});
  const [presetExercises, setPresetExercises] = useState(null);
  // Superset groups carried in from a copied session. Cleared alongside
  // every other way of seeding a workout so a copied pairing can never
  // leak into an unrelated one.
  const [presetSupersets, setPresetSupersets] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [newPBs, setNewPBs] = useState([]);
  // The session just saved, kept so the finish screen can offer to share it.
  const [doneSession, setDoneSession] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [workoutOrigin, setWorkoutOrigin] = useState("select");
  const [appendMobility, setAppendMobility] = useState(true);
  const [oneRMTest, setOneRMTest] = useState(null);
  const [onermOrigin, setOnermOrigin] = useState("home");
  const [programmeCtx, setProgrammeCtx] = useState(null);
  const [statsProgramme, setStatsProgramme] = useState(null);
  const [statsIsFinished, setStatsIsFinished] = useState(false);
  const [doneProgrammeInfo, setDoneProgrammeInfo] = useState(null);
  const [homeReload, setHomeReload] = useState(0);
  const [currentProgramme, setCurrentProgramme] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [whatsNew, setWhatsNew] = useState(null); // release notes to show once after an update
  // Starts true so the first painted frame is the opening rather than a
  // flash of Home behind it; switched off immediately once settings load if
  // the lifter has turned it off, or if it has already run this session.
  const [intro, setIntro] = useState(() => !introAlreadyPlayed());
  const [tourStep, setTourStep] = useState(0);
  const [showFeatureListHint, setShowFeatureListHint] = useState(false);
  const [license, setLicense] = useState(null);
  const [offers, setOffers] = useState(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseMsg, setPurchaseMsg] = useState("");

  const activeProgrammeMeta = currentProgramme
    ? { name: currentProgramme.name, nextDayName: currentProgramme.days[programmeNextIndex(currentProgramme)] ? currentProgramme.days[programmeNextIndex(currentProgramme)].name : "" }
    : null;

  const unlocked = isLicenseUnlocked(license);

  // The only place navigation is gated: while locked (trial over, not
  // purchased) and not mid-tour, anything outside ALLOWED_WHEN_LOCKED_SCREENS
  // redirects to the paywall instead. Every existing onClick handler in this
  // file already calls setScreen(...), so this wrapper is the only change
  // needed to make the whole app respect the trial/purchase gate.
  function setScreen(target) {
    if (!showTour && !unlocked && !ALLOWED_WHEN_LOCKED_SCREENS.has(target)) {
      setScreenRaw("paywall");
      return;
    }
    setScreenRaw(target);
  }

  async function chooseMode(mode) {
    const next = { ...settings, appMode: mode === "advanced" ? "advanced" : "simple" };
    setSettings(next);
    await safeSet("settings", next);
    await safeSet("mode-chosen", true);
    setShowWelcome(false);
    setTourDemoData(true);
    setShowTour(true);
  }

  useEffect(() => {
    async function init() {
      const savedSettings = await safeGet("settings");
      // Read before the migrations rather than after them: two of those
      // merge one exercise's history into another and trim the result to
      // the cap, so they have to know a raised cap before they run or they
      // would throw away sessions the lifter asked to keep.
      applyTrainingPrefs({ ...DEFAULT_SETTINGS, ...(savedSettings || {}) });
      await runMigrations();
      await loadCustomExercises();
      // After the customs, so an edit to one lands on the entry it belongs
      // to; before the order, so a moved exercise is ranked under the muscle
      // it moved to rather than the one it left.
      await loadExerciseEdits();
      await loadPausedExercises();
      await loadHiddenExercises();
      await loadManualOrderMuscles();
      // Must run after custom exercises are registered, so a saved order
      // that includes them positions them correctly rather than appending.
      await loadExerciseOrder();
      if (savedSettings) {
        const merged = { ...DEFAULT_SETTINGS, ...savedSettings, weightUnit: "kg" };
        // Before setSettings, so the first paint is already in the right
        // palette rather than flashing the standard one and correcting.
        applyTheme(merged.theme, merged.colourScheme, merged.highContrast);
        setSettings(merged);
        // Switched off, or already played this session: clear it on the same
        // pass that reads the setting, before it has drawn anything worth
        // seeing.
        if (merged.showIntro === false) setIntro(false);
      }
      const active = await getActiveProgramme();
      setCurrentProgramme(active);
      const tourSeen = await safeGet("tour-seen");
      // Simple vs Advanced is asked before anything else on a first run.
      // Buried in Settings, Advanced Mode went unfound, and the tour kept
      // describing features the user had switched off without knowing.
      // The tour starts once the choice is made (see chooseMode).
      if (!tourSeen) {
        if (await safeGet("mode-chosen")) {
          setTourDemoData(true);
          setShowTour(true);
        } else {
          setShowWelcome(true);
        }
      }

      // First launch after an update gets the changelog. A brand-new install
      // does not: the tour is its introduction, and notes for a release it
      // never ran are just noise. Recording the version either way means the
      // next real update is the first changelog anyone sees.
      //
      // "Existing user" is decided by tour-seen, not by a recorded version:
      // the version key did not exist before 1.1.0, so everyone upgrading
      // from an older build has no version stored and would otherwise be
      // mistaken for a first install and shown nothing.
      const seenVersion = await safeGet(LAST_SEEN_VERSION_KEY);
      if (seenVersion !== APP_VERSION) {
        const notes = releaseNotesFor(APP_VERSION);
        if (notes && tourSeen) setWhatsNew(notes);
        await safeSet(LAST_SEEN_VERSION_KEY, APP_VERSION);
      }

      const lic = await loadLicense();
      setLicense(lic);
      // Nothing to sell in a give-away build, so the store is never even
      // contacted — a side-loaded APK has no Play Billing connection to
      // make anyway.
      if (!UNLOCKED_BUILD) {
        initBilling(
          async (entitled) => {
            // Play's answer is authoritative in both directions: this is
            // what re-locks the app when a subscription lapses, not just
            // what unlocks it when one starts.
            const next = await setLicenseEntitled(entitled);
            setLicense(next);
          },
          (found) => setOffers(found),
        );
      }
      if (!isNativeRuntime()) {
        // Dev-only escape hatches so the paywall flow can be exercised
        // outside a packaged APK, where Play Billing never runs. Not wired
        // to any UI — call from the browser console.
        window.__ironlogDevUnlock = async () => {
          const next = await setLicenseEntitled(true);
          setLicense(next);
        };
        window.__ironlogDevLock = async () => {
          const next = await setLicenseEntitled(false);
          setLicense(next);
        };
        window.__ironlogDevOffers = (o) => setOffers(o || {
          annual: { planId: "annual", price: "£9.99", trialDays: 7 },
          monthly: { planId: "monthly", price: "£1.99", trialDays: 7 },
        });
      }

      setDbReady(true);
    }
    init();
    registerServiceWorker();
    requestPersistentStorage();

    // Make sure the viewport honors device safe areas (notch / status bar /
    // Dynamic Island) so fixed top content like TopBar doesn't render
    // underneath system UI and become hard to tap.
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover";
  }, []);

  // Drives navigation as the tour advances — see the TOUR_STEPS comment
  // for why "workoutPreview" maps to a dedicated preview screen instead
  // of the real "workout" screen.
  useEffect(() => {
    if (!showTour) return;
    const step = TOUR_STEPS[tourStep];
    setScreenRaw(step.screen === "workoutPreview" ? "tourWorkoutPreview" : step.screen);
  }, [showTour, tourStep]);

  // The moment the app becomes unlocked (purchase completes, or restore
  // succeeds) while the paywall is showing, drop straight back to Home.
  useEffect(() => {
    if (screen === "paywall" && isLicenseUnlocked(license)) setScreenRaw("home");
  }, [license, screen]);

  async function updateSettings(next) {
    // The palette lives in a module object every screen reads while it
    // paints, so it has to be rewritten before React re-renders rather than
    // passed down as state.
    applyTheme(next.theme, next.colourScheme, next.highContrast);
    applyTrainingPrefs(next);
    setSettings(next);
    await safeSet("settings", next);
  }

  async function closeTour() {
    // Turn the sample data off before anything re-reads, and bump the Home
    // reload key so a Home screen that is already mounted refetches the
    // user's real (empty) history instead of keeping the example on screen.
    setTourDemoData(false);
    setShowTour(false);
    setTourStep(0);
    setScreenRaw("home");
    setHomeReload((n) => n + 1);
    await safeSet("tour-seen", true);
    const hintShown = await safeGet("feature-list-hint-shown");
    if (!hintShown) {
      setShowFeatureListHint(true);
      await safeSet("feature-list-hint-shown", true);
    }
  }
  function replayTour() {
    setTourDemoData(true);
    setTourStep(0);
    setShowTour(true);
  }

  // The feature-list nudge is shown exactly once, right after the tour
  // closes (see closeTour) — auto-dismiss it so it doesn't linger forever
  // if the user doesn't tap it away themselves.
  useEffect(() => {
    if (!showFeatureListHint) return;
    const t = setTimeout(() => setShowFeatureListHint(false), 7000);
    return () => clearTimeout(t);
  }, [showFeatureListHint]);

  async function handleBuy(planKey) {
    setPurchaseMsg("");
    if (!isNativeRuntime()) {
      setPurchaseMsg("Subscribing only works in the installed app, not in a browser preview.");
      return;
    }
    setPurchaseBusy(true);
    const result = await subscribe(planKey);
    setPurchaseBusy(false);
    if (!result.ok) setPurchaseMsg("That didn't go through. Please try again.");
  }

  async function handleRestore() {
    setPurchaseMsg("");
    if (!isNativeRuntime()) {
      setPurchaseMsg("Restore only works in the installed app, not in a browser preview.");
      return;
    }
    setPurchaseBusy(true);
    const ok = await restorePurchases();
    setPurchaseBusy(false);
    if (ok && !isLicenseUnlocked(license)) {
      setPurchaseMsg("No active subscription found for this Google account.");
    } else if (!ok) {
      setPurchaseMsg("Couldn't restore — check your Google Play account and try again.");
    }
  }

  function startProgrammeDay(day, programme) {
    setSplit(day.name);
    setSelection({});
    setPresetExercises(day.exercises.map((e) => ({ id: e.id, muscle: e.muscle, method: e.method || null })));
    setPresetSupersets(null);
    setResumeData(null);
    setProgrammeCtx({ programmeId: programme.id, dayKey: day.key, dayName: day.name });
    setAppendMobility(false);
    setWorkoutOrigin("programme");
    setScreen("workout");
  }

  async function createProgramme(programme) {
    const active = await getActiveProgramme();
    if (active) await archiveActiveProgramme(true);
    await saveActiveProgramme(programme);
    setCurrentProgramme(programme);
    setHomeReload((n) => n + 1);
    setScreen("programme");
  }

  async function finishActiveProgrammeFlow() {
    const active = await getActiveProgramme();
    if (!active) { setScreen("home"); return; }
    const endedEarly = programmeCompleted(active) < programmePlanned(active);
    const finished = await archiveActiveProgramme(endedEarly);
    setCurrentProgramme(null);
    setHomeReload((n) => n + 1);
    setStatsProgramme(finished);
    setStatsIsFinished(true);
    setScreen("programmeStats");
  }

  async function handleWorkoutFinished(pbs, session) {
    setNewPBs(pbs || []);
    setDoneSession(session || null);
    if (programmeCtx) {
      const active = await getActiveProgramme();
      setCurrentProgramme(active);
      if (active) {
        const done = programmeCompleted(active);
        const planned = programmePlanned(active);
        const nextIdx = programmeNextIndex(active);
        const nextDay = active.days[nextIdx];
        setDoneProgrammeInfo({
          name: active.name,
          week: programmeWeekNumber(active),
          weeks: active.weeks,
          done,
          planned,
          nextDayName: nextDay ? nextDay.name : "",
          complete: done >= planned,
        });
      } else {
        setDoneProgrammeInfo(null);
      }
    } else {
      setDoneProgrammeInfo(null);
    }
    setProgrammeCtx(null);
    setPresetExercises(null);
    setPresetSupersets(null);
    setResumeData(null);
    setHomeReload((n) => n + 1);
    setScreen("done");
  }

  if (!dbReady) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: COLORS.textDim, fontFamily: "'Oswald', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        maxWidth: 412,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        button { cursor: pointer; background: none; border: none; color: inherit; font: inherit; padding: 0; }
      `}</style>

      {screen === "home" && (
        <HomeScreen
          settings={settings}
          reloadKey={homeReload}
          activeProgramme={currentProgramme}
          subscribed={isLicenseUnlocked(license)}
          graceDaysLeft={UNLOCKED_BUILD ? null : offlineGraceDaysLeft(license)}
          onViewPaywall={() => setScreenRaw("paywall")}
          onStart={() => setScreen("startChoice")}
          onViewHistory={() => setScreen("history")}
          onOpenProgramme={() => setScreen("programme")}
          onStartProgrammeDay={(day, programme) => startProgrammeDay(day, programme)}
          onViewProgrammeStats={(prog) => { setStatsProgramme(prog); setStatsIsFinished(true); setScreen("programmeStats"); }}
          onNewProgramme={() => setScreen("programmeBuilder")}
          onViewPB={() => setScreen("pb")}
          onViewProgress={() => setScreen("progress")}
          onViewSettings={() => setScreen("settings")}
          onViewSuggested={() => setScreen("suggested")}
          onViewVolume={() => setScreen("volume")}
          onViewStreak={() => setScreen("streak")}
          onViewExerciseDb={() => setScreen("exerciseDb")}
          onViewOneRM={() => {
            setOnermOrigin("home");
            setScreen("onerm");
          }}
          onResumeWorkout={(snapshot) => {
            setSplit(snapshot.split);
            setResumeData(snapshot);
            setProgrammeCtx(snapshot.programmeCtx || null);
            setPresetExercises(null);
            setPresetSupersets(null);
            setWorkoutOrigin("home");
            setScreen("workout");
          }}
          onStartTemplate={(t) => {
            setSplit(t.split);
            setResumeData(null);
            setWorkoutOrigin("home");
            setAppendMobility(true);
            if (t.mode === "specific") {
              setSelection({});
              setPresetExercises(t.exercises);
              setPresetSupersets(null);
            } else {
              setSelection(t.selection);
              setPresetExercises(null);
              setPresetSupersets(null);
            }
            setScreen("workout");
          }}
        />
      )}

      {screen === "startChoice" && (
        <StartChoiceScreen
          hasActive={!!activeProgrammeMeta}
          activeName={activeProgrammeMeta ? activeProgrammeMeta.name : ""}
          nextDayName={activeProgrammeMeta ? activeProgrammeMeta.nextDayName : ""}
          onContinue={() => setScreen("programme")}
          onNew={() => setScreen("programmeBuilder")}
          onFree={() => setScreen("split")}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "programmeBuilder" && (
        <ProgrammeBuilderScreen
          onBack={() => setScreen("startChoice")}
          onCreate={createProgramme}
          onGuided={() => setScreen("programmeGuided")}
        />
      )}

      {screen === "programmeGuided" && (
        <GuidedProgrammeWizard
          onBack={() => setScreen("programmeBuilder")}
          onDecline={() => setScreen("programmeBuilder")}
          onCreate={createProgramme}
        />
      )}

      {screen === "programme" && (
        <ProgrammeScreen
          programme={currentProgramme}
          onBack={() => setScreen("home")}
          onStartDay={(day, programme) => startProgrammeDay(day, programme)}
          onProgrammeChange={setCurrentProgramme}
          onFinishProgramme={finishActiveProgrammeFlow}
          onViewStats={(prog) => { setStatsProgramme(prog); setStatsIsFinished(false); setScreen("programmeStats"); }}
        />
      )}

      {screen === "programmeStats" && statsProgramme && (
        <ProgrammeStatsScreen
          programme={statsProgramme}
          isFinished={statsIsFinished}
          onBack={() => setScreen(statsIsFinished ? "home" : "programme")}
          onHome={() => setScreen("home")}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen("home")}
          onViewColour={() => setScreen("colour")}
          onViewTraining={() => setScreen("training")}
          onReplayTour={replayTour}
          onViewFeatureList={() => setScreen("featureList")}
          onViewWhatsNew={() => setWhatsNew(releaseNotesFor(APP_VERSION))}
          onViewVersionHistory={() => setScreen("versionHistory")}
          license={license}
          onBuy={handleBuy}
          onRestore={handleRestore}
          purchaseBusy={purchaseBusy}
          purchaseMsg={purchaseMsg}
        />
      )}

      {screen === "versionHistory" && <VersionHistoryScreen onBack={() => setScreen("settings")} />}

      {screen === "colour" && (
        <ColourScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen("settings")}
        />
      )}

      {screen === "training" && (
        <TrainingScreen
          settings={settings}
          onChange={updateSettings}
          onBack={() => setScreen("settings")}
        />
      )}

      {screen === "featureList" && <FeatureListScreen onBack={() => setScreen("settings")} />}

      {screen === "exerciseDb" && <ExerciseDatabaseScreen onBack={() => setScreen("home")} />}

      {screen === "tourWorkoutPreview" && <TourWorkoutPreviewScreen />}

      {screen === "paywall" && (
        <PaywallScreen
          onBack={() => setScreenRaw("home")}
          onBuy={handleBuy}
          onRestore={handleRestore}
          busy={purchaseBusy}
          message={purchaseMsg}
          offers={offers}
          trialDays={(offers && ((offers.annual && offers.annual.trialDays) || (offers.monthly && offers.monthly.trialDays))) || 7}
        />
      )}

      {screen === "suggested" && (
        <SuggestedScreen
          onBack={() => setScreen("home")}
          onBuild={(list) => {
            setSplit("Suggested");
            setPresetExercises(list);
            setPresetSupersets(null);
            setResumeData(null);
            setWorkoutOrigin("suggested");
            setAppendMobility(true);
            setScreen("workout");
          }}
        />
      )}

      {screen === "split" && (
        <SplitScreen
          onBack={() => setScreen("home")}
          onPick={(s) => {
            setSplit(s);
            setPresetExercises(null);
            setPresetSupersets(null);
            setResumeData(null);
            setWorkoutOrigin("select");
            setScreen("select");
          }}
          onCopyPrevious={() => setScreen("copyPrevious")}
          onOneRMSession={() => {
            setOnermOrigin("split");
            setScreen("onerm");
          }}
        />
      )}

      {screen === "copyPrevious" && (
        <CopyPreviousScreen
          onBack={() => setScreen("split")}
          onPick={(session) => {
            setSplit(session.split);
            setPresetExercises(session.exercises);
            setPresetSupersets(session.supersets || null);
            setResumeData(null);
            setWorkoutOrigin("copyPrevious");
            setAppendMobility(false);
            setScreen("workout");
          }}
        />
      )}

      {screen === "select" && (
        <SelectScreen
          split={split}
          settings={settings}
          onBack={() => setScreen("split")}
          onContinue={(sel) => {
            setSelection(sel);
            setPresetExercises(null);
            setPresetSupersets(null);
            setResumeData(null);
            setWorkoutOrigin("select");
            setAppendMobility(true);
            setScreen("workout");
          }}
          onContinueSpecific={(list) => {
            setPresetExercises(list);
            setPresetSupersets(null);
            setResumeData(null);
            setWorkoutOrigin("select");
            setAppendMobility(true);
            setScreen("workout");
          }}
        />
      )}

      {screen === "workout" && (
        <WorkoutScreen
          key={resumeData ? `resume-${resumeData.startedAt}` : `${split}-${presetExercises ? "preset" : "fresh"}`}
          split={split}
          selection={selection}
          presetExercises={presetExercises}
          presetSupersets={presetSupersets}
          resumeData={resumeData}
          settings={settings}
          appendMobility={appendMobility}
          programmeCtx={programmeCtx}
          onBack={() => setScreen(workoutOrigin)}
          onFinish={handleWorkoutFinished}
        />
      )}

      {screen === "done" && (
        <DoneScreen
          onHome={() => setScreen("home")}
          newPBs={newPBs}
          programmeInfo={doneProgrammeInfo}
          session={doneSession}
          settings={settings}
        />
      )}

      {screen === "history" && <HistoryScreen onBack={() => setScreen("home")} settings={settings} />}

      {screen === "pb" && <PersonalInfoScreen onBack={() => setScreen("home")} />}

      {screen === "progress" && <ProgressScreen onBack={() => setScreen("home")} />}

      {screen === "volume" && <VolumeScreen onBack={() => setScreen("home")} />}

      {screen === "streak" && <StreakScreen onBack={() => setScreen("home")} onViewNerdStats={() => setScreen("nerdStats")} />}

      {screen === "nerdStats" && <NerdStatsScreen onBack={() => setScreen("streak")} />}

      {screen === "onerm" && (
        <OneRMScreen
          settings={settings}
          onBack={() => setScreen(onermOrigin)}
          onGenerateWorkout={(exerciseId, target, isBodyweight) => {
            setOneRMTest({ exerciseId, target, isBodyweight });
            setScreen("onermWorkout");
          }}
        />
      )}

      {screen === "onermWorkout" && oneRMTest && (
        <OneRMWorkoutScreen
          exerciseId={oneRMTest.exerciseId}
          target={oneRMTest.target}
          isBodyweight={oneRMTest.isBodyweight}
          settings={settings}
          onBack={() => setScreen("onerm")}
          onDone={() => {
            setOneRMTest(null);
            setScreen("home");
          }}
        />
      )}

      {/* The opening runs over the top of a mounted, working app rather
          than in front of it: by the time it clears, whatever was going to
          be on screen is already there. It is drawn from the first frame
          and dismissed as soon as settings say so, so an install with it
          switched off never sees a flash of it. */}
      {intro && <OpeningSequence onDone={() => setIntro(false)} />}

      {/* Above the tour in the tree but gated on it not running, so an
          update and a first launch can never stack on top of each other. */}
      {/* Ahead of everything: the mode choice is the first thing a new
          install shows, and the tour only begins once it is made. */}
      {showWelcome && <WelcomeScreen onChoose={chooseMode} />}

      {whatsNew && !showTour && (
        <WhatsNewScreen notes={whatsNew} onDismiss={() => setWhatsNew(null)} />
      )}

      {showTour && (
        <FeatureTour
          stepIndex={tourStep}
          onNext={() => setTourStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1))}
          onPrev={() => setTourStep((s) => Math.max(0, s - 1))}
          onSkip={closeTour}
        />
      )}

      {showFeatureListHint && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            maxWidth: 380,
            margin: "0 auto",
            zIndex: 180,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: COLORS.surface,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: 14,
            padding: "14px 14px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 9, background: hexToRgba(COLORS.accent, 0.14), display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, flexShrink: 0 }}>
            <BookOpen size={15} />
          </div>
          <div style={{ flex: 1, color: COLORS.text, fontSize: 12.5, lineHeight: 1.45 }}>
            Lost, or looking for something specific? Check <b>Feature List</b> in Settings first — every feature, explained.
          </div>
          <button onClick={() => setShowFeatureListHint(false)} style={{ color: COLORS.textDim, background: "transparent", border: "none", flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
