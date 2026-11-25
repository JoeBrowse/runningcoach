package com.skidmarks.app.coach

/*
 * Cue texts. A port of the phone code:
 * - src/runui/recorder.js: sayDur, splitCueText, stepCueText, segmentCueTexts
 * - src/run/engine/extras.js: audioCues
 * - src/run/engine/warmup.js: warmupCues
 * Do not change the words on one side only.
 */

private val WALK_RE = Regex("walk", RegexOption.IGNORE_CASE)

/** Duration in words: "2 minutes 30 seconds". */
fun sayDur(sec: Double): String {
    val s = jsRound(sec)
    fun secs(n: Long) = "$n second${if (n == 1L) "" else "s"}"
    if (s < 60) return secs(s)
    val m = s / 60
    val r = s % 60
    val ms = "$m minute${if (m == 1L) "" else "s"}"
    return if (r != 0L) "$ms ${secs(r)}" else ms
}

/** Voice text for a split. */
fun splitCueText(split: Split, units: String, totalSec: Double): String {
    val unitName = if (units == "mi") (if (split.n == 1) "mile" else "miles") else if (split.n == 1) "kilometre" else "kilometres"
    return "${split.n} $unitName. Time ${sayDur(totalSec)}. Last ${if (units == "mi") "mile" else "kilometre"} ${sayDur(split.sec)}."
}

/** Distance in words for the voice: "5.2 kilometres". */
fun sayKm(km: Double, units: String): String = fmtKm(km, units).replaceFirst("km", "kilometres").replaceFirst("mi", "miles")

fun halfwayCueText(elapsed: Double, km: Double, units: String): String =
    "Half-way. Time ${sayDur(elapsed)}. Distance ${sayKm(km, units)}."

fun lapCueText(n: Int, sec: Double): String = "Lap $n. ${sayDur(sec)}."

const val COMPLETE_TEXT = "Workout complete. Well done. You can end the run or keep going."
const val START_SLOWLY_TEXT = "Start slowly. Run the first part slower than the target."
const val RUN_STARTED_TEXT = "Run started."
const val PAUSED_TEXT = "Paused."
const val RESUMED_TEXT = "Resumed."

/* ---------- engine.audioCues ---------- */

private fun stepLen(x: Step): Double = when {
    x.min.truthy() -> x.min!! * 60
    x.sec.truthy() -> x.sec!!
    x.km.truthy() && x.pace.truthy() -> x.km!! * x.pace!!
    else -> 0.0
}

private fun engineDur(sec: Double): String =
    if (sec >= 60) "${jsNum(round(sec / 60, 1))} minute${if (sec == 60.0) "" else "s"}" else "${jsNum(sec)} seconds"

private fun engineTarget(x: Step, w: Workout, units: String): String {
    if (x.walk || WALK_RE.containsMatchIn(x.label ?: "")) return "Walk briskly."
    if (!w.showPace || !x.pace.truthy()) return x.effort?.ifEmpty { null } ?: w.effortText ?: ""
    return "Target ${fmtPace(x.pace, units).replaceFirst(" /", " per ").replaceFirst("mi", "mile").replaceFirst("km", "kilometre")}."
}

/** Voice cue texts for the steps, the same as engine.audioCues (texts only). */
fun audioCues(w: Workout?, units: String = "km"): List<String> {
    val cues = ArrayList<String>()
    if (w == null || w.steps.isEmpty()) return cues
    for (s in w.steps) {
        if (s.kind == "repeat") {
            val work = s.work ?: continue
            for (i in 1..s.times) {
                val workSec = if (work.sec.truthy()) work.sec!! else (work.min ?: 0.0) * 60
                cues.add("Rep $i of ${s.times}. ${work.label}, ${engineDur(workSec)}. ${engineTarget(work, w, units)}")
                val rest = s.rest
                if (rest != null) {
                    cues.add("${rest.label}. ${if (i == s.times) "Last one done." else "Recover."} ${engineTarget(rest, w, units)}".trim())
                }
            }
        } else {
            val amount = if (s.km.truthy()) sayKm(s.km!!, units) else engineDur(stepLen(s))
            cues.add("${s.label}, $amount. ${engineTarget(s, w, units)}".trim())
        }
    }
    cues.add("Workout complete. Well done.")
    return cues
}

/* ---------- engine.warmupCues ---------- */

/** Voice cue texts for the warm-up phases (the last one is "Warm-up complete"). */
fun warmupCues(warmup: Warmup?): List<String> {
    if (warmup == null) return emptyList()
    val cues = ArrayList<String>()
    for (p in warmup.phases) {
        if (!(p.min > 0)) continue
        cues.add(phaseCueText(p))
    }
    cues.add("Warm-up complete. Start the session.")
    return cues
}

private fun phaseCueText(p: WarmupPhase): String {
    val names = p.items.joinToString(", ") { it.name }
    return "${p.title}. ${jsNum(p.min)} minutes. $names."
}

/* ---------- recorder.stepCueText and segmentCueTexts ---------- */

/** Voice text for one step, when the engine text does not fit. */
fun stepCueText(seg: Segment?, units: String, showPace: Boolean): String {
    if (seg == null) return ""
    if (seg.isWarmupPhase && seg.phase != null) return phaseCueText(seg.phase)
    val rep = if (seg.reps != null && seg.reps != 0 && seg.role == "work") "Rep ${seg.rep} of ${seg.reps}. " else ""
    val amount = if (seg.by == By.DIST) sayKm(seg.km ?: 0.0, units) else sayDur(seg.sec)
    val st = seg.step
    val target = when {
        seg.walk -> "Walk briskly."
        showPace && st != null && st.paceLo.truthy() && st.paceHi.truthy() -> "Target ${fmtPace(st.paceLo, units)} to ${fmtPace(st.paceHi, units)}."
        showPace && seg.pace.truthy() -> "Target ${fmtPace(seg.pace, units)}."
        seg.effort != null -> seg.effort
        else -> ""
    }
    return "$rep${seg.label}, $amount. $target".replace("/km", "per kilometre").replace("/mi", "per mile").trim()
}

/**
 * One cue text for each segment. Uses the engine cues (and the warm-up
 * cues) when the counts match, else stepCueText.
 * workout.showPace must already be the voice value (Simple mode gives false).
 * warmup: give it only when the runner chose the warm-up.
 */
fun segmentCueTexts(workout: Workout?, segs: List<Segment>, units: String, warmup: Warmup?): List<String> {
    val engineCues = if (workout != null) audioCues(workout, units) else emptyList()
    val stepSegs = segs.count { !it.isWarmupPhase }
    val useEngine = engineCues.size == stepSegs + 1 && !(workout?.custom ?: false)
    val warmCues = if (warmup != null) warmupCues(warmup) else emptyList()
    val wPhases = warmup?.phases?.filter { it.min > 0 } ?: emptyList()
    var k = 0
    return segs.map { s ->
        if (s.isWarmupPhase) {
            val idx = wPhases.indexOfFirst { it === s.phase }.let { i -> if (i >= 0) i else wPhases.indexOf(s.phase) }
            val c = warmCues.getOrNull(idx)
            if (!c.isNullOrEmpty()) c else stepCueText(s, units, false)
        } else {
            val c = if (useEngine) engineCues.getOrNull(k) else null
            k++
            c ?: stepCueText(s, units, workout?.showPace ?: false)
        }
    }
}
