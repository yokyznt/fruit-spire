package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateOffsetAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yokyznt.fruitspire.core.NodeType
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.World
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

const val MAP_CELL = 124f
const val MAP_GAP = 24f
const val MAP_LAIR_EXTRA = 90f

/** Esquina izquierda/superior de la casilla i del tablero (en px de diseño sin zoom). */
fun cellPos(i: Int): Float = MAP_GAP + i * (MAP_CELL + MAP_GAP)
fun boardWidth(cols: Int): Float = cols * MAP_CELL + (cols + 1) * MAP_GAP + MAP_LAIR_EXTRA
fun boardHeight(rows: Int): Float = rows * MAP_CELL + (rows + 1) * MAP_GAP

/** Texto de cada tipo de casilla (NODE_INFO de js/game.js). */
class NodeText(val sprite: String, val label: String, val desc: String)

object NodeInfo {
    private val table = mapOf(
        NodeType.ENEMY to NodeText("node_enemy", "Enemigo", "Pelea."),
        NodeType.ELITE to NodeText("node_elite", "Élite", "Pelea dura. Da un objeto."),
        NodeType.REST to NodeText("node_rest", "Campamento", "Cura, madura o quita una carta."),
        NodeType.TREASURE to NodeText("node_treasure", "Tesoro", "Un objeto gratis."),
        NodeType.SHOP to NodeText("node_shop", "Tiendita", "Compra con oro."),
        NodeType.MYSTERY to NodeText("node_mystery", "Misterio", "Evento al azar."),
        NodeType.GIFT to NodeText("node_gift", "Regalo", "Un regalo misterioso."),
        NodeType.GAME to NodeText("node_game", "Mesa de Juegos", "Apuesta oro: dados, póker o ajedrez."),
        NodeType.KEY to NodeText("node_key", "Llave Dorada", "Abre el Cofre Sellado."),
        NodeType.VAULT to NodeText("node_vault", "Cofre Sellado", "Mejor premio con la Llave Dorada.")
    )
    private val blocked = listOf(
        NodeText("obstaculo_arbol", "Árbol Caído", "Bloquea el paso."),
        NodeText("obstaculo_mesa", "Mesa Volcada", "Bloquea el paso."),
        NodeText("obstaculo_maquina", "Máquina Averiada", "Bloquea el paso.")
    )

    fun of(type: String, castle: Int): NodeText? =
        if (type == NodeType.BLOCKED) blocked[(castle - 1).coerceIn(0, 2)] else table[type]
}

/** Colores de fondo del mapa de cada tema de piso (css/style.css, sección «NIVELES»). */
private class MapPalette(
    val viewport: Color, val board: Color, val pattern: String = "grid",
    val patternColor: Color = Color.Transparent, val step: Float = 24f, val deco: Float = .22f, val link: Color = Color(0xFFBBA987),
    val lair: Pair<Color, Color>
)

private val LAIR_1 = Color(0xFFFFB8C6) to Ink.strawberry
private val LAIR_2 = Color(0xFFFFD27A) to Color(0xFFE0703A)
private val LAIR_3 = Color(0xFFC7B4F0) to Color(0xFF6E5A9E)

private fun paletteFor(themeId: String, castle: Int): MapPalette {
    val lair = when {
        themeId == "torre_rey" -> Color(0xFFFFE27A) to Color(0xFF9C6ED6)
        castle == 2 -> LAIR_2
        castle == 3 -> LAIR_3
        else -> LAIR_1
    }
    return when (themeId) {
        "huerto" -> MapPalette(Color(0xFFE1EFC8), Color(0xFFF3F9E4), lair = lair)
        "gallinero" -> MapPalette(Color(0xFFF2E4B8), Color(0xFFFFF6D8), lair = lair)
        "estanque" -> MapPalette(Color(0xFFCDE6EE), Color(0xFFE6F4F8), "blobs", Color(0x4078BED7), 210f, lair = lair)
        "invernadero" -> MapPalette(Color(0xFFCDEBDD), Color(0xFFE9F8F0), "lines", Color(0x5978BEA0), 74f, lair = lair)
        "bodega" -> MapPalette(Color(0xFF4A3A3F), Color(0xFF75606B), "bars", Color(0x1F000000), 60f, .3f, Color(0xFFD9C7A6), lair)
        "dados" -> MapPalette(Color(0xFFE9B7B7), Color(0xFFF8DCDC), "dots", Color(0x2EC8374F), 34f, lair = lair)
        "poker" -> MapPalette(Color(0xFFB4D9BE), Color(0xFFD3EDDA), "dots", Color(0x333C825A), 26f, lair = lair)
        "ajedrez" -> MapPalette(Color(0xFFCFC4AE), Color(0xFFEFE8D8), "checker", Color(0xFFD5C9B0), 148f, lair = lair, link = Color(0x8CBBA987))
        "mercado" -> MapPalette(Color(0xFFF5DCCB), Color(0xFFFFF6EE), lair = lair)
        "cocina" -> MapPalette(Color(0xFFF2D2CC), Color(0xFFFFF4F1), "gingham", Color(0x29C85A50), 74f, lair = lair)
        "fabrica" -> MapPalette(Color(0xFFD5D9E6), Color(0xFFF1F3FA), lair = lair)
        "torre_rey" -> MapPalette(Color(0xFFC9BCE4), Color(0xFFEAE2F7), "lines", Color(0x52D6AF46), 74f, lair = lair)
        else -> MapPalette(if (castle == 2) Color(0xFFF8E1D6) else if (castle == 3) Color(0xFFE4E1EE) else Color(0xFFE9F2D6), Ink.paper2, lair = lair)
    }
}

