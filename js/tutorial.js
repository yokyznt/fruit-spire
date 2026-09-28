// ============================================================
// TUTORIAL.JS — "Cómo jugar": un mapa chiquito con un camino fijo por
// todas las casillas, y Profe Limón guiando cada paso.
//
// Cada paso de TUT_STEPS tiene:
//   text   lo que dice Profe Limón
//   spot   selector de lo que se ilumina en pantalla (opcional)
//   pos    dónde sale el globo: 'bl' abajo-izquierda | 'top' | 'center'
//   next   true → se avanza con el botón "Siguiente" (el juego espera)
//   wait   evento que hay que hacer para avanzar: 'screen:<pantalla>',
//          'card:attack', 'card:skill', 'turn-end'
//   skipIf() → true para saltarse el paso
// El juego avisa los eventos con tutorialNotify(evento).
// ============================================================

const TUT_MAP = { cols: 8, rows: 3 };
const NORMAL_MAP = { cols: 12, rows: 7 };

const TUT_STEPS = [
    // ---------- el mapa ----------
    { pos: 'center', next: true, text: '¡Hola! Soy Profe Limón. Te voy a enseñar a jugar Fruit Spire, paso a paso.' },
    { pos: 'top', next: true, spot: '#player-token', text: 'Esta es tu fruta. Tu viaje va por el mapa, de izquierda a derecha, hasta el jefe.' },
    { pos: 'top', next: true, spot: '.wall', text: 'Solo puedes avanzar adelante, arriba o abajo. Nunca hacia atrás, ni a casillas ya pisadas. Las cintas de colores son muros.' },
    { pos: 'top', wait: 'screen:combat', spot: '.node.reachable', text: 'Las casillas con borde verde son a donde puedes ir. Toca la del enemigo para pelear.' },

    // ---------- el primer combate ----------
    { pos: 'top', next: true, spot: '#enemy-0', text: '¡Tu primer combate! Este es el enemigo. Tienes que bajar su vida a 0.' },
    { pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: 'Esta burbuja es su intención: lo que hará en su turno. La espada con un número es cuánto daño te hará.' },
    { pos: 'top', next: true, spot: '.combatant.player .plate', text: 'Esta es tu vida. Si llega a 0, pierdes la partida.' },
    { pos: 'top', next: true, spot: '.hand-row', text: 'Abajo está tu mano de cartas. Cada turno robas 5 cartas nuevas.' },
    { pos: 'top', next: true, spot: '.energy-orange', text: 'La naranja es tu energía. Cada carta cuesta lo que dice su bolita naranja. Se recarga cada turno.' },
    { pos: 'top', wait: 'card:attack', spot: '.hand-row', text: 'Arrastra un Golpe de Cáscara hacia arriba, sobre el enemigo, para atacarlo.' },
    {
        pos: 'top', wait: 'card:skill', spot: '.hand-row',
        text: '¡Eso! Ahora arrastra un Jugo Defensivo hacia arriba: te da cáscara, que bloquea el daño del enemigo.',
        skipIf: () => {
            const c = GAME.combat;
            return !c || c.player.energy < 1 || !c.player.hand.some((id) => (window.getCard(id) || {}).type === 'skill');
        }
    },
    { pos: 'top', next: true, spot: '.pile', text: 'Estas son tus pilas: a la izquierda la de robo y a la derecha el descarte. Cuando se acaba la de robo, el descarte se baraja.' },
    { pos: 'top', wait: 'turn-end', spot: '.end-turn', text: 'Cuando ya no quieras jugar más cartas, pulsa Terminar turno. Entonces actúa el enemigo.' },
    { pos: 'top', wait: 'screen:reward', text: 'Tu cáscara absorbió el golpe. Sigue jugando cartas y terminando turnos hasta ganar. ¡Tú puedes!' },

    // ---------- el resto del mapa ----------
    { pos: 'bl', wait: 'screen:map', spot: '.reward-row .card', text: '¡Ganaste! Te llevas oro y puedes elegir una carta nueva para tu mazo. Toca la que más te guste.' },
    { pos: 'bl', next: true, spot: '.hud-seeds', text: '¡También ganaste una semilla! Está arriba, en tu bolsa. En combate, tócala en tu turno para usarla. Cada una sirve una sola vez.' },
    { pos: 'top', wait: 'screen:rest', spot: '.node.reachable', text: 'Ahora ve al campamento, la casilla de la fogata.' },
    { pos: 'bl', wait: 'screen:map', spot: '.rest-option', text: 'En el campamento eliges UNA cosa: Descansar para curarte, Madurar para mejorar una carta, o Despegar para quitarla de tu mazo.' },
    { pos: 'top', wait: 'screen:treasure', spot: '.node.reachable', text: 'Sigue hacia el cofre del tesoro.' },
    { pos: 'bl', wait: 'screen:map', spot: '.hud-relics', text: '¡Un objeto! Te ayuda durante todo el viaje. Tus objetos salen arriba, junto a tu oro. Pasa el mouse sobre ellas para leerlas.' },
    { pos: 'top', wait: 'screen:event', spot: '.node.reachable', text: 'El sobre es un misterio: un evento con decisiones. ¡Vamos!' },
    { pos: 'bl', wait: 'screen:map', spot: '.event-options button', text: 'Lee y elige una opción. Algunas tienen premio y otras, riesgo.' },
    { pos: 'top', wait: 'screen:shop', spot: '.node.reachable', text: 'Ahora la tiendita.' },
    { pos: 'bl', wait: 'screen:map', spot: '.shop-item', text: 'Aquí gastas tu oro en cartas, objetos o en quitar una carta de tu mazo. Toca algo para comprarlo, y pulsa Salir al terminar.' },
    { pos: 'top', wait: 'screen:gift', spot: '.node.reachable', text: 'Los regalos traen colores y accesorios para tu fruta.' },
    { pos: 'bl', wait: 'screen:map', spot: '.cosmetic-box', text: 'Pulsa ¡Ponérmelo! para probártelo. Todo lo que ganes queda en el Vestidor del menú.' },
    { pos: 'top', next: true, spot: '.node.elite', text: 'Las casillas de fuego son élites: enemigos duros que te dan un objeto. Hoy no pasarás por ahí.' },
    { pos: 'top', wait: 'screen:combat', spot: '.boss-lair', text: 'Al final está la guarida del jefe. Vencerlo te lleva al siguiente nivel. ¡Entra cuando quieras!' },
    { pos: 'top', next: true, spot: '#enemy-0 .intent-bubble', text: '¡El jefe! Mira siempre su intención: si va a atacar fuerte, protégete con cáscara.' },
    { pos: 'top', wait: 'screen:tutorial-end', text: '¡Vamos, dale con todo!' }
];

