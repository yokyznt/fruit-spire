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

/** «Continuar» tocado con premios sin recoger: sube [tick] y los premios se menean (lootNudge). */
class LootNudge {
    var tick by mutableIntStateOf(0)
    fun hit() { tick++ }
}

val LocalLootNudge = compositionLocalOf { LootNudge() }

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

// ---------------------------------------------------------------------------------------------------------------
// Tienda: el hueco que se cierra al comprar (soldOut), el temblor al no alcanzar (shakeSoft) y el gasto del oro (coinSpend)
// ---------------------------------------------------------------------------------------------------------------

/** Un artículo recién comprado: su hueco se cierra mientras él vuela a la barra. [group] es "card", "relic" o "seed"; [index] su sitio en esa fila. */
@Immutable
class ShopSale(val id: Int, val group: String, val index: Int, val itemId: String, val price: Int, val sale: Boolean = false)

/** Una compra negada: el artículo [key] ("card:2", "relic:0", "seed:1", "remove") tiembla; [tick] cambia con cada negativa. */
@Immutable
class ShopNope(val key: String, val tick: Int)

/** Un sitio de una fila de la tienda: el artículo vivo número [live], o (si [live] es −1) el hueco de [ghost] que se está cerrando. */
class ShopSlot(val live: Int, val ghost: ShopSale?)

/** El orden de una fila: los [live] artículos y, en su sitio, el hueco de cada compra reciente (antes del que ocupó su lugar). */
fun shopSlots(live: Int, ghosts: List<ShopSale>): List<ShopSlot> {
    val sorted = ghosts.sortedWith(compareBy({ it.index }, { it.id }))
    val out = ArrayList<ShopSlot>(live + sorted.size)
    var g = 0
    for (k in 0 until live) {
        while (g < sorted.size && sorted[g].index <= k) out.add(ShopSlot(-1, sorted[g++]))
        out.add(ShopSlot(k, null))
    }
    while (g < sorted.size) out.add(ShopSlot(-1, sorted[g++]))
    return out
}

/** Cómo va el hueco de lo comprado: opacidad, tamaño y qué parte de su ancho (con la separación) sigue ocupando. */
class SoldPose(val alpha: Float, val scale: Float, val width: Float)

const val SOLD_MS = 400
const val SHAKE_MS = 450

private val EaseInOut = CubicBezierEasing(.65f, 0f, .35f, 1f)
private val EaseOut = CubicBezierEasing(.22f, 1f, .36f, 1f)

/** `soldOut`: transparente y a 0,8 a un 35 %, luego se encoge a 0,6 mientras el ancho se cierra del todo (ease-in-out por tramo). */
fun soldPose(t: Float): SoldPose {
    val p = t.coerceIn(0f, 1f)
    return if (p < .35f) {
        val e = EaseInOut.transform(p / .35f)
        SoldPose(1f - e, 1f - .2f * e, 1f)
    } else {
        val e = EaseInOut.transform((p - .35f) / .65f)
        SoldPose(0f, .8f - .2f * e, 1f - e)
    }
}

/** Valor entre los fotogramas clave [at]/[values] en [t] (0..1), con una suavización [ease] en cada tramo. */
internal fun keyed(t: Float, at: FloatArray, values: FloatArray, ease: CubicBezierEasing): Float {
    val p = t.coerceIn(0f, 1f)
    for (i in 1 until at.size) if (p <= at[i]) {
        val k = ease.transform((p - at[i - 1]) / (at[i] - at[i - 1]))
        return values[i - 1] + (values[i] - values[i - 1]) * k
    }
    return values.last()
}

private val ShakeAt = floatArrayOf(0f, .2f, .45f, .7f, 1f)
private val ShakeVals = floatArrayOf(0f, -8f, 7f, -3f, 0f)

/** `shakeSoft`: cuánto se corre hacia un lado (en dp) a los [t] (0..1) de 0,45 s. */
fun shakeSoft(t: Float): Float = keyed(t, ShakeAt, ShakeVals, EaseOut)

private val SpendAt = floatArrayOf(0f, .4f, 1f)
private val SpendVals = floatArrayOf(0f, 1f, 0f)

/** `coinSpend`: 0 en reposo y 1 a los 40 % de 0,45 s (entonces la casilla del oro va a −3°, escala 1,15 y se pinta de banana). */
fun spendPulse(t: Float): Float = keyed(t, SpendAt, SpendVals, EaseOut)

// ---------------------------------------------------------------------------------------------------------------
// Combate: el pulso de la energía y de la mochila (deckBump), el objeto que salta (relicPop) y las motas (splatOut)
// ---------------------------------------------------------------------------------------------------------------

