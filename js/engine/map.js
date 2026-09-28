// ============================================================
// MAP.JS — Generación del laberinto de cada piso. Los "muros" NO son
// casillas propias: son bordes bloqueados entre dos casillas vecinas, ya
// sean verticales (entre x y x+1) u horizontales (entre y e y+1).
//
// El tamaño del mapa lo decide cada piso (crece con cada castillo): se
// lee siempre de los propios muros (wallsV[y] tiene cols-1 entradas y
// wallsV tiene una fila por cada fila del mapa), nunca de constantes.
//
// Reglas de movimiento:
//   · adelante (derecha), arriba o abajo — nunca hacia atrás;
//   · nunca a una casilla ya pisada;
//   · la última columna entera es la guarida del jefe: se entra desde
//     cualquier fila de la penúltima y empieza el combate.
// El generador garantiza que con esas reglas NUNCA te quedes atorado:
// en cada tramo vertical de una columna, las casillas de los extremos
// siempre tienen salida hacia adelante (ver ensureNoTraps) y una última
// pasada simula todos los recorridos posibles (ver repairDeadEnds).
// ============================================================

// tamaño por defecto (partidas guardadas de versiones viejas)
window.MAP_COLS = 12;
window.MAP_ROWS = 7;

window.NODE_TYPES = {
    EMPTY: 'empty',
    ENEMY: 'enemy',
    ELITE: 'elite',
    REST: 'rest',
    TREASURE: 'treasure',
    SHOP: 'shop',
    MYSTERY: 'mystery',
    GAME: 'game',
    GIFT: 'gift', // ya no se genera; solo existe para leer partidas viejas
    KEY: 'key',
    VAULT: 'vault',
    BLOCKED: 'blocked',
    BOSS: 'boss'
};

// Formas de mapa: cambian cuántos muros y ríos hay, para que cada piso se
// sienta distinto. wallV/wallH = probabilidad de muro en cada borde.
window.MAP_VARIANTS = {
    classic: { label: 'Clásico', wallV: 0.4, wallH: 0.45, rivers: 1, weight: 4 },
    open: { label: 'Despejado', wallV: 0.22, wallH: 0.28, rivers: 1, weight: 2 },
    maze: { label: 'Laberinto', wallV: 0.5, wallH: 0.55, rivers: 0, weight: 2 },
    rivers: { label: 'De ríos', wallV: 0.35, wallH: 0.4, rivers: 2, weight: 2 }
};
window.pickMapVariant = function (preferred) {
    if (preferred && window.MAP_VARIANTS[preferred] && Math.random() < 0.6) return preferred;
    const all = Object.keys(window.MAP_VARIANTS);
    let r = Math.random() * all.reduce((s, k) => s + window.MAP_VARIANTS[k].weight, 0);
    for (const k of all) { r -= window.MAP_VARIANTS[k].weight; if (r <= 0) return k; }
    return 'classic';
};

// Medidas de un mapa a partir de sus muros
window.mapDims = function (walls, grid) {
    if (walls && walls.wallsV && walls.wallsV.length) return { rows: walls.wallsV.length, cols: walls.wallsV[0].length + 1 };
    if (grid && grid.length) return { rows: grid.length, cols: grid[0].length };
    return { rows: window.MAP_ROWS, cols: window.MAP_COLS };
};

// wallsV[y][x] = true → muro entre (x,y) y (x+1,y)
// wallsH[y][x] = true → muro entre (x,y) y (x,y+1)
// grid: contenido de las casillas (para saber si el destino está bloqueado,
// ej. un árbol caído). Es un parámetro aparte porque en el estado guardado
// de la partida los muros (GAME.walls) y el contenido (GAME.map) viven en
// objetos distintos.
window.canStep = function (walls, grid, x, y, nx, ny) {
    const { cols: COLS, rows: ROWS } = window.mapDims(walls, grid);
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
    if (grid && grid[ny] && grid[ny][nx] === window.NODE_TYPES.BLOCKED) return false;
    if (nx === x + 1 && ny === y) return !walls.wallsV[y][x];          // adelante
    if (nx === x && ny === y - 1) return !walls.wallsH[ny][x];         // arriba
    if (nx === x && ny === y + 1) return !walls.wallsH[y][x];          // abajo
    return false;                                                     // atrás / diagonal: prohibido
};

