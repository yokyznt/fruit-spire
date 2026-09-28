// Vista previa de daño/cáscara de las cartas (Combat.previewCard). Uso: node tests/preview.test.js
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
['js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/relics.js', 'js/data/characters.js', 'js/engine/entities.js', 'js/engine/combat.js'].forEach((f) => require(path.join(root, f)));
global.petFor = () => null;
let bad = 0;
const check = (c, m) => { if (!c) { bad++; console.log('FALLA:', m); } };
const mk = (char, ids) => { const p = new window.Player(); p.characterId = char; p.maxHp = p.hp = 80; p.deck = window.starterDeckFor(char); return { p, c: new window.Combat(p, ids.map((i) => window.ENEMY_DB[i]), () => {}, () => {}) }; };
{
    const { p, c } = mk('manzana', ['mango_zombie', 'pulgon']);
    const golpe = window.getCard('golpe_cascara');
    check(c.previewCard(golpe, c.enemies[0]).dmg[0] === 6, 'golpe básico 6');
    p.addStatus('strength', 3); c.enemies[0].addStatus('vulnerable', 2);
    check(c.previewCard(golpe, c.enemies[0]).dmg[0] === 13, `madurez+magulladura: (6+3)*1.5=13, dio ${c.previewCard(golpe, c.enemies[0]).dmg[0]}`);
    check(c.previewCard(golpe, c.enemies[1]).dmg[0] === 9, 'contra otro enemigo sin magulladura: 9');
    p.addStatus('weak', 1);
    check(c.previewCard(golpe, c.enemies[0]).dmg[0] === 9, `marchitez: floor(9*.75)=6 → *1.5=9`);
    const before = JSON.stringify([p.hp, p.block, p.energy, p.hand, c.enemies.map((e) => e.hp)]);
    window.CARD_DB && Object.values(window.CARD_DB).forEach((card) => c.previewCard(card, c.enemies[0]));
    check(JSON.stringify([p.hp, p.block, p.energy, p.hand, c.enemies.map((e) => e.hp)]) === before, 'la vista previa no cambia nada');
    const jugo = window.getCard('jugo_defensivo');
    p.addStatus('dexterity', 2); p.addStatus('frail', 1);
    check(c.previewCard(jugo, null).block[0] === 5, `cáscara (5+2)*.75=5, dio ${c.previewCard(jugo, null).block[0]}`);
}
{
    const { p, c } = mk('platanin', ['mango_zombie']);
    check(c.previewCard(window.getCard('jugo_defensivo'), null).block[0] === 7, 'Platanín +2 cáscara');
}
console.log(bad ? `FALLARON ${bad}` : 'todo bien');
process.exit(bad ? 1 : 0);
