package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.Casino
import com.yokyznt.fruitspire.core.Rewards
import com.yokyznt.fruitspire.core.RoulettePick
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.Table
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

// ---------------------------------------------------------------------------------------------------------------
// Mesas de juego (js/minigames.js): tapete verde con borde de madera, crupier, fichas apostadas y sello de resultado.
// ---------------------------------------------------------------------------------------------------------------
private val FELT = Color(0xFF2F8A63)
private val WOOD = Color(0xFF8C5A2E)
private val GOLD = Color(0xFFE9C46A)
private val CREAM = Color(0xFFFFF6E0)
private val CARD_RED = Color(0xFFD6374F)
private val WIN_FG = Color(0xFF22694F)
private val LOSE_FG = Color(0xFF9C2A3E)
private val DRAW_FG = Color(0xFF7A5A12)

/** El tapete: madera con filo dorado, fieltro con un brillo al centro. */
private fun Modifier.feltTable(): Modifier = drawBehind {
    // el tapete llena toda la pantalla; solo queda un filete dorado hacia adentro
    drawRect(FELT)
    drawRect(Brush.radialGradient(listOf(Color(0x24FFFFFF), Color.Transparent), Offset(size.width / 2, size.height * .45f), size.width * .5f))
    val g = 12.dp.toPx()
    drawRoundRect(GOLD, Offset(g, g), Size(size.width - g * 2, size.height - g * 2), CornerRadius(26.dp.toPx()), style = Stroke(3.dp.toPx()))
}

private fun resultColors(outcome: String): Pair<Color, Color> = when (outcome) {
    "win" -> Ink.mintSoft to WIN_FG
    "lose" -> Ink.strawberrySoft to LOSE_FG
    else -> Ink.bananaSoft to DRAW_FG
}

/** Una caja con borde de tinta y esquinas redondas (los avisos, las fichas de texto). */
private fun Modifier.inkBox(fill: Color, radius: Dp? = null): Modifier = drawBehind {
    val r = radius?.toPx() ?: (size.height / 2)
    drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(r + 2.dp.toPx()))
    drawRoundRect(fill, Offset.Zero, size, CornerRadius(r))
}

/** Pantalla de una mesa: la presentación (reglas y apuesta) o el tapete con el juego. */
@Composable
fun TableScreen(
    run: Run, ctl: TableController, rev: Int,
    onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onLeave: () -> Unit
) {
    key(rev) { // se redibuja cada vez que la partida cambia (la mesa no es observable por Compose)
        if (ctl.table.phase == "intro") TableIntro(run, ctl.table, ctl::start, onLeave)
        else PlayingTable(run, ctl, onCollect, onDrop, onLeave)
    }
}

