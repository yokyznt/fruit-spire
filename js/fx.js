// ============================================================
// FX.JS — Todo lo que se mueve: jugar/arrastrar cartas, turno de los
// enemigos con sus animaciones de ataque, efectos de golpe, textos
// flotantes, cartas que vuelan, tooltips y escalado del lienzo.
// ============================================================

// ---------- coordenadas del lienzo ----------
let SCALE = 1;
function fitCanvas() {
    const app = document.getElementById('app');
    // escala para que quepa el área de diseño; luego el lienzo crece hasta
    // cubrir la ventana completa
    SCALE = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    BASE_W = Math.ceil(window.innerWidth / SCALE);
    BASE_H = Math.ceil(window.innerHeight / SCALE);
    app.style.width = `${BASE_W}px`;
    app.style.height = `${BASE_H}px`;
    app.style.setProperty('--s', SCALE);
    if (GAME.screen === 'map' && GAME.mapPan) applyMapPan();
}
// Posición (en coordenadas del lienzo) del centro de un elemento
function canvasPoint(el, fy) {
    const app = document.getElementById('app');
    const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - a.left) / SCALE, y: (r.top + r.height * (fy == null ? 0.5 : fy) - a.top) / SCALE };
}
// Caja de un elemento en coordenadas del lienzo
function canvasRect(el) {
    const r = el.getBoundingClientRect(), a = document.getElementById('app').getBoundingClientRect();
    return { left: (r.left - a.left) / SCALE, top: (r.top - a.top) / SCALE, right: (r.right - a.left) / SCALE, bottom: (r.bottom - a.top) / SCALE };
}
function toCanvas(e) {
    const a = document.getElementById('app').getBoundingClientRect();
    return { x: (e.clientX - a.left) / SCALE, y: (e.clientY - a.top) / SCALE };
}
// Mueve un elemento hacia otro vía variables CSS --fx/--fy
function aimAt(el, targetId) {
    const target = document.getElementById(targetId);
    if (!el || !target) return;
    const a = canvasPoint(el), b = canvasPoint(target);
    el.style.setProperty('--fx', `${b.x - a.x}px`);
    el.style.setProperty('--fy', `${b.y - a.y}px`);
}
function restartClass(el, cls) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const portraitEl = (side) => document.getElementById(`portrait-${side}`);
const hitLayer = (side) => { const p = portraitEl(side); return p && p.querySelector('.hit-layer'); };

// ============================================================
// ANIMACIONES DE ATAQUE DE LOS PERSONAJES
// Cada una es una animación completa (preparar → golpe → volver).
// `hit` es el momento del impacto, cuando se aplica el efecto.
// Se guardan en GAME.pAnims para que sigan donde iban aunque la
// pantalla se redibuje a mitad de camino.
// ============================================================
const ANIMS = {
    lunge: { dur: 640, hit: 300, melee: true },
    bite: { dur: 660, hit: 290, melee: true },
    charge: { dur: 900, hit: 520, melee: true },
    sting: { dur: 780, hit: 420, melee: true },
    swoop: { dur: 840, hit: 450, melee: true },
    slam: { dur: 800, hit: 430, melee: true },
    spin: { dur: 840, hit: 430, melee: true },
    slash: { dur: 720, hit: 360, melee: true },
    spit: { dur: 640, hit: 340 },
    throw: { dur: 580, hit: 320 },
    shake: { dur: 580, hit: 290 },
    cast: { dur: 620, hit: 320 },
    power: { dur: 680, hit: 340 },
    guard: { dur: 620, hit: 260 },
    heal: { dur: 660, hit: 330 },
    burrow: { dur: 820, hit: 430 }
};
function playPortraitAnim(side, anim, targetSide) {
    const info = ANIMS[anim] || ANIMS.cast;
    const el = portraitEl(side), tgt = targetSide && portraitEl(targetSide);
    let reach = 0, reachY = 0;
    if (el && tgt && info.melee) {
        const a = canvasPoint(el), b = canvasPoint(tgt);
        reach = (b.x - a.x) * 0.72;
        reachY = (b.y - a.y) * 0.5;
    }
    GAME.pAnims[side] = { anim, t0: performance.now(), dur: info.dur, reach, reachY };
    applyPortraitAnim(side);
    return info;
}
function applyPortraitAnim(side) {
    const a = GAME.pAnims[side];
    const el = portraitEl(side);
    if (!a || !el) return;
    const t = performance.now() - a.t0;
    if (t >= a.dur) { delete GAME.pAnims[side]; return; }
    el.style.setProperty('--reach', `${a.reach.toFixed(0)}px`);
    el.style.setProperty('--reach-y', `${a.reachY.toFixed(0)}px`);
    el.style.setProperty('--dir', side === 'player' ? 1 : -1);
    el.style.animationDelay = `${-t.toFixed(0)}ms`;
    [...el.classList].forEach((c) => { if (c.startsWith('anim-')) el.classList.remove(c); });
    void el.offsetWidth;
    el.classList.add(`anim-${a.anim}`);
}

// ¿La carta se lanza a un enemigo? (los ataques sí, por defecto)
function cardNeedsTarget(card) {
    return card.target ? card.target === 'enemy' : card.type === 'attack';
}
const MELEE_FX = { punch: 'lunge', stab: 'lunge', bite: 'bite', slash: 'slash', spin: 'spin', burst: 'charge' };
function cardAnim(card) {
    if (card.anim) return card.anim;
    if (card.type === 'power') return 'power';
    if (card.type !== 'attack') return /cáscara|corteza/i.test(card.description) ? 'guard' : 'cast';
    return MELEE_FX[card.fx] || 'throw';
}
function aliveEnemyIndexes(c) {
    return c.enemies.map((e, i) => (e.isAlive() ? i : -1)).filter((i) => i >= 0);
}
function canPlayNow() {
    const c = GAME.combat;
    return !!c && !GAME.anim && !c.ended && c.turn === 'player';
}
// no alcanza la energía: la carta dice que no y la naranja parpadea
function noEnergy(slot) {
    if (window.Sfx) Sfx.denied();
    restartClass(slot, 'nope');
    restartClass(document.querySelector('.energy-orange'), 'nope');
    showToast('¡No te alcanza la energía!');
}

