package com.yokyznt.fruitspire.core

import kotlin.math.max

// ============================================================
// Reglas puras de las mesas de juego (la parte `MG` de js/minigames.js): manos de póker, ajedrez chiquito con su rival,
// y los pagos de las máquinas. Sin pantallas: la mesa en curso vive en Table.kt.
// ============================================================

/** Lo que apuestas en la ruleta: rojo, negro (×2) o un número exacto del 1 al 12 (×10). */
sealed class RoulettePick {
    object Red : RoulettePick()
    object Black : RoulettePick()
    data class Number(val n: Int) : RoulettePick()
}

/** Cómo se presenta cada mesa: nombre, dibujo, reglas y el crupier que la atiende. */
class TableKind(val id: String, val name: String, val icon: String, val sprite: String, val rules: String, val dealer: String)

object Casino {
    val KINDS: Map<String, TableKind> = listOf(
        TableKind("dice", "Veintiuno de Dados", "🎲", "act_dados", "Suma dados sin pasarte de 21. La casa tira hasta 17. Un 21 exacto paga triple.", "cubilete_maldito"),
        TableKind("poker", "Póker de Cinco Cartas", "🃏", "act_poker", "Cambia las cartas que quieras, una sola vez. Gana la mejor mano; trío o mejor paga doble.", "crupier_marcado"),
        TableKind("chess", "Torre de Ajedrez", "♟️", "act_ajedrez", "Sin jaque: cómete TODAS las piezas rivales. Ganas oro (a veces un objeto); si pierdes, pierdes vida.", "gran_maestro"),
        TableKind("slots", "Tragamonedas", "🎰", "tragamonedas", "3 iguales pagan ×5 (3 Reyes ×10). 2 iguales, ×1.5.", "rey_azar"),
        TableKind("roulette", "Ruleta", "🎡", "ruleta_fortuna", "Rojo o negro paga ×2. Un número exacto, ×10. El 0 es de la casa.", "dama_suerte")
    ).associateBy { it.id }

    // =========================================================
    // PÓKER — cartas y manos
    // =========================================================
    /** Palos: 0 ♠, 1 ♥, 2 ♦, 3 ♣. Rango: 2 a 10, 11 J, 12 Q, 13 K, 14 A. [fresh]: carta recién cambiada. */
    data class Card(val r: Int, val s: Int, val fresh: Boolean = false)

    val HAND_NAMES = listOf("Carta alta", "Par", "Doble par", "Trío", "Escalera", "Color", "Full", "Póker", "Escalera de color")

    /** [rank] 0 a 8 y los desempates en orden. */
    class Hand(val rank: Int, val tb: List<Int>)

    fun newDeck(): MutableList<Card> {
        val d = ArrayList<Card>()
        for (s in 0 until 4) for (r in 2..14) d.add(Card(r, s))
        return Rng.shuffle(d)
    }

    fun evalHand(cards: List<Card>): Hand {
        val counts = HashMap<Int, Int>()
        cards.forEach { counts[it.r] = (counts[it.r] ?: 0) + 1 }
        val groups = counts.map { (r, n) -> n to r }.sortedWith(compareByDescending<Pair<Int, Int>> { it.first }.thenByDescending { it.second })
        val desc = cards.map { it.r }.sortedDescending()
        val flush = cards.all { it.s == cards[0].s }
        var straight = false
        var high = desc[0]
        if (desc.toSet().size == 5) {
            if (desc[0] - desc[4] == 4) straight = true
            else if (desc[0] == 14 && desc[1] == 5 && desc[4] == 2) { straight = true; high = 5 } // A-2-3-4-5
        }
        val byGroups = groups.map { it.second }
        return when {
            straight && flush -> Hand(8, listOf(high))
            groups[0].first == 4 -> Hand(7, byGroups)
            groups[0].first == 3 && groups[1].first == 2 -> Hand(6, byGroups)
            flush -> Hand(5, desc)
            straight -> Hand(4, listOf(high))
            groups[0].first == 3 -> Hand(3, byGroups)
            groups[0].first == 2 && groups[1].first == 2 -> Hand(2, byGroups)
            groups[0].first == 2 -> Hand(1, byGroups)
            else -> Hand(0, desc)
        }
    }

    /** 1 si gana [a], -1 si gana [b], 0 si empatan. */
    fun compareHands(a: Hand, b: Hand): Int {
        if (a.rank != b.rank) return if (a.rank > b.rank) 1 else -1
        for (i in 0 until max(a.tb.size, b.tb.size)) {
            val x = a.tb.getOrElse(i) { 0 }
            val y = b.tb.getOrElse(i) { 0 }
            if (x != y) return if (x > y) 1 else -1
        }
        return 0
    }

