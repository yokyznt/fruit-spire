package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Rect
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.yokyznt.fruitspire.core.BuyResult
import com.yokyznt.fruitspire.core.Cosmetics
import com.yokyznt.fruitspire.core.MusicContext
import com.yokyznt.fruitspire.core.NodeType
import com.yokyznt.fruitspire.core.Pass
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Pos
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.Save
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.CollectionState
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.Flight
import com.yokyznt.fruitspire.nativo.ui.GameAudio
import com.yokyznt.fruitspire.nativo.ui.HudAnchors
import com.yokyznt.fruitspire.nativo.ui.MapPan
import com.yokyznt.fruitspire.nativo.ui.NoAudio
import com.yokyznt.fruitspire.nativo.ui.PickFlash
import com.yokyznt.fruitspire.nativo.ui.TableController
import com.yokyznt.fruitspire.nativo.ui.intro
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Cuánto espera una pantalla de premios, tras recoger el último, para seguir sola (lo que tarda en llegar a la barra). */
const val SOON_MS = 1200L

/** Pantalla de más arriba de la app: menú, elegir fruta o una partida en curso. */
enum class AppScreen { MENU, CHARACTER_SELECT, RUN, PASS, WARDROBE, COLLECTION, NOTES, STORY, ENDING }

/** La transición «¡A pelear!» antes de cada combate. */
class IntroUi(val title: String, val names: String, val sprites: List<String>, val kind: String, val act: Int)

/**
 * Une el core (la partida) con las pantallas: llama a las acciones de [Run], guarda después de cada una y
 * avisa a Compose con [tick] (la partida es un objeto mutable que Compose no puede observar sola).
 */
class GameViewModel(app: Application) : AndroidViewModel(app) {
    private val store = SaveStore(app)

    var progress: Progress = Save.decodeProgress(store.readProgress())
        private set
    var screen by mutableStateOf(AppScreen.MENU)
        private set
    var run: Run? by mutableStateOf(null)
        private set
    /** Sube cada vez que algo de la partida cambia (las pantallas lo leen para redibujarse). */
    var tick by mutableIntStateOf(0)
        private set
    var canContinue by mutableStateOf(store.hasRun())
        private set

    var selectedChar by mutableStateOf("manzana")
        private set
    var selectedDiff by mutableStateOf("madura")
        private set

    var combat: CombatController? by mutableStateOf(null)
        private set
    var combatBg = "kitchen"
        private set
    var intro: IntroUi? by mutableStateOf(null)
        private set
    /** Casilla a la que camina la ficha (null = quieta). */
    var moving: Pos? by mutableStateOf(null)
        private set
    /** Visor de cartas abierto: título, nota y cartas. */
    var deckView: Triple<String, String, List<String>>? by mutableStateOf(null)
    val pan = MapPan()

    /** Avisos cortos; los pone la actividad. */
    var toast: (String) -> Unit = {}

    /**
     * Scope de la composición: lo necesitan las animaciones del combate (Animatable pide el reloj de cuadros de
     * Compose, que viewModelScope no tiene). Lo pone la pantalla de la partida.
     */
    var uiScope: kotlinx.coroutines.CoroutineScope? = null

    /** El sonido (lo pone la actividad; sin él, como en las pruebas y las vistas previas, no suena nada). */
    var audio: GameAudio = NoAudio

    /** Lo que se les da a los controladores de combate y de mesa: siempre habla con el sonido de ahora, aunque la actividad se recree. */
    private val sound = object : GameAudio {
        override fun play(sfx: Sfx, variant: Int) = audio.play(sfx, variant)
        override fun music(place: String?) = audio.music(place)
        override fun pause() = audio.pause()
        override fun resume() = audio.resume()
        override fun settingChanged(key: String) = audio.settingChanged(key)
        override fun release() = audio.release()
    }

    /**
     * Qué lista de canciones toca ahora (`musicContextFor` de la web): la del menú fuera de una partida, y dentro la de la
     * pantalla en que vas. La pantalla de la raíz la lee para cambiar de canción cuando cambia.
     */
    fun musicPlace(): String {
        tick // la partida cambia sin que Compose se entere: se vuelve a calcular con cada cambio
        val r = run
        return if (screen == AppScreen.RUN && r != null) MusicContext.forRun(r.screen, r.combatKind, r.player.act) else MusicContext.MENU
    }

