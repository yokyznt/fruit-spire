// Genera los datos declarativos del juego como código Kotlin (nativo/core/.../data/gen).
// Lee los mismos archivos js/data/*.js que usa la versión web, así que nombres, costos,
// jugadas y temas salen idénticos. Las funciones (efectos de cartas, IA, ganchos de
// objetos, reglas de piso…) NO se generan: están portadas a mano en data/*.kt.
// Uso: node tools/export-core-data.js   (desde la raíz del repositorio)
global.window = global;
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'nativo/core/src/main/kotlin/com/yokyznt/fruitspire/core/data/gen');
const files = [
    'js/data/statuses.js', 'js/data/seeds.js', 'js/data/sprouts.js', 'js/data/cards.js', 'js/data/cards_characters.js', 'js/data/starter.js',
    'js/data/enemies.js', 'js/data/enemies_extra.js', 'js/data/enemies_castles.js', 'js/data/castles.js', 'js/data/enemies_more.js',
    'js/data/relics.js', 'js/data/relics_indie.js', 'js/data/characters.js', 'js/data/difficulty.js', 'js/data/cosmetics.js'
];
// refs.js pide los dibujos del juego web al cargarse; aquí solo se leen sus textos, así que basta un stub
window.SPRITE_KIT = { st: () => '' };
files.concat(['js/notes.js', 'js/data/refs.js']).forEach((f) => require(path.join(root, f)));

// ---------- ayudas de escritura ----------
const ks = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\n/g, '\\n') + '"';
const num = (n) => String(n);
const dbl = (n) => (Number.isInteger(n) ? n + ".0" : String(n));
const kmap = (o) => (o ? `linkedMapOf(${Object.keys(o).map((k) => `${ks(k)} to ${num(o[k])}`).join(', ')})` : 'null');
const klist = (a) => `listOf(${a.map(ks).join(', ')})`;
const klist2 = (a) => `listOf(${a.map((g) => klist(g)).join(', ')})`;
const named = (pairs) => pairs.filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => `${k} = ${v}`).join(', ');
const HEAD = () => `// GENERADO por tools/export-core-data.js desde js/data/*.js. No editar a mano.\n@file:Suppress("ALL")\npackage com.yokyznt.fruitspire.core.data.gen\n\nimport com.yokyznt.fruitspire.core.data.*\n\n`;
// Parte una lista larga en funciones chicas (el límite de la JVM es 64 KB por método)
function chunked(name, type, items, size) {
    let out = '';
    const parts = [];
    for (let i = 0; i < items.length; i += size) {
        const idx = parts.length;
        parts.push(`part${idx}`);
        out += `private fun part${idx}(): List<${type}> = listOf(\n${items.slice(i, i + size).map((s) => '    ' + s).join(',\n')}\n)\n\n`;
    }
    out += `val ${name}: List<${type}> by lazy { ${parts.map((p) => `${p}()`).join(' + ')} }\n`;
    return out;
}
const write = (file, text) => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, file), text); console.log('escrito', file); };

// ---------- estados ----------
write('GenStatuses.kt', HEAD() + chunked('GEN_STATUSES', 'StatusDef', Object.values(window.STATUS_DB).map((s) =>
    `StatusDef(${ks(s.id)}, ${ks(s.name)}, ${ks(s.word)}, ${ks(s.icon)}, ${ks(s.sprite)}, ${ks(s.kind)}, ${ks(s.cls)}, ${ks(s.help || '')}${s.noCount ? ', noCount = true' : ''})`), 20));

