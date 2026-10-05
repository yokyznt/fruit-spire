// GENERADO por tools/export-core-data.js desde js/data/*.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

import com.yokyznt.fruitspire.core.data.*

private fun part0(): List<StatusDef> = listOf(
    StatusDef("strength", "Madurez", "madurez", "💪", "st_strength", "buff", "str", "Los ataques hacen +1 de daño por cada punto.", descTpl = "Cada ataque hace {n} de daño extra. Una fruta madura pega más fuerte."),
    StatusDef("dexterity", "Firmeza", "firmeza", "🥥", "st_dexterity", "buff", "block", "Las cartas de cáscara dan +1 por cada punto.", descTpl = "Cada carta que da cáscara da {n} extra."),
    StatusDef("weak", "Marchitez", "marchitez", "🥀", "st_weak", "debuff", "weak", "Los ataques hacen 25% menos daño. Baja 1 cada turno.", descTpl = "Los ataques hacen 25% menos daño. Dura {n} turnos más.", descOne = "Los ataques hacen 25% menos daño. Dura 1 turno más."),
    StatusDef("vulnerable", "Magulladura", "magulladura", "🎯", "st_vulnerable", "debuff", "vuln", "Recibe 50% más daño de los ataques. Baja 1 cada turno.", descTpl = "Recibe 50% más daño de ataques. Dura {n} turnos más.", descOne = "Recibe 50% más daño de ataques. Dura 1 turno más."),
    StatusDef("frail", "Blandura", "blandura", "🍮", "st_frail", "debuff", "weak", "Gana 25% menos cáscara. Baja 1 cada turno.", descTpl = "Gana 25% menos cáscara. Dura {n} turnos más.", descOne = "Gana 25% menos cáscara. Dura 1 turno más."),
    StatusDef("poison", "Putrefacción", "putrefacción", "🦠", "st_poison", "debuff", "poison", "Al final de su turno pierde 1 ❤️ por cada punto. Luego baja 1.", descTpl = "Al final de su turno pierde {n} ❤️ y la putrefacción baja 1."),
    StatusDef("thorns", "Pinchos", "pinchos", "🌵", "st_thorns", "buff", "str", "Quien lo golpee recibe 1 de daño por cada punto.", descTpl = "Quien lo golpee recibe {n} de daño por cada golpe."),
    StatusDef("frozen", "Congelado", "congela", "🧊", "st_frozen", "debuff", "draw", "Pierde su próxima acción.", noCount = true, descTpl = "Está hecho paleta: pierde su próxima acción."),
    StatusDef("regen", "Fotosíntesis", "fotosíntesis", "🌞", "st_regen", "buff", "heal", "Al final de su turno recupera 1 ❤️ por cada punto. Luego baja 1.", descTpl = "Al final de su turno recupera {n} ❤️ y la fotosíntesis baja 1."),
    StatusDef("ritual", "Maduración", "maduración", "🌅", "st_ritual", "buff", "str", "Al final de su turno gana 1 de Madurez por cada punto.", descTpl = "Al final de su turno gana {n} de Madurez."),
    StatusDef("plated", "Corteza", "corteza", "🪵", "st_plated", "buff", "block", "Al final de su turno gana 1 de cáscara por cada punto. Baja 1 cada vez que un golpe le quita vida.", descTpl = "Al final de su turno gana {n} de cáscara. Baja 1 cada vez que pierde vida por un golpe."),
    StatusDef("sticky", "Almíbar", "almíbar", "🍯", "st_sticky", "debuff", "energy", "Al empezar su próximo turno roba 1 carta menos por cada punto.", descTpl = "Está pegajoso: roba {n} cartas menos al empezar su próximo turno.", descOne = "Está pegajoso: roba 1 carta menos al empezar su próximo turno."),
    StatusDef("seeds", "Semillero", "semillero", "🌱", "semilla", "buff", "heal", "Al empezar su turno recibe 1 Pepita por cada punto.", descTpl = "Al empezar su turno añade {n} Pepitas a la mano.", descOne = "Al empezar su turno añade 1 Pepita a la mano."),
    StatusDef("noble_rot", "Moho Noble", "moho noble", "🍄", "podredumbre_noble", "buff", "poison", "Los ataques aplican 1 de Putrefacción por cada punto.", descTpl = "Cada ataque que juega aplica {n} de Putrefacción a su objetivo."),
    StatusDef("flex", "Subidón", "subidón", "⚡", "sidra_rabiosa", "buff", "str", "Madurez que se pierde al terminar el turno.", descTpl = "Tiene {n} de Madurez extra que pierde al terminar su turno."),
    StatusDef("barricade", "Racimo Firme", "racimo firme", "🍌", "racimo_firme", "buff", "block", "La cáscara no se pierde al empezar el turno.", noCount = true, descTpl = "La cáscara ya no se pierde al empezar su turno: se va acumulando."),
    StatusDef("inner_fire", "Fuego Interno", "fuego interno", "🔥", "fuego_interno", "buff", "str", "Al empezar su turno pierde 1 ❤️ y gana 1 de Madurez por cada punto.", descTpl = "Al empezar su turno pierde 1 ❤️ y gana {n} de Madurez."),
    StatusDef("ghost", "Intangible", "intangible", "👻", "st_ghost", "buff", "block", "El próximo golpe que reciba no le hace daño. Baja 1 por cada golpe."),
    StatusDef("taunt", "Provocación", "provocación", "📣", "st_taunt", "buff", "block", "Tus cartas y semillas que van a un solo enemigo tienen que ir contra él.", noCount = true),
    StatusDef("rage", "Rabia", "rabia", "💢", "st_rage", "buff", "str", "Cada vez que un golpe le quita vida, gana 1 de Madurez por cada punto.")
)

