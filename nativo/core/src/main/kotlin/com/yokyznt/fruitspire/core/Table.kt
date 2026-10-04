package com.yokyznt.fruitspire.core

import kotlin.math.floor
import kotlin.math.max

// ============================================================
// Una mesa de juego en curso (la parte de estado y flujo de js/minigames.js). No sabe de tiempos ni de animaciones: la interfaz
// espera lo que quiera entre una llamada y otra. Cada juego pasa por las fases:
//   intro  → reglas y apuesta
//   play   → te toca
//   house  → (dados) le toca a la casa
//   result → ya hay ganador; el oro y el objeto salen como premios por recoger
// ============================================================

class Table internal constructor(val kind: String, private val run: Run) {
    var phase = "intro"
        private set
    /** Oro apostado (ya pagado al empezar). */
    var bet = 0
        private set
    /** Juego libre: sin apuesta; si ganas, la casa te da 8 de oro. */
    var free = false
        private set
    /** win | lose | draw (solo en la fase result). */
    var outcome = ""
        private set
    var text = ""
        private set
    private var say = ""

    private companion object {
        val LINES = mapOf(
            "start" to listOf("¿Te atreves?", "Hagan sus apuestas.", "A ver esa suerte."),
            "hot" to listOf("Uy… ¿otra más?", "Yo que tú me plantaba.", "Qué nervios, ¿no?"),
            "house" to listOf("Mi turno.", "Ahora va la casa."),
            "win" to listOf("Suerte de principiante…", "¡Bah! Llévatelo.", "No vuelvas pronto."),
            "lose" to listOf("La casa siempre gana.", "Gracias por tu oro.", "Otra vez será."),
            "draw" to listOf("Empate. Nadie pierde.")
        )
        const val FREE_WIN = 8
    }

    private fun say(key: String) { say = Rng.pick(LINES.getValue(key)) }

    /** Lo que dice el crupier (en el ajedrez cambia con el turno). */
    val dealerLine: String
        get() = if (kind == "chess" && phase == "play") (if (turn == "player") "Tu jugada." else "Hmm…") else say.ifEmpty { "…" }

    private val p get() = run.player

    /** Paga la apuesta y empieza. Falso si ya empezó o no te alcanza el oro. */
    fun start(wanted: Int): Boolean {
        if (phase != "intro") return false
        val b = if (kind == "chess") 0 else wanted
        if (b < 0 || b > p.gold) return false
        bet = b
        free = kind != "chess" && b == 0
        p.gold -= b // la apuesta se paga al empezar (si sales a media partida, la pierdes)
        say("start")
        when (kind) {
            "poker" -> startPoker()
            "slots" -> { phase = "play"; reels = List(3) { Rng.pick(Casino.SLOT_SYMBOLS) } }
            "chess" -> startChess()
            else -> phase = "play"
        }
        return true
    }

    /** Termina la partida: aplica el oro, el objeto o la vida, y deja el texto del resultado. */
    private fun finish(result: String, msg: String, gold: Int = 0, relic: Boolean = false, hp: Int = 0) {
        phase = "result"
        outcome = result
        var out = msg
        run.loot.clear()
        run.withLootCapture {
            if (gold > 0) p.gold += gold
            if (relic) out += " ${EventHelpers(run).grantRandomRelic()}"
        }
        if (hp > 0) { p.hp = max(1, p.hp - hp); out += " Pierdes $hp ❤️." }
        if (result == "win" && run.gainPassXp(15).levels > 0) out += " ¡Subes de nivel en el Pase de Batalla!"
        text = out
        say(result)
    }

    /** Lo que paga la apuesta por un multiplicador (en juego libre, solo 8 de oro si se gana). */
    private fun payout(mult: Double): Int = if (free) (if (mult > 0) FREE_WIN else 0) else floor(bet * mult).toInt()

    // ---------------------------------------------------------------- dados
    val dicePlayer = ArrayList<Int>()
    val diceHouse = ArrayList<Int>()

    /** Tira un dado tuyo. Devuelve lo que salió (0 si no es tu turno). Con más de 21 pierdes; con 21 exactos le toca a la casa. */
    fun diceRoll(): Int {
        if (kind != "dice" || phase != "play") return 0
        val v = 1 + Rng.int(6)
        dicePlayer.add(v)
        val total = dicePlayer.sum()
        if (total in 17..20) say("hot")
        if (total > 21) finish("lose", "¡Te pasaste con $total!")
        else if (total == 21) startHouse()
        return v
    }

    /** Te plantas (hace falta haber tirado al menos un dado). */
    fun diceStand(): Boolean {
        if (kind != "dice" || phase != "play" || dicePlayer.isEmpty()) return false
        startHouse()
        return true
    }

    private fun startHouse() { phase = "house"; say("house") }

    /** La casa tira hasta sumar 17 o más. */
    fun houseNeedsRoll(): Boolean = diceHouse.sum() < 17

    fun houseRoll(): Int {
        if (kind != "dice" || phase != "house") return 0
        val v = 1 + Rng.int(6)
        diceHouse.add(v)
        return v
    }

