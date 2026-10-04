// ============================================================
// MINIGAMES.JS — Las Mesas de Juegos: tres juegos rápidos que salen en
// casillas del mapa y en eventos.
//   · Dados   "Veintiuno de Dados": tira dados sin pasarte de 21 y gana a la casa.
//   · Póker   Póker de 5 cartas: cambia las que quieras (una vez) y gana con la mejor mano.
//   · Ajedrez Tablero chiquito de 5 columnas: hay que comerse TODAS las piezas rivales.
// La lógica pura (manos de póker, movimientos y rival de ajedrez) vive en
// window.MG para poder probarla sin la interfaz; abajo está lo visual.
// ============================================================

(function () {
    const rnd = (n) => Math.floor(Math.random() * n);
    const shuffleArr = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const MG = {};

    // =========================================================
    // PÓKER — cartas y manos
    // =========================================================
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    const HAND_NAMES = ['Carta alta', 'Par', 'Doble par', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'];
    MG.HAND_NAMES = HAND_NAMES;
    MG.newDeck = function () {
        const d = [];
        for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
        return shuffleArr(d);
    };
    // Valora 5 cartas → { rank: 0..8, tb: [desempates] }
    MG.evalHand = function (cards) {
        const counts = {};
        cards.forEach((c) => { counts[c.r] = (counts[c.r] || 0) + 1; });
        const groups = Object.keys(counts).map((r) => [counts[r], +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
        const desc = cards.map((c) => c.r).sort((a, b) => b - a);
        const flush = cards.every((c) => c.s === cards[0].s);
        let straight = false, high = desc[0];
        if (new Set(desc).size === 5) {
            if (desc[0] - desc[4] === 4) straight = true;
            else if (desc[0] === 14 && desc[1] === 5 && desc[4] === 2) { straight = true; high = 5; } // A-2-3-4-5
        }
        const byGroups = groups.map((g) => g[1]);
        if (straight && flush) return { rank: 8, tb: [high] };
        if (groups[0][0] === 4) return { rank: 7, tb: byGroups };
        if (groups[0][0] === 3 && groups[1][0] === 2) return { rank: 6, tb: byGroups };
        if (flush) return { rank: 5, tb: desc };
        if (straight) return { rank: 4, tb: [high] };
        if (groups[0][0] === 3) return { rank: 3, tb: byGroups };
        if (groups[0][0] === 2 && groups[1][0] === 2) return { rank: 2, tb: byGroups };
        if (groups[0][0] === 2) return { rank: 1, tb: byGroups };
        return { rank: 0, tb: desc };
    };
    // 1 si gana a, -1 si gana b, 0 empate
    MG.compareHands = function (a, b) {
        if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
        for (let i = 0; i < Math.max(a.tb.length, b.tb.length); i++) {
            const x = a.tb[i] || 0, y = b.tb[i] || 0;
            if (x !== y) return x > y ? 1 : -1;
        }
        return 0;
    };
    // Qué cartas cambia la casa: se queda con lo que forma pares/tríos/póker; si no tiene
    // nada, con sus 2 cartas más altas (y, con 4 del mismo palo, con esas 4)
    MG.houseDiscards = function (cards) {
        const counts = {};
        cards.forEach((c) => { counts[c.r] = (counts[c.r] || 0) + 1; });
        const ev = MG.evalHand(cards);
        if (ev.rank >= 4) return []; // escalera o mejor: se planta
        const keepMulti = cards.map((c, i) => (counts[c.r] > 1 ? i : -1)).filter((i) => i >= 0);
        if (keepMulti.length) return cards.map((c, i) => i).filter((i) => !keepMulti.includes(i));
        const bySuit = [0, 1, 2, 3].map((s) => cards.map((c, i) => (c.s === s ? i : -1)).filter((i) => i >= 0));
        const four = bySuit.find((l) => l.length === 4);
        if (four) return cards.map((c, i) => i).filter((i) => !four.includes(i));
        const order = cards.map((c, i) => [c.r, i]).sort((a, b) => b[0] - a[0]);
        const keep = order.slice(0, 2).map((x) => x[1]);
        return cards.map((c, i) => i).filter((i) => !keep.includes(i));
    };

    // =========================================================
    // AJEDREZ CHIQUITO — tablero de 5 columnas × 6 filas
    //   Tú (fruta) abajo, moviendo hacia arriba; el rival arriba.
    //   No hay jaque: gana quien se coma TODAS las piezas del otro.
    //   Peón: 1 casilla adelante, come en diagonal, se corona reina al llegar al fondo.
    // =========================================================
    const CH = { COLS: 5, ROWS: 6 };
    MG.CH = CH;
    const VALUE = { P: 100, N: 300, B: 320, R: 500, Q: 900, K: 400 };
    const GLYPH = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
    MG.GLYPH = GLYPH;
    MG.VALUE = VALUE;
    const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    MG.newBoard = function () {
        const b = Array.from({ length: CH.ROWS }, () => Array(CH.COLS).fill(null));
        ['R', 'N', 'B', 'Q', 'K'].forEach((t, c) => { b[0][c] = { t, c: 1 }; b[CH.ROWS - 1][c] = { t, c: 0 }; });
        for (let c = 0; c < CH.COLS; c++) { b[1][c] = { t: 'P', c: 1 }; b[CH.ROWS - 2][c] = { t: 'P', c: 0 }; }
        return b;
    };
    const inside = (r, c) => r >= 0 && r < CH.ROWS && c >= 0 && c < CH.COLS;
    // Destinos posibles de la pieza en (r,c): [{ r, c }]
    MG.movesFor = function (b, r, c) {
        const p = b[r][c];
        if (!p) return [];
        const out = [];
        const add = (nr, nc) => { if (inside(nr, nc) && (!b[nr][nc] || b[nr][nc].c !== p.c)) out.push({ r: nr, c: nc }); };
        const slide = (dirs) => dirs.forEach(([dr, dc]) => {
            for (let nr = r + dr, nc = c + dc; inside(nr, nc); nr += dr, nc += dc) {
                if (b[nr][nc]) { if (b[nr][nc].c !== p.c) out.push({ r: nr, c: nc }); break; }
                out.push({ r: nr, c: nc });
            }
        });
        if (p.t === 'P') {
            const dr = p.c === 0 ? -1 : 1;
            if (inside(r + dr, c) && !b[r + dr][c]) out.push({ r: r + dr, c });
            [-1, 1].forEach((dc) => { if (inside(r + dr, c + dc) && b[r + dr][c + dc] && b[r + dr][c + dc].c !== p.c) out.push({ r: r + dr, c: c + dc }); });
        } else if (p.t === 'N') KNIGHT.forEach(([dr, dc]) => add(r + dr, c + dc));
        else if (p.t === 'K') KING.forEach(([dr, dc]) => add(r + dr, c + dc));
        else if (p.t === 'B') slide(DIAG);
        else if (p.t === 'R') slide(ORTHO);
        else if (p.t === 'Q') slide(DIAG.concat(ORTHO));
        return out;
    };
    MG.allMoves = function (b, side) {
        const out = [];
        for (let r = 0; r < CH.ROWS; r++) for (let c = 0; c < CH.COLS; c++) {
            if (b[r][c] && b[r][c].c === side) MG.movesFor(b, r, c).forEach((m) => out.push({ fr: r, fc: c, tr: m.r, tc: m.c }));
        }
        return out;
    };
    // Devuelve { board, captured } sin tocar el original
    MG.applyMove = function (b, m) {
        const nb = b.map((row) => row.slice());
        const piece = nb[m.fr][m.fc];
        const captured = nb[m.tr][m.tc];
        nb[m.fr][m.fc] = null;
        const promote = piece.t === 'P' && ((piece.c === 0 && m.tr === 0) || (piece.c === 1 && m.tr === CH.ROWS - 1));
        nb[m.tr][m.tc] = promote ? { t: 'Q', c: piece.c } : piece;
        return { board: nb, captured, promoted: promote };
    };
    MG.countPieces = function (b, side) {
        let n = 0;
        b.forEach((row) => row.forEach((p) => { if (p && p.c === side) n++; }));
        return n;
    };
    MG.material = function (b, side) {
        let v = 0;
        b.forEach((row) => row.forEach((p) => { if (p && p.c === side) v += VALUE[p.t]; }));
        return v;
    };
    // Evaluación desde el punto de vista del rival (side 1): material + avance de peones
    function evaluate(b) {
        let score = 0;
        for (let r = 0; r < CH.ROWS; r++) for (let c = 0; c < CH.COLS; c++) {
            const p = b[r][c];
            if (!p) continue;
            let v = VALUE[p.t];
            if (p.t === 'P') v += (p.c === 1 ? r : CH.ROWS - 1 - r) * 8;
            if (c === 2 && p.t !== 'K') v += 6; // el centro vale un poquito más
            score += p.c === 1 ? v : -v;
        }
        return score;
    }
    // negamax con poda: side = quién mueve (1 = rival). Devuelve la evaluación para `side`.
    function search(b, side, depth, alpha, beta) {
        const mine = MG.countPieces(b, side), theirs = MG.countPieces(b, 1 - side);
        if (!theirs) return 100000 + depth; // se comió todo: ganó
        if (!mine) return -100000 - depth;
        if (depth === 0) return side === 1 ? evaluate(b) : -evaluate(b);
        const moves = MG.allMoves(b, side);
        if (!moves.length) return side === 1 ? evaluate(b) : -evaluate(b); // sin movimientos: pasa
        // primero las capturas (mejor poda)
        moves.sort((a, m) => (b[m.tr][m.tc] ? VALUE[b[m.tr][m.tc].t] : 0) - (b[a.tr][a.tc] ? VALUE[b[a.tr][a.tc].t] : 0));
        let best = -Infinity;
        for (const m of moves) {
            const score = -search(MG.applyMove(b, m).board, 1 - side, depth - 1, -beta, -alpha);
            if (score > best) best = score;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return best;
    }
    // Movimiento del rival. depth: cuántas jugadas piensa por adelantado; sloppy: probabilidad de jugar al azar.
    MG.chooseEnemyMove = function (b, depth, sloppy) {
        const moves = MG.allMoves(b, 1);
        if (!moves.length) return null;
        if (Math.random() < (sloppy || 0)) return moves[rnd(moves.length)];
        let best = -Infinity, bestMoves = [];
        for (const m of moves) {
            const score = -search(MG.applyMove(b, m).board, 0, Math.max(0, depth - 1), -Infinity, Infinity) + Math.random() * 4;
            if (score > best + 1e-9) { best = score; bestMoves = [m]; } else if (Math.abs(score - best) < 1e-9) bestMoves.push(m);
        }
        return bestMoves[rnd(bestMoves.length)];
    };

    // =========================================================
    // TRAGAMONEDAS y RULETA — reglas de pago
    // =========================================================
    MG.SLOT_SYMBOLS = ['manzana', 'platanin', 'kiwi', 'uva', 'ui_coin', 'rey_fruta'];
    // multiplicador de la apuesta: 3 iguales ×5 (3 Reyes ×10), 2 iguales ×1.5, nada ×0
    MG.slotPayout = function (r) {
        if (r[0] === r[1] && r[1] === r[2]) return r[0] === 'rey_fruta' ? 10 : 5;
        return (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) ? 1.5 : 0;
    };
    MG.ROULETTE_N = 13; // 0 verde, 1–12 rojo/negro alternados
    MG.rouletteColor = (n) => (n === 0 ? 'green' : n % 2 ? 'red' : 'black');
    // pick: 'red' | 'black' (×2) o un número (×10)
    MG.roulettePayout = (pick, n) => (typeof pick === 'number' ? (pick === n ? 10 : 0) : (MG.rouletteColor(n) === pick ? 2 : 0));

    window.MG = MG;

    // =========================================================
    // INTERFAZ
    // =========================================================
    const BETS = [10, 25, 50];
    const KINDS = {
        dice: {
            name: 'Veintiuno de Dados', icon: '🎲', sprite: 'act_dados',
            rules: 'Suma dados sin pasarte de 21. La casa tira hasta 17. Un 21 exacto paga triple.'
        },
        poker: {
            name: 'Póker de Cinco Cartas', icon: '🃏', sprite: 'act_poker',
            rules: 'Cambia las cartas que quieras, una sola vez. Gana la mejor mano; trío o mejor paga doble.'
        },
        chess: {
            name: 'Torre de Ajedrez', icon: '♟️', sprite: 'act_ajedrez',
            rules: 'Sin jaque: cómete TODAS las piezas rivales. Ganas oro (a veces un objeto); si pierdes, pierdes vida.'
        },
        slots: {
            name: 'Tragamonedas', icon: '🎰', sprite: 'tragamonedas',
            rules: '3 iguales pagan ×5 (3 Reyes ×10). 2 iguales, ×1.5.'
        },
        roulette: {
            name: 'Ruleta', icon: '🎡', sprite: 'ruleta_fortuna',
            rules: 'Rojo o negro paga ×2. Un número exacto, ×10. El 0 es de la casa.'
        }
    };
    const mg = () => GAME.mg;
    // ---------- la mesa de casino: tapete, crupier que reacciona y fichas apostadas ----------
    const DEALER = { dice: 'cubilete_maldito', poker: 'crupier_marcado', chess: 'gran_maestro', slots: 'rey_azar', roulette: 'dama_suerte' };
    const STAMP = { win: '¡GANAS!', lose: 'PIERDES', draw: 'EMPATE' };
    const LINES = {
        start: ['¿Te atreves?', 'Hagan sus apuestas.', 'A ver esa suerte.'],
        hot: ['Uy… ¿otra más?', 'Yo que tú me plantaba.', 'Qué nervios, ¿no?'],
        house: ['Mi turno.', 'Ahora va la casa.'],
        win: ['Suerte de principiante…', '¡Bah! Llévatelo.', 'No vuelvas pronto.'],
        lose: ['La casa siempre gana.', 'Gracias por tu oro.', 'Otra vez será.'],
        draw: ['Empate. Nadie pierde.']
    };
    const say = (m, key) => { m.say = LINES[key][rnd(LINES[key].length)]; };
    function chipsHtml(m) {
        if (m.kind === 'chess') return '';
        const n = m.free ? 1 : m.bet >= 50 ? 5 : m.bet >= 25 ? 3 : 2;
        return `<div class="mg-pot">${'<i></i>'.repeat(n)}<b class="hand">${m.free ? 'Gratis' : m.bet}</b></div>`;
    }
    function tableHtml(m, info, body, cls) {
        const res = m.phase === 'result';
        return `<div class="mg-table ${cls || ''} ${res ? `res-${m.outcome}` : ''}">
            <div class="mg-dealer">${art(DEALER[m.kind], info.icon, { size: 'lg', mood: res && m.outcome === 'win' ? 'hurt' : undefined })}<div class="mg-say hand">${m.say || '…'}</div></div>
            ${chipsHtml(m)}
            <h2 class="hand-title">${info.name}</h2>
            ${body}
            ${res ? `<div class="mg-stamp ${m.outcome}">${STAMP[m.outcome]}</div>` : ''}
        </div>`;
    }
    // lluvia de monedas al ganar
    function coinRain() {
        if (typeof overlayAdd !== 'function') return;
        for (let i = 0; i < 16; i++) {
            const el = overlayAdd('mg-coin', art('ui_coin', '', { size: 'sm' }), { x: BASE_W * (0.2 + Math.random() * 0.6), y: -30 }, 1700);
            if (el) { el.style.animationDelay = `${(i * 0.06).toFixed(2)}s`; el.style.setProperty('--dx', `${(Math.random() * 120 - 60).toFixed(0)}px`); }
        }
    }
    const isTutorial = () => !!GAME.tutorial;

    window.openMinigame = function (kind) {
        if (!KINDS[kind]) kind = 'dice';
        GAME.mg = { kind, phase: 'intro', bet: 0, busy: false };
        GAME.screen = 'minigame';
        if (window.Sfx) Sfx.eventOpen();
        render();
    };
    window.openGameTable = function () {
        const theme = currentTheme();
        // 1 de cada 3 mesas es una máquina: tragamonedas o ruleta
        const machine = Math.random() < 0.34 ? pickOne(['slots', 'roulette']) : null;
        window.openMinigame(machine || theme.gameKind || pickOne(['dice', 'poker', 'chess']));
    };
    window.mgLeave = function () {
        if (GAME.mg && GAME.mg.busy) return;
        if (lootNudge()) return;
        GAME.loot = [];
        GAME.mg = null;
        GAME.screen = 'map';
        saveGame();
        render();
    };
    // Termina una partida: aplica oro / vida / objeto y muestra el resultado
    function finish(outcome, msg, opts) {
        const m = mg();
        const p = GAME.player;
        opts = opts || {};
        m.phase = 'result';
        m.outcome = outcome;
        let text = msg;
        GAME.loot = [];
        withLootCapture(() => {
            if (opts.gold) { p.gold += opts.gold; }
            if (opts.relic) { GAME.lastRelic = null; text += ` ${grantRandomRelic(p)}`; }
        });
        if (opts.hp) { p.hp = Math.max(1, p.hp - opts.hp); text += ` Pierdes ${opts.hp} ❤️.`; }
        if (outcome === 'win' && window.PASS && !isTutorial()) { const g = window.PASS.addXp(15); if (g && g.levels) text += ` ¡Subes de nivel en el Pase de Batalla!`; }
        m.text = text;
        say(m, outcome);
        if (outcome === 'win') coinRain();
        if (window.Sfx) (outcome === 'win' ? Sfx.win : outcome === 'lose' ? Sfx.denied : Sfx.pop)();
        saveGame();
        render();
    }
    const betPayout = (m, mult) => (m.free ? (mult > 0 ? 8 : 0) : m.bet * mult); // en juego libre solo se ganan 8 de oro

    // ---------- pantalla de reglas y apuesta ----------
    function renderIntro(m, info) {
        const p = GAME.player;
        const bets = m.kind === 'chess' ? '' : `
            <p class="hand mg-bet-title">¿Cuánto apuestas? Tienes ${art('ui_coin', '🪙', { size: 'xs' })} <b>${p.gold}</b></p>
            <div class="controls-row">
                ${BETS.map((b) => `<button class="${b === 25 ? 'btn-banana' : ''}" ${p.gold < b ? 'disabled' : ''} onclick="mgStart(${b})">${art('ui_coin', '🪙', { size: 'xs' })} ${b}</button>`).join('')}
                <button class="secondary" onclick="mgStart(0)" ${tip(['Jugar gratis', 'Sin apostar. Si ganas, la casa te da 8 de oro; si pierdes, no pierdes nada.'])}>Gratis</button>
            </div>`;
        const chessStart = m.kind === 'chess' ? `<div class="controls-row"><button class="btn-mint" onclick="mgStart(0)">¡Jugar!</button></div>` : '';
        return panel(art(info.sprite, info.icon, { size: 'xl' }), info.name, `
            <p>${info.rules}</p>
            ${bets}${chessStart}
            <button class="secondary" onclick="mgLeave()">Irme sin jugar</button>`, 'wide mg-panel');
    }
    window.mgStart = function (bet) {
        const m = mg();
        if (!m || m.phase !== 'intro') return;
        const p = GAME.player;
        if (bet > p.gold) { showToast('No te alcanza el oro'); return; }
        m.bet = bet;
        m.free = m.kind !== 'chess' && bet === 0;
        p.gold -= bet; // la apuesta se paga al empezar (si sales a media partida, la pierdes)
        saveGame();
        if (window.Sfx) Sfx.coin();
        say(m, 'start');
        if (m.kind === 'dice') { m.phase = 'play'; m.player = []; m.house = []; m.rolling = null; render(); }
        else if (m.kind === 'poker') startPoker(m);
        else if (m.kind === 'slots') { m.phase = 'play'; m.reels = [0, 1, 2].map(() => MG.SLOT_SYMBOLS[rnd(MG.SLOT_SYMBOLS.length)]); m.spin = [false, false, false]; render(); }
        else if (m.kind === 'roulette') { m.phase = 'play'; m.pick = null; m.angle = 0; render(); }
        else startChess(m);
    };

    // ---------- DADOS ----------
    const sum = (a) => a.reduce((s, x) => s + x, 0);
    const dieHtml = (v, cls) => `<span class="die ${cls || ''}" data-v="${v}">${window.SPRITE_KIT2 ? `<span class="art">${SPRITE_KIT2.dieSvg(v)}</span>` : v}</span>`;
    async function animateRoll(m, who) {
        m.busy = true;
        for (let i = 0; i < 7; i++) {
            m.rolling = { who, face: 1 + rnd(6) };
            if (window.Sfx) Sfx.tap();
            render();
            await wait(70 + i * 12);
            if (GAME.mg !== m) return null;
        }
        const v = 1 + rnd(6);
        m.rolling = null;
        m[who].push(v);
        m.busy = false;
        if (window.Sfx) Sfx.hit();
        render();
        return v;
    }
    function renderDice(m, info) {
        const ps = sum(m.player), hs = sum(m.house);
        const row = (arr, who, label) => `
            <div class="mg-row"><b class="hand">${label}</b>
                <div class="dice-row">${arr.map((v) => dieHtml(v)).join('')}${m.rolling && m.rolling.who === who ? dieHtml(m.rolling.face, 'rolling') : ''}</div>
                <span class="mg-total">${sum(arr)}</span></div>`;
        const canAct = m.phase === 'play' && !m.busy;
        return tableHtml(m, info, `
            ${row(m.house, 'house', 'La casa')}
            ${row(m.player, 'player', 'Tú')}
            <div class="mg-meter ${ps > 21 ? 'bust' : ps >= 17 ? 'hot' : ''}"><i style="width:${Math.min(100, (ps / 21) * 100).toFixed(0)}%"></i><span class="hand">${ps} / 21</span></div>
            ${m.phase === 'result' ? `<p class="mg-result ${m.outcome}">${m.text}</p>${deckChangesHtml()}${lootRowHtml()}<button class="btn-mint" onclick="mgLeave()" ${lootPending() ? 'disabled' : ''}>Continuar</button>` : `
            <div class="controls-row">
                <button class="btn-mint" ${canAct ? '' : 'disabled'} onclick="mgDiceRoll()">Tirar un dado</button>
                <button class="btn-banana" ${canAct && m.player.length ? '' : 'disabled'} onclick="mgDiceStand()">Plantarme con ${ps}</button>
            </div>`}`);
    }
    window.mgDiceRoll = async function () {
        const m = mg();
        if (!m || m.kind !== 'dice' || m.phase !== 'play' || m.busy) return;
        await animateRoll(m, 'player');
        if (GAME.mg !== m) return;
        const total = sum(m.player);
        if (total >= 17 && total < 21) { say(m, 'hot'); render(); }
        if (total > 21) finish('lose', `¡Te pasaste con ${total}!`);
        else if (total === 21) await diceHouse(m);
    };
    window.mgDiceStand = async function () {
        const m = mg();
        if (!m || m.kind !== 'dice' || m.phase !== 'play' || m.busy || !m.player.length) return;
        await diceHouse(m);
    };
    async function diceHouse(m) {
        m.phase = 'house';
        say(m, 'house');
        render();
        await wait(500);
        // la casa tira hasta 17 o más (y no se queda por debajo de ti si aún puede ganar)
        while (GAME.mg === m && sum(m.house) < 17) {
            await animateRoll(m, 'house');
            if (GAME.mg !== m) return;
            await wait(350);
        }
        if (GAME.mg !== m) return; // esta partida ya no está en pantalla
        const ps = sum(m.player), hs = sum(m.house);
        const gain = (mult) => betPayout(m, mult);
        if (hs > 21) finish('win', `¡La casa se pasó con ${hs}! Ganas.`, { gold: ps === 21 && !m.free ? gain(3) : gain(2) });
        else if (ps > hs) finish('win', ps === 21 ? '¡VEINTIUNO EXACTO! Paga triple.' : `¡${ps} contra ${hs}! Ganas.`, { gold: ps === 21 && !m.free ? gain(3) : gain(2) });
        else if (ps === hs) finish('draw', `Empate a ${ps}. Te devuelven tu apuesta.`, { gold: m.bet });
        else finish('lose', `La casa gana con ${hs} contra tus ${ps}.`);
    }

    // ---------- TRAGAMONEDAS ----------
    const resultHtml = (m) => `<p class="mg-result ${m.outcome}">${m.text}</p>${lootRowHtml()}<button class="btn-mint" onclick="mgLeave()" ${lootPending() ? 'disabled' : ''}>Continuar</button>`;
    function renderSlots(m, info) {
        return tableHtml(m, info, `
            <div class="slot-machine">
                ${m.reels.map((s, k) => `<div class="slot-reel ${m.spin[k] ? 'spin' : ''}">${art(s, '', { size: 'lg' })}</div>`).join('')}
            </div>
            ${m.phase === 'result' ? resultHtml(m)
                : `<div class="controls-row"><button class="btn-banana slot-lever" ${m.busy ? 'disabled' : ''} onclick="mgSlotsPull()">¡Jalar!</button></div>`}`, 'mg-slots');
    }
    window.mgSlotsPull = async function () {
        const m = mg();
        if (!m || m.kind !== 'slots' || m.phase !== 'play' || m.busy) return;
        m.busy = true;
        m.spin = [true, true, true];
        const N = MG.SLOT_SYMBOLS.length;
        const final = [0, 1, 2].map(() => MG.SLOT_SYMBOLS[rnd(N)]);
        for (let t = 0; t < 24; t++) {
            for (let k = 0; k < 3; k++) if (m.spin[k]) m.reels[k] = MG.SLOT_SYMBOLS[rnd(N)];
            const stop = t === 9 ? 0 : t === 16 ? 1 : t === 23 ? 2 : -1;
            if (stop >= 0) { m.spin[stop] = false; m.reels[stop] = final[stop]; if (window.Sfx) Sfx.hit(); } else if (window.Sfx) Sfx.tap();
            render();
            await wait(80);
            if (GAME.mg !== m) return;
        }
        m.busy = false;
        const mult = MG.slotPayout(m.reels);
        if (mult >= 5) finish('win', mult === 10 ? '¡JACKPOT REAL! ×10' : '¡Tres iguales! ×5', { gold: betPayout(m, mult) });
        else if (mult > 0) finish('win', 'Dos iguales: ×1.5', { gold: Math.floor(betPayout(m, mult)) });
        else finish('lose', 'Nada esta vez.');
    };

    // ---------- RULETA ----------
    const RL_COLORS = { red: '#E0455E', black: '#3A2A3E', green: '#3E9A5A' };
    function wheelSvg() {
        const n = MG.ROULETTE_N, step = 360 / n;
        const pt = (deg, r) => [(100 + r * Math.sin(deg * Math.PI / 180)).toFixed(1), (100 - r * Math.cos(deg * Math.PI / 180)).toFixed(1)];
        let s = '';
        for (let i = 0; i < n; i++) {
            const [x0, y0] = pt((i - 0.5) * step, 92), [x1, y1] = pt((i + 0.5) * step, 92), [tx, ty] = pt(i * step, 74);
            s += `<path d="M100 100 L${x0} ${y0} A92 92 0 0 1 ${x1} ${y1} Z" fill="${RL_COLORS[MG.rouletteColor(i)]}" stroke="#FFE9A8" stroke-width="1.5"/>
                <text x="${tx}" y="${ty}" transform="rotate(${(i * step).toFixed(1)} ${tx} ${ty})" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="700" fill="#FFF6E0">${i}</text>`;
        }
        return `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="#8C5A2E" stroke="#4A3428" stroke-width="4"/>${s}<circle cx="100" cy="100" r="30" fill="#E9C46A" stroke="#4A3428" stroke-width="4"/><circle cx="100" cy="100" r="9" fill="#4A3428"/></svg>`;
    }
    function renderRoulette(m, info) {
        const res = m.phase === 'result';
        const btn = (p, label, cls) => `<button class="rl-pick ${cls} ${m.pick === p ? 'on' : ''}" ${m.busy || res ? 'disabled' : ''} onclick="mgRoulettePick(${typeof p === 'number' ? p : `'${p}'`})">${label}</button>`;
        const nums = Array.from({ length: MG.ROULETTE_N - 1 }, (_, i) => btn(i + 1, i + 1, MG.rouletteColor(i + 1))).join('');
        return tableHtml(m, info, `
            <div class="rl-layout">
                <div class="rl-wheel-wrap"><i class="rl-ball"></i><div class="rl-wheel" style="transform:rotate(${m.angle}deg)">${wheelSvg()}</div></div>
                <div class="rl-board">
                    <div class="rl-row">${btn('red', 'Rojo ×2', 'red')}${btn('black', 'Negro ×2', 'black')}</div>
                    <div class="rl-nums">${nums}</div>
                    ${res ? resultHtml(m)
                        : `<button class="btn-banana" ${m.pick == null || m.busy ? 'disabled' : ''} onclick="mgRouletteSpin()">¡Girar!</button>`}
                </div>
            </div>`, 'mg-roulette');
    }
    window.mgRoulettePick = function (p) {
        const m = mg();
        if (!m || m.kind !== 'roulette' || m.phase !== 'play' || m.busy) return;
        m.pick = p;
        if (window.Sfx) Sfx.select();
        render();
    };
    window.mgRouletteSpin = async function () {
        const m = mg();
        if (!m || m.kind !== 'roulette' || m.phase !== 'play' || m.busy || m.pick == null) return;
        m.busy = true;
        render();
        const n = rnd(MG.ROULETTE_N);
        // la rueda da 5 vueltas y deja el número que salió bajo la bolita (arriba)
        m.angle = 1800 - n * (360 / MG.ROULETTE_N);
        const wheel = document.querySelector('.rl-wheel');
        if (wheel) requestAnimationFrame(() => { wheel.classList.add('spinning'); wheel.style.transform = `rotate(${m.angle}deg)`; });
        for (let i = 0; i < 9; i++) { if (window.Sfx) Sfx.tap(); await wait(300); if (GAME.mg !== m) return; }
        m.busy = false;
        const mult = MG.roulettePayout(m.pick, n);
        const what = `Salió el ${n} (${{ red: 'rojo', black: 'negro', green: 'verde' }[MG.rouletteColor(n)]}).`;
        if (mult > 0) finish('win', `${what} ×${mult}`, { gold: betPayout(m, mult) });
        else finish('lose', what);
    };

    // ---------- PÓKER ----------
    const cardHtml = (c, opts) => {
        opts = opts || {};
        const red = c.s === 1 || c.s === 2;
        const label = RANK_LABEL[c.r] || c.r;
        return `<span class="pcard ${red ? 'red' : ''} ${opts.sel ? 'sel' : ''} ${opts.click ? 'clickable' : ''} ${opts.cls || 'deal'}" style="--k:${opts.k || 0}" ${opts.click ? `onclick="${opts.click}"` : ''}>
            <i>${label}<br>${SUITS[c.s]}</i><b>${SUITS[c.s]}</b></span>`;
    };
    function startPoker(m) {
        m.deck = MG.newDeck();
        m.player = m.deck.splice(0, 5).sort((a, b) => a.r - b.r);
        m.house = m.deck.splice(0, 5);
        m.selected = [];
        m.phase = 'play';
        render();
    }
    function renderPoker(m, info) {
        const reveal = m.phase === 'result';
        const houseCards = m.house.map((c, k) => (reveal ? cardHtml(c, { cls: 'flip', k }) : `<span class="pcard back deal" style="--k:${k}"></span>`)).join('');
        const ph = MG.evalHand(m.player);
        return tableHtml(m, info, `
            <div class="mg-row"><b class="hand">La casa</b><div class="poker-row">${houseCards}</div>${reveal ? `<span class="mg-hand">${HAND_NAMES[MG.evalHand(m.house).rank]}</span>` : ''}</div>
            <div class="mg-row"><b class="hand">Tú</b>
                <div class="poker-row">${m.player.map((c, i) => cardHtml(c, { k: i, cls: c.fresh ? 'deal new' : '', sel: m.selected.includes(i), click: m.phase === 'play' ? `mgPokerToggle(${i})` : '' })).join('')}</div>
                <span class="mg-hand">${HAND_NAMES[ph.rank]}</span></div>
            ${m.phase === 'result' ? `<p class="mg-result ${m.outcome}">${m.text}</p>${deckChangesHtml()}${lootRowHtml()}<button class="btn-mint" onclick="mgLeave()" ${lootPending() ? 'disabled' : ''}>Continuar</button>` : `
            <div class="controls-row"><button class="btn-mint" onclick="mgPokerShow()">${m.selected.length ? `Cambiar ${m.selected.length} y mostrar` : 'Plantarme'}</button></div>`}`);
    }
    window.mgPokerToggle = function (i) {
        const m = mg();
        if (!m || m.kind !== 'poker' || m.phase !== 'play') return;
        const k = m.selected.indexOf(i);
        if (k >= 0) m.selected.splice(k, 1); else m.selected.push(i);
        if (window.Sfx) Sfx.select();
        render();
    };
    window.mgPokerShow = function () {
        const m = mg();
        if (!m || m.kind !== 'poker' || m.phase !== 'play') return;
        // las cartas nuevas se marcan; la selección se vacía (al reordenar, sus posiciones ya no valen)
        m.selected.forEach((i) => { m.player[i] = Object.assign(m.deck.shift(), { fresh: true }); });
        m.selected = [];
        m.player.sort((a, b) => a.r - b.r);
        MG.houseDiscards(m.house).forEach((i) => { m.house[i] = m.deck.shift(); });
        const a = MG.evalHand(m.player), h = MG.evalHand(m.house);
        const cmp = MG.compareHands(a, h);
        const name = (e) => HAND_NAMES[e.rank].toLowerCase();
        if (cmp > 0) {
            const big = a.rank >= 3; // trío o mejor paga doble
            finish('win', `¡Ganas con ${name(a)} contra ${name(h)}!${big && !m.free ? ' Mano fuerte: paga doble.' : ''}`,
                { gold: betPayout(m, big ? 3 : 2) });
        } else if (cmp === 0) finish('draw', `Empate: los dos con ${name(a)}. Te devuelven tu apuesta.`, { gold: m.bet });
        else finish('lose', `La casa gana con ${name(h)} contra tu ${name(a)}.`);
    };

    // ---------- AJEDREZ ----------
    // piezas: frutitas chiquitas. Las tuyas frescas y felices sobre base verde,
    // las rivales moradas (pasadas) y enojadas sobre base morada.
    //   peón = uva · torre = piña · caballo = plátano · alfil = pera · reina = fresa · rey = naranja
    const PIECE_COLORS = {
        0: { P: '#9BD66A', R: '#FFCF4D', N: '#FFE27A', B: '#C8E07A', Q: '#F2667A', K: '#FFA64D', base: '#7BBF5A' },
        1: { P: '#8E6AC8', R: '#B79AE0', N: '#C9B2EC', B: '#9C84CC', Q: '#A0558E', K: '#7F5FB0', base: '#5E4A94' }
    };
    function fruitPiece(t, team, mood, withFace) {
        const { INK, st, shine, face } = window.SPRITE_KIT;
        const col = PIECE_COLORS[team][t];
        const f = (x, y, s) => (withFace ? face(x, y, mood, s) : '');
        const leafy = (x, y, r) => `<path d="M${x} ${y} Q${x - 10} ${y - 10} ${x - 16} ${y - 4} Q${x - 8} ${y + 2} ${x} ${y} Z" fill="#6FBF4A" ${st(2.5)} transform="rotate(${r || 0} ${x} ${y})"/>`;
        const base = `<ellipse cx="50" cy="88" rx="30" ry="8" fill="${PIECE_COLORS[team].base}" ${st(3)}/>`;
        let body = '';
        if (t === 'P') { // uva
            body = `<path d="M50 42 Q50 32 56 28" ${st(3)} fill="none"/>${leafy(54, 32, 20)}
                <circle cx="50" cy="62" r="21" fill="${col}" ${st()}/>${shine(42, 53, 3, 6)}${f(50, 64, 0.5)}`;
        } else if (t === 'R') { // piña con hojas en forma de almenas
            body = `<path d="M30 26 L30 12 L38 18 L44 8 L50 16 L56 8 L62 18 L70 12 L70 26 Z" fill="#6FBF4A" ${st(3)}/>
                <rect x="28" y="24" width="44" height="58" rx="18" fill="${col}" ${st()}/>
                <path d="M32 40 L68 70 M32 58 L54 78 M46 26 L70 48 M68 40 L32 70 M68 58 L46 78 M54 26 L30 48" stroke="${INK}" stroke-width="2" opacity=".2"/>
                ${shine(36, 38, 3, 7)}${f(50, 56, 0.55)}`;
        } else if (t === 'N') { // plátano con orejita de caballo
            body = `<path d="M34 84 Q24 56 34 36 Q42 20 58 16 L62 8 L66 18 Q78 26 72 34 Q66 30 60 34 Q52 44 54 60 Q56 74 66 84 Z" fill="${col}" ${st()}/>
                <path d="M40 76 Q34 56 40 42" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>
                ${withFace ? window.SPRITE_KIT2.eyesOnly(56, 27, mood, 0.42) : ''}<circle cx="70" cy="30" r="1.8" fill="${INK}"/>`;
        } else if (t === 'B') { // pera con la ranura del alfil
            body = `<path d="M50 12 Q42 12 40 24 Q38 36 34 44 Q24 58 30 72 Q36 84 50 84 Q64 84 70 72 Q76 58 66 44 Q62 36 60 24 Q58 12 50 12 Z" fill="${col}" ${st()}/>
                <path d="M50 12 L52 4" ${st(3)} fill="none"/>${leafy(52, 8, 30)}
                <path d="M56 22 L46 34" ${st(3)} fill="none"/>${shine(38, 52, 3, 7)}${f(50, 62, 0.55)}`;
        } else if (t === 'Q') { // fresa con corona
            body = `<path d="M50 84 Q26 70 28 46 Q30 32 50 34 Q70 32 72 46 Q74 70 50 84 Z" fill="${col}" ${st()}/>
                ${[[38, 48], [62, 48], [50, 76], [36, 66], [64, 66]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.6" fill="#FFE9A8"/>`).join('')}
                <path d="M32 36 L30 14 L40 24 L50 8 L60 24 L70 14 L68 36 Z" fill="#FFCF4D" ${st(3)}/>
                <circle cx="50" cy="8" r="3.5" fill="#F2667A" ${st(2)}/>${f(50, 58, 0.55)}`;
        } else { // rey: naranja con coronita y cruz
            body = `<circle cx="50" cy="60" r="25" fill="${col}" ${st()}/>
                ${[[40, 50], [62, 50], [42, 74], [60, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${INK}" opacity=".2"/>`).join('')}
                <path d="M34 38 L34 26 L42 32 L50 22 L58 32 L66 26 L66 38 Z" fill="#FFCF4D" ${st(3)}/>
                <path d="M50 20 L50 6 M44 11 L56 11" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
                <path d="M50 20 L50 6 M44 11 L56 11" stroke="#FFCF4D" stroke-width="3" stroke-linecap="round"/>
                ${shine(40, 50, 3, 6)}${f(50, 62, 0.55)}`;
        }
        return base + body;
    }
    MG.fruitPiece = fruitPiece; // lo usa tools/export-sprites.js para sacar las piezas del juego nativo
    function pieceArt(p, small) {
        if (!window.SPRITE_KIT) return GLYPH[p.t];
        return `<span class="art"><svg class="sprite" viewBox="0 0 100 100">${fruitPiece(p.t, p.c, p.c === 0 ? 'happy' : 'angry', !small)}</svg></span>`;
    }
    function chessDepth() { const c = GAME.player ? GAME.player.act : 1; return c >= 3 ? 3 : c === 2 ? 2 : 1; }
    function chessSloppy() { const c = GAME.player ? GAME.player.act : 1; return c >= 3 ? 0 : c === 2 ? 0.08 : 0.3; }
    function startChess(m) {
        m.board = MG.newBoard();
        m.turn = 'player';
        m.sel = null;
        m.targets = [];
        m.last = null;
        m.plies = 0;
        m.lost = []; // piezas tuyas comidas
        m.won = [];  // piezas del rival que te comiste
        m.phase = 'play';
        m.note = 'Es tu turno. Toca una de tus piezas (las verdes).';
        render();
    }
    function renderChess(m, info) {
        const cells = [];
        for (let r = 0; r < CH.ROWS; r++) {
            for (let c = 0; c < CH.COLS; c++) {
                const p = m.board[r][c];
                const isSel = m.sel && m.sel.r === r && m.sel.c === c;
                const target = m.targets.find((t) => t.r === r && t.c === c);
                const last = m.last && ((m.last.fr === r && m.last.fc === c) || (m.last.tr === r && m.last.tc === c));
                const clickable = m.phase === 'play' && m.turn === 'player' && !m.busy;
                cells.push(`<div class="sq ${(r + c) % 2 ? 'dark' : 'light'} ${isSel ? 'sel' : ''} ${target ? (p ? 'cap' : 'dot') : ''} ${last ? 'last' : ''}" data-r="${r}" data-c="${c}" ${clickable ? `onclick="mgChessClick(${r},${c})"` : ''}>
                    ${p ? `<span class="piece ${p.c === 0 ? 'mine' : 'theirs'}">${pieceArt(p)}</span>` : ''}</div>`);
            }
        }
        const tray = (list, cls) => `<div class="tray ${cls}">${list.map((t) => `<span>${pieceArt({ t, c: cls === 'won' ? 1 : 0 }, true)}</span>`).join('') || '<i>—</i>'}</div>`;
        const mine = MG.countPieces(m.board, 0), theirs = MG.countPieces(m.board, 1);
        if (m.phase !== 'result') m.say = m.turn === 'player' ? 'Tu jugada.' : 'Hmm…';
        return tableHtml(m, info, `
            <div class="chess-layout">
                <div class="chess-side">
                    <div class="hand chess-count">Piezas rivales: <b>${theirs}</b></div>
                    ${tray(m.won, 'won')}
                    <div class="hand chess-count">Tus piezas: <b>${mine}</b></div>
                    ${tray(m.lost, 'lost')}
                </div>
                <div class="chess-board">${cells.join('')}</div>
                <div class="chess-side">
                    <p class="hand chess-note">${m.phase === 'result' ? m.text : m.note}</p>
                    ${m.phase === 'result' ? `${lootRowHtml()}<button class="btn-mint" onclick="mgLeave()" ${lootPending() ? 'disabled' : ''}>Continuar</button>`
                        : `<button class="secondary" onclick="mgChessResign()" ${m.busy ? 'disabled' : ''}>Rendirme</button>`}
                </div>
            </div>`, 'mg-chess');
    }
    window.mgChessClick = function (r, c) {
        if (chessSuppressClick) return;
        const m = mg();
        if (!m || m.kind !== 'chess' || m.phase !== 'play' || m.turn !== 'player' || m.busy) return;
        const target = m.targets.find((t) => t.r === r && t.c === c);
        if (target && m.sel) { chessMove(m, { fr: m.sel.r, fc: m.sel.c, tr: r, tc: c }); return; }
        const p = m.board[r][c];
        if (p && p.c === 0) {
            const moves = MG.movesFor(m.board, r, c);
            if (!moves.length) { m.sel = null; m.targets = []; m.note = 'Esa pieza no tiene a dónde ir.'; if (window.Sfx) Sfx.denied(); }
            else { m.sel = { r, c }; m.targets = moves; m.note = 'Elige a dónde mover (puntos = libre, aro rojo = comer).'; if (window.Sfx) Sfx.select(); }
        } else { m.sel = null; m.targets = []; }
        render();
    };
    // Arrastrar piezas: al agarrar una de tus frutas se marcan sus jugadas y
    // una copia sigue al mouse; al soltarla en una casilla válida, se mueve.
    // (Tocar y tocar sigue funcionando igual.)
    let chessDrag = null;
    if (typeof document !== 'undefined') document.addEventListener('pointerdown', (e) => {
        const piece = e.target.closest && e.target.closest('.chess-board .piece.mine');
        const m = mg();
        if (!piece || e.button > 0 || !m || m.kind !== 'chess' || m.phase !== 'play' || m.turn !== 'player' || m.busy) return;
        const sq = piece.closest('.sq');
        const r = +sq.dataset.r, c = +sq.dataset.c;
        const rect = piece.getBoundingClientRect();
        const ghost = piece.cloneNode(true);
        ghost.classList.add('chess-ghost');
        Object.assign(ghost.style, { width: rect.width + 'px', height: rect.height + 'px', left: rect.left + 'px', top: rect.top + 'px' });
        chessDrag = { r, c, ghost, dx: e.clientX - rect.left, dy: e.clientY - rect.top, x0: e.clientX, y0: e.clientY, moved: false };
        if (!(m.sel && m.sel.r === r && m.sel.c === c)) mgChessClick(r, c);
        e.preventDefault();
    });
    function chessSquareAt(x, y) {
        const el = document.elementFromPoint(x, y);
        return el && el.closest ? el.closest('.chess-board .sq') : null;
    }
    if (typeof document !== 'undefined') document.addEventListener('pointermove', (e) => {
        const d = chessDrag;
        if (!d) return;
        if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
        if (!d.moved) {
            d.moved = true;
            document.body.appendChild(d.ghost);
            const from = document.querySelector(`.chess-board .sq[data-r="${d.r}"][data-c="${d.c}"] .piece`);
            if (from) from.classList.add('lifted');
        }
        d.ghost.style.left = (e.clientX - d.dx) + 'px';
        d.ghost.style.top = (e.clientY - d.dy) + 'px';
        document.querySelectorAll('.chess-board .sq.hover').forEach((s) => s.classList.remove('hover'));
        const sq = chessSquareAt(e.clientX, e.clientY);
        if (sq && (sq.classList.contains('dot') || sq.classList.contains('cap'))) sq.classList.add('hover');
    });
    if (typeof document !== 'undefined') document.addEventListener('pointerup', (e) => {
        const d = chessDrag;
        if (!d) return;
        chessDrag = null;
        d.ghost.remove();
        if (!d.moved) return; // fue un toque: ya quedó seleccionada
        document.querySelectorAll('.chess-board .piece.lifted').forEach((p) => p.classList.remove('lifted'));
        const m = mg();
        const sq = chessSquareAt(e.clientX, e.clientY);
        if (!m || !sq || m.phase !== 'play' || m.turn !== 'player' || m.busy) { render(); return; }
        const tr = +sq.dataset.r, tc = +sq.dataset.c;
        if (m.sel && m.targets.find((t) => t.r === tr && t.c === tc)) {
            chessSuppressClick = true;
            setTimeout(() => { chessSuppressClick = false; }, 0);
            chessMove(m, { fr: m.sel.r, fc: m.sel.c, tr, tc });
        } else render();
    });
    let chessSuppressClick = false;

    function chessMove(m, mv) {
        const res = MG.applyMove(m.board, mv);
        const mover = m.board[mv.fr][mv.fc];
        m.board = res.board;
        m.last = mv;
        m.sel = null;
        m.targets = [];
        m.plies++;
        if (res.captured) {
            (mover.c === 0 ? m.won : m.lost).push(res.captured.t);
            if (window.Sfx) Sfx.hit();
        } else if (window.Sfx) Sfx.mapMove();
        if (res.promoted) m.note = mover.c === 0 ? '¡Tu peón se coronó reina!' : '¡Un peón rival se coronó reina!';
        else m.note = mover.c === 0 ? 'El rival está pensando…' : 'Es tu turno.';
        if (checkChessEnd(m)) return;
        m.turn = mover.c === 0 ? 'enemy' : 'player';
        render();
        if (m.turn === 'enemy') enemyChessTurn(m);
        else if (!MG.allMoves(m.board, 0).length) { m.note = 'No tienes movimientos: pasas el turno.'; m.turn = 'enemy'; render(); enemyChessTurn(m); }
    }
    async function enemyChessTurn(m) {
        m.busy = true;
        render();
        await wait(650);
        if (GAME.mg !== m || m.phase !== 'play') return;
        const mv = MG.chooseEnemyMove(m.board, chessDepth(), chessSloppy());
        m.busy = false;
        if (!mv) {
            // el rival no puede mover: pasa
            m.note = 'El rival no tiene movimientos. Es tu turno.';
            m.turn = 'player';
            if (!MG.allMoves(m.board, 0).length) { chessFinishByMaterial(m); return; }
            render();
            return;
        }
        chessMove(m, mv);
    }
    // Gana quien se come todo; tras 60 jugadas se decide por material
    function checkChessEnd(m) {
        const mine = MG.countPieces(m.board, 0), theirs = MG.countPieces(m.board, 1);
        if (!theirs) { chessWin(m, '¡Te comiste TODAS las piezas rivales!'); return true; }
        if (!mine) { chessLose(m, 'El rival se comió todas tus piezas.'); return true; }
        if (m.plies >= 60) { chessFinishByMaterial(m); return true; }
        return false;
    }
    function chessFinishByMaterial(m) {
        const a = MG.material(m.board, 0), b = MG.material(m.board, 1);
        if (a > b) chessWin(m, 'Se acabó el tiempo y tienes más material que el rival: ¡ganas!');
        else if (a < b) chessLose(m, 'Se acabó el tiempo y el rival tiene más material.');
        else finish('draw', 'Tablas: nadie logró ventaja. Te llevas un poquito de oro.', { gold: 15 });
    }
    function chessWin(m, why) {
        const act = GAME.player.act;
        // el objeto no está asegurado: 2 de cada 5 victorias
        finish('win', `${why}`, { gold: 35 + 10 * act, relic: Math.random() < 0.4 });
    }
    function chessLose(m, why) {
        finish('lose', why, { hp: 6 + 2 * GAME.player.act });
    }
    window.mgChessResign = function () {
        const m = mg();
        if (!m || m.kind !== 'chess' || m.phase !== 'play' || m.busy) return;
        if (!confirm('¿Rendirte? Perderás vida.')) return;
        chessLose(m, 'Te rendiste.');
    };

    // ---------- pantalla ----------
    window.renderMinigame = function () {
        const m = mg();
        if (!m) return '';
        const info = KINDS[m.kind];
        if (m.phase === 'intro') return renderIntro(m, info);
        if (m.kind === 'dice') return renderDice(m, info);
        if (m.kind === 'slots') return renderSlots(m, info);
        if (m.kind === 'roulette') return renderRoulette(m, info);
        if (m.kind === 'poker') return renderPoker(m, info);
        return renderChess(m, info);
    };
})();
