package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.data.Seeds
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

// ---------------------------------------------------------------------------------------------------------------
// Premios que vuelan a la barra de arriba (flyGhost de js/fx.js) y el brinco de la barra al recibirlos (hud-gain de css/loot.css)
// ---------------------------------------------------------------------------------------------------------------

/** Dónde está cada casilla de la barra (oro, vida, mochila, mazo) en píxeles de la pantalla. No es observable: se lee al lanzar un vuelo. */
class HudAnchors {
    val rects = HashMap<String, Rect>()
}

val LocalHudAnchors = compositionLocalOf { HudAnchors() }

/** Dónde está cada premio por recoger ("loot:N", "card:ID"), para saber desde dónde sale su vuelo. */
val LocalLootRects = compositionLocalOf { HashMap<String, Rect>() }

/** Anota la posición en pantalla de un premio bajo [key]. */
fun Modifier.noteLootRect(rects: HashMap<String, Rect>, key: String): Modifier = onGloballyPositioned { rects[key] = it.boundsInRoot() }

/**
 * Un premio en el aire. [goldGain], [hpGain], [maxHpGain] y [deckGain] son lo que cambió de verdad la partida al recogerlo:
 * la barra muestra «real − lo que aún vuela» y sube cuando el premio llega.
 */
@Immutable
class Flight(
    val id: Int, val kind: String, val itemId: String?, val from: Rect,
    val goldGain: Int = 0, val hpGain: Int = 0, val maxHpGain: Int = 0, val deckGain: Int = 0
) {
    val relicGain: Int get() = if (kind == "relic") 1 else 0
}

/** A qué casilla de la barra va cada tipo de premio. */
fun flightTarget(kind: String): String = when (kind) {
    "gold" -> "gold"
    "heal", "maxhp" -> "hp"
    "relic", "seed" -> "bag"
    else -> "deck"
}

/** Cómo va el premio en el aire: desplazamiento, giro, tamaño y opacidad. */
class FlyPose(val tx: Float, val ty: Float, val rot: Float, val scale: Float, val alpha: Float)

private val FlyEase = CubicBezierEasing(.45f, 0f, .3f, 1f)

/**
 * La curva de la web: sube en arco (a 40 % va por (.3·dx, .3·dy − [arc])) y se encoge hasta 0,12 al llegar.
 * [p] es el avance 0..1 del tiempo; la suavización ya va dentro. dx, dy y [arc] en la misma unidad que el resultado.
 */
fun flyPose(p: Float, dx: Float, dy: Float, arc: Float): FlyPose {
    val e = FlyEase.transform(p.coerceIn(0f, 1f))
    fun lerp(a: Float, b: Float, k: Float) = a + (b - a) * k
    return if (e < .4f) {
        val k = e / .4f
        FlyPose(lerp(0f, dx * .3f, k), lerp(0f, dy * .3f - arc, k), lerp(0f, -8f, k), lerp(1f, .8f, k), 1f)
    } else {
        val k = (e - .4f) / .6f
        FlyPose(lerp(dx * .3f, dx, k), lerp(dy * .3f - arc, dy, k), lerp(-8f, 14f, k), lerp(.8f, .12f, k), lerp(1f, .4f, k))
    }
}

const val FLY_MS = 720

/** La capa donde vuelan los premios, por encima de la pantalla y de la barra. [onLand] se llama cuando uno llega. */
@Composable
fun FlyLayer(flights: List<Flight>, anchors: HudAnchors, onLand: (Int) -> Unit) {
    Box(Modifier.fillMaxSize()) {
        flights.forEach { f -> androidx.compose.runtime.key(f.id) { FlightView(f, anchors, onLand) } }
    }
}

@Composable
private fun FlightView(f: Flight, anchors: HudAnchors, onLand: (Int) -> Unit) {
    val t = remember { Animatable(0f) }
    val target = anchors.rects[flightTarget(f.kind)]
    LaunchedEffect(f.id) {
        if (target != null) t.animateTo(1f, tween(FLY_MS, easing = LinearEasing))
        onLand(f.id)
    }
    if (target == null) return
    val density = LocalDensity.current.density
    Box(
        Modifier.offset { IntOffset(f.from.center.x.roundToInt(), f.from.center.y.roundToInt()) }
            .wrapContentSize(Alignment.TopStart, unbounded = true)
            .graphicsLayer {
                val dx = target.center.x - f.from.center.x
                val dy = target.center.y - f.from.center.y
                val pose = flyPose(t.value, dx, dy, 90f * density)
                translationX = -size.width / 2f + pose.tx
                translationY = -size.height / 2f + pose.ty
                rotationZ = pose.rot
                scaleX = pose.scale; scaleY = pose.scale
                alpha = pose.alpha
            }
    ) {
        when (f.kind) {
            "gold" -> Sprite("ui_coin", 60.dp)
            "heal", "maxhp" -> Sprite("ui_heart", 68.dp)
            "relic" -> Sprite(f.itemId ?: "", 68.dp)
            "seed" -> Seeds.get(f.itemId ?: "")?.let { SeedArt(it, 60.dp) }
            else -> CardBack(56.dp, 80.dp)
        }
    }
}

/** Escala y giro del brinco `hud-gain`: 0,55 s, sube a 1,18 (y −3°) a un tercio y vuelve. [t] es el avance 0..1. */
fun gainBump(t: Float): Pair<Float, Float> {
    val q = if (t < .35f) t / .35f else 1f - (t - .35f) / .65f
    val k = q.coerceIn(0f, 1f)
    return (1f + .18f * k) to (-3f * k)
}

/**
 * Una casilla de la barra: al subir su [value] da el brinco y suelta un «+N» que flota; además se registra como ancla
 * [anchor] para que los premios sepan adónde volar.
 */
@Composable
fun HudGain(value: Int, color: Color, anchor: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val anchors = LocalHudAnchors.current
    var prev by remember { mutableIntStateOf(value) }
    var delta by remember { mutableIntStateOf(0) }
    val bump = remember { Animatable(1f) }
    val rise = remember { Animatable(1f) }
    LaunchedEffect(value) {
        if (value > prev) {
            delta = value - prev
            prev = value
            coroutineScope {
                launch { bump.snapTo(0f); bump.animateTo(1f, tween(550, easing = LinearEasing)) }
                launch { rise.snapTo(0f); rise.animateTo(1f, tween(1400, easing = LinearEasing)) }
            }
        } else prev = value
    }
    Box(modifier.onGloballyPositioned { anchors.rects[anchor] = it.boundsInRoot() }) {
        Box(Modifier.graphicsLayer {
            val (s, r) = gainBump(bump.value)
            scaleX = s; scaleY = s; rotationZ = r
        }) { content() }
        if (rise.value < 1f && delta > 0) {
            Box(
                Modifier.align(Alignment.BottomCenter).wrapContentSize(Alignment.TopCenter, unbounded = true)
                    .graphicsLayer {
                        translationY = (6f + 34f * rise.value) * density
                        alpha = if (rise.value < .6f) 1f else 1f - (rise.value - .6f) / .4f
                    }
            ) { OutlinedText("+$delta", Fonts.display(28f, color), inkWidth = 0.dp, edgeWidth = 3.dp) }
        }
    }
}