/** Lo que dibuja el mapa (todo valores: Compose se salta lo que no cambió). */
@Immutable
class MapView(
    val cols: Int, val rows: Int,
    val grid: List<List<String>>,
    val wallsV: List<List<Boolean>>, val wallsH: List<List<Boolean>>,
    val rivers: List<Pair<Int, Int>>,
    val visited: Set<String>,
    val posX: Int, val posY: Int,
    val reachable: Set<Int>,
    val lairReachable: Boolean,
    val themeId: String, val castle: Int, val floor: Int,
    val bossSprite: String, val bossName: String, val bossLabel: String,
    val seed: Int, val charId: String, val decoSet: List<String>
) {
    fun isReachable(x: Int, y: Int) = (y * 1000 + x) in reachable
    override fun equals(other: Any?): Boolean = other is MapView && other.grid == grid && other.posX == posX && other.posY == posY &&
        other.reachable == reachable && other.visited == visited && other.themeId == themeId && other.lairReachable == lairReachable && other.seed == seed
    override fun hashCode(): Int = grid.hashCode() * 31 + posX * 7 + posY
}

fun mapViewOf(run: Run): MapView {
    val m = run.map
    val reach = HashSet<Int>()
    val x = run.pos.x
    val y = run.pos.y
    for ((nx, ny) in listOf(x + 1 to y, x to y - 1, x to y + 1)) if (nx < m.cols - 1 && run.isReachable(nx, ny)) reach.add(ny * 1000 + nx)
    val lair = x == m.cols - 2 && run.isReachable(m.cols - 1, y)
    val theme = run.theme
    val finalFloor = run.player.floor >= World.FLOORS_PER_CASTLE
    val boss = run.boss
    return MapView(
        m.cols, m.rows, m.grid.map { it.toList() }, m.wallsV.map { it.toList() }, m.wallsH.map { it.toList() },
        m.rivers.map { it.col to it.bridge }, run.visited.toSet(), x, y, reach, lair,
        theme.id, run.player.act, run.player.floor, boss.sprite ?: boss.id, boss.name,
        "${if (finalFloor) "Jefe" else "Guardián"}: ${boss.name}", m.seed, run.player.characterId,
        theme.deco.ifEmpty { listOf("deco_pasto") }
    )
}

/** Posición y movimiento del tablero (se guarda fuera de la pantalla para no perderla al volver de un combate). */
class MapPan {
    val anim = Animatable(Offset.Zero, Offset.VectorConverter)
    var ready = false
    var floorKey = ""
}

private fun clampAxis(v: Float, view: Float, size: Float): Float =
    if (size <= view) (view - size) / 2f else v.coerceIn(view - size, 0f)

private val TILTS = floatArrayOf(-2f, 1.5f, -1f, 2.5f)
private val SQUIGGLE: Path by lazy { PathParser().parsePathString("M10 30 Q30 10 40 40 T70 40 T90 70 M15 70 Q35 50 50 70 T88 30").toPath() }

private fun tapeColors(kind: Int): Pair<Color, Color> = when (kind % 3) {
    0 -> Color(0xCCFF9E7A) to Color(0xCCFFD6C8)
    1 -> Color(0xBF5CC9A7) to Color.White.copy(alpha = .9f)
    else -> Color(0xD9FFCF4D) to Color(0xD9FFF1C2)
}

