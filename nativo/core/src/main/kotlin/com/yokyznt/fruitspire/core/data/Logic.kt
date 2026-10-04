package com.yokyznt.fruitspire.core.data

import com.yokyznt.fruitspire.core.Combat
import com.yokyznt.fruitspire.core.Ctx
import com.yokyznt.fruitspire.core.EnemyInstance
import com.yokyznt.fruitspire.core.Entity
import com.yokyznt.fruitspire.core.Player
import com.yokyznt.fruitspire.core.Rng
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

// ============================================================
// Funciones del juego portadas a mano de js/data/*.js: efectos de cartas, ganchos de objetos, usos de
// semillas, cosecha de brotes, reglas de piso y habilidades de personaje. Los datos (nombres, costos,
// textos) salen de data/gen/*.kt, generados por tools/export-core-data.js.
// ============================================================

internal fun MutableMap<String, Any?>.int(k: String): Int = (this[k] as? Int) ?: 0
internal fun MutableMap<String, Any?>.flag(k: String): Boolean = this[k] == true

// ---------- habilidades de los personajes ----------
object CharacterHooks {
    fun onCombatStart(characterId: String, combat: Combat) { if (characterId == "uva") combat.plant("agria") }
    /** Platanín: sus cartas de cáscara dan 2 extra. */
    fun onGainBlock(player: Player, amount: Int): Int = if (player.characterId == "platanin") amount + 2 else amount
    /** Kiwi: si un enemigo le quita vida, ese enemigo recibe 2 de daño. */
    fun onPlayerDamaged(player: Player, enemy: Entity, hpLoss: Int) { if (player.characterId == "kiwi") enemy.takeDamage(2) }
    /** Manzana: al ganar un combate, recupera 6 ❤️. */
    fun onCombatEnd(player: Player) { if (player.characterId == "manzana") player.heal(6) }
}

// ---------- efectos de cartas ----------
object CardEffects {
    fun of(id: String): CardEffect? = map[id]

