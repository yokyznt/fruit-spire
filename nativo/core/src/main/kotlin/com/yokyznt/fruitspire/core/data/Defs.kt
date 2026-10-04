package com.yokyznt.fruitspire.core.data

import com.yokyznt.fruitspire.core.Combat
import com.yokyznt.fruitspire.core.Ctx
import com.yokyznt.fruitspire.core.EnemyInstance
import com.yokyznt.fruitspire.core.Player
import com.yokyznt.fruitspire.core.data.gen.GEN_CARDS
import com.yokyznt.fruitspire.core.data.gen.GEN_CASTLES
import com.yokyznt.fruitspire.core.data.gen.GEN_CHARACTERS
import com.yokyznt.fruitspire.core.data.gen.GEN_DIFFICULTIES
import com.yokyznt.fruitspire.core.data.gen.GEN_ENEMIES
import com.yokyznt.fruitspire.core.data.gen.GEN_FLOOR_SCALING
import com.yokyznt.fruitspire.core.data.gen.GEN_RELICS
import com.yokyznt.fruitspire.core.data.gen.GEN_RULES
import com.yokyznt.fruitspire.core.data.gen.GEN_SEEDS
import com.yokyznt.fruitspire.core.data.gen.GEN_SPROUTS
import com.yokyznt.fruitspire.core.data.gen.GEN_STARTER_BASE
import com.yokyznt.fruitspire.core.data.gen.GEN_STARTER_SIGNATURE
import com.yokyznt.fruitspire.core.data.gen.GEN_STATUSES
import com.yokyznt.fruitspire.core.data.gen.GEN_THEMES

// Definiciones de datos del juego. Los datos los genera tools/export-core-data.js desde js/data/*.js;
// las funciones (efectos, IA, ganchos) están portadas a mano en este mismo paquete.

/** U(a, b): a normal, b al madurar la carta (igual que `U` del juego web). */
typealias U = (Int, Int) -> Int
typealias CardEffect = (Ctx, U) -> Unit
typealias EnemyAiFn = (EnemyInstance, Combat) -> String?

// ---------- estados ----------
class StatusDef(
    val id: String, val name: String, val word: String, val icon: String, val sprite: String,
    val kind: String, val cls: String, val help: String, val noCount: Boolean = false
)

object Statuses {
    val db: Map<String, StatusDef> by lazy { GEN_STATUSES.associateBy { it.id } }
    fun get(id: String): StatusDef? = db[id]
}

// ---------- cartas ----------
class CardDef(
    val id: String, val name: String, val type: String, val cost: Int, val rarity: String, val description: String,
    val art: String = "", val fx: String? = null, val target: String? = null, val upCost: Int? = null,
    val exhaust: Boolean = false, val upExhaust: Boolean? = null, val retain: Boolean = false, val unplayable: Boolean = false,
    val ethereal: Boolean = false, val endTurnDamage: Int = 0, val character: String? = null, val sprite: String? = null
)

private val CARD_TEXT = Regex("""\{([^|}]*)\|([^}]*)\}""")

/** "Inflige {6|9} de daño." → texto normal o madurado. */
fun resolveCardText(text: String, up: Boolean): String =
    CARD_TEXT.replace(text) { m -> if (up) m.groupValues[2] else m.groupValues[1] }

/** Carta lista para jugar: la normal o la madurada ("id+"). */
class Card(val def: CardDef, val upgraded: Boolean) {
    val id: String = def.id + if (upgraded) "+" else ""
    val baseId: String = def.id
    val name: String = def.name + if (upgraded) "+" else ""
    val type: String get() = def.type
    val rarity: String get() = def.rarity
    val fx: String? get() = def.fx
    val art: String get() = def.art
    val target: String? get() = def.target
    val retain: Boolean get() = def.retain
    val unplayable: Boolean get() = def.unplayable
    val ethereal: Boolean get() = def.ethereal
    val endTurnDamage: Int get() = def.endTurnDamage
    val character: String? get() = def.character
    val cost: Int = if (upgraded && def.upCost != null) def.upCost else def.cost
    val exhaust: Boolean = if (upgraded && def.upExhaust != null) def.upExhaust else def.exhaust
    val description: String = resolveCardText(def.description, upgraded)
    val canUpgrade: Boolean = !upgraded && def.type != "curse" && def.type != "status" && def.rarity != "token"
    val sprite: String = def.sprite ?: def.id
    private val u: U = { a, b -> if (upgraded) b else a }

    fun effect(ctx: Ctx) {
        CardEffects.of(def.id)?.invoke(ctx, u)
    }
}

