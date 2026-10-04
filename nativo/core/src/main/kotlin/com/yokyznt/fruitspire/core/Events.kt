package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.CardDef
import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Seeds
import kotlin.math.max
import kotlin.math.min

// ============================================================
// Eventos de las casillas de misterio (js/data/events.js + events_special.js) y sus ayudantes (eventHelpers de
// js/game.js). Los textos y los números son los de la versión web.
// ============================================================

/** Lo que pasó al elegir una opción: el texto del resultado y si en realidad era una trampa (pelea). */
class Outcome(val msg: String, val fight: Boolean = false)

/** Un cambio del mazo que la pantalla de resultado muestra animado: add | remove | upgrade | transform. */
class DeckChange(val kind: String, val from: String? = null, val to: String? = null)

/**
 * Una opción de un evento. [special] la desvía a otra pantalla: "fight", "well", "dungeon" o "game:<mesa>".
 * [locked] devuelve un texto si no se puede elegir (por ejemplo "No te alcanza el oro").
 */
class EventOption(
    val text: String,
    val tone: String? = null,
    val locked: ((Player) -> String)? = null,
    val special: String? = null,
    val effect: ((Player, EventHelpers) -> Outcome)? = null
)

class EventDef(
    val id: String, val title: String, val icon: String, val desc: String, val options: List<EventOption>,
    val sprite: String? = null, val acts: List<Int>? = null, val themes: List<String>? = null, val w: Double = 1.0
)

/** Los ayudantes `g` que reciben los eventos. Todo el azar pasa por [Rng]. */
class EventHelpers(private val run: Run) {
    private val p: Player get() = run.player
    val act: Int get() = p.act

    private fun <T> pickOrNull(list: List<T>): T? = if (list.isEmpty()) null else Rng.pick(list)

    /** Un objeto al azar (común, poco común o raro) para la fila de premios. */
    fun grantRandomRelic(): String = grantRelicTier(listOf("common", "uncommon", "rare"), fallback = false)

    /** Un objeto al azar de ciertos niveles; si ya los tienes todos, de cualquiera. */
    fun grantRelicTier(tiers: List<String>, fallback: Boolean = true): String {
        val relic = Rewards.randomRelic(p, tiers, run.lootRelicIds())
            ?: (if (fallback) Rewards.randomRelic(p, listOf("common", "uncommon", "rare"), run.lootRelicIds()) else null)
            ?: return "Ya tienes todos los objetos disponibles."
        run.giveRelic(relic)
        return "${relic.name}: ${relic.description}"
    }

    fun addCard(id: String) {
        p.deck.add(id)
        run.progress.discover(listOf(id))
        val c = Cards.get(id)
        if (c != null && (c.type == "curse" || c.type == "status")) run.logDeck(DeckChange("add", to = id))
    }

    fun randomCard(rarity: String? = null): CardDef {
        val r = rarity ?: Rng.pick(listOf("common", "uncommon", "rare"))
        return pickOrNull(Rewards.cardsOfRarity(p.characterId, r, null, false)) ?: Rng.pick(Rewards.cardsOfRarity(p.characterId, r))
    }

    /** Madura [n] cartas al azar (copias distintas). Devuelve los nombres de las que maduraron. */
    fun upgradeRandom(n: Int): List<String> {
        val idx = p.deck.indices.filter { Cards.get(p.deck[it])?.canUpgrade == true }.toMutableList()
        val names = ArrayList<String>()
        var k = 0
        while (k < n && idx.isNotEmpty()) {
            val i = idx.removeAt(Rng.int(idx.size))
            run.logDeck(DeckChange("upgrade", p.deck[i], "${p.deck[i]}+"))
            p.deck[i] = "${p.deck[i]}+"
            names.add(Cards.get(p.deck[i])?.name ?: "")
            k++
        }
        return names
    }

