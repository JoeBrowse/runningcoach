package com.skidmarks.app.data

import android.content.Context
import com.skidmarks.app.coach.VoiceSettings
import com.skidmarks.app.coach.WatchPlan

/*
 * Settings on the watch. The phone sends its voice settings with the plan.
 * A setting that the runner changes on the watch wins over the phone value.
 */
class WatchSettings(ctx: Context) {
    private val p = ctx.applicationContext.getSharedPreferences("watch_settings", Context.MODE_PRIVATE)

    private fun bool(key: String, fallback: Boolean) = if (p.contains(key)) p.getBoolean(key, fallback) else fallback

    fun voice(plan: WatchPlan?): VoiceSettings {
        val base = plan?.voice ?: VoiceSettings()
        return base.copy(on = bool(VOICE, base.on), pace = bool(PACE, base.pace), km = bool(SPLITS, base.km))
    }

    /** Auto-pause only when the runner turned it on (on the phone or here). */
    fun autoPause(plan: WatchPlan?): Boolean = bool(AUTO_PAUSE, plan?.autoPause ?: false)

    fun set(key: String, value: Boolean) {
        p.edit().putBoolean(key, value).apply()
        Signals.changed()
    }

    var useWarmup: Boolean
        get() = bool(WARMUP, true)
        set(v) = p.edit().putBoolean(WARMUP, v).apply()

    var noVoiceNoticeShown: Boolean
        get() = bool(NO_VOICE_SEEN, false)
        set(v) = p.edit().putBoolean(NO_VOICE_SEEN, v).apply()

    companion object {
        const val VOICE = "voice_on"
        const val PACE = "pace_guidance"
        const val SPLITS = "splits"
        const val AUTO_PAUSE = "auto_pause"
        private const val WARMUP = "use_warmup"
        private const val NO_VOICE_SEEN = "no_voice_notice_seen"
    }
}
