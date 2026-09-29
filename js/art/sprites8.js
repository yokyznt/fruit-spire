// ============================================================
// SPRITES8.JS — Enemigos con mecánicas nuevas (Provocación, Rabia,
// Caparazón, Agotamiento, Robacartas, Plaga) y los íconos de esos
// estados. Mismo estilo sticker.
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, sparkle, face } = window.SPRITE_KIT;
    const { tube, eyesOnly, eyeball, spikes, crown, suit, cardShape, chessPiece, hurtOr, isHurt } = window.SPRITE_KIT2;
    const legs = (d, w) => `<path d="${d}" ${st(w || 3)} fill="none"/>`;
    const shieldShape = (x, y, s, fill, emblem) => `<g transform="translate(${x} ${y}) scale(${s})">
        <path d="M0 -20 L18 -14 L18 2 Q18 18 0 26 Q-18 18 -18 2 L-18 -14 Z" fill="${fill}" ${st(3)}/>${emblem || ''}</g>`;

    // =========================================================
    // ÍCONOS DE LAS MECÁNICAS NUEVAS
    // =========================================================
    S.ui_book = () => svg(`
        <path d="M50 30 Q32 18 10 22 L10 80 Q32 76 50 88 Q68 76 90 80 L90 22 Q68 18 50 30 Z" fill="#8C5A3C" ${st(4)}/>
        <path d="M50 30 Q34 20 16 24 L16 74 Q34 72 50 82 Z" fill="#FFF8EC" ${st(3)}/>
        <path d="M50 30 Q66 20 84 24 L84 74 Q66 72 50 82 Z" fill="#FFF3DC" ${st(3)}/>
        <path d="M50 30 L50 84" ${st(3)} fill="none"/>
        <path d="M22 36 Q30 34 40 38 M22 46 Q30 44 40 48 M22 56 Q30 54 38 58" stroke="#C9B38F" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <ellipse cx="68" cy="52" rx="10" ry="8" fill="#7BBF5A" ${st(2.5)}/>
        <circle cx="76" cy="44" r="6" fill="#7BBF5A" ${st(2.5)}/>
        <path d="M74 38 Q72 32 70 31 M78 38 Q80 32 83 31" ${st(2)} fill="none"/>
        <circle cx="75" cy="44" r="1.6" fill="${INK}"/><circle cx="78.5" cy="44" r="1.6" fill="${INK}"/>
        <path d="M60 58 L57 63 M66 60 L65 65 M72 59 L74 64" ${st(2)} fill="none"/>
        <path d="M58 16 L58 34 L63 30 L68 34 L68 16" fill="#E0455E" ${st(2.5)}/>`);
    S.st_taunt = () => svg(`
        ${shieldShape(50, 48, 1.8, '#5A6FB0')}
        <path d="M50 26 L50 52" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="66" r="5" fill="#fff"/>`);
    S.st_rage = () => svg(`
        <path d="M30 20 Q44 30 40 44 Q26 44 20 30 Z M70 20 Q56 30 60 44 Q74 44 80 30 Z M30 80 Q44 70 40 56 Q26 56 20 70 Z M70 80 Q56 70 60 56 Q74 56 80 70 Z" fill="#E0455E" ${st(3.5)}/>`);
    S.st_shell = () => svg(`
        <path d="M10 70 Q12 22 50 20 Q88 22 90 70 Z" fill="#7BAE4A" ${st(4)}/>
        <path d="M50 22 L50 70 M30 30 L36 46 L50 50 L64 46 L70 30 M20 58 L36 46 M80 58 L64 46" ${st(3)} fill="none"/>
        <path d="M6 70 L94 70" ${st(5)} fill="none"/>`);
    S.st_drained = () => svg(`
        <rect x="18" y="26" width="60" height="48" rx="8" fill="#F4F0FF" ${st(4)}/>
        <rect x="78" y="40" width="8" height="20" rx="3" fill="#F4F0FF" ${st(3)}/>
        <rect x="26" y="34" width="12" height="32" rx="3" fill="#E0455E"/>
        <path d="M54 30 L46 50 L58 50 L50 70" stroke="#FFCF4D" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    S.st_breed = () => svg(`
        <ellipse cx="34" cy="60" rx="18" ry="24" fill="#FFF6E9" ${st(4)}/>
        <ellipse cx="66" cy="56" rx="18" ry="24" fill="#F2E6FF" ${st(4)}/>
        <path d="M52 50 L58 56 L64 48 L70 56 L78 48" ${st(3)} fill="none"/>
        <circle cx="30" cy="54" r="3" fill="#9B7FD4"/><circle cx="38" cy="66" r="2.5" fill="#9B7FD4"/>`);
    S.st_thief = () => svg(`
        ${cardShape(36, 10, 40, 58, 14)}<g transform="rotate(14 56 39)">${suit('heart', 56, 38, 0.8)}</g>
        <path d="M14 90 Q10 66 24 56 L40 50 Q48 48 50 56 Q52 62 44 64 L38 66 Q44 70 44 78 Q44 90 30 92 Z" fill="#4F4A66" ${st(3.5)}/>`);

    // =========================================================
    // ENEMIGOS
    // =========================================================
    S.pavo_guardian = (o) => svg(`
        ${[-60, -36, -12, 12, 36, 60].map((a, i) => `<ellipse cx="50" cy="20" rx="11" ry="24" fill="${['#C8584A', '#E89A5A', '#FFCF4D', '#E89A5A', '#C8584A', '#8C5A2E'][i]}" ${st(2.5)} transform="rotate(${a} 50 56)"/>`).join('')}
        ${tube('M42 84 L40 96 M58 84 L60 96', '#FFA64D', 3.5)}
        <ellipse cx="50" cy="66" rx="24" ry="22" fill="#8C5A3A" ${st()}/>
        <circle cx="50" cy="38" r="14" fill="#B0703F" ${st()}/>
        <path d="M44 42 L56 42 L50 50 Z" fill="#FFCF4D" ${st(2)}/>
        <path d="M54 46 Q60 56 54 60 Q50 54 52 48" fill="#E0455E" ${st(2)}/>
        ${eyesOnly(50, 36, hurtOr(o), 0.5)}
        ${shieldShape(24, 74, 0.9, '#5A6FB0', `<path d="M0 -12 L0 12 M-10 0 L10 0" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round"/>`)}
        ${shine(40, 60, 3, 7)}`);

    S.tortuga_escudo = (o) => svg(`
        <path d="M14 76 Q4 84 8 92 L22 90 Z M86 76 Q96 84 92 92 L78 90 Z" fill="#9BD66A" ${st(3)}/>
        <path d="M80 60 Q98 58 96 72 Q92 80 80 76" fill="#9BD66A" ${st()}/>
        ${eyeball(88, 66, 4.5, isHurt(o), 0.5)}
        <path d="M12 76 Q12 30 50 28 Q88 30 88 76 Z" fill="#7BAE4A" ${st()}/>
        <path d="M50 30 L50 76 M28 40 L36 54 L50 58 L64 54 L72 40 M18 66 L36 54 M82 66 L64 54" ${st(2.5)} fill="none"/>
        <path d="M8 76 L92 76" ${st(5)} fill="none"/>
        ${face(50, 64, hurtOr(o), 0.6)}${shine(28, 44, 3.5, 7)}`);

    S.sanguijuela = (o) => svg(`
        <path d="M14 70 Q10 40 36 34 Q62 28 76 44 Q92 62 82 80 Q60 92 36 86 Q18 82 14 70 Z" fill="#6E5A7A" ${st()}/>
        <path d="M24 54 Q48 46 72 54 M22 68 Q48 60 78 68" ${st(2)} fill="none" opacity=".35"/>
        <circle cx="84" cy="56" r="10" fill="#8C6E9A" ${st(3)}/><circle cx="84" cy="56" r="5" fill="#C8374F" ${st(1.8)}/>
        ${face(46, 62, hurtOr(o), 0.72)}${shine(30, 46, 3, 6)}`);

    S.caracolito = (o) => svg(`
        <path d="M14 84 Q14 66 30 62 L72 62 Q84 64 88 84 Z" fill="#FFD2B0" ${st()}/>
        <circle cx="54" cy="50" r="26" fill="#E89A5A" ${st()}/>
        <path d="M54 50 m-14 0 a14 14 0 1 1 14 14 a8 8 0 1 1 -8 -8" ${st(3)} fill="none"/>
        ${legs('M24 64 L20 50 M32 64 L32 50', 2.5)}<circle cx="20" cy="48" r="3" fill="${INK}"/><circle cx="32" cy="48" r="3" fill="${INK}"/>
        ${face(26, 74, hurtOr(o), 0.45)}`);

    S.caracol_plaga = (o) => svg(`
        <path d="M6 88 Q6 64 24 58 L80 58 Q94 62 96 88 Z" fill="#FFD2B0" ${st()}/>
        <circle cx="58" cy="42" r="32" fill="#C8704A" ${st()}/>
        <path d="M58 42 m-18 0 a18 18 0 1 1 18 18 a11 11 0 1 1 -11 -11" ${st(3)} fill="none"/>
        ${[[70, 20], [82, 36], [46, 18]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="6" fill="#FFF6E9" ${st(2)}/>`).join('')}
        ${legs('M16 62 L10 42 M26 60 L26 40', 3)}<circle cx="10" cy="40" r="4" fill="${INK}"/><circle cx="26" cy="38" r="4" fill="${INK}"/>
        ${face(22, 76, hurtOr(o), 0.62)}`);

    S.cactus_rabioso = (o) => svg(`
        <path d="M28 82 L72 82 L68 98 L32 98 Z" fill="#C8704A" ${st()}/><rect x="24" y="76" width="52" height="9" rx="3" fill="#D98A5E" ${st(3)}/>
        <path d="M20 58 Q8 56 10 38 Q12 30 18 32 Q22 34 20 44 L32 46 Z" fill="#5C9A4A" ${st()}/>
        <path d="M80 50 Q92 48 90 30 Q88 22 82 24 Q78 26 80 36 L68 38 Z" fill="#5C9A4A" ${st()}/>
        <path d="M32 78 L32 30 Q32 10 50 10 Q68 10 68 30 L68 78 Z" fill="#7BBF5A" ${st()}/>
        ${[[38, 26], [60, 22], [40, 58], [62, 50], [50, 70], [14, 44], [86, 34]].map(([x, y]) => `<path d="M${x} ${y} l-4 -3 M${x} ${y} l4 -3 M${x} ${y} l0 -5" stroke="#FFF6E9" stroke-width="1.8"/>`).join('')}
        ${face(50, 44, hurtOr(o), 0.68)}
        <path d="M60 14 L68 8 L66 18 Z M66 24 L76 22 L70 30 Z" fill="#E0455E" ${st(1.8)}/>`);

    S.fantasma_bodega = (o) => svg(`
        <path d="M22 88 L22 46 Q22 12 50 12 Q78 12 78 46 L78 88 L68 80 L58 90 L50 80 L42 90 L32 80 Z" fill="#E9E4FF" opacity=".92" ${st()}/>
        ${face(50, 44, hurtOr(o), 0.8)}
        <path d="M24 60 Q10 62 8 76" fill="none" ${st(3)}/>
        ${[[12, 70], [8, 80], [10, 90]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="none" stroke="#7A7F88" stroke-width="3"/>`).join('')}
        <circle cx="10" cy="96" r="4" fill="#7A7F88" ${st(2)}/>
        ${shine(34, 28, 4, 8)}${sparkle(86, 18, 0.6, '#fff')}`);

    S.urraca_tahur = (o) => svg(`
        <path d="M22 60 L2 74 L8 58 Z" fill="#2E2A3A" ${st(2.5)}/>
        <ellipse cx="50" cy="60" rx="30" ry="22" fill="#2E2A3A" ${st()}/>
        <path d="M30 62 Q46 80 66 64 Q54 70 44 68 Z" fill="#F4F4F8" ${st(2.5)}/>
        <path d="M40 50 Q56 34 70 52 Q58 48 46 56 Z" fill="#5A6FB0" ${st(2.5)}/>
        <circle cx="68" cy="36" r="16" fill="#2E2A3A" ${st()}/>
        <path d="M82 34 L96 38 L82 42 Z" fill="#4F4A66" ${st(2.5)}/>
        <circle cx="64" cy="34" r="5" fill="#fff" ${st(1.8)}/><circle cx="65" cy="35" r="2.3" fill="${INK}"/>
        ${isHurt(o) ? '' : `<path d="M58 26 L70 30" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`}
        ${tube('M42 80 L40 94 M56 80 L58 94', '#4F4A66', 3)}
        <rect x="8" y="80" width="20" height="18" rx="4" fill="#FFFDF7" ${st(2.5)} transform="rotate(-14 18 89)"/>
        <circle cx="14" cy="85" r="2" fill="${INK}"/><circle cx="22" cy="93" r="2" fill="${INK}"/>`);

    S.mano_tramposa = (o) => svg(`
        <path d="M22 96 L26 66 Q16 58 18 44 L20 22 Q20 14 27 14 Q34 14 34 22 L34 40 L36 12 Q36 4 43 4 Q50 4 50 12 L50 38 L54 14 Q54 6 61 6 Q68 6 68 14 L66 42 L72 26 Q74 18 81 20 Q88 22 86 30 L78 62 Q76 70 70 72 L70 96 Z" fill="#FFFDF7" ${st()}/>
        <path d="M26 88 L70 88" ${st(2)} fill="none" opacity=".35"/>
        ${cardShape(4, 50, 22, 32, -20)}<g transform="rotate(-20 15 66)">${suit('spade', 15, 66, 0.5)}</g>
        ${face(50, 60, hurtOr(o), 0.72)}${shine(44, 22, 2.5, 6)}`);

    S.peon_escudero = (o) => svg(`
        ${chessPiece('P', '#7A68AE', hurtOr(o))}
        ${shieldShape(24, 66, 1.05, '#9AA5B1', `<path d="M0 -10 L0 10 M-8 0 L8 0" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round"/>`)}`);

    S.raton_cria = (o) => svg(`
        <path d="M18 78 Q6 74 10 62" ${st(2.5)} fill="none" stroke="#FFB8C6"/>
        <ellipse cx="54" cy="70" rx="28" ry="20" fill="#C9C1C1" ${st()}/>
        <circle cx="38" cy="36" r="13" fill="#C9C1C1" ${st()}/><circle cx="38" cy="36" r="7" fill="#FFB8C6"/>
        <circle cx="72" cy="36" r="13" fill="#C9C1C1" ${st()}/><circle cx="72" cy="36" r="7" fill="#FFB8C6"/>
        <ellipse cx="55" cy="54" rx="22" ry="18" fill="#D8D0D0" ${st()}/>
        <circle cx="55" cy="66" r="3.5" fill="#F2667A" ${st(1.4)}/>
        ${face(55, 52, hurtOr(o), 0.62)}`);

    S.rata_plaga = (o) => svg(`
        <path d="M12 78 Q0 72 4 58 Q8 48 2 42" ${st(3)} fill="none" stroke="#C9A3B0"/>
        <ellipse cx="50" cy="66" rx="34" ry="24" fill="#8C8A6E" ${st()}/>
        ${[[30, 70, 5], [66, 78, 4], [58, 60, 3.5], [38, 82, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#9BBF5A" ${st(1.5)}/>`).join('')}
        <circle cx="72" cy="30" r="12" fill="#8C8A6E" ${st()}/><circle cx="72" cy="30" r="6" fill="#C9A3B0"/>
        <circle cx="36" cy="32" r="12" fill="#8C8A6E" ${st()}/><circle cx="36" cy="32" r="6" fill="#C9A3B0"/>
        <ellipse cx="54" cy="50" rx="24" ry="20" fill="#A3A088" ${st()}/>
        <circle cx="54" cy="64" r="4" fill="#9B3E4A" ${st(1.5)}/>
        <path d="M40 62 L26 58 M40 66 L26 68 M68 62 L82 58 M68 66 L82 68" ${st(1.5)} fill="none"/>
        ${face(54, 50, hurtOr(o), 0.7)}`);

    S.reina_hormiga = (o) => svg(`
        ${legs('M34 64 L18 80 L14 92 M44 70 L36 90 M60 70 L68 90 M70 64 L84 80 L88 92', 3)}
        <ellipse cx="24" cy="60" rx="20" ry="16" fill="#B0463A" ${st()}/>
        <path d="M10 56 Q24 46 38 56" ${st(2)} fill="none" opacity=".35"/>
        <ellipse cx="50" cy="62" rx="12" ry="10" fill="#B0463A" ${st()}/>
        <ellipse cx="44" cy="40" rx="18" ry="10" fill="#E9F6FF" opacity=".85" ${st(2.5)} transform="rotate(-20 44 40)"/>
        <circle cx="72" cy="48" r="20" fill="#C8584A" ${st()}/>
        <path d="M64 30 Q58 16 50 14 M80 30 Q86 16 94 16" ${st(2.5)} fill="none"/>
        ${crown(72, 32, 26)}
        ${face(72, 52, hurtOr(o), 0.66)}${shine(16, 54, 3, 6)}`);

    S.enchufe_chupon = (o) => svg(`
        <path d="M50 88 Q48 96 40 96 Q30 96 30 88" ${st(4)} fill="none"/>
        <rect x="26" y="30" width="48" height="56" rx="12" fill="#F4F0FF" ${st()}/>
        <rect x="34" y="8" width="8" height="24" rx="2" fill="#C9D3DC" ${st(2.5)}/><rect x="58" y="8" width="8" height="24" rx="2" fill="#C9D3DC" ${st(2.5)}/>
        ${face(50, 56, hurtOr(o), 0.72)}
        <path d="M44 64 L46 70 L48 64 M52 64 L54 70 L56 64" fill="#fff" ${st(1.4)}/>
        <path d="M84 30 L76 44 L86 44 L78 58" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M16 36 L10 48 L18 48 L12 60" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        ${shine(34, 42, 3, 8)}`);

    S.olla_rabiosa = (o) => svg(`
        <path d="M38 14 Q34 6 40 2 M52 14 Q48 6 54 0 M64 16 Q60 8 66 4" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M38 14 Q34 6 40 2 M52 14 Q48 6 54 0 M64 16 Q60 8 66 4" ${st(1.4)} fill="none" opacity=".35"/>
        <rect x="6" y="46" width="14" height="8" rx="3" fill="#8C6A3F" ${st(2.5)}/><rect x="80" y="46" width="14" height="8" rx="3" fill="#8C6A3F" ${st(2.5)}/>
        <path d="M18 40 L82 40 L78 92 L22 92 Z" fill="#C9D3DC" ${st()}/>
        <path d="M14 32 Q50 18 86 32 L86 40 L14 40 Z" fill="#9AA5B1" ${st()}/>
        <rect x="44" y="18" width="12" height="8" rx="3" fill="#E0455E" ${st(2.2)}/>
        ${face(50, 64, hurtOr(o), 0.8)}
        <path d="M30 50 Q36 44 42 50 M58 50 Q64 44 70 50" stroke="#E0455E" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${shine(28, 58, 3, 9, 0)}`);

    S.robot_escudo = (o) => svg(`
        <ellipse cx="50" cy="90" rx="30" ry="7" fill="#8C857C" ${st(3)}/>
        <path d="M50 14 L50 4" ${st(3)} fill="none"/><circle cx="50" cy="4" r="4" fill="#F2667A" ${st(2)}/>
        <rect x="28" y="14" width="44" height="72" rx="12" fill="#8FD0F0" ${st()}/>
        <rect x="34" y="22" width="32" height="20" rx="6" fill="#3A4E6A" ${st(2.5)}/>
        ${isHurt(o) ? `<path d="M40 32 L46 32 M54 32 L60 32" stroke="#6EE0E0" stroke-width="3" stroke-linecap="round"/>` : `<circle cx="43" cy="32" r="3.5" fill="#6EE0E0"/><circle cx="57" cy="32" r="3.5" fill="#6EE0E0"/>`}
        <path d="M4 34 L34 34 L34 66 Q19 84 4 66 Z" fill="#C9D3DC" ${st()}/>
        <path d="M19 40 L19 70 M8 52 L30 52" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round"/>
        <path d="M72 44 L90 58" ${st(4)} fill="none"/><circle cx="90" cy="58" r="6" fill="#9AA5B1" ${st(2.5)}/>
        ${shine(36, 56, 3, 9, 0)}`);

    S.caballero_espejo = (o) => svg(`
        <path d="M24 96 L28 64 L72 64 L76 96 Z" fill="#C9D3DC" ${st()}/>
        <path d="M22 44 Q22 12 50 12 Q78 12 78 44 L78 66 Q50 74 22 66 Z" fill="#E3E9F0" ${st()}/>
        <path d="M50 12 Q56 2 64 6 Q58 8 58 14" fill="#9B7FD4" ${st(2.5)}/>
        <path d="M30 36 L70 36 L68 48 L32 48 Z" fill="#3A3448" ${st(2.5)}/>
        ${isHurt(o) ? `<path d="M38 42 L46 42 M54 42 L62 42" stroke="#C7E6FA" stroke-width="3" stroke-linecap="round"/>` : `<ellipse cx="42" cy="42" rx="4" ry="2.6" fill="#C7E6FA"/><ellipse cx="58" cy="42" rx="4" ry="2.6" fill="#C7E6FA"/>`}
        <ellipse cx="18" cy="72" rx="16" ry="22" fill="#C7E6FA" ${st()}/>
        <ellipse cx="18" cy="72" rx="10" ry="15" fill="#E9F6FF" ${st(2)}/>
        <path d="M12 64 L22 56 M12 76 L26 62" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <path d="M84 20 L90 76" ${st(3)} fill="none"/><path d="M84 16 L92 20 L90 70 L84 70 Z" fill="#fff" ${st(2.2)}/>
        ${sparkle(28, 50, 0.6, '#fff')}${shine(32, 24, 3, 7)}`);
})();
