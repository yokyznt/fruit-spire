package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.TutorialDirector
import com.yokyznt.fruitspire.core.TutorialEnd

// ---------------------------------------------------------------------------------------------------------------
// El tutorial «Cómo jugar»: Profe Limón con su globo, marcos dorados sobre lo que explica y, en los pasos de lectura, un velo
// que traga los toques hasta «Siguiente». El resto del bloqueo (solo se puede hacer lo que el paso pide) lo hace el
// director en el núcleo (TutorialDirector.allows) y lo aplican GameViewModel y CombatController.
// ---------------------------------------------------------------------------------------------------------------

/** Dónde está lo iluminable de cada pantalla (px de pantalla): cada pantalla anota sus elementos con [tutAnchor]. */
class TutorialAnchors {
    private val entries: SnapshotStateMap<Pair<String, Any>, List<Rect>> = mutableStateMapOf()
    fun put(id: String, owner: Any, rects: List<Rect>) { entries[id to owner] = rects }
    fun remove(id: String, owner: Any) { entries.remove(id to owner) }
    fun rects(id: String): List<Rect> = entries.entries.filter { it.key.first == id }.flatMap { it.value }
}

/** Solo hay anclas mientras corre el tutorial: fuera de él vale null y [tutAnchor] no hace nada. */
val LocalTutorialAnchors = compositionLocalOf<TutorialAnchors?> { null }

/** Anota este elemento como lo que se ilumina cuando un paso pide [id] ("enemy", "hand", "end-turn"…). */
@Composable
fun Modifier.tutAnchor(id: String): Modifier {
    val reg = LocalTutorialAnchors.current ?: return this
    val owner = remember { Any() }
    DisposableEffect(id) { onDispose { reg.remove(id, owner) } }
    return this.onGloballyPositioned { reg.put(id, owner, listOf(it.boundsInRoot())) }
}

/** Anota varios rectángulos (ya en px de pantalla) bajo [id] de golpe: el mapa calcula los suyos con el zoom y el desplazamiento. */
@Composable
fun TutAnchorGroup(owner: Any, groups: Map<String, List<Rect>>) {
    val reg = LocalTutorialAnchors.current ?: return
    DisposableEffect(owner, groups.keys) { onDispose { groups.keys.forEach { reg.remove(it, owner) } } }
    groups.forEach { (id, r) -> reg.put(id, owner, r) }
}

/** `<b>…</b>` del texto de un paso → negritas doradas (como `.guide-bubble b` de la web). */
fun tutorialText(text: String, bold: SpanStyle = SpanStyle(color = Color(0xFFC9A21F), fontWeight = FontWeight.Bold)): AnnotatedString = buildAnnotatedString {
    var rest = text
    while (true) {
        val a = rest.indexOf("<b>")
        val b = rest.indexOf("</b>")
        if (a < 0 || b < a) { append(rest); break }
        append(rest.substring(0, a))
        withStyle(bold) { append(rest.substring(a + 3, b)) }
        rest = rest.substring(b + 4)
    }
}

private val RingGold = Color(0xFFFFCF4D)

/** Los marcos dorados que respiran sobre [rects]; con [solo] (un solo elemento en un paso de acción) el resto se oscurece. */
@Composable
private fun SpotRings(rects: List<Rect>, solo: Boolean) {
    if (rects.isEmpty()) return
    val pulse by rememberInfiniteTransition(label = "marco").animateFloat(0f, 1f, infiniteRepeatable(tween(1200, easing = EaseInOut), RepeatMode.Reverse), label = "p")
    Canvas(Modifier.fillMaxSize()) {
        val k = density
        val pad = 6f * k
        val boxes = rects.take(12).map { Rect(it.left - pad, it.top - pad, it.right + pad, it.bottom + pad) }
        if (solo) {
            val hole = Path().apply { boxes.forEach { addRoundRect(androidx.compose.ui.geometry.RoundRect(it, CornerRadius(14f * k))) } }
            clipPath(hole, ClipOp.Difference) { drawRect(Color(0x80140E0A)) }
        }
        boxes.forEach { r ->
            val radius = CornerRadius(14f * k + pad)
            drawRoundRect(RingGold.copy(alpha = .35f + .25f * pulse), r.topLeft - Offset(5f * k, 5f * k), Size(r.width + 10f * k, r.height + 10f * k), CornerRadius(radius.x + 5f * k), style = Stroke(9f * k))
            drawRoundRect(RingGold.copy(alpha = .95f), r.topLeft, r.size, radius, style = Stroke(4f * k))
        }
    }
}