/** Rellena [area] con una cinta washi: rayas a 45° (0), lunares (1) o rayas verticales (2). */
private fun DrawScope.drawTape(kind: Int, left: Float, top: Float, w: Float, h: Float, vertical: Boolean, river: Boolean) {
    val k = density
    val clip = Path().apply {
        if (vertical) {
            val a = 4f * k
            moveTo(left, top + a); lineTo(left + w * .25f, top); lineTo(left + w * .5f, top + a); lineTo(left + w * .75f, top); lineTo(left + w, top + a)
            lineTo(left + w, top + h - a); lineTo(left + w * .75f, top + h); lineTo(left + w * .5f, top + h - a); lineTo(left + w * .25f, top + h); lineTo(left, top + h - a); close()
        } else {
            val a = 4f * k
            moveTo(left + a, top); lineTo(left + w - a, top); lineTo(left + w, top + h * .25f); lineTo(left + w - a, top + h * .5f); lineTo(left + w, top + h * .75f)
            lineTo(left + w - a, top + h); lineTo(left + a, top + h); lineTo(left, top + h * .75f); lineTo(left + a, top + h * .5f); lineTo(left, top + h * .25f); close()
        }
    }
    clipPath(clip) {
        val (base, light) = if (river) Color(0xD96FA8D6) to Color(0xD9A0CDE8) else tapeColors(kind)
        drawRect(base, Offset(left, top), Size(w, h))
        when {
            river || kind % 3 == 0 -> {
                val step = 14f * k
                var x = left - h - w
                while (x < left + w + h) { drawLine(light, Offset(x, top + h), Offset(x + h, top), strokeWidth = 7f * k * .8f); x += step }
            }
            kind % 3 == 1 -> {
                var y = top + 5f * k
                while (y < top + h) {
                    var x = left + 5f * k
                    while (x < left + w) { drawCircle(light, 2f * k, Offset(x, y)); x += 10f * k }
                    y += 10f * k
                }
            }
            else -> {
                var x = left
                var i = 0
                while (x < left + w) { if (i % 2 == 1) drawRect(light, Offset(x, top), Size(6f * k, h)); x += 6f * k; i++ }
            }
        }
    }
}

