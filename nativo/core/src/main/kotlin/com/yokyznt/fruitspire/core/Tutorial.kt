package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Cards
import com.yokyznt.fruitspire.core.data.Enemies

// ============================================================
// El tutorial «Cómo jugar» (js/tutorial.js): un mapa chiquito con un camino fijo por las casillas principales y Profe Limón
// guiando cada paso. Hay dos tipos de paso:
//   · de lectura (next)  → se avanza con «Siguiente»; mientras tanto no se puede hacer nada.
//   · de acción (until)  → OBLIGATORIO: solo se puede hacer lo que el paso permite (allow) y el tutorial no sigue hasta que
//     se cumple until(), que mira el estado del juego (así no se pierde aunque algo pase muy rápido).
// Los pasos tienen escapes para que nunca se atoren: un paso de otra pantalla se salta hacia adelante, skipIf se salta el
// que no se puede hacer (por ejemplo, jugar una habilidad sin tener ninguna) y until acepta «ya no puedes hacerlo».
// ============================================================

/** Lo que se puede intentar en pantalla; cada paso dice cuáles deja pasar. */
object TutAction {
    const val MOVE = "move"           // tocar una casilla del mapa
    const val PLAY = "play"           // elegir o arrastrar una carta (el paso puede limitarla a un tipo)
    const val END_TURN = "end-turn"
    const val LOOT = "loot"           // recoger un premio
    const val PICK_CARD = "pick-card" // elegir la carta de recompensa
    const val CONTINUE = "continue"   // seguir tras recoger los premios de un combate
    const val REST = "rest"           // todo lo del campamento (curar, madurar, quitar y su selector)
    const val EVENT = "event"         // elegir una opción del misterio
    const val SHOP = "shop"           // comprar o quitar una carta
    const val LEAVE = "leave"         // salir de un nodo (tesoro, evento, tienda…)
    const val BAG = "bag"             // abrir y cerrar la mochila
    const val SEED = "seed"           // apuntar y usar una semilla
    const val TIP = "tip"             // tocar la intención del enemigo o la regla del piso para leerlas
}

/**
 * Lo que el director necesita saber para decidir. [bagOpen], [seedAiming] y [animating] los pone la interfaz
 * (la mochila, el apuntado de la semilla y las animaciones no viven en [Run]).
 */
class TutorialCtx(
    val run: Run, val flags: Set<String>,
    val bagOpen: Boolean = false, val seedAiming: Boolean = false, val animating: Boolean = false
) {
    val screen: RunScreen get() = run.screen
    val combat: Combat? get() = run.combat
    fun flag(name: String) = name in flags
    fun hasSeed() = run.player.seeds.any { it != null }
    /** ¿Hay en la mano una carta de este tipo que se pueda jugar ahora mismo? */
    fun canPlay(type: String): Boolean {
        val c = combat ?: return false
        return !c.ended && c.turn == "player" && c.player.hand.any { Cards.get(it)?.type == type && c.canPlay(it) }
    }
}

/**
 * Un paso. [spots] dice qué se ilumina (identificadores que cada pantalla sabe encontrar: "token", "walls", "reachable",
 * "elites", "lair", "enemy", "intent", "plate", "hand", "energy", "block", "end-turn", "bag", "loot", "reward-cards",
 * "continue", "rest", "leave", "event-options", "shop-items", "shop-leave", "rule", "inv-use", "enemy-aim").
 * [pos]: dónde sale el globo («bl», «top» o «center»). [text] lleva <b>…</b> para lo importante.
 */
class TutStep(
    val screen: RunScreen?, val pos: String, val text: String,
    val next: Boolean = false,
    val spots: (TutorialCtx) -> List<String> = { emptyList() },
    val allow: Set<String> = emptySet(),
    /** «attack» o «skill»: en este paso solo se pueden jugar cartas de ese tipo. */
    val cards: String? = null,
    /** Tocar lo iluminado muestra su explicación. */
    val tap: Boolean = false,
    val until: ((TutorialCtx) -> Boolean)? = null,
    val skipIf: ((TutorialCtx) -> Boolean)? = null,
    /** Qué no debe tapar el globo (además de lo iluminado). */
    val avoid: List<String> = emptyList()
)

