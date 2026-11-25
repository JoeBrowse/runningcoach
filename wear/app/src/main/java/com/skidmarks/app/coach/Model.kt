package com.skidmarks.app.coach

/*
 * Data shapes for the watch coach. Plain Kotlin, no Android types.
 * They follow the phone engine (src/run/ENGINE.md):
 * distances in km, paces in seconds per km, times in seconds.
 */

/** One engine step. A repeat step has times, work and rest. */
data class Step(
    val kind: String? = null,
    val label: String? = null,
    val min: Double? = null,
    val sec: Double? = null,
    val km: Double? = null,
    val pace: Double? = null,
    val estPace: Double? = null,
    val paceLo: Double? = null,
    val paceHi: Double? = null,
    val effort: String? = null,
    val walk: Boolean = false,
    val cls: String? = null,
    val times: Int = 0,
    val work: Step? = null,
    val rest: Step? = null,
)

/** One move of a warm-up phase (only the parts the watch shows). */
data class WarmupMove(val name: String, val dose: String? = null)

/** One warm-up phase from engine.warmupFor(). */
data class WarmupPhase(val id: String, val title: String, val min: Double, val items: List<WarmupMove>)

/** The engine.warmupFor() result. */
data class Warmup(
    val kind: String,
    val minutes: Double,
    val phases: List<WarmupPhase>,
    val inSteps: Boolean = false,
    val notes: List<String> = emptyList(),
)

/** One planned workout (a day of the plan), or a free run when steps is empty. */
data class Workout(
    val id: String? = null,
    val iso: String? = null,
    val type: String? = null,
    val intensity: String? = null,
    val title: String = "Run",
    val km: Double? = null,
    val min: Double? = null,
    val steps: List<Step> = emptyList(),
    val effortText: String? = null,
    val showPace: Boolean = true,
    val custom: Boolean = false,
    val done: Boolean = false,
    val warmup: Warmup? = null,
)

/** Voice settings, the same keys as the phone (run-settings voice). */
data class VoiceSettings(
    val on: Boolean = true,
    val rate: Double = 1.0,
    val km: Boolean = true,
    val step: Boolean = true,
    val half: Boolean = true,
    val pace: Boolean = true,
)

/** The plan that the phone sends to the watch. */
data class WatchPlan(
    val updatedAt: String? = null,
    val units: String = "km",
    val simple: Boolean = true,
    val autoPause: Boolean = true,
    val voice: VoiceSettings = VoiceSettings(),
    val days: List<Workout> = emptyList(),
)

enum class By { TIME, DIST }

/** One segment of a recording: a flat step or a warm-up phase. */
data class Segment(
    val label: String,
    val sec: Double,
    val km: Double?,
    val pace: Double?,
    val estPace: Double? = null,
    val effort: String? = null,
    val by: By,
    val cls: String,
    val role: String,
    val rep: Int? = null,
    val reps: Int? = null,
    val start: Double = 0.0,
    val end: Double = 0.0,
    val walk: Boolean = false,
    val step: Step? = null,
    val phase: WarmupPhase? = null,
) {
    val isWarmupPhase: Boolean get() = role == ROLE_WARMUP_PHASE

    companion object {
        const val ROLE_WARMUP_PHASE = "warmup-phase"
    }
}
