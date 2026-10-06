package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.nativo.ui.AscendUi
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.StairsFrame
import com.yokyznt.fruitspire.nativo.ui.StairsTiming
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Duration

/** La escalera de subir de piso: capturas de la escena en varios momentos y su enganche con el flujo del jefe. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class StairsSceneTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    @Test
    fun capturasDeLaEscena() {
        var p by androidx.compose.runtime.mutableFloatStateOf(.08f)
        var castle by androidx.compose.runtime.mutableIntStateOf(1)
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize()) { StairsFrame(AscendUi(1, "manzana", 2, castle, false), p) } } }
        for ((name, pp, cc) in listOf(Triple("inicio", .08f, 1), Triple("subiendo", .4f, 1), Triple("casi", .72f, 2), Triple("luz", .93f, 3))) {
            p = pp; castle = cc
            compose.waitForIdle()
            compose.onRoot().captureRoboImage("build/capturas/escalera_${name}.png")
        }
    }

    private fun bossWonVm(seed: Int): Pair<GameViewModel, com.yokyznt.fruitspire.core.Run> {
        Rng.seed(seed)
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.play(); vm.finishStory(); advance(100)
        vm.beginFloor(); advance(100)
        val run = vm.run!!
        // el guardián del primer piso ya vencido: sin premios por recoger y «siguiente piso» como lo que viene
        run.afterReward = "next-floor"
        run.screen = RunScreen.REWARD
        run.rewardCards = emptyList()
        vm.setPicker(null); advance(300)
        return vm to run
    }

    /** Vencer al jefe y seguir: primero sube la escalera (la partida ya está en la portada del piso nuevo) y al terminar se descubre. */
    @Test
    fun alVencerAUnJefeSeSubeLaEscaleraYLuegoSalePortada() {
        val (vm, run) = bossWonVm(7)
        assertNull(vm.ascend)
        val floorBefore = run.player.floor
        vm.continueReward(); advance(300)
        assertEquals(floorBefore + 1, run.player.floor)
        assertEquals(RunScreen.ACT_INTRO, run.screen)
        assertNotNull("la escalera se muestra", vm.ascend)
        advance(1200)
        compose.onRoot().captureRoboImage("build/capturas/escalera_en_juego.png")
        assertNotNull("sigue subiendo a mitad de camino", vm.ascend)
        advance(StairsTiming.TOTAL.toLong())
        assertNull("al terminar se descubre la portada", vm.ascend)
        Rng.unseed()
    }

    @Test
    fun saltarLaEscaleraLaQuita() {
        val (vm, _) = bossWonVm(8)
        vm.continueReward(); advance(300)
        assertNotNull(vm.ascend)
        vm.finishAscend(); advance(100)
        assertNull(vm.ascend)
        Rng.unseed()
    }
}