private fun spot(vararg ids: String): (TutorialCtx) -> List<String> = { ids.toList() }
private fun onScreen(s: RunScreen): (TutorialCtx) -> Boolean = { it.screen == s }
private val noEnemyAlive: (TutorialCtx) -> Boolean = { c -> c.combat?.enemies?.firstOrNull()?.isAlive() != true }
private val lootOr: (String) -> (TutorialCtx) -> List<String> = { other -> { c -> if (c.run.lootPending()) listOf("loot") else listOf(other) } }

/** Los 33 pasos (11 de lectura y 22 de acción) en 5 tramos: mapa, primer combate, recompensas, resto del mapa y jefe. */
val TUTORIAL_STEPS: List<TutStep> = listOf(
    // ---------- el mapa ----------
    TutStep(RunScreen.MAP, "center", "¡Hola! Soy <b>Profe Limón</b>. Te enseño a jugar en un ratito.", next = true),
    TutStep(RunScreen.MAP, "top", "Esta es tu fruta. Sube la torre hasta el <b>jefe</b>, arriba.", next = true, spots = spot("token")),
    TutStep(RunScreen.MAP, "top", "Puedes ir adelante o a los lados. Las cintas son <b>muros</b>.", next = true, spots = spot("walls")),
    TutStep(RunScreen.MAP, "top", "Toca la casilla del <b>enemigo</b>.", spots = spot("reachable"), allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.COMBAT)),

    // ---------- el primer combate ----------
    TutStep(RunScreen.COMBAT, "top", "Este es el enemigo. ¡Bájale la vida a 0!", next = true, spots = spot("enemy")),
    TutStep(RunScreen.COMBAT, "top", "Esto es lo que hará en su turno. La espada es el <b>daño</b> que te hará.", next = true, spots = spot("intent")),
    TutStep(RunScreen.COMBAT, "top", "Esta es tu <b>vida</b>.", next = true, spots = spot("plate")),
    TutStep(RunScreen.COMBAT, "top", "Estas son tus <b>cartas</b>. Robas 5 cada turno.", next = true, spots = spot("hand")),
    TutStep(RunScreen.COMBAT, "top", "Tu <b>energía</b>. Cada carta cuesta lo que dice su bolita.", next = true, spots = spot("energy")),
    TutStep(
        // se da por cumplido si ya no puede jugar ningún ataque (para no atorarse)
        RunScreen.COMBAT, "top", "Arrastra un <b>Golpe de Cáscara</b> hasta el enemigo.", spots = spot("hand"), allow = setOf(TutAction.PLAY), cards = "attack",
        avoid = listOf("enemy", "intent"), until = { it.flag("card:attack") || !it.canPlay("attack") }, skipIf = { !it.canPlay("attack") }
    ),
    TutStep(
        // igual: si ya no puede jugar ninguna habilidad, sigue
        RunScreen.COMBAT, "top", "Ahora arrastra un <b>Jugo Defensivo</b> hacia arriba.", spots = spot("hand"), allow = setOf(TutAction.PLAY), cards = "skill",
        avoid = listOf("enemy", "intent"), until = { it.flag("card:skill") || !it.canPlay("skill") }, skipIf = { !it.canPlay("skill") }
    ),
    TutStep(
        RunScreen.COMBAT, "top", "Eso es <b>cáscara</b>: recibe los golpes antes que tu vida.", next = true, spots = spot("block"),
        skipIf = { (it.combat?.player?.block ?: 0) <= 0 }
    ),
    TutStep(
        // tap: en este paso basta tocar lo iluminado para ver su explicación
        RunScreen.COMBAT, "top", "Toca su intención para ver los <b>detalles</b>.", spots = spot("intent"), allow = setOf(TutAction.TIP), tap = true,
        until = { it.flag("tip:intent") }, skipIf = noEnemyAlive
    ),
    TutStep(RunScreen.COMBAT, "top", "Pulsa <b>Terminar turno</b>.", spots = spot("end-turn"), allow = setOf(TutAction.END_TURN), until = { it.flag("turn-end") }),
    TutStep(
        RunScreen.COMBAT, "top", "¡Sigue así hasta ganar!", spots = spot("hand", "end-turn"), allow = setOf(TutAction.PLAY, TutAction.END_TURN),
        avoid = listOf("enemy", "intent"), until = onScreen(RunScreen.REWARD)
    ),

    // ---------- recompensas ----------
    TutStep(
        RunScreen.REWARD, "bl", "¡Ganaste! Toca cada <b>premio</b> para guardarlo y elige una carta.",
        spots = { c -> if (c.run.lootPending()) listOf("loot") else listOf("reward-cards", "continue") },
        allow = setOf(TutAction.LOOT, TutAction.PICK_CARD, TutAction.CONTINUE), until = onScreen(RunScreen.MAP)
    ),
    TutStep(RunScreen.MAP, "bl", "También ganaste una <b>semilla</b>. Está en tu Mochila.", next = true, spots = spot("bag")),

    // ---------- el resto del mapa ----------
    TutStep(RunScreen.MAP, "top", "Ve a la <b>fogata</b>.", spots = spot("reachable"), allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.REST)),
    TutStep(
        RunScreen.REST, "bl", "Elige una: <b>curarte</b>, mejorar una carta o quitar una.", spots = spot("rest"), allow = setOf(TutAction.REST),
        until = onScreen(RunScreen.MAP)
    ),
    TutStep(RunScreen.MAP, "top", "Ahora el <b>cofre</b>.", spots = spot("reachable"), allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.TREASURE)),
    TutStep(
        RunScreen.TREASURE, "bl", "¡Un <b>objeto</b>! Tócalo para guardarlo en tu Mochila.", spots = lootOr("leave"),
        allow = setOf(TutAction.LOOT, TutAction.LEAVE), until = onScreen(RunScreen.MAP)
    ),
    TutStep(RunScreen.MAP, "top", "Ahora el <b>misterio</b>.", spots = spot("reachable"), allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.EVENT)),
    TutStep(
        RunScreen.EVENT, "bl", "Elige una opción.", spots = spot("event-options"), allow = setOf(TutAction.EVENT),
        until = onScreen(RunScreen.EVENT_RESULT)
    ),
    TutStep(
        RunScreen.EVENT_RESULT, "bl", "Recoge lo que ganaste y pulsa <b>Continuar</b>.", spots = lootOr("leave"),
        allow = setOf(TutAction.LOOT, TutAction.LEAVE), until = onScreen(RunScreen.MAP)
    ),
    TutStep(RunScreen.MAP, "top", "Ahora la <b>tiendita</b>.", spots = spot("reachable"), allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.SHOP)),
    TutStep(
        RunScreen.SHOP, "bl", "Compra algo con tu <b>oro</b>.", spots = spot("shop-items"), allow = setOf(TutAction.SHOP),
        until = { it.flag("shop-buy") }
    ),
    TutStep(RunScreen.SHOP, "bl", "Pulsa <b>Salir</b>.", spots = spot("shop-leave"), allow = setOf(TutAction.LEAVE), until = onScreen(RunScreen.MAP)),
    TutStep(RunScreen.MAP, "top", "Las de fuego son <b>élites</b>: más duras, pero dan objetos.", next = true, spots = spot("elites")),
    TutStep(
        // si la guarida aún no se alcanza, brilla la casilla que lleva hasta ella (nunca se atora)
        RunScreen.MAP, "top", "Entra a la guarida del <b>jefe</b>.",
        spots = { c -> if (c.run.isReachable(c.run.map.cols - 1, c.run.pos.y)) listOf("lair") else listOf("reachable") },
        allow = setOf(TutAction.MOVE), until = onScreen(RunScreen.COMBAT)
    ),

    // ---------- el jefe ----------
    TutStep(
        RunScreen.COMBAT, "top", "Cada piso tiene una <b>regla</b>. Tócala para leerla.", spots = spot("rule"), allow = setOf(TutAction.TIP), tap = true,
        until = { it.flag("tip:rule") }, skipIf = { it.combat?.rule == null }
    ),
    TutStep(
        RunScreen.COMBAT, "top", "Abre tu <b>Mochila</b>.", spots = spot("bag"), allow = setOf(TutAction.BAG),
        until = { it.bagOpen || it.flag("seed-use") || !it.hasSeed() }, skipIf = { !it.hasSeed() }
    ),
    TutStep(
        // si cierra la mochila, vuelve a brillar la mochila para abrirla otra vez;
        // si se queda sin semilla (la tiró), el paso se da por hecho
        RunScreen.COMBAT, "top", "Usa la <b>semilla</b>.",
        spots = { c -> if (c.seedAiming) listOf("enemy-aim") else if (c.bagOpen) listOf("inv-use") else listOf("bag") },
        allow = setOf(TutAction.BAG, TutAction.SEED), until = { it.flag("seed-use") || (!it.hasSeed() && !it.seedAiming) }, skipIf = { !it.hasSeed() }
    ),
    TutStep(
        RunScreen.COMBAT, "top", "¡Ahora derrótalo!", spots = spot("hand", "end-turn"), allow = setOf(TutAction.PLAY, TutAction.END_TURN),
        avoid = listOf("enemy", "intent"), until = onScreen(RunScreen.TUTORIAL_END)
    )
)

