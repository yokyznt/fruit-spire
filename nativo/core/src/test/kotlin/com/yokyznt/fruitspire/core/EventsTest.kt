package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.fail

/** Pruebas de los eventos de misterio, el pozo, el calabozo y el dado del destino (js/game.js + js/data/events*.js). */
class EventsTest {
    private val chars = listOf("manzana", "platanin", "kiwi", "uva")

    private fun newRun(seed: Int, char: String = "manzana"): Run {
        Rng.seed(seed)
        return Run.start(char, "madura").also { it.beginFloor() }
    }

    /** Pisa una casilla de [type] justo al lado de la salida. */
    private fun enter(run: Run, type: String): PendingCombat? {
        val x = run.pos.x
        val y = run.pos.y
        val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = type
        return run.arrive(nx, ny)
    }

    private fun show(run: Run, id: String) { run.currentEvent = Events.byId(id)!!; run.screen = RunScreen.EVENT }

    private fun collectAll(run: Run) { run.loot.indices.forEach { if (!run.collectLoot(it)) run.dropLoot(it) } }

    @Test
    fun everyEventIsWellFormed() {
        val ids = Events.all.map { it.id }
        assertEquals(ids.size, ids.toSet().size, "ids repetidos")
        assertEquals(30, ids.size)
        Events.all.forEach { ev ->
            assertTrue(ev.options.size in 2..3, ev.id)
            assertTrue(ev.title.isNotBlank() && ev.desc.isNotBlank())
            ev.options.forEach { o ->
                assertTrue(o.text.isNotBlank(), ev.id)
                assertTrue((o.special != null) != (o.effect != null), "${ev.id}: «${o.text}» debe tener efecto o desvío, no ambos")
                o.special?.let { assertTrue(it in setOf("fight", "well", "dungeon") || it.startsWith("game:"), "desvío raro $it") }
                o.tone?.let { assertTrue(it in setOf("good", "risk", "bad", "neutral"), "tono raro $it") }
            }
        }
    }

    @Test
    fun everyOptionOfEveryEventLeavesAValidRun() {
        var fights = 0
        var results = 0
        for (seed in 1..25) for (ev in Events.all) for (idx in ev.options.indices) {
            val run = newRun(seed * 7 + idx, chars[seed % 4])
            val p = run.player
            p.act = 1 + seed % 3
            p.gold = 300
            p.hp = p.maxHp / 2
            show(run, ev.id)
            val label = "${ev.id}#$idx semilla $seed"
            val pc = run.resolveEventOption(idx)
            if (run.screen == RunScreen.EVENT && pc == null) {
                // opción bloqueada: no pasó nada
                assertTrue(ev.options[idx].locked?.invoke(p)?.isNotEmpty() == true, "$label no hizo nada sin estar bloqueada")
                continue
            }
            if (pc != null) {
                fights++
                assertTrue(pc.enemyIds.isNotEmpty(), label)
                assertEquals("enemy", pc.kind, label)
            } else {
                when (run.screen) {
                    RunScreen.EVENT_RESULT -> { results++; assertTrue(run.nodeMessage.isNotEmpty(), label) }
                    RunScreen.WELL, RunScreen.DUNGEON, RunScreen.MINIGAME -> {}
                    else -> fail("$label terminó en ${run.screen}")
                }
            }
            assertTrue(p.hp in 1..p.maxHp, "$label vida ${p.hp}/${p.maxHp}")
            assertTrue(p.gold >= 0 && p.maxHp > 0, label)
            collectAll(run)
            assertTrue(p.hp in 1..p.maxHp, "$label vida tras recoger ${p.hp}/${p.maxHp}")
            p.deck.forEach { assertNotNull(Cards.get(it), "carta desconocida $it ($label)") }
            p.relics.forEach { assertNotNull(com.yokyznt.fruitspire.core.data.Relics.get(it), "objeto desconocido $it ($label)") }
        }
        assertTrue(fights > 0 && results > 500, "se probaron pocas opciones: $fights peleas, $results resultados")
        Rng.unseed()
    }

