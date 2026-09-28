// ============================================================
// REFS.JS — Los guiños a otros juegos de los objetos indie.
// Cada juego tiene un dibujito (lo más icónico de ese juego, en estilo
// sticker) y cada objeto explica en qué se inspira, para que el guiño
// se entienda aunque no conozcas el juego.
//   refBoxHtml(relic, size)  → cajita con el dibujo, el juego y la explicación
// ============================================================

(function () {
    const { st } = window.SPRITE_KIT;
    const box = (inner) => `<svg class="sprite" viewBox="0 0 100 100">${inner}</svg>`;
    const pixel = (rows, colors, x0, y0, s) => rows.map((row, y) => [...row].map((ch, x) => colors[ch]
        ? `<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${s + .4}" height="${s + .4}" fill="${colors[ch]}"/>` : '').join('')).join('');

    // ---------- dibujos de cada juego ----------
    const GAMES = {
        balatro: {
            name: 'Balatro', color: '#E0455E',
            draw: () => box(`
                <g transform="rotate(-10 50 50)">
                    <rect x="24" y="14" width="46" height="66" rx="7" fill="#fff" ${st(3.5)}/>
                    <path d="M34 46 Q36 30 47 30 Q58 30 60 46 Z" fill="#E0455E" ${st(3)}/>
                    <path d="M34 46 Q28 34 22 36 M60 46 Q66 34 72 36" ${st(3)} fill="none"/>
                    <circle cx="22" cy="36" r="4" fill="#FFCF4D" ${st(2.5)}/><circle cx="72" cy="36" r="4" fill="#4A7BD0" ${st(2.5)}/>
                    <circle cx="47" cy="56" r="10" fill="#FFE2C8" ${st(3)}/>
                    <path d="M42 58 Q47 63 52 58" ${st(2.5)} fill="none"/><circle cx="43" cy="53" r="1.8"/><circle cx="51" cy="53" r="1.8"/>
                    <text x="29" y="27" font-size="11" font-weight="900" fill="#E0455E">J</text>
                </g>
                <g><ellipse cx="74" cy="80" rx="15" ry="6" fill="#4A7BD0" ${st(3)}/><ellipse cx="74" cy="74" rx="15" ry="6" fill="#E0455E" ${st(3)}/>
                <ellipse cx="74" cy="74" rx="8" ry="3" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/></g>`)
        },
        undertale: {
            name: 'Undertale', color: '#E0455E',
            draw: () => box(`
                <path d="M50 84 L18 52 Q6 38 18 26 Q32 14 50 32 Q68 14 82 26 Q94 38 82 52 Z" fill="#E82A2A" ${st(4)}/>
                <path d="M26 30 Q32 26 36 30" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>
                <path d="M80 6 L83 14 L91 14 L85 19 L87 27 L80 22 L73 27 L75 19 L69 14 L77 14 Z" fill="#FFE14D" ${st(2.5)}/>`)
        },
        isaac: {
            name: 'The Binding of Isaac', color: '#C98AA0',
            draw: () => box(`
                <circle cx="50" cy="48" r="32" fill="#F6DCD0" ${st(4)}/>
                <ellipse cx="38" cy="44" rx="6" ry="8" fill="#2A1C16"/><ellipse cx="62" cy="44" rx="6" ry="8" fill="#2A1C16"/>
                <circle cx="36" cy="41" r="2" fill="#fff"/><circle cx="60" cy="41" r="2" fill="#fff"/>
                <path d="M42 64 Q50 58 58 64" ${st(3)} fill="none"/>
                <path d="M36 54 Q34 66 36 76 M64 54 Q66 66 64 76" stroke="#6FC3F0" stroke-width="5" stroke-linecap="round" fill="none"/>
                <path d="M84 70 Q90 80 84 86 Q78 80 84 70 Z" fill="#9FD8F5" ${st(2.5)}/>`)
        },
        hades: {
            name: 'Hades', color: '#6FBF5A',
            draw: () => box(`
                <path d="M50 88 Q20 84 16 50 M50 88 Q80 84 84 50" ${st(3.5)} fill="none"/>
                ${[0, 1, 2, 3].map((i) => `<ellipse cx="${20 + i * 3}" cy="${76 - i * 9}" rx="8" ry="4" transform="rotate(${-40 - i * 12} ${20 + i * 3} ${76 - i * 9})" fill="#FFCF4D" ${st(2.5)}/>
                    <ellipse cx="${80 - i * 3}" cy="${76 - i * 9}" rx="8" ry="4" transform="rotate(${40 + i * 12} ${80 - i * 3} ${76 - i * 9})" fill="#FFCF4D" ${st(2.5)}/>`).join('')}
                <path d="M50 78 Q30 66 38 46 Q42 54 46 52 Q42 34 54 20 Q54 36 62 42 Q66 36 64 30 Q76 50 66 68 Q60 78 50 78 Z" fill="#7FE06A" ${st(3.5)}/>
                <path d="M50 72 Q42 64 48 54 Q52 62 56 60 Q60 68 50 72 Z" fill="#E8FFD9"/>`)
        },
        stardew: {
            name: 'Stardew Valley', color: '#7BBF5A',
            draw: () => box(`
                <path d="M50 38 Q66 40 62 60 Q58 78 50 92 Q42 78 38 60 Q34 40 50 38 Z" fill="#F2E3B8" ${st(3.5)}/>
                <path d="M42 56 L48 57 M54 68 L58 67 M44 74 L49 75" ${st(2.5)} fill="none"/>
                <path d="M50 40 Q38 26 30 10 Q44 14 50 32 Q52 14 62 6 Q60 22 52 38 Q64 24 78 22 Q68 34 52 40 Z" fill="#6FBF4A" ${st(3)}/>`)
        },
        minecraft: {
            name: 'Minecraft', color: '#6FAE3A',
            draw: () => box(`
                <path d="M50 12 L86 30 L50 48 L14 30 Z" fill="#7BC043" ${st(3.5)}/>
                <path d="M14 30 L50 48 L50 90 L14 72 Z" fill="#9A6B3F" ${st(3.5)}/>
                <path d="M86 30 L50 48 L50 90 L86 72 Z" fill="#7A5230" ${st(3.5)}/>
                <path d="M14 30 L14 40 L22 44 L22 38 L30 42 L30 48 L38 52 L38 46 L50 52 L50 48 Z" fill="#6AAE3A"/>
                <path d="M86 30 L86 40 L78 44 L78 38 L70 42 L70 48 L62 52 L62 46 L50 52 L50 48 Z" fill="#5A9A30"/>
                <rect x="24" y="60" width="6" height="6" fill="#6E4A2A"/><rect x="36" y="70" width="6" height="6" fill="#6E4A2A"/><rect x="66" y="62" width="6" height="6" fill="#5E3E22"/>
                <path d="M14 30 L50 48 L86 30 M50 48 L50 90" ${st(3.5)} fill="none"/>`)
        },
        slay: {
            name: 'Slay the Spire', color: '#8C7AB8',
            draw: () => box(`
                <path d="M50 4 L62 34 L60 90 L40 90 L38 34 Z" fill="#B7A6D9" ${st(4)}/>
                <path d="M38 34 L62 34 M39 54 L61 54 M40 72 L60 72" ${st(3)} fill="none"/>
                <circle cx="50" cy="44" r="5" fill="#E0455E" ${st(2.5)}/>
                <path d="M16 90 Q30 80 40 90 M60 90 Q72 78 86 90" fill="#E8DCC4" ${st(3)}/>
                <path d="M10 92 L90 92" ${st(4)} fill="none"/>`)
        },
        deadcells: {
            name: 'Dead Cells', color: '#E0455E',
            draw: () => box(`
                <path d="M40 12 L60 12 L60 32 Q80 42 80 62 Q80 88 50 88 Q20 88 20 62 Q20 42 40 32 Z" fill="#fff" ${st(4)}/>
                <path d="M23 58 Q50 50 77 58 Q78 84 50 85 Q22 84 23 58 Z" fill="#E0455E"/>
                <rect x="36" y="4" width="28" height="12" rx="4" fill="#B98A5A" ${st(3.5)}/>
                <path d="M30 50 Q32 42 38 40" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>
                <path d="M40 12 L60 12 L60 32 Q80 42 80 62 Q80 88 50 88 Q20 88 20 62 Q20 42 40 32 Z" ${st(4)} fill="none"/>`)
        },
        hollow: {
            name: 'Hollow Knight', color: '#5A6FB0',
            draw: () => box(`
                <path d="M30 40 Q20 24 24 6 Q34 20 38 34 M70 40 Q80 24 76 6 Q66 20 62 34" fill="#fff" ${st(3.5)}/>
                <path d="M26 58 Q26 32 50 32 Q74 32 74 58 Q74 84 50 88 Q26 84 26 58 Z" fill="#fff" ${st(4)}/>
                <ellipse cx="40" cy="60" rx="7" ry="11" fill="#1E1A2A"/><ellipse cx="60" cy="60" rx="7" ry="11" fill="#1E1A2A"/>
                <circle cx="38" cy="56" r="2" fill="#fff" opacity=".6"/><circle cx="58" cy="56" r="2" fill="#fff" opacity=".6"/>`)
        },
        terraria: {
            name: 'Terraria', color: '#E85C9A',
            draw: () => box(pixel([
                '..XX...XX..',
                '.XPPX.XPPX.',
                'XPWPPXPPPPX',
                'XPPPPPPPPPX',
                'XPPPPPPPPDX',
                '.XPPPPPPDX.',
                '..XPPPPDX..',
                '...XPPDX...',
                '....XDX....',
                '.....X.....'
            ], { X: '#4A3428', P: '#F06AA8', W: '#FFE0F0', D: '#C84888' }, 6, 10, 8))
        },
        vampire: {
            name: 'Vampire Survivors', color: '#8E6AC8',
            draw: () => box(`
                <circle cx="50" cy="56" r="40" fill="none" stroke="#C9B6F0" stroke-width="4" stroke-dasharray="6 6"/>
                <path d="M50 26 Q72 40 70 62 Q68 82 50 82 Q32 82 30 62 Q28 40 50 26 Z" fill="#FAF6EC" ${st(4)}/>
                <path d="M50 30 Q40 50 42 80 M50 30 Q60 50 58 80" ${st(2.5)} fill="none"/>
                <path d="M50 28 Q46 16 50 8 Q54 16 50 28" fill="#9FC96A" ${st(3)}/>
                <path d="M40 84 L38 90 M50 84 L50 92 M60 84 L62 90" ${st(2.5)} fill="none"/>`)
        },
        celeste: {
            name: 'Celeste', color: '#E0455E',
            draw: () => box(`
                <path d="M30 46 Q8 34 4 16 Q18 26 26 22 Q20 34 34 40 Z M70 46 Q92 34 96 16 Q82 26 74 22 Q80 34 66 40 Z" fill="#fff" ${st(3)}/>
                <path d="M50 88 Q24 70 28 46 Q32 30 50 34 Q68 30 72 46 Q76 70 50 88 Z" fill="#FFCF4D" ${st(4)}/>
                ${[[40, 50], [56, 48], [48, 62], [38, 66], [60, 64], [50, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#B8860B"/>`).join('')}
                <path d="M36 36 Q42 22 50 30 Q58 22 64 36 Q56 34 50 38 Q44 34 36 36 Z" fill="#6FBF4A" ${st(3)}/>`)
        },
        cuphead: {
            name: 'Cuphead', color: '#E0455E',
            draw: () => box(`
                <path d="M58 30 L74 4" stroke="#4A3428" stroke-width="11" stroke-linecap="round"/>
                <path d="M58 30 L74 4" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
                <path d="M61 25 L64 20 M67 15 L70 10" stroke="#E0455E" stroke-width="6"/>
                <path d="M18 30 L82 30 L74 86 Q50 94 26 86 Z" fill="#fff" ${st(4)}/>
                <ellipse cx="50" cy="30" rx="32" ry="8" fill="#E0455E" ${st(3.5)}/>
                <path d="M80 44 Q96 46 92 60 Q88 70 76 68" ${st(4)} fill="none"/>
                <ellipse cx="42" cy="58" rx="4" ry="7" fill="#1E1A2A"/><ellipse cx="58" cy="58" rx="4" ry="7" fill="#1E1A2A"/>
                <path d="M42 74 Q50 80 58 74" ${st(3)} fill="none"/>`)
        }
    };

    // ---------- qué juego y por qué, objeto por objeto ----------
    const REFS = {
        fichas_casino: ['balatro', 'En Balatro juegas manos de póker para ganar fichas y dinero en cada ronda. Aquí cada victoria te deja fichas extra.'],
        comodin_descarado: ['balatro', 'En Balatro los Comodines son cartas con caras de bufón que dan bonos que crecen con tu mazo. Este crece según cuántas cartas tengas.'],
        alcancia_interes: ['balatro', 'En Balatro, al terminar cada ronda ganas $1 de interés por cada $5 que tengas ahorrados (con tope). Aquí igual: ahorrar oro te da más oro.'],
        tarot_luna: ['balatro', 'En Balatro las cartas de Tarot, como La Luna, se usan una vez y cambian tus cartas. Esta embruja a un enemigo al empezar.'],
        mano_color: ['balatro', 'En Balatro el Color es una mano de 5 cartas del mismo palo. Aquí basta con jugar 3 cartas del mismo tipo seguidas.'],
        estrella_guardado: ['undertale', 'En Undertale guardas la partida tocando estrellas brillantes, que te curan y dicen: «Te llenas de determinación».'],
        cuchillo_juguete: ['undertale', 'En Undertale el Cuchillo de Juguete es la primera arma que encuentras: sube un poquito tu ataque.'],
        vela_determinacion: ['undertale', 'La Determinación es la fuerza del corazón rojo de Undertale, la que te deja levantarte y seguir intentándolo.'],
        penique_suerte: ['isaac', 'En The Binding of Isaac el Penique de la Suerte sube tu suerte, y las monedas aparecen al limpiar cada cuarto.'],
        corazon_alma: ['isaac', 'En Isaac los Corazones de Alma (azules) son vida extra que se gasta antes que la roja, igual que la cáscara aquí.'],
        pentagrama: ['isaac', 'En Isaac el Pentagrama es un objeto oscuro que sube tu daño para siempre.'],
        lagrima_sagrada: ['isaac', 'Isaac pelea llorando: sus lágrimas son sus disparos. Esta lágrima dispara sola cada turno.'],
        d6_bolsillo: ['isaac', 'El D6 de Isaac vuelve a tirar los objetos que tienes delante y los cambia por otros al azar. Aquí vuelve a tirar tu mano.'],
        corazon_sacrificio: ['isaac', 'En Isaac hay cuartos de sacrificio donde pagas con vida para conseguir premios. Poder a cambio de ❤️.'],
        azufre_infernal: ['isaac', 'Azufre es el rayo demoníaco de Isaac, y en Cuphead (dibujo de la taza) haces un trato con el Diablo: poder para ti… y para ellos.', 'cuphead'],
        nectar_olimpo: ['hades', 'En Hades los dioses del Olimpo te regalan bendiciones y el Néctar es el regalo para hacerte su amigo.'],
        desafio_muerte: ['hades', 'En Hades, Desafío a la Muerte te devuelve a la pelea una vez cuando caes, en vez de mandarte de vuelta al inicio.'],
        cana_pescar: ['stardew', 'En Stardew Valley pescar es de las formas favoritas de sacar algo extra cada día en el pueblo.'],
        pico_diamante: ['minecraft', 'En Minecraft el pico de diamante rompe casi cualquier bloque. Aquí «minas» oro de cada carta que se consume.'],
        kunai_cascara: ['slay', 'Slay the Spire es el juego de cartas que inspiró este. Allí el Kunai da Destreza cada 3 ataques en un turno.'],
        abanico_ornamental: ['slay', 'Slay the Spire es el juego de cartas que inspiró este. Allí el Abanico Ornamental da bloqueo cada 3 ataques en un turno.'],
        frasco_salud: ['deadcells', 'En Dead Cells el Frasco de Salud es tu única cura: se bebe en pleno peligro y se rellena al pasar de zona.'],
        mascara_extra: ['hollow', 'En Hollow Knight tu vida son máscaras blancas, y juntar Fragmentos de Máscara te da una más.'],
        cristal_vida: ['terraria', 'En Terraria los Cristales de Vida son corazones rosados escondidos bajo tierra que suben tu vida máxima.'],
        ojo_cthulhu: ['terraria', 'El Ojo de Cthulhu es el primer gran jefe de Terraria: un ojo gigante que te persigue toda la noche.'],
        aura_ajo: ['vampire', 'En Vampire Survivors el Ajo crea un aura que lastima sin parar a todos los enemigos que se acercan.'],
        fresa_dorada: ['celeste', 'En Celeste las fresas doradas se ganan pasando un nivel completo sin caerte ni una vez.']
    };
    window.GAME_REFS = GAMES;
    window.RELIC_REFS = REFS;

    // Cajita del guiño: dibujo del juego + nombre + por qué
    window.refBoxHtml = function (r, size) {
        if (!r || !r.ref) return '';
        const info = REFS[r.id];
        if (!info) return `<div class="ref-box ${size || ''}"><div class="ref-text"><b>${r.ref}</b></div></div>`;
        const games = [info[0], info[2]].filter(Boolean).map((k) => GAMES[k]).filter(Boolean);
        return `<div class="ref-box ${size || ''}">
            <div class="ref-arts">${games.map((g) => `<span class="ref-art" style="--gc:${g.color}">${g.draw()}</span>`).join('')}</div>
            <div class="ref-text"><b>Guiño a ${games.map((g) => g.name).join(' y ')}</b><span>${info[1]}</span></div>
        </div>`;
    };
})();