    /** Ya tiró la casa: se compara y se paga. */
    fun diceSettle() {
        if (kind != "dice" || phase == "intro" || phase == "result") return
        val ps = dicePlayer.sum()
        val hs = diceHouse.sum()
        val mult = if (ps == 21 && !free) 3.0 else 2.0
        when {
            hs > 21 -> finish("win", "¡La casa se pasó con $hs! Ganas.", gold = payout(mult))
            ps > hs -> finish("win", if (ps == 21) "¡VEINTIUNO EXACTO! Paga triple." else "¡$ps contra $hs! Ganas.", gold = payout(mult))
            ps == hs -> finish("draw", "Empate a $ps. Te devuelven tu apuesta.", gold = bet)
            else -> finish("lose", "La casa gana con $hs contra tus $ps.")
        }
    }

    // ---------------------------------------------------------------- póker
    var deck: MutableList<Casino.Card> = ArrayList()
    var player: MutableList<Casino.Card> = ArrayList()
    var house: MutableList<Casino.Card> = ArrayList()
    /** Posiciones de tus cartas marcadas para cambiar. */
    val selected = LinkedHashSet<Int>()

    private fun deal(n: Int): MutableList<Casino.Card> = MutableList(n) { deck.removeAt(0) }

    private fun startPoker() {
        deck = Casino.newDeck()
        player = deal(5)
        player.sortBy { it.r }
        house = deal(5)
        selected.clear()
        phase = "play"
    }

    fun pokerToggle(i: Int) {
        if (kind != "poker" || phase != "play" || i !in player.indices) return
        if (!selected.remove(i)) selected.add(i)
    }

    /** Cambia las cartas marcadas, la casa cambia las suyas y se comparan las manos. */
    fun pokerShow() {
        if (kind != "poker" || phase != "play") return
        // las cartas nuevas se marcan; la selección se vacía (al reordenar, sus posiciones ya no valen)
        selected.forEach { i -> player[i] = deck.removeAt(0).copy(fresh = true) }
        selected.clear()
        player.sortBy { it.r }
        Casino.houseDiscards(house).forEach { i -> house[i] = deck.removeAt(0) }
        val a = Casino.evalHand(player)
        val h = Casino.evalHand(house)
        fun name(e: Casino.Hand) = Casino.HAND_NAMES[e.rank].lowercase()
        val cmp = Casino.compareHands(a, h)
        if (cmp > 0) {
            val big = a.rank >= 3 // trío o mejor paga doble
            finish("win", "¡Ganas con ${name(a)} contra ${name(h)}!${if (big && !free) " Mano fuerte: paga doble." else ""}", gold = payout(if (big) 3.0 else 2.0))
        } else if (cmp == 0) finish("draw", "Empate: los dos con ${name(a)}. Te devuelven tu apuesta.", gold = bet)
        else finish("lose", "La casa gana con ${name(h)} contra tu ${name(a)}.")
    }

    // ---------------------------------------------------------------- tragamonedas
    var reels: List<String> = emptyList()
        private set
    private var pendingReels: List<String>? = null

    /** Jala la palanca: decide cómo van a quedar los tres rodillos (la interfaz los hace girar hasta ahí). */
    fun slotsDraw(): List<String> {
        if (kind != "slots" || phase != "play") return reels
        return pendingReels ?: List(3) { Rng.pick(Casino.SLOT_SYMBOLS) }.also { pendingReels = it }
    }

    /** Los rodillos ya pararon: se paga. */
    fun slotsSettle() {
        val final = pendingReels ?: return
        if (kind != "slots" || phase != "play") return
        reels = final
        pendingReels = null
        val mult = Casino.slotPayout(final)
        when {
            mult >= 5 -> finish("win", if (mult == 10.0) "¡JACKPOT REAL! ×10" else "¡Tres iguales! ×5", gold = payout(mult))
            mult > 0 -> finish("win", "Dos iguales: ×1.5", gold = payout(mult))
            else -> finish("lose", "Nada esta vez.")
        }
    }

    // ---------------------------------------------------------------- ruleta
    var pick: RoulettePick? = null
        private set
    /** El número que salió (-1 mientras no se haya girado). */
    var rouletteNumber = -1
        private set
    private var pendingNumber = -1

    fun roulettePick(choice: RoulettePick) {
        if (kind != "roulette" || phase != "play" || pendingNumber >= 0) return
        pick = choice
    }

    /** Gira la ruleta: devuelve el número que va a salir (-1 si todavía no elegiste). La interfaz la hace girar hasta ahí. */
    fun rouletteSpin(): Int {
        if (kind != "roulette" || phase != "play" || pick == null) return -1
        if (pendingNumber < 0) pendingNumber = Rng.int(Casino.ROULETTE_N)
        return pendingNumber
    }

    fun rouletteSettle() {
        val n = pendingNumber
        val choice = pick
        if (kind != "roulette" || phase != "play" || n < 0 || choice == null) return
        rouletteNumber = n
        pendingNumber = -1
        val mult = Casino.roulettePayout(choice, n)
        val color = mapOf("red" to "rojo", "black" to "negro", "green" to "verde").getValue(Casino.rouletteColor(n))
        val what = "Salió el $n ($color)."
        if (mult > 0) finish("win", "$what ×$mult", gold = payout(mult.toDouble())) else finish("lose", what)
    }