    private fun bump() { tick++ }

    /** La portada de un piso nuevo (el primero, o el que sigue al subir) suena con su fanfarria. */
    private fun fanfareIfNewFloor(r: Run) { if (r.screen == RunScreen.ACT_INTRO) audio.play(Sfx.ACT_FANFARE) }

    // ---------- menú ----------
    fun toMenu() {
        soonJob?.cancel(); soonJob = null
        flights.clear()
        combat = null
        intro = null
        moving = null
        deckView = null
        flash = null
        bagOpen = false
        screen = AppScreen.MENU
        canContinue = store.hasRun()
    }

    fun newGame() { screen = AppScreen.CHARACTER_SELECT }

    fun selectChar(id: String) {
        selectedChar = id
        if (!progress.isUnlocked(id, selectedDiff)) selectedDiff = World.difficulties[progress.level(id)].id
    }

    fun selectDiff(id: String) {
        if (!progress.isUnlocked(selectedChar, id)) { toast("Gana en el grado anterior con esta fruta para desbloquearlo"); return }
        selectedDiff = id
    }

    fun play() {
        Rng.unseed()
        val r = Run.start(selectedChar, selectedDiff, progress)
        enter(r)
        persistProgress()
        startStory(replay = false) // primero la historia; la portada del piso (con su fanfarria) viene al terminarla
    }

    // ---------- historia y final ----------
    /** La historia o el final que se está viendo se repite desde las Notas (al terminar vuelve al menú). */
    var cineReplay by mutableStateOf(false)
        private set

    fun startStory(replay: Boolean) { cineReplay = replay; screen = AppScreen.STORY }

    fun finishStory() {
        if (cineReplay) { toMenu(); return }
        screen = AppScreen.RUN
        run?.let { fanfareIfNewFloor(it) }
        bump()
    }

    fun startEnding(replay: Boolean) {
        if (!replay) { progress.markEndingSeen(); persistProgress() }
        cineReplay = replay
        screen = AppScreen.ENDING
    }

    fun finishEnding() {
        if (cineReplay) { toMenu(); return }
        screen = AppScreen.RUN // la pantalla de victoria
        bump()
    }

    /** La fruta de la historia (la de tu partida, o la elegida si la repites desde las Notas), su nombre y el último jefe. */
    fun cineHeroId(): String = run?.player?.characterId ?: selectedChar
    fun cineHeroName(): String = World.character(cineHeroId())?.name ?: "Manzana"
    fun cineBossId(): String? = run?.lastBossId

    fun continueGame() {
        val text = store.readRun()
        val r = text?.let { Save.decode(it, progress) }
        if (r == null) { store.clearRun(); canContinue = false; toast("No se pudo leer la partida guardada"); return }
        enter(r)
    }

    private fun enter(r: Run) {
        run = r
        combat = null
        intro = null
        moving = null
        pan.ready = false
        screen = AppScreen.RUN
        persist()
        bump()
    }

    // ---------- guardado ----------
    private fun persist() {
        val r = run ?: return
        r.syncFound() // lo que llevas cuenta como encontrado para la Colección
        if (r.isOver) { store.clearRun(); canContinue = false; persistProgress(); return }
        if (Save.shouldSave(r)) { store.writeRun(Save.encode(r)); canContinue = true }
        if (progress.dirty) persistProgress() // experiencia del pase, mascotitas nuevas…
    }

    private fun persistProgress() {
        store.writeProgress(Save.encodeProgress(progress))
        progress.dirty = false
    }

    // ---------- colección y notas ----------
    /** Lo que se mira en la Colección (pestaña, ficha elegida): sigue igual al volver. */
    val collection = CollectionState()

    fun openCollection() {
        run?.syncFound()
        if (collection.fresh) { // la primera vez, el bestiario abre en el castillo de tu partida
            collection.fresh = false
            collection.bestTab = (run?.player?.act ?: 1).coerceIn(1, 3)
        }
        if (progress.dirty) persistProgress()
        screen = AppScreen.COLLECTION
    }

    /** Abrir las notas las marca como leídas (se quita el puntito del menú). */
    fun openNotes() {
        progress.openNotes()
        persistProgress()
        screen = AppScreen.NOTES
    }

    // ---------- pase de batalla y vestidor ----------
    /** Fruta que se está viendo en el vestidor. */
    var wardrobeChar by mutableStateOf("manzana")
        private set