// Movimiento completo: muros + casillas pisadas + última columna hacia el jefe
window.canMove = function (walls, grid, visited, x, y, nx, ny) {
    if (x === window.mapDims(walls, grid).cols - 1) return false; // ya estás en la guarida
    if (!window.canStep(walls, grid, x, y, nx, ny)) return false;
    return !visited.has(`${nx},${ny}`);
};

// Abre los muros necesarios para que no existan trampas. También sirve
// para arreglar mapas guardados con versiones anteriores del juego.
// grid es opcional (partidas viejas no tienen casillas bloqueadas): si se
// pasa, una casilla bloqueada corta el tramo (como un muro horizontal) y
// nunca es el extremo que recibe la salida forzada, porque ahí nunca habrá
// nadie parado.
window.ensureNoTraps = function (map, grid) {
    const { cols: COLS, rows: ROWS } = window.mapDims(map, grid);
    const T = window.NODE_TYPES;
    const { wallsV, wallsH } = map;
    const blocked = (x, y) => !!(grid && grid[y] && grid[y][x] === T.BLOCKED);
    // última columna: pasillo abierto hasta el jefe
    for (let y = 0; y < ROWS - 1; y++) wallsH[y][COLS - 1] = false;
    // en cada columna, los extremos de cada tramo vertical tienen salida
    for (let x = 0; x < COLS - 1; x++) {
        let top = -1;
        for (let y = 0; y < ROWS; y++) {
            if (blocked(x, y)) { top = -1; continue; }
            if (top === -1) top = y;
            const endOfRun = y === ROWS - 1 || wallsH[y][x] || blocked(x, y + 1);
            if (!endOfRun) continue;
            // la salida forzada tiene que caer en una casilla pisable: si un
            // árbol quedó justo enfrente del extremo, se quita ese árbol en
            // vez de intentar forzar un muro contra una casilla bloqueada
            // (eso no serviría de nada: quien llegue ahí seguiría sin poder
            // avanzar ni retroceder)
            if (grid && grid[top] && grid[top][x + 1] === T.BLOCKED) grid[top][x + 1] = T.EMPTY;
            if (grid && grid[y] && grid[y][x + 1] === T.BLOCKED) grid[y][x + 1] = T.EMPTY;
            wallsV[top][x] = false;
            wallsV[y][x] = false;
            top = -1;
        }
    }
    return map;
};

