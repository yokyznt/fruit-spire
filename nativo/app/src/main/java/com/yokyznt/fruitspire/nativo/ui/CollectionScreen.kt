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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridItemSpanScope
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Album
import com.yokyznt.fruitspire.core.Bestiary
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.EnemyDef
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.SeedDef
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.core.data.gen.GEN_GAME_COLORS

// ---------------------------------------------------------------------------------------------------------------
// La Colección (js/collection.js + js/bestiary.js): cartas, objetos, semillas y bestiario en pestañas. Lo que aún no
// encuentras sale como silueta «???»; al tocar una ficha se ve en grande a la derecha.
// ---------------------------------------------------------------------------------------------------------------

/** Lo que se está mirando en la Colección (lo guarda el ViewModel para que al volver siga todo donde estaba). */
class CollectionState(tab: String = "cards") {
    var tab by mutableStateOf(tab)
    /** Objeto o semilla elegidos (se ven en grande). */
    var sel by mutableStateOf<String?>(null)
    /** Castillo del bestiario (1 a 3; 0 = invocados y encuentros especiales) y el enemigo elegido. */
    var bestTab by mutableIntStateOf(1)
    var bestSel by mutableStateOf<String?>(null)
    /** Todavía no se ha fijado el castillo del bestiario según la partida (lo hace el ViewModel la primera vez). */
    var fresh = true

    fun pickTab(id: String) { if (tab != id) { tab = id; sel = null } }
    fun pick(id: String) { sel = if (sel == id) null else id }
    fun pickBestTab(n: Int) { bestTab = n; bestSel = null }
    fun pickEnemy(id: String) { bestSel = if (bestSel == id) null else id }
}

private val FULL_ROW: LazyGridItemSpanScope.() -> GridItemSpan = { GridItemSpan(maxLineSpan) }
private val PAPER_LINE = Color(0xFFE6D6BC)
private val UNSEEN_FILL = Color(0xFFEFE6D6)

/** Hoja de cuaderno con renglones suaves, donde van las fichas (`.best-list`). */
private fun Modifier.lined(): Modifier = drawBehind {
    val r = 16.dp.toPx()
    drawRoundRect(Color(0xFFF7EBD5), cornerRadius = CornerRadius(r))
    var y = 22.dp.toPx()
    while (y < size.height - 4.dp.toPx()) {
        drawLine(Color(0x09000000), Offset(r / 2, y), Offset(size.width - r / 2, y), strokeWidth = 2.dp.toPx())
        y += 22.dp.toPx()
    }
    drawRoundRect(PAPER_LINE, cornerRadius = CornerRadius(r), style = Stroke(2.dp.toPx()))
}

private fun Modifier.dashedUnderline(): Modifier = drawBehind {
    drawLine(
        Color(0xFFE0CDA8), Offset(0f, size.height), Offset(size.width, size.height), strokeWidth = 2.dp.toPx(),
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8.dp.toPx(), 5.dp.toPx()))
    )
}

@Composable
private fun Modifier.tap(onClick: () -> Unit): Modifier = clickable(remember { MutableInteractionSource() }, null) { onClick() }

/** Relleno de la ficha de un objeto según su rareza (igual que en la mochila). */
private fun relicFill(tier: String): Color = when (tier) {
    "uncommon" -> Ink.mintSoft
    "rare" -> Ink.grapeSoft
    "boss" -> Ink.bananaSoft
    else -> Ink.edge
}

/** (relleno de la ficha, fondo y letra de la etiqueta) de cada nivel de enemigo. */
private class TierLook(val fill: Color, val chip: Color, val ink: Color)

private fun tierLook(k: String): TierLook = when (k) {
    "elite" -> TierLook(Color(0xFFFFE9DC), Color(0xFFFFD9C2), Color(0xFFA04A1A))
    "guard" -> TierLook(Color(0xFFFFF4D2), Color(0xFFFFE9A8), Color(0xFF8A5A0A))
    "boss" -> TierLook(Color(0xFFEFE4FF), Color(0xFFE8DCFF), Color(0xFF5A3E9E))
    "other" -> TierLook(Ink.paper2, Color(0xFFE1EEF6), Color(0xFF3E6A86))
    else -> TierLook(Ink.paper2, Color(0xFFEFE5D2), Ink.ink)
}

