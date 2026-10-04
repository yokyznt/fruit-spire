package com.yokyznt.fruitspire.core

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// ============================================================
// Generación del laberinto de cada piso (port de js/engine/map.js). Los "muros" NO son casillas propias:
// son bordes bloqueados entre dos casillas vecinas, verticales (entre x y x+1) u horizontales (entre y e y+1).
//
// Reglas de movimiento: adelante (derecha), arriba o abajo — nunca hacia atrás ni a una casilla ya pisada; la
// última columna entera es la guarida del jefe. El generador garantiza que con esas reglas NUNCA te quedes
// atorado (ensureNoTraps + repairDeadEnds).
// ============================================================

object NodeType {
    const val EMPTY = "empty"
    const val ENEMY = "enemy"
    const val ELITE = "elite"
    const val REST = "rest"
    const val TREASURE = "treasure"
    const val SHOP = "shop"
    const val MYSTERY = "mystery"
    const val GAME = "game"
    const val GIFT = "gift" // ya no se genera; solo existe para leer partidas viejas
    const val KEY = "key"
    const val VAULT = "vault"
    const val BLOCKED = "blocked"
    const val BOSS = "boss"
}

/** Forma de mapa: cuántos muros y ríos hay, para que cada piso se sienta distinto. */
class MapVariant(val label: String, val wallV: Double, val wallH: Double, val rivers: Int, val weight: Int)

class River(val col: Int, val bridge: Int)

class MapData(
    val grid: Array<Array<String>>,
    /** wallsV[y][x] = true → muro entre (x,y) y (x+1,y) */
    val wallsV: Array<BooleanArray>,
    /** wallsH[y][x] = true → muro entre (x,y) y (x,y+1) */
    val wallsH: Array<BooleanArray>,
    val bossY: Int
) {
    var rivers: List<River> = emptyList()
    var cols = 0
    var rows = 0
    var variant = "classic"
    var seed = 0
    // lo que el flujo de partida le pega al mapa de un piso (no lo usa el generador)
    var themeId = ""
    var bossId = ""
    /** Resultado del dado del destino antes del jefe (null = aún no se tira). */
    var fate: Int? = null
}

object MapGen {
    const val MAP_COLS = 12
    const val MAP_ROWS = 7

    val variants: Map<String, MapVariant> = linkedMapOf(
        "classic" to MapVariant("Clásico", 0.4, 0.45, 1, 4),
        "open" to MapVariant("Despejado", 0.22, 0.28, 1, 2),
        "maze" to MapVariant("Laberinto", 0.5, 0.55, 0, 2),
        "rivers" to MapVariant("De ríos", 0.35, 0.4, 2, 2)
    )

    fun pickVariant(preferred: String?): String {
        if (preferred != null && variants.containsKey(preferred) && Rng.next() < 0.6) return preferred
        var r = Rng.next() * variants.values.sumOf { it.weight }
        for ((k, v) in variants) { r -= v.weight; if (r <= 0) return k }
        return "classic"
    }

    private fun dims(wallsV: Array<BooleanArray>?, grid: Array<Array<String>>?): Pair<Int, Int> {
        if (wallsV != null && wallsV.isNotEmpty()) return Pair(wallsV.size, wallsV[0].size + 1) // (filas, columnas)
        if (grid != null && grid.isNotEmpty()) return Pair(grid.size, grid[0].size)
        return Pair(MAP_ROWS, MAP_COLS)
    }

    /** ¿Se puede pasar de (x,y) a (nx,ny)? Solo adelante, arriba o abajo, sin muro ni árbol en medio. */
    fun canStep(map: MapData, grid: Array<Array<String>>?, x: Int, y: Int, nx: Int, ny: Int): Boolean =
        canStep(map.wallsV, map.wallsH, grid, x, y, nx, ny)

