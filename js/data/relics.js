// ============================================================
// RELICS.JS — Base de datos de reliquias (ítems pasivos)
// Para agregar una reliquia nueva: llama a registerRelic({...}).
//
// Campos:
//   id, name, icon, description
//   onPickup(player)          se ejecuta una vez al obtenerla
//   onCombatStart(player,combat)   al iniciar cada combate
//   onPlayerTurnStart(player,combat)  al iniciar cada turno del jugador
// Todos los hooks son opcionales — pon solo los que necesites.
// ============================================================

window.RELIC_DB = {};
window.registerRelic = function (def) {
    window.RELIC_DB[def.id] = def;
};

registerRelic({
    id: 'corazon_sandia',
    name: 'Corazón de Sandía',
    icon: '🍉',
    description: '+8 de vida máxima al obtenerla.',
    onPickup: (player) => {
        player.maxHp += 8;
        player.hp += 8;
    }
});

registerRelic({
    id: 'diente_ajo',
    name: 'Diente de Ajo',
    icon: '🧄',
    description: 'Empiezas cada combate con 5 de bloqueo.',
    onCombatStart: (player) => player.addBlock(5)
});

registerRelic({
    id: 'cascara_platano',
    name: 'Cáscara de Plátano',
    icon: '🍌',
    description: 'El enemigo empieza cada combate con 1 de Debilidad.',
    onCombatStart: (player, combat) => combat.enemy.addStatus('weak', 1)
});

registerRelic({
    id: 'semilla_dorada',
    name: 'Semilla Dorada',
    icon: '✨',
    description: '+1 de energía cada turno.',
    onPlayerTurnStart: (player) => { player.energy += 1; }
});

registerRelic({
    id: 'miel_curativa',
    name: 'Frasco de Miel',
    icon: '🍯',
    description: 'Recuperas 3 de vida al iniciar cada combate.',
    onCombatStart: (player) => player.heal(3)
});

registerRelic({
    id: 'reloj_frutal',
    name: 'Reloj Frutal',
    icon: '⏰',
    description: 'Robas 1 carta extra cada turno.',
    onPlayerTurnStart: (player, combat) => combat.drawCards(1)
});
