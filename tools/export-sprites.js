// Exporta TODOS los dibujos del juego web (js/art/*.js) como imágenes para la app nativa.
// Uso: node tools/export-sprites.js
//
// Cada dibujo es un SVG de 100x100; se guarda como WebP transparente de PX px por lado con
// un margen (MARGIN unidades por lado) por si algo se sale del cuadro. Van SIN el borde
// blanco de sticker: la app lo pone al componer (así sirve para cualquier tamaño y para
// vestir a las frutas con sus accesorios).
//
// Nombres:  <id>            dibujo normal
//           <id>~<ánimo>    variante de ánimo (happy, angry, hurt, sleepy, sour, wink)
//           <id>~h<n>       golpeado (moretones 1 a 3)        — se combinan: id~happy~h2
//           <id>~s.<skin>   color del vestidor (solo las frutas jugables)
//           acc~<fruta>~<id>   accesorio colocado sobre esa fruta (capa suelta)
//           pet~<id>           mascotita (capa suelta)
//           seed~<id>          semilla
// sprites.json dice, para cada dibujo, qué variantes existen.
const fs = require('fs');
const path = require('path');
const { ROOT, openGame } = require('./chrome');

const OUT = path.join(ROOT, 'nativo', 'app', 'src', 'main', 'assets', 'sprites');
const PX = 496;      // lado de la imagen
const MARGIN = 12;   // unidades de margen por lado (el dibujo ocupa 100 de 124)

