// ============================================================
// SETTINGS.JS — Ajustes del jugador (se guardan en el dispositivo) y su
// ventana. Va ANTES que todo lo demás: el audio, el lienzo y el mapa leen
// de window.SETTINGS. La ventana se abre con el engrane (menú y barra de
// arriba) y se monta encima de la pantalla actual sin redibujarla.
//
// Para agregar un ajuste: su valor por defecto en DEFAULTS, su fila en
// renderSettings() y, si cambia algo al instante, su efecto en applySettings().
// ============================================================
(function () {
    const KEY = 'fruitSpireSettings_v1';
    const DEFAULTS = {
        music: 70,           // 0 a 100
        sfx: 100,            // 0 a 100
        vibrate: true,       // vibración corta en golpes y premios (teléfono)
        mapZoom: 'normal',   // lejos | normal | cerca
        graphics: 'bonito',  // bonito | rapido (sin bordes de sticker ni adornos)
        motion: 'todas',     // todas | menos (sin animaciones de reposo)
        awake: true          // la pantalla no se apaga sola mientras juegas
    };
    const data = Object.assign({}, DEFAULTS);
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { stored = null; }
    if (stored && typeof stored === 'object') {
        Object.keys(DEFAULTS).forEach((k) => { if (typeof stored[k] === typeof DEFAULTS[k]) data[k] = stored[k]; });
    } else {
        // quien tenía el juego silenciado con el botón viejo, sigue en silencio
        try { if (localStorage.getItem('fruitSpireMuted') === '1') { data.music = 0; data.sfx = 0; } } catch (e) { /* sin almacenamiento */ }
    }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento */ } };
    window.SETTINGS = data;

    // ---------- la app de Android (Capacitor) ----------
    const nativePlugin = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FruitNative) || null;
    const isApp = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    window.isNativeApp = isApp;

    // Pantalla encendida: en la app lo hace Android; en el navegador, Wake Lock
    let wakeLock = null;
    function applyAwake() {
        const plugin = nativePlugin();
        if (plugin && plugin.keepAwake) { try { plugin.keepAwake({ on: !!data.awake }); } catch (e) { /* sin puente */ } return; }
        if (!navigator.wakeLock) return;
        if (data.awake && !wakeLock && !document.hidden) {
            navigator.wakeLock.request('screen').then((w) => { wakeLock = w; w.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
        } else if (!data.awake && wakeLock) {
            wakeLock.release().catch(() => {});
        }
    }
    const canStayAwake = () => !!(nativePlugin() || navigator.wakeLock);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) applyAwake(); });

    // Zoom del mapa: cuánto se agranda el tablero (en teléfono parte de más cerca)
    const MAP_ZOOMS = { lejos: [0.85, 1], normal: [1, 1.25], cerca: [1.25, 1.5] };
    window.mapZoom = () => (MAP_ZOOMS[data.mapZoom] || MAP_ZOOMS.normal)[typeof IS_PHONE !== 'undefined' && IS_PHONE ? 1 : 0];

    function applySettings() {
        const b = document.body;
        if (b) {
            b.classList.toggle('fx-low', data.graphics === 'rapido');
            b.classList.toggle('motion-less', data.motion === 'menos');
        }
        if (window.applyVolumes) window.applyVolumes();
        applyAwake();
    }
    window.applySettings = applySettings;
    applySettings();

    // ---------- ventana ----------
    let dirty = false; // algo cambió que necesita redibujar la pantalla de abajo
    function gearArt(size) {
        const pts = [];
        for (let i = 0; i < 8; i++) {
            [[-14, 30], [-8, 41], [8, 41], [14, 30]].forEach(([da, r]) => {
                const a = (i * 45 + da) * Math.PI / 180;
                pts.push(`${(50 + r * Math.sin(a)).toFixed(1)} ${(50 - r * Math.cos(a)).toFixed(1)}`);
            });
        }
        return `<span class="art art-${size || 'sm'}"><svg class="sprite" viewBox="0 0 100 100">
            <path d="M${pts.join(' L')} Z" fill="#B9C7D6" stroke="#4A3428" stroke-width="5" stroke-linejoin="round"/>
            <circle cx="50" cy="50" r="13" fill="#FFF9EC" stroke="#4A3428" stroke-width="5"/></svg></span>`;
    }
    window.gearArt = gearArt;

    const lit = (value) => (typeof value === 'string' ? `'${value}'` : value);
    const seg = (key, options) => `<div class="seg">${options.map(([value, label]) =>
        `<button class="seg-btn${data[key] === value ? ' on' : ''}" onclick="setSetting('${key}', ${lit(value)})">${label}</button>`).join('')}</div>`;
    const volume = (key) => {
        const v = data[key];
        let pips = '';
        for (let i = 1; i <= 10; i++) pips += `<i class="${v >= i * 10 ? 'on' : ''}" onclick="setSetting('${key}', ${i * 10})"></i>`;
        return `<div class="vol">
            <button class="vol-btn" onclick="setSetting('${key}', ${Math.max(0, v - 10)})">−</button>
            <span class="vol-pips">${pips}</span>
            <button class="vol-btn" onclick="setSetting('${key}', ${Math.min(100, v + 10)})">+</button>
            <b class="vol-num">${v === 0 ? 'No' : v}</b></div>`;
    };
    const row = (label, control, tipText) =>
        `<div class="set-row"><span class="set-label" ${tipText && window.tip ? window.tip([label, tipText]) : ''}>${label}</span>${control}</div>`;

    function renderSettings(quiet) {
        const inRun = !!(window.GAME && GAME.player && !['menu', 'character-select'].includes(GAME.screen));
        const canFullscreen = !isApp() && document.documentElement.requestFullscreen;
        const confirm = window.GAME && GAME.settingsConfirm;
        return `<div class="settings-overlay${quiet ? ' quiet' : ''}" id="settings-overlay" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">
            <div class="panel settings-panel">
                <h1 class="hand-title settings-title">${gearArt('md')} Ajustes</h1>
                <div class="settings-cols">
                    <section class="set-group"><h2 class="hand">Sonido</h2>
                        ${row('Música', volume('music'))}
                        ${row('Efectos', volume('sfx'))}
                        ${navigator.vibrate ? row('Vibración', seg('vibrate', [[true, 'Sí'], [false, 'No']])) : ''}
                    </section>
                    <section class="set-group"><h2 class="hand">Pantalla</h2>
                        ${row('Zoom del mapa', seg('mapZoom', [['lejos', 'Lejos'], ['normal', 'Normal'], ['cerca', 'Cerca']]))}
                        ${row('Gráficos', seg('graphics', [['bonito', 'Bonitos'], ['rapido', 'Rápidos']]), 'Rápidos: sin bordes de sticker ni adornos. Para teléfonos lentos.')}
                        ${row('Animaciones', seg('motion', [['todas', 'Todas'], ['menos', 'Menos']]), 'Menos: las frutas y casillas se quedan quietas.')}
                        ${canStayAwake() ? row('Pantalla encendida', seg('awake', [[true, 'Sí'], [false, 'No']]), 'La pantalla no se apaga sola mientras juegas.') : ''}
                        ${canFullscreen ? row('Pantalla completa', '<div class="seg"><button class="seg-btn" onclick="toggleFullscreen()">Cambiar</button></div>') : ''}
                    </section>
                    <section class="set-group"><h2 class="hand">Partida</h2>
                        ${inRun ? '<div class="set-row"><button class="set-wide btn-banana" onclick="settingsToMenu()">Salir al menú</button></div>' : ''}
                        <div class="set-row">${confirm
                            ? '<button class="set-wide btn-strawberry" onclick="settingsWipe()">Sí, borrar todo</button><button class="set-wide secondary" onclick="settingsAskWipe(false)">Cancelar</button>'
                            : '<button class="set-wide secondary" onclick="settingsAskWipe(true)">Borrar progreso</button>'}</div>
                        <p class="set-about hand">Fruit Spire v${window.GAME_VERSION || ''} · ${(window.CREATOR && window.CREATOR.handle) || ''}</p>
                    </section>
                </div>
                <button class="btn-mint settings-close" onclick="closeSettings()">Listo</button>
            </div>
        </div>`;
    }
    // render() la vuelve a incluir si estaba abierta (sin animación de entrada)
    window.renderSettings = () => (window.GAME && GAME.settingsOpen ? renderSettings(true) : '');

    function mount(quiet) {
        const screen = document.getElementById('screen');
        if (!screen) return;
        const old = document.getElementById('settings-overlay');
        const scroller = old && old.querySelector('.settings-cols');
        const top = scroller ? scroller.scrollTop : 0;
        if (old) old.outerHTML = renderSettings(quiet); else screen.insertAdjacentHTML('beforeend', renderSettings(quiet));
        fitSettings();
        const now = document.querySelector('#settings-overlay .settings-cols');
        if (now) now.scrollTop = top;
    }
    // En teléfono la ventana se agranda hasta llenar la pantalla (igual que los paneles)
    function fitSettings() {
        const overlay = document.getElementById('settings-overlay');
        const panel = overlay && overlay.querySelector('.settings-panel');
        if (!panel || typeof IS_PHONE === 'undefined' || !IS_PHONE) return;
        panel.style.zoom = '';
        const z = Math.min(1.6, (overlay.clientWidth - 28) / panel.offsetWidth, (overlay.clientHeight - 28) / panel.offsetHeight);
        if (z > 1.04) panel.style.zoom = z.toFixed(3);
    }
    window.fitSettings = fitSettings;
    window.openSettings = function () {
        if (window.hideTip) hideTip();
        GAME.settingsOpen = true;
        GAME.settingsConfirm = false;
        dirty = false;
        mount(false);
    };
    window.closeSettings = function () {
        GAME.settingsOpen = false;
        GAME.settingsConfirm = false;
        const el = document.getElementById('settings-overlay');
        if (el) el.remove();
        // la pantalla de abajo solo se redibuja si hace falta y no hay una animación en curso
        if (dirty && !GAME.anim) { if (GAME.screen === 'map') GAME.mapPan = null; render(); }
        dirty = false;
    };
    window.setSetting = function (key, value) {
        if (!(key in DEFAULTS) || data[key] === value) return;
        data[key] = value;
        save();
        applySettings();
        if (key === 'mapZoom') dirty = true;
        if (key === 'sfx' && window.Sfx) Sfx.select();
        if (key === 'vibrate' && value && window.buzz) window.buzz(30);
        mount(true);
    };
    window.settingsToMenu = function () {
        if (GAME.anim) { if (window.showToast) showToast('Espera a que termine la jugada'); return; }
        GAME.settingsOpen = false;
        dirty = false;
        showMainMenu();
    };
    window.settingsAskWipe = function (on) { GAME.settingsConfirm = !!on; mount(true); };
    // Borra TODO lo guardado del juego (partida, colección, pase, vestidor) menos estos ajustes
    window.settingsWipe = function () {
        try {
            Object.keys(localStorage).filter((k) => k.indexOf('fruitSpire') === 0 && k !== KEY).forEach((k) => localStorage.removeItem(k));
        } catch (e) { /* sin almacenamiento */ }
        location.reload();
    };
})();
