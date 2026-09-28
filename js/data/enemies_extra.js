// ============================================================
// ENEMIES_EXTRA.JS — Enemigos y jefes con mecánicas especiales.
// Las mecánicas se ponen como estados iniciales en `start` y se ven
// como chips en la ficha del enemigo (ver js/data/statuses.js):
//   curl (Enroscado), wax (Cera), jelly (Gelatina), malleable (Pulpa
//   Blanda), fuse (Mecha, con `explode` = daño), split (Divisible, con
//   `splitInto`), minion (Esbirro: huye si muere un `leader`), clock
//   (Temporizador, con `clockEvery`), cap (Coraza Dura), beat (Latido),
//   regrow (Rebrote), spores (Esporas), enrage (Enfado), reflect
//   (Espejo: el perjuicio que le mandas rebota hacia ti).
// En una jugada, `drain: true` hace que el enemigo se cure por el
// daño que te quitó ese golpe (vampírico).
// Cada nivel elige al azar uno de sus jefes (ver `bosses` en ACTS).
// ============================================================

(function () {
    const cycle = (list) => (e) => list[e.turns % list.length];

    // =========================================================
    // NIVEL 1 — EL HUERTO
    // =========================================================
    registerEnemy({
        id: 'bicho_bolita', name: 'Bicho Bolita', icon: '🐞', hpMin: 20, hpMax: 24, idle: 'scuttle', start: { curl: 7 },
        moves: [
            { id: 'rodar', name: 'Rodar', damage: 6, weight: 2, anim: 'spin', fx: 'shock' },
            { id: 'patitas', name: 'Patitas Filosas', damage: 3, hits: 2, weight: 1, anim: 'bite', fx: 'claw' }
        ]
    });
    registerEnemy({
        id: 'hongo_venenoso', name: 'Hongo Venenoso', icon: '🍄', hpMin: 22, hpMax: 26, idle: 'wobble', start: { spores: 2 },
        moves: [
            { id: 'soplo', name: 'Soplo de Esporas', apply: { poison: 4 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'cabezazo', name: 'Cabezazo', damage: 8, weight: 2, anim: 'lunge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'semilla_bomba', name: 'Semilla Bomba', icon: '💣', hpMin: 14, hpMax: 17, idle: 'rumble', start: { fuse: 3 }, explode: 18,
        moves: [
            { id: 'chispa', name: 'Chispazo', damage: 3, weight: 1, anim: 'shake', fx: 'burst' },
            { id: 'engordar', name: 'Engordar', block: 5, weight: 1, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'babosa_grande', name: 'Babosa Grande', icon: '🐌', sprite: 'babosa_viscosa', hpMin: 30, hpMax: 34, idle: 'wobble',
        moves: [
            { id: 'lodo', name: 'Lodo Pegajoso', damage: 6, apply: { sticky: 1 }, weight: 2, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'aplastar', name: 'Aplastar', damage: 10, weight: 2, anim: 'slam', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'hongo_esbirro', name: 'Hongo Esbirro', icon: '🍄', sprite: 'hongo_venenoso', hpMin: 10, hpMax: 13, idle: 'hop', start: { minion: 1 },
        moves: [
            { id: 'mordisquito', name: 'Mordisquito', damage: 4, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'esporitas', name: 'Esporitas', apply: { poison: 2 }, weight: 1, anim: 'spit', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'escarabajo_gordo', name: 'Escarabajo Gordo', icon: '🪲', hpMin: 74, hpMax: 80, tier: 'elite', idle: 'scuttle',
        ai: (e) => (e.turns === 0 ? 'rugido' : null),
        moves: [
            { id: 'rugido', name: 'Rugido', self: { enrage: 2 }, once: true, weight: 0.01, anim: 'shake', fx: 'shock' },
            { id: 'embestida', name: 'Embestida', damage: 13, weight: 2, anim: 'charge', fx: 'shock' },
            { id: 'cuernazo', name: 'Cuernazo', damage: 7, apply: { vulnerable: 2 }, weight: 1, anim: 'lunge', fx: 'claw' }
        ]
    });
    registerEnemy({
        id: 'babosa_madre', name: 'Babosa Madre', icon: '🐌', hpMin: 96, hpMax: 100, tier: 'boss', idle: 'wobble',
        start: { split: 1 }, splitInto: 'babosa_grande',
        ai: cycle(['charco', 'impulso', 'aplaston_gigante']),
        moves: [
            { id: 'charco', name: 'Charco Pegajoso', addCard: { id: 'pulpa_aplastada', n: 3, to: 'discard' }, apply: { sticky: 1 }, anim: 'spit', fx: 'splat' },
            { id: 'impulso', name: 'Tomar Impulso', block: 12, anim: 'guard' },
            { id: 'aplaston_gigante', name: 'Aplastón Gigante', damage: 26, anim: 'slam', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'hongo_rey', name: 'Rey Champiñón', icon: '🍄', hpMin: 94, hpMax: 100, tier: 'boss', idle: 'sway', leader: true, start: { spores: 2 },
        ai: (e, c) => {
            let id = ['lluvia_esporas', 'sombrero_blando', 'cabezazo_real', 'llamar_hongos'][e.turns % 4];
            if (id === 'llamar_hongos' && c.aliveEnemies().length >= 3) id = 'cabezazo_real';
            return id;
        },
        moves: [
            { id: 'lluvia_esporas', name: 'Lluvia de Esporas', damage: 4, apply: { poison: 3, weak: 1 }, anim: 'shake', fx: 'splat' },
            { id: 'sombrero_blando', name: 'Sombrero Blandito', self: { jelly: 2 }, block: 8, anim: 'guard' },
            { id: 'cabezazo_real', name: 'Cabezazo Real', damage: 14, anim: 'charge', fx: 'shock' },
            { id: 'llamar_hongos', name: '¡Brotad, hongos!', summon: ['hongo_esbirro', 'hongo_esbirro'], anim: 'cast' }
        ]
    });

    registerEnemy({
        id: 'limon_rencoroso', name: 'Limón Rencoroso', icon: '🍋', hpMin: 23, hpMax: 27, idle: 'sway',
        moves: [
            { id: 'mueca_agria', name: 'Mueca Agria', self: { reflect: 1 }, block: 6, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'exprimido', name: 'Exprimido Doloroso', damage: 7, apply: { weak: 1 }, weight: 2, anim: 'spit', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'ciruela_podrida', name: 'Ciruela Podrida', icon: '🟣', hpMin: 25, hpMax: 29, idle: 'wobble',
        moves: [
            { id: 'mordisco_podrido', name: 'Mordisco Podrido', damage: 6, apply: { poison: 3 }, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'fermentar', name: 'Fermentar', self: { regen: 3 }, block: 4, weight: 1, noRepeat: true, anim: 'cast' }
        ]
    });

    // =========================================================
    // NIVEL 2 — EL MERCADO
    // =========================================================
    registerEnemy({
        id: 'vela_cera', name: 'Vela de Cera', icon: '🕯️', hpMin: 26, hpMax: 30, idle: 'sway', start: { wax: 2 },
        moves: [
            { id: 'gota_ardiente', name: 'Gota Ardiente', damage: 6, addCard: { id: 'jugo_hirviendo', n: 1, to: 'discard' }, weight: 2, anim: 'spit', fx: 'splat' },
            { id: 'derretirse', name: 'Derretirse', heal: 6, block: 5, self: { wax: 1 }, weight: 1, noRepeat: true, anim: 'heal' }
        ]
    });
    registerEnemy({
        id: 'gelatina_temblorosa', name: 'Gelatina Temblorosa', icon: '🍮', hpMin: 32, hpMax: 36, idle: 'wobble', start: { malleable: 3 },
        moves: [
            { id: 'temblor', name: 'Temblor', damage: 5, hits: 2, weight: 2, anim: 'shake', fx: 'shock' },
            { id: 'cuajar', name: 'Cuajar', self: { jelly: 2 }, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'rata_esbirro', name: 'Rata Esbirro', icon: '🐀', sprite: 'rata_mercado', hpMin: 12, hpMax: 15, idle: 'scuttle', start: { minion: 1 },
        moves: [
            { id: 'mordida', name: 'Mordida', damage: 5, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'robar_migas', name: 'Robar Migas', damage: 3, stealGold: 6, weight: 1, anim: 'swoop', fx: 'steal' }
        ]
    });
    registerEnemy({
        id: 'gato_callejero', name: 'Gato Callejero', icon: '🐈', hpMin: 62, hpMax: 68, tier: 'elite', idle: 'sway', start: { regrow: 1 },
        moves: [
            { id: 'zarpazos', name: 'Zarpazos', damage: 5, hits: 3, weight: 2, anim: 'swoop', fx: 'claw' },
            { id: 'bufido', name: 'Bufido', apply: { weak: 2, vulnerable: 2 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' },
            { id: 'lamerse', name: 'Lamerse', block: 12, self: { strength: 2 }, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'reloj_cocina', name: 'Reloj de Cocina', icon: '⏲️', hpMin: 150, hpMax: 156, tier: 'boss', idle: 'rumble', start: { clock: 12 }, clockEvery: 12,
        ai: (e) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'reiniciar'; }
            return ['tic_tac', 'alarma', 'hervor'][e.turns % 3];
        },
        moves: [
            { id: 'tic_tac', name: 'Tic-Tac', damage: 7, hits: 2, anim: 'shake', fx: 'claw' },
            { id: 'alarma', name: '¡Alarma!', apply: { sticky: 2, frail: 2 }, block: 10, anim: 'shake', fx: 'shock' },
            { id: 'hervor', name: 'Hervor', damage: 18, anim: 'charge', fx: 'burst' },
            { id: 'reiniciar', name: 'Reiniciar', heal: 25, apply: { weak: 2 }, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'rey_raton', name: 'Rey de las Ratas', icon: '👑', hpMin: 150, hpMax: 158, tier: 'boss', idle: 'scuttle', leader: true,
        ai: (e, c) => {
            let id = ['llamar_ratas', 'corona_robada', 'mordisco_rey', 'saqueo'][e.turns % 4];
            if (id === 'llamar_ratas' && c.aliveEnemies().length >= 3) id = 'mordisco_rey';
            return id;
        },
        moves: [
            { id: 'llamar_ratas', name: '¡Ratas, a mí!', summon: ['rata_esbirro', 'rata_esbirro'], block: 8, anim: 'cast' },
            { id: 'corona_robada', name: 'Corona Robada', damage: 10, stealGold: 20, anim: 'swoop', fx: 'steal' },
            { id: 'mordisco_rey', name: 'Mordisco Real', damage: 18, anim: 'bite', fx: 'bite' },
            { id: 'saqueo', name: 'Saqueo', allies: { strength: 2 }, apply: { vulnerable: 2 }, anim: 'shake', fx: 'shock' }
        ]
    });

    registerEnemy({
        id: 'pina_espinosa', name: 'Piña Espinosa', icon: '🍍', hpMin: 70, hpMax: 76, tier: 'elite', idle: 'rumble',
        moves: [
            { id: 'erizarse', name: 'Erizarse', self: { thorns: 4 }, block: 14, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'embestida_punzante', name: 'Embestida Punzante', damage: 16, weight: 2, anim: 'charge', fx: 'shock' },
            { id: 'corona_filosa', name: 'Corona Filosa', damage: 8, hits: 2, apply: { vulnerable: 1 }, weight: 1, anim: 'slash', fx: 'slash' }
        ]
    });
    registerEnemy({
        id: 'mango_vampiro', name: 'Mango Vampiro', icon: '🥭', hpMin: 40, hpMax: 46, idle: 'sway',
        moves: [
            { id: 'mordida_jugosa', name: 'Mordida Jugosa', damage: 9, drain: true, weight: 2, anim: 'bite', fx: 'drain' },
            { id: 'chupar_jugo', name: 'Chupar Jugo', damage: 5, hits: 2, drain: true, weight: 1, noRepeat: true, anim: 'lunge', fx: 'drain' }
        ]
    });

    // =========================================================
    // NIVEL 3 — LA FÁBRICA DE JUGOS
    // =========================================================
    registerEnemy({
        id: 'robot_limpiador', name: 'Robot Limpiador', icon: '🤖', hpMin: 44, hpMax: 50, idle: 'rumble', start: { enrage: 1 },
        moves: [
            { id: 'escobazo', name: 'Escobazo', damage: 12, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'aspirar', name: 'Aspirar', damage: 6, heal: 6, weight: 1, noRepeat: true, anim: 'lunge', fx: 'drain' }
        ]
    });
    registerEnemy({
        id: 'botella_explosiva', name: 'Botella Explosiva', icon: '🍾', hpMin: 24, hpMax: 28, idle: 'wobble', start: { fuse: 3 }, explode: 26,
        moves: [
            { id: 'burbujeo', name: 'Burbujeo', block: 8, weight: 1, anim: 'shake' },
            { id: 'chorro_presion', name: 'Chorro a Presión', damage: 6, weight: 1, anim: 'spit', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'tostadora_saltarina', name: 'Tostadora Saltarina', icon: '🍞', hpMin: 40, hpMax: 44, idle: 'hop', start: { malleable: 2 },
        moves: [
            { id: 'tostadas', name: 'Tostadas Voladoras', damage: 6, hits: 2, addCard: { id: 'jugo_hirviendo', n: 1, to: 'discard' }, weight: 2, anim: 'spit', fx: 'burst' },
            { id: 'calentar', name: 'Calentar', self: { strength: 3 }, block: 6, weight: 1, noRepeat: true, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'cafetera_rabiosa', name: 'Cafetera Rabiosa', icon: '☕', hpMin: 108, hpMax: 116, tier: 'elite', idle: 'rumble', start: { beat: 1 },
        moves: [
            { id: 'expreso', name: 'Expreso', damage: 18, weight: 2, anim: 'charge', fx: 'burst' },
            { id: 'goteo', name: 'Goteo Hirviente', damage: 6, hits: 3, weight: 2, anim: 'shake', fx: 'splat' },
            { id: 'vapor', name: 'Vapor', apply: { weak: 2, frail: 2 }, block: 15, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'horno_infernal', name: 'Horno Infernal', icon: '🔥', hpMin: 185, hpMax: 192, tier: 'boss', idle: 'rumble', final: true, start: { cap: 30 },
        ai: (e) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'gratinar'; }
            return ['horno_abierto', 'rafaga_fuego', 'precalentar'][e.turns % 3];
        },
        moves: [
            { id: 'horno_abierto', name: 'Horno Abierto', damage: 10, addCard: { id: 'jugo_hirviendo', n: 2, to: 'discard' }, anim: 'spit', fx: 'burst' },
            { id: 'rafaga_fuego', name: 'Ráfaga de Fuego', damage: 7, hits: 3, anim: 'shake', fx: 'burst' },
            { id: 'precalentar', name: 'Precalentar', self: { strength: 3 }, block: 20, anim: 'cast' },
            { id: 'gratinar', name: '¡Gratinar!', damage: 28, apply: { frail: 2 }, anim: 'charge', fx: 'burst' }
        ]
    });
    registerEnemy({
        id: 'maquina_expendedora', name: 'Máquina Expendedora', icon: '🥫', hpMin: 205, hpMax: 215, tier: 'boss', idle: 'rumble', final: true, start: { wax: 3 },
        ai: (e, c) => {
            if (e.hp < e.maxHp / 2 && !e.history.includes('refresco_gratis')) return 'refresco_gratis';
            let id = ['lata_disparada', 'expender', 'atasco', 'lata_gigante'][e.turns % 4];
            if (id === 'expender' && c.aliveEnemies().length >= 3) id = 'lata_gigante';
            return id;
        },
        moves: [
            { id: 'lata_disparada', name: 'Latas Disparadas', damage: 8, hits: 2, anim: 'spit', fx: 'shock' },
            { id: 'lata_gigante', name: 'Lata Gigante', damage: 20, anim: 'charge', fx: 'shock' },
            { id: 'expender', name: 'Expender Botellas', summon: ['botella_explosiva'], block: 12, anim: 'cast' },
            { id: 'atasco', name: 'Atasco', self: { jelly: 2 }, apply: { sticky: 2 }, anim: 'guard' },
            { id: 'refresco_gratis', name: 'Refresco Gratis', heal: 30, self: { wax: 2 }, anim: 'heal' }
        ]
    });

    registerEnemy({
        id: 'fresa_vengativa', name: 'Fresa Vengativa', icon: '🍓', hpMin: 100, hpMax: 108, tier: 'elite', idle: 'sway',
        moves: [
            { id: 'espejo_mermelada', name: 'Espejo de Mermelada', self: { reflect: 2 }, block: 14, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'semillas_afiladas', name: 'Semillas Afiladas', damage: 14, apply: { vulnerable: 2 }, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'pure_vengativo', name: 'Puré Vengativo', damage: 22, weight: 1, anim: 'charge', fx: 'burst' }
        ]
    });

    // =========================================================
    // Se suman a los grupos de cada nivel, y cada nivel tiene 3 jefes
    // =========================================================
    const add = (n, key, groups) => { window.ACTS[n - 1][key].push(...groups); };
    add(1, 'weak', [['bicho_bolita'], ['hongo_venenoso'], ['limon_rencoroso'], ['ciruela_podrida']]);
    add(1, 'normal', [['semilla_bomba', 'bicho_bolita'], ['hongo_venenoso', 'babosa_viscosa'], ['semilla_bomba', 'semilla_bomba', 'pulgon'], ['limon_rencoroso', 'ciruela_podrida']]);
    add(1, 'elites', [['escarabajo_gordo']]);
    add(2, 'weak', [['vela_cera'], ['gelatina_temblorosa'], ['mango_vampiro']]);
    add(2, 'normal', [['vela_cera', 'rata_mercado'], ['gelatina_temblorosa', 'hormiga_obrera'], ['vela_cera', 'vela_cera'], ['mango_vampiro', 'rata_mercado']]);
    add(2, 'elites', [['gato_callejero'], ['pina_espinosa']]);
    add(3, 'weak', [['robot_limpiador'], ['tostadora_saltarina']]);
    add(3, 'normal', [['botella_explosiva', 'botella_explosiva', 'tapa_saltarina'], ['robot_limpiador', 'botella_explosiva'], ['tostadora_saltarina', 'pajita_vampira']]);
    add(3, 'elites', [['cafetera_rabiosa'], ['fresa_vengativa']]);
    window.ACTS[0].bosses = ['oruga_reina', 'babosa_madre', 'hongo_rey'];
    window.ACTS[1].bosses = ['chef_cuchilla', 'reloj_cocina', 'rey_raton'];
    window.ACTS[2].bosses = ['licuadora_suprema', 'horno_infernal', 'maquina_expendedora'];
})();