    fun openPass() { screen = AppScreen.PASS }

    fun openWardrobe() {
        wardrobeChar = run?.player?.characterId ?: selectedChar
        screen = AppScreen.WARDROBE
    }

    fun claimPassLevel(level: Int) {
        val c = Pass.claim(progress, level) ?: return
        audio.play(Sfx.EQUIP)
        persistProgress(); bump()
        toast("¡${c.name} desbloqueado!")
    }

    fun claimAllPass() {
        val got = Pass.claimAll(progress)
        if (got.isEmpty()) return
        audio.play(Sfx.RELIC_GET)
        persistProgress(); bump()
        toast("¡${got.size} premio${if (got.size > 1) "s" else ""} reclamado${if (got.size > 1) "s" else ""}!")
    }

    fun wardrobeSelect(charId: String) { wardrobeChar = charId; bump() }

    /** Tocar algo en el vestidor: ponérselo (o quitárselo); si aún no se tiene, avisa cómo conseguirlo. */
    fun wardrobeEquip(id: String) {
        val c = Cosmetics.get(id) ?: return
        if (!progress.isOwned(id)) {
            toast(if (c.type == "pet") "Bloqueada. Para desbloquearla: ${Cosmetics.petHowText(c)}" else "Aún no lo tienes. Se gana subiendo de nivel en el Pase de Batalla.")
            return
        }
        audio.play(Sfx.EQUIP)
        progress.equip(wardrobeChar, id)
        persistProgress(); bump()
    }

    fun wardrobeClear(slot: String) { progress.unequipSlot(wardrobeChar, slot); persistProgress(); bump() }

    /** «Llevarla» en el aviso de una mascotita nueva. */
    fun wearPet(id: String) { run?.wearPet(id); audio.play(Sfx.EQUIP); persistProgress(); bump() }

    // ---------- portada y mapa ----------
    fun beginFloor() {
        val r = run ?: return
        r.beginFloor()
        persist()
        bump()
    }

    fun moveTo(x: Int, y: Int) {
        val r = run ?: return
        if (moving != null || intro != null || combat != null || !r.isReachable(x, y)) return
        moving = Pos(x, y)
        audio.play(Sfx.MAP_MOVE)
        val type = r.map.grid[y][x] // al llegar la casilla se consume: se lee antes
        viewModelScope.launch {
            delay(460)
            val pc = r.arrive(x, y)
            moving = null
            arrivalSound(type, r)
            if (pc != null) startIntro(pc) else persist()
            bump()
        }
    }

    /** Lo que suena al pisar una casilla (`enterNode` de js/game.js); los combates suenan en [startIntro]. */
    private fun arrivalSound(type: String, r: Run) {
        when (type) {
            NodeType.TREASURE, NodeType.VAULT -> audio.play(Sfx.CHEST_OPEN)
            NodeType.KEY -> audio.play(Sfx.SPARKLE)
            NodeType.MYSTERY -> audio.play(Sfx.EVENT_OPEN)
        }
        if (r.screen == RunScreen.MINIGAME) audio.play(Sfx.EVENT_OPEN) // las mesas suenan al abrirse, vengan de donde vengan
    }

    // ---------- mesas de juego ----------
    private var tableCtl: TableController? = null

    /** El controlador de la mesa en curso (se crea al abrirla, y se cambia cuando se abre otra). */
    fun tableController(): TableController? {
        val r = run ?: return null
        val t = r.table ?: return null
        tableCtl?.let { if (it.table === t && it.run === r) return it }
        return TableController(r, t, uiScope ?: viewModelScope, { persist() }, { bump() }, { toast(it) }, sound).also { tableCtl = it }
    }

    // ---------- combate ----------
    private val groundBgs = listOf("kitchen", "patio", "picnic", "tree")
    private val bossBgs = listOf("pantry", "tree")

    private fun startIntro(pc: PendingCombat) {
        val r = run ?: return
        audio.intro(strong = pc.kind == "elite" || pc.kind == "boss")
        val defs = pc.enemyIds.mapNotNull { Enemies.get(it) }
        val final = pc.kind == "boss" && defs.firstOrNull()?.final == true
        val title = if (final) "¡Jefe final!" else if (pc.kind == "boss") "¡Jefe!" else if (pc.kind == "elite") "¡Élite!" else "¡A pelear!"
        val names = if (defs.size > 1) defs.dropLast(1).joinToString(", ") { it.name } + " y " + defs.last().name else defs.firstOrNull()?.name ?: ""
        intro = IntroUi(title, names, defs.map { it.sprite ?: it.id }, pc.kind, r.player.act)
        viewModelScope.launch {
            delay(1050)
            if (intro == null || run !== r) return@launch
            beginCombat(pc)
            delay(600)
            intro = null
        }
    }

