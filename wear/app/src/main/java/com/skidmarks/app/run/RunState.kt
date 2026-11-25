package com.skidmarks.app.run

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class RunStatus { IDLE, STARTING, RUNNING, PAUSED, ENDED }

/** What the run screen shows. The run service writes it once each second. */
data class RunUi(
    val status: RunStatus = RunStatus.IDLE,
    val autoPaused: Boolean = false,
    val title: String = "Free run",
    val units: String = "km",
    val showPace: Boolean = true,
    val elapsed: Double = 0.0,
    val km: Double = 0.0,
    val pace: Double? = null,
    val avgPace: Double? = null,
    val hr: Int? = null,
    val hasWorkout: Boolean = false,
    val stepLabel: String? = null,
    val stepLeft: String? = null,
    val stepFraction: Float = 0f,
    val effortWord: String? = null,
    val nextLabel: String? = null,
    val inWarmup: Boolean = false,
    val complete: Boolean = false,
    val caption: String? = null,
    val captionAt: Long = 0L,
    val gps: String = "waiting",
    val voiceMissing: Boolean = false,
    val message: String? = null,
)

object RunRepository {
    private val _ui = MutableStateFlow(RunUi())
    val ui: StateFlow<RunUi> = _ui

    fun set(ui: RunUi) {
        _ui.value = ui
    }

    fun reset() {
        _ui.value = RunUi()
    }
}