    // ---------------------------------------------------------------- ajedrez
    var board: Array<Array<Casino.Piece?>> = Casino.newBoard()
    /** player | enemy */
    var turn = "player"
    var sel: Casino.Cell? = null
        private set
    var targets: List<Casino.Cell> = emptyList()
        private set
    var last: Casino.Move? = null
        private set
    var plies = 0
    /** Tus piezas que se comieron / piezas rivales que te comiste (letra de la pieza). */
    val lost = ArrayList<Char>()
    val won = ArrayList<Char>()
    var note = ""
        private set

    private fun startChess() {
        board = Casino.newBoard()
        turn = "player"
        sel = null; targets = emptyList(); last = null
        plies = 0
        lost.clear(); won.clear()
        phase = "play"
        note = "Es tu turno. Toca una de tus piezas (las verdes)."
    }

    private fun chessDepth() = if (p.act >= 3) 3 else if (p.act == 2) 2 else 1
    private fun chessSloppy() = if (p.act >= 3) 0.0 else if (p.act == 2) 0.08 else 0.3

    /**
     * Toque en una casilla: si es un destino de la pieza elegida, la mueve (y devuelve verdadero); si es una pieza tuya,
     * la elige y marca sus jugadas; si no, quita la selección.
     */
    fun chessClick(r: Int, c: Int): Boolean {
        if (kind != "chess" || phase != "play" || turn != "player" || r !in 0 until Casino.ROWS || c !in 0 until Casino.COLS) return false
        val s = sel
        if (s != null && targets.any { it.r == r && it.c == c }) { chessMove(Casino.Move(s.r, s.c, r, c)); return true }
        val piece = board[r][c]
        if (piece != null && piece.c == 0) {
            val moves = Casino.movesFor(board, r, c)
            if (moves.isEmpty()) { sel = null; targets = emptyList(); note = "Esa pieza no tiene a dónde ir." }
            else { sel = Casino.Cell(r, c); targets = moves; note = "Elige a dónde mover (puntos = libre, aro rojo = comer)." }
        } else { sel = null; targets = emptyList() }
        return false
    }

    /** Juega una jugada (tuya o del rival), mira si acabó la partida y pasa el turno. */
    fun chessMove(mv: Casino.Move) {
        if (kind != "chess" || phase != "play") return
        val mover = board[mv.fr][mv.fc] ?: return
        val res = Casino.applyMove(board, mv)
        board = res.board
        last = mv
        sel = null; targets = emptyList()
        plies++
        res.captured?.let { (if (mover.c == 0) won else lost).add(it.t) }
        note = when {
            res.promoted -> if (mover.c == 0) "¡Tu peón se coronó reina!" else "¡Un peón rival se coronó reina!"
            mover.c == 0 -> "El rival está pensando…"
            else -> "Es tu turno."
        }
        if (checkChessEnd()) return
        turn = if (mover.c == 0) "enemy" else "player"
        if (turn == "player" && Casino.allMoves(board, 0).isEmpty()) { note = "No tienes movimientos: pasas el turno."; turn = "enemy" }
    }

    /** Le toca al rival. Devuelve falso si no tenía jugadas y pasó. */
    fun chessEnemyMove(): Boolean {
        if (kind != "chess" || phase != "play" || turn != "enemy") return false
        val mv = Casino.chooseEnemyMove(board, chessDepth(), chessSloppy())
        if (mv == null) {
            note = "El rival no tiene movimientos. Es tu turno."
            turn = "player"
            if (Casino.allMoves(board, 0).isEmpty()) chessFinishByMaterial()
            return false
        }
        chessMove(mv)
        return true
    }

    /** Gana quien se come todo; tras 60 jugadas se decide por material. */
    private fun checkChessEnd(): Boolean {
        val mine = Casino.countPieces(board, 0)
        val theirs = Casino.countPieces(board, 1)
        if (theirs == 0) { chessWin("¡Te comiste TODAS las piezas rivales!"); return true }
        if (mine == 0) { chessLose("El rival se comió todas tus piezas."); return true }
        if (plies >= 60) { chessFinishByMaterial(); return true }
        return false
    }

    private fun chessFinishByMaterial() {
        val a = Casino.material(board, 0)
        val b = Casino.material(board, 1)
        if (a > b) chessWin("Se acabó el tiempo y tienes más material que el rival: ¡ganas!")
        else if (a < b) chessLose("Se acabó el tiempo y el rival tiene más material.")
        else finish("draw", "Tablas: nadie logró ventaja. Te llevas un poquito de oro.", gold = 15)
    }

    // el objeto no está asegurado: 2 de cada 5 victorias
    private fun chessWin(why: String) = finish("win", why, gold = 35 + 10 * p.act, relic = Rng.next() < 0.4)
    private fun chessLose(why: String) = finish("lose", why, hp = 6 + 2 * p.act)

    fun chessResign() {
        if (kind != "chess" || phase != "play") return
        chessLose("Te rendiste.")
    }
}
