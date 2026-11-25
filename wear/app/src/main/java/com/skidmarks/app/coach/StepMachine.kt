package com.skidmarks.app.coach

import kotlin.math.max
import kotlin.math.min

/*
 * Step machine. A port of advanceStep and stepProgress in
 * src/runui/recorder.js. A time step ends when its seconds pass.
 * A distance step ends when its km are covered.
 */

data class StepState(val index: Int = 0, val startSec: Double = 0.0, val startKm: Double = 0.0)

data class StepAdvance(val state: StepState, val changed: Boolean, val complete: Boolean)

data class StepProgress(val fraction: Double, val leftSec: Double?, val leftKm: Double?)

fun advanceStep(state: StepState?, segs: List<Segment>, elapsedSec: Double, km: Double): StepAdvance {
    var s = state ?: StepState()
    var changed = false
    while (s.index < segs.size) {
        val seg = segs[s.index]
        val doneTime = if (seg.by == By.DIST) false else elapsedSec - s.startSec >= seg.sec
        val doneDist = if (seg.by == By.DIST) km - s.startKm >= (seg.km ?: 0.0) - 1e-9 else false
        if (!doneTime && !doneDist) break
        // The next step starts at the planned end of this one (time) or now (distance).
        val nextStart = if (seg.by == By.DIST) elapsedSec else s.startSec + seg.sec
        s = StepState(s.index + 1, nextStart, km)
        changed = true
    }
    return StepAdvance(s, changed, s.index >= segs.size)
}

fun stepProgress(state: StepState, segs: List<Segment>, elapsedSec: Double, km: Double): StepProgress {
    val seg = segs.getOrNull(state.index) ?: return StepProgress(1.0, 0.0, 0.0)
    if (seg.by == By.DIST) {
        val done = km - state.startKm
        val segKm = seg.km ?: 0.0
        val f = if (segKm > 0) min(1.0, max(0.0, done / segKm)) else 0.0
        return StepProgress(f, null, max(0.0, segKm - done))
    }
    val done = elapsedSec - state.startSec
    return StepProgress(if (seg.sec > 0) min(1.0, max(0.0, done / seg.sec)) else 1.0, max(0.0, seg.sec - done), null)
}
