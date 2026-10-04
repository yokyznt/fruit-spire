package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CastleDef
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.CharacterHooks
import com.yokyznt.fruitspire.core.data.Difficulty
import com.yokyznt.fruitspire.core.data.EnemyDef
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.FloorTheme
import com.yokyznt.fruitspire.core.data.Plan
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/** En qué pantalla de la partida estás (las `GAME.screen` de js/game.js que ya existen en el nativo). */
enum class RunScreen {
    /** Portada del piso. */
    ACT_INTRO,
    MAP,
    COMBAT,
    REWARD,
    /** Elegir un objeto de jefe (tras el jefe de un castillo). */
    BOSS_RELIC,
    /** Campamento: descansar, madurar o despegar una carta. */
    REST,
    SHOP,
    /** Tesoro: un objeto por recoger. */
    TREASURE,
    /** Se encontró la Llave Dorada. */
    KEY_FOUND,
    /** Cofre Sellado (con o sin llave). */
    VAULT,
    /** Casilla de misterio: un evento con opciones. */
    EVENT,
    /** Lo que pasó al elegir una opción del evento. */
    EVENT_RESULT,
    /** Pozo de los Deseos. */
    WELL,
    /** Calabozo de 3×3 (trampilla). */
    DUNGEON,
    /** Dado del destino antes del jefe. */
    FATE,
    /** Casilla cuyo contenido llega en la etapa 4 (mesas de juego). */
    NODE_STUB,
    GAME_OVER,
    VICTORY
}

class Pos(val x: Int, val y: Int) {
    val key: String get() = "$x,$y"
}

/** Combate por empezar: lo que sale de pisar una casilla. La interfaz muestra "¡A pelear!" y luego llama [Run.startCombat]. */
class PendingCombat(val enemyIds: List<String>, val kind: String)

/**
 * Una partida en curso: el jugador, el mapa del piso, el combate y las recompensas (el flujo de js/game.js).
 * No sabe nada de pantallas ni de tiempos: la interfaz llama a estas funciones y se redibuja con lo que quedó.
 */
class Run(val player: Player, val progress: Progress = Progress()) {
    lateinit var map: MapData
    /** Casillas ya pisadas ("x,y"). */
    val visited = LinkedHashSet<String>()
    var pos = Pos(0, 0)
    var screen = RunScreen.ACT_INTRO

    var combat: Combat? = null
    /** enemy | elite | boss */
    var combatKind = "enemy"
    /** Experiencia del pase de batalla del último combate (la usará el pase en la etapa 4). */
    var lastCombatXp = 0

    // ---------- recompensa ----------
    val loot = ArrayList<LootItem>()
    var rewardCards: List<String> = emptyList()
    var rewardCardPicked = false
    /** map | boss-relic | next-floor */
    var afterReward = "map"
    var bossRelicChoices: List<String> = emptyList()

    // ---------- avisos de la portada y del final ----------
    var actHealed = 0
    var actCurse: String? = null
    var unlockMsg = ""
    var lastBossId: String? = null
    /** Tipo de casilla que se está mostrando en NODE_STUB. */
    var stubNode: String? = null

    // ---------- campamento, tienda, tesoro y cofre ----------
    /** Selector de cartas abierto en el campamento o la tienda: upgrade | remove (null = ninguno). */
    var pickerMode: String? = null
    var shopStock: ShopStock? = null
    /** Texto del resultado de un tesoro o cofre. */
    var nodeMessage = ""
    var vaultOpened = false

    val difficulty: Difficulty get() = World.difficulty(player.difficulty)
    val castle: CastleDef get() = World.castles[player.act.coerceIn(1, World.castles.size) - 1]
    val theme: FloorTheme get() = World.themes[map.themeId] ?: World.themes.getValue("huerto")
    val boss: EnemyDef get() = Enemies.get(map.bossId) ?: Enemies.get(castle.bosses[0])!!
    /** ¿Es el último piso del último castillo (el del Rey Fruta)? */
    val isFinalFloor: Boolean get() = player.act >= World.castles.size && player.floor >= World.FLOORS_PER_CASTLE
    val isOver: Boolean get() = screen == RunScreen.GAME_OVER || screen == RunScreen.VICTORY

