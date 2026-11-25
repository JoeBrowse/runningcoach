package com.skidmarks.app.coach

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/*
 * Checks the Kotlin port against the phone code. test/wear.test.mjs
 * writes src/test/resources/parity.json from the real JS functions
 * (buildSegments, segmentCueTexts, paceGuidance, computeSplits, ...).
 */
class ParityTest {
    private val fixture: JSONObject by lazy {
        val text = javaClass.classLoader!!.getResource("parity.json")!!.readText()
        JSONObject(text)
    }

    private val workouts: List<Workout> by lazy { fixture.getJSONArray("workouts").objects().map { PlanJson.workout(it) } }

    private fun near(msg: String, expected: Double?, actual: Double?) {
        if (expected == null || actual == null) {
            assertEquals(msg, expected, actual)
            return
        }
        assertTrue("$msg: expected $expected, got $actual", abs(expected - actual) < 1e-6)
    }

    private fun JSONObject.optNum(key: String): Double? = num(key)
    private fun JSONObject.optIntOrNull(key: String): Int? = num(key)?.toInt()

    @Test
    fun segmentsAndCueTextsMatchThePhone() {
        val cases = fixture.getJSONArray("cases").objects()
        assertTrue("cases: ${cases.size}", cases.size >= 50)
        for (c in cases) {
            val day = workouts[c.getInt("w")]
            val name = "${c.getString("name")} ${c.getString("units")} warmup=${c.getBoolean("useWarmup")} simple=${c.getBoolean("simple")}"
            val voiceWorkout = day.copy(showPace = c.getBoolean("showPace"))
            val useWarmup = c.getBoolean("useWarmup")
            val segs = buildSegments(voiceWorkout, day.warmup, useWarmup)
            val expected = c.getJSONArray("segments").objects()
            assertEquals("$name: segment count", expected.size, segs.size)
            expected.forEachIndexed { i, e ->
                val s = segs[i]
                val at = "$name seg $i"
                assertEquals("$at label", e.getString("label"), s.label)
                near("$at sec", e.optNum("sec"), s.sec)
                assertEquals("$at by", e.getString("by"), if (s.by == By.DIST) "dist" else "time")
                near("$at km", e.optNum("km"), s.km)
                near("$at pace", e.optNum("pace"), s.pace)
                assertEquals("$at cls", e.getString("cls"), s.cls)
                assertEquals("$at role", e.getString("role"), s.role)
                assertEquals("$at rep", e.optIntOrNull("rep"), s.rep)
                assertEquals("$at reps", e.optIntOrNull("reps"), s.reps)
                near("$at start", e.optNum("start"), s.start)
                near("$at end", e.optNum("end"), s.end)
                assertEquals("$at walk", e.getBoolean("walk"), s.walk)
            }
            val texts = segmentCueTexts(voiceWorkout, segs, c.getString("units"), if (useWarmup) day.warmup else null)
            val expTexts = c.getJSONArray("cueTexts")
            assertEquals("$name: cue count", expTexts.length(), texts.size)
            for (i in texts.indices) assertEquals("$name cue $i", expTexts.getString(i), texts[i])
        }
    }

    @Test
    fun paceGuidanceMatchesThePhone() {
        val runs = fixture.getJSONArray("guidance").objects()
        assertTrue(runs.size >= 8)
        for (g in runs) {
            val day = workouts[g.getInt("w")]
            val showPace = g.getBoolean("showPace")
            val units = g.getString("units")
            val segs = buildSegments(day.copy(showPace = true), null, false)
            val seg = segs[g.getInt("segIndex")]
            val band = paceBand(seg)!!
            var state: GuideState? = null
            val got = ArrayList<Pair<Int, String>>()
            for (t in 0..420) {
                val pace: Double? = when {
                    t < 150 -> band.lo * 0.9
                    t < 200 -> (band.lo + band.hi) / 2
                    t < 230 -> null
                    else -> band.hi * 1.12
                }
                val r = paceGuidance(state, seg, pace, t.toDouble(), t + 1000.0, showPace, units)
                state = r.g
                if (r.text != null) got.add(t to r.text!!)
            }
            val exp = g.getJSONArray("texts").objects().map { it.getInt("t") to it.getString("text") }
            assertEquals("guidance for ${day.title} seg ${g.getInt("segIndex")} showPace=$showPace $units", exp, got)
        }
    }

    @Test
    fun splitsPaceAndFormatsMatchThePhone() {
        val samples = fixture.getJSONArray("samples").objects().map { Sample(it.getDouble("t"), it.getDouble("km")) }
        for (units in listOf("km", "mi")) {
            val unitKm = if (units == "mi") KM_PER_MI else 1.0
            val exp = fixture.getJSONObject("splits").getJSONObject(units)
            val got = computeSplits(samples, unitKm)
            val expSplits = exp.getJSONArray("splits").objects()
            assertEquals("$units split count", expSplits.size, got.size)
            expSplits.forEachIndexed { i, e ->
                assertEquals(e.getInt("n"), got[i].n)
                near("$units split $i km", e.getDouble("km"), got[i].km)
                near("$units split $i sec", e.getDouble("sec"), got[i].sec)
                assertEquals(e.getBoolean("partial"), got[i].partial)
            }
            val cues = exp.getJSONArray("cues")
            val full = got.filter { !it.partial }
            for (i in 0 until cues.length()) assertEquals(cues.getString(i), splitCueText(full[i], units, full[i].n * 400 + 7.4))
        }
        for (p in fixture.getJSONArray("paces").objects()) {
            val n = p.getInt("n")
            near("pace at $n", p.num("pace"), paceFromWindow(samples.subList(0, minOf(samples.size, n + 1)), 30.0))
        }
        for (f in fixture.getJSONArray("formats").objects()) {
            assertEquals(f.getString("fmtKm"), fmtKm(f.getDouble("km"), "km"))
            assertEquals(f.getString("fmtMi"), fmtKm(f.getDouble("km"), "mi"))
        }
        for (f in fixture.getJSONArray("paceFormats").objects()) {
            assertEquals(f.getString("km"), fmtPace(f.getDouble("pace"), "km"))
            assertEquals(f.getString("mi"), fmtPace(f.getDouble("pace"), "mi"))
        }
    }

    @Suppress("unused")
    private fun JSONArray.size() = length()
}
