// Genera miles de mapas de todos los tamaños y formas y comprueba que nunca haya callejones sin salida.
// Uso: node tests/map.test.js
global.window = global;
const path = require('path');
require(process.argv[2] || path.join(__dirname, '..', 'js', 'engine', 'map.js'));
const sizes = [[9, 5], [10, 5], [11, 6], [12, 6], [13, 7], [14, 7], [15, 8], [12, 7], [8, 3]];
let bad = 0, total = 0;
const stats = {};
for (const [cols, rows] of sizes) {
    for (const variant of Object.keys(window.MAP_VARIANTS)) {
        for (let i = 0; i < 300; i++) {
            const startY = Math.floor(rows / 2);
            const m = window.generateMap(startY, { elites: 2 + (i % 4), cols, rows, variant, games: 1 + (i % 3) });
            total++;
            const r = window.mapIsSound(m, startY);
            // dimensiones coherentes
            const d = window.mapDims(m, m.grid);
            const dimOk = d.cols === cols && d.rows === rows && m.grid.length === rows && m.grid[0].length === cols;
            // hay jefe en toda la última columna
            const bossOk = m.grid.every((row) => row[cols - 1] === 'boss');
            // el inicio no está bloqueado
            const startOk = m.grid[startY][0] !== 'blocked';
            if (!r.ok || !dimOk || !bossOk || !startOk) {
                bad++;
                if (bad < 6) console.log('MAL', cols, rows, variant, JSON.stringify(r), dimOk, bossOk, startOk);
            }
            const key = `${cols}x${rows}`;
            stats[key] = stats[key] || { games: 0, cells: 0, elite: 0, blocked: 0 };
            m.grid.forEach((row) => row.forEach((c) => { stats[key].cells++; if (c === 'game') stats[key].games++; if (c === 'elite') stats[key].elite++; if (c === 'blocked') stats[key].blocked++; }));
        }
    }
}
console.log('mapas', total, 'malos', bad);
Object.keys(stats).forEach((k) => console.log(k, 'juegos/mapa', (stats[k].games / 1200).toFixed(2), 'élites/mapa', (stats[k].elite / 1200).toFixed(2), 'árboles/mapa', (stats[k].blocked / 1200).toFixed(2)));
