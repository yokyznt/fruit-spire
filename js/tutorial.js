// ============================================================
// TUTORIAL.JS — "Cómo jugar": un mapa chiquito con un camino fijo por
// las casillas principales, y Profe Limón guiando cada paso.
//
// Hay dos tipos de paso (TUT_STEPS):
//   · de lectura   (next: true)  → se avanza con "Siguiente".
//   · de acción    (until: fn)   → OBLIGATORIO: se apaga todo menos lo
//     que brilla (spot) y el tutorial no sigue hasta que se cumpla until().
//     until() mira el estado del juego, así que no se pierde aunque algo
//     pase demasiado rápido.
// Campos comunes:
//   text    lo que dice Profe Limón
//   spot    selector(es) CSS de lo que brilla (y, en pasos de acción, lo único que se puede tocar)
//   pos     dónde sale el globo: 'bl' | 'top' | 'center'
//   screen  pantalla en la que ocurre el paso (si el juego está en otra, se salta
//           al siguiente paso de esa pantalla: así nunca se atora)
//   skipIf() → true para saltarse el paso
//   cards   'attack' | 'skill': en ese paso solo se pueden jugar cartas de ese tipo
//   keys    teclas permitidas en ese paso (todas las demás se bloquean)
// Solo se puede hacer lo que pide Profe Limón: lo que no brilla no se puede
// tocar, las cartas de otro tipo no se dejan arrastrar y los atajos de
// teclado están bloqueados (Enter avanza los pasos de lectura, Esc sale).
// El juego avisa acciones con tutorialNotify('card:attack' | 'card:skill' | 'turn-end' | 'shop-buy').
// ============================================================

// 7 columnas: la tiendita (x=5) queda pegada a la guarida del jefe (x=6)
const TUT_MAP = { cols: 7, rows: 3 };
const tutFlag = (name) => () => !!(GAME.tutorial && GAME.tutorial.flags[name]);
const tutScreen = (name) => () => GAME.screen === name;

const tutHasSeed = () => !!GAME.player && (GAME.player.seeds || []).some(Boolean);
const tutCanPlay = (type) => {
    const c = GAME.combat;
    return !!c && c.turn === 'player' && c.player.hand.some((id) => (window.getCard(id) || {}).type === type && c.canPlay(id));
};
const tutCanPlaySkill = () => tutCanPlay('skill');
// En teléfono no hay mouse ni teclado: los textos lo dicen de otra forma
const tutTouch = (touch, mouse) => () => (IS_PHONE ? touch : mouse);

