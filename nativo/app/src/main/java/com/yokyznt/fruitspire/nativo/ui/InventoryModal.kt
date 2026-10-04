package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Player
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.SEED_SLOTS
import com.yokyznt.fruitspire.core.data.Seeds

private class Tier(val name: String, val order: Int, val fill: Color)

private val TIERS = mapOf(
    "common" to Tier("Común", 2, Ink.edge),
    "uncommon" to Tier("Poco común", 1, Ink.mintSoft),
    "rare" to Tier("Raro", 0, Ink.grapeSoft),
    "boss" to Tier("De jefe", -1, Ink.bananaSoft)
)
private val SEED_RARITY = mapOf("common" to "Común", "uncommon" to "Poco común", "rare" to "Rara")
private enum class Sort(val label: String) { RECENT("Recientes"), TIER("Rareza"), NAME("Nombre") }

private fun tierOf(r: RelicDef): Tier = TIERS[r.tier] ?: TIERS.getValue("common")

/** Estado extra de algunos objetos que dura toda la partida (js/inventory.js `relicStatus`). */
private fun relicStatus(r: RelicDef, p: Player): String {
    val c = p.relicCounters[r.id]
    return when (r.id) {
        "chile_picante" -> "Cartas jugadas: ${(c?.get("n") as? Int) ?: 0} de 10"
        "desafio_muerte" -> if (c?.get("used") == true) "Ya te salvó en esta partida" else "Listo para salvarte una vez"
        else -> ""
    }
}

@Composable
internal fun RelicSprite(r: RelicDef, size: Int, silhouette: Boolean = false) {
    if (SpriteStore.has(r.id)) Sprite(r.id, size.dp, silhouette = silhouette) else BasicText(r.icon, style = Fonts.body(size * .8f))
}

/**
 * La mochila (js/inventory.js): arriba las semillas (se usan en combate, en tu turno) y abajo los objetos;
 * al tocar uno se ve en grande con su rareza, lo que hace y su guiño.
 */