    @Test
    fun gainsBecomeLootAndLossesApplyAtOnce() {
        val run = newRun(5)
        val p = run.player
        p.hp = 30
        show(run, "fuente_magica")
        assertNull(run.resolveEventOption(0)) // beber: +20 ❤️
        assertEquals(RunScreen.EVENT_RESULT, run.screen)
        assertEquals(30, p.hp, "la vida sube al recoger el premio, no antes")
        assertEquals(listOf("heal"), run.loot.map { it.k })
        assertEquals(20, run.loot[0].n)
        assertFalse(run.leaveNode(), "primero hay que recoger")
        assertTrue(run.collectLoot(0))
        assertEquals(50, p.hp)
        assertTrue(run.leaveNode())
        assertEquals(RunScreen.MAP, run.screen)
        assertNull(run.currentEvent)
        Rng.unseed()
    }

    @Test
    fun payingIsImmediateAndTheRelicIsLoot() {
        val run = newRun(6)
        val p = run.player
        p.gold = 100
        show(run, "comerciante_misterioso")
        assertNull(run.resolveEventOption(0)) // 40 de oro por un objeto
        assertEquals(60, p.gold)
        assertEquals(listOf("relic"), run.loot.map { it.k })
        assertTrue(p.relics.isEmpty(), "el objeto llega al recogerlo")
        assertTrue(run.collectLoot(0))
        assertEquals(1, p.relics.size)
        Rng.unseed()
    }

    @Test
    fun lockedOptionsDoNothing() {
        val run = newRun(7)
        run.player.gold = 10
        show(run, "comerciante_misterioso")
        assertNull(run.resolveEventOption(0))
        assertEquals(RunScreen.EVENT, run.screen)
        assertEquals(10, run.player.gold)
        assertTrue(run.loot.isEmpty())
        assertNull(run.resolveEventOption(9))
        Rng.unseed()
    }

    @Test
    fun deckChangesAreReported() {
        val run = newRun(8)
        val p = run.player
        show(run, "arbol_sabio")
        assertNull(run.resolveEventOption(0)) // madura 2 cartas y pierde 10 ❤️
        assertEquals(2, run.deckChanges.count { it.kind == "upgrade" })
        run.deckChanges.forEach { assertEquals(it.from + "+", it.to) }
        assertEquals(2, p.deck.count { it.endsWith("+") })

        show(run, "monton_compost")
        assertNull(run.resolveEventOption(0)) // entierra una carta básica
        assertEquals(listOf("remove"), run.deckChanges.map { it.kind })

        show(run, "puesto_abandonado")
        p.act = 2
        assertNull(run.resolveEventOption(0)) // +60 de oro y una Fruta Magullada
        assertTrue("fruta_magullada" in p.deck, "la maldición entra al mazo sola")
        assertEquals(listOf("add"), run.deckChanges.map { it.kind })
        assertTrue(run.loot.any { it.k == "gold" })
        Rng.unseed()
    }

    @Test
    fun trapsAndAmbushesStartAFight() {
        val run = newRun(9)
        show(run, "nido_zumbon")
        val pc = run.resolveEventOption(0)
        assertNotNull(pc)
        assertEquals("enemy", pc.kind)
        assertNull(run.currentEvent)
        // el cofre mímico: a veces es un objeto y a veces una trampa
        var trap = 0
        var loot = 0
        for (seed in 1..80) {
            val r = newRun(seed)
            show(r, "cofre_mimico")
            val fight = r.resolveEventOption(0)
            if (fight != null) { trap++; assertEquals("¡ERA UN MÍMICO! Te salta encima.", r.trapMessage) } else { loot++; assertEquals(RunScreen.EVENT_RESULT, r.screen) }
        }
        assertTrue(trap > 10 && loot > 10, "mímico $trap, objeto $loot")
        Rng.unseed()
    }