const TUT_STEPS = [
    // ---------- el mapa ----------
    { screen: 'map', pos: 'center', next: true, text: '¡Hola! Soy <b>Profe Limón</b>. Te enseño a jugar en un ratito.' },
    { screen: 'map', pos: 'top', next: true, spot: '#player-token', text: 'Esta es tu fruta. Cruza el mapa hasta el <b>jefe</b>, a la derecha.' },
    { screen: 'map', pos: 'top', next: true, spot: '.wall', text: 'Puedes ir adelante, arriba o abajo. Las cintas son <b>muros</b>.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('combat'), text: 'Toca la casilla del <b>enemigo</b>.' },

    // ---------- el primer combate ----------
    { screen: 'combat', pos: 'top', next: true, spot: '#enemy-0', text: 'Este es el enemigo. ¡Bájale la vida a 0!' },
    { screen: 'combat', pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: 'Esto es lo que hará en su turno. La espada es el <b>daño</b> que te hará.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.combatant.player .plate', text: 'Esta es tu <b>vida</b>.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.hand-row', text: 'Estas son tus <b>cartas</b>. Robas 5 cada turno.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.energy-orange', text: 'Tu <b>energía</b>. Cada carta cuesta lo que dice su bolita.' },
    {
        // se da por cumplido si ya no puede jugar ningún ataque (para no atorarse)
        screen: 'combat', pos: 'top', spot: '.hand-row', cards: 'attack', avoid: '.combatant, .intent-bubble',
        until: () => tutFlag('card:attack')() || !tutCanPlay('attack'),
        text: 'Arrastra un <b>Golpe de Cáscara</b> hasta el enemigo.',
        skipIf: () => !tutCanPlay('attack')
    },
    {
        // igual: si ya no puede jugar ninguna habilidad, sigue
        screen: 'combat', pos: 'top', spot: '.hand-row', cards: 'skill', avoid: '.combatant, .intent-bubble',
        until: () => tutFlag('card:skill')() || !tutCanPlaySkill(),
        text: 'Ahora arrastra un <b>Jugo Defensivo</b> hacia arriba.',
        skipIf: () => !tutCanPlaySkill()
    },
    {
        screen: 'combat', pos: 'top', next: true, spot: '.combatant.player .combat-block-badge',
        text: 'Eso es <b>cáscara</b>: recibe los golpes antes que tu vida.',
        skipIf: () => !GAME.combat || GAME.combat.player.block <= 0
    },
    {
        // tap: en este paso basta tocar lo iluminado para ver su explicación
        screen: 'combat', pos: 'top', spot: '#enemy-0 .intent-bubble', tap: true, until: tutFlag('tip:intent'),
        text: tutTouch('Toca su intención para ver los <b>detalles</b>.', 'Pasa el mouse sobre su intención para ver los <b>detalles</b>.'),
        skipIf: () => !document.querySelector('#enemy-0 .intent-bubble')
    },
    { screen: 'combat', pos: 'top', spot: '.end-turn', until: tutFlag('turn-end'), text: 'Pulsa <b>Terminar turno</b>.' },
    { screen: 'combat', pos: 'top', spot: '.hand-row, .end-turn', avoid: '.combatant, .intent-bubble', until: tutScreen('reward'), text: '¡Sigue así hasta ganar!' },

    // ---------- recompensas ----------
    { screen: 'reward', pos: 'bl', spot: () => (lootPending() ? '.loot-item:not(.taken):not(.flying)' : '.reward-row .card, button[onclick="skipReward()"]'), until: tutScreen('map'), text: '¡Ganaste! Toca cada <b>premio</b> para guardarlo y elige una carta.' },
    { screen: 'map', pos: 'bl', next: true, spot: '.hud-bag', text: 'También ganaste una <b>semilla</b>. Está en tu Mochila.' },

    // ---------- el resto del mapa ----------
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('rest'), text: 'Ve a la <b>fogata</b>.' },
    {
        screen: 'rest', pos: 'bl', spot: '.rest-option, .reward-row.picker .card, button[onclick*="setRestMode"]', until: tutScreen('map'),
        text: 'Elige una: <b>curarte</b>, mejorar una carta o quitar una.'
    },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('treasure'), text: 'Ahora el <b>cofre</b>.' },
    { screen: 'treasure', pos: 'bl', spot: () => (lootPending() ? '.loot-item:not(.taken):not(.flying)' : 'button[onclick*="closeEventResult"]'), until: tutScreen('map'), text: '¡Un <b>objeto</b>! Tócalo para guardarlo en tu Mochila.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('event'), text: 'Ahora el <b>misterio</b>.' },
    { screen: 'event', pos: 'bl', spot: '.event-options button', until: tutScreen('event-result'), text: 'Elige una opción.' },
    { screen: 'event-result', pos: 'bl', spot: () => (lootPending() ? '.loot-item:not(.taken):not(.flying)' : 'button[onclick*="closeEventResult"]'), until: tutScreen('map'), text: 'Recoge lo que ganaste y pulsa <b>Continuar</b>.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('shop'), text: 'Ahora la <b>tiendita</b>.' },
    { screen: 'shop', pos: 'bl', spot: '.shop-item, .reward-row.picker .card, button[onclick*="closeShopPicker"]', until: tutFlag('shop-buy'), text: 'Compra algo con tu <b>oro</b>.' },
    { screen: 'shop', pos: 'bl', spot: 'button[onclick*="leaveShop"]', until: tutScreen('map'), text: 'Pulsa <b>Salir</b>.' },
    { screen: 'map', pos: 'top', next: true, spot: '.node.elite', text: 'Las de fuego son <b>élites</b>: más duras, pero dan objetos.' },
    {
        // si la guarida aún no se alcanza, brilla la casilla que lleva hasta ella (nunca se atora)
        screen: 'map', pos: 'top', spot: () => (document.querySelector('.boss-lair.reachable') ? '.boss-lair' : '.node.reachable'),
        until: tutScreen('combat'), text: 'Entra a la guarida del <b>jefe</b>.'
    },

    // ---------- el jefe ----------
    {
        screen: 'combat', pos: 'top', spot: '.rule-chip', tap: true, until: tutFlag('tip:rule'),
        text: tutTouch('Cada piso tiene una <b>regla</b>. Tócala para leerla.', 'Cada piso tiene una <b>regla</b>. Pasa el mouse para leerla.'),
        skipIf: () => !document.querySelector('.rule-chip')
    },
    {
        screen: 'combat', pos: 'top', spot: '.hud-bag', keys: ['i', 'I'], until: () => !!GAME.inventory || tutFlag('seed-use')() || !tutHasSeed(),
        text: 'Abre tu <b>Mochila</b>.',
        skipIf: () => !tutHasSeed()
    },
    {
        // si cierra la mochila, vuelve a brillar la mochila para abrirla otra vez;
        // si se queda sin semilla (la tiró), el paso se da por hecho
        screen: 'combat', pos: 'top', spot: () => (GAME.seedTargeting != null ? '.combatant.enemy.seed-aim' : GAME.inventory ? '.inv-seed .btn-mint' : '.hud-bag'),
        keys: ['i', 'I'], until: () => tutFlag('seed-use')() || (!tutHasSeed() && GAME.seedTargeting == null),
        text: 'Usa la <b>semilla</b>.',
        skipIf: () => !tutHasSeed()
    },
    { screen: 'combat', pos: 'top', spot: '.hand-row, .end-turn', avoid: '.combatant, .intent-bubble', until: tutScreen('tutorial-end'), text: '¡Ahora derrótalo!' }
];
const TUT_TOTAL = TUT_STEPS.length;

// ---------- empezar / salir ----------
function exitTutorial() {
    if (!GAME.tutorial) return;
    GAME.tutorial = null;
    hideGuide();
}

// Mapa fijo: un camino por la fila del medio con las casillas principales
function buildTutorialMap() {
    const T = window.NODE_TYPES;
    const { cols, rows } = TUT_MAP;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(T.EMPTY));
    [T.EMPTY, T.ENEMY, T.REST, T.TREASURE, T.MYSTERY, T.SHOP].forEach((t, x) => { grid[1][x] = t; });
    for (let y = 0; y < rows; y++) grid[y][cols - 1] = T.BOSS;
    grid[0][4] = T.ELITE;
    grid[2][2] = T.ELITE;
    grid[2][5] = T.ELITE;
    // muros: no se puede salir de la fila del medio
    const wallsH = Array.from({ length: rows - 1 }, () => Array(cols).fill(true));
    const wallsV = Array.from({ length: rows }, (_, y) => Array(cols - 1).fill(y !== 1));
    return { grid, walls: { wallsV, wallsH, bossY: 1, bossId: 'mango_zombie', themeId: 'huerto', rivers: [], cols, rows, seed: 42 } };
}