// ---------- cartas ----------
write('GenCards.kt', HEAD() + chunked('GEN_CARDS', 'CardDef', Object.values(window.CARD_DEFS).map((c) =>
    `CardDef(${named([
        ['id', ks(c.id)], ['name', ks(c.name)], ['type', ks(c.type)], ['cost', c.cost], ['rarity', ks(c.rarity)], ['description', ks(c.description)],
        ['art', ks(c.art || '')], ['fx', c.fx && ks(c.fx)], ['target', c.target && ks(c.target)], ['upCost', c.upCost != null ? c.upCost : null],
        ['exhaust', c.exhaust ? 'true' : null], ['upExhaust', c.upExhaust != null ? String(c.upExhaust) : null], ['retain', c.retain ? 'true' : null],
        ['unplayable', c.unplayable ? 'true' : null], ['ethereal', c.ethereal ? 'true' : null], ['endTurnDamage', c.endTurnDamage || null],
        ['character', c.character && ks(c.character)], ['sprite', c.sprite && ks(c.sprite)]
    ])})`), 20));

// ---------- objetos ----------
write('GenRelics.kt', HEAD() + chunked('GEN_RELICS', 'RelicDef', Object.values(window.RELIC_DB).map((r) =>
    `RelicDef(${named([
        ['id', ks(r.id)], ['name', ks(r.name)], ['icon', ks(r.icon)], ['tier', ks(r.tier)], ['description', ks(r.description)],
        ['ref', r.ref && ks(r.ref)], ['drawBonus', r.drawBonus || null], ['noRest', r.noRest ? 'true' : null]
    ])})`), 20));

// ---------- semillas y brotes ----------
write('GenSeeds.kt', HEAD() + chunked('GEN_SEEDS', 'SeedDef', Object.values(window.SEED_DB).map((s) =>
    `SeedDef(${ks(s.id)}, ${ks(s.name)}, ${ks(s.icon)}, ${ks(s.rarity)}, ${ks(s.color)}, ${ks(s.mark)}, ${s.target ? ks(s.target) : 'null'}, ${ks(s.desc)})`), 20));
write('GenSprouts.kt', HEAD() + chunked('GEN_SPROUTS', 'SproutDef', Object.values(window.SPROUT_DB).map((s) =>
    `SproutDef(${ks(s.id)}, ${ks(s.name)}, ${ks(s.word)}, ${ks(s.sprite)}, ${ks(s.icon)}, ${s.time}, ${ks(s.effect)}, ${ks(s.help)})`), 20));

// ---------- enemigos ----------
const fakeCombat = { aliveEnemies: () => [], player: { gold: 0 } };
// Detecta la IA que solo recorre una lista de jugadas en orden (la ayuda `cycle` del juego web)
function cycleOf(def) {
    if (!def.ai || !/^\(e\) => list\[e\.turns % list\.length\]$/.test(String(def.ai).replace(/\s+/g, ' '))) return null;
    const seq = [];
    for (let t = 0; t < 24; t++) seq.push(def.ai({ turns: t, phase: 0, hp: 1, maxHp: 1, history: [] }, fakeCombat));
    for (let p = 1; p <= 12; p++) if (seq.every((v, i) => v === seq[i % p])) return seq.slice(0, p);
    throw new Error('ciclo raro en ' + def.id);
}
const moveCode = (m) => {
    const ac = m.addCard;
    return `Move(${named([
        ['id', ks(m.id)], ['name', ks(m.name)], ['damage', m.damage || null], ['hits', m.hits || null], ['block', m.block || null], ['allyBlock', m.allyBlock || null],
        ['apply', m.apply && kmap(m.apply)], ['self', m.self && kmap(m.self)], ['allies', m.allies && kmap(m.allies)], ['heal', m.heal || null], ['healAll', m.healAll || null],
        ['stealGold', m.stealGold || null], ['addCard', ac && `AddCard(${ks(ac.id)}, ${ac.n || 1}, ${ks(ac.to || 'discard')})`], ['summon', m.summon && klist(m.summon)],
        ['weight', m.weight != null ? (Number.isInteger(m.weight) ? m.weight + '.0' : m.weight) : null], ['noRepeat', m.noRepeat ? 'true' : null], ['once', m.once ? 'true' : null],
        ['drain', m.drain ? 'true' : null], ['stealCard', m.stealCard || null], ['anim', m.anim && ks(m.anim)], ['fx', m.fx && ks(m.fx)],
        ['special', m.special ? `EnemyAi.special(${ks(m.id)})` : null]
    ])})`;
};
const enemyCode = (d) => {
    const cyc = cycleOf(d);
    const ai = !d.ai ? null : cyc ? `cycle(${cyc.map(ks).join(', ')})` : `EnemyAi.of(${ks(d.id)})`;
    return `EnemyDef(${named([
        ['id', ks(d.id)], ['name', ks(d.name)], ['icon', ks(d.icon)], ['hpMin', d.hpMin], ['hpMax', d.hpMax], ['idle', d.idle && ks(d.idle)],
        ['tier', d.tier && ks(d.tier)], ['start', d.start && kmap(d.start)], ['phaseSprites', d.phaseSprites && klist(d.phaseSprites)], ['phaseNames', d.phaseNames && klist(d.phaseNames)],
        ['final', d.final ? 'true' : null], ['explode', d.explode || null], ['sprite', d.sprite && ks(d.sprite)], ['splitInto', d.splitInto && ks(d.splitInto)],
        ['leader', d.leader ? 'true' : null], ['clockEvery', d.clockEvery || null], ['breedInto', d.breedInto && ks(d.breedInto)], ['ai', ai],
        ['moves', `listOf(${d.moves.map(moveCode).join(', ')})`]
    ])})`;
};
write('GenEnemies.kt', HEAD() + chunked('GEN_ENEMIES', 'EnemyDef', Object.values(window.ENEMY_DB).map(enemyCode), 12));

