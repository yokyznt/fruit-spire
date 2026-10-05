package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.fail

/** El tutorial «Cómo jugar» (js/tutorial.js): mapa fijo, primer combate dirigido y 33 pasos que nunca se atoran. */
class TutorialTest {
    @AfterTest fun unseed() = Rng.unseed()

    @Test
    fun elMapaFijoEsDe7x3ConElCaminoDeLasCasillasPrincipales() {
        Rng.seed(1)
        val run = Run.startTutorial()
        assertEquals(RunScreen.MAP, run.screen)
        assertEquals(7, run.map.cols); assertEquals(3, run.map.rows)
        assertEquals(listOf<Any>("manzana", 130, "verde"), listOf(run.player.characterId, run.player.gold, run.player.difficulty))
        val row = (0..6).map { run.map.grid[1][it] }
        assertEquals(
            listOf(NodeType.EMPTY, NodeType.ENEMY, NodeType.REST, NodeType.TREASURE, NodeType.MYSTERY, NodeType.SHOP, NodeType.BOSS), row,
            "la fila del medio: vacío, enemigo, fogata, cofre, misterio, tienda y la guarida pegada"
        )
        assertEquals(NodeType.ELITE, run.map.grid[0][4]); assertEquals(NodeType.ELITE, run.map.grid[2][2]); assertEquals(NodeType.ELITE, run.map.grid[2][5])
        assertEquals("mango_zombie", run.map.bossId); assertEquals("huerto", run.map.themeId)
        assertEquals("0,1", run.pos.key)
        // no se puede salir de la fila del medio: solo adelante
        assertTrue(run.isReachable(1, 1)); assertFalse(run.isReachable(0, 0)); assertFalse(run.isReachable(0, 2))
        assertNotNull(run.tutorial)
    }

    @Test
    fun elPrimerCombateEsUnaAvispaSolaConLaManoFijaYVidaParaVerTodosLosPasos() {
        Rng.seed(2)
        val run = Run.startTutorial()
        val pc = run.arrive(1, 1)!!
        assertEquals(listOf("avispa_furiosa"), pc.enemyIds)
        val c = run.startCombat(pc)
        assertEquals(listOf("golpe_cascara", "jugo_defensivo", "golpe_cascara", "jugo_defensivo", "golpe_cascara"), c.player.hand)
        assertTrue(c.enemies[0].maxHp >= 44 && c.enemies[0].hp == c.enemies[0].maxHp)
        assertNull(c.rule, "sin regla de piso salvo el jefe")
        // el segundo combate (el jefe) ya no se arma así
        assertFalse(run.tutorial!!.firstFight)
    }

    @Test
    fun noTocaElProgresoRealNiSeGuarda() {
        Rng.seed(3)
        val real = Progress()
        val run = Run.startTutorial()
        assertFalse(run.progress === real)
        assertFalse(Save.shouldSave(run), "el tutorial no se guarda")
    }

    @Test
    fun siPierdesSeRestauraLaVidaYSeRepiteElMismoCombate() {
        Rng.seed(4)
        val run = Run.startTutorial()
        val pc = run.arrive(1, 1)!!
        run.startCombat(pc)
        run.player.hp = 0
        run.finishCombat("lose")
        assertNotEquals(RunScreen.GAME_OVER, run.screen)
        assertEquals(run.player.maxHp, run.player.hp)
        val retry = run.tutorialRetry
        assertNotNull(retry)
        assertEquals(listOf("avispa_furiosa"), retry.enemyIds)
        assertEquals("enemy", retry.kind)
    }

    @Test
    fun elJefeNoPideElDadoDelDestinoYSuVictoriaTerminaElTutorial() {
        Rng.seed(5)
        val run = Run.startTutorial()
        run.visited.add("5,1"); run.pos = Pos(5, 1)
        val pc = run.arrive(6, 1)
        assertNotNull(pc, "sin dado del destino")
        assertEquals("boss", pc.kind)
        assertNull(run.map.fate)
        assertEquals(RunScreen.MAP, run.screen)
        run.startCombat(pc)
        assertNotNull(run.combat!!.rule, "el jefe sí tiene la regla del huerto")
        run.finishCombat("win")
        assertEquals(RunScreen.TUTORIAL_END, run.screen)
    }

