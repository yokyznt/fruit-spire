// ============================================================
// RENDER.JS — Dibuja cada pantalla a partir del estado (GAME).
// render() reconstruye #screen; lo que se anima entre dibujos (barras,
// cartas que se deslizan, animaciones de reposo) sigue suave gracias a
// FLIP, a --now y a GAME.pAnims.
// ============================================================

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// data-tip="Título::texto||Título::texto" → tooltip al pasar el mouse
function tip(sections) {
    const seen = new Set();
    const list = (Array.isArray(sections[0]) ? sections : [sections]).filter((sec) => sec && !seen.has(sec[0]) && seen.add(sec[0]));
    if (!list.length) return '';
    return `data-tip="${esc(list.map(([t, x]) => `${t}::${x}`).join('||'))}"`;
}
function charSprite(char) { return char.sprite || char.id; }
function enemySprite(e) { return (e.def.phaseSprites && e.def.phaseSprites[e.phase]) || e.def.sprite || e.def.id; }
function enemyName(e) { return (e.def.phaseNames && e.def.phaseNames[e.phase]) || e.name; }
function actBossDef() { return window.ENEMY_DB[(GAME.walls && GAME.walls.bossId) || currentAct().boss]; }

// ---------- palabras clave de las cartas ----------
let KEYWORDS = null;
// textos únicos de cáscara y energía (se usan igual en todos lados)
const KW_TEXT = {
    block: 'Bloquea daño antes de perder vida. Se pierde al empezar el turno.',
    energy: 'Se gasta para jugar cartas. Se recarga cada turno.'
};
function keywords() {
    if (KEYWORDS) return KEYWORDS;
    KEYWORDS = Object.values(window.STATUS_DB).map((s) => ({ word: s.word, cls: s.cls, title: s.name, text: s.help, statusId: s.id }));
    KEYWORDS.push(
        { word: 'cáscara', cls: 'block', basic: true },
        { word: 'energía', cls: 'energy', basic: true },
        { word: 'roba', cls: 'draw', basic: true },
        { word: 'recupera', cls: 'heal', basic: true },
        { word: 'se consume', cls: 'poison', title: 'Se consume', text: 'Tras jugarla, sale del combate.' },
        { word: 'se conserva', cls: 'draw', title: 'Se conserva', text: 'No se descarta al terminar el turno.' },
        { word: 'injugable', cls: 'weak', title: 'Injugable', text: 'No se puede jugar.' },
        { word: 'pepita', cls: 'heal', title: 'Pepita', text: 'Carta de 0 de energía que inflige 3 de daño. Se consume.' },
        { word: 'planta', cls: 'heal', basic: true },
        { word: 'brote', cls: 'heal', basic: true },
        { word: 'viñedo', cls: 'heal', basic: true },
        { word: 'cosecha', cls: 'heal', basic: true }
    );
    Object.values(window.SPROUT_DB || {}).forEach((sp) => KEYWORDS.push({ word: sp.word, cls: 'heal', title: sp.name, text: sp.help }));
    return KEYWORDS;
}
// Cambia cada ❤️ de los textos por el corazoncito dibujado del juego,
// y la palabra "energía" por el gajo de naranja
const HEART_RE = /❤️?/g;
const ENERGY_RE = /energía/gi;
function heartHtml(s) {
    return s
        .replace(HEART_RE, () => `<span class="heart-ico">${art('ui_heart', '❤️', { size: 'xs' })}</span>`)
        .replace(ENERGY_RE, () => `<span class="energy-ico">${art('ui_energy', '🍊', { size: 'xs' })}</span>`);
}
function heartifyDom(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => ((n.nodeValue.includes('❤') || /energía/i.test(n.nodeValue)) && !n.parentNode.closest('svg, .heart-ico, .energy-ico') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
        const span = document.createElement('span');
        span.innerHTML = heartHtml(esc(n.nodeValue));
        n.replaceWith(...span.childNodes);
    });
}
function highlightDesc(text) {
    let html = esc(text).replace(/(\d+)/g, '<b class="num">$1</b>');
    keywords().forEach((k) => {
        html = html.replace(new RegExp(`(?<![\\wáéíóúñ-])(${k.word}\\w*)`, 'gi'), `<span class="kw kw-${k.cls}${k.basic ? ' kw-basic' : ''}">$1</span>`);
    });
    return html;
}
// Secciones de tooltip que explican cada término (estados, cáscara,
// posturas…) que aparece en un texto. skip: título que no se repite.
// Si la explicación de un término nombra otro término, también se explica
// ese (hasta 3 niveles), sin repetir ninguno.
function keywordTips(text, skip) {
    const seen = new Set([].concat(skip || []));
    const out = [];
    let queue = [String(text || '')];
    for (let depth = 0; depth < 3 && queue.length; depth++) {
        const next = [];
        queue.forEach((t) => {
            const low = t.toLowerCase();
            keywords().forEach((k) => {
                if (k.basic || seen.has(k.title) || !low.includes(k.word)) return;
                seen.add(k.title);
                out.push(k.statusId ? statusTip(k.statusId) : [k.title, k.text]);
                next.push(k.text || '');
            });
        });
        queue = next;
    }
    return out;
}
// Tooltips de varios estados ([id, cantidad]) más los términos que nombran
function statusTipsFull(entries) {
    const names = entries.map(([id]) => statusInfo(id).name);
    const helps = entries.map(([id]) => statusInfo(id).help || '').join(' ');
    return [...entries.map(([id, n]) => statusTip(id, n)), ...keywordTips(helps, names)];
}
// Tooltip con un título, su texto y la explicación de sus términos
function explainRelic(r, note) {
    const sections = [[r.name + (note || ''), r.description], ...keywordTips(r.description, r.name)];
    if (r.ref) sections.push(['Guiño', '@ref:' + r.id]);
    return tip(sections);
}
function explain(title, text) {
    return tip([[title, text], ...keywordTips(text, title)]);
}
function cardTipSections(card) {
    const sections = keywordTips(card.description);
    if (card.type === 'power') sections.push(['Poder', 'Se juega una vez y dura todo el combate.']);
    if (card.upgraded) {
        const base = window.getCard(card.baseId);
        const cost = base.cost !== card.cost ? `Costaba ${base.cost} de energía. ` : '';
        sections.push(['Madurada', `Versión mejorada. La normal ${cost ? `costaba ${base.cost} de energía y ` : ''}dice: «${base.description}»`]);
    }
    return sections;
}
function cardTips(card) {
    const sections = cardTipSections(card);
    return sections.length ? tip(sections) : '';
}
const TYPE_LABELS = { attack: 'ataque', skill: 'habilidad', power: 'poder', curse: 'maldición', status: 'estado' };
// Texto de la carta con el daño / cáscara REAL (ver Combat.previewCard):
// los números suben en verde o bajan en rojo según tus mejoras y perjuicios.
function previewDescHtml(card, prev) {
    if (!prev) return highlightDesc(card.description);
    const finals = [];
    const mark = (list, re, tag) => {
        let k = 0;
        return (text) => text.replace(re, (m, n, rest) => {
            if (k >= list.length) return m;
            finals.push({ base: +n, val: list[k++] });
            return `§${tag}${String.fromCharCode(97 + finals.length - 1)}§${rest}`;
        });
    };
    let text = card.description;
    text = mark(prev.dmg, /([0-9]+)( de daño)/g, 'D')(text);
    text = mark(prev.block, /([0-9]+)( de cáscara)/g, 'B')(text);
    let html = highlightDesc(text);
    finals.forEach((f, i) => {
        const cls = f.val > f.base ? 'up' : f.val < f.base ? 'down' : '';
        html = html.replace(new RegExp(`§[DB]${String.fromCharCode(97 + i)}§`), `<b class="num live ${cls}">${f.val}</b>`);
    });
    return html;
}
function renderCardHtml(card, opts) {
    opts = opts || {};
    const cardArt = card.image
        ? `<img src="${card.image}" alt="${card.name}">`
        : art(card.sprite, card.art, { size: 'lg' });
    const clickable = opts.onclick && (!opts.disabled || opts.alwaysClick);
    const rarityMark = card.rarity === 'rare' ? '<span class="rarity-mark">★★</span>'
        : card.rarity === 'uncommon' ? '<span class="rarity-mark">★</span>' : '';
    const cls = [card.type, `rarity-${card.rarity || 'common'}`, card.upgraded ? 'upgraded' : '', opts.disabled ? 'disabled' : '', opts.cls || ''].join(' ');
    return `
    <div class="card ${cls}" ${clickable ? `onclick="${opts.onclick}"` : ''} ${cardTips(card)}>
        ${card.unplayable ? '' : `<div class="card-cost"><span>${card.cost}</span></div>`}
        ${rarityMark}
        ${card.character && window.CHARACTER_DB[card.character] ? `<span class="char-mark">${art(charSprite(window.CHARACTER_DB[card.character]), '', { size: 'xs' })}</span>` : ''}
        <div class="card-art">${cardArt}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-type-tag hand">${TYPE_LABELS[card.type] || card.type}</div>
        <div class="card-desc ${card.description.length > 64 ? 'long' : ''}">${opts.preview ? previewDescHtml(card, opts.preview) : highlightDesc(card.description)}</div>
    </div>`;
}

// Barra de vida animada. key identifica a quién pertenece.
// Golpes contra cáscara: primero baja la cáscara y, si sobra daño, después
// la vida. Aquí se juntan los golpes recién hechos que tocaron cáscara.
const BLOCK_FIRST_MS = 520;
const blockFxSeen = new WeakSet();
function pendingBlockHits() {
    const c = GAME.combat, out = {};
    if (!c || GAME.screen !== 'combat') return out;
    (c.lastEvents || []).forEach((ev) => {
        if (ev.type !== 'damage' || ev.poison || !(ev.blocked > 0) || blockFxSeen.has(ev)) return;
        const o = out[ev.target] || (out[ev.target] = { blocked: 0 });
        o.blocked += ev.blocked;
    });
    return out;
}
function hpBar(entity, key, cls) {
    const pct = Math.max(0, (entity.hp / entity.maxHp) * 100);
    const prev = GAME.lastBars[key] == null ? pct : GAME.lastBars[key];
    GAME.lastBars[key] = pct;
    return `
    <div class="${cls || 'combat-hp-bar'}" data-side="${key === 'hud' ? 'player' : key}">
        <div class="hp-ghost" style="width:${prev}%" data-to="${pct}%"></div>
        <div class="hp-fill" style="width:${prev}%" data-to="${pct}%"></div>
        <div class="hp-text">${entity.hp}/${entity.maxHp}</div>
    </div>`;
}

// Letras recortadas de colores para el logo
const LOGO_COLORS = ['#F2667A', '#FF9E7A', '#FFCF4D', '#7BBF5A', '#5CC9A7', '#9B7FD4'];
function logoHtml(text, cls) {
    let i = 0;
    const letters = [...text].map((ch) => {
        if (ch === ' ') return '<span class="logo-space"></span>';
        const color = LOGO_COLORS[i % LOGO_COLORS.length];
        const rot = [-6, 4, -3, 6, -4, 3][i % 6];
        i++;
        return `<span class="logo-letter" style="--c:${color};--r:${rot}deg">${ch}</span>`;
    }).join('');
    return `<div class="logo ${cls || ''}">${letters}</div>`;
}

// ============================================================
// RENDER
// ============================================================
// ---------- sin animaciones de entrada repetidas ----------
// render() rehace toda la pantalla, así que cada clic volvía a lanzar las
// animaciones de "aparecer" (panel, tablero, mochila…). Si la pantalla es la
// misma, las animaciones de entrada de lo que YA estaba se adelantan al
// final; solo aparece con animación lo que es nuevo de verdad.
const ENTRY_ANIMS = new Set(['panelIn', 'pop', 'fadeIn', 'invIn', 'slideUp', 'glowIn', 'popBubble', 'seedMenuIn', 'panelPop', 'mgIn', 'boardIn']);
function viewSnapshot(root) {
    const classes = new Map();
    root.querySelectorAll('[class]').forEach((el) => {
        const k = el.getAttribute('class');
        classes.set(k, (classes.get(k) || 0) + 1);
    });
    return { screen: GAME.screen, classes };
}
function settleEntryAnims(prev, root) {
    if (!prev || prev.screen !== GAME.screen || !document.getAnimations) return;
    const left = new Map(prev.classes);
    document.getAnimations().forEach((a) => {
        if (!a.animationName || !ENTRY_ANIMS.has(a.animationName)) return;
        const el = a.effect && a.effect.target;
        if (!el || !root.contains(el) || el.closest('.fresh')) return;
        const k = el.getAttribute('class');
        const n = left.get(k) || 0;
        if (n <= 0) return; // es algo nuevo: que aparezca
        left.set(k, n - 1);
        try { a.finish(); } catch (e) { /* animación infinita: se deja */ }
    });
}

