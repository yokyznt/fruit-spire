package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds

/** Lo que muestra la barra de arriba (todo valores, para que Compose pueda saltarse lo que no cambió). */
@Immutable
data class HudState(
    val charId: String,
    val castle: Int,
    val floor: Int,
    val floorName: String,
    val diffSprite: String,
    val hp: Int,
    val maxHp: Int,
    val gold: Int,
    val deck: Int,
    val relics: List<String>,
    val seeds: List<String?>,
    /** Hay semillas y es tu turno de combate: la mochila avisa. */
    val seedReady: Boolean = false,
    /** Objetos + semillas que ya llegaron a la mochila (lo que aún vuela no cuenta): sube con el brinco de la casilla. */
    val bag: Int = 0
)

/** Lo que muestra la barra: la partida real menos lo que todavía vuela hacia ella ([flights]), que se suma al llegar. */
fun hudStateOf(run: Run, seedReady: Boolean = false, flights: List<Flight> = emptyList()): HudState {
    val p = run.player
    val relics = p.relics.toList().let { all -> all.dropLast(flights.sumOf { it.relicGain }.coerceAtMost(all.size)) }
    return HudState(
        p.characterId, p.act, p.floor, run.theme.name, run.difficulty.sprite,
        maxOf(0, p.hp - flights.sumOf { it.hpGain }), maxOf(1, p.maxHp - flights.sumOf { it.maxHpGain }),
        maxOf(0, p.gold - flights.sumOf { it.goldGain }), maxOf(0, p.deck.size - flights.sumOf { it.deckGain }),
        relics, p.seeds.toList(), seedReady,
        bag = maxOf(0, relics.size + p.seeds.count { it != null } - flights.count { it.kind == "seed" })
    )
}

/** Pastilla blanca con contorno de tinta y sombrita (`.hud-chip`). */
fun Modifier.chip(radius: Dp = 99.dp, fill: Color = Ink.edge): Modifier = drawBehind {
    val r = radius.toPx().coerceAtMost(size.minDimension / 2f)
    val ink = 2.dp.toPx()
    drawRoundRect(Color(0x2E4A3428), Offset(2.dp.toPx(), 4.dp.toPx()), size, CornerRadius(r))
    drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(r + ink))
    drawRoundRect(fill, Offset.Zero, size, CornerRadius(r))
}

/** Reverso de una carta (las pilas y el botón del mazo). */
@Composable
fun CardBack(width: Dp, height: Dp, modifier: Modifier = Modifier, color: Color = Ink.peach) {
    Canvas(modifier.size(width, height)) {
        val r = 9.dp.toPx() * (size.width / 64.dp.toPx())
        val ink = 2.dp.toPx() * (size.width / 64.dp.toPx()).coerceAtLeast(.6f)
        val edge = 4.dp.toPx() * (size.width / 64.dp.toPx()).coerceAtLeast(.5f)
        drawRoundRect(Color(0x2E4A3428), Offset(2.dp.toPx(), 3.dp.toPx()), size, CornerRadius(r))
        drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(r + ink))
        drawRoundRect(Ink.edge, Offset.Zero, size, CornerRadius(r))
        val inner = Size(size.width - edge * 2, size.height - edge * 2)
        drawRoundRect(color, Offset(edge, edge), inner, CornerRadius((r - edge).coerceAtLeast(2f)))
        // lunares blancos y el sol amarillo del centro
        val step = 12.dp.toPx() * (size.width / 64.dp.toPx())
        var y = edge + step / 2
        while (y < size.height - edge) {
            var x = edge + step / 2
            while (x < size.width - edge) { drawCircle(Color.White.copy(alpha = .75f), 1.3.dp.toPx() * (size.width / 64.dp.toPx()), Offset(x, y)); x += step }
            y += step
        }
        drawCircle(Ink.banana, 9.dp.toPx() * (size.width / 64.dp.toPx()), Offset(size.width / 2, size.height / 2))
    }
}

/**
 * Barra de arriba: fruta (vuelve al menú), castillo y piso, vida, oro, mochila, mazo y ajustes. Va flotando sobre
 * la pantalla, sin fondo (como en el teléfono de la versión web). [compact] la hace un poco más baja (combate).
 */
