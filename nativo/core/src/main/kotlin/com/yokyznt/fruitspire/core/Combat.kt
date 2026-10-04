package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CharacterHooks
import com.yokyznt.fruitspire.core.data.Card
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.FloorRule
import com.yokyznt.fruitspire.core.data.GARDEN_SIZE
import com.yokyznt.fruitspire.core.data.RelicHooks
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.SeedUses
import com.yokyznt.fruitspire.core.data.SproutHarvest
import com.yokyznt.fruitspire.core.data.Sprouts
import com.yokyznt.fruitspire.core.data.Statuses
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

// ============================================================
// Motor de combate por turnos (port de js/engine/combat.js). No toca la pantalla: avisa cambios con
// onUpdate() y guarda cada efecto en lastEvents para que la interfaz los anime.
//
// El turno enemigo va en 3 fases para que la interfaz anime cada una por separado:
//   endPlayerTurn() -> enemyAct(i) (uno por uno) -> endEnemyTurn()
// ============================================================

const val HAND_LIMIT = 10

/** Un efecto del combate para animar. `extra` lleva los datos de cada tipo (statusId, cardId, blocked…). */
class CombatEvent(val type: String, val target: String, val amount: Int, val extra: Map<String, Any?> = emptyMap()) {
    fun str(k: String): String? = extra[k] as? String
    fun int(k: String): Int = (extra[k] as? Int) ?: 0
    fun flag(k: String): Boolean = extra[k] == true
}

class HitResult(val damage: Int, val hpLoss: Int, val killed: Boolean)

/** Lo que hizo un enemigo en su turno: una jugada, o perdió el turno por estar congelado. */
class ActResult(val move: com.yokyznt.fruitspire.core.data.Move?, val frozen: Boolean)

class TurnState(var cardsPlayed: Int = 0, var attacksPlayed: Int = 0)

class PreviewResult(val dmg: List<Int>, val block: List<Int>, val total: Int)

/** Ganchos de la mascota (los llena el vestidor, etapa 4). */
interface PetHooks {
    fun onCombatStart(ctx: Ctx) {}
    fun onFirstTurn(ctx: Ctx) {}
}

/** Lo que reciben las cartas, semillas, objetos y brotes para actuar (el `ctx` del juego web). */
open class Ctx(val combat: Combat, val card: Card?) {
    val player: Player get() = combat.player
    var enemy: EnemyInstance = combat.enemy
    var enemies: List<EnemyInstance> = combat.aliveEnemies()
    var cardsPlayed: Int = combat.turnState.cardsPlayed
    /** Estado propio de cada objeto o regla (se reinicia cada combate). */
    var state: MutableMap<String, Any?> = HashMap()
    /** Estado de un objeto que dura toda la partida. */
    var persist: MutableMap<String, Any?> = HashMap()
    var onFlash: () -> Unit = {}
    var onSay: (String) -> Unit = {}
    fun flash() = onFlash()
    fun say(text: String) = onSay(text)

    open fun attack(n: Int, target: Entity? = null): HitResult = combat.dealDamage(player, target ?: enemy, n)
    open fun attackAll(n: Int) { combat.aliveEnemies().forEach { combat.dealDamage(player, it, n) } }
    open fun attackRandom(n: Int): HitResult {
        val alive = combat.aliveEnemies()
        if (alive.isEmpty()) return HitResult(0, 0, false)
        return combat.dealDamage(player, alive[Rng.int(alive.size)], n)
    }
    open fun block(n: Int) { combat.gainBlock(player, n, true) }
    /** gainBlock del motor; en la vista previa de una carta solo cuenta la cáscara del jugador. */
    open fun gainBlockOn(entity: Entity, n: Int, fromCard: Boolean) { combat.gainBlock(entity, n, fromCard) }
    open fun apply(target: Entity?, id: String, n: Int) { combat.applyStatus(target, id, n, true) }
    open fun applyAll(id: String, n: Int) { combat.aliveEnemies().forEach { combat.applyStatus(it, id, n, true) } }
    open fun buff(id: String, n: Int) { combat.applyStatus(player, id, n) }
    open fun draw(n: Int) { combat.drawCards(n) }
    open fun gainEnergy(n: Int) { player.energy += n }
    open fun heal(n: Int): Int = combat.healEntity(player, n)
    open fun loseHp(n: Int) {
        val lost = player.loseHp(n)
        if (lost != 0) { combat.pushEvent("damage", player, lost, mapOf("poison" to true)); combat.hookHpLoss(lost) }
    }
    open fun gainMaxHp(n: Int) {
        player.maxHp += n; player.hp += n
        combat.pushEvent("heal", player, n, mapOf("maxHp" to true))
    }
    open fun addToHand(id: String, n: Int = 1) { combat.addCards(id, n, "hand") }
    open fun addToDiscard(id: String, n: Int = 1) { combat.addCards(id, n, "discard") }
    open fun exhaustRandom(n: Int): Int {
        var done = 0
        var i = 0
        while (i < n && player.hand.isNotEmpty()) {
            val id = player.hand.removeAt(Rng.int(player.hand.size))
            combat.exhaustCard(id)
            done++; i++
        }
        return done
    }
    open fun summon(defId: String): EnemyInstance? = combat.summon(defId)
    open fun plant(type: String) { combat.plant(type) }
    open fun grow(n: Int) { combat.growGarden(n) }
    open fun harvestAll() { combat.harvestAll() }
    open fun gardenSize(): Int = player.garden.size
}