    companion object {
        /** Partida nueva con una fruta y un grado (si el grado aún está bloqueado, se baja al más alto abierto). */
        fun start(charId: String, difficultyId: String, progress: Progress = Progress()): Run {
            val def = World.character(charId)!!
            val diffId = if (progress.isUnlocked(charId, difficultyId)) difficultyId else World.difficulties[progress.level(charId)].id
            val diff = World.difficulty(diffId)
            val p = Player()
            p.characterId = charId
            p.name = def.name
            p.maxHp = def.baseHp
            p.hp = def.baseHp
            p.difficulty = diff.id
            p.gold = diff.gold
            p.act = 1
            p.floor = 1
            p.plan = Plan.run() // los temas de los 9 pisos de esta partida
            p.deck = ArrayList(World.starterDeck(charId))
            diff.curse?.let { p.deck.add(it) }
            val run = Run(p, progress)
            run.newFloor()
            progress.discover(p.deck)
            run.screen = RunScreen.ACT_INTRO
            return run
        }
    }

    // ---------- piso ----------
    /** Mapa nuevo para el piso actual (castillo [Player.act], piso [Player.floor]). */
    fun newFloor() {
        val p = player
        p.hasGoldenKey = false // la llave es de este piso nada más
        if (!Plan.isValid(p.plan)) p.plan = Plan.run()
        p.floor = max(1, p.floor)
        val themeId = Plan.themeId(p.plan, p.act, p.floor)
        val theme = World.themes.getValue(themeId)
        val (cols, rows) = Plan.floorSize(p.act, p.floor)
        val variant = MapGen.pickVariant(theme.variant)
        val startY = rows / 2
        pos = Pos(0, startY)
        val g = MapGen.generate(startY, elites = difficulty.elites, cols = cols, rows = rows, variant = variant, games = theme.games)
        g.themeId = themeId
        g.bossId = Plan.pickBoss(p.act, p.floor, themeId)
        map = g
        visited.clear()
        visited.add(pos.key)
    }

    /** "¡Adelante!" en la portada del piso. */
    fun beginFloor() { screen = RunScreen.MAP }

    // ---------- mapa ----------
    /** Adelante, arriba o abajo; nunca atrás ni a una casilla ya pisada. */
    fun isReachable(x: Int, y: Int): Boolean = MapGen.canMove(map, visited, pos.x, pos.y, x, y)

    private fun encounterFor(kind: String, progress: Double): List<String> =
        Plan.encounter(player.act, progress, kind, map.bossId, map.themeId)

    /**
     * La ficha llegó a la casilla (x, y). Devuelve el combate por empezar si hay uno; si no, la pantalla
     * pasa a la que toque (hoy: [RunScreen.NODE_STUB]).
     */
    fun arrive(x: Int, y: Int): PendingCombat? {
        if (!isReachable(x, y)) return null
        pos = Pos(x, y)
        visited.add(pos.key)
        val type = map.grid[y][x]
        // la casilla se "consume" (la guarida del jefe no)
        if (type != NodeType.BOSS) map.grid[y][x] = NodeType.EMPTY
        return enterNode(type)
    }

    private fun enterNode(type: String): PendingCombat? {
        when (type) {
            NodeType.ENEMY, NodeType.ELITE, NodeType.BOSS -> {
                val kind = if (type == NodeType.ELITE) "elite" else if (type == NodeType.BOSS) "boss" else "enemy"
                // antes de cada jefe se tira el dado del destino (una sola vez por piso)
                if (kind == "boss" && map.fate == null) { fateRoll = null; screen = RunScreen.FATE; return null }
                return PendingCombat(encounterFor(kind, pos.x.toDouble() / (map.cols - 1)), kind)
            }
            NodeType.MYSTERY -> openMystery()
            NodeType.EMPTY, NodeType.BLOCKED -> screen = RunScreen.MAP
            NodeType.REST -> { pickerMode = null; screen = RunScreen.REST }
            NodeType.SHOP -> openShop()
            NodeType.TREASURE -> openTreasure()
            NodeType.KEY -> { player.hasGoldenKey = true; screen = RunScreen.KEY_FOUND }
            NodeType.VAULT -> openVault()
            else -> { stubNode = type; screen = RunScreen.NODE_STUB }
        }
        return null
    }

