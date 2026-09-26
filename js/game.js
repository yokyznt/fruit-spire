// ============================================================
// GAME.JS — Controlador Principal 2.1
// ============================================================

const NODE_ICONS = { enemy: '⚔️', rest: '🏕️', treasure: '💎', shop: '🏪', mystery: '❓', boss: '🌀' };
const NODE_LABELS = { enemy: 'Enemigo', rest: 'Descanso', treasure: 'Tesoro', shop: 'Tienda', mystery: 'Misterio', boss: 'Jefe' };
const STATUS_ICONS = { strength: '💪', weak: '😩', vulnerable: '🎯', poison: '☠️' };
const STATUS_NAMES = { strength: 'Fuerza', weak: 'Debilidad', vulnerable: 'Vulnerable', poison: 'Veneno' };

const GAME = {
    player: null,
    map: null,
    playerPos: { x: 0, y: 0 },
    screen: 'main-menu',
    combat: null,
    currentNodeType: null,
    rewardGold: 0,
    rewardCards: [],
    lastEventMsg: '',
    currentEvent: null,
    shopStock: null,
    unlockedCards: new Set(),
    selectedChar: null
};
window.GAME = GAME;

// ---------------------------------------------------------
// UTILIDADES DE RECOMPENSAS
// ---------------------------------------------------------
function grantRandomRelic(player) {
    const pool = Object.values(window.RELIC_DB).filter(r => !player.relics.includes(r.id));
    if (pool.length === 0) return 'Ya tienes todas las reliquias.';
    const relic = pool[Math.floor(Math.random() * pool.length)];
    player.relics.push(relic.id);
    if (relic.onPickup) relic.onPickup(player);
    return `¡Obtuviste la reliquia: ${relic.name}! ${relic.description}`;
}
window.grantRandomRelic = grantRandomRelic;

