package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.Plan
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.SEED_SLOTS
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.intOrNull
import kotlin.math.min

// ============================================================
// Guardado de la partida y del progreso (saveGame / loadGame de js/game.js), en JSON. El core solo convierte
// a texto y de vuelta: leer y escribir el archivo es cosa de la app. No se guarda a mitad de un combate.
// ============================================================

@Serializable
private class PlayerSave(
    val hp: Int, val maxHp: Int, val gold: Int, val maxEnergy: Int,
    val relics: List<String>, val relicCounters: Map<String, Map<String, JsonElement>> = emptyMap(),
    val deck: List<String>, val permanentStrength: Int = 0,
    val act: Int, val floor: Int, val plan: List<List<String>>, val difficulty: String,
    val removals: Int = 0, val seeds: List<String?> = emptyList(), val hasGoldenKey: Boolean = false
)

@Serializable
private class RiverSave(val col: Int, val bridge: Int)

@Serializable
private class MapSave(
    val grid: List<List<String>>, val wallsV: List<List<Boolean>>, val wallsH: List<List<Boolean>>,
    val bossY: Int, val rivers: List<RiverSave>, val cols: Int, val rows: Int,
    val variant: String, val seed: Int, val themeId: String, val bossId: String, val fate: Int? = null
)

@Serializable
private class LootSave(val k: String, val n: Int = 0, val id: String? = null, val heal: Int = 0)

@Serializable
private class DungeonSave(val cleared: List<List<Boolean>>, val posX: Int, val posY: Int, val exitX: Int, val exitY: Int, val deco: Int)

@Serializable
private class RunSave(
    val version: Int = 1,
    val characterId: String,
    val player: PlayerSave,
    val map: MapSave,
    val visited: List<String>,
    val posX: Int, val posY: Int,
    val screen: String,
    val rewardCards: List<String> = emptyList(),
    val rewardPicked: Boolean = false,
    val afterReward: String = "map",
    val combatKind: String = "enemy",
    val loot: List<LootSave> = emptyList(),
    val wellSpins: Int = 0,
    val wellMessage: String = "",
    val dungeon: DungeonSave? = null
)

@Serializable
private class ProgressSave(val unlocked: Map<String, Int> = emptyMap(), val discovered: List<String> = emptyList())

object Save {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    /** Pantallas a las que se puede volver al continuar; el resto regresa al mapa. */
    private val RESUMABLE = setOf(RunScreen.ACT_INTRO, RunScreen.REWARD, RunScreen.BOSS_RELIC, RunScreen.WELL, RunScreen.DUNGEON)

    /** ¿Tiene sentido guardar ahora? (no a mitad de un combate ni cuando la partida ya terminó). */
    fun shouldSave(run: Run): Boolean = run.screen != RunScreen.COMBAT && !run.isOver

    fun encode(run: Run): String {
        val p = run.player
        val m = run.map
        // en orden, para que el mismo estado siempre dé el mismo texto
        val counters = p.relicCounters.toSortedMap().mapValues { (_, v) ->
            v.toSortedMap().mapValues { (_, x) ->
                when (x) {
                    is Int -> JsonPrimitive(x)
                    is Boolean -> JsonPrimitive(x)
                    null -> JsonNull
                    else -> JsonPrimitive(x.toString())
                }
            }
        }
        val data = RunSave(
            characterId = p.characterId,
            player = PlayerSave(
                p.hp, p.maxHp, p.gold, p.maxEnergy, p.relics.toList(), counters, p.deck.toList(), p.permanentStrength,
                p.act, p.floor, p.plan, p.difficulty, p.removals, p.seeds.toList(), p.hasGoldenKey
            ),
            map = MapSave(
                m.grid.map { it.toList() }, m.wallsV.map { it.toList() }, m.wallsH.map { it.toList() }, m.bossY,
                m.rivers.map { RiverSave(it.col, it.bridge) }, m.cols, m.rows, m.variant, m.seed, m.themeId, m.bossId, m.fate
            ),
            visited = run.visited.toList(),
            posX = run.pos.x, posY = run.pos.y,
            screen = (if (run.screen in RESUMABLE) run.screen else RunScreen.MAP).name,
            rewardCards = run.rewardCards, rewardPicked = run.rewardCardPicked,
            afterReward = run.afterReward, combatKind = run.combatKind,
            loot = run.loot.filter { it.isOpen }.map { LootSave(it.k, it.n, it.id, it.heal) },
            wellSpins = run.wellSpins, wellMessage = run.wellMessage,
            dungeon = run.dungeon?.let { dg -> DungeonSave(dg.cleared.map { row -> row.toList() }, dg.pos.x, dg.pos.y, dg.exit.x, dg.exit.y, dg.deco) }
        )
        return json.encodeToString(RunSave.serializer(), data)
    }

