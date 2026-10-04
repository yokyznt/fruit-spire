package com.yokyznt.fruitspire.core

import kotlin.math.floor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Pruebas de las mesas de juego (js/minigames.js): reglas del póker y el ajedrez, pagos y el flujo de cada mesa. */
class CasinoTest {
    private val SUIT = mapOf('S' to 0, 'H' to 1, 'D' to 2, 'C' to 3)

    /** "AS KH 10D 2C" → cartas (rango + palo: S♠ H♥ D♦ C♣). */
    private fun cards(text: String): List<Casino.Card> = text.trim().split(" ").map { t ->
        val rank = when (val r = t.dropLast(1)) { "J" -> 11; "Q" -> 12; "K" -> 13; "A" -> 14; else -> r.toInt() }
        Casino.Card(rank, SUIT.getValue(t.last()))
    }

    private fun hand(text: String) = Casino.evalHand(cards(text))

    private fun emptyBoard(): Array<Array<Casino.Piece?>> = Array(Casino.ROWS) { arrayOfNulls<Casino.Piece>(Casino.COLS) }

    private fun newRun(seed: Int): Run {
        Rng.seed(seed)
        return Run.start("manzana", "madura").also { it.beginFloor() }
    }

    private fun tableOf(run: Run, kind: String): Table {
        run.openMinigame(kind)
        return run.table!!
    }

    /** Oro de los premios de oro de la fila de premios (0 si no hay). */
    private fun lootGold(run: Run): Int = run.loot.filter { it.k == "gold" }.sumOf { it.n }

    // ------------------------------------------------------------------ póker
    @Test
    fun handRanksAreRecognised() {
        assertEquals(0, hand("2S 5H 9D JC KS").rank)
        assertEquals(1, hand("2S 2H 9D JC KS").rank)
        assertEquals(2, hand("2S 2H 9D 9C KS").rank)
        assertEquals(3, hand("2S 2H 2D JC KS").rank)
        assertEquals(4, hand("5S 6H 7D 8C 9S").rank)
        assertEquals(4, hand("AS 2H 3D 4C 5S").rank, "la escalera A-2-3-4-5")
        assertEquals(5, hand("2H 5H 9H JH KH").rank)
        assertEquals(6, hand("2S 2H 2D KC KS").rank)
        assertEquals(7, hand("9S 9H 9D 9C KS").rank)
        assertEquals(8, hand("5H 6H 7H 8H 9H").rank)
        assertEquals(0, hand("QS KH AD 2C 3S").rank, "Q-K-A-2-3 no es escalera")
    }

    @Test
    fun handsAreComparedByRankThenTieBreaks() {
        assertEquals(1, Casino.compareHands(hand("KS KH 2D 5C 9S"), hand("QS QH AD 5C 9S")))
        assertEquals(-1, Casino.compareHands(hand("KS KH 2D 5C 9S"), hand("2S 2H 2D 5C 9S")))
        assertEquals(1, Casino.compareHands(hand("KS KH 2D 5C 9S"), hand("KD KC 2H 5S 8S")), "gana el mejor kicker")
        assertEquals(0, Casino.compareHands(hand("KS KH 2D 5C 9S"), hand("KD KC 2H 5S 9D")))
        assertEquals(1, Casino.compareHands(hand("2S 3H 4D 5C 6S"), hand("AS 2H 3D 4C 5S")), "la escalera A-5 es la más baja")
    }

    @Test
    fun houseDiscardsLikeTheWebHouse() {
        assertEquals(emptyList(), Casino.houseDiscards(cards("5S 6H 7D 8C 9S")), "con escalera se planta")
        assertEquals(emptyList(), Casino.houseDiscards(cards("2H 5H 9H JH KH")), "con color se planta")
        assertEquals(listOf(0, 3, 4), Casino.houseDiscards(cards("2S 9H 9D KC 5S")), "se queda con el par")
        assertEquals(listOf(4), Casino.houseDiscards(cards("2H 5H 9H JH KS")), "con cuatro del mismo palo, se queda con esas cuatro")
        assertEquals(listOf(0, 1, 2), Casino.houseDiscards(cards("2S 5H 9D JC KS")), "sin nada, se queda con sus 2 cartas más altas")
    }

