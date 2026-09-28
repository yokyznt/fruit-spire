// ============================================================
// MAP.JS — Generación del laberinto. Los "muros" NO son casillas
// propias: son bordes bloqueados entre dos casillas vecinas, ya sea
// verticales (entre x y x+1) u horizontales (entre y e y+1).
//
// Reglas de movimiento:
//   · adelante (derecha), arriba o abajo — nunca hacia atrás;
//   · nunca a una casilla ya pisada;
//   · la última columna entera es la guarida del jefe: se entra desde
//     cualquier fila de la penúltima y empieza el combate.
// El generador garantiza que con esas reglas NUNCA te quedes atorado:
// en cada tramo vertical de una columna, las casillas de los extremos
// siempre tienen salida hacia adelante (ver ensureNoTraps).
// ============================================================

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
    GIFT: 'gift',
    KEY: 'key',
    VAULT: 'vault',
    BLOCKED: 'blocked',
    BOSS: 'boss'
};

// Probabilidad de que un borde entre dos casillas tenga muro.
const WALL_CHANCE_V = 0.4;  // muros verticales (bloquean avanzar)
const WALL_CHANCE_H = 0.45; // muros horizontales (bloquean subir/bajar)

// wallsV[y][x] = true → muro entre (x,y) y (x+1,y)
// wallsH[y][x] = true → muro entre (x,y) y (x,y+1)
// grid: contenido de las casillas (para saber si el destino está bloqueado,
// ej. un árbol caído). Es un parámetro aparte porque en el estado guardado
// de la partida los muros (GAME.walls) y el contenido (GAME.map) viven en
// objetos distintos.
window.canStep = function (walls, grid, x, y, nx, ny) {
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
    if (grid && grid[ny] && grid[ny][nx] === window.NODE_TYPES.BLOCKED) return false;
    if (nx === x + 1 && ny === y) return !walls.wallsV[y][x];          // adelante
    if (nx === x && ny === y - 1) return !walls.wallsH[ny][x];         // arriba
    if (nx === x && ny === y + 1) return !walls.wallsH[y][x];          // abajo
    return false;                                                     // atrás / diagonal: prohibido
};

