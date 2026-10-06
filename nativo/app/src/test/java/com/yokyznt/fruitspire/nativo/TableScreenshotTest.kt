package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.test.click
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipe
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Casino
import com.yokyznt.fruitspire.core.RoulettePick
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.Table
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.TableController
import com.yokyznt.fruitspire.nativo.ui.TableScreen
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import com.yokyznt.fruitspire.nativo.ui.notebookPaper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Capturas de las mesas de juego y dos pruebas con toques de mentiras. Quedan en app/build/capturas/mesa_*.png. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class TableScreenshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun runWith(kind: String, seed: Int = 7, act: Int = 2): Pair<Run, Table> {
        Rng.seed(seed)
        val run = Run.start("manzana", "madura").also { it.beginFloor(); it.player.gold = 120; it.player.act = act }
        run.openMinigame(kind)
        return run to run.table!!
    }

    @Composable
    private fun Mesa(run: Run, table: Table) {
        val scope = rememberCoroutineScope()
        val ctl = remember { TableController(run, table, scope, {}, {}, {}) }
        TableScreen(run, ctl, 0, { run.collectLoot(it) }, { run.dropLoot(it) }, { run.leaveNode() })
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    private fun shot(name: String, kind: String, seed: Int = 7, setup: (Run, Table) -> Unit = { _, _ -> }) {
        val (run, table) = runWith(kind, seed)
        setup(run, table)
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize().notebookPaper()) { Mesa(run, table) } } }
        compose.onRoot().captureRoboImage("build/capturas/mesa_$name.png")
        Rng.unseed()
    }

    @Test fun dadosPresentacion() = shot("dados_apuesta", "dice")
    @Test fun ajedrezPresentacion() = shot("ajedrez_inicio_reglas", "chess")

    @Test fun dadosJugando() = shot("dados_jugando", "dice") { _, t ->
        t.start(25)
        t.dicePlayer.addAll(listOf(4, 6, 5)); t.diceHouse.addAll(listOf(5, 3))
    }

    @Test fun dadosGanas() = shot("dados_resultado", "dice") { _, t ->
        t.start(25)
        t.dicePlayer.addAll(listOf(6, 6, 6)); t.diceHouse.addAll(listOf(6, 6, 4)); t.diceSettle()
    }

    @Test fun pokerJugando() = shot("poker_jugando", "poker") { _, t ->
        t.start(25)
        t.pokerToggle(0); t.pokerToggle(3)
    }

    @Test fun pokerResultado() = shot("poker_resultado", "poker") { _, t ->
        t.start(50)
        t.pokerToggle(1)
        t.pokerShow()
    }

    @Test fun tragamonedas() = shot("tragamonedas", "slots") { _, t -> t.start(25) }

    @Test fun tragamonedasResultado() = shot("tragamonedas_resultado", "slots") { _, t ->
        t.start(25); t.slotsDraw(); t.slotsSettle()
    }

    @Test fun ruleta() = shot("ruleta", "roulette") { _, t -> t.start(10); t.roulettePick(RoulettePick.Number(7)) }

    @Test fun ruletaResultado() = shot("ruleta_resultado", "roulette") { _, t ->
        t.start(10); t.roulettePick(RoulettePick.Red); t.rouletteSpin(); t.rouletteSettle()
    }

    @Test fun ajedrezJugando() = shot("ajedrez_jugando", "chess") { _, t ->
        t.start(0)
        t.chessClick(4, 2); t.chessClick(3, 2)
        t.chessEnemyMove()
        t.chessClick(5, 1)
    }

    @Test fun ajedrezResultado() = shot("ajedrez_resultado", "chess") { _, t ->
        t.start(0)
        t.board = Array(Casino.ROWS) { arrayOfNulls<Casino.Piece>(Casino.COLS) }.also {
            it[2][1] = Casino.Piece('R', 0); it[2][3] = Casino.Piece('P', 1); it[5][4] = Casino.Piece('K', 0)
        }
        t.chessMove(Casino.Move(2, 1, 2, 3))
    }

    /** Pulsar «Tirar un dado» hace girar el dado y, pasado el tiempo, el núcleo recibe el dado. */
    @Test
    fun tirarUnDadoConElDedo() {
        val (run, table) = runWith("dice")
        table.start(10)
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize().notebookPaper()) { Mesa(run, table) } } }
        compose.onNodeWithText("Tirar un dado").performClick()
        compose.mainClock.advanceTimeBy(2000)
        compose.waitForIdle()
        assertEquals(1, table.dicePlayer.size)
        assertTrue(table.dicePlayer[0] in 1..6)
        Rng.unseed()
    }

    private fun chessSetup(): Pair<Run, Table> {
        val (run, table) = runWith("chess", act = 1)
        table.start(0)
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize().notebookPaper()) { Mesa(run, table) } } }
        return run to table
    }

    /** Tocar una pieza y luego su destino mueve la pieza; el rival responde solo. */
    @Test
    fun ajedrezTocarYMover() {
        val (_, table) = chessSetup()
        val board = compose.onNodeWithTag("tablero")
        // la mesa se agranda para llenar la pantalla: los toques de la prueba se miden en píxeles de pantalla, ya con esa escala
        val cs = board.fetchSemanticsNode().let { it.boundsInRoot.width } / 5f
        board.performTouchInput { click(Offset(cs * 2.5f, cs * 4.5f)) }   // el peón del centro
        compose.waitForIdle()
        assertEquals(4 to 2, table.sel!!.let { it.r to it.c })
        board.performTouchInput { click(Offset(cs * 2.5f, cs * 3.5f)) }   // una casilla adelante
        compose.waitForIdle()
        assertEquals('P', table.board[3][2]!!.t)
        assertEquals("enemy", table.turn)
        compose.mainClock.advanceTimeBy(1500)
        compose.waitForIdle()
        assertEquals(2, table.plies)
        assertEquals("player", table.turn)
        Rng.unseed()
    }

    /** Arrastrar una pieza hasta su destino la mueve. */
    @Test
    fun ajedrezArrastrar() {
        val (_, table) = chessSetup()
        val board = compose.onNodeWithTag("tablero")
        val cs = board.fetchSemanticsNode().let { it.boundsInRoot.width } / 5f
        board.performTouchInput { swipe(Offset(cs * 0.5f, cs * 4.5f), Offset(cs * 0.5f, cs * 3.5f), durationMillis = 300) }
        compose.waitForIdle()
        assertEquals('P', table.board[3][0]!!.t)
        assertTrue(table.board[4][0] == null)
        assertTrue("la jugada se cuenta", table.plies >= 1)
        Rng.unseed()
    }

    /** Apostar desde la presentación paga la apuesta y cambia a la mesa. */
    @Test
    fun apostarDesdeLaPresentacion() {
        val (run, table) = runWith("poker")
        val before = run.player.gold
        var rev by mutableIntStateOf(0)
        compose.setContent {
            DesignCanvas {
                Box(Modifier.fillMaxSize().notebookPaper()) {
                    val scope = rememberCoroutineScope()
                    val ctl = remember { TableController(run, table, scope, {}, { rev++ }, {}) }
                    TableScreen(run, ctl, rev, {}, {}, {})
                }
            }
        }
        compose.onNodeWithText("25").performClick()
        compose.waitForIdle()
        assertEquals("play", table.phase)
        assertEquals(before - 25, run.player.gold)
        assertEquals(RunScreen.MINIGAME, run.screen)
        Rng.unseed()
    }
}
