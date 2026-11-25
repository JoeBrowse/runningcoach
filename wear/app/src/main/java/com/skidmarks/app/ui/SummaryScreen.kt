package com.skidmarks.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.dialog.Alert
import androidx.wear.compose.material.dialog.Dialog
import com.skidmarks.app.coach.KM_PER_MI
import com.skidmarks.app.coach.fmtKm
import com.skidmarks.app.coach.fmtPace
import com.skidmarks.app.coach.fmtTime
import com.skidmarks.app.coach.objects
import com.skidmarks.app.data.RunStore
import com.skidmarks.app.data.Signals
import com.skidmarks.app.sync.WearSync
import org.json.JSONObject

/* The same words as the phone (src/runui/runData.js RPE_WORDS). */
private val RPE_WORDS = mapOf(
    1 to "Very, very easy", 2 to "Very easy", 3 to "Easy. I can talk with no effort", 4 to "Comfortable",
    5 to "Steady. I can talk in sentences", 6 to "Moderately hard", 7 to "Hard. I can say a few words",
    8 to "Very hard", 9 to "Very, very hard", 10 to "Maximum effort",
)

/* The summary after a run: numbers, splits, "How hard was it?", Save or Discard. */
@Composable
fun SummaryScreen(onDone: () -> Unit) {
    val ctx = LocalContext.current
    val version by Signals.version.collectAsState()
    var savedId by remember { mutableStateOf<String?>(null) }
    val draft = remember(version, savedId) { if (savedId == null) RunStore.loadDraft(ctx) else null }
    val saved = remember(version, savedId) { savedId?.let { id -> RunStore.all(ctx).firstOrNull { it.optString("id") == id } } }
    val run: JSONObject? = draft ?: saved
    val synced = remember(version, savedId) { savedId?.let { RunStore.isSynced(ctx, it) } ?: false }
    var rpe by remember { mutableIntStateOf(5) }
    var confirmDiscard by remember { mutableStateOf(false) }
    val listState = rememberScalingLazyListState()

    Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
        ScalingLazyColumn(state = listState, modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (run == null) {
                item { Text("No run to show.", color = SM.Text) }
                item { Chip(onClick = onDone, label = { Text("Back") }, colors = ChipDefaults.secondaryChipColors(), modifier = Modifier.fillMaxWidth()) }
                return@ScalingLazyColumn
            }
            val units = run.optString("splitUnit", "km")
            val km = run.optDouble("km", 0.0)
            val sec = run.optDouble("durationSec", 0.0)
            item { Text("RUN DONE", style = SM.label) }
            item { Text(fmtKm(km, units), style = SM.number.copy(fontSize = 30.sp)) }
            item { Text("Time ${fmtTime(sec)}", style = SM.number.copy(fontSize = 15.sp)) }
            item { Text("Pace ${if (km > 0.05) fmtPace(sec / km, units) else "-"}", style = SM.number.copy(fontSize = 15.sp)) }
            if (run.has("avgHR")) item { Text("Average heart rate ${run.optInt("avgHR")}", fontSize = 13.sp, color = SM.Text) }
            val splits = run.optJSONArray("splits").objects()
            if (splits.isNotEmpty()) {
                item { Text(if (units == "mi") "MILE SPLITS" else "KM SPLITS", style = SM.label) }
                for (s in splits) {
                    item {
                        val skm = s.optDouble("km", 1.0)
                        val unitKm = if (units == "mi") KM_PER_MI else 1.0
                        val pace = if (skm > 0) s.optDouble("sec") / skm else null
                        val n = s.optInt("n")
                        val label = if (s.optBoolean("partial")) "${n} (${String.format(java.util.Locale.UK, "%.2f", skm / unitKm)})" else "$n"
                        Row(modifier = Modifier.fillMaxWidth(0.7f), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(label, style = SM.number.copy(fontSize = 13.sp, color = SM.Dim))
                            Text(fmtPace(pace, units), style = SM.number.copy(fontSize = 13.sp))
                        }
                    }
                }
            }
            if (draft != null) {
                item { Text("HOW HARD WAS IT?", style = SM.label, modifier = Modifier.padding(top = 6.dp)) }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Button(onClick = { if (rpe > 1) rpe-- }, modifier = Modifier.size(ButtonDefaults.SmallButtonSize), colors = ButtonDefaults.secondaryButtonColors()) { Text("−") }
                        Spacer(Modifier.width(12.dp))
                        Text("$rpe", style = SM.number.copy(fontSize = 30.sp, color = SM.Orange))
                        Spacer(Modifier.width(12.dp))
                        Button(onClick = { if (rpe < 10) rpe++ }, modifier = Modifier.size(ButtonDefaults.SmallButtonSize), colors = ButtonDefaults.secondaryButtonColors()) { Text("+") }
                    }
                }
                item { Text(RPE_WORDS[rpe] ?: "", fontSize = 12.sp, color = SM.Text, textAlign = TextAlign.Center) }
                item {
                    Chip(
                        onClick = {
                            val out = JSONObject(draft.toString()).put("rpe", rpe)
                            RunStore.save(ctx, out)
                            RunStore.clearDraft(ctx)
                            WearSync.sendRunLater(ctx, out.getString("id"), out.toString())
                            savedId = out.getString("id")
                        },
                        label = { Text("Save") },
                        colors = ChipDefaults.primaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item { Chip(onClick = { confirmDiscard = true }, label = { Text("Discard") }, colors = ChipDefaults.secondaryChipColors(), modifier = Modifier.fillMaxWidth()) }
            } else {
                item { Text(if (synced) "Synced" else "Waiting for phone", color = if (synced) SM.Good else SM.Orange, fontSize = 14.sp) }
                if (!synced) item { Text("The run goes to the phone when the phone is near and has Skid Marks.", fontSize = 11.sp, color = SM.Dim, textAlign = TextAlign.Center) }
                item { Chip(onClick = onDone, label = { Text("Done") }, colors = ChipDefaults.primaryChipColors(), modifier = Modifier.fillMaxWidth()) }
            }
        }
    }
    Dialog(showDialog = confirmDiscard, onDismissRequest = { confirmDiscard = false }) {
        Alert(
            title = { Text("Discard this run?", textAlign = TextAlign.Center) },
            negativeButton = { Button(onClick = { confirmDiscard = false }, colors = ButtonDefaults.secondaryButtonColors()) { Text("No") } },
            positiveButton = {
                Button(onClick = { confirmDiscard = false; RunStore.clearDraft(ctx); onDone() }, colors = ButtonDefaults.buttonColors(backgroundColor = SM.Danger, contentColor = Color.Black)) { Text("Yes") }
            },
        ) {
            Text("You cannot get it back.", textAlign = TextAlign.Center, fontSize = 13.sp, modifier = Modifier.fillMaxWidth())
        }
    }
}
