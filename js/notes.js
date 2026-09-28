// ============================================================
// NOTES.JS — Notas de la versión: las actualizaciones y parches del juego,
// para que quien juega sepa qué cambió. Se abren con el botón "Notas" del
// menú principal. Para agregar una nueva, ponla AL PRINCIPIO de PATCH_NOTES.
//   version, date, title, items: ['texto', ...], fixes: ['texto', ...]
// ============================================================

window.CREATOR = { handle: '@yokyznt', url: 'https://www.instagram.com/yokyznt/' };
window.GAME_VERSION = '2.0';

window.PATCH_NOTES = [
    {
        version: '2.0', date: '28 sep 2026', title: 'El Rescate del Rey Fruta',
        items: [
            '¡Nueva historia! Los bichos secuestraron a las frutas y las encerraron en 3 castillos, cada uno más grande y difícil. Sube la torre y rescata al Rey Fruta. Al empezar una partida hay una animación con la historia.',
            '3 castillos × 3 pisos = 9 mapas. Cada castillo tiene su temática y cada piso su subtema: Huerto, Gallinero, Estanque, Invernadero y Bodega; el Castillo del Azar con la Sala de Dados, el Salón de Póker y la Torre de Ajedrez; y La Torre del Rey con Mercado, Cocina, Fábrica y la sala del trono. En cada partida se sortean y cambian de orden.',
            'Más de 50 enemigos, élites y jefes nuevos. Los pisos 1 y 2 tienen jefes guardianes y el último de cada castillo un jefe grande. Cada piso es más difícil que el anterior.',
            'Los mapas crecen con cada castillo y cambian de forma (clásico, despejado, laberinto, de ríos), con caminitos y adornos del tema.',
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
                <span class="creator-ig">📸</span>
                <span><b class="hand">¡Sígueme en Instagram!</b><br>Creador del juego: <u>${window.CREATOR.handle}</u></span>
            </a>
            <div class="notes-scroll">
                ${window.PATCH_NOTES.map((n, i) => `
                <section class="note ${i === 0 ? 'latest' : ''}">
                    <h2 class="hand"><span class="note-ver">v${n.version}</span> ${esc(n.title)} <small>${esc(n.date)}</small>${i === 0 ? '<i class="note-new">¡Nueva!</i>' : ''}</h2>
                    ${list(n.items)}
                    ${n.fixes && n.fixes.length ? `<h3 class="hand">Arreglos</h3>${list(n.fixes, 'fixes')}` : ''}
                </section>`).join('')}
            </div>
        </div>
        <button class="secondary" onclick="backToMenu()">Volver</button>
    </div>`;
};
