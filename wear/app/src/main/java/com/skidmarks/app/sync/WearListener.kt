package com.skidmarks.app.sync

import android.util.Log
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.skidmarks.app.data.PlanStore
import com.skidmarks.app.data.RunStore

/*
 * Android starts this service when the phone changes the plan, deletes a
 * run DataItem or sends a receipt. It works while the app is closed.
 */
class WearListener : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            val path = event.dataItem.uri.path ?: continue
            when {
                path == SyncPaths.PLAN && event.type == DataEvent.TYPE_CHANGED -> {
                    val map = DataMapItem.fromDataItem(event.dataItem).dataMap
                    val json = WearSync.planJson(this, map) ?: continue
                    try {
                        PlanStore.save(this, json)
                    } catch (e: Exception) {
                        Log.w("SkidMarksSync", "The plan from the phone is not valid", e)
                    }
                }
                path.startsWith(SyncPaths.RUN_PREFIX) && event.type == DataEvent.TYPE_DELETED -> {
                    // The phone saved the run and deleted the DataItem.
                    RunStore.markSynced(this, path.removePrefix(SyncPaths.RUN_PREFIX))
                }
            }
        }
    }

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path.startsWith(SyncPaths.ACK_PREFIX)) {
            WearSync.onAck(this, event.path.removePrefix(SyncPaths.ACK_PREFIX))
        }
    }
}
