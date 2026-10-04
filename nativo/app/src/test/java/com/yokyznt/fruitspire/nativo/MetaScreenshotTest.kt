package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Pass
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.LocalProgress
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.PassScreen
import com.yokyznt.fruitspire.nativo.ui.RewardScreen
import com.yokyznt.fruitspire.nativo.ui.WardrobeScreen
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

/** Capturas del Pase de Batalla, el vestidor y los avisos de experiencia y mascotas, con toques de mentiras. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class MetaScreenshotTest {
    @get:Rule
    val compose = createComposeRule()

    private fun shot(name: String, progress: Progress, content: @Composable () -> Unit) {
        compose.setContent {
            DesignCanvas { CompositionLocalProvider(LocalProgress provides progress) { Box(Modifier.fillMaxSize().notebookPaper()) { content() } } }
        }
        compose.onRoot().captureRoboImage("build/capturas/meta_$name.png")
    }

    /** Una colección a medio hacer: algo de experiencia, premios reclamados, una mascotita y ropa puesta. */
    private fun halfWay(): Progress = Progress().also { p ->
        Pass.addXp(p, 900)
        Pass.claimAll(p).forEach { p.equip("manzana", it.id) }
        Pass.addXp(p, 300) // quedan premios por reclamar
        p.grantCosmetic("pet_cereza")
        p.equip("manzana", "pet_cereza")
        p.equip("manzana", "gorra")
    }

    @Test fun pase() { val p = halfWay(); shot("pase", p) { PassScreen(p, 0, {}, {}, {}, {}) } }

    @Test fun vestidor() { val p = halfWay(); shot("vestidor_manzana", p) { WardrobeScreen(p, "manzana", 0, {}, {}, {}, {}) } }

    @Test fun vestidorKiwi() { val p = halfWay(); shot("vestidor_kiwi", p) { WardrobeScreen(p, "kiwi", 0, {}, {}, {}, {}) } }

    @Test fun menuConInsignia() { val p = halfWay(); shot("menu", p) { MenuScreen(false, {}, {}, {}, {}, {}, {}, {}, {}, passBadge = Pass.unclaimed(p)) } }

    @Test
    fun premiosConExperienciaYMascota() {
        Rng.seed(11)
        val progress = Progress().also { Pass.addXp(it, 60) }
        val run = Run.start("manzana", "madura", progress)
        run.beginFloor()
        run.player.act = 2
        run.player.floor = 3
        val c = run.startCombat(PendingCombat(listOf("cubilete_maldito"), "boss"))
        c.xpGained = 90
        run.finishCombat("win")
        assertEquals(listOf("pet_cereza"), run.newPets.map { it.id })
        shot("premios", progress) { RewardScreen(run, {}, {}, {}, {}); HudBar(hudStateOf(run), {}, {}, {}, {}) }
        Rng.unseed()
    }

    /** Pulsar «Reclamar» en el primer premio pide reclamar ese nivel. */
    @Test
    fun reclamarConElDedo() {
        val p = Progress().also { Pass.addXp(it, 200) }
        var claimed = -1
        compose.setContent {
            DesignCanvas { CompositionLocalProvider(LocalProgress provides p) { Box(Modifier.fillMaxSize()) { PassScreen(p, 0, { claimed = it }, {}, {}, {}) } } }
        }
        compose.onAllNodesWithText("Reclamar")[0].performClick()
        assertEquals(1, claimed)
        assertTrue(Pass.state(p).level >= 2)
    }

    /** Tocar una prenda del vestidor pide ponérsela. */
    @Test
    fun ponerseAlgoConElDedo() {
        val p = halfWay()
        var worn: String? = null
        compose.setContent {
            DesignCanvas { CompositionLocalProvider(LocalProgress provides p) { Box(Modifier.fillMaxSize()) { WardrobeScreen(p, "manzana", 0, {}, { worn = it }, {}, {}) } } }
        }
        compose.onNodeWithText("Gorra").performClick()
        assertEquals("gorra", worn)
    }
}
