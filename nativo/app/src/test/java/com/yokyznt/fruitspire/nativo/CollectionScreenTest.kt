package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.UriHandler
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.Album
import com.yokyznt.fruitspire.core.Bestiary
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Save
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.gen.CREATOR_URL
import com.yokyznt.fruitspire.core.data.gen.GEN_PATCH_NOTES
import com.yokyznt.fruitspire.nativo.ui.CollectionScreen
import com.yokyznt.fruitspire.nativo.ui.CollectionState
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.LocalProgress
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.NotesScreen
import com.yokyznt.fruitspire.nativo.ui.SpriteStore
import com.yokyznt.fruitspire.nativo.ui.notebookPaper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** La Colección (cartas, objetos, semillas, bestiario) y las Notas de la versión: capturas y toques de mentiras. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class CollectionScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private fun show(progress: Progress, content: @Composable () -> Unit) {
        compose.setContent {
            DesignCanvas { CompositionLocalProvider(LocalProgress provides progress) { Box(Modifier.fillMaxSize().notebookPaper()) { content() } } }
        }
    }

    private fun shot(name: String) = compose.onRoot().captureRoboImage("build/capturas/coleccion_$name.png")

    /** Una colección a medio hacer: la mitad de cada grupo de cartas, tres objetos de cada rareza y los primeros bichos del castillo 1. */
    private fun halfWay(): Progress = Progress().also { p ->
        Album.cardGroups().forEach { g -> p.discover(g.cards.take(g.cards.size / 2)) }
        Album.relicTiers.forEach { t -> Album.relicsOf(t.first).take(3).forEach { p.markFoundRelic(it.id) } }
        Album.seedTiers.forEach { t -> Album.seedsOf(t.first).take(2).forEach { p.markFoundSeed(it.id) } }
        Bestiary.catalog.castles[0].themes.forEach { t -> (t.normal + t.elites + t.guards).take(3).forEach { p.bestiarySee(it) } }
        p.bestiary[Bestiary.catalog.castles[0].themes[0].normal[0]] = 4
    }

    private fun name(id: String) = Enemies.get(id)!!.name

    // ------------------------------------------------------------------ capturas
    @Test fun cartas() { val p = halfWay(); show(p) { CollectionScreen(p, CollectionState("cards"), {}, {}) }; shot("cartas") }

    @Test fun objetos() {
        val p = halfWay()
        val st = CollectionState("relics").also { it.sel = Album.relicsOf("common").first().id }
        show(p) { CollectionScreen(p, st, {}, {}) }; shot("objetos")
    }

    @Test fun objetoConGuino() {
        val p = halfWay().also { it.markFoundRelic("fichas_casino") }
        val st = CollectionState("relics").also { it.sel = "fichas_casino" }
        show(p) { CollectionScreen(p, st, {}, {}) }; shot("objeto_guino")
    }

    @Test fun semillas() {
        val p = halfWay()
        val st = CollectionState("seeds").also { it.sel = Album.seedsOf("common").first().id }
        show(p) { CollectionScreen(p, st, {}, {}) }; shot("semillas")
    }

    @Test fun bestiario() {
        val p = halfWay()
        val st = CollectionState("bestiary").also { it.bestTab = 1; it.bestSel = Bestiary.catalog.castles[0].themes[0].normal[0] }
        show(p) { CollectionScreen(p, st, {}, {}) }; shot("bestiario")
    }

    @Test fun bestiarioSinDescubrir() {
        val p = Progress()
        val st = CollectionState("bestiary").also { it.bestSel = Bestiary.catalog.castles[0].themes[0].normal[0] }
        show(p) { CollectionScreen(p, st, {}, {}) }; shot("bestiario_vacio")
    }

    @Test fun notas() { show(Progress()) { NotesScreen({}) }; shot("notas") }

    @Test fun menuConNotasNuevas() { show(Progress()) { MenuScreen(false, {}, {}, {}, {}, {}, {}, {}, {}, notesBadge = true) }; shot("menu") }

    // ------------------------------------------------------------------ toques
    @Test
    fun laCuentaYLasPestanasCambianConElDedo() {
        val p = halfWay()
        show(p) { CollectionScreen(p, CollectionState("cards"), {}, {}) }
        compose.onNodeWithText(Album.countText("cards", p)).assertExists()
        compose.onNodeWithText("Objetos").performClick()
        compose.onNodeWithText(Album.countText("relics", p)).assertExists()
        compose.onNodeWithText("Semillas").performClick()
        compose.onNodeWithText(Album.countText("seeds", p)).assertExists()
        compose.onNodeWithText("Bestiario").performClick()
        compose.onNodeWithText(Album.countText("bestiary", p)).assertExists()
    }

    @Test
    fun loQueNoTienesSaleComoSilueta() {
        val p = Progress()
        val st = CollectionState("relics")
        show(p) { CollectionScreen(p, st, {}, {}) }
        assertTrue("sin objetos, las fichas dicen ???", compose.onAllNodesWithText("???").fetchSemanticsNodes().size > 3)
        compose.onAllNodesWithText("???")[0].performClick()
        compose.onNodeWithText("No descubierto").assertExists()
        assertTrue(st.sel != null)
    }

    @Test
    fun tocarUnObjetoEncontradoLoMuestraEnGrande() {
        val p = halfWay()
        val r = Album.relicsOf("common").first()
        val st = CollectionState("relics")
        show(p) { CollectionScreen(p, st, {}, {}) }
        compose.onAllNodesWithText(r.name)[0].performClick()
        assertEquals(r.id, st.sel)
        assertEquals("la ficha y el detalle", 2, compose.onAllNodesWithText(r.name).fetchSemanticsNodes().size)
        compose.onAllNodesWithText(r.name)[0].performClick() // otro toque lo suelta
        assertEquals(null, st.sel)
    }

    @Test
    fun cambiarDePestanaSueltaLoElegido() {
        val p = halfWay()
        val st = CollectionState("relics").also { it.sel = Album.relicsOf("common").first().id }
        show(p) { CollectionScreen(p, st, {}, {}) }
        compose.onNodeWithText("Semillas").performClick()
        assertEquals("seeds", st.tab)
        assertEquals(null, st.sel)
    }

    @Test
    fun elBestiarioCambiaDeCastilloYMuestraLaFichaDeUnEnemigoVisto() {
        val p = halfWay()
        val first = Bestiary.catalog.castles[0].themes[0].normal[0]
        val st = CollectionState("bestiary")
        show(p) { CollectionScreen(p, st, {}, {}) }
        compose.onAllNodesWithText(name(first))[0].performClick()
        assertEquals(first, st.bestSel)
        compose.onNodeWithText("Jugadas").assertExists()
        compose.onNodeWithText("Castillo 2").performClick()
        assertEquals(2, st.bestTab)
        assertEquals("al cambiar de castillo se suelta la ficha", null, st.bestSel)
        compose.onNodeWithText("Invocados").performClick()
        assertEquals(0, st.bestTab)
    }

    @Test
    fun unEnemigoNoDescubiertoSoloDaLaPista() {
        val p = Progress()
        val first = Bestiary.catalog.castles[0].themes[0].normal[0]
        show(p) { CollectionScreen(p, CollectionState("bestiary").also { it.bestSel = first }, {}, {}) }
        compose.onNodeWithText("No descubierto").assertExists()
        assertTrue("el nombre real no se ve", compose.onAllNodesWithText(name(first)).fetchSemanticsNodes().isEmpty())
        compose.onNodeWithText("Pista:", substring = true).assertExists()
    }

    /** Cada guiño trae el dibujito de su juego (refgame~<clave>), exportado de js/data/refs.js. */
    @Test
    fun cadaGuinoTieneElDibujoDeSuJuego() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        SpriteStore.init(app)
        val keys = Relics.db.values.mapNotNull { Album.refOf(it) }.flatMap { it.keys }.toSet()
        assertTrue("debía haber varios juegos (hay ${keys.size})", keys.size >= 12)
        keys.forEach { assertTrue("falta el dibujo refgame~$it", SpriteStore.has("refgame~$it")) }
    }

    @Test
    fun volverDesdeLaColeccion() {
        var back = 0
        val p = Progress()
        show(p) { CollectionScreen(p, CollectionState(), {}, { back++ }) }
        compose.onNodeWithText("Volver").performClick()
        assertEquals(1, back)
    }

    @Test
    fun lasNotasListanLaVersionNuevaYAbrenElInstagramDelCreador() {
        val opened = ArrayList<String>()
        compose.setContent {
            DesignCanvas {
                CompositionLocalProvider(LocalUriHandler provides object : UriHandler { override fun openUri(uri: String) { opened.add(uri) } }) {
                    Box(Modifier.fillMaxSize()) { NotesScreen({}) }
                }
            }
        }
        compose.onNodeWithText("Notas de la versión").assertExists()
        compose.onNodeWithText(GEN_PATCH_NOTES.first().title).assertExists()
        compose.onNodeWithText("¡Nueva!").assertExists()
        compose.onNodeWithText("¡Sígueme en Instagram!").performClick()
        assertEquals(listOf(CREATOR_URL), opened)
    }

    // ------------------------------------------------------------------ con el ViewModel y la raíz reales
    @Test
    fun elMenuAbreLaColeccionYLasNotasYLasMarcaComoLeidas() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        assertTrue(vm.progress.notesAreNew())
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        compose.onNodeWithText("Colección").performClick()
        assertEquals(AppScreen.COLLECTION, vm.screen)
        compose.onNodeWithText("Volver").performClick()
        assertEquals(AppScreen.MENU, vm.screen)
        compose.onNodeWithText("Notas").performClick()
        assertEquals(AppScreen.NOTES, vm.screen)
        assertFalse("abrir las notas las marca como leídas", vm.progress.notesAreNew())
        assertFalse("y se guarda", Save.decodeProgress(SaveStore(app).readProgress()).notesAreNew())
        compose.onNodeWithText("Volver").performClick()
        assertEquals(AppScreen.MENU, vm.screen)
    }

    @Test
    fun loQueLlevasAlGuardarQuedaAnotadoEnLaColeccion() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        vm.newGame(); vm.play()
        val run = vm.run!!
        val relic = Relics.db.values.first { it.tier == "common" }
        run.player.relics.add(relic.id)
        run.player.seeds[0] = "semilla_chile"
        vm.beginFloor() // guarda la partida
        assertTrue(relic.id in vm.progress.foundRelics)
        assertTrue("semilla_chile" in vm.progress.foundSeeds)
        assertTrue(relic.id in Save.decodeProgress(SaveStore(app).readProgress()).foundRelics)
    }
}
