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

    // ---------- musiquita de fondo, de caricatura ----------
    // Nada de pad sostenido: un bajito que rebota (oom-pah) + una melodía
    // de xilófono encima, en pentatónica mayor (nunca puede sonar mal).
    // Un secuenciador con "lookahead" toca los pasos con precisión, y el
    // patrón/tempo cambia según el nivel sin cortar la música.
    const PENT = [0, 2, 4, 7, 9]; // do-re-mi-sol-la: mayor pentatónica
    function degFreq(base, deg) {
        if (deg == null) return null;
        const oct = Math.floor(deg / PENT.length);
        const idx = ((deg % PENT.length) + PENT.length) % PENT.length;
        return base * Math.pow(2, (PENT[idx] + oct * 12) / 12);
    }
    // Campanita de xilófono: fundamental + un toque de octava, ataque
    // rapidísimo y decaimiento corto — el timbre "de caricatura" clásico.
    function mallet(freq, dur, vol, delay) {
        if (freq == null) return;
        tone(freq, { dur, type: 'sine', vol, attack: 0.003, delay });
        tone(freq * 2, { dur: dur * 0.55, type: 'sine', vol: vol * 0.32, attack: 0.002, delay });
    }
    // Cada perfil: tempo y patrón de 8 pasos (grados pentatónicos; null=silencio).
    // El bajo rebota raíz/quinta (y octava en el fuerte); la melodía es más
    // saltarina mientras más fuerte es el enemigo, sin volverse oscura.
    const MUSIC = [
        { bpm: 104, bass: [0, null, 7, null, 0, null, 7, null], melody: [0, 4, 7, 4, 2, 4, 0, null] },   // calmo: mapa/menú
        { bpm: 132, bass: [0, 7, 0, 7, 0, 7, 0, 7], melody: [7, 9, 7, 4, 0, 4, 7, null] },                // combate normal
        { bpm: 156, bass: [0, 12, 7, 12, 0, 12, 7, 12], melody: [9, 7, 9, 12, 9, 7, 4, 7] }               // enemigo fuerte
    ];
    let seq = null;
    function startAmbient() {
        const c = ensureCtx();
        if (!c || seq) return;
        seq = { level: 0, step: 0, nextTime: c.currentTime + 0.15, timer: null };
        schedulerTick();
    }
    function schedulerTick() {
        if (!seq) return;
        const c = ensureCtx();
        if (!c) return;
        const prof = MUSIC[seq.level] || MUSIC[0];
        const stepDur = 60 / prof.bpm / 2; // corcheas
        while (seq.nextTime < c.currentTime + 0.12) {
            const i = seq.step % 8;
            const delay = Math.max(0, seq.nextTime - c.currentTime);
            const bassFreq = degFreq(130.81, prof.bass[i]); // C3
            if (bassFreq != null) tone(bassFreq, { dur: stepDur * 0.82, type: 'triangle', vol: 0.11, attack: 0.004, delay });
            const melFreq = degFreq(261.63, prof.melody[i]); // C4
            if (melFreq != null) mallet(melFreq, stepDur * 1.15, 0.075, delay);
            seq.nextTime += stepDur;
            seq.step++;
        }
        seq.timer = setTimeout(schedulerTick, 60);
    }
    // level: 0 calmo (mapa/menú) · 1 combate normal · 2 enemigo fuerte (élite/jefe)
    function setAmbientMood(level) {
        level = level || 0;
        if (!seq || seq.level === level) return;
        seq.level = level; // el tempo/patrón nuevo entra solo en el siguiente paso
    }

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
