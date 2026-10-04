package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Relics
import com.yokyznt.fruitspire.core.data.Seeds
import kotlin.math.floor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Pruebas de las casillas con contenido propio: campamento, tienda, tesoro, llave y cofre sellado (js/game.js). */
class NodesTest {
    /** Pisa una casilla de [type] justo al lado de la salida. */
    private fun enter(run: Run, type: String) {
        run.beginFloor()
        val x = run.pos.x
        val y = run.pos.y
        val (nx, ny) = listOf(x + 1 to y, x to y - 1, x to y + 1).first { run.isReachable(it.first, it.second) }
        run.map.grid[ny][nx] = type
        assertNull(run.arrive(nx, ny))
    }

    private fun newRun(seed: Int, char: String = "manzana"): Run {
        Rng.seed(seed)
        return Run.start(char, "madura")
    }

    // ---------- campamento ----------
    @Test
    fun restHealsAFractionOfMaxHpPlusRelicBonuses() {
        val run = newRun(1)
        val p = run.player
        enter(run, NodeType.REST)
        assertEquals(RunScreen.REST, run.screen)
        p.hp = 1
        val base = floor(p.maxHp * 0.25).toInt()
        assertEquals(base, run.restHealAmount())
        p.relics.add("regadera") // +8 al descansar
        assertEquals(base + 8, run.restHealAmount())
        assertTrue(run.restHeal())
        assertEquals(minOf(p.maxHp, 1 + base + 8), p.hp)
        assertEquals(RunScreen.MAP, run.screen)
        assertFalse(run.restHeal(), "ya no está en el campamento")
        Rng.unseed()
    }

    @Test
    fun durianHeartForbidsResting() {
        val run = newRun(2)
        enter(run, NodeType.REST)
        run.player.relics.add("corazon_durian")
        run.player.hp = 5
        assertFalse(run.canRest())
        assertFalse(run.restHeal())
        assertEquals(5, run.player.hp)
        assertEquals(RunScreen.REST, run.screen)
        // aun así puede irse
        run.leaveNode()
        assertEquals(RunScreen.MAP, run.screen)
        Rng.unseed()
    }

    @Test
    fun restUpgradeRipensExactlyThatCopy() {
        val run = newRun(3)
        val p = run.player
        enter(run, NodeType.REST)
        val i = p.deck.indexOfFirst { Cards.get(it)!!.canUpgrade }
        val id = p.deck[i]
        val copies = p.deck.count { it == id }
        assertTrue(run.restUpgrade(i))
        assertEquals("$id+", p.deck[i])
        assertEquals(copies - 1, p.deck.count { it == id }, "solo una copia madura")
        assertFalse(run.restUpgrade(i), "una carta madurada no se vuelve a madurar")
        p.deck.add("gusano_interior")
        assertFalse(run.restUpgrade(p.deck.size - 1), "las maldiciones no maduran")
        assertFalse(run.restUpgrade(999))
        Rng.unseed()
    }

    @Test
    fun restRemoveDropsOneCardWithoutRaisingThePrice() {
        val run = newRun(4)
        val p = run.player
        enter(run, NodeType.REST)
        val before = p.deck.size
        assertTrue(run.restRemove(0))
        assertEquals(before - 1, p.deck.size)
        assertEquals(0, p.removals, "en el campamento quitar no sube el precio de la tienda")
        assertFalse(run.restRemove(999))
        Rng.unseed()
    }

