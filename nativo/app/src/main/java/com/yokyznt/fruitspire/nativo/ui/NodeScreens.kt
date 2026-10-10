package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.layout
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.Rewards
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.data.Card
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.SeedDef
import com.yokyznt.fruitspire.core.data.Seeds
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

/** Una carta que se está madurando o quitando: la pantalla la anima antes de que el núcleo cambie el mazo. */
class PickFlash(val mode: String, val index: Int)

private val TYPE_ORDER = mapOf("attack" to 0, "skill" to 1, "power" to 2, "curse" to 3)

/** Se toca (sin onda). */
@Composable
internal fun Modifier.tap(enabled: Boolean = true, onClick: () -> Unit): Modifier =
    clickable(remember { MutableInteractionSource() }, null, enabled = enabled) { onClick() }

/** Escala [content] (de [w]×[h] px de diseño) y reserva en el diseño el tamaño ya escalado. */
@Composable
internal fun Scaled(scale: Float, w: Float, h: Float, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(modifier.size((w * scale).dp, (h * scale).dp)) {
        Box(
            Modifier.wrapContentSize(Alignment.TopStart, unbounded = true)
                .graphicsLayer { transformOrigin = TransformOrigin(0f, 0f); scaleX = scale; scaleY = scale }
        ) { content() }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Campamento
// ---------------------------------------------------------------------------------------------------------------

/** Una de las tres opciones del campamento (`.rest-option`). */
@Composable
private fun RestOption(sprite: String, title: String, text: String, color: Color, enabled: Boolean = true, onClick: () -> Unit) {
    Column(
        Modifier.width(230.dp).height(176.dp).tutAnchor("rest").graphicsLayer { alpha = if (enabled) 1f else .5f }
            .stickerCard(radius = 22.dp, fill = color).tap(enabled, onClick).padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)
    ) {
        Sprite(sprite, 64.dp)
        BasicText(title, style = Fonts.display(30f))
        GameText(text, Fonts.body(16f, FontWeight.Medium).copy(textAlign = TextAlign.Center, lineHeight = 19.sp))
    }
}

@Composable
fun RestScreen(
    run: Run, flash: PickFlash?, onHeal: () -> Unit, onPicker: (String?) -> Unit, onPick: (Int) -> Unit, onLeave: () -> Unit
) {
    val mode = run.pickerMode
    if (mode != null) {
        val up = mode == "upgrade"
        DeckPickerScreen(
            if (up) "Madurar una carta" else "Despegar una carta", if (up) "Elige la carta a madurar." else "Elige la carta a quitar.",
            run, mode, flash, null, onPick, onBack = { onPicker(null) }
        )
        return
    }
    PaperScreen("Campamento", art = { Sprite("node_rest", 104.dp) }) {
        BasicText("Elige una.", style = Fonts.body(18f, color = Ink.inkSoft))
        Row(Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
            val can = run.canRest()
            RestOption(
                "ui_heart", "Descansar",
                if (can) "Recuperas ${run.restHealAmount()} ❤️" else "Tu Corazón de Durián no te deja dormir.",
                Ink.peach, can, onHeal
            )
            RestOption("rayito_sol", "Madurar", "Mejora una carta", Ink.mint) { onPicker("upgrade") }
            RestOption("compostar", "Despegar", "Quita una carta", Ink.grapeBtn) { onPicker("remove") }
        }
        StickerButton("Seguir sin hacer nada", onLeave, secondary = true, fontSize = 24f)
    }
}

/** La carta del selector: al elegirla madura (brilla y se hincha) o se despega (se encoge y se va). */
@Composable
private fun PickCard(card: Card, flashMode: String?, onClick: () -> Unit) {
    val t = remember(flashMode) { Animatable(0f) }
    LaunchedEffect(flashMode) { if (flashMode != null) t.animateTo(1f, tween(if (flashMode == "upgrade") 900 else 560)) }
    Box(
        Modifier.graphicsLayer {
            when (flashMode) {
                "upgrade" -> { val s = 1f + .16f * sin(PI.toFloat() * t.value); scaleX = s; scaleY = s }
                "remove" -> { val s = 1f - .85f * t.value; scaleX = s; scaleY = s; rotationZ = -22f * t.value; alpha = 1f - t.value }
            }
        }.tutAnchor(if (LocalTutorialPicker.current == "shop") "shop-items" else "rest").tap(flashMode == null, onClick)
    ) { CardView(card, glow = if (flashMode == "upgrade") Ink.mint else null) }
}

/**
 * Rejilla con las cartas del mazo para elegir una (cada copia aparte). En "upgrade" solo salen las que pueden
 * madurar y se ven ya maduradas. [price] es el precio de quitar en la tienda.
 */
@Composable
fun DeckPickerScreen(
    title: String, note: String, run: Run, mode: String, flash: PickFlash?, price: Int?, onPick: (Int) -> Unit, onBack: () -> Unit
) {
    val up = mode == "upgrade"
    val deck = run.player.deck
    val entries = remember(deck.toList(), mode) {
        deck.mapIndexedNotNull { i, id -> Cards.get(id)?.takeIf { !up || it.canUpgrade }?.let { i to it } }
            .sortedWith(compareBy({ TYPE_ORDER[it.second.type] ?: 9 }, { it.second.cost }, { it.second.name }))
    }
    Column(
        Modifier.fillMaxSize().background(Ink.paper2).padding(top = HUD_H.dp, bottom = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        BasicText(title, style = Fonts.hand(38f))
        if (price != null) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                BasicText("Quitar una carta:", style = Fonts.body(17f, color = Ink.inkSoft))
                Sprite("ui_coin", 22.dp)
                BasicText("$price", style = Fonts.body(18f, FontWeight.Bold))
            }
        } else BasicText(note, style = Fonts.body(16f, color = Ink.inkSoft))
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (entries.isEmpty()) {
                BasicText("…no hay cartas que puedas elegir", style = Fonts.hand(28f, Ink.inkSoft), modifier = Modifier.align(Alignment.Center))
            } else {
                LazyVerticalGrid(
                    GridCells.Adaptive(CARD_W.dp + 14.dp), Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 28.dp, vertical = 22.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(26.dp)
                ) {
                    items(entries, key = { it.first }) { (i, card) ->
                        val shown = if (up) Cards.get("${card.id}+") ?: card else card
                        Box(Modifier.padding(start = 8.dp)) { PickCard(shown, flash?.takeIf { it.index == i }?.mode) { onPick(i) } }
                    }
                }
            }
        }
        StickerButton("Volver", onBack, Modifier.tutAnchor(if (LocalTutorialPicker.current == "shop") "shop-items" else "rest"), secondary = true, fontSize = 24f, enabled = flash == null)
    }
}