    /** Quita una carta al azar (solo de las básicas si [basicOnly]). Devuelve su nombre. */
    fun removeRandom(basicOnly: Boolean): String? {
        val idx = p.deck.indices.filter { !basicOnly || Cards.get(p.deck[it])?.rarity == "basic" }
        if (idx.isEmpty()) return null
        val id = p.deck.removeAt(Rng.pick(idx))
        run.logDeck(DeckChange("remove", from = id))
        return Cards.get(id)?.name
    }

    fun duplicateRandom(): String? {
        val pool = p.deck.filter { Cards.get(it)?.type != "curse" }
        if (pool.isEmpty()) return null
        val id = Rng.pick(pool)
        p.deck.add(id)
        return Cards.get(id)?.name
    }

    /** Una semilla al azar en la bolsa (null si está llena). */
    fun grantSeed(): String? {
        val seed = Seeds.roll()
        if (!Rewards.addSeed(p, seed.id)) return null
        return "Consigues una semilla: ${seed.name}. ${seed.desc}"
    }

    /** Cambia una carta al azar del mazo por otra de rareza parecida. */
    fun transformRandom(): String? {
        val idx = p.deck.indices.filter { val t = Cards.get(p.deck[it])?.type; t != "curse" && t != "status" }
        if (idx.isEmpty()) return null
        val i = Rng.pick(idx)
        val old = Cards.get(p.deck[i]) ?: return null
        val rarity = if (old.rarity == "basic") "common" else old.rarity
        val next = pickOrNull(Rewards.cardsOfRarity(p.characterId, rarity)) ?: Rng.pick(Rewards.cardsOfRarity(p.characterId, "common"))
        run.logDeck(DeckChange("transform", p.deck[i], next.id))
        p.deck[i] = next.id
        run.progress.discover(listOf(next.id))
        return "Tu ${old.name} se transforma en ${next.name}."
    }
}

object Events {
    private fun noGold(n: Int): (Player) -> String = { p -> if (p.gold < n) "No te alcanza el oro" else "" }
    private fun opt(text: String, tone: String? = null, locked: ((Player) -> String)? = null, effect: (Player, EventHelpers) -> Outcome) =
        EventOption(text, tone, locked, null, effect)
    private fun walkAway(text: String, msg: String) = EventOption(text, effect = { _, _ -> Outcome(msg) })
    private fun go(text: String, kind: String) = EventOption(text, special = kind)
    private fun m(s: String) = Outcome(s)
    private fun lose(p: Player, n: Int) { p.hp = max(1, p.hp - n) }

    private val CASINO = listOf("dados", "poker", "ajedrez")

