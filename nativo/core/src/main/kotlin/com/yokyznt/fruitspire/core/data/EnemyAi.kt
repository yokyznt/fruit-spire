package com.yokyznt.fruitspire.core.data

import com.yokyznt.fruitspire.core.Combat
import com.yokyznt.fruitspire.core.Ctx
import com.yokyznt.fruitspire.core.EnemyInstance
import com.yokyznt.fruitspire.core.Rng
import kotlin.math.floor

/**
 * IA de los enemigos que no solo recorren una lista (esas las genera `cycle(...)` en data/gen/GenEnemies.kt).
 * Portadas de js/data/enemies*.js. Devuelven el id de la jugada, o null para elegir al azar por peso.
 */
object EnemyAi {
    fun of(id: String): EnemyAiFn = ais[id] ?: error("Falta la IA del enemigo $id")
    fun special(moveId: String): (EnemyInstance, Ctx) -> Unit = specials[moveId] ?: error("Falta la jugada especial $moveId")

    /** ¿Hay lugar para invocar? (máximo 3 enemigos vivos) */
    private fun room(c: Combat, n: Int = 1) = c.aliveEnemies().size + n <= 3
    private fun halfHp(e: EnemyInstance) = e.hp < e.maxHp / 2.0
    private fun order(e: EnemyInstance, vararg ids: String) = ids[e.turns % ids.size]

    private val specials: Map<String, (EnemyInstance, Ctx) -> Unit> = mapOf(
        "ruleta" to { e, ctx ->
            when (floor(Rng.next() * 4).toInt()) {
                0 -> ctx.combat.dealDamage(e, ctx.player, 18)
                1 -> ctx.combat.healEntity(e, 20)
                2 -> ctx.combat.addCards("carta_marcada", 3, "discard")
                else -> ctx.combat.applyStatus(e, "strength", 3)
            }
            Unit
        }
    )

