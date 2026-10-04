// GENERADO por tools/export-core-data.js desde js/data/*.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

import com.yokyznt.fruitspire.core.data.*

private fun part0(): List<SproutDef> = listOf(
    SproutDef("pasita", "Pasita", "pasita", "pasa_eterna", "🍇", 1, "roba 2 cartas.", "En 1 turno, roba 2 cartas."),
    SproutDef("agria", "Uva Agria", "uva agria", "brote_agria", "🍏", 2, "inflige 12 de daño a un enemigo al azar.", "En 2 turnos, inflige 12 de daño a un enemigo al azar."),
    SproutDef("dulce", "Uva Dulce", "uva dulce", "brote_dulce", "🍇", 2, "gana 10 de cáscara.", "En 2 turnos, gana 10 de cáscara."),
    SproutDef("parra", "Parra", "parra", "brote_parra", "🌿", 3, "gana 2 de energía.", "En 3 turnos, gana 2 de energía."),
    SproutDef("tinto", "Tinto Reserva", "tinto reserva", "tinto_final", "🍷", 4, "inflige 30 de daño a TODOS los enemigos.", "En 4 turnos, inflige 30 de daño a TODOS los enemigos.")
)

val GEN_SPROUTS: List<SproutDef> by lazy { part0() }
