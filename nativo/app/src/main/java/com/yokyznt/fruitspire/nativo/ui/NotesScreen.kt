package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.data.PatchNote
import com.yokyznt.fruitspire.core.data.gen.CREATOR_HANDLE
import com.yokyznt.fruitspire.core.data.gen.CREATOR_URL
import com.yokyznt.fruitspire.core.data.gen.GAME_VERSION
import com.yokyznt.fruitspire.core.data.gen.GEN_PATCH_NOTES

// ---------------------------------------------------------------------------------------------------------------
// Notas de la versión (renderNotes de js/notes.js): lo nuevo y lo arreglado en cada versión, y el Instagram del creador.
// A la izquierda el título y el creador; a la derecha las notas, la más nueva primero.
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun NotesScreen(onBack: () -> Unit, endingSeen: Boolean = false, onReplayStory: () -> Unit = {}, onReplayEnding: () -> Unit = {}) {
    val uri = LocalUriHandler.current
    Row(Modifier.fillMaxSize().padding(horizontal = 26.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
        Column(
            Modifier.width(340.dp).fillMaxHeight(),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)
        ) {
            Sprite("ui_notes", 76.dp)
            BasicText("Notas de la versión", style = Fonts.hand(38f).copy(textAlign = TextAlign.Center))
            BasicText("Estás en la versión $GAME_VERSION", style = Fonts.body(15f, color = Ink.inkSoft))
            CreatorCard { uri.openUri(CREATOR_URL) }
            // repetir la historia y, si ya la viste, el final (js/notes.js)
            StickerButton("Ver la historia otra vez", onReplayStory, color = Ink.banana, fontSize = 18f, padding = PaddingValues(horizontal = 22.dp, vertical = 8.dp))
            if (endingSeen) StickerButton("Ver el final otra vez", onReplayEnding, color = Ink.mint, fontSize = 18f, padding = PaddingValues(horizontal = 22.dp, vertical = 8.dp))
            StickerButton("Volver", onBack, secondary = true, fontSize = 18f, padding = PaddingValues(horizontal = 26.dp, vertical = 6.dp))
        }
        LazyColumn(
            Modifier.weight(1f).fillMaxHeight(), contentPadding = PaddingValues(top = 6.dp, bottom = 12.dp, end = 4.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            itemsIndexed(GEN_PATCH_NOTES, key = { _, n -> n.version }) { i, n -> NoteCard(n, latest = i == 0) }
        }
    }
}

/** La tarjeta del creador: abre su Instagram (`.creator-card`). */
@Composable
private fun CreatorCard(onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().drawBehind {
            val r = 16.dp.toPx()
            val ink = 2.dp.toPx()
            drawRoundRect(Ink.ink, Offset(-ink, -ink + 4.dp.toPx()), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(r + ink))
            drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + ink * 2, size.height + ink * 2), CornerRadius(r + ink))
            drawRoundRect(Brush.horizontalGradient(listOf(Color(0xFFFFE0F0), Color(0xFFFFF0C8))), cornerRadius = CornerRadius(r))
        }.clickable(remember { MutableInteractionSource() }, null) { onClick() }.padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Sprite("ui_insta", 54.dp)
        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
            BasicText("¡Sígueme en Instagram!", style = Fonts.hand(23f))
            BasicText(
                buildAnnotatedString {
                    append("Creador del juego: ")
                    pushStyle(SpanStyle(color = Color(0xFFC13584), fontWeight = FontWeight.Bold, textDecoration = TextDecoration.Underline))
                    append(CREATOR_HANDLE)
                    pop()
                },
                style = Fonts.body(14f)
            )
        }
    }
}

@Composable
private fun NoteCard(n: PatchNote, latest: Boolean) {
    val shape = RoundedCornerShape(14.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(if (latest) Color(0xFFFFFBEA) else Color(0x99FFFFFF))
            .border(if (latest) 3.dp else 2.dp, if (latest) Ink.banana else Color(0xFFE6D6BC), shape).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.chip(99.dp, Ink.mint).padding(horizontal = 12.dp)) { BasicText("v${n.version}", style = Fonts.hand(22f, Color.White)) }
            BasicText(n.title, style = Fonts.hand(27f), modifier = Modifier.weight(1f, fill = false))
            BasicText(n.date, style = Fonts.body(13f, color = Ink.inkSoft))
            if (latest) Box(Modifier.chip(99.dp, Ink.strawberry).padding(horizontal = 10.dp)) { BasicText("¡Nueva!", style = Fonts.body(12.5f, FontWeight.Bold, Color.White)) }
        }
        n.items.forEach { Bullet(it) }
        if (n.fixes.isNotEmpty()) {
            BasicText("Arreglos", style = Fonts.hand(22f, Color(0xFF8C5A2E)), modifier = Modifier.padding(top = 4.dp))
            n.fixes.forEach { Bullet(it) }
        }
    }
}

@Composable
private fun Bullet(text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        BasicText("•", style = Fonts.body(15f, FontWeight.Bold, Ink.inkSoft))
        BasicText(text, style = Fonts.body(14.5f).copy(lineHeight = 20.sp), modifier = Modifier.weight(1f))
    }
}
