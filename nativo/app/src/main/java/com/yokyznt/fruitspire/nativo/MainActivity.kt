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
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.nativo.ui.ActIntroScreen
import com.yokyznt.fruitspire.nativo.ui.BossRelicScreen
import com.yokyznt.fruitspire.nativo.ui.CharacterSelectScreen
import com.yokyznt.fruitspire.nativo.ui.CombatScreen
import com.yokyznt.fruitspire.nativo.ui.DeckModal
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.Fonts
import com.yokyznt.fruitspire.nativo.ui.GameOverScreen
import com.yokyznt.fruitspire.nativo.ui.HudBar
import com.yokyznt.fruitspire.nativo.ui.Ink
import com.yokyznt.fruitspire.nativo.ui.MapScreen
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.NodeResultScreen
import com.yokyznt.fruitspire.nativo.ui.NodeStubScreen
import com.yokyznt.fruitspire.nativo.ui.OutlinedText
import com.yokyznt.fruitspire.nativo.ui.RestScreen
import com.yokyznt.fruitspire.nativo.ui.RewardScreen
import com.yokyznt.fruitspire.nativo.ui.SettingsWindow
import com.yokyznt.fruitspire.nativo.ui.ShopScreen
import com.yokyznt.fruitspire.nativo.ui.Sprite
import com.yokyznt.fruitspire.nativo.ui.SpriteStore
import com.yokyznt.fruitspire.nativo.ui.ToastState
import com.yokyznt.fruitspire.nativo.ui.VictoryScreen
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import com.yokyznt.fruitspire.nativo.ui.mapViewOf
import com.yokyznt.fruitspire.nativo.ui.notebookPaper

class MainActivity : ComponentActivity() {
    private val vm: GameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        SpriteStore.init(this)
        val settings = Settings(this)
        setContent {
            // Ajustes → Pantalla encendida
            LaunchedEffect(settings.awake) {
                if (settings.awake) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            DesignCanvas { GameRoot(vm, settings) }
        }
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
    Box(Modifier.fillMaxSize().notebookPaper()) {
        when (vm.screen) {
            AppScreen.MENU -> MenuScreen(
                canContinue = vm.canContinue, onContinue = vm::continueGame, onNewGame = vm::newGame,
                onTutorial = soon, onPass = soon, onWardrobe = soon, onCollection = soon, onNotes = soon,
                onSettings = { showSettings = true }
            )
            AppScreen.CHARACTER_SELECT -> CharacterSelectScreen(
                vm.progress, vm.selectedChar, vm.selectedDiff, vm::selectChar, vm::selectDiff,
                onBack = vm::toMenu, onPlay = vm::play, onLockedGrade = { toast.show("Gana en el grado anterior con esta fruta para desbloquearlo") }
            )
            AppScreen.RUN -> RunHost(vm, settings, onSettings = { showSettings = true }, onBag = soon)
        }
        if (showSettings) SettingsWindow(settings) { showSettings = false }
        toast.Host(Modifier.align(Alignment.BottomCenter).padding(bottom = 40.dp))
    }
    // el botón de atrás cierra lo abierto o vuelve al menú (la partida ya está guardada)
    BackHandler(enabled = vm.screen != AppScreen.MENU || showSettings) {
        if (showSettings) showSettings = false
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
            RunScreen.REWARD -> RewardScreen(run, vm::collectLoot, vm::dropLoot, vm::pickRewardCard, vm::continueReward)
            RunScreen.BOSS_RELIC -> BossRelicScreen(run, vm::pickBossRelic, vm::skipBossRelic)
            RunScreen.REST -> RestScreen(run, vm.flash, vm::restHeal, vm::setPicker, vm::pickCard, vm::leaveNode)
            RunScreen.SHOP -> ShopScreen(
                run, vm.flash, vm::buyShopCard, vm::buyShopRelic, vm::buyShopSeed,
                vm::startShopRemoval, vm::pickCard, onClosePicker = { vm.setPicker(null) }, onLeave = vm::leaveNode
            )
            RunScreen.TREASURE, RunScreen.KEY_FOUND, RunScreen.VAULT -> NodeResultScreen(run, vm::collectLoot, vm::dropLoot, vm::leaveNode)
            RunScreen.NODE_STUB -> NodeStubScreen(run, vm::leaveStub)
            RunScreen.GAME_OVER -> GameOverScreen(run, vm::toMenu)
            RunScreen.VICTORY -> VictoryScreen(run, vm::toMenu)
        }
        if (run.screen != RunScreen.GAME_OVER && run.screen != RunScreen.VICTORY) {
            HudBar(
                hudStateOf(run), onMenu = vm::toMenu, onBag = onBag, onDeck = vm::showDeck, onSettings = onSettings,
                modifier = Modifier.align(Alignment.TopStart), compact = run.screen == RunScreen.COMBAT
            )
        }
        vm.intro?.let { CombatIntroOverlay(it) }
        vm.deckView?.let { (title, note, ids) -> DeckModal(title, note, ids) { vm.deckView = null } }
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
                intro.sprites.forEach { Sprite(it, if (intro.sprites.size > 1) 120.dp else 150.dp) }
            }
            OutlinedText(intro.title, Fonts.display(62f, titleColor), inkWidth = 3.dp, edgeWidth = 3.dp)
            BasicText(intro.names, style = Fonts.hand(34f).copy(textAlign = TextAlign.Center))
        }
    }
}
