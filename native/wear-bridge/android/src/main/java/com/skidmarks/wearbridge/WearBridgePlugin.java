package com.skidmarks.wearbridge;

import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.Asset;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;

/**
 * WearBridge: the phone side of the Skid Marks watch link.
 * See index.js for the JS methods. All calls fail softly: a phone with no
 * Google Play services or no watch gets "connected: false", not a crash.
 */
@CapacitorPlugin(name = "WearBridge")
public class WearBridgePlugin extends Plugin {
    private static WeakReference<WearBridgePlugin> current = new WeakReference<>(null);

    @Override
    public void load() {
        current = new WeakReference<>(this);
    }

    /** Called by WearRunListenerService when a run comes from the watch. */
    static void notifyRunReceived(String id) {
        WearBridgePlugin p = current.get();
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("id", id);
        p.notifyListeners("runReceived", data, true);
    }

    @PluginMethod
    public void sendPlan(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("The plan JSON is missing.");
            return;
        }
        try {
            PutDataMapRequest req = PutDataMapRequest.create(WearPaths.PLAN);
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > WearPaths.MAX_INLINE_BYTES) {
                req.getDataMap().putAsset("plan", Asset.createFromBytes(bytes));
            } else {
                req.getDataMap().putString("json", json);
            }
            req.getDataMap().putLong("sentAt", System.currentTimeMillis());
            PutDataRequest put = req.asPutDataRequest().setUrgent();
            Wearable.getDataClient(getContext())
                .putDataItem(put)
                .addOnSuccessListener(item -> {
                    JSObject ret = new JSObject();
                    ret.put("sent", true);
                    ret.put("bytes", bytes.length);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("The plan was not sent: " + e.getMessage()));
        } catch (Exception e) {
            call.reject("The plan was not sent: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPendingRuns(PluginCall call) {
        JSArray runs = new JSArray();
        for (String json : PendingRuns.all(getContext())) {
            try {
                runs.put(new JSObject(json));
            } catch (JSONException e) {
                // A run that is not valid JSON is skipped.
            }
        }
        JSObject ret = new JSObject();
        ret.put("runs", runs);
        call.resolve(ret);
    }

    @PluginMethod
    public void ackRun(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("The run id is missing.");
            return;
        }
        PendingRuns.remove(getContext(), id);
        try {
            // The watch sees the deleted DataItem, or gets the message, and marks the run as synced.
            Uri uri = new Uri.Builder().scheme("wear").path(WearPaths.RUN_PREFIX + id).build();
            Wearable.getDataClient(getContext()).deleteDataItems(uri);
            Wearable.getNodeClient(getContext())
                .getConnectedNodes()
                .addOnSuccessListener(nodes -> {
                    for (Node n : nodes) {
                        Wearable.getMessageClient(getContext()).sendMessage(n.getId(), WearPaths.ACK_PREFIX + id, new byte[0]);
                    }
                });
        } catch (Exception e) {
            // The run is saved on the phone. The watch sends it again later and gets the receipt then.
        }
        JSObject ret = new JSObject();
        ret.put("id", id);
        call.resolve(ret);
    }

    /** all: true also lists watches with the app that are not connected now. */
    @PluginMethod
    public void status(PluginCall call) {
        int filter = Boolean.TRUE.equals(call.getBoolean("all", false)) ? CapabilityClient.FILTER_ALL : CapabilityClient.FILTER_REACHABLE;
        try {
            Wearable.getCapabilityClient(getContext())
                .getCapability(WearPaths.WATCH_CAPABILITY, filter)
                .addOnSuccessListener(info -> call.resolve(statusResult(info.getNodes(), null)))
                .addOnFailureListener(e -> call.resolve(statusResult(null, e.getMessage())));
        } catch (Exception e) {
            call.resolve(statusResult(null, e.getMessage()));
        }
    }

    private static JSObject statusResult(java.util.Set<Node> nodes, String error) {
        JSObject ret = new JSObject();
        JSArray list = new JSArray();
        if (nodes != null) {
            for (Node n : nodes) {
                JSObject o = new JSObject();
                o.put("id", n.getId());
                o.put("name", n.getDisplayName());
                o.put("nearby", n.isNearby());
                list.put(o);
            }
        }
        ret.put("connected", nodes != null && !nodes.isEmpty());
        ret.put("nodes", list);
        if (error != null) ret.put("error", error);
        return ret;
    }
}
