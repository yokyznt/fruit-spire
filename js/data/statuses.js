// ============================================================
// STATUSES.JS — Estados (buffs y debuffs), todos con nombre frutal.
// El motor usa el `id`; la interfaz muestra `name`, `icon`/`sprite`
// y `desc(n)`. Si en el texto de una carta aparece la palabra clave
// (`word`), se resalta y su explicación sale en el tooltip.
//
// Campos:
//   id, name, word (palabra a resaltar), icon (emoji), sprite,
//   kind: 'buff' | 'debuff', cls (color del resaltado),
//   help: explicación, siempre la misma en todo el juego (la cantidad va en el título)
//   desc(n): (no se usa en los tooltips)
// La lógica de cada estado vive en js/engine/combat.js.
// ============================================================

window.STATUS_DB = {};
window.registerStatus = function (def) {
    window.STATUS_DB[def.id] = def;
};

registerStatus({
    id: 'strength', name: 'Madurez', word: 'madurez', icon: '💪', sprite: 'st_strength', kind: 'buff', cls: 'str',
    help: 'Los ataques hacen +1 de daño por cada punto.',
    desc: (n) => `Cada ataque hace ${n} de daño extra. Una fruta madura pega más fuerte.`
});
registerStatus({
    id: 'dexterity', name: 'Firmeza', word: 'firmeza', icon: '🥥', sprite: 'st_dexterity', kind: 'buff', cls: 'block',
    help: 'Las cartas de cáscara dan +1 por cada punto.',
    desc: (n) => `Cada carta que da cáscara da ${n} extra.`
});
registerStatus({
    id: 'weak', name: 'Marchitez', word: 'marchitez', icon: '🥀', sprite: 'st_weak', kind: 'debuff', cls: 'weak',
    help: 'Los ataques hacen 25% menos daño. Baja 1 cada turno.',
    desc: (n) => `Los ataques hacen 25% menos daño. Dura ${n} turno${n === 1 ? '' : 's'} más.`
});
registerStatus({
    id: 'vulnerable', name: 'Magulladura', word: 'magulladura', icon: '🎯', sprite: 'st_vulnerable', kind: 'debuff', cls: 'vuln',
    help: 'Recibe 50% más daño de los ataques. Baja 1 cada turno.',
    desc: (n) => `Recibe 50% más daño de ataques. Dura ${n} turno${n === 1 ? '' : 's'} más.`
});
registerStatus({
    id: 'frail', name: 'Blandura', word: 'blandura', icon: '🍮', sprite: 'st_frail', kind: 'debuff', cls: 'weak',
    help: 'Gana 25% menos cáscara. Baja 1 cada turno.',
    desc: (n) => `Gana 25% menos cáscara. Dura ${n} turno${n === 1 ? '' : 's'} más.`
});
registerStatus({
    id: 'poison', name: 'Putrefacción', word: 'putrefacción', icon: '🦠', sprite: 'st_poison', kind: 'debuff', cls: 'poison',
    help: 'Al final de su turno pierde 1 ❤️ por cada punto. Luego baja 1.',
    desc: (n) => `Al final de su turno pierde ${n} ❤️ y la putrefacción baja 1.`
});
registerStatus({
    id: 'thorns', name: 'Pinchos', word: 'pinchos', icon: '🌵', sprite: 'st_thorns', kind: 'buff', cls: 'str',
    help: 'Quien lo golpee recibe 1 de daño por cada punto.',
    desc: (n) => `Quien lo golpee recibe ${n} de daño por cada golpe.`
});
registerStatus({
    id: 'frozen', noCount: true, name: 'Congelado', word: 'congela', icon: '🧊', sprite: 'st_frozen', kind: 'debuff', cls: 'draw',
    help: 'Pierde su próxima acción.',
    desc: () => 'Está hecho paleta: pierde su próxima acción.'
});
registerStatus({
    id: 'regen', name: 'Fotosíntesis', word: 'fotosíntesis', icon: '🌞', sprite: 'st_regen', kind: 'buff', cls: 'heal',
    help: 'Al final de su turno recupera 1 ❤️ por cada punto. Luego baja 1.',
    desc: (n) => `Al final de su turno recupera ${n} ❤️ y la fotosíntesis baja 1.`
});
registerStatus({
    id: 'ritual', name: 'Maduración', word: 'maduración', icon: '🌅', sprite: 'st_ritual', kind: 'buff', cls: 'str',
    help: 'Al final de su turno gana 1 de Madurez por cada punto.',
    desc: (n) => `Al final de su turno gana ${n} de Madurez.`
});
registerStatus({
    id: 'plated', name: 'Corteza', word: 'corteza', icon: '🪵', sprite: 'st_plated', kind: 'buff', cls: 'block',
    help: 'Al final de su turno gana 1 de cáscara por cada punto. Baja 1 cada vez que un golpe le quita vida.',
    desc: (n) => `Al final de su turno gana ${n} de cáscara. Baja 1 cada vez que pierde vida por un golpe.`
});
registerStatus({
    id: 'sticky', name: 'Almíbar', word: 'almíbar', icon: '🍯', sprite: 'st_sticky', kind: 'debuff', cls: 'energy',
    help: 'Al empezar su próximo turno roba 1 carta menos por cada punto.',
    desc: (n) => `Está pegajoso: roba ${n} carta${n === 1 ? '' : 's'} menos al empezar su próximo turno.`
});
registerStatus({
    id: 'seeds', name: 'Semillero', word: 'semillero', icon: '🌱', sprite: 'semilla', kind: 'buff', cls: 'heal',
    help: 'Al empezar su turno recibe 1 Pepita por cada punto.',
    desc: (n) => `Al empezar su turno añade ${n} Pepita${n === 1 ? '' : 's'} a la mano.`
});
registerStatus({
    id: 'noble_rot', name: 'Moho Noble', word: 'moho noble', icon: '🍄', sprite: 'podredumbre_noble', kind: 'buff', cls: 'poison',
    help: 'Los ataques aplican 1 de Putrefacción por cada punto.',
    desc: (n) => `Cada ataque que juega aplica ${n} de Putrefacción a su objetivo.`
});

