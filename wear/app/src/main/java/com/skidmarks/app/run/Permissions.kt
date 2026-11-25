package com.skidmarks.app.run

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/** Runtime permissions for a run. */
object Permissions {
    /** Wear OS 6 (API 36) reads the heart rate with a health permission. Older versions use BODY_SENSORS. */
    const val READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"

    val heartRate: String get() = if (Build.VERSION.SDK_INT >= 36) READ_HEART_RATE else Manifest.permission.BODY_SENSORS

    fun forRun(): Array<String> = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        add(heartRate)
        add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
    }.toTypedArray()

    fun granted(ctx: Context, p: String) = ContextCompat.checkSelfPermission(ctx, p) == PackageManager.PERMISSION_GRANTED

    fun missing(ctx: Context): List<String> = forRun().filter { !granted(ctx, it) }

    fun location(ctx: Context) = granted(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
    fun heart(ctx: Context) = granted(ctx, heartRate)
    fun activity(ctx: Context) = granted(ctx, Manifest.permission.ACTIVITY_RECOGNITION)
}
