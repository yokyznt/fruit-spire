package com.yokyznt.fruitspire.nativo

import androidx.compose.ui.geometry.Rect
import com.yokyznt.fruitspire.nativo.ui.Flight
import com.yokyznt.fruitspire.nativo.ui.flightTarget
import com.yokyznt.fruitspire.nativo.ui.flyPose
import com.yokyznt.fruitspire.nativo.ui.gainBump
import com.yokyznt.fruitspire.nativo.ui.ShopSale
import com.yokyznt.fruitspire.nativo.ui.deckBumpPose
import com.yokyznt.fruitspire.nativo.ui.dressPopPose
import com.yokyznt.fruitspire.nativo.ui.passFloat
import com.yokyznt.fruitspire.nativo.ui.popPose
import com.yokyznt.fruitspire.nativo.ui.relicPopPose
import com.yokyznt.fruitspire.nativo.ui.splatPose
import com.yokyznt.fruitspire.nativo.ui.shakeSoft
import com.yokyznt.fruitspire.nativo.ui.shopSlots
import com.yokyznt.fruitspire.nativo.ui.soldPose
import com.yokyznt.fruitspire.nativo.ui.spendPulse
import com.yokyznt.fruitspire.nativo.ui.toastPose
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

    // ---- tienda (soldOut, shakeSoft y coinSpend de css/style.css) ----

    @Test fun elArticuloVendidoSeDesvaneceYDespuesCierraSuHueco() {
        val a = soldPose(0f)
        assertEquals(1f, a.alpha, eps); assertEquals(1f, a.scale, eps); assertEquals(1f, a.width, eps)
        val mid = soldPose(.35f) // el 35 % de la web: ya transparente, a 0,8 y con el hueco todavía abierto
        assertEquals(0f, mid.alpha, eps); assertEquals(.8f, mid.scale, eps); assertEquals(1f, mid.width, eps)
        val z = soldPose(1f)
        assertEquals(0f, z.alpha, eps); assertEquals(.6f, z.scale, eps); assertEquals(0f, z.width, eps)
    }

    @Test fun elHuecoSeCierraDeGoteSinVolverASubir() {
        var last = 1f
        for (i in 0..20) {
            val w = soldPose(i / 20f).width
            assertTrue("el ancho solo baja", w <= last + eps)
            last = w
        }
    }

    @Test fun elTemblorVaYVieneYTerminaQuieto() {
        assertEquals(0f, shakeSoft(0f), eps)
        assertEquals(-8f, shakeSoft(.2f), eps)
        assertEquals(7f, shakeSoft(.45f), eps)
        assertEquals(-3f, shakeSoft(.7f), eps)
        assertEquals(0f, shakeSoft(1f), eps)
    }

    @Test fun elHuecoQueSeCierraQuedaEnElSitioDeLoComprado() {
        fun sale(id: Int, index: Int) = ShopSale(id, "card", index, "x", 30)
        fun order(live: Int, vararg g: ShopSale) = shopSlots(live, g.toList()).joinToString(" ") { if (it.ghost != null) "G${it.ghost!!.id}" else "L${it.live}" }
        assertEquals("L0 L1 L2", order(3))
        assertEquals("L0 G1 L1 L2", order(3, sale(1, 1)))   // se compró el del medio de cuatro
        assertEquals("L0 L1 L2 G1", order(3, sale(1, 3)))   // se compró el último
        assertEquals("G1 G2 L0", order(1, sale(1, 0), sale(2, 0)))
        assertEquals("G1", order(0, sale(1, 0)))            // se compró lo último que quedaba
    }

    @Test fun elAvisoEntraBajandoDesdeArribaSeQuedaYSeDesvanece() {
        val a = toastPose(0f)
        assertEquals(0f, a.alpha, eps); assertEquals(-20f, a.dy, eps)
        val enter = toastPose(.15f)
        assertEquals(1f, enter.alpha, eps); assertEquals(0f, enter.dy, eps)
        val hold = toastPose(.5f)
        assertEquals(1f, hold.alpha, eps); assertEquals(0f, hold.dy, eps)
        val out = toastPose(1f)
        assertEquals(0f, out.alpha, eps); assertEquals(0f, out.dy, eps)
        assertEquals("a medias de la salida va a medio desvanecer", .5f, toastPose(.9f).alpha, eps)
    }

    // ---- combate: pulso de energía y mochila (deckBump), objeto que salta (relicPop) y motas (splatOut) ----

    @Test fun elPulsoDeEnergiaYMochilaSubeA118ConGiro() {
        val (s0, r0) = deckBumpPose(0f)
        assertEquals(1f, s0, eps); assertEquals(-1f, r0, eps)
        val (s4, r4) = deckBumpPose(.4f)
        assertEquals(1.18f, s4, eps); assertEquals(-5f, r4, eps)
        val (s7, r7) = deckBumpPose(.7f)
        assertEquals(.97f, s7, eps); assertEquals(1f, r7, eps)
        val (s1, r1) = deckBumpPose(1f)
        assertEquals(1f, s1, eps); assertEquals(-1f, r1, eps)
    }

    @Test fun elObjetoQueSaltaAparecePequenoCaeYSeDesvanece() {
        val a = relicPopPose(0f)
        assertEquals(0f, a.alpha, eps); assertEquals(-10f, a.dy, eps); assertEquals(.4f, a.scale, eps)
        val b = relicPopPose(.25f)
        assertEquals(1f, b.alpha, eps); assertEquals(8f, b.dy, eps); assertEquals(1.15f, b.scale, eps)
        val c = relicPopPose(.7f)
        assertEquals(1f, c.alpha, eps); assertEquals(14f, c.dy, eps); assertEquals(1f, c.scale, eps)
        val z = relicPopPose(1f)
        assertEquals(0f, z.alpha, eps); assertEquals(30f, z.dy, eps); assertEquals(.8f, z.scale, eps)
    }

    @Test fun lasMotasSalenPequenasSeAlejanYSeDesvanecenAlFinal() {
        val a = splatPose(0f)
        assertEquals(0f, a.move, eps); assertEquals(.3f, a.scale, eps); assertEquals(1f, a.alpha, eps)
        assertEquals("sigue visible hasta el 60 %", 1f, splatPose(.6f).alpha, eps)
        val z = splatPose(1f)
        assertEquals(1f, z.move, eps); assertEquals(1f, z.scale, eps); assertEquals(0f, z.alpha, eps)
    }

    // ---- pase y vestidor: passReady, pop (just-claimed) y dressPop ----

    @Test fun elPremioListoFlotaCuatroYVuelveACaer() {
        assertEquals(0f, passFloat(0f), eps)
        assertEquals(-4f, passFloat(.5f), eps)
        assertEquals(0f, passFloat(1f), eps)
    }

    @Test fun elNivelRecienReclamadoApareceGirandoYCreciendo() {
        val a = popPose(0f)
        assertEquals(.3f, a.scale, eps); assertEquals(-20f, a.rot, eps); assertEquals(0f, a.alpha, eps)
        val z = popPose(1f)
        assertEquals(1f, z.scale, eps); assertEquals(0f, z.rot, eps); assertEquals(1f, z.alpha, eps)
    }

    @Test fun alPonerseAlgoLaFrutaDaUnSaltito() {
        val (s0, r0) = dressPopPose(0f)
        assertEquals(.85f, s0, eps); assertEquals(-6f, r0, eps)
        val (s6, r6) = dressPopPose(.6f)
        assertEquals(1.08f, s6, eps); assertEquals(3f, r6, eps)
        val (s1, r1) = dressPopPose(1f)
        assertEquals(1f, s1, eps); assertEquals(0f, r1, eps)
    }

    @Test fun gastarOroDaUnPulsoQueSubeAl40YVuelve() {
        assertEquals(0f, spendPulse(0f), eps)
        assertEquals(1f, spendPulse(.4f), eps)
        assertEquals(0f, spendPulse(1f), eps)
    }
}