    fun canStep(wallsV: Array<BooleanArray>, wallsH: Array<BooleanArray>, grid: Array<Array<String>>?, x: Int, y: Int, nx: Int, ny: Int): Boolean {
        val (rows, cols) = dims(wallsV, grid)
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false
        if (grid != null && ny < grid.size && nx < grid[ny].size && grid[ny][nx] == NodeType.BLOCKED) return false
        if (nx == x + 1 && ny == y) return !wallsV[y][x]      // adelante
        if (nx == x && ny == y - 1) return !wallsH[ny][x]     // arriba
        if (nx == x && ny == y + 1) return !wallsH[y][x]      // abajo
        return false                                          // atrás / diagonal: prohibido
    }

    /** Movimiento completo: muros + casillas pisadas + última columna hacia el jefe. */
    fun canMove(map: MapData, visited: Set<String>, x: Int, y: Int, nx: Int, ny: Int): Boolean {
        if (x == dims(map.wallsV, map.grid).second - 1) return false // ya estás en la guarida
        if (!canStep(map, map.grid, x, y, nx, ny)) return false
        return !visited.contains("$nx,$ny")
    }

    /** Abre los muros necesarios para que no existan trampas. Sirve también para arreglar mapas guardados viejos. */
    fun ensureNoTraps(map: MapData, grid: Array<Array<String>>?): MapData {
        val (rows, cols) = dims(map.wallsV, grid)
        val wallsV = map.wallsV
        val wallsH = map.wallsH
        fun blocked(x: Int, y: Int) = grid != null && y in grid.indices && x in grid[y].indices && grid[y][x] == NodeType.BLOCKED
        // última columna: pasillo abierto hasta el jefe
        for (y in 0 until rows - 1) wallsH[y][cols - 1] = false
        // en cada columna, los extremos de cada tramo vertical tienen salida
        for (x in 0 until cols - 1) {
            var top = -1
            for (y in 0 until rows) {
                if (blocked(x, y)) { top = -1; continue }
                if (top == -1) top = y
                val endOfRun = y == rows - 1 || wallsH[y][x] || blocked(x, y + 1)
                if (!endOfRun) continue
                // la salida forzada tiene que caer en una casilla pisable: si un árbol quedó justo enfrente del
                // extremo, se quita ese árbol
                if (grid != null && blocked(x + 1, top)) grid[top][x + 1] = NodeType.EMPTY
                if (grid != null && blocked(x + 1, y)) grid[y][x + 1] = NodeType.EMPTY
                wallsV[top][x] = false
                wallsV[y][x] = false
                top = -1
            }
        }
        return map
    }