/** El mapa fijo del tutorial: 7 columnas (la tiendita queda pegada a la guarida del jefe) y un camino por la fila del medio. */
fun buildTutorialMap(): MapData {
    val cols = 7
    val rows = 3
    val grid = Array(rows) { Array(cols) { NodeType.EMPTY } }
    listOf(NodeType.EMPTY, NodeType.ENEMY, NodeType.REST, NodeType.TREASURE, NodeType.MYSTERY, NodeType.SHOP).forEachIndexed { x, t -> grid[1][x] = t }
    for (y in 0 until rows) grid[y][cols - 1] = NodeType.BOSS
    grid[0][4] = NodeType.ELITE
    grid[2][2] = NodeType.ELITE
    grid[2][5] = NodeType.ELITE
    // muros: no se puede salir de la fila del medio
    val wallsH = Array(rows - 1) { BooleanArray(cols) { true } }
    val wallsV = Array(rows) { y -> BooleanArray(cols - 1) { y != 1 } }
    return MapData(grid, wallsV, wallsH, 1).also {
        it.cols = cols; it.rows = rows; it.seed = 42
        it.themeId = "huerto"; it.bossId = "mango_zombie"
    }
}

/** Dónde va el tutorial y qué deja hacer (tutCheck, tutAdvance, tutorialNotify y tutQuit de js/tutorial.js). */
class TutorialDirector {
    var i = 0
        internal set
    /** Lo que ya pasó ("card:attack", "turn-end", "shop-buy", "seed-use", "tip:intent", "tip:rule"). */
    val flags = HashSet<String>()
    /** Preguntando «¿Salir del tutorial?»: todo queda apagado. */
    var quitAsk = false
    /** El último paso se acaba de cumplir: Profe Limón felicita. */
    var praise = false
    /** El primer combate se arma aparte (una avispa sola, mano fija). */
    var firstFight = true

