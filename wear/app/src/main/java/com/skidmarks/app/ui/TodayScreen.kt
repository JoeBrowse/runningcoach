package com.skidmarks.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.ToggleChip
import androidx.wear.compose.material.ToggleChipDefaults
import com.skidmarks.app.coach.Workout
import com.skidmarks.app.coach.buildSegments
import com.skidmarks.app.coach.fmtKm
import com.skidmarks.app.coach.jsNum
import com.skidmarks.app.data.PlanStore
import com.skidmarks.app.data.RunStore
import com.skidmarks.app.data.Signals
import com.skidmarks.app.data.WatchSettings
import com.skidmarks.app.run.RunRepository
import com.skidmarks.app.run.RunStatus
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale

/* Today: the planned run from the phone, or a free run. */
@Composable
fun TodayScreen(
    onStart: (iso: String?, warmup: Boolean) -> Unit,
    onOpenRun: () -> Unit,
    onOpenSummary: () -> Unit,
    onSettings: () -> Unit,
) {
    val ctx = LocalContext.current
    val version by Signals.version.collectAsState()
    val run by RunRepository.ui.collectAsState()
    val plan = remember(version) { PlanStore.load(ctx) }
    val receivedAt = remember(version) { PlanStore.receivedAt(ctx) }
    val unsynced = remember(version) { RunStore.unsynced(ctx).size }
    val hasDraft = remember(version) { RunStore.loadDraft(ctx) != null }
    val settings = remember { WatchSettings(ctx) }
    val today = remember(version) { PlanStore.today() }
    val workout = PlanStore.todayRun(plan, today)
    val next = PlanStore.nextRun(plan, today)
    var warmup by remember { mutableStateOf(settings.useWarmup) }
    val units = plan?.units ?: "km"
    val active = run.status == RunStatus.RUNNING || run.status == RunStatus.PAUSED || run.status == RunStatus.STARTING
    val listState = rememberScalingLazyListState()

    Scaffold(timeText = { TimeText() }, positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
        ScalingLazyColumn(
            state = listState,
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            item { Text("TODAY", style = SM.label) }
            if (active) {
                item {
                    Chip(onClick = onOpenRun, label = { Text("Run in progress") }, secondaryLabel = { Text("Open the run") }, colors = ChipDefaults.primaryChipColors(), modifier = Modifier.fillMaxWidth())
                }
            } else if (hasDraft) {
                item {
                    Chip(onClick = onOpenSummary, label = { Text("Run not saved") }, secondaryLabel = { Text("Open the summary") }, colors = ChipDefaults.primaryChipColors(), modifier = Modifier.fillMaxWidth())
                }
            }
            if (workout != null) {
                item { Text(workout.title, fontSize = 18.sp, textAlign = TextAlign.Center, color = SM.Text) }
                item { Text(amountText(workout, units), style = SM.number.copy(fontSize = 14.sp), color = SM.Dim) }
                item { StepBar(workout) }
                if (workout.done) item { Text("Done today.", color = SM.Good, fontSize = 12.sp) }
                if (!active) {
                    item {
                        Chip(
                            onClick = { settings.useWarmup = warmup; onStart(workout.iso, warmup && workout.warmup != null) },
                            label = { Text("Start") },
                            colors = ChipDefaults.primaryChipColors(),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    val wu = workout.warmup
                    if (wu != null && wu.kind != "easy") {
                        item {
                            ToggleChip(
                                checked = warmup,
                                onCheckedChange = { warmup = it },
                                label = { Text("Warm-up") },
                                secondaryLabel = { Text("${jsNum(wu.minutes)} min") },
                                toggleControl = { androidx.wear.compose.material.Icon(imageVector = ToggleChipDefaults.switchIcon(warmup), contentDescription = if (warmup) "On" else "Off") },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
            } else {
                val text = when {
                    plan == null -> "No plan on this watch. Free run."
                    next != null -> "No run today. Next: ${dayName(next.iso)}, ${next.title}."
                    else -> "No run in the plan for the next days. Free run."
                }
                item { Text(text, textAlign = TextAlign.Center, fontSize = 14.sp, color = SM.Text, modifier = Modifier.padding(horizontal = 8.dp)) }
            }
            if (!active) {
                item {
                    Chip(
                        onClick = { onStart(null, false) },
                        label = { Text("Free run") },
                        colors = if (workout == null) ChipDefaults.primaryChipColors() else ChipDefaults.secondaryChipColors(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            item { Chip(onClick = onSettings, label = { Text("Settings") }, colors = ChipDefaults.secondaryChipColors(), modifier = Modifier.fillMaxWidth()) }
            item {
                val synced = if (receivedAt > 0) "Plan synced ${SimpleDateFormat("d MMM, HH:mm", Locale.UK).format(Date(receivedAt))}." else "No plan from the phone yet."
                Text(synced, fontSize = 11.sp, color = SM.Dim, textAlign = TextAlign.Center)
            }
            if (unsynced > 0) {
                item { Text(if (unsynced == 1) "1 run waits for the phone." else "$unsynced runs wait for the phone.", fontSize = 11.sp, color = SM.Orange, textAlign = TextAlign.Center) }
            }
        }
    }
}

private fun amountText(w: Workout, units: String): String {
    val parts = ArrayList<String>()
    val km = w.km
    if (km != null && km > 0) parts.add(fmtKm(km, units))
    val min = w.min
    if (min != null && min > 0) parts.add("${jsNum(Math.round(min).toDouble())} min")
    return parts.joinToString(" · ")
}

private fun dayName(iso: String?): String = try {
    LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("EEE d MMM", Locale.UK))
} catch (e: Exception) {
    iso ?: ""
}

/* A simple bar of the steps: the width is the planned time, the colour is the effort. */
@Composable
fun StepBar(w: Workout) {
    val segs = remember(w) { buildSegments(w, null, false) }
    val total = segs.sumOf { it.sec }.takeIf { it > 0 } ?: return
    Canvas(modifier = Modifier.fillMaxWidth(0.8f).height(10.dp)) {
        var x = 0f
        val gap = 2f
        for (s in segs) {
            val width = (size.width * (s.sec / total)).toFloat()
            drawRoundRect(color = SM.cls(s.cls), topLeft = Offset(x, 0f), size = Size((width - gap).coerceAtLeast(1f), size.height), cornerRadius = CornerRadius(3f, 3f))
            x += width
        }
    }
}
