// ============================================================
// SPRITES5.JS — Castillos, jaula, casilla de juegos, escalera y
// habitantes del calabozo. Mismo estilo: ayudantes de window.SPRITE_KIT.
// ============================================================

(function () {
    const S = window.SPRITES;
    const { INK, st, svg, shine, sparkle } = window.SPRITE_KIT;

    // almenas: una fila de dientes de piedra en la cima de un muro
    const battlements = (x, y, w, n, fill) => {
        const bw = w / (n * 2 - 1);
        let out = '';
        for (let i = 0; i < n; i++) out += `<rect x="${(x + i * 2 * bw).toFixed(1)}" y="${y}" width="${bw.toFixed(1)}" height="7" fill="${fill}" ${st(2.5)}/>`;
        return out;
    };
    const flag = (x, y, color) => `
        <path d="M${x} ${y} L${x} ${y - 16}" ${st(2.5)} fill="none"/>
        <path d="M${x} ${y - 16} L${x + 13} ${y - 12} L${x} ${y - 8} Z" fill="${color}" ${st(2.2)}/>`;
    const arch = (cx, y, w, h) => `<path d="M${cx - w / 2} ${y + h} L${cx - w / 2} ${y + w / 2} Q${cx} ${y - w / 4} ${cx + w / 2} ${y + w / 2} L${cx + w / 2} ${y + h} Z" fill="#5A3E2B" ${st(2.5)}/>`;
    const windowSlit = (x, y, glow) => `<rect x="${x}" y="${y}" width="5" height="10" rx="2.5" fill="${glow || '#3A2A22'}" ${st(1.8)}/>`;

    // Castillo 1: chiquito, de piedra clara con enredaderas
    S.castle_1 = () => svg(`
        <rect x="28" y="50" width="44" height="40" fill="#D7CFBE" ${st()}/>
        ${battlements(28, 44, 44, 4, '#D7CFBE')}
        <rect x="14" y="40" width="18" height="50" fill="#CFC6B3" ${st()}/>
        <rect x="68" y="40" width="18" height="50" fill="#CFC6B3" ${st()}/>
        <path d="M11 40 L23 18 L35 40 Z" fill="#E0584A" ${st()}/>
        <path d="M65 40 L77 18 L89 40 Z" fill="#E0584A" ${st()}/>
        ${flag(23, 20, '#FFCF4D')}${flag(77, 20, '#7BBF5A')}
        ${arch(50, 66, 18, 24)}
        ${windowSlit(20, 52)}${windowSlit(75, 52)}
        <path d="M30 88 Q28 70 36 62 M70 88 Q74 74 66 66 M20 90 Q16 76 24 70" fill="none" stroke="#5DA33E" stroke-width="4" stroke-linecap="round"/>
        <circle cx="34" cy="70" r="3" fill="#F2667A" ${st(1.4)}/><circle cx="68" cy="74" r="3" fill="#FFCF4D" ${st(1.4)}/>
        ${shine(36, 58, 3, 6)}`);

    // Castillo 2: más alto, rojo y dorado, con un dado gigante en la cima
    S.castle_2 = () => svg(`
        <rect x="24" y="52" width="52" height="38" fill="#E4C9A0" ${st()}/>
        ${battlements(24, 46, 52, 5, '#E4C9A0')}
        <rect x="8" y="36" width="20" height="54" fill="#D9B98B" ${st()}/>
        <rect x="72" y="36" width="20" height="54" fill="#D9B98B" ${st()}/>
        <rect x="34" y="22" width="32" height="34" fill="#EBD3AA" ${st()}/>
        ${battlements(34, 16, 32, 3, '#EBD3AA')}
        <path d="M5 36 L18 12 L31 36 Z" fill="#C8374F" ${st()}/>
        <path d="M69 36 L82 12 L95 36 Z" fill="#C8374F" ${st()}/>
        <rect x="42" y="2" width="16" height="16" rx="3" fill="#fff" ${st(2.6)} transform="rotate(12 50 10)"/>
        <g transform="rotate(12 50 10)" fill="${INK}"><circle cx="46" cy="6" r="1.7"/><circle cx="54" cy="14" r="1.7"/><circle cx="50" cy="10" r="1.7"/><circle cx="54" cy="6" r="1.7"/><circle cx="46" cy="14" r="1.7"/></g>
        ${arch(50, 66, 20, 24)}
        <circle cx="50" cy="38" r="7" fill="#FFCF4D" ${st(2)}/>
        <path d="M46 38 h8 M50 34 v8" ${st(1.6)} fill="none"/>
        ${windowSlit(15, 50, '#FFCF4D')}${windowSlit(80, 50, '#FFCF4D')}
        ${sparkle(90, 12, 0.9)}${sparkle(10, 8, 0.7, '#FFB8C6')}
        ${shine(30, 60, 3, 6)}`);

    // Castillo 3: torre altísima, morada y oscura, con una ventana dorada (el Rey Fruta)
    S.castle_3 = () => svg(`
        <rect x="26" y="58" width="48" height="32" fill="#8D82AE" ${st()}/>
        ${battlements(26, 52, 48, 4, '#8D82AE')}
        <rect x="8" y="46" width="18" height="44" fill="#7C7199" ${st()}/>
        <rect x="74" y="46" width="18" height="44" fill="#7C7199" ${st()}/>
        <path d="M5 46 L17 26 L29 46 Z" fill="#4F4A66" ${st()}/>
        <path d="M71 46 L83 26 L95 46 Z" fill="#4F4A66" ${st()}/>
        <rect x="36" y="12" width="28" height="48" fill="#9A8FBC" ${st()}/>
        ${battlements(36, 6, 28, 3, '#9A8FBC')}
        <path d="M50 6 L50 -2" ${st(2)} fill="none"/>
        <path d="M40 8 L44 -2 L50 4 L56 -2 L60 8 Z" fill="#FFCF4D" ${st(2.2)} transform="translate(0 3)"/>
        <rect x="44" y="20" width="12" height="16" rx="6" fill="#FFE27A" ${st(2.4)}/>
        <path d="M50 20 v16 M44 28 h12" ${st(1.4)} fill="none"/>
        ${arch(50, 68, 18, 22)}
        ${windowSlit(15, 58)}${windowSlit(79, 58)}${windowSlit(46, 44)}
        ${sparkle(50, 26, 0.8, '#fff')}${sparkle(84, 20, 0.7)}${sparkle(14, 20, 0.6, '#C9B5F0')}
        ${shine(40, 40, 3, 7)}`);

    // Casilla "Mesa de Juegos": dado + carta
    S.node_game = () => svg(`
        <rect x="46" y="14" width="34" height="48" rx="5" fill="#fff" ${st()} transform="rotate(16 63 38)"/>
        <path d="M63 30 c-5 -8 -14 -1 -8 7 l8 9 l8 -9 c6 -8 -3 -15 -8 -7 Z" fill="#E0455E" ${st(2)} transform="rotate(16 63 38)"/>
        <rect x="14" y="40" width="46" height="46" rx="10" fill="#FFF6E9" ${st()} transform="rotate(-10 37 63)"/>
        <g transform="rotate(-10 37 63)" fill="${INK}">
            <circle cx="26" cy="52" r="4"/><circle cx="48" cy="52" r="4"/><circle cx="37" cy="63" r="4"/><circle cx="26" cy="74" r="4"/><circle cx="48" cy="74" r="4"/>
        </g>
        ${shine(22, 46, 3, 6)}${sparkle(84, 74, 0.8)}`);

    // Escalera hacia arriba (salida del calabozo)
    S.node_stairs = () => svg(`
        <path d="M10 88 L10 72 L28 72 L28 56 L46 56 L46 40 L64 40 L64 24 L90 24 L90 88 Z" fill="#B7AB97" ${st()}/>
        <path d="M10 72 L28 72 M28 56 L46 56 M46 40 L64 40 M64 24 L90 24" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M74 14 L74 4 M67 10 L74 3 L81 10" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M74 14 L74 4 M67 10 L74 3 L81 10" fill="none" stroke="#FFCF4D" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${sparkle(20, 34, 0.8)}`);

    // Jaula de barrotes (la fruta va dibujada aparte, dentro)
    S.cage = () => svg(`
        <path d="M50 4 L50 14" ${st(3)} fill="none"/>
        <circle cx="50" cy="8" r="5" fill="none" ${st(3)}/>
        <path d="M18 88 Q14 30 50 16 Q86 30 82 88 Z" fill="rgba(255,255,255,.28)" ${st(3.5)}/>
        <path d="M34 86 Q31 34 50 18 M50 86 L50 16 M66 86 Q69 34 50 18" fill="none" ${st(3)}/>
        <rect x="12" y="84" width="76" height="9" rx="4" fill="#8C6A3F" ${st(3)}/>
        <path d="M30 86 L34 92 M50 86 L54 92 M70 86 L74 92" stroke="#C9A25F" stroke-width="2" stroke-linecap="round"/>`);

    // ---------- habitantes del calabozo ----------
    // Calavera (casilla con bicho al acecho)
    S.dg_skull = () => svg(`
        <path d="M22 54 Q18 14 50 12 Q82 14 78 54 Q78 66 68 68 L68 82 L32 82 L32 68 Q22 66 22 54 Z" fill="#F1EBDD" ${st()}/>
        <ellipse cx="37" cy="48" rx="8.5" ry="10" fill="${INK}"/><ellipse cx="63" cy="48" rx="8.5" ry="10" fill="${INK}"/>
        <circle cx="39" cy="46" r="2.6" fill="#B8FF9A"/><circle cx="65" cy="46" r="2.6" fill="#B8FF9A"/>
        <path d="M46 62 L50 56 L54 62 Z" fill="${INK}"/>
        <path d="M38 82 L38 72 M46 82 L46 72 M54 82 L54 72 M62 82 L62 72" ${st(2.4)} fill="none"/>
        ${shine(32, 26, 3, 8)}`);
    // Telaraña
    S.dg_web = () => svg(`
        <g fill="none" stroke="#DCD6C8" stroke-width="2.4" stroke-linecap="round">
            <path d="M6 6 L94 94 M50 4 L50 96 M94 6 L6 94 M4 50 L96 50"/>
            <path d="M22 22 Q34 30 30 40 Q22 38 22 22 M50 22 Q62 28 68 24 M78 22 Q70 34 60 30 M22 78 Q34 70 40 78 M78 78 Q66 70 60 78"/>
            <path d="M30 30 Q50 40 70 30 M30 70 Q50 60 70 70 M30 30 Q40 50 30 70 M70 30 Q60 50 70 70"/>
        </g>`);
    // Antorcha
    S.dg_torch = () => svg(`
        <rect x="44" y="46" width="12" height="44" rx="4" fill="#7A5A3A" ${st()}/>
        <rect x="38" y="40" width="24" height="10" rx="3" fill="#5A4A3A" ${st(2.5)}/>
        <path d="M50 8 C68 28 72 36 62 44 C58 34 54 32 50 28 C46 32 42 34 38 44 C28 36 34 24 50 8 Z" fill="#FF9A3D" ${st(3)}/>
        <path d="M50 22 C58 32 60 38 54 44 C50 40 46 40 46 36 C46 30 48 28 50 22 Z" fill="#FFE27A"/>`);
    // Cadenas
    S.dg_chain = () => svg(`
        <g fill="none" ${st(3.5)} stroke="#7A7F88">
            <ellipse cx="50" cy="16" rx="8" ry="11"/><ellipse cx="50" cy="34" rx="6" ry="11" transform="rotate(0)"/>
            <ellipse cx="50" cy="52" rx="8" ry="11"/><ellipse cx="50" cy="70" rx="6" ry="11"/><ellipse cx="50" cy="88" rx="8" ry="10"/>
        </g>`);
    // Calabaza tallada / fantasma para variar el calabozo
    S.dg_ghost = () => svg(`
        <path d="M22 88 L22 46 Q22 12 50 12 Q78 12 78 46 L78 88 L66 78 L56 90 L46 78 L34 90 Z" fill="#F4F0FF" ${st()}/>
        <ellipse cx="40" cy="44" rx="6" ry="8" fill="${INK}"/><ellipse cx="60" cy="44" rx="6" ry="8" fill="${INK}"/>
        <ellipse cx="50" cy="62" rx="6" ry="8" fill="${INK}"/>
        <ellipse cx="30" cy="56" rx="4.5" ry="2.8" fill="#FFB8C6" opacity=".7"/><ellipse cx="70" cy="56" rx="4.5" ry="2.8" fill="#FFB8C6" opacity=".7"/>
        ${shine(34, 26, 3, 7)}`);
})();
