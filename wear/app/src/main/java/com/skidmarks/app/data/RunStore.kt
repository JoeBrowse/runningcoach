package com.skidmarks.app.data

import android.content.Context
import org.json.JSONObject
import java.io.File

/*
 * Finished runs on the watch. Each run is a JSON file in files/runs.
 * A run stays "unsynced" until the phone sends a receipt. Old synced runs
 * are removed (the newest MAX_SYNCED stay).
 * The run that waits for the summary screen (not saved yet) is the draft.
 */
object RunStore {
    private const val PREFS = "runs"
    private const val KEY_SYNCED = "synced_ids"
    private const val MAX_SYNCED = 20

    private fun dir(ctx: Context) = File(ctx.filesDir, "runs").apply { mkdirs() }
    private fun draftFile(ctx: Context) = File(ctx.filesDir, "draft.json")
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun safeId(id: String) = id.replace(Regex("[^A-Za-z0-9_-]"), "_")

    @Synchronized
    fun save(ctx: Context, run: JSONObject) {
        val id = run.getString("id")
        val tmp = File(dir(ctx), "${safeId(id)}.tmp")
        tmp.writeText(run.toString())
        tmp.renameTo(File(dir(ctx), "${safeId(id)}.json"))
        Signals.changed()
    }

    @Synchronized
    fun all(ctx: Context): List<JSONObject> = dir(ctx).listFiles { f -> f.name.endsWith(".json") }
        ?.mapNotNull { f -> try { JSONObject(f.readText()) } catch (e: Exception) { null } }
        ?.sortedBy { it.optString("startedAt") }
        ?: emptyList()

    fun syncedIds(ctx: Context): Set<String> = prefs(ctx).getStringSet(KEY_SYNCED, emptySet()) ?: emptySet()

    fun isSynced(ctx: Context, id: String) = syncedIds(ctx).contains(id)

    fun unsynced(ctx: Context): List<JSONObject> {
        val done = syncedIds(ctx)
        return all(ctx).filter { !done.contains(it.optString("id")) }
    }

    @Synchronized
    fun markSynced(ctx: Context, id: String) {
        if (!File(dir(ctx), "${safeId(id)}.json").exists()) return
        val set = syncedIds(ctx).toMutableSet()
        if (!set.add(id)) return
        prefs(ctx).edit().putStringSet(KEY_SYNCED, set).apply()
        prune(ctx, set)
        Signals.changed()
    }

    private fun prune(ctx: Context, synced: Set<String>) {
        val old = all(ctx).filter { synced.contains(it.optString("id")) }.dropLast(MAX_SYNCED)
        if (old.isEmpty()) return
        for (r in old) File(dir(ctx), "${safeId(r.optString("id"))}.json").delete()
        val keep = synced - old.map { it.optString("id") }.toSet()
        prefs(ctx).edit().putStringSet(KEY_SYNCED, keep).apply()
    }

    @Synchronized
    fun saveDraft(ctx: Context, run: JSONObject) {
        draftFile(ctx).writeText(run.toString())
        Signals.changed()
    }

    @Synchronized
    fun loadDraft(ctx: Context): JSONObject? {
        val f = draftFile(ctx)
        if (!f.exists()) return null
        return try { JSONObject(f.readText()) } catch (e: Exception) { null }
    }

    @Synchronized
    fun clearDraft(ctx: Context) {
        draftFile(ctx).delete()
        Signals.changed()
    }
}