// ---------- estados de las cartas exclusivas ----------
registerStatus({
    id: 'flex', name: 'Subidón', word: 'subidón', icon: '⚡', sprite: 'sidra_rabiosa', kind: 'buff', cls: 'str',
    help: 'Madurez que se pierde al terminar el turno.',
    desc: (n) => `Tiene ${n} de Madurez extra que pierde al terminar su turno.`
});
registerStatus({
    id: 'barricade', noCount: true, name: 'Racimo Firme', word: 'racimo firme', icon: '🍌', sprite: 'racimo_firme', kind: 'buff', cls: 'block',
    help: 'La cáscara no se pierde al empezar el turno.',
    desc: () => 'La cáscara ya no se pierde al empezar su turno: se va acumulando.'
});
registerStatus({
    id: 'inner_fire', name: 'Fuego Interno', word: 'fuego interno', icon: '🔥', sprite: 'fuego_interno', kind: 'buff', cls: 'str',
    help: 'Al empezar su turno pierde 1 ❤️ y gana 1 de Madurez por cada punto.',
    desc: (n) => `Al empezar su turno pierde 1 ❤️ y gana ${n} de Madurez.`
});

registerStatus({
    id: 'fertile', name: 'Tierra Fértil', word: 'tierra fértil', icon: '🪴', sprite: 'tierra_fertil', kind: 'buff', cls: 'heal',
    help: 'Cada brote que cosecha le da 1 de cáscara por cada punto.'
});
registerStatus({
    id: 'vine', name: 'Parra Trepadora', word: 'parra trepadora', icon: '🌿', sprite: 'parra_trepadora', kind: 'buff', cls: 'heal',
    help: 'Al empezar su turno planta 1 Uva Agria por cada punto.'
});

