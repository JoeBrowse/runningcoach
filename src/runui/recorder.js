import * as engine from "../run/engine.js";
import { isNativeRuntime } from "../lib/platform.js";
import { flattenSteps } from "./steps.js";

/* ---------------------------------------------------------------
   RUN RECORDER

   Part 1: pure functions (tested in test/recorder.test.mjs).
   Part 2: RunSession, the live recording. It uses:
   - Native app: @capacitor/geolocation watchPosition (high accuracy),
     @capacitor-community/keep-awake, @capacitor-community/text-to-speech.
   - Browser: navigator.geolocation, the Wake Lock API and
     speechSynthesis, or a SIMULATED run (engine.simulateRun) for the demo.
   Every native call is in try/catch. The app records only while it is
   open (no background service in this version).
--------------------------------------------------------------- */

/* ================= PART 1: PURE FUNCTIONS ================= */

const R_KM = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

/* Great-circle distance in km between {lat, lon} points. */
export function haversineKm(a, b) {
  if (!a || !b) return 0;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const GPS_LIMITS = { maxAccuracyM: 30, maxSpeedMps: 10, minMoveM: 2 };

/* Checks one GPS point against the last good point.
   pt and prev: { lat, lon, t (ms), acc (m) }.
   Returns { ok, reason, km } where km is the distance from prev. */
export function filterPoint(prev, pt, limits = GPS_LIMITS) {
  if (!pt || !Number.isFinite(pt.lat) || !Number.isFinite(pt.lon) || Math.abs(pt.lat) > 90 || Math.abs(pt.lon) > 180) return { ok: false, reason: "invalid", km: 0 };
  if (pt.lat === 0 && pt.lon === 0) return { ok: false, reason: "invalid", km: 0 };
  if (Number.isFinite(pt.acc) && pt.acc > limits.maxAccuracyM) return { ok: false, reason: "accuracy", km: 0 };
  if (!prev) return { ok: true, reason: "first", km: 0 };
  const dt = (pt.t - prev.t) / 1000;
  if (!(dt > 0)) return { ok: false, reason: "time", km: 0 };
  const km = haversineKm(prev, pt);
  if ((km * 1000) / dt > limits.maxSpeedMps) return { ok: false, reason: "jump", km: 0 };
  return { ok: true, reason: km * 1000 < limits.minMoveM ? "still" : "move", km };
}

/* Distance at moving time t, from samples [{t (s), km}] sorted by t. */
export function kmAt(samples, t) {
  if (!samples.length) return 0;
  if (t <= samples[0].t) return samples[0].km;
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i];
    if (b.t >= t) {
      const a = samples[i - 1];
      return b.t === a.t ? b.km : a.km + ((b.km - a.km) * (t - a.t)) / (b.t - a.t);
    }
  }
  return samples[samples.length - 1].km;
}

/* Current pace (sec per km) over the last `windowSec` seconds of moving
   time. null when there is too little data or no movement. */
export function paceFromWindow(samples, windowSec = 30) {
  if (!samples || samples.length < 2) return null;
  const last = samples[samples.length - 1];
  const from = Math.max(samples[0].t, last.t - windowSec);
  const dt = last.t - from;
  if (dt < Math.min(10, windowSec / 2)) return null;
  const dk = last.km - kmAt(samples, from);
  if (dk < 0.005) return null;
  const pace = dt / dk;
  return pace > 3600 ? null : pace;
}

/* Speed in m/s over the last windowSec of raw points [{t (ms), km}]. */
export function speedOverWindow(points, windowSec = 10) {
  if (!points || points.length < 2) return null;
  const last = points[points.length - 1];
  let first = null;
  for (let i = points.length - 2; i >= 0; i--) {
    first = points[i];
    if ((last.t - points[i].t) / 1000 >= windowSec) break;
  }
  const dt = (last.t - first.t) / 1000;
  if (dt < windowSec / 2) return null;
  return ((last.km - first.km) * 1000) / dt;
}

export const AUTO_PAUSE = { pauseBelowMps: 0.5, resumeAboveMps: 1.0 };