function startTutorial() {
    GAME.selectedDifficulty = 'madura';
    const p = new Player();
    const def = window.CHARACTER_DB.manzana;
    p.characterId = 'manzana';
    p.name = def.name;
    p.maxHp = def.baseHp;
    p.hp = def.baseHp;
    p.difficulty = 'verde';
    p.gold = 130;
    p.act = 1;
    p.floor = 1;
    p.plan = window.planRun();
    p.deck = window.starterDeckFor('manzana');
    GAME.player = p;
    GAME.combat = null;
    GAME.anim = false;
    GAME.dungeon = null;
    const m = buildTutorialMap();
    GAME.map = m.grid;
    GAME.walls = m.walls;
    GAME.playerPos = { x: 0, y: 1 };
    GAME.visited = ['0,1'];
    GAME.mapPan = null;
    GAME.tutorial = { i: 0, lastScreen: 'map', firstFight: true, flags: {} };
    GAME.screen = 'map';
    render();
    showGuide();
}

// ---------- avanzar ----------
function tutStep() { return GAME.tutorial ? TUT_STEPS[GAME.tutorial.i] : null; }
function tutNextIndex(from) {
    let i = from;
    while (TUT_STEPS[i] && TUT_STEPS[i].skipIf && TUT_STEPS[i].skipIf()) i++;
    return i;
}
// Botón "Siguiente" de un paso de lectura
function tutAdvance() {
    const t = GAME.tutorial;
    if (!t || t.quitAsk) return;
    const s = tutStep();
    if (s && !s.next) return; // los pasos de acción solo avanzan cumpliendo lo que piden
    t.i = tutNextIndex(t.i + 1);
    tutCheck();
    if (!TUT_STEPS[t.i]) { hideGuide(); return; }
    showGuide();
}
// Avanza los pasos de acción ya cumplidos y, si la pantalla no corresponde
// al paso actual, salta hacia adelante (nunca hacia atrás) al siguiente paso de esa pantalla.
// Devuelve true si cambió de paso.
function tutCheck() {
    const t = GAME.tutorial;
    if (!t) return false;
    const start = t.i;
    for (let guard = 0; guard < 40; guard++) {
        const s = TUT_STEPS[t.i];
        if (!s) break;
        if (s.until && s.until()) { t.praise = true; t.i = tutNextIndex(t.i + 1); continue; }
        if (s.screen && s.screen !== GAME.screen && !GAME.anim) {
            const j = TUT_STEPS.findIndex((x, k) => k > t.i && x.screen === GAME.screen);
            if (j > t.i) { t.i = tutNextIndex(j); continue; }
        }
        break;
    }
    return t.i !== start;
}
function tutorialNotify(evt) {
    const t = GAME.tutorial;
    if (!t) return;
    t.flags[evt] = true;
    if (tutCheck()) { if (TUT_STEPS[t.i]) showGuide(); else hideGuide(); }
}
// Después de cada dibujo: revisar si ya se cumplió el paso y volver a iluminar
function tutorialAfterRender() {
    const t = GAME.tutorial;
    if (!t) return;
    t.lastScreen = GAME.screen;
    if (tutCheck()) { if (TUT_STEPS[t.i]) { showGuide(); return; } hideGuide(); return; }
    if (t.quitAsk) return; // está preguntando si salir: no se toca el globo
    highlightSpot();
    placeGuide();
}

