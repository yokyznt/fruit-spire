// Compila el APK de prueba y lo deja en la raíz como FruitSpire-debug.apk.
// Uso: node scripts/build-apk.js   (antes: npm run android:sync)
// Gradle 8.x no corre con el Java 25 de Android Studio: usa un JDK 17 o 21 de ~/.jdks si lo hay.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const android = path.join(root, 'android');
const env = { ...process.env };

const jdks = path.join(os.homedir(), '.jdks');
if (fs.existsSync(jdks)) {
  const jdk = fs.readdirSync(jdks).filter((d) => /^jdk-(17|21)\./.test(d)).sort().pop();
  if (jdk) env.JAVA_HOME = path.join(jdks, jdk);
}
if (!env.ANDROID_HOME && process.env.LOCALAPPDATA) {
  env.ANDROID_HOME = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk');
}

const win = process.platform === 'win32';
const run = spawnSync(win ? '.\\gradlew.bat' : './gradlew', ['assembleDebug', '--console=plain', '-q'], {
  cwd: android, env, stdio: 'inherit', shell: win,
});
if (run.status !== 0) process.exit(run.status || 1);

const apk = path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const out = path.join(root, 'FruitSpire-debug.apk');
fs.copyFileSync(apk, out);
console.log('APK listo: ' + out);
