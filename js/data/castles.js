// ============================================================
// CASTLES.JS — Los 3 castillos de la historia y los pisos de cada uno.
//
// Historia: los enemigos secuestraron a las frutas y las encerraron en
// jaulas en 3 castillos, cada uno más grande y más peligroso que el
// anterior. El Rey Fruta espera en lo más alto de la tercera torre.
//
// Cada castillo tiene 3 pisos (cada piso es un mapa). Cada piso tiene un
// TEMA (FLOOR_THEMES) con sus propios enemigos, élites y jefes guardianes.
// El último piso de cada castillo termina con el jefe del castillo.
// Al empezar una partida se sortea el plan de pisos (planRun), así que
// cada run es distinta: el orden y los temas de los pisos cambian.
//
// Para agregar un tema: registerTheme({...}) y ponlo en el `pool` (o en
// `fixed`) de algún castillo.
// ============================================================

window.FLOOR_THEMES = {};
window.registerTheme = function (def) {
    window.FLOOR_THEMES[def.id] = Object.assign({ games: 1, gameKind: null, variant: null, elites: [], bosses: [], deco: [] }, def);
};

(function () {
    const A = window.ACTS; // grupos que ya definen enemies.js y enemies_extra.js

    // =========================================================
    // CASTILLO 1 — EL HUERTO (bichos y plantas)
    // =========================================================
    registerTheme({
        id: 'huerto', castle: 1, name: 'El Huerto', subtitle: 'Donde los bichos se comen la fruta caída', icon: '🌳',
        weak: A[0].weak, normal: A[0].normal, elites: [['cuervo_ladron'], ['topo_excavador'], ['escarabajo_gordo']],
        bosses: ['avispon_capitan'], deco: ['🌱', '🌼', '🍃', '🪨', '🌿'], variant: 'open'
    });
    registerTheme({
        id: 'gallinero', castle: 1, name: 'El Gallinero', subtitle: 'Plumas, huevos y un zorro con mala pinta', icon: '🐔',
        weak: [['gallina_clueca'], ['pollito_furioso', 'pollito_furioso'], ['zorro_astuto'], ['cuervo_joven', 'cuervo_joven'], ['mosca_podrida']],
        normal: [['gallina_clueca', 'pollito_furioso'], ['zorro_astuto', 'cuervo_joven'], ['gallina_clueca', 'zorro_astuto'],
            ['pollito_furioso', 'pollito_furioso', 'pollito_furioso'], ['cucaracha_blindada', 'cuervo_joven'], ['mango_zombie']],
        elites: [['gallo_vigia'], ['cuervo_ladron']], bosses: ['espantapajaros'], deco: ['🪶', '🥚', '🌾', '🪵'], variant: 'classic'
    });
    registerTheme({
        id: 'estanque', castle: 1, name: 'El Estanque Turbio', subtitle: 'Ranas, mosquitos y aguas poco recomendables', icon: '🪷',
        weak: [['rana_toxica'], ['mosquito_tigre', 'mosquito_tigre'], ['pez_globo'], ['cangrejo_pinza']],
        normal: [['rana_toxica', 'mosquito_tigre'], ['pez_globo', 'pez_globo'], ['cangrejo_pinza', 'mosquito_tigre'], ['rana_toxica', 'pez_globo'],
            ['mosquito_tigre', 'mosquito_tigre', 'mosquito_tigre'], ['cangrejo_pinza', 'rana_toxica'], ['babosa_grande']],
        elites: [['sapo_gigante'], ['topo_excavador']], bosses: ['lucio_gigante'], deco: ['🪷', '💧', '🐚', '🌊'], variant: 'rivers'
    });
    registerTheme({
        id: 'invernadero', castle: 1, name: 'El Invernadero', subtitle: 'Plantas hambrientas detrás del cristal', icon: '🪴',
        weak: [['planta_carnivora'], ['enredadera'], ['polen_furioso', 'polen_furioso'], ['girasol_soldado'], ['hongo_venenoso']],
        normal: [['planta_carnivora', 'polen_furioso'], ['enredadera', 'girasol_soldado'], ['enredadera', 'polen_furioso', 'polen_furioso'],
            ['girasol_soldado', 'planta_carnivora'], ['hongo_venenoso', 'enredadera'], ['semilla_bomba', 'semilla_bomba', 'polen_furioso']],
        elites: [['orquidea_letal'], ['escarabajo_gordo']], bosses: ['rosa_reina'], deco: ['🌺', '🌻', '🌿', '🍄'], variant: 'maze'
    });
    registerTheme({
        id: 'bodega', castle: 1, name: 'La Bodega Húmeda', subtitle: 'Barriles, murciélagos y algo que fermenta', icon: '🍷',
        weak: [['barril_rodante'], ['murcielago', 'murcielago'], ['arana_bodeguera'], ['moho_viscoso'], ['gusano_venenoso']],
        normal: [['barril_rodante', 'murcielago'], ['arana_bodeguera', 'murcielago'], ['moho_viscoso', 'arana_bodeguera'], ['barril_rodante', 'barril_rodante'],
            ['murcielago', 'murcielago', 'murcielago'], ['ciruela_podrida', 'moho_viscoso']],
        elites: [['tonel_maldito'], ['topo_excavador']], bosses: ['sommelier_fantasma'], deco: ['🕸️', '🍷', '🪨', '🦇'], variant: 'maze'
    });

    // =========================================================
    // CASTILLO 2 — EL AZAR (juegos de mesa)
    // =========================================================
    registerTheme({
        id: 'dados', castle: 2, name: 'La Sala de los Dados', subtitle: 'Aquí todo depende de una tirada', icon: '🎲',
        weak: [['dado_pequeno', 'dado_pequeno'], ['dado_travieso'], ['ficha_dorada'], ['cubilete_saltarin']],
        normal: [['dado_travieso', 'dado_pequeno'], ['dado_cargado'], ['ficha_dorada', 'dado_travieso'], ['cubilete_saltarin', 'dado_travieso'],
            ['dado_cargado', 'dado_pequeno', 'dado_pequeno'], ['ficha_dorada', 'ficha_dorada']],
        elites: [['gran_dado'], ['pina_espinosa']], bosses: ['cubilete_maldito'], games: 3, gameKind: 'dice', deco: ['🎲', '🪙', '⚀', '⚅'], variant: 'open'
    });
    registerTheme({
        id: 'poker', castle: 2, name: 'El Salón de Póker', subtitle: 'Cartas marcadas y sonrisas falsas', icon: '🃏',
        weak: [['as_espadas'], ['joker'], ['diamante_afilado'], ['trebol_tramposo']],
        normal: [['as_espadas', 'diamante_afilado'], ['joker', 'trebol_tramposo'], ['rey_corazones'], ['trebol_tramposo', 'diamante_afilado', 'as_espadas'],
            ['rey_corazones', 'joker'], ['as_espadas', 'joker']],
        elites: [['flor_imperial'], ['fresa_vengativa']], bosses: ['crupier_marcado'], games: 3, gameKind: 'poker', deco: ['♠️', '♥️', '♦️', '♣️', '🃏'], variant: 'classic'
    });
    registerTheme({
        id: 'ajedrez', castle: 2, name: 'La Torre de Ajedrez', subtitle: 'Cada casilla es una decisión', icon: '♟️',
        weak: [['peon_negro', 'peon_negro'], ['peon_negro'], ['caballo_negro'], ['alfil_negro']],
        normal: [['caballo_negro', 'peon_negro'], ['alfil_negro', 'peon_negro', 'peon_negro'], ['torre_negra'], ['caballo_negro', 'alfil_negro'],
            ['torre_negra', 'peon_negro'], ['peon_negro', 'peon_negro', 'peon_negro']],
        elites: [['reina_negra']], bosses: ['rey_ajedrez'], games: 3, gameKind: 'chess', deco: ['♟️', '♜', '♞', '♝', '♛'], variant: 'maze'
    });

    // =========================================================
    // CASTILLO 3 — LA TORRE DEL REY (cocinas, fábrica y guardia real)
    // =========================================================
    registerTheme({
        id: 'mercado', castle: 3, name: 'El Mercado Negro', subtitle: 'Ratas, cuchillos y gente muy hambrienta', icon: '🧺',
        weak: A[1].weak, normal: A[1].normal, elites: A[1].elites, bosses: ['rey_raton', 'reloj_cocina'], deco: ['🧺', '🥖', '🐀', '🕯️'], variant: 'classic'
    });
    registerTheme({
        id: 'cocina', castle: 3, name: 'La Cocina Infernal', subtitle: 'Todo lo que corta, pincha o hierve', icon: '🍳',
        weak: [['tenedor_gloton'], ['pelador_oxidado'], ['vela_cera'], ['gelatina_temblorosa']],
        normal: [['tenedor_gloton', 'tenedor_gloton'], ['pelador_oxidado', 'tenedor_gloton'], ['vela_cera', 'vela_cera'],
            ['gelatina_temblorosa', 'hormiga_obrera', 'hormiga_obrera'], ['pelador_oxidado', 'vela_cera'], ['tostadora_saltarina']],
        elites: [['cuchillo_carnicero'], ['rallador_furioso'], ['cafetera_rabiosa']], bosses: ['chef_cuchilla', 'reloj_cocina'],
        deco: ['🍳', '🔪', '🥄', '🔥'], variant: 'rivers'
    });
    registerTheme({
        id: 'fabrica', castle: 3, name: 'La Fábrica de Jugos', subtitle: 'Aquí termina toda fruta… o no', icon: '🏭',
        weak: A[2].weak, normal: A[2].normal, elites: A[2].elites, bosses: ['robot_gigante'], deco: ['⚙️', '🔩', '🧃', '🏭'], variant: 'maze'
    });
    registerTheme({
        id: 'torre_rey', castle: 3, name: 'La Torre del Rey', subtitle: 'En lo más alto espera el Rey Fruta', icon: '👑',
        weak: [['caballero_cuchillas'], ['bufon_explosivo', 'bufon_explosivo'], ['guardia_hielo'], ['mayordomo_batidor']],
        normal: [['caballero_cuchillas', 'mayordomo_batidor'], ['guardia_hielo', 'bufon_explosivo'], ['caballero_cuchillas', 'caballero_cuchillas'],
            ['mayordomo_batidor', 'guardia_hielo'], ['exprimidor_mecanico', 'caballero_cuchillas'], ['bufon_explosivo', 'bufon_explosivo', 'tapa_saltarina'],
            ['robot_limpiador', 'guardia_hielo']],
        elites: [['capitan_guardia'], ['verdugo_jugo'], ['cortadora_industrial']], bosses: [], games: 2, deco: ['👑', '⚔️', '🕯️', '🏰'], variant: 'classic'
    });

    // =========================================================
    // LOS CASTILLOS
    //   sizes: [cols, rows] de cada uno de sus 3 pisos (crecen con el castillo)
    //   pool / pick / last: temas posibles, cuántos se sortean y cuál va siempre al final
    //   fixed: temas obligatorios (shuffle → en orden al azar)
    //   bosses: posibles jefes del castillo (último piso)
    // =========================================================
    window.CASTLES = [
        {
            n: 1, id: 'huerto', name: 'Castillo del Huerto', subtitle: 'Un castillito de piedra, plantas trepadoras y bichos por todos lados',
            icon: '🏰', sprite: 'castle_1', sizes: [[9, 5], [10, 5], [11, 6]],
            pool: ['huerto', 'gallinero', 'estanque', 'invernadero', 'bodega'],
            bosses: ['oruga_reina', 'babosa_madre', 'hongo_rey'],
            story: 'Los bichos del huerto llevaron a las frutas a su castillo. ¡Hay que abrirse paso piso por piso!'
        },
        {
            n: 2, id: 'azar', name: 'Castillo del Azar', subtitle: 'Un castillo enorme donde todo es un juego… y siempre gana la casa',
            icon: '🎰', sprite: 'castle_2', sizes: [[11, 6], [12, 6], [13, 7]],
            fixed: ['dados', 'poker', 'ajedrez'], shuffle: true,
            bosses: ['rey_azar', 'dama_suerte', 'gran_maestro'],
            story: 'Las frutas fueron trasladadas al castillo del azar: dados, cartas y ajedrez. ¡Que no te tomen el pelo!'
        },
        {
            n: 3, id: 'torre', name: 'La Torre del Rey', subtitle: 'La torre más alta y peligrosa. Allí espera el Rey Fruta',
            icon: '🏯', sprite: 'castle_3', sizes: [[13, 7], [14, 7], [15, 8]],
            pool: ['mercado', 'cocina', 'fabrica'], pick: 2, last: 'torre_rey',
            bosses: ['licuadora_suprema', 'horno_infernal', 'maquina_expendedora'],
            story: 'La torre final: el Rey Fruta está prisionero en lo más alto. ¡Sube y rescátalo!'
        }
    ];
    window.FLOORS_PER_CASTLE = 3;

    const shuffled = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // Sortea los temas de los 9 pisos de una partida: [[t1,t2,t3], [..], [..]]
    window.planRun = function () {
        return window.CASTLES.map((c) => {
            if (c.fixed) return c.shuffle ? shuffled(c.fixed) : c.fixed.slice();
            const ids = shuffled(c.pool).slice(0, c.last ? (c.pick || 2) : window.FLOORS_PER_CASTLE);
            if (c.last) ids.push(c.last);
            return ids;
        });
    };
    // Comprueba que un plan guardado sirve (partidas viejas o dañadas)
    window.planIsValid = function (plan) {
        return Array.isArray(plan) && plan.length === window.CASTLES.length
            && plan.every((row) => Array.isArray(row) && row.length === window.FLOORS_PER_CASTLE && row.every((id) => window.FLOOR_THEMES[id]));
    };
    window.floorThemeId = function (plan, castleN, floor) {
        const row = (plan && plan[castleN - 1]) || [];
        return row[floor - 1] || (window.CASTLES[castleN - 1].fixed || window.CASTLES[castleN - 1].pool)[floor - 1] || 'huerto';
    };
    window.floorSize = function (castleN, floor) {
        const c = window.CASTLES[castleN - 1] || window.CASTLES[0];
        const [cols, rows] = c.sizes[Math.min(c.sizes.length, Math.max(1, floor)) - 1];
        return { cols, rows };
    };

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    // Jefe del piso: los pisos 1 y 2 tienen un guardián del tema; el último, el jefe del castillo
    window.pickBoss = function (castleN, floor, themeId) {
        const castle = window.CASTLES[castleN - 1] || window.CASTLES[0];
        const theme = window.FLOOR_THEMES[themeId];
        if (floor < window.FLOORS_PER_CASTLE && theme && theme.bosses.length) return pick(theme.bosses);
        return pick(castle.bosses);
    };
    // Grupo de enemigos para una casilla. kind: 'enemy' | 'elite' | 'boss'.
    // progress: 0 (inicio del mapa) a 1 (junto al jefe): al principio salen los más débiles.
    window.pickEncounter = function (castleN, progress, kind, bossId, themeId) {
        const castle = window.CASTLES[castleN - 1] || window.CASTLES[0];
        const theme = window.FLOOR_THEMES[themeId] || window.FLOOR_THEMES[(castle.fixed || castle.pool)[0]];
        if (kind === 'boss') return [bossId || pick(castle.bosses)];
        if (kind === 'elite') return [...pick(theme.elites.length ? theme.elites : window.FLOOR_THEMES.huerto.elites)];
        return [...pick(progress <= 0.3 ? theme.weak : theme.normal)];
    };
})();