@Composable
fun InventoryModal(run: Run, usable: Boolean, onUseSeed: (Int) -> Unit, onDropSeed: (Int) -> Unit, onClose: () -> Unit) {
    val p = run.player
    var sel by remember { mutableStateOf<String?>(null) }
    var sort by remember { mutableStateOf(Sort.RECENT) }
    var confirmDrop by remember { mutableIntStateOf(-1) }
    val nSeeds = p.seeds.count { it != null }
    // un toque en el fondo no pasa a lo de atrás
    Column(
        Modifier.fillMaxSize().background(Ink.paper2).clickable(remember { MutableInteractionSource() }, null) { }
            .padding(top = 10.dp, start = 24.dp, end = 24.dp, bottom = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Sprite("ui_bag", 42.dp)
            BasicText("Mochila", style = Fonts.hand(38f))
            Box(Modifier.weight(1f))
            StickerButton("Cerrar", onClose, secondary = true, fontSize = 17f, padding = PaddingValues(horizontal = 18.dp, vertical = 4.dp))
        }

        // ---------- semillas ----------
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BasicText("Semillas", style = Fonts.hand(26f))
            BasicText("$nSeeds/$SEED_SLOTS", style = Fonts.body(18f, FontWeight.Bold))
            BasicText(if (usable) "¡Puedes usarlas!" else "Un uso, en tu turno.", style = Fonts.hand(19f, if (usable) Ink.mintDark else Ink.inkSoft))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            for (i in 0 until SEED_SLOTS) {
                val seed = p.seeds.getOrNull(i)?.let { Seeds.get(it) }
                Box(Modifier.weight(1f).height(122.dp).stickerCard(16.dp, fill = if (seed == null) Ink.paper else Ink.edge).padding(10.dp), contentAlignment = Alignment.Center) {
                    if (seed == null) {
                        BasicText("Hueco libre", style = Fonts.hand(21f, Ink.inkSoft))
                    } else {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            SeedArt(seed, 54.dp)
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.Bottom) {
                                    BasicText(seed.name, style = Fonts.hand(20f), maxLines = 1)
                                    BasicText(SEED_RARITY[seed.rarity] ?: "", style = Fonts.body(12f, color = Ink.inkSoft))
                                }
                                GameText(seed.desc, Fonts.body(12.5f).copy(lineHeight = 15.sp), maxLines = 3)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    StickerButton("Usar", { onUseSeed(i) }, color = Ink.mint, enabled = usable, fontSize = 14f, padding = PaddingValues(horizontal = 16.dp, vertical = 2.dp))
                                    if (confirmDrop == i) {
                                        StickerButton("¿Tirar?", { onDropSeed(i); confirmDrop = -1 }, color = Ink.strawberryBtn, fontSize = 14f, padding = PaddingValues(horizontal = 12.dp, vertical = 2.dp))
                                    } else {
                                        StickerButton("Tirar", { confirmDrop = i }, secondary = true, fontSize = 14f, padding = PaddingValues(horizontal = 12.dp, vertical = 2.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ---------- objetos ----------
        val list = remember(p.relics.toList(), sort) {
            val all = p.relics.mapNotNull { Relics.get(it) }
            when (sort) {
                Sort.RECENT -> all.reversed()
                Sort.TIER -> all.sortedWith(compareBy({ tierOf(it).order }, { it.name }))
                Sort.NAME -> all.sortedBy { it.name }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BasicText("Objetos", style = Fonts.hand(26f))
            BasicText("${list.size}", style = Fonts.body(18f, FontWeight.Bold))
            TIERS.entries.sortedBy { it.value.order }.forEach { (id, t) ->
                val n = list.count { it.tier == id }
                if (n > 0) Box(Modifier.chip(99.dp, t.fill).padding(horizontal = 10.dp, vertical = 1.dp)) { BasicText("$n ${t.name.lowercase()}", style = Fonts.body(12.5f)) }
            }
            Box(Modifier.weight(1f))
            Sort.entries.forEach { s ->
                StickerButton(s.label, { sort = s }, secondary = sort != s, color = Ink.banana, fontSize = 13f, padding = PaddingValues(horizontal = 12.dp, vertical = 1.dp))
            }
        }
        Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(Modifier.weight(1f).fillMaxHeight()) {
                if (list.isEmpty()) {
                    Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                        Sprite("ui_bag", 70.dp)
                        BasicText("Todavía no tienes objetos… ¡por ahora!", style = Fonts.hand(24f))
                        BasicText("Salen en tesoros, élites, jefes, la tiendita y eventos.", style = Fonts.body(15f, color = Ink.inkSoft))
                    }
                } else {
                    LazyVerticalGrid(
                        GridCells.Adaptive(112.dp), Modifier.fillMaxSize(), contentPadding = PaddingValues(8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(list, key = { it.id }) { r ->
                            Column(
                                Modifier.stickerCard(14.dp, fill = tierOf(r).fill, glow = if (sel == r.id) Ink.banana else null)
                                    .clickable(remember { MutableInteractionSource() }, null) { sel = if (sel == r.id) null else r.id }
                                    .padding(horizontal = 6.dp, vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                RelicSprite(r, 56)
                                BasicText(r.name, style = Fonts.body(13f, FontWeight.Medium).copy(textAlign = TextAlign.Center, lineHeight = 15.sp), maxLines = 2, modifier = Modifier.height(32.dp))
                                BasicText(tierOf(r).name, style = Fonts.hand(13f, Ink.inkSoft))
                            }
                        }
                    }
                }
            }
            // el objeto elegido, en grande
            val shown = sel?.let { Relics.get(it) }
            Column(
                Modifier.width(300.dp).fillMaxHeight().stickerCard(18.dp, fill = shown?.let { tierOf(it).fill } ?: Ink.paper).verticalScroll(rememberScrollState()).padding(14.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (shown == null) {
                    Sprite("ui_bag", 80.dp)
                    BasicText("Toca un objeto para verlo en grande.", style = Fonts.hand(22f, Ink.inkSoft).copy(textAlign = TextAlign.Center))
                } else {
                    RelicSprite(shown, 96)
                    Box(Modifier.chip(99.dp, Ink.banana).padding(horizontal = 14.dp, vertical = 1.dp)) { BasicText(tierOf(shown).name, style = Fonts.hand(16f)) }
                    BasicText(shown.name, style = Fonts.hand(28f).copy(textAlign = TextAlign.Center))
                    GameText(shown.description, Fonts.body(15.5f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp), Modifier.fillMaxWidth())
                    relicStatus(shown, p).takeIf { it.isNotEmpty() }?.let { BasicText(it, style = Fonts.body(14f, FontWeight.Medium, Ink.mintDark)) }
                    shown.ref?.let { BasicText(it, style = Fonts.hand(17f, Ink.inkSoft).copy(textAlign = TextAlign.Center)) }
                }
            }
        }
    }
}
