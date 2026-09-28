// Prueba cada objeto y cada semilla en combates simulados.
// Uso: node tests/items.test.js
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const files = [
    'js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js',
    'js/data/relics.js', 'js/data/relics_indie.js', 'js/data/characters.js', 'js/data/difficulty.js',
    'js/engine/entities.js', 'js/engine/combat.js'
];
files.forEach((f) => { try { require(path.join(root, f)); } catch (e) { if (!/ENOENT|Cannot find module/.test(String(e.message))) throw e; } });
try { require(path.join(root, 'js/data/cosmetics.js')); } catch (e) { global.petFor = () => null; }
let bad = 0;
const check = (c, m) => { if (!c) { bad++; console.log('FALLA:', m); } };
const E = window.ENEMY_DB;
const enemyIds = Object.keys(E).filter((id) => !E[id].tier || E[id].tier === 'normal');
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function newPlayer(relics) {
    const p = new window.Player();
    p.characterId = pick(['manzana', 'platanin', 'kiwi', 'uva']);
    p.maxHp = p.hp = 80;
    p.deck = window.starterDeckFor(p.characterId);
    for (const r of relics) { p.relics.push(r); const d = window.RELIC_DB[r]; if (d.onPickup) d.onPickup(p); }
    return p;
}
function play(p, defIds, opts) {
    let result = null;
    const c = new window.Combat(p, defIds.map((i) => E[i]), () => {}, (r) => { result = r; }, { mods: opts && opts.mods });
    for (let t = 0; t < 40 && !c.ended; t++) {
        for (let k = 0; k < 14 && !c.ended; k++) {
            const pl = p.hand.map((id, i) => ({ id, i })).filter((x) => c.canPlay(x.id));
            if (!pl.length) break;
            const alive = c.enemies.map((e, i) => (e.isAlive() ? i : -1)).filter((i) => i >= 0);
            c.playCard(pick(pl).i, pick(alive));
        }
        if (c.ended) break;
        c.endPlayerTurn(); if (c.ended) break;
        for (let k = 0; k < c.enemies.length && !c.ended; k++) c.enemyAct(k);
        if (c.ended) break;
        c.endEnemyTurn();
        if (opts && opts.heal && !c.ended && p.hp < 25) p.hp = p.maxHp;
    }
    return { c, result };
}
// 1) cada objeto, solo y muchas veces
const relics = Object.keys(window.RELIC_DB);
for (const rid of relics) {
    for (let i = 0; i < 12; i++) {
        try {
            const p = newPlayer([rid]);
            const { c, result } = play(p, [pick(enemyIds), pick(enemyIds)], { heal: true, mods: { hpMult: 1, dmgBonus: 1 } });
            // al terminar el combate se aplican los onCombatEnd de los objetos
            if (result === 'win') { const r = window.RELIC_DB[rid]; if (r.onCombatEnd) r.onCombatEnd(p); }
            check(Number.isFinite(p.hp) && Number.isFinite(p.gold) && Number.isFinite(p.maxEnergy), `${rid}: valores no numéricos`);
            check(p.hp <= p.maxHp, `${rid}: vida por encima del máximo (${p.hp}/${p.maxHp})`);
        } catch (e) { check(false, `${rid}: excepción ${e.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
    }
}
// 2) Desafío a la Muerte salva una vez por partida
{
    const p = newPlayer(['desafio_muerte']);
    p.hp = 6;
    const c = new window.Combat(p, [E.mango_zombie], () => {}, () => {}, { mods: { hpMult: 1, dmgBonus: 30 } });
    const hit = E.mango_zombie.moves.find((m) => m.id === 'zarpazo'); // el zombi pega muchísimo
    c.enemies[0].nextMove = hit;
    c.endPlayerTurn();
    c.enemyAct(0);
    check(p.hp === 1 && !c.ended, `Desafío a la Muerte debería dejar 1 de vida (hp=${p.hp}, ended=${c.ended})`);
    check(p.relicCounters.desafio_muerte && p.relicCounters.desafio_muerte.used, 'se marca como usado');
    c.endEnemyTurn();
    if (!c.ended) { c.endPlayerTurn(); c.enemies[0].nextMove = hit; c.enemyAct(0); }
    check(p.hp <= 0 || c.ended, 'la segunda vez ya no salva');
}
// 3) Corazón del Sacrificio no mata al empezar
{
    const p = newPlayer(['corazon_sacrificio']);
    p.hp = 3;
    const c = new window.Combat(p, [E.mosca_podrida], () => {}, () => {});
    check(p.hp >= 1, 'el sacrificio no mata');
    check(p.energy >= p.maxEnergy + 2, `energía extra en el turno 1 (${p.energy})`);
}
// 4) semillas
for (const sid of Object.keys(window.SEED_DB)) {
    for (let i = 0; i < 10; i++) {
        try {
            const p = newPlayer([]);
            const c = new window.Combat(p, [pick(enemyIds), pick(enemyIds)].map((x) => E[x]), () => {}, () => {});
            c.enemies = c.enemies; // ya construidos con defs
            const seed = window.SEED_DB[sid];
            const ok = c.useSeed(sid, 0);
            check(ok, `semilla ${sid} no se pudo usar`);
            check(Number.isFinite(p.hp) && p.hp <= p.maxHp && Number.isFinite(p.energy), `semilla ${sid}: estado raro`);
            // el combate sigue funcionando después
            c.endPlayerTurn(); if (!c.ended) { for (let k = 0; k < c.enemies.length && !c.ended; k++) c.enemyAct(k); if (!c.ended) c.endEnemyTurn(); }
        } catch (e) { check(false, `semilla ${sid}: excepción ${e.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
    }
}
console.log('objetos', relics.length, 'semillas', Object.keys(window.SEED_DB).length, bad ? `FALLARON ${bad}` : 'todo bien');
process.exit(bad ? 1 : 0);
