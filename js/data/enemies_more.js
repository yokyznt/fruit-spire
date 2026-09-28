// ============================================================
// ENEMIES_MORE.JS — Más enemigos, cada uno con una mecánica nueva
// (ver js/data/statuses.js y js/engine/combat.js):
//   taunt (Provocación)  tus golpes a un solo objetivo van contra él
//   rage (Rabia)         cada golpe que le quita vida le da Madurez
//   shell (Caparazón)    su cáscara no se pierde entre turnos
//   drained (Agotamiento) en una jugada: te quita energía el próximo turno
//   stealCard (jugada)   te roba cartas de la pila de robo; vuelven al derrotarlo
//   breed (Plaga)        tiene crías (def.breedInto) al final de su turno
//   ghost (Intangible)   los primeros golpes no le hacen daño
// Al final se suman a los grupos de cada piso.
// ============================================================

(function () {
    const cycle = (list) => (e) => list[e.turns % list.length];

    // ---------- Gallinero ----------
    registerEnemy({
        id: 'pavo_guardian', name: 'Pavo Guardián', icon: '🦃', hpMin: 30, hpMax: 34, idle: 'sway', start: { taunt: 1, plated: 2 },
        moves: [
            { id: 'abanico', name: 'Abanico Protector', block: 8, allyBlock: 5, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'picotazo_pavo', name: 'Picotazo', damage: 7, weight: 2, anim: 'bite', fx: 'bite' }
        ]
    });

    // ---------- Estanque ----------
    registerEnemy({
        id: 'tortuga_escudo', name: 'Tortuga Escudo', icon: '🐢', hpMin: 26, hpMax: 30, idle: 'crawl', start: { shell: 1 },
        moves: [
            { id: 'meterse', name: 'Meterse al Caparazón', block: 9, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'mordisco_tortuga', name: 'Mordisco Lento', damage: 8, weight: 2, anim: 'bite', fx: 'bite' }
        ]
    });
    registerEnemy({
        id: 'sanguijuela', name: 'Sanguijuela', icon: '🪱', hpMin: 18, hpMax: 22, idle: 'wobble',
        moves: [
            { id: 'chupar_energia', name: 'Chupar Energía', damage: 4, drain: true, apply: { drained: 1 }, weight: 1, noRepeat: true, anim: 'bite', fx: 'drain' },
            { id: 'ventosa', name: 'Ventosa', damage: 6, drain: true, weight: 2, anim: 'lunge', fx: 'drain' }
        ]
    });

    // ---------- Invernadero ----------
    registerEnemy({
        id: 'caracolito', name: 'Caracolito', icon: '🐌', hpMin: 8, hpMax: 10, idle: 'crawl',
        moves: [
            { id: 'babita', name: 'Babita', damage: 3, weight: 2, anim: 'spit', fx: 'splat' },
            { id: 'esconderse', name: 'Esconderse', block: 4, weight: 1, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'caracol_plaga', name: 'Caracola Madre', icon: '🐌', hpMin: 26, hpMax: 30, idle: 'crawl', start: { breed: 2 }, breedInto: 'caracolito',
        moves: [
            { id: 'rastro', name: 'Rastro Pegajoso', damage: 4, apply: { sticky: 1 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'cabezazo_caracol', name: 'Cabezazo', damage: 7, weight: 2, anim: 'lunge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'cactus_rabioso', name: 'Cactus Rabioso', icon: '🌵', hpMin: 28, hpMax: 32, idle: 'rumble', start: { rage: 1, thorns: 2 },
        moves: [
            { id: 'espinazo', name: 'Espinazo', damage: 7, weight: 2, anim: 'lunge', fx: 'sting' },
            { id: 'erizarse_cactus', name: 'Erizarse', self: { thorns: 1 }, block: 6, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });

    // ---------- Bodega ----------
    registerEnemy({
        id: 'fantasma_bodega', name: 'Fantasma Encadenado', icon: '👻', hpMin: 20, hpMax: 24, idle: 'float', start: { ghost: 2 },
        moves: [
            { id: 'susto_fantasma', name: '¡Buuu!', apply: { weak: 2 }, damage: 3, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' },
            { id: 'atravesar', name: 'Atravesar', damage: 8, weight: 2, anim: 'swoop', fx: 'claw' },
            { id: 'desvanecerse', name: 'Desvanecerse', self: { ghost: 1 }, weight: 1, noRepeat: true, anim: 'cast' }
        ]
    });

    // ---------- Dados y Póker ----------
    registerEnemy({
        id: 'urraca_tahur', name: 'Urraca Tahúr', icon: '🐦', hpMin: 26, hpMax: 30, idle: 'flap',
        ai: (e) => (e.turns === 0 ? 'birlar_carta' : null),
        moves: [
            { id: 'birlar_carta', name: 'Birlar Carta', damage: 4, stealCard: 1, weight: 1, anim: 'swoop', fx: 'steal' },
            { id: 'picotazo_urraca', name: 'Picotazo', damage: 7, weight: 2, anim: 'swoop', fx: 'claw' },
            { id: 'brillo_urraca', name: 'Algo Brillante', damage: 3, stealGold: 10, weight: 1, noRepeat: true, anim: 'swoop', fx: 'steal' }
        ]
    });
    registerEnemy({
        id: 'mano_tramposa', name: 'Mano Tramposa', icon: '🧤', hpMin: 24, hpMax: 28, idle: 'sway',
        ai: (e) => (e.turns % 3 === 0 ? 'manga' : null),
        moves: [
            { id: 'manga', name: 'Carta en la Manga', stealCard: 1, block: 6, weight: 0.01, anim: 'cast' },
            { id: 'bofetada', name: 'Bofetada', damage: 8, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'truco_mano', name: 'Truco', damage: 3, addCard: { id: 'carta_marcada', n: 1, to: 'discard' }, weight: 1, anim: 'cast', fx: 'seeds' }
        ]
    });

    // ---------- Ajedrez ----------
    registerEnemy({
        id: 'peon_escudero', name: 'Peón Escudero', icon: '♟️', hpMin: 30, hpMax: 34, idle: 'hop', start: { taunt: 1, shell: 1 },
        moves: [
            { id: 'escudo_peon', name: 'Levantar Escudo', block: 8, allyBlock: 4, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'embestida_peon', name: 'Embestida', damage: 7, weight: 2, anim: 'charge', fx: 'shock' }
        ]
    });

    // ---------- Mercado ----------
    registerEnemy({
        id: 'raton_cria', name: 'Ratoncito', icon: '🐭', sprite: 'raton_cria', hpMin: 8, hpMax: 10, idle: 'scuttle',
        moves: [
            { id: 'mordidita', name: 'Mordidita', damage: 3, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'chillidito', name: 'Chillidito', apply: { weak: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'rata_plaga', name: 'Rata Plaga', icon: '🐀', hpMin: 22, hpMax: 26, idle: 'scuttle', start: { breed: 2 }, breedInto: 'raton_cria',
        moves: [
            { id: 'mordisco_plaga', name: 'Mordisco Sucio', damage: 5, apply: { poison: 2 }, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'roer_plaga', name: 'Roer', damage: 8, weight: 1, anim: 'bite', fx: 'bite' }
        ]
    });
    registerEnemy({
        id: 'reina_hormiga', name: 'Reina Hormiga', icon: '🐜', hpMin: 82, hpMax: 90, tier: 'elite', idle: 'sway', start: { breed: 3, shell: 1 }, breedInto: 'hormiga_obrera',
        ai: cycle(['ordenar', 'mandibulas', 'feromonas']),
        moves: [
            { id: 'ordenar', name: '¡A trabajar!', allies: { strength: 1 }, block: 10, anim: 'cast' },
            { id: 'mandibulas', name: 'Mandíbulas Reales', damage: 13, anim: 'bite', fx: 'bite' },
            { id: 'feromonas', name: 'Feromonas', apply: { weak: 1, drained: 1 }, damage: 5, anim: 'spit', fx: 'splat' }
        ]
    });

    // ---------- Cocina y Fábrica ----------
    registerEnemy({
        id: 'enchufe_chupon', name: 'Enchufe Chupón', icon: '🔌', hpMin: 30, hpMax: 34, idle: 'rumble',
        moves: [
            { id: 'descarga', name: 'Descarga', damage: 6, apply: { drained: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' },
            { id: 'chispazo_enchufe', name: 'Chispazo', damage: 9, weight: 2, anim: 'lunge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'olla_rabiosa', name: 'Olla Exprés', icon: '🍲', hpMin: 36, hpMax: 40, idle: 'rumble', start: { rage: 2 },
        moves: [
            { id: 'silbido', name: 'Silbido', damage: 5, hits: 2, weight: 2, anim: 'shake', fx: 'burst' },
            { id: 'tapa_olla', name: 'Tapa Apretada', block: 10, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'robot_escudo', name: 'Robot Escudo', icon: '🤖', hpMin: 44, hpMax: 50, idle: 'rumble', start: { taunt: 1, shell: 1 },
        moves: [
            { id: 'barrera', name: 'Barrera', block: 12, allyBlock: 6, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'golpe_escudo', name: 'Golpe de Escudo', damage: 10, weight: 2, anim: 'charge', fx: 'shock' }
        ]
    });

    // ---------- Torre del Rey ----------
    registerEnemy({
        id: 'caballero_espejo', name: 'Caballero Espejo', icon: '🪞', hpMin: 112, hpMax: 120, tier: 'elite', idle: 'sway', start: { taunt: 1, reflect: 1, plated: 4 },
        ai: cycle(['pulir', 'estocada_espejo', 'destello']),
        moves: [
            { id: 'pulir', name: 'Pulir el Espejo', self: { reflect: 1 }, block: 14, anim: 'guard' },
            { id: 'estocada_espejo', name: 'Estocada', damage: 9, hits: 2, anim: 'lunge', fx: 'slash' },
            { id: 'destello', name: 'Destello', damage: 16, apply: { weak: 1 }, anim: 'cast', fx: 'burst' }
        ]
    });

    // =========================================================
    // Se suman a los grupos de cada piso
    // =========================================================
    const T = window.FLOOR_THEMES;
    const add = (id, key, groups) => { T[id][key].push(...groups); };
    add('gallinero', 'weak', [['pavo_guardian']]);
    add('gallinero', 'normal', [['pavo_guardian', 'pollito_furioso'], ['pavo_guardian', 'zorro_astuto']]);
    add('estanque', 'weak', [['tortuga_escudo'], ['sanguijuela', 'sanguijuela']]);
    add('estanque', 'normal', [['tortuga_escudo', 'rana_toxica'], ['sanguijuela', 'cangrejo_pinza']]);
    add('invernadero', 'weak', [['caracol_plaga'], ['cactus_rabioso']]);
    add('invernadero', 'normal', [['cactus_rabioso', 'polen_furioso'], ['caracol_plaga', 'enredadera']]);
    add('bodega', 'weak', [['fantasma_bodega']]);
    add('bodega', 'normal', [['fantasma_bodega', 'murcielago'], ['fantasma_bodega', 'barril_rodante']]);
    add('huerto', 'normal', [['cactus_rabioso'], ['caracol_plaga']]);
    add('dados', 'weak', [['urraca_tahur']]);
    add('dados', 'normal', [['urraca_tahur', 'dado_travieso']]);
    add('poker', 'weak', [['mano_tramposa']]);
    add('poker', 'normal', [['mano_tramposa', 'as_espadas'], ['mano_tramposa', 'rey_corazones']]);
    add('ajedrez', 'weak', [['peon_escudero']]);
    add('ajedrez', 'normal', [['peon_escudero', 'alfil_negro'], ['peon_escudero', 'caballo_negro']]);
    add('mercado', 'normal', [['rata_plaga', 'hormiga_obrera'], ['rata_plaga']]);
    add('mercado', 'elites', [['reina_hormiga']]);
    add('cocina', 'weak', [['enchufe_chupon'], ['olla_rabiosa']]);
    add('cocina', 'normal', [['olla_rabiosa', 'tenedor_gloton'], ['enchufe_chupon', 'pelador_oxidado']]);
    add('fabrica', 'normal', [['robot_escudo', 'exprimidor_mecanico'], ['enchufe_chupon', 'batidora_mano']]);
    add('torre_rey', 'normal', [['robot_escudo', 'caballero_cuchillas'], ['olla_rabiosa', 'guardia_hielo']]);
    add('torre_rey', 'elites', [['caballero_espejo']]);
})();
