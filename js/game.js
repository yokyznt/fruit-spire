// ============================================================
// GAME.JS — Estado de la partida y flujo del juego: menú, mapa,
// combates, recompensas, campamento, tienda, eventos y paso de nivel.
// Los efectos/animaciones están en js/fx.js y las pantallas en
// js/render.js. Todo lo que es "contenido" vive en js/data.
//
// El juego se dibuja en un lienzo de al menos 1440x810 que se escala para
// llenar TODA la ventana: el lado que sobra se estira (sin franjas ni
// deformar nada). BASE_W / BASE_H son el tamaño actual del lienzo.
// ============================================================

const DESIGN_W = 1440;
const DESIGN_H = 810;
let BASE_W = DESIGN_W;
let BASE_H = DESIGN_H;

// Fondos de combate: cada pelea elige uno al azar para variar el lugar
const COMBAT_BACKGROUNDS = ['kitchen', 'patio', 'picnic', 'tree'];
const BOSS_BACKGROUNDS = ['pantry', 'tree'];
function pickCombatBg(kind) {
    const pool = kind === 'boss' ? BOSS_BACKGROUNDS : COMBAT_BACKGROUNDS;
    return pool[Math.floor(Math.random() * pool.length)];
}

const NODE_INFO = {
    enemy: { sprite: 'node_enemy', icon: '⚔️', label: 'Enemigo', desc: 'Unos bichos te esperan. ¡A pelear!' },
    elite: { sprite: 'node_elite', icon: '🔥', label: 'Élite', desc: 'Un enemigo durísimo. Si ganas, te llevas un objeto.' },
    rest: { sprite: 'node_rest', icon: '🏕️', label: 'Campamento', desc: 'Descansa, madura una carta o despega una de tu mazo.' },
    treasure: { sprite: 'node_treasure', icon: '💎', label: 'Tesoro', desc: 'Un objeto gratis.' },
    shop: { sprite: 'node_shop', icon: '🏪', label: 'Tiendita', desc: 'Cartas, objetos y quitar cartas, a cambio de oro.' },
    mystery: { sprite: 'node_mystery', icon: '❓', label: 'Misterio', desc: 'Un evento al azar… ¿bueno o malo?' },
    gift: { sprite: 'node_gift', icon: '🎁', label: 'Regalo', desc: 'Un regalo misterioso.' },
    game: { sprite: 'node_game', icon: '🎲', label: 'Mesa de Juegos', desc: 'Dados, póker o ajedrez. Apuesta o gana con maña: puedes salir con oro y hasta un objeto.' },
    key: { sprite: 'node_key', icon: '🗝️', label: 'Llave Dorada', desc: 'Una llave brillante. Te servirá más adelante en este nivel.' },
    vault: { sprite: 'node_vault', icon: '🔒', label: 'Cofre Sellado', desc: 'Con la Llave Dorada da un premio mucho mejor.' },
    boss: { sprite: 'node_boss', icon: '🌀', label: 'Jefe', desc: '' }
};

// Los obstáculos que bloquean una casilla entera cambian de disfraz según
// el nivel, igual que los jefes (ver actBossDef).
const BLOCKED_BY_ACT = [
    { sprite: 'obstaculo_arbol', icon: '🌳', label: 'Árbol Caído', desc: 'Un árbol caído bloquea el camino. Hay que rodearlo.' },
    { sprite: 'obstaculo_mesa', icon: '🎰', label: 'Mesa Volcada', desc: 'Una mesa de juego volcada bloquea el paso. Hay que rodearla.' },
    { sprite: 'obstaculo_maquina', icon: '⚙️', label: 'Máquina Averiada', desc: 'Una máquina rota bloquea el paso en la torre.' }
];

// ---------------------------------------------------------
// POZO DE LOS DESEOS: tira monedas por un premio al azar; cada vez
// cuesta más oro, pero uno puede parar apenas quiera.
// ---------------------------------------------------------
const WELL_OUTCOMES = [
    { w: 22, run: (p) => { const n = Math.max(4, Math.ceil(p.maxHp * 0.2)); p.heal(n); return `El pozo brilla dorado. Recuperas ${n} ${'❤️'}.`; } },
    { w: 16, run: (p) => { const gold = 25 + Math.floor(Math.random() * 20); p.gold += gold; return `Sacas ${gold} de oro empapado del fondo.`; } },
    { w: 5, run: (p, g) => g.grantRandomRelic(p) },
    { w: 14, run: (p, g) => { const n = g.upgradeRandom(1); return n.length ? `El agua madura tu ${n[0]}.` : 'No tenías nada que madurar.'; } },
    { w: 12, run: (p) => { p.maxHp += 4; p.hp += 4; return '+4 de vida máxima. Te sientes con más jugo.'; } },
    { w: 19, run: () => 'El pozo burbujea… y no pasa nada.' },
    { w: 12, run: (p, g) => { g.addCard('fruta_magullada'); return '¡Splash! Una Fruta Magullada te cae encima y se cuela en tu mazo.'; } }
];
function wellCost() { return 15 + (GAME.wellSpins || 0) * 12; }
function tossWellCoin() {
    if (GAME.anim || lootNudge()) return;
    const cost = wellCost();
    if (GAME.player.gold < cost) { if (window.Sfx) Sfx.denied(); showToast('No te alcanza el oro'); return; }
    GAME.player.gold -= cost;
    GAME.wellSpins = (GAME.wellSpins || 0) + 1;
    const total = WELL_OUTCOMES.reduce((s, o) => s + o.w, 0);
    let r = Math.random() * total, picked = WELL_OUTCOMES[WELL_OUTCOMES.length - 1];
    for (const o of WELL_OUTCOMES) { r -= o.w; if (r <= 0) { picked = o; break; } }
    GAME.loot = [];
    GAME.wellLastMsg = withLootCapture(() => picked.run(GAME.player, eventHelpers()));
    if (window.Sfx) Sfx.sparkle();
    if (GAME.player.hp <= 0) { clearSave(); GAME.screen = 'gameover'; render(); return; }
    saveGame();
    render();
}
function leaveWell() { if (lootNudge()) return; GAME.loot = []; GAME.screen = 'map'; saveGame(); render(); }

const RESUMABLE_SCREENS = ['act-intro', 'dungeon', 'well', 'reward', 'boss-relic'];
const SAVE_KEY = 'fruitSpireSave_v3';      // v3: niveles, dificultad, cartas maduradas
const OLD_SAVE_KEY = 'fruitSpireSave_v2';
const DISCOVERED_KEY = 'fruitSpireDiscovered_v1';
const UNLOCKS_KEY = 'fruitSpireUnlocks_v2';   // grado desbloqueado por fruta (v2: solo 3 grados)