// ---------- contenido de las casillas ----------
// Bandas fijas + cupos repartidos + relleno de enemigos, sin que dos
// casillas especiales iguales queden pegadas. Las cantidades crecen con
// el tamaño del mapa (12x7 = 1).
function fillContent(grid, opts, COLS, ROWS) {
    const T = window.NODE_TYPES;
    const rnd = (n) => Math.floor(Math.random() * n);
    const range = (a, b) => (b < a ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i));
    const scale = (COLS * ROWS) / 84;
    const count = (base, min) => Math.max(min == null ? 1 : min, Math.round(base * scale));
    const touches = (x, y, type) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx] === type);
    const place = (type, n, xs, maxPerCol) => {
        if (!xs.length) return;
        const perCol = {};
        for (let guard = 0, placed = 0; placed < n && guard < 600; guard++) {
            const x = xs[rnd(xs.length)], y = rnd(ROWS);
            if (grid[y][x] !== T.EMPTY || touches(x, y, type)) continue;
            if (maxPerCol && (perCol[x] || 0) >= maxPerCol) continue;
            grid[y][x] = type;
            perCol[x] = (perCol[x] || 0) + 1;
            placed++;
        }
    };
    const mid = Math.floor(COLS / 2) - 1; // columna del tesoro
    const preBoss = COLS - 2;             // columna de campamentos antes del jefe

    // 1) antes del jefe: una fila de campamentos y una tiendita
    range(0, ROWS - 1).forEach((y) => { grid[y][preBoss] = y % 2 === 0 ? T.REST : T.EMPTY; });
    grid[1 + rnd(ROWS - 2)][preBoss] = T.SHOP;
    // 2) a mitad de camino: tesoros, repartidos en varias columnas (no
    // apilados en una sola) para que se mezclen mejor con lo demás
    place(T.TREASURE, count(3, 2), range(Math.max(1, mid - 1), mid + 1), 2);
    // 3) cupos repartidos: bastantes misterios y menos enemigos de relleno
    const eliteScale = Math.max(0.7, Math.min(1.4, scale));
    place(T.ELITE, Math.max(2, Math.round(opts.elites * eliteScale)), range(4, preBoss - 1), 1);
    place(T.SHOP, count(2), range(3, preBoss - 2), 1);
    place(T.REST, count(3, 2), range(3, preBoss - 1), 1);
    place(T.MYSTERY, count(15, 8), range(1, preBoss - 1), 2);
    place(T.TREASURE, count(1), range(3, preBoss - 1), 1);
    place(T.GAME, opts.games, range(2, preBoss - 1), 1);
    // la llave siempre en la primera mitad del camino, el cofre en la
    // segunda: para cuando la encuentres, tenga sentido que sirva más adelante
    place(T.KEY, 1, range(1, mid), 1);
    place(T.VAULT, 1, range(mid + 1, preBoss - 1), 1);
    // árboles/obstáculos: bloquean la casilla entera (no solo un borde)
    place(T.BLOCKED, count(3, 2), range(1, preBoss - 1), 1);
    // 4) relleno: enemigos, evitando amontonarse entre ellos
    for (let x = 1; x < preBoss; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (grid[y][x] !== T.EMPTY) continue;
            let chance = x <= 2 ? 0.42 : 0.3;
            if (touches(x, y, T.ENEMY)) chance *= 0.35;
            if (Math.random() < chance) grid[y][x] = T.ENEMY;
        }
    }
    // 5) de lo que sigue vacío, buena parte también se vuelve misterio: es
    // la casilla que más debe abundar en el mapa
    for (let x = 1; x < preBoss; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (grid[y][x] !== T.EMPTY || touches(x, y, T.MYSTERY)) continue;
            if (Math.random() < 0.4) grid[y][x] = T.MYSTERY;
        }
    }
}

// Simula el recorrido real (adelante/arriba/abajo, nunca atrás, nunca
// revisitar una casilla) y repara cualquier callejón sin salida que
// sobreviva a ensureNoTraps. Hace falta porque un río de un solo puente
// permite deambular libremente arriba/abajo por su columna con una única
// fila cruzable: quien camine hacia el lado equivocado del puente, al no
// poder volver sobre sus pasos, puede quedar encerrado — algo que la
// garantía normal de ensureNoTraps (pensada para columnas sin río) no
// cubre. La única reparación es ABRIR la salida hacia adelante (nunca
// cerrar nada: cerrar un borde puede ser la única ruta hacia otra casilla).
// rivers: [{ col, bridge }]
function repairDeadEnds(map, grid, startY, rivers) {
    const { cols: COLS } = window.mapDims(map, grid);
    const T = window.NODE_TYPES;
    const { wallsV } = map;
    const isLockedRiverRow = (x, y) => rivers.some((r) => r.col === x && r.bridge !== y);
    for (let guard = 0; guard < 600; guard++) {
        const seen = new Set();
        const stack = [[0, startY, 0]];
        let deadEnd = null;
        while (stack.length) {
            const [x, y, dir] = stack.pop();
            const skey = `${x},${y},${dir}`;
            if (seen.has(skey)) continue;
            seen.add(skey);
            if (x === COLS - 1) continue; // llegó a la guarida del jefe: recorrido completo
            const moves = [];
            if (window.canStep(map, grid, x, y, x + 1, y)) moves.push([x + 1, y, 0]);
            if (dir <= 0 && window.canStep(map, grid, x, y, x, y - 1)) moves.push([x, y - 1, -1]);
            if (dir >= 0 && window.canStep(map, grid, x, y, x, y + 1)) moves.push([x, y + 1, 1]);
            if (!moves.length) { deadEnd = { x, y }; break; }
            moves.forEach(([nx, ny, ndir]) => stack.push([nx, ny, ndir]));
        }
        if (!deadEnd) return true; // todo recorrido posible llega a la guarida del jefe
        const { x, y } = deadEnd;
        if (x < COLS - 1 && !isLockedRiverRow(x, y) && grid[y][x + 1] !== T.BLOCKED) {
            wallsV[y][x] = false;
            continue;
        }
        return false; // no se puede abrir sin romper un río o topar con un árbol
    }
    return false;
}

