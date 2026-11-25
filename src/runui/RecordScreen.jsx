import { useEffect, useMemo, useState } from "react";
import { Minus, Pause, Play, Plus, SkipForward, Flag as LapIcon, Square } from "lucide-react";
import * as engine from "../run/engine.js";
import { COLORS, hexToRgba } from "../theme.js";
import { TopBar } from "../components/TopBar.jsx";
import { isNativeRuntime } from "../lib/platform.js";
import { listActivities } from "../shared/store.js";
import { todayInfo } from "../plan/planState.js";
import { RunSession, buildSegments, getActiveSession, ribbonFraction, stepProgress } from "./recorder.js";
import { getProfile, getRunPrefs, jargonOn, runWalkLabel, runWalkWorkout, saveRunPrefs, stepLines, unitsOf, workoutForVoice } from "./runData.js";
import { loadTempC, warmupContext } from "./RunHome.jsx";
import { Btn, Chip, ChipRow, Confirm, Loading, MONO, Note, OSWALD, Ribbon, S, Segmented, Toggle } from "./ui.jsx";

/* ---------------------------------------------------------------
   RECORD (run:record)

   params: { iso?, mode: 'plan'|'free'|'runwalk'|'treadmill'|'custom', workout? }
   Setup: what to run and where (phone GPS, treadmill, or in a browser
   the simulated GPS demo). Then the live screen: time, distance, pace,
   current and next step, step ribbon with a marker, captions for every
   voice cue, Lap, Pause/Resume and End with a confirm.
--------------------------------------------------------------- */

const SIM_SPEEDS = [
  { value: 1, label: "× 1" },
  { value: 10, label: "× 10" },
  { value: 60, label: "× 60" },
];

function Stepper({ label, value, onMinus, onPlus, testId }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button aria-label={`Less ${label}`} data-testid={`${testId}-minus`} onClick={onMinus} style={stepBtn()}>
        <Minus size={18} />
      </button>
      <div data-testid={testId} style={{ flex: 1, textAlign: "center", ...S.text(), fontFamily: MONO }}>
        {value}
      </div>
      <button aria-label={`More ${label}`} data-testid={`${testId}-plus`} onClick={onPlus} style={stepBtn()}>
        <Plus size={18} />
      </button>
    </div>
  );
}
const stepBtn = () => ({ width: 44, height: 44, borderRadius: 10, background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text, flexShrink: 0 });

/* "5:12 /km" -> big number, small unit. */
function BigUnit({ text }) {
  const i = String(text).indexOf(" ");
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ fontSize: 15, color: COLORS.textDim }}> {text.slice(i + 1)}</span>
    </>
  );
}

/* ---------- live view ---------- */

