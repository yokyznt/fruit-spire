package com.yokyznt.fruitspire.core

// ============================================================
// Efectos de las mascotitas (los ganchos `onCombatStart`, `onFirstTurn` y `onWin` de js/data/cosmetics.js). Cada fruta tiene tres,
// que se ganan con retos (ver Progress.checkPetUnlocks). Los textos de lo que hacen vienen en CosmeticDef.bonus.
// ============================================================
object Pets {
    private fun start(fn: (Ctx) -> Unit) = object : PetHooks { override fun onCombatStart(ctx: Ctx) = fn(ctx) }
    private fun first(fn: (Ctx) -> Unit) = object : PetHooks { override fun onFirstTurn(ctx: Ctx) = fn(ctx) }

    private val hooks: Map<String, PetHooks> = mapOf(
        // Manzana
        "pet_cereza" to first { it.combat.gainBlock(it.player, 3, false) },
        "pet_grosella" to start { it.combat.applyStatus(it.player, "strength", 1) },
        // Platanín
        "pet_kumquat" to start { it.combat.applyStatus(it.player, "dexterity", 1) },
        "pet_mora" to first { it.draw(1) },
        "pet_maracuya" to first { it.gainEnergy(1) },
        // Kiwi
        "pet_arandano" to start { ctx ->
            val alive = ctx.combat.aliveEnemies()
            if (alive.isNotEmpty()) ctx.combat.applyStatus(alive[Rng.int(alive.size)], "poison", 2)
        },
        "pet_lichi" to start { it.combat.applyStatus(it.player, "thorns", 2) },
        // Uva
        "pet_uvita" to first { it.combat.plant("pasita") },
        "pet_aceituna" to first { it.combat.gainBlock(it.player, 4, false) }
    )

    /** Lo que hace la mascotita [petId] al empezar el combate y en el primer turno (null si no hace nada ahí). */
    fun hooks(petId: String?): PetHooks? = if (petId == null) null else hooks[petId]

    /** Lo que hace al ganar un combate: puede curar y devuelve el oro extra que da. */
    fun onWin(petId: String?, p: Player): Int = when (petId) {
        "pet_fresa", "pet_endrina" -> { p.heal(3); 0 }
        "pet_frambuesa" -> 6
        else -> 0
    }
}
