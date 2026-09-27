// ============================================================
// CARDS.JS — Base de datos de cartas
// Para agregar una carta nueva: llama a registerCard({...}).
// No hace falta tocar nada más del juego.
//
// Campos:
//   id          identificador único (string)
//   name        nombre mostrado
//   type        'attack' | 'skill' | 'power' | 'curse'
//   cost        energía que cuesta jugarla (upCost: costo al madurarla)
//   rarity      'basic' | 'common' | 'uncommon' | 'rare' | 'token' | 'curse'
//               (basic/token/curse nunca salen de recompensa)
//   target      'enemy' si hay que lanzarla a un enemigo (los ataques lo son
//               por defecto); 'none' para ataques que no eligen objetivo
//               (a todos o al azar).
//   exhaust     true → "Se consume": va al compost y no vuelve este combate
//               (upExhaust: valor al madurarla)
//   retain      true → no se descarta al terminar el turno
//   unplayable  true → no se puede jugar (maldiciones y estados)
//   ethereal    true → si sigue en tu mano al terminar el turno, se consume
//   endTurnDamage  PV que pierdes si sigue en tu mano al terminar el turno
//   fx          animación del golpe: punch | bite | slash | seeds | burst |
//               splash | spin | ice | stab
//   art         emoji de respaldo si no hay dibujo (js/art/sprites.js)
//   description texto. {a|b} = "a" normal, "b" al madurarla. Ej: 'Inflige {6|9} de daño.'
//   effect(ctx, U)  aplica el efecto. U(a, b) devuelve a normal / b madurada.
//     ctx.player, ctx.enemy (objetivo), ctx.enemies (vivos),
//     ctx.attack(n, objetivo?) → { hpLoss, killed }, ctx.attackAll(n), ctx.attackRandom(n),
//     ctx.block(n), ctx.apply(entidad, estado, n), ctx.applyAll(estado, n),
//     ctx.buff(estado, n), ctx.draw(n), ctx.gainEnergy(n), ctx.heal(n),
//     ctx.loseHp(n), ctx.gainMaxHp(n), ctx.addToHand(id, n), ctx.addToDiscard(id, n),
//     ctx.exhaustRandom(n), ctx.cardsPlayed (este turno, antes de esta carta)
// Los ids de estado están en js/data/statuses.js.
// Arte: sprite con el mismo id en js/art/sprites.js; si no existe, se usa el emoji.
// ============================================================

window.CARD_DEFS = {};
window.CARD_DB = {};

function resolveCardText(text, up) {
    return text.replace(/\{([^|}]*)\|([^}]*)\}/g, (_, a, b) => (up ? b : a));
}
const cardCache = {};
function buildCard(def, up) {
    const U = (a, b) => (up ? b : a);
    return Object.assign({}, def, {
        id: def.id + (up ? '+' : ''),
        baseId: def.id,
        upgraded: up,
        name: def.name + (up ? '+' : ''),
        cost: up && def.upCost != null ? def.upCost : def.cost,
        exhaust: up && def.upExhaust != null ? def.upExhaust : !!def.exhaust,
        description: resolveCardText(def.description, up),
        canUpgrade: !up && def.type !== 'curse' && def.type !== 'status' && def.rarity !== 'token',
        sprite: def.sprite || def.id,
        effect: (ctx) => (def.effect ? def.effect(ctx, U) : undefined)
    });
}
window.registerCard = function (def) {
    window.CARD_DEFS[def.id] = def;
    window.CARD_DB[def.id] = buildCard(def, false);
    delete cardCache[def.id + '+'];
};
// Busca una carta por id; "id+" es la versión madurada
window.getCard = function (id) {
    if (!id) return null;
    if (id.endsWith('+')) {
        if (!cardCache[id]) {
            const def = window.CARD_DEFS[id.slice(0, -1)];
            if (!def) return null;
            cardCache[id] = buildCard(def, true);
        }
        return cardCache[id];
    }
    return window.CARD_DB[id] || null;
};

