package com.skidmarks.app.sync

/** Data Layer paths. The phone plugin (native/wear-bridge, WearPaths.java) uses the same values. */
object SyncPaths {
    const val PLAN = "/skidmarks/plan"
    const val RUN_PREFIX = "/skidmarks/run/"
    const val ACK_PREFIX = "/skidmarks/ack/"
    const val WATCH_CAPABILITY = "skid_marks_watch"

    fun runPath(id: String) = RUN_PREFIX + id
}
