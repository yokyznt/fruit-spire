package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.GameInfo
import com.yokyznt.fruitspire.nativo.Settings

/** Ventana de ajustes (renderSettings de js/settings.js). */
@Composable
fun SettingsWindow(settings: Settings, onClose: () -> Unit) {
    val noRipple = remember { MutableInteractionSource() }
    Box(
        Modifier.fillMaxSize().background(Color(0x804A3428)).clickable(noRipple, null) { },
        contentAlignment = Alignment.Center
    ) {
        Column(Modifier.paperPanel().padding(horizontal = 30.dp, vertical = 18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Sprite("ui_gear", 44.dp)
                Spacer(Modifier.width(10.dp))
                BasicText("Ajustes", style = Fonts.hand(46f))
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                Group("Sonido") {
                    SettingRow("Música") { Volume(settings.music) { settings.putMusic(it) } }
                    SettingRow("Efectos") { Volume(settings.sfx) { settings.putSfx(it) } }
                    SettingRow("Vibración") { Segments(listOf(true to "Sí", false to "No"), settings.vibrate) { settings.putVibrate(it) } }
                }
                Group("Pantalla") {
                    SettingRow("Zoom del mapa") { Segments(listOf("lejos" to "Lejos", "normal" to "Normal", "cerca" to "Cerca"), settings.mapZoom) { settings.putMapZoom(it) } }
                    SettingRow("Animaciones") { Segments(listOf("todas" to "Todas", "menos" to "Menos"), settings.motion) { settings.putMotion(it) } }
                    SettingRow("Pantalla encendida") { Segments(listOf(true to "Sí", false to "No"), settings.awake) { settings.putAwake(it) } }
                }
            }
            Spacer(Modifier.height(8.dp))
            BasicText("Fruit Spire ${GameInfo.VERSION} · ${GameInfo.CREATOR}", style = Fonts.hand(21f, Ink.inkSoft))
            Spacer(Modifier.height(12.dp))
            StickerButton("Listo", onClose, color = Ink.mint, fontSize = 21f)
        }
    }
}

@Composable
private fun Group(title: String, content: @Composable () -> Unit) {
    Column(
        Modifier
            .drawBehind {
                drawRoundRect(Color(0xFFE6D6BC), Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(18.dp.toPx()))
                drawRoundRect(Color(0xFFFFFFFF), Offset.Zero, size, CornerRadius(16.dp.toPx()))
            }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        BasicText(title, style = Fonts.hand(31f, Ink.mintDark))
        content()
    }
}

@Composable
private fun SettingRow(label: String, control: @Composable () -> Unit) {
    Row(Modifier.height(54.dp), verticalAlignment = Alignment.CenterVertically) {
        BasicText(label, style = Fonts.body(20f, FontWeight.SemiBold), modifier = Modifier.width(190.dp))
        control()
    }
}

/** Opciones en fila, una sola encendida. */
@Composable
private fun <T> Segments(options: List<Pair<T, String>>, selected: T, onPick: (T) -> Unit) {
    Row(
        Modifier
            .drawBehind { drawRoundRect(Ink.ink, Offset(-2.dp.toPx(), -2.dp.toPx()), Size(size.width + 4.dp.toPx(), size.height + 4.dp.toPx()), CornerRadius(size.height)) }
            .clip(RoundedCornerShape(50))
            .background(Ink.ink),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        for ((value, label) in options) {
            Box(
                Modifier.background(if (value == selected) Ink.mint else Ink.paper2).clickable { onPick(value) }.padding(horizontal = 18.dp).height(46.dp),
                contentAlignment = Alignment.Center
            ) { BasicText(label, style = Fonts.body(18f, FontWeight.SemiBold)) }
        }
    }
}

/** Volumen: − ▮▮▮▮▮▯▯▯▯▯ + */
@Composable
private fun Volume(value: Int, onChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        RoundButton("−") { onChange(value - 10) }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            for (i in 1..10) {
                val on = value >= i * 10
                Box(
                    Modifier.size(13.dp, 34.dp)
                        .drawBehind {
                            drawRoundRect(if (on) Ink.ink else Color(0xFFCDBFA5), size = size, cornerRadius = CornerRadius(6.dp.toPx()))
                            drawRoundRect(if (on) Ink.orange else Color(0xFFE9DFCC), Offset(2.dp.toPx(), 2.dp.toPx()), Size(size.width - 4.dp.toPx(), size.height - 4.dp.toPx()), CornerRadius(4.dp.toPx()))
                        }
                        .clickable { onChange(i * 10) }
                )
            }
        }
        RoundButton("+") { onChange(value + 10) }
        BasicText(if (value == 0) "No" else value.toString(), style = Fonts.display(25f), modifier = Modifier.width(48.dp))
    }
}

@Composable
private fun RoundButton(label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(44.dp)
            .drawBehind {
                drawCircle(Ink.ink, size.minDimension / 2f + 2.dp.toPx(), center + Offset(0f, 3.dp.toPx()))
                drawCircle(Ink.ink, size.minDimension / 2f + 2.dp.toPx())
                drawCircle(Ink.paper2)
            }
            .clip(RoundedCornerShape(50))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { BasicText(label, style = Fonts.body(27f, FontWeight.SemiBold)) }
}