@Composable
fun CollectionScreen(progress: Progress, state: CollectionState, onInfo: (String) -> Unit, onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Sprite("ui_book", 44.dp)
            BasicText("Colección", style = Fonts.hand(40f))
            Spacer(Modifier.weight(1f))
            BasicText(Album.countText(state.tab, progress), style = Fonts.hand(25f, Ink.inkSoft))
            StickerButton("Volver", onBack, secondary = true, fontSize = 17f, padding = PaddingValues(horizontal = 18.dp, vertical = 4.dp))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)) {
            Album.TABS.forEach { (id, label) -> Pill(label, state.tab == id, { state.pickTab(id) }) { TabIcon(id) } }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when (state.tab) {
                "cards" -> CardsTab(progress)
                "relics" -> RelicsTab(progress, state)
                "seeds" -> SeedsTab(progress, state)
                else -> BestiaryTab(progress, state, onInfo)
            }
        }
    }
}

@Composable
private fun TabIcon(id: String) {
    when (id) {
        "cards" -> Sprite(Cards.get("golpe_cascara")?.sprite ?: "ui_play", 30.dp)
        "relics" -> Sprite("ui_bag", 30.dp)
        "seeds" -> Seeds.get("semilla_chile")?.let { SeedArt(it, 30.dp) }
        else -> Sprite("ui_book", 30.dp)
    }
}

/** Pestaña en forma de píldora: la elegida va amarilla. */
@Composable
private fun Pill(label: String, on: Boolean, onClick: () -> Unit, icon: @Composable () -> Unit) {
    Row(
        Modifier.chip(99.dp, if (on) Ink.banana else Ink.edge).tap(onClick).padding(start = 6.dp, end = 18.dp, top = 3.dp, bottom = 3.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        icon()
        BasicText(label, style = Fonts.body(17f, FontWeight.SemiBold))
    }
}

// ---------- cartas ----------
@Composable
private fun CardsTab(progress: Progress) {
    val groups = remember { Album.cardGroups() }
    LazyVerticalGrid(
        GridCells.Adaptive(CARD_W.dp + 16.dp), Modifier.fillMaxSize().lined(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(22.dp)
    ) {
        groups.forEach { g ->
            item(key = "h_${g.title}", span = FULL_ROW) {
                SectionHeader(g.sprite, g.title, "${g.cards.count { it in progress.discovered }}/${g.cards.size}")
            }
            items(g.cards, key = { it }) { id ->
                val card = Cards.get(id)
                Box(Modifier.fillMaxWidth().padding(start = 8.dp), contentAlignment = Alignment.Center) {
                    if (card != null && id in progress.discovered) CardView(card) else CardSlot()
                }
            }
        }
    }
}

/** El hueco de una carta que aún no encuentras (`.card-slot`). */
@Composable
private fun CardSlot() {
    Box(
        Modifier.size(CARD_W.dp, CARD_H.dp).clip(RoundedCornerShape(16.dp)).background(Color(0x59FFFFFF))
            .drawBehind {
                drawRoundRect(
                    Color(0xFFD9C8AE), cornerRadius = CornerRadius(16.dp.toPx()),
                    style = Stroke(3.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10.dp.toPx(), 7.dp.toPx())))
                )
            },
        contentAlignment = Alignment.Center
    ) { BasicText("?", style = Fonts.display(54f, Color(0xFFD9C8AE))) }
}

// ---------- objetos ----------
@Composable
private fun RelicsTab(progress: Progress, st: CollectionState) {
    val sel = st.sel?.let { id -> Album.relicTiers.firstNotNullOfOrNull { t -> Album.relicsOf(t.first).firstOrNull { it.id == id } } }
    ListAndDetail(
        list = {
            LazyVerticalGrid(
                GridCells.Adaptive(112.dp), Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Album.relicTiers.forEach { (tier, title, one) ->
                    val list = Album.relicsOf(tier)
                    if (list.isNotEmpty()) {
                        item(key = "h_$tier", span = FULL_ROW) { SectionHeader("ui_bag", title, "${list.count { it.id in progress.foundRelics }}/${list.size}") }
                        items(list, key = { it.id }) { r ->
                            val has = r.id in progress.foundRelics
                            Tile(has, st.sel == r.id, r.name, relicFill(tier), if (tier == "boss") one else null, null, 0, { st.pick(r.id) }) { sil -> RelicSprite(r, 64, sil) }
                        }
                    }
                }
            }
        },
        detail = {
            if (sel == null) EmptyDetail("Toca un objeto para verlo en grande.")
            else RelicDetail(sel, sel.id in progress.foundRelics)
        }
    )
}

