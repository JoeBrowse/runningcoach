package com.skidmarks.app.run

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.concurrent.futures.await
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.health.services.client.ExerciseClient
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseState
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.health.services.client.data.LocationAccuracy
import androidx.health.services.client.data.LocationAvailability
import androidx.health.services.client.data.LocationData
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.skidmarks.app.MainActivity
import com.skidmarks.app.R
import com.skidmarks.app.coach.By
import com.skidmarks.app.coach.Coach
import com.skidmarks.app.coach.Cue
import com.skidmarks.app.coach.CueKind
import com.skidmarks.app.coach.GpsPoint
import com.skidmarks.app.coach.PAUSED_TEXT
import com.skidmarks.app.coach.RESUMED_TEXT
import com.skidmarks.app.coach.RunDraft
import com.skidmarks.app.coach.RunRecord
import com.skidmarks.app.coach.Segment
import com.skidmarks.app.coach.TrackPoint
import com.skidmarks.app.coach.VoiceSettings
import com.skidmarks.app.coach.Workout
import com.skidmarks.app.coach.filterPoint
import com.skidmarks.app.coach.fmtKm
import com.skidmarks.app.coach.fmtTime
import com.skidmarks.app.data.PlanStore
import com.skidmarks.app.data.RunStore
import com.skidmarks.app.data.WatchSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import kotlin.math.roundToInt

/*
 * The run. A foreground service with an ongoing activity, so the run goes
 * on with the screen off or in another app. Health Services (ExerciseClient,
 * RUNNING) gives the distance, the heart rate and the GPS points. The Coach
 * (pure Kotlin, the same rules as the phone) gives the cues. Each cue shows
 * as a caption and plays as voice, or as vibration when there is no voice.
 */
