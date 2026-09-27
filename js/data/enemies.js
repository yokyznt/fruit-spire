// ============================================================
// ENEMIES.JS — Enemigos, niveles (actos) y grupos de encuentro.
// Para agregar un enemigo: registerEnemy({...}) y ponlo en algún
// grupo de ACTS (más abajo).
//
// Campos del enemigo:
//   id, name, icon (emoji de respaldo), hpMin, hpMax
//   tier: 'normal' | 'elite' | 'boss'
//   idle: animación en reposo → float | buzz | flap | crawl | wobble |
//         hop | scuttle | sway | rumble | spin | menace
//   start: estados con los que empieza, ej. { plated: 6 }
//   phaseSprites / phaseNames: dibujo y nombre por fase (jefes)
//   ai(enemy, combat): opcional, devuelve el id de la próxima jugada
//   onDeath(enemy, ctx): opcional
//   moves: jugadas posibles. Cada una puede combinar:
//     damage, hits          golpe(s) al jugador
//     block                 cáscara para sí
//     allyBlock             cáscara para sus aliados
//     apply: { weak: 2 }    estados al jugador
//     self: { strength: 2 } estados para sí
//     allies: { strength: 1 } estados para todos los enemigos vivos
//     heal, healAll         curarse / curar a todos
//     stealGold             roba oro (lo devuelve al morir)
//     addCard: { id, n, to: 'discard' | 'draw' | 'hand' }  mete cartas a tu mazo
//     summon: ['id', ...]   invoca enemigos
//     weight, noRepeat, once   para elegir al azar
//     anim: animación del atacante → lunge | bite | charge | sting | swoop |
//           spit | slam | spin | slash | shake | cast | guard | heal | burrow
//     fx: efecto sobre el objetivo → claw | bite | slash | sting | splat |
//         shock | seeds | burst | ice | drain | steal
// Los ids de estados están en js/data/statuses.js.
// Arte: sprite con el mismo id en js/art/sprites.js (si no, el emoji).
// ============================================================

window.ENEMY_DB = {};
window.registerEnemy = function (def) {
    window.ENEMY_DB[def.id] = def;
};

// Recorre una lista de jugadas en orden, empezando por `from`
const cycle = (list) => (e) => list[e.turns % list.length];

