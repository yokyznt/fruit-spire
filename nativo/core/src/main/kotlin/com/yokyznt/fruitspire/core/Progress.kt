package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CosmeticDef
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

    // ---------- Pase de Batalla y vestidor ----------
    /** Experiencia del pase y niveles ya reclamados (ver Pass.kt). */
    var passXp = 0
    val passClaimed = LinkedHashSet<Int>()
    /** Ids del vestidor que ya se tienen (lo gratis desde el principio). */
    val owned = LinkedHashSet<String>(Cosmetics.FREE)
    /** fruta → ranura (skin, head, face, neck, pet) → id. */
    val equipped = HashMap<String, MutableMap<String, String?>>()
    /** Cambió algo que hay que guardar (lo limpia quien guarda). */
    var dirty = false

    fun isOwned(id: String): Boolean = id in owned

    /** Lo consigue (si existe). Devuelve lo que es. */
    fun grantCosmetic(id: String): CosmeticDef? {
        val c = Cosmetics.get(id) ?: return null
        if (owned.add(id)) dirty = true
        return c
    }

    fun equippedFor(charId: String): Equipped {
        val e = equipped[charId] ?: return Equipped()
        return Equipped(e["skin"], e["head"], e["face"], e["neck"], e["pet"])
    }

    /** La mascotita que acompaña a [charId] (solo si es suya y ya la tiene). */
    fun petFor(charId: String): CosmeticDef? {
        val c = Cosmetics.get(equippedFor(charId).pet) ?: return null
        return c.takeIf { it.type == "pet" && it.char == charId && isOwned(it.id) }
    }

    /**
     * Ponerse algo (o quitárselo). Un color reemplaza al otro; un accesorio o mascotita igual al puesto se quita.
     * Falso si no se tiene o es de otra fruta.
     */
    fun equip(charId: String, id: String): Boolean {
        val c = Cosmetics.get(id) ?: return false
        if (!isOwned(id) || (c.char != null && c.char != charId)) return false
        val e = equipped.getOrPut(charId) { HashMap() }
        if (c.type == "skin") e["skin"] = id
        else { val slot = c.slot ?: return false; e[slot] = if (e[slot] == id) null else id }
        dirty = true
        return true
    }

    fun unequipSlot(charId: String, slot: String) {
        equipped[charId]?.put(slot, null)
        dirty = true
    }

    /**
     * Revisa los retos de las mascotitas tras un logro y devuelve las nuevas. [bossAct]: castillo del jefe vencido (0 si no hubo);
     * [win]: grado en el que se ganó la partida (null si no se ganó).
     */
    fun checkPetUnlocks(charId: String, bossAct: Int, win: String?): List<CosmeticDef> {
        val ids = World.difficulties.take(3).map { it.id } // los tres grados normales; el grado Verde no cuenta
        val done = { c: CosmeticDef ->
            if (c.reqBossAct != null) bossAct >= c.reqBossAct
            else win != null && ids.indexOf(win) >= ids.indexOf(c.reqWin)
        }
        return Cosmetics.all.filter { it.type == "pet" && it.char == charId && !isOwned(it.id) && done(it) }.mapNotNull { grantCosmetic(it.id) }
    }

    // ---------- Colección: lo encontrado, el bestiario y las notas ----------
    /** Objetos y semillas que has tenido alguna vez (se anotan para siempre). */
    val foundRelics = LinkedHashSet<String>()
    val foundSeeds = LinkedHashSet<String>()
    /** Enemigos que has visto (una entrada = visto) y cuántas veces los derrotaste. */
    val bestiary = LinkedHashMap<String, Int>()
    /** Versión de las notas que ya abriste (para avisar de las nuevas). */
    var notesSeen = ""
    /** Ya viste el final (desbloquea «Ver el final otra vez» en las Notas). */
    var endingSeen = false

    fun markEndingSeen() { if (!endingSeen) { endingSeen = true; dirty = true } }

    fun markFoundRelic(id: String?) { if (id != null && foundRelics.add(id)) dirty = true }
    fun markFoundSeed(id: String?) { if (id != null && foundSeeds.add(id)) dirty = true }

    /** Lo marca como visto (al aparecer en un combate). */
    fun bestiarySee(id: String) { if (id !in bestiary) { bestiary[id] = 0; dirty = true } }

    /** Al terminar un combate: todos los que salieron quedan vistos y cada derrotado suma una victoria. */
    fun recordCombat(enemies: List<EnemyInstance>) {
        enemies.forEach { e ->
            bestiary[e.def.id] = (bestiary[e.def.id] ?: 0) + if (!e.isAlive()) 1 else 0
        }
        if (enemies.isNotEmpty()) dirty = true
    }

    fun bestiarySeen(): Int = bestiary.size

    fun notesAreNew(): Boolean = notesSeen != com.yokyznt.fruitspire.core.data.gen.GAME_VERSION

    fun openNotes() { notesSeen = com.yokyznt.fruitspire.core.data.gen.GAME_VERSION; dirty = true }
}
