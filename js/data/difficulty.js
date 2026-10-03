// ============================================================
// DIFFICULTY.JS — Niveles de dificultad ("punto de madurez")
// Se eligen al empezar una partida. Solo hay 3: la normal, una intermedia
// más difícil y una muy desafiante.
//
// Campos:
//   id, name, sprite, desc
//   mods: { hpMult, dmgBonus }   vida de los enemigos y daño extra por golpe
//   gold          oro inicial
//   restHeal      fracción de la vida máxima que curas al descansar
//   actHeal       fracción de la vida perdida que recuperas al pasar de castillo
//   floorHeal     ídem, al subir de piso dentro del mismo castillo
//   elites        casillas de élite por mapa
//   curse         maldición con la que empiezas (opcional)
// Los ids se conservan de versiones anteriores (madura / pasada / podrida)
// para no perder los grados desbloqueados ni los retos de las mascotitas.
// ============================================================

window.DIFFICULTIES = [
    {
        id: 'madura', name: 'Normal', sprite: 'dif_madura',
        desc: 'La experiencia de siempre: justa y equilibrada.',
        mods: { hpMult: 1, dmgBonus: 0 }, gold: 80, restHeal: 0.25, actHeal: 0.5, floorHeal: 0.2, elites: 3
    },
    {
        id: 'pasada', name: 'Difícil', sprite: 'dif_pasada',
        desc: 'Enemigos con 20% más de vida y +1 de daño por golpe. Más élites y menos curación.',
        mods: { hpMult: 1.2, dmgBonus: 1 }, gold: 70, restHeal: 0.22, actHeal: 0.35, floorHeal: 0.12, elites: 4
    },
    {
        id: 'podrida', name: 'Desafiante', sprite: 'dif_podrida',
        desc: 'Solo para valientes: enemigos con 45% más de vida y +2 de daño por golpe. Casi no te curas y empiezas con un Gusano Interior.',
        mods: { hpMult: 1.45, dmgBonus: 2 }, gold: 60, restHeal: 0.2, actHeal: 0.25, floorHeal: 0.05, elites: 5, curse: 'gusano_interior'
    }
];
// Grado fácil que solo usa el tutorial (no se puede elegir en el menú).
// Las partidas guardadas con el grado "verde" de versiones viejas también lo usan.
window.EASY_DIFFICULTY = {
    id: 'verde', name: 'Verde', sprite: 'dif_verde', desc: 'Solo para aprender.',
    mods: { hpMult: 0.8, dmgBonus: 0 }, gold: 130, restHeal: 0.4, actHeal: 1, floorHeal: 0.5, elites: 2
};
window.getDifficulty = function (id) {
    if (id === 'verde') return window.EASY_DIFFICULTY;
    return window.DIFFICULTIES.find((d) => d.id === id) || window.DIFFICULTIES[0];
};

// Escala extra según el piso en que estás (9 pisos en total: 3 castillos ×
// 3 pisos). Además del grado elegido, cada piso suma vida y daño a los
// enemigos, así que cada uno es más difícil que el anterior.
window.FLOOR_SCALING = [
    { hpMult: 1.00, dmgBonus: 0 }, { hpMult: 1.08, dmgBonus: 0 }, { hpMult: 1.16, dmgBonus: 1 },
    { hpMult: 1.24, dmgBonus: 1 }, { hpMult: 1.32, dmgBonus: 1 }, { hpMult: 1.40, dmgBonus: 2 },
    { hpMult: 1.48, dmgBonus: 2 }, { hpMult: 1.56, dmgBonus: 2 }, { hpMult: 1.64, dmgBonus: 3 }
];
// castle: 1-3, floor: 1-3
window.scaledMods = function (baseMods, castle, floor) {
    const i = Math.max(0, Math.min(8, ((castle || 1) - 1) * 3 + ((floor || 1) - 1)));
    const s = window.FLOOR_SCALING[i];
    return { hpMult: (baseMods.hpMult || 1) * s.hpMult, dmgBonus: (baseMods.dmgBonus || 0) + s.dmgBonus };
};
