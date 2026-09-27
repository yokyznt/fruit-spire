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

const NODE_INFO = {
    enemy: { sprite: 'node_enemy', icon: '⚔️', label: 'Enemigo', desc: 'Unos bichos te esperan. ¡A pelear!' },
    elite: { sprite: 'node_elite', icon: '🔥', label: 'Élite', desc: 'Un enemigo durísimo. Si ganas, te llevas una reliquia.' },
    rest: { sprite: 'node_rest', icon: '🏕️', label: 'Campamento', desc: 'Descansa, madura una carta o despega una de tu mazo.' },
    treasure: { sprite: 'node_treasure', icon: '💎', label: 'Tesoro', desc: 'Una reliquia gratis.' },
    shop: { sprite: 'node_shop', icon: '🏪', label: 'Tiendita', desc: 'Cartas, reliquias y quitar cartas, a cambio de oro.' },
    mystery: { sprite: 'node_mystery', icon: '❓', label: 'Misterio', desc: 'Un evento al azar… ¿bueno o malo?' },
    gift: { sprite: 'node_gift', icon: '🎁', label: 'Regalo', desc: 'Algo nuevo para tu vestidor: un color o un accesorio.' },
    boss: { sprite: 'node_boss', icon: '🌀', label: 'Jefe', desc: '' }
};

const SAVE_KEY = 'fruitSpireSave_v3';      // v3: niveles, dificultad, cartas maduradas
const OLD_SAVE_KEY = 'fruitSpireSave_v2';
const DISCOVERED_KEY = 'fruitSpireDiscovered_v1';
const UNLOCKS_KEY = 'fruitSpireUnlocks_v1';   // grado de putrefacción desbloqueado por fruta

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
    selectedDifficulty: 'verde',
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
const currentAct = () => window.ACTS[(GAME.player ? GAME.player.act : 1) - 1] || window.ACTS[0];

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
                permanentStrength: p.permanentStrength, act: p.act, difficulty: p.difficulty, removals: p.removals,
                seeds: p.seeds
            },
            map: GAME.map,
            walls: GAME.walls,
            visited: GAME.visited,
            playerPos: GAME.playerPos,
            screen: GAME.screen === 'act-intro' ? 'act-intro' : 'map'
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
        GAME.player = p;
        GAME.map = data.map;
        GAME.walls = data.walls;
        // partidas viejas: se ubica al jefe y se quitan las trampas del mapa
        if (GAME.walls.bossY == null) {
            GAME.walls.bossY = GAME.map.findIndex((row) => row[window.MAP_COLS - 1] === 'boss');
        }
        window.ensureNoTraps(GAME.walls);
        GAME.map.forEach((row) => { row[window.MAP_COLS - 1] = 'boss'; });
        GAME.visited = data.visited || [];
        GAME.playerPos = data.playerPos;
        if (GAME.playerPos.x === window.MAP_COLS - 1) GAME.playerPos.x -= 1;
        GAME.mapPan = null;
        GAME.screen = data.screen === 'act-intro' ? 'act-intro' : 'map';
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
    const owned = new Set(GAME.player.relics);
    const pool = Object.values(window.RELIC_DB).filter((r) => !owned.has(r.id) && tiers.includes(r.tier));
    if (!pool.length) return null;
    // las raras salen menos
    const weight = { common: 5, uncommon: 3, rare: 2, boss: 1 };
    let r = Math.random() * pool.reduce((s, x) => s + weight[x.tier], 0);
    for (const x of pool) { r -= weight[x.tier]; if (r <= 0) return x; }
    return pool[pool.length - 1];
}
function giveRelic(player, relic) {
    player.relics.push(relic.id);
    if (relic.onPickup) relic.onPickup(player);
}
function grantRandomRelic(player) {
    const relic = randomRelic(['common', 'uncommon', 'rare']);
    if (!relic) return 'Ya tienes todas las reliquias disponibles.';
    giveRelic(player, relic);
    GAME.lastRelic = relic;
    return `Obtuviste la reliquia ${relic.name}: ${relic.description}`;
}

