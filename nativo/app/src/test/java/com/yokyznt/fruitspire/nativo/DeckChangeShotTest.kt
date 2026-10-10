package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.DeckChange
import com.yokyznt.fruitspire.core.LootItem
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.EventResultScreen
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import com.yokyznt.fruitspire.nativo.ui.notebookPaper
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * El revelado de cambios del mazo en la pantalla de resultado de un evento, en tres momentos (con premios por recoger, que es
 * cuando más apretada queda): la vieja girando, los destellos con la nueva ya asentada, y el final con las etiquetas.
 * Capturas en app/build/capturas/cambios_mazo_*.png.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class DeckChangeShotTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun deckChangesFitWithPrizesAndPlayThrough() {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val ids = Cards.all().map { it.id }
        run.nodeMessage = "Un hada toca tu mazo."
        run.deckChanges = listOf(
            DeckChange("transform", ids[0], ids[1]),
            DeckChange("upgrade", ids[2], ids[2] + "+"),
            DeckChange("remove", ids[3], null)
        )
        run.loot.add(LootItem("gold", n = 25))
        run.loot.add(LootItem("relic", id = Relics.db.keys.first()))
        compose.mainClock.autoAdvance = false
        compose.setContent {
            DesignCanvas {
                Box(Modifier.fillMaxSize().notebookPaper()) {
                    EventResultScreen(run, {}, {}, {})
                    HudBar(hudStateOf(run), {}, {}, {}, {})
                }
            }
        }
        compose.mainClock.advanceTimeBy(1_000) // la vieja ya gira
        compose.onRoot().captureRoboImage("build/capturas/cambios_mazo_1.png")
        compose.mainClock.advanceTimeBy(750) // 1,75 s: destellos y la nueva casi asentada
        compose.onRoot().captureRoboImage("build/capturas/cambios_mazo_2.png")
        compose.mainClock.advanceTimeBy(1_000) // final, con etiquetas
        compose.onRoot().captureRoboImage("build/capturas/cambios_mazo_3.png")
        Rng.unseed()
    }
}
