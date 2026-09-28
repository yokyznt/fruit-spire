// ============================================================
// AUDIO.JS — Sonido sintetizado con Web Audio (sin archivos):
// efectos de combate (golpes, cáscara, estados, monedas, turnos,
// victoria/derrota) y una musiquita de fondo de caricatura (bajo
// que rebota + melodía de xilófono) que cambia de tempo/patrón
// según si estás en el mapa, en combate o frente a algo fuerte.
//
// Todo pasa por un filtro suave + un reverb corto (generado con
// ruido, sin archivos) para que no suene a "bocina de juguete", y
// las ondas cuadradas/sierra de los efectos se filtran para
// quitarles lo áspero.
// ============================================================
(function () {
    let ctx = null, master = null, dry = null, wet = null, unlocked = false;
    const MUTE_KEY = 'fruitSpireMuted';
    let muted = localStorage.getItem(MUTE_KEY) === '1';

    // Respuesta de un cuartito pequeño: ruido que decae rápido. Nada de
    // archivos, se genera una sola vez al arrancar el audio.
    function makeReverb(c, duration, decay) {
        const rate = c.sampleRate;
        const len = Math.floor(rate * duration);
        const buf = c.createBuffer(2, len, rate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }
    function ensureCtx() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        if (!ctx) {
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = muted ? 0 : 0.55;
            // dry: pasa por un filtro suave para limar lo chillón
            dry = ctx.createBiquadFilter();
            dry.type = 'lowpass'; dry.frequency.value = 3400; dry.Q.value = 0.3;
            master.connect(dry).connect(ctx.destination);
            // wet: reverb cortito para dar espacio, mezclado bajito
            const convolver = ctx.createConvolver();
            convolver.buffer = makeReverb(ctx, 1.8, 2.4);
            wet = ctx.createGain();
            wet.gain.value = 0.16;
            master.connect(wet).connect(convolver).connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    const rnd = (a, b) => a + Math.random() * (b - a);

    // Un tono con envolvente suave. Las ondas cuadradas/sierra (más ásperas)
    // pasan por su propio filtro para que no piquen tanto en los oídos.
    function tone(freq, { dur = 0.18, type = 'sine', vol = 0.22, attack = 0.008, release, slideTo = null, delay = 0, detune = 0 } = {}) {
        const c = ensureCtx();
        if (!c) return;
        const t0 = c.currentTime + delay;
        const rel = release != null ? release : dur;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (detune) osc.detune.setValueAtTime(detune, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + rel);
        let out = osc;
        if (type === 'square' || type === 'sawtooth') {
            const f = c.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = Math.max(700, freq * 3); f.Q.value = 0.6;
            osc.connect(f); out = f;
        }
        out.connect(gain).connect(master);
        osc.start(t0);
        osc.stop(t0 + rel + 0.05);
    }
    // Como tone(), pero dos voces desafinaditas (coro): más cálido y lleno,
    // ideal para acordes/campanas en vez de un pitido seco de un solo tono.
    function warmTone(freq, opts) {
        tone(freq, Object.assign({}, opts, { detune: -5, vol: (opts.vol || 0.2) * 0.6 }));
        tone(freq, Object.assign({}, opts, { detune: 5, vol: (opts.vol || 0.2) * 0.6 }));
    }
    // Ráfaga de ruido filtrado: golpes, cáscara, barajado
    function noise({ dur = 0.15, vol = 0.2, delay = 0, freq = 1200, type = 'lowpass' } = {}) {
        const c = ensureCtx();
        if (!c) return;
        const t0 = c.currentTime + delay;
        const n = Math.max(1, Math.floor(c.sampleRate * dur));
        const buffer = c.createBuffer(1, n, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
        const src = c.createBufferSource();
        src.buffer = buffer;
        const filter = c.createBiquadFilter();
        filter.type = type; filter.frequency.value = freq;
        const gain = c.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(filter).connect(gain).connect(master);
        src.start(t0);
    }

    // ---------- efectos de combate ----------
    const Sfx = {
        click: () => tone(rnd(520, 560), { dur: 0.07, type: 'triangle', vol: 0.12 }),
        cardAttack: () => tone(rnd(170, 210), { dur: 0.11, type: 'triangle', vol: 0.16 }),
        cardSkill: () => warmTone(rnd(520, 620), { dur: 0.18, type: 'sine', vol: 0.2, slideTo: 780 }),
        cardPower: () => { warmTone(260, { dur: 0.32, type: 'sine', vol: 0.2 }); warmTone(390, { dur: 0.32, type: 'sine', vol: 0.14, delay: 0.05 }); },
        hit: () => { noise({ dur: 0.12, vol: 0.24, freq: 800 }); tone(rnd(90, 120), { dur: 0.12, type: 'triangle', vol: 0.18, slideTo: 50 }); },
        poisonTick: () => tone(rnd(180, 220), { dur: 0.22, type: 'sawtooth', vol: 0.09, slideTo: 90 }),
        block: () => { tone(320, { dur: 0.12, type: 'triangle', vol: 0.18 }); noise({ dur: 0.07, vol: 0.1, freq: 2200 }); },
        heal: () => { warmTone(520, { dur: 0.14, type: 'sine', vol: 0.18 }); warmTone(700, { dur: 0.18, type: 'sine', vol: 0.16, delay: 0.08 }); },
        buff: () => { warmTone(500, { dur: 0.12, type: 'sine', vol: 0.16 }); warmTone(660, { dur: 0.16, type: 'sine', vol: 0.14, delay: 0.07 }); },
        debuff: () => tone(260, { dur: 0.18, type: 'sawtooth', vol: 0.1, slideTo: 160 }),
        coin: () => { tone(880, { dur: 0.08, type: 'triangle', vol: 0.14 }); tone(1180, { dur: 0.12, type: 'triangle', vol: 0.12, delay: 0.06 }); },
        shuffle: () => { for (let i = 0; i < 4; i++) noise({ dur: 0.08, vol: 0.1, freq: 1800, delay: i * 0.07 }); },
        turnPlayer: () => { warmTone(660, { dur: 0.14, type: 'sine', vol: 0.18 }); warmTone(880, { dur: 0.18, type: 'sine', vol: 0.16, delay: 0.1 }); },
        turnEnemy: () => tone(140, { dur: 0.3, type: 'sine', vol: 0.12, slideTo: 100 }),
        enemyDeath: () => { tone(260, { dur: 0.22, type: 'triangle', vol: 0.16, slideTo: 60 }); noise({ dur: 0.18, vol: 0.13, freq: 700, delay: 0.05 }); },
        win: () => { [523, 659, 784, 1046].forEach((f, i) => warmTone(f, { dur: 0.24, type: 'sine', vol: 0.2, delay: i * 0.1 })); },
        lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, { dur: 0.32, type: 'sine', vol: 0.15, delay: i * 0.13 })); },

        // ---------- interfaz y exploración del mapa ----------
        tap: () => tone(rnd(480, 520), { dur: 0.05, type: 'triangle', vol: 0.08 }),
        select: () => tone(rnd(560, 600), { dur: 0.07, type: 'triangle', vol: 0.12 }),
        denied: () => { tone(150, { dur: 0.12, type: 'triangle', vol: 0.13, slideTo: 100 }); noise({ dur: 0.06, vol: 0.07, freq: 400 }); },
        mapMove: () => tone(rnd(300, 340), { dur: 0.06, type: 'triangle', vol: 0.07 }),
        pop: () => { tone(700, { dur: 0.08, type: 'sine', vol: 0.14 }); tone(1000, { dur: 0.1, type: 'sine', vol: 0.1, delay: 0.05 }); },
        sparkle: () => [1200, 1500, 1800].forEach((f, i) => tone(f, { dur: 0.14, type: 'sine', vol: 0.07, delay: i * 0.045 })),

        // ---------- casillas del mapa ----------
        chestOpen: function () { tone(440, { dur: 0.16, type: 'triangle', vol: 0.14 }); this.sparkle(); },
        giftOpen: function () { tone(600, { dur: 0.1, type: 'triangle', vol: 0.14 }); tone(900, { dur: 0.14, type: 'triangle', vol: 0.12, delay: 0.06 }); this.sparkle(); },
        relicGet: () => { warmTone(784, { dur: 0.2, type: 'sine', vol: 0.18 }); warmTone(1046, { dur: 0.3, type: 'sine', vol: 0.16, delay: 0.1 }); },
        eventOpen: () => { tone(500, { dur: 0.12, type: 'sine', vol: 0.13 }); tone(700, { dur: 0.14, type: 'sine', vol: 0.1, delay: 0.06 }); },
        introSting: (strong) => {
            const base = strong ? 220 : 330;
            [base, base * 1.25, base * 1.5].forEach((f, i) => tone(f, { dur: 0.18, type: 'triangle', vol: strong ? 0.16 : 0.13, delay: i * 0.07 }));
        },
        actFanfare: () => [523, 659, 784, 1046, 1318].forEach((f, i) => warmTone(f, { dur: 0.22, type: 'sine', vol: 0.17, delay: i * 0.09 })),

        // ---------- campamento y tienda ----------
        restHeal: () => { warmTone(440, { dur: 0.3, type: 'sine', vol: 0.16 }); warmTone(660, { dur: 0.4, type: 'sine', vol: 0.14, delay: 0.15 }); },
        upgrade: () => [659, 880, 1046].forEach((f, i) => warmTone(f, { dur: 0.16, type: 'sine', vol: 0.14, delay: i * 0.06 })),
        removeCard: () => { noise({ dur: 0.14, vol: 0.14, freq: 500 }); tone(180, { dur: 0.14, type: 'triangle', vol: 0.1, slideTo: 90 }); },
        seedUse: () => { tone(900, { dur: 0.1, type: 'sine', vol: 0.14, slideTo: 1400 }); noise({ dur: 0.08, vol: 0.07, freq: 3000 }); },
        equip: () => [660, 880, 1046].forEach((f, i) => tone(f, { dur: 0.14, type: 'triangle', vol: 0.12, delay: i * 0.06 }))
    };

    // ---------- banda sonora ----------
    // Muchas canciones cortas en vez de un solo loop. Cada canción tiene su
    // escala, tempo, acordes, estilo de bajo, batería e instrumento, y una
    // forma de 16 compases (p. ej. AABA). La melodía la compone un
    // generador con semilla fija: cada canción suena SIEMPRE igual (se
    // reconoce), pero hay muchas distintas. Cada lugar del juego tiene su
    // lista y, al terminar una canción, sigue otra de la misma lista.
    const SCALES = {
        major: [0, 2, 4, 5, 7, 9, 11],
        mixo: [0, 2, 4, 5, 7, 9, 10],
        dorian: [0, 2, 3, 5, 7, 9, 10],
        minor: [0, 2, 3, 5, 7, 8, 10],
        harm: [0, 2, 3, 5, 7, 8, 11]
    };
    // key: nota base de la melodía (Hz). bass/drums/lead: estilos (ver abajo).
    // A/B/C: acordes de cada sección (grado de la escala por compás).
    // rA/rB/rC: ritmo de la melodía por compás (x = nota, . = sigue, - = silencio).
    const SONGS = {
        menu_a: { name: 'Tema del Huerto', scale: 'major', key: 261.63, bpm: 100, bass: 'oompah', drums: 'light', lead: 'mallet', form: 'AABA', A: [0, 5, 3, 4], B: [3, 4, 2, 5], rA: 'x.xxx.x-', rB: 'x..xx.x.', seed: 11 },
        menu_b: { name: 'Canción de Cuna', scale: 'major', key: 293.66, bpm: 84, bass: 'arp', drums: 'none', lead: 'bell', form: 'ABAB', A: [0, 3, 0, 4], B: [5, 3, 1, 4], rA: 'x...x.x.', rB: 'x.x.x...', seed: 23 },
        map1_a: { name: 'Paseo por el Huerto', scale: 'major', key: 261.63, bpm: 112, bass: 'oompah', drums: 'light', lead: 'pluck', form: 'AABA', A: [0, 3, 4, 0], B: [5, 3, 1, 4], rA: 'x.x.xxx.', rB: 'xx.x.x..', seed: 31 },
        map1_b: { name: 'Brisa entre Hojas', scale: 'mixo', key: 293.66, bpm: 104, bass: 'walk', drums: 'light', lead: 'flute', form: 'ABAC', A: [0, 6, 3, 0], B: [3, 3, 0, 4], C: [5, 6, 0, 0], rA: 'x..x..x.', rB: 'x.x.x.x.', rC: 'x...x...', seed: 42 },
        map1_c: { name: 'El Gallinero', scale: 'major', key: 349.23, bpm: 124, bass: 'pulse', drums: 'pop', lead: 'mallet', form: 'AABB', A: [0, 4, 5, 3], B: [3, 0, 3, 4], rA: 'xxx.x.x.', rB: 'x.xx.xx.', seed: 57 },
        map2_a: { name: 'Swing del Casino', scale: 'dorian', key: 293.66, bpm: 120, bass: 'walk', drums: 'swing', lead: 'chip', swing: 0.3, form: 'AABA', A: [0, 3, 0, 4], B: [2, 5, 1, 4], rA: 'x.xx.x-x', rB: 'xx.x..x.', seed: 64 },
        map2_b: { name: 'Blancas y Negras', scale: 'minor', key: 261.63, bpm: 108, bass: 'arp', drums: 'light', lead: 'mallet', form: 'ABAB', A: [0, 5, 2, 6], B: [3, 0, 4, 4], rA: 'x.x.x.xx', rB: 'x..x.xx.', seed: 71 },
        map2_c: { name: 'La Casa Siempre Gana', scale: 'mixo', key: 329.63, bpm: 128, bass: 'oompah', drums: 'swing', lead: 'pluck', swing: 0.25, form: 'AABA', A: [0, 6, 0, 4], B: [3, 3, 6, 4], rA: 'xx.xx.x.', rB: 'x.x..xx.', seed: 86 },
        map3_a: { name: 'La Torre del Rey', scale: 'harm', key: 246.94, bpm: 96, bass: 'pulse', drums: 'march', lead: 'flute', form: 'AABA', A: [0, 5, 3, 4], B: [5, 3, 0, 4], rA: 'x..xx.x.', rB: 'x...x.x.', seed: 93 },
        map3_b: { name: 'Escalera de Caracol', scale: 'minor', key: 220, bpm: 110, bass: 'arp', drums: 'light', lead: 'bell', form: 'ABAC', A: [0, 6, 5, 4], B: [2, 5, 3, 4], C: [0, 3, 4, 0], rA: 'x.x.x.x.', rB: 'xx.x.x..', rC: 'x.......', seed: 101 },
        fight_a: { name: 'Pelea de Frutas', scale: 'major', key: 329.63, bpm: 138, bass: 'pulse', drums: 'pop', lead: 'chip', form: 'AABA', A: [0, 4, 5, 3], B: [3, 4, 0, 4], rA: 'x.xxx.xx', rB: 'xx.xx.x.', seed: 113 },
        fight_b: { name: 'Semillas Volando', scale: 'mixo', key: 293.66, bpm: 132, bass: 'oompah', drums: 'pop', lead: 'mallet', form: 'ABAB', A: [0, 6, 3, 0], B: [3, 4, 6, 4], rA: 'xx.xx.x.', rB: 'x.xx.xxx', seed: 127 },
        fight_c: { name: 'Jugo de Batalla', scale: 'dorian', key: 261.63, bpm: 144, bass: 'walk', drums: 'pop', lead: 'pluck', form: 'AABA', A: [0, 3, 0, 4], B: [5, 3, 6, 4], rA: 'x.x.xxx.', rB: 'xxx.x.x.', seed: 139 },
        elite: { name: 'Rival Maduro', scale: 'minor', key: 293.66, bpm: 150, bass: 'pulse8', drums: 'heavy', lead: 'chip', form: 'AABA', A: [0, 5, 6, 4], B: [3, 6, 2, 4], rA: 'xx.xxx.x', rB: 'x.xx.xx.', seed: 151 },
        elite_b: { name: 'Espinas y Cáscaras', scale: 'harm', key: 261.63, bpm: 146, bass: 'pulse8', drums: 'heavy', lead: 'pluck', form: 'ABAB', A: [0, 3, 4, 0], B: [5, 3, 4, 4], rA: 'x.xxx.xx', rB: 'xx.x.xx.', seed: 163 },
        boss_a: { name: 'Jefe del Castillo', scale: 'harm', key: 246.94, bpm: 158, bass: 'pulse8', drums: 'heavy', lead: 'chip', pad: true, form: 'AABC', A: [0, 5, 3, 4], B: [0, 5, 1, 4], C: [3, 4, 5, 4], rA: 'xxx.xxx.', rB: 'x.xxx.xx', rC: 'x...x...', seed: 179 },
        boss_b: { name: 'Gran Final', scale: 'minor', key: 220, bpm: 164, bass: 'pulse8', drums: 'heavy', lead: 'bell', pad: true, form: 'ABAB', A: [0, 6, 5, 4], B: [3, 4, 0, 4], rA: 'x.xxx.xx', rB: 'xx.xxx.x', seed: 191 },
        shop: { name: 'La Tiendita', scale: 'major', key: 349.23, bpm: 96, bass: 'walk', drums: 'swing', lead: 'mallet', swing: 0.3, form: 'AABA', A: [0, 5, 1, 4], B: [3, 3, 0, 4], rA: 'x.x..xx.', rB: 'x..x.x..', seed: 211 },
        rest: { name: 'Fogata', scale: 'major', key: 261.63, bpm: 76, bass: 'arp', drums: 'none', lead: 'bell', form: 'ABAB', A: [0, 3, 0, 4], B: [5, 3, 0, 4], rA: 'x...x.x.', rB: 'x.x.x...', seed: 223 },
        dungeon: { name: 'Calabozo', scale: 'harm', key: 220, bpm: 88, bass: 'long', drums: 'none', lead: 'flute', form: 'ABAB', A: [0, 0, 5, 4], B: [3, 5, 4, 4], rA: 'x...x.-.', rB: 'x.-.x...', seed: 239 },
        casino: { name: 'Apuesta', scale: 'dorian', key: 293.66, bpm: 124, bass: 'walk', drums: 'swing', lead: 'chip', swing: 0.3, form: 'AABA', A: [0, 3, 4, 0], B: [5, 3, 4, 4], rA: 'xx.x.x.x', rB: 'x.x.xx..', seed: 251 }
    };
    const PLAYLISTS = {
        menu: ['menu_a', 'menu_b'],
        map1: ['map1_a', 'map1_b', 'map1_c'],
        map2: ['map2_a', 'map2_b', 'map2_c'],
        map3: ['map3_a', 'map3_b'],
        combat: ['fight_a', 'fight_b', 'fight_c'],
        elite: ['elite', 'elite_b'],
        boss: ['boss_a', 'boss_b'],
        shop: ['shop'],
        rest: ['rest', 'menu_b'],
        dungeon: ['dungeon'],
        casino: ['casino', 'map2_a']
    };

    // ---------- el compositor: melodía con semilla ----------
    function seeded(seed) {
        let s = seed >>> 0;
        return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const chordTones = (root) => [root, root + 2, root + 4];
    // la nota del acorde más cercana a "near" (en grados, con octavas)
    function nearestChordTone(root, near) {
        let best = null;
        for (let o = -2; o <= 2; o++) {
            chordTones(root).forEach((d) => {
                const v = d + o * 7;
                if (v < -2 || v > 12) return;
                if (best == null || Math.abs(v - near) < Math.abs(best - near)) best = v;
            });
        }
        return best;
    }
    // Una sección = 4 compases; el 1.º y el 3.º comparten motivo (mismo ritmo
    // y forma, movido al acorde), el 4.º cierra en la tónica del acorde.
    function composeSection(chords, rhythm, rand, startNote) {
        const bars = [];
        let prev = startNote;
        let motif = null;
        chords.forEach((root, b) => {
            const notes = [];
            const last = b === chords.length - 1;
            if (b === 2 && motif) {
                const shift = nearestChordTone(root, prev) - motif[0];
                motif.forEach((d) => notes.push(typeof d === 'number' ? d + shift : d));
            } else {
                let dir = rand() < 0.5 ? -1 : 1;
                for (let i = 0; i < 8; i++) {
                    const ch = rhythm[i];
                    if (ch !== 'x') { notes.push(ch === '-' ? 'rest' : null); continue; }
                    let d;
                    if (i === 0 || i === 4) d = nearestChordTone(root, prev + dir * (rand() < 0.6 ? 1 : 3));
                    else if (rand() < 0.65) d = prev + dir;
                    else d = nearestChordTone(root, prev + dir * 2);
                    if (d > 11 || d < 0) { dir = -dir; d = prev + dir; }
                    if (rand() < 0.2) dir = -dir;
                    notes.push(d);
                    prev = d;
                }
                if (b === 0) motif = notes.slice();
            }
            if (last) {
                // cadencia: nota larga en la raíz del acorde
                const end = nearestChordTone(root, prev);
                for (let i = 4; i < 8; i++) notes[i] = i === 4 ? end : (i < 7 ? null : 'rest');
                prev = end;
            }
            notes.forEach((d) => { if (typeof d === 'number') prev = d; });
            bars.push({ root, notes });
        });
        return bars;
    }
    const composed = {};
    function compose(id) {
        if (composed[id]) return composed[id];
        const song = SONGS[id];
        const rand = seeded(song.seed);
        const secs = {};
        let start = 4;
        ['A', 'B', 'C'].forEach((k) => {
            if (!song[k]) return;
            secs[k] = composeSection(song[k], song['r' + k] || song.rA, rand, start);
            start = 2 + Math.floor(rand() * 5);
        });
        const bars = [];
        [...song.form].forEach((k) => bars.push(...(secs[k] || secs.A)));
        return (composed[id] = bars);
    }

    // ---------- instrumentos ----------
    function degToFreq(song, deg, octaveShift) {
        const sc = SCALES[song.scale];
        const oct = Math.floor(deg / 7);
        const idx = ((deg % 7) + 7) % 7;
        return song.key * Math.pow(2, (sc[idx] + (oct + (octaveShift || 0)) * 12) / 12);
    }
    const LEADS = {
        mallet: (f, dur, delay) => mallet(f, dur * 1.1, 0.075, delay),
        pluck: (f, dur, delay) => { tone(f, { dur: dur * 0.9, type: 'triangle', vol: 0.085, attack: 0.004, delay }); tone(f * 2, { dur: dur * 0.3, type: 'sine', vol: 0.02, delay }); },
        flute: (f, dur, delay) => { tone(f, { dur: dur * 1.25, type: 'sine', vol: 0.06, attack: 0.045, delay, detune: -4 }); tone(f, { dur: dur * 1.25, type: 'sine', vol: 0.035, attack: 0.05, delay, detune: 6 }); },
        chip: (f, dur, delay) => tone(f, { dur: dur * 0.85, type: 'square', vol: 0.042, attack: 0.004, delay }),
        bell: (f, dur, delay) => { tone(f, { dur: dur * 1.6, type: 'sine', vol: 0.06, attack: 0.003, delay }); tone(f * 3, { dur: dur * 0.5, type: 'sine', vol: 0.012, delay }); }
    };
    function mallet(freq, dur, vol, delay) {
        tone(freq, { dur, type: 'sine', vol, attack: 0.003, delay });
        tone(freq * 2, { dur: dur * 0.55, type: 'sine', vol: vol * 0.32, attack: 0.002, delay });
    }
    function bassNote(song, deg, dur, delay, vol) {
        tone(degToFreq(song, deg, -1), { dur: dur * 0.85, type: 'triangle', vol: vol || 0.11, attack: 0.004, delay });
    }
    // estilo de bajo: qué toca en cada corchea del compás
    function playBass(song, root, nextRoot, i, step, delay) {
        switch (song.bass) {
            case 'oompah': if (i % 2 === 0) bassNote(song, i % 4 === 0 ? root : root + 4, step, delay); break;
            case 'walk': if (i % 2 === 0) bassNote(song, [root, root + 2, root + 4, nextRoot + (nextRoot > root ? -1 : 1)][i / 2], step * 1.8, delay); break;
            case 'pulse': if (i % 2 === 0) bassNote(song, root, step * 1.2, delay); break;
            case 'pulse8': bassNote(song, i % 4 === 3 ? root + 7 : root, step, delay, 0.1); break;
            case 'arp': bassNote(song, [root, root + 2, root + 4, root + 7, root + 4, root + 2, root, root + 4][i], step * 1.1, delay, 0.09); break;
            case 'long': if (i === 0) bassNote(song, root, step * 8, delay, 0.12); break;
            default: break;
        }
    }
    const kick = (delay, v) => tone(110, { dur: 0.14, type: 'sine', vol: v || 0.2, slideTo: 42, delay });
    const snare = (delay, v) => noise({ dur: 0.1, vol: v || 0.07, freq: 1800, type: 'highpass', delay });
    const hat = (delay, v) => noise({ dur: 0.03, vol: v || 0.035, freq: 7000, type: 'highpass', delay });
    function playDrums(song, i, delay) {
        switch (song.drums) {
            case 'light': if (i === 0) kick(delay, 0.14); if (i === 4) snare(delay, 0.04); if (i % 2 === 1) hat(delay, 0.02); break;
            case 'pop': if (i === 0 || i === 3 || i === 5) kick(delay); if (i === 2 || i === 6) snare(delay); hat(delay, 0.025); break;
            case 'swing': if (i === 0 || i === 4) kick(delay, 0.12); if (i === 2 || i === 6) snare(delay, 0.035); if (i % 2 === 1 || i === 2 || i === 6) hat(delay, 0.03); break;
            case 'march': if (i % 2 === 0) kick(delay, 0.12); if (i === 6 || i === 7) snare(delay, 0.05); break;
            case 'heavy': if (i === 0 || i === 1 || i === 4) kick(delay, 0.22); if (i === 2 || i === 6) snare(delay, 0.09); hat(delay, 0.03); break;
            default: break;
        }
    }

    // ---------- el secuenciador ----------
    let seq = null;
    let musicCtx = 'menu';
    function pickSong(ctxName) {
        const list = PLAYLISTS[ctxName] || PLAYLISTS.menu;
        // cada lugar sigue su propia lista en orden (empieza en una al azar)
        const cur = seq.cursor[ctxName];
        const n = cur == null ? Math.floor(Math.random() * list.length) : (cur + 1) % list.length;
        seq.cursor[ctxName] = n;
        return list[n];
    }
    function startAmbient() {
        const c = ensureCtx();
        if (!c || seq) return;
        seq = { cursor: {}, song: null, bar: 0, step: 0, nextTime: c.currentTime + 0.15, timer: null, want: musicCtx };
        schedulerTick();
    }
    function schedulerTick() {
        if (!seq) return;
        const c = ensureCtx();
        if (!c) return;
        while (seq.nextTime < c.currentTime + 0.14) {
            // cambios de canción: al empezar un compás (si cambió el lugar) o al terminar la canción
            if (seq.step === 0) {
                const bars = seq.song ? compose(seq.song) : [];
                if (!seq.song || seq.want !== seq.playingCtx || seq.bar >= bars.length) {
                    seq.song = pickSong(seq.want);
                    seq.playingCtx = seq.want;
                    seq.bar = 0;
                }
            }
            const song = SONGS[seq.song];
            const bars = compose(seq.song);
            const stepDur = 60 / song.bpm / 2;
            const i = seq.step;
            const swing = song.swing && i % 2 === 1 ? stepDur * song.swing : 0;
            const delay = Math.max(0, seq.nextTime - c.currentTime + swing);
            const bar = bars[seq.bar % bars.length];
            const next = bars[(seq.bar + 1) % bars.length];
            playBass(song, bar.root, next.root, i, stepDur, delay);
            playDrums(song, i, delay);
            if (song.pad && i === 0) chordTones(bar.root).forEach((d) => tone(degToFreq(song, d, -1), { dur: stepDur * 7, type: 'sine', vol: 0.025, attack: 0.08, delay }));
            const d = bar.notes[i];
            if (typeof d === 'number') {
                let len = 1;
                while (i + len < 8 && bar.notes[i + len] === null) len++;
                (LEADS[song.lead] || LEADS.mallet)(degToFreq(song, d), stepDur * Math.min(len, 3), delay);
            }
            seq.nextTime += stepDur;
            seq.step++;
            if (seq.step >= 8) { seq.step = 0; seq.bar++; }
        }
        seq.timer = setTimeout(schedulerTick, 60);
    }
    // Qué suena según el lugar: menu · map1-3 · combat · elite · boss · shop · rest · dungeon · casino
    function setMusicContext(name) {
        musicCtx = PLAYLISTS[name] ? name : 'menu';
        if (seq) seq.want = musicCtx;
    }
    // compatibilidad: 0 calmo · 1 combate · 2 enemigo fuerte
    function setAmbientMood(level) { setMusicContext(level === 2 ? 'elite' : level === 1 ? 'combat' : 'menu'); }
    window.setMusicContext = setMusicContext;
    window.MUSIC_SONGS = SONGS;
    window.MUSIC_PLAYLISTS = PLAYLISTS;
    window.nowPlaying = () => (seq && seq.song ? SONGS[seq.song].name : null);

    function applyMute() { if (master) master.gain.value = muted ? 0 : 0.55; }
    function toggleMute() {
        muted = !muted;
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
        applyMute();
        return muted;
    }
    function unlock() {
        if (unlocked) return;
        unlocked = true;
        ensureCtx();
        startAmbient();
    }
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { once: true, passive: true }));

    window.Sfx = Sfx;
    window.setAmbientMood = setAmbientMood;
    window.toggleMute = toggleMute;
    window.isMuted = () => muted;
})();