// ============================================================
// JUGAR UNA CARTA
// targetIdx: enemigo elegido (null = se decide solo si hay uno).
// drop: posición donde se soltó la carta si se jugó arrastrándola.
// ============================================================
// Tocar una carta ya no la juega: solo la selecciona (se levanta un poco).
// Jugarla es obligatoriamente arrastrándola hasta su objetivo.
function selectCard(i) {
    if (!canPlayNow()) return;
    if (window.tutCardAllowed && GAME.combat && !tutCardAllowed(window.getCard(GAME.combat.player.hand[i]))) { tutDenied(document.querySelectorAll('.hand-row .fan-slot')[i]); return; }
    if (window.Sfx) Sfx.select();
    GAME.selectedCard = GAME.selectedCard === i ? null : i;
    render();
}
// Si el jugador suelta una carta arrastrada mientras la anterior seguía
// animando, no se pierde el gesto: se encola (con su objetivo) y se juega
// sola en cuanto se pueda, sin que haga falta volver a arrastrarla.
function queueCardPlay(i, targetIdx) {
    const c = GAME.combat;
    if (!c || c.ended || c.turn !== 'player') return;
    GAME.cardQueue = GAME.cardQueue || [];
    if (GAME.cardQueue.length < 4) GAME.cardQueue.push({ id: c.player.hand[i], targetIdx });
}
function drainCardQueue() {
    const c = GAME.combat;
    if (!c || GAME.anim || c.ended || c.turn !== 'player' || !GAME.cardQueue || !GAME.cardQueue.length) {
        if (!GAME.anim && GAME.wantsEndTurn && canPlayNow() && (!GAME.cardQueue || !GAME.cardQueue.length)) {
            GAME.wantsEndTurn = false;
            endTurn();
        }
        return;
    }
    const q = GAME.cardQueue.shift();
    const idx = c.player.hand.indexOf(q.id);
    if (idx >= 0) playCard(idx, q.targetIdx);
    else drainCardQueue(); // esa copia ya no está en la mano: probamos la siguiente encolada
}
async function playCard(i, targetIdx, drop) {
    const c = GAME.combat;
    if (!canPlayNow()) {
        if (GAME.anim && i != null) queueCardPlay(i, targetIdx);
        return;
    }
    GAME.selectedCard = null;
    const card = window.getCard(c.player.hand[i]);
    if (!card) return;
    const slot = document.querySelectorAll('.hand-row .fan-slot')[i];
    if (window.tutCardAllowed && !tutCardAllowed(card)) { tutDenied(slot); return; }
    if (card.unplayable) { if (window.Sfx) Sfx.denied(); restartClass(slot, 'nope'); showToast('Esa carta no se puede jugar'); return; }
    if (card.cost > c.player.energy) { noEnergy(slot); return; }
    const needsTarget = cardNeedsTarget(card);
    const alive = aliveEnemyIndexes(c);
    if (needsTarget && targetIdx == null) {
        if (alive.length !== 1) {
            if (window.Sfx) Sfx.denied();
            restartClass(slot, 'nope');
            showToast('Arrastra la carta hacia el enemigo que quieras atacar');
            return;
        }
        targetIdx = alive[0];
    }
    // Provocación: el golpe se desvía al enemigo que provoca
    if (needsTarget && c.tauntIndex) {
        const ti = c.tauntIndex();
        if (ti >= 0 && ti !== targetIdx && !c.enemies[targetIdx].getStatus('taunt')) { targetIdx = ti; showToast('¡Provocación! Tu golpe tiene que ir contra este enemigo'); }
    }
    GAME.anim = true;
    if (window.Sfx) (card.type === 'attack' ? Sfx.cardAttack : card.type === 'power' ? Sfx.cardPower : Sfx.cardSkill)();
    const flySide = needsTarget ? `enemy-${targetIdx}` : 'player';
    if (slot) {
        if (drop) flyDroppedCard(slot, drop, `portrait-${flySide}`);
        else { aimAt(slot, `portrait-${flySide}`); slot.classList.add('played'); }
    }
    showActionBanner('player', card.name, card.sprite, card.art);
    // la fruta se lanza hacia su objetivo (o el primero vivo si es un ataque a todos)
    const aimSide = card.type === 'attack' ? `enemy-${needsTarget ? targetIdx : alive[0]}` : null;
    const anim = cardAnim(card);
    const info = playPortraitAnim('player', anim, aimSide);
    if (card.type === 'attack' && !info.melee) {
        const targets = needsTarget ? [targetIdx] : alive;
        setTimeout(() => targets.forEach((t, k) => setTimeout(() => projectile('player', `enemy-${t}`, card.fx), k * 60)), Math.max(0, info.hit - 240));
    }
    await wait(info.hit);
    if (GAME.combat !== c) return;
    GAME.handRemoved = i;
    c.playCard(i, needsTarget ? targetIdx : null);
    GAME.handRemoved = null;
    if (window.tutorialNotify) tutorialNotify(`card:${card.type}`);
    spawnFx(c.lastEvents, { fx: card.fx || 'punch' });
    await wait(Math.max(260, info.dur - info.hit - 120));
    if (GAME.combat === c && !c.ended) {
        GAME.anim = false;
        drainCardQueue();
    }
}

// La carta soltada sigue desde donde quedó hasta su objetivo
function flyDroppedCard(slot, drop, targetId) {
    const target = document.getElementById(targetId);
    const a = canvasPoint(slot), b = target ? canvasPoint(target) : a;
    const tx = drop.x + b.x - a.x, ty = drop.y + b.y - a.y;
    slot.style.transform = '';
    slot.animate([
        { transform: `translate(${drop.x}px, ${drop.y}px) rotate(${drop.r}deg) scale(${drop.s})`, opacity: 1 },
        { transform: `translate(${drop.x + (tx - drop.x) * 0.2}px, ${drop.y + (ty - drop.y) * 0.2 - 24}px) rotate(-4deg) scale(${drop.s * 1.05})`, opacity: 1, offset: 0.3 },
        { transform: `translate(${tx}px, ${ty}px) rotate(18deg) scale(.3)`, opacity: 0 }
    ], { duration: 340, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'forwards' });
}

// ============================================================
// TURNO DE LOS ENEMIGOS
// ============================================================
function intentSprite(move) {
    if (!move) return 'ui_sword';
    if (move.damage) return 'ui_sword';
    if (move.summon) return 'node_mystery';
    if (move.apply) return 'st_weak';
    if (move.heal || move.healAll) return 'ui_heal';
    if (move.block && !move.self) return 'ui_shield';
    return 'ui_up';
}

