package com.yokyznt.fruitspire.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Pruebas del vestidor, el Pase de Batalla y las mascotas (js/data/cosmetics.js + js/battlepass.js). */
class CosmeticsTest {
    // ------------------------------------------------------------------ datos
    @Test
    fun cosmeticDataIsComplete() {
        val all = Cosmetics.all
        assertEquals(51, all.size)
        assertEquals(all.size, all.map { it.id }.toSet().size, "ids repetidos")
        assertEquals(16, all.count { it.type == "skin" })
        assertEquals(12, all.count { it.type == "pet" })
        assertEquals(23, all.count { it.type == "acc" })
        all.filter { it.type == "acc" }.forEach { assertTrue(it.slot in setOf("head", "face", "neck"), it.id) }
        all.filter { it.type == "pet" }.forEach { assertTrue(it.reqBossAct != null || it.reqWin != null, it.id); assertNotNull(it.char); assertNotNull(it.bonus) }
        Cosmetics.FREE.forEach { assertNotNull(Cosmetics.get(it), it) }
        assertEquals("Vence al jefe del Castillo 2 jugando con Manzana.", Cosmetics.petHowText(Cosmetics.get("pet_cereza")!!))
        assertEquals("Gana una partida con Manzana en grado Normal o más difícil.", Cosmetics.petHowText(Cosmetics.get("pet_fresa")!!))
        assertEquals("Gana una partida con Manzana en grado Desafiante.", Cosmetics.petHowText(Cosmetics.get("pet_grosella")!!))
    }

    // ------------------------------------------------------------------ pase de batalla
    @Test
    fun passRewardsFollowTheWebOrder() {
        val rewards = Pass.rewards
        val pool = Cosmetics.all.filter { it.type != "pet" && it.id !in Cosmetics.FREE }
        assertEquals(pool.size, rewards.size)
        assertEquals(rewards.indices.map { it + 1 }, rewards.map { it.level })
        assertEquals(pool.map { it.id }.toSet(), rewards.map { it.id }.toSet(), "cada premio sale una vez")
        // el pase empieza con un accesorio de todos y luego un color
        assertEquals("acc", Cosmetics.get(rewards[0].id)!!.type)
        assertNull(Cosmetics.get(rewards[0].id)!!.char)
        assertEquals("skin", Cosmetics.get(rewards[1].id)!!.type)
        // los exclusivos de cada fruta no salen en el primer tercio
        val firstExclusive = rewards.indexOfFirst { Cosmetics.get(it.id)!!.let { c -> c.type == "acc" && c.char != null } }
        assertTrue(firstExclusive >= pool.size / 3, "el primer exclusivo sale en el nivel ${firstExclusive + 1}")
    }

    @Test
    fun xpForLevelsAndStateMatchTheWeb() {
        assertEquals(72, Pass.xpForLevel(1))
        assertEquals(84, Pass.xpForLevel(2))
        val p = Progress()
        assertEquals(0, Pass.state(p).level)
        assertEquals(72, Pass.state(p).need)
        Pass.addXp(p, 71)
        assertEquals(0, Pass.state(p).level)
        assertEquals(71, Pass.state(p).into)
        val g = Pass.addXp(p, 1)
        assertEquals(1, g.levels)
        assertEquals(1, g.level)
        assertEquals(72, p.passXp)
        val st = Pass.state(p)
        assertEquals(0, st.into)
        assertEquals(84, st.need)
        assertEquals(0, st.pct)
        Pass.addXp(p, 42)
        assertEquals(50, Pass.state(p).pct)
        // los negativos no restan
        val before = p.passXp
        Pass.addXp(p, -50)
        assertEquals(before, p.passXp)
        // el pase termina
        Pass.addXp(p, 100000)
        val full = Pass.state(p)
        assertEquals(full.max, full.level)
        assertEquals(100, full.pct)
        assertEquals(0, Pass.addXp(p, 5).levels)
    }

    @Test
    fun claimingGrantsTheCosmeticOnceAndOnlyWhenReached() {
        val p = Progress()
        val first = Pass.rewards[0].id
        assertFalse(Pass.canClaim(p, 1), "todavía no tienes el nivel 1")
        assertNull(Pass.claim(p, 1))
        assertFalse(p.isOwned(first))
        Pass.addXp(p, 72 + 84 + 96)
        assertEquals(3, Pass.state(p).level)
        assertEquals(3, Pass.unclaimed(p))
        assertEquals(first, Pass.claim(p, 1)!!.id)
        assertTrue(p.isOwned(first))
        assertNull(Pass.claim(p, 1), "no se reclama dos veces")
        assertNull(Pass.claim(p, 4), "el nivel 4 aún está bloqueado")
        assertEquals(2, Pass.unclaimed(p))
        val got = Pass.claimAll(p)
        assertEquals(2, got.size)
        assertEquals(0, Pass.unclaimed(p))
        assertTrue(Pass.claimAll(p).isEmpty())
    }

