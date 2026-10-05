package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.World
import com.yokyznt.fruitspire.core.data.gen.Sfx
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** La historia del inicio y el final (js/story.js, js/ending.js): escenas, textos, videos y la línea de tiempo. */
class CineTest {
    private val storyDurs = listOf(7000, 6500, 9000, 8000, 7000, 0)
    private val endingDurs = listOf(7500, 7500, 9000, 8000, 0)

    @Test
    fun scenesMatchTheWebGame() {
        assertEquals(storyDurs, Cine.story.map { it.durMs })
        assertEquals(endingDurs, Cine.ending.map { it.durMs })
        assertEquals(listOf(Sfx.SPARKLE, Sfx.INTRO_STING, Sfx.SHUFFLE, Sfx.TURN_ENEMY, Sfx.LOSE, Sfx.WIN), Cine.story.map { it.sfx })
        assertEquals(listOf(Sfx.WIN, Sfx.RELIC_GET, Sfx.ACT_FANFARE, Sfx.SPARKLE, Sfx.WIN), Cine.ending.map { it.sfx })
        assertEquals(1, Cine.story[1].sfxVariant, "la invasión suena fuerte (introSting(true))")
        assertEquals(-1, Cine.story[0].sfxVariant)
    }

    @Test
    fun textsUseTheFruitName() {
        assertTrue(Cine.story[0].text("Manzana").startsWith("Érase una vez el Reino de las Frutas"))
        assertEquals("Esa fruta valiente eres tú, Kiwi. Sube los tres castillos, libera a tus amigos y rescata al Rey Fruta.", Cine.story[5].text("Kiwi"))
        assertEquals("Y el Rey Fruta nombró a Uva Héroe del Reino. ¡Gracias por jugar!", Cine.ending[4].text("Uva"))
        (Cine.story + Cine.ending).forEach { assertTrue(it.text("X").isNotBlank()) }
    }

    @Test
    fun sceneVideosDependOnTheFruitOnlyWhereTheWebDrawsIt() {
        assertEquals("s0_manzana", Cine.video(CineKind.STORY, 0, "manzana"))
        assertEquals("s2_kiwi", Cine.video(CineKind.STORY, 2, "kiwi"))
        assertEquals("s5_uva", Cine.video(CineKind.STORY, 5, "uva"))
        assertEquals("s3", Cine.video(CineKind.STORY, 3, "kiwi"), "los castillos no dependen de la fruta")
        assertEquals("s4", Cine.video(CineKind.STORY, 4, "uva"))
        assertEquals("e1_manzana", Cine.video(CineKind.ENDING, 1, "manzana"))
        assertEquals("e0_kiwi_horno_infernal", Cine.video(CineKind.ENDING, 0, "kiwi", "horno_infernal"))
        assertEquals("e0_kiwi_licuadora_suprema", Cine.video(CineKind.ENDING, 0, "kiwi", null), "sin jefe se usa la Licuadora")
        assertEquals("e0_kiwi_licuadora_suprema", Cine.video(CineKind.ENDING, 0, "kiwi", "avispa_furiosa"), "un jefe que no es final tampoco cambia el video")
        assertEquals("s0_manzana", Cine.video(CineKind.STORY, 0, "no_existe"), "una fruta desconocida usa la manzana")
    }

    @Test
    fun everyFruitAndFinalBossHasItsVideoName() {
        val heroes = World.characters.map { it.id }
        assertEquals(4, heroes.size)
        assertEquals(3, Cine.FINAL_BOSSES.size)
        heroes.forEach { h -> assertEquals("s1_$h", Cine.video(CineKind.STORY, 1, h)); Cine.FINAL_BOSSES.forEach { b -> assertEquals("e0_${h}_$b", Cine.video(CineKind.ENDING, 0, h, b)) } }
    }

    @Test
    fun extraSoundsFollowTheWeb() {
        assertEquals(listOf(350 to Sfx.HIT, 1650 to Sfx.HIT), Cine.extraSfx(CineKind.STORY, 1))
        assertEquals(listOf(900, 1900, 2900, 3900).map { it to Sfx.SPARKLE }, Cine.extraSfx(CineKind.ENDING, 3))
        assertTrue(Cine.extraSfx(CineKind.STORY, 0).isEmpty())
        assertTrue(Cine.extraSfx(CineKind.ENDING, 0).isEmpty())
    }

    @Test
    fun theFinalButtonAppearsLikeInTheWeb() {
        assertEquals(2400, Cine.finalButtonDelayMs(CineKind.STORY))
        assertEquals(2600, Cine.finalButtonDelayMs(CineKind.ENDING))
    }

    // ------------------------------------------------------------------ línea de tiempo
    @Test
    fun scenesAdvanceByThemselvesAfterTheirDuration() {
        val t = CineTimeline(CineKind.STORY, 1000)
        assertFalse(t.tick(1000 + 6999))
        assertEquals(0, t.index)
        assertTrue(t.tick(1000 + 7000))
        assertEquals(1, t.index)
        assertFalse(t.tick(1000 + 7000 + 6499), "la escena 1 dura 6.5 s desde que entró")
        assertTrue(t.tick(1000 + 7000 + 6500))
        assertEquals(2, t.index)
    }

    @Test
    fun theLastSceneWaitsForATap() {
        val t = CineTimeline(CineKind.ENDING, 0)
        t.go(4, 0)
        assertTrue(t.isLast)
        assertFalse(t.tick(10_000_000), "la última no avanza sola")
        assertEquals(CineStep.FINISH, t.next(10_000_000))
    }

    @Test
    fun aDoubleTapDoesNotSkipTwoScenes() {
        val t = CineTimeline(CineKind.STORY, 0)
        assertEquals(CineStep.IGNORED, t.next(349))
        assertEquals(0, t.index)
        assertEquals(CineStep.MOVED, t.next(350))
        assertEquals(1, t.index)
        assertEquals(CineStep.IGNORED, t.next(350 + 100), "recién entró a la escena 1")
        assertEquals(CineStep.MOVED, t.next(350 + 350))
        assertEquals(2, t.index)
    }

    @Test
    fun backAndDotsGoWhereTheyShould() {
        val t = CineTimeline(CineKind.STORY, 0)
        t.back(10)
        assertEquals(0, t.index, "atrás en la primera se queda")
        t.go(3, 20)
        assertEquals(3, t.index)
        t.back(30)
        assertEquals(2, t.index)
        t.go(99, 40)
        assertEquals(5, t.index, "ir más allá se queda en la última")
        t.go(-4, 50)
        assertEquals(0, t.index)
    }

    @Test
    fun theTimerRestartsWhenTheSceneChanges() {
        val t = CineTimeline(CineKind.STORY, 0)
        t.go(2, 5000)
        assertFalse(t.tick(5000 + 8999))
        assertTrue(t.tick(5000 + 9000))
        assertEquals(3, t.index)
    }

    // ------------------------------------------------------------------ lo que se guarda
    @Test
    fun theEndingSeenFlagIsSavedAndOldSavesReadAsNotSeen() {
        val p = Progress()
        assertFalse(p.endingSeen)
        p.markEndingSeen()
        assertTrue(p.endingSeen)
        assertTrue(p.dirty)
        val back = Save.decodeProgress(Save.encodeProgress(p))
        assertTrue(back.endingSeen)
        val old = Save.encodeProgress(Progress()).replace(Regex("\"endingSeen\"\\s*:\\s*(true|false),?"), "")
        assertFalse(Save.decodeProgress(old).endingSeen, "un progreso guardado antes de que existiera el final se lee sin él")
    }
}