    val step: TutStep? get() = TUTORIAL_STEPS.getOrNull(i)
    val total: Int get() = TUTORIAL_STEPS.size
    val progressPct: Int get() = ((i + 1) * 100f / total).toInt().coerceIn(0, 100)

    private fun nextIndex(from: Int, ctx: TutorialCtx): Int {
        var k = from
        while (TUTORIAL_STEPS.getOrNull(k)?.skipIf?.invoke(ctx) == true) k++
        return k
    }

    /** «Siguiente» de un paso de lectura. */
    fun advance(ctx: TutorialCtx) {
        val s = step ?: return
        if (quitAsk || !s.next) return // los pasos de acción solo avanzan cumpliendo lo que piden
        i = nextIndex(i + 1, ctx)
        check(ctx)
    }

    /**
     * Avanza los pasos de acción ya cumplidos y, si la pantalla no corresponde al paso actual, salta hacia adelante (nunca hacia
     * atrás) al siguiente paso de esa pantalla. Devuelve true si cambió de paso.
     */
    fun check(ctx: TutorialCtx): Boolean {
        val start = i
        var guard = 0
        while (guard++ < 40) {
            val s = step ?: break
            if (s.until?.invoke(ctx) == true) { praise = true; i = nextIndex(i + 1, ctx); continue }
            if (s.screen != null && s.screen != ctx.screen && !ctx.animating) {
                val j = TUTORIAL_STEPS.indices.firstOrNull { k -> k > i && TUTORIAL_STEPS[k].screen == ctx.screen }
                if (j != null && j > i) { i = nextIndex(j, ctx); continue }
            }
            break
        }
        return i != start
    }

