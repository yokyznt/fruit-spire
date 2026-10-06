package com.yokyznt.fruitspire.nativo.ui

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Cosmetics
import com.yokyznt.fruitspire.core.Pass
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.data.World
import kotlin.math.min

// ---------------------------------------------------------------------------------------------------------------
// Pase de Batalla (renderPass de js/battlepass.js): nivel, barra de experiencia y la pista de premios.
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun PassScreen(
    progress: Progress, rev: Int, onClaim: (Int) -> Unit, onClaimAll: () -> Unit, onWardrobe: () -> Unit, onBack: () -> Unit
) {
    key(rev) { // se redibuja cada vez que se reclama algo (el progreso no es observable por Compose)
        val st = Pass.state(progress)
        val claimable = Pass.unclaimed(progress)
        val track = rememberLazyListState()
        // la pista abre en el primer premio por reclamar (o en el último nivel alcanzado)
        LaunchedEffect(Unit) {
            val first = (1..st.level).firstOrNull { it !in st.claimed } ?: st.level
            track.scrollToItem((first - 2).coerceAtLeast(0))
        }
        Column(
            Modifier.fillMaxSize().padding(horizontal = 30.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically)
        ) {
            BasicText("Pase de Batalla", style = Fonts.hand(44f))
            BasicText(
                "Derrota enemigos para ganar experiencia y desbloquear colores y accesorios para tus frutas. Los jefes y las élites dan más.",
                style = Fonts.body(16f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center), modifier = Modifier.width(860.dp)
            )
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    BasicText("Nivel", style = Fonts.hand(28f))
                    BasicText("${st.level}", style = Fonts.display(46f))
                    BasicText("/${st.max}", style = Fonts.body(18f, color = Ink.inkSoft), modifier = Modifier.padding(bottom = 6.dp))
                }
                XpBar(st.pct, if (st.level >= st.max) "¡Pase completo!" else "${st.into} / ${st.need} XP")
                StickerButton(
                    "Reclamar todo${if (claimable > 0) " ($claimable)" else ""}", onClaimAll, color = Ink.banana, enabled = claimable > 0, fontSize = 20f
                )
            }
            LazyRow(
                Modifier.fillMaxWidth().height(236.dp), state = track, horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically
            ) {
                items(Pass.rewards) { r -> LevelCard(st, r, onClaim) }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StickerButton("Ir al Vestidor", onWardrobe, color = Ink.grapeBtn, fontSize = 20f)
                StickerButton("Volver", onBack, secondary = true, fontSize = 24f, padding = PaddingValues(horizontal = 34.dp, vertical = 12.dp))
            }
        }
    }
}

@Composable
private fun XpBar(pct: Int, label: String) {
    Box(
        Modifier.size(430.dp, 32.dp).drawBehind {
            val r = size.height / 2
            drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(r + 2.dp.toPx()))
            drawRoundRect(Color(0xFFEFE6D6), Offset.Zero, size, CornerRadius(r))
            if (pct > 0) drawRoundRect(Ink.mint, Offset.Zero, Size(size.width * min(100, pct) / 100f, size.height), CornerRadius(r))
        },
        contentAlignment = Alignment.Center
    ) { BasicText(label, style = Fonts.hand(22f)) }
}

@Composable
private fun LevelCard(st: Pass.State, r: Pass.Reward, onClaim: (Int) -> Unit) {
    val c = Cosmetics.get(r.id) ?: return
    val reached = r.level <= st.level
    val claimed = r.level in st.claimed
    val fill = if (claimed) Ink.mintSoft else if (reached) Ink.bananaSoft else Color(0xFFF1EADB)
    Column(
        Modifier.width(128.dp).height(204.dp).stickerCard(18.dp, fill = fill, glow = if (reached && !claimed) Ink.banana else null).padding(horizontal = 6.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        BasicText("${r.level}", style = Fonts.hand(27f))
        Box(Modifier.height(66.dp), contentAlignment = Alignment.Center) { CosmeticIcon(c, 62.dp, locked = !reached) }
        BasicText(c.name, style = Fonts.body(14f, FontWeight.Medium).copy(textAlign = TextAlign.Center, lineHeight = 15.sp), maxLines = 2, modifier = Modifier.height(32.dp))
        val who = c.char?.let { "solo ${World.character(it)?.name ?: it}" } ?: ""
        BasicText(who, style = Fonts.body(11.5f, color = Ink.inkSoft), modifier = Modifier.height(14.dp))
        when {
            claimed -> BasicText("✔ Reclamado", style = Fonts.body(14f, FontWeight.SemiBold, Ink.mintDark))
            reached -> StickerButton("Reclamar", { onClaim(r.level) }, color = Ink.mint, fontSize = 15f, padding = PaddingValues(horizontal = 12.dp, vertical = 3.dp))
            else -> Sprite("ui_lock", 26.dp)
        }
    }
}