// ---------- globo de Profe Limón ----------
function guideEl() {
    let g = document.getElementById('guide');
    if (!g) {
        g = document.createElement('div');
        g.id = 'guide';
        document.getElementById('app').appendChild(g);
    }
    return g;
}
let tutRingTimer = null;
function hideGuide() {
    clearInterval(tutRingTimer);
    tutRingTimer = null;
    const g = document.getElementById('guide');
    if (g) g.remove();
    document.querySelectorAll('.tut-spot').forEach((el) => el.classList.remove('tut-spot'));
    const screen = document.getElementById('screen');
    if (screen) screen.classList.remove('tut-lockdown', 'tut-solo');
}
function showGuide() {
    const s = tutStep();
    if (!s) return;
    const g = guideEl();
    const tut = GAME.tutorial;
    // preguntar antes de salir (✕ o Esc): tapa todo hasta que se responda
    if (tut.quitAsk) {
        g.className = 'guide pos-center blocking';
        g.innerHTML = `
            <div class="guide-blocker"></div>
            <div class="guide-box">
                <div class="guide-fruit">${art('profe_limon', '🍋', { size: 'xl' })}</div>
                <div class="guide-bubble reading">
                    <p>¿Salir del tutorial?</p>
                    <div class="guide-ask"><button class="secondary" onclick="tutQuit(true)">Salir</button><button class="btn-mint" onclick="tutQuit(false)">Seguir</button></div>
                </div>
            </div>`;
        return;
    }
    g.className = `guide pos-${s.pos || 'bl'} ${s.next ? 'blocking' : ''}`;
    const praise = tut.praise;
    tut.praise = false;
    if (praise && window.Sfx) Sfx.buff();
    const pct = Math.round(((tut.i + 1) / TUT_TOTAL) * 100);
    const text = typeof s.text === 'function' ? s.text() : s.text;
    g.innerHTML = `
        ${s.next ? '<div class="guide-blocker"></div>' : ''}
        <div class="tut-rings"></div>
        <div class="guide-box">
            <div class="guide-fruit ${praise ? 'cheer' : ''}">${art('profe_limon', '🍋', { size: 'xl', mood: praise ? 'happy' : undefined })}${praise ? '<span class="guide-praise hand">¡Muy bien!</span>' : ''}</div>
            <div class="guide-bubble ${s.next ? 'reading' : 'doing'}">
                <i class="guide-progress"><b style="width:${pct}%"></b></i>
                <button class="guide-quit x-btn" onclick="tutQuit()" ${tip(['Salir del tutorial', IS_PHONE ? '' : 'También con Esc.'])}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg></button>
                <p>${text}</p>
                ${s.next ? '<button class="btn-mint guide-next" onclick="tutAdvance()">Siguiente ›</button>' : ''}
            </div>
        </div>`;
    restartClass(g.querySelector('.guide-box'), 'pop-in');
    highlightSpot();
    placeGuide();
    // los marcos siguen a lo iluminado si se mueve (mapa que se desliza, mano que se reacomoda)
    if (!tutRingTimer) tutRingTimer = setInterval(() => { if (placeSpotRings(false)) placeGuide(); }, 350);
}
// Pone el globo donde no tape lo que se está explicando: prueba la
// posición preferida y luego las esquinas, y se queda con la que menos tapa.
const GUIDE_POSITIONS = ['bl', 'br', 'tl', 'tr', 'bottom', 'top', 'ml', 'mr'];
function placeGuide() {
    const g = document.getElementById('guide');
    const s = tutStep();
    if (!g || !s) return;
    const box = g.querySelector('.guide-box');
    const setPos = (pos) => { g.className = g.className.replace(/pos-\S+/, `pos-${pos}`); void box.offsetWidth; };
    const preferred = s.pos || 'bl';
    // no tapar lo iluminado ni lo que el paso pida dejar a la vista (avoid) ni la barra de arriba
    const rects = [...document.querySelectorAll(`.tut-spot${s.avoid ? `, ${s.avoid}` : ''}, #screen > .hud > *`)].map((el) => el.getBoundingClientRect());
    if (!document.querySelector('.tut-spot') || preferred === 'center') { setPos(preferred); return; }
    const overlap = () => {
        const b = box.getBoundingClientRect();
        return rects.reduce((sum, r) => sum + Math.max(0, Math.min(b.right, r.right) - Math.max(b.left, r.left))
            * Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top)), 0);
    };
    let best = preferred, bestArea = Infinity;
    for (const pos of [preferred, ...GUIDE_POSITIONS.filter((p) => p !== preferred)]) {
        setPos(pos);
        const area = overlap();
        if (area < bestArea) { bestArea = area; best = pos; }
        if (area === 0) break;
    }
    setPos(best);
}
function highlightSpot() {
    document.querySelectorAll('.tut-spot').forEach((el) => el.classList.remove('tut-spot'));
    const s = tutStep();
    const screen = document.getElementById('screen');
    // pasos de acción: se oscurece todo y solo se puede tocar lo resaltado, para
    // que no se pierdan probando otra cosa (y no puedan saltarse lo que se pide)
    const sel = s && (typeof s.spot === 'function' ? s.spot() : s.spot);
    const spots = sel ? [...document.querySelectorAll(sel)].slice(0, 12) : [];
    spots.forEach((el) => el.classList.add('tut-spot'));
    // las cartas que este paso no permite se ven apagadas
    if (GAME.combat && GAME.screen === 'combat') {
        document.querySelectorAll('.hand-row .fan-slot').forEach((slot, k) => {
            const card = window.getCard(GAME.combat.player.hand[k]);
            slot.classList.toggle('tut-off', !!(s && !s.next && sel && sel.includes('.hand-row') && !tutCardAllowed(card)));
        });
    }
    // solo se bloquea si hay algo resaltado que tocar: así nunca se queda atorado
    if (screen) screen.classList.toggle('tut-lockdown', !!(s && s.until && spots.length));
    if (screen) screen.classList.toggle('tut-solo', spots.length === 1);
    placeSpotRings(true);
    // durante un momento se recolocan en cada cuadro: lo iluminado puede estar entrando con animación
    const t0 = performance.now();
    const follow = (now) => { if (GAME.tutorial && now - t0 < 1300) { placeSpotRings(true); requestAnimationFrame(follow); } else if (GAME.tutorial && !GAME.tutorial.quitAsk) placeGuide(); };
    requestAnimationFrame(follow);
}
// El brillo es un marco aparte (dentro de #guide) puesto encima de cada elemento iluminado:
// así lo iluminado no cambia de posición, de forma ni de animación. Con un solo elemento en
// un paso de acción, la sombra del marco oscurece todo lo demás.
// exact = false: solo se mueve si el elemento cambió de sitio de verdad (no por su vaivén de reposo).
function placeSpotRings(exact) {
    const g = document.getElementById('guide');
    const layer = g && g.querySelector('.tut-rings');
    const screen = document.getElementById('screen');
    if (!layer || !screen) return false;
    let moved = false;
    const spots = [...document.querySelectorAll('.tut-spot')];
    const app = document.getElementById('app').getBoundingClientRect();
    const solo = spots.length === 1 && screen.classList.contains('tut-lockdown');
    while (layer.children.length > spots.length) layer.lastChild.remove();
    spots.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        let ring = layer.children[i];
        if (!ring) { ring = document.createElement('i'); ring.className = 'tut-ring'; layer.appendChild(ring); }
        ring.classList.toggle('solo', solo);
        const pad = 6;
        const x = (r.left - app.left) / SCALE - pad, y = (r.top - app.top) / SCALE - pad;
        const w = r.width / SCALE + pad * 2, h = r.height / SCALE + pad * 2;
        const was = ring.tutBox;
        if (!exact && was && Math.abs(was.x - x) < 12 && Math.abs(was.y - y) < 12 && Math.abs(was.w - w) < 12 && Math.abs(was.h - h) < 12) return;
        ring.tutBox = { x, y, w, h };
        moved = true;
        const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) * localZoom(el) || 0, Math.min(w, h) / 2);
        Object.assign(ring.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: `${Math.max(14, radius + pad)}px` });
    });
    return moved;
}

