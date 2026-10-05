package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.CharacterDef
import com.yokyznt.fruitspire.core.data.Difficulty
import com.yokyznt.fruitspire.core.data.World

/** Cinta washi de colores que sujeta cada foto (rayas o lunares). */
@Composable
fun Tape(kind: Int, modifier: Modifier = Modifier, rotation: Float = -3f) {
    Box(
        modifier.width(100.dp).height(28.dp).graphicsLayer { rotationZ = rotation }.drawBehind {
            val base = when (kind % 4) { 0 -> Color(0xB3FF9E7A); 1 -> Color(0xBF5CC9A7); 2 -> Color(0xD9FFCF4D); else -> Color(0xB39B7FD4) }
            val light = when (kind % 4) { 0 -> Color(0xB3FFD6C8); 2 -> Color(0xD9FFF1C2); else -> Color(0xE6FFFFFF) }
            drawRect(base)
            if (kind % 2 == 0) {
                var x = -size.height
                while (x < size.width) { drawLine(light, Offset(x, size.height), Offset(x + size.height, 0f), strokeWidth = 7.dp.toPx() * .7f); x += 14.dp.toPx() }
            } else {
                var y = 5.dp.toPx()
                while (y < size.height) {
                    var x = 5.dp.toPx()
                    while (x < size.width) { drawCircle(light, 2.dp.toPx(), Offset(x, y)); x += 10.dp.toPx() }
                    y += 10.dp.toPx()
                }
            }
        }
    )
}

/** Foto instantánea de una fruta (`.polaroid`): se levanta y salta cuando está elegida. */
@Composable
private fun Polaroid(c: CharacterDef, index: Int, selected: Boolean, progress: Progress, onClick: () -> Unit) {
    val tilt = floatArrayOf(-4f, 2f, -1.5f, 3f)[index % 4]
    val drop = floatArrayOf(0f, 12f, 0f, 6f)[index % 4]
    val photoColors = listOf(Ink.bananaSoft to Ink.peachSoft, Ink.mintSoft to Color(0xFFFFF6D6), Color(0xFFE9F6D6) to Ink.grapeSoft, Ink.grapeSoft to Color(0xFFFFE6F0))[index % 4]
    val hop by rememberInfiniteTransition(label = "salto").animateFloat(
        0f, 1f, infiniteRepeatableHop(), label = "hop"
    )
    val level = progress.level(c.id)
    Box(
        Modifier.width(240.dp).graphicsLayer {
            rotationZ = if (selected) 0f else tilt
            translationY = (if (selected) -14f else drop) * density
            scaleX = if (selected) 1.05f else 1f
            scaleY = if (selected) 1.05f else 1f
        }.drawBehind {
            if (selected) {
                val r = 4.dp.toPx(); val e = 3.dp.toPx()
                drawRoundRect(Ink.edge, Offset(-r - e, -r - e), Size(size.width + 2 * (r + e), size.height + 2 * (r + e)), CornerRadius(8.dp.toPx()))
                drawRoundRect(Ink.mint, Offset(-r, -r), Size(size.width + 2 * r, size.height + 2 * r), CornerRadius(6.dp.toPx()))
            }
            drawRoundRect(Color(0x294A3428), Offset(6.dp.toPx(), 12.dp.toPx()), size, CornerRadius(4.dp.toPx()))
            drawRoundRect(Color(0xFFE6D6BC), Offset(-1.dp.toPx(), -1.dp.toPx()), Size(size.width + 2.dp.toPx(), size.height + 2.dp.toPx()), CornerRadius(4.dp.toPx()))
            drawRoundRect(Ink.edge, Offset.Zero, size, CornerRadius(4.dp.toPx()))
        }.tapButton { onClick() }.padding(10.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier.fillMaxWidth().height(116.dp).drawBehind {
                    drawRoundRect(Brush.radialGradient(listOf(photoColors.first, photoColors.second), Offset(size.width / 2, size.height * .6f), size.maxDimension * .7f), cornerRadius = CornerRadius(2.dp.toPx()))
                },
                contentAlignment = Alignment.Center
            ) {
                Box(Modifier.graphicsLayer { if (selected) translationY = -kotlin.math.abs(kotlin.math.sin(hop * Math.PI)).toFloat() * 10f * density }) {
                    FruitSprite(c.id, 104.dp)
                }
            }
            BasicText(c.name, style = Fonts.hand(28f), modifier = Modifier.padding(top = 2.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Sprite("ui_heart", 22.dp)
                BasicText("${c.baseHp}", style = Fonts.body(17f, FontWeight.Bold, Color(0xFFC84458)))
            }
            BasicText(c.style, style = Fonts.body(14f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center, lineHeight = 17.sp), maxLines = 2, modifier = Modifier.padding(top = 1.dp).height(34.dp))
            Row(Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                World.difficulties.forEachIndexed { k, d -> Sprite(d.sprite, 24.dp, Modifier.alpha(if (k <= level) 1f else .35f)) }
            }
        }
        Box(Modifier.align(Alignment.TopCenter).padding(top = 0.dp).graphicsLayer { translationY = -24f * density }) { Tape(index, rotation = -3f) }
    }
}