    // ---------- tienda ----------
    @Test
    fun shopStockHasTheRightShape() {
        for (seed in 1..60) {
            val run = newRun(seed, listOf("manzana", "platanin", "kiwi", "uva")[seed % 4])
            run.player.act = 1 + seed % 3
            enter(run, NodeType.SHOP)
            assertEquals(RunScreen.SHOP, run.screen)
            val s = run.shopStock!!
            assertEquals(5, s.cards.size, "2 ataques, 2 habilidades y 1 poder")
            assertEquals(listOf("attack", "attack", "skill", "skill", "power"), s.cards.map { Cards.get(it.cardId)!!.type })
            assertEquals(1, s.cards.count { it.sale }, "una oferta")
            s.cards.forEach { c ->
                val rarity = Cards.get(c.cardId)!!.rarity
                val (lo, hi) = mapOf("common" to (30 to 38), "uncommon" to (45 to 55), "rare" to (75 to 90)).getValue(rarity)
                if (c.sale) assertTrue(c.price in lo / 2..hi / 2, "precio de oferta ${c.price} de $rarity") else assertTrue(c.price in lo..hi, "precio ${c.price} de $rarity")
            }
            assertTrue(s.relics.size in 1..2)
            assertEquals(s.relics.size, s.relics.map { it.relicId }.toSet().size)
            s.relics.forEach {
                val tier = Relics.get(it.relicId)!!.tier
                val (lo, hi) = mapOf("common" to (85 to 100), "uncommon" to (110 to 130), "rare" to (150 to 175)).getValue(tier)
                assertTrue(it.price in lo..hi)
            }
            assertEquals(2, s.seeds.size)
            assertEquals(2, s.seeds.map { it.seedId }.toSet().size)
            s.seeds.forEach {
                val (lo, hi) = mapOf("common" to (20 to 26), "uncommon" to (32 to 40), "rare" to (48 to 58)).getValue(Seeds.get(it.seedId)!!.rarity)
                assertTrue(it.price in lo..hi)
            }
            assertFalse(s.removeUsed)
        }
        Rng.unseed()
    }

    @Test
    fun buyingCardsRelicsAndSeedsSpendsGoldAndGivesTheThing() {
        val run = newRun(5)
        val p = run.player
        enter(run, NodeType.SHOP)
        p.gold = 1000
        val s = run.shopStock!!

        val card = s.cards[1]
        val deckBefore = p.deck.size
        assertEquals(BuyResult.OK, run.buyShopCard(1))
        assertEquals(1000 - card.price, p.gold)
        assertEquals(deckBefore + 1, p.deck.size)
        assertEquals(card.cardId, p.deck.last())
        assertEquals(4, s.cards.size)
        assertTrue(run.progress.discovered.contains(card.cardId.removeSuffix("+")))

        val relic = s.relics[0]
        val goldBefore = p.gold
        assertEquals(BuyResult.OK, run.buyShopRelic(0))
        assertEquals(goldBefore - relic.price, p.gold)
        assertTrue(relic.relicId in p.relics)

        val seed = s.seeds[0]
        val g2 = p.gold
        assertEquals(BuyResult.OK, run.buyShopSeed(0))
        assertEquals(g2 - seed.price, p.gold)
        assertTrue(seed.seedId in p.seeds)

        assertEquals(BuyResult.INVALID, run.buyShopCard(99))
        assertEquals(BuyResult.INVALID, run.buyShopRelic(99))
        assertEquals(BuyResult.INVALID, run.buyShopSeed(99))
        Rng.unseed()
    }

    @Test
    fun shopRefusesWhenBrokeOrBagFull() {
        val run = newRun(6)
        val p = run.player
        enter(run, NodeType.SHOP)
        p.gold = 0
        assertEquals(BuyResult.NO_GOLD, run.buyShopCard(0))
        assertEquals(BuyResult.NO_GOLD, run.buyShopRelic(0))
        assertEquals(BuyResult.NO_GOLD, run.buyShopSeed(0))
        assertEquals(5, run.shopStock!!.cards.size, "no se llevó nada")
        p.gold = 1000
        for (i in p.seeds.indices) p.seeds[i] = "x$i"
        assertEquals(BuyResult.BAG_FULL, run.buyShopSeed(0))
        assertEquals(1000, p.gold, "una compra rechazada no cobra")
        Rng.unseed()
    }

    @Test
    fun removalCostsMoreEachTimeAndWorksOncePerShop() {
        val run = newRun(7)
        val p = run.player
        enter(run, NodeType.SHOP)
        assertEquals(50, run.removalPrice())
        p.gold = 40
        assertFalse(run.startShopRemoval(), "sin oro no se abre el selector")
        p.gold = 500
        assertTrue(run.startShopRemoval())
        assertEquals("remove", run.pickerMode)
        val size = p.deck.size
        assertTrue(run.shopRemoveCard(0))
        assertEquals(size - 1, p.deck.size)
        assertEquals(450, p.gold)
        assertEquals(1, p.removals)
        assertEquals(75, run.removalPrice())
        assertTrue(run.shopStock!!.removeUsed)
        assertNull(run.pickerMode)
        assertFalse(run.startShopRemoval(), "solo una vez por tienda")
        run.leaveNode()
        assertEquals(RunScreen.MAP, run.screen)
        assertNull(run.shopStock)
        Rng.unseed()
    }

