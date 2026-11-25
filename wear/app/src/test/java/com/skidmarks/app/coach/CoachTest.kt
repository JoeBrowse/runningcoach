package com.skidmarks.app.coach

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/* Unit tests for the step machine, warm-up insertion, pace guidance, splits and the live coach. */
class CoachTest {
    private val intervals = Workout(
        id = "w-1", type = "intervals", intensity = "hard", title = "Intervals",
        steps = listOf(
            Step(kind = "warmup", label = "Warm up", min = 10.0, pace = 400.0),
            Step(kind = "repeat", times = 3, work = Step(label = "Hard", sec = 120.0, pace = 250.0), rest = Step(label = "Easy jog", sec = 90.0, pace = 400.0)),
            Step(kind = "cooldown", label = "Cool down", min = 5.0, pace = 400.0),
        ),
        effortText = "Hard reps.", showPace = true,
    )
    private val qualityWarmup = Warmup(
        kind = "quality", minutes = 10.0, inSteps = true,
        phases = listOf(
            WarmupPhase("mobility", "Mobility", 4.0, listOf(WarmupMove("Leg swings"), WarmupMove("Hip circles"))),
            WarmupPhase("drills", "Drills", 3.0, listOf(WarmupMove("High knees"))),
            WarmupPhase("strides", "Strides", 3.0, listOf(WarmupMove("Strides", "4 x 20 s"))),
        ),
    )
    private val easy = Workout(id = "e", type = "easy", intensity = "easy", title = "Easy run", steps = listOf(Step(kind = "steady", label = "Easy run", km = 5.0, pace = 360.0)), showPace = true)

    @Test
    fun flattenStepsGivesRepsAndClasses() {
        val segs = flattenSteps(intervals)
        assertEquals(8, segs.size)
        assertEquals(listOf("warmup", "work", "rest", "work", "rest", "work", "rest", "cooldown"), segs.map { it.role })
        assertEquals("hard", segs[1].cls)
        assertEquals("walk", segs[2].cls)
        assertEquals(600.0 + 3 * 210 + 300, totalSeconds(segs), 1e-9)
        assertEquals(By.DIST, flattenSteps(easy)[0].by)
    }

    @Test
    fun warmupPhasesGoAfterTheJogForQualityRuns() {
        val segs = buildSegments(intervals, qualityWarmup, true)
        assertEquals(listOf("warmup", "warmup-phase", "warmup-phase", "warmup-phase", "work"), segs.take(5).map { it.role })
        assertEquals(600.0, segs[1].start, 1e-9)
        assertEquals(segs.size, buildSegments(intervals, qualityWarmup, false).size + 3)
        // Off, or an easy warm-up: no phases.
        assertEquals(8, buildSegments(intervals, qualityWarmup.copy(kind = "easy"), true).size)
    }

    @Test
    fun gentleWarmupDropsTheSecondWalk() {
        val rw = Workout(
            type = "runwalk", title = "Run/walk", showPace = false,
            steps = listOf(
                Step(kind = "warmup", label = "Brisk walk", min = 5.0, pace = 660.0, walk = true),
                Step(kind = "repeat", times = 2, work = Step(label = "Run", sec = 90.0), rest = Step(label = "Walk", sec = 90.0, walk = true)),
            ),
        )
        val w = Warmup("gentle", 8.0, listOf(WarmupPhase("general", "Brisk walk", 5.0, listOf(WarmupMove("Brisk walk"))), WarmupPhase("mobility", "Easy moves", 3.0, listOf(WarmupMove("Leg swings")))))
        val segs = buildSegments(rw, w, true)
        assertEquals(listOf("Brisk walk", "Easy moves", "Run"), segs.take(3).map { it.label })
        assertTrue(segs[1].isWarmupPhase)
    }

    @Test
    fun stepMachineHandlesTimeAndDistanceSteps() {
        val segs = flattenSteps(Workout(steps = listOf(Step(kind = "steady", label = "Run", km = 1.0, pace = 300.0), Step(kind = "steady", label = "Jog", sec = 60.0))))
        var r = advanceStep(null, segs, 200.0, 0.9)
        assertFalse(r.changed)
        r = advanceStep(r.state, segs, 290.0, 1.0)
        assertTrue(r.changed)
        assertEquals(1, r.state.index)
        assertEquals(290.0, r.state.startSec, 1e-9)
        val p = stepProgress(r.state, segs, 320.0, 1.1)
        assertEquals(30.0, p.leftSec!!, 1e-9)
        r = advanceStep(r.state, segs, 350.0, 1.2)
        assertTrue(r.complete)
        // A long gap passes many time steps at once.
        val t = flattenSteps(intervals)
        val jump = advanceStep(null, t, 600.0 + 120 + 90 + 5, 3.0)
        assertEquals(3, jump.state.index)
        assertEquals(810.0, jump.state.startSec, 1e-9)
    }

