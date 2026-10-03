// ============================================================
// NOTES.JS — Notas de la versión: las actualizaciones y parches del juego,
// para que quien juega sepa qué cambió. Se abren con el botón "Notas" del
// menú principal. Para agregar una nueva, ponla AL PRINCIPIO de PATCH_NOTES.
//   version, date, title, items: ['texto', ...], fixes: ['texto', ...]
// ============================================================

window.CREATOR = { handle: '@yokyznt', url: 'https://www.instagram.com/yokyznt/' };
window.GAME_VERSION = '2.8';

window.PATCH_NOTES = [
    {
        version: '2.8', date: '3 oct 2026', title: 'Ajustes y más fluido',
        items: [
            'Ajustes (el engrane): volumen de música y de efectos, vibración, zoom del mapa, gráficos rápidos, menos animaciones y pantalla siempre encendida.',
            'En teléfono todo es más grande fuera del combate: mapa, recompensas, tienda, eventos, mochila y mazo.',
            'La barra de arriba ya no tiene fondo: se ve más de cada pantalla.',
            'En combate la mano y los personajes van más abajo: más espacio para ellos y para las descripciones.',
            'Mucho más fluido: el mapa, los premios y los brillos ya no repintan la pantalla en cada cuadro.'
        ],
        fixes: [
            'Las letras del juego ya no necesitan internet.',
            'La música se pausa al salir de la app o apagar la pantalla.'
        ]
    },
    {
        version: '2.7', date: '3 oct 2026', title: 'Más azar',
        items: [
            'Tragamonedas con rodillos y Ruleta de casino: dos mesas de juego nuevas.',
            'Dado del destino: antes de cada jefe tiras un d20. Del 1 (pifia) al 20 (crítico).',
            'La ficha de la carta sale al lado, solo con su descripción; toca fuera para soltarla.',
            'Todas las pantallas ocupan la pantalla completa y el texto ya no se ve borroso.'
        ],
        fixes: ['Póker: al mostrar, ya no se marcan cartas que no cambiaste.']
    },
    {
        version: '2.6', date: '3 oct 2026', title: 'Más reto y listo para celular',
        items: [
            'Más difícil: menos tesoros por piso, objetos más débiles (y los de jefe con truco), enemigos más duros, menos curación y una maldición que se cuela al entrar a los castillos 2 y 3.',
            'Mesas de juego nuevas: tapete de casino, crupier que reacciona, fichas apostadas, medidor hasta 21 y cartas que se voltean.',
            'En los eventos, cada opción tiene color: azul premio, amarillo riesgo, rojo malo y crema irse.',
            'La explicación de una carta sale solo al tocarla, con los mismos colores de sus palabras clave. Las intenciones enemigas llevan etiquetas de color (ataca, se cubre, invoca…).',
            'Modo teléfono: todo más grande, mantén el dedo sobre algo para ver qué es.'
        ],
        fixes: [
            'Dibujos sin doble boca (cuervo, vampiros, murciélago, mosquito y los de bigote).',
            'La cáscara que un enemigo da a sus aliados ya no se borra antes de tu turno.',
            'El +2 de «Blancas y negras» ya no se queda pegado en los pisos siguientes.',
            'Si sales en el objeto de jefe, al continuar vuelves ahí (ya no se repite el jefe).',
            'Los esbirros que huyen devuelven el oro robado.',
            'Casillas vacías del mapa opacas y textos más cortos en todo el juego.'
        ]
    },
    {
        version: '2.5', date: '29 sep 2026', title: 'Premios que se recogen',
        items: [
            'Los premios ahora salen dibujados y se recogen tocándolos: oro, vida, vida máxima, objetos, semillas y cartas. Cada uno vuela a su lugar en la barra de arriba (el oro a tu bolsa, la vida a tu corazón, los objetos y semillas a la mochila, las cartas al mazo). Pasa en las recompensas de combate, cofres, eventos, el Pozo de los Deseos y los minijuegos.',
            'La barra de arriba salta y muestra "+N" cada vez que ganas oro, vida, objetos, semillas o cartas, vengan de donde vengan.',
            'Cuando un evento cambia tu mazo lo ves animado: la carta que se transforma gira y se convierte en la nueva, la que madura brilla, la que pierdes se desvanece y las maldiciones caen al mazo.',
            'Nueva Colección en el menú: tus cartas, objetos (con su guiño a otros juegos), semillas y el bestiario, todo en un mismo lugar.'
        ],
        fixes: [
            'La leyenda del mapa es más pequeña y cabe completa sin desplazarse; se quitó el botón «Centrar en mí».',
            'El botón de cerrar de la mochila se ve bien.',
            'En la tiendita, las fichas de objeto ya no se salen de su carta; el guiño solo aparece en la mochila y en la Colección.'
        ]
    },
    {
        version: '2.4', date: '29 sep 2026', title: '¡El final de la aventura!',
        items: [
            'Nuevo final animado al vencer al último jefe: se rompen los barrotes de la torre, se abren las jaulas, todos vuelven al pueblo en las carretas (¡jaladas por los bichos!), hay una gran fiesta con fuegos artificiales y el Rey Fruta te nombra Héroe del Reino. Puedes verlo otra vez desde las Notas.',
            'Al seleccionar o arrastrar una carta aparece encima de ella su ficha: el daño y la cáscara reales y la explicación de cada efecto y estado que causa.',
            'Tutorial más claro: Profe Limón habla corto y solo deja hacer lo que pide (las cartas que no tocan se ven apagadas y los atajos de teclado se bloquean). El primer combate es contra un solo enemigo.'
        ],
        fixes: [
            'El tutorial ya no se atora si abres la mochila en el cofre o la cierras antes de usar la semilla.',
            'La burbuja de Profe Limón ya no tiene «¡Hazlo para seguir!» ni «Salir»: para salir del tutorial usa la ✕ de arriba o Esc.'
        ]
    },
    {
        version: '2.3', date: '28 sep 2026', title: 'Bestiario y tutorial nuevo',
        items: [
            '¡Bestiario! En el menú (o desde una partida) están los 121 enemigos ordenados por castillo y piso, con la regla de cada piso. Los que aún no enfrentas salen como silueta «No descubierto»; al verlos en combate se llena su ficha con su vida, sus rasgos y lo que hace cada jugada, y se cuenta cuántas veces los derrotaste.',
            'Tutorial renovado: ahora enseña el daño real al arrastrar cartas, cómo la cáscara recibe el golpe primero, las explicaciones al pasar el mouse, la mochila (usarás una semilla contra el jefe) y las reglas de cada piso.',
            'El tutorial muestra en qué capítulo vas y cuánto falta, Profe Limón te felicita al completar cada paso y puedes avanzar con Enter. La pantalla final repasa todo lo aprendido y deja repetirlo.'
        ],
        fixes: [
            'El tutorial ya no se puede quedar atorado (por ejemplo, si en la tiendita eliges "Quitar una carta" o si gastas toda tu energía antes de jugar el Jugo Defensivo).',
            'Lo que resalta el tutorial ya no se ve oscurecido.'
        ]
    },
    {
        version: '2.2', date: '28 sep 2026', title: 'Más música y menos sorpresas',
        items: [
            'Banda sonora nueva: 21 canciones en vez de un solo loop. Cada castillo tiene su propia música en el mapa, los combates rotan entre varias canciones, y hay temas para élites, jefes, la tiendita, la fogata, el calabozo y los minijuegos.',
            'Al arrastrar una carta ves el daño y la cáscara REALES que hará contra ese enemigo (con Madurez, Marchitez, Magulladura, Firmeza, Blandura y objetos). Las intenciones enemigas también muestran el daño real.',
            'La cáscara recibe el golpe primero: ves cómo baja (y se rompe) y solo después lo que sobra le quita vida.',
            'Cada regla de piso tiene su fondo animado: en la Oscuridad se apagan las luces en los turnos impares, en la Fábrica se carga la electricidad antes de la descarga, en la Cocina sube el fuego si guardas cartas, el tablero de Blancas y negras se voltea, y más.',
            'Ajedrez: las piezas ahora son frutitas (uva, piña, plátano, pera, fresa y naranja) y se pueden arrastrar.',
            'Los guiños a otros juegos ahora explican de dónde vienen y traen un dibujito del juego.',
            'Tras un combate, el oro ganado sube con una animación en la barra de arriba.'
        ],
        fixes: [
            'El pase de batalla y el vestidor abiertos desde una partida ahora tienen «Volver a la partida» y te regresan justo donde estabas (por ejemplo, a las recompensas).',
            'Ya no se pierde el avance si sales en la pantalla de recompensas: se guarda al ganar y al continuar vuelves a elegir tu carta.',
            'Al tocar algo, la pantalla ya no repite su animación de aparecer (tablero, mochila, paneles).',
            'Las casillas de élite y jefe del mapa ya no cortan su animación, y el borde punteado de la casilla disponible ya no queda tapado.'
        ]
    },
    {
        version: '2.1', date: '28 sep 2026', title: 'Todo dibujado a mano',
        items: [
            'Nueva historia animada al empezar: la aldea feliz, la invasión de noche, el convoy de carretas con las frutas enjauladas (y la carroza del Rey tirada por la Oruga Reina), los tres castillos y la Torre del Rey. Tu fruta se esconde en un arbusto… ¡y es la única que puede salvarlos! Se puede ver otra vez desde aquí.',
            'Adiós a los emojis: más de 120 dibujos nuevos en el mismo estilo de stickers (todos los enemigos y jefes nuevos, objetos, eventos como la Fuente del Hada, portadas de cada piso, adornos del mapa, dados y piezas de ajedrez).',
            'Mochila: tus objetos y semillas ahora viven juntos en una mochila. Tócala (o pulsa I) para verlos en grande con su rareza, qué hacen y su guiño a otros juegos. Brilla en combate cuando puedes usar una semilla.',
            '17 enemigos nuevos con 6 mecánicas nuevas: Provocación (tus golpes tienen que ir contra él), Rabia (se hace más fuerte al recibir golpes), Caparazón (su cáscara se acumula), Agotamiento (te quita energía), Robacartas (te roba cartas; las recuperas al vencerlo) y Plaga (tiene crías). También hay enemigos intangibles.',
            'Nueva élite del Mercado (Reina Hormiga) y de la Torre del Rey (Caballero Espejo).'
        ],
        fixes: [
            'La barra de arriba ya no se llena con objetos ni semillas: todo va a la mochila.',
            'El tablero de ajedrez y los dados del minijuego ahora son dibujos.'
        ]
    },
    {
        version: '2.0', date: '28 sep 2026', title: 'El Rescate del Rey Fruta',
        items: [
            '¡Nueva historia! Los bichos secuestraron a las frutas y las encerraron en 3 castillos, cada uno más grande y difícil. Sube la torre y rescata al Rey Fruta. Al empezar una partida hay una animación con la historia.',
            '3 castillos × 3 pisos = 9 mapas. Cada castillo tiene su temática y cada piso su subtema: Huerto, Gallinero, Estanque, Invernadero y Bodega; el Castillo del Azar con la Sala de Dados, el Salón de Póker y la Torre de Ajedrez; y La Torre del Rey con Mercado, Cocina, Fábrica y la sala del trono. En cada partida se sortean y cambian de orden.',
            'Más de 50 enemigos, élites y jefes nuevos. Los pisos 1 y 2 tienen jefes guardianes y el último de cada castillo un jefe grande. Cada piso es más difícil que el anterior.',
            'Los mapas crecen con cada castillo y cambian de forma (clásico, despejado, laberinto, de ríos), con caminitos y adornos del tema.',
            'Cada piso tiene su propia regla que cambia cómo se juega: dado del turno, oscuridad que oculta las intenciones, combo de póker, blancas y negras, carteristas, descargas eléctricas y más. Se ve en la esquina del combate.',
            'Nueva casilla Mesa de Juegos: Veintiuno de Dados, Póker de 5 cartas y Ajedrez chiquito de 5 columnas (¡hay que comerse todas las piezas del rival!).',
            'Pase de Batalla: ganas experiencia por cada enemigo derrotado y desbloqueas colores y accesorios. Ya no salen en cofres ni regalos (se quitaron los regalos del mapa).',
            'Más de 20 objetos nuevos inspirados en otros juegos (Balatro, The Binding of Isaac, Hades, Undertale, Slay the Spire…). Las reliquias ahora se llaman "objetos".',
            '20 eventos especiales nuevos: tragamonedas, trato con el diablo, ruleta, cofre mímico, máquina de garra, piedra-papel-tijera y más.',
            'Semillas más únicas: nuevos efectos que cambian el combate (intercambiar mano, congelar el tiempo, copiar una carta…).',
            'Ahora hay 3 dificultades: Normal, Difícil y Desafiante.',
            'Calabozo rehecho: más espeluznante, con tu fruta, y la escalera de salida en una esquina de arriba.',
            'Notas de la versión (esto que estás leyendo) y enlace a mi Instagram.'
        ],
        fixes: [
            'La barra de objetos ya no deforma la interfaz cuando tienes muchos.',
            'La intención de los enemigos mantiene el mismo tamaño para todos sus íconos.',
            'El Temporizador de un jefe ya no termina tu turno solo.',
            'Al pasar el cursor entre dos cartas ya no se "bugea".',
            'Tras cada combate es obligatorio elegir una carta.',
            'Tutorial rehecho: hay que hacer cada acción y ya no se puede saltar ni atorar.',
            'El calabozo y el pozo ahora se guardan al salir y continuar.'
        ]
    },
    {
        version: '1.3', date: '27-28 sep 2026', title: 'Casillas nuevas y un calabozo',
        items: ['Los mapas ahora tienen ríos con puentes, una Llave Dorada y un Cofre Sellado, y casillas bloqueadas.', 'Nuevo evento: una trampilla que te lleva a un calabozo de 3×3.'],
        fixes: ['Arreglado un callejón sin salida junto al río.', 'Ícono de Misterio simplificado.']
    },
    {
        version: '1.2', date: '27 sep 2026', title: 'Frutas malvadas',
        items: ['Enemigos con mecánicas nuevas: se dividen, reviven, explotan, te copian los perjuicios…', 'Pozo de los Deseos.']
    },
    {
        version: '1.0', date: '26 sep 2026', title: 'Primera versión',
        items: ['¡Fruit Spire nace! 4 frutas, 3 niveles, cartas, objetos, semillas y vestidor.']
    }
];

