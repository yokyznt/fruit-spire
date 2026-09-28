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

const TUT_STEPS = [
    // ---------- el mapa ----------
    { screen: 'map', pos: 'center', next: true, text: '¡Hola! Soy Profe Limón. Te voy a enseñar a jugar Fruit Spire, paso a paso. Tu misión: subir los 3 castillos y rescatar al Rey Fruta.' },
    { screen: 'map', pos: 'top', next: true, spot: '#player-token', text: 'Esta es tu fruta. Cada piso es un mapa que se cruza de izquierda a derecha, hasta el jefe.' },
    { screen: 'map', pos: 'top', next: true, spot: '.wall', text: 'Solo puedes avanzar adelante, arriba o abajo. Nunca hacia atrás, ni a casillas ya pisadas. Las cintas de colores son muros.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('combat'), text: 'Las casillas con borde verde son a donde puedes ir. Toca la del enemigo para pelear.' },

    // ---------- el primer combate ----------
    { screen: 'combat', pos: 'top', next: true, spot: '#enemy-0', text: '¡Tu primer combate! Este es el enemigo. Tienes que bajar su vida a 0.' },
    { screen: 'combat', pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: 'Esta burbuja es su intención: lo que hará en su turno. La espada con un número es cuánto daño te hará.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.combatant.player .plate', text: 'Esta es tu vida. Si llega a 0, pierdes la partida.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.hand-row', text: 'Abajo está tu mano de cartas. Cada turno robas 5 cartas nuevas.' },
    { screen: 'combat', pos: 'top', next: true, spot: '.energy-orange', text: 'La naranja es tu energía. Cada carta cuesta lo que dice su bolita naranja. Se recarga cada turno.' },
    { screen: 'combat', pos: 'top', spot: '.hand-row', until: tutFlag('card:attack'), text: 'Arrastra un Golpe de Cáscara hacia arriba, sobre el enemigo, para atacarlo.' },
    {
        screen: 'combat', pos: 'top', spot: '.hand-row', until: tutFlag('card:skill'),
        text: '¡Eso! Ahora arrastra un Jugo Defensivo hacia arriba: te da cáscara, que bloquea el daño del enemigo.',
        skipIf: () => {
            const c = GAME.combat;
            return !c || c.player.energy < 1 || !c.player.hand.some((id) => (window.getCard(id) || {}).type === 'skill');
        }
    },
    { screen: 'combat', pos: 'top', next: true, spot: '.pile', text: 'Estas son tus pilas: a la izquierda la de robo y a la derecha el descarte. Cuando se acaba la de robo, el descarte se baraja.' },
    { screen: 'combat', pos: 'top', spot: '.end-turn', until: tutFlag('turn-end'), text: 'Cuando ya no quieras jugar más cartas, pulsa Terminar turno. Entonces actúa el enemigo.' },
    { screen: 'combat', pos: 'top', until: tutScreen('reward'), text: 'Tu cáscara absorbió el golpe. Sigue jugando cartas y terminando turnos hasta ganar. ¡Tú puedes!' },

    // ---------- el resto del mapa ----------
    { screen: 'reward', pos: 'bl', spot: '.reward-row .card', until: tutScreen('map'), text: '¡Ganaste! Te llevas oro y tienes que elegir una carta nueva para tu mazo. Toca la que más te guste.' },
    { screen: 'map', pos: 'bl', next: true, spot: '.hud-seeds', text: '¡También ganaste una semilla! Está arriba, en tu bolsa. En combate, tócala en tu turno para usarla. Cada una sirve una sola vez.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('rest'), text: 'Ahora ve al campamento, la casilla de la fogata.' },
    {
        screen: 'rest', pos: 'bl', spot: '.rest-option, .reward-row.picker .card, button[onclick*="setRestMode"]', until: tutScreen('map'),
        text: 'En el campamento eliges UNA cosa: Descansar para curarte, Madurar para mejorar una carta, o Despegar para quitarla de tu mazo. Elige una.'
    },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('treasure'), text: 'Sigue hacia el cofre del tesoro.' },
    {
        screen: 'treasure', pos: 'bl', spot: 'button[onclick*="closeEventResult"], .hud-bag', until: tutScreen('map'),
        text: '¡Un objeto! Te ayuda durante todo el viaje. Tus objetos se guardan en la mochila de arriba: tócala cuando quieras para verlos. Pulsa Continuar.'
    },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('event'), text: 'El sobre es un misterio: un evento con decisiones. ¡Vamos!' },
    { screen: 'event', pos: 'bl', spot: '.event-options button', until: tutScreen('event-result'), text: 'Lee y elige una opción. Algunas tienen premio y otras, riesgo.' },
    { screen: 'event-result', pos: 'bl', spot: 'button[onclick*="closeEventResult"]', until: tutScreen('map'), text: 'Eso fue lo que pasó. Pulsa Continuar para volver al mapa.' },
    { screen: 'map', pos: 'top', spot: '.node.reachable', until: tutScreen('shop'), text: 'Ahora la tiendita.' },
    { screen: 'shop', pos: 'bl', spot: '.shop-item', until: tutFlag('shop-buy'), text: 'Aquí gastas tu oro en cartas, objetos, semillas o en quitar una carta de tu mazo. Toca algo para comprarlo.' },
    { screen: 'shop', pos: 'bl', spot: 'button[onclick*="leaveShop"]', until: tutScreen('map'), text: '¡Comprado! Cuando termines, pulsa Salir.' },
    { screen: 'map', pos: 'top', next: true, spot: '.node.elite', text: 'Las casillas de fuego son élites: enemigos duros que te dan un objeto. Hoy no pasarás por ahí. Otras casillas, como las Mesas de Juegos, traen dados, póker y ajedrez.' },
    { screen: 'map', pos: 'top', spot: '.boss-lair', until: tutScreen('combat'), text: 'Al final está la guarida del jefe. Vencerlo te lleva al siguiente piso. ¡Entra!' },
    { screen: 'combat', pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: '¡El jefe! Mira siempre su intención: si va a atacar fuerte, protégete con cáscara.' },
    { screen: 'combat', pos: 'top', until: tutScreen('tutorial-end'), text: '¡Vamos, dale con todo!' }
];

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
        if (s.until && s.until()) { t.i = tutNextIndex(t.i + 1); continue; }
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
    if (screen) screen.classList.remove('tut-lockdown');
}
function showGuide() {
    const s = tutStep();
    if (!s) return;
    const g = guideEl();
    g.className = `guide pos-${s.pos || 'bl'} ${s.next ? 'blocking' : ''}`;
    g.innerHTML = `
        ${s.next ? '<div class="guide-blocker"></div>' : ''}
        <div class="guide-box">
            <div class="guide-fruit">${art('profe_limon', '🍋', { size: 'xl' })}</div>
            <div class="guide-bubble">
                <b class="hand">Profe Limón</b>
                <p>${s.text}</p>
                <div class="guide-actions">
                    ${s.next ? `<button class="btn-mint" onclick="tutAdvance()">Siguiente</button>` : '<span class="guide-hint hand">¡Hazlo para seguir!</span>'}
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
    if (screen) screen.classList.toggle('tut-lockdown', !!(s && s.until && s.spot));
    if (!s || !s.spot) return;
    [...document.querySelectorAll(s.spot)].slice(0, 12).forEach((el) => el.classList.add('tut-spot'));
}

// ---------- fin ----------
function renderTutorialEnd() {
    return panel(art('profe_limon', '🍋', { size: 'xl' }), '¡Tutorial completado!', `
        <p>Ya conoces el mapa, el combate, los campamentos, los tesoros, los misterios y la tiendita.
        En una partida de verdad hay 3 castillos de 3 pisos cada uno, con jefes guardianes, mesas de juegos y muchas sorpresas.
        ¡Sube la torre y rescata al Rey Fruta!</p>
        <div class="controls-row">
            <button class="btn-mint" onclick="goToCharacterSelect()">¡Jugar de verdad!</button>
            <button class="secondary" onclick="showMainMenu()">Volver al menú</button>
        </div>`, 'celebrate');
}

Object.assign(window, { startTutorial, tutAdvance, exitTutorial, tutorialNotify });
