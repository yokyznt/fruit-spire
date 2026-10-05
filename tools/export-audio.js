// Exporta el sonido del juego web (js/audio.js, todo sintetizado con Web Audio) como archivos OGG para la app nativa.
// Uso: node tools/export-audio.js [sfx|music]      (sin argumento, hace las dos cosas)
// Necesita Node 22+, Google Chrome y ffmpeg (con libvorbis) en el PATH.
//
// Cómo: se evalúa una COPIA parcheada de js/audio.js dentro de la página, con un OfflineAudioContext en lugar del
// reloj en vivo (js/audio.js no se toca). Cada efecto y cada canción se renderiza con la misma cadena que en la web
// (master 0.55 → filtro de 3400 Hz + reverb 0.16) y con los buses al máximo: el volumen de Ajustes se aplica al reproducir.
// Lo que la web hace al azar (tono, ruido, reverb) sale con semilla fija, así que volver a exportar da lo mismo.
//
// Salida:
//   nativo/app/src/main/assets/audio/sfx/<id>_<n>.ogg     cada efecto, con 1 o 3 variantes (la web los varía al azar)
//   nativo/app/src/main/assets/audio/music/<cancion>.ogg  cada canción, lista para repetirse (la cola del reverb se pliega al principio)
//   nativo/core/src/main/kotlin/.../data/gen/GenAudio.kt  Sfx, canciones, listas de reproducción y vibraciones
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, openGame } = require('./chrome');

const OUT = path.join(ROOT, 'nativo', 'app', 'src', 'main', 'assets', 'audio');
const GEN = path.join(ROOT, 'nativo', 'core', 'src', 'main', 'kotlin', 'com', 'yokyznt', 'fruitspire', 'core', 'data', 'gen', 'GenAudio.kt');
const RATE = 44100;
const SFX_SECONDS = 2.6;      // lo que se renderiza de cada efecto (después se le quita el silencio del final)
const TAIL = 2.2;             // cola de reverb que se pliega al principio de cada canción
const Q_SFX = process.env.AUDIO_Q_SFX || '4';
const Q_MUSIC = process.env.AUDIO_Q_MUSIC || '3';
const only = process.argv[2] || '';

// ---------- la copia parcheada de js/audio.js ----------
function patched() {
    let src = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');
    const swap = (from, to) => {
        if (!src.includes(from)) throw new Error('js/audio.js cambió: no encuentro «' + from + '»');
        src = src.replace(from, to);
    };
    // el contexto de audio lo da el exportador (uno sin conexión por cada render)
    swap('const AC = window.AudioContext || window.webkitAudioContext;', 'const AC = window.__AC;');
    // lo privado que hace falta, y la misma lógica del secuenciador pero con tiempos fijos (renderSong)
    swap('window.Sfx = Sfx;', `window.Sfx = Sfx;
    window.__x = {
        ensureCtx, BUZZ, SONGS, PLAYLISTS,
        renderSong(id) {
            const song = SONGS[id], bars = compose(id), stepDur = 60 / song.bpm / 2;
            ensureCtx();
            dest = musicBus;
            bars.forEach((bar, bi) => {
                const next = bars[(bi + 1) % bars.length];
                for (let i = 0; i < 8; i++) {
                    const swing = song.swing && i % 2 === 1 ? stepDur * song.swing : 0;
                    const delay = (bi * 8 + i) * stepDur + swing;
                    playBass(song, bar.root, next.root, i, stepDur, delay);
                    playDrums(song, i, delay);
                    if (song.pad && i === 0) chordTones(bar.root).forEach((d) => tone(degToFreq(song, d, -1), { dur: stepDur * 7, type: 'sine', vol: 0.025, attack: 0.08, delay }));
                    const d = bar.notes[i];
                    if (typeof d === 'number') {
                        let len = 1;
                        while (i + len < 8 && bar.notes[i + len] === null) len++;
                        (LEADS[song.lead] || LEADS.mallet)(degToFreq(song, d), stepDur * Math.min(len, 3), delay);
                    }
                }
            });
            dest = sfxBus;
        }
    };`);
    return src;
}

