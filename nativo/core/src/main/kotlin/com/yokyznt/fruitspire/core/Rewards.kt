package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CardDef
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.SEED_SLOTS

/**
 * Premio de una recompensa (js/loot.js). Se recoge uno por uno:
 * k = gold | heal | maxhp | relic | seed | card. [n] es la cantidad (oro, vida) y [id] la carta, objeto o semilla.
 */
class LootItem(val k: String, val n: Int = 0, val id: String? = null, val heal: Int = 0) {
    var taken = false
    var dropped = false
    val isOpen: Boolean get() = !taken && !dropped
}

/** Sorteo de cartas, objetos y semillas (la parte "azar" de js/game.js). Todo pasa por [Rng]. */
object Rewards {
    /**
     * Cartas que puede conseguir la fruta del jugador: las suyas y las neutrales.
     * [neutral] true → solo neutrales, false → solo las de la fruta, null → ambas.
     */
    fun cardsOfRarity(characterId: String?, rarity: String, type: String? = null, neutral: Boolean? = null): List<CardDef> =
        Cards.all().filter { c ->
            c.rarity == rarity && (type == null || c.type == type) &&
                when (neutral) {
                    true -> c.character == null
                    false -> c.character == characterId
                    null -> c.character == null || c.character == characterId
                }
        }

    /** Rareza al azar: las raras salen más en élites/jefes y en castillos altos. */
    fun rollRarity(act: Int, kind: String): String {
        var rare = 4.0 + act * 2
        var uncommon = 30.0 + act * 3
        if (kind == "elite") { rare *= 2; uncommon += 10 }
        if (kind == "boss") return "rare"
        val r = Rng.next() * 100
        return if (r < rare) "rare" else if (r < rare + uncommon) "uncommon" else "common"
    }

    /** Cartas de recompensa distintas entre sí (ids). En castillos altos algunas vienen maduradas ("id+"). */
    fun rollCards(p: Player, n: Int, kind: String, type: String? = null): List<String> {
        val upChance = if (p.act == 1) 0.0 else if (p.act == 2) 0.15 else 0.3
        val used = HashSet<String>()
        val result = ArrayList<String>()
        var guard = 0
        while (result.size < n && guard < 100) {
            guard++
            // 3 de cada 4 cartas son de la fruta; el resto, neutrales
            val rarity = rollRarity(p.act, kind)
            var pool = cardsOfRarity(p.characterId, rarity, type, Rng.next() < 0.25).filter { it.id !in used }
            if (pool.isEmpty()) pool = cardsOfRarity(p.characterId, rarity, type).filter { it.id !in used }
            if (pool.isEmpty()) continue
            val c = Rng.pick(pool)
            used.add(c.id)
            result.add(if (Rng.next() < upChance) c.id + "+" else c.id)
        }
        return result
    }

    /** Objeto al azar de los niveles pedidos, sin repetir los que ya tienes ni los [excluded]. Las raras salen menos. */
    fun randomRelic(p: Player, tiers: List<String>, excluded: Collection<String> = emptyList()): RelicDef? {
        val owned = HashSet<String>(p.relics).apply { addAll(excluded) }
        val pool = Relics.db.values.filter { it.id !in owned && it.tier in tiers }
        if (pool.isEmpty()) return null
        val weight = mapOf("common" to 5, "uncommon" to 3, "rare" to 2, "boss" to 1)
        var r = Rng.next() * pool.sumOf { weight[it.tier] ?: 1 }
        for (x in pool) { r -= weight[x.tier] ?: 1; if (r <= 0) return x }
        return pool.last()
    }

    fun giveRelic(p: Player, relic: RelicDef) {
        p.relics.add(relic.id)
        Relics.hooks(relic.id)?.onPickup?.invoke(p)
    }

    /** Guarda una semilla en el primer hueco libre de la bolsa. */
    fun addSeed(p: Player, id: String): Boolean {
        val i = p.seeds.indexOf(null)
        if (i < 0) return false
        p.seeds[i] = id
        return true
    }

    fun seedsFull(p: Player): Boolean = p.seeds.size >= SEED_SLOTS && p.seeds.none { it == null }
}