window.openNotes = function () {
    rememberReturn();
    GAME.screen = 'notes';
    try { localStorage.setItem('fruitSpireNotesSeen', window.GAME_VERSION); } catch (e) { /* ignore */ }
    render();
};
window.notesAreNew = function () {
    try { return localStorage.getItem('fruitSpireNotesSeen') !== window.GAME_VERSION; } catch (e) { return false; }
};
window.renderNotes = function () {
    const list = (arr, cls) => (arr && arr.length ? `<ul class="notes-list ${cls || ''}">${arr.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
    return `
    <div class="menu-screen wide notes-screen">
        <div class="panel notes-panel">
            <h1 class="hand-title">Notas de la versión</h1>
            <a class="creator-card" href="${window.CREATOR.url}" target="_blank" rel="noopener noreferrer" ${tip(['Instagram', 'Se abre en una pestaña nueva.'])}>
                <span class="creator-ig">${art('ui_insta', '', { size: 'md' })}</span>
                <span><b class="hand">¡Sígueme en Instagram!</b><br>Creador del juego: <u>${window.CREATOR.handle}</u></span>
            </a>
            <button class="btn-banana replay-btn" onclick="replayStory()">${art('ui_play', '', { size: 'xs' })} Ver la historia otra vez</button>
            ${window.endingSeen && endingSeen() ? `<button class="btn-mint replay-btn" onclick="replayEnding()">${art('ui_play', '', { size: 'xs' })} Ver el final otra vez</button>` : ''}
            <div class="notes-scroll">
                ${window.PATCH_NOTES.map((n, i) => `
                <section class="note ${i === 0 ? 'latest' : ''}">
                    <h2 class="hand"><span class="note-ver">v${n.version}</span> ${esc(n.title)} <small>${esc(n.date)}</small>${i === 0 ? '<i class="note-new">¡Nueva!</i>' : ''}</h2>
                    ${list(n.items)}
                    ${n.fixes && n.fixes.length ? `<h3 class="hand">Arreglos</h3>${list(n.fixes, 'fixes')}` : ''}
                </section>`).join('')}
            </div>
        </div>
        <button class="secondary" onclick="backToMenu()">${backLabel()}</button>
    </div>`;
};
