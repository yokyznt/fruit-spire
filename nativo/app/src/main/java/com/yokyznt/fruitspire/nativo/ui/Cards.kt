package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.PreviewResult
import com.yokyznt.fruitspire.core.data.Card
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.SeedDef
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

const val CARD_W = 176f
const val CARD_H = 250f

private val EaseOutSoft = CubicBezierEasing(.22f, 1f, .36f, 1f)
private val EaseInOutSoft = CubicBezierEasing(.65f, 0f, .35f, 1f)

/** Colores de cada tipo de carta: (fuerte, suave). */
fun cardTypeColors(type: String): Pair<Color, Color> = when (type) {
    "attack" -> Ink.strawberry to Ink.strawberrySoft
    "skill" -> Ink.mint to Ink.mintSoft
    "power" -> Ink.grape to Ink.grapeSoft
    else -> Ink.peach to Ink.peachSoft
}

private val TYPE_LABELS = mapOf("attack" to "ataque", "skill" to "habilidad", "power" to "poder", "curse" to "maldición", "status" to "estado")

/** Marco de carta o ficha: sombra, contorno de tinta y relleno blanco con esquinas redondas. */
fun Modifier.stickerCard(radius: Dp = 16.dp, fill: Color = Ink.edge, glow: Color? = null): Modifier = drawBehind {
    val r = radius.toPx()
    val ink = 2.dp.toPx()
    if (!Fx.lite) drawRoundRect(Color(0x2E4A3428), Offset(2.dp.toPx(), 4.dp.toPx()), size, CornerRadius(r)) // «Gráficos: Rápidos»: sin sombra
    if (glow != null && !Fx.lite) {
        val g = 6.dp.toPx()
        drawRoundRect(glow.copy(alpha = .5f), Offset(-g, -g), Size(size.width + g * 2, size.height + g * 2), CornerRadius(r + g))
    }
    drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(r + ink))
    drawRoundRect(fill, Offset.Zero, size, CornerRadius(r))
}

/** Dibujo de fondo de la ilustración de una carta (puntos, rayas o lunares según el tipo). */
private fun DrawScope.cardArtPattern(type: String, strong: Color) {
    when (type) {
        "attack" -> {
            val step = 14.dp.toPx()
            var y = step / 2
            while (y < size.height) {
                var x = step / 2
                while (x < size.width) { drawCircle(strong.copy(alpha = .22f), 2.5.dp.toPx(), Offset(x, y)); x += step }
                y += step
            }
        }
        "skill" -> {
            val step = 12.dp.toPx()
            var x = -size.height
            while (x < size.width) {
                drawLine(strong.copy(alpha = .2f), Offset(x, size.height), Offset(x + size.height, 0f), strokeWidth = 6.dp.toPx() * .75f)
                x += step
            }
        }
        "power" -> {
            val step = 22.dp.toPx()
            var y = 0f
            while (y < size.height + step) {
                var x = 0f
                while (x < size.width + step) {
                    drawCircle(strong.copy(alpha = .3f), 3.dp.toPx(), Offset(x + step * .25f, y + step * .3f))
                    drawCircle(strong.copy(alpha = .3f), 3.dp.toPx(), Offset(x + step * .75f, y + step * .7f))
                    x += step
                }
                y += step
            }
        }
    }
}

/**
 * Una carta del juego (renderCardHtml): 176×250 px de diseño. Con [preview] los números de daño y cáscara
 * muestran el valor real. [dimmed] la apaga (no se puede jugar).
 */