    @Test
    fun specialOptionsRouteToTheirScreens() {
        val run = newRun(10)
        show(run, "pozo_deseos")
        assertNull(run.resolveEventOption(0))
        assertEquals(RunScreen.WELL, run.screen)
        assertEquals(0, run.wellSpins)

        val r2 = newRun(11)
        show(r2, "trampilla")
        assertNull(r2.resolveEventOption(0))
        assertEquals(RunScreen.DUNGEON, r2.screen)
        assertNotNull(r2.dungeon)

        val r3 = newRun(12)
        show(r3, "mesa_dados")
        assertNull(r3.resolveEventOption(0))
        assertEquals(RunScreen.MINIGAME, r3.screen)
        assertEquals("dice", r3.table!!.kind)
        Rng.unseed()
    }

    @Test
    fun mysteryTilesPickEventsThatFitTheFloor() {
        for (seed in 1..150) {
            val run = newRun(seed)
            run.player.act = 1 + seed % 3
            assertNull(enter(run, NodeType.MYSTERY))
            assertEquals(RunScreen.EVENT, run.screen)
            val ev = run.currentEvent!!
            assertTrue(ev.acts == null || run.player.act in ev.acts!!, "${ev.id} no sale en el castillo ${run.player.act}")
            assertTrue(ev.themes == null || run.map.themeId in ev.themes!!, "${ev.id} no sale en ${run.map.themeId}")
        }
        // nunca el mismo evento dos veces seguidas
        val run = newRun(77)
        var last: String? = null
        var seen = 0
        repeat(40) {
            run.screen = RunScreen.MAP
            val x = run.pos.x; val y = run.pos.y
            val next = listOf(x + 1 to y, x to y - 1, x to y + 1).firstOrNull { run.isReachable(it.first, it.second) } ?: return@repeat
            run.map.grid[next.second][next.first] = NodeType.MYSTERY
            run.arrive(next.first, next.second)
            val id = run.currentEvent?.id
            if (id != null) { assertTrue(id != last, "$id repetido"); last = id; seen++ }
        }
        assertTrue(seen > 3, "se pisaron pocos misterios seguidos: $seen")
        Rng.unseed()
    }

    // ---------- pozo ----------
    @Test
    fun wellCostsMoreEachTimeAndNeedsLootCollected() {
        val run = newRun(20)
        val p = run.player
        show(run, "pozo_deseos")
        run.resolveEventOption(0)
        p.gold = 200
        assertEquals(15, run.wellCost())
        assertTrue(run.tossWellCoin())
        assertEquals(27, run.wellCost())
        assertTrue(run.wellMessage.isNotEmpty())
        if (run.lootPending()) assertFalse(run.tossWellCoin(), "hay premios sin recoger")
        collectAll(run)
        val goldBefore = p.gold
        assertTrue(run.tossWellCoin())
        assertEquals(39, run.wellCost())
        collectAll(run)
        assertTrue(p.gold >= goldBefore - 27, "se cobraron 27 y a lo mucho se ganó oro")
        p.gold = 5
        assertFalse(run.tossWellCoin(), "sin oro no se tira")
        assertTrue(run.leaveNode())
        assertEquals(RunScreen.MAP, run.screen)
        Rng.unseed()
    }

    @Test
    fun wellOutcomesAreAllValid() {
        val seen = HashSet<String>()
        for (seed in 1..400) {
            val run = newRun(seed)
            val p = run.player
            show(run, "pozo_deseos"); run.resolveEventOption(0)
            p.gold = 500; p.hp = p.maxHp / 2
            assertTrue(run.tossWellCoin())
            assertTrue(p.hp in 1..p.maxHp && p.gold >= 0)
            seen.add(run.wellMessage.take(12))
            collectAll(run)
            assertTrue(p.hp in 1..p.maxHp)
        }
        assertTrue(seen.size >= 6, "salieron pocos resultados distintos: $seen")
        Rng.unseed()
    }

    @Test
    fun wellSurvivesSaving() {
        val run = newRun(21)
        show(run, "pozo_deseos"); run.resolveEventOption(0)
        run.player.gold = 100
        run.tossWellCoin(); collectAll(run); run.tossWellCoin(); collectAll(run)
        val back = Save.decode(Save.encode(run), run.progress)!!
        assertEquals(RunScreen.WELL, back.screen)
        assertEquals(run.wellSpins, back.wellSpins)
        assertEquals(run.wellCost(), back.wellCost())
        Rng.unseed()
    }

