package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.AddCard
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.Move
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.core.data.gen.GAME_VERSION
import com.yokyznt.fruitspire.core.data.gen.GEN_PATCH_NOTES
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Pruebas de la Colección: bestiario, álbum de cartas, objetos y semillas encontrados, guiños y notas (js/bestiary.js, collection.js, notes.js). */
class AlbumTest {
    // ------------------------------------------------------------------ catálogo del bestiario
    @Test
    fun everyEnemyHasAPlaceAndATier() {
        val cat = Bestiary.catalog
        Enemies.db.keys.forEach { id ->
            assertTrue(cat.where[id]?.isNotEmpty() == true, "$id no dice dónde sale")
            assertTrue(cat.tierOf[id] in Bestiary.TIER.keys, "$id sin nivel")
        }
        assertEquals(3, cat.castles.size)
        cat.castles.forEach { c ->
            assertTrue(c.themes.isNotEmpty())
            c.bosses.forEach { assertEquals("boss", cat.tierOf[it], it) }
            c.themes.forEach { t -> t.guards.forEach { assertEquals("guard", cat.tierOf[it], it) }; t.elites.forEach { assertEquals("elite", cat.tierOf[it], it) } }
        }
        assertTrue(cat.summoned.isNotEmpty())
        // dentro de un mismo piso no se repite un enemigo (en otro piso del castillo sí puede volver a salir)
        cat.castles.forEach { c ->
            c.themes.forEach { t ->
                val ids = t.normal + t.elites + t.guards
                assertEquals(ids.size, ids.toSet().size, "ids repetidos en ${t.theme.name}")
            }
        }
    }

    @Test
    fun movesAreDescribedInWords() {
        val poison = Statuses.get("poison")!!.name
        val d = Bestiary.describeMove(Move("a", "A", damage = 9))
        assertEquals("Ataca por 9.", d.text)
        assertTrue(d.statuses.isEmpty())
        val multi = Bestiary.describeMove(Move("b", "B", damage = 4, hits = 3, apply = linkedMapOf("poison" to 2)))
        assertEquals("Ataca por 4 ×3, te aplica 2 de $poison.", multi.text)
        assertEquals(listOf("poison" to 2), multi.statuses)
        assertEquals("Se pone 6 de cáscara, se cura 4 ❤️. (solo una vez)", Bestiary.describeMove(Move("c", "C", block = 6, heal = 4, once = true)).text)
        assertEquals("Te roba 5 de oro (lo recuperas si lo derrotas).", Bestiary.describeMove(Move("d", "D", stealGold = 5)).text)
        assertEquals("Te roba 2 cartas de tu pila de robo (las recuperas si lo derrotas).", Bestiary.describeMove(Move("e", "E", stealCard = 2)).text)
        assertEquals("Invoca: ${Enemies.get("mosca_podrida")!!.name}.", Bestiary.describeMove(Move("f", "F", summon = listOf("mosca_podrida"))).text)
        assertTrue(Bestiary.describeMove(Move("g", "G", addCard = AddCard("gusano_interior", 2, "draw"))).text.contains("en tu pila de robo"))
        assertEquals("Hace algo misterioso….", Bestiary.describeMove(Move("h", "H")).text)
    }

    @Test
    fun everyEnemyMoveHasATextAndTraitsAreListed() {
        Enemies.db.values.forEach { def ->
            def.moves.forEach { m -> assertTrue(Bestiary.describeMove(m).text.endsWith(".") || Bestiary.describeMove(m).text.endsWith(")"), "${def.id}/${m.id}") }
            val tr = Bestiary.traits(def)
            def.start?.keys?.forEach { s -> assertTrue(tr.statuses.any { it.first == s }, "${def.id} rasgo $s") }
            if (def.splitInto != null) assertTrue(tr.list.any { it.contains("se divide") }, def.id)
            if (def.leader) assertTrue(tr.list.any { it.contains("líder") }, def.id)
            if (def.phaseNames != null || def.phaseSprites != null) assertTrue(tr.list.any { it.contains("varias fases") }, def.id)
        }
    }

