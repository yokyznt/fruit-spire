// ============================================================
// SEEDS.JS — Semillas: objetos de un solo uso (como pociones).
// Tu bolsa guarda hasta SEED_SLOTS semillas. Se usan en combate, en
// tu turno, desde la mochila (js/inventory.js). Salen en recompensas de
// combate, en la tiendita y en algunos eventos.
// Cada semilla tiene un efecto ÚNICO (nada de "pociones" genéricas).
//
// Campos:
//   id, name, icon, rarity: 'common' | 'uncommon' | 'rare'
//   color, mark   colores del dibujo (js/render.js → SEED_MARKS)
//   target        'enemy' si hay que elegir un enemigo
//   desc          qué hace
//   use(ctx)      efecto; ctx es el mismo de las cartas, más
//                 ctx.combat (el motor). combat.lastPlayed = última carta jugada.
// ============================================================

window.SEED_SLOTS = 3;
window.SEED_DB = {};
window.registerSeed = function (def) {
    window.SEED_DB[def.id] = def;
};

(function () {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];

    // ---------- comunes ----------
    registerSeed({
        id: 'semilla_chile', name: 'Semilla Volcán', icon: '🌋', rarity: 'common', color: '#E0455E', mark: 'fire', target: 'enemy',
        desc: 'Inflige 20 de daño a un enemigo. Si lo derrota, ganas 1 de energía.',
        use: (ctx) => { const r = ctx.attack(20); if (r.killed) ctx.gainEnergy(1); }
    });
    registerSeed({
        id: 'semilla_fresa', name: 'Semilla Vampiro', icon: '🧛', rarity: 'common', color: '#C8374F', mark: 'heart', target: 'enemy',
        desc: 'Inflige 10 de daño a un enemigo y recuperas la vida que le quites.',
        use: (ctx) => { const r = ctx.attack(10); if (r.hpLoss > 0) ctx.heal(r.hpLoss); }
    });
    registerSeed({
        id: 'semilla_coco', name: 'Semilla Caparazón', icon: '🥥', rarity: 'common', color: '#8C6A3F', mark: 'shield',
        desc: 'Duplica tu cáscara actual y suma 8 más.',
        use: (ctx) => ctx.combat.gainBlock(ctx.player, ctx.player.block + 8, false)
    });
    registerSeed({
        id: 'semilla_naranja', name: 'Semilla del Amanecer', icon: '🌅', rarity: 'common', color: '#FFA64D', mark: 'bolt',
        desc: 'Recarga tu energía al máximo y ganas 1 extra.',
        use: (ctx) => ctx.gainEnergy(Math.max(0, ctx.player.maxEnergy - ctx.player.energy) + 1)
    });
    registerSeed({
        id: 'semilla_uva', name: 'Semilla Barajadora', icon: '🔀', rarity: 'common', color: '#9B7FD4', mark: 'cards',
        desc: 'Descartas tu mano y robas 2 cartas más de las que tenías.',
        use: (ctx) => {
            const p = ctx.player, n = p.hand.length;
            p.discardPile.push(...p.hand);
            p.hand = [];
            ctx.draw(Math.min(10, n + 2));
        }
    });
    registerSeed({
        id: 'semilla_podrida', name: 'Semilla de Moho', icon: '🦠', rarity: 'common', color: '#7A6A4A', mark: 'drop', target: 'enemy',
        desc: 'Duplica la Putrefacción de un enemigo (mínimo +6).',
        use: (ctx) => ctx.apply(ctx.enemy, 'poison', Math.max(6, ctx.enemy.getStatus('poison')))
    });
    registerSeed({
        id: 'semilla_suerte', name: 'Semilla de la Suerte', icon: '🍀', rarity: 'common', color: '#5CC9A7', mark: 'dice',
        desc: 'Recibes 3 Pepitas en tu mano y robas 1 carta.',
        use: (ctx) => { ctx.addToHand('semilla', 3); ctx.draw(1); }
    });
    registerSeed({
        id: 'semilla_cactus', name: 'Semilla Cactus', icon: '🌵', rarity: 'common', color: '#5DA33E', mark: 'spikes',
        desc: 'Ganas 6 de Pinchos. Duran todo el combate.',
        use: (ctx) => ctx.buff('thorns', 6)
    });

    // ---------- poco comunes ----------
    registerSeed({
        id: 'semilla_limon', name: 'Semilla Ácida', icon: '🍋', rarity: 'uncommon', color: '#FFE27A', mark: 'swirl',
        desc: 'Quita toda la cáscara a TODOS los enemigos y les aplica 2 de Blandura.',
        use: (ctx) => { ctx.enemies.forEach((e) => { e.block = 0; }); ctx.applyAll('frail', 2); }
    });
    registerSeed({
        id: 'semilla_sandia', name: 'Semilla Bomba', icon: '💥', rarity: 'uncommon', color: '#7BBF5A', mark: 'burst',
        desc: 'Inflige 8 de daño a TODOS. Los que queden con 6 ❤️ o menos, mueren.',
        use: (ctx) => {
            ctx.attackAll(8);
            ctx.combat.aliveEnemies().forEach((e) => {
                if (e.hp > 6) return;
                const left = e.hp;
                e.hp = 0;
                ctx.combat.pushEvent('damage', e, left, { thorns: true });
                ctx.combat.onEnemyDeath(e);
            });
        }
    });
    registerSeed({
        id: 'semilla_helada', name: 'Semilla Escarcha Eterna', icon: '🧊', rarity: 'uncommon', color: '#8FD0F0', mark: 'snow', target: 'enemy',
        desc: 'Congela a un enemigo y le aplica 2 de Magulladura.',
        use: (ctx) => { ctx.apply(ctx.enemy, 'frozen', 1); ctx.apply(ctx.enemy, 'vulnerable', 2); }
    });
    registerSeed({
        id: 'semilla_mango', name: 'Semilla Rabiosa', icon: '🥭', rarity: 'uncommon', color: '#FFB347', mark: 'up',
        desc: 'Ganas 4 de Madurez hasta el final del turno.',
        use: (ctx) => { ctx.buff('strength', 4); ctx.buff('flex', 4); }
    });
    registerSeed({
        id: 'semilla_loca', name: 'Semilla Loca', icon: '🎲', rarity: 'uncommon', color: '#E58CCB', mark: 'dice',
        desc: 'Aplica un perjuicio al azar a TODOS los enemigos (¡sorpresa!).',
        use: (ctx) => { const s = pick(['weak', 'vulnerable', 'frail', 'poison']); ctx.applyAll(s, s === 'poison' ? 6 : 3); }
    });
    registerSeed({
        id: 'semilla_espejo', name: 'Semilla Espejo', icon: '🪞', rarity: 'uncommon', color: '#BFD9E8', mark: 'mirror',
        desc: 'Copia en tu mano la última carta que jugaste (si no jugaste ninguna, robas 2).',
        use: (ctx) => { const id = ctx.combat.lastPlayed; if (id) ctx.addToHand(id, 1); else ctx.draw(2); }
    });
    registerSeed({
        id: 'semilla_jardinera', name: 'Semilla Jardinera', icon: '🌷', rarity: 'uncommon', color: '#F08FB4', mark: 'flower',
        desc: 'Planta 2 brotes de Uva Agria en tu viñedo (¡cualquier fruta puede tener uno!).',
        use: (ctx) => { ctx.plant('agria'); ctx.plant('agria'); }
    });
    registerSeed({
        id: 'semilla_fantasma', name: 'Semilla Fantasma', icon: '👻', rarity: 'uncommon', color: '#D9D4F0', mark: 'ghost',
        desc: 'Te vuelves intangible: el próximo golpe que recibas no te hace daño.',
        use: (ctx) => ctx.buff('ghost', 1)
    });

    // ---------- raras ----------
    registerSeed({
        id: 'semilla_aguacate', name: 'Semilla Blindada', icon: '🥑', rarity: 'rare', color: '#3E7A3A', mark: 'shield',
        desc: 'Ganas 2 de Firmeza y 10 de cáscara.',
        use: (ctx) => { ctx.buff('dexterity', 2); ctx.combat.gainBlock(ctx.player, 10, false); }
    });
    registerSeed({
        id: 'semilla_estrella', name: 'Semilla Estrella', icon: '⭐', rarity: 'rare', color: '#FFCF4D', mark: 'star',
        desc: 'Gana 3 de energía y roba 2 cartas.',
        use: (ctx) => { ctx.gainEnergy(3); ctx.draw(2); }
    });
    registerSeed({
        id: 'semilla_tiempo', name: 'Semilla del Tiempo', icon: '⏳', rarity: 'rare', color: '#7FB8D9', mark: 'clock',
        desc: 'Congela a TODOS los enemigos, pero el próximo turno robas 2 cartas menos.',
        use: (ctx) => { ctx.applyAll('frozen', 1); ctx.buff('sticky', 2); }
    });
    registerSeed({
        id: 'semilla_sacrificio', name: 'Semilla del Sacrificio', icon: '🩸', rarity: 'rare', color: '#8E2B3D', mark: 'skull',
        desc: 'Pierdes 6 ❤️: ganas 3 de energía y 2 de Madurez.',
        use: (ctx) => {
            const lose = Math.min(6, ctx.player.hp - 1);
            if (lose > 0) ctx.loseHp(lose);
            ctx.gainEnergy(3);
            ctx.buff('strength', 2);
        }
    });
})();

// Semilla al azar (las raras salen menos)
window.rollSeed = function () {
    const weight = { common: 6, uncommon: 3, rare: 1 };
    const all = Object.values(window.SEED_DB);
    let r = Math.random() * all.reduce((s, x) => s + weight[x.rarity], 0);
    for (const s of all) { r -= weight[s.rarity]; if (r <= 0) return s; }
    return all[0];
};
