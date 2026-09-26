// ============================================================
// MAP.JS — Generación del laberinto 2.0
// ============================================================

window.MAP_COLS = 20; // Aumentado significativamente
window.MAP_ROWS = 12;   // Aumentado significativamente
window.NODE_TYPES = {
    EMPTY: 'empty',
    ENEMY: 'enemy',
    REST: 'rest',
    TREASURE: 'treasure',
    SHOP: 'shop',
    MYSTERY: 'mystery',
    BOSS: 'boss'
};

// Los muros ya no son casillas, sino una matriz de conexiones bloqueadas
window.mapWalls = {
    horizontal: [], // muros entre x y x+1
    vertical: []     // muros entre y y y+1
};

window.generateMap = function (startY) {
    const COLS = window.MAP_COLS, ROWS = window.MAP_ROWS, T = window.NODE_TYPES;
    const map = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    // Generar muros aleatorios entre casillas
    window.mapWalls.horizontal = Array(ROWS).fill(null).map(() => Array(COLS - 1).fill(false));
    window.mapWalls.vertical = Array(ROWS - 1).fill(null).map(() => Array(COLS).fill(false));

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            // Muros aleatorios (aprox 45% de las conexiones están bloqueadas para más desafío)
            if (x < COLS - 1) window.mapWalls.horizontal[y][x] = Math.random() < 0.45;
            if (y < ROWS - 1) window.mapWalls.vertical[y][x] = Math.random() < 0.45;

            // Tipos de nodos
            if (x === 0) {
                map[y][x] = T.EMPTY;
            } else if (x === COLS - 1) {
                map[y][x] = (y === startY) ? T.BOSS : T.ENEMY;
            } else {
                if (Math.random() > 0.4) {
                    const r = Math.random();
                    if (r < 0.4) map[y][x] = T.ENEMY;
                    else if (r < 0.6) map[y][x] = T.REST;
                    else if (r < 0.8) map[y][x] = T.TREASURE;
                    else if (r < 0.9) map[y][x] = T.SHOP;
                    else map[y][x] = T.MYSTERY;
                } else {
                    map[y][x] = T.EMPTY;
                }
            }
        }
    }
    return map;
};