// =============================================================
// ATAQUES
// =============================================================
registerCard({
    id: 'golpe_cascara', name: 'Golpe de Cáscara', type: 'attack', cost: 1, rarity: 'basic', fx: 'punch',
    art: '🍏', description: 'Inflige {6|9} de daño.',
    effect: (ctx, U) => ctx.attack(U(6, 9))
});
registerCard({
    id: 'golpe_doble', name: 'Doble Mordida', type: 'attack', cost: 1, rarity: 'common', fx: 'bite',
    art: '🍒', description: 'Inflige {4|5} de daño dos veces.',
    effect: (ctx, U) => { ctx.attack(U(4, 5)); ctx.attack(U(4, 5)); }
});
registerCard({
    id: 'tajo_citrico', name: 'Tajo Cítrico', type: 'attack', cost: 1, rarity: 'uncommon', fx: 'slash',
    art: '🍋', description: 'Inflige {9|12} de daño. Si el enemigo tiene Magulladura, roba 1 carta.',
    effect: (ctx, U) => {
        const bruised = ctx.enemy.getStatus('vulnerable') > 0;
        ctx.attack(U(9, 12));
        if (bruised) ctx.draw(1);
    }
});
registerCard({
    id: 'ametralladora_semillas', name: 'Ametralladora de Semillas', type: 'attack', cost: 2, rarity: 'uncommon', target: 'none', fx: 'seeds',
    art: '🍇', description: 'Inflige {4|5} de daño {4|5} veces a enemigos al azar.',
    effect: (ctx, U) => { for (let i = 0; i < U(4, 5); i++) ctx.attackRandom(U(4, 5)); }
});
registerCard({
    id: 'explosion_acida', name: 'Explosión Ácida', type: 'attack', cost: 2, rarity: 'rare', fx: 'burst',
    art: '🍊', description: 'Inflige {14|18} de daño y aplica {2|3} de Magulladura.',
    effect: (ctx, U) => { ctx.attack(U(14, 18)); ctx.apply(ctx.enemy, 'vulnerable', U(2, 3)); }
});
registerCard({
    id: 'golpe_final', name: 'Puré Definitivo', type: 'attack', cost: 3, rarity: 'rare', fx: 'burst',
    art: '🥭', description: 'Inflige {22|30} de daño.',
    effect: (ctx, U) => ctx.attack(U(22, 30))
});
registerCard({
    id: 'lluvia_uvas', name: 'Lluvia de Uvas', type: 'attack', cost: 1, rarity: 'common', target: 'none', fx: 'seeds',
    art: '🍇', description: 'Inflige {5|8} de daño a TODOS los enemigos.',
    effect: (ctx, U) => ctx.attackAll(U(5, 8))
});
registerCard({
    id: 'estocada_pina', name: 'Estocada de Piña', type: 'attack', cost: 1, rarity: 'common', fx: 'stab',
    art: '🍍', description: 'Inflige {7|9} de daño. Gana {2|3} de Pinchos.',
    effect: (ctx, U) => { ctx.attack(U(7, 9)); ctx.buff('thorns', U(2, 3)); }
});
registerCard({
    id: 'chorro_limon', name: 'Chorro de Limón', type: 'attack', cost: 0, rarity: 'common', fx: 'splash',
    art: '🍋', description: 'Inflige {3|5} de daño y aplica 1 de Marchitez.',
    effect: (ctx, U) => { ctx.attack(U(3, 5)); ctx.apply(ctx.enemy, 'weak', 1); }
});
registerCard({
    id: 'rodaja_sandia', name: 'Rodaja Giratoria', type: 'attack', cost: 2, rarity: 'uncommon', target: 'none', fx: 'spin',
    art: '🍉', description: 'Inflige {9|12} de daño a TODOS los enemigos.',
    effect: (ctx, U) => ctx.attackAll(U(9, 12))
});
registerCard({
    id: 'mordisco_voraz', name: 'Mordisco Voraz', type: 'attack', cost: 2, rarity: 'uncommon', fx: 'bite', exhaust: true,
    art: '🍑', description: 'Inflige {10|13} de daño. Si lo mata, +{3|4} de vida máxima. Se consume.',
    effect: (ctx, U) => { const r = ctx.attack(U(10, 13)); if (r.killed) ctx.gainMaxHp(U(3, 4)); }
});
registerCard({
    id: 'cocazo', name: 'Cocazo', type: 'attack', cost: 1, rarity: 'uncommon', fx: 'punch',
    art: '🥥', description: 'Inflige tanto daño como tu cáscara{| + 4}.',
    effect: (ctx, U) => ctx.attack(ctx.player.block + U(0, 4))
});
registerCard({
    id: 'fruta_pasada', name: 'Fruta Pasada', type: 'attack', cost: 1, rarity: 'common', fx: 'splash',
    art: '🍌', description: 'Inflige {5|7} de daño y aplica {3|4} de Putrefacción.',
    effect: (ctx, U) => { ctx.attack(U(5, 7)); ctx.apply(ctx.enemy, 'poison', U(3, 4)); }
});
registerCard({
    id: 'racimo_furioso', name: 'Racimo Furioso', type: 'attack', cost: 1, rarity: 'rare', fx: 'seeds',
    art: '🫐', description: 'Inflige {3|4} de daño por cada carta jugada este turno, contando esta.',
    effect: (ctx, U) => { for (let i = 0; i <= ctx.cardsPlayed; i++) ctx.attack(U(3, 4)); }
});
registerCard({
    id: 'paleta_helada', name: 'Paleta Helada', type: 'attack', cost: 2, upCost: 1, rarity: 'rare', fx: 'ice', exhaust: true,
    art: '🍧', description: 'Inflige 8 de daño y congela al enemigo. Se consume.',
    effect: (ctx) => { ctx.attack(8); ctx.apply(ctx.enemy, 'frozen', 1); }
});
registerCard({
    id: 'semilla', name: 'Pepita', type: 'attack', cost: 0, rarity: 'token', fx: 'seeds', exhaust: true,
    art: '🌰', description: 'Inflige 3 de daño. Se consume.',
    effect: (ctx) => ctx.attack(3)
});