class RunService : Service() {
    companion object {
        private const val TAG = "SkidMarksRun"
        const val ACTION_START = "com.skidmarks.app.action.START_RUN"
        const val EXTRA_ISO = "iso"
        const val EXTRA_WARMUP = "warmup"
        private const val CHANNEL = "run"
        private const val NOTIFICATION_ID = 7

        @Volatile
        var current: RunService? = null
            private set

        /** Starts a run. iso: the planned day, or null for a free run. */
        fun start(ctx: Context, iso: String?, useWarmup: Boolean) {
            if (current != null) return
            // The run screen shows "Starting" until the service is ready.
            RunRepository.set(RunUi(status = RunStatus.STARTING))
            val i = Intent(ctx, RunService::class.java).setAction(ACTION_START).putExtra(EXTRA_ISO, iso).putExtra(EXTRA_WARMUP, useWarmup)
            ctx.startForegroundService(i)
        }

        fun effortWord(seg: Segment): String = when {
            seg.isWarmupPhase -> "Warm-up"
            seg.walk || seg.cls == "walk" -> "Walk"
            seg.cls == "easy" -> "Easy"
            seg.cls == "steady" -> "Steady"
            seg.cls == "hard" -> "Hard"
            seg.cls == "race" -> "Race effort"
            else -> "Run"
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var coach: Coach
    private lateinit var haptics: Haptics
    private var voice: Voice? = null
    private var client: ExerciseClient? = null
    private var ticker: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var status = RunStatus.IDLE
    private var autoPaused = false
    private var workout: Workout? = null
    private var planIso: String? = null
    private var units = "km"
    private var showPace = true
    private var voiceSettings = VoiceSettings()
    private var useWarmup = false
    private var autoPauseSetting = false
    private var hsAutoPause = false
    private var lastInWarmup = false

    private var startedAtMs = 0L
    private var lastTick = 0L
    private var hasDistance = false
    private var hsKm = 0.0
    private var gpsKm = 0.0
    private var hr: Int? = null
    private val hrSamples = ArrayList<Pair<Double, Int>>()
    private val track = ArrayList<TrackPoint>()
    private var lastGood: GpsPoint? = null
    private var gps = "waiting"
    private var caption: String? = null
    private var captionAt = 0L
    private var voiceMissing = false
    private var message: String? = null
    private var notification: android.app.Notification? = null
    private var foregroundType = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_START && status == RunStatus.IDLE) {
            begin(intent.getStringExtra(EXTRA_ISO), intent.getBooleanExtra(EXTRA_WARMUP, false))
        } else if (status == RunStatus.IDLE) {
            stopSelf()
        } else {
            // A second start request while a run records: stay in the foreground, keep the run.
            notification?.let { n ->
                try {
                    ServiceCompat.startForeground(this, NOTIFICATION_ID, n, foregroundType)
                } catch (e: Exception) {
                    Log.w(TAG, "No foreground service", e)
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun begin(iso: String?, warmupOn: Boolean) {
        current = this
        status = RunStatus.STARTING
        haptics = Haptics(this)
        val plan = PlanStore.load(this)
        val settings = WatchSettings(this)
        workout = if (iso != null) PlanStore.todayRun(plan, iso) else null
        planIso = workout?.iso
        units = plan?.units ?: "km"
        voiceSettings = settings.voice(plan)
        autoPauseSetting = settings.autoPause(plan)
        val w = workout
        // Simple mode, or a workout with showPace false: effort words, not paces.
        showPace = if (w != null) !(plan?.simple ?: true) && w.showPace else true
        useWarmup = warmupOn && w?.warmup != null
        coach = Coach(w?.copy(showPace = showPace), w?.warmup, useWarmup, units, showPace, voiceSettings)
        goForeground()
        acquireWakeLock()
        voice = Voice(this) { ok ->
            scope.launch {
                if (!ok) {
                    voiceMissing = true
                    publish()
                }
            }
        }
        scope.launch { startExercise() }
        startedAtMs = System.currentTimeMillis()
        lastTick = SystemClock.elapsedRealtime()
        status = RunStatus.RUNNING
        emit(coach.start())
        lastInWarmup = coach.inWarmupPhase
        ticker = scope.launch {
            while (isActive) {
                delay(1000L - (SystemClock.elapsedRealtime() - lastTick).coerceIn(0L, 999L))
                tick()
            }
        }
        publish()
    }

    /* ---------- foreground and ongoing activity ---------- */

    private fun goForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        val ch = NotificationChannel(CHANNEL, "Run", NotificationManager.IMPORTANCE_DEFAULT).apply {
            setSound(null, null)
            enableVibration(false)
            description = "Shows that a run records."
        }
        nm.createNotificationChannel(ch)
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val nb = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_run)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(workout?.title ?: "Free run")
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setContentIntent(open)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        val ongoingStatus = Status.Builder()
            .addTemplate("#time#")
            .addPart("time", Status.StopwatchPart(SystemClock.elapsedRealtime()))
            .build()
        OngoingActivity.Builder(applicationContext, NOTIFICATION_ID, nb)
            .setStaticIcon(R.drawable.ic_stat_run)
            .setTouchIntent(open)
            .setStatus(ongoingStatus)
            .build()
            .apply(applicationContext)
        var type = 0
        if (Permissions.location(this)) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        if (Build.VERSION.SDK_INT >= 34 && (Permissions.heart(this) || Permissions.activity(this))) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
        val n = nb.build()
        notification = n
        foregroundType = type
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, n, type)
        } catch (e: Exception) {
            Log.w(TAG, "No foreground service", e)
            message = "Keep the app open. The watch does not let the run continue in the background."
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(PowerManager::class.java)
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SkidMarks:run").apply { acquire(6 * 60 * 60 * 1000L) }
        } catch (e: Exception) {
            Log.w(TAG, "No wake lock", e)
        }
    }

    /* ---------- Health Services ---------- */

