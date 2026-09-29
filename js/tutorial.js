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
// El juego avisa acciones con tutorialNotify('card:attack' | 'card:skill' | 'turn-end' | 'shop-buy').
// ============================================================

const TUT_MAP = { cols: 8, rows: 3 };
const tutFlag = (name) => () => !!(GAME.tutorial && GAME.tutorial.flags[name]);
const tutScreen = (name) => () => GAME.screen === name;

const tutCanPlaySkill = () => {
    const c = GAME.combat;
    return !!c && c.turn === 'player' && c.player.hand.some((id) => (window.getCard(id) || {}).type === 'skill' && c.canPlay(id));
};

const TUT_STEPS = [
    // ---------- el mapa ----------
    { ch: 'El mapa', screen: 'map', pos: 'center', next: true, text: '¡Hola! Soy <b>Profe Limón</b>. Te voy a enseñar a jugar Fruit Spire, paso a paso. Tu misión: subir los <b>3 castillos</b> y rescatar al Rey Fruta. (Puedes avanzar con <b>Enter</b>).' },
    { ch: 'El mapa', screen: 'map', pos: 'top', next: true, spot: '#player-token', text: 'Esta es tu fruta. Cada piso es un mapa que se cruza de izquierda a derecha, hasta la guarida del jefe.' },
    { ch: 'El mapa', screen: 'map', pos: 'top', next: true, spot: '.wall', text: 'Solo puedes avanzar adelante, arriba o abajo. Nunca hacia atrás, ni a casillas ya pisadas. Las cintas de colores son muros.' },
    { ch: 'El mapa', screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('combat'), text: 'Las casillas con borde verde punteado son a donde puedes ir. Toca la del enemigo para pelear.' },

    // ---------- el primer combate ----------
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '#enemy-0', text: '¡Tu primer combate! Este es el enemigo. Tienes que bajar su vida a 0.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: 'Esta burbuja es su <b>intención</b>: lo que hará en su turno. La espada con un número es el daño que te hará <b>de verdad</b>, ya contando sus mejoras y tus debilidades.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '.combatant.player .plate', text: 'Esta es tu vida. Si llega a 0, pierdes la partida.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '.hand-row', text: 'Abajo está tu mano de cartas. Cada turno robas 5 cartas nuevas.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '.energy-orange', text: 'La naranja es tu <b>energía</b>. Cada carta cuesta lo que dice su bolita naranja. Se recarga cada turno.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', spot: '.hand-row', until: tutFlag('card:attack'), text: 'Arrastra un <b>Golpe de Cáscara</b> hacia arriba, sobre el enemigo. Mientras lo arrastras, un globito sobre él te dice el <b>daño real</b> que le harás (y si lo derrotas).' },
    {
        // también se da por cumplido si ya no puede jugar ninguna habilidad (para no atorarse)
        ch: 'Combate', screen: 'combat', pos: 'top', spot: '.hand-row',
        until: () => tutFlag('card:skill')() || !tutCanPlaySkill(),
        text: '¡Eso! Ahora arrastra un <b>Jugo Defensivo</b> hacia arriba: te da <b>cáscara</b>, que te protege del próximo golpe.',
        skipIf: () => !tutCanPlaySkill()
    },
    {
        ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '.combatant.player .combat-block-badge',
        text: 'Este escudito es tu cáscara. Cuando te pegan, <b>primero se gasta la cáscara</b> y solo lo que sobra te quita vida. Ojo: se pierde al empezar tu siguiente turno.',
        skipIf: () => !GAME.combat || GAME.combat.player.block <= 0
    },
    {
        ch: 'Combate', screen: 'combat', pos: 'top', spot: '#enemy-0 .intent-bubble', until: tutFlag('tip:intent'),
        text: 'Casi todo tiene explicación. <b>Pasa el mouse</b> (o toca) sobre la intención del enemigo para ver exactamente qué va a hacer. Las palabras de colores de las cartas también se explican así.',
        skipIf: () => !document.querySelector('#enemy-0 .intent-bubble')
    },
    { ch: 'Combate', screen: 'combat', pos: 'top', next: true, spot: '.pile', text: 'Estas son tus pilas: a la izquierda la de robo y a la derecha el descarte. Cuando se acaba la de robo, el descarte se baraja.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', spot: '.end-turn', until: tutFlag('turn-end'), text: 'Cuando ya no quieras jugar más cartas, pulsa <b>Terminar turno</b>. Entonces actúa el enemigo: mira cómo su golpe gasta primero tu cáscara.' },
    { ch: 'Combate', screen: 'combat', pos: 'top', until: tutScreen('reward'), text: 'Sigue jugando cartas y terminando turnos hasta ganar. Si el enemigo va a pegar fuerte, ¡protégete! Tú puedes.' },

    // ---------- recompensas ----------
    { ch: 'Recompensas', screen: 'reward', pos: 'bl', spot: '.reward-row .card', until: tutScreen('map'), text: '¡Ganaste! Mira arriba: el oro ganado se suma a tu bolsa. Ahora <b>elige una carta</b> nueva para tu mazo (es obligatorio). Toca la que más te guste.' },
    { ch: 'Recompensas', screen: 'map', pos: 'bl', next: true, spot: '.hud-bag', text: 'También ganaste una <b>semilla</b>. Se guarda en tu <b>Mochila</b>, arriba, junto con tus objetos (se abre tocándola o con la tecla <b>I</b>). La usaremos contra el jefe.' },

    // ---------- el resto del mapa ----------
    { ch: 'Campamento', screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('rest'), text: 'Ahora ve al campamento, la casilla de la fogata.' },
    {
        ch: 'Campamento', screen: 'rest', pos: 'bl', spot: '.rest-option, .reward-row.picker .card, button[onclick*="setRestMode"]', until: tutScreen('map'),
        text: 'En el campamento eliges UNA cosa: <b>Descansar</b> para curarte, <b>Madurar</b> para mejorar una carta, o <b>Despegar</b> para quitarla de tu mazo. Elige una.'
    },
    { ch: 'Tesoro', screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('treasure'), text: 'Sigue hacia el cofre del tesoro.' },
    {
        ch: 'Tesoro', screen: 'treasure', pos: 'bl', spot: 'button[onclick*="closeEventResult"], .hud-bag', until: tutScreen('map'),
        text: '¡Un <b>objeto</b>! Funciona solo durante todo el viaje. Se guarda en tu Mochila, donde puedes verlo en grande. Pulsa Continuar.'
    },
    { ch: 'Misterio', screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('event'), text: 'El sobre es un <b>misterio</b>: un evento con decisiones. ¡Vamos!' },
    { ch: 'Misterio', screen: 'event', pos: 'bl', spot: '.event-options button', until: tutScreen('event-result'), text: 'Lee y elige una opción. Algunas tienen premio y otras, riesgo.' },
    { ch: 'Misterio', screen: 'event-result', pos: 'bl', spot: 'button[onclick*="closeEventResult"]', until: tutScreen('map'), text: 'Eso fue lo que pasó. Pulsa Continuar para volver al mapa.' },
    { ch: 'Tiendita', screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('shop'), text: 'Ahora la tiendita.' },
    { ch: 'Tiendita', screen: 'shop', pos: 'bl', spot: '.shop-item, .reward-row.picker .card, button[onclick*="closeShopPicker"]', until: tutFlag('shop-buy'), text: 'Aquí gastas tu oro en cartas, objetos, semillas o en quitar una carta de tu mazo. Toca algo para comprarlo.' },
    { ch: 'Tiendita', screen: 'shop', pos: 'bl', spot: 'button[onclick*="leaveShop"]', until: tutScreen('map'), text: '¡Comprado! Cuando termines, pulsa Salir.' },
    { ch: 'El jefe', screen: 'map', pos: 'top', next: true, spot: '.node.elite', text: 'Las casillas de fuego son <b>élites</b>: enemigos duros que dan un objeto. En los castillos también hay <b>Mesas de Juegos</b> (dados, póker y ajedrez), trampillas a calabozos y más sorpresas.' },
    { ch: 'El jefe', screen: 'map', pos: 'top', spot: '.boss-lair', until: tutScreen('combat'), text: 'Al final está la guarida del jefe. Vencerlo te lleva al siguiente piso. ¡Entra!' },

    // ---------- el jefe ----------
    {
        ch: 'El jefe', screen: 'combat', pos: 'top', spot: '.rule-chip', until: tutFlag('tip:rule'),
        text: 'Cada piso tiene una <b>regla</b> que cambia los combates (¡y hasta el fondo!). Pasa el mouse sobre esta etiqueta para leer la de aquí.',
        skipIf: () => !document.querySelector('.rule-chip')
    },
    { ch: 'El jefe', screen: 'combat', pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: '¡El jefe! Mira siempre su intención: si va a atacar fuerte, protégete con cáscara.' },
    {
        ch: 'El jefe', screen: 'combat', pos: 'top', spot: '.hud-bag', until: () => !!GAME.inventory || tutFlag('seed-use')(),
        text: 'Hora de usar tu semilla. Abre la <b>Mochila</b> (arriba): brilla cuando es tu turno y tienes una semilla lista.',
        skipIf: () => !GAME.player || !(GAME.player.seeds || []).some(Boolean)
    },
    {
        ch: 'El jefe', screen: 'combat', pos: 'top', spot: '.inv-seed .btn-mint', until: tutFlag('seed-use'),
        text: 'Aquí están tus semillas y tus objetos. Pulsa <b>Usar</b> en la semilla: cada una sirve una sola vez.',
        skipIf: () => !GAME.player || !(GAME.player.seeds || []).some(Boolean)
    },
    { ch: 'El jefe', screen: 'combat', pos: 'top', until: tutScreen('tutorial-end'), text: '¡Buenísimo! Ahora termina con él: ¡dale con todo!' }
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
    if (!t) return;
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
function hideGuide() {
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
    g.className = `guide pos-${s.pos || 'bl'} ${s.next ? 'blocking' : ''}`;
    const tut = GAME.tutorial;
    const praise = tut.praise;
    tut.praise = false;
    if (praise && window.Sfx) Sfx.buff();
    const pct = Math.round(((tut.i + 1) / TUT_TOTAL) * 100);
    g.innerHTML = `
        ${s.next ? '<div class="guide-blocker"></div>' : ''}
        <div class="guide-box">
            <div class="guide-fruit ${praise ? 'cheer' : ''}">${art('profe_limon', '🍋', { size: 'xl', mood: praise ? 'happy' : undefined })}${praise ? '<span class="guide-praise hand">¡Muy bien!</span>' : ''}</div>
            <div class="guide-bubble">
                <div class="guide-progress"><span class="hand">${s.ch || ''}</span><i><b style="width:${pct}%"></b></i><small>${tut.i + 1}/${TUT_TOTAL}</small></div>
                <b class="hand">Profe Limón</b>
                <p>${s.text}</p>
                <div class="guide-actions">
                    ${s.next ? `<button class="btn-mint" onclick="tutAdvance()">Siguiente <small>(Enter)</small></button>` : '<span class="guide-hint hand">¡Hazlo para seguir!</span>'}
                    <button class="secondary guide-exit" onclick="if(confirm('¿Salir del tutorial?')) showMainMenu()">Salir</button>
                </div>
            </div>
        </div>`;
    restartClass(g.querySelector('.guide-box'), 'pop-in');
    highlightSpot();
    placeGuide();
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
    const rects = [...document.querySelectorAll('.tut-spot')].map((el) => el.getBoundingClientRect());
    if (!rects.length || preferred === 'center') { setPos(preferred); return; }
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
    const spots = s && s.spot ? [...document.querySelectorAll(s.spot)].slice(0, 12) : [];
    spots.forEach((el) => el.classList.add('tut-spot'));
    // solo se bloquea si hay algo resaltado que tocar: así nunca se queda atorado
    if (screen) screen.classList.toggle('tut-lockdown', !!(s && s.until && spots.length));
    if (screen) screen.classList.toggle('tut-solo', spots.length === 1);
}