    val all: List<EventDef> by lazy {
        listOf(
            EventDef("fuente_magica", "Fuente de Néctar", "⛲", "Una fuente burbujea néctar dorado entre las raíces. Huele a verano.", listOf(
                opt("Beber (recuperas 20 ❤️)") { p, _ -> p.heal(20); m("El néctar te llena de jugo. +20 ❤️.") },
                opt("Bañar una carta (madura 1 carta al azar)") { _, g -> val n = g.upgradeRandom(1); m(if (n.isNotEmpty()) "${n[0]} maduró y brilla." else "No tenías cartas que madurar.") },
                walkAway("Seguir de largo", "Sigues tu camino sin tocar nada raro.")
            )),
            EventDef("comerciante_misterioso", "Comerciante Encapuchado", "🎭", "Una ciruela pasa con capucha te ofrece algo envuelto en hojas.", listOf(
                opt("Pagar 40 de oro por un objeto al azar", locked = noGold(40)) { p, g -> p.gold -= 40; m(g.grantRandomRelic()) },
                opt("Pagar 25 de oro por una carta rara", locked = noGold(25)) { p, g -> p.gold -= 25; val c = g.randomCard("rare"); g.addCard(c.id); m("Desenvuelves las hojas: ¡${c.name}!") },
                walkAway("Rechazar la oferta", "La ciruela pasa desaparece entre las sombras.")
            )),
            EventDef("trampa_espinas", "Zarzamora Espinosa", "🌵", "Te enredas en una zarzamora. Hay moras jugosas… y espinas por todos lados.", listOf(
                opt("Forcejear (pierdes 8 ❤️)", tone = "bad") { p, _ -> lose(p, 8); m("Te liberas, pero te costó 8 ❤️.") },
                opt("Comerte las moras (+6 ❤️ máx. y un Gusano Interior)") { p, g -> p.maxHp += 6; p.hp += 6; g.addCard("gusano_interior"); m("Deliciosas… pero algo se movió dentro de una. +6 ❤️ máx.") },
                opt("Pagarle 20 de oro a un escarabajo", locked = noGold(20)) { p, _ -> p.gold -= 20; m("El escarabajo corta las ramas. Sales sin un rasguño.") }
            )),
            EventDef("altar_poder", "Altar del Sabor", "🗿", "Un altar antiguo promete madurez a cambio de pulpa.", listOf(
                opt("Dar 8 ❤️ máx. (empiezas cada combate con +2 de Madurez)") { p, _ ->
                    p.maxHp = max(10, p.maxHp - 8)
                    p.hp = min(p.hp, p.maxHp)
                    p.permanentStrength += 2
                    m("Te sientes más madura que nunca. +2 de Madurez en cada combate.")
                },
                walkAway("Alejarse del altar", "Decides no arriesgar tu pulpa.")
            )),
            EventDef("baul_escondido", "Baúl Escondido", "🧰", "Detrás de unas hojas grandes hay un baúl semienterrado. Algo tintinea adentro.", listOf(
                opt("Abrirlo con cuidado", tone = "risk") { p, g ->
                    if (Rng.next() < 0.25) { lose(p, 6); m("¡Era una trampa para ratones! Pierdes 6 ❤️.") }
                    else { val gold = (20 + Rng.int(25)) * g.act; p.gold += gold; m("Encontraste $gold de oro.") }
                },
                walkAway("Dejarlo en paz", "Algunos baúles es mejor no abrirlos.")
            )),
            EventDef("arbol_sabio", "Árbol Sabio", "🌳", "Un árbol viejísimo abre los ojos. \"Puedo enseñarte… si aguantas la lección.\"", listOf(
                opt("Escuchar la lección (madura 2 cartas al azar y pierdes 10 ❤️)") { p, g ->
                    lose(p, 10); val n = g.upgradeRandom(2)
                    m(if (n.isNotEmpty()) "Aprendiste mucho: ${n.joinToString(" y ")} maduraron." else "No tenías nada que aprender.")
                },
                opt("Dormir a su sombra (recuperas 12 ❤️)") { p, _ -> p.heal(12); m("Una siesta fresca. +12 ❤️.") }
            )),
            EventDef("monton_compost", "Montón de Compost", "🪱", "Un montón humeante de cáscaras viejas. Las lombrices te miran con curiosidad.", listOf(
                opt("Enterrar una carta básica (quitas un Golpe o un Jugo)") { _, g -> val n = g.removeRandom(true); m(if (n != null) "Enterraste $n. Las lombrices están felices." else "No te quedan cartas básicas.") },
                opt("Hurgar (50%: un objeto, 50%: un Gusano Interior)") { _, g ->
                    if (Rng.next() < 0.5) m(g.grantRandomRelic())
                    else { g.addCard("gusano_interior"); m("Sacaste la mano… con un gusano pegado. Recibes Gusano Interior.") }
                },
                walkAway("Taparte la nariz y seguir", "Hay cosas que es mejor no oler.")
            )),
            EventDef("gota_rocio", "Gota de Rocío", "💧", "Una gota de rocío gigante refleja tu mazo como un espejo.", listOf(
                opt("Tocar el reflejo (copia 1 carta al azar)") { _, g -> val n = g.duplicateRandom(); m(if (n != null) "Ahora tienes otra $n." else "El reflejo estaba vacío.") },
                opt("Beberla (recuperas 8 ❤️)") { p, _ -> p.heal(8); m("Fresquita. +8 ❤️.") }
            )),
            EventDef("puesto_abandonado", "Puesto Abandonado", "🧺", "Un puesto del mercado sin dueño. Hay fruta, una caja registradora… y nadie mirando.", listOf(
                opt("Llevarte el oro (+60 oro y una Fruta Magullada)") { p, g -> p.gold += 60; g.addCard("fruta_magullada"); m("Te llevas el oro, pero la culpa te deja magullada.") },
                opt("Ordenar el puesto (madura 1 carta al azar)") { _, g -> val n = g.upgradeRandom(1); m(if (n.isNotEmpty()) "El trabajo honesto madura: ${n[0]}." else "Todo ya estaba en orden.") }
            ), acts = listOf(2, 3)),
            EventDef("nido_zumbon", "Nido Zumbón", "🐝", "Un nido escondido entre las hojas zumba fuerte. Algo ahí adentro no quiere visitas.", listOf(
                go("Sacudirlo con un palo (te espera una pelea)", "fight"),
                walkAway("Alejarte despacio", "Te alejas de puntitas. El zumbido se calma.")
            )),
            EventDef("sombra_hambrienta", "Sombra Hambrienta", "👤", "Algo se mueve entre la maleza y no parece nada amigable.", listOf(
                go("Enfrentarla (te espera una pelea)", "fight"),
                opt("Ofrecerle 15 de oro para que se vaya", tone = "risk", locked = noGold(15)) { p, _ -> p.gold -= 15; m("La sombra toma el oro y desaparece entre los arbustos.") }
            )),
            EventDef("pozo_deseos", "Pozo de los Deseos", "🪙", "Un pozo de piedra musgosa. El agua brilla como si tuviera algo que ofrecer.", listOf(
                go("Tirar una moneda y pedir un deseo", "well"),
                walkAway("Seguir de largo", "Decides no tentar tu suerte hoy.")
            ), sprite = "node_well"),
            EventDef("trampilla", "Trampilla Podrida", "🕳️", "El suelo suena hueco bajo tus pies. Una trampilla mal cerrada esconde algo debajo.", listOf(
                go("Asomarte a mirar", "dungeon"),
                walkAway("Pisar con cuidado y seguir de largo", "Decides no arriesgarte a caer.")
            )),
            EventDef("tanque_jugo", "Tanque de Jugo", "🛢️", "Un tanque enorme de jugo concentrado. Una válvula gotea.", listOf(
                opt("Darte un chapuzón (+10 ❤️ máx. y pierdes 5 ❤️)") { p, _ -> p.maxHp += 10; lose(p, 5); m("Sales más jugosa que nunca. +10 ❤️ máx.") },
                opt("Cerrar la válvula (1 objeto al azar y pierdes 12 ❤️)") { p, g -> lose(p, 12); m(g.grantRandomRelic()) }
            ), acts = listOf(3)),

            // ---------- mesas de juego ----------
            EventDef("mesa_dados", "Mesa de Dados", "🎲", "Un fieltro rojo, un cubilete y un tahúr con cara de pocos amigos. Un dado te guiña un ojo.", listOf(
                go("Sentarte a jugar Veintiuno de Dados", "game:dice"),
                walkAway("Seguir de largo", "Dejas a los dados rodando solos.")
            ), sprite = "node_game", themes = CASINO + "mercado", w = 2.0),
            EventDef("mesa_poker", "Mesa de Póker", "🃏", "Una baraja gastada y una silla vacía. \"¿Una manito?\", pregunta el crupier sin mirarte.", listOf(
                go("Jugar una mano de Póker de 5 cartas", "game:poker"),
                walkAway("Rechazar con una sonrisa", "Nadie apuesta contra una fruta prudente.")
            ), sprite = "node_game", themes = CASINO + "cocina", w = 2.0),
            EventDef("mesa_ajedrez", "Tablero Chiquito", "♟️", "Un tablerito de 5 columnas con las piezas ya puestas. Un peón negro te invita a sentarte.", listOf(
                go("Aceptar la partida (cómete todas sus piezas)", "game:chess"),
                walkAway("Dejar el tablero en paz", "El peón suspira y vuelve a su casilla.")
            ), sprite = "node_game", themes = CASINO + "torre_rey", w = 2.0),
            EventDef("tragamonedas", "Máquina Tragamonedas", "🎰", "Una máquina de luces intermitentes. Tres rodillos, una palanca y un cartel: «¡Hoy sí!».", listOf(
                go("Jugar a la tragamonedas", "game:slots"),
                walkAway("Alejarte de la máquina", "Las luces parpadean, decepcionadas.")
            ), themes = CASINO + listOf("mercado", "fabrica"), w = 2.0),

            // ---------- Balatro ----------
            EventDef("comodin_sonriente", "Comodín Sonriente", "🃏", "Un comodín se te pega al hombro con una sonrisa de oreja a oreja. \"Tengo un trato para ti\".", listOf(
                opt("Aceptar (+1 de Madurez para siempre, pero se cuela una Carta Marcada)") { p, g ->
                    p.permanentStrength += 1; g.addCard("carta_marcada"); m("El comodín ríe. Sientes más fuerza… y un naipe raro en tu mazo.")
                },
                opt("Pedirle una carta rara (pagas 30 de oro)", locked = noGold(30)) { p, g ->
                    p.gold -= 30; val c = g.randomCard("rare"); g.addCard(c.id); m("El comodín te guiña y desliza ${c.name} en tu mazo.")
                },
                walkAway("Ignorarlo", "El comodín se desvanece en confeti.")
            ), sprite = "comodin_descarado"),
            EventDef("ruleta_fortuna", "Ruleta de la Fortuna", "🎡", "Una ruleta gigante gira sola, chirriando. Cada gajo tiene un premio… o un castigo.", listOf(
                go("Apostar en la ruleta de casino", "game:roulette"),
                opt("Girarla (gratis)", tone = "risk") { p, g ->
                    when (Rng.int(6)) {
                        0 -> { val gold = 60 + Rng.int(40); p.gold += gold; m("¡Cae en el dorado! +$gold de oro.") }
                        1 -> { val n = g.upgradeRandom(1); m(if (n.isNotEmpty()) "Cae en el verde: ${n[0]} madura." else "Cae en el verde, pero no había nada que madurar.") }
                        2 -> { p.maxHp += 8; p.hp += 8; m("Cae en el rojo: +8 ❤️ máx.") }
                        3 -> { lose(p, 9); m("Cae en el negro: pierdes 9 ❤️.") }
                        4 -> { g.addCard("fruta_magullada"); m("Cae en el morado: una Fruta Magullada se cuela en tu mazo.") }
                        else -> m(g.grantSeed() ?: "Cae en el azul: una semilla… pero tu bolsa está llena.")
                    }
                },
                walkAway("Dejarla girar sin ti", "La ruleta sigue girando, aburrida.")
            )),

            // ---------- The Binding of Isaac ----------
            EventDef("trato_diablo", "Trato con el Diablo", "😈", "Una sala roja con un fuego frío. Una silueta con cuernos sostiene un objeto brillante. \"Todo tiene su precio, frutita\".", listOf(
                opt("Pagar 12 ❤️ máx. por un objeto raro", locked = { p -> if (p.maxHp <= 30) "Estás muy flaca" else "" }) { p, g ->
                    p.maxHp -= 12; p.hp = min(p.hp, p.maxHp); m(g.grantRelicTier(listOf("rare", "uncommon")))
                },
                opt("Pagar 20 ❤️ máx. por DOS objetos", locked = { p -> if (p.maxHp <= 40) "Estás muy flaca" else "" }) { p, g ->
                    p.maxHp -= 20; p.hp = min(p.hp, p.maxHp)
                    m("${g.grantRelicTier(listOf("rare", "uncommon"))} ${g.grantRelicTier(listOf("common", "uncommon", "rare"))}")
                },
                walkAway("Rechazar el trato", "La silueta se encoge de hombros y se esfuma.")
            )),
            EventDef("sala_sacrificio", "Sala del Sacrificio", "🔺", "Un suelo lleno de pinchos y una alcancía dorada. Cada pisada duele, pero la alcancía tintinea.", listOf(
                opt("Pisar un pincho (−7 ❤️, +40 de oro)") { p, _ -> lose(p, 7); p.gold += 40; m("¡Ay! Pero la alcancía te escupe 40 de oro.") },
                opt("Pisar tres pinchos (−20 ❤️, +90 de oro y un objeto)", locked = { p -> if (p.hp <= 22) "Te quedarías sin vida" else "" }) { p, g ->
                    lose(p, 20); p.gold += 90; m("¡Auch, auch, auch! +90 de oro. ${g.grantRelicTier(listOf("common", "uncommon", "rare"))}")
                },
                walkAway("No vale la pena", "Cuentas los pinchos y decides que no.")
            )),
            EventDef("moneda_suerte", "Moneda de la Suerte", "🪙", "Una moneda gira en el suelo, sin caer nunca. Dicen que si la atrapas, la suerte te sigue… o te evita.", listOf(
                opt("Atraparla al vuelo", tone = "risk") { p, _ ->
                    if (Rng.next() < 0.5) { p.gold += 75; m("¡La atrapas! Resulta que era oro de verdad: +75.") }
                    else { lose(p, 6); m("Estaba caliente como un horno. Pierdes 6 ❤️.") }
                },
                walkAway("Dejarla girar", "La moneda sigue girando por los siglos de los siglos.")
            )),

            // ---------- Slay the Spire / Hades / Dark Souls / clásicos ----------
            EventDef("muro_viviente", "Muro Viviente", "🧱", "Un muro con una cara de piedra bosteza. \"Puedo cambiarte… si quieres\".", listOf(
                opt("Olvidar (quita una carta al azar de tu mazo)") { _, g -> val n = g.removeRandom(false); m(if (n != null) "El muro se traga $n." else "El muro no encontró nada que tragar.") },
                opt("Cambiar (transforma una carta al azar)", tone = "risk") { _, g -> m(g.transformRandom() ?: "El muro no encontró qué cambiar.") },
                opt("Crecer (madura una carta al azar)") { _, g -> val n = g.upgradeRandom(1); m(if (n.isNotEmpty()) "${n[0]} se endurece como piedra." else "Nada que madurar.") }
            )),
            EventDef("bendicion_dioses", "Bendición de los Dioses", "🏛️", "Tres pilares brillan en una sala de mármol. Una voz retumba: \"Elige un don, mortal frutal\".", listOf(
                opt("Don de Ares (+1 de Madurez al empezar cada combate)") { p, _ -> p.permanentStrength += 1; m("Ares sonríe: empiezas cada combate con +1 de Madurez.") },
                opt("Don de Deméter (+14 ❤️ máx.)") { p, _ -> p.maxHp += 14; p.hp += 14; m("Tu pulpa florece: +14 ❤️ máx.") },
                opt("Don de Hermes (+70 de oro)") { p, _ -> p.gold += 70; m("Hermes te deja un saquito con 70 de oro.") }
            )),
            EventDef("cofre_mimico", "Cofre Sospechoso", "📦", "Un cofre en medio del camino, demasiado brillante y demasiado tranquilo. Parece que respira.", listOf(
                opt("Abrirlo", tone = "risk") { _, g ->
                    if (Rng.next() < 0.55) m(g.grantRelicTier(listOf("common", "uncommon", "rare")))
                    else Outcome("¡ERA UN MÍMICO! Te salta encima.", fight = true)
                },
                walkAway("Tirarle una piedra primero", "La piedra rebota. El cofre gruñe bajito… y sigues tu camino.")
            ), sprite = "node_treasure"),
            EventDef("hada_fuente", "Fuente del Hada", "🧚", "Un hada de luz azul flota sobre una fuente. \"Pide un deseo, pero recuerda: los deseos cuestan\".", listOf(
                opt("Pedir salud (curación total, pagas 30 de oro)", locked = noGold(30)) { p, _ -> p.gold -= 30; p.hp = p.maxHp; m("El hada te envuelve en luz. Estás como nueva.") },
                opt("Pedir suerte (una semilla)") { _, g -> m(g.grantSeed() ?: "Tu bolsa de semillas está llena; el hada se ofende un poquito.") },
                walkAway("No molestar al hada", "El hada bosteza y vuelve a dormirse.")
            )),
            EventDef("maquina_garra", "Máquina de Garra", "🕹️", "Una máquina con peluches de frutas dentro. Una garra oxidada cuelga esperando.", listOf(
                opt("Intentarlo (15 de oro)", locked = noGold(15)) { p, g ->
                    p.gold -= 15
                    val r = Rng.next()
                    if (r < 0.15) m(g.grantRelicTier(listOf("common", "uncommon")))
                    else if (r < 0.55) m(g.grantSeed() ?: "La garra agarra una semilla… pero tu bolsa está llena.")
                    else m("La garra tiembla, agarra… y se le cae. ¡Tan cerca!")
                },
                walkAway("Mirar los peluches y seguir", "Uno de los peluches parece saludarte.")
            ), themes = CASINO + listOf("mercado", "fabrica")),
            EventDef("vasos_tahur", "Los Tres Vasos", "🥤", "Un tahúr mezcla tres vasos a toda velocidad. \"Si adivinas dónde está la moneda, es tuya\".",
                listOf("Vaso de la izquierda", "Vaso del medio", "Vaso de la derecha").map { label ->
                    opt("$label (apuestas 20 de oro)", locked = noGold(20)) { p, _ ->
                        p.gold -= 20
                        if (Rng.int(3) == 0) { p.gold += 80; m("¡Ahí estaba! Te llevas 80 de oro.") }
                        else m("Vacío. El tahúr se guarda tus 20 de oro con una sonrisita.")
                    }
                }, themes = CASINO),
            EventDef("piedra_papel_tijera", "Duelo del Gnomo", "✊", "Un gnomo de jardín te reta a piedra, papel o tijera. \"¡Si ganas, te doy oro! ¡Si pierdes, te pellizco!\"",
                listOf("Piedra" to "✊", "Papel" to "✋", "Tijera" to "✌️").mapIndexed { me, (name, ico) ->
                    opt("$ico $name", tone = "risk") { p, _ ->
                        val gn = Rng.int(3)
                        val icons = listOf("✊", "✋", "✌️")
                        when ((me - gn + 3) % 3) { // 0 empate, 1 gano, 2 pierdo
                            0 -> m("Tú $ico, el gnomo ${icons[gn]}: ¡empate! Se ríen los dos.")
                            1 -> { p.gold += 50; m("Tú $ico, el gnomo ${icons[gn]}: ¡ganas! +50 de oro.") }
                            else -> { lose(p, 8); m("Tú $ico, el gnomo ${icons[gn]}: ¡pierdes! Te pellizca y pierdes 8 ❤️.") }
                        }
                    }
                })
        )
    }