@Composable
private fun PlayingTable(run: Run, ctl: TableController, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onLeave: () -> Unit) {
    val table = ctl.table
    val info = Casino.KINDS.getValue(table.kind)
    TableFrame(table, ctl) {
        BasicText(info.name, style = Fonts.hand(if (table.kind == "chess") 24f else 32f, Color(0xFFFFE9A8)), modifier = Modifier.padding(bottom = 2.dp))
        val result: @Composable () -> Unit = { ResultBlock(run, table, onCollect, onDrop, onLeave) }
        when (table.kind) {
            "dice" -> DiceBody(ctl, result)
            "poker" -> PokerBody(ctl, result)
            "slots" -> SlotsBody(ctl, result)
            "roulette" -> RouletteBody(ctl, result)
            else -> ChessBody(ctl, run, onCollect, onDrop, onLeave)
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Presentación: reglas y apuesta
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun TableIntro(run: Run, table: Table, onStart: (Int) -> Unit, onLeave: () -> Unit) {
    val info = Casino.KINDS.getValue(table.kind)
    PaperScreen(info.name, art = {
        // el crupier de la mesa, grande, saludando con su globo
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(150.dp), contentAlignment = Alignment.BottomCenter) { Sprite(info.dealer, 150.dp) }
            SpeechBubble("¿Te atreves?", Modifier.padding(bottom = 70.dp), fontSize = 26f, tailLeft = true)
        }
    }) {
        BasicText(info.rules, style = Fonts.body(22f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center), modifier = Modifier.width(820.dp))
        if (table.kind == "chess") {
            StickerButton("¡Jugar!", { onStart(0) }, color = Ink.mint, fontSize = 30f, padding = PaddingValues(horizontal = 56.dp, vertical = 16.dp), modifier = Modifier.padding(top = 6.dp))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                BasicText("¿Cuánto apuestas? Tienes", style = Fonts.hand(29f))
                Sprite("ui_coin", 32.dp)
                BasicText("${run.player.gold}", style = Fonts.hand(29f).copy(fontWeight = FontWeight.Bold))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                listOf(10, 25, 50).forEach { b ->
                    StickerButton(
                        "$b", { onStart(b) }, color = if (b == 25) Ink.banana else Ink.peach, enabled = run.player.gold >= b,
                        fontSize = 28f, padding = PaddingValues(horizontal = 34.dp, vertical = 14.dp), leading = { Sprite("ui_coin", 32.dp) }
                    )
                }
                StickerButton("Gratis", { onStart(0) }, secondary = true, fontSize = 26f, padding = PaddingValues(horizontal = 32.dp, vertical = 14.dp))
            }
            BasicText("Gratis: si ganas, la casa te da 8 de oro; si pierdes, no pierdes nada.", style = Fonts.body(17f, color = Ink.inkSoft))
        }
        StickerButton("Irme sin jugar", onLeave, secondary = true, fontSize = 26f, padding = PaddingValues(horizontal = 36.dp, vertical = 14.dp))
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Marco: crupier, fichas y sello
// ---------------------------------------------------------------------------------------------------------------
/** Agranda lo que lleva dentro hasta llenar el espacio que hay (sin pasar de [maxScale]); los toques siguen funcionando sobre lo agrandado. */
@Composable
private fun AutoFit(maxScale: Float, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    androidx.compose.ui.layout.Layout(content = content, modifier = modifier) { measurables, constraints ->
        val p = measurables.first().measure(androidx.compose.ui.unit.Constraints(maxWidth = constraints.maxWidth, maxHeight = androidx.compose.ui.unit.Constraints.Infinity))
        val s = min(maxScale, min(constraints.maxWidth.toFloat() / p.width.coerceAtLeast(1), constraints.maxHeight.toFloat() / p.height.coerceAtLeast(1))).coerceAtLeast(.5f)
        layout((p.width * s).roundToInt(), (p.height * s).roundToInt()) {
            p.placeRelativeWithLayer(0, 0) { scaleX = s; scaleY = s; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0f) }
        }
    }
}

/** Lo que cabe a la izquierda de la mesa: el crupier con su globo (grande, para que se vea y se lea sin esfuerzo). */
private const val DEALER_W = 330f

/** El globo de diálogo del crupier: salta al cambiar el texto. [tailLeft] pone la colita a la izquierda (el crupier está a su lado); si no, abajo (está debajo). */
@Composable
private fun SpeechBubble(text: String, modifier: Modifier = Modifier, fontSize: Float = 28f, tailLeft: Boolean = false) {
    val pop = remember(text) { Animatable(.8f) }
    LaunchedEffect(text) { pop.animateTo(1f, spring(dampingRatio = .45f, stiffness = Spring.StiffnessMedium)) }
    Box(
        modifier.widthIn(max = 320.dp)
            .graphicsLayer { scaleX = pop.value; scaleY = pop.value; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(if (tailLeft) 0f else .5f, 1f) }
            .drawBehind {
                val k = density
                val r = 20f * k
                drawRoundRect(Color(0x40000000), Offset(0f, 4f * k), size, CornerRadius(r))
                drawRoundRect(Ink.ink, Offset(-3f * k, -3f * k), Size(size.width + 6f * k, size.height + 6f * k), CornerRadius(r + 3f * k))
                drawRoundRect(Color(0xFFFFFDF7), Offset.Zero, size, CornerRadius(r))
                val tri = Path().apply {
                    if (tailLeft) { moveTo(1f, size.height * .3f); lineTo(-16f * k, size.height * .5f); lineTo(1f, size.height * .7f) }
                    else { val m = size.width / 2f; moveTo(m - 14f * k, size.height - 1f); lineTo(m, size.height + 18f * k); lineTo(m + 14f * k, size.height - 1f) }
                    close()
                }
                drawPath(tri, Ink.ink, style = Stroke(6f * k))
                drawPath(tri, Color(0xFFFFFDF7))
            }
            .padding(horizontal = 20.dp, vertical = 10.dp)
    ) { BasicText(text, style = Fonts.hand(fontSize).copy(textAlign = TextAlign.Center), maxLines = 3) }
}

/**
 * El crupier, grande, y lo que dice: sus frases cambian con lo que haces y con cómo vas (preocupado si ganas, burlón si pierdes).
 */
@Composable
private fun Dealer(table: Table, dealer: String, modifier: Modifier = Modifier) {
    val tilt by idleAnim(-3f, 3f, infiniteRepeatable(tween(1300, easing = LinearEasing), RepeatMode.Reverse), "crupier", rest = 0f)
    val mood = when { table.ahead > 0 -> "hurt"; table.ahead < 0 -> "wink"; else -> null }
    Column(modifier.width(DEALER_W.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        SpeechBubble(table.dealerLine, Modifier.padding(bottom = 24.dp))
        Box(Modifier.graphicsLayer { rotationZ = tilt; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(.5f, 1f) }) { Sprite(dealer, 230.dp, mood = mood) }
    }
}

@Composable
private fun TableFrame(table: Table, ctl: TableController, content: @Composable () -> Unit) {
    val info = Casino.KINDS.getValue(table.kind)
    val result = table.phase == "result"
    val safe = LocalSafeInsets.current
    // la cámara solo tapa un lado, pero la mesa se centra: el margen es igual a los dos lados
    val side = 30f + max(safe.left, safe.right)
    Box(Modifier.fillMaxSize().feltTable()) {
        // el crupier y la mesa van juntos: la mesa se agranda hasta llenar el resto de la pantalla
        Row(
            Modifier.fillMaxSize().padding(start = side.dp, end = side.dp, top = (HUD_H + 4).dp, bottom = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Dealer(table, info.dealer)
            Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.CenterStart) {
                AutoFit(maxScale = 1.6f) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { content() }
                }
            }
            // el lugar de las fichas apostadas
            if (table.kind != "chess") Spacer(Modifier.width(96.dp))
        }
        if (table.kind != "chess") Pot(table, Modifier.align(Alignment.TopEnd).padding(end = (side + 8f).dp, top = (HUD_H + 14).dp))
        if (result && table.kind != "chess") Stamp(table.outcome, Modifier.align(Alignment.BottomEnd).padding(end = (side + 34f).dp, bottom = 74.dp))
        CoinRain(ctl.coinRain)
    }
}

/** Las fichas apostadas, apiladas, con lo apostado encima. */
@Composable
private fun Pot(table: Table, modifier: Modifier) {
    val n = if (table.free) 1 else if (table.bet >= 50) 5 else if (table.bet >= 25) 3 else 2
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.padding(bottom = 6.dp).inkBox(Color(0xFFFFE9A8)).padding(horizontal = 12.dp)) {
            BasicText(if (table.free) "Gratis" else "${table.bet}", style = Fonts.hand(24f))
        }
        Canvas(Modifier.size(58.dp, (18 + 12 * (n - 1) + 8).dp)) {
            for (i in 0 until n) {
                val top = size.height - 8.dp.toPx() - 16.dp.toPx() - i * 12.dp.toPx()
                val red = i % 2 == 1
                val body = if (red) Color(0xFFF2667A) else Color(0xFFFFCF4D)
                val under = if (red) Color(0xFFB8324A) else Color(0xFFC9941F)
                drawOval(under, Offset(2.dp.toPx(), top + 4.dp.toPx()), Size(54.dp.toPx(), 16.dp.toPx()))
                drawOval(Ink.ink, Offset(0f, top - 2.dp.toPx()), Size(58.dp.toPx(), 20.dp.toPx()))
                drawOval(body, Offset(2.dp.toPx(), top), Size(54.dp.toPx(), 16.dp.toPx()))
                // rayas claras del borde de la ficha
                for (k in 0 until 6) drawRect(Color(0xFFFFF6E9), Offset(8.dp.toPx() + k * 8.dp.toPx(), top + 4.dp.toPx()), Size(4.dp.toPx(), 8.dp.toPx()))
            }
        }
    }
}