function weightedRandomCards(count) {
    const pool = Object.values(window.CARD_DB);
    const rewards = [];
    for (let i = 0; i < count; i++) {
        rewards.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return rewards;
}
window.weightedRandomCards = weightedRandomCards;

// ---------------------------------------------------------
// PERSISTENCIA (localStorage)
// ---------------------------------------------------------
function saveGame() {
    const saveData = {
        player: GAME.player,
        playerPos: GAME.playerPos,
        map: GAME.map,
        selectedChar: GAME.selectedChar,
        unlockedCards: Array.from(GAME.unlockedCards)
    };
    localStorage.setItem('fruitSpireSave', JSON.stringify(saveData));
}

function loadGame() {
    const data = localStorage.getItem('fruitSpireSave');
    if (!data) {
        alert('No hay una partida guardada.');
        return;
    }
    const parsed = JSON.parse(data);

    const p = new Player();
    Object.assign(p, parsed.player);

    GAME.player = p;
    GAME.playerPos = parsed.playerPos;
    GAME.map = parsed.map;
    GAME.selectedChar = parsed.selectedChar;
    GAME.unlockedCards = new Set(parsed.unlockedCards);

    GAME.screen = 'map';
    render();
}

// ---------------------------------------------------------
// CONTROL DE PANTALLAS
// ---------------------------------------------------------
function showMainMenu() {
    GAME.screen = 'main-menu';
    render();
}

function showCharacterSelect() {
    GAME.screen = 'char-select';
    render();
}

function showCollection() {
    GAME.screen = 'collection';
    render();
}

function selectCharacter(charId) {
    GAME.selectedChar = charId;
    newGame(charId);
}

function newGame(charId) {
    GAME.player = new Player();
    GAME.player.charId = charId;
    GAME.player.deck = [...window.STARTER_DECK];

    GAME.playerPos = { x: 0, y: Math.floor(window.MAP_ROWS / 2) };
    GAME.map = window.generateMap(GAME.playerPos.y);
    GAME.screen = 'map';
    GAME.combat = null;

    saveGame();
    render();
}

// ---------------------------------------------------------
// MAPA (Muros entre casillas y movimiento corregido)
// ---------------------------------------------------------
function isReachable(x, y) {
    if (x < 0 || x >= window.MAP_COLS || y < 0 || y >= window.MAP_ROWS) return false;

    // Solo podemos movernos hacia adelante (x + 1) o lateralmente en la misma columna (esto es opcional,
    // pero para Slay the Spire suele ser solo x+1)
    if (x !== GAME.playerPos.x + 1) return false;

    // Verificamos muros verticales (muros entre y y y+1)
    if (y === GAME.playerPos.y + 1) {
        if (window.mapWalls.vertical[GAME.playerPos.y][GAME.playerPos.x]) return false;
    }
    if (y === GAME.playerPos.y - 1) {
        if (window.mapWalls.vertical[y][GAME.playerPos.x]) return false;
    }

    // Verificamos muros horizontales (muro entre x y x+1)
    if (window.mapWalls.horizontal[y][GAME.playerPos.x]) return false;

    return Math.abs(y - GAME.playerPos.y) <= 1;
}

function movePlayer(x, y) {
    if (!isReachable(x, y)) return;
    GAME.playerPos = { x, y };
    GAME.currentNodeType = GAME.map[y][x];
    enterNode();
}

function enterNode() {
    const T = window.NODE_TYPES;
    const type = GAME.currentNodeType;
    if (type === T.ENEMY) {
        const defId = window.pickEnemyForColumn(GAME.playerPos.x);
        startCombat(defId, false);
    } else if (type === T.BOSS) {
        startCombat(window.BOSS_ID, true);
    } else if (type === T.REST) {
        GAME.screen = 'rest';
    } else if (type === T.TREASURE) {
        GAME.lastEventMsg = grantRandomRelic(GAME.player);
        GAME.screen = 'treasure';
    } else if (type === T.SHOP) {
        openShop();
    } else if (type === T.MYSTERY) {
        GAME.currentEvent = window.EVENT_DB[Math.floor(Math.random() * window.EVENT_DB.length)];
        GAME.lastEventMsg = '';
        GAME.screen = 'event';
    } else {
        GAME.screen = 'map';
    }
    saveGame();
    render();
}

// ---------------------------------------------------------
// COMBATE & RECOMPENSAS
// ---------------------------------------------------------
function startCombat(enemyDefId, isBoss) {
    const def = window.ENEMY_DB[enemyDefId];
    GAME.screen = 'combat';
    GAME.combat = new Combat(GAME.player, def, render, (result) => onCombatEnd(result, isBoss));
    render();
}

function onCombatEnd(result, isBoss) {
    if (result === 'win') {
        const gold = 15 + Math.floor(Math.random() * 20) + (isBoss ? 40 : 0);
        GAME.player.gold += gold;
        GAME.rewardGold = gold;
        GAME.rewardCards = weightedRandomCards(3);
        GAME.screen = isBoss ? 'victory' : 'reward';
    } else {
        GAME.screen = 'gameover';
    }
    saveGame();
    render();
}

function playCard(i) { if (GAME.combat) GAME.combat.playCard(i); }
function endTurn() { if (GAME.combat) GAME.combat.endPlayerTurn(); }

function pickRewardCard(cardId) {
    GAME.player.deck.push(cardId);
    GAME.unlockedCards.add(cardId);
    GAME.combat = null;
    GAME.screen = 'map';
    saveGame();
    render();
}

function skipReward() {
    GAME.combat = null;
    GAME.screen = 'map';
    saveGame();
    render();
}

// ---------------------------------------------------------
// TIENDA & EVENTOS
// ---------------------------------------------------------
function openShop() {
    GAME.shopStock = {
        cards: weightedRandomCards(3).map((c) => ({ card: c, price: c.rarity === 'rare' ? 60 : c.rarity === 'uncommon' ? 40 : 25 })),
        relic: (() => {
            const owned = new Set(GAME.player.relics);
            const pool = Object.values(window.RELIC_DB).filter((r) => !owned.has(r.id));
            return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        })(),
        relicPrice: 55
    };
    GAME.screen = 'shop';
}

function buyShopCard(cardId) {
    const item = GAME.shopStock.cards.find((i) => i.card.id === cardId);
    if (!item || GAME.player.gold < item.price) return;
    GAME.player.gold -= item.price;
    GAME.player.deck.push(cardId);
    GAME.unlockedCards.add(cardId);
    GAME.shopStock.cards = GAME.shopStock.cards.filter((i) => i.card.id !== cardId);
    saveGame();
    render();
}

function buyShopRelic() {
    const relic = GAME.shopStock.relic;
    if (!relic || GAME.player.gold < GAME.shopStock.relicPrice) return;
    GAME.player.gold -= GAME.shopStock.relicPrice;
    GAME.player.relics.push(relic.id);
    if (relic.onPickup) relic.onPickup(GAME.player);
    GAME.shopStock.relic = null;
    saveGame();
    render();
}

function leaveShop() {
    GAME.screen = 'map';
    saveGame();
    render();
}

function resolveEventOption(idx) {
    const option = GAME.currentEvent.options[idx];
    const msg = option.effect(GAME.player, { grantRandomRelic });
    GAME.lastEventMsg = typeof msg === 'string' ? msg : 'Algo pasó...';
    if (GAME.player.hp <= 0) {
        GAME.screen = 'gameover';
    } else {
        GAME.screen = 'event-result';
    }
    saveGame();
    render();
}

function closeEventResult() {
    GAME.currentEvent = null;
    GAME.screen = 'map';
    saveGame();
    render();
}

// ---------------------------------------------------------
// DESCANSOS (Corregido)
// ---------------------------------------------------------
function restHeal() {
    console.log("Ejecutando restHeal...");
    const amount = Math.floor(GAME.player.maxHp * 0.3);
    GAME.player.heal(amount);
    GAME.lastEventMsg = `Descansaste y recuperaste ${amount} HP.`;
    GAME.screen = 'map';
    saveGame();
    render();
}

function restRemoveCard(cardId) {
    console.log("Ejecutando restRemoveCard para carta:", cardId);
    const idx = GAME.player.deck.indexOf(cardId);
    if (idx >= 0) {
        GAME.player.deck.splice(idx, 1);
        GAME.lastEventMsg = `Eliminaste una carta de tu mazo.`;
    } else {
        console.warn("Carta no encontrada en el mazo");
    }
    GAME.screen = 'map';
    saveGame();
    render();
}

// ---------------------------------------------------------
// ANIMACIONES VISUALES
// ---------------------------------------------------------
function spawnFloatingNumber(targetId, amount, type) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const num = document.createElement('div');
    num.className = `floating-num float-${type === 'damage' ? 'damage' : type === 'block' ? 'block' : 'heal'}`;
    num.innerText = type === 'block' ? `🛡️ +${amount}` : (type === 'damage' ? `-${amount}` : `+${amount}`);
    const rect = target.getBoundingClientRect();
    num.style.left = (rect.left + rect.width / 2 + (Math.random() * 40 - 20)) + 'px';
    num.style.top = (rect.top + rect.height / 2) + 'px';
    num.style.position = 'fixed';
    document.body.appendChild(num);
    setTimeout(() => num.remove(), 1000);
}

