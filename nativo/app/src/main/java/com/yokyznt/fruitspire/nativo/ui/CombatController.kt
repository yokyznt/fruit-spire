package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import com.yokyznt.fruitspire.core.Combat
import com.yokyznt.fruitspire.core.CombatEvent
import com.yokyznt.fruitspire.core.EnemyInstance
import com.yokyznt.fruitspire.core.PreviewResult
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.data.Card
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Seeds
import com.yokyznt.fruitspire.core.data.Sprouts
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.floor
import kotlin.math.max

// ============================================================
// Datos que dibuja el combate (todo valores) y el controlador que reproduce cada acción con sus tiempos
// (playCard / endTurn de js/fx.js). El motor de reglas vive en core: aquí solo se anima lo que pasó.
// ============================================================

@Immutable
data class StatusUi(val id: String, val n: Int, val sprite: String, val debuff: Boolean, val noCount: Boolean, val name: String, val help: String)

@Immutable
data class IntentUi(
    val cls: String, val sprite: String, val label: String, val extras: List<Pair<String, String>>,
    val frozen: Boolean = false, val unknown: Boolean = false, val title: String = "", val tip: String = ""
)

@Immutable
data class CombatantUi(
    val key: String, val sprite: String, val name: String, val hp: Int, val maxHp: Int, val block: Int,
    val statuses: List<StatusUi>, val alive: Boolean, val tier: String, val hurt: Int, val idle: String, val intent: IntentUi?,
    val charId: String? = null
)

@Immutable
data class HandCardUi(val key: Long, val card: Card, val playable: Boolean, val preview: PreviewResult?)

@Immutable
data class GardenUi(val sprite: String, val timer: Int, val name: String, val effect: String)

@Immutable
data class CombatUi(
    val player: CombatantUi,
    val enemies: List<CombatantUi>,
    val hand: List<HandCardUi>,
    val energy: Int, val maxEnergy: Int,
    val drawCount: Int, val discardCount: Int, val exhaustCount: Int,
    val turnNumber: Int, val playerTurn: Boolean,
    val ruleName: String?, val ruleSprite: String?, val ruleDesc: String?,
    val garden: List<GardenUi>, val showGarden: Boolean,
    val kind: String
)

fun hurtStageFor(hp: Int, maxHp: Int): Int {
    if (maxHp <= 0) return 0
    val pct = hp.toFloat() / maxHp
    return if (pct <= .15f) 3 else if (pct <= .4f) 2 else if (pct <= .7f) 1 else 0
}

private fun statusUi(id: String, n: Int): StatusUi? {
    val s = Statuses.get(id) ?: return StatusUi(id, n, "ui_up", false, false, id, "")
    return StatusUi(id, n, s.sprite, s.kind == "debuff", s.noCount, s.name, s.help)
}

private fun statusesOf(e: com.yokyznt.fruitspire.core.Entity): List<StatusUi> =
    e.statuses.entries.filter { it.value != 0 }.mapNotNull { statusUi(it.key, it.value) }

private fun statusName(id: String) = Statuses.get(id)?.name ?: id
private fun statusSprite(id: String) = Statuses.get(id)?.sprite ?: "ui_up"

/** Lo que hará un enemigo en su turno, con el daño real calculado (intentInfo de js/render.js). */
fun intentOf(c: Combat, e: EnemyInstance): IntentUi {
    if (e.getStatus("frozen") != 0) return IntentUi("frozen", "st_frozen", "", emptyList(), frozen = true, title = "Congelado", tip = "Pierde su próxima acción.")
    val m = e.nextMove ?: return IntentUi("buff", "ui_up", "", emptyList())
    var cls = ""
    var sprite = ""
    var label = ""
    val extras = ArrayList<Pair<String, String>>()
    val lines = ArrayList<String>()
    fun set(c2: String, s2: String, l2: String, value: String?) {
        if (cls.isEmpty()) { cls = c2; sprite = s2; label = l2 } else if (value != null) extras.add(s2 to value)
    }
    if (m.damage != 0) {
        val d = c.previewDamage(e, c.player, m.damage)
        val hits = if (m.hits > 0) m.hits else 1
        set("attack", "ui_sword", if (hits > 1) "$d×$hits" else "$d", null)
        lines.add("Ataca $d de daño" + if (hits > 1) " × $hits" else "")
    }
    if (m.block != 0) {
        val blk = if (e.getStatus("frail") != 0) floor(m.block * 0.75).toInt() else m.block
        set("defend", "ui_shield", "$blk", "$blk")
        lines.add("Se cubre $blk de cáscara")
    }
    if (m.allyBlock != 0) lines.add("Cubre ${m.allyBlock} de cáscara a sus aliados")
    m.apply?.forEach { (id, n) -> lines.add("Te aplica $n de ${statusName(id)}"); set("debuff", statusSprite(id), "$n", "$n") }
    m.self?.forEach { (id, n) -> lines.add("Gana $n de ${statusName(id)}"); set("buff", statusSprite(id), "$n", "$n") }
    m.allies?.forEach { (id, n) -> lines.add("Todos ganan $n de ${statusName(id)}"); set("buff", statusSprite(id), "$n", "$n") }
    if (m.heal != 0) { set("heal", "ui_heal", "+${m.heal}", "${m.heal}"); lines.add("Se cura ${m.heal} ❤️") }
    if (m.healAll != 0) lines.add("Cura ${m.healAll} ❤️ a todos")
    if (m.drain) lines.add("Vampírico: se cura con el daño")
    if (m.stealGold != 0) { set("debuff", "ui_coin", "${m.stealGold}", "${m.stealGold}"); lines.add("Roba ${m.stealGold} de oro (vuelve si lo derrotas)") }
    if (m.stealCard != 0) { set("debuff", "st_thief", "${m.stealCard}", "${m.stealCard}"); lines.add("Roba ${if (m.stealCard == 1) "1 carta" else "${m.stealCard} cartas"} (vuelve si lo derrotas)") }
    m.addCard?.let { ac ->
        val card = Cards.get(ac.id)
        set("debuff", card?.sprite ?: ac.id, "", "")
        lines.add("Mete ${card?.name ?: "una maldición"} en tu mazo")
    }
    m.summon?.let { ids ->
        set("summon", "node_mystery", "", "")
        lines.add("Invoca " + ids.joinToString(" y ") { com.yokyznt.fruitspire.core.data.Enemies.get(it)?.name ?: it })
    }
    return IntentUi(
        cls.ifEmpty { "buff" }, sprite.ifEmpty { "ui_up" }, label, extras.take(3),
        title = m.name, tip = lines.joinToString("\n").ifEmpty { "Nadie sabe qué hará" }
    )
}

