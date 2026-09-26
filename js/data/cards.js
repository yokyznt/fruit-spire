// ============================================================
// CARDS.JS — Base de datos de cartas
// Para agregar una carta nueva: llama a registerCard({...})
// con un objeto nuevo. No hace falta tocar nada más del juego.
//
// Campos:
//   id          identificador único (string)
//   name        nombre mostrado
//   type        'attack' | 'skill' | 'power'
//   cost        energía que cuesta jugarla
//   rarity      'common' | 'uncommon' | 'rare'  (afecta cuánto sale de recompensa)
//   description texto que se muestra en la carta
//   effect(ctx) función que aplica el efecto. ctx trae:
//               ctx.player, ctx.enemy,
//               ctx.dealDamage(origen, objetivo, cantidadBase),
//               ctx.addBlock(entidad, cantidad),
//               ctx.addStatus(entidad, id, cantidad),
//               ctx.draw(n), ctx.gainEnergy(n), ctx.heal(entidad, cantidad)
// ============================================================

window.CARD_DB = {};
window.registerCard = function (def) {
    window.CARD_DB[def.id] = def;
};

// ---------- ATAQUES ----------
registerCard({
    id: 'golpe_cascara',
    name: 'Golpe de Cáscara',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    description: 'Inflige 6 de daño.',
    effect: (ctx) => ctx.dealDamage(ctx.player, ctx.enemy, 6)
});

registerCard({
    id: 'golpe_doble',
    name: 'Doble Mordida',
    type: 'attack',
    cost: 1,
    rarity: 'common',
    description: 'Inflige 4 de daño dos veces.',
    effect: (ctx) => {
        ctx.dealDamage(ctx.player, ctx.enemy, 4);
        ctx.dealDamage(ctx.player, ctx.enemy, 4);
    }
});

registerCard({
    id: 'tajo_citrico',
    name: 'Tajo Cítrico',
    type: 'attack',
    cost: 1,
    rarity: 'uncommon',
    description: 'Inflige 9 de daño.',
    effect: (ctx) => ctx.dealDamage(ctx.player, ctx.enemy, 9)
});

registerCard({
    id: 'ametralladora_semillas',
    name: 'Ametralladora de Semillas',
    type: 'attack',
    cost: 2,
    rarity: 'uncommon',
    description: 'Inflige 4 de daño tres veces.',
    effect: (ctx) => {
        for (let i = 0; i < 3; i++) ctx.dealDamage(ctx.player, ctx.enemy, 4);
    }
});

registerCard({
    id: 'explosion_acida',
    name: 'Explosión Ácida',
    type: 'attack',
    cost: 2,
    rarity: 'rare',
    description: 'Inflige 14 de daño y aplica 2 de Vulnerable.',
    effect: (ctx) => {
        ctx.dealDamage(ctx.player, ctx.enemy, 14);
        ctx.addStatus(ctx.enemy, 'vulnerable', 2);
    }
});

registerCard({
    id: 'golpe_final',
    name: 'Puré Definitivo',
    type: 'attack',
    cost: 3,
    rarity: 'rare',
    description: 'Inflige 20 de daño.',
    effect: (ctx) => ctx.dealDamage(ctx.player, ctx.enemy, 20)
});

// ---------- HABILIDADES ----------
registerCard({
    id: 'jugo_defensivo',
    name: 'Jugo Defensivo',
    type: 'skill',
    cost: 1,
    rarity: 'common',
    description: 'Gana 5 de bloqueo.',
    effect: (ctx) => ctx.addBlock(ctx.player, 5)
});

registerCard({
    id: 'escudo_pulpa',
    name: 'Escudo de Pulpa',
    type: 'skill',
    cost: 1,
    rarity: 'uncommon',
    description: 'Gana 8 de bloqueo.',
    effect: (ctx) => ctx.addBlock(ctx.player, 8)
});

registerCard({
    id: 'bloqueo_total',
    name: 'Cáscara Blindada',
    type: 'skill',
    cost: 2,
    rarity: 'uncommon',
    description: 'Gana 15 de bloqueo.',
    effect: (ctx) => ctx.addBlock(ctx.player, 15)
});

registerCard({
    id: 'cascara_venenosa',
    name: 'Cáscara Venenosa',
    type: 'skill',
    cost: 1,
    rarity: 'common',
    description: 'Aplica 3 de Veneno al enemigo.',
    effect: (ctx) => ctx.addStatus(ctx.enemy, 'poison', 3)
});

registerCard({
    id: 'maldicion_debilidad',
    name: 'Jugo Agrio',
    type: 'skill',
    cost: 1,
    rarity: 'common',
    description: 'Aplica 2 de Debilidad al enemigo.',
    effect: (ctx) => ctx.addStatus(ctx.enemy, 'weak', 2)
});

registerCard({
    id: 'mermelada_curativa',
    name: 'Mermelada Curativa',
    type: 'skill',
    cost: 1,
    rarity: 'rare',
    description: 'Recupera 8 de vida.',
    effect: (ctx) => ctx.heal(ctx.player, 8)
});

// ---------- PODERES ----------
registerCard({
    id: 'fermentacion',
    name: 'Fermentación',
    type: 'power',
    cost: 1,
    rarity: 'uncommon',
    description: 'Gana 2 de Fuerza permanente este combate.',
    effect: (ctx) => ctx.addStatus(ctx.player, 'strength', 2)
});

registerCard({
    id: 'frenesi_frutal',
    name: 'Frenesí Frutal',
    type: 'power',
    cost: 2,
    rarity: 'rare',
    description: 'Roba 2 cartas y gana 1 de energía.',
    effect: (ctx) => {
        ctx.draw(2);
        ctx.gainEnergy(1);
    }
});