    /**
     * Qué cartas (posiciones) cambia la casa: se queda con lo que forma pares, tríos o póker; si no tiene nada, con sus 2 cartas
     * más altas (y con cuatro del mismo palo, con esas cuatro). Con escalera o mejor se planta.
     */
    fun houseDiscards(cards: List<Card>): List<Int> {
        val counts = HashMap<Int, Int>()
        cards.forEach { counts[it.r] = (counts[it.r] ?: 0) + 1 }
        if (evalHand(cards).rank >= 4) return emptyList()
        val all = cards.indices.toList()
        val keepMulti = all.filter { (counts[cards[it].r] ?: 0) > 1 }
        if (keepMulti.isNotEmpty()) return all.filter { it !in keepMulti }
        val four = (0 until 4).map { s -> all.filter { cards[it].s == s } }.firstOrNull { it.size == 4 }
        if (four != null) return all.filter { it !in four }
        val keep = all.sortedByDescending { cards[it].r }.take(2)
        return all.filter { it !in keep }
    }

    // =========================================================
    // AJEDREZ CHIQUITO — tablero de 5 columnas × 6 filas
    //   Tú (fruta, lado 0) abajo, moviendo hacia arriba; el rival (lado 1) arriba.
    //   No hay jaque: gana quien se coma TODAS las piezas del otro.
    //   Peón: 1 casilla adelante, come en diagonal, se corona reina al llegar al fondo.
    // =========================================================
    const val COLS = 5
    const val ROWS = 6

    /** [t]: P peón, N caballo, B alfil, R torre, Q reina, K rey. [c]: 0 tuyas, 1 del rival. */
    class Piece(val t: Char, val c: Int)

    data class Cell(val r: Int, val c: Int)
    data class Move(val fr: Int, val fc: Int, val tr: Int, val tc: Int)
    class Applied(val board: Array<Array<Piece?>>, val captured: Piece?, val promoted: Boolean)

