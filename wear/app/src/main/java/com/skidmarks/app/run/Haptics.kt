package com.skidmarks.app.run

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.skidmarks.app.coach.CueKind

/*
 * Vibration patterns, for a watch with no voice or with the voice off:
 * short = step change, double = speed up, long = slow down.
 */
class Haptics(context: Context) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Vibrator::class.java)
    }

    fun forCue(kind: CueKind) {
        val pattern = when (kind) {
            CueKind.SPEED_UP -> longArrayOf(0, 150, 150, 150)
            CueKind.SLOW_DOWN -> longArrayOf(0, 700)
            CueKind.COMPLETE -> longArrayOf(0, 150, 120, 150, 120, 150)
            CueKind.PAUSE, CueKind.RESUME, CueKind.INFO -> return
            else -> longArrayOf(0, 150)
        }
        try {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } catch (e: Exception) {
            // No vibrator: the caption still shows.
        }
    }
}
