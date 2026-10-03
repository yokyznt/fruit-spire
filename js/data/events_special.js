// ============================================================
// EVENTS_SPECIAL.JS — Eventos especiales inspirados en mecánicas de otros
// juegos (Balatro, The Binding of Isaac, Hades, Slay the Spire, Dark Souls…)
// y las mesas de juego. Son sencillos: una decisión y un resultado.
// Campos extra (además de los de events.js):
//   themes   temas de piso en los que puede salir (opcional)
//   w        peso al sortear (por defecto 1; más = sale más)
//   option.game   abre una Mesa de Juegos: 'dice' | 'poker' | 'chess'
//   effect(p, g)  puede devolver { fight: true } para empezar una pelea
// Ayudantes nuevos en g: grantRelicTier(tiers), grantSeed(), transformRandom().
// ============================================================

(function () {
    const rnd = (n) => Math.floor(Math.random() * n);
    const pick = (list) => list[rnd(list.length)];
    const noGold = (n) => (p) => (p.gold < n ? 'No te alcanza el oro' : '');
    const CASINO = ['dados', 'poker', 'ajedrez'];

    const list = [
        // ---------- mesas de juego ----------
        {
            id: 'mesa_dados', title: 'Mesa de Dados', icon: '🎲', sprite: 'node_game', themes: CASINO.concat(['mercado']), w: 2,
            desc: 'Un fieltro rojo, un cubilete y un tahúr con cara de pocos amigos. Un dado te guiña un ojo.',
            options: [
                { text: 'Sentarte a jugar Veintiuno de Dados', game: 'dice' },
                { text: 'Seguir de largo', effect: () => 'Dejas a los dados rodando solos.' }
            ]
        },
        {
            id: 'mesa_poker', title: 'Mesa de Póker', icon: '🃏', sprite: 'node_game', themes: CASINO.concat(['cocina']), w: 2,
            desc: 'Una baraja gastada y una silla vacía. "¿Una manito?", pregunta el crupier sin mirarte.',
            options: [
                { text: 'Jugar una mano de Póker de 5 cartas', game: 'poker' },
                { text: 'Rechazar con una sonrisa', effect: () => 'Nadie apuesta contra una fruta prudente.' }
            ]
        },
        {
            id: 'mesa_ajedrez', title: 'Tablero Chiquito', icon: '♟️', sprite: 'node_game', themes: CASINO.concat(['torre_rey']), w: 2,
            desc: 'Un tablerito de 5 columnas con las piezas ya puestas. Un peón negro te invita a sentarte.',
            options: [
                { text: 'Aceptar la partida (cómete todas sus piezas)', game: 'chess' },
                { text: 'Dejar el tablero en paz', effect: () => 'El peón suspira y vuelve a su casilla.' }
            ]
        },

        // ---------- Balatro ----------
        {
            id: 'tragamonedas', title: 'Máquina Tragamonedas', icon: '🎰', themes: CASINO.concat(['mercado', 'fabrica']), w: 2,
            desc: 'Una máquina de luces intermitentes. Tres rodillos, una palanca y un cartel: «¡Hoy sí!».',
            options: [
                { text: 'Jugar a la tragamonedas', game: 'slots' },
                { text: 'Alejarte de la máquina', effect: () => 'Las luces parpadean, decepcionadas.' }
            ]
        },
        {
            id: 'comodin_sonriente', title: 'Comodín Sonriente', icon: '🃏', sprite: 'comodin_descarado', w: 1,
            desc: 'Un comodín se te pega al hombro con una sonrisa de oreja a oreja. "Tengo un trato para ti".',
            options: [
                {
                    text: 'Aceptar (+1 de Madurez para siempre, pero se cuela una Carta Marcada)',
                    effect: (p, g) => { p.permanentStrength = (p.permanentStrength || 0) + 1; g.addCard('carta_marcada'); return 'El comodín ríe. Sientes más fuerza… y un naipe raro en tu mazo.'; }
                },
                { text: 'Pedirle una carta rara (pagas 30 de oro)', locked: noGold(30), effect: (p, g) => { p.gold -= 30; const c = g.randomCard('rare'); g.addCard(c.id); return `El comodín te guiña y desliza ${c.name} en tu mazo.`; } },
                { text: 'Ignorarlo', effect: () => 'El comodín se desvanece en confeti.' }
            ]
        },
        {
            id: 'ruleta_fortuna', title: 'Ruleta de la Fortuna', icon: '🎡', w: 1,
            desc: 'Una ruleta gigante gira sola, chirriando. Cada gajo tiene un premio… o un castigo.',
            options: [
                { text: 'Apostar en la ruleta de casino', game: 'roulette' },
                {
                    text: 'Girarla (gratis)', tone: 'risk',
                    effect: (p, g) => {
                        const r = rnd(6);
                        if (r === 0) { const gold = 60 + rnd(40); p.gold += gold; return `¡Cae en el dorado! +${gold} de oro.`; }
                        if (r === 1) { const n = g.upgradeRandom(1); return n.length ? `Cae en el verde: ${n[0]} madura.` : 'Cae en el verde, pero no había nada que madurar.'; }
                        if (r === 2) { p.maxHp += 8; p.hp += 8; return 'Cae en el rojo: +8 ❤️ máx.'; }
                        if (r === 3) { p.hp = Math.max(1, p.hp - 9); return 'Cae en el negro: pierdes 9 ❤️.'; }
                        if (r === 4) { g.addCard('fruta_magullada'); return 'Cae en el morado: una Fruta Magullada se cuela en tu mazo.'; }
                        return g.grantSeed() || 'Cae en el azul: una semilla… pero tu bolsa está llena.';
                    }
                },
                { text: 'Dejarla girar sin ti', effect: () => 'La ruleta sigue girando, aburrida.' }
            ]
        },

        // ---------- The Binding of Isaac ----------
        {
            id: 'trato_diablo', title: 'Trato con el Diablo', icon: '😈', w: 1,
            desc: 'Una sala roja con un fuego frío. Una silueta con cuernos sostiene un objeto brillante. "Todo tiene su precio, frutita".',
            options: [
                {
                    text: 'Pagar 12 ❤️ máx. por un objeto raro', locked: (p) => (p.maxHp <= 30 ? 'Estás muy flaca' : ''),
                    effect: (p, g) => { p.maxHp -= 12; p.hp = Math.min(p.hp, p.maxHp); return g.grantRelicTier(['rare', 'uncommon']); }
                },
                {
                    text: 'Pagar 20 ❤️ máx. por DOS objetos', locked: (p) => (p.maxHp <= 40 ? 'Estás muy flaca' : ''),
                    effect: (p, g) => { p.maxHp -= 20; p.hp = Math.min(p.hp, p.maxHp); return `${g.grantRelicTier(['rare', 'uncommon'])} ${g.grantRelicTier(['common', 'uncommon', 'rare'])}`; }
                },
                { text: 'Rechazar el trato', effect: () => 'La silueta se encoge de hombros y se esfuma.' }
            ]
        },
        {
            id: 'sala_sacrificio', title: 'Sala del Sacrificio', icon: '🔺', w: 1,
            desc: 'Un suelo lleno de pinchos y una alcancía dorada. Cada pisada duele, pero la alcancía tintinea.',
            options: [
                { text: 'Pisar un pincho (−7 ❤️, +40 de oro)', effect: (p) => { p.hp = Math.max(1, p.hp - 7); p.gold += 40; return '¡Ay! Pero la alcancía te escupe 40 de oro.'; } },
                {
                    text: 'Pisar tres pinchos (−20 ❤️, +90 de oro y un objeto)', locked: (p) => (p.hp <= 22 ? 'Te quedarías sin vida' : ''),
                    effect: (p, g) => { p.hp = Math.max(1, p.hp - 20); p.gold += 90; return `¡Auch, auch, auch! +90 de oro. ${g.grantRelicTier(['common', 'uncommon', 'rare'])}`; }
                },
                { text: 'No vale la pena', effect: () => 'Cuentas los pinchos y decides que no.' }
            ]
        },
        {
            id: 'moneda_suerte', title: 'Moneda de la Suerte', icon: '🪙', w: 1,
            desc: 'Una moneda gira en el suelo, sin caer nunca. Dicen que si la atrapas, la suerte te sigue… o te evita.',
            options: [
                { text: 'Atraparla al vuelo', tone: 'risk', effect: (p) => { if (Math.random() < 0.5) { p.gold += 75; return '¡La atrapas! Resulta que era oro de verdad: +75.'; } p.hp = Math.max(1, p.hp - 6); return 'Estaba caliente como un horno. Pierdes 6 ❤️.'; } },
                { text: 'Dejarla girar', effect: () => 'La moneda sigue girando por los siglos de los siglos.' }
            ]
        },

        // ---------- Slay the Spire / Hades / Dark Souls / clásicos ----------
        {
            id: 'muro_viviente', title: 'Muro Viviente', icon: '🧱', w: 1,
            desc: 'Un muro con una cara de piedra bosteza. "Puedo cambiarte… si quieres".',
            options: [
                { text: 'Olvidar (quita una carta al azar de tu mazo)', effect: (p, g) => { const n = g.removeRandom(false); return n ? `El muro se traga ${n}.` : 'El muro no encontró nada que tragar.'; } },
                { text: 'Cambiar (transforma una carta al azar)', tone: 'risk', effect: (p, g) => { const n = g.transformRandom(); return n || 'El muro no encontró qué cambiar.'; } },
                { text: 'Crecer (madura una carta al azar)', effect: (p, g) => { const n = g.upgradeRandom(1); return n.length ? `${n[0]} se endurece como piedra.` : 'Nada que madurar.'; } }
            ]
        },
        {
            id: 'bendicion_dioses', title: 'Bendición de los Dioses', icon: '🏛️', w: 1,
            desc: 'Tres pilares brillan en una sala de mármol. Una voz retumba: "Elige un don, mortal frutal".',
            options: [
                { text: 'Don de Ares (+1 de Madurez al empezar cada combate)', effect: (p) => { p.permanentStrength = (p.permanentStrength || 0) + 1; return 'Ares sonríe: empiezas cada combate con +1 de Madurez.'; } },
                { text: 'Don de Deméter (+14 ❤️ máx.)', effect: (p) => { p.maxHp += 14; p.hp += 14; return 'Tu pulpa florece: +14 ❤️ máx.'; } },
                { text: 'Don de Hermes (+70 de oro)', effect: (p) => { p.gold += 70; return 'Hermes te deja un saquito con 70 de oro.'; } }
            ]
        },
        {
            id: 'cofre_mimico', title: 'Cofre Sospechoso', icon: '📦', sprite: 'node_treasure', w: 1,
            desc: 'Un cofre en medio del camino, demasiado brillante y demasiado tranquilo. Parece que respira.',
            options: [
                {
                    text: 'Abrirlo', tone: 'risk',
                    effect: (p, g) => {
                        if (Math.random() < 0.55) return g.grantRelicTier(['common', 'uncommon', 'rare']);
                        return { fight: true, msg: '¡ERA UN MÍMICO! Te salta encima.' };
                    }
                },
                { text: 'Tirarle una piedra primero', effect: () => 'La piedra rebota. El cofre gruñe bajito… y sigues tu camino.' }
            ]
        },
        {
            id: 'hada_fuente', title: 'Fuente del Hada', icon: '🧚', w: 1,
            desc: 'Un hada de luz azul flota sobre una fuente. "Pide un deseo, pero recuerda: los deseos cuestan".',
            options: [
                { text: 'Pedir salud (curación total, pagas 30 de oro)', locked: noGold(30), effect: (p) => { p.gold -= 30; p.hp = p.maxHp; return 'El hada te envuelve en luz. Estás como nueva.'; } },
                { text: 'Pedir suerte (una semilla)', effect: (p, g) => g.grantSeed() || 'Tu bolsa de semillas está llena; el hada se ofende un poquito.' },
                { text: 'No molestar al hada', effect: () => 'El hada bosteza y vuelve a dormirse.' }
            ]
        },
        {
            id: 'maquina_garra', title: 'Máquina de Garra', icon: '🕹️', themes: CASINO.concat(['mercado', 'fabrica']), w: 1,
            desc: 'Una máquina con peluches de frutas dentro. Una garra oxidada cuelga esperando.',
            options: [
                {
                    text: 'Intentarlo (15 de oro)', locked: noGold(15),
                    effect: (p, g) => {
                        p.gold -= 15;
                        const r = Math.random();
                        if (r < 0.15) return g.grantRelicTier(['common', 'uncommon']);
                        if (r < 0.55) return g.grantSeed() || 'La garra agarra una semilla… pero tu bolsa está llena.';
                        return 'La garra tiembla, agarra… y se le cae. ¡Tan cerca!';
                    }
                },
                { text: 'Mirar los peluches y seguir', effect: () => 'Uno de los peluches parece saludarte.' }
            ]
        },
        {
            id: 'vasos_tahur', title: 'Los Tres Vasos', icon: '🥤', themes: CASINO, w: 1,
            desc: 'Un tahúr mezcla tres vasos a toda velocidad. "Si adivinas dónde está la moneda, es tuya".',
            options: ['Vaso de la izquierda', 'Vaso del medio', 'Vaso de la derecha'].map((label) => ({
                text: `${label} (apuestas 20 de oro)`, locked: noGold(20),
                effect: (p) => {
                    p.gold -= 20;
                    if (rnd(3) === 0) { p.gold += 80; return '¡Ahí estaba! Te llevas 80 de oro.'; }
                    return 'Vacío. El tahúr se guarda tus 20 de oro con una sonrisita.';
                }
            }))
        },
        {
            id: 'piedra_papel_tijera', title: 'Duelo del Gnomo', icon: '✊', w: 1,
            desc: 'Un gnomo de jardín te reta a piedra, papel o tijera. "¡Si ganas, te doy oro! ¡Si pierdes, te pellizco!"',
            options: [['Piedra', '✊'], ['Papel', '✋'], ['Tijera', '✌️']].map(([name, ico], me) => ({
                text: `${ico} ${name}`, tone: 'risk',
                effect: (p) => {
                    const gn = rnd(3), icons = ['✊', '✋', '✌️'];
                    const res = (me - gn + 3) % 3; // 0 empate, 1 gano, 2 pierdo
                    if (res === 0) return `Tú ${ico}, el gnomo ${icons[gn]}: ¡empate! Se ríen los dos.`;
                    if (res === 1) { p.gold += 50; return `Tú ${ico}, el gnomo ${icons[gn]}: ¡ganas! +50 de oro.`; }
                    p.hp = Math.max(1, p.hp - 8);
                    return `Tú ${ico}, el gnomo ${icons[gn]}: ¡pierdes! Te pellizca y pierdes 8 ❤️.`;
                }
            }))
        }
    ];
    window.EVENT_DB.push(...list);
})();