@Composable
private fun RelicDetail(r: RelicDef, has: Boolean) {
    if (!has) {
        Undiscovered({ sil -> RelicSprite(r, 120, sil) }, "Todavía no lo consigues. Sale en tesoros, élites, jefes, la tiendita y eventos.")
        return
    }
    val tier = Album.relicTiers.firstOrNull { it.first == r.tier }?.third ?: "Común"
    RelicSprite(r, 120)
    Ribbon(tier, Color(0xFFEFE5D2), Ink.ink)
    BasicText(r.name, style = Fonts.hand(30f).copy(textAlign = TextAlign.Center))
    GameText(r.description, Fonts.body(15.5f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp), Modifier.fillMaxWidth())
    if (r.ref != null) RefBox(r)
}

/** El guiño de un objeto: de qué juego viene y por qué (`refBoxHtml`). */
@Composable
private fun RefBox(r: RelicDef) {
    val info = Album.refOf(r)
    val shape = RoundedCornerShape(14.dp)
    Row(
        Modifier.fillMaxWidth().clip(shape).background(Color(0xFFFFF6E4)).border(2.dp, Color(0xFFE8D4B0), shape).padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically
    ) {
        if (info != null && info.keys.any { SpriteStore.has("refgame~$it") }) {
            Row(horizontalArrangement = Arrangement.spacedBy((-12).dp)) {
                info.keys.forEachIndexed { i, k -> GameArt(k, Modifier.graphicsLayer { rotationZ = if (i > 0) 8f else 0f }) }
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            BasicText(if (info != null) "Guiño a ${info.games.joinToString(" y ")}" else r.ref.orEmpty(), style = Fonts.display(15.5f, Color(0xFFB0624A)))
            if (info != null) BasicText(info.text, style = Fonts.body(13f).copy(lineHeight = 17.sp))
        }
    }
}

/** El dibujito de un juego (lo más icónico de ese juego) sobre una cajita con su color. */
@Composable
private fun GameArt(key: String, modifier: Modifier = Modifier) {
    val c = remember(key) { GEN_GAME_COLORS[key]?.let { Color(android.graphics.Color.parseColor(it)) } ?: Ink.inkSoft }
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier.size(54.dp).clip(shape).background(lerp(Color.White, c, .18f)).border(2.dp, lerp(Color.White, c, .55f), shape),
        contentAlignment = Alignment.Center
    ) { Sprite("refgame~$key", 46.dp, outline = false) }
}

// ---------- semillas ----------
private val SEED_RARITY = mapOf("common" to "Común", "uncommon" to "Poco común", "rare" to "Rara")

@Composable
private fun SeedsTab(progress: Progress, st: CollectionState) {
    val sel = st.sel?.let { Seeds.get(it) }
    ListAndDetail(
        list = {
            LazyVerticalGrid(
                GridCells.Adaptive(112.dp), Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Album.seedTiers.forEach { (tier, title) ->
                    val list = Album.seedsOf(tier)
                    if (list.isNotEmpty()) {
                        item(key = "h_$tier", span = FULL_ROW) { SectionHeader("ui_heal", title, "${list.count { it.id in progress.foundSeeds }}/${list.size}") }
                        items(list, key = { it.id }) { s ->
                            Tile(s.id in progress.foundSeeds, st.sel == s.id, s.name, Ink.edge, null, null, 0, { st.pick(s.id) }) { sil -> SeedArt(s, 58.dp, silhouette = sil) }
                        }
                    }
                }
            }
        },
        detail = {
            if (sel == null) EmptyDetail("Toca una semilla para verla en grande.")
            else SeedDetail(sel, sel.id in progress.foundSeeds)
        }
    )
}

@Composable
private fun SeedDetail(s: SeedDef, has: Boolean) {
    if (!has) {
        Undiscovered({ sil -> SeedArt(s, 110.dp, silhouette = sil) }, "Todavía no la consigues. Salen en recompensas, la tiendita y algunos eventos.")
        return
    }
    SeedArt(s, 110.dp)
    Ribbon(SEED_RARITY[s.rarity] ?: "", Color(0xFFEFE5D2), Ink.ink)
    BasicText(s.name, style = Fonts.hand(30f).copy(textAlign = TextAlign.Center))
    GameText(s.desc, Fonts.body(15.5f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp), Modifier.fillMaxWidth())
    BasicText("Se usa una sola vez, en combate y durante tu turno.", style = Fonts.body(13.5f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center))
}