    // ------------------------------------------------------------------ ajedrez
    @Test
    fun chessBoardStartsWithTenPiecesEach() {
        val b = Casino.newBoard()
        assertEquals(10, Casino.countPieces(b, 0))
        assertEquals(10, Casino.countPieces(b, 1))
        assertEquals('K', b[5][4]!!.t)
        assertEquals(0, b[5][4]!!.c, "tus piezas abajo")
        assertEquals('K', b[0][4]!!.t)
        assertEquals(1, b[0][4]!!.c)
        assertEquals('P', b[4][0]!!.t)
        assertEquals('P', b[1][0]!!.t)
    }

    @Test
    fun pawnsMoveForwardAndCaptureDiagonally() {
        val b = emptyBoard()
        b[4][2] = Casino.Piece('P', 0)
        assertEquals(listOf(3 to 2), Casino.movesFor(b, 4, 2).map { it.r to it.c })
        b[3][3] = Casino.Piece('P', 1)
        b[3][2] = Casino.Piece('P', 1) // le tapa el paso
        assertEquals(listOf(3 to 3), Casino.movesFor(b, 4, 2).map { it.r to it.c }, "solo puede comer en diagonal")
        b[3][1] = Casino.Piece('N', 0) // una pieza propia no se come
        assertEquals(listOf(3 to 3), Casino.movesFor(b, 4, 2).map { it.r to it.c })
    }

    @Test
    fun knightAndRookMovesRespectTheBoard() {
        val start = Casino.newBoard()
        assertEquals(setOf(3 to 0, 3 to 2), Casino.movesFor(start, 5, 1).map { it.r to it.c }.toSet(), "el caballo salta sobre sus peones")
        val b = emptyBoard()
        b[3][1] = Casino.Piece('R', 0)
        b[3][3] = Casino.Piece('P', 0)
        b[1][1] = Casino.Piece('P', 1)
        val moves = Casino.movesFor(b, 3, 1).map { it.r to it.c }.toSet()
        assertEquals(setOf(3 to 0, 3 to 2, 2 to 1, 1 to 1, 4 to 1, 5 to 1), moves, "se detiene ante la propia y come la primera rival")
    }

    @Test
    fun pawnsCrownAsQueensOnTheLastRow() {
        val b = emptyBoard()
        b[1][2] = Casino.Piece('P', 0)
        b[4][0] = Casino.Piece('P', 1)
        val a = Casino.applyMove(b, Casino.Move(1, 2, 0, 2))
        assertTrue(a.promoted)
        assertEquals('Q', a.board[0][2]!!.t)
        assertEquals('P', b[1][2]!!.t, "el tablero original no se toca")
        val e = Casino.applyMove(b, Casino.Move(4, 0, 5, 0))
        assertTrue(e.promoted)
        assertEquals(1, e.board[5][0]!!.c)
        val c = emptyBoard()
        c[2][1] = Casino.Piece('R', 0)
        c[2][3] = Casino.Piece('N', 1)
        val cap = Casino.applyMove(c, Casino.Move(2, 1, 2, 3))
        assertEquals('N', cap.captured!!.t)
        assertFalse(cap.promoted)
    }

    @Test
    fun enemyTakesAFreeQueenAndPassesWithoutMoves() {
        for (depth in 1..3) {
            val b = emptyBoard()
            b[0][0] = Casino.Piece('R', 1)
            b[0][3] = Casino.Piece('Q', 0)
            b[5][4] = Casino.Piece('K', 0)
            b[5][0] = Casino.Piece('K', 1)
            val mv = Casino.chooseEnemyMove(b, depth, 0.0)
            assertNotNull(mv)
            assertEquals(Casino.Move(0, 0, 0, 3), mv, "profundidad $depth")
        }
        val stuck = emptyBoard()
        stuck[5][2] = Casino.Piece('P', 1) // un peón rival en la última fila ya no puede avanzar
        stuck[0][0] = Casino.Piece('K', 0)
        assertNull(Casino.chooseEnemyMove(stuck, 2, 0.0))
    }

    @Test
    fun materialAndCountsAddUp() {
        val b = Casino.newBoard()
        assertEquals(5 * 100 + 500 + 300 + 320 + 900 + 400, Casino.material(b, 0))
        assertEquals(Casino.material(b, 0), Casino.material(b, 1))
    }

