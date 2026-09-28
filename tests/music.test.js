// La banda sonora: cada canción se compone sin errores, todas sus notas
// son frecuencias válidas y cada lista de lugares apunta a canciones que existen.
// Uso: node tests/music.test.js
const path = require('path');
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const listeners = [];
global.document = { addEventListener: (ev, fn) => listeners.push(fn) };

// AudioContext de mentira que anota cada nota tocada
const played = [];
const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime(v) { if (!(v > 0)) throw new Error('rampa a ' + v); } });
const node = () => ({ connect(n) { return n || node(); }, gain: param(), frequency: param(), Q: param(), detune: param(), start() {}, stop() {} });
class FakeCtx {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createConvolver() { return node(); }
    createBufferSource() { return node(); }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    createOscillator() {
        const o = node();
        const f = o.frequency;
        f.setValueAtTime = (v) => { played.push(v); f.value = v; };
        return o;
    }
    resume() {}
}
global.AudioContext = FakeCtx;
const timers = [];
global.setTimeout = (fn) => { timers.push(fn); return timers.length; };

require(path.join(__dirname, '..', 'js', 'audio.js'));
let bad = 0;
const check = (cond, msg) => { if (!cond) { bad++; console.log('FALLA:', msg); } };

const SONGS = window.MUSIC_SONGS, LISTS = window.MUSIC_PLAYLISTS;
Object.entries(LISTS).forEach(([k, ids]) => ids.forEach((id) => check(SONGS[id], `la lista ${k} pide "${id}", que no existe`)));
Object.keys(SONGS).forEach((id) => check(Object.values(LISTS).some((l) => l.includes(id)), `"${id}" no está en ninguna lista`));

// Toca cada lugar un buen rato (avanza el reloj falso) y revisa las notas
const ctxNames = Object.keys(LISTS);
window.setMusicContext('menu');
window.setAmbientMood(0); // compatibilidad
// el primer clic arranca el audio y la música
let ctxRef = null;
const origCreate = FakeCtx.prototype.createGain;
FakeCtx.prototype.createGain = function () { ctxRef = this; return origCreate.call(this); };
listeners.forEach((fn) => fn());
const seen = new Set();
ctxNames.forEach((name) => {
    window.setMusicContext(name);
    for (let t = 0; t < 400; t++) {
        if (ctxRef) ctxRef.currentTime += 0.1;
        const fn = timers.shift();
        if (fn) fn();
        const now = window.nowPlaying();
        if (now) seen.add(now);
    }
});
check(played.length > 1000, `se tocaron muy pocas notas (${played.length})`);
check(played.every((f) => Number.isFinite(f) && f > 20 && f < 8000), 'alguna nota tiene una frecuencia rara: ' + played.filter((f) => !(Number.isFinite(f) && f > 20 && f < 8000)).slice(0, 5));
check(seen.size >= ctxNames.length, `sonaron solo ${seen.size} canciones distintas`);

if (bad) { console.log(`${bad} problemas`); process.exit(1); }
console.log(`canciones ${Object.keys(SONGS).length} · listas ${ctxNames.length} · sonaron ${seen.size} · notas ${played.length} · todo bien`);