    /** Sorteo de un evento respetando su peso. */
    fun pick(pool: List<EventDef>): EventDef {
        val total = pool.sumOf { it.w }
        var r = Rng.next() * total
        for (ev in pool) { r -= ev.w; if (r <= 0) return ev }
        return pool.last()
    }

    fun byId(id: String): EventDef? = all.firstOrNull { it.id == id }
}

/** Los resultados del Pozo de los Deseos con su peso (js/game.js `WELL_OUTCOMES`). */
object Well {
    class WellOutcome(val w: Int, val effect: (Player, EventHelpers) -> String)

    val outcomes = listOf(
        WellOutcome(22) { p, _ -> val n = max(4, kotlin.math.ceil(p.maxHp * 0.2).toInt()); p.heal(n); "El pozo brilla dorado. Recuperas $n ❤️." },
        WellOutcome(16) { p, _ -> val gold = 25 + Rng.int(20); p.gold += gold; "Sacas $gold de oro empapado del fondo." },
        WellOutcome(5) { _, g -> g.grantRandomRelic() },
        WellOutcome(14) { _, g -> val n = g.upgradeRandom(1); if (n.isNotEmpty()) "El agua madura tu ${n[0]}." else "No tenías nada que madurar." },
        WellOutcome(12) { p, _ -> p.maxHp += 4; p.hp += 4; "+4 de vida máxima. Te sientes con más jugo." },
        WellOutcome(19) { _, _ -> "El pozo burbujea… y no pasa nada." },
        WellOutcome(12) { _, g -> g.addCard("fruta_magullada"); "¡Splash! Una Fruta Magullada te cae encima y se cuela en tu mazo." }
    )

