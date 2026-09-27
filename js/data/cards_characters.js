// ============================================================
// CARDS_CHARACTERS.JS — Cartas exclusivas de cada personaje.
// Con `character: 'id'` una carta solo sale en las partidas de esa
// fruta (recompensas, tienda y eventos). Las cartas sin `character`
// (js/data/cards.js) son neutrales: le salen a todos.
// Se registran igual que cualquier carta: ver js/data/cards.js.
// ============================================================

// ---------- MANZANA: golpes fuertes, Madurez y sacrificar pulpa ----------
registerCard({
    id: 'manzanazo', name: 'Manzanazo', type: 'attack', cost: 2, rarity: 'basic', character: 'manzana', fx: 'burst',
    art: '🍎', description: 'Inflige {8|10} de daño y aplica {2|3} de Magulladura.',
    effect: (ctx, U) => { ctx.attack(U(8, 10)); ctx.apply(ctx.enemy, 'vulnerable', U(2, 3)); }
});
registerCard({
    id: 'cascara_rota', name: 'Cáscara Rota', type: 'attack', cost: 1, rarity: 'common', character: 'manzana', fx: 'slash',
    art: '🍎', description: 'Inflige {8|11} de daño. Si el enemigo tenía Magulladura, gana 1 de Madurez.',
    effect: (ctx, U) => { const b = ctx.enemy.getStatus('vulnerable') > 0; ctx.attack(U(8, 11)); if (b) ctx.buff('strength', 1); }
});
registerCard({
    id: 'golpe_maduro', name: 'Golpe Maduro', type: 'attack', cost: 2, rarity: 'uncommon', character: 'manzana', fx: 'burst',
    art: '🍎', description: 'Inflige {12|14} de daño. La Madurez cuenta {3|5} veces en este golpe.',
    effect: (ctx, U) => ctx.attack(U(12, 14) + ctx.player.getStatus('strength') * (U(3, 5) - 1))
});
registerCard({
    id: 'sacrificio_pulpa', name: 'Sacrificio de Pulpa', type: 'skill', cost: 0, rarity: 'uncommon', character: 'manzana',
    art: '🩸', description: 'Pierdes 3 ❤️. Gana {2|3} de energía.',
    effect: (ctx, U) => { ctx.loseHp(3); ctx.gainEnergy(U(2, 3)); }
});
registerCard({
    id: 'tormenta_manzanas', name: 'Tormenta de Manzanas', type: 'attack', cost: 2, rarity: 'uncommon', character: 'manzana', target: 'none', fx: 'seeds',
    art: '🍎', description: 'Inflige {5|7} de daño a TODOS los enemigos dos veces.',
    effect: (ctx, U) => { ctx.attackAll(U(5, 7)); ctx.attackAll(U(5, 7)); }
});
registerCard({
    id: 'sidra_rabiosa', name: 'Sidra Rabiosa', type: 'skill', cost: 0, rarity: 'common', character: 'manzana',
    art: '🍾', description: 'Gana {2|4} de Madurez hasta el final del turno.',
    effect: (ctx, U) => { ctx.buff('strength', U(2, 4)); ctx.buff('flex', U(2, 4)); }
});
registerCard({
    id: 'fuego_interno', name: 'Fuego Interno', type: 'power', cost: 2, rarity: 'rare', character: 'manzana',
    art: '🔥', description: 'Al empezar cada turno, pierdes 1 ❤️ y ganas {2|3} de Madurez.',
    effect: (ctx, U) => ctx.buff('inner_fire', U(2, 3))
});