async function endTurn() {
    const c = GAME.combat;
    if (!canPlayNow()) {
        // se pidió terminar el turno mientras una carta seguía animando:
        // se hace en cuanto termine, sin tener que volver a pulsar el botón
        if (GAME.anim && c && !c.ended && c.turn === 'player') GAME.wantsEndTurn = true;
        return;
    }
    GAME.wantsEndTurn = false;
    GAME.cardQueue = [];
    GAME.selectedCard = null;
    GAME.anim = true;
    if (window.tutorialNotify) tutorialNotify('turn-end');

    // 1) la mano vuela a la pila de descarte (las que se conservan se quedan)
    const slots = [...document.querySelectorAll('.hand-row .fan-slot')].filter((s) => !s.dataset.retain);
    slots.forEach((s, k) => {
        aimAt(s, 'pile-discard');
        s.style.animationDelay = `${k * 45}ms`;
        s.classList.add('discarding');
    });
    await wait(slots.length ? 400 + slots.length * 45 : 100);
    c.endPlayerTurn();
    spawnFx(c.lastEvents);
    if (c.ended || GAME.combat !== c) return;

    // 2) turno enemigo: cada enemigo vivo actúa, uno detrás de otro
    showTurnBanner(c.aliveEnemies().length > 1 ? 'Turno de los enemigos' : 'Turno del enemigo', 'enemy');
    await wait(900);
    for (let k = 0; k < c.enemies.length; k++) {
        if (c.ended || GAME.combat !== c) return;
        const e = c.enemies[k];
        if (!e.isAlive()) continue;
        const side = `enemy-${k}`;
        GAME.actingEnemy = k;
        if (e.getStatus('frozen')) {
            restartClass(hitLayer(side), 'shiver');
            await wait(250);
            c.enemyAct(k);
            spawnFx(c.lastEvents);
            await wait(750);
            continue;
        }
        const move = e.nextMove;
        const anim = move.anim || (move.damage ? 'lunge' : 'cast');
        restartClass(document.querySelector(`#${side} .intent-bubble`), 'acting');
        showActionBanner(side, move.name, intentSprite(move), '');
        const info = playPortraitAnim(side, anim, 'player');
        if (move.damage && !info.melee && move.fx) {
            setTimeout(() => projectile(side, 'player', move.fx), Math.max(0, info.hit - 230));
        }
        await wait(info.hit);
        if (GAME.combat !== c) return;
        c.enemyAct(k);
        spawnFx(c.lastEvents, { fx: move.fx || 'claw' });
        await wait(Math.max(300, info.dur - info.hit) + c.lastEvents.length * 110 + 120);
    }
    GAME.actingEnemy = null;
    if (c.ended || GAME.combat !== c) return;

    // 3) estados de los enemigos y nuevo turno: se reparte la mano
    GAME.dealIn = true;
    c.endEnemyTurn();
    spawnFx(c.lastEvents);
    if (c.ended || GAME.combat !== c) return;
    showTurnBanner('¡Tu turno!', 'player');
    await wait(400);
    if (GAME.combat === c && !c.ended) GAME.anim = false;
}

// ============================================================
// ARRASTRAR CARTAS EN COMBATE
// Se agarra una carta y se lanza hacia arriba para jugarla. Las que
// van a un enemigo se sueltan encima de él (con un solo enemigo basta
// con subirla). Para que sea fluido: las zonas de los enemigos se miden
// una sola vez al empezar, la carta se mueve solo con transform en un
// requestAnimationFrame por cuadro, y las clases de resaltado se tocan
// solo cuando cambia el objetivo. Nada se redibuja mientras arrastras.
// ============================================================
let cardDrag = null;
let suppressCardClick = false;

function onCardPointerDown(e) {
    if (e.button !== 0 || cardDrag || GAME.screen !== 'combat' || GAME.modal) return;
    const slot = e.target.closest && e.target.closest('.hand-row .fan-slot');
    if (!slot || !canPlayNow()) return;
    const index = Array.prototype.indexOf.call(slot.parentNode.children, slot);
    const card = window.getCard(GAME.combat.player.hand[index]);
    if (!card) return;
    if (window.tutCardAllowed && !tutCardAllowed(card)) { tutDenied(slot); return; }
    const p = toCanvas(e);
    cardDrag = { id: e.pointerId, slot, index, card, start: p, pos: p, moved: false, raf: 0, hover: null };
}

function beginCardDrag() {
    const d = cardDrag;
    d.moved = true;
    hideTip();
    d.needsTarget = cardNeedsTarget(d.card);
    d.zones = d.needsTarget
        ? aliveEnemyIndexes(GAME.combat).map((i) => {
            const el = document.getElementById(`enemy-${i}`);
            return { i, el, r: canvasRect(el) };
        })
        : [];
    const bottom = document.querySelector('.combat-bottom');
    d.playLine = bottom ? canvasRect(bottom).top + 40 : BASE_H * 0.6;
    d.playerEl = document.querySelector('.combatant.player');
    d.stage = document.querySelector('.combat-stage');
    const baseY = parseFloat(getComputedStyle(d.slot).getPropertyValue('--y')) || 0;
    d.cur = { x: 0, y: baseY, r: 0, s: 1 };
    // si la carta todavía se estaba repartiendo, su animación taparía el arrastre
    d.slot.classList.remove('deal-in', 'nope');
    d.slot.style.animationDelay = '';
    d.slot.classList.add('dragging');
    d.stage.classList.add('drag-active');
    d.zones.forEach((z) => z.el.classList.add('targetable'));
    // la ficha de la carta acompaña el arrastre
    d.stage.querySelectorAll('.card-info').forEach((x) => x.remove());
    d.stage.insertAdjacentHTML('beforeend', cardInfoHtml(d.card, GAME.combat.previewCard(d.card, null), 'drag-card-info'));
    heartifyDom(document.getElementById('drag-card-info'));
    placeCardInfo(document.getElementById('drag-card-info'), d.slot);
    d.raf = requestAnimationFrame(cardDragFrame);
}

function onCardPointerMove(e) {
    const d = cardDrag;
    if (!d || e.pointerId !== d.id) return;
    d.pos = toCanvas(e);
    if (!d.moved && Math.hypot(d.pos.x - d.start.x, d.pos.y - d.start.y) > 8) beginCardDrag();
}

