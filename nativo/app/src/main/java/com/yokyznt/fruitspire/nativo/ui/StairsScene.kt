package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.sin

/** Lo que necesita la escena de subir de piso. */
class AscendUi(val key: Long, val charId: String, val floor: Int, val castle: Int, val newCastle: Boolean)

/** Cuánto dura la escena y cómo se reparte (en milisegundos). */
object StairsTiming {
    const val TOTAL = 3000
    const val FADE_IN = 350
    const val CLIMB_END = 2350
}

private const val STEPS = 8
private const val STEP_W = 150f
private const val STEP_H = 74f

/**
 * Después de un jefe: la fruta sube una escalera de la torre, escalón por escalón, con la cámara siguiéndola, y al final se funde
 * con la luz de la puerta de arriba hacia el piso nuevo. Tocar la pantalla la salta.
 */
@Composable
fun StairsScene(info: AscendUi, onDone: () -> Unit, modifier: Modifier = Modifier) {
    val clock = remember(info.key) { Animatable(0f) }
    val audio = LocalAudio.current
    LaunchedEffect(info.key) {
        clock.animateTo(1f, tween(StairsTiming.TOTAL, easing = LinearEasing))
        onDone()
    }
    // un «tap» por cada escalón que pisa
    val step = floor(climbOf(clock.value) * STEPS).toInt()
    LaunchedEffect(step) { if (step in 1..STEPS && clock.value < 1f) audio.play(Sfx.TAP) }
    LaunchedEffect(info.key) { kotlinx.coroutines.delay(StairsTiming.CLIMB_END.toLong()); audio.play(Sfx.SPARKLE) }
    Box(modifier.fillMaxSize().pointerInput(Unit) { detectTapGestures { onDone() } }) {
        StairsFrame(info, clock.value)
    }
}

/** Qué tanto de la escalera ya subió (0 a 1) cuando la escena va en [p] (0 a 1). */
internal fun climbOf(p: Float): Float {
    val a = StairsTiming.FADE_IN / StairsTiming.TOTAL.toFloat()
    val b = StairsTiming.CLIMB_END / StairsTiming.TOTAL.toFloat()
    return ((p - a) / (b - a)).coerceIn(0f, 1f)
}

