package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.RefInfo
import com.yokyznt.fruitspire.core.data.RelicDef
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.SeedDef
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.GEN_RELIC_REFS
import java.text.Collator
import java.util.Locale

// ============================================================
// La Colección (js/collection.js): cartas, objetos, semillas y bestiario en un solo lugar. Aquí van los listados y los textos;
// lo que ya encontraste vive en Progress (cartas vistas, objetos y semillas encontrados, bestiario).
// ============================================================
object Album {
    private val collator: Collator = Collator.getInstance(Locale("es"))

    /** Un grupo del álbum de cartas: una fruta, las neutrales o las maldiciones y estados. */
    class CardGroup(val title: String, val sprite: String, val icon: String, val cards: List<String>)

    private val albumCards get() = Cards.all().filter { it.rarity != "token" }

    fun cardGroups(): List<CardGroup> {
        val all = albumCards
        return World.characters.map { ch -> CardGroup(ch.name, ch.id, ch.icon, all.filter { it.character == ch.id }.map { it.id }) } +
            CardGroup("Neutrales", "node_mystery", "✨", all.filter { it.character == null && it.type != "curse" && it.type != "status" }.map { it.id }) +
            CardGroup("Maldiciones y estados", "fruta_magullada", "🤕", all.filter { it.type == "curse" || it.type == "status" }.map { it.id })
    }

    fun cardCount(): Int = albumCards.size

    /** (nivel, título del apartado, etiqueta de la ficha). */
    val relicTiers = listOf(
        Triple("common", "Comunes", "Común"), Triple("uncommon", "Poco comunes", "Poco común"), Triple("rare", "Raros", "Raro"), Triple("boss", "De jefe", "De jefe")
    )
    val seedTiers = listOf("common" to "Comunes", "uncommon" to "Poco comunes", "rare" to "Raras")

    fun relicsOf(tier: String): List<RelicDef> = Relics.db.values.filter { it.tier == tier }.sortedWith { a, b -> collator.compare(a.name, b.name) }

    fun seedsOf(tier: String): List<SeedDef> = Seeds.db.values.filter { it.rarity == tier }.sortedWith { a, b -> collator.compare(a.name, b.name) }

    /** El guiño de un objeto a otro juego: cuáles y por qué (null si no tiene). */
    fun refOf(r: RelicDef): RefInfo? = if (r.ref == null) null else GEN_RELIC_REFS[r.id]
}
