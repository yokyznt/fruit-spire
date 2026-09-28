// ============================================================
// SPROUTS.JS — Brotes del Viñedo de la Uva.
// La Uva tiene 3 surcos. Sus cartas "plantan" brotes; al empezar cada
// turno tuyo, todos los brotes crecen 1 y los que llegan a 0 se
// cosechan solos (hacen su efecto y dejan libre el surco).
// Si plantas con el viñedo lleno, se cosecha antes el brote más viejo.
//
// Campos:
//   id, name, word (palabra a resaltar), sprite, icon
//   time      turnos que tarda en cosecharse
//   effect    qué hace al cosecharse, en minúscula ('gana 10 de cáscara.')
//   help      frase completa para los tooltips ('En 2 turnos, gana 10 de cáscara.')
//   harvest(ctx)  efecto; ctx es el mismo de las cartas
// ============================================================

window.GARDEN_SIZE = 3;
window.SPROUT_DB = {};
window.registerSprout = function (def) {
    window.SPROUT_DB[def.id] = def;
};

registerSprout({
    id: 'pasita', name: 'Pasita', word: 'pasita', sprite: 'pasa_eterna', icon: '🍇', time: 1,
    effect: 'roba 2 cartas.',
    help: 'En 1 turno, roba 2 cartas.',
    harvest: (ctx) => ctx.draw(2)
});
registerSprout({
    id: 'agria', name: 'Uva Agria', word: 'uva agria', sprite: 'brote_agria', icon: '🍏', time: 2,
    effect: 'inflige 12 de daño a un enemigo al azar.',
    help: 'En 2 turnos, inflige 12 de daño a un enemigo al azar.',
    harvest: (ctx) => ctx.attackRandom(12)
});
registerSprout({
    id: 'dulce', name: 'Uva Dulce', word: 'uva dulce', sprite: 'brote_dulce', icon: '🍇', time: 2,
    effect: 'gana 10 de cáscara.',
    help: 'En 2 turnos, gana 10 de cáscara.',
    harvest: (ctx) => ctx.combat.gainBlock(ctx.player, 10, false)
});
registerSprout({
    id: 'parra', name: 'Parra', word: 'parra', sprite: 'brote_parra', icon: '🌿', time: 3,
    effect: 'gana 2 de energía.',
    help: 'En 3 turnos, gana 2 de energía.',
    harvest: (ctx) => ctx.gainEnergy(2)
});
registerSprout({
    id: 'tinto', name: 'Tinto Reserva', word: 'tinto reserva', sprite: 'tinto_final', icon: '🍷', time: 4,
    effect: 'inflige 30 de daño a TODOS los enemigos.',
    help: 'En 4 turnos, inflige 30 de daño a TODOS los enemigos.',
    harvest: (ctx) => ctx.attackAll(30)
});