function render() {
    hideTip();
    const before = captureFlip();
    const prevView = viewSnapshot(document.getElementById('screen'));
    const screen = document.getElementById('screen');
    screen.className = `screen-${GAME.screen}${GAME.player ? ` act-${GAME.player.act} floor-${currentFloorNo()} theme-${currentThemeId()}` : ''}`;
    // las animaciones de reposo usan esta fase como retraso negativo, así
    // siguen justo donde iban aunque se redibuje la pantalla
    screen.style.setProperty('--now', `${(-performance.now() / 1000).toFixed(3)}s`);
    screen.innerHTML = renderHud() + `<main class="stage">${renderScreen()}</main>` + renderModal() + (window.renderInventory ? renderInventory() : '');
    heartifyDom(document.getElementById('screen'));
    settleEntryAnims(prevView, screen);
    if (window.setAmbientMood) {
        const strong = GAME.combatKind === 'boss' || GAME.combatKind === 'elite';
        setAmbientMood(GAME.screen !== 'combat' ? 0 : strong ? 2 : 1);
    }
    playFlip(before);
    afterRender();
    if (GAME.goldGain) animateGoldGain();
    if (window.tutorialAfterRender) tutorialAfterRender();
}

// ---------- FLIP: los elementos con data-flip se deslizan a su nuevo lugar ----------
// Cartas de la mano: "h<índice>". Si se acaba de jugar la carta k, las
// de la derecha pasan a ocupar el índice anterior.
function flipKey(el) {
    const key = el.dataset.flip;
    if (key[0] !== 'h' || GAME.handRemoved == null) return key;
    const j = +key.slice(1);
    if (j === GAME.handRemoved) return null;
    return j > GAME.handRemoved ? `h${j - 1}` : key;
}
function captureFlip() {
    const map = new Map();
    document.querySelectorAll('#screen [data-flip]').forEach((el) => {
        const key = flipKey(el);
        if (key && !el.classList.contains('played') && !el.classList.contains('dragging') && !el.classList.contains('sold')) {
            map.set(key, el.getBoundingClientRect());
        }
    });
    return map;
}
function playFlip(before) {
    if (!before.size) return;
    const hadHand = [...before.keys()].some((k) => k[0] === 'h');
    document.querySelectorAll('#screen [data-flip]').forEach((el) => {
        const old = before.get(el.dataset.flip);
        if (!old) {
            // carta robada a mitad del turno: entra desde la pila de robo
            if (hadHand && el.dataset.flip[0] === 'h' && !GAME.dealIn) el.classList.add('deal-in');
            return;
        }
        const now = el.getBoundingClientRect();
        const dx = (old.left + old.width / 2 - now.left - now.width / 2) / SCALE;
        const dy = (old.top + old.height / 2 - now.top - now.height / 2) / SCALE;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: 460, easing: 'cubic-bezier(.22, 1, .36, 1)', composite: 'add' });
    });
}

// Achica el texto de las cartas que no caben (en px del lienzo, sin
// importar la escala de la ventana). Se hace una sola vez por carta.
function fitCardText(root) {
    (root || document).querySelectorAll('.card .card-desc:not([data-fit]), .card .card-name:not([data-fit])').forEach((el) => {
        el.dataset.fit = '1';
        if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) return;
        let size = parseFloat(getComputedStyle(el).fontSize);
        const min = el.classList.contains('card-name') ? 12 : 9;
        for (let guard = 0; guard < 16 && size > min && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1); guard++) {
            size -= 0.6;
            el.style.fontSize = `${size}px`;
            el.style.lineHeight = '1.15';
        }
    });
}
window.fitCardText = fitCardText;

// La cáscara golpeada cuenta hacia abajo y, si se acaba, se rompe
function drainBlockBadge(badge) {
    const num = badge.querySelector('b');
    const from = +badge.dataset.from, to = +badge.dataset.blockTo;
    badge.classList.add('draining');
    const t0 = performance.now(), dur = BLOCK_FIRST_MS - 120;
    const step = (t) => {
        if (!badge.isConnected) return;
        const k = Math.min(1, (t - t0) / dur);
        num.textContent = Math.round(from + (to - from) * k);
        if (k < 1) { requestAnimationFrame(step); return; }
        badge.classList.remove('draining');
        if (to <= 0) badge.classList.add('broken');
    };
    requestAnimationFrame(step);
}

function afterRender() {
    fitCardText(document.getElementById('screen'));
    if (GAME.screen === 'map') setupMapDrag();
    if (GAME.screen === 'combat') Object.keys(GAME.pAnims).forEach(applyPortraitAnim);
    // barras de vida: arrancan en el valor anterior y se deslizan al nuevo
    // si el golpe pegó en cáscara, la vida espera a que la cáscara baje
    const hits = pendingBlockHits();
    if (GAME.combat) (GAME.combat.lastEvents || []).forEach((ev) => blockFxSeen.add(ev));
    document.querySelectorAll('.combat-block-badge[data-from]').forEach(drainBlockBadge);
    const bars = document.querySelectorAll('[data-to]');
    if (bars.length) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            bars.forEach((b) => {
                const wrap = b.closest('[data-side]');
                const late = wrap && hits[wrap.dataset.side];
                if (late) setTimeout(() => { b.style.width = b.dataset.to; }, BLOCK_FIRST_MS);
                else b.style.width = b.dataset.to;
            });
        }));
    }
    GAME.dealIn = false;
    GAME.combatEnter = false;
}

function renderHud() {
    const p = GAME.player;
    if (!p || ['menu', 'character-select', 'collection', 'wardrobe', 'story', 'pass', 'notes'].includes(GAME.screen)) return '';
    const char = window.CHARACTER_DB[p.characterId] || {};
    const act = currentAct();
    const diff = difficulty();
    return `
    <header class="hud">
        <div class="hud-title" ${tip(['Volver al menú', 'Tu progreso se guarda al salir del combate.'])} onclick="if(!GAME.anim) showMainMenu();">
            ${fruitArt(char.id, { size: 'sm' })}
            ${logoHtml('Fruit Spire', 'small')}
        </div>
        <div class="hud-chip act" ${tip([[`${act.castleName} · piso ${act.floor} de ${window.FLOORS_PER_CASTLE}`, '']])}>
            ${art(diff.sprite, '🍎', { size: 'xs' })}<b>Castillo ${act.n}</b><span class="hand">Piso ${act.floor} · ${act.name}</span>
        </div>
        <div class="hud-chip hp" ${tip(['Vida', `Tienes ${p.hp} de ${p.maxHp} ❤️. Si llega a 0, pierdes la partida.`])}>
            ${art('ui_heart', '❤️', { size: 'xs' })}
            <b>${p.hp}/${p.maxHp}</b>
            ${hpBar(p, 'hud', 'juice-bar')}
        </div>
        <div class="hud-chip gold" ${tip(['Oro', 'Se gana en los combates. Úsalo en la tiendita.'])}>${art('ui_coin', '🪙', { size: 'xs' })}<b>${p.gold}</b></div>
        ${hudBagHtml(p)}
        <div class="hud-deck" onclick="openDeckView()" ${tip(['Tu mazo', 'Mira todas las cartas que tienes.'])}>
            <div class="mini-stack"><span class="card-back"></span><span class="card-back"></span></div>
            <b>Mazo</b><span class="count">${p.deck.length}</span>
        </div>
        <button class="fullscreen-btn hud sound-btn" onclick="toggleGameSound()" ${tip(['Sonido', 'Silenciar o activar los efectos y el ambiente.'])}>${window.isMuted && window.isMuted() ? '🔇' : '🔊'}</button>
    </header>`;
}

// ---------- SEMILLAS ----------
const SEED_MARKS = {
    fire: '<path d="M50 22c8 12 16 18 16 30a16 16 0 0 1-32 0c0-8 5-12 8-18 2 6 4 8 7 9 1-8 0-14 1-21z"/>',
    heart: '<path d="M50 70C30 56 26 46 30 38c4-8 15-8 20 1 5-9 16-9 20-1 4 8 0 18-20 32z"/>',
    shield: '<path d="M50 24l20 8v14c0 14-9 22-20 27-11-5-20-13-20-27V32z"/>',
    bolt: '<path d="M55 20L34 54h14l-5 26 23-36H52z"/>',
    cards: '<rect x="30" y="30" width="22" height="30" rx="4" transform="rotate(-12 41 45)"/><rect x="46" y="30" width="22" height="30" rx="4" transform="rotate(10 57 45)"/>',
    drop: '<path d="M50 22c10 16 18 24 18 34a18 18 0 0 1-36 0c0-10 8-18 18-34z"/>',
    swirl: '<path d="M50 30a18 18 0 1 1-18 18h8a10 10 0 1 0 10-10z"/>',
    burst: '<path d="M50 22l6 16 16-6-8 15 14 9-17 3 2 17-13-11-13 11 2-17-17-3 14-9-8-15 16 6z"/>',
    snow: '<path d="M47 22h6v56h-6zM23 47h54v6H23zM30 30l4-4 36 40-4 4zM66 26l4 4-36 40-4-4z"/>',
    up: '<path d="M50 22l20 22H58v30H42V44H30z"/>',
    star: '<path d="M50 20l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z"/>',
    clock: '<circle cx="50" cy="50" r="22"/><path d="M50 36v15l10 6" fill="none" stroke-width="6" stroke-linecap="round"/>',
    skull: '<path d="M30 52a20 18 0 0 1 40 0v9H60v9H40v-9H30z"/><circle cx="42" cy="52" r="4.5" fill="#3a2a1e"/><circle cx="58" cy="52" r="4.5" fill="#3a2a1e"/>',
    spikes: '<path d="M28 74l8-32 8 22 6-34 6 34 8-22 8 32z"/>',
    mirror: '<ellipse cx="50" cy="46" rx="17" ry="23"/><path d="M42 40l7-8" fill="none" stroke-width="5" stroke-linecap="round"/><rect x="45" y="68" width="10" height="14" rx="2"/>',
    ghost: '<path d="M32 76V48a18 22 0 0 1 36 0v28l-9-7-9 7-9-7z"/><circle cx="43" cy="48" r="3.4" fill="#3a2a1e"/><circle cx="57" cy="48" r="3.4" fill="#3a2a1e"/>',
    dice: '<rect x="30" y="30" width="40" height="40" rx="9"/><circle cx="41" cy="41" r="4" fill="#3a2a1e"/><circle cx="59" cy="59" r="4" fill="#3a2a1e"/><circle cx="50" cy="50" r="4" fill="#3a2a1e"/><circle cx="59" cy="41" r="4" fill="#3a2a1e"/><circle cx="41" cy="59" r="4" fill="#3a2a1e"/>',
    flower: '<circle cx="50" cy="34" r="10"/><circle cx="66" cy="50" r="10"/><circle cx="50" cy="66" r="10"/><circle cx="34" cy="50" r="10"/><circle cx="50" cy="50" r="9" fill="#FFCF4D"/>'
};
function seedArt(seed, size) {
    const mark = SEED_MARKS[seed.mark] || SEED_MARKS.star;
    return `<span class="art art-${size || 'sm'}"><svg class="sprite" viewBox="0 0 100 100">
        <path d="M50 6C74 22 86 44 86 62a36 34 0 0 1-72 0C14 44 26 22 50 6z" fill="${seed.color}" stroke="#3a2a1e" stroke-width="5" stroke-linejoin="round"/>
        <path d="M36 26c-6 8-10 16-11 26" stroke="#fff" stroke-opacity=".55" stroke-width="6" stroke-linecap="round" fill="none"/>
        <g transform="translate(50 62) scale(.55) translate(-50 -50)" fill="#fff" stroke="#3a2a1e" stroke-width="4" stroke-linejoin="round">${mark}</g>
    </svg></span>`;
}
const SEED_RARITY = { common: 'Común', uncommon: 'Poco común', rare: 'Rara' };
function seedTip(seed) {
    return explain(seed.name, `${seed.desc} Se usa una vez, en tu turno.`);
}
function seedRewardBox() {
    const seed = window.SEED_DB[GAME.rewardSeed];
    if (!seed) return '';
    return `<div class="seed-box ${GAME.rewardSeedTaken ? 'taken' : ''}" ${seedTip(seed)}>
        ${seedArt(seed, 'lg')}
        <div class="cosmetic-text"><b>${GAME.rewardSeedTaken ? '¡Semilla a la bolsa!' : '¡Una semilla!'}</b><span>${seed.name}: ${seed.desc}</span></div>
        ${GAME.rewardSeedTaken ? '' : '<button class="btn-mint" onclick="takeRewardSeed()">Tomar</button>'}
    </div>`;
}