// ---------- PLATANÍN: cáscara que se acumula y golpes con ella ----------
registerCard({
    id: 'cascara_resbalosa', name: 'Cáscara Resbalosa', type: 'skill', cost: 1, rarity: 'basic', character: 'platanin', target: 'enemy',
    sprite: 'cascara_platano', art: '🍌', description: 'Gana {6|8} de cáscara y aplica {1|2} de Marchitez.',
    effect: (ctx, U) => { ctx.block(U(6, 8)); ctx.apply(ctx.enemy, 'weak', U(1, 2)); }
});
registerCard({
    id: 'doble_cascara', name: 'Doble Cáscara', type: 'skill', cost: 2, upCost: 1, rarity: 'uncommon', character: 'platanin',
    art: '🍌', description: 'Duplica tu cáscara.',
    effect: (ctx) => ctx.combat.gainBlock(ctx.player, ctx.player.block, false)
});
registerCard({
    id: 'racimo_firme', name: 'Racimo Firme', type: 'power', cost: 3, upCost: 2, rarity: 'rare', character: 'platanin',
    art: '🍌', description: 'Tu cáscara ya no se pierde al empezar el turno.',
    effect: (ctx) => ctx.buff('barricade', 1)
});
registerCard({
    id: 'aplaston_dorado', name: 'Aplastón Dorado', type: 'attack', cost: 2, rarity: 'uncommon', character: 'platanin', fx: 'punch',
    art: '🍌', description: 'Inflige {10|14} de daño. Gana tanta cáscara como vida le quites.',
    effect: (ctx, U) => { const r = ctx.attack(U(10, 14)); if (r.hpLoss) ctx.combat.gainBlock(ctx.player, r.hpLoss, false); }
});
registerCard({
    id: 'boomerang_platano', name: 'Bumerán de Plátano', type: 'attack', cost: 1, rarity: 'common', character: 'platanin', target: 'none', fx: 'spin',
    art: '🍌', description: 'Inflige {6|8} de daño a TODOS los enemigos y gana {4|6} de cáscara.',
    effect: (ctx, U) => { ctx.attackAll(U(6, 8)); ctx.block(U(4, 6)); }
});
registerCard({
    id: 'licuado_proteico', name: 'Licuado Proteico', type: 'skill', cost: 1, rarity: 'common', character: 'platanin',
    art: '🥤', description: 'Gana {6|8} de cáscara. Si ya tenías cáscara, roba 1 carta.',
    effect: (ctx, U) => { const had = ctx.player.block > 0; ctx.block(U(6, 8)); if (had) ctx.draw(1); }
});

// ---------- KIWI: putrefacción, pinchos y semillas ----------
registerCard({
    id: 'pelitos_toxicos', name: 'Pelitos Tóxicos', type: 'skill', cost: 1, rarity: 'basic', character: 'kiwi', target: 'enemy',
    art: '🥝', description: 'Aplica {3|5} de Putrefacción. Gana 1 de Pinchos.',
    effect: (ctx, U) => { ctx.apply(ctx.enemy, 'poison', U(3, 5)); ctx.buff('thorns', 1); }
});
registerCard({
    id: 'nube_esporas', name: 'Nube de Esporas', type: 'skill', cost: 2, upCost: 1, rarity: 'uncommon', character: 'kiwi',
    art: '🍄', description: 'Aplica 4 de Putrefacción a TODOS los enemigos.',
    effect: (ctx) => ctx.applyAll('poison', 4)
});
registerCard({
    id: 'rodaja_kiwi', name: 'Rodaja de Kiwi', type: 'attack', cost: 0, rarity: 'common', character: 'kiwi', fx: 'slash',
    art: '🥝', description: 'Inflige {4|6} de daño. Roba 1 carta.',
    effect: (ctx, U) => { ctx.attack(U(4, 6)); ctx.draw(1); }
});
registerCard({
    id: 'pelusa_defensiva', name: 'Pelusa Defensiva', type: 'skill', cost: 1, rarity: 'common', character: 'kiwi',
    art: '🥝', description: 'Gana {4|6} de cáscara y {2|3} de Pinchos.',
    effect: (ctx, U) => { ctx.block(U(4, 6)); ctx.buff('thorns', U(2, 3)); }
});

