package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.World

/** Alto de la barra de arriba fuera del combate (px de diseño): las pantallas se acomodan debajo. */
const val HUD_H = 68f

/** Los tres castillos en fila (cada uno más grande); el actual se resalta, los ya conquistados llevan palomita. */
@Composable
fun CastleRow(current: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(30.dp), verticalAlignment = Alignment.Bottom) {
        World.castles.forEach { c ->
            val here = c.n == current
            val done = c.n < current
            val artSize = when (c.n) { 1 -> 66.dp; 2 -> 84.dp; else -> 104.dp }
            Box(
                Modifier.graphicsLayer { if (here) { translationY = -4f * density; scaleX = 1.08f; scaleY = 1.08f } }.alpha(if (here || done) 1f else .5f)
            ) {
                Sprite(c.sprite, artSize)
                if (done) {
                    Box(
                        Modifier.align(Alignment.TopEnd).size(24.dp).drawBehind {
                            drawCircle(Ink.ink, size.minDimension / 2f + 2.dp.toPx())
                            drawCircle(Ink.mint, size.minDimension / 2f)
                            drawLine(androidx.compose.ui.graphics.Color.White, Offset(size.width * .28f, size.height * .52f), Offset(size.width * .45f, size.height * .68f), 3.dp.toPx())
                            drawLine(androidx.compose.ui.graphics.Color.White, Offset(size.width * .45f, size.height * .68f), Offset(size.width * .74f, size.height * .32f), 3.dp.toPx())
                        }
                    )
                }
            }
        }
    }
}

/** Portada de cada piso (renderActIntro): castillo, tema, regla del piso, jefe que espera. */
@Composable
fun ActIntroScreen(run: Run, onGo: () -> Unit) {
    val p = run.player
    val castle = run.castle
    val theme = run.theme
    val rule = theme.rule?.info
    val boss = run.boss
    val last = run.isFinalFloor
    val guardian = p.floor < World.FLOORS_PER_CASTLE
    val pop = remember { Animatable(.6f) }
    LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = .5f, stiffness = Spring.StiffnessMediumLow)) }
    Column(
        Modifier.fillMaxSize().padding(top = HUD_H.dp, bottom = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)
    ) {
        BasicText("${castle.name} · Piso ${p.floor} de ${World.FLOORS_PER_CASTLE}", style = Fonts.hand(31f, Ink.inkSoft))
        CastleRow(p.act)
        Box(Modifier.graphicsLayer { scaleX = pop.value; scaleY = pop.value }) { Sprite("act_${theme.id}", 120.dp) }
        Logo(theme.name, 70f)
        if (rule != null) {
            Row(
                Modifier.padding(top = 4.dp).chip(18.dp, Ink.paper2).padding(horizontal = 14.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Sprite(theme.rule!!.info.sprite, 50.dp)
                Column {
                    BasicText(rule.name, style = Fonts.hand(23f))
                    GameText(rule.desc, Fonts.body(15f, color = Ink.inkSoft), maxLines = 2)
                }
            }
        }
        if (run.actHealed > 0 && (p.act > 1 || p.floor > 1)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Sprite("ui_heal", 24.dp)
                GameText("Recuperaste ${run.actHealed} ❤️ en el camino.", Fonts.body(18f, FontWeight.SemiBold, androidx.compose.ui.graphics.Color(0xFF4E9A35)))
            }
        }
        run.actCurse?.let { id ->
            Cards.get(id)?.let { c ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Sprite(c.sprite, 26.dp)
                    BasicText("Se coló una maldición: ${c.name}.", style = Fonts.body(18f, FontWeight.SemiBold, androidx.compose.ui.graphics.Color(0xFF7A5BC4)))
                }
            }
        }
        Row(
            Modifier.padding(top = 6.dp, bottom = 6.dp).rotate(-1f).chip(99.dp, Ink.strawberrySoft).padding(start = 10.dp, end = 20.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Sprite(boss.sprite ?: boss.id, 52.dp)
            BasicText(
                buildAnnotatedString {
                    append("Al final te espera: ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(boss.name) }
                    append(if (last) " (¡el último jefe!)" else if (guardian) " (guardián)" else " (jefe del castillo)")
                },
                style = Fonts.hand(23f)
            )
        }
        StickerButton("¡Adelante!", onGo, color = Ink.mint, fontSize = 23f, padding = PaddingValues(horizontal = 44.dp, vertical = 12.dp))
    }
}
