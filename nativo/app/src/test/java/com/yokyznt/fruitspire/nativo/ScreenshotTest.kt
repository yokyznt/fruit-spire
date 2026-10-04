package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.click
import androidx.compose.ui.test.performTouchInput
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.nativo.ui.RewardScreen
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.nativo.ui.ActIntroScreen
import com.yokyznt.fruitspire.nativo.ui.CharacterSelectScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.MapPan
import com.yokyznt.fruitspire.nativo.ui.MapScreen
import com.yokyznt.fruitspire.nativo.ui.mapViewOf
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.SettingsWindow
import com.yokyznt.fruitspire.nativo.ui.notebookPaper
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Capturas de cada pantalla, hechas en la PC (sin teléfono ni emulador), con el tamaño de
 * pantalla de un teléfono horizontal. Quedan en app/build/capturas/.
 *   gradlew :app:testDebugUnitTest
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class ScreenshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun shot(name: String, content: @Composable () -> Unit) {
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize().notebookPaper()) { content() } } }
        compose.onRoot().captureRoboImage("build/capturas/$name.png")
    }

    @Test
    fun menu() = shot("menu") {
        MenuScreen(false, {}, {}, {}, {}, {}, {}, {}, {})
    }

    @Test
    fun ajustes() = shot("ajustes") {
        MenuScreen(false, {}, {}, {}, {}, {}, {}, {}, {})
        SettingsWindow(Settings(ApplicationProvider.getApplicationContext())) {}
    }

    @Test
    fun elegirFruta() = shot("elegir_fruta") {
        CharacterSelectScreen(Progress(), "kiwi", "madura", {}, {}, {}, {})
    }

    @Test
    fun mapa() = shot("mapa") {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        // un par de pasos para que haya casillas pisadas
        repeat(2) {
            val x = run.pos.x; val y = run.pos.y
            val next = listOf(x + 1 to y, x to y - 1, x to y + 1).firstOrNull { run.isReachable(it.first, it.second) }
            if (next != null) run.arrive(next.first, next.second)
        }
        MapScreen(mapViewOf(run), run.pos.x to run.pos.y, false, 1.25f, MapPan(), { _, _ -> }, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun combate() = shot("combate") {
        Rng.seed(11)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        val ctl = androidx.compose.runtime.remember {
            lateinit var c: CombatController
            val combat = run.startCombat(PendingCombat(listOf("avispa_furiosa", "mosca_podrida"), "enemy"), onEnd = { c.onEnd(it) })
            CombatController(run, combat, scope, {}, {}).also { c = it }
        }
        CombatScreen(ctl, "kitchen")
        HudBar(hudStateOf(run), {}, {}, {}, {}, compact = true)
    }

    @Test
    fun mapaInicio() = shot("mapa_inicio") {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        MapScreen(mapViewOf(run), run.pos.x to run.pos.y, false, 1.25f, MapPan(), { _, _ -> }, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    /** Toca con el dedo (de mentiras) la primera casilla a la que se puede ir y comprueba que el mapa avisa. */
    @Test
    fun tocarLaPrimeraCasillaMueve() {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val view = mapViewOf(run)
        val pan = MapPan()
        var moved: Pair<Int, Int>? = null
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize()) { MapScreen(view, run.pos.x to run.pos.y, false, 1.25f, pan, { x, y -> moved = x to y }, {}) } } }
        compose.waitForIdle()
        val key = view.reachable.first()
        val cx = key % 1000
        val cy = key / 1000
        val h = compose.onRoot().fetchSemanticsNode().size.height
        val d = h / 660f
        val x = pan.anim.value.x + (com.yokyznt.fruitspire.nativo.ui.cellPos(cx) + 62f) * 1.25f * d
        val y = pan.anim.value.y + (com.yokyznt.fruitspire.nativo.ui.cellPos(cy) + 62f) * 1.25f * d
        compose.onRoot().performTouchInput { click(androidx.compose.ui.geometry.Offset(x, y)) }
        compose.waitForIdle()
        org.junit.Assert.assertEquals("la casilla tocada ($cx,$cy) debía avisar", cx to cy, moved)
    }

    @Test
    fun recompensa() = shot("recompensa") {
        Rng.seed(21)
        val run = Run.start("kiwi", "madura")
        run.beginFloor()
        val pc = PendingCombat(listOf("babosa_viscosa"), "elite")
        val c = run.startCombat(pc)
        c.enemies.forEach { it.hp = 0 }
        run.finishCombat("win")
        RewardScreen(run, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun portadaDePiso() = shot("portada") {
        Rng.seed(3)
        val run = Run.start("manzana", "madura")
        ActIntroScreen(run) {}
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }
}