// Esto corre DENTRO de la página del juego
const IN_PAGE = `(() => {
    const RATE = ${RATE};
    const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // una copia nueva de js/audio.js con su propio contexto sin conexión y su propio azar
    const make = (off, seedFn) => {
        const fw = { __AC: function () { return off; }, SETTINGS: { music: 100, sfx: 100, vibrate: false }, addEventListener() {} };
        const fdoc = { hidden: true, addEventListener() {} };
        const M = Object.create(Math); M.random = seedFn;
        new Function('window', 'document', 'navigator', 'setTimeout', 'clearTimeout', 'Math', window.__audioSrc)(fw, fdoc, {}, () => 0, () => 0, M);
        return fw;
    };
    window.__info = () => {
        const off = new OfflineAudioContext(2, 10, RATE);
        const x = make(off, rng(1)).__x;
        return { sfx: Object.keys(window.Sfx), songs: Object.keys(x.SONGS).map((id) => ({ id, name: x.SONGS[id].name, bpm: x.SONGS[id].bpm })), playlists: x.PLAYLISTS, buzz: x.BUZZ };
    };
    const toB64 = (i16) => {
        const bytes = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength);
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
    };
    // kind: 'sfx' (name, arg) o 'song' (name, bpm). Deja el PCM en window.__last (base64) y devuelve cuánto mide y qué tan fuerte es.
    window.__render = async (job) => {
        const song = job.kind === 'song';
        const len = song ? Math.round(RATE * 3840 / job.bpm) : 0;
        const frames = Math.ceil(RATE * (song ? 3840 / job.bpm + ${TAIL} : ${SFX_SECONDS}));
        const off = new OfflineAudioContext(2, frames, RATE);
        let cur = rng(1234); // el reverb sale siempre igual
        const fw = make(off, () => cur());
        fw.__x.ensureCtx();
        cur = rng(job.seed);
        if (song) fw.__x.renderSong(job.name); else fw.Sfx[job.name](job.arg);
        const buf = await off.startRendering();
        const L = buf.getChannelData(0), R = buf.getChannelData(1);
        let end = frames, peak = 0;
        let outL, outR;
        if (song) {
            // la cola del reverb vuelve a sonar al principio: la canción puede repetirse sin corte
            outL = L.slice(0, len); outR = R.slice(0, len);
            for (let i = 0; i < frames - len && i < len; i++) { outL[i] += L[len + i]; outR[i] += R[len + i]; }
            end = len;
        } else {
            let last = 0;
            for (let i = 0; i < frames; i++) if (Math.abs(L[i]) > 0.0005 || Math.abs(R[i]) > 0.0005) last = i;
            end = Math.min(frames, Math.max(Math.round(RATE * 0.06), last + Math.round(RATE * 0.03)));
            outL = L.slice(0, end); outR = R.slice(0, end);
            const fade = Math.min(end, Math.round(RATE * 0.03));
            for (let i = 0; i < fade; i++) { const g = i / fade; outL[end - 1 - i] *= g; outR[end - 1 - i] *= g; }
        }
        const pcm = new Int16Array(end * 2);
        for (let i = 0; i < end; i++) {
            peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
            pcm[2 * i] = Math.max(-1, Math.min(1, outL[i])) * 32767;
            pcm[2 * i + 1] = Math.max(-1, Math.min(1, outR[i])) * 32767;
        }
        window.__last = toB64(pcm);
        return { frames: end, peak, b64: window.__last.length };
    };
    window.__slice = (a, b) => window.__last.slice(a, b);
    return true;
})()`;

async function take(game, size) {
    let out = '';
    for (let a = 0; a < size; a += 3000000) out += await game.evaluate(`window.__slice(${a}, ${Math.min(size, a + 3000000)})`);
    return Buffer.from(out, 'base64');
}

function encode(pcm, file, q) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '2', '-i', 'pipe:0', '-c:a', 'libvorbis', '-q:a', q, file], { input: pcm, maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error('ffmpeg falló: ' + (r.stderr || '').toString());
    return fs.statSync(file).size;
}

const kt = (s) => JSON.stringify(s).replace(/\$/g, '\\$');
const constName = (id) => id.replace(/([A-Z])/g, '_$1').toUpperCase();
const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

