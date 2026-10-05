package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.NodeType
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.CollectionScreen
import com.yokyznt.fruitspire.nativo.ui.CollectionState
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.GameAudio
import com.yokyznt.fruitspire.nativo.ui.LocalAudio
import com.yokyznt.fruitspire.nativo.ui.StickerButton
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Duration

/** Un [GameAudio] de mentiras que anota lo que suena (para comprobar que cada acción del juego dispara su sonido). */
class RecordingAudio : GameAudio {
    val played = ArrayList<Sfx>()
    val variants = ArrayList<Int>()
    val places = ArrayList<String?>()
    val settingKeys = ArrayList<String>()
    var paused = false

    override fun play(sfx: Sfx, variant: Int) { played.add(sfx); variants.add(variant) }
    override fun music(place: String?) { places.add(place) }
    override fun pause() { paused = true }
    override fun resume() { paused = false }
    override fun settingChanged(key: String) { settingKeys.add(key) }
    override fun release() {}
    fun clear() { played.clear(); variants.clear() }
}

/** Cada acción del juego dispara el mismo sonido que en la versión web (los puntos de llamada de Sfx.* en js/). */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class AudioHooksTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    // ------------------------------------------------------------------ combate
    private fun mountCombat(rec: RecordingAudio, enemies: List<String> = listOf("avispa_furiosa")): Pair<Run, CombatController> {
        Rng.seed(77)
        val run = Run.start("manzana", "madura")
        run.beginFloor()
        var ctl: CombatController? = null
        compose.mainClock.autoAdvance = false
        compose.setContent {
            DesignCanvas {
                val scope = rememberCoroutineScope()
                val c = remember {
                    val combat = run.startCombat(PendingCombat(enemies, "enemy"))
                    CombatController(run, combat, scope, {}, {}, rec)
                }
                ctl = c
                CombatScreen(c, "kitchen")
            }
        }
        advance(2500) // la entrada
        return run to ctl!!
    }

    private fun give(ctl: CombatController, cardId: String) {
        ctl.combat.player.hand[0] = cardId
        ctl.combat.player.energy = 3
        ctl.refresh()
    }

    @Test
    fun theFightStartsWithYourTurnAndSelectingACardClicks() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        assertEquals(listOf(Sfx.TURN_PLAYER), rec.played)
        ctl.select(0)
        assertEquals(Sfx.SELECT, rec.played.last())
        Rng.unseed()
    }

    @Test
    fun anAttackSoundsAsAnAttackAndThenAsAHit() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        give(ctl, "golpe_cascara")
        rec.clear()
        ctl.tryPlay(0, 0, null)
        advance(2500)
        assertEquals(Sfx.CARD_ATTACK, rec.played.first())
        assertTrue("el golpe le pega al enemigo: ${rec.played}", Sfx.HIT in rec.played)
        assertFalse(Sfx.DENIED in rec.played)
        Rng.unseed()
    }

    @Test
    fun aSkillSoundsAsASkillAndGivesShellWithABlockSound() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        give(ctl, "jugo_defensivo")
        rec.clear()
        ctl.tryPlay(0, null, null)
        advance(2500)
        assertEquals(Sfx.CARD_SKILL, rec.played.first())
        assertTrue("${rec.played}", Sfx.BLOCK in rec.played)
        Rng.unseed()
    }

    @Test
    fun withoutEnergyTheCardIsDenied() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        give(ctl, "golpe_cascara")
        ctl.combat.player.energy = 0
        ctl.refresh()
        rec.clear()
        ctl.tryPlay(0, 0, null)
        advance(500)
        assertEquals(listOf(Sfx.DENIED), rec.played)
        Rng.unseed()
    }

    @Test
    fun aCardThatNeedsATargetAmongSeveralEnemiesIsDeniedWithoutOne() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec, listOf("avispa_furiosa", "mosca_podrida"))
        give(ctl, "golpe_cascara")
        rec.clear()
        ctl.tryPlay(0, null, null)
        advance(500)
        assertEquals(listOf(Sfx.DENIED), rec.played)
        Rng.unseed()
    }

    @Test
    fun theEnemyTurnIsAnnouncedAndYoursComesBack() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        rec.clear()
        ctl.endTurn()
        advance(15000)
        val turns = rec.played.filter { it == Sfx.TURN_ENEMY || it == Sfx.TURN_PLAYER }
        assertEquals(listOf(Sfx.TURN_ENEMY, Sfx.TURN_PLAYER), turns)
        Rng.unseed()
    }

    @Test
    fun anEnemyThatFallsSoundsAsDeath() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        give(ctl, "golpe_cascara")
        ctl.combat.enemies[0].hp = 1
        ctl.combat.enemies[0].maxHp = 40
        rec.clear()
        ctl.tryPlay(0, 0, null)
        advance(2500)
        assertTrue("${rec.played}", Sfx.ENEMY_DEATH in rec.played)
        Rng.unseed()
    }

    @Test
    fun winningAndLosingHaveTheirOwnJingle() {
        val rec = RecordingAudio()
        val (_, ctl) = mountCombat(rec)
        rec.clear()
        ctl.onEnd("win")
        assertEquals(listOf(Sfx.WIN), rec.played)
        rec.clear()
        ctl.onEnd("lose")
        assertEquals(listOf(Sfx.LOSE), rec.played)
        Rng.unseed()
    }

    @Test
    fun usingASeedSounds() {
        val rec = RecordingAudio()
        val (run, ctl) = mountCombat(rec)
        run.player.seeds[0] = "semilla_coco"
        rec.clear()
        assertEquals(null, ctl.useSeedFromBag(0))
        advance(1500)
        assertEquals(Sfx.SEED_USE, rec.played.first())
        Rng.unseed()
    }

    // ------------------------------------------------------------------ la partida (GameViewModel)
    private fun startRun(rec: RecordingAudio): GameViewModel {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        vm.audio = rec
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.play(); advance(100)
        return vm
    }

    private fun walkTo(vm: GameViewModel, type: String) {
        val run = vm.run!!
        val x = run.pos.x; val y = run.pos.y
        val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = type
        vm.moveTo(nx, ny)
    }

    @Test
    fun theFloorOpensWithTheFanfareOnlyOnce() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        assertEquals(1, rec.played.count { it == Sfx.ACT_FANFARE })
        vm.beginFloor(); advance(100)
        assertEquals("el mapa no la repite", 1, rec.played.count { it == Sfx.ACT_FANFARE })
        Rng.unseed()
    }

    @Test
    fun walkingMakesAStepSoundAndATreasureOpens() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        rec.clear()
        walkTo(vm, NodeType.TREASURE)
        assertEquals(listOf(Sfx.MAP_MOVE), rec.played)
        advance(700)
        assertEquals(Sfx.CHEST_OPEN, rec.played.last())
        // lo que da el cofre es un objeto: recogerlo suena a objeto nuevo
        val kind = vm.run!!.loot.getOrNull(0)?.k
        if (kind == "relic") { vm.collectLoot(0); assertEquals(Sfx.RELIC_GET, rec.played.last()) }
        Rng.unseed()
    }

    @Test
    fun theKeySparkles() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        rec.clear()
        walkTo(vm, NodeType.KEY)
        advance(700)
        assertEquals(Sfx.SPARKLE, rec.played.last())
        Rng.unseed()
    }

    @Test
    fun aMysteryOpensAnEvent() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        rec.clear()
        walkTo(vm, NodeType.MYSTERY)
        advance(700)
        assertEquals(Sfx.EVENT_OPEN, rec.played.last())
        Rng.unseed()
    }

    @Test
    fun anOrdinaryFightHasTheSoftSting() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        rec.clear()
        walkTo(vm, NodeType.ENEMY)
        advance(700)
        val i = rec.played.indexOf(Sfx.INTRO_STING)
        assertTrue("falta el sonido de entrada: ${rec.played}", i >= 0)
        assertEquals("un enemigo común suena suave", 0, rec.variants[i])
        Rng.unseed()
    }

    @Test
    fun anEliteFightHasTheStrongSting() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        rec.clear()
        walkTo(vm, NodeType.ELITE)
        advance(700)
        val i = rec.played.indexOf(Sfx.INTRO_STING)
        assertTrue("falta el sonido de entrada: ${rec.played}", i >= 0)
        assertEquals("una élite suena fuerte", 1, rec.variants[i])
        Rng.unseed()
    }

    @Test
    fun ripeningACardSoundsAsSoonAsYouPickIt() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        walkTo(vm, NodeType.REST)
        advance(700)
        assertEquals(RunScreen.REST, vm.run!!.screen)
        rec.clear()
        vm.setPicker("upgrade")
        vm.pickCard(0)
        assertEquals(listOf(Sfx.UPGRADE), rec.played)
        Rng.unseed()
    }

    @Test
    fun restHealSounds() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        walkTo(vm, NodeType.REST)
        advance(700)
        rec.clear()
        vm.run!!.player.hp = 5
        vm.restHeal()
        assertEquals(listOf(Sfx.REST_HEAL), rec.played)
        Rng.unseed()
    }

    @Test
    fun theShopDeniesWhenYouCannotPayAndJinglesWhenYouBuy() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        walkTo(vm, NodeType.SHOP)
        advance(700)
        assertEquals(RunScreen.SHOP, vm.run!!.screen)
        vm.run!!.player.gold = 0
        rec.clear()
        vm.buyShopCard(0)
        assertEquals(listOf(Sfx.DENIED), rec.played)
        vm.run!!.player.gold = 999
        rec.clear()
        vm.buyShopCard(0)
        assertEquals(listOf(Sfx.COIN), rec.played)
        Rng.unseed()
    }

    @Test
    fun rollingTheFateDieTicksThenAnnouncesTheResult() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        vm.beginFloor(); advance(100)
        walkTo(vm, NodeType.BOSS)
        advance(700)
        assertEquals(RunScreen.FATE, vm.run!!.screen)
        rec.clear()
        vm.rollFate()
        advance(4000)
        assertEquals("16 toquecitos mientras rueda", 16, rec.played.count { it == Sfx.TAP })
        assertTrue("y al final win, denied o pop: ${rec.played.takeLast(2)}", rec.played.last() in listOf(Sfx.WIN, Sfx.DENIED, Sfx.POP))
        Rng.unseed()
    }

    // ------------------------------------------------------------------ música y ajustes
    @Test
    fun theMusicFollowsTheScreens() {
        val rec = RecordingAudio()
        val vm = startRun(rec)
        assertEquals("map1", vm.musicPlace())
        assertEquals(listOf("menu", "map1"), rec.places.filterNotNull().distinct().take(2))
        vm.toMenu(); advance(100)
        assertEquals("menu", vm.musicPlace())
        assertEquals("menu", rec.places.last())
        Rng.unseed()
    }

    @Test
    fun settingsTellTheAudioWhatChanged() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val rec = RecordingAudio()
        val settings = Settings(app)
        settings.onChanged = { rec.settingChanged(it) }
        settings.putMusic(40); settings.putSfx(60); settings.putVibrate(false)
        assertEquals(listOf("music", "sfx", "vibrate"), rec.settingKeys)
    }

    // ------------------------------------------------------------------ interfaz
    @Test
    fun everyButtonTapsLikeInTheWebGame() {
        val rec = RecordingAudio()
        var clicked = 0
        compose.setContent { DesignCanvas { CompositionLocalProvider(LocalAudio provides rec) { Box(Modifier.fillMaxSize()) { StickerButton("Hola", { clicked++ }) } } } }
        compose.onNodeWithText("Hola").performClick()
        assertEquals(1, clicked)
        assertEquals(listOf(Sfx.TAP), rec.played)
    }

    @Test
    fun aDisabledButtonIsSilent() {
        val rec = RecordingAudio()
        compose.setContent { DesignCanvas { CompositionLocalProvider(LocalAudio provides rec) { Box(Modifier.fillMaxSize()) { StickerButton("Nada", {}, enabled = false) } } } }
        compose.onNodeWithText("Nada").performClick()
        assertTrue(rec.played.isEmpty())
    }

    @Test
    fun theCollectionSelectsOnTabsAndTapsOnTiles() {
        val rec = RecordingAudio()
        val p = Progress()
        compose.setContent { DesignCanvas { CompositionLocalProvider(LocalAudio provides rec) { Box(Modifier.fillMaxSize()) { CollectionScreen(p, CollectionState("cards"), {}, {}) } } } }
        compose.onNodeWithText("Objetos").performClick()
        assertEquals("cambiar de pestaña = select", listOf(Sfx.SELECT), rec.played)
        compose.onAllNodesWithText("???")[0].performClick()
        assertEquals("tocar una ficha = tap", Sfx.TAP, rec.played.last())
    }
}