/* Auto-pause with two limits, so the state does not flicker. */
export function nextAutoPause(paused, speedMps, limits = AUTO_PAUSE) {
  if (speedMps === null || speedMps === undefined || !Number.isFinite(speedMps)) return paused;
  if (!paused && speedMps < limits.pauseBelowMps) return true;
  if (paused && speedMps > limits.resumeAboveMps) return false;
  return paused;
}

/* Splits for each whole unit (1 km, or 1.609 km for miles) from samples
   [{t (s), km}]. The last part is a partial split.
   Returns [{ n, km, sec, pace (sec per km), partial }]. */
export function computeSplits(samples, unitKm = 1) {
  const out = [];
  if (!samples || samples.length < 2) return out;
  const total = samples[samples.length - 1].km;
  let prevT = samples[0].t;
  let n = 1;
  let i = 1;
  while (n * unitKm <= total + 1e-9) {
    const target = n * unitKm;
    while (i < samples.length && samples[i].km < target) i++;
    if (i >= samples.length) break;
    const a = samples[i - 1];
    const b = samples[i];
    const t = b.km === a.km ? b.t : a.t + ((b.t - a.t) * (target - a.km)) / (b.km - a.km);
    out.push({ n, km: unitKm, sec: t - prevT, pace: (t - prevT) / unitKm, partial: false });
    prevT = t;
    n++;
  }
  const lastT = samples[samples.length - 1].t;
  const rest = total - (n - 1) * unitKm;
  if (rest > 0.05 && lastT > prevT) out.push({ n, km: rest, sec: lastT - prevT, pace: (lastT - prevT) / rest, partial: true });
  return out;
}

/* Keeps fewer track points: a point stays when it is minM metres or more
   from the last kept point, or minSec seconds later. First and last stay. */