// ---------- fin ----------
function renderTutorialEnd() {
    const learned = [
        ['node_enemy', 'Combates', 'cartas, energía, intenciones y daño real'],
        ['ui_shield', 'Cáscara', 'se gasta antes que tu vida'],
        ['ui_bag', 'Mochila', IS_PHONE ? 'objetos y semillas' : 'objetos y semillas (tecla I)'],
        ['node_rest', 'Campamento', 'curarte, madurar o despegar'],
        ['node_mystery', 'Misterios', 'decisiones con premio o riesgo'],
        ['node_shop', 'Tiendita', 'cartas, objetos y semillas']
    ];
    const tips = [
        IS_PHONE ? 'Mantén el dedo sobre cualquier cosa para ver qué hace.' : 'Pasa el mouse sobre cualquier cosa para ver qué hace.',
        'Cada piso tiene su regla: léela al empezar el combate.',
        'Cada enemigo derrotado da experiencia para el <b>Pase de Batalla</b> (colores y accesorios para tus frutas).',
        'En la <b>Colección</b> del menú puedes repasar tus cartas, objetos, semillas y a cada enemigo que conozcas.',
        'Un mazo pequeño y bien madurado suele ganarle a uno grande.'
    ];
    return panel(art('profe_limon', '🍋', { size: 'xl', mood: 'happy' }), '¡Tutorial completado!', `
        <div class="tut-learned">${learned.map(([sp, name, what], i) => `<div class="tut-chip" style="--i:${i}">${art(sp, '', { size: 'md' })}<b class="hand">${name}</b><span>${what}</span></div>`).join('')}</div>
        <ul class="tut-tips">${tips.map((x) => `<li>${x}</li>`).join('')}</ul>
        <p>En una partida de verdad hay <b>3 castillos de 3 pisos</b>, con jefes guardianes, mesas de juegos y muchas sorpresas. ¡Sube la torre y rescata al Rey Fruta!</p>
        <div class="controls-row">
            <button class="btn-mint" onclick="goToCharacterSelect()">¡Jugar de verdad!</button>
            <button class="secondary" onclick="startTutorial()">Repetir tutorial</button>
            <button class="secondary" onclick="showMainMenu()">Volver al menú</button>
        </div>`, 'celebrate wide');
}

