package com.skidmarks.app.coach

import kotlin.math.abs
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/*
 * GPS, pace, auto-pause and splits. A port of the pure functions in
 * src/runui/recorder.js. Times in samples are moving seconds.
 */

private const val R_KM = 6371.0088
private fun rad(d: Double) = d * Math.PI / 180

/** One distance sample: moving seconds and km. */
data class Sample(val t: Double, val km: Double)

/** One raw point for the auto-pause speed: wall time in ms and km. */
data class RawPoint(val t: Long, val km: Double)

/** One GPS point. t is wall time in ms, acc is the accuracy in metres. */
data class GpsPoint(val lat: Double, val lon: Double, val t: Long, val acc: Double? = null, val ele: Double? = null)

/** One stored track point. */
data class TrackPoint(val t: Long, val lat: Double, val lon: Double, val ele: Double?)

data class Split(val n: Int, val km: Double, val sec: Double, val pace: Double, val partial: Boolean)

data class GpsLimits(val maxAccuracyM: Double = 30.0, val maxSpeedMps: Double = 10.0, val minMoveM: Double = 2.0)

data class FilterResult(val ok: Boolean, val reason: String, val km: Double)

fun haversineKm(aLat: Double, aLon: Double, bLat: Double, bLon: Double): Double {
    val dLat = rad(bLat - aLat)
    val dLon = rad(bLon - aLon)
    val s1 = sin(dLat / 2)
    val s2 = sin(dLon / 2)
    val h = s1 * s1 + cos(rad(aLat)) * cos(rad(bLat)) * s2 * s2
    return 2 * R_KM * asin(min(1.0, sqrt(h)))
}

/** Checks one GPS point against the last good point. */
fun filterPoint(prev: GpsPoint?, pt: GpsPoint?, limits: GpsLimits = GpsLimits()): FilterResult {
    if (pt == null || !pt.lat.isFinite() || !pt.lon.isFinite() || abs(pt.lat) > 90 || abs(pt.lon) > 180) return FilterResult(false, "invalid", 0.0)
    if (pt.lat == 0.0 && pt.lon == 0.0) return FilterResult(false, "invalid", 0.0)
    if (pt.acc != null && pt.acc.isFinite() && pt.acc > limits.maxAccuracyM) return FilterResult(false, "accuracy", 0.0)
    if (prev == null) return FilterResult(true, "first", 0.0)
    val dt = (pt.t - prev.t) / 1000.0
    if (!(dt > 0)) return FilterResult(false, "time", 0.0)
    val km = haversineKm(prev.lat, prev.lon, pt.lat, pt.lon)
    if (km * 1000 / dt > limits.maxSpeedMps) return FilterResult(false, "jump", 0.0)
    return FilterResult(true, if (km * 1000 < limits.minMoveM) "still" else "move", km)
}

/** Distance at moving time t, from samples sorted by t. */
fun kmAt(samples: List<Sample>, t: Double): Double {
    if (samples.isEmpty()) return 0.0
    if (t <= samples[0].t) return samples[0].km
    for (i in 1 until samples.size) {
        val b = samples[i]
        if (b.t >= t) {
            val a = samples[i - 1]
            return if (b.t == a.t) b.km else a.km + (b.km - a.km) * (t - a.t) / (b.t - a.t)
        }
    }
    return samples.last().km
}

/** Current pace (sec per km) over the last windowSec of moving time, or null. */
fun paceFromWindow(samples: List<Sample>, windowSec: Double = 30.0): Double? {
    if (samples.size < 2) return null
    val last = samples.last()
    val from = max(samples[0].t, last.t - windowSec)
    val dt = last.t - from
    if (dt < min(10.0, windowSec / 2)) return null
    val dk = last.km - kmAt(samples, from)
    if (dk < 0.005) return null
    val pace = dt / dk
    return if (pace > 3600) null else pace
}

/** Speed in m/s over the last windowSec of raw points. */
fun speedOverWindow(points: List<RawPoint>, windowSec: Double = 10.0): Double? {
    if (points.size < 2) return null
    val last = points.last()
    var first: RawPoint? = null
    for (i in points.size - 2 downTo 0) {
        first = points[i]
        if ((last.t - points[i].t) / 1000.0 >= windowSec) break
    }
    val f = first ?: return null
    val dt = (last.t - f.t) / 1000.0
    if (dt < windowSec / 2) return null
    return (last.km - f.km) * 1000 / dt
}

data class AutoPauseLimits(val pauseBelowMps: Double = 0.5, val resumeAboveMps: Double = 1.0)

/** Auto-pause with two limits, so the state does not flicker. */
fun nextAutoPause(paused: Boolean, speedMps: Double?, limits: AutoPauseLimits = AutoPauseLimits()): Boolean {
    if (speedMps == null || !speedMps.isFinite()) return paused
    if (!paused && speedMps < limits.pauseBelowMps) return true
    if (paused && speedMps > limits.resumeAboveMps) return false
    return paused
}

/** Splits for each whole unit (1 km, or 1.609 km for miles). The last part is a partial split. */
fun computeSplits(samples: List<Sample>, unitKm: Double = 1.0): List<Split> {
    val out = ArrayList<Split>()
    if (samples.size < 2) return out
    val total = samples.last().km
    var prevT = samples[0].t
    var n = 1
    var i = 1
    while (n * unitKm <= total + 1e-9) {
        val target = n * unitKm
        while (i < samples.size && samples[i].km < target) i++
        if (i >= samples.size) break
        val a = samples[i - 1]
        val b = samples[i]
        val t = if (b.km == a.km) b.t else a.t + (b.t - a.t) * (target - a.km) / (b.km - a.km)
        out.add(Split(n, unitKm, t - prevT, (t - prevT) / unitKm, false))
        prevT = t
        n++
    }
    val lastT = samples.last().t
    val rest = total - (n - 1) * unitKm
    if (rest > 0.05 && lastT > prevT) out.add(Split(n, rest, lastT - prevT, (lastT - prevT) / rest, true))
    return out
}

/** Keeps fewer track points: a point stays when it is minM metres or more from the last kept point, or minSec seconds later. */
fun thinTrack(points: List<TrackPoint>, minM: Double = 15.0, minSec: Double = 20.0): List<TrackPoint> {
    if (points.size <= 2) return points.toList()
    val out = ArrayList<TrackPoint>()
    out.add(points[0])
    for (i in 1 until points.size - 1) {
        val last = out.last()
        val p = points[i]
        if (haversineKm(last.lat, last.lon, p.lat, p.lon) * 1000 >= minM || (p.t - last.t) / 1000.0 >= minSec) out.add(p)
    }
    out.add(points.last())
    return out
}

/** Keeps one heart-rate sample each everySec seconds. Samples are (moving seconds, bpm). */
fun thinHr(samples: List<Pair<Double, Int>>, everySec: Double = 5.0): List<Pair<Double, Int>> {
    val out = ArrayList<Pair<Double, Int>>()
    for (s in samples) {
        if (out.isEmpty() || s.first - out.last().first >= everySec) out.add(s)
    }
    return out
}
