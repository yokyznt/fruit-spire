package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.gen.GEN_PLAYLISTS
import java.util.Random

// ============================================================
// Las reglas del sonido (js/audio.js y musicContextFor de js/render.js), sin nada de Android: qué lista de canciones
// suena en cada pantalla, cómo avanza cada lista y la curva de volumen. Los archivos los reproduce la app.
// ============================================================

/** Qué lista de canciones suena según la pantalla (`musicContextFor` de la web). */
object MusicContext {
    const val MENU = "menu"

    /** Una partida en curso: [combatKind] es el del combate ("boss", "elite" u otro) y [act] el castillo. */
    fun forRun(screen: RunScreen, combatKind: String, act: Int): String = when (screen) {
        RunScreen.COMBAT -> when (combatKind) { "boss" -> "boss"; "elite" -> "elite"; else -> "combat" }
        RunScreen.SHOP -> "shop"
        RunScreen.REST, RunScreen.GAME_OVER -> "rest"
        RunScreen.DUNGEON -> "dungeon"
        RunScreen.MINIGAME -> "casino"
        RunScreen.VICTORY -> MENU
        // portada, mapa, premios, eventos, tesoros, pozo, dado…: la del mapa de ese castillo
        else -> "map${act.coerceIn(1, 3)}"
    }
}

/**
 * La lista de canciones de cada lugar: empieza en una al azar y después sigue en orden dando la vuelta, y cada lugar
 * lleva su propia cuenta (`pickSong` de js/audio.js). Un lugar que no existe usa la lista del menú.
 */
class MusicPlan(private val rand: Random = Random()) {
    private val cursor = HashMap<String, Int>()

    fun next(place: String): String {
        val key = if (GEN_PLAYLISTS.containsKey(place)) place else MusicContext.MENU
        val list = GEN_PLAYLISTS.getValue(key)
        val n = cursor[key]?.let { (it + 1) % list.size } ?: rand.nextInt(list.size)
        cursor[key] = n
        return list[n]
    }
}

/** El volumen de Ajustes (0 a 100) como ganancia: la misma curva que la web, `(v/100)^1.7`. */
object Volume {
    fun curve(percent: Int): Double = Math.pow(percent.coerceIn(0, 100) / 100.0, 1.7)
}
