// ============================================================
// BESTIARY.JS — Bestiario: todos los enemigos, ordenados por castillo y
// piso, con lo que hace cada uno (vida, rasgos y cada jugada explicada).
// Se abre desde el menú (o desde una partida: "Volver a la partida").
// Los que aún no enfrentas salen como silueta "no descubierto": su ficha se
// llena al verlos en un combate. Se cuenta cuántas veces derrotaste a cada uno.
//   bestiarySee(id)          lo marca como visto (al aparecer en combate)
//   bestiaryRecordCombat(c)  suma los derrotados de un combate
// ============================================================

(function () {
    const KEY = 'fruitSpireBestiary_v1';
    let book = {};
    try { book = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { book = {}; }
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(book)); } catch (e) { /* sin almacenamiento */ } };

    window.bestiarySeenCount = () => [Object.keys(window.ENEMY_DB).filter((id) => book[id]).length, Object.keys(window.ENEMY_DB).length];
    window.bestiarySee = function (id) {
        if (!id || (book[id] && book[id].seen)) return;
        book[id] = Object.assign({ kills: 0 }, book[id], { seen: 1 });
        persist();
    };
    window.bestiaryRecordCombat = function (c) {
        if (!c || GAME.tutorial) return;
        let changed = false;
        c.enemies.forEach((e) => {
            if (!e.defId) return;
            book[e.defId] = Object.assign({ kills: 0 }, book[e.defId], { seen: 1 });
            if (!e.isAlive()) { book[e.defId].kills++; changed = true; }
        });
        if (changed || c.enemies.length) persist();
    };

    // ---------- de dónde sale cada enemigo ----------
    const TIER = { normal: 'Común', elite: 'Élite', guard: 'Guardián', boss: 'Jefe del castillo', other: 'Invocado' };
    const uniq = (list) => list.filter((x, i) => x && list.indexOf(x) === i && window.ENEMY_DB[x]);
    const flat = (groups) => (groups || []).reduce((a, g) => a.concat(Array.isArray(g) ? g : [g]), []);
    let cache = null;
    function catalog() {
        if (cache) return cache;
        const where = {}; // id → nombres de pisos
        const note = (id, place) => { (where[id] = where[id] || []).includes(place) || where[id].push(place); };
        const castles = window.CASTLES.map((c) => {
            const themes = Object.values(window.FLOOR_THEMES).filter((t) => t.castle === c.n).map((t) => {
                const elites = uniq(flat(t.elites));
                const guards = uniq(t.bosses || []);
                const normal = uniq(flat(t.weak).concat(flat(t.normal))).filter((id) => !elites.includes(id) && !guards.includes(id));
                [...normal, ...elites, ...guards].forEach((id) => note(id, t.name));
                return { theme: t, normal, elites, guards };
            });
            const bosses = uniq(c.bosses || []);
            bosses.forEach((id) => note(id, c.name));
            return { castle: c, themes, bosses };
        });
        // los invocados: cualquiera que otro enemigo llame, cree al dividirse o críe
        const by = {}; // id invocado → quiénes lo invocan
        const call = (id, who) => { if (window.ENEMY_DB[id]) (by[id] = by[id] || []).includes(who) || by[id].push(who); };
        Object.values(window.ENEMY_DB).forEach((def) => {
            (def.moves || []).forEach((m) => (m.summon || []).forEach((id) => call(id, def.id)));
            if (def.splitInto) call(def.splitInto, def.id);
            if (def.breedInto || (def.start && def.start.breed)) call(def.breedInto || def.id, def.id);
        });
        const listed = new Set(Object.keys(where));
        const summoned = Object.keys(by);
        summoned.forEach((id) => note(id, `Invocado por ${by[id].map((w) => window.ENEMY_DB[w].name).join(', ')}`));
        // los que no salen en ningún piso ni los invoca nadie
        const others = Object.keys(window.ENEMY_DB).filter((id) => !listed.has(id) && !by[id]);
        others.forEach((id) => note(id, 'Encuentros especiales'));
        const tierOf = {};
        castles.forEach((c) => {
            c.themes.forEach((t) => { t.normal.forEach((id) => { tierOf[id] = tierOf[id] || 'normal'; }); t.elites.forEach((id) => { tierOf[id] = 'elite'; }); t.guards.forEach((id) => { tierOf[id] = 'guard'; }); });
            c.bosses.forEach((id) => { tierOf[id] = 'boss'; });
        });
        summoned.forEach((id) => { tierOf[id] = tierOf[id] || 'other'; });
        others.forEach((id) => { tierOf[id] = 'other'; });
        return (cache = { castles, summoned, by, others, where, tierOf });
    }

    // ---------- qué hace cada jugada, en palabras ----------
    const sName = (id) => statusInfo(id).name;
    const enemyName = (id) => (window.ENEMY_DB[id] || {}).name || id;
    function describeMove(m) {
        const parts = [], statuses = [];
        if (m.damage) parts.push(`Ataca por <b>${m.damage}</b>${m.hits > 1 ? ` <b>×${m.hits}</b>` : ''}`);
        if (m.drain) parts.push('se cura con el daño que hace');
        if (m.block) parts.push(`se pone <b>${m.block}</b> de cáscara`);
        if (m.allyBlock) parts.push(`da <b>${m.allyBlock}</b> de cáscara a sus aliados`);
        Object.entries(m.apply || {}).forEach(([id, n]) => { statuses.push([id, n]); parts.push(`te aplica <b>${n}</b> de <span class="kw">${sName(id)}</span>`); });
        Object.entries(m.self || {}).forEach(([id, n]) => { statuses.push([id, n]); parts.push(`gana <b>${n}</b> de <span class="kw">${sName(id)}</span>`); });
        Object.entries(m.allies || {}).forEach(([id, n]) => { statuses.push([id, n]); parts.push(`todos los enemigos ganan <b>${n}</b> de <span class="kw">${sName(id)}</span>`); });
        if (m.heal) parts.push(`se cura <b>${m.heal}</b> ❤️`);
        if (m.healAll) parts.push(`cura <b>${m.healAll}</b> ❤️ a todos`);
        if (m.stealGold) parts.push(`te roba <b>${m.stealGold}</b> de oro (lo recuperas si lo derrotas)`);
        if (m.stealCard) parts.push(`te roba <b>${m.stealCard}</b> carta${m.stealCard > 1 ? 's' : ''} de tu pila de robo (las recuperas si lo derrotas)`);
        if (m.special) parts.push('algo al azar: ¡nunca se sabe qué saldrá!');
        if (m.addCard) {
            const card = window.getCard(m.addCard.id);
            const to = m.addCard.to === 'hand' ? 'tu mano' : m.addCard.to === 'draw' ? 'tu pila de robo' : 'tu descarte';
            parts.push(`mete <b>${m.addCard.n || 1}</b> ${card ? card.name : m.addCard.id} en ${to}`);
        }
        if (m.summon) parts.push(`invoca: ${m.summon.map(enemyName).join(', ')}`);
        let text = parts.join(', ') || 'Hace algo misterioso…';
        text = text.charAt(0).toUpperCase() + text.slice(1) + '.';
        if (m.once) text += ' <i>(solo una vez)</i>';
        return { text, statuses };
    }
    function traits(def) {
        const list = [], statuses = [];
        Object.entries(def.start || {}).forEach(([id, n]) => {
            statuses.push([id, n]);
            list.push(`Empieza con <b>${n}</b> de <span class="kw">${sName(id)}</span>: ${statusInfo(id).help || ''}`);
        });
        if (def.phaseSprites || def.phaseNames) list.push('Tiene <b>varias fases</b>: cambia de forma (y de jugadas) al perder vida.');
        if (def.breedInto) list.push(`Se multiplica: pone crías de <b>${enemyName(def.breedInto)}</b>.`);
        if (def.splitInto) list.push(`Al bajarle la vida, <b>se divide</b> en dos ${enemyName(def.splitInto)}.`);
        if (def.explode || (def.start && def.start.fuse)) list.push(`Tiene una mecha: al terminar la cuenta <b>explota</b> y te hace ${def.explode || 25} de daño. ¡Derrótalo antes!`);
        if (def.leader) list.push('Es el <b>líder</b>: si lo derrotas, sus esbirros huyen.');
        if (def.clockEvery) list.push(`Cada ${def.clockEvery} cartas que juegas, <b>se enfurece</b>.`);
        if (def.onDeath) list.push('Hace algo <b>al ser derrotado</b>.');
        if (def.description) list.push(def.description);
        return { list, statuses };
    }

    // ---------- pantalla ----------
    // el bestiario vive dentro de la Colección (js/collection.js)
    window.openBestiary = function () { openCollection('bestiary'); };
    function ensureState() {
        const c = GAME.player ? Math.min(3, GAME.player.act || 1) : 1;
        return GAME.bestiary || (GAME.bestiary = { tab: c, sel: null });
    }
    window.bestiaryTab = function (t) { GAME.bestiary.tab = t; GAME.bestiary.sel = null; if (window.Sfx) Sfx.select(); render(); };
    window.bestiarySelect = function (id) { GAME.bestiary.sel = GAME.bestiary.sel === id ? null : id; if (window.Sfx) Sfx.tap(); render(); };

    function tile(id) {
        const def = window.ENEMY_DB[id];
        const k = catalog().tierOf[id] || 'normal';
        const rec = book[id];
        const sel = GAME.bestiary.sel === id;
        return `<button class="best-tile tier-${k} ${rec ? '' : 'unseen'} ${sel ? 'sel' : ''}" onclick="bestiarySelect('${id}')">
            <span class="best-art">${art(def.sprite || def.id, def.icon, { size: 'lg' })}</span>
            <span class="best-name">${rec ? def.name : '???'}</span>
            ${k !== 'normal' ? `<span class="best-tier">${TIER[k]}</span>` : ''}
            ${rec && rec.kills ? `<span class="best-kills" title="Veces derrotado">×${rec.kills}</span>` : ''}
        </button>`;
    }
    function detail(id) {
        if (!id) {
            return `<div class="best-detail empty">${art('ui_book', '📖', { size: 'xl' })}
                <p class="hand">Toca un enemigo para ver qué hace.</p>
                <p class="best-tip">Las siluetas son enemigos que aún no descubres: enfréntalos para llenar su ficha. El número ×N es cuántas veces los has derrotado.</p></div>`;
        }
        const def = window.ENEMY_DB[id];
        const cat = catalog();
        const k = cat.tierOf[id] || 'normal';
        const rec = book[id];
        if (!rec) {
            return `<div class="best-detail tier-${k} undiscovered" data-scroll-key="${id}">
                <div class="best-detail-art unseen">${art(def.sprite || def.id, def.icon, { size: 'xxl' })}<b class="best-q">?</b></div>
                <div class="best-ribbon">${TIER[k]}</div>
                <h3 class="hand">No descubierto</h3>
                <p class="best-tip">Todavía no te has cruzado con este enemigo. Enfréntalo en un combate para descubrir su nombre, su vida y lo que hace.</p>
                <p class="best-where"><b>Pista:</b> ${(cat.where[id] || []).join(' · ')}</p>
            </div>`;
        }
        const tr = traits(def);
        const moves = (def.moves || []).map((m) => {
            const d = describeMove(m);
            const tips = d.statuses.length ? tip(d.statuses.map(([s, n]) => statusTip(s, n))) : '';
            return `<li ${tips}><b class="hand">${m.name}</b><span>${d.text}</span></li>`;
        }).join('');
        const hp = def.hpMin === def.hpMax || !def.hpMax ? `${def.hpMin}` : `${def.hpMin}–${def.hpMax}`;
        return `<div class="best-detail tier-${k}" data-scroll-key="${id}">
            <div class="best-detail-art">${art(def.sprite || def.id, def.icon, { size: 'xxl' })}</div>
            <div class="best-ribbon">${TIER[k]}</div>
            <h3 class="hand">${def.name}</h3>
            <div class="best-stats">
                <span>${hp} ❤️</span>
                <span>${rec.kills ? `Derrotado ${rec.kills} ${rec.kills === 1 ? 'vez' : 'veces'}` : 'Ya lo viste'}</span>
            </div>
            <p class="best-where"><b>Dónde:</b> ${(cat.where[id] || []).join(' · ')}</p>
            ${tr.list.length ? `<h4 class="hand">Rasgos</h4><ul class="best-traits" ${tr.statuses.length ? tip(tr.statuses.map(([s, n]) => statusTip(s, n))) : ''}>${tr.list.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
            <h4 class="hand">Jugadas</h4>
            <ul class="best-moves">${moves || '<li>—</li>'}</ul>
        </div>`;
    }
    function section(title, sub, spriteId, icon, ids, extra) {
        if (!ids.length) return '';
        const seen = ids.filter((id) => book[id]).length;
        return `<section class="best-section">
            <h3 class="best-h hand">${art(spriteId, icon, { size: 'sm' })} ${title} <small>${seen}/${ids.length}</small>${extra || ''}</h3>
            ${sub ? `<p class="best-sub">${sub}</p>` : ''}
            <div class="best-grid">${ids.map(tile).join('')}</div>
        </section>`;
    }
    window.bestiaryParts = function () {
        const cat = catalog();
        const st = ensureState();
        const all = Object.keys(window.ENEMY_DB);
        const seen = all.filter((id) => book[id]).length;
        const tabs = [...cat.castles.map((c) => ({ n: c.castle.n, label: `Castillo ${c.castle.n}`, sprite: c.castle.sprite, icon: c.castle.icon })), { n: 0, label: 'Invocados', sprite: 'node_mystery', icon: '❔' }];
        let body = '';
        if (st.tab === 0) {
            body = section('Invocados', 'Aparecen cuando otro enemigo los llama, se divide o cría. Algunos también salen solos en los pisos.', 'node_mystery', '❔', cat.summoned)
                + section('Encuentros especiales', 'No salen en ningún piso ni los invoca nadie.', 'node_enemy', '❔', cat.others);
        } else {
            const c = cat.castles.find((x) => x.castle.n === st.tab) || cat.castles[0];
            body = `<p class="best-castle-sub hand">${c.castle.name} — ${c.castle.subtitle}</p>`
                + c.themes.map(({ theme, normal, elites, guards }) => {
                    const rule = theme.rule ? `<span class="best-rule" ${tip([`Regla: ${theme.rule.name}`, theme.rule.desc])}>${art(theme.rule.sprite, theme.rule.icon, { size: 'xs' })}${theme.rule.name}</span>` : '';
                    return section(theme.name, theme.subtitle, theme.rule ? theme.rule.sprite : 'node_enemy', theme.icon, [...normal, ...elites, ...guards], rule);
                }).join('')
                + section('Jefes del castillo', 'Esperan al final del último piso. Solo uno te toca en cada partida.', c.castle.sprite, c.castle.icon, c.bosses);
        }
        const selId = st.sel && window.ENEMY_DB[st.sel] ? st.sel : null;
        return {
            count: `${seen} de ${all.length} enemigos descubiertos`,
            html: `<div class="best-tabs">${tabs.map((t) => `<button class="best-tab ${st.tab === t.n ? 'on' : ''}" onclick="bestiaryTab(${t.n})">${art(t.sprite, t.icon, { size: 'sm' })}<span>${t.label}</span></button>`).join('')}</div>
                <div class="best-body">
                    <div class="best-list">${body}</div>
                    ${detail(selId)}
                </div>`
        };
    };
})();
