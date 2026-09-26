// ============================================================
// ENEMIES.JS — Base de datos de enemigos
// Para agregar un enemigo nuevo: llama a registerEnemy({...}).
//
// Campos:
//   id, name, icon, hpMin, hpMax, isBoss
//   moves: arreglo de posibles jugadas. Cada turno el enemigo elige
//          una al azar respetando su "weight" (peso relativo).
//     tipo 'attack'       -> { type:'attack', value, hits (opcional, default 1), icon, name, weight }
//     tipo 'poison_attack'-> { type:'poison_attack', value, poison, icon, name, weight }
//     tipo 'defend'       -> { type:'defend', value, icon, name, weight }
//     tipo 'buff'         -> { type:'buff', value, icon, name, weight }   (fuerza)
//     tipo 'heal'         -> { type:'heal', value, icon, name, weight }
// ============================================================

window.ENEMY_DB = {};
window.registerEnemy = function (def) {
    window.ENEMY_DB[def.id] = def;
};

registerEnemy({
    id: 'mosca_podrida',
    name: 'Mosca Podrida',
    icon: '🪰',
    hpMin: 16, hpMax: 20,
    moves: [
        { id: 'picotazo', name: 'Picotazo', type: 'attack', value: 5, icon: '⚔️', weight: 3 },
        { id: 'zumbido', name: 'Zumbido Defensivo', type: 'defend', value: 4, icon: '🛡️', weight: 1 }
    ]
});

registerEnemy({
    id: 'cucaracha_blindada',
    name: 'Cucaracha Blindada',
    icon: '🪳',
    hpMin: 24, hpMax: 30,
    moves: [
        { id: 'embiste', name: 'Embiste', type: 'attack', value: 7, icon: '⚔️', weight: 2 },
        { id: 'endurecer', name: 'Endurecer Caparazón', type: 'buff', value: 2, icon: '💪', weight: 1 }
    ]
});

registerEnemy({
    id: 'gusano_venenoso',
    name: 'Gusano Venenoso',
    icon: '🐛',
    hpMin: 18, hpMax: 22,
    moves: [
        { id: 'mordida_toxica', name: 'Mordida Tóxica', type: 'poison_attack', value: 4, poison: 2, icon: '☠️', weight: 2 },
        { id: 'enroscarse', name: 'Enroscarse', type: 'defend', value: 6, icon: '🛡️', weight: 1 }
    ]
});

registerEnemy({
    id: 'avispa_furiosa',
    name: 'Avispa Furiosa',
    icon: '🐝',
    hpMin: 14, hpMax: 17,
    moves: [
        { id: 'doble_aguijon', name: 'Doble Aguijón', type: 'attack', value: 3, hits: 2, icon: '⚔️', weight: 2 },
        { id: 'clavada', name: 'Clavada', type: 'attack', value: 8, icon: '⚔️', weight: 1 }
    ]
});

registerEnemy({
    id: 'mango_zombie',
    name: 'Mango Zombie',
    icon: '🧟',
    hpMin: 30, hpMax: 36,
    moves: [
        { id: 'zarpazo', name: 'Zarpazo Podrido', type: 'attack', value: 9, icon: '⚔️', weight: 2 },
        { id: 'regenerar', name: 'Regenerar Pulpa', type: 'heal', value: 6, icon: '💚', weight: 1 }
    ]
});

registerEnemy({
    id: 'licuadora_suprema',
    name: 'Licuadora Suprema',
    icon: '🌀',
    hpMin: 65, hpMax: 75,
    isBoss: true,
    moves: [
        { id: 'triturar', name: 'Triturar', type: 'attack', value: 12, icon: '⚔️', weight: 2 },
        { id: 'giro_doble', name: 'Giro Doble', type: 'attack', value: 6, hits: 2, icon: '⚔️', weight: 2 },
        { id: 'sobrecarga', name: 'Sobrecarga', type: 'buff', value: 3, icon: '💪', weight: 1 }
    ]
});

// Enemigos comunes elegibles según qué tan lejos vas en el mapa
window.pickEnemyForColumn = function (x) {
    const common = ['mosca_podrida', 'cucaracha_blindada', 'gusano_venenoso', 'avispa_furiosa'];
    const tough = ['mango_zombie'];
    if (x >= 3 && Math.random() < 0.4) {
        return tough[Math.floor(Math.random() * tough.length)];
    }
    return common[Math.floor(Math.random() * common.length)];
};

window.BOSS_ID = 'licuadora_suprema';
