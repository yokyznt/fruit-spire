package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CosmeticDef
import kotlin.math.min
import kotlin.math.roundToInt

// ============================================================
// Pase de Batalla (js/battlepass.js): cada enemigo derrotado da experiencia; al subir de nivel se desbloquea un premio del vestidor
// (colores y accesorios) que se reclama desde el menú. Las mascotitas no van aquí: se ganan con retos.
// La experiencia y lo reclamado viven en Progress.
// ============================================================
object Pass {
    class Reward(val level: Int, val id: String)

    /** [into] de [need] XP hacia el siguiente nivel ([pct] en %); [max] niveles en total. */
    class State(val xp: Int, val level: Int, val max: Int, val need: Int, val into: Int, val pct: Int, val claimed: Set<Int>)

    /** Lo que dio una tanda de experiencia: [levels] niveles subidos y el [level] al que se llegó. */
    class Gain(val xp: Int, val level: Int, val levels: Int)

    /**
     * Premios en orden: accesorios de todos, colores y los exclusivos de cada fruta, repartidos hacia el final
     * (un exclusivo cada 3 premios, una vez pasado el primer tercio).
     */
    val rewards: List<Reward> by lazy {
        val pool = Cosmetics.all.filter { it.type != "pet" && it.id !in Cosmetics.FREE }
        val generic = pool.filter { it.type == "acc" && it.char == null }
        val skins = pool.filter { it.type == "skin" }
        val exclusive = pool.filter { it.type == "acc" && it.char != null }
        val order = ArrayList<CosmeticDef>()
        var g = 0; var s = 0; var e = 0
        while (g < generic.size || s < skins.size || e < exclusive.size) {
            if (g < generic.size) order.add(generic[g++])
            if (s < skins.size) order.add(skins[s++])
            if (e < exclusive.size && order.size > pool.size / 3.0) order.add(exclusive[e++])
            if (g >= generic.size && s >= skins.size && e < exclusive.size) order.add(exclusive[e++])
        }
        order.mapIndexed { i, c -> Reward(i + 1, c.id) }
    }

    /** XP que cuesta pasar del nivel n-1 al n. */
    fun xpForLevel(n: Int): Int = 60 + 12 * n

    private fun totalFor(level: Int): Int { var t = 0; for (n in 1..level) t += xpForLevel(n); return t }

    fun state(p: Progress): State {
        val max = rewards.size
        var level = 0
        while (level < max && p.passXp >= totalFor(level + 1)) level++
        val base = totalFor(level)
        val need = if (level >= max) 1 else xpForLevel(level + 1)
        val into = if (level >= max) 1 else p.passXp - base
        return State(p.passXp, level, max, need, into, min(100, (into * 100.0 / need).roundToInt()), p.passClaimed.toSet())
    }

    /** Suma experiencia (lo negativo no resta). */
    fun addXp(p: Progress, n: Int): Gain {
        val before = state(p).level
        p.passXp += maxOf(0, n)
        p.dirty = true
        val after = state(p).level
        return Gain(n, after, after - before)
    }

    fun canClaim(p: Progress, level: Int): Boolean = level >= 1 && level <= state(p).level && level !in p.passClaimed

    /** Reclama el premio de un nivel: lo pone en el vestidor. Null si no se puede. */
    fun claim(p: Progress, level: Int): CosmeticDef? {
        if (!canClaim(p, level)) return null
        val r = rewards.getOrNull(level - 1) ?: return null
        p.passClaimed.add(level)
        p.dirty = true
        return p.grantCosmetic(r.id)
    }

    fun claimAll(p: Progress): List<CosmeticDef> {
        val got = ArrayList<CosmeticDef>()
        for (l in 1..state(p).level) claim(p, l)?.let { got.add(it) }
        return got
    }

    /** Niveles alcanzados cuyo premio aún no se reclama. */
    fun unclaimed(p: Progress): Int = (1..state(p).level).count { it !in p.passClaimed }
}