    private fun beginCombat(pc: PendingCombat) {
        val r = run ?: return
        combatBg = (if (pc.kind == "boss") bossBgs else groundBgs).random()
        // Un objeto que daña al empezar el turno (aura de ajo, lágrima sagrada) puede ganar el combate dentro del
        // propio constructor del motor, cuando el controlador todavía no existe: el resultado se guarda y se le da después.
        var ctl: CombatController? = null
        var earlyResult: String? = null
        val c = r.startCombat(pc, onEnd = { res -> val k = ctl; if (k != null) k.onEnd(res) else earlyResult = res })
        val made = CombatController(r, c, uiScope ?: viewModelScope, { toast(it) }, { result -> finishCombat(result) }, sound)
        ctl = made
        earlyResult?.let { made.onEnd(it) }
        combat = made
        bump()
    }

    private fun finishCombat(result: String) {
        val r = run ?: return
        combat = null
        val dungeonFight = r.combatKind == "dungeon"
        r.finishCombat(result)
        // casilla de calabozo vencida: aviso del oro que dio
        if (r.screen == RunScreen.DUNGEON && r.dungeonGold > 0) toast("+${r.dungeonGold} de oro")
        if (dungeonFight && r.screen == RunScreen.TREASURE) audio.play(Sfx.CHEST_OPEN) // la escalera de salida da un cofre
        persist()
        bump()
        if (r.screen == RunScreen.VICTORY) startEnding(replay = false) // vencer al jefe final: el final animado y luego la victoria
    }

    // ---------- premios que vuelan a la barra ----------
    /** Dónde está cada casilla de la barra de arriba (la barra las anota). */
    val hudAnchors = HudAnchors()
    /** Premios en el aire: la barra muestra lo real menos lo que aún vuela, y sube al llegar. */
    val flights = mutableStateListOf<Flight>()
    /** Dónde está cada premio por recoger en la pantalla ("loot:N", "card:ID"); lo anotan las pantallas de premios. */
    val lootRects = HashMap<String, Rect>()
    private var flightSeq = 0
    private var soonJob: Job? = null
    /** Cuánto espera [continueSoon] (las pruebas lo cambian). */
    var soonMs: Long = SOON_MS

    /** Lo que tenía la partida antes de recoger un premio: la diferencia es lo que vuela. */
    private class Snap(r: Run) { val gold = r.player.gold; val hp = r.player.hp; val maxHp = r.player.maxHp; val deck = r.player.deck.size }

    private fun launchFlight(r: Run, kind: String, itemId: String?, key: String, before: Snap) {
        val from = lootRects[key] ?: return
        val p = r.player
        flights.add(Flight(++flightSeq, kind, itemId, from, p.gold - before.gold, p.hp - before.hp, p.maxHp - before.maxHp, p.deck.size - before.deck))
    }

    fun landFlight(id: Int) { flights.removeAll { it.id == id } }

    // ---------- recompensas ----------
    fun collectLoot(i: Int) {
        val r = run ?: return
        val item = r.loot.getOrNull(i)
        val open = item?.isOpen == true
        val before = Snap(r)
        if (!r.collectLoot(i)) {
            if (item?.k == "seed") { if (open) audio.play(Sfx.DENIED); toast("Tu bolsa de semillas está llena: tira una o deja esta") }
            return
        }
        audio.play(when (item?.k) { "gold" -> Sfx.COIN; "relic" -> Sfx.RELIC_GET; else -> Sfx.POP })
        if (item != null) launchFlight(r, item.k, item.id, "loot:$i", before)
        persist(); bump(); continueSoon()
    }

    fun dropLoot(i: Int) { run?.dropLoot(i); persist(); bump(); continueSoon() }

    fun pickRewardCard(id: String) {
        val r = run ?: return
        val before = Snap(r)
        r.pickRewardCard(id)
        launchFlight(r, "card", id, "card:$id", before)
        persist(); bump(); continueSoon()
    }