    private val ais: Map<String, EnemyAiFn> = hashMapOf(
        "cuervo_ladron" to { e, _ -> if (e.turns == 0) "robo" else null },
        "oruga_reina" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "capullo" }
            else if (e.phase == 1) order(e, "aleteo_real", "polvo_escamas")
            else if (e.turns == 0) "hilo_seda"
            else {
                val larvas = c.aliveEnemies().size < 2 && !e.history.takeLast(3).contains("llamar_larvas")
                if (larvas && e.turns % 3 == 2) "llamar_larvas" else order(e, "mordisco_real", "hilo_seda")
            }
        },
        "chef_cuchilla" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "furia" }
            else {
                var id = order(e, "picar_cubitos", "afilar_cuchillos", "flambear", "ayudante")
                if (id == "ayudante" && c.aliveEnemies().size >= 3) id = "flambear"
                id
            }
        },
        "licuadora_suprema" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "modo_turbo" }
            else if (e.phase == 1) order(e, "licuar", "triturar", "giro_doble")
            else {
                var id = order(e, "sobrecarga", "triturar", "giro_doble", "llamar_tapas")
                if (id == "llamar_tapas" && c.aliveEnemies().size >= 3) id = "triturar"
                id
            }
        },
        "escarabajo_gordo" to { e, _ -> if (e.turns == 0) "rugido" else null },
        "hongo_rey" to { e, c ->
            var id = order(e, "lluvia_esporas", "sombrero_blando", "cabezazo_real", "llamar_hongos")
            if (id == "llamar_hongos" && c.aliveEnemies().size >= 3) id = "cabezazo_real"
            id
        },
        "reloj_cocina" to { e, _ ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "reiniciar" } else order(e, "tic_tac", "alarma", "hervor")
        },
        "rey_raton" to { e, c ->
            var id = order(e, "llamar_ratas", "corona_robada", "mordisco_rey", "saqueo")
            if (id == "llamar_ratas" && c.aliveEnemies().size >= 3) id = "mordisco_rey"
            id
        },
        "horno_infernal" to { e, _ ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "gratinar" } else order(e, "horno_abierto", "rafaga_fuego", "precalentar")
        },
        "maquina_expendedora" to { e, c ->
            if (halfHp(e) && !e.history.contains("refresco_gratis")) "refresco_gratis"
            else {
                var id = order(e, "lata_disparada", "expender", "atasco", "lata_gigante")
                if (id == "expender" && c.aliveEnemies().size >= 3) id = "lata_gigante"
                id
            }
        },
        "gallina_clueca" to { e, c -> if (e.turns == 1 && room(c)) "cacareo" else null },
        "espantapajaros" to { e, c ->
            var id = order(e, "susto", "paja_ardiente", "llamar_cuervos", "garrotazo")
            if (id == "llamar_cuervos" && !room(c, 2)) id = "garrotazo"
            id
        },
        "lucio_gigante" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "remolino" }
            else {
                var id = order(e, "mordisco_lucio", "coletazo", "llamar_cardumen", "mordisco_lucio")
                if (id == "llamar_cardumen" && !room(c)) id = "coletazo"
                id
            }
        },
        "rosa_reina" to { e, c ->
            var id = order(e, "petalos", "espina_real", "perfume_dulce", "invocar_botones")
            if (id == "invocar_botones" && !room(c, 2)) id = "espina_real"
            id
        },
        "sommelier_fantasma" to { e, c ->
            var id = order(e, "catar", "descorchar", "anejar", "brindis")
            if (id == "brindis" && !room(c)) id = "descorchar"
            id
        },
        "avispon_capitan" to { e, c ->
            var id = order(e, "orden_avispon", "aguijon_doble", "lluvia_aguijones", "embestida_avispon")
            if (id == "orden_avispon" && !room(c)) id = "aguijon_doble"
            id
        },
        "dado_travieso" to { _, _ -> Rng.pick(listOf("tirada_baja", "tirada_media", "tirada_alta")) },
        "cubilete_saltarin" to { e, c -> if (e.turns % 3 == 2 && room(c)) "derramar" else null },
        "ficha_dorada" to { _, _ -> Rng.pick(listOf("cara", "cruz", "apuesta_ficha")) },
        "gran_dado" to { _, c ->
            val roll = Rng.pick(listOf("doble_seis", "ojos_serpiente", "lluvia_dados", "doble_cinco"))
            if (roll == "lluvia_dados" && !room(c, 2)) "doble_seis" else roll
        },
        "cubilete_maldito" to { e, c ->
            var id = order(e, "agitar", "tirada_triple", "tapa_cubilete", "lluvia_dados_boss")
            if (id == "lluvia_dados_boss" && !room(c, 2)) id = "tirada_triple"
            id
        },
        "joker" to { _, _ -> Rng.pick(listOf("travesura", "broma_pesada", "carcajada", "cambio_cartas")) },
        "crupier_marcado" to { e, _ ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "all_in" } else order(e, "repartir", "doblar", "ver_apuesta", "jugada_maestra")
        },
        "rey_ajedrez" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "jaque_mate" }
            else {
                var id = order(e, "llamar_peones", "enroque_rey", "decreto_rey", "enroque_rey")
                if (id == "llamar_peones" && !room(c, 2)) id = "decreto_rey"
                id
            }
        },
        "rey_azar" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "jackpot" }
            else {
                var id = order(e, "ruleta", "tres_siete", "tirada_real", "llamar_fichas")
                if (id == "llamar_fichas" && !room(c, 2)) id = "tres_siete"
                id
            }
        },
        "dama_suerte" to { e, _ ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "mala_racha" }
            else order(e, "trebol_cuatro_hojas", "reparto_suerte", "golpe_de_suerte", "espejo_suerte")
        },
        "gran_maestro" to { e, c ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "gambito_final" }
            else {
                var id = order(e, "gambito", "torre_alfil", "sacrificio", "gambito")
                if (id == "gambito" && !room(c)) id = "sacrificio"
                id
            }
        },
        "robot_gigante" to { e, _ ->
            if (e.phase == 0 && halfHp(e)) { e.phase = 1; "sobrecarga_robot" } else order(e, "barrer", "aspirar_todo", "fregona", "barrer")
        },
        "urraca_tahur" to { e, _ -> if (e.turns == 0) "birlar_carta" else null },
        "mano_tramposa" to { e, _ -> if (e.turns % 3 == 0) "manga" else null }
    )
}
