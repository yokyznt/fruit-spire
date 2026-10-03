// ============================================================
// SPRITES6.JS — Enemigos de los pisos nuevos (Gallinero, Estanque,
// Invernadero, Bodega, Sala de Dados, Salón de Póker, Torre de Ajedrez,
// Torre del Rey) y sus jefes. Mismo estilo "libro de stickers" que el
// resto: contorno café, colores pastel, brillos y caritas.
// También exporta ayudantes (piezas de ajedrez, caras de dado, palos de
// cartas) que usan los minijuegos: window.SPRITE_KIT2.
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, sparkle, face, fangMouth } = window.SPRITE_KIT;
    const hurtOr = (o, m) => (o && o.mood === 'hurt' ? 'hurt' : m || 'angry');
    const isHurt = (o) => !!(o && o.mood === 'hurt');
    const legs = (d, w) => `<path d="${d}" ${st(w || 3)} fill="none"/>`;
    // trazo de dos tonos: contorno oscuro + color encima (patas, tallos, cuerdas)
    const tube = (d, color, w) => `<path d="${d}" stroke="${INK}" stroke-width="${(w || 5) + 3.5}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${color}" stroke-width="${w || 5}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    // solo ojos (para pájaros y bichos con pico)
    const eyesOnly = (x, y, mood, s) => {
        const hurt = mood === 'hurt';
        const eye = (ex) => (hurt ? `<path d="M${ex - 3} -3.5 L${ex + 3} 0 L${ex - 3} 3.5" ${st(2.6)} fill="none"/>`
            : `<ellipse cx="${ex}" cy="0" rx="3.4" ry="4.3" fill="${INK}"/><circle cx="${ex + 1.1}" cy="-1.6" r="1.3" fill="#fff"/>`);
        const brows = mood === 'angry' ? `<path d="M-14 -8 L-5 -4.5" ${st(2.6)} fill="none"/><path d="M14 -8 L5 -4.5" ${st(2.6)} fill="none"/>` : '';
        return `<g transform="translate(${x} ${y}) scale(${s || 1})"><g class="eyes">${eye(-9)}${eye(9)}</g>${brows}</g>`;
    };
    // ojo grande blanco con pupila (o cerrado si le duele)
    const eyeball = (x, y, r, hurt, look) => (hurt
        ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${st(2.5)}/><path d="M${x - r * 0.55} ${y} L${x + r * 0.55} ${y}" ${st(2.5)} fill="none"/>`
        : `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${st(2.5)}/><circle class="eyes" cx="${x + (look || 0) * r * 0.3}" cy="${y + r * 0.1}" r="${r * 0.48}" fill="${INK}"/><circle cx="${x + (look || 0) * r * 0.3 + r * 0.2}" cy="${y - r * 0.15}" r="${r * 0.16}" fill="#fff"/>`);
    const spikes = (cx, cy, r, n, color, inner) => {
        let d = '';
        for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
            const rr = i % 2 ? r * (inner || 0.8) : r;
            d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        return `<path d="${d}Z" fill="${color}" ${st(3)}/>`;
    };
    const crown = (cx, y, w, color) => {
        const h = w * 0.55, x0 = cx - w / 2;
        return `<path d="M${x0} ${y} L${x0} ${y - h} L${x0 + w * 0.25} ${y - h * 0.45} L${cx} ${y - h * 1.1} L${x0 + w * 0.75} ${y - h * 0.45} L${x0 + w} ${y - h} L${x0 + w} ${y} Z" fill="${color || '#FFCF4D'}" ${st(2.8)}/>
            <circle cx="${cx}" cy="${y - h * 0.35}" r="${w * 0.07}" fill="#F2667A" ${st(1.4)}/>`;
    };

    // ---------- palos de las cartas (centrados en 0,0, ~28 de alto) ----------
    const SUIT_PATH = {
        heart: 'M0 11 C-16 0 -14 -13 -6 -13 C-2 -13 0 -10 0 -7 C0 -10 2 -13 6 -13 C14 -13 16 0 0 11 Z',
        spade: 'M0 -14 C-15 -2 -15 8 -6 8 C-3 8 -1 6 0 4 C1 6 3 8 6 8 C15 8 15 -2 0 -14 Z M0 3 L-5 14 L5 14 Z',
        diamond: 'M0 -14 L11 0 L0 14 L-11 0 Z',
        club: 'M0 -13 a6.5 6.5 0 1 1 -0.01 0 Z M-7 -2 a6.5 6.5 0 1 1 -0.01 0 Z M7 -2 a6.5 6.5 0 1 1 -0.01 0 Z M0 2 L-5 14 L5 14 Z'
    };
    const suit = (kind, x, y, s, color) => `<path transform="translate(${x} ${y}) scale(${s || 1})" d="${SUIT_PATH[kind]}" fill="${color || (kind === 'heart' || kind === 'diamond' ? '#E0455E' : '#4F4A66')}" ${st(2.2)}/>`;
    const cardShape = (x, y, w, h, rot, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill || '#FFFDF7'}" ${st()} transform="rotate(${rot || 0} ${x + w / 2} ${y + h / 2})"/>`;
    const letterA = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s || 1})" d="M-4 6 L0 -6 L4 6 M-2.4 2 L2.4 2" ${st(2)} fill="none"/>`;

    // ---------- dados ----------
    const PIPS = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
    };
    const pips = (v, cx, cy, spread, r, color) => (PIPS[v] || []).map(([a, b]) => `<circle cx="${cx + a * spread}" cy="${cy + b * spread}" r="${r}" fill="${color || INK}"/>`).join('');
    // cara de dado completa (para el minijuego): viewBox propio 100x100
    const dieSvg = (v, color, pip) => svg(`
        <rect x="10" y="10" width="80" height="80" rx="18" fill="${color || '#FFFDF7'}" ${st(4)}/>
        <path d="M22 80 L78 80" stroke="#000" stroke-opacity=".08" stroke-width="8" stroke-linecap="round"/>
        ${pips(v, 50, 50, 22, 8.5, pip || INK)}${shine(24, 24, 3.5, 7)}`);

    // ---------- piezas de ajedrez (base abajo, 100x100) ----------
    // color: relleno; withFace: carita; mood
    function chessPiece(type, color, mood, withFace) {
        const base = `<path d="M22 94 L78 94 L74 83 L26 83 Z" fill="${color}" ${st()}/><rect x="29" y="74" width="42" height="11" rx="4" fill="${color}" ${st(3)}/>`;
        const f = (y, s) => (withFace === false ? '' : face(50, y, mood, s));
        let body = '';
        if (type === 'P') {
            body = `<path d="M34 76 Q36 58 44 52 Q33 46 35 34 Q39 20 50 20 Q61 20 65 34 Q67 46 56 52 Q64 58 66 76 Z" fill="${color}" ${st()}/>
                <rect x="36" y="50" width="28" height="7" rx="3" fill="${color}" ${st(2.5)}/>${shine(41, 32, 3, 6)}${f(38, 0.55)}`;
        } else if (type === 'R') {
            body = `<path d="M30 76 L33 34 L67 34 L70 76 Z" fill="${color}" ${st()}/>
                <path d="M26 36 L26 16 L36 16 L36 24 L45 24 L45 16 L55 16 L55 24 L64 24 L64 16 L74 16 L74 36 Z" fill="${color}" ${st()}/>
                <path d="M36 46 L64 46" ${st(2)} opacity=".35" fill="none"/>${shine(38, 44, 3, 8)}${f(56, 0.62)}`;
        } else if (type === 'N') {
            body = `<path d="M30 76 Q28 58 38 48 Q30 46 24 50 Q16 44 22 34 Q32 16 50 12 L54 4 L60 14 Q76 22 74 48 Q72 64 70 76 Z" fill="${color}" ${st()}/>
                <path d="M56 16 Q66 30 64 48" ${st(2.5)} fill="none" opacity=".45"/>
                <path d="M60 14 Q72 20 76 34 Q70 30 66 32 Q72 40 70 48" fill="none" ${st(2.5)}/>
                ${withFace === false ? `<circle cx="42" cy="28" r="3" fill="${INK}"/>` : eyesOnly(42, 30, mood, 0.55)}
                <circle cx="27" cy="42" r="2" fill="${INK}"/>${shine(46, 22, 2.5, 5)}`;
        } else if (type === 'B') {
            body = `<path d="M34 76 Q34 60 44 54 L56 54 Q66 60 66 76 Z" fill="${color}" ${st()}/>
                <path d="M50 12 Q70 26 68 44 Q64 56 50 56 Q36 56 32 44 Q30 26 50 12 Z" fill="${color}" ${st()}/>
                <circle cx="50" cy="9" r="5" fill="${color}" ${st(2.5)}/>
                <path d="M56 24 L46 36" ${st(3.5)} fill="none"/>${shine(40, 30, 3, 7)}${f(44, 0.5)}`;
        } else if (type === 'Q') {
            body = `<path d="M32 76 Q34 56 40 46 L60 46 Q66 56 68 76 Z" fill="${color}" ${st()}/>
                <path d="M26 46 L22 18 L36 32 L42 12 L50 30 L58 12 L64 32 L78 18 L74 46 Z" fill="${color}" ${st()}/>
                ${[22, 42, 58, 78].map((x, i) => `<circle cx="${x}" cy="${[18, 12, 12, 18][i]}" r="4.5" fill="#FFCF4D" ${st(2)}/>`).join('')}
                ${shine(38, 58, 3, 7)}${f(58, 0.55)}`;
        } else {
            body = `<path d="M32 76 Q34 56 40 46 L60 46 Q66 56 68 76 Z" fill="${color}" ${st()}/>
                <path d="M28 46 Q24 26 38 24 Q44 22 50 28 Q56 22 62 24 Q76 26 72 46 Z" fill="${color}" ${st()}/>
                <path d="M50 26 L50 4 M42 11 L58 11" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
                <path d="M50 26 L50 4 M42 11 L58 11" stroke="#FFCF4D" stroke-width="4.5" stroke-linecap="round"/>
                ${shine(38, 58, 3, 7)}${f(58, 0.55)}`;
        }
        return base + body;
    }
    window.SPRITE_KIT2 = { tube, eyesOnly, eyeball, spikes, crown, suit, cardShape, pips, dieSvg, chessPiece, hurtOr, isHurt };

    // =========================================================
    // CASTILLO 1 — GALLINERO
    // =========================================================
    S.gallina_clueca = (o) => svg(`
        ${tube('M40 82 L38 95 M33 95 L43 95 M60 82 L62 95 M57 95 L67 95', '#FFA64D', 3.5)}
        <path d="M22 60 Q6 50 12 36 Q20 44 26 44 Q20 30 32 30 Q34 42 36 50 Z" fill="#FFF6E9" ${st(3)}/>
        <ellipse cx="50" cy="62" rx="32" ry="25" fill="#FFF6E9" ${st()}/>
        <path d="M30 60 Q46 82 66 62 Q56 68 46 66 Q38 64 30 60 Z" fill="#EFE3CC" ${st(2.5)}/>
        <circle cx="66" cy="34" r="18" fill="#FFF6E9" ${st()}/>
        <path d="M56 19 Q56 7 63 13 Q66 4 71 12 Q78 8 77 19" fill="#F2667A" ${st(2.5)}/>
        <path d="M82 32 L94 37 L82 42 Z" fill="#FFA64D" ${st(2.5)}/>
        <path d="M80 45 Q84 53 78 55 Q73 51 77 45" fill="#F2667A" ${st(2)}/>
        ${eyesOnly(68, 34, hurtOr(o), 0.55)}
        <ellipse cx="72" cy="42" rx="3.5" ry="2" fill="#FF8FA3" opacity=".7"/>
        ${shine(32, 52, 4, 8)}`);

    S.pollito_furioso = (o) => svg(`
        ${tube('M40 84 L38 95 M34 95 L42 95 M60 84 L62 95 M58 95 L66 95', '#FFA64D', 3)}
        <path d="M20 60 Q6 56 10 44 Q18 46 24 54 Z" fill="#FFD24D" ${st(2.5)}/>
        <path d="M80 60 Q94 56 90 44 Q82 46 76 54 Z" fill="#FFD24D" ${st(2.5)}/>
        <circle cx="50" cy="56" r="32" fill="#FFE27A" ${st()}/>
        <path d="M42 26 Q42 12 49 18 Q53 8 56 18 Q62 14 60 26" fill="#FFE27A" ${st(2.5)}/>
        <path d="M43 60 L57 60 L50 69 Z" fill="#FFA64D" ${st(2.5)}/>
        ${eyesOnly(50, 48, hurtOr(o), 0.8)}
        <ellipse cx="33" cy="58" rx="4.5" ry="2.8" fill="#FF8FA3" opacity=".7"/><ellipse cx="67" cy="58" rx="4.5" ry="2.8" fill="#FF8FA3" opacity=".7"/>
        ${shine(34, 42, 4, 8)}`);

    S.zorro_astuto = (o) => svg(`
        <path d="M24 88 Q0 76 10 52 Q18 68 36 74 Z" fill="#FF9E5A" ${st()}/>
        <path d="M10 52 Q6 62 12 70 Q18 64 14 56 Z" fill="#FFF6E9"/>
        <ellipse cx="56" cy="76" rx="26" ry="18" fill="#FF9E5A" ${st()}/>
        <path d="M46 66 Q56 88 66 66 Z" fill="#FFF6E9" ${st(2)}/>
        <path d="M30 32 L26 6 L48 22 Z" fill="#FF9E5A" ${st(3)}/><path d="M32 26 L30 13 L41 21 Z" fill="#4A3428"/>
        <path d="M82 32 L86 6 L64 22 Z" fill="#FF9E5A" ${st(3)}/><path d="M80 26 L82 13 L71 21 Z" fill="#4A3428"/>
        <path d="M24 42 Q28 16 56 20 Q84 16 88 42 Q80 62 56 64 Q32 62 24 42 Z" fill="#FF9E5A" ${st()}/>
        <path d="M34 46 Q56 72 78 46 Q68 54 56 54 Q44 54 34 46 Z" fill="#FFF6E9" ${st(2.5)}/>
        <ellipse cx="56" cy="52" rx="4.5" ry="3.2" fill="${INK}"/>
        ${eyesOnly(56, 38, hurtOr(o), 0.72)}
        ${isHurt(o) ? '' : `<path d="M50 58 Q56 62 64 56" ${st(2.3)} fill="none"/>`}
        <path d="M80 88 Q72 78 82 76 Q94 78 90 88 Q94 98 84 98 Q74 98 80 88 Z" fill="#C9A27A" ${st(2.5)}/>
        <circle cx="85" cy="89" r="4" fill="#FFCF4D" ${st(1.5)}/>`);

    S.gallo_vigia = (o) => svg(`
        <path d="M30 56 Q4 44 10 10 Q22 30 36 46 Z" fill="#3E7A5A" ${st(3)}/>
        <path d="M30 60 Q6 60 2 34 Q20 46 36 54 Z" fill="#5A6FB0" ${st(3)}/>
        <path d="M32 64 Q16 76 4 66 Q20 62 36 62 Z" fill="#E0703A" ${st(3)}/>
        ${tube('M46 84 L44 96 M40 96 L50 96 M64 84 L66 96 M62 96 L72 96', '#FFA64D', 3.5)}
        <ellipse cx="54" cy="64" rx="27" ry="23" fill="#C8584A" ${st()}/>
        <path d="M62 44 Q84 58 72 86 Q58 76 56 58 Z" fill="#E89A5A" ${st(2.5)}/>
        <path d="M34 62 Q48 80 62 64" fill="#A8443A" ${st(2.5)}/>
        <circle cx="68" cy="30" r="16" fill="#E0703A" ${st()}/>
        <path d="M54 20 Q50 4 60 10 Q62 -1 69 8 Q76 0 78 11 Q88 8 82 21" fill="#F2667A" ${st(2.5)}/>
        <path d="M82 27 L96 32 L82 37 Z" fill="#FFCF4D" ${st(2.5)}/>
        <path d="M80 39 Q86 49 78 51 Q73 46 77 40" fill="#F2667A" ${st(2)}/>
        ${eyesOnly(69, 30, hurtOr(o), 0.5)}${shine(40, 56, 3.5, 7)}`);

    S.espantapajaros = (o) => svg(`
        <rect x="46" y="62" width="8" height="36" fill="#8C6A3F" ${st(3)}/>
        <rect x="4" y="48" width="92" height="9" rx="4" fill="#8C6A3F" ${st(3)}/>
        <path d="M10 52 L1 44 M10 52 L0 54 M10 53 L2 63 M90 52 L99 44 M90 52 L100 54 M90 53 L98 63" stroke="#E0A92E" stroke-width="4" stroke-linecap="round"/>
        <path d="M24 46 L76 46 L72 86 L28 86 Z" fill="#5A6FB0" ${st()}/>
        <rect x="54" y="60" width="13" height="11" fill="#F2667A" ${st(2)}/>
        <path d="M55 62 L66 62 M55 69 L66 69" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 2"/>
        <path d="M30 86 L28 94 M40 86 L40 96 M60 86 L60 96 M70 86 L72 94" stroke="#E0A92E" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M38 50 L50 58 L62 50" fill="#E0A92E" ${st(2)}/>
        <circle cx="50" cy="32" r="19" fill="#E8C49A" ${st()}/>
        <path d="M34 26 Q50 20 66 26" stroke="#C9A27A" stroke-width="2" fill="none"/>
        ${isHurt(o) ? face(50, 34, 'hurt', 0.7) : `
        <path d="M37 28 L46 31 L39 36 Z" fill="#FFA64D" ${st(2)}/><path d="M63 28 L54 31 L61 36 Z" fill="#FFA64D" ${st(2)}/>
        <path d="M38 42 L42 39 L46 42 L50 39 L54 42 L58 39 L62 42" ${st(2.3)} fill="none"/>`}
        <ellipse cx="50" cy="16" rx="34" ry="5" fill="#B0703F" ${st(3)}/>
        <path d="M30 16 Q34 -2 50 -2 Q66 -2 70 16 Z" fill="#B0703F" ${st()}/>
        <rect x="31" y="9" width="38" height="5" fill="#F2667A" ${st(1.8)}/>`);

    // =========================================================
    // CASTILLO 1 — ESTANQUE
    // =========================================================
    S.rana_toxica = (o) => svg(`
        <path d="M14 88 Q4 90 6 82 Q14 80 20 84 M86 88 Q96 90 94 82 Q86 80 80 84" fill="#8C6CC8" ${st(2.5)}/>
        <ellipse cx="50" cy="66" rx="36" ry="26" fill="#9B7FD4" ${st()}/>
        <ellipse cx="50" cy="76" rx="22" ry="12" fill="#D8CCF2"/>
        <circle cx="30" cy="40" r="14" fill="#9B7FD4" ${st()}/><circle cx="70" cy="40" r="14" fill="#9B7FD4" ${st()}/>
        ${eyeball(30, 40, 8.5, isHurt(o), 0.4)}${eyeball(70, 40, 8.5, isHurt(o), -0.4)}
        ${isHurt(o) ? '' : `<path d="M20 30 L38 34 M80 30 L62 34" ${st(2.6)} fill="none"/>`}
        <circle cx="22" cy="62" r="4" fill="#C8F07A" ${st(1.5)}/><circle cx="78" cy="58" r="5" fill="#C8F07A" ${st(1.5)}/><circle cx="64" cy="84" r="3" fill="#C8F07A" ${st(1.5)}/><circle cx="36" cy="80" r="3.5" fill="#C8F07A" ${st(1.5)}/>
        <path d="M30 62 Q50 ${isHurt(o) ? 60 : 76} 70 62" ${st(3)} fill="none"/>
        ${shine(26, 58, 3.5, 7)}`);

    S.mosquito_tigre = (o) => svg(`
        <ellipse cx="34" cy="26" rx="18" ry="9" fill="#D6ECF5" opacity=".9" ${st(2.5)} transform="rotate(-35 34 26)"/>
        <ellipse cx="54" cy="22" rx="18" ry="9" fill="#D6ECF5" opacity=".9" ${st(2.5)} transform="rotate(-10 54 22)"/>
        ${legs('M40 60 L30 84 L26 94 M50 62 L50 86 L46 96 M60 58 L70 82 L76 92', 2.5)}
        <ellipse cx="30" cy="54" rx="24" ry="13" fill="#FFF6E9" ${st()} transform="rotate(-18 30 54)"/>
        <path d="M16 48 L14 64 M26 44 L24 66 M36 42 L36 64" stroke="${INK}" stroke-width="5"/>
        <circle cx="64" cy="46" r="17" fill="#C9D3DC" ${st()}/>
        <path d="M79 52 L99 64" ${st(3.5)} fill="none"/>
        ${face(63, 46, hurtOr(o), 0.52, 'eyes')}${shine(56, 38, 2.5, 5)}`);

    S.pez_globo = (o) => svg(`
        <path d="M20 52 L2 38 L7 52 L2 66 Z" fill="#FFB347" ${st(3)}/>
        ${spikes(52, 52, 42, 16, '#FFE27A', 0.82)}
        <circle cx="52" cy="52" r="32" fill="#FFE27A" ${st()}/>
        <ellipse cx="56" cy="66" rx="22" ry="12" fill="#FFF6D2"/>
        <path d="M58 32 Q72 20 80 34 Z" fill="#FFB347" ${st(2.5)}/>
        <circle cx="30" cy="62" r="3" fill="#E0A92E"/><circle cx="74" cy="46" r="3" fill="#E0A92E"/><circle cx="44" cy="34" r="2.5" fill="#E0A92E"/>
        ${face(56, 50, hurtOr(o), 0.8)}${shine(38, 40, 4, 8)}`);

    S.cangrejo_pinza = (o) => svg(`
        ${legs('M24 64 L8 70 L4 80 M24 72 L12 82 L10 92 M76 64 L92 70 L96 80 M76 72 L88 82 L90 92', 3)}
        ${tube('M28 54 Q16 46 18 32 M72 54 Q84 46 82 32', '#E0584A', 5)}
        <path d="M18 32 Q2 26 8 10 Q14 20 24 16 Q28 28 18 32 Z" fill="#E0584A" ${st(3)}/>
        <path d="M82 32 Q98 26 92 10 Q86 20 76 16 Q72 28 82 32 Z" fill="#E0584A" ${st(3)}/>
        ${legs('M40 46 L38 32 M60 46 L62 32', 3)}
        ${eyeball(37, 28, 6.5, isHurt(o))}${eyeball(63, 28, 6.5, isHurt(o))}
        <ellipse cx="50" cy="64" rx="32" ry="22" fill="#E0584A" ${st()}/>
        <circle cx="34" cy="70" r="3" fill="#C8433A"/><circle cx="66" cy="72" r="3" fill="#C8433A"/><circle cx="50" cy="78" r="2.5" fill="#C8433A"/>
        <path d="M42 64 Q50 ${isHurt(o) ? 60 : 70} 58 64" ${st(2.6)} fill="none"/>
        ${isHurt(o) ? '' : `<path d="M34 54 L44 57 M66 54 L56 57" ${st(2.5)} fill="none"/>`}
        ${shine(30, 56, 3, 6)}`);

    S.sapo_gigante = (o) => svg(`
        <ellipse cx="50" cy="92" rx="46" ry="7" fill="#8FD0F0" ${st(3)}/>
        <path d="M10 90 Q2 92 4 84 Q12 82 18 86 M90 90 Q98 92 96 84 Q88 82 82 86" fill="#6E8F4A" ${st(2.5)}/>
        <ellipse cx="50" cy="66" rx="40" ry="28" fill="#7FA35A" ${st()}/>
        <ellipse cx="50" cy="78" rx="26" ry="12" fill="#D8E8B8"/>
        <circle cx="28" cy="38" r="15" fill="#7FA35A" ${st()}/><circle cx="72" cy="38" r="15" fill="#7FA35A" ${st()}/>
        ${eyeball(28, 38, 9, isHurt(o), 0.3)}${eyeball(72, 38, 9, isHurt(o), -0.3)}
        ${isHurt(o) ? '' : `<path d="M16 26 L36 32 M84 26 L64 32" ${st(2.8)} fill="none"/>`}
        ${[[20, 58, 4], [80, 60, 5], [40, 54, 3], [62, 52, 3.5], [28, 72, 3], [74, 74, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#5F8440" ${st(1.5)}/>`).join('')}
        <path d="M24 64 Q50 ${isHurt(o) ? 62 : 82} 76 64" ${st(3.2)} fill="${isHurt(o) ? 'none' : '#C8374F'}"/>
        <path d="M34 12 Q50 2 66 12 Q60 22 50 20 Q40 22 34 12 Z" fill="#9BD66A" ${st(2.5)}/><path d="M50 12 L50 20" ${st(2)} fill="none"/>
        ${shine(24, 58, 3.5, 7)}`);

    S.lucio_gigante = (o) => svg(`
        <path d="M0 90 Q12 84 24 90 T48 90 T72 90 T100 90 L100 100 L0 100 Z" fill="#8FD0F0" ${st(3)}/>
        <path d="M82 50 L100 32 L95 51 L100 70 Z" fill="#5C9A4A" ${st(3)}/>
        <path d="M46 30 Q58 10 74 30 Z" fill="#5C9A4A" ${st(3)}/>
        <path d="M4 52 Q18 26 50 26 Q80 26 88 50 Q80 76 50 76 Q18 76 4 52 Z" fill="#7BAE4A" ${st()}/>
        <path d="M14 60 Q40 76 80 60 Q60 72 40 72 Q24 70 14 60 Z" fill="#E4F4D6"/>
        <path d="M40 30 Q36 50 42 70 M54 28 Q50 50 56 74 M68 30 Q64 50 70 70" stroke="#4E8F3A" stroke-width="3" fill="none" opacity=".55"/>
        <path d="M4 52 L28 46 L26 60 Z" fill="#8C2B3D" ${st(2.5)}/>
        <path d="M8 51 L11 47 L14 50 L17 46 L20 49 L23 46 M8 54 L11 57 L14 54 L17 58 L20 55 L23 58" stroke="#fff" stroke-width="2.2" fill="none"/>
        ${eyeball(32, 40, 7, isHurt(o), -0.4)}
        ${isHurt(o) ? '' : `<path d="M24 30 L40 34" ${st(2.8)} fill="none"/>`}
        <path d="M52 50 Q58 58 52 64" ${st(2.5)} fill="none"/>
        ${shine(52, 36, 3, 7, -60)}${sparkle(90, 84, 0.6, '#fff')}`);

    // =========================================================
    // CASTILLO 1 — INVERNADERO
    // =========================================================
    S.planta_carnivora = (o) => svg(`
        ${tube('M50 74 Q40 62 50 50', '#5C9A4A', 5)}
        ${leaf(46, 66, 200, 1)}${leaf(52, 60, -20, 0.9)}
        <path d="M30 80 L70 80 L66 97 L34 97 Z" fill="#C8704A" ${st()}/>
        <rect x="26" y="73" width="48" height="10" rx="3" fill="#D98A5E" ${st(3)}/>
        <path d="M14 40 Q14 10 50 8 Q86 10 86 40 Z" fill="#7BBF5A" ${st()}/>
        <path d="M16 44 Q50 36 84 44 Q84 64 50 64 Q16 64 16 44 Z" fill="#7BBF5A" ${st()}/>
        <path d="M18 41 Q50 32 82 41 Q50 50 18 41 Z" fill="#C8374F" ${st(2)}/>
        ${[24, 34, 44, 56, 66, 76].map((x) => `<path d="M${x - 3} 39 L${x} 45 L${x + 3} 39 Z" fill="#fff" ${st(1.4)}/>`).join('')}
        <circle cx="30" cy="22" r="3" fill="#F2667A"/><circle cx="70" cy="20" r="3.5" fill="#F2667A"/><circle cx="50" cy="56" r="2.5" fill="#5C9A4A"/>
        ${eyesOnly(50, 24, hurtOr(o), 0.72)}${shine(28, 30, 3, 5, -60)}`);

    S.enredadera = (o) => svg(`
        ${tube('M50 98 Q18 88 28 68 Q40 50 64 60 Q86 70 72 86', '#5C9A4A', 9)}
        ${[[24, 78], [44, 56], [80, 72], [60, 90]].map(([x, y]) => `<path d="M${x} ${y} l-5 -6 l8 1 z" fill="#FFF6E9" ${st(1.6)}/>`).join('')}
        ${leaf(22, 70, 150, 1)}${leaf(70, 60, -30, 0.9)}${leaf(76, 86, 20, 0.8)}
        <path d="M50 12 Q82 18 78 44 Q72 62 50 62 Q28 62 22 44 Q18 18 50 12 Z" fill="#9BD66A" ${st()}/>
        <path d="M50 14 L50 30" ${st(2)} opacity=".4" fill="none"/>
        ${face(50, 42, hurtOr(o), 0.75)}${shine(34, 28, 3.5, 7)}`);

    S.polen_furioso = (o) => {
        let fluff = '';
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            fluff += `<circle cx="${(50 + Math.cos(a) * 30).toFixed(1)}" cy="${(52 + Math.sin(a) * 30).toFixed(1)}" r="10" fill="#FFF6B8" ${st(2.2)}/>`;
        }
        return svg(`${fluff}
            <circle cx="50" cy="52" r="27" fill="#FFE27A" ${st()}/>
            <circle cx="14" cy="16" r="3" fill="#FFE27A" ${st(1.5)}/><circle cx="88" cy="20" r="2.5" fill="#FFE27A" ${st(1.5)}/><circle cx="86" cy="90" r="3" fill="#FFE27A" ${st(1.5)}/>
            ${face(50, 54, hurtOr(o), 0.8)}${shine(38, 42, 4, 7)}`);
    };

    S.girasol_soldado = (o) => {
        let petals = '';
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * 360;
            petals += `<ellipse cx="50" cy="12" rx="6" ry="12" fill="#FFCF4D" ${st(2.2)} transform="rotate(${a.toFixed(0)} 50 40)"/>`;
        }
        return svg(`
            ${tube('M50 64 L50 98', '#5C9A4A', 6)}
            ${leaf(50, 80, 200, 1.1)}
            ${tube('M50 74 Q66 70 76 60', '#5C9A4A', 4)}
            <path d="M84 8 L84 72" ${st(3)} fill="none"/><path d="M84 2 L90 14 L78 14 Z" fill="#C9D3DC" ${st(2.2)}/>
            ${petals}
            <circle cx="50" cy="40" r="21" fill="#8C5A2E" ${st()}/>
            ${[[40, 32], [60, 32], [36, 46], [64, 46], [50, 56], [44, 52], [56, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#6E4428"/>`).join('')}
            <path d="M31 30 Q50 10 69 30 Z" fill="#9AA5B1" ${st(2.8)}/>
            ${face(50, 42, hurtOr(o), 0.66)}`);
    };

    S.orquidea_letal = (o) => svg(`
        ${tube('M50 70 L50 98', '#5C9A4A', 5)}${leaf(50, 90, 200, 1.2)}${leaf(50, 86, -20, 1.1)}
        <ellipse cx="50" cy="22" rx="14" ry="22" fill="#E58CCB" ${st()}/>
        <ellipse cx="26" cy="40" rx="12" ry="22" fill="#E58CCB" ${st()} transform="rotate(-55 26 40)"/>
        <ellipse cx="74" cy="40" rx="12" ry="22" fill="#E58CCB" ${st()} transform="rotate(55 74 40)"/>
        <path d="M34 56 Q50 90 66 56 Q50 64 34 56 Z" fill="#9B3E7A" ${st()}/>
        <path d="M50 74 L50 88" ${st(3)} fill="none"/><path d="M47 86 L50 94 L53 86 Z" fill="#C9D3DC" ${st(1.6)}/>
        <circle cx="50" cy="46" r="15" fill="#FFE0F0" ${st()}/>
        ${face(50, 47, hurtOr(o), 0.52)}
        <circle cx="44" cy="20" r="2" fill="#9B3E7A"/><circle cx="56" cy="26" r="2" fill="#9B3E7A"/>${sparkle(88, 14, 0.6, '#FFB8C6')}`);

    S.rosa_reina = (o) => svg(`
        ${tube('M50 66 L50 98', '#4E8F3A', 6)}
        ${[[50, 76, -1], [50, 88, 1]].map(([x, y, d]) => `<path d="M${x + d * 4} ${y} l${d * 7} -3 l${-d * 2} 6 z" fill="#FFF6E9" ${st(1.6)}/>`).join('')}
        ${leaf(50, 80, 200, 1.2)}${leaf(50, 90, -20, 1)}
        <circle cx="50" cy="44" r="30" fill="#E0455E" ${st()}/>
        <path d="M24 36 Q50 20 76 36 M22 54 Q50 70 78 54" ${st(2.3)} fill="none" opacity=".5"/>
        <path d="M34 34 Q50 22 66 34 Q70 50 50 56 Q34 54 36 42 Q44 32 56 38" ${st(2.3)} fill="none"/>
        ${crown(50, 16, 30)}
        ${face(50, 50, hurtOr(o), 0.66)}${shine(32, 34, 4, 8)}${sparkle(86, 18, 0.7)}`);

    // =========================================================
    // CASTILLO 1 — BODEGA
    // =========================================================
    S.barril_rodante = (o) => svg(`
        <path d="M22 14 Q12 52 22 90 L78 90 Q88 52 78 14 Z" fill="#B0703F" ${st()}/>
        <path d="M38 14 Q33 52 38 90 M62 14 Q67 52 62 90" ${st(2)} fill="none" opacity=".35"/>
        ${tube('M17 30 Q50 38 83 30', '#9AA5B1', 6)}${tube('M17 74 Q50 82 83 74', '#9AA5B1', 6)}
        <ellipse cx="50" cy="14" rx="28" ry="6" fill="#C9804A" ${st(3)}/>
        ${face(50, 54, hurtOr(o), 0.85)}${shine(28, 50, 3.5, 12, 0)}`);

    S.murcielago = (o) => svg(`
        <path d="M40 46 Q22 18 2 26 Q10 38 6 54 Q16 48 22 58 Q28 50 38 60 Z" fill="#6E5A9E" ${st()}/>
        <path d="M60 46 Q78 18 98 26 Q90 38 94 54 Q84 48 78 58 Q72 50 62 60 Z" fill="#6E5A9E" ${st()}/>
        <path d="M38 36 L34 18 L46 30 Z M62 36 L66 18 L54 30 Z" fill="#8C78C0" ${st(2.5)}/>
        <ellipse cx="50" cy="54" rx="18" ry="22" fill="#8C78C0" ${st()}/>
        <ellipse cx="50" cy="64" rx="10" ry="9" fill="#B7A6E0"/>
        ${face(50, 49, hurtOr(o), 0.62, 'eyes')}${fangMouth(50, 56, 0.85)}`);

    S.arana_bodeguera = (o) => svg(`
        <path d="M50 0 L50 28" ${st(2)} fill="none"/>
        ${legs('M34 52 Q18 36 6 44 M32 60 Q14 56 4 66 M34 68 Q18 74 10 88 M40 74 Q32 86 30 96 M66 52 Q82 36 94 44 M68 60 Q86 56 96 66 M66 68 Q82 74 90 88 M60 74 Q68 86 70 96', 3.2)}
        <circle cx="50" cy="62" r="24" fill="#4F4A66" ${st()}/>
        <circle cx="50" cy="38" r="15" fill="#5F5A7A" ${st()}/>
        <path d="M44 70 L56 70 L50 78 Z M44 86 L56 86 L50 78 Z" fill="#E0455E" ${st(1.6)}/>
        ${eyeball(44, 36, 5, isHurt(o))}${eyeball(56, 36, 5, isHurt(o))}
        <circle cx="38" cy="30" r="2.5" fill="#fff"/><circle cx="62" cy="30" r="2.5" fill="#fff"/>
        ${isHurt(o) ? '' : `<path d="M38 28 L47 32 M62 28 L53 32" ${st(2.2)} fill="none"/>`}
        <path d="M46 46 L48 50 L50 46 L52 50 L54 46" ${st(1.8)} fill="#fff"/>
        ${shine(40, 54, 3, 7)}`);

    S.moho_viscoso = (o) => svg(`
        ${[[30, 20], [52, 10], [72, 20]].map(([x, y]) => `<path d="M${x} ${y + 16} L${x} ${y + 4}" ${st(2)} fill="none"/><circle cx="${x}" cy="${y + 2}" r="4.5" fill="#C9D9A0" ${st(2)}/>`).join('')}
        <path d="M10 88 Q4 62 20 50 Q18 30 40 30 Q52 18 66 30 Q88 30 86 52 Q98 66 90 88 Z" fill="#A9C27A" ${st()}/>
        <path d="M24 88 Q26 96 30 88 M60 88 Q62 98 66 88" fill="#A9C27A" ${st(2.2)}/>
        ${[[26, 66, 5], [74, 50, 6], [70, 76, 4], [40, 42, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8BA35E"/>`).join('')}
        ${face(50, 64, hurtOr(o), 0.82)}${shine(30, 50, 3.5, 7)}`);

    S.tonel_maldito = (o) => svg(`
        <path d="M18 20 Q8 56 18 92 L82 92 Q92 56 82 20 Z" fill="#7A4A5A" ${st()}/>
        <path d="M34 20 Q28 56 34 92 M66 20 Q72 56 66 92" ${st(2)} fill="none" opacity=".35"/>
        ${tube('M12 36 Q50 44 88 36', '#6E6A7A', 6)}${tube('M12 78 Q50 86 88 78', '#6E6A7A', 6)}
        <ellipse cx="50" cy="20" rx="32" ry="8" fill="#8C5A6A" ${st(3)}/>
        <path d="M26 18 Q30 6 38 16 Q44 4 52 16 Q60 6 66 18 Q72 10 76 18" fill="#9B3E7A" ${st(2.5)}/>
        <path d="M30 22 Q30 32 34 30 M62 24 Q62 34 66 30" fill="#9B3E7A" ${st(2)}/>
        <rect x="70" y="58" width="16" height="8" rx="2" fill="#C9A27A" ${st(2.5)}/>
        <path d="M84 66 Q86 74 82 76 Q78 74 80 66" fill="#9B3E7A" ${st(1.8)}/>
        ${isHurt(o) ? face(46, 58, 'hurt', 0.8) : `
        <ellipse cx="36" cy="54" rx="6" ry="5" fill="#FFE27A" ${st(2.2)}/><ellipse cx="56" cy="54" rx="6" ry="5" fill="#FFE27A" ${st(2.2)}/>
        <circle cx="36" cy="55" r="2.3" fill="${INK}"/><circle cx="56" cy="55" r="2.3" fill="${INK}"/>
        <path d="M28 44 L42 50 M64 44 L50 50" ${st(2.8)} fill="none"/>
        <path d="M34 68 Q46 62 58 68" ${st(3)} fill="none"/>`}`);

    S.sommelier_fantasma = (o) => svg(`
        <path d="M20 90 L20 44 Q20 12 50 12 Q80 12 80 44 L80 90 L70 82 L60 92 L50 82 L40 92 L30 82 Z" fill="#F1ECFF" ${st()}/>
        <path d="M26 50 Q18 60 12 56 Q14 48 22 44" fill="#F1ECFF" ${st(2.5)}/>
        <path d="M74 54 Q86 58 88 48" fill="none" ${st(2.5)}/>
        <path d="M84 22 Q84 38 90 40 Q96 38 96 22 Z" fill="#fff" ${st(2.5)}/><path d="M85 28 Q90 32 95 28 L95 24 L85 24 Z" fill="#C8374F"/>
        <path d="M90 40 L90 50 M84 50 L96 50" ${st(2.5)} fill="none"/>
        <path d="M38 64 L50 70 L62 64 L62 74 L50 68 L38 74 Z" fill="#C8374F" ${st(2)}/><circle cx="50" cy="69" r="3" fill="#9B2B3D"/>
        ${face(50, 40, hurtOr(o, 'eyes'), 0.8)}
        <path d="M40 50 Q34 48 32 52 Q38 52 44 50 Q50 54 56 50 Q62 52 68 52 Q66 48 60 50" fill="#6E4A3A" ${st(1.5)}/>
        ${shine(32, 28, 4, 9)}`);

    // =========================================================
    // CASTILLO 2 — SALA DE DADOS
    // =========================================================
    S.dado_pequeno = (o) => svg(`
        <rect x="16" y="24" width="68" height="68" rx="15" fill="#FFFDF7" ${st()}/>
        <path d="M22 84 L78 84" stroke="#000" stroke-opacity=".07" stroke-width="7" stroke-linecap="round"/>
        <circle cx="32" cy="38" r="5" fill="${INK}"/><circle cx="68" cy="38" r="5" fill="${INK}"/>
        ${face(50, 66, hurtOr(o), 0.8)}${shine(24, 34, 3, 6)}`);

    S.dado_travieso = (o) => svg(`
        <g transform="rotate(-12 50 56)">
            <rect x="16" y="22" width="68" height="68" rx="15" fill="#FFFDF7" ${st()}/>
            <circle cx="32" cy="37" r="4.5" fill="#E0455E"/><circle cx="50" cy="37" r="4.5" fill="#E0455E"/><circle cx="68" cy="37" r="4.5" fill="#E0455E"/>
            ${face(50, 64, isHurt(o) ? 'hurt' : 'wink', 0.8)}
            ${isHurt(o) ? '' : `<path d="M50 74 Q50 82 55 80 Q57 76 54 73" fill="#FF8FA3" ${st(1.8)}/>`}
        </g>${sparkle(86, 18, 0.8)}`);

    S.dado_cargado = (o) => svg(`
        <rect x="14" y="20" width="72" height="72" rx="16" fill="#C8374F" ${st()}/>
        <path d="M20 84 L80 84" stroke="#000" stroke-opacity=".12" stroke-width="7" stroke-linecap="round"/>
        <circle cx="28" cy="34" r="5" fill="#fff"/><circle cx="72" cy="40" r="5" fill="#fff"/><circle cx="28" cy="80" r="5" fill="#fff"/><circle cx="72" cy="80" r="5" fill="#fff"/>
        <rect x="58" y="8" width="30" height="18" rx="4" fill="#9AA5B1" ${st(2.5)}/><path d="M64 17 L82 17" ${st(2)} fill="none"/>
        <path d="M22 60 L36 52" stroke="#F6E3C8" stroke-width="7" stroke-linecap="round"/>
        ${face(52, 64, hurtOr(o), 0.8)}${shine(24, 32, 3, 6)}`);

    S.cubilete_saltarin = (o) => svg(`
        <rect x="30" y="4" width="22" height="22" rx="5" fill="#FFFDF7" ${st(2.5)} transform="rotate(-18 41 15)"/>
        <g transform="rotate(-18 41 15)">${pips(3, 41, 15, 6, 2)}</g>
        <rect x="54" y="10" width="20" height="20" rx="5" fill="#FFFDF7" ${st(2.5)} transform="rotate(14 64 20)"/>
        <g transform="rotate(14 64 20)">${pips(1, 64, 20, 0, 2.5, '#E0455E')}</g>
        <path d="M20 32 L80 32 L72 94 L28 94 Z" fill="#8C5A3A" ${st()}/>
        <ellipse cx="50" cy="32" rx="30" ry="7" fill="#6E4428" ${st(3)}/>
        ${tube('M24 46 Q50 52 76 46', '#FFCF4D', 3.5)}${tube('M27 82 Q50 88 73 82', '#FFCF4D', 3.5)}
        ${face(50, 64, hurtOr(o), 0.75)}${shine(30, 56, 3, 9, 0)}`);

    S.ficha_dorada = (o) => {
        let notches = '';
        for (let i = 0; i < 8; i++) notches += `<rect x="46" y="8" width="8" height="12" rx="2" fill="#fff" ${st(1.8)} transform="rotate(${i * 45} 50 50)"/>`;
        return svg(`
            <circle cx="50" cy="50" r="42" fill="#FFCF4D" ${st()}/>${notches}
            <circle cx="50" cy="50" r="28" fill="#FFE27A" ${st(3)}/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="#E0A92E" stroke-width="2" stroke-dasharray="4 4"/>
            ${face(50, 50, hurtOr(o), 0.72)}${shine(30, 30, 4, 8)}`);
    };

    S.gran_dado = (o) => svg(`
        <g transform="rotate(14 66 36)"><rect x="42" y="8" width="50" height="50" rx="12" fill="#FFFDF7" ${st()}/>${pips(6, 67, 33, 12, 3.8)}</g>
        <rect x="8" y="32" width="64" height="64" rx="15" fill="#FFFDF7" ${st()}/>
        <path d="M14 88 L66 88" stroke="#000" stroke-opacity=".07" stroke-width="7" stroke-linecap="round"/>
        <circle cx="22" cy="46" r="4.5" fill="#E0455E"/><circle cx="58" cy="46" r="4.5" fill="#E0455E"/>
        ${face(40, 70, hurtOr(o), 0.78)}${shine(18, 44, 3, 6)}${sparkle(90, 80, 0.7)}`);

    S.cubilete_maldito = (o) => svg(`
        <rect x="6" y="70" width="22" height="22" rx="5" fill="#FFFDF7" ${st(2.5)} transform="rotate(-20 17 81)"/>
        <g transform="rotate(-20 17 81)">${pips(5, 17, 81, 6, 2)}</g>
        <rect x="74" y="72" width="20" height="20" rx="5" fill="#FFFDF7" ${st(2.5)} transform="rotate(16 84 82)"/>
        <g transform="rotate(16 84 82)">${pips(2, 84, 82, 5, 2.2)}</g>
        <path d="M18 26 L82 26 L74 92 L26 92 Z" fill="#4F3A66" ${st()}/>
        <ellipse cx="50" cy="26" rx="32" ry="8" fill="#3A2A4E" ${st(3)}/>
        ${tube('M22 40 Q50 48 78 40', '#FFCF4D', 4)}${tube('M25 80 Q50 88 75 80', '#FFCF4D', 4)}
        ${crown(50, 20, 36)}
        ${isHurt(o) ? face(50, 60, 'hurt', 0.85) : `
        <ellipse cx="38" cy="58" rx="7" ry="5" fill="#FFE27A" ${st(2)}/><ellipse cx="62" cy="58" rx="7" ry="5" fill="#FFE27A" ${st(2)}/>
        <circle cx="38" cy="59" r="2.4" fill="${INK}"/><circle cx="62" cy="59" r="2.4" fill="${INK}"/>
        <path d="M28 48 L44 54 M72 48 L56 54" ${st(3)} fill="none"/>
        <path d="M38 70 L42 66 L46 70 L50 66 L54 70 L58 66 L62 70" ${st(2.4)} fill="#fff"/>`}`);

    // =========================================================
    // CASTILLO 2 — SALÓN DE PÓKER
    // =========================================================
    S.as_espadas = (o) => svg(`
        <path d="M78 10 L92 24 L60 70 L52 64 Z" fill="#E3E9F0" ${st(2.5)}/><rect x="44" y="62" width="14" height="8" rx="3" fill="#8C6A3F" ${st(2.2)} transform="rotate(38 51 66)"/>
        ${cardShape(14, 10, 60, 84, -6)}
        <g transform="rotate(-6 44 52)">
            ${letterA(22, 22, 1)}${suit('spade', 22, 34, 0.35)}
            ${suit('spade', 44, 44, 1.2)}
            ${face(44, 72, hurtOr(o), 0.65)}
        </g>`);

    S.joker = (o) => svg(`
        ${cardShape(18, 26, 64, 70, 4, '#FFFDF7')}
        <path d="M22 34 Q14 10 30 6 Q30 22 42 28 Q46 8 58 6 Q56 22 62 28 Q72 12 84 16 Q74 26 78 36 Z" fill="#9B7FD4" ${st(3)}/>
        <path d="M42 28 Q46 8 58 6 Q56 22 62 28 Z" fill="#F2667A" ${st(3)}/>
        <circle cx="30" cy="6" r="5" fill="#FFCF4D" ${st(2)}/><circle cx="58" cy="6" r="5" fill="#FFCF4D" ${st(2)}/><circle cx="84" cy="16" r="5" fill="#FFCF4D" ${st(2)}/>
        <path d="M22 36 L80 36" ${st(3)} fill="none"/>
        ${face(50, 58, isHurt(o) ? 'hurt' : 'wink', 0.95)}
        ${isHurt(o) ? '' : `<path d="M38 70 Q50 84 62 70" fill="#fff" ${st(2.4)}/>`}
        <circle cx="30" cy="86" r="3" fill="#F2667A"/><circle cx="70" cy="86" r="3" fill="#5CC9A7"/>`);

    S.rey_corazones = (o) => svg(`
        ${cardShape(16, 22, 68, 74, 0)}
        ${crown(50, 26, 40)}
        ${suit('heart', 50, 48, 1.1)}
        <path d="M34 62 Q36 90 50 92 Q64 90 66 62 Q58 70 50 68 Q42 70 34 62 Z" fill="#fff" ${st(2.5)}/>
        ${face(50, 64, hurtOr(o), 0.62)}
        ${suit('heart', 26, 86, 0.3)}${suit('heart', 74, 86, 0.3)}`);

    S.diamante_afilado = (o) => svg(`
        <path d="M50 6 L86 44 L50 96 L14 44 Z" fill="#F2667A" ${st()}/>
        <path d="M14 44 L86 44 M32 25 L42 44 L50 96 M68 25 L58 44 L50 96 M50 6 L42 44 M50 6 L58 44" ${st(2)} fill="none" opacity=".45"/>
        <path d="M50 10 L64 26 L50 30 Z" fill="#fff" opacity=".45"/>
        ${face(50, 56, hurtOr(o), 0.72)}${sparkle(86, 14, 0.8, '#fff')}${sparkle(12, 80, 0.6)}`);

    S.trebol_tramposo = (o) => svg(`
        ${cardShape(62, 44, 30, 44, 18)}${suit('heart', 77, 66, 0.45)}
        <path d="M30 12 L70 12 L66 24 L34 24 Z" fill="#4F4A66" ${st(2.5)}/><ellipse cx="50" cy="24" rx="26" ry="4.5" fill="#4F4A66" ${st(2.5)}/>
        <rect x="34" y="18" width="32" height="4" fill="#F2667A"/>
        <circle cx="50" cy="42" r="17" fill="#5F5A7A" ${st()}/>
        <circle cx="32" cy="60" r="17" fill="#5F5A7A" ${st()}/>
        <circle cx="68" cy="60" r="17" fill="#5F5A7A" ${st()}/>
        <circle cx="50" cy="56" r="14" fill="#5F5A7A"/>
        <path d="M44 70 L38 94 L62 94 L56 70 Z" fill="#5F5A7A" ${st()}/>
        <circle cx="42" cy="48" r="5.5" fill="#fff" ${st(1.8)}/><circle cx="58" cy="48" r="5.5" fill="#fff" ${st(1.8)}/>
        ${isHurt(o) ? `<path d="M39 48 L45 48 M55 48 L61 48" ${st(2.2)} fill="none"/>`
            : `<circle cx="44" cy="49" r="2.4" fill="${INK}"/><circle cx="60" cy="49" r="2.4" fill="${INK}"/><path d="M36 40 L46 43 M64 40 L54 43" ${st(2.3)} fill="none"/>`}
        <path d="M42 60 Q50 ${isHurt(o) ? 58 : 66} 60 58" ${st(2.5)} fill="none"/>`);

    S.flor_imperial = (o) => svg(`
        ${[-34, -17, 17, 34].map((r, i) => `${cardShape(34, 18, 32, 58, r)}<g transform="rotate(${r} 50 47)">${suit(['spade', 'heart', 'diamond', 'club'][i], 50, 36, 0.55)}</g>`).join('')}
        ${cardShape(30, 26, 40, 68, 0)}
        ${crown(50, 30, 28)}
        ${suit('heart', 50, 48, 0.75)}
        ${face(50, 72, hurtOr(o), 0.6)}${sparkle(90, 20, 0.8)}${sparkle(10, 24, 0.7, '#FFB8C6')}`);

    S.crupier_marcado = (o) => svg(`
        <path d="M18 98 Q20 66 50 64 Q80 66 82 98 Z" fill="#C8374F" ${st()}/>
        <path d="M40 66 L50 86 L60 66 Z" fill="#fff" ${st(2.2)}/>
        <path d="M42 70 L50 76 L58 70 L58 80 L50 74 L42 80 Z" fill="#4F4A66" ${st(1.6)}/>
        ${[-24, -8, 8].map((r) => cardShape(66, 52, 18, 26, r + 10)).join('')}
        <circle cx="50" cy="38" r="22" fill="#FFD2B0" ${st()}/>
        <path d="M24 26 Q50 10 76 26 L82 32 L18 32 Z" fill="#5CC9A7" ${st(2.8)}/>
        <path d="M22 32 Q50 40 78 32" fill="none" ${st(2.5)}/>
        ${face(50, 42, hurtOr(o, 'eyes'), 0.7)}
        <path d="M38 52 Q44 48 50 52 Q56 48 62 52 Q56 56 50 54 Q44 56 38 52 Z" fill="#6E4A3A" ${st(1.6)}/>`);

    // =========================================================
    // CASTILLO 2 — TORRE DE AJEDREZ (piezas negras, en morado)
    // =========================================================
    const DARK = '#7A68AE';
    S.peon_negro = (o) => svg(chessPiece('P', DARK, hurtOr(o)));
    S.caballo_negro = (o) => svg(chessPiece('N', DARK, hurtOr(o)));
    S.alfil_negro = (o) => svg(chessPiece('B', DARK, hurtOr(o)));
    S.torre_negra = (o) => svg(chessPiece('R', DARK, hurtOr(o)));
    S.reina_negra = (o) => svg(`${chessPiece('Q', '#8C5AAE', hurtOr(o))}${sparkle(88, 16, 0.7, '#FFB8C6')}`);
    S.rey_ajedrez = (o) => svg(`${chessPiece('K', '#5F4E8E', hurtOr(o))}${sparkle(12, 20, 0.7)}${sparkle(88, 30, 0.6)}`);
    S.gran_maestro = (o) => svg(`
        ${chessPiece('K', '#4F4A66', hurtOr(o), false)}
        ${face(50, 56, hurtOr(o), 0.55)}
        <circle cx="55" cy="55" r="6" fill="rgba(205,235,245,.35)" stroke="#FFCF4D" stroke-width="2"/>
        <path d="M60 58 Q66 66 62 74" stroke="#FFCF4D" stroke-width="1.5" fill="none"/>
        <path d="M36 64 Q38 90 50 96 Q62 90 64 64 Q56 70 50 68 Q44 70 36 64 Z" fill="#F4F0FF" ${st(2.5)}/>
        <path d="M44 72 L50 86 M56 72 L50 86" stroke="#D8D0EC" stroke-width="2" fill="none"/>
        <path d="M22 94 L78 94 L74 83 L26 83 Z" fill="#fff" ${st(2.5)}/>
        ${[30, 42, 54, 66].map((x) => `<rect x="${x}" y="84" width="6" height="5" fill="#4F4A66"/><rect x="${x + 6}" y="89" width="6" height="5" fill="#4F4A66"/>`).join('')}`);

    // ---------- jefes del Castillo del Azar ----------
    S.rey_azar = (o) => svg(`
        <path d="M80 50 L92 26" ${st(4)} fill="none"/><circle cx="92" cy="24" r="7" fill="#F2667A" ${st(2.5)}/>
        <rect x="14" y="22" width="68" height="72" rx="14" fill="#E0455E" ${st()}/>
        ${crown(48, 22, 40)}
        <rect x="22" y="34" width="52" height="26" rx="6" fill="#FFF6E9" ${st(3)}/>
        <path d="M39 34 L39 60 M57 34 L57 60" ${st(2)} fill="none"/>
        ${[30, 48, 66].map((x) => `<path d="M${x - 5} 40 L${x + 5} 40 L${x} 54" stroke="#E0455E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join('')}
        ${face(48, 72, hurtOr(o), 0.7)}
        <rect x="26" y="84" width="44" height="7" rx="3" fill="#8C2B3D" ${st(2)}/>
        <circle cx="36" cy="87" r="3" fill="#FFCF4D" ${st(1.4)}/><circle cx="58" cy="87" r="3" fill="#FFCF4D" ${st(1.4)}/>
        ${shine(22, 70, 3, 9, 0)}${sparkle(8, 12, 0.8)}`);

    S.dama_suerte = (o) => svg(`
        ${tube('M50 60 Q54 80 46 96', '#4E8F3A', 5)}
        ${[[50, 26, 0], [74, 48, 90], [50, 70, 180], [26, 48, 270]].map(([x, y, r]) => `<path transform="translate(${x} ${y}) rotate(${r})" d="M0 14 C-22 -2 -18 -20 -7 -20 C-2 -20 0 -16 0 -12 C0 -16 2 -20 7 -20 C18 -20 22 -2 0 14 Z" fill="#7BBF5A" ${st(3)}/>`).join('')}
        <circle cx="50" cy="48" r="17" fill="#9BD66A" ${st()}/>
        <path d="M34 34 L38 22 L44 30 L50 18 L56 30 L62 22 L66 34 Z" fill="#FFCF4D" ${st(2.5)}/><circle cx="50" cy="28" r="3" fill="#5CC9A7" ${st(1.4)}/>
        ${face(50, 50, isHurt(o) ? 'hurt' : 'wink', 0.6)}
        ${sparkle(12, 14, 0.9)}${sparkle(88, 86, 0.8, '#FFB8C6')}${sparkle(86, 12, 0.6)}`);

    // =========================================================
    // CASTILLO 3 — TORRE DEL REY (guardia real)
    // =========================================================
    S.caballero_cuchillas = (o) => svg(`
        ${[[-24, '#E3E9F0'], [0, '#F2F5F8'], [24, '#E3E9F0']].map(([r, c]) => `<path d="M48 16 L50 -2 L54 16 Z" fill="${c}" ${st(2.2)} transform="rotate(${r} 50 22)"/>`).join('')}
        <path d="M20 46 Q20 14 50 14 Q80 14 80 46 L80 74 Q50 86 20 74 Z" fill="#C9D3DC" ${st()}/>
        <path d="M28 38 L72 38 L70 50 L30 50 Z" fill="#3A3448" ${st(2.5)}/>
        ${isHurt(o) ? `<path d="M36 44 L44 44 M56 44 L64 44" stroke="#FFE27A" stroke-width="3" stroke-linecap="round"/>`
            : `<ellipse cx="40" cy="44" rx="4" ry="2.6" fill="#FFE27A"/><ellipse cx="60" cy="44" rx="4" ry="2.6" fill="#FFE27A"/>`}
        <path d="M50 50 L50 78 M36 58 L36 72 M64 58 L64 72" ${st(2)} fill="none" opacity=".4"/>
        <path d="M4 58 L30 58 L30 80 Q17 94 4 80 Z" fill="#5A6FB0" ${st()}/>
        <path d="M17 62 L17 86 M10 70 L24 70" stroke="#FFCF4D" stroke-width="3" stroke-linecap="round"/>
        ${shine(30, 26, 3.5, 8)}`);

    S.mayordomo_batidor = (o) => svg(`
        <path d="M18 52 Q4 50 6 36 L14 38 Q14 46 22 48" fill="#F4F0FF" ${st(3)}/>
        <path d="M80 44 Q96 44 94 60 Q92 72 78 70" fill="none" ${st(4)}/>
        <path d="M18 60 Q18 30 50 30 Q82 30 82 60 Q82 90 50 90 Q18 90 18 60 Z" fill="#F4F0FF" ${st()}/>
        <path d="M24 46 Q50 38 76 46" ${st(2.5)} fill="none" opacity=".4"/>
        <ellipse cx="50" cy="30" rx="18" ry="5" fill="#E3DCF5" ${st(2.5)}/><circle cx="50" cy="22" r="5" fill="#9B7FD4" ${st(2.2)}/>
        <path d="M40 74 L50 80 L60 74 L60 84 L50 78 L40 84 Z" fill="#4F4A66" ${st(1.8)}/>
        ${face(50, 56, hurtOr(o, 'eyes'), 0.8)}
        <path d="M40 66 Q45 62 50 66 Q55 62 60 66" ${st(2.2)} fill="none"/>
        <path d="M86 88 L96 70" ${st(3)} fill="none"/><path d="M92 62 Q86 70 92 76 Q100 76 100 68 Q98 60 92 62 Z" fill="none" ${st(2)}/>
        ${shine(28, 50, 3.5, 8)}`);

    S.bufon_explosivo = (o) => svg(`
        <path d="M68 38 Q82 22 94 26" ${st(3.5)} fill="none"/>${sparkle(95, 24, 1, '#FFB347')}
        <circle cx="48" cy="62" r="30" fill="#4F4A66" ${st()}/>
        <path d="M18 70 L28 64 L34 76 L44 66 L50 78 L56 66 L66 76 L72 64 L80 70 L78 84 Q48 100 18 84 Z" fill="#F2667A" ${st(2.5)}/>
        <path d="M22 44 Q12 12 32 18 Q40 24 44 36 Z" fill="#5CC9A7" ${st(3)}/>
        <path d="M74 44 Q84 12 64 18 Q56 24 52 36 Z" fill="#FFCF4D" ${st(3)}/>
        <circle cx="30" cy="16" r="5" fill="#FFCF4D" ${st(2)}/><circle cx="66" cy="16" r="5" fill="#5CC9A7" ${st(2)}/>
        <path d="M22 44 Q48 32 74 44" fill="#9B7FD4" ${st(3)}/>
        <circle cx="38" cy="56" r="5" fill="#fff" ${st(1.8)}/><circle cx="58" cy="56" r="5" fill="#fff" ${st(1.8)}/>
        ${isHurt(o) ? `<path d="M35 56 L41 56 M55 56 L61 56" ${st(2.2)} fill="none"/>` : `<circle cx="39" cy="57" r="2.3" fill="${INK}"/><circle cx="59" cy="57" r="2.3" fill="${INK}"/>`}
        <path d="M36 66 Q48 ${isHurt(o) ? 64 : 76} 60 66" fill="${isHurt(o) ? 'none' : '#fff'}" ${st(2.4)}/>
        ${shine(34, 48, 3, 6)}`);

    S.guardia_hielo = (o) => svg(`
        <path d="M84 4 L84 94" ${st(3)} fill="none"/><path d="M84 0 L91 14 L77 14 Z" fill="#C9D3DC" ${st(2.2)}/>
        <path d="M16 34 L70 34 L76 90 L10 90 Z" fill="#BFE6F5" opacity=".95" ${st()}/>
        <path d="M16 34 L30 50 L70 34 M30 50 L24 90 M30 50 L58 70 L76 90 M58 70 L50 90" ${st(2)} fill="none" opacity=".35"/>
        <path d="M18 34 Q18 10 43 10 Q68 10 68 34 Z" fill="#9AA5B1" ${st()}/>
        <path d="M43 10 L43 2" ${st(3)} fill="none"/><circle cx="43" cy="2" r="3" fill="#5A6FB0" ${st(1.5)}/>
        ${face(43, 56, hurtOr(o), 0.8)}
        ${sparkle(20, 76, 0.6, '#fff')}${sparkle(66, 44, 0.5, '#fff')}${shine(22, 48, 3, 10, 0)}`);

    S.capitan_guardia = (o) => svg(`
        <path d="M22 50 Q6 80 16 98 L84 98 Q94 80 78 50 Z" fill="#C8374F" ${st()}/>
        <path d="M86 6 L92 70" ${st(3)} fill="none"/><path d="M86 2 L94 6 L92 62 L86 62 Z" fill="#E3E9F0" ${st(2.5)}/>
        <rect x="80" y="62" width="16" height="6" rx="2" fill="#FFCF4D" ${st(2)}/>
        <path d="M30 60 L70 60 L74 96 L26 96 Z" fill="#C9D3DC" ${st()}/>
        <path d="M50 60 L50 96 M34 76 L66 76" ${st(2)} fill="none" opacity=".4"/>
        <circle cx="50" cy="42" r="22" fill="#FFD2B0" ${st()}/>
        <path d="M26 40 Q24 14 50 14 Q76 14 74 40 L66 40 Q66 26 50 26 Q34 26 34 40 Z" fill="#C9D3DC" ${st()}/>
        <path d="M50 14 Q56 0 70 4 Q62 8 60 16" fill="#F2667A" ${st(2.5)}/>
        ${face(50, 46, hurtOr(o, 'eyes'), 0.66)}
        <path d="M38 55 Q44 51 50 55 Q56 51 62 55 Q56 59 50 57 Q44 59 38 55 Z" fill="#6E4A3A" ${st(1.6)}/>`);

    S.verdugo_jugo = (o) => svg(`
        <path d="M76 8 L80 96" ${st(4)} fill="none" stroke="#8C6A3F"/>
        <path d="M76 8 L80 96" stroke="#8C6A3F" stroke-width="4" fill="none"/>
        <path d="M78 10 Q100 16 98 40 Q88 34 80 36 Z" fill="#C9D3DC" ${st(2.8)}/>
        <path d="M94 40 Q96 48 92 50 Q88 48 90 40" fill="#FFA64D" ${st(1.8)}/>
        <path d="M14 98 Q14 62 42 60 Q70 62 70 98 Z" fill="#3A3448" ${st()}/>
        <path d="M18 44 Q16 8 42 8 Q68 8 66 44 Q66 62 42 64 Q18 62 18 44 Z" fill="#3A3448" ${st()}/>
        <path d="M24 34 Q42 30 60 34 L58 42 Q42 38 26 42 Z" fill="#241F2E"/>
        ${isHurt(o) ? `<path d="M30 38 L38 38 M46 38 L54 38" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round"/>`
            : `<ellipse cx="34" cy="38" rx="4" ry="3" fill="#FF6B6B"/><ellipse cx="50" cy="38" rx="4" ry="3" fill="#FF6B6B"/>`}
        <path d="M22 72 Q42 80 62 72" ${st(2)} fill="none" opacity=".35"/>`);
})();