    val map: Map<String, CardEffect> = hashMapOf(
        // --- ataques ---
        "golpe_cascara" to { c, u -> c.attack(u(6, 9)); Unit },
        "golpe_doble" to { c, u -> c.attack(u(4, 5)); c.attack(u(4, 5)); Unit },
        "tajo_citrico" to { c, u ->
            val bruised = c.enemy.getStatus("vulnerable") > 0
            c.attack(u(9, 12))
            if (bruised) c.draw(1)
        },
        "ametralladora_semillas" to { c, u -> for (i in 0 until u(4, 5)) c.attackRandom(u(4, 5)) },
        "explosion_acida" to { c, u -> c.attack(u(14, 18)); c.apply(c.enemy, "vulnerable", u(2, 3)) },
        "golpe_final" to { c, u -> c.attack(u(22, 30)); Unit },
        "lluvia_uvas" to { c, u -> c.attackAll(u(5, 8)) },
        "estocada_pina" to { c, u -> c.attack(u(7, 9)); c.buff("thorns", u(2, 3)) },
        "chorro_limon" to { c, u -> c.attack(u(3, 5)); c.apply(c.enemy, "weak", 1) },
        "rodaja_sandia" to { c, u -> c.attackAll(u(9, 12)) },
        "mordisco_voraz" to { c, u -> val r = c.attack(u(10, 13)); if (r.killed) c.gainMaxHp(u(3, 4)) },
        "cocazo" to { c, u -> c.attack(c.player.block + u(0, 4)); Unit },
        "fruta_pasada" to { c, u -> c.attack(u(5, 7)); c.apply(c.enemy, "poison", u(3, 4)) },
        "racimo_furioso" to { c, u -> for (i in 0..c.cardsPlayed) c.attack(u(3, 4)) },
        "paleta_helada" to { c, _ -> c.attack(8); c.apply(c.enemy, "frozen", 1) },
        "semilla" to { c, _ -> c.attack(3); Unit },
        // --- habilidades ---
        "jugo_defensivo" to { c, u -> c.block(u(5, 8)) },
        "escudo_pulpa" to { c, u -> c.block(u(7, 10)); c.draw(1) },
        "bloqueo_total" to { c, u -> c.block(u(15, 20)) },
        "cascara_venenosa" to { c, u -> c.apply(c.enemy, "poison", u(5, 7)) },
        "maldicion_debilidad" to { c, u -> c.apply(c.enemy, "weak", u(2, 3)); c.apply(c.enemy, "vulnerable", u(1, 2)) },
        "mermelada_curativa" to { c, u -> c.heal(u(8, 12)); Unit },
        "frenesi_frutal" to { c, u -> c.draw(u(2, 3)); c.gainEnergy(1) },
        "hueso_aguacate" to { c, u -> c.block(u(5, 7)); c.buff("dexterity", 1) },
        "batido_energetico" to { c, u -> c.gainEnergy(u(1, 2)) },
        "exprimir" to { c, u -> c.draw(u(2, 3)) },
        "compostar" to { c, u -> c.exhaustRandom(1); c.block(u(9, 13)) },
        "nube_polen" to { c, u -> c.applyAll("weak", u(1, 2)); c.applyAll("vulnerable", 1) },
        "rayito_sol" to { c, u -> c.buff("regen", u(4, 6)) },
        "corteza_coco" to { c, u -> c.buff("plated", u(4, 6)) },
        "siembra" to { c, u -> c.addToHand("semilla", u(2, 3)) },
        "catalizador_moho" to { c, u ->
            val p = c.enemy.getStatus("poison")
            if (p > 0) c.apply(c.enemy, "poison", p * (u(2, 3) - 1))
        },
        "ensalada_escudo" to { c, u -> c.block(u(8, 11)) },
        // --- poderes ---
        "fermentacion" to { c, u -> c.buff("strength", u(2, 3)) },
        "semillero" to { c, u -> c.buff("seeds", u(1, 2)) },
        "sol_verano" to { c, _ -> c.buff("ritual", 1) },
        "coraza_pitahaya" to { c, u -> c.buff("thorns", u(3, 5)) },
        "podredumbre_noble" to { c, u -> c.buff("noble_rot", u(1, 2)) },
        // --- Manzana ---
        "manzanazo" to { c, u -> c.attack(u(8, 10)); c.apply(c.enemy, "vulnerable", u(2, 3)) },
        "cascara_rota" to { c, u ->
            val b = c.enemy.getStatus("vulnerable") > 0
            c.attack(u(8, 11))
            if (b) c.buff("strength", 1)
        },
        "golpe_maduro" to { c, u -> c.attack(u(12, 14) + c.player.getStatus("strength") * (u(3, 5) - 1)); Unit },
        "sacrificio_pulpa" to { c, u -> c.loseHp(3); c.gainEnergy(u(2, 3)) },
        "tormenta_manzanas" to { c, u -> c.attackAll(u(5, 7)); c.attackAll(u(5, 7)) },
        "sidra_rabiosa" to { c, u -> c.buff("strength", u(2, 4)); c.buff("flex", u(2, 4)) },
        "fuego_interno" to { c, u -> c.buff("inner_fire", u(2, 3)) },
        // --- Platanín ---
        "cascara_resbalosa" to { c, u -> c.block(u(6, 8)); c.apply(c.enemy, "weak", u(1, 2)) },
        "doble_cascara" to { c, _ -> c.gainBlockOn(c.player, c.player.block, false) },
        "racimo_firme" to { c, _ -> c.buff("barricade", 1) },
        "aplaston_dorado" to { c, u ->
            val r = c.attack(u(10, 14))
            if (r.hpLoss != 0) c.gainBlockOn(c.player, r.hpLoss, false)
        },
        "boomerang_platano" to { c, u -> c.attackAll(u(6, 8)); c.block(u(4, 6)) },
        "licuado_proteico" to { c, u ->
            val had = c.player.block > 0
            c.block(u(6, 8))
            if (had) c.draw(1)
        },
        // --- Kiwi ---
        "pelitos_toxicos" to { c, u -> c.apply(c.enemy, "poison", u(3, 5)); c.buff("thorns", 1) },
        "nube_esporas" to { c, _ -> c.applyAll("poison", 4) },
        "rodaja_kiwi" to { c, u -> c.attack(u(4, 6)); c.draw(1) },
        "pelusa_defensiva" to { c, u -> c.block(u(4, 6)); c.buff("thorns", u(2, 3)) },
        // --- Uva ---
        "siembra_agria" to { c, _ -> c.plant("agria") },
        "siembra_dulce" to { c, u -> c.block(u(3, 6)); c.plant("dulce") },
        "regar" to { c, u -> c.grow(1); c.draw(u(1, 2)) },
        "vendimia" to { c, u -> val n = 1 + c.gardenSize(); for (i in 0 until n) c.attack(u(5, 7)) },
        "pasas_al_sol" to { c, u -> c.block(u(3, 6)); c.plant("pasita") },
        "racimo_pisado" to { c, u -> c.attack(u(8, 11)); if (c.gardenSize() >= GARDEN_SIZE) c.gainEnergy(1) },
        "cosecha_temprana" to { c, _ -> c.harvestAll() },
        "plantar_parra" to { c, u -> c.plant("parra"); if (u(0, 1) != 0) c.draw(1) },
        "pisada_uvas" to { c, u -> c.attackAll(u(6, 8)); c.attackAll(u(6, 8)); c.grow(1) },
        "tierra_fertil" to { c, u -> c.buff("fertile", u(3, 5)) },
        "parra_trepadora" to { c, _ -> c.buff("vine", 1) },
        "tinto_reserva" to { c, _ -> c.plant("tinto") }
        // maldiciones y estados no tienen efecto: son injugables
    )
}

