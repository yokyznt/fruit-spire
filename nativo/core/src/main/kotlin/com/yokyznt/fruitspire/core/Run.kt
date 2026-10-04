package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CastleDef
import com.yokyznt.fruitspire.core.data.CharacterHooks
import com.yokyznt.fruitspire.core.data.Difficulty
import com.yokyznt.fruitspire.core.data.EnemyDef
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.FloorTheme
import com.yokyznt.fruitspire.core.data.Plan
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World
import kotlin.math.ceil
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
    /** Casilla cuyo contenido llega en la etapa 3 (tienda, campamento, tesoro, misterio…). */
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
                return PendingCombat(encounterFor(kind, pos.x.toDouble() / (map.cols - 1)), kind)
            }
            NodeType.EMPTY, NodeType.BLOCKED -> screen = RunScreen.MAP
            else -> { stubNode = type; screen = RunScreen.NODE_STUB }
        }
        return null
    }

    /** Sigue de largo una casilla que aún no tiene contenido. */
    fun leaveStub() { stubNode = null; screen = RunScreen.MAP }

    // ---------- combate ----------
    fun startCombat(pc: PendingCombat, onUpdate: () -> Unit = {}, onEnd: (String) -> Unit = {}): Combat {
        screen = RunScreen.COMBAT
        combatKind = pc.kind
        val diff = difficulty
        val mods = World.scaledMods(diff.hpMult, diff.dmgBonus, player.act, player.floor)
        val c = Combat(player, pc.enemyIds, onUpdate, onEnd, mods, theme.rule)
        combat = c
        return c
    }

    /** Lo que pasa cuando el combate termina ("win" | "lose"): recompensas, game over o el final. */
    fun finishCombat(result: String) {
        val c = combat
        val p = player
        lastCombatXp = min(160, c?.xpGained ?: 0)
        if (result != "win") { screen = RunScreen.GAME_OVER; return }
        val kind = combatKind
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
    private fun lootRelicIds(): List<String> = loot.filter { it.k == "relic" && it.isOpen }.mapNotNull { it.id }

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
