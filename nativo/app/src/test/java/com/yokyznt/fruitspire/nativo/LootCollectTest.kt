package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.LootItem
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Duration

/**
 * Tocar un premio en la pantalla de un evento lo recoge de verdad: se suma a lo que llevas, la barra de arriba lo muestra, el
 * premio queda como recogido (ya no se puede volver a tocar) y «Continuar» se activa. Estas pantallas reciben la partida mutable
 * (`Run`) y se redibujan solo por `GameViewModel.tick`: con «strong skipping» de Compose se quedaban con lo viejo.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class LootCollectTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    /** Deja pasar los cuadros que Compose necesita para redibujar tras un cambio. */
    private fun settle() {
        advance(500)
        repeat(8) { compose.mainClock.advanceTimeByFrame() }
        advance(500)
    }

    /** Una partida en la pantalla de resultado de un evento con [prize] por recoger. */
    private fun eventResultWith(prize: LootItem): Run {
        Rng.seed(11)
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.play(); advance(100)
        vm.beginFloor(); advance(100)
        val run = vm.run!!
        run.screen = RunScreen.EVENT_RESULT
        run.nodeMessage = "Te dan algo."
        run.loot.add(prize)
        vm.setPicker(null) // solo para que la pantalla se redibuje
        settle()
        return run
    }

    @Test
    fun tappingACardPrizeTakesItAndTheScreenFollows() {
        val id = Cards.all().first().id
        val run = eventResultWith(LootItem("card", id = id))
        val before = run.player.deck.size
        val name = Cards.get(id)!!.name
        compose.onAllNodesWithText(name).onFirst().performClick()
        settle()
        assertTrue("el premio quedó recogido", run.loot[0].taken)
        assertEquals(before + 1, run.player.deck.size)
        assertTrue("la barra de arriba cuenta la carta nueva", compose.onAllNodesWithText("${before + 1}").fetchSemanticsNodes().isNotEmpty())
        compose.onAllNodesWithText(name).onFirst().assertIsNotEnabled()
        compose.onNodeWithText("Continuar").assertIsEnabled()
        Rng.unseed()
    }

    @Test
    fun tappingGoldTakesItAndTheScreenFollows() {
        val run = eventResultWith(LootItem("gold", n = 25))
        val before = run.player.gold
        compose.onNodeWithText("+25 de oro").performClick()
        settle()
        assertTrue(run.loot[0].taken)
        assertEquals(before + 25, run.player.gold)
        assertTrue("la barra de arriba muestra el oro nuevo", compose.onAllNodesWithText("${before + 25}").fetchSemanticsNodes().isNotEmpty())
        compose.onNodeWithText("+25 de oro").assertIsNotEnabled() // ya no se puede volver a tocar
        compose.onNodeWithText("Continuar").assertIsEnabled()
        Rng.unseed()
    }

    @Test
    fun tappingAnObjectTakesItAndTheScreenFollows() {
        val relic = Relics.db.values.first { it.tier == "common" }
        val run = eventResultWith(LootItem("relic", id = relic.id))
        val before = run.player.relics.size
        compose.onAllNodesWithText(relic.name).onFirst().performClick()
        settle()
        assertTrue(run.loot[0].taken)
        assertEquals(before + 1, run.player.relics.size)
        compose.onAllNodesWithText(relic.name).onFirst().assertIsNotEnabled()
        compose.onNodeWithText("Continuar").assertIsEnabled()
        Rng.unseed()
    }
}
