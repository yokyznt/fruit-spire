package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.fail

/**
 * Corre en Kotlin los mismos combates con semilla que `node tools/crosscheck-combat.js` corrió en el motor
 * JavaScript y exige que cada paso salga idéntico. Si falta `build/crosscheck.txt`, la prueba no hace nada
 * (genéralo primero con el script de Node, desde la raíz del repositorio).
 */
class CrossCheckTest {
    private val chars = listOf("manzana", "platanin", "kiwi", "uva")

    private fun st(e: Entity) = e.statuses.keys.sorted().joinToString(";") { "$it=${e.statuses[it]}" }
    private fun snap(c: Combat): String {
        val p = c.player
        return listOf(
            "T${c.turnNumber}${c.turn[0]}${if (c.ended) "END" else ""}",
            "P${p.hp}/${p.maxHp}b${p.block}e${p.energy}g${p.gold}[${st(p)}]",
            "H${p.hand.joinToString(",")}", "D${p.drawPile.size}", "S${p.discardPile.size}", "X${p.exhaustPile.size}",
            c.enemies.mapIndexed { i, e -> "E$i${e.defId}${e.hp}/${e.maxHp}b${e.block}[${st(e)}]m${e.nextMove?.id ?: "-"}" }.joinToString(";"),
            "G${p.garden.joinToString(",") { it.type + it.timer }}"
        ).joinToString(" ")
    }

    /** Un combate completo con el mismo bot que el script de Node. Devuelve cada paso. */
    private fun runCase(k: Int): List<String> {
        Rng.seed(1000 + k)
        val charId = chars[k % chars.size]
        val themes = World.themes.values.toList()
        val theme = themes[k % themes.size]
        val groups = theme.weak + theme.normal + theme.elites + theme.bosses.map { listOf(it) }
        val group = groups[(k / themes.size) % groups.size]
        val pool = Cards.all().filter { d ->
            (d.character == null || d.character == charId) && d.type in listOf("attack", "skill", "power") && d.rarity != "token"
        }.map { it.id }
        val deck = ArrayList(World.starterDeck(charId))
        for (i in 0 until 6) deck.add(pool[(k * 5 + i * 3) % pool.size] + if ((k + i) % 3 == 0) "+" else "")
        val relicIds = Relics.db.keys.toList()
        val relics = listOf(relicIds[k % relicIds.size], relicIds[(k * 7 + 3) % relicIds.size]).distinct()

        val p = Player()
        p.characterId = charId
        p.maxHp = World.character(charId)!!.baseHp
        p.hp = p.maxHp
        p.deck = deck
        relics.forEach { r -> p.relics.add(r); Relics.hooks(r)?.onPickup?.invoke(p) }
        val diff = World.difficulty("madura")
        val mods = World.scaledMods(diff.hpMult, diff.dmgBonus, theme.castle, 1 + (k % 3))
        val c = Combat(p, group, mods = mods, rule = theme.rule)

        val steps = ArrayList<String>()
        steps.add(snap(c))
        val seedIds = Seeds.db.keys.toList()
        val seedId = seedIds[k % seedIds.size]
        var turn = 0
        while (turn < 40 && !c.ended) {
            if (turn == 1 && k % 3 == 0) { c.useSeed(seedId, c.enemies.indexOfFirst { it.isAlive() }); steps.add("seed " + snap(c)) }
            var plays = 0
            while (plays < 15 && !c.ended) {
                val idx = p.hand.indexOfFirst { c.canPlay(it) }
                if (idx < 0) break
                c.playCard(idx, c.enemies.indexOfFirst { it.isAlive() })
                steps.add(snap(c))
                plays++
            }
            if (c.ended) break
            c.endPlayerTurn(); steps.add(snap(c))
            var i = 0
            while (i < c.enemies.size && !c.ended) {
                if (c.enemies[i].isAlive()) { c.enemyAct(i); steps.add(snap(c)) }
                i++
            }
            c.endEnemyTurn(); steps.add(snap(c))
            turn++
        }
        return steps
    }