// ---------------------------------------------------------------------------------------------------------------
// Poses de las animaciones de ataque (los @keyframes aLunge, aBite… de css/style.css)
// ---------------------------------------------------------------------------------------------------------------
class AnimInfo(val dur: Int, val hit: Int, val melee: Boolean)

val ANIMS: Map<String, AnimInfo> = mapOf(
    "lunge" to AnimInfo(640, 300, true), "bite" to AnimInfo(660, 290, true), "charge" to AnimInfo(900, 520, true),
    "sting" to AnimInfo(780, 420, true), "swoop" to AnimInfo(840, 450, true), "slam" to AnimInfo(800, 430, true),
    "spin" to AnimInfo(840, 430, true), "slash" to AnimInfo(720, 360, true), "spit" to AnimInfo(640, 340, false),
    "throw" to AnimInfo(580, 320, false), "shake" to AnimInfo(580, 290, false), "cast" to AnimInfo(620, 320, false),
    "power" to AnimInfo(680, 340, false), "guard" to AnimInfo(620, 260, false), "heal" to AnimInfo(660, 330, false),
    "burrow" to AnimInfo(820, 430, false)
)

class Pose(val tx: Float = 0f, val ty: Float = 0f, val rot: Float = 0f, val sx: Float = 1f, val sy: Float = 1f, val alpha: Float = 1f) {
    companion object { val None = Pose() }
}

private class Frame(val at: Float, val pose: Pose)

private val EaseIO = CubicBezierEasing(.65f, 0f, .35f, 1f)

private fun lerp(a: Float, b: Float, t: Float) = a + (b - a) * t

private fun blend(a: Pose, b: Pose, t: Float) = Pose(
    lerp(a.tx, b.tx, t), lerp(a.ty, b.ty, t), lerp(a.rot, b.rot, t), lerp(a.sx, b.sx, t), lerp(a.sy, b.sy, t), lerp(a.alpha, b.alpha, t)
)

/** Pose de la animación [kind] en el momento [t] (0..1). [dir]: 1 ataca hacia la derecha (jugador), -1 hacia la izquierda. */
fun attackPose(kind: String, t: Float, dir: Float, reach: Offset): Pose {
    val r = reach.x
    val ry = reach.y
    val f = ArrayList<Frame>()
    fun at(p: Float, tx: Float = 0f, ty: Float = 0f, rot: Float = 0f, sx: Float = 1f, sy: Float = 1f, a: Float = 1f) = f.add(Frame(p, Pose(tx, ty, rot, sx, sy, a)))
    at(0f)
    when (kind) {
        "lunge" -> { at(.30f, -24 * dir, 0f, -6 * dir); at(.47f, r, ry, 12 * dir); at(.60f, r * .9f, ry, 6 * dir) }
        "bite" -> { at(.30f, r * .85f, ry, 0f, 1.1f, .9f); at(.40f, r * .8f, ry, 0f, .92f, 1.08f); at(.50f, r * .88f, ry, 0f, 1.12f, .88f); at(.62f, r * .8f, ry) }
        "charge" -> { at(.40f, -46 * dir, 0f, 0f, 1.08f, .88f); at(.50f, -50 * dir, 0f, 0f, 1.1f, .86f); at(.58f, r, ry, 10 * dir, .94f, 1.06f); at(.70f, r * .85f, ry, 4 * dir) }
        "sting" -> { at(.30f, -10 * dir, -60f, -20 * dir); at(.54f, r, ry, 30 * dir); at(.68f, r * .8f, ry - 20, 12 * dir) }
        "swoop" -> { at(.28f, r * .2f, -110f, -14 * dir); at(.54f, r, ry + 20, 18 * dir); at(.72f, r * .7f, -60f, -6 * dir) }
        "slam" -> { at(.20f, 0f, 0f, 0f, 1.12f, .86f); at(.40f, r * .6f, ry - 120, 0f, .9f, 1.12f); at(.54f, r * .9f, ry, 0f, 1.24f, .76f); at(.64f, r * .9f, ry, 0f, .96f, 1.04f) }
        "spin" -> { f.clear(); at(0f); at(.52f, r, ry, 540 * dir); at(1f, 0f, 0f, 720 * dir) }
        "slash" -> { at(.30f, r * .5f, 0f, -28 * dir); at(.50f, r * .85f, ry, 38 * dir); at(.64f, r * .8f, ry, 20 * dir) }
        "spit" -> { at(.35f, -20 * dir, 0f, -12 * dir, 1.06f, .94f); at(.52f, 26 * dir, 0f, 12 * dir, .94f, 1.08f) }
        "throw" -> { at(.38f, -18 * dir, 0f, -14 * dir); at(.55f, 30 * dir, 0f, 14 * dir, 1.05f, 1.05f) }
        "shake" -> {
            for (i in 1..8) at(i * .1f, if (i % 2 == 1) -7f else 7f, 0f, if (i % 2 == 1) -3f else 3f, 1.06f, 1.06f)
            f.clear(); at(0f)
            for (i in 1..8) at(i * .1f, if (i % 2 == 1) -7f else 7f, 0f, if (i % 2 == 1) -3f else 3f, 1.06f, 1.06f)
        }
        "cast" -> { at(.4f, 0f, -30f, 0f, 1.08f, .94f); at(.7f, 0f, 0f, 0f, 1.06f, .94f) }
        "power" -> { at(.5f, 0f, 0f, 0f, 1.18f, 1.18f) }
        "guard" -> { at(.4f, 0f, 0f, 0f, .9f, 1.05f); at(.7f, 0f, 0f, 0f, 1.06f, 1.06f) }
        "heal" -> { at(.5f, 0f, -10f) }
        "burrow" -> { at(.4f, 0f, 46f, 0f, 1.1f, .5f, .5f); at(.6f, 0f, 46f, 0f, 1.1f, .5f, .5f); at(.78f, 0f, -20f, 0f, .94f, 1.1f) }
        else -> { at(.4f, 0f, -20f, 0f, 1.06f, .94f) }
    }
    if (f.last().at < 1f) f.add(Frame(1f, Pose.None))
    if (t <= 0f || t >= 1f) return if (kind == "spin" && t >= 1f) Pose.None else Pose.None
    for (i in 1 until f.size) {
        if (t <= f[i].at) {
            val a = f[i - 1]
            val b = f[i]
            val local = (t - a.at) / (b.at - a.at)
            val e = if (kind == "shake") local else EaseIO.transform(local)
            return blend(a.pose, b.pose, e)
        }
    }
    return Pose.None
}

