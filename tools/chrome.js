// Ayuda común de los exportadores: abre el juego web en Chrome sin ventana y permite
// ejecutar código dentro de la página (protocolo de depuración de Chrome).
// Necesita Node 22+ (fetch y WebSocket integrados) y Google Chrome instalado.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find((p) => fs.existsSync(p));

async function openGame(port) {
    if (!CHROME) throw new Error('No encuentro Chrome: define CHROME_PATH');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fruit-export-'));
    const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
    const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720', url], { stdio: 'ignore' });
    let page = null;
    for (let i = 0; i < 60 && !page; i++) {
        await new Promise((r) => setTimeout(r, 250));
        try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page' && t.url.startsWith('file:')); } catch (e) { /* aún arrancando */ }
    }
    if (!page) { proc.kill(); throw new Error('Chrome no arrancó'); }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    };
    const send = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    // Ejecuta una expresión (puede ser una promesa) y devuelve su valor
    const evaluate = async (expression) => {
        const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (m.error) throw new Error(JSON.stringify(m.error));
        if (m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails.exception || m.result.exceptionDetails).slice(0, 2000));
        return m.result.result.value;
    };
    for (let i = 0; i < 80; i++) {
        if (await evaluate('!!(window.SPRITES && window.Sfx && document.getElementById("screen"))').catch(() => false)) break;
        await new Promise((r) => setTimeout(r, 200));
    }
    const close = async () => { try { ws.close(); } catch (e) { /* ya cerrado */ } proc.kill(); };
    return { evaluate, send, close };
}

module.exports = { ROOT, openGame };
