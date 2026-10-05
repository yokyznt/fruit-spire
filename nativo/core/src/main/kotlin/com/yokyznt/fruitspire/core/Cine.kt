package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.Sfx

// ============================================================
// La historia del inicio (js/story.js) y el final (js/ending.js): qué escenas hay, cuánto dura cada una, su texto, su sonido y
// qué video exportado (tools/export-cine.js) le toca. Sin nada de Android: la app solo reproduce el video y dibuja texto y controles.
// ============================================================

enum class CineKind { STORY, ENDING }

/** Una escena: [durMs] es lo que dura antes de pasar sola (0 = espera un toque), [sfxVariant] elige una versión del sonido (−1 = al azar). */
class CineScene(val durMs: Int, val sfx: Sfx, val text: (String) -> String, val sfxVariant: Int = -1)

object Cine {
    /** Un toque tan seguido no cuenta (evita saltarse dos escenas con un doble toque). */
    const val GUARD_MS = 350

    /** Los jefes finales (cada uno tiene su propia escena 0 del final). */
    val FINAL_BOSSES = listOf("licuadora_suprema", "horno_infernal", "maquina_expendedora")

    val story: List<CineScene> = listOf(
        CineScene(7000, Sfx.SPARKLE, { "Érase una vez el Reino de las Frutas, donde todas vivían felices junto a su querido Rey Fruta." }),
        CineScene(6500, Sfx.INTRO_STING, { "Pero una noche llegaron los bichos y las máquinas malvadas… ¡Solo una fruta alcanzó a esconderse!" }, sfxVariant = 1),
        CineScene(9000, Sfx.SHUFFLE, { "Encerraron a las frutas en jaulas y se las llevaron en carretas, una tras otra. Al Rey Fruta, en su propia carroza." }),
        CineScene(8000, Sfx.TURN_ENEMY, { "Las repartieron en tres castillos, cada uno más grande y peligroso que el anterior." }),
        CineScene(7000, Sfx.LOSE, { "Y al Rey Fruta lo encerraron en lo más alto de la última torre, rodeado de guardias." }),
        CineScene(0, Sfx.WIN, { name -> "Esa fruta valiente eres tú, $name. Sube los tres castillos, libera a tus amigos y rescata al Rey Fruta." })
    )

    val ending: List<CineScene> = listOf(
        CineScene(7500, Sfx.WIN, { "¡Lo lograste! El último guardián cayó y los barrotes de la torre se rompieron." }),
        CineScene(7500, Sfx.RELIC_GET, { "Una por una se abrieron todas las jaulas. ¡Las frutas volvían a ser libres!" }),
        CineScene(9000, Sfx.ACT_FANFARE, { "Regresaron a casa en las mismas carretas… solo que esta vez, los bichos jalaban." }),
        CineScene(8000, Sfx.SPARKLE, { "Esa noche, el pueblo hizo la fiesta más grande de toda su historia." }),
        CineScene(0, Sfx.WIN, { name -> "Y el Rey Fruta nombró a $name Héroe del Reino. ¡Gracias por jugar!" })
    )

    fun scenes(kind: CineKind): List<CineScene> = if (kind == CineKind.STORY) story else ending

    // escenas cuyo dibujo cambia con la fruta elegida (ella y las otras tres que salen en las jaulas)
    private val storyByFruit = setOf(0, 1, 2, 5)

    /** Nombre (sin .mp4) del video de la escena [scene] en assets/cine para la fruta [heroId] (y el jefe final [bossId] en la escena 0 del final). */
    fun video(kind: CineKind, scene: Int, heroId: String, bossId: String? = null): String {
        val hero = if (World.characters.any { it.id == heroId }) heroId else "manzana"
        return if (kind == CineKind.STORY) {
            if (scene in storyByFruit) "s${scene}_$hero" else "s$scene"
        } else {
            if (scene == 0) "e0_${hero}_${if (bossId in FINAL_BOSSES) bossId else FINAL_BOSSES[0]}" else "e${scene}_$hero"
        }
    }

    /** Sonidos que la web lanza a ciertos milisegundos de una escena, además del suyo de entrada. */
    fun extraSfx(kind: CineKind, scene: Int): List<Pair<Int, Sfx>> = when {
        kind == CineKind.STORY && scene == 1 -> listOf(350 to Sfx.HIT, 1650 to Sfx.HIT) // los rayos
        kind == CineKind.ENDING && scene == 3 -> listOf(900, 1900, 2900, 3900).map { it to Sfx.SPARKLE } // los fuegos artificiales
        else -> emptyList()
    }

    /** A los cuántos milisegundos de la última escena aparece el botón de seguir. */
    fun finalButtonDelayMs(kind: CineKind): Int = if (kind == CineKind.STORY) 2400 else 2600
}

/** Qué pasó al tocar «siguiente». */
enum class CineStep { MOVED, FINISH, IGNORED }

/** Por qué escena va una historia o un final y cuándo entró en ella: los tiempos se pasan de fuera, así se prueba sin reloj. */
class CineTimeline(val kind: CineKind, startMs: Long = 0) {
    private val list = Cine.scenes(kind)
    var index = 0
        private set
    private var enteredAt = startMs

    val last: Int get() = list.size - 1
    val isLast: Boolean get() = index == last

    fun go(i: Int, nowMs: Long) { index = i.coerceIn(0, last); enteredAt = nowMs }

    fun back(nowMs: Long) { if (index > 0) go(index - 1, nowMs) }

    /** Toque en «siguiente» o en la pantalla: pasa de escena, termina si era la última, o se ignora si acaba de entrar. */
    fun next(nowMs: Long): CineStep = when {
        nowMs - enteredAt < Cine.GUARD_MS -> CineStep.IGNORED
        isLast -> CineStep.FINISH
        else -> { go(index + 1, nowMs); CineStep.MOVED }
    }

    /** Llamar seguido: pasa sola a la siguiente cuando se cumple lo que dura la escena. Verdadero si cambió. */
    fun tick(nowMs: Long): Boolean {
        val dur = list[index].durMs
        if (dur <= 0 || nowMs - enteredAt < dur) return false
        go(index + 1, nowMs)
        return true
    }

    /** Milisegundos desde que entró a la escena actual. */
    fun elapsed(nowMs: Long): Long = nowMs - enteredAt
}