private fun infiniteRepeatableHop() = infiniteRepeatable<Float>(tween(1000, easing = FastOutSlowInEasing), RepeatMode.Restart)

/** Un grado de putrefacción para elegir. */
@Composable
private fun GradeChip(d: Difficulty, selected: Boolean, locked: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.graphicsLayer { if (selected) { rotationZ = -2f; scaleX = 1.06f; scaleY = 1.06f; translationY = -5f * density }; alpha = if (locked) .55f else 1f }
            .chip(99.dp, if (selected) Ink.banana else Ink.paper2)
            .tapButton { onClick() }
            .padding(start = 6.dp, end = 16.dp, top = 4.dp, bottom = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Sprite(d.sprite, 34.dp)
            BasicText(d.name, style = Fonts.body(18f, FontWeight.Medium))
            if (locked) Sprite("ui_lock", 22.dp)
        }
    }
}

/** Elegir fruta y grado (renderCharacterSelect). */
@Composable
fun CharacterSelectScreen(
    progress: Progress,
    selectedChar: String,
    selectedDiff: String,
    onSelectChar: (String) -> Unit,
    onSelectDiff: (String) -> Unit,
    onBack: () -> Unit,
    onPlay: () -> Unit,
    onLockedGrade: () -> Unit = {}
) {
    val chars = World.characters
    val sel = chars.firstOrNull { it.id == selectedChar } ?: chars[0]
    val diff = World.difficulty(selectedDiff)
    val level = progress.level(sel.id)
    val starter = remember(sel.id) { World.starterDeck(sel.id).distinct().mapNotNull { Cards.get(it) }.filter { it.character != null } }
    Column(Modifier.fillMaxSize().padding(top = 6.dp, bottom = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        BasicText("Elige tu fruta", style = Fonts.hand(40f))
        Row(Modifier.padding(top = 28.dp, bottom = 14.dp), horizontalArrangement = Arrangement.spacedBy(26.dp)) {
            chars.forEachIndexed { i, c -> Polaroid(c, i, c.id == sel.id, progress) { onSelectChar(c.id) } }
        }
        Column(
            Modifier.width(1000.dp).paperPanel(radius = 6.dp).padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            BasicText(sel.name, style = Fonts.hand(31f))
            GameText(sel.description, Fonts.body(16.5f).copy(textAlign = TextAlign.Center))
            GameText(
                "Empieza con: " + starter.joinToString(", ") { it.name }, Fonts.body(15f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center)
            )
            Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                BasicText("Grado de putrefacción:", style = Fonts.hand(23f, Ink.inkSoft))
                World.difficulties.forEachIndexed { k, d ->
                    val locked = k > level
                    GradeChip(d, d.id == diff.id, locked) { if (locked) onLockedGrade() else onSelectDiff(d.id) }
                }
            }
            BasicText(diff.desc, style = Fonts.hand(21f, Ink.inkSoft).copy(textAlign = TextAlign.Center), modifier = Modifier.padding(top = 6.dp))
        }
        Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(24.dp), verticalAlignment = Alignment.CenterVertically) {
            StickerButton("Volver", onBack, secondary = true, fontSize = 18f)
            StickerButton("¡A jugar con ${sel.name}!", onPlay, color = Ink.mint, fontSize = 22f, padding = androidx.compose.foundation.layout.PaddingValues(horizontal = 34.dp, vertical = 12.dp))
        }
    }
}
