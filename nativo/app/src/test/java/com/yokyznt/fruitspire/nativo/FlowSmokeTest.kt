package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
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

/**
 * Prueba de humo del recorrido completo con las pantallas reales: monta GameRoot y juega con el GameViewModel
 * (mapa, combates con cartas y fin de turno, recompensas…) avanzando el reloj. Si alguna pantalla o animación
 * truena con un estado real de la partida, esta prueba falla.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class FlowSmokeTest {
    @get:Rule
    val compose = createComposeRule()

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    /**
     * Un objeto que daña al empezar el turno (aura de ajo) puede ganar el combate dentro del constructor del motor,
     * antes de que exista el controlador de la pantalla. Antes eso reventaba con un lateinit sin inicializar.
     */
    @Test
    fun combatWonByARelicAtTurnStartDoesNotCrash() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.play(); advance(100)
        val run = vm.run!!
        vm.beginFloor(); advance(100)
        run.player.relics.add("aura_ajo")
        run.player.permanentStrength = 500 // el golpe del aura mata a cualquiera
        val x = run.pos.x; val y = run.pos.y
        val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = com.yokyznt.fruitspire.core.NodeType.ENEMY
        vm.moveTo(nx, ny)
        for (i in 0 until 40) {
            advance(250)
            if (run.screen == RunScreen.REWARD) break
        }
        assertEquals("el combate debía terminar en recompensa", RunScreen.REWARD, run.screen)
    }

    @Test
    fun playsThroughSeveralFloorNodes() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val vm = GameViewModel(app)
        // el reloj solo avanza cuando la prueba lo pide: así se ven los estados intermedios (efectos, animaciones)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.selectChar("manzana")
        vm.play(); advance(100)
        val run = vm.run!!
        assertEquals(RunScreen.ACT_INTRO, run.screen)
        // para no morir en la prueba: mucha vida y fuerza
        run.player.maxHp = 9999; run.player.hp = 9999; run.player.permanentStrength = 40
        vm.beginFloor(); advance(100)

        var fights = 0
        var shots = 0
        var sawFloats = false
        var combatSteps = 0
        for (step in 0 until 600) {
            val r = vm.run ?: break
            when (r.screen) {
                RunScreen.ACT_INTRO -> vm.beginFloor()
                RunScreen.MAP -> if (vm.moving == null && vm.intro == null && vm.combat == null) {
                    val x = r.pos.x; val y = r.pos.y
                    val next = listOf(x + 1 to y, x to y - 1, x to y + 1).firstOrNull { r.isReachable(it.first, it.second) }
                    if (next != null) vm.moveTo(next.first, next.second)
                }
                RunScreen.COMBAT -> vm.combat?.let { c ->
                    if (c.canPlayNow()) {
                        val hand = c.combat.player.hand
                        val idx = hand.indices.firstOrNull { c.combat.canPlay(hand[it]) }
                        if (idx != null) {
                            val target = c.aliveEnemyIndexes().firstOrNull()
                            c.tryPlay(idx, target, null)
                        } else c.endTurn()
                    }
                    if (c.floats.isNotEmpty()) sawFloats = true
                    combatSteps++
                    if (shots == 0 && c.floats.isNotEmpty()) { compose.onRoot().captureRoboImage("build/capturas/humo_combate.png"); shots++ }
                }
                RunScreen.REWARD -> {
                    if (shots == 1) { compose.onRoot().captureRoboImage("build/capturas/humo_recompensa.png"); shots++ }
                    r.loot.indices.forEach { vm.collectLoot(it) }
                    r.rewardCards.firstOrNull()?.let { vm.pickRewardCard(it) }
                    if (r.screen == RunScreen.REWARD && r.canFinishReward()) { vm.continueReward(); fights++ }
                }
                RunScreen.NODE_STUB -> vm.leaveStub()
                RunScreen.REST -> if (vm.flash == null) {
                    if (r.canRest()) vm.restHeal() else vm.leaveNode()
                }
                RunScreen.SHOP -> if (vm.flash == null) { vm.buyShopCard(0); vm.leaveNode() }
                RunScreen.TREASURE, RunScreen.KEY_FOUND, RunScreen.VAULT -> {
                    r.loot.indices.forEach { vm.collectLoot(it) }
                    vm.leaveNode()
                }
                RunScreen.BOSS_RELIC -> vm.skipBossRelic()
                RunScreen.GAME_OVER, RunScreen.VICTORY -> break
            }
            advance(350)
            if (fights >= 6) break
        }
        assertTrue("no se ganó ningún combate (llegó a ${vm.run?.screen})", fights >= 1)
        assertTrue("el combate no mostró efectos (pasos en combate: $combatSteps)", sawFloats)
        // lo ganado quedó guardado y se puede continuar
        vm.toMenu()
        assertTrue(vm.canContinue)
    }
}