    /** Reconstruye la partida; null si el texto está dañado. Lo que ya no existe en el juego se descarta. */
    fun decode(text: String, progress: Progress): Run? = try {
        val d = json.decodeFromString(RunSave.serializer(), text)
        val ps = d.player
        val p = Player()
        p.characterId = d.characterId
        p.name = World.character(d.characterId)?.name ?: p.name
        p.hp = ps.hp; p.maxHp = ps.maxHp; p.gold = ps.gold; p.maxEnergy = ps.maxEnergy; p.energy = ps.maxEnergy
        p.relics.addAll(ps.relics.filter { Relics.get(it) != null })
        ps.relicCounters.forEach { (rid, vals) ->
            p.relicCounters[rid] = vals.mapValues { (_, e) -> counterValue(e) }.toMutableMap()
        }
        p.deck = ArrayList(ps.deck.filter { Cards.get(it) != null })
        p.permanentStrength = ps.permanentStrength
        p.act = ps.act.coerceIn(1, World.castles.size)
        p.floor = ps.floor.coerceIn(1, World.FLOORS_PER_CASTLE)
        p.plan = if (Plan.isValid(ps.plan)) ps.plan else Plan.run()
        p.difficulty = World.difficulty(ps.difficulty).id
        p.removals = ps.removals
        for (i in 0 until SEED_SLOTS) p.seeds[i] = ps.seeds.getOrNull(i)?.takeIf { Seeds.get(it) != null }
        p.hasGoldenKey = ps.hasGoldenKey

        val run = Run(p, progress)
        val ms = d.map
        val grid = Array(ms.grid.size) { y -> Array(ms.grid[y].size) { x -> ms.grid[y][x] } }
        val map = MapData(
            grid,
            Array(ms.wallsV.size) { y -> BooleanArray(ms.wallsV[y].size) { x -> ms.wallsV[y][x] } },
            Array(ms.wallsH.size) { y -> BooleanArray(ms.wallsH[y].size) { x -> ms.wallsH[y][x] } },
            ms.bossY
        )
        map.rivers = ms.rivers.map { River(it.col, it.bridge) }
        map.cols = ms.cols; map.rows = ms.rows; map.variant = ms.variant; map.seed = ms.seed
        map.themeId = if (World.themes.containsKey(ms.themeId)) ms.themeId else Plan.themeId(p.plan, p.act, p.floor)
        map.bossId = if (Enemies.get(ms.bossId) != null) ms.bossId else Plan.pickBoss(p.act, p.floor, map.themeId)
        map.fate = ms.fate
        // la última columna entera es la guarida del jefe
        grid.forEach { row -> row[map.cols - 1] = NodeType.BOSS }
        run.map = map
        run.visited.addAll(d.visited)
        var px = d.posX
        if (px >= map.cols - 1) px = map.cols - 2
        run.pos = Pos(px, d.posY.coerceIn(0, map.rows - 1))
        run.combatKind = d.combatKind
        run.afterReward = d.afterReward
        run.rewardCards = d.rewardCards.filter { Cards.get(it) != null }
        run.rewardCardPicked = d.rewardPicked
        d.loot.forEach { run.loot.add(LootItem(it.k, it.n, it.id, it.heal)) }
        run.wellSpins = d.wellSpins
        run.wellMessage = d.wellMessage
        d.dungeon?.let { ds ->
            if (ds.cleared.size == 3 && ds.cleared.all { it.size == 3 }) {
                run.dungeon = Dungeon(Array(3) { y -> BooleanArray(3) { x -> ds.cleared[y][x] } }, Pos(ds.posX.coerceIn(0, 2), ds.posY.coerceIn(0, 2)), Pos(ds.exitX.coerceIn(0, 2), ds.exitY.coerceIn(0, 2)), ds.deco)
            }
        }
        run.screen = runCatching { RunScreen.valueOf(d.screen) }.getOrDefault(RunScreen.MAP).takeIf { it in RESUMABLE } ?: RunScreen.MAP
        when (run.screen) {
            RunScreen.REWARD -> {
                val pending = (run.rewardCards.isNotEmpty() && !run.rewardCardPicked) || run.loot.isNotEmpty()
                // todo recogido pero sin cerrar: se sigue al paso que tocaba (mapa, objeto de jefe o piso siguiente)
                if (!pending) run.finishReward()
            }
            RunScreen.BOSS_RELIC -> run.openBossRelics() // se vuelven a sortear las opciones
            RunScreen.DUNGEON -> if (run.dungeon == null) run.screen = RunScreen.MAP
            else -> {}
        }
        // fuera de las recompensas, lo que quedó sin recoger (tesoro, cofre…) se da solo
        if (run.screen != RunScreen.REWARD) run.grantAllLoot()
        run
    } catch (e: Exception) { null }

    private fun counterValue(e: JsonElement): Any? {
        val prim = e as? JsonPrimitive ?: return null
        if (prim.isString) return prim.content
        return prim.booleanOrNull ?: prim.intOrNull
    }

    fun encodeProgress(p: Progress): String =
        json.encodeToString(ProgressSave.serializer(), ProgressSave(p.unlocked.toMap(), p.discovered.toList()))

    fun decodeProgress(text: String?): Progress {
        val out = Progress()
        if (text.isNullOrBlank()) return out
        try {
            val d = json.decodeFromString(ProgressSave.serializer(), text)
            d.unlocked.forEach { (k, v) -> out.unlocked[k] = min(World.difficulties.size - 1, v) }
            out.discovered.addAll(d.discovered)
        } catch (e: Exception) { /* dañado: se empieza de cero */ }
        return out
    }
}