function renderScreen() {
    switch (GAME.screen) {
        case 'menu': return renderMainMenu();
        case 'character-select': return renderCharacterSelect();
        case 'collection': return renderCollection();
        case 'wardrobe': return renderWardrobe();
        case 'story': return renderStory();
        case 'pass': return renderPass();
        case 'notes': return renderNotes();
        case 'gift': return renderGift();
        case 'well': return renderWell();
        case 'key-found': return renderKeyFound();
        case 'vault': return renderVault();
        case 'dungeon': return renderDungeon();
        case 'minigame': return renderMinigame();
        case 'tutorial-end': return renderTutorialEnd();
        case 'act-intro': return renderActIntro();
        case 'map': return renderMap();
        case 'combat': return renderCombat();
        case 'reward': return renderReward();
        case 'boss-relic': return renderBossRelic();
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

const TYPE_ORDER = { attack: 0, skill: 1, power: 2, curse: 3 };
function sortCards(list) {
    return list.sort((a, b) => TYPE_ORDER[a.card.type] - TYPE_ORDER[b.card.type] || a.card.cost - b.card.cost
        || a.card.name.localeCompare(b.card.name));
}
function renderModal() {
    if (!GAME.modal) return '';
    const { title, note, ids } = GAME.modal;
    // cada copia es una carta aparte, aunque se repitan
    const list = sortCards(ids.map((id) => ({ card: window.getCard(id) })).filter((i) => i.card));
    return `
    <div class="modal-backdrop" onclick="closeModal()">
        <div class="modal panel" onclick="event.stopPropagation()">
            <h2 class="hand-title">${title}</h2>
            <p>${note}</p>
            <div class="modal-grid">
                ${list.map(({ card }, i) => `<div class="modal-card" style="--i:${Math.min(i, 24)}">${renderCardHtml(card, {})}</div>`).join('')
                    || '<p class="hand empty-note">…no hay ninguna carta aquí</p>'}
            </div>
            <button onclick="closeModal()">Cerrar</button>
        </div>
    </div>`;
}

// ---------- MENÚ ----------
function renderMainMenu() {
    const canContinue = hasSave();
    const fruits = Object.values(window.CHARACTER_DB)
        .map((c, i) => `<span class="menu-fruit" style="--d:${i * 0.35}s;--blink:${i * 1.3}s">${fruitArt(c.id, { size: 'xl' })}</span>`).join('');
    return `
    <div class="menu-screen">
        <div class="menu-fruits">${fruits}</div>
        ${logoHtml('Fruit Spire', 'big')}
        <div class="menu-goal hand">Sube la torre y rescata al Rey Fruta</div>
        <div class="menu-buttons">
            <button ${canContinue ? '' : 'disabled'} onclick="continueGame()">Continuar partida</button>
            <button class="btn-mint" onclick="goToCharacterSelect()">Partida nueva</button>
            <button class="btn-banana" onclick="startTutorial()">Cómo jugar</button>
            <button class="btn-strawberry" onclick="openPass()">Pase de Batalla${(window.PASS && PASS.unclaimed()) ? `<span class="menu-badge">${PASS.unclaimed()}</span>` : ''}</button>
            <button class="btn-grape" onclick="openWardrobe()">Vestidor</button>
            <button class="secondary" onclick="openCollection()">Álbum de cartas</button>
        </div>
        <button class="notes-btn" onclick="openNotes()" ${tip(['Notas de la versión', 'Las novedades y arreglos del juego, y el Instagram del creador.'])}>${art('ui_notes', '', { size: 'sm' })} Notas${window.notesAreNew && notesAreNew() ? '<i class="new-dot"></i>' : ''}</button>
        <button class="fullscreen-btn" onclick="toggleFullscreen()" ${tip(['Pantalla completa', 'Entrar o salir de la pantalla completa (también con F11).'])}>⛶</button>
        <button class="fullscreen-btn sound-btn" onclick="toggleGameSound()" ${tip(['Sonido', 'Silenciar o activar los efectos y el ambiente.'])}>${window.isMuted && window.isMuted() ? '🔇' : '🔊'}</button>
    </div>`;
}

function renderCharacterSelect() {
    const chars = Object.values(window.CHARACTER_DB);
    const selChar = window.CHARACTER_DB[GAME.selectedChar] || chars[0];
    const sel = window.getDifficulty(GAME.selectedDifficulty);
    const level = unlockedLevel(selChar.id);
    const starter = window.starterDeckFor(selChar.id).filter((id, i, arr) => arr.indexOf(id) === i && (window.getCard(id) || {}).character);
    return `
    <div class="menu-screen char-select">
        <h1 class="hand-title big">Elige tu fruta</h1>
        <div class="char-select-row">
            ${chars.map((c, i) => {
                const lv = unlockedLevel(c.id);
                return `
            <div class="polaroid ${c.id === selChar.id ? 'selected' : ''}" style="--blink:${i * 1.4}s" onclick="selectCharacter('${c.id}')">
                <div class="polaroid-photo">${fruitArt(c.id, { size: 'xxl' })}</div>
                <div class="polaroid-name hand">${c.name}</div>
                <div class="polaroid-hp">${art('ui_heart', '❤️', { size: 'xs' })} ${c.baseHp} ❤️</div>
                <div class="polaroid-style">${c.style}</div>
                <div class="polaroid-grades" ${tip(['Grados de putrefacción', `Tienes ${lv + 1} de ${window.DIFFICULTIES.length} desbloqueados con ${c.name}.`])}>
                    ${window.DIFFICULTIES.map((d, k) => `<span class="grade-dot ${k <= lv ? 'open' : ''}">${art(d.sprite, '🍎', { size: 'xs' })}</span>`).join('')}
                </div>
            </div>`;
            }).join('')}
        </div>
        <div class="char-detail panel">
            <div class="char-detail-info">
                <b class="hand">${selChar.name}</b>
                <span class="char-ability" ${explain('Habilidad', selChar.description)}>${selChar.description}</span>
                <span class="char-signature">Empieza con: ${starter.map((id) => `<i ${cardTipAttr(window.getCard(id))}>${window.getCard(id).name}</i>`).join(', ')}</span>
            </div>
            <div class="difficulty-row">
                <span class="hand diff-label">Grado de putrefacción:</span>
                ${window.DIFFICULTIES.map((d, k) => {
                    const locked = k > level;
                    const prev = window.DIFFICULTIES[k - 1];
                    const tipText = locked ? `Bloqueado: gana una partida en ${prev.name} con ${selChar.name} para desbloquearlo.` : d.desc;
                    return `
                <button class="diff-chip ${d.id === sel.id ? 'selected' : ''} ${locked ? 'locked' : ''}" onclick="selectDifficulty('${d.id}')" ${explain(`${d.name}${locked ? ' 🔒' : ''}`, tipText)}>
                    ${art(d.sprite, '🍎', { size: 'sm' })}<span>${d.name}</span>${locked ? `<i class="lock">${art('ui_lock', '', { size: 'xs' })}</i>` : ''}
                </button>`;
                }).join('')}
            </div>
            <div class="diff-desc hand">${sel.desc}</div>
        </div>
        <div class="char-select-buttons">
            <button class="secondary" onclick="backToMenu()">Volver</button>
            <button class="btn-mint play-btn" onclick="startNewGameWithCharacter()">¡A jugar con ${selChar.name}!</button>
        </div>
    </div>`;
}
// tooltip con la descripción de una carta (para nombrarla en textos)
function cardTipAttr(card) {
    return card ? tip([[card.name, card.description], ...cardTipSections(card)]) : '';
}

function renderCollection() {
    const discovered = new Set(getDiscovered());
    const all = Object.values(window.CARD_DB).filter((c) => c.rarity !== 'token');
    const groups = [
        ...Object.values(window.CHARACTER_DB).map((ch) => ({ title: ch.name, sprite: charSprite(ch), icon: ch.icon, cards: all.filter((c) => c.character === ch.id) })),
        { title: 'Neutrales', sprite: 'node_mystery', icon: '✨', cards: all.filter((c) => !c.character && c.type !== 'curse' && c.type !== 'status') },
        { title: 'Maldiciones y estados', sprite: 'fruta_magullada', icon: '🤕', cards: all.filter((c) => c.type === 'curse' || c.type === 'status') }
    ];
    const found = all.filter((c) => discovered.has(c.id)).length;
    return `
    <div class="menu-screen wide">
        <div class="panel album">
            <h1 class="hand-title">Álbum de cartas</h1>
            <div class="menu-subtitle hand">${found} de ${all.length} stickers pegados</div>
            <div class="collection-grid">
                ${groups.map((g) => `
                <h3 class="album-section hand">${art(g.sprite, g.icon, { size: 'sm' })} ${g.title} <small>${g.cards.filter((c) => discovered.has(c.id)).length}/${g.cards.length}</small></h3>
                ${g.cards.map((c) => discovered.has(c.id) ? renderCardHtml(c, {}) : '<div class="card-slot"><span>?</span></div>').join('')}`).join('')}
            </div>
        </div>
        <button class="secondary" onclick="backToMenu()">${backLabel()}</button>
    </div>`;
}

// ---------- PORTADA DE NIVEL ----------
// Los 3 castillos dibujados en fila (cada uno más grande); el actual se resalta
function castleRowHtml(current) {
    return `<div class="castle-row">${window.CASTLES.map((c) => `
        <span class="castle-mini c${c.n} ${c.n === current ? 'here' : c.n < current ? 'done' : ''}" ${tip([c.name, c.n < current ? 'Ya lo conquistaste.' : c.n === current ? 'Estás aquí.' : c.subtitle])}>
            ${art(c.sprite, c.icon, { size: 'lg' })}
        </span>`).join('')}</div>`;
}
function renderActIntro() {
    const act = currentAct();
    const boss = actBossDef();
    const last = act.n === window.CASTLES.length && act.floor === window.FLOORS_PER_CASTLE;
    const guardian = act.floor < window.FLOORS_PER_CASTLE;
    return `
    <div class="act-intro act-${act.n} theme-${act.id}">
        <div class="act-number hand">${act.castleName} · Piso ${act.floor} de ${window.FLOORS_PER_CASTLE}</div>
        ${castleRowHtml(act.n)}
        <div class="act-scene">${art(`act_${act.id}`, act.icon, { size: 'xxl' })}</div>
        ${logoHtml(act.name, 'act-logo')}
        <div class="act-subtitle hand">${act.subtitle}</div>
        ${act.floor === 1 ? `<div class="act-story hand">${act.castle.story}</div>` : ''}
        ${act.theme.rule ? `<div class="act-rule" ${tip(['Regla del piso', 'Cada piso cambia un poco cómo se juega. Se ve en la esquina de cada combate.'])}>${art(act.theme.rule.sprite, act.theme.rule.icon, { size: 'md' })}<div><b class="hand">${act.theme.rule.name}</b><small>${act.theme.rule.desc}</small></div></div>` : ''}
        ${GAME.actHealed > 0 && (act.n > 1 || act.floor > 1) ? `<div class="act-heal">${art('ui_heal', '❤️', { size: 'xs' })} Recuperaste ${GAME.actHealed} ❤️ en el camino.</div>` : ''}
        <div class="act-boss" ${tip([boss.name, last ? 'El guardián del Rey Fruta. Vencerlo lo libera.' : guardian ? 'El guardián de este piso. Vencerlo te deja subir al siguiente.' : 'El jefe de este castillo. Vencerlo te lleva al siguiente.'])}>
            ${art(boss.sprite || boss.id, boss.icon, { size: 'md' })}
            <span class="hand">Al final te espera: <b>${boss.name}</b>${last ? ' (¡el último jefe!)' : guardian ? ' (guardián)' : ' (jefe del castillo)'}</span>
        </div>
        <button class="btn-mint" onclick="beginAct()">¡Adelante!</button>
    </div>`;
}

// ---------- MAPA (con muros de cinta washi, arrastrable) ----------
const MAP_CELL = 124; // tamaño de cada casilla (px del lienzo)
const MAP_GAP = 24;   // espacio entre casillas, donde se dibujan los muros

const LAIR_EXTRA = 90; // la guarida del jefe es más ancha que una casilla
function mapBoardSize() {
    const { cols, rows } = window.mapDims(GAME.walls, GAME.map);
    return {
        w: cols * MAP_CELL + (cols + 1) * MAP_GAP + LAIR_EXTRA,
        h: rows * MAP_CELL + (rows + 1) * MAP_GAP
    };
}
const cellPos = (i) => MAP_GAP + i * (MAP_CELL + MAP_GAP);

function nodeInfo(type) {
    if (type === 'blocked') return BLOCKED_BY_ACT[currentAct().n - 1] || BLOCKED_BY_ACT[0];
    if (type !== 'boss') return NODE_INFO[type];
    const boss = actBossDef();
    const act = currentAct();
    const finalFloor = act.floor >= window.FLOORS_PER_CASTLE;
    return {
        sprite: boss.sprite || boss.id, icon: boss.icon, label: `${finalFloor ? 'Jefe' : 'Guardián'}: ${boss.name}`,
        desc: boss.final ? 'El último jefe. Véncelo para rescatar al Rey Fruta.'
            : finalFloor ? 'El jefe del castillo. Véncelo para pasar al siguiente.' : 'El guardián del piso. Véncelo para subir al siguiente.'
    };
}

function renderMap() {
    const T = window.NODE_TYPES;
    const { cols, rows } = window.mapDims(GAME.walls, GAME.map);
    const { w, h } = mapBoardSize();
    const { wallsV, wallsH } = GAME.walls;
    const char = window.CHARACTER_DB[GAME.player.characterId] || {};
    const visited = new Set(GAME.visited);
    const act = currentAct();
    const rivers = GAME.walls.rivers || [];
    const variant = (window.MAP_VARIANTS[GAME.walls.variant] || window.MAP_VARIANTS.classic).label;

    let html = `<div class="map-layout">
        <div class="map-viewport act-${act.n} theme-${act.id}" id="map-viewport">
        <div class="map-banner hand"><b>${act.castleName}</b> · Piso ${act.floor}/${window.FLOORS_PER_CASTLE} · ${act.name}</div>
        <div class="map-board" id="map-board" style="width:${w}px;height:${h}px">`;

    // adornos del tema (siempre los mismos para un mismo piso: salen de su semilla)
    let seed = (GAME.walls.seed || 1234567) >>> 0;
    const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const decoSet = act.theme.deco && act.theme.deco.length ? act.theme.deco : ['deco_pasto'];
    const decoCount = Math.round(cols * rows * 0.45);
    for (let i = 0; i < decoCount; i++) {
        const size = (34 + rnd() * 46).toFixed(0);
        html += `<span class="map-deco" style="left:${(rnd() * w).toFixed(0)}px;top:${(rnd() * h).toFixed(0)}px;width:${size}px;height:${size}px;--r:${(rnd() * 60 - 30).toFixed(0)}deg">${art(decoSet[Math.floor(rnd() * decoSet.length)], '', {})}</span>`;
    }
    // caminitos: un puntejado entre casillas vecinas que no tienen muro ni obstáculo
    const walkable = (x, y) => GAME.map[y] && GAME.map[y][x] && GAME.map[y][x] !== T.BLOCKED;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 1; x++) {
            if (!walkable(x, y)) continue;
            if (x < cols - 2 && !wallsV[y][x] && walkable(x + 1, y)) {
                html += `<i class="link link-h" style="left:${cellPos(x) + MAP_CELL}px;top:${cellPos(y) + MAP_CELL / 2 - 3}px;width:${MAP_GAP}px"></i>`;
            }
            if (y < rows - 1 && !wallsH[y][x] && walkable(x, y + 1)) {
                html += `<i class="link link-v" style="left:${cellPos(x) + MAP_CELL / 2 - 3}px;top:${cellPos(y) + MAP_CELL}px;height:${MAP_GAP}px"></i>`;
            }
        }
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 1; x++) {
            const type = GAME.map[y][x];
            const isCurrent = GAME.playerPos.x === x && GAME.playerPos.y === y;
            const reachable = !isCurrent && isReachable(x, y);
            let classes = `node tilt-${(x * 7 + y * 3) % 4}`;
            if (isCurrent) classes += ' current';
            if (reachable) classes += ' reachable';
            if (type === T.BOSS) classes += ' boss';
            if (type === T.ELITE) classes += ' elite';
            if (type === T.BLOCKED) classes += ' blocked';
            if (type === T.EMPTY && !isCurrent) classes += ' empty';
            if (!isCurrent && visited.has(`${x},${y}`)) classes += ' visited';

            const hasContent = type && type !== T.EMPTY && !isCurrent;
            const info = hasContent ? nodeInfo(type) : null;
            const inner = info ? art(info.sprite, info.icon, { size: 'lg' }) : '';
            const tipAttr = info ? tip([info.label, info.desc + (reachable ? ' (clic para ir)' : '')]) : '';
            const onclick = reachable ? `onclick="movePlayer(${x},${y})"` : '';
            html += `<div class="${classes}" style="left:${cellPos(x)}px;top:${cellPos(y)}px;width:${MAP_CELL}px;height:${MAP_CELL}px" ${onclick} ${tipAttr}>${inner}</div>`;
        }
    }

    // muros verticales: entre (x,y) y (x+1,y). Los del río se ven distinto,
    // y el único cruce (el puente) lleva su propia decoración encima.
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 1; x++) {
            const river = rivers.find((r) => r.col === x);
            const isRiver = !!river;
            const bridgeRow = river ? river.bridge : null;
            // el puente "oficial" siempre cruza; a veces la orilla también
            // deja pasar justo por el borde de arriba o abajo del mapa —
            // ambos casos se dibujan igual, como un cruce de verdad, para
            // que nunca parezca un hueco vacío en la cinta del río
            if (isRiver && !wallsV[y][x]) {
                const label = y === bridgeRow ? 'Puente de Cáscara' : 'Cruce del Río de Pulpa';
                html += `<div class="bridge" style="left:${cellPos(x + 1) - MAP_GAP}px;top:${cellPos(y) - MAP_GAP / 2}px;width:${MAP_GAP}px;height:${MAP_CELL + MAP_GAP}px" ${tip([label, 'Aquí sí se puede cruzar el Río de Pulpa.'])}></div>`;
                continue;
            }
            if (!wallsV[y][x]) continue;
            const cls = isRiver ? 'wall-river' : `tape-${(x + y) % 3}`;
            html += `<div class="wall wall-v ${cls}" style="left:${cellPos(x + 1) - MAP_GAP}px;top:${cellPos(y) - MAP_GAP / 2}px;width:${MAP_GAP}px;height:${MAP_CELL + MAP_GAP}px"></div>`;
        }
    }
    // muros horizontales: entre (x,y) y (x,y+1)
    for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
            if (!wallsH[y][x]) continue;
            html += `<div class="wall wall-h tape-${(x + y + 1) % 3}" style="left:${cellPos(x) - MAP_GAP / 2}px;top:${cellPos(y + 1) - MAP_GAP}px;width:${MAP_CELL + MAP_GAP}px;height:${MAP_GAP}px"></div>`;
        }
    }

    // guarida del jefe: toda la última columna
    const lairX = cols - 1;
    const lairReach = GAME.playerPos.x === lairX - 1 && isReachable(lairX, GAME.playerPos.y);
    const bossInfo = nodeInfo('boss');
    html += `<div class="boss-lair ${lairReach ? 'reachable' : ''}" style="left:${cellPos(lairX)}px;top:${cellPos(0)}px;width:${MAP_CELL + LAIR_EXTRA}px;height:${rows * MAP_CELL + (rows - 1) * MAP_GAP}px"
        ${lairReach ? `onclick="movePlayer(${lairX},${GAME.playerPos.y})"` : ''} ${tip([bossInfo.label, bossInfo.desc + (lairReach ? ' (clic para entrar)' : ' Se entra desde cualquier fila de la columna anterior.')])}>
        <div class="lair-title hand">Guarida del jefe</div>
        <div class="lair-boss">${art(bossInfo.sprite, bossInfo.icon, { size: 'xl' })}</div>
        <div class="lair-name">${actBossDef().name}</div>
        ${lairReach ? '<div class="lair-enter hand">¡Entrar!</div>' : ''}
    </div>`;

    // la ficha del jugador va aparte para poder animar el camino
    html += `<div class="player-token" id="player-token" style="left:${cellPos(GAME.playerPos.x)}px;top:${cellPos(GAME.playerPos.y)}px;width:${MAP_CELL}px;height:${MAP_CELL}px">
        <div class="token-shadow"></div>${fruitArt(char.id, { size: 'lg' })}
    </div>`;

    const legendRow = (sprite, icon, label, desc) =>
        `<li ${tip([label, desc])}>${art(sprite, icon, { size: 'md' })}<span>${label}</span></li>`;
    const boss = nodeInfo('boss');
    html += `</div></div>
        <aside class="map-legend panel">
            <h2 class="hand-title">Castillo ${act.n}</h2>
            <div class="legend-act hand">Piso ${act.floor}: ${act.name}</div>
            ${act.theme.rule ? `<div class="legend-rule" ${tip([`Regla: ${act.theme.rule.name}`, act.theme.rule.desc])}>${art(act.theme.rule.sprite, act.theme.rule.icon, { size: 'xs' })} ${act.theme.rule.name}</div>` : ''}
            <div class="legend-variant hand" ${tip(['Forma del mapa', 'Cada piso tiene una forma distinta: más o menos muros y ríos.'])}>Mapa ${variant.toLowerCase()} · ${cols - 1}×${rows}</div>
            <ul class="legend-list">
                ${legendRow(charSprite(char), char.icon, 'Tú', 'Tu fruta. Muévete con clic.')}
                ${['enemy', 'elite', 'rest', 'treasure', 'shop', 'mystery', 'game', 'key', 'vault'].map((t) => legendRow(NODE_INFO[t].sprite, NODE_INFO[t].icon, NODE_INFO[t].label, NODE_INFO[t].desc)).join('')}
                ${(() => { const b = nodeInfo('blocked'); return legendRow(b.sprite, b.icon, b.label, b.desc); })()}
                ${legendRow(boss.sprite, boss.icon, 'Jefe', boss.label)}
            </ul>
            <ul class="legend-list swatches">
                <li><span class="swatch reachable"></span><span>Puedes ir</span></li>
                <li><span class="swatch visited"></span><span>Ya pisaste</span></li>
                <li><span class="swatch wall"></span><span>Muro</span></li>
            </ul>
            <p class="legend-hint hand">Solo ➜ adelante, ⬆ arriba o ⬇ abajo, y nunca a una casilla ya pisada.</p>
            <button class="secondary" onclick="centerMapOnPlayer()">Centrar en mí</button>
        </aside>
    </div>`;
    return html;
}