    private fun seg(cls: String, pace: Double = 300.0, effort: String? = null) =
        Segment(label = "X", sec = 600.0, km = null, pace = pace, by = By.TIME, cls = cls, role = "steady", effort = effort)

    @Test
    fun paceGuidanceWaitsSettlesHoldsAndKeepsAGap() {
        val s = seg("steady")
        var g: GuideState? = null
        val texts = ArrayList<Pair<Int, String>>()
        for (t in 0..200) {
            val r = paceGuidance(g, s, 270.0, t.toDouble(), t.toDouble(), showPace = true)
            g = r.g
            r.text?.let { texts.add(t to it) }
        }
        // No cue in the first 30 s. The side starts at 30 s, the cue comes 20 s later, then every 60 s.
        assertEquals(listOf(50, 110, 170), texts.map { it.first })
        assertEquals("Slow down. Target 4:45 per kilometre to 5:15 per kilometre. You are at 4:30 per kilometre.", texts[0].second)
    }

    @Test
    fun easyStepsGetOnlySlowDown() {
        val s = seg("easy", 360.0)
        var g: GuideState? = null
        var any: String? = null
        for (t in 0..300) {
            val r = paceGuidance(g, s, 500.0, t.toDouble(), t.toDouble(), showPace = true)
            g = r.g
            if (r.text != null) any = r.text
        }
        assertNull("slow on an easy step gives no cue", any)
        g = null
        for (t in 0..300) {
            val r = paceGuidance(g, s, 300.0, t.toDouble(), t.toDouble(), showPace = false)
            g = r.g
            if (r.text != null) { any = r.text; break }
        }
        assertEquals("Slow down. Run slowly enough to talk.", any)
    }

    @Test
    fun simpleModeUsesEffortWords() {
        val s = seg("hard", 250.0, "Hard: you can say a few words only.")
        var g: GuideState? = null
        val texts = ArrayList<String>()
        for (t in 0..120) {
            val r = paceGuidance(g, s, 300.0, t.toDouble(), t.toDouble(), showPace = false)
            g = r.g
            r.text?.let { texts.add(it) }
        }
        assertEquals("Speed up a little. Hard: you can say a few words only.", texts.first())
        g = null
        texts.clear()
        for (t in 0..120) {
            val r = paceGuidance(g, s, 200.0, t.toDouble(), t.toDouble(), showPace = false)
            g = r.g
            r.text?.let { texts.add(it) }
        }
        assertEquals("Slow down a little. Keep this part controlled.", texts.first())
        // Walk steps and warm-up moves get no cue.
        assertNull(paceBand(s.copy(walk = true)))
        assertNull(paceBand(s.copy(role = Segment.ROLE_WARMUP_PHASE)))
    }

    @Test
    fun splitsAndCueText() {
        val samples = (0..1560).map { Sample(it.toDouble(), it / 300.0) }
        val sp = computeSplits(samples)
        assertEquals(6, sp.size)
        assertEquals(300.0, sp[0].sec, 1e-6)
        assertFalse(sp[4].partial)
        assertTrue(sp[5].partial)
        assertEquals(0.2, sp[5].km, 1e-6)
        assertEquals(5, sp.count { !it.partial })
        assertEquals("1 kilometre. Time 5 minutes. Last kilometre 5 minutes.", splitCueText(sp[0], "km", 300.0))
        assertEquals("2 miles. Time 16 minutes 6 seconds. Last mile 8 minutes 3 seconds.", splitCueText(Split(2, KM_PER_MI, 483.0, 300.0, false), "mi", 966.0))
        assertEquals(300.0, paceFromWindow(samples, 30.0)!!, 1e-6)
    }