    /** El juego avisa algo que pasó ("card:attack", "card:skill", "turn-end", "shop-buy", "seed-use", "tip:intent", "tip:rule"). */
    fun notify(evt: String, ctx: TutorialCtx): Boolean {
        flags.add(evt)
        return check(ctx)
    }

    /** ✕ o atrás: pregunta; con [answer] true se sale, con false se sigue. */
    fun toggleQuitAsk() { quitAsk = !quitAsk }

    fun allows(action: String): Boolean {
        val s = step ?: return false
        return !quitAsk && !s.next && action in s.allow
    }

    /** ¿Se puede jugar (o elegir) una carta de este tipo en el paso actual? */
    fun allowsCard(type: String?): Boolean {
        val s = step ?: return false
        if (!allows(TutAction.PLAY)) return false
        return s.cards == null || type == s.cards
    }

    fun spots(ctx: TutorialCtx): List<String> = step?.spots?.invoke(ctx).orEmpty()

    /** Lo que muestra el globo y se acaba. */
    val finished: Boolean get() = step == null
}

/** Datos de la pantalla final del tutorial (renderTutorialEnd). */
object TutorialEnd {
    /** (dibujo, nombre, qué aprendiste) */
    val learned = listOf(
        Triple("node_enemy", "Combates", "cartas, energía, intenciones y daño real"),
        Triple("ui_shield", "Cáscara", "se gasta antes que tu vida"),
        Triple("ui_bag", "Mochila", "objetos y semillas"),
        Triple("node_rest", "Campamento", "curarte, madurar o despegar"),
        Triple("node_mystery", "Misterios", "decisiones con premio o riesgo"),
        Triple("node_shop", "Tiendita", "cartas, objetos y semillas")
    )
    val tips = listOf(
        "Mantén el dedo sobre cualquier cosa para ver qué hace.",
        "Cada piso tiene su regla: léela al empezar el combate.",
        "Cada enemigo derrotado da experiencia para el <b>Pase de Batalla</b> (colores y accesorios para tus frutas).",
        "En la <b>Colección</b> del menú puedes repasar tus cartas, objetos, semillas y a cada enemigo que conozcas.",
        "Un mazo pequeño y bien madurado suele ganarle a uno grande."
    )
    const val OUTRO = "En una partida de verdad hay <b>3 castillos de 3 pisos</b>, con jefes guardianes, mesas de juegos y muchas sorpresas. ¡Sube la torre y rescata al Rey Fruta!"
}
