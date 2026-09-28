// ============================================================
// STORY.JS — La historia animada que se ve al empezar una partida:
// los enemigos llevan a las frutas en jaulas hasta 3 castillos (cada
// uno más grande) y el Rey Fruta queda preso en lo más alto de la
// tercera torre. Es 100% CSS + unos cuantos temporizadores, y se puede
// saltar en cualquier momento.
// ============================================================

(function () {
    // [milisegundos desde el inicio, texto]
    const BEATS = [
        [0, 'Hace mucho tiempo, en el Reino de las Frutas, todos vivían felices…'],
        [4200, '…hasta que los bichos y las máquinas malvadas invadieron el reino.'],
        [10200, 'Encerraron a las frutas en jaulas y se las llevaron a sus tres castillos.'],
        [15600, 'Al Rey Fruta lo encerraron en lo más alto de la tercera torre, la más peligrosa.'],
        [21000, 'Solo una fruta valiente puede subir la torre y rescatarlos a todos. ¡Eres tú!']
    ];
    const SOUNDS = ['turnPlayer', 'introSting', 'turnEnemy', 'relicGet', 'win'];
    const CAPTORS = ['🐛', '🐝', '🐀', '🔪', '🤖', '🕷️', '🦇', '🎲', '🧟'];
    const CAPTIVES = ['🍎', '🍌', '🥝', '🍇', '🍓', '🍍', '🍑', '🍒', '🥭'];
    let timers = [];

    const clear = () => { timers.forEach(clearTimeout); timers = []; };

    window.startStory = function () {
        clear();
        GAME.screen = 'story';
        render();
        const root = () => document.querySelector('.story');
        BEATS.forEach(([ms, text], i) => {
            timers.push(setTimeout(() => {
                const el = root();
                if (!el || GAME.screen !== 'story') return;
                el.classList.add(`ph${i}`);
                const p = document.getElementById('story-text');
                if (p) { p.textContent = text; restartClass(p.parentNode, 'pop-in'); }
                if (window.Sfx && Sfx[SOUNDS[i]]) Sfx[SOUNDS[i]](i === 1 ? true : undefined);
                if (i === BEATS.length - 1) {
                    const go = document.getElementById('story-go');
                    if (go) go.classList.remove('hidden');
                }
            }, ms));
        });
    };
    window.skipStory = function () {
        if (GAME.screen !== 'story') return;
        clear();
        showActIntro();
    };
    window.renderStory = function () {
        const marchers = CAPTORS.map((enemy, i) => `
            <div class="marcher" style="--i:${i}">
                <span class="m-enemy">${enemy}</span>
                <span class="m-cage">${art('cage', '⛓️', { size: 'md' })}<span class="m-fruit">${CAPTIVES[i % CAPTIVES.length]}</span></span>
            </div>`).join('');
        const castleArt = (c, px) => `<span class="story-castle c${c.n}" style="--px:${px}px">${art(c.sprite, c.icon, { size: 'xl' })}${c.n === 3 ? '<span class="story-king">👑</span><span class="story-glow"></span>' : ''}</span>`;
        const [c1, c2, c3] = window.CASTLES;
        return `
        <div class="story ph-none">
            <div class="story-sky"><span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="sun">☀️</span></div>
            <div class="story-dark"></div>
            <div class="story-mountains"></div>
            <div class="story-castles">${castleArt(c1, 150)}${castleArt(c2, 210)}${castleArt(c3, 300)}</div>
            <div class="story-ground"></div>
            <div class="story-village">${['🍎', '🍌', '🥝', '🍇', '🍓', '🍍'].map((f, i) => `<span style="--i:${i}">${f}</span>`).join('')}</div>
            <div class="story-march">${marchers}</div>
            <div class="story-caption hand"><p id="story-text">${BEATS[0][1]}</p></div>
            <div class="story-buttons">
                <button class="secondary" onclick="skipStory()">Saltar ⏭</button>
                <button id="story-go" class="btn-mint hidden" onclick="skipStory()">¡Comenzar la aventura!</button>
            </div>
        </div>`;
    };
})();