// ---------- empezar / salir ----------
function useMapSize(size) {
    window.MAP_COLS = size.cols;
    window.MAP_ROWS = size.rows;
}
function exitTutorial() {
    if (!GAME.tutorial) return;
    GAME.tutorial = null;
    useMapSize(NORMAL_MAP);
    hideGuide();
}

// Mapa fijo: un camino por la fila del medio con todas las casillas
function buildTutorialMap() {
    const T = window.NODE_TYPES;
    const { cols, rows } = TUT_MAP;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(T.EMPTY));
    [T.EMPTY, T.ENEMY, T.REST, T.TREASURE, T.MYSTERY, T.SHOP, T.GIFT].forEach((t, x) => { grid[1][x] = t; });
    for (let y = 0; y < rows; y++) grid[y][cols - 1] = T.BOSS;
    grid[0][4] = T.ELITE;
    grid[2][2] = T.ELITE;
    grid[2][5] = T.ELITE;
    // muros: no se puede salir de la fila del medio
    const wallsH = Array.from({ length: rows - 1 }, () => Array(cols).fill(true));
    const wallsV = Array.from({ length: rows }, (_, y) => Array(cols - 1).fill(y !== 1));
    return { grid, walls: { wallsV, wallsH, bossY: 1, bossId: 'mango_zombie' } };
}

function startTutorial() {
    useMapSize(TUT_MAP);
    GAME.selectedDifficulty = 'verde';
    const p = new Player();
    const def = window.CHARACTER_DB.manzana;
    p.characterId = 'manzana';
    p.name = def.name;
    p.maxHp = def.baseHp;
    p.hp = def.baseHp;
    p.difficulty = 'verde';
    p.gold = 130;
    p.act = 1;
    p.deck = window.starterDeckFor('manzana');
    GAME.player = p;
    GAME.combat = null;
    GAME.anim = false;
    const m = buildTutorialMap();
    GAME.map = m.grid;
    GAME.walls = m.walls;
    GAME.playerPos = { x: 0, y: 1 };
    GAME.visited = ['0,1'];
    GAME.mapPan = null;
    GAME.tutorial = { i: 0, lastScreen: 'map', firstFight: true };
    GAME.screen = 'map';
    render();
    showGuide();
}

// ---------- avanzar ----------
function tutStep() { return GAME.tutorial ? TUT_STEPS[GAME.tutorial.i] : null; }
function tutAdvance() {
    const t = GAME.tutorial;
    if (!t) return;
    t.i++;
    while (TUT_STEPS[t.i] && TUT_STEPS[t.i].skipIf && TUT_STEPS[t.i].skipIf()) t.i++;
    if (!TUT_STEPS[t.i]) { hideGuide(); return; }
    showGuide();
}
function tutorialNotify(evt) {
    const s = tutStep();
    if (s && s.wait === evt) tutAdvance();
}
// Después de cada dibujo: avisos de cambio de pantalla y volver a iluminar
function tutorialAfterRender() {
    const t = GAME.tutorial;
    if (!t) return;
    if (GAME.screen !== t.lastScreen) {
        t.lastScreen = GAME.screen;
        tutorialNotify(`screen:${GAME.screen}`);
    }
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
    // pasos que piden UNA acción concreta (arrastrar tal carta, tocar tal
    // botón): se oscurece todo y solo se puede tocar lo resaltado, para que
    // no se pierdan probando otra cosa
    if (screen) screen.classList.toggle('tut-lockdown', !!(s && s.wait && s.spot && !s.next));
    if (!s || !s.spot) return;
    [...document.querySelectorAll(s.spot)].slice(0, 6).forEach((el) => el.classList.add('tut-spot'));
}

// ---------- fin ----------
function renderTutorialEnd() {
    return panel(art('profe_limon', '🍋', { size: 'xl' }), '¡Tutorial completado!', `
        <p>Ya conoces el mapa, el combate, los campamentos, los tesoros, los misterios, la tiendita y los regalos.
        En una partida de verdad hay 3 niveles, cada uno con su jefe. ¡Mucha suerte!</p>
        <div class="controls-row">
            <button class="btn-mint" onclick="goToCharacterSelect()">¡Jugar de verdad!</button>
            <button class="secondary" onclick="showMainMenu()">Volver al menú</button>
        </div>`, 'celebrate');
}

Object.assign(window, { startTutorial, tutAdvance, exitTutorial });
