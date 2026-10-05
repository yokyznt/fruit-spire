package com.yokyznt.fruitspire.nativo

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.yokyznt.fruitspire.core.MusicPlan
import com.yokyznt.fruitspire.core.Volume
import com.yokyznt.fruitspire.core.data.gen.GEN_BUZZ
import com.yokyznt.fruitspire.core.data.gen.GEN_PLAYLISTS
import com.yokyznt.fruitspire.core.data.gen.Sfx
import com.yokyznt.fruitspire.nativo.ui.GameAudio
import java.util.Random
import java.util.concurrent.ConcurrentHashMap

/**
 * El sonido de la app: los efectos van en un SoundPool (se cargan todos al arrancar), la música en un MediaPlayer que sigue la lista
 * de cada lugar, y la vibración sale de la tabla BUZZ de la web. Los archivos los exporta tools/export-audio.js desde js/audio.js
 * con los buses al máximo; aquí solo se aplica el volumen de Ajustes con la misma curva `(v/100)^1.7`.
 */
class AndroidAudio(context: Context, private val settings: Settings, private val plan: MusicPlan = MusicPlan()) : GameAudio {
    private val app = context.applicationContext
    private val rand = Random()
    private val handler = Handler(Looper.getMainLooper())
    private var paused = false

    // ---------- efectos ----------
    private val pool: SoundPool = SoundPool.Builder().setMaxStreams(8).setAudioAttributes(attrs(AudioAttributes.CONTENT_TYPE_SONIFICATION)).build()
    private val sounds = HashMap<String, Int>()
    private val ready: MutableSet<Int> = ConcurrentHashMap.newKeySet()

    init {
        pool.setOnLoadCompleteListener { _, id, status -> if (status == 0) ready.add(id) }
        for (s in Sfx.entries) for (v in 0 until s.variants) {
            try {
                app.assets.openFd("audio/sfx/${s.id}_$v.ogg").use { fd -> sounds["${s.id}_$v"] = pool.load(fd, 1) }
            } catch (e: Exception) { Log.w(TAG, "sin el efecto ${s.id}_$v", e) }
        }
    }

    override fun play(sfx: Sfx, variant: Int) {
        if (!paused && settings.sfx > 0) {
            val v = if (variant < 0) rand.nextInt(sfx.variants) else variant.coerceAtMost(sfx.variants - 1)
            val id = sounds["${sfx.id}_$v"]
            if (id != null && id in ready) {
                val g = Volume.curve(settings.sfx).toFloat()
                pool.play(id, g, g, 1, 0, 1f)
            }
        }
        GEN_BUZZ[sfx.id]?.let { vibrate(it) }
    }

    // ---------- vibración ----------
    private val vibrator: Vibrator? = try {
        if (Build.VERSION.SDK_INT >= 31) app.getSystemService(VibratorManager::class.java)?.defaultVibrator
        else @Suppress("DEPRECATION") (app.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)
    } catch (e: Exception) { null }

    /** Solo si está activada en Ajustes y la app se ve (en segundo plano no vibra, como la web con la pestaña oculta). */
    private fun vibrate(pattern: List<Long>) {
        val v = vibrator ?: return
        if (!settings.vibrate || paused || !v.hasVibrator()) return
        try {
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(waveform(pattern), -1))
            else @Suppress("DEPRECATION") v.vibrate(waveform(pattern), -1)
        } catch (e: Exception) { Log.w(TAG, "no se pudo vibrar", e) }
    }

    // ---------- música ----------
    private var place: String? = null
    private var playingPlace: String? = null
    private var player: MediaPlayer? = null

    override fun music(place: String?) {
        if (place == this.place && (player != null || place == null)) return
        this.place = place
        if (place == null) { stopPlayer(fade = true); playingPlace = null; return }
        if (place != playingPlace || player == null) startSong()
    }

    /** Pone la siguiente canción de la lista del lugar actual (cambiar de lugar o terminar una canción llegan aquí). */
    private fun startSong() {
        val place = place ?: return
        stopPlayer(fade = true)
        playingPlace = place
        if (paused || settings.music <= 0) return
        try {
            val mp = MediaPlayer()
            app.assets.openFd("audio/music/${plan.next(place)}.ogg").use { fd -> mp.setDataSource(fd.fileDescriptor, fd.startOffset, fd.length) }
            mp.setAudioAttributes(attrs(AudioAttributes.CONTENT_TYPE_MUSIC))
            mp.isLooping = (GEN_PLAYLISTS[place]?.size ?: 0) == 1 // una lista de una sola canción se repite
            mp.setOnCompletionListener { if (player === it) startSong() }
            mp.setOnErrorListener { p, _, _ -> if (player === p) stopPlayer(fade = false); true }
            mp.prepare()
            val g = Volume.curve(settings.music).toFloat()
            mp.setVolume(g, g)
            mp.start()
            player = mp
        } catch (e: Exception) {
            Log.w(TAG, "no se pudo tocar la música de $place", e)
            player = null
        }
    }

    private fun stopPlayer(fade: Boolean) {
        val old = player ?: return
        player = null
        if (!fade || paused) { release(old); return }
        // un fundido cortito para que el cambio no suene a corte
        val start = Volume.curve(settings.music).toFloat()
        var step = 0
        handler.post(object : Runnable {
            override fun run() {
                step++
                try { val g = start * (1f - step / 6f).coerceAtLeast(0f); old.setVolume(g, g) } catch (e: Exception) { /* ya liberado */ }
                if (step < 6) handler.postDelayed(this, 30) else release(old)
            }
        })
    }

    private fun release(mp: MediaPlayer) {
        try { mp.setOnCompletionListener(null); mp.release() } catch (e: Exception) { /* ya liberado */ }
    }

    private fun applyMusicVolume() {
        if (settings.music <= 0) { stopPlayer(fade = false); return }
        val p = player
        if (p == null) { if (place != null && !paused) startSong() }
        else try { val g = Volume.curve(settings.music).toFloat(); p.setVolume(g, g) } catch (e: Exception) { /* sin reproductor */ }
    }

    // ---------- ciclo de vida y ajustes ----------
    override fun pause() {
        paused = true
        try { player?.pause() } catch (e: Exception) { /* sin reproductor */ }
    }

    override fun resume() {
        paused = false
        val p = player
        if (p != null) try { p.start() } catch (e: Exception) { /* sin reproductor */ }
        else if (place != null) startSong()
    }

    override fun settingChanged(key: String) {
        when (key) {
            "music" -> applyMusicVolume()
            "sfx" -> play(Sfx.SELECT) // para oír cómo quedó el volumen
            "vibrate" -> if (settings.vibrate) vibrate(listOf(30L))
        }
    }

    override fun release() {
        stopPlayer(fade = false)
        pool.release()
    }

    companion object {
        private const val TAG = "AndroidAudio"

        /** Los tiempos de `navigator.vibrate` (vibra, pausa, vibra…) como los pide Android: empiezan con una pausa de 0. */
        fun waveform(pattern: List<Long>): LongArray = longArrayOf(0L) + pattern.toLongArray()

        private fun attrs(content: Int): AudioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(content).build()
    }
}
