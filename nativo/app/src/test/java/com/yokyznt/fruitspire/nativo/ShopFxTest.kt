package com.yokyznt.fruitspire.nativo

import android.app.Application
import android.os.Looper
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ApplicationProvider
import com.yokyznt.fruitspire.core.Rng
import com.yokyznt.fruitspire.core.Run
import com.yokyznt.fruitspire.core.RunScreen
import com.yokyznt.fruitspire.core.Shop
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.hudStateOf
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Duration

/**
 * Las animaciones de la tienda (js/game.js `shopPurchase` y `cantAfford`): lo comprado vuela a la barra y su hueco se cierra
 * (`soldOut`); el oro baja de golpe; si no alcanza, el artículo y la casilla del oro tiemblan (`shakeSoft`).
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class ShopFxTest {
    @get:Rule
    val compose = createComposeRule()
    private lateinit var vm: GameViewModel

    private fun advance(ms: Long) {
        compose.mainClock.advanceTimeBy(ms)
        shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(ms))
        compose.waitForIdle()
    }

    private fun settle() {
        advance(500)
        repeat(8) { compose.mainClock.advanceTimeByFrame() }
        advance(500)
    }

    /** Una partida en la tienda con [gold] de oro. */
    private fun shopWith(gold: Int): Run {
        Rng.seed(11)
        val app = ApplicationProvider.getApplicationContext<Application>()
        vm = GameViewModel(app)
        compose.mainClock.autoAdvance = false
        compose.setContent { DesignCanvas { GameRoot(vm, Settings(app)) } }
        vm.newGame(); advance(100)
        vm.play(); vm.finishStory(); advance(100)
        vm.beginFloor(); advance(100)
        val run = vm.run!!
        run.player.gold = gold
        run.shopStock = Shop.stock(run.player)
        run.screen = RunScreen.SHOP
        vm.setPicker(null) // solo para que la pantalla se redibuje
        settle()
        return run
    }

    @Test
    fun buyingACardClosesItsSlotAndFliesItToTheDeck() {
        val run = shopWith(500)
        val price = run.shopStock!!.cards[0].price
        val gold = run.player.gold
        val deck = run.player.deck.size
        vm.buyShopCard(0)
        advance(100)
        assertEquals("el hueco se está cerrando", 1, vm.sales.size)
        assertEquals("el artículo va en el aire", 1, vm.flights.size)
        assertEquals(gold - price, run.player.gold)
        val bar = hudStateOf(run, flights = vm.flights.toList())
        assertEquals("el oro baja de inmediato", gold - price, bar.gold)
        assertEquals("el mazo aún no lo cuenta", deck, bar.deck)
        advance(1500)
        assertEquals(0, vm.sales.size)
        assertEquals(0, vm.flights.size)
        assertEquals(deck + 1, hudStateOf(run, flights = vm.flights.toList()).deck)
        Rng.unseed()
    }

    @Test
    fun buyingARelicFliesItToTheBag() {
        val run = shopWith(900)
        assertTrue("con la semilla de la prueba la tienda trae al menos un objeto", run.shopStock!!.relics.isNotEmpty())
        val relics = run.player.relics.size
        vm.buyShopRelic(0)
        advance(100)
        assertEquals(1, vm.sales.size)
        assertEquals("relic", vm.flights.single().kind)
        assertEquals("la mochila aún no lo cuenta", relics, hudStateOf(run, flights = vm.flights.toList()).relics.size)
        advance(1500)
        assertEquals(relics + 1, hudStateOf(run, flights = vm.flights.toList()).relics.size)
        Rng.unseed()
    }

    @Test
    fun withoutGoldTheItemAndTheGoldChipShakeAndNothingIsSold() {
        val run = shopWith(0)
        val goldShakes = vm.goldNope
        vm.buyShopCard(1)
        advance(50)
        assertNotNull(vm.nope)
        assertEquals("card:1", vm.nope!!.key)
        assertEquals(goldShakes + 1, vm.goldNope)
        assertEquals(0, vm.sales.size)
        assertEquals(0, vm.flights.size)
        assertEquals(5, run.shopStock!!.cards.size)
        // una segunda negativa sobre el mismo artículo vuelve a sacudir (sube el contador, no solo la llave)
        val first = vm.nope!!.tick
        vm.buyShopCard(1)
        assertTrue(vm.nope!!.tick > first)
        Rng.unseed()
    }
}
