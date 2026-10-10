package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Cosmetics
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.data.CosmeticDef
import com.yokyznt.fruitspire.core.data.World

// ---------------------------------------------------------------------------------------------------------------
// Vestidor (renderWardrobe de js/render.js): las cuatro frutas, su vista previa y todo lo que pueden ponerse.
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun WardrobeScreen(
    progress: Progress, charId: String, rev: Int,
    onSelectChar: (String) -> Unit, onEquip: (String) -> Unit, onClear: (String) -> Unit, onBack: () -> Unit
) {
    // al ponerse algo la fruta da un saltito (dress-pop de la web); esto vive fuera del key(rev), que reconstruye la pantalla en cada cambio
    var wornTick by remember { mutableIntStateOf(0) }
    var shownTick by remember { mutableIntStateOf(0) }
    val equip: (String) -> Unit = { id -> if (progress.isOwned(id)) wornTick++; onEquip(id) }
    key(rev) { // se redibuja cada vez que cambia lo puesto (el progreso no es observable por Compose)
        val pop = remember { Animatable(1f) }
        LaunchedEffect(Unit) {
            if (wornTick > shownTick) { shownTick = wornTick; pop.snapTo(0f); pop.animateTo(1f, tween(500, easing = LinearEasing)) }
        }
        val ch = World.character(charId) ?: World.characters.first()
        val eq = progress.equippedFor(ch.id)
        val skins = Cosmetics.skinsOf(ch.id)
        val currentSkin = eq.skin ?: skins.firstOrNull()?.id
        Row(Modifier.fillMaxSize().padding(horizontal = 22.dp, vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            // izquierda: quién y cómo se ve
            Column(
                Modifier.width(340.dp).fillMaxHeight().paperPanel().padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically)
            ) {
                BasicText("Vestidor", style = Fonts.hand(40f))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    World.characters.forEach { c ->
                        val on = c.id == ch.id
                        Box(
                            Modifier.size(66.dp).stickerCard(14.dp, fill = if (on) Ink.bananaSoft else Ink.edge, glow = if (on) Ink.banana else null).tap { onSelectChar(c.id) },
                            contentAlignment = Alignment.Center
                        ) { FruitSprite(c.id, 52.dp, dressed = false) }
                    }
                }
                val hop by rememberInfiniteTransition(label = "vestidor").animateFloat(0f, 1f, infiniteRepeatable(tween(1500, easing = EaseInOut), RepeatMode.Reverse), label = "salto")
                Box(Modifier.height(190.dp), contentAlignment = Alignment.BottomCenter) {
                    Box(
                        Modifier.graphicsLayer {
                            translationY = -hop * 6f * density
                            if (pop.value < 1f) { val (s, r) = dressPopPose(pop.value); scaleX = s; scaleY = s; rotationZ = r }
                        }
                    ) { FruitSprite(ch.id, 176.dp, override = eq) }
                }
                BasicText(ch.name, style = Fonts.hand(32f))
                BasicText("${progress.owned.size} de ${Cosmetics.all.size} conseguidos", style = Fonts.body(15f, FontWeight.Medium, Ink.inkSoft))
                BasicText(
                    "Mascotitas: se ganan con retos. Colores y accesorios: en el Pase de Batalla.",
                    style = Fonts.body(13.5f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center, lineHeight = 17.sp), modifier = Modifier.padding(horizontal = 8.dp)
                )
                StickerButton("Volver", onBack, secondary = true, fontSize = 24f, padding = PaddingValues(horizontal = 34.dp, vertical = 12.dp), modifier = Modifier.padding(top = 4.dp))
            }
            // derecha: lo que se puede poner
            Column(
                Modifier.weight(1f).fillMaxHeight().paperPanel().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Section("Colores") { skins.forEach { WardItem(progress, it, it.id == currentSkin) { equip(it.id) } } }
                Cosmetics.SLOT_NAMES.forEach { (slot, title) ->
                    Section(title) {
                        NoneItem(on = eq.inSlot(slot) == null) { onClear(slot) }
                        Cosmetics.forSlot(slot, ch.id).forEach { WardItem(progress, it, eq.inSlot(slot) == it.id) { equip(it.id) } }
                    }
                }
            }
        }
    }
}

/** Un apartado con título y una cuadrícula de fichas (varias filas si no caben). */
@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        BasicText(title, style = Fonts.hand(27f))
        Wrap(content)
    }
}

/** Reparte las fichas en filas que se ajustan al ancho (sin depender de componentes experimentales). */
@Composable
private fun Wrap(content: @Composable () -> Unit) {
    Layout(content = content) { measurables, constraints ->
        val gap = 10.dp.roundToPx()
        val loose = constraints.copy(minWidth = 0, minHeight = 0)
        val placeables = measurables.map { it.measure(loose) }
        var x = 0
        var y = 0
        var rowH = 0
        val pos = placeables.map { p ->
            if (x > 0 && x + p.width > constraints.maxWidth) { x = 0; y += rowH + gap; rowH = 0 }
            val at = x to y
            x += p.width + gap
            rowH = maxOf(rowH, p.height)
            at
        }
        layout(constraints.maxWidth, y + rowH) { placeables.forEachIndexed { i, p -> p.placeRelative(pos[i].first, pos[i].second) } }
    }
}

private val ITEM_W = 106.dp
private val ITEM_H = 104.dp

@Composable
private fun NoneItem(on: Boolean, onClick: () -> Unit) {
    Column(
        Modifier.size(ITEM_W, ITEM_H).stickerCard(14.dp, fill = if (on) Ink.mintSoft else Color(0xFFF1EADB), glow = if (on) Ink.mint else null).tap(true, onClick),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
    ) {
        BasicText("✕", style = Fonts.display(38f, Ink.inkSoft))
        BasicText("Nada", style = Fonts.body(13.5f, FontWeight.Medium))
    }
}

@Composable
private fun WardItem(progress: Progress, c: CosmeticDef, on: Boolean, onClick: () -> Unit) {
    val owned = progress.isOwned(c.id)
    Column(
        Modifier.size(ITEM_W, ITEM_H).stickerCard(14.dp, fill = if (on) Ink.mintSoft else if (owned) Ink.edge else Color(0xFFF1EADB), glow = if (on) Ink.mint else null).tap(true, onClick),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
    ) {
        Box(Modifier.size(60.dp), contentAlignment = Alignment.Center) {
            when {
                owned -> CosmeticIcon(c, 56.dp)
                c.type == "pet" -> {
                    CosmeticIcon(c, 56.dp, locked = true)
                    Box(Modifier.align(Alignment.BottomEnd)) { Sprite("ui_lock", 22.dp) }
                }
                else -> BasicText("?", style = Fonts.display(40f, Ink.inkSoft))
            }
        }
        BasicText(
            if (owned || c.type == "pet") c.name else "???", style = Fonts.body(12.5f, FontWeight.Medium).copy(textAlign = TextAlign.Center, lineHeight = 14.sp),
            maxLines = 2, modifier = Modifier.padding(horizontal = 4.dp)
        )
    }
}
