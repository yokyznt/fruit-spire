// ============================================================
// STORY.JS — La historia animada del inicio de partida, en 6 escenas
// dibujadas con los personajes del juego:
//   0 La aldea feliz: las frutas bailan frente al Rey Fruta.
//   1 La invasión: anochece, caen rayos y llegan los bichos. Tu fruta se esconde.
//   2 El convoy: carretas con jaulas llenas de frutas y la carroza del Rey.
//   3 Los tres castillos: cada uno más grande; las carretas suben a ellos.
//   4 La Torre del Rey: el Rey Fruta pide auxilio desde lo más alto.
//   5 El héroe: amanece y tu fruta se prepara para el rescate.
// Todo el escenario mide 1440x810 (como el lienzo del juego) y se apoya
// abajo al centro; el cielo y el suelo se estiran si la ventana es más
// ancha o más alta. Clic / Enter / → avanzan, Esc salta la historia.
// La escena actual vive en GAME.story, así que un redibujo no la pierde.
// ============================================================

(function () {
    const { INK, st, sparkle, shine, leaf } = window.SPRITE_KIT;
    const SCENES = [
        { dur: 7000, sfx: 'sparkle', text: () => 'Érase una vez el Reino de las Frutas, donde todas vivían felices junto a su querido Rey Fruta.' },
        { dur: 6500, sfx: 'introSting', text: () => 'Pero una noche llegaron los bichos y las máquinas malvadas… ¡Solo una fruta alcanzó a esconderse!' },
        { dur: 9000, sfx: 'shuffle', text: () => 'Encerraron a las frutas en jaulas y se las llevaron en carretas, una tras otra. Al Rey Fruta, en su propia carroza.' },
        { dur: 8000, sfx: 'turnEnemy', text: () => 'Las repartieron en tres castillos, cada uno más grande y peligroso que el anterior.' },
        { dur: 7000, sfx: 'lose', text: () => 'Y al Rey Fruta lo encerraron en lo más alto de la última torre, rodeado de guardias.' },
        { dur: 0, sfx: 'win', text: (name) => `Esa fruta valiente eres tú, ${name}. Sube los tres castillos, libera a tus amigos y rescata al Rey Fruta.` }
    ];
    let timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(() => { if (GAME.screen === 'story') fn(); }, ms)); };
    const clear = () => { timers.forEach(clearTimeout); timers = []; };

    // ---------- piezas de dibujo ----------
    // un personaje ya dibujado, de un tamaño en px
    const A = (id, px, opts, cls) => `<span class="ca ${cls || ''}" style="width:${px}px;height:${px}px">${art(id, '', Object.assign({}, opts || {}))}</span>`;
    const petSvg = (c) => `<span class="art"><svg class="sprite" viewBox="0 0 100 100"><g transform="translate(50 61) scale(1.95)">${c.draw()}</g></svg></span>`;
    const P = (c, px, cls) => `<span class="ca ${cls || ''}" style="width:${px}px;height:${px}px">${petSvg(c)}</span>`;
    // fruta con cara feliz y cara de susto (cambia en la escena 1)
    const moodSwap = (id, px, useFruitArt) => {
        const draw = (mood) => (useFruitArt ? fruitArt(id, { mood }) : art(id, '', { mood }));
        return `<span class="ca moodswap" style="width:${px}px;height:${px}px"><span class="m-happy">${draw(undefined)}</span><span class="m-hurt">${draw('hurt')}</span></span>`;
    };
    const at = (x, y, inner, cls, extra) => `<div class="pos ${cls || ''}" style="left:${x}px;top:${y}px;${extra || ''}">${inner}</div>`;
    const svgBox = (w, h, inner, cls) => `<svg class="cine-svg ${cls || ''}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

    function houseSvg(roof, dots) {
        return svgBox(200, 200, `
            <rect x="40" y="100" width="120" height="90" rx="10" fill="#FFF6E9" ${st(5)}/>
            <path d="M22 108 Q26 36 100 32 Q174 36 178 108 Z" fill="${roof}" ${st(5)}/>
            ${dots.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="#fff" opacity=".8"/>`).join('')}
            <path d="M100 34 Q98 18 108 10" ${st(5)} fill="none"/><path d="M108 14 q14 -12 26 -4 q-12 12 -26 4 z" fill="#7BBF5A" ${st(4)}/>
            <path d="M84 190 L84 146 Q100 130 116 146 L116 190 Z" fill="#B0703F" ${st(4)}/><circle cx="110" cy="168" r="3" fill="#FFCF4D"/>
            <circle cx="66" cy="136" r="13" fill="#8FD0F0" ${st(4)}/><path d="M66 123 L66 149 M53 136 L79 136" ${st(2.5)} fill="none"/>
            <rect x="130" y="124" width="22" height="24" rx="4" fill="#8FD0F0" ${st(4)}/>
            <path d="M40 190 L160 190" ${st(5)} fill="none"/>`);
    }
    function treeSvg(fruit) {
        return svgBox(160, 200, `
            <path d="M70 190 L74 110 L86 110 L90 190 Z" fill="#8C6A3F" ${st(5)}/>
            <circle cx="80" cy="84" r="62" fill="#7BBF5A" ${st(5)}/>
            <circle cx="50" cy="70" r="26" fill="#8CCB5F"/><circle cx="104" cy="62" r="22" fill="#8CCB5F"/>
            ${[[46, 96], [96, 104], [74, 56], [118, 84], [34, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${fruit}" ${st(3.5)}/>`).join('')}`);
    }
    const bushSvg = () => svgBox(220, 150, `
        <path d="M10 140 Q0 90 40 84 Q44 40 90 44 Q110 10 150 34 Q200 34 196 84 Q224 96 210 140 Z" fill="#5DA33E" ${st(5)}/>
        <circle cx="70" cy="90" r="8" fill="#F2667A" ${st(3)}/><circle cx="150" cy="70" r="7" fill="#FFCF4D" ${st(3)}/><circle cx="118" cy="112" r="6" fill="#F2667A" ${st(3)}/>
        <path d="M40 100 Q60 90 70 110 M120 60 Q140 50 150 60" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    function bunting() {
        const colors = ['#F2667A', '#FFCF4D', '#5CC9A7', '#9B7FD4', '#FFA64D', '#8FD0F0'];
        let flags = '';
        for (let i = 0; i < 18; i++) {
            const t = (i + 0.5) / 18, x = 20 + t * 1100, y = 22 + Math.sin(t * Math.PI) * 70;
            flags += `<path d="M${(x - 22).toFixed(0)} ${(y - 4).toFixed(0)} L${(x + 22).toFixed(0)} ${(y - 4).toFixed(0)} L${x.toFixed(0)} ${(y + 40).toFixed(0)} Z" fill="${colors[i % colors.length]}" ${st(3.5)}/>`;
        }
        return svgBox(1140, 140, `<path d="M20 22 Q570 162 1120 22" stroke="${INK}" stroke-width="4" fill="none"/>${flags}`);
    }
    const noteSvg = () => svgBox(40, 50, `<path d="M14 40 L14 8 L34 4 L34 34" ${st(4)} fill="none"/><ellipse cx="9" cy="40" rx="8" ry="6" fill="${INK}"/><ellipse cx="29" cy="34" rx="8" ry="6" fill="${INK}"/>`, 'music-note');
    const bubble = (text, cls) => `<div class="cine-bubble ${cls || ''}"><span>${text}</span></div>`;
    const wheelSvg = (gold) => svgBox(70, 70, `
        <circle cx="35" cy="35" r="30" fill="${gold ? '#FFE27A' : '#C9A27A'}" ${st(5)}/>
        <circle cx="35" cy="35" r="20" fill="none" stroke="${gold ? '#E0A92E' : '#8C6A3F'}" stroke-width="4"/>
        <path d="M35 7 L35 63 M7 35 L63 35 M15 15 L55 55 M55 15 L15 55" stroke="${INK}" stroke-width="4"/>
        <circle cx="35" cy="35" r="7" fill="${gold ? '#FFCF4D' : '#8C6A3F'}" ${st(3.5)}/>`, 'wheel');
    const wagonSvg = (gold) => svgBox(230, 120, gold ? `
        <path d="M14 40 L216 40 L206 96 L24 96 Z" fill="#FFCF4D" ${st(5)}/>
        <path d="M20 58 L210 58" stroke="#E0A92E" stroke-width="5"/>
        <path d="M30 40 Q40 76 58 40 Q70 76 86 40 M144 40 Q156 76 170 40 Q182 76 200 40" fill="#C8374F" ${st(3.5)}/>
        ${[60, 115, 170].map((x) => `<circle cx="${x}" cy="76" r="7" fill="#F2667A" ${st(3)}/>`).join('')}
        <path d="M14 70 L0 70" ${st(6)} fill="none"/>` : `
        <path d="M14 42 L216 42 L208 96 L22 96 Z" fill="#B0703F" ${st(5)}/>
        <path d="M18 60 L212 60 M20 78 L210 78" stroke="#8C5A2E" stroke-width="3"/>
        <path d="M60 42 L58 96 M115 42 L115 96 M170 42 L172 96" stroke="#8C5A2E" stroke-width="3"/>
        <rect x="8" y="34" width="214" height="12" rx="5" fill="#C9804A" ${st(4)}/>
        <path d="M14 72 L0 72" ${st(6)} fill="none"/>`, 'wagon');
    const ropeSvg = () => svgBox(80, 40, `<path d="M4 10 Q40 34 76 14" stroke="#8C6A3F" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M4 10 Q40 34 76 14" ${st(1.5)} fill="none"/>`, 'rope');
    function towerSvg() {
        let bricks = '';
        for (let r = 0; r < 26; r++) for (let c = 0; c < 6; c++) {
            if ((r + c) % 3 === 0) bricks += `<rect x="${64 + c * 48 + (r % 2 ? 24 : 0)}" y="${240 + r * 24}" width="36" height="14" rx="4" fill="#8C80AE" opacity=".5"/>`;
        }
        return svgBox(400, 860, `
            <path d="M60 230 L340 230 L352 860 L48 860 Z" fill="#9A8FBC" ${st(6)}/>
            ${bricks}
            <path d="M40 232 L40 196 L80 196 L80 212 L120 212 L120 196 L160 196 L160 212 L240 212 L240 196 L280 196 L280 212 L320 212 L320 196 L360 196 L360 232 Z" fill="#8A7FAE" ${st(6)}/>
            <path d="M30 198 L200 12 L370 198 Z" fill="#4F4A66" ${st(6)}/>
            <path d="M80 160 L200 40 L230 70" stroke="#6E6590" stroke-width="10" fill="none" stroke-linecap="round"/>
            <path d="M200 14 L200 -30" ${st(5)} fill="none"/><path d="M200 -30 L250 -18 L200 -6 Z" fill="#E0455E" ${st(4.5)}/>
            <path d="M128 520 L128 330 Q200 250 272 330 L272 520 Z" fill="#2B2236" ${st(6)}/>
            <path d="M136 512 L136 334 Q200 262 264 334 L264 512 Z" fill="url(#glow)"/>
            <defs><radialGradient id="glow" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#FFE27A" stop-opacity=".95"/><stop offset=".6" stop-color="#FFB347" stop-opacity=".5"/><stop offset="1" stop-color="#2B2236" stop-opacity="0"/></radialGradient></defs>
            <path d="M110 522 L290 522 L296 540 L104 540 Z" fill="#8A7FAE" ${st(5)}/>
            <path d="M70 640 Q60 700 90 760 M320 600 Q340 680 310 740" stroke="#5DA33E" stroke-width="10" fill="none" stroke-linecap="round"/>
            ${[[80, 660], [90, 720], [328, 640], [318, 700]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#7BBF5A" ${st(3)}/>`).join('')}`, 'tower');
    }
    const towerBars = () => svgBox(400, 860, `${[162, 200, 238].map((x) => `<path d="M${x} ${x === 200 ? 262 : 280} L${x} 520" stroke="${INK}" stroke-width="10"/><path d="M${x} ${x === 200 ? 262 : 280} L${x} 520" stroke="#9AA5B1" stroke-width="5"/>`).join('')}
        <path d="M130 400 L270 400" stroke="${INK}" stroke-width="10"/><path d="M130 400 L270 400" stroke="#9AA5B1" stroke-width="5"/>`, 'tower-bars');
    // cordillera lejana (picos al azar, pero siempre iguales)
    function mountainsSvg() {
        let seed = 11;
        const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        let d = 'M0 240 L0 160';
        for (let x = 0; x <= 2640; x += 120) d += ` L${x + 60} ${(30 + r() * 90).toFixed(0)} L${x + 120} ${(130 + r() * 50).toFixed(0)}`;
        d += ' L2640 240 Z';
        return svgBox(2640, 240, `<path d="${d}" fill="#3A3460" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#524A80" stroke-width="3" transform="translate(0 14)" opacity=".5"/>`);
    }
    // estrellas fijas (siempre las mismas)
    function stars() {
        let seed = 7;
        const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        let s = '';
        for (let i = 0; i < 70; i++) s += `<i style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 60).toFixed(1)}%;--d:${(r() * 3).toFixed(2)}s;--z:${(1 + r() * 2).toFixed(1)}"></i>`;
        return s;
    }

    // ---------- el escenario ----------
    function cast() {
        const heroId = (GAME.player && GAME.player.characterId) || GAME.selectedChar || 'manzana';
        const hero = window.CHARACTER_DB[heroId] || window.CHARACTER_DB.manzana;
        const fruits = Object.keys(window.CHARACTER_DB);
        const others = fruits.filter((id) => id !== hero.id);
        const pets = window.COSMETICS.filter((c) => c.type === 'pet');
        return { hero, others, pets };
    }

    function villageScene(c) {
        const [o1, o2, o3] = c.others;
        const dancers = [[330, 520, o1], [470, 540, o2], [880, 540, o3]];
        const pets = c.pets.slice(0, 6);
        const petPos = [[300, 664], [410, 690], [540, 676], [820, 676], [960, 690], [1070, 664]];
        const invaders = [
            ['cucaracha_blindada', 1040, 580, 130, 'r'], ['rata_mercado', 1170, 556, 145, 'r'], ['mango_zombie', 1290, 530, 155, 'r'],
            ['gusano_venenoso', 1110, 660, 120, 'r'], ['topo_excavador', 660, 648, 120, 'up'],
            ['cuervo_ladron', 1130, 220, 120, 'fr'], ['avispa_furiosa', 1290, 300, 100, 'fr'], ['mosca_podrida', 470, 250, 100, 'fl']
        ];
        return `
        <section class="sc sc-village">
            <div class="hill back" style="left:-240px;top:420px;width:1100px;height:460px"></div>
            <div class="hill back" style="left:760px;top:400px;width:1200px;height:480px"></div>
            ${at(40, 350, houseSvg('#F2667A', [[70, 80], [120, 70], [150, 92]]), 'house')}
            ${at(1210, 320, houseSvg('#9B7FD4', [[60, 86], [100, 64], [140, 88]]), 'house')}
            ${at(250, 380, treeSvg('#F2667A'), 'tree', 'transform:scale(.8)')}
            ${at(1060, 350, treeSvg('#FFCF4D'), 'tree', 'transform:scale(.85)')}
            <div class="ground" style="top:610px"></div>
            ${at(150, 290, bunting(), 'bunting')}
            <div class="stage-deck" style="left:590px;top:600px"></div>
            ${at(625, 400, moodSwap('rey_fruta', 190), 'king')}
            ${dancers.map(([x, y, id], i) => at(x, y, moodSwap(id, 120), 'dancer', `--i:${i}`)).join('')}
            ${pets.map((p, i) => at(petPos[i][0], petPos[i][1], P(p, 96), 'pet', `--i:${i}`)).join('')}
            ${at(210, 528, moodSwap(c.hero.id, 130, true), 'hero-small')}
            ${at(10, 606, bushSvg(), 'bush')}
            ${[[360, 470], [520, 460], [950, 460], [700, 360]].map(([x, y], i) => at(x, y, noteSvg(), 'music', `--i:${i}`)).join('')}
            ${dancers.map(([x, y], i) => at(x + 40, y - 70, bubble('!', 'alert'), 'alert-wrap', `--i:${i}`)).join('')}
            ${at(660, 330, bubble('!', 'alert'), 'alert-wrap', '--i:3')}
            ${invaders.map(([id, x, y, px, side], i) => at(x, y, A(id, px), `invader from-${side}`, `--i:${i}`)).join('')}
            ${at(150, 500, bubble('¡Shh!'), 'hide-bubble')}
        </section>`;
    }

    function cartHtml(k, pullerId, fruitsHtml, gold) {
        return `
        <div class="cart ${gold ? 'royal' : ''}" style="left:${k * 430}px">
            ${at(0, gold ? 150 : 170, A(pullerId, gold ? 170 : 140), 'puller')}
            ${at(gold ? 140 : 112, 238, ropeSvg())}
            ${at(180, 190, wagonSvg(gold))}
            ${at(gold ? 196 : 205, gold ? 10 : 40, `<div class="cage-in">${fruitsHtml}</div>`, 'cage-fruits')}
            ${at(gold ? 196 : 205, gold ? 10 : 40, A('cage', gold ? 200 : 180), 'cage-bars')}
            ${at(200, 256, wheelSvg(gold), 'wheel-wrap')}${at(330, 256, wheelSvg(gold), 'wheel-wrap')}
            <span class="dust" style="left:380px;top:310px"></span><span class="dust d2" style="left:250px;top:314px"></span>
        </div>`;
    }
    function convoyScene(c) {
        const p = c.pets;
        const fruit = (id) => `<span class="caged">${A(id, 74, { mood: 'hurt' })}<i class="tear"></i></span>`;
        const pet = (pc) => `<span class="caged">${P(pc, 84)}<i class="tear"></i></span>`;
        const carts = [
            cartHtml(0, 'rata_mercado', fruit(c.others[0]) + pet(p[0])),
            cartHtml(1, 'gusano_venenoso', pet(p[1]) + fruit(c.others[1])),
            cartHtml(2, 'cucaracha_blindada', fruit(c.others[2]) + pet(p[2])),
            cartHtml(3, 'hormiga_obrera', pet(p[3]) + pet(p[4])),
            cartHtml(4, 'oruga_reina', `<span class="caged king-caged">${A('rey_fruta', 120, { mood: 'hurt' })}<i class="tear"></i></span>`, true)
        ].join('');
        return `
        <section class="sc sc-convoy">
            <div class="far-mountains">${mountainsSvg()}</div>
            <div class="parallax">
                <div class="hill back night" style="left:-300px;top:450px;width:1000px;height:420px"></div>
                <div class="hill back night" style="left:600px;top:420px;width:1100px;height:460px"></div>
                <div class="hill back night" style="left:1500px;top:440px;width:1000px;height:440px"></div>
                ${at(420, 400, treeSvg('#9B7FD4'), 'tree dark', 'transform:scale(.7)')}${at(1320, 390, treeSvg('#9B7FD4'), 'tree dark', 'transform:scale(.8)')}
            </div>
            <div class="road"></div>
            <div class="convoy">
                ${carts}
                ${at(300, 180, A('mosca_podrida', 90), 'flyer')}${at(1150, 150, A('avispa_furiosa', 90), 'flyer', '--i:1')}${at(1900, 170, A('cuervo_ladron', 110), 'flyer', '--i:2')}
                ${at(700, 318, bubble('¡Socorro!'), 'help-bubble')}
            </div>
            <div class="grass-front"></div>
        </section>`;
    }

    // Caminos a cada castillo (mismas coordenadas para dibujarlos y para las carretitas)
    const ROADS = [
        'M 30 810 C 120 760 180 650 262 566',
        'M 420 810 C 520 720 640 600 697 505',
        'M 840 810 C 980 720 1110 560 1190 408'
    ];
    function castlesScene() {
        const [c1, c2, c3] = window.CASTLES;
        const mini = (k, road, delay, gold) => `<div class="mini-cart ${gold ? 'gold' : ''}" style="offset-path:path('${road}');--delay:${delay}s">
            ${svgBox(90, 70, `<rect x="6" y="34" width="78" height="22" rx="5" fill="${gold ? '#FFCF4D' : '#B0703F'}" ${st(3.5)}/><circle cx="24" cy="58" r="9" fill="#C9A27A" ${st(3)}/><circle cx="66" cy="58" r="9" fill="#C9A27A" ${st(3)}/><path d="M22 34 Q20 6 45 4 Q70 6 68 34 Z" fill="rgba(255,255,255,.35)" ${st(3.5)}/><path d="M36 34 L36 10 M45 34 L45 5 M54 34 L54 10" ${st(2.5)} fill="none"/><circle cx="45" cy="24" r="7" fill="${gold ? '#FFCF4D' : '#F2667A'}" ${st(2)}/>`)}
        </div>`;
        return `
        <section class="sc sc-castles">
            <div class="hill night c-hill" style="left:30px;top:560px;width:460px;height:380px"></div>
            <div class="hill night c-hill" style="left:415px;top:500px;width:560px;height:440px"></div>
            <div class="hill night c-hill" style="left:870px;top:420px;width:640px;height:520px"></div>
            ${svgBox(1440, 810, ROADS.map((d) => `<path d="${d}" stroke="${INK}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#C9A25F" stroke-width="26" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#E6CB93" stroke-width="3" stroke-dasharray="14 12" fill="none"/>`).join(''), 'roads')}
            <div class="c-glow g1" style="left:160px;top:380px"></div><div class="c-glow g2" style="left:560px;top:250px"></div><div class="c-glow g3" style="left:1000px;top:60px"></div>
            ${at(160, 380, A(c1.sprite, 200), 'castle k1')}
            ${at(560, 250, A(c2.sprite, 270), 'castle k2')}
            ${at(1000, 60, A(c3.sprite, 380), 'castle k3')}
            ${mini(0, ROADS[0], 0.3)}${mini(1, ROADS[1], 1.3)}${mini(2, ROADS[0], 2.4)}${mini(3, ROADS[1], 3.2)}${mini(4, ROADS[2], 1.9, true)}${mini(5, ROADS[2], 4.2)}
            ${at(180, 690, `<div class="c-label"><b>1</b> ${c1.name}</div>`, 'label-wrap', '--i:0')}
            ${at(560, 646, `<div class="c-label"><b>2</b> ${c2.name}</div>`, 'label-wrap', '--i:1')}
            ${at(1060, 600, `<div class="c-label big"><b>3</b> ${c3.name}</div>`, 'label-wrap', '--i:2')}
            ${[[1080, 170], [1300, 120], [1350, 260]].map(([x, y], i) => at(x, y, A('murcielago', 60), 'bat', `--i:${i}`)).join('')}
        </section>`;
    }

    function towerScene() {
        return `
        <section class="sc sc-tower">
            <div class="rain"></div>
            <div class="tower-wrap">
                ${at(520, -10, towerSvg())}
                ${at(652, 318, `<div class="king-window">${A('rey_fruta', 136, { mood: 'hurt' })}<i class="tear"></i></div>`)}
                ${at(520, -10, towerBars())}
                ${at(420, 620, A('caballero_cuchillas', 170), 'guard')}${at(870, 620, A('guardia_hielo', 170), 'guard', '--i:1')}
                ${at(830, 250, bubble('¡Auxilio!', 'big'), 'sos')}
            </div>
            ${[0, 1, 2].map((i) => `<div class="bat-fly" style="--i:${i}">${A('murcielago', 80)}</div>`).join('')}
            <div class="fog"></div>
        </section>`;
    }

    function heroScene(c) {
        const [c1, c2, c3] = window.CASTLES;
        return `
        <section class="sc sc-hero">
            <div class="rising-sun"><i></i><b></b></div>
            ${at(1060, 400, A(c1.sprite, 90), 'silhouette')}${at(1150, 360, A(c2.sprite, 120), 'silhouette')}${at(1260, 290, A(c3.sprite, 170), 'silhouette')}
            <div class="hill dawn" style="left:-500px;top:560px;width:2440px;height:420px"></div>
            <div class="hero-halo"></div>
            ${at(575, 310, `<span class="ca hero-big" style="width:290px;height:290px">${fruitArt(c.hero.id, {})}</span>`, 'hero')}
            ${[[520, 380], [900, 420], [470, 520], [960, 300]].map(([x, y], i) => at(x, y, svgBox(40, 40, sparkle(20, 20, 2)), 'hero-spark', `--i:${i}`)).join('')}
            ${[0, 1, 2, 3].map((i) => `<i class="wind" style="--i:${i}"></i>`).join('')}
            ${at(930, 500, A('profe_limon', 160), 'limon')}
            ${at(1040, 440, bubble('¡Tú puedes!'), 'limon-bubble')}
            <div class="hero-title">${logoHtml('¡Al rescate!', 'cine-logo')}</div>
        </section>`;
    }

    function typewriter(text) {
        let k = 0;
        return text.split(' ').map((w) => `<span class="w">${[...w].map((ch) => `<span class="ch" style="--k:${k++}">${esc(ch)}</span>`).join('')}</span>`).join(' ');
    }

    // ---------- control ----------
    function root() { return document.getElementById('cine'); }
    function goScene(i) {
        clear();
        const n = SCENES.length;
        i = Math.max(0, Math.min(n - 1, i));
        GAME.story.i = i;
        GAME.story.t0 = performance.now();
        const el = root();
        if (!el) return;
        el.className = el.className.replace(/scene-\d+/, `scene-${i}`);
        const cap = document.getElementById('cine-text');
        if (cap) { cap.innerHTML = typewriter(SCENES[i].text(cast().hero.name)); restartClass(cap.parentNode, 'show'); }
        el.querySelectorAll('.cine-dots i').forEach((d, k) => d.classList.toggle('on', k <= i));
        const s = SCENES[i];
        if (window.Sfx && Sfx[s.sfx]) Sfx[s.sfx](i === 1 ? true : undefined);
        if (i === 1 && window.Sfx) { later(() => Sfx.hit(), 350); later(() => Sfx.hit(), 1650); }
        if (s.dur) later(() => goScene(i + 1), s.dur);
    }
    function finish() {
        clear();
        const replay = GAME.story && GAME.story.replay;
        GAME.story = null;
        if (replay) showMainMenu(); else showActIntro();
    }

    window.startStory = function (opts) {
        clear();
        GAME.story = { i: 0, replay: !!(opts && opts.replay), t0: performance.now() };
        GAME.screen = 'story';
        render();
        goScene(0);
    };
    window.replayStory = function () { window.startStory({ replay: true }); };
    window.skipStory = function () { if (GAME.screen === 'story') finish(); };
    window.storyNext = function () {
        if (GAME.screen !== 'story' || !GAME.story) return;
        if (performance.now() - (GAME.story.t0 || 0) < 350) return; // evita saltarse dos escenas con un doble clic
        if (GAME.story.i >= SCENES.length - 1) { finish(); return; }
        goScene(GAME.story.i + 1);
    };
    window.storyGo = function (i) { if (GAME.screen === 'story' && GAME.story) goScene(i); };
    window.cineClick = function (e) {
        if (e.target.closest('button, .cine-dots')) return;
        if (GAME.story && GAME.story.i < SCENES.length - 1) storyNext();
    };
    document.addEventListener('keydown', (e) => {
        if (GAME.screen !== 'story') return;
        if (e.key === 'Escape') { e.preventDefault(); skipStory(); }
        else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); storyNext(); }
        else if (e.key === 'ArrowLeft' && GAME.story && GAME.story.i > 0) { e.preventDefault(); goScene(GAME.story.i - 1); }
    });

    window.renderStory = function () {
        if (!GAME.story) GAME.story = { i: 0, replay: false, t0: performance.now() };
        const c = cast();
        const i = GAME.story.i;
        return `
        <div id="cine" class="cine scene-${i}" onclick="cineClick(event)">
            <div class="sky day"></div><div class="sky dusk"></div><div class="sky night"></div><div class="sky dawn"></div>
            <div class="cine-stars">${stars()}</div>
            <div class="cine-sun"><i></i><b></b></div><div class="cine-moon"></div>
            <div class="cine-clouds"><span class="cloud k1"></span><span class="cloud k2"></span><span class="cloud k3"></span><span class="cloud dark k4"></span><span class="cloud dark k5"></span></div>
            <div class="cine-ground-fill"></div>
            <div class="cine-stage">
                ${villageScene(c)}${convoyScene(c)}${castlesScene()}${towerScene()}${heroScene(c)}
            </div>
            <div class="cine-flash"></div>
            <div class="cine-vignette"></div>
            <div class="cine-caption show"><p id="cine-text" class="hand">${typewriter(SCENES[i].text(c.hero.name))}</p>
                <div class="cine-dots">${SCENES.map((s, k) => `<i class="${k <= i ? 'on' : ''}" onclick="storyGo(${k})"></i>`).join('')}</div></div>
            <div class="cine-controls">
                <button class="secondary cine-skip" onclick="skipStory()">Saltar historia »</button>
                <button class="btn-banana cine-next" onclick="storyNext()">Siguiente ›</button>
            </div>
            <button class="btn-mint cine-go" onclick="skipStory()">${GAME.story.replay ? 'Volver al menú' : '¡Comenzar la aventura!'}</button>
        </div>`;
    };
})();
