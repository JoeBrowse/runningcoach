package com.skidmarks.app.coach

/*
 * Live pace guidance. A port of PACE_GUIDE, paceBand and paceGuidance in
 * src/runui/recorder.js.
 * After a step has run for settleSec, a pace that stays outside the
 * target band for holdSec gives one cue. Cues come at most once each
 * gapSec. Easy steps get only "slow down": slower is fine on easy runs.
 * Walk steps, warm-up moves and steps with no target get no cue.
 */

data class PaceGuideConfig(
    val holdSec: Double = 20.0,
    val gapSec: Double = 60.0,
    val settleSec: Double = 30.0,
    val tol: Map<String, Double> = mapOf("hard" to 0.04, "race" to 0.04, "steady" to 0.05, "easy" to 0.08),
)

val PACE_GUIDE = PaceGuideConfig()

data class PaceBand(val lo: Double, val hi: Double, val cls: String)

/** The guide state. side is "fast", "slow" or null. */
data class GuideState(val side: String? = null, val since: Double? = null, val lastAt: Double = Double.NEGATIVE_INFINITY)

data class GuideResult(val g: GuideState, val text: String?, val side: String? = null)

fun paceBand(seg: Segment?, guide: PaceGuideConfig = PACE_GUIDE): PaceBand? {
    if (seg == null || seg.walk || seg.cls == "walk" || seg.isWarmupPhase) return null
    val st = seg.step
    if (st != null && st.paceLo.truthy() && st.paceHi.truthy()) {
        return PaceBand(minOf(st.paceLo!!, st.paceHi!!), maxOf(st.paceLo, st.paceHi), seg.cls)
    }
    val pace = seg.pace
    if (!pace.truthy()) return null
    val tol = guide.tol[seg.cls] ?: guide.tol.getValue("steady")
    return PaceBand(pace!! * (1 - tol), pace * (1 + tol), seg.cls)
}

private fun spokenPace(sec: Double, units: String): String =
    fmtPace(sec, units).replace("/km", "per kilometre").replace("/mi", "per mile")

fun paceGuidance(
    g: GuideState?,
    seg: Segment?,
    pace: Double?,
    segElapsed: Double,
    now: Double,
    showPace: Boolean,
    units: String = "km",
    guide: PaceGuideConfig = PACE_GUIDE,
): GuideResult {
    val state = g ?: GuideState()
    val band = paceBand(seg, guide)
    if (band == null || pace == null || !pace.isFinite() || segElapsed < guide.settleSec) {
        return GuideResult(state.copy(side = null, since = null), null)
    }
    var side: String? = if (pace < band.lo) "fast" else if (pace > band.hi) "slow" else null
    if (side == "slow" && band.cls == "easy") side = null
    if (side != state.side) return GuideResult(state.copy(side = side, since = if (side != null) now else null), null)
    if (side == null || now - (state.since ?: now) < guide.holdSec || now - state.lastAt < guide.gapSec) return GuideResult(state, null)
    val target = "Target ${spokenPace(band.lo, units)} to ${spokenPace(band.hi, units)}. You are at ${spokenPace(pace, units)}."
    val text = if (side == "fast") {
        if (showPace) "Slow down. $target" else if (band.cls == "easy") "Slow down. Run slowly enough to talk." else "Slow down a little. Keep this part controlled."
    } else {
        if (showPace) "Speed up. $target" else "Speed up a little. ${seg?.effort ?: "This part is strong running."}"
    }
    return GuideResult(GuideState(side, now, now), text, side)
}