private fun part1(): List<StatusDef> = listOf(
    StatusDef("shell", "Caparazón", "caparazón", "🐢", "st_shell", "buff", "block", "Su cáscara no se pierde al empezar su turno: se va acumulando.", noCount = true),
    StatusDef("drained", "Agotamiento", "agotamiento", "🔋", "st_drained", "debuff", "energy", "Al empezar su próximo turno pierde 1 de energía por cada punto."),
    StatusDef("breed", "Plaga", "plaga", "🥚", "st_breed", "buff", "poison", "Al final de su turno, si hay lugar, tiene una cría. Baja 1 por cada cría."),
    StatusDef("fertile", "Tierra Fértil", "tierra fértil", "🪴", "tierra_fertil", "buff", "heal", "Cada brote que cosecha le da 1 de cáscara por cada punto."),
    StatusDef("vine", "Parra Trepadora", "parra trepadora", "🌿", "parra_trepadora", "buff", "heal", "Al empezar su turno planta 1 Uva Agria por cada punto."),
    StatusDef("curl", "Enroscado", "enroscado", "🐞", "st_curl", "buff", "block", "La primera vez que un golpe le quita vida, gana 1 de cáscara por cada punto."),
    StatusDef("wax", "Cera", "cera", "🕯️", "st_wax", "buff", "energy", "Anula 1 perjuicio por cada punto."),
    StatusDef("jelly", "Gelatina", "gelatina", "🍮", "st_jelly", "buff", "draw", "Cada golpe le hace solo 1 de daño. Baja 1 cada turno."),
    StatusDef("malleable", "Pulpa Blanda", "pulpa blanda", "🫧", "st_malleable", "buff", "block", "Cada golpe que le quita vida le da 1 de cáscara por cada punto."),
    StatusDef("fuse", "Mecha", "mecha", "💣", "st_fuse", "buff", "vuln", "Baja 1 al final de su turno. Al llegar a 0, explota contra ti y desaparece."),
    StatusDef("split", "Divisible", "divisible", "✂️", "st_split", "buff", "heal", "Al llegar a la mitad de su vida, se parte en dos con la vida que le queda.", noCount = true),
    StatusDef("minion", "Esbirro", "esbirro", "👣", "st_minion", "debuff", "weak", "Si su líder muere, huye.", noCount = true),
    StatusDef("clock", "Temporizador", "temporizador", "⏲️", "st_clock", "buff", "energy", "Baja 1 con cada carta que juegas. Al llegar a 0, gana 2 de Madurez y te aplica 1 de Marchitez."),
    StatusDef("cap", "Coraza Dura", "coraza dura", "🛡️", "st_cap", "buff", "block", "Los golpes no le quitan más de 1 ❤️ por cada punto en cada turno."),
    StatusDef("beat", "Latido", "latido", "💓", "st_beat", "buff", "vuln", "Cada carta que juegas te quita 1 ❤️ por cada punto."),
    StatusDef("regrow", "Rebrote", "rebrote", "🌱", "st_regrow", "buff", "heal", "La primera vez que muere, revive con la mitad de su vida.", noCount = true),
    StatusDef("spores", "Esporas", "esporas", "🍄", "st_spores", "buff", "poison", "Al morir, te aplica 1 de Magulladura por cada punto."),
    StatusDef("enrage", "Enfado", "enfado", "💢", "st_enrage", "buff", "str", "Cada habilidad que juegas le da 1 de Madurez por cada punto."),
    StatusDef("reflect", "Espejo", "espejo", "🪞", "st_reflect", "buff", "block", "El primer perjuicio que le mandes en su turno rebota y te lo aplica a ti en su lugar. Baja 1 cada vez.", descTpl = "Los próximos {n} perjuicios que le mandes rebotan hacia ti.", descOne = "Los próximos 1 perjuicio que le mandes rebotan hacia ti.")
)

val GEN_STATUSES: List<StatusDef> by lazy { part0() + part1() }
