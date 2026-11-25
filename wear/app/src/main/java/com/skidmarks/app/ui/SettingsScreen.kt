package com.skidmarks.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.PositionIndicator
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.ToggleChip
import androidx.wear.compose.material.ToggleChipDefaults
import com.skidmarks.app.data.PlanStore
import com.skidmarks.app.data.Signals
import com.skidmarks.app.data.WatchSettings

/* Settings on the watch. The phone sends its values with the plan; a change here wins. */
@Composable
fun SettingsScreen() {
    val ctx = LocalContext.current
    val version by Signals.version.collectAsState()
    val settings = remember { WatchSettings(ctx) }
    val plan = remember(version) { PlanStore.load(ctx) }
    val voice = remember(version) { settings.voice(plan) }
    val autoPause = remember(version) { settings.autoPause(plan) }
    val units = plan?.units ?: "km"
    val listState = rememberScalingLazyListState()

    @Composable
    fun Toggle(label: String, value: Boolean, secondary: String? = null, onChange: (Boolean) -> Unit) {
        ToggleChip(
            checked = value,
            onCheckedChange = onChange,
            label = { Text(label) },
            secondaryLabel = secondary?.let { { Text(it) } },
            toggleControl = { Icon(imageVector = ToggleChipDefaults.switchIcon(value), contentDescription = if (value) "On" else "Off") },
            modifier = Modifier.fillMaxWidth(),
        )
    }

    Scaffold(positionIndicator = { PositionIndicator(scalingLazyListState = listState) }) {
        ScalingLazyColumn(state = listState, modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            item { Text("SETTINGS", style = SM.label) }
            item { Toggle("Voice", voice.on, "Captions always show") { settings.set(WatchSettings.VOICE, it) } }
            item { Toggle("Pace guidance", voice.pace, "Speed up or slow down") { settings.set(WatchSettings.PACE, it) } }
            item { Toggle(if (units == "mi") "Mile splits" else "Km splits", voice.km) { settings.set(WatchSettings.SPLITS, it) } }
            item { Toggle("Auto-pause", autoPause, "The time stops when you stop") { settings.set(WatchSettings.AUTO_PAUSE, it) } }
            item {
                Text(
                    "Units: ${if (units == "mi") "miles" else "km"}. The phone sets the units.",
                    fontSize = 11.sp, color = SM.Dim, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
        }
    }
}
