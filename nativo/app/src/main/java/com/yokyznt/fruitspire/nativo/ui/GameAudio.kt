package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import com.yokyznt.fruitspire.core.data.gen.Sfx

/**
 * Lo que el juego le pide al sonido (los Sfx.* y setMusicContext de js/audio.js). La app usa [com.yokyznt.fruitspire.nativo.AndroidAudio];
 * las pruebas y las pantallas sueltas usan [NoAudio] o un registro de lo que suena.
 */
interface GameAudio {
    /** Suena un efecto, y vibra si la web vibraba con él. [variant] elige una versión (−1 = al azar). */
    fun play(sfx: Sfx, variant: Int = -1)

    /** Qué lista de canciones suena ahora (menu, map1, combat…; null = silencio). Cambiar de lista cambia de canción. */
    fun music(place: String?)

    /** La app pasa a segundo plano / vuelve: todo se calla y se retoma. */
    fun pause()
    fun resume()

    /** Cambió un ajuste ("music", "sfx" o "vibrate"). */
    fun settingChanged(key: String)

    fun release()
}

/** Sin sonido (valor por defecto de las pruebas y de las vistas previas). */
object NoAudio : GameAudio {
    override fun play(sfx: Sfx, variant: Int) {}
    override fun music(place: String?) {}
    override fun pause() {}
    override fun resume() {}
    override fun settingChanged(key: String) {}
    override fun release() {}
}

/** El sonido de la pantalla (los toques de la interfaz lo usan sin que se lo pasen por parámetro). */
val LocalAudio = staticCompositionLocalOf<GameAudio> { NoAudio }

/** El sonido de entrada de un combate: suave, o fuerte contra élites y jefes (`introSting(strong)`). */
fun GameAudio.intro(strong: Boolean) = play(Sfx.INTRO_STING, if (strong) 1 else 0)

/** Un toque sin onda que suena a «tap», como cualquier `<button>` habilitado de la web (`setupUiClicks` de js/fx.js). */
@Composable
fun Modifier.tapButton(enabled: Boolean = true, onClick: () -> Unit): Modifier {
    val audio = LocalAudio.current
    return clickable(remember { MutableInteractionSource() }, null, enabled = enabled) { audio.play(Sfx.TAP); onClick() }
}