/** El globo: a un lado de lo iluminado, probando la posición que pide el paso y luego las demás hasta tapar lo menos posible. */
@Composable
private fun PlacedBubble(pos: String, avoid: List<Rect>, content: @Composable () -> Unit) {
    val density = LocalDensity.current.density
    val safe = LocalSafeInsets.current
    Layout(content = content, modifier = Modifier.fillMaxSize()) { measurables, constraints ->
        val w = constraints.maxWidth
        val h = constraints.maxHeight
        val p = measurables[0].measure(Constraints(maxWidth = (560f * density).toInt().coerceAtMost(w), maxHeight = h))
        val m = 24f * density
        val top = 74f * density
        val left = m + safe.left * density
        val right = w - m - safe.right * density - p.width
        fun at(name: String): Pair<Int, Int> = when (name) {
            "bl" -> left.toInt() to (h - m - p.height).toInt()
            "br" -> right.toInt() to (h - m - p.height).toInt()
            "tl" -> left.toInt() to top.toInt()
            "tr" -> right.toInt() to top.toInt()
            "bottom" -> ((w - p.width) / 2) to (h - 20f * density - p.height).toInt()
            "top" -> ((w - p.width) / 2) to top.toInt()
            "ml" -> left.toInt() to (h - p.height) / 2
            "mr" -> right.toInt() to (h - p.height) / 2
            else -> ((w - p.width) / 2) to ((h - p.height) / 2)
        }
        val order = listOf(pos) + listOf("bl", "br", "tl", "tr", "bottom", "top", "ml", "mr").filter { it != pos }
        val hud = Rect(0f, 0f, w.toFloat(), top)
        var best = pos
        if (pos != "center" && avoid.isNotEmpty()) {
            var bestArea = Float.MAX_VALUE
            for (name in order) {
                val (x, y) = at(name)
                val box = Rect(x.toFloat(), y.toFloat(), (x + p.width).toFloat(), (y + p.height).toFloat())
                val area = (avoid + hud).sumOf { r -> box.intersect(r).let { i -> if (i.width > 0 && i.height > 0) (i.width * i.height).toDouble() else 0.0 } }.toFloat()
                if (area < bestArea) { bestArea = area; best = name }
                if (area == 0f) break
            }
        }
        val (x, y) = at(best)
        layout(w, h) { p.place(x, y) }
    }
}

/** Una carita de Profe Limón y su globo con el texto. [praise] la hace saltar con un «¡Muy bien!». */
@Composable
private fun BubbleBody(d: TutorialDirector, text: AnnotatedString, praise: Boolean, shake: Int, onNext: () -> Unit, onQuit: () -> Unit) {
    val step = d.step ?: return
    val wiggle = remember { Animatable(0f) }
    LaunchedEffect(shake) { if (shake > 0) { wiggle.snapTo(0f); wiggle.animateTo(1f, tween(400)) } }
    Row(
        Modifier.graphicsLayer {
            val s = wiggle.value
            if (s in 0.001f..0.999f) translationX = kotlin.math.sin(s * 18f) * 10f * (1f - s) * density
        },
        verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box {
            Sprite("profe_limon", 112.dp, mood = if (praise) "wink" else null)
            if (praise) BasicText(
                "¡Muy bien!", style = Fonts.hand(26f, Color.White),
                modifier = Modifier.align(Alignment.TopCenter).graphicsLayer { rotationZ = -6f }.chip(99.dp, Ink.leaf).padding(horizontal = 12.dp, vertical = 1.dp)
            )
        }
        Column(
            Modifier.widthIn(min = 240.dp, max = 430.dp).padding(bottom = 20.dp).stickerCard(20.dp, Ink.paper2).padding(start = 18.dp, end = 14.dp, top = 16.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // el avance del tutorial
            Box(Modifier.fillMaxWidth().height(5.dp).drawBehind {
                drawRoundRect(Color(0xFFF0E4CC), cornerRadius = CornerRadius(size.height))
                drawRoundRect(RingGold, size = Size(size.width * d.progressPct / 100f, size.height), cornerRadius = CornerRadius(size.height))
            })
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BasicText(text, style = Fonts.body(24f, FontWeight.Medium).copy(lineHeight = 31.sp), modifier = Modifier.weight(1f))
                Box(Modifier.size(34.dp).chip(99.dp, Ink.paper2).tapButton { onQuit() }, contentAlignment = Alignment.Center) {
                    BasicText("✕", style = Fonts.body(18f, FontWeight.Bold, Ink.inkSoft))
                }
            }
            if (step.next) StickerButton("Siguiente ›", onNext, color = Ink.mint, fontSize = 22f, modifier = Modifier.align(Alignment.End), padding = PaddingValues(horizontal = 26.dp, vertical = 8.dp))
        }
    }
}

