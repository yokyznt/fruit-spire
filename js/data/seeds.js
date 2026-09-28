// ============================================================
// SEEDS.JS — Semillas: objetos de un solo uso (como pociones).
// Tu bolsa guarda hasta SEED_SLOTS semillas. Se usan en combate, en
// tu turno, tocándolas arriba en la barra. Salen en recompensas de
// combate y en la tiendita.
//
// Campos:
//   id, name, icon, rarity: 'common' | 'uncommon' | 'rare'
//   color, mark   colores del dibujo (js/art/sprites4.js)
//   target        'enemy' si hay que elegir un enemigo
//   desc          qué hace
//   use(ctx)      efecto; ctx es el mismo de las cartas
// ============================================================

window.SEED_SLOTS = 3;
window.SEED_DB = {};
window.registerSeed = function (def) {
    window.SEED_DB[def.id] = def;
};

registerSeed({
    id: 'semilla_chile', name: 'Semilla de Chile', icon: '🌶️', rarity: 'common', color: '#E0455E', mark: 'fire', target: 'enemy',
    desc: 'Inflige 20 de daño a un enemigo.',
    use: (ctx) => ctx.attack(20)
});
registerSeed({
    id: 'semilla_fresa', name: 'Semilla de Fresa', icon: '🍓', rarity: 'common', color: '#F2667A', mark: 'heart',
    desc: 'Recupera 15 ❤️.',
    use: (ctx) => ctx.heal(15)
});
registerSeed({
    id: 'semilla_coco', name: 'Semilla de Coco', icon: '🥥', rarity: 'common', color: '#8C6A3F', mark: 'shield',
    desc: 'Gana 15 de cáscara.',
    use: (ctx) => ctx.combat.gainBlock(ctx.player, 15, false)
});
registerSeed({
    id: 'semilla_naranja', name: 'Semilla de Naranja', icon: '🍊', rarity: 'common', color: '#FFA64D', mark: 'bolt',
    desc: 'Gana 2 de energía.',
    use: (ctx) => ctx.gainEnergy(2)
});
registerSeed({
    id: 'semilla_uva', name: 'Semilla de Uva', icon: '🍇', rarity: 'common', color: '#9B7FD4', mark: 'cards',
    desc: 'Roba 3 cartas.',
    use: (ctx) => ctx.draw(3)
});
registerSeed({
    id: 'semilla_podrida', name: 'Semilla Podrida', icon: '🦠', rarity: 'common', color: '#7A6A4A', mark: 'drop', target: 'enemy',
    desc: 'Aplica 7 de Putrefacción a un enemigo.',
    use: (ctx) => ctx.apply(ctx.enemy, 'poison', 7)
});
registerSeed({
    id: 'semilla_limon', name: 'Semilla de Limón', icon: '🍋', rarity: 'uncommon', color: '#FFE27A', mark: 'swirl',
    desc: 'Aplica 2 de Marchitez a TODOS los enemigos.',
    use: (ctx) => ctx.applyAll('weak', 2)
});
registerSeed({
    id: 'semilla_sandia', name: 'Semilla de Sandía', icon: '🍉', rarity: 'uncommon', color: '#7BBF5A', mark: 'burst',
    desc: 'Inflige 10 de daño a TODOS los enemigos.',
    use: (ctx) => ctx.attackAll(10)
});
registerSeed({
    id: 'semilla_helada', name: 'Semilla Helada', icon: '🧊', rarity: 'uncommon', color: '#8FD0F0', mark: 'snow', target: 'enemy',
    desc: 'Congela a un enemigo.',
    use: (ctx) => ctx.apply(ctx.enemy, 'frozen', 1)
});
registerSeed({
    id: 'semilla_mango', name: 'Semilla de Mango', icon: '🥭', rarity: 'uncommon', color: '#FFB347', mark: 'up',
    desc: 'Gana 2 de Madurez.',
    use: (ctx) => ctx.buff('strength', 2)
});
registerSeed({
    id: 'semilla_aguacate', name: 'Semilla de Aguacate', icon: '🥑', rarity: 'rare', color: '#3E7A3A', mark: 'shield',
    desc: 'Gana 2 de Firmeza.',
    use: (ctx) => ctx.buff('dexterity', 2)
});
registerSeed({
    id: 'semilla_estrella', name: 'Semilla Estrella', icon: '⭐', rarity: 'rare', color: '#FFCF4D', mark: 'star',
    desc: 'Gana 3 de energía y roba 2 cartas.',
    use: (ctx) => { ctx.gainEnergy(3); ctx.draw(2); }
});

// Semilla al azar (las raras salen menos)
window.rollSeed = function () {
    const weight = { common: 6, uncommon: 3, rare: 1 };
    const all = Object.values(window.SEED_DB);
    let r = Math.random() * all.reduce((s, x) => s + weight[x.rarity], 0);
    for (const s of all) { r -= weight[s.rarity]; if (r <= 0) return s; }
    return all[0];
};
