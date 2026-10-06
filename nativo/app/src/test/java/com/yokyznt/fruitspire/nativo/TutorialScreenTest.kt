package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Duration

/** El tutorial «Cómo jugar» en la pantalla: Profe Limón, el bloqueo de lo que no toca y el avance paso a paso. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class TutorialScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    private fun settle() { advance(500); repeat(8) { compose.mainClock.advanceTimeByFrame() }; advance(500) }

    private fun start(): GameViewModel {
        Rng.seed(5)
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.startTutorial(); settle()
        return vm
    }

    @Test
    fun profeLimonSaludaYNoDejaMoverseHastaQueSeLeanLosPasosDeLectura() {
        val vm = start()
        assertEquals(RunScreen.MAP, vm.run!!.screen)
        assertEquals(0, vm.tutorial!!.i)
        assertTrue("Profe Limón habla", compose.onAllNodesWithText("Profe Limón", substring = true).fetchSemanticsNodes().isNotEmpty())
        compose.onRoot().captureRoboImage("build/capturas/tutorial_1_saludo.png")
        // un paso de lectura: tocar una casilla no hace nada
        vm.moveTo(1, 1); settle()
        assertNull(vm.moving); assertEquals("0,1", vm.run!!.pos.key)
        // «Siguiente» ×3 llega al primer paso de acción (tocar el enemigo)
        repeat(3) { vm.tutAdvance(); settle() }
        assertEquals(3, vm.tutorial!!.i)
        assertTrue(compose.onAllNodesWithText("enemigo", substring = true).fetchSemanticsNodes().isNotEmpty())
        compose.onRoot().captureRoboImage("build/capturas/tutorial_2_toca_enemigo.png")
        // ahora sí: tocar la casilla del enemigo lleva al combate y el tutorial sigue por sí solo
        vm.moveTo(1, 1); advance(3500); settle()
        assertEquals(RunScreen.COMBAT, vm.run!!.screen)
        assertEquals("avispa_furiosa", vm.run!!.combat!!.enemies[0].defId)
        assertEquals(4, vm.tutorial!!.i)
        compose.onRoot().captureRoboImage("build/capturas/tutorial_3_combate.png")
        Rng.unseed()
    }

    /** Cada paso del primer combate: Profe Limón queda al lado de lo que enseña y todo lo demás se oscurece (capturas tutorial_c<paso>.png). */
    @Test
    fun enCadaPasoDelCombateProfeLimonQuedaAlLadoDeLoQueEnsena() {
        val vm = start()
        repeat(3) { vm.tutAdvance(); settle() }
        vm.moveTo(1, 1); advance(3500); settle()
        assertEquals(RunScreen.COMBAT, vm.run!!.screen)
        repeat(8) {
            val i = vm.tutorial!!.i
            compose.onRoot().captureRoboImage("build/capturas/tutorial_c$i.png")
            if (vm.tutorial!!.step?.next != true) return@repeat
            vm.tutAdvance(); settle()
        }
        Rng.unseed()
    }

    @Test
    fun salirPreguntaYElTutorialSeDescarta() {
        val vm = start()
        assertNotNull(vm.tutorial)
        vm.tutQuit(null); settle()
        assertTrue(vm.tutorial!!.quitAsk)
        compose.onRoot().captureRoboImage("build/capturas/tutorial_4_salir.png")
        vm.tutQuit(false); settle()
        assertTrue(!vm.tutorial!!.quitAsk)
        vm.tutQuit(true); settle()
        assertNull("al salir el tutorial se descarta", vm.run)
        assertEquals(AppScreen.MENU, vm.screen)
        Rng.unseed()
    }
}