// ---------------------------------------------------------
// MENÚ / SELECCIÓN DE PERSONAJE Y DIFICULTAD
// ---------------------------------------------------------
function showMainMenu() { exitTutorial(); GAME.screen = 'menu'; GAME.modal = null; render(); }
function goToCharacterSelect() { GAME.screen = 'character-select'; render(); }
function openCollection() { GAME.screen = 'collection'; render(); }
function openWardrobe() {
    if (GAME.player && window.CHARACTER_DB[GAME.player.characterId]) GAME.wardrobeChar = GAME.player.characterId;
    GAME.screen = 'wardrobe';
    render();
}
function wardrobeSelect(charId) { GAME.wardrobeChar = charId; render(); }
function wardrobeEquip(id) {
    if (!window.isCosmeticOwned(id)) { showToast('Aún no lo tienes: búscalo en los regalos del mapa y en los botines'); return; }
    window.equipCosmetic(GAME.wardrobeChar, id);
    render();
    restartClass(document.querySelector('.wardrobe-preview .art'), 'dress-pop');
}
function wardrobeClear(slot) { window.unequipSlot(GAME.wardrobeChar, slot); render(); }
// Premio para el vestidor (si ya tienes todo, se da oro)
function rewardCosmetic() {
    const c = window.rollCosmetic(GAME.player.characterId);
    if (!c) { GAME.player.gold += 40; return null; }
    window.grantCosmetic(c.id);
    return c;
}
function wearNewPet(id) {
    const c = window.getCosmetic(id);
    if (!c) return;
    if (window.equippedFor(c.char).pet !== id) window.equipCosmetic(c.char, id);
    showToast(`¡${c.name} te acompaña!`);
    render();
}
function wearNewCosmetic() {
    const c = GAME.newCosmetic;
    if (!c) return;
    const who = c.char || GAME.player.characterId;
    const eq = window.equippedFor(who);
    if (c.type === 'skin' ? eq.skin !== c.id : eq[c.slot] !== c.id) window.equipCosmetic(who, c.id);
    showToast(`¡${c.name} puesto!`);
    render();
}
function backToMenu() { GAME.screen = 'menu'; render(); }
// Grado de putrefacción más alto desbloqueado para cada fruta (índice en DIFFICULTIES)
function readUnlocks() {
    try { return JSON.parse(localStorage.getItem(UNLOCKS_KEY)) || {}; } catch (e) { return {}; }
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
    p.deck = window.starterDeckFor(id);
    if (diff.curse) p.deck.push(diff.curse);
    GAME.player = p;
    GAME.combat = null;
    GAME.anim = false;
    GAME.actHealed = 0;
    newActMap();
    markDiscovered(p.deck);
    GAME.screen = 'act-intro';
    saveGame();
    render();
}