function LiveView({ session, units, showPace, onEnded, prefs, onNoteSeen }) {
  const [, setN] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!prefs.keepOnNoteSeen);
  useEffect(() => session.on(() => setN((n) => n + 1)), [session]);

  const seg = session.currentSeg;
  const next = session.nextSeg;
  const prog = seg ? stepProgress(session.step, session.segs, session.elapsed, session.km) : null;
  const marker = session.segs.length ? ribbonFraction(session.step, session.segs, session.elapsed, session.km) : null;
  const pace = session.pace;
  const paused = session.status === "paused";
  const auto = session.autoPaused && session.status === "running";
  const src = session.opts.source;
  const fmtLeft = (p) => (p.leftKm !== null ? `${engine.fmtKm(p.leftKm, units)} left` : `${engine.fmtTime(p.leftSec)} left`);
  const warmLeft = session.segs.slice(session.step.index).filter((s) => s.role === "warmup-phase");

  async function end() {
    const run = await session.end();
    onEnded(run);
  }

  function skipWarmup() {
    session.skipWarmup();
  }

  const badge =
    src === "sim"
      ? { text: `Simulated GPS (demo) · speed × ${session.opts.simSpeed}`, warn: true }
      : src === "treadmill"
        ? { text: "Treadmill. Distance comes from the speed.", warn: false }
        : session.gpsState === "good"
          ? { text: `GPS: good${Number.isFinite(session.lastAcc) ? ` (± ${Math.round(session.lastAcc)} m)` : ""}`, warn: false }
          : session.gpsState === "denied" || session.gpsState === "none"
            ? { text: "GPS: not available", warn: true }
            : session.gpsState === "weak"
              ? { text: "GPS: weak signal. Wait in the open.", warn: true }
              : { text: "GPS: searching…", warn: false };

  return (
    <div data-testid="record-live" style={{ padding: "0 20px 40px" }}>
      <div data-testid="record-source" style={{ ...S.label(), color: badge.warn ? COLORS.bad : COLORS.textDim, marginBottom: 6 }}>
        {badge.text}
      </div>
      {session.gpsMessage && (
        <div style={{ marginBottom: 10 }}>
          <Note tone="warn" testId="gps-message">
            {session.gpsMessage}
          </Note>
        </div>
      )}
      {noteOpen && (
        <div data-testid="keep-on-note" style={{ marginBottom: 10 }}>
          <Note>
            Keep the screen on. In this version the app records only while it is open.
            <div style={{ marginTop: 8 }}>
              <Btn
                style={{ width: "auto", padding: "8px 16px", minHeight: 40 }}
                onClick={() => {
                  setNoteOpen(false);
                  onNoteSeen();
                }}
                testId="keep-on-ok"
              >
                OK
              </Btn>
            </div>
          </Note>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 4 }}>
        <div style={S.label()}>{paused ? "Paused" : auto ? "Auto-paused" : "Time"}</div>
        <div data-testid="live-time" style={{ fontFamily: MONO, fontSize: 64, lineHeight: 1.05, color: paused || auto ? COLORS.textDim : COLORS.text }}>
          {engine.fmtTime(session.elapsed)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, textAlign: "center" }}>
        <div>
          <div style={S.label()}>Distance</div>
          <div data-testid="live-distance" style={{ fontFamily: MONO, fontSize: 32, color: COLORS.text, whiteSpace: "nowrap" }}>
            <BigUnit text={engine.fmtKm(session.km, units)} />
          </div>
        </div>
        <div>
          <div style={S.label()}>{src === "treadmill" ? "Speed" : "Pace"}</div>
          <div data-testid="live-pace" style={{ fontFamily: MONO, fontSize: 32, color: COLORS.text, whiteSpace: "nowrap" }}>
            <BigUnit text={src === "treadmill" ? engine.fmtSpeed(pace, units) : pace ? engine.fmtPace(pace, units) : "-"} />
          </div>
        </div>
      </div>
      <div style={{ ...S.body(), textAlign: "center", marginTop: 4, fontFamily: MONO, fontSize: 11.5 }}>
        Average {session.avgPace ? engine.fmtPace(session.avgPace, units) : "-"} · {session.hr ? `Heart rate ${session.hr}${src === "sim" ? " (simulated)" : ""}` : "Heart rate: not connected"}
      </div>

      {seg && (
        <div data-testid="live-step" style={{ ...S.card({ margin: "14px 0 0" }), borderColor: COLORS.accent }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ ...S.label(), color: COLORS.accent }}>{seg.role === "warmup-phase" ? "Warm-up" : seg.reps && seg.role === "work" ? `Rep ${seg.rep} of ${seg.reps}` : "Now"}</span>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: COLORS.text }}>{fmtLeft(prog)}</span>
          </div>
          <div style={{ ...S.title(), fontSize: 22, margin: "4px 0 6px" }}>{seg.label}</div>
          {seg.role !== "warmup-phase" && (
            <div style={S.body()}>
              {seg.walk ? "Walk briskly." : showPace && seg.step && seg.step.paceLo ? `Target ${engine.fmtPace(seg.step.paceLo, units)} to ${engine.fmtPace(seg.step.paceHi, units)}` : showPace && seg.pace && session.opts.workout && session.opts.workout.showPace !== false ? `Target ${engine.fmtPace(seg.pace, units)}` : seg.effort || (session.opts.workout && session.opts.workout.effortText) || ""}
            </div>
          )}
          <div style={{ height: 8, background: COLORS.surfaceRaised, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(prog.fraction * 100)}%`, height: "100%", background: COLORS.accent }} />
          </div>
          {seg.role === "warmup-phase" && (
            <div data-testid="warmup-moves" style={{ marginTop: 10 }}>
              {seg.phase.items.map((m) => (
                <div key={m.id} style={{ marginBottom: 6 }}>
                  <div style={{ color: COLORS.text, fontSize: 14 }}>
                    {m.name} <span style={{ fontFamily: MONO, fontSize: 12, color: COLORS.textDim }}>· {m.dose}</span>
                  </div>
                  <div style={{ ...S.body(), fontSize: 12 }}>{m.how}</div>
                </div>
              ))}
              <Btn onClick={skipWarmup} testId="skip-warmup-live">
                <SkipForward size={16} /> Skip the rest of the warm-up ({warmLeft.length})
              </Btn>
            </div>
          )}
          {next && (
            <div style={{ ...S.body(), marginTop: 8 }}>
              Next: <span style={{ color: COLORS.text }}>{next.label}</span> {next.by === "dist" ? engine.fmtKm(next.km, units) : engine.fmtTime(next.sec)}
            </div>
          )}
        </div>
      )}
      {!seg && session.segs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Note tone="ok">Workout complete. You can end the run or keep going.</Note>
        </div>
      )}
      {session.segs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Ribbon segments={session.segs} marker={marker} labels={false} height={40} testId="live-ribbon" currentIndex={session.step.index} />
        </div>
      )}

      {src === "treadmill" && (
        <div data-testid="treadmill-controls" style={{ ...S.card({ margin: "12px 0 0" }) }}>
          <div style={{ ...S.label(), marginBottom: 6 }}>Treadmill speed</div>
          <Stepper
            label="speed"
            testId="tm-speed"
            value={engine.fmtSpeed(3600 / Math.max(0.1, session.speedKmh), units)}
            onMinus={() => session.setTreadmill(Math.max(0, Math.round((session.speedKmh - (units === "mi" ? 0.161 : 0.1)) * 1000) / 1000), NaN)}
            onPlus={() => session.setTreadmill(Math.round((session.speedKmh + (units === "mi" ? 0.161 : 0.1)) * 1000) / 1000, NaN)}
          />
          <div style={{ ...S.label(), margin: "10px 0 6px" }}>Incline</div>
          <Stepper label="incline" testId="tm-incline" value={`${session.incline.toFixed(1)} %`} onMinus={() => session.setTreadmill(NaN, Math.round((session.incline - 0.5) * 10) / 10)} onPlus={() => session.setTreadmill(NaN, Math.round((session.incline + 0.5) * 10) / 10)} />
          <div style={{ ...S.body(), marginTop: 8 }}>You can correct the distance after the run.</div>
        </div>
      )}

      <div data-testid="live-caption" aria-live="polite" style={{ marginTop: 12, minHeight: 64, background: hexToRgba(COLORS.accent, 0.1), border: `1px solid ${COLORS.accentDim}`, borderRadius: 12, padding: "12px 14px", color: COLORS.text, fontSize: 19, lineHeight: 1.35 }}>
        {session.caption || " "}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <Btn onClick={() => session.lap()} testId="lap-button" style={{ minHeight: 64, fontSize: 16 }} disabled={session.status !== "running"}>
          <LapIcon size={18} /> Lap
        </Btn>
        {paused ? (
          <Btn kind="primary" onClick={() => session.resume()} testId="resume-button" style={{ minHeight: 64, fontSize: 16 }}>
            <Play size={18} /> Resume
          </Btn>
        ) : (
          <Btn kind="primary" onClick={() => session.pause()} testId="pause-button" style={{ minHeight: 64, fontSize: 16 }}>
            <Pause size={18} /> Pause
          </Btn>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        {!confirmEnd ? (
          <Btn kind="danger" onClick={() => setConfirmEnd(true)} testId="end-button" style={{ minHeight: 52 }}>
            <Square size={16} /> End
          </Btn>
        ) : (
          <Confirm text="End the run? You can save it on the next screen." yes="End the run" no="Keep going" onYes={end} onNo={() => setConfirmEnd(false)} testId="end-confirm" />
        )}
      </div>
    </div>
  );
}

/* ---------- setup ---------- */

export function RecordScreen({ nav }) {
  const params = nav.params || {};
  const [ctx, setCtx] = useState(null);
  const [session, setSession] = useState(() => {
    const a = getActiveSession();
    return a && a.status !== "ended" ? a : null;
  });
  const [mode, setMode] = useState(params.mode === "treadmill" ? (params.workout ? "plan" : "free") : params.mode || "plan");
  const [source, setSource] = useState(params.mode === "treadmill" ? "treadmill" : isNativeRuntime() ? "gps" : "sim");
  const [simSpeed, setSimSpeed] = useState(10);
  const [level, setLevel] = useState(1);
  const [reps, setReps] = useState(null);
  const [customId, setCustomId] = useState(null);
  const [tm, setTm] = useState({ speedKmh: 9, incline: 1 });
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [starting, setStarting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [profile, p, info, acts, tempC] = await Promise.all([getProfile(), getRunPrefs(), todayInfo().catch(() => null), listActivities(nav.settings), loadTempC()]);
      if (!live) return;
      const planWorkout = params.workout && !params.workout.custom ? params.workout : info && info.run && !info.run.done ? info.run : null;
      setCtx({ profile, info, acts, tempC, planWorkout });
      setPrefs(p);
      setLevel(p.lastRunWalkLevel || (info && info.plan && info.plan.weeks && info.week && info.week.runWalkLevel) || 1);
      setTm(p.treadmill);
      if (params.workout && params.workout.custom) setCustomId("__param");
      else if (p.workouts.length) setCustomId(p.workouts[0].id);
      if (mode === "plan" && !planWorkout) setMode("free");
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = unitsOf(ctx && ctx.profile);
  const plan = ctx && ctx.info ? ctx.info.plan : null;
  const showPace = ctx ? jargonOn(nav.settings, plan, ctx.acts) : false;

  const customList = useMemo(() => {
    const list = prefs ? prefs.workouts.map((x) => ({ id: x.id, workout: x.workout })) : [];
    if (params.workout && params.workout.custom) list.unshift({ id: "__param", workout: params.workout });
    return list;
  }, [prefs, params.workout]);

  const workout = useMemo(() => {
    if (!ctx) return null;
    if (mode === "plan") return ctx.planWorkout;
    if (mode === "runwalk") return runWalkWorkout(level, reps);
    if (mode === "custom") {
      const c = customList.find((x) => x.id === customId) || customList[0];
      return c ? c.workout : null;
    }
    return null;
  }, [ctx, mode, level, reps, customId, customList]);

  const warmup = useMemo(() => {
    if (!ctx) return null;
    const base = workout || { type: "easy", steps: [] };
    const wt = base.custom ? { ...base, type: "intervals" } : base;
    return engine.warmupFor(wt, warmupContext(plan, ctx.profile, ctx.tempC));
  }, [ctx, workout, plan]);

  if (session) {
    return (
      <div data-testid="record-screen" style={S.page()}>
        <TopBar title="Recording" onBack={() => setConfirmLeave(true)} />
        {confirmLeave && (
          <div style={{ padding: "0 20px" }}>
            <Confirm
              text="The run is still recording. End the run before you leave this screen."
              yes="Stay here"
              no="Go back"
              danger={false}
              onYes={() => setConfirmLeave(false)}
              onNo={() => nav.back()}
              testId="leave-confirm"
            />
          </div>
        )}
        <LiveView
          session={session}
          units={units}
          showPace={showPace}
          prefs={prefs || { keepOnNoteSeen: true }}
          onNoteSeen={() => saveRunPrefs({ keepOnNoteSeen: true }).then(setPrefs)}
          onEnded={(run) => nav.go("run:summary", { run, workout: session.opts.workout || null, iso: session.opts.planIso || null })}
        />
      </div>
    );
  }

  if (!ctx || !prefs) {
    return (
      <div data-testid="record-screen" style={S.page()}>
        <TopBar title="Record" onBack={nav.back} />
        <Loading />
      </div>
    );
  }

  const v = prefs.voice;
  const setVoice = (patch) => saveRunPrefs({ voice: { ...v, ...patch } }).then(setPrefs);
  const segs = workout ? buildSegments(workout, null, false) : [];
  const hasWarm = warmup && warmup.kind !== "easy" && warmup.minutes > 0;

  async function start(useWarmup) {
    if (starting) return;
    setStarting(true);
    if (mode === "runwalk") await saveRunPrefs({ lastRunWalkLevel: level });
    if (source === "treadmill") await saveRunPrefs({ treadmill: tm });
    const paceSec = plan && plan.paces ? plan.paces.easy : 380;
    const s = new RunSession({
      mode,
      source,
      workout: workout ? workoutForVoice(workout, showPace || !!workout.custom) : null,
      warmup,
      useWarmup: !!useWarmup,
      units,
      voice: v,
      autoPause: source === "gps" && prefs.autoPause,
      simSpeed,
      simPaceSec: paceSec,
      treadmill: tm,
      planIso: mode === "plan" && workout ? workout.iso : null,
      profile: ctx.profile,
    });
    await s.start();
    setSession(s);
    setStarting(false);
  }

  const modes = [
    ...(ctx.planWorkout ? [{ id: "plan", label: "Plan workout" }] : []),
    { id: "free", label: "Free run" },
    { id: "runwalk", label: "Run/walk" },
    ...(customList.length ? [{ id: "custom", label: "Custom" }] : []),
  ];
  const sources = [
    { value: "gps", label: isNativeRuntime() ? "Phone GPS" : "Browser GPS" },
    { value: "treadmill", label: "Treadmill" },
    ...(isNativeRuntime() ? [] : [{ value: "sim", label: "Simulated" }]),
  ];
  const rw = engine.runWalk(level);
  const defaultReps = rw.continuous ? 1 : Math.round((20 * 60) / (rw.run + rw.walk));

  return (
    <div data-testid="record-screen" style={S.page()}>
      <TopBar title="Record" onBack={nav.back} />
      <div style={S.section()}>What do you want to do?</div>
      <div style={{ padding: "0 20px 12px" }}>
        <ChipRow>
          {modes.map((m) => (
            <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)} testId={`mode-${m.id}`}>
              {m.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {mode === "runwalk" && (
        <div data-testid="runwalk-setup" style={S.card()}>
          <div style={S.title()}>Run/walk level</div>
          <Stepper label="level" testId="rw-level" value={runWalkLabel(level)} onMinus={() => { setLevel(Math.max(1, level - 1)); setReps(null); }} onPlus={() => { setLevel(Math.min(engine.RUN_WALK_TOP, level + 1)); setReps(null); }} />
          {!rw.continuous && (
            <div style={{ marginTop: 10 }}>
              <div style={{ ...S.label(), marginBottom: 6 }}>Repeats</div>
              <Stepper label="repeats" testId="rw-reps" value={`${reps || defaultReps} ×`} onMinus={() => setReps(Math.max(1, (reps || defaultReps) - 1))} onPlus={() => setReps(Math.min(30, (reps || defaultReps) + 1))} />
            </div>
          )}
          <div style={{ ...S.body(), marginTop: 8 }}>Go up one level when the last session felt easy. Stay on a level as long as you want.</div>
        </div>
      )}

      {mode === "custom" && customList.length > 1 && (
        <div style={{ padding: "0 20px 12px" }}>
          <ChipRow>
            {customList.map((c) => (
              <Chip key={c.id} active={customId === c.id} onClick={() => setCustomId(c.id)}>
                {c.workout.title}
              </Chip>
            ))}
          </ChipRow>
        </div>
      )}

      <div data-testid="record-preview" style={S.card()}>
        <div style={S.title()}>{workout ? workout.title : mode === "free" ? "Free run" : "Run"}</div>
        {workout ? (
          <>
            <div style={{ marginTop: 8 }}>
              <Ribbon segments={segs} />
            </div>
            {(showPace && workout.showPace !== false ? stepLines(workout, units, true) : [workout.effortText]).map((l, i) => (
              <div key={i} style={{ ...S.body(), fontFamily: showPace ? MONO : undefined, fontSize: 12 }}>
                {l}
              </div>
            ))}
          </>
        ) : (
          <div style={S.body()}>No plan. Run at any pace. The app records time, distance and splits.</div>
        )}
      </div>

      <div style={S.section()}>Where</div>
      <div style={{ padding: "0 20px 12px" }}>
        <Segmented value={source} options={sources} onChange={setSource} testId="source-select" />
        {source === "sim" && (
          <div data-testid="sim-setup" style={{ marginTop: 10 }}>
            <Note tone="warn">Simulated GPS (demo). This browser cannot record a real run well. The app makes a pretend run so that you can see the screens.</Note>
            <div style={{ ...S.label(), margin: "10px 0 6px" }}>Demo speed</div>
            <Segmented value={simSpeed} options={SIM_SPEEDS} onChange={setSimSpeed} testId="sim-speed" />
          </div>
        )}
        {source === "gps" && !isNativeRuntime() && (
          <div style={{ marginTop: 10 }}>
            <Note>The browser asks for your location. A computer often has no GPS. Use the Android app for real runs.</Note>
          </div>
        )}
        {source === "treadmill" && (
          <div data-testid="treadmill-setup" style={{ ...S.card({ margin: "10px 0 0" }) }}>
            <div style={{ ...S.label(), marginBottom: 6 }}>Start speed</div>
            <Stepper label="speed" testId="tm-start-speed" value={engine.fmtSpeed(3600 / Math.max(0.1, tm.speedKmh), units)} onMinus={() => setTm({ ...tm, speedKmh: Math.max(1, Math.round((tm.speedKmh - 0.5) * 10) / 10) })} onPlus={() => setTm({ ...tm, speedKmh: Math.min(25, Math.round((tm.speedKmh + 0.5) * 10) / 10) })} />
            <div style={{ ...S.label(), margin: "10px 0 6px" }}>Incline</div>
            <Stepper label="incline" testId="tm-start-incline" value={`${tm.incline.toFixed(1)} %`} onMinus={() => setTm({ ...tm, incline: Math.max(0, tm.incline - 0.5) })} onPlus={() => setTm({ ...tm, incline: Math.min(15, tm.incline + 0.5) })} />
            <div style={{ ...S.body(), marginTop: 8 }}>Change the speed in the app when you change it on the treadmill. You can correct the distance after the run.</div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 20px 12px" }}>
        <button onClick={() => setVoiceOpen(!voiceOpen)} data-testid="voice-toggle-open" style={{ minHeight: 44, color: COLORS.accent, fontFamily: OSWALD, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {voiceOpen ? "Hide voice settings" : `Voice: ${v.on ? "on" : "off"} · settings`}
        </button>
        {voiceOpen && (
          <div data-testid="voice-settings" style={{ ...S.card({ margin: "4px 0 0" }) }}>
            <Toggle label="Voice" desc="The app speaks each cue. Captions always show." value={v.on} onToggle={() => setVoice({ on: !v.on })} testId="voice-on" />
            <div style={{ ...S.label(), margin: "6px 0" }}>Voice speed</div>
            <Segmented value={v.rate} options={[{ value: 0.8, label: "Slow" }, { value: 1, label: "Normal" }, { value: 1.2, label: "Fast" }]} onChange={(rate) => setVoice({ rate })} testId="voice-rate" />
            <Toggle label={units === "mi" ? "Every mile" : "Every kilometre"} value={v.km} onToggle={() => setVoice({ km: !v.km })} testId="voice-km" />
            <Toggle label="Every step" desc="Warm-up, reps, recoveries and cool-down." value={v.step} onToggle={() => setVoice({ step: !v.step })} testId="voice-step" />
            <Toggle label="Half-way" value={v.half} onToggle={() => setVoice({ half: !v.half })} testId="voice-half" />
            {source === "gps" && <Toggle label="Auto-pause" desc="The time stops when you stop." value={prefs.autoPause} onToggle={() => saveRunPrefs({ autoPause: !prefs.autoPause }).then(setPrefs)} testId="auto-pause" />}
          </div>
        )}
      </div>

      {warmup && warmup.kind === "easy" && (
        <div style={{ padding: "0 20px 12px" }}>
          <Note testId="start-slowly-note">Start slowly. Run the first 5 to 10 minutes slower than the target. The run itself is the warm-up.</Note>
        </div>
      )}
      {hasWarm && (
        <div data-testid="warmup-choice" style={S.card()}>
          <div style={S.title()}>Warm-up: {warmup.minutes} min</div>
          <div style={S.body()}>
            {warmup.phases
              .filter((p) => p.min > 0)
              .map((p) => `${p.title} ${p.min} min`)
              .join(" · ")}
          </div>
          {warmup.notes.map((n, i) => (
            <div key={i} style={{ ...S.body(), marginTop: 4 }}>
              {n}
            </div>
          ))}
          {warmup.inSteps && <div style={{ ...S.body(), marginTop: 4 }}>The warm-up moves come after the easy jog, before the main set.</div>}
        </div>
      )}

      <div style={{ padding: "4px 20px 0", display: "grid", gap: 10 }}>
        {hasWarm ? (
          <>
            <Btn kind="primary" onClick={() => start(true)} testId="start-warmup" disabled={starting} style={{ minHeight: 60, fontSize: 18 }}>
              Start warm-up
            </Btn>
            <Btn onClick={() => start(false)} testId="skip-warmup" disabled={starting}>
              Skip warm-up
            </Btn>
          </>
        ) : (
          <Btn kind="primary" onClick={() => start(false)} testId="start-run" disabled={starting} style={{ minHeight: 60, fontSize: 18 }}>
            Start
          </Btn>
        )}
        <div style={{ ...S.body(), textAlign: "center" }}>Keep the screen on. In this version the app records only while it is open.</div>
      </div>
    </div>
  );
}