object Cards {
    val defs: Map<String, CardDef> by lazy { GEN_CARDS.associateBy { it.id } }
    private val cache = HashMap<String, Card>()

    /** Busca una carta por id; "id+" es la versión madurada. */
    fun get(id: String?): Card? {
        if (id.isNullOrEmpty()) return null
        cache[id]?.let { return it }
        val up = id.endsWith("+")
        val def = defs[if (up) id.dropLast(1) else id] ?: return null
        return Card(def, up).also { cache[id] = it }
    }
    fun all(): List<CardDef> = GEN_CARDS
}

// ---------- objetos ----------
class RelicDef(
    val id: String, val name: String, val icon: String, val description: String, val tier: String = "common",
    val ref: String? = null, val drawBonus: Int = 0, val noRest: Boolean = false
)

/**
 * Algo del vestidor. [type]: "skin" (color de una fruta), "acc" (accesorio de una ranura: head, face o neck; con [char] solo esa fruta
 * puede ponérselo) o "pet" (mascotita de una fruta con su [bonus] y el reto para ganarla: [reqBossAct] o [reqWin]).
 */
class CosmeticDef(
    val id: String, val type: String, val name: String, val char: String? = null, val slot: String? = null,
    val bonus: String? = null, val reqBossAct: Int? = null, val reqWin: String? = null
)

/** Una entrada de las notas de la versión (js/notes.js). */
class PatchNote(val version: String, val date: String, val title: String, val items: List<String>, val fixes: List<String>)

/** El guiño de un objeto: los juegos que lo inspiran (nombres y claves de su dibujo `refgame~<clave>`) y por qué (REFS de js/data/refs.js). */
class RefInfo(val games: List<String>, val text: String, val keys: List<String>)

/** Ganchos de un objeto (todos opcionales). Ver js/data/relics.js. */
class RelicHooks(
    val onPickup: ((Player) -> Unit)? = null,
    val onCombatStart: ((Ctx) -> Unit)? = null,
    val onTurnStart: ((Ctx) -> Unit)? = null,
    val onTurnEnd: ((Ctx) -> Unit)? = null,
    val onCardPlayed: ((Ctx, Card) -> Unit)? = null,
    val onExhaust: ((Ctx) -> Unit)? = null,
    val onEnemyDeath: ((Ctx, EnemyInstance) -> Unit)? = null,
    val onHpLoss: ((Ctx) -> Unit)? = null,
    val onCombatEnd: ((Player) -> Unit)? = null,
    val onRest: ((Player) -> Int)? = null
)

object Relics {
    val db: Map<String, RelicDef> by lazy { GEN_RELICS.associateBy { it.id } }
    fun get(id: String): RelicDef? = db[id]
    fun hooks(id: String): RelicHooks? = RelicHookTable.map[id]
}

// ---------- semillas y brotes ----------
const val SEED_SLOTS = 3
const val GARDEN_SIZE = 3

class SeedDef(
    val id: String, val name: String, val icon: String, val rarity: String, val color: String, val mark: String,
    val target: String?, val desc: String
)

object Seeds {
    val db: Map<String, SeedDef> by lazy { GEN_SEEDS.associateBy { it.id } }
    fun get(id: String): SeedDef? = db[id]

    /** Semilla al azar (las raras salen menos). */
    fun roll(): SeedDef {
        val weight = mapOf("common" to 6, "uncommon" to 3, "rare" to 1)
        val all = GEN_SEEDS
        var r = com.yokyznt.fruitspire.core.Rng.next() * all.sumOf { weight[it.rarity] ?: 0 }
        for (s in all) { r -= weight[s.rarity] ?: 0; if (r <= 0) return s }
        return all[0]
    }
}

class SproutDef(
    val id: String, val name: String, val word: String, val sprite: String, val icon: String,
    val time: Int, val effect: String, val help: String
)

object Sprouts {
    val db: Map<String, SproutDef> by lazy { GEN_SPROUTS.associateBy { it.id } }
    fun get(id: String): SproutDef? = db[id]
}

// ---------- enemigos ----------
class AddCard(val id: String, val n: Int, val to: String)

class Move(
    val id: String, val name: String, val damage: Int = 0, val hits: Int = 0, val block: Int = 0, val allyBlock: Int = 0,
    val apply: Map<String, Int>? = null, val self: Map<String, Int>? = null, val allies: Map<String, Int>? = null,
    val heal: Int = 0, val healAll: Int = 0, val stealGold: Int = 0, val addCard: AddCard? = null, val summon: List<String>? = null,
    val weight: Double? = null, val noRepeat: Boolean = false, val once: Boolean = false, val drain: Boolean = false,
    val stealCard: Int = 0, val anim: String? = null, val fx: String? = null,
    val special: ((EnemyInstance, Ctx) -> Unit)? = null
)