    // ------------------------------------------------------------------ máquinas
    @Test
    fun slotAndRoulettePayouts() {
        assertEquals(5.0, Casino.slotPayout(listOf("kiwi", "kiwi", "kiwi")))
        assertEquals(10.0, Casino.slotPayout(listOf("rey_fruta", "rey_fruta", "rey_fruta")))
        assertEquals(1.5, Casino.slotPayout(listOf("kiwi", "uva", "kiwi")))
        assertEquals(1.5, Casino.slotPayout(listOf("uva", "uva", "kiwi")))
        assertEquals(0.0, Casino.slotPayout(listOf("kiwi", "uva", "manzana")))
        assertEquals("green", Casino.rouletteColor(0))
        assertEquals("red", Casino.rouletteColor(7))
        assertEquals("black", Casino.rouletteColor(8))
        assertEquals(2, Casino.roulettePayout(RoulettePick.Red, 3))
        assertEquals(0, Casino.roulettePayout(RoulettePick.Red, 4))
        assertEquals(0, Casino.roulettePayout(RoulettePick.Black, 0), "el 0 es de la casa")
        assertEquals(10, Casino.roulettePayout(RoulettePick.Number(5), 5))
        assertEquals(0, Casino.roulettePayout(RoulettePick.Number(5), 6))
    }

    // ------------------------------------------------------------------ flujo de las mesas
    @Test
    fun startingTakesTheBetAndFreePlayTakesNothing() {
        val run = newRun(1)
        val p = run.player
        p.gold = 100
        val t = tableOf(run, "dice")
        assertEquals("intro", t.phase)
        assertFalse(t.start(500), "no te alcanza el oro")
        assertEquals("intro", t.phase)
        assertTrue(t.start(25))
        assertEquals(75, p.gold)
        assertEquals("play", t.phase)
        assertFalse(t.free)
        assertFalse(t.start(10), "ya empezó")

        val t2 = tableOf(run, "dice")
        assertTrue(t2.start(0))
        assertTrue(t2.free)
        assertEquals(75, p.gold)
        Rng.unseed()
    }

    @Test
    fun chessHasNoBetAndStartsOnYourTurn() {
        val run = newRun(2)
        run.player.gold = 40
        val t = tableOf(run, "chess")
        assertTrue(t.start(0))
        assertFalse(t.free, "en el ajedrez no hay apuesta ni juego libre")
        assertEquals(40, run.player.gold)
        assertEquals("play", t.phase)
        assertEquals("player", t.turn)
        assertEquals(10, Casino.countPieces(t.board, 0))
        Rng.unseed()
    }

    private fun diceTable(seed: Int, bet: Int): Pair<Run, Table> {
        val run = newRun(seed)
        run.player.gold = 200
        val t = tableOf(run, "dice")
        assertTrue(t.start(bet))
        return run to t
    }

    /** Una partida de dados con los dados ya puestos y la casa lista para cerrar. */
    private fun settledDice(seed: Int, bet: Int, mine: List<Int>, house: List<Int>): Pair<Run, Table> {
        val (run, t) = diceTable(seed, bet)
        t.dicePlayer.addAll(mine)
        t.diceHouse.addAll(house)
        t.diceSettle()
        return run to t
    }

    @Test
    fun diceSettlementPaysLikeTheWeb() {
        // ganas con 18 contra 17: paga doble
        settledDice(3, 25, listOf(6, 6, 6), listOf(6, 6, 5)).let { (run, t) ->
            assertEquals("result", t.phase); assertEquals("win", t.outcome)
            assertEquals(50, lootGold(run))
            assertEquals(175, run.player.gold, "el oro del premio se recoge después")
        }
        // 21 exacto: paga triple
        settledDice(4, 25, listOf(6, 6, 6, 3), listOf(6, 6, 5)).let { (run, t) -> assertEquals("win", t.outcome); assertEquals(75, lootGold(run)) }
        // la casa se pasa: ganas
        settledDice(5, 10, listOf(2, 3), listOf(6, 6, 6, 4)).let { (run, t) -> assertEquals("win", t.outcome); assertEquals(20, lootGold(run)) }
        // empate: te devuelven la apuesta
        settledDice(6, 50, listOf(6, 6, 6), listOf(6, 6, 6)).let { (run, t) -> assertEquals("draw", t.outcome); assertEquals(50, lootGold(run)) }
        // pierdes
        settledDice(7, 50, listOf(6, 6, 2), listOf(6, 6, 6, 3)).let { (run, t) -> assertEquals("lose", t.outcome); assertEquals(0, lootGold(run)) }
        Rng.unseed()
    }