export function thinTrack(points, minM = 15, minSec = 20) {
  if (!points || points.length <= 2) return points ? points.slice() : [];
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (haversineKm(last, points[i]) * 1000 >= minM || (points[i].t - last.t) / 1000 >= minSec) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/* Segments of a recording: the workout steps plus the warm-up phases.
   warmup: engine.warmupFor() result, or null. useWarmup: the runner
   chose "Start warm-up". Phases with 0 minutes are notes only.
   - inSteps (quality runs): phases go after the first step (the jog).
   - kind 'easy': no segments (the "start slowly" note only).
   - Else: phases go before the first step. */
export function buildSegments(workout, warmup, useWarmup, fallbackPace) {
  const base = workout ? flattenSteps(workout, fallbackPace) : [];
  if (!useWarmup || !warmup || warmup.kind === "easy") return retime(base);
  // A run/walk session already starts with a brisk walk: the warm-up
  // moves follow that walk, and the second walk is not added.
  const walkFirst = warmup.kind === "gentle" && base.length > 0 && base[0].role === "warmup";
  const phases = (warmup.phases || [])
    .filter((p) => p.min > 0 && !(walkFirst && p.id === "general"))
    .map((p) => ({
      label: p.title,
      sec: p.min * 60,
      km: null,
      pace: null,
      by: "time",
      cls: p.id === "general" || p.id === "strides" ? "easy" : "walk",
      role: "warmup-phase",
      phase: p,
      walk: p.id !== "general",
      rep: null,
      reps: null,
    }));
  if (!phases.length) return retime(base);
  const at = (warmup.inSteps || walkFirst) && base.length && base[0].role === "warmup" ? 1 : 0;
  return retime([...base.slice(0, at), ...phases, ...base.slice(at)]);
}

function retime(segs) {
  let t = 0;
  return segs.map((s) => {
    const out = { ...s, start: t, end: t + s.sec };
    t += s.sec;
    return out;
  });
}

/* Step machine. state: { index, startSec, startKm }. A time step ends
   when its seconds pass; a distance step ends when its km are covered.
   Returns the new state and whether the step changed. index ===
   segs.length means the workout is complete. */
export function advanceStep(state, segs, elapsedSec, km) {
  let s = state || { index: 0, startSec: 0, startKm: 0 };
  let changed = false;
  while (s.index < segs.length) {
    const seg = segs[s.index];
    const doneTime = seg.by === "dist" ? false : elapsedSec - s.startSec >= seg.sec;
    const doneDist = seg.by === "dist" ? km - s.startKm >= (seg.km || 0) - 1e-9 : false;
    if (!doneTime && !doneDist) break;
    // The next step starts at the planned end of this one (time) or now (distance).
    const nextStart = seg.by === "dist" ? elapsedSec : s.startSec + seg.sec;
    s = { index: s.index + 1, startSec: nextStart, startKm: km };
    changed = true;
  }
  return { state: s, changed, complete: s.index >= segs.length };
}

/* Progress inside the current step: { fraction, leftSec, leftKm }. */
export function stepProgress(state, segs, elapsedSec, km) {
  const seg = segs[state.index];
  if (!seg) return { fraction: 1, leftSec: 0, leftKm: 0 };
  if (seg.by === "dist") {
    const done = km - state.startKm;
    const f = seg.km ? Math.min(1, Math.max(0, done / seg.km)) : 0;
    return { fraction: f, leftSec: null, leftKm: Math.max(0, (seg.km || 0) - done) };
  }
  const done = elapsedSec - state.startSec;
  return { fraction: seg.sec ? Math.min(1, Math.max(0, done / seg.sec)) : 1, leftSec: Math.max(0, seg.sec - done), leftKm: null };
}

/* Position of the ribbon marker (0 to 1) in planned time. */
export function ribbonFraction(state, segs, elapsedSec, km) {
  const total = segs.length ? segs[segs.length - 1].end : 0;
  if (!total) return 0;
  if (state.index >= segs.length) return 1;
  const seg = segs[state.index];
  const p = stepProgress(state, segs, elapsedSec, km);
  return Math.min(1, (seg.start + seg.sec * p.fraction) / total);
}

const sayDur = (sec) => {
  const s = Math.round(sec);
  if (s < 60) return `${s} seconds`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const ms = `${m} minute${m === 1 ? "" : "s"}`;
  return r ? `${ms} ${r} seconds` : ms;
};

/* Voice text for a split. */
export function splitCueText(split, units, totalSec) {
  const unitName = units === "mi" ? (split.n === 1 ? "mile" : "miles") : split.n === 1 ? "kilometre" : "kilometres";
  return `${split.n} ${unitName}. Time ${sayDur(totalSec)}. Last ${units === "mi" ? "mile" : "kilometre"} ${sayDur(split.sec)}.`;
}

/* Voice text for one step, when the engine text does not fit. */
export function stepCueText(seg, units, showPace) {
  if (!seg) return "";
  if (seg.role === "warmup-phase") {
    const names = (seg.phase.items || []).map((m) => m.name).join(", ");
    return `${seg.phase.title}. ${seg.phase.min} minutes. ${names}.`;
  }
  const rep = seg.reps && seg.role === "work" ? `Rep ${seg.rep} of ${seg.reps}. ` : "";
  const amount = seg.by === "dist" ? engine.fmtKm(seg.km, units).replace("km", "kilometres").replace("mi", "miles") : sayDur(seg.sec);
  let target = "";
  if (seg.walk) target = "Walk briskly.";
  else if (showPace && seg.step && seg.step.paceLo && seg.step.paceHi) target = `Target ${engine.fmtPace(seg.step.paceLo, units)} to ${engine.fmtPace(seg.step.paceHi, units)}.`;
  else if (showPace && seg.pace) target = `Target ${engine.fmtPace(seg.pace, units)}.`;
  else if (seg.effort) target = seg.effort;
  return `${rep}${seg.label}, ${amount}. ${target}`.replace(/\/km/g, "per kilometre").replace(/\/mi/g, "per mile").trim();
}

/* One cue text for each segment. Uses engine.audioCues (and
   engine.warmupCues) when the counts match, else stepCueText. */
export function segmentCueTexts(workout, segs, units, warmup) {
  const engineCues = workout ? engine.audioCues(workout, units) : [];
  const stepSegs = segs.filter((s) => s.role !== "warmup-phase");
  const useEngine = engineCues.length === stepSegs.length + 1 && !(workout && workout.custom);
  const warmCues = warmup ? engine.warmupCues(warmup) : [];
  const wPhases = warmup ? (warmup.phases || []).filter((p) => p.min > 0) : [];
  let k = 0;
  return segs.map((s) => {
    if (s.role === "warmup-phase") {
      const c = warmCues[wPhases.indexOf(s.phase)];
      return c && c.text ? c.text : stepCueText(s, units, false);
    }
    const c = useEngine ? engineCues[k] : null;
    k++;
    return c ? c.text : stepCueText(s, units, workout ? workout.showPace !== false : false);
  });
}

/* ================= PART 2: LIVE SESSION ================= */

const nowMs = () => Date.now();

let active = null;
export const getActiveSession = () => active;

/* Voice. Native text-to-speech in the APK, speechSynthesis in a browser. */
export async function speak(text, rate = 1) {
  if (!text) return;
  if (isNativeRuntime()) {
    try {
      const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
      await TextToSpeech.speak({ text, lang: "en-GB", rate, pitch: 1, volume: 1, category: "playback" });
      return;
    } catch (e) {
      /* fall through to the browser voice */
    }
  }
  try {
    if (typeof window !== "undefined" && window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      u.rate = rate;
      window.speechSynthesis.speak(u);
    }
  } catch (e) {
    /* no voice: the caption still shows */
  }
}

async function stopVoice() {
  try {
    if (isNativeRuntime()) {
      const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
      await TextToSpeech.stop();
    } else if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (e) {
    /* ignore */
  }
}

export const GPS_MESSAGES = {
  denied: "The app cannot use the phone location. Allow location for Skid Marks in the phone settings. You can still record a treadmill run.",
  unavailable: "The app cannot find the phone location. Go outside and wait a moment. The time still records.",
  none: "This browser cannot give a location. Use the simulated GPS demo or treadmill mode.",
};

/* Live recording.
   opts: { mode, source: 'gps' | 'sim' | 'treadmill', workout, warmup,
     useWarmup, units, voice: {on, rate, km, step, half}, autoPause,
     simSpeed, simPaceSec, treadmill: {speedKmh, incline}, planIso,
     profile: {maxHR, restHR} } */
export class RunSession {
  constructor(opts) {
    this.opts = { ...opts };
    this.units = opts.units || "km";
    this.unitKm = this.units === "mi" ? engine.KM_PER_MI : 1;
    this.segs = buildSegments(opts.workout, opts.warmup, opts.useWarmup, opts.simPaceSec);
    this.cueTexts = segmentCueTexts(opts.workout, this.segs, this.units, opts.useWarmup ? opts.warmup : null);
    this.status = "ready"; // ready | running | paused | ended
    this.autoPaused = false;
    this.elapsed = 0; // moving seconds
    this.km = 0;
    this.samples = [{ t: 0, km: 0 }];
    this.raw = []; // [{t ms, km}] for auto-pause speed
    this.track = [];
    this.lastGood = null;
    this.hr = null;
    this.hrSamples = [];
    this.laps = [];
    this.step = { index: 0, startSec: 0, startKm: 0 };
    this.caption = "";
    this.captionAt = 0;
    this.gpsState = opts.source === "gps" ? "waiting" : opts.source;
    this.gpsMessage = "";
    this.lastAcc = null;
    this.splitsSpoken = 0;
    this.halfSpoken = false;
    this.completeSpoken = false;
    this.startedAt = null;
    this.endedAt = null;
    this.listeners = new Set();
    this.timer = null;
    this.watchId = null;
    this.wakeLock = null;
    this.lastTick = null;
    this.sim = null;
    this.simT = 0;
    this.speedKmh = (opts.treadmill && opts.treadmill.speedKmh) || 9;
    this.incline = (opts.treadmill && opts.treadmill.incline) || 0;
    this.plannedTotal = this.segs.length ? this.segs[this.segs.length - 1].end : 0;
    this.plannedKm = opts.workout && opts.workout.km ? opts.workout.km : null;
    active = this;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch (e) {
        /* a view error must not stop the recording */
      }
    }
  }

  say(text, { voice = true } = {}) {
    if (!text) return;
    this.caption = text;
    this.captionAt = nowMs();
    const v = this.opts.voice || {};
    if (voice && v.on !== false) speak(text, Number(v.rate) || 1);
  }

  get currentSeg() {
    return this.segs[this.step.index] || null;
  }
  get nextSeg() {
    return this.segs[this.step.index + 1] || null;
  }
  get inWarmupPhase() {
    const s = this.currentSeg;
    return !!(s && s.role === "warmup-phase");
  }
  get pace() {
    if (this.opts.source === "treadmill") return this.speedKmh > 0 ? 3600 / this.speedKmh : null;
    return paceFromWindow(this.samples, 30);
  }
  get avgPace() {
    return this.km > 0.01 ? this.elapsed / this.km : null;
  }

  async start() {
    if (this.status !== "ready") return;
    this.status = "running";
    this.startedAt = new Date().toISOString();
    this.lastTick = nowMs();
    await this.keepAwake(true);
    if (this.opts.source === "gps") await this.startGps();
    if (this.opts.source === "sim") this.startSim();
    const first = this.currentSeg;
    if (first) this.say(this.cueTexts[0]);
    else if (this.opts.warmup && this.opts.warmup.kind === "easy") this.say("Start slowly. Run the first part slower than the target.");
    else this.say("Run started.");
    this.timer = setInterval(() => this.tick(), 1000);
    this.emit();
  }

  /* The clock. Moving time grows while running and not auto-paused. */
  tick() {
    const t = nowMs();
    const dtReal = Math.min(5, Math.max(0, (t - this.lastTick) / 1000));
    this.lastTick = t;
    if (this.status !== "running") return;
    if (this.opts.source === "sim") {
      const mult = Number(this.opts.simSpeed) || 1;
      this.advanceSim(dtReal * mult);
    } else {
      if (!this.autoPaused) {
        this.elapsed += dtReal;
        if (this.opts.source === "treadmill") this.km += (this.speedKmh * dtReal) / 3600;
        this.samples.push({ t: this.elapsed, km: this.km });
      }
      // GPS auto-pause also needs a check when no new point comes.
      if (this.opts.source === "gps" && this.opts.autoPause && !this.inWarmupPhase && this.raw.length) {
        const last = this.raw[this.raw.length - 1];
        if ((t - last.t) / 1000 > 12) this.raw.push({ t, km: last.km });
        this.autoPaused = nextAutoPause(this.autoPaused, speedOverWindow(this.raw, this.autoPaused ? 4 : 10));
      }
    }
    if (this.samples.length > 20000) this.samples = this.samples.filter((_, i) => i % 2 === 0);
    this.afterProgress();
    this.emit();
  }

  afterProgress() {
    // Steps
    if (this.segs.length) {
      const r = advanceStep(this.step, this.segs, this.elapsed, this.km);
      if (r.changed) {
        this.step = r.state;
        const v = this.opts.voice || {};
        if (r.complete) {
          if (!this.completeSpoken) {
            this.completeSpoken = true;
            this.say("Workout complete. Well done. You can end the run or keep going.");
          }
        } else if (v.step !== false) this.say(this.cueTexts[this.step.index]);
        else this.caption = this.cueTexts[this.step.index];
        if (this.inWarmupPhase) this.autoPaused = false;
      }
    }
    const v = this.opts.voice || {};
    // Splits
    const n = Math.floor(this.km / this.unitKm + 1e-9);
    if (n > this.splitsSpoken) {
      this.splitsSpoken = n;
      if (v.km !== false) {
        const splits = computeSplits(this.samples, this.unitKm).filter((s) => !s.partial);
        const sp = splits[n - 1];
        if (sp) this.say(splitCueText(sp, this.units, this.elapsed));
      }
    }
    // Half-way
    if (!this.halfSpoken && v.half !== false) {
      const half = this.plannedTotal ? this.elapsed >= this.plannedTotal / 2 : false;
      if (half) {
        this.halfSpoken = true;
        this.say(`Half-way. Time ${sayDur(this.elapsed)}. Distance ${engine.fmtKm(this.km, this.units).replace("km", "kilometres").replace("mi", "miles")}.`);
      }
    }
  }

  /* ---- GPS ---- */
  onPosition(pos) {
    if (!pos || !pos.coords) return;
    const pt = { lat: pos.coords.latitude, lon: pos.coords.longitude, ele: Number.isFinite(pos.coords.altitude) ? pos.coords.altitude : null, acc: pos.coords.accuracy, t: pos.timestamp || nowMs() };
    this.lastAcc = pt.acc;
    const f = filterPoint(this.lastGood, pt);
    if (!f.ok) {
      if (f.reason === "accuracy") this.gpsState = "weak";
      this.emit();
      return;
    }
    this.gpsState = "good";
    this.gpsMessage = "";
    const raw = this.raw.length ? this.raw[this.raw.length - 1].km : 0;
    this.raw.push({ t: pt.t, km: raw + f.km });
    if (this.raw.length > 600) this.raw.splice(0, this.raw.length - 600);
    this.lastGood = pt;
    if (this.status !== "running") return;
    if (this.opts.autoPause && !this.inWarmupPhase) this.autoPaused = nextAutoPause(this.autoPaused, speedOverWindow(this.raw, this.autoPaused ? 4 : 10));
    if (!this.autoPaused && f.reason === "move") {
      this.km += f.km;
      this.samples.push({ t: this.elapsed, km: this.km });
    }
    if (!this.autoPaused) this.track.push({ t: pt.t, lat: round6(pt.lat), lon: round6(pt.lon), ele: pt.ele === null ? null : Math.round(pt.ele * 10) / 10 });
    this.afterProgress();
    this.emit();
  }

  onGpsError(err) {
    const code = err && err.code;
    const msg = String((err && err.message) || "");
    if (code === 1 || /denied|permission/i.test(msg)) {
      this.gpsState = "denied";
      this.gpsMessage = GPS_MESSAGES.denied;
    } else {
      this.gpsState = "weak";
      this.gpsMessage = GPS_MESSAGES.unavailable;
    }
    this.emit();
  }

  async startGps() {
    const opts = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
    if (isNativeRuntime()) {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        let perm = await Geolocation.checkPermissions();
        if (perm.location !== "granted") perm = await Geolocation.requestPermissions({ permissions: ["location"] });
        if (perm.location !== "granted") {
          this.onGpsError({ code: 1 });
          return;
        }
        this.watchId = await Geolocation.watchPosition(opts, (pos, err) => {
          if (err) this.onGpsError(err);
          else this.onPosition(pos);
        });
        this.watchKind = "native";
      } catch (e) {
        this.onGpsError(e);
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this.gpsState = "none";
      this.gpsMessage = GPS_MESSAGES.none;
      return;
    }
    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.onPosition(pos),
        (err) => this.onGpsError(err),
        opts
      );
      this.watchKind = "browser";
    } catch (e) {
      this.onGpsError(e);
    }
  }

  async stopGps() {
    if (this.watchId === null) return;
    try {
      if (this.watchKind === "native") {
        const { Geolocation } = await import("@capacitor/geolocation");
        await Geolocation.clearWatch({ id: this.watchId });
      } else if (typeof navigator !== "undefined" && navigator.geolocation) navigator.geolocation.clearWatch(this.watchId);
    } catch (e) {
      /* ignore */
    }
    this.watchId = null;
  }

  /* ---- Simulated GPS (browser demo) ---- */
  startSim() {
    const w = this.opts.workout || { steps: [{ kind: "steady", label: "Run", min: 30, pace: this.opts.simPaceSec || 360 }], min: 30 };
    // Warm-up phases are part of the simulated time as slow movement.
    const simW = { ...w, steps: this.segs.length ? this.segs.map((s) => ({ kind: "steady", label: s.label, sec: s.sec, pace: s.walk ? engine.WALK_PACE : s.pace || s.estPace || this.opts.simPaceSec || 360, walk: s.walk })) : w.steps };
    this.sim = engine.simulateRun(simW, { paceSec: this.opts.simPaceSec || 360, units: this.units, treadmill: false, maxHR: (this.opts.profile && this.opts.profile.maxHR) || 188, restHR: (this.opts.profile && this.opts.profile.restHR) || 55, tickSec: 5 });
    const route = engine.loopRoute(Math.max(1, this.sim.km), 5);
    this.simRoute = scaledRoute(route.points, Math.max(1, this.sim.km), route.elev);
    this.simT = 0;
  }

  advanceSim(dt) {
    if (!this.sim) return;
    const ticks = this.sim.ticks;
    const lastTick = ticks[ticks.length - 1];
    this.simT += dt;
    // After the plan ends, the demo keeps going at the last pace.
    let km;
    let hr;
    if (this.simT <= lastTick.t) {
      const i = Math.max(1, ticks.findIndex((x) => x.t >= this.simT));
      const a = ticks[i - 1];
      const b = ticks[i] || a;
      const f = b.t === a.t ? 1 : (this.simT - a.t) / (b.t - a.t);
      km = a.km + (b.km - a.km) * f;
      hr = Math.round(a.hr + (b.hr - a.hr) * f);
    } else {
      km = lastTick.km + (this.simT - lastTick.t) / (lastTick.pace || 360);
      hr = lastTick.hr;
    }
    this.elapsed = this.simT;
    this.km = km;
    this.hr = hr;
    this.hrSamples.push({ t: this.elapsed, hr });
    this.samples.push({ t: this.elapsed, km });
    const p = pointOnRoute(this.simRoute, km);
    if (p && (!this.track.length || this.elapsed - this._lastSimPt >= 5)) {
      this._lastSimPt = this.elapsed;
      this.track.push({ t: Date.parse(this.startedAt) + Math.round(this.elapsed * 1000), lat: round6(p.lat), lon: round6(p.lon), ele: p.ele });
    }
  }

  /* ---- controls ---- */
  setTreadmill(speedKmh, incline) {
    if (Number.isFinite(speedKmh) && speedKmh >= 0 && speedKmh <= 30) this.speedKmh = speedKmh;
    if (Number.isFinite(incline) && incline >= -5 && incline <= 25) this.incline = incline;
    this.emit();
  }

  lap() {
    const prev = this.laps.length ? this.laps[this.laps.length - 1] : { endSec: 0, endKm: 0 };
    const lap = { n: this.laps.length + 1, endSec: this.elapsed, endKm: this.km, sec: this.elapsed - prev.endSec, km: this.km - prev.endKm };
    this.laps.push(lap);
    this.say(`Lap ${lap.n}. ${sayDur(lap.sec)}.`);
    this.emit();
  }

  pause() {
    if (this.status !== "running") return;
    this.status = "paused";
    this.say("Paused.", { voice: true });
    this.emit();
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "running";
    this.lastTick = nowMs();
    this.say("Resumed.");
    this.emit();
  }

  /* Skips the rest of the current step (for example the warm-up). */
  skipStep() {
    if (!this.currentSeg) return;
    const seg = this.currentSeg;
    this.step = { index: this.step.index + 1, startSec: this.elapsed, startKm: this.km };
    if (this.currentSeg) this.say(this.cueTexts[this.step.index]);
    void seg;
    this.emit();
  }

  /* Skips all warm-up phases from the current step on. */
  skipWarmup() {
    let i = this.step.index;
    while (this.segs[i] && this.segs[i].role === "warmup-phase") i++;
    if (i === this.step.index) return;
    this.step = { index: i, startSec: this.elapsed, startKm: this.km };
    if (this.currentSeg) this.say(this.cueTexts[i]);
    this.emit();
  }

  async keepAwake(on) {
    if (isNativeRuntime()) {
      try {
        const { KeepAwake } = await import("@capacitor-community/keep-awake");
        if (on) await KeepAwake.keepAwake();
        else await KeepAwake.allowSleep();
      } catch (e) {
        /* the note on screen tells the user to keep it on */
      }
      return;
    }
    try {
      if (on && typeof navigator !== "undefined" && navigator.wakeLock) this.wakeLock = await navigator.wakeLock.request("screen");
      if (!on && this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch (e) {
      /* not supported */
    }
  }

  async end() {
    if (this.status === "ended") return this.result();
    this.status = "ended";
    this.endedAt = new Date().toISOString();
    clearInterval(this.timer);
    this.timer = null;
    await this.stopGps();
    await this.keepAwake(false);
    await stopVoice();
    if (active === this) active = null;
    this.emit();
    return this.result();
  }

  /* Discards a recording that has not ended (back button). */
  async cancel() {
    await this.end();
  }

  /* The draft run for the summary screen. */
  result() {
    const w = this.opts.workout;
    const splits = computeSplits(this.samples, this.unitKm).map((s) => ({ n: s.n, km: Math.round(s.km * 1000) / 1000, sec: Math.round(s.sec), partial: s.partial }));
    const hrs = this.hrSamples.map((x) => x.hr).filter((x) => x > 0);
    const run = {
      type: this.opts.source === "treadmill" ? "treadmill" : "run",
      startedAt: this.startedAt || new Date().toISOString(),
      durationSec: Math.round(this.elapsed),
      km: Math.round(this.km * 1000) / 1000,
      splits,
      splitUnit: this.units,
      laps: this.laps.map((l) => ({ n: l.n, sec: Math.round(l.sec), km: Math.round(l.km * 1000) / 1000 })),
      track: thinTrack(this.track),
      mode: this.opts.mode,
      origin: "app",
      recordedWith: this.opts.source === "sim" ? "simulated" : this.opts.source === "treadmill" ? "treadmill" : isNativeRuntime() ? "phone-gps" : "browser-gps",
      workoutId: w && w.id ? w.id : null,
      workoutType: w ? w.type : null,
      workoutTitle: w ? w.title : null,
      planIso: this.opts.planIso || null,
      warmupMin: this.opts.useWarmup && this.opts.warmup && this.opts.warmup.kind !== "easy" ? this.opts.warmup.minutes : 0,
    };
    if (this.opts.source === "sim") {
      run.simulated = true;
      run.name = "Simulated run (demo)";
    }
    if (this.opts.source === "treadmill") run.treadmill = { speedKmh: this.speedKmh, incline: this.incline };
    if (hrs.length) {
      run.avgHR = Math.round(hrs.reduce((s, x) => s + x, 0) / hrs.length);
      run.maxHR = Math.max(...hrs);
      run.hrSeries = this.hrSamples.filter((_, i) => i % 2 === 0).map((x) => [Math.round(x.t), x.hr]);
    }
    return run;
  }
}

const round6 = (v) => Math.round(v * 1e6) / 1e6;

/* Route shape (engine.loopRoute points) scaled to `km` around a
   neutral place. Demo only. */
export function scaledRoute(points, km, elev, center) {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const s = len ? km / len : 1;
  const lat0 = center && Number.isFinite(center.lat) ? center.lat : 51.5;
  const lon0 = center && Number.isFinite(center.lon) ? center.lon : -0.12;
  const out = [];
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    if (i) acc += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]) * s;
    out.push({ lat: lat0 + (points[i][1] * s) / 111.32, lon: lon0 + (points[i][0] * s) / (111.32 * Math.cos(rad(lat0))), km: acc, ele: elev && elev.length ? elev[Math.floor((i / points.length) * elev.length)] : null });
  }
  return out;
}

