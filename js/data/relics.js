// ============================================================
// RELICS.JS — Reliquias (objetos pasivos)
// Para agregar una: registerRelic({...}). Todos los hooks son opcionales.
//
// Campos:
//   id, name, icon, description
//   tier: 'common' | 'uncommon' | 'rare' | 'boss'
//         (las de jefe salen solo al vencer a un jefe; tienen truco)
//   drawBonus: cartas extra (o menos) que robas cada turno
//   noRest: true → en los campamentos ya no puedes descansar
//
// Hooks (ctx es el mismo de las cartas, más):
//   ctx.state   objeto propio de la reliquia, se reinicia cada combate
//   ctx.persist objeto propio que dura toda la partida
//   ctx.flash() hace brillar la reliquia en pantalla
//   onPickup(player)              al obtenerla
//   onCombatStart(ctx)            al empezar cada combate
//   onTurnStart(ctx)              al empezar cada turno tuyo
//   onTurnEnd(ctx)                al terminar cada turno tuyo
//   onCardPlayed(ctx, card)       después de jugar una carta
//   onExhaust(ctx, card)          cuando una carta se consume (va al compost)
//   onEnemyDeath(ctx, enemy)      cuando muere un enemigo
//   onHpLoss(ctx, amount)         cuando pierdes PV
//   onCombatEnd(player)           al ganar un combate
//   onRest(player) → número       PV extra al descansar
// Arte: sprite con el mismo id en js/art/sprites.js (si no, el emoji).
// ============================================================

window.RELIC_DB = {};
window.registerRelic = function (def) {
    window.RELIC_DB[def.id] = Object.assign({ tier: 'common' }, def);
};

// ---------- comunes ----------
registerRelic({
    id: 'corazon_sandia', name: 'Corazón de Sandía', icon: '🍉', tier: 'common',
    description: '+8 de vida máxima.',
    onPickup: (player) => { player.maxHp += 8; player.hp += 8; }
});
registerRelic({
    id: 'diente_ajo', name: 'Diente de Ajo', icon: '🧄', tier: 'common',
    description: 'Empiezas cada combate con 6 de cáscara.',
    onCombatStart: (ctx) => { ctx.combat.gainBlock(ctx.player, 6, false); ctx.flash(); }
});
registerRelic({
    id: 'cascara_platano', name: 'Cáscara de Plátano', icon: '🍌', tier: 'common',
    description: 'Los enemigos empiezan cada combate con 1 de Marchitez.',
    onCombatStart: (ctx) => { ctx.applyAll('weak', 1); ctx.flash(); }
});
registerRelic({
    id: 'miel_curativa', name: 'Frasco de Miel', icon: '🍯', tier: 'common',
    description: 'Al ganar un combate, recuperas 5 ❤️.',
    onCombatEnd: (player) => player.heal(5)
});
registerRelic({
    id: 'tijeras_poda', name: 'Tijeras de Podar', icon: '✂️', tier: 'common',
    description: 'Al empezar cada combate, aplica 1 de Magulladura a todos los enemigos.',
    onCombatStart: (ctx) => { ctx.applyAll('vulnerable', 1); ctx.flash(); }
});
registerRelic({
    id: 'corona_pina', name: 'Corona de Piña', icon: '🍍', tier: 'common',
    description: 'Empiezas cada combate con 3 de Pinchos.',
    onCombatStart: (ctx) => { ctx.buff('thorns', 3); ctx.flash(); }
});
registerRelic({
    id: 'saco_abono', name: 'Saco de Abono', icon: '🌱', tier: 'common',
    description: 'Al empezar cada combate, recibes 2 Pepitas.',
    onTurnStart: (ctx) => { if (ctx.combat.turnNumber === 1) { ctx.addToHand('semilla', 2); ctx.flash(); } }
});
registerRelic({
    id: 'regadera', name: 'Regadera', icon: '🚿', tier: 'common',
    description: 'Descansar cura 12 ❤️ extra.',
    onRest: () => 12
});