// opts: { elites, cols, rows, variant, games }
window.generateMap = function (startY, opts) {
    opts = Object.assign({ elites: 3, cols: window.MAP_COLS, rows: window.MAP_ROWS, variant: 'classic', games: 1 }, opts || {});
    const COLS = opts.cols, ROWS = opts.rows, T = window.NODE_TYPES;
    const V = window.MAP_VARIANTS[opts.variant] || window.MAP_VARIANTS.classic;
    const bossY = Math.floor(Math.random() * ROWS);

    const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(T.EMPTY));
    fillContent(grid, opts, COLS, ROWS);
    // la última columna entera es la guarida del jefe
    for (let y = 0; y < ROWS; y++) grid[y][COLS - 1] = T.BOSS;

    // --- ríos: columnas que solo se cruzan por un puente ---
    const preBoss = COLS - 2, mid = Math.floor(COLS / 2) - 1;
    const candidates = [];
    for (let x = 2; x <= preBoss - 2; x++) if (x < mid - 1 || x > mid + 1) candidates.push(x);
    const rivers = [];
    for (let k = 0; k < V.rivers && candidates.length; k++) {
        // los ríos van separados (mínimo 3 columnas) para que sus orillas no se pisen
        const free = candidates.filter((c) => rivers.every((r) => Math.abs(r.col - c) >= 3));
        if (!free.length) break;
        rivers.push({ col: free[Math.floor(Math.random() * free.length)], bridge: Math.floor(Math.random() * ROWS) });
    }
    // ni la columna del río ni la de aterrizaje pueden tener un árbol: al
    // entrar solo por el puente, un árbol partiría la columna en dos
    // mitades y una se quedaría sin ninguna entrada posible
    rivers.forEach((r) => {
        for (let y = 0; y < ROWS; y++) {
            if (grid[y][r.col] === T.BLOCKED) grid[y][r.col] = T.EMPTY;
            if (grid[y][r.col + 1] === T.BLOCKED) grid[y][r.col + 1] = T.EMPTY;
        }
    });
    // Dos árboles en diagonal pueden "pinzar" la casilla de en medio y
    // dejarla sin ninguna entrada posible (sobre todo pegada a un borde,
    // donde ya le falta un lado). Si eso pasa, se quita uno de los dos.
    for (let y = 0; y < ROWS; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === T.BLOCKED) continue;
            const around = [[x - 1, y], [x, y - 1], [x, y + 1]].filter(([, cy]) => cy >= 0 && cy < ROWS);
            if (around.some(([cx, cy]) => grid[cy][cx] !== T.BLOCKED)) continue;
            const toClear = around.find(([cx, cy]) => grid[cy][cx] === T.BLOCKED);
            if (toClear) grid[toClear[1]][toClear[0]] = T.EMPTY;
        }
    }
    let blockedCount = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === T.BLOCKED) blockedCount++;

    // --- muros al azar ---
    const wallsV = Array(ROWS).fill(null).map(() => Array(COLS - 1).fill(false).map(() => Math.random() < V.wallV));
    const wallsH = Array(ROWS - 1).fill(null).map(() => Array(COLS).fill(false).map(() => Math.random() < V.wallH));
    const map = { grid, wallsV, wallsH, bossY };

    const forceRivers = () => {
        // toda la columna del río Y la de aterrizaje quedan como un solo
        // tramo (se puede subir/bajar libre) para que, entrando solo por el
        // puente, se llegue a cualquier fila de la columna de aterrizaje
        rivers.forEach((r) => {
            for (let y = 0; y < ROWS - 1; y++) { wallsH[y][r.col] = false; wallsH[y][r.col + 1] = false; }
            for (let y = 0; y < ROWS; y++) wallsV[y][r.col] = (y !== r.bridge); // solo el puente cruza
        });
    };
    forceRivers();

    const key = (x, y) => `${x},${y}`;
    const neighbors = (x, y) => [[x + 1, y], [x, y - 1], [x, y + 1]];
    const reachFromStart = () => {
        const seen = new Set([key(0, startY)]);
        const stack = [[0, startY]];
        while (stack.length) {
            const [x, y] = stack.pop();
            neighbors(x, y).forEach(([nx, ny]) => {
                if (window.canStep(map, grid, x, y, nx, ny) && !seen.has(key(nx, ny))) {
                    seen.add(key(nx, ny)); stack.push([nx, ny]);
                }
            });
        }
        return seen;
    };
    const openWall = (x, y, nx, ny) => {
        if (nx === x + 1) wallsV[y][x] = false;
        else if (ny === y - 1) wallsH[ny][x] = false;
        else wallsH[y][x] = false;
    };

    // Quitar muros hasta que no haya zonas encerradas: toda casilla que no
    // esté bloqueada se puede alcanzar desde el inicio (entrando por la
    // izquierda, arriba o abajo). El cruce de un río nunca se destapa aquí:
    // el único paso permitido es el puente ya fijado arriba.
    const entrances = (x, y) => [[x - 1, y], [x, y - 1], [x, y + 1]]
        .filter(([px, py]) => px >= 0 && py >= 0 && py < ROWS);
    const isRiverCross = (px, py, x, y) => rivers.some((r) => px === r.col && x === r.col + 1 && py === y && y !== r.bridge);
    const targetReach = COLS * ROWS - blockedCount;
    for (let guard = 0; guard < 2000; guard++) {
        const reach = reachFromStart();
        if (reach.size >= targetReach) break;
        const frontier = [];
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (grid[y][x] === T.BLOCKED || reach.has(key(x, y))) continue;
                entrances(x, y).forEach(([px, py]) => {
                    if (grid[py] && grid[py][px] === T.BLOCKED) return;
                    if (isRiverCross(px, py, x, y)) return;
                    if (reach.has(key(px, py))) frontier.push([px, py, x, y]);
                });
            }
        }
        if (!frontier.length) break;
        const [px, py, x, y] = frontier[Math.floor(Math.random() * frontier.length)];
        openWall(px, py, x, y);
    }

    // Sin trampas con la regla de "no volver a pisar". OJO: a propósito NO
    // se vuelve a forzar el río después de esto. Como la columna del río
    // quedó unificada en un solo tramo (ver forceRivers), ensureNoTraps le
    // garantiza sus dos extremos (arriba y abajo del todo) con salida hacia
    // adelante, igual que a cualquier otra columna — exactamente lo mismo
    // que evita que alguien quede atorado en el resto del mapa. Total: el
    // río se cruza por el puente Y por sus dos orillas extremas
    // (arriba/abajo del mapa), nunca por en medio.
    window.ensureNoTraps(map, grid);
    // última pasada de seguridad: simula el recorrido real y repara
    // cualquier callejón que, aun así, se le haya escapado a lo anterior.
    repairDeadEnds(map, grid, startY, rivers);
    map.rivers = rivers;
    // compatibilidad con partidas guardadas por versiones anteriores
    map.riverCol = rivers.length ? rivers[0].col : null;
    map.bridgeRow = rivers.length ? rivers[0].bridge : null;
    map.cols = COLS;
    map.rows = ROWS;
    map.variant = opts.variant;
    map.seed = Math.floor(Math.random() * 1e9);
    return map;
};

// Comprueba (para pruebas) que desde el inicio se llega siempre a la guarida
// del jefe y que ningún recorrido posible termina en un callejón.
window.mapIsSound = function (map, startY) {
    const { cols: COLS } = window.mapDims(map, map.grid);
    const seen = new Set();
    const stack = [[0, startY, 0]];
    let reachedBoss = false;
    while (stack.length) {
        const [x, y, dir] = stack.pop();
        const k = `${x},${y},${dir}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (x === COLS - 1) { reachedBoss = true; continue; }
        const moves = [];
        if (window.canStep(map, map.grid, x, y, x + 1, y)) moves.push([x + 1, y, 0]);
        if (dir <= 0 && window.canStep(map, map.grid, x, y, x, y - 1)) moves.push([x, y - 1, -1]);
        if (dir >= 0 && window.canStep(map, map.grid, x, y, x, y + 1)) moves.push([x, y + 1, 1]);
        if (!moves.length) return { ok: false, deadEnd: { x, y } };
        moves.forEach(([nx, ny, nd]) => stack.push([nx, ny, nd]));
    }
    return { ok: reachedBoss };
};
