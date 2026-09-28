// Comportamiento de las semillas únicas (fantasma, espejo, bomba…).
// Uso: node tests/seeds.test.js
global.window = global;
const path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
['js/data/statuses.js','js/data/seeds.js','js/data/sprouts.js','js/data/cards.js','js/data/cards_characters.js','js/data/starter.js','js/data/enemies.js','js/data/relics.js','js/data/characters.js','js/engine/entities.js','js/engine/combat.js'].forEach((f) => require(path.join(root, f)));
global.petFor = () => null;
let bad = 0; const check = (c, m) => { if (!c) { bad++; console.log('FALLA:', m); } };
const E = window.ENEMY_DB;
const mk = (defIds, mods) => { const p = new window.Player(); p.characterId = 'manzana'; p.maxHp = p.hp = 70; p.deck = window.starterDeckFor('manzana'); const c = new window.Combat(p, defIds.map((i) => E[i]), () => {}, () => {}, { mods }); return { p, c }; };
// fantasma: absorbe un golpe entero
{
  const { p, c } = mk(['mango_zombie']);
  c.useSeed('semilla_fantasma', null);
  check(p.getStatus('ghost') === 1, 'fantasma da intangible');
  const hp0 = p.hp;
  c.enemies[0].nextMove = E.mango_zombie.moves.find((m) => m.id === 'zarpazo'); // fuerza un golpe
  c.endPlayerTurn(); c.enemyAct(0);
  check(p.hp === hp0, `el golpe no debería hacer daño (hp ${hp0}→${p.hp})`);
  check(p.getStatus('ghost') === 0, 'gasta el intangible');
}
// espejo: copia la última carta jugada
{
  const { p, c } = mk(['mango_zombie']);
  const idx = p.hand.findIndex((id) => id === 'golpe_cascara');
  const before = p.hand.length;
  c.playCard(idx, 0);
  check(c.lastPlayed === 'golpe_cascara', 'lastPlayed guarda la carta');
  const inHand = p.hand.filter((id) => id === 'golpe_cascara').length;
  c.useSeed('semilla_espejo', null);
  check(p.hand.filter((id) => id === 'golpe_cascara').length === inHand + 1, 'la semilla espejo copia la carta');
}
// bomba: ejecuta a los que quedan con 6 o menos
{
  const { p, c } = mk(['pulgon', 'pulgon']);
  c.enemies[0].hp = c.enemies[0].maxHp = 12; // 12-8 = 4 → muere
  c.enemies[1].hp = c.enemies[1].maxHp = 30; // 30-8 = 22 → vive
  c.useSeed('semilla_sandia', null);
  check(!c.enemies[0].isAlive() && c.enemies[1].isAlive(), `bomba: ${c.enemies.map((e) => e.hp)}`);
}
// coco: duplica la cáscara
{
  const { p, c } = mk(['mango_zombie']);
  p.block = 7;
  c.useSeed('semilla_coco', null);
  check(p.block === 22, `coco: 7 → 22 (fue ${p.block})`);
}
// tiempo: congela a todos y quita cartas al siguiente turno
{
  const { p, c } = mk(['pulgon', 'mosca_podrida']);
  c.useSeed('semilla_tiempo', null);
  check(c.enemies.every((e) => e.getStatus('frozen') === 1), 'congela a todos');
  check(p.getStatus('sticky') === 2, 'almíbar 2 en el jugador');
}
console.log(bad ? 'FALLARON ' + bad : 'todo bien');
process.exit(bad ? 1 : 0);