/** Todo lo quieto del tablero: papel, adornos, caminitos, casillas, muros y puentes. */
private fun DrawScope.drawBoard(v: MapView, pal: MapPalette) {
    val k = density // px por unidad de diseño (el zoom ya va en la densidad)
    fun u(x: Float) = x * k
    val w = size.width
    val h = size.height
    val rr = u(6f)
    // papel con sombra
    drawRoundRect(Color(0x1F4A3428), Offset(u(6f), u(10f)), size, CornerRadius(rr))
    drawRoundRect(Color(0xFFE6D6BC), Offset(-u(2f), -u(2f)), Size(w + u(4f), h + u(4f)), CornerRadius(rr + u(2f)))
    drawRoundRect(pal.board, Offset.Zero, size, CornerRadius(rr))
    clipPath(Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, w, h, CornerRadius(rr))) }) {
        val step = u(pal.step)
        when (pal.pattern) {
            "grid" -> {
                var x = 0f; while (x < w) { drawLine(Ink.paperLine, Offset(x, 0f), Offset(x, h), 1f * k.coerceAtLeast(1f)); x += step }
                var y = 0f; while (y < h) { drawLine(Ink.paperLine, Offset(0f, y), Offset(w, y), 1f * k.coerceAtLeast(1f)); y += step }
            }
            "lines" -> {
                var x = 0f; while (x < w) { drawLine(pal.patternColor, Offset(x, 0f), Offset(x, h), u(2f)); x += step }
                var y = 0f; while (y < h) { drawLine(pal.patternColor, Offset(0f, y), Offset(w, y), u(2f)); y += step }
            }
            "dots" -> {
                var y = step / 2; while (y < h) { var x = step / 2; while (x < w) { drawCircle(pal.patternColor, u(if (pal.step > 30f) 3.5f else 2.5f), Offset(x, y)); x += step }; y += step }
            }
            "bars" -> { var x = 0f; while (x < w) { drawRect(pal.patternColor, Offset(x, 0f), Size(u(3f), h)); x += step } }
            "blobs" -> {
                var oy = 0f
                while (oy < h) {
                    var ox = 0f
                    while (ox < w) {
                        drawCircle(Color(0x4078BED7), u(22f), Offset(ox + step * .2f, oy + step * .3f))
                        drawCircle(Color(0x3878BED7), u(30f), Offset(ox + step * .7f, oy + step * .7f))
                        ox += step
                    }
                    oy += step
                }
            }
            "checker" -> {
                var iy = 0; var y = 0f
                while (y < h) { var ix = 0; var x = 0f; while (x < w) { if ((ix + iy) % 2 == 0) drawRect(Color(0xFFF3EDE0), Offset(x, y), Size(step, step)) else drawRect(pal.patternColor, Offset(x, y), Size(step, step)); x += step; ix++ }; y += step; iy++ }
            }
            "gingham" -> {
                var x = 0f; while (x < w) { drawRect(pal.patternColor, Offset(x, 0f), Size(step / 2, h)); x += step }
                var y = 0f; while (y < h) { drawRect(pal.patternColor, Offset(0f, y), Size(w, step / 2)); y += step }
            }
        }
    }

    // adornos del tema: siempre los mismos para un mismo piso (salen de su semilla)
    var s = (if (v.seed == 0) 1234567L else v.seed.toLong()) and 0xFFFFFFFFL
    fun rnd(): Float { s = (s * 1664525L + 1013904223L) and 0xFFFFFFFFL; return s / 4294967296f }
    val bw = boardWidth(v.cols)
    val bh = boardHeight(v.rows)
    val decoCount = Math.round(v.cols * v.rows * 0.45f)
    for (i in 0 until decoCount) {
        // el tamaño se redondea a decenas: así hay pocos dibujos distintos que preparar
        val sz = (((34 + rnd() * 46) / 10f).roundToInt() * 10).toFloat()
        val left = (rnd() * bw).toInt().toFloat()
        val top = (rnd() * bh).toInt().toFloat()
        val rot = (rnd() * 60 - 30).toInt().toFloat()
        val id = v.decoSet[floor(rnd() * v.decoSet.size).toInt()]
        rotate(rot, Offset(u(left), u(top))) { drawSprite(id, Offset(u(left - sz / 2), u(top - sz / 2)), u(sz), outline = false, alpha = pal.deco) }
    }

    fun walkable(x: Int, y: Int) = y in 0 until v.rows && x in 0 until v.cols && v.grid[y][x] != NodeType.BLOCKED
    // caminitos: un puntejado entre casillas vecinas sin muro ni obstáculo
    val dash = PathEffect.dashPathEffect(floatArrayOf(u(6f), u(6f)))
    for (y in 0 until v.rows) {
        for (x in 0 until v.cols - 1) {
            if (!walkable(x, y)) continue
            if (x < v.cols - 2 && !v.wallsV[y][x] && walkable(x + 1, y)) {
                val cy = u(cellPos(y) + MAP_CELL / 2)
                drawLine(pal.link.copy(alpha = pal.link.alpha * .9f), Offset(u(cellPos(x) + MAP_CELL), cy), Offset(u(cellPos(x) + MAP_CELL + MAP_GAP), cy), u(6f), pathEffect = dash)
            }
            if (y < v.rows - 1 && !v.wallsH[y][x] && walkable(x, y + 1)) {
                val cx = u(cellPos(x) + MAP_CELL / 2)
                drawLine(pal.link.copy(alpha = pal.link.alpha * .9f), Offset(cx, u(cellPos(y) + MAP_CELL)), Offset(cx, u(cellPos(y) + MAP_CELL + MAP_GAP)), u(6f), pathEffect = dash)
            }
        }
    }

    // casillas
    for (y in 0 until v.rows) {
        for (x in 0 until v.cols - 1) {
            val type = v.grid[y][x]
            val isCurrent = v.posX == x && v.posY == y
            val reachable = !isCurrent && v.isReachable(x, y)
            val visited = !isCurrent && v.visited.contains("$x,$y")
            var radius = 24f
            var fill = Ink.edge
            var ring = Color(0xFFD9C8AE)
            var ringW = 2f
            var lift = false
            if (type == NodeType.EMPTY && !isCurrent) { fill = Color.White.copy(alpha = .45f); ring = Color(0xFFE6D6BC); radius = 28f }
            if (reachable) { fill = Color(0xFFF2FAEA); ring = Ink.leaf; ringW = 3f; lift = true }
            if (isCurrent) { fill = Ink.bananaSoft; ring = Ink.ink; ringW = 3f; lift = true }
            if (type == NodeType.BOSS) { fill = Ink.strawberrySoft; ring = Ink.strawberry; ringW = 3f; lift = true }
            if (visited) fill = Color.White.copy(alpha = .5f)
            if (type == NodeType.ELITE) { fill = Color(0xFFFFE8DC); ring = Ink.orange; ringW = 3f; lift = true }
            if (type == NodeType.BLOCKED) { fill = Color(0xFFE8DCC4); ring = Color(0xFFC9B896); ringW = 2f; lift = false }
            val left = u(cellPos(x)); val top = u(cellPos(y)); val cs = u(MAP_CELL)
            val tilt = if (isCurrent) 0f else TILTS[(x * 7 + y * 3) % 4]
            rotate(tilt, Offset(left + cs / 2, top + cs / 2)) {
                if (lift) drawRoundRect(Color(0x2E4A3428), Offset(left + u(2f), top + u(4f)), Size(cs, cs), CornerRadius(u(radius)))
                drawRoundRect(ring, Offset(left - u(ringW), top - u(ringW)), Size(cs + u(ringW * 2), cs + u(ringW * 2)), CornerRadius(u(radius + ringW)))
                drawRoundRect(if (fill.alpha < 1f) pal.board else fill, Offset(left, top), Size(cs, cs), CornerRadius(u(radius)))
                if (fill.alpha < 1f) drawRoundRect(fill, Offset(left, top), Size(cs, cs), CornerRadius(u(radius)))
                if (visited) {
                    // el garabato de "ya pasé por aquí"
                    translate(left + u(22f), top + u(22f)) {
                        scale(u(80f) / 100f, u(80f) / 100f, pivot = Offset.Zero) {
                            drawPath(SQUIGGLE, Color(0xFF8C7462).copy(alpha = .45f), style = Stroke(5f, cap = StrokeCap.Round))
                        }
                    }
                }
                if (type != NodeType.EMPTY && !isCurrent && !reachable) {
                    val info = if (type == NodeType.BOSS) null else NodeInfo.of(type, v.castle)
                    if (info != null) {
                        val sz = u(86f)
                        drawSprite(info.sprite, Offset(left + (cs - sz) / 2, top + (cs - sz) / 2), sz, alpha = if (visited) .6f else 1f)
                    }
                }
            }
        }
    }

    // muros verticales (entre (x,y) y (x+1,y)); los del río se ven distinto y el cruce lleva un puente
    for (y in 0 until v.rows) {
        for (x in 0 until v.cols - 1) {
            val isRiver = v.rivers.any { it.first == x }
            if (isRiver && !v.wallsV[y][x]) {
                val bx = u(cellPos(x + 1) - MAP_GAP); val by = u(cellPos(y) - MAP_GAP / 2)
                val bw2 = u(MAP_GAP); val bh2 = u(MAP_CELL + MAP_GAP)
                drawRect(Ink.ink, Offset(bx - u(2f), by - u(2f)), Size(bw2 + u(4f), bh2 + u(4f)))
                drawRect(Color(0xFF8C6A3F), Offset(bx, by), Size(bw2, bh2))
                var py = 0f
                while (py < bh2) { drawRect(Color(0xFFB0703F), Offset(bx, by + py), Size(bw2, u(6f).coerceAtMost(bh2 - py))); py += u(8f) }
                continue
            }
            if (!v.wallsV[y][x]) continue
            drawTape((x + y) % 3, u(cellPos(x + 1) - MAP_GAP + (MAP_GAP - 17f) / 2), u(cellPos(y) - MAP_GAP / 2), u(17f), u(MAP_CELL + MAP_GAP), true, isRiver)
        }
    }
    // muros horizontales (entre (x,y) y (x,y+1))
    for (y in 0 until v.rows - 1) {
        for (x in 0 until v.cols - 1) {
            if (!v.wallsH[y][x]) continue
            drawTape((x + y + 1) % 3, u(cellPos(x) - MAP_GAP / 2), u(cellPos(y + 1) - MAP_GAP + (MAP_GAP - 17f) / 2), u(MAP_CELL + MAP_GAP), u(17f), false, false)
        }
    }
}