// Qué pasaría si se suelta ahora: índice del enemigo, 'self' o null
function cardDropResult(d) {
    const { x, y } = d.pos;
    if (!d.needsTarget) return y < d.playLine ? 'self' : null;
    const hit = d.zones.find((z) => x >= z.r.left && x <= z.r.right && y >= z.r.top && y <= z.r.bottom);
    if (hit) return hit.i;
    if (d.zones.length === 1 && y < d.playLine) return d.zones[0].i;
    return null;
}

function cardDragFrame() {
    const d = cardDrag;
    if (!d || !d.moved) return;
    // la carta sigue al puntero con un poco de inercia y se ladea según la velocidad
    const tx = d.pos.x - d.start.x, ty = d.pos.y - d.start.y;
    const nx = d.cur.x + (tx - d.cur.x) * 0.4;
    const ny = d.cur.y + (ty - d.cur.y) * 0.4;
    const tilt = Math.max(-16, Math.min(16, (nx - d.cur.x) * 0.8));
    // sobre un enemigo la carta se encoge para no taparlo
    const sc = d.needsTarget && d.hover != null ? 0.72 : 1.08;
    d.cur = { x: nx, y: ny, r: d.cur.r + (tilt - d.cur.r) * 0.2, s: d.cur.s + (sc - d.cur.s) * 0.25 };
    d.slot.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px) rotate(${d.cur.r.toFixed(2)}deg) scale(${d.cur.s.toFixed(3)})`;

    const res = cardDropResult(d);
    if (res !== d.hover) {
        if (d.hover != null) highlightDrop(d, d.hover, false);
        if (res != null) highlightDrop(d, res, true);
        d.hover = res;
    }
    d.raf = requestAnimationFrame(cardDragFrame);
}
function highlightDrop(d, res, on) {
    const el = res === 'self' ? d.playerEl : (d.zones.find((z) => z.i === res) || {}).el;
    if (el) el.classList.toggle('targeted', on);
    d.slot.classList.toggle('ready', on);
    showDropPreview(d, on && res !== 'self' ? res : null, on ? el : null);
}
// Mientras arrastras: la carta muestra su daño real contra ESE enemigo y sobre él
// aparece el total que le vas a hacer (y la cáscara que ganarías, sobre ti)
function showDropPreview(d, enemyIdx, el) {
    document.querySelectorAll('.drop-preview').forEach((x) => x.remove());
    const c = GAME.combat;
    if (!c || d.card.unplayable) return;
    const target = enemyIdx != null ? c.enemies[enemyIdx] : null;
    const prev = c.previewCard(d.card, target);
    const desc = d.slot.querySelector('.card-desc');
    if (desc) desc.innerHTML = previewDescHtml(d.card, prev);
    if (!el) return;
    let html = '';
    if (prev.total > 0 && target) {
        const lost = Math.max(0, prev.total - target.block);
        html += `<span class="dp dmg">${art('ui_sword', '', { size: 'sm' })}<b>${prev.total}</b>${target.block ? `<small>(-${lost} ❤️)</small>` : ''}${lost >= target.hp ? '<i>¡KO!</i>' : ''}</span>`;
    }
    const blk = prev.block.reduce((a, b) => a + b, 0);
    if (blk > 0) html += `<span class="dp blk">${art('ui_shield', '', { size: 'sm' })}<b>+${blk}</b></span>`;
    if (!html) return;
    const box = document.createElement('div');
    box.className = 'drop-preview';
    box.innerHTML = html;
    heartifyDom(box);
    (d.playerEl && !target && blk > 0 ? d.playerEl : el).appendChild(box);
}

function endCardDrag(e, cancelled) {
    const d = cardDrag;
    if (!d || e.pointerId !== d.id) return;
    cardDrag = null;
    if (!d.moved) return; // fue un toque normal: lo maneja el onclick (selecciona, no juega)
    suppressCardClick = true;
    setTimeout(() => { suppressCardClick = false; }, 0);
    cancelAnimationFrame(d.raf);
    const res = cancelled ? null : cardDropResult(d);
    if (d.hover != null) highlightDrop(d, d.hover, false);
    document.querySelectorAll('.drop-preview').forEach((x) => x.remove());
    const info = document.getElementById('drag-card-info');
    if (info) info.remove();
    d.stage.classList.remove('drag-active');
    d.zones.forEach((z) => z.el.classList.remove('targetable'));

    const c = GAME.combat;
    if (res != null && canPlayNow()) {
        if (d.card.unplayable) showToast('Esa carta no se puede jugar');
        else if (d.card.cost <= c.player.energy) {
            playCard(d.index, res === 'self' ? null : res, d.cur);
            return;
        } else noEnergy(null);
    }
    // no se jugó: vuelve suavemente a su lugar en la mano
    const from = d.slot.style.transform;
    d.slot.style.transform = '';
    d.slot.classList.remove('dragging', 'ready');
    const to = getComputedStyle(d.slot).transform;
    d.slot.animate([{ transform: from }, { transform: to }], { duration: 420, easing: 'cubic-bezier(.22, 1.15, .36, 1)' });
}

// La ficha de la carta aparece justo encima de ella (sin salirse del escenario)
function placeCardInfo(info, slot) {
    const stage = document.querySelector('.combat-stage');
    if (!info || !slot || !stage) return;
    const s = stage.getBoundingClientRect(), c = (slot.querySelector('.card') || slot).getBoundingClientRect();
    const k = s.width / stage.offsetWidth || 1; // escala del lienzo
    const w = info.offsetWidth, h = info.offsetHeight;
    let left = (c.left + c.width / 2 - s.left) / k - w / 2;
    let top = (c.top - s.top) / k - h - 14;
    left = Math.max(10, Math.min(stage.offsetWidth - w - 10, left));
    top = Math.max(8, top);
    info.style.left = left + 'px';
    info.style.top = top + 'px';
}
function setupCardDrag() {
    // La animación de reparto deja la carta "congelada" en su último cuadro
    // (fill: both), lo que impide levantarla o arrastrarla. Se quita al terminar.
    document.addEventListener('animationend', (e) => {
        const el = e.target;
        if (el.classList && el.classList.contains('fan-slot') && (e.animationName === 'dealIn' || e.animationName === 'nope')) {
            el.classList.remove('deal-in', 'nope');
        }
    });
    document.addEventListener('pointerdown', onCardPointerDown);
    window.addEventListener('pointermove', onCardPointerMove, { passive: true });
    window.addEventListener('pointerup', (e) => endCardDrag(e, false));
    window.addEventListener('pointercancel', (e) => endCardDrag(e, true));
    document.addEventListener('click', (e) => {
        if (suppressCardClick && e.target.closest && e.target.closest('.hand-row')) { e.stopPropagation(); e.preventDefault(); }
    }, true);
}

// ============================================================
// CARTAS QUE VUELAN (tienda, recompensas)
// Copia visual de un elemento que viaja en arco hasta otro elemento
// del HUD y se encoge al llegar.
// ============================================================
function flyGhost(el, targetSelector, onArrive) {
    const overlay = document.getElementById('overlay');
    const target = document.querySelector(targetSelector);
    if (!overlay || !el || !target) { if (onArrive) onArrive(); return; }
    const a = canvasPoint(el), b = canvasPoint(target);
    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    ghost.innerHTML = el.outerHTML;
    ghost.style.left = `${a.x - el.offsetWidth / 2}px`;
    ghost.style.top = `${a.y - el.offsetHeight / 2}px`;
    overlay.appendChild(ghost);
    const dx = b.x - a.x, dy = b.y - a.y;
    ghost.animate([
        { transform: 'translate(0, 0) rotate(0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 90}px) rotate(-8deg) scale(.8)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) rotate(14deg) scale(.12)`, opacity: 0.4 }
    ], { duration: 720, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'forwards' }).onfinish = () => {
        ghost.remove();
        restartClass(document.querySelector(targetSelector), 'bump');
        if (onArrive) onArrive();
    };
}