const GAME = {
    player: null,
    map: null,
    walls: null,          // { wallsV, wallsH, bossY } — ver js/engine/map.js
    visited: [],          // casillas ya pisadas ("x,y")
    playerPos: { x: 0, y: 0 },
    mapPan: null,         // desplazamiento del mapa al arrastrar con el mouse
    screen: 'menu',
    combat: null,
    combatKind: 'enemy',  // enemy | elite | boss
    lastEventMsg: '',
    currentEvent: null,
    lastEventId: null,
    rewardGold: 0,
    rewardCards: [],
    rewardRelic: null,
    afterReward: 'map',   // 'map' | 'boss-relic'
    bossRelicChoices: [],
    shopStock: null,
    restMode: null,       // null | 'upgrade' | 'remove'
    pickerFor: null,      // 'rest' | 'shop' — visor para quitar/madurar cartas
    selectedDifficulty: 'madura',
    selectedChar: 'manzana',
    unlockMsg: '',
    wardrobeChar: 'manzana', // fruta elegida en el vestidor
    newCosmetic: null,       // lo último que ganaste para el vestidor
    actHealed: 0,
    // --- solo interfaz ---
    modal: null,          // { title, note, ids } — visor de cartas
    anim: false,          // bloquea clics mientras corre una animación
    dealIn: false,        // la próxima mano entra con animación de reparto
    lastBars: {},         // % de vida anterior, para animar las barras
    lastEnergy: null,     // energía anterior, para animar los gajos
    dyingAt: {},          // índice de enemigo -> momento en que cayó
    seenEnemies: null,    // enemigos ya dibujados (para animar a los invocados)
    lastPhase: {},        // fase anterior de cada enemigo (jefes)
    pAnims: {},           // animaciones de ataque en curso por retrato
    handRemoved: null,    // índice de la carta recién jugada (para deslizar el resto)
    actingEnemy: null     // enemigo que está haciendo su jugada
};
window.GAME = GAME;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const difficulty = () => window.getDifficulty(GAME.player ? GAME.player.difficulty : GAME.selectedDifficulty);
// Castillo (1-3) y piso (1-3) en los que estás, y el tema del piso
const currentCastle = () => window.CASTLES[(GAME.player ? GAME.player.act : 1) - 1] || window.CASTLES[0];
const currentFloorNo = () => (GAME.player && GAME.player.floor) || 1;
function currentThemeId() {
    if (GAME.walls && GAME.walls.themeId && window.FLOOR_THEMES[GAME.walls.themeId]) return GAME.walls.themeId;
    return window.floorThemeId(GAME.player && GAME.player.plan, GAME.player ? GAME.player.act : 1, currentFloorNo());
}
const currentTheme = () => window.FLOOR_THEMES[currentThemeId()] || window.FLOOR_THEMES.huerto;
// Vista combinada que usa la interfaz: n = castillo, floor = piso, name/subtitle = los del piso
function currentAct() {
    const castle = currentCastle(), theme = currentTheme();
    return { n: castle.n, floor: currentFloorNo(), id: theme.id, name: theme.name, subtitle: theme.subtitle, icon: theme.icon,
        castle, theme, castleName: castle.name, boss: castle.bosses[0] };
}