/** Letras blancas con contorno de tinta (los títulos de la guarida). */
@Composable
private fun StrokeText(text: String, style: androidx.compose.ui.text.TextStyle, modifier: Modifier = Modifier, stroke: Float = 4f) {
    Box(modifier) {
        BasicText(text, style = style.copy(color = Ink.ink, drawStyle = Stroke(stroke * 2f * LocalDensity.current.density, join = androidx.compose.ui.graphics.StrokeJoin.Round)))
        BasicText(text, style = style.copy(color = Color.White))
    }
}

/** La guarida del jefe: toda la última columna del mapa. */
@Composable
private fun BossLair(v: MapView, pal: MapPalette, modifier: Modifier) {
    val menace by rememberInfiniteTransition(label = "amenaza").animateFloat(
        0f, 1f, infiniteRepeatable(tween(2000, easing = EaseInOut), RepeatMode.Reverse), label = "menace"
    )
    val bob by rememberInfiniteTransition(label = "salto").animateFloat(
        0f, 1f, infiniteRepeatable(tween(1200, easing = EaseInOut), RepeatMode.Reverse), label = "bob"
    )
    Box(
        modifier.drawBehind {
            val k = density
            val r = 30f * k
            val ink = 7f * k
            if (v.lairReachable) {
                drawRoundRect(Color(0x997BBF5A), Offset(-ink - 14f * k, -ink - 14f * k), Size(size.width + 2 * (ink + 14f * k), size.height + 2 * (ink + 14f * k)), CornerRadius(r + ink + 14f * k))
                drawRoundRect(Ink.leaf, Offset(-ink, -ink), Size(size.width + 2 * ink, size.height + 2 * ink), CornerRadius(r + ink))
                drawRoundRect(Ink.edge, Offset(-4f * k, -4f * k), Size(size.width + 8f * k, size.height + 8f * k), CornerRadius(r + 4f * k))
            } else {
                drawRoundRect(Color(0x334A3428), Offset(6f * k, 10f * k), size, CornerRadius(r))
                drawRoundRect(Ink.ink, Offset(-ink, -ink), Size(size.width + 2 * ink, size.height + 2 * ink), CornerRadius(r + ink))
                drawRoundRect(Ink.edge, Offset(-4f * k, -4f * k), Size(size.width + 8f * k, size.height + 8f * k), CornerRadius(r + 4f * k))
            }
            clipPath(Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, 0f, size.width, size.height, CornerRadius(r))) }) {
                drawRect(Brush.radialGradient(listOf(pal.lair.first, pal.lair.second), Offset(size.width / 2, size.height * .45f), size.maxDimension * .7f))
                var x = -size.height
                while (x < size.width) { drawLine(Color.White.copy(alpha = .13f), Offset(x, 0f), Offset(x + size.height, size.height), 7f * k); x += 28f * k }
                // franjas de peligro arriba y abajo
                val band = 26f * k
                for (top in listOf(0f, size.height - band)) {
                    drawRect(Ink.banana.copy(alpha = .85f), Offset(0f, top), Size(size.width, band))
                    var sx = -band
                    while (sx < size.width) {
                        drawPath(Path().apply { moveTo(sx, top + band); lineTo(sx + 12f * k, top + band); lineTo(sx + 12f * k + band, top); lineTo(sx + band, top); close() }, Ink.ink.copy(alpha = .85f))
                        sx += 24f * k
                    }
                }
            }
        },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            StrokeText("Guarida del jefe", Fonts.hand(30f).copy(textAlign = TextAlign.Center, lineHeight = 31.sp), Modifier.padding(horizontal = 8.dp))
            Box(Modifier.graphicsLayer { rotationZ = (menace * 4f - 2f); val s = 1f + menace * .06f; scaleX = s; scaleY = s }) { Sprite(v.bossSprite, 150.dp) }
            Box(Modifier.graphicsLayer { rotationZ = -2f }.chip(10.dp).padding(horizontal = 12.dp, vertical = 4.dp)) {
                BasicText(v.bossName, style = Fonts.display(24f).copy(textAlign = TextAlign.Center, lineHeight = 26.sp))
            }
            if (v.lairReachable) {
                Box(Modifier.graphicsLayer { translationY = -bob * 6f * density }.chip(99.dp, Ink.mintDark).padding(horizontal = 16.dp, vertical = 2.dp)) {
                    BasicText("¡Entrar!", style = Fonts.hand(27f, Color.White))
                }
            }
        }
    }
}

