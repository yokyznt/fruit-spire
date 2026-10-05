package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Vibrator
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.data.gen.GEN_PLAYLISTS
import com.yokyznt.fruitspire.core.data.gen.GEN_SONGS
import com.yokyznt.fruitspire.core.data.gen.Sfx
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** El reproductor de Android: los archivos de audio exportados están todos, y nada truena al tocarlos. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AndroidAudioTest {
    private val app: Application get() = ApplicationProvider.getApplicationContext()

    @Test
    fun everyEffectAndEverySongHasItsFile() {
        val am = app.assets
        Sfx.entries.forEach { s -> for (v in 0 until s.variants) am.openFd("audio/sfx/${s.id}_$v.ogg").close() }
        GEN_SONGS.forEach { am.openFd("audio/music/${it.id}.ogg").close() }
        assertEquals("sin archivos sueltos de más", Sfx.entries.sumOf { it.variants }, am.list("audio/sfx")!!.size)
        assertEquals(GEN_SONGS.size, am.list("audio/music")!!.size)
    }

    @Test
    fun theWholeSoundtrackCanBeScrolledThroughWithoutCrashing() {
        val settings = Settings(app)
        val audio = AndroidAudio(app, settings)
        Sfx.entries.forEach { s -> audio.play(s, -1); audio.play(s, 0) }
        GEN_PLAYLISTS.keys.forEach { audio.music(it) }
        audio.music(null)
        audio.music("combat")
        audio.pause(); audio.resume()
        listOf("music", "sfx", "vibrate", "mapZoom").forEach { audio.settingChanged(it) }
        settings.putMusic(0); audio.settingChanged("music")
        settings.putMusic(70); audio.settingChanged("music")
        audio.release()
    }

    @Test
    fun hitsVibrateOnlyWhenVibrationIsOn() {
        val settings = Settings(app)
        val audio = AndroidAudio(app, settings)
        val vib = shadowOf(app.getSystemService(Vibrator::class.java))
        settings.putVibrate(false)
        audio.play(Sfx.HIT, 0)
        assertFalse("con la vibración apagada no vibra", vib.isVibrating)
        settings.putVibrate(true)
        audio.play(Sfx.HIT, 0)
        assertTrue("con la vibración encendida, el golpe vibra", vib.isVibrating || vib.milliseconds > 0 || (vib.pattern?.isNotEmpty() == true))
        audio.release()
    }

    @Test
    fun theWaveformStartsWithNoDelayAndKeepsTheWebPattern() {
        assertEquals(listOf(0L, 16L), AndroidAudio.waveform(listOf(16L)).toList())
        assertEquals(listOf(0L, 14L, 50L, 14L), AndroidAudio.waveform(listOf(14L, 50L, 14L)).toList())
    }
}
