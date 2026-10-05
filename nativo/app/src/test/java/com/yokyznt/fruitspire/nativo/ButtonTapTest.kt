package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.CharacterSelectScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.LocalAudio
import com.yokyznt.fruitspire.nativo.ui.SettingsWindow
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Cualquier botón habilitado de la web hace un «tap» suave (`setupUiClicks` de js/fx.js): también los que no son botones de pegatina. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class ButtonTapTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun theDeckChipOfTheTopBarTaps() {
        Rng.seed(3)
        val run = Run.start("manzana", "madura").also { it.beginFloor() }
        val rec = RecordingAudio()
        var deck = 0
        compose.setContent {
            DesignCanvas { CompositionLocalProvider(LocalAudio provides rec) { Box(Modifier.fillMaxSize()) { HudBar(hudStateOf(run), {}, {}, { deck++ }, {}) } } }
        }
        compose.onNodeWithText("Mazo").performClick()
        assertEquals(1, deck)
        assertEquals(listOf(Sfx.TAP), rec.played)
        Rng.unseed()
    }

    @Test
    fun aGradeChipOnTheFruitScreenTaps() {
        val rec = RecordingAudio()
        var picked = ""
        compose.setContent {
            DesignCanvas {
                CompositionLocalProvider(LocalAudio provides rec) {
                    Box(Modifier.fillMaxSize()) { CharacterSelectScreen(Progress(), "manzana", "madura", {}, { picked = it }, {}, {}, {}) }
                }
            }
        }
        compose.onNodeWithText(World.difficulties[0].name).performClick()
        assertEquals(World.difficulties[0].id, picked)
        assertEquals(listOf(Sfx.TAP), rec.played)
    }

    @Test
    fun theSettingsControlsTapAndTheAudioHearsTheChange() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val rec = RecordingAudio()
        val settings = Settings(app).also { it.onChanged = { k -> rec.settingChanged(k) } }
        compose.setContent { DesignCanvas { CompositionLocalProvider(LocalAudio provides rec) { Box(Modifier.fillMaxSize()) { SettingsWindow(settings) {} } } } }
        compose.onAllNodesWithText("Lejos")[0].performClick()
        assertEquals("un segmento = tap", listOf(Sfx.TAP), rec.played)
        assertEquals(listOf("mapZoom"), rec.settingKeys)
        rec.clear()
        compose.onAllNodesWithText("+")[0].performClick()
        assertEquals("los botones de volumen también hacen tap", listOf(Sfx.TAP), rec.played)
        assertEquals("y el volumen cambió", "music", rec.settingKeys.last())
    }
}
