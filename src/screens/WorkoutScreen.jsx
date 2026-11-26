import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Clock, Pencil, X, ChevronUp, ChevronDown } from "lucide-react";
import { EXERCISES, ALL_EXERCISES_BY_ID } from "../data/exercises.js";
import { SPLITS } from "../data/splits.js";
import { dateStrOf, friendlyDateTime, sortByAt, todayStr } from "../lib/dates.js";
import { registerCustomExercise } from "../lib/exerciseLibrary.js";
import { methodsFor, defaultMethodFor, isMachineExercise } from "../lib/exercises.js";
import { getTopSet, setHasData, setProgressTone } from "../lib/history.js";
import { recordProgrammeSession } from "../lib/programmes.js";
import { PB_EXERCISE_IDS, beatsRecord, bodyWeightPct } from "../lib/progression.js";
import { blankSets, restSecondsFor, startedRest, toggledRestPause, addedRestTime, useRestCountdown } from "../lib/rest.js";
import { capHistory } from "../lib/settings.js";
import { safeGet, safeSet, safeDelete } from "../lib/storage.js";
import { pickSmartForMuscle, buildWorkout, reorderByType } from "../lib/workoutBuilder.js";
import { hexToRgba, COLORS, SUPERSET_COLORS } from "../theme.js";
import { BackdatePicker } from "../components/BackdatePicker.jsx";
import { ExerciseCard } from "../components/ExerciseCard.jsx";
import { ExerciseSearchPicker } from "../components/ExercisePicker.jsx";
import { NewExerciseForm } from "../components/NewExerciseForm.jsx";
import { RestTimer } from "../components/RestTimer.jsx";
import { TopBar } from "../components/TopBar.jsx";
import { markGymSession } from "../plan/planState.js";
import { reportUnplannedLift } from "../plan/unplanned.js";