function spawnShieldEffect(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const shield = document.createElement('div');
    shield.className = 'block-shield';
    const rect = target.getBoundingClientRect();
    shield.style.left = (rect.left + rect.width / 2 - 60) + 'px';
    shield.style.top = (rect.top + rect.height / 2 - 60) + 'px';
    shield.style.position = 'fixed';
    document.body.appendChild(shield);
    setTimeout(() => shield.remove(), 500);
}

window.spawnFloatingNumber = spawnFloatingNumber;
window.spawnShieldEffect = spawnShieldEffect;

// ---------------------------------------------------------
// RENDERING (Sistema de Pantallas)
// ---------------------------------------------------------
function render() {
    const screens = ['main-menu', 'char-select', 'collection'];
    screens.forEach(s => {
        const el = document.getElementById('screen-' + s);
        if (el) el.classList.toggle('active', GAME.screen === s);
    });

    const app = document.getElementById('app');
    if (GAME.screen === 'main-menu' || GAME.screen === 'char-select' || GAME.screen === 'collection') {
        app.innerHTML = '';
    } else {
        app.innerHTML = renderHud() + renderScreen();
    }
}

function renderHud() {
    const p = GAME.player;
    if (!p) return '';
    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
    return `
    <div class="hud">
        <div class="title">🍎 Fruit Spire</div>
        <div class="hud-stat hp">❤️ ${p.hp}/${p.maxHp}
            <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${hpPct}%}"></div></div>
        </div>
        <div class="hud-stat gold">🪙 ${p.gold}</div>
        <div class="hud-stat relics">${p.relics.map((rid) => window.RELIC_DB[rid].icon).join(' ') || '— sin reliquias —'}</div>
    </div>`;
}

