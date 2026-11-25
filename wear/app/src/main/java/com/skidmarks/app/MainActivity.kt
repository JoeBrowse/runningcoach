package com.skidmarks.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.wear.ambient.AmbientLifecycleObserver
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.skidmarks.app.data.RunStore
import com.skidmarks.app.run.Permissions
import com.skidmarks.app.run.RunRepository
import com.skidmarks.app.run.RunService
import com.skidmarks.app.run.RunStatus
import com.skidmarks.app.sync.WearSync
import com.skidmarks.app.ui.RunScreen
import com.skidmarks.app.ui.SettingsScreen
import com.skidmarks.app.ui.SkidMarksTheme
import com.skidmarks.app.ui.SummaryScreen
import com.skidmarks.app.ui.TodayScreen

class MainActivity : ComponentActivity() {
    private var ambient by mutableStateOf(false)

    private val ambientCallback = object : AmbientLifecycleObserver.AmbientLifecycleCallback {
        override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
            ambient = true
        }

        override fun onExitAmbient() {
            ambient = false
        }

        override fun onUpdateAmbient() {}
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(AmbientLifecycleObserver(this, ambientCallback))
        // Read a plan that came while the app was not installed or closed, and send runs that wait.
        WearSync.refreshPlan(this)
        WearSync.resendUnsynced(this)

        setContent {
            SkidMarksTheme {
                val nav = rememberSwipeDismissableNavController()
                val run by RunRepository.ui.collectAsState()
                LaunchedEffect(Unit) {
                    // Back to the run, or to a run that is not saved yet.
                    when {
                        RunService.current != null -> nav.navigate("run")
                        RunStore.loadDraft(this@MainActivity) != null -> nav.navigate("summary")
                    }
                }
                var pending by remember { mutableStateOf<Pair<String?, Boolean>?>(null) }
                val permissions = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
                    // The run starts with the permissions that the runner gave.
                    pending?.let { (iso, warm) ->
                        RunService.start(this, iso, warm)
                        nav.navigate("run")
                    }
                    pending = null
                }

                LaunchedEffect(run.status) {
                    val route = nav.currentDestination?.route
                    if (run.status == RunStatus.ENDED && route == "run") {
                        nav.navigate("summary") { popUpTo("today") }
                    } else if (run.status == RunStatus.IDLE && route == "run" && RunService.current == null) {
                        // The run service stopped (for example the system closed it).
                        if (RunStore.loadDraft(this@MainActivity) != null) nav.navigate("summary") { popUpTo("today") } else nav.popBackStack()
                    }
                }

                SwipeDismissableNavHost(navController = nav, startDestination = "today") {
                    composable("today") {
                        TodayScreen(
                            onStart = { iso, warm ->
                                val missing = Permissions.missing(this@MainActivity)
                                if (missing.isEmpty()) {
                                    RunService.start(this@MainActivity, iso, warm)
                                    nav.navigate("run")
                                } else {
                                    pending = iso to warm
                                    permissions.launch(missing.toTypedArray())
                                }
                            },
                            onOpenRun = { nav.navigate("run") },
                            onOpenSummary = { nav.navigate("summary") },
                            onSettings = { nav.navigate("settings") },
                        )
                    }
                    composable("run") { RunScreen(ambient) }
                    composable("summary") {
                        SummaryScreen(onDone = {
                            if (!nav.popBackStack("today", inclusive = false)) {
                                nav.navigate("today") { popUpTo(0) }
                            }
                        })
                    }
                    composable("settings") { SettingsScreen() }
                }
            }
        }
    }
}
