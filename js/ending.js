// ============================================================
// ENDING.JS — El final animado, en 5 escenas, con el mismo estilo y los
// mismos dibujos que la historia del inicio (js/story.js → CINE_KIT):
//   0 La torre: el último guardián cae y se rompen los barrotes; el Rey es libre.
//   1 Las jaulas: se abren una por una y las frutas saltan de alegría.
//   2 El regreso: vuelven al pueblo en las mismas carretas… jaladas por los bichos.
//   3 La fiesta: el pueblo celebra con fuegos artificiales y confeti.
//   4 El héroe: el Rey Fruta nombra a tu fruta Héroe del Reino. ¡Fin!
// Se ve al vencer al jefe final (antes de la pantalla de victoria) y se
// puede repetir desde las Notas una vez que lo hayas visto.
// Clic / Enter / → avanzan, ← regresa, Esc salta.
// ============================================================

(function () {
    const SEEN_KEY = 'fruitSpireEndingSeen';
    const SCENES = [
        { dur: 7500, sfx: 'win', text: () => '¡Lo lograste! El último guardián cayó y los barrotes de la torre se rompieron.' },
        { dur: 7500, sfx: 'relicGet', text: () => 'Una por una se abrieron todas las jaulas. ¡Las frutas volvían a ser libres!' },
        { dur: 9000, sfx: 'actFanfare', text: () => 'Regresaron a casa en las mismas carretas… solo que esta vez, los bichos jalaban.' },
        { dur: 8000, sfx: 'sparkle', text: () => 'Esa noche, el pueblo hizo la fiesta más grande de toda su historia.' },
        { dur: 0, sfx: 'win', text: (name) => `Y el Rey Fruta nombró a ${name} Héroe del Reino. ¡Gracias por jugar!` }
    ];
    let timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(() => { if (GAME.screen === 'ending') fn(); }, ms)); };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const K = () => window.CINE_KIT;

    // ---------- escena 0: la torre ----------
    function towerScene(c) {
        const { A, at, towerSvg, towerBars, bubble, svgBox } = K();
        const { sparkle } = window.SPRITE_KIT;
        const boss = (GAME.lastBossId && window.ENEMY_DB[GAME.lastBossId]) ? GAME.lastBossId : 'licuadora_suprema';
        return `
        <section class="sc sc-e0">
            <div class="e-tower">
                ${at(520, -10, towerSvg())}
                ${at(652, 318, `<div class="e-king-window">${A('rey_fruta', 136, { mood: 'happy' })}</div>`)}
                ${at(520, -10, towerBars(), 'e-bars')}
                ${at(830, 250, bubble('¡Gracias!', 'big'), 'e-thanks')}
                ${[[640, 300], [800, 330], [700, 250], [760, 470]].map(([x, y], i) => at(x, y, svgBox(40, 40, sparkle(20, 20, 2)), 'e-spark', `--i:${i}`)).join('')}
            </div>
            ${at(960, 560, A(boss, 200, { mood: 'hurt' }), 'e-boss')}
            ${at(1080, 600, A('caballero_cuchillas', 150, { mood: 'hurt' }), 'e-flee r')}
            ${at(250, 610, A('guardia_hielo', 150, { mood: 'hurt' }), 'e-flee l')}
            ${at(420, 540, `<span class="ca" style="width:220px;height:220px">${fruitArt(c.hero.id, { mood: 'happy' })}</span>`, 'e-hero0')}
        </section>`;
    }

    // ---------- escena 1: las jaulas ----------
    function cagesScene(c) {
        const { A, P, at } = K();
        const pets = c.pets;
        const inside = [
            A(c.others[0], 110, { mood: 'happy' }), P(pets[0], 110), A(c.others[1], 110, { mood: 'happy' }),
            P(pets[1], 110), A(c.others[2], 110, { mood: 'happy' }), P(pets[2], 110)
        ];
        return `
        <section class="sc sc-e1">
            <div class="hill back" style="left:-240px;top:470px;width:1100px;height:420px"></div>
            <div class="hill back" style="left:760px;top:450px;width:1200px;height:440px"></div>
            <div class="ground" style="top:640px"></div>
            ${inside.map((h, i) => `
                ${at(90 + i * 215, 470, `<div class="e-freed">${h}</div>`, 'e-fruit', `--i:${i}`)}
                ${at(60 + i * 215, 430, A('cage', 180), 'e-cage', `--i:${i}`)}`).join('')}
            ${at(1150, 250, `<span class="ca" style="width:170px;height:170px">${fruitArt(c.hero.id, { mood: 'happy' })}</span>`, 'e-hero1')}
            <div class="e-confetti">${confetti(40)}</div>
        </section>`;
    }

    // ---------- escena 2: el regreso ----------
    function cart(k, pullerId, riders, gold) {
        const { A, at, wagonSvg, wheelSvg, ropeSvg } = K();
        return `
        <div class="e-cart ${gold ? 'royal' : ''}" style="left:${k * 440}px">
            ${at(250, gold ? 150 : 170, A(pullerId, gold ? 170 : 140, { mood: 'hurt' }), 'e-puller')}
            ${at(230, 230, `<i class="sweat"></i><i class="sweat s2"></i>`, 'e-sweat')}
            ${at(gold ? 212 : 196, 238, ropeSvg(), 'e-rope')}
            ${at(0, 190, wagonSvg(gold), 'e-wagon')}
            <div class="e-riders" style="left:${gold ? 50 : 30}px;top:${gold ? 108 : 150}px">${riders}</div>
            ${at(30, 256, wheelSvg(gold), 'wheel-wrap')}${at(150, 256, wheelSvg(gold), 'wheel-wrap')}
            ${at(gold ? 196 : 190, 144, flagSvg(gold ? '#F2667A' : ['#5CC9A7', '#FFCF4D', '#9B7FD4', '#FFA64D'][k % 4]), 'e-flag')}
        </div>`;
    }
    function flagSvg(color) {
        return K().svgBox(60, 90, `<path d="M8 88 L8 6" stroke="#4A3428" stroke-width="5" stroke-linecap="round"/><path d="M10 8 Q34 2 52 12 Q34 20 10 26 Z" fill="${color}" stroke="#4A3428" stroke-width="4" stroke-linejoin="round"/>`, 'flag');
    }
    function returnScene(c) {
        const { A, P, at, treeSvg, houseSvg } = K();
        const rider = (html, i) => `<span class="e-rider" style="--i:${i}">${html}</span>`;
        const p = c.pets;
        const carts = [
            cart(0, 'rata_mercado', rider(A(c.others[0], 86, { mood: 'happy' }), 0) + rider(P(p[0], 86), 1)),
            cart(1, 'gusano_venenoso', rider(P(p[1], 86), 2) + rider(A(c.others[1], 86, { mood: 'happy' }), 3)),
            cart(2, 'cucaracha_blindada', rider(A(c.others[2], 86, { mood: 'happy' }), 4) + rider(P(p[2], 86), 5)),
            cart(3, 'oruga_reina', rider(A('rey_fruta', 130, { mood: 'happy' }), 6), true),
            cart(4, 'hormiga_obrera', rider(P(p[3], 86), 7) + rider(P(p[4], 86), 8))
        ].join('');
        return `
        <section class="sc sc-e2">
            <div class="e-parallax">
                <div class="hill back" style="left:-300px;top:450px;width:1000px;height:420px"></div>
                <div class="hill back" style="left:600px;top:420px;width:1100px;height:460px"></div>
                ${at(1180, 330, houseSvg('#F2667A', [[70, 80], [120, 70], [150, 92]]), 'e-house')}
                ${at(300, 390, treeSvg('#F2667A'), 'tree', 'transform:scale(.7)')}${at(900, 380, treeSvg('#FFCF4D'), 'tree', 'transform:scale(.8)')}
            </div>
            <div class="road"></div>
            <div class="e-convoy">
                ${at(2250, 500, `<span class="ca" style="width:150px;height:150px">${fruitArt(c.hero.id, { mood: 'happy' })}</span>`, 'e-leader')}
                ${carts}
            </div>
            <div class="e-grass"></div>
        </section>`;
    }

    // ---------- escena 3: la fiesta ----------
    function partyScene(c) {
        const { A, P, at, houseSvg, treeSvg, bunting, noteSvg } = K();
        const [o1, o2, o3] = c.others;
        const pets = c.pets.slice(0, 6);
        const petPos = [[300, 664], [410, 690], [540, 676], [820, 676], [960, 690], [1070, 664]];
        const colors = ['#FFCF4D', '#F2667A', '#5CC9A7', '#9B7FD4', '#8FD0F0', '#FFA64D'];
        const fireworks = [[260, 150], [1150, 120], [720, 90], [480, 230], [980, 250]].map(([x, y], i) =>
            `<div class="e-fw" style="left:${x}px;top:${y}px;--i:${i};--c:${colors[i % colors.length]}">${Array.from({ length: 12 }, (_, k) => `<i style="--a:${k * 30}deg"></i>`).join('')}</div>`).join('');
        return `
        <section class="sc sc-e3">
            ${fireworks}
            <div class="hill back" style="left:-240px;top:420px;width:1100px;height:460px"></div>
            <div class="hill back" style="left:760px;top:400px;width:1200px;height:480px"></div>
            ${at(40, 350, houseSvg('#F2667A', [[70, 80], [120, 70], [150, 92]]), 'house')}
            ${at(1210, 320, houseSvg('#9B7FD4', [[60, 86], [100, 64], [140, 88]]), 'house')}
            ${at(250, 380, treeSvg('#F2667A'), 'tree', 'transform:scale(.8)')}
            ${at(1060, 350, treeSvg('#FFCF4D'), 'tree', 'transform:scale(.85)')}
            <div class="ground" style="top:610px"></div>
            ${at(150, 290, bunting(), 'bunting')}
            <div class="stage-deck" style="left:590px;top:600px"></div>
            ${at(625, 400, A('rey_fruta', 190, { mood: 'happy' }), 'e-dance king')}
            ${[[330, 520, o1], [470, 540, o2], [990, 540, o3]].map(([x, y, id], i) => at(x, y, A(id, 120, { mood: 'happy' }), 'e-dance', `--i:${i}`)).join('')}
            ${at(830, 500, `<span class="ca" style="width:140px;height:140px">${fruitArt(c.hero.id, { mood: 'happy' })}</span>`, 'e-dance', '--i:3')}
            ${at(1150, 540, A('profe_limon', 120), 'e-dance', '--i:4')}
            ${pets.map((pc, i) => at(petPos[i][0], petPos[i][1], P(pc, 96), 'e-pet', `--i:${i}`)).join('')}
            ${[[360, 470], [520, 460], [950, 460], [700, 360], [1100, 420]].map(([x, y], i) => at(x, y, noteSvg(), 'e-note', `--i:${i}`)).join('')}
            <div class="e-confetti">${confetti(60)}</div>
        </section>`;
    }

    // ---------- escena 4: el héroe ----------
    function heroScene(c) {
        const { A, P, at, svgBox } = K();
        const { sparkle } = window.SPRITE_KIT;
        const medal = svgBox(120, 160, `
            <path d="M40 4 L60 60 L80 4" fill="none" stroke="#E0455E" stroke-width="16"/>
            <path d="M40 4 L60 60 L80 4" fill="none" stroke="#4A3428" stroke-width="3"/>
            <circle cx="60" cy="100" r="42" fill="#FFCF4D" stroke="#4A3428" stroke-width="5"/>
            <circle cx="60" cy="100" r="30" fill="#FFE27A" stroke="#E0A92E" stroke-width="4"/>
            <path d="M60 80 L66 94 L81 95 L69 104 L73 119 L60 110 L47 119 L51 104 L39 95 L54 94 Z" fill="#FFF6B8" stroke="#4A3428" stroke-width="3" stroke-linejoin="round"/>`);
        return `
        <section class="sc sc-e4">
            <div class="e-rays"></div>
            <div class="hill dawn" style="left:-500px;top:600px;width:2440px;height:420px"></div>
            ${at(240, 330, A('rey_fruta', 260, { mood: 'happy' }), 'e-king4')}
            <div class="hero-halo e-halo"></div>
            ${at(575, 330, `<span class="ca" style="width:290px;height:290px">${fruitArt(c.hero.id, { mood: 'happy' })}</span>`, 'e-hero4')}
            ${at(660, 60, medal, 'e-medal')}
            ${at(980, 470, A('profe_limon', 160), 'e-limon4')}
            ${c.pets.slice(0, 4).map((pc, i) => at([120, 470, 900, 1180][i], [640, 660, 660, 620][i], P(pc, 90), 'e-pet', `--i:${i}`)).join('')}
            ${[[540, 380], [900, 420], [470, 540], [960, 300], [700, 250]].map(([x, y], i) => at(x, y, svgBox(40, 40, sparkle(20, 20, 2)), 'e-spark', `--i:${i}`)).join('')}
            <div class="e-title">${logoHtml('¡Fin!', 'cine-logo')}<div class="e-sub hand">Héroe del Reino de las Frutas</div></div>
            <div class="e-confetti">${confetti(40)}</div>
        </section>`;
    }

    // confeti: siempre el mismo (semilla fija), cae en bucle
    function confetti(n) {
        let seed = n * 7 + 3;
        const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const colors = ['#F2667A', '#FFCF4D', '#5CC9A7', '#9B7FD4', '#FFA64D', '#8FD0F0'];
        let s = '';
        for (let i = 0; i < n; i++) {
            s += `<i style="left:${(r() * 100).toFixed(1)}%;--d:${(r() * 4).toFixed(2)}s;--t:${(3 + r() * 3).toFixed(2)}s;--r:${Math.round(r() * 720 - 360)}deg;background:${colors[i % colors.length]}"></i>`;
        }
        return s;
    }

    // ---------- control ----------
    function root() { return document.getElementById('cine'); }
    function goScene(i) {
        clear();
        i = Math.max(0, Math.min(SCENES.length - 1, i));
        GAME.ending.i = i;
        GAME.ending.t0 = performance.now();
        const el = root();
        if (!el) return;
        el.className = el.className.replace(/es-\d+/, `es-${i}`);
        const cap = document.getElementById('cine-text');
        if (cap) { cap.innerHTML = K().typewriter(SCENES[i].text(K().cast().hero.name)); restartClass(cap.parentNode, 'show'); }
        el.querySelectorAll('.cine-dots i').forEach((d, k) => d.classList.toggle('on', k <= i));
        const s = SCENES[i];
        if (window.Sfx && Sfx[s.sfx]) Sfx[s.sfx]();
        if (i === 3 && window.Sfx) [900, 1900, 2900, 3900].forEach((ms) => later(() => Sfx.sparkle(), ms));
        if (s.dur) later(() => goScene(i + 1), s.dur);
    }
    function finish() {
        clear();
        const replay = GAME.ending && GAME.ending.replay;
        GAME.ending = null;
        if (replay) { showMainMenu(); return; }
        GAME.screen = 'victory';
        render();
    }

    window.endingSeen = function () {
        try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
    };
    window.startEnding = function (opts) {
        clear();
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* sin almacenamiento */ }
        GAME.ending = { i: 0, replay: !!(opts && opts.replay), t0: performance.now() };
        GAME.screen = 'ending';
        render();
        goScene(0);
    };
    window.replayEnding = function () { window.startEnding({ replay: true }); };
    window.skipEnding = function () { if (GAME.screen === 'ending') finish(); };
    window.endingNext = function () {
        if (GAME.screen !== 'ending' || !GAME.ending) return;
        if (performance.now() - (GAME.ending.t0 || 0) < 350) return;
        if (GAME.ending.i >= SCENES.length - 1) { finish(); return; }
        goScene(GAME.ending.i + 1);
    };
    window.endingGo = function (i) { if (GAME.screen === 'ending' && GAME.ending) goScene(i); };
    window.endingClick = function (e) {
        if (e.target.closest('button, .cine-dots')) return;
        if (GAME.ending && GAME.ending.i < SCENES.length - 1) endingNext();
    };
    document.addEventListener('keydown', (e) => {
        if (GAME.screen !== 'ending') return;
        if (e.key === 'Escape') { e.preventDefault(); skipEnding(); }
        else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); endingNext(); }
        else if (e.key === 'ArrowLeft' && GAME.ending && GAME.ending.i > 0) { e.preventDefault(); goScene(GAME.ending.i - 1); }
    });

    window.renderEnding = function () {
        if (!GAME.ending) GAME.ending = { i: 0, replay: false, t0: performance.now() };
        const c = K().cast();
        const i = GAME.ending.i;
        return `
        <div id="cine" class="cine ending es-${i}" onclick="endingClick(event)">
            <div class="sky day"></div><div class="sky dusk"></div><div class="sky night"></div><div class="sky dawn"></div>
            <div class="cine-stars">${K().stars()}</div>
            <div class="cine-sun"><i></i><b></b></div><div class="cine-moon"></div>
            <div class="cine-clouds"><span class="cloud k1"></span><span class="cloud k2"></span><span class="cloud k3"></span></div>
            <div class="cine-ground-fill"></div>
            <div class="cine-stage">
                ${towerScene(c)}${cagesScene(c)}${returnScene(c)}${partyScene(c)}${heroScene(c)}
            </div>
            <div class="cine-vignette"></div>
            <div class="cine-caption show"><p id="cine-text" class="hand">${K().typewriter(SCENES[i].text(c.hero.name))}</p>
                <div class="cine-dots">${SCENES.map((s, k) => `<i class="${k <= i ? 'on' : ''}" onclick="endingGo(${k})"></i>`).join('')}</div></div>
            <div class="cine-controls">
                <button class="secondary cine-skip" onclick="skipEnding()">Saltar »</button>
                <button class="btn-banana cine-next" onclick="endingNext()">Siguiente ›</button>
            </div>
            <button class="btn-mint cine-go" onclick="skipEnding()">${GAME.ending.replay ? 'Volver al menú' : 'Continuar'}</button>
        </div>`;
    };
})();