@Composable
private fun Stamp(outcome: String, modifier: Modifier) {
    val label = when (outcome) { "win" -> "¡GANAS!"; "lose" -> "PIERDES"; else -> "EMPATE" }
    val color = when (outcome) { "win" -> Color(0xFF2E9A63); "lose" -> Color(0xFFD2445B); else -> Color(0xFFC9941F) }
    val k = remember(outcome) { Animatable(2.4f) }
    LaunchedEffect(outcome) { k.animateTo(1f, spring(dampingRatio = .45f, stiffness = 300f)) }
    Box(
        modifier.graphicsLayer { rotationZ = -12f; scaleX = k.value; scaleY = k.value; alpha = (2.5f - k.value).coerceIn(0f, 1f) }
            .drawBehind {
                val r = 14.dp.toPx()
                drawRoundRect(Color(0xEBFFFDF7), Offset.Zero, size, CornerRadius(r))
                drawRoundRect(color, Offset(3.dp.toPx(), 3.dp.toPx()), Size(size.width - 6.dp.toPx(), size.height - 6.dp.toPx()), CornerRadius(r), style = Stroke(6.dp.toPx()))
            }.padding(horizontal = 24.dp, vertical = 2.dp)
    ) { BasicText(label, style = Fonts.display(40f, color)) }
}

/** Lluvia de monedas al ganar. */
@Composable
private fun CoinRain(trigger: Int) {
    if (trigger == 0) return
    val width = LocalDesignWidth.current
    val coins = remember(trigger) { List(16) { Triple(.2f + kotlin.random.Random.nextFloat() * .6f, kotlin.random.Random.nextFloat() * 120f - 60f, it * 60f) } }
    val t = remember(trigger) { Animatable(0f) }
    LaunchedEffect(trigger) { t.animateTo(1f, tween(2500, easing = LinearEasing)) }
    if (t.value >= 1f) return
    coins.forEach { (fx, dx, delay) ->
        Box(
            Modifier.graphicsLayer {
                val p = ((t.value * 2500f - delay) / 1500f).coerceIn(0f, 1f)
                translationX = (width * fx + dx * p) * density
                translationY = (-30f + 890f * p * p) * density
                rotationZ = 540f * p
                alpha = if (p <= 0f) 0f else 1f
            }
        ) { Sprite("ui_coin", 30.dp) }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Resultado: texto, premios por recoger y «Continuar»
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun ResultBlock(run: Run, table: Table, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onLeave: () -> Unit) {
    val (bg, fg) = resultColors(table.outcome)
    val full = Rewards.seedsFull(run.player)
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.widthIn(max = 640.dp).inkBox(bg, 14.dp).padding(horizontal = 18.dp, vertical = 5.dp)) {
            GameText(table.text, Fonts.hand(22f, fg).copy(textAlign = TextAlign.Center))
        }
        if (run.loot.any { !it.dropped }) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                run.loot.forEachIndexed { i, it ->
                    if (!it.dropped) Scaled(.72f, 128f, 182f) { LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) }
                }
            }
        }
        ContinueButton(onLeave, enabled = !run.lootPending())
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------------------------------------------
private val PIPS = mapOf(
    1 to listOf(0 to 0), 2 to listOf(-1 to -1, 1 to 1), 3 to listOf(-1 to -1, 0 to 0, 1 to 1), 4 to listOf(-1 to -1, 1 to -1, -1 to 1, 1 to 1),
    5 to listOf(-1 to -1, 1 to -1, 0 to 0, -1 to 1, 1 to 1), 6 to listOf(-1 to -1, 1 to -1, -1 to 0, 1 to 0, -1 to 1, 1 to 1)
)

