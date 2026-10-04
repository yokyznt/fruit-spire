package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.DeckChange
import com.yokyznt.fruitspire.core.Dungeon
import com.yokyznt.fruitspire.core.EventDef
import com.yokyznt.fruitspire.core.EventOption
import com.yokyznt.fruitspire.core.Fate
import com.yokyznt.fruitspire.core.Rewards
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Cards

// ---------------------------------------------------------------------------------------------------------------
// Eventos de misterio
// ---------------------------------------------------------------------------------------------------------------
private val LEAVE_RE = Regex("^(seguir|alejar|rechaz|dejar|ignorar|no vale|no molestar|mirar|taparte|pisar con cuidado|tirarle una piedra)", RegexOption.IGNORE_CASE)
private val RISK_RE = Regex("pierdes|−|pag[au]|apuestas|\\d+ de oro\\)|50%|gusano|magullada|marcada|máx\\. \\(|dar \\d+", RegexOption.IGNORE_CASE)

/** Tono de una opción: good (azul) · risk (amarillo) · bad (rojo) · neutral (papel). Igual que `optionTone` de la web. */
fun optionTone(o: EventOption): String = o.tone ?: when {
    o.special == "fight" -> "bad"
    o.special != null -> "risk"
    LEAVE_RE.containsMatchIn(o.text) -> "neutral"
    RISK_RE.containsMatchIn(o.text) -> "risk"
    else -> "good"
}

private fun toneColor(tone: String): Color = when (tone) {
    "good" -> Color(0xFF8FD0F0)
    "risk" -> Ink.banana
    "bad" -> Color(0xFFFF9DAE)
    else -> Color(0xFFEFE6D6)
}

/** Un dibujo por id (o su emoji si no hay). */
@Composable
private fun ArtOrEmoji(id: String, emoji: String, size: Dp) {
    if (SpriteStore.has(id)) Sprite(id, size) else BasicText(emoji, style = Fonts.body(size.value * .8f))
}

@Composable
private fun EventArt(ev: EventDef, size: Dp = 110.dp) = ArtOrEmoji(ev.sprite ?: ev.id, ev.icon, size)

@Composable
fun EventScreen(run: Run, onOption: (Int) -> Unit) {
    val ev = run.currentEvent ?: return
    PaperScreen(ev.title, art = { EventArt(ev) }) {
        BasicText(ev.desc, style = Fonts.body(18f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center), modifier = Modifier.width(720.dp))
        Column(Modifier.width(580.dp).padding(top = 6.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            ev.options.forEachIndexed { i, o ->
                val locked = o.locked?.invoke(run.player).orEmpty()
                Box(
                    Modifier.fillMaxWidth().graphicsLayer { alpha = if (locked.isEmpty()) 1f else .5f }
                        .stickerCard(16.dp, fill = toneColor(optionTone(o)))
                        .let { m -> if (locked.isEmpty()) m.tap { onOption(i) } else m }
                        .padding(horizontal = 18.dp, vertical = 12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GameText(o.text, Fonts.body(17f, FontWeight.Medium))
                        if (locked.isNotEmpty()) BasicText("($locked)", style = Fonts.body(13f, color = Ink.inkSoft))
                    }
                }
            }
        }
    }
}

/** Lo que le pasó al mazo (madurar, quitar, transformar, maldición que entra), una sola vez y animado al aparecer. */
@Composable
private fun DeckChangesRow(changes: List<DeckChange>) {
    if (changes.isEmpty()) return
    Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(22.dp), verticalAlignment = Alignment.Top) {
        changes.take(4).forEachIndexed { i, ch ->
            val appear = remember { Animatable(0f) }
            LaunchedEffect(Unit) { kotlinx.coroutines.delay(i * 140L); appear.animateTo(1f, spring(dampingRatio = .55f, stiffness = Spring.StiffnessMediumLow)) }
            Column(
                Modifier.graphicsLayer { scaleX = .6f + .4f * appear.value; scaleY = scaleX; alpha = appear.value.coerceIn(0f, 1f) },
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    ch.from?.let { id -> Cards.get(id)?.let { c -> Scaled(.4f, CARD_W, CARD_H, Modifier.graphicsLayer { alpha = if (ch.to != null) .55f else 1f }) { CardView(c) } } }
                    if (ch.from != null && ch.to != null) BasicText("→", style = Fonts.display(28f))
                    ch.to?.let { id -> Cards.get(id)?.let { c -> Scaled(.4f, CARD_W, CARD_H) { CardView(c, glow = if (ch.kind == "upgrade") Ink.mint else null) } } }
                }
                val name = Cards.get(ch.to ?: ch.from)?.name ?: ""
                val label = when (ch.kind) { "transform" -> "se transformó"; "upgrade" -> "¡madurada!"; "remove" -> "salió de tu mazo"; else -> "entró a tu mazo" }
                BasicText(name, style = Fonts.hand(18f))
                BasicText(label, style = Fonts.body(12.5f, color = Ink.inkSoft))
            }
        }
    }
}