class EnemyDef(
    val id: String, val name: String, val icon: String, val hpMin: Int, val hpMax: Int, val moves: List<Move>,
    val idle: String? = null, val tier: String = "normal", val start: Map<String, Int>? = null,
    val phaseSprites: List<String>? = null, val phaseNames: List<String>? = null, val final: Boolean = false,
    val explode: Int? = null, val sprite: String? = null, val splitInto: String? = null, val leader: Boolean = false,
    val clockEvery: Int? = null, val breedInto: String? = null, val ai: EnemyAiFn? = null
)

object Enemies {
    val db: Map<String, EnemyDef> by lazy { GEN_ENEMIES.associateBy { it.id } }
    fun get(id: String): EnemyDef? = db[id]
}

/** IA que recorre una lista de jugadas en orden (`cycle` del juego web). */
fun cycle(vararg ids: String): EnemyAiFn = { e, _ -> ids[e.turns % ids.size] }

// ---------- mundo: temas, castillos, personajes, dificultad ----------
class RuleInfo(val icon: String, val name: String, val desc: String, val hideIntent: Boolean, val sprite: String)

/** Ganchos de la regla de un piso (ctx.say muestra un aviso). */
class RuleHooks(
    val onCombatStart: ((Ctx) -> Unit)? = null,
    val onTurnStart: ((Ctx, Int) -> Unit)? = null,
    val onTurnEnd: ((Ctx, Int) -> Unit)? = null,
    val onCardPlayed: ((Ctx, Card) -> Unit)? = null
)

class FloorRule(val info: RuleInfo, val hooks: RuleHooks)

class FloorTheme(
    val id: String, val castle: Int, val name: String, val subtitle: String, val icon: String,
    val weak: List<List<String>>, val normal: List<List<String>>, val elites: List<List<String>> = emptyList(),
    val bosses: List<String> = emptyList(), val deco: List<String> = emptyList(), val games: Int = 1,
    val gameKind: String? = null, val variant: String? = null
) {
    val rule: FloorRule? get() = Rules.of(id)
}

object Rules {
    fun of(themeId: String): FloorRule? {
        val info = GEN_RULES[themeId] ?: return null
        return FloorRule(info, FloorRuleTable.map[themeId] ?: RuleHooks())
    }
}

class CastleDef(
    val n: Int, val id: String, val name: String, val subtitle: String, val icon: String, val sprite: String,
    val sizes: List<Pair<Int, Int>>, val pool: List<String>? = null, val fixed: List<String>? = null,
    val shuffle: Boolean = false, val pick: Int? = null, val last: String? = null, val bosses: List<String>, val story: String
)

class CharacterDef(
    val id: String, val name: String, val icon: String, val baseHp: Int, val style: String, val description: String
)

class Difficulty(
    val id: String, val name: String, val sprite: String, val desc: String, val hpMult: Double, val dmgBonus: Int,
    val gold: Int, val restHeal: Double, val actHeal: Double, val floorHeal: Double, val elites: Int, val curse: String? = null
)

object World {
    val themes: Map<String, FloorTheme> by lazy { GEN_THEMES.associateBy { it.id } }
    val castles: List<CastleDef> get() = GEN_CASTLES
    val characters: List<CharacterDef> get() = GEN_CHARACTERS
    val difficulties: List<Difficulty> by lazy { GEN_DIFFICULTIES.filter { it.id != "verde" } }
    val easyDifficulty: Difficulty by lazy { GEN_DIFFICULTIES.first { it.id == "verde" } }
    const val FLOORS_PER_CASTLE = 3

    fun character(id: String): CharacterDef? = GEN_CHARACTERS.firstOrNull { it.id == id }
    fun difficulty(id: String): Difficulty =
        if (id == "verde") easyDifficulty else difficulties.firstOrNull { it.id == id } ?: difficulties[0]

    fun starterDeck(charId: String): List<String> = GEN_STARTER_BASE + (GEN_STARTER_SIGNATURE[charId] ?: emptyList())

    /** Escala extra según el piso (9 pisos: 3 castillos × 3). → (vida ×, daño +) */
    fun scaledMods(hpMult: Double, dmgBonus: Int, castle: Int, floor: Int): Pair<Double, Int> {
        val i = ((castle - 1) * 3 + (floor - 1)).coerceIn(0, 8)
        val s = GEN_FLOOR_SCALING[i]
        return Pair(hpMult * s.first, dmgBonus + s.second)
    }
}