private val HopEase = CubicBezierEasing(.45f, 0f, .3f, 1f)

/** Una casilla a la que puedes ir: anillo que respira y dibujo que sube y baja. */
@Composable
private fun ReachableMark(type: String, castle: Int, modifier: Modifier) {
    val t = rememberInfiniteTransition(label = "alcanzable")
    val breathe by t.animateFloat(1f, 1.045f, infiniteRepeatable(tween(1600, easing = EaseInOut), RepeatMode.Reverse), label = "aro")
    val bob by t.animateFloat(0f, -4f, infiniteRepeatable(tween(1600, easing = EaseInOut), RepeatMode.Reverse), label = "bob")
    Box(modifier.size(MAP_CELL.dp), contentAlignment = Alignment.Center) {
        Box(Modifier.size(MAP_CELL.dp).graphicsLayer { scaleX = breathe; scaleY = breathe }.drawBehind {
            val k = density
            drawRoundRect(
                Ink.leaf, Offset(-8f * k, -8f * k), Size(size.width + 16f * k, size.height + 16f * k), CornerRadius(30f * k),
                style = Stroke(3f * k, pathEffect = PathEffect.dashPathEffect(floatArrayOf(9f * k, 6f * k)))
            )
        })
        val info = NodeInfo.of(type, castle)
        if (info != null) Box(Modifier.graphicsLayer { translationY = bob * density }) { Sprite(info.sprite, 86.dp) }
    }
}

