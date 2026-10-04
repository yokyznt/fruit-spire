package com.yokyznt.fruitspire.nativo

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.MenuScreen
import com.yokyznt.fruitspire.nativo.ui.SettingsWindow
import com.yokyznt.fruitspire.nativo.ui.SpriteStore
import com.yokyznt.fruitspire.nativo.ui.ToastState
import com.yokyznt.fruitspire.nativo.ui.notebookPaper

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        SpriteStore.init(this)
        val settings = Settings(this)
        setContent {
            // Ajustes → Pantalla encendida
            LaunchedEffect(settings.awake) {
                if (settings.awake) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            DesignCanvas {
                var showSettings by remember { mutableStateOf(false) }
                val toast = remember { ToastState() }
                val soon = { toast.show("Llega en la siguiente etapa") }
                Box(Modifier.fillMaxSize().notebookPaper()) {
                    MenuScreen(
                        canContinue = false,
                        onContinue = soon, onNewGame = soon, onTutorial = soon, onPass = soon,
                        onWardrobe = soon, onCollection = soon, onNotes = soon,
                        onSettings = { showSettings = true }
                    )
                    if (showSettings) SettingsWindow(settings) { showSettings = false }
                    toast.Host(Modifier.align(Alignment.BottomCenter).padding(bottom = 40.dp))
                }
            }
        }
    }

    // Pantalla completa: sin barra de estado ni botones de Android (vuelven al deslizar desde el borde)
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) return
        val bars = WindowCompat.getInsetsController(window, window.decorView)
        bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        bars.hide(WindowInsetsCompat.Type.systemBars())
    }
}
