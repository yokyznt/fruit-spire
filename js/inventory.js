// ============================================================
// INVENTORY.JS — La mochila: un botón en la barra de arriba (con cuántos
// objetos llevas y los últimos 3) que abre una ventana con todos tus
// objetos y semillas. Al tocar un objeto se ve en grande con su rareza,
// qué hace, su guiño a otro juego y su estado (usado, contador…).
// Se abre también con la tecla I y se cierra con Esc.
// ============================================================

(function () {
    const TIERS = {
        common: { name: 'Común', cls: 't-common', order: 2 },
        uncommon: { name: 'Poco común', cls: 't-uncommon', order: 1 },
        rare: { name: 'Raro', cls: 't-rare', order: 0 },
        boss: { name: 'De jefe', cls: 't-boss', order: -1 }
    };
    const SORTS = { recent: 'Recientes', tier: 'Rareza', name: 'Nombre' };

    // Estado extra de algunos objetos que se guarda toda la partida
    function relicStatus(r, p) {
        const c = (p.relicCounters || {})[r.id] || {};
        if (r.id === 'chile_picante') return `Cartas jugadas: ${c.n || 0} de 10`;
        if (r.id === 'desafio_muerte') return c.used ? 'Ya te salvó en esta partida' : 'Listo para salvarte una vez';
        return '';
    }

    // ---------- botón de la barra de arriba ----------
    window.hudBagHtml = function (p) {
        const n = p.relics.length;
        const last = p.relics.slice(-3).reverse().map((rid, i) => {
            const r = window.RELIC_DB[rid];
            return r ? `<span class="bag-peek relic-sticker ${r.tier === 'boss' ? 'boss' : ''}" data-relic="${r.id}" style="--k:${i}">${art(r.sprite || r.id, r.icon, { size: 'xs' })}</span>` : '';
        }).join('');
        return `<button class="hud-bag ${n ? '' : 'empty'}" onclick="openInventory()" ${tip(['Mochila', n ? `Llevas ${n} objeto${n === 1 ? '' : 's'}. Toca para verlos todos (tecla I).` : 'Todavía no tienes objetos. Salen en tesoros, élites, jefes, tiendas y eventos.'])}>
            ${art('ui_bag', '🎒', { size: 'sm' })}
            <span class="bag-count">${n}</span>
            <span class="bag-peeks">${last}</span>
        </button>`;
    };

    // ---------- abrir / cerrar ----------
    window.openInventory = function (tab) {
        if (!GAME.player) return;
        hideTip();
        GAME.inventory = { tab: tab || (GAME.inventory && GAME.inventory.tab) || 'relics', sel: null, sort: (GAME.inventory && GAME.inventory.sort) || 'recent' };
        if (window.Sfx) Sfx.pop();
        render();
    };
    window.closeInventory = function () { GAME.inventory = null; render(); };
    window.invTab = function (tab) { if (GAME.inventory) { GAME.inventory.tab = tab; GAME.inventory.sel = null; render(); } };
    window.invSort = function (s) { if (GAME.inventory) { GAME.inventory.sort = s; render(); } };
    window.invSelect = function (id) {
        if (!GAME.inventory) return;
        GAME.inventory.sel = GAME.inventory.sel === id ? null : id;
        if (window.Sfx) Sfx.select();
        render();
    };
    window.invUseSeed = function (i) { GAME.inventory = null; useSeedFromMenu(i); };
    window.invDropSeed = function (i) { if (confirm('¿Tirar esta semilla?')) { discardSeed(i); GAME.inventory = { tab: 'seeds', sel: null, sort: 'recent' }; render(); } };

    // ---------- la ventana ----------
    function relicTile(r, idx, selected) {
        const t = TIERS[r.tier] || TIERS.common;
        return `<button class="inv-tile ${t.cls} ${selected ? 'sel' : ''}" style="--i:${Math.min(idx, 30)}" onclick="invSelect('${r.id}')" ${explainRelic(r)}>
            <span class="inv-art">${art(r.sprite || r.id, r.icon, { size: 'lg' })}</span>
            <span class="inv-name">${r.name}</span>
            <span class="inv-tier">${t.name}</span>
        </button>`;
    }
    function relicDetail(r, p) {
        if (!r) {
            return `<div class="inv-detail empty">${art('ui_bag', '🎒', { size: 'xl' })}
                <p class="hand">Toca un objeto para verlo en grande.</p>
                <p class="inv-tip">Los objetos funcionan solos durante toda la partida. Los <b>de jefe</b> son muy fuertes, pero algunos tienen truco.</p></div>`;
        }
        const t = TIERS[r.tier] || TIERS.common;
        const status = relicStatus(r, p);
        return `<div class="inv-detail ${t.cls}">
            <div class="inv-detail-art">${art(r.sprite || r.id, r.icon, { size: 'xxl' })}</div>
            <div class="inv-ribbon">${t.name}</div>
            <h3 class="hand">${r.name}</h3>
            <p class="inv-desc">${highlightDesc(r.description)}</p>
            ${status ? `<p class="inv-status">${status}</p>` : ''}
            ${r.ref ? `<p class="inv-ref">${r.ref}</p>` : ''}
        </div>`;
    }
    function relicsTab(p, inv) {
        let list = p.relics.map((rid, k) => ({ r: window.RELIC_DB[rid], k })).filter((x) => x.r);
        if (inv.sort === 'recent') list.reverse();
        else if (inv.sort === 'tier') list.sort((a, b) => (TIERS[a.r.tier] || TIERS.common).order - (TIERS[b.r.tier] || TIERS.common).order || a.r.name.localeCompare(b.r.name));
        else list.sort((a, b) => a.r.name.localeCompare(b.r.name));
        const counts = {};
        p.relics.forEach((rid) => { const r = window.RELIC_DB[rid]; if (r) counts[r.tier] = (counts[r.tier] || 0) + 1; });
        const sel = inv.sel && window.RELIC_DB[inv.sel];
        return `
        <div class="inv-toolbar">
            <div class="inv-counts">${Object.keys(TIERS).filter((k) => counts[k]).map((k) => `<span class="inv-count ${TIERS[k].cls}">${counts[k]} ${TIERS[k].name.toLowerCase()}</span>`).join('') || '<span class="hand">Sin objetos todavía</span>'}</div>
            <div class="inv-sorts">${Object.keys(SORTS).map((s) => `<button class="inv-sort ${inv.sort === s ? 'on' : ''}" onclick="invSort('${s}')">${SORTS[s]}</button>`).join('')}</div>
        </div>
        <div class="inv-body">
            <div class="inv-grid">${list.map(({ r }, i) => relicTile(r, i, sel && sel.id === r.id)).join('')
                || `<div class="inv-empty">${art('ui_bag', '🎒', { size: 'xl' })}<p class="hand">Tu mochila está vacía… ¡por ahora!</p><p>Consigue objetos en tesoros, élites, jefes, la tiendita y eventos.</p></div>`}</div>
            ${relicDetail(sel, p)}
        </div>`;
    }
    function seedsTab(p) {
        const usable = canUseSeedNow();
        const slots = (p.seeds || []).map((id, i) => {
            const s = window.SEED_DB[id];
            if (!s) return `<div class="inv-seed empty"><span class="seed-slot empty"></span><p class="hand">Hueco libre</p></div>`;
            return `<div class="inv-seed">
                ${seedArt(s, 'lg')}
                <b class="hand">${s.name}</b>
                <span class="inv-tier">${SEED_RARITY[s.rarity] || ''}</span>
                <p>${highlightDesc(s.desc)}</p>
                <div class="controls-row">
                    <button class="btn-mint" onclick="invUseSeed(${i})" ${usable ? '' : `disabled ${tip(['Aún no', 'Las semillas se usan en combate, en tu turno.'])}`}>Usar</button>
                    <button class="secondary" onclick="invDropSeed(${i})">Tirar</button>
                </div>
            </div>`;
        }).join('');
        return `<p class="inv-tip">Las semillas se usan una sola vez, en combate y durante tu turno. Caben ${window.SEED_SLOTS} en tu bolsa.</p>
            <div class="inv-seeds">${slots}</div>`;
    }
    window.renderInventory = function () {
        const inv = GAME.inventory;
        const p = GAME.player;
        if (!inv || !p) return '';
        const seedsN = (p.seeds || []).filter(Boolean).length;
        return `
        <div class="modal-backdrop inv-backdrop" onclick="closeInventory()">
            <div class="modal panel inventory" onclick="event.stopPropagation()">
                <div class="inv-head">
                    ${art('ui_bag', '🎒', { size: 'lg' })}
                    <h2 class="hand-title">Mochila</h2>
                    <div class="inv-tabs">
                        <button class="inv-tabbtn ${inv.tab === 'relics' ? 'on' : ''}" onclick="invTab('relics')">Objetos <b>${p.relics.length}</b></button>
                        <button class="inv-tabbtn ${inv.tab === 'seeds' ? 'on' : ''}" onclick="invTab('seeds')">Semillas <b>${seedsN}/${window.SEED_SLOTS}</b></button>
                    </div>
                    <button class="inv-close secondary" onclick="closeInventory()" ${tip(['Cerrar', 'También con Esc.'])}>✕</button>
                </div>
                ${inv.tab === 'seeds' ? seedsTab(p) : relicsTab(p, inv)}
            </div>
        </div>`;
    };

    document.addEventListener('keydown', (e) => {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        if (e.key === 'Escape' && GAME.inventory) { closeInventory(); e.stopImmediatePropagation(); return; }
        if ((e.key === 'i' || e.key === 'I') && GAME.player && !['menu', 'character-select', 'story', 'collection', 'wardrobe', 'pass', 'notes'].includes(GAME.screen)) {
            if (GAME.inventory) closeInventory(); else openInventory();
        }
    }, true);
})();
