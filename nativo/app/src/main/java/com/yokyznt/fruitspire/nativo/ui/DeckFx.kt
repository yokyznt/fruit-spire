package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.DeckChange
import com.yokyznt.fruitspire.core.data.Card
import com.yokyznt.fruitspire.core.data.Cards
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

// ---------------------------------------------------------------------------------------------------------------
// Cartas del mazo que cambian (transformar, madurar, quitar, entrar): `.dc-*` de css/loot.css y `deckChangesHtml` de js/loot.js.
// Todos los tiempos de las curvas son segundos desde que aparece el cambio.
// ---------------------------------------------------------------------------------------------------------------

/** Cómo va una carta del cambio (`.dc-card`) en un instante: tamaño, giros (grados), caída (dp) y opacidad. */
class DcPose(val scale: Float, val rotY: Float, val rotZ: Float, val dy: Float, val alpha: Float)

/** Un destello (`.dc-burst i`): qué tan lejos del centro (dp), su tamaño y su opacidad. */
class DcBurst(val distance: Float, val scale: Float, val alpha: Float)

private val CssEaseIn = CubicBezierEasing(.42f, 0f, 1f, 1f)
private val CssEaseOut = CubicBezierEasing(0f, 0f, .58f, 1f)
private val CssEase = CubicBezierEasing(.25f, .1f, .25f, 1f)
private val SiteEaseOut = CubicBezierEasing(.22f, 1f, .36f, 1f) // --ease-out
private val SiteEaseBack = CubicBezierEasing(.34f, 1.36f, .64f, 1f) // --ease-back

/** Cuándo termina todo (la etiqueta acaba de aparecer a los 2,0 s). */
const val DC_TOTAL_S = 2.1f

private fun lerp(a: Float, b: Float, k: Float) = a + (b - a) * k

private val RemoveAt = floatArrayOf(0f, .25f, .4f, .55f, 1f)

/** La carta que sale: al transformar o madurar gira 90° y se va (0,7 s tras 0,6 s); al quitar tiembla y cae desvaneciéndose (1,3 s tras 0,6 s). */
fun dcFromPose(kind: String, t: Float): DcPose {
    if (kind == "remove") {
        val p = ((t - .6f) / 1.3f).coerceIn(0f, 1f)
        return DcPose(
            scale = keyed(p, RemoveAt, floatArrayOf(.66f, .66f, .66f, .66f, .4f), CssEaseIn),
            rotY = 0f,
            rotZ = keyed(p, RemoveAt, floatArrayOf(0f, -4f, 4f, -2f, 12f), CssEaseIn),
            dy = keyed(p, RemoveAt, floatArrayOf(0f, 0f, 0f, 0f, 120f), CssEaseIn),
            alpha = keyed(p, floatArrayOf(0f, 1f), floatArrayOf(1f, 0f), CssEaseIn)
        )
    }
    val p = ((t - .6f) / .7f).coerceIn(0f, 1f)
    val e = CssEaseIn.transform(p)
    return DcPose(
        lerp(.66f, .5f, e), lerp(0f, 90f, e), 0f, 0f,
        keyed(p, floatArrayOf(0f, .6f, 1f), floatArrayOf(1f, 1f, 0f), CssEaseIn)
    )
}

/** La carta que llega: al transformar o madurar gira de −90° a 0 (0,7 s tras 1,25 s); al entrar cae desde arriba (0,8 s tras 0,5 s). */
fun dcToPose(kind: String, t: Float): DcPose {
    if (kind == "add") {
        val p = ((t - .5f) / .8f).coerceIn(0f, 1f)
        val e = SiteEaseBack.transform(p)
        return DcPose(lerp(.5f, .66f, e), 0f, lerp(-14f, 0f, e), lerp(-220f, 0f, e), e)
    }
    val p = ((t - 1.25f) / .7f).coerceIn(0f, 1f)
    return DcPose(
        scale = keyed(p, floatArrayOf(0f, .7f, 1f), floatArrayOf(.5f, .74f, .66f), SiteEaseOut),
        rotY = keyed(p, floatArrayOf(0f, .7f, 1f), floatArrayOf(-90f, 0f, 0f), SiteEaseOut),
        rotZ = 0f, dy = 0f,
        alpha = keyed(p, floatArrayOf(0f, .3f, 1f), floatArrayOf(0f, 1f, 1f), SiteEaseOut)
    )
}