function clampMapPan(pan, vp) {
    const { w, h } = mapBoardSize();
    const clampAxis = (v, view, size) => size <= view ? (view - size) / 2 : Math.min(0, Math.max(view - size, v));
    return { x: clampAxis(pan.x, vp.clientWidth, w), y: clampAxis(pan.y, vp.clientHeight, h) };
}
function applyMapPan() {
    const vp = document.getElementById('map-viewport');
    const board = document.getElementById('map-board');
    if (!vp || !board) return;
    GAME.mapPan = clampMapPan(GAME.mapPan, vp);
    board.style.transform = `translate(${GAME.mapPan.x}px, ${GAME.mapPan.y}px)`;
}
function centerMapOnPlayer() {
    const vp = document.getElementById('map-viewport');
    if (!vp) return;
    GAME.mapPan = {
        x: vp.clientWidth / 2 - (cellPos(GAME.playerPos.x) + MAP_CELL / 2),
        y: vp.clientHeight / 2 - (cellPos(GAME.playerPos.y) + MAP_CELL / 2)
    };
    applyMapPan();
}
window.centerMapOnPlayer = centerMapOnPlayer;
// Si la ficha quedó cerca del borde de la vista, se desliza el mapa
function keepPlayerInView() {
    const vp = document.getElementById('map-viewport');
    if (!vp || !GAME.mapPan) return;
    const margin = 40;
    const cx = cellPos(GAME.playerPos.x) + GAME.mapPan.x, cy = cellPos(GAME.playerPos.y) + GAME.mapPan.y;
    let { x, y } = GAME.mapPan;
    // se deja ver también la columna siguiente
    if (cx + MAP_CELL * 2 + MAP_GAP > vp.clientWidth - margin) x -= cx + MAP_CELL * 2 + MAP_GAP - (vp.clientWidth - margin);
    if (cx < margin) x += margin - cx;
    if (cy + MAP_CELL > vp.clientHeight - margin) y -= cy + MAP_CELL - (vp.clientHeight - margin);
    if (cy < margin) y += margin - cy;
    if (x !== GAME.mapPan.x || y !== GAME.mapPan.y) {
        GAME.mapPan = { x, y };
        const board = document.getElementById('map-board');
        board.classList.add('gliding');
        applyMapPan();
        setTimeout(() => board.classList.remove('gliding'), 450);
    }
}