// =============================================================
// NIVEL 1 — EL HUERTO
// =============================================================
registerEnemy({
    id: 'mosca_podrida', name: 'Mosca Podrida', icon: '🪰', hpMin: 15, hpMax: 19, idle: 'buzz',
    moves: [
        { id: 'picotazo', name: 'Picotazo', damage: 5, weight: 3, anim: 'sting', fx: 'sting' },
        { id: 'zumbido', name: 'Zumbido Sucio', damage: 2, apply: { poison: 2 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'splat' }
    ]
});
registerEnemy({
    id: 'avispa_furiosa', name: 'Avispa Furiosa', icon: '🐝', hpMin: 13, hpMax: 16, idle: 'flap',
    moves: [
        { id: 'doble_aguijon', name: 'Doble Aguijón', damage: 3, hits: 2, weight: 2, anim: 'sting', fx: 'sting' },
        { id: 'clavada', name: 'Clavada en Picada', damage: 8, weight: 1, noRepeat: true, anim: 'swoop', fx: 'sting' }
    ]
});
registerEnemy({
    id: 'gusano_venenoso', name: 'Gusano Podrido', icon: '🐛', hpMin: 17, hpMax: 21, idle: 'crawl',
    moves: [
        { id: 'mordida_podrida', name: 'Mordida Podrida', damage: 4, apply: { poison: 3 }, weight: 2, anim: 'bite', fx: 'bite' },
        { id: 'enroscarse', name: 'Enroscarse', block: 7, weight: 1, noRepeat: true, anim: 'guard' }
    ]
});
registerEnemy({
    id: 'babosa_viscosa', name: 'Babosa Viscosa', icon: '🐌', hpMin: 22, hpMax: 26, idle: 'wobble',
    moves: [
        { id: 'baba', name: 'Baba de Almíbar', damage: 5, apply: { sticky: 1 }, weight: 2, noRepeat: true, anim: 'spit', fx: 'splat' },
        { id: 'aplaston', name: 'Aplastón', damage: 9, weight: 2, anim: 'slam', fx: 'shock' }
    ]
});
registerEnemy({
    id: 'pulgon', name: 'Pulgón', icon: '🦗', hpMin: 8, hpMax: 11, idle: 'hop',
    moves: [
        { id: 'chupar_savia', name: 'Chupar Savia', damage: 3, heal: 2, weight: 2, anim: 'bite', fx: 'drain' },
        { id: 'colonia', name: '¡Colonia!', allies: { strength: 1 }, weight: 1, noRepeat: true, anim: 'cast' }
    ]
});
registerEnemy({
    id: 'cucaracha_blindada', name: 'Cucaracha Blindada', icon: '🪳', hpMin: 26, hpMax: 31, idle: 'scuttle', start: { plated: 3 },
    moves: [
        { id: 'embiste', name: 'Embiste', damage: 8, weight: 2, anim: 'charge', fx: 'shock' },
        { id: 'endurecer', name: 'Endurecer Caparazón', self: { strength: 2 }, block: 5, weight: 1, noRepeat: true, anim: 'guard' }
    ]
});
registerEnemy({
    id: 'mango_zombie', name: 'Mango Zombie', icon: '🧟', hpMin: 30, hpMax: 36, idle: 'wobble',
    moves: [
        { id: 'zarpazo', name: 'Zarpazo Podrido', damage: 10, weight: 2, anim: 'lunge', fx: 'claw' },
        { id: 'aliento', name: 'Aliento Rancio', damage: 4, apply: { weak: 2 }, weight: 1, anim: 'spit', fx: 'splat' },
        { id: 'regenerar', name: 'Regenerar Pulpa', heal: 7, weight: 1, noRepeat: true, anim: 'heal' }
    ]
});
// --- élites ---
registerEnemy({
    id: 'cuervo_ladron', name: 'Cuervo Ladrón', icon: '🐦‍⬛', hpMin: 42, hpMax: 46, tier: 'elite', idle: 'flap',
    ai: (e) => (e.turns === 0 ? 'robo' : null),
    moves: [
        { id: 'robo', name: 'Picotazo Ladrón', damage: 8, stealGold: 15, weight: 2, anim: 'swoop', fx: 'steal' },
        { id: 'graznido', name: 'Graznido', apply: { weak: 2, vulnerable: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' },
        { id: 'aleteo', name: 'Aleteo Afilado', damage: 4, hits: 3, weight: 2, anim: 'swoop', fx: 'claw' }
    ]
});
registerEnemy({
    id: 'topo_excavador', name: 'Topo Excavador', icon: '🦫', hpMin: 52, hpMax: 58, tier: 'elite', idle: 'sway', start: { plated: 5 },
    ai: cycle(['excavar', 'zarpazo_doble', 'terremoto']),
    moves: [
        { id: 'excavar', name: 'Excavar', block: 10, self: { strength: 2 }, anim: 'burrow' },
        { id: 'zarpazo_doble', name: 'Zarpazo Doble', damage: 6, hits: 2, anim: 'lunge', fx: 'claw' },
        { id: 'terremoto', name: 'Terremoto', damage: 11, apply: { frail: 2 }, anim: 'slam', fx: 'shock' }
    ]
});
// --- jefe ---
registerEnemy({
    id: 'oruga_reina', name: 'Oruga Reina', icon: '🐛', hpMin: 92, hpMax: 98, tier: 'boss', idle: 'crawl',
    phaseSprites: ['oruga_reina', 'mariposa_reina'], phaseNames: ['Oruga Reina', 'Mariposa Reina'],
    ai: (e, c) => {
        if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'capullo'; }
        if (e.phase === 1) return ['aleteo_real', 'polvo_escamas'][e.turns % 2];
        if (e.turns === 0) return 'hilo_seda';
        const larvas = c.aliveEnemies().length < 2 && !e.history.slice(-3).includes('llamar_larvas');
        return larvas && e.turns % 3 === 2 ? 'llamar_larvas' : ['mordisco_real', 'hilo_seda'][e.turns % 2];
    },
    moves: [
        { id: 'hilo_seda', name: 'Hilo de Seda', damage: 6, apply: { sticky: 1, weak: 1 }, anim: 'spit', fx: 'splat' },
        { id: 'mordisco_real', name: 'Mordisco Real', damage: 13, anim: 'bite', fx: 'bite' },
        { id: 'llamar_larvas', name: 'Llamar Larvas', summon: ['pulgon', 'pulgon'], block: 8, anim: 'cast' },
        { id: 'capullo', name: '¡Metamorfosis!', block: 22, self: { strength: 3 }, anim: 'guard' },
        { id: 'aleteo_real', name: 'Aleteo Real', damage: 6, hits: 2, anim: 'swoop', fx: 'claw' },
        { id: 'polvo_escamas', name: 'Polvo de Escamas', damage: 5, apply: { vulnerable: 1, weak: 2 }, anim: 'shake', fx: 'seeds' }
    ]
});

// =============================================================
// NIVEL 2 — EL MERCADO
// =============================================================
registerEnemy({
    id: 'rata_mercado', name: 'Rata del Mercado', icon: '🐀', hpMin: 30, hpMax: 34, idle: 'scuttle',
    moves: [
        { id: 'roer', name: 'Roer', damage: 8, weight: 2, anim: 'bite', fx: 'bite' },
        { id: 'chillido', name: 'Chillido', apply: { weak: 1 }, self: { strength: 2 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' }
    ]
});
registerEnemy({
    id: 'tenedor_gloton', name: 'Tenedor Glotón', icon: '🍴', hpMin: 28, hpMax: 32, idle: 'sway',
    moves: [
        { id: 'pinchar', name: 'Pinchar', damage: 3, hits: 3, weight: 2, anim: 'sting', fx: 'sting' },
        { id: 'afilar', name: 'Afilar Puntas', self: { strength: 2 }, block: 6, weight: 1, noRepeat: true, anim: 'cast' }
    ]
});
registerEnemy({
    id: 'pelador_oxidado', name: 'Pelador Oxidado', icon: '🔪', hpMin: 34, hpMax: 38, idle: 'rumble',
    moves: [
        { id: 'pelar', name: 'Pelar', damage: 9, apply: { frail: 2 }, weight: 2, anim: 'slash', fx: 'slash' },
        { id: 'oxido', name: 'Lluvia de Óxido', damage: 3, apply: { poison: 5 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' }
    ]
});
registerEnemy({
    id: 'hormiga_obrera', name: 'Hormiga Obrera', icon: '🐜', hpMin: 13, hpMax: 16, idle: 'scuttle',
    moves: [
        { id: 'mordisco', name: 'Mordisco', damage: 5, weight: 2, anim: 'bite', fx: 'bite' },
        { id: 'formacion', name: 'Formación', block: 5, allyBlock: 5, weight: 1, noRepeat: true, anim: 'guard' }
    ]
});
registerEnemy({
    id: 'cuchillo_carnicero', name: 'Cuchillo Carnicero', icon: '🗡️', hpMin: 70, hpMax: 76, tier: 'elite', idle: 'sway',
    ai: cycle(['afilado', 'tajo', 'picar']),
    moves: [
        { id: 'afilado', name: 'Afilado', self: { strength: 3 }, block: 10, anim: 'cast' },
        { id: 'tajo', name: 'Tajo Carnicero', damage: 16, anim: 'slash', fx: 'slash' },
        { id: 'picar', name: 'Picar Fino', damage: 5, hits: 3, anim: 'slash', fx: 'slash' }
    ]
});
registerEnemy({
    id: 'rallador_furioso', name: 'Rallador Furioso', icon: '🧀', hpMin: 62, hpMax: 68, tier: 'elite', idle: 'rumble', start: { thorns: 3 },
    moves: [
        { id: 'rallar', name: 'Rallar', damage: 2, hits: 6, weight: 2, anim: 'shake', fx: 'claw' },
        { id: 'aplanar', name: 'Aplanar', damage: 11, apply: { vulnerable: 2 }, weight: 2, anim: 'slam', fx: 'shock' },
        { id: 'afinar', name: 'Afinar Dientes', self: { thorns: 2 }, block: 12, weight: 1, noRepeat: true, anim: 'guard' }
    ]
});
registerEnemy({
    id: 'chef_cuchilla', name: 'Chef Cuchilla', icon: '👨‍🍳', hpMin: 160, hpMax: 168, tier: 'boss', idle: 'sway',
    ai: (e, c) => {
        if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'furia'; }
        const order = ['picar_cubitos', 'afilar_cuchillos', 'flambear', 'ayudante'];
        let id = order[e.turns % order.length];
        if (id === 'ayudante' && c.aliveEnemies().length >= 3) id = 'flambear';
        return id;
    },
    moves: [
        { id: 'picar_cubitos', name: 'Picar en Cubitos', damage: 4, hits: 3, addCard: { id: 'fruta_magullada', n: 1, to: 'discard' }, anim: 'slash', fx: 'slash' },
        { id: 'afilar_cuchillos', name: 'Afilar Cuchillos', self: { strength: 2 }, block: 12, anim: 'cast' },
        { id: 'flambear', name: 'Flambear', damage: 16, anim: 'charge', fx: 'burst' },
        { id: 'ayudante', name: '¡Ayudante!', summon: ['tenedor_gloton'], block: 10, anim: 'cast' },
        { id: 'furia', name: 'Furia de Cocina', self: { ritual: 1 }, block: 15, anim: 'cast' }
    ]
});

// =============================================================
// NIVEL 3 — LA FÁBRICA DE JUGOS
// =============================================================
registerEnemy({
    id: 'exprimidor_mecanico', name: 'Exprimidor Mecánico', icon: '🍋', hpMin: 46, hpMax: 52, idle: 'rumble',
    moves: [
        { id: 'exprimir', name: 'Exprimir', damage: 13, weight: 2, anim: 'slam', fx: 'shock' },
        { id: 'presion', name: 'Presión Pegajosa', damage: 6, apply: { sticky: 1, frail: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'splat' }
    ]
});
registerEnemy({
    id: 'tapa_saltarina', name: 'Tapa Saltarina', icon: '🔘', hpMin: 30, hpMax: 34, idle: 'hop', start: { thorns: 2 },
    moves: [
        { id: 'salto', name: 'Salto Aplastante', damage: 9, weight: 2, anim: 'slam', fx: 'shock' },
        { id: 'rebote', name: 'Rebote', damage: 4, block: 10, weight: 1, anim: 'slam', fx: 'shock' }
    ]
});
registerEnemy({
    id: 'batidora_mano', name: 'Batidora de Mano', icon: '🌪️', hpMin: 42, hpMax: 48, idle: 'spin',
    moves: [
        { id: 'batir', name: 'Batir', damage: 3, hits: 4, weight: 3, anim: 'spin', fx: 'claw' },
        { id: 'acelerar', name: 'Acelerar', self: { ritual: 1 }, block: 8, weight: 1, once: true, anim: 'spin' }
    ]
});
registerEnemy({
    id: 'pajita_vampira', name: 'Pajita Vampira', icon: '🥤', hpMin: 38, hpMax: 42, idle: 'sway',
    moves: [
        { id: 'sorber', name: 'Sorber', damage: 10, heal: 8, weight: 2, anim: 'lunge', fx: 'drain' },
        { id: 'burbujas', name: 'Burbujas', apply: { weak: 2, vulnerable: 1 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' }
    ]
});
registerEnemy({
    id: 'cortadora_industrial', name: 'Cortadora Industrial', icon: '⚙️', hpMin: 105, hpMax: 112, tier: 'elite', idle: 'rumble', start: { plated: 8 },
    ai: cycle(['recargar', 'cuchillas', 'triturar']),
    moves: [
        { id: 'recargar', name: 'Recargar', self: { strength: 3 }, block: 14, anim: 'cast' },
        { id: 'cuchillas', name: 'Cuchillas Giratorias', damage: 8, hits: 2, anim: 'spin', fx: 'slash' },
        { id: 'triturar', name: 'Triturar', damage: 20, anim: 'charge', fx: 'shock' }
    ]
});
registerEnemy({
    id: 'congelador_gelido', name: 'Congelador Gélido', icon: '🧊', hpMin: 96, hpMax: 104, tier: 'elite', idle: 'rumble',
    moves: [
        { id: 'escarcha', name: 'Escarcha', damage: 11, apply: { frail: 2, weak: 1 }, weight: 2, anim: 'spit', fx: 'ice' },
        { id: 'aliento_helado', name: 'Aliento Helado', damage: 6, hits: 2, apply: { sticky: 1 }, weight: 2, anim: 'shake', fx: 'ice' },
        { id: 'hielo_eterno', name: 'Hielo Eterno', self: { plated: 6 }, weight: 1, once: true, anim: 'guard' }
    ]
});
registerEnemy({
    id: 'licuadora_suprema', name: 'Licuadora Suprema', icon: '🌀', hpMin: 205, hpMax: 215, tier: 'boss', idle: 'menace', final: true,
    phaseSprites: ['licuadora_suprema', 'licuadora_turbo'], phaseNames: ['Licuadora Suprema', 'Licuadora TURBO'],
    ai: (e, c) => {
        if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'modo_turbo'; }
        if (e.phase === 1) return ['licuar', 'triturar', 'giro_doble'][e.turns % 3];
        const order = ['sobrecarga', 'triturar', 'giro_doble', 'llamar_tapas'];
        let id = order[e.turns % order.length];
        if (id === 'llamar_tapas' && c.aliveEnemies().length >= 3) id = 'triturar';
        return id;
    },
    moves: [
        { id: 'triturar', name: 'Triturar', damage: 14, anim: 'charge', fx: 'shock' },
        { id: 'giro_doble', name: 'Giro Doble', damage: 8, hits: 2, anim: 'spin', fx: 'slash' },
        { id: 'sobrecarga', name: 'Sobrecarga', self: { strength: 2 }, block: 16, anim: 'cast' },
        { id: 'llamar_tapas', name: 'Tapas Locas', summon: ['tapa_saltarina'], block: 10, anim: 'cast' },
        { id: 'modo_turbo', name: '¡MODO TURBO!', self: { ritual: 1 }, block: 25, anim: 'spin' },
        { id: 'licuar', name: 'Licuar', damage: 4, hits: 4, apply: { weak: 1 }, anim: 'spin', fx: 'claw' }
    ]
});

// =============================================================
// NIVELES Y GRUPOS DE ENCUENTRO
// weak: primeras columnas · normal: el resto · elites · boss
// =============================================================
window.ACTS = [
    {
        n: 1, id: 'huerto', name: 'El Huerto', subtitle: 'Donde los bichos se comen la fruta caída',
        boss: 'oruga_reina',
        weak: [['mosca_podrida'], ['avispa_furiosa'], ['gusano_venenoso'], ['pulgon', 'pulgon'], ['babosa_viscosa']],
        normal: [['cucaracha_blindada'], ['mango_zombie'], ['mosca_podrida', 'avispa_furiosa'], ['gusano_venenoso', 'babosa_viscosa'],
            ['pulgon', 'pulgon', 'pulgon'], ['babosa_viscosa', 'mosca_podrida'], ['cucaracha_blindada', 'pulgon']],
        elites: [['cuervo_ladron'], ['topo_excavador']]
    },
    {
        n: 2, id: 'mercado', name: 'El Mercado', subtitle: 'Cuchillos, tenedores y ratas con hambre',
        boss: 'chef_cuchilla',
        weak: [['rata_mercado'], ['hormiga_obrera', 'hormiga_obrera'], ['tenedor_gloton']],
        normal: [['pelador_oxidado'], ['rata_mercado', 'hormiga_obrera'], ['hormiga_obrera', 'hormiga_obrera', 'hormiga_obrera'],
            ['tenedor_gloton', 'rata_mercado'], ['pelador_oxidado', 'hormiga_obrera'], ['tenedor_gloton', 'tenedor_gloton']],
        elites: [['cuchillo_carnicero'], ['rallador_furioso']]
    },
    {
        n: 3, id: 'fabrica', name: 'La Fábrica de Jugos', subtitle: 'Aquí termina toda fruta… o no',
        boss: 'licuadora_suprema',
        weak: [['tapa_saltarina'], ['exprimidor_mecanico'], ['pajita_vampira']],
        normal: [['batidora_mano'], ['exprimidor_mecanico', 'tapa_saltarina'], ['pajita_vampira', 'tapa_saltarina'],
            ['batidora_mano', 'pajita_vampira'], ['tapa_saltarina', 'tapa_saltarina', 'tapa_saltarina'], ['exprimidor_mecanico', 'pajita_vampira']],
        elites: [['cortadora_industrial'], ['congelador_gelido']]
    }
];

// Jefe al azar para un nivel (cada nivel tiene varios en `bosses`)
window.pickBoss = function (actN) {
    const act = window.ACTS[actN - 1] || window.ACTS[0];
    const list = act.bosses && act.bosses.length ? act.bosses : [act.boss];
    return list[Math.floor(Math.random() * list.length)];
};
// Grupo de enemigos para una casilla. kind: 'enemy' | 'elite' | 'boss'
window.pickEncounter = function (actN, x, kind, bossId) {
    const act = window.ACTS[actN - 1] || window.ACTS[0];
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    if (kind === 'boss') return [bossId || act.boss];
    if (kind === 'elite') return [...pick(act.elites)];
    return [...pick(x <= 3 ? act.weak : act.normal)];
};
