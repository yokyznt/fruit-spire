package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Plan
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.World
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.fail

/** Pruebas del flujo de partida (js/game.js): un bot recorre partidas enteras con las mismas funciones que usa la interfaz. */
class RunTest {
    private val chars = listOf("manzana", "platanin", "kiwi", "uva")

    /** Juega un combate completo: todas las cartas que se pueden, luego turno enemigo. Devuelve "win" o "lose". */
    private fun playCombat(run: Run, pc: PendingCombat): String {
        var result: String? = null
        val c = run.startCombat(pc, onEnd = { result = it })
        var turns = 0
        while (!c.ended && turns < 300) {
            var plays = 0
            while (!c.ended && plays < 40) {
                val idx = c.player.hand.indexOfFirst { c.canPlay(it) }
                if (idx < 0) break
                c.playCard(idx, c.enemies.indexOfFirst { it.isAlive() })
                plays++
            }
            if (c.ended) break
            c.endPlayerTurn()
            var i = 0
            while (i < c.enemies.size && !c.ended) { if (c.enemies[i].isAlive()) c.enemyAct(i); i++ }
            c.endEnemyTurn()
            turns++
        }
        val r = result ?: fail("el combate no terminó en 300 turnos (${pc.enemyIds})")
        run.finishCombat(r)
        return r
    }

    /** Pisa una casilla del mapa (y pelea si hay combate). */
    private fun walkOneStep(run: Run) {
        val x = run.pos.x
        val y = run.pos.y
        val options = listOf(x + 1 to y, x to y - 1, x to y + 1).filter { (nx, ny) -> run.isReachable(nx, ny) }
        if (options.isEmpty()) fail("atorado en ${run.pos.key} del piso ${run.player.act}-${run.player.floor}")
        // prefiere avanzar; si no se puede, se mueve en vertical
        val (nx, ny) = options.firstOrNull { it.first == x + 1 } ?: options[Rng.int(options.size)]
        val pc = run.arrive(nx, ny)
        if (pc != null) playCombat(run, pc)
    }

    /** Un paso de la partida según la pantalla. */
    private fun step(run: Run, log: MutableList<String>) {
        when (run.screen) {
            RunScreen.ACT_INTRO -> run.beginFloor()
            RunScreen.MAP -> walkOneStep(run)
            RunScreen.NODE_STUB -> run.leaveStub()
            RunScreen.REWARD -> {
                run.loot.indices.forEach { i -> if (!run.collectLoot(i)) run.dropLoot(i) }
                if (run.rewardCards.isNotEmpty()) run.pickRewardCard(run.rewardCards[0])
                assertTrue(run.canFinishReward(), "la recompensa debía poder cerrarse")
                run.finishReward()
            }
            RunScreen.BOSS_RELIC -> {
                assertTrue(run.bossRelicChoices.size in 1..3)
                run.pickBossRelic(run.bossRelicChoices[0])
            }
            RunScreen.COMBAT -> fail("el bot no deja un combate a medias")
            RunScreen.GAME_OVER, RunScreen.VICTORY -> {}
        }
        log.add(run.screen.name)
    }

    private fun checkInvariants(run: Run) {
        val p = run.player
        assertTrue(p.hp in 0..p.maxHp, "vida fuera de rango: ${p.hp}/${p.maxHp}")
        assertTrue(p.deck.all { Cards.get(it) != null }, "carta desconocida en el mazo")
        assertTrue(p.relics.all { Relics.get(it) != null }, "objeto desconocido")
        assertTrue(p.act in 1..World.castles.size && p.floor in 1..World.FLOORS_PER_CASTLE)
        assertTrue(Plan.isValid(p.plan))
    }

    @Test
    fun startingARunGivesTheStarterDeckAndAMap() {
        Rng.seed(1)
        for (id in chars) {
            val run = Run.start(id, "madura")
            val p = run.player
            assertEquals(World.starterDeck(id), p.deck, "mazo inicial de $id")
            assertEquals(World.character(id)!!.baseHp, p.maxHp)
            assertEquals(World.difficulty("madura").gold, p.gold)
            assertEquals(RunScreen.ACT_INTRO, run.screen)
            assertEquals(1, p.act); assertEquals(1, p.floor)
            assertTrue(Plan.isValid(p.plan))
            assertEquals(Plan.floorSize(1, 1), Pair(run.map.cols, run.map.rows))
            assertEquals(0, run.pos.x)
            assertTrue(run.visited.contains(run.pos.key))
            assertTrue(MapGen.isSound(run.map, run.pos.y).first, "el primer mapa tiene salida")
        }
        // el grado Desafiante empieza con el Gusano Interior en el mazo
        val hard = Run.start("manzana", "podrida", Progress().also { it.unlocked["manzana"] = 2 })
        assertTrue(hard.player.deck.contains("gusano_interior"))
        // un grado bloqueado baja al más alto abierto
        assertEquals("madura", Run.start("manzana", "podrida").player.difficulty)
        Rng.unseed()
    }

