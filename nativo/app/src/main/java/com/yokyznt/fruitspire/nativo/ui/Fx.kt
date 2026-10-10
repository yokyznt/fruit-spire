package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.InfiniteRepeatableSpec
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

/**
 * Lo que los ajustes de Pantalla le piden a todo el dibujo. Es global (y estado de Compose) para que lo lean hasta los
 * `Modifier` de dibujo, que no pueden leer un CompositionLocal; la actividad lo pone al cambiar los ajustes.
 */
object Fx {
    /** «Animaciones: Menos»: las frutas, casillas y botones de reposo se quedan quietos (como `motion-less` de la web). */
    var calm by mutableStateOf(false)

    /** «Gráficos: Rápidos»: sin sombras ni resplandores y con los dibujos a menor resolución (teléfonos lentos). */
    var lite by mutableStateOf(false)

    /** Cuánto se reducen los dibujos con «Gráficos: Rápidos» (0,7 = la mitad de memoria y de trabajo). */
    const val LITE_SCALE = .7f
}

/**
 * Una animación de reposo que no para (la fruta que se mece, el aro que respira…). Con «Animaciones: Menos» ni siquiera corre:
 * se queda en [rest]. Las animaciones que significan algo (dados que ruedan, rodillos) no pasan por aquí.
 */
@Composable
fun idleAnim(from: Float, to: Float, spec: InfiniteRepeatableSpec<Float>, label: String = "reposo", rest: Float = from): State<Float> {
    if (Fx.calm) return remember { mutableFloatStateOf(rest) }
    return rememberInfiniteTransition(label).animateFloat(from, to, spec, label)
}
