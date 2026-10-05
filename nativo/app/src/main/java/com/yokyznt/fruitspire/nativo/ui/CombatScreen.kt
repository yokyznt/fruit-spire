package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.yokyznt.fruitspire.core.PreviewResult
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

private val EaseOutSoft = CubicBezierEasing(.22f, 1f, .36f, 1f)

// ---------------------------------------------------------------------------------------------------------------
// Fondo de la tabla de picar (cada pelea elige uno)
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun CombatBackground(bg: String, modifier: Modifier = Modifier) {
    Box(
        modifier.fillMaxSize().drawBehind {
            val k = density
            // la mesa llena toda la pantalla, sin marco: el borde blanco con contorno se veía en los cuatro bordes
            val clip = Path().apply { addRect(androidx.compose.ui.geometry.Rect(0f, 0f, size.width, size.height)) }
            clipPath(clip) {
                when (bg) {
                    "picnic" -> {
                        drawRect(Color(0xFFFFF4EC))
                        val step = 56f * k
                        var x = 0f; while (x < size.width) { drawRect(Color(0x38F2667A), Offset(x, 0f), Size(step / 2, size.height)); x += step }
                        var y = 0f; while (y < size.height) { drawRect(Color(0x38F2667A), Offset(0f, y), Size(size.width, step / 2)); y += step }
                    }
                    "patio" -> {
                        var y = 0f; var i = 0
                        while (y < size.height) { drawRect(if (i % 2 == 0) Color(0xFFCFE8A2) else Color(0xFFC3E195), Offset(0f, y), Size(size.width, 26f * k)); y += 26f * k; i++ }
                        drawRect(Brush.radialGradient(listOf(Color(0x8CFFF1C2), Color.Transparent), Offset(size.width * .18f, size.height * .18f), size.width * .42f))
                    }
                    "tree" -> {
                        drawRect(Color(0xFFE7DDB8))
                        val s = 90f * k
                        var y = 0f; while (y < size.height + s) { var x = 0f; while (x < size.width + s) {
                            drawCircle(Color(0x667BBF5A), 30f * k, Offset(x + s * .2f, y + s * .22f))
                            drawCircle(Color(0x4D7BBF5A), 24f * k, Offset(x + 30f * k + s * .65f - 30f * k, y + 40f * k + s * .68f - 40f * k))
                            x += s }; y += s }
                    }
                    "pantry" -> {
                        drawRect(Brush.verticalGradient(listOf(Color(0xFFD7D3E3), Color(0xFFC4BFD6))))
                        var x = 0f; while (x < size.width) { drawRect(Color(0x2EFFFFFF), Offset(x, 0f), Size(2f * k, size.height)); x += 72f * k }
                        var y = 14f * k; while (y < size.height) { var x2 = 14f * k; while (x2 < size.width) { drawCircle(Color(0xFFB9B4C9), 3f * k, Offset(x2, y)); x2 += 72f * k }; y += 72f * k }
                    }
                    else -> {
                        drawRect(Ink.wood)
                        var x = 0f; while (x < size.width) { drawRect(Color(0x14A06E3C), Offset(x, 0f), Size(3f * k, size.height)); x += 22f * k }
                        x = 11f * k; while (x < size.width) { drawRect(Color(0x0FA06E3C), Offset(x, 0f), Size(2f * k, size.height)); x += 37f * k }
                    }
                }
            }
        }
    )
}

// ---------------------------------------------------------------------------------------------------------------
// Animaciones de reposo (idlePlayer, idleEnemy, idleBoss, idleHop…)
// ---------------------------------------------------------------------------------------------------------------
private class IdleDef(val period: Float, val frames: List<Pair<Float, Pose>>)

private val IDLE: Map<String, IdleDef> = mapOf(
    "player" to IdleDef(2.8f, listOf(0f to Pose.None, .25f to Pose(rot = -1.5f, sx = 1.035f, sy = .965f), .5f to Pose(ty = -7f, sx = .98f, sy = 1.03f), .75f to Pose(rot = 1.5f, sx = 1.03f, sy = .97f), 1f to Pose.None)),
    "float" to IdleDef(3.2f, listOf(0f to Pose(rot = -2f), .3f to Pose(ty = -12f, rot = 1f, sx = 1.02f, sy = .98f), .55f to Pose(ty = -15f, rot = 2.5f, sx = .98f, sy = 1.03f), .8f to Pose(ty = -4f, rot = -1f, sx = 1.02f, sy = .98f), 1f to Pose(rot = -2f))),
    "boss" to IdleDef(2.6f, listOf(0f to Pose(rot = -2f), .5f to Pose(rot = 2f, sx = 1.05f, sy = 1.07f), 1f to Pose(rot = -2f))),
    "hop" to IdleDef(1.3f, listOf(0f to Pose(sx = 1.08f, sy = .9f), .15f to Pose.None, .45f to Pose(ty = -26f, sx = .94f, sy = 1.08f), .75f to Pose(sx = 1.1f, sy = .9f), 1f to Pose(sx = 1.08f, sy = .9f))),
    "sway" to IdleDef(3f, listOf(0f to Pose(rot = -5f), .5f to Pose(rot = 5f, ty = -4f), 1f to Pose(rot = -5f))),
    "wobble" to IdleDef(2.4f, listOf(0f to Pose.None, .25f to Pose(sx = 1.06f, sy = .94f, rot = 1.5f), .5f to Pose(sx = .96f, sy = 1.05f), .75f to Pose(sx = 1.05f, sy = .95f, rot = -1.5f), 1f to Pose.None)),
    "rumble" to IdleDef(2.6f, listOf(0f to Pose.None, .6f to Pose.None, .64f to Pose(tx = -2f, ty = 1f, rot = -1f), .68f to Pose(tx = 2f, ty = -1f, rot = 1f), .72f to Pose(tx = -2f, rot = -1f), .76f to Pose(tx = 2f, ty = 1f), .8f to Pose.None, 1f to Pose.None)),
    "buzz" to IdleDef(.9f, listOf(0f to Pose.None, .25f to Pose(tx = 3f, ty = -2f), .5f to Pose(tx = -3f, ty = 2f), .75f to Pose(tx = 2f, ty = -1f), 1f to Pose.None)),
    "crawl" to IdleDef(2.2f, listOf(0f to Pose.None, .3f to Pose(tx = -4f, sx = 1.1f, sy = .92f), .6f to Pose(tx = 4f, sx = .93f, sy = 1.06f), 1f to Pose.None)),
    "flap" to IdleDef(1f, listOf(0f to Pose.None, .25f to Pose(ty = -14f, sx = 1.04f, sy = .96f), .5f to Pose(ty = -6f, sx = .97f, sy = 1.03f), .75f to Pose(ty = -16f, sx = 1.03f, sy = .97f), 1f to Pose.None)),
    "scuttle" to IdleDef(2.4f, listOf(0f to Pose.None, .2f to Pose(tx = -10f, rot = -3f), .3f to Pose(tx = -10f, rot = 2f), .6f to Pose(tx = 8f, rot = 3f), .7f to Pose(tx = 8f, rot = -2f), 1f to Pose.None)),
    "spin" to IdleDef(2.4f, listOf(0f to Pose(rot = -8f), .5f to Pose(rot = 8f, ty = -8f), 1f to Pose(rot = -8f)))
)