// Arrastrar el mapa con el mouse (o el dedo). Si el puntero se movió
// más de unos píxeles, se cancela el clic para no mover al jugador.
function setupMapDrag() {
    const vp = document.getElementById('map-viewport');
    if (!vp) return;
    if (GAME.mapPan) { applyMapPan(); requestAnimationFrame(keepPlayerInView); } else centerMapOnPlayer();

    let drag = null;
    let suppressClick = false;
    vp.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: GAME.mapPan.x, py: GAME.mapPan.y, moved: false };
        suppressClick = false;
    });
    vp.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        // el lienzo está escalado: se convierte el movimiento a px del lienzo
        const dx = (e.clientX - drag.sx) / SCALE, dy = (e.clientY - drag.sy) / SCALE;
        if (!drag.moved && Math.hypot(dx, dy) > 5) {
            drag.moved = true;
            vp.classList.add('dragging');
            vp.setPointerCapture(e.pointerId);
            hideTip();
        }
        if (drag.moved) {
            GAME.mapPan = { x: drag.px + dx, y: drag.py + dy };
            applyMapPan();
        }
    });
    const endDrag = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        suppressClick = drag.moved;
        drag = null;
        vp.classList.remove('dragging');
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    vp.addEventListener('click', (e) => {
        if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
    }, true);
}

// ---------- COMBATE ----------
// Tooltip de un estado: si es mejora o perjuicio y qué hace exactamente.
// Sin cantidad (n) explica la regla general.
function statusTip(id, n) {
    const s = statusInfo(id);
    const kind = s.kind === 'debuff' ? '<i class="tip-kind debuff">perjuicio</i>' : '<i class="tip-kind buff">mejora</i>';
    const text = (n != null && s.desc) ? s.desc(n) : (s.help || '');
    return [`${s.name}${n != null && !s.noCount ? ` ${n}` : ''}`, `${kind} ${text}`];
}
function statusRow(entity) {
    const chips = Object.keys(entity.statuses).map((id) => {
        const n = entity.statuses[id];
        if (!n) return '';
        const s = statusInfo(id);
        return `<span class="status-chip st-${id} ${s.kind}" ${tip(statusTipsFull([[id, n]]))}>${art(s.sprite, s.icon, { size: 'sm' })}${s.noCount ? '' : `<b>${n}</b>`}</span>`;
    }).join('');
    return `<div class="status-row">${chips}</div>`;
}

// Intención del enemigo: qué hará en su turno, con el daño real calculado.
// tips: tooltip único que desglosa TODA la jugada (una sola burbuja, sin
// tooltips distintos por ícono). extras: íconos chicos con su cantidad,
// como el número del ataque, sin texto repetido en la descripción.
function intentInfo(c, e) {
    const m = e.nextMove || {};
    if (e.getStatus('frozen')) {
        return { label: '', cls: 'frozen', sprite: 'st_frozen', extras: [], tips: [statusTip('frozen')] };
    }
    const lines = [], extras = [], statusAmts = {};
    let label = '', cls = '', sprite = '';
    // El primer efecto define el ícono/color principal de la burbuja (con su
    // número como label); los siguientes se muestran como íconos + cantidad.
    const set = (c2, s2, l2, value) => {
        if (!cls) { cls = c2; sprite = s2; label = l2; } else if (value != null) extras.push({ sprite: s2, value });
    };
    const noteStatus = (id, n) => { statusAmts[id] = n; };
    if (m.damage) {
        const d = c.previewDamage(e, c.player, m.damage);
        const hits = m.hits || 1;
        set('attack', 'ui_sword', hits > 1 ? `${d}×${hits}` : `${d}`);
        lines.push(`Va a atacar${hits > 1 ? ` ${hits} veces` : ''}.`);
    }
    if (m.block) {
        const blk = e.getStatus('frail') ? Math.floor(m.block * 0.75) : m.block;
        set('defend', 'ui_shield', `${blk}`, blk);
        lines.push('Se pondrá cáscara.');
    }
    if (m.allyBlock) lines.push('Dará cáscara a sus aliados.');
    if (m.apply) {
        const ids = Object.keys(m.apply);
        ids.forEach((id) => { noteStatus(id, m.apply[id]); lines.push(`Te aplicará ${statusInfo(id).name}.`); set('debuff', statusInfo(id).sprite, `${m.apply[id]}`, m.apply[id]); });
    }
    if (m.self) {
        const ids = Object.keys(m.self);
        ids.forEach((id) => { noteStatus(id, m.self[id]); lines.push(`Ganará ${statusInfo(id).name}.`); set('buff', statusInfo(id).sprite, `${m.self[id]}`, m.self[id]); });
    }
    if (m.allies) {
        Object.keys(m.allies).forEach((id) => { noteStatus(id, m.allies[id]); lines.push(`Todos los enemigos ganarán ${statusInfo(id).name}.`); set('buff', statusInfo(id).sprite, `${m.allies[id]}`, m.allies[id]); });
    }
    if (m.heal) { set('heal', 'ui_heal', `+${m.heal}`, m.heal); lines.push('Recuperará vida.'); }
    if (m.stealGold) {
        set('debuff', 'ui_coin', `${m.stealGold}`, m.stealGold);
        lines.push('Te robará oro. Si lo derrotas, lo recuperas.');
    }
    if (m.stealCard) {
        set('debuff', 'st_thief', `${m.stealCard}`, m.stealCard);
        lines.push(`Te robará ${m.stealCard === 1 ? 'una carta' : `${m.stealCard} cartas`} de tu pila de robo. Si lo derrotas, las recuperas.`);
    }
    let addCardShown = null;
    if (m.addCard) {
        const card = window.getCard(m.addCard.id);
        const name = card ? card.name : 'una maldición';
        set('debuff', m.addCard.id, '', '');
        lines.push(`Meterá ${name} en tu mazo.`);
        addCardShown = card;
    }
    if (m.summon) {
        const names = m.summon.map((id) => (window.ENEMY_DB[id] || {}).name).filter(Boolean);
        set('summon', 'node_mystery', '', '');
        lines.push(`Llamará refuerzos: ${names.join(' y ')}.`);
    }
    const tips = [[m.name || 'Intención', lines.join(' ') || 'No se sabe qué hará.']];
    if (m.block || m.allyBlock) tips.push(...keywordTips('cáscara'));
    tips.push(...statusTipsFull(Object.keys(statusAmts).map((id) => [id, statusAmts[id]])));
    if (addCardShown) tips.push([addCardShown.name, `@card:${addCardShown.id}`]);
    return { label, cls: cls || 'buff', sprite: sprite || 'ui_up', extras: extras.slice(0, 3), tips };
}

// Naranja partida: un gajo por cada punto de energía. Los gastados
// se ponen grises; los recién gastados/recargados se animan.
function orangeHtml(energy, max) {
    const n = Math.max(energy, max, 1);
    const prev = GAME.lastEnergy == null ? energy : GAME.lastEnergy;
    GAME.lastEnergy = energy;
    const cx = 70, cy = 70, r = 50, gap = n > 1 ? 5 : 0;
    const pt = (deg, rad) => [cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180)];
    let wedges = '';
    for (let i = 0; i < n; i++) {
        const a0 = -90 + (360 / n) * i + gap / 2, a1 = -90 + (360 / n) * (i + 1) - gap / 2;
        const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
        const large = a1 - a0 > 180 ? 1 : 0;
        const full = i < energy;
        let cls = full ? 'wedge full' : 'wedge spent';
        if (!full && i < prev) cls += ' just-spent';
        if (full && i >= prev) cls += ' just-filled';
        const d = n === 1
            ? `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
            : `M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
        wedges += `<path class="${cls}" style="--i:${i}" d="${d}"/>`;
    }
    return `
    <div class="energy-orange" ${tip([`Energía ${energy}/${max}`, KW_TEXT.energy])}>
        <svg viewBox="0 0 140 140" class="orange-svg">
            <circle cx="70" cy="70" r="64" class="peel"/>
            <circle cx="70" cy="70" r="56" class="pith"/>
            ${wedges}
            <circle cx="70" cy="70" r="9" class="pith-core"/>
        </svg>
        <div class="energy-count"><b>${energy}</b><small>/${max}</small></div>
    </div>`;
}

function pileHtml(which, count) {
    const tips = {
        draw: ['Pila de robo', `${count} cartas por robar. Cuando se acabe, la pila de descarte se baraja aquí. Clic para verlas.`],
        discard: ['Pila de descarte', `${count} cartas usadas. Clic para verlas.`],
        exhaust: ['Compost', `${count} cartas consumidas en este combate. Clic para verlas.`]
    };
    const labels = { draw: 'robo', discard: 'descarte', exhaust: 'compost' };
    const backs = Math.min(3, Math.max(1, Math.ceil(count / 4)));
    return `
    <div class="pile ${which} ${count ? '' : 'empty'}" id="pile-${which}" onclick="openPile('${which}')" ${tip(tips[which])}>
        <div class="pile-stack">${count ? '<span class="card-back"></span>'.repeat(backs) : '<span class="card-ghost"></span>'}</div>
        <span class="pile-count">${count}</span>
        <span class="pile-label hand">${labels[which]}</span>
    </div>`;
}

// ---------- fondo de la regla del piso ----------
// Cada regla pinta una capa detrás de la pelea que cambia con su ciclo de
// turnos (p. ej. la Oscuridad apaga la luz en los turnos impares). La clase
// "rs-in" solo se pone cuando el estado cambia, para que la transición no se
// repita en cada redibujo.
function ruleFxFor(c) {
    const none = { cls: '', html: '' };
    if (!c || !c.rule || !c.rule.sprite) return none;
    const id = c.rule.sprite.replace(/^rule_/, '');
    const t = c.turnNumber;
    const n = (k, cls) => Array.from({ length: k }, (_, i) => `<i class="${cls || ''}" style="--i:${i}"></i>`).join('');
    let state = 'on', html = '';
    switch (id) {
        case 'bodega':
            state = t % 2 === 1 ? 'dark' : 'lit';
            html = `<div class="rf-bulb"><span class="cord"></span><span class="glass"></span><span class="glow"></span></div><div class="rf-eyes">${n(5)}</div><div class="rf-motes">${n(10)}</div>`;
            break;
        case 'huerto':
            state = `sun${((t - 1) % 3) + 1}`;
            html = `<div class="rf-sun"><b></b>${n(12, 'ray')}</div><div class="rf-sunbeam"></div>`;
            break;
        case 'gallinero':
            html = `<div class="rf-feathers">${n(9)}</div><div class="rf-straw"></div>`;
            break;
        case 'estanque':
            html = `<div class="rf-water"><span></span><span></span></div><div class="rf-bubbles">${n(10)}</div>`;
            break;
        case 'invernadero':
            html = `<div class="rf-glass"></div><div class="rf-leaves">${n(9)}</div>`;
            break;
        case 'dados':
            html = `<div class="rf-felt dice">${n(8)}</div>`;
            break;
        case 'poker':
            html = `<div class="rf-felt suits">${n(8)}</div>`;
            break;
        case 'ajedrez':
            state = t % 2 === 1 ? 'white' : 'black';
            html = '<div class="rf-board"></div>';
            break;
        case 'mercado':
            state = t % 2 === 0 ? 'thief' : 'calm';
            html = `<div class="rf-lanterns">${n(6)}</div><div class="rf-shadow-hands">${n(3)}</div>`;
            break;
        case 'cocina': {
            const h = c.player.hand.length;
            state = h >= 6 ? 'hot2' : h >= 3 ? 'hot1' : 'calm';
            html = `<div class="rf-heat"></div><div class="rf-flames">${n(14)}</div>`;
            break;
        }
        case 'fabrica':
            state = t % 3 === 0 ? 'zap' : t % 3 === 2 ? 'charging' : 'idle';
            html = `<div class="rf-pipes"></div><div class="rf-sparks">${n(8)}</div><div class="rf-bolt"></div>`;
            break;
        case 'torre_rey':
            html = `<div class="rf-banners">${n(4)}</div><div class="rf-glitter">${n(12)}</div>`;
            break;
        default:
            return none;
    }
    const key = id + ':' + state;
    const changed = GAME.ruleFxKey !== key;
    GAME.ruleFxKey = key;
    return { cls: `rule-${id} rs-${state}${changed ? ' rs-in' : ''}`, html: `<div class="rule-fx">${html}</div>` };
}