    @Test
    fun liveCoachGivesStepSplitHalfwayAndCompleteCues() {
        val w = Workout(type = "tempo", intensity = "hard", title = "Tempo", showPace = true,
            steps = listOf(Step(kind = "steady", label = "Easy", sec = 300.0, pace = 360.0), Step(kind = "steady", label = "Tempo", sec = 300.0, pace = 300.0)))
        val coach = Coach(w, null, false, "km", showPace = true, voice = VoiceSettings())
        assertEquals("Easy, 5 minutes. Target 6:00 per kilometre.", coach.start().text)
        val all = ArrayList<Cue>()
        var km = 0.0
        for (t in 1..700) {
            km += if (t <= 300) 1 / 360.0 else 1 / 300.0
            all.addAll(coach.tick(1.0, km))
        }
        val kinds = all.map { it.kind }
        assertTrue(kinds.contains(CueKind.STEP))
        assertTrue(kinds.contains(CueKind.HALFWAY))
        assertTrue(kinds.contains(CueKind.SPLIT))
        assertEquals(1, kinds.count { it == CueKind.COMPLETE })
        assertEquals("Tempo, 5 minutes. Target 5:00 per kilometre.", all.first { it.kind == CueKind.STEP }.text)
        assertTrue(all.first { it.kind == CueKind.HALFWAY }.text.startsWith("Half-way. Time 5 minutes. Distance 0.8 kilometres."))
        assertEquals(COMPLETE_TEXT, all.first { it.kind == CueKind.COMPLETE }.text)
        assertTrue(coach.complete)
        assertFalse("on target: no pace cue", kinds.contains(CueKind.SLOW_DOWN) || kinds.contains(CueKind.SPEED_UP))
    }

    @Test
    fun liveCoachPaceCueAndVoiceSwitches() {
        val coach = Coach(easy, null, false, "km", showPace = true, voice = VoiceSettings(km = false))
        val all = ArrayList<Cue>()
        var km = 0.0
        for (t in 1..120) {
            km += 1 / 280.0 // too fast for an easy run at 6:00
            all.addAll(coach.tick(1.0, km))
        }
        assertEquals(CueKind.SLOW_DOWN, all.first().kind)
        assertTrue(all.none { it.kind == CueKind.SPLIT })
        val quiet = Coach(easy, null, false, "km", showPace = true, voice = VoiceSettings(pace = false))
        km = 0.0
        val none = (1..120).flatMap { km += 1 / 280.0; quiet.tick(1.0, km) }
        assertTrue(none.none { it.kind == CueKind.SLOW_DOWN })
        // Paused: no moving time, no cues.
        assertTrue(quiet.tick(0.0, km, autoPaused = true).isEmpty())
    }

    @Test
    fun stepCuesFollowTheStepVoiceSetting() {
        val coach = Coach(intervals, qualityWarmup, true, "km", showPace = true, voice = VoiceSettings(step = false))
        val cues = coach.tick(600.0, 1.5)
        val step = cues.first { it.kind == CueKind.STEP }
        assertFalse(step.speak)
        assertEquals("Mobility. 4 minutes. Leg swings, Hip circles.", step.text)
        assertTrue(coach.inWarmupPhase)
        val skip = coach.skipWarmup()!!
        assertEquals("Rep 1 of 3. Hard, 2 minutes. Target 4:10 per kilometre.", skip.text)
        assertEquals("Lap 1. 10 minutes.", coach.lap().text)
    }

    @Test
    fun freeRunStartsWithRunStarted() {
        val coach = Coach(null, null, false, "mi", showPace = false, voice = VoiceSettings())
        assertEquals(RUN_STARTED_TEXT, coach.start().text)
        var km = 0.0
        val cues = (1..600).flatMap { km += 1 / 300.0; coach.tick(1.0, km) }
        assertEquals(1, cues.count { it.kind == CueKind.SPLIT })
        assertTrue(cues.none { it.kind == CueKind.HALFWAY })
        assertTrue(cues.first { it.kind == CueKind.SPLIT }.text.startsWith("1 mile. Time 8 minutes"))
    }

    @Test
    fun formatsMatchJavaScript() {
        assertEquals("5 km", fmtKm(5.0))
        assertEquals("12.5 km", fmtKm(12.45))
        assertEquals("3.1 mi", fmtKm(5.0, "mi"))
        assertEquals("5:00 /km", fmtPace(299.6))
        assertEquals("-", fmtPace(null))
        assertEquals("1:02:03", fmtTime(3723.0))
        assertEquals("5.00", distanceNumber(5.0, "km"))
        assertEquals("2 minutes 30 seconds", sayDur(150.0))
        assertEquals("1 second", sayDur(1.0))
    }
}
