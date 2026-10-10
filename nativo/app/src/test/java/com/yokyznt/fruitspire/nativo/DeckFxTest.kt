package com.yokyznt.fruitspire.nativo

import com.yokyznt.fruitspire.nativo.ui.dcBurst
import com.yokyznt.fruitspire.nativo.ui.dcFromPose
import com.yokyznt.fruitspire.nativo.ui.dcLabelAlpha
import com.yokyznt.fruitspire.nativo.ui.dcToPose
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** El revelado de cambios del mazo (`.dc-*` de css/loot.css): la vieja gira y se va, la nueva llega, destellos y etiqueta. Tiempos en segundos. */
class DeckFxTest {
    private val eps = 1e-3f

    @Test fun laVieja_esperaSuTurnoAntesDeGirar() {
        val p = dcFromPose("transform", .3f)
        assertEquals(.66f, p.scale, eps); assertEquals(0f, p.rotY, eps); assertEquals(1f, p.alpha, eps)
    }

    @Test fun laVieja_giraNoventaGradosYSeVa() {
        val end = dcFromPose("upgrade", .6f + .7f)
        assertEquals(.5f, end.scale, eps); assertEquals(90f, end.rotY, eps); assertEquals(0f, end.alpha, eps)
        // sigue visible hasta el 60 % de su giro
        assertEquals(1f, dcFromPose("transform", .6f + .7f * .6f).alpha, eps)
    }

    @Test fun laNueva_noSeVeHastaQueLaVieja_seVa() {
        val before = dcToPose("transform", 1.0f)
        assertEquals(0f, before.alpha, eps); assertEquals(-90f, before.rotY, eps); assertEquals(.5f, before.scale, eps)
    }

    @Test fun laNueva_llegaGirandoYSeAsientaEn066() {
        val mid = dcToPose("transform", 1.25f + .7f * .7f) // el 70 %: ya de frente, algo grande
        assertEquals(0f, mid.rotY, eps); assertEquals(.74f, mid.scale, eps); assertEquals(1f, mid.alpha, eps)
        val end = dcToPose("upgrade", 1.25f + .7f)
        assertEquals(.66f, end.scale, eps); assertEquals(0f, end.rotY, eps); assertEquals(1f, end.alpha, eps)
    }

    @Test fun quitar_tiembla_y_cae_desvaneciendose() {
        assertEquals(-4f, dcFromPose("remove", .6f + 1.3f * .25f).rotZ, eps)
        assertEquals(4f, dcFromPose("remove", .6f + 1.3f * .4f).rotZ, eps)
        val end = dcFromPose("remove", .6f + 1.3f)
        assertEquals(.4f, end.scale, eps); assertEquals(120f, end.dy, eps); assertEquals(12f, end.rotZ, eps); assertEquals(0f, end.alpha, eps)
    }

    @Test fun entrar_cae_desde_arriba_y_se_asienta() {
        val start = dcToPose("add", .3f)
        assertEquals(.5f, start.scale, eps); assertEquals(-220f, start.dy, eps); assertEquals(-14f, start.rotZ, eps); assertEquals(0f, start.alpha, eps)
        val end = dcToPose("add", .5f + .8f)
        assertEquals(.66f, end.scale, eps); assertEquals(0f, end.dy, eps); assertEquals(0f, end.rotZ, eps); assertEquals(1f, end.alpha, eps)
    }

    @Test fun losDestellosSoloSalenAlTransformarMadurarOEntrar() {
        assertNull("antes de su turno no hay nada", dcBurst("transform", 1.0f))
        assertNotNull(dcBurst("transform", 1.6f))
        assertNotNull(dcBurst("add", 1.6f))
        assertNull("al quitar no hay destellos", dcBurst("remove", 1.6f))
        assertNull("ya pasaron", dcBurst("upgrade", 2.2f))
        val last = dcBurst("upgrade", 1.15f + .9f - .001f)!!
        assertTrue("al final se alejaron ~95 y casi no se ven", last.distance > 90f && last.alpha < .05f)
    }

    @Test fun laEtiquetaApareceAlFinal() {
        assertEquals(0f, dcLabelAlpha(1.5f), eps)
        assertEquals(1f, dcLabelAlpha(2.0f), eps)
        assertTrue(dcLabelAlpha(1.8f) in 0.2f..0.9f)
    }
}