    // ---------- contenido de las casillas ----------
    private fun fillContent(grid: Array<Array<String>>, elites: Int, games: Int, cols: Int, rows: Int) {
        fun rnd(n: Int) = Rng.int(n)
        fun range(a: Int, b: Int): List<Int> = if (b < a) emptyList() else (a..b).toList()
        val scale = (cols * rows) / 84.0
        fun count(base: Double, min: Int = 1): Int = max(min, jsRound(base * scale))
        fun touches(x: Int, y: Int, type: String): Boolean =
            listOf(1 to 0, -1 to 0, 0 to 1, 0 to -1).any { (dx, dy) ->
                val yy = y + dy
                val xx = x + dx
                yy in grid.indices && xx in grid[yy].indices && grid[yy][xx] == type
            }
        fun place(type: String, n: Int, xs: List<Int>, maxPerCol: Int = 0) {
            if (xs.isEmpty()) return
            val perCol = HashMap<Int, Int>()
            var guard = 0
            var placed = 0
            while (placed < n && guard < 600) {
                guard++
                val x = xs[rnd(xs.size)]
                val y = rnd(rows)
                if (grid[y][x] != NodeType.EMPTY || touches(x, y, type)) continue
                if (maxPerCol != 0 && (perCol[x] ?: 0) >= maxPerCol) continue
                grid[y][x] = type
                perCol[x] = (perCol[x] ?: 0) + 1
                placed++
            }
        }
        val mid = cols / 2 - 1       // columna del tesoro
        val preBoss = cols - 2       // columna de campamentos antes del jefe

        // 1) antes del jefe: una fila de campamentos y una tiendita
        range(0, rows - 1).forEach { y -> grid[y][preBoss] = if (y % 2 == 0) NodeType.REST else NodeType.EMPTY }
        grid[1 + rnd(rows - 2)][preBoss] = NodeType.SHOP
        // 2) a mitad de camino: uno o dos tesoros (pocos: los objetos se ganan peleando)
        place(NodeType.TREASURE, count(1.5, 1), range(max(1, mid - 1), mid + 1), 1)
        // 3) cupos repartidos
        val eliteScale = max(0.7, min(1.4, scale))
        place(NodeType.ELITE, max(2, jsRound(elites * eliteScale)), range(4, preBoss - 1), 1)
        place(NodeType.SHOP, count(2.0), range(3, preBoss - 2), 1)
        place(NodeType.REST, count(3.0, 2), range(3, preBoss - 1), 1)
        place(NodeType.MYSTERY, count(15.0, 8), range(1, preBoss - 1), 2)
        place(NodeType.GAME, games, range(2, preBoss - 1), 1)
        // la llave siempre en la primera mitad del camino, el cofre en la segunda
        place(NodeType.KEY, 1, range(1, mid), 1)
        place(NodeType.VAULT, 1, range(mid + 1, preBoss - 1), 1)
        // árboles/obstáculos: bloquean la casilla entera (no solo un borde)
        place(NodeType.BLOCKED, count(3.0, 2), range(1, preBoss - 1), 1)
        // 4) relleno: enemigos, evitando amontonarse entre ellos
        for (x in 1 until preBoss) {
            for (y in 0 until rows) {
                if (grid[y][x] != NodeType.EMPTY) continue
                var chance = if (x <= 2) 0.42 else 0.3
                if (touches(x, y, NodeType.ENEMY)) chance *= 0.35
                if (Rng.next() < chance) grid[y][x] = NodeType.ENEMY
            }
        }
        // 5) de lo que sigue vacío, buena parte también se vuelve misterio
        for (x in 1 until preBoss) {
            for (y in 0 until rows) {
                if (grid[y][x] != NodeType.EMPTY || touches(x, y, NodeType.MYSTERY)) continue
                if (Rng.next() < 0.4) grid[y][x] = NodeType.MYSTERY
            }
        }
    }

    /**
     * Simula el recorrido real (adelante/arriba/abajo, nunca atrás, nunca revisitar) y repara cualquier callejón
     * sin salida que sobreviva a ensureNoTraps. La única reparación es ABRIR la salida hacia adelante.
     */
    private fun repairDeadEnds(map: MapData, grid: Array<Array<String>>, startY: Int, rivers: List<River>): Boolean {
        val (_, cols) = dims(map.wallsV, grid)
        val wallsV = map.wallsV
        fun isLockedRiverRow(x: Int, y: Int) = rivers.any { it.col == x && it.bridge != y }
        for (guard in 0 until 600) {
            val seen = HashSet<String>()
            val stack = ArrayList<IntArray>()
            stack.add(intArrayOf(0, startY, 0))
            var deadEnd: IntArray? = null
            while (stack.isNotEmpty()) {
                val s = stack.removeAt(stack.size - 1)
                val x = s[0]
                val y = s[1]
                val dir = s[2]
                if (!seen.add("$x,$y,$dir")) continue
                if (x == cols - 1) continue // llegó a la guarida del jefe: recorrido completo
                val moves = ArrayList<IntArray>()
                if (canStep(map, grid, x, y, x + 1, y)) moves.add(intArrayOf(x + 1, y, 0))
                if (dir <= 0 && canStep(map, grid, x, y, x, y - 1)) moves.add(intArrayOf(x, y - 1, -1))
                if (dir >= 0 && canStep(map, grid, x, y, x, y + 1)) moves.add(intArrayOf(x, y + 1, 1))
                if (moves.isEmpty()) { deadEnd = intArrayOf(x, y); break }
                moves.forEach { stack.add(it) }
            }
            if (deadEnd == null) return true // todo recorrido posible llega a la guarida del jefe
            val x = deadEnd[0]
            val y = deadEnd[1]
            if (x < cols - 1 && !isLockedRiverRow(x, y) && grid[y][x + 1] != NodeType.BLOCKED) {
                wallsV[y][x] = false
                continue
            }
            return false // no se puede abrir sin romper un río o topar con un árbol
        }
        return false
    }