// Esto corre DENTRO de la página del juego
const IN_PAGE = `(() => {
    const MOODS = ['happy', 'angry', 'hurt', 'sleepy', 'sour', 'wink'];
    const svgOf = (html) => { const m = /<svg[\\s\\S]*<\\/svg>/.exec(html); return m ? m[0] : null; };
    // El juego mete el SVG por innerHTML (HTML tolera atributos repetidos y se queda con el primero);
    // como imagen suelta tiene que ser XML válido: se pasa por el mismo analizador y se vuelve a escribir.
    const withNs = (svg) => { const d = document.createElement('div'); d.innerHTML = svg; const el = d.querySelector('svg'); return el ? new XMLSerializer().serializeToString(el) : svg; };
    const frame = (svg) => withNs(svg).replace(/viewBox="([-\\d.]+) ([-\\d.]+) ([-\\d.]+) ([-\\d.]+)"/, (all, x, y, w, h) => {
        const k = ${MARGIN} * (+w) / 100;
        return 'viewBox="' + (+x - k) + ' ' + (+y - k) + ' ' + (+w + 2 * k) + ' ' + (+h + 2 * k) + '" width="${PX}" height="${PX}"';
    });
    window.__list = () => {
        const S = window.SPRITES;
        const chars = Object.keys(window.CHARACTER_DB);
        const jobs = [];      // { name, svg }
        const manifest = {};
        const add = (name, svg) => { if (svg) jobs.push({ name, svg: frame(svg) }); };
        const variantsOf = (id, base) => {
            const draw = (o) => { try { return S[id](Object.assign({}, base, o)); } catch (e) { return null; } };
            const plain = draw({});
            const moods = MOODS.filter((m) => { const v = draw({ mood: m }); return v && v !== plain; });
            const hurts = [1, 2, 3].filter((h) => { const v = draw({ hurtStage: h }); return v && v !== plain; });
            return { plain, moods, hurts, draw };
        };
        Object.keys(S).forEach((id) => {
            const info = variantsOf(id, {});
            if (!info.plain) return;
            const entry = { moods: info.moods, hurts: info.hurts, skins: [] };
            const emit = (prefix, base) => {
                const v = variantsOf(id, base);
                ['', ...v.moods].forEach((m) => [0, ...v.hurts].forEach((h) => {
                    add(prefix + (m ? '~' + m : '') + (h ? '~h' + h : ''), v.draw(Object.assign({}, m ? { mood: m } : {}, h ? { hurtStage: h } : {})));
                }));
            };
            emit(id, {});
            // las frutas jugables: una tanda por cada color del vestidor
            const char = chars.find((c) => (window.CHARACTER_DB[c].sprite || c) === id);
            if (char) {
                window.COSMETICS.filter((c) => c.type === 'skin' && c.char === char).forEach((sk) => {
                    entry.skins.push(sk.id);
                    emit(id + '~s.' + sk.id, sk.colors);
                });
            }
            manifest[id] = entry;
        });
        // accesorios (uno por fruta, con su ancla) y mascotitas, como capas sueltas
        const wrap = (inner) => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
        const accs = [], pets = [];
        window.COSMETICS.forEach((c) => {
            if (c.type === 'acc') {
                chars.filter((ch) => !c.char || c.char === ch).forEach((ch) => {
                    const a = window.CHAR_ANCHORS[ch] && window.CHAR_ANCHORS[ch][c.slot];
                    if (!a) return;
                    add('acc~' + ch + '~' + c.id, wrap('<g transform="translate(' + a[0] + ' ' + a[1] + ') rotate(' + a[3] + ') scale(' + a[2] + ')">' + c.draw() + '</g>'));
                });
                accs.push(c.id);
            } else if (c.type === 'pet') {
                add('pet~' + c.id, wrap('<g transform="translate(13 86) scale(.78)">' + c.draw() + '</g>'));
                // la mascotita sola, grande, para el vestidor y los avisos
                add('peticon~' + c.id, wrap('<g transform="translate(50 62) scale(1.6)">' + c.draw() + '</g>'));
                pets.push(c.id);
            }
        });
        // semillas (render.js: seedArt)
        const seeds = [];
        Object.values(window.SEED_DB || {}).forEach((s) => { add('seed~' + s.id, svgOf(seedArt(s, 'lg'))); seeds.push(s.id); });
        // el engrane de Ajustes (js/settings.js) no está en SPRITES
        if (window.gearArt) { add('ui_gear', svgOf(window.gearArt('md'))); manifest.ui_gear = { moods: [], hurts: [], skins: [] }; }
        window.__jobs = jobs;
        return { count: jobs.length, manifest, accs, pets, seeds };
    };
    window.__render = async (from, to) => {
        const out = [];
        for (const job of window.__jobs.slice(from, to)) {
            const img = new Image();
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(job.svg);
            try { await img.decode(); } catch (e) { out.push({ name: job.name, error: String(e) }); continue; }
            const c = document.createElement('canvas');
            c.width = c.height = ${PX};
            c.getContext('2d').drawImage(img, 0, 0, ${PX}, ${PX});
            out.push({ name: job.name, data: c.toDataURL('image/webp', 0.92).split(',')[1] });
        }
        return out;
    };
    return true;
})()`;

(async () => {
    const game = await openGame(9455);
    try {
        await game.evaluate(IN_PAGE);
        const info = await game.evaluate('window.__list()');
        fs.rmSync(OUT, { recursive: true, force: true });
        fs.mkdirSync(OUT, { recursive: true });
        let bytes = 0, bad = 0;
        for (let i = 0; i < info.count; i += 25) {
            const part = await game.evaluate(`window.__render(${i}, ${i + 25})`);
            for (const s of part) {
                if (s.error) { bad++; console.error('no se pudo dibujar ' + s.name + ': ' + s.error); continue; }
                const buf = Buffer.from(s.data, 'base64');
                bytes += buf.length;
                fs.writeFileSync(path.join(OUT, s.name + '.webp'), buf);
            }
            process.stdout.write(`\r${Math.min(i + 25, info.count)} / ${info.count}`);
        }
        fs.writeFileSync(path.join(OUT, 'sprites.json'), JSON.stringify({ px: PX, margin: MARGIN, sprites: info.manifest, accs: info.accs, pets: info.pets, seeds: info.seeds }));
        console.log(`\n${info.count - bad} dibujos (${(bytes / 1048576).toFixed(1)} MB) en ${path.relative(ROOT, OUT)}${bad ? `, ${bad} con error` : ''}`);
    } finally {
        await game.close();
    }
})().catch((e) => { console.error(e); process.exit(1); });
