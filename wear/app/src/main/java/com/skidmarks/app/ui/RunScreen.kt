package com.skidmarks.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.CircularProgressIndicator
import androidx.wear.compose.material.CompactChip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.dialog.Alert
import androidx.wear.compose.material.dialog.Dialog
import com.skidmarks.app.coach.distanceNumber
import com.skidmarks.app.coach.fmtTime
import com.skidmarks.app.coach.paceNumber
import com.skidmarks.app.data.WatchSettings
import com.skidmarks.app.run.RunRepository
import com.skidmarks.app.run.RunService
import com.skidmarks.app.run.RunStatus
import com.skidmarks.app.run.RunUi

private const val CAPTION_MS = 8000L

/* The run: page 0 has the controls, page 1 (the first page you see) has the numbers. */
@Composable
fun RunScreen(ambient: Boolean) {
    val ui by RunRepository.ui.collectAsState()
    val pager = rememberPagerState(initialPage = 1) { 2 }
    val ctx = LocalContext.current
    val settings = remember { WatchSettings(ctx) }
    var noticeSeen by remember { mutableStateOf(settings.noVoiceNoticeShown) }

    if (ambient) {
        AmbientRun(ui)
        return
    }
    HorizontalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
        if (page == 0) Controls(ui) else Metrics(ui)
    }
    Dialog(showDialog = ui.voiceMissing && !noticeSeen, onDismissRequest = { settings.noVoiceNoticeShown = true; noticeSeen = true }) {
        Alert(
            title = { Text("No voice", textAlign = TextAlign.Center) },
            negativeButton = {},
            positiveButton = {
                Button(onClick = { settings.noVoiceNoticeShown = true; noticeSeen = true }) { Text("OK") }
            },
        ) {
            Text("No voice on this watch. Install a text-to-speech app, or use vibration.", textAlign = TextAlign.Center, fontSize = 13.sp)
        }
    }
}

private fun header(ui: RunUi): String = when {
    ui.status == RunStatus.STARTING -> "STARTING"
    ui.status == RunStatus.PAUSED -> "PAUSED"
    ui.autoPaused -> "AUTO-PAUSED"
    ui.complete -> "WORKOUT COMPLETE"
    ui.stepLabel != null -> ui.stepLabel.uppercase()
    else -> ui.title.uppercase()
}

private fun gpsText(gps: String): Pair<String, Color> = when (gps) {
    "good" -> "GPS" to SM.Good
    "weak" -> "GPS weak" to SM.Orange
    "none" -> "No GPS" to SM.Dim
    else -> "GPS…" to SM.Dim
}

