// ============================================================
// SPRITES2.JS — Más arte SVG en el mismo estilo "libro de stickers":
// estados nuevos, cartas, enemigos de los 3 niveles, jefes, objetos,
// eventos, casilla de élite, dificultades y portadas de nivel.
// Usa los ayudantes de js/art/sprites.js (window.SPRITE_KIT).
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, BLUSH, st, svg, shine, leaf, sparkle, face, fangMouth } = window.SPRITE_KIT;
    const hurtOr = (o, m) => (o && o.mood === 'hurt' ? 'hurt' : m || 'angry');
    const drop = (x, y, s, color) =>
        `<path transform="translate(${x} ${y}) scale(${s || 1})" d="M0 -12 C5 -4 9 1 9 5 C9 10 5 13 0 13 C-5 13 -9 10 -9 5 C-9 1 -5 -4 0 -12 Z" fill="${color}" ${st(2.5)}/>`;
    const rays = (cx, cy, r1, r2, n, color, w) => Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return `<path d="M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="${color}" stroke-width="${w || 5}" stroke-linecap="round"/>`;
    }).join('');
    const spikes = (cx, cy, r, n, color) => {
        let d = '';
        for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
            const rr = i % 2 ? r * 0.72 : r;
            d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        return `<path d="${d}Z" fill="${color}" ${st(3)}/>`;
    };
    const legs = (pairs) => `<path d="${pairs}" ${st(3)} fill="none"/>`;
    const wings = (lx, ly, rx, ry) =>
        `<ellipse cx="${lx}" cy="${ly}" rx="15" ry="10" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(-30 ${lx} ${ly})"/>
         <ellipse cx="${rx}" cy="${ry}" rx="15" ry="10" fill="#D6ECF5" opacity=".9" ${st(3)} transform="rotate(30 ${rx} ${ry})"/>`;

    // =========================================================
    // ESTADOS NUEVOS
    // =========================================================
    S.st_dexterity = () => svg(`
        <circle cx="50" cy="54" r="34" fill="#8C6A3F" ${st(4)}/>
        <circle cx="50" cy="54" r="24" fill="#FFF6E9" ${st(3)}/>
        <path d="M50 66 L50 40 M40 50 L50 40 L60 50" ${st(5)} fill="none" stroke="#5CC9A7"/>`);
    S.st_frail = () => svg(`
        <path d="M12 84 L88 84" ${st(4)} fill="none"/>
        <path d="M22 82 Q20 60 28 42 Q50 34 72 42 Q80 60 78 82 Z" fill="#FFD27A" ${st(4)}/>
        <path d="M28 42 Q50 34 72 42 L71 50 Q66 56 61 50 Q55 57 50 50 Q44 57 39 50 Q34 56 29 50 Z" fill="#B0703F"/>
        <path d="M28 42 Q50 34 72 42" ${st(3)} fill="none"/>
        <path d="M10 56 Q6 62 10 68 M90 56 Q94 62 90 68" ${st(3)} fill="none"/>`);
    S.st_thorns = () => svg(`${spikes(50, 52, 40, 10, '#7BBF5A')}<circle cx="50" cy="52" r="20" fill="#FFD95A" ${st(3)}/>${shine(42, 44, 3, 6)}`);
    S.st_frozen = () => svg(`
        <rect x="16" y="16" width="68" height="68" rx="16" fill="#CDEBF5" ${st(4)}/>
        <path d="M50 28 L50 72 M31 39 L69 61 M31 61 L69 39" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
        ${shine(30, 30, 4, 9)}`);
    S.st_regen = () => svg(`
        ${rays(50, 50, 30, 42, 10, '#FFCF4D', 6)}
        <circle cx="50" cy="50" r="24" fill="#FFE27A" ${st(4)}/>
        ${leaf(40, 52, -20, 0.8)}`);
    S.st_ritual = () => svg(`
        <path d="M10 70 L90 70" ${st(4)} fill="none"/>
        <path d="M22 70 A28 28 0 0 1 78 70 Z" fill="#FF9E7A" ${st(4)}/>
        ${[200, 235, 270, 305, 340].map((d) => { const a = d * Math.PI / 180; return `<path d="M${(50 + Math.cos(a) * 34).toFixed(1)} ${(70 + Math.sin(a) * 34).toFixed(1)} L${(50 + Math.cos(a) * 44).toFixed(1)} ${(70 + Math.sin(a) * 44).toFixed(1)}" stroke="#FFB347" stroke-width="5" stroke-linecap="round"/>`; }).join('')}
        <path d="M50 58 L50 44 M42 50 L50 42 L58 50" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`);
    S.st_plated = () => svg(`
        <ellipse cx="50" cy="52" rx="38" ry="34" fill="#B0703F" ${st(4)}/>
        <ellipse cx="50" cy="52" rx="28" ry="25" fill="#E8C49A" ${st(2.5)}/>
        <ellipse cx="50" cy="52" rx="17" ry="15" fill="none" ${st(2.5)}/>
        <ellipse cx="50" cy="52" rx="7" ry="6" fill="none" ${st(2.5)}/>`);
    S.st_sticky = () => svg(`${drop(50, 50, 3, '#FFB938')}${shine(40, 50, 4, 9)}`);

    // =========================================================
    // CARTAS NUEVAS
    // =========================================================
    const grape = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c || '#9B7FD4'}" ${st(3)}/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.35}" rx="${r * 0.2}" ry="${r * 0.3}" fill="#fff" opacity=".7"/>`;
    S.lluvia_uvas = () => svg(`
        <path d="M18 30 Q30 10 50 22 Q70 8 84 28 Q96 44 78 48 L24 48 Q6 44 18 30 Z" fill="#E6DCF7" ${st()}/>
        ${grape(28, 66, 8)}${grape(50, 76, 9)}${grape(72, 64, 8)}${grape(40, 90, 6)}${grape(64, 90, 6)}
        ${face(50, 34, 'angry', 0.6)}`);
    S.estocada_pina = () => svg(`
        <path d="M14 92 L88 12" stroke="#E8C49A" stroke-width="6" stroke-linecap="round"/>
        <path d="M14 92 L88 12" ${st(2)} fill="none"/>
        <path d="M80 12 L92 4 L94 16 Z" fill="#F2667A" ${st(2.5)}/>
        <path d="M42 26 L34 6 L46 16 L50 2 L54 16 L66 6 L58 26 Z" fill="#7BBF5A" ${st(3)}/>
        <ellipse cx="50" cy="58" rx="24" ry="32" fill="#FFCF4D" ${st()}/>
        <path d="M32 42 L64 78 M30 60 L50 84 M40 30 L70 62 M68 42 L36 78 M70 60 L50 84 M60 30 L30 62" stroke="#E0A92E" stroke-width="2.5"/>
        <ellipse cx="50" cy="58" rx="24" ry="32" fill="none" ${st()}/>
        ${face(50, 60, 'angry', 0.75)}`);
    S.chorro_limon = () => svg(`
        <path d="M52 44 Q72 20 94 30" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M52 44 Q72 20 94 30" stroke="#FFE27A" stroke-width="6" stroke-linecap="round" fill="none"/>
        ${drop(88, 50, 0.55, '#FFF4B8')}${drop(78, 62, 0.45, '#FFF4B8')}
        <ellipse cx="36" cy="62" rx="28" ry="22" fill="#FFE27A" ${st()} transform="rotate(-25 36 62)"/>
        <path d="M60 46 L66 40" ${st(3)} fill="none"/>
        ${shine(24, 54, 3, 7)}${face(36, 64, 'sour', 0.7)}`);
    S.rodaja_sandia = () => svg(`
        <path d="M4 42 L14 42 M2 54 L12 54 M6 66 L14 66 M86 34 L96 34 M88 46 L98 46" ${st(3)} fill="none"/>
        <circle cx="50" cy="50" r="38" fill="#7BBF5A" ${st()}/>
        <circle cx="50" cy="50" r="31" fill="#fff"/>
        <circle cx="50" cy="50" r="27" fill="#F2667A"/>
        <circle cx="50" cy="50" r="38" fill="none" ${st()}/>
        ${[0, 72, 144, 216, 288].map((a) => { const r = a * Math.PI / 180; return `<ellipse cx="${(50 + Math.cos(r) * 18).toFixed(1)}" cy="${(50 + Math.sin(r) * 18).toFixed(1)}" rx="2" ry="3.4" fill="${INK}"/>`; }).join('')}
        ${face(50, 52, 'angry', 0.6)}`);
    S.mordisco_voraz = () => svg(`
        <path d="M50 16 C22 16 14 44 18 64 C24 88 76 88 82 64 C86 44 78 16 50 16 Z" fill="#FFB38A" ${st()}/>
        <path d="M50 18 Q46 50 50 86" ${st(2.5)} fill="none" opacity=".35"/>
        <path d="M70 30 q10 4 12 14 q-8 -2 -10 6 q-4 -8 -12 -6 Z" fill="#FBF4E4" ${st(3)}/>
        ${face(44, 56, 'angry', 0.85)}`);
    S.cocazo = () => svg(`
        <circle cx="50" cy="54" r="34" fill="#8C6A3F" ${st()}/>
        <circle cx="40" cy="38" r="3" fill="${INK}"/><circle cx="52" cy="35" r="3" fill="${INK}"/><circle cx="46" cy="46" r="3" fill="${INK}"/>
        <path d="M14 20 L24 30 M86 20 L76 30 M50 4 L50 14" ${st(4)} fill="none"/>
        ${face(50, 64, 'angry', 0.85)}`);
    S.fruta_pasada = () => svg(`
        <path d="M20 26 C12 62 40 94 84 80 C92 77 90 65 81 66 C56 68 42 52 39 27 C38 19 21 18 20 26 Z" fill="#C9A24A" ${st()}/>
        <circle cx="34" cy="50" r="5" fill="#6E5A2A"/><circle cx="54" cy="70" r="6" fill="#6E5A2A"/><circle cx="70" cy="74" r="4" fill="#6E5A2A"/>
        <circle cx="72" cy="30" r="5" fill="#C7B4F0" ${st(2)}/><circle cx="84" cy="20" r="3.5" fill="#C7B4F0" ${st(2)}/>
        ${face(45, 60, 'sleepy', 0.75)}`);
    S.racimo_furioso = () => svg(`
        <path d="M50 22 L50 8" ${st()} fill="none"/>${leaf(51, 12, -20, 0.8)}
        ${grape(38, 30, 11, '#5A6FB0')}${grape(62, 30, 11, '#5A6FB0')}${grape(26, 50, 11, '#5A6FB0')}${grape(50, 50, 11, '#5A6FB0')}
        ${grape(74, 50, 11, '#5A6FB0')}${grape(38, 70, 11, '#5A6FB0')}${grape(62, 70, 11, '#5A6FB0')}${grape(50, 88, 9, '#5A6FB0')}
        ${face(50, 52, 'angry', 0.55)}`);
    S.paleta_helada = () => svg(`
        <rect x="45" y="66" width="10" height="28" rx="4" fill="#E8C49A" ${st(3)}/>
        <path d="M26 20 Q26 8 50 8 Q74 8 74 20 L74 64 Q74 72 66 72 L34 72 Q26 72 26 64 Z" fill="#8FD0F0" ${st()}/>
        <path d="M26 44 L74 44 L74 64 Q74 72 66 72 L34 72 Q26 72 26 64 Z" fill="#FFB8C6"/>
        <path d="M26 20 Q26 8 50 8 Q74 8 74 20 L74 64 Q74 72 66 72 L34 72 Q26 72 26 64 Z" fill="none" ${st()}/>
        ${shine(34, 26, 3, 8)}${face(50, 40, 'happy', 0.7)}${sparkle(86, 20, 0.7, '#fff')}`);
    S.semilla = () => svg(`
        <ellipse cx="50" cy="56" rx="22" ry="30" fill="#B0703F" ${st()} transform="rotate(18 50 56)"/>
        <path d="M44 34 Q54 56 46 80" ${st(2.5)} fill="none" opacity=".4"/>
        <path d="M52 26 Q58 12 70 10" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round" fill="none"/>${leaf(66, 12, -20, 0.6)}
        ${face(50, 60, 'happy', 0.6)}`);
    S.hueso_aguacate = () => svg(`
        <path d="M50 8 C28 8 16 40 16 62 C16 82 32 94 50 94 C68 94 84 82 84 62 C84 40 72 8 50 8 Z" fill="#3E7A3A" ${st()}/>
        <path d="M50 16 C34 16 24 42 24 62 C24 78 36 86 50 86 C64 86 76 78 76 62 C76 42 66 16 50 16 Z" fill="#D8EFA0"/>
        <circle cx="50" cy="62" r="17" fill="#8C6A3F" ${st(3)}/>${shine(44, 56, 3, 5)}
        ${face(50, 64, 'happy', 0.55)}`);
    S.batido_energetico = () => svg(`
        <path d="M56 6 L64 30" ${st(4)} fill="none"/>
        <path d="M24 26 L76 26 L68 92 L32 92 Z" fill="#fff" ${st()}/>
        <path d="M26 40 L74 40 L68 92 L32 92 Z" fill="#9BD66A"/>
        <path d="M24 26 L76 26 L68 92 L32 92 Z" fill="none" ${st()}/>
        <path d="M44 52 L38 68 L50 66 L44 84" stroke="#FFE27A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M24 26 Q30 16 40 22 Q48 12 58 20 Q68 14 76 26" fill="#fff" ${st(3)}/>`);
    const juicer = (body, dish, juice) => `
        <path d="M10 60 Q10 86 50 88 Q90 86 90 60 Z" fill="${dish}" ${st()}/>
        <ellipse cx="50" cy="60" rx="40" ry="10" fill="${juice}" ${st()}/>
        <path d="M32 60 Q50 8 68 60 Z" fill="${body}" ${st()}/>
        <path d="M50 20 L42 58 M50 20 L50 60 M50 20 L58 58" ${st(2)} fill="none" opacity=".45"/>`;
    S.exprimir = () => svg(`
        ${juicer('#fff', '#E3E9F0', '#FFE27A')}
        <path d="M66 22 A18 18 0 0 1 96 30 Z" fill="#FFE27A" ${st(3)}/>
        ${drop(26, 38, 0.5, '#FFF4B8')}
        ${face(50, 76, 'happy', 0.6)}`);
    S.compostar = () => svg(`
        <path d="M14 56 L86 56 L78 92 L22 92 Z" fill="#8C6A3F" ${st()}/>
        <path d="M18 56 Q30 40 42 50 Q52 34 64 48 Q76 38 84 56" fill="#6E5A2A" ${st(3)}/>
        <path d="M40 46 q-8 -14 4 -22 q12 -6 14 6 q2 10 -6 12" stroke="#FFB8C6" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="56" cy="30" r="1.8" fill="${INK}"/>${leaf(66, 60, 10, 0.6)}
        <path d="M30 70 L70 70 M34 80 L66 80" ${st(2)} fill="none" opacity=".3"/>`);
    S.nube_polen = () => svg(`
        <path d="M20 66 Q6 66 8 52 Q10 40 24 42 Q26 24 44 26 Q54 12 70 24 Q88 22 88 40 Q98 44 94 56 Q92 66 80 66 Z" fill="#FFF1C2" ${st()}/>
        ${[[28, 50], [48, 40], [66, 46], [40, 56], [76, 56], [58, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#FFCF4D" ${st(1.5)}/>`).join('')}
        ${[[24, 80], [44, 88], [64, 82], [80, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#FFCF4D" ${st(1.8)}/>`).join('')}
        ${sparkle(88, 14, 0.7)}`);
    S.rayito_sol = () => svg(`${rays(50, 50, 30, 44, 12, '#FFB347', 6)}<circle cx="50" cy="50" r="26" fill="#FFE27A" ${st()}/>${face(50, 52, 'happy', 0.75)}`);
    S.corteza_coco = () => svg(`
        <path d="M50 8 L86 20 C86 56 74 80 50 92 C26 80 14 56 14 20 Z" fill="#8C6A3F" ${st()}/>
        <path d="M50 18 L76 27 C76 54 67 72 50 82 C33 72 24 54 24 27 Z" fill="#FFF6E9" ${st(2.5)}/>
        <path d="M22 36 L30 38 M20 50 L28 50 M78 36 L70 38 M80 50 L72 50" ${st(2)} fill="none" opacity=".45"/>
        <path d="M34 30 L40 32 M60 32 L66 30" ${st(2)} fill="none" opacity=".35"/>
        ${face(50, 52, 'happy', 0.85)}`);
    S.siembra = () => svg(`
        <path d="M12 76 Q50 64 88 76 L88 92 L12 92 Z" fill="#8C6A3F" ${st()}/>
        <path d="M30 72 L30 50 M50 68 L50 40 M70 72 L70 52" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>
        ${leaf(30, 52, -40, 0.6)}${leaf(50, 42, -60, 0.7)}${leaf(70, 54, -30, 0.6)}${leaf(50, 50, 200, 0.6)}
        ${sparkle(84, 20, 0.7)}`);
    S.catalizador_moho = () => svg(`
        <path d="M40 8 L60 8 L60 34 L82 82 Q86 92 74 92 L26 92 Q14 92 18 82 L40 34 Z" fill="#fff" ${st()}/>
        <path d="M30 62 L70 62 L80 84 Q82 90 74 90 L26 90 Q18 90 20 84 Z" fill="#9B7FD4"/>
        <path d="M40 8 L60 8 L60 34 L82 82 Q86 92 74 92 L26 92 Q14 92 18 82 L40 34 Z" fill="none" ${st()}/>
        <circle cx="42" cy="72" r="4" fill="#C7B4F0"/><circle cx="58" cy="80" r="3" fill="#C7B4F0"/><circle cx="54" cy="50" r="3" fill="#C7B4F0" ${st(1.5)}/>`);
    S.ensalada_escudo = () => svg(`
        <path d="M10 50 L90 50 Q88 88 50 90 Q12 88 10 50 Z" fill="#fff" ${st()}/>
        <path d="M16 50 Q20 30 36 36 Q42 20 56 30 Q70 20 76 36 Q88 34 84 50 Z" fill="#7BBF5A" ${st(3)}/>
        <circle cx="34" cy="44" r="6" fill="#F2667A" ${st(2)}/><circle cx="62" cy="42" r="6" fill="#F2667A" ${st(2)}/>
        ${face(50, 68, 'happy', 0.7)}`);
    S.semillero = () => svg(`
        <path d="M22 50 L78 50 L72 90 L28 90 Z" fill="#FF9E7A" ${st()}/>
        <rect x="18" y="42" width="64" height="10" rx="4" fill="#FF9E7A" ${st()}/>
        <path d="M50 44 L50 22" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>${leaf(50, 26, -150, 0.8)}${leaf(50, 24, -30, 0.8)}
        ${face(50, 68, 'happy', 0.7)}${sparkle(84, 16, 0.7)}`);
    S.sol_verano = () => svg(`
        <path d="M6 74 L94 74" ${st(4)} fill="none"/>
        <path d="M18 74 A32 32 0 0 1 82 74 Z" fill="#FFB347" ${st()}/>
        ${[200, 230, 270, 310, 340].map((d) => { const a = d * Math.PI / 180; return `<path d="M${(50 + Math.cos(a) * 40).toFixed(1)} ${(74 + Math.sin(a) * 40).toFixed(1)} L${(50 + Math.cos(a) * 50).toFixed(1)} ${(74 + Math.sin(a) * 50).toFixed(1)}" stroke="#FFCF4D" stroke-width="6" stroke-linecap="round"/>`; }).join('')}
        <path d="M14 86 L86 86 M28 94 L72 94" stroke="#8FD0F0" stroke-width="4" stroke-linecap="round"/>
        ${face(50, 60, 'happy', 0.7)}`);
    S.coraza_pitahaya = () => svg(`
        <ellipse cx="50" cy="56" rx="32" ry="36" fill="#F266A8" ${st()}/>
        ${[[24, 34, -40], [76, 34, 40], [18, 62, -80], [82, 62, 80], [36, 88, -140], [64, 88, 140], [50, 20, 0]].map(([x, y, r]) => `<path transform="rotate(${r} ${x} ${y})" d="M${x - 6} ${y + 6} Q${x} ${y - 14} ${x + 6} ${y + 6} Z" fill="#9BD66A" ${st(2.5)}/>`).join('')}
        ${face(50, 58, 'angry', 0.8)}`);
    S.podredumbre_noble = () => svg(`
        <path d="M42 56 L40 88 Q40 94 50 94 Q60 94 60 88 L58 56 Z" fill="#FFF6E9" ${st()}/>
        <path d="M10 60 Q12 12 50 10 Q88 12 90 60 Q70 66 50 64 Q30 66 10 60 Z" fill="#9B7FD4" ${st()}/>
        <circle cx="26" cy="36" r="6" fill="#E6DCF7"/><circle cx="70" cy="26" r="7" fill="#E6DCF7"/><circle cx="76" cy="48" r="4.5" fill="#E6DCF7"/>
        ${face(48, 44, 'wink', 0.7)}${sparkle(92, 12, 0.6)}`);
    S.fruta_magullada = () => svg(`
        <path d="M50 30 C34 17 10 25 13 53 C16 80 35 93 50 86 C65 93 84 80 87 53 C90 25 66 17 50 30 Z" fill="#C98A7A" ${st()}/>
        <ellipse cx="34" cy="54" rx="10" ry="8" fill="#8C5A6A" opacity=".7"/><ellipse cx="66" cy="68" rx="8" ry="6" fill="#8C5A6A" opacity=".7"/>
        <path d="M60 30 L74 44 M74 30 L60 44" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        ${face(50, 62, 'hurt', 0.8)}`);
    S.gusano_interior = () => svg(`
        <path d="M50 30 C34 17 10 25 13 53 C16 80 35 93 50 86 C65 93 84 80 87 53 C90 25 66 17 50 30 Z" fill="#F2667A" ${st()}/>
        <circle cx="56" cy="56" r="12" fill="#FFF6E9" ${st(3)}/>
        <path d="M56 58 q-6 -10 2 -16" stroke="#A7D86B" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="58" cy="42" r="1.6" fill="${INK}"/>
        ${face(34, 60, 'hurt', 0.6)}`);

    // =========================================================
    // ENEMIGOS — NIVEL 1
    // =========================================================
    S.babosa_viscosa = (o) => svg(`
        <ellipse cx="42" cy="90" rx="38" ry="6" fill="#E4F4D6" ${st(2.5)}/>
        <path d="M68 42 L64 16 M80 44 L86 18" ${st(3)} fill="none"/>
        <circle cx="64" cy="14" r="5" fill="#B7E27F" ${st(2.5)}/><circle cx="86" cy="16" r="5" fill="#B7E27F" ${st(2.5)}/>
        <path d="M8 88 Q6 76 20 74 L52 72 Q56 42 74 40 Q94 40 94 62 L94 80 Q94 88 86 88 Z" fill="#B7E27F" ${st()}/>
        <path d="M16 80 Q40 78 60 80" ${st(2)} fill="none" opacity=".35"/>
        <circle cx="30" cy="80" r="2.5" fill="#8FC25A"/><circle cx="44" cy="79" r="2" fill="#8FC25A"/>
        ${shine(64, 52, 3, 7)}
        ${face(76, 64, hurtOr(o), 0.72)}`);
    S.pulgon = (o) => svg(`
        ${legs('M34 74 L24 88 M50 78 L50 92 M66 74 L76 88')}
        <ellipse cx="50" cy="58" rx="30" ry="24" fill="#8CCB4E" ${st()}/>
        <path d="M38 36 Q30 18 20 16 M62 36 Q70 18 80 16" ${st(2.5)} fill="none"/>
        ${shine(36, 48, 3.5, 6)}${face(50, 60, hurtOr(o), 0.8)}`);
    S.cuervo_ladron = (o) => svg(`
        <path d="M40 90 L36 98 M62 90 L66 98" ${st(3)} fill="none"/>
        <path d="M46 30 L42 18 M54 28 L56 14 M62 30 L68 20" ${st(3)} fill="none"/>
        <circle cx="52" cy="58" r="30" fill="#4F4A66" ${st()}/>
        <path d="M78 52 L97 58 L78 65 Z" fill="#FFCF4D" ${st(3)}/>
        <path d="M30 52 Q10 58 14 82 Q32 82 46 68 Z" fill="#3E3A4F" ${st()}/>
        <path d="M34 48 Q56 40 80 48 L78 60 Q56 54 36 60 Z" fill="#2B2838" ${st(2.5)}/>
        ${o && o.mood === 'hurt' ? face(60, 55, 'hurt', 0.75, 'eyes') : `
        <ellipse cx="50" cy="53" rx="5" ry="4.5" fill="#fff"/><ellipse cx="68" cy="53" rx="5" ry="4.5" fill="#fff"/>
        <g class="eyes"><circle cx="51" cy="54" r="2.4" fill="${INK}"/><circle cx="69" cy="54" r="2.4" fill="${INK}"/></g>`}
        <circle cx="26" cy="88" r="8" fill="#FFCF4D" ${st(2.5)}/><ellipse cx="26" cy="88" rx="2.5" ry="4" fill="#E0A92E"/>
        ${shine(40, 72, 3, 6)}`);
    S.topo_excavador = (o) => svg(`
        <path d="M6 92 Q20 70 50 70 Q80 70 94 92 Z" fill="#B0703F" ${st()}/>
        <ellipse cx="50" cy="54" rx="30" ry="32" fill="#7A6A6A" ${st()}/>
        <ellipse cx="50" cy="66" rx="12" ry="9" fill="#FFB8C6" ${st(3)}/>
        <path d="M18 64 L8 58 M18 70 L6 70 M82 64 L92 58 M82 70 L94 70" ${st(2.5)} fill="none"/>
        <path d="M24 78 L16 86 L26 88 L32 80 M76 78 L84 86 L74 88 L68 80" fill="#FFF6E9" ${st(2.5)}/>
        <rect x="30" y="34" width="40" height="8" rx="4" fill="#FFCF4D" ${st(2.5)}/>
        ${face(50, 48, hurtOr(o), 0.75)}`);
    S.oruga_reina = (o) => svg(`
        <circle cx="16" cy="80" r="11" fill="#9BD66A" ${st()}/><circle cx="32" cy="76" r="13" fill="#B7E27F" ${st()}/>
        <circle cx="50" cy="70" r="14" fill="#9BD66A" ${st()}/>
        ${legs('M14 90 L12 96 M30 88 L30 96 M48 84 L48 94')}
        <circle cx="70" cy="48" r="24" fill="#B7E27F" ${st()}/>
        <path d="M54 26 L58 12 L64 22 L70 8 L76 22 L82 12 L86 26 Z" fill="#FFCF4D" ${st(3)}/>
        <circle cx="70" cy="16" r="3" fill="#F2667A" ${st(1.5)}/>
        ${shine(58, 40, 3.5, 6)}${face(70, 52, hurtOr(o), 0.85)}`);
    S.mariposa_reina = (o) => svg(`
        <path d="M50 44 Q20 4 8 26 Q2 50 46 54 Z" fill="#9B7FD4" ${st()}/>
        <path d="M50 44 Q80 4 92 26 Q98 50 54 54 Z" fill="#9B7FD4" ${st()}/>
        <path d="M46 56 Q16 60 18 82 Q30 94 48 66 Z" fill="#F2667A" ${st()}/>
        <path d="M54 56 Q84 60 82 82 Q70 94 52 66 Z" fill="#F2667A" ${st()}/>
        <circle cx="26" cy="28" r="6" fill="#FFE27A"/><circle cx="74" cy="28" r="6" fill="#FFE27A"/>
        <ellipse cx="50" cy="58" rx="9" ry="26" fill="#B7E27F" ${st()}/>
        <path d="M42 22 L44 14 L48 20 L50 12 L52 20 L56 14 L58 22 Z" fill="#FFCF4D" ${st(2.5)}/>
        ${face(50, 44, hurtOr(o), 0.5)}${sparkle(90, 60, 0.6)}${sparkle(10, 60, 0.6, '#FFB8C6')}`);

    // =========================================================
    // ENEMIGOS — NIVEL 2
    // =========================================================
    S.rata_mercado = (o) => svg(`
        <path d="M14 76 Q2 70 6 56 Q10 46 4 40" ${st(3)} fill="none" stroke="#FFB8C6"/>
        <ellipse cx="50" cy="66" rx="34" ry="24" fill="#A8A0A0" ${st()}/>
        <circle cx="72" cy="30" r="12" fill="#A8A0A0" ${st()}/><circle cx="72" cy="30" r="6" fill="#FFB8C6"/>
        <circle cx="36" cy="32" r="12" fill="#A8A0A0" ${st()}/><circle cx="36" cy="32" r="6" fill="#FFB8C6"/>
        <ellipse cx="54" cy="50" rx="24" ry="20" fill="#BDB5B5" ${st()}/>
        <circle cx="54" cy="64" r="4" fill="#F2667A" ${st(1.5)}/>
        <path d="M40 62 L26 58 M40 66 L26 68 M68 62 L82 58 M68 66 L82 68" ${st(1.5)} fill="none"/>
        ${face(54, 50, hurtOr(o), 0.7)}`);
    S.tenedor_gloton = (o) => svg(`
        <path d="M30 6 L30 34 M43 6 L43 34 M57 6 L57 34 M70 6 L70 34" ${st(6)} fill="none" stroke="#C9D3DC"/>
        <path d="M30 6 L30 34 M43 6 L43 34 M57 6 L57 34 M70 6 L70 34" ${st(2)} fill="none"/>
        <path d="M26 30 Q26 52 50 54 Q74 52 74 30 Z" fill="#E3E9F0" ${st()}/>
        <rect x="42" y="52" width="16" height="42" rx="8" fill="#F2667A" ${st()}/>
        ${shine(34, 38, 2.5, 5)}${face(50, 40, hurtOr(o), 0.7)}`);
    S.pelador_oxidado = (o) => svg(`
        <rect x="40" y="56" width="20" height="38" rx="8" fill="#5CC9A7" ${st()}/>
        <path d="M18 10 Q50 0 82 10 L82 58 L18 58 Z" fill="#C9A27A" ${st()}/>
        <rect x="28" y="18" width="44" height="30" rx="6" fill="#FBF4E4" ${st(3)}/>
        <path d="M32 44 L68 44" ${st(2)} fill="none" opacity=".35"/>
        <circle cx="24" cy="52" r="3" fill="#B0703F"/><circle cx="76" cy="16" r="3.5" fill="#B0703F"/><circle cx="74" cy="50" r="2.5" fill="#B0703F"/>
        ${face(50, 32, hurtOr(o), 0.7)}`);
    S.hormiga_obrera = (o) => svg(`
        ${legs('M30 66 L16 80 M42 70 L34 90 M58 70 L66 90 M70 66 L86 80')}
        <path d="M56 22 L66 10 L84 14 L86 28 L70 32 Z" fill="#FFE27A" ${st(2.5)}/>
        <path d="M62 36 Q56 28 50 30 M80 34 Q88 30 92 36" ${st(2.5)} fill="none"/>
        <ellipse cx="22" cy="62" rx="16" ry="13" fill="#B0463A" ${st()}/>
        <ellipse cx="46" cy="64" rx="12" ry="10" fill="#B0463A" ${st()}/>
        <circle cx="70" cy="52" r="17" fill="#C8584A" ${st()}/>
        ${shine(16, 56, 3, 5)}${face(70, 54, hurtOr(o), 0.6)}`);
    S.cuchillo_carnicero = (o) => svg(`
        <path d="M14 14 L84 14 L84 58 Q50 70 14 58 Z" fill="#E3E9F0" ${st()}/>
        <circle cx="74" cy="24" r="5" fill="#fff" ${st(2.5)}/>
        <path d="M18 54 Q50 64 82 54" ${st(2)} fill="none" opacity=".4"/>
        <rect x="38" y="58" width="24" height="36" rx="8" fill="#8C6A3F" ${st()}/>
        <circle cx="50" cy="70" r="2.5" fill="#E3E9F0"/><circle cx="50" cy="82" r="2.5" fill="#E3E9F0"/>
        ${shine(26, 26, 3, 7)}${face(48, 36, hurtOr(o), 0.85)}`);
    S.rallador_furioso = (o) => svg(`
        <path d="M22 16 L78 16 L88 92 L12 92 Z" fill="#C9D3DC" ${st()}/>
        ${[[34, 40], [50, 40], [66, 40], [30, 76], [48, 80], [68, 76]].map(([x, y]) => `<path d="M${x - 5} ${y} Q${x} ${y - 7} ${x + 5} ${y}" ${st(2.5)} fill="#fff"/>`).join('')}
        <path d="M36 16 Q36 4 50 4 Q64 4 64 16" ${st(4)} fill="none"/>
        ${shine(28, 30, 2.5, 7, -8)}${face(50, 58, hurtOr(o), 0.75)}`);
    S.chef_cuchilla = (o) => svg(`
        <path d="M26 30 Q16 8 36 10 Q44 0 56 8 Q72 0 76 14 Q88 16 76 32 Z" fill="#fff" ${st()}/>
        <rect x="26" y="28" width="50" height="10" rx="3" fill="#fff" ${st(3)}/>
        <circle cx="51" cy="60" r="26" fill="#FFB38A" ${st()}/>
        <path d="M36 70 Q44 64 51 70 Q58 64 66 70 Q58 76 51 72 Q44 76 36 70 Z" fill="${INK}"/>
        <path d="M78 58 L96 40 L98 50 L84 66 Z" fill="#E3E9F0" ${st(3)}/>
        <rect x="74" y="62" width="10" height="18" rx="4" fill="#8C6A3F" ${st(3)} transform="rotate(40 79 71)"/>
        <path d="M20 94 Q24 84 36 84 L66 84 Q78 84 82 94" fill="#fff" ${st()}/>
        ${face(51, 56, hurtOr(o), 0.7)}`);

    // =========================================================
    // ENEMIGOS — NIVEL 3
    // =========================================================
    S.exprimidor_mecanico = (o) => svg(`
        <rect x="16" y="78" width="68" height="16" rx="4" fill="#9B7FD4" ${st()}/>
        <rect x="44" y="20" width="12" height="60" fill="#C9D3DC" ${st(3)}/>
        <path d="M18 20 L82 20 L78 8 L22 8 Z" fill="#9B7FD4" ${st()}/>
        <path d="M28 62 Q28 40 50 36 Q72 40 72 62 Z" fill="#FFE27A" ${st()}/>
        <path d="M34 60 L66 60" ${st(2)} fill="none" opacity=".4"/>
        <circle cx="26" cy="86" r="3.5" fill="#FFCF4D"/><circle cx="74" cy="86" r="3.5" fill="#F2667A"/>
        ${face(50, 50, hurtOr(o), 0.7)}`);
    S.tapa_saltarina = (o) => svg(`
        ${spikes(50, 54, 40, 14, '#F2667A')}
        <circle cx="50" cy="54" r="27" fill="#FF8FA3" ${st(3)}/>
        ${shine(38, 42, 3.5, 7)}${face(50, 56, hurtOr(o), 0.8)}`);
    S.batidora_mano = (o) => {
        const whisk = (x) => `
            <path d="M${x} 58 L${x} 66 M${x} 66 Q${x - 12} 82 ${x} 96 Q${x + 12} 82 ${x} 66 M${x} 66 L${x} 96" stroke="#C9D3DC" stroke-width="6" stroke-linecap="round" fill="none"/>
            <path d="M${x} 58 L${x} 66 M${x} 66 Q${x - 12} 82 ${x} 96 Q${x + 12} 82 ${x} 66 M${x} 66 L${x} 96" ${st(2)} fill="none"/>`;
        return svg(`
            ${whisk(38)}${whisk(62)}
            <path d="M30 22 Q30 8 50 8 Q70 8 70 22" ${st(6)} fill="none" stroke="#3E9E82"/>
            <path d="M30 22 Q30 8 50 8 Q70 8 70 22" ${st(2)} fill="none"/>
            <rect x="16" y="20" width="68" height="40" rx="16" fill="#5CC9A7" ${st()}/>
            <circle cx="76" cy="30" r="3" fill="#FFCF4D" ${st(1.5)}/>
            ${shine(26, 32, 3, 6)}${face(48, 42, hurtOr(o), 0.75)}`);
    };
    S.pajita_vampira = (o) => svg(`
        <path d="M14 90 L28 44 L50 58 L72 44 L86 90 Z" fill="#5A3E7A" ${st()}/>
        <path d="M62 34 L62 8 L84 8" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M62 34 L62 8 L84 8" ${st(2)} fill="none"/>
        <path d="M57 26 L67 26 M57 16 L67 16 M72 3 L72 13" stroke="#F2667A" stroke-width="4"/>
        <circle cx="50" cy="60" r="26" fill="#F2667A" ${st()}/>
        ${shine(38, 48, 3.5, 7)}${face(50, 56, hurtOr(o), 0.7, 'eyes')}${fangMouth(50, 65, 1.15)}`);
    S.cortadora_industrial = (o) => svg(`
        ${spikes(50, 50, 44, 12, '#C9D3DC')}
        <circle cx="50" cy="50" r="30" fill="#8C857C" ${st()}/>
        <circle cx="50" cy="50" r="8" fill="#FFCF4D" ${st(3)}/>
        <path d="M26 36 L74 36" stroke="#FFCF4D" stroke-width="6"/><path d="M26 36 L74 36" ${st(1.5)} fill="none" stroke-dasharray="6 6"/>
        ${face(50, 60, hurtOr(o), 0.7)}`);
    S.congelador_gelido = (o) => svg(`
        <rect x="18" y="8" width="64" height="86" rx="10" fill="#CDEBF5" ${st()}/>
        <path d="M18 40 L82 40" ${st(3)} fill="none"/>
        <rect x="70" y="16" width="6" height="16" rx="3" fill="#fff" ${st(2)}/><rect x="70" y="48" width="6" height="22" rx="3" fill="#fff" ${st(2)}/>
        <path d="M26 94 L26 100 M74 94 L74 100" ${st(3)} fill="none"/>
        <path d="M24 8 L28 18 L32 8 M56 8 L60 20 L64 8" fill="#fff" ${st(2)}/>
        ${shine(28, 54, 3, 9)}${face(48, 64, hurtOr(o), 0.8)}${sparkle(88, 16, 0.6, '#fff')}`);
    S.licuadora_turbo = (o) => svg(`
        ${rays(50, 48, 42, 50, 16, '#F2667A', 4)}
        ${S.licuadora_suprema(o).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/#CDEBF5/g, '#FFD6DC').replace(/#9B7FD4/g, '#F2667A')}
        <path d="M30 30 L22 20 M70 30 L78 20" stroke="#FFCF4D" stroke-width="5" stroke-linecap="round"/>`);

    // =========================================================
    // RELIQUIAS NUEVAS
    // =========================================================
    S.tijeras_poda = () => svg(`
        <path d="M48 54 Q34 72 26 94" stroke="#F2667A" stroke-width="11" stroke-linecap="round" fill="none"/>
        <path d="M52 54 Q66 72 74 94" stroke="#F2667A" stroke-width="11" stroke-linecap="round" fill="none"/>
        <path d="M48 54 Q34 72 26 94 M52 54 Q66 72 74 94" ${st(2.5)} fill="none" opacity=".5"/>
        <path d="M40 74 L46 70 L42 66 L50 62 L46 58" ${st(2.5)} fill="none"/>
        <path d="M50 54 L18 8 Q34 10 58 44 Z" fill="#E3E9F0" ${st()}/>
        <path d="M50 54 L82 8 Q66 10 42 44 Z" fill="#E3E9F0" ${st()}/>
        <circle cx="50" cy="50" r="5" fill="#FFCF4D" ${st(2.5)}/>`);
    S.corona_pina = () => svg(`
        <path d="M50 44 Q40 20 28 12 Q46 18 50 36 Q54 18 72 12 Q60 20 50 44 Z" fill="#7BBF5A" ${st(3)}/>
        <path d="M50 42 Q48 22 50 4 Q56 22 52 42 Z" fill="#9BD66A" ${st(3)}/>
        <path d="M16 88 L16 50 L32 64 L50 42 L68 64 L84 50 L84 88 Z" fill="#FFCF4D" ${st()}/>
        <rect x="14" y="78" width="72" height="12" rx="4" fill="#E0A92E" ${st(3)}/>
        <circle cx="32" cy="72" r="4" fill="#F2667A" ${st(2)}/><circle cx="50" cy="68" r="4.5" fill="#5CC9A7" ${st(2)}/><circle cx="68" cy="72" r="4" fill="#9B7FD4" ${st(2)}/>`);
    S.saco_abono = () => svg(`
        <path d="M24 30 Q14 60 20 86 Q50 96 80 86 Q86 60 76 30 Z" fill="#E8C49A" ${st()}/>
        <path d="M24 30 Q50 20 76 30 L70 22 Q50 14 30 22 Z" fill="#C9A27A" ${st(3)}/>
        <path d="M50 20 L50 6" stroke="#7BBF5A" stroke-width="5" stroke-linecap="round"/>${leaf(50, 8, -150, 0.6)}${leaf(50, 8, -30, 0.6)}
        <path d="M36 56 L64 56 M40 66 L60 66" ${st(3)} fill="none" opacity=".5"/>`);
    S.regadera = () => svg(`
        <path d="M24 40 L70 40 L66 86 L28 86 Z" fill="#5CC9A7" ${st()}/>
        <path d="M68 50 L92 26" ${st(7)} fill="none" stroke="#5CC9A7"/><path d="M68 50 L92 26" ${st(2.5)} fill="none"/>
        <ellipse cx="92" cy="24" rx="6" ry="4" fill="#5CC9A7" ${st(2.5)}/>
        <path d="M26 46 Q8 50 12 70 Q14 78 26 76" ${st(4)} fill="none"/>
        ${drop(88, 44, 0.4, '#8FD0F0')}${drop(96, 52, 0.35, '#8FD0F0')}`);
    S.hueso_durazno = () => svg(`
        <ellipse cx="50" cy="54" rx="26" ry="34" fill="#C9804A" ${st()}/>
        <path d="M36 30 Q44 40 38 54 Q46 64 38 78 M62 30 Q54 44 62 56 Q54 66 62 78" ${st(2.5)} fill="none" opacity=".5"/>
        ${sparkle(82, 20, 0.8)}`);
    S.compostera = () => svg(`
        <path d="M66 26 Q68 8 80 8 Q90 8 90 18" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M66 26 Q68 8 80 8 Q90 8 90 18" stroke="#FFB8C6" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="88" cy="16" r="1.8" fill="${INK}"/>
        <path d="M22 34 L78 34 L72 92 L28 92 Z" fill="#7BBF5A" ${st()}/>
        <path d="M38 42 L40 84 M50 42 L50 84 M62 42 L60 84" stroke="#5E9E48" stroke-width="3"/>
        <path d="M14 24 L86 24 L84 36 L16 36 Z" fill="#5E9E48" ${st()}/>
        ${leaf(36, 62, -30, 1.2, '#E4F4D6')}`);
    S.limon_contagioso = () => svg(`
        <ellipse cx="46" cy="54" rx="32" ry="24" fill="#D8E86A" ${st()} transform="rotate(-20 46 54)"/>
        <circle cx="34" cy="50" r="5" fill="#9B7FD4"/><circle cx="54" cy="62" r="4" fill="#9B7FD4"/>
        <circle cx="80" cy="26" r="6" fill="#C7B4F0" ${st(2)}/><circle cx="90" cy="44" r="4" fill="#C7B4F0" ${st(2)}/>
        ${face(46, 54, 'sour', 0.7)}`);
    S.hueso_mango = () => svg(`
        <ellipse cx="50" cy="54" rx="24" ry="36" fill="#FFF1C2" ${st()} transform="rotate(20 50 54)"/>
        <path d="M34 30 L66 78 M30 44 L60 86 M44 22 L72 64" stroke="#E0C77A" stroke-width="3" stroke-linecap="round"/>
        ${shine(40, 40, 3, 7)}`);
    S.caparazon_caracol = () => svg(`
        <path d="M6 88 Q20 80 40 82 L94 86 L92 92 L8 92 Z" fill="#FFD27A" ${st(3)}/>
        <circle cx="52" cy="52" r="32" fill="#E89A5A" ${st()}/>
        <path d="M52 52 a4 4 0 0 1 8 0 a8 8 0 0 1 -16 0 a12 12 0 0 1 24 0 a16 16 0 0 1 -32 0 a20 20 0 0 1 40 0 a24 24 0 0 1 -48 0" ${st(3)} fill="none"/>
        ${shine(36, 36, 3, 6)}`);
    S.nuez_dura = () => svg(`
        <ellipse cx="50" cy="52" rx="34" ry="38" fill="#C9A27A" ${st()}/>
        <path d="M50 14 L50 90 M26 30 Q40 44 30 60 Q40 72 30 82 M74 30 Q60 44 70 60 Q60 72 70 82" ${st(3)} fill="none" opacity=".6"/>
        ${shine(34, 34, 3.5, 8)}`);
    S.canasta_tejida = () => svg(`
        <path d="M22 40 Q22 10 50 10 Q78 10 78 40" ${st(5)} fill="none" stroke="#C9804A"/>
        <path d="M22 40 Q22 10 50 10 Q78 10 78 40" ${st(1.5)} fill="none"/>
        <path d="M10 40 L90 40 L80 90 L20 90 Z" fill="#E8B87A" ${st()}/>
        <path d="M14 56 L86 56 M17 72 L83 72 M34 40 L36 90 M50 40 L50 90 M66 40 L64 90" stroke="#C9804A" stroke-width="3"/>
        <circle cx="38" cy="36" r="9" fill="#F2667A" ${st(2.5)}/><circle cx="60" cy="34" r="9" fill="#FFCF4D" ${st(2.5)}/>`);
    S.brote_eterno = () => svg(`
        <path d="M50 92 L50 40" stroke="#7BBF5A" stroke-width="7" stroke-linecap="round"/>
        ${leaf(50, 60, -150, 1.3)}${leaf(50, 46, -30, 1.3)}${leaf(50, 32, -100, 1)}
        <path d="M20 92 L80 92" ${st(4)} fill="none"/>${sparkle(82, 20, 0.9)}${sparkle(20, 30, 0.6, '#fff')}`);
    S.chile_picante = () => svg(`
        <path d="M70 16 Q80 8 88 12" ${st(4)} fill="none" stroke="#7BBF5A"/>
        <path d="M68 18 Q84 30 74 52 Q60 82 16 90 Q30 70 44 50 Q56 30 68 18 Z" fill="#E0455E" ${st()}/>
        ${shine(58, 36, 3, 8, 30)}${face(56, 54, 'angry', 0.6)}`);
    S.frasco_almibar = () => svg(`
        <rect x="30" y="8" width="40" height="14" rx="4" fill="#B0703F" ${st()}/>
        <path d="M26 22 L74 22 Q84 30 84 44 L84 82 Q84 92 74 92 L26 92 Q16 92 16 82 L16 44 Q16 30 26 22 Z" fill="#FFF6E9" ${st()}/>
        <path d="M18 50 Q34 42 50 50 Q66 58 82 50 L82 82 Q82 90 74 90 L26 90 Q18 90 18 82 Z" fill="#FFB938"/>
        ${shine(26, 36, 3, 7)}${face(50, 70, 'happy', 0.7)}`);
    S.exprimidor_dorado = () => svg(`
        ${juicer('#FFE27A', '#FFCF4D', '#FFF1C2')}
        ${shine(42, 40, 2.5, 7, 10)}
        ${sparkle(84, 20, 1)}${sparkle(16, 28, 0.7, '#fff')}`);
    S.ojo_papaya = () => svg(`
        <ellipse cx="50" cy="50" rx="42" ry="30" fill="#FF9E5A" ${st()}/>
        <ellipse cx="50" cy="50" rx="30" ry="20" fill="#FFB87A"/>
        <circle cx="50" cy="50" r="13" fill="${INK}"/>${shine(45, 45, 3, 4)}
        ${[-16, -6, 6, 16].map((dx) => `<circle cx="${50 + dx}" cy="${dx % 2 ? 30 : 70}" r="2.5" fill="${INK}"/>`).join('')}`);
    S.corazon_durian = () => svg(`
        ${spikes(50, 52, 44, 16, '#9BD66A')}
        <path d="M50 80 C28 64 22 50 26 40 C30 30 44 30 50 42 C56 30 70 30 74 40 C78 50 72 64 50 80 Z" fill="#FFE27A" ${st(3)}/>`);
    S.savia_arce = () => svg(`
        <path d="M50 8 L58 28 L76 20 L70 40 L92 42 L74 56 L82 74 L60 66 L54 92 L46 92 L40 66 L18 74 L26 56 L8 42 L30 40 L24 20 L42 28 Z" fill="#E0455E" ${st()}/>
        ${drop(50, 50, 1.1, '#FFB938')}`);

    // =========================================================
    // EVENTOS NUEVOS
    // =========================================================
    S.arbol_sabio = () => svg(`
        <rect x="40" y="56" width="20" height="36" rx="4" fill="#8C6A3F" ${st()}/>
        <circle cx="50" cy="38" r="32" fill="#7BBF5A" ${st()}/>
        <circle cx="28" cy="26" r="6" fill="#F2667A" ${st(2)}/><circle cx="72" cy="30" r="6" fill="#F2667A" ${st(2)}/><circle cx="56" cy="14" r="5" fill="#F2667A" ${st(2)}/>
        ${face(50, 72, 'sleepy', 0.6)}`);
    S.monton_compost = () => S.compostar();
    S.gota_rocio = () => svg(`${drop(50, 52, 3.1, '#CDEBF5')}${shine(38, 50, 5, 12)}${face(52, 64, 'happy', 0.75)}${sparkle(84, 18, 0.8)}`);
    S.puesto_abandonado = () => S.node_shop();
    S.tanque_jugo = () => svg(`
        <rect x="20" y="16" width="60" height="72" rx="14" fill="#C9D3DC" ${st()}/>
        <path d="M22 50 Q50 40 78 50 L78 74 Q78 86 66 86 L34 86 Q22 86 22 74 Z" fill="#FFA64D"/>
        <rect x="20" y="16" width="60" height="72" rx="14" fill="none" ${st()}/>
        <path d="M80 60 L92 60 L92 70" ${st(4)} fill="none"/>${drop(92, 80, 0.45, '#FFA64D')}
        ${face(50, 66, 'happy', 0.7)}`);

    // =========================================================
    // MAPA, DIFICULTAD Y PORTADAS DE NIVEL
    // =========================================================
    S.node_elite = () => svg(`
        <path d="M50 8 C66 26 84 38 80 62 C76 84 60 92 50 92 C40 92 24 84 20 62 C16 38 34 26 50 8 Z" fill="#FF7A5A" ${st()}/>
        <path d="M50 38 C58 48 66 56 62 70 C58 80 42 80 38 70 C34 56 42 48 50 38 Z" fill="#FFE27A"/>
        <path d="M34 60 L46 52 M66 60 L54 52" ${st(3.5)} fill="none"/>
        <path d="M40 76 Q50 70 60 76" ${st(3)} fill="none"/>`);

    const apple = (color, mood, extra) => svg(`
        <path d="M50 30 C47 22 49 15 54 10" ${st()} fill="none"/>${leaf(53, 17, -30, 0.9, extra && extra.leaf)}
        <path d="M50 30 C34 17 10 25 13 53 C16 80 35 93 50 86 C65 93 84 80 87 53 C90 25 66 17 50 30 Z" fill="${color}" ${st()}/>
        ${extra && extra.spots ? extra.spots : ''}${shine(29, 44, 4.5, 8)}${face(50, 59, mood)}`);
    S.dif_verde = () => apple('#9BD66A', 'happy');
    S.dif_madura = () => apple('#F2667A', 'wink');
    S.dif_pasada = () => apple('#C9804A', 'sour', { spots: `<circle cx="30" cy="66" r="5" fill="#8C5A3A"/><circle cx="70" cy="40" r="4" fill="#8C5A3A"/>` });
    S.dif_podrida = () => apple('#8C7A5A', 'hurt', {
        leaf: '#8C857C',
        spots: `<circle cx="28" cy="60" r="8" fill="#6E5A2A"/><circle cx="72" cy="66" r="7" fill="#6E5A2A"/><circle cx="84" cy="22" r="5" fill="#C7B4F0" ${st(2)}/>`
    });

    S.act_huerto = () => svg(`
        <path d="M4 80 Q50 66 96 80 L96 96 L4 96 Z" fill="#9BD66A" ${st()}/>
        <rect x="22" y="48" width="10" height="30" fill="#8C6A3F" ${st(3)}/><circle cx="27" cy="36" r="18" fill="#7BBF5A" ${st()}/>
        <circle cx="20" cy="32" r="4" fill="#F2667A" ${st(2)}/><circle cx="34" cy="40" r="4" fill="#F2667A" ${st(2)}/>
        <rect x="64" y="52" width="10" height="26" fill="#8C6A3F" ${st(3)}/><circle cx="69" cy="42" r="15" fill="#7BBF5A" ${st()}/>
        <circle cx="72" cy="38" r="4" fill="#FFCF4D" ${st(2)}/>${sparkle(86, 12, 0.7)}`);
    S.act_mercado = () => svg(`
        <rect x="14" y="40" width="72" height="50" fill="#FFF6E9" ${st()}/>
        <path d="M8 22 L92 22 L92 40 L8 40 Z" fill="#fff" ${st()}/>
        <path d="M8 22 L22 22 L22 40 L8 40 Z M36 22 L50 22 L50 40 L36 40 Z M64 22 L78 22 L78 40 L64 40 Z" fill="#F2667A"/>
        <path d="M8 22 L92 22 L92 40 L8 40 Z" fill="none" ${st()}/>
        <rect x="22" y="58" width="56" height="18" rx="3" fill="#E8C49A" ${st(3)}/>
        <circle cx="34" cy="56" r="6" fill="#FFCF4D" ${st(2)}/><circle cx="50" cy="55" r="6" fill="#9BD66A" ${st(2)}/><circle cx="66" cy="56" r="6" fill="#FFA64D" ${st(2)}/>`);
    S.act_fabrica = () => svg(`
        <path d="M6 92 L6 50 L28 36 L28 50 L50 36 L50 50 L72 36 L72 92 Z" fill="#C9D3DC" ${st()}/>
        <rect x="76" y="14" width="14" height="78" fill="#9B7FD4" ${st()}/>
        <circle cx="84" cy="8" r="6" fill="#fff" ${st(2)}/><circle cx="92" cy="2" r="4" fill="#fff" ${st(2)}/>
        <rect x="14" y="62" width="12" height="12" fill="#FFE27A" ${st(2.5)}/><rect x="36" y="62" width="12" height="12" fill="#FFE27A" ${st(2.5)}/>
        <rect x="56" y="62" width="10" height="30" fill="#8C857C" ${st(2.5)}/>`);
})();
