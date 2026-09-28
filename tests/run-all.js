// Corre todas las pruebas automáticas del juego (no necesitan navegador): node tests/run-all.js
const { spawnSync } = require('child_process');
const path = require('path');
const tests = ['map.test.js', 'minigames.test.js', 'combat.test.js', 'items.test.js', 'seeds.test.js', 'mechanics.test.js'];
let failed = 0;
for (const t of tests) {
    const r = spawnSync(process.execPath, [path.join(__dirname, t)], { encoding: 'utf8' });
    const out = (r.stdout || '').trim().split('\n').slice(-2).join(' | ');
    console.log((r.status === 0 ? 'OK   ' : 'FALLA'), t.padEnd(20), out.replace(/\x1b\[[0-9;]*m/g, ''));
    if (r.status !== 0) { failed++; console.log(r.stdout, r.stderr); }
}
process.exit(failed ? 1 : 0);