// ============================================================
// EFECTOS (viven en #overlay, que no se borra al redibujar)
// ============================================================
function overlayAdd(cls, html, pos, life) {
    const overlay = document.getElementById('overlay');
    if (!overlay) return null;
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    if (pos) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; }
    overlay.appendChild(el);
    setTimeout(() => el.remove(), life || 1000);
    return el;
}
function showTurnBanner(text, side) {
    overlayAdd(`turn-banner ${side}`, `<span>${text}</span>`, null, 1300);
    if (window.Sfx) (side === 'player' ? Sfx.turnPlayer : Sfx.turnEnemy)();
}
function showActionBanner(side, name, spriteId, fallback) {
    const portrait = portraitEl(side);
    if (!portrait) return;
    const p = canvasPoint(portrait, 0);
    overlayAdd(`action-banner ${side === 'player' ? 'player' : 'enemy'}`, `${art(spriteId, fallback || '✨', { size: 'sm' })}<b>${name}</b>`, { x: p.x, y: p.y - 18 }, 1300);
}
function showToast(text) {
    overlayAdd('toast hand', text, null, 1600);
}
function floatText(side, html, cls) {
    const el = portraitEl(side);
    if (!el) return;
    const at = canvasPoint(el, 0.25);
    at.x += Math.random() * 50 - 25;
    overlayAdd(`fx-float ${cls || 'fx-status'}`, html, at, 1200);
}

// ---------- proyectiles (escupitajos, semillas, hielo…) ----------
const PROJECTILES = {
    seeds: `<span class="proj-seed"></span>`,
    splash: `<span class="proj-drop" style="--c:#FFE27A"></span>`,
    splat: `<span class="proj-drop" style="--c:#B7E27F"></span>`,
    ice: `<span class="proj-ice"></span>`,
    burst: `<span class="proj-drop" style="--c:#FFA64D"></span>`,
    shock: `<span class="proj-drop" style="--c:#C9D3DC"></span>`,
    seedsDefault: `<span class="proj-seed"></span>`
};
function projectile(fromSide, toSide, kind) {
    const a = portraitEl(fromSide), b = portraitEl(toSide);
    if (!a || !b) return;
    const p = canvasPoint(a, 0.45), q = canvasPoint(b, 0.45);
    const el = overlayAdd('projectile', PROJECTILES[kind] || PROJECTILES.splat, p, 400);
    if (!el) return;
    const dx = q.x - p.x, dy = q.y - p.y;
    el.animate([
        { transform: 'translate(-50%, -50%) scale(.6) rotate(0)' },
        { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - 70}px)) scale(1.1) rotate(180deg)`, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9) rotate(360deg)` }
    ], { duration: 240, easing: 'linear', fill: 'forwards' });
}

