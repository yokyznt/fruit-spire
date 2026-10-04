package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.Dp
import com.yokyznt.fruitspire.core.Cosmetics
import com.yokyznt.fruitspire.core.Equipped
import com.yokyznt.fruitspire.core.Progress
import com.yokyznt.fruitspire.core.data.CosmeticDef

/** Lo que tiene y lleva puesto el jugador (la raíz del juego lo pone; sin él las frutas salen sin vestir, como en las capturas). */
val LocalProgress = compositionLocalOf<Progress?> { null }

/**
 * La fruta [charId] vestida con su color, sus accesorios y su mascotita (`dressOptions` del juego web). Con [override] se ve con otra
 * ropa (el vestidor, antes de guardar); con [dressed] = false, tal cual.
 */
@Composable
fun FruitSprite(
    charId: String, size: Dp, modifier: Modifier = Modifier, mood: String? = null, hurt: Int = 0,
    dressed: Boolean = true, override: Equipped? = null
) {
    val eq = override ?: if (dressed) LocalProgress.current?.equippedFor(charId) else null
    Sprite(charId, size, modifier, mood, hurt, skin = eq?.skin, extra = if (eq == null) emptyList() else Cosmetics.layersFor(charId, eq))
}

/**
 * El dibujo de algo del vestidor: la fruta con ese color, el accesorio solo o la mascotita sola. Bloqueado: se ve apagado
 * (lo demás —candado, signo de pregunta— lo pone quien lo llama).
 */
@Composable
fun CosmeticIcon(c: CosmeticDef, size: Dp, modifier: Modifier = Modifier, locked: Boolean = false) {
    val m = if (locked) modifier.alpha(.45f) else modifier
    when (c.type) {
        "skin" -> Sprite(c.char ?: "manzana", size, m, skin = c.id)
        "pet" -> Sprite("peticon~${c.id}", size, m)
        else -> Sprite("accicon~${c.id}", size, m)
    }
}