    @Test
    fun houseKeepsRollingUntil17() {
        val (_, t) = diceTable(40, 10)
        t.diceHouse.addAll(listOf(5, 5, 6)) // 16
        assertTrue(t.houseNeedsRoll())
        t.diceHouse.add(1) // 17
        assertFalse(t.houseNeedsRoll())
        Rng.unseed()
    }

    @Test
    fun freePlayOnlyWinsEightGold() {
        val run = newRun(8)
        run.player.gold = 100
        val t = tableOf(run, "dice")
        assertTrue(t.start(0))
        t.dicePlayer.addAll(listOf(6, 6, 6, 3)); t.diceHouse.addAll(listOf(6, 6, 5))
        t.diceSettle()
        assertEquals("win", t.outcome)
        assertEquals(8, lootGold(run), "gratis solo paga 8, aunque saques 21")

        val r2 = newRun(9)
        val t2 = tableOf(r2, "dice")
        t2.start(0)
        t2.dicePlayer.addAll(listOf(6, 6, 6)); t2.diceHouse.addAll(listOf(6, 6, 6))
        t2.diceSettle()
        assertEquals("draw", t2.outcome)
        assertEquals(0, lootGold(r2), "el empate gratis no devuelve nada")
        Rng.unseed()
    }

    @Test
    fun rollingDiceBustsOrForcesTheHouseAt21() {
        var bust = 0; var twentyOne = 0
        for (seed in 1..300) {
            val (run, t) = diceTable(seed, 10)
            var guard = 0
            while (t.phase == "play" && guard++ < 30) {
                val v = t.diceRoll()
                assertTrue(v in 1..6)
                val total = t.dicePlayer.sum()
                when {
                    total > 21 -> { bust++; assertEquals("result", t.phase); assertEquals("lose", t.outcome); assertEquals(0, lootGold(run)) }
                    total == 21 -> { twentyOne++; assertEquals("house", t.phase) }
                    else -> assertEquals("play", t.phase)
                }
                if (total in 19..20) t.diceStand() // se planta tarde, para que haya pasadas y veintiunos
            }
            if (t.phase == "house") {
                while (t.houseNeedsRoll()) { val v = t.houseRoll(); assertTrue(v in 1..6) }
                assertTrue(t.diceHouse.sum() >= 17)
                t.diceSettle()
            }
            assertEquals("result", t.phase)
            assertTrue(t.outcome in setOf("win", "lose", "draw"))
        }
        assertTrue(bust > 10 && twentyOne > 3, "pocas situaciones probadas: $bust pasadas, $twentyOne veintiunos")
        Rng.unseed()
    }

    @Test
    fun cannotStandWithoutRollingOrRollOutOfTurn() {
        val (_, t) = diceTable(10, 10)
        assertFalse(t.diceStand(), "primero hay que tirar un dado")
        t.diceRoll()
        assertTrue(t.diceStand())
        assertEquals("house", t.phase)
        assertEquals(0, t.diceRoll(), "ya no es tu turno")
        Rng.unseed()
    }

    @Test
    fun pokerSwapsOnlyTheChosenCardsAndPaysByHandStrength() {
        val run = newRun(11)
        run.player.gold = 100
        val t = tableOf(run, "poker")
        assertTrue(t.start(25))
        assertEquals(5, t.player.size)
        assertEquals(5, t.house.size)
        assertEquals(42, t.deck.size)
        // mano fija: tú un trío de reyes contra la casa con carta alta
        t.player = cards("KS KH KD 2C 5S").toMutableList()
        t.house = cards("2H 4D 7C 9S JH").toMutableList()
        t.deck = cards("3S 4H 6D 8C 10S 10H 10D 3C 3D 4D").toMutableList()
        t.pokerToggle(3); t.pokerToggle(4)
        assertEquals(setOf(3, 4), t.selected)
        t.pokerToggle(4)
        assertEquals(setOf(3), t.selected)
        t.pokerShow()
        assertEquals("result", t.phase)
        assertEquals(3, t.player.count { it.r == 13 }, "los reyes se quedan")
        assertTrue(t.player.any { it.r == 3 && it.fresh }, "la carta nueva viene de arriba del mazo y queda marcada")
        assertEquals("win", t.outcome)
        assertEquals(75, lootGold(run), "trío o mejor paga ×3 (la apuesta y el doble de ganancia)")
        Rng.unseed()
    }

