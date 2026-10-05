package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.yokyznt.fruitspire.core.Cine
import com.yokyznt.fruitspire.core.CineKind
import com.yokyznt.fruitspire.core.CineStep
import com.yokyznt.fruitspire.core.CineTimeline
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------------------------------------------
// La historia del inicio y el final (js/story.js, js/ending.js): el video de cada escena (exportado de la web) con encima el texto
// que se escribe letra por letra (26 ms por letra), los puntos de progreso, los controles y los sonidos. Toque = siguiente.
// ---------------------------------------------------------------------------------------------------------------

/** Ancho del cuadro de texto y si va a la izquierda, según la escena (`.cine.scene-3 .cine-caption`…); null = centrado y ancho. */
private fun captionWidth(kind: CineKind, scene: Int): Int? = when {
    kind == CineKind.STORY && scene == 3 -> 640
    kind == CineKind.STORY && scene == 4 -> 460
    kind == CineKind.ENDING && scene == 0 -> 520
    else -> null
}

/** El texto con solo las primeras [visible] letras a la vista (las demás quedan transparentes para que no se mueva nada). */
internal fun typed(text: String, visible: Int): AnnotatedString = buildAnnotatedString {
    var n = 0
    var cut = text.length
    for ((i, ch) in text.withIndex()) {
        if (ch == ' ') continue
        if (n >= visible) { cut = i; break }
        n++
    }
    append(text.substring(0, cut))
    withStyle(SpanStyle(color = Color.Transparent)) { append(text.substring(cut)) }
}

@Composable
fun CineScreen(
    kind: CineKind, heroId: String, heroName: String, bossId: String?, replay: Boolean, audio: GameAudio, onFinish: () -> Unit
) {
    val tl = remember { CineTimeline(kind) }
    val clock = remember { mutableLongStateOf(0L) } // la leen solo el texto y el botón final: el resto no se redibuja por cuadro
    var scene by remember { mutableIntStateOf(0) }
    val finish by rememberUpdatedState(onFinish)
    val scenes = remember { Cine.scenes(kind) }

    LaunchedEffect(Unit) {
        tl.go(0, withFrameMillis { it })
        while (true) withFrameMillis { ms -> clock.longValue = ms; if (tl.tick(ms)) scene = tl.index }
    }
    // el sonido de cada escena y los que la web lanza a ciertos milisegundos (rayos, fuegos artificiales)
    LaunchedEffect(scene) {
        audio.play(scenes[scene].sfx, scenes[scene].sfxVariant)
        Cine.extraSfx(kind, scene).forEach { (ms, sfx) -> launch { delay(ms.toLong()); audio.play(sfx) } }
    }
    fun step(r: CineStep) { when (r) { CineStep.MOVED -> scene = tl.index; CineStep.FINISH -> finish(); CineStep.IGNORED -> {} } }
    fun go(i: Int) { tl.go(i, clock.longValue); scene = tl.index }

    Box(
        Modifier.fillMaxSize().background(Color(0xFF7FCDF2))
            .pointerInput(Unit) { detectTapGestures { if (!tl.isLast) step(tl.next(clock.longValue)) } }
    ) {
        CineVideo(Cine.video(kind, scene, heroId, bossId), Modifier.fillMaxSize())

        // el texto, con los puntos de progreso debajo
        val width = captionWidth(kind, scene)
        Column(
            Modifier.align(if (width != null) Alignment.TopStart else Alignment.TopCenter)
                .padding(top = 22.dp, start = if (width != null) 30.dp else 0.dp)
                .then(if (width != null) Modifier.width(width.dp) else Modifier.fillMaxWidth(.9f).widthIn(max = 940.dp))
                .drawBehind {
                    val r = CornerRadius(20.dp.toPx()); val k = density
                    drawRoundRect(Color(0x40000000), Offset(6f * k, 10f * k), size, r)
                    drawRoundRect(Ink.ink, Offset(-3f * k, -3f * k), Size(size.width + 6f * k, size.height + 6f * k), CornerRadius(23.dp.toPx()))
                    drawRoundRect(Color(0xF5FFF9EC), Offset.Zero, size, r)
                }
                .padding(start = 30.dp, end = 30.dp, top = 14.dp, bottom = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val text = scenes[scene].text(heroName)
            BasicText(
                typed(text, (tl.elapsed(clock.longValue) / 26).toInt()),
                style = Fonts.hand(28f).copy(textAlign = TextAlign.Center, lineHeight = 36.sp)
            )
            Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                for (k in 0..tl.last) Dot(on = k <= scene) { go(k) }
            }
        }

        // controles abajo a la derecha (en la última escena sale el botón grande del centro)
        if (scene < tl.last) {
            Row(
                Modifier.align(Alignment.BottomEnd).padding(end = 24.dp, bottom = 22.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically
            ) {
                if (scene > 0) StickerButton("‹ Atrás", { tl.back(clock.longValue); scene = tl.index }, secondary = true, fontSize = 18f, padding = PaddingValues(horizontal = 18.dp, vertical = 6.dp))
                StickerButton(if (kind == CineKind.STORY) "Saltar historia »" else "Saltar »", { finish() }, secondary = true, fontSize = 18f, padding = PaddingValues(horizontal = 18.dp, vertical = 6.dp))
                StickerButton("Siguiente ›", { step(tl.next(clock.longValue)) }, color = Ink.banana, fontSize = 20f, padding = PaddingValues(horizontal = 30.dp, vertical = 12.dp))
            }
        } else if (tl.elapsed(clock.longValue) >= Cine.finalButtonDelayMs(kind)) {
            val pop = remember { Animatable(0f) }
            LaunchedEffect(Unit) { pop.animateTo(1f, spring(dampingRatio = .55f, stiffness = Spring.StiffnessMediumLow)) }
            StickerButton(
                if (replay) "Volver al menú" else if (kind == CineKind.STORY) "¡Comenzar la aventura!" else "Continuar",
                { finish() }, color = Ink.mint, fontSize = 29f, padding = PaddingValues(horizontal = 48.dp, vertical = 16.dp),
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 36.dp)
                    .graphicsLayer { val s = .4f + .6f * pop.value; scaleX = s; scaleY = s; alpha = pop.value.coerceIn(0f, 1f) }
            )
        }
    }
}

/** Un punto de progreso (se puede tocar para ir a esa escena). */
@Composable
private fun Dot(on: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(22.dp).clickable(remember { MutableInteractionSource() }, null) { onClick() }
            .drawBehind {
                drawCircle(Ink.ink, 8.dp.toPx())
                drawCircle(if (on) Ink.banana else Color(0xFFE6D6BC), 6.dp.toPx())
            }
    )
}

/** El video de la escena en una sola vista que se reutiliza al cambiar de escena (sin parpadeo). */
@Composable
private fun CineVideo(name: String, modifier: Modifier) {
    val context = LocalContext.current
    val player = remember { CinePlayer(context) }
    DisposableEffect(Unit) { onDispose { player.release() } }
    LaunchedEffect(name) { player.play(name) }
    LifecycleEventEffect(Lifecycle.Event.ON_PAUSE) { player.pause() }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { player.resume() }
    AndroidView(factory = { player.createView() }, modifier = modifier)
}
