package com.yokyznt.fruitspire.nativo

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.yokyznt.fruitspire.core.CineKind
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.nativo.ui.CineScreen
import com.yokyznt.fruitspire.nativo.ui.ActIntroScreen
import com.yokyznt.fruitspire.nativo.ui.BossRelicScreen
import com.yokyznt.fruitspire.nativo.ui.CharacterSelectScreen
import com.yokyznt.fruitspire.nativo.ui.CollectionScreen
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
import com.yokyznt.fruitspire.nativo.ui.DeckModal
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.DungeonScreen
import com.yokyznt.fruitspire.nativo.ui.EventResultScreen
import com.yokyznt.fruitspire.nativo.ui.EventScreen
import com.yokyznt.fruitspire.nativo.ui.FateScreen
import com.yokyznt.fruitspire.nativo.ui.Fonts
import com.yokyznt.fruitspire.nativo.ui.GameAudio
import com.yokyznt.fruitspire.nativo.ui.GameOverScreen
import com.yokyznt.fruitspire.nativo.ui.FlyLayer
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.LocalHudAnchors
import com.yokyznt.fruitspire.nativo.ui.LocalLootNudge
import com.yokyznt.fruitspire.nativo.ui.LocalLootRects
import com.yokyznt.fruitspire.nativo.ui.LootNudge
import com.yokyznt.fruitspire.nativo.ui.LocalTutorialAnchors
import com.yokyznt.fruitspire.nativo.ui.TutorialEndScreen
import com.yokyznt.fruitspire.nativo.ui.TutorialOverlay
import com.yokyznt.fruitspire.core.TutorialCtx
import androidx.compose.ui.geometry.Rect
import com.yokyznt.fruitspire.nativo.ui.Ink
import com.yokyznt.fruitspire.nativo.ui.InventoryModal
import com.yokyznt.fruitspire.nativo.ui.LocalAudio
import com.yokyznt.fruitspire.nativo.ui.MapScreen
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.NoAudio
import com.yokyznt.fruitspire.nativo.ui.NodeResultScreen
import com.yokyznt.fruitspire.nativo.ui.NotesScreen
import com.yokyznt.fruitspire.nativo.ui.TableScreen
import com.yokyznt.fruitspire.nativo.ui.LocalProgress
import com.yokyznt.fruitspire.nativo.ui.PassScreen
import com.yokyznt.fruitspire.nativo.ui.WardrobeScreen
import com.yokyznt.fruitspire.core.Pass
import androidx.compose.runtime.CompositionLocalProvider
import com.yokyznt.fruitspire.nativo.ui.OutlinedText
import com.yokyznt.fruitspire.nativo.ui.RestScreen
import com.yokyznt.fruitspire.nativo.ui.RewardScreen
import com.yokyznt.fruitspire.nativo.ui.SettingsWindow
import com.yokyznt.fruitspire.nativo.ui.ShopScreen
import com.yokyznt.fruitspire.nativo.ui.Sprite
import com.yokyznt.fruitspire.nativo.ui.SpriteStore
import com.yokyznt.fruitspire.nativo.ui.WellScreen
import com.yokyznt.fruitspire.nativo.ui.ToastState
import com.yokyznt.fruitspire.nativo.ui.VictoryScreen
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import com.yokyznt.fruitspire.nativo.ui.mapViewOf
import com.yokyznt.fruitspire.nativo.ui.notebookPaper

class MainActivity : ComponentActivity() {
    private val vm: GameViewModel by viewModels()
    private var audio: GameAudio = NoAudio

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        SpriteStore.init(this)
        val settings = Settings(this)
        // el sonido: los ajustes de volumen y vibración le llegan al momento
        val sound = AndroidAudio(this, settings)
        settings.onChanged = sound::settingChanged
        audio = sound
        vm.audio = sound
        setContent {
            // Ajustes → Pantalla encendida
            LaunchedEffect(settings.awake) {
                if (settings.awake) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            DesignCanvas { GameRoot(vm, settings) }
        }
    }

    // En segundo plano todo se calla (música y vibración) y al volver se retoma
    override fun onPause() { audio.pause(); super.onPause() }
    override fun onResume() { super.onResume(); audio.resume() }

    override fun onDestroy() {
        audio.release()
        if (vm.audio === audio) vm.audio = NoAudio
        super.onDestroy()
    }