    @Test
    fun pokerDrawAndLoss() {
        val run = newRun(12)
        run.player.gold = 100
        val t = tableOf(run, "poker")
        t.start(25)
        t.player = cards("2S 5H 9D JC KS").toMutableList()
        t.house = cards("2H 2D 7C 9S JH").toMutableList()
        t.deck = cards("3S 4H 6D 8C 10S 10H 10D 3C 3D 4D").toMutableList()
        t.pokerShow() // te plantas con carta alta; la casa se queda con su par
        assertEquals("lose", t.outcome)
        assertEquals(0, lootGold(run))

        val r2 = newRun(13)
        r2.player.gold = 100
        val t2 = tableOf(r2, "poker")
        t2.start(25)
        t2.player = cards("5S 6H 7D 8C 9S").toMutableList()
        t2.house = cards("5H 6D 7C 8S 9H").toMutableList() // la casa se planta con escalera
        t2.deck = cards("3S 4H 6D 8C 10S 10H 10D 3C 3D 4D").toMutableList()
        t2.pokerShow()
        assertEquals("draw", t2.outcome)
        assertEquals(25, lootGold(r2), "el empate devuelve la apuesta")
        Rng.unseed()
    }

    @Test
    fun slotsAndRouletteSettleWithTheirPayouts() {
        val run = newRun(14)
        val p = run.player
        val kinds = mutableSetOf<Double>()
        for (i in 1..1500) {
            Rng.seed(i)
            p.gold = 100
            run.loot.clear()
            val t = tableOf(run, "slots")
            t.start(25)
            val final = t.slotsDraw()
            assertEquals(3, final.size)
            t.slotsSettle()
            val mult = Casino.slotPayout(final)
            kinds.add(mult)
            assertEquals(final, t.reels)
            assertEquals(floor(25 * mult).toInt(), lootGold(run), "tiro $i: $final")
            assertEquals(if (mult > 0) "win" else "lose", t.outcome)
        }
        assertEquals(setOf(0.0, 1.5, 5.0, 10.0), kinds, "en 1500 tiros deben salir todos los pagos")

        for (i in 1..300) {
            Rng.seed(i)
            p.gold = 100
            run.loot.clear()
            val t = tableOf(run, "roulette")
            t.start(10)
            assertEquals(-1, t.rouletteSpin(), "primero hay que elegir")
            t.roulettePick(RoulettePick.Red)
            val n = t.rouletteSpin()
            assertTrue(n in 0 until Casino.ROULETTE_N)
            t.rouletteSettle()
            assertEquals(10 * Casino.roulettePayout(RoulettePick.Red, n), lootGold(run))
            assertEquals(n, t.rouletteNumber)
        }
        Rng.unseed()
    }