/** Un cuadro de la escena en [p] (0 a 1). Separado para poder sacarle capturas. */
@Composable
internal fun StairsFrame(info: AscendUi, p: Float) {
    val width = LocalDesignWidth.current
    val density = LocalDensity.current.density
    val wall: Color; val wallLine: Color; val stone: Color
    when (info.castle) {
        3 -> { wall = Color(0xFFCFC3EA); wallLine = Color(0xFFB8AADB); stone = Color(0xFFEFE9FA) }
        2 -> { wall = Color(0xFFF3CFB0); wallLine = Color(0xFFE4B891); stone = Color(0xFFFFEFDF) }
        else -> { wall = Color(0xFFD3E6BA); wallLine = Color(0xFFBBD49C); stone = Color(0xFFF6F0DC) }
    }
    val climb = climbOf(p)
    val s = climb * STEPS                       // en qué escalón va (con decimales)
    val frac = s - floor(s)
    val climbing = climb in 0.0001f..0.9999f
    // la fruta sube de un escalón al siguiente con un saltito
    val hop = if (climbing) abs(sin(frac * PI.toFloat())) * 46f else 0f
    val squash = if (climbing) (1f - abs(sin(frac * PI.toFloat()))) * .08f else 0f
    // posición de la fruta en el mundo (y crece hacia abajo): sube STEP_H por escalón y avanza STEP_W
    val fx = 90f + s * STEP_W
    val fy = 470f - s * STEP_H
    // la cámara la deja a la izquierda del centro y un poco arriba de la mitad
    val camX = fx - width * .38f
    val camY = fy - 400f
    val paperFade = (1f - p / (StairsTiming.FADE_IN / StairsTiming.TOTAL.toFloat())).coerceIn(0f, 1f)
    val lightFade = ((p - StairsTiming.CLIMB_END / StairsTiming.TOTAL.toFloat()) / (1f - StairsTiming.CLIMB_END / StairsTiming.TOTAL.toFloat())).coerceIn(0f, 1f)
    Box(Modifier.fillMaxSize()) {
        Canvas(Modifier.fillMaxSize()) {
            val k = density
            fun u(v: Float) = v * k
            drawRect(wall)
            // ladrillos de la pared: se mueven más despacio que las escaleras (profundidad)
            val bh = 64f
            val bw = 150f
            val offY = (camY * .5f).mod(bh)
            val offX = (camX * .5f).mod(bw)
            var row = -1
            var yy = -offY
            while (yy < 660f + bh) {
                var xx = -offX - (if (row % 2 == 0) bw / 2 else 0f)
                while (xx < width + bw) {
                    drawRoundRect(wallLine, Offset(u(xx), u(yy)), Size(u(bw - 6f), u(bh - 6f)), CornerRadius(u(8f)))
                    xx += bw
                }
                yy += bh; row++
            }
            // luz de la puerta de arriba: crece cuando se acerca
            val doorX = 90f + STEPS * STEP_W - camX - 40f
            val doorY = 470f - STEPS * STEP_H - camY + 60f   // sobre el último escalón
            val glowR = u(330f * (.6f + climb))
            drawCircle(
                Brush.radialGradient(listOf(Color(0xFFFFF3B0).copy(alpha = .25f + .75f * climb), Color.Transparent), Offset(u(doorX + 70f), u(doorY - 40f)), glowR),
                glowR, Offset(u(doorX + 70f), u(doorY - 40f))
            )
            // la puerta (un arco)
            val arch = Path().apply {
                moveTo(u(doorX + 14f), u(doorY)); lineTo(u(doorX + 14f), u(doorY - 110f))
                arcTo(Rect(u(doorX + 14f), u(doorY - 190f), u(doorX + 126f), u(doorY - 30f)), 180f, 180f, false)
                lineTo(u(doorX + 126f), u(doorY)); close()
            }
            drawPath(arch, Ink.ink)
            drawPath(arch, Color(0xFFFFF3B0))
            // los escalones: bloques de piedra con contorno de tinta que se hunden hasta el fondo
            for (i in 0..STEPS) {
                val x = 90f + i * STEP_W - camX - 60f
                val y = 470f - i * STEP_H - camY + 60f   // arriba del escalón: bajo los pies de la fruta
                if (x > width + 40f || x + STEP_W < -40f) continue
                val left = u(x); val top = u(y)
                drawRect(Ink.ink, Offset(left - u(3f), top - u(3f)), Size(u(STEP_W + 6f), u(1400f)))
                drawRect(if (i % 2 == 0) stone else Color(0xFFEDE4CE), Offset(left, top), Size(u(STEP_W), u(1400f)))
                drawRect(Color(0x26000000), Offset(left, top + u(STEP_H * .55f)), Size(u(STEP_W), u(5f)))
                drawRect(Color.White.copy(alpha = .7f), Offset(left, top), Size(u(STEP_W), u(8f)))
            }
        }
        // la fruta
        Box(
            Modifier.size(120.dp).graphicsLayer {
                translationX = (fx - camX - 45f) * density
                translationY = (fy - camY - 68f - hop) * density
                transformOrigin = TransformOrigin(.5f, 1f)
                scaleX = 1f + squash; scaleY = 1f - squash
                rotationZ = if (climbing) sin(s * PI.toFloat() * 2f) * 4f else 0f
            },
            contentAlignment = Alignment.BottomCenter
        ) { FruitSprite(info.charId, 112.dp) }
        // el título: salta al aparecer
        val showT = ((p - .12f) / .12f).coerceIn(0f, 1f)
        if (showT > 0f) {
            Box(Modifier.fillMaxSize().padding(top = 70.dp), contentAlignment = Alignment.TopCenter) {
                Box(Modifier.graphicsLayer { val sc = .6f + .4f * min(1f, showT * 1.4f); scaleX = sc; scaleY = sc; alpha = showT; rotationZ = -3f }) {
                    OutlinedText(if (info.newCastle) "¡Castillo ${info.castle}!" else "Piso ${info.floor}", Fonts.hand(78f, Color.White), inkWidth = 4.dp, edgeWidth = 0.dp)
                }
            }
        }
        // se entra con un fundido desde el papel y se sale con la luz de la puerta hacia la portada del piso nuevo
        if (paperFade > 0f) Box(Modifier.fillMaxSize().graphicsLayer { alpha = paperFade }.background(Ink.paper))
        if (lightFade > 0f) Box(Modifier.fillMaxSize().graphicsLayer { alpha = lightFade }.background(Ink.paper))
    }
}
