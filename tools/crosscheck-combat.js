// Comparación cruzada del motor de combate: corre N combates con semilla en el motor JavaScript (js/engine) y
// guarda cada paso en nativo/core/build/crosscheck.txt. `gradlew :core:test` (CrossCheckTest) corre los mismos
// combates en Kotlin y exige que cada paso salga idéntico. Así se cazan diferencias sutiles del port.
// Uso: node tools/crosscheck-combat.js [casos]   (desde la raíz del repositorio)
global.window = global;
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = [
    'js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js', 'js/data/enemies_more.js',
    'js/data/relics.js', 'js/data/relics_indie.js', 'js/data/characters.js', 'js/data/difficulty.js',
    'js/engine/entities.js', 'js/engine/combat.js'
];
files.forEach((f) => require(path.join(root, f)));
global.petFor = () => null;

const N = Number(process.argv[2]) || 300;
const CHARS = ['manzana', 'platanin', 'kiwi', 'uva'];
const themeIds = Object.keys(FLOOR_THEMES);
const relicIds = Object.keys(RELIC_DB);
const seedIds = Object.keys(SEED_DB);
const cardIds = Object.keys(CARD_DEFS);

function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
const st = (e) => Object.keys(e.statuses).sort().map((k) => k + '=' + e.statuses[k]).join(';');
const snap = (c) => [
    `T${c.turnNumber}${c.turn[0]}${c.ended ? 'END' : ''}`,
    `P${c.player.hp}/${c.player.maxHp}b${c.player.block}e${c.player.energy}g${c.player.gold}[${st(c.player)}]`,
    `H${c.player.hand.join(',')}`, `D${c.player.drawPile.length}`, `S${c.player.discardPile.length}`, `X${c.player.exhaustPile.length}`,
    c.enemies.map((e, i) => `E${i}${e.defId}${e.hp}/${e.maxHp}b${e.block}[${st(e)}]m${e.nextMove ? e.nextMove.id : '-'}`).join(';'),
    `G${c.player.garden.map((s) => s.type + s.timer).join(',')}`
].join(' ');

const out = [];
for (let k = 0; k < N; k++) {
    Math.random = mulberry32(1000 + k);
    const char = CHARS[k % CHARS.length];
    const theme = FLOOR_THEMES[themeIds[k % themeIds.length]];
    const groups = [...theme.weak, ...theme.normal, ...theme.elites, ...theme.bosses.map((b) => [b])];
    const group = groups[Math.floor(k / themeIds.length) % groups.length];
    const pool = cardIds.filter((id) => { const d = CARD_DEFS[id]; return (!d.character || d.character === char) && ['attack', 'skill', 'power'].includes(d.type) && d.rarity !== 'token'; });
    const deck = [...starterDeckFor(char)];
    for (let i = 0; i < 6; i++) deck.push(pool[(k * 5 + i * 3) % pool.length] + ((k + i) % 3 === 0 ? '+' : ''));
    const relics = [relicIds[k % relicIds.length], relicIds[(k * 7 + 3) % relicIds.length]].filter((r, i, a) => a.indexOf(r) === i);

    const p = new Player();
    p.characterId = char;
    p.maxHp = p.hp = CHARACTER_DB[char].baseHp;
    p.deck = deck;
    relics.forEach((r) => { p.relics.push(r); if (RELIC_DB[r].onPickup) RELIC_DB[r].onPickup(p); });
    const base = getDifficulty('madura').mods;
    const mods = scaledMods(base, theme.castle, 1 + (k % 3));
    const c = new Combat(p, group.map((id) => ENEMY_DB[id]), () => {}, () => {}, { mods, rule: theme.rule || null });

    out.push(`#${k}`);
    out.push(snap(c));
    const seedId = seedIds[k % seedIds.length];
    for (let turn = 0; turn < 40 && !c.ended; turn++) {
        if (turn === 1 && k % 3 === 0) { c.useSeed(seedId, c.enemies.findIndex((e) => e.isAlive())); out.push('seed ' + snap(c)); }
        for (let plays = 0; plays < 15 && !c.ended; plays++) {
            const idx = c.player.hand.findIndex((id) => c.canPlay(id));
            if (idx < 0) break;
            c.playCard(idx, c.enemies.findIndex((e) => e.isAlive()));
            out.push(snap(c));
        }
        if (c.ended) break;
        c.endPlayerTurn(); out.push(snap(c));
        for (let i = 0; i < c.enemies.length && !c.ended; i++) {
            if (c.enemies[i].isAlive()) { c.enemyAct(i); out.push(snap(c)); }
        }
        c.endEnemyTurn(); out.push(snap(c));
    }
}
const dest = path.join(root, 'nativo/core/build/crosscheck.txt');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out.join('\n') + '\n');
console.log(`${N} combates, ${out.length} líneas → ${dest}`);

// ---------- mapas ----------
require(path.join(root, 'js/engine/map.js'));
const variantIds = Object.keys(MAP_VARIANTS);
const mapOut = [];
const MAPS = Number(process.argv[3]) || 1000;
for (let k = 0; k < MAPS; k++) {
    Math.random = mulberry32(5000 + k);
    const cols = 9 + (k % 7), rows = 5 + (k % 4), startY = k % rows;
    const m = generateMap(startY, { cols, rows, variant: variantIds[k % variantIds.length], elites: 3 + (k % 3), games: 1 + (k % 3) });
    mapOut.push(`#${k}`);
    m.grid.forEach((r, y) => mapOut.push(`g${y} ${r.map((t) => t.slice(0, 2)).join(' ')}`));
    m.wallsV.forEach((r, y) => mapOut.push(`v${y} ${r.map((b) => (b ? 1 : 0)).join('')}`));
    m.wallsH.forEach((r, y) => mapOut.push(`h${y} ${r.map((b) => (b ? 1 : 0)).join('')}`));
    mapOut.push(`meta boss=${m.bossY} rivers=${m.rivers.map((r) => r.col + ':' + r.bridge).join(';')} ${m.cols}x${m.rows} ${m.variant} seed=${m.seed}`);
}
const mapDest = path.join(root, 'nativo/core/build/crosscheck-map.txt');
fs.writeFileSync(mapDest, mapOut.join('\n') + '\n');
console.log(`${MAPS} mapas, ${mapOut.length} líneas → ${mapDest}`);
