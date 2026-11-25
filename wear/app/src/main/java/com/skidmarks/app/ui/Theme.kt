package com.skidmarks.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Colors
import androidx.wear.compose.material.MaterialTheme

/* Skid Marks colours on the watch: dark, graphite and the orange accent. */
object SM {
    val Orange = Color(0xFFFF6A1A)
    val Graphite = Color(0xFF1C1D21)
    val Raised = Color(0xFF2A2C31)
    val Text = Color(0xFFF2F2F3)
    val Dim = Color(0xFF9A9CA3)
    val Danger = Color(0xFFE5484D)
    val Good = Color(0xFF46C37B)

    /** Colour for a step class on the step bar. */
    fun cls(c: String): Color = when (c) {
        "walk" -> Color(0xFF4A4C52)
        "easy" -> Color(0xFF8A4A22)
        "steady" -> Color(0xFFC2571C)
        "hard" -> Orange
        "race" -> Color(0xFFFFB21A)
        else -> Dim
    }

    val label = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 0.8.sp, color = Orange)
    val number = TextStyle(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = Text)
}

private val colors = Colors(
    primary = SM.Orange,
    primaryVariant = Color(0xFFC2571C),
    secondary = SM.Orange,
    secondaryVariant = Color(0xFFC2571C),
    background = Color.Black,
    surface = SM.Graphite,
    error = SM.Danger,
    onPrimary = Color.Black,
    onSecondary = Color.Black,
    onBackground = SM.Text,
    onSurface = SM.Text,
    onSurfaceVariant = SM.Dim,
    onError = Color.Black,
)

@Composable
fun SkidMarksTheme(content: @Composable () -> Unit) {
    MaterialTheme(colors = colors, content = content)
}
