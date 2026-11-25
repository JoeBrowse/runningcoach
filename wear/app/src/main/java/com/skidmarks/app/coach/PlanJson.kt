package com.skidmarks.app.coach

import org.json.JSONArray
import org.json.JSONObject

/*
 * Reads the plan JSON that the phone sends (src/shared/wear.js buildWatchPlan).
 * Unknown fields are ignored. A field with a wrong type gets its default.
 */
object PlanJson {
    fun parse(json: String): WatchPlan = parse(JSONObject(json))

    fun parse(o: JSONObject): WatchPlan = WatchPlan(
        updatedAt = o.str("updatedAt"),
        units = if (o.str("units") == "mi") "mi" else "km",
        simple = o.optBoolean("simple", true),
        autoPause = o.optBoolean("autoPause", true),
        voice = voice(o.optJSONObject("voice")),
        days = o.optJSONArray("days").objects().map { workout(it) },
    )

    fun voice(o: JSONObject?): VoiceSettings {
        if (o == null) return VoiceSettings()
        return VoiceSettings(
            on = o.optBoolean("on", true),
            rate = o.num("rate")?.takeIf { it > 0 } ?: 1.0,
            km = o.optBoolean("km", true),
            step = o.optBoolean("step", true),
            half = o.optBoolean("half", true),
            pace = o.optBoolean("pace", true),
        )
    }

    fun workout(o: JSONObject): Workout = Workout(
        id = o.str("id"),
        iso = o.str("iso"),
        type = o.str("type"),
        intensity = o.str("intensity"),
        title = o.str("title") ?: "Run",
        km = o.num("km"),
        min = o.num("min"),
        steps = o.optJSONArray("steps").objects().map { step(it) },
        effortText = o.str("effortText"),
        showPace = o.optBoolean("showPace", true),
        custom = o.optBoolean("custom", false),
        done = o.optBoolean("done", false),
        warmup = o.optJSONObject("warmup")?.let { warmup(it) },
    )

    fun step(o: JSONObject): Step = Step(
        kind = o.str("kind"),
        label = o.str("label"),
        min = o.num("min"),
        sec = o.num("sec"),
        km = o.num("km"),
        pace = o.num("pace"),
        estPace = o.num("estPace"),
        paceLo = o.num("paceLo"),
        paceHi = o.num("paceHi"),
        effort = o.str("effort"),
        walk = o.optBoolean("walk", false),
        cls = o.str("cls"),
        times = o.num("times")?.toInt() ?: 0,
        work = o.optJSONObject("work")?.let { step(it) },
        rest = o.optJSONObject("rest")?.let { step(it) },
    )

    fun warmup(o: JSONObject): Warmup = Warmup(
        kind = o.str("kind") ?: "easy",
        minutes = o.num("minutes") ?: 0.0,
        inSteps = o.optBoolean("inSteps", false),
        notes = o.optJSONArray("notes").strings(),
        phases = o.optJSONArray("phases").objects().map { p ->
            WarmupPhase(
                id = p.str("id") ?: "",
                title = p.str("title") ?: "",
                min = p.num("min") ?: 0.0,
                items = p.optJSONArray("items").objects().map { WarmupMove(it.str("name") ?: "", it.str("dose")) },
            )
        },
    )
}

/** A string field, or null when it is missing, null or not a string. */
internal fun JSONObject.str(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = opt(key)
    return v as? String
}

/** A number field, or null when it is missing, null or not a number. */
internal fun JSONObject.num(key: String): Double? {
    if (!has(key) || isNull(key)) return null
    val v = opt(key)
    return when (v) {
        is Number -> v.toDouble().takeIf { it.isFinite() }
        else -> null
    }
}

internal fun JSONArray?.objects(): List<JSONObject> {
    if (this == null) return emptyList()
    val out = ArrayList<JSONObject>()
    for (i in 0 until length()) optJSONObject(i)?.let { out.add(it) }
    return out
}

internal fun JSONArray?.strings(): List<String> {
    if (this == null) return emptyList()
    val out = ArrayList<String>()
    for (i in 0 until length()) (opt(i) as? String)?.let { out.add(it) }
    return out
}