/** Qué pantalla abrió el selector de cartas ("shop" o "rest"): el tutorial ilumina sus cartas bajo el nombre de esa pantalla. */
internal val LocalTutorialPicker = androidx.compose.runtime.compositionLocalOf { "rest" }

// ---------------------------------------------------------------------------------------------------------------
// Tienda
// ---------------------------------------------------------------------------------------------------------------
private const val SHOP_SCALE = .68f

/** Carta de semilla, del mismo tamaño que las de objeto (`.seed-card`). */
@Composable
private fun SeedCardView(seed: SeedDef, dimmed: Boolean) {
    val desc = remember(seed.id) { gameText(seed.desc) }
    Box(Modifier.size(CARD_W.dp, CARD_H.dp).stickerCard(fill = Ink.edge)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            SeedArt(seed, 86.dp)
            Box(Modifier.fillMaxWidth().height(52.dp).padding(top = 6.dp), contentAlignment = Alignment.Center) {
                BasicText(
                    seed.name, style = Fonts.display(21.6f).copy(textAlign = TextAlign.Center, lineHeight = 22.sp), maxLines = 2,
                    autoSize = TextAutoSize.StepBased(12.sp, 21.6.sp, .5.sp)
                )
            }
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                GameText(
                    desc, Fonts.body(15.8f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp),
                    Modifier.fillMaxWidth(), autoSize = TextAutoSize.StepBased(9.sp, 15.8.sp, .5.sp)
                )
            }
        }
        if (dimmed) Box(Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)).drawBehind { drawRect(Color(0x66FBF4E4)) })
    }
}

/** El servicio «Quitar una carta» (`.service-card`). */
@Composable
private fun ServiceCardView(used: Boolean, dimmed: Boolean) {
    Box(Modifier.size(CARD_W.dp, CARD_H.dp).stickerCard(fill = Ink.bananaSoft)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Sprite("compostar", 86.dp)
            Box(Modifier.fillMaxWidth().height(52.dp).padding(top = 6.dp), contentAlignment = Alignment.Center) {
                BasicText("Quitar una carta", style = Fonts.display(21.6f).copy(textAlign = TextAlign.Center, lineHeight = 22.sp), maxLines = 2)
            }
            GameText(if (used) "Ya usado." else "De tu mazo, para siempre.", Fonts.body(15.8f).copy(textAlign = TextAlign.Center, lineHeight = 20.sp))
        }
        if (used || dimmed) Box(Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)).drawBehind { drawRect(Color(if (used) 0x99FBF4E4 else 0x66FBF4E4)) })
    }
}

