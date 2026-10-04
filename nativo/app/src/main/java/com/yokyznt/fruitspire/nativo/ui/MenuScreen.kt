package com.yokyznt.fruitspire.nativo.ui

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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.ui.draw.drawBehind
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.sin

/** Menú principal (renderMainMenu del juego web, en su distribución de teléfono). */
@Composable
fun MenuScreen(
    canContinue: Boolean,
    onContinue: () -> Unit,
    onNewGame: () -> Unit,
    onTutorial: () -> Unit,
    onPass: () -> Unit,
    onWardrobe: () -> Unit,
    onCollection: () -> Unit,
    onNotes: () -> Unit,
    onSettings: () -> Unit,
    /** Premios del pase por reclamar (se muestra como insignia en el botón). */
    passBadge: Int = 0,
    /** Hay notas de la versión sin leer (puntito rojo en el botón Notas). */
    notesBadge: Boolean = false
) {
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            // las cuatro frutas se mecen, cada una a su ritmo
            val time by rememberInfiniteTransition(label = "menu").animateFloat(
                0f, 1f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart), label = "mecer"
            )
            Row(horizontalArrangement = Arrangement.spacedBy(40.dp)) {
                listOf("manzana", "platanin", "kiwi", "uva").forEachIndexed { i, id ->
                    FruitSprite(id, 108.dp, Modifier.graphicsLayer {
                        val wave = sin((time + i * 0.135f) * 2f * PI.toFloat())
                        rotationZ = wave * 4f
                        translationY = (-3f - wave * 3f) * density
                        transformOrigin = TransformOrigin(.5f, 1f)
                    })
                }
            }
            Logo("Fruit Spire", 128f)
            BasicText("Sube la torre y rescata al Rey Fruta", style = Fonts.hand(34f, Ink.inkSoft))
            Spacer(Modifier.height(10.dp))
            val wide = Modifier.width(470.dp)
            val pad = PaddingValues(horizontal = 20.dp, vertical = 13.dp)
            Column(verticalArrangement = Arrangement.spacedBy(17.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(26.dp)) {
                    StickerButton("Continuar partida", onContinue, wide, enabled = canContinue, fontSize = 27f, padding = pad)
                    StickerButton("Partida nueva", onNewGame, wide, color = Ink.mint, fontSize = 27f, padding = pad)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(26.dp)) {
                    StickerButton("Cómo jugar", onTutorial, wide, color = Ink.banana, fontSize = 27f, padding = pad)
                    Box(wide) {
                        StickerButton("Pase de Batalla", onPass, Modifier.fillMaxWidth(), color = Ink.strawberryBtn, fontSize = 27f, padding = pad)
                        if (passBadge > 0) {
                            Box(
                                Modifier.align(Alignment.TopEnd).offset(10.dp, (-12).dp).size(38.dp).drawBehind {
                                    drawCircle(Ink.ink, size.minDimension / 2 + 2.dp.toPx()); drawCircle(Ink.mint, size.minDimension / 2)
                                },
                                contentAlignment = Alignment.Center
                            ) { BasicText("$passBadge", style = Fonts.display(22f, Color.White)) }
                        }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(26.dp)) {
                    StickerButton("Vestidor", onWardrobe, wide, color = Ink.grapeBtn, fontSize = 27f, padding = pad)
                    StickerButton("Colección", onCollection, wide, secondary = true, fontSize = 26f, padding = pad)
                }
            }
        }
        // esquinas: notas (arriba a la izquierda) y ajustes (arriba a la derecha)
        Box(Modifier.align(Alignment.TopStart).padding(start = 40.dp, top = 22.dp)) {
            StickerButton("Notas", onNotes, color = Color.White, fontSize = 26f, leading = { Sprite("ui_notes", 40.dp) })
            if (notesBadge) {
                Box(
                    Modifier.align(Alignment.TopEnd).offset(4.dp, (-6).dp).size(20.dp).drawBehind {
                        drawCircle(Color.White, size.minDimension / 2); drawCircle(Ink.strawberry, size.minDimension / 2 - 3.dp.toPx())
                    }
                )
            }
        }
        StickerButton(
            "", onSettings, Modifier.align(Alignment.TopEnd).padding(end = 40.dp, top = 22.dp),
            color = Ink.paper2, padding = PaddingValues(12.dp), leading = { Sprite("ui_gear", 44.dp) }
        )
    }
}