    // Pantalla completa: sin barra de estado ni botones de Android (vuelven al deslizar desde el borde)
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) return
        val bars = WindowCompat.getInsetsController(window, window.decorView)
        bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        bars.hide(WindowInsetsCompat.Type.systemBars())
    }
}

/** Zoom del mapa en teléfono según Ajustes (lejos · normal · cerca). */
private fun zoomOf(setting: String) = when (setting) { "lejos" -> 1f; "cerca" -> 1.5f; else -> 1.25f }

/** Raíz del juego: menú, elegir fruta o una partida; encima, ajustes y avisos. */
@Composable
fun GameRoot(vm: GameViewModel, settings: Settings) {
    var showSettings by remember { mutableStateOf(false) }
    val toast = remember { ToastState() }
    vm.toast = { toast.show(it) }
    val soon = { toast.show("Llega en una etapa siguiente") }
    // la música sigue a la pantalla: al cambiar de lugar cambia de lista (musicContextFor de la web)
    val place = vm.musicPlace()
    LaunchedEffect(place) { vm.audio.music(place) }
    CompositionLocalProvider(LocalProgress provides vm.progress, LocalAudio provides vm.audio) {
    Box(Modifier.fillMaxSize().notebookPaper()) {
        when (vm.screen) {
            AppScreen.MENU -> MenuScreen(
                canContinue = vm.canContinue, onContinue = vm::continueGame, onNewGame = vm::newGame,
                onTutorial = vm::startTutorial, onPass = vm::openPass, onWardrobe = vm::openWardrobe, onCollection = vm::openCollection, onNotes = vm::openNotes,
                onSettings = { showSettings = true }, passBadge = Pass.unclaimed(vm.progress), notesBadge = vm.progress.notesAreNew()
            )
            AppScreen.COLLECTION -> CollectionScreen(vm.progress, vm.collection, onInfo = { toast.show(it) }, onBack = vm::toMenu)
            AppScreen.NOTES -> NotesScreen(
                onBack = vm::toMenu, endingSeen = vm.progress.endingSeen,
                onReplayStory = { vm.startStory(replay = true) }, onReplayEnding = { vm.startEnding(replay = true) }
            )
            AppScreen.STORY -> CineScreen(CineKind.STORY, vm.cineHeroId(), vm.cineHeroName(), null, vm.cineReplay, vm.audio, vm::finishStory)
            AppScreen.ENDING -> CineScreen(CineKind.ENDING, vm.cineHeroId(), vm.cineHeroName(), vm.cineBossId(), vm.cineReplay, vm.audio, vm::finishEnding)
            AppScreen.PASS -> PassScreen(vm.progress, vm.tick, vm::claimPassLevel, vm::claimAllPass, onWardrobe = vm::openWardrobe, onBack = vm::toMenu)
            AppScreen.WARDROBE -> WardrobeScreen(
                vm.progress, vm.wardrobeChar, vm.tick, vm::wardrobeSelect, vm::wardrobeEquip, vm::wardrobeClear, onBack = vm::toMenu
            )
            AppScreen.CHARACTER_SELECT -> CharacterSelectScreen(
                vm.progress, vm.selectedChar, vm.selectedDiff, vm::selectChar, vm::selectDiff,
                onBack = vm::toMenu, onPlay = vm::play, onLockedGrade = { toast.show("Gana en el grado anterior con esta fruta para desbloquearlo") }
            )
            AppScreen.RUN -> RunHost(vm, settings, onSettings = { showSettings = true }, onBag = vm::openBag)
        }
        if (showSettings) SettingsWindow(settings) { showSettings = false }
        toast.Host(Modifier.align(Alignment.BottomCenter).padding(bottom = 40.dp))
    }
    }
    // el botón de atrás cierra lo abierto o vuelve al menú (la partida ya está guardada)
    BackHandler(enabled = vm.screen != AppScreen.MENU || showSettings) {
        if (showSettings) showSettings = false
        else if (vm.screen == AppScreen.RUN && vm.tutorial != null) vm.tutQuit(null) // el tutorial pregunta antes de salir
        else if (vm.bagOpen) vm.closeBag()
        else if (vm.screen == AppScreen.STORY) vm.finishStory()
        else if (vm.screen == AppScreen.ENDING) vm.finishEnding()
        else if (vm.deckView != null) vm.deckView = null
        else if (vm.screen == AppScreen.RUN && vm.run?.pickerMode != null) vm.setPicker(null)
        else vm.toMenu()
    }
}