// ---------- efectos de impacto, uno por tipo de golpe ----------
const HIT_SVG = {
    claw: '<svg viewBox="0 0 100 100"><path d="M22 12 L52 88 M42 6 L72 82 M62 2 L90 70"/></svg>',
    slash: '<svg viewBox="0 0 100 100"><path d="M8 84 Q40 20 94 12"/></svg>',
    stab: '<svg viewBox="0 0 100 100"><path d="M2 50 L98 50"/></svg>',
    spin: '<svg viewBox="0 0 100 100"><path d="M50 10 A40 40 0 1 1 12 62"/></svg>',
    sting: '<svg viewBox="0 0 100 100"><path d="M50 8 L56 42 L92 50 L56 58 L50 92 L44 58 L8 50 L44 42 Z"/></svg>'
};
function hitFx(type, targetSide, fromSide) {
    const el = portraitEl(targetSide);
    if (!el) return;
    const at = canvasPoint(el, 0.45);
    const flip = targetSide === 'player' ? ' flip' : '';
    switch (type) {
        case 'claw': case 'slash': case 'stab': case 'spin': case 'sting':
            overlayAdd(`hitfx hit-${type}${flip}`, HIT_SVG[type], at, 600);
            break;
        case 'bite':
            overlayAdd('hitfx hit-bite', '<span class="jaw top"></span><span class="jaw bottom"></span>', at, 600);
            break;
        case 'punch':
            overlayAdd('hitfx hit-punch', art('ui_hit', '💥', { size: 'lg' }), at, 500);
            break;
        case 'burst':
            overlayAdd('hitfx hit-burst', art('ui_hit', '💥', { size: 'xl' }), at, 650);
            overlayAdd('hitfx hit-ring', '', at, 650);
            break;
        case 'shock':
            overlayAdd('hitfx hit-shock', '<span></span><span></span>', canvasPoint(el, 0.95), 700);
            break;
        case 'splat': case 'splash':
            overlayAdd(`hitfx hit-splat ${type}`, '<span></span><span></span><span></span><span></span><span></span>', at, 700);
            break;
        case 'ice':
            overlayAdd('hitfx hit-ice', '<span></span><span></span><span></span><span></span><span></span><span></span>', at, 700);
            break;
        case 'drain': case 'steal': {
            // gotitas (o monedas) que viajan del golpeado al atacante
            const from = fromSide && portraitEl(fromSide);
            if (!from) break;
            const q = canvasPoint(from, 0.45);
            for (let k = 0; k < 5; k++) {
                const bit = overlayAdd(`hitfx hit-${type}-bit`, '', at, 900);
                if (!bit) continue;
                bit.animate([
                    { transform: 'translate(-50%, -50%) scale(.5)', opacity: 0 },
                    { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 60}px), calc(-50% - ${30 + Math.random() * 40}px)) scale(1)`, opacity: 1, offset: 0.3 },
                    { transform: `translate(calc(-50% + ${q.x - at.x}px), calc(-50% + ${q.y - at.y}px)) scale(.6)`, opacity: 0.8 }
                ], { duration: 760, delay: k * 60, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'both' });
            }
            break;
        }
        default:
            break;
    }
    if (type === 'seeds') spawnSeeds(at, false);
}
function spawnSeeds(at, poison) {
    for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 60;
        const seed = overlayAdd(`fx-seed ${poison ? 'poison' : ''}`, '', { x: at.x, y: at.y + 30 }, 800);
        if (seed) { seed.style.setProperty('--dx', `${Math.cos(a) * d}px`); seed.style.setProperty('--dy', `${Math.sin(a) * d}px`); }
    }
}

// ---------- efectos a partir de los eventos del motor ----------
// opts.fx: tipo de golpe de la carta o jugada que causó el daño
function spawnFx(events, opts) {
    if (!events || !events.length) return;
    opts = opts || {};
    events.forEach((ev, idx) => setTimeout(() => spawnSingleFx(ev, opts), idx * 130));
}
function statusInfo(id) { return window.STATUS_DB[id] || { name: id, icon: '✨', sprite: 'ui_up' }; }

// Cartas volando del descarte a la pila de robo, más el meneo de barajado
function reshuffleFx(amount) {
    const discard = document.getElementById('pile-discard');
    const draw = document.getElementById('pile-draw');
    const overlay = document.getElementById('overlay');
    if (discard && draw && overlay) {
        const a = canvasPoint(discard), b = canvasPoint(draw);
        const dx = b.x - a.x, dy = b.y - a.y;
        const n = Math.min(5, Math.max(2, Math.round(amount / 4) + 1));
        for (let i = 0; i < n; i++) {
            setTimeout(() => {
                const ghost = document.createElement('div');
                ghost.className = 'fly-ghost shuffle-chip';
                ghost.innerHTML = '<span class="card-back"></span>';
                ghost.style.left = `${a.x - 15}px`;
                ghost.style.top = `${a.y - 21}px`;
                overlay.appendChild(ghost);
                const arc = -50 - Math.random() * 30;
                const rot = (Math.random() - 0.5) * 360;
                ghost.animate([
                    { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
                    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + arc}px) rotate(${(rot * 0.6).toFixed(0)}deg) scale(1.05)`, opacity: 1, offset: 0.5 },
                    { transform: `translate(${dx}px, ${dy}px) rotate(${rot.toFixed(0)}deg) scale(.7)`, opacity: 0 }
                ], { duration: 520, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }).onfinish = () => ghost.remove();
            }, i * 70);
        }
        restartClass(discard, 'bump');
        setTimeout(() => restartClass(draw, 'shuffling'), n * 70 + 140);
    } else if (draw) {
        restartClass(draw, 'shuffling');
    }
    if (window.Sfx) Sfx.shuffle();
    showToast(`¡Barajeando! ${amount} cartas vuelven a la pila de robo`);
}

