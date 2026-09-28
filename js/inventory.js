// ============================================================
// INVENTORY.JS — La mochila: TODO lo que llevas en un solo lugar.
// En la barra de arriba hay un botón (cuántos objetos llevas, los
// últimos y tus semillas) que abre una ventana con:
//   · arriba tus semillas (se usan en combate, en tu turno)
//   · abajo tus objetos; al tocar uno se ve en grande con su rareza,
//     qué hace, su guiño a otro juego y su estado.
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
    const seedsReady = () => (GAME.player.seeds || []).some(Boolean) && canUseSeedNow();

    // ---------- botón de la barra de arriba ----------
    window.hudBagHtml = function (p) {
        const n = p.relics.length;
        const seeds = p.seeds || [];
        const nSeeds = seeds.filter(Boolean).length;
        const last = p.relics.slice(-2).reverse().map((rid, i) => {
            const r = window.RELIC_DB[rid];
            return r ? `<span class="bag-peek relic-sticker ${r.tier === 'boss' ? 'boss' : ''}" data-relic="${r.id}" style="--k:${i}">${art(r.sprite || r.id, r.icon, { size: 'xs' })}</span>` : '';
        }).join('');
        const dots = seeds.map((id) => {
            const s = window.SEED_DB[id];
            return s ? `<span class="bag-seed">${seedArt(s, 'xs')}</span>` : '<span class="bag-seed empty"></span>';
        }).join('');
        const ready = GAME.screen === 'combat' && seedsReady();
        const text = `${n ? `Llevas ${n} objeto${n === 1 ? '' : 's'}` : 'Todavía no tienes objetos'} y ${nSeeds} de ${window.SEED_SLOTS} semillas. Toca para ver todo (tecla I).${ready ? ' ¡Puedes usar una semilla ahora!' : ''}`;
        return `<button class="hud-bag ${n ? '' : 'empty'} ${ready ? 'seed-ready' : ''}" onclick="openInventory()" ${tip(['Mochila', text])}>
            ${art('ui_bag', '🎒', { size: 'sm' })}
            <span class="bag-count">${n}</span>
            <span class="bag-peeks">${last}</span>
            <span class="bag-seeds">${dots}</span>
        </button>`;
    };

    // ---------- abrir / cerrar ----------
    window.openInventory = function () {
        if (!GAME.player) return;
        hideTip();
        GAME.inventory = { sel: null, sort: (GAME.inventory && GAME.inventory.sort) || 'recent' };
        if (window.Sfx) Sfx.pop();
        render();
    };
    window.closeInventory = function () { GAME.inventory = null; render(); };
    window.invSort = function (s) { if (GAME.inventory) { GAME.inventory.sort = s; render(); } };
    window.invSelect = function (id) {
        if (!GAME.inventory) return;
        GAME.inventory.sel = GAME.inventory.sel === id ? null : id;
        if (window.Sfx) Sfx.select();
        render();
    };
    window.invUseSeed = function (i) { GAME.inventory = null; useSeedFromMenu(i); };
    window.invDropSeed = function (i) {
        if (!confirm('¿Tirar esta semilla?')) return;
        const keep = GAME.inventory;
        discardSeed(i);
        GAME.inventory = keep;
        render();
    };

    // ---------- semillas (arriba) ----------
    function seedsSection(p) {
        const usable = canUseSeedNow();
        const nSeeds = (p.seeds || []).filter(Boolean).length;
        const cards = (p.seeds || []).map((id, i) => {
            const s = window.SEED_DB[id];
            if (!s) return `<div class="inv-seed empty"><span class="seed-slot empty"></span><span class="hand">Hueco libre</span></div>`;
            return `<div class="inv-seed" ${seedTip(s)}>
                ${seedArt(s, 'md')}
                <div class="inv-seed-text">
                    <b class="hand">${s.name}</b> <span class="inv-tier">${SEED_RARITY[s.rarity] || ''}</span>
                    <p>${highlightDesc(s.desc)}</p>
                    <div class="inv-seed-btns">
                        <button class="btn-mint" onclick="invUseSeed(${i})" ${usable ? '' : 'disabled'}>Usar</button>
                        <button class="secondary" onclick="invDropSeed(${i})">Tirar</button>
                    </div>
                </div>
            </div>`;
        }).join('');
        return `
        <section class="inv-section seeds">
            <h3 class="inv-h hand">Semillas <b>${nSeeds}/${window.SEED_SLOTS}</b>
                <small>${usable ? '¡Es tu turno: puedes usarlas!' : 'Se usan una vez, en combate y durante tu turno.'}</small></h3>
            <div class="inv-seeds">${cards}</div>
        </section>`;
    }

    // ---------- objetos (abajo) ----------
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
            ${r.ref ? refBoxHtml(r) : ''}
        </div>`;
    }
    function relicsSection(p, inv) {
        let list = p.relics.map((rid, k) => ({ r: window.RELIC_DB[rid], k })).filter((x) => x.r);
        if (inv.sort === 'recent') list.reverse();
        else if (inv.sort === 'tier') list.sort((a, b) => (TIERS[a.r.tier] || TIERS.common).order - (TIERS[b.r.tier] || TIERS.common).order || a.r.name.localeCompare(b.r.name));
        else list.sort((a, b) => a.r.name.localeCompare(b.r.name));
        const counts = {};
        p.relics.forEach((rid) => { const r = window.RELIC_DB[rid]; if (r) counts[r.tier] = (counts[r.tier] || 0) + 1; });
        const sel = inv.sel && window.RELIC_DB[inv.sel];
        return `
        <section class="inv-section relics">
            <div class="inv-toolbar">
                <h3 class="inv-h hand">Objetos <b>${p.relics.length}</b></h3>
                <div class="inv-counts">${Object.keys(TIERS).filter((k) => counts[k]).map((k) => `<span class="inv-count ${TIERS[k].cls}">${counts[k]} ${TIERS[k].name.toLowerCase()}</span>`).join('')}</div>
                <div class="inv-sorts">${Object.keys(SORTS).map((s) => `<button class="inv-sort ${inv.sort === s ? 'on' : ''}" onclick="invSort('${s}')">${SORTS[s]}</button>`).join('')}</div>
            </div>
            <div class="inv-body">
                <div class="inv-grid">${list.map(({ r }, i) => relicTile(r, i, sel && sel.id === r.id)).join('')
                    || `<div class="inv-empty">${art('ui_bag', '🎒', { size: 'lg' })}<p class="hand">Todavía no tienes objetos… ¡por ahora!</p><p>Salen en tesoros, élites, jefes, la tiendita y eventos.</p></div>`}</div>
                ${relicDetail(sel, p)}
            </div>
        </section>`;
    }

    window.renderInventory = function () {
        const inv = GAME.inventory;
        const p = GAME.player;
        if (!inv || !p) return '';
        return `
        <div class="modal-backdrop inv-backdrop" onclick="closeInventory()">
            <div class="modal panel inventory" onclick="event.stopPropagation()">
                <div class="inv-head">
                    ${art('ui_bag', '🎒', { size: 'lg' })}
                    <h2 class="hand-title">Mochila</h2>
                    <span class="inv-sub hand">Tus semillas y objetos, todo junto</span>
                    <button class="inv-close secondary" onclick="closeInventory()" ${tip(['Cerrar', 'También con Esc.'])}>✕</button>
                </div>
                ${seedsSection(p)}
                ${relicsSection(p, inv)}
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