// =============================================================
// HABILIDADES
// =============================================================
registerCard({
    id: 'jugo_defensivo', name: 'Jugo Defensivo', type: 'skill', cost: 1, rarity: 'basic',
    art: '🥤', description: 'Gana {5|8} de cáscara.',
    effect: (ctx, U) => ctx.block(U(5, 8))
});
registerCard({
    id: 'escudo_pulpa', name: 'Escudo de Pulpa', type: 'skill', cost: 1, rarity: 'common',
    art: '🛡️', description: 'Gana {7|10} de cáscara. Roba 1 carta.',
    effect: (ctx, U) => { ctx.block(U(7, 10)); ctx.draw(1); }
});
registerCard({
    id: 'bloqueo_total', name: 'Cáscara Blindada', type: 'skill', cost: 2, rarity: 'uncommon',
    art: '🥥', description: 'Gana {15|20} de cáscara.',
    effect: (ctx, U) => ctx.block(U(15, 20))
});
registerCard({
    id: 'cascara_venenosa', name: 'Cáscara Podrida', type: 'skill', cost: 1, rarity: 'common', target: 'enemy',
    art: '🦠', description: 'Aplica {5|7} de Putrefacción.',
    effect: (ctx, U) => ctx.apply(ctx.enemy, 'poison', U(5, 7))
});
registerCard({
    id: 'maldicion_debilidad', name: 'Jugo Agrio', type: 'skill', cost: 1, rarity: 'common', target: 'enemy',
    art: '🍈', description: 'Aplica {2|3} de Marchitez y {1|2} de Magulladura.',
    effect: (ctx, U) => { ctx.apply(ctx.enemy, 'weak', U(2, 3)); ctx.apply(ctx.enemy, 'vulnerable', U(1, 2)); }
});
registerCard({
    id: 'mermelada_curativa', name: 'Mermelada Curativa', type: 'skill', cost: 1, rarity: 'rare', exhaust: true,
    art: '🍓', description: 'Recupera {8|12} ❤️. Se consume.',
    effect: (ctx, U) => ctx.heal(U(8, 12))
});
registerCard({
    id: 'frenesi_frutal', name: 'Frenesí Frutal', type: 'skill', cost: 0, rarity: 'rare', exhaust: true,
    art: '🍉', description: 'Roba {2|3} cartas y gana 1 de energía. Se consume.',
    effect: (ctx, U) => { ctx.draw(U(2, 3)); ctx.gainEnergy(1); }
});
registerCard({
    id: 'hueso_aguacate', name: 'Hueso de Aguacate', type: 'skill', cost: 1, rarity: 'uncommon',
    art: '🥑', description: 'Gana {5|7} de cáscara y 1 de Firmeza.',
    effect: (ctx, U) => { ctx.block(U(5, 7)); ctx.buff('dexterity', 1); }
});
registerCard({
    id: 'batido_energetico', name: 'Batido Energético', type: 'skill', cost: 0, rarity: 'uncommon', exhaust: true,
    art: '🥤', description: 'Gana {1|2} de energía. Se consume.',
    effect: (ctx, U) => ctx.gainEnergy(U(1, 2))
});
registerCard({
    id: 'exprimir', name: 'Exprimir', type: 'skill', cost: 1, rarity: 'common',
    art: '🍋', description: 'Roba {2|3} cartas.',
    effect: (ctx, U) => ctx.draw(U(2, 3))
});
registerCard({
    id: 'compostar', name: 'Compostar', type: 'skill', cost: 1, rarity: 'uncommon',
    art: '🪱', description: 'Consume 1 carta al azar de tu mano. Gana {9|13} de cáscara.',
    effect: (ctx, U) => { ctx.exhaustRandom(1); ctx.block(U(9, 13)); }
});
registerCard({
    id: 'nube_polen', name: 'Nube de Polen', type: 'skill', cost: 1, rarity: 'uncommon',
    art: '🌼', description: 'Aplica {1|2} de Marchitez y 1 de Magulladura a TODOS los enemigos.',
    effect: (ctx, U) => { ctx.applyAll('weak', U(1, 2)); ctx.applyAll('vulnerable', 1); }
});
registerCard({
    id: 'rayito_sol', name: 'Rayito de Sol', type: 'skill', cost: 1, rarity: 'uncommon', exhaust: true,
    art: '🌞', description: 'Gana {4|6} de Fotosíntesis. Se consume.',
    effect: (ctx, U) => ctx.buff('regen', U(4, 6))
});
registerCard({
    id: 'corteza_coco', name: 'Corteza de Coco', type: 'skill', cost: 2, rarity: 'uncommon',
    art: '🪵', description: 'Gana {4|6} de Corteza.',
    effect: (ctx, U) => ctx.buff('plated', U(4, 6))
});
registerCard({
    id: 'siembra', name: 'Siembra', type: 'skill', cost: 1, rarity: 'common',
    art: '🌱', description: 'Añade {2|3} Pepitas a tu mano.',
    effect: (ctx, U) => ctx.addToHand('semilla', U(2, 3))
});
registerCard({
    id: 'catalizador_moho', name: 'Catalizador de Moho', type: 'skill', cost: 1, rarity: 'rare', target: 'enemy', exhaust: true,
    art: '🍄', description: 'Multiplica por {2|3} la Putrefacción del enemigo. Se consume.',
    effect: (ctx, U) => {
        const p = ctx.enemy.getStatus('poison');
        if (p > 0) ctx.apply(ctx.enemy, 'poison', p * (U(2, 3) - 1));
    }
});
registerCard({
    id: 'ensalada_escudo', name: 'Ensalada Escudo', type: 'skill', cost: 1, rarity: 'common', retain: true,
    art: '🥗', description: 'Gana {8|11} de cáscara. Se conserva.',
    effect: (ctx, U) => ctx.block(U(8, 11))
});

