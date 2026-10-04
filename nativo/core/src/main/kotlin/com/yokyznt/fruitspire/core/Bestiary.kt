package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CastleDef
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.EnemyDef
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.FloorTheme
import com.yokyznt.fruitspire.core.data.Move
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.core.data.World

// ============================================================
// Bestiario (js/bestiary.js): todos los enemigos por castillo y piso, y lo que hace cada uno en palabras. Lo que has visto y derrotado
// se guarda en Progress (bestiary); aquí viven el catálogo y los textos.
// ============================================================
object Bestiary {
    val TIER = linkedMapOf("normal" to "Común", "elite" to "Élite", "guard" to "Guardián", "boss" to "Jefe del castillo", "other" to "Invocado")

    /** Los enemigos de un piso (tema): comunes, élites y guardianes. */
    class ThemeGroup(val theme: FloorTheme, val normal: List<String>, val elites: List<String>, val guards: List<String>)

    class CastleGroup(val castle: CastleDef, val themes: List<ThemeGroup>, val bosses: List<String>)

    /**
     * [where]: dónde sale cada enemigo (nombres de pisos, castillos o quién lo invoca); [tierOf]: su nivel (clave de [TIER]);
     * [summoned]: los que invoca otro enemigo, se divide o cría; [others]: los que no salen en ningún piso ni los invoca nadie.
     */
    class Catalog(
        val castles: List<CastleGroup>, val summoned: List<String>, val others: List<String>,
        val where: Map<String, List<String>>, val tierOf: Map<String, String>
    )

    private fun uniq(list: List<String>): List<String> = list.filterIndexed { i, x -> x.isNotEmpty() && list.indexOf(x) == i && Enemies.db.containsKey(x) }

    val catalog: Catalog by lazy {
        val where = LinkedHashMap<String, MutableList<String>>()
        fun note(id: String, place: String) { val l = where.getOrPut(id) { ArrayList() }; if (place !in l) l.add(place) }
        val castles = World.castles.map { c ->
            val themes = World.themes.values.filter { it.castle == c.n }.map { t ->
                val elites = uniq(t.elites.flatten())
                val guards = uniq(t.bosses)
                val normal = uniq(t.weak.flatten() + t.normal.flatten()).filter { it !in elites && it !in guards }
                (normal + elites + guards).forEach { note(it, t.name) }
                ThemeGroup(t, normal, elites, guards)
            }
            val bosses = uniq(c.bosses)
            bosses.forEach { note(it, c.name) }
            CastleGroup(c, themes, bosses)
        }
        // los invocados: cualquiera que otro enemigo llame, cree al dividirse o críe
        val by = LinkedHashMap<String, MutableList<String>>()
        fun call(id: String, who: String) { if (Enemies.db.containsKey(id)) { val l = by.getOrPut(id) { ArrayList() }; if (who !in l) l.add(who) } }
        Enemies.db.values.forEach { def ->
            def.moves.forEach { m -> m.summon?.forEach { call(it, def.id) } }
            def.splitInto?.let { call(it, def.id) }
            val breeds = (def.start?.get("breed") ?: 0) != 0
            if (def.breedInto != null || breeds) call(def.breedInto ?: def.id, def.id)
        }
        val listed = where.keys.toSet()
        val summoned = by.keys.toList()
        summoned.forEach { id -> note(id, "Invocado por ${by.getValue(id).joinToString(", ") { Enemies.db.getValue(it).name }}") }
        val others = Enemies.db.keys.filter { it !in listed && !by.containsKey(it) }
        others.forEach { note(it, "Encuentros especiales") }
        val tierOf = HashMap<String, String>()
        castles.forEach { c ->
            c.themes.forEach { t ->
                t.normal.forEach { tierOf.putIfAbsent(it, "normal") }
                t.elites.forEach { tierOf[it] = "elite" }
                t.guards.forEach { tierOf[it] = "guard" }
            }
            c.bosses.forEach { tierOf[it] = "boss" }
        }
        summoned.forEach { tierOf.putIfAbsent(it, "other") }
        others.forEach { tierOf[it] = "other" }
        Catalog(castles, summoned, others, where, tierOf)
    }