@Composable
private fun Metrics(ui: RunUi) {
    val unit = if (ui.units == "mi") "mi" else "km"
    val showCaption = (ui.caption != null && System.currentTimeMillis() - ui.captionAt < CAPTION_MS) || ui.message != null
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        if (ui.hasWorkout && !ui.complete) {
            CircularProgressIndicator(
                progress = ui.stepFraction,
                modifier = Modifier.fillMaxSize().padding(3.dp),
                startAngle = 300f,
                endAngle = 240f,
                indicatorColor = SM.Orange,
                trackColor = SM.Raised,
                strokeWidth = 5.dp,
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center, modifier = Modifier.padding(horizontal = 22.dp)) {
            Text(header(ui), style = SM.label, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center)
            if (ui.stepLeft != null && !ui.complete) Text(ui.stepLeft, style = SM.number.copy(fontSize = 13.sp, color = SM.Text))
            Text(fmtTime(ui.elapsed), style = SM.number.copy(fontSize = 36.sp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(distanceNumber(ui.km, ui.units), style = SM.number.copy(fontSize = 24.sp))
                Text(" $unit", fontSize = 12.sp, color = SM.Dim)
                Spacer(Modifier.width(10.dp))
                if (ui.showPace || !ui.hasWorkout) {
                    Text(paceNumber(ui.pace, ui.units), style = SM.number.copy(fontSize = 24.sp))
                    Text(" /$unit", fontSize = 12.sp, color = SM.Dim)
                } else {
                    Text(ui.effortWord ?: "Run", fontSize = 20.sp, color = SM.Orange)
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("♥ ${ui.hr ?: "--"}", style = SM.number.copy(fontSize = 16.sp, color = SM.Text))
                Spacer(Modifier.width(10.dp))
                val (g, c) = gpsText(ui.gps)
                Text(g, fontSize = 11.sp, color = c)
            }
            if (!showCaption && ui.nextLabel != null && !ui.complete) {
                Text(ui.nextLabel, fontSize = 11.sp, color = SM.Dim, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (showCaption) {
                Spacer(Modifier.height(2.dp))
                Text(
                    ui.message ?: ui.caption ?: "",
                    fontSize = 13.sp,
                    color = SM.Text,
                    textAlign = TextAlign.Center,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.background(SM.Graphite, RoundedCornerShape(8.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun AmbientRun(ui: RunUi) {
    val unit = if (ui.units == "mi") "mi" else "km"
    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(header(ui), fontSize = 12.sp, color = SM.Dim, maxLines = 1)
        Text(fmtTime(ui.elapsed), style = SM.number.copy(fontSize = 34.sp, color = Color.White))
        Text("${distanceNumber(ui.km, ui.units)} $unit", style = SM.number.copy(fontSize = 20.sp, color = Color.White))
        if (ui.caption != null && System.currentTimeMillis() - ui.captionAt < CAPTION_MS) {
            Text(ui.caption, fontSize = 12.sp, color = Color.White, textAlign = TextAlign.Center, maxLines = 3, modifier = Modifier.padding(horizontal = 24.dp))
        }
    }
}

@Composable
private fun Controls(ui: RunUi) {
    var confirmEnd by remember { mutableStateOf(false) }
    val service = RunService.current
    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            val paused = ui.status == RunStatus.PAUSED
            Button(
                onClick = { if (paused) service?.resume() else service?.pause() },
                modifier = Modifier.size(ButtonDefaults.LargeButtonSize),
                colors = ButtonDefaults.primaryButtonColors(),
            ) { Text(if (paused) "Resume" else "Pause", fontSize = 12.sp) }
            Button(
                onClick = { service?.lap() },
                modifier = Modifier.size(ButtonDefaults.LargeButtonSize),
                colors = ButtonDefaults.secondaryButtonColors(),
            ) { Text("Lap", fontSize = 12.sp) }
        }
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = { confirmEnd = true },
            modifier = Modifier.size(ButtonDefaults.DefaultButtonSize),
            colors = ButtonDefaults.buttonColors(backgroundColor = SM.Danger, contentColor = Color.Black),
        ) { Text("End", fontSize = 12.sp) }
        Spacer(Modifier.height(6.dp))
        if (ui.inWarmup) {
            CompactChip(onClick = { service?.skipWarmup() }, label = { Text("Skip warm-up") }, colors = ChipDefaults.secondaryChipColors())
        } else if (ui.hasWorkout && !ui.complete) {
            CompactChip(onClick = { service?.skipStep() }, label = { Text("Skip step") }, colors = ChipDefaults.secondaryChipColors())
        }
    }
    Dialog(showDialog = confirmEnd, onDismissRequest = { confirmEnd = false }) {
        Alert(
            title = { Text("End the run?", textAlign = TextAlign.Center) },
            negativeButton = {
                Button(onClick = { confirmEnd = false }, colors = ButtonDefaults.secondaryButtonColors()) { Text("No") }
            },
            positiveButton = {
                Button(onClick = { confirmEnd = false; service?.end() }, colors = ButtonDefaults.buttonColors(backgroundColor = SM.Danger, contentColor = Color.Black)) { Text("End") }
            },
        ) {
            Text("You can save it on the next screen.", textAlign = TextAlign.Center, fontSize = 13.sp, modifier = Modifier.fillMaxWidth())
        }
    }
}