// Mapa nuevo para el nivel actual
function newActMap() {
    GAME.playerPos = { x: 0, y: Math.floor(window.MAP_ROWS / 2) };
    const generated = window.generateMap(GAME.playerPos.y, { elites: difficulty().elites });
    GAME.map = generated.grid;
    GAME.walls = { wallsV: generated.wallsV, wallsH: generated.wallsH, bossY: generated.bossY, bossId: window.pickBoss(GAME.player.act) };
    GAME.visited = [`${GAME.playerPos.x},${GAME.playerPos.y}`];
    GAME.mapPan = null;
}
function beginAct() { GAME.screen = 'map'; saveGame(); render(); }

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
    return window.canMove(GAME.walls, new Set(GAME.visited), GAME.playerPos.x, GAME.playerPos.y, x, y);
}
function movePlayer(x, y) {
    if (GAME.anim || !isReachable(x, y)) return;
    GAME.anim = true;
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
    if (type === T.ENEMY || type === T.ELITE || type === T.BOSS) {
        const kind = type === T.ELITE ? 'elite' : type === T.BOSS ? 'boss' : 'enemy';
        playCombatIntro(window.pickEncounter(act, GAME.playerPos.x, kind, GAME.walls.bossId), kind);
        return;
    }
    if (type === T.REST) {
        GAME.screen = 'rest';
        GAME.restMode = null;
    } else if (type === T.TREASURE) {
        GAME.lastRelic = null;
        GAME.lastEventMsg = grantRandomRelic(GAME.player);
        GAME.newCosmetic = Math.random() < 0.5 ? rewardCosmetic() : null;
        GAME.screen = 'treasure';
        saveGame();
    } else if (type === T.GIFT) {
        GAME.newCosmetic = rewardCosmetic();
        GAME.screen = 'gift';
        saveGame();
    } else if (type === T.SHOP) {
        openShop();
    } else if (type === T.MYSTERY) {
        const pool = window.EVENT_DB.filter((ev) => (!ev.acts || ev.acts.includes(act)) && ev.id !== GAME.lastEventId);
        GAME.currentEvent = pickOne(pool.length ? pool : window.EVENT_DB);
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
    setTimeout(() => startCombat(enemyIds, kind), 1050);
    setTimeout(() => intro.classList.add('out'), 1150);
    setTimeout(() => {
        intro.remove();
        GAME.anim = false;
        showTurnBanner('¡Tu turno!', 'player');
    }, 1650);
}

function startCombat(enemyIds, kind) {
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
    // el motor avisa cambios desde su constructor, antes de que GAME.combat
    // exista; ese primer aviso se ignora para no gastar las animaciones de entrada
    const onUpdate = () => { if (GAME.combat && GAME.combat.player === GAME.player && GAME.screen === 'combat') render(); };
    GAME.combat = null;
    GAME.combat = new Combat(GAME.player, defs, onUpdate, (result) => {
        // se deja ver el golpe final (los enemigos caídos se animan solos al redibujar)
        GAME.anim = true;
        if (result === 'lose') {
            setTimeout(() => {
                const el = document.getElementById('portrait-player');
                if (el) el.classList.add('defeated');
            }, 350);
        }
        setTimeout(() => onCombatEnd(result, kind), 1500);
    }, { mods: difficulty().mods });
    if (GAME.tutorial && GAME.tutorial.firstFight) {
        GAME.tutorial.firstFight = false;
        const hand = GAME.combat.player.hand;
        const all = [...hand, ...GAME.combat.player.drawPile];
        const take = (id) => { const k = all.indexOf(id); return k >= 0 ? all.splice(k, 1)[0] : null; };
        const fixed = ['golpe_cascara', 'jugo_defensivo', 'golpe_cascara', 'jugo_defensivo', 'golpe_cascara'].map(take).filter(Boolean);
        GAME.combat.player.hand = fixed;
        GAME.combat.player.drawPile = all;
    }
    render();
}

function onCombatEnd(result, kind) {
    GAME.anim = false;
    GAME.modal = null;
    const p = GAME.player;
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
    const char = window.CHARACTER_DB[p.characterId];
    if (char && char.onCombatEnd) char.onCombatEnd(p);
    p.relics.forEach((rid) => { const r = window.RELIC_DB[rid]; if (r && r.onCombatEnd) r.onCombatEnd(p); });
    p.statuses = {};
    p.block = 0;

    if (kind === 'boss') GAME.lastBossId = GAME.combat && GAME.combat.enemies[0] ? GAME.combat.enemies[0].defId : null;
    GAME.newPets = kind === 'boss'
        ? window.checkPetUnlocks(p.characterId, { bossAct: p.act, win: p.act >= window.ACTS.length ? p.difficulty : null }) : [];
    if (kind === 'boss' && p.act >= window.ACTS.length) {
        GAME.unlockMsg = unlockNextDifficulty(p.characterId, p.difficulty);
        clearSave();
        GAME.screen = 'victory';
        render();
        return;
    }
    const gold = kind === 'boss' ? 70 + Math.floor(Math.random() * 20)
        : kind === 'elite' ? 28 + Math.floor(Math.random() * 14)
            : 12 + Math.floor(Math.random() * 12);
    const pet = window.petFor(p.characterId);
    const petGold = pet && pet.onWin ? pet.onWin(p) || 0 : 0;
    p.gold += gold + petGold;
    GAME.rewardGold = gold + petGold;
    GAME.rewardCards = rollRewardCards(3, kind);
    GAME.rewardRelic = null;
    if (kind === 'elite') {
        const relic = randomRelic(['common', 'uncommon', 'rare']);
        if (relic) { giveRelic(p, relic); GAME.rewardRelic = relic; }
    }
    const seedChance = GAME.tutorial ? 1 : kind === 'boss' ? 1 : kind === 'elite' ? 0.55 : 0.35;
    GAME.rewardSeed = Math.random() < seedChance ? window.rollSeed().id : null;
    if (GAME.rewardSeed && addSeed(GAME.rewardSeed)) GAME.rewardSeedTaken = true;
    else GAME.rewardSeedTaken = false;
    const cosChance = kind === 'boss' ? 1 : kind === 'elite' ? 0.4 : 0.08;
    GAME.newCosmetic = Math.random() < cosChance ? rewardCosmetic() : null;
    GAME.afterReward = kind === 'boss' ? 'boss-relic' : 'map';
    GAME.screen = 'reward';
    render();
}

// ---------- semillas ----------
function addSeed(id) {
    const p = GAME.player;
    const i = p.seeds.indexOf(null);
    if (i < 0) return false;
    p.seeds[i] = id;
    return true;
}
function takeRewardSeed() {
    if (GAME.rewardSeedTaken || !GAME.rewardSeed) return;
    if (!addSeed(GAME.rewardSeed)) { showToast('Tu bolsa está llena: tira una semilla para hacer espacio'); return; }
    GAME.rewardSeedTaken = true;
    render();
    restartClass(document.querySelector('.hud-seeds'), 'bump');
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
    GAME.player.seeds[i] = null;
    const seed = window.SEED_DB[id];
    showActionBanner('player', seed.name, id, seed.icon);
    playPortraitAnim('player', 'cast');
    await wait(320);
    if (GAME.combat !== c) return;
    c.useSeed(id, targetIdx);
    spawnFx(c.lastEvents, { fx: 'burst' });
    await wait(400);
    if (GAME.combat === c && !c.ended) GAME.anim = false;
}

function finishReward() {
    GAME.combat = null;
    if (GAME.afterReward === 'boss-relic') { openBossRelics(); return; }
    GAME.screen = 'map';
    saveGame();
    render();
}
function pickRewardCard(cardId, el) {
    if (GAME.anim) return;
    GAME.anim = true;
    hideTip();
    GAME.player.deck.push(cardId);
    const row = el && el.closest('.reward-row');
    if (row) row.querySelectorAll('.card').forEach((c) => { if (c !== el) c.classList.add('fade-away'); });
    if (el) el.classList.add('taken');
    flyGhost(el, '.hud-deck');
    setTimeout(() => { GAME.anim = false; finishReward(); }, 820);
}
function skipReward() { if (!GAME.anim) finishReward(); }

// ---------- reliquias de jefe y paso de nivel ----------
function openBossRelics() {
    const owned = new Set(GAME.player.relics);
    const pool = Object.values(window.RELIC_DB).filter((r) => r.tier === 'boss' && !owned.has(r.id));
    const choices = [];
    while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    GAME.bossRelicChoices = choices;
    GAME.screen = 'boss-relic';
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
        flyGhost(el, '.hud-relics');
    }
    setTimeout(() => { GAME.anim = false; startNextAct(); }, 850);
}
function skipBossRelic() { if (!GAME.anim) startNextAct(); }