export function pointOnRoute(route, km) {
  if (!route || route.length < 2) return null;
  const total = route[route.length - 1].km;
  const k = total ? km % total : 0;
  for (let i = 1; i < route.length; i++) {
    if (route[i].km >= k) {
      const a = route[i - 1];
      const b = route[i];
      const f = b.km === a.km ? 0 : (k - a.km) / (b.km - a.km);
      return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f, ele: a.ele };
    }
  }
  return route[route.length - 1];
}

/* Time in each heart-rate zone from [[t, hr]] samples. zones from
   engine.hrZones. Returns seconds for zones 1-5. */
export function timeInZones(series, zones) {
  const out = [0, 0, 0, 0, 0];
  if (!series || series.length < 2 || !zones) return out;
  for (let i = 1; i < series.length; i++) {
    const dt = series[i][0] - series[i - 1][0];
    const hr = series[i][1];
    if (!(dt > 0)) continue;
    let z = zones.findIndex((x) => hr <= x.hi);
    if (z < 0) z = 4;
    if (hr < zones[0].lo) z = 0;
    out[z] += dt;
  }
  return out;
}

/* Scales a run to a corrected distance (treadmill display). */
export function correctDistance(run, km) {
  const k = Number(km);
  if (!run || !(k > 0) || !(run.km > 0)) return run;
  const f = k / run.km;
  const unitKm = run.splitUnit === "mi" ? engine.KM_PER_MI : 1;
  // Splits are made again from a straight line of the new distance.
  const samples = [{ t: 0, km: 0 }];
  let t = 0;
  let d = 0;
  for (const s of run.splits || []) {
    t += s.sec;
    d += s.km * f;
    samples.push({ t, km: d });
  }
  const splits = computeSplits(samples, unitKm).map((s) => ({ n: s.n, km: Math.round(s.km * 1000) / 1000, sec: Math.round(s.sec), partial: s.partial }));
  return { ...run, km: Math.round(k * 1000) / 1000, splits, distanceCorrected: true, measuredKm: run.km };
}
