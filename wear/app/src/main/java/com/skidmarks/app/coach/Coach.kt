package com.skidmarks.app.coach

import kotlin.math.floor

/*
 * The live coach. The same rules as RunSession.afterProgress in
 * src/runui/recorder.js, without GPS or Android code:
 * steps, live pace guidance, splits, half-way and "workout complete".
 * The run service calls tick() once each second with the moving time
 * step and the total distance.
 */

enum class CueKind { START, STEP, COMPLETE, SLOW_DOWN, SPEED_UP, SPLIT, HALFWAY, LAP, PAUSE, RESUME, INFO }

/** One cue. speak false means: show the caption only. */
data class Cue(val text: String, val kind: CueKind, val speak: Boolean = true)

data class Lap(val n: Int, val endSec: Double, val endKm: Double, val sec: Double, val km: Double)

class Coach(
    val workout: Workout?,
    val warmup: Warmup?,
    val useWarmup: Boolean,
    val units: String,
    /** The voice value: false in Simple mode or when the workout says showPace false. */
    val showPace: Boolean,
    val voice: VoiceSettings,
) {
    val segs: List<Segment> = buildSegments(workout, warmup, useWarmup)
    val cueTexts: List<String> = segmentCueTexts(workout, segs, units, if (useWarmup) warmup else null)
    val unitKm: Double = if (units == "mi") KM_PER_MI else 1.0
    val plannedTotal: Double = totalSeconds(segs)

    var elapsed = 0.0
        private set
    var km = 0.0
        private set
    val samples = ArrayList<Sample>().apply { add(Sample(0.0, 0.0)) }
    var step = StepState()
        private set
    val laps = ArrayList<Lap>()
    private var paceGuide: GuideState? = null
    private var splitsSpoken = 0
    private var halfSpoken = false
    private var completeSpoken = false

    val currentSeg: Segment? get() = segs.getOrNull(step.index)
    val nextSeg: Segment? get() = segs.getOrNull(step.index + 1)
    val inWarmupPhase: Boolean get() = currentSeg?.isWarmupPhase == true
    val complete: Boolean get() = segs.isNotEmpty() && step.index >= segs.size
    val pace: Double? get() = paceFromWindow(samples, 30.0)
    val avgPace: Double? get() = if (km > 0.01) elapsed / km else null

    /** The first cue when the run starts. */
    fun start(): Cue = when {
        currentSeg != null -> Cue(cueTexts[0], CueKind.START)
        useWarmup && warmup?.kind == "easy" -> Cue(START_SLOWLY_TEXT, CueKind.START)
        else -> Cue(RUN_STARTED_TEXT, CueKind.START)
    }

    /**
     * Moves the clock. dtSec: moving seconds since the last tick (0 while
     * paused). totalKm: the total distance. autoPaused: no pace guidance.
     */
    fun tick(dtSec: Double, totalKm: Double, autoPaused: Boolean = false): List<Cue> {
        if (dtSec > 0) {
            elapsed += dtSec
            km = maxOf(km, totalKm)
            samples.add(Sample(elapsed, km))
            if (samples.size > 20000) {
                val keep = samples.filterIndexed { i, _ -> i % 2 == 0 }
                samples.clear()
                samples.addAll(keep)
            }
        }
        return afterProgress(autoPaused)
    }

    private fun afterProgress(autoPaused: Boolean): List<Cue> {
        val out = ArrayList<Cue>()
        // Steps
        if (segs.isNotEmpty()) {
            val r = advanceStep(step, segs, elapsed, km)
            if (r.changed) {
                step = r.state
                if (r.complete) {
                    if (!completeSpoken) {
                        completeSpoken = true
                        out.add(Cue(COMPLETE_TEXT, CueKind.COMPLETE))
                    }
                } else {
                    out.add(Cue(cueTexts[step.index], CueKind.STEP, speak = voice.step))
                }
            }
        }
        // Live pace guidance
        val seg = currentSeg
        if (voice.pace && !autoPaused && seg != null) {
            val r = paceGuidance(paceGuide, seg, pace, elapsed - step.startSec, elapsed, showPace, units)
            paceGuide = r.g
            if (r.text != null) out.add(Cue(r.text, if (r.side == "fast") CueKind.SLOW_DOWN else CueKind.SPEED_UP))
        }
        // Splits
        val n = floor(km / unitKm + 1e-9).toInt()
        if (n > splitsSpoken) {
            splitsSpoken = n
            if (voice.km) {
                val sp = computeSplits(samples, unitKm).filter { !it.partial }.getOrNull(n - 1)
                if (sp != null) out.add(Cue(splitCueText(sp, units, elapsed), CueKind.SPLIT))
            }
        }
        // Half-way
        if (!halfSpoken && voice.half && plannedTotal > 0 && elapsed >= plannedTotal / 2) {
            halfSpoken = true
            out.add(Cue(halfwayCueText(elapsed, km, units), CueKind.HALFWAY))
        }
        return out
    }

    fun lap(): Cue {
        val prev = laps.lastOrNull()
        val lap = Lap(laps.size + 1, elapsed, km, elapsed - (prev?.endSec ?: 0.0), km - (prev?.endKm ?: 0.0))
        laps.add(lap)
        return Cue(lapCueText(lap.n, lap.sec), CueKind.LAP)
    }

    /** Skips the rest of the current step. */
    fun skipStep(): Cue? {
        if (currentSeg == null) return null
        step = StepState(step.index + 1, elapsed, km)
        paceGuide = null
        return if (currentSeg != null) Cue(cueTexts[step.index], CueKind.STEP) else null
    }

    /** Skips all warm-up phases from the current step on. */
    fun skipWarmup(): Cue? {
        var i = step.index
        while (i < segs.size && segs[i].isWarmupPhase) i++
        if (i == step.index) return null
        step = StepState(i, elapsed, km)
        paceGuide = null
        return if (currentSeg != null) Cue(cueTexts[i], CueKind.STEP) else null
    }

    fun progress(): StepProgress = stepProgress(step, segs, elapsed, km)

    fun splits(): List<Split> = computeSplits(samples, unitKm)
}