    val VALUE = mapOf('P' to 100, 'N' to 300, 'B' to 320, 'R' to 500, 'Q' to 900, 'K' to 400)
    private val KNIGHT = listOf(-2 to -1, -2 to 1, -1 to -2, -1 to 2, 1 to -2, 1 to 2, 2 to -1, 2 to 1)
    private val KING = listOf(-1 to -1, -1 to 0, -1 to 1, 0 to -1, 0 to 1, 1 to -1, 1 to 0, 1 to 1)
    private val DIAG = listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1)
    private val ORTHO = listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)

    fun newBoard(): Array<Array<Piece?>> {
        val b = Array(ROWS) { arrayOfNulls<Piece>(COLS) }
        "RNBQK".forEachIndexed { c, t -> b[0][c] = Piece(t, 1); b[ROWS - 1][c] = Piece(t, 0) }
        for (c in 0 until COLS) { b[1][c] = Piece('P', 1); b[ROWS - 2][c] = Piece('P', 0) }
        return b
    }

    private fun inside(r: Int, c: Int) = r in 0 until ROWS && c in 0 until COLS

    /** Destinos posibles de la pieza que está en ([r], [c]). */
    fun movesFor(b: Array<Array<Piece?>>, r: Int, c: Int): List<Cell> {
        val p = b[r][c] ?: return emptyList()
        val out = ArrayList<Cell>()
        fun add(nr: Int, nc: Int) { if (inside(nr, nc) && (b[nr][nc] == null || b[nr][nc]!!.c != p.c)) out.add(Cell(nr, nc)) }
        fun slide(dirs: List<Pair<Int, Int>>) {
            for ((dr, dc) in dirs) {
                var nr = r + dr; var nc = c + dc
                while (inside(nr, nc)) {
                    val q = b[nr][nc]
                    if (q != null) { if (q.c != p.c) out.add(Cell(nr, nc)); break }
                    out.add(Cell(nr, nc))
                    nr += dr; nc += dc
                }
            }
        }
        when (p.t) {
            'P' -> {
                val dr = if (p.c == 0) -1 else 1
                if (inside(r + dr, c) && b[r + dr][c] == null) out.add(Cell(r + dr, c))
                for (dc in listOf(-1, 1)) if (inside(r + dr, c + dc) && b[r + dr][c + dc] != null && b[r + dr][c + dc]!!.c != p.c) out.add(Cell(r + dr, c + dc))
            }
            'N' -> KNIGHT.forEach { (dr, dc) -> add(r + dr, c + dc) }
            'K' -> KING.forEach { (dr, dc) -> add(r + dr, c + dc) }
            'B' -> slide(DIAG)
            'R' -> slide(ORTHO)
            'Q' -> slide(DIAG + ORTHO)
        }
        return out
    }

    fun allMoves(b: Array<Array<Piece?>>, side: Int): List<Move> {
        val out = ArrayList<Move>()
        for (r in 0 until ROWS) for (c in 0 until COLS) {
            val p = b[r][c]
            if (p != null && p.c == side) movesFor(b, r, c).forEach { out.add(Move(r, c, it.r, it.c)) }
        }
        return out
    }

    /** Juega la jugada sin tocar el tablero original. */
    fun applyMove(b: Array<Array<Piece?>>, m: Move): Applied {
        val nb = Array(ROWS) { r -> b[r].copyOf() }
        val piece = nb[m.fr][m.fc]!!
        val captured = nb[m.tr][m.tc]
        nb[m.fr][m.fc] = null
        val promote = piece.t == 'P' && ((piece.c == 0 && m.tr == 0) || (piece.c == 1 && m.tr == ROWS - 1))
        nb[m.tr][m.tc] = if (promote) Piece('Q', piece.c) else piece
        return Applied(nb, captured, promote)
    }

    fun countPieces(b: Array<Array<Piece?>>, side: Int): Int = b.sumOf { row -> row.count { it != null && it.c == side } }

    fun material(b: Array<Array<Piece?>>, side: Int): Int = b.sumOf { row -> row.filter { it != null && it.c == side }.sumOf { VALUE.getValue(it!!.t) } }

    private const val INF = 1_000_000

    /** Evaluación desde el punto de vista del rival (lado 1): material, avance de peones y un poco de centro. */
    private fun evaluate(b: Array<Array<Piece?>>): Int {
        var score = 0
        for (r in 0 until ROWS) for (c in 0 until COLS) {
            val p = b[r][c] ?: continue
            var v = VALUE.getValue(p.t)
            if (p.t == 'P') v += (if (p.c == 1) r else ROWS - 1 - r) * 8
            if (c == 2 && p.t != 'K') v += 6
            score += if (p.c == 1) v else -v
        }
        return score
    }

    /** Negamax con poda: [side] es quien mueve (1 = rival). Devuelve la evaluación para [side]. */
    private fun search(b: Array<Array<Piece?>>, side: Int, depth: Int, alpha0: Int, beta: Int): Int {
        var alpha = alpha0
        val mine = countPieces(b, side)
        val theirs = countPieces(b, 1 - side)
        if (theirs == 0) return 100000 + depth // se comió todo: ganó
        if (mine == 0) return -100000 - depth
        if (depth == 0) return if (side == 1) evaluate(b) else -evaluate(b)
        val moves = allMoves(b, side)
        if (moves.isEmpty()) return if (side == 1) evaluate(b) else -evaluate(b) // sin movimientos: pasa
        // primero las capturas (mejor poda)
        val ordered = moves.sortedByDescending { b[it.tr][it.tc]?.let { q -> VALUE.getValue(q.t) } ?: 0 }
        var best = -INF
        for (m in ordered) {
            val score = -search(applyMove(b, m).board, 1 - side, depth - 1, -beta, -alpha)
            if (score > best) best = score
            if (best > alpha) alpha = best
            if (alpha >= beta) break
        }
        return best
    }

    /** Jugada del rival. [depth]: cuántas jugadas piensa por adelantado; [sloppy]: probabilidad de jugar al azar. Null si no puede mover. */
    fun chooseEnemyMove(b: Array<Array<Piece?>>, depth: Int, sloppy: Double): Move? {
        val moves = allMoves(b, 1)
        if (moves.isEmpty()) return null
        if (Rng.next() < sloppy) return Rng.pick(moves)
        var best = Double.NEGATIVE_INFINITY
        var bestMoves = ArrayList<Move>()
        for (m in moves) {
            val score = -search(applyMove(b, m).board, 0, max(0, depth - 1), -INF, INF) + Rng.next() * 4
            if (score > best + 1e-9) { best = score; bestMoves = arrayListOf(m) } else if (Math.abs(score - best) < 1e-9) bestMoves.add(m)
        }
        return Rng.pick(bestMoves)
    }

    // =========================================================
    // TRAGAMONEDAS y RULETA — reglas de pago
    // =========================================================
    val SLOT_SYMBOLS = listOf("manzana", "platanin", "kiwi", "uva", "ui_coin", "rey_fruta")

    /** Multiplicador de la apuesta: 3 iguales ×5 (3 Reyes ×10), 2 iguales ×1.5, nada ×0. */
    fun slotPayout(r: List<String>): Double {
        if (r[0] == r[1] && r[1] == r[2]) return if (r[0] == "rey_fruta") 10.0 else 5.0
        return if (r[0] == r[1] || r[1] == r[2] || r[0] == r[2]) 1.5 else 0.0
    }

    /** El 0 es verde; del 1 al 12, rojo y negro alternados. */
    const val ROULETTE_N = 13

    fun rouletteColor(n: Int): String = if (n == 0) "green" else if (n % 2 == 1) "red" else "black"

    fun roulettePayout(pick: RoulettePick, n: Int): Int = when (pick) {
        is RoulettePick.Number -> if (pick.n == n) 10 else 0
        RoulettePick.Red -> if (rouletteColor(n) == "red") 2 else 0
        RoulettePick.Black -> if (rouletteColor(n) == "black") 2 else 0
    }
}