/** Un dado de seis caras (`dieSvg` de la web). Si [rolling] va dando vueltas y de color banana. */
@Composable
fun Die(v: Int, size: Dp, rolling: Boolean = false) {
    val tumble = rememberInfiniteTransition(label = "dado")
    val turn by tumble.animateFloat(0f, 360f, infiniteRepeatable(tween(280, easing = LinearEasing)), label = "giro")
    val pop = remember { Animatable(if (rolling) 1f else .5f) }
    LaunchedEffect(Unit) { if (!rolling) pop.animateTo(1f, spring(dampingRatio = .45f, stiffness = Spring.StiffnessMedium)) }
    Canvas(
        Modifier.size(size).graphicsLayer {
            rotationZ = if (rolling) turn else 0f
            translationY = if (rolling) -sin(turn * PI.toFloat() / 180f).coerceAtLeast(0f) * 10f * density else 0f
            scaleX = pop.value; scaleY = pop.value
        }
    ) {
        val k = this.size.minDimension / 100f
        scale(k, k, pivot = Offset.Zero) {
            drawRoundRect(Color(0x40000000), Offset(10f, 15f), Size(80f, 80f), CornerRadius(18f))
            drawRoundRect(Ink.ink, Offset(7f, 7f), Size(86f, 86f), CornerRadius(21f))
            drawRoundRect(if (rolling) Ink.bananaSoft else Color(0xFFFFFDF7), Offset(10f, 10f), Size(80f, 80f), CornerRadius(18f))
            drawLine(Color(0x14000000), Offset(22f, 80f), Offset(78f, 80f), 8f, cap = StrokeCap.Round)
            PIPS[v.coerceIn(1, 6)]?.forEach { (a, b) -> drawCircle(Ink.ink, 8.5f, Offset(50f + a * 22f, 50f + b * 22f)) }
            drawCircle(Color.White, 3.5f, Offset(24f, 24f))
        }
    }
}

@Composable
private fun LabelRow(label: String, content: @Composable () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        BasicText(label, style = Fonts.hand(26f, CREAM).copy(textAlign = TextAlign.End), modifier = Modifier.width(76.dp))
        content()
    }
}