function spawnSingleFx(ev, opts) {
    const T = ev.type;
    if (T === 'seed') return; // el cartel de la semilla ya se mostró
    if (T === 'reshuffle') {
        reshuffleFx(ev.amount);
        return;
    }
    if (T === 'rule') { showToast(ev.text); return; }
    if (T === 'taunt') {
        const el = portraitEl(ev.target);
        if (el) restartClass(el.querySelector('.hit-layer'), 'shiver');
        showToast('¡Provocación! Tu golpe tiene que ir contra este enemigo');
        return;
    }
    if (T === 'stealcard') {
        const card = window.getCard(ev.cardId);
        floatText('player', `${art('st_thief', '🃏', { size: 'md' })}<span class="fx-text">-1<small> ${card ? card.name : 'carta'}</small></span>`, 'fx-damage');
        restartClass(document.getElementById('pile-draw'), 'bump');
        return;
    }
    if (T === 'returncards') {
        floatText('player', `${art('st_thief', '🃏', { size: 'md' })}<span class="fx-text">+${ev.amount}<small> cartas recuperadas</small></span>`, 'fx-heal');
        restartClass(document.getElementById('pile-discard'), 'bump');
        return;
    }
    if (T === 'breed') {
        floatText(ev.target, `${art('st_breed', '🥚', { size: 'md' })}<span class="fx-text">¡Cría!</span>`, 'fx-status');
        return;
    }
    if (T === 'drainenergy') {
        restartClass(document.querySelector('.energy-orange'), 'nope');
        floatText('player', `${art('st_drained', '🔋', { size: 'md' })}<span class="fx-text">-${ev.amount}<small> energía</small></span>`, 'fx-poison');
        return;
    }
    if (T === 'relic') {
        const sticker = document.querySelector(`.relic-sticker[data-relic="${ev.relicId}"]`);
        restartClass(sticker, 'flash');
        const bag = document.querySelector('.hud-bag');
        const r = window.RELIC_DB[ev.relicId];
        if (bag && r) {
            restartClass(bag, 'bump');
            const at = canvasPoint(bag, 1);
            overlayAdd('relic-pop', art(r.sprite || r.id, r.icon, { size: 'md' }), { x: at.x, y: at.y + 6 }, 1100);
        }
        return;
    }
    if (T === 'exhaust') {
        restartClass(document.getElementById('pile-exhaust'), 'bump');
        return;
    }
    if (T === 'addcard') {
        const card = window.getCard(ev.cardId);
        const where = ev.where === 'hand' ? 'a tu mano' : ev.where === 'draw' ? 'a tu pila de robo' : 'a tu descarte';
        if (card && card.type === 'curse') showToast(`¡${card.name} ${ev.amount > 1 ? `×${ev.amount} ` : ''}va ${where}!`);
        restartClass(document.getElementById(ev.where === 'draw' ? 'pile-draw' : 'pile-discard'), 'bump');
        return;
    }
    if (T === 'steal') {
        hitFx('steal', 'player', ev.from);
        floatText('player', `${art('ui_coin', '🪙', { size: 'md' })}<span class="fx-text">-${ev.amount}<small> oro</small></span>`, 'fx-damage');
        if (window.Sfx) Sfx.coin();
        return;
    }
    if (T === 'gold') {
        floatText('player', `${art('ui_coin', '🪙', { size: 'md' })}<span class="fx-text">+${ev.amount}<small> oro</small></span>`, 'fx-heal');
        if (window.Sfx) Sfx.coin();
        return;
    }
    if (T === 'skip') {
        hitFx('ice', ev.target);
        floatText(ev.target, `${art('st_frozen', '🧊', { size: 'md' })}<span class="fx-text">¡Congelado!</span>`, 'fx-status');
        return;
    }
    if (T === 'plant') return; // el surco nuevo aparece con su propia animación
    if (T === 'harvest') {
        // cosecha: estallido sobre el viñedo y cartelito con el brote
        const sp = window.SPROUT_DB[ev.sprout];
        const g = document.querySelector('.garden');
        if (g) overlayAdd('hitfx hit-harvest', '<span></span><span></span><span></span><span></span><span></span>', canvasPoint(g), 700);
        if (sp) floatText('player', `${art(sp.sprite, sp.icon, { size: 'md' })}<span class="fx-text">¡Cosecha!<small> ${sp.name}</small></span>`, 'fx-heal');
        return;
    }
    if (T === 'energy') {
        restartClass(document.querySelector('.energy-orange'), 'bump');
        floatText('player', `<span class="fx-text">+${ev.amount}<small> energía</small></span>`, 'fx-energy');
        return;
    }
    if (T === 'negate') {
        floatText(ev.target, `${art('st_wax', '🕯️', { size: 'md' })}<span class="fx-text">¡Anulado!<small> ${statusInfo(ev.statusId).name}</small></span>`, 'fx-status');
        return;
    }
    if (T === 'revive') {
        const el = portraitEl(ev.target);
        if (el) overlayAdd('hitfx hit-puff', '<span></span><span></span><span></span>', canvasPoint(el, 0.6), 700);
        floatText(ev.target, `${art('st_regrow', '🌱', { size: 'md' })}<span class="fx-text">¡Revive!</span>`, 'fx-heal');
        return;
    }
    if (T === 'split') {
        floatText(ev.target, `${art('st_split', '✂️', { size: 'md' })}<span class="fx-text">¡Se divide!</span>`, 'fx-status');
        return;
    }
    if (T === 'flee') {
        floatText(ev.target, `<span class="fx-text">¡Huye!</span>`, 'fx-status');
        return;
    }
    if (T === 'explode') {
        const el = portraitEl(ev.target);
        if (el) { overlayAdd('hitfx hit-burst', art('ui_hit', '💥', { size: 'xl' }), canvasPoint(el, 0.45), 650); overlayAdd('hitfx hit-ring', '', canvasPoint(el, 0.45), 650); }
        floatText(ev.target, `<span class="fx-text">¡BOOM!</span>`, 'fx-damage');
        return;
    }
    if (T === 'clock') {
        showToast('¡Se acabó el tiempo! El enemigo se enfurece.');
        restartClass(hitLayer(ev.target), 'shiver');
        return;
    }
    if (T === 'summon') {
        const el = portraitEl(ev.target);
        if (el) overlayAdd('hitfx hit-puff', '<span></span><span></span><span></span>', canvasPoint(el, 0.6), 700);
        return;
    }

    const portrait = portraitEl(ev.target);
    if (!portrait) return;
    const at = canvasPoint(portrait, 0.3);
    at.x += (Math.random() * 60 - 30);

    // golpe contra cáscara: primero "-N cáscara"; lo que sobra le pega a la vida después
    if (T === 'damage' && !ev.poison && ev.blocked > 0 && !ev.split) {
        const layer0 = portrait.querySelector('.hit-layer');
        if (!ev.thorns && ev.from) hitFx(ev.from === 'player' ? (opts.fx || 'punch') : (opts.fx || 'claw'), ev.target, ev.from);
        if (ev.thorns) hitFx('sting', ev.target);
        overlayAdd('fx-float fx-block', `${art('ui_shield', '🛡️', { size: 'md' })}<span class="fx-text">-${ev.blocked}<small> cáscara</small></span>`, at, 1100);
        restartClass(layer0, 'got-block');
        if (window.Sfx) Sfx.block();
        const rest = ev.amount - ev.blocked;
        if (rest > 0) setTimeout(() => spawnSingleFx(Object.assign({}, ev, { amount: rest, blocked: 0, from: null, split: true }), opts), BLOCK_FIRST_MS);
        return;
    }
    let sprite = 'ui_up', fallback = '✨', cls = 'fx-status';
    if (T === 'damage') { sprite = ev.poison ? 'st_poison' : 'ui_hit'; fallback = '💥'; cls = ev.poison ? 'fx-poison' : 'fx-damage'; }
    else if (T === 'block') { sprite = 'ui_shield'; fallback = '🛡️'; cls = 'fx-block'; }
    else if (T === 'heal') { sprite = 'ui_heal'; fallback = '❤️'; cls = 'fx-heal'; }
    else if (T === 'status') { const s = statusInfo(ev.statusId); sprite = s.sprite; fallback = s.icon; cls = s.kind === 'debuff' ? 'fx-poison' : 'fx-status'; }
    const sign = T === 'damage' ? '-' : '+';
    const label = T === 'status' ? ` ${statusInfo(ev.statusId).name}`
        : T === 'block' ? ' cáscara'
            : ev.maxHp ? ' ❤️ máx.'
                : ev.thorns ? ' pinchos' : ev.poison ? ' pudrición' : '';
    const amount = T === 'status' && ev.statusId === 'frozen' ? '' : ev.amount;
    overlayAdd(`fx-float ${cls}`, `${art(sprite, fallback, { size: 'md' })}<span class="fx-text">${amount === '' ? '' : sign + amount}<small>${label}</small></span>`, at, 1200);

    const layer = portrait.querySelector('.hit-layer');
    if (T === 'damage') {
        // efecto propio del golpe (garras, mordida, tajo…)
        if (!ev.poison && !ev.thorns && ev.from) hitFx(ev.from === 'player' ? (opts.fx || 'punch') : (opts.fx || 'claw'), ev.target, ev.from);
        if (ev.thorns) hitFx('sting', ev.target);
        if (ev.amount > 0 && ev.blocked < ev.amount) spawnSeeds({ x: at.x, y: at.y }, ev.poison);
        if (ev.blocked > 0 && ev.blocked >= ev.amount) { restartClass(layer, 'got-block'); if (window.Sfx) Sfx.block(); return; }
        if (window.Sfx) (ev.poison ? Sfx.poisonTick : Sfx.hit)();
        // cara de "auch" + sacudida + destello. Solo se cambia el dibujo de
        // adentro para que la animación de reposo no se reinicie.
        const id = portrait.dataset.sprite, fb = portrait.dataset.fallback;
        const idle = portrait.querySelector('.idle');
        if (idle) {
            const p = GAME.combat && GAME.combat.player;
            const draw = (mood) => (portrait.dataset.char ? fruitArt(portrait.dataset.char, { mood, size: 'xl', hurtStage: p ? hurtStageFor(p.hp, p.maxHp) : 0 }) : art(id, fb, { mood, size: 'xl' }));
            idle.innerHTML = draw('hurt');
            setTimeout(() => { if (idle.isConnected) idle.innerHTML = draw(); }, 600);
        }
        if (layer) { layer.classList.remove('hit', 'hit-poison'); void layer.offsetWidth; layer.classList.add(ev.poison ? 'hit-poison' : 'hit'); }
    } else if (T === 'block') {
        restartClass(layer, 'got-block');
        if (window.Sfx) Sfx.block();
    } else if (T === 'heal') {
        restartClass(layer, 'got-heal');
        if (window.Sfx) Sfx.heal();
    } else if (T === 'status') {
        if (ev.statusId === 'frozen') hitFx('ice', ev.target);
        if (window.Sfx) (statusInfo(ev.statusId).kind === 'debuff' ? Sfx.debuff : Sfx.buff)();
    }
}

