// GENERADO por tools/export-core-data.js desde js/data/*.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

import com.yokyznt.fruitspire.core.data.*

private fun part0(): List<CardDef> = listOf(
    CardDef(id = "golpe_cascara", name = "Golpe de Cáscara", type = "attack", cost = 1, rarity = "basic", description = "Inflige {6|9} de daño.", art = "🍏", fx = "punch"),
    CardDef(id = "golpe_doble", name = "Doble Mordida", type = "attack", cost = 1, rarity = "common", description = "Inflige {4|5} de daño dos veces.", art = "🍒", fx = "bite"),
    CardDef(id = "tajo_citrico", name = "Tajo Cítrico", type = "attack", cost = 1, rarity = "uncommon", description = "Inflige {9|12} de daño. Si el enemigo tiene Magulladura, roba 1 carta.", art = "🍋", fx = "slash"),
    CardDef(id = "ametralladora_semillas", name = "Ametralladora de Semillas", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {4|5} de daño {4|5} veces a enemigos al azar.", art = "🍇", fx = "seeds", target = "none", character = "uva"),
    CardDef(id = "explosion_acida", name = "Explosión Ácida", type = "attack", cost = 2, rarity = "rare", description = "Inflige {14|18} de daño y aplica {2|3} de Magulladura.", art = "🍊", fx = "burst", character = "manzana"),
    CardDef(id = "golpe_final", name = "Puré Definitivo", type = "attack", cost = 3, rarity = "rare", description = "Inflige {22|30} de daño.", art = "🥭", fx = "burst", character = "manzana"),
    CardDef(id = "lluvia_uvas", name = "Lluvia de Uvas", type = "attack", cost = 1, rarity = "common", description = "Inflige {5|8} de daño a TODOS los enemigos.", art = "🍇", fx = "seeds", target = "none"),
    CardDef(id = "estocada_pina", name = "Estocada de Piña", type = "attack", cost = 1, rarity = "common", description = "Inflige {7|9} de daño. Gana {2|3} de Pinchos.", art = "🍍", fx = "stab", character = "kiwi"),
    CardDef(id = "chorro_limon", name = "Chorro de Limón", type = "attack", cost = 0, rarity = "common", description = "Inflige {3|5} de daño y aplica 1 de Marchitez.", art = "🍋", fx = "splash"),
    CardDef(id = "rodaja_sandia", name = "Rodaja Giratoria", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {9|12} de daño a TODOS los enemigos.", art = "🍉", fx = "spin", target = "none"),
    CardDef(id = "mordisco_voraz", name = "Mordisco Voraz", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {10|13} de daño. Si lo mata, +{3|4} de vida máxima. Se consume.", art = "🍑", fx = "bite", exhaust = true, character = "manzana"),
    CardDef(id = "cocazo", name = "Cocazo", type = "attack", cost = 1, rarity = "uncommon", description = "Inflige tanto daño como tu cáscara{| + 4}.", art = "🥥", fx = "punch", character = "platanin"),
    CardDef(id = "fruta_pasada", name = "Fruta Pasada", type = "attack", cost = 1, rarity = "common", description = "Inflige {5|7} de daño y aplica {3|4} de Putrefacción.", art = "🍌", fx = "splash", character = "kiwi"),
    CardDef(id = "racimo_furioso", name = "Racimo Furioso", type = "attack", cost = 1, rarity = "rare", description = "Inflige {3|4} de daño por cada carta jugada este turno, contando esta.", art = "🫐", fx = "seeds", character = "uva"),
    CardDef(id = "paleta_helada", name = "Paleta Helada", type = "attack", cost = 2, rarity = "rare", description = "Inflige 8 de daño y congela al enemigo. Se consume.", art = "🍧", fx = "ice", upCost = 1, exhaust = true),
    CardDef(id = "semilla", name = "Pepita", type = "attack", cost = 0, rarity = "token", description = "Inflige 3 de daño. Se consume.", art = "🌰", fx = "seeds", exhaust = true),
    CardDef(id = "jugo_defensivo", name = "Jugo Defensivo", type = "skill", cost = 1, rarity = "basic", description = "Gana {5|8} de cáscara.", art = "🥤"),
    CardDef(id = "escudo_pulpa", name = "Escudo de Pulpa", type = "skill", cost = 1, rarity = "common", description = "Gana {7|10} de cáscara. Roba 1 carta.", art = "🛡️", character = "platanin"),
    CardDef(id = "bloqueo_total", name = "Cáscara Blindada", type = "skill", cost = 2, rarity = "uncommon", description = "Gana {15|20} de cáscara.", art = "🥥", character = "platanin"),
    CardDef(id = "cascara_venenosa", name = "Cáscara Podrida", type = "skill", cost = 1, rarity = "common", description = "Aplica {5|7} de Putrefacción.", art = "🦠", target = "enemy", character = "kiwi")
)

private fun part1(): List<CardDef> = listOf(
    CardDef(id = "maldicion_debilidad", name = "Jugo Agrio", type = "skill", cost = 1, rarity = "common", description = "Aplica {2|3} de Marchitez y {1|2} de Magulladura.", art = "🍈", target = "enemy"),
    CardDef(id = "mermelada_curativa", name = "Mermelada Curativa", type = "skill", cost = 1, rarity = "rare", description = "Recupera {8|12} ❤️. Se consume.", art = "🍓", exhaust = true),
    CardDef(id = "frenesi_frutal", name = "Frenesí Frutal", type = "skill", cost = 0, rarity = "rare", description = "Roba {2|3} cartas y gana 1 de energía. Se consume.", art = "🍉", exhaust = true),
    CardDef(id = "hueso_aguacate", name = "Hueso de Aguacate", type = "skill", cost = 1, rarity = "uncommon", description = "Gana {5|7} de cáscara y 1 de Firmeza.", art = "🥑", character = "platanin"),
    CardDef(id = "batido_energetico", name = "Batido Energético", type = "skill", cost = 0, rarity = "uncommon", description = "Gana {1|2} de energía. Se consume.", art = "🥤", exhaust = true),
    CardDef(id = "exprimir", name = "Exprimir", type = "skill", cost = 1, rarity = "common", description = "Roba {2|3} cartas.", art = "🍋"),
    CardDef(id = "compostar", name = "Compostar", type = "skill", cost = 1, rarity = "uncommon", description = "Consume 1 carta al azar de tu mano. Gana {9|13} de cáscara.", art = "🪱", character = "platanin"),
    CardDef(id = "nube_polen", name = "Nube de Polen", type = "skill", cost = 1, rarity = "uncommon", description = "Aplica {1|2} de Marchitez y 1 de Magulladura a TODOS los enemigos.", art = "🌼"),
    CardDef(id = "rayito_sol", name = "Rayito de Sol", type = "skill", cost = 1, rarity = "uncommon", description = "Gana {4|6} de Fotosíntesis. Se consume.", art = "🌞", exhaust = true),
    CardDef(id = "corteza_coco", name = "Corteza de Coco", type = "skill", cost = 2, rarity = "uncommon", description = "Gana {4|6} de Corteza.", art = "🪵", character = "platanin"),
    CardDef(id = "siembra", name = "Siembra", type = "skill", cost = 1, rarity = "common", description = "Añade {2|3} Pepitas a tu mano.", art = "🌱", character = "uva"),
    CardDef(id = "catalizador_moho", name = "Catalizador de Moho", type = "skill", cost = 1, rarity = "rare", description = "Multiplica por {2|3} la Putrefacción del enemigo. Se consume.", art = "🍄", target = "enemy", exhaust = true, character = "kiwi"),
    CardDef(id = "ensalada_escudo", name = "Ensalada Escudo", type = "skill", cost = 1, rarity = "common", description = "Gana {8|11} de cáscara. Se conserva.", art = "🥗", retain = true, character = "platanin"),
    CardDef(id = "fermentacion", name = "Fermentación", type = "power", cost = 1, rarity = "uncommon", description = "Gana {2|3} de Madurez.", art = "🍾", character = "manzana"),
    CardDef(id = "semillero", name = "Semillero", type = "power", cost = 1, rarity = "rare", description = "Al empezar cada turno, recibes {1|2} Pepita{|s}.", art = "🌱", character = "uva"),
    CardDef(id = "sol_verano", name = "Sol de Verano", type = "power", cost = 2, rarity = "rare", description = "Al final de cada turno, gana 1 de Madurez.", art = "🌅", upCost = 1, character = "manzana"),
    CardDef(id = "coraza_pitahaya", name = "Coraza de Pitahaya", type = "power", cost = 1, rarity = "uncommon", description = "Gana {3|5} de Pinchos.", art = "🐉", character = "kiwi"),
    CardDef(id = "podredumbre_noble", name = "Moho Noble", type = "power", cost = 1, rarity = "rare", description = "Tus ataques aplican {1|2} de Putrefacción.", art = "🍄", character = "kiwi"),
    CardDef(id = "fruta_magullada", name = "Fruta Magullada", type = "curse", cost = 0, rarity = "curse", description = "Injugable.", art = "🤕", unplayable = true),
    CardDef(id = "gusano_interior", name = "Gusano Interior", type = "curse", cost = 0, rarity = "curse", description = "Injugable. Si sigue en tu mano al terminar el turno, pierdes 2 ❤️.", art = "🐛", unplayable = true, endTurnDamage = 2)
)

private fun part2(): List<CardDef> = listOf(
    CardDef(id = "pulpa_aplastada", name = "Pulpa Aplastada", type = "status", cost = 0, rarity = "status", description = "Injugable. Si sigue en tu mano al terminar el turno, se consume.", art = "🫠", unplayable = true, ethereal = true),
    CardDef(id = "jugo_hirviendo", name = "Jugo Hirviendo", type = "status", cost = 0, rarity = "status", description = "Injugable. Si sigue en tu mano al terminar el turno, pierdes 2 ❤️.", art = "♨️", unplayable = true, endTurnDamage = 2),
    CardDef(id = "manzanazo", name = "Manzanazo", type = "attack", cost = 2, rarity = "basic", description = "Inflige {8|10} de daño y aplica {2|3} de Magulladura.", art = "🍎", fx = "burst", character = "manzana"),
    CardDef(id = "cascara_rota", name = "Cáscara Rota", type = "attack", cost = 1, rarity = "common", description = "Inflige {8|11} de daño. Si el enemigo tenía Magulladura, gana 1 de Madurez.", art = "🍎", fx = "slash", character = "manzana"),
    CardDef(id = "golpe_maduro", name = "Golpe Maduro", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {12|14} de daño. La Madurez cuenta {3|5} veces en este golpe.", art = "🍎", fx = "burst", character = "manzana"),
    CardDef(id = "sacrificio_pulpa", name = "Sacrificio de Pulpa", type = "skill", cost = 0, rarity = "uncommon", description = "Pierdes 3 ❤️. Gana {2|3} de energía.", art = "🩸", character = "manzana"),
    CardDef(id = "tormenta_manzanas", name = "Tormenta de Manzanas", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {5|7} de daño a TODOS los enemigos dos veces.", art = "🍎", fx = "seeds", target = "none", character = "manzana"),
    CardDef(id = "sidra_rabiosa", name = "Sidra Rabiosa", type = "skill", cost = 0, rarity = "common", description = "Gana {2|4} de Madurez hasta el final del turno.", art = "🍾", character = "manzana"),
    CardDef(id = "fuego_interno", name = "Fuego Interno", type = "power", cost = 2, rarity = "rare", description = "Al empezar cada turno, pierdes 1 ❤️ y ganas {2|3} de Madurez.", art = "🔥", character = "manzana"),
    CardDef(id = "cascara_resbalosa", name = "Cáscara Resbalosa", type = "skill", cost = 1, rarity = "basic", description = "Gana {6|8} de cáscara y aplica {1|2} de Marchitez.", art = "🍌", target = "enemy", character = "platanin", sprite = "cascara_platano"),
    CardDef(id = "doble_cascara", name = "Doble Cáscara", type = "skill", cost = 2, rarity = "uncommon", description = "Duplica tu cáscara.", art = "🍌", upCost = 1, character = "platanin"),
    CardDef(id = "racimo_firme", name = "Racimo Firme", type = "power", cost = 3, rarity = "rare", description = "Tu cáscara ya no se pierde al empezar el turno.", art = "🍌", upCost = 2, character = "platanin"),
    CardDef(id = "aplaston_dorado", name = "Aplastón Dorado", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {10|14} de daño. Gana tanta cáscara como vida le quites.", art = "🍌", fx = "punch", character = "platanin"),
    CardDef(id = "boomerang_platano", name = "Bumerán de Plátano", type = "attack", cost = 1, rarity = "common", description = "Inflige {6|8} de daño a TODOS los enemigos y gana {4|6} de cáscara.", art = "🍌", fx = "spin", target = "none", character = "platanin"),
    CardDef(id = "licuado_proteico", name = "Licuado Proteico", type = "skill", cost = 1, rarity = "common", description = "Gana {6|8} de cáscara. Si ya tenías cáscara, roba 1 carta.", art = "🥤", character = "platanin"),
    CardDef(id = "pelitos_toxicos", name = "Pelitos Tóxicos", type = "skill", cost = 1, rarity = "basic", description = "Aplica {3|5} de Putrefacción. Gana 1 de Pinchos.", art = "🥝", target = "enemy", character = "kiwi"),
    CardDef(id = "nube_esporas", name = "Nube de Esporas", type = "skill", cost = 2, rarity = "uncommon", description = "Aplica 4 de Putrefacción a TODOS los enemigos.", art = "🍄", upCost = 1, character = "kiwi"),
    CardDef(id = "rodaja_kiwi", name = "Rodaja de Kiwi", type = "attack", cost = 0, rarity = "common", description = "Inflige {4|6} de daño. Roba 1 carta.", art = "🥝", fx = "slash", character = "kiwi"),
    CardDef(id = "pelusa_defensiva", name = "Pelusa Defensiva", type = "skill", cost = 1, rarity = "common", description = "Gana {4|6} de cáscara y {2|3} de Pinchos.", art = "🥝", character = "kiwi"),
    CardDef(id = "siembra_agria", name = "Siembra Agria", type = "skill", cost = 1, rarity = "basic", description = "Planta una Uva Agria.", art = "🍏", upCost = 0, character = "uva")
)

private fun part3(): List<CardDef> = listOf(
    CardDef(id = "siembra_dulce", name = "Siembra Dulce", type = "skill", cost = 1, rarity = "basic", description = "Gana {3|6} de cáscara. Planta una Uva Dulce.", art = "🍇", character = "uva"),
    CardDef(id = "regar", name = "Regar", type = "skill", cost = 1, rarity = "common", description = "Tus brotes crecen 1. Roba {1|2} carta{|s}.", art = "🚿", character = "uva", sprite = "regadera"),
    CardDef(id = "vendimia", name = "Vendimia", type = "attack", cost = 1, rarity = "common", description = "Inflige {5|7} de daño, y otra vez por cada brote en tu viñedo.", art = "🍇", fx = "slash", character = "uva"),
    CardDef(id = "pasas_al_sol", name = "Pasas al Sol", type = "skill", cost = 1, rarity = "common", description = "Gana {3|6} de cáscara. Planta una Pasita.", art = "🍇", character = "uva", sprite = "pasa_eterna"),
    CardDef(id = "racimo_pisado", name = "Racimo Pisado", type = "attack", cost = 1, rarity = "common", description = "Inflige {8|11} de daño. Si tu viñedo está lleno, gana 1 de energía.", art = "🍇", fx = "splash", character = "uva"),
    CardDef(id = "cosecha_temprana", name = "Cosecha Temprana", type = "skill", cost = 1, rarity = "uncommon", description = "Cosecha ya todos tus brotes.", art = "✂️", upCost = 0, character = "uva", sprite = "tijeras_poda"),
    CardDef(id = "plantar_parra", name = "Plantar Parra", type = "skill", cost = 1, rarity = "uncommon", description = "Planta una Parra.{| Roba 1 carta.}", art = "🌿", character = "uva"),
    CardDef(id = "pisada_uvas", name = "Pisada de Uvas", type = "attack", cost = 2, rarity = "uncommon", description = "Inflige {6|8} de daño a TODOS los enemigos dos veces. Tus brotes crecen 1.", art = "🍇", fx = "seeds", target = "none", character = "uva"),
    CardDef(id = "tierra_fertil", name = "Tierra Fértil", type = "power", cost = 1, rarity = "uncommon", description = "Cada vez que cosechas un brote, gana {3|5} de cáscara.", art = "🪴", character = "uva"),
    CardDef(id = "parra_trepadora", name = "Parra Trepadora", type = "power", cost = 2, rarity = "rare", description = "Al empezar cada turno, planta una Uva Agria.", art = "🌿", upCost = 1, character = "uva"),
    CardDef(id = "tinto_reserva", name = "Tinto Reserva", type = "skill", cost = 2, rarity = "rare", description = "Planta un Tinto Reserva.", art = "🍷", upCost = 1, character = "uva", sprite = "tinto_final"),
    CardDef(id = "carta_marcada", name = "Carta Marcada", type = "status", cost = 0, rarity = "status", description = "Injugable. Si sigue en tu mano al terminar el turno, pierdes 1 ❤️ y se consume.", art = "🃏", unplayable = true, ethereal = true, endTurnDamage = 1),
    CardDef(id = "dado_trucado", name = "Dado Trucado", type = "curse", cost = 0, rarity = "curse", description = "Injugable. Si sigue en tu mano al terminar el turno, pierdes 1 ❤️.", art = "🎲", unplayable = true, endTurnDamage = 1)
)

val GEN_CARDS: List<CardDef> by lazy { part0() + part1() + part2() + part3() }