function startNextAct() {
    const p = GAME.player;
    p.act = Math.min(window.ACTS.length, p.act + 1);
    const before = p.hp;
    p.heal(Math.ceil((p.maxHp - p.hp) * difficulty().actHeal));
    GAME.actHealed = p.hp - before;
    newActMap();
    GAME.screen = 'act-intro';
    saveGame();
    render();
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
    GAME.player.deck[deckIndex] = `${id}+`;
    if (el) el.classList.add('ripening');
    setTimeout(() => { GAME.anim = false; leaveRest(); }, 900);
}
function removeDeckCard(deckIndex, el, after) {
    if (GAME.anim) return;
    GAME.anim = true;
    hideTip();
    GAME.player.deck.splice(deckIndex, 1);
    if (el) el.classList.add('peeled');
    setTimeout(() => { GAME.anim = false; after(); }, 560);
}
function restRemoveCard(deckIndex, el) { removeDeckCard(deckIndex, el, leaveRest); }

// ---------------------------------------------------------
// TIENDA — se compra tocando la carta o la reliquia
// ---------------------------------------------------------
const CARD_PRICES = { common: [30, 38], uncommon: [45, 55], rare: [75, 90] };
const RELIC_PRICES = { common: [70, 80], uncommon: [90, 105], rare: [120, 140] };
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
    for (let guard = 0; seeds.length < 3 && guard < 30; guard++) {
        const sd = window.rollSeed();
        if (!seeds.some((x) => x.seed.id === sd.id)) seeds.push({ seed: sd, price: priceIn(seedPrices[sd.rarity]) });
    }
    GAME.shopStock = { cards, relics, seeds, removeUsed: false };
    GAME.restMode = null;
    GAME.screen = 'shop';
}
function removalPrice() { return 50 + 25 * (GAME.player.removals || 0); }
function cantAfford(el) {
    restartClass(el && el.closest('.shop-item'), 'nope');
    restartClass(document.querySelector('.hud-chip.gold'), 'nope');
    showToast('¡No te alcanza el oro!');
}
// El artículo comprado vuela al HUD, su hueco se cierra y los demás se deslizan.
function shopPurchase(el, targetSelector, apply) {
    GAME.anim = true;
    hideTip();
    apply();
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
    shopPurchase(el, '.hud-relics', () => {
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
    if (!GAME.shopStock.seeds) return;
    if (GAME.player.seeds.indexOf(null) < 0) { restartClass(el.closest('.shop-item'), 'nope'); showToast('Tu bolsa de semillas está llena'); return; }
    shopPurchase(el, '.hud-seeds', () => {
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
    return {
        act: p.act,
        grantRandomRelic,
        addCard(id) { p.deck.push(id); markDiscovered([id]); },
        randomCard(rarity) { const r = rarity || pickOne(REWARD_RARITIES); return pickOne(cardsOfRarity(r, null, false)) || pickOne(cardsOfRarity(r)); },
        upgradeRandom(n) {
            const idx = p.deck.map((id, i) => i).filter((i) => (window.getCard(p.deck[i]) || {}).canUpgrade);
            const names = [];
            for (let k = 0; k < n && idx.length; k++) {
                const i = idx.splice(Math.floor(Math.random() * idx.length), 1)[0];
                p.deck[i] = `${p.deck[i]}+`;
                names.push(window.getCard(p.deck[i]).name);
            }
            return names;
        },
        removeRandom(basicOnly) {
            const idx = p.deck.map((id, i) => i).filter((i) => !basicOnly || (window.getCard(p.deck[i]) || {}).rarity === 'basic');
            if (!idx.length) return null;
            const [id] = p.deck.splice(pickOne(idx), 1);
            return window.getCard(id).name;
        },
        duplicateRandom() {
            const pool = p.deck.filter((id) => (window.getCard(id) || {}).type !== 'curse');
            if (!pool.length) return null;
            const id = pickOne(pool);
            p.deck.push(id);
            return window.getCard(id).name;
        }
    };
}
function resolveEventOption(idx) {
    const option = GAME.currentEvent.options[idx];
    if (option.locked && option.locked(GAME.player)) return;
    const msg = option.effect(GAME.player, eventHelpers());
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
function closeEventResult() { GAME.currentEvent = null; GAME.screen = 'map'; saveGame(); render(); }

// funciones que se llaman desde el HTML
Object.assign(window, {
    showMainMenu, goToCharacterSelect, openCollection, openWardrobe, wardrobeSelect, wardrobeEquip, wardrobeClear, wearNewCosmetic, backToMenu, selectDifficulty, selectCharacter, continueGame, newGame,
    startNewGameWithCharacter, beginAct, openDeckView, openPile, closeModal, movePlayer,
    pickRewardCard, skipReward, pickBossRelic, skipBossRelic,
    restHeal, setRestMode, leaveRest, restUpgradeCard, restRemoveCard,
    buyShopCard, buyShopRelic, openShopRemoval, shopRemoveCard, closeShopPicker, leaveShop,
    resolveEventOption, closeEventResult,
    wearNewPet, clickSeed, discardSeed, useSeedFromMenu, useSeedOn, takeRewardSeed, buyShopSeed
});
