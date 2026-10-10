package com.yokyznt.fruitspire.nativo.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.util.LruCache
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.roundToInt

/** Qué variantes de un dibujo existen (viene de assets/sprites/sprites.json). */
private class SpriteInfo(val moods: Set<String>, val hurts: Set<Int>, val skins: Set<String>)

/** Un dibujo listo: la imagen (más chica con «Gráficos: Rápidos») y el tamaño en que se pinta, en px de pantalla. */
class SpriteImage(val image: ImageBitmap, val width: Int, val height: Int)

/**
 * Dibujos del juego: imágenes exportadas de la versión web (tools/export-sprites.js).
 * Cada una trae un margen del 12 % por lado y viene SIN borde: aquí se le pone el borde
 * blanco de sticker y su sombra una sola vez por tamaño, y el resultado queda en caché.
 * En pantalla cada dibujo es un solo cuadro de textura: sin filtros ni vectores en juego.
 */
object SpriteStore {
    private const val FRAME = 1.24f      // la imagen mide 124 unidades; el dibujo ocupa las 100 del centro
    private const val PAD = 4            // px extra alrededor para que quepa el borde
    private var assets: android.content.res.AssetManager? = null
    private var info: Map<String, SpriteInfo> = emptyMap()
    private const val MAX_CACHE = 96 * 1024 * 1024
    private val cache = object : LruCache<String, SpriteImage>(MAX_CACHE) {
        override fun sizeOf(key: String, value: SpriteImage) = value.image.width * value.image.height * 4
    }

    /**
     * La caché se ajusta al teléfono: un 35 % de la memoria que Android le da a la app (entre 24 y 96 MB), y 32 MB como mucho en
     * los de poca RAM. Antes eran 96 MB fijos, que en un teléfono modesto empujaban a Android a cerrar la app en segundo plano.
     */
    private fun sizeCache(context: Context) {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager ?: return
        var bytes = (am.memoryClass * 1024L * 1024L * .35).toLong().coerceIn(24L * 1024 * 1024, MAX_CACHE.toLong())
        if (am.isLowRamDevice) bytes = minOf(bytes, 32L * 1024 * 1024)
        cache.resize(bytes.toInt())
    }

    /** Android pide memoria: con poca libre se suelta la mitad de la caché y, si la app ya no se ve o hay muy poca, toda. */
    fun trim(level: Int) {
        when {
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> cache.evictAll()
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> cache.trimToSize(cache.size() / 2)
            level >= android.content.ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> cache.trimToSize(cache.size() / 2)
        }
    }

    fun init(context: Context) {
        if (assets != null) return
        assets = context.applicationContext.assets
        sizeCache(context.applicationContext)
        val json = JSONObject(assets!!.open("sprites/sprites.json").bufferedReader().use { it.readText() })
        val sprites = json.getJSONObject("sprites")
        val map = HashMap<String, SpriteInfo>()
        for (id in sprites.keys()) {
            val s = sprites.getJSONObject(id)
            val moods = s.getJSONArray("moods").let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
            val hurts = s.getJSONArray("hurts").let { a -> (0 until a.length()).map { a.getInt(it) }.toSet() }
            val skins = s.getJSONArray("skins").let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
            map[id] = SpriteInfo(moods, hurts, skins)
        }
        info = map
    }

    fun has(id: String) = info.containsKey(id)

    /** Nombre del archivo para este dibujo con las variantes que de verdad existen. */
    fun fileName(id: String, mood: String? = null, hurt: Int = 0, skin: String? = null): String {
        val s = info[id] ?: return id
        val sb = StringBuilder(id)
        if (skin != null && skin in s.skins) sb.append("~s.").append(skin)
        if (mood != null && mood in s.moods) sb.append('~').append(mood)
        if (hurt > 0 && s.hurts.isNotEmpty()) sb.append("~h").append(s.hurts.filter { it <= hurt }.maxOrNull() ?: s.hurts.min())
        return sb.toString()
    }

