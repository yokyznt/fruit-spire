// Mecánicas de enemigos: Provocación, Rabia, Caparazón, Agotamiento, Robacartas, Plaga, Intangible.
// Uso: node tests/mechanics.test.js
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
['js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js', 'js/data/enemies_more.js',
    'js/data/relics.js', 'js/data/characters.js', 'js/engine/entities.js', 'js/engine/combat.js'].forEach((f) => require(path.join(root, f)));
global.petFor = () => null;
const E = window.ENEMY_DB;
let bad = 0;
const check = (c, m) => { if (!c) { bad++; console.log('FALLA:', m); } };
const mk = (ids) => {
    const p = new window.Player();
    p.characterId = 'manzana'; p.maxHp = p.hp = 80;
    p.deck = window.starterDeckFor('manzana');
    const c = new window.Combat(p, ids.map((i) => E[i]), () => {}, () => {});
    return { p, c };
};
const handIdx = (p, id) => p.hand.findIndex((x) => x === id);

// Provocación: el golpe al otro enemigo va contra el que provoca
{
    const { p, c } = mk(['mosca_podrida', 'pavo_guardian']);
    p.energy = 9;
    p.hand = ['golpe_cascara', 'golpe_cascara'];
    const fly = c.enemies[0], pavo = c.enemies[1];
    const fly0 = fly.hp, pavo0 = pavo.hp + pavo.block;
    c.playCard(0, 0);
    check(fly.hp === fly0, 'la mosca no debió recibir daño');
    check(pavo.hp + pavo.block < pavo0, 'el pavo debió recibir el golpe');
    check(c.lastEvents.some((e) => e.type === 'taunt'), 'aviso de provocación');
    // un ataque a todos sí le pega a los dos
    p.hand = ['lluvia_uvas'];
    const f1 = fly.hp;
    c.playCard(0, null);
    check(fly.hp < f1 || !fly.isAlive(), 'los ataques a todos no se desvían');
}
// Rabia: gana Madurez al perder vida
{
    const { p, c } = mk(['cactus_rabioso']);
    p.hand = ['golpe_cascara']; p.energy = 3;
    c.playCard(0, 0);
    check(c.enemies[0].getStatus('strength') === 1, `rabia da madurez (tiene ${c.enemies[0].getStatus('strength')})`);
}
// Caparazón: la cáscara se acumula entre turnos
{
    const { p, c } = mk(['tortuga_escudo']);
    const t = c.enemies[0];
    const meterse = E.tortuga_escudo.moves.find((m) => m.id === 'meterse');
    c.endPlayerTurn(); t.nextMove = meterse; c.enemyAct(0); c.endEnemyTurn();
    const b1 = t.block;
    c.endPlayerTurn(); t.nextMove = meterse; c.enemyAct(0);
    check(b1 > 0 && t.block === b1 + 9, `el caparazón acumula (${b1} → ${t.block})`);
}
// Agotamiento: pierdes energía al empezar el turno
{
    const { p, c } = mk(['sanguijuela']);
    const s = c.enemies[0];
    c.endPlayerTurn(); s.nextMove = E.sanguijuela.moves.find((m) => m.id === 'chupar_energia'); c.enemyAct(0);
    check(p.getStatus('drained') === 1, 'queda agotado');
    c.endEnemyTurn();
    check(p.energy === p.maxEnergy - 1, `empieza con 1 de energía menos (${p.energy})`);
    check(!p.getStatus('drained'), 'el agotamiento se gasta');
}
// Robacartas: te roba y devuelve al morir
{
    const { p, c } = mk(['urraca_tahur']);
    const u = c.enemies[0];
    const total = () => p.hand.length + p.drawPile.length + p.discardPile.length + p.exhaustPile.length;
    const t0 = total();
    c.endPlayerTurn(); u.nextMove = E.urraca_tahur.moves.find((m) => m.id === 'birlar_carta'); c.enemyAct(0);
    check(u.stolenCards.length === 1 && total() === t0 - 1, 'se llevó una carta');
    u.hp = 1; c.endEnemyTurn();
    p.hand = ['golpe_cascara']; p.energy = 3; c.playCard(0, 0);
    check(!u.isAlive() && u.stolenCards.length === 0, 'al morir ya no tiene cartas');
    check(p.discardPile.length >= 1 && c.lastEvents.some((e) => e.type === 'returncards'), 'las cartas vuelven al descarte');
}
// Plaga: tiene crías al final de su turno, hasta 3 enemigos
{
    const { p, c } = mk(['caracol_plaga']);
    for (let t = 0; t < 4 && !c.ended; t++) {
        p.hp = 80;
        c.endPlayerTurn(); for (let k = 0; k < c.enemies.length; k++) c.enemyAct(k); c.endEnemyTurn();
    }
    const kids = c.enemies.filter((e) => e.defId === 'caracolito' && e.isAlive());
    check(kids.length === 2, `2 crías (hay ${kids.length})`);
    check(c.aliveEnemies().length <= 3, 'nunca más de 3');
    check(!c.enemies[0].getStatus('breed'), 'la plaga se gasta');
}
// Intangible en enemigos
{
    const { p, c } = mk(['fantasma_bodega']);
    const f = c.enemies[0]; const hp0 = f.hp;
    p.hand = ['golpe_cascara']; p.energy = 3; c.playCard(0, 0);
    check(f.hp === hp0 && f.getStatus('ghost') === 1, 'el primer golpe no le hace daño');
}
console.log(bad ? `FALLARON ${bad}` : 'todo bien');
process.exit(bad ? 1 : 0);
