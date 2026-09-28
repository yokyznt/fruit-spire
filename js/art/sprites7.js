// ============================================================
// SPRITES7.JS — Dibujos de los objetos con guiños a otros juegos, los
// eventos especiales, las portadas de cada piso, el Rey Fruta, los
// íconos de las reglas de piso, los adornos del mapa y algunos íconos
// de interfaz (mochila, notas, instagram…). Mismo estilo sticker.
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, sparkle, face } = window.SPRITE_KIT;
    const { tube, eyeball, crown, suit, cardShape, pips, chessPiece } = window.SPRITE_KIT2;
    const coin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFCF4D" ${st(2.5)}/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="none" stroke="#E0A92E" stroke-width="2"/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.35}" rx="${r * 0.18}" ry="${r * 0.3}" fill="#fff" opacity=".7"/>`;
    const heartPath = (cx, cy, s) => `M${cx} ${cy + 22 * s} C${cx - 30 * s} ${cy + 2 * s} ${cx - 26 * s} ${cy - 22 * s} ${cx - 12 * s} ${cy - 22 * s} C${cx - 5 * s} ${cy - 22 * s} ${cx} ${cy - 16 * s} ${cx} ${cy - 12 * s} C${cx} ${cy - 16 * s} ${cx + 5 * s} ${cy - 22 * s} ${cx + 12 * s} ${cy - 22 * s} C${cx + 26 * s} ${cy - 22 * s} ${cx + 30 * s} ${cy + 2 * s} ${cx} ${cy + 22 * s} Z`;
    const star = (cx, cy, r, color, w) => {
        let d = '';
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const rr = i % 2 ? r * 0.45 : r;
            d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        return `<path d="${d}Z" fill="${color}" ${st(w || 3.5)}/>`;
    };

    // =========================================================
    // EL REY FRUTA
    // =========================================================
    S.rey_fruta = (o) => svg(`
        <path d="M18 62 Q10 90 22 96 L78 96 Q90 90 82 62 Z" fill="#C8374F" ${st()}/>
        <path d="M24 64 Q50 76 76 64 Q74 72 50 80 Q26 72 24 64 Z" fill="#FFF6E9" ${st(2.5)}/>
        ${[[34, 70], [46, 74], [58, 74], [68, 70]].map(([x, y]) => `<path d="M${x} ${y} l1.5 3 l-3 0 z" fill="${INK}"/>`).join('')}
        <path d="M50 14 C36 12 26 24 28 38 C18 46 20 70 50 74 C80 70 82 46 72 38 C74 24 64 12 50 14 Z" fill="#FFCF4D" ${st()}/>
        <path d="M30 36 Q50 30 70 36" ${st(2)} fill="none" opacity=".25"/>
        ${crown(50, 20, 34, '#FFE27A')}
        <circle cx="38" cy="10" r="2.5" fill="#5CC9A7" ${st(1.2)}/><circle cx="62" cy="10" r="2.5" fill="#9B7FD4" ${st(1.2)}/>
        ${face(50, 46, o && o.mood, 0.8)}
        <path d="M38 56 Q44 51 50 55 Q56 51 62 56 Q56 61 50 58 Q44 61 38 56 Z" fill="#fff" ${st(1.8)}/>
        <path d="M84 30 L84 90" ${st(3)} fill="none"/>${star(84, 26, 9, '#FFE27A', 2.5)}
        ${shine(38, 30, 3.5, 8)}${sparkle(12, 18, 0.8)}`);

    // =========================================================
    // OBJETOS (guiños a otros juegos)
    // =========================================================
    S.fichas_casino = () => svg(`
        ${[[30, 80, '#F2667A'], [30, 68, '#5A6FB0'], [30, 56, '#FFCF4D']].map(([x, y, c]) => `<ellipse cx="${x + 20}" cy="${y}" rx="30" ry="10" fill="${c}" ${st(3)}/><path d="M${x - 8} ${y} L${x - 8} ${y + 7} Q${x + 20} ${y + 18} ${x + 48} ${y + 7} L${x + 48} ${y}" fill="${c}" ${st(3)}/>`).join('')}
        <ellipse cx="50" cy="56" rx="30" ry="10" fill="#FFCF4D" ${st(3)}/><ellipse cx="50" cy="56" rx="18" ry="5.5" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 3"/>
        <ellipse cx="74" cy="30" rx="16" ry="16" fill="#5CC9A7" ${st(3)}/><circle cx="74" cy="30" r="9" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="3.5 3"/>
        ${sparkle(20, 22, 0.8)}`);
    S.estrella_guardado = () => svg(`
        <circle cx="50" cy="52" r="40" fill="#FFF6B8" opacity=".6"/>
        ${star(50, 52, 34, '#FFE27A')}
        <path d="M40 50 L40 44 M60 50 L60 44" ${st(3)} fill="none"/><path d="M44 58 Q50 62 56 58" ${st(2.5)} fill="none"/>
        ${sparkle(16, 16, 0.9, '#fff')}${sparkle(86, 80, 0.8, '#fff')}${sparkle(88, 18, 0.6)}`);
    S.penique_suerte = () => svg(`
        <circle cx="50" cy="50" r="38" fill="#D98A5E" ${st()}/><circle cx="50" cy="50" r="28" fill="none" stroke="#B0663E" stroke-width="3"/>
        <path d="M50 30 L50 70 M40 38 Q50 30 60 38 Q60 48 50 50 Q40 52 40 62 Q50 70 60 62" ${st(3)} fill="none"/>
        ${shine(32, 30, 4, 8)}${sparkle(86, 14, 0.8)}`);
    S.nectar_olimpo = () => svg(`
        <path d="M36 16 L64 16 L60 28 Q82 38 80 62 Q76 88 50 90 Q24 88 20 62 Q18 38 40 28 Z" fill="#E8B87A" ${st()}/>
        <path d="M24 56 Q50 64 76 56 Q76 84 50 86 Q24 84 24 56 Z" fill="#FFCF4D"/>
        <path d="M20 62 Q18 38 40 28 L60 28 Q82 38 80 62 Q76 88 50 90 Q24 88 20 62 Z" fill="none" ${st()}/>
        <path d="M20 44 Q8 44 10 58 Q12 66 20 64 M80 44 Q92 44 90 58 Q88 66 80 64" fill="none" ${st(3)}/>
        <path d="M28 44 L72 44" stroke="#8C5A2E" stroke-width="3" stroke-dasharray="5 4"/>
        ${shine(34, 62, 3.5, 9)}${sparkle(84, 16, 0.8)}`);
    S.cuchillo_juguete = () => svg(`
        <path d="M22 78 L70 18 Q84 10 82 24 L34 86 Z" fill="#E3E9F0" ${st()}/>
        <path d="M70 18 Q84 10 82 24 L58 54 Z" fill="#fff" opacity=".6"/>
        <rect x="10" y="72" width="30" height="14" rx="6" fill="#F2667A" ${st()} transform="rotate(-52 25 79)"/>
        <circle cx="21" cy="84" r="3" fill="#FFCF4D" ${st(1.4)}/>${sparkle(84, 72, 0.7)}`);
    S.cana_pescar = () => svg(`
        <path d="M14 90 Q40 40 86 12" ${st(4)} fill="none" stroke="${INK}"/><path d="M14 90 Q40 40 86 12" stroke="#B0703F" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="28" cy="70" r="8" fill="#9AA5B1" ${st(2.5)}/>
        <path d="M86 12 L86 52" stroke="${INK}" stroke-width="1.6"/>
        <path d="M86 52 Q86 62 80 60" ${st(2.2)} fill="none"/>
        <path d="M62 70 Q74 60 86 70 Q74 80 62 70 Z" fill="#8FD0F0" ${st(2.5)}/><path d="M62 70 L54 64 L54 76 Z" fill="#8FD0F0" ${st(2.2)}/>
        <circle cx="80" cy="68" r="1.6" fill="${INK}"/>`);
    S.corazon_alma = () => svg(`
        <path d="${heartPath(50, 52, 1.5)}" fill="#8FC7F0" ${st()}/>
        <path d="M30 34 Q34 24 42 26" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>
        ${sparkle(86, 16, 0.8, '#fff')}${sparkle(14, 80, 0.6, '#C7E6FA')}`);
    S.pico_diamante = () => svg(`
        <path d="M44 34 L78 92" ${st(4)} fill="none"/><path d="M44 34 L78 92" stroke="#B0703F" stroke-width="5" stroke-linecap="round"/>
        <path d="M8 40 Q30 8 60 14 Q84 20 92 44 Q72 30 50 32 Q28 32 8 40 Z" fill="#6EE0E0" ${st()}/>
        <path d="M24 26 L34 32 M66 20 L64 30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        ${sparkle(88, 78, 0.8, '#6EE0E0')}`);
    S.comodin_descarado = () => svg(`
        ${cardShape(22, 14, 56, 78, 6)}
        <g transform="rotate(6 50 53)">
            <path d="M30 34 Q28 18 40 20 Q42 30 50 32 Q58 30 60 20 Q72 18 70 34 Z" fill="#F2667A" ${st(2.5)}/>
            <circle cx="40" cy="20" r="3.5" fill="#FFCF4D" ${st(1.5)}/><circle cx="60" cy="20" r="3.5" fill="#FFCF4D" ${st(1.5)}/>
            ${face(50, 52, 'wink', 0.8)}<path d="M38 64 Q50 78 62 64" fill="#fff" ${st(2.2)}/>
        </g>${sparkle(14, 20, 0.7)}`);
    S.alcancia_interes = () => svg(`
        <ellipse cx="50" cy="60" rx="38" ry="28" fill="#FFB8C6" ${st()}/>
        <path d="M22 38 L26 22 L38 34 Z" fill="#FFB8C6" ${st(3)}/>
        <rect x="34" y="84" width="10" height="10" rx="3" fill="#FFB8C6" ${st(2.5)}/><rect x="58" y="84" width="10" height="10" rx="3" fill="#FFB8C6" ${st(2.5)}/>
        <ellipse cx="14" cy="60" rx="8" ry="10" fill="#FF8FA3" ${st(3)}/><circle cx="12" cy="57" r="1.8" fill="${INK}"/><circle cx="12" cy="63" r="1.8" fill="${INK}"/>
        <rect x="44" y="30" width="16" height="4" rx="2" fill="${INK}"/>
        ${coin(52, 16, 10)}
        ${face(30, 52, 'happy', 0.55)}${shine(58, 50, 3.5, 7)}`);
    S.tarot_luna = () => svg(`
        ${cardShape(22, 8, 56, 84, 0, '#4F4A66')}
        <rect x="28" y="14" width="44" height="72" rx="4" fill="none" stroke="#FFCF4D" stroke-width="2"/>
        <path d="M58 30 A18 18 0 1 0 58 62 A14 14 0 1 1 58 30 Z" fill="#FFE27A" ${st(2.5)}/>
        ${[[34, 24], [66, 72], [36, 72], [64, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#FFE27A"/>`).join('')}
        <path d="M36 80 L64 80" stroke="#FFCF4D" stroke-width="2.5"/>`);
    S.kunai_cascara = () => svg(`
        <path d="M50 4 L64 44 L50 56 L36 44 Z" fill="#FFE27A" ${st()}/>
        <path d="M50 4 L50 56" ${st(2)} fill="none" opacity=".4"/>
        <rect x="44" y="54" width="12" height="28" rx="3" fill="#8C6A3F" ${st(3)}/>
        <path d="M44 62 L56 62 M44 70 L56 70" stroke="#FFF6E9" stroke-width="2"/>
        <circle cx="50" cy="88" r="7" fill="none" ${st(3)}/>${sparkle(78, 20, 0.7)}`);
    S.abanico_ornamental = () => {
        let ribs = '';
        for (let i = 0; i < 7; i++) {
            const a = (-150 + i * 20) * Math.PI / 180;
            ribs += `<path d="M50 86 L${(50 + Math.cos(a) * 44).toFixed(1)} ${(86 + Math.sin(a) * 44).toFixed(1)}" ${st(2)} fill="none" opacity=".5"/>`;
        }
        return svg(`<path d="M50 86 L12 64 A44 44 0 0 1 88 64 Z" fill="#F2667A" ${st()}/>${ribs}
            <path d="M22 60 A34 34 0 0 1 78 60" stroke="#FFCF4D" stroke-width="4" fill="none"/>
            ${leaf(40, 50, -40, 0.7, '#7BBF5A')}<circle cx="50" cy="86" r="5" fill="#FFCF4D" ${st(2)}/>`);
    };
    S.pentagrama = () => svg(`
        <circle cx="50" cy="52" r="40" fill="#3A2A4E" ${st()}/>
        ${star(50, 54, 32, 'none', 3)}
        <path d="M50 22 L68 80 L20 42 L80 42 L32 80 Z" stroke="#FF6B6B" stroke-width="3.5" stroke-linejoin="round" fill="none"/>
        <circle cx="50" cy="52" r="34" fill="none" stroke="#FF6B6B" stroke-width="2"/>`);
    S.frasco_salud = () => svg(`
        <rect x="40" y="6" width="20" height="12" rx="3" fill="#B0703F" ${st(3)}/>
        <path d="M42 18 L58 18 L58 32 Q82 42 80 66 Q78 92 50 92 Q22 92 20 66 Q18 42 42 32 Z" fill="#F2F7FA" ${st()}/>
        <path d="M22 60 Q50 52 78 60 Q78 90 50 90 Q22 90 22 60 Z" fill="#E0455E"/>
        <path d="M20 66 Q18 42 42 32 L42 18 L58 18 L58 32 Q82 42 80 66 Q78 92 50 92 Q22 92 20 66 Z" fill="none" ${st()}/>
        <circle cx="40" cy="72" r="3" fill="#FF8FA3"/><circle cx="58" cy="78" r="2" fill="#FF8FA3"/>
        ${shine(32, 50, 3.5, 9)}`);
    S.mascara_extra = () => svg(`
        <path d="M26 30 Q16 10 24 4 Q30 16 36 22 M74 30 Q84 10 76 4 Q70 16 64 22" fill="#F4F4F8" ${st(3)}/>
        <path d="M20 44 Q20 18 50 18 Q80 18 80 44 Q80 76 50 92 Q20 76 20 44 Z" fill="#F4F4F8" ${st()}/>
        <ellipse cx="38" cy="50" rx="8" ry="12" fill="#2E2A3A"/><ellipse cx="62" cy="50" rx="8" ry="12" fill="#2E2A3A"/>
        ${shine(30, 30, 3.5, 7)}`);
    S.cristal_vida = () => svg(`
        <path d="M50 8 L78 36 L50 94 L22 36 Z" fill="#FF6B8A" ${st()}/>
        <path d="M22 36 L78 36 M50 8 L38 36 L50 94 M50 8 L62 36" ${st(2)} fill="none" opacity=".4"/>
        <path d="${heartPath(50, 46, 0.45)}" fill="#fff" opacity=".85"/>
        ${sparkle(84, 14, 0.9, '#fff')}${sparkle(16, 70, 0.6)}`);
    S.aura_ajo = () => svg(`
        <circle cx="50" cy="56" r="44" fill="none" stroke="#C7F0B8" stroke-width="4" stroke-dasharray="6 6"/>
        <circle cx="50" cy="56" r="36" fill="#E9FBE2" opacity=".6"/>
        <path d="M50 12 Q46 22 50 30" ${st()} fill="none"/>
        <path d="M50 28 C32 32 20 50 24 68 C28 84 42 88 50 86 C58 88 72 84 76 68 C80 50 68 32 50 28 Z" fill="#FFF6E9" ${st()}/>
        <path d="M50 30 Q42 58 50 86 M50 30 Q58 58 50 86" ${st(2)} fill="none" opacity=".35"/>`);
    S.vela_determinacion = () => svg(`
        <path d="M50 8 C62 20 62 32 50 38 C38 32 38 20 50 8 Z" fill="#FF8C3A" ${st(3)}/>
        <path d="M50 18 C56 24 56 30 50 34 C44 30 44 24 50 18 Z" fill="#FFE27A"/>
        <rect x="32" y="40" width="36" height="52" rx="6" fill="#F2667A" ${st()}/>
        <path d="M32 50 Q38 58 42 50 Q48 62 54 50 Q60 58 68 50" fill="none" ${st(2.5)}/>
        <path d="${heartPath(50, 70, 0.4)}" fill="#fff"/>`);
    S.fresa_dorada = () => svg(`
        <path d="M22 44 Q2 30 6 18 Q18 26 30 38 Z M78 44 Q98 30 94 18 Q82 26 70 38 Z" fill="#fff" ${st(2.5)}/>
        <path d="M20 40 Q50 30 80 40 Q78 80 50 94 Q22 80 20 40 Z" fill="#FFCF4D" ${st()}/>
        <path d="M34 36 L40 22 L50 32 L60 22 L66 36 Z" fill="#7BBF5A" ${st(2.5)}/>
        ${[[34, 54], [50, 50], [66, 54], [40, 68], [60, 68], [50, 80]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#E0A92E"/>`).join('')}
        ${shine(32, 52, 3.5, 8)}${sparkle(88, 70, 0.8, '#FFE27A')}`);
    S.lagrima_sagrada = () => svg(`
        <ellipse cx="50" cy="14" rx="20" ry="6" fill="none" stroke="#FFCF4D" stroke-width="4"/>
        <path d="M50 22 C66 44 76 56 76 70 A26 26 0 0 1 24 70 C24 56 34 44 50 22 Z" fill="#8FD0F0" ${st()}/>
        <path d="M36 62 Q36 52 44 46" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>
        ${sparkle(84, 40, 0.7, '#fff')}`);
    S.mano_color = () => svg(`
        ${[-36, -18, 0, 18, 36].map((r) => `<g transform="rotate(${r} 50 78)">${cardShape(38, 12, 24, 40, 0)}${suit('heart', 50, 26, 0.36)}</g>`).join('')}
        <path d="M30 70 Q28 94 50 96 Q72 94 70 70 Q60 76 50 74 Q40 76 30 70 Z" fill="#FFD2B0" ${st()}/>`);
    S.d6_bolsillo = () => svg(`
        <path d="M84 36 A38 38 0 0 0 18 26" stroke="#5CC9A7" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M14 18 L18 30 L28 22 Z" fill="#5CC9A7" ${st(2)}/>
        <path d="M16 66 A38 38 0 0 0 82 76" stroke="#5CC9A7" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M86 84 L82 72 L72 80 Z" fill="#5CC9A7" ${st(2)}/>
        <rect x="26" y="26" width="48" height="48" rx="11" fill="#FFFDF7" ${st()}/>
        ${pips(6, 50, 50, 12, 4)}`);
    S.desafio_muerte = () => svg(`
        <path d="M22 70 Q10 50 20 30 M78 70 Q90 50 80 30" stroke="#7BBF5A" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${leaf(18, 40, -110, 0.6)}${leaf(82, 40, -70, 0.6)}${leaf(16, 58, -130, 0.6)}${leaf(84, 58, -50, 0.6)}
        <path d="M28 52 Q24 16 50 14 Q76 16 72 52 Q72 62 64 64 L64 78 L36 78 L36 64 Q28 62 28 52 Z" fill="#F1EBDD" ${st()}/>
        <ellipse cx="40" cy="46" rx="7" ry="8" fill="#C8374F"/><ellipse cx="60" cy="46" rx="7" ry="8" fill="#C8374F"/>
        <path d="M47 60 L50 55 L53 60 Z" fill="${INK}"/>
        <path d="M42 78 L42 70 M50 78 L50 70 M58 78 L58 70" ${st(2)} fill="none"/>`);
    S.corazon_sacrificio = () => svg(`
        <path d="${heartPath(50, 50, 1.45)}" fill="#C8374F" ${st()}/>
        <path d="M50 30 L44 44 L54 50 L46 64" ${st(3)} fill="none"/>
        <path d="M36 28 Q30 34 32 42" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>
        <path d="M50 84 Q52 92 48 94 Q44 92 46 86" fill="#C8374F" ${st(1.8)}/>`);
    S.ojo_cthulhu = () => svg(`
        <path d="M12 50 Q50 6 88 50 Q50 94 12 50 Z" fill="#FFF6F2" ${st()}/>
        <path d="M16 46 L28 44 M18 58 L30 56 M82 44 L72 46 M84 56 L72 56 M50 12 L48 22" stroke="#E0455E" stroke-width="2" fill="none"/>
        <circle cx="50" cy="50" r="18" fill="#5CC9A7" ${st(3)}/><circle class="eyes" cx="50" cy="50" r="9" fill="${INK}"/><circle cx="55" cy="45" r="3.5" fill="#fff"/>`);
    S.azufre_infernal = () => svg(`
        <path d="M30 40 Q34 18 44 30 Q46 8 58 26 Q66 12 70 36" fill="#FF8C3A" ${st(3)}/>
        <path d="M40 38 Q44 26 50 34 Q54 22 62 38" fill="#FFE27A"/>
        <path d="M14 76 Q12 50 32 44 L68 42 Q90 48 88 74 Q78 92 50 92 Q22 92 14 76 Z" fill="#8C6A5A" ${st()}/>
        <path d="M30 60 L42 68 M58 56 L66 66 M44 80 L54 76" stroke="#FFCF4D" stroke-width="3" stroke-linecap="round"/>
        ${shine(30, 58, 3, 6)}`);

    // =========================================================
    // ESTADOS Y CARTAS NUEVAS
    // =========================================================
    S.st_ghost = () => svg(`
        <path d="M22 88 L22 46 Q22 12 50 12 Q78 12 78 46 L78 88 L66 78 L56 90 L50 80 L44 90 L34 78 Z" fill="#EDE8FF" ${st(4)}/>
        <ellipse cx="40" cy="44" rx="5.5" ry="7" fill="${INK}"/><ellipse cx="60" cy="44" rx="5.5" ry="7" fill="${INK}"/>
        <ellipse cx="50" cy="62" rx="5" ry="6" fill="${INK}"/>`);
    S.st_reflect = () => svg(`
        <ellipse cx="50" cy="44" rx="30" ry="36" fill="#C7E6FA" ${st(4)}/>
        <ellipse cx="50" cy="44" rx="22" ry="28" fill="#E9F6FF" ${st(2.5)}/>
        <path d="M38 34 L50 22 M40 48 L58 30" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
        <rect x="42" y="78" width="16" height="16" rx="4" fill="#B0703F" ${st(3)}/>`);
    S.carta_marcada = () => svg(`
        ${cardShape(22, 10, 56, 80, -6)}
        <g transform="rotate(-6 50 50)">${suit('club', 50, 44, 1.2)}<path d="M28 20 L72 80 M72 20 L28 80" stroke="#E0455E" stroke-width="5" stroke-linecap="round" opacity=".85"/></g>`);
    S.dado_trucado = () => svg(`
        <rect x="16" y="16" width="68" height="68" rx="15" fill="#FFFDF7" ${st()}/>
        ${pips(5, 50, 50, 18, 5.5)}
        <path d="M56 16 L48 36 L60 46 L50 70" ${st(3)} fill="none"/>
        <rect x="62" y="64" width="26" height="22" rx="4" fill="#9AA5B1" ${st(2.5)}/>`);

    // =========================================================
    // EVENTOS ESPECIALES
    // =========================================================
    S.nido_zumbon = () => svg(`
        <path d="M16 10 L84 10" ${st(4)} fill="none" stroke="#8C6A3F"/>
        <path d="M50 10 L50 18" ${st(3)} fill="none"/>
        <path d="M50 18 Q18 22 20 50 Q22 84 50 88 Q78 84 80 50 Q82 22 50 18 Z" fill="#FFCF4D" ${st()}/>
        <path d="M24 36 Q50 42 76 36 M21 52 Q50 58 79 52 M25 68 Q50 74 75 68" ${st(2.5)} fill="none" opacity=".45"/>
        <ellipse cx="50" cy="62" rx="8" ry="6" fill="${INK}"/>
        ${[[86, 40], [12, 64], [82, 80]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="6" ry="4.5" fill="#FFE27A" ${st(1.8)}/><path d="M-1 -4 L-1 4 M2 -4 L2 4" stroke="${INK}" stroke-width="1.6"/><ellipse cx="-1" cy="-6" rx="3" ry="2" fill="#fff" ${st(1.2)}/></g>`).join('')}`);
    S.sombra_hambrienta = () => svg(`
        <path d="M6 90 Q10 40 30 34 Q34 18 50 22 Q66 18 72 34 Q92 40 94 90 Z" fill="#3A3448" ${st()}/>
        ${leaf(6, 82, -60, 1.3)}${leaf(94, 82, -120, 1.3)}${leaf(20, 88, -40, 1)}${leaf(80, 88, -140, 1)}
        <ellipse cx="38" cy="52" rx="7" ry="5" fill="#FFE27A"/><ellipse cx="62" cy="52" rx="7" ry="5" fill="#FFE27A"/>
        <circle cx="38" cy="53" r="2.4" fill="${INK}"/><circle cx="62" cy="53" r="2.4" fill="${INK}"/>
        <path d="M36 70 L42 64 L48 70 L54 64 L60 70 L66 64" stroke="#fff" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`);
    S.tragamonedas = () => svg(`
        <path d="M80 44 L92 22" ${st(4)} fill="none"/><circle cx="92" cy="20" r="7" fill="#F2667A" ${st(2.5)}/>
        <rect x="14" y="14" width="68" height="80" rx="12" fill="#5A6FB0" ${st()}/>
        <path d="M20 14 Q48 0 76 14" fill="#FFCF4D" ${st(3)}/>
        <rect x="22" y="30" width="52" height="28" rx="6" fill="#FFF6E9" ${st(3)}/>
        <path d="M39 30 L39 58 M57 30 L57 58" ${st(2)} fill="none"/>
        <circle cx="30" cy="44" r="5" fill="#E0455E" ${st(1.8)}/><path d="M30 39 Q34 34 38 36" ${st(1.6)} fill="none"/>
        ${star(48, 44, 7, '#FFCF4D', 1.8)}
        <path d="M61 38 L71 38 L65 52" stroke="#E0455E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <rect x="26" y="68" width="44" height="16" rx="4" fill="#3E4E8C" ${st(2.5)}/>
        ${coin(36, 76, 5)}${coin(52, 78, 5)}`);
    S.ruleta_fortuna = () => {
        const colors = ['#F2667A', '#FFCF4D', '#5CC9A7', '#9B7FD4', '#FFA64D', '#8FD0F0'];
        let wedges = '';
        for (let i = 0; i < 6; i++) {
            const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
            wedges += `<path d="M50 50 L${(50 + Math.cos(a0) * 38).toFixed(1)} ${(50 + Math.sin(a0) * 38).toFixed(1)} A38 38 0 0 1 ${(50 + Math.cos(a1) * 38).toFixed(1)} ${(50 + Math.sin(a1) * 38).toFixed(1)} Z" fill="${colors[i]}" ${st(2.5)}/>`;
        }
        return svg(`<rect x="44" y="84" width="12" height="12" fill="#8C6A3F" ${st(2.5)}/>
            <circle cx="50" cy="50" r="42" fill="#8C6A3F" ${st()}/>${wedges}
            <circle cx="50" cy="50" r="8" fill="#FFF6E9" ${st(2.5)}/>
            <path d="M50 2 L58 14 L42 14 Z" fill="#E0455E" ${st(2.5)}/>`);
    };
    S.trato_diablo = () => svg(`
        <path d="M24 30 L16 6 L36 22 Z M76 30 L84 6 L64 22 Z" fill="#8C2B3D" ${st(3)}/>
        <path d="M18 60 Q16 22 50 20 Q84 22 82 60 Q80 88 50 90 Q20 88 18 60 Z" fill="#E0455E" ${st()}/>
        <path d="M80 70 Q98 74 92 88 L98 92 L88 94" fill="none" ${st(3)}/>
        ${face(50, 54, 'wink', 0.9)}
        <path d="M38 66 Q50 76 62 66" fill="#fff" ${st(2.2)}/>
        <path d="M4 60 L26 56 L30 88 L8 92 Z" fill="#FFF6E9" ${st(2.5)}/><path d="M9 66 L24 64 M10 72 L25 70 M11 78 L20 77" stroke="#C9A27A" stroke-width="2"/>
        ${shine(30, 40, 4, 8)}`);
    S.sala_sacrificio = () => svg(`
        <path d="M4 92 L96 92" ${st(4)} fill="none"/>
        ${[10, 26, 42, 58, 74, 90].map((x) => `<path d="M${x - 7} 92 L${x} 70 L${x + 7} 92 Z" fill="#C9D3DC" ${st(2.5)}/>`).join('')}
        <ellipse cx="50" cy="40" rx="24" ry="20" fill="#FFCF4D" ${st()}/>
        <path d="M30 26 L32 14 L42 22 Z" fill="#FFCF4D" ${st(2.5)}/>
        <rect x="44" y="20" width="12" height="3.5" rx="2" fill="${INK}"/>
        <ellipse cx="26" cy="42" rx="6" ry="7" fill="#E0A92E" ${st(2.5)}/>
        ${face(40, 40, 'happy', 0.5)}${sparkle(84, 20, 0.8)}`);
    S.moneda_suerte = () => svg(`
        <ellipse cx="50" cy="88" rx="22" ry="5" fill="#000" opacity=".12"/>
        <ellipse cx="50" cy="46" rx="18" ry="34" fill="#E0A92E" ${st()}/>
        <ellipse cx="46" cy="46" rx="16" ry="34" fill="#FFCF4D" ${st()}/>
        ${star(46, 46, 10, '#FFE27A', 2)}
        <path d="M74 20 Q84 24 82 34 M20 70 Q12 66 14 58" stroke="#FFCF4D" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${sparkle(86, 50, 0.8)}${sparkle(14, 26, 0.7)}`);
    S.muro_viviente = () => {
        let bricks = '';
        for (let r = 0; r < 5; r++) for (let c = -1; c < 4; c++) {
            const x = 10 + c * 26 + (r % 2 ? 13 : 0);
            bricks += `<rect x="${x}" y="${12 + r * 16}" width="26" height="16" fill="${(r + c) % 3 ? '#D98A5E' : '#C8704A'}" stroke="#8C4A2E" stroke-width="1.5"/>`;
        }
        return svg(`<defs><clipPath id="mv-clip"><rect x="10" y="12" width="80" height="80" rx="8"/></clipPath></defs>
            <g clip-path="url(#mv-clip)">${bricks}</g>
            <rect x="10" y="12" width="80" height="80" rx="8" fill="none" ${st()}/>
            ${face(50, 54, 'sleepy', 1.3)}`);
    };
    S.bendicion_dioses = () => svg(`
        <path d="M8 34 L50 8 L92 34 Z" fill="#FFF6E9" ${st()}/>
        <rect x="12" y="34" width="76" height="8" fill="#FFF6E9" ${st(3)}/>
        ${[20, 42, 64].map((x) => `<rect x="${x}" y="42" width="14" height="42" fill="#F4EEE2" ${st(3)}/><path d="M${x + 4} 46 L${x + 4} 80 M${x + 10} 46 L${x + 10} 80" stroke="#D9CCB2" stroke-width="2"/>`).join('')}
        <rect x="8" y="84" width="84" height="10" fill="#FFF6E9" ${st(3)}/>
        <circle cx="50" cy="24" r="6" fill="#FFCF4D" ${st(2)}/>${sparkle(90, 12, 0.8)}${sparkle(10, 12, 0.7, '#C7B4F0')}`);
    S.hada_fuente = () => svg(`
        <ellipse cx="50" cy="88" rx="34" ry="7" fill="#8FD0F0" ${st(3)}/>
        <path d="M24 88 Q20 70 30 66 L70 66 Q80 70 76 88" fill="#E3E9F0" ${st(3)}/>
        <path d="M36 40 Q12 20 16 44 Q20 58 40 50 Z" fill="#C7E6FA" opacity=".9" ${st(2.5)}/>
        <path d="M64 40 Q88 20 84 44 Q80 58 60 50 Z" fill="#C7E6FA" opacity=".9" ${st(2.5)}/>
        <path d="M40 54 Q42 44 50 44 Q58 44 60 54 Q64 66 50 66 Q36 66 40 54 Z" fill="#FF8FB8" ${st(2.5)}/>
        <path d="M34 26 Q50 12 66 26 Q64 46 50 46 Q36 46 34 26 Z" fill="#F2667A" ${st()}/>
        <path d="M40 16 L44 8 L50 14 L56 8 L60 16 Z" fill="#7BBF5A" ${st(2)}/>
        ${[[42, 32], [58, 32], [50, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="2" fill="#FFE27A"/>`).join('')}
        ${face(50, 30, 'happy', 0.42)}
        <path d="M62 56 L80 42" ${st(2.5)} fill="none"/>${star(82, 40, 6, '#FFE27A', 2)}
        ${sparkle(14, 14, 0.8, '#fff')}${sparkle(90, 16, 0.7)}${sparkle(84, 70, 0.6, '#C7E6FA')}`);
    S.maquina_garra = () => svg(`
        <rect x="14" y="8" width="72" height="86" rx="8" fill="#F2667A" ${st()}/>
        <rect x="20" y="16" width="60" height="52" rx="4" fill="#E9F6FF" ${st(3)}/>
        <path d="M50 16 L50 30" ${st(2.5)} fill="none"/>
        <path d="M44 30 L56 30 M44 30 Q40 40 44 42 M56 30 Q60 40 56 42" ${st(2.5)} fill="none"/>
        <circle cx="32" cy="60" r="7" fill="#FFCF4D" ${st(2)}/><circle cx="48" cy="62" r="7" fill="#9BD66A" ${st(2)}/><circle cx="64" cy="60" r="7" fill="#9B7FD4" ${st(2)}/>
        <rect x="22" y="74" width="30" height="14" rx="3" fill="#C8374F" ${st(2.5)}/>
        <path d="M66 86 L66 76" ${st(3)} fill="none"/><circle cx="66" cy="74" r="4.5" fill="#FFCF4D" ${st(2)}/>`);
    S.vasos_tahur = () => svg(`
        <ellipse cx="50" cy="88" rx="44" ry="7" fill="#5CC9A7" opacity=".4"/>
        ${[18, 50, 82].map((x, i) => `<path d="M${x - 14} 86 L${x - 9} ${i === 1 ? 48 : 52} L${x + 9} ${i === 1 ? 48 : 52} L${x + 14} 86 Z" fill="#F2667A" ${st(3)}/><ellipse cx="${x}" cy="${i === 1 ? 48 : 52}" rx="9" ry="3" fill="#C8374F" ${st(2)}/>`).join('')}
        ${coin(50, 30, 9)}${sparkle(50, 12, 0.7)}`);
    S.piedra_papel_tijera = () => svg(`
        <path d="M22 80 L30 40 L70 40 L78 80 Z" fill="#5A6FB0" ${st()}/>
        <path d="M30 42 L50 2 L70 42 Z" fill="#E0455E" ${st()}/>
        <circle cx="50" cy="56" r="17" fill="#FFD2B0" ${st()}/>
        <path d="M34 62 Q50 92 66 62 Q58 70 50 70 Q42 70 34 62 Z" fill="#fff" ${st(2.5)}/>
        ${face(50, 54, 'wink', 0.55)}
        <circle cx="16" cy="54" r="10" fill="#FFD2B0" ${st(2.5)}/><path d="M10 50 L22 50 M10 55 L22 55" ${st(1.6)} fill="none"/>
        <path d="M84 60 L88 42 M84 60 L94 46" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M84 60 L88 42 M84 60 L94 46" stroke="#FFD2B0" stroke-width="4" stroke-linecap="round"/>
        <circle cx="84" cy="62" r="7" fill="#FFD2B0" ${st(2.5)}/>
        <rect x="18" y="80" width="64" height="10" rx="4" fill="#8C6A3F" ${st(2.5)}/>`);
    S.trampilla = () => svg(`
        <path d="M8 60 L92 60 L92 94 L8 94 Z" fill="#9BD66A" ${st()}/>
        <path d="M22 62 L78 62 L72 90 L28 90 Z" fill="#241F2E" ${st(3)}/>
        <path d="M22 62 L40 20 L96 20 L78 62 Z" fill="#B0703F" ${st()}/>
        <path d="M36 52 L50 22 M52 56 L66 24 M68 60 L82 26" ${st(2)} fill="none" opacity=".35"/>
        <circle cx="70" cy="40" r="4" fill="#9AA5B1" ${st(2)}/>
        <ellipse cx="44" cy="80" rx="4" ry="3" fill="#FFE27A"/><ellipse cx="56" cy="80" rx="4" ry="3" fill="#FFE27A"/>`);

    // =========================================================
    // PORTADAS DE CADA PISO
    // =========================================================
    const ground = (color) => `<path d="M2 82 Q50 70 98 82 L98 96 L2 96 Z" fill="${color || '#9BD66A'}" ${st()}/>`;
    S.act_gallinero = () => svg(`${ground('#E8C98A')}
        <path d="M18 80 L18 40 L50 16 L82 40 L82 80 Z" fill="#E0584A" ${st()}/>
        <path d="M12 42 L50 12 L88 42" ${st(5)} fill="none" stroke="#fff"/><path d="M12 42 L50 12 L88 42" ${st(4)} fill="none"/>
        <rect x="38" y="52" width="24" height="28" fill="#8C4A2E" ${st(3)}/><path d="M38 52 L62 80 M62 52 L38 80" stroke="#fff" stroke-width="2.5"/>
        <circle cx="50" cy="36" r="6" fill="#FFF6E9" ${st(2.5)}/>
        <ellipse cx="84" cy="86" rx="6" ry="7.5" fill="#FFF6E9" ${st(2.5)}/><ellipse cx="14" cy="88" rx="5" ry="6.5" fill="#FFE9C8" ${st(2.5)}/>`);
    S.act_estanque = () => svg(`
        <ellipse cx="50" cy="66" rx="46" ry="26" fill="#8FD0F0" ${st()}/>
        <path d="M18 64 Q30 60 42 64 M56 76 Q68 72 80 76" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 50 A14 8 0 1 1 29.9 50 Z M30 50 L40 44" fill="#7BBF5A" ${st(2.5)}/>
        <path d="M70 70 A12 7 0 1 1 69.9 70 Z" fill="#7BBF5A" ${st(2.5)}/>
        <circle cx="72" cy="62" r="7" fill="#FFB8C6" ${st(2)}/><circle cx="72" cy="62" r="3" fill="#FFE27A"/>
        <path d="M86 50 L86 20 M80 50 L80 26" ${st(3)} fill="none"/><ellipse cx="86" cy="20" rx="3.5" ry="8" fill="#8C6A3F" ${st(2)}/><ellipse cx="80" cy="26" rx="3.5" ry="7" fill="#8C6A3F" ${st(2)}/>`);
    S.act_invernadero = () => svg(`${ground()}
        <path d="M12 82 L12 42 Q50 4 88 42 L88 82 Z" fill="#DFF4F0" ${st()}/>
        <path d="M31 82 L31 22 M50 82 L50 16 M69 82 L69 22 M12 58 L88 58" ${st(2.5)} fill="none"/>
        ${leaf(22, 76, -70, 1)}${leaf(42, 78, -110, 1.1)}${leaf(60, 76, -60, 1)}${leaf(78, 78, -120, 1)}
        <circle cx="40" cy="44" r="5" fill="#F2667A" ${st(2)}/><circle cx="62" cy="40" r="5" fill="#FFCF4D" ${st(2)}/>
        <path d="M20 30 L30 22" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`);
    S.act_bodega = () => svg(`
        <path d="M6 94 L6 40 Q50 -4 94 40 L94 94 Z" fill="#4F4A66" ${st()}/>
        <path d="M14 94 L14 44 Q50 8 86 44 L86 94 Z" fill="#3A3448" ${st(2.5)}/>
        ${[[30, 74], [70, 74], [50, 52]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="14" fill="#B0703F" ${st(3)}/><ellipse cx="${x}" cy="${y}" rx="8" ry="7" fill="#8C5A2E" ${st(2)}/><path d="M${x - 16} ${y} L${x - 8} ${y} M${x + 8} ${y} L${x + 16} ${y}" stroke="#9AA5B1" stroke-width="2.5"/>`).join('')}
        <path d="M22 16 Q28 10 34 16 Q28 14 22 16 Z" fill="#8C78C0" ${st(1.5)}/>`);
    S.act_dados = () => svg(`
        <ellipse cx="50" cy="88" rx="42" ry="7" fill="#C8374F" opacity=".35"/>
        <rect x="8" y="34" width="46" height="46" rx="11" fill="#FFFDF7" ${st()} transform="rotate(-12 31 57)"/>
        <g transform="rotate(-12 31 57)">${pips(5, 31, 57, 12, 4)}</g>
        <rect x="48" y="24" width="44" height="44" rx="11" fill="#E0455E" ${st()} transform="rotate(14 70 46)"/>
        <g transform="rotate(14 70 46)">${pips(3, 70, 46, 11, 4, '#fff')}</g>
        ${sparkle(14, 16, 0.8)}${sparkle(88, 84, 0.7)}`);
    S.act_poker = () => svg(`
        ${[-24, 0, 24].map((r, i) => `${cardShape(36, 10, 30, 48, r)}<g transform="rotate(${r} 51 34)">${suit(['spade', 'heart', 'club'][i], 51, 28, 0.55)}</g>`).join('')}
        ${[[24, 84, '#F2667A'], [50, 86, '#5A6FB0'], [76, 84, '#FFCF4D']].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="6" fill="${c}" ${st(2.5)}/><ellipse cx="${x}" cy="${y - 5}" rx="15" ry="6" fill="${c}" ${st(2.5)}/>`).join('')}`);
    S.act_ajedrez = () => {
        let sq = '';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) sq += `<rect x="${8 + c * 14}" y="${58 + r * 12}" width="14" height="12" fill="${(r + c) % 2 ? '#B8A27C' : '#F1E6CE'}"/>`;
        return svg(`${sq}<rect x="8" y="58" width="84" height="36" fill="none" ${st()}/>
            <g transform="translate(6 2) scale(.46)">${chessPiece('K', '#7A68AE', 'angry')}</g>
            <g transform="translate(50 12) scale(.46)">${chessPiece('P', '#9BD66A', 'happy')}</g>`);
    };
    S.act_cocina = () => svg(`
        <rect x="10" y="44" width="80" height="50" rx="6" fill="#E3E9F0" ${st()}/>
        <rect x="18" y="64" width="64" height="24" rx="4" fill="#4F4A66" ${st(3)}/>
        <path d="M24 76 L76 76" stroke="#FF8C3A" stroke-width="3" stroke-dasharray="6 5"/>
        <path d="M28 44 Q24 24 36 24 L64 24 Q76 24 72 44 Z" fill="#9AA5B1" ${st()}/>
        <path d="M22 30 L28 30 M72 30 L78 30" ${st(4)} fill="none"/>
        <path d="M40 16 Q36 8 42 4 M52 16 Q48 8 54 2 M62 16 Q58 8 64 4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M40 16 Q36 8 42 4 M52 16 Q48 8 54 2 M62 16 Q58 8 64 4" ${st(1.2)} fill="none" opacity=".4"/>`);
    S.act_torre_rey = () => svg(`
        <path d="M2 94 Q50 80 98 94 Z" fill="#7C7199" ${st()}/>
        <rect x="32" y="26" width="36" height="66" fill="#9A8FBC" ${st()}/>
        <path d="M28 28 L28 16 L36 16 L36 22 L46 22 L46 16 L54 16 L54 22 L64 22 L64 16 L72 16 L72 28 Z" fill="#9A8FBC" ${st()}/>
        <rect x="42" y="36" width="16" height="22" rx="8" fill="#FFE27A" ${st(2.5)}/><path d="M50 36 L50 58 M42 46 L58 46" ${st(1.6)} fill="none"/>
        <path d="M42 92 L42 74 Q50 64 58 74 L58 92 Z" fill="#5A3E2B" ${st(2.5)}/>
        ${crown(50, 14, 26)}${sparkle(14, 20, 0.8)}${sparkle(88, 40, 0.7, '#C9B5F0')}`);
    S.obstaculo_mesa = () => svg(`
        <path d="M10 86 L90 86" ${st(4)} fill="none"/>
        <ellipse cx="50" cy="52" rx="40" ry="16" fill="#3E8A54" ${st()} transform="rotate(-18 50 52)"/>
        <ellipse cx="50" cy="52" rx="32" ry="11" fill="#5CC9A7" transform="rotate(-18 50 52)"/>
        <path d="M30 72 L24 88 M70 58 L78 86" ${st(4)} fill="none" stroke="#8C6A3F"/><path d="M30 72 L24 88 M70 58 L78 86" stroke="#8C6A3F" stroke-width="4" stroke-linecap="round"/>
        ${cardShape(10, 70, 16, 22, -30)}${cardShape(74, 74, 16, 22, 24)}
        <circle cx="46" cy="86" r="5" fill="#F2667A" ${st(2)}/>`);

    // =========================================================
    // ÍCONOS DE LAS REGLAS DE PISO
    // =========================================================
    S.rule_huerto = () => svg(`${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M50 6 L54 18 L46 18 Z" fill="#FFB347" ${st(2)} transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="26" fill="#FFCF4D" ${st()}/>${face(50, 52, 'happy', 0.8)}`);
    S.rule_gallinero = () => svg(`<path d="M10 70 Q50 96 90 70 Q86 56 50 58 Q14 56 10 70 Z" fill="#C9A25F" ${st()}/><path d="M16 66 L30 72 M44 62 L52 74 M70 64 L64 74" stroke="#8C6A3F" stroke-width="2.5"/>
        <ellipse cx="38" cy="50" rx="12" ry="16" fill="#FFF6E9" ${st(3)}/><ellipse cx="62" cy="48" rx="12" ry="16" fill="#FFE9C8" ${st(3)}/>${shine(34, 44, 2.5, 5)}`);
    S.rule_estanque = () => svg(`<path d="M6 56 Q20 36 34 56 T62 56 T90 56 L94 56 L94 90 L6 90 Z" fill="#8FD0F0" ${st()}/><path d="M6 72 Q20 62 34 72 T62 72 T94 72" stroke="#fff" stroke-width="3" fill="none"/>
        <path d="M34 56 Q42 30 62 36 Q52 42 56 52" fill="#C7E6FA" ${st(2.5)}/>`);
    S.rule_invernadero = () => svg(`${leaf(24, 70, -60, 2.4)}<path d="${heartPath(62, 42, 0.8)}" fill="#F2667A" ${st(3)}/><path d="M62 30 L62 50 M52 40 L72 40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`);
    S.rule_bodega = () => svg(`<circle cx="50" cy="50" r="40" fill="#3A3448" ${st()}/><path d="M60 16 A34 34 0 1 0 60 84 A26 26 0 1 1 60 16 Z" fill="#C9B5F0" ${st(2.5)}/>
        <ellipse cx="72" cy="48" rx="3.5" ry="4.5" fill="#FFE27A"/><ellipse cx="82" cy="48" rx="3.5" ry="4.5" fill="#FFE27A"/>`);
    S.rule_dados = () => svg(`<rect x="14" y="14" width="72" height="72" rx="17" fill="#FFFDF7" ${st()}/>${pips(6, 50, 50, 20, 6.5)}${shine(26, 26, 3.5, 7)}`);
    S.rule_poker = () => svg(`${[-18, 0, 18].map((r) => cardShape(34, 12, 32, 50, r)).join('')}<g>${suit('heart', 50, 36, 0.8)}</g>
        <path d="M22 76 L78 76" stroke="#FFCF4D" stroke-width="8" stroke-linecap="round"/><path d="M22 76 L78 76" ${st(2)} fill="none" opacity=".4"/>`);
    S.rule_ajedrez = () => svg(`<g transform="translate(-4 4) scale(.62)">${chessPiece('P', '#F4F0FF', 'happy', false)}</g><g transform="translate(42 4) scale(.62)">${chessPiece('P', '#5F4E8E', 'angry', false)}</g>`);
    S.rule_mercado = () => svg(`<path d="M24 92 L22 54 Q20 40 32 40 L32 30 Q32 22 38 22 Q44 22 44 30 L44 20 Q44 12 50 12 Q56 12 56 20 L56 28 Q56 20 62 20 Q68 20 68 28 L68 48 Q76 42 82 48 Q86 54 78 62 L66 80 L66 92 Z" fill="#4F4A66" ${st()}/>
        ${coin(78, 24, 11)}`);
    S.rule_cocina = () => svg(`<path d="M50 6 C74 30 84 48 80 66 C76 86 62 94 50 94 C38 94 24 86 20 66 C16 48 26 30 50 6 Z" fill="#FF8C3A" ${st()}/>
        <path d="M50 38 C62 52 66 62 62 74 C58 84 42 84 38 74 C34 62 38 52 50 38 Z" fill="#FFE27A"/>`);
    S.rule_fabrica = () => svg(`<path d="M58 4 L22 54 L46 54 L38 96 L80 40 L54 40 Z" fill="#FFE27A" ${st()}/>${sparkle(84, 16, 0.8, '#fff')}`);
    S.rule_torre_rey = () => svg(`<path d="M16 28 L50 14 L84 28 L84 54 Q84 82 50 94 Q16 82 16 54 Z" fill="#9A8FBC" ${st()}/>${crown(50, 64, 40)}`);

    // =========================================================
    // ADORNOS DEL MAPA (sin cara, para el fondo)
    // =========================================================
    S.deco_flor = () => svg(`${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="28" rx="13" ry="18" fill="#FFB8C6" ${st(3)} transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="12" fill="#FFCF4D" ${st(3)}/>`);
    S.deco_pasto = () => svg(`<path d="M20 90 Q24 50 14 24 Q34 50 36 90 M40 90 Q46 40 50 10 Q56 40 60 90 M64 90 Q68 50 86 26 Q76 56 80 90 Z" fill="#7BBF5A" ${st(3)}/>`);
    S.deco_piedra = () => svg(`<path d="M10 82 Q8 50 30 40 Q50 22 72 40 Q94 52 90 82 Z" fill="#B8B0A2" ${st()}/>${shine(34, 50, 4, 8)}`);
    S.deco_hongo = () => svg(`<path d="M40 56 L38 88 Q50 94 62 88 L60 56 Z" fill="#FFF6E9" ${st()}/><path d="M10 60 Q12 18 50 16 Q88 18 90 60 Q50 70 10 60 Z" fill="#E0455E" ${st()}/><circle cx="32" cy="40" r="6" fill="#fff"/><circle cx="62" cy="32" r="7" fill="#fff"/>`);
    S.deco_pluma = () => svg(`<path d="M20 88 Q30 40 76 10 Q86 50 40 76 Z" fill="#FFF6E9" ${st()}/><path d="M20 88 Q46 50 74 16" ${st(2.5)} fill="none"/>`);
    S.deco_huevo = () => svg(`<ellipse cx="50" cy="56" rx="28" ry="36" fill="#FFF6E9" ${st()}/>${shine(40, 40, 4, 9)}`);
    S.deco_nenufar = () => svg(`<path d="M50 50 L86 34 A40 40 0 1 0 86 66 Z" fill="#7BBF5A" ${st()}/><circle cx="46" cy="44" r="10" fill="#FFB8C6" ${st(2.5)}/>`);
    S.deco_gota = () => svg(`<path d="M50 10 C66 36 76 50 76 64 A26 26 0 0 1 24 64 C24 50 34 36 50 10 Z" fill="#8FD0F0" ${st()}/>${shine(40, 58, 3.5, 8)}`);
    S.deco_hoja = () => svg(`${leaf(14, 60, -30, 3)}`);
    S.deco_tela = () => S.dg_web ? S.dg_web() : svg('');
    S.deco_barril = () => svg(`<path d="M24 12 Q14 50 24 88 L76 88 Q86 50 76 12 Z" fill="#B0703F" ${st()}/><path d="M18 30 Q50 38 82 30 M18 70 Q50 78 82 70" stroke="#9AA5B1" stroke-width="6" fill="none"/>`);
    S.deco_dado = () => svg(`<rect x="16" y="16" width="68" height="68" rx="16" fill="#FFFDF7" ${st()}/>${pips(5, 50, 50, 18, 6)}`);
    S.deco_ficha = () => svg(`<circle cx="50" cy="50" r="38" fill="#F2667A" ${st()}/><circle cx="50" cy="50" r="24" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="8 6"/>`);
    S.deco_palo = () => svg(`${suit('spade', 32, 38, 1.3)}${suit('heart', 68, 62, 1.3)}`);
    S.deco_peon = () => svg(`<g transform="translate(0 0)">${chessPiece('P', '#B8A27C', 'happy', false)}</g>`);
    S.deco_corona = () => svg(`${crown(50, 70, 70)}`);
    S.deco_engrane = () => {
        let teeth = '';
        for (let i = 0; i < 8; i++) teeth += `<rect x="44" y="6" width="12" height="18" rx="3" fill="#C9D3DC" ${st(3)} transform="rotate(${i * 45} 50 50)"/>`;
        return svg(`${teeth}<circle cx="50" cy="50" r="30" fill="#C9D3DC" ${st()}/><circle cx="50" cy="50" r="11" fill="#9AA5B1" ${st(3)}/>`);
    };
    S.deco_sarten = () => svg(`<path d="M60 56 L94 90" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M60 56 L94 90" stroke="#8C6A3F" stroke-width="7" stroke-linecap="round"/><circle cx="40" cy="40" r="32" fill="#4F4A66" ${st()}/><circle cx="40" cy="40" r="22" fill="#6E6A7A"/>`);
    S.deco_vela = () => svg(`<path d="M50 8 C60 20 60 30 50 34 C40 30 40 20 50 8 Z" fill="#FFB347" ${st(3)}/><rect x="34" y="38" width="32" height="54" rx="6" fill="#FFF1C2" ${st()}/>`);

    // =========================================================
    // INTERFAZ Y CALABOZO
    // =========================================================
    S.dg_bones = () => svg(`
        <path d="M22 70 L78 34" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M22 70 L78 34" stroke="#F1EBDD" stroke-width="10" stroke-linecap="round"/>
        ${[[18, 64], [26, 76], [74, 28], [82, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#F1EBDD" ${st(3)}/>`).join('')}
        <path d="M22 70 L78 34" stroke="#F1EBDD" stroke-width="10" stroke-linecap="round"/>`);
    S.ui_bag = () => svg(`
        <path d="M34 30 Q34 10 50 10 Q66 10 66 30" fill="none" ${st(5)}/>
        <path d="M16 40 Q16 26 30 26 L70 26 Q84 26 84 40 L88 82 Q88 94 76 94 L24 94 Q12 94 12 82 Z" fill="#C9804A" ${st()}/>
        <path d="M16 46 Q50 60 84 46 L84 38 Q50 50 16 38 Z" fill="#B0663E" ${st(3)}/>
        <rect x="40" y="48" width="20" height="16" rx="4" fill="#FFCF4D" ${st(3)}/><circle cx="50" cy="56" r="2.5" fill="${INK}"/>
        <path d="M26 66 Q26 84 36 86 M74 66 Q74 84 64 86" stroke="#B0663E" stroke-width="3" fill="none"/>
        ${shine(24, 34, 3, 6)}`);
    S.ui_notes = () => svg(`
        <rect x="20" y="10" width="62" height="82" rx="8" fill="#FFF6E9" ${st()}/>
        <path d="M32 32 L70 32 M32 46 L70 46 M32 60 L62 60 M32 74 L54 74" stroke="#C9A27A" stroke-width="3.5" stroke-linecap="round"/>
        ${[22, 40, 58, 76].map((y) => `<circle cx="20" cy="${y}" r="4" fill="#fff" ${st(2)}/>`).join('')}
        <path d="M66 64 L88 42 L94 48 L72 70 L64 72 Z" fill="#FFCF4D" ${st(2.5)}/>`);
    S.ui_insta = () => svg(`
        <rect x="12" y="12" width="76" height="76" rx="22" fill="#E1306C" ${st()}/>
        <rect x="12" y="12" width="76" height="76" rx="22" fill="#FFB347" opacity=".35"/>
        <circle cx="50" cy="50" r="17" fill="none" stroke="#fff" stroke-width="7"/>
        <circle cx="70" cy="30" r="5" fill="#fff"/>
        <rect x="24" y="24" width="52" height="52" rx="15" fill="none" stroke="#fff" stroke-width="6"/>`);
    S.ui_lock = () => svg(`
        <path d="M32 44 L32 30 Q32 12 50 12 Q68 12 68 30 L68 44" fill="none" ${st(6)}/>
        <rect x="20" y="42" width="60" height="48" rx="10" fill="#FFCF4D" ${st()}/>
        <circle cx="50" cy="62" r="6" fill="${INK}"/><path d="M50 64 L50 76" ${st(5)} fill="none"/>`);
    S.ui_play = () => svg(`<circle cx="50" cy="50" r="40" fill="#5CC9A7" ${st()}/><path d="M40 30 L72 50 L40 70 Z" fill="#fff" ${st(3)}/>`);
})();
