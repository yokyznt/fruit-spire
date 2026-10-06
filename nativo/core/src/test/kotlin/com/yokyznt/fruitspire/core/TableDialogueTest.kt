package com.yokyznt.fruitspire.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Lo que dice el crupier: cambia con lo que haces en la mesa y con cómo vas (ganando, perdiendo o parejo). */
class TableDialogueTest {
    private fun pool(key: String, n: Int = 0): List<String> = Table.LINES.getValue(key).map { it.replace("{n}", n.toString()) }

    private fun newRun(seed: Int): Run {
        Rng.seed(seed)
        return Run.start("manzana", "madura").also { it.beginFloor(); it.player.gold = 300 }
    }

    private fun tableOf(seed: Int, kind: String, bet: Int = 10): Table {
        val run = newRun(seed)
        run.openMinigame(kind)
        return run.table!!.also { assertTrue(it.start(if (kind == "chess") 0 else bet)) }
    }

    private fun assertSays(t: Table, expected: List<String>, why: String) =
        assertTrue(t.dealerLine in expected, "$why: dijo «${t.dealerLine}» y esperaba una de $expected")

    // ------------------------------------------------------------------ dados
    @Test
    fun diceDealerCommentsOnWhatYouHave() {
        for (seed in 1..80) {
            val t = tableOf(seed, "dice")
            while (t.phase == "play") {
                t.diceRoll()
                val total = t.dicePlayer.sum()
                when {
                    total > 21 -> assertSays(t, pool("bust", total), "te pasaste con $total")
                    total == 21 -> assertSays(t, pool("twentyone"), "21 exacto")
                    total >= 17 -> assertSays(t, pool("hot"), "$total")
                    total >= 15 -> assertSays(t, pool("good"), "$total")
                    total >= 9 -> assertSays(t, pool("mid"), "$total")
                    else -> assertSays(t, pool("low"), "$total")
                }
                if (total in 15..20 && t.phase == "play") t.diceStand()
            }
        }
        Rng.unseed()
    }

    @Test
    fun theHouseSaysItsOwnTotalWhileItRolls() {
        val t = tableOf(5, "dice")
        t.dicePlayer.addAll(listOf(4, 4))
        t.diceStand()
        assertEquals("house", t.phase)
        assertSays(t, pool("house"), "empieza la casa")
        val v = t.houseRoll()
        assertSays(t, pool("houseRoll", v), "la casa lleva $v")
        Rng.unseed()
    }

    @Test
    fun aheadFollowsYourDiceAndTheResult() {
        val t = tableOf(6, "dice")
        assertEquals(0, t.ahead, "sin dados todavía")
        t.dicePlayer.addAll(listOf(6, 6, 6)); assertEquals(1, t.ahead, "18 puntos: vas ganando")
        t.dicePlayer.clear(); t.dicePlayer.addAll(listOf(2, 3)); assertEquals(-1, t.ahead, "5 puntos: vas perdiendo")
        t.dicePlayer.clear(); t.dicePlayer.addAll(listOf(5, 6)); assertEquals(0, t.ahead, "11 puntos: parejo")
        Rng.unseed()
    }

    private fun settled(seed: Int, mine: List<Int>, house: List<Int>): Table {
        val t = tableOf(seed, "dice", 25)
        t.dicePlayer.addAll(mine); t.diceHouse.addAll(house)
        t.diceSettle()
        return t
    }

    @Test
    fun diceEndingsSoundLikeWhatHappened() {
        settled(1, listOf(6, 6, 5), listOf(6, 6, 4)).let { assertEquals("win", it.outcome); assertSays(it, pool("win"), "ganas normal"); assertEquals(1, it.ahead) }
        settled(2, listOf(6, 6, 6, 3), listOf(6, 6, 5)).let { assertSays(it, pool("winBig"), "veintiuno exacto") }
        settled(3, listOf(6, 6, 5), listOf(6, 6, 6)).let { assertEquals("lose", it.outcome); assertSays(it, pool("loseNear"), "perdiste por uno"); assertEquals(-1, it.ahead) }
        settled(4, listOf(1, 2), listOf(6, 6, 6)).let { assertSays(it, pool("lose"), "perdiste por mucho") }
        settled(5, listOf(6, 6, 6), listOf(6, 6, 6)).let { assertEquals("draw", it.outcome); assertSays(it, pool("draw"), "empate"); assertEquals(0, it.ahead) }
        Rng.unseed()
    }

