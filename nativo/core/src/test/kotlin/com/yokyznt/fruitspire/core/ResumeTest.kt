package com.yokyznt.fruitspire.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Si Android mata la app con una tienda, un campamento o un misterio abiertos, «Continuar» te devuelve a esa casilla (antes volvías
 * al mapa con la casilla ya gastada y perdías la cura, la compra o el evento).
 */
class ResumeTest {
    /** Pisa una casilla de [type] justo al lado de la salida. */
    private fun enter(run: Run, type: String) {
        run.beginFloor()
        val (nx, ny) = listOf(run.pos.x + 1 to run.pos.y, run.pos.x to run.pos.y - 1, run.pos.x to run.pos.y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = type
        assertNull(run.arrive(nx, ny))
    }

    private fun newRun(seed: Int, progress: Progress = Progress()): Run {
        Rng.seed(seed)
        return Run.start("manzana", "madura", progress)
    }

    @Test
    fun aShopComesBackWithItsStockAndWhatWasAlreadyBought() {
        val progress = Progress()
        val run = newRun(7, progress)
        enter(run, NodeType.SHOP)
        run.player.gold = 900
        assertEquals(BuyResult.OK, run.buyShopCard(0))
        val back = Save.decode(Save.encode(run), progress)!!
        assertEquals(RunScreen.SHOP, back.screen)
        val a = run.shopStock!!
        val b = assertNotNull(back.shopStock)
        assertEquals(a.cards.map { Triple(it.cardId, it.price, it.sale) }, b.cards.map { Triple(it.cardId, it.price, it.sale) })
        assertEquals(a.relics.map { it.relicId to it.price }, b.relics.map { it.relicId to it.price })
        assertEquals(a.seeds.map { it.seedId to it.price }, b.seeds.map { it.seedId to it.price })
        assertEquals(a.removeUsed, b.removeUsed)
        assertEquals(run.player.gold, back.player.gold)
        assertEquals(run.player.deck, back.player.deck)
        // y se sigue como siempre: comprar y salir
        assertTrue(back.leaveNode())
        assertEquals(RunScreen.MAP, back.screen)
        Rng.unseed()
    }

    @Test
    fun aCampComesBackUnused() {
        val progress = Progress()
        val run = newRun(3, progress)
        enter(run, NodeType.REST)
        run.player.hp = 1
        val back = Save.decode(Save.encode(run), progress)!!
        assertEquals(RunScreen.REST, back.screen)
        assertTrue(back.restHeal(), "se puede descansar al volver")
        assertTrue(back.player.hp > 1)
        assertEquals(RunScreen.MAP, back.screen)
        Rng.unseed()
    }

    @Test
    fun aMysteryComesBackWithTheSameEventAndItsOptions() {
        val progress = Progress()
        val run = newRun(11, progress)
        enter(run, NodeType.MYSTERY)
        val ev = assertNotNull(run.currentEvent)
        val back = Save.decode(Save.encode(run), progress)!!
        assertEquals(RunScreen.EVENT, back.screen)
        assertEquals(ev.id, back.currentEvent?.id)
        assertEquals(ev.options.map { it.text }, back.currentEvent!!.options.map { it.text })
        Rng.unseed()
    }

    @Test
    fun anEventWhoseIdNoLongerExistsFallsBackToTheMap() {
        val progress = Progress()
        val run = newRun(11, progress)
        enter(run, NodeType.MYSTERY)
        val text = Save.encode(run).replace("\"eventId\":\"${run.currentEvent!!.id}\"", "\"eventId\":\"ya_no_existe\"")
        val back = Save.decode(text, progress)!!
        assertEquals(RunScreen.MAP, back.screen)
        Rng.unseed()
    }

    @Test
    fun aShopSaveWithoutStockLoadsOnTheMap() {
        val progress = Progress()
        val run = newRun(7, progress)
        enter(run, NodeType.SHOP)
        // como la guardaría una versión que aún no guardaba la tienda: pantalla «SHOP» pero sin surtido
        val obj = Json.parseToJsonElement(Save.encode(run)).jsonObject.toMutableMap()
        obj["shop"] = JsonNull
        val back = Save.decode(JsonObject(obj).toString(), progress)
        assertNotNull(back)
        assertEquals(RunScreen.MAP, back.screen)
        Rng.unseed()
    }
}
