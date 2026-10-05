package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.LootItem
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World

/** Pantalla "de papel": ocupa todo el teléfono, con un título a mano y su contenido centrado. */
@Composable
fun PaperScreen(title: String, modifier: Modifier = Modifier, art: (@Composable () -> Unit)? = null, content: @Composable () -> Unit) {
    val safe = LocalSafeInsets.current
    Column(
        modifier.fillMaxSize().background(Ink.paper2).padding(top = HUD_H.dp, start = (24f + safe.left).dp, end = (24f + safe.right).dp, bottom = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically)
    ) {
        art?.invoke()
        BasicText(title, style = Fonts.hand(50f))
        content()
    }
}

/** Un premio por recoger (js/loot.js): tocarlo lo suma. */
@Composable
fun LootItemView(item: LootItem, index: Int, seedsFull: Boolean, onCollect: () -> Unit, onDrop: () -> Unit) {
    val appear = remember { Animatable(0f) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(index * 90L); appear.animateTo(1f, spring(dampingRatio = .5f, stiffness = Spring.StiffnessMediumLow)) }
    val (c1, c2) = when (item.k) {
        "heal", "maxhp" -> Color(0xFFFFE6EA) to Color(0xFFFFC7D0)
        "relic" -> Color(0xFFF3EDFF) to Color(0xFFDCCBFF)
        "seed" -> Color(0xFFEAF8EE) to Color(0xFFC6EBD2)
        "card" -> Color(0xFFEAF4FF) to Color(0xFFCBE2F7)
        else -> Color(0xFFFFF6D2) to Color(0xFFFFE9A8)
    }
    Column(Modifier.graphicsLayer { scaleX = .7f + .3f * appear.value; scaleY = scaleX; alpha = appear.value.coerceIn(0f, 1f); translationY = (1f - appear.value) * 18f * density }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(
            Modifier.width(if (item.k == "card") 118.dp else 128.dp).height(132.dp)
                .drawBehind {
                    val k = density; val r = 20f * k
                    drawRoundRect(Color(0x404A3428), Offset(0f, 6f * k), size, CornerRadius(r))
                    drawRoundRect(Ink.ink, Offset(-3f * k, -3f * k), Size(size.width + 6f * k, size.height + 6f * k), CornerRadius(r + 3f * k))
                    if (item.taken) drawRoundRect(Color(0xFFEFE6D6), cornerRadius = CornerRadius(r))
                    else drawRoundRect(Brush.radialGradient(listOf(c1, c2), Offset(size.width / 2, size.height * .38f), size.maxDimension * .7f), cornerRadius = CornerRadius(r))
                }
                .clickable(remember { MutableInteractionSource() }, null, enabled = item.isOpen) { onCollect() },
            contentAlignment = Alignment.Center
        ) {
            // solo el contenido se atenúa: el alfa de una capa en la caja recortaba su contorno y la palomita
            Column(Modifier.alpha(if (item.taken) .45f else 1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                when (item.k) {
                    "gold" -> Box(Modifier.size(96.dp, 72.dp)) {
                        Sprite("ui_coin", 52.dp, Modifier.align(Alignment.BottomStart).graphicsLayer { rotationZ = -12f })
                        Sprite("ui_coin", 52.dp, Modifier.align(Alignment.TopCenter))
                        Sprite("ui_coin", 52.dp, Modifier.align(Alignment.BottomEnd).graphicsLayer { rotationZ = 10f })
                    }
                    "heal" -> Sprite("ui_heart", 80.dp)
                    "maxhp" -> Box { Sprite("ui_heart", 80.dp); BasicText("+", style = Fonts.display(30f, Ink.leaf), modifier = Modifier.align(Alignment.TopEnd)) }
                    "relic" -> Sprite(item.id ?: "", 80.dp)
                    "seed" -> Seeds.get(item.id ?: "")?.let { SeedArt(it, 80.dp) }
                    "card" -> Cards.get(item.id)?.let { Scaled(.42f, CARD_W, CARD_H) { CardView(it) } }
                }
                val label = when (item.k) {
                    "gold" -> "+${item.n} de oro"; "heal" -> "+${item.n} ❤️"; "maxhp" -> "+${item.n} ❤️ máx."
                    "relic" -> Relics.get(item.id ?: "")?.name ?: ""; "seed" -> Seeds.get(item.id ?: "")?.name ?: ""
                    else -> Cards.get(item.id)?.name ?: ""
                }
                GameText(label, Fonts.display(17f).copy(textAlign = TextAlign.Center, lineHeight = 18.sp))
            }
            if (item.taken) {
                Box(Modifier.align(Alignment.TopEnd).offset(10.dp, (-10).dp).size(36.dp).drawBehind {
                    drawCircle(Ink.ink, size.minDimension / 2f + 3.dp.toPx()); drawCircle(Ink.mint, size.minDimension / 2f)
                    drawLine(Color.White, Offset(size.width * .24f, size.height * .5f), Offset(size.width * .42f, size.height * .68f), 3.5.dp.toPx(), androidx.compose.ui.graphics.StrokeCap.Round)
                    drawLine(Color.White, Offset(size.width * .42f, size.height * .68f), Offset(size.width * .8f, size.height * .3f), 3.5.dp.toPx(), androidx.compose.ui.graphics.StrokeCap.Round)
                })
            }
        }
        if (item.k == "seed" && item.isOpen && seedsFull) StickerButton("Dejarla", onDrop, secondary = true, fontSize = 15f, padding = PaddingValues(horizontal = 14.dp, vertical = 3.dp))
    }
}

/** Aviso de la experiencia que dio el último combate al Pase de Batalla (`passGainBox` del juego web). */
@Composable
fun PassGainBox(run: Run) {
    val g = run.passGain ?: return
    if (g.xp <= 0) return
    val level = com.yokyznt.fruitspire.core.Pass.state(run.progress).level
    val up = if (g.levels > 0) "  ¡subiste ${g.levels} nivel${if (g.levels > 1) "es" else ""}!" else ""
    Box(Modifier.stickerCard(16.dp, fill = Ink.bananaSoft).padding(horizontal = 16.dp, vertical = 4.dp)) {
        BasicText("⭐ +${g.xp} XP del Pase de Batalla · Nivel $level$up", style = Fonts.body(16f, FontWeight.Medium))
    }
}

/** Aviso de mascotitas que se acaban de desbloquear, con «Llevarla» (`petUnlockBox` del juego web). */
@Composable
fun PetUnlockBox(run: Run, onWear: (String) -> Unit) {
    run.newPets.forEach { c ->
        val on = run.progress.equippedFor(c.char ?: "").pet == c.id
        Row(
            Modifier.stickerCard(18.dp, fill = Ink.mintSoft).padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CosmeticIcon(c, 56.dp)
            Column {
                BasicText("¡Mascotita desbloqueada!", style = Fonts.hand(23f))
                BasicText("${c.name}: ${c.bonus}", style = Fonts.body(14.5f, color = Ink.inkSoft))
            }
            if (on) BasicText("¡Ya te acompaña!", style = Fonts.hand(21f))
            else StickerButton("Llevarla", { onWear(c.id) }, color = Ink.mint, fontSize = 17f)
        }
    }
}

/** Recompensa de un combate: premios por recoger y una carta para elegir. */
@Composable
fun RewardScreen(
    run: Run, onCollect: (Int) -> Unit, onDrop: (Int) -> Unit, onPickCard: (String) -> Unit, onContinue: () -> Unit,
    onWearPet: (String) -> Unit = {}
) {
    val title = when (run.combatKind) { "boss" -> "¡Jefe derrotado!"; "elite" -> "¡Élite derrotada!"; else -> "¡Victoria!" }
    val full = com.yokyznt.fruitspire.core.Rewards.seedsFull(run.player)
    PaperScreen(title) {
        PetUnlockBox(run, onWearPet)
        PassGainBox(run)
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
            run.loot.forEachIndexed { i, it -> if (!it.dropped) LootItemView(it, i, full, { onCollect(i) }, { onDrop(i) }) }
        }
        if (run.rewardCards.isNotEmpty() && !run.rewardCardPicked) {
            BasicText("Elige una carta", style = Fonts.hand(26f))
            Row(horizontalArrangement = Arrangement.spacedBy(26.dp), modifier = Modifier.padding(top = 4.dp)) {
                run.rewardCards.forEachIndexed { i, id ->
                    Cards.get(id)?.let { card ->
                        Box(
                            Modifier.graphicsLayer { rotationZ = if (i % 2 == 0) -1.5f else 1.5f }
                                .clickable(remember { MutableInteractionSource() }, null) { onPickCard(id) }
                        ) { CardView(card) }
                    }
                }
            }
        }
        if (run.rewardCards.isEmpty() || run.rewardCardPicked) {
            StickerButton("Continuar", onContinue, secondary = true, enabled = run.canFinishReward(), fontSize = 20f)
        }
    }
}