    private val callback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) = onUpdate(update)
        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}
        override fun onRegistered() {}
        override fun onRegistrationFailed(throwable: Throwable) {
            Log.w(TAG, "Health Services registration failed", throwable)
        }
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {
            if (availability is LocationAvailability) {
                gps = when (availability) {
                    LocationAvailability.ACQUIRED_TETHERED, LocationAvailability.ACQUIRED_UNTETHERED -> "good"
                    LocationAvailability.ACQUIRING -> "waiting"
                    else -> "none"
                }
                publish()
            }
        }
    }

    private suspend fun startExercise() {
        try {
            val c = HealthServices.getClient(this).exerciseClient
            client = c
            val caps = c.getCapabilitiesAsync().await().getExerciseTypeCapabilities(ExerciseType.RUNNING)
            val wanted = mutableSetOf<DataType<*, *>>(DataType.DISTANCE_TOTAL)
            if (Permissions.heart(this)) wanted.add(DataType.HEART_RATE_BPM)
            if (Permissions.location(this)) wanted.add(DataType.LOCATION) else gps = "none"
            val types = wanted.filter { it in caps.supportedDataTypes }.toSet()
            hasDistance = DataType.DISTANCE_TOTAL in types
            hsAutoPause = autoPauseSetting && caps.supportsAutoPauseAndResume
            val config = ExerciseConfig.builder(ExerciseType.RUNNING)
                .setDataTypes(types)
                .setIsAutoPauseAndResumeEnabled(hsAutoPause)
                .setIsGpsEnabled(DataType.LOCATION in types)
                .build()
            c.setUpdateCallback(callback)
            c.startExerciseAsync(config).await()
            if (status == RunStatus.PAUSED) c.pauseExerciseAsync()
            if (hsAutoPause && coach.inWarmupPhase) setAutoPause(false)
        } catch (e: Exception) {
            Log.w(TAG, "Health Services did not start", e)
            message = "The watch cannot start the run sensors. The time still records."
            publish()
        }
    }

    private fun bootInstant(): Instant = Instant.ofEpochMilli(System.currentTimeMillis() - SystemClock.elapsedRealtime())

    private fun onUpdate(update: ExerciseUpdate) {
        if (status == RunStatus.ENDED) return
        val state = update.exerciseStateInfo.state
        when (state) {
            ExerciseState.AUTO_PAUSED -> autoPaused = true
            ExerciseState.ACTIVE -> autoPaused = false
            else -> {}
        }
        val m = update.latestMetrics
        m.getData(DataType.DISTANCE_TOTAL)?.let { hsKm = it.total / 1000.0 }
        for (p in m.getData(DataType.HEART_RATE_BPM)) {
            val v = p.value.roundToInt()
            if (v in 30..240) {
                hr = v
                if (status == RunStatus.RUNNING && !autoPaused) hrSamples.add(coach.elapsed to v)
            }
        }
        val boot = bootInstant()
        for (p in m.getData(DataType.LOCATION)) {
            val acc = (p.accuracy as? LocationAccuracy)?.horizontalPositionErrorMeters
            onLocation(p.value, p.getTimeInstant(boot).toEpochMilli(), acc)
        }
        publish()
    }

    private fun onLocation(loc: LocationData, t: Long, acc: Double?) {
        val ele = loc.altitude.takeIf { it.isFinite() }
        val pt = GpsPoint(loc.latitude, loc.longitude, t, acc, ele)
        val f = filterPoint(lastGood, pt)
        if (!f.ok) {
            if (f.reason == "accuracy") gps = "weak"
            return
        }
        gps = "good"
        lastGood = pt
        if (status != RunStatus.RUNNING || autoPaused) return
        if (f.reason == "move") gpsKm += f.km
        track.add(TrackPoint(t, pt.lat, pt.lon, ele))
    }

    private fun setAutoPause(on: Boolean) {
        val c = client ?: return
        try {
            c.overrideAutoPauseAndResumeForActiveExerciseAsync(on)
        } catch (e: Exception) {
            Log.w(TAG, "Auto-pause change failed", e)
        }
    }

    /* ---------- the clock and the cues ---------- */

    private fun tick() {
        val now = SystemClock.elapsedRealtime()
        val dt = ((now - lastTick) / 1000.0).coerceIn(0.0, 30.0)
        lastTick = now
        if (status != RunStatus.RUNNING) {
            publish()
            return
        }
        val km = if (hasDistance) hsKm else gpsKm
        val cues = coach.tick(if (autoPaused) 0.0 else dt, km, autoPaused)
        for (c in cues) emit(c)
        val inWarm = coach.inWarmupPhase
        if (inWarm != lastInWarmup) {
            lastInWarmup = inWarm
            // As on the phone: no auto-pause during the warm-up moves.
            if (hsAutoPause) setAutoPause(!inWarm)
        }
        publish()
    }

    private fun emit(cue: Cue) {
        caption = cue.text
        captionAt = System.currentTimeMillis()
        val v = voice
        if (cue.speak && voiceSettings.on && v != null && !v.failed) {
            v.speak(cue.text, voiceSettings.rate.toFloat())
        } else {
            haptics.forCue(cue.kind)
        }
    }

    private fun publish() {
        if (!::coach.isInitialized) return
        val seg = coach.currentSeg
        val prog = coach.progress()
        val next = coach.nextSeg
        RunRepository.set(
            RunUi(
                status = status,
                autoPaused = autoPaused,
                title = workout?.title ?: "Free run",
                units = units,
                showPace = showPace,
                elapsed = coach.elapsed,
                km = coach.km,
                pace = coach.pace,
                avgPace = coach.avgPace,
                hr = hr,
                hasWorkout = coach.segs.isNotEmpty(),
                stepLabel = seg?.let { if (it.reps != null && it.role == "work") "${it.label} ${it.rep}/${it.reps}" else it.label },
                stepLeft = seg?.let { if (prog.leftKm != null) "${fmtKm(prog.leftKm, units)} left" else "${fmtTime(prog.leftSec)} left" },
                stepFraction = prog.fraction.toFloat(),
                effortWord = seg?.let { effortWord(it) },
                nextLabel = when {
                    next != null -> "Next: ${next.label} ${if (next.by == By.DIST) fmtKm(next.km, units) else fmtTime(next.sec)}"
                    seg != null -> "Next: finish"
                    else -> null
                },
                inWarmup = coach.inWarmupPhase,
                complete = coach.complete,
                caption = caption,
                captionAt = captionAt,
                gps = gps,
                voiceMissing = voiceMissing,
                message = message,
            )
        )
    }

    /* ---------- controls ---------- */

    fun pause() {
        if (status != RunStatus.RUNNING) return
        status = RunStatus.PAUSED
        client?.pauseExerciseAsync()
        emit(Cue(PAUSED_TEXT, CueKind.PAUSE))
        publish()
    }

    fun resume() {
        if (status != RunStatus.PAUSED) return
        status = RunStatus.RUNNING
        lastTick = SystemClock.elapsedRealtime()
        client?.resumeExerciseAsync()
        emit(Cue(RESUMED_TEXT, CueKind.RESUME))
        publish()
    }

    fun lap() {
        if (status != RunStatus.RUNNING && status != RunStatus.PAUSED) return
        client?.markLapAsync()
        emit(coach.lap())
        publish()
    }

    fun skipStep() {
        coach.skipStep()?.let { emit(it) }
        publish()
    }

    fun skipWarmup() {
        coach.skipWarmup()?.let { emit(it) }
        publish()
    }

    /** Ends the run. The draft waits for the summary screen. */
    fun end() {
        if (status == RunStatus.ENDED || status == RunStatus.IDLE) return
        status = RunStatus.ENDED
        ticker?.cancel()
        val c = client
        if (c != null) {
            scope.launch {
                try {
                    c.endExerciseAsync().await()
                } catch (e: Exception) {
                    Log.w(TAG, "End failed", e)
                }
                try {
                    c.clearUpdateCallbackAsync(callback)
                } catch (e: Exception) {
                    // ignore
                }
            }
        }
        val draft = RunDraft(
            id = RunRecord.newId(startedAtMs),
            startedAtMs = startedAtMs,
            durationSec = coach.elapsed,
            km = coach.km,
            units = units,
            splits = coach.splits(),
            laps = coach.laps.toList(),
            hr = hrSamples.toList(),
            track = track.toList(),
            workout = workout,
            planIso = planIso,
            warmupMin = if (useWarmup && workout?.warmup?.kind != "easy") workout?.warmup?.minutes ?: 0.0 else 0.0,
        )
        RunStore.saveDraft(this, RunRecord.toJson(draft))
        voice?.stop()
        publish()
        scope.launch {
            delay(1500)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    override fun onDestroy() {
        if (status != RunStatus.ENDED && status != RunStatus.IDLE) end()
        voice?.shutdown()
        voice = null
        try {
            wakeLock?.let { if (it.isHeld) it.release() }
        } catch (e: Exception) {
            // ignore
        }
        if (current === this) current = null
        RunRepository.reset()
        scope.cancel()
        super.onDestroy()
    }
}