    /** Sigue de largo una casilla que aún no tiene contenido. */
    fun leaveStub() { stubNode = null; screen = RunScreen.MAP }

    /**
     * Sale de una casilla con contenido (campamento, tienda, tesoro, llave, cofre) y vuelve al mapa.
     * Falso si todavía queda algún premio por recoger.
     */
    fun leaveNode(): Boolean {
        if (lootPending()) return false
        loot.clear()
        pickerMode = null
        shopStock = null
        nodeMessage = ""
        currentEvent = null
        deckChanges = emptyList()
        screen = RunScreen.MAP
        return true
    }

    // ---------- campamento ----------
    /** Vida que se recupera al descansar: una fracción de la vida máxima (según el grado) más lo que dan los objetos. */
    fun restHealAmount(): Int {
        val p = player
        val extra = p.relics.sumOf { Relics.hooks(it)?.onRest?.invoke(p) ?: 0 }
        return floor(p.maxHp * difficulty.restHeal).toInt() + extra
    }

    fun canRest(): Boolean = player.relics.none { Relics.get(it)?.noRest == true }

    /** Descansa y sigue. Falso si no se puede (no estás en el campamento o un objeto lo impide). */
    fun restHeal(): Boolean {
        if (screen != RunScreen.REST || !canRest()) return false
        player.heal(restHealAmount())
        return leaveNode()
    }

    fun setPicker(mode: String?) { pickerMode = mode }

    /** Madura la copia [deckIndex] del mazo. No sale del campamento: la interfaz anima y luego llama a [leaveNode]. */
    fun restUpgrade(deckIndex: Int): Boolean {
        if (screen != RunScreen.REST) return false
        val id = player.deck.getOrNull(deckIndex) ?: return false
        if (Cards.get(id)?.canUpgrade != true) return false
        player.deck[deckIndex] = "$id+"
        return true
    }

    /** Despega (quita) la copia [deckIndex] del mazo. */
    fun restRemove(deckIndex: Int): Boolean {
        if (screen != RunScreen.REST || deckIndex !in player.deck.indices) return false
        player.deck.removeAt(deckIndex)
        return true
    }

    // ---------- tienda ----------
    private fun openShop() {
        val stock = Shop.stock(player)
        progress.discover(stock.cards.map { it.cardId })
        shopStock = stock
        pickerMode = null
        screen = RunScreen.SHOP
    }

    fun removalPrice(): Int = Shop.removalPrice(player)

    fun buyShopCard(index: Int): BuyResult {
        val s = shopStock ?: return BuyResult.INVALID
        val item = s.cards.getOrNull(index) ?: return BuyResult.INVALID
        if (player.gold < item.price) return BuyResult.NO_GOLD
        player.gold -= item.price
        player.deck.add(item.cardId)
        s.cards.removeAt(index)
        progress.discover(listOf(item.cardId))
        return BuyResult.OK
    }

    fun buyShopRelic(index: Int): BuyResult {
        val s = shopStock ?: return BuyResult.INVALID
        val item = s.relics.getOrNull(index) ?: return BuyResult.INVALID
        if (player.gold < item.price) return BuyResult.NO_GOLD
        val relic = Relics.get(item.relicId) ?: return BuyResult.INVALID
        player.gold -= item.price
        Rewards.giveRelic(player, relic)
        s.relics.removeAt(index)
        return BuyResult.OK
    }

    fun buyShopSeed(index: Int): BuyResult {
        val s = shopStock ?: return BuyResult.INVALID
        val item = s.seeds.getOrNull(index) ?: return BuyResult.INVALID
        if (player.gold < item.price) return BuyResult.NO_GOLD
        if (Rewards.seedsFull(player)) return BuyResult.BAG_FULL
        player.gold -= item.price
        Rewards.addSeed(player, item.seedId)
        s.seeds.removeAt(index)
        return BuyResult.OK
    }

