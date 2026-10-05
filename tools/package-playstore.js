// Arma la carpeta de lanzamiento de Fruit Spire para Google Play (por defecto en el Escritorio):
//   release/   el AAB firmado que se sube a Play, un APK para probar, el mapping de R8 y la huella SHA-256
//   proyecto/  solo lo necesario para volver a compilar (Gradle + código + dibujos/sonido/videos ya exportados)
//   llaves/    la llave de subida (se crea una vez; NO se pierde ni se sube a ningún lado)
//   tienda/    icono, gráfico de portada, capturas 16:9, textos y política de privacidad
// Uso (desde la raíz del repositorio):  node tools/package-playstore.js [carpeta] [--sin-compilar] [--sin-capturas]
// La llave de subida debe existir en <carpeta>/llaves/keystore.properties (+ upload-keystore.jks).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const nativo = path.join(root, 'nativo');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const dest = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), 'Desktop', 'FruitSpire-PlayStore'));

const say = (m) => console.log(`\n== ${m}`);
const die = (m) => { console.error(`\nERROR: ${m}`); process.exit(1); };

// ---------- herramientas ----------
function findJdk() {
    if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'))) return process.env.JAVA_HOME;
    const dir = path.join(os.homedir(), '.jdks');
    const found = fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => /jdk-(17|21)/.test(d)).sort().reverse() : [];
    if (!found.length) die('No encuentro un JDK 17 o 21 (JAVA_HOME o ~/.jdks). Gradle 8 no corre con el Java 25 de Android Studio.');
    return path.join(dir, found[0]);
}
const JAVA_HOME = findJdk();
function gradle(...a) {
    const r = spawnSync(path.join(nativo, 'gradlew.bat'), a, { cwd: nativo, env: { ...process.env, JAVA_HOME }, stdio: 'inherit', shell: true });
    if (r.status !== 0) die(`gradlew ${a.join(' ')} falló`);
}
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gradleFile = fs.readFileSync(path.join(nativo, 'app', 'build.gradle.kts'), 'utf8');
const version = (gradleFile.match(/versionName\s*=\s*"([^"]+)"/) || [])[1] || '0.0.0';
const versionCode = (gradleFile.match(/versionCode\s*=\s*(\d+)/) || [])[1] || '1';