    // ------------------------------------------------------------------ vestidor
    @Test
    fun youStartWithTheFreeThings() {
        val p = Progress()
        Cosmetics.FREE.forEach { assertTrue(p.isOwned(it)) }
        assertEquals(Cosmetics.FREE.size, p.owned.size)
        val eq = p.equippedFor("manzana")
        assertNull(eq.skin); assertNull(eq.head); assertNull(eq.face); assertNull(eq.neck); assertNull(eq.pet)
    }

    @Test
    fun equippingFollowsTheWebRules() {
        val p = Progress()
        assertFalse(p.equip("manzana", "corona"), "no la tienes")
        assertTrue(p.equip("manzana", "gorra"))
        assertEquals("gorra", p.equippedFor("manzana").head)
        assertTrue(p.equip("manzana", "gorra"), "el accesorio igual al puesto se quita")
        assertNull(p.equippedFor("manzana").head)
        p.grantCosmetic("manzana_verde")
        assertTrue(p.equip("manzana", "manzana_verde"))
        assertEquals("manzana_verde", p.equippedFor("manzana").skin)
        assertTrue(p.equip("manzana", "manzana_clasica"), "un color reemplaza al otro")
        assertEquals("manzana_clasica", p.equippedFor("manzana").skin)
        assertTrue(p.equip("manzana", "manzana_clasica"), "ponerse otra vez el mismo color no lo quita")
        assertEquals("manzana_clasica", p.equippedFor("manzana").skin)
        // un accesorio exclusivo solo lo usa su fruta
        p.grantCosmetic("gusanito")
        assertFalse(p.equip("kiwi", "gusanito"))
        assertTrue(p.equip("manzana", "gusanito"))
        // cada fruta lleva lo suyo
        p.equip("kiwi", "gorra")
        assertEquals("gusanito", p.equippedFor("manzana").head)
        assertEquals("gorra", p.equippedFor("kiwi").head)
        p.unequipSlot("manzana", "head")
        assertNull(p.equippedFor("manzana").head)
        assertEquals("gorra", p.equippedFor("kiwi").head)
        // un color de otra fruta no se puede poner
        p.grantCosmetic("kiwi_dorado")
        assertFalse(p.equip("manzana", "kiwi_dorado"))
    }

    @Test
    fun dressLayersListNeckFaceHeadThenPet() {
        val p = Progress()
        p.grantCosmetic("bufanda"); p.grantCosmetic("lentes_sol"); p.grantCosmetic("pet_cereza")
        p.equip("manzana", "gorra"); p.equip("manzana", "lentes_sol"); p.equip("manzana", "bufanda"); p.equip("manzana", "pet_cereza")
        assertEquals(
            listOf("acc~manzana~bufanda", "acc~manzana~lentes_sol", "acc~manzana~gorra", "pet~pet_cereza"),
            Cosmetics.layersFor("manzana", p.equippedFor("manzana"))
        )
        assertEquals(emptyList(), Cosmetics.layersFor("kiwi", p.equippedFor("kiwi")))
    }

    // ------------------------------------------------------------------ mascotitas
    @Test
    fun petsAreLockedUntilTheirChallenge() {
        val p = Progress()
        assertFalse(p.equip("manzana", "pet_cereza"))
        assertNull(p.petFor("manzana"))
        assertEquals(listOf("pet_cereza"), p.checkPetUnlocks("manzana", 2, null).map { it.id })
        assertTrue(p.isOwned("pet_cereza"))
        assertFalse(p.isOwned("pet_kumquat"), "el reto de Platanín es de Platanín")
        assertTrue(p.checkPetUnlocks("manzana", 2, null).isEmpty(), "ya la tienes")
        assertEquals(listOf("pet_fresa"), p.checkPetUnlocks("manzana", 3, "madura").map { it.id })
        assertEquals(listOf("pet_grosella"), p.checkPetUnlocks("manzana", 3, "podrida").map { it.id })
        assertEquals(setOf("pet_uvita", "pet_aceituna"), Progress().checkPetUnlocks("uva", 3, "madura").map { it.id }.toSet())
        assertTrue(p.equip("manzana", "pet_cereza"))
        assertEquals("pet_cereza", p.petFor("manzana")!!.id)
        assertNull(p.petFor("kiwi"))
        // una mascotita de otra fruta no se pone
        p.grantCosmetic("pet_lichi")
        assertFalse(p.equip("manzana", "pet_lichi"))
    }