// ---------- temas, castillos, personajes, dificultad ----------
const rules = {};
Object.values(window.FLOOR_THEMES).forEach((t) => { if (t.rule) rules[t.id] = t.rule; });
const themeCode = (t) => `FloorTheme(${named([
    ['id', ks(t.id)], ['castle', t.castle], ['name', ks(t.name)], ['subtitle', ks(t.subtitle)], ['icon', ks(t.icon)], ['weak', klist2(t.weak)], ['normal', klist2(t.normal)],
    ['elites', klist2(t.elites)], ['bosses', klist(t.bosses)], ['deco', klist(t.deco)], ['games', t.games], ['gameKind', t.gameKind && ks(t.gameKind)], ['variant', t.variant && ks(t.variant)]
])})`;
const ruleCode = (id) => { const r = rules[id]; return `${ks(id)} to RuleInfo(${ks(r.icon)}, ${ks(r.name)}, ${ks(r.desc)}, ${r.hideIntent ? 'true' : 'false'}, ${ks(r.sprite)})`; };
const castleCode = (c) => `CastleDef(${named([
    ['n', c.n], ['id', ks(c.id)], ['name', ks(c.name)], ['subtitle', ks(c.subtitle)], ['icon', ks(c.icon)], ['sprite', ks(c.sprite)],
    ['sizes', `listOf(${c.sizes.map(([a, b]) => `${a} to ${b}`).join(', ')})`], ['pool', c.pool && klist(c.pool)], ['fixed', c.fixed && klist(c.fixed)],
    ['shuffle', c.shuffle ? 'true' : null], ['pick', c.pick || null], ['last', c.last && ks(c.last)], ['bosses', klist(c.bosses)], ['story', ks(c.story)]
])})`;
write('GenWorld.kt', HEAD() +
    `val GEN_THEMES: List<FloorTheme> = listOf(\n${Object.values(window.FLOOR_THEMES).map((t) => '    ' + themeCode(t)).join(',\n')}\n)\n\n` +
    `val GEN_RULES: Map<String, RuleInfo> = mapOf(\n${Object.keys(rules).map((id) => '    ' + ruleCode(id)).join(',\n')}\n)\n\n` +
    `val GEN_CASTLES: List<CastleDef> = listOf(\n${window.CASTLES.map((c) => '    ' + castleCode(c)).join(',\n')}\n)\n\n` +
    `val GEN_CHARACTERS: List<CharacterDef> = listOf(\n${Object.values(window.CHARACTER_DB).map((c) => `    CharacterDef(${ks(c.id)}, ${ks(c.name)}, ${ks(c.icon)}, ${c.baseHp}, ${ks(c.style)}, ${ks(c.description)})`).join(',\n')}\n)\n\n` +
    `val GEN_DIFFICULTIES: List<Difficulty> = listOf(\n${window.DIFFICULTIES.concat([window.EASY_DIFFICULTY]).map((d) => `    Difficulty(${ks(d.id)}, ${ks(d.name)}, ${ks(d.sprite)}, ${ks(d.desc)}, ${dbl(d.mods.hpMult)}, ${d.mods.dmgBonus}, ${d.gold}, ${dbl(d.restHeal)}, ${dbl(d.actHeal)}, ${dbl(d.floorHeal)}, ${d.elites}${d.curse ? ', curse = ' + ks(d.curse) : ''})`).join(',\n')}\n)\n\n` +
    `val GEN_FLOOR_SCALING: List<Pair<Double, Int>> = listOf(${window.FLOOR_SCALING.map((s) => `${dbl(s.hpMult)} to ${s.dmgBonus}`).join(', ')})\n` +
    `val GEN_STARTER_BASE: List<String> = ${klist(window.STARTER_BASE)}\n` +
    `val GEN_STARTER_SIGNATURE: Map<String, List<String>> = mapOf(${Object.keys(window.STARTER_SIGNATURE).map((k) => `${ks(k)} to ${klist(window.STARTER_SIGNATURE[k])}`).join(', ')})\n`);