/** Vista previa de una carta: corre su efecto "en seco" y recoge golpes y cáscara con todo aplicado. */
private class PreviewCtx(combat: Combat, card: Card, target: EnemyInstance?) : Ctx(combat, card) {
    val dmg = ArrayList<Int>()
    val blk = ArrayList<Int>()
    var total = 0
    private val tgt: EnemyInstance? = target ?: if (combat.aliveEnemies().size == 1) combat.aliveEnemies()[0] else null
    private val neutral = Entity("", 99, 99)
    private val jar = card.type == "attack" && combat.hasRelic("frasco_almibar") &&
        combat.relicState["frasco_almibar"]?.get("used") != true

    init { enemy = tgt ?: combat.enemy }

    private fun hit(n: Int, t: Entity?): HitResult {
        val old = combat.damageMult
        if (jar) combat.damageMult = 2
        val d = combat.previewDamage(player, t ?: tgt ?: neutral, n)
        combat.damageMult = old
        dmg.add(d); total += d
        return HitResult(d, 0, false)
    }
    private fun blockOf(n: Int, fromCard: Boolean) {
        var a = n
        if (fromCard) a += player.getStatus("dexterity")
        if (player.getStatus("frail") != 0) a = floor(a * 0.75).toInt()
        if (fromCard) a = CharacterHooks.onGainBlock(player, a)
        blk.add(max(0, a))
    }

    override fun attack(n: Int, target: Entity?): HitResult = hit(n, target)
    override fun attackAll(n: Int) {
        val al = combat.aliveEnemies()
        if (tgt != null || al.size <= 1) hit(n, tgt ?: al.firstOrNull())
        else {
            val ds = al.map { combat.previewDamage(player, it, n) }
            dmg.add(ds.max()); total += ds.sum()
        }
    }
    override fun attackRandom(n: Int): HitResult = hit(n, null)
    override fun block(n: Int) = blockOf(n, true)
    override fun gainBlockOn(entity: Entity, n: Int, fromCard: Boolean) { if (entity === player) blockOf(n, fromCard) }
    override fun apply(target: Entity?, id: String, n: Int) {}
    override fun applyAll(id: String, n: Int) {}
    override fun buff(id: String, n: Int) {}
    override fun draw(n: Int) {}
    override fun gainEnergy(n: Int) {}
    override fun heal(n: Int): Int = 0
    override fun loseHp(n: Int) {}
    override fun gainMaxHp(n: Int) {}
    override fun addToHand(id: String, n: Int) {}
    override fun addToDiscard(id: String, n: Int) {}
    override fun exhaustRandom(n: Int): Int = 0
    override fun summon(defId: String): EnemyInstance? = null
    override fun plant(type: String) {}
    override fun grow(n: Int) {}
    override fun harvestAll() {}
}

/**
 * @param mods vida y daño extra de los enemigos (dificultad y piso)
 * @param rule regla del piso (ver data/Castles)
 */
