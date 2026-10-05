package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.click
import androidx.compose.ui.test.performTouchInput
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.NodeType
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.nativo.ui.NodeResultScreen
import com.yokyznt.fruitspire.nativo.ui.RestScreen
import com.yokyznt.fruitspire.nativo.ui.ShopScreen
import com.yokyznt.fruitspire.nativo.ui.RewardScreen
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
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
open class ScreenshotTest {
    @get:Rule
    val compose = createComposeRule()

    /** Dónde caen las capturas (la prueba de la ficha de Play las saca en 16:9 a otra carpeta). */
    protected open val dir = "build/capturas"

    private fun shot(name: String, content: @Composable () -> Unit) {
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize().notebookPaper()) { content() } } }
        compose.onRoot().captureRoboImage("$dir/$name.png")
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
    fun combate() = shot("combate") {
        Rng.seed(11)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val scope = androidx.compose.runtime.rememberCoroutineScope()
        val ctl = androidx.compose.runtime.remember {
            lateinit var c: CombatController
            val combat = run.startCombat(PendingCombat(listOf("avispa_furiosa", "mosca_podrida"), "enemy"), onEnd = { c.onEnd(it) })
            CombatController(run, combat, scope, {}, {}).also { c = it }
        }
        CombatScreen(ctl, "kitchen")
        HudBar(hudStateOf(run), {}, {}, {}, {}, compact = true)
    }

    @Test
    fun mapaInicio() = shot("mapa_inicio") {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        MapScreen(mapViewOf(run), run.pos.x to run.pos.y, false, 1.25f, MapPan(), { _, _ -> }, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    /** Toca con el dedo (de mentiras) la primera casilla a la que se puede ir y comprueba que el mapa avisa. */
    @Test
    fun tocarLaPrimeraCasillaMueve() {
        Rng.seed(5)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        val view = mapViewOf(run)
        val pan = MapPan()
        var moved: Pair<Int, Int>? = null
        compose.setContent { DesignCanvas { Box(Modifier.fillMaxSize()) { MapScreen(view, run.pos.x to run.pos.y, false, 1.25f, pan, { x, y -> moved = x to y }, {}) } } }
        compose.waitForIdle()
        val key = view.reachable.first()
        val cx = key % 1000
        val cy = key / 1000
        val h = compose.onRoot().fetchSemanticsNode().size.height
        val d = h / 660f
        val x = pan.anim.value.x + (com.yokyznt.fruitspire.nativo.ui.cellPos(cx) + 62f) * 1.25f * d
        val y = pan.anim.value.y + (com.yokyznt.fruitspire.nativo.ui.cellPos(cy) + 62f) * 1.25f * d
        compose.onRoot().performTouchInput { click(androidx.compose.ui.geometry.Offset(x, y)) }
        compose.waitForIdle()
        org.junit.Assert.assertEquals("la casilla tocada ($cx,$cy) debía avisar", cx to cy, moved)
    }

    @Test
    fun recompensa() = shot("recompensa") {
        Rng.seed(21)
        val run = Run.start("kiwi", "madura")
        run.beginFloor()
        val pc = PendingCombat(listOf("babosa_viscosa"), "elite")
        val c = run.startCombat(pc)
        c.enemies.forEach { it.hp = 0 }
        run.finishCombat("win")
        RewardScreen(run, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    /** Una partida recién empezada que acaba de pisar una casilla de [type] (puesta al lado de la salida). */
    private fun runAt(type: String, key: Boolean = false, seed: Int = 30): Run {
        Rng.seed(seed)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        run.player.hasGoldenKey = key
        val x = run.pos.x; val y = run.pos.y
        val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = type
        run.arrive(nx, ny)
        return run
    }

    @Test
    fun campamento() = shot("campamento") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.REST).also { it.player.hp = 40 } }
        RestScreen(run, null, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun campamentoMadurar() = shot("campamento_madurar") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.REST).also { it.setPicker("upgrade") } }
        RestScreen(run, null, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun tienda() = shot("tienda") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.SHOP).also { it.player.gold = 120 } }
        ShopScreen(run, null, {}, {}, {}, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun tiendaQuitar() = shot("tienda_quitar") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.SHOP).also { it.player.gold = 120; it.startShopRemoval() } }
        ShopScreen(run, null, {}, {}, {}, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun tesoro() = shot("tesoro") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.TREASURE) }
        NodeResultScreen(run, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun llaveDorada() = shot("llave") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.KEY) }
        NodeResultScreen(run, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun cofreConLlave() = shot("cofre") {
        val run = androidx.compose.runtime.remember { runAt(NodeType.VAULT, key = true) }
        NodeResultScreen(run, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun evento() = shot("evento") {
        val run = androidx.compose.runtime.remember {
            runAt(NodeType.MYSTERY).also { it.currentEvent = com.yokyznt.fruitspire.core.Events.byId("comerciante_misterioso"); it.player.gold = 30 }
        }
        com.yokyznt.fruitspire.nativo.ui.EventScreen(run) {}
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun eventoResultado() = shot("evento_resultado") {
        val run = androidx.compose.runtime.remember {
            runAt(NodeType.MYSTERY).also {
                it.player.hp = 30
                it.currentEvent = com.yokyznt.fruitspire.core.Events.byId("arbol_sabio")
                it.screen = com.yokyznt.fruitspire.core.RunScreen.EVENT
                it.resolveEventOption(0)
            }
        }
        com.yokyznt.fruitspire.nativo.ui.EventResultScreen(run, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun pozo() = shot("pozo") {
        val run = androidx.compose.runtime.remember {
            runAt(NodeType.MYSTERY).also {
                it.currentEvent = com.yokyznt.fruitspire.core.Events.byId("pozo_deseos")
                it.screen = com.yokyznt.fruitspire.core.RunScreen.EVENT
                it.resolveEventOption(0)
                it.player.gold = 90
                it.tossWellCoin()
            }
        }
        com.yokyznt.fruitspire.nativo.ui.WellScreen(run, {}, {}, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun calabozo() = shot("calabozo") {
        val run = androidx.compose.runtime.remember {
            runAt(NodeType.MYSTERY).also {
                it.currentEvent = com.yokyznt.fruitspire.core.Events.byId("trampilla")
                it.screen = com.yokyznt.fruitspire.core.RunScreen.EVENT
                it.resolveEventOption(0)
            }
        }
        com.yokyznt.fruitspire.nativo.ui.DungeonScreen(run) { _, _ -> }
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun dadoDelDestino() = shot("dado") {
        val run = androidx.compose.runtime.remember {
            Rng.seed(40)
            Run.start("manzana", "madura").also { r ->
                r.beginFloor()
                val bossCol = r.map.cols - 1
                val y = (0 until r.map.rows).first { r.pos = com.yokyznt.fruitspire.core.Pos(bossCol - 1, it); r.isReachable(bossCol, it) }
                r.pos = com.yokyznt.fruitspire.core.Pos(bossCol - 1, y)
                r.arrive(bossCol, y)
                r.rollFate()
            }
        }
        com.yokyznt.fruitspire.nativo.ui.FateScreen(run, null, false, {}, {})
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }

    @Test
    fun mochila() = shot("mochila") {
        val run = androidx.compose.runtime.remember {
            Rng.seed(31)
            Run.start("manzana", "madura").also { r ->
                r.player.relics.addAll(listOf("regadera", "estrella_guardado", "corazon_durian", "chile_picante", "aura_ajo"))
                r.player.seeds[0] = "semilla_chile"; r.player.seeds[2] = "semilla_fantasma"
            }
        }
        com.yokyznt.fruitspire.nativo.ui.InventoryModal(run, true, {}, {}, {})
    }

    @Test
    fun portadaDePiso() = shot("portada") {
        Rng.seed(3)
        val run = Run.start("manzana", "madura")
        ActIntroScreen(run) {}
        HudBar(hudStateOf(run), {}, {}, {}, {})
    }
}
