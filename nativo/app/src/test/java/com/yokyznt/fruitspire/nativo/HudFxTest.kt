package com.yokyznt.fruitspire.nativo

import androidx.compose.ui.geometry.Rect
import com.yokyznt.fruitspire.nativo.ui.Flight
import com.yokyznt.fruitspire.nativo.ui.flightTarget
import com.yokyznt.fruitspire.nativo.ui.flyPose
import com.yokyznt.fruitspire.nativo.ui.gainBump
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** La curva del premio que vuela a la barra (flyGhost de js/fx.js) y el brinco de la barra (hud-gain de css/loot.css). */
class HudFxTest {
    private val eps = 1e-3f

    @Test fun elVueloEmpiezaEnSuSitioYTerminaEnLaCasilla() {
        val a = flyPose(0f, 300f, -200f, 90f)
        assertEquals(0f, a.tx, eps); assertEquals(0f, a.ty, eps); assertEquals(0f, a.rot, eps); assertEquals(1f, a.scale, eps); assertEquals(1f, a.alpha, eps)
        val z = flyPose(1f, 300f, -200f, 90f)
        assertEquals(300f, z.tx, eps); assertEquals(-200f, z.ty, eps); assertEquals(14f, z.rot, eps); assertEquals(.12f, z.scale, eps); assertEquals(.4f, z.alpha, eps)
    }

    @Test fun elVueloSubeEnArcoAntesDeBajar() {
        // la web pasa por (.3·dx, .3·dy − 90) a 40 %; con dy = 0 el premio va por encima de su punto de partida en la mitad del camino
        val mid = flyPose(.5f, 400f, 0f, 90f)
        assertTrue("sube antes de llegar", mid.ty < -20f)
        assertTrue("se encoge al avanzar", flyPose(.8f, 400f, 0f, 90f).scale < mid.scale)
    }

    @Test fun elBrincoSubeA118ConUnGiroDeMenos3Grados() {
        val (s0, r0) = gainBump(0f)
        assertEquals(1f, s0, eps); assertEquals(0f, r0, eps)
        val (s, r) = gainBump(.35f)
        assertEquals(1.18f, s, eps); assertEquals(-3f, r, eps)
        val (s1, _) = gainBump(1f)
        assertEquals(1f, s1, eps)
    }

    @Test fun cadaPremioVuelaASuCasilla() {
        assertEquals("gold", flightTarget("gold"))
        assertEquals("hp", flightTarget("heal")); assertEquals("hp", flightTarget("maxhp"))
        assertEquals("bag", flightTarget("relic")); assertEquals("bag", flightTarget("seed"))
        assertEquals("deck", flightTarget("card"))
    }

    @Test fun unObjetoEnElAireCuentaComoUnoMenosEnLaMochila() {
        assertEquals(1, Flight(1, "relic", "x", Rect.Zero).relicGain)
        assertEquals(0, Flight(2, "gold", null, Rect.Zero, goldGain = 25).relicGain)
    }
}
