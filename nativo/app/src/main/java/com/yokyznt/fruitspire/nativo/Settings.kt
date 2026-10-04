package com.yokyznt.fruitspire.nativo

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Ajustes del jugador (los mismos de js/settings.js). Se guardan en el dispositivo y son
 * estado de Compose: quien los lee se redibuja solo cuando cambian.
 */
class Settings(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("ajustes", Context.MODE_PRIVATE)

    var music by mutableStateOf(prefs.getInt("music", 70)); private set
    var sfx by mutableStateOf(prefs.getInt("sfx", 100)); private set
    var vibrate by mutableStateOf(prefs.getBoolean("vibrate", true)); private set
    var mapZoom by mutableStateOf(prefs.getString("mapZoom", "normal") ?: "normal"); private set
    var motion by mutableStateOf(prefs.getString("motion", "todas") ?: "todas"); private set
    var awake by mutableStateOf(prefs.getBoolean("awake", true)); private set

    fun putMusic(v: Int) { music = v.coerceIn(0, 100); prefs.edit().putInt("music", music).apply() }
    fun putSfx(v: Int) { sfx = v.coerceIn(0, 100); prefs.edit().putInt("sfx", sfx).apply() }
    fun putVibrate(v: Boolean) { vibrate = v; prefs.edit().putBoolean("vibrate", v).apply() }
    fun putMapZoom(v: String) { mapZoom = v; prefs.edit().putString("mapZoom", v).apply() }
    fun putMotion(v: String) { motion = v; prefs.edit().putString("motion", v).apply() }
    fun putAwake(v: Boolean) { awake = v; prefs.edit().putBoolean("awake", v).apply() }
}