    @Test
    fun hardWinsCoverTheEasierPets() {
        // ganar en Desafiante abre también la mascotita de Normal
        assertEquals(setOf("pet_fresa", "pet_grosella"), Progress().checkPetUnlocks("manzana", 0, "podrida").map { it.id }.toSet())
        assertEquals(setOf("pet_fresa"), Progress().checkPetUnlocks("manzana", 0, "pasada").map { it.id }.toSet())
        assertTrue(Progress().checkPetUnlocks("kiwi", 0, "verde").isEmpty(), "el grado Verde no cuenta")
    }

    private fun startCombat(seed: Int, char: String, petId: String?, enemies: List<String> = listOf("mosca_podrida")): Pair<Run, Combat> {
        Rng.seed(seed)
        val progress = Progress()
        if (petId != null) { progress.grantCosmetic(petId); assertTrue(progress.equip(char, petId)) }
        val run = Run.start(char, "madura", progress)
        run.beginFloor()
        return run to run.startCombat(PendingCombat(enemies, "enemy"))
    }

    @Test
    fun petsHelpInCombat() {
        fun gap(char: String, pet: String, measure: (Combat) -> Int): Int {
            val a = measure(startCombat(21, char, pet).second)
            val b = measure(startCombat(21, char, null).second)
            return a - b
        }
        assertEquals(3, gap("manzana", "pet_cereza") { it.player.block }, "Cerecita: 3 de cáscara")
        assertEquals(4, gap("uva", "pet_aceituna") { it.player.block }, "Aceitunita: 4 de cáscara")
        assertEquals(1, gap("manzana", "pet_grosella") { it.player.getStatus("strength") }, "Grosella: 1 de Madurez")
        assertEquals(1, gap("platanin", "pet_kumquat") { it.player.getStatus("dexterity") }, "Kumquat: 1 de Firmeza")
        assertEquals(2, gap("kiwi", "pet_lichi") { it.player.getStatus("thorns") }, "Lichi: 2 de Pinchos")
        assertEquals(1, gap("platanin", "pet_mora") { it.player.hand.size }, "Morita: una carta extra")
        assertEquals(1, gap("platanin", "pet_maracuya") { it.player.energy }, "Maracuyita: 1 de energía")
        assertEquals(1, gap("uva", "pet_uvita") { it.player.garden.count { s -> s.type == "pasita" } }, "Uvita: planta una Pasita")
        assertEquals(2, gap("kiwi", "pet_arandano") { c -> c.enemies.sumOf { it.getStatus("poison") } }, "Arandanito: 2 de Putrefacción")
        // las que actúan al ganar no cambian el inicio del combate
        assertEquals(0, gap("manzana", "pet_fresa") { it.player.block })
        assertEquals(0, gap("kiwi", "pet_frambuesa") { it.player.hand.size })
        Rng.unseed()
    }

    @Test
    fun petsPayOffWhenYouWin() {
        // Frambuesita: 6 de oro extra en el premio
        val (run, c) = startCombat(31, "kiwi", "pet_frambuesa")
        c.xpGained = 20
        run.finishCombat("win")
        assertEquals(RunScreen.REWARD, run.screen)
        val (run2, c2) = startCombat(31, "kiwi", null)
        c2.xpGained = 20
        run2.finishCombat("win")
        assertEquals(6, run.loot.first { it.k == "gold" }.n - run2.loot.first { it.k == "gold" }.n)
        // Fresita: recuperas 3 ❤️ al ganar (además de lo de la fruta)
        val (run3, c3) = startCombat(32, "manzana", "pet_fresa")
        run3.player.hp = 40
        c3.xpGained = 0
        run3.finishCombat("win")
        val (run4, c4) = startCombat(32, "manzana", null)
        run4.player.hp = 40
        c4.xpGained = 0
        run4.finishCombat("win")
        assertEquals(3, run3.player.hp - run4.player.hp)
        Rng.unseed()
    }