/** Una partida en curso: la pantalla que toque, la barra de arriba, la transición de combate y el visor de cartas. */
@Composable
fun RunHost(vm: GameViewModel, settings: Settings, onSettings: () -> Unit, onBag: () -> Unit) {
    vm.tick // se vuelve a dibujar cada vez que la partida cambia
    vm.uiScope = androidx.compose.runtime.rememberCoroutineScope()
    val run = vm.run ?: return
    val ctl = vm.combat
    val tut = vm.tutorial
    CompositionLocalProvider(
        LocalHudAnchors provides vm.hudAnchors, LocalLootRects provides vm.lootRects, LocalLootNudge provides remember { LootNudge() },
        LocalTutorialAnchors provides (if (tut != null) vm.tutorialAnchors else null)
    ) {
    Box(Modifier.fillMaxSize()) {
        when (run.screen) {
            RunScreen.ACT_INTRO -> ActIntroScreen(run, vm::beginFloor)
            RunScreen.MAP -> {
                val pos = vm.moving ?: run.pos
                MapScreen(
                    mapViewOf(run), pos.x to pos.y, vm.moving != null, zoomOf(settings.mapZoom), vm.pan,
                    onMove = vm::moveTo, onInfo = { vm.toast(it) }
                )
            }
            RunScreen.COMBAT -> if (ctl != null) {
                CombatScreen(ctl, vm.combatBg)
                // las pilas del combate se miran en el visor de cartas
                val pile = ctl.pileView
                LaunchedEffect(pile) { if (pile != null) { vm.showPile(pile); ctl.pileView = null } }
            }
            RunScreen.REWARD -> RewardScreen(run, vm::collectLoot, vm::dropLoot, vm::pickRewardCard, vm::continueReward, vm::wearPet)
            RunScreen.BOSS_RELIC -> BossRelicScreen(run, vm::pickBossRelic, vm::skipBossRelic)
            RunScreen.REST -> RestScreen(run, vm.flash, vm::restHeal, vm::setPicker, vm::pickCard, vm::leaveNode)
            RunScreen.SHOP -> ShopScreen(
                run, vm.flash, vm::buyShopCard, vm::buyShopRelic, vm::buyShopSeed,
                vm::startShopRemoval, vm::pickCard, onClosePicker = { vm.setPicker(null) }, onLeave = vm::leaveNode,
                sales = vm.sales.toList(), nope = vm.nope, onSaleDone = vm::endSale
            )
            RunScreen.TREASURE, RunScreen.KEY_FOUND, RunScreen.VAULT -> NodeResultScreen(run, vm::collectLoot, vm::dropLoot, vm::leaveNode)
            RunScreen.EVENT -> EventScreen(run, vm::chooseEventOption)
            RunScreen.EVENT_RESULT -> EventResultScreen(run, vm::collectLoot, vm::dropLoot, vm::leaveNode)
            RunScreen.WELL -> WellScreen(run, vm::tossWell, vm::collectLoot, vm::dropLoot, vm::leaveNode)
            RunScreen.DUNGEON -> DungeonScreen(run, vm::enterDungeonCell)
            RunScreen.FATE -> FateScreen(run, vm.fateShown, vm.fateRolling, vm::rollFate, vm::fateFight)
            RunScreen.MINIGAME -> vm.tableController()?.let { TableScreen(run, it, vm.tick, vm::collectLoot, vm::dropLoot, vm::leaveNode) }
            RunScreen.TUTORIAL_END -> TutorialEndScreen(onPlay = vm::newGame, onRepeat = vm::startTutorial, onMenu = vm::toMenu)
            RunScreen.GAME_OVER -> GameOverScreen(run, vm::toMenu)
            RunScreen.VICTORY -> VictoryScreen(run, vm::toMenu, vm::wearPet)
        }
        if (run.screen != RunScreen.GAME_OVER && run.screen != RunScreen.VICTORY && run.screen != RunScreen.TUTORIAL_END) {
            val seedReady = run.screen == RunScreen.COMBAT && ctl?.canUseSeedNow() == true && run.player.seeds.any { it != null }
            HudBar(
                hudStateOf(run, seedReady, vm.flights.toList()), onMenu = { if (tut != null) vm.tutQuit(null) else vm.toMenu() }, onBag = onBag, onDeck = vm::showDeck,
                onSettings = { if (tut != null) vm.tutDeniedTap() else onSettings() },
                modifier = Modifier.align(Alignment.TopStart), compact = run.screen == RunScreen.COMBAT, goldNope = vm.goldNope
            )
            FlyLayer(vm.flights.toList(), vm.hudAnchors, vm::landFlight)
        }
        if (vm.bagOpen) InventoryModal(run, ctl?.canUseSeedNow() == true, vm::useSeedFromBag, vm::dropSeed, vm::closeBag)
        vm.intro?.let { CombatIntroOverlay(it) }
        // subir de piso después de un jefe: la fruta sube la escalera de la torre
        vm.ascend?.let { a -> androidx.compose.runtime.key(a.key) { com.yokyznt.fruitspire.nativo.ui.StairsScene(a, onDone = vm::finishAscend) } }
        vm.deckView?.let { (title, note, ids) -> DeckModal(title, note, ids) { vm.deckView = null } }
        // el tutorial: Profe Limón y lo que ilumina, por encima de todo
        if (tut != null && run.screen != RunScreen.TUTORIAL_END) {
            val ctx = TutorialCtx(run, tut.flags, vm.bagOpen, (ctl?.seedAiming ?: -1) >= 0)
            fun rectsOf(id: String): List<Rect> = when (id) {
                "bag" -> listOfNotNull(vm.hudAnchors.rects["bag"])
                "loot" -> run.loot.indices.filter { run.loot[it].isOpen }.mapNotNull { vm.lootRects["loot:$it"] }
                "reward-cards" -> if (run.rewardCardPicked) emptyList() else run.rewardCards.mapNotNull { vm.lootRects["card:$it"] }
                else -> vm.tutorialAnchors.rects(id)
            }
            TutorialOverlay(
                tut, tut.spots(ctx).flatMap { rectsOf(it) }, (tut.step?.avoid ?: emptyList()).flatMap { rectsOf(it) },
                vm.tutPraise, vm.tutShake, vm::tutAdvance, { vm.tutQuit(null) }, vm::tutQuit
            )
        }
    }
    }
}