function renderCombat() {
    const c = GAME.combat;
    if (!c) return '';
    const p = c.player;
    const char = window.CHARACTER_DB[p.characterId] || {};
    const pSprite = charSprite(char);
    const playerTurn = c.turn === 'player' && !c.ended;
    const ruleFx = ruleFxFor(c);
    const multi = c.enemies.length > 1;

    const n = p.hand.length;
    const cardW = 176, avail = 900;
    const overlap = n > 1 ? Math.min(-10, (avail - n * cardW) / (n - 1)) : 0;
    const handHtml = p.hand.map((cardId, i) => {
        const card = window.getCard(cardId);
        const disabled = card.unplayable || card.cost > p.energy || !playerTurn;
        const off = i - (n - 1) / 2;
        return `<div class="fan-slot ${GAME.dealIn ? 'deal-in' : ''} ${GAME.selectedCard === i ? 'selected' : ''}" data-flip="h${i}" ${card.retain ? 'data-retain="1"' : ''} style="--r:${(off * 3.5).toFixed(1)}deg;--y:${(off * off * 3.5).toFixed(1)}px;--i:${i};--ov:${overlap.toFixed(0)}px">
            ${renderCardHtml(card, { onclick: `selectCard(${i})`, disabled, alwaysClick: playerTurn, preview: card.unplayable ? null : c.previewCard(card, null) })}
        </div>`;
    }).join('');

    const blockHits = pendingBlockHits();
    const blockBadge = (ent, side) => {
        const hit = blockHits[side];
        const shown = ent.block + (hit ? hit.blocked : 0);
        if (shown <= 0) return '';
        const drain = hit ? `data-from="${shown}" data-block-to="${ent.block}"` : '';
        return `<div class="combat-block-badge" ${drain} ${tip([`Cáscara ${ent.block}`, KW_TEXT.block])}>${art('ui_shield', '🛡️', { size: 'sm' })}<b>${shown}</b></div>`;
    };

    const now = performance.now();
    const enemiesHtml = c.enemies.map((e, i) => {
        const eSprite = enemySprite(e);
        const classes = ['combatant', 'enemy', `idle-${e.def.idle || 'float'}`];
        if (e.def.tier === 'boss') classes.push('boss');
        if (e.def.tier === 'elite') classes.push('elite');
        let style = `--off:${(-i * 0.9).toFixed(1)}s;--blink:${(i * 1.7 + 0.8).toFixed(1)}s`;
        if (!e.isAlive()) {
            // al caer se anima una vez; si se redibuja a medio camino, sigue donde iba
            if (GAME.dyingAt[i] == null) { GAME.dyingAt[i] = now; if (window.Sfx) Sfx.enemyDeath(); }
            const t = now - GAME.dyingAt[i];
            classes.push(t < 1000 ? 'dying' : 'dead');
            style += `;--dd:${-t.toFixed(0)}ms`;
        } else {
            delete GAME.dyingAt[i];
            // enemigos recién invocados caen desde arriba
            if (!GAME.seenEnemies.has(e)) {
                GAME.seenEnemies.add(e);
                if (!GAME.combatEnter) classes.push('spawning');
            }
            if (GAME.lastPhase[i] != null && GAME.lastPhase[i] !== e.phase) classes.push('phase-change');
            GAME.lastPhase[i] = e.phase;
            if (e.getStatus('frozen')) classes.push('is-frozen');
        }
        const intent = intentInfo(c, e);
        const hidden = !!(c.rule && c.rule.hideIntent && c.turnNumber % 2 === 1);
        const acting = !playerTurn && GAME.actingEnemy === i;
        const aim = GAME.seedTargeting != null && e.isAlive();
        if (aim) classes.push('seed-aim');
        return `
            <div class="${classes.join(' ')}" id="enemy-${i}" style="${style}" ${aim ? `onclick="useSeedOn(${i})"` : ''}>
                ${e.isAlive() && hidden ? `<div class="intent-bubble unknown ${acting ? 'acting' : ''}" ${tip([c.rule.name, 'Está muy oscuro: en los turnos impares no ves lo que hará el enemigo.'])}><span>?</span></div>` : ''}
                ${e.isAlive() && !hidden ? `<div class="intent-bubble ${intent.cls} ${acting ? 'acting' : ''}" ${tip(intent.tips)}>
                    ${art(intent.sprite, '❔', { size: 'sm' })}
                    ${intent.label ? `<span>${intent.label}</span>` : ''}
                    ${intent.extras.map((x) => `<i class="intent-extra">${art(x.sprite, '✨', { size: 'sm' })}${x.value ? `<b>${x.value}</b>` : ''}</i>`).join('')}
                </div>` : ''}
                <div class="portrait" id="portrait-enemy-${i}" data-sprite="${eSprite}" data-fallback="${e.def.icon}"><div class="hit-layer"><div class="idle">${art(eSprite, e.def.icon, { size: 'xl' })}</div></div></div>
                <div class="plate">
                    <div class="name-tag">${enemyName(e)}${e.def.tier === 'boss' ? ' ♛' : e.def.tier === 'elite' ? ' 🔥' : ''}</div>
                    <div class="bar-wrap">${blockBadge(e, `enemy-${i}`)}${hpBar(e, `enemy-${i}`)}</div>
                    ${statusRow(e)}
                </div>
            </div>`;
    }).join('');

    const act = currentAct();
    return `
    <div class="combat-stage act-${act.n} bg-${GAME.combatBg || 'kitchen'} ${GAME.combatEnter ? 'entering' : ''} ${playerTurn ? 'is-player-turn' : 'is-enemy-turn'} ${ruleFx.cls}">
        ${ruleFx.html}
        ${GAME.seedTargeting != null && window.SEED_DB[p.seeds[GAME.seedTargeting]] ? `<div class="seed-aim-banner">${seedArt(window.SEED_DB[p.seeds[GAME.seedTargeting]], 'sm')}<span class="hand">Toca al enemigo para usar <b>${window.SEED_DB[p.seeds[GAME.seedTargeting]].name}</b></span><button class="secondary" onclick="event.stopPropagation(); cancelSeedAim()">Cancelar</button></div>` : ''}
        ${c.rule ? `<div class="rule-chip" ${tip([`Regla del piso: ${c.rule.name}`, c.rule.desc])}>${art(c.rule.sprite, c.rule.icon, { size: 'sm' })} ${c.rule.name}</div>` : ''}
        <div class="arena ${multi ? 'multi' : ''}">
            <div class="combatant player" style="--blink:2.3s">
                ${p.characterId === 'uva' || (p.garden && p.garden.length) ? gardenHtml(p) : ''}
                <div class="portrait" id="portrait-player" data-sprite="${pSprite}" data-char="${char.id}" data-fallback="${char.icon || '🍎'}"><div class="hit-layer"><div class="idle">${fruitArt(char.id, { size: 'xl', hurtStage: hurtStageFor(p.hp, p.maxHp) })}</div></div></div>
                <div class="plate">
                    <div class="name-tag">${p.name || char.name || 'Fruta'}</div>
                    <div class="bar-wrap">${blockBadge(p, 'player')}${hpBar(p, 'player')}</div>
                    ${statusRow(p)}
                </div>
            </div>
            <div class="versus hand">vs</div>
            <div class="enemy-side">${enemiesHtml}</div>
        </div>

        <div class="combat-bottom">
            <div class="bottom-side left">
                ${orangeHtml(p.energy, p.maxEnergy)}
                ${pileHtml('draw', p.drawPile.length)}
            </div>
            <div class="hand-row">${handHtml || '<span class="hand empty-hand">…</span>'}</div>
            <div class="bottom-side right">
                <div class="piles-right">${pileHtml('exhaust', p.exhaustPile.length)}${pileHtml('discard', p.discardPile.length)}</div>
                <button class="end-turn" onclick="endTurn()" ${playerTurn ? '' : 'disabled'}>Terminar turno</button>
                <span class="hand turn-note">turno ${c.turnNumber}</span>
            </div>
        </div>
    </div>`;
}

// Viñedo de la Uva: 3 surcos con sus brotes y los turnos que les faltan
function gardenHtml(p) {
    const garden = p.garden || [];
    let slots = '';
    for (let i = 0; i < window.GARDEN_SIZE; i++) {
        const s = garden[i];
        if (!s) { slots += `<div class="garden-slot empty" ${tip(['Surco libre', 'Aquí se puede plantar un brote.'])}></div>`; continue; }
        const d = window.SPROUT_DB[s.type];
        const when = s.timer === 1 ? 'En 1 turno' : `En ${s.timer} turnos`;
        slots += `<div class="garden-slot ${s.fresh ? 'fresh' : ''} ${s.timer === 1 ? 'ready' : ''}" ${tip([[d.name, `${when}, ${d.effect}`], ...keywordTips(d.effect, d.name)])}>
            ${art(d.sprite, d.icon, { size: 'sm' })}<b>${s.timer}</b></div>`;
        s.fresh = false;
    }
    return `<div class="garden" ${tip(['Viñedo', 'Tus cartas plantan brotes aquí. Cada turno crecen 1 y, al llegar a 0, se cosechan solos. Si los 3 surcos están llenos, plantar cosecha el más viejo.'])}>${slots}</div>`;
}

