package com.skidmarks.app.data

import android.content.Context
import com.skidmarks.app.coach.PlanJson
import com.skidmarks.app.coach.WatchPlan
import com.skidmarks.app.coach.Workout
import java.io.File
import java.time.LocalDate

/** The last plan from the phone, kept in a file so it works with no phone near. */
object PlanStore {
    private fun file(ctx: Context) = File(ctx.filesDir, "plan.json")

    @Synchronized
    fun save(ctx: Context, json: String) {
        // Only valid JSON replaces the old plan.
        PlanJson.parse(json)
        val tmp = File(ctx.filesDir, "plan.json.tmp")
        tmp.writeText(json)
        tmp.renameTo(file(ctx))
        Signals.changed()
    }

    @Synchronized
    fun load(ctx: Context): WatchPlan? {
        val f = file(ctx)
        if (!f.exists()) return null
        return try {
            PlanJson.parse(f.readText())
        } catch (e: Exception) {
            null
        }
    }

    /** When the watch got the plan (ms), or 0. */
    fun receivedAt(ctx: Context): Long = file(ctx).let { if (it.exists()) it.lastModified() else 0L }

    fun today(): String = LocalDate.now().toString()

    /** Today's planned run, or null. */
    fun todayRun(plan: WatchPlan?, iso: String = today()): Workout? = plan?.days?.firstOrNull { it.iso == iso }

    /** The next planned run after today, or null. */
    fun nextRun(plan: WatchPlan?, iso: String = today()): Workout? = plan?.days?.filter { (it.iso ?: "") > iso }?.minByOrNull { it.iso ?: "" }
}
