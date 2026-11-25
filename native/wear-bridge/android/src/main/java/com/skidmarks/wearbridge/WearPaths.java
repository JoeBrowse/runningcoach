package com.skidmarks.wearbridge;

/** Data Layer paths. The watch app (wear/, SyncPaths.kt) uses the same values. */
final class WearPaths {
    static final String PLAN = "/skidmarks/plan";
    static final String RUN_PREFIX = "/skidmarks/run/";
    static final String ACK_PREFIX = "/skidmarks/ack/";
    static final String WATCH_CAPABILITY = "skid_marks_watch";
    /** A plan larger than this goes in an Asset, not in the DataItem itself (limit 100 KB). */
    static final int MAX_INLINE_BYTES = 80000;

    private WearPaths() {}
}
