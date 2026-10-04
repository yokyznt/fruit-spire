package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Progress
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
    fun portadaDePiso() = shot("portada") {
        Rng.seed(3)
        val run = Run.start("manzana", "madura")
        ActIntroScreen(run) {}
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }
}
