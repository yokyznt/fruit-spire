package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Seeds

/** Resultado de intentar comprar algo en la tienda. */
enum class BuyResult { OK, NO_GOLD, BAG_FULL, INVALID }

class ShopCard(val cardId: String, val price: Int, val sale: Boolean = false)
class ShopRelic(val relicId: String, val price: Int)
class ShopSeed(val seedId: String, val price: Int)

/** Lo que hay a la venta en una tienda (js/game.js `openShop`). Se va vaciando al comprar. */
class ShopStock(
    val cards: MutableList<ShopCard>, val relics: MutableList<ShopRelic>, val seeds: MutableList<ShopSeed>,
    var removeUsed: Boolean = false
) {
    val isSoldOut: Boolean get() = cards.isEmpty() && relics.isEmpty() && seeds.isEmpty()
}

/** Surtido y precios de la tienda. Todo el azar pasa por [Rng]. */
object Shop {
    private val CARD_PRICES = mapOf("common" to (30 to 38), "uncommon" to (45 to 55), "rare" to (75 to 90))
    private val RELIC_PRICES = mapOf("common" to (85 to 100), "uncommon" to (110 to 130), "rare" to (150 to 175))
    private val SEED_PRICES = mapOf("common" to (20 to 26), "uncommon" to (32 to 40), "rare" to (48 to 58))

    private fun priceIn(range: Pair<Int, Int>): Int = range.first + Rng.int(range.second - range.first + 1)

    /** Cuánto cuesta quitar una carta: sube cada vez que se hace. */
    fun removalPrice(p: Player): Int = 50 + 25 * p.removals

    /** Surtido nuevo: 2 ataques, 2 habilidades y 1 poder (uno de ellos a mitad de precio), hasta 2 objetos y 2 semillas. */
    fun stock(p: Player): ShopStock {
        val ids = Rewards.rollCards(p, 2, "enemy", "attack") + Rewards.rollCards(p, 2, "enemy", "skill") + Rewards.rollCards(p, 1, "elite", "power")
        val cards = ids.map { id ->
            val rarity = Cards.get(id)?.rarity ?: "common"
            ShopCard(id, priceIn(CARD_PRICES[rarity] ?: CARD_PRICES.getValue("common")))
        }.toMutableList()
        if (cards.isNotEmpty()) {
            val k = Rng.int(cards.size)
            cards[k] = ShopCard(cards[k].cardId, cards[k].price / 2, sale = true)
        }

        val relics = ArrayList<ShopRelic>()
        repeat(2) {
            val r = Rewards.randomRelic(p, listOf("common", "uncommon", "rare"))
            if (r != null && relics.none { it.relicId == r.id }) relics.add(ShopRelic(r.id, priceIn(RELIC_PRICES.getValue(r.tier))))
        }

        val seeds = ArrayList<ShopSeed>()
        var guard = 0
        while (seeds.size < 2 && guard < 30) {
            guard++
            val sd = Seeds.roll()
            if (seeds.none { it.seedId == sd.id }) seeds.add(ShopSeed(sd.id, priceIn(SEED_PRICES.getValue(sd.rarity))))
        }
        return ShopStock(cards, relics, seeds)
    }
}