    @Test
    fun matchesTheJsEngine() {
        val file = File("build/crosscheck.txt")
        if (!file.exists()) { println("CrossCheckTest: falta ${file.absolutePath} (node tools/crosscheck-combat.js)"); return }
        val expected = LinkedHashMap<Int, MutableList<String>>()
        var current: MutableList<String>? = null
        file.readLines().forEach { line ->
            if (line.startsWith("#")) { current = ArrayList<String>().also { expected[line.substring(1).toInt()] = it } }
            else if (line.isNotEmpty()) current!!.add(line)
        }
        var stepsCompared = 0
        for ((k, exp) in expected) {
            val got = try { runCase(k) } catch (e: Throwable) { fail("caso $k: ${e::class.simpleName}: ${e.message}\n${e.stackTraceToString().lines().take(6).joinToString("\n")}") }
            val n = minOf(exp.size, got.size)
            for (i in 0 until n) {
                if (exp[i] != got[i]) fail("caso $k, paso $i difiere\n  JS : ${exp[i]}\n  Kt : ${got[i]}\n  (paso anterior: ${if (i > 0) exp[i - 1] else "-"})")
            }
            assertEquals(exp.size, got.size, "caso $k: distinta cantidad de pasos")
            stepsCompared += n
        }
        println("CrossCheckTest: ${expected.size} combates, $stepsCompared pasos idénticos")
    }

    /** Un mapa con la misma semilla y opciones que el script de Node, en el mismo formato de texto. */
    private fun mapLines(k: Int): Pair<MapData, List<String>> {
        Rng.seed(5000 + k)
        val cols = 9 + (k % 7)
        val rows = 5 + (k % 4)
        val startY = k % rows
        val variantIds = MapGen.variants.keys.toList()
        val m = MapGen.generate(startY, elites = 3 + (k % 3), cols = cols, rows = rows, variant = variantIds[k % variantIds.size], games = 1 + (k % 3))
        val out = ArrayList<String>()
        m.grid.forEachIndexed { y, r -> out.add("g$y ${r.joinToString(" ") { it.take(2) }}") }
        m.wallsV.forEachIndexed { y, r -> out.add("v$y ${r.joinToString("") { if (it) "1" else "0" }}") }
        m.wallsH.forEachIndexed { y, r -> out.add("h$y ${r.joinToString("") { if (it) "1" else "0" }}") }
        out.add("meta boss=${m.bossY} rivers=${m.rivers.joinToString(";") { "${it.col}:${it.bridge}" }} ${m.cols}x${m.rows} ${m.variant} seed=${m.seed}")
        return Pair(m, out)
    }

    @Test
    fun mapsMatchTheJsEngine() {
        val file = File("build/crosscheck-map.txt")
        if (!file.exists()) { println("CrossCheckTest: falta ${file.absolutePath} (node tools/crosscheck-combat.js)"); return }
        val expected = LinkedHashMap<Int, MutableList<String>>()
        var current: MutableList<String>? = null
        file.readLines().forEach { line ->
            if (line.startsWith("#")) { current = ArrayList<String>().also { expected[line.substring(1).toInt()] = it } }
            else if (line.isNotEmpty()) current!!.add(line)
        }
        for ((k, exp) in expected) {
            val (map, got) = try { mapLines(k) } catch (e: Throwable) { fail("mapa $k: ${e::class.simpleName}: ${e.message}\n${e.stackTraceToString().lines().take(6).joinToString("\n")}") }
            assertEquals(exp.size, got.size, "mapa $k: distinta cantidad de líneas")
            for (i in exp.indices) if (exp[i] != got[i]) fail("mapa $k, línea $i difiere\n  JS : ${exp[i]}\n  Kt : ${got[i]}")
            val sound = MapGen.isSound(map, k % (5 + (k % 4)))
            if (!sound.first) fail("mapa $k: se puede quedar atorado en ${sound.second?.joinToString(",")}")
        }
        println("CrossCheckTest: ${expected.size} mapas idénticos y sin trampas")
    }
}