// ---------- UVA: el Viñedo (plantar brotes que se cosechan solos) ----------
registerCard({
    id: 'siembra_agria', name: 'Siembra Agria', type: 'skill', cost: 1, upCost: 0, rarity: 'basic', character: 'uva',
    art: '🍏', description: 'Planta una Uva Agria.',
    effect: (ctx) => ctx.plant('agria')
});
registerCard({
    id: 'siembra_dulce', name: 'Siembra Dulce', type: 'skill', cost: 1, rarity: 'basic', character: 'uva',
    art: '🍇', description: 'Gana {3|6} de cáscara. Planta una Uva Dulce.',
    effect: (ctx, U) => { ctx.block(U(3, 6)); ctx.plant('dulce'); }
});
registerCard({
    id: 'regar', name: 'Regar', type: 'skill', cost: 1, rarity: 'common', character: 'uva', sprite: 'regadera',
    art: '🚿', description: 'Tus brotes crecen 1. Roba {1|2} carta{|s}.',
    effect: (ctx, U) => { ctx.grow(1); ctx.draw(U(1, 2)); }
});
registerCard({
    id: 'vendimia', name: 'Vendimia', type: 'attack', cost: 1, rarity: 'common', character: 'uva', fx: 'slash',
    art: '🍇', description: 'Inflige {5|7} de daño, y otra vez por cada brote en tu viñedo.',
    effect: (ctx, U) => { const n = 1 + ctx.gardenSize(); for (let i = 0; i < n; i++) ctx.attack(U(5, 7)); }
});
registerCard({
    id: 'pasas_al_sol', name: 'Pasas al Sol', type: 'skill', cost: 1, rarity: 'common', character: 'uva', sprite: 'pasa_eterna',
    art: '🍇', description: 'Gana {3|6} de cáscara. Planta una Pasita.',
    effect: (ctx, U) => { ctx.block(U(3, 6)); ctx.plant('pasita'); }
});
registerCard({
    id: 'racimo_pisado', name: 'Racimo Pisado', type: 'attack', cost: 1, rarity: 'common', character: 'uva', fx: 'splash',
    art: '🍇', description: 'Inflige {8|11} de daño. Si tu viñedo está lleno, gana 1 de energía.',
    effect: (ctx, U) => { ctx.attack(U(8, 11)); if (ctx.gardenSize() >= window.GARDEN_SIZE) ctx.gainEnergy(1); }
});
registerCard({
    id: 'cosecha_temprana', name: 'Cosecha Temprana', type: 'skill', cost: 1, upCost: 0, rarity: 'uncommon', character: 'uva', sprite: 'tijeras_poda',
    art: '✂️', description: 'Cosecha ya todos tus brotes.',
    effect: (ctx) => ctx.harvestAll()
});
registerCard({
    id: 'plantar_parra', name: 'Plantar Parra', type: 'skill', cost: 1, rarity: 'uncommon', character: 'uva',
    art: '🌿', description: 'Planta una Parra.{| Roba 1 carta.}',
    effect: (ctx, U) => { ctx.plant('parra'); if (U(0, 1)) ctx.draw(1); }
});
registerCard({
    id: 'pisada_uvas', name: 'Pisada de Uvas', type: 'attack', cost: 2, rarity: 'uncommon', character: 'uva', target: 'none', fx: 'seeds',
    art: '🍇', description: 'Inflige {6|8} de daño a TODOS los enemigos dos veces. Tus brotes crecen 1.',
    effect: (ctx, U) => { ctx.attackAll(U(6, 8)); ctx.attackAll(U(6, 8)); ctx.grow(1); }
});
registerCard({
    id: 'tierra_fertil', name: 'Tierra Fértil', type: 'power', cost: 1, rarity: 'uncommon', character: 'uva',
    art: '🪴', description: 'Cada vez que cosechas un brote, gana {3|5} de cáscara.',
    effect: (ctx, U) => ctx.buff('fertile', U(3, 5))
});
registerCard({
    id: 'parra_trepadora', name: 'Parra Trepadora', type: 'power', cost: 2, upCost: 1, rarity: 'rare', character: 'uva',
    art: '🌿', description: 'Al empezar cada turno, planta una Uva Agria.',
    effect: (ctx) => ctx.buff('vine', 1)
});
registerCard({
    id: 'tinto_reserva', name: 'Tinto Reserva', type: 'skill', cost: 2, upCost: 1, rarity: 'rare', character: 'uva', sprite: 'tinto_final',
    art: '🍷', description: 'Planta un Tinto Reserva.',
    effect: (ctx) => ctx.plant('tinto')
});

// ---------- cartas de js/data/cards.js que pasan a ser de un personaje ----------
const EXCLUSIVE_CARDS = {
    manzana: ['explosion_acida', 'golpe_final', 'fermentacion', 'mordisco_voraz', 'sol_verano'],
    platanin: ['escudo_pulpa', 'bloqueo_total', 'cocazo', 'hueso_aguacate', 'corteza_coco', 'ensalada_escudo', 'compostar'],
    kiwi: ['cascara_venenosa', 'fruta_pasada', 'catalizador_moho', 'podredumbre_noble', 'coraza_pitahaya', 'estocada_pina',
        'siembra', 'semillero', 'racimo_furioso', 'ametralladora_semillas']
};
Object.keys(EXCLUSIVE_CARDS).forEach((ch) => EXCLUSIVE_CARDS[ch].forEach((id) => {
    registerCard(Object.assign(window.CARD_DEFS[id], { character: ch }));
}));