// ============================================================
// MECÁNICAS DE ENEMIGOS (se muestran como estados en su ficha)
// ============================================================
registerStatus({
    id: 'curl', name: 'Enroscado', word: 'enroscado', icon: '🐞', sprite: 'st_curl', kind: 'buff', cls: 'block',
    help: 'La primera vez que un golpe le quita vida, gana 1 de cáscara por cada punto.'
});
registerStatus({
    id: 'wax', name: 'Cera', word: 'cera', icon: '🕯️', sprite: 'st_wax', kind: 'buff', cls: 'energy',
    help: 'Anula 1 perjuicio por cada punto.'
});
registerStatus({
    id: 'jelly', name: 'Gelatina', word: 'gelatina', icon: '🍮', sprite: 'st_jelly', kind: 'buff', cls: 'draw',
    help: 'Cada golpe le hace solo 1 de daño. Baja 1 cada turno.'
});
registerStatus({
    id: 'malleable', name: 'Pulpa Blanda', word: 'pulpa blanda', icon: '🫧', sprite: 'st_malleable', kind: 'buff', cls: 'block',
    help: 'Cada golpe que le quita vida le da 1 de cáscara por cada punto.'
});
registerStatus({
    id: 'fuse', name: 'Mecha', word: 'mecha', icon: '💣', sprite: 'st_fuse', kind: 'buff', cls: 'vuln',
    help: 'Baja 1 al final de su turno. Al llegar a 0, explota contra ti y desaparece.'
});
registerStatus({
    id: 'split', noCount: true, name: 'Divisible', word: 'divisible', icon: '✂️', sprite: 'st_split', kind: 'buff', cls: 'heal',
    help: 'Al llegar a la mitad de su vida, se parte en dos con la vida que le queda.'
});
registerStatus({
    id: 'minion', noCount: true, name: 'Esbirro', word: 'esbirro', icon: '👣', sprite: 'st_minion', kind: 'debuff', cls: 'weak',
    help: 'Si su líder muere, huye.'
});
registerStatus({
    id: 'clock', name: 'Temporizador', word: 'temporizador', icon: '⏲️', sprite: 'st_clock', kind: 'buff', cls: 'energy',
    help: 'Baja 1 con cada carta que juegas. Al llegar a 0, gana 2 de Madurez y te aplica 1 de Marchitez.'
});
registerStatus({
    id: 'cap', name: 'Coraza Dura', word: 'coraza dura', icon: '🛡️', sprite: 'st_cap', kind: 'buff', cls: 'block',
    help: 'Los golpes no le quitan más de 1 ❤️ por cada punto en cada turno.'
});
registerStatus({
    id: 'beat', name: 'Latido', word: 'latido', icon: '💓', sprite: 'st_beat', kind: 'buff', cls: 'vuln',
    help: 'Cada carta que juegas te quita 1 ❤️ por cada punto.'
});
registerStatus({
    id: 'regrow', noCount: true, name: 'Rebrote', word: 'rebrote', icon: '🌱', sprite: 'st_regrow', kind: 'buff', cls: 'heal',
    help: 'La primera vez que muere, revive con la mitad de su vida.'
});
registerStatus({
    id: 'spores', name: 'Esporas', word: 'esporas', icon: '🍄', sprite: 'st_spores', kind: 'buff', cls: 'poison',
    help: 'Al morir, te aplica 1 de Magulladura por cada punto.'
});
registerStatus({
    id: 'enrage', name: 'Enfado', word: 'enfado', icon: '💢', sprite: 'st_enrage', kind: 'buff', cls: 'str',
    help: 'Cada habilidad que juegas le da 1 de Madurez por cada punto.'
});
registerStatus({
    id: 'reflect', name: 'Espejo', word: 'espejo', icon: '🪞', sprite: 'st_reflect', kind: 'buff', cls: 'block',
    help: 'El primer perjuicio que le mandes en su turno rebota y te lo aplica a ti en su lugar. Baja 1 cada vez.',
    desc: (n) => `Los próximos ${n} perjuicio${n === 1 ? '' : 's'} que le mandes rebotan hacia ti.`
});