@Composable
fun CardView(
    card: Card,
    modifier: Modifier = Modifier,
    preview: PreviewResult? = null,
    dimmed: Boolean = false,
    glow: Color? = null
) {
    val (strong, soft) = cardTypeColors(card.type)
    val desc = remember(card.id, preview) { gameText(card.description, preview) }
    Box(modifier.size(CARD_W.dp, CARD_H.dp).stickerCard(glow = glow)) {
        Column(Modifier.fillMaxSize().padding(5.dp)) {
            // ilustración
            Box(
                Modifier.fillMaxWidth().height(104.dp)
                    .clip(RoundedCornerShape(11.dp, 11.dp, 7.dp, 7.dp))
                    .drawBehind { drawRect(soft); cardArtPattern(card.type, strong) },
                contentAlignment = Alignment.Center
            ) {
                if (SpriteStore.has(card.sprite)) Sprite(card.sprite, 88.dp)
                else BasicText(card.art, style = Fonts.body(54f))
                card.character?.let { Sprite(it, 24.dp, Modifier.align(Alignment.BottomStart).padding(2.dp)) }
            }
            // nombre
            Box(Modifier.fillMaxWidth().height(46.dp).padding(horizontal = 4.dp), contentAlignment = Alignment.Center) {
                BasicText(
                    card.name, style = Fonts.display(20.7f).copy(textAlign = TextAlign.Center, lineHeight = 21.sp), maxLines = 2,
                    autoSize = TextAutoSize.StepBased(12.sp, 20.7.sp, .5.sp)
                )
            }
            // tipo
            Box(Modifier.align(Alignment.CenterHorizontally).clip(RoundedCornerShape(50)).drawBehind { drawRect(strong) }.padding(horizontal = 10.dp)) {
                BasicText(TYPE_LABELS[card.type] ?: card.type, style = Fonts.hand(16.5f))
            }
            // descripción
            Box(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 4.dp, vertical = 3.dp), contentAlignment = Alignment.Center) {
                GameText(
                    desc, Fonts.body(15.5f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp), Modifier.fillMaxWidth(),
                    autoSize = TextAutoSize.StepBased(9.sp, 15.5.sp, .5.sp)
                )
            }
        }
        if (!card.unplayable) CostBulb(card.cost, Modifier.offset((-14).dp, (-14).dp))
        val stars = if (card.rarity == "rare") "★★" else if (card.rarity == "uncommon") "★" else ""
        if (stars.isNotEmpty()) {
            OutlinedText(stars, Fonts.body(15f, FontWeight.Bold, Ink.banana), Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 12.dp), inkWidth = 1.dp, edgeWidth = 0.5.dp)
        }
        if (dimmed) Box(Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)).drawBehind { drawRect(Color(0x66FBF4E4)) })
    }
}

/** La gotita naranja con el costo de una carta. */
@Composable
fun CostBulb(cost: Int, modifier: Modifier = Modifier) {
    Box(
        modifier.size(40.dp, 44.dp).rotate(-8f).drawBehind {
            val ink = 2.dp.toPx()
            val edge = 3.dp.toPx()
            drawOval(Ink.ink, Offset(-ink - edge, -ink - edge), Size(size.width + 2 * (ink + edge), size.height + 2 * (ink + edge)))
            drawOval(Ink.edge, Offset(-edge, -edge), Size(size.width + 2 * edge, size.height + 2 * edge))
            drawOval(Ink.orange, Offset.Zero, size)
        },
        contentAlignment = Alignment.Center
    ) { BasicText(cost.toString(), style = Fonts.display(26f)) }
}

/** Carta de objeto (relicCardHtml): dibujo, nombre y lo que hace. */
@Composable
fun RelicCardView(relic: RelicDef, modifier: Modifier = Modifier, dimmed: Boolean = false) {
    val boss = relic.tier == "boss"
    val desc = remember(relic.id) { gameText(relic.description) }
    Box(
        modifier.size(CARD_W.dp, CARD_H.dp)
            .stickerCard(fill = if (boss) Color(0xFFFFF8E1) else Ink.edge, glow = if (boss) Ink.banana else null)
            .clip(RoundedCornerShape(16.dp))
            .drawBehind {
                val step = 14.dp.toPx()
                var y = step / 2
                while (y < size.height) {
                    var x = step / 2
                    while (x < size.width) { drawCircle(Ink.banana.copy(alpha = .3f), 2.5.dp.toPx(), Offset(x, y)); x += step }
                    y += step
                }
            }
    ) {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            if (SpriteStore.has(relic.id)) Sprite(relic.id, 86.dp) else BasicText(relic.icon, style = Fonts.body(54f))
            Box(Modifier.fillMaxWidth().height(52.dp).padding(top = 6.dp), contentAlignment = Alignment.Center) {
                BasicText(
                    relic.name, style = Fonts.display(21.6f).copy(textAlign = TextAlign.Center, lineHeight = 22.sp), maxLines = 2,
                    autoSize = TextAutoSize.StepBased(12.sp, 21.6.sp, .5.sp)
                )
            }
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                GameText(desc, Fonts.body(15.8f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp), Modifier.fillMaxWidth(), autoSize = TextAutoSize.StepBased(9.sp, 15.8.sp, .5.sp))
            }
        }
        if (dimmed) Box(Modifier.fillMaxSize().drawBehind { drawRect(Color(0x66FBF4E4)) })
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Semillas: una gota de color con una marca dentro (seedArt de js/render.js)
// ---------------------------------------------------------------------------------------------------------------
private val SEED_DROP: Path by lazy {
    Path().apply {
        moveTo(50f, 6f)
        cubicTo(74f, 22f, 86f, 44f, 86f, 62f)
        arcTo(Rect(14f, 28f, 86f, 96f), 0f, 180f, false)
        cubicTo(14f, 44f, 26f, 22f, 50f, 6f)
        close()
    }
}