/** Golpe recibido: retrocede y vuelve (@keyframes knockBack). [kb]: 1 empuja a la derecha (enemigos), -1 a la izquierda. */
fun knockPose(t: Float, kb: Float): Pose {
    val frames = listOf(
        0f to Pose.None,
        .12f to Pose(30 * kb, 0f, 10 * kb, .92f, 1.08f),
        .30f to Pose(14 * kb, 0f, 4 * kb, 1.06f, .94f),
        .48f to Pose(-6 * kb, 0f, -3 * kb),
        .66f to Pose(4 * kb, 0f, 1 * kb),
        1f to Pose.None
    )
    if (t <= 0f || t >= 1f) return Pose.None
    for (i in 1 until frames.size) if (t <= frames[i].first) {
        val a = frames[i - 1]; val b = frames[i]
        return blend(a.second, b.second, (t - a.first) / (b.first - a.first))
    }
    return Pose.None
}

// ---------------------------------------------------------------------------------------------------------------
// Estado de cada personaje en pantalla y efectos flotantes
// ---------------------------------------------------------------------------------------------------------------
/** Lo que anima un personaje: ataque en curso, golpe recibido, destello, caída y entrada. */
class Actor {
    val attack = Animatable(1f)
    var attackKind by mutableStateOf("lunge")
    var reach by mutableStateOf(Offset.Zero)
    var dir by mutableIntStateOf(1)
    val hit = Animatable(1f)
    var hitKb by mutableIntStateOf(1)
    val flash = Animatable(0f)
    val dying = Animatable(0f)
    val enter = Animatable(1f)
    val spawn = Animatable(1f)
    val ring = Animatable(1f)
    var ringColor by mutableStateOf(Color.Transparent)
    var hurtFace by mutableStateOf(false)
    val shiver = Animatable(1f)
    val defeated = Animatable(0f)
}

/** Número o aviso que sube y se desvanece sobre un personaje. */
class FloatFx(val id: Long, val anchor: String, val text: String, val sprite: String?, val color: Color, val dx: Float)

/** Golpe visual sobre un personaje: tipo (garras, tajo, puñetazo, estallido…). */
class HitFx(val id: Long, val anchor: String, val kind: String)

/** Proyectil que vuela de un personaje a otro. */
class ProjectileFx(val id: Long, val from: String, val to: String, val color: Color)

/** La carta jugada vuela desde donde se soltó hasta su objetivo. */
class FlyingCard(val id: Long, val card: Card, val from: Rect, val toAnchor: String)

class Banner(val id: Long, val anchor: String?, val text: String, val sprite: String?, val side: String)

val FxDamage = Color(0xFFD93A52)
val FxBlock = Color(0xFF2F8E72)
val FxHeal = Color(0xFF4E9A35)
val FxPoison = Color(0xFF7A5BC4)
val FxStatus = Color(0xFFD86A3E)
val FxEnergy = Color(0xFFD9791F)
val FxGold = Color(0xFFC98A00)

/**
 * Reproduce un combate: cada acción llama al motor en el momento del golpe y anima lo que pasó, con los
 * mismos tiempos de la versión web (ANIMS, playCard, endTurn). La pantalla solo lee estas propiedades.
 */
