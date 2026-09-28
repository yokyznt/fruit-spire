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
    WELL: 'well',
    BOSS: 'boss'
};

// Probabilidad de que un borde entre dos casillas tenga muro.
const WALL_CHANCE_V = 0.4;  // muros verticales (bloquean avanzar)
const WALL_CHANCE_H = 0.45; // muros horizontales (bloquean subir/bajar)

// wallsV[y][x] = true → muro entre (x,y) y (x+1,y)
// wallsH[y][x] = true → muro entre (x,y) y (x,y+1)
window.canStep = function (map, x, y, nx, ny) {
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
    if (nx === x + 1 && ny === y) return !map.wallsV[y][x];          // adelante
    if (nx === x && ny === y - 1) return !map.wallsH[ny][x];         // arriba
    if (nx === x && ny === y + 1) return !map.wallsH[y][x];          // abajo
    return false;                                                    // atrás / diagonal: prohibido
};

// Movimiento completo: muros + casillas pisadas + última columna hacia el jefe
window.canMove = function (map, visited, x, y, nx, ny) {
    if (x === window.MAP_COLS - 1) return false; // ya estás en la guarida
    if (!window.canStep(map, x, y, nx, ny)) return false;
    return !visited.has(`${nx},${ny}`);
};

// Abre los muros necesarios para que no existan trampas. También sirve
// para arreglar mapas guardados con versiones anteriores del juego.
window.ensureNoTraps = function (map) {
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS;
    const { wallsV, wallsH } = map;
    // última columna: pasillo abierto hasta el jefe
    for (let y = 0; y < ROWS - 1; y++) wallsH[y][COLS - 1] = false;
    // en cada columna, los extremos de cada tramo vertical tienen salida
    for (let x = 0; x < COLS - 1; x++) {
        let top = 0;
        for (let y = 0; y < ROWS; y++) {
            const endOfRun = y === ROWS - 1 || wallsH[y][x];
            if (!endOfRun) continue;
            wallsV[top][x] = false;
            wallsV[y][x] = false;
            top = y + 1;
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
    place(T.WELL, 2, range(2, preBoss - 1), 1);
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

// opts: { elites } — cuántas casillas de élite (sube con la dificultad)
window.generateMap = function (startY, opts) {
    opts = Object.assign({ elites: 3 }, opts || {});
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS, T = window.NODE_TYPES;
    const bossY = Math.floor(Math.random() * ROWS);

    const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(T.EMPTY));
    fillContent(grid, opts);
    // la última columna entera es la guarida del jefe
    for (let y = 0; y < ROWS; y++) grid[y][COLS - 1] = T.BOSS;

    // --- muros al azar ---
    const wallsV = Array(ROWS).fill(null).map(() => Array(COLS - 1).fill(false).map(() => Math.random() < WALL_CHANCE_V));
    const wallsH = Array(ROWS - 1).fill(null).map(() => Array(COLS).fill(false).map(() => Math.random() < WALL_CHANCE_H));
    const map = { grid, wallsV, wallsH, bossY };

    const key = (x, y) => `${x},${y}`;
    const neighbors = (x, y) => [[x + 1, y], [x, y - 1], [x, y + 1]];
    const reachFromStart = () => {
        const seen = new Set([key(0, startY)]);
        const stack = [[0, startY]];
        while (stack.length) {
            const [x, y] = stack.pop();
            neighbors(x, y).forEach(([nx, ny]) => {
                if (window.canStep(map, x, y, nx, ny) && !seen.has(key(nx, ny))) {
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

    // Quitar muros hasta que no haya zonas encerradas: toda casilla se
    // puede alcanzar desde el inicio (entrando por la izquierda, arriba o abajo).
    const entrances = (x, y) => [[x - 1, y], [x, y - 1], [x, y + 1]]
        .filter(([px, py]) => px >= 0 && py >= 0 && py < ROWS);
    for (let guard = 0; guard < 1000; guard++) {
        const reach = reachFromStart();
        if (reach.size === COLS * ROWS) break;
        const frontier = [];
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (reach.has(key(x, y))) continue;
                entrances(x, y).forEach(([px, py]) => {
                    if (reach.has(key(px, py))) frontier.push([px, py, x, y]);
                });
            }
        }
        if (!frontier.length) break;
        const [px, py, x, y] = frontier[Math.floor(Math.random() * frontier.length)];
        openWall(px, py, x, y);
    }

    // Sin trampas con la regla de "no volver a pisar"
    window.ensureNoTraps(map);
    return map;
};
