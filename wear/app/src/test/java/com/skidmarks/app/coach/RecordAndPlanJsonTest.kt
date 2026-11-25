package com.skidmarks.app.coach

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RecordAndPlanJsonTest {
    @Test
    fun parsesThePhonePlan() {
        val json = """
            {"v":1,"updatedAt":"2026-11-25T08:00:00.000Z","today":"2026-11-25","units":"mi","simple":false,"autoPause":false,
             "voice":{"on":true,"rate":1.2,"km":false,"step":true,"half":true,"pace":false},"goalName":"10K",
             "days":[{"id":"w-2026-11-25","iso":"2026-11-25","type":"intervals","intensity":"hard","title":"Intervals","km":8.2,"min":48,
               "steps":[{"kind":"warmup","label":"Warm up","min":10,"pace":400},
                        {"kind":"repeat","times":5,"work":{"label":"Hard","sec":180,"pace":250},"rest":{"label":"Easy jog","sec":120,"pace":400}},
                        {"kind":"cooldown","label":"Cool down","min":10,"pace":400}],
               "effortText":"Hard reps.","showPace":true,"custom":false,"done":false,
               "warmup":{"kind":"quality","minutes":10,"inSteps":true,"notes":["Do these after the easy jog."],
                 "phases":[{"id":"mobility","title":"Mobility","min":4,"items":[{"name":"Leg swings","dose":"10 each way, each leg"}]}]}}]}
        """.trimIndent()
        val plan = PlanJson.parse(json)
        assertEquals("mi", plan.units)
        assertFalse(plan.simple)
        assertFalse(plan.autoPause)
        assertEquals(1.2, plan.voice.rate, 1e-9)
        assertFalse(plan.voice.km)
        assertFalse(plan.voice.pace)
        val d = plan.days.single()
        assertEquals("2026-11-25", d.iso)
        assertEquals(3, d.steps.size)
        assertEquals(5, d.steps[1].times)
        assertEquals(180.0, d.steps[1].work!!.sec!!, 1e-9)
        assertTrue(d.warmup!!.inSteps)
        assertEquals("Leg swings", d.warmup!!.phases[0].items[0].name)
        assertEquals(12, flattenSteps(d).size)
    }

    @Test
    fun badPlanFieldsGetDefaults() {
        val plan = PlanJson.parse("""{"units":5,"days":[{"title":null,"steps":"x","showPace":"no"}, 7]}""")
        assertEquals("km", plan.units)
        assertTrue(plan.simple)
        assertEquals(1, plan.days.size)
        assertEquals("Run", plan.days[0].title)
        assertTrue(plan.days[0].steps.isEmpty())
    }

    @Test
    fun runJsonHasTheStoreFields() {
        val start = 1764057600000L
        val track = (0..600).map { TrackPoint(start + it * 1000L, 51.5 + it * 0.00003, -0.12, 20.04) }
        val hr = (0..600).map { it.toDouble() to (120 + it / 20) }
        val draft = RunDraft(
            id = RunRecord.newId(start, kotlin.random.Random(1)), startedAtMs = start, durationSec = 600.4, km = 2.0004, units = "km",
            splits = listOf(Split(1, 1.0, 300.0, 300.0, false), Split(2, 1.0, 300.4, 300.4, false)),
            laps = listOf(Lap(1, 300.0, 1.0, 300.0, 1.0)), hr = hr, track = track,
            workout = Workout(id = "w-2026-11-25", type = "easy", title = "Easy run"), planIso = "2026-11-25", warmupMin = 0.0,
        )
        val o = RunRecord.toJson(draft, 4)
        assertTrue(o.getString("id").startsWith("watch-1764057600000-"))
        assertEquals("2025-11-25T08:00:00Z", o.getString("startedAt"))
        assertEquals(600, o.getInt("durationSec"))
        assertEquals(10, o.getInt("minutes"))
        assertEquals(2.0, o.getDouble("km"), 1e-9)
        assertEquals(4, o.getInt("rpe"))
        assertEquals(135, o.getInt("avgHR"))
        assertEquals(150, o.getInt("maxHR"))
        assertEquals(121, o.getJSONArray("hrSeries").length())
        val t = o.getJSONArray("track")
        assertTrue("track is thinned: ${t.length()}", t.length() in 100..250)
        assertEquals(20.0, t.getJSONObject(0).getDouble("ele"), 1e-9)
        assertEquals("watch", o.getString("source"))
        assertEquals("2026-11-25", o.getString("planIso"))
        assertEquals("w-2026-11-25", o.getString("workoutId"))
        assertEquals(2, o.getJSONArray("splits").length())
        assertTrue(RunRecord.toJson(draft).isNull("rpe"))
        // A run with no heart rate has no HR fields.
        val noHr = RunRecord.toJson(draft.copy(hr = emptyList()))
        assertFalse(noHr.has("avgHR"))
        JSONObject(o.toString()) // valid JSON
    }
}