@Composable
private fun DiceRow(label: String, dice: List<Int>, rolling: Rolling?, who: String) {
    LabelRow(label) {
        Row(Modifier.widthIn(min = 360.dp).height(66.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            dice.forEach { Die(it, 58.dp) }
            if (rolling != null && rolling.who == who) Die(rolling.face, 58.dp, rolling = true)
        }
        Box(Modifier.widthIn(min = 56.dp).inkBox(Ink.banana).padding(horizontal = 10.dp), contentAlignment = Alignment.Center) {
            BasicText("${dice.sum()}", style = Fonts.display(30f))
        }
    }
}

@Composable
private fun DiceBody(ctl: TableController, result: @Composable () -> Unit) {
    val t = ctl.table
    val ps = t.dicePlayer.sum()
    val canAct = t.phase == "play" && !ctl.busy
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        DiceRow("La casa", t.diceHouse, ctl.rolling, "house")
        DiceRow("Tú", t.dicePlayer, ctl.rolling, "player")
        val bar = if (ps > 21) Color(0xFFF2667A) else if (ps >= 17) Color(0xFFFFCF4D) else Color(0xFF9BD66A)
        Box(
            Modifier.padding(top = 4.dp, bottom = 6.dp).size(420.dp, 26.dp).drawBehind {
                val r = size.height / 2
                drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(r + 2.dp.toPx()))
                drawRoundRect(Color(0x47000000), Offset.Zero, size, CornerRadius(r))
                drawRoundRect(bar, Offset.Zero, Size(size.width * min(1f, ps / 21f), size.height), CornerRadius(r))
            }, contentAlignment = Alignment.Center
        ) { BasicText("$ps / 21", style = Fonts.hand(21f)) }
        if (t.phase == "result") result() else {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                StickerButton("Tirar un dado", ctl::diceRoll, color = Ink.mint, enabled = canAct, fontSize = 20f)
                StickerButton("Plantarme con $ps", ctl::diceStand, color = Ink.banana, enabled = canAct && t.dicePlayer.isNotEmpty(), fontSize = 20f)
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Póker
// ---------------------------------------------------------------------------------------------------------------
private val SUITS = listOf("♠", "♥", "♦", "♣")
private val RANK_LABEL = mapOf(11 to "J", 12 to "Q", 13 to "K", 14 to "A")

@Composable
private fun PCard(card: Casino.Card?, index: Int, selected: Boolean = false, flip: Boolean = false, onClick: (() -> Unit)? = null) {
    val deal = remember { Animatable(0f) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(index * 70L); deal.animateTo(1f, tween(320)) }
    val turn = remember { Animatable(if (flip) 180f else 0f) }
    LaunchedEffect(Unit) { if (flip) { kotlinx.coroutines.delay(index * 120L); turn.animateTo(0f, tween(480)) } }
    val lift = remember { Animatable(0f) }
    LaunchedEffect(selected) { lift.animateTo(if (selected) -16f else 0f, spring(dampingRatio = .6f, stiffness = 500f)) }
    val red = card != null && (card.s == 1 || card.s == 2)
    Box(
        Modifier.size(62.dp, 88.dp)
            .graphicsLayer {
                alpha = deal.value; translationY = lift.value * density + (1f - deal.value) * -40f * density
                rotationY = turn.value; cameraDistance = 14f * density
            }
            .drawBehind {
                val r = 10.dp.toPx()
                drawRoundRect(Color(0x59000000), Offset(0f, 4.dp.toPx()), size, CornerRadius(r))
                if (selected) {
                    drawRoundRect(Color(0x805CC9A7), Offset(-8.dp.toPx(), -8.dp.toPx()), Size(size.width + 16.dp.toPx(), size.height + 16.dp.toPx()), CornerRadius(r + 8.dp.toPx()))
                    drawRoundRect(Ink.mint, Offset(-5.dp.toPx(), -5.dp.toPx()), Size(size.width + 10.dp.toPx(), size.height + 10.dp.toPx()), CornerRadius(r + 5.dp.toPx()))
                } else if (card?.fresh == true) {
                    drawRoundRect(Color(0x73FFCF4D), Offset(-8.dp.toPx(), -8.dp.toPx()), Size(size.width + 16.dp.toPx(), size.height + 16.dp.toPx()), CornerRadius(r + 8.dp.toPx()))
                    drawRoundRect(Ink.banana, Offset(-5.dp.toPx(), -5.dp.toPx()), Size(size.width + 10.dp.toPx(), size.height + 10.dp.toPx()), CornerRadius(r + 5.dp.toPx()))
                }
                drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(r + 2.dp.toPx()))
                if (card == null || turn.value > 90f) {
                    // dorso: rayas moradas, recortadas al contorno de la carta
                    drawRoundRect(Color(0xFF9B7FD4), Offset.Zero, size, CornerRadius(r))
                    val shape = Path().apply { addRoundRect(RoundRect(0f, 0f, size.width, size.height, CornerRadius(r))) }
                    clipPath(shape) {
                        var x = -size.height
                        while (x < size.width) {
                            val p = Path().apply { moveTo(x, size.height); lineTo(x + size.height, 0f); lineTo(x + size.height + 6.dp.toPx(), 0f); lineTo(x + 6.dp.toPx(), size.height); close() }
                            drawPath(p, Color(0xFFB7A0E6))
                            x += 12.dp.toPx()
                        }
                    }
                } else drawRoundRect(Color.White, Offset.Zero, size, CornerRadius(r))
            }
            .let { m -> if (onClick != null) m.tap { onClick() } else m }
    ) {
        if (card != null && turn.value <= 90f) {
            val ink = if (red) CARD_RED else Color(0xFF2B2536)
            val suit = SUITS[card.s]
            Column(Modifier.padding(start = 6.dp, top = 3.dp)) {
                BasicText(RANK_LABEL[card.r] ?: "${card.r}", style = Fonts.display(21f, ink))
                BasicText(suit, style = Fonts.display(19f, ink))
            }
            BasicText(suit, style = Fonts.display(38f, ink), modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 2.dp))
        }
    }
}

@Composable
private fun HandPill(text: String) {
    Box(Modifier.widthIn(min = 120.dp).inkBox(Ink.mintSoft).padding(horizontal = 12.dp, vertical = 2.dp), contentAlignment = Alignment.Center) {
        BasicText(text, style = Fonts.hand(19f))
    }
}

