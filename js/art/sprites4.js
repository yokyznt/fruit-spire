// ============================================================
// SPRITES4.JS — Enemigos y jefes con mecánicas especiales, sus
// íconos de estado y las cartas-estorbo (Pulpa Aplastada, Jugo
// Hirviendo). Mismo estilo: ayudantes de window.SPRITE_KIT.
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, sparkle, face } = window.SPRITE_KIT;
    const hurtOr = (o, m) => (o && o.mood === 'hurt' ? 'hurt' : m || 'angry');
    const legs = (d) => `<path d="${d}" ${st(3)} fill="none"/>`;
    const spikes = (cx, cy, r, n, color) => {
        let d = '';
        for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
            const rr = i % 2 ? r * 0.74 : r;
            d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
        }
        return `<path d="${d}Z" fill="${color}" ${st(3)}/>`;
    };
    const mushroom = (capColor, spotColor, o, mood, s) => `
        <g transform="translate(50 50) scale(${s || 1}) translate(-50 -50)">
            <path d="M34 56 L32 88 Q32 94 50 94 Q68 94 68 88 L66 56 Z" fill="#FFF6E9" ${st()}/>
            <path d="M8 60 Q10 14 50 12 Q90 14 92 60 Q70 66 50 64 Q30 66 8 60 Z" fill="${capColor}" ${st()}/>
            <circle cx="28" cy="36" r="7" fill="${spotColor}"/><circle cx="62" cy="26" r="8" fill="${spotColor}"/><circle cx="76" cy="46" r="5" fill="${spotColor}"/>
            ${face(50, 76, hurtOr(o, mood), 0.7)}
        </g>`;

    // =========================================================
    // ÍCONOS DE MECÁNICAS
    // =========================================================
    S.st_curl = () => svg(`<circle cx="50" cy="52" r="36" fill="#8C857C" ${st(4)}/><path d="M22 40 Q50 30 78 40 M18 56 Q50 46 82 56 M22 72 Q50 62 78 72" ${st(3)} fill="none" opacity=".5"/>${shine(36, 36, 4, 7)}`);
    S.st_wax = () => svg(`
        <rect x="30" y="34" width="40" height="56" rx="6" fill="#FFF1C2" ${st(4)}/>
        <path d="M30 44 Q36 52 40 44 Q46 56 52 44 Q58 52 64 44 L70 44" fill="none" ${st(3)}/>
        <path d="M50 34 L50 24" ${st(3)} fill="none"/>
        <path d="M50 4 C58 12 60 20 50 24 C40 20 42 12 50 4 Z" fill="#FFB347" ${st(3)}/>`);
    S.st_jelly = () => svg(`
        <path d="M18 84 Q14 48 26 34 Q50 20 74 34 Q86 48 82 84 Z" fill="#F2667A" opacity=".85" ${st(4)}/>
        <path d="M26 44 Q50 34 74 44" ${st(3)} fill="none" opacity=".4"/>
        ${shine(34, 50, 5, 12)}<path d="M10 90 L90 90" ${st(4)} fill="none"/>`);
    S.st_malleable = () => svg(`<circle cx="44" cy="54" r="30" fill="#FFD6DC" ${st(4)}/><circle cx="72" cy="36" r="14" fill="#FFD6DC" ${st(3)}/><circle cx="74" cy="72" r="10" fill="#FFD6DC" ${st(3)}/>${shine(34, 44, 4, 8)}`);
    S.st_fuse = () => svg(`
        <circle cx="44" cy="58" r="32" fill="#4F4A66" ${st(4)}/>
        <path d="M64 34 Q74 20 86 18" ${st(4)} fill="none"/>
        ${sparkle(88, 14, 1.1, '#FFB347')}${shine(32, 46, 4, 8)}`);
    S.st_split = () => svg(`
        <path d="M50 10 L50 90" stroke="#fff" stroke-width="6" stroke-dasharray="8 7"/>
        <path d="M46 12 Q12 20 14 54 Q16 86 46 88 Z" fill="#B7E27F" ${st(4)}/>
        <path d="M54 12 Q88 20 86 54 Q84 86 54 88 Z" fill="#B7E27F" ${st(4)}/>`);
    S.st_minion = () => svg(`
        <ellipse cx="34" cy="62" rx="14" ry="20" fill="#E8C49A" ${st(4)} transform="rotate(-15 34 62)"/>
        <ellipse cx="66" cy="42" rx="14" ry="20" fill="#E8C49A" ${st(4)} transform="rotate(15 66 42)"/>
        <circle cx="26" cy="38" r="4" fill="#E8C49A" ${st(2)}/><circle cx="74" cy="18" r="4" fill="#E8C49A" ${st(2)}/>`);
    S.st_clock = () => svg(`
        <circle cx="50" cy="54" r="36" fill="#fff" ${st(4)}/>
        <path d="M50 54 L50 30 M50 54 L66 62" ${st(5)} fill="none"/>
        <rect x="42" y="8" width="16" height="10" rx="3" fill="#F2667A" ${st(3)}/>
        <path d="M22 22 L30 30 M78 22 L70 30" ${st(4)} fill="none"/>`);
    S.st_cap = () => svg(`
        <path d="M50 8 L86 22 C86 58 72 80 50 92 C28 80 14 58 14 22 Z" fill="#8C857C" ${st(4)}/>
        <path d="M30 40 L70 40 M30 54 L70 54 M34 68 L66 68" stroke="#C9D3DC" stroke-width="5" stroke-linecap="round"/>`);
    S.st_beat = () => svg(`
        <path d="M50 86 C20 66 8 48 14 32 C20 16 42 14 50 32 C58 14 80 16 86 32 C92 48 80 66 50 86 Z" fill="#E0455E" ${st(4)}/>
        <path d="M14 52 L34 52 L42 38 L52 66 L60 50 L86 50" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
    S.st_regrow = () => svg(`
        <path d="M14 84 Q50 72 86 84 L86 92 L14 92 Z" fill="#8C6A3F" ${st(3)}/>
        <path d="M50 80 L50 40" stroke="#7BBF5A" stroke-width="6" stroke-linecap="round"/>
        ${leaf(50, 50, -150, 1.1)}${leaf(50, 42, -30, 1.1)}
        <path d="M76 20 A22 22 0 1 0 82 44" ${st(4)} fill="none"/><path d="M82 30 L82 46 L68 44" ${st(4)} fill="none"/>`);
    S.st_spores = () => svg(`${mushroom('#C7B4F0', '#fff', {}, 'happy', 0.9)}`);
    S.st_enrage = () => svg(`
        <path d="M14 34 L34 44 L24 14 L46 36 L50 6 L56 36 L78 14 L66 44 L86 34 L70 56 L90 64 L66 66 L76 88 L54 72 L50 94 L44 72 L22 88 L32 66 L10 64 L30 56 Z" fill="#F2667A" ${st(3)}/>`);

    // =========================================================
    // CARTAS-ESTORBO
    // =========================================================
    S.pulpa_aplastada = () => svg(`
        <path d="M10 76 Q12 56 30 58 Q36 40 52 46 Q66 36 76 52 Q92 54 90 74 Q70 86 50 82 Q28 88 10 76 Z" fill="#FFB38A" ${st()}/>
        <circle cx="30" cy="84" r="4" fill="#FFB38A" ${st(2)}/><circle cx="80" cy="86" r="3" fill="#FFB38A" ${st(2)}/>
        ${face(52, 66, 'hurt', 0.7)}`);
    S.jugo_hirviendo = () => svg(`
        <path d="M34 12 Q28 20 34 28 M50 8 Q44 16 50 24 M66 12 Q60 20 66 28" stroke="#C9D3DC" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M22 36 L78 36 L70 92 L30 92 Z" fill="#fff" ${st()}/>
        <path d="M24 50 L76 50 L70 92 L30 92 Z" fill="#FF7A5A"/>
        <path d="M22 36 L78 36 L70 92 L30 92 Z" fill="none" ${st()}/>
        <circle cx="40" cy="64" r="3" fill="#fff" opacity=".8"/><circle cx="58" cy="72" r="2.5" fill="#fff" opacity=".8"/>
        ${face(50, 76, 'angry', 0.6)}`);

    // =========================================================
    // ENEMIGOS — NIVEL 1
    // =========================================================
    S.bicho_bolita = (o) => svg(`
        ${legs('M26 80 L20 90 M40 84 L38 94 M60 84 L62 94 M74 80 L80 90')}
        <path d="M10 70 Q10 30 50 28 Q90 30 90 70 Q90 82 76 82 L24 82 Q10 82 10 70 Z" fill="#8C857C" ${st()}/>
        <path d="M30 32 Q26 56 30 80 M50 28 L50 82 M70 32 Q74 56 70 80" ${st(2.5)} fill="none" opacity=".45"/>
        <path d="M84 56 Q96 50 94 38" ${st(3)} fill="none"/>
        ${shine(26, 44, 3.5, 8)}${face(64, 60, hurtOr(o), 0.7)}`);
    S.hongo_venenoso = (o) => svg(`${mushroom('#9B7FD4', '#E6DCF7', o, 'angry')}`);
    S.semilla_bomba = (o) => svg(`
        <path d="M60 22 Q70 8 84 10" ${st(4)} fill="none"/>
        ${sparkle(86, 8, 1, '#FFB347')}
        <ellipse cx="46" cy="58" rx="30" ry="34" fill="#8C6A3F" ${st()} transform="rotate(15 46 58)"/>
        <path d="M34 34 Q50 58 38 86" ${st(2.5)} fill="none" opacity=".4"/>
        ${shine(34, 44, 3.5, 8)}${face(50, 62, hurtOr(o), 0.8)}`);
    S.escarabajo_gordo = (o) => svg(`
        ${legs('M22 60 L6 54 M20 74 L6 80 M78 60 L94 54 M80 74 L94 80')}
        <path d="M50 26 L44 4 L56 16 Z" fill="#4F4A66" ${st(3)}/>
        <ellipse cx="50" cy="64" rx="36" ry="30" fill="#3E7A5A" ${st()}/>
        <path d="M50 36 L50 94" ${st(3)} fill="none"/>
        <ellipse cx="50" cy="38" rx="22" ry="14" fill="#2E5A42" ${st()}/>
        ${shine(30, 56, 4, 10)}${face(50, 40, hurtOr(o), 0.72)}`);
    S.babosa_madre = (o) => svg(`
        <path d="M58 12 Q60 4 66 2" ${st(3)} fill="none"/><circle cx="67" cy="3" r="4" fill="#9BD66A" ${st(2)}/>
        <path d="M44 12 Q40 4 34 2" ${st(3)} fill="none"/><circle cx="33" cy="3" r="4" fill="#9BD66A" ${st(2)}/>
        <path d="M6 88 Q4 60 20 40 Q34 16 50 16 Q66 16 80 40 Q96 60 94 88 Z" fill="#9BD66A" ${st()}/>
        <path d="M34 22 L42 8 L50 18 L58 8 L66 22" fill="#FFCF4D" ${st(3)}/>
        <circle cx="28" cy="72" r="4" fill="#7BAE4A"/><circle cx="74" cy="64" r="5" fill="#7BAE4A"/><circle cx="60" cy="80" r="3" fill="#7BAE4A"/>
        <path d="M14 90 L86 90" stroke="#E4F4D6" stroke-width="6" stroke-linecap="round"/>
        ${shine(28, 46, 4, 10)}${face(50, 52, hurtOr(o), 0.95)}`);
    S.hongo_rey = (o) => svg(`
        ${mushroom('#E0455E', '#FFE9EC', o, 'angry')}
        <path d="M32 16 L36 2 L44 12 L50 0 L56 12 L64 2 L68 16 Z" fill="#FFCF4D" ${st(3)}/>`);

    // =========================================================
    // ENEMIGOS — NIVEL 2
    // =========================================================
    S.vela_cera = (o) => svg(`
        <path d="M50 4 C60 14 62 24 50 30 C38 24 40 14 50 4 Z" fill="#FFB347" ${st(3)}/>
        <path d="M50 30 L50 38" ${st(3)} fill="none"/>
        <rect x="26" y="38" width="48" height="56" rx="8" fill="#FFF1C2" ${st()}/>
        <path d="M26 48 Q32 58 38 48 Q44 64 50 48 Q56 58 62 48 Q68 60 74 48" fill="none" ${st(3)}/>
        ${shine(34, 64, 3, 9, 0)}${face(50, 70, hurtOr(o), 0.75)}`);
    S.gelatina_temblorosa = (o) => svg(`
        <path d="M8 92 L92 92" ${st(4)} fill="none"/>
        <path d="M16 90 Q10 50 22 30 Q50 14 78 30 Q90 50 84 90 Z" fill="#F2667A" opacity=".88" ${st()}/>
        <path d="M22 44 Q50 30 78 44" ${st(2.5)} fill="none" opacity=".4"/>
        <circle cx="50" cy="14" r="8" fill="#E0455E" ${st(2.5)}/>
        ${shine(30, 54, 5, 14)}${face(52, 64, hurtOr(o), 0.85)}`);
    S.gato_callejero = (o) => svg(`
        <path d="M82 84 Q98 70 90 50" stroke="#C9804A" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M82 84 Q98 70 90 50" ${st(2)} fill="none"/>
        <ellipse cx="54" cy="74" rx="30" ry="20" fill="#E89A5A" ${st()}/>
        <path d="M22 26 L28 6 L42 20 M78 26 L72 6 L58 20" fill="#E89A5A" ${st(3)}/>
        <circle cx="50" cy="42" r="26" fill="#E89A5A" ${st()}/>
        <path d="M28 44 L14 40 M28 50 L14 52 M72 44 L86 40 M72 50 L86 52" ${st(2)} fill="none"/>
        <path d="M40 22 L44 30 M50 20 L50 30 M60 22 L56 30" stroke="#C9804A" stroke-width="4" stroke-linecap="round"/>
        ${face(50, 46, hurtOr(o), 0.8)}`);
    S.reloj_cocina = (o) => svg(`
        <rect x="40" y="2" width="20" height="12" rx="4" fill="#F2667A" ${st(3)}/>
        <circle cx="50" cy="54" r="40" fill="#F2667A" ${st()}/>
        <circle cx="50" cy="54" r="31" fill="#FFF6E9" ${st(3)}/>
        ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d) => { const a = d * Math.PI / 180; return `<path d="M${(50 + Math.cos(a) * 26).toFixed(1)} ${(54 + Math.sin(a) * 26).toFixed(1)} L${(50 + Math.cos(a) * 30).toFixed(1)} ${(54 + Math.sin(a) * 30).toFixed(1)}" ${st(2)} fill="none"/>`; }).join('')}
        <path d="M50 54 L66 36" ${st(4)} fill="none"/>
        <path d="M12 26 L22 32 M88 26 L78 32" ${st(4)} fill="none"/>
        ${face(50, 64, hurtOr(o), 0.7)}`);
    S.rey_raton = (o) => svg(`
        <path d="M10 80 Q2 72 6 58" stroke="#FFB8C6" stroke-width="5" stroke-linecap="round" fill="none"/>
        <ellipse cx="52" cy="74" rx="36" ry="22" fill="#8C6A9E" ${st()}/>
        <path d="M18 66 Q52 56 86 66 L86 74 Q52 64 18 74 Z" fill="#FFCF4D" ${st(2)}/>
        <circle cx="30" cy="30" r="12" fill="#A8A0A0" ${st()}/><circle cx="30" cy="30" r="6" fill="#FFB8C6"/>
        <circle cx="74" cy="30" r="12" fill="#A8A0A0" ${st()}/><circle cx="74" cy="30" r="6" fill="#FFB8C6"/>
        <ellipse cx="52" cy="48" rx="24" ry="20" fill="#BDB5B5" ${st()}/>
        <path d="M34 26 L38 12 L46 22 L52 8 L58 22 L66 12 L70 26 Z" fill="#FFCF4D" ${st(3)}/>
        <circle cx="52" cy="62" r="4" fill="#F2667A" ${st(1.5)}/>
        ${face(52, 48, hurtOr(o), 0.7)}`);

    // =========================================================
    // ENEMIGOS — NIVEL 3
    // =========================================================
    S.robot_limpiador = (o) => svg(`
        <path d="M76 40 L94 18" ${st(4)} fill="none"/>
        <path d="M86 12 L100 22 L92 30 Z" fill="#FFCF4D" ${st(2.5)}/>
        <ellipse cx="50" cy="82" rx="38" ry="10" fill="#8C857C" ${st()}/>
        <rect x="18" y="30" width="64" height="50" rx="14" fill="#8FD0F0" ${st()}/>
        <rect x="28" y="40" width="44" height="24" rx="8" fill="#2E3A48" ${st(2.5)}/>
        <path d="M50 30 L50 16" ${st(3)} fill="none"/><circle cx="50" cy="12" r="5" fill="#F2667A" ${st(2)}/>
        <g transform="translate(50 52) scale(.7)"><g class="eyes">${o && o.mood === 'hurt' ? `<path d="M-14 -4 L-6 0 L-14 4 M14 -4 L6 0 L14 4" stroke="#8FE0C4" stroke-width="3" fill="none"/>` : '<rect x="-16" y="-4" width="10" height="8" rx="2" fill="#8FE0C4"/><rect x="6" y="-4" width="10" height="8" rx="2" fill="#8FE0C4"/>'}</g></g>
        ${shine(26, 40, 2.5, 6)}`);
    S.botella_explosiva = (o) => svg(`
        ${sparkle(76, 10, 0.9, '#FFB347')}
        <path d="M58 14 Q68 6 74 12" ${st(3)} fill="none"/>
        <rect x="40" y="8" width="20" height="14" rx="3" fill="#F2667A" ${st(3)}/>
        <path d="M42 22 L58 22 L58 34 Q76 42 76 60 L76 86 Q76 94 68 94 L32 94 Q24 94 24 86 L24 60 Q24 42 42 34 Z" fill="#9BD66A" ${st()}/>
        <circle cx="40" cy="80" r="3" fill="#fff" opacity=".8"/><circle cx="60" cy="70" r="2.5" fill="#fff" opacity=".8"/>
        ${shine(34, 54, 3, 8, 10)}${face(50, 64, hurtOr(o), 0.72)}`);
    S.tostadora_saltarina = (o) => svg(`
        <path d="M30 26 Q30 8 42 8 Q48 8 48 16 Q48 8 54 8 Q66 8 66 26" fill="#E8B87A" ${st(3)}/>
        <rect x="12" y="28" width="76" height="60" rx="14" fill="#C9D3DC" ${st()}/>
        <path d="M26 28 L26 40 M74 28 L74 40" ${st(3)} fill="none"/>
        <rect x="84" y="50" width="10" height="16" rx="3" fill="#F2667A" ${st(2.5)}/>
        ${shine(22, 44, 3, 8)}${face(48, 60, hurtOr(o), 0.85)}`);
    S.cafetera_rabiosa = (o) => svg(`
        <path d="M30 10 Q24 2 30 -2 M46 8 Q40 0 46 -4" stroke="#C9D3DC" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M30 14 L70 14 L66 30 L34 30 Z" fill="#4F4A66" ${st()}/>
        <path d="M28 30 L72 30 L80 90 L20 90 Z" fill="#8C857C" ${st()}/>
        <path d="M74 44 Q94 46 90 64 Q86 76 76 74" ${st(4)} fill="none"/>
        <path d="M22 44 L10 36" ${st(4)} fill="none"/>
        <path d="M30 60 L70 60 L74 88 L26 88 Z" fill="#6E4A3A"/>
        ${shine(34, 42, 3, 7)}${face(50, 50, hurtOr(o), 0.8)}`);
    S.horno_infernal = (o) => svg(`
        <rect x="8" y="10" width="84" height="84" rx="10" fill="#8C857C" ${st()}/>
        <rect x="18" y="36" width="64" height="48" rx="8" fill="#2E2A3A" ${st(3)}/>
        <path d="M30 84 C28 66 40 60 42 48 C48 58 50 62 52 54 C58 64 66 70 66 84 Z" fill="#FF7A5A"/>
        <path d="M40 84 C40 74 46 70 48 64 C52 70 58 74 58 84 Z" fill="#FFCF4D"/>
        <circle cx="26" cy="22" r="5" fill="#F2667A" ${st(2)}/><circle cx="42" cy="22" r="5" fill="#FFCF4D" ${st(2)}/>
        <rect x="56" y="18" width="28" height="8" rx="3" fill="#FF7A5A" ${st(2)}/>
        <g transform="translate(50 50) scale(.75)"><g class="eyes">${o && o.mood === 'hurt' ? `<path d="M-14 -4 L-6 0 L-14 4 M14 -4 L6 0 L14 4" stroke="#FFCF4D" stroke-width="3" fill="none"/>` : '<path d="M-18 -6 L-6 0 M18 -6 L6 0" stroke="#FFCF4D" stroke-width="4" stroke-linecap="round"/><circle cx="-11" cy="3" r="3.5" fill="#FFCF4D"/><circle cx="11" cy="3" r="3.5" fill="#FFCF4D"/>'}</g></g>`);
    S.maquina_expendedora = (o) => svg(`
        <rect x="14" y="4" width="72" height="92" rx="8" fill="#E0455E" ${st()}/>
        <rect x="22" y="12" width="40" height="56" rx="4" fill="#DDF2FA" ${st(3)}/>
        ${[[30, 24, '#9BD66A'], [42, 24, '#FFCF4D'], [54, 24, '#9B7FD4'], [30, 42, '#FFA64D'], [42, 42, '#8FD0F0'], [54, 42, '#9BD66A']].map(([x, y, c]) => `<rect x="${x - 4}" y="${y - 7}" width="8" height="14" rx="2" fill="${c}" ${st(1.5)}/>`).join('')}
        <path d="M22 56 L62 56" ${st(2)} fill="none"/>
        <rect x="68" y="14" width="12" height="30" rx="3" fill="#FFF6E9" ${st(2.5)}/>
        <rect x="24" y="76" width="36" height="12" rx="3" fill="#2E2A3A" ${st(2.5)}/>
        ${face(42, 62, hurtOr(o), 0.55)}`);

    // ---------- frutas malvadas (mecánicas de espejo y vampirismo) ----------
    S.limon_rencoroso = (o) => svg(`
        <ellipse cx="50" cy="54" rx="34" ry="40" fill="#FFE066" ${st()}/>
        <path d="M50 14 Q54 8 60 8" ${st(3)} fill="none"/>
        <path d="M20 40 Q14 54 20 68 M80 40 Q86 54 80 68" ${st(2.5)} fill="none" opacity=".4"/>
        ${shine(32, 40, 4, 8)}
        ${face(50, 58, hurtOr(o, 'sour'), 0.85)}`);
    S.ciruela_podrida = (o) => svg(`
        <path d="M50 14 Q40 20 40 26" ${st(3)} fill="none"/>${leaf(38, 20, -40, 0.7, '#6E7D57')}
        <circle cx="50" cy="56" r="36" fill="#7A5C9E" ${st()}/>
        <circle cx="34" cy="70" r="5" fill="#4A3A63" opacity=".7"/><circle cx="66" cy="46" r="4" fill="#4A3A63" opacity=".6"/><circle cx="60" cy="74" r="3.5" fill="#4A3A63" opacity=".6"/>
        ${shine(34, 42, 4, 8)}
        ${face(50, 58, hurtOr(o, 'sour'), 0.85)}`);
    S.pina_espinosa = (o) => svg(`
        ${spikes(50, 16, 16, 5, '#5C9E4A')}
        <ellipse cx="50" cy="60" rx="32" ry="36" fill="#E8B84B" ${st()}/>
        <path d="M26 34 Q50 44 74 34 M22 54 Q50 64 78 54 M26 74 Q50 84 74 74" ${st(2.2)} fill="none" opacity=".45"/>
        ${shine(34, 46, 3.5, 7)}
        ${face(50, 62, hurtOr(o), 0.8)}`);
    S.mango_vampiro = (o) => svg(`
        <path d="M50 14 C74 14 88 38 82 62 C76 88 60 96 50 96 C40 96 24 88 18 62 C12 38 26 14 50 14 Z" fill="#F2A33C" ${st()}/>
        <path d="M50 14 C60 10 66 14 66 20" ${st(2.5)} fill="none"/>
        ${shine(32, 42, 4, 8)}
        ${face(50, 60, hurtOr(o, 'angry'), 0.85)}
        <path d="M42 70 L40 78 L45 74 Z M58 70 L60 78 L55 74 Z" fill="#fff" ${st(1.6)}/>`);
    S.fresa_vengativa = (o) => svg(`
        ${leaf(38, 16, -25, 0.9)}${leaf(50, 10, 0, 0.9)}${leaf(62, 16, 25, 0.9)}
        <path d="M50 24 C78 24 88 54 76 76 C68 92 60 96 50 96 C40 96 32 92 24 76 C12 54 22 24 50 24 Z" fill="#F2667A" ${st()}/>
        <circle cx="36" cy="50" r="2" fill="#FFE58A"/><circle cx="58" cy="46" r="2" fill="#FFE58A"/><circle cx="46" cy="64" r="2" fill="#FFE58A"/><circle cx="66" cy="66" r="2" fill="#FFE58A"/><circle cx="30" cy="70" r="2" fill="#FFE58A"/>
        ${shine(34, 42, 3.5, 7)}
        ${face(50, 64, hurtOr(o, 'angry'), 0.85)}`);
})();

// ---------- casilla de regalo (vestidor) ----------
(function () {
    const S = window.SPRITES;
    const { st, svg, sparkle } = window.SPRITE_KIT;
    S.node_gift = () => svg(`
        <rect x="16" y="44" width="68" height="46" rx="6" fill="#9B7FD4" ${st()}/>
        <rect x="10" y="32" width="80" height="16" rx="5" fill="#B7A2E6" ${st()}/>
        <rect x="44" y="32" width="12" height="58" fill="#FFCF4D" ${st(3)}/>
        <path d="M50 32 Q30 10 24 24 Q22 34 50 32 Q70 10 76 24 Q78 34 50 32 Z" fill="#FFCF4D" ${st(3)}/>
        ${sparkle(86, 14, 0.9)}${sparkle(14, 16, 0.6, '#FFB8C6')}`);
})();

// ---------- Profe Limón, el guía del tutorial ----------
(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, leaf, face } = window.SPRITE_KIT;
    S.profe_limon = (o) => svg(`
        <ellipse cx="50" cy="60" rx="34" ry="28" fill="#FFE27A" ${st()}/>
        <path d="M16 60 L10 58 M84 60 L90 58" ${st(3)} fill="none"/>
        ${shine(30, 50, 3.5, 7)}
        ${face(50, 64, o.mood || 'happy', 0.85)}
        <circle cx="42" cy="64" r="7.5" fill="none" ${st(2.5)}/><circle cx="58" cy="64" r="7.5" fill="none" ${st(2.5)}/>
        <path d="M49.5 63 L50.5 63" ${st(2.5)} fill="none"/>
        <path d="M22 30 L50 18 L78 30 L50 42 Z" fill="#4F4A66" ${st()}/>
        <path d="M36 35 L36 44 Q50 50 64 44 L64 35" fill="#4F4A66" ${st(3)}/>
        <path d="M78 30 L78 46" ${st(2.5)} fill="none"/><circle cx="78" cy="48" r="3.5" fill="#FFCF4D" ${st(2)}/>
        ${leaf(56, 36, -20, 0.6)}`);
})();