class Combat(
    val player: Player,
    enemyDefs: List<String>,
    val onUpdate: () -> Unit = {},
    val onEnd: (String) -> Unit = {},
    val mods: Pair<Double, Int> = Pair(1.0, 0),
    val rule: FloorRule? = null,
    val pet: PetHooks? = null
) {
    val ruleState: MutableMap<String, Any?> = HashMap()
    val enemies = ArrayList<EnemyInstance>()
    var target: EnemyInstance? = null
    var turn = "player"
    var turnNumber = 1
    var lastEvents = ArrayList<CombatEvent>()
    var ended = false
    val relicState = HashMap<String, MutableMap<String, Any?>>()
    var turnState = TurnState()
    var damageMult = 1
    /** Experiencia del pase de batalla por los enemigos derrotados. */
    var xpGained = 0
    /** Id de la última carta jugada (la copia la Semilla Espejo). */
    var lastPlayed: String? = null

    init {
        enemyDefs.forEach { id -> enemies.add(EnemyInstance(Enemies.get(id)!!, mods.first, mods.second)) }
        start()
    }

    /** Enemigo "actual": el objetivo elegido si sigue vivo, si no el primero vivo. */
    val enemy: EnemyInstance
        get() {
            val t = target
            if (t != null && t.isAlive()) return t
            return aliveEnemies().firstOrNull() ?: enemies[0]
        }

    fun aliveEnemies(): List<EnemyInstance> = enemies.filter { it.isAlive() }

    /**
     * Elige el objetivo de una carta o semilla. Provocación: si hay un enemigo con Provocación, los golpes a un
     * solo objetivo tienen que ir contra él.
     */
    fun setTarget(targetIndex: Int?) {
        if (targetIndex == null || targetIndex !in enemies.indices) return
        var t = enemies[targetIndex]
        val taunter = aliveEnemies().firstOrNull { it.getStatus("taunt") != 0 }
        if (taunter != null && t !== taunter && t.getStatus("taunt") == 0) { t = taunter; pushEvent("taunt", taunter, 0) }
        target = t
    }
    fun tauntIndex(): Int {
        val taunter = aliveEnemies().firstOrNull { it.getStatus("taunt") != 0 }
        return if (taunter != null) enemies.indexOf(taunter) else -1
    }

    fun targetKey(entity: Entity): String = if (entity === player) "player" else "enemy-${enemies.indexOf(entity)}"
    fun pushEvent(type: String, entity: Entity, amount: Int, extra: Map<String, Any?> = emptyMap()) {
        lastEvents.add(CombatEvent(type, targetKey(entity), amount, extra))
    }

    // ---------- objetos y reglas ----------
    private fun relicCtx(rid: String): Ctx {
        val ctx = makeCtx(null)
        ctx.state = relicState.getOrPut(rid) { HashMap() }
        ctx.persist = player.relicCounters.getOrPut(rid) { HashMap() }
        ctx.onFlash = { pushEvent("relic", player, 0, mapOf("relicId" to rid)) }
        return ctx
    }
    private inline fun <T : Any> eachRelic(select: (RelicHooks) -> T?, call: (T, Ctx) -> Unit) {
        for (rid in player.relics.toList()) {
            val hook = select(Relics.hooks(rid) ?: continue) ?: continue
            call(hook, relicCtx(rid))
        }
    }
    fun hookHpLoss(lost: Int) { eachRelic({ it.onHpLoss }) { h, c -> h(c) } }
    private fun ruleCtx(): Ctx {
        val ctx = makeCtx(null)
        ctx.state = ruleState
        ctx.onSay = { text -> pushEvent("rule", player, 0, mapOf("text" to text)) }
        return ctx
    }
    private fun ruleStart() { rule?.hooks?.onCombatStart?.let { it(ruleCtx()) } }
    private fun ruleTurnStart(turn: Int) { rule?.hooks?.onTurnStart?.let { it(ruleCtx(), turn) } }
    private fun ruleTurnEnd(turn: Int) { rule?.hooks?.onTurnEnd?.let { it(ruleCtx(), turn) } }
    private fun ruleCardPlayed(card: Card) { rule?.hooks?.onCardPlayed?.let { it(ruleCtx(), card) } }

    fun relicSum(field: (com.yokyznt.fruitspire.core.data.RelicDef) -> Int): Int =
        player.relics.sumOf { rid -> Relics.get(rid)?.let(field) ?: 0 }
    fun hasRelic(id: String) = player.relics.contains(id)

    // ---------- inicio ----------
    private fun start() {
        val p = player
        p.drawPile = Rng.shuffle(ArrayList(p.deck))
        p.hand = ArrayList()
        p.discardPile = ArrayList()
        p.exhaustPile = ArrayList()
        p.block = 0
        p.statuses.clear()
        lastEvents = ArrayList()
        p.garden = ArrayList()
        p.dmgBonus = 0 // bono de la regla del piso: nunca pasa de un combate a otro
        if (p.permanentStrength != 0) p.addStatus("strength", p.permanentStrength)
        CharacterHooks.onCombatStart(p.characterId, this)
        eachRelic({ it.onCombatStart }) { h, c -> h(c) }
        ruleStart()
        pet?.onCombatStart(makeCtx(null))
        enemies.forEach { it.chooseMove(this) }
        startPlayerTurn()
        if (pet != null) { pet.onFirstTurn(makeCtx(null)); onUpdate() }
    }

    fun startPlayerTurn() {
        val p = player
        turn = "player"
        turnState = TurnState()
        enemies.forEach { it.capLost = 0 }
        if (p.getStatus("barricade") == 0) p.block = 0
        p.energy = p.maxEnergy
        // Agotamiento: empiezas el turno con menos energía
        val drained = p.getStatus("drained")
        if (drained != 0) { p.energy = max(0, p.energy - drained); p.statuses.remove("drained"); pushEvent("drainenergy", p, drained) }
        val fire = p.getStatus("inner_fire")
        if (fire != 0) {
            val lost = p.loseHp(1)
            if (lost != 0) { pushEvent("damage", p, lost, mapOf("poison" to true)); hookHpLoss(lost) }
            applyStatus(p, "strength", fire)
        }
        val sticky = p.getStatus("sticky")
        if (sticky != 0) p.statuses.remove("sticky")
        drawCards(max(0, 5 + relicSum { it.drawBonus } - sticky))
        if (p.getStatus("seeds") != 0) addCards("semilla", p.getStatus("seeds"), "hand")
        if (p.garden.isNotEmpty()) growGarden(1)
        for (k in 0 until p.getStatus("vine")) plant("agria")
        eachRelic({ it.onTurnStart }) { h, c -> h(c) }
        ruleTurnStart(turnNumber)
        checkEnd()
        onUpdate()
    }

    fun drawCards(n: Int) {
        val p = player
        for (i in 0 until n) {
            if (p.drawPile.isEmpty()) {
                if (p.discardPile.isEmpty()) return
                // se acabó la pila de robo: se baraja el descarte dentro
                p.drawPile = Rng.shuffle(ArrayList(p.discardPile))
                p.discardPile = ArrayList()
                lastEvents.add(CombatEvent("reshuffle", "player", p.drawPile.size))
            }
            val cardId = p.drawPile.removeAt(p.drawPile.size - 1)
            if (p.hand.size >= HAND_LIMIT) p.discardPile.add(cardId) else p.hand.add(cardId)
        }
    }

    fun addCards(cardId: String, n: Int, where: String) {
        val p = player
        for (i in 0 until n) {
            if (where == "hand" && p.hand.size < HAND_LIMIT) p.hand.add(cardId)
            else if (where == "draw") p.drawPile.add(Rng.int(p.drawPile.size + 1), cardId)
            else p.discardPile.add(cardId)
        }
        pushEvent("addcard", p, n, mapOf("cardId" to cardId, "where" to where))
    }

    fun exhaustCard(cardId: String) {
        player.exhaustPile.add(cardId)
        pushEvent("exhaust", player, 1, mapOf("cardId" to cardId))
        eachRelic({ it.onExhaust }) { h, c -> h(c) }
    }

    // ---------- daño, cáscara, estados ----------
    /** Daño final de un golpe (sin aplicarlo). También lo usa la interfaz. */
    fun previewDamage(source: Entity, target: Entity, base: Int): Int {
        var amount = base
        if (amount > 0) amount += source.getStatus("strength") + source.dmgBonus
        if (source === player) amount *= damageMult
        if (source.getStatus("weak") != 0) amount = floor(amount * 0.75).toInt()
        if (target.getStatus("vulnerable") != 0) amount = floor(amount * 1.5).toInt()
        if (target === player && hasRelic("nuez_dura") && amount > 0) amount -= 1
        // Intangible: el golpe no hace daño (dealDamage gasta 1 punto por golpe)
        if (target.getStatus("ghost") != 0 && amount > 0) amount = 0
        // Gelatina: cada golpe hace solo 1 de daño
        if (target.getStatus("jelly") != 0 && amount > 1) amount = 1
        return max(0, amount)
    }

    fun dealDamage(source: Entity, target: Entity?, base: Int): HitResult {
        if (target == null || !target.isAlive() || !source.isAlive()) return HitResult(0, 0, false)
        val ghost = base > 0 && target.getStatus("ghost") > 0
        val amount = previewDamage(source, target, base)
        if (ghost) target.addStatus("ghost", -1)
        var hpLoss = target.takeDamage(amount)
        // Coraza Dura: los golpes no le quitan más de N PV por turno
        val cap = target.getStatus("cap")
        if (cap != 0 && hpLoss > 0) {
            val already = target.capLost
            val excess = max(0, already + hpLoss - cap)
            if (excess != 0) { target.hp += excess; hpLoss -= excess }
            target.capLost = already + hpLoss
        }
        pushEvent("damage", target, amount, mapOf("blocked" to amount - hpLoss, "from" to targetKey(source), "capped" to (cap != 0 && target.capLost >= cap)))
        if (hpLoss > 0 && target.getStatus("plated") != 0) target.addStatus("plated", -1)
        // Enroscado: la primera vez que le quitan vida se hace bolita
        if (hpLoss > 0 && target.isAlive() && target.getStatus("curl") != 0) {
            val curl = target.getStatus("curl")
            target.statuses.remove("curl")
            gainBlock(target, curl, false)
        }
        // Pulpa Blanda: cada golpe que le quita vida le da cáscara
        if (hpLoss > 0 && target.isAlive() && target.getStatus("malleable") != 0) gainBlock(target, target.getStatus("malleable"), false)
        // Rabia: cada golpe que le quita vida lo pone más fuerte
        if (hpLoss > 0 && target.isAlive() && target.getStatus("rage") != 0) applyStatus(target, "strength", target.getStatus("rage"))
        // Divisible: a media vida se parte en dos
        if (target !== player && target is EnemyInstance && target.isAlive() && target.getStatus("split") != 0 && target.hp <= target.maxHp / 2.0) splitEnemy(target)
        if (target === player && hpLoss > 0) hookHpLoss(hpLoss)

        // pinchos: quien golpea se pincha
        val thorns = target.getStatus("thorns")
        if (thorns != 0 && source !== target && source.isAlive()) {
            val lost = source.takeDamage(thorns)
            pushEvent("damage", source, thorns, mapOf("thorns" to true, "blocked" to thorns - lost))
            if (!source.isAlive() && source !== player) onEnemyDeath(source as EnemyInstance)
        }
        // habilidad del personaje (Kiwi refleja daño)
        if (target === player && source !== player && hpLoss > 0 && source.isAlive()) {
            val before = source.hp
            CharacterHooks.onPlayerDamaged(player, source, hpLoss)
            if (source.hp < before) pushEvent("damage", source, before - source.hp, mapOf("thorns" to true))
            if (!source.isAlive()) onEnemyDeath(source as EnemyInstance)
        }
        if (!target.isAlive() && target !== player) onEnemyDeath(target as EnemyInstance)
        val killed = !target.isAlive() && !(target is EnemyInstance && target.split)
        return HitResult(amount, hpLoss, killed)
    }

    fun gainBlock(entity: Entity, base: Int, fromCard: Boolean) {
        var amount = base
        if (fromCard) amount += entity.getStatus("dexterity")
        if (entity.getStatus("frail") != 0) amount = floor(amount * 0.75).toInt()
        if (entity === player && fromCard) amount = CharacterHooks.onGainBlock(player, amount)
        amount = max(0, amount)
        entity.addBlock(amount)
        pushEvent("block", entity, amount)
    }

    fun applyStatus(entity: Entity?, id: String, amount: Int, fromPlayer: Boolean = false) {
        if (entity == null || !entity.isAlive() || amount == 0) return
        if (id == "frozen" && entity.getStatus("frozen") != 0) return // no se acumula
        val info = Statuses.get(id)
        // Espejo: el primer perjuicio que le mandas en el turno te lo devuelve
        if (fromPlayer && info != null && info.kind == "debuff" && amount > 0 && entity.getStatus("reflect") != 0) {
            entity.addStatus("reflect", -1)
            pushEvent("negate", entity, 0, mapOf("statusId" to id))
            applyStatus(player, id, amount)
            return
        }
        if (info != null && info.kind == "debuff" && amount > 0 && entity.getStatus("wax") != 0) {
            entity.addStatus("wax", -1)
            pushEvent("negate", entity, 0, mapOf("statusId" to id))
            return
        }
        entity.addStatus(id, amount)
        pushEvent("status", entity, amount, mapOf("statusId" to id))
    }

    fun healEntity(entity: Entity, amount: Int): Int {
        val healed = entity.heal(amount)
        if (healed > 0) pushEvent("heal", entity, healed)
        return healed
    }

    // ---------- Viñedo (la Uva) ----------
    /** Planta un brote. Si los surcos están llenos, primero se cosecha el más viejo. */
    fun plant(type: String) {
        val p = player
        val def = Sprouts.get(type)
        if (def == null || ended) return
        if (p.garden.size >= GARDEN_SIZE) harvest(p.garden.removeAt(0))
        p.garden.add(Sprout(type, def.time, true))
        pushEvent("plant", p, 0, mapOf("sprout" to type))
    }
    /** Todos los brotes crecen n; los que llegan a 0 se cosechan. */
    fun growGarden(n: Int) {
        val p = player
        p.garden.forEach { it.timer -= n }
        val ready = p.garden.filter { it.timer <= 0 }
        p.garden = ArrayList(p.garden.filter { it.timer > 0 })
        ready.forEach { harvest(it) }
    }
    fun harvestAll() {
        val all = player.garden
        player.garden = ArrayList()
        all.forEach { harvest(it) }
    }
    fun harvest(sprout: Sprout) {
        if (Sprouts.get(sprout.type) == null || ended) return
        pushEvent("harvest", player, 0, mapOf("sprout" to sprout.type))
        SproutHarvest.of(sprout.type)?.invoke(makeCtx(null))
        val fertile = player.getStatus("fertile")
        if (fertile != 0) gainBlock(player, fertile, false)
        checkEnd()
    }

    fun onEnemyDeath(enemy: EnemyInstance) {
        if (enemy.deathHandled) return
        // Rebrote: la primera vez revive con la mitad de su vida
        if (enemy.getStatus("regrow") != 0) {
            enemy.statuses.remove("regrow")
            listOf("poison", "weak", "vulnerable", "frail", "frozen").forEach { enemy.statuses.remove(it) }
            enemy.hp = max(1, floor(enemy.maxHp / 2.0).toInt())
            enemy.block = 0
            pushEvent("revive", enemy, enemy.hp)
            return
        }
        enemy.deathHandled = true
        val tier = enemy.def.tier
        xpGained += if (tier == "boss") 60 else if (tier == "elite") 25 else if (enemy.getStatus("minion") != 0) 3 else 8
        val spores = enemy.getStatus("spores")
        if (spores != 0 && !enemy.fled) applyStatus(player, "vulnerable", spores)
        // si muere un líder, sus esbirros huyen
        if (enemy.def.leader) {
            aliveEnemies().forEach { e ->
                if (e.getStatus("minion") == 0) return@forEach
                e.fled = true
                e.deathHandled = true
                returnStolenCards(e)
                if (e.stolenGold != 0) { player.gold += e.stolenGold; pushEvent("gold", player, e.stolenGold); e.stolenGold = 0 }
                e.hp = 0
                pushEvent("flee", e, 0)
            }
        }
        returnStolenCards(enemy)
        if (enemy.stolenGold != 0) {
            player.gold += enemy.stolenGold
            pushEvent("gold", player, enemy.stolenGold)
            enemy.stolenGold = 0
        }
        eachRelic({ it.onEnemyDeath }) { h, c -> h(c, enemy) }
    }

    /** Robacartas: se lleva cartas de tu pila de robo (o del descarte). Vuelven al derrotarlo. */
    fun stealCards(enemy: EnemyInstance, n: Int) {
        val p = player
        for (k in 0 until n) {
            val pile = if (p.drawPile.isNotEmpty()) p.drawPile else p.discardPile
            val idx = pile.indices.filter { i -> val c = Cards.get(pile[i]); c != null && c.type != "curse" && c.type != "status" }
            if (idx.isEmpty()) break
            val id = pile.removeAt(idx[Rng.int(idx.size)])
            enemy.stolenCards.add(id)
            pushEvent("stealcard", p, 1, mapOf("cardId" to id, "from" to targetKey(enemy)))
        }
    }
    fun returnStolenCards(enemy: EnemyInstance) {
        if (enemy.stolenCards.isEmpty()) return
        player.discardPile.addAll(enemy.stolenCards)
        pushEvent("returncards", player, enemy.stolenCards.size)
        enemy.stolenCards.clear()
    }

    /** Se parte en dos: desaparece y deja dos de def.splitInto con su vida actual. */
    fun splitEnemy(enemy: EnemyInstance) {
        val hp = enemy.hp
        enemy.hp = 0
        enemy.deathHandled = true
        enemy.split = true
        pushEvent("split", enemy, 0)
        for (k in 0 until 2) summon(enemy.def.splitInto!!, hp)
    }

    /** Invoca un enemigo nuevo en un hueco libre (máximo 3 vivos). hp: vida fija (para los que salen de una división). */
    fun summon(defId: String, hp: Int = 0): EnemyInstance? {
        val def = Enemies.get(defId)
        if (def == null || aliveEnemies().size >= 3) return null
        val e = EnemyInstance(def, mods.first, mods.second)
        if (hp != 0) { e.hp = hp; e.maxHp = hp }
        val idx = enemies.indexOfFirst { !it.isAlive() }
        if (idx >= 0) enemies[idx] = e
        else if (enemies.size < 4) enemies.add(e)
        else return null
        e.chooseMove(this)
        pushEvent("summon", e, 0)
        return e
    }

    fun makeCtx(card: Card?): Ctx = Ctx(this, card)

    // ---------- vista previa de una carta ----------
    /**
     * Corre el efecto de la carta "en seco" (sin cambiar nada) y devuelve los golpes y la cáscara que daría
     * con TODO aplicado: Madurez, Marchitez, Magulladura, Firmeza, Blandura, objetos, reglas del piso…
     */
    fun previewCard(card: Card, target: EnemyInstance?): PreviewResult {
        val ctx = PreviewCtx(this, card, target)
        try { card.effect(ctx) } catch (e: Exception) { /* una carta rara: sin vista previa */ }
        return PreviewResult(ctx.dmg, ctx.blk, ctx.total)
    }

    // ---------- semillas (objetos de un solo uso) ----------
    fun useSeed(seedId: String, targetIndex: Int?): Boolean {
        if (Seeds.get(seedId) == null || ended || turn != "player") return false
        lastEvents = ArrayList()
        setTarget(targetIndex)
        pushEvent("seed", player, 0, mapOf("seedId" to seedId))
        SeedUses.of(seedId)?.invoke(makeCtx(null))
        checkEnd()
        onUpdate()
        return true
    }

    // ---------- jugar cartas ----------
    fun canPlay(cardId: String): Boolean {
        val card = Cards.get(cardId)
        return card != null && !card.unplayable && player.energy >= card.cost
    }

    /** targetIndex: índice en [enemies] del enemigo al que se lanzó la carta. */
    fun playCard(handIndex: Int, targetIndex: Int?) {
        if (ended || turn != "player") return
        val p = player
        val cardId = p.hand.getOrNull(handIndex) ?: return
        val card = Cards.get(cardId)
        if (card == null || card.unplayable) return
        if (p.energy < card.cost) { onUpdate(); return }
        lastEvents = ArrayList()
        p.energy -= card.cost
        p.hand.removeAt(handIndex)
        setTarget(targetIndex)

        // Frasco de Almíbar: el primer ataque del combate pega doble
        val jar = relicState["frasco_almibar"]
        if (card.type == "attack" && hasRelic("frasco_almibar") && jar?.get("used") != true) {
            damageMult = 2
            relicState["frasco_almibar"] = hashMapOf("used" to true)
            pushEvent("relic", p, 0, mapOf("relicId" to "frasco_almibar"))
        }
        val ctx = makeCtx(card)
        val target = ctx.enemy
        card.effect(ctx)
        damageMult = 1

        if (card.type == "attack" && p.getStatus("noble_rot") != 0 && target.isAlive() && card.target != "none") {
            applyStatus(target, "poison", p.getStatus("noble_rot"), true)
        }
        turnState.cardsPlayed++
        if (card.type == "attack") turnState.attacksPlayed++
        if (card.type != "curse" && card.type != "status") lastPlayed = cardId

        if (card.type == "power") { /* queda activo: no va a ninguna pila */ }
        else if (card.exhaust) exhaustCard(cardId)
        else p.discardPile.add(cardId)

        eachRelic({ it.onCardPlayed }) { h, c -> h(c, card) }
        ruleCardPlayed(card)
        enemyReactions(card)
        checkEnd()
        onUpdate()
    }

    /** Lo que hacen los enemigos cuando juegas una carta. */
    private fun enemyReactions(card: Card) {
        val p = player
        aliveEnemies().forEach { e ->
            // Enfado: tus habilidades lo enojan
            if (card.type == "skill" && e.getStatus("enrage") != 0) applyStatus(e, "strength", e.getStatus("enrage"))
            // Latido: cada carta te cuesta vida
            val beat = e.getStatus("beat")
            if (beat != 0 && p.isAlive()) {
                val lost = p.loseHp(beat)
                if (lost != 0) { pushEvent("damage", p, lost, mapOf("poison" to true)); hookHpLoss(lost) }
            }
            // Temporizador: cuenta tus cartas y al llegar a 0 se enfurece
            // (nunca te quita el turno: siempre decides tú cuándo terminarlo)
            val clock = e.getStatus("clock")
            if (clock != 0) {
                if (clock <= 1) {
                    e.statuses["clock"] = e.def.clockEvery ?: 12
                    applyStatus(e, "strength", 2)
                    applyStatus(p, "weak", 1)
                    pushEvent("clock", e, 0)
                } else e.statuses["clock"] = clock - 1
            }
        }
    }

    // ---------- estados al final de un turno ----------
    private fun endOfTurnStatuses(entity: Entity) {
        if (!entity.isAlive()) return
        val poison = entity.getStatus("poison")
        if (poison != 0) {
            val lost = entity.loseHp(poison)
            pushEvent("damage", entity, lost, mapOf("poison" to true))
            entity.addStatus("poison", -1)
            if (entity === player && lost != 0) hookHpLoss(lost)
            if (!entity.isAlive()) { if (entity !== player) onEnemyDeath(entity as EnemyInstance); return }
        }
        val regen = entity.getStatus("regen")
        if (regen != 0) { healEntity(entity, regen); entity.addStatus("regen", -1) }
        val ritual = entity.getStatus("ritual")
        if (ritual != 0) applyStatus(entity, "strength", ritual)
        val plated = entity.getStatus("plated")
        if (plated != 0) gainBlock(entity, plated, false)
        listOf("weak", "vulnerable", "frail", "jelly").forEach { s -> if (entity.getStatus(s) > 0) entity.addStatus(s, -1) }
        // Plaga: se reproduce al final de su turno si hay lugar
        val breed = entity.getStatus("breed")
        if (breed != 0 && entity !== player && aliveEnemies().size < 3) {
            val e = entity as EnemyInstance
            val child = summon(e.def.breedInto ?: e.def.id, max(4, kotlin.math.ceil(e.maxHp / 3.0).toInt()))
            if (child != null) { entity.addStatus("breed", -1); pushEvent("breed", entity, 0) }
        }
        // Mecha: cuenta regresiva; al llegar a 0 explota contra el jugador
        val fuse = entity.getStatus("fuse")
        if (fuse != 0 && entity !== player) {
            if (fuse <= 1) {
                val e = entity as EnemyInstance
                e.statuses.remove("fuse")
                pushEvent("explode", e, e.def.explode ?: 25)
                dealDamage(e, player, e.def.explode ?: 25)
                e.hp = 0
                onEnemyDeath(e)
            } else entity.addStatus("fuse", -1)
        }
    }

    fun endPlayerTurn() {
        if (ended || turn != "player") return
        val p = player
        lastEvents = ArrayList()
        // maldiciones que castigan si siguen en la mano
        p.hand.toList().forEach { id ->
            val card = Cards.get(id)
            if (card != null && card.endTurnDamage != 0) {
                val lost = p.loseHp(card.endTurnDamage)
                pushEvent("damage", p, lost, mapOf("poison" to true))
                if (lost != 0) hookHpLoss(lost)
            }
        }
        // Efímeras: si siguen en la mano, se consumen
        p.hand = ArrayList(p.hand.filter { id ->
            val card = Cards.get(id)
            if (card != null && card.ethereal) { exhaustCard(id); false } else true
        })
        eachRelic({ it.onTurnEnd }) { h, c -> h(c) }
        ruleTurnEnd(turnNumber)
        val flex = p.getStatus("flex")
        if (flex != 0) { p.addStatus("strength", -flex); p.statuses.remove("flex") }
        // lo que se conserva en la mano
        val keep = ArrayList<String>()
        val rest = ArrayList<String>()
        p.hand.forEach { id -> if (Cards.get(id)?.retain == true) keep.add(id) else rest.add(id) }
        if (hasRelic("canasta_tejida") && rest.isNotEmpty()) {
            // la Canasta guarda la carta jugable más cara
            var best = -1
            rest.forEachIndexed { i, id ->
                val c = Cards.get(id)
                if (c != null && !c.unplayable && (best < 0 || c.cost > Cards.get(rest[best])!!.cost)) best = i
            }
            if (best >= 0) keep.add(rest.removeAt(best))
        }
        p.discardPile.addAll(rest)
        p.hand = keep
        endOfTurnStatuses(p)
        checkEnd()
        if (!ended) {
            turn = "enemy"
            // la cáscara de los enemigos se va al empezar SU turno, toda a la vez: así la que un enemigo le da a
            // sus aliados les dura hasta el siguiente turno
            enemies.forEach { if (it.getStatus("shell") == 0) it.block = 0 }
        }
        onUpdate()
    }

    /** Hace la jugada del enemigo [index]: la jugada, o `frozen` si estaba congelado. */
    fun enemyAct(index: Int): ActResult? {
        if (ended || turn != "enemy") return null
        val enemy = enemies.getOrNull(index)
        if (enemy == null || !enemy.isAlive()) return null
        lastEvents = ArrayList()
        if (enemy.getStatus("frozen") != 0) {
            enemy.statuses.remove("frozen")
            pushEvent("skip", enemy, 0)
            onUpdate()
            return ActResult(null, true)
        }
        val move = enemy.nextMove!!
        val ctx = makeCtx(null)
        val P = player

        if (move.block != 0) gainBlock(enemy, move.block, false)
        if (move.allyBlock != 0) aliveEnemies().forEach { e -> if (e !== enemy) gainBlock(e, move.allyBlock, false) }
        if (move.damage != 0) {
            val hits = if (move.hits != 0) move.hits else 1
            var i = 0
            while (i < hits && P.isAlive() && enemy.isAlive()) {
                val r = dealDamage(enemy, P, move.damage)
                // Vampírico: se cura por la vida que te quitó
                if (move.drain && r.hpLoss > 0) healEntity(enemy, r.hpLoss)
                i++
            }
        }
        if (move.apply != null && P.isAlive()) move.apply.forEach { (id, n) -> applyStatus(P, id, n) }
        if (move.self != null && enemy.isAlive()) move.self.forEach { (id, n) -> applyStatus(enemy, id, n) }
        if (move.allies != null) aliveEnemies().forEach { e -> move.allies.forEach { (id, n) -> applyStatus(e, id, n) } }
        if (move.heal != 0 && enemy.isAlive()) healEntity(enemy, move.heal)
        if (move.healAll != 0) aliveEnemies().forEach { healEntity(it, move.healAll) }
        if (move.stealGold != 0 && enemy.isAlive()) {
            val g = min(P.gold, move.stealGold)
            if (g > 0) {
                P.gold -= g
                enemy.stolenGold += g
                pushEvent("steal", P, g, mapOf("from" to targetKey(enemy)))
            }
        }
        move.addCard?.let { addCards(it.id, it.n, it.to) }
        if (move.stealCard != 0 && enemy.isAlive()) stealCards(enemy, move.stealCard)
        move.summon?.forEach { summon(it) }
        move.special?.invoke(enemy, ctx)

        enemy.history.add(move.id)
        enemy.turns++
        checkEnd()
        onUpdate()
        return ActResult(move, false)
    }

    fun endEnemyTurn() {
        if (ended || turn != "enemy") return
        lastEvents = ArrayList()
        aliveEnemies().forEach { endOfTurnStatuses(it) }
        checkEnd()
        if (!ended) {
            aliveEnemies().forEach { it.chooseMove(this) }
            turnNumber++
            startPlayerTurn()
        } else {
            onUpdate()
        }
    }

    fun checkEnd() {
        if (ended) return
        if (!player.isAlive()) {
            ended = true
            onEnd("lose")
        } else if (aliveEnemies().isEmpty()) {
            ended = true
            onEnd("win")
        }
    }
}
