import { useEffect } from "react";

/* ---------------------------------------------------------------
   REST TIMER
   Science-backed rest windows: ~2-3min for heavy compounds (favors
   strength/power recovery between big lifts), ~60-90s for isolation
   work (still enough for hypertrophy without excess session length).
--------------------------------------------------------------- */

export const REST_SECONDS = { compound: 120, isolation: 90 };

/* Those are defaults, not rules — a lifter resting four minutes between
   heavy squats is not doing it wrong, and neither is one supersetting
   curls. Settings → Training Defaults moves both.

   The bounds are the part that is not a preference: under thirty seconds
   the timer is finished before the bar is racked, and past ten minutes it
   has stopped being a rest and become the end of the session. */
export const REST_RANGE = { min: 30, max: 600, step: 15 };

/* How many empty set rows an exercise opens with.

   One was the only sensible default when it was not a choice — a wrong
   guess costs a tap to add or a row to ignore — but most people do the
   same number of sets every time and would rather the rows were waiting. */
export function blankSets(settings) {
  const n = parseInt((settings || {}).startingSets, 10);
  const count = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
  return Array.from({ length: count }, () => ({ weight: "", reps: "", done: false }));
}

export function restSecondsFor(ex, settings) {
  const s = settings || {};
  const key = ex && ex.type === "compound" ? "restCompound" : "restIsolation";
  const v = parseInt(s[key], 10);
  if (Number.isFinite(v)) return Math.min(REST_RANGE.max, Math.max(REST_RANGE.min, v));
  return REST_SECONDS[ex && ex.type] || REST_SECONDS.isolation;
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // audio not available — fail silently
  }
}

/* The rest countdown is identical in the workout screen and the 1RM test day,
   so it lives here rather than being written out twice.

   It counts to a deadline rather than counting down a number. The first
   version subtracted one every second from a setTimeout chain, which is only
   accurate while something is running those timeouts — and nothing is, once
   the screen locks or the app goes to the background. A browser throttles a
   hidden tab's timers to about one a minute and a locked phone stops them
   dead, so a 120-second rest looked like 110 seconds after two minutes in a
   pocket. Every set anybody logs ends with the phone going down, which is to
   say the timer was wrong almost every time it mattered.

   Now the deadline is a wall-clock instant and the remaining seconds are
   worked out from it on each tick, so coming back to the app shows the truth
   whatever happened in between. Pausing stores what was left and clears the
   deadline; resuming sets a new one. */

export function restRemaining(timer, now) {
  if (!timer) return 0;
  if (timer.paused || !timer.endsAt) return Math.max(0, Math.round(timer.seconds));
  return Math.max(0, Math.round((timer.endsAt - (now || Date.now())) / 1000));
}

export function startedRest(label, total) {
  return { label, total, seconds: total, endsAt: Date.now() + total * 1000, paused: false };
}

export function toggledRestPause(prev) {
  if (!prev) return prev;
  if (prev.paused) {
    return { ...prev, paused: false, endsAt: Date.now() + prev.seconds * 1000 };
  }
  return { ...prev, paused: true, seconds: restRemaining(prev), endsAt: null };
}

export function addedRestTime(prev, secs) {
  if (!prev) return prev;
  const total = prev.total + secs;
  if (prev.paused) return { ...prev, total, seconds: prev.seconds + secs };
  return { ...prev, total, endsAt: prev.endsAt + secs * 1000, seconds: restRemaining(prev) + secs };
}

// How late an alert can be and still be worth making. Past this, the phone was
// away or asleep, the rest is long over, and a beep is just a noise.
export const REST_ALERT_GRACE_MS = 3000;

export function useRestCountdown(timer, setTimer, soundOn, vibrateOn) {
  useEffect(() => {
    if (!timer || timer.paused || !timer.endsAt) return undefined;

    const check = () => {
      const now = Date.now();
      const left = restRemaining(timer, now);
      if (left > 0) {
        setTimer((prev) => (prev && !prev.paused && prev.seconds !== left ? { ...prev, seconds: left } : prev));
        return;
      }
      if (now - timer.endsAt <= REST_ALERT_GRACE_MS) {
        if (soundOn) playBeep();
        // A gym is loud and a phone is usually in a pocket, so the buzz is the
        // half of the alert that actually lands. Guarded because iOS has no
        // vibrate and some browsers throw on the call.
        if (vibrateOn && typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([180, 90, 180]); } catch (e) { /* not available here */ }
        }
      }
      setTimer(null);
    };

    // Twice a second rather than once: a tick that lands just after the second
    // turns over would otherwise show a number that is already stale.
    const id = setInterval(check, 500);
    // Coming back to the app should not wait for the next tick to tell the
    // truth, and on a throttled tab the next tick may be a minute away.
    const onWake = () => check();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    check();
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [timer, setTimer, soundOn, vibrateOn]);
}
