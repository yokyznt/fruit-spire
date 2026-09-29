// ============================================================
// COLLECTION.JS — La Colección: todo lo que puedes descubrir, en un solo
// lugar y con pestañas:
//   · Cartas     el álbum de stickers (cardAlbumParts en render.js)
//   · Objetos    todos los objetos, con su guiño a otros juegos
//   · Semillas   todas las semillas
//   · Bestiario  los enemigos por castillo y piso (bestiaryParts en bestiary.js)
// Lo que aún no encuentras sale como silueta "???". Los objetos y semillas
// se anotan al conseguirlos (markFound), para siempre.
// ============================================================

(function () {
    const KEY = 'fruitSpireFound_v1';
    let found = { relics: {}, seeds: {} };
    try { found = Object.assign(found, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* vacío */ }
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch (e) { /* sin almacenamiento */ } };

    window.markFound = function (kind, id) {
        if (!found[kind] || !id || found[kind][id]) return;
        found[kind][id] = 1;
        persist();
    };
    // lo que ya llevas en la partida cuenta como encontrado
    function syncOwned() {
        const p = GAME.player;
        if (!p) return;
        (p.relics || []).forEach((id) => window.markFound('relics', id));
        (p.seeds || []).forEach((id) => id && window.markFound('seeds', id));
    }

    const TABS = [
        { id: 'cards', label: 'Cartas' },
        { id: 'relics', label: 'Objetos' },
        { id: 'seeds', label: 'Semillas' },
        { id: 'bestiary', label: 'Bestiario' }
    ];
    const RELIC_TIERS = [
        ['common', 'Comunes', 'Común'], ['uncommon', 'Poco comunes', 'Poco común'], ['rare', 'Raros', 'Raro'], ['boss', 'De jefe', 'De jefe']
    ];
    const SEED_TIERS = [['common', 'Comunes'], ['uncommon', 'Poco comunes'], ['rare', 'Raras']];
    const state = () => GAME.collection || (GAME.collection = { tab: 'cards', sel: null });

    window.openCollection = function (tab) {
        if (typeof rememberReturn === 'function') rememberReturn();
        syncOwned();
        const st = state();
        if (typeof tab === 'string') { st.tab = tab; st.sel = null; }
        GAME.screen = 'collection';
        render();
    };
    window.collectionTab = function (t) {
        const st = state();
        if (st.tab === t) return;
        st.tab = t;
        st.sel = null;
        if (window.Sfx) Sfx.select();
        render();
    };
    window.collectionSelect = function (id) {
        const st = state();
        st.sel = st.sel === id ? null : id;
        if (window.Sfx) Sfx.tap();
        render();
    };

    // ---------- fichas (mismo estilo que el bestiario) ----------
    function tile(id, artHtml, name, has, sel, badge) {
        return `<button class="best-tile ${has ? '' : 'unseen'} ${sel ? 'sel' : ''}" onclick="collectionSelect('${id}')">
            <span class="best-art">${artHtml}</span>
            <span class="best-name">${has ? name : '???'}</span>
            ${badge ? `<span class="best-tier">${badge}</span>` : ''}
        </button>`;
    }
    function section(title, spriteHtml, ids, has, tileFor) {
        if (!ids.length) return '';
        return `<section class="best-section">
            <h3 class="best-h hand">${spriteHtml} ${title} <small>${ids.filter(has).length}/${ids.length}</small></h3>
            <div class="best-grid">${ids.map(tileFor).join('')}</div>
        </section>`;
    }
    function undiscovered(artHtml, hint) {
        return `<div class="best-detail undiscovered">
            <div class="best-detail-art unseen">${artHtml}<b class="best-q">?</b></div>
            <h3 class="hand">No descubierto</h3>
            <p class="best-tip">${hint}</p>
        </div>`;
    }
    function emptyDetail(text) {
        return `<div class="best-detail empty">${art('ui_book', '', { size: 'xl' })}<p class="hand">${text}</p></div>`;
    }

    // ---------- objetos ----------
    function relicsParts(st) {
        const all = Object.values(window.RELIC_DB);
        const has = (id) => !!found.relics[id];
        const body = RELIC_TIERS.map(([tier, title, one]) => {
            const ids = all.filter((r) => r.tier === tier).sort((a, b) => a.name.localeCompare(b.name)).map((r) => r.id);
            return section(title, art('ui_bag', '', { size: 'sm' }), ids, has, (id) => {
                const r = window.RELIC_DB[id];
                return tile(id, art(r.sprite || r.id, r.icon, { size: 'lg' }), r.name, has(id), st.sel === id, tier === 'boss' ? one : '');
            });
        }).join('');
        const r = st.sel && window.RELIC_DB[st.sel];
        let detail = emptyDetail('Toca un objeto para verlo en grande.');
        if (r && !has(r.id)) detail = undiscovered(art(r.sprite || r.id, r.icon, { size: 'xxl' }), 'Todavía no lo consigues. Sale en tesoros, élites, jefes, la tiendita y eventos.');
        else if (r) {
            const tier = (RELIC_TIERS.find((t) => t[0] === r.tier) || RELIC_TIERS[0])[2];
            detail = `<div class="best-detail relic-${r.tier}" data-scroll-key="${r.id}">
                <div class="best-detail-art">${art(r.sprite || r.id, r.icon, { size: 'xxl' })}</div>
                <div class="best-ribbon">${tier}</div>
                <h3 class="hand">${r.name}</h3>
                <p class="col-desc">${highlightDesc(r.description)}</p>
                ${r.ref && window.refBoxHtml ? refBoxHtml(r) : ''}
            </div>`;
        }
        return { count: `${all.filter((x) => has(x.id)).length} de ${all.length} objetos`, body, detail };
    }

    // ---------- semillas ----------
    function seedsParts(st) {
        const all = Object.values(window.SEED_DB);
        const has = (id) => !!found.seeds[id];
        const body = SEED_TIERS.map(([tier, title]) => {
            const ids = all.filter((s) => s.rarity === tier).sort((a, b) => a.name.localeCompare(b.name)).map((s) => s.id);
            return section(title, art('ui_heal', '', { size: 'sm' }), ids, has, (id) => {
                const s = window.SEED_DB[id];
                return tile(id, seedArt(s, 'lg'), s.name, has(id), st.sel === id, '');
            });
        }).join('');
        const s = st.sel && window.SEED_DB[st.sel];
        let detail = emptyDetail('Toca una semilla para verla en grande.');
        if (s && !has(s.id)) detail = undiscovered(seedArt(s, 'xxl'), 'Todavía no la consigues. Salen en recompensas, la tiendita y algunos eventos.');
        else if (s) {
            detail = `<div class="best-detail" data-scroll-key="${s.id}">
                <div class="best-detail-art">${seedArt(s, 'xxl')}</div>
                <div class="best-ribbon">${SEED_RARITY[s.rarity] || ''}</div>
                <h3 class="hand">${s.name}</h3>
                <p class="col-desc">${highlightDesc(s.desc)}</p>
                <p class="best-tip">Se usa una sola vez, en combate y durante tu turno.</p>
            </div>`;
        }
        return { count: `${all.filter((x) => has(x.id)).length} de ${all.length} semillas`, body, detail };
    }

    window.renderCollection = function () {
        const st = state();
        let count = '', inner = '';
        if (st.tab === 'cards') {
            const a = cardAlbumParts();
            count = a.count;
            inner = `<div class="col-cards">${a.html}</div>`;
        } else if (st.tab === 'bestiary') {
            const b = bestiaryParts();
            count = b.count;
            inner = b.html;
        } else {
            const p = st.tab === 'relics' ? relicsParts(st) : seedsParts(st);
            count = p.count;
            inner = `<div class="best-body"><div class="best-list">${p.body}</div>${p.detail}</div>`;
        }
        const icon = {
            cards: art((window.getCard('golpe_cascara') || {}).sprite || 'ui_play', '', { size: 'sm' }),
            relics: art('ui_bag', '', { size: 'sm' }),
            seeds: seedArt(window.SEED_DB.semilla_chile, 'sm'),
            bestiary: art('ui_book', '', { size: 'sm' })
        };
        return `
        <div class="menu-screen wide">
            <div class="panel bestiary collection-panel">
                <div class="best-head">
                    ${art('ui_book', '', { size: 'lg' })}
                    <h1 class="hand-title">Colección</h1>
                    <span class="best-count hand">${count}</span>
                </div>
                <div class="col-tabs">${TABS.map((t) => `<button class="col-tab ${st.tab === t.id ? 'on' : ''}" onclick="collectionTab('${t.id}')">${icon[t.id]}<span>${t.label}</span></button>`).join('')}</div>
                ${inner}
                <button class="secondary" onclick="backToMenu()">${backLabel()}</button>
            </div>
        </div>`;
    };
})();