// ---------- bestiario ----------
@Composable
private fun BestiaryTab(progress: Progress, st: CollectionState, onInfo: (String) -> Unit) {
    val cat = Bestiary.catalog
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            cat.castles.forEach { c -> Pill("Castillo ${c.castle.n}", st.bestTab == c.castle.n, { st.pickBestTab(c.castle.n) }) { Sprite(c.castle.sprite, 30.dp) } }
            Pill("Invocados", st.bestTab == 0, { st.pickBestTab(0) }) { Sprite("node_mystery", 30.dp) }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            ListAndDetail(
                list = {
                    LazyVerticalGrid(
                        GridCells.Adaptive(112.dp), Modifier.fillMaxSize(), contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (st.bestTab == 0) {
                            enemySection("sum", "Invocados", "Aparecen cuando otro enemigo los llama, se divide o cría. Algunos también salen solos en los pisos.", "node_mystery", cat.summoned, progress, st)
                            enemySection("oth", "Encuentros especiales", "No salen en ningún piso ni los invoca nadie.", "node_enemy", cat.others, progress, st)
                        } else {
                            val c = cat.castles.firstOrNull { it.castle.n == st.bestTab } ?: cat.castles.first()
                            item(key = "castle", span = FULL_ROW) { BasicText("${c.castle.name} — ${c.castle.subtitle}", style = Fonts.hand(21f, Ink.inkSoft)) }
                            c.themes.forEach { t ->
                                val rule = t.theme.rule?.info
                                enemySection(
                                    t.theme.id, t.theme.name, t.theme.subtitle, rule?.sprite ?: "node_enemy", t.normal + t.elites + t.guards, progress, st,
                                    trailing = rule?.let { r -> { RuleChip(r.sprite, r.name) { onInfo("Regla: ${r.name}. ${r.desc}") } } }
                                )
                            }
                            enemySection("bosses", "Jefes del castillo", "Esperan al final del último piso. Solo uno te toca en cada partida.", c.castle.sprite, c.bosses, progress, st)
                        }
                    }
                },
                detail = {
                    val id = st.bestSel?.takeIf { Enemies.db.containsKey(it) }
                    if (id == null) EmptyDetail("Toca un enemigo para ver qué hace.", "Las siluetas aún no las descubres. ×N = veces derrotado.")
                    else EnemyDetail(id, progress)
                }
            )
        }
    }
}

private fun LazyGridScope.enemySection(
    key: String, title: String, sub: String?, sprite: String, ids: List<String>, progress: Progress, st: CollectionState,
    trailing: (@Composable () -> Unit)? = null
) {
    if (ids.isEmpty()) return
    item(key = "h_$key", span = FULL_ROW) { SectionHeader(sprite, title, "${ids.count { it in progress.bestiary }}/${ids.size}", sub, trailing) }
    items(ids, key = { "$key/$it" }) { id ->
        val def = Enemies.get(id)
        if (def != null) {
            val k = Bestiary.catalog.tierOf[id] ?: "normal"
            val look = tierLook(k)
            Tile(
                id in progress.bestiary, st.bestSel == id, def.name, look.fill, if (k != "normal") Bestiary.TIER[k] else null, look,
                progress.bestiary[id] ?: 0, { st.pickEnemy(id) }
            ) { sil -> EnemyArt(def, 64, sil) }
        }
    }
}