    @Test
    fun elMisterioEsSiempreLaFuenteDeNectar() {
        for (seed in 1..30) {
            Rng.seed(seed)
            val run = Run.startTutorial()
            run.visited.add("3,1"); run.pos = Pos(3, 1)
            run.arrive(4, 1)
            assertEquals("fuente_magica", run.currentEvent?.id)
        }
    }

    @Test
    fun alGanarSiempreSaleLaSemillaDeChileYNoSumaAlPase() {
        Rng.seed(6)
        val run = Run.startTutorial()
        run.startCombat(run.arrive(1, 1)!!)
        run.finishCombat("win")
        assertEquals(RunScreen.REWARD, run.screen)
        assertTrue(run.loot.any { it.k == "seed" && it.id == "semilla_chile" })
        assertNull(run.passGain, "el tutorial no suma experiencia al pase")
    }

    @Test
    fun lasPalabrasDeLosPasosNoDejanEtiquetasSinCerrar() {
        TUTORIAL_STEPS.forEach { s ->
            assertEquals(Regex("<b>").findAll(s.text).count(), Regex("</b>").findAll(s.text).count(), s.text)
        }
        assertEquals(33, TUTORIAL_STEPS.size, "los 33 pasos de js/tutorial.js")
        assertEquals(11, TUTORIAL_STEPS.count { it.next }, "11 pasos de lectura")
        assertEquals(22, TUTORIAL_STEPS.count { !it.next }, "22 pasos de acción")
    }

    @Test
    fun enLosPasosDeLecturaNoSePermiteNada() {
        val d = TutorialDirector()
        assertTrue(d.step!!.next)
        listOf(TutAction.MOVE, TutAction.PLAY, TutAction.END_TURN, TutAction.LOOT, TutAction.LEAVE, TutAction.BAG).forEach { assertFalse(d.allows(it), it) }
        d.quitAsk = true
        assertFalse(d.allows(TutAction.MOVE), "preguntando si salir: todo apagado")
    }

    // ------------------------------------------------------------------ el bot: nunca se atora
    /** Hace solo lo que cada paso permite (como el jugador obediente) y debe llegar siempre a la pantalla final. */
    private class Bot(val run: Run) {
        val d = run.tutorial!!
        var bagOpen = false
        val log = ArrayList<String>()
        private var result: String? = null

        fun ctx() = TutorialCtx(run, d.flags, bagOpen)
        fun notify(evt: String) { d.notify(evt, ctx()) }
        fun need(action: String) = assertTrue(d.allows(action), "el paso ${d.i} («${d.step?.text}») no permite «$action» en ${run.screen}")

        fun go() {
            var guard = 0
            while (run.screen != RunScreen.TUTORIAL_END) {
                if (++guard > 4000) fail("se atoró en el paso ${d.i} («${d.step?.text}») en ${run.screen}; pasos: ${log.takeLast(8)}")
                d.check(ctx())
                val s = d.step ?: fail("se acabaron los pasos sin llegar al final (${run.screen})")
                log.add("${d.i}@${run.screen}")
                if (s.next) { d.advance(ctx()); continue }
                act(s)
            }
        }