// Movimiento completo: muros + casillas pisadas + última columna hacia el jefe
window.canMove = function (walls, grid, visited, x, y, nx, ny) {
    if (x === window.MAP_COLS - 1) return false; // ya estás en la guarida
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
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS, T = window.NODE_TYPES;
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
// casillas especiales iguales queden pegadas.
function fillContent(grid, opts) {
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS, T = window.NODE_TYPES;
    const rnd = (n) => Math.floor(Math.random() * n);
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const touches = (x, y, type) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx] === type);
    const place = (type, count, xs, maxPerCol) => {
        const perCol = {};
        for (let guard = 0, placed = 0; placed < count && guard < 400; guard++) {
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
    place(T.TREASURE, 3, range(Math.max(1, mid - 1), mid + 1), 2);
    // 3) cupos repartidos: bastantes más misterios que antes, y menos
    // enemigos de relleno (se abaten en el paso 4)
    place(T.ELITE, opts.elites, range(4, preBoss - 1), 1);
    place(T.SHOP, 2, range(3, preBoss - 2), 1);
    place(T.REST, 3, range(3, preBoss - 1), 1);
    place(T.MYSTERY, 15, range(1, preBoss - 1), 2);
    place(T.TREASURE, 1, range(3, preBoss - 1), 1);
    place(T.GIFT, 2 + (Math.random() < 0.5 ? 1 : 0), range(2, preBoss - 1), 1);
    // la llave siempre en la primera mitad del camino, el cofre en la
    // segunda: para cuando la encuentres, tenga sentido que sirva más adelante
    place(T.KEY, 1, range(1, mid), 1);
    place(T.VAULT, 1, range(mid + 1, preBoss - 1), 1);
    // árboles/obstáculos: bloquean la casilla entera (no solo un borde)
    place(T.BLOCKED, 3, range(1, preBoss - 1), 1);
    // 4) relleno: enemigos, ya bastante menos frecuentes que antes, y
    // evitando amontonarse entre ellos para que el mapa se sienta variado
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
// cubre. Si se encuentra un callejón así, se cierra el último paso que
// llevó hasta él (en vez de abrir uno hacia adelante, que rompería el
// único cruce permitido del río).
function repairDeadEnds(map, grid, startY, riverCol, bridgeRow) {
    const COLS = window.MAP_COLS, T = window.NODE_TYPES;
    const { wallsV, wallsH } = map;
    for (let guard = 0; guard < 300; guard++) {
        const cameFrom = new Map();
        const seen = new Set();
        const stack = [[0, startY, 0, null]];
        let deadEnd = null;
        while (stack.length) {
            const [x, y, dir, parentKey] = stack.pop();
            const skey = `${x},${y},${dir}`;
            if (seen.has(skey)) continue;
            seen.add(skey);
            if (parentKey) cameFrom.set(skey, parentKey);
            if (x === COLS - 1) continue; // llegó a la guarida del jefe: recorrido completo
            const moves = [];
            if (window.canStep(map, grid, x, y, x + 1, y)) moves.push([x + 1, y, 0]);
            if (dir <= 0 && window.canStep(map, grid, x, y, x, y - 1)) moves.push([x, y - 1, -1]);
            if (dir >= 0 && window.canStep(map, grid, x, y, x, y + 1)) moves.push([x, y + 1, 1]);
            if (!moves.length) { deadEnd = { x, y, skey }; break; }
            moves.forEach(([nx, ny, ndir]) => stack.push([nx, ny, ndir, skey]));
        }
        if (!deadEnd) return; // todo recorrido posible llega a la guarida del jefe
        const { x, y } = deadEnd;
        // Única reparación: abrir la salida hacia adelante (nunca cerrar
        // nada). Cerrar un borde para "desviar" el camino hacia el callejón
        // es tentador, pero un borde puede ser la única ruta hacia OTRA
        // casilla por un camino distinto al que se está mirando ahora mismo:
        // cerrarlo puede arreglar este callejón y crear uno nuevo en otro
        // lado. Abrir, en cambio, nunca quita una ruta que ya existía.
        const isLockedRiverRow = riverCol != null && x === riverCol && y !== bridgeRow;
        if (x < COLS - 1 && !isLockedRiverRow && grid[y][x + 1] !== T.BLOCKED) {
            wallsV[y][x] = false;
            continue;
        }
        return; // no se puede abrir sin romper el río o topar con un árbol: no hay nada seguro que hacer aquí
    }
}

// opts: { elites } — cuántas casillas de élite (sube con la dificultad)
window.generateMap = function (startY, opts) {
    opts = Object.assign({ elites: 3 }, opts || {});
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS, T = window.NODE_TYPES;
    const bossY = Math.floor(Math.random() * ROWS);

    const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(T.EMPTY));
    fillContent(grid, opts);
    // la última columna entera es la guarida del jefe
    for (let y = 0; y < ROWS; y++) grid[y][COLS - 1] = T.BOSS;

    // --- río: una columna que solo se cruza por un puente ---
    const preBoss = COLS - 2, mid = Math.floor(COLS / 2) - 1;
    const riverCandidates = [];
    for (let x = 2; x <= preBoss - 2; x++) if (x < mid - 1 || x > mid + 1) riverCandidates.push(x);
    const riverCol = riverCandidates.length ? riverCandidates[Math.floor(Math.random() * riverCandidates.length)] : null;
    if (riverCol != null) {
        // ni la columna del río ni la de aterrizaje pueden tener un árbol: al
        // entrar solo por el puente, un árbol partiría la columna en dos
        // mitades y una se quedaría sin ninguna entrada posible
        for (let y = 0; y < ROWS; y++) {
            if (grid[y][riverCol] === T.BLOCKED) grid[y][riverCol] = T.EMPTY;
            if (grid[y][riverCol + 1] === T.BLOCKED) grid[y][riverCol + 1] = T.EMPTY;
        }
    }
    // Dos árboles en diagonal pueden "pinzar" la casilla de en medio y
    // dejarla sin ninguna entrada posible (sobre todo pegada a un borde,
    // donde ya le falta un lado). Si eso pasa, se quita uno de los dos.
    for (let y = 0; y < ROWS; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === T.BLOCKED) continue;
            const candidates = [[x - 1, y], [x, y - 1], [x, y + 1]].filter(([, cy]) => cy >= 0 && cy < ROWS);
            if (candidates.some(([cx, cy]) => grid[cy][cx] !== T.BLOCKED)) continue;
            const toClear = candidates.find(([cx, cy]) => grid[cy][cx] === T.BLOCKED);
            if (toClear) grid[toClear[1]][toClear[0]] = T.EMPTY;
        }
    }
    let blockedCount = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x] === T.BLOCKED) blockedCount++;

    // --- muros al azar ---
    const wallsV = Array(ROWS).fill(null).map(() => Array(COLS - 1).fill(false).map(() => Math.random() < WALL_CHANCE_V));
    const wallsH = Array(ROWS - 1).fill(null).map(() => Array(COLS).fill(false).map(() => Math.random() < WALL_CHANCE_H));
    const map = { grid, wallsV, wallsH, bossY };

    const bridgeRow = riverCol != null ? Math.floor(Math.random() * ROWS) : null;
    const forceRiver = () => {
        if (riverCol == null) return;
        // toda la columna del río Y la de aterrizaje quedan como un solo
        // tramo (se puede subir/bajar libre) para que, entrando solo por el
        // puente, se llegue a cualquier fila de la columna de aterrizaje
        for (let y = 0; y < ROWS - 1; y++) { wallsH[y][riverCol] = false; wallsH[y][riverCol + 1] = false; }
        for (let y = 0; y < ROWS; y++) wallsV[y][riverCol] = (y !== bridgeRow); // solo el puente cruza
    };
    forceRiver();

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
    // izquierda, arriba o abajo). El cruce del río nunca se destapa aquí:
    // el único paso permitido es el puente ya fijado arriba.
    const entrances = (x, y) => [[x - 1, y], [x, y - 1], [x, y + 1]]
        .filter(([px, py]) => px >= 0 && py >= 0 && py < ROWS);
    const targetReach = COLS * ROWS - blockedCount;
    for (let guard = 0; guard < 1000; guard++) {
        const reach = reachFromStart();
        if (reach.size >= targetReach) break;
        const frontier = [];
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (grid[y][x] === T.BLOCKED || reach.has(key(x, y))) continue;
                entrances(x, y).forEach(([px, py]) => {
                    if (grid[py] && grid[py][px] === T.BLOCKED) return;
                    if (riverCol != null && px === riverCol && x === riverCol + 1 && py === y && y !== bridgeRow) return;
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
    // quedó unificada en un solo tramo (ver forceRiver), ensureNoTraps le
    // garantiza sus dos extremos (arriba y abajo del todo) con salida hacia
    // adelante, igual que a cualquier otra columna — exactamente lo mismo
    // que evita que alguien quede atorado en el resto del mapa. Si después
    // se "reafirmara" el río cerrando esos extremos de nuevo (como se hacía
    // antes), alguien que camine hacia el lado del río sin puente, al no
    // poder dar marcha atrás, quedaría encerrado de verdad — ese fue
    // justamente el bug reportado. Total: el río se cruza por el puente Y
    // por sus dos orillas extremas (arriba/abajo del mapa), nunca por en
    // medio — sigue siendo un cuello de botella real, solo que con hasta 3
    // pasos posibles en vez de uno.
    window.ensureNoTraps(map, grid);
    // última pasada de seguridad: simula el recorrido real (con la regla de
    // no poder revisitar ni retroceder) y repara cualquier callejón que, aun
    // así, se le haya escapado a lo anterior (p. ej. por los obstáculos).
    repairDeadEnds(map, grid, startY, riverCol, bridgeRow);
    map.riverCol = riverCol;
    map.bridgeRow = bridgeRow;
    return map;
};
