// ============================================================
// SPRITES3.JS — Arte de la Uva (personaje nuevo), sus posturas y las
// cartas exclusivas de cada fruta. Mismo estilo "libro de stickers":
// usa los ayudantes de js/art/sprites.js (window.SPRITE_KIT).
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, sparkle, face, bruises } = window.SPRITE_KIT;

    // ---------- piezas reutilizables ----------
    const APPLE = 'M50 30 C34 17 10 25 13 53 C16 80 35 93 50 86 C65 93 84 80 87 53 C90 25 66 17 50 30 Z';
    const apple = (x, y, s, color, mood, extra) => `
        <g transform="translate(${x} ${y}) scale(${s}) translate(-50 -55)">
            <path d="M50 30 C47 22 49 15 54 10" ${st()} fill="none"/>${leaf(53, 17, -30, 0.9)}
            <path d="${APPLE}" fill="${color}" ${st()}/>
            ${extra || ''}${shine(29, 44, 4.5, 8)}${mood ? face(50, 59, mood) : ''}
        </g>`;
    const BANANA = 'M20 26 C12 62 40 94 84 80 C92 77 90 65 81 66 C56 68 42 52 39 27 C38 19 21 18 20 26 Z';
    const banana = (x, y, s, rot, color, mood) => `
        <g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s}) translate(-50 -55)">
            <path d="${BANANA}" fill="${color || '#FFD95A'}" ${st()}/>
            <path d="M24 22 L27 12 L35 13 L34 22" fill="#8C6A3F" ${st(3)}/>
            ${shine(28, 44, 3.5, 8, -10)}${mood ? face(45, 62, mood, 0.8) : ''}
        </g>`;
    const grape = (x, y, r, color) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${color || '#9B7FD4'}" ${st(3)}/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.35}" rx="${r * 0.2}" ry="${r * 0.3}" fill="#fff" opacity=".65"/>`;
    // racimo: filas de uvas de arriba (anchas) hacia abajo (una)
    const bunch = (cx, top, r, rows, color) => {
        let out = '';
        rows.forEach((n, row) => {
            for (let k = 0; k < n; k++) out += grape(cx + (k - (n - 1) / 2) * r * 1.75, top + row * r * 1.5, r, color);
        });
        return out;
    };
    const kiwiBall = (x, y, r) => {
        let hairs = '';
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            hairs += `<path d="M${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)} L${(x + Math.cos(a) * (r + 5)).toFixed(1)} ${(y + Math.sin(a) * (r + 5)).toFixed(1)}" ${st(2)} fill="none"/>`;
        }
        return `${hairs}<circle cx="${x}" cy="${y}" r="${r}" fill="#A97C50" ${st()}/>`;
    };
    const glass = (liquid, extra) => `
        <path d="M48 62 L48 84 M34 90 L66 90" ${st(4)} fill="none"/>
        <path d="M24 12 L76 12 Q76 62 50 64 Q24 62 24 12 Z" fill="#fff" ${st()}/>
        <path d="M26 30 L74 30 Q72 60 50 62 Q28 60 26 30 Z" fill="${liquid}"/>
        <path d="M24 12 L76 12 Q76 62 50 64 Q24 62 24 12 Z" fill="none" ${st()}/>
        ${extra || ''}`;
    const bottle = (color, extra) => `
        <rect x="42" y="4" width="16" height="12" rx="3" fill="#8C6A3F" ${st(3)}/>
        <path d="M44 16 L56 16 L56 30 Q76 38 76 56 L76 86 Q76 94 68 94 L32 94 Q24 94 24 86 L24 56 Q24 38 44 30 Z" fill="${color}" ${st()}/>
        ${extra || ''}${shine(34, 50, 3, 8, 10)}`;
    const cloud = (fill) => `<path d="M20 60 Q6 60 8 46 Q10 34 24 36 Q26 18 44 20 Q54 6 70 18 Q88 16 88 34 Q98 38 94 50 Q92 60 80 60 Z" fill="${fill}" ${st()}/>`;

    // =========================================================
    // UVA (personaje) y sus posturas
    // =========================================================
    S.uva = (o) => svg(`
        <path d="M50 20 Q52 10 58 4" ${st()} fill="none"/>${leaf(56, 10, -20, 1)}
        ${bunch(50, 26, 10, [4, 3, 2], o.body || '#9B7FD4')}
        ${grape(50, 76, 10, o.body || '#9B7FD4')}
        <circle cx="50" cy="48" r="21" fill="${o.body2 || '#8A6CC8'}" ${st()}/>
        ${shine(40, 38, 3.5, 6)}
        ${bruises(50, 48, o.hurtStage, 0.65)}
        ${face(50, 50, o.mood, 0.75)}`);
    S.st_calm = () => svg(`
        <circle cx="50" cy="50" r="38" fill="#D2F2E6" ${st(4)}/>
        <path d="M20 54 Q35 44 50 54 T80 54" stroke="#5CC9A7" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M24 68 Q37 60 50 68 T76 68" stroke="#8FE0C4" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${leaf(40, 32, -20, 1.1)}`);
    S.st_wrath = () => svg(`
        <path d="M50 6 C62 24 82 34 80 60 C78 82 62 94 50 94 C38 94 22 82 20 60 C18 34 38 24 50 6 Z" fill="#F2667A" ${st(4)}/>
        <path d="M50 40 C58 50 66 58 62 72 C58 82 42 82 38 72 C34 58 42 50 50 40 Z" fill="#FFCF4D"/>
        <path d="M36 56 L46 50 M64 56 L54 50" ${st(3.5)} fill="none"/>`);

    // =========================================================
    // CARTAS DE LA MANZANA
    // =========================================================
    S.manzanazo = () => svg(`
        <path d="M50 4 L58 22 L78 14 L74 34 L94 40 L78 52 L90 70 L68 68 L62 90 L50 74 L38 90 L32 68 L10 70 L22 52 L6 40 L26 34 L22 14 L42 22 Z" fill="#FFE27A" ${st(3)}/>
        ${apple(50, 54, 0.72, '#F2667A', 'angry')}`);
    S.cascara_rota = () => svg(`
        ${apple(46, 54, 0.9, '#F2667A', 'hurt', `<path d="M62 30 L54 46 L64 54 L56 70" ${st(3)} fill="none"/>`)}
        <path d="M76 26 L92 20 L90 38 Z" fill="#F2667A" ${st(3)}/>`);
    S.golpe_maduro = () => svg(`
        <circle cx="50" cy="54" r="44" fill="#FFF1C2" opacity=".8"/>
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((d) => { const a = d * Math.PI / 180; return `<path d="M${(50 + Math.cos(a) * 38).toFixed(1)} ${(54 + Math.sin(a) * 38).toFixed(1)} L${(50 + Math.cos(a) * 46).toFixed(1)} ${(54 + Math.sin(a) * 46).toFixed(1)}" stroke="#FFB347" stroke-width="5" stroke-linecap="round"/>`; }).join('')}
        ${apple(50, 56, 0.78, '#C8374F', 'angry')}`);
    S.sacrificio_pulpa = () => svg(`
        <path d="M14 40 Q14 84 50 84 Q86 84 86 40 Z" fill="#F2667A" ${st()}/>
        <path d="M20 40 Q22 76 50 76 Q78 76 80 40 Z" fill="#FFF6E9"/>
        <path d="M14 40 L86 40" ${st()} fill="none"/>
        <ellipse cx="42" cy="54" rx="2.5" ry="4" fill="#8C6A3F"/><ellipse cx="58" cy="54" rx="2.5" ry="4" fill="#8C6A3F"/>
        <path d="M50 84 Q46 92 50 98 Q54 92 50 84 Z" fill="#F2667A" ${st(2)}/>
        <path d="M60 12 L50 28 L60 28 L52 40" stroke="#FFCF4D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
    S.tormenta_manzanas = () => svg(`
        ${cloud('#E3E9F0')}
        ${apple(26, 78, 0.28, '#F2667A')}${apple(52, 86, 0.3, '#9BD66A')}${apple(76, 76, 0.28, '#F2667A')}
        ${face(52, 42, 'angry', 0.6)}`);
    S.sidra_rabiosa = () => svg(`
        ${bottle('#FFB938', `<rect x="30" y="56" width="40" height="26" rx="4" fill="#FFF6E9" ${st(2.5)}/>${face(50, 70, 'angry', 0.6)}`)}
        <circle cx="64" cy="22" r="4" fill="#fff" ${st(2)}/><circle cx="74" cy="12" r="3" fill="#fff" ${st(2)}/>`);
    S.fuego_interno = () => svg(`
        <path d="M50 30 C44 18 50 8 56 2 C58 12 66 14 62 26 Z" fill="#FFB347" ${st(3)}/>
        <path d="M${APPLE.slice(1)}" fill="#E0455E" ${st()}/>
        <path d="M50 44 C58 54 64 60 60 72 C56 80 44 80 40 72 C36 60 44 54 50 44 Z" fill="#FFCF4D" opacity=".85"/>
        ${shine(29, 44, 4.5, 8)}${face(50, 62, 'angry', 0.8)}`);

    // =========================================================
    // CARTAS DE PLATANÍN
    // =========================================================
    const peelShield = (x, y, s, rot) => `
        <g transform="translate(${x} ${y}) rotate(${rot}) scale(${s}) translate(-50 -50)">
            <path d="M50 8 L84 20 C84 56 72 78 50 90 C28 78 16 56 16 20 Z" fill="#FFD95A" ${st()}/>
            <path d="M50 20 L72 28 C72 54 64 70 50 78 C36 70 28 54 28 28 Z" fill="#FFF1C2" ${st(2.5)}/>
        </g>`;
    S.doble_cascara = () => svg(`${peelShield(36, 48, 0.72, -10)}${peelShield(62, 56, 0.72, 10)}${face(62, 56, 'happy', 0.6)}`);
    S.racimo_firme = () => svg(`
        <path d="M48 10 L52 10 L54 22 L46 22 Z" fill="#8C6A3F" ${st(3)}/>
        ${banana(30, 54, 0.62, 18)}${banana(70, 54, 0.62, 72)}${banana(50, 58, 0.66, 45, '#FFE27A', 'happy')}
        <path d="M14 88 L86 88 L86 94 L14 94 Z" fill="#8C6A3F" ${st(3)}/>`);
    S.aplaston_dorado = () => svg(`
        <path d="M8 88 L18 78 M4 72 L16 70 M24 94 L28 82" ${st(3)} fill="none"/>
        ${banana(54, 48, 0.9, -20, '#FFCF4D', 'angry')}
        ${sparkle(86, 14, 0.8)}`);
    S.boomerang_platano = () => svg(`
        <path d="M10 70 Q20 90 44 92 M86 30 Q90 12 72 6" ${st(3)} fill="none" opacity=".6"/>
        ${banana(50, 50, 0.9, 30, '#FFD95A', 'happy')}`);
    S.licuado_proteico = () => svg(`
        <path d="M62 4 L58 30" ${st(4)} fill="none"/>
        <path d="M28 22 L72 22 L66 92 L34 92 Z" fill="#fff" ${st()}/>
        <path d="M30 38 L70 38 L66 92 L34 92 Z" fill="#FFE27A"/>
        <path d="M28 22 L72 22 L66 92 L34 92 Z" fill="none" ${st()}/>
        <circle cx="72" cy="24" r="12" fill="#FFF1C2" ${st(3)}/><circle cx="72" cy="24" r="4" fill="#E8C49A"/>
        ${face(50, 64, 'happy', 0.7)}`);

    // =========================================================
    // CARTAS DEL KIWI
    // =========================================================
    S.pelitos_toxicos = () => svg(`
        ${kiwiBall(46, 56, 30)}
        <path d="M70 20 C76 30 82 34 82 42 C82 48 78 52 72 52 C66 52 62 48 62 42 C62 34 66 30 70 20 Z" fill="#9B7FD4" ${st(3)}/>
        ${face(44, 58, 'wink', 0.85)}`);
    S.nube_esporas = () => svg(`
        ${cloud('#D8EFA0')}
        ${[[30, 44], [50, 34], [66, 42], [42, 52], [74, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#9B7FD4"/>`).join('')}
        ${[[24, 76], [44, 86], [62, 78], [80, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#C7B4F0" ${st(2)}/>`).join('')}`);
    S.rodaja_kiwi = () => {
        let seeds = '';
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 22, y = 52 + Math.sin(a) * 22;
            seeds += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.8" ry="3.2" fill="${INK}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        }
        return svg(`
            <circle cx="50" cy="52" r="38" fill="#A97C50" ${st()}/>
            <circle cx="50" cy="52" r="31" fill="#8CCB4E" ${st(2.5)}/>
            ${seeds}<ellipse cx="50" cy="52" rx="15" ry="13" fill="#E8F5C8"/>
            <path d="M10 92 L92 12" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
            <path d="M10 92 L92 12" ${st(2)} fill="none" opacity=".5"/>
            ${face(50, 54, 'angry', 0.6)}`);
    };
    S.pelusa_defensiva = () => svg(`
        <path d="M50 14 L82 24 C82 56 72 76 50 88 C28 76 18 56 18 24 Z" fill="#5CC9A7" ${st()}/>
        ${kiwiBall(50, 52, 20)}${face(50, 54, 'happy', 0.6)}`);

    // =========================================================
    // CARTAS DE LA UVA
    // =========================================================
    S.uvazo_furioso = () => svg(`
        <path d="M14 30 L24 36 M8 50 L20 50 M14 70 L24 64 M86 30 L76 36 M92 50 L80 50 M86 70 L76 64" stroke="#F2667A" stroke-width="5" stroke-linecap="round"/>
        <path d="M50 14 Q54 8 60 6" ${st()} fill="none"/>
        <circle cx="50" cy="52" r="32" fill="#8A6CC8" ${st()}/>
        ${shine(38, 38, 4, 7)}${face(50, 56, 'angry', 0.95)}`);
    S.racimo_sereno = () => svg(`
        <path d="M50 18 Q52 10 58 6" ${st()} fill="none"/>${leaf(56, 10, -20, 0.9)}
        ${bunch(50, 26, 10, [4, 3, 2], '#B7E27F')}${grape(50, 76, 10, '#B7E27F')}
        <circle cx="50" cy="48" r="19" fill="#9BD66A" ${st()}/>
        ${face(50, 50, 'sleepy', 0.7)}`);
    S.vendimia = () => svg(`
        <path d="M18 48 Q18 20 50 20 Q82 20 82 48" ${st(5)} fill="none" stroke="#C9804A"/>
        <path d="M18 48 Q18 20 50 20 Q82 20 82 48" ${st(1.5)} fill="none"/>
        ${grape(38, 44, 9)}${grape(54, 40, 9)}${grape(66, 48, 9)}${grape(46, 54, 9)}
        <path d="M10 50 L90 50 L80 90 L20 90 Z" fill="#E8B87A" ${st()}/>
        <path d="M14 66 L86 66 M17 78 L83 78 M34 50 L36 90 M50 50 L50 90 M66 50 L64 90" stroke="#C9804A" stroke-width="3"/>`);
    S.respirar_hondo = () => svg(`
        <path d="M8 30 Q22 22 30 32 Q36 40 26 42 M10 70 Q24 62 32 72" ${st(3)} fill="none" stroke="#8FD0F0"/>
        <path d="M60 18 Q62 10 68 6" ${st()} fill="none"/>
        <circle cx="62" cy="52" r="30" fill="#9B7FD4" ${st()}/>
        ${shine(50, 38, 4, 7)}${face(62, 56, 'sleepy', 0.9)}`);
    S.pisada_uvas = () => svg(`
        ${grape(30, 20, 8)}${grape(70, 14, 7)}${grape(84, 34, 6)}
        <path d="M12 44 L88 44 L82 92 L18 92 Z" fill="#C9804A" ${st()}/>
        <path d="M14 58 L86 58 M16 76 L84 76" ${st(3)} fill="none" opacity=".45"/>
        <path d="M14 44 Q30 36 40 44 Q52 34 62 44 Q74 36 86 44 L86 50 L14 50 Z" fill="#8A4C9E" ${st(3)}/>
        <circle cx="30" cy="30" r="3" fill="#8A4C9E"/><circle cx="60" cy="28" r="3.5" fill="#8A4C9E"/>`);
    S.mosto_rapido = () => svg(`
        ${glass('#B0305A', `<circle cx="40" cy="44" r="3" fill="#fff" opacity=".8"/><circle cx="58" cy="50" r="2.4" fill="#fff" opacity=".8"/><circle cx="50" cy="38" r="2" fill="#fff" opacity=".8"/>`)}
        <path d="M82 8 L74 24 L84 24 L76 40" stroke="#FFCF4D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
    S.copa_tranquila = () => svg(`
        ${glass('#C7B4F0', face(50, 44, 'sleepy', 0.6))}
        ${leaf(70, 10, 20, 0.8)}`);
    S.pasa_eterna = () => svg(`
        <ellipse cx="50" cy="54" rx="34" ry="30" fill="#7A4E6A" ${st()}/>
        <path d="M26 42 Q34 50 30 60 M44 30 Q52 42 46 54 M62 34 Q56 48 66 58 M72 50 Q64 62 74 72" ${st(2.5)} fill="none" opacity=".5"/>
        ${face(50, 60, 'sleepy', 0.7)}
        ${sparkle(86, 18, 0.9)}${sparkle(14, 22, 0.6, '#fff')}`);
    S.ritmo_vino = () => svg(`
        <path d="M68 10 L68 38 M68 10 L84 6 L84 30" ${st(3.5)} fill="none"/>
        <ellipse cx="62" cy="40" rx="7" ry="5" fill="${INK}"/><ellipse cx="78" cy="32" rx="7" ry="5" fill="${INK}"/>
        <circle cx="40" cy="60" r="28" fill="#9B7FD4" ${st()}/>
        ${shine(30, 48, 3.5, 6)}${face(40, 64, 'wink', 0.8)}`);
    S.tinto_final = () => svg(`
        <path d="M50 2 L56 12 L66 6 L64 18" ${st(3)} fill="none"/>
        ${bottle('#6E1E3A', `<rect x="30" y="56" width="40" height="26" rx="4" fill="#FFE27A" ${st(2.5)}/>${face(50, 70, 'angry', 0.6)}`)}
        ${sparkle(86, 30, 0.9)}${sparkle(14, 40, 0.7)}`);
})();

// ---------- Viñedo de la Uva: brotes y cartas de siembra ----------
(function () {
    const S = window.SPRITES;
    const { st, svg, shine, leaf, sparkle, face } = window.SPRITE_KIT;
    const grape = (x, y, r, color) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${st(3)}/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.35}" rx="${r * 0.2}" ry="${r * 0.3}" fill="#fff" opacity=".65"/>`;
    const smallBunch = (color) => `
        <path d="M50 22 Q52 12 58 8" ${st(3)} fill="none"/>${leaf(56, 12, -20, 0.8)}
        ${grape(38, 34, 11, color)}${grape(62, 34, 11, color)}${grape(50, 52, 11, color)}${grape(36, 56, 10, color)}${grape(64, 56, 10, color)}${grape(50, 74, 10, color)}`;
    const pot = (inner) => `
        <path d="M24 60 L76 60 L70 94 L30 94 Z" fill="#FF9E7A" ${st()}/>
        <rect x="20" y="54" width="60" height="10" rx="4" fill="#FF9E7A" ${st()}/>
        ${inner}`;
    S.brote_agria = () => svg(`${smallBunch('#9BD66A')}${face(50, 52, 'sour', 0.45)}`);
    S.brote_dulce = () => svg(`${smallBunch('#9B7FD4')}${face(50, 52, 'happy', 0.45)}`);
    S.brote_parra = () => svg(`
        <path d="M50 92 Q40 70 52 52 Q64 34 48 14" stroke="#7BBF5A" stroke-width="6" stroke-linecap="round" fill="none"/>
        <path d="M50 92 Q40 70 52 52 Q64 34 48 14" ${st(2)} fill="none"/>
        ${leaf(50, 66, -160, 1.2)}${leaf(54, 44, -20, 1.2)}${leaf(48, 22, -150, 1)}
        <path d="M60 50 Q72 46 70 36 Q68 30 62 32" ${st(2.5)} fill="none"/>`);
    S.siembra_agria = () => svg(`${pot(`<path d="M50 56 L50 34" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>${grape(42, 30, 9, '#9BD66A')}${grape(58, 30, 9, '#9BD66A')}${grape(50, 44, 9, '#9BD66A')}${face(50, 78, 'sour', 0.55)}`)}`);
    S.siembra_dulce = () => svg(`${pot(`<path d="M50 56 L50 34" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>${grape(42, 30, 9, '#9B7FD4')}${grape(58, 30, 9, '#9B7FD4')}${grape(50, 44, 9, '#9B7FD4')}${face(50, 78, 'happy', 0.55)}`)}${sparkle(84, 18, 0.7)}`);
    S.racimo_pisado = () => svg(`
        <path d="M8 82 Q30 70 50 80 Q70 70 92 82 L92 92 L8 92 Z" fill="#8A4C9E" ${st()}/>
        ${grape(30, 60, 10, '#9B7FD4')}${grape(70, 58, 9, '#9B7FD4')}
        <path d="M40 10 L60 10 L62 44 Q62 56 50 56 Q38 56 38 44 Z" fill="#FFB38A" ${st()}/>
        <path d="M38 40 L62 40" ${st(2)} fill="none" opacity=".4"/>
        <circle cx="22" cy="74" r="3" fill="#8A4C9E"/><circle cx="80" cy="72" r="3.5" fill="#8A4C9E"/>`);
    S.plantar_parra = () => svg(`${pot(`<path d="M50 56 Q42 40 52 28 Q60 18 50 8" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round" fill="none"/>${leaf(48, 40, -160, 0.9)}${leaf(54, 24, -20, 0.9)}${face(50, 78, 'happy', 0.55)}`)}`);
    S.tierra_fertil = () => svg(`
        <path d="M8 60 Q50 40 92 60 L92 92 L8 92 Z" fill="#8C6A3F" ${st()}/>
        <path d="M22 72 L30 72 M50 80 L60 80 M70 66 L78 66" ${st(2.5)} fill="none" opacity=".5"/>
        <path d="M36 52 L36 30 M64 50 L64 26" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>
        ${leaf(36, 32, -150, 0.8)}${leaf(64, 28, -30, 0.8)}
        ${face(50, 76, 'happy', 0.6)}${sparkle(86, 20, 0.8)}`);
    S.parra_trepadora = () => svg(`
        <path d="M14 94 L14 20 M86 94 L86 20 M14 36 L86 36 M14 62 L86 62" stroke="#C9804A" stroke-width="5" stroke-linecap="round"/>
        <path d="M20 90 Q34 70 26 56 Q18 40 34 30 Q52 22 60 40 Q66 56 80 48" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round" fill="none"/>
        ${leaf(26, 56, -170, 0.8)}${leaf(46, 26, -30, 0.8)}${leaf(70, 50, 20, 0.8)}
        ${grape(58, 72, 7, '#9BD66A')}${grape(70, 72, 7, '#9BD66A')}${grape(64, 82, 7, '#9BD66A')}`);
})();