    /** Genera el mapa de un piso. startY: fila de la casilla de salida (columna 0). */
    fun generate(startY: Int, elites: Int = 3, cols: Int = MAP_COLS, rows: Int = MAP_ROWS, variant: String = "classic", games: Int = 1): MapData {
        val v = variants[variant] ?: variants.getValue("classic")
        val bossY = Rng.int(rows)

        val grid = Array(rows) { Array(cols) { NodeType.EMPTY } }
        fillContent(grid, elites, games, cols, rows)
        // la última columna entera es la guarida del jefe
        for (y in 0 until rows) grid[y][cols - 1] = NodeType.BOSS

        // --- ríos: columnas que solo se cruzan por un puente ---
        val preBoss = cols - 2
        val mid = cols / 2 - 1
        val candidates = ArrayList<Int>()
        for (x in 2..(preBoss - 2)) if (x < mid - 1 || x > mid + 1) candidates.add(x)
        val rivers = ArrayList<River>()
        var k = 0
        while (k < v.rivers && candidates.isNotEmpty()) {
            // los ríos van separados (mínimo 3 columnas) para que sus orillas no se pisen
            val free = candidates.filter { c -> rivers.all { abs(it.col - c) >= 3 } }
            if (free.isEmpty()) break
            val col = free[Rng.int(free.size)]
            val bridge = Rng.int(rows)
            rivers.add(River(col, bridge))
            k++
        }
        // ni la columna del río ni la de aterrizaje pueden tener un árbol
        rivers.forEach { r ->
            for (y in 0 until rows) {
                if (grid[y][r.col] == NodeType.BLOCKED) grid[y][r.col] = NodeType.EMPTY
                if (grid[y][r.col + 1] == NodeType.BLOCKED) grid[y][r.col + 1] = NodeType.EMPTY
            }
        }
        // Dos árboles en diagonal pueden "pinzar" la casilla de en medio y dejarla sin entrada: se quita uno.
        for (y in 0 until rows) {
            for (x in 1 until cols - 1) {
                if (grid[y][x] == NodeType.BLOCKED) continue
                val around = listOf(x - 1 to y, x to y - 1, x to y + 1).filter { (_, cy) -> cy in 0 until rows }
                if (around.any { (cx, cy) -> grid[cy][cx] != NodeType.BLOCKED }) continue
                val toClear = around.firstOrNull { (cx, cy) -> grid[cy][cx] == NodeType.BLOCKED }
                if (toClear != null) grid[toClear.second][toClear.first] = NodeType.EMPTY
            }
        }
        var blockedCount = 0
        for (y in 0 until rows) for (x in 0 until cols) if (grid[y][x] == NodeType.BLOCKED) blockedCount++

        // --- muros al azar ---
        val wallsV = Array(rows) { BooleanArray(cols - 1) { Rng.next() < v.wallV } }
        val wallsH = Array(rows - 1) { BooleanArray(cols) { Rng.next() < v.wallH } }
        val map = MapData(grid, wallsV, wallsH, bossY)

        // toda la columna del río Y la de aterrizaje quedan como un solo tramo; solo el puente cruza
        rivers.forEach { r ->
            for (y in 0 until rows - 1) { wallsH[y][r.col] = false; wallsH[y][r.col + 1] = false }
            for (y in 0 until rows) wallsV[y][r.col] = (y != r.bridge)
        }

        fun key(x: Int, y: Int) = "$x,$y"
        fun reachFromStart(): Set<String> {
            val seen = HashSet<String>()
            seen.add(key(0, startY))
            val stack = ArrayList<IntArray>()
            stack.add(intArrayOf(0, startY))
            while (stack.isNotEmpty()) {
                val s = stack.removeAt(stack.size - 1)
                val x = s[0]
                val y = s[1]
                for ((nx, ny) in listOf(x + 1 to y, x to y - 1, x to y + 1)) {
                    if (canStep(map, grid, x, y, nx, ny) && !seen.contains(key(nx, ny))) { seen.add(key(nx, ny)); stack.add(intArrayOf(nx, ny)) }
                }
            }
            return seen
        }
        fun openWall(x: Int, y: Int, nx: Int, ny: Int) {
            if (nx == x + 1) wallsV[y][x] = false
            else if (ny == y - 1) wallsH[ny][x] = false
            else wallsH[y][x] = false
        }

        // Quitar muros hasta que no haya zonas encerradas: toda casilla que no esté bloqueada se puede alcanzar
        // desde el inicio. El cruce de un río nunca se destapa aquí: el único paso permitido es el puente.
        fun entrances(x: Int, y: Int) = listOf(x - 1 to y, x to y - 1, x to y + 1).filter { (px, py) -> px >= 0 && py >= 0 && py < rows }
        fun isRiverCross(px: Int, py: Int, x: Int, y: Int) = rivers.any { px == it.col && x == it.col + 1 && py == y && y != it.bridge }
        val targetReach = cols * rows - blockedCount
        for (guard in 0 until 2000) {
            val reach = reachFromStart()
            if (reach.size >= targetReach) break
            val frontier = ArrayList<IntArray>()
            for (x in 0 until cols) {
                for (y in 0 until rows) {
                    if (grid[y][x] == NodeType.BLOCKED || reach.contains(key(x, y))) continue
                    entrances(x, y).forEach { (px, py) ->
                        if (py in grid.indices && px in grid[py].indices && grid[py][px] == NodeType.BLOCKED) return@forEach
                        if (isRiverCross(px, py, x, y)) return@forEach
                        if (reach.contains(key(px, py))) frontier.add(intArrayOf(px, py, x, y))
                    }
                }
            }
            if (frontier.isEmpty()) break
            val f = frontier[Rng.int(frontier.size)]
            openWall(f[0], f[1], f[2], f[3])
        }

        // Sin trampas con la regla de "no volver a pisar" (a propósito NO se vuelve a forzar el río después)
        ensureNoTraps(map, grid)
        // última pasada de seguridad: simula el recorrido real y repara cualquier callejón que se haya escapado
        repairDeadEnds(map, grid, startY, rivers)
        map.rivers = rivers
        map.cols = cols
        map.rows = rows
        map.variant = variant
        map.seed = Rng.int(1_000_000_000)
        return map
    }

