package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CosmeticDef
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.GEN_COSMETICS

// ============================================================
// Vestidor: colores, accesorios y mascotitas de las frutas (js/data/cosmetics.js). Aquí van los datos y los textos; lo que tiene
// cada jugador y lo que lleva puesto vive en Progress, y los efectos de las mascotitas en Pets.kt.
// ============================================================

/** Lo que lleva puesto una fruta (ids o null). */
class Equipped(val skin: String? = null, val head: String? = null, val face: String? = null, val neck: String? = null, val pet: String? = null) {
    fun inSlot(slot: String): String? = when (slot) { "head" -> head; "face" -> face; "neck" -> neck; "pet" -> pet; "skin" -> skin; else -> null }
}

object Cosmetics {
    val all: List<CosmeticDef> = GEN_COSMETICS
    private val byId = all.associateBy { it.id }

    fun get(id: String?): CosmeticDef? = if (id == null) null else byId[id]

    /** Lo que ya se tiene desde el principio (no va en el pase). */
    val FREE = listOf("manzana_clasica", "platanin_clasico", "kiwi_clasico", "uva_clasica", "gorra")

    /** Ranuras en el orden del vestidor. */
    val SLOT_NAMES = linkedMapOf("pet" to "Mascotita", "head" to "Cabeza", "face" to "Cara", "neck" to "Cuello")

    fun skinsOf(charId: String): List<CosmeticDef> = all.filter { it.type == "skin" && it.char == charId }

    /** Lo que cabe en una ranura para esa fruta (los exclusivos de otra fruta no). */
    fun forSlot(slot: String, charId: String): List<CosmeticDef> = all.filter { it.slot == slot && (it.char == null || it.char == charId) }

    private fun charName(id: String?): String = World.character(id ?: "")?.name ?: (id ?: "")

    /** Qué es, en una frase (`cosmeticLabel` del juego web). */
    fun label(c: CosmeticDef): String = when (c.type) {
        "skin" -> "color para ${charName(c.char)}"
        "pet" -> "mascotita de ${charName(c.char)}: ${c.bonus}"
        else -> "accesorio de ${SLOT_NAMES[c.slot]?.lowercase()}${if (c.char != null) " para ${charName(c.char)}" else ""}"
    }

    /** El reto que abre una mascotita. */
    fun petHowText(c: CosmeticDef): String {
        val who = charName(c.char)
        c.reqBossAct?.let { return "Vence al jefe del Castillo $it jugando con $who." }
        val d = World.difficulty(c.reqWin ?: "madura")
        return "Gana una partida con $who en grado ${d.name}${if (c.reqWin == "podrida") "" else " o más difícil"}."
    }

    /**
     * Capas que se dibujan encima de la fruta [charId] (de abajo arriba): cuello, cara, cabeza y la mascotita. Son los nombres de los
     * dibujos exportados (`acc~<fruta>~<id>` y `pet~<id>`). El color va aparte: es el dibujo de la fruta con esa piel.
     */
    fun layersFor(charId: String, eq: Equipped): List<String> {
        val out = ArrayList<String>()
        listOf(eq.neck, eq.face, eq.head).forEach { id ->
            val c = get(id) ?: return@forEach
            if (c.type == "acc" && (c.char == null || c.char == charId)) out.add("acc~$charId~${c.id}")
        }
        val pet = get(eq.pet)
        if (pet != null && pet.type == "pet" && pet.char == charId) out.add("pet~${pet.id}")
        return out
    }
}