    /** Abre el selector para quitar una carta (cuesta oro, y solo una vez por tienda). */
    fun startShopRemoval(): Boolean {
        val s = shopStock ?: return false
        if (screen != RunScreen.SHOP || s.removeUsed || player.gold < removalPrice()) return false
        pickerMode = "remove"
        return true
    }

    /** Quita la copia [deckIndex], cobra y sube el precio de la próxima vez. */
    fun shopRemoveCard(deckIndex: Int): Boolean {
        val s = shopStock ?: return false
        val price = removalPrice()
        if (pickerMode != "remove" || s.removeUsed || player.gold < price || deckIndex !in player.deck.indices) return false
        player.deck.removeAt(deckIndex)
        player.gold -= price
        player.removals += 1
        s.removeUsed = true
        pickerMode = null
        return true
    }

    // ---------- tesoro, llave y cofre sellado ----------
    private val RELIC_TIERS = listOf("common", "uncommon", "rare")

    /** Pone un objeto al azar en la fila de premios y devuelve su texto ("Nombre: descripción"). */
    private fun offerRandomRelic(): String {
        val relic = Rewards.randomRelic(player, RELIC_TIERS, lootRelicIds()) ?: return "Ya tienes todos los objetos disponibles."
        loot.add(LootItem("relic", id = relic.id))
        return "${relic.name}: ${relic.description}"
    }

    private fun openTreasure() {
        loot.clear()
        nodeMessage = offerRandomRelic()
        screen = RunScreen.TREASURE
    }

    private fun openVault() {
        loot.clear()
        if (player.hasGoldenKey) {
            player.hasGoldenKey = false
            val gold = 40 + Rng.int(20)
            loot.add(LootItem("gold", n = gold))
            nodeMessage = "${offerRandomRelic()} Además, $gold de oro brillante."
            vaultOpened = true
        } else {
            val gold = 15 + Rng.int(10)
            loot.add(LootItem("gold", n = gold))
            nodeMessage = "El cofre está sellado. Sin la Llave Dorada solo puedes forzar la cerradura: consigues $gold de oro."
            vaultOpened = false
        }
        screen = RunScreen.VAULT
    }

    // ---------- captura de premios (js/loot.js `withLootCapture`) ----------
    private var lootCapture = false
    internal var deckLog: MutableList<DeckChange>? = null

    /** Un cambio del mazo que no es un premio (maldición que entra, madurar, quitar, transformar). */
    internal fun logDeck(change: DeckChange) { deckLog?.add(change) }

    /** Da un objeto; mientras se captura, en vez de darlo lo pone en la fila de premios por recoger. */
    internal fun giveRelic(relic: RelicDef) {
        if (lootCapture) loot.add(LootItem("relic", id = relic.id)) else Rewards.giveRelic(player, relic)
    }