    /**
     * Imagen lista para pintar: [layers] (de abajo arriba) compuestas, con borde de sticker.
     * [boxPx] es el lado en px de pantalla que ocupan las 100 unidades del dibujo;
     * [outlinePx] el grosor del borde (0 = sin borde ni sombra).
     */
    fun get(layers: List<String>, boxPx: Int, outlinePx: Int): SpriteImage? {
        // «Gráficos: Rápidos»: se prepara a menor resolución (la mitad de memoria) y se pinta estirado al tamaño de siempre
        val q = if (Fx.lite) Fx.LITE_SCALE else 1f
        val key = layers.joinToString("+") + "@" + boxPx + "/" + outlinePx + (if (q < 1f) "~l" else "")
        cache.get(key)?.let { return it }
        val drawFrame = max(1, (boxPx * FRAME).roundToInt())
        val box = max(1, (boxPx * q).roundToInt())
        val outline = if (outlinePx > 0) max(1, (outlinePx * q).roundToInt()) else 0
        val pad = if (q < 1f) max(1, (PAD * q).roundToInt()) else PAD
        val frame = max(1, (box * FRAME).roundToInt())
        val out = Bitmap.createBitmap(frame + pad * 2, frame + pad * 2, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val art = Bitmap.createBitmap(frame, frame, Bitmap.Config.ARGB_8888)
        val artCanvas = Canvas(art)
        val smooth = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        var drew = false
        for (name in layers) {
            val src = decode(name, frame) ?: continue
            artCanvas.drawBitmap(src, null, android.graphics.Rect(0, 0, frame, frame), smooth)
            src.recycle()
            drew = true
        }
        if (!drew) { art.recycle(); out.recycle(); return null }
        if (outline > 0) {
            val alpha = art.extractAlpha()
            val shadow = Paint().apply { colorFilter = PorterDuffColorFilter(0x384A3428, PorterDuff.Mode.SRC_IN) }
            canvas.drawBitmap(alpha, pad + outline * 0.5f, pad + outline * 1.5f, shadow)
            val white = Paint().apply { colorFilter = PorterDuffColorFilter(0xFFFFFFFF.toInt(), PorterDuff.Mode.SRC_IN) }
            val o = outline.toFloat()
            val d = o * 0.72f
            for ((dx, dy) in listOf(o to 0f, -o to 0f, 0f to o, 0f to -o, d to d, d to -d, -d to d, -d to -d)) {
                canvas.drawBitmap(alpha, pad + dx, pad + dy, white)
            }
            alpha.recycle()
        }
        canvas.drawBitmap(art, pad.toFloat(), pad.toFloat(), null)
        art.recycle()
        val result = SpriteImage(out.asImageBitmap(), drawFrame + PAD * 2, drawFrame + PAD * 2)
        cache.put(key, result)
        return result
    }

    /** Lee la imagen ya reducida cerca del tamaño pedido (para que al encoger no se vea dentada). */
    private fun decode(name: String, target: Int): Bitmap? {
        val am = assets ?: return null
        return try {
            val opts = BitmapFactory.Options()
            var sample = 1
            while (496 / (sample * 2) >= target * 1.6f) sample *= 2
            opts.inSampleSize = sample
            am.open("sprites/$name.webp").use { BitmapFactory.decodeStream(it, null, opts) }
        } catch (e: Exception) { null }
    }

    const val FRAME_RATIO = FRAME
    const val PAD_PX = PAD
}

/** Grosor del borde de sticker (px de pantalla) para un dibujo de [sizeDp]: 2 px de diseño, 1 en los muy chicos. */
private fun outlineFor(sizeDp: Float, density: Float, outline: Boolean): Int =
    if (!outline) 0 else ((if (sizeDp <= 26f) 1f else 2f) * density).roundToInt().coerceAtLeast(1)

/**
 * Pinta un dibujo del juego directo en un [DrawScope] (sin crear un composable): sirve para el mapa, que lleva
 * cientos de casillas. [topLeft] y [sizePx] son los de las 100 unidades del dibujo, en px de pantalla.
 */
fun DrawScope.drawSprite(id: String, topLeft: Offset, sizePx: Float, mood: String? = null, outline: Boolean = true, alpha: Float = 1f) {
    val boxPx = sizePx.roundToInt().coerceAtLeast(1)
    val image = SpriteStore.get(listOf(SpriteStore.fileName(id, mood)), boxPx, outlineFor(sizePx / density, density, outline)) ?: return
    val frame = (boxPx * SpriteStore.FRAME_RATIO).roundToInt()
    val shift = ((boxPx - frame) / 2f).roundToInt() - SpriteStore.PAD_PX
    drawImage(
        image.image, dstOffset = IntOffset(topLeft.x.roundToInt() + shift, topLeft.y.roundToInt() + shift),
        dstSize = IntSize(image.width, image.height), alpha = alpha
    )
}

/** Un dibujo que se va a necesitar pronto: [sizeDp] en px de diseño. */
class SpriteRequest(val id: String, val sizeDp: Float, val mood: String? = null)

/** Deja listos en la caché los dibujos de [requests] (llamar desde un hilo de fondo para no trabar la pantalla). */
fun SpriteStore.preload(density: Float, requests: Collection<SpriteRequest>) {
    for (r in requests) {
        val boxPx = (r.sizeDp * density).roundToInt().coerceAtLeast(1)
        get(listOf(fileName(r.id, r.mood)), boxPx, outlineFor(r.sizeDp, density, true))
    }
}

/**
 * Un dibujo del juego (equivale a art(id, …) de js/art/sprites.js).
 * [size] es el lado que ocupan sus 100 unidades; [extra] son capas encima (accesorios, mascotita).
 */
@Composable
fun Sprite(
    id: String,
    size: Dp,
    modifier: Modifier = Modifier,
    mood: String? = null,
    hurt: Int = 0,
    skin: String? = null,
    extra: List<String> = emptyList(),
    outline: Boolean = true,
    /** Solo la mancha oscura del dibujo (lo que aún no descubres): el brightness(0) con opacidad .28 de la versión web. */
    silhouette: Boolean = false
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    SpriteStore.init(context)
    val boxPx = with(density) { size.toPx() }.roundToInt().coerceAtLeast(1)
    // borde de 2 px de diseño (1 en los dibujos muy chicos), como el filtro del juego web
    val outlinePx = if (!outline) 0 else ((if (size.value <= 26f) 1f else 2f) * density.density).roundToInt().coerceAtLeast(1)
    val image = remember(id, mood, hurt, skin, extra, boxPx, outlinePx, Fx.lite) {
        SpriteStore.get(listOf(SpriteStore.fileName(id, mood, hurt, skin)) + extra, boxPx, outlinePx)
    }
    Canvas(modifier.size(size)) {
        val img = image ?: return@Canvas
        val frame = (boxPx * SpriteStore.FRAME_RATIO).roundToInt()
        val shift = ((boxPx - frame) / 2f).roundToInt() - SpriteStore.PAD_PX
        drawImage(
            img.image, dstOffset = IntOffset(shift, shift), dstSize = IntSize(img.width, img.height),
            alpha = if (silhouette) .28f else 1f, colorFilter = if (silhouette) ColorFilter.tint(Color.Black) else null
        )
    }
}