    // ---------- calabozo ----------
    private fun nextCell(d: Dungeon): Pair<Int, Int> =
        listOf(d.pos.x + 1 to d.pos.y, d.pos.x - 1 to d.pos.y, d.pos.x to d.pos.y + 1, d.pos.x to d.pos.y - 1)
            .filter { (x, y) -> x in 0..2 && y in 0..2 && !d.cleared[y][x] }
            .minByOrNull { (x, y) -> Math.abs(x - d.exit.x) + Math.abs(y - d.exit.y) }!!

    @Test
    fun dungeonIsFoughtCellByCellUntilTheStairs() {
        val run = newRun(30)
        val p = run.player
        show(run, "trampilla"); run.resolveEventOption(0)
        val d = run.dungeon!!
        assertEquals(2, d.pos.y)
        assertEquals(0, d.exit.y)
        assertTrue(d.exit.x == 0 || d.exit.x == 2)
        assertEquals(2 - d.exit.x, d.pos.x, "se entra por la esquina contraria a la escalera")
        assertTrue(d.cleared[d.pos.y][d.pos.x])
        // no se puede saltar ni quedarse en el mismo sitio
        assertNull(run.enterDungeonCell(d.exit.x, d.exit.y))
        assertNull(run.enterDungeonCell(d.pos.x, d.pos.y))
        var steps = 0
        var gold0 = p.gold
        while (run.screen == RunScreen.DUNGEON && steps < 20) {
            val next = nextCell(run.dungeon!!)
            val pc = run.enterDungeonCell(next.first, next.second)!!
            assertEquals("dungeon", pc.kind)
            assertTrue(pc.enemyIds.isNotEmpty())
            val c = run.startCombat(pc)
            assertEquals(RunScreen.COMBAT, run.screen)
            c.enemies.forEach { it.hp = 0 }
            p.block = 7
            run.finishCombat("win")
            assertEquals(0, p.block, "el calabozo limpia la cáscara")
            steps++
            if (run.screen == RunScreen.DUNGEON) {
                assertTrue(run.dungeonGold in 8..15, "oro de casilla ${run.dungeonGold}")
                assertTrue(p.gold > gold0)
                gold0 = p.gold
            }
        }
        assertTrue(steps >= 3, "de la entrada a la escalera hay al menos 3 casillas")
        assertEquals(RunScreen.TREASURE, run.screen, "al vencer al guardián de la escalera sale el premio gordo")
        assertNull(run.dungeon)
        assertTrue(run.loot.any { it.k == "gold" && it.n in 45..69 })
        assertTrue(run.nodeMessage.endsWith("de oro por vaciar el calabozo."), run.nodeMessage)
        collectAll(run)
        assertTrue(run.leaveNode())
        Rng.unseed()
    }

    @Test
    fun walkingBackOverClearedCellsNeedsNoFight() {
        val run = newRun(31)
        show(run, "trampilla"); run.resolveEventOption(0)
        val d = run.dungeon!!
        val origin = Pos(d.pos.x, d.pos.y)
        val first = nextCell(d)
        val pc = run.enterDungeonCell(first.first, first.second)!!
        run.startCombat(pc).enemies.forEach { it.hp = 0 }
        run.finishCombat("win")
        assertNull(run.enterDungeonCell(origin.x, origin.y), "volver a una casilla limpia no pelea")
        assertEquals(origin.x, run.dungeon!!.pos.x)
        // se puede salir cuando uno quiera
        run.leaveDungeon()
        assertEquals(RunScreen.MAP, run.screen)
        assertNull(run.dungeon)
        Rng.unseed()
    }

    @Test
    fun losingInTheDungeonEndsTheRun() {
        val run = newRun(32)
        show(run, "trampilla"); run.resolveEventOption(0)
        val next = nextCell(run.dungeon!!)
        val pc = run.enterDungeonCell(next.first, next.second)!!
        run.startCombat(pc)
        run.finishCombat("lose")
        assertEquals(RunScreen.GAME_OVER, run.screen)
        Rng.unseed()
    }

