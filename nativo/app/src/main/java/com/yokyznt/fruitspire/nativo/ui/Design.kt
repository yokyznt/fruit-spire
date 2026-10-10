package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.ui.Alignment
import kotlin.math.roundToInt
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.nativo.R

/** Colores del juego (los mismos de css/style.css). */
object Ink {
    val paper = Color(0xFFFBF4E4)
    val paper2 = Color(0xFFFFFBF2)
    val paperLine = Color(0xFFD9E6F2)
    val marginLine = Color(0xFFF2B8B5)
    val ink = Color(0xFF4A3428)
    val inkSoft = Color(0xFF8C7462)
    val edge = Color(0xFFFFFFFF)
    val strawberry = Color(0xFFF2667A)
    val strawberrySoft = Color(0xFFFFD6DC)
    val strawberryBtn = Color(0xFFFF9DAE)
    val mint = Color(0xFF5CC9A7)
    val mintDark = Color(0xFF2F8E72)
    val mintSoft = Color(0xFFD2F2E6)
    val grape = Color(0xFF9B7FD4)
    val grapeSoft = Color(0xFFE6DCF7)
    val grapeBtn = Color(0xFFC7B4F0)
    val banana = Color(0xFFFFCF4D)
    val bananaSoft = Color(0xFFFFF1C2)
    val peach = Color(0xFFFF9E7A)
    val peachSoft = Color(0xFFFFE1D4)
    val orange = Color(0xFFFFA64D)
    val leaf = Color(0xFF7BBF5A)
    val leafSoft = Color(0xFFE4F4D6)
    val wood = Color(0xFFE8C49A)
    val logo = listOf(Color(0xFFF2667A), Color(0xFFFF9E7A), Color(0xFFFFCF4D), Color(0xFF7BBF5A), Color(0xFF5CC9A7), Color(0xFF9B7FD4))
}

/** Letras del juego: Chewy (títulos), Fredoka (texto) y Patrick Hand (a mano). */
object Fonts {
    val display = FontFamily(Font(R.font.chewy))
    val body = FontFamily(
        Font(R.font.fredoka_regular, FontWeight.Normal),
        Font(R.font.fredoka_medium, FontWeight.Medium),
        Font(R.font.fredoka_semibold, FontWeight.SemiBold),
        Font(R.font.fredoka_bold, FontWeight.Bold)
    )
    val hand = FontFamily(Font(R.font.patrick_hand))
    fun body(size: Float, weight: FontWeight = FontWeight.Normal, color: Color = Ink.ink) =
        TextStyle(fontFamily = body, fontSize = size.sp, fontWeight = weight, color = color)
    fun display(size: Float, color: Color = Ink.ink) = TextStyle(fontFamily = display, fontSize = size.sp, color = color)
    fun hand(size: Float, color: Color = Ink.ink) = TextStyle(fontFamily = hand, fontSize = size.sp, color = color)
}

/** Alto del lienzo en px de diseño (el mismo del modo teléfono del juego web). */
const val DESIGN_H = 660f

/** Ancho del lienzo en px de diseño (depende de lo alargada que sea la pantalla). */
val LocalDesignWidth = compositionLocalOf { 1180f }

/**
 * Todo el juego se mide en px de diseño, como la versión web: dentro de DesignCanvas
 * 1.dp (y 1.sp) vale un px de diseño, así que la interfaz se escala sola a cualquier pantalla.
 */
@Composable
fun DesignCanvas(content: @Composable () -> Unit) {
    // el recorte de la pantalla (cámara) se mide con la densidad real, antes de pasar a px de diseño
    val real = LocalDensity.current
    val dir = LocalLayoutDirection.current
    val cut = WindowInsets.displayCutout
    val cutLeft = cut.getLeft(real, dir)
    val cutRight = cut.getRight(real, dir)
    BoxWithConstraints(Modifier.fillMaxSize().background(Ink.paper)) {
        // El lienzo mide 660 de alto y, como poco, MIN_DESIGN_W de ancho (4:3). En una ventana más estrecha —tabletas y plegables en
        // vertical (Android 16 ya no respeta la orientación fija en pantallas grandes), pantalla dividida— el juego se encoge para
        // caber y sobra papel arriba y abajo, en vez de apretarse hasta romper la interfaz.
        val scale = minOf(constraints.maxHeight / DESIGN_H, constraints.maxWidth / MIN_DESIGN_W)
        val width = constraints.maxWidth / scale
        val canvasHeight = with(real) { (DESIGN_H * scale).roundToInt().toDp() }
        Box(Modifier.align(Alignment.Center).fillMaxWidth().height(canvasHeight)) {
            CompositionLocalProvider(
                LocalDensity provides Density(density = scale, fontScale = 1f),
                LocalDesignWidth provides width,
                LocalSafeInsets provides SafeInsets(cutLeft / scale, cutRight / scale)
            ) { content() }
        }
    }
}

/** El ancho de diseño más angosto que aguanta la interfaz (4:3 con el alto de 660). */
const val MIN_DESIGN_W = 880f

/** Lo que tapa el recorte de la pantalla (la cámara) a cada lado, en px de diseño. */
class SafeInsets(val left: Float, val right: Float) {
    companion object { val None = SafeInsets(0f, 0f) }
}

val LocalSafeInsets = compositionLocalOf { SafeInsets.None }

/** Fondo de hoja de cuaderno: renglones azules y la línea roja del margen. */
fun Modifier.notebookPaper(): Modifier = drawBehind {
    drawRect(Ink.paper)
    val step = 32.dp.toPx()
    var y = step - 1.dp.toPx()
    while (y < size.height) {
        drawLine(Ink.paperLine, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
        y += step
    }
    val x = 55.dp.toPx()
    drawLine(Ink.marginLine, Offset(x, 0f), Offset(x, size.height), strokeWidth = 2.dp.toPx())
}
