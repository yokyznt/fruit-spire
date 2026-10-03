// Copia el juego a www/ (lo único que va dentro del APK): sin pruebas ni archivos de desarrollo.
// Uso: node scripts/build-www.js
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
['index.html', 'manifest.webmanifest'].forEach((f) => fs.copyFileSync(path.join(root, f), path.join(out, f)));
['css', 'js', 'icons', 'fonts'].forEach((d) => fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true }));
console.log('www/ listo');