    // ------------------------------------------------------------------ póker
    @Test
    fun pokerDealerJudgesTheHandYouWereDealt() {
        val seen = HashSet<String>()
        for (seed in 1..120) {
            val t = tableOf(seed, "poker")
            val rank = Casino.evalHand(t.player).rank
            val key = when (rank) { 0 -> "pokerWeak"; 1 -> "pokerOk"; else -> "pokerStrong" }
            assertSays(t, pool(key), "mano de rango $rank")
            assertEquals(if (rank >= 2) 1 else if (rank == 0) -1 else 0, t.ahead)
            seen += key
        }
        assertEquals(setOf("pokerWeak", "pokerOk", "pokerStrong"), seen, "en 120 manos salen los tres casos")
        Rng.unseed()
    }

    // ------------------------------------------------------------------ tragamonedas y ruleta
    @Test
    fun slotsDealerReactsToThePullAndToTheReels() {
        val seen = HashSet<String>()
        for (seed in 1..300) {
            val t = tableOf(seed, "slots")
            t.slotsDraw()
            assertSays(t, pool("slotsSpin"), "al jalar")
            t.slotsSettle()
            val expected = when {
                t.outcome == "lose" -> pool("lose")
                t.text.contains("JACKPOT") -> pool("slotsJackpot")
                t.text.contains("Tres iguales") -> pool("winBig")
                else -> pool("slotsNear")
            }
            assertSays(t, expected, t.text)
            seen += t.outcome
        }
        assertTrue("win" in seen && "lose" in seen)
        Rng.unseed()
    }

    @Test
    fun rouletteDealerCommentsOnYourPickAndTheSpin() {
        val t = tableOf(9, "roulette")
        t.roulettePick(RoulettePick.Red); assertSays(t, pool("pickRed"), "rojo")
        t.roulettePick(RoulettePick.Black); assertSays(t, pool("pickBlack"), "negro")
        t.roulettePick(RoulettePick.Number(7)); assertSays(t, pool("pickNumber"), "un número")
        t.rouletteSpin(); assertSays(t, pool("rouletteSpin"), "gira")
        t.rouletteSettle()
        assertSays(t, pool(if (t.outcome == "win") "rouletteHit" else "rouletteMiss"), "terminó la ruleta")
        Rng.unseed()
    }

    // ------------------------------------------------------------------ ajedrez
    @Test
    fun chessDealerReactsToCapturesAndTurns() {
        val t = tableOf(11, "chess")
        assertEquals("Tu jugada.", t.dealerLine)
        t.board = Array(Casino.ROWS) { arrayOfNulls<Casino.Piece>(Casino.COLS) }.also {
            it[2][1] = Casino.Piece('R', 0)   // tu torre
            it[2][3] = Casino.Piece('P', 1)   // un peón rival
            it[1][3] = Casino.Piece('P', 1)   // otro, para que la partida siga
            it[5][4] = Casino.Piece('K', 0)
        }
        t.chessMove(Casino.Move(2, 1, 2, 3))   // te comes un peón
        assertSays(t, pool("chessTake"), "le comiste una pieza")
        assertEquals("enemy", t.turn)
        Rng.unseed()
    }

    @Test
    fun chessAheadFollowsTheMaterial() {
        val t = tableOf(12, "chess")
        assertEquals(0, t.ahead, "piezas iguales al empezar")
        t.board = Array(Casino.ROWS) { arrayOfNulls<Casino.Piece>(Casino.COLS) }.also {
            it[2][1] = Casino.Piece('R', 0); it[5][4] = Casino.Piece('K', 0); it[0][0] = Casino.Piece('P', 1)
        }
        assertEquals(1, t.ahead, "una torre contra un peón")
        Rng.unseed()
    }

    @Test
    fun nothingSaidBeforeTheGameStartsMeansNoMood() {
        val run = newRun(14)
        run.openMinigame("dice")
        assertEquals(0, run.table!!.ahead)
        Rng.unseed()
    }
}