// ---------- ganchos de objetos ----------
object RelicHookTable {
    private fun grow(p: Player, n: Int) { p.maxHp += n; p.hp += n }
    private fun shrink(p: Player, n: Int) { p.maxHp = max(10, p.maxHp - n); p.hp = min(p.hp, p.maxHp) }

    val map: Map<String, RelicHooks> = hashMapOf(
        "corazon_sandia" to RelicHooks(onPickup = { grow(it, 8) }),
        "diente_ajo" to RelicHooks(onCombatStart = { c -> c.combat.gainBlock(c.player, 4, false); c.flash() }),
        "cascara_platano" to RelicHooks(onCombatStart = { c -> c.applyAll("weak", 1); c.flash() }),
        "miel_curativa" to RelicHooks(onCombatEnd = { it.heal(3) }),
        "tijeras_poda" to RelicHooks(onCombatStart = { c -> c.applyAll("vulnerable", 1); c.flash() }),
        "corona_pina" to RelicHooks(onCombatStart = { c -> c.buff("thorns", 2); c.flash() }),
        "saco_abono" to RelicHooks(onTurnStart = { c -> if (c.combat.turnNumber == 1) { c.addToHand("semilla", 2); c.flash() } }),
        "regadera" to RelicHooks(onRest = { 8 }),
        "hueso_durazno" to RelicHooks(
            onTurnStart = { c -> c.state["attacks"] = 0 },
            onCardPlayed = { c, card ->
                if (card.type == "attack") {
                    val n = c.state.int("attacks") + 1
                    c.state["attacks"] = n
                    if (n % 3 == 0) { c.gainEnergy(1); c.flash() }
                }
            }
        ),
        "compostera" to RelicHooks(onExhaust = { c -> c.combat.gainBlock(c.player, 2, false); c.flash() }),
        "limon_contagioso" to RelicHooks(onEnemyDeath = { c, enemy ->
            val p = enemy.getStatus("poison")
            val others = c.combat.aliveEnemies()
            if (p != 0 && others.isNotEmpty()) {
                c.apply(others[Rng.int(others.size)], "poison", p)
                c.flash()
            }
        }),
        "hueso_mango" to RelicHooks(onTurnEnd = { c -> if (c.player.block == 0) { c.combat.gainBlock(c.player, 4, false); c.flash() } }),
        "caparazon_caracol" to RelicHooks(onCombatStart = { c -> c.buff("plated", 3); c.flash() }),
        "nuez_dura" to RelicHooks(),
        "canasta_tejida" to RelicHooks(),
        "brote_eterno" to RelicHooks(onHpLoss = { c ->
            if (!c.state.flag("done") && c.player.hp <= c.player.maxHp / 2.0 && c.player.hp > 0) {
                c.state["done"] = true
                c.buff("strength", 2)
                c.combat.gainBlock(c.player, 8, false)
                c.flash()
            }
        }),
        "chile_picante" to RelicHooks(onCardPlayed = { c, _ ->
            val n = c.persist.int("n") + 1
            c.persist["n"] = n
            if (n >= 10) {
                c.persist["n"] = 0
                c.flash()
                // daño fijo: no lo cambian Madurez ni Magulladura
                c.combat.aliveEnemies().forEach { e ->
                    e.takeDamage(10)
                    c.combat.pushEvent("damage", e, 10, mapOf("thorns" to true))
                    if (!e.isAlive()) c.combat.onEnemyDeath(e)
                }
            }
        }),
        "frasco_almibar" to RelicHooks(),
        // --- de jefe ---
        "semilla_dorada" to RelicHooks(onCombatStart = { c -> c.applyAll("strength", 1) }, onTurnStart = { c -> c.gainEnergy(1) }),
        "reloj_frutal" to RelicHooks(onPickup = { shrink(it, 8) }),
        "exprimidor_dorado" to RelicHooks(onPickup = { it.maxEnergy += 1 }),
        "ojo_papaya" to RelicHooks(onPickup = { it.maxEnergy += 1 }, onCombatStart = { c -> c.buff("weak", 2) }),
        "corazon_durian" to RelicHooks(onPickup = { grow(it, 25) }),
        "savia_arce" to RelicHooks(
            onPickup = { shrink(it, 6) },
            onTurnEnd = { c -> c.state["carry"] = c.player.energy },
            onTurnStart = { c ->
                val carry = c.state.int("carry")
                if (carry != 0) { c.gainEnergy(carry); c.state["carry"] = 0; c.flash() }
            }
        ),
        // --- guiños a juegos indie (relics_indie.js) ---
        "fichas_casino" to RelicHooks(onCombatEnd = { it.gold += 6 }),
        "estrella_guardado" to RelicHooks(onRest = { 6 }),
        "penique_suerte" to RelicHooks(onCombatEnd = { if (Rng.next() < 0.3) it.gold += 20 }),
        "nectar_olimpo" to RelicHooks(onCombatStart = { c -> c.heal(2); c.flash() }),
        "cuchillo_juguete" to RelicHooks(onCombatStart = { c -> c.buff("strength", 1); c.flash() }),
        "cana_pescar" to RelicHooks(onTurnStart = { c -> if (c.combat.turnNumber == 1) { c.draw(1); c.flash() } }),
        "corazon_alma" to RelicHooks(onCombatStart = { c ->
            if (c.player.hp <= c.player.maxHp / 2.0) { c.combat.gainBlock(c.player, 8, false); c.flash() }
        }),
        "pico_diamante" to RelicHooks(onExhaust = { c -> c.player.gold += 1; c.flash() }),
        "comodin_descarado" to RelicHooks(onCombatStart = { c ->
            val n = min(2, c.player.deck.size / 8)
            if (n != 0) { c.buff("strength", n); c.flash() }
        }),
        "alcancia_interes" to RelicHooks(onCombatEnd = { it.gold += min(3, it.gold / 10) }),
        "tarot_luna" to RelicHooks(onCombatStart = { c ->
            val es = c.enemies
            if (es.isNotEmpty()) {
                val e = es[Rng.int(es.size)]
                c.apply(e, "weak", 2)
                c.apply(e, "vulnerable", 1)
                c.flash()
            }
        }),
        "kunai_cascara" to RelicHooks(
            onTurnStart = { c -> c.state["attacks"] = 0 },
            onCardPlayed = { c, card ->
                if (card.type == "attack") {
                    val n = c.state.int("attacks") + 1
                    c.state["attacks"] = n
                    if (n % 3 == 0) { c.buff("dexterity", 1); c.flash() }
                }
            }
        ),
        "abanico_ornamental" to RelicHooks(
            onTurnStart = { c -> c.state["fan"] = 0 },
            onCardPlayed = { c, card ->
                if (card.type == "attack") {
                    val n = c.state.int("fan") + 1
                    c.state["fan"] = n
                    if (n % 3 == 0) { c.combat.gainBlock(c.player, 4, false); c.flash() }
                }
            }
        ),
        "pentagrama" to RelicHooks(
            onHpLoss = { c -> c.state["hurt"] = true },
            onTurnEnd = { c ->
                if (!c.state.flag("hurt") && c.state.int("gained") < 3) {
                    c.buff("strength", 1)
                    c.state["gained"] = c.state.int("gained") + 1
                    c.flash()
                }
                c.state["hurt"] = false
            }
        ),
        "frasco_salud" to RelicHooks(onHpLoss = { c ->
            if (!c.state.flag("used") && c.player.hp > 0 && c.player.hp <= c.player.maxHp / 3.0) {
                c.state["used"] = true
                c.heal(8)
                c.flash()
            }
        }),
        "mascara_extra" to RelicHooks(
            onPickup = { grow(it, 6) },
            onCombatStart = { c -> c.combat.gainBlock(c.player, 3, false); c.flash() }
        ),
        "cristal_vida" to RelicHooks(onPickup = { grow(it, 10) }),
        "aura_ajo" to RelicHooks(onTurnStart = { c -> c.attackAll(2); c.combat.checkEnd(); c.flash() }),
        "vela_determinacion" to RelicHooks(onTurnStart = { c -> if (c.combat.turnNumber == 1) { c.gainEnergy(1); c.flash() } }),
        "fresa_dorada" to RelicHooks(onCardPlayed = { c, _ ->
            if (!c.state.flag("done") && c.combat.turnState.cardsPlayed >= 4) {
                c.state["done"] = true
                c.gainEnergy(1)
                c.flash()
            }
        }),
        "lagrima_sagrada" to RelicHooks(onTurnStart = { c -> c.attackRandom(3); c.combat.checkEnd(); c.flash() }),
        "mano_color" to RelicHooks(
            onTurnStart = { c -> c.state["streak"] = 0; c.state["last"] = null },
            onCardPlayed = { c, card ->
                if (card.type == c.state["last"]) c.state["streak"] = c.state.int("streak") + 1
                else { c.state["last"] = card.type; c.state["streak"] = 1 }
                if (c.state.int("streak") >= 3) { c.draw(1); c.flash(); c.state["streak"] = 0; c.state["last"] = null }
            }
        ),
        "d6_bolsillo" to RelicHooks(onTurnStart = { c ->
            if (c.combat.turnNumber == 2 && !c.state.flag("used")) {
                c.state["used"] = true
                val p = c.player
                p.discardPile.addAll(p.hand)
                p.hand = ArrayList()
                c.draw(5)
                c.flash()
            }
        }),
        "desafio_muerte" to RelicHooks(onHpLoss = { c ->
            if (c.player.hp <= 0 && !c.persist.flag("used")) {
                c.persist["used"] = true
                c.player.hp = 1
                c.combat.gainBlock(c.player, 12, false)
                c.flash()
            }
        }),
        "corazon_sacrificio" to RelicHooks(
            onCombatStart = { c -> val lose = min(5, c.player.hp - 1); if (lose > 0) c.loseHp(lose) },
            onTurnStart = { c -> if (c.combat.turnNumber == 1) { c.gainEnergy(2); c.flash() } }
        ),
        "ojo_cthulhu" to RelicHooks(onPickup = { it.maxEnergy = max(1, it.maxEnergy - 1) }),
        "azufre_infernal" to RelicHooks(onCombatStart = { c -> c.buff("strength", 2); c.applyAll("strength", 1); c.flash() })
    )
}