function renderScreen() {
    switch (GAME.screen) {
        case 'map': return renderMap();
        case 'combat': return renderCombat();
        case 'reward': return renderReward();
        case 'victory': return renderVictory();
        case 'gameover': return renderGameOver();
        case 'rest': return renderRest();
        case 'treasure': return renderTreasure();
        case 'shop': return renderShop();
        case 'event': return renderEvent();
        case 'event-result': return renderEventResult();
        default: return '';
    }
}

function renderMap() {
    const T = window.NODE_TYPES;
    let html = `<div class="map-wrap"><div class="map-grid" style="--cols:${window.MAP_COLS}">`;
    for (let y = 0; y < window.MAP_ROWS; y++) {
        for (let x = 0; x < window.MAP_COLS; x++) {
            const type = GAME.map[y][x];
            const isCurrent = GAME.playerPos.x === x && GAME.playerPos.y === y;
            const reachable = !isCurrent && isReachable(x, y);
            let classes = 'node';
            if (isCurrent) classes += ' current';
            if (reachable) classes += ' reachable';
            if (type === T.BOSS) classes += ' boss';

            let inner = '';
            if (isCurrent) {
                inner = `<div class="node-icon">🍎</div><div class="node-label">Tú</div>`;
            } else if (type && type !== T.EMPTY) {
                inner = `<div class="node-icon">${NODE_ICONS[type]}</div><div class="node-label">${NODE_LABELS[type]}</div>`;
            } else {
                inner = `<div class="node-icon">⚪</div><div class="node-label">Vacío</div>`;
            }
            const onclick = reachable ? `onclick="movePlayer(${x},${y})"` : '';
            html += `<div class="${classes}" ${onclick}>${inner}</div>`;
        }
    }
    html += `</div></div>`;
    return html;
}

function renderCombat() {
    const c = GAME.combat;
    if (!c) return '';
    const p = c.player, e = c.enemy;
    const move = e.nextMove || {};
    const intentText = move.type === 'attack' || move.type === 'poison_attack'
        ? `${move.icon || '⚔️'} ${move.value}${move.hits > 1 ? ` x${move.hits}` : ''}`
        : move.type === 'defend' ? `${move.icon || '🛡️'} ${move.value}`
        : move.type === 'buff' ? `${move.icon || '💪'} +${move.value} Fuerza`
        : move.type === 'heal' ? `${move.icon || '💚'} +${move.value} HP`
        : '???';

    const handHtml = p.hand.map((cardId, i) => {
        const card = window.CARD_DB[cardId];
        const disabled = card.cost > p.energy || c.turn !== 'player';
        const imgPath = card.img || 'https://via.placeholder.com/150x80?text=Carta';
        return `
        <div class="card ${card.type} ${disabled ? 'disabled' : ''}" ${disabled ? '' : `onclick="playCard(${i})"`}>
            <div class="cost">${card.cost}</div>
            <div class="card-img-frame"><img src="${imgPath}" alt="${card.name}"></div>
            <div class="card-name">${card.name}</div>
            <div class="card-type">${card.type === 'attack' ? 'ataque' : card.type === 'skill' ? 'habilidad' : 'poder'}</div>
            <div class="card-desc">${card.description}</div>
        </div>`;
    }).join('');

    return `
    <div class="combat-stage">
        <div class="combatants">
            <div class="combatant" id="player-sprite">
                <div class="portrait">${GAME.selectedChar === 'manzana' ? '🍎' : GAME.selectedChar === 'platanin' ? '🍌' : '🥝'}</div>
                <div class="name">${p.name}</div>
                <div class="hp-block-container">
                    <div class="hp-text">❤️ ${p.hp}/${p.maxHp}</div>
                    ${p.block > 0 ? `<div class="block-text">🛡️ ${p.block}</div>` : ''}
                </div>
                ${statusRow(p)}
            </div>
            <div class="combatant" id="enemy-sprite">
                <div class="portrait">${e.def.icon}</div>
                <div class="name">${e.name}${e.def.isBoss ? ' 👑' : ''}</div>
                <div class="hp-block-container">
                    <div class="hp-text">❤️ ${e.hp}/${e.maxHp}</div>
                    ${e.block > 0 ? `<div class="block-text">🛡️ ${e.block}</div>` : ''}
                </div>
                ${statusRow(e)}
                <div class="intent-box">Intención: ${intentText}</div>
            </div>
        </div>

        <div style="text-align:center; margin: 6px 0; color: var(--accent-secondary); font-weight:700; font-size: 1.2rem;">
            ⚡ Energía: ${p.energy}/${p.maxEnergy} — Turno ${c.turnNumber} (${c.turn === 'player' ? 'tuyo' : 'enemigo'})
        </div>

        <div class="hand-row">${handHtml}</div>

        <div class="controls-row">
            <button onclick="endTurn()" ${c.turn !== 'player' ? 'disabled' : ''}>Terminar Turno</button>
        </div>
    </div>`;
}