private val EaseBack = CubicBezierEasing(.34f, 1.36f, .64f, 1f)

/** `deckBump` (0,5 s, ease-back por tramo): tamaño y giro (grados) a los [t] (0..1). Sube a 1,18 y −5° al 40 % y baja a 0,97 al 70 %. */
fun deckBumpPose(t: Float): Pair<Float, Float> {
    val at = floatArrayOf(0f, .4f, .7f, 1f)
    return keyed(t, at, floatArrayOf(1f, 1.18f, .97f, 1f), EaseBack) to keyed(t, at, floatArrayOf(-1f, -5f, 1f, -1f), EaseBack)
}

/** Cómo va el objeto que salta sobre la mochila: opacidad, cuánto ha bajado (dp) y tamaño. */
class RelicPopPose(val alpha: Float, val dy: Float, val scale: Float)

/** `relicPop` (1,1 s, ease-out por tramo): aparece chico, baja un poco con un salto de tamaño, y se desvanece al final. */
fun relicPopPose(t: Float): RelicPopPose {
    val at = floatArrayOf(0f, .25f, .7f, 1f)
    return RelicPopPose(
        keyed(t, at, floatArrayOf(0f, 1f, 1f, 0f), EaseOut),
        keyed(t, at, floatArrayOf(-10f, 8f, 14f, 30f), EaseOut),
        keyed(t, at, floatArrayOf(.4f, 1.15f, 1f, .8f), EaseOut)
    )
}

/** Una mota que sale despedida: [move] es qué parte del camino a su destino lleva (0..1), con su tamaño y opacidad. */
class SplatPose(val move: Float, val scale: Float, val alpha: Float)

/** `splatOut` (0,6 s, ease-out): sale a 0,3 de su tamaño, llega a su destino a 1 y se desvanece del 60 % al final. */
fun splatPose(t: Float): SplatPose {
    val p = t.coerceIn(0f, 1f)
    val e = EaseOut.transform(p)
    return SplatPose(e, .3f + .7f * e, keyed(p, floatArrayOf(0f, .6f, 1f), floatArrayOf(1f, 1f, 0f), EaseOut))
}

// ---------------------------------------------------------------------------------------------------------------
// Pase y vestidor: el premio listo que flota (passReady), el nivel recién reclamado (pop) y la fruta al vestirse (dressPop)
// ---------------------------------------------------------------------------------------------------------------

private val CssEaseInOut = CubicBezierEasing(.42f, 0f, .58f, 1f)

/** `passReady` (1,6 s sin parar, ease-in-out): cuánto sube el premio listo para reclamar (dp, negativo = arriba). [t] es el avance 0..1 del ciclo. */
fun passFloat(t: Float): Float = keyed(t, floatArrayOf(0f, .5f, 1f), floatArrayOf(0f, -4f, 0f), CssEaseInOut)

/** Cómo va algo que aparece con `pop`: tamaño, giro (grados) y opacidad. */
class PopPose(val scale: Float, val rot: Float, val alpha: Float)

/** `pop` (0,5 s, ease-back): aparece a 0,3 girado −20° y llega a su tamaño, derecho y opaco. */
fun popPose(t: Float): PopPose {
    val e = EaseBack.transform(t.coerceIn(0f, 1f))
    return PopPose(.3f + .7f * e, -20f * (1f - e), e.coerceIn(0f, 1f))
}

/** `dressPop` (0,5 s, ease-back por tramo): tamaño y giro de la fruta al ponerse algo: de 0,85 y −6° a 1,08 y 3° al 60 % y de vuelta a 1. */
fun dressPopPose(t: Float): Pair<Float, Float> {
    val at = floatArrayOf(0f, .6f, 1f)
    return keyed(t, at, floatArrayOf(.85f, 1.08f, 1f), EaseBack) to keyed(t, at, floatArrayOf(-6f, 3f, 0f), EaseBack)
}

/** Cómo va el aviso: opacidad y cuánto le falta bajar (dp, negativo = más arriba de su sitio). */
class ToastPose(val alpha: Float, val dy: Float)

/** Cuánto dura el aviso en pantalla (la web lo deja 1,4 s; en el teléfono se lee con más calma). */
const val TOAST_MS = 1800

/** `toastIn`: baja 20 dp mientras aparece en el primer 15 %, se queda hasta el 80 % y se desvanece. [p] es el avance 0..1. */
fun toastPose(p: Float): ToastPose {
    val t = p.coerceIn(0f, 1f)
    return when {
        t < .15f -> ToastPose(t / .15f, -20f * (1f - t / .15f))
        t <= .8f -> ToastPose(1f, 0f)
        else -> ToastPose(1f - (t - .8f) / .2f, 0f)
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