    /**
     * Cuando ya se recogió todo el premio, la pantalla sigue sola ~1,2 s después (lo que tarda el último en llegar a la barra),
     * salvo que antes toques «Continuar». Solo en recompensas, tesoro, cofre y evento con premios; nunca en pozo, tienda,
     * campamento, objeto de jefe, evento con opciones, dado, calabozo ni mesas.
     */
    private fun continueSoon() {
        val r = run ?: return
        val screen = r.screen
        val ready = when (screen) {
            RunScreen.REWARD -> r.rewardCards.isNotEmpty() && r.canFinishReward()
            RunScreen.TREASURE, RunScreen.KEY_FOUND, RunScreen.VAULT -> r.loot.isNotEmpty() && !r.lootPending()
            RunScreen.EVENT_RESULT -> r.loot.isNotEmpty() && !r.lootPending() && r.deckChanges.isEmpty()
            else -> false
        }
        if (!ready) return
        soonJob?.cancel()
        soonJob = viewModelScope.launch {
            delay(soonMs)
            if (run !== r || r.screen != screen) return@launch
            soonJob = null
            if (screen == RunScreen.REWARD) { if (r.canFinishReward()) continueReward() } else if (!r.lootPending()) leaveNode()
        }
    }

    fun continueReward() {
        soonJob?.cancel(); soonJob = null
        val r = run ?: return
        if (!r.canFinishReward()) { audio.play(Sfx.DENIED); toast("¡Primero recoge tus premios!"); return }
        r.finishReward()
        fanfareIfNewFloor(r)
        persist(); bump()
    }

    fun pickBossRelic(id: String) {
        val r = run ?: return
        val had = r.player.relics.size
        r.pickBossRelic(id)
        if (r.player.relics.size > had) audio.play(Sfx.RELIC_GET)
        fanfareIfNewFloor(r)
        persist(); bump()
    }

    fun skipBossRelic() {
        val r = run ?: return
        r.skipBossRelic()
        fanfareIfNewFloor(r)
        persist(); bump()
    }

    // ---------- campamento ----------
    /** Carta del selector que se está madurando o quitando (la pantalla la anima antes de cambiar el mazo). */
    var flash: PickFlash? by mutableStateOf(null)
        private set

    fun restHeal() {
        val r = run ?: return
        if (flash != null) return
        if (!r.restHeal()) { toast("No puedes descansar"); return }
        audio.play(Sfx.REST_HEAL)
        persist(); bump()
    }

    fun setPicker(mode: String?) {
        if (flash != null) return
        run?.setPicker(mode)
        bump()
    }

    /** Elige la copia [index] del mazo en el selector (madurar o despegar en el campamento; quitar en la tienda). */
    fun pickCard(index: Int) {
        val r = run ?: return
        val mode = r.pickerMode ?: return
        if (flash != null) return
        // suena al elegir la carta, no al terminar el dibujo (como la web); una carta que no madura no suena
        if (mode != "upgrade") audio.play(Sfx.REMOVE_CARD)
        else if (Cards.get(r.player.deck.getOrNull(index) ?: "")?.canUpgrade == true) audio.play(Sfx.UPGRADE)
        flash = PickFlash(mode, index)
        viewModelScope.launch {
            delay(if (mode == "upgrade") 900 else 560)
            if (run !== r) return@launch
            val ok = when {
                r.screen == RunScreen.SHOP -> r.shopRemoveCard(index)
                mode == "upgrade" -> r.restUpgrade(index)
                else -> r.restRemove(index)
            }
            flash = null
            if (ok && r.screen == RunScreen.REST) r.leaveNode()
            persist(); bump()
        }
    }

    /** Sale del campamento, la tienda, el tesoro, la llave o el cofre. */
    fun leaveNode() {
        val r = run ?: return
        if (flash != null) return
        soonJob?.cancel(); soonJob = null
        if (!r.leaveNode()) { toast("¡Primero recoge tus premios!"); return }
        persist(); bump()
    }

    // ---------- tienda ----------
    private fun bought(res: BuyResult, relic: Boolean = false) {
        when (res) {
            BuyResult.NO_GOLD -> { audio.play(Sfx.DENIED); toast("¡No te alcanza el oro!") }
            BuyResult.BAG_FULL -> toast("Tu bolsa de semillas está llena")
            BuyResult.OK -> { audio.play(Sfx.COIN); if (relic) audio.play(Sfx.RELIC_GET); persist() }
            BuyResult.INVALID -> {}
        }
        bump()
    }

