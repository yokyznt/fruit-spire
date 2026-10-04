package com.yokyznt.fruitspire.core.data

import com.yokyznt.fruitspire.core.Rng

/**
 * Plan de pisos y encuentros (las funciones de js/data/castles.js: planRun, floorThemeId, floorSize,
 * pickBoss y pickEncounter). Los datos de temas y castillos salen de data/gen/GenWorld.kt.
 */
object Plan {
    /** Sortea los temas de los 9 pisos de una partida: un renglón por castillo. */
    fun run(): List<List<String>> = World.castles.map { c ->
        val fixed = c.fixed
        if (fixed != null) {
            if (c.shuffle) Rng.shuffle(ArrayList(fixed)) else fixed.toList()
        } else {
            val take = if (c.last != null) (c.pick ?: 2) else World.FLOORS_PER_CASTLE
            val ids = Rng.shuffle(ArrayList(c.pool!!)).take(take).toMutableList()
            c.last?.let { ids.add(it) }
            ids
        }
    }

    /** Comprueba que un plan guardado sirve (partidas dañadas). */
    fun isValid(plan: List<List<String>>?): Boolean =
        plan != null && plan.size == World.castles.size &&
            plan.all { row -> row.size == World.FLOORS_PER_CASTLE && row.all { World.themes.containsKey(it) } }

    fun themeId(plan: List<List<String>>?, castleN: Int, floor: Int): String {
        val row = plan?.getOrNull(castleN - 1) ?: emptyList()
        val castle = World.castles[castleN - 1]
        return row.getOrNull(floor - 1) ?: (castle.fixed ?: castle.pool)?.getOrNull(floor - 1) ?: "huerto"
    }

    /** (columnas, filas) del mapa de un piso, contando la columna de la guarida. */
    fun floorSize(castleN: Int, floor: Int): Pair<Int, Int> {
        val c = World.castles.getOrNull(castleN - 1) ?: World.castles[0]
        return c.sizes[floor.coerceIn(1, c.sizes.size) - 1]
    }

    /** Jefe del piso: los pisos 1 y 2 tienen un guardián del tema; el último, el jefe del castillo. */
    fun pickBoss(castleN: Int, floor: Int, themeId: String): String {
        val castle = World.castles.getOrNull(castleN - 1) ?: World.castles[0]
        val theme = World.themes[themeId]
        if (floor < World.FLOORS_PER_CASTLE && theme != null && theme.bosses.isNotEmpty()) return Rng.pick(theme.bosses)
        return Rng.pick(castle.bosses)
    }

    /**
     * Grupo de enemigos para una casilla. kind: enemy | elite | boss.
     * progress: 0 (inicio del mapa) a 1 (junto al jefe): al principio salen los más débiles.
     */
    fun encounter(castleN: Int, progress: Double, kind: String, bossId: String?, themeId: String): List<String> {
        val castle = World.castles.getOrNull(castleN - 1) ?: World.castles[0]
        val theme = World.themes[themeId] ?: World.themes.getValue((castle.fixed ?: castle.pool)!![0])
        if (kind == "boss") return listOf(bossId ?: Rng.pick(castle.bosses))
        if (kind == "elite") return Rng.pick(theme.elites.ifEmpty { World.themes.getValue("huerto").elites }).toList()
        return Rng.pick(if (progress <= 0.3) theme.weak else theme.normal).toList()
    }
}
