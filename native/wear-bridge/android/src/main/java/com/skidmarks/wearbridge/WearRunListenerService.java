package com.skidmarks.wearbridge;

import android.net.Uri;
import android.util.Log;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.Asset;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Receives runs from the watch. Android starts this service when a run
 * DataItem changes, also when the phone app is closed. The run goes into
 * the PendingRuns queue. When the app is open, the plugin also sends a
 * "runReceived" event to the JS code.
 */
public class WearRunListenerService extends WearableListenerService {
    private static final String TAG = "WearBridge";

    @Override
    public void onDataChanged(DataEventBuffer events) {
        for (DataEvent event : events) {
            if (event.getType() != DataEvent.TYPE_CHANGED) continue;
            Uri uri = event.getDataItem().getUri();
            String path = uri.getPath();
            if (path == null || !path.startsWith(WearPaths.RUN_PREFIX)) continue;
            String id = path.substring(WearPaths.RUN_PREFIX.length());
            if (id.isEmpty()) continue;
            DataMap map = DataMapItem.fromDataItem(event.getDataItem()).getDataMap();
            String json = readRun(map);
            if (json == null) continue;
            PendingRuns.put(this, id, json);
            WearBridgePlugin.notifyRunReceived(id);
        }
    }

    private String readRun(DataMap map) {
        String inline = map.getString("json");
        if (inline != null) return inline;
        Asset asset = map.getAsset("run");
        if (asset == null) return null;
        try {
            DataClient.GetFdForAssetResponse res = Tasks.await(Wearable.getDataClient(this).getFdForAsset(asset), 30, TimeUnit.SECONDS);
            try (InputStream in = res.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            Log.w(TAG, "Cannot read the run from the watch", e);
            return null;
        }
    }
}