/** «¡A pelear!»: dos mitades de cinta se cierran sobre la pantalla, se ve quién viene y se abren. */
@Composable
fun CombatIntroOverlay(intro: IntroUi) {
    val t = remember(intro) { Animatable(0f) }
    LaunchedEffect(intro) { t.animateTo(1f, tween(1650, easing = LinearEasing)) }
    val half = when (intro.act) { 3 -> Color(0xFFEEEAF6); 2 -> Color(0xFFFBE7DD); else -> Ink.paper }
    val titleColor = when (intro.kind) { "boss" -> Ink.strawberry; "elite" -> Ink.orange; else -> Ink.mint }
    Box(Modifier.fillMaxSize().graphicsLayer { alpha = if (t.value > .7f) ((1f - t.value) / .3f).coerceIn(0f, 1f) else 1f }) {
        Box(
            Modifier.align(Alignment.TopStart).fillMaxWidth().fillMaxHeight(.5f)
                .graphicsLayer { translationX = -(1f - (t.value / .15f).coerceIn(0f, 1f)) * size.width }
                .drawBehind {
                    drawRect(half)
                    drawRect(Ink.peach, Offset(0f, size.height - 22.dp.toPx()), Size(size.width, 22.dp.toPx()))
                }
        )
        Box(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().fillMaxHeight(.5f)
                .graphicsLayer { translationX = (1f - (t.value / .15f).coerceIn(0f, 1f)) * size.width }
                .drawBehind {
                    drawRect(half)
                    drawRect(Ink.mint, Offset.Zero, Size(size.width, 22.dp.toPx()))
                }
        )
        Column(
            Modifier.align(Alignment.Center).graphicsLayer { val s = .6f + .4f * (t.value / .25f).coerceIn(0f, 1f); scaleX = s; scaleY = s },
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                intro.sprites.forEach { Sprite(it, if (intro.sprites.size > 2) 170.dp else if (intro.sprites.size > 1) 200.dp else 250.dp) }
            }
            OutlinedText(intro.title, Fonts.display(66f, titleColor), inkWidth = 3.dp, edgeWidth = 3.dp)
            BasicText(intro.names, style = Fonts.hand(52f).copy(textAlign = TextAlign.Center))
        }
    }
}
