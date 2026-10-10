package com.yokyznt.fruitspire.nativo

import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.test.junit4.createComposeRule
import com.yokyznt.fruitspire.core.CombatEvent
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.nativo.ui.CombatController
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Los efectos del combate que faltaban respecto a la web (js/fx.js `spawnEffect`): el objeto que se activa salta sobre la mochila
 * y la pulsa, entrar energía pulsa la naranja, y revivir o invocar suelta humo; la cosecha estalla sobre el viñedo.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class CombatFxEventsTest {
    @get:Rule
    val compose = createComposeRule()
    private lateinit var ctl: CombatController

    @Test
    fun energyRelicReviveSummonAndHarvestPlayTheirEffects() {
        Rng.seed(11)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        compose.mainClock.autoAdvance = false
        compose.setContent {
            val scope = rememberCoroutineScope()
            ctl = remember {
                lateinit var c: CombatController
                val combat = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "enemy"), onEnd = { c.onEnd(it) })
                CombatController(run, combat, scope, {}, {}).also { c = it }
            }
        }
        val relic = Relics.db.keys.first()
        assertEquals(0, ctl.orangeBump); assertEquals(0, ctl.bagBump)
        ctl.spawnFx(
            listOf(
                CombatEvent("energy", "player", 1),
                CombatEvent("relic", "player", 0, mapOf("relicId" to relic)),
                CombatEvent("revive", "enemy-0", 0),
                CombatEvent("summon", "enemy-0", 0),
                CombatEvent("harvest", "player", 0, mapOf("sprout" to "ninguno"))
            ),
            null
        )
        compose.mainClock.advanceTimeBy(700) // los efectos salen escalonados (130 ms entre uno y otro)
        assertEquals("la naranja pulsa", 1, ctl.orangeBump)
        assertEquals("la mochila pulsa", 1, ctl.bagBump)
        assertEquals("el objeto salta", relic, ctl.relicPops.single().relicId)
        assertEquals("humo al revivir y al invocar", 2, ctl.hits.count { it.kind == "puff" })
        assertTrue("la cosecha estalla sobre el viñedo", ctl.hits.any { it.kind == "harvest" && it.anchor == "garden" })
        compose.mainClock.advanceTimeBy(1_500)
        assertEquals("el objeto ya se fue", 0, ctl.relicPops.size)
        assertEquals("los estallidos ya se fueron", 0, ctl.hits.size)
        Rng.unseed()
    }
}
