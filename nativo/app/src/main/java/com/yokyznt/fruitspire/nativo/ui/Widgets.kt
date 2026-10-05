package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Rectángulo redondeado con el contorno de tinta y el filo blanco de los stickers. */
fun DrawScope.stickerShape(fill: Color, radius: Float, inkWidth: Float, edgeWidth: Float, dashed: Boolean = false, topLeft: Offset = Offset.Zero, size: Size = this.size) {
    val r = CornerRadius(radius.coerceAtMost(size.minDimension / 2f))
    // contorno de tinta por fuera, filo blanco por dentro
    drawRoundRect(Ink.ink, topLeft - Offset(inkWidth, inkWidth), Size(size.width + inkWidth * 2, size.height + inkWidth * 2), CornerRadius(r.x + inkWidth))
    drawRoundRect(if (dashed) fill else Ink.edge, topLeft, size, r)
    if (dashed) {
        drawRoundRect(Ink.inkSoft, topLeft, size, r, style = Stroke(edgeWidth, pathEffect = PathEffect.dashPathEffect(floatArrayOf(edgeWidth * 3, edgeWidth * 2))))
    } else {
        drawRoundRect(fill, topLeft + Offset(edgeWidth, edgeWidth), Size(size.width - edgeWidth * 2, size.height - edgeWidth * 2), CornerRadius((r.x - edgeWidth).coerceAtLeast(0f)))
    }
}

/**
 * Botón sticker en forma de píldora (el <button> del juego web): se levanta sobre su
 * sombra de tinta y se hunde al tocarlo. [secondary] es la versión de papel con borde punteado.
 */
/** El «Continuar» de las pantallas de premios: grande, para tocarlo con el pulgar sin fallar. */
@Composable
fun ContinueButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, text: String = "Continuar") {
    StickerButton(
        text, onClick, modifier.defaultMinSize(minWidth = 240.dp, minHeight = 56.dp), color = Ink.mint, enabled = enabled,
        fontSize = 26f, padding = PaddingValues(horizontal = 56.dp, vertical = 16.dp)
    )
}

@Composable
fun StickerButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = Ink.peach,
    enabled: Boolean = true,
    secondary: Boolean = false,
    fontSize: Float = 19f,
    padding: PaddingValues = PaddingValues(horizontal = 26.dp, vertical = 11.dp),
    leading: (@Composable () -> Unit)? = null
) {
    val press = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val audio = LocalAudio.current
    val lift = if (secondary) 2.dp else 5.dp
    Box(
        modifier
            // el alfa NO va aquí: una capa con alfa se recorta a los límites del botón y cortaba el contorno y la sombra de arriba y abajo
            .graphicsLayer { translationY = press.value * lift.toPx() }
            .drawBehind {
                val ink = 2.dp.toPx()
                val pad = 12.dp.toPx()
                val dim = !enabled
                if (dim) drawContext.canvas.saveLayer(
                    androidx.compose.ui.geometry.Rect(-pad, -pad, size.width + pad, size.height + pad),
                    androidx.compose.ui.graphics.Paint().apply { alpha = .45f }
                )
                if (secondary) {
                    stickerShape(Ink.paper2, size.height / 2f, 0f, 2.dp.toPx(), dashed = true)
                } else {
                    // sombra de tinta debajo: el botón "flota" sobre ella
                    val drop = lift.toPx() * (1f - press.value)
                    drawRoundRect(Ink.ink, Offset(-ink, -ink + drop), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(size.height / 2f + ink))
                    stickerShape(color, size.height / 2f, ink, 3.dp.toPx())
                }
                if (dim) drawContext.canvas.restore()
            }
            .pointerInput(enabled) {
                if (!enabled) return@pointerInput
                detectTapGestures(
                    onPress = {
                        scope.launch { press.animateTo(1f, tween(70)) }
                        val released = tryAwaitRelease()
                        scope.launch { press.animateTo(0f, spring(dampingRatio = .45f, stiffness = 500f)) }
                        if (released) { audio.play(Sfx.TAP); onClick() }
                    }
                )
            }
            .defaultMinSize(minHeight = 44.dp)
            .padding(padding),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
            if (leading != null) { leading(); Spacer(Modifier.width(8.dp)) }
            val textStyle = if (secondary) Fonts.hand(fontSize * 1.2f) else Fonts.body(fontSize, FontWeight.SemiBold)
            BasicText(text, style = if (enabled) textStyle else textStyle.copy(color = textStyle.color.copy(alpha = .45f)), maxLines = 1)
        }
    }
}

/** Texto con contorno (tinta) y filo blanco por fuera, como las letras recortadas del logo. */
@Composable
fun OutlinedText(text: String, style: TextStyle, modifier: Modifier = Modifier, inkWidth: Dp = 2.dp, edgeWidth: Dp = 2.dp) {
    Box(modifier) {
        val density = androidx.compose.ui.platform.LocalDensity.current
        val inkPx = with(density) { inkWidth.toPx() }
        val edgePx = with(density) { edgeWidth.toPx() }
        BasicText(text, style = style.copy(color = Ink.edge, drawStyle = Stroke((inkPx + edgePx) * 2f, join = androidx.compose.ui.graphics.StrokeJoin.Round)))
        BasicText(text, style = style.copy(color = Ink.ink, drawStyle = Stroke(inkPx * 2f, join = androidx.compose.ui.graphics.StrokeJoin.Round)))
        BasicText(text, style = style)
    }
}

/** Logo "Fruit Spire": cada letra de un color y un poco girada (logoHtml del juego web). */
@Composable
fun Logo(text: String, fontSize: Float, modifier: Modifier = Modifier) {
    val rotations = floatArrayOf(-6f, 4f, -3f, 6f, -4f, 3f)
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        var i = 0
        for (ch in text) {
            if (ch == ' ') { Spacer(Modifier.width((fontSize * .35f).dp)); continue }
            val k = i++
            OutlinedText(
                ch.toString(),
                Fonts.display(fontSize, Ink.logo[k % Ink.logo.size]),
                Modifier.graphicsLayer { rotationZ = rotations[k % rotations.size] },
                inkWidth = (fontSize / 36f).coerceIn(1.5f, 3f).dp,
                edgeWidth = (fontSize / 28f).coerceIn(2f, 4f).dp
            )
        }
    }
}

/** Hoja de papel con borde: el panel del juego. */
fun Modifier.paperPanel(radius: Dp = 22.dp, fill: Color = Ink.paper2): Modifier = drawBehind {
    val ink = 3.dp.toPx()
    drawRoundRect(Color(0x404A3428), Offset(6.dp.toPx(), 12.dp.toPx()), size, CornerRadius(radius.toPx()))
    drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(radius.toPx() + ink))
    drawRoundRect(fill, Offset.Zero, size, CornerRadius(radius.toPx()))
}

/** Aviso corto que aparece abajo y se va solo (showToast del juego web). */
class ToastState {
    var message by mutableStateOf<String?>(null)
        private set
    private var serial by mutableStateOf(0)
    fun show(text: String) { message = text; serial++ }
    @Composable
    fun Host(modifier: Modifier = Modifier) {
        val text = message ?: return
        LaunchedEffect(serial) { delay(1800); message = null }
        Box(modifier.paperPanel(radius = 18.dp).padding(horizontal = 22.dp, vertical = 10.dp)) {
            BasicText(text, style = Fonts.body(19f, FontWeight.Medium).copy(textAlign = TextAlign.Center))
        }
    }
}
