// ============================================================
// DIFFICULTY.JS — Niveles de dificultad ("punto de madurez")
// Se eligen al empezar una partida.
//
// Campos:
//   id, name, sprite, desc
//   mods: { hpMult, dmgBonus }   vida de los enemigos y daño extra por golpe
//   gold          oro inicial
//   restHeal      fracción de la vida máxima que curas al descansar
//   actHeal       fracción de la vida perdida que recuperas al pasar de nivel
//   elites        casillas de élite por mapa
//   curse         maldición con la que empiezas (opcional)
// ============================================================

window.DIFFICULTIES = [
    {
        id: 'verde', name: 'Verde', sprite: 'dif_verde',
        desc: 'Enemigos con 20% menos de vida. Más oro al empezar.',
        mods: { hpMult: 0.8, dmgBonus: 0 }, gold: 130, restHeal: 0.4, actHeal: 1, elites: 2
    },
    {
        id: 'madura', name: 'Madura', sprite: 'dif_madura',
        desc: 'La experiencia normal.',
        mods: { hpMult: 1, dmgBonus: 0 }, gold: 99, restHeal: 0.3, actHeal: 0.6, elites: 3
    },
    {
        id: 'pasada', name: 'Pasada', sprite: 'dif_pasada',
        desc: 'Enemigos con 15% más de vida y +1 de daño por golpe. Más élites.',
        mods: { hpMult: 1.15, dmgBonus: 1 }, gold: 80, restHeal: 0.3, actHeal: 0.4, elites: 4
    },
    {
        id: 'podrida', name: 'Podrida', sprite: 'dif_podrida',
        desc: 'Enemigos con 30% más de vida y +2 de daño por golpe. Curas menos. Empiezas con un Gusano Interior.',
        mods: { hpMult: 1.3, dmgBonus: 2 }, gold: 60, restHeal: 0.2, actHeal: 0.25, elites: 5, curse: 'gusano_interior'
    }
];
window.getDifficulty = function (id) {
    return window.DIFFICULTIES.find((d) => d.id === id) || window.DIFFICULTIES[1];
};

// Escala extra por nivel del mapa (1, 2 o 3): además del grado de madurez
// elegido, cada nivel suma vida y daño a los enemigos.
window.ACT_SCALING = [
    { hpMult: 1, dmgBonus: 0 },
    { hpMult: 1.18, dmgBonus: 1 },
    { hpMult: 1.38, dmgBonus: 2 }
];
window.scaledMods = function (baseMods, act) {
    const s = window.ACT_SCALING[(act || 1) - 1] || window.ACT_SCALING[window.ACT_SCALING.length - 1];
    return { hpMult: (baseMods.hpMult || 1) * s.hpMult, dmgBonus: (baseMods.dmgBonus || 0) + s.dmgBonus };
};