        private fun act(s: TutStep) {
            when (run.screen) {
                RunScreen.MAP -> {
                    need(TutAction.MOVE)
                    val pc = run.arrive(run.pos.x + 1, 1) ?: return
                    fight(pc)
                }
                RunScreen.COMBAT -> combatStep(s)
                RunScreen.REWARD -> when {
                    run.lootPending() -> { need(TutAction.LOOT); run.collectLoot(run.loot.indexOfFirst { it.isOpen }) }
                    run.rewardCards.isNotEmpty() && !run.rewardCardPicked -> { need(TutAction.PICK_CARD); run.pickRewardCard(run.rewardCards[0]) }
                    else -> { need(TutAction.CONTINUE); run.finishReward() }
                }
                RunScreen.REST -> { need(TutAction.REST); if (!run.restHeal()) run.leaveNode() }
                RunScreen.TREASURE, RunScreen.EVENT_RESULT -> {
                    if (run.lootPending()) { need(TutAction.LOOT); run.collectLoot(run.loot.indexOfFirst { it.isOpen }) } else { need(TutAction.LEAVE); run.leaveNode() }
                }
                RunScreen.EVENT -> { need(TutAction.EVENT); run.resolveEventOption(0) }
                RunScreen.SHOP -> {
                    if (!d.flags.contains("shop-buy")) {
                        need(TutAction.SHOP)
                        val i = run.shopStock!!.cards.indexOfFirst { it.price <= run.player.gold }
                        assertTrue(i >= 0, "no alcanza para comprar nada en la tienda del tutorial")
                        assertEquals(BuyResult.OK, run.buyShopCard(i)); notify("shop-buy")
                    } else { need(TutAction.LEAVE); run.leaveNode() }
                }
                else -> fail("pantalla inesperada ${run.screen}")
            }
        }

        private fun fight(pc: PendingCombat) {
            result = null
            run.startCombat(pc, onEnd = { result = it })
        }

        private fun combatStep(s: TutStep) {
            val c = run.combat!!
            if (c.ended) {
                val r = result ?: fail("el combate terminó sin avisar")
                result = null
                run.finishCombat(r)
                run.tutorialRetry?.let { run.tutorialRetry = null; fight(it) }
                return
            }
            if (c.turn != "player") { enemyTurn(c); return }
            when {
                d.allows(TutAction.PLAY) -> {
                    val idx = c.player.hand.indices.firstOrNull { i ->
                        val id = c.player.hand[i]; c.canPlay(id) && d.allowsCard(Cards.get(id)?.type)
                    }
                    if (idx != null) {
                        val type = Cards.get(c.player.hand[idx])!!.type
                        c.playCard(idx, 0)
                        notify("card:$type")
                    } else if (d.allows(TutAction.END_TURN)) endTurn(c)
                    else fail("el paso ${d.i} pide jugar una carta y no hay ninguna permitida")
                }
                d.allows(TutAction.END_TURN) -> endTurn(c)
                d.allows(TutAction.TIP) -> notify(if ("rule" in d.spots(ctx())) "tip:rule" else "tip:intent")
                d.allows(TutAction.BAG) && !bagOpen -> bagOpen = true
                d.allows(TutAction.SEED) -> {
                    val slot = run.player.seeds.indexOfFirst { it != null }
                    assertTrue(slot >= 0)
                    c.useSeed(run.player.seeds[slot]!!, 0); run.player.seeds[slot] = null
                    bagOpen = false
                    notify("seed-use")
                }
                else -> fail("el paso ${d.i} («${s.text}») no deja hacer nada en combate")
            }
        }

        private fun endTurn(c: Combat) { c.endPlayerTurn(); notify("turn-end"); enemyTurn(c) }

        private fun enemyTurn(c: Combat) {
            var i = 0
            while (i < c.enemies.size && !c.ended) { if (c.enemies[i].isAlive()) c.enemyAct(i); i++ }
            if (!c.ended) c.endEnemyTurn()
        }
    }

    @Test
    fun unBotQueSoloHaceLoQueSePideSiempreLlegaAlFinalSinAtorarse() {
        for (seed in 1..60) {
            Rng.seed(seed)
            val run = Run.startTutorial()
            Bot(run).go()
            assertEquals(RunScreen.TUTORIAL_END, run.screen, "semilla $seed")
        }
    }
}
