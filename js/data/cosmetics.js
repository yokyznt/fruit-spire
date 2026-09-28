// ============================================================
// COSMETICS.JS — Vestidor: colores (skins) y accesorios de las frutas.
// Se consiguen en los regalos 🎁 del mapa, en cofres de tesoro y en
// los botines (jefes siempre, élites a veces, combates normales rara vez).
// Lo conseguido y lo que lleva puesto cada fruta se guarda en el navegador.
//
// Skins:       { id, type: 'skin', char, name, colors: { body, body2, core, leaf } }
// Accesorios:  { id, type: 'acc', slot: 'head' | 'face' | 'neck', name, draw(), char? }
//              (con char, solo esa fruta puede ponérselo)
// Mascotitas:  { id, type: 'pet', slot: 'pet', char, name, bonus, draw(), req,
//                onCombatStart(ctx)?, onFirstTurn(ctx)?, onWin(player) → oro extra }
//              frutitas que acompañan a su fruta y dan una pequeña mejora.
//              No salen al azar: se desbloquean con un reto (req):
//                { bossAct: n }  vencer al jefe del nivel n con esa fruta
//                { win: grado }  ganar una partida con esa fruta en ese grado o uno más difícil
//   draw() devuelve SVG en coordenadas locales:
//     head: la base del accesorio en (0,0) y crece hacia arriba (±20 de ancho)
//     face: los ojos están en (-9,0) y (9,0)
//     neck: centrado en (0,0)
// CHAR_ANCHORS dice dónde va cada ranura en el dibujo de cada fruta.
// ============================================================

