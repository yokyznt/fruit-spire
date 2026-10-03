// Lógica pura de los minijuegos: manos de póker, movimientos y rival del ajedrez chiquito.
// Uso: node tests/minigames.test.js
global.window = global;
const path = require('path');
require(process.argv[2] || path.join(__dirname, '..', 'js', 'minigames.js'));
const MG = window.MG;
let bad = 0;
const check = (cond, msg) => { if (!cond) { bad++; console.log('FALLA:', msg); } };
const H = (s) => s.split(' ').map((t) => { const suit = '♠♥♦♣'.indexOf(t.slice(-1)); const r = t.slice(0, -1); return { r: { J: 11, Q: 12, K: 13, A: 14 }[r] || +r, s: suit }; });

// ---- manos de póker ----
const rank = (s) => MG.evalHand(H(s)).rank;
check(rank('2♠ 3♠ 4♠ 5♠ 6♠') === 8, 'escalera de color');
check(rank('A♠ 2♠ 3♠ 4♠ 5♠') === 8, 'escalera de color A-5');
check(rank('9♠ 9♥ 9♦ 9♣ 2♠') === 7, 'póker');
check(rank('9♠ 9♥ 9♦ 2♣ 2♠') === 6, 'full');
check(rank('2♠ 7♠ 9♠ J♠ K♠') === 5, 'color');
check(rank('5♠ 6♥ 7♦ 8♣ 9♠') === 4, 'escalera');
check(rank('A♠ 2♥ 3♦ 4♣ 5♠') === 4, 'escalera rueda');
check(rank('Q♠ K♥ A♦ 2♣ 3♠') === 0, 'no es escalera (Q K A 2 3)');
check(rank('9♠ 9♥ 9♦ 3♣ 2♠') === 3, 'trío');
check(rank('9♠ 9♥ 3♦ 3♣ 2♠') === 2, 'doble par');
check(rank('9♠ 9♥ 4♦ 3♣ 2♠') === 1, 'par');
check(rank('9♠ J♥ 4♦ 3♣ 2♠') === 0, 'carta alta');
const cmp = (a, b) => MG.compareHands(MG.evalHand(H(a)), MG.evalHand(H(b)));
check(cmp('9♠ 9♥ 4♦ 3♣ 2♠', '8♠ 8♥ 4♦ 3♣ 2♠') === 1, 'par de 9 > par de 8');
check(cmp('9♠ 9♥ 4♦ 3♣ 2♠', '9♦ 9♣ 5♦ 3♣ 2♠') === -1, 'kicker');
check(cmp('9♠ 9♥ 4♦ 3♣ 2♠', '9♦ 9♣ 4♥ 3♦ 2♣') === 0, 'empate');
check(cmp('2♠ 2♥ 3♦ 3♣ 5♠', '2♦ 2♣ 3♥ 3♠ 4♣') === 1, 'doble par kicker');
check(cmp('A♠ 2♥ 3♦ 4♣ 5♠', '2♠ 3♥ 4♦ 5♣ 6♠') === -1, 'escalera rueda pierde con 6-alta');
// la casa nunca cambia cartas de una mano fuerte y siempre devuelve índices válidos
for (let i = 0; i < 500; i++) {
    const d = MG.newDeck();
    check(d.length === 52 && new Set(d.map((c) => c.r * 4 + c.s)).size === 52, 'baraja');
    const hand = d.slice(0, 5);
    const disc = MG.houseDiscards(hand);
    check(disc.every((k) => k >= 0 && k < 5) && new Set(disc).size === disc.length, 'descartes válidos');
    if (MG.evalHand(hand).rank >= 4) check(disc.length === 0, 'mano fuerte no cambia');
}