// ---------- poco comunes ----------
registerRelic({
    id: 'hueso_durazno', name: 'Hueso de Durazno', icon: '🍑', tier: 'uncommon',
    description: 'Cada 3 ataques en un turno, gana 1 de energía.',
    onTurnStart: (ctx) => { ctx.state.attacks = 0; },
    onCardPlayed: (ctx, card) => {
        if (card.type !== 'attack') return;
        ctx.state.attacks = (ctx.state.attacks || 0) + 1;
        if (ctx.state.attacks % 3 === 0) { ctx.gainEnergy(1); ctx.flash(); }
    }
});
registerRelic({
    id: 'compostera', name: 'Compostera', icon: '🪱', tier: 'uncommon',
    description: 'Cada vez que se consume una carta, gana 3 de cáscara.',
    onExhaust: (ctx) => { ctx.combat.gainBlock(ctx.player, 3, false); ctx.flash(); }
});
registerRelic({
    id: 'limon_contagioso', name: 'Limón Contagioso', icon: '🍋', tier: 'uncommon',
    description: 'Cuando un enemigo muere, su Putrefacción pasa a otro enemigo.',
    onEnemyDeath: (ctx, enemy) => {
        const p = enemy.getStatus('poison');
        const others = ctx.combat.aliveEnemies();
        if (!p || !others.length) return;
        ctx.apply(others[Math.floor(Math.random() * others.length)], 'poison', p);
        ctx.flash();
    }
});
registerRelic({
    id: 'hueso_mango', name: 'Hueso de Mango', icon: '🥭', tier: 'uncommon',
    description: 'Si terminas tu turno sin cáscara, ganas 6 de cáscara.',
    onTurnEnd: (ctx) => { if (ctx.player.block === 0) { ctx.combat.gainBlock(ctx.player, 6, false); ctx.flash(); } }
});
registerRelic({
    id: 'caparazon_caracol', name: 'Caparazón de Caracol', icon: '🐌', tier: 'uncommon',
    description: 'Empiezas cada combate con 4 de Corteza.',
    onCombatStart: (ctx) => { ctx.buff('plated', 4); ctx.flash(); }
});
registerRelic({
    id: 'nuez_dura', name: 'Nuez Dura', icon: '🌰', tier: 'uncommon',
    description: 'Recibes 1 de daño menos por golpe.'
});
registerRelic({
    id: 'canasta_tejida', name: 'Canasta Tejida', icon: '🧺', tier: 'uncommon',
    description: 'Al terminar tu turno, tu carta más cara se queda en tu mano.'
});

// ---------- raras ----------
registerRelic({
    id: 'brote_eterno', name: 'Brote Eterno', icon: '🌿', tier: 'rare',
    description: 'La primera vez por combate que bajas de la mitad de tu vida, ganas 3 de Madurez y 10 de cáscara.',
    onHpLoss: (ctx) => {
        if (ctx.state.done || ctx.player.hp > ctx.player.maxHp / 2 || ctx.player.hp <= 0) return;
        ctx.state.done = true;
        ctx.buff('strength', 3);
        ctx.combat.gainBlock(ctx.player, 10, false);
        ctx.flash();
    }
});
registerRelic({
    id: 'chile_picante', name: 'Chile Picante', icon: '🌶️', tier: 'rare',
    description: 'Cada 10 cartas que juegas, inflige 10 de daño a todos los enemigos.',
    onCardPlayed: (ctx) => {
        ctx.persist.n = (ctx.persist.n || 0) + 1;
        if (ctx.persist.n < 10) return;
        ctx.persist.n = 0;
        ctx.flash();
        // daño fijo: no lo cambian Madurez ni Magulladura
        ctx.combat.aliveEnemies().forEach((e) => {
            e.takeDamage(10);
            ctx.combat.pushEvent('damage', e, 10, { thorns: true });
            if (!e.isAlive()) ctx.combat.onEnemyDeath(e);
        });
    }
});
registerRelic({
    id: 'frasco_almibar', name: 'Frasco de Almíbar', icon: '🫙', tier: 'rare',
    description: 'Tu primer ataque de cada combate hace el doble de daño.'
});

// ---------- de jefe (con truco) ----------
registerRelic({
    id: 'semilla_dorada', name: 'Pepita Dorada', icon: '✨', tier: 'boss',
    description: '+1 de energía cada turno.',
    onTurnStart: (ctx) => { ctx.gainEnergy(1); }
});
registerRelic({
    id: 'reloj_frutal', name: 'Reloj Frutal', icon: '⏰', tier: 'boss',
    description: 'Robas 1 carta extra cada turno.',
    drawBonus: 1
});
registerRelic({
    id: 'exprimidor_dorado', name: 'Exprimidor Dorado', icon: '🏆', tier: 'boss',
    description: '+1 de energía por turno. Robas 1 carta menos.',
    drawBonus: -1,
    onPickup: (player) => { player.maxEnergy += 1; }
});
registerRelic({
    id: 'ojo_papaya', name: 'Ojo de Papaya', icon: '👁️', tier: 'boss',
    description: '+1 de energía por turno. Empiezas cada combate con 2 de Marchitez.',
    onPickup: (player) => { player.maxEnergy += 1; },
    onCombatStart: (ctx) => { ctx.buff('weak', 2); }
});
registerRelic({
    id: 'corazon_durian', name: 'Corazón de Durián', icon: '💚', tier: 'boss',
    description: '+25 de vida máxima. Ya no puedes descansar en campamentos.',
    noRest: true,
    onPickup: (player) => { player.maxHp += 25; player.hp += 25; }
});
registerRelic({
    id: 'savia_arce', name: 'Savia de Arce', icon: '🍁', tier: 'boss',
    description: 'La energía que no gastes pasa a tu siguiente turno.',
    onTurnEnd: (ctx) => { ctx.state.carry = ctx.player.energy; },
    onTurnStart: (ctx) => { if (ctx.state.carry) { ctx.gainEnergy(ctx.state.carry); ctx.state.carry = 0; ctx.flash(); } }
});
