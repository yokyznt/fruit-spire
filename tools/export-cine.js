// Exporta la historia y el final animados de la versión web (js/story.js, js/ending.js, css/intro.css, css/ending.css) como
// videos MP4 para la app nativa, que los reproduce y pone encima el texto, los controles y los sonidos.
// Uso: node tools/export-cine.js [story|ending] [filtro]     (sin argumentos, todo; el filtro es parte del nombre: s1_manzana)
// Necesita Node 22+, Google Chrome y ffmpeg (con libx264) en el PATH. Variables: CINE_FPS (30), CINE_CRF (28), CINE_WORKERS (3).
//
// Cómo: la escena se dibuja con renderStory()/renderEnding() de la propia web en un contenedor de 1920x810 (el escenario de 1440x810
// queda centrado y el cielo y el suelo se estiran), se detienen TODAS las animaciones CSS (document.getAnimations) y para cada
// cuadro se fija su tiempo y se captura la pantalla. Así sale exacto y sin depender de la velocidad del equipo. Cada escena arranca
// desde el final de la anterior, de modo que el fundido de entrada queda dentro del video.
// Las escenas que dependen de la fruta elegida (ella y las otras tres que salen en las jaulas) tienen una versión por fruta, y la
// escena 0 del final también por jefe final. El texto, los puntos y los botones los pone la app.
//
// Salida: nativo/app/src/main/assets/cine/<s|e><escena>_<fruta>[_<jefe>].mp4   (s3 y s4 de la historia no dependen de la fruta: s3.mp4, s4.mp4)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT, openGame } = require('./chrome');

const OUT = path.join(ROOT, 'nativo', 'app', 'src', 'main', 'assets', 'cine');
const FPS = +(process.env.CINE_FPS || 30);
const CRF = process.env.CINE_CRF || '28';
const WORKERS = +(process.env.CINE_WORKERS || 3);
const W = 1920, H = 810;
// lo que dura cada escena en la web (la última espera un toque: se graba lo que tardan sus animaciones en asentarse)
const DUR = { story: [7000, 6500, 9000, 8000, 7000, 5000], ending: [7500, 7500, 9000, 8000, 5500] };
// qué escenas dependen de la fruta (cast() usa al héroe y a las otras tres)
const HERO_SCENES = { story: [0, 1, 2, 5], ending: [0, 1, 2, 3, 4] };

const IN_PAGE = `(() => {
    const w = document.createElement('div');
    w.id = 'capwrap';
    w.style.cssText = 'position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:99999;overflow:hidden;background:#000';
    document.body.appendChild(w);
    const st = document.createElement('style');
    st.textContent = '.cine-caption,.cine-controls,.cine-go{display:none!important}';
    document.head.appendChild(st);
    const cls = (kind, n) => kind === 'story' ? 'cine scene-' + n : 'cine ending es-' + n;
    const el = () => document.getElementById('cine');
    window.__cast = () => ({ heroes: Object.keys(window.CHARACTER_DB), bosses: Object.values(window.ENEMY_DB).filter((e) => e.final).map((e) => e.id) });
    // dibuja la escena y la deja como estaba al final de la anterior
    window.__prep = (kind, scene, hero, boss) => {
        GAME.player = null; GAME.selectedChar = hero; GAME.lastBossId = boss;
        if (kind === 'story') { GAME.story = { i: 0, replay: false, t0: 0 }; w.innerHTML = window.renderStory(); }
        else { GAME.ending = { i: 0, replay: false, t0: 0 }; w.innerHTML = window.renderEnding(); }
        el().className = cls(kind, Math.max(0, scene - 1));
        void el().offsetWidth;
        document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* infinita: sigue */ } });
    };
    // arranca la escena (empiezan sus animaciones y los fundidos) y la detiene en el tiempo 0
    window.__start = (kind, scene) => {
        el().className = cls(kind, scene);
        void el().offsetWidth;
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; });
    };
    window.__seek = (t) => new Promise((res) => {
        document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
        requestAnimationFrame(() => requestAnimationFrame(res));
    });
})()`;

function encode(frames, out) {
    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'),
            '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', out], { stdio: 'inherit' });
        p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg falló: ' + out))));
    });
}

async function render(game, job) {
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-frames-'));
    try {
        await game.evaluate(`window.__prep(${JSON.stringify(job.kind)}, ${job.scene}, ${JSON.stringify(job.hero)}, ${JSON.stringify(job.boss)})`);
        await game.evaluate(`window.__start(${JSON.stringify(job.kind)}, ${job.scene})`);
        const n = Math.round((job.dur / 1000) * FPS);
        for (let k = 0; k < n; k++) {
            await game.evaluate(`window.__seek(${((k * 1000) / FPS).toFixed(2)})`);
            const m = await game.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, optimizeForSpeed: true });
            fs.writeFileSync(path.join(frames, `f${String(k + 1).padStart(5, '0')}.jpg`), Buffer.from(m.result.data, 'base64'));
        }
        await encode(frames, job.out);
    } finally {
        fs.rmSync(frames, { recursive: true, force: true });
    }
}

(async () => {
    const only = process.argv[2] === 'story' || process.argv[2] === 'ending' ? process.argv[2] : '';
    const filter = (only ? process.argv[3] : process.argv[2]) || '';
    fs.mkdirSync(OUT, { recursive: true });
    const games = [];
    for (let i = 0; i < WORKERS; i++) {
        const g = await openGame(9400 + i);
        await g.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
        await g.evaluate(IN_PAGE);
        games.push(g);
    }
    const { heroes, bosses } = await games[0].evaluate('window.__cast()');
    // la lista de trabajos
    const jobs = [];
    for (const kind of ['story', 'ending']) {
        if (only && only !== kind) continue;
        const letter = kind === 'story' ? 's' : 'e';
        DUR[kind].forEach((dur, scene) => {
            if (!HERO_SCENES[kind].includes(scene)) { jobs.push({ kind, scene, dur, hero: heroes[0], boss: bosses[0], name: `${letter}${scene}` }); return; }
            for (const hero of heroes) {
                if (kind === 'ending' && scene === 0) for (const boss of bosses) jobs.push({ kind, scene, dur, hero, boss, name: `${letter}${scene}_${hero}_${boss}` });
                else jobs.push({ kind, scene, dur, hero, boss: bosses[0], name: `${letter}${scene}_${hero}` });
            }
        });
    }
    const todo = jobs.filter((j) => j.name.includes(filter));
    console.log(`${todo.length} videos (${(todo.reduce((s, j) => s + j.dur, 0) / 1000).toFixed(0)} s de escena a ${FPS} cuadros por segundo) con ${WORKERS} Chrome`);
    let next = 0, done = 0;
    await Promise.all(games.map(async (game) => {
        while (next < todo.length) {
            const job = todo[next++];
            job.out = path.join(OUT, job.name + '.mp4');
            const t0 = Date.now();
            await render(game, job);
            console.log(`[${++done}/${todo.length}] ${job.name}  ${((Date.now() - t0) / 1000).toFixed(0)} s  ${(fs.statSync(job.out).size / 1048576).toFixed(2)} MB`);
        }
    }));
    for (const g of games) await g.close();
    const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp4')).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
    console.log(`listo: ${(total / 1048576).toFixed(1)} MB en ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