// ---------- llave de subida ----------
const llaves = path.join(dest, 'llaves');
const keyProps = path.join(llaves, 'keystore.properties');
if (!fs.existsSync(keyProps)) die(`Falta la llave de subida: ${keyProps}\nCrea una con keytool (ver LEEME.md) y vuelve a correr esto.`);
const props = Object.fromEntries(fs.readFileSync(keyProps, 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
// el repositorio lee su propia copia (ignorada por git)
fs.writeFileSync(path.join(nativo, 'keystore.properties'), fs.readFileSync(keyProps, 'utf8'));

// ---------- compilar ----------
const aab = path.join(nativo, 'app/build/outputs/bundle/release/app-release.aab');
const apk = path.join(nativo, 'app/build/outputs/apk/release/app-release.apk');
const mapping = path.join(nativo, 'app/build/outputs/mapping/release/mapping.txt');
if (!flags.has('--sin-compilar')) {
    say('Compilando el AAB y el APK de lanzamiento (R8 + recursos reducidos)');
    gradle(':app:bundleRelease', ':app:assembleRelease', '--console=plain');
}
if (!flags.has('--sin-capturas')) {
    say('Sacando las capturas 16:9 de la ficha');
    gradle(':app:testDebugUnitTest', '--tests', '*StoreScreenshotTest*', '-Proborazzi.test.record=true', '--console=plain');
}
for (const f of [aab, apk, mapping]) if (!fs.existsSync(f)) die(`No existe ${f}: compila primero.`);

// ---------- release/ ----------
say('release/');
const rel = path.join(dest, 'release');
fs.mkdirSync(rel, { recursive: true });
const aabOut = path.join(rel, `FruitSpire-${version}.aab`);
fs.copyFileSync(aab, aabOut);
fs.copyFileSync(apk, path.join(rel, `FruitSpire-${version}.apk`));
fs.copyFileSync(mapping, path.join(rel, `mapping-${version}.txt`));
let fingerprint = '';
const kt = spawnSync(path.join(JAVA_HOME, 'bin', 'keytool.exe'), ['-list', '-keystore', props.storeFile, '-storepass', props.storePassword], { encoding: 'utf8' });
const m = /\(SHA-256\):\s*([0-9A-F:]{95})/i.exec(`${kt.stdout}${kt.stderr}`);
if (m) fingerprint = m[1];
fs.writeFileSync(path.join(rel, 'DATOS.txt'), [
    `Fruit Spire ${version} (versionCode ${versionCode})`,
    `id de la app:  com.yokyznt.fruitspire`,
    `AAB (subir a Play): FruitSpire-${version}.aab   SHA-256 ${sha256(aabOut)}`,
    `APK (solo para probar en un teléfono limpio): FruitSpire-${version}.apk`,
    `mapping-${version}.txt: se sube a Play Console (Versión > Archivos de desofuscación) para leer los fallos`,
    `Huella SHA-256 de la llave de subida: ${fingerprint || '(no se pudo leer)'}`,
    `Compilado: ${new Date().toISOString()}`
].join('\n') + '\n');

// ---------- proyecto/ ----------
say('proyecto/ (solo lo necesario para recompilar)');
const proj = path.join(dest, 'proyecto');
if (fs.existsSync(proj)) {
    if (!fs.existsSync(path.join(proj, 'settings.gradle.kts'))) die(`${proj} existe y no parece un proyecto generado: no lo borro.`);
    fs.rmSync(proj, { recursive: true, force: true });
}
fs.mkdirSync(proj, { recursive: true });
const copy = (from, to) => fs.cpSync(path.join(nativo, from), path.join(proj, to || from), { recursive: true });
['settings.gradle.kts', 'build.gradle.kts', 'gradle.properties', 'gradlew', 'gradlew.bat', '.gitignore', 'gradle'].forEach((f) => copy(f));
['app/build.gradle.kts', 'app/proguard-rules.pro', 'app/src/main', 'core/build.gradle.kts', 'core/src/main'].forEach((f) => copy(f));
fs.writeFileSync(path.join(proj, 'keystore.properties'), [
    'storeFile=../llaves/upload-keystore.jks', `storePassword=${props.storePassword}`, `keyAlias=${props.keyAlias}`, `keyPassword=${props.keyPassword}`
].join('\n') + '\n');
const lp = path.join(nativo, 'local.properties');
if (fs.existsSync(lp)) fs.copyFileSync(lp, path.join(proj, 'local.properties'));

// ---------- tienda/ ----------
say('tienda/');
const store = path.join(dest, 'tienda');
const shots = path.join(store, 'capturas');
fs.mkdirSync(shots, { recursive: true });
fs.copyFileSync(path.join(root, 'icons', 'icon-512.png'), path.join(store, 'icono-512.png'));
fs.copyFileSync(path.join(root, 'privacidad.html'), path.join(store, 'politica-de-privacidad.html'));
const captured = path.join(nativo, 'app/build/tienda');
const wanted = [['menu', '01-menu'], ['elegir_fruta', '02-elegir-fruta'], ['mapa', '03-mapa'], ['combate', '04-combate'], ['recompensa', '05-recompensa'], ['tienda', '06-tienda'], ['evento', '07-evento'], ['campamento', '08-campamento']];
for (const [from, to] of wanted) {
    const f = path.join(captured, `${from}.png`);
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(shots, `${to}.png`));
}
// gráfico de portada 1024×500: el título y las frutas del menú, recortados
const menuShot = path.join(captured, 'menu.png');
if (fs.existsSync(menuShot)) {
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', menuShot, '-vf', 'crop=1150:561:385:65,scale=1024:500', path.join(store, 'grafico-portada-1024x500.png')], { encoding: 'utf8' });
    if (r.status !== 0) console.warn('No pude armar el gráfico de portada (¿ffmpeg en el PATH?):', r.stderr);
}
fs.writeFileSync(path.join(store, 'textos.md'), `# Textos para la ficha de Google Play

**Nombre:** Fruit Spire

**Descripción breve (máx. 80):**
Sube la torre, arma tu mazo de frutas y rescata al Rey Fruta.

**Descripción completa:**
¡El Rey Fruta fue secuestrado y solo tú puedes rescatarlo! Elige tu fruta, sube la torre piso por piso y arma un mazo de cartas cada vez más poderoso.

• Cuatro frutas, cuatro formas de jugar: la Manzana pega fuerte, el Platanín se cubre con cáscara, el Kiwi pudre a sus rivales y la Uva cultiva brotes.
• Más de 70 cartas, 50 objetos con truco, semillas y mascotas que te acompañan.
• Tres castillos con pisos distintos, más de 120 enemigos, jefes y eventos misteriosos.
• Mesas de dados, póker, ajedrez, ruleta y tragamonedas con monedas del propio juego.
• Pase de Batalla, vestidor para tu fruta, colección y bestiario.
• Totalmente en español, sin anuncios, sin compras y sin conexión.

**Categoría:** Juegos › Cartas  (etiquetas: roguelike, cartas, estrategia)
**Orientación:** horizontal · **Anuncios:** no · **Compras dentro de la app:** no

**Clasificación de contenido (cuestionario IARC):**
- Violencia: caricaturesca de fantasía (frutas que se pelean, sin sangre).
- Apuestas simuladas: SÍ, hay minijuegos de dados, póker, ruleta y tragamonedas con monedas del juego (sin dinero real). Respóndelo así; sube un poco la edad recomendada.
- Sin lenguaje fuerte, sin contenido sexual, sin drogas, sin chat ni compras.

**Seguridad de los datos:** no se recopilan ni comparten datos. Todo se guarda en el teléfono. Permiso usado: vibración.

**Política de privacidad:** publica politica-de-privacidad.html (por ejemplo en https://fruit-spire.vercel.app/privacidad.html cuando se fusione la rama) y pon esa dirección en Play Console.
`);

// ---------- LEEME y construir.bat ----------
say('LEEME.md y construir.bat');
fs.writeFileSync(path.join(dest, 'construir.bat'), `@echo off
rem Vuelve a compilar el AAB y el APK firmados (necesita un JDK 17 o 21 y el SDK de Android, ver proyecto\\local.properties).
rem Si JAVA_HOME no esta puesto, busca uno en %USERPROFILE%\\.jdks
if "%JAVA_HOME%"=="" for /d %%D in ("%USERPROFILE%\\.jdks\\jdk-21*" "%USERPROFILE%\\.jdks\\jdk-17*") do set "JAVA_HOME=%%~D"
cd /d "%~dp0proyecto"
call gradlew.bat :app:bundleRelease :app:assembleRelease --console=plain
echo.
echo AAB: proyecto\\app\\build\\outputs\\bundle\\release\\app-release.aab
echo APK: proyecto\\app\\build\\outputs\\apk\\release\\app-release.apk
pause
`);
fs.writeFileSync(path.join(dest, 'LEEME.md'), `# Fruit Spire ${version} para Google Play

Generado el ${new Date().toLocaleString('es-MX')} con \`node tools/package-playstore.js\` (repositorio fruit-spire, carpeta nativo/).

## Qué hay aquí
| Carpeta | Para qué |
|---|---|
| \`release/\` | **FruitSpire-${version}.aab** (lo que se sube a Play), un .apk para probar, \`mapping-${version}.txt\` y \`DATOS.txt\` |
| \`tienda/\` | icono 512, gráfico de portada 1024×500, capturas 16:9, \`textos.md\` y la política de privacidad |
| \`proyecto/\` | solo el código y los recursos necesarios para recompilar (sin pruebas ni herramientas de desarrollo) |
| \`llaves/\` | la llave de subida **(¡respáldala!)** |
| \`construir.bat\` | recompila el AAB/APK desde \`proyecto/\` |

## ⚠️ La llave de subida
\`llaves/upload-keystore.jks\` y su contraseña (en \`llaves/keystore.properties\`) son la **llave de subida**. Sin ella no puedes subir actualizaciones
firmadas igual. Guarda una copia fuera de esta PC (USB, nube privada). **No la subas a GitHub.** Si la pierdes, Play permite restablecerla
(Play Console › Configuración › Integridad de la app) porque Google guarda la llave real de firma (Play App Signing).
Huella SHA-256 de la llave de subida: \`${fingerprint || '(ver release/DATOS.txt)'}\`

## Publicar (primera vez)
1. Play Console › **Crear app** › Nombre «Fruit Spire», idioma Español, Juego, Gratis.
2. **Versión › Producción** (o Pruebas internas primero) › subir \`release/FruitSpire-${version}.aab\`. Acepta **Play App Signing**.
3. En la versión, **Archivos de desofuscación**: sube \`release/mapping-${version}.txt\`.
4. **Ficha principal de la tienda**: copia los textos de \`tienda/textos.md\`; icono 512, gráfico de portada y las capturas de \`tienda/\`.
5. **Contenido de la app**: política de privacidad (URL), anuncios (no), acceso (todo libre), clasificación de contenido (ver notas en \`textos.md\`:
   hay *apuestas simuladas*), público objetivo, **Seguridad de los datos** (no se recopila nada), tipo de app (Juego).
6. Enviar a revisión. Las cuentas personales nuevas necesitan antes una **prueba cerrada con 12 testers durante 14 días** para poder publicar en Producción.

## Actualizar el juego
Sube \`versionCode\` (hoy ${versionCode}) en \`proyecto/app/build.gradle.kts\`, corre \`construir.bat\` y sube el nuevo AAB.

## Si tienes la app web instalada
La app web usa el mismo id (\`com.yokyznt.fruitspire\`) pero otra firma: para instalar el .apk de aquí en ese teléfono hay que desinstalar la web antes
(las partidas de la web no se migran). Desde Play no hay problema.
`);
console.log(`\nListo: ${dest}\n  AAB ${aabOut}\n  versión ${version} (código ${versionCode})`);
