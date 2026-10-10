package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.Fx
import com.yokyznt.fruitspire.nativo.ui.LocalDesignWidth
import com.yokyznt.fruitspire.nativo.ui.MIN_DESIGN_W
import com.yokyznt.fruitspire.nativo.ui.idleAnim
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Los arreglos de la auditoría de lanzamiento: ajustes que de verdad hacen algo, lienzo en ventanas estrechas y fin de turno. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w411dp-h891dp-port-xxhdpi")
class AuditFixesTest {
    @get:Rule
    val compose = createComposeRule()

    @After fun reset() { Fx.calm = false; Fx.lite = false }

    @Test
    fun theNewSettingsAreSavedAndSeenAfterReopening() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val s = Settings(app)
        assertEquals("normal", s.pace); assertFalse(s.confirmEnd); assertEquals("bonito", s.graphics)
        s.putPace("rapido"); s.putConfirmEnd(true); s.putGraphics("rapido")
        val again = Settings(app)
        assertEquals("rapido", again.pace); assertTrue(again.confirmEnd); assertEquals("rapido", again.graphics)
        assertEquals(.6f, again.paceFactor, 1e-6f)
        again.putPace("normal"); again.putConfirmEnd(false); again.putGraphics("bonito")
    }

    @Test
    fun withFewerAnimationsTheIdleOnesStayStill() {
        Fx.calm = true
        var seen = -1f
        compose.setContent {
            val v by idleAnim(0f, 1f, infiniteRepeatable(tween(1000, easing = LinearEasing)), "prueba", rest = .25f)
            seen = v
        }
        compose.mainClock.advanceTimeBy(700)
        assertEquals("quieta en su pose de reposo", .25f, seen, 1e-6f)
    }

    @Test
    fun aNarrowOrPortraitWindowKeepsTheMinimumDesignWidthAndShrinksTheGame() {
        var designW = 0f
        var scale = 0f
        compose.setContent {
            DesignCanvas {
                designW = LocalDesignWidth.current
                scale = LocalDensity.current.density
            }
        }
        compose.waitForIdle()
        assertTrue("el ancho de diseño no baja de $MIN_DESIGN_W (era $designW)", designW >= MIN_DESIGN_W - 0.5f)
        // 411 dp en xxhdpi (densidad 3) = 1233 px de ancho: el juego se escala por el ancho (no por el alto, que daría 4,05)
        assertEquals("escala por ancho", 411f * 3f / MIN_DESIGN_W, scale, 0.01f)
        assertEquals("ancho de diseño", MIN_DESIGN_W, designW, 0.5f)
    }

    @Test
    fun endTurnWithPlayableCardsAsksOnceWhenTheSettingIsOn() {
        Rng.seed(11)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val toasts = ArrayList<String>()
        lateinit var ctl: CombatController
        compose.mainClock.autoAdvance = false
        compose.setContent {
            val scope = rememberCoroutineScope()
            ctl = remember {
                lateinit var c: CombatController
                val combat = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "enemy"), onEnd = { c.onEnd(it) })
                CombatController(run, combat, scope, { toasts.add(it) }, {}).also { c = it; it.confirmEnd = { true } }
            }
        }
        compose.mainClock.advanceTimeBy(3_000) // la entrada al combate
        assertTrue("puede jugar", ctl.canPlayNow())
        ctl.endTurn()
        assertEquals("la primera vez solo avisa", 1, toasts.size)
        assertTrue("sigue siendo tu turno", ctl.canPlayNow())
        ctl.endTurn()
        assertFalse("la segunda vez sí termina el turno", ctl.canPlayNow())
        Rng.unseed()
    }
}
