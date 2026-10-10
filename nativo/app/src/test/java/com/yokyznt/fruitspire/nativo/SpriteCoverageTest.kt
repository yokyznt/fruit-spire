package com.yokyznt.fruitspire.nativo

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.Cosmetics
import com.yokyznt.fruitspire.core.Equipped
import com.yokyznt.fruitspire.core.Events
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Sprouts
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.nativo.ui.NodeInfo
import com.yokyznt.fruitspire.nativo.ui.SpriteStore
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/**
 * Nada del juego puede caer a un emoji o a un hueco: cada carta, enemigo, objeto, estado, evento, fruta, accesorio y mascotita tiene
 * su dibujo exportado (lo pide el usuario: «estos diseños de emojis sencillos no»). Si falta uno, la prueba dice cuáles.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class SpriteCoverageTest {
    private val assets = File("src/main/assets/sprites")

    @Before fun init() { SpriteStore.init(ApplicationProvider.getApplicationContext<Application>()) }

    private fun assertNoneMissing(what: String, missing: List<String>) =
        assertTrue("$what sin dibujo (${missing.size}): ${missing.take(40)}", missing.isEmpty())

    @Test fun everyCardHasArt() =
        assertNoneMissing("cartas", Cards.all().filter { !SpriteStore.has(it.sprite ?: it.id) }.map { it.id })

    @Test fun everyEnemyAndItsPhasesHaveArt() {
        val missing = Enemies.db.values.flatMap { e ->
            (listOf(e.sprite ?: e.id) + (e.phaseSprites ?: emptyList())).filter { !SpriteStore.has(it) }.map { "${e.id}→$it" }
        }
        assertNoneMissing("enemigos", missing)
    }

    @Test fun everyRelicHasArt() =
        assertNoneMissing("objetos", Relics.db.keys.filter { !SpriteStore.has(it) })

    @Test fun everyStatusHasArt() =
        assertNoneMissing("estados", Statuses.db.values.filter { !SpriteStore.has(it.sprite) }.map { "${it.id}→${it.sprite}" })

    @Test fun everySproutHasArt() =
        assertNoneMissing("brotes", Sprouts.db.values.filter { !SpriteStore.has(it.sprite) }.map { it.id })

    @Test fun everyEventHasArt() =
        assertNoneMissing("eventos", Events.all.filter { !SpriteStore.has(it.sprite ?: it.id) }.map { it.id })

    @Test fun everyCharacterHasArt() =
        assertNoneMissing("frutas", World.characters.filter { !SpriteStore.has(it.id) }.map { it.id })

    @Test fun everyMapNodeHasArt() {
        val types = listOf("enemy", "elite", "rest", "treasure", "shop", "mystery", "game", "key", "vault", "blocked")
        val missing = types.flatMap { t -> (1..3).mapNotNull { c -> NodeInfo.of(t, c)?.sprite } }.distinct().filter { !SpriteStore.has(it) }
        assertNoneMissing("casillas", missing)
    }

    @Test fun everyCosmeticHasItsFiles() {
        val missing = ArrayList<String>()
        for (c in Cosmetics.all) {
            when (c.type) {
                "skin" -> if (!File(assets, "${c.char}~s.${c.id}.webp").exists()) missing.add("color ${c.id}")
                "pet" -> if (!File(assets, "peticon~${c.id}.webp").exists()) missing.add("icono ${c.id}")
                else -> if (!File(assets, "accicon~${c.id}.webp").exists()) missing.add("icono ${c.id}")
            }
        }
        // cada accesorio y mascotita se ve puesto en cada fruta que puede llevarlo
        for (ch in World.characters) for (c in Cosmetics.all) {
            if (c.type == "skin") continue
            if (c.char != null && c.char != ch.id) continue
            val eq = when {
                c.type == "pet" -> Equipped(pet = c.id)
                c.slot == "head" -> Equipped(head = c.id)
                c.slot == "face" -> Equipped(face = c.id)
                else -> Equipped(neck = c.id)
            }
            for (layer in Cosmetics.layersFor(ch.id, eq)) if (!File(assets, "$layer.webp").exists()) missing.add(layer)
        }
        assertNoneMissing("accesorios/mascotas", missing.distinct())
    }
}