    @Test
    fun planUsesEveryCastleOnce() {
        Rng.seed(2)
        repeat(50) {
            val plan = Plan.run()
            assertTrue(Plan.isValid(plan))
            assertTrue(World.castles[0].pool!!.toSet().containsAll(plan[0]))
            assertEquals(setOf("dados", "poker", "ajedrez"), plan[1].toSet())
            assertEquals("torre_rey", plan[2].last())
            assertEquals(3, plan[2].toSet().size)
        }
        Rng.unseed()
    }

    @Test
    fun invincibleBotFinishesAllNineFloors() {
        for (seed in 1..12) {
            Rng.seed(seed)
            val progress = Progress()
            val run = Run.start(chars[seed % chars.size], "madura", progress)
            // para llegar hasta el final sin morir: mucha vida y mucha fuerza
            run.player.maxHp = 5000; run.player.hp = 5000; run.player.permanentStrength = 60
            val floorsSeen = HashSet<String>()
            val log = ArrayList<String>()
            var steps = 0
            while (!run.isOver && steps < 20000) {
                floorsSeen.add("${run.player.act}-${run.player.floor}")
                step(run, log)
                checkInvariants(run)
                steps++
            }
            assertEquals(RunScreen.VICTORY, run.screen, "semilla $seed terminó en ${run.screen} tras $steps pasos")
            assertEquals(9, floorsSeen.size, "semilla $seed: pisos vistos $floorsSeen")
            assertTrue(run.unlockMsg.isNotEmpty(), "ganar con Normal abre el grado Difícil")
            assertTrue(progress.isUnlocked(run.player.characterId, "pasada"))
            assertFalse(Save.shouldSave(run), "una partida terminada no se guarda")
            assertNotNull(run.lastBossId)
            // se colaron las dos maldiciones de castillo
            assertTrue(run.player.deck.contains("dado_trucado") && run.player.deck.contains("gusano_interior"))
        }
        Rng.unseed()
    }

    @Test
    fun normalBotsEventuallyDieAndTheRunEnds() {
        var deaths = 0
        for (seed in 100..140) {
            Rng.seed(seed)
            val run = Run.start(chars[seed % chars.size], "podrida", Progress().also { it.unlocked.putAll(chars.associateWith { 2 }) })
            val log = ArrayList<String>()
            var steps = 0
            while (!run.isOver && steps < 20000) { step(run, log); checkInvariants(run); steps++ }
            assertTrue(run.isOver, "la partida $seed no terminó")
            if (run.screen == RunScreen.GAME_OVER) deaths++
        }
        assertTrue(deaths > 0, "algún bot normal debe morir en Desafiante")
        Rng.unseed()
    }

    @Test
    fun savingAndLoadingGivesTheSameRun() {
        for (seed in 1..8) {
            Rng.seed(seed)
            val progress = Progress()
            val run = Run.start(chars[seed % chars.size], "madura", progress)
            run.player.maxHp = 3000; run.player.hp = 3000; run.player.permanentStrength = 40
            val log = ArrayList<String>()
            var steps = 0
            var saves = 0
            while (!run.isOver && steps < 20000) {
                step(run, log)
                if (Save.shouldSave(run)) {
                    val text = Save.encode(run)
                    val back = Save.decode(text, progress) ?: fail("no se pudo leer lo guardado (semilla $seed, paso $steps)")
                    // lo guardado en una pantalla "de paso" vuelve en el mapa; el resto, igual
                    val keeps = run.screen in listOf(RunScreen.ACT_INTRO, RunScreen.REWARD, RunScreen.BOSS_RELIC)
                    // una recompensa ya recogida entera se cierra sola al cargar
                    val closesOnLoad = run.screen == RunScreen.REWARD && run.canFinishReward()
                    if (!closesOnLoad) assertEquals(if (keeps) run.screen else RunScreen.MAP, back.screen, "pantalla (semilla $seed, paso $steps)")
                    assertEquals(run.player.deck, back.player.deck)
                    assertEquals(run.player.relics, back.player.relics)
                    assertEquals(run.player.hp, back.player.hp)
                    assertEquals(run.player.gold, back.player.gold)
                    assertEquals(run.player.plan, back.player.plan)
                    // en la guarida del jefe (solo justo después de vencerlo) la ficha vuelve una casilla atrás, como en la web
                    if (run.pos.x < run.map.cols - 1) assertEquals(run.pos.key, back.pos.key)
                    assertEquals(run.visited.toList(), back.visited.toList())
                    assertEquals(run.map.grid.map { it.toList() }, back.map.grid.map { it.toList() })
                    assertEquals(run.map.themeId, back.map.themeId)
                    assertEquals(run.map.bossId, back.map.bossId)
                    if (run.screen == RunScreen.MAP) assertEquals(text, Save.encode(back), "ida y vuelta (semilla $seed, paso $steps)")
                    saves++
                }
                steps++
            }
            assertTrue(saves > 20, "se guardó muy poco")
        }
        Rng.unseed()
    }