// ---------- fin ----------
function renderTutorialEnd() {
    const learned = [
        ['node_enemy', 'Combates', 'cartas, energía, intenciones y daño real'],
        ['ui_shield', 'Cáscara', 'se gasta antes que tu vida'],
        ['ui_bag', 'Mochila', 'objetos y semillas (tecla I)'],
        ['node_rest', 'Campamento', 'curarte, madurar o despegar'],
        ['node_mystery', 'Misterios', 'decisiones con premio o riesgo'],
        ['node_shop', 'Tiendita', 'cartas, objetos y semillas']
    ];
    const tips = [
        'Pasa el mouse sobre cualquier cosa para ver qué hace.',
        'Cada piso tiene su regla: léela al empezar el combate.',
        'Cada enemigo derrotado da experiencia para el <b>Pase de Batalla</b> (colores y accesorios para tus frutas).',
        'En el <b>Bestiario</b> del menú puedes repasar a cada enemigo que conozcas.',
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

// Enter, espacio o flecha derecha: "Siguiente" en los pasos de lectura
document.addEventListener('keydown', (e) => {
    const s = tutStep();
    if (!s || !s.next || !['Enter', ' ', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    tutAdvance();
});

Object.assign(window, { startTutorial, tutAdvance, exitTutorial, tutorialNotify });