(function () {
    const INK = '#4A3428';
    const st = (w) => `stroke="${INK}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"`;

    // [x, y, escala, giro] de cada ranura sobre el dibujo (viewBox 100x100)
    window.CHAR_ANCHORS = {
        manzana: { head: [50, 28, 1, 0], face: [50, 59, 1, 0], neck: [50, 77, 1, 0] },
        platanin: { head: [38, 38, 0.8, -28], face: [45, 62, 0.8, 0], neck: [48, 74, 0.8, -12] },
        kiwi: { head: [50, 18, 1, 0], face: [50, 55, 0.78, 0], neck: [50, 70, 0.85, 0] },
        uva: { head: [50, 18, 0.9, 0], face: [50, 50, 0.75, 0], neck: [50, 67, 0.8, 0] }
    };

    const list = [];
    const skin = (char, id, name, colors) => list.push({ id, type: 'skin', char, name, colors });
    const acc = (slot, id, name, draw, char) => list.push({ id, type: 'acc', slot, name, draw, char });
    const pet = (char, id, name, bonus, draw, hooks) => list.push(Object.assign({ id, type: 'pet', slot: 'pet', char, name, bonus, draw }, hooks));

    // ---------- colores ----------
    skin('manzana', 'manzana_clasica', 'Roja', {});
    skin('manzana', 'manzana_verde', 'Verde Ácida', { body: '#9BD66A', leaf: '#4E8F3A' });
    skin('manzana', 'manzana_dorada', 'Dorada', { body: '#FFCF4D' });
    skin('manzana', 'manzana_caramelo', 'Acaramelada', { body: '#C8612E' });
    skin('platanin', 'platanin_clasico', 'Amarillo', {});
    skin('platanin', 'platanin_verde', 'Verde', { body: '#B7E27F' });
    skin('platanin', 'platanin_maduro', 'Maduro', { body: '#E8B84A' });
    skin('platanin', 'platanin_fresa', 'Fresa', { body: '#FFB8C6' });
    skin('kiwi', 'kiwi_clasico', 'Verde', {});
    skin('kiwi', 'kiwi_dorado', 'Dorado', { body: '#FFD95A', body2: '#C9A27A' });
    skin('kiwi', 'kiwi_rojo', 'Rojo', { body: '#F2667A' });
    skin('kiwi', 'kiwi_galactico', 'Galáctico', { body: '#9B7FD4', body2: '#4F4A66', core: '#E6DCF7' });
    skin('uva', 'uva_clasica', 'Morada', {});
    skin('uva', 'uva_verde', 'Verde', { body: '#9BD66A', body2: '#7BBF5A' });
    skin('uva', 'uva_roja', 'Roja', { body: '#E0455E', body2: '#C8374F' });
    skin('uva', 'uva_arandano', 'Arándano', { body: '#5A6FB0', body2: '#4A5E9E' });

    // ---------- cabeza ----------
    acc('head', 'gorra', 'Gorra', () => `
        <path d="M8 -3 L30 -3 Q30 3 8 3 Z" fill="#4A5E9E" ${st(2.5)}/>
        <path d="M-18 0 Q-18 -22 0 -22 Q18 -22 18 0 Z" fill="#5A6FB0" ${st()}/>
        <circle cx="0" cy="-22" r="3" fill="#fff" ${st(2)}/>`);
    acc('head', 'sombrero_copa', 'Sombrero de Copa', () => `
        <rect x="-13" y="-34" width="26" height="32" rx="3" fill="#4F4A66" ${st()}/>
        <rect x="-13" y="-12" width="26" height="6" fill="#F2667A" ${st(2)}/>
        <ellipse cx="0" cy="-2" rx="23" ry="5" fill="#4F4A66" ${st()}/>`);
    acc('head', 'gorro_chef', 'Gorro de Chef', () => `
        <path d="M-14 -4 L-14 -16 Q-26 -20 -19 -32 Q-12 -42 0 -35 Q12 -42 19 -32 Q26 -20 14 -16 L14 -4 Z" fill="#fff" ${st()}/>
        <rect x="-15" y="-8" width="30" height="8" rx="2" fill="#fff" ${st(2.5)}/>`);
    acc('head', 'corona', 'Corona', () => `
        <path d="M-17 0 L-17 -20 L-8 -10 L0 -26 L8 -10 L17 -20 L17 0 Z" fill="#FFCF4D" ${st()}/>
        <circle cx="0" cy="-8" r="3" fill="#F2667A" ${st(1.5)}/><circle cx="-10" cy="-5" r="2.2" fill="#5CC9A7" ${st(1.5)}/><circle cx="10" cy="-5" r="2.2" fill="#9B7FD4" ${st(1.5)}/>`);
    acc('head', 'mono', 'Moño', () => `
        <path d="M0 -8 L-18 -18 L-18 2 Z" fill="#FF8FA3" ${st()}/>
        <path d="M0 -8 L18 -18 L18 2 Z" fill="#FF8FA3" ${st()}/>
        <circle cx="0" cy="-8" r="5" fill="#F2667A" ${st(2.5)}/>`);
    acc('head', 'corona_flores', 'Corona de Flores', () => [[-18, -2], [-9, -8], [0, -10], [9, -8], [18, -2]].map(([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="5.5" fill="${['#FFB8C6', '#FFE27A', '#fff', '#FFE27A', '#FFB8C6'][i]}" ${st(2)}/><circle cx="${x}" cy="${y}" r="1.8" fill="#FFA64D"/>`).join(''));
    acc('head', 'gorro_fiesta', 'Gorro de Fiesta', () => `
        <path d="M-13 0 L0 -34 L13 0 Z" fill="#5CC9A7" ${st()}/>
        <path d="M-8 -12 L6 -14 M-4 -24 L4 -25" stroke="#FFE27A" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="-35" r="5" fill="#F2667A" ${st(2)}/>`);
    acc('head', 'audifonos', 'Audífonos', () => `
        <path d="M-24 10 Q-26 -20 0 -22 Q26 -20 24 10" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <path d="M-24 10 Q-26 -20 0 -22 Q26 -20 24 10" fill="none" stroke="#F2667A" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="-31" y="2" width="12" height="18" rx="5" fill="#F2667A" ${st(2.5)}/>
        <rect x="19" y="2" width="12" height="18" rx="5" fill="#F2667A" ${st(2.5)}/>`);

    // ---------- cara ----------
    acc('face', 'lentes_sol', 'Lentes de Sol', () => `
        <path d="M-3 -1 L3 -1" ${st(2.5)} fill="none"/>
        <rect x="-17" y="-6" width="14" height="10" rx="4" fill="#2E2A3A" ${st(2.5)}/>
        <rect x="3" y="-6" width="14" height="10" rx="4" fill="#2E2A3A" ${st(2.5)}/>
        <path d="M-14 -3 L-10 -3 M6 -3 L10 -3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>`);
    acc('face', 'monoculo', 'Monóculo', () => `
        <circle cx="9" cy="0" r="7" fill="rgba(205,235,245,.35)" stroke="#E0A92E" stroke-width="2.5"/>
        <path d="M15 4 Q20 14 16 24" stroke="#E0A92E" stroke-width="1.5" fill="none"/>`);
    acc('face', 'bigote', 'Bigote', () => `
        <path d="M0 4.5 Q-6 0 -13 5 Q-7 10 0 6.5 Q7 10 13 5 Q6 0 0 4.5 Z" fill="#6E4A3A" ${st(1.8)}/>`);
    acc('face', 'antifaz', 'Antifaz', () => `
        <path fill-rule="evenodd" d="M-18 -6 Q0 -10 18 -6 L18 5 Q10 8 4 3 L-4 3 Q-10 8 -18 5 Z M-13.5 -1 a4.5 5 0 1 0 9 0 a4.5 5 0 1 0 -9 0 M4.5 -1 a4.5 5 0 1 0 9 0 a4.5 5 0 1 0 -9 0" fill="#2E2A3A" ${st(1.8)}/>`);

    // ---------- cuello ----------
    acc('neck', 'pajarita', 'Pajarita', () => `
        <path d="M0 0 L-13 -7 L-13 7 Z" fill="#F2667A" ${st(2.5)}/>
        <path d="M0 0 L13 -7 L13 7 Z" fill="#F2667A" ${st(2.5)}/>
        <circle cx="0" cy="0" r="3.5" fill="#E0455E" ${st(2)}/>`);
    acc('neck', 'bufanda', 'Bufanda', () => `
        <path d="M-22 -4 Q0 4 22 -4 L22 4 Q0 12 -22 4 Z" fill="#5CC9A7" ${st(2.5)}/>
        <path d="M10 4 L14 22 L6 22 L4 6 Z" fill="#5CC9A7" ${st(2.5)}/>
        <path d="M-14 0 L-14 6 M-4 2 L-4 8 M6 2 L6 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`);
    acc('neck', 'collar_perlas', 'Collar de Perlas', () => [-16, -8, 0, 8, 16].map((x) =>
        `<circle cx="${x}" cy="${Math.round(Math.abs(x) * -0.25 + 4)}" r="3.8" fill="#FFF6E9" ${st(1.8)}/>`).join(''));

    // ---------- accesorios exclusivos de cada fruta ----------
    acc('head', 'gusanito', 'Gusanito', () => `
        <path d="M-6 0 Q-8 -14 2 -18 Q12 -21 12 -12" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
        <path d="M-6 0 Q-8 -14 2 -18 Q12 -21 12 -12" fill="none" stroke="#FFB8C6" stroke-width="6.5" stroke-linecap="round"/>
        <circle cx="12" cy="-12" r="6" fill="#FFB8C6" ${st(2.5)}/>
        <circle cx="10" cy="-13" r="1.3" fill="${INK}"/><circle cx="14.5" cy="-13" r="1.3" fill="${INK}"/>
        <path d="M-6 -8 L-1 -8 M-3 -15 L2 -14" stroke="#F2667A" stroke-width="1.6" stroke-linecap="round"/>`, 'manzana');
    acc('neck', 'panuelo_picnic', 'Pañuelo de Picnic', () => `
        <path d="M-20 -4 L20 -4 L0 16 Z" fill="#fff" ${st(2.5)}/>
        <path d="M-12 -4 L-6 2 M-2 -4 L4 3 M8 -4 L2 8 M-14 1 L-8 7" stroke="#E0455E" stroke-width="3" stroke-linecap="round"/>
        <circle cx="0" cy="-4" r="3" fill="#E0455E" ${st(1.8)}/>`, 'manzana');
    acc('head', 'orejas_mono', 'Orejas de Mono', () => `
        <circle cx="-17" cy="-8" r="9" fill="#8C6A3F" ${st()}/><circle cx="-17" cy="-8" r="4.5" fill="#E8B08A"/>
        <circle cx="17" cy="-8" r="9" fill="#8C6A3F" ${st()}/><circle cx="17" cy="-8" r="4.5" fill="#E8B08A"/>
        <path d="M-15 -2 Q0 -12 15 -2" fill="none" stroke="#8C6A3F" stroke-width="5" stroke-linecap="round"/>`, 'platanin');
    acc('face', 'lentes_corazon', 'Lentes de Corazón', () => `
        <path d="M-3 -2 L3 -2" ${st(2.5)} fill="none"/>
        <path d="M-10 6 L-17 -1 Q-19 -7 -14 -8 Q-11 -8 -10 -5 Q-9 -8 -6 -8 Q-1 -7 -3 -1 Z" fill="#F2667A" ${st(2)}/>
        <path d="M10 6 L3 -1 Q1 -7 6 -8 Q9 -8 10 -5 Q11 -8 14 -8 Q19 -7 17 -1 Z" fill="#F2667A" ${st(2)}/>`, 'platanin');
    acc('head', 'cresta_plumas', 'Cresta de Plumas', () => `
        <path d="M-2 0 Q-14 -10 -12 -24 Q-4 -14 -2 0 Z" fill="#8C6A3F" ${st(2.5)}/>
        <path d="M0 0 Q-2 -18 4 -30 Q8 -14 0 0 Z" fill="#A67C52" ${st(2.5)}/>
        <path d="M2 0 Q12 -8 14 -22 Q4 -14 2 0 Z" fill="#8C6A3F" ${st(2.5)}/>`, 'kiwi');
    acc('face', 'gafas_buceo', 'Gafas de Buceo', () => `
        <path d="M-22 0 L-17 0 M17 0 L22 0" stroke="#5CC9A7" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="-18" y="-7" width="36" height="13" rx="6" fill="rgba(143,208,240,.55)" ${st(2.5)}/>
        <path d="M0 -7 L0 6" ${st(2)}/>
        <path d="M-13 -3 L-9 -3 M5 -3 L9 -3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`, 'kiwi');
    acc('head', 'hoja_parra', 'Hoja de Parra', () => `
        <path d="M0 0 C-6 -4 -20 -4 -22 -12 C-16 -12 -16 -18 -20 -22 C-12 -22 -8 -26 -6 -32 C-2 -26 2 -26 6 -32 C8 -26 12 -22 20 -22 C16 -18 16 -12 22 -12 C20 -4 6 -4 0 0 Z" fill="#7BBF5A" ${st(2.5)}/>
        <path d="M0 0 L0 -24 M0 -8 L-12 -16 M0 -8 L12 -16" stroke="#4E8F3A" stroke-width="2" stroke-linecap="round" fill="none"/>`, 'uva');
    acc('neck', 'collar_corchos', 'Collar de Corchos', () => `
        <path d="M-20 -4 Q0 10 20 -4" fill="none" stroke="${INK}" stroke-width="2"/>
        ${[-14, 0, 14].map((x) => `<rect x="${x - 4}" y="${x === 0 ? 1 : -3}" width="8" height="11" rx="2" fill="#D9A866" ${st(2)}/><path d="M${x - 2} ${x === 0 ? 5 : 1} h4" stroke="#A67C52" stroke-width="1.5"/>`).join('')}`, 'uva');

    // ---------- mascotitas (frutitas que acompañan y ayudan un poquito) ----------
    // cuerpo redondito con carita; centro en (0,0), unos ±13 de ancho
    const face = (y) => `
        <circle cx="-4" cy="${y}" r="1.7" fill="${INK}"/><circle cx="4" cy="${y}" r="1.7" fill="${INK}"/>
        <circle cx="-3.4" cy="${y - 0.6}" r=".6" fill="#fff"/><circle cx="4.6" cy="${y - 0.6}" r=".6" fill="#fff"/>
        <path d="M-2 ${y + 3} Q0 ${y + 5} 2 ${y + 3}" fill="none" ${st(1.4)}/>
        <ellipse cx="-7" cy="${y + 2.5}" rx="2" ry="1.2" fill="#FF8FA3" opacity=".6"/><ellipse cx="7" cy="${y + 2.5}" rx="2" ry="1.2" fill="#FF8FA3" opacity=".6"/>`;
    const shine = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3.2" fill="#fff" opacity=".55" transform="rotate(30 ${x} ${y})"/>`;
    const leaf = (x, y, rot) => `<path d="M${x} ${y} q5 -7 11 -4 q-4 6 -11 4 z" fill="#7BBF5A" ${st(1.6)} transform="rotate(${rot || 0} ${x} ${y})"/>`;
    const dots = (pts, fill) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${fill}"/>`).join('');
    const cluster = (fill, fill2) => [[-6, -4], [0, -6], [6, -4], [-8, 2], [-2, 1], [4, 1], [8, 3], [-5, 7], [1, 8], [6, 8]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${fill}" ${st(1.4)}/>`).join('') +
        [[-6, -5], [0, -7], [6, -5], [-2, 0], [4, 0]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${fill2}"/>`).join('');

    // Manzana
    pet('manzana', 'pet_cereza', 'Cerecita', 'Al empezar cada combate, ganas 3 de cáscara.', () => `
        <path d="M0 -6 Q2 -16 8 -20" fill="none" stroke="#4E8F3A" stroke-width="2.2" stroke-linecap="round"/>${leaf(6, -19, -10)}
        <circle cx="0" cy="2" r="10" fill="#E0455E" ${st(2)}/>${shine(-4, -2)}${face(2)}`,
        { req: { bossAct: 2 }, onFirstTurn: (ctx) => ctx.combat.gainBlock(ctx.player, 3, false) });
    pet('manzana', 'pet_fresa', 'Fresita', 'Al ganar un combate, recuperas 3 ❤️.', () => `
        <path d="M-11 -5 Q0 -9 11 -5 Q10 8 0 13 Q-10 8 -11 -5 Z" fill="#F2667A" ${st(2)}/>
        <path d="M-8 -6 L-4 -11 L0 -7 L4 -11 L8 -6 Z" fill="#7BBF5A" ${st(1.6)}/>
        ${dots([[-6, 6], [6, 6], [0, 9], [-8, 0], [8, 0]], '#FFE27A')}${face(0)}`,
        { req: { win: 'madura' }, onWin: (p) => { p.heal(3); return 0; } });
    pet('manzana', 'pet_grosella', 'Grosella', 'Empiezas cada combate con 1 de Madurez.', () => `
        <path d="M0 -8 L0 -14" stroke="#6E4A3A" stroke-width="2" stroke-linecap="round"/>
        <circle cx="0" cy="1" r="10" fill="#FF6F6F" fill-opacity=".85" ${st(2)}/>
        <path d="M0 -9 Q-6 1 0 11 M0 -9 Q6 1 0 11" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>${face(2)}`,
        { req: { win: 'podrida' }, onCombatStart: (ctx) => ctx.combat.applyStatus(ctx.player, 'strength', 1) });

    // Platanín
    pet('platanin', 'pet_kumquat', 'Kumquat', 'Empiezas cada combate con 1 de Firmeza.', () => `
        <ellipse cx="0" cy="1" rx="9" ry="11" fill="#FFA64D" ${st(2)}/>${leaf(0, -10, -30)}${shine(-4, -3)}
        ${dots([[-5, 7], [4, 8], [6, -4]], '#E08A2E')}${face(1)}`,
        { req: { bossAct: 2 }, onCombatStart: (ctx) => ctx.combat.applyStatus(ctx.player, 'dexterity', 1) });
    pet('platanin', 'pet_mora', 'Morita', 'Al empezar cada combate, robas 1 carta extra.', () => `
        <path d="M0 -10 L0 -15" stroke="#4E8F3A" stroke-width="2.2" stroke-linecap="round"/>${cluster('#4F3A66', '#9B7FD4')}${face(1)}`,
        { req: { win: 'madura' }, onFirstTurn: (ctx) => ctx.draw(1) });
    pet('platanin', 'pet_maracuya', 'Maracuyita', 'En el primer turno de cada combate, ganas 1 de energía.', () => `
        <circle cx="0" cy="1" r="11" fill="#8E5BA8" ${st(2)}/>${leaf(1, -9, -40)}
        ${dots([[-7, -4], [6, -5], [-8, 6], [8, 5], [0, 9]], '#C9A7E0')}${shine(-5, -3)}${face(1)}`,
        { req: { win: 'podrida' }, onFirstTurn: (ctx) => ctx.gainEnergy(1) });

    // Kiwi
    pet('kiwi', 'pet_arandano', 'Arandanito', 'Al empezar cada combate, aplica 2 de Putrefacción a un enemigo al azar.', () => `
        <circle cx="0" cy="1" r="10.5" fill="#5A6FB0" ${st(2)}/>
        <path d="M-3 -9 L0 -12 L3 -9 L0 -7 Z" fill="#4A5E9E" ${st(1.4)}/>${shine(-4, -3)}${face(2)}`,
        { req: { bossAct: 2 }, onCombatStart: (ctx) => { const al = ctx.combat.aliveEnemies(); if (al.length) ctx.combat.applyStatus(al[Math.floor(Math.random() * al.length)], 'poison', 2); } });
    pet('kiwi', 'pet_lichi', 'Lichi', 'Empiezas cada combate con 2 de Pinchos.', () => `
        <circle cx="0" cy="1" r="10.5" fill="#F28FA8" ${st(2)}/>
        ${dots([[-6, -5], [0, -7], [6, -5], [-8, 2], [8, 2], [-5, 8], [5, 8], [0, 10]], '#C8374F')}
        <path d="M0 -9 L0 -14" stroke="#6E4A3A" stroke-width="2" stroke-linecap="round"/>${face(1)}`,
        { req: { win: 'madura' }, onCombatStart: (ctx) => ctx.combat.applyStatus(ctx.player, 'thorns', 2) });
    pet('kiwi', 'pet_frambuesa', 'Frambuesita', 'Al ganar un combate, ganas 6 de oro extra.', () => `
        <path d="M-4 -10 L0 -14 L4 -10" fill="#7BBF5A" ${st(1.6)}/>${cluster('#E0455E', '#FF8FA3')}${face(1)}`,
        { req: { win: 'podrida' }, onWin: () => 6 });

    // Uva
    pet('uva', 'pet_uvita', 'Uvita', 'Al empezar cada combate, planta un brote Pasita.', () => `
        <path d="M0 -9 Q1 -14 5 -16" fill="none" stroke="#6E4A3A" stroke-width="2" stroke-linecap="round"/>${leaf(2, -13, -20)}
        <ellipse cx="0" cy="1" rx="9.5" ry="10.5" fill="#B7E27F" ${st(2)}/>${shine(-4, -3)}${face(2)}`,
        { req: { bossAct: 2 }, onFirstTurn: (ctx) => ctx.combat.plant('pasita') });
    pet('uva', 'pet_aceituna', 'Aceitunita', 'Al empezar cada combate, ganas 4 de cáscara.', () => `
        <ellipse cx="0" cy="1" rx="8.5" ry="11" fill="#5C7A3A" ${st(2)}/>
        <circle cx="0" cy="-7" r="3" fill="#E0455E" ${st(1.4)}/>${shine(-4, -1)}${face(2)}`,
        { req: { win: 'madura' }, onFirstTurn: (ctx) => ctx.combat.gainBlock(ctx.player, 4, false) });
    pet('uva', 'pet_endrina', 'Endrina', 'Al ganar un combate, recuperas 3 ❤️.', () => `
        <circle cx="0" cy="1" r="10.5" fill="#3E4E8C" ${st(2)}/>
        <circle cx="0" cy="1" r="9" fill="#9FB0E0" opacity=".25"/>
        <path d="M0 -9 L0 -14" stroke="#6E4A3A" stroke-width="2" stroke-linecap="round"/>${shine(-4, -3)}${face(2)}`,
        { req: { win: 'podrida' }, onWin: (p) => { p.heal(3); return 0; } });

    window.COSMETICS = list;
    window.getCosmetic = (id) => list.find((c) => c.id === id) || null;
    const SLOT_NAMES = { head: 'Cabeza', face: 'Cara', neck: 'Cuello', pet: 'Mascotita' };
    window.COSMETIC_SLOTS = SLOT_NAMES;

    // ---------- guardado ----------
    const KEY = 'fruitSpireCosmetics_v1';
    const FREE = ['manzana_clasica', 'platanin_clasico', 'kiwi_clasico', 'uva_clasica', 'gorra'];
    function read() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
        s = s || {};
        s.owned = Array.from(new Set([...(s.owned || []), ...FREE]));
        s.equipped = s.equipped || {};
        return s;
    }
    function write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

    window.isCosmeticOwned = (id) => read().owned.includes(id);
    window.ownedCosmeticCount = () => read().owned.length;
    window.grantCosmetic = function (id) {
        const s = read();
        if (!s.owned.includes(id)) s.owned.push(id);
        write(s);
        return window.getCosmetic(id);
    };
    // Lo que lleva puesto una fruta: { skin, head, face, neck, pet } (ids o null)
    window.equippedFor = function (charId) {
        const e = read().equipped[charId] || {};
        return { skin: e.skin || null, head: e.head || null, face: e.face || null, neck: e.neck || null, pet: e.pet || null };
    };
    // Mascotita que acompaña a una fruta (o null)
    window.petFor = function (charId) {
        const id = window.equippedFor(charId).pet;
        const c = id && window.getCosmetic(id);
        return c && c.type === 'pet' && c.char === charId && window.isCosmeticOwned(id) ? c : null;
    };
    // Ponerse / quitarse algo. Una skin reemplaza a la otra; un accesorio
    // igual al puesto se quita.
    window.equipCosmetic = function (charId, id) {
        const c = window.getCosmetic(id);
        const s = read();
        if (!c || !s.owned.includes(id) || (c.char && c.char !== charId)) return;
        const e = s.equipped[charId] || (s.equipped[charId] = {});
        if (c.type === 'skin') e.skin = id;
        else e[c.slot] = e[c.slot] === id ? null : id;
        write(s);
    };
    window.unequipSlot = function (charId, slot) {
        const s = read();
        if (s.equipped[charId]) s.equipped[charId][slot] = null;
        write(s);
    };
    // Algo que todavía no tengas (a veces un color de tu fruta actual)
    window.rollCosmetic = function (charId) {
        const owned = read().owned;
        // las mascotitas no salen al azar: se ganan con su reto
        const missing = list.filter((c) => c.type !== 'pet' && !owned.includes(c.id) && (!c.char || c.char === charId));
        const pool = missing.length ? missing : list.filter((c) => c.type !== 'pet' && !owned.includes(c.id));
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };

    // ---------- retos de las mascotitas ----------
    window.petHowText = function (c) {
        const who = (window.CHARACTER_DB[c.char] || {}).name || c.char;
        if (c.req.bossAct) return `Vence al jefe del Nivel ${c.req.bossAct} jugando con ${who}.`;
        const d = window.getDifficulty(c.req.win);
        return `Gana una partida con ${who} en grado ${d.name}${c.req.win === 'podrida' ? '' : ' o más difícil'}.`;
    };
    // Revisa los retos tras un logro y devuelve las mascotitas nuevas.
    // got: { bossAct } al vencer a un jefe, { bossAct, win: gradoId } al ganar la partida
    window.checkPetUnlocks = function (charId, got) {
        const ids = window.DIFFICULTIES.map((d) => d.id);
        const done = (r) => (r.bossAct ? (got.bossAct || 0) >= r.bossAct
            : got.win && ids.indexOf(got.win) >= ids.indexOf(r.win));
        return list.filter((c) => c.type === 'pet' && c.char === charId && !window.isCosmeticOwned(c.id) && done(c.req))
            .map((c) => window.grantCosmetic(c.id));
    };

    // ---------- dibujar la fruta vestida ----------
    // Opciones para art(): colores de la skin + accesorios encima del dibujo
    window.dressOptions = function (charId, override) {
        const eq = Object.assign(window.equippedFor(charId), override || {});
        const skinC = eq.skin ? window.getCosmetic(eq.skin) : null;
        const anchors = window.CHAR_ANCHORS[charId];
        let dress = '';
        if (anchors) {
            ['neck', 'face', 'head'].forEach((slot) => {
                const a = eq[slot] && window.getCosmetic(eq[slot]);
                if (!a || (a.char && a.char !== charId)) return;
                const [x, y, sc, rot] = anchors[slot];
                dress += `<g class="acc acc-${slot}" transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">${a.draw()}</g>`;
            });
        }
        // la mascotita va a los pies, abajo a la izquierda
        const p = eq.pet && window.getCosmetic(eq.pet);
        if (p && p.char === charId && window.isCosmeticOwned(p.id)) dress += `<g class="pet" transform="translate(13 86) scale(.78)"><g class="pet-hop">${p.draw()}</g></g>`;
        return Object.assign({}, skinC ? skinC.colors : {}, { dress });
    };
})();
