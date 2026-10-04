// GENERADO por tools/export-core-data.js desde js/data/*.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

import com.yokyznt.fruitspire.core.data.*

private fun part0(): List<SeedDef> = listOf(
    SeedDef("semilla_chile", "Semilla Volcán", "🌋", "common", "#E0455E", "fire", "enemy", "Inflige 20 de daño a un enemigo. Si lo derrota, ganas 1 de energía."),
    SeedDef("semilla_fresa", "Semilla Vampiro", "🧛", "common", "#C8374F", "heart", "enemy", "Inflige 10 de daño a un enemigo y recuperas la vida que le quites."),
    SeedDef("semilla_coco", "Semilla Caparazón", "🥥", "common", "#8C6A3F", "shield", null, "Duplica tu cáscara actual y suma 8 más."),
    SeedDef("semilla_naranja", "Semilla del Amanecer", "🌅", "common", "#FFA64D", "bolt", null, "Recarga tu energía al máximo y ganas 1 extra."),
    SeedDef("semilla_uva", "Semilla Barajadora", "🔀", "common", "#9B7FD4", "cards", null, "Descartas tu mano y robas 2 cartas más de las que tenías."),
    SeedDef("semilla_podrida", "Semilla de Moho", "🦠", "common", "#7A6A4A", "drop", "enemy", "Duplica la Putrefacción de un enemigo (mínimo +6)."),
    SeedDef("semilla_suerte", "Semilla de la Suerte", "🍀", "common", "#5CC9A7", "dice", null, "Recibes 3 Pepitas en tu mano y robas 1 carta."),
    SeedDef("semilla_cactus", "Semilla Cactus", "🌵", "common", "#5DA33E", "spikes", null, "Ganas 6 de Pinchos. Duran todo el combate."),
    SeedDef("semilla_limon", "Semilla Ácida", "🍋", "uncommon", "#FFE27A", "swirl", null, "Quita toda la cáscara a TODOS los enemigos y les aplica 2 de Blandura."),
    SeedDef("semilla_sandia", "Semilla Bomba", "💥", "uncommon", "#7BBF5A", "burst", null, "Inflige 8 de daño a TODOS. Los que queden con 6 ❤️ o menos, mueren."),
    SeedDef("semilla_helada", "Semilla Escarcha Eterna", "🧊", "uncommon", "#8FD0F0", "snow", "enemy", "Congela a un enemigo y le aplica 2 de Magulladura."),
    SeedDef("semilla_mango", "Semilla Rabiosa", "🥭", "uncommon", "#FFB347", "up", null, "Ganas 4 de Madurez hasta el final del turno."),
    SeedDef("semilla_loca", "Semilla Loca", "🎲", "uncommon", "#E58CCB", "dice", null, "Aplica un perjuicio al azar a TODOS los enemigos (¡sorpresa!)."),
    SeedDef("semilla_espejo", "Semilla Espejo", "🪞", "uncommon", "#BFD9E8", "mirror", null, "Copia en tu mano la última carta que jugaste (si no jugaste ninguna, robas 2)."),
    SeedDef("semilla_jardinera", "Semilla Jardinera", "🌷", "uncommon", "#F08FB4", "flower", null, "Planta 2 brotes de Uva Agria en tu viñedo (¡cualquier fruta puede tener uno!)."),
    SeedDef("semilla_fantasma", "Semilla Fantasma", "👻", "uncommon", "#D9D4F0", "ghost", null, "Te vuelves intangible: el próximo golpe que recibas no te hace daño."),
    SeedDef("semilla_aguacate", "Semilla Blindada", "🥑", "rare", "#3E7A3A", "shield", null, "Ganas 2 de Firmeza y 10 de cáscara."),
    SeedDef("semilla_estrella", "Semilla Estrella", "⭐", "rare", "#FFCF4D", "star", null, "Gana 3 de energía y roba 2 cartas."),
    SeedDef("semilla_tiempo", "Semilla del Tiempo", "⏳", "rare", "#7FB8D9", "clock", null, "Congela a TODOS los enemigos, pero el próximo turno robas 2 cartas menos."),
    SeedDef("semilla_sacrificio", "Semilla del Sacrificio", "🩸", "rare", "#8E2B3D", "skull", null, "Pierdes 6 ❤️: ganas 3 de energía y 2 de Madurez.")
)

val GEN_SEEDS: List<SeedDef> by lazy { part0() }
