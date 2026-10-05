package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.yokyznt.fruitspire.core.Casino
import com.yokyznt.fruitspire.core.RoulettePick
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.Table
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.random.Random

/** Un dado que rueda: de quién es ("player" o "house") y la cara que se ve mientras gira. */
class Rolling(val who: String, val face: Int)

/**
 * Lo que la pantalla de una mesa necesita además de [Table]: los tiempos de las animaciones (dados que ruedan, rodillos,
 * ruleta, respuesta del rival) y los toques. El núcleo decide el resultado al instante; aquí solo se espera lo que se ve.
 * Mientras [busy] es verdadero se ignoran los toques.
 */
class TableController(
    val run: Run,
    val table: Table,
    private val scope: CoroutineScope,
    private val persist: () -> Unit,
    private val bump: () -> Unit,
    private val toast: (String) -> Unit,
    private val audio: GameAudio = NoAudio
) {
    var busy by mutableStateOf(false)
        private set
    var rolling by mutableStateOf<Rolling?>(null)
        private set
    /** Símbolos que se ven en los rodillos mientras giran, y cuáles siguen girando. */
    var reelFaces by mutableStateOf<List<String>>(emptyList())
        private set
    var reelSpin by mutableStateOf(listOf(false, false, false))
        private set
    /** Ángulo al que gira la ruleta; [wheelSpin] sube con cada giro para que la pantalla lo anime. */
    var wheelAngle by mutableFloatStateOf(0f)
        private set
    var wheelSpin by mutableIntStateOf(0)
        private set
    /** Sube cada vez que se gana, para soltar la lluvia de monedas. */
    var coinRain by mutableIntStateOf(0)
        private set
    private var rained = false
    private var settled = false

    private val alive: Boolean get() = run.table === table && run.screen == RunScreen.MINIGAME

    private fun after() {
        if (table.phase == "result" && !settled) { // el resultado suena una sola vez: gana, pierde o empata (`finish` de js/minigames.js)
            settled = true
            audio.play(when (table.outcome) { "win" -> Sfx.WIN; "lose" -> Sfx.DENIED; else -> Sfx.POP })
        }
        if (table.phase == "result" && table.outcome == "win" && !rained) { rained = true; coinRain++ }
        persist()
        bump()
    }

    fun start(bet: Int) {
        if (busy) return
        if (!table.start(bet)) { toast("No te alcanza el oro"); return }
        audio.play(Sfx.COIN)
        after()
    }

    // ---------------------------------------------------------------- dados
    private suspend fun rollAnimation(who: String): Boolean {
        for (i in 0 until 7) {
            rolling = Rolling(who, 1 + Random.nextInt(6))
            audio.play(Sfx.TAP)
            delay(70L + i * 12)
            if (!alive) { rolling = null; busy = false; return false }
        }
        rolling = null
        return true
    }

    fun diceRoll() {
        if (busy || table.kind != "dice" || table.phase != "play") return
        busy = true
        scope.launch {
            if (!rollAnimation("player")) return@launch
            table.diceRoll()
            audio.play(Sfx.HIT)
            busy = false
            if (table.phase == "house") runHouse() else after()
        }
    }

    fun diceStand() {
        if (busy || !table.diceStand()) return
        runHouse()
    }

    /** La casa tira hasta 17 o más. */
    private fun runHouse() {
        busy = true
        bump()
        scope.launch {
            delay(500)
            while (alive && table.houseNeedsRoll()) {
                if (!rollAnimation("house")) return@launch
                table.houseRoll()
                audio.play(Sfx.HIT)
                bump()
                delay(350)
            }
            if (!alive) { busy = false; return@launch }
            table.diceSettle()
            busy = false
            after()
        }
    }

    // ---------------------------------------------------------------- póker
    fun pokerToggle(i: Int) {
        if (busy) return
        if (table.kind == "poker" && table.phase == "play") audio.play(Sfx.SELECT)
        table.pokerToggle(i)
        bump()
    }

    fun pokerShow() { if (!busy) { table.pokerShow(); after() } }

    // ---------------------------------------------------------------- tragamonedas
    fun slotsPull() {
        if (busy || table.kind != "slots" || table.phase != "play") return
        busy = true
        val final = table.slotsDraw()
        reelFaces = table.reels
        reelSpin = listOf(true, true, true)
        bump()
        scope.launch {
            for (t in 0 until 24) {
                val faces = reelFaces.toMutableList()
                val spin = reelSpin.toMutableList()
                for (k in 0 until 3) if (spin[k]) faces[k] = Casino.SLOT_SYMBOLS.random()
                val stop = when (t) { 9 -> 0; 16 -> 1; 23 -> 2; else -> -1 }
                if (stop >= 0) { spin[stop] = false; faces[stop] = final[stop] }
                audio.play(if (stop >= 0) Sfx.HIT else Sfx.TAP) // cada rodillo que para suena a golpe
                reelFaces = faces
                reelSpin = spin
                delay(80)
                if (!alive) { busy = false; return@launch }
            }
            table.slotsSettle()
            busy = false
            after()
        }
    }

    // ---------------------------------------------------------------- ruleta
    fun roulettePick(p: RoulettePick) {
        if (busy) return
        if (table.kind == "roulette" && table.phase == "play") audio.play(Sfx.SELECT)
        table.roulettePick(p)
        bump()
    }

    fun rouletteSpin() {
        if (busy || table.kind != "roulette" || table.phase != "play") return
        val n = table.rouletteSpin()
        if (n < 0) return
        busy = true
        // la rueda da 5 vueltas y deja el número que salió bajo la bolita (arriba)
        wheelAngle = 1800f - n * (360f / Casino.ROULETTE_N)
        wheelSpin++
        bump()
        scope.launch {
            for (i in 0 until 9) { // la bolita da 9 toquecitos mientras la rueda gira (2.7 s)
                audio.play(Sfx.TAP)
                delay(300)
                if (!alive) { busy = false; return@launch }
            }
            table.rouletteSettle()
            busy = false
            after()
        }
    }

    // ---------------------------------------------------------------- ajedrez
    /** Toque en una casilla (o pieza soltada en ella): elige, mueve o quita la elección. */
    fun chessClick(r: Int, c: Int) {
        if (busy) return
        val piece = table.board.getOrNull(r)?.getOrNull(c)
        val mine = piece != null && piece.c == 0 && table.kind == "chess" && table.phase == "play" && table.turn == "player"
        val won = table.won.size
        val moved = table.chessClick(r, c)
        if (moved) audio.play(if (table.won.size > won) Sfx.HIT else Sfx.MAP_MOVE) // comer suena a golpe; mover, a paso
        else if (mine) audio.play(if (table.sel != null) Sfx.SELECT else Sfx.DENIED) // una pieza sin jugadas se niega
        bump()
        if (moved) afterChessMove()
    }

    private fun afterChessMove() {
        after()
        if (table.phase == "play" && table.turn == "enemy") runEnemy()
    }

    private fun runEnemy() {
        busy = true
        scope.launch {
            delay(650)
            if (!alive || table.phase != "play") { busy = false; return@launch }
            val lost = table.lost.size
            if (table.chessEnemyMove()) audio.play(if (table.lost.size > lost) Sfx.HIT else Sfx.MAP_MOVE)
            busy = false
            afterChessMove()
        }
    }

    fun resign() {
        if (busy) return
        table.chessResign()
        after()
    }
}