function statusRow(entity) {
    const chips = Object.keys(entity.statuses).map((id) => {
        if (!entity.statuses[id]) return '';
        return `<span class="status-chip">${STATUS_ICONS[id] || ''} ${STATUS_NAMES[id] || id} ${entity.statuses[id]}</span>`;
    }).join('');
    return `<div class="status-row">${chips}</div>`;
}

function renderReward() {
    const cardsHtml = GAME.rewardCards.map((c) => `
        <div class="card ${c.type}" onclick="pickRewardCard('${c.id}')">
            <div class="cost">${c.cost}</div>
            <div class="card-img-frame"><img src="${c.img || 'https://via.placeholder.com/150x80?text=Carta'}" alt="${c.name}"></div>
            <div class="card-name">${c.name}</div>
            <div class="card-type">${c.type}</div>
            <div class="card-desc">${c.description}</div>
        </div>`).join('');
    return `
    <div class="panel">
        <h2>🏆 ¡Victoria!</h2>
        <p>Ganaste ${GAME.rewardGold} de oro. Elige una carta para tu mazo:</p>
        <div class="reward-row">${cardsHtml}</div>
        <button class="secondary" onclick="skipReward()">Omitir recompensa</button>
    </div>`;
}

function renderVictory() {
    return `
    <div class="panel">
        <h2 class="gameover-title">👑 ¡Derrotaste a la Licuadora Suprema!</h2>
        <p>La fruta llegó hasta el final del laberinto. ¡El puesto de jugos está a salvo!</p>
        <button onclick="showMainMenu()">Volver al Menú</button>
    </div>`;
}

function renderGameOver() {
    return `
    <div class="panel">
        <h2 class="gameover-title" style="color:var(--accent-primary)">💀 Game Over</h2>
        <p>Tu fruta cayó en la casilla (${GAME.playerPos.x}, ${GAME.playerPos.y}).</p>
        <button onclick="showMainMenu()">Volver al Menú</button>
    </div>`;
}

function renderRest() {
    const removable = [...new Set(GAME.player.deck)].map((id) => window.CARD_DB[id]);
    return `
    <div class="panel">
        <h2>🏕️ Campamento</h2>
        <p>Puedes descansar para curarte o mejorar tu mazo quitando una carta.</p>
        <div class="controls-row">
            <button onclick="restHeal()">Descansar (+${Math.floor(GAME.player.maxHp * 0.3)} HP)</button>
        </div>
        <p style="margin-top:18px;">O elimina una carta de tu mazo:</p>
        <div class="reward-row">
            ${removable.map((c) => `
            <div class="card ${c.type}" onclick="restRemoveCard('${c.id}')">
                <div class="cost">${c.cost}</div>
                <div class="card-img-frame"><img src="${c.img || 'https://via.placeholder.com/150x80?text=Carta'}" alt="${c.name}"></div>
                <div class="card-name">${c.name}</div>
                <div class="card-type">${c.type}</div>
                <div class="card-desc">${c.description}</div>
            </div>`).join('')}
        </div>
    </div>`;
}