// ---------- semillas ----------
object SeedUses {
    fun of(id: String): ((Ctx) -> Unit)? = map[id]

    val map: Map<String, (Ctx) -> Unit> = hashMapOf(
        "semilla_chile" to { c -> val r = c.attack(20); if (r.killed) c.gainEnergy(1) },
        "semilla_fresa" to { c -> val r = c.attack(10); if (r.hpLoss > 0) c.heal(r.hpLoss); Unit },
        "semilla_coco" to { c -> c.combat.gainBlock(c.player, c.player.block + 8, false) },
        "semilla_naranja" to { c -> c.gainEnergy(max(0, c.player.maxEnergy - c.player.energy) + 1) },
        "semilla_uva" to { c ->
            val p = c.player
            val n = p.hand.size
            p.discardPile.addAll(p.hand)
            p.hand = ArrayList()
            c.draw(min(10, n + 2))
        },
        "semilla_podrida" to { c -> c.apply(c.enemy, "poison", max(6, c.enemy.getStatus("poison"))) },
        "semilla_suerte" to { c -> c.addToHand("semilla", 3); c.draw(1) },
        "semilla_cactus" to { c -> c.buff("thorns", 6) },
        "semilla_limon" to { c -> c.enemies.forEach { it.block = 0 }; c.applyAll("frail", 2) },
        "semilla_sandia" to { c ->
            c.attackAll(8)
            c.combat.aliveEnemies().forEach { e ->
                if (e.hp > 6) return@forEach
                val left = e.hp
                e.hp = 0
                c.combat.pushEvent("damage", e, left, mapOf("thorns" to true))
                c.combat.onEnemyDeath(e)
            }
        },
        "semilla_helada" to { c -> c.apply(c.enemy, "frozen", 1); c.apply(c.enemy, "vulnerable", 2) },
        "semilla_mango" to { c -> c.buff("strength", 4); c.buff("flex", 4) },
        "semilla_loca" to { c ->
            val s = Rng.pick(listOf("weak", "vulnerable", "frail", "poison"))
            c.applyAll(s, if (s == "poison") 6 else 3)
        },
        "semilla_espejo" to { c ->
            val id = c.combat.lastPlayed
            if (id != null) c.addToHand(id, 1) else c.draw(2)
        },
        "semilla_jardinera" to { c -> c.plant("agria"); c.plant("agria") },
        "semilla_fantasma" to { c -> c.buff("ghost", 1) },
        "semilla_aguacate" to { c -> c.buff("dexterity", 2); c.combat.gainBlock(c.player, 10, false) },
        "semilla_estrella" to { c -> c.gainEnergy(3); c.draw(2) },
        "semilla_tiempo" to { c -> c.applyAll("frozen", 1); c.buff("sticky", 2) },
        "semilla_sacrificio" to { c ->
            val lose = min(6, c.player.hp - 1)
            if (lose > 0) c.loseHp(lose)
            c.gainEnergy(3)
            c.buff("strength", 2)
        }
    )
}