/** La fruta del jugador caminando por el mapa. */
@Composable
private fun PlayerToken(charId: String, target: Pair<Int, Int>, moving: Boolean) {
    val to = Offset(cellPos(target.first), cellPos(target.second))
    val at by animateOffsetAsState(to, tween(if (moving) 440 else 0, easing = HopEase), label = "ficha")
    val hop = remember { Animatable(0f) }
    LaunchedEffect(target, moving) {
        if (moving) { hop.snapTo(0f); hop.animateTo(1f, tween(440, easing = androidx.compose.animation.core.EaseInOut)) }
    }
    val idle by rememberInfiniteTransition(label = "respira").animateFloat(0f, 1f, infiniteRepeatable(tween(2200, easing = EaseInOut), RepeatMode.Reverse), label = "idle")
    Box(
        Modifier.size(MAP_CELL.dp).graphicsLayer {
            translationX = at.x * density; translationY = at.y * density
        },
        contentAlignment = Alignment.Center
    ) {
        Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 14.dp).size(70.dp, 14.dp).drawBehind {
            drawOval(Color(0x334A3428), Offset.Zero, size)
        })
        Box(
            Modifier.graphicsLayer {
                transformOrigin = TransformOrigin(.5f, 1f)
                val hopY = -sin(hop.value * Math.PI).toFloat() * 26f * density
                translationY = hopY
                scaleX = 1f + idle * .04f
                scaleY = 1f - idle * .05f
            }
        ) { FruitSprite(charId, 86.dp) }
    }
}

/**
 * El mapa del piso (renderMap): tablero que se arrastra, casillas, muros de cinta, guarida del jefe y la ficha.
 * Tocar una casilla con anillo verde te mueve; mantener el dedo sobre cualquiera dice qué es.
 */
