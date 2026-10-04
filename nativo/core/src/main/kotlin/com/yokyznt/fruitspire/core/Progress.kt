package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.World
import kotlin.math.min

/**
 * Lo que dura entre partidas: el grado de putrefacción más alto abierto para cada fruta (UNLOCKS_KEY de js/game.js)
 * y las cartas que ya viste (DISCOVERED_KEY). Se guarda aparte de la partida (ver Save.kt).
 */
class Progress {
    /** fruta → índice del grado más alto desbloqueado (0 = Normal). */
    val unlocked = HashMap<String, Int>()
    val discovered = LinkedHashSet<String>()

    fun level(charId: String): Int = min(World.difficulties.size - 1, unlocked[charId] ?: 0)

    fun isUnlocked(charId: String, diffId: String): Boolean =
        World.difficulties.indexOfFirst { it.id == diffId } <= level(charId)

    /** Al ganar con una fruta se abre el siguiente grado. Devuelve el aviso, o "" si no había nada que abrir. */
    fun unlockNext(charId: String, diffId: String): String {
        val idx = World.difficulties.indexOfFirst { it.id == diffId }
        val next = World.difficulties.getOrNull(idx + 1) ?: return ""
        if (level(charId) >= idx + 1) return ""
        unlocked[charId] = idx + 1
        return "¡Desbloqueaste el grado ${next.name} para ${World.character(charId)?.name ?: charId}!"
    }

    /** Anota cartas vistas ("id+" cuenta como "id"). */
    fun discover(ids: Collection<String>) { ids.forEach { discovered.add(it.removeSuffix("+")) } }
}
