// ============================================================
// STARTER.JS — Baraja inicial de cada personaje
// 4 golpes y 4 defensas para todos, más la carta de firma de cada fruta.
// ============================================================
window.STARTER_BASE = [
    'golpe_cascara', 'golpe_cascara', 'golpe_cascara', 'golpe_cascara',
    'jugo_defensivo', 'jugo_defensivo', 'jugo_defensivo', 'jugo_defensivo'
];
window.STARTER_DECK = window.STARTER_BASE; // compatibilidad
window.STARTER_SIGNATURE = {
    manzana: ['manzanazo'],
    platanin: ['cascara_resbalosa'],
    kiwi: ['pelitos_toxicos'],
    uva: ['siembra_agria', 'siembra_dulce']
};
window.starterDeckFor = function (charId) {
    return [...window.STARTER_BASE, ...(window.STARTER_SIGNATURE[charId] || [])];
};
