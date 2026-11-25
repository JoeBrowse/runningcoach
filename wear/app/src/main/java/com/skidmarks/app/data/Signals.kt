package com.skidmarks.app.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Tells the screens that stored data changed (a new plan, a synced run). */
object Signals {
    private val _version = MutableStateFlow(0)
    val version: StateFlow<Int> = _version

    fun changed() {
        _version.value = _version.value + 1
    }
}