/** Los ocho destellos salen al transformar, madurar o entrar (no al quitar): 0,9 s tras 1,15 s, hasta 95 dp del centro. Null si no hay. */
fun dcBurst(kind: String, t: Float): DcBurst? {
    if (kind == "remove") return null
    val p = (t - 1.15f) / .9f
    if (p < 0f || p >= 1f) return null
    return DcBurst(
        distance = 95f * CssEaseOut.transform(p),
        scale = lerp(.4f, 1f, CssEaseOut.transform(p)),
        alpha = keyed(p, floatArrayOf(0f, .6f, 1f), floatArrayOf(1f, 1f, 0f), CssEaseOut)
    )
}

/** La etiqueta con los nombres aparece al final (0,4 s tras 1,6 s). */
fun dcLabelAlpha(t: Float): Float = CssEase.transform(((t - 1.6f) / .4f).coerceIn(0f, 1f))

private val Yellow = Color(0xFFFFCF4D)
private val Pink = Color(0xFFF2A0C8)
private val Mint = Color(0xFF8FDCC0)

/** El color del destello número [n] (1 a 8), como `nth-child` de la web; al madurar todos son amarillos. */
private fun burstColor(kind: String, n: Int): Color = when {
    kind == "upgrade" -> Yellow
    n % 3 == 0 -> Mint
    n % 2 == 0 -> Pink
    else -> Yellow
}

/** Un cambio del mazo con su animación: la vieja y la nueva se turnan en el mismo sitio, con destellos y la etiqueta al final. */
@Composable
fun DeckChangeView(ch: DeckChange) {
    val clock = remember { Animatable(0f) }
    LaunchedEffect(Unit) { clock.animateTo(DC_TOTAL_S, tween((DC_TOTAL_S * 1000).toInt(), easing = LinearEasing)) }
    val from = ch.from?.let { Cards.get(it) }
    val to = ch.to?.let { Cards.get(it) }
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(124.dp, 172.dp), contentAlignment = Alignment.Center) {
            if (from != null) DcCard(from, ch.kind, clock, isFrom = true, glow = null)
            if (to != null) DcCard(to, ch.kind, clock, isFrom = false, glow = if (ch.kind == "upgrade") Ink.mint else null)
            Canvas(Modifier.fillMaxSize()) {
                val b = dcBurst(ch.kind, clock.value) ?: return@Canvas
                for (n in 1..8) {
                    val a = (n - 1) * 45.0 * PI / 180.0
                    val d = b.distance * density
                    val c = Offset(center.x + (sin(a) * d).toFloat(), center.y - (cos(a) * d).toFloat())
                    val r = 7.dp.toPx() * b.scale
                    val color = burstColor(ch.kind, n)
                    drawCircle(color.copy(alpha = .35f * b.alpha), r * 1.9f, c) // el resplandor
                    drawCircle(color.copy(alpha = b.alpha), r, c)
                }
            }
        }
        Column(
            Modifier.graphicsLayer {
                val a = dcLabelAlpha(clock.value)
                alpha = a
                translationY = 6f * density * (1f - a)
            },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val name = { id: String? -> Cards.get(id ?: "")?.name ?: "" }
            val title = if (ch.kind == "transform") "${name(ch.from)} → ${name(ch.to)}" else name(ch.to ?: ch.from)
            BasicText(title, style = Fonts.hand(21f).copy(textAlign = TextAlign.Center))
            val (label, color) = when (ch.kind) {
                "transform" -> "se transformó" to Ink.inkSoft
                "upgrade" -> "¡madurada!" to Color(0xFFB8860B)
                "remove" -> "salió de tu mazo" to Color(0xFFB0394C)
                else -> "entró a tu mazo" to Ink.inkSoft
            }
            BasicText(label, style = Fonts.body(15f, color = color))
        }
    }
}

/** Una carta del cambio, en su sitio (centro del escenario), con la pose que toca a los [clock] segundos. */
@Composable
private fun DcCard(card: Card, kind: String, clock: Animatable<Float, *>, isFrom: Boolean, glow: Color?) {
    Box(
        Modifier.requiredSize(CARD_W.dp, CARD_H.dp).graphicsLayer {
            val p = if (isFrom) dcFromPose(kind, clock.value) else dcToPose(kind, clock.value)
            scaleX = p.scale; scaleY = p.scale
            rotationY = p.rotY; rotationZ = p.rotZ
            translationY = p.dy * density
            cameraDistance = 700f * density
            alpha = p.alpha.coerceIn(0f, 1f)
            // sin capa de opacidad: el contorno de la carta dibuja fuera de sus límites y se recortaría
            compositingStrategy = CompositingStrategy.ModulateAlpha
        }
    ) { CardView(card, glow = glow) }
}