    /**
     * Corre un efecto (evento, pozo, cofre…) y convierte lo que ganaste (oro, vida, vida máxima, objetos, semillas y
     * cartas) en premios por recoger; lo que pierdes se aplica al momento. Los cambios del mazo quedan en [deckChanges].
     */
    fun <T> withLootCapture(fn: () -> T): T {
        val p = player
        val gold0 = p.gold; val hp0 = p.hp; val max0 = p.maxHp
        val deck0 = ArrayList(p.deck)
        val seeds0 = p.seeds.toList()
        val start = loot.size
        lootCapture = true
        deckLog = ArrayList()
        val res = try { fn() } finally { lootCapture = false }
        // cartas nuevas al final del mazo (las maldiciones y los estados entran solos)
        if (p.deck.size > deck0.size && deck0.indices.all { p.deck[it] == deck0[it] }) {
            val added = ArrayList(p.deck.subList(deck0.size, p.deck.size))
            while (p.deck.size > deck0.size) p.deck.removeAt(p.deck.size - 1)
            added.forEach { id ->
                val c = Cards.get(id)
                if (c == null || c.type == "curse" || c.type == "status") p.deck.add(id) else loot.add(LootItem("card", id = id))
            }
        }
        val log = deckLog ?: ArrayList()
        deckChanges = if (log.isNotEmpty()) log else deckDiff(deck0, p.deck)
        deckLog = null
        // semillas que aparecieron en huecos vacíos
        for (i in p.seeds.indices) {
            val id = p.seeds[i]
            if (id != null && seeds0.getOrNull(i) == null) { p.seeds[i] = null; loot.add(LootItem("seed", id = id)) }
        }
        val dGold = p.gold - gold0; val dMax = p.maxHp - max0; val dHp = p.hp - hp0
        if (dGold > 0) { p.gold -= dGold; loot.add(LootItem("gold", n = dGold)) }
        if (dMax > 0) {
            val heal = max(0, dHp)
            p.maxHp -= dMax
            p.hp = min(p.maxHp, p.hp - heal)
            loot.add(LootItem("maxhp", n = dMax, heal = heal))
        } else if (dHp > 0) {
            p.hp -= dHp
            loot.add(LootItem("heal", n = dHp))
        }
        // orden de la fila: oro, vida, objetos, semillas y cartas
        val order = mapOf("gold" to 0, "heal" to 1, "maxhp" to 1, "relic" to 2, "seed" to 3, "card" to 4)
        val added = ArrayList(loot.subList(start, loot.size)).sortedBy { order[it.k] ?: 9 }
        while (loot.size > start) loot.removeAt(loot.size - 1)
        loot.addAll(added)
        return res
    }

    /** Cartas que salieron o entraron al mazo (contando copias), o que cambiaron en su lugar (transformar, madurar). */
    private fun deckDiff(before: List<String>, after: List<String>): List<DeckChange> {
        fun count(l: List<String>) = l.groupingBy { it }.eachCount()
        val a = count(before); val b = count(after)
        val removed = ArrayList<String>(); val added = ArrayList<String>()
        a.forEach { (id, n) -> repeat(n - (b[id] ?: 0)) { removed.add(id) } }
        b.forEach { (id, n) -> repeat(n - (a[id] ?: 0)) { added.add(id) } }
        if (removed.isEmpty() && added.isEmpty()) return emptyList()
        if (before.size == after.size) {
            val moved = before.indices.filter { before[it] != after[it] }
            if (moved.size == removed.size) {
                return moved.map { DeckChange(if (after[it] == before[it] + "+") "upgrade" else "transform", before[it], after[it]) }
            }
        }
        return removed.map { DeckChange("remove", from = it) } + added.map { DeckChange("add", to = it) }
    }

    // ---------- eventos de misterio ----------
    var currentEvent: EventDef? = null
    private var lastEventId: String? = null
    /** Lo que le pasó al mazo en el último evento, pozo o cofre (para mostrarlo animado). */
    var deckChanges: List<DeckChange> = emptyList()
    /** Aviso de una trampa (el cofre era un mímico). */
    var trapMessage: String? = null
    /** Mesa de juego elegida en un evento ("dice", "poker", "chess", "slots", "roulette"). */
    var gameId: String? = null

    private fun openMystery() {
        val themeId = map.themeId
        val pool = Events.all.filter { ev ->
            (ev.acts == null || player.act in ev.acts) && (ev.themes == null || themeId in ev.themes) && ev.id != lastEventId
        }
        val ev = Events.pick(pool.ifEmpty { Events.all })
        currentEvent = ev
        lastEventId = ev.id
        nodeMessage = ""
        trapMessage = null
        loot.clear()
        deckChanges = emptyList()
        screen = RunScreen.EVENT
    }

    /** Lo que se sale a pelear cuando una casilla de misterio no era tan tranquila. */
    private fun ambushFight() = PendingCombat(encounterFor("enemy", pos.x.toDouble() / (map.cols - 1)), "enemy")

