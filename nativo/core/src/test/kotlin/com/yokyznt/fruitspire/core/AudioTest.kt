package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.gen.GEN_BUZZ
import com.yokyznt.fruitspire.core.data.gen.GEN_PLAYLISTS
import com.yokyznt.fruitspire.core.data.gen.GEN_SONGS
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** El sonido del juego (js/audio.js): lo que se genera con tools/export-audio.js, qué música suena en cada pantalla y cómo avanza la lista. */
class AudioTest {
    // ------------------------------------------------------------------ datos generados
    @Test
    fun everySfxOfTheWebGameIsThere() {
        assertEquals(34, Sfx.entries.size, "los 34 efectos de Sfx en js/audio.js")
        val ids = Sfx.entries.map { it.id }
        assertEquals(ids.size, ids.toSet().size)
        listOf("click", "cardAttack", "hit", "block", "coin", "win", "lose", "introSting", "actFanfare", "seedUse", "equip").forEach { assertTrue(it in ids, it) }
        assertEquals("INTRO_STING", Sfx.byId("introSting")?.name, "el nombre de cada uno sale de su id en camelCase")
        Sfx.entries.forEach { assertTrue(it.variants >= 1, it.id) }
        assertEquals(2, Sfx.INTRO_STING.variants, "introSting suena distinto si el rival es fuerte")
    }

    @Test
    fun songsAndPlaylistsAgree() {
        assertEquals(21, GEN_SONGS.size)
        assertEquals(11, GEN_PLAYLISTS.size)
        assertEquals(
            setOf("menu", "map1", "map2", "map3", "combat", "elite", "boss", "shop", "rest", "dungeon", "casino"), GEN_PLAYLISTS.keys
        )
        val ids = GEN_SONGS.map { it.id }.toSet()
        GEN_PLAYLISTS.forEach { (ctx, list) ->
            assertTrue(list.isNotEmpty(), ctx)
            list.forEach { assertTrue(it in ids, "$ctx nombra una canción que no existe: $it") }
        }
        assertEquals(ids, GEN_PLAYLISTS.values.flatten().toSet(), "todas las canciones están en alguna lista")
        GEN_SONGS.forEach { assertTrue(it.seconds in 20.0..55.0, "${it.id}: ${it.seconds} s") }
        // 16 compases de 8 corcheas: 3840 / bpm segundos
        assertEquals(3840.0 / 100, GEN_SONGS.first { it.id == "menu_a" }.seconds, 0.01)
    }

    @Test
    fun onlyTheSameEffectsVibrateAsInTheWebGame() {
        assertEquals(setOf("hit", "block", "denied", "enemyDeath", "lose", "win", "coin", "relicGet", "chestOpen", "upgrade", "removeCard"), GEN_BUZZ.keys)
        assertEquals(listOf(16L), GEN_BUZZ["hit"])
        assertEquals(listOf(14L, 50L, 14L), GEN_BUZZ["win"])
        GEN_BUZZ.keys.forEach { assertNotNull(Sfx.byId(it), it) }
    }

    // ------------------------------------------------------------------ qué música suena
    @Test
    fun musicFollowsTheScreen() {
        fun ctx(s: RunScreen, kind: String = "enemy", act: Int = 1) = MusicContext.forRun(s, kind, act)
        assertEquals("map1", ctx(RunScreen.MAP))
        assertEquals("map2", ctx(RunScreen.MAP, act = 2))
        assertEquals("map3", ctx(RunScreen.MAP, act = 3))
        assertEquals("map3", ctx(RunScreen.MAP, act = 7), "pasado el castillo 3 sigue la del 3")
        assertEquals("map1", ctx(RunScreen.MAP, act = 0))
        assertEquals("combat", ctx(RunScreen.COMBAT))
        assertEquals("elite", ctx(RunScreen.COMBAT, kind = "elite"))
        assertEquals("boss", ctx(RunScreen.COMBAT, kind = "boss"))
        assertEquals("shop", ctx(RunScreen.SHOP))
        assertEquals("rest", ctx(RunScreen.REST))
        assertEquals("rest", ctx(RunScreen.GAME_OVER))
        assertEquals("dungeon", ctx(RunScreen.DUNGEON))
        assertEquals("casino", ctx(RunScreen.MINIGAME))
        assertEquals("menu", ctx(RunScreen.VICTORY))
        // todo lo demás de una partida suena como el mapa de ese castillo
        listOf(
            RunScreen.ACT_INTRO, RunScreen.REWARD, RunScreen.BOSS_RELIC, RunScreen.TREASURE, RunScreen.KEY_FOUND, RunScreen.VAULT,
            RunScreen.EVENT, RunScreen.EVENT_RESULT, RunScreen.WELL, RunScreen.FATE
        ).forEach { assertEquals("map2", ctx(it, act = 2), it.name) }
        RunScreen.entries.forEach { assertTrue(ctx(it) in GEN_PLAYLISTS, "${it.name} da una lista que no existe") }
        assertEquals("menu", MusicContext.MENU)
        assertTrue(MusicContext.MENU in GEN_PLAYLISTS)
    }

    // ------------------------------------------------------------------ la lista de canciones
    @Test
    fun eachPlaceFollowsItsOwnListInOrder() {
        val plan = MusicPlan(java.util.Random(5))
        val list = GEN_PLAYLISTS.getValue("combat")
        val first = plan.next("combat")
        assertTrue(first in list)
        // después sigue en orden, dando la vuelta
        var i = list.indexOf(first)
        repeat(7) { i = (i + 1) % list.size; assertEquals(list[i], plan.next("combat")) }
        // otro lugar lleva su propia cuenta
        val menu = GEN_PLAYLISTS.getValue("menu")
        val m = plan.next("menu")
        assertTrue(m in menu)
        assertEquals(menu[(menu.indexOf(m) + 1) % menu.size], plan.next("menu"))
        assertEquals(list[(i + 1) % list.size], plan.next("combat"), "volver a un lugar sigue donde iba")
    }

    @Test
    fun anUnknownPlaceFallsBackToTheMenuList() {
        val plan = MusicPlan(java.util.Random(1))
        assertTrue(plan.next("no_existe") in GEN_PLAYLISTS.getValue("menu"))
    }

    @Test
    fun aSingleSongListRepeatsItself() {
        val plan = MusicPlan(java.util.Random(9))
        assertEquals("shop", plan.next("shop"))
        assertEquals("shop", plan.next("shop"))
    }

    // ------------------------------------------------------------------ volumen
    @Test
    fun volumeFollowsTheWebCurve() {
        assertEquals(0.0, Volume.curve(0), 1e-9)
        assertEquals(1.0, Volume.curve(100), 1e-9)
        assertEquals(Math.pow(0.7, 1.7), Volume.curve(70), 1e-9)
        assertEquals(1.0, Volume.curve(250), 1e-9, "se queda en 0 a 100")
        assertEquals(0.0, Volume.curve(-5), 1e-9)
    }
}