// ---------- brotes del viñedo ----------
object SproutHarvest {
    fun of(id: String): ((Ctx) -> Unit)? = map[id]

    val map: Map<String, (Ctx) -> Unit> = hashMapOf(
        "pasita" to { c -> c.draw(2) },
        "agria" to { c -> c.attackRandom(12); Unit },
        "dulce" to { c -> c.combat.gainBlock(c.player, 10, false) },
        "parra" to { c -> c.gainEnergy(2) },
        "tinto" to { c -> c.attackAll(30) }
    )
}

// ---------- reglas de los pisos ----------
object FloorRuleTable {
    private fun dropHp(c: Ctx, e: EnemyInstance, n: Int) {
        val lost = e.loseHp(n)
        c.combat.pushEvent("damage", e, lost, mapOf("thorns" to true))
        if (!e.isAlive()) c.combat.onEnemyDeath(e)
    }

    @Suppress("UNCHECKED_CAST")
    val map: Map<String, RuleHooks> = hashMapOf(
        "huerto" to RuleHooks(onTurnStart = { c, turn -> if (turn % 3 == 0) { c.gainEnergy(1); c.say("☀️ ¡Sol radiante! +1 de energía") } }),
        "gallinero" to RuleHooks(onTurnStart = { c, _ -> c.addToHand("semilla", 1) }),
        "estanque" to RuleHooks(onCombatStart = { c -> c.buff("weak", 1); c.applyAll("weak", 1) }),
        "invernadero" to RuleHooks(onTurnEnd = { c, _ ->
            c.combat.healEntity(c.player, 2)
            c.combat.aliveEnemies().forEach { c.combat.healEntity(it, 2) }
        }),
        "bodega" to RuleHooks(),
        "dados" to RuleHooks(onTurnStart = { c, _ ->
            val r = 1 + floor(Rng.next() * 6).toInt()
            val p = c.player
            when (r) {
                1 -> { p.energy = max(0, p.energy - 1); c.say("🎲 Sacas 1: pierdes 1 de energía") }
                2 -> c.say("🎲 Sacas 2: no pasa nada")
                3 -> { c.combat.gainBlock(p, 4, false); c.say("🎲 Sacas 3: +4 de cáscara") }
                4 -> { c.draw(1); c.say("🎲 Sacas 4: robas 1 carta") }
                5 -> { c.buff("strength", 2); c.buff("flex", 2); c.say("🎲 Sacas 5: +2 de Madurez este turno") }
                else -> { c.gainEnergy(1); c.say("🎲 ¡Sacas 6! +1 de energía") }
            }
        }),
        "poker" to RuleHooks(
            onTurnStart = { c, _ -> c.state["counts"] = HashMap<String, Int>(); c.state["done"] = false },
            onCardPlayed = { c, card ->
                val counts = (c.state["counts"] as? HashMap<String, Int>) ?: HashMap<String, Int>().also { c.state["counts"] = it }
                val n = (counts[card.type] ?: 0) + 1
                counts[card.type] = n
                if (!c.state.flag("done") && n >= 3) { c.state["done"] = true; c.gainEnergy(1); c.say("🃏 ¡Trío! +1 de energía") }
            }
        ),
        "ajedrez" to RuleHooks(onTurnStart = { c, turn ->
            if (turn % 2 == 1) { c.player.dmgBonus = 2; c.say("♙ Blancas: tus ataques hacen +2") }
            else { c.player.dmgBonus = 0; c.combat.gainBlock(c.player, 4, false); c.say("♟️ Negras: +4 de cáscara") }
        }),
        "mercado" to RuleHooks(onTurnStart = { c, turn ->
            if (turn % 2 == 0 && c.player.gold > 0) {
                val thief = c.combat.aliveEnemies().firstOrNull()
                if (thief != null) {
                    val g = min(6, c.player.gold)
                    c.player.gold -= g
                    thief.stolenGold += g
                    c.say("🧤 Te roban $g de oro")
                }
            }
        }),
        "cocina" to RuleHooks(onTurnEnd = { c, _ ->
            val n = c.player.hand.size / 3
            if (n > 0) { c.loseHp(min(n, c.player.hp - 1)); c.say("🔥 Se queman $n ❤️: juega tus cartas") }
        }),
        "fabrica" to RuleHooks(onTurnStart = { c, turn ->
            if (turn % 3 == 0) {
                c.say("⚡ ¡Descarga eléctrica!")
                val p = c.player
                val lost = p.loseHp(min(5, p.hp - 1))
                if (lost != 0) c.combat.pushEvent("damage", p, lost, mapOf("poison" to true))
                c.combat.aliveEnemies().forEach { dropHp(c, it, 5) }
                c.combat.checkEnd()
            }
        }),
        "torre_rey" to RuleHooks(onCombatStart = { c ->
            c.combat.aliveEnemies().forEach { c.combat.gainBlock(it, 4, false) }
            c.buff("dexterity", 1)
        })
    )
}
