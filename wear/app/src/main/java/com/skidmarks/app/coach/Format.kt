package com.skidmarks.app.coach

import kotlin.math.floor
import kotlin.math.roundToLong

/*
 * Number and text formats that match the phone engine (src/run/engine/util.js).
 * JavaScript prints 5 for 5.0, so jsNum() removes a ".0" end.
 */

const val KM_PER_MI = 1.609344

/** JavaScript Math.round: rounds half up (towards +infinity). */
fun jsRound(v: Double): Long = floor(v + 0.5).toLong()

/** engine round(v, d). */
fun round(v: Double, d: Int = 1): Double {
    var p = 1.0
    repeat(d) { p *= 10.0 }
    return jsRound(v * p) / p
}

/** A number as JavaScript prints it in a template string. */
fun jsNum(v: Double): String {
    if (v.isNaN()) return "NaN"
    if (v == floor(v) && kotlin.math.abs(v) < 1e15) return v.roundToLong().toString()
    return v.toString()
}

/** "5:12 /km" or "8:22 /mi" (whole seconds). */
fun fmtPace(secPerKm: Double?, units: String = "km"): String {
    if (secPerKm == null || !secPerKm.isFinite() || secPerKm <= 0) return "-"
    val r = jsRound(if (units == "mi") secPerKm * KM_PER_MI else secPerKm)
    return "${r / 60}:${(r % 60).toString().padStart(2, '0')} ${if (units == "mi") "/mi" else "/km"}"
}

/** "12.4 km" or "7.7 mi". */
fun fmtKm(km: Double?, units: String = "km"): String {
    if (km == null || !km.isFinite()) return "-"
    return if (units == "mi") "${jsNum(round(km / KM_PER_MI, 1))} mi" else "${jsNum(round(km, 1))} km"
}

/** "1:02:03" or "12:34". */
fun fmtTime(sec: Double?): String {
    if (sec == null || !sec.isFinite()) return "-"
    val r = jsRound(sec)
    val h = r / 3600
    val m = (r % 3600) / 60
    val s = r % 60
    return if (h > 0) "$h:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}" else "$m:${s.toString().padStart(2, '0')}"
}

/** Distance in the user's unit, as a number with 2 decimals, for the big number on the run screen. */
fun distanceNumber(km: Double, units: String): String {
    val v = if (units == "mi") km / KM_PER_MI else km
    val hundredths = floor(v * 100 + 1e-9).toLong()
    return "${hundredths / 100}.${(hundredths % 100).toString().padStart(2, '0')}"
}

/** Pace in the user's unit without the unit text: "5:12". */
fun paceNumber(secPerKm: Double?, units: String): String {
    val p = fmtPace(secPerKm, units)
    return if (p == "-") "-:--" else p.substringBefore(' ')
}