@Composable
private fun PokerBody(ctl: TableController, result: @Composable () -> Unit) {
    val t = ctl.table
    val reveal = t.phase == "result"
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        LabelRow("La casa") {
            Row(Modifier.height(100.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                t.house.forEachIndexed { k, c -> key(reveal, k) { PCard(if (reveal) c else null, k, flip = reveal) } }
            }
            Box(Modifier.width(130.dp)) { if (reveal) HandPill(Casino.HAND_NAMES[Casino.evalHand(t.house).rank]) }
        }
        LabelRow("Tú") {
            Row(Modifier.height(104.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Bottom) {
                t.player.forEachIndexed { i, c -> PCard(c, i, selected = i in t.selected, onClick = if (t.phase == "play" && !ctl.busy) ({ ctl.pokerToggle(i) }) else null) }
            }
            Box(Modifier.width(130.dp)) { HandPill(Casino.HAND_NAMES[Casino.evalHand(t.player).rank]) }
        }
        if (reveal) result() else {
            StickerButton(if (t.selected.isNotEmpty()) "Cambiar ${t.selected.size} y mostrar" else "Plantarme", ctl::pokerShow, color = Ink.mint, fontSize = 20f)
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Tragamonedas
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun SlotsBody(ctl: TableController, result: @Composable () -> Unit) {
    val t = ctl.table
    val faces = if (ctl.busy) ctl.reelFaces else t.reels
    val spin = if (ctl.busy) ctl.reelSpin else listOf(false, false, false)
    val blur = rememberInfiniteTransition(label = "rodillo")
    val dy by blur.animateFloat(-46f, 46f, infiniteRepeatable(tween(160, easing = LinearEasing)), label = "dy")
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            Modifier.drawBehind {
                val r = 22.dp.toPx()
                drawRoundRect(Color(0x4D000000), Offset(0f, 8.dp.toPx()), size, CornerRadius(r))
                drawRoundRect(Ink.ink, Offset(-4.dp.toPx(), -4.dp.toPx()), Size(size.width + 8.dp.toPx(), size.height + 8.dp.toPx()), CornerRadius(r + 4.dp.toPx()))
                drawRoundRect(Color(0xFFC8374F), Offset.Zero, size, CornerRadius(r))
                drawRoundRect(Color(0xFFFFCF4D), Offset(4.dp.toPx(), 4.dp.toPx()), Size(size.width - 8.dp.toPx(), size.height - 8.dp.toPx()), CornerRadius(r - 4.dp.toPx()), style = Stroke(4.dp.toPx()))
            }.padding(horizontal = 22.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            faces.forEachIndexed { k, s ->
                Box(
                    Modifier.size(112.dp).drawBehind {
                        val r = 14.dp.toPx()
                        drawRoundRect(Ink.ink, Offset(-3.dp.toPx(), -3.dp.toPx()), Size(size.width + 6.dp.toPx(), size.height + 6.dp.toPx()), CornerRadius(r + 3.dp.toPx()))
                        drawRoundRect(Color(0xFFFFFDF7), Offset.Zero, size, CornerRadius(r))
                        drawRect(Brush.verticalGradient(listOf(Color(0x384A3428), Color.Transparent, Color.Transparent, Color(0x384A3428))), Offset.Zero, size)
                    }.graphicsLayer { clip = true }, contentAlignment = Alignment.Center
                ) {
                    Box(Modifier.graphicsLayer { if (spin[k]) { translationY = dy * density; alpha = .5f } }) { Sprite(s, 82.dp) }
                }
            }
        }
        if (t.phase == "result" && !ctl.busy) result()
        else StickerButton("¡Jalar!", ctl::slotsPull, color = Ink.banana, enabled = !ctl.busy && t.phase == "play", fontSize = 22f)
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Ruleta
// ---------------------------------------------------------------------------------------------------------------
private val RL_COLORS = mapOf("red" to Color(0xFFE0455E), "black" to Color(0xFF3A2A3E), "green" to Color(0xFF3E9A5A))
private const val WHEEL = 244f

@Composable
private fun Wheel(angle: Float) {
    val n = Casino.ROULETTE_N
    val step = 360f / n
    Box(Modifier.size(WHEEL.dp).graphicsLayer { rotationZ = angle }, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val k = size.minDimension / 200f
            scale(k, k, pivot = Offset.Zero) {
                drawCircle(Color(0xFF8C5A2E), 98f, Offset(100f, 100f))
                drawCircle(Ink.ink, 98f, Offset(100f, 100f), style = Stroke(4f))
                for (i in 0 until n) {
                    val start = (i - .5f) * step - 90f
                    drawArc(RL_COLORS.getValue(Casino.rouletteColor(i)), start, step, true, Offset(8f, 8f), Size(184f, 184f))
                    drawArc(Color(0xFFFFE9A8), start, step, true, Offset(8f, 8f), Size(184f, 184f), style = Stroke(1.5f))
                }
                drawCircle(GOLD, 30f, Offset(100f, 100f))
                drawCircle(Ink.ink, 30f, Offset(100f, 100f), style = Stroke(4f))
                drawCircle(Ink.ink, 9f, Offset(100f, 100f))
            }
        }
        // los números, sobre cada gajo (giran con la rueda)
        for (i in 0 until n) {
            val a = i * step * PI.toFloat() / 180f
            val reach = 74f * WHEEL / 200f
            Box(Modifier.offset((sin(a) * reach).dp, (-cos(a) * reach).dp).graphicsLayer { rotationZ = i * step }) {
                BasicText("$i", style = Fonts.body(15f, FontWeight.Bold, CREAM))
            }
        }
    }
}

@Composable
private fun RlButton(label: String, color: Color, on: Boolean, enabled: Boolean, w: Int, onClick: () -> Unit) {
    val lift = remember { Animatable(0f) }
    LaunchedEffect(on) { lift.animateTo(if (on) -3f else 0f, spring(dampingRatio = .6f, stiffness = 500f)) }
    Box(
        Modifier.size(w.dp, 38.dp).graphicsLayer { translationY = lift.value * density; alpha = if (enabled || on) 1f else .75f }
            .drawBehind {
                val r = 12.dp.toPx()
                if (on) {
                    drawRoundRect(Color(0x80FFCF4D), Offset(-7.dp.toPx(), -7.dp.toPx()), Size(size.width + 14.dp.toPx(), size.height + 14.dp.toPx()), CornerRadius(r + 7.dp.toPx()))
                    drawRoundRect(Ink.banana, Offset(-4.dp.toPx(), -4.dp.toPx()), Size(size.width + 8.dp.toPx(), size.height + 8.dp.toPx()), CornerRadius(r + 4.dp.toPx()))
                }
                drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(r + 2.dp.toPx()))
                drawRoundRect(color, Offset.Zero, size, CornerRadius(r))
            }
            .let { m -> if (enabled) m.tap(true, onClick) else m },
        contentAlignment = Alignment.Center
    ) { BasicText(label, style = Fonts.body(17f, FontWeight.SemiBold, CREAM)) }
}

@Composable
private fun RouletteBody(ctl: TableController, result: @Composable () -> Unit) {
    val t = ctl.table
    val spun = remember(ctl) { Animatable(0f) }
    LaunchedEffect(ctl.wheelSpin) {
        if (ctl.wheelSpin > 0) spun.animateTo(ctl.wheelAngle, tween(2600, easing = CubicBezierEasing(.12f, .7f, .16f, 1f)))
    }
    val can = t.phase == "play" && !ctl.busy
    Row(horizontalArrangement = Arrangement.spacedBy(40.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size((WHEEL + 8).dp), contentAlignment = Alignment.Center) {
            Wheel(spun.value)
            // la bolita fija, arriba
            Box(Modifier.align(Alignment.TopCenter).padding(top = 2.dp).size(18.dp).drawBehind {
                drawCircle(Ink.ink, size.minDimension / 2 + 3.dp.toPx()); drawCircle(Color.White, size.minDimension / 2)
            })
        }
        Column(Modifier.width(430.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                RlButton("Rojo ×2", RL_COLORS.getValue("red"), t.pick == RoulettePick.Red, can, 130) { ctl.roulettePick(RoulettePick.Red) }
                RlButton("Negro ×2", RL_COLORS.getValue("black"), t.pick == RoulettePick.Black, can, 130) { ctl.roulettePick(RoulettePick.Black) }
            }
            for (row in 0 until 2) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (col in 0 until 6) {
                    val num = row * 6 + col + 1
                    RlButton("$num", RL_COLORS.getValue(Casino.rouletteColor(num)), t.pick == RoulettePick.Number(num), can, 58) { ctl.roulettePick(RoulettePick.Number(num)) }
                }
            }
            if (t.phase == "result" && !ctl.busy) result()
            else StickerButton("¡Girar!", ctl::rouletteSpin, color = Ink.banana, enabled = can && t.pick != null, fontSize = 21f)
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Ajedrez
// ---------------------------------------------------------------------------------------------------------------
private const val CS = 62f

@Composable
private fun Tray(list: List<Char>, team: Int) {
    Column(
        Modifier.width(196.dp).height(66.dp).inkBox(Color(0xFFF4EEE2), 10.dp).padding(4.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (list.isEmpty()) BasicText("—", style = Fonts.body(18f, color = Color(0xFFB7A88C)))
        else list.chunked(6).forEach { row ->
            Row { row.forEach { Sprite("mgp_${it}${team}_s", 30.dp, outline = false) } }
        }
    }
}

@Composable
private fun ChessBody(ctl: TableController, run: Run, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onLeave: () -> Unit) {
    val t = ctl.table
    val result = t.phase == "result"
    val mine = Casino.countPieces(t.board, 0)
    val theirs = Casino.countPieces(t.board, 1)
    var confirm by remember { mutableStateOf(false) }
    Row(horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.width(200.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            BasicText("Piezas rivales: $theirs", style = Fonts.hand(22f, CREAM))
            Tray(t.won, 1)
            BasicText("Tus piezas: $mine", style = Fonts.hand(22f, CREAM))
            Tray(t.lost, 0)
        }
        ChessBoard(ctl)
        Column(Modifier.width(250.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (result) {
                val (bg, fg) = resultColors(t.outcome)
                Box(Modifier.inkBox(bg, 14.dp).padding(horizontal = 12.dp, vertical = 6.dp)) { GameText(t.text, Fonts.hand(19f, fg).copy(textAlign = TextAlign.Center)) }
                if (run.loot.any { !it.dropped }) {
                    val full = Rewards.seedsFull(run.player)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        run.loot.forEachIndexed { i, it -> if (!it.dropped) Scaled(.6f, 128f, 182f) { LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) } }
                    }
                }
                ContinueButton(onLeave, enabled = !run.lootPending())
            } else {
                BasicText(t.note, style = Fonts.hand(21f, CREAM).copy(textAlign = TextAlign.Center), modifier = Modifier.height(86.dp))
                StickerButton(
                    if (confirm) "¿Seguro? Pierdes vida" else "Rendirme",
                    { if (confirm) ctl.resign() else confirm = true },
                    secondary = !confirm, color = Ink.strawberryBtn, enabled = !ctl.busy, fontSize = 17f
                )
            }
        }
    }
}

/** El tablero de 5×6: se toca (pieza y destino) o se arrastra la pieza hasta su destino. */
@Composable
private fun ChessBoard(ctl: TableController) {
    val t = ctl.table
    var drag by remember { mutableStateOf<Offset?>(null) }
    var dragCell by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    Box(
        Modifier.size((CS * Casino.COLS).dp, (CS * Casino.ROWS).dp).testTag("tablero")
            .drawBehind {
                val e = 4.dp.toPx()
                drawRoundRect(Color(0x404A3428), Offset(0f, 8.dp.toPx()), size, CornerRadius(10.dp.toPx()))
                drawRoundRect(Ink.ink, Offset(-e, -e), Size(size.width + e * 2, size.height + e * 2), CornerRadius(10.dp.toPx() + e))
            }
            .pointerInput(ctl) {
                val cs = CS.dp.toPx()
                detectTapGestures { o -> cellAt(o, cs)?.let { (r, c) -> ctl.chessClick(r, c) } }
            }
            .pointerInput(ctl) {
                val cs = CS.dp.toPx()
                detectDragGestures(
                    onDragStart = { o ->
                        val rc = cellAt(o, cs)
                        val tb = ctl.table
                        if (rc != null && tb.phase == "play" && tb.turn == "player" && !ctl.busy && tb.board[rc.first][rc.second]?.c == 0) {
                            if (tb.sel?.let { it.r == rc.first && it.c == rc.second } != true) ctl.chessClick(rc.first, rc.second)
                            dragCell = rc; drag = o
                        }
                    },
                    onDrag = { change, amount -> if (dragCell != null) { change.consume(); drag = (drag ?: change.position) + amount } },
                    onDragEnd = {
                        val to = drag?.let { cellAt(it, cs) }
                        val from = dragCell
                        dragCell = null; drag = null
                        if (to != null && from != null && to != from) ctl.chessClick(to.first, to.second)
                    },
                    onDragCancel = { dragCell = null; drag = null }
                )
            }
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val cs = CS.dp.toPx()
            for (r in 0 until Casino.ROWS) for (c in 0 until Casino.COLS) {
                val tl = Offset(c * cs, r * cs)
                drawRect(if ((r + c) % 2 == 1) Color(0xFFB8A27C) else Color(0xFFF1E6CE), tl, Size(cs, cs))
                val last = t.last
                if (last != null && ((last.fr == r && last.fc == c) || (last.tr == r && last.tc == c))) drawRect(Color(0x61FFCF4D), tl, Size(cs, cs))
                val sel = t.sel
                if (sel != null && sel.r == r && sel.c == c) drawRect(Color(0xFF5CC9A7), tl, Size(cs, cs), style = Stroke(5.dp.toPx()))
                if (t.targets.any { it.r == r && it.c == c }) {
                    if (t.board[r][c] != null) drawRect(Color(0xFFE0455E), tl, Size(cs, cs), style = Stroke(5.dp.toPx()))
                    else drawCircle(Color(0xB33CAA78), 11.dp.toPx(), Offset(tl.x + cs / 2, tl.y + cs / 2))
                }
            }
        }
        for (r in 0 until Casino.ROWS) for (c in 0 until Casino.COLS) {
            val p = t.board[r][c] ?: continue
            val lifted = dragCell?.let { it.first == r && it.second == c } == true
            Box(Modifier.offset((c * CS).dp, (r * CS).dp).size(CS.dp).graphicsLayer { alpha = if (lifted) .25f else 1f }, contentAlignment = Alignment.Center) {
                Sprite("mgp_${p.t}${p.c}", (CS - 4).dp, outline = false)
            }
        }
        // la pieza que se arrastra sigue al dedo
        val d = drag
        val dc = dragCell
        if (d != null && dc != null) {
            val p = t.board[dc.first][dc.second]
            if (p != null) Box(
                Modifier.offset { IntOffset((d.x - CS.dp.toPx() / 2).roundToInt(), (d.y - CS.dp.toPx() / 2).roundToInt()) }
                    .size(CS.dp).graphicsLayer { scaleX = 1.15f; scaleY = 1.15f; rotationZ = -6f }
            ) { Sprite("mgp_${p.t}${p.c}", (CS - 4).dp, outline = false) }
        }
    }
}

/** La casilla (fila, columna) que está bajo el punto [o] del tablero, con casillas de [cs] px. */
private fun cellAt(o: Offset, cs: Float): Pair<Int, Int>? {
    if (o.x < 0 || o.y < 0) return null
    val r = (o.y / cs).toInt()
    val c = (o.x / cs).toInt()
    return if (r in 0 until Casino.ROWS && c in 0 until Casino.COLS) r to c else null
}