// Qué tan magullada se ve una fruta según cuánta vida le queda: 0 sana,
// 1 raspada, 2 bastante golpeada, 3 hecha pomada (con curita).
function hurtStageFor(hp, maxHp) {
    if (!maxHp) return 0;
    const pct = hp / maxHp;
    if (pct <= 0.15) return 3;
    if (pct <= 0.4) return 2;
    if (pct <= 0.7) return 1;
    return 0;
}
// ---------- VESTIDOR ----------
// La fruta dibujada con su color y accesorios puestos.
// opts.override cambia lo puesto solo para este dibujo (vista previa).
function fruitArt(charId, opts) {
    opts = opts || {};
    const c = window.CHARACTER_DB[charId] || {};
    return art(charSprite(c), c.icon, Object.assign({}, window.dressOptions(charId, opts.override), opts));
}
// Ícono de un cosmético: la fruta con ese color, o el accesorio solo
function cosmeticIcon(c, size, locked) {
    if (c.type === 'skin') return fruitArt(c.char, { size, override: { skin: c.id, head: null, face: null, neck: null, pet: null } });
    // la mascotita cabe entera en el ícono (con su tallito y el saltito); bloqueada no salta
    if (c.type === 'pet') return `<span class="art art-${size}"><svg class="sprite pet-icon" viewBox="0 0 100 100"><g transform="translate(50 61) scale(1.95)"><g class="${locked ? '' : 'pet-hop'}">${c.draw()}</g></g></svg></span>`;
    // cada ranura se centra distinto para que el accesorio quepa en el ícono
    const [y, sc] = { head: [64, 1.6], face: [40, 2.2], neck: [38, 2.1] }[c.slot];
    return `<span class="art art-${size}"><svg class="sprite" viewBox="0 0 100 100"><g transform="translate(50 ${y}) scale(${sc})">${c.draw()}</g></svg></span>`;
}
function cosmeticLabel(c) {
    if (c.type === 'skin') return `color para ${window.CHARACTER_DB[c.char].name}`;
    if (c.type === 'pet') return `mascotita de ${window.CHARACTER_DB[c.char].name}: ${c.bonus}`;
    return `accesorio de ${window.COSMETIC_SLOTS[c.slot].toLowerCase()}${c.char ? ` para ${window.CHARACTER_DB[c.char].name}` : ''}`;
}
// Aviso de mascotitas desbloqueadas con su reto
function petUnlockBox() {
    return (GAME.newPets || []).map((c) => {
        const on = window.equippedFor(c.char).pet === c.id;
        return `<div class="cosmetic-box pet-unlock">
            ${cosmeticIcon(c, 'lg')}
            <div class="cosmetic-text"><b>¡Mascotita desbloqueada!</b><span>${c.name}: ${c.bonus}</span></div>
            ${on ? '<span class="hand">¡Ya te acompaña!</span>' : `<button class="btn-mint" onclick="wearNewPet('${c.id}')">Llevarla</button>`}
        </div>`;
    }).join('');
}
// Aviso de premio para el vestidor (recompensas, tesoro, regalo)
function cosmeticBox(c) {
    if (!c) return '';
    return `<div class="cosmetic-box">
        ${cosmeticIcon(c, 'lg')}
        <div class="cosmetic-text"><b>¡Nuevo para tu vestidor!</b><span>${c.name} · ${cosmeticLabel(c)}</span></div>
        ${c.worn ? '' : `<button class="btn-mint" onclick="wearNewCosmetic()">¡Ponérmelo!</button>`}
    </div>`;
}

function renderWardrobe() {
    const chars = Object.values(window.CHARACTER_DB);
    const cid = GAME.wardrobeChar in window.CHARACTER_DB ? GAME.wardrobeChar : chars[0].id;
    const ch = window.CHARACTER_DB[cid];
    const eq = window.equippedFor(cid);
    const skins = window.COSMETICS.filter((c) => c.type === 'skin' && c.char === cid);
    const currentSkin = eq.skin || skins[0].id;
    const item = (c) => {
        const owned = window.isCosmeticOwned(c.id);
        const on = c.type === 'skin' ? currentSkin === c.id : eq[c.slot] === c.id;
        const text = (c.type === 'pet' ? `${c.bonus} ` : '') + (!owned ? (c.type === 'pet' ? `Bloqueada. Para desbloquearla: ${window.petHowText(c)}` : 'Aún no lo tienes. Se gana subiendo de nivel en el Pase de Batalla (menú principal).')
            : on ? (c.type === 'skin' ? 'Es el color que lleva puesto.' : c.type === 'pet' ? 'Te acompaña. Toca para dejarla en casa.' : 'Lo lleva puesto. Toca para quitarlo.') : c.type === 'pet' ? 'Toca para llevarla contigo.' : 'Toca para ponérselo.');
        return `<button class="ward-item ${owned ? '' : 'locked'} ${on ? 'on' : ''}" onclick="wardrobeEquip('${c.id}')" ${tip([owned || c.type === 'pet' ? c.name : '???', text])}>
            ${owned ? cosmeticIcon(c, 'md') : c.type === 'pet' ? `<span class="pet-locked">${cosmeticIcon(c, 'md', true)}<i>${art('ui_lock', '', { size: 'xs' })}</i></span>` : '<span class="ward-q">?</span>'}<small>${owned || c.type === 'pet' ? c.name : '???'}</small></button>`;
    };
    const slotRow = (slot) => {
        const items = window.COSMETICS.filter((c) => c.slot === slot && (!c.char || c.char === cid));
        return `<div class="ward-section"><h3 class="hand">${window.COSMETIC_SLOTS[slot]}</h3><div class="ward-grid">
            <button class="ward-item none ${eq[slot] ? '' : 'on'}" onclick="wardrobeClear('${slot}')" ${tip(['Nada', slot === 'pet' ? 'Sin mascotita.' : 'Sin accesorio en esta parte.'])}><span class="ward-q">✕</span><small>Nada</small></button>
            ${items.map(item).join('')}</div></div>`;
    };
    return `
    <div class="wardrobe">
        <div class="wardrobe-left panel">
            <h1 class="hand-title">Vestidor</h1>
            <div class="ward-tabs">${chars.map((c) => `<button class="ward-tab ${c.id === cid ? 'on' : ''}" onclick="wardrobeSelect('${c.id}')" ${tip([c.name, 'Ver y vestir a esta fruta.'])}>${fruitArt(c.id, { size: 'md' })}</button>`).join('')}</div>
            <div class="wardrobe-preview">${fruitArt(cid, { size: 'xxl' })}</div>
            <div class="hand ward-name">${ch.name}</div>
            <div class="ward-count">${window.ownedCosmeticCount()} de ${window.COSMETICS.length} conseguidos</div>
            <p class="ward-hint">Cada mascotita da una pequeña ayuda en los combates y se desbloquea con un reto difícil (pasa el mouse encima para verlo). Los colores y accesorios se ganan en el 🏆 Pase de Batalla: cada enemigo que derrotas te da experiencia.</p>
            <button class="secondary" onclick="backToMenu()">${backLabel()}</button>
        </div>
        <div class="wardrobe-right panel">
            <div class="ward-section"><h3 class="hand">Colores</h3><div class="ward-grid">${skins.map(item).join('')}</div></div>
            ${slotRow('pet')}
            ${['head', 'face', 'neck'].map(slotRow).join('')}
        </div>
    </div>`;
}

function renderGift() {
    const c = GAME.newCosmetic;
    return panel(art('node_gift', '🎁', { size: 'xl' }), '¡Un regalo!', `
        ${c ? `<p>Dentro había algo para tu vestidor.</p>${cosmeticBox(c)}` : '<p>¡Ya tienes todo el vestidor! Dentro había 40 de oro.</p>'}
        <button onclick="closeEventResult()">Continuar</button>`, 'celebrate gift-panel');
}

function renderWell() {
    const p = GAME.player;
    const cost = wellCost();
    return panel(art('node_well', '🪙', { size: 'xl' }), 'Pozo de los Deseos', `
        <p>Tira una moneda y pide un deseo. Cada vez cuesta más oro… pero puedes parar cuando quieras.</p>
        ${GAME.wellLastMsg ? `<p class="hand well-msg">${GAME.wellLastMsg}</p>` : ''}
        <div class="controls-row">
            <button class="btn-mint" onclick="tossWellCoin()" ${p.gold < cost ? 'disabled' : ''}>Tirar moneda (${art('ui_coin', '🪙', { size: 'xs' })}${cost})</button>
            <button class="secondary" onclick="leaveWell()">Irme</button>
        </div>`);
}

function renderKeyFound() {
    return panel(art('node_key', '🗝️', { size: 'xl' }), '¡Llave Dorada!', `
        <p>Encuentras una llave brillante. Parece saber a dónde ir… más adelante en este nivel debe haber algo que abrir.</p>
        <button onclick="closeEventResult()">Continuar</button>`, 'celebrate');
}

function renderVault() {
    return panel(art('node_vault', '🔒', { size: 'xl' }), GAME.vaultOpened ? '¡Cofre Sellado abierto!' : 'Cofre Sellado', `
        <p>${GAME.lastEventMsg}</p>
        <button onclick="closeEventResult()">Continuar</button>`, GAME.vaultOpened ? 'celebrate' : '');
}

function renderDungeon() {
    const d = GAME.dungeon;
    const char = window.CHARACTER_DB[GAME.player.characterId] || {};
    let cells = '';
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const isPlayer = d.pos.x === x && d.pos.y === y;
            const isExit = d.exit.x === x && d.exit.y === y;
            const cleared = d.cleared[y][x];
            const adj = !isPlayer && Math.abs(x - d.pos.x) + Math.abs(y - d.pos.y) === 1;
            const cls = ['dg-cell', cleared ? 'cleared' : 'locked', isPlayer ? 'here' : '', isExit ? 'exit' : '', adj ? 'reachable' : '']
                .filter(Boolean).join(' ');
            // tu fruta (no un corazón) en la casilla donde estás; la escalera marca la salida
            let icon;
            if (isPlayer) icon = fruitArt(char.id, { size: 'md' });
            else if (isExit) icon = art('node_stairs', '🪜', { size: 'md' });
            else if (cleared) icon = art('dg_bones', '', { size: 'md', cls: 'dg-bones' });
            else icon = art(((d.deco + x * 3 + y) % 3 === 0) ? 'dg_ghost' : 'dg_skull', '💀', { size: 'md' });
            const guard = isExit && !cleared ? `<i class="dg-guard">${art('dg_skull', '💀', { size: 'xs' })}</i>` : '';
            const label = isPlayer ? 'Estás aquí' : isExit ? (cleared ? 'La escalera (despejada)' : 'La escalera de salida: la vigila un guardián') : cleared ? 'Ya despejada' : 'Algo se mueve en la oscuridad…';
            cells += `<div class="${cls}" ${adj ? `onclick="enterDungeonCell(${x},${y})"` : ''} ${tip([label, adj ? 'Toca para entrar (¡habrá pelea!)' : ''])}>${icon}${guard}</div>`;
        }
    }
    const corner = (cls, sprite, fb) => `<span class="dg-deco ${cls}">${art(sprite, fb, { size: 'md' })}</span>`;
    return panel(art('dg_skull', '💀', { size: 'xl' }), 'Calabozo de la Trampilla', `
        <p>Caíste por la trampilla a un calabozo húmedo y oscuro. Algo se arrastra entre las sombras… Ábrete paso a golpes hasta la <b>escalera</b> de arriba.</p>
        <div class="dg-room">
            ${corner('tl', 'dg_torch', '🔥')}${corner('tr', 'dg_torch', '🔥')}
            ${corner('bl', 'dg_web', '🕸️')}${corner('br', 'dg_web', '🕸️')}
            ${corner('chain-l', 'dg_chain', '⛓️')}${corner('chain-r', 'dg_chain', '⛓️')}
            <div class="dg-grid">${cells}</div>
            <div class="dg-fog"></div>
        </div>
        <p class="dg-hint hand">Tú: abajo · Salida: la escalera, arriba</p>`, 'wide dungeon-panel');
}

// ---------- PANELES ----------
function panel(spriteHtml, title, body, extraCls) {
    return `
    <div class="panel ${extraCls || ''}">
        ${spriteHtml ? `<div class="panel-art">${spriteHtml}</div>` : ''}
        <h2 class="hand-title">${title}</h2>
        ${body}
    </div>`;
}
function playerArt(mood) {
    const p = GAME.player;
    const char = window.CHARACTER_DB[p.characterId] || {};
    return fruitArt(char.id, { size: 'xl', mood, hurtStage: hurtStageFor(p.hp, p.maxHp) });
}
function relicCardHtml(relic, onclick, extra) {
    return `<div class="relic-card ${relic.tier === 'boss' ? 'boss' : ''}" ${onclick ? `onclick="${onclick}"` : ''} ${explainRelic(relic)}>
        ${art(relic.sprite || relic.id, relic.icon, { size: 'lg' })}
        <div class="card-name">${relic.name}</div>
        <div class="relic-desc">${relic.description}</div>
        ${relic.ref && window.refBoxHtml ? refBoxHtml(relic, 'sm') : ''}
        ${extra || ''}
    </div>`;
}

// El oro ganado sube en la barra de arriba: "+N" flotando y el número contando
function animateGoldGain() {
    const gain = GAME.goldGain;
    GAME.goldGain = null;
    const chip = document.querySelector('.hud-chip.gold');
    const num = chip && chip.querySelector('b');
    if (!num || !GAME.player) return;
    const to = GAME.player.gold, from = Math.max(0, to - gain);
    num.textContent = from;
    const pop = document.createElement('span');
    pop.className = 'gold-gain';
    pop.textContent = '+' + gain;
    chip.appendChild(pop);
    const t0 = performance.now() + 350, dur = 700;
    const step = (t) => {
        if (!num.isConnected) return;
        const k = Math.min(1, Math.max(0, (t - t0) / dur));
        num.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
        else { restartClass(chip, 'earn'); if (window.Sfx && Sfx.coin) Sfx.coin(); }
    };
    requestAnimationFrame(step);
    setTimeout(() => pop.remove(), 1600);
}