    /** Comprueba que desde el inicio se llega a la guarida del jefe y que ningún recorrido termina en un callejón. */
    fun isSound(map: MapData, startY: Int): Pair<Boolean, IntArray?> {
        val (_, cols) = dims(map.wallsV, map.grid)
        val seen = HashSet<String>()
        val stack = ArrayList<IntArray>()
        stack.add(intArrayOf(0, startY, 0))
        var reachedBoss = false
        while (stack.isNotEmpty()) {
            val s = stack.removeAt(stack.size - 1)
            val x = s[0]
            val y = s[1]
            val dir = s[2]
            if (!seen.add("$x,$y,$dir")) continue
            if (x == cols - 1) { reachedBoss = true; continue }
            val moves = ArrayList<IntArray>()
            if (canStep(map, map.grid, x, y, x + 1, y)) moves.add(intArrayOf(x + 1, y, 0))
            if (dir <= 0 && canStep(map, map.grid, x, y, x, y - 1)) moves.add(intArrayOf(x, y - 1, -1))
            if (dir >= 0 && canStep(map, map.grid, x, y, x, y + 1)) moves.add(intArrayOf(x, y + 1, 1))
            if (moves.isEmpty()) return Pair(false, intArrayOf(x, y))
            moves.forEach { stack.add(it) }
        }
        return Pair(reachedBoss, null)
    }
}
