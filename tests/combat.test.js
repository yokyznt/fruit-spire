// Valida temas/castillos y simula combates al azar contra TODOS los enemigos (IA, jugadas, estados, reglas de piso).
// Uso: node tests/combat.test.js
// Carga los datos y el motor, valida los temas/castillos y juega combates al azar
// contra TODOS los enemigos para cazar errores de IA, jugadas y estados.
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const load = (f) => require(path.join(root, f));
const files = [
    'js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js',
    'js/data/relics.js', 'js/data/relics_indie.js', 'js/data/events.js', 'js/data/characters.js', 'js/data/difficulty.js',
    'js/engine/entities.js', 'js/engine/combat.js'
];
const fs = require('fs');
files.forEach((f) => { if (fs.existsSync(path.join(root, f))) load(f); });
// cosmetics (mascotas) se usan en combate
try { load('js/data/cosmetics.js'); } catch (e) { global.petFor = () => null; }

let problems = 0;
const bad = (msg) => { problems++; if (problems < 40) console.log('PROBLEMA:', msg); };

// ---- 1) los temas y castillos apuntan a enemigos que existen ----
const E = window.ENEMY_DB;
Object.values(window.FLOOR_THEMES).forEach((t) => {
    [...t.weak, ...t.normal, ...t.elites].forEach((g) => g.forEach((id) => { if (!E[id]) bad(`tema ${t.id}: enemigo ${id} no existe`); }));
    t.bosses.forEach((id) => { if (!E[id]) bad(`tema ${t.id}: jefe ${id} no existe`); else if (E[id].tier !== 'boss') bad(`tema ${t.id}: ${id} no es tier boss`); });
    if (!t.weak.length || !t.normal.length || !t.elites.length) bad(`tema ${t.id}: pools vacíos`);
});
window.CASTLES.forEach((c) => {
    c.bosses.forEach((id) => { if (!E[id]) bad(`castillo ${c.n}: jefe ${id} no existe`); });
    (c.fixed || c.pool).forEach((id) => { if (!window.FLOOR_THEMES[id]) bad(`castillo ${c.n}: tema ${id} no existe`); });
    c.sizes.forEach(([cols, rows]) => { if (cols < 8 || rows < 3) bad('tamaño raro'); });
});
for (let i = 0; i < 200; i++) {
    const plan = window.planRun();
    if (!window.planIsValid(plan)) bad('plan inválido ' + JSON.stringify(plan));
    if (plan[1].slice().sort().join() !== 'ajedrez,dados,poker') bad('castillo 2 debe tener dados/póker/ajedrez');
    if (plan[2][2] !== 'torre_rey') bad('castillo 3 debe terminar en la torre del rey');
    if (new Set(plan[0]).size !== 3 || new Set(plan[2]).size !== 3) bad('temas repetidos ' + JSON.stringify(plan));
}
// jefes de cada piso
window.CASTLES.forEach((c) => {
    for (let f = 1; f <= 3; f++) {
        const plan = window.planRun();
        const theme = window.floorThemeId(plan, c.n, f);
        const b = window.pickBoss(c.n, f, theme);
        if (!E[b]) bad(`pickBoss ${c.n}/${f}/${theme} -> ${b}`);
    }
});

// ---- 2) simulación de combates contra cada enemigo ----
const P = () => {
    const p = new window.Player();
    const ch = ['manzana', 'platanin', 'kiwi', 'uva'][Math.floor(Math.random() * 4)];
    p.characterId = ch;
    p.maxHp = p.hp = 90;
    p.deck = window.starterDeckFor(ch);
    // mazo con más variedad
    const pool = Object.values(window.CARD_DB).filter((c) => (!c.character || c.character === ch) && c.rarity !== 'token' && c.type !== 'curse' && c.type !== 'status');
    for (let i = 0; i < 12; i++) p.deck.push(pool[Math.floor(Math.random() * pool.length)].id);
    return p;
};
const ids = Object.keys(E);
let fights = 0, wins = 0, exceptions = 0;
function fight(defIds, mods) {
    const p = P();
    // objetos al azar
    const relics = Object.keys(window.RELIC_DB || {});
    for (let i = 0; i < Math.floor(Math.random() * 6) && relics.length; i++) p.relics.push(relics[Math.floor(Math.random() * relics.length)]);
    p.relics.forEach((rid) => { const r = window.RELIC_DB[rid]; if (r.onPickup) r.onPickup(p); });
    let result = null;
    const themes = Object.values(window.FLOOR_THEMES); const combat = new window.Combat(p, defIds.map((id) => E[id]), () => {}, (r) => { result = r; }, { mods, rule: themes[Math.floor(Math.random() * themes.length)].rule });
    fights++;
    for (let turn = 0; turn < 60 && !combat.ended; turn++) {
        // jugar cartas al azar
        for (let k = 0; k < 12 && !combat.ended; k++) {
            const playable = p.hand.map((id, i) => ({ id, i })).filter((x) => combat.canPlay(x.id));
            if (!playable.length) break;
            const pick = playable[Math.floor(Math.random() * playable.length)];
            const alive = combat.enemies.map((e, i) => (e.isAlive() ? i : -1)).filter((i) => i >= 0);
            combat.playCard(pick.i, alive[Math.floor(Math.random() * alive.length)]);
        }
        if (combat.ended) break;
        combat.endPlayerTurn();
        if (combat.ended) break;
        for (let k = 0; k < combat.enemies.length && !combat.ended; k++) combat.enemyAct(k);
        if (combat.ended) break;
        combat.endEnemyTurn();
        // el jugador no muere a mitad de prueba por tanta jugada aleatoria: se cura
        if (!combat.ended && p.hp < 30) p.hp = p.maxHp;
    }
    if (result === 'win') wins++;
    return result;
}
for (const id of ids) {
    for (let rep = 0; rep < 6; rep++) {
        try {
            const e = E[id];
            const mods = { hpMult: 1 + Math.random() * 0.5, dmgBonus: Math.floor(Math.random() * 4) };
            fight([id], mods);
        } catch (err) {
            exceptions++;
            bad(`excepción con ${id}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`);
            break;
        }
    }
}
// grupos de cada tema
Object.values(window.FLOOR_THEMES).forEach((t) => {
    [...t.weak, ...t.normal, ...t.elites].forEach((g) => {
        try { fight(g, { hpMult: 1, dmgBonus: 1 }); } catch (err) { exceptions++; bad(`excepción en grupo ${g}: ${err.stack.split('\n').slice(0, 3).join(' | ')}`); }
    });
});
console.log('enemigos', ids.length, 'temas', Object.keys(window.FLOOR_THEMES).length, 'combates', fights, 'ganados', wins, 'excepciones', exceptions, 'problemas', problems);
process.exit(problems ? 1 : 0);
