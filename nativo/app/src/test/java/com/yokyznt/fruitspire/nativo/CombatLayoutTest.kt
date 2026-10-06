package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Revisión de diseño del combate: el mismo combate en varias proporciones de pantalla (el lienzo mide siempre 660 de
 * alto y lo que cambia es el ancho) y con los casos más apretados (3 enemigos, nombres largos, estados, jefe, carta elegida).
 * Las capturas quedan en app/build/capturas/combate_<escenario>_<proporcion>.png
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xhdpi")
class CombatLayoutTest {
    @get:Rule
    val compose = createComposeRule()

    /** Lo que mide la pantalla en dp: el alto es el de la prueba y el ancho sale de la proporción. */
    private class Ratio(val tag: String, val w: Int)

    private val wide = Ratio("20x9", 911)   // el Nothing de pruebas: 2392x1080
    private val sixteenNine = Ratio("16x9", 731)
    private val fourThree = Ratio("4x3", 548)

    private fun scenario(
        name: String, ratio: Ratio, enemies: List<String>, kind: String = "enemy",
        prep: (com.yokyznt.fruitspire.core.Combat) -> Unit = {}, after: (CombatController) -> Unit = {}
    ) {
        compose.mainClock.autoAdvance = false
        var holder: CombatController? = null
        compose.setContent {
            Box(Modifier.size(ratio.w.dp, 411.dp).testTag("c")) {
                DesignCanvas {
                    Box(Modifier.fillMaxSize()) {
                        Rng.seed(11)
                        val run = remember { Run.start("manzana", "madura").also { it.beginFloor() } }
                        val scope = rememberCoroutineScope()
                        val ctl = remember {
                            lateinit var c: CombatController
                            val combat = run.startCombat(PendingCombat(enemies, kind), onEnd = { c.onEnd(it) })
                            prep(combat)
                            CombatController(run, combat, scope, {}, {}).also { c = it }
                        }
                        CombatScreen(ctl, "kitchen")
                        HudBar(hudStateOf(run), {}, {}, {}, {}, compact = true)
                        holder = ctl
                    }
                }
            }
        }
        compose.mainClock.advanceTimeBy(3500)
        // lo que hace el jugador una vez que ya terminó la entrada del combate (elegir una carta, por ejemplo)
        holder?.let { after(it) }
        compose.mainClock.advanceTimeBy(900)
        compose.onNodeWithTag("c").captureRoboImage("build/capturas/combate_${name}_${ratio.tag}.png")
    }

    private val trio = listOf("mosca_podrida", "avispa_furiosa", "babosa_viscosa")
    private val longNames = listOf("caballero_cuchillas", "capitan_guardia", "robot_gigante")

    private fun withStatuses(c: com.yokyznt.fruitspire.core.Combat) {
        c.player.addBlock(12)
        c.player.addStatus("strength", 3)
        c.player.addStatus("weak", 2)
        c.enemies.forEachIndexed { i, e ->
            e.addStatus("vulnerable", 2 + i)
            if (i % 2 == 0) e.addStatus("poison", 4)
            if (i == 1) e.addStatus("strength", 2)
            e.addBlock(6 * i)
        }
    }

    @Test fun solo_20x9() = scenario("solo", wide, listOf("avispa_furiosa"))
    @Test fun solo_16x9() = scenario("solo", sixteenNine, listOf("avispa_furiosa"))
    @Test fun solo_4x3() = scenario("solo", fourThree, listOf("avispa_furiosa"))

    @Test fun dos_20x9() = scenario("dos", wide, listOf("avispa_furiosa", "mosca_podrida"))
    @Test fun dos_16x9() = scenario("dos", sixteenNine, listOf("avispa_furiosa", "mosca_podrida"))

    @Test fun tres_20x9() = scenario("tres", wide, trio)
    @Test fun tres_16x9() = scenario("tres", sixteenNine, trio)
    @Test fun tres_4x3() = scenario("tres", fourThree, trio)

    @Test fun nombresLargos_20x9() = scenario("largos", wide, longNames, prep = ::withStatuses)
    @Test fun nombresLargos_16x9() = scenario("largos", sixteenNine, longNames, prep = ::withStatuses)
    @Test fun nombresLargos_4x3() = scenario("largos", fourThree, longNames, prep = ::withStatuses)

    @Test fun cuatro_16x9() = scenario("cuatro", sixteenNine, trio + "mosca_podrida", prep = ::withStatuses)

    @Test fun jefe_20x9() = scenario("jefe", wide, listOf("espantapajaros"), kind = "boss", prep = ::withStatuses)
    @Test fun jefe_16x9() = scenario("jefe", sixteenNine, listOf("espantapajaros"), kind = "boss", prep = ::withStatuses)

    @Test fun cartaElegida_20x9() = scenario("carta", wide, listOf("avispa_furiosa"), after = { it.select(1) })
    @Test fun cartaElegida_16x9() = scenario("carta", sixteenNine, listOf("avispa_furiosa"), after = { it.select(1) })
}