@Composable
private fun RuleChip(sprite: String, name: String, onClick: () -> Unit) {
    Row(
        Modifier.chip(99.dp, Ink.bananaSoft).tap(onClick).padding(start = 4.dp, end = 12.dp, top = 1.dp, bottom = 1.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Sprite(sprite, 24.dp)
        BasicText(name, style = Fonts.body(13f, FontWeight.Medium))
    }
}

@Composable
private fun EnemyArt(def: EnemyDef, size: Int, silhouette: Boolean = false) {
    val id = def.sprite ?: def.id
    if (SpriteStore.has(id)) Sprite(id, size.dp, silhouette = silhouette)
    else BasicText(def.icon, style = Fonts.body(size * .8f, color = if (silhouette) Color(0x47000000) else Ink.ink))
}

@Composable
private fun EnemyDetail(id: String, progress: Progress) {
    val def = Enemies.get(id) ?: return
    val cat = Bestiary.catalog
    val k = cat.tierOf[id] ?: "normal"
    val look = tierLook(k)
    val where = (cat.where[id] ?: emptyList()).joinToString(" · ")
    if (id !in progress.bestiary) {
        Undiscovered(
            { sil -> EnemyArt(def, 120, sil) },
            "Todavía no te has cruzado con este enemigo. Enfréntalo en un combate para descubrir su nombre, su vida y lo que hace.",
            ribbon = Bestiary.TIER[k], ribbonLook = look, extra = labeled("Pista: ", where)
        )
        return
    }
    val kills = progress.bestiary[id] ?: 0
    EnemyArt(def, 120)
    Ribbon(Bestiary.TIER[k] ?: "", look.chip, look.ink)
    BasicText(def.name, style = Fonts.hand(30f).copy(textAlign = TextAlign.Center))
    val hp = if (def.hpMin == def.hpMax || def.hpMax == 0) "${def.hpMin}" else "${def.hpMin}–${def.hpMax}"
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StatChip { GameText("$hp ❤️", Fonts.body(14.5f)) }
        StatChip { BasicText(if (kills > 0) "Derrotado $kills ${if (kills == 1) "vez" else "veces"}" else "Ya lo viste", style = Fonts.body(14.5f)) }
    }
    BasicText(labeled("Dónde: ", where), style = Fonts.body(13.5f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center))
    val traits = Bestiary.traits(def)
    if (traits.list.isNotEmpty()) {
        MiniHeader("Rasgos")
        traits.list.forEach { t ->
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Color(0xFFF2FAEA)).padding(horizontal = 10.dp, vertical = 6.dp)) {
                GameText(t, Fonts.body(13.5f).copy(lineHeight = 18.sp))
            }
        }
    }
    MiniHeader("Jugadas")
    def.moves.forEachIndexed { i, m -> MoveRow(id, i, m) }
}

/** Una jugada del enemigo en palabras; si nombra estados, al tocarla se explican. */
@Composable
private fun MoveRow(enemyId: String, index: Int, m: com.yokyznt.fruitspire.core.data.Move) {
    val d = Bestiary.describeMove(m)
    var open by remember(enemyId, index) { mutableStateOf(false) }
    val shape = RoundedCornerShape(10.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(Color.White).border(1.5.dp, Color(0xFFEADBC2), shape)
            .let { if (d.statuses.isNotEmpty()) it.tap { open = !open } else it }.padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            BasicText(m.name, style = Fonts.hand(20f))
            if (d.statuses.isNotEmpty()) {
                Spacer(Modifier.weight(1f))
                BasicText(if (open) "▲" else "?", style = Fonts.body(12.5f, FontWeight.Bold, Ink.inkSoft))
            }
        }
        GameText(d.text, Fonts.body(13.5f).copy(lineHeight = 18.sp))
        if (open) {
            d.statuses.forEach { (sid, n) ->
                val s = Statuses.get(sid)
                if (s != null) {
                    Column(Modifier.padding(top = 4.dp)) {
                        BasicText("${s.name} $n", style = Fonts.body(13f, FontWeight.Bold, Kw.color(s.cls)))
                        BasicText(s.help, style = Fonts.body(12.5f, color = Ink.inkSoft).copy(lineHeight = 16.sp))
                    }
                }
            }
        }
    }
}

private fun labeled(label: String, text: String) = buildAnnotatedString {
    pushStyle(SpanStyle(fontWeight = FontWeight.Bold)); append(label); pop(); append(text)
}

@Composable
private fun StatChip(content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(99.dp)
    Box(Modifier.clip(shape).background(Color.White).border(1.5.dp, Color(0xFFD9C8AE), shape).padding(horizontal = 12.dp, vertical = 2.dp)) { content() }
}

@Composable
private fun MiniHeader(text: String) {
    Box(Modifier.fillMaxWidth().padding(top = 6.dp).dashedUnderline()) { BasicText(text, style = Fonts.hand(22f)) }
}

// ---------- piezas comunes ----------
/** Lista de fichas a la izquierda y la ficha elegida, en grande, a la derecha. */
@Composable
private fun ListAndDetail(list: @Composable () -> Unit, detail: @Composable () -> Unit) {
    Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.weight(1f).fillMaxHeight().lined()) { list() }
        Column(
            Modifier.width(330.dp).fillMaxHeight().stickerCard(18.dp, fill = Ink.paper2).verticalScroll(rememberScrollState()).padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)
        ) { detail() }
    }
}

