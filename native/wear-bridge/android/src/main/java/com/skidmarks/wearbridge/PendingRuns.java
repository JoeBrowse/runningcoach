package com.skidmarks.wearbridge;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The queue of runs that came from the watch and that the JS code did not save yet.
 * It is kept in SharedPreferences, so it stays when the app is closed.
 * Stored value: a JSON object { runId: runJsonString }.
 */
final class PendingRuns {
    private static final String PREFS = "skidmarks_wear_bridge";
    private static final String KEY = "pending_runs";

    private PendingRuns() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONObject read(Context c) {
        String raw = prefs(c).getString(KEY, null);
        if (raw == null) return new JSONObject();
        try {
            return new JSONObject(raw);
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    static synchronized void put(Context c, String id, String json) {
        JSONObject all = read(c);
        try {
            all.put(id, json);
        } catch (JSONException e) {
            return;
        }
        prefs(c).edit().putString(KEY, all.toString()).apply();
    }

    static synchronized List<String> all(Context c) {
        JSONObject all = read(c);
        List<String> out = new ArrayList<>();
        Iterator<String> keys = all.keys();
        while (keys.hasNext()) {
            String v = all.optString(keys.next(), null);
            if (v != null) out.add(v);
        }
        return out;
    }

    static synchronized void remove(Context c, String id) {
        JSONObject all = read(c);
        all.remove(id);
        prefs(c).edit().putString(KEY, all.toString()).apply();
    }
}