// ✕ o Esc: Profe Limón pregunta antes de salir. tutQuit(true) sale, tutQuit(false) sigue.
function tutQuit(answer) {
    const t = GAME.tutorial;
    if (!t) return;
    if (answer === true) { showMainMenu(); return; }
    t.quitAsk = answer !== false && !t.quitAsk;
    hideTip();
    showGuide();
}
// Pasos con tap: tocar lo iluminado muestra su explicación (en teléfono no hay mouse que pasar por encima)
document.addEventListener('click', (e) => {
    const s = tutStep();
    if (!s || !s.tap || !e.target.closest) return;
    const el = e.target.closest('.tut-spot[data-tip]') || (e.target.closest('.tut-spot') && e.target.closest('[data-tip]'));
    if (el) showTip(el);
});
// ¿Se puede jugar esta carta en el paso actual?
function tutCardAllowed(card) {
    if (!GAME.tutorial) return true;
    const s = tutStep();
    if (!s || s.next) return false;
    if (s.cards) return !!card && card.type === s.cards;
    const sel = typeof s.spot === 'function' ? s.spot() : s.spot;
    return !!sel && sel.includes('.hand-row');
}
// Avisa (con la misma frase de Profe Limón) cuando se intenta otra cosa
function tutDenied(el) {
    if (window.Sfx) Sfx.denied();
    if (el) restartClass(el, 'nope');
    const box = document.querySelector('#guide .guide-box');
    if (box) restartClass(box, 'guide-shake');
}
// Teclado durante el tutorial: Enter / espacio / → avanzan los pasos de
// lectura, Esc pregunta si quieres salir, y cualquier otro atajo se bloquea
// (salvo las teclas que el paso permita). Va en captura sobre window para
// ganarle a los demás atajos del juego.
window.addEventListener('keydown', (e) => {
    if (!GAME.tutorial || ['tutorial-end', 'menu'].includes(GAME.screen)) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const s = tutStep();
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === 'Escape') { stop(); tutQuit(); return; }
    if (s && s.next && ['Enter', ' ', 'ArrowRight'].includes(e.key)) { stop(); tutAdvance(); return; }
    if (s && s.keys && s.keys.includes(e.key)) return;
    if (['Tab', 'F5', 'F11', 'F12'].includes(e.key) || e.ctrlKey || e.metaKey) return;
    stop();
}, true);

Object.assign(window, { startTutorial, tutAdvance, exitTutorial, tutorialNotify, tutQuit, tutCardAllowed, tutDenied });