/** La pregunta «¿Salir del tutorial?» (✕ o el botón de atrás): tapa todo hasta que se responda. */
@Composable
private fun QuitAsk(onAnswer: (Boolean) -> Unit) {
    Box(Modifier.fillMaxSize().background(Color(0x334A3428)).pointerInput(Unit) { detectTapGestures { } }, contentAlignment = Alignment.Center) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Sprite("profe_limon", 120.dp, mood = "sleepy")
            Column(
                Modifier.stickerCard(20.dp, Ink.paper2).padding(horizontal = 26.dp, vertical = 18.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                BasicText("¿Salir del tutorial?", style = Fonts.hand(36f))
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    StickerButton("Salir", { onAnswer(true) }, secondary = true, fontSize = 24f)
                    StickerButton("Seguir", { onAnswer(false) }, color = Ink.mint, fontSize = 24f)
                }
            }
        }
    }
}

/**
 * Todo lo del tutorial por encima de la partida. [rects] es lo que ilumina el paso y [avoid] lo que el globo no debe tapar
 * (los dos en px de pantalla). [praiseKey] sube cuando se cumple un paso y [shakeKey] cuando se intenta algo que no toca.
 */
@Composable
fun TutorialOverlay(
    d: TutorialDirector, rects: List<Rect>, avoid: List<Rect>, praiseKey: Int, shakeKey: Int,
    onNext: () -> Unit, onQuitAsk: () -> Unit, onQuit: (Boolean) -> Unit, modifier: Modifier = Modifier
) {
    val step = d.step ?: return
    Box(modifier.fillMaxSize()) {
        if (d.quitAsk) { QuitAsk(onQuit); return@Box }
        // en los pasos de lectura nada se toca hasta «Siguiente» (el velo es casi transparente: se sigue viendo todo)
        if (step.next) Box(Modifier.fillMaxSize().background(Color(0x1F4A3428)).pointerInput(Unit) { detectTapGestures { } })
        SpotRings(rects, solo = rects.size == 1 && !step.next)
        var praise by remember { androidx.compose.runtime.mutableStateOf(false) }
        LaunchedEffect(praiseKey) { if (praiseKey > 0) { praise = true; kotlinx.coroutines.delay(1800); praise = false } }
        val text = remember(step) { tutorialText(step.text) }
        PlacedBubble(step.pos, rects + avoid) { BubbleBody(d, text, praise, shakeKey, onNext, onQuitAsk) }
    }
}

/** Fin del tutorial (renderTutorialEnd): lo aprendido, unos consejos y a qué sigue. */
@Composable
fun TutorialEndScreen(onPlay: () -> Unit, onRepeat: () -> Unit, onMenu: () -> Unit) {
    PaperScreen("¡Tutorial completado!", art = { Sprite("profe_limon", 120.dp, mood = "wink") }, celebrate = true) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                TutorialEnd.learned.take(3).forEach { LearnedChip(it.first, it.second, it.third) }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                TutorialEnd.learned.drop(3).forEach { LearnedChip(it.first, it.second, it.third) }
            }
        }
        Column(Modifier.widthIn(max = 900.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            TutorialEnd.tips.forEach { BasicText(tutorialText("•  $it"), style = Fonts.body(17f, color = Ink.ink)) }
        }
        BasicText(tutorialText(TutorialEnd.OUTRO), style = Fonts.body(18f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center), modifier = Modifier.widthIn(max = 880.dp))
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            StickerButton("¡Jugar de verdad!", onPlay, color = Ink.mint, fontSize = 24f)
            StickerButton("Repetir tutorial", onRepeat, secondary = true, fontSize = 20f)
            StickerButton("Volver al menú", onMenu, secondary = true, fontSize = 20f)
        }
    }
}

@Composable
private fun LearnedChip(sprite: String, name: String, what: String) {
    Row(
        Modifier.chip(16.dp, Color(0xFFF2FAEA)).padding(start = 8.dp, end = 14.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Sprite(sprite, 44.dp)
        Column {
            BasicText("$name ✓", style = Fonts.hand(23f))
            BasicText(what, style = Fonts.body(13.5f, color = Ink.inkSoft))
        }
    }
}