    /** Una jugada en palabras, con los estados que nombra (para explicarlos al tocar). */
    class MoveText(val text: String, val statuses: List<Pair<String, Int>>)

    private fun sName(id: String) = Statuses.get(id)?.name ?: id
    private fun enemyName(id: String) = Enemies.get(id)?.name ?: id

    fun describeMove(m: Move): MoveText {
        val parts = ArrayList<String>()
        val statuses = ArrayList<Pair<String, Int>>()
        if (m.damage != 0) parts.add("Ataca por ${m.damage}${if (m.hits > 1) " ×${m.hits}" else ""}")
        if (m.drain) parts.add("se cura con el daño que hace")
        if (m.block != 0) parts.add("se pone ${m.block} de cáscara")
        if (m.allyBlock != 0) parts.add("da ${m.allyBlock} de cáscara a sus aliados")
        m.apply?.forEach { (id, n) -> statuses.add(id to n); parts.add("te aplica $n de ${sName(id)}") }
        m.self?.forEach { (id, n) -> statuses.add(id to n); parts.add("gana $n de ${sName(id)}") }
        m.allies?.forEach { (id, n) -> statuses.add(id to n); parts.add("todos los enemigos ganan $n de ${sName(id)}") }
        if (m.heal != 0) parts.add("se cura ${m.heal} ❤️")
        if (m.healAll != 0) parts.add("cura ${m.healAll} ❤️ a todos")
        if (m.stealGold != 0) parts.add("te roba ${m.stealGold} de oro (lo recuperas si lo derrotas)")
        if (m.stealCard != 0) parts.add("te roba ${m.stealCard} carta${if (m.stealCard > 1) "s" else ""} de tu pila de robo (las recuperas si lo derrotas)")
        if (m.special != null) parts.add("algo al azar: ¡nunca se sabe qué saldrá!")
        m.addCard?.let { a ->
            val card = Cards.get(a.id)
            val to = when (a.to) { "hand" -> "tu mano"; "draw" -> "tu pila de robo"; else -> "tu descarte" }
            parts.add("mete ${a.n} ${card?.name ?: a.id} en $to")
        }
        m.summon?.let { parts.add("invoca: ${it.joinToString(", ") { id -> enemyName(id) }}") }
        var text = parts.joinToString(", ").ifEmpty { "Hace algo misterioso…" }
        text = text.replaceFirstChar { it.uppercase() } + "."
        if (m.once) text += " (solo una vez)"
        return MoveText(text, statuses)
    }

    /** Los rasgos de un enemigo (lo que tiene o hace aparte de sus jugadas). */
    class Traits(val list: List<String>, val statuses: List<Pair<String, Int>>)

    fun traits(def: EnemyDef): Traits {
        val list = ArrayList<String>()
        val statuses = ArrayList<Pair<String, Int>>()
        def.start?.forEach { (id, n) ->
            statuses.add(id to n)
            list.add("Empieza con $n de ${sName(id)}: ${Statuses.get(id)?.help ?: ""}")
        }
        if (def.phaseSprites != null || def.phaseNames != null) list.add("Tiene varias fases: cambia de forma (y de jugadas) al perder vida.")
        def.breedInto?.let { list.add("Se multiplica: pone crías de ${enemyName(it)}.") }
        def.splitInto?.let { list.add("Al bajarle la vida, se divide en dos ${enemyName(it)}.") }
        if (def.explode != null || (def.start?.get("fuse") ?: 0) != 0) list.add("Tiene una mecha: al terminar la cuenta explota y te hace ${def.explode ?: 25} de daño. ¡Derrótalo antes!")
        if (def.leader) list.add("Es el líder: si lo derrotas, sus esbirros huyen.")
        def.clockEvery?.let { list.add("Cada $it cartas que juegas, se enfurece.") }
        return Traits(list, statuses)
    }
}