    @Test
    fun corruptSavesAreRejected() {
        assertNull(Save.decode("", Progress()))
        assertNull(Save.decode("{\"version\":1}", Progress()))
        assertNull(Save.decode("no es json", Progress()))
    }

    @Test
    fun progressRoundTripsAndUnlocksGrades() {
        val p = Progress()
        assertEquals(0, p.level("kiwi"))
        assertTrue(p.isUnlocked("kiwi", "madura"))
        assertFalse(p.isUnlocked("kiwi", "pasada"))
        val msg = p.unlockNext("kiwi", "madura")
        assertTrue(msg.contains("Difícil") && msg.contains("Kiwi"), msg)
        assertEquals("", p.unlockNext("kiwi", "madura"), "ya estaba abierto")
        assertTrue(p.isUnlocked("kiwi", "pasada"))
        assertEquals("", p.unlockNext("kiwi", "podrida"), "no hay grado después del último")
        p.discover(listOf("golpe_cascara+", "jugo_defensivo"))
        val back = Save.decodeProgress(Save.encodeProgress(p))
        assertEquals(p.unlocked, back.unlocked)
        assertEquals(setOf("golpe_cascara", "jugo_defensivo"), back.discovered)
        assertEquals(0, Save.decodeProgress("%%%").level("kiwi"))
    }

    @Test
    fun rewardsFollowTheRules() {
        Rng.seed(7)
        val run = Run.start("manzana", "madura")
        val p = run.player
        // las cartas ofrecidas son de la fruta o neutrales y distintas entre sí
        repeat(200) {
            val ids = Rewards.rollCards(p, 3, "enemy")
            assertEquals(3, ids.size)
            assertEquals(3, ids.map { it.removeSuffix("+") }.toSet().size)
            ids.forEach { id ->
                val c = Cards.get(id)!!
                assertTrue(c.character == null || c.character == "manzana", "carta de otra fruta: $id")
                assertTrue(c.rarity in listOf("common", "uncommon", "rare"))
                assertFalse(id.endsWith("+"), "en el castillo 1 no hay cartas maduradas")
            }
        }
        // los jefes siempre ofrecen cartas raras
        repeat(50) { Rewards.rollCards(p, 3, "boss").forEach { assertEquals("rare", Cards.get(it)!!.rarity) } }
        // un objeto que ya tienes no vuelve a salir
        val all = Relics.db.values.filter { it.tier != "boss" }
        p.relics.addAll(all.drop(1).map { it.id })
        repeat(20) { assertEquals(all[0].id, Rewards.randomRelic(p, listOf("common", "uncommon", "rare"))!!.id) }
        assertNull(Rewards.randomRelic(p, listOf("common", "uncommon", "rare"), listOf(all[0].id)))
        Rng.unseed()
    }

    @Test
    fun theMapFlowRespectsMovementRules() {
        Rng.seed(11)
        val run = Run.start("kiwi", "madura")
        run.beginFloor()
        val start = run.pos
        // no se puede volver atrás ni saltar
        assertFalse(run.isReachable(start.x - 1, start.y))
        assertFalse(run.isReachable(start.x + 2, start.y))
        assertFalse(run.isReachable(start.x + 1, start.y + 1))
        // al pisar una casilla se consume y deja de ser alcanzable
        val (nx, ny) = listOf(start.x + 1 to start.y, start.x to start.y - 1, start.x to start.y + 1).first { run.isReachable(it.first, it.second) }
        val before = run.map.grid[ny][nx]
        val pc = run.arrive(nx, ny)
        assertTrue(run.visited.contains("$nx,$ny"))
        if (before != NodeType.BOSS) assertEquals(NodeType.EMPTY, run.map.grid[ny][nx])
        if (before == NodeType.ENEMY || before == NodeType.ELITE) assertNotNull(pc) else assertNull(pc)
        assertFalse(run.isReachable(start.x, start.y))
        Rng.unseed()
    }
}
