package com.skidmarks.app.coach

/*
 * Steps and segments. A port of the phone code:
 * - src/runui/steps.js: stepSeconds, stepClass, flattenSteps
 * - src/runui/recorder.js: buildSegments
 * Keep both sides the same. The parity test (ParityTest) compares them.
 */

private val WALK_RE = Regex("walk", RegexOption.IGNORE_CASE)
private val STRIDE_RE = Regex("stride", RegexOption.IGNORE_CASE)
private val STEADY_RE = Regex("steady|finish|race pace|goal race", RegexOption.IGNORE_CASE)
private val THRESHOLD_RE = Regex("threshold", RegexOption.IGNORE_CASE)

/** A JavaScript "truthy" number: not null, not 0, not NaN. */
internal fun Double?.truthy(): Boolean = this != null && this != 0.0 && !this.isNaN()

const val DEFAULT_FALLBACK_PACE = 390.0

/** Seconds of one step (time, or distance x pace). */
fun stepSeconds(x: Step?, fallbackPace: Double = DEFAULT_FALLBACK_PACE): Double {
    if (x == null) return 0.0
    if (x.min.truthy()) return x.min!! * 60
    if (x.sec.truthy()) return x.sec!!
    if (x.km.truthy()) {
        val p = when {
            x.pace.truthy() -> x.pace!!
            x.estPace.truthy() -> x.estPace!!
            else -> fallbackPace
        }
        return x.km!! * p
    }
    return 0.0
}

fun isWalkStep(x: Step?): Boolean = x != null && (x.walk || WALK_RE.containsMatchIn(x.label ?: ""))

/** Intensity class of one step: walk | easy | steady | hard | race. */
fun stepClass(x: Step, role: String, workout: Workout?): String {
    if (isWalkStep(x)) return "walk"
    if (!x.cls.isNullOrEmpty()) return x.cls
    if (role == "rest") return "walk"
    if (x.kind == "warmup" || x.kind == "cooldown") return "easy"
    val type = workout?.type
    if (role == "work") {
        if (type == "runwalk" || type == "strides" || type == "shakeout") return if (STRIDE_RE.containsMatchIn(x.label ?: "")) "hard" else "easy"
        return "hard"
    }
    if (STEADY_RE.containsMatchIn(x.label ?: "")) return "steady"
    if (workout?.intensity == "race") return "race"
    if (workout?.intensity == "hard") return if (THRESHOLD_RE.containsMatchIn(x.label ?: "")) "hard" else "steady"
    return "easy"
}

/** Flat list of segments from engine steps. start and end are planned seconds from the start. */
fun flattenSteps(workout: Workout?, fallbackPace: Double = DEFAULT_FALLBACK_PACE): List<Segment> {
    val steps = workout?.steps ?: emptyList()
    val out = ArrayList<Segment>()
    var t = 0.0
    fun push(x: Step, role: String, rep: Int?, reps: Int?) {
        val sec = stepSeconds(x, fallbackPace)
        val by = if (x.km.truthy() && !x.min.truthy() && !x.sec.truthy()) By.DIST else By.TIME
        out.add(
            Segment(
                label = if (x.label.isNullOrEmpty()) "Run" else x.label,
                sec = sec,
                km = if (x.km.truthy()) x.km else null,
                pace = if (x.pace.truthy()) x.pace else null,
                estPace = if (x.estPace.truthy()) x.estPace else null,
                effort = x.effort?.ifEmpty { null },
                by = by,
                cls = stepClass(x, role, workout),
                role = role,
                rep = rep,
                reps = reps,
                start = t,
                end = t + sec,
                walk = isWalkStep(x),
                step = x,
            )
        )
        t += sec
    }
    for (s in steps) {
        if (s.kind == "repeat") {
            val work = s.work ?: continue
            for (i in 1..s.times) {
                push(work, "work", i, s.times)
                if (s.rest != null) push(s.rest, "rest", i, s.times)
            }
        } else {
            push(s, if (s.kind.isNullOrEmpty()) "steady" else s.kind, null, null)
        }
    }
    return out
}

/**
 * Segments of a recording: the workout steps plus the warm-up phases.
 * - inSteps (quality runs): phases go after the first step (the jog).
 * - kind "easy": no segments (the "start slowly" note only).
 * - Else: phases go before the first step.
 */
fun buildSegments(workout: Workout?, warmup: Warmup?, useWarmup: Boolean, fallbackPace: Double = DEFAULT_FALLBACK_PACE): List<Segment> {
    val base = if (workout != null) flattenSteps(workout, fallbackPace) else emptyList()
    if (!useWarmup || warmup == null || warmup.kind == "easy") return retime(base)
    // A run/walk session already starts with a brisk walk: the warm-up
    // moves follow that walk, and the second walk is not added.
    val walkFirst = warmup.kind == "gentle" && base.isNotEmpty() && base[0].role == "warmup"
    val phases = warmup.phases
        .filter { it.min > 0 && !(walkFirst && it.id == "general") }
        .map {
            Segment(
                label = it.title,
                sec = it.min * 60,
                km = null,
                pace = null,
                by = By.TIME,
                cls = if (it.id == "general" || it.id == "strides") "easy" else "walk",
                role = Segment.ROLE_WARMUP_PHASE,
                phase = it,
                walk = it.id != "general",
            )
        }
    if (phases.isEmpty()) return retime(base)
    val at = if ((warmup.inSteps || walkFirst) && base.isNotEmpty() && base[0].role == "warmup") 1 else 0
    return retime(base.subList(0, at) + phases + base.subList(at, base.size))
}

private fun retime(segs: List<Segment>): List<Segment> {
    var t = 0.0
    return segs.map {
        val out = it.copy(start = t, end = t + it.sec)
        t += it.sec
        out
    }
}

/** Planned seconds of all segments. */
fun totalSeconds(segs: List<Segment>): Double = if (segs.isEmpty()) 0.0 else segs.last().end