function renderTreasure() {
    return `
    <div class="panel">
        <h2>💎 Tesoro</h2>
        <p>${GAME.lastEventMsg}</p>
        <button onclick="closeEventResult()">Continuar</button>
    </div>`;
}

function renderShop() {
    const s = GAME.shopStock;
    return `
    <div class="panel">
        <h2>🏪 Tienda</h2>
        <p>Oro disponible: 🪙 ${GAME.player.gold}</p>
        <div class="shop-row">
            ${s.cards.map((i) => `
            <div class="shop-item">
                <div class="card ${i.card.type}" style="margin:0 auto;">
                    <div class="cost">${i.card.cost}</div>
                    <div class="card-img-frame"><img src="${i.card.img || 'https://via.placeholder.com/150x80?text=Carta'}" alt="${i.card.name}"></div>
                    <div class="card-name">${i.card.name}</div>
                    <div class="card-type">${i.card.type}</div>
                    <div class="card-desc">${i.card.description}</div>
                </div>
                <div class="price">🪙 ${i.price}</div>
                <button ${GAME.player.gold < i.price ? 'disabled' : ''} onclick="buyShopCard('${i.card.id}')">Comprar</button>
            </div>`).join('')}
            ${s.relic ? `
            <div class="shop-item">
                <div class="icon">${s.relic.icon}</div>
                <div class="card-name">${s.relic.name}</div>
                <div style="font-size:0.78em; color:var(--text-muted);">${s.relic.description}</div>
                <div class="price">🪙 ${s.relicPrice}</div>
                <button ${GAME.player.gold < s.relicPrice ? 'disabled' : ''} onclick="buyShopRelic()">Comprar</button>
            </div>` : ''}
        </div>
        <button class="secondary" onclick="leaveShop()">Salir</button>
    </div>`;
}

function renderEvent() {
    const ev = GAME.currentEvent;
    return `
    <div class="panel">
        <h2>${ev.icon} ${ev.title}</h2>
        <p>${ev.desc}</p>
        <div class="event-options">
            ${ev.options.map((o, i) => `<button onclick="resolveEventOption(${i})">${o.text}</button>`).join('')}
        </div>
    </div>`;
}

function renderEventResult() {
    return `
    <div class="panel">
        <h2>${GAME.currentEvent.icon} ${GAME.currentEvent.title}</h2>
        <p>${GAME.lastEventMsg}</p>
        <button onclick="closeEventResult()">Continuar</button>
    </div>`;
}

function renderCollection() {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';
    if (GAME.unlockedCards.size === 0) {
        grid.innerHTML = '<p>Aún no has descubierto ninguna carta.</p>';
    } else {
        GAME.unlockedCards.forEach(cardId => {
            const card = window.CARD_DB[cardId];
            const div = document.createElement('div');
            div.className = `card ${card.type}`;
            div.style.transform = 'scale(0.6)';
            div.style.transformOrigin = 'top center';
            div.innerHTML = `
                <div class="cost">${card.cost}</div>
                <div class="card-img-frame"><img src="${card.img || 'https://via.placeholder.com/150x80?text=Carta'}" alt="${card.name}"></div>
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}</div>
                <div class="card-desc">${card.description}</div>
            `;
            grid.appendChild(div);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    showMainMenu();
    const saved = localStorage.getItem('fruitSpireSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.unlockedCards) GAME.unlockedCards = new Set(parsed.unlockedCards);
    }
});

const originalShowCollection = showCollection;
showCollection = () => {
    originalShowCollection();
    renderCollection();
};

window.movePlayer = movePlayer;
window.newGame = newGame;
window.loadGame = loadGame;
window.showMainMenu = showMainMenu;
window.showCharacterSelect = showCharacterSelect;
window.selectCharacter = selectCharacter;
window.showCollection = showCollection;
window.playCard = playCard;
window.endTurn = endTurn;
window.pickRewardCard = pickRewardCard;
window.skipReward = skipReward;
window.restHeal = restHeal;
window.restRemoveCard = restRemoveCard;
window.buyShopCard = buyShopCard;
window.buyShopRelic = buyShopRelic;
window.leaveShop = leaveShop;
window.resolveEventOption = resolveEventOption;
window.closeEventResult = closeEventResult;