    /**
     * Elige la opción [idx] del evento. Devuelve un combate por empezar si la opción (o una trampa) lleva a pelear;
     * si no, la pantalla pasa a la que toque (resultado, pozo, calabozo, mesa de juego o derrota).
     */
    fun resolveEventOption(idx: Int): PendingCombat? {
        val ev = currentEvent ?: return null
        if (screen != RunScreen.EVENT) return null
        val option = ev.options.getOrNull(idx) ?: return null
        if (option.locked?.invoke(player)?.isNotEmpty() == true) return null
        when (val special = option.special) {
            null -> {}
            "fight" -> { currentEvent = null; return ambushFight() }
            "well" -> { currentEvent = null; wellSpins = 0; wellMessage = ""; loot.clear(); screen = RunScreen.WELL; return null }
            "dungeon" -> { currentEvent = null; dungeon = Dungeon.create(); screen = RunScreen.DUNGEON; return null }
            else -> { // game:<mesa>
                currentEvent = null
                gameId = special.removePrefix("game:")
                stubNode = NodeType.GAME
                screen = RunScreen.NODE_STUB
                return null
            }
        }
        loot.clear()
        val helpers = EventHelpers(this)
        val out = withLootCapture { option.effect!!.invoke(player, helpers) }
        if (out.fight) {
            // el evento resultó ser una trampa: lo ganado antes se da y se pelea
            grantAllLoot()
            currentEvent = null
            trapMessage = out.msg.ifEmpty { "¡Es una trampa!" }
            return ambushFight()
        }
        nodeMessage = out.msg.ifEmpty { "Algo pasó..." }
        screen = if (player.hp <= 0) RunScreen.GAME_OVER else RunScreen.EVENT_RESULT
        return null
    }

    // ---------- pozo de los deseos ----------
    var wellSpins = 0
    var wellMessage = ""

    fun wellCost(): Int = 15 + wellSpins * 12

    /** Tira una moneda. Falso si no se puede (sin oro o con premios sin recoger). */
    fun tossWellCoin(): Boolean {
        if (screen != RunScreen.WELL || lootPending() || player.gold < wellCost()) return false
        player.gold -= wellCost()
        wellSpins += 1
        val picked = Well.pick()
        loot.clear()
        val helpers = EventHelpers(this)
        wellMessage = withLootCapture { picked.effect(player, helpers) }
        if (player.hp <= 0) screen = RunScreen.GAME_OVER
        return true
    }

    // ---------- calabozo ----------
    var dungeon: Dungeon? = null
    /** Oro que dio el último combate de calabozo (la pantalla lo avisa). */
    var dungeonGold = 0

