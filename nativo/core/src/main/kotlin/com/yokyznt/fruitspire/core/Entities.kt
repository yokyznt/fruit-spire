package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.EnemyDef
import com.yokyznt.fruitspire.core.data.Move
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Azar del juego. Por defecto es `Math.random`; con [seed] pasa a mulberry32, el mismo generador que usan
 * las pruebas del juego web, para comparar el motor de Kotlin con el de JavaScript jugada por jugada.
 */
object Rng {
    private var gen: () -> Double = { Math.random() }

    fun seed(seed: Int) {
        var a = seed
        gen = {
            a += 0x6D2B79F5
            var t = (a xor (a ushr 15)) * (1 or a)
            t = (t + (t xor (t ushr 7)) * (61 or t)) xor t
            ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
        }
    }
    fun unseed() { gen = { Math.random() } }

    fun next(): Double = gen()
    /** Entero en [0, n). */
    fun int(n: Int): Int = floor(next() * n).toInt()
    fun <T> pick(list: List<T>): T = list[int(list.size)]
    fun <T, L : MutableList<T>> shuffle(list: L): L {
        for (i in list.size - 1 downTo 1) {
            val j = int(i + 1)
            val t = list[i]; list[i] = list[j]; list[j] = t
        }
        return list
    }
}

/** Math.round de JavaScript: los .5 suben. */
fun jsRound(x: Double): Int = floor(x + 0.5).toInt()

open class Entity(var name: String, var hp: Int, var maxHp: Int) {
    var block = 0 // "cáscara"
    val statuses = LinkedHashMap<String, Int>()
    /** Daño extra por golpe: nivel y dificultad (enemigos) o regla del piso (jugador). */
    var dmgBonus = 0
    var capLost = 0 // Coraza Dura: PV perdidos este turno

    fun isAlive() = hp > 0
    fun getStatus(id: String): Int = statuses[id] ?: 0
    fun addStatus(id: String, amount: Int) {
        val v = (statuses[id] ?: 0) + amount
        if (v <= 0) statuses.remove(id) else statuses[id] = v
    }
    fun addBlock(amount: Int) { block += max(0, amount) }
    fun heal(amount: Int): Int {
        val before = hp
        hp = min(maxHp, hp + amount)
        return hp - before
    }
    /** Devuelve cuántos PV se perdieron de verdad (después de la cáscara). */
    fun takeDamage(amount: Int): Int {
        var remaining = amount
        if (block > 0) {
            val absorbed = min(block, remaining)
            block -= absorbed
            remaining -= absorbed
        }
        val before = hp
        if (remaining > 0) hp = max(0, hp - remaining)
        return before - hp
    }
    /** Pérdida de vida directa (putrefacción, sacrificios): ignora la cáscara. */
    fun loseHp(amount: Int): Int {
        val before = hp
        hp = max(0, hp - amount)
        return before - hp
    }
}

/** Brote plantado en el viñedo de la Uva. */
class Sprout(val type: String, var timer: Int, var fresh: Boolean = true)

class Player : Entity("Manzano", 70, 70) {
    var characterId = "manzana"
    var gold = 99
    var maxEnergy = 3
    var energy = 3
    val relics = ArrayList<String>()
    /** Contadores de objetos que duran toda la partida. */
    val relicCounters = HashMap<String, MutableMap<String, Any?>>()
    /** Ids de todas las cartas que posee ("id+" = madurada). */
    var deck = ArrayList<String>()
    var drawPile = ArrayList<String>()
    var hand = ArrayList<String>()
    var discardPile = ArrayList<String>()
    /** "Compost": cartas consumidas en este combate. */
    var exhaustPile = ArrayList<String>()
    var permanentStrength = 0
    var act = 1
    var difficulty = "madura"
    /** Cuántas cartas se han quitado en tiendas (sube el precio). */
    var removals = 0
    /** Bolsa de semillas (ids o null). */
    val seeds = arrayOfNulls<String>(3)
    var garden = ArrayList<Sprout>()
    var hasGoldenKey = false
}

class EnemyInstance(val def: EnemyDef, hpMult: Double = 1.0, dmgBonusMod: Int = 0) : Entity(def.name, 1, 1) {
    val defId: String = def.id
    var nextMove: Move? = null
    val history = ArrayList<String>()
    var turns = 0
    var phase = 0
    var stolenGold = 0
    val stolenCards = ArrayList<String>()
    // marcas internas del motor
    var deathHandled = false
    var fled = false
    var split = false

    init {
        val base = Rng.int(def.hpMax - def.hpMin + 1) + def.hpMin
        val h = max(1, jsRound(base * hpMult))
        hp = h
        maxHp = h
        dmgBonus = dmgBonusMod
        def.start?.forEach { (id, n) -> addStatus(id, n) }
    }

    /**
     * Elige la siguiente jugada. Si el enemigo tiene `ai`, decide él; si no, al azar por peso sin repetir
     * la misma jugada demasiadas veces.
     */
    fun chooseMove(combat: Combat): Move {
        val moves = def.moves
        var move: Move? = null
        def.ai?.let { ai ->
            val id = ai(this, combat)
            move = moves.firstOrNull { it.id == id }
        }
        if (move == null) {
            val last = history.lastOrNull()
            val last2 = if (history.size >= 2) history[history.size - 2] else null
            val pool = moves.filter { m ->
                if (m.once && history.contains(m.id)) false
                else !(m.id == last && (m.noRepeat || m.id == last2))
            }
            val list = if (pool.isNotEmpty()) pool else moves
            val total = list.sumOf { it.weight ?: 1.0 }
            var r = Rng.next() * total
            var chosen = list.last()
            for (m in list) {
                val w = m.weight ?: 1.0
                if (r < w) { chosen = m; break }
                r -= w
            }
            move = chosen
        }
        nextMove = move
        return move!!
    }
}