@Composable
fun MapScreen(
    view: MapView,
    tokenTarget: Pair<Int, Int>,
    moving: Boolean,
    zoom: Float,
    pan: MapPan,
    onMove: (Int, Int) -> Unit,
    onInfo: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val base = LocalDensity.current
    val boardDensity = remember(base, zoom) { Density(base.density * zoom, base.fontScale) }
    val pal = remember(view.themeId, view.castle) { paletteFor(view.themeId, view.castle) }
    val bw = boardWidth(view.cols)
    val bh = boardHeight(view.rows)
    val boardPx = Size(bw * base.density * zoom, bh * base.density * zoom)
    var vp by remember { mutableStateOf(IntSize.Zero) }
    val scope = rememberCoroutineScope()
    val key = "${view.themeId}/${view.seed}/$zoom"
    val hudMargin = (HUD_H + 30f) * base.density

    fun clamp(o: Offset) = Offset(clampAxis(o.x, vp.width.toFloat(), boardPx.width), clampAxis(o.y, vp.height.toFloat(), boardPx.height))
    fun centerOn(x: Int, y: Int): Offset = clamp(
        Offset(
            vp.width / 2f - (cellPos(x) + MAP_CELL / 2) * zoom * base.density,
            vp.height / 2f + hudMargin / 4f - (cellPos(y) + MAP_CELL / 2) * zoom * base.density
        )
    )

    // al empezar un piso (o cambiar el zoom) se centra en la ficha
    LaunchedEffect(vp, key) {
        if (vp.width == 0) return@LaunchedEffect
        if (!pan.ready || pan.floorKey != key) {
            pan.anim.snapTo(centerOn(view.posX, view.posY))
            pan.ready = true
            pan.floorKey = key
        }
    }
    // si la ficha quedó cerca del borde, el mapa se desliza (se deja ver también la columna que sigue)
    LaunchedEffect(view.posX, view.posY, vp) {
        if (vp.width == 0 || !pan.ready) return@LaunchedEffect
        val cell = MAP_CELL * zoom * base.density
        val gap = MAP_GAP * zoom * base.density
        val margin = 40f * base.density
        val cx = cellPos(view.posX) * zoom * base.density + pan.anim.value.x
        val cy = cellPos(view.posY) * zoom * base.density + pan.anim.value.y
        var x = pan.anim.value.x
        var y = pan.anim.value.y
        if (cx + cell * 2 + gap > vp.width - margin) x -= cx + cell * 2 + gap - (vp.width - margin)
        if (cx < margin) x += margin - cx
        if (cy + cell > vp.height - margin) y -= cy + cell - (vp.height - margin)
        if (cy < margin + HUD_H * base.density) y += margin + HUD_H * base.density - cy
        val target = clamp(Offset(x, y))
        if (target != pan.anim.value) pan.anim.animateTo(target, tween(450, easing = androidx.compose.animation.core.EaseOut))
    }

    // los dibujos del piso se preparan en segundo plano para que el primer cuadro no se trabe
    LaunchedEffect(view.themeId, view.seed, zoom) {
        withContext(Dispatchers.Default) {
            val reqs = LinkedHashMap<String, SpriteRequest>()
            fun add(id: String, size: Float) { reqs.getOrPut("$id@$size") { SpriteRequest(id, size) } }
            add(view.charId, 86f)
            view.grid.forEach { row -> row.forEach { type -> NodeInfo.of(type, view.castle)?.let { add(it.sprite, 86f) } } }
            for (id in view.decoSet) for (s in 30..80 step 10) add(id, s.toFloat())
            SpriteStore.preload(boardDensity.density, reqs.values)
        }
    }

    val currentView by rememberUpdatedState(view)
    val currentMoving by rememberUpdatedState(moving)
    fun cellAt(p: Offset): Pair<Int, Int>? {
        val u = (p - pan.anim.value) / (zoom * base.density)
        val v = currentView
        if (u.x >= cellPos(v.cols - 1) - MAP_GAP / 2) return (v.cols - 1) to v.posY
        val x = floor((u.x - MAP_GAP / 2) / (MAP_CELL + MAP_GAP)).toInt()
        val y = floor((u.y - MAP_GAP / 2) / (MAP_CELL + MAP_GAP)).toInt()
        return if (x in 0 until v.cols - 1 && y in 0 until v.rows) x to y else null
    }

    Box(
        modifier.fillMaxSize().background(pal.viewport).clipToBounds().onSizeChanged { vp = it }
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { p ->
                        val c = cellAt(p) ?: return@detectTapGestures
                        val v = currentView
                        if (currentMoving) return@detectTapGestures
                        if (c.first == v.cols - 1) { if (v.lairReachable) onMove(c.first, c.second) }
                        else if (v.isReachable(c.first, c.second)) onMove(c.first, c.second)
                    },
                    onLongPress = { p ->
                        val c = cellAt(p) ?: return@detectTapGestures
                        val v = currentView
                        if (c.first == v.cols - 1) { onInfo("${v.bossLabel}. El jefe del piso."); return@detectTapGestures }
                        val type = v.grid[c.second][c.first]
                        val info = NodeInfo.of(type, v.castle)
                        if (info != null) onInfo("${info.label}. ${info.desc}")
                    }
                )
            }
            .pointerInput(Unit) {
                detectDragGestures(onDrag = { change, drag ->
                    change.consume()
                    scope.launch { pan.anim.snapTo(clamp(pan.anim.value + drag)) }
                })
            }
    ) {
        CompositionLocalProvider(LocalDensity provides boardDensity) {
            Box(
                // el tablero mide más que la pantalla: se coloca SIEMPRE en la esquina de arriba a la izquierda
                // (requiredSize lo centraba y corría todo el mapa, las primeras casillas quedaban fuera)
                Modifier.layout { measurable, constraints ->
                    val placeable = measurable.measure(Constraints.fixed(bw.dp.roundToPx(), bh.dp.roundToPx()))
                    layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(0, 0) }
                }.graphicsLayer {
                    translationX = pan.anim.value.x; translationY = pan.anim.value.y
                    transformOrigin = TransformOrigin(0f, 0f)
                }
            ) {
                Canvas(Modifier.fillMaxSize()) { drawBoard(view, pal) }
                // casillas a las que puedes ir
                for (key2 in view.reachable) {
                    val x = key2 % 1000
                    val y = key2 / 1000
                    if (!moving) ReachableMark(view.grid[y][x], view.castle, Modifier.offset(cellPos(x).dp, cellPos(y).dp))
                }
                BossLair(
                    view, pal,
                    Modifier.offset(cellPos(view.cols - 1).dp, cellPos(0).dp)
                        .size((MAP_CELL + MAP_LAIR_EXTRA).dp, (view.rows * MAP_CELL + (view.rows - 1) * MAP_GAP).dp)
                )
                PlayerToken(view.charId, tokenTarget, moving)
            }
        }
    }
}