private val MARK_PATHS: Map<String, String> = mapOf(
    "fire" to "M50 22c8 12 16 18 16 30a16 16 0 0 1-32 0c0-8 5-12 8-18 2 6 4 8 7 9 1-8 0-14 1-21z",
    "heart" to "M50 70C30 56 26 46 30 38c4-8 15-8 20 1 5-9 16-9 20-1 4 8 0 18-20 32z",
    "shield" to "M50 24l20 8v14c0 14-9 22-20 27-11-5-20-13-20-27V32z",
    "bolt" to "M55 20L34 54h14l-5 26 23-36H52z",
    "drop" to "M50 22c10 16 18 24 18 34a18 18 0 0 1-36 0c0-10 8-18 18-34z",
    "swirl" to "M50 30a18 18 0 1 1-18 18h8a10 10 0 1 0 10-10z",
    "burst" to "M50 22l6 16 16-6-8 15 14 9-17 3 2 17-13-11-13 11 2-17-17-3 14-9-8-15 16 6z",
    "snow" to "M47 22h6v56h-6zM23 47h54v6H23zM30 30l4-4 36 40-4 4zM66 26l4 4-36 40-4-4z",
    "up" to "M50 22l20 22H58v30H42V44H30z",
    "star" to "M50 20l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z",
    "spikes" to "M28 74l8-32 8 22 6-34 6 34 8-22 8 32z"
)
private val MARK_CACHE = HashMap<String, Path>()
private fun markPath(mark: String): Path? {
    val data = MARK_PATHS[mark] ?: return null
    return MARK_CACHE.getOrPut(mark) { PathParser().parsePathString(data).toPath() }
}

private fun DrawScope.drawMark(mark: String) {
    val path = markPath(mark)
    val dark = Color(0xFF3A2A1E)
    if (path != null) {
        drawPath(path, Color.White)
        drawPath(path, dark, style = Stroke(4f, join = StrokeJoin.Round))
        return
    }
    when (mark) {
        "cards" -> {
            rotate(-12f, Offset(41f, 45f)) { drawRoundRect(Color.White, Offset(30f, 30f), Size(22f, 30f), CornerRadius(4f)); drawRoundRect(dark, Offset(30f, 30f), Size(22f, 30f), CornerRadius(4f), style = Stroke(4f)) }
            rotate(10f, Offset(57f, 45f)) { drawRoundRect(Color.White, Offset(46f, 30f), Size(22f, 30f), CornerRadius(4f)); drawRoundRect(dark, Offset(46f, 30f), Size(22f, 30f), CornerRadius(4f), style = Stroke(4f)) }
        }
        "clock" -> {
            drawCircle(Color.White, 22f, Offset(50f, 50f)); drawCircle(dark, 22f, Offset(50f, 50f), style = Stroke(4f))
            drawLine(dark, Offset(50f, 36f), Offset(50f, 51f), 6f, StrokeCap.Round); drawLine(dark, Offset(50f, 51f), Offset(60f, 57f), 6f, StrokeCap.Round)
        }
        "skull" -> {
            val p = Path().apply { moveTo(30f, 52f); arcTo(Rect(30f, 34f, 70f, 70f), 180f, 180f, false); lineTo(70f, 61f); lineTo(60f, 61f); lineTo(60f, 70f); lineTo(40f, 70f); lineTo(40f, 61f); lineTo(30f, 61f); close() }
            drawPath(p, Color.White); drawPath(p, dark, style = Stroke(4f, join = StrokeJoin.Round))
            drawCircle(dark, 4.5f, Offset(42f, 52f)); drawCircle(dark, 4.5f, Offset(58f, 52f))
        }
        "mirror" -> {
            drawOval(Color.White, Offset(33f, 23f), Size(34f, 46f)); drawOval(dark, Offset(33f, 23f), Size(34f, 46f), style = Stroke(4f))
            drawRoundRect(Color.White, Offset(45f, 68f), Size(10f, 14f), CornerRadius(2f)); drawRoundRect(dark, Offset(45f, 68f), Size(10f, 14f), CornerRadius(2f), style = Stroke(4f))
        }
        "ghost" -> {
            val p = Path().apply { moveTo(32f, 76f); lineTo(32f, 48f); arcTo(Rect(32f, 26f, 68f, 70f), 180f, 180f, false); lineTo(68f, 76f); lineTo(59f, 69f); lineTo(50f, 76f); lineTo(41f, 69f); close() }
            drawPath(p, Color.White); drawPath(p, dark, style = Stroke(4f, join = StrokeJoin.Round))
            drawCircle(dark, 3.4f, Offset(43f, 48f)); drawCircle(dark, 3.4f, Offset(57f, 48f))
        }
        "dice" -> {
            drawRoundRect(Color.White, Offset(30f, 30f), Size(40f, 40f), CornerRadius(9f)); drawRoundRect(dark, Offset(30f, 30f), Size(40f, 40f), CornerRadius(9f), style = Stroke(4f))
            listOf(41f to 41f, 59f to 59f, 50f to 50f, 59f to 41f, 41f to 59f).forEach { (x, y) -> drawCircle(dark, 4f, Offset(x, y)) }
        }
        "flower" -> {
            listOf(50f to 34f, 66f to 50f, 50f to 66f, 34f to 50f).forEach { (x, y) -> drawCircle(Color.White, 10f, Offset(x, y)); drawCircle(dark, 10f, Offset(x, y), style = Stroke(3f)) }
            drawCircle(Ink.banana, 9f, Offset(50f, 50f))
        }
        else -> { val p = markPath("star")!!; drawPath(p, Color.White); drawPath(p, dark, style = Stroke(4f, join = StrokeJoin.Round)) }
    }
}