/** Etiqueta con el precio debajo de cada artículo. Roja si no alcanza el oro; verde si es oferta. */
@Composable
private fun PriceTag(price: Int, affordable: Boolean, sale: Boolean = false) {
    val fill = if (!affordable) Ink.strawberrySoft else if (sale) Ink.mintSoft else Ink.edge
    Row(
        Modifier.chip(99.dp, fill).padding(horizontal = 12.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Sprite("ui_coin", 22.dp)
        BasicText("$price", style = Fonts.display(23f, if (affordable) Ink.ink else Color(0xFFB0394C)))
        if (sale) BasicText("¡oferta!", style = Fonts.hand(16f, Ink.mintDark))
    }
}

/**
 * Un artículo de la tienda con su precio. Lleva 8 dp de aire a cada lado (así el hueco de lo comprado puede cerrarse del todo).
 * [key] ("card:2"…) lo anota para saber desde dónde vuela; [nopeTick] cambia cuando no alcanzó y lo hace temblar (shakeSoft).
 */
@Composable
private fun ShopItem(
    price: Int?, affordable: Boolean, sale: Boolean = false, enabled: Boolean = true, onClick: () -> Unit,
    key: String? = null, nopeTick: Int = 0, anchored: Boolean = true, content: @Composable () -> Unit
) {
    val shake = remember { Animatable(1f) }
    var seen by remember { mutableIntStateOf(nopeTick) } // lo que ya traía al componerse no cuenta
    LaunchedEffect(nopeTick) {
        if (nopeTick != seen) {
            seen = nopeTick
            if (nopeTick > 0) { shake.snapTo(0f); shake.animateTo(1f, tween(SHAKE_MS, easing = LinearEasing)) }
        }
    }
    val rects = LocalLootRects.current
    val anchor = if (anchored) Modifier.tutAnchor("shop-items") else Modifier
    Column(
        Modifier.padding(horizontal = 8.dp).then(anchor).graphicsLayer { translationX = shakeSoft(shake.value) * density },
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        val note = if (key != null) Modifier.noteLootRect(rects, "shop:$key") else Modifier
        Scaled(SHOP_SCALE, CARD_W, CARD_H, note.tap(enabled, onClick)) { content() }
        if (price != null) PriceTag(price, affordable, sale) else Box(Modifier.height(32.dp))
    }
}

/** El hueco de un artículo recién comprado: se desvanece y encoge y luego cierra su ancho para que los demás se deslicen (soldOut, 0,4 s). */
@Composable
private fun SoldSlot(sale: ShopSale, onDone: () -> Unit) {
    val t = remember { Animatable(0f) }
    LaunchedEffect(sale.id) { t.animateTo(1f, tween(SOLD_MS, easing = LinearEasing)); onDone() }
    Box(
        Modifier
            .layout { measurable, constraints ->
                val p = measurable.measure(constraints)
                val w = (p.width * soldPose(t.value).width).roundToInt()
                layout(w, p.height) { p.placeRelative((w - p.width) / 2, 0) }
            }
            // sin capa de opacidad: el contorno de las cartas dibuja fuera de sus límites y se recortaría
            .graphicsLayer {
                val pose = soldPose(t.value)
                alpha = pose.alpha; scaleX = pose.scale; scaleY = pose.scale
                compositingStrategy = CompositingStrategy.ModulateAlpha
            }
    ) {
        ShopItem(sale.price, affordable = true, sale = sale.sale, enabled = false, onClick = {}, anchored = false) {
            when (sale.group) {
                "card" -> Cards.get(sale.itemId)?.let { CardView(it) }
                "relic" -> Relics.get(sale.itemId)?.let { RelicCardView(it) }
                else -> Seeds.get(sale.itemId)?.let { SeedCardView(it, false) }
            }
        }
    }
}

@Composable
fun ShopScreen(
    run: Run, flash: PickFlash?, onBuyCard: (Int) -> Unit, onBuyRelic: (Int) -> Unit, onBuySeed: (Int) -> Unit,
    onRemoval: () -> Unit, onPick: (Int) -> Unit, onClosePicker: () -> Unit, onLeave: () -> Unit,
    sales: List<ShopSale> = emptyList(), nope: ShopNope? = null, onSaleDone: (Int) -> Unit = {}
) {
    val stock = run.shopStock ?: return
    if (run.pickerMode == "remove") {
        androidx.compose.runtime.CompositionLocalProvider(LocalTutorialPicker provides "shop") {
            DeckPickerScreen("Quitar una carta", "", run, "remove", flash, run.removalPrice(), onPick, onBack = onClosePicker)
        }
        return
    }
    val gold = run.player.gold
    Column(
        Modifier.fillMaxSize().background(Ink.paper2).padding(top = HUD_H.dp, bottom = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Sprite("node_shop", 46.dp)
            BasicText("Tiendita", style = Fonts.hand(38f))
        }
        // cada fila deja, en el sitio de lo comprado, un hueco que se cierra (SoldSlot) mientras lo comprado vuela a la barra
        fun tickOf(key: String) = nope?.takeIf { it.key == key }?.tick ?: 0
        @Composable
        fun Ghosts(group: String, live: Int, item: @Composable (Int) -> Unit) {
            shopSlots(live, sales.filter { it.group == group }).forEach { slot ->
                val ghost = slot.ghost
                if (ghost != null) androidx.compose.runtime.key("sold${ghost.id}") { SoldSlot(ghost) { onSaleDone(ghost.id) } }
                else item(slot.live)
            }
        }
        Row(verticalAlignment = Alignment.Top) {
            Ghosts("card", stock.cards.size) { k ->
                val item = stock.cards[k]
                Cards.get(item.cardId)?.let { card ->
                    androidx.compose.runtime.key(item) {
                        ShopItem(item.price, gold >= item.price, item.sale, onClick = { onBuyCard(k) }, key = "card:$k", nopeTick = tickOf("card:$k")) {
                            CardView(card, dimmed = gold < item.price)
                        }
                    }
                }
            }
        }
        Row(verticalAlignment = Alignment.Top) {
            Ghosts("relic", stock.relics.size) { k ->
                val item = stock.relics[k]
                Relics.get(item.relicId)?.let { relic ->
                    androidx.compose.runtime.key(item) {
                        ShopItem(item.price, gold >= item.price, onClick = { onBuyRelic(k) }, key = "relic:$k", nopeTick = tickOf("relic:$k")) {
                            RelicCardView(relic, dimmed = gold < item.price)
                        }
                    }
                }
            }
            Ghosts("seed", stock.seeds.size) { k ->
                val item = stock.seeds[k]
                Seeds.get(item.seedId)?.let { seed ->
                    androidx.compose.runtime.key(item) {
                        ShopItem(item.price, gold >= item.price, onClick = { onBuySeed(k) }, key = "seed:$k", nopeTick = tickOf("seed:$k")) {
                            SeedCardView(seed, gold < item.price)
                        }
                    }
                }
            }
            val rp = run.removalPrice()
            ShopItem(
                if (stock.removeUsed) null else rp, gold >= rp, enabled = !stock.removeUsed, onClick = onRemoval, nopeTick = tickOf("remove")
            ) { ServiceCardView(stock.removeUsed, gold < rp) }
            if (stock.isSoldOut && sales.isEmpty()) {
                BasicText("…¡lo compraste todo!", style = Fonts.hand(26f, Ink.inkSoft), modifier = Modifier.align(Alignment.CenterVertically).padding(start = 8.dp))
            }
        }
        StickerButton("Salir", onLeave, Modifier.tutAnchor("shop-leave"), secondary = true, fontSize = 24f)
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Tesoro, Llave Dorada y Cofre Sellado
// ---------------------------------------------------------------------------------------------------------------

/** El premio de un tesoro o cofre sellado (un objeto y/o oro por recoger) o la Llave Dorada recién encontrada. */
@Composable
fun NodeResultScreen(run: Run, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onContinue: () -> Unit) {
    if (run.screen == RunScreen.KEY_FOUND) {
        PaperScreen("¡Llave Dorada!", art = { Sprite("node_key", 120.dp) }) {
            BasicText("Abre el Cofre Sellado de este piso.", style = Fonts.body(19f, color = Ink.inkSoft))
            ContinueButton(onContinue)
        }
        return
    }
    val vault = run.screen == RunScreen.VAULT
    val title = if (vault) (if (run.vaultOpened) "¡Cofre Sellado abierto!" else "Cofre Sellado") else "Tesoro"
    val relicId = run.loot.firstOrNull { it.k == "relic" }?.id
    val art = if (vault) "node_vault" else if (relicId != null && SpriteStore.has(relicId)) relicId else "node_treasure"
    val full = Rewards.seedsFull(run.player)
    PaperScreen(title, art = { Sprite(art, 120.dp) }) {
        GameText(run.nodeMessage, Fonts.body(19f, color = Ink.inkSoft).copy(textAlign = TextAlign.Center), Modifier.padding(horizontal = 60.dp))
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
            run.loot.forEachIndexed { i, it -> if (!it.dropped) LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) }
        }
        ContinueButton(onContinue, enabled = !run.lootPending())
    }
}