export function WorkoutScreen({ split, selection, presetExercises, presetSupersets, resumeData, settings, appendMobility, programmeCtx, onBack, onFinish }) {
  const isAdvanced = settings.appMode === "advanced";
  const [exercises, setExercises] = useState([]);
  const [history, setHistory] = useState({}); // exId -> raw ex-history array
  // Read by onToggleSetDone, which is memoised with no deps so that ticking
  // a set never re-renders every card. Refs keep it looking at current
  // values without putting them in the dependency list.
  const exercisesRef = useRef(exercises);
  const settingsRef = useRef(settings);
  exercisesRef.current = exercises;
  settingsRef.current = settings;
  const [sets, setSets] = useState({});
  // Read by onToggleSetDone and onSetChange to decide whether a tick or a
  // reps entry should start the rest timer. A setState updater's own return
  // value isn't visible to the code right after the setSets(...) call — it
  // runs later, on the next render — so the decision has to be made from
  // the state as it stood going into this event, not from inside the
  // updater trying to leak a result back out.
  const setsRef = useRef(sets);
  setsRef.current = sets;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timer, setTimer] = useState(null);
  const [addPanel, setAddPanel] = useState(null); // null | "db" | "new"
  const [meta, setMeta] = useState({}); // exId -> { brand, grip } for cable moves
  const [supersets, setSupersets] = useState([]); // [{ id, color, exIds: [] }]
  const [ssPicker, setSsPicker] = useState(null); // null | { picked: [exId, ...] }
  const [workoutDate, setWorkoutDate] = useState(resumeData && resumeData.workoutDate ? new Date(resumeData.workoutDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [armedFinish, setArmedFinish] = useState(false); // first tap of the two
  const armedTimeout = useRef(null);
  const startedAtRef = useRef(resumeData ? resumeData.startedAt : new Date().toISOString());

  const isBackdated = dateStrOf(workoutDate) !== todayStr();

  function supersetInfoFor(exId) {
    const idx = supersets.findIndex((g) => g.exIds.includes(exId));
    if (idx === -1) return null;
    return { label: String.fromCharCode(65 + idx), color: supersets[idx].color, id: supersets[idx].id };
  }

  function moveExercise(index, direction) {
    setExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setSets((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  useRestCountdown(timer, setTimer, settings.restTimerSound, settings.restVibrate);

  function startRest(ex) {
    // From the ref, not the prop: the callbacks that fire this are memoised
    // with an empty dependency list, so they hold the first startRest this
    // screen ever made and with it the settings as they were then.
    const total = restSecondsFor(ex, settingsRef.current);
    setTimer(startedRest(ex.name, total));
  }
  function togglePauseRest() {
    setTimer(toggledRestPause);
  }
  function addRestTime(secs) {
    setTimer((prev) => addedRestTime(prev, secs));
  }
  function skipRest() {
    setTimer(null);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let list = resumeData
        ? resumeData.exercises
        : presetExercises
        ? presetExercises
            .map((pe) => {
              const full = ALL_EXERCISES_BY_ID[pe.id];
              return full ? { ...full, muscle: pe.muscle, method: pe.method || undefined, targetSets: pe.sets || undefined, targetReps: pe.reps || undefined } : null;
            })
            .filter(Boolean)
        : buildWorkout(split, selection, settings.randomizeSelection);

      if (!resumeData && appendMobility && settings.includeMobility) {
        const usedIds = new Set(list.map((e) => e.id));
        const mobility = pickSmartForMuscle("Mobility", 1, usedIds, settings.randomizeSelection);
        if (mobility.length) list = [...list, mobility[0]];
      }

      const histEntries = await Promise.all(
        list.map(async (ex) => {
          const hist = await safeGet(`ex-history:${ex.id}`);
          return [ex.id, hist || []];
        })
      );
      if (cancelled) return;
      const histMap = {};
      histEntries.forEach(([id, v]) => (histMap[id] = v));
      setExercises(list);
      setHistory(histMap);
      // A day that named a variation starts on it; the picker is still there
      // if you want a different one today.
      if (!resumeData) {
        const seeded = {};
        list.forEach((ex) => { if (ex.method) seeded[ex.id] = { method: ex.method }; });
        if (Object.keys(seeded).length) setMeta((prev) => ({ ...seeded, ...prev }));
      }
      setSets(
        resumeData
          ? Object.fromEntries(
              Object.entries(resumeData.sets).map(([exId, arr]) => [
                exId,
                arr.map((s) => (s.done === undefined ? { ...s, done: false } : s)),
              ])
            )
          : Object.fromEntries(list.map((ex) => [ex.id, blankSets(ex.targetSets ? { ...settings, startingSets: ex.targetSets } : settings)]))
      );
      if (resumeData) {
        if (resumeData.meta) setMeta(resumeData.meta);
        if (resumeData.supersets) setSupersets(resumeData.supersets);
      } else if (presetSupersets && presetSupersets.length) {
        // Copying a session brings its pairings with it. Groups are pinned
        // to exercise ids, so drop any member that didn't make it into
        // today's list — and the whole group if that leaves it with nobody
        // left to pair with.
        const presentIds = new Set(list.map((e) => e.id));
        const carried = presetSupersets
          .map((g) => ({ ...g, exIds: g.exIds.filter((id) => presentIds.has(id)) }))
          .filter((g) => g.exIds.length > 1);
        if (carried.length) setSupersets(carried);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave an in-progress snapshot so an unfinished workout can be resumed
  // if the app is closed before hitting Finish.
  useEffect(() => {
    if (loading) return;
    safeSet("in-progress-workout", { split, exercises, sets, meta, supersets, workoutDate: workoutDate.toISOString(), programmeCtx: programmeCtx || null, startedAt: startedAtRef.current });
  }, [split, exercises, sets, meta, supersets, workoutDate, loading]);

  // With tick boxes hidden there is no tick to hang the auto-timer off, so
  // reps arriving is the next best signal that a set just happened — fired
  // once, on the transition from no reps to some, not on every keystroke.
  const onSetChange = useCallback((exId, idx, field, value) => {
    let startTimerFor = null;
    if (field === "reps" && value && settingsRef.current.showSetTicks === false && settingsRef.current.autoRestTimer !== false) {
      const arr = setsRef.current[exId];
      const cur = arr && arr[idx];
      if (cur && !cur.reps) startTimerFor = exId;
    }
    setSets((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
    if (startTimerFor) {
      const ex = exercisesRef.current.find((e) => e.id === startTimerFor);
      if (ex) startRest(ex);
    }
  }, []);
  const onAddSet = useCallback((exId) => {
    setSets((prev) => ({ ...prev, [exId]: [...prev[exId], { weight: "", reps: "", done: false }] }));
  }, []);
  // Used when a calisthenic exercise changes loading. Assistance and added
  // weight are opposite quantities, so a number entered under one meaning
  // would be flatly wrong under the other — reps are kept, weights are not.
  const onClearWeights = useCallback((exId) => {
    setSets((prev) => ({ ...prev, [exId]: (prev[exId] || []).map((s) => ({ ...s, weight: "" })) }));
  }, []);
  // Copies last session's weights and reps onto this exercise, one row per
  // set it had. Most sessions are the last one repeated — the same three
  // sets of the same weight — and typing them back in by hand is the single
  // most repeated action in the app.
  //
  // Reps in reserve is deliberately not copied. Weight and reps are a plan;
  // how close to failure it put you is a measurement, and carrying last
  // week's measurement forward as if it were this week's would feed the
  // readiness map a number nobody reported.
  const onFillFromLast = useCallback((exId, lastSets) => {
    if (!Array.isArray(lastSets) || !lastSets.length) return;
    setSets((prev) => ({
      ...prev,
      [exId]: lastSets.map((s) => ({ weight: s.weight || "", reps: s.reps || "", done: false })),
    }));
  }, []);
  const onRemoveSet = useCallback((exId, idx) => {
    setSets((prev) => ({ ...prev, [exId]: prev[exId].filter((_, i) => i !== idx) }));
  }, []);
  // Ticking a set off is the moment rest starts, so the timer starts
  // itself — reaching for a second button with a bar in your hands is the
  // reason people stop using rest timers at all. Only on the way to done,
  // never on un-ticking a mistake.
  const onToggleSetDone = useCallback((exId, idx) => {
    const arr = setsRef.current[exId];
    const cur = arr && arr[idx];
    const becameDone = !!cur && cur.done === false;
    setSets((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => (i === idx ? { ...s, done: becameDone } : s)),
    }));
    if (becameDone && settingsRef.current.autoRestTimer !== false) {
      const ex = exercisesRef.current.find((e) => e.id === exId);
      if (ex) startRest(ex);
    }
  }, []);

  const onMetaChange = useCallback((exId, field, value) => {
    setMeta((prev) => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));
  }, []);

  // A dropset lives inside a set: after the main set you drop the load and rep
  // out again. setIdx defaults to the last set (cog action); the per-set button
  // targets a specific set.
  const onAddDropset = useCallback((exId, setIdx) => {
    setSets((prev) => {
      const arr = prev[exId] || [];
      if (arr.length === 0) return prev;
      const target = setIdx == null ? arr.length - 1 : setIdx;
      return {
        ...prev,
        [exId]: arr.map((s, i) => (i === target ? { ...s, drops: [...(s.drops || []), { weight: "", reps: "" }] } : s)),
      };
    });
  }, []);
  const onDropChange = useCallback((exId, setIdx, dropIdx, field, value) => {
    setSets((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) =>
        i === setIdx ? { ...s, drops: s.drops.map((d, j) => (j === dropIdx ? { ...d, [field]: value } : d)) } : s
      ),
    }));
  }, []);
  const onRemoveDrop = useCallback((exId, setIdx, dropIdx) => {
    setSets((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) =>
        i === setIdx ? { ...s, drops: (s.drops || []).filter((_, j) => j !== dropIdx) } : s
      ),
    }));
  }, []);

  // Superset picker: seed with the exercise the user tapped, let them tap more,
  // then group them (making them adjacent) with a shared outline color.
  function startSuperset(seedId) {
    const existing = supersets.find((g) => g.exIds.includes(seedId));
    setSsPicker({ picked: existing ? existing.exIds : [seedId] });
  }
  function toggleSupersetPick(exId) {
    setSsPicker((prev) => {
      if (!prev) return prev;
      const picked = prev.picked.includes(exId) ? prev.picked.filter((id) => id !== exId) : [...prev.picked, exId];
      return { picked };
    });
  }
  function cancelSuperset() {
    setSsPicker(null);
  }
  function confirmSuperset() {
    const picked = ssPicker ? ssPicker.picked : [];
    if (picked.length < 2) {
      setSsPicker(null);
      return;
    }
    const usedColors = supersets.map((g) => g.color);
    const color = SUPERSET_COLORS.find((c) => !usedColors.includes(c)) || SUPERSET_COLORS[supersets.length % SUPERSET_COLORS.length];
    const newGroup = { id: `ss-${Date.now()}`, color, exIds: picked };
    // Drop any prior membership for the picked exercises, then add the group.
    const cleaned = supersets
      .map((g) => ({ ...g, exIds: g.exIds.filter((id) => !picked.includes(id)) }))
      .filter((g) => g.exIds.length >= 2);
    setSupersets([...cleaned, newGroup]);
    // Reorder so the grouped exercises sit next to each other (in picked order),
    // anchored at the position of the first picked exercise.
    setExercises((prev) => {
      const anchor = Math.min(...picked.map((id) => prev.findIndex((e) => e.id === id)).filter((i) => i >= 0));
      const members = picked.map((id) => prev.find((e) => e.id === id)).filter(Boolean);
      const rest = prev.filter((e) => !picked.includes(e.id));
      const out = [...rest];
      out.splice(anchor, 0, ...members);
      return out;
    });
    setSsPicker(null);
  }
  function removeSuperset(groupId) {
    setSupersets((prev) => prev.filter((g) => g.id !== groupId));
  }

  async function addExerciseMidWorkout(ex) {
    setExercises((prev) => reorderByType([...prev, ex]));
    setSets((prev) => ({ ...prev, [ex.id]: prev[ex.id] || blankSets(settingsRef.current) }));
    const hist = await safeGet(`ex-history:${ex.id}`);
    setHistory((prev) => ({ ...prev, [ex.id]: hist || [] }));
    setAddPanel(null);
  }

  async function handleSaveCustomExerciseMidWorkout(ex) {
    registerCustomExercise(ex);
    const prev = (await safeGet("custom-exercises")) || [];
    await safeSet("custom-exercises", [...prev, ex]);
    addExerciseMidWorkout(ex);
  }

  // Finishing throws away the live workout, and the button used to sit under
  // a thumb reaching for the last set. Two taps, and the arming lapses on its
  // own so a stray first tap never leaves it primed.
  function tapFinish() {
    if (saving) return;
    if (armedFinish) {
      clearTimeout(armedTimeout.current);
      setArmedFinish(false);
      handleFinish();
      return;
    }
    setArmedFinish(true);
    armedTimeout.current = setTimeout(() => setArmedFinish(false), 4000);
  }
  useEffect(() => () => clearTimeout(armedTimeout.current), []);

  async function handleFinish() {
    setSaving(true);
    const at = workoutDate.toISOString();
    const date = dateStrOf(workoutDate);
    const newPBs = [];
    const bwRecord = await safeGet("bodyweight");
    const bw = bwRecord ? parseFloat(bwRecord.value) : null;

    // First pass: collect the exercises that actually have logged work, keeping
    // their drops and cable machine/grip. Order within this list is what we
    // store as "done Nth" for next time's context.
    const logged = [];
    for (const ex of exercises) {
      // A set is saved if it has any entered data. The per-set checkbox is a
      // visual "done" marker only — it never decides whether data is saved, so
      // a filled-in set can't be silently dropped just because its box is
      // unticked (which is the default state).
      const cleanSets = (sets[ex.id] || [])
        .filter(setHasData)
        .map((s) => {
          const drops = (s.drops || []).filter((d) => d.weight !== "" || d.reps !== "");
          const out = { weight: s.weight, reps: s.reps };
          if (drops.length) out.drops = drops;
          if (s.rir !== null && s.rir !== undefined && s.rir !== "") out.rir = Number(s.rir);
          return out;
        });
      if (cleanSets.length === 0) continue;
      const m = meta[ex.id] || {};
      const entry = { id: ex.id, name: ex.name, muscle: ex.muscle, sets: cleanSets };
      // Notes apply to anything, not just the machine lifts.
      if (m.notes && m.notes.trim()) entry.notes = m.notes.trim();
      const chosenMethod = m.method || defaultMethodFor(ex.id);
      if (chosenMethod && methodsFor(ex.id).length > 1) entry.method = chosenMethod;
      if (isMachineExercise(ex, chosenMethod)) {
        if (m.brand) entry.brand = m.brand;
        if (m.grip) entry.grip = m.grip;
      }
      logged.push(entry);
    }

    // Tallied per set, not per exercise, against the set in the same slot
    // last time this exercise was done — the same red/amber/green a set's
    // border already shows live, rolled up into one shape for the finish
    // screen.
    const toneTally = { up: 0, amber: 0, down: 0 };

    const total = logged.length;
    // Superset membership is stored on the session as groups of ids, which
    // says nothing to an exercise looking back at its own history. Resolve
    // it once here into the partner names each exercise was paired with, so
    // next time the card can say what it was supersetted with.
    const loggedNames = new Map(logged.map((e) => [e.id, e.name]));
    const supersetPartners = {};
    supersets.forEach((group) => {
      const members = group.exIds.filter((id) => loggedNames.has(id));
      if (members.length < 2) return;
      members.forEach((id) => {
        supersetPartners[id] = members.filter((other) => other !== id).map((other) => loggedNames.get(other));
      });
    });

    for (let i = 0; i < logged.length; i++) {
      const ex = logged[i];
      const order = i + 1;

      const histEntry = { date, at, sets: ex.sets, order, total };
      if (ex.brand) histEntry.brand = ex.brand;
      if (ex.grip) histEntry.grip = ex.grip;
      if (ex.method) histEntry.method = ex.method;
      if (ex.notes) histEntry.notes = ex.notes;
      if (supersetPartners[ex.id]) histEntry.supersetWith = supersetPartners[ex.id];
      const prevHist = (await safeGet(`ex-history:${ex.id}`)) || [];
      const lastForTone = prevHist.length ? prevHist[prevHist.length - 1] : null;
      const lastSetsForTone =
        lastForTone && lastForTone.sets && lastForTone.sets.length
          ? lastForTone.sets
          : lastForTone
          ? [{ weight: lastForTone.weight, reps: lastForTone.reps }]
          : [];
      ex.sets.forEach((s, i) => {
        const tone = setProgressTone(s, lastSetsForTone[i]);
        if (tone) toneTally[tone] += 1;
      });
      const newHist = capHistory(sortByAt([...prevHist, histEntry]));
      await safeSet(`ex-history:${ex.id}`, newHist);

      if (PB_EXERCISE_IDS.includes(ex.id)) {
        const topSet = getTopSet(ex.sets);
        const storedPB = await safeGet(`pb:${ex.id}`);
        if (beatsRecord(topSet, storedPB)) {
          const record = {
            exerciseId: ex.id,
            name: ex.name,
            weight: topSet.weight,
            reps: topSet.reps,
            date,
            bodyWeightPct: bodyWeightPct(topSet.weight, bw),
          };
          await safeSet(`pb:${ex.id}`, record);
          newPBs.push(record);
        }
      }
    }

    // Muscle readiness is derived live from workout-history (see
    // computeMuscleLastMap), so there's no separate "last trained" cache to
    // keep in sync here — it just falls out of the session we're about to save.

    // Declared out here so the finish screen can be handed the session it
    // just saved. A workout with nothing logged saves nothing and leaves this
    // null, which is what the share button checks for.
    let session = null;
    if (logged.length > 0) {
      const prevSessions = (await safeGet("workout-history")) || [];
      session = {
        id: `${date}-${Date.now()}`,
        date,
        at,
        // When the first set was opened. Training load is RPE times
        // minutes, and a measured duration beats one estimated from the
        // set count — sessions from before this was recorded fall back
        // to the estimate.
        startedAt: startedAtRef.current,
        split,
        exercises: logged,
        supersets: supersets.length ? supersets : undefined,
        toneTally,
      };
      if (programmeCtx) {
        session.programmeId = programmeCtx.programmeId;
        session.dayKey = programmeCtx.dayKey;
        session.dayName = programmeCtx.dayName;
      }
      const all = [...prevSessions, session].sort((a, b) => {
        const ka = a.at || a.date || "";
        const kb = b.at || b.date || "";
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
      await safeSet("workout-history", all.slice(-200));
      await markGymSession(session); // marks the planned gym day done in Plan mode
      // A session on a day with no planned gym session can change the
      // next runs (spec v1.1 section 4). It never throws.
      await reportUnplannedLift(session, settings);

      // Log this session against the active programme so it knows what's next
      // and can track progress.
      if (programmeCtx) {
        await recordProgrammeSession({
          dayKey: programmeCtx.dayKey,
          dayName: programmeCtx.dayName,
          date,
          at,
          sessionId: session.id,
        });
      }
    }

    await safeDelete("in-progress-workout");
    setSaving(false);
    onFinish(newPBs, session);
  }

  const addedIds = new Set(exercises.map((e) => e.id));

  return (
    // Room at the foot only while the superset panel is floating there.
    <div style={{ paddingBottom: ssPicker ? 130 : 24 }}>
      <TopBar title={split} onBack={onBack} />
      <div style={{ padding: "0 20px 8px", color: COLORS.textDim, fontSize: 13 }}>
        {exercises.length} exercise{exercises.length === 1 ? "" : "s"} · log each set when you finish it
      </div>

      <div style={{ padding: "0 20px 6px" }}>
        {!showDatePicker ? (
          <button
            onClick={() => setShowDatePicker(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: isBackdated ? hexToRgba(COLORS.accent, 0.12) : COLORS.surface, border: `1px solid ${isBackdated ? COLORS.accent : COLORS.line}`, borderRadius: 10, padding: "7px 12px", color: isBackdated ? COLORS.accent : COLORS.textDim, fontSize: 12.5 }}
          >
            <Clock size={13} />
            {isBackdated ? `Logging for ${friendlyDateTime(workoutDate)}` : "Logging for now"}
            <Pencil size={12} />
          </button>
        ) : (
          <BackdatePicker
            value={workoutDate}
            onChange={setWorkoutDate}
            onDone={() => setShowDatePicker(false)}
          />
        )}
      </div>

      {timer && (
        <RestTimer timer={timer} onTogglePause={togglePauseRest} onAddTime={addRestTime} onSkip={skipRest} />
      )}

      {/* Floats over the list: picking a superset means tapping exercises
          that may be well down the page, and a panel that scrolls away takes
          Link and Cancel with it. */}
      {ssPicker && (
        <div
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 50,
            background: COLORS.surface,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 8 }}>
            Tap the exercises for the superset ({ssPicker.picked.length} selected).
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={confirmSuperset}
              disabled={ssPicker.picked.length < 2}
              style={{ flex: 1, background: ssPicker.picked.length < 2 ? COLORS.surfaceRaised : COLORS.accent, border: "none", borderRadius: 8, padding: "9px 0", color: ssPicker.picked.length < 2 ? COLORS.textDim : COLORS.onAccent, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
            >
              Link {ssPicker.picked.length >= 2 ? `${ssPicker.picked.length} exercises` : ""}
            </button>
            <button
              onClick={cancelSuperset}
              style={{ flex: 1, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "9px 0", color: COLORS.textDim, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "10px 20px" }}>
        {loading ? (
          <div style={{ color: COLORS.textDim, padding: 20, textAlign: "center" }}>Making the workout…</div>
        ) : (
          (() => {
            // Which exercise is the first of its muscle (for the warm-up block).
            const seen = new Set();
            const firstMap = {};
            exercises.forEach((ex) => { firstMap[ex.id] = !seen.has(ex.muscle); seen.add(ex.muscle); });

            // Group consecutive superset members so we can draw one outline box
            // around them.
            const blocks = [];
            let i = 0;
            while (i < exercises.length) {
              const info = supersetInfoFor(exercises[i].id);
              if (info) {
                const items = [];
                while (i < exercises.length) {
                  const info2 = supersetInfoFor(exercises[i].id);
                  if (!info2 || info2.id !== info.id) break;
                  items.push({ ex: exercises[i], index: i });
                  i++;
                }
                blocks.push({ type: "ss", info, items });
              } else {
                blocks.push({ type: "single", items: [{ ex: exercises[i], index: i }] });
                i++;
              }
            }

            const renderRow = ({ ex, index }) => {
              const picked = ssPicker && ssPicker.picked.includes(ex.id);
              return (
                <div key={ex.id} style={{ marginBottom: 12 }}>
                  {ssPicker && (
                    <button
                      onClick={() => toggleSupersetPick(ex.id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: picked ? COLORS.accent : COLORS.surfaceRaised, border: `1px solid ${picked ? COLORS.accent : COLORS.line}`, borderRadius: 8, padding: "7px 0", marginBottom: 6, color: picked ? COLORS.onAccent : COLORS.textDim, fontSize: 12, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      {picked ? <Check size={13} /> : <Plus size={13} />} {picked ? "Selected" : "Tap to add"}
                    </button>
                  )}
                  <div style={{ display: "flex", alignItems: "stretch", gap: 6, opacity: ssPicker && !picked ? 0.55 : 1 }}>
                    <div
                      style={{
                        width: 26,
                        flexShrink: 0,
                        borderRadius: 8,
                        background: COLORS.surfaceRaised,
                        border: `1px solid ${COLORS.line}`,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        onClick={() => moveExercise(index, -1)}
                        disabled={index === 0}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.line}`, color: index === 0 ? COLORS.line : COLORS.textDim, padding: 0 }}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveExercise(index, 1)}
                        disabled={index === exercises.length - 1}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: index === exercises.length - 1 ? COLORS.line : COLORS.textDim, padding: 0 }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ExerciseCard
                        ex={ex}
                        sets={sets[ex.id] || []}
                        history={history}
                        meta={meta[ex.id] || {}}
                        onMetaChange={onMetaChange}
                        onSetChange={onSetChange}
                        onClearWeights={onClearWeights}
                        onFillFromLast={onFillFromLast}
                        onToggleSetDone={onToggleSetDone}
                        onAddSet={onAddSet}
                        onRemoveSet={onRemoveSet}
                        onAddDropset={onAddDropset}
                        onDropChange={onDropChange}
                        onRemoveDrop={onRemoveDrop}
                        onStartRest={startRest}
                        onRemoveExercise={() => removeExercise(ex.id)}
                        onStartSuperset={() => startSuperset(ex.id)}
                        settings={settings}
                        isFirstForMuscle={firstMap[ex.id]}
                        supersetInfo={null}
                      />
                    </div>
                  </div>
                </div>
              );
            };

            return blocks.map((b) => {
              if (b.type === "ss") {
                return (
                  <div key={b.info.id} style={{ border: `1.5px solid ${b.info.color}`, borderRadius: 16, padding: "10px 10px 0", marginBottom: 12, background: hexToRgba(b.info.color, 0.05) }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 5, background: b.info.color }} />
                        <span style={{ color: b.info.color, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: "uppercase" }}>
                          Superset {b.info.label}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSuperset(b.info.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 11, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                      >
                        <X size={12} /> Unlink
                      </button>
                    </div>
                    {b.items.map(renderRow)}
                  </div>
                );
              }
              return b.items.map(renderRow);
            });
          })()
        )}

        {!loading && (
          <div style={{ marginTop: 4, marginBottom: 12 }}>
            {addPanel === null && (
              <button
                onClick={() => setAddPanel(isAdvanced ? "choose" : "db")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: `1px dashed ${COLORS.line}`, borderRadius: 12, padding: "12px 0", color: COLORS.textDim, fontSize: 13, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
              >
                <Plus size={14} /> Add Exercise
              </button>
            )}

            {addPanel === "choose" && isAdvanced && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setAddPanel("db")}
                  style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "12px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                >
                  From Database
                </button>
                <button
                  onClick={() => setAddPanel("new")}
                  style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "12px 0", color: COLORS.text, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase" }}
                >
                  New Exercise
                </button>
                <button
                  onClick={() => setAddPanel(null)}
                  style={{ width: 44, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, borderRadius: 10, color: COLORS.textDim, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {addPanel === "db" && (
              <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ color: COLORS.text, fontFamily: "'Oswald', sans-serif", fontSize: 13, textTransform: "uppercase" }}>Add From Database</div>
                  <button onClick={() => setAddPanel(null)} style={{ color: COLORS.textDim, background: "transparent", border: "none" }}>
                    <X size={16} />
                  </button>
                </div>
                <ExerciseSearchPicker
                  excludeIds={addedIds}
                  onAdd={(ex, m) => addExerciseMidWorkout({ ...ex, muscle: m })}
                />
              </div>
            )}

            {addPanel === "new" && (
              <NewExerciseForm
                muscles={Object.keys(EXERCISES)}
                defaultMuscle={split && SPLITS[split] ? SPLITS[split][0] : Object.keys(EXERCISES)[0]}
                onSave={handleSaveCustomExerciseMidWorkout}
                onCancel={() => setAddPanel(null)}
              />
            )}
          </div>
        )}

        {/* Sits at the end of the list rather than floating over it: a bar
            pinned to the bottom of the screen is under your thumb for the
            whole session, which is how workouts get ended by accident. */}
        {!loading && (
          <div style={{ padding: "18px 0 8px" }}>
            <button
              onClick={tapFinish}
              disabled={saving}
              style={{
                width: "100%",
                background: armedFinish ? "transparent" : COLORS.accent,
                color: armedFinish ? COLORS.accent : COLORS.onAccent,
                border: armedFinish ? `1.5px solid ${COLORS.accent}` : "none",
                borderRadius: 14,
                padding: "18px 0",
                fontFamily: "'Oswald', sans-serif",
                fontSize: 17,
                letterSpacing: 1,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Check size={20} />
              {saving ? "Saving…" : armedFinish ? "Tap again to finish" : "Finish Workout"}
            </button>
            {armedFinish && !saving && (
              <div style={{ color: COLORS.textDim, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                The app saves nothing until you tap a second time.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