// ---------------------------------------------------------
// GUARDADO (localStorage)
// ---------------------------------------------------------
function saveGame() {
    if (!GAME.player || GAME.screen === 'combat' || GAME.tutorial) return; // no se guarda a mitad de un combate ni en el tutorial
    const p = GAME.player;
    try {
        const data = {
            characterId: p.characterId,
            player: {
                hp: p.hp, maxHp: p.maxHp, gold: p.gold, maxEnergy: p.maxEnergy,
                relics: p.relics, relicCounters: p.relicCounters, deck: p.deck,
                permanentStrength: p.permanentStrength, act: p.act, floor: p.floor, plan: p.plan, difficulty: p.difficulty, removals: p.removals,
                seeds: p.seeds, hasGoldenKey: p.hasGoldenKey
            },
            map: GAME.map,
            walls: GAME.walls,
            visited: GAME.visited,
            playerPos: GAME.playerPos,
            // pantallas a las que se puede volver al continuar (el resto regresa al mapa)
            screen: RESUMABLE_SCREENS.includes(GAME.screen) ? GAME.screen
                : (SIDE_SCREENS.includes(GAME.screen) && RESUMABLE_SCREENS.includes(GAME.returnTo)) ? GAME.returnTo : 'map',
            // recompensas pendientes (para no perderlas si sales o recargas)
            reward: { cards: (GAME.rewardCards || []).map((c) => c.id), picked: !!GAME.rewardCardPicked, after: GAME.afterReward, kind: GAME.combatKind },
            loot: window.openLoot ? openLoot() : [],
            dungeon: GAME.dungeon ? Object.assign({}, GAME.dungeon, { pending: null }) : null,
            wellSpins: GAME.wellSpins || 0,
            wellLastMsg: GAME.wellLastMsg || ''
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* almacenamiento no disponible, se ignora */ }
}
function readSave() {
    try {
        const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}
function hasSave() { return !!readSave(); }
function loadGame() {
    const data = readSave();
    if (!data) return false;
    try {
        const p = new Player();
        Object.assign(p, data.player);
        p.characterId = data.characterId;
        p.name = (window.CHARACTER_DB[data.characterId] || {}).name || p.name;
        p.relics = (p.relics || []).filter((r) => window.RELIC_DB[r]);
        p.deck = (p.deck || []).filter((id) => window.getCard(id));
        p.relicCounters = p.relicCounters || {};
        p.seeds = Array.from({ length: window.SEED_SLOTS }, (_, i) => ((p.seeds || [])[i] && window.SEED_DB[p.seeds[i]] ? p.seeds[i] : null));
        // partidas viejas: sin pisos ni plan de temas
        p.floor = Math.min(window.FLOORS_PER_CASTLE, Math.max(1, p.floor || 1));
        p.act = Math.min(window.CASTLES.length, Math.max(1, p.act || 1));
        if (!window.planIsValid(p.plan)) p.plan = window.planRun();
        p.difficulty = window.getDifficulty(p.difficulty).id;
        GAME.player = p;
        GAME.map = data.map;
        GAME.walls = data.walls;
        const { cols } = window.mapDims(GAME.walls, GAME.map);
        // partidas viejas: se ubica al jefe y se quitan las trampas del mapa
        if (GAME.walls.bossY == null) {
            GAME.walls.bossY = GAME.map.findIndex((row) => row[cols - 1] === 'boss');
        }
        // los regalos (ya no existen) pasan a ser misterios; un río viejo pasa a la lista de ríos
        GAME.map.forEach((row) => row.forEach((cell, x) => { if (cell === 'gift') row[x] = 'mystery'; }));
        if (!GAME.walls.rivers) GAME.walls.rivers = GAME.walls.riverCol != null ? [{ col: GAME.walls.riverCol, bridge: GAME.walls.bridgeRow }] : [];
        if (!GAME.walls.themeId || !window.FLOOR_THEMES[GAME.walls.themeId]) GAME.walls.themeId = window.floorThemeId(p.plan, p.act, p.floor);
        if (!window.ENEMY_DB[GAME.walls.bossId]) GAME.walls.bossId = window.pickBoss(p.act, p.floor, GAME.walls.themeId);
        window.ensureNoTraps(GAME.walls, GAME.map);
        GAME.map.forEach((row) => { row[cols - 1] = 'boss'; });
        GAME.visited = data.visited || [];
        GAME.playerPos = data.playerPos;
        if (GAME.playerPos.x === cols - 1) GAME.playerPos.x -= 1;
        GAME.mapPan = null;
        GAME.dungeon = data.dungeon || null;
        GAME.wellSpins = data.wellSpins || 0;
        GAME.wellLastMsg = data.wellLastMsg || '';
        GAME.screen = RESUMABLE_SCREENS.includes(data.screen) ? data.screen : 'map';
        GAME.loot = [];
        const savedLoot = (data.loot || []).map((it) => Object.assign({ taken: false }, it));
        if (GAME.screen === 'reward') {
            const rw = data.reward;
            if (rw && ((rw.cards && rw.cards.length && !rw.picked) || savedLoot.length)) {
                GAME.loot = savedLoot;
                GAME.rewardCards = (rw.cards || []).map((id) => window.getCard(id)).filter(Boolean);
                GAME.rewardCardPicked = !!rw.picked;
                GAME.afterReward = rw.after || 'map';
                GAME.combatKind = rw.kind || 'enemy';
                GAME.passGain = null;
                GAME.newCosmetic = null;
            } else GAME.screen = 'map';
        }
        if (GAME.screen === 'dungeon' && !GAME.dungeon) GAME.screen = 'map';
        // al continuar en el objeto de jefe se vuelven a sortear las opciones
        if (GAME.screen === 'boss-relic') {
            const owned = new Set(p.relics);
            const pool = Object.values(window.RELIC_DB).filter((r) => r.tier === 'boss' && !owned.has(r.id));
            GAME.bossRelicChoices = [];
            while (GAME.bossRelicChoices.length < 3 && pool.length) GAME.bossRelicChoices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
        // fuera de las recompensas, lo que quedó sin recoger se da solo
        if (GAME.screen !== 'reward' && window.grantAllLoot) grantAllLoot(savedLoot);
        GAME.combat = null;
        return true;
    } catch (e) { return false; }
}
function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch (e) { /* ignore */ }
}
function markDiscovered(cardIds) {
    try {
        const raw = localStorage.getItem(DISCOVERED_KEY);
        const set = new Set(raw ? JSON.parse(raw) : []);
        cardIds.forEach((id) => set.add(String(id).replace(/\+$/, '')));
        localStorage.setItem(DISCOVERED_KEY, JSON.stringify(Array.from(set)));
    } catch (e) { /* ignore */ }
}
function getDiscovered() {
    try {
        const raw = localStorage.getItem(DISCOVERED_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

// ---------------------------------------------------------
// CARTAS Y RELIQUIAS AL AZAR
// ---------------------------------------------------------
const REWARD_RARITIES = ['common', 'uncommon', 'rare'];
// Cartas que puede conseguir la fruta actual: las suyas y las neutrales.
// neutral: true → solo neutrales, false → solo las de la fruta.
function cardsOfRarity(rarity, type, neutral) {
    const ch = GAME.player ? GAME.player.characterId : null;
    return Object.values(window.CARD_DB).filter((c) => c.rarity === rarity && (!type || c.type === type)
        && (neutral === true ? !c.character : neutral === false ? c.character === ch : (!c.character || c.character === ch)));
}
// Rareza al azar: las raras salen más en élites/jefes y en niveles altos
function rollRarity(kind) {
    const act = GAME.player ? GAME.player.act : 1;
    let rare = 4 + act * 2, uncommon = 30 + act * 3;
    if (kind === 'elite') { rare *= 2; uncommon += 10; }
    if (kind === 'boss') return 'rare';
    const r = Math.random() * 100;
    return r < rare ? 'rare' : r < rare + uncommon ? 'uncommon' : 'common';
}
// Cartas de recompensa distintas entre sí. En niveles altos algunas vienen maduradas.
function rollRewardCards(n, kind, type) {
    const act = GAME.player ? GAME.player.act : 1;
    const upChance = act === 1 ? 0 : act === 2 ? 0.15 : 0.3;
    const used = new Set();
    const result = [];
    for (let guard = 0; result.length < n && guard < 100; guard++) {
        // 3 de cada 4 cartas son de la fruta; el resto, neutrales
        const rarity = rollRarity(kind);
        let pool = cardsOfRarity(rarity, type, Math.random() < 0.25).filter((c) => !used.has(c.id));
        if (!pool.length) pool = cardsOfRarity(rarity, type).filter((c) => !used.has(c.id));
        if (!pool.length) continue;
        const c = pickOne(pool);
        used.add(c.id);
        result.push(window.getCard(Math.random() < upChance ? `${c.id}+` : c.id));
    }
    markDiscovered(result.map((c) => c.id));
    return result;
}
function randomRelic(tiers) {
    const owned = new Set([...GAME.player.relics, ...(window.lootRelicIds ? lootRelicIds() : [])]);
    const pool = Object.values(window.RELIC_DB).filter((r) => !owned.has(r.id) && tiers.includes(r.tier));
    if (!pool.length) return null;
    // las raras salen menos
    const weight = { common: 5, uncommon: 3, rare: 2, boss: 1 };
    let r = Math.random() * pool.reduce((s, x) => s + weight[x.tier], 0);
    for (const x of pool) { r -= weight[x.tier]; if (r <= 0) return x; }
    return pool[pool.length - 1];
}
function giveRelic(player, relic) {
    if (GAME.lootCapture) { queueLoot({ k: 'relic', id: relic.id }); return; }
    player.relics.push(relic.id);
    if (window.markFound) markFound('relics', relic.id);
    if (window.Sfx) Sfx.relicGet();
    if (relic.onPickup) relic.onPickup(player);
}
function grantRandomRelic(player) {
    const relic = randomRelic(['common', 'uncommon', 'rare']);
    if (!relic) return 'Ya tienes todos los objetos disponibles.';
    giveRelic(player, relic);
    GAME.lastRelic = relic;
    return `Obtuviste el objeto ${relic.name}: ${relic.description}`;
}

// ---------------------------------------------------------
// MENÚ / SELECCIÓN DE PERSONAJE Y DIFICULTAD
// ---------------------------------------------------------
function showMainMenu() { GAME.returnTo = null; GAME.inventory = null; GAME.mg = null; exitTutorial(); GAME.screen = 'menu'; GAME.modal = null; render(); }
function goToCharacterSelect() { exitTutorial(); GAME.screen = 'character-select'; render(); }
// Pantallas "de lado" (pase, vestidor, álbum, notas): si se abren en plena
// partida (p. ej. desde las recompensas), Volver regresa justo ahí.
const SIDE_SCREENS = ['pass', 'wardrobe', 'collection', 'bestiary', 'notes'];
function rememberReturn() {
    if (SIDE_SCREENS.includes(GAME.screen)) return;
    GAME.returnTo = GAME.screen === 'menu' ? null : GAME.screen;
    GAME.inventory = null;
    hideTip();
}
function backLabel() { return GAME.returnTo ? 'Volver a la partida' : 'Volver'; }
function openWardrobe() {
    rememberReturn();
    if (GAME.player && window.CHARACTER_DB[GAME.player.characterId]) GAME.wardrobeChar = GAME.player.characterId;
    GAME.screen = 'wardrobe';
    render();
}
function wardrobeSelect(charId) { GAME.wardrobeChar = charId; render(); }
function wardrobeEquip(id) {
    if (!window.isCosmeticOwned(id)) { showToast('Aún no lo tienes: se gana en el Pase de Batalla'); return; }
    if (window.Sfx) Sfx.equip();
    window.equipCosmetic(GAME.wardrobeChar, id);
    render();
    restartClass(document.querySelector('.wardrobe-preview .art'), 'dress-pop');
}
function wardrobeClear(slot) { window.unequipSlot(GAME.wardrobeChar, slot); render(); }
function wearNewPet(id) {
    const c = window.getCosmetic(id);
    if (!c) return;
    if (window.equippedFor(c.char).pet !== id) window.equipCosmetic(c.char, id);
    if (window.Sfx) Sfx.equip();
    showToast(`¡${c.name} te acompaña!`);
    render();
}
function wearNewCosmetic() {
    const c = GAME.newCosmetic;
    if (!c) return;
    const who = c.char || GAME.player.characterId;
    const eq = window.equippedFor(who);
    if (c.type === 'skin' ? eq.skin !== c.id : eq[c.slot] !== c.id) window.equipCosmetic(who, c.id);
    if (window.Sfx) Sfx.equip();
    c.worn = true;
    showToast(`¡${c.name} puesto!`);
    render();
}
function backToMenu() {
    const back = GAME.returnTo;
    GAME.returnTo = null;
    GAME.screen = back || 'menu';
    render();
}
// Grado de putrefacción más alto desbloqueado para cada fruta (índice en DIFFICULTIES)
function readUnlocks() {
    try {
        const raw = localStorage.getItem(UNLOCKS_KEY);
        if (raw) return JSON.parse(raw) || {};
        // migración: la v1 tenía 4 grados (Verde, Madura, Pasada, Podrida); ahora el 0 es Madura
        const old = JSON.parse(localStorage.getItem('fruitSpireUnlocks_v1')) || {};
        const migrated = {};
        Object.keys(old).forEach((k) => { migrated[k] = Math.max(0, (old[k] || 0) - 1); });
        return migrated;
    } catch (e) { return {}; }
}
function unlockedLevel(charId) { return Math.min(window.DIFFICULTIES.length - 1, readUnlocks()[charId] || 0); }
function isDifficultyUnlocked(charId, diffId) {
    return window.DIFFICULTIES.findIndex((d) => d.id === diffId) <= unlockedLevel(charId);
}
// Al ganar una partida se abre el siguiente grado para esa fruta
function unlockNextDifficulty(charId, diffId) {
    const idx = window.DIFFICULTIES.findIndex((d) => d.id === diffId);
    const next = window.DIFFICULTIES[idx + 1];
    if (!next || unlockedLevel(charId) >= idx + 1) return '';
    try {
        const u = readUnlocks();
        u[charId] = idx + 1;
        localStorage.setItem(UNLOCKS_KEY, JSON.stringify(u));
    } catch (e) { return ''; }
    return `¡Desbloqueaste el grado ${next.name} para ${window.CHARACTER_DB[charId].name}!`;
}
function selectCharacter(id) {
    GAME.selectedChar = id;
    // si el grado elegido está bloqueado para esta fruta, se baja al más alto abierto
    if (!isDifficultyUnlocked(id, GAME.selectedDifficulty)) GAME.selectedDifficulty = window.DIFFICULTIES[unlockedLevel(id)].id;
    render();
}
function selectDifficulty(id) {
    if (!isDifficultyUnlocked(GAME.selectedChar, id)) { showToast('Gana en el grado anterior con esta fruta para desbloquearlo'); return; }
    GAME.selectedDifficulty = id;
    render();
}
function continueGame() { exitTutorial(); if (loadGame()) render(); }
function newGame() { goToCharacterSelect(); }

function startNewGameWithCharacter(id) {
    exitTutorial();
    id = id || GAME.selectedChar;
    const def = window.CHARACTER_DB[id];
    if (!isDifficultyUnlocked(id, GAME.selectedDifficulty)) GAME.selectedDifficulty = window.DIFFICULTIES[unlockedLevel(id)].id;
    const diff = window.getDifficulty(GAME.selectedDifficulty);
    const p = new Player();
    p.characterId = id;
    p.name = def.name;
    p.maxHp = def.baseHp;
    p.hp = def.baseHp;
    p.difficulty = diff.id;
    p.gold = diff.gold;
    p.act = 1;
    p.floor = 1;
    p.plan = window.planRun(); // los temas de los 9 pisos de esta partida
    p.deck = window.starterDeckFor(id);
    if (diff.curse) p.deck.push(diff.curse);
    GAME.player = p;
    GAME.combat = null;
    GAME.anim = false;
    GAME.actHealed = 0;
    GAME.actCurse = null;
    GAME.dungeon = null;
    newActMap();
    markDiscovered(p.deck);
    saveGame();
    // primero la historia animada (ver js/story.js); al terminar se muestra la portada del piso
    if (window.startStory) window.startStory();
    else showActIntro();
}
function showActIntro() {
    GAME.screen = 'act-intro';
    if (window.Sfx) Sfx.actFanfare();
    saveGame();
    render();
}

// Mapa nuevo para el piso actual (castillo GAME.player.act, piso GAME.player.floor)
function newActMap() {
    const p = GAME.player;
    p.hasGoldenKey = false; // la llave es de este piso nada más
    if (!window.planIsValid(p.plan)) p.plan = window.planRun();
    p.floor = p.floor || 1;
    const themeId = window.floorThemeId(p.plan, p.act, p.floor);
    const theme = window.FLOOR_THEMES[themeId];
    const { cols, rows } = window.floorSize(p.act, p.floor);
    const variant = window.pickMapVariant(theme.variant);
    GAME.playerPos = { x: 0, y: Math.floor(rows / 2) };
    const g = window.generateMap(GAME.playerPos.y, { elites: difficulty().elites, cols, rows, variant, games: theme.games });
    GAME.map = g.grid;
    GAME.walls = {
        wallsV: g.wallsV, wallsH: g.wallsH, bossY: g.bossY, bossId: window.pickBoss(p.act, p.floor, themeId),
        rivers: g.rivers, riverCol: g.riverCol, bridgeRow: g.bridgeRow, cols, rows, themeId, variant: g.variant, seed: g.seed
    };
    GAME.visited = [`${GAME.playerPos.x},${GAME.playerPos.y}`];
    GAME.mapPan = null;
}
function beginAct() { GAME.screen = 'map'; saveGame(); render(); }
// Encuentro para una casilla del piso actual. progress: 0 (inicio) a 1 (junto al jefe)
function encounterFor(kind, progress) {
    return window.pickEncounter(GAME.player.act, progress, kind, GAME.walls && GAME.walls.bossId, currentThemeId());
}

// ---------------------------------------------------------
// VISOR DE CARTAS (mazo, pilas)
// ---------------------------------------------------------
function openDeckView() {
    if (!GAME.player) return;
    GAME.modal = { title: 'Tu mazo', note: `${GAME.player.deck.length} cartas en total.`, ids: GAME.player.deck };
    render();
}
function openPile(which) {
    const p = GAME.player;
    if (!GAME.combat || !p) return;
    GAME.modal = {
        draw: { title: 'Pila de robo', note: 'Cartas que todavía puedes robar (el orden es secreto).', ids: p.drawPile },
        discard: { title: 'Pila de descarte', note: 'Cuando la pila de robo se acabe, estas cartas se barajan de vuelta.', ids: p.discardPile },
        exhaust: { title: 'Compost', note: 'Cartas consumidas: no vuelven en este combate.', ids: p.exhaustPile }
    }[which];
    render();
}
function closeModal() { GAME.modal = null; render(); }

// ---------------------------------------------------------
// MAPA
// ---------------------------------------------------------
// Adelante, arriba o abajo, nunca atrás ni a una casilla ya pisada.
function isReachable(x, y) {
    return window.canMove(GAME.walls, GAME.map, new Set(GAME.visited), GAME.playerPos.x, GAME.playerPos.y, x, y);
}
function movePlayer(x, y) {
    if (GAME.anim || !isReachable(x, y)) return;
    GAME.anim = true;
    if (window.Sfx) Sfx.mapMove();
    const from = { ...GAME.playerPos };

    // animación de caminar: la ficha salta hasta la casilla nueva
    const token = document.getElementById('player-token');
    if (token) {
        token.classList.add('walking', x > from.x ? 'dir-right' : y < from.y ? 'dir-up' : 'dir-down');
        token.style.left = cellPos(x) + 'px';
        token.style.top = cellPos(y) + 'px';
        const board = document.getElementById('map-board');
        if (board) {
            const puff = document.createElement('div');
            puff.className = 'dust-puff';
            puff.style.left = (cellPos(from.x) + MAP_CELL / 2) + 'px';
            puff.style.top = (cellPos(from.y) + MAP_CELL * 0.8) + 'px';
            board.appendChild(puff);
        }
    }

    setTimeout(() => {
        GAME.playerPos = { x, y };
        const k = `${x},${y}`;
        if (!GAME.visited.includes(k)) GAME.visited.push(k);
        const type = GAME.map[y][x];
        // la casilla se "consume"
        if (type !== window.NODE_TYPES.BOSS) GAME.map[y][x] = window.NODE_TYPES.EMPTY;
        GAME.anim = false;
        enterNode(type);
    }, token ? 460 : 0);
}

function enterNode(type) {
    const T = window.NODE_TYPES;
    const act = GAME.player.act;
    const { cols } = window.mapDims(GAME.walls, GAME.map);
    if (type === T.ENEMY || type === T.ELITE || type === T.BOSS) {
        const kind = type === T.ELITE ? 'elite' : type === T.BOSS ? 'boss' : 'enemy';
        playCombatIntro(encounterFor(kind, GAME.playerPos.x / (cols - 1)), kind);
        return;
    }
    if (type === T.REST) {
        GAME.screen = 'rest';
        GAME.restMode = null;
    } else if (type === T.TREASURE) {
        if (window.Sfx) Sfx.chestOpen();
        GAME.lastRelic = null;
        GAME.loot = [];
        GAME.lastEventMsg = withLootCapture(() => grantRandomRelic(GAME.player));
        GAME.newCosmetic = null;
        GAME.screen = 'treasure';
        saveGame();
    } else if (type === T.GAME) {
        openGameTable();
        return;
    } else if (type === T.KEY) {
        if (window.Sfx) Sfx.sparkle();
        GAME.player.hasGoldenKey = true;
        GAME.screen = 'key-found';
        saveGame();
    } else if (type === T.VAULT) {
        const p = GAME.player;
        GAME.loot = [];
        withLootCapture(() => {
        if (p.hasGoldenKey) {
            p.hasGoldenKey = false;
            const gold = 40 + Math.floor(Math.random() * 20);
            p.gold += gold;
            GAME.lastRelic = null;
            GAME.lastEventMsg = `${grantRandomRelic(p)} Además, ${gold} de oro brillante.`;
            GAME.vaultOpened = true;
        } else {
            const gold = 15 + Math.floor(Math.random() * 10);
            p.gold += gold;
            GAME.lastEventMsg = `El cofre está sellado. Sin la Llave Dorada solo puedes forzar la cerradura: consigues ${gold} de oro.`;
            GAME.vaultOpened = false;
        }
        });
        if (window.Sfx) Sfx.chestOpen();
        GAME.screen = 'vault';
        saveGame();
    } else if (type === T.SHOP) {
        openShop();
    } else if (type === T.MYSTERY) {
        if (window.Sfx) Sfx.eventOpen();
        const themeId = currentThemeId();
        const pool = window.EVENT_DB.filter((ev) => (!ev.acts || ev.acts.includes(act)) && (!ev.themes || ev.themes.includes(themeId)) && ev.id !== GAME.lastEventId);
        // en el tutorial siempre sale un evento tranquilo (sin peleas ni minijuegos)
        GAME.currentEvent = GAME.tutorial ? window.EVENT_DB.find((ev) => ev.id === 'fuente_magica') : pickEvent(pool.length ? pool : window.EVENT_DB);
        GAME.lastEventId = GAME.currentEvent.id;
        GAME.lastEventMsg = '';
        GAME.screen = 'event';
    } else {
        GAME.screen = 'map';
        saveGame();
    }
    render();
}

// ---------------------------------------------------------
// COMBATE
// ---------------------------------------------------------
// Pantalla de transición "¡A pelear!" antes de cada combate
function playCombatIntro(enemyIds, kind) {
    GAME.anim = true;
    if (window.Sfx) Sfx.introSting(kind === 'elite' || kind === 'boss');
    const defs = enemyIds.map((id) => window.ENEMY_DB[id]);
    const names = defs.map((d) => d.name);
    const final = kind === 'boss' && defs[0].final;
    const title = final ? '¡Jefe final!' : kind === 'boss' ? '¡Jefe!' : kind === 'elite' ? '¡Élite!' : '¡A pelear!';
    const overlay = document.getElementById('overlay');
    const intro = document.createElement('div');
    intro.className = `combat-intro ${kind} ${defs.length > 1 ? 'group' : ''} act-${GAME.player.act}`;
    intro.innerHTML = `
        <div class="intro-half top tape-0"></div>
        <div class="intro-half bottom tape-1"></div>
        <div class="intro-center">
            <div class="intro-sprites">${defs.map((d) => art(d.sprite || d.id, d.icon, { size: 'xl' })).join('')}</div>
            <div class="intro-title">${title}</div>
            <div class="intro-name hand">${names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0]}</div>
        </div>`;
    overlay.appendChild(intro);
    // si mientras tanto se salió al menú (o empezó otra partida), la transición no arranca un combate fantasma
    const token = (GAME.introToken = {});
    const alive = () => GAME.introToken === token && GAME.player;
    setTimeout(() => { if (alive()) startCombat(enemyIds, kind); }, 1050);
    setTimeout(() => intro.classList.add('out'), 1150);
    setTimeout(() => {
        intro.remove();
        if (!alive()) return;
        GAME.anim = false;
        showTurnBanner('¡Tu turno!', 'player');
    }, 1650);
}

function startCombat(enemyIds, kind) {
    GAME.inventory = null;
    // tutorial: el primer combate es siempre contra un solo enemigo que solo ataca
    if (GAME.tutorial && GAME.tutorial.firstFight && kind !== 'boss') enemyIds = ['avispa_furiosa'];
    const defs = enemyIds.map((id) => window.ENEMY_DB[id]);
    GAME.screen = 'combat';
    GAME.combatKind = kind;
    GAME.seedMenu = null;
    GAME.seedTargeting = null;
    GAME.modal = null;
    GAME.lastBars = {};
    GAME.lastEnergy = null;
    GAME.dyingAt = {};
    GAME.lastPhase = {};
    GAME.pAnims = {};
    GAME.seenEnemies = new WeakSet();
    GAME.handRemoved = null;
    GAME.actingEnemy = null;
    GAME.dealIn = true;
    GAME.combatEnter = true;
    GAME.combatBg = pickCombatBg(kind);
    GAME.cardQueue = [];
    GAME.wantsEndTurn = false;
    GAME.selectedCard = null;
    // el motor avisa cambios desde su constructor, antes de que GAME.combat
    // exista; ese primer aviso se ignora para no gastar las animaciones de entrada
    const onUpdate = () => { if (GAME.combat && GAME.combat.player === GAME.player && GAME.screen === 'combat') render(); };
    GAME.combat = null;
    GAME.combat = new Combat(GAME.player, defs, onUpdate, (result) => {
        // se deja ver el golpe final (los enemigos caídos se animan solos al redibujar)
        GAME.anim = true;
        if (window.Sfx) (result === 'lose' ? Sfx.lose : Sfx.win)();
        if (result === 'lose') {
            setTimeout(() => {
                const el = document.getElementById('portrait-player');
                if (el) el.classList.add('defeated');
            }, 350);
        }
        setTimeout(() => onCombatEnd(result, kind), 1500);
    }, { mods: window.scaledMods(difficulty().mods, GAME.player.act, currentFloorNo()), rule: GAME.tutorial ? (kind === 'boss' ? window.FLOOR_THEMES.huerto.rule : null) : currentTheme().rule });
    if (GAME.tutorial && GAME.tutorial.firstFight) {
        GAME.tutorial.firstFight = false;
        const hand = GAME.combat.player.hand;
        const all = [...hand, ...GAME.combat.player.drawPile];
        const take = (id) => { const k = all.indexOf(id); return k >= 0 ? all.splice(k, 1)[0] : null; };
        const fixed = ['golpe_cascara', 'jugo_defensivo', 'golpe_cascara', 'jugo_defensivo', 'golpe_cascara'].map(take).filter(Boolean);
        GAME.combat.player.hand = fixed;
        GAME.combat.player.drawPile = all;
        // el primer enemigo aguanta lo suficiente para que se puedan ver todos los pasos
        GAME.combat.enemies.forEach((e) => { e.maxHp = Math.max(e.maxHp, 44); e.hp = e.maxHp; });
    }
    render();
}

function onCombatEnd(result, kind) {
    GAME.anim = false;
    GAME.modal = null;
    const p = GAME.player;
    awardCombatXp(GAME.combat); // gane o pierda, cada enemigo derrotado suma al pase
    if (window.bestiaryRecordCombat) bestiaryRecordCombat(GAME.combat);
    // tutorial: no se puede perder (se repite el combate) y el jefe lo termina
    if (GAME.tutorial) {
        if (result !== 'win') {
            p.hp = p.maxHp;
            showToast('¡No te rindas! Vamos otra vez.');
            startCombat(GAME.combat.enemies.map((e) => e.defId).filter((id, i, a) => a.indexOf(id) === i), kind);
            return;
        }
        if (kind === 'boss') { GAME.combat = null; GAME.screen = 'tutorial-end'; render(); return; }
    }
    if (result !== 'win') {
        clearSave();
        GAME.screen = 'gameover';
        render();
        return;
    }
    if (kind === 'dungeon') {
        // el calabozo no reparte cartas ni sube de recompensa cada golpe:
        // solo un poco de oro por casilla, y el premio bueno al vaciarlo
        const d = GAME.dungeon;
        const cell = d.pending;
        d.cleared[cell.y][cell.x] = true;
        d.pos = cell;
        d.pending = null;
        p.statuses = {};
        p.block = 0;
        const isExit = cell.x === d.exit.x && cell.y === d.exit.y;
        if (isExit) {
            const gold = 45 + Math.floor(Math.random() * 25);
            GAME.lastRelic = null;
            GAME.newCosmetic = null;
            GAME.loot = [];
            GAME.lastEventMsg = withLootCapture(() => { p.gold += gold; return `${grantRandomRelic(p)} Y ${gold} de oro por vaciar el calabozo.`; });
            GAME.dungeon = null;
            if (window.Sfx) Sfx.chestOpen();
            GAME.screen = 'treasure';
        } else {
            const gold = 8 + Math.floor(Math.random() * 8);
            p.gold += gold;
            showToast(`+${gold} de oro`);
            GAME.screen = 'dungeon';
        }
        saveGame();
        render();
        return;
    }
    const char = window.CHARACTER_DB[p.characterId];
    if (char && char.onCombatEnd) char.onCombatEnd(p);
    p.relics.forEach((rid) => { const r = window.RELIC_DB[rid]; if (r && r.onCombatEnd) r.onCombatEnd(p); });
    p.statuses = {};
    p.block = 0;

    if (kind === 'boss') GAME.lastBossId = GAME.combat && GAME.combat.enemies[0] ? GAME.combat.enemies[0].defId : null;
    // El jefe del último piso de cada castillo es el "jefe del castillo"; los de los pisos 1 y 2
    // son guardianes: reparten un botín parecido al de una élite y suben al siguiente piso.
    const isCastleBoss = kind === 'boss' && (GAME.tutorial || p.floor >= window.FLOORS_PER_CASTLE);
    const isFinalBoss = isCastleBoss && !GAME.tutorial && p.act >= window.CASTLES.length;
    GAME.newPets = isCastleBoss
        ? window.checkPetUnlocks(p.characterId, { bossAct: p.act, win: isFinalBoss ? p.difficulty : null }) : [];
    if (isFinalBoss) {
        // el Rey Fruta queda libre: se acabó la partida
        GAME.unlockMsg = unlockNextDifficulty(p.characterId, p.difficulty);
        clearSave();
        // primero el final animado; al terminar pasa a la pantalla de victoria
        if (window.startEnding) { GAME.combat = null; startEnding(); return; }
        GAME.screen = 'victory';
        render();
        return;
    }
    const rewardKind = kind === 'boss' && !isCastleBoss ? 'elite' : kind;
    const gold = isCastleBoss ? 70 + Math.floor(Math.random() * 20)
        : kind === 'boss' ? 45 + Math.floor(Math.random() * 20)
            : kind === 'elite' ? 28 + Math.floor(Math.random() * 14)
                : 12 + Math.floor(Math.random() * 12);
    const pet = window.petFor(p.characterId);
    const petGold = pet && pet.onWin ? pet.onWin(p) || 0 : 0;
    GAME.loot = [];
    queueLoot({ k: 'gold', n: gold + petGold });
    GAME.rewardCards = rollRewardCards(3, rewardKind);
    GAME.rewardCardPicked = false;
    if (rewardKind === 'elite') {
        const relic = randomRelic(['common', 'uncommon', 'rare']);
        if (relic) queueLoot({ k: 'relic', id: relic.id });
    }
    const seedChance = GAME.tutorial ? 1 : kind === 'boss' ? 1 : kind === 'elite' ? 0.45 : 0.25;
    const seedId = GAME.tutorial ? 'semilla_chile' : Math.random() < seedChance ? window.rollSeed().id : null;
    if (seedId) queueLoot({ k: 'seed', id: seedId });
    GAME.newCosmetic = null; // los accesorios ahora se ganan en el Pase de Batalla
    GAME.afterReward = isCastleBoss ? 'boss-relic' : kind === 'boss' ? 'next-floor' : 'map';
    GAME.screen = 'reward';
    saveGame();
    render();
}

// Experiencia del pase de batalla por los enemigos derrotados en un combate
function awardCombatXp(combat) {
    GAME.passGain = null;
    if (!combat || GAME.tutorial || !window.PASS) return;
    const xp = Math.min(160, Math.floor(combat.xpGained || 0));
    if (xp > 0) GAME.passGain = window.PASS.addXp(xp);
}

// ---------- semillas ----------
function addSeed(id) {
    const p = GAME.player;
    const i = p.seeds.indexOf(null);
    if (i < 0) return false;
    p.seeds[i] = id;
    if (window.markFound) markFound('seeds', id);
    return true;
}
// Tocar una semilla abre su menú (usar / tirar)
function clickSeed(i) {
    if (GAME.anim) return;
    GAME.seedMenu = GAME.seedMenu === i ? null : i;
    GAME.seedTargeting = null;
    render();
}
function discardSeed(i) {
    GAME.player.seeds[i] = null;
    GAME.seedMenu = null;
    GAME.seedTargeting = null;
    saveGame();
    render();
}
function canUseSeedNow() {
    const c = GAME.combat;
    return !!c && GAME.screen === 'combat' && !GAME.anim && !c.ended && c.turn === 'player';
}
function useSeedFromMenu(i) {
    const id = GAME.player.seeds[i];
    const seed = window.SEED_DB[id];
    if (!seed) return;
    if (!canUseSeedNow()) { showToast('Las semillas se usan en combate, en tu turno'); return; }
    GAME.seedMenu = null;
    const alive = aliveEnemyIndexes(GAME.combat);
    if (seed.target === 'enemy' && alive.length > 1) {
        GAME.seedTargeting = i;
        render();
        showToast('Toca al enemigo que quieras');
        return;
    }
    useSeed(i, seed.target === 'enemy' ? alive[0] : null);
}
function cancelSeedAim() { GAME.seedTargeting = null; render(); }
function useSeedOn(k) {
    if (GAME.seedTargeting == null) return;
    const i = GAME.seedTargeting;
    GAME.seedTargeting = null;
    useSeed(i, k);
}
async function useSeed(i, targetIdx) {
    const c = GAME.combat;
    const id = GAME.player.seeds[i];
    if (!canUseSeedNow() || !id) return;
    GAME.anim = true;
    if (window.Sfx) Sfx.seedUse();
    GAME.player.seeds[i] = null;
    const seed = window.SEED_DB[id];
    showActionBanner('player', seed.name, id, seed.icon);
    playPortraitAnim('player', 'cast');
    await wait(320);
    if (GAME.combat !== c) return;
    c.useSeed(id, targetIdx);
    if (window.tutorialNotify) tutorialNotify('seed-use');
    spawnFx(c.lastEvents, { fx: 'burst' });
    await wait(400);
    if (GAME.combat === c && !c.ended) GAME.anim = false;
}

function finishReward() {
    if (lootNudge()) return;
    GAME.loot = [];
    GAME.rewardCardPicked = false;
    GAME.combat = null;
    if (GAME.afterReward === 'boss-relic') { openBossRelics(); return; }
    if (GAME.afterReward === 'next-floor') { startNextAct(); return; }
    GAME.screen = 'map';
    saveGame();
    render();
}
function pickRewardCard(cardId, el) {
    if (GAME.anim) return;
    GAME.anim = true;
    hideTip();
    if (window.Sfx) Sfx.pop();
    GAME.player.deck.push(cardId);
    const row = el && el.closest('.reward-row');
    if (row) row.querySelectorAll('.card').forEach((c) => { if (c !== el) c.classList.add('fade-away'); });
    if (el) el.classList.add('taken');
    flyGhost(el, '.hud-deck');
    GAME.rewardCardPicked = true;
    // si aún quedan premios por recoger, se espera a que los recojas
    setTimeout(() => { GAME.anim = false; if (lootPending()) { saveGame(); render(); } else finishReward(); }, 820);
}
// al recoger el último premio de la recompensa (ya con la carta elegida) se sigue solo
window.onLootDone = function () {
    if (GAME.screen === 'reward' && (GAME.rewardCardPicked || !GAME.rewardCards.length) && GAME.rewardCards.length) setTimeout(() => { if (GAME.screen === 'reward' && !GAME.anim) finishReward(); }, 450);
};
// La carta es obligatoria: solo se puede continuar sin elegir si no hubo ninguna que ofrecer
function skipReward() { if (!GAME.anim && (!GAME.rewardCards.length || GAME.rewardCardPicked)) finishReward(); }

// ---------- objetos de jefe y paso de nivel ----------
function openBossRelics() {
    const owned = new Set(GAME.player.relics);
    const pool = Object.values(window.RELIC_DB).filter((r) => r.tier === 'boss' && !owned.has(r.id));
    const choices = [];
    while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    GAME.bossRelicChoices = choices;
    GAME.screen = 'boss-relic';
    saveGame();
    render();
}
function pickBossRelic(id, el) {
    if (GAME.anim) return;
    const relic = window.RELIC_DB[id];
    if (!relic) return;
    GAME.anim = true;
    hideTip();
    giveRelic(GAME.player, relic);
    if (el) {
        el.closest('.boss-relic-row').querySelectorAll('.relic-card').forEach((c) => { if (c !== el) c.classList.add('fade-away'); });
        flyGhost(el, '.hud-bag');
    }
    setTimeout(() => { GAME.anim = false; startNextAct(); }, 850);
}
function skipBossRelic() { if (!GAME.anim) startNextAct(); }

// Sube al piso siguiente; tras el último piso de un castillo, pasa al castillo siguiente
function startNextAct() {
    const p = GAME.player;
    const newCastle = p.floor >= window.FLOORS_PER_CASTLE;
    if (newCastle) { p.act = Math.min(window.CASTLES.length, p.act + 1); p.floor = 1; } else p.floor += 1;
    const before = p.hp;
    const frac = newCastle ? difficulty().actHeal : (difficulty().floorHeal != null ? difficulty().floorHeal : difficulty().actHeal / 2);
    p.heal(Math.ceil((p.maxHp - p.hp) * frac));
    GAME.actHealed = p.hp - before;
    // cada castillo nuevo pesa: una maldición se cuela en tu mazo
    GAME.actCurse = newCastle ? (p.act === 2 ? 'dado_trucado' : 'gusano_interior') : null;
    if (GAME.actCurse) { p.deck.push(GAME.actCurse); markDiscovered([GAME.actCurse]); }
    GAME.dungeon = null;
    newActMap();
    showActIntro();
}

// ---------------------------------------------------------
// CAMPAMENTO: descansar, madurar o despegar una carta
// ---------------------------------------------------------
function restHealAmount() {
    const p = GAME.player;
    const extra = p.relics.reduce((s, rid) => s + ((window.RELIC_DB[rid] || {}).onRest ? window.RELIC_DB[rid].onRest(p) : 0), 0);
    return Math.floor(p.maxHp * difficulty().restHeal) + extra;
}
function canRest() { return !GAME.player.relics.some((rid) => (window.RELIC_DB[rid] || {}).noRest); }
function restHeal() {
    if (GAME.anim || !canRest()) return;
    if (window.Sfx) Sfx.restHeal();
    GAME.player.heal(restHealAmount());
    leaveRest();
}
function setRestMode(mode) { GAME.restMode = mode; render(); }
function leaveRest() { GAME.restMode = null; GAME.screen = 'map'; saveGame(); render(); }

// índice dentro del mazo: así se distingue cada copia
function restUpgradeCard(deckIndex, el) {
    if (GAME.anim) return;
    const id = GAME.player.deck[deckIndex];
    const card = window.getCard(id);
    if (!card || !card.canUpgrade) return;
    GAME.anim = true;
    hideTip();
    if (window.Sfx) Sfx.upgrade();
    GAME.player.deck[deckIndex] = `${id}+`;
    if (el) el.classList.add('ripening');
    setTimeout(() => { GAME.anim = false; leaveRest(); }, 900);
}
function removeDeckCard(deckIndex, el, after) {
    if (GAME.anim) return;
    GAME.anim = true;
    hideTip();
    if (window.Sfx) Sfx.removeCard();
    GAME.player.deck.splice(deckIndex, 1);
    if (el) el.classList.add('peeled');
    setTimeout(() => { GAME.anim = false; after(); }, 560);
}
function restRemoveCard(deckIndex, el) { removeDeckCard(deckIndex, el, leaveRest); }

// ---------------------------------------------------------
// TIENDA — se compra tocando la carta o el objeto
// ---------------------------------------------------------
const CARD_PRICES = { common: [30, 38], uncommon: [45, 55], rare: [75, 90] };
const RELIC_PRICES = { common: [85, 100], uncommon: [110, 130], rare: [150, 175] };
const priceIn = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
function openShop() {
    const cards = [
        ...rollRewardCards(2, 'enemy', 'attack'),
        ...rollRewardCards(2, 'enemy', 'skill'),
        ...rollRewardCards(1, 'elite', 'power')
    ].map((c) => ({ card: c, price: priceIn(CARD_PRICES[c.rarity] || CARD_PRICES.common) }));
    const sale = pickOne(cards);
    if (sale) { sale.price = Math.floor(sale.price / 2); sale.sale = true; }
    const relics = [];
    for (let i = 0; i < 2; i++) {
        const r = randomRelic(['common', 'uncommon', 'rare']);
        if (r && !relics.some((x) => x.relic.id === r.id)) relics.push({ relic: r, price: priceIn(RELIC_PRICES[r.tier]) });
    }
    const seedPrices = { common: [20, 26], uncommon: [32, 40], rare: [48, 58] };
    const seeds = [];
    for (let guard = 0; seeds.length < 2 && guard < 30; guard++) {
        const sd = window.rollSeed();
        if (!seeds.some((x) => x.seed.id === sd.id)) seeds.push({ seed: sd, price: priceIn(seedPrices[sd.rarity]) });
    }
    GAME.shopStock = { cards, relics, seeds, removeUsed: false };
    GAME.restMode = null;
    GAME.screen = 'shop';
}
function removalPrice() { return 50 + 25 * (GAME.player.removals || 0); }
function cantAfford(el) {
    if (window.Sfx) Sfx.denied();
    restartClass(el && el.closest('.shop-item'), 'nope');
    restartClass(document.querySelector('.hud-chip.gold'), 'nope');
    showToast('¡No te alcanza el oro!');
}
// El artículo comprado vuela al HUD, su hueco se cierra y los demás se deslizan.
function shopPurchase(el, targetSelector, apply) {
    GAME.anim = true;
    hideTip();
    if (window.Sfx) Sfx.coin();
    apply();
    if (window.tutorialNotify) tutorialNotify('shop-buy');
    const item = el.closest('.shop-item');
    if (item) item.classList.add('sold');
    restartClass(document.querySelector('.hud-chip.gold'), 'spend');
    flyGhost(el, targetSelector);
    setTimeout(() => { GAME.anim = false; saveGame(); render(); }, 400);
}
function buyShopCard(index, el) {
    if (GAME.anim) return;
    const item = GAME.shopStock.cards[index];
    if (!item) return;
    if (GAME.player.gold < item.price) { cantAfford(el); return; }
    shopPurchase(el, '.hud-deck', () => {
        GAME.player.gold -= item.price;
        GAME.player.deck.push(item.card.id);
        GAME.shopStock.cards.splice(index, 1);
    });
}
function buyShopRelic(index, el) {
    if (GAME.anim) return;
    const item = GAME.shopStock.relics[index];
    if (!item) return;
    if (GAME.player.gold < item.price) { cantAfford(el); return; }
    shopPurchase(el, '.hud-bag', () => {
        GAME.player.gold -= item.price;
        giveRelic(GAME.player, item.relic);
        GAME.shopStock.relics.splice(index, 1);
    });
}
function buyShopSeed(index, el) {
    if (GAME.anim) return;
    const item = GAME.shopStock.seeds[index];
    if (!item) return;
    if (GAME.player.gold < item.price) { cantAfford(el); return; }
    if (GAME.player.seeds.indexOf(null) < 0) { restartClass(el.closest('.shop-item'), 'nope'); showToast('Tu bolsa de semillas está llena'); return; }
    shopPurchase(el, '.hud-bag', () => {
        GAME.player.gold -= item.price;
        addSeed(item.seed.id);
        GAME.shopStock.seeds.splice(index, 1);
    });
}
function openShopRemoval(el) {
    if (GAME.anim || GAME.shopStock.removeUsed) return;
    if (GAME.player.gold < removalPrice()) { cantAfford(el); return; }
    GAME.restMode = 'remove';
    render();
}
function shopRemoveCard(deckIndex, el) {
    const price = removalPrice();
    if (GAME.player.gold < price) return;
    removeDeckCard(deckIndex, el, () => {
        GAME.player.gold -= price;
        GAME.player.removals = (GAME.player.removals || 0) + 1;
        GAME.shopStock.removeUsed = true;
        if (window.tutorialNotify) tutorialNotify('shop-buy');
        GAME.restMode = null;
        saveGame();
        render();
    });
}
function closeShopPicker() { GAME.restMode = null; render(); }
function leaveShop() { if (GAME.anim) return; GAME.restMode = null; GAME.screen = 'map'; saveGame(); render(); }

// ---------------------------------------------------------
// EVENTOS MISTERIOSOS
// ---------------------------------------------------------
function eventHelpers() {
    const p = GAME.player;
    // lo que le pasa al mazo, para mostrarlo animado en el resultado (ver js/loot.js)
    const log = (ch) => { if (GAME.deckLog) GAME.deckLog.push(ch); };
    return {
        act: p.act,
        grantRandomRelic,
        addCard(id) {
            p.deck.push(id);
            markDiscovered([id]);
            const c = window.getCard(id);
            if (c && (c.type === 'curse' || c.type === 'status')) log({ kind: 'add', to: id });
        },
        randomCard(rarity) { const r = rarity || pickOne(REWARD_RARITIES); return pickOne(cardsOfRarity(r, null, false)) || pickOne(cardsOfRarity(r)); },
        upgradeRandom(n) {
            const idx = p.deck.map((id, i) => i).filter((i) => (window.getCard(p.deck[i]) || {}).canUpgrade);
            const names = [];
            for (let k = 0; k < n && idx.length; k++) {
                const i = idx.splice(Math.floor(Math.random() * idx.length), 1)[0];
                log({ kind: 'upgrade', from: p.deck[i], to: `${p.deck[i]}+` });
                p.deck[i] = `${p.deck[i]}+`;
                names.push(window.getCard(p.deck[i]).name);
            }
            return names;
        },
        removeRandom(basicOnly) {
            const idx = p.deck.map((id, i) => i).filter((i) => !basicOnly || (window.getCard(p.deck[i]) || {}).rarity === 'basic');
            if (!idx.length) return null;
            const [id] = p.deck.splice(pickOne(idx), 1);
            log({ kind: 'remove', from: id });
            return window.getCard(id).name;
        },
        duplicateRandom() {
            const pool = p.deck.filter((id) => (window.getCard(id) || {}).type !== 'curse');
            if (!pool.length) return null;
            const id = pickOne(pool);
            p.deck.push(id);
            return window.getCard(id).name;
        },
        // objeto al azar de ciertos niveles de rareza (si ya los tienes todos, de cualquiera)
        grantRelicTier(tiers) {
            const relic = randomRelic(tiers) || randomRelic(['common', 'uncommon', 'rare']);
            if (!relic) return 'Ya tienes todos los objetos disponibles.';
            giveRelic(p, relic);
            GAME.lastRelic = relic;
            return `Obtuviste el objeto ${relic.name}: ${relic.description}`;
        },
        // una semilla al azar en la bolsa (null si está llena)
        grantSeed() {
            const seed = window.rollSeed();
            if (!seed || !addSeed(seed.id)) return null;
            return `Consigues una semilla: ${seed.name}. ${seed.desc}`;
        },
        // cambia una carta al azar del mazo por otra de rareza parecida
        transformRandom() {
            const idx = p.deck.map((id, i) => i).filter((i) => { const c = window.getCard(p.deck[i]) || {}; return c.type !== 'curse' && c.type !== 'status'; });
            if (!idx.length) return null;
            const i = pickOne(idx);
            const old = window.getCard(p.deck[i]);
            const rarity = old.rarity === 'basic' ? 'common' : old.rarity;
            const next = pickOne(cardsOfRarity(rarity)) || pickOne(cardsOfRarity('common'));
            log({ kind: 'transform', from: p.deck[i], to: next.id });
            p.deck[i] = next.id;
            markDiscovered([next.id]);
            return `Tu ${old.name} se transforma en ${next.name}.`;
        }
    };
}
// Sorteo de un evento respetando su peso (w)
function pickEvent(pool) {
    const total = pool.reduce((s, ev) => s + (ev.w || 1), 0);
    let r = Math.random() * total;
    for (const ev of pool) { r -= (ev.w || 1); if (r <= 0) return ev; }
    return pool[pool.length - 1];
}
function resolveEventOption(idx) {
    const option = GAME.currentEvent.options[idx];
    if (option.locked && option.locked(GAME.player)) return;
    if (option.fight) {
        // algunas casillas de misterio no eran tan tranquilas: te salta un enemigo
        GAME.currentEvent = null;
        const enemies = encounterFor('enemy', GAME.playerPos.x / (window.mapDims(GAME.walls, GAME.map).cols - 1));
        playCombatIntro(enemies, 'enemy');
        return;
    }
    if (option.well) {
        // otras casillas de misterio son el Pozo de los Deseos
        GAME.currentEvent = null;
        GAME.wellSpins = 0;
        GAME.wellLastMsg = '';
        GAME.screen = 'well';
        saveGame();
        render();
        return;
    }
    if (option.game) {
        // una mesa de juego (dados, póker o ajedrez)
        GAME.currentEvent = null;
        window.openMinigame(option.game);
        return;
    }
    if (option.dungeon) {
        // o una trampilla que te deja caer a un calabozo 3x3: entras por una esquina de
        // abajo y la escalera de salida está en una esquina de arriba
        GAME.currentEvent = null;
        const exitX = Math.random() < 0.5 ? 0 : 2;
        GAME.dungeon = {
            cleared: Array.from({ length: 3 }, () => [false, false, false]),
            pos: { x: 2 - exitX, y: 2 },
            exit: { x: exitX, y: 0 },
            deco: Math.floor(Math.random() * 1000)
        };
        GAME.dungeon.cleared[2][2 - exitX] = true; // la esquina de entrada ya está "limpia"
        if (window.Sfx) Sfx.eventOpen();
        GAME.screen = 'dungeon';
        saveGame();
        render();
        return;
    }
    GAME.loot = [];
    const msg = withLootCapture(() => option.effect(GAME.player, eventHelpers()));
    if (msg && typeof msg === 'object' && msg.fight) {
        grantAllLoot(GAME.loot);
        GAME.loot = [];
        // el evento resultó ser una trampa: ¡pelea!
        GAME.currentEvent = null;
        showToast(msg.msg || '¡Es una trampa!');
        playCombatIntro(encounterFor('enemy', GAME.playerPos.x / (window.mapDims(GAME.walls, GAME.map).cols - 1)), 'enemy');
        return;
    }
    GAME.lastEventMsg = typeof msg === 'string' ? msg : 'Algo pasó...';
    if (GAME.player.hp <= 0) {
        clearSave();
        GAME.screen = 'gameover';
    } else {
        GAME.screen = 'event-result';
        saveGame();
    }
    render();
}
function closeEventResult() { if (lootNudge()) return; GAME.loot = []; GAME.currentEvent = null; GAME.screen = 'map'; saveGame(); render(); }

// ---------------------------------------------------------
// CALABOZO: mini-mazmorra de 3x3 que aparece a veces en Misterio. Entras por
// una esquina, la salida está en la esquina opuesta, y cada casilla de en
// medio tiene un enemigo que hay que vencer para poder pisarla.
// ---------------------------------------------------------
function enterDungeonCell(x, y) {
    const d = GAME.dungeon;
    if (GAME.anim || !d) return;
    if (Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y) !== 1) return; // solo casillas contiguas
    if (d.cleared[y][x]) { d.pos = { x, y }; render(); return; }
    d.pending = { x, y };
    const isExit = x === d.exit.x && y === d.exit.y;
    const enemies = encounterFor('enemy', isExit ? 0.9 : 0.1);
    playCombatIntro(enemies, 'dungeon');
}
function leaveDungeon() { GAME.dungeon = null; GAME.screen = 'map'; saveGame(); render(); }

// funciones que se llaman desde el HTML
Object.assign(window, {
    showMainMenu, goToCharacterSelect, openWardrobe, wardrobeSelect, wardrobeEquip, wardrobeClear, wearNewCosmetic, backToMenu, selectDifficulty, selectCharacter, continueGame, newGame,
    startNewGameWithCharacter, beginAct, openDeckView, openPile, closeModal, movePlayer,
    pickRewardCard, skipReward, pickBossRelic, skipBossRelic,
    restHeal, setRestMode, leaveRest, restUpgradeCard, restRemoveCard,
    buyShopCard, buyShopRelic, openShopRemoval, shopRemoveCard, closeShopPicker, leaveShop,
    resolveEventOption, closeEventResult,
    wearNewPet, clickSeed, discardSeed, useSeedFromMenu, useSeedOn, cancelSeedAim, buyShopSeed,
    tossWellCoin, leaveWell, enterDungeonCell, leaveDungeon
});
