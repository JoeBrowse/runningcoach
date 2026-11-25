package com.skidmarks.app.sync

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Asset
import com.google.android.gms.wearable.DataMap
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.skidmarks.app.data.PlanStore
import com.skidmarks.app.data.RunStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.concurrent.TimeUnit

/*
 * The watch side of the Data Layer link.
 * - A finished run goes to the DataItem /skidmarks/run/<id> (urgent), as an Asset.
 *   It stays unsynced until the phone deletes the DataItem or sends /skidmarks/ack/<id>.
 * - The plan comes from the DataItem /skidmarks/plan (see WearListener).
 */
object WearSync {
    private const val TAG = "SkidMarksSync"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    suspend fun sendRun(ctx: Context, id: String, json: String): Boolean = try {
        val req = PutDataMapRequest.create(SyncPaths.runPath(id))
        req.dataMap.putString("id", id)
        req.dataMap.putAsset("run", Asset.createFromBytes(json.toByteArray(Charsets.UTF_8)))
        Wearable.getDataClient(ctx).putDataItem(req.asPutDataRequest().setUrgent()).await()
        true
    } catch (e: Exception) {
        Log.w(TAG, "The run was not sent", e)
        false
    }

    /** Sends each run that the phone did not confirm. The same DataItem again is not a second run. */
    fun resendUnsynced(ctx: Context) {
        val app = ctx.applicationContext
        scope.launch {
            for (run in RunStore.unsynced(app)) sendRun(app, run.getString("id"), run.toString())
        }
    }

    fun sendRunLater(ctx: Context, id: String, json: String) {
        val app = ctx.applicationContext
        scope.launch { sendRun(app, id, json) }
    }

    /** The phone confirmed the run: mark it and remove the DataItem. */
    fun onAck(ctx: Context, id: String) {
        RunStore.markSynced(ctx, id)
        val app = ctx.applicationContext
        scope.launch {
            try {
                Wearable.getDataClient(app).deleteDataItems(Uri.Builder().scheme("wear").path(SyncPaths.runPath(id)).build()).await()
            } catch (e: Exception) {
                Log.w(TAG, "The run DataItem was not deleted", e)
            }
        }
    }

    /** Reads the plan DataItem that is already on the watch (for example after an update). */
    fun refreshPlan(ctx: Context) {
        val app = ctx.applicationContext
        scope.launch {
            try {
                val uri = Uri.Builder().scheme("wear").path(SyncPaths.PLAN).build()
                val buffer = Wearable.getDataClient(app).getDataItems(uri).await()
                try {
                    val newest = buffer.map { DataMapItem.fromDataItem(it).dataMap }.maxByOrNull { it.getLong("sentAt", 0L) }
                    val json = newest?.let { planJson(app, it) }
                    if (json != null && json.isNotEmpty()) PlanStore.save(app, json)
                } finally {
                    buffer.release()
                }
            } catch (e: Exception) {
                Log.w(TAG, "The plan was not read", e)
            }
        }
    }

    /** The plan JSON from a plan DataMap (a string, or an Asset for a large plan). Blocks: call it off the main thread. */
    fun planJson(ctx: Context, map: DataMap): String? {
        map.getString("json")?.let { return it }
        val asset = map.getAsset("plan") ?: return null
        return try {
            val res = Tasks.await(Wearable.getDataClient(ctx).getFdForAsset(asset), 30, TimeUnit.SECONDS)
            res.inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
        } catch (e: Exception) {
            Log.w(TAG, "The plan asset was not read", e)
            null
        }
    }
}