private fun idlePose(kind: String, timeSec: Float, offsetSec: Float): Pose {
    val def = IDLE[kind] ?: IDLE.getValue("float")
    var p = ((timeSec + offsetSec) % def.period) / def.period
    if (p < 0f) p += 1f
    val f = def.frames
    for (i in 1 until f.size) if (p <= f[i].first) {
        val a = f[i - 1]; val b = f[i]
        val t = (p - a.first) / (b.first - a.first)
        val e = t * t * (3 - 2 * t)
        return Pose(
            a.second.tx + (b.second.tx - a.second.tx) * e, a.second.ty + (b.second.ty - a.second.ty) * e, a.second.rot + (b.second.rot - a.second.rot) * e,
            a.second.sx + (b.second.sx - a.second.sx) * e, a.second.sy + (b.second.sy - a.second.sy) * e, 1f
        )
    }
    return Pose.None
}

// ---------------------------------------------------------------------------------------------------------------
// Globo de intención, estados y placa de nombre
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun IntentBubble(intent: IntentUi, acting: Boolean, onInfo: () -> Unit, modifier: Modifier = Modifier) {
    val bob by rememberInfiniteTransition(label = "globo").animateFloat(0f, 1f, infiniteRepeatable(tween(1800, easing = EaseInOut), RepeatMode.Reverse), label = "bob")
    val pulse by rememberInfiniteTransition(label = "pulso").animateFloat(1f, 1.12f, infiniteRepeatable(tween(500, easing = EaseInOut), RepeatMode.Reverse), label = "pulse")
    val fill = when (intent.cls) {
        "attack" -> Ink.strawberrySoft; "defend" -> Ink.mintSoft; "buff" -> Ink.peachSoft; "heal" -> Ink.leafSoft; else -> Ink.edge
    }
    Box(
        modifier.graphicsLayer {
            translationY = -bob * 5f * density
            if (acting) { scaleX = pulse; scaleY = pulse }
            transformOrigin = TransformOrigin(.5f, 1f)
        }
    ) {
        Row(
            Modifier.drawBehind {
                val k = density
                val r = 18f * k
                drawRoundRect(Color(0x2E4A3428), Offset(2f * k, 4f * k), size, CornerRadius(r))
                drawRoundRect(Ink.ink, Offset(-3f * k, -3f * k), Size(size.width + 6f * k, size.height + 6f * k), CornerRadius(r + 3f * k))
                drawRoundRect(fill, Offset.Zero, size, CornerRadius(r))
                // la colita del globo
                val tail = Path().apply { moveTo(size.width - 40f * k, size.height - 1f); lineTo(size.width - 16f * k, size.height - 1f); lineTo(size.width - 28f * k, size.height + 14f * k); close() }
                drawPath(tail, Ink.ink, style = Stroke(6f * k))
                drawPath(tail, fill)
            }.padding(start = 14.dp, end = 8.dp, top = 5.dp, bottom = 5.dp)
                .pointerInput(Unit) { detectTapGestures(onLongPress = { onInfo() }, onTap = { onInfo() }) },
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (intent.unknown) BasicText("?", style = Fonts.display(30f))
            else {
                Sprite(intent.sprite, 36.dp)
                if (intent.label.isNotEmpty()) BasicText(intent.label, style = Fonts.display(30f))
                intent.extras.forEach { (sp, v) ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Sprite(sp, 34.dp)
                        if (v.isNotEmpty()) BasicText(v, style = Fonts.display(26f))
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(s: StatusUi, onInfo: () -> Unit) {
    val fill = when (s.id) { "poison" -> Ink.grapeSoft; "strength" -> Ink.peachSoft; "vulnerable" -> Ink.strawberrySoft; "weak" -> Color(0xFFF1EFD0); else -> Ink.edge }
    Row(
        Modifier.chip(99.dp, fill).pointerInput(Unit) { detectTapGestures(onLongPress = { onInfo() }, onTap = { onInfo() }) }
            .padding(start = 3.dp, end = if (s.noCount) 6.dp else 12.dp, top = 1.dp, bottom = 1.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Sprite(s.sprite, 34.dp)
        if (!s.noCount) BasicText("${s.n}", style = Fonts.display(21f))
    }
}

@Composable
private fun BlockBadge(n: Int, modifier: Modifier = Modifier) {
    Row(
        modifier.graphicsLayer { rotationZ = -6f }.chip(99.dp, Ink.mintSoft).padding(start = 3.dp, end = 10.dp, top = 1.dp, bottom = 1.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(1.dp)
    ) {
        Sprite("ui_shield", 36.dp)
        BasicText("$n", style = Fonts.display(23f))
    }
}

/** La placa de abajo: nombre, barra de vida con cáscara y estados. */
@Composable
private fun Plate(c: CombatantUi, ctl: CombatController, multi: Boolean, modifier: Modifier = Modifier) {
    val boss = c.tier == "boss"
    val tilt = if (c.key == "player") -1f else 1f
    Box(modifier.graphicsLayer { rotationZ = tilt }, contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier.fillMaxWidth().padding(top = 14.dp)
                .drawBehind { drawRoundRect(if (boss) Color(0xD9FFD6DC) else Color(0xD1FFFBF2), cornerRadius = CornerRadius(20f * density)) }
                .padding(start = 18.dp, end = 18.dp, top = 22.dp, bottom = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(Modifier.fillMaxWidth()) {
                HpBar(c.hp, c.maxHp, Modifier.fillMaxWidth(), height = 28.dp)
                if (c.block > 0) BlockBadge(c.block, Modifier.align(Alignment.CenterStart).offset((-22).dp, 0.dp))
            }
            Row(Modifier.padding(top = 7.dp).height(36.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                c.statuses.forEach { s -> StatusChip(s) { ctl.showInfo(s.name + if (s.noCount) "" else " ${s.n}", (if (s.debuff) "Perjuicio. " else "Mejora. ") + s.help) } }
            }
        }
        Box(
            Modifier.graphicsLayer { rotationZ = -2f * tilt }.chip(8.dp).padding(horizontal = 16.dp, vertical = 1.dp)
        ) {
            BasicText(c.name + if (c.tier == "boss") " ♛" else if (c.tier == "elite") " ✦" else "", style = Fonts.display(if (multi) 21f else 25f))
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Un personaje en el escenario
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun CombatantView(
    c: CombatantUi, actor: Actor, ctl: CombatController, clock: androidx.compose.runtime.State<Float>,
    width: Float, spriteSize: Float, multi: Boolean, index: Int, modifier: Modifier = Modifier
) {
    val player = c.key == "player"
    val density = LocalDensity.current.density
    val hidden = !player && !c.alive
    val hover = ctl.hover == c.key || (player && ctl.hover == "self")
    // al apuntar una semilla, los enemigos vivos se tocan para elegirlos
    val aiming = !player && c.alive && ctl.seedAiming >= 0
    val targetable = !player && c.alive && (ctl.dragNeeds == true || aiming)
    Box(
        modifier.width(width.dp).onGloballyPositioned { ctl.anchors["zone-${c.key}"] = it.boundsInRoot() }
            .pointerInput(aiming) { if (aiming) detectTapGestures { ctl.useSeedOn(index - 1) } }
    ) {
        // marco de objetivo al arrastrar una carta
        if (targetable || (player && ctl.dragNeeds == false)) {
            Box(Modifier.matchParentSize().drawBehind {
                val k = density
                val col = if (player) Ink.mint else Ink.strawberry
                val a = if (hover) 1f else .45f
                if (hover) drawRoundRect(col.copy(alpha = .14f), Offset(-6f * k, -8f * k), Size(size.width + 12f * k, size.height + 12f * k), CornerRadius(30f * k))
                drawRoundRect(
                    col.copy(alpha = a), Offset(-6f * k, -8f * k), Size(size.width + 12f * k, size.height + 12f * k), CornerRadius(30f * k),
                    style = Stroke(4f * k, pathEffect = if (hover) null else PathEffect.dashPathEffect(floatArrayOf(10f * k, 7f * k)))
                )
            })
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // viñedo de la Uva
            Box(Modifier.fillMaxWidth().height(if (player) 50.dp else 0.dp))
            Box(
                Modifier.size(spriteSize.dp).onGloballyPositioned { ctl.anchors[c.key] = it.boundsInRoot() }
                    .graphicsLayer {
                        val t = clock.value
                        val dir = if (player) 1f else -1f
                        val idle = idlePose(if (player) "player" else if (c.tier == "boss") "boss" else c.idle, t, -index * .9f)
                        val att = if (actor.attack.value < 1f) attackPose(actor.attackKind, actor.attack.value, actor.dir.toFloat(), actor.reach) else Pose.None
                        val kn = if (actor.hit.value < 1f) knockPose(actor.hit.value, actor.hitKb.toFloat()) else Pose.None
                        // llegar al combate caminando (con sus saltitos) y entrar cayendo del cielo (invocados)
                        val e = actor.enter.value
                        val walkX = (1f - e) * (if (player) -560f else 560f)
                        val hop = if (e < 1f) -abs(sin(e * PI.toFloat() * 4f)) * 14f else 0f
                        val sp = actor.spawn.value
                        val spawnY = (1f - sp) * -320f
                        val dy = actor.dying.value
                        val dyPose = if (dy > 0f) {
                            if (dy < .25f) Pose(ty = -18f * (dy / .25f), rot = -6f * (dy / .25f)) else Pose(ty = -18f + (50f + 18f) * ((dy - .25f) / .75f), rot = -6f + 24f * ((dy - .25f) / .75f), sx = 1f - .4f * ((dy - .25f) / .75f), sy = 1f - .4f * ((dy - .25f) / .75f), alpha = 1f - (dy - .25f) / .75f)
                        } else Pose.None
                        val df = actor.defeated.value
                        val dfPose = if (df > 0f) {
                            if (df < .3f) Pose(ty = -20f * (df / .3f), rot = -10f * (df / .3f)) else Pose(ty = -20f + 80f * ((df - .3f) / .7f), rot = -10f + 90f * ((df - .3f) / .7f), sx = 1f - .5f * ((df - .3f) / .7f), sy = 1f - .5f * ((df - .3f) / .7f), alpha = 1f - (df - .3f) / .7f)
                        } else Pose.None
                        val shiver = if (actor.shiver.value < 1f) sin(actor.shiver.value * PI.toFloat() * 4f) * 4f else 0f
                        translationX = (idle.tx + att.tx + kn.tx + walkX + dyPose.tx + dfPose.tx + shiver) * density
                        translationY = (idle.ty + att.ty + kn.ty + hop + spawnY + dyPose.ty + dfPose.ty) * density
                        rotationZ = idle.rot + att.rot + kn.rot + dyPose.rot + dfPose.rot
                        scaleX = idle.sx * att.sx * kn.sx * dyPose.sx * dfPose.sx
                        scaleY = idle.sy * att.sy * kn.sy * dyPose.sy * dfPose.sy
                        alpha = if (hidden) 0f else (att.alpha * dyPose.alpha * dfPose.alpha * min(1f, e * 10f) * min(1f, sp * 4f))
                        transformOrigin = TransformOrigin(.5f, 1f)
                        compositingStrategy = if (actor.flash.value > 0f) CompositingStrategy.Offscreen else CompositingStrategy.Auto
                    }
                    .drawWithContent {
                        drawContent()
                        val f = actor.flash.value
                        if (f > 0f) drawRect(Color(0xFFFF5040).copy(alpha = f * .6f), blendMode = BlendMode.SrcAtop)
                    },
                contentAlignment = Alignment.BottomCenter
            ) {
                // sombra
                Box(Modifier.align(Alignment.BottomCenter).size((spriteSize * .93f).dp, 20.dp).drawBehind { drawOval(Color(0x2E4A3428), Offset.Zero, size) })
                val mood = if (actor.hurtFace) "hurt" else null
                if (c.charId != null) FruitSprite(c.charId, spriteSize.dp, mood = mood, hurt = c.hurt) // tu fruta, vestida
                else Sprite(c.sprite, spriteSize.dp, mood = mood, hurt = c.hurt)
            }
            Plate(c, ctl, multi, Modifier.fillMaxWidth().padding(top = 0.dp))
        }
        // anillo de cáscara / curación / poder
        Box(Modifier.matchParentSize().graphicsLayer { alpha = if (actor.ring.value < 1f) 1f - actor.ring.value else 0f; val s = .6f + .7f * actor.ring.value; scaleX = s; scaleY = s }.drawBehind {
            drawOval(actor.ringColor, Offset(size.width * .2f, size.height * .12f), Size(size.width * .6f, size.height * .45f), style = Stroke(6f * density))
        })
        // globo de intención
        c.intent?.let { intent ->
            IntentBubble(
                intent, ctl.acting == index - 1 && !player, { ctl.showInfo(intent.title.ifEmpty { "Intención" }, intent.tip) },
                Modifier.align(Alignment.TopStart).offset(10.dp, 0.dp)
            )
        }
    }
}


/** Viñedo de la Uva: tres surcos con sus brotes y los turnos que les faltan. */
@Composable
private fun Garden(garden: List<GardenUi>, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        for (i in 0 until 3) {
            val g = garden.getOrNull(i)
            Box(
                Modifier.size(46.dp).drawBehind {
                    val r = 12f * density
                    if (g == null) drawRoundRect(Ink.inkSoft.copy(alpha = .5f), cornerRadius = CornerRadius(r), style = Stroke(2f * density, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f * density, 5f * density))))
                    else {
                        drawRoundRect(Ink.ink, Offset(-2f * density, -2f * density), Size(size.width + 4f * density, size.height + 4f * density), CornerRadius(r + 2f * density))
                        drawRoundRect(if (g.timer == 1) Ink.leafSoft else Ink.edge, cornerRadius = CornerRadius(r))
                    }
                },
                contentAlignment = Alignment.Center
            ) {
                if (g != null) {
                    Sprite(g.sprite, 34.dp)
                    Box(Modifier.align(Alignment.BottomEnd).offset(4.dp, 4.dp).chip(99.dp, Ink.banana).padding(horizontal = 5.dp)) { BasicText("${g.timer}", style = Fonts.display(15f)) }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Naranja de energía, pilas y botón de turno
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun EnergyOrange(energy: Int, max: Int, nope: Int, ctl: CombatController, modifier: Modifier = Modifier) {
    val shake = remember { Animatable(0f) }
    LaunchedEffect(nope) { if (nope > 0) { shake.snapTo(0f); shake.animateTo(1f, tween(400)) } }
    Box(
        modifier.size(124.dp).onGloballyPositioned { ctl.anchors["orange"] = it.boundsInRoot() }
            .graphicsLayer { translationX = if (shake.value in 0.001f..0.999f) sin(shake.value * PI.toFloat() * 6f) * 8f * density else 0f }
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val k = size.width / 140f
            val n = max(max(energy, max), 1)
            val cx = 70f * k; val cy = 70f * k
            drawCircle(Color.White, 67f * k, Offset(cx, cy))
            drawCircle(Color(0x334A3428), 64f * k, Offset(cx + 2f * k, cy + 4f * k))
            drawCircle(Ink.ink, 66f * k, Offset(cx, cy))
            drawCircle(Color(0xFFFF8C2E), 64f * k, Offset(cx, cy))
            drawCircle(Color(0xFFFFF1DC), 56f * k, Offset(cx, cy))
            val gap = if (n > 1) 5f else 0f
            for (i in 0 until n) {
                val a0 = -90f + (360f / n) * i + gap / 2
                val sweep = 360f / n - gap
                val full = i < energy
                if (n == 1) drawCircle(if (full) Color(0xFFFFA64D) else Color(0xFFD9D2C7), 50f * k, Offset(cx, cy))
                else {
                    drawArc(if (full) Color(0xFFFFA64D) else Color(0xFFD9D2C7), a0, sweep, true, Offset(cx - 50f * k, cy - 50f * k), Size(100f * k, 100f * k))
                    drawArc(Color(0xFFFFE9CC), a0, sweep, true, Offset(cx - 50f * k, cy - 50f * k), Size(100f * k, 100f * k), style = Stroke(2f * k))
                }
            }
            drawCircle(Color(0xFFFFF1DC), 9f * k, Offset(cx, cy))
        }
        Box(Modifier.align(Alignment.BottomEnd).offset(8.dp, 4.dp).graphicsLayer { rotationZ = -6f }.chip(99.dp).padding(horizontal = 10.dp, vertical = 1.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                BasicText("$energy", style = Fonts.display(28f))
                BasicText("/$max", style = Fonts.body(16f, color = Ink.inkSoft))
            }
        }
    }
}

@Composable
private fun Pile(label: String, count: Int, which: String, ctl: CombatController, modifier: Modifier = Modifier) {
    val bump = remember { Animatable(0f) }
    LaunchedEffect(ctl.deckBump) { if (ctl.deckBump > 0) { bump.snapTo(0f); bump.animateTo(1f, tween(500)) } }
    Column(
        modifier.graphicsLayer { scaleX = .86f; scaleY = .86f; val b = if (bump.value in 0.001f..0.999f) sin(bump.value * PI.toFloat()) * .08f else 0f; scaleX += b; scaleY += b }
            .pointerInput(Unit) { detectTapGestures { ctl.showPile(which) } }
            .onGloballyPositioned { ctl.anchors[which] = it.boundsInRoot() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(Modifier.size(80.dp, 100.dp)) {
            if (count == 0) Box(Modifier.offset(6.dp, 4.dp).size(64.dp, 90.dp).drawBehind {
                drawRoundRect(Color(0xFFD9C8AE), cornerRadius = CornerRadius(9f * density), style = Stroke(3f * density, pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f * density, 6f * density))))
            })
            else {
                val backs = min(3, max(1, (count + 3) / 4))
                val color = if (which == "discard") Ink.mint else Ink.peach
                CardBack(64.dp, 90.dp, Modifier.offset(6.dp, 4.dp), color)
                if (backs >= 2) CardBack(64.dp, 90.dp, Modifier.offset(11.dp, 0.dp).graphicsLayer { rotationZ = 5f }, color)
                if (backs >= 3) CardBack(64.dp, 90.dp, Modifier.offset(2.dp, (-3).dp).graphicsLayer { rotationZ = -6f }, color)
            }
            Box(Modifier.align(Alignment.TopEnd).offset(0.dp, 54.dp).chip(99.dp, Ink.banana).padding(horizontal = 8.dp)) { BasicText("$count", style = Fonts.display(24f)) }
        }
        BasicText(label, style = Fonts.hand(20f))
    }
}

// ---------------------------------------------------------------------------------------------------------------
// La mano en abanico
// ---------------------------------------------------------------------------------------------------------------
class CardPose(val cx: Float, val cy: Float, val rot: Float, val scale: Float)

const val HAND_TOP = 454f // arriba de las cartas sin abanico (la mano asoma desde el borde de abajo)
const val PLAY_LINE = 452f

fun fanPose(i: Int, n: Int, w: Float, selected: Boolean): CardPose {
    val overlap = if (n > 1) min(-10f, (900f - n * CARD_W) / (n - 1)) else 0f
    val off = i - (n - 1) / 2f
    val bx = w / 2f + off * (CARD_W + overlap)
    val by = HAND_TOP + CARD_H / 2f
    if (selected) return CardPose(bx, by - 110f, 0f, 1.08f)
    val r = off * 3.5f
    val y = off * off * 3.5f
    val rad = r * PI.toFloat() / 180f
    return CardPose(bx + 200f * sin(rad) - y * sin(rad), by + 200f * (1 - cos(rad)) + y * cos(rad), r, 1f)
}

private fun hitCard(p: Offset, pose: CardPose): Boolean {
    val rad = -pose.rot * PI.toFloat() / 180f
    val dx = p.x - pose.cx
    val dy = p.y - pose.cy
    val lx = dx * cos(rad) - dy * sin(rad)
    val ly = dx * sin(rad) + dy * cos(rad)
    return abs(lx) <= CARD_W / 2f * pose.scale && abs(ly) <= CARD_H / 2f * pose.scale
}

class DragState(val index: Int, val start: Offset, val base: CardPose, var pos: Offset)

@Composable
private fun HandCardView(h: HandCardUi, i: Int, n: Int, ctl: CombatController, designW: Float, drag: DragState?, discarding: Boolean) {
    val density = LocalDensity.current.density
    val selected = ctl.selected == i
    val dragging = drag?.index == i
    val fan = fanPose(i, n, designW, selected)
    val target = if (dragging) {
        val d = drag!!
        CardPose(d.base.cx + (d.pos.x - d.start.x), d.base.cy + (d.pos.y - d.start.y), 0f, if (ctl.hover?.startsWith("enemy-") == true) .72f else 1.08f)
    } else fan
    val spec = if (dragging) snap<Float>() else tween<Float>(460, easing = EaseOutSoft)
    val cx by animateFloatAsState(target.cx, spec, label = "x")
    val cy by animateFloatAsState(target.cy, spec, label = "y")
    val rot by animateFloatAsState(target.rot, spec, label = "rot")
    val sc by animateFloatAsState(target.scale, spec, label = "sc")
    val appear = remember { Animatable(0f) }
    LaunchedEffect(Unit) { kotlinx.coroutines.delay(i * 70L); appear.animateTo(1f, tween(600, easing = EaseOutSoft)) }
    val discard by animateFloatAsState(if (discarding && !h.card.retain) 1f else 0f, tween(400, delayMillis = i * 45), label = "descarte")
    val pile = ctl.anchors["discard"]?.center
    Box(
        Modifier.size(CARD_W.dp, CARD_H.dp).zIndex(if (dragging) 30f else if (selected) 15f else i.toFloat()).graphicsLayer {
            val a = appear.value
            val dx = if (pile != null) pile.x / density - cx else 480f
            val dy = if (pile != null) pile.y / density - cy else 0f
            translationX = (cx - CARD_W / 2 + (1 - a) * -560f + discard * dx) * density
            translationY = (cy - CARD_H / 2 + (1 - a) * 90f + discard * dy) * density
            rotationZ = rot + (1 - a) * -30f + discard * 40f
            val s = sc * (.4f + .6f * a) * (1f - discard * .7f)
            scaleX = s; scaleY = s
            alpha = if (ctl.hiddenSlot == h.key) 0f else min(1f, a * 3f) * (1f - discard * .8f)
        }
    ) {
        val glow = if (selected) Ink.mintDark else null
        CardView(h.card, preview = h.preview, dimmed = !h.playable && !dragging, glow = glow)
    }
}

/** La ficha que explica la carta elegida: su texto con los números reales y cada término que menciona. */
@Composable
private fun CardInfoPanel(h: HandCardUi, pose: CardPose, designW: Float) {
    val rows = remember(h.card.id) { keywordRows(h.card.description) }
    val text = remember(h.card.id, h.preview) { gameText(h.card.description, h.preview) }
    val w = 300f
    val cardRight = pose.cx + CARD_W * pose.scale / 2f
    val left = if (cardRight + 14f + w > designW - 10f) pose.cx - CARD_W * pose.scale / 2f - 14f - w else cardRight + 14f
    Column(
        Modifier.offset(max(10f, left).dp, 72.dp).width(w.dp).zIndex(40f)
            .stickerCard(16.dp, Ink.paper2).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        GameText(text, Fonts.body(17f), Modifier.fillMaxWidth())
        rows.forEach { r ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                if (r.sprite != null) Sprite(r.sprite, 26.dp)
                Column {
                    BasicText(r.title, style = Fonts.body(15f, FontWeight.Bold, r.color))
                    GameText(r.text, Fonts.body(13.5f, color = Ink.inkSoft))
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Efectos que flotan por encima de todo
// ---------------------------------------------------------------------------------------------------------------
@Composable
private fun FloatFxView(f: FloatFx, ctl: CombatController) {
    val a = ctl.anchors[f.anchor] ?: return
    val t = remember { Animatable(0f) }
    LaunchedEffect(Unit) { t.animateTo(1f, tween(1200)) }
    val density = LocalDensity.current.density
    Box(
        Modifier.offset { IntOffset((a.center.x + f.dx * density).roundToInt(), (a.top + a.height * .25f).roundToInt()) }
            .wrapContentSize(Alignment.TopStart, unbounded = true)
            .graphicsLayer {
                val p = t.value
                translationX = -size.width / 2f
                translationY = -70f * density * EaseOutSoft.transform(p)
                alpha = if (p < .65f) 1f else 1f - (p - .65f) / .35f
                val s = if (p < .2f) .6f + 2f * p else 1f
                scaleX = s; scaleY = s
            }
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            if (f.sprite != null) Sprite(f.sprite, 38.dp)
            OutlinedText(f.text, Fonts.display(30f, f.color), inkWidth = 0.dp, edgeWidth = 3.dp)
        }
    }
}

@Composable
private fun HitFxView(h: HitFx, ctl: CombatController) {
    val a = ctl.anchors[h.anchor] ?: return
    val t = remember { Animatable(0f) }
    LaunchedEffect(Unit) { t.animateTo(1f, tween(600)) }
    val density = LocalDensity.current.density
    val cx = a.center.x
    val cy = a.top + a.height * .45f
    Canvas(Modifier.fillMaxSize()) {
        val p = t.value
        val k = density
        val fade = 1f - p
        when (h.kind) {
            "claw", "slash", "stab", "spin", "sting", "bite" -> {
                val flip = if (h.anchor == "player") -1f else 1f
                val strokes = if (h.kind == "claw") 3 else 1
                for (s in 0 until strokes) {
                    val ox = (s - (strokes - 1) / 2f) * 22f * k
                    val len = (30f + 70f * min(1f, p * 3f)) * k
                    val from = Offset(cx + (ox - 40f * k) * flip, cy - len / 2)
                    val to = Offset(cx + (ox + 30f * k) * flip, cy + len / 2)
                    drawLine(Ink.ink.copy(alpha = fade), from, to, 14f * k, StrokeCap.Round)
                    drawLine(Color.White.copy(alpha = fade), from, to, 8f * k, StrokeCap.Round)
                }
            }
            "ice" -> for (i in 0 until 6) {
                val ang = i * 60f * PI.toFloat() / 180f
                val d = 20f * k + p * 60f * k
                drawRoundRect(Color(0xFFCDEBF5).copy(alpha = fade), Offset(cx + cos(ang) * d - 7f * k, cy + sin(ang) * d - 7f * k), Size(14f * k, 14f * k), CornerRadius(3f * k))
            }
            "seeds", "splat", "splash", "shock" -> for (i in 0 until 6) {
                val ang = (i * 60f + 20f) * PI.toFloat() / 180f
                val d = 14f * k + p * 55f * k
                drawCircle((if (h.kind == "splash") Color(0xFFFFE27A) else if (h.kind == "shock") Color(0xFFC9D3DC) else Color(0xFFB7E27F)).copy(alpha = fade), 9f * k * (1f - p * .4f), Offset(cx + cos(ang) * d, cy + sin(ang) * d))
            }
            else -> {
                // puñetazo / estallido: la estrella de golpe
                val s = (.4f + 1.1f * min(1f, p * 2.5f)) * (if (h.kind == "burst") 120f else 84f) * k
                drawSprite("ui_hit", Offset(cx - s / 2, cy - s / 2), s, alpha = fade, outline = false)
                if (h.kind == "burst") drawCircle(Color(0xFFFFA64D).copy(alpha = fade * .6f), (30f + p * 70f) * k, Offset(cx, cy), style = Stroke(6f * k))
            }
        }
    }
}

@Composable
private fun ProjectileView(p: ProjectileFx, ctl: CombatController) {
    val a = ctl.anchors[p.from] ?: return
    val b = ctl.anchors[p.to] ?: return
    val t = remember { Animatable(0f) }
    LaunchedEffect(Unit) { t.animateTo(1f, tween(240, easing = androidx.compose.animation.core.LinearEasing)) }
    Canvas(Modifier.fillMaxSize()) {
        val k = density
        val s = t.value
        val x = a.center.x + (b.center.x - a.center.x) * s
        val y = a.top + a.height * .45f + (b.top + b.height * .45f - (a.top + a.height * .45f)) * s - sin(s * PI.toFloat()) * 70f * k
        drawCircle(Ink.ink, 15f * k, Offset(x, y))
        drawCircle(p.color, 12f * k, Offset(x, y))
    }
}

@Composable
private fun BannerView(b: Banner, ctl: CombatController) {
    val a = ctl.anchors[b.anchor ?: "player"] ?: return
    val t = remember { Animatable(0f) }
    LaunchedEffect(Unit) { t.animateTo(1f, tween(1300)) }
    val density = LocalDensity.current.density
    Box(
        Modifier.offset { IntOffset(a.center.x.roundToInt(), (a.top - 14f * density).roundToInt()) }
            .wrapContentSize(Alignment.TopStart, unbounded = true)
            .graphicsLayer {
                val p = t.value
                translationX = -size.width / 2f
                translationY = -size.height - 10f * density * p
                alpha = if (p < .12f) p / .12f else if (p > .75f) (1f - p) / .25f else 1f
            }
    ) {
        Row(
            Modifier.chip(99.dp, if (b.side == "player") Ink.mintSoft else Ink.strawberrySoft).padding(start = 6.dp, end = 16.dp, top = 3.dp, bottom = 3.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (b.sprite != null) Sprite(b.sprite, 34.dp)
            BasicText(b.text, style = Fonts.display(23f))
        }
    }
}

@Composable
private fun TurnBannerView(text: String, key: Long, designW: Float) {
    val t = remember(key) { Animatable(0f) }
    LaunchedEffect(key) { t.animateTo(1f, tween(1300, easing = androidx.compose.animation.core.LinearEasing)) }
    val player = text.startsWith("¡Tu")
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Box(
            Modifier.graphicsLayer {
                val p = t.value
                val x = if (p < .22f) -1f + EaseOutSoft.transform(p / .22f) else if (p > .78f) EaseOutSoft.transform((p - .78f) / .22f) else 0f
                translationX = x * designW * density
                alpha = if (p in 0.01f..0.99f) 1f else 0f
            }.rotateDeg(-2f).chip(24.dp, if (player) Ink.mint else Ink.strawberry).padding(horizontal = 40.dp, vertical = 8.dp)
        ) {
            OutlinedText(text, Fonts.display(54f, Color.White), inkWidth = 3.dp, edgeWidth = 0.dp)
        }
    }
}

private fun Modifier.rotateDeg(d: Float): Modifier = this.graphicsLayer { rotationZ = d }

@Composable
private fun FlyingCardView(f: FlyingCard, ctl: CombatController) {
    val to = ctl.anchors[f.toAnchor]
    val t = remember(f.id) { Animatable(0f) }
    LaunchedEffect(f.id) { t.animateTo(1f, tween(340, easing = EaseInOut)) }
    val density = LocalDensity.current.density
    Box(
        Modifier.size(CARD_W.dp, CARD_H.dp).graphicsLayer {
            val p = t.value
            val from = f.from.center
            val dest = to?.center ?: from
            val x = from.x + (dest.x - from.x) * p
            val y = from.y + (dest.y - from.y) * p - sin(p * PI.toFloat()) * 24f * density
            translationX = x - size.width / 2f
            translationY = y - size.height / 2f
            rotationZ = 18f * p
            val s = (1f - .7f * p) * (f.from.width / (CARD_W * density)).coerceAtLeast(.3f)
            scaleX = s; scaleY = s
            alpha = if (p < .8f) 1f else (1f - p) / .2f
        }
    ) { CardView(f.card) }
}

/** La explicación de algo (estado, intención, pila…): se cierra tocando. */
@Composable
private fun InfoPanel(title: String, text: String, modifier: Modifier = Modifier) {
    Column(
        modifier.width(420.dp).stickerCard(16.dp, Ink.paper2).padding(horizontal = 18.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        BasicText(title, style = Fonts.body(19f, FontWeight.Bold))
        GameText(text, Fonts.body(16f, color = Ink.ink))
    }
}

// ---------------------------------------------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------------------------------------------
@Composable
fun CombatScreen(ctl: CombatController, bg: String, modifier: Modifier = Modifier) {
    val ui = ctl.ui
    val density = LocalDensity.current.density
    val designW = LocalDesignWidth.current
    ctl.pxPerUnit = density
    // reloj en segundos para las animaciones de reposo (se lee solo al dibujar: no recompone nada)
    val clock = rememberInfiniteTransition(label = "reloj").animateFloat(0f, 3600f, infiniteRepeatable(tween(3_600_000, easing = androidx.compose.animation.core.LinearEasing), RepeatMode.Restart), label = "t")
    var drag by remember { mutableStateOf<DragState?>(null) }
    val multi = ui.enemies.size > 1
    val discarding = ctl.discarding

    Box(
        modifier.fillMaxSize()
            // el arrastre de cartas se atiende antes que nadie (Initial): solo toma el toque si cae sobre una carta
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                    val u = ctl.ui
                    val n = u.hand.size
                    val p0 = down.position / density
                    val order = (0 until n).sortedByDescending { if (it == ctl.selected) n + 1 else it }
                    val idx = order.firstOrNull { hitCard(p0, fanPose(it, n, designW, it == ctl.selected)) } ?: -1
                    if (idx < 0 || !ctl.canPlayNow()) {
                        if (ctl.info != null) { ctl.info = null; return@awaitEachGesture }
                        if (ctl.selected >= 0 && !ctl.busy) {
                            // tocar fuera de las cartas deselecciona
                            var moved = false
                            while (true) {
                                val ev = awaitPointerEvent(PointerEventPass.Final)
                                val ch = ev.changes.firstOrNull { it.id == down.id } ?: break
                                if ((ch.position / density - p0).getDistance() > 10f) moved = true
                                if (!ch.pressed) { if (!moved) ctl.selected = -1; break }
                            }
                        }
                        return@awaitEachGesture
                    }
                    down.consume()
                    val card = u.hand[idx].card
                    val base = fanPose(idx, n, designW, false)
                    var dragging = false
                    var pos = p0
                    while (true) {
                        val ev = awaitPointerEvent(PointerEventPass.Initial)
                        val ch = ev.changes.firstOrNull { it.id == down.id } ?: break
                        ch.consume()
                        pos = ch.position / density
                        if (!dragging && (pos - p0).getDistance() > 8f) {
                            dragging = true
                            ctl.selected = idx
                            ctl.dragNeeds = ctl.needsTarget(card)
                        }
                        if (dragging) {
                            drag = DragState(idx, p0, base, pos)
                            ctl.updateHover(idx, pos, density)
                        }
                        if (!ch.pressed) {
                            if (dragging) {
                                val res = ctl.dropResult(idx, pos, density)
                                val center = Offset(base.cx + (pos.x - p0.x), base.cy + (pos.y - p0.y)) * density
                                val half = Offset(CARD_W / 2f * .8f, CARD_H / 2f * .8f) * density
                                drag = null
                                ctl.endDrag()
                                if (res != null) ctl.tryPlay(idx, if (res == "self") null else res.removePrefix("enemy-").toInt(), Rect(center - half, center + half))
                                else ctl.selected = -1
                            } else {
                                drag = null
                                ctl.select(idx)
                            }
                            break
                        }
                    }
                }
            }
    ) {
        CombatBackground(bg)

        // regla del piso (arriba a la izquierda)
        if (ui.ruleName != null) {
            Row(
                Modifier.align(Alignment.TopStart).padding(start = 22.dp, top = 62.dp).chip(99.dp, Ink.paper2)
                    .pointerInput(Unit) { detectTapGestures(onTap = { ctl.showInfo("Regla del piso: ${ui.ruleName}", ui.ruleDesc ?: "") }) }
                    .padding(start = 6.dp, end = 14.dp, top = 3.dp, bottom = 3.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ui.ruleSprite?.let { Sprite(it, 34.dp) }
                BasicText(ui.ruleName, style = Fonts.hand(20f))
            }
        }

        // escenario: la fruta a la izquierda y los enemigos a la derecha
        Row(
            Modifier.fillMaxSize().padding(start = if (multi) 16.dp else 60.dp, end = if (multi) 16.dp else 60.dp, top = 56.dp, bottom = 248.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            val me = ui.player
            val meW = if (multi) 330f else 400f
            Box {
                CombatantView(me, ctl.actors[0], ctl, clock, meW, if (multi) 118f else 140f, multi, 0)
                if (ui.showGarden) Garden(ui.garden, Modifier.align(Alignment.TopCenter))
            }
            Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                BasicText("vs", style = Fonts.hand(40f, Color(0xFFA57A4E)), modifier = Modifier.graphicsLayer { rotationZ = -8f })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
                ui.enemies.forEachIndexed { i, e ->
                    key(i) {
                        val size = if (multi) 118f else if (e.tier == "boss") 160f else 140f
                        CombatantView(e, ctl.actors[1 + i], ctl, clock, if (multi) 262f else 400f, size, multi, i + 1)
                    }
                }
            }
        }

        // abajo: naranja y pila de robo | mano | pilas y botón
        Column(Modifier.align(Alignment.BottomStart).padding(start = 18.dp, bottom = 12.dp).width(200.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            EnergyOrange(ui.energy, ui.maxEnergy, ctl.orangeNope, ctl)
            Pile("robo", ui.drawCount, "draw", ctl)
        }
        Column(Modifier.align(Alignment.BottomEnd).padding(end = 18.dp, bottom = 12.dp).width(200.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy((-14).dp)) {
                Pile("compost", ui.exhaustCount, "exhaust", ctl)
                Pile("descarte", ui.discardCount, "discard", ctl)
            }
            StickerButton("Terminar turno", { ctl.endTurn() }, enabled = ui.playerTurn, fontSize = 19f, padding = PaddingValues(horizontal = 18.dp, vertical = 9.dp))
            BasicText("turno ${ui.turnNumber}", style = Fonts.hand(20f, Color(0xFF7A5634)))
        }

        // la mano
        Box(Modifier.fillMaxSize()) {
            ui.hand.forEachIndexed { i, h -> key(h.key) { HandCardView(h, i, ui.hand.size, ctl, designW, drag, discarding) } }
            val sel = ctl.selected
            if (sel in ui.hand.indices && drag == null && !ctl.busy) {
                CardInfoPanel(ui.hand[sel], fanPose(sel, ui.hand.size, designW, true), designW)
            }
        }

        // efectos por encima de todo
        Box(Modifier.fillMaxSize()) {
            ctl.floats.forEach { f -> key(f.id) { FloatFxView(f, ctl) } }
            ctl.hits.forEach { h -> key(h.id) { HitFxView(h, ctl) } }
            ctl.projectiles.forEach { p -> key(p.id) { ProjectileView(p, ctl) } }
            ctl.banners.forEach { b -> key(b.id) { BannerView(b, ctl) } }
            ctl.flying?.let { f -> key(f.id) { FlyingCardView(f, ctl) } }
            ctl.turnBanner?.let { (k, text) -> key(k) { TurnBannerView(text, k, designW) } }
            // lo que haría la carta que arrastras
            ctl.dropPreview?.let { (target, prev) ->
                val a = ctl.anchors["zone-$target"]
                if (a != null) {
                    Box(Modifier.offset { IntOffset(a.center.x.roundToInt(), (a.top - 4f * density).roundToInt()) }.wrapContentSize(Alignment.TopStart, unbounded = true).graphicsLayer { translationX = -size.width / 2f; translationY = -size.height }) {
                        DropPreviewChip(prev, ctl.previewTarget(target))
                    }
                }
            }
            // semilla por usar: hay que tocar a un enemigo
            if (ctl.seedAiming >= 0) {
                Row(
                    Modifier.align(Alignment.TopCenter).padding(top = 64.dp).chip(99.dp, Ink.mintSoft).padding(start = 18.dp, end = 6.dp, top = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    BasicText("Toca al enemigo que quieras", style = Fonts.hand(24f))
                    StickerButton("Cancelar", { ctl.cancelSeedAim() }, secondary = true, fontSize = 15f, padding = PaddingValues(horizontal = 14.dp, vertical = 3.dp))
                }
            }
            ctl.info?.let { (title, text) ->
                InfoPanel(title, text, Modifier.align(Alignment.Center))
            }
        }
    }
}

@Composable
private fun DropPreviewChip(prev: PreviewResult, enemy: Pair<Int, Int>?) {
    Row(Modifier.chip(99.dp, Ink.paper2).padding(horizontal = 12.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (prev.total > 0 && enemy != null) {
            Sprite("ui_sword", 32.dp)
            BasicText("${prev.total}", style = Fonts.display(26f))
            val lost = max(0, prev.total - enemy.second)
            if (enemy.second > 0) BasicText("(-$lost ❤)", style = Fonts.body(15f, color = Ink.inkSoft))
            if (lost >= enemy.first) BasicText("¡KO!", style = Fonts.display(24f, Ink.strawberry))
        }
        val blk = prev.block.sum()
        if (blk > 0) { Sprite("ui_shield", 32.dp); BasicText("+$blk", style = Fonts.display(26f)) }
    }
}