@Composable
private fun EmptyDetail(text: String, tip: String? = null) {
    Spacer(Modifier.height(30.dp))
    Sprite("ui_book", 84.dp)
    BasicText(text, style = Fonts.hand(24f, Ink.inkSoft).copy(textAlign = TextAlign.Center))
    if (tip != null) BasicText(tip, style = Fonts.body(13.5f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center))
}

/** La ficha de algo que aún no encuentras: su silueta con un «?» encima, y una pista. */
@Composable
private fun Undiscovered(
    art: @Composable (Boolean) -> Unit, hint: String, ribbon: String? = null, ribbonLook: TierLook? = null, extra: AnnotatedString? = null
) {
    Box(contentAlignment = Alignment.Center) {
        art(true)
        OutlinedText("?", Fonts.display(76f, Color.White), inkWidth = 3.dp, edgeWidth = 1.dp)
    }
    if (ribbon != null) Ribbon(ribbon, ribbonLook?.chip ?: Color(0xFFEFE5D2), ribbonLook?.ink ?: Ink.ink)
    BasicText("No descubierto", style = Fonts.hand(30f))
    BasicText(hint, style = Fonts.body(14f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center, lineHeight = 18.sp))
    if (extra != null) BasicText(extra, style = Fonts.body(13.5f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center))
}

/** La cinta torcida con el nivel o la rareza (`.best-ribbon`). */
@Composable
private fun Ribbon(text: String, bg: Color, fg: Color) {
    Box(Modifier.graphicsLayer { rotationZ = -2f }.chip(6.dp, bg).padding(horizontal = 16.dp, vertical = 1.dp)) {
        BasicText(text, style = Fonts.display(16f, fg))
    }
}

@Composable
private fun SectionHeader(
    sprite: String, title: String, count: String, sub: String? = null, trailing: (@Composable () -> Unit)? = null
) {
    Column(Modifier.fillMaxWidth().padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(Modifier.fillMaxWidth().dashedUnderline().padding(bottom = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Sprite(sprite, 30.dp)
            BasicText(title, style = Fonts.hand(26f))
            BasicText(count, style = Fonts.body(14f, color = Ink.inkSoft))
            Spacer(Modifier.weight(1f))
            trailing?.invoke()
        }
        if (sub != null) BasicText(sub, style = Fonts.body(13f, color = Ink.inkSoft))
    }
}

/** Una ficha de la cuadrícula: el dibujo, el nombre (o «???» si no se ha encontrado) y, a veces, una etiqueta y las derrotas. */
@Composable
private fun Tile(
    has: Boolean, selected: Boolean, name: String, fill: Color, badge: String?, look: TierLook?, kills: Int,
    onClick: () -> Unit, art: @Composable (silhouette: Boolean) -> Unit
) {
    Box(
        Modifier.fillMaxWidth().height(128.dp).stickerCard(16.dp, fill = if (has) fill else UNSEEN_FILL, glow = if (selected) Ink.mint else null).tap(onClick)
    ) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 5.dp, vertical = 7.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(1.dp)
        ) {
            Box(Modifier.size(66.dp), contentAlignment = Alignment.Center) { art(!has) }
            Box(Modifier.height(31.dp), contentAlignment = Alignment.Center) {
                BasicText(
                    if (has) name else "???",
                    style = Fonts.body(13f, FontWeight.SemiBold, if (has) Ink.ink else Ink.inkSoft).copy(textAlign = TextAlign.Center, lineHeight = 14.sp), maxLines = 2
                )
            }
            if (badge != null) {
                Box(Modifier.clip(RoundedCornerShape(99.dp)).background(look?.chip ?: Color(0xFFEFE5D2)).padding(horizontal = 8.dp)) {
                    BasicText(badge, style = Fonts.body(10.5f, color = look?.ink ?: Ink.ink))
                }
            }
        }
        if (has && kills > 0) {
            Box(Modifier.align(Alignment.TopEnd).offset(6.dp, (-8).dp).chip(99.dp, Ink.banana).padding(horizontal = 6.dp)) {
                BasicText("×$kills", style = Fonts.display(14f))
            }
        }
    }
}