    @Test
    fun dungeonSurvivesSaving() {
        val run = newRun(33)
        show(run, "trampilla"); run.resolveEventOption(0)
        val next = nextCell(run.dungeon!!)
        val pc = run.enterDungeonCell(next.first, next.second)!!
        run.startCombat(pc).enemies.forEach { it.hp = 0 }
        run.finishCombat("win")
        assertEquals(RunScreen.DUNGEON, run.screen)
        val back = Save.decode(Save.encode(run), run.progress)!!
        assertEquals(RunScreen.DUNGEON, back.screen)
        val b = back.dungeon!!
        assertEquals(run.dungeon!!.cleared.map { it.toList() }, b.cleared.map { it.toList() })
        assertEquals(run.dungeon!!.pos.key, b.pos.key)
        assertEquals(run.dungeon!!.exit.key, b.exit.key)
        assertEquals(run.dungeon!!.deco, b.deco)
        Rng.unseed()
    }

    // ---------- dado del destino ----------
    @Test
    fun fateTiersMatchTheRules() {
        assertEquals("fumble", Fate.tier(1).id)
        for (r in 2..7) assertEquals("bad", Fate.tier(r).id)
        for (r in 8..13) assertEquals("none", Fate.tier(r).id)
        for (r in 14..19) assertEquals("good", Fate.tier(r).id)
        assertEquals("crit", Fate.tier(20).id)
    }

    @Test
    fun fateIsRolledOnceBeforeTheBoss() {
        val run = newRun(40)
        val bossCol = run.map.cols - 1
        val y = (0 until run.map.rows).first {
            run.pos = Pos(bossCol - 1, it)
            run.isReachable(bossCol, it)
        }
        run.pos = Pos(bossCol - 1, y)
        assertNull(run.map.fate)
        assertNull(run.arrive(bossCol, y), "antes del jefe se tira el dado")
        assertEquals(RunScreen.FATE, run.screen)
        assertNull(run.fateFight(), "hay que tirar primero")
        val roll = run.rollFate()
        assertTrue(roll in 1..20)
        assertEquals(roll, run.map.fate)
        assertEquals(roll, run.fateRoll)
        assertFalse(run.visited.contains("$bossCol,$y"), "la guarida no cuenta como pisada")
        val pc = run.fateFight()!!
        assertEquals("boss", pc.kind)
        assertNull(run.fateRoll)
        // con el dado ya tirado se entra directo
        run.screen = RunScreen.MAP
        run.pos = Pos(bossCol - 1, y)
        val again = run.arrive(bossCol, y)
        assertNotNull(again)
        assertEquals("boss", again.kind)
        Rng.unseed()
    }

    @Test
    fun fateChangesTheBossFight() {
        // pifia: el jefe empieza con 2 de Madurez
        var run = newRun(41)
        run.map.fate = 1
        var c = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "boss"))
        assertTrue(c.enemies[0].getStatus("strength") >= 2)
        // mala suerte: el jefe empieza con 10 de cáscara
        run = newRun(42)
        run.map.fate = 5
        c = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "boss"))
        assertTrue(c.enemies[0].block >= 10)
        // crítico: cáscara, energía y Madurez para ti
        run = newRun(43)
        run.map.fate = 20
        val energy0 = run.player.maxEnergy
        c = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "boss"))
        assertTrue(c.player.block >= 12)
        assertTrue(c.player.getStatus("strength") >= 2)
        assertTrue(c.player.energy >= energy0 + 2)
        // sin cambios: nada, y los combates normales no se ven afectados
        run = newRun(44)
        run.map.fate = 10
        c = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "boss"))
        assertEquals(0, c.enemies[0].block)
        run = newRun(45)
        run.map.fate = 20
        c = run.startCombat(PendingCombat(listOf("avispa_furiosa"), "enemy"))
        assertEquals(0, c.player.block)
        Rng.unseed()
    }
}