/** Elegir un objeto de jefe (fuertes, pero con truco). */
@Composable
fun BossRelicScreen(run: Run, onPick: (String) -> Unit, onSkip: () -> Unit) {
    PaperScreen("Objeto de jefe", art = { Sprite("semilla_dorada", 64.dp) }) {
        BasicText("Elige uno. Son fuertes, pero tienen truco.", style = Fonts.body(17f, color = Ink.inkSoft))
        Row(horizontalArrangement = Arrangement.spacedBy(26.dp), modifier = Modifier.padding(top = 6.dp)) {
            run.bossRelicChoices.forEach { id ->
                Relics.get(id)?.let { r ->
                    Box(Modifier.clickable(remember { MutableInteractionSource() }, null) { onPick(id) }) { RelicCardView(r) }
                }
            }
            if (run.bossRelicChoices.isEmpty()) BasicText("…no quedan objetos de jefe", style = Fonts.hand(26f, Ink.inkSoft))
        }
        StickerButton("Omitir", onSkip, secondary = true, fontSize = 18f)
    }
}

@Composable
fun GameOverScreen(run: Run, onMenu: () -> Unit) {
    PaperScreen("Game over…", art = { FruitSprite(run.player.characterId, 110.dp, mood = "hurt", hurt = 3) }) {
        BasicText("Caíste en el castillo ${run.player.act}, piso ${run.player.floor}.", style = Fonts.body(19f, color = Ink.inkSoft))
        PassGainBox(run)
        StickerButton("Volver al menú", onMenu, fontSize = 21f)
    }
}

@Composable
fun VictoryScreen(run: Run, onMenu: () -> Unit, onWearPet: (String) -> Unit = {}) {
    val p = run.player
    val boss = Enemies.get(run.lastBossId ?: "")?.name ?: run.boss.name
    PaperScreen("¡Derrotaste a $boss!", art = {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Bottom) {
            World.characters.take(2).forEach { Sprite(it.id, 64.dp) }
            Sprite("rey_fruta", 100.dp)
            World.characters.drop(2).forEach { Sprite(it.id, 64.dp) }
        }
    }) {
        BasicText(buildAnnotatedString { append("¡Liberaste al "); withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("Rey Fruta") }; append(" y a todas las frutas!") }, style = Fonts.body(20f, color = Ink.inkSoft))
        if (run.unlockMsg.isNotEmpty()) BasicText("🔓 ${run.unlockMsg}", style = Fonts.hand(24f))
        PetUnlockBox(run, onWearPet)
        PassGainBox(run)
        GameText("Grado: ${run.difficulty.name} · ${p.deck.size} cartas · ${p.relics.size} objetos · ${p.hp}/${p.maxHp} ❤️", Fonts.hand(23f))
        StickerButton("Volver al menú", onMenu, fontSize = 21f)
    }
}