    // ------------------------------------------------------------------ bestiario guardado
    @Test
    fun theBookFillsInAsYouFightAndSurvivesASave() {
        Rng.seed(7)
        val progress = Progress()
        val run = Run.start("manzana", "madura", progress)
        run.beginFloor()
        assertEquals(0, progress.bestiarySeen())
        val c = run.startCombat(PendingCombat(listOf("mosca_podrida", "avispa_furiosa"), "enemy"))
        assertEquals(setOf("mosca_podrida", "avispa_furiosa"), progress.bestiary.keys)
        assertEquals(0, progress.bestiary.getValue("mosca_podrida"))
        c.enemies[0].hp = 0 // muere la mosca
        run.finishCombat("win")
        assertEquals(1, progress.bestiary.getValue("mosca_podrida"))
        assertEquals(0, progress.bestiary.getValue("avispa_furiosa"))
        assertEquals(2, progress.bestiarySeen())
        val back = Save.decodeProgress(Save.encodeProgress(progress))
        assertEquals(1, back.bestiary.getValue("mosca_podrida"))
        assertEquals(setOf("mosca_podrida", "avispa_furiosa"), back.bestiary.keys)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ objetos y semillas encontrados
    @Test
    fun whatYouCarryCountsAsFoundForever() {
        Rng.seed(8)
        val progress = Progress()
        val run = Run.start("kiwi", "madura", progress)
        val relic = Relics.db.values.first { it.tier == "common" }
        run.player.relics.add(relic.id)
        run.player.seeds[0] = Seeds.db.values.first().id
        assertFalse(relic.id in progress.foundRelics)
        run.syncFound()
        assertTrue(relic.id in progress.foundRelics)
        assertTrue(Seeds.db.values.first().id in progress.foundSeeds)
        run.player.relics.clear(); run.player.seeds[0] = null
        run.syncFound()
        assertTrue(relic.id in progress.foundRelics, "se queda anotado aunque ya no lo tengas")
        val back = Save.decodeProgress(Save.encodeProgress(progress))
        assertEquals(progress.foundRelics, back.foundRelics)
        assertEquals(progress.foundSeeds, back.foundSeeds)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ álbum de cartas, objetos y guiños
    @Test
    fun cardAlbumGroupsEveryCardOnce() {
        val groups = Album.cardGroups()
        assertEquals(6, groups.size, "una por fruta, neutrales y maldiciones")
        assertEquals("Neutrales", groups[4].title)
        assertEquals("Maldiciones y estados", groups[5].title)
        val all = groups.flatMap { it.cards }
        assertEquals(all.size, all.toSet().size, "una carta no sale en dos grupos")
        assertEquals(Cards.all().count { it.rarity != "token" }, all.size)
        all.forEach { assertNotNull(Cards.get(it)) }
        assertEquals(Album.cardCount(), all.size)
    }

    @Test
    fun relicsAndSeedsAreListedByTierAndName() {
        val tiers = Album.relicTiers.map { it.first }
        assertEquals(listOf("common", "uncommon", "rare", "boss"), tiers)
        val total = tiers.sumOf { Album.relicsOf(it).size }
        assertEquals(Relics.db.size, total)
        val names = Album.relicsOf("rare").map { it.name }
        assertTrue(names.isNotEmpty())
        assertEquals(names, names.sortedWith(java.text.Collator.getInstance(java.util.Locale("es"))), "los objetos salen por orden alfabético")
        assertEquals(Seeds.db.size, Album.seedTiers.sumOf { Album.seedsOf(it.first).size })
    }

    @Test
    fun relicHintsCoverEveryRelicThatHasOne() {
        var n = 0
        Relics.db.values.filter { it.ref != null }.forEach { r ->
            val info = Album.refOf(r)
            assertNotNull(info, "${r.id} tiene guiño pero no su explicación")
            assertTrue(info.games.isNotEmpty() && info.text.isNotBlank())
            info.games.forEach { g -> assertTrue(r.ref!!.contains(g), "${r.id}: «${r.ref}» no nombra a $g") }
            n++
        }
        assertEquals(27, n)
        assertNull(Album.refOf(Relics.db.values.first { it.ref == null }))
        assertEquals(setOf("The Binding of Isaac", "Cuphead"), Album.refOf(Relics.get("azufre_infernal")!!)!!.games.toSet())
    }

    // ------------------------------------------------------------------ notas de la versión
    @Test
    fun patchNotesAreNewUntilYouOpenThem() {
        assertEquals(13, GEN_PATCH_NOTES.size)
        assertEquals(GAME_VERSION, GEN_PATCH_NOTES.first().version, "la más nueva va primero")
        GEN_PATCH_NOTES.forEach { assertTrue(it.title.isNotBlank() && it.items.isNotEmpty(), it.version) }
        val p = Progress()
        assertTrue(p.notesAreNew())
        p.openNotes()
        assertFalse(p.notesAreNew())
        val back = Save.decodeProgress(Save.encodeProgress(p))
        assertFalse(back.notesAreNew())
        assertTrue(Save.decodeProgress("{}").notesAreNew())
    }
}
