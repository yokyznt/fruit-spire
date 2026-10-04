package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.yokyznt.fruitspire.core.BuyResult
import com.yokyznt.fruitspire.core.PendingCombat
import com.yokyznt.fruitspire.core.Pos
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.Save
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.nativo.ui.CombatController
import com.yokyznt.fruitspire.nativo.ui.MapPan
import com.yokyznt.fruitspire.nativo.ui.PickFlash
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Pantalla de más arriba de la app: menú, elegir fruta o una partida en curso. */
enum class AppScreen { MENU, CHARACTER_SELECT, RUN }

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

    private fun bump() { tick++ }

    // ---------- menú ----------
    fun toMenu() {
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
    }

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
        if (r.isOver) { store.clearRun(); canContinue = false; persistProgress(); return }
        if (Save.shouldSave(r)) { store.writeRun(Save.encode(r)); canContinue = true }
    }

    private fun persistProgress() { store.writeProgress(Save.encodeProgress(progress)) }

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
        viewModelScope.launch {
            delay(460)
            val pc = r.arrive(x, y)
            moving = null
            if (pc != null) startIntro(pc) else persist()
            bump()
        }
    }

    fun leaveStub() {
        run?.leaveStub()
        persist()
        bump()
    }

    // ---------- combate ----------
    private val groundBgs = listOf("kitchen", "patio", "picnic", "tree")
    private val bossBgs = listOf("pantry", "tree")

    private fun startIntro(pc: PendingCombat) {
        val r = run ?: return
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
        val made = CombatController(r, c, uiScope ?: viewModelScope, { toast(it) }, { result -> finishCombat(result) })
        ctl = made
        earlyResult?.let { made.onEnd(it) }
        combat = made
        bump()
    }

    private fun finishCombat(result: String) {
        val r = run ?: return
        combat = null
        r.finishCombat(result)
        persist()
        bump()
    }

    // ---------- recompensas ----------
    fun collectLoot(i: Int) {
        val r = run ?: return
        if (!r.collectLoot(i)) { if (r.loot.getOrNull(i)?.k == "seed") toast("Tu bolsa de semillas está llena: tira una o deja esta"); return }
        persist(); bump(); finishRewardSoon()
    }

    fun dropLoot(i: Int) { run?.dropLoot(i); persist(); bump(); finishRewardSoon() }

    fun pickRewardCard(id: String) {
        val r = run ?: return
        r.pickRewardCard(id)
        persist(); bump(); finishRewardSoon()
    }

    /** Cuando ya se recogió todo (y se eligió carta), se sigue solo, como en la versión web. */
    private fun finishRewardSoon() {
        val r = run ?: return
        if (r.screen != RunScreen.REWARD || r.rewardCards.isEmpty() || !r.canFinishReward()) return
        viewModelScope.launch {
            delay(450)
            if (run === r && r.screen == RunScreen.REWARD && r.canFinishReward()) continueReward()
        }
    }

    fun continueReward() {
        val r = run ?: return
        if (!r.canFinishReward()) { toast("¡Primero recoge tus premios!"); return }
        r.finishReward()
        persist(); bump()
    }

    fun pickBossRelic(id: String) { run?.pickBossRelic(id); persist(); bump() }
    fun skipBossRelic() { run?.skipBossRelic(); persist(); bump() }

    // ---------- campamento ----------
    /** Carta del selector que se está madurando o quitando (la pantalla la anima antes de cambiar el mazo). */
    var flash: PickFlash? by mutableStateOf(null)
        private set

    fun restHeal() {
        val r = run ?: return
        if (flash != null) return
        if (!r.restHeal()) { toast("No puedes descansar"); return }
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
        if (!r.leaveNode()) { toast("¡Primero recoge tus premios!"); return }
        persist(); bump()
    }

    // ---------- tienda ----------
    private fun bought(res: BuyResult) {
        when (res) {
            BuyResult.NO_GOLD -> toast("¡No te alcanza el oro!")
            BuyResult.BAG_FULL -> toast("Tu bolsa de semillas está llena")
            BuyResult.OK -> persist()
            BuyResult.INVALID -> {}
        }
        bump()
    }

    fun buyShopCard(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopCard(i)) }
    fun buyShopRelic(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopRelic(i)) }
    fun buyShopSeed(i: Int) { val r = run ?: return; if (flash == null) bought(r.buyShopSeed(i)) }

    fun startShopRemoval() {
        val r = run ?: return
        if (flash != null) return
        if (!r.startShopRemoval()) { toast(if (r.shopStock?.removeUsed == true) "Ya usaste este servicio" else "¡No te alcanza el oro!"); return }
        bump()
    }

    // ---------- mochila ----------
    var bagOpen by mutableStateOf(false)
        private set

    fun openBag() { if (run != null) bagOpen = true }
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
