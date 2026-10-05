// GENERADO por tools/export-audio.js desde js/audio.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

/** Los efectos de sonido del juego: [id] es el de Sfx.<id> de la web y [variants] cuántas versiones hay (sfx/<id>_<n>.ogg). */
enum class Sfx(val id: String, val variants: Int) {
    CLICK("click", 3),
    CARD_ATTACK("cardAttack", 3),
    CARD_SKILL("cardSkill", 3),
    CARD_POWER("cardPower", 1),
    HIT("hit", 3),
    POISON_TICK("poisonTick", 3),
    BLOCK("block", 3),
    HEAL("heal", 1),
    BUFF("buff", 1),
    DEBUFF("debuff", 1),
    COIN("coin", 1),
    SHUFFLE("shuffle", 3),
    TURN_PLAYER("turnPlayer", 1),
    TURN_ENEMY("turnEnemy", 1),
    ENEMY_DEATH("enemyDeath", 3),
    WIN("win", 1),
    LOSE("lose", 1),
    TAP("tap", 3),
    SELECT("select", 3),
    DENIED("denied", 3),
    MAP_MOVE("mapMove", 3),
    POP("pop", 1),
    SPARKLE("sparkle", 1),
    CHEST_OPEN("chestOpen", 1),
    GIFT_OPEN("giftOpen", 1),
    RELIC_GET("relicGet", 1),
    EVENT_OPEN("eventOpen", 1),
    INTRO_STING("introSting", 2),
    ACT_FANFARE("actFanfare", 1),
    REST_HEAL("restHeal", 1),
    UPGRADE("upgrade", 1),
    REMOVE_CARD("removeCard", 3),
    SEED_USE("seedUse", 3),
    EQUIP("equip", 1);

    companion object {
        private val ids: Map<String, Sfx> by lazy { entries.associateBy { it.id } }
        fun byId(id: String): Sfx? = ids[id]
    }
}

/** Una canción (music/<id>.ogg): su nombre y lo que dura, en segundos (16 compases de 8 corcheas). */
class SongInfo(val id: String, val name: String, val seconds: Double)

val GEN_SONGS: List<SongInfo> = listOf(
    SongInfo("menu_a", "Tema del Huerto", 38.4000),
    SongInfo("menu_b", "Canción de Cuna", 45.7143),
    SongInfo("map1_a", "Paseo por el Huerto", 34.2857),
    SongInfo("map1_b", "Brisa entre Hojas", 36.9231),
    SongInfo("map1_c", "El Gallinero", 30.9677),
    SongInfo("map2_a", "Swing del Casino", 32.0000),
    SongInfo("map2_b", "Blancas y Negras", 35.5556),
    SongInfo("map2_c", "La Casa Siempre Gana", 30.0000),
    SongInfo("map3_a", "La Torre del Rey", 40.0000),
    SongInfo("map3_b", "Escalera de Caracol", 34.9091),
    SongInfo("fight_a", "Pelea de Frutas", 27.8261),
    SongInfo("fight_b", "Semillas Volando", 29.0909),
    SongInfo("fight_c", "Jugo de Batalla", 26.6667),
    SongInfo("elite", "Rival Maduro", 25.6000),
    SongInfo("elite_b", "Espinas y Cáscaras", 26.3014),
    SongInfo("boss_a", "Jefe del Castillo", 24.3038),
    SongInfo("boss_b", "Gran Final", 23.4146),
    SongInfo("shop", "La Tiendita", 40.0000),
    SongInfo("rest", "Fogata", 50.5263),
    SongInfo("dungeon", "Calabozo", 43.6364),
    SongInfo("casino", "Apuesta", 30.9677)
)

/** Qué canciones suenan en cada lugar (menu, map1-3, combat, elite, boss, shop, rest, dungeon, casino). */
val GEN_PLAYLISTS: Map<String, List<String>> = mapOf(
    "menu" to listOf("menu_a", "menu_b"),
    "map1" to listOf("map1_a", "map1_b", "map1_c"),
    "map2" to listOf("map2_a", "map2_b", "map2_c"),
    "map3" to listOf("map3_a", "map3_b"),
    "combat" to listOf("fight_a", "fight_b", "fight_c"),
    "elite" to listOf("elite", "elite_b"),
    "boss" to listOf("boss_a", "boss_b"),
    "shop" to listOf("shop"),
    "rest" to listOf("rest", "menu_b"),
    "dungeon" to listOf("dungeon"),
    "casino" to listOf("casino", "map2_a")
)

/** Vibración con algunos efectos, en milisegundos (vibra, pausa, vibra…), como BUZZ de la web. */
val GEN_BUZZ: Map<String, List<Long>> = mapOf(
    "hit" to listOf(16L),
    "block" to listOf(8L),
    "denied" to listOf(22L),
    "enemyDeath" to listOf(28L),
    "lose" to listOf(90L),
    "win" to listOf(14L, 50L, 14L),
    "coin" to listOf(6L),
    "relicGet" to listOf(12L),
    "chestOpen" to listOf(12L),
    "upgrade" to listOf(10L),
    "removeCard" to listOf(12L)
)