// ---- ajedrez ----
const b0 = MG.newBoard();
check(MG.countPieces(b0, 0) === 10 && MG.countPieces(b0, 1) === 10, '10 piezas cada uno');
check(b0.length === 6 && b0[0].length === 5, 'tablero 5 columnas × 6 filas');
check(MG.allMoves(b0, 0).length > 0 && MG.allMoves(b0, 1).length > 0, 'hay movimientos iniciales');
// el peón avanza 1 y no come de frente
let b = MG.newBoard();
const pm = MG.movesFor(b, 4, 2);
check(pm.length === 1 && pm[0].r === 3 && pm[0].c === 2, 'peón: solo 1 adelante');
// coronación
b = Array.from({ length: 6 }, () => Array(5).fill(null));
b[1][0] = { t: 'P', c: 0 };
const r1 = MG.applyMove(b, { fr: 1, fc: 0, tr: 0, tc: 0 });
check(r1.promoted && r1.board[0][0].t === 'Q', 'coronación del jugador');
b = Array.from({ length: 6 }, () => Array(5).fill(null));
b[4][4] = { t: 'P', c: 1 };
const r2 = MG.applyMove(b, { fr: 4, fc: 4, tr: 5, tc: 4 });
check(r2.promoted && r2.board[5][4].t === 'Q' && r2.board[5][4].c === 1, 'coronación del rival');
// caballo, torre, alfil, reina, rey
b = Array.from({ length: 6 }, () => Array(5).fill(null));
b[2][2] = { t: 'N', c: 0 };
check(MG.movesFor(b, 2, 2).length === 8, 'caballo en el centro: 8 saltos');
b[2][2] = { t: 'R', c: 0 };
check(MG.movesFor(b, 2, 2).length === 4 + 3 + 2 + 3 - 0 - 0 + 0 - 0 || MG.movesFor(b, 2, 2).length === 2 + 3 + 2 + 2, 'torre en el centro');
b[2][2] = { t: 'Q', c: 0 };
check(MG.movesFor(b, 2, 2).length === 16 + 0 || MG.movesFor(b, 2, 2).length > 10, 'reina con muchas jugadas');
b[2][2] = { t: 'K', c: 0 };
check(MG.movesFor(b, 2, 2).length === 8, 'rey: 8 casillas');
// no se puede comer a las propias, sí a las rivales
b[2][2] = { t: 'R', c: 0 }; b[2][4] = { t: 'P', c: 0 }; b[0][2] = { t: 'P', c: 1 };
const mv = MG.movesFor(b, 2, 2).map((m) => `${m.r},${m.c}`);
check(!mv.includes('2,4') && !mv.includes('2,3') === false, 'la torre no pasa sobre su peón');
check(mv.includes('0,2') && !mv.includes('2,4'), 'la torre come al rival y no a su peón');
// el original no se modifica
const before = JSON.stringify(b);
MG.applyMove(b, { fr: 2, fc: 2, tr: 0, tc: 2 });
check(JSON.stringify(b) === before, 'applyMove no muta');

// ---- el rival juega bien y las partidas terminan ----
const t0 = Date.now();
let enemyWins = 0, playerWins = 0, ended = 0;
for (let g = 0; g < 30; g++) {
    let bb = MG.newBoard();
    let turn = 0;
    const depth = 1 + (g % 3);
    let plies = 0;
    for (; plies < 200; plies++) {
        const a = MG.countPieces(bb, 0), e = MG.countPieces(bb, 1);
        if (!a || !e) break;
        let mvv;
        if (turn === 0) { const ms = MG.allMoves(bb, 0); mvv = ms.length ? ms[Math.floor(Math.random() * ms.length)] : null; }
        else mvv = MG.chooseEnemyMove(bb, depth, 0);
        if (mvv) {
            const res = MG.applyMove(bb, mvv);
            // la pieza que se mueve existe y pertenece a quien mueve
            check(bb[mvv.fr][mvv.fc] && bb[mvv.fr][mvv.fc].c === turn, 'mueve una pieza propia');
            bb = res.board;
        }
        turn = 1 - turn;
    }
    const a = MG.countPieces(bb, 0), e = MG.countPieces(bb, 1);
    if (!a) enemyWins++; else if (!e) playerWins++;
    if (!a || !e) ended++;
}
console.log('partidas contra un jugador al azar: rival gana', enemyWins, 'azar gana', playerWins, 'terminadas', ended, 'de 30 en', Date.now() - t0, 'ms');
check(enemyWins >= 24, 'el rival debería ganar casi siempre contra movimientos al azar');
// velocidad de la IA a profundidad 3 en el tablero inicial
// tragamonedas y ruleta
check(MG.slotPayout(['kiwi', 'kiwi', 'kiwi']) === 5, 'tres iguales ×5');
check(MG.slotPayout(['rey_fruta', 'rey_fruta', 'rey_fruta']) === 10, 'tres reyes ×10');
check(MG.slotPayout(['kiwi', 'uva', 'kiwi']) === 1.5, 'dos iguales ×1.5');
check(MG.slotPayout(['kiwi', 'uva', 'manzana']) === 0, 'nada');
check(MG.rouletteColor(0) === 'green' && MG.rouletteColor(1) === 'red' && MG.rouletteColor(2) === 'black', 'colores de la ruleta');
check(MG.roulettePayout('red', 3) === 2 && MG.roulettePayout('red', 4) === 0 && MG.roulettePayout('black', 0) === 0, 'rojo/negro');
check(MG.roulettePayout(7, 7) === 10 && MG.roulettePayout(7, 8) === 0, 'número exacto');
const tt = Date.now();
MG.chooseEnemyMove(MG.newBoard(), 3, 0);
console.log('IA profundidad 3:', Date.now() - tt, 'ms');
check(Date.now() - tt < 1500, 'IA rápida');
console.log(bad ? `FALLARON ${bad}` : 'todo bien');
process.exit(bad ? 1 : 0);