    // ------------------------------------------------------------------ experiencia y retos dentro de la partida
    @Test
    fun combatsGiveXpForThePassWinOrLose() {
        val (run, c) = startCombat(41, "manzana", null)
        c.xpGained = 50
        run.finishCombat("win")
        assertEquals(50, run.lastCombatXp)
        assertEquals(50, run.progress.passXp)
        assertEquals(50, run.passGain!!.xp)
        assertEquals(0, run.passGain!!.levels)
        // perder también suma (cada enemigo derrotado cuenta); y el tope por combate es 160
        val (run2, c2) = startCombat(42, "manzana", null)
        c2.xpGained = 500
        run2.finishCombat("lose")
        assertEquals(RunScreen.GAME_OVER, run2.screen)
        assertEquals(160, run2.progress.passXp)
        assertEquals(2, run2.passGain!!.levels, "160 XP = nivel 2 (72 + 84 = 156)")
        // un combate sin enemigos derrotados no suma ni avisa
        val (run3, c3) = startCombat(43, "manzana", null)
        c3.xpGained = 0
        run3.finishCombat("win")
        assertNull(run3.passGain)
        Rng.unseed()
    }

    @Test
    fun castleBossesUnlockPets() {
        Rng.seed(51)
        val progress = Progress()
        val run = Run.start("kiwi", "madura", progress)
        run.beginFloor()
        run.player.act = 2
        run.player.floor = 3
        run.startCombat(PendingCombat(listOf("cubilete_maldito"), "boss"))
        run.finishCombat("win")
        assertEquals(listOf("pet_arandano"), run.newPets.map { it.id })
        assertTrue(progress.isOwned("pet_arandano"))
        // un jefe guardián (piso 1 o 2) no abre nada
        val run2 = Run.start("kiwi", "madura", Progress())
        run2.beginFloor()
        run2.player.act = 3
        run2.player.floor = 2
        run2.startCombat(PendingCombat(listOf("cubilete_maldito"), "boss"))
        run2.finishCombat("win")
        assertTrue(run2.newPets.isEmpty())
        // el jefe final abre además las de ganar la partida
        val progress3 = Progress()
        val run3 = Run.start("kiwi", "madura", progress3)
        run3.beginFloor()
        run3.player.act = 3
        run3.player.floor = 3
        run3.startCombat(PendingCombat(listOf("cubilete_maldito"), "boss")) // lo que cuenta es el piso (3-3), no quién sea el jefe
        run3.finishCombat("win")
        assertEquals(RunScreen.VICTORY, run3.screen)
        assertEquals(setOf("pet_arandano", "pet_lichi"), run3.newPets.map { it.id }.toSet())
        Rng.unseed()
    }

    @Test
    fun wearingANewPetEquipsIt() {
        val progress = Progress()
        progress.grantCosmetic("pet_cereza")
        progress.grantCosmetic("pet_lichi")
        val run = Run.start("manzana", "madura", progress)
        run.wearPet("pet_cereza")
        assertEquals("pet_cereza", progress.equippedFor("manzana").pet)
        run.wearPet("pet_lichi")
        assertEquals("pet_cereza", progress.equippedFor("manzana").pet, "una mascotita de otra fruta no se lleva")
    }

    @Test
    fun cosmeticsSurviveASaveAndLoad() {
        val p = Progress()
        Pass.addXp(p, 300)
        Pass.claimAll(p)
        p.grantCosmetic("pet_cereza")
        p.equip("manzana", "pet_cereza"); p.equip("manzana", "gorra"); p.equip("kiwi", "kiwi_clasico")
        val back = Save.decodeProgress(Save.encodeProgress(p))
        assertEquals(p.passXp, back.passXp)
        assertEquals(p.passClaimed, back.passClaimed)
        assertEquals(p.owned, back.owned)
        assertEquals("pet_cereza", back.equippedFor("manzana").pet)
        assertEquals("gorra", back.equippedFor("manzana").head)
        assertEquals("kiwi_clasico", back.equippedFor("kiwi").skin)
        // un guardado viejo (solo grados y cartas) se lee sin romperse y con lo gratis puesto
        val old = Save.decodeProgress("{\"unlocked\":{\"manzana\":1},\"discovered\":[\"golpe_cascara\"]}")
        assertEquals(1, old.level("manzana"))
        assertEquals(0, old.passXp)
        Cosmetics.FREE.forEach { assertTrue(old.isOwned(it)) }
        // lo que ya no existe en el juego se descarta
        val odd = Save.decodeProgress("{\"owned\":[\"no_existe\",\"corona\"],\"equipped\":{\"manzana\":{\"head\":\"no_existe\"}},\"passClaimed\":[1]}")
        assertFalse(odd.isOwned("no_existe"))
        assertTrue(odd.isOwned("corona"))
        assertNull(odd.equippedFor("manzana").head)
    }
}