@Composable
fun HudBar(
    state: HudState,
    onMenu: () -> Unit,
    onBag: () -> Unit,
    onDeck: () -> Unit,
    onSettings: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    /** Sube con cada compra que no alcanzó: la casilla del oro tiembla (shakeSoft). */
    goldNope: Int = 0
) {
    val scale = if (compact) 1f else 1.17f
    // la casilla del oro: se sacude si no alcanzó (shakeSoft) y da un pulso al gastar (coinSpend, 0,45 s)
    val goldShake = remember { Animatable(1f) }
    var seenNope by remember { mutableIntStateOf(goldNope) }
    LaunchedEffect(goldNope) {
        if (goldNope != seenNope) {
            seenNope = goldNope
            goldShake.snapTo(0f); goldShake.animateTo(1f, tween(SHAKE_MS, easing = LinearEasing))
        }
    }
    val goldSpend = remember { Animatable(1f) }
    var lastGold by remember { mutableIntStateOf(state.gold) }
    LaunchedEffect(state.gold) {
        if (state.gold < lastGold) { goldSpend.snapTo(0f); goldSpend.animateTo(1f, tween(SHAKE_MS, easing = LinearEasing)) }
        lastGold = state.gold
    }
    val safe = LocalSafeInsets.current
    // en pantallas poco anchas (4:3, tabletas) se quita lo repetido o secundario para que nada se salga por la derecha
    val narrow = LocalDesignWidth.current < 1000f
    Row(
        modifier.fillMaxWidth().height((58 * scale).dp).padding(start = (22f + safe.left).dp, end = (22f + safe.right).dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy((12 * scale).dp)
    ) {
        Box(Modifier.tapButton { onMenu() }) { FruitSprite(state.charId, (40 * scale).dp) }
        Spacer(Modifier.weight(1f))
        // castillo y piso
        Row(
            Modifier.rotate(-1f).chip().padding(start = 8.dp, end = 14.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Sprite(state.diffSprite, 24.dp)
            BasicText("Castillo ${state.castle}", style = Fonts.display(19f * scale))
            BasicText(if (narrow) "Piso ${state.floor}" else "Piso ${state.floor} · ${state.floorName}", style = Fonts.hand(19f * scale, Ink.inkSoft))
        }
        // vida
        HudGain(state.hp, Color(0xFFC8374F), "hp") {
            Row(
                Modifier.rotate(-1.5f).chip().padding(start = 8.dp, end = 14.dp, top = 5.dp, bottom = 5.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Sprite("ui_heart", 24.dp)
                BasicText("${state.hp}/${state.maxHp}", style = Fonts.body(18f * scale, FontWeight.Bold))
                if (!narrow) HpBar(state.hp, state.maxHp, Modifier.width(80.dp), height = 14.dp, showText = false)
            }
        }
        // oro
        HudGain(state.gold, Color(0xFFC98A00), "gold") {
            val spend = spendPulse(goldSpend.value)
            Row(
                Modifier
                    .graphicsLayer {
                        translationX = shakeSoft(goldShake.value) * density
                        rotationZ = -4.5f * spend; scaleX = 1f + .15f * spend; scaleY = 1f + .15f * spend
                    }
                    .rotate(1.5f).chip(fill = lerp(Ink.edge, Ink.bananaSoft, spend))
                    .padding(start = 8.dp, end = 14.dp, top = 5.dp, bottom = 5.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Sprite("ui_coin", 24.dp)
                BasicText("${state.gold}", style = Fonts.body(18f * scale, FontWeight.Bold))
            }
        }
        // mochila: cuántos objetos, los dos últimos y las semillas
        HudGain(state.bag, Color(0xFF8C5A3C), "bag") {
            Row(
                Modifier.chip(14.dp, if (state.seedReady) Ink.mintSoft else Ink.edge).tapButton { onBag() }
                    .padding(start = 8.dp, end = 12.dp, top = 5.dp, bottom = 5.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                Sprite("ui_bag", 28.dp)
                BasicText("${state.relics.size}", style = Fonts.display(20f * scale))
                state.relics.takeLast(if (narrow) 1 else 2).reversed().forEach { rid ->
                    if (Relics.get(rid) != null) Sprite(rid, 24.dp)
                }
                state.seeds.forEach { id ->
                    val seed = id?.let { Seeds.get(it) }
                    if (seed != null) SeedArt(seed, 20.dp) else Box(Modifier.size(12.dp).drawBehind {
                        drawCircle(Ink.inkSoft.copy(alpha = .5f), size.minDimension / 2f - 1f, style = Stroke(1.5.dp.toPx()))
                    })
                }
            }
        }
        // mazo
        HudGain(state.deck, Color(0xFF4A7BD0), "deck") {
            Row(
                Modifier.rotate(-1f).chip(14.dp).tapButton { onDeck() }
                    .padding(start = 10.dp, end = 12.dp, top = 5.dp, bottom = 5.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(Modifier.size(38.dp, 44.dp)) {
                    CardBack(28.dp, 40.dp, Modifier.offset(0.dp, 3.dp).rotate(-10f))
                    CardBack(28.dp, 40.dp, Modifier.offset(9.dp, 0.dp).rotate(6f))
                }
                BasicText("Mazo", style = Fonts.body(18f * scale, FontWeight.Medium))
                Box(Modifier.chip(99.dp, Ink.banana).padding(horizontal = 10.dp)) {
                    BasicText("${state.deck}", style = Fonts.display(21f))
                }
            }
        }
        // ajustes
        StickerButton(
            "", onSettings, color = Ink.paper2, padding = PaddingValues(8.dp), leading = { Sprite("ui_gear", (34 * scale).dp) }
        )
    }
}
