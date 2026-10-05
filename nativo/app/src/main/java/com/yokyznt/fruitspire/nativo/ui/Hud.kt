package com.yokyznt.fruitspire.nativo.ui

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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
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
    val seedReady: Boolean = false
)

fun hudStateOf(run: Run, seedReady: Boolean = false): HudState {
    val p = run.player
    return HudState(
        p.characterId, p.act, p.floor, run.theme.name, run.difficulty.sprite, p.hp, p.maxHp, p.gold, p.deck.size,
        p.relics.toList(), p.seeds.toList(), seedReady
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
    compact: Boolean = false
) {
    val scale = if (compact) 1f else 1.17f
    Row(
        modifier.fillMaxWidth().height((58 * scale).dp).padding(horizontal = 22.dp),
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
            BasicText("Piso ${state.floor} · ${state.floorName}", style = Fonts.hand(19f * scale, Ink.inkSoft))
        }
        // vida
        Row(
            Modifier.rotate(-1.5f).chip().padding(start = 8.dp, end = 14.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Sprite("ui_heart", 24.dp)
            BasicText("${state.hp}/${state.maxHp}", style = Fonts.body(18f * scale, FontWeight.Bold))
            HpBar(state.hp, state.maxHp, Modifier.width(80.dp), height = 14.dp, showText = false)
        }
        // oro
        Row(
            Modifier.rotate(1.5f).chip().padding(start = 8.dp, end = 14.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Sprite("ui_coin", 24.dp)
            BasicText("${state.gold}", style = Fonts.body(18f * scale, FontWeight.Bold))
        }
        // mochila: cuántos objetos, los dos últimos y las semillas
        Row(
            Modifier.chip(14.dp, if (state.seedReady) Ink.mintSoft else Ink.edge).tapButton { onBag() }
                .padding(start = 8.dp, end = 12.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Sprite("ui_bag", 28.dp)
            BasicText("${state.relics.size}", style = Fonts.display(20f * scale))
            state.relics.takeLast(2).reversed().forEach { rid ->
                if (Relics.get(rid) != null) Sprite(rid, 24.dp)
            }
            state.seeds.forEach { id ->
                val seed = id?.let { Seeds.get(it) }
                if (seed != null) SeedArt(seed, 20.dp) else Box(Modifier.size(12.dp).drawBehind {
                    drawCircle(Ink.inkSoft.copy(alpha = .5f), size.minDimension / 2f - 1f, style = Stroke(1.5.dp.toPx()))
                })
            }
        }
        // mazo
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
        // ajustes
        StickerButton(
            "", onSettings, color = Ink.paper2, padding = PaddingValues(8.dp), leading = { Sprite("ui_gear", (34 * scale).dp) }
        )
    }
}