    // ---------- tesoro, llave y cofre ----------
    @Test
    fun treasureOffersOneRelicToCollect() {
        val run = newRun(8)
        val p = run.player
        enter(run, NodeType.TREASURE)
        assertEquals(RunScreen.TREASURE, run.screen)
        assertEquals(1, run.loot.size)
        val item = run.loot[0]
        assertEquals("relic", item.k)
        val relic = Relics.get(item.id!!)!!
        assertTrue(relic.tier in listOf("common", "uncommon", "rare"))
        assertTrue(run.nodeMessage.startsWith("${relic.name}:"), run.nodeMessage)
        assertFalse(run.leaveNode(), "primero hay que recoger el premio")
        assertEquals(RunScreen.TREASURE, run.screen)
        assertTrue(run.collectLoot(0))
        assertTrue(relic.id in p.relics)
        assertTrue(run.leaveNode())
        assertEquals(RunScreen.MAP, run.screen)
        assertTrue(run.loot.isEmpty())
        Rng.unseed()
    }

    @Test
    fun treasureWithNothingLeftSaysSo() {
        val run = newRun(9)
        run.player.relics.addAll(Relics.db.values.filter { it.tier != "boss" }.map { it.id })
        enter(run, NodeType.TREASURE)
        assertTrue(run.loot.isEmpty())
        assertEquals("Ya tienes todos los objetos disponibles.", run.nodeMessage)
        assertTrue(run.leaveNode())
        Rng.unseed()
    }

    @Test
    fun goldenKeyOpensTheVaultForMore() {
        val run = newRun(10)
        val p = run.player
        enter(run, NodeType.KEY)
        assertEquals(RunScreen.KEY_FOUND, run.screen)
        assertTrue(p.hasGoldenKey)
        assertTrue(run.leaveNode())

        enter(run, NodeType.VAULT)
        assertEquals(RunScreen.VAULT, run.screen)
        assertTrue(run.vaultOpened)
        assertFalse(p.hasGoldenKey, "la llave se gasta")
        assertEquals(listOf("gold", "relic"), run.loot.map { it.k }, "oro primero, luego el objeto")
        assertTrue(run.loot[0].n in 40..59)
        assertTrue(run.nodeMessage.contains("Además, ${run.loot[0].n} de oro brillante."), run.nodeMessage)
        Rng.unseed()
    }

    @Test
    fun vaultWithoutKeyOnlyGivesALittleGold() {
        val run = newRun(11)
        enter(run, NodeType.VAULT)
        assertFalse(run.vaultOpened)
        assertEquals(1, run.loot.size)
        assertEquals("gold", run.loot[0].k)
        assertTrue(run.loot[0].n in 15..24)
        assertTrue(run.nodeMessage.contains("${run.loot[0].n} de oro"), run.nodeMessage)
        val gold = run.player.gold
        val n = run.loot[0].n
        assertTrue(run.collectLoot(0))
        assertEquals(gold + n, run.player.gold)
        Rng.unseed()
    }

    @Test
    fun unfinishedLootOutsideRewardsIsGrantedOnLoad() {
        val run = newRun(12)
        val p = run.player
        enter(run, NodeType.TREASURE)
        val relicId = run.loot[0].id!!
        assertTrue(Save.shouldSave(run))
        val back = Save.decode(Save.encode(run), run.progress)!!
        assertEquals(RunScreen.MAP, back.screen, "el tesoro no se reanuda")
        assertTrue(relicId in back.player.relics, "lo que quedó sin recoger se da solo")
        assertTrue(back.loot.isEmpty())
        assertFalse(relicId in p.relics, "la partida original no cambió")
        assertNotNull(back.map)
        Rng.unseed()
    }

    @Test
    fun discardingASeedFreesItsSlot() {
        val run = newRun(14)
        val p = run.player
        assertTrue(Rewards.addSeed(p, "semilla_fantasma"))
        assertFalse(Rewards.seedsFull(p))
        assertTrue(run.discardSeed(0))
        assertNull(p.seeds[0])
        assertFalse(run.discardSeed(0), "ya estaba vacío")
        assertFalse(run.discardSeed(9))
        Rng.unseed()
    }

    @Test
    fun othersStillWaitForTheNextStage() {
        val run = newRun(13)
        enter(run, NodeType.GAME)
        assertEquals(RunScreen.NODE_STUB, run.screen)
        run.leaveStub()
        assertEquals(RunScreen.MAP, run.screen)
        Rng.unseed()
    }
}