    fun pick(): WellOutcome {
        val total = outcomes.sumOf { it.w }
        var r = Rng.next() * total
        for (o in outcomes) { r -= o.w; if (r <= 0) return o }
        return outcomes.last()
    }
}

/** El calabozo de 3×3 de la trampilla: se entra por una esquina de abajo y la escalera está en una de arriba. */
class Dungeon(val cleared: Array<BooleanArray>, var pos: Pos, val exit: Pos, val deco: Int, var pending: Pos? = null) {
    companion object {
        fun create(): Dungeon {
            val exitX = if (Rng.next() < 0.5) 0 else 2
            val cleared = Array(3) { BooleanArray(3) }
            cleared[2][2 - exitX] = true // la esquina de entrada ya está limpia
            return Dungeon(cleared, Pos(2 - exitX, 2), Pos(exitX, 0), Rng.int(1000))
        }
    }
}

/** Dado del destino (antes de cada jefe): 1 pifia · 2–7 mala suerte · 8–13 nada · 14–19 buena suerte · 20 crítico. */
object Fate {
    class Tier(val id: String, val name: String, val text: String)

    fun tier(roll: Int): Tier = when {
        roll <= 1 -> Tier("fumble", "Pifia", "El jefe empieza con 2 de Madurez.")
        roll <= 7 -> Tier("bad", "Mala suerte", "El jefe empieza con 10 de cáscara.")
        roll <= 13 -> Tier("none", "Sin cambios", "El destino no se mete.")
        roll <= 19 -> Tier("good", "Buena suerte", "Empiezas con 8 de cáscara y 1 de energía extra.")
        else -> Tier("crit", "¡Crítico!", "Empiezas con 12 de cáscara, 2 de energía extra y 2 de Madurez.")
    }

    /** Aplica el resultado al combate recién creado contra el jefe. */
    fun apply(c: Combat, roll: Int) {
        val id = tier(roll).id
        val p = c.player
        val boss = c.enemies.firstOrNull() ?: return
        when (id) {
            "fumble" -> c.applyStatus(boss, "strength", 2)
            "bad" -> c.gainBlock(boss, 10, false)
            "good" -> { c.gainBlock(p, 8, false); p.energy += 1 }
            "crit" -> { c.gainBlock(p, 12, false); p.energy += 2; c.applyStatus(p, "strength", 2) }
        }
    }
}