    /** Entra a una casilla contigua del calabozo. Devuelve el combate por empezar si hay uno. */
    fun enterDungeonCell(x: Int, y: Int): PendingCombat? {
        val d = dungeon ?: return null
        if (screen != RunScreen.DUNGEON || Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y) != 1 || x !in 0..2 || y !in 0..2) return null
        if (d.cleared[y][x]) { d.pos = Pos(x, y); return null }
        d.pending = Pos(x, y)
        val isExit = x == d.exit.x && y == d.exit.y
        return PendingCombat(encounterFor("enemy", if (isExit) 0.9 else 0.1), "dungeon")
    }

    fun leaveDungeon() { dungeon = null; screen = RunScreen.MAP }

    private fun finishDungeonCombat() {
        val d = dungeon
        combat = null
        player.statuses.clear()
        player.block = 0
        if (d == null) { screen = RunScreen.MAP; return }
        val cell = d.pending
        if (cell != null) { d.cleared[cell.y][cell.x] = true; d.pos = cell; d.pending = null }
        if (cell != null && cell.x == d.exit.x && cell.y == d.exit.y) {
            // la escalera: premio gordo por vaciar el calabozo
            val gold = 45 + Rng.int(25)
            loot.clear()
            val helpers = EventHelpers(this)
            nodeMessage = withLootCapture { player.gold += gold; "${helpers.grantRandomRelic()} Y $gold de oro por vaciar el calabozo." }
            dungeon = null
            screen = RunScreen.TREASURE
        } else {
            dungeonGold = 8 + Rng.int(8)
            player.gold += dungeonGold
            screen = RunScreen.DUNGEON
        }
    }

    // ---------- dado del destino ----------
    /** Lo que salió en el dado (null mientras no se ha tirado). */
    var fateRoll: Int? = null

    /** Tira el d20. La casilla del jefe no cuenta como pisada: si sales y vuelves, puedes entrar sin volver a tirar. */
    fun rollFate(): Int {
        val roll = 1 + Rng.int(20)
        fateRoll = roll
        map.fate = roll
        visited.remove(pos.key)
        return roll
    }

    /** «¡A pelear!» tras el dado. */
    fun fateFight(): PendingCombat? {
        if (screen != RunScreen.FATE || fateRoll == null) return null
        fateRoll = null
        return PendingCombat(encounterFor("boss", 1.0), "boss")
    }

    // ---------- combate ----------
    fun startCombat(pc: PendingCombat, onUpdate: () -> Unit = {}, onEnd: (String) -> Unit = {}): Combat {
        screen = RunScreen.COMBAT
        combatKind = pc.kind
        val diff = difficulty
        val mods = World.scaledMods(diff.hpMult, diff.dmgBonus, player.act, player.floor)
        val c = Combat(player, pc.enemyIds, onUpdate, onEnd, mods, theme.rule)
        combat = c
        // lo que salió en el dado del destino se aplica al combate contra el jefe
        if (pc.kind == "boss") map.fate?.let { Fate.apply(c, it) }
        return c
    }

    /** Lo que pasa cuando el combate termina ("win" | "lose"): recompensas, game over o el final. */
    fun finishCombat(result: String) {
        val c = combat
        val p = player
        lastCombatXp = min(160, c?.xpGained ?: 0)
        if (result != "win") { screen = RunScreen.GAME_OVER; return }
        val kind = combatKind
        if (kind == "dungeon") { finishDungeonCombat(); return }
        CharacterHooks.onCombatEnd(p)
        p.relics.toList().forEach { Relics.hooks(it)?.onCombatEnd?.invoke(p) }
        p.statuses.clear()
        p.block = 0

        if (kind == "boss") lastBossId = c?.enemies?.getOrNull(0)?.defId
        // El jefe del último piso de cada castillo es el "jefe del castillo"; los de los pisos 1 y 2 son guardianes:
        // reparten un botín parecido al de una élite y suben al siguiente piso.
        val isCastleBoss = kind == "boss" && p.floor >= World.FLOORS_PER_CASTLE
        val isFinalBoss = isCastleBoss && p.act >= World.castles.size
        if (isFinalBoss) {
            // el Rey Fruta queda libre: se acabó la partida
            unlockMsg = progress.unlockNext(p.characterId, p.difficulty)
            combat = null
            screen = RunScreen.VICTORY
            return
        }
        val rewardKind = if (kind == "boss" && !isCastleBoss) "elite" else kind
        val gold = if (isCastleBoss) 70 + Rng.int(20)
        else if (kind == "boss") 45 + Rng.int(20)
        else if (kind == "elite") 28 + Rng.int(14)
        else 12 + Rng.int(12)
        loot.clear()
        loot.add(LootItem("gold", n = gold))
        rewardCards = Rewards.rollCards(p, 3, rewardKind)
        progress.discover(rewardCards)
        rewardCardPicked = false
        if (rewardKind == "elite") {
            Rewards.randomRelic(p, listOf("common", "uncommon", "rare"), lootRelicIds())?.let { loot.add(LootItem("relic", id = it.id)) }
        }
        val seedChance = if (kind == "boss") 1.0 else if (kind == "elite") 0.45 else 0.25
        if (Rng.next() < seedChance) loot.add(LootItem("seed", id = Seeds.roll().id))
        afterReward = if (isCastleBoss) "boss-relic" else if (kind == "boss") "next-floor" else "map"
        screen = RunScreen.REWARD
    }

    // ---------- recompensas ----------
    fun lootPending(): Boolean = loot.any { it.isOpen }
    internal fun lootRelicIds(): List<String> = loot.filter { it.k == "relic" && it.isOpen }.mapNotNull { it.id }

    /** Da de verdad un premio. */
    private fun grant(item: LootItem) {
        val p = player
        when (item.k) {
            "gold" -> p.gold += item.n
            "heal" -> p.heal(item.n)
            "maxhp" -> { p.maxHp += item.n; p.hp = min(p.maxHp, p.hp + item.heal) }
            "relic" -> Relics.get(item.id ?: "")?.let { Rewards.giveRelic(p, it) }
            "seed" -> Rewards.addSeed(p, item.id ?: "")
            "card" -> { p.deck.add(item.id ?: ""); progress.discover(listOf(item.id ?: "")) }
        }
    }

    /** Recoge el premio [i]. Falso si no se pudo (ya recogido, o la bolsa de semillas está llena). */
    fun collectLoot(i: Int): Boolean {
        val item = loot.getOrNull(i) ?: return false
        if (!item.isOpen) return false
        if (item.k == "seed" && Rewards.seedsFull(player)) return false
        grant(item)
        item.taken = true
        return true
    }

    /** Deja una semilla que no cabe en la bolsa. */
    fun dropLoot(i: Int) { loot.getOrNull(i)?.takeIf { it.isOpen }?.dropped = true }

    /** Tira la semilla del hueco [i] de la bolsa. Falso si ya estaba vacío. */
    fun discardSeed(i: Int): Boolean {
        if (i !in player.seeds.indices || player.seeds[i] == null) return false
        player.seeds[i] = null
        return true
    }

    /** Al cargar una partida: lo que quedó sin recoger fuera de las recompensas se da solo (menos semillas sin sitio). */
    fun grantAllLoot() {
        loot.filter { it.isOpen && (it.k != "seed" || !Rewards.seedsFull(player)) }.forEach { grant(it); it.taken = true }
        loot.clear()
    }

    fun pickRewardCard(cardId: String) {
        if (rewardCardPicked || cardId !in rewardCards) return
        player.deck.add(cardId)
        rewardCardPicked = true
    }

    /** La carta es obligatoria: solo se puede seguir sin elegir si no hubo ninguna que ofrecer. */
    fun canFinishReward(): Boolean = !lootPending() && (rewardCards.isEmpty() || rewardCardPicked)

    fun finishReward() {
        if (!canFinishReward()) return
        loot.clear()
        rewardCardPicked = false
        rewardCards = emptyList()
        combat = null
        when (afterReward) {
            "boss-relic" -> openBossRelics()
            "next-floor" -> startNextFloor()
            else -> screen = RunScreen.MAP
        }
    }

    // ---------- objetos de jefe y paso de piso ----------
    fun openBossRelics() {
        val owned = player.relics.toSet()
        val pool = Relics.db.values.filter { it.tier == "boss" && it.id !in owned }.toMutableList()
        val choices = ArrayList<String>()
        while (choices.size < 3 && pool.isNotEmpty()) choices.add(pool.removeAt(Rng.int(pool.size)).id)
        bossRelicChoices = choices
        screen = RunScreen.BOSS_RELIC
    }

    fun pickBossRelic(id: String) {
        val relic = Relics.get(id) ?: return
        if (id !in bossRelicChoices) return
        Rewards.giveRelic(player, relic)
        startNextFloor()
    }

    fun skipBossRelic() = startNextFloor()

    /** Sube al piso siguiente; tras el último piso de un castillo, pasa al castillo siguiente. */
    fun startNextFloor() {
        val p = player
        val newCastle = p.floor >= World.FLOORS_PER_CASTLE
        if (newCastle) { p.act = min(World.castles.size, p.act + 1); p.floor = 1 } else p.floor += 1
        val before = p.hp
        val frac = if (newCastle) difficulty.actHeal else difficulty.floorHeal
        p.heal(ceil((p.maxHp - p.hp) * frac).toInt())
        actHealed = p.hp - before
        // cada castillo nuevo pesa: una maldición se cuela en tu mazo
        actCurse = if (newCastle) (if (p.act == 2) "dado_trucado" else "gusano_interior") else null
        actCurse?.let { p.deck.add(it); progress.discover(listOf(it)) }
        newFloor()
        screen = RunScreen.ACT_INTRO
    }
}
