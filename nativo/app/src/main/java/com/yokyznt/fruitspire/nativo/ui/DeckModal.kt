package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.data.Cards

private val TYPE_ORDER = mapOf("attack" to 0, "skill" to 1, "power" to 2, "curse" to 3)

/** Visor de cartas a pantalla completa (el mazo y las pilas del combate). Tocar fuera o el botón lo cierra. */
@Composable
fun DeckModal(title: String, note: String, ids: List<String>, onClose: () -> Unit) {
    val cards = remember(ids) {
        ids.mapNotNull { Cards.get(it) }.sortedWith(compareBy({ TYPE_ORDER[it.type] ?: 9 }, { it.cost }, { it.name }))
    }
    Column(
        Modifier.fillMaxSize().background(Ink.paper2).clickable(remember { MutableInteractionSource() }, null) { onClose() }.padding(top = 12.dp, bottom = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        BasicText(title, style = Fonts.hand(38f))
        BasicText(note, style = Fonts.body(16f, color = Ink.inkSoft))
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (cards.isEmpty()) {
                BasicText("…no hay ninguna carta aquí", style = Fonts.hand(28f, Ink.inkSoft), modifier = Modifier.align(Alignment.Center))
            } else {
                LazyVerticalGrid(
                    GridCells.Adaptive(CARD_W.dp + 14.dp), Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 28.dp, vertical = 22.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(26.dp)
                ) {
                    itemsIndexed(cards) { _, card -> Box(Modifier.padding(start = 8.dp)) { CardView(card) } }
                }
            }
        }
        StickerButton("Cerrar", onClose, fontSize = 20f)
    }
}
