// ============================================================
// LOOT.JS — Premios que se recogen con un clic.
// Todo lo bueno que te da una recompensa, un cofre, un evento, el pozo o
// un minijuego (oro, vida, vida máxima, objetos, semillas y cartas) sale
// dibujado en una fila de premios. Hay que tocar cada uno: vuela hasta
// su lugar en la barra de arriba (oro, vida, mochila o mazo) y ahí se suma.
//
//   withLootCapture(fn)  corre fn y convierte lo que ganaste en premios por
//                        recoger (lo que pierdes se aplica al momento)
//   queueLoot(item)      agrega un premio: { k: 'gold'|'heal'|'maxhp'|'relic'|'seed'|'card', n, id }
//   lootRowHtml()        la fila de premios (va en cada pantalla de resultado)
//   lootPending()        ¿queda algo sin recoger? (los botones de seguir esperan)
//   hudWatch()           tras cada dibujo: si subió el oro, la vida, la mochila o
//                        el mazo, su casilla de arriba salta y muestra "+N"
// ============================================================

(function () {
    const TARGET = { gold: '.hud-chip.gold', heal: '.hud-chip.hp', maxhp: '.hud-chip.hp', relic: '.hud-bag', seed: '.hud-bag', card: '.hud-deck' };
    const isOpen = (it) => !it.taken && !it.dropped;

    window.lootPending = () => (GAME.loot || []).some(isOpen);
    window.queueLoot = function (item) {
        (GAME.loot = GAME.loot || []).push(Object.assign({ taken: false }, item));
    };
    // objetos que ya están en la fila (para que el sorteo no repita)
    window.lootRelicIds = () => (GAME.loot || []).filter((it) => it.k === 'relic' && isOpen(it)).map((it) => it.id);

    // Corre un efecto (evento, cofre, pozo…) y convierte las ganancias en premios
    window.withLootCapture = function (fn) {
        const p = GAME.player;
        const snap = { gold: p.gold, hp: p.hp, maxHp: p.maxHp, deck: p.deck.slice(), seeds: p.seeds.slice() };
        const start = (GAME.loot = GAME.loot || []).length;
        GAME.lootCapture = true; // giveRelic encola en vez de dar
        GAME.deckLog = []; // los ayudantes de eventos anotan aquí lo que le hacen al mazo
        let res;
        try { res = fn(); } finally { GAME.lootCapture = false; }
        // cartas nuevas al final del mazo (las maldiciones y estados entran solas)
        const same = p.deck.length > snap.deck.length && snap.deck.every((id, i) => p.deck[i] === id);
        if (same) {
            const added = p.deck.splice(snap.deck.length);
            added.forEach((id) => {
                const c = window.getCard(id);
                if (!c || c.type === 'curse' || c.type === 'status') p.deck.push(id);
                else window.queueLoot({ k: 'card', id });
            });
        }
        // cambios del mazo que no son premios: transformar, madurar, quitar o
        // una maldición que se cuela. Se muestran animados en el resultado.
        GAME.deckChanges = GAME.deckLog.length ? GAME.deckLog : deckDiff(snap.deck, p.deck);
        GAME.deckLog = null;
        // semillas que aparecieron en huecos vacíos
        p.seeds.forEach((id, i) => { if (id && !snap.seeds[i]) { p.seeds[i] = null; window.queueLoot({ k: 'seed', id }); } });
        const dGold = p.gold - snap.gold, dMax = p.maxHp - snap.maxHp, dHp = p.hp - snap.hp;
        if (dGold > 0) { p.gold -= dGold; window.queueLoot({ k: 'gold', n: dGold }); }
        if (dMax > 0) {
            const heal = Math.max(0, dHp);
            p.maxHp -= dMax;
            p.hp = Math.min(p.maxHp, p.hp - heal);
            window.queueLoot({ k: 'maxhp', n: dMax, heal });
        } else if (dHp > 0) {
            p.hp -= dHp;
            window.queueLoot({ k: 'heal', n: dHp });
        }
        // orden de la fila: oro, vida, objetos, semillas y cartas
        const ORDER = { gold: 0, heal: 1, maxhp: 1, relic: 2, seed: 3, card: 4 };
        const added = GAME.loot.splice(start).sort((x, y) => ORDER[x.k] - ORDER[y.k]);
        GAME.loot.push(...added);
        return res;
    };

    function deckDiff(before, after) {
        // cartas que salieron o entraron (contando copias)
        const count = (list) => list.reduce((m, id) => m.set(id, (m.get(id) || 0) + 1), new Map());
        const a = count(before), b = count(after);
        const removed = [], added = [];
        a.forEach((n, id) => { for (let k = 0; k < n - (b.get(id) || 0); k++) removed.push(id); });
        b.forEach((n, id) => { for (let k = 0; k < n - (a.get(id) || 0); k++) added.push(id); });
        if (!removed.length && !added.length) return [];
        // cambios en su lugar (transformar o madurar): misma posición, otra carta
        if (before.length === after.length) {
            const moved = before.map((id, i) => i).filter((i) => before[i] !== after[i]);
            if (moved.length === removed.length) {
                return moved.map((i) => ({ kind: after[i] === before[i] + '+' ? 'upgrade' : 'transform', from: before[i], to: after[i] }));
            }
        }
        return [...removed.map((id) => ({ kind: 'remove', from: id })), ...added.map((id) => ({ kind: 'add', to: id }))];
    }
    // Las cartas del mazo que cambiaron, animadas (se ven una sola vez)
    window.deckChangesHtml = function () {
        const list = GAME.deckChanges || [];
        if (!list.length) return '';
        const card = (id) => { const c = window.getCard(id); return c ? renderCardHtml(c, {}) : ''; };
        const name = (id) => (window.getCard(id) || {}).name || '';
        const LABEL = { transform: 'se transformó', upgrade: '¡madurada!', remove: 'salió de tu mazo', add: 'entró a tu mazo' };
        return `<div class="dc-row">${list.slice(0, 4).map((ch, i) => `
            <div class="dc dc-${ch.kind}" style="--i:${i}">
                <div class="dc-stage">
                    ${ch.from ? `<div class="dc-card dc-from">${card(ch.from)}</div>` : ''}
                    ${ch.to ? `<div class="dc-card dc-to">${card(ch.to)}</div>` : ''}
                    <span class="dc-burst">${'<i></i>'.repeat(8)}</span>
                </div>
                <p class="dc-label hand">${ch.kind === 'transform' ? `${name(ch.from)} <b>→</b> ${name(ch.to)}` : name(ch.from || ch.to)} <small>${LABEL[ch.kind]}</small></p>
            </div>`).join('')}</div>`;
    };

    // Da de verdad un premio
    function grant(it) {
        const p = GAME.player;
        if (it.k === 'gold') p.gold += it.n;
        else if (it.k === 'heal') p.hp = Math.min(p.maxHp, p.hp + it.n);
        else if (it.k === 'maxhp') { p.maxHp += it.n; p.hp = Math.min(p.maxHp, p.hp + (it.heal || 0)); }
        else if (it.k === 'relic') { const r = window.RELIC_DB[it.id]; if (r) giveRelic(p, r); }
        else if (it.k === 'seed') addSeed(it.id);
        else if (it.k === 'card') { p.deck.push(it.id); markDiscovered([it.id]); }
    }
    // Al cargar una partida: lo que quedó sin recoger fuera de las recompensas se da solo
    window.grantAllLoot = function (list) {
        (list || []).filter(isOpen).forEach((it) => { if (it.k !== 'seed' || GAME.player.seeds.indexOf(null) >= 0) grant(it); });
    };
    window.openLoot = () => (GAME.loot || []).filter(isOpen).map((it) => ({ k: it.k, n: it.n, id: it.id, heal: it.heal }));

    window.collectLoot = function (i, el) {
        const it = GAME.loot && GAME.loot[i];
        if (!it || !isOpen(it) || it.flying) return;
        const p = GAME.player;
        if (it.k === 'seed' && p.seeds.indexOf(null) < 0) {
            if (window.Sfx) Sfx.denied();
            restartClass(el, 'nope');
            showToast('Tu mochila de semillas está llena: tira una semilla o deja esta.');
            return;
        }
        hideTip();
        it.flying = true;
        el.classList.add('flying');
        if (window.Sfx) (it.k === 'gold' ? Sfx.coin : it.k === 'relic' ? Sfx.relicGet : Sfx.pop)();
        const from = el.querySelector('.loot-art') || el;
        flyGhost(from, TARGET[it.k], () => {
            it.flying = false;
            it.taken = true;
            grant(it);
            saveGame();
            render();
            if (!window.lootPending() && typeof window.onLootDone === 'function') window.onLootDone();
        });
    };
    window.dropLoot = function (i) {
        const it = GAME.loot && GAME.loot[i];
        if (!it || !isOpen(it)) return;
        it.dropped = true;
        render();
        if (!window.lootPending() && typeof window.onLootDone === 'function') window.onLootDone();
    };
    // Si intentas seguir sin recoger: la fila de premios salta
    window.lootNudge = function () {
        if (!window.lootPending()) return false;
        restartClass(document.querySelector('.loot-row'), 'nudge');
        if (window.Sfx) Sfx.denied();
        showToast('¡Primero recoge tus premios!');
        return true;
    };

    // ---------- dibujo ----------
    function lootArt(it) {
        if (it.k === 'gold') return `<span class="loot-coins">${art('ui_coin', '', { size: 'lg' })}${art('ui_coin', '', { size: 'lg' })}${art('ui_coin', '', { size: 'lg' })}</span>`;
        if (it.k === 'heal') return art('ui_heart', '', { size: 'xl' });
        if (it.k === 'maxhp') return `${art('ui_heart', '', { size: 'xl' })}<i class="loot-plus">+</i>`;
        if (it.k === 'relic') { const r = window.RELIC_DB[it.id]; return r ? art(r.sprite || r.id, r.icon, { size: 'xl' }) : ''; }
        if (it.k === 'seed') { const s = window.SEED_DB[it.id]; return s ? seedArt(s, 'xl') : ''; }
        if (it.k === 'card') { const c = window.getCard(it.id); return c ? `<span class="loot-card">${renderCardHtml(c, {})}</span>` : ''; }
        return '';
    }
    function lootLabel(it) {
        if (it.k === 'gold') return `+${it.n} de oro`;
        if (it.k === 'heal') return `+${it.n} ❤️`;
        if (it.k === 'maxhp') return `+${it.n} ❤️ máx.`;
        if (it.k === 'relic') return (window.RELIC_DB[it.id] || {}).name || '';
        if (it.k === 'seed') return (window.SEED_DB[it.id] || {}).name || '';
        if (it.k === 'card') return (window.getCard(it.id) || {}).name || '';
        return '';
    }
    function lootTip(it) {
        if (it.k === 'relic' && window.RELIC_DB[it.id]) return explainRelic(window.RELIC_DB[it.id]);
        if (it.k === 'seed' && window.SEED_DB[it.id]) return seedTip(window.SEED_DB[it.id]);
        if (it.k === 'card' && window.getCard(it.id)) return cardTips(window.getCard(it.id));
        if (it.k === 'maxhp') return tip(['Vida máxima', `Tu vida máxima sube ${it.n}${it.heal ? ` y te curas ${it.heal}` : ''}.`]);
        return '';
    }
    window.lootRowHtml = function () {
        const list = GAME.loot || [];
        if (!list.some((it) => !it.dropped)) return '';
        const full = GAME.player && GAME.player.seeds.indexOf(null) < 0;
        const pending = window.lootPending();
        return `
        <div class="loot-row">
            ${list.map((it, i) => (it.dropped ? '' : `
            <div class="loot-slot" style="--i:${i}">
                <button class="loot-item k-${it.k} ${it.taken ? 'taken' : ''} ${it.flying ? 'flying' : ''}" onclick="collectLoot(${i}, this)" ${it.taken ? '' : lootTip(it)}>
                    <span class="loot-art">${lootArt(it)}</span>
                    <span class="loot-label">${lootLabel(it)}</span>
                    ${it.taken ? '<i class="loot-check"><svg viewBox="0 0 24 24"><path d="M5 12 L10 17 L19 7"/></svg></i>' : ''}
                </button>
                ${it.k === 'seed' && isOpen(it) && full ? `<button class="secondary loot-drop" onclick="dropLoot(${i})">Dejarla</button>` : ''}
            </div>`)).join('')}
        </div>
        ${pending ? '<p class="loot-hint hand">Toca cada premio para guardarlo.</p>' : ''}`;
    };

    // ---------- la barra de arriba reacciona a lo que ganas ----------
    let last = null;
    // el "+N" va en la capa de efectos (la barra se redibuja y lo borraría)
    function hudPop(sel, text, kind) {
        const el = document.querySelector(sel);
        if (!el) return;
        restartClass(el, 'hud-gain');
        const at = canvasPoint(el, 1);
        const pop = overlayAdd(`hud-pop ${kind}`, esc(text), { x: at.x, y: at.y + 4 }, 1500);
        if (pop) heartifyDom(pop);
    }
    window.hudWatch = function () {
        const p = GAME.player;
        if (!p || !document.querySelector('.hud')) { last = null; return; }
        const now = { p, gold: p.gold, hp: p.hp, maxHp: p.maxHp, bag: p.relics.length + p.seeds.filter(Boolean).length, deck: p.deck.length };
        if (last && last.p === p) {
            if (now.gold > last.gold) hudPop('.hud-chip.gold', `+${now.gold - last.gold}`, 'gold');
            if (now.maxHp > last.maxHp) hudPop('.hud-chip.hp', `+${now.maxHp - last.maxHp} ❤️ máx.`, 'hp');
            else if (now.hp > last.hp) hudPop('.hud-chip.hp', `+${now.hp - last.hp} ❤️`, 'hp');
            if (now.bag > last.bag) hudPop('.hud-bag', `+${now.bag - last.bag}`, 'bag');
            if (now.deck > last.deck) hudPop('.hud-deck', `+${now.deck - last.deck}`, 'deck');
        }
        last = now;
    };
})();
