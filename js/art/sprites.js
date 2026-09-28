// ============================================================
// SPRITES.JS — Arte propio en SVG, estilo "libro de stickers".
// Cada sprite es una función que devuelve un <svg> (viewBox 100x100).
// El borde blanco de sticker se lo pone el CSS (.sprite).
//
// Se buscan por el id del personaje / enemigo / carta / reliquia /
// evento. Si agregas contenido nuevo sin dibujo, se usa su emoji
// automáticamente — no se rompe nada. Para reutilizar un dibujo
// existente, ponle a tu dato un campo `sprite: 'id_de_otro_sprite'`.
//
// Uso:  art(id, emojiDeRespaldo, { mood: 'hurt', size: 'lg' })
// ============================================================

(function () {
    const INK = '#4A3428';
    const BLUSH = '#FF8FA3';
    const st = (w) => `stroke="${INK}" stroke-width="${w || 3.5}" stroke-linejoin="round" stroke-linecap="round"`;
    const svg = (inner) => `<svg class="sprite" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

    // --- helpers compartidos: son los que dan el estilo unificado ---
    const shine = (x, y, rx, ry, rot) =>
        `<ellipse cx="${x}" cy="${y}" rx="${rx || 4}" ry="${ry || 7}" fill="#fff" opacity=".75" transform="rotate(${rot == null ? -25 : rot} ${x} ${y})"/>`;

    const leaf = (x, y, rot, s, color) =>
        `<g transform="translate(${x} ${y}) rotate(${rot || 0}) scale(${s || 1})">
            <path d="M0 0 C6 -9 18 -9 24 0 C18 9 6 9 0 0 Z" fill="${color || '#7BBF5A'}" ${st(3)}/>
            <path d="M3 0 L17 0" ${st(2)} fill="none" opacity=".5"/>
        </g>`;

    const sparkle = (x, y, s, color) =>
        `<path transform="translate(${x} ${y}) scale(${s || 1})" d="M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8 Z" fill="${color || '#FFE58A'}" ${st(2)}/>`;

    // Moretones: aparecen y aumentan según cuánta vida le queda al personaje
    // (1 = raspón, 3 = bien machacado). Manchas fijas, no al azar, para que
    // no "salten" de un redibujo a otro.
    const BRUISE_SPOTS = [
        [-19, -8, 6.5, 4.4, -18],
        [17, 4, 6, 4, 14],
        [-9, 15, 5.4, 3.6, 4],
        [11, -15, 5, 3.4, -25]
    ];
    function bruises(x, y, stage, s) {
        if (!stage) return '';
        s = s || 1;
        const spots = BRUISE_SPOTS.slice(0, Math.min(stage + 1, BRUISE_SPOTS.length));
        const op = Math.min(0.75, 0.42 + stage * 0.12);
        const marks = spots.map(([dx, dy, rx, ry, rot]) => {
            const cx = (x + dx * s).toFixed(1), cy = (y + dy * s).toFixed(1);
            return `<ellipse cx="${cx}" cy="${cy}" rx="${(rx * s).toFixed(1)}" ry="${(ry * s).toFixed(1)}" fill="#6E7D57" opacity="${op.toFixed(2)}" transform="rotate(${rot} ${cx} ${cy})"/>`;
        }).join('');
        // muy mal parado: además un curita
        const bandaid = stage >= 3
            ? `<g transform="translate(${(x - 4 * s).toFixed(1)} ${(y - 20 * s).toFixed(1)}) rotate(-18)">
                <rect x="-9" y="-4.5" width="18" height="9" rx="3.5" fill="#F6E3C8" ${st(2)}/>
                <circle cx="-3.5" cy="0" r=".9" fill="#C9A97E"/><circle cx="3.5" cy="0" r=".9" fill="#C9A97E"/>
            </g>` : '';
        return marks + bandaid;
    }

    // Carita kawaii. mood: happy | angry | hurt | sleepy | sour | wink
    function face(x, y, mood, s) {
        mood = mood || 'happy';
        const eye = (ex) => `<ellipse cx="${ex}" cy="0" rx="3.4" ry="4.3" fill="${INK}"/><circle cx="${ex + 1.1}" cy="-1.6" r="1.3" fill="#fff"/>`;
        let eyes = eye(-9) + eye(9);
        let mouth = `<path d="M-4.5 5 Q0 10.5 4.5 5 Z" fill="#C94F5E" ${st(2.4)}/>`;
        let extra = '';
        let blush = `<ellipse cx="-15" cy="6" rx="4.2" ry="2.6" fill="${BLUSH}" opacity=".75"/><ellipse cx="15" cy="6" rx="4.2" ry="2.6" fill="${BLUSH}" opacity=".75"/>`;
        if (mood === 'angry') {
            extra = `<path d="M-14 -8 L-5 -4.5" ${st(2.6)} fill="none"/><path d="M14 -8 L5 -4.5" ${st(2.6)} fill="none"/>`;
            mouth = `<path d="M-5 9 Q0 3.5 5 9" ${st(2.6)} fill="none"/>`;
            blush = '';
        } else if (mood === 'hurt') {
            eyes = `<path d="M-13 -3.5 L-7 0 L-13 3.5" ${st(2.6)} fill="none"/><path d="M13 -3.5 L7 0 L13 3.5" ${st(2.6)} fill="none"/>`;
            mouth = `<path d="M-6 8 q1.5 -3 3 0 t3 0 t3 0 t3 0" ${st(2.2)} fill="none"/>`;
        } else if (mood === 'sleepy') {
            eyes = `<path d="M-12 0 Q-9 3.5 -6 0" ${st(2.4)} fill="none"/><path d="M6 0 Q9 3.5 12 0" ${st(2.4)} fill="none"/>`;
            mouth = `<ellipse cx="0" cy="7" rx="2.2" ry="2.6" fill="#C94F5E" ${st(1.8)}/>`;
        } else if (mood === 'sour') {
            eyes = `<path d="M-12 -2 L-6 1" ${st(2.6)} fill="none"/><path d="M12 -2 L6 1" ${st(2.6)} fill="none"/>`;
            mouth = `<path d="M-4 7 Q-2 5 0 7 Q2 9 4 7" ${st(2.4)} fill="none"/>`;
        } else if (mood === 'wink') {
            eyes = eye(-9) + `<path d="M6 0 Q9 -3.5 12 0" ${st(2.4)} fill="none"/>`;
        }
        return `<g transform="translate(${x} ${y}) scale(${s || 1})">${blush}<g class="eyes">${eyes}</g>${mouth}${extra}</g>`;
    }

    const S = {};

    // =========================================================
    // FRUTAS JUGABLES
    // =========================================================
    S.manzana = (o) => svg(`
        <path d="M50 30 C47 22 49 15 54 10" ${st()} fill="none"/>
        ${leaf(53, 17, -30, 0.9, o.leaf)}
        <path d="M50 30 C34 17 10 25 13 53 C16 80 35 93 50 86 C65 93 84 80 87 53 C90 25 66 17 50 30 Z" fill="${o.body || '#F2667A'}" ${st()}/>
        ${shine(29, 44, 4.5, 8)}
        ${bruises(50, 55, o.hurtStage)}
        ${face(50, 59, o.mood)}`);

    S.platanin = (o) => svg(`
        <path d="M20 26 C12 62 40 94 84 80 C92 77 90 65 81 66 C56 68 42 52 39 27 C38 19 21 18 20 26 Z" fill="${o.body || '#FFD95A'}" ${st()}/>
        <path d="M26 30 C24 55 42 78 70 78" ${st(2)} fill="none" opacity=".35"/>
        <path d="M24 22 L27 12 L35 13 L34 22" fill="#8C6A3F" ${st(3)}/>
        <path d="M82 67 L90 70 L87 78" fill="#8C6A3F" ${st(2.5)}/>
        ${shine(28, 44, 3.5, 8, -10)}
        ${bruises(50, 55, o.hurtStage, 0.85)}
        ${face(45, 62, o.mood, 0.8)}`);

    S.kiwi = (o) => {
        let seeds = '';
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 23, y = 54 + Math.sin(a) * 23;
            seeds += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.8" ry="3.2" fill="${INK}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
        }
        return svg(`
            <circle cx="50" cy="54" r="38" fill="${o.body2 || '#A97C50'}" ${st()}/>
            <circle cx="50" cy="54" r="31" fill="${o.body || '#8CCB4E'}" ${st(2.5)}/>
            ${seeds}
            <ellipse cx="50" cy="55" rx="17" ry="15" fill="${o.core || '#E8F5C8'}"/>
            ${shine(30, 36, 3.5, 6)}
            ${bruises(50, 55, o.hurtStage, 0.9)}
            ${face(50, 55, o.mood, 0.78)}`);
    };

    // =========================================================
    // ENEMIGOS
    // =========================================================
    S.mosca_podrida = (o) => svg(`
        <ellipse cx="32" cy="30" rx="15" ry="11" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(-30 32 30)"/>
        <ellipse cx="68" cy="30" rx="15" ry="11" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(30 68 30)"/>
        <path d="M30 78 L22 88 M42 82 L38 92 M58 82 L62 92 M70 78 L78 88" ${st(3)} fill="none"/>
        <circle cx="50" cy="60" r="27" fill="#8FA37A" ${st()}/>
        <circle cx="38" cy="74" r="3" fill="#6E8259"/><circle cx="64" cy="72" r="2.4" fill="#6E8259"/>
        <path d="M40 32 Q36 22 30 20 M60 32 Q64 22 70 20" ${st(2.5)} fill="none"/>
        ${shine(35, 48)}
        ${face(50, 60, o.mood === 'hurt' ? 'hurt' : 'angry')}`);

    S.cucaracha_blindada = (o) => svg(`
        <path d="M24 50 L10 44 M22 64 L8 66 M24 78 L12 88 M76 50 L90 44 M78 64 L92 66 M76 78 L88 88" ${st(3)} fill="none"/>
        <ellipse cx="50" cy="64" rx="29" ry="30" fill="#B0703F" ${st()}/>
        <path d="M50 38 L50 93" ${st(2.5)} fill="none"/>
        <path d="M38 50 Q34 62 38 76 M62 50 Q66 62 62 76" ${st(2)} fill="none" opacity=".4"/>
        <path d="M42 22 Q34 8 22 8 M58 22 Q66 8 78 8" ${st(2.5)} fill="none"/>
        <ellipse cx="50" cy="32" rx="22" ry="15" fill="#8A5530" ${st()}/>
        ${shine(36, 58, 3.5, 9)}
        ${face(50, 33, o.mood === 'hurt' ? 'hurt' : 'angry', 0.72)}`);

    S.gusano_venenoso = (o) => svg(`
        <circle cx="18" cy="76" r="11" fill="#A7D86B" ${st()}/>
        <circle cx="33" cy="72" r="13" fill="#A7D86B" ${st()}/>
        <circle cx="33" cy="70" r="3.2" fill="#B48BE0"/>
        <circle cx="50" cy="66" r="14" fill="#A7D86B" ${st()}/>
        <circle cx="52" cy="62" r="3.4" fill="#B48BE0"/>
        <path d="M60 30 Q56 16 48 14 M76 30 Q82 16 90 16" ${st(2.5)} fill="none"/>
        <circle cx="48" cy="14" r="3.5" fill="#B48BE0" ${st(2)}/><circle cx="90" cy="16" r="3.5" fill="#B48BE0" ${st(2)}/>
        <circle cx="68" cy="46" r="22" fill="#B7E27F" ${st()}/>
        ${shine(56, 36, 3.5, 6)}
        ${face(68, 48, o.mood === 'hurt' ? 'hurt' : 'angry', 0.85)}
        <path d="M60 60 q2 6 0 9" stroke="#9B7FD4" stroke-width="3.5" stroke-linecap="round" fill="none"/>`);

    S.avispa_furiosa = (o) => svg(`
        <ellipse cx="36" cy="26" rx="14" ry="9" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(-35 36 26)"/>
        <ellipse cx="58" cy="22" rx="14" ry="9" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(20 58 22)"/>
        <path d="M86 62 L97 66 L86 70 Z" fill="${INK}" ${st(2.5)}/>
        <ellipse cx="54" cy="60" rx="34" ry="25" fill="#FFCF4D" ${st()}/>
        <path d="M58 36 Q52 60 58 84" stroke="${INK}" stroke-width="7" fill="none"/>
        <path d="M74 40 Q68 62 74 80" stroke="${INK}" stroke-width="6" fill="none"/>
        ${shine(30, 50, 3.5, 7)}
        ${face(38, 62, o.mood === 'hurt' ? 'hurt' : 'angry', 0.8)}
        <path d="M30 38 Q24 26 18 24" ${st(2.5)} fill="none"/>`);

    S.mango_zombie = (o) => svg(`
        ${leaf(58, 16, -60, 0.9, '#8FA37A')}
        <path d="M52 14 C24 10 10 40 16 64 C22 88 50 96 70 86 C92 74 90 40 74 24 C68 18 60 15 52 14 Z" fill="#E8B84A" ${st()}/>
        <path d="M60 60 C70 66 76 58 80 70 C76 82 64 86 58 78 Z" fill="#A9B85A" opacity=".85"/>
        <path d="M26 34 L38 40 M29 42 L33 32 M34 44 L38 36" ${st(2.2)} fill="none"/>
        ${shine(27, 56, 3.5, 8)}
        <g transform="translate(50 56)">
            ${o.mood === 'hurt' ? `<path d="M-13 -3.5 L-7 0 L-13 3.5 M13 -3.5 L7 0 L13 3.5" ${st(2.6)} fill="none"/>`
            : `<path d="M-13 -4 L-5 4 M-5 -4 L-13 4" ${st(2.8)} fill="none"/>
               <circle cx="9" cy="0" r="5.5" fill="#fff" ${st(2)}/><circle cx="10" cy="1" r="2.2" fill="${INK}"/>`}
            <path d="M-8 10 Q0 6 8 10" ${st(2.5)} fill="none"/>
            <path d="M2 9 q2 7 5 3" fill="${BLUSH}" ${st(2)}/>
        </g>`);

    S.licuadora_suprema = (o) => svg(`
        <path d="M34 14 L40 4 L46 11 L50 2 L54 11 L60 4 L66 14 Z" fill="#FFCF4D" ${st(3)}/>
        <rect x="30" y="14" width="40" height="9" rx="4" fill="#F2667A" ${st(3)}/>
        <path d="M26 23 L74 23 L68 72 L32 72 Z" fill="#CDEBF5" ${st()}/>
        <path d="M30 44 Q40 38 50 44 T70 44 L68 72 L32 72 Z" fill="#FF9EB0"/>
        <path d="M26 23 L74 23 L68 72 L32 72 Z" fill="none" ${st()}/>
        <path d="M74 30 Q88 32 86 46 Q84 58 71 58" ${st()} fill="none"/>
        <circle cx="42" cy="58" r="3" fill="#fff" opacity=".8"/><circle cx="58" cy="62" r="2" fill="#fff" opacity=".8"/>
        <path d="M24 72 L76 72 L80 94 L20 94 Z" fill="#9B7FD4" ${st()}/>
        <circle cx="38" cy="84" r="4" fill="#FFCF4D" ${st(2)}/><circle cx="50" cy="84" r="4" fill="#5CC9A7" ${st(2)}/><circle cx="62" cy="84" r="4" fill="#F2667A" ${st(2)}/>
        ${shine(34, 32, 2.5, 7, -5)}
        ${face(50, 36, o.mood === 'hurt' ? 'hurt' : 'angry', 0.85)}`);

    // =========================================================
    // NODOS DEL MAPA
    // =========================================================
    S.node_enemy = () => svg(`
        <g transform="rotate(-35 50 50)">
            <rect x="46" y="40" width="8" height="52" rx="4" fill="#E8C49A" ${st(3)}/>
            <path d="M40 12 L40 34 Q40 44 50 44 Q60 44 60 34 L60 12" fill="none" ${st()}/>
            <path d="M47 12 L47 32 M53 12 L53 32" ${st(3)} fill="none"/>
        </g>
        <g transform="rotate(35 50 50)">
            <rect x="46" y="54" width="8" height="38" rx="4" fill="#F2667A" ${st(3)}/>
            <path d="M46 56 L46 16 Q58 22 56 56 Z" fill="#E3E9F0" ${st()}/>
        </g>`);

    S.node_rest = () => svg(`
        <path d="M20 84 L80 70 M20 70 L80 84" stroke="#8C6A3F" stroke-width="11" stroke-linecap="round"/>
        <path d="M20 84 L80 70 M20 70 L80 84" ${st(2.5)} fill="none" opacity=".4"/>
        <path d="M50 76 C30 70 34 50 44 40 C44 50 50 52 50 44 C50 34 56 26 58 18 C66 30 74 44 68 60 C66 70 60 76 50 76 Z" fill="#FF9E7A" ${st()}/>
        <path d="M50 74 C42 70 44 60 50 54 C54 60 60 64 56 70 Z" fill="#FFD95A"/>
        <path d="M70 22 L88 6" ${st(3)} fill="none"/>
        <rect x="64" y="18" width="12" height="10" rx="4" fill="#fff" ${st(3)} transform="rotate(-40 70 23)"/>`);

    S.node_treasure = () => svg(`
        <path d="M14 46 Q14 22 50 22 Q86 22 86 46 Z" fill="#F2667A" ${st()}/>
        <path d="M14 46 Q14 22 50 22 Q86 22 86 46" fill="none" stroke="#7BBF5A" stroke-width="5" transform="translate(0 -1)"/>
        <ellipse cx="34" cy="36" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="50" cy="31" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="66" cy="36" rx="2" ry="3.2" fill="${INK}"/>
        <rect x="14" y="46" width="72" height="38" rx="5" fill="#7BBF5A" ${st()}/>
        <path d="M28 46 Q24 64 28 84 M50 46 L50 84 M72 46 Q76 64 72 84" stroke="#4E8F3A" stroke-width="4" fill="none"/>
        <rect x="42" y="42" width="16" height="18" rx="4" fill="#FFCF4D" ${st(3)}/>
        <circle cx="50" cy="50" r="2.5" fill="${INK}"/>
        ${sparkle(84, 18, 0.9)}`);

    S.node_shop = () => svg(`
        <rect x="18" y="36" width="6" height="52" fill="#B0703F" ${st(3)}/><rect x="76" y="36" width="6" height="52" fill="#B0703F" ${st(3)}/>
        <path d="M10 18 L90 18 L90 36 L10 36 Z" fill="#fff" ${st()}/>
        <path d="M10 18 L24 18 L24 36 L10 36 Z M38 18 L52 18 L52 36 L38 36 Z M66 18 L80 18 L80 36 L66 36 Z" fill="#FF9E7A"/>
        <path d="M10 36 q7 9 14 0 q7 9 14 0 q7 9 14 0 q7 9 14 0 q7 9 14 0 q5 8 10 0" fill="#FF9E7A" ${st(3)}/>
        <path d="M10 18 L90 18 L90 36 L10 36 Z" fill="none" ${st()}/>
        <rect x="14" y="64" width="72" height="22" rx="4" fill="#E8C49A" ${st()}/>
        <circle cx="34" cy="60" r="7" fill="#F2667A" ${st(2.5)}/><circle cx="50" cy="59" r="7" fill="#FFCF4D" ${st(2.5)}/><circle cx="66" cy="60" r="7" fill="#8CCB4E" ${st(2.5)}/>`);

    S.node_mystery = () => svg(`
        <rect x="12" y="26" width="76" height="54" rx="6" fill="#fff" ${st()}/>
        <path d="M12 30 L50 58 L88 30" fill="#F4ECFF" ${st()}/>
        <circle cx="50" cy="58" r="10" fill="#9B7FD4" ${st(3)}/>
        <path d="M46 55 Q46 50 50 50 Q54 50 54 54 Q54 57 50 58 L50 60" ${st(2.5)} stroke="#fff" fill="none"/>
        <circle cx="50" cy="64" r="1.4" fill="#fff"/>
        ${sparkle(86, 18, 0.9)}${sparkle(16, 16, 0.6, '#FFB8C6')}`);

    S.node_well = () => svg(`
        <ellipse cx="50" cy="78" rx="34" ry="10" fill="#8FA3C7" ${st(3)}/>
        <path d="M20 78 Q16 46 26 34 L74 34 Q84 46 80 78 Z" fill="#C9AF8C" ${st()}/>
        <path d="M28 40 L72 40" ${st(2.5)} fill="none" opacity=".4"/>
        <ellipse cx="50" cy="52" rx="20" ry="7" fill="#6FA8D6" ${st(2.5)}/>
        ${sparkle(50, 50, 0.5, '#fff')}
        <path d="M30 20 L70 20" ${st(4)} fill="none"/>
        <path d="M30 20 L30 34 M70 20 L70 34" ${st(4)} fill="none"/>
        <rect x="42" y="16" width="16" height="14" rx="2" fill="#8C6A3F" ${st(2.5)}/>
        <path d="M50 20 L50 8" ${st(2)} fill="none"/>`);
    S.node_boss = (o) => S.licuadora_suprema(o || {});

    // =========================================================
    // ÍCONOS DE INTERFAZ
    // =========================================================
    S.ui_heart = () => svg(`
        <path d="M50 86 C20 66 8 48 14 32 C20 16 42 14 50 32 C58 14 80 16 86 32 C92 48 80 66 50 86 Z" fill="#F2667A" ${st(5)}/>
        ${shine(28, 34, 5, 8)}`);

    S.ui_coin = () => svg(`
        <circle cx="50" cy="52" r="36" fill="#FFCF4D" ${st(5)}/>
        <circle cx="50" cy="52" r="26" fill="none" stroke="#E0A92E" stroke-width="4"/>
        <ellipse cx="50" cy="52" rx="8" ry="13" fill="#8C6A3F" ${st(3)}/>
        ${shine(32, 36, 4, 7)}`);

    S.ui_energy = (o) => svg(`
        <circle cx="50" cy="50" r="38" fill="${o.empty ? '#EDE3CF' : '#FFE27A'}" ${st(5)}/>
        <circle cx="50" cy="50" r="30" fill="${o.empty ? '#F7F0E0' : '#FFF4B8'}"/>
        ${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M50 50 L${(50 + 28 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(50 + 28 * Math.sin(a * Math.PI / 180)).toFixed(1)}" stroke="${o.empty ? '#E0D4BC' : '#F5C542'}" stroke-width="4" stroke-linecap="round"/>`).join('')}
        <circle cx="50" cy="50" r="5" fill="${o.empty ? '#E0D4BC' : '#F5C542'}"/>`);

    S.ui_shield = () => svg(`
        <path d="M50 10 L84 22 C84 56 72 78 50 90 C28 78 16 56 16 22 Z" fill="#5CC9A7" ${st(5)}/>
        <path d="M50 22 L72 30 C72 54 64 70 50 78 Z" fill="#8FE0C4"/>
        ${shine(30, 34, 4, 9, -10)}`);

    S.ui_sword = () => svg(`
        <g transform="rotate(45 50 50)">
            <path d="M44 12 L56 12 L56 62 L50 70 L44 62 Z" fill="#E3E9F0" ${st(4)}/>
            <rect x="32" y="62" width="36" height="8" rx="4" fill="#F2667A" ${st(4)}/>
            <rect x="45" y="70" width="10" height="18" rx="4" fill="#B0703F" ${st(4)}/>
        </g>`);

    S.ui_up = () => svg(`
        <path d="M50 12 L84 48 L64 48 L64 86 L36 86 L36 48 L16 48 Z" fill="#FF9E7A" ${st(5)}/>`);

    S.ui_heal = () => svg(`
        <path d="M50 86 C20 66 8 48 14 32 C20 16 42 14 50 32 C58 14 80 16 86 32 C92 48 80 66 50 86 Z" fill="#7BBF5A" ${st(5)}/>
        <path d="M50 38 L50 66 M36 52 L64 52" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`);

    S.ui_hit = () => svg(`
        <path d="M50 6 L60 34 L90 26 L68 50 L92 70 L62 68 L56 94 L44 70 L14 82 L32 56 L8 36 L38 36 Z" fill="#FFCF4D" ${st(4)}/>
        <path d="M50 30 L55 44 L70 42 L58 52 L66 64 L52 60 L46 72 L44 58 L30 60 L40 50 L32 40 L46 44 Z" fill="#F2667A"/>`);

    // estados
    S.st_strength = () => svg(`
        <rect x="26" y="44" width="48" height="12" rx="4" fill="#B0703F" ${st(4)}/>
        <rect x="12" y="28" width="16" height="44" rx="6" fill="#F2667A" ${st(4)}/>
        <rect x="72" y="28" width="16" height="44" rx="6" fill="#F2667A" ${st(4)}/>
        ${shine(17, 38, 2.5, 6, 0)}${shine(77, 38, 2.5, 6, 0)}`);

    S.st_weak = () => svg(`
        <path d="M50 88 L50 50" ${st(4)} fill="none"/>
        <path d="M50 52 C30 52 18 40 22 24 C36 22 48 32 50 52 Z" fill="#C8C27A" ${st(4)}/>
        <path d="M50 60 C66 62 78 74 76 88 C62 88 52 78 50 60 Z" fill="#C8C27A" ${st(4)}/>
        <path d="M70 18 q4 8 0 12 q-4 -4 0 -12 Z" fill="#8FD0F0" ${st(2.5)}/>`);

    S.st_vulnerable = () => svg(`
        <circle cx="50" cy="50" r="38" fill="#fff" ${st(4)}/>
        <circle cx="50" cy="50" r="26" fill="#F2667A" ${st(3)}/>
        <circle cx="50" cy="50" r="13" fill="#fff" ${st(3)}/>
        <circle cx="50" cy="50" r="5" fill="#F2667A"/>`);

    S.st_poison = () => svg(`
        <path d="M50 8 C62 30 80 46 80 64 C80 82 66 92 50 92 C34 92 20 82 20 64 C20 46 38 30 50 8 Z" fill="#9B7FD4" ${st(4)}/>
        <circle cx="42" cy="66" r="6" fill="#C7B4F0"/><circle cx="60" cy="54" r="4" fill="#C7B4F0"/><circle cx="56" cy="76" r="3" fill="#C7B4F0"/>
        ${shine(36, 48, 3.5, 7)}`);

    // =========================================================
    // CARTAS
    // =========================================================
    const roundFruit = (color, mood, extra) => `
        ${extra || ''}
        <circle cx="50" cy="56" r="32" fill="${color}" ${st()}/>
        ${shine(34, 42, 4, 7)}
        ${face(50, 58, mood || 'happy', 0.85)}`;

    S.golpe_cascara = () => svg(`
        <path d="M50 26 C48 20 50 14 54 10" ${st()} fill="none"/>${leaf(53, 16, -25, 0.8)}
        <path d="M50 28 C34 16 12 24 15 52 C18 78 36 90 50 84 C64 90 82 78 85 52 C88 24 66 16 50 28 Z" fill="#9BD66A" ${st()}/>
        ${shine(30, 44, 4, 8)}${face(50, 58, 'angry', 0.85)}
        <path d="M78 76 L92 90 M84 70 L96 78" ${st(3)} fill="none"/>`);

    S.golpe_doble = () => svg(`
        <path d="M34 60 Q40 24 58 12 Q62 30 70 56" ${st()} fill="none"/>
        ${leaf(56, 12, 10, 0.8)}
        <circle cx="32" cy="68" r="20" fill="#E0455E" ${st()}/>${shine(24, 60, 3, 5)}${face(32, 70, 'happy', 0.6)}
        <circle cx="70" cy="68" r="20" fill="#E0455E" ${st()}/>${shine(62, 60, 3, 5)}${face(70, 70, 'wink', 0.6)}`);

    S.tajo_citrico = () => svg(`
        <circle cx="50" cy="52" r="38" fill="#FFE27A" ${st()}/>
        <circle cx="50" cy="52" r="30" fill="#FFF4B8"/>
        ${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M50 52 L${(50 + 28 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(52 + 28 * Math.sin(a * Math.PI / 180)).toFixed(1)}" stroke="#F5C542" stroke-width="3.5" stroke-linecap="round"/>`).join('')}
        <path d="M8 90 L92 14" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
        <path d="M8 90 L92 14" ${st(2.5)} fill="none" opacity=".6"/>`);

    S.ametralladora_semillas = () => {
        const g = [[50, 34], [36, 44], [64, 44], [43, 58], [57, 58], [50, 72]];
        return svg(`
            <path d="M50 24 L50 10" ${st()} fill="none"/>${leaf(51, 14, -20, 0.8)}
            ${g.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="#9B7FD4" ${st(3)}/><ellipse cx="${x - 4}" cy="${y - 4}" rx="2.5" ry="3.5" fill="#fff" opacity=".7"/>`).join('')}
            ${face(50, 60, 'angry', 0.55)}
            <circle cx="82" cy="30" r="3.5" fill="#8C6A3F"/><circle cx="88" cy="46" r="3" fill="#8C6A3F"/><circle cx="84" cy="62" r="3.5" fill="#8C6A3F"/>`);
    };

    S.explosion_acida = () => svg(`
        <path d="M50 6 L58 22 L76 12 L74 32 L94 34 L80 48 L94 64 L74 66 L76 86 L58 76 L50 94 L42 76 L24 86 L26 66 L6 64 L20 48 L6 34 L26 32 L24 12 L42 22 Z" fill="#FFE27A" ${st(3)}/>
        ${roundFruit('#FFA64D', 'angry')}
        <circle cx="42" cy="42" r="1.6" fill="#E08A2E"/><circle cx="62" cy="44" r="1.6" fill="#E08A2E"/>`);

    S.golpe_final = () => svg(`
        ${leaf(56, 16, -50, 0.9)}
        <path d="M52 16 C24 12 10 42 16 66 C22 90 52 96 72 84 C92 72 90 40 74 26 C68 20 60 16 52 16 Z" fill="#FFB347" ${st()}/>
        <path d="M60 60 C72 66 78 56 82 70 C76 84 62 86 58 78 Z" fill="#F2667A" opacity=".55"/>
        ${shine(27, 54, 3.5, 8)}${face(50, 56, 'angry', 0.9)}`);

    S.jugo_defensivo = () => svg(`
        <path d="M58 18 L72 4" ${st(4)} fill="none"/>
        <path d="M58 18 L54 30" stroke="#F2667A" stroke-width="6" stroke-linecap="round"/>
        <path d="M26 30 L74 30 L66 90 L34 90 Z" fill="#fff" ${st()}/>
        <path d="M29 46 L71 46 L66 90 L34 90 Z" fill="#FF9E7A"/>
        <path d="M26 30 L74 30 L66 90 L34 90 Z" fill="none" ${st()}/>
        <circle cx="66" cy="30" r="10" fill="#FFE27A" ${st(3)}/>
        ${face(50, 64, 'happy', 0.75)}`);

    S.escudo_pulpa = () => svg(`
        <path d="M50 8 L86 20 C86 56 74 80 50 92 C26 80 14 56 14 20 Z" fill="#5CC9A7" ${st()}/>
        <path d="M50 20 L74 28 C74 54 66 72 50 80 C34 72 26 54 26 28 Z" fill="#FFB347" ${st(2.5)}/>
        ${face(50, 50, 'happy', 0.75)}`);

    S.bloqueo_total = () => svg(`
        <circle cx="50" cy="54" r="36" fill="#8C6A3F" ${st()}/>
        <path d="M24 40 q4 -4 8 0 M60 30 q4 -4 8 0 M68 64 q4 -4 8 0 M30 72 q4 -4 8 0" ${st(2)} fill="none" opacity=".5"/>
        <circle cx="42" cy="36" r="3" fill="${INK}"/><circle cx="54" cy="34" r="3" fill="${INK}"/><circle cx="48" cy="44" r="3" fill="${INK}"/>
        ${shine(30, 40, 4, 8)}${face(50, 60, 'sleepy', 0.85)}`);

    S.cascara_venenosa = () => svg(`
        <path d="M50 88 C30 70 16 50 22 30 C34 38 44 52 50 88 Z" fill="#FFD95A" ${st()}/>
        <path d="M50 88 C70 70 84 50 78 30 C66 38 56 52 50 88 Z" fill="#FFD95A" ${st()}/>
        <path d="M50 88 C44 60 44 40 50 16 C56 40 56 60 50 88 Z" fill="#9B7FD4" ${st()}/>
        <circle cx="50" cy="40" r="3" fill="#fff"/><circle cx="48" cy="56" r="2" fill="#fff"/>`);

    S.maldicion_debilidad = () => svg(`
        <ellipse cx="50" cy="54" rx="38" ry="32" fill="#C9E88A" ${st()}/>
        <path d="M20 40 Q50 30 80 40 M16 56 Q50 46 84 56 M20 72 Q50 62 80 72" stroke="#A6CC62" stroke-width="3" fill="none"/>
        ${shine(26, 40, 4, 7)}${face(50, 58, 'sour', 0.9)}`);

    S.mermelada_curativa = () => svg(`
        <rect x="24" y="14" width="52" height="14" rx="4" fill="#FFB8C6" ${st()}/>
        <path d="M24 14 q6 6 13 0 q6 6 13 0 q6 6 13 0 q6 6 13 0" fill="none" ${st(2.5)}/>
        <path d="M28 28 L72 28 Q80 28 80 38 L80 80 Q80 90 70 90 L30 90 Q20 90 20 80 L20 38 Q20 28 28 28 Z" fill="#E0455E" ${st()}/>
        <rect x="30" y="46" width="40" height="30" rx="6" fill="#FFF6E9" ${st(2.5)}/>
        <path d="M50 70 C40 64 36 58 40 54 C43 51 48 52 50 56 C52 52 57 51 60 54 C64 58 60 64 50 70 Z" fill="#F2667A" ${st(2)}/>
        ${shine(26, 40, 3, 8, 0)}`);

    S.fermentacion = () => svg(`
        <rect x="42" y="6" width="16" height="12" rx="3" fill="#B0703F" ${st(3)}/>
        <path d="M44 18 L56 18 L56 32 Q74 40 74 58 L74 84 Q74 92 66 92 L34 92 Q26 92 26 84 L26 58 Q26 40 44 32 Z" fill="#9B7FD4" ${st()}/>
        <rect x="32" y="56" width="36" height="22" rx="4" fill="#FFF6E9" ${st(2.5)}/>
        ${sparkle(50, 67, 0.8, '#FFCF4D')}
        <circle cx="70" cy="22" r="4" fill="#fff" ${st(2)}/><circle cx="80" cy="12" r="3" fill="#fff" ${st(2)}/>
        ${shine(34, 44, 3, 6, 20)}`);

    S.frenesi_frutal = () => svg(`
        <path d="M8 34 L92 34 A42 42 0 0 1 8 34 Z" fill="#7BBF5A" ${st()}/>
        <path d="M15 34 L85 34 A35 35 0 0 1 15 34 Z" fill="#fff"/>
        <path d="M19 34 L81 34 A31 31 0 0 1 19 34 Z" fill="#F2667A"/>
        <path d="M8 34 L92 34" ${st()} fill="none"/>
        <ellipse cx="34" cy="50" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="66" cy="50" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="50" cy="60" rx="2" ry="3.2" fill="${INK}"/>
        ${face(50, 44, 'happy', 0.7)}
        ${sparkle(18, 16, 0.8)}${sparkle(82, 16, 0.8, '#FFB8C6')}`);

    // =========================================================
    // RELIQUIAS
    // =========================================================
    S.corazon_sandia = () => svg(`
        <path d="M50 88 C20 68 8 50 14 32 C20 16 42 14 50 32 C58 14 80 16 86 32 C92 50 80 68 50 88 Z" fill="#7BBF5A" ${st(4)}/>
        <path d="M50 78 C26 62 18 48 22 36 C26 26 42 24 50 38 C58 24 74 26 78 36 C82 48 74 62 50 78 Z" fill="#F2667A"/>
        <ellipse cx="38" cy="46" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="62" cy="46" rx="2" ry="3.2" fill="${INK}"/><ellipse cx="50" cy="58" rx="2" ry="3.2" fill="${INK}"/>`);

    S.diente_ajo = () => svg(`
        <path d="M50 8 Q46 20 50 28" ${st()} fill="none"/>
        <path d="M50 26 C30 30 16 50 20 70 C24 88 40 92 50 90 C60 92 76 88 80 70 C84 50 70 30 50 26 Z" fill="#FFF6E9" ${st()}/>
        <path d="M50 30 Q38 60 50 90 M50 30 Q62 60 50 90" ${st(2)} fill="none" opacity=".35"/>
        ${face(50, 64, 'happy', 0.75)}`);

    S.cascara_platano = () => svg(`
        <path d="M50 30 C44 50 30 60 12 64 C24 50 34 40 42 28 Z" fill="#FFD95A" ${st()}/>
        <path d="M50 30 C56 50 70 60 88 64 C76 50 66 40 58 28 Z" fill="#FFD95A" ${st()}/>
        <path d="M46 30 C44 54 40 74 30 90 C48 82 54 60 54 30 Z" fill="#FFE68A" ${st()}/>
        <path d="M44 30 L46 14 L54 14 L56 30 Z" fill="#8C6A3F" ${st(3)}/>`);

    S.semilla_dorada = () => svg(`
        <ellipse cx="50" cy="54" rx="22" ry="32" fill="#FFCF4D" ${st()} transform="rotate(20 50 54)"/>
        <path d="M44 32 Q52 54 46 78" ${st(2.5)} fill="none" opacity=".4"/>
        ${shine(40, 40, 3.5, 8)}
        ${sparkle(18, 22, 1.1)}${sparkle(82, 76, 0.8)}${sparkle(80, 22, 0.6, '#fff')}`);

    S.miel_curativa = () => svg(`
        <path d="M20 26 L80 26 L80 36 L20 36 Z" fill="#B0703F" ${st()}/>
        <path d="M24 36 L76 36 Q86 50 84 68 Q80 90 50 90 Q20 90 16 68 Q14 50 24 36 Z" fill="#FFB938" ${st()}/>
        <path d="M24 36 L76 36 L74 44 Q68 50 64 44 Q58 52 52 44 Q44 54 38 44 Q30 50 26 44 Z" fill="#FFD95A"/>
        <path d="M60 10 L60 28 M56 24 L64 24" ${st(4)} fill="none"/>
        ${face(50, 66, 'happy', 0.8)}`);

    S.reloj_frutal = () => svg(`
        ${leaf(52, 12, -30, 0.8)}
        <circle cx="50" cy="54" r="38" fill="#FFA64D" ${st()}/>
        <circle cx="50" cy="54" r="29" fill="#FFF6E9" ${st(2.5)}/>
        <path d="M50 54 L50 34 M50 54 L64 60" ${st(4)} fill="none"/>
        <circle cx="50" cy="54" r="3.5" fill="${INK}"/>
        <path d="M50 27 L50 31 M77 54 L73 54 M50 81 L50 77 M23 54 L27 54" ${st(3)} fill="none"/>`);

    // =========================================================
    // EVENTOS
    // =========================================================
    S.fuente_magica = () => svg(`
        <path d="M50 30 Q38 10 26 30 M50 30 Q62 10 74 30" stroke="#8FD0F0" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="44" y="30" width="12" height="26" fill="#E3E9F0" ${st(3)}/>
        <ellipse cx="50" cy="30" rx="12" ry="5" fill="#E3E9F0" ${st(3)}/>
        <path d="M10 60 L90 60 L82 88 L18 88 Z" fill="#E3E9F0" ${st()}/>
        <ellipse cx="50" cy="60" rx="40" ry="8" fill="#8FD0F0" ${st()}/>
        ${sparkle(22, 16, 0.8)}${sparkle(80, 44, 0.6, '#FFB8C6')}`);

    S.comerciante_misterioso = () => svg(`
        <ellipse cx="50" cy="40" rx="42" ry="8" fill="#9B7FD4" ${st()}/>
        <path d="M28 40 L32 10 L68 10 L72 40 Z" fill="#9B7FD4" ${st()}/>
        <rect x="30" y="28" width="40" height="7" fill="#FFCF4D" ${st(2.5)}/>
        <path d="M20 50 Q50 44 80 50 L76 64 Q66 70 56 62 L50 58 L44 62 Q34 70 24 64 Z" fill="#F2667A" ${st()}/>
        <ellipse cx="35" cy="56" rx="5" ry="3" fill="${INK}"/><ellipse cx="65" cy="56" rx="5" ry="3" fill="${INK}"/>
        <path d="M40 80 Q50 86 60 80" ${st(3)} fill="none"/>`);

    S.trampa_espinas = () => svg(`
        <rect x="24" y="76" width="52" height="16" rx="3" fill="#FF9E7A" ${st()}/>
        <path d="M40 76 L40 26 Q40 14 50 14 Q60 14 60 26 L60 76 Z" fill="#7BBF5A" ${st()}/>
        <path d="M40 56 L28 56 Q22 56 22 48 L22 38" fill="none" stroke="#7BBF5A" stroke-width="10" stroke-linecap="round"/>
        <path d="M40 56 L28 56 Q22 56 22 48 L22 38" fill="none" ${st(3)} opacity=".001"/>
        <path d="M60 48 L72 48 Q78 48 78 40 L78 32" fill="none" stroke="#7BBF5A" stroke-width="10" stroke-linecap="round"/>
        <path d="M36 34 L32 32 M36 46 L32 46 M64 30 L68 28 M64 62 L68 62 M18 42 L14 40 M82 36 L86 34" ${st(2.5)} fill="none"/>
        ${face(50, 40, 'angry', 0.55)}
        <circle cx="50" cy="12" r="5" fill="#FFB8C6" ${st(2.5)}/>`);

    S.altar_poder = () => svg(`
        <path d="M30 20 Q30 10 50 10 Q70 10 70 20 L72 80 L28 80 Z" fill="#B5AFA6" ${st()}/>
        <path d="M36 30 L46 30 M54 30 L64 30" ${st(4)} fill="none"/>
        <path d="M42 48 L42 58 L58 58 L58 48" ${st(3)} fill="#8C857C"/>
        <rect x="18" y="80" width="64" height="12" rx="3" fill="#8C857C" ${st()}/>
        ${sparkle(82, 20, 1)}${sparkle(16, 40, 0.7, '#C7B4F0')}`);

    S.baul_escondido = () => S.node_treasure();

    // =========================================================
    // API
    // =========================================================
    window.SPRITES = S;
    // ayudantes compartidos para js/art/sprites2.js (mismo estilo)
    window.SPRITE_KIT = { INK, BLUSH, st, svg, shine, leaf, sparkle, face, bruises };

    // Devuelve el sprite como HTML, o el emoji de respaldo dentro
    // de un circulito sticker si ese id no tiene dibujo.
    window.art = function (id, fallback, opts) {
        opts = opts || {};
        const size = opts.size ? ` art-${opts.size}` : '';
        const cls = opts.cls ? ` ${opts.cls}` : '';
        if (id && S[id]) {
            let out = S[id](opts);
            // accesorios del vestidor encima del dibujo
            if (opts.dress) out = out.replace(/<\/svg>$/, `${opts.dress}</svg>`);
            return `<span class="art${size}${cls}">${out}</span>`;
        }
        return `<span class="art art-fallback${size}${cls}">${fallback || '❔'}</span>`;
    };
})();