(async () => {
    const game = await openGame(9456);
    try {
        await game.evaluate('window.__audioSrc = ' + JSON.stringify(patched()));
        await game.evaluate(IN_PAGE);
        const info = await game.evaluate('window.__info()');
        let bytes = 0, clipped = [];
        // el convolver de Chrome puede variar 1 unidad entre dos renders iguales: "igual" es una diferencia media menor que 0.5
        const same = (a, b) => {
            if (a.length !== b.length) return false;
            let sum = 0;
            for (let i = 0; i + 1 < a.length; i += 2) sum += Math.abs(a.readInt16LE(i) - b.readInt16LE(i));
            return sum / (a.length / 2) < 0.5;
        };

        // ---------- efectos ----------
        const variants = {};
        if (only !== 'music') {
            fs.rmSync(path.join(OUT, 'sfx'), { recursive: true, force: true });
            for (const name of info.sfx) {
                const run = async (v) => {
                    const r = await game.evaluate(`window.__render(${JSON.stringify({ kind: 'sfx', name, arg: name === 'introSting' ? v === 1 : undefined, seed: 1000 + v * 77 })})`);
                    if (r.peak > 1) clipped.push(`${name}_${v} (${r.peak.toFixed(2)})`);
                    return take(game, r.b64);
                };
                const pcms = [await run(0)];
                if (name === 'introSting') pcms.push(await run(1)); // normal y fuerte
                else {
                    const b = await run(1);
                    // la web los varía al azar (tono o ruido): se guardan 3 versiones
                    if (!same(pcms[0], b)) { pcms.push(b, await run(2)); }
                }
                variants[name] = pcms.length;
                pcms.forEach((pcm, v) => { bytes += encode(pcm, path.join(OUT, 'sfx', `${name}_${v}.ogg`), Q_SFX); });
                process.stdout.write(`\rsfx ${name.padEnd(14)} x${pcms.length}   `);
            }
            console.log();
        } else {
            // se conserva lo ya exportado: se leen las variantes de los archivos
            for (const name of info.sfx) variants[name] = fs.readdirSync(path.join(OUT, 'sfx')).filter((f) => f.startsWith(name + '_')).length || 1;
        }

        // ---------- canciones ----------
        if (only !== 'sfx') {
            fs.rmSync(path.join(OUT, 'music'), { recursive: true, force: true });
            for (const s of info.songs) {
                const r = await game.evaluate(`window.__render(${JSON.stringify({ kind: 'song', name: s.id, bpm: s.bpm, seed: hash(s.id) })})`);
                if (r.peak > 1) clipped.push(`${s.id} (${r.peak.toFixed(2)})`);
                bytes += encode(await take(game, r.b64), path.join(OUT, 'music', `${s.id}.ogg`), Q_MUSIC);
                process.stdout.write(`\rmusica ${s.id.padEnd(10)} ${(r.frames / RATE).toFixed(1)} s   `);
            }
            console.log();
        }

        // ---------- GenAudio.kt ----------
        const sfxLines = info.sfx.map((id) => `    ${constName(id)}(${kt(id)}, ${variants[id]})`).join(',\n');
        const songs = info.songs.map((s) => `    SongInfo(${kt(s.id)}, ${kt(s.name)}, ${(3840 / s.bpm).toFixed(4)})`).join(',\n');
        const lists = Object.keys(info.playlists).map((k) => `    ${kt(k)} to listOf(${info.playlists[k].map(kt).join(', ')})`).join(',\n');
        const buzz = Object.keys(info.buzz).map((k) => `    ${kt(k)} to listOf(${[].concat(info.buzz[k]).map((n) => n + 'L').join(', ')})`).join(',\n');
        fs.writeFileSync(GEN, `// GENERADO por tools/export-audio.js desde js/audio.js. No editar a mano.
@file:Suppress("ALL")
package com.yokyznt.fruitspire.core.data.gen

/** Los efectos de sonido del juego: [id] es el de Sfx.<id> de la web y [variants] cuántas versiones hay (sfx/<id>_<n>.ogg). */
enum class Sfx(val id: String, val variants: Int) {
${sfxLines};

    companion object {
        private val ids: Map<String, Sfx> by lazy { entries.associateBy { it.id } }
        fun byId(id: String): Sfx? = ids[id]
    }
}

/** Una canción (music/<id>.ogg): su nombre y lo que dura, en segundos (16 compases de 8 corcheas). */
class SongInfo(val id: String, val name: String, val seconds: Double)

val GEN_SONGS: List<SongInfo> = listOf(
${songs}
)

/** Qué canciones suenan en cada lugar (menu, map1-3, combat, elite, boss, shop, rest, dungeon, casino). */
val GEN_PLAYLISTS: Map<String, List<String>> = mapOf(
${lists}
)

/** Vibración con algunos efectos, en milisegundos (vibra, pausa, vibra…), como BUZZ de la web. */
val GEN_BUZZ: Map<String, List<Long>> = mapOf(
${buzz}
)
`);
        console.log(`${info.sfx.length} efectos y ${info.songs.length} canciones: ${(bytes / 1048576).toFixed(1)} MB en ${path.relative(ROOT, OUT)}`);
        if (clipped.length) console.warn('con picos por encima de 1 (se recortan): ' + clipped.join(', '));
    } finally {
        await game.close();
    }
})().catch((e) => { console.error(e); process.exit(1); });