// ============================================================
// TOOLTIPS — cualquier elemento con data-tip
// ============================================================
let tipTarget = null;
function hideTip() {
    tipTarget = null;
    const t = document.getElementById('tooltip');
    if (t) t.classList.remove('show');
}
function showTip(el) {
    const t = document.getElementById('tooltip');
    if (!t) return;
    // la carta seleccionada ya muestra su ficha: no hace falta el tooltip encima
    if (el.closest && el.closest('.fan-slot.selected')) { hideTip(); return; }
    tipTarget = el;
    t.innerHTML = el.dataset.tip.split('||').map((sec) => {
        const [title, text] = sec.split('::');
        if (text && text.startsWith('@card:')) {
            const card = window.getCard(text.slice(6));
            return card ? `<div class="tip-box tip-card"><b>${title}</b>${renderCardHtml(card, {})}</div>` : '';
        }
        if (text && text.startsWith('@ref:')) {
            const relic = window.RELIC_DB[text.slice(5)];
            return relic && window.refBoxHtml ? `<div class="tip-box tip-ref">${refBoxHtml(relic, 'sm')}</div>` : '';
        }
        return `<div class="tip-box"><b>${title}</b>${text ? `<span>${text}</span>` : ''}</div>`;
    }).join('');
    heartifyDom(t);
    t.classList.add('show');
    if (window.tutorialNotify) { if (el.classList.contains('rule-chip')) tutorialNotify('tip:rule'); if (el.classList.contains('intent-bubble')) tutorialNotify('tip:intent'); }
    const r = el.getBoundingClientRect();
    const app = document.getElementById('app').getBoundingClientRect();
    const box = { w: t.offsetWidth, h: t.offsetHeight };
    const left = (r.left - app.left) / SCALE, right = (r.right - app.left) / SCALE;
    const top = (r.top - app.top) / SCALE;
    let x = right + 12;
    if (x + box.w > BASE_W - 8) x = left - box.w - 12;
    if (x < 8) x = Math.min(BASE_W - box.w - 8, Math.max(8, left));
    const y = Math.min(BASE_H - box.h - 8, Math.max(8, top));
    t.style.left = x + 'px';
    t.style.top = y + 'px';
}
let hideTipTimer = null;
function setupTooltips() {
    document.addEventListener('mouseover', (e) => {
        if (cardDrag && cardDrag.moved) return;
        // si el mouse entra al propio tooltip (ej. la carta que muestra
        // adentro), se deja tal cual: no se cierra ni se vuelve a mover
        const t = document.getElementById('tooltip');
        if (t && t.contains(e.target)) { clearTimeout(hideTipTimer); return; }
        const el = e.target.closest && e.target.closest('[data-tip]');
        if (el === tipTarget) { clearTimeout(hideTipTimer); return; }
        if (el) { clearTimeout(hideTipTimer); showTip(el); return; }
        // un hueco de un par de píxeles entre el elemento y el tooltip no debe
        // cerrarlo: se espera un pelín antes de ocultarlo de verdad
        clearTimeout(hideTipTimer);
        hideTipTimer = setTimeout(hideTip, 140);
    });
}

// clic genérico de interfaz: cualquier <button> habilitado hace un "tap"
// suave (las cartas no son <button>, así que no se pisan con sus propios sonidos)
function setupUiClicks() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('button');
        if (btn && !btn.disabled && window.Sfx) Sfx.tap();
    }, true);
}

// ---------- pantalla completa del navegador ----------
function isFullscreen() { return !!document.fullscreenElement; }
function toggleGameSound() {
    if (window.toggleMute) toggleMute();
    render();
}
function toggleFullscreen() {
    try {
        if (isFullscreen()) document.exitFullscreen();
        else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } catch (e) { /* el navegador no lo permite */ }
}
// la pantalla completa solo se activa con el botón del menú o con F11
function setupFullscreen() {
    document.addEventListener('fullscreenchange', () => { fitCanvas(); if (GAME.screen === 'menu') render(); });
}

window.playCard = playCard;
window.endTurn = endTurn;
window.toggleFullscreen = toggleFullscreen;