// =============================================================
// PODERES (se juegan una vez por combate y quedan activos)
// =============================================================
registerCard({
    id: 'fermentacion', name: 'Fermentación', type: 'power', cost: 1, rarity: 'uncommon',
    art: '🍾', description: 'Gana {2|3} de Madurez.',
    effect: (ctx, U) => ctx.buff('strength', U(2, 3))
});
registerCard({
    id: 'semillero', name: 'Semillero', type: 'power', cost: 1, rarity: 'rare',
    art: '🌱', description: 'Al empezar cada turno, recibes {1|2} Pepita{|s}.',
    effect: (ctx, U) => ctx.buff('seeds', U(1, 2))
});
registerCard({
    id: 'sol_verano', name: 'Sol de Verano', type: 'power', cost: 2, upCost: 1, rarity: 'rare',
    art: '🌅', description: 'Al final de cada turno, gana 1 de Madurez.',
    effect: (ctx) => ctx.buff('ritual', 1)
});
registerCard({
    id: 'coraza_pitahaya', name: 'Coraza de Pitahaya', type: 'power', cost: 1, rarity: 'uncommon',
    art: '🐉', description: 'Gana {3|5} de Pinchos.',
    effect: (ctx, U) => ctx.buff('thorns', U(3, 5))
});
registerCard({
    id: 'podredumbre_noble', name: 'Moho Noble', type: 'power', cost: 1, rarity: 'rare',
    art: '🍄', description: 'Tus ataques aplican {1|2} de Putrefacción.',
    effect: (ctx, U) => ctx.buff('noble_rot', U(1, 2))
});

// =============================================================
// MALDICIONES (injugables; llegan por eventos o jefes)
// =============================================================
registerCard({
    id: 'fruta_magullada', name: 'Fruta Magullada', type: 'curse', cost: 0, rarity: 'curse', unplayable: true,
    art: '🤕', description: 'Injugable.'
});
registerCard({
    id: 'gusano_interior', name: 'Gusano Interior', type: 'curse', cost: 0, rarity: 'curse', unplayable: true, endTurnDamage: 2,
    art: '🐛', description: 'Injugable. Si sigue en tu mano al terminar el turno, pierdes 2 ❤️.'
});

// =============================================================
// ESTADOS (cartas-estorbo que los enemigos meten en tu mazo)
// =============================================================
registerCard({
    id: 'pulpa_aplastada', name: 'Pulpa Aplastada', type: 'status', cost: 0, rarity: 'status', unplayable: true, ethereal: true,
    art: '🫠', description: 'Injugable. Si sigue en tu mano al terminar el turno, se consume.'
});
registerCard({
    id: 'jugo_hirviendo', name: 'Jugo Hirviendo', type: 'status', cost: 0, rarity: 'status', unplayable: true, endTurnDamage: 2,
    art: '♨️', description: 'Injugable. Si sigue en tu mano al terminar el turno, pierdes 2 ❤️.'
});
