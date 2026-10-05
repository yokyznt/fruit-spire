package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.NotesScreen
import com.yokyznt.fruitspire.nativo.ui.typed
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

/** La historia al empezar una partida y el final al vencer al jefe (js/story.js, js/ending.js), con el video de cada escena puesto aparte. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class CineFlowTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    private fun mount(rec: RecordingAudio): GameViewModel {
        Rng.seed(5)
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        vm.audio = rec
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        return vm
    }

    private fun text(part: String) = compose.onNodeWithText(part, substring = true)

    // ------------------------------------------------------------------ la historia
    @Test
    fun aNewGameStartsWithTheStoryAndTheFanfareWaitsForTheEnd() {
        val rec = RecordingAudio()
        val vm = mount(rec)
        vm.newGame(); advance(100)
        vm.play(); advance(600)
        assertEquals(AppScreen.STORY, vm.screen)
        text("Érase una vez el Reino de las Frutas").assertExists()
        assertTrue("suena la primera escena", Sfx.SPARKLE in rec.played)
        assertEquals("la fanfarria de la portada espera a que acabe la historia", 0, rec.played.count { it == Sfx.ACT_FANFARE })
        assertEquals("la música es la del menú", "menu", vm.musicPlace())
        vm.finishStory(); advance(100)
        assertEquals(AppScreen.RUN, vm.screen)
        assertEquals(1, rec.played.count { it == Sfx.ACT_FANFARE })
        Rng.unseed()
    }

    @Test
    fun sceneAdvancesByItselfAndTheInvasionSoundsStrong() {
        val rec = RecordingAudio()
        val vm = mount(rec)
        vm.newGame(); advance(100); vm.play(); advance(100)
        advance(7300) // la escena 0 dura 7 s
        text("Pero una noche llegaron los bichos").assertExists()
        val i = rec.played.indexOf(Sfx.INTRO_STING)
        assertTrue(i >= 0)
        assertEquals("introSting(true)", 1, rec.variants[i])
        advance(2100) // los rayos de la escena 1 (350 y 1650 ms)
        assertEquals(2, rec.played.count { it == Sfx.HIT })
        Rng.unseed()
    }

    @Test
    fun nextAndBackButtonsMoveBetweenScenes() {
        val vm = mount(RecordingAudio())
        vm.newGame(); advance(100); vm.play(); advance(400)
        compose.onNodeWithText("Siguiente ›").performClick(); advance(100)
        text("Pero una noche llegaron los bichos").assertExists()
        advance(400)
        compose.onNodeWithText("‹ Atrás").performClick(); advance(100)
        text("Érase una vez el Reino de las Frutas").assertExists()
        Rng.unseed()
    }

    @Test
    fun skippingTheStoryGoesToTheFloor() {
        val vm = mount(RecordingAudio())
        vm.newGame(); advance(100); vm.play(); advance(100)
        compose.onNodeWithText("Saltar historia »").performClick(); advance(100)
        assertEquals(AppScreen.RUN, vm.screen)
        Rng.unseed()
    }

    @Test
    fun theLastSceneOffersTheBigButton() {
        val vm = mount(RecordingAudio())
        vm.newGame(); advance(100); vm.play(); advance(100)
        repeat(5) { advance(400); compose.onNodeWithText("Siguiente ›").performClick(); advance(50) }
        text("Esa fruta valiente eres tú, ${vm.cineHeroName()}").assertExists()
        compose.onNodeWithText("¡Comenzar la aventura!").assertDoesNotExist()
        advance(2600)
        compose.onNodeWithText("¡Comenzar la aventura!").performClick(); advance(100)
        assertEquals(AppScreen.RUN, vm.screen)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ el final y las notas
    @Test
    fun theEndingMarksItSeenAndLeadsToTheVictoryScreen() {
        val vm = mount(RecordingAudio())
        vm.newGame(); advance(100); vm.play(); vm.finishStory(); advance(100)
        assertTrue(!vm.progress.endingSeen)
        vm.startEnding(replay = false); advance(600)
        assertEquals(AppScreen.ENDING, vm.screen)
        assertTrue(vm.progress.endingSeen)
        text("¡Lo lograste!").assertExists()
        compose.onNodeWithText("Saltar »").performClick(); advance(100)
        assertEquals(AppScreen.RUN, vm.screen)
        Rng.unseed()
    }

    @Test
    fun replayingFromTheNotesGoesBackToTheMenu() {
        val vm = mount(RecordingAudio())
        vm.startStory(replay = true); advance(300)
        compose.onNodeWithText("Saltar historia »").performClick(); advance(100)
        assertEquals(AppScreen.MENU, vm.screen)
        vm.startEnding(replay = true); advance(300)
        compose.onNodeWithText("Saltar »").performClick(); advance(100)
        assertEquals(AppScreen.MENU, vm.screen)
        Rng.unseed()
    }

    @Test
    fun theNotesOfferTheReplaysAndTheEndingOnlyOnceSeen() {
        var story = 0; var ending = 0
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize()) { NotesScreen({}, endingSeen = false, onReplayStory = { story++ }, onReplayEnding = { ending++ }) } } }
        compose.onNodeWithText("Ver la historia otra vez").performClick()
        assertEquals(1, story)
        compose.onNodeWithText("Ver el final otra vez").assertDoesNotExist()
    }

    @Test
    fun theNotesShowTheEndingReplayOnceSeen() {
        var ending = 0
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize()) { NotesScreen({}, endingSeen = true, onReplayEnding = { ending++ }) } } }
        compose.onNodeWithText("Ver el final otra vez").performClick()
        assertEquals(1, ending)
    }

    // ------------------------------------------------------------------ el texto que se escribe
    @Test
    fun typedTextRevealsLetterByLetterWithoutMovingTheLayout() {
        val t = typed("ab cd", 2)
        assertEquals("el texto completo siempre está, para que nada se mueva", "ab cd", t.text)
        val hidden = t.spanStyles.single()
        assertEquals(Color.Transparent, hidden.item.color)
        assertEquals(3, hidden.start)
        assertEquals(5, hidden.end)
        assertEquals(0, typed("hola", 0).spanStyles.single().start)
        assertTrue("con todas las letras a la vista no queda nada oculto", typed("ab cd", 4).spanStyles.all { it.start == it.end })
    }
}