/** Una semilla dibujada: gota del color de la semilla con su marca blanca. [size] es el lado del dibujo. */
@Composable
fun SeedArt(seed: SeedDef, size: Dp, modifier: Modifier = Modifier, silhouette: Boolean = false) {
    val color = remember(seed.color) { Color(android.graphics.Color.parseColor(seed.color)) }
    Canvas(modifier.size(size)) {
        val k = this.size.minDimension / 100f
        if (silhouette) { // una semilla que aún no encuentras: solo su mancha oscura
            scale(k, k, pivot = Offset.Zero) {
                drawPath(SEED_DROP, Color.Black.copy(alpha = .28f))
                drawPath(SEED_DROP, Color.Black.copy(alpha = .28f), style = Stroke(5f, join = StrokeJoin.Round))
            }
            return@Canvas
        }
        scale(k, k, pivot = Offset.Zero) {
            drawPath(SEED_DROP, color)
            drawPath(SEED_DROP, Color(0xFF3A2A1E), style = Stroke(5f, join = StrokeJoin.Round))
            val hl = Path().apply { moveTo(36f, 26f); relativeCubicTo(-6f, 8f, -10f, 16f, -11f, 26f) }
            drawPath(hl, Color.White.copy(alpha = .55f), style = Stroke(6f, cap = StrokeCap.Round))
            // la marca va chica, abajo del centro
            scale(.55f, .55f, pivot = Offset(50f, 50f)) {
                translate(0f, 12f) { drawMark(seed.mark) }
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Barra de vida de "jugo": relleno rayado, estela clara que baja después y cifras encima
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun HpBar(hp: Int, maxHp: Int, modifier: Modifier = Modifier, height: Dp = 28.dp, showText: Boolean = true, delayMs: Int = 0, textScale: Float = .52f) {
    val target = if (maxHp <= 0) 0f else (hp.toFloat() / maxHp).coerceIn(0f, 1f)
    val fill = remember { Animatable(target) }
    val ghost = remember { Animatable(target) }
    LaunchedEffect(target) {
        launch { delay(delayMs.toLong()); fill.animateTo(target, tween(500, easing = EaseOutSoft)) }
        launch { delay(delayMs.toLong() + 400); ghost.animateTo(target, tween(800, easing = EaseInOutSoft)) }
    }
    Box(modifier.height(height)) {
        Canvas(Modifier.fillMaxSize()) {
            val r = size.height / 2f
            val stroke = (if (height >= 30.dp) 3.5.dp else 2.5.dp).toPx()
            val clip = Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, size.width, size.height, CornerRadius(r))) }
            clipPath(clip) {
                drawRect(Ink.strawberrySoft)
                // estela: lo que acaba de perder
                if (ghost.value > fill.value) drawRect(Color(0xFFFFF6F7), Offset.Zero, Size(size.width * ghost.value, size.height))
                val w = size.width * fill.value
                if (w > 0f) {
                    clipPath(Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, w, size.height, CornerRadius(r))) }) {
                        drawRect(Ink.strawberry, Offset.Zero, Size(w, size.height))
                        val step = 16.dp.toPx()
                        var x = -size.height
                        while (x < w) {
                            drawLine(Color(0xFFF58296), Offset(x, size.height), Offset(x + size.height, 0f), strokeWidth = step / 2f)
                            x += step
                        }
                    }
                }
            }
            drawRoundRect(Ink.ink, Offset(stroke / 2, stroke / 2), Size(size.width - stroke, size.height - stroke), CornerRadius(r), style = Stroke(stroke))
        }
        if (showText) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                OutlinedText("$hp/$maxHp", Fonts.body(height.value * textScale, FontWeight.Bold), inkWidth = 0.dp, edgeWidth = if (textScale > .55f) 2.5.dp else 1.5.dp)
            }
        }
    }
}
