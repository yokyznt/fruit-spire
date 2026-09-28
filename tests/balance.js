// Balance (informativo): un jugador "razonable" con un mazo que crece por piso pelea contra cada tipo de enemigo.
// Uso: node tests/balance.js [carpeta] [madura|pasada|podrida] [combates por tipo]
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const files = ['js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js', 'js/data/enemies_more.js', 'js/data/relics.js', 'js/data/relics_indie.js',
    'js/data/characters.js', 'js/data/difficulty.js', 'js/engine/entities.js', 'js/engine/combat.js'];
files.forEach((f) => require(path.join(root, f)));
try { require(path.join(root, 'js/data/cosmetics.js')); } catch (e) { global.petFor = () => null; }
const E = window.ENEMY_DB;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DIFF = process.argv[3] || 'madura';

function buildPlayer(floorIdx, charId) {
    const p = new window.Player();
    p.characterId = charId; p.name = charId;
    const def = window.CHARACTER_DB[charId];
    p.maxHp = p.hp = def.baseHp + Math.min(floorIdx, 8) * 3;
    p.deck = window.starterDeckFor(charId);
    const pool = Object.values(window.CARD_DB).filter((c) => (!c.character || c.character === charId) && ['common', 'uncommon', 'rare'].includes(c.rarity));
    // ~2.5 cartas por piso, sesgadas a las de la fruta, algunas maduradas; se quitan un par de básicas
    const n = Math.round(floorIdx * 2.8);
    for (let i = 0; i < n; i++) {
        let c = pick(pool);
        const up = Math.random() < 0.25 + floorIdx * 0.04;
        p.deck.push(up && c.canUpgrade ? c.id + '+' : c.id);
    }
    for (let i = 0; i < Math.floor(floorIdx / 3); i++) { const k = p.deck.findIndex((id) => id === 'golpe_cascara'); if (k >= 0) p.deck.splice(k, 1); }
    const relicPool = Object.values(window.RELIC_DB).filter((r) => ['common', 'uncommon'].includes(r.tier) && !r.noRest);
    for (let i = 0; i < Math.floor(floorIdx * 1.2); i++) { const r = pick(relicPool); if (!p.relics.includes(r.id)) { p.relics.push(r.id); if (r.onPickup) r.onPickup(p); } }
    p.hp = p.maxHp;
    return p;
}
// política "razonable"
function playTurn(c) {
    const p = c.player;
    for (let guard = 0; guard < 14 && !c.ended; guard++) {
        const alive = c.enemies.filter((e) => e.isAlive());
        if (!alive.length) return;
        let incoming = 0;
        alive.forEach((e) => { const m = e.nextMove; if (m && m.damage) incoming += c.previewDamage(e, p, m.damage) * (m.hits || 1); });
        const need = incoming - p.block;
        const playable = p.hand.map((id, i) => ({ id, i, card: window.getCard(id) })).filter((x) => c.canPlay(x.id));
        if (!playable.length) return;
        // orden de preferencia
        const powers = playable.filter((x) => x.card.type === 'power');
        const attacks = playable.filter((x) => x.card.type === 'attack');
        const skills = playable.filter((x) => x.card.type === 'skill');
        let choice;
        if (powers.length && c.turnNumber <= 2) choice = powers[0];
        else if (need > 0 && skills.length) choice = skills.sort((a, b) => a.card.cost - b.card.cost)[0];
        else if (attacks.length) choice = attacks.sort((a, b) => b.card.cost - a.card.cost)[0];
        else if (skills.length) choice = skills[0];
        else choice = powers[0] || playable[0];
        const target = alive.slice().sort((a, b) => (a.hp + a.block) - (b.hp + b.block))[0];
        c.playCard(choice.i, c.enemies.indexOf(target));
    }
}
function fight(defIds, floorIdx, charId, rule) {
    const castle = Math.floor(floorIdx / 3) + 1, floor = (floorIdx % 3) + 1;
    const diff = window.getDifficulty(DIFF);
    const mods = window.scaledMods(diff.mods, castle, floor);
    const p = buildPlayer(floorIdx, charId);
    if (diff.curse) p.deck.push(diff.curse);
    const start = p.hp;
    let result = null;
    const c = new window.Combat(p, defIds.map((i) => E[i]), () => {}, (r) => { result = r; }, { mods, rule });
    for (let t = 0; t < 50 && !c.ended; t++) {
        playTurn(c);
        if (c.ended) break;
        c.endPlayerTurn(); if (c.ended) break;
        for (let k = 0; k < c.enemies.length && !c.ended; k++) c.enemyAct(k);
        if (c.ended) break;
        c.endEnemyTurn();
    }
    return { win: result === 'win', lost: start - Math.max(0, p.hp), turns: c.turnNumber, start };
}
const N = +process.argv[4] || 40;
const pl = { manzana: 1, platanin: 1, kiwi: 1, uva: 1 };
const chars = Object.keys(pl);
const rows = [];
for (let f = 0; f < 9; f++) {
    const castle = Math.floor(f / 3) + 1, floor = (f % 3) + 1;
    const plan = [['huerto', 'gallinero', 'estanque'], ['dados', 'poker', 'ajedrez'], ['mercado', 'cocina', 'torre_rey']][castle - 1];
    const stats = { normal: { w: 0, l: 0, n: 0 }, elite: { w: 0, l: 0, n: 0 }, boss: { w: 0, l: 0, n: 0 } };
    for (let i = 0; i < N; i++) {
        const themeId = plan[floor - 1];
        const th = window.FLOOR_THEMES[themeId];
        const charId = pick(chars);
        const kinds = [['normal', pick(i % 2 ? th.normal : th.weak)], ['elite', pick(th.elites)],
            ['boss', [floor < 3 ? pick(th.bosses.length ? th.bosses : window.CASTLES[castle - 1].bosses) : pick(window.CASTLES[castle - 1].bosses)]]];
        for (const [k, g] of kinds) {
            const r = fight(g, f, charId, th.rule);
            const s = stats[k]; s.n++; if (r.win) s.w++; s.l += r.lost;
        }
    }
    rows.push({ f: `${castle}-${floor}`, theme: plan[floor - 1], n: stats.normal, e: stats.elite, b: stats.boss });
}
const fmt = (s) => `${Math.round(100 * s.w / s.n)}% gana, pierde ${Math.round(s.l / s.n)}`;
console.log(`Dificultad ${DIFF}, ${N} combates de cada tipo por piso`);
rows.forEach((r) => console.log(r.f.padEnd(4), r.theme.padEnd(12), 'normal:', fmt(r.n).padEnd(24), 'élite:', fmt(r.e).padEnd(24), 'jefe:', fmt(r.b)));