class CombatController(
    private val run: Run,
    val combat: Combat,
    private val scope: CoroutineScope,
    private val toast: (String) -> Unit,
    private val onFinished: (String) -> Unit,
    private val audio: GameAudio = NoAudio
) {
    /** Una animación está en curso: no se aceptan más jugadas. */
    var busy by mutableStateOf(true)
        private set
    var selected by mutableIntStateOf(-1)
    /** Dónde se soltaría la carta que se arrastra ahora: "enemy-i", "self" o null. */
    var hover by mutableStateOf<String?>(null)
    /** Daño que haría la carta arrastrada contra el enemigo sobre el que está (para el cartelito). */
    var dropPreview by mutableStateOf<Pair<String, PreviewResult>?>(null)
    var hiddenSlot by mutableStateOf(-1L)
    var ended by mutableStateOf(false)
        private set
    /** null = no se arrastra nada; true = la carta arrastrada necesita un enemigo; false = es para ti. */
    var dragNeeds by mutableStateOf<Boolean?>(null)
    /** La mano vuela al descarte (fin de turno). */
    var discarding by mutableStateOf(false)
        private set
    /** Explicación de algo (estado, intención, regla): título y texto; se cierra tocando. */
    var info by mutableStateOf<Pair<String, String>?>(null)
    /** Pila que se quiere ver ("draw" | "discard" | "exhaust"). */
    var pileView by mutableStateOf<String?>(null)

    val actors = List(5) { Actor() } // 0 = jugador, 1..4 = enemigos
    val floats = mutableStateListOf<FloatFx>()
    val hits = mutableStateListOf<HitFx>()
    val projectiles = mutableStateListOf<ProjectileFx>()
    val banners = mutableStateListOf<Banner>()
    var flying by mutableStateOf<FlyingCard?>(null)
    /** Centro de cada personaje en la pantalla (px de pantalla), lo llena la interfaz. */
    val anchors = HashMap<String, Rect>()
    /** Px de pantalla por px de diseño (lo pone la pantalla). */
    var pxPerUnit = 1f
    /** Texto de la acción del enemigo que está actuando (su globo de intención pulsa). */
    var acting by mutableIntStateOf(-1)
        private set
    var turnBanner by mutableStateOf<Pair<Long, String>?>(null)
        private set
    var orangeNope by mutableIntStateOf(0)
        private set
    var deckBump by mutableIntStateOf(0)
        private set

    private var nextId = 1L
    private var slots = ArrayList<Pair<Long, String>>()
    private var seen = HashSet<Int>()
    private var alive = BooleanArray(5)
    private var result: String? = null
    private var finishing = false
    private var wantsEndTurn = false

    /** Lo que dibuja la pantalla; se vuelve a leer del motor con [refresh] después de cada acción. */
    var ui by mutableStateOf(buildUi())
        private set

    fun actor(key: String): Actor = if (key == "player") actors[0] else actors[1 + key.removePrefix("enemy-").toInt()]

    init {
        combat.enemies.forEach { seen.add(System.identityHashCode(it)) }
        alive = BooleanArray(5) { i -> i >= 1 && combat.enemies.getOrNull(i - 1)?.isAlive() == true }
        refresh()
        scope.launch { entrance() }
    }

    /** Se llama desde el motor cuando el combate termina (gana o pierde). */
    fun onEnd(r: String) {
        result = r
        audio.play(if (r == "lose") Sfx.LOSE else Sfx.WIN)
    }

    private fun id() = nextId++

    // ---------- instantánea para la pantalla ----------
    private fun syncSlots() {
        val hand = combat.player.hand
        val old = ArrayList(slots)
        val out = ArrayList<Pair<Long, String>>()
        for (cardId in hand) {
            val k = old.indexOfFirst { it.second == cardId }
            if (k >= 0) out.add(old.removeAt(k)) else out.add(id() to cardId)
        }
        slots = out
    }

    private fun combatantOf(e: EnemyInstance, i: Int): CombatantUi {
        val hidden = combat.rule?.info?.hideIntent == true && combat.turnNumber % 2 == 1
        val sprite = e.def.phaseSprites?.getOrNull(e.phase) ?: e.def.sprite ?: e.def.id
        val name = e.def.phaseNames?.getOrNull(e.phase) ?: e.name
        val intent = if (!e.isAlive()) null else if (hidden) IntentUi("unknown", "ui_up", "?", emptyList(), unknown = true, title = combat.rule?.info?.name ?: "Oscuridad", tip = "Está muy oscuro: en los turnos impares no ves lo que hará el enemigo.") else intentOf(combat, e)
        return CombatantUi("enemy-$i", sprite, name, e.hp, e.maxHp, e.block, statusesOf(e), e.isAlive(), e.def.tier, 0, e.def.idle ?: "float", intent)
    }

    private fun buildUi(): CombatUi {
        val c = combat
        val p = c.player
        syncSlots()
        val playerTurn = c.turn == "player" && !c.ended
        val me = CombatantUi(
            "player", p.characterId, p.name, p.hp, p.maxHp, p.block, statusesOf(p), p.isAlive(), "player",
            hurtStageFor(p.hp, p.maxHp), "float", null, p.characterId
        )
        val enemies = c.enemies.mapIndexed { i, e -> combatantOf(e, i) }
        val hand = slots.map { (key, cardId) ->
            val card = Cards.get(cardId)!!
            HandCardUi(key, card, !card.unplayable && card.cost <= p.energy && playerTurn, if (card.unplayable) null else c.previewCard(card, null))
        }
        val rule = c.rule?.info
        val garden = p.garden.mapNotNull { s -> Sprouts.get(s.type)?.let { GardenUi(it.sprite, s.timer, it.name, it.effect) } }
        return CombatUi(
            me, enemies, hand, p.energy, p.maxEnergy, p.drawPile.size, p.discardPile.size, p.exhaustPile.size,
            c.turnNumber, playerTurn, rule?.name, rule?.sprite, rule?.desc, garden, p.characterId == "uva" || p.garden.isNotEmpty(),
            run.combatKind
        )
    }

    /** Vuelve a leer el motor y detecta enemigos que cayeron o aparecieron. */
    fun refresh() {
        val c = combat
        c.enemies.forEachIndexed { i, e ->
            val a = actors[1 + i]
            if (seen.add(System.identityHashCode(e))) {
                // enemigo invocado en este hueco: cae desde arriba
                alive[1 + i] = false
                scope.launch { a.dying.snapTo(0f); a.spawn.snapTo(0f); a.spawn.animateTo(1f, tween(600, easing = CubicBezierEasing(.34f, 1.36f, .64f, 1f))) }
            }
            val now = e.isAlive()
            if (alive[1 + i] && !now) {
                audio.play(Sfx.ENEMY_DEATH)
                scope.launch { a.dying.snapTo(0f); a.dying.animateTo(1f, tween(900, easing = EaseIO)) }
            }
            alive[1 + i] = now
        }
        ui = buildUi()
    }

    // ---------- tiempos ----------
    private suspend fun entrance() {
        actors.forEach { a -> a.enter.snapTo(0f) }
        actors.forEachIndexed { i, a -> scope.launch { delay(100L + max(0, i - 1) * 100L); a.enter.animateTo(1f, tween(1100, easing = LinearEasing)) } }
        delay(1250)
        showTurn("¡Tu turno!", yours = true)
        busy = false
        checkFinish()
    }

    private fun showTurn(text: String, yours: Boolean) {
        audio.play(if (yours) Sfx.TURN_PLAYER else Sfx.TURN_ENEMY)
        val key = id()
        turnBanner = key to text
        scope.launch { delay(1300); if (turnBanner?.first == key) turnBanner = null }
    }

    private fun banner(anchor: String, text: String, sprite: String?) {
        val b = Banner(id(), anchor, text, sprite, if (anchor == "player") "player" else "enemy")
        banners.add(b)
        scope.launch { delay(1300); banners.remove(b) }
    }

    private fun centerOf(key: String): Offset? = anchors[key]?.center

    private suspend fun playAnim(key: String, kind: String, targetKey: String?): AnimInfo {
        val info = ANIMS[kind] ?: ANIMS.getValue("cast")
        val a = actor(key)
        val me = centerOf(key)
        val tg = targetKey?.let { centerOf(it) }
        a.dir = if (key == "player") 1 else -1
        // las poses van en px de diseño; las posiciones medidas, en px de pantalla
        a.reach = if (me != null && tg != null && info.melee) Offset((tg.x - me.x) * .72f / pxPerUnit, (tg.y - me.y) * .5f / pxPerUnit) else Offset.Zero
        a.attackKind = kind
        scope.launch {
            a.attack.snapTo(0f)
            a.attack.animateTo(1f, tween(info.dur, easing = LinearEasing))
        }
        // anillo de las acciones sobre sí mismo
        if (kind == "guard" || kind == "heal" || kind == "power" || kind == "cast") {
            a.ringColor = when (kind) { "guard" -> Color(0xFF5CC9A7); "heal" -> Color(0xFF7BBF5A); else -> Color(0xFFFF9E7A) }
            scope.launch { a.ring.snapTo(0f); a.ring.animateTo(1f, tween(600)) }
        }
        return info
    }

    private fun cardAnim(card: Card): String {
        if (card.type == "power") return "power"
        if (card.type != "attack") return if (Regex("cáscara|corteza", RegexOption.IGNORE_CASE).containsMatchIn(card.description)) "guard" else "cast"
        return when (card.fx) { "punch", "stab" -> "lunge"; "bite" -> "bite"; "slash" -> "slash"; "spin" -> "spin"; "burst" -> "charge"; else -> "throw" }
    }

    fun needsTarget(card: Card): Boolean = if (card.target != null) card.target == "enemy" else card.type == "attack"

    fun aliveEnemyIndexes(): List<Int> = combat.enemies.mapIndexedNotNull { i, e -> if (e.isAlive()) i else null }

    fun canPlayNow(): Boolean = !busy && !combat.ended && combat.turn == "player" && result == null

    /** Tocar una carta la selecciona (no la juega). */
    fun select(i: Int) {
        if (!canPlayNow()) return
        audio.play(Sfx.SELECT)
        selected = if (selected == i) -1 else i
    }

    fun showInfo(title: String, text: String) { info = title to text }
    fun showPile(which: String) { pileView = which }

    private fun handCard(idx: Int): Card? = Cards.get(combat.player.hand.getOrNull(idx))

    /** Qué pasaría si se suelta la carta [idx] en [pos] (px de diseño): "enemy-i", "self" o null. */
    fun dropResult(idx: Int, pos: Offset, density: Float): String? {
        val card = handCard(idx) ?: return null
        if (!needsTarget(card)) return if (pos.y < PLAY_LINE) "self" else null
        val zones = aliveEnemyIndexes().mapNotNull { i ->
            anchors["zone-enemy-$i"]?.let { r -> i to Rect(r.left / density, r.top / density, r.right / density, r.bottom / density) }
        }
        zones.firstOrNull { (_, r) -> pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom }?.let { return "enemy-${it.first}" }
        if (zones.size == 1 && pos.y < PLAY_LINE) return "enemy-${zones[0].first}"
        return null
    }

    /** Mientras se arrastra: marca el objetivo y calcula lo que haría la carta contra él. */
    fun updateHover(idx: Int, pos: Offset, density: Float) {
        val card = handCard(idx) ?: return
        val res = dropResult(idx, pos, density)
        if (res == hover) return
        hover = res
        dropPreview = if (res == null || card.unplayable) null else {
            val target = if (res == "self") null else combat.enemies.getOrNull(res.removePrefix("enemy-").toInt())
            (if (res == "self") "player" else res) to combat.previewCard(card, target)
        }
    }

    fun endDrag() { hover = null; dropPreview = null; dragNeeds = null }

    /** (vida, cáscara) del enemigo [key] para el cartelito del daño. */
    fun previewTarget(key: String): Pair<Int, Int>? =
        key.takeIf { it.startsWith("enemy-") }?.let { combat.enemies.getOrNull(it.removePrefix("enemy-").toInt()) }?.let { it.hp to it.block }

    fun tryPlay(handIndex: Int, targetIdx: Int?, from: Rect?) {
        if (!canPlayNow()) return
        val card = Cards.get(combat.player.hand.getOrNull(handIndex) ?: return) ?: return
        if (card.unplayable) { audio.play(Sfx.DENIED); toast("Esa carta no se puede jugar"); return }
        if (card.cost > combat.player.energy) { audio.play(Sfx.DENIED); orangeNope++; toast("¡No te alcanza la energía!"); return }
        var target = targetIdx
        val needs = needsTarget(card)
        val alive = aliveEnemyIndexes()
        if (needs && target == null) {
            if (alive.size != 1) { audio.play(Sfx.DENIED); toast("Arrastra la carta hacia el enemigo que quieras atacar"); return }
            target = alive[0]
        }
        // Provocación: el golpe se desvía al enemigo que provoca
        if (needs && target != null) {
            val ti = combat.tauntIndex()
            if (ti >= 0 && ti != target && combat.enemies[target].getStatus("taunt") == 0) { target = ti; toast("¡Provocación! Tu golpe tiene que ir contra este enemigo") }
        }
        scope.launch { playCardSeq(handIndex, card, if (needs) target else null, needs, from) }
    }

    private suspend fun playCardSeq(i: Int, card: Card, target: Int?, needs: Boolean, from: Rect?) {
        val c = combat
        busy = true
        selected = -1
        hover = null
        dropPreview = null
        audio.play(when (card.type) { "attack" -> Sfx.CARD_ATTACK; "power" -> Sfx.CARD_POWER; else -> Sfx.CARD_SKILL })
        val flySide = if (needs) "enemy-$target" else "player"
        val slotKey = slots.getOrNull(i)?.first ?: -1L
        hiddenSlot = slotKey
        if (from != null) {
            flying = FlyingCard(id(), card, from, flySide)
        }
        banner("player", card.name, card.sprite)
        val alive = aliveEnemyIndexes()
        val aimKey = if (card.type == "attack") "enemy-${if (needs) target else alive.firstOrNull() ?: 0}" else null
        val anim = cardAnim(card)
        val info = playAnim("player", anim, aimKey)
        if (card.type == "attack" && !info.melee) {
            val targets = if (needs) listOf(target!!) else alive
            scope.launch {
                delay(max(0, info.hit - 240).toLong())
                targets.forEachIndexed { k, t -> scope.launch { delay(k * 60L); shoot("player", "enemy-$t", card.fx) } }
            }
        }
        delay(info.hit.toLong())
        flying = null
        c.playCard(i, if (needs) target else null)
        hiddenSlot = -1L
        refresh()
        spawnFx(c.lastEvents, card.fx ?: "punch")
        delay(max(260, info.dur - info.hit - 120).toLong())
        if (!c.ended) busy = false
        afterEngine()
    }

    // ---------- semillas (la bolsa de la mochila) ----------
    /** Hueco de la bolsa cuya semilla se está apuntando (hay que tocar a un enemigo), o -1. */
    var seedAiming by mutableIntStateOf(-1)
        private set

    /** Las semillas se usan en tu turno, sin animaciones en curso. */
    fun canUseSeedNow(): Boolean = canPlayNow()

    /**
     * Usa la semilla del hueco [slot]. Si necesita un enemigo y hay varios vivos, espera a que se toque uno
     * ([useSeedOn]); si no, se usa al momento. Devuelve un aviso si no se pudo.
     */
    fun useSeedFromBag(slot: Int): String? {
        if (!canUseSeedNow()) return "Las semillas se usan en combate, en tu turno"
        val seed = run.player.seeds.getOrNull(slot)?.let { Seeds.get(it) } ?: return null
        selected = -1
        val alive = aliveEnemyIndexes()
        if (seed.target == "enemy" && alive.size > 1) { seedAiming = slot; return "Toca al enemigo que quieras" }
        scope.launch { useSeedSeq(slot, if (seed.target == "enemy") alive.firstOrNull() else null) }
        return null
    }

    fun useSeedOn(enemyIdx: Int) {
        val slot = seedAiming
        if (slot < 0) return
        seedAiming = -1
        if (canUseSeedNow()) scope.launch { useSeedSeq(slot, enemyIdx) }
    }

    fun cancelSeedAim() { seedAiming = -1 }

    private suspend fun useSeedSeq(slot: Int, target: Int?) {
        val c = combat
        val id = run.player.seeds.getOrNull(slot) ?: return
        val seed = Seeds.get(id) ?: return
        busy = true
        audio.play(Sfx.SEED_USE)
        run.player.seeds[slot] = null
        banner("player", seed.name, null)
        playAnim("player", "cast", null)
        delay(320)
        c.useSeed(id, target)
        refresh()
        spawnFx(c.lastEvents, "burst")
        delay(400)
        if (!c.ended) busy = false
        afterEngine()
    }

    /** Terminar el turno: la mano se descarta y cada enemigo vivo actúa, uno detrás de otro. */
    fun endTurn() {
        if (!canPlayNow()) {
            if (busy && !combat.ended && combat.turn == "player") wantsEndTurn = true
            return
        }
        wantsEndTurn = false
        scope.launch { endTurnSeq() }
    }

    private suspend fun endTurnSeq() {
        val c = combat
        busy = true
        selected = -1
        // 1) la mano vuela al descarte
        deckBump++
        discarding = true
        delay(if (c.player.hand.isEmpty()) 100 else 400L + c.player.hand.size * 45L)
        c.endPlayerTurn()
        refresh()
        discarding = false
        spawnFx(c.lastEvents, null)
        if (afterEngine()) return
        // 2) turno enemigo
        showTurn(if (c.aliveEnemies().size > 1) "Turno de los enemigos" else "Turno del enemigo", yours = false)
        delay(900)
        for (k in 0 until c.enemies.size) {
            if (c.ended) return
            val e = c.enemies[k]
            if (!e.isAlive()) continue
            val side = "enemy-$k"
            acting = k
            if (e.getStatus("frozen") != 0) {
                scope.launch { actors[1 + k].shiver.snapTo(0f); actors[1 + k].shiver.animateTo(1f, tween(300, easing = LinearEasing)) }
                delay(250)
                c.enemyAct(k)
                refresh()
                spawnFx(c.lastEvents, null)
                delay(750)
                continue
            }
            val move = e.nextMove!!
            val anim = move.anim ?: if (move.damage != 0) "lunge" else "cast"
            banner(side, move.name, if (move.damage != 0) "ui_sword" else if (move.summon != null) "node_mystery" else if (move.apply != null) "st_weak" else if (move.heal != 0 || move.healAll != 0) "ui_heal" else if (move.block != 0 && move.self == null) "ui_shield" else "ui_up")
            val info = playAnim(side, anim, "player")
            if (move.damage != 0 && !info.melee && move.fx != null) {
                scope.launch { delay(max(0, info.hit - 230).toLong()); shoot(side, "player", move.fx) }
            }
            delay(info.hit.toLong())
            c.enemyAct(k)
            refresh()
            spawnFx(c.lastEvents, move.fx ?: "claw")
            delay(max(300, info.dur - info.hit) + c.lastEvents.size * 110L + 120)
        }
        acting = -1
        if (c.ended) { afterEngine(); return }
        // 3) estados de los enemigos y nuevo turno: se reparte la mano
        c.endEnemyTurn()
        refresh()
        spawnFx(c.lastEvents, null)
        if (afterEngine()) return
        showTurn("¡Tu turno!", yours = true)
        delay(400)
        if (!c.ended) busy = false
    }

    /** Si el combate terminó, deja ver el golpe final y avisa. Devuelve true si terminó. */
    private fun afterEngine(): Boolean {
        if (result == null) return false
        checkFinish()
        return true
    }

    private fun checkFinish() {
        val r = result ?: return
        if (finishing) return
        finishing = true
        ended = true
        busy = true
        scope.launch {
            if (r == "lose") { delay(350); actors[0].defeated.animateTo(1f, tween(900)) }
            delay(if (r == "lose") 1150 else 1500)
            onFinished(r)
        }
    }

    // ---------- efectos ----------
    private fun floatText(key: String, text: String, sprite: String?, color: Color) {
        val f = FloatFx(id(), key, text, sprite, color, (Math.random().toFloat() - .5f) * 50f)
        floats.add(f)
        scope.launch { delay(1200); floats.remove(f) }
    }

    private fun hitFx(key: String, kind: String) {
        val h = HitFx(id(), key, kind)
        hits.add(h)
        scope.launch { delay(650); hits.remove(h) }
    }

    private suspend fun shoot(from: String, to: String, kind: String?) {
        val color = when (kind) { "seeds" -> Color(0xFF7BBF5A); "splash" -> Color(0xFFFFE27A); "splat" -> Color(0xFFB7E27F); "ice" -> Color(0xFFCDEBF5); "burst" -> Color(0xFFFFA64D); "shock" -> Color(0xFFC9D3DC); else -> Color(0xFFB7E27F) }
        val p = ProjectileFx(id(), from, to, color)
        projectiles.add(p)
        delay(400)
        projectiles.remove(p)
    }

    private fun spawnFx(events: List<CombatEvent>, fx: String?) {
        events.forEachIndexed { idx, ev -> scope.launch { delay(idx * 130L); spawnOne(ev, fx) } }
    }

    private fun actorOrNull(key: String): Actor? = if (key == "player" || key.startsWith("enemy-")) actor(key) else null

    private suspend fun hurt(key: String, poison: Boolean) {
        val a = actorOrNull(key) ?: return
        a.hitKb = if (key == "player") -1 else 1
        scope.launch { a.hit.snapTo(0f); a.hit.animateTo(1f, tween(550, easing = LinearEasing)) }
        scope.launch { a.flash.snapTo(.9f); a.flash.animateTo(0f, tween(500)) }
        a.hurtFace = true
        scope.launch { delay(600); a.hurtFace = false }
    }

    private suspend fun spawnOne(ev: CombatEvent, fx: String?) {
        val t = ev.type
        val target = ev.target
        when (t) {
            "seed" -> return
            "reshuffle" -> { audio.play(Sfx.SHUFFLE); toast("¡Barajeando! ${ev.amount} cartas vuelven a la pila de robo"); deckBump++; return }
            "rule" -> { ev.str("text")?.let { toast(it) }; return }
            "taunt" -> { toast("¡Provocación! Tu golpe tiene que ir contra este enemigo"); return }
            "stealcard" -> { floatText("player", "-1 ${Cards.get(ev.str("cardId"))?.name ?: "carta"}", "st_thief", FxDamage); return }
            "returncards" -> { floatText("player", "+${ev.amount} cartas recuperadas", "st_thief", FxHeal); return }
            "breed" -> { floatText(target, "¡Cría!", "st_breed", FxStatus); return }
            "drainenergy" -> { orangeNope++; floatText("player", "-${ev.amount} energía", "st_drained", FxPoison); return }
            "relic" -> return
            "exhaust" -> { deckBump++; return }
            "addcard" -> {
                val card = Cards.get(ev.str("cardId"))
                if (card != null && card.type == "curse") toast("¡${card.name} ${if (ev.amount > 1) "×${ev.amount} " else ""}va a ${if (ev.str("where") == "hand") "tu mano" else if (ev.str("where") == "draw") "tu pila de robo" else "tu descarte"}!")
                deckBump++
                return
            }
            "steal" -> { floatText("player", "-${ev.amount} oro", "ui_coin", FxDamage); audio.play(Sfx.COIN); return }
            "gold" -> { floatText("player", "+${ev.amount} oro", "ui_coin", FxHeal); audio.play(Sfx.COIN); return }
            "skip" -> { hitFx(target, "ice"); floatText(target, "¡Congelado!", "st_frozen", FxStatus); return }
            "plant", "harvest" -> {
                if (t == "harvest") Sprouts.get(ev.str("sprout") ?: "")?.let { floatText("player", "¡Cosecha! ${it.name}", it.sprite, FxHeal) }
                return
            }
            "energy" -> { floatText("player", "+${ev.amount} energía", null, FxEnergy); return }
            "negate" -> { floatText(target, "¡Anulado! ${statusName(ev.str("statusId") ?: "")}", "st_wax", FxStatus); return }
            "revive" -> { floatText(target, "¡Revive!", "st_regrow", FxHeal); return }
            "split" -> { floatText(target, "¡Se divide!", "st_split", FxStatus); return }
            "flee" -> { floatText(target, "¡Huye!", null, FxStatus); return }
            "explode" -> { hitFx(target, "burst"); floatText(target, "¡BOOM!", null, FxDamage); return }
            "clock" -> { toast("¡Se acabó el tiempo! El enemigo se enfurece."); return }
            "summon" -> { return }
        }
        val a = actorOrNull(target) ?: return
        if (t == "damage" && !ev.flag("poison") && ev.int("blocked") > 0 && !ev.flag("split")) {
            val from = ev.str("from")
            if (!ev.flag("thorns") && from != null) hitFx(target, if (from == "player") (fx ?: "punch") else (fx ?: "claw"))
            if (ev.flag("thorns")) hitFx(target, "sting")
            floatText(target, "-${ev.int("blocked")} cáscara", "ui_shield", FxBlock)
            scope.launch { a.ring.snapTo(0f); a.ringColor = Color(0xFF5CC9A7); a.ring.animateTo(1f, tween(550)) }
            audio.play(Sfx.BLOCK)
            val rest = ev.amount - ev.int("blocked")
            if (rest > 0) {
                delay(520)
                spawnOne(CombatEvent("damage", target, rest, mapOf("from" to null, "split" to true, "thorns" to ev.flag("thorns"))), fx)
            }
            return
        }
        val label = when (t) {
            "status" -> " ${statusName(ev.str("statusId") ?: "")}"
            "block" -> " cáscara"
            else -> if (ev.flag("maxHp")) " ❤️ máx." else if (ev.flag("thorns")) " pinchos" else if (ev.flag("poison")) " pudrición" else ""
        }
        val sign = if (t == "damage") "-" else "+"
        val frozenStatus = t == "status" && ev.str("statusId") == "frozen"
        val sprite: String; val color: Color
        when (t) {
            "damage" -> { sprite = if (ev.flag("poison")) "st_poison" else "ui_hit"; color = if (ev.flag("poison")) FxPoison else FxDamage }
            "block" -> { sprite = "ui_shield"; color = FxBlock }
            "heal" -> { sprite = "ui_heal"; color = FxHeal }
            "status" -> { val s = Statuses.get(ev.str("statusId") ?: ""); sprite = s?.sprite ?: "ui_up"; color = if (s?.kind == "debuff") FxPoison else FxStatus }
            else -> { sprite = "ui_up"; color = FxStatus }
        }
        floatText(target, (if (frozenStatus) "" else "$sign${ev.amount}") + label, sprite, color)
        when (t) {
            "damage" -> {
                if (!ev.flag("poison") && !ev.flag("thorns") && ev.str("from") != null) hitFx(target, if (ev.str("from") == "player") (fx ?: "punch") else (fx ?: "claw"))
                if (ev.flag("thorns")) hitFx(target, "sting")
                if (ev.int("blocked") > 0 && ev.int("blocked") >= ev.amount) {
                    audio.play(Sfx.BLOCK)
                    scope.launch { a.ring.snapTo(0f); a.ringColor = Color(0xFF5CC9A7); a.ring.animateTo(1f, tween(550)) }
                } else {
                    audio.play(if (ev.flag("poison")) Sfx.POISON_TICK else Sfx.HIT)
                    hurt(target, ev.flag("poison"))
                }
            }
            "block" -> { audio.play(Sfx.BLOCK); scope.launch { a.ring.snapTo(0f); a.ringColor = Color(0xFF5CC9A7); a.ring.animateTo(1f, tween(550)) } }
            "heal" -> { audio.play(Sfx.HEAL); scope.launch { a.ring.snapTo(0f); a.ringColor = Color(0xFF7BBF5A); a.ring.animateTo(1f, tween(550)) } }
            "status" -> {
                if (frozenStatus) hitFx(target, "ice")
                audio.play(if (Statuses.get(ev.str("statusId") ?: "")?.kind == "debuff") Sfx.DEBUFF else Sfx.BUFF)
            }
        }
    }
}
