package com.skidmarks.app.coach

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import kotlin.math.roundToInt

/*
 * The run that the watch saves and sends to the phone. The fields follow
 * the phone recorder result (src/runui/recorder.js RunSession.result) and
 * store.saveRun, plus source "watch".
 */

data class RunDraft(
    val id: String,
    val startedAtMs: Long,
    val durationSec: Double,
    val km: Double,
    val units: String,
    val splits: List<Split>,
    val laps: List<Lap>,
    /** Heart rate samples: (moving seconds, bpm). */
    val hr: List<Pair<Double, Int>>,
    val track: List<TrackPoint>,
    val workout: Workout?,
    val planIso: String?,
    val warmupMin: Double,
)

object RunRecord {
    private fun r3(v: Double) = jsRound(v * 1000) / 1000.0
    private fun r1(v: Double) = jsRound(v * 10) / 10.0
    private fun r6(v: Double) = jsRound(v * 1e6) / 1e6

    fun newId(startedAtMs: Long, random: kotlin.random.Random = kotlin.random.Random.Default): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        val tail = (1..4).map { chars[random.nextInt(chars.length)] }.joinToString("")
        return "watch-$startedAtMs-$tail"
    }

    fun isoOf(ms: Long): String = Instant.ofEpochMilli(ms).toString()

    /** The run JSON. rpe is null until the runner answers "How hard was it?". */
    fun toJson(d: RunDraft, rpe: Int? = null): JSONObject {
        val dur = jsRound(d.durationSec)
        val o = JSONObject()
        o.put("id", d.id)
        o.put("type", "run")
        o.put("startedAt", isoOf(d.startedAtMs))
        o.put("durationSec", dur)
        o.put("minutes", dur / 60)
        o.put("seconds", dur % 60)
        o.put("km", r3(d.km))
        o.put("rpe", rpe ?: JSONObject.NULL)
        o.put("splits", JSONArray().apply {
            d.splits.forEach { s -> put(JSONObject().put("n", s.n).put("km", r3(s.km)).put("sec", jsRound(s.sec)).put("partial", s.partial)) }
        })
        o.put("splitUnit", d.units)
        o.put("laps", JSONArray().apply {
            d.laps.forEach { l -> put(JSONObject().put("n", l.n).put("sec", jsRound(l.sec)).put("km", r3(l.km))) }
        })
        val bpm = d.hr.map { it.second }.filter { it > 0 }
        if (bpm.isNotEmpty()) {
            o.put("avgHR", (bpm.sum().toDouble() / bpm.size).roundToInt())
            o.put("maxHR", bpm.max())
            o.put("hrSeries", JSONArray().apply {
                thinHr(d.hr.filter { it.second > 0 }, 5.0).forEach { put(JSONArray().put(jsRound(it.first)).put(it.second)) }
            })
        }
        o.put("track", JSONArray().apply {
            thinTrack(d.track, 15.0, 20.0).forEach { p ->
                put(JSONObject().put("t", p.t).put("lat", r6(p.lat)).put("lon", r6(p.lon)).put("ele", p.ele?.let { r1(it) } ?: JSONObject.NULL))
            }
        })
        val w = d.workout
        o.put("workoutId", w?.id ?: JSONObject.NULL)
        o.put("workoutType", w?.type ?: JSONObject.NULL)
        o.put("workoutTitle", w?.title ?: JSONObject.NULL)
        o.put("planIso", d.planIso ?: JSONObject.NULL)
        o.put("warmupMin", d.warmupMin)
        o.put("mode", if (w != null) "plan" else "free")
        o.put("origin", "watch")
        o.put("source", "watch")
        o.put("recordedWith", "watch-gps")
        return o
    }
}