/** Lo que pasó tras elegir una opción: el texto, los cambios del mazo y los premios por recoger. */
@Composable
fun EventResultScreen(run: Run, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onContinue: () -> Unit) {
    val ev = run.currentEvent
    val full = Rewards.seedsFull(run.player)
    PaperScreen(ev?.title ?: "Misterio", art = { ev?.let { EventArt(it, 96.dp) } }) {
        GameText(run.nodeMessage, Fonts.hand(24f).copy(textAlign = TextAlign.Center), Modifier.width(760.dp))
        DeckChangesRow(run.deckChanges)
        Row(Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
            run.loot.forEachIndexed { i, it -> if (!it.dropped) LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) }
        }
        StickerButton("Continuar", onContinue, color = Ink.mint, enabled = !run.lootPending(), fontSize = 21f)
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Pozo de los Deseos
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun WellScreen(run: Run, onToss: () -> Unit, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onLeave: () -> Unit) {
    val cost = run.wellCost()
    val pending = run.lootPending()
    val full = Rewards.seedsFull(run.player)
    PaperScreen("Pozo de los Deseos", art = { Sprite("node_well", 104.dp) }) {
        BasicText("Cada moneda cuesta más. Para cuando quieras.", style = Fonts.body(18f, color = Ink.inkSoft))
        if (run.wellMessage.isNotEmpty()) GameText(run.wellMessage, Fonts.hand(24f).copy(textAlign = TextAlign.Center), Modifier.width(700.dp))
        DeckChangesRow(run.deckChanges)
        Row(horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
            run.loot.forEachIndexed { i, it -> if (!it.dropped) LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) }
        }
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            StickerButton(
                "Tirar moneda ($cost)", onToss, color = Ink.mint, enabled = run.player.gold >= cost && !pending, fontSize = 20f,
                leading = { Sprite("ui_coin", 26.dp) }
            )
            StickerButton("Irme", onLeave, secondary = true, enabled = !pending, fontSize = 18f)
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Calabozo de la Trampilla (3×3)
// ---------------------------------------------------------------------------------------------------------------
private const val DG_CELL = 126f

@Composable
private fun DungeonCell(d: Dungeon, x: Int, y: Int, charId: String, onClick: () -> Unit) {
    val here = d.pos.x == x && d.pos.y == y
    val isExit = d.exit.x == x && d.exit.y == y
    val cleared = d.cleared[y][x]
    val adjacent = !here && Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y) == 1
    val fill = if (here) Ink.bananaSoft else if (cleared) Color(0xFFE8E2F0) else Color(0xFF6A5A82)
    Box(
        Modifier.size(DG_CELL.dp).stickerCard(18.dp, fill = fill, glow = if (adjacent) Ink.banana else null).let { m -> if (adjacent) m.tap(true, onClick) else m },
        contentAlignment = Alignment.Center
    ) {
        when {
            here -> Sprite(charId, 92.dp)
            isExit -> ArtOrEmoji("node_stairs", "🪜", 84.dp)
            cleared -> ArtOrEmoji("dg_bones", "🦴", 70.dp)
            else -> ArtOrEmoji(if ((d.deco + x * 3 + y) % 3 == 0) "dg_ghost" else "dg_skull", "💀", 78.dp)
        }
        if (isExit && !cleared) Box(Modifier.align(Alignment.TopEnd).padding(6.dp)) { ArtOrEmoji("dg_skull", "💀", 28.dp) }
    }
}

@Composable
fun DungeonScreen(run: Run, onCell: (Int, Int) -> Unit) {
    val d = run.dungeon ?: return
    PaperScreen("Calabozo de la Trampilla") {
        BasicText("Pelea hasta la escalera de arriba.", style = Fonts.body(18f, color = Ink.inkSoft))
        Column(
            Modifier.padding(top = 4.dp).stickerCard(24.dp, fill = Color(0xFF3B3050)).padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            for (y in 0 until 3) Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for (x in 0 until 3) DungeonCell(d, x, y, run.player.characterId) { onCell(x, y) }
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Dado del destino
// ---------------------------------------------------------------------------------------------------------------
/** El dado de 20 caras (`d20Svg` de la web) con su número. */
@Composable
fun D20(n: Int?, size: Dp, modifier: Modifier = Modifier, tilt: Float = 0f) {
    Box(modifier.size(size).graphicsLayer { rotationZ = tilt }, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val k = this.size.minDimension / 100f
            scale(k, k, pivot = Offset.Zero) {
                val body = Path().apply { moveTo(50f, 4f); lineTo(91f, 27f); lineTo(91f, 73f); lineTo(50f, 96f); lineTo(9f, 73f); lineTo(9f, 27f); close() }
                drawPath(body, Color(0xFF9B7FD4))
                val top = Path().apply { moveTo(50f, 4f); lineTo(27f, 62f); lineTo(73f, 62f); close() }
                drawPath(top, Color(0xFFD9CCF5))
                val lines = Path().apply {
                    moveTo(9f, 27f); lineTo(27f, 62f); moveTo(91f, 27f); lineTo(73f, 62f)
                    moveTo(27f, 62f); lineTo(50f, 96f); lineTo(73f, 62f); moveTo(9f, 73f); lineTo(27f, 62f); moveTo(91f, 73f); lineTo(73f, 62f)
                }
                drawPath(lines, Ink.ink, style = Stroke(3f, join = StrokeJoin.Round))
                drawPath(top, Ink.ink, style = Stroke(3f, join = StrokeJoin.Round))
                drawPath(body, Ink.ink, style = Stroke(5f, join = StrokeJoin.Round))
            }
        }
        BasicText(n?.toString() ?: "?", style = Fonts.display(size.value * .34f), modifier = Modifier.padding(top = (size.value * .08f).dp))
    }
}

@Composable
fun FateScreen(run: Run, shown: Int?, rolling: Boolean, onRoll: () -> Unit, onFight: () -> Unit) {
    val roll = run.fateRoll
    val tier = roll?.let { Fate.tier(it) }
    val boss = run.boss
    PaperScreen("Dado del destino", art = { ArtOrEmoji(boss.sprite ?: boss.id, boss.icon, 110.dp) }) {
        val wobble = remember { Animatable(0f) }
        LaunchedEffect(shown) { if (rolling) { wobble.snapTo(-14f); wobble.animateTo(14f, spring(dampingRatio = .3f, stiffness = 400f)) } }
        D20(if (roll != null) roll else shown, 150.dp, Modifier.padding(vertical = 4.dp), tilt = if (rolling) wobble.value else 0f)
        if (tier != null) {
            val col = when (tier.id) { "crit", "good" -> Ink.mintDark; "bad", "fumble" -> Ink.strawberry; else -> Ink.inkSoft }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                BasicText(tier.name, style = Fonts.display(30f, col))
                BasicText("· ${tier.text}", style = Fonts.hand(24f))
            }
            StickerButton("¡A pelear!", onFight, color = Ink.mint, fontSize = 22f)
        } else {
            BasicText("Tira antes de pelear.", style = Fonts.body(19f, color = Ink.inkSoft))
            StickerButton("Tirar", onRoll, color = Ink.banana, enabled = !rolling, fontSize = 22f)
        }
    }
}
