// ============================================================
// BATTLEPASS.JS — Pase de Batalla. Cada enemigo que derrotas da experiencia;
// al subir de nivel se desbloquean premios (colores y accesorios del
// vestidor) que se reclaman aquí, en el menú principal. Ya no salen
// accesorios en cofres ni en botines: TODO el vestidor está en el pase
// (salvo las mascotitas, que se ganan con sus retos).
// La experiencia y lo reclamado se guardan en el navegador.
// ============================================================

(function () {
    const KEY = 'fruitSpirePass_v1';
    // premios que ya se tienen desde el principio (no van en el pase)
    const FREE = ['manzana_clasica', 'platanin_clasico', 'kiwi_clasico', 'uva_clasica', 'gorra'];

    function read() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
        s = s || {};
        return { xp: Math.max(0, +s.xp || 0), claimed: Array.isArray(s.claimed) ? s.claimed : [] };
    }
    function write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }

    // Premios en orden: accesorios de todos, colores, y los exclusivos de cada fruta
    // repartidos hacia el final. Se calcula una vez (COSMETICS ya está cargado).
    let cache = null;
    function rewards() {
        if (cache) return cache;
        const pool = window.COSMETICS.filter((c) => c.type !== 'pet' && !FREE.includes(c.id));
        const generic = pool.filter((c) => c.type === 'acc' && !c.char);
        const skins = pool.filter((c) => c.type === 'skin');
        const exclusive = pool.filter((c) => c.type === 'acc' && c.char);
        const order = [];
        let g = 0, s = 0, e = 0;
        while (g < generic.length || s < skins.length || e < exclusive.length) {
            if (g < generic.length) order.push(generic[g++]);
            if (s < skins.length) order.push(skins[s++]);
            // un exclusivo cada 3 premios, una vez pasada la primera mitad
            if (e < exclusive.length && order.length > pool.length / 3) order.push(exclusive[e++]);
            if (g >= generic.length && s >= skins.length && e < exclusive.length) order.push(exclusive[e++]);
        }
        cache = order.map((c, i) => ({ level: i + 1, id: c.id }));
        return cache;
    }
    // XP que cuesta pasar del nivel n-1 al n
    const xpForLevel = (n) => 60 + 12 * n;
    const totalFor = (level) => { let t = 0; for (let n = 1; n <= level; n++) t += xpForLevel(n); return t; };

    function state() {
        const s = read();
        const max = rewards().length;
        let level = 0;
        while (level < max && s.xp >= totalFor(level + 1)) level++;
        const base = totalFor(level);
        const need = level >= max ? 1 : xpForLevel(level + 1);
        const into = level >= max ? 1 : s.xp - base;
        return { xp: s.xp, level, max, need, into, pct: Math.min(100, Math.round((into / need) * 100)), claimed: s.claimed };
    }

    const PASS = {
        rewards,
        xpForLevel,
        state,
        // Suma experiencia; devuelve { xp, level, levels: niveles subidos }
        addXp(n) {
            const before = state().level;
            const s = read();
            s.xp += Math.max(0, Math.floor(n));
            write(s);
            const after = state();
            return { xp: n, level: after.level, levels: after.level - before };
        },
        // ¿se puede reclamar el premio del nivel?
        canClaim(level) {
            const st = state();
            return level >= 1 && level <= st.level && !st.claimed.includes(level);
        },
        claim(level) {
            if (!PASS.canClaim(level)) return null;
            const r = rewards()[level - 1];
            if (!r) return null;
            const s = read();
            s.claimed.push(level);
            write(s);
            return window.grantCosmetic(r.id);
        },
        claimAll() {
            const got = [];
            const st = state();
            for (let l = 1; l <= st.level; l++) { const c = PASS.claim(l); if (c) got.push(c); }
            return got;
        },
        unclaimed() {
            const st = state();
            let n = 0;
            for (let l = 1; l <= st.level; l++) if (!st.claimed.includes(l)) n++;
            return n;
        }
    };
    window.PASS = PASS;

    // ---------- pantalla ----------
    window.openPass = function () { GAME.screen = 'pass'; render(); };
    window.claimPassLevel = function (level) {
        const c = PASS.claim(level);
        if (!c) return;
        if (window.Sfx) Sfx.equip();
        showToast(`¡${c.name} desbloqueado!`);
        render();
        const el = document.querySelector(`.pass-level[data-level="${level}"]`);
        if (el) restartClass(el, 'just-claimed');
    };
    window.claimAllPass = function () {
        const got = PASS.claimAll();
        if (!got.length) return;
        if (window.Sfx) Sfx.relicGet();
        showToast(`¡${got.length} premio${got.length > 1 ? 's' : ''} reclamado${got.length > 1 ? 's' : ''}!`);
        render();
    };
    // aviso de experiencia ganada (pantalla de botín y de derrota)
    window.passGainBox = function () {
        const g = GAME.passGain;
        if (!g || !g.xp) return '';
        const st = PASS.state();
        return `<div class="pass-gain" onclick="openPass()" ${tip(['Pase de Batalla', 'Cada enemigo que derrotas da experiencia. Reclama los premios en el menú principal.'])}>
            ⭐ <b>+${g.xp} XP</b> del Pase de Batalla · Nivel ${st.level}${g.levels ? ` <i>¡subiste ${g.levels} nivel${g.levels > 1 ? 'es' : ''}!</i>` : ''}</div>`;
    };
    window.renderPass = function () {
        const st = PASS.state();
        const list = PASS.rewards();
        const claimable = PASS.unclaimed();
        const levels = list.map((r) => {
            const c = window.getCosmetic(r.id);
            const reached = r.level <= st.level;
            const claimed = st.claimed.includes(r.level);
            const cls = claimed ? 'claimed' : reached ? 'ready' : 'locked';
            const who = c.char ? ` · solo ${window.CHARACTER_DB[c.char].name}` : '';
            return `<div class="pass-level ${cls}" data-level="${r.level}" ${tip([c.name, `${cosmeticLabel(c)}${who}. ${claimed ? 'Ya lo reclamaste.' : reached ? 'Listo para reclamar.' : `Se desbloquea en el nivel ${r.level}.`}`])}>
                <div class="pass-num hand">${r.level}</div>
                <div class="pass-icon">${cosmeticIcon(c, 'md', !reached)}</div>
                <div class="pass-name">${c.name}</div>
                ${claimed ? '<div class="pass-tag">✔ Reclamado</div>'
                    : reached ? `<button class="btn-mint" onclick="claimPassLevel(${r.level})">Reclamar</button>`
                        : `<div class="pass-tag lock">${art('ui_lock', '', { size: 'xs' })}</div>`}
            </div>`;
        }).join('');
        return `
        <div class="menu-screen wide pass-screen">
            <div class="panel pass-panel">
                <h1 class="hand-title">Pase de Batalla</h1>
                <p class="pass-sub">Derrota enemigos para ganar experiencia y desbloquear colores y accesorios para tus frutas. Los jefes y las élites dan más.</p>
                <div class="pass-progress">
                    <div class="pass-lv"><span class="hand">Nivel</span><b>${st.level}</b><small>/${st.max}</small></div>
                    <div class="pass-bar" ${tip([`${st.xp} XP en total`, st.level >= st.max ? '¡Completaste el pase!' : `Te faltan ${st.need - st.into} XP para el nivel ${st.level + 1}.`])}>
                        <div class="pass-fill" style="width:${st.pct}%"></div>
                        <span>${st.level >= st.max ? '¡Pase completo!' : `${st.into} / ${st.need} XP`}</span>
                    </div>
                    <button class="btn-banana" ${claimable ? '' : 'disabled'} onclick="claimAllPass()">Reclamar todo${claimable ? ` (${claimable})` : ''}</button>
                </div>
                <div class="pass-track">${levels}</div>
            </div>
            <div class="controls-row">
                <button class="btn-grape" onclick="openWardrobe()">Ir al Vestidor</button>
                <button class="secondary" onclick="backToMenu()">Volver</button>
            </div>
        </div>`;
    };
})();
