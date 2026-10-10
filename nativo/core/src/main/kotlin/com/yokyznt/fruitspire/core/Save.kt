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
private class ShopCardSave(val id: String, val price: Int, val sale: Boolean = false)

@Serializable
private class ShopItemSave(val id: String, val price: Int)

/** El surtido de una tienda a medias: lo que queda a la venta y si ya se usó «Quitar una carta». */
@Serializable
private class ShopSave(
    val cards: List<ShopCardSave> = emptyList(), val relics: List<ShopItemSave> = emptyList(),
    val seeds: List<ShopItemSave> = emptyList(), val removeUsed: Boolean = false
)

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
    val dungeon: DungeonSave? = null,
    /** Tienda abierta (pantalla SHOP) y evento abierto (pantalla EVENT): Android puede matar la app con ellas a medias. */
    val shop: ShopSave? = null,
    val eventId: String? = null
)

@Serializable
private class ProgressSave(
    val unlocked: Map<String, Int> = emptyMap(), val discovered: List<String> = emptyList(),
    val passXp: Int = 0, val passClaimed: List<Int> = emptyList(),
    val owned: List<String> = emptyList(), val equipped: Map<String, Map<String, String?>> = emptyMap(),
    val foundRelics: List<String> = emptyList(), val foundSeeds: List<String> = emptyList(),
    val bestiary: Map<String, Int> = emptyMap(), val notesSeen: String = "", val endingSeen: Boolean = false
)

object Save {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    /**
     * Pantallas a las que se puede volver al continuar; el resto regresa al mapa. El campamento, la tienda y el misterio cuentan:
     * si Android mata la app con ellos abiertos no se pierde la cura, la compra ni el evento (la casilla ya estaba gastada).
     */
    private val RESUMABLE = setOf(
        RunScreen.ACT_INTRO, RunScreen.REWARD, RunScreen.BOSS_RELIC, RunScreen.WELL, RunScreen.DUNGEON,
        RunScreen.REST, RunScreen.SHOP, RunScreen.EVENT
    )

    /** ¿Tiene sentido guardar ahora? (no a mitad de un combate ni cuando la partida ya terminó). */
    fun shouldSave(run: Run): Boolean = run.screen != RunScreen.COMBAT && !run.isOver && run.tutorial == null // ni a mitad de un combate ni en el tutorial

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
            screen = (if (run.screen in RESUMABLE && hasContent(run)) run.screen else RunScreen.MAP).name,
            rewardCards = run.rewardCards, rewardPicked = run.rewardCardPicked,
            afterReward = run.afterReward, combatKind = run.combatKind,
            loot = run.loot.filter { it.isOpen }.map { LootSave(it.k, it.n, it.id, it.heal) },
            wellSpins = run.wellSpins, wellMessage = run.wellMessage,
            dungeon = run.dungeon?.let { dg -> DungeonSave(dg.cleared.map { row -> row.toList() }, dg.pos.x, dg.pos.y, dg.exit.x, dg.exit.y, dg.deco) },
            shop = run.shopStock?.takeIf { run.screen == RunScreen.SHOP }?.let { s ->
                ShopSave(
                    s.cards.map { ShopCardSave(it.cardId, it.price, it.sale) }, s.relics.map { ShopItemSave(it.relicId, it.price) },
                    s.seeds.map { ShopItemSave(it.seedId, it.price) }, s.removeUsed
                )
            },
            eventId = run.currentEvent?.id?.takeIf { run.screen == RunScreen.EVENT }
        )
        return json.encodeToString(RunSave.serializer(), data)
    }

    /** ¿Tiene lo que su pantalla necesita para volver (surtido de la tienda, evento)? Si no, se guarda en el mapa. */
    private fun hasContent(run: Run): Boolean = when (run.screen) {
        RunScreen.SHOP -> run.shopStock != null
        RunScreen.EVENT -> run.currentEvent != null
        else -> true
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
            RunScreen.REST -> run.pickerMode = null
            RunScreen.SHOP -> {
                val s = d.shop
                if (s == null) run.screen = RunScreen.MAP
                else {
                    // lo que ya no existe en el juego se descarta, como con las cartas y los objetos del jugador
                    run.shopStock = ShopStock(
                        s.cards.filter { Cards.get(it.id) != null }.map { ShopCard(it.id, it.price, it.sale) }.toMutableList(),
                        s.relics.filter { Relics.get(it.id) != null }.map { ShopRelic(it.id, it.price) }.toMutableList(),
                        s.seeds.filter { Seeds.get(it.id) != null }.map { ShopSeed(it.id, it.price) }.toMutableList(),
                        s.removeUsed
                    )
                    run.pickerMode = null
                }
            }
            RunScreen.EVENT -> {
                val ev = Events.all.firstOrNull { it.id == d.eventId }
                if (ev == null) run.screen = RunScreen.MAP
                else { run.currentEvent = ev; run.lastEventId = ev.id }
            }
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
        json.encodeToString(
            ProgressSave.serializer(),
            ProgressSave(
                p.unlocked.toMap(), p.discovered.toList(), p.passXp, p.passClaimed.toList(), p.owned.toList(),
                p.equipped.toSortedMap().mapValues { (_, slots) -> slots.toSortedMap() },
                p.foundRelics.toList(), p.foundSeeds.toList(), p.bestiary.toMap(), p.notesSeen, p.endingSeen
            )
        )

    fun decodeProgress(text: String?): Progress {
        val out = Progress()
        if (text.isNullOrBlank()) return out
        try {
            val d = json.decodeFromString(ProgressSave.serializer(), text)
            d.unlocked.forEach { (k, v) -> out.unlocked[k] = min(World.difficulties.size - 1, v) }
            out.discovered.addAll(d.discovered)
            out.passXp = maxOf(0, d.passXp)
            d.passClaimed.filter { it in 1..Pass.rewards.size }.forEach { out.passClaimed.add(it) }
            d.owned.filter { Cosmetics.get(it) != null }.forEach { out.owned.add(it) }
            d.foundRelics.filter { Relics.get(it) != null }.forEach { out.foundRelics.add(it) }
            d.foundSeeds.filter { Seeds.get(it) != null }.forEach { out.foundSeeds.add(it) }
            d.bestiary.forEach { (id, kills) -> if (Enemies.get(id) != null) out.bestiary[id] = maxOf(0, kills) }
            out.notesSeen = d.notesSeen
            out.endingSeen = d.endingSeen
            val slots = setOf("skin", "head", "face", "neck", "pet")
            d.equipped.forEach { (char, worn) ->
                if (World.character(char) == null) return@forEach
                worn.forEach { (slot, id) ->
                    if (slot in slots && (id == null || Cosmetics.get(id) != null)) out.equipped.getOrPut(char) { HashMap() }[slot] = id
                }
            }
        } catch (e: Exception) { /* dañado: se empieza de cero */ }
        return out
    }
}
