// ============================================================
// NOTES.JS — Notas de la versión: las actualizaciones y parches del juego,
// para que quien juega sepa qué cambió. Se abren con el botón "Notas" del
// menú principal. Para agregar una nueva, ponla AL PRINCIPIO de PATCH_NOTES.
//   version, date, title, items: ['texto', ...], fixes: ['texto', ...]
// ============================================================

window.CREATOR = { handle: '@yokyznt', url: 'https://www.instagram.com/yokyznt/' };
window.GAME_VERSION = '2.3';

window.PATCH_NOTES = [
    {
        version: '2.3', date: '28 sep 2026', title: 'Bestiario y tutorial nuevo',
        items: [
            '¡Bestiario! En el menú (o desde una partida) puedes ver a los 121 enemigos ordenados por castillo y piso, con la regla de cada piso, su vida, sus rasgos y lo que hace cada una de sus jugadas. Los que aún no enfrentas se ven apagaditos y se cuenta cuántas veces derrotaste a cada uno.',
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