    @Test
    fun freePlaySlotsPayEightAndNothingOnLoss() {
        val run = newRun(15)
        var won = false; var lost = false
        for (i in 1..200) {
            Rng.seed(i)
            run.loot.clear()
            val t = tableOf(run, "slots")
            t.start(0)
            val mult = Casino.slotPayout(t.slotsDraw())
            t.slotsSettle()
            if (mult > 0) { won = true; assertEquals(8, lootGold(run)) } else { lost = true; assertEquals(0, lootGold(run)) }
        }
        assertTrue(won && lost)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ partida de ajedrez
    private fun chessTable(seed: Int, act: Int = 1): Pair<Run, Table> {
        val run = newRun(seed)
        run.player.act = act
        run.player.hp = run.player.maxHp
        val t = tableOf(run, "chess")
        t.start(0)
        return run to t
    }

    @Test
    fun clickingSelectsShowsTargetsAndMoves() {
        val (_, t) = chessTable(16)
        assertFalse(t.chessClick(2, 2)) // casilla vacía: no pasa nada
        assertNull(t.sel)
        assertFalse(t.chessClick(4, 2)) // tu peón: solo se selecciona
        assertEquals(4 to 2, t.sel!!.let { it.r to it.c })
        assertEquals(listOf(3 to 2), t.targets.map { it.r to it.c })
        assertTrue(t.chessClick(3, 2), "tocar el destino mueve")
        assertEquals('P', t.board[3][2]!!.t)
        assertNull(t.board[4][2])
        assertEquals("enemy", t.turn)
        assertEquals(1, t.plies)
        assertNull(t.sel)
        assertFalse(t.chessClick(4, 1), "no puedes mover en turno del rival")
        assertEquals("enemy", t.turn)
    }

    @Test
    fun aPieceWithNoMovesGivesANote() {
        val (_, t) = chessTable(17)
        t.chessClick(5, 0) // la torre, encerrada por sus peones
        assertNull(t.sel)
        assertEquals("Esa pieza no tiene a dónde ir.", t.note)
    }

    @Test
    fun eatingEverythingWinsGoldAndSometimesARelic() {
        var relics = 0; var wins = 0
        for (seed in 1..60) {
            val (run, t) = chessTable(seed, act = 2)
            t.board = emptyBoard().also {
                it[2][1] = Casino.Piece('R', 0)
                it[2][3] = Casino.Piece('P', 1)
                it[5][4] = Casino.Piece('K', 0)
            }
            t.chessMove(Casino.Move(2, 1, 2, 3))
            assertEquals("result", t.phase)
            assertEquals("win", t.outcome)
            assertEquals(35 + 10 * 2, lootGold(run))
            if (run.loot.any { it.k == "relic" }) relics++
            wins++
        }
        assertTrue(relics in 10..40, "2 de cada 5 victorias dan objeto: $relics de $wins")
        Rng.unseed()
    }

    @Test
    fun resigningCostsLifeButNeverKills() {
        val (run, t) = chessTable(18, act = 3)
        t.chessResign()
        assertEquals("lose", t.outcome)
        assertEquals(run.player.maxHp - (6 + 2 * 3), run.player.hp)

        val (r2, t2) = chessTable(19, act = 1)
        r2.player.hp = 3
        t2.chessResign()
        assertEquals(1, r2.player.hp, "nunca bajas de 1 ❤️")
        Rng.unseed()
    }

    @Test
    fun longGamesAreDecidedByMaterial() {
        val (_, t) = chessTable(20)
        t.plies = 59
        t.board = emptyBoard().also {
            it[3][0] = Casino.Piece('Q', 0)
            it[0][4] = Casino.Piece('P', 1)
            it[5][4] = Casino.Piece('K', 0)
        }
        t.chessMove(Casino.Move(3, 0, 2, 0))
        assertEquals("result", t.phase)
        assertEquals("win", t.outcome, "tienes más material al llegar a 60 jugadas")

        val (_, t2) = chessTable(21)
        t2.plies = 59
        t2.board = emptyBoard().also {
            it[3][0] = Casino.Piece('P', 0)
            it[0][4] = Casino.Piece('Q', 1)
            it[5][4] = Casino.Piece('K', 0)
        }
        t2.chessMove(Casino.Move(3, 0, 2, 0))
        assertEquals("lose", t2.outcome)

        val (run3, t3) = chessTable(22)
        t3.plies = 59
        t3.board = emptyBoard().also {
            it[3][0] = Casino.Piece('R', 0)
            it[0][4] = Casino.Piece('R', 1)
        }
        t3.chessMove(Casino.Move(3, 0, 2, 0))
        assertEquals("draw", t3.outcome)
        assertEquals(15, lootGold(run3))
        Rng.unseed()
    }

    @Test
    fun enemyAnswersAndPassesWhenStuck() {
        val (_, t) = chessTable(23)
        t.chessClick(4, 0); t.chessClick(3, 0)
        assertEquals("enemy", t.turn)
        assertTrue(t.chessEnemyMove(), "el rival responde")
        assertEquals("player", t.turn)
        assertEquals(2, t.plies)

        val (_, t2) = chessTable(24)
        t2.board = emptyBoard().also {
            it[0][0] = Casino.Piece('K', 0)
            it[5][2] = Casino.Piece('P', 1) // sin movimientos
        }
        t2.turn = "enemy"
        assertFalse(t2.chessEnemyMove(), "el rival no puede mover y pasa")
        assertEquals("player", t2.turn)
        assertEquals("play", t2.phase)
        Rng.unseed()
    }

    @Test
    fun aRandomBotAlwaysFinishesEveryChessGame() {
        var total = 0
        for (seed in 1..6) {
            val (run, t) = chessTable(seed, act = 1 + seed % 3)
            var guard = 0
            while (t.phase == "play" && guard++ < 200) {
                if (t.turn == "player") {
                    val moves = Casino.allMoves(t.board, 0)
                    t.chessMove(moves[Rng.int(moves.size)])
                } else t.chessEnemyMove()
                assertTrue(t.plies <= 61)
            }
            assertEquals("result", t.phase, "semilla $seed no terminó")
            assertTrue(t.outcome in setOf("win", "lose", "draw"))
            assertTrue(run.player.hp in 1..run.player.maxHp)
            total++
        }
        assertEquals(6, total)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ dentro de la partida
    @Test
    fun gameTilesOpenATableThatFitsTheFloor() {
        val kinds = HashMap<String, Int>()
        for (seed in 1..300) {
            val run = newRun(seed)
            run.map.themeId = "dados"
            val x = run.pos.x; val y = run.pos.y
            val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
            run.map.grid[ny][nx] = NodeType.GAME
            assertNull(run.arrive(nx, ny))
            assertEquals(RunScreen.MINIGAME, run.screen)
            kinds.merge(run.table!!.kind, 1, Int::plus)
        }
        assertEquals(setOf("dice", "slots", "roulette"), kinds.keys, "en la Sala de los Dados: dados, o una máquina")
        val machines = (kinds["slots"] ?: 0) + (kinds["roulette"] ?: 0)
        assertTrue(machines in 60..150, "1 de cada 3 es máquina: $machines de 300")
        Rng.unseed()
    }

    @Test
    fun eventsCanOpenATableAndLeavingGoesBackToTheMap() {
        val run = newRun(30)
        run.currentEvent = Events.byId("mesa_dados")!!
        run.screen = RunScreen.EVENT
        assertNull(run.resolveEventOption(0))
        assertEquals(RunScreen.MINIGAME, run.screen)
        val t = run.table!!
        assertEquals("dice", t.kind)

        t.start(0)
        t.dicePlayer.addAll(listOf(6, 6, 6)); t.diceHouse.addAll(listOf(6, 6, 5))
        t.diceSettle()
        assertFalse(run.leaveNode(), "primero hay que recoger el premio")
        assertTrue(run.collectLoot(0))
        assertTrue(run.leaveNode())
        assertEquals(RunScreen.MAP, run.screen)
        assertNull(run.table)
        Rng.unseed()
    }

    @Test
    fun winningAddsPassExperienceAndLosingDoesNot() {
        val run = newRun(31)
        val t = tableOf(run, "dice")
        t.start(0)
        t.dicePlayer.addAll(listOf(6, 6, 6)); t.diceHouse.addAll(listOf(6, 6, 5))
        t.diceSettle()
        assertEquals(15, run.progress.passXp)
        val t2 = tableOf(run, "dice")
        t2.start(0)
        t2.dicePlayer.addAll(listOf(6, 6, 2)); t2.diceHouse.addAll(listOf(6, 6, 6))
        t2.diceSettle()
        assertEquals(15, run.progress.passXp)
        Rng.unseed()
    }

    @Test
    fun aSavedTableComesBackAsTheMap() {
        val run = newRun(32)
        run.player.gold = 90
        val t = tableOf(run, "dice")
        t.start(25)
        val back = Save.decode(Save.encode(run), Progress())!!
        assertEquals(RunScreen.MAP, back.screen)
        assertEquals(65, back.player.gold, "la apuesta ya está pagada")
        assertNull(back.table)
        Rng.unseed()
    }
}
