import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import { APP_VERSION, LAST_SEEN_VERSION_KEY, releaseNotesFor } from "./data/releaseNotes.js";
import { setTourDemoData } from "./data/tourDemo.js";
import { TOUR_STEPS, SIMPLE_TOUR_STEPS } from "./data/tourSteps.jsx";
import { loadCustomExercises, loadPausedExercises, loadHiddenExercises, loadManualOrderMuscles, loadExerciseOrder, loadExerciseEdits } from "./lib/exerciseLibrary.js";
import { runMigrations } from "./lib/migrations.js";
import { registerServiceWorker } from "./lib/platform.js";
import { programmeNextIndex, programmePlanned, programmeCompleted, programmeWeekNumber, getActiveProgramme, saveActiveProgramme, archiveActiveProgramme } from "./lib/programmes.js";
import { applyTrainingPrefs, DEFAULT_SETTINGS } from "./lib/settings.js";
import { safeGet, safeSet, lsGet, requestPersistentStorage } from "./lib/storage.js";
import { hexToRgba, COLORS, applyTheme } from "./theme.js";
import { FeatureTour } from "./components/FeatureTour.jsx";
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
import { WhatsNewScreen } from "./screens/WhatsNewScreen.jsx";
import { WorkoutScreen } from "./screens/WorkoutScreen.jsx";
import { MODE_SCREENS, isModeScreen, modeById, normaliseMode } from "./modes/index.js";
import { FirstOpen, MODE_FOR_USE } from "./plan/FirstOpen.jsx";
import { LiftSetupCard, LIFT_SETUP_DONE_KEY } from "./plan/LiftSetupCard.jsx";
import { PlanNotice } from "./plan/PlanNotice.jsx";
import { reportImportedRuns } from "./plan/unplanned.js";
import { listActivities } from "./shared/store.js";

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
  const [tourStep, setTourStep] = useState(0);
  const [showFeatureListHint, setShowFeatureListHint] = useState(false);
  // Simple mode gets the short tour on first launch; Settings always
  // replays the full one.
  const [tourSteps, setTourSteps] = useState(TOUR_STEPS);
  // Back stack and parameters for the registry screens (src/modes/).
  const [navStack, setNavStack] = useState([]);
  const [screenParams, setScreenParams] = useState(null);
  // "Make a plan for me" from the Lift setup card: the wizard pre-fill
  // and the screen that its back button opens.
  const [guidedPrefill, setGuidedPrefill] = useState(null);
  const [builderOrigin, setBuilderOrigin] = useState("startChoice");

  const activeProgrammeMeta = currentProgramme
    ? { name: currentProgramme.name, nextDayName: currentProgramme.days[programmeNextIndex(currentProgramme)] ? currentProgramme.days[programmeNextIndex(currentProgramme)].name : "" }
    : null;

  // The tour always runs over Lift, because it describes Iron Log screens.
  const mode = showTour ? "lift" : normaliseMode(settings.mode);

  function setScreen(target) {
    if (target === "home") {
      setNavStack([]);
      setScreenParams(null);
    }
    setScreenRaw(target);
  }

  async function setMode(next) {
    const id = normaliseMode(next);
    setScreen("home");
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
    if (id === settings.mode) return;
    await updateSettings({ ...settings, mode: id });
  }

  /* The one prop that every registry screen and mode home gets.
     See src/modes/README.md. */
  const nav = {
    mode,
    setMode,
    screen,
    params: screenParams,
    settings,
    updateSettings,
    reloadKey: homeReload,
    reload: () => setHomeReload((n) => n + 1),
    go(id, params) {
      setNavStack((st) => [...st, { screen, params: screenParams }]);
      setScreenParams(params === undefined ? null : params);
      setScreenRaw(id);
      if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
    },
    back() {
      if (!navStack.length) {
        setScreen("home");
        return;
      }
      const prev = navStack[navStack.length - 1];
      setNavStack(navStack.slice(0, -1));
      setScreenParams(prev.params);
      setScreenRaw(prev.screen);
    },
    home: () => setScreen("home"),
    openSettings: () => setScreen("settings"),
    // Opens an Iron Log screen by its id ("history", "streak", ...). Its
    // back button returns to the current mode's home.
    openLiftScreen: (id) => setScreen(id),
  };

  // First launch (spec v1.1 section 1): FirstOpen saves the master week
  // and run-profile.use. Then the app opens Plan (Both), Run (Running) or
  // Lift (Lifting). The tour cards replace the Lift feature tour; it
  // stays in Settings.
  async function finishFirstOpen({ use, appMode }) {
    const nextMode = MODE_FOR_USE[use] || "plan";
    await updateSettings({ ...settings, appMode: appMode === "advanced" ? "advanced" : "simple", mode: nextMode });
    await safeSet("mode-chosen", true);
    await safeSet("tour-seen", true);
    setShowWelcome(false);
    setScreen("home");
    setHomeReload((n) => n + 1);
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
  }

  // Runs from the watch (src/shared/wear.js): a run dated today or
  // yesterday on a day with no planned run changes the plan.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onWatchRuns = async (e) => {
      const ids = new Set((e && e.detail && e.detail.saved) || []);
      if (!ids.size) return;
      try {
        const list = await listActivities();
        await reportImportedRuns(list.filter((a) => ids.has(a.id)));
      } catch (err) {
        /* the runs are saved; the plan check is extra */
      }
    };
    window.addEventListener("skidmarks:watch-runs", onWatchRuns);
    return () => window.removeEventListener("skidmarks:watch-runs", onWatchRuns);
  }, []);

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
      } else {
        // A new install has no saved settings. Use the default theme
        // ("system"), so the first-open screens follow the phone's light
        // or dark mode.
        applyTheme(DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.colourScheme, DEFAULT_SETTINGS.highContrast);
      }
      const mergedSettings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
      const active = await getActiveProgramme();
      setCurrentProgramme(active);
      const tourSeen = await safeGet("tour-seen");
      // Simple vs Advanced is asked before anything else on a first run.
      // Buried in Settings, Advanced Mode went unfound, and the tour kept
      // describing features the user had switched off without knowing.
      // The tour starts once the choice is made (see chooseMode).
      if (!tourSeen) {
        if (await safeGet("mode-chosen")) {
          setTourSteps(mergedSettings.appMode === "advanced" ? TOUR_STEPS : SIMPLE_TOUR_STEPS);
          setTourDemoData(true);
          setShowTour(true);
        } else if (((await safeGet("workout-history")) || []).length) {
          // An upgraded Iron Log user: no onboarding. Lift opens as before
          // and Plan home shows a "Set up running" card.
          await safeSet("mode-chosen", true);
          setTourSteps(mergedSettings.appMode === "advanced" ? TOUR_STEPS : SIMPLE_TOUR_STEPS);
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
    const step = tourSteps[tourStep] || tourSteps[0];
    setScreenRaw(step.screen === "workoutPreview" ? "tourWorkoutPreview" : step.screen);
  }, [showTour, tourStep, tourSteps]);

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
    setTourSteps(TOUR_STEPS);
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

  function startProgrammeDay(day, programme) {
    setSplit(day.name);
    setSelection({});
    setPresetExercises(day.exercises.map((e) => ({ id: e.id, muscle: e.muscle, method: e.method || null, sets: e.sets || null, reps: e.reps || null })));
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
    // Lifting is set up (the Lift setup card goes away).
    await safeSet(LIFT_SETUP_DONE_KEY, true);
    setGuidedPrefill(null);
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

      {screen === "home" && mode !== "lift" && (() => {
        const ModeHome = modeById(mode).Home;
        return <ModeHome nav={nav} />;
      })()}

      {isModeScreen(screen) && (() => {
        const Screen = MODE_SCREENS[screen].Component;
        return <Screen key={screen} nav={nav} />;
      })()}

      {screen === "home" && mode === "lift" && (
        <HomeScreen
          settings={settings}
          reloadKey={homeReload}
          activeProgramme={currentProgramme}
          mode={mode}
          onModeChange={setMode}
          onStart={() => setScreen("startChoice")}
          onViewHistory={() => setScreen("history")}
          onOpenProgramme={() => setScreen("programme")}
          onStartProgrammeDay={(day, programme) => startProgrammeDay(day, programme)}
          onViewProgrammeStats={(prog) => { setStatsProgramme(prog); setStatsIsFinished(true); setScreen("programmeStats"); }}
          onNewProgramme={() => {
            setBuilderOrigin("startChoice");
            setScreen("programmeBuilder");
          }}
          setupCard={
            <LiftSetupCard
              activeProgramme={currentProgramme}
              reloadKey={homeReload}
              onEnterPlan={() => {
                setBuilderOrigin("home");
                setGuidedPrefill(null);
                setScreen("programmeBuilder");
              }}
              onMakePlan={(prefill) => {
                setBuilderOrigin("home");
                setGuidedPrefill(prefill);
                setScreen("programmeGuided");
              }}
            />
          }
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
          onNew={() => {
            setBuilderOrigin("startChoice");
            setScreen("programmeBuilder");
          }}
          onFree={() => setScreen("split")}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "programmeBuilder" && (
        <ProgrammeBuilderScreen
          onBack={() => setScreen(builderOrigin)}
          onCreate={createProgramme}
          onGuided={() => setScreen("programmeGuided")}
        />
      )}

      {screen === "programmeGuided" && (
        <GuidedProgrammeWizard
          prefill={guidedPrefill}
          onBack={() => setScreen(guidedPrefill ? "home" : "programmeBuilder")}
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
          onViewData={() => nav.go("shared:data")}
          onViewSampleDemo={() => nav.go("plan:demo")}
          onChangeUse={(use) => nav.go("plan:your-week", { use })}
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

      {/* Above the tour in the tree but gated on it not running, so an
          update and a first launch can never stack on top of each other. */}
      {/* Ahead of everything: the first-open flow is the first thing a
          new install shows (spec v1.1 section 1). */}
      {showWelcome && <FirstOpen onDone={finishFirstOpen} initialAppMode={settings.appMode} />}

      {/* "Plan updated" after an unplanned run or lift session. */}
      {!showWelcome && !showTour && <PlanNotice nav={nav} />}

      {whatsNew && !showTour && (
        <WhatsNewScreen notes={whatsNew} onDismiss={() => setWhatsNew(null)} />
      )}

      {showTour && (
        <FeatureTour
          steps={tourSteps}
          stepIndex={tourStep}
          onNext={() => setTourStep((s) => Math.min(tourSteps.length - 1, s + 1))}
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
            To find a feature, open <b>Feature List</b> in Settings. It explains every feature.
          </div>
          <button onClick={() => setShowFeatureListHint(false)} style={{ color: COLORS.textDim, background: "transparent", border: "none", flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