// ---------- vestidor: colores, accesorios y mascotitas (los dibujos y los efectos de las mascotas van aparte) ----------
write('GenCosmetics.kt', HEAD() + `val GEN_COSMETICS: List<CosmeticDef> = listOf(\n${window.COSMETICS.map((c) => '    ' + `CosmeticDef(${named([
    ['id', ks(c.id)], ['type', ks(c.type)], ['name', ks(c.name)], ['char', c.char && ks(c.char)], ['slot', c.slot && ks(c.slot)], ['bonus', c.bonus && ks(c.bonus)],
    ['reqBossAct', c.req && c.req.bossAct || null], ['reqWin', c.req && c.req.win && ks(c.req.win)]
])})`).join(',\n')}\n)\n`);

// ---------- notas de la versión y guiños a otros juegos ----------
const klistN = (a) => `listOf(${(a || []).map(ks).join(', ')})`;
write('GenNotes.kt', HEAD() +
    `const val GAME_VERSION = ${ks(window.GAME_VERSION)}\nconst val CREATOR_HANDLE = ${ks(window.CREATOR.handle)}\nconst val CREATOR_URL = ${ks(window.CREATOR.url)}\n\n` +
    `val GEN_PATCH_NOTES: List<PatchNote> = listOf(\n${window.PATCH_NOTES.map((n) => `    PatchNote(${ks(n.version)}, ${ks(n.date)}, ${ks(n.title)}, ${klistN(n.items)}, ${klistN(n.fixes)})`).join(',\n')}\n)\n\n` +
    // relic id → los juegos que lo inspiran y el porqué (REFS de js/data/refs.js)
    `val GEN_RELIC_REFS: Map<String, RefInfo> = mapOf(\n${Object.keys(window.RELIC_REFS).map((id) => {
        const r = window.RELIC_REFS[id];
        const games = [r[0], r[2]].filter(Boolean).map((k) => window.GAME_REFS[k].name);
        return `    ${ks(id)} to RefInfo(${klistN(games)}, ${ks(r[1])})`;
    }).join(',\n')}\n)\n`);

console.log(`estados ${Object.keys(window.STATUS_DB).length}, cartas ${Object.keys(window.CARD_DEFS).length}, objetos ${Object.keys(window.RELIC_DB).length}, semillas ${Object.keys(window.SEED_DB).length}, enemigos ${Object.keys(window.ENEMY_DB).length}, temas ${Object.keys(window.FLOOR_THEMES).length}`);