    fun buyShopCard(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopCard(i)) }
    fun buyShopRelic(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopRelic(i), relic = true) }
    fun buyShopSeed(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopSeed(i)) }

    fun startShopRemoval() {
        val r = run ?: return
        if (flash != null) return
        if (!r.startShopRemoval()) {
            val used = r.shopStock?.removeUsed == true
            if (!used) audio.play(Sfx.DENIED)
            toast(if (used) "Ya usaste este servicio" else "¡No te alcanza el oro!")
            return
        }
        bump()
    }

    // ---------- eventos de misterio ----------
    fun chooseEventOption(i: Int) {
        val r = run ?: return
        val pc = r.resolveEventOption(i)
        r.trapMessage?.let { toast(it); r.trapMessage = null }
        if (r.screen == RunScreen.MINIGAME || r.screen == RunScreen.DUNGEON) audio.play(Sfx.EVENT_OPEN) // la mesa o la trampilla que abre la opción
        persist()
        if (pc != null) startIntro(pc)
        bump()
    }

    // ---------- pozo de los deseos ----------
    fun tossWell() {
        val r = run ?: return
        if (!r.tossWellCoin()) { audio.play(Sfx.DENIED); toast(if (r.lootPending()) "¡Primero recoge tus premios!" else "No te alcanza el oro"); return }
        audio.play(Sfx.SPARKLE)
        persist(); bump()
    }

    // ---------- calabozo ----------
    fun enterDungeonCell(x: Int, y: Int) {
        val r = run ?: return
        if (intro != null || combat != null) return
        val pc = r.enterDungeonCell(x, y)
        if (pc != null) startIntro(pc)
        persist(); bump()
    }

    // ---------- dado del destino ----------
    /** Número que se ve mientras el dado rueda. */
    var fateShown by mutableStateOf<Int?>(null)
        private set
    var fateRolling by mutableStateOf(false)
        private set

    fun rollFate() {
        val r = run ?: return
        if (fateRolling || r.fateRoll != null || r.screen != RunScreen.FATE) return
        fateRolling = true
        viewModelScope.launch {
            for (i in 0 until 16) {
                fateShown = 1 + Rng.int(20)
                audio.play(Sfx.TAP)
                delay(60L + i * 8)
                if (run !== r || r.screen != RunScreen.FATE) { fateRolling = false; return@launch }
            }
            val roll = r.rollFate()
            audio.play(if (roll >= 14) Sfx.WIN else if (roll <= 7) Sfx.DENIED else Sfx.POP) // buena, mala o regular
            fateShown = r.fateRoll
            fateRolling = false
            persist(); bump()
        }
    }

    fun fateFight() {
        val r = run ?: return
        val pc = r.fateFight() ?: return
        fateShown = null
        startIntro(pc)
        bump()
    }

    // ---------- mochila ----------
    var bagOpen by mutableStateOf(false)
        private set

    fun openBag() { if (run != null) { bagOpen = true; audio.play(Sfx.POP) } }
    fun closeBag() { bagOpen = false }

    /** «Usar» en una semilla de la mochila: en combate y en tu turno; con varios enemigos hay que tocar uno. */
    fun useSeedFromBag(slot: Int) {
        bagOpen = false
        val ctl = combat
        val msg = if (ctl == null) "Las semillas se usan en combate, en tu turno" else ctl.useSeedFromBag(slot)
        if (msg != null) toast(msg)
    }

    fun dropSeed(slot: Int) {
        val r = run ?: return
        if (r.discardSeed(slot)) { persist(); bump() }
    }

    // ---------- visor de cartas ----------
    fun showDeck() {
        val r = run ?: return
        deckView = Triple("Tu mazo", "${r.player.deck.size} cartas en total.", r.player.deck.toList())
    }

    fun showPile(which: String) {
        val p = run?.player ?: return
        deckView = when (which) {
            "draw" -> Triple("Pila de robo", "Cartas que todavía puedes robar (el orden es secreto).", p.drawPile.toList())
            "discard" -> Triple("Pila de descarte", "Cuando la pila de robo se acabe, estas cartas se barajan de vuelta.", p.discardPile.toList())
            else -> Triple("Compost", "Cartas consumidas: no vuelven en este combate.", p.exhaustPile.toList())
        }
    }
}
