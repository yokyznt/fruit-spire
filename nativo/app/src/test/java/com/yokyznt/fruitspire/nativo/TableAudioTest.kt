package com.yokyznt.fruitspire.nativo

import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.test.junit4.createComposeRule
import com.yokyznt.fruitspire.core.Casino
import com.yokyznt.fruitspire.core.RoulettePick
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.Table
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.TableController
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Las mesas suenan como en js/minigames.js: dados que ruedan, rodillos, ruleta, piezas que se mueven y el resultado al final. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class TableAudioTest {
    @get:Rule
    val compose = createComposeRule()

    private val results = listOf(Sfx.WIN, Sfx.DENIED, Sfx.POP)

    private class Mesa(val run: Run, val table: Table, val ctl: TableController)

    private fun mount(kind: String, rec: RecordingAudio, gold: Int = 120, setup: (Table) -> Unit = {}): Mesa {
        Rng.seed(7)
        val run = Run.start("manzana", "madura").also { it.beginFloor(); it.player.gold = gold; it.player.act = 1 }
        run.openMinigame(kind)
        val table = run.table!!
        setup(table)
        var ctl: TableController? = null
        compose.setContent {
            DesignCanvas {
                val scope = rememberCoroutineScope()
                ctl = remember { TableController(run, table, scope, {}, {}, {}, rec) }
            }
        }
        return Mesa(run, table, ctl!!)
    }

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        compose.waitForIdle()
    }

    private fun emptyBoard() = Array(Casino.ROWS) { arrayOfNulls<Casino.Piece>(Casino.COLS) }

    // ------------------------------------------------------------------ apostar
    @Test
    fun aBetIsPaidWithACoin() {
        val rec = RecordingAudio()
        val m = mount("dice", rec)
        m.ctl.start(10)
        assertEquals(listOf(Sfx.COIN), rec.played)
        Rng.unseed()
    }

    @Test
    fun anEmptyPurseIsSilentJustLikeTheWeb() {
        val rec = RecordingAudio()
        val m = mount("dice", rec, gold = 5)
        m.ctl.start(25)
        assertTrue(rec.played.isEmpty())
        Rng.unseed()
    }

    // ------------------------------------------------------------------ dados
    @Test
    fun aRollingDieTicksSevenTimesThenHits() {
        val rec = RecordingAudio()
        val m = mount("dice", rec)
        m.ctl.start(10); rec.clear()
        m.ctl.diceRoll()
        advance(2000)
        assertEquals(List(7) { Sfx.TAP } + Sfx.HIT, rec.played.take(8))
        Rng.unseed()
    }

    @Test
    fun theHouseRollsWithTheSameSoundsAndTheGameEndsWithAResult() {
        val rec = RecordingAudio()
        val m = mount("dice", rec) { it.start(10); it.dicePlayer.addAll(listOf(6, 5)) }
        m.ctl.diceStand()
        advance(15000)
        assertEquals("cada tirada de la casa suena a 7 toquecitos y un golpe", 7 * rec.played.count { it == Sfx.HIT }, rec.played.count { it == Sfx.TAP })
        assertTrue("la casa tira al menos una vez: ${rec.played}", rec.played.count { it == Sfx.HIT } >= 1)
        assertEquals("y al final, un solo sonido de resultado", 1, rec.played.count { it in results })
        assertTrue(rec.played.last() in results)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ tragamonedas
    @Test
    fun theReelsTickAndStopThreeTimes() {
        val rec = RecordingAudio()
        val m = mount("slots", rec)
        m.ctl.start(25); rec.clear()
        m.ctl.slotsPull()
        advance(4000)
        assertEquals(21, rec.played.count { it == Sfx.TAP })
        assertEquals("cada rodillo se detiene con un golpe", 3, rec.played.count { it == Sfx.HIT })
        assertTrue("termina con el resultado: ${rec.played.last()}", rec.played.last() in results)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ ruleta
    @Test
    fun theWheelClicksNineTimesAndAnnouncesTheResult() {
        val rec = RecordingAudio()
        val m = mount("roulette", rec)
        m.ctl.start(10)
        rec.clear()
        m.ctl.roulettePick(RoulettePick.Red)
        assertEquals("elegir una apuesta = select", listOf(Sfx.SELECT), rec.played)
        rec.clear()
        m.ctl.rouletteSpin()
        advance(4000)
        assertEquals(9, rec.played.count { it == Sfx.TAP })
        assertTrue(rec.played.last() in results)
        assertEquals(1, rec.played.count { it in results })
        Rng.unseed()
    }

    // ------------------------------------------------------------------ póker
    @Test
    fun pickingPokerCardsSelectsAndShowingEndsTheGame() {
        val rec = RecordingAudio()
        val m = mount("poker", rec)
        m.ctl.start(10); rec.clear()
        m.ctl.pokerToggle(0)
        assertEquals(listOf(Sfx.SELECT), rec.played)
        rec.clear()
        m.ctl.pokerShow()
        assertEquals("un solo sonido de resultado", 1, rec.played.size)
        assertTrue(rec.played.single() in results)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ ajedrez
    @Test
    fun chessSelectsAPieceMovesItAndTheRivalAnswers() {
        val rec = RecordingAudio()
        val m = mount("chess", rec)
        m.ctl.start(0); rec.clear()
        m.ctl.chessClick(4, 2)
        assertEquals(listOf(Sfx.SELECT), rec.played)
        m.ctl.chessClick(3, 2)
        assertEquals(listOf(Sfx.SELECT, Sfx.MAP_MOVE), rec.played)
        advance(1500)
        assertEquals("el rival mueve y suena igual (la primera jugada no come)", listOf(Sfx.SELECT, Sfx.MAP_MOVE, Sfx.MAP_MOVE), rec.played)
        Rng.unseed()
    }

    @Test
    fun aBlockedPieceDeniesAndTappingTheEmptyBoardIsSilent() {
        val rec = RecordingAudio()
        val m = mount("chess", rec) {
            it.start(0)
            it.board = emptyBoard().also { b ->
                b[5][0] = Casino.Piece('R', 0); b[4][0] = Casino.Piece('P', 0); b[5][1] = Casino.Piece('P', 0); b[0][4] = Casino.Piece('K', 1)
            }
        }
        m.ctl.chessClick(5, 0)
        assertEquals("una pieza sin jugadas", listOf(Sfx.DENIED), rec.played)
        rec.clear()
        m.ctl.chessClick(2, 2)
        assertTrue("una casilla vacía no suena", rec.played.isEmpty())
        Rng.unseed()
    }

    @Test
    fun takingTheLastPieceHitsAndWinsOnce() {
        val rec = RecordingAudio()
        val m = mount("chess", rec) {
            it.start(0)
            it.board = emptyBoard().also { b -> b[2][1] = Casino.Piece('R', 0); b[2][3] = Casino.Piece('P', 1); b[5][4] = Casino.Piece('K', 0) }
        }
        m.ctl.chessClick(2, 1)
        m.ctl.chessClick(2, 3)
        assertEquals(listOf(Sfx.SELECT, Sfx.HIT, Sfx.WIN), rec.played)
        Rng.unseed()
    }

    @Test
    fun resigningDeniesOnce() {
        val rec = RecordingAudio()
        val m = mount("chess", rec) { it.start(0) }
        m.ctl.resign()
        assertEquals(listOf(Sfx.DENIED), rec.played)
        Rng.unseed()
    }
}
