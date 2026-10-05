package com.yokyznt.fruitspire.nativo.ui

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.util.Log
import android.view.Surface
import android.view.TextureView

/**
 * Reproduce los videos de la historia y el final (assets/cine, exportados de la web por tools/export-cine.js) en una sola
 * [TextureView] con un solo [MediaPlayer]: al cambiar de escena se reutilizan los dos, y la imagen anterior se queda en pantalla
 * hasta que llega el primer cuadro del video nuevo (sin parpadeo negro). El video es de 1920×810 y se recorta para llenar la pantalla.
 * Todo va dentro de `runCatching`: si algo falla la escena se ve sin video, pero el texto y los controles siguen.
 */
class CinePlayer(private val context: Context) {
    private var player: MediaPlayer? = null
    private var surface: Surface? = null
    private var pending: String? = null
    private var paused = false

    fun createView(): TextureView = TextureView(context).apply {
        surfaceTextureListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(st: SurfaceTexture, width: Int, height: Int) {
                surface = Surface(st)
                pending?.let { start(it) }
            }
            override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, width: Int, height: Int) {}
            override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
                runCatching { player?.setSurface(null) }
                surface?.release(); surface = null
                return true
            }
            override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}
        }
        addOnLayoutChangeListener { v, _, _, _, _, _, _, _, _ -> fit(v as TextureView) }
    }

    /** Llena la vista con el video sin deformarlo (recorta lo que sobre por los lados o por arriba y abajo). */
    private fun fit(v: TextureView) {
        val w = v.width.toFloat(); val h = v.height.toFloat()
        if (w <= 0f || h <= 0f) return
        val k = maxOf(w / VIDEO_W, h / VIDEO_H)
        v.setTransform(Matrix().apply { setScale(VIDEO_W * k / w, VIDEO_H * k / h, w / 2f, h / 2f) })
    }

    /** Pone el video [name] (sin .mp4) de assets/cine; si la superficie aún no existe, arranca al aparecer. */
    fun play(name: String) {
        pending = name
        if (surface != null) start(name)
    }

    private fun start(name: String) {
        runCatching {
            val p = player ?: MediaPlayer().also { mp ->
                player = mp
                mp.setOnPreparedListener { if (!paused) it.start() }
                mp.setOnErrorListener { _, what, extra -> Log.w(TAG, "video: error $what/$extra"); true }
            }
            p.reset()
            p.setSurface(surface)
            context.assets.openFd("cine/$name.mp4").use { p.setDataSource(it.fileDescriptor, it.startOffset, it.length) }
            p.isLooping = false
            p.prepareAsync()
        }.onFailure { Log.w(TAG, "no se pudo poner el video $name", it) }
    }

    fun pause() { paused = true; runCatching { player?.pause() } }
    fun resume() { paused = false; runCatching { player?.start() } }

    fun release() {
        runCatching { player?.release() }
        player = null
        surface?.release(); surface = null
    }

    companion object {
        private const val TAG = "CinePlayer"
        const val VIDEO_W = 1920f
        const val VIDEO_H = 810f
    }
}
