// ============================================================
// CHARACTERS.JS — Personajes jugables. Cada fruta tiene una habilidad
// pasiva, un estilo de juego y sus propias cartas (las que tienen
// `character: 'id'` en js/data/cards_characters.js). Su baraja inicial
// está en js/data/starter.js.
// Para agregar uno nuevo, llama a registerCharacter({...}).
//   style        resumen del estilo de juego
//   description  habilidad pasiva
// Hooks opcionales:
//   onCombatStart(combat)          al empezar cada combate
//   onCombatEnd(player)            al ganar un combate
//   onGainBlock(player, amount)    modifica cuánta cáscara recibe
//   onPlayerDamaged(player,enemy)  cuando un enemigo le quita vida
// Arte: sprite con el mismo id en js/art/sprites.js (si no, el emoji).
// ============================================================

window.CHARACTER_DB = {};
window.registerCharacter = function (def) {
    window.CHARACTER_DB[def.id] = def;
};

registerCharacter({
    id: 'manzana',
    name: 'Manzana',
    icon: '🍎',
    baseHp: 72,
    style: 'Golpes fuertes, Madurez y sacrificar pulpa.',
    description: 'Al ganar un combate, recupera 6 ❤️.',
    onCombatEnd: (player) => { player.heal(6); }
});

registerCharacter({
    id: 'platanin',
    name: 'Platanín',
    icon: '🍌',
    baseHp: 68,
    style: 'Cáscara que se acumula y golpes con ella.',
    description: 'Sus cartas de cáscara dan 2 extra.',
    onGainBlock: (player, amount) => amount + 2
});

registerCharacter({
    id: 'kiwi',
    name: 'Kiwi',
    icon: '🥝',
    baseHp: 60,
    style: 'Putrefacción, pinchos y semillas.',
    description: 'Si un enemigo le quita vida, ese enemigo recibe 2 de daño.',
    onPlayerDamaged: (player, enemy) => { enemy.takeDamage(2); }
});

registerCharacter({
    id: 'uva',
    name: 'Uva',
    icon: '🍇',
    baseHp: 68,
    style: 'Planta brotes que se cosechan solos unos turnos después.',
    description: 'Tiene un viñedo de 3 surcos. Empieza cada combate con una Uva Agria plantada.',
    onCombatStart: (combat) => { combat.plant('agria'); }
});