function renderReward() {
    const cardsHtml = GAME.rewardCards.map((c) => renderCardHtml(c, { onclick: `pickRewardCard('${c.id}', this)` })).join('');
    const kind = GAME.combatKind;
    const title = kind === 'boss' ? '¡Jefe derrotado!' : kind === 'elite' ? '¡Élite derrotada!' : '¡Victoria!';
    const relic = GAME.rewardRelic;
    return panel(playerArt('happy'), title, `
        <div class="reward-scroll">
            ${petUnlockBox()}
            ${window.passGainBox ? passGainBox() : ''}
            ${seedRewardBox()}
            ${cosmeticBox(GAME.newCosmetic)}
            ${relic ? `<div class="reward-relic" ${explainRelic(relic)}>${art(relic.sprite || relic.id, relic.icon, { size: 'md' })}<div><b>${relic.name}</b><span>${relic.description}</span></div></div>` : ''}
            <div class="reward-row">${cardsHtml}</div>
        </div>
        ${GAME.rewardCards.length ? '' : '<button class="secondary" onclick="skipReward()">Continuar</button>'}`, 'celebrate wide');
}

function renderBossRelic() {
    const choices = GAME.bossRelicChoices;
    return panel(art('semilla_dorada', '✨', { size: 'xl' }), 'Objeto de jefe', `
        <p>El jefe dejó caer algo brillante. Elige <b>un</b> objeto: son poderosos, pero algunos tienen truco.</p>
        <div class="boss-relic-row">
            ${choices.map((r) => relicCardHtml(r, `pickBossRelic('${r.id}', this)`)).join('') || '<p class="hand empty-note">…no quedan objetos de jefe</p>'}
        </div>
        <button class="secondary" onclick="skipBossRelic()">Omitir</button>`, 'celebrate wide');
}

// Las frutas rescatadas (las 4 jugables y las mascotitas) saltando junto al Rey Fruta
function rescueRowHtml() {
    const fruits = Object.keys(window.CHARACTER_DB).map((id) => art(id, '', { size: 'md' }));
    const pets = window.COSMETICS.filter((c) => c.type === 'pet').slice(0, 6).map((c) => `<span class="art art-md"><svg class="sprite" viewBox="0 0 100 100"><g transform="translate(50 61) scale(1.95)">${c.draw()}</g></svg></span>`);
    const all = [...fruits.slice(0, 2), ...pets.slice(0, 3), art('rey_fruta', '', { size: 'lg' }), ...pets.slice(3), ...fruits.slice(2)];
    return all.map((h, i) => `<span class="${h.includes('art-lg') ? 'king' : ''}" style="--i:${i}">${h}</span>`).join('');
}
function renderVictory() {
    const p = GAME.player;
    const boss = window.ENEMY_DB[GAME.lastBossId] || actBossDef();
    return panel(playerArt('happy'), `¡Derrotaste a ${boss.name}!`, `
        <div class="rescue-row">${rescueRowHtml()}</div>
        <p>Subiste los 3 castillos y liberaste al <b>Rey Fruta</b> y a todas las frutas cautivas. ¡El reino de las frutas vuelve a ser libre!</p>
        ${GAME.unlockMsg ? `<p class="unlock-msg hand">🔓 ${GAME.unlockMsg}</p>` : ''}
        ${petUnlockBox()}
        <p class="hand victory-stats">Grado: <b>${difficulty().name}</b> · ${p.deck.length} cartas · ${p.relics.length} objetos · ${p.hp}/${p.maxHp} ❤️</p>
        <button onclick="showMainMenu()">Volver al menú</button>`, 'celebrate');
}

function renderGameOver() {
    const p = GAME.player;
    return panel(playerArt('hurt'), 'Game over…', `
        <p>Tu fruta cayó en el castillo ${p.act}, piso ${currentFloorNo()} (${currentAct().name}) con ${p.relics.length} objetos y ${p.gold} de oro.</p>
        ${window.passGainBox ? passGainBox() : ''}
        <button onclick="showMainMenu()">Volver al menú</button>`, 'sad');
}

// Grilla de cartas del mazo para madurar o quitar (cada copia aparte)
function deckPicker(mode, onPick) {
    const deck = GAME.player.deck;
    let list = deck.map((id, i) => ({ i, card: window.getCard(id) })).filter((x) => x.card);
    if (mode === 'upgrade') list = list.filter((x) => x.card.canUpgrade);
    sortCards(list);
    if (!list.length) return '<p class="hand empty-note">…no hay cartas que puedas elegir</p>';
    return `<div class="reward-row scroll picker">
        ${list.map(({ i, card }) => {
            const shown = mode === 'upgrade' ? window.getCard(`${card.id}+`) : card;
            return renderCardHtml(shown, { onclick: `${onPick}(${i}, this)` });
        }).join('')}
    </div>`;
}

function renderRest() {
    const heal = restHealAmount();
    const rest = canRest();
    const mode = GAME.restMode;
    if (mode) {
        const isUp = mode === 'upgrade';
        return panel(art(isUp ? 'rayito_sol' : 'node_rest', '🏕️', { size: 'xl' }), isUp ? 'Madurar una carta' : 'Despegar una carta', `
            <p>${isUp ? 'Elige qué carta madurar: así se verá después.' : 'Elige qué carta quitar de tu mazo para siempre.'}</p>
            ${deckPicker(mode, isUp ? 'restUpgradeCard' : 'restRemoveCard')}
            <button class="secondary" onclick="setRestMode(null)">Volver</button>`, 'wide');
    }
    return panel(art('node_rest', '🏕️', { size: 'xl' }), 'Campamento', `
        <p>El fuego chisporrotea. Elige <b>una</b> cosa para hacer antes de seguir.</p>
        <div class="rest-options">
            <button class="rest-option" ${rest ? '' : 'disabled'} onclick="restHeal()" ${rest ? '' : tip(['No puedes descansar', 'Tu Corazón de Durián no te deja dormir.'])}>
                ${art('ui_heal', '❤️', { size: 'lg' })}<b>Descansar</b><span>Recuperas ${heal} ❤️</span>
            </button>
            <button class="rest-option btn-mint" onclick="setRestMode('upgrade')">
                ${art('rayito_sol', '🌞', { size: 'lg' })}<b>Madurar</b><span>Mejora una carta para siempre</span>
            </button>
            <button class="rest-option btn-grape" onclick="setRestMode('remove')">
                ${art('compostar', '🪱', { size: 'lg' })}<b>Despegar</b><span>Quita una carta de tu mazo</span>
            </button>
        </div>
        <button class="secondary" onclick="leaveRest()">Seguir sin hacer nada</button>`, 'wide');
}

function renderTreasure() {
    const r = GAME.lastRelic;
    return panel(r ? art(r.sprite || r.id, r.icon, { size: 'xl' }) : art('node_treasure', '💎', { size: 'xl' }), 'Tesoro', `
        <p>${GAME.lastEventMsg}</p>
        ${cosmeticBox(GAME.newCosmetic)}
        <button onclick="closeEventResult()">Continuar</button>`, 'celebrate');
}

function renderShop() {
    const s = GAME.shopStock;
    const gold = GAME.player.gold;
    if (GAME.restMode === 'remove') {
        return panel(art('compostar', '🪱', { size: 'xl' }), 'Quitar una carta', `
            <p>El tendero se la lleva por ${art('ui_coin', '🪙', { size: 'xs' })} <b>${removalPrice()}</b> de oro. Elige cuál:</p>
            ${deckPicker('remove', 'shopRemoveCard')}
            <button class="secondary" onclick="closeShopPicker()">Volver</button>`, 'wide');
    }
    const priceTag = (price, sale) => `<div class="price-tag ${sale ? 'sale' : ''}">${art('ui_coin', '🪙', { size: 'xs' })}${price}${sale ? '<small>¡oferta!</small>' : ''}</div>`;
    const empty = !s.cards.length && !s.relics.length && !(s.seeds || []).length;
    const rp = removalPrice();
    return panel(art('node_shop', '🏪', { size: 'xl' }), 'Tiendita', `
        <p>Tienes ${art('ui_coin', '🪙', { size: 'xs' })} <b>${gold}</b> de oro. Toca lo que quieras comprar.</p>
        <div class="shop-row">
            ${s.cards.map((i, k) => `
            <div class="shop-item ${gold < i.price ? 'pricey' : ''}" data-flip="s-${i.card.id}">
                ${renderCardHtml(i.card, { onclick: `buyShopCard(${k}, this)` })}
                ${priceTag(i.price, i.sale)}
            </div>`).join('')}
        </div>
        <div class="shop-row second">
            ${s.relics.map((i, k) => `
            <div class="shop-item relic ${gold < i.price ? 'pricey' : ''}" data-flip="s-${i.relic.id}">
                ${relicCardHtml(i.relic, `buyShopRelic(${k}, this)`)}
                ${priceTag(i.price)}
            </div>`).join('')}
            ${(s.seeds || []).map((i, k) => `
            <div class="shop-item seed ${gold < i.price ? 'pricey' : ''}" data-flip="s-${i.seed.id}">
                <div class="relic-card seed-card" onclick="buyShopSeed(${k}, this)" ${seedTip(i.seed)}>
                    ${seedArt(i.seed, 'lg')}
                    <div class="card-name">${i.seed.name}</div>
                    <div class="relic-desc">${i.seed.desc}</div>
                </div>
                ${priceTag(i.price)}
            </div>`).join('')}
            <div class="shop-item service ${s.removeUsed ? 'used' : gold < rp ? 'pricey' : ''}" data-flip="s-remove">
                <div class="relic-card service-card" ${s.removeUsed ? '' : 'onclick="openShopRemoval(this)"'} ${tip(['Quitar una carta', 'Elige una carta de tu mazo y el tendero se la lleva. Cada vez cuesta un poco más.'])}>
                    ${art('compostar', '🪱', { size: 'lg' })}
                    <div class="card-name">Quitar una carta</div>
                    <div class="relic-desc">${s.removeUsed ? 'Ya usaste este servicio aquí.' : 'Despega una carta de tu mazo.'}</div>
                </div>
                ${s.removeUsed ? '' : priceTag(rp)}
            </div>
            ${empty ? '<p class="hand empty-note">…¡lo compraste todo!</p>' : ''}
        </div>
        <button class="secondary" onclick="leaveShop()">Salir</button>`, 'wide shop');
}

function renderEvent() {
    const ev = GAME.currentEvent;
    const p = GAME.player;
    if (!ev) return ''; // durante la transición a una pelea que salió de un evento
    return panel(art(ev.sprite || ev.id, ev.icon, { size: 'xl' }), ev.title, `
        <p>${ev.desc}</p>
        <div class="event-options">
            ${ev.options.map((o, i) => {
                const locked = o.locked ? o.locked(p) : '';
                const kw = keywordTips(o.text);
                return `<button class="${i % 2 ? 'btn-mint' : ''}" ${locked ? 'disabled' : ''} ${kw.length ? tip(kw) : ''} onclick="resolveEventOption(${i})">${o.text}${locked ? ` <small>(${locked})</small>` : ''}</button>`;
            }).join('')}
        </div>`);
}

function renderEventResult() {
    const ev = GAME.currentEvent;
    if (!ev) return '';
    return panel(art(ev.sprite || ev.id, ev.icon, { size: 'xl' }), ev.title, `
        <p>${GAME.lastEventMsg}</p>
        <button onclick="closeEventResult()">Continuar</button>`);
}

// ============================================================
// ARRANQUE
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    app.innerHTML = '<div id="screen"></div><div id="overlay"></div><div id="tooltip"></div>';
    fitCanvas();
    window.addEventListener('resize', fitCanvas);
    setupTooltips();
    setupCardDrag();
    setupFullscreen();
    setupUiClicks();
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (GAME.seedMenu != null || GAME.seedTargeting != null) { GAME.seedMenu = null; GAME.seedTargeting = null; render(); return; }
        if (GAME.modal) closeModal();
    });
    showMainMenu();
});
