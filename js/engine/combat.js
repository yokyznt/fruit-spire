// ============================================================
// COMBAT.JS — Motor de combate por turnos. No toca el DOM;
// llama a onUpdate() para avisar cambios y guarda cada efecto en
// this.lastEvents para que la interfaz pueda animarlos.
//
// Soporta uno o varios enemigos (this.enemies). Las cartas actúan
// sobre ctx.enemy, que es el enemigo elegido como objetivo al jugar
// la carta (arrastrándola hacia él). ctx.enemies trae a todos los
// enemigos vivos.
//
// El turno enemigo va en 3 fases para que la interfaz pueda
// animar cada una por separado:
//   endPlayerTurn()  -> fin del turno del jugador (descartes, estados)
//   enemyAct(i)      -> el enemigo i hace su jugada (uno por uno)
//   endEnemyTurn()   -> estados de los enemigos, nuevo turno del jugador
//
// Objetos: cada una puede definir hooks (ver js/data/relics.js).
// ============================================================

const HAND_LIMIT = 10;

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

class Combat {
    // opts.mods: { hpMult, dmgBonus } — dificultad para los enemigos
    constructor(player, enemyDefs, onUpdate, onEnd, opts) {
        opts = opts || {};
        this.player = player;
        this.mods = opts.mods || {};
        this.enemies = (Array.isArray(enemyDefs) ? enemyDefs : [enemyDefs]).map((d) => new EnemyInstance(d, this.mods));
        this.target = null;
        this.onUpdate = onUpdate || function () {};
        this.onEnd = onEnd || function () {};
        this.turn = 'player';
        this.turnNumber = 1;
        this.lastEvents = [];
        this.ended = false;
        this.relicState = {};
        this.turnState = { cardsPlayed: 0, attacksPlayed: 0 };
        this.damageMult = 1;
        this.xpGained = 0; // experiencia del pase de batalla por los enemigos derrotados
        this.lastPlayed = null; // id de la última carta jugada (la copia la Semilla Espejo)
        this.start();
    }

    // Enemigo "actual": el objetivo elegido si sigue vivo, si no el primero vivo
    get enemy() {
        if (this.target && this.target.isAlive()) return this.target;
        return this.aliveEnemies()[0] || this.enemies[0];
    }
    aliveEnemies() { return this.enemies.filter((e) => e.isAlive()); }

    targetKey(entity) {
        return entity === this.player ? 'player' : `enemy-${this.enemies.indexOf(entity)}`;
    }
    pushEvent(type, entity, amount, extra) {
        this.lastEvents.push(Object.assign({ type, target: this.targetKey(entity), amount }, extra || {}));
    }

    // ---------- objetos ----------
    relicHook(name, ...args) {
        this.player.relics.forEach((rid) => {
            const relic = window.RELIC_DB[rid];
            if (!relic || !relic[name]) return;
            const ctx = this.makeCtx(null);
            ctx.state = this.relicState[rid] || (this.relicState[rid] = {});
            ctx.persist = this.player.relicCounters[rid] || (this.player.relicCounters[rid] = {});
            ctx.flash = () => this.pushEvent('relic', this.player, 0, { relicId: rid });
            relic[name](ctx, ...args);
        });
    }
    relicSum(field) {
        return this.player.relics.reduce((s, rid) => s + ((window.RELIC_DB[rid] || {})[field] || 0), 0);
    }
    hasRelic(id) { return this.player.relics.includes(id); }

    // ---------- inicio ----------
    start() {
        const p = this.player;
        p.drawPile = shuffle([...p.deck]);
        p.hand = [];
        p.discardPile = [];
        p.exhaustPile = [];
        p.block = 0;
        p.statuses = {};
        this.lastEvents = [];
        p.garden = [];
        if (p.permanentStrength) p.addStatus('strength', p.permanentStrength);
        const char = window.CHARACTER_DB[p.characterId];
        if (char && char.onCombatStart) char.onCombatStart(this);
        this.relicHook('onCombatStart');
        const pet = window.petFor ? window.petFor(p.characterId) : null;
        if (pet && pet.onCombatStart) pet.onCombatStart(this.makeCtx(null));
        this.enemies.forEach((e) => e.chooseMove(this));
        this.startPlayerTurn();
        if (pet && pet.onFirstTurn) { pet.onFirstTurn(this.makeCtx(null)); this.onUpdate(); }
    }

    startPlayerTurn() {
        const p = this.player;
        this.turn = 'player';
        this.turnState = { cardsPlayed: 0, attacksPlayed: 0 };
        this.enemies.forEach((e) => { e._capLost = 0; });
        if (!p.getStatus('barricade')) p.block = 0;
        p.energy = p.maxEnergy;
        const fire = p.getStatus('inner_fire');
        if (fire) {
            const lost = p.loseHp(1);
            if (lost) this.pushEvent('damage', p, lost, { poison: true });
            this.applyStatus(p, 'strength', fire);
        }
        const sticky = p.getStatus('sticky');
        if (sticky) delete p.statuses.sticky;
        this.drawCards(Math.max(0, 5 + this.relicSum('drawBonus') - sticky));
        if (p.getStatus('seeds')) this.addCards('semilla', p.getStatus('seeds'), 'hand');
        if (p.garden && p.garden.length) this.growGarden(1);
        for (let k = 0; k < p.getStatus('vine'); k++) this.plant('agria');
        this.relicHook('onTurnStart');
        this.onUpdate();
    }

    drawCards(n) {
        const p = this.player;
        for (let i = 0; i < n; i++) {
            if (p.drawPile.length === 0) {
                if (p.discardPile.length === 0) return;
                // se acabó la pila de robo: se baraja el descarte dentro
                p.drawPile = shuffle([...p.discardPile]);
                p.discardPile = [];
                this.lastEvents.push({ type: 'reshuffle', target: 'player', amount: p.drawPile.length });
            }
            const cardId = p.drawPile.pop();
            if (p.hand.length >= HAND_LIMIT) p.discardPile.push(cardId);
            else p.hand.push(cardId);
        }
    }

    addCards(cardId, n, where) {
        const p = this.player;
        for (let i = 0; i < n; i++) {
            if (where === 'hand' && p.hand.length < HAND_LIMIT) p.hand.push(cardId);
            else if (where === 'draw') p.drawPile.splice(Math.floor(Math.random() * (p.drawPile.length + 1)), 0, cardId);
            else p.discardPile.push(cardId);
        }
        this.pushEvent('addcard', p, n, { cardId, where });
    }

    exhaustCard(cardId) {
        this.player.exhaustPile.push(cardId);
        this.pushEvent('exhaust', this.player, 1, { cardId });
        this.relicHook('onExhaust', window.getCard(cardId));
    }

    // ---------- daño, cáscara, estados ----------
    // Daño final de un golpe (sin aplicarlo). También lo usa la interfaz.
    previewDamage(source, target, base) {
        let amount = base;
        if (amount > 0) amount += source.getStatus('strength') + (source.dmgBonus || 0);
        if (source === this.player) amount *= this.damageMult;
        if (source.getStatus('weak')) amount = Math.floor(amount * 0.75);
        if (target.getStatus('vulnerable')) amount = Math.floor(amount * 1.5);
        if (target === this.player && this.hasRelic('nuez_dura') && amount > 0) amount -= 1;
        // Intangible: el golpe no hace daño (dealDamage gasta 1 punto por golpe)
        if (target.getStatus('ghost') && amount > 0) amount = 0;
        // Gelatina: cada golpe hace solo 1 de daño
        if (target.getStatus('jelly') && amount > 1) amount = 1;
        return Math.max(0, amount);
    }

    dealDamage(source, target, base) {
        if (!target || !target.isAlive() || !source.isAlive()) return { damage: 0, hpLoss: 0, killed: false };
        const ghost = base > 0 && target.getStatus('ghost') > 0;
        const amount = this.previewDamage(source, target, base);
        if (ghost) target.addStatus('ghost', -1);
        let hpLoss = target.takeDamage(amount);
        // Coraza Dura: los golpes no le quitan más de N PV por turno
        const cap = target.getStatus('cap');
        if (cap && hpLoss > 0) {
            const already = target._capLost || 0;
            const excess = Math.max(0, already + hpLoss - cap);
            if (excess) { target.hp += excess; hpLoss -= excess; }
            target._capLost = already + hpLoss;
        }
        this.pushEvent('damage', target, amount, { blocked: amount - hpLoss, from: this.targetKey(source), capped: cap && target._capLost >= cap });
        if (hpLoss > 0 && target.getStatus('plated')) target.addStatus('plated', -1);
        // Enroscado: la primera vez que le quitan vida se hace bolita
        if (hpLoss > 0 && target.isAlive() && target.getStatus('curl')) {
            const curl = target.getStatus('curl');
            delete target.statuses.curl;
            this.gainBlock(target, curl, false);
        }
        // Pulpa Blanda: cada golpe que le quita vida le da cáscara
        if (hpLoss > 0 && target.isAlive() && target.getStatus('malleable')) this.gainBlock(target, target.getStatus('malleable'), false);
        // Divisible: a media vida se parte en dos
        if (target !== this.player && target.isAlive() && target.getStatus('split') && target.hp <= target.maxHp / 2) this.splitEnemy(target);
        if (target === this.player && hpLoss > 0) this.relicHook('onHpLoss', hpLoss);

        // pinchos: quien golpea se pincha
        const thorns = target.getStatus('thorns');
        if (thorns && source !== target && source.isAlive()) {
            const lost = source.takeDamage(thorns);
            this.pushEvent('damage', source, thorns, { thorns: true, blocked: thorns - lost });
            if (!source.isAlive() && source !== this.player) this.onEnemyDeath(source);
        }
        // habilidad del personaje (Kiwi refleja daño)
        if (target === this.player && source !== this.player && hpLoss > 0 && source.isAlive()) {
            const char = window.CHARACTER_DB[this.player.characterId];
            if (char && char.onPlayerDamaged) {
                const before = source.hp;
                char.onPlayerDamaged(this.player, source, hpLoss);
                if (source.hp < before) this.pushEvent('damage', source, before - source.hp, { thorns: true });
                if (!source.isAlive()) this.onEnemyDeath(source);
            }
        }
        if (!target.isAlive() && target !== this.player) this.onEnemyDeath(target);
        const killed = !target.isAlive() && !target._split;
        return { damage: amount, hpLoss, killed };
    }

    gainBlock(entity, base, fromCard) {
        let amount = base;
        if (fromCard) amount += entity.getStatus('dexterity');
        if (entity.getStatus('frail')) amount = Math.floor(amount * 0.75);
        if (entity === this.player) {
            const char = window.CHARACTER_DB[this.player.characterId];
            if (char && char.onGainBlock && fromCard) amount = char.onGainBlock(this.player, amount);
        }
        amount = Math.max(0, amount);
        entity.addBlock(amount);
        this.pushEvent('block', entity, amount);
    }

    applyStatus(entity, id, amount, fromPlayer) {
        if (!entity || !entity.isAlive() || !amount) return;
        if (id === 'frozen' && entity.getStatus('frozen')) return; // no se acumula
        const info = window.STATUS_DB[id];
        // Espejo: el primer perjuicio que le mandas en el turno te lo devuelve
        if (fromPlayer && info && info.kind === 'debuff' && amount > 0 && entity.getStatus('reflect')) {
            entity.addStatus('reflect', -1);
            this.pushEvent('negate', entity, 0, { statusId: id });
            this.applyStatus(this.player, id, amount);
            return;
        }
        if (info && info.kind === 'debuff' && amount > 0 && entity.getStatus('wax')) {
            entity.addStatus('wax', -1);
            this.pushEvent('negate', entity, 0, { statusId: id });
            return;
        }
        entity.addStatus(id, amount);
        this.pushEvent('status', entity, amount, { statusId: id });
    }

    healEntity(entity, amount) {
        const healed = entity.heal(amount);
        if (healed > 0) this.pushEvent('heal', entity, healed);
        return healed;
    }

    // ---------- Viñedo (la Uva) ----------
    // Planta un brote. Si los surcos están llenos, primero se cosecha el más viejo.
    plant(type) {
        const p = this.player;
        const def = window.SPROUT_DB[type];
        if (!def || this.ended) return;
        if (!p.garden) p.garden = [];
        if (p.garden.length >= window.GARDEN_SIZE) this.harvest(p.garden.shift());
        p.garden.push({ type, timer: def.time, fresh: true });
        this.pushEvent('plant', p, 0, { sprout: type });
    }
    // Todos los brotes crecen n; los que llegan a 0 se cosechan
    growGarden(n) {
        const p = this.player;
        if (!p.garden) return;
        p.garden.forEach((s) => { s.timer -= n; });
        const ready = p.garden.filter((s) => s.timer <= 0);
        p.garden = p.garden.filter((s) => s.timer > 0);
        ready.forEach((s) => this.harvest(s));
    }
    harvestAll() {
        const p = this.player;
        const all = p.garden || [];
        p.garden = [];
        all.forEach((s) => this.harvest(s));
    }
    harvest(sprout) {
        const def = window.SPROUT_DB[sprout.type];
        if (!def || this.ended) return;
        this.pushEvent('harvest', this.player, 0, { sprout: sprout.type });
        def.harvest(this.makeCtx(null));
        const fertile = this.player.getStatus('fertile');
        if (fertile) this.gainBlock(this.player, fertile, false);
        this.checkEnd();
    }

    onEnemyDeath(enemy) {
        if (enemy._deathHandled) return;
        // Rebrote: la primera vez revive con la mitad de su vida
        if (enemy.getStatus('regrow')) {
            delete enemy.statuses.regrow;
            ['poison', 'weak', 'vulnerable', 'frail', 'frozen'].forEach((s) => delete enemy.statuses[s]);
            enemy.hp = Math.max(1, Math.floor(enemy.maxHp / 2));
            enemy.block = 0;
            this.pushEvent('revive', enemy, enemy.hp);
            return;
        }
        enemy._deathHandled = true;
        const tier = enemy.def.tier;
        this.xpGained += tier === 'boss' ? 60 : tier === 'elite' ? 25 : enemy.getStatus('minion') ? 3 : 8;
        const spores = enemy.getStatus('spores');
        if (spores && !enemy._fled) this.applyStatus(this.player, 'vulnerable', spores);
        // si muere un líder, sus esbirros huyen
        if (enemy.def.leader) {
            this.aliveEnemies().forEach((e) => {
                if (!e.getStatus('minion')) return;
                e._fled = true;
                e._deathHandled = true;
                e.hp = 0;
                this.pushEvent('flee', e, 0);
            });
        }
        if (enemy.stolenGold) {
            this.player.gold += enemy.stolenGold;
            this.pushEvent('gold', this.player, enemy.stolenGold);
            enemy.stolenGold = 0;
        }
        if (enemy.def.onDeath) enemy.def.onDeath(enemy, this.makeCtx(null));
        this.relicHook('onEnemyDeath', enemy);
    }

    // Se parte en dos: desaparece y deja dos de def.splitInto con su vida actual
    splitEnemy(enemy) {
        const hp = enemy.hp;
        enemy.hp = 0;
        enemy._deathHandled = true;
        enemy._split = true;
        this.pushEvent('split', enemy, 0);
        for (let k = 0; k < 2; k++) this.summon(enemy.def.splitInto, hp);
    }

    // Invoca un enemigo nuevo en un hueco libre (máximo 3 vivos).
    // hp: vida fija (para los que salen de una división)
    summon(defId, hp) {
        const def = window.ENEMY_DB[defId];
        if (!def || this.aliveEnemies().length >= 3) return null;
        const e = new EnemyInstance(def, this.mods);
        if (hp) { e.hp = hp; e.maxHp = hp; }
        let idx = this.enemies.findIndex((x) => !x.isAlive());
        if (idx >= 0) this.enemies[idx] = e;
        else if (this.enemies.length < 4) idx = this.enemies.push(e) - 1;
        else return null;
        e.chooseMove(this);
        this.pushEvent('summon', e, 0);
        return e;
    }

    makeCtx(card) {
        const self = this, P = this.player;
        const ctx = {
            combat: this,
            player: P,
            card,
            enemy: this.enemy,
            enemies: this.aliveEnemies(),
            cardsPlayed: this.turnState.cardsPlayed,
            attack(n, target) { return self.dealDamage(P, target || ctx.enemy, n); },
            attackAll(n) { self.aliveEnemies().forEach((e) => self.dealDamage(P, e, n)); },
            attackRandom(n) {
                const alive = self.aliveEnemies();
                if (!alive.length) return { hpLoss: 0, killed: false };
                return self.dealDamage(P, alive[Math.floor(Math.random() * alive.length)], n);
            },
            block(n) { self.gainBlock(P, n, true); },
            apply(target, id, n) { self.applyStatus(target, id, n, true); },
            applyAll(id, n) { self.aliveEnemies().forEach((e) => self.applyStatus(e, id, n, true)); },
            buff(id, n) { self.applyStatus(P, id, n); },
            draw(n) { self.drawCards(n); },
            gainEnergy(n) { P.energy += n; },
            heal(n) { return self.healEntity(P, n); },
            loseHp(n) {
                const lost = P.loseHp(n);
                if (lost) { self.pushEvent('damage', P, lost, { poison: true }); self.relicHook('onHpLoss', lost); }
            },
            gainMaxHp(n) { P.maxHp += n; P.hp += n; self.pushEvent('heal', P, n, { maxHp: true }); },
            addToHand(id, n) { self.addCards(id, n || 1, 'hand'); },
            addToDiscard(id, n) { self.addCards(id, n || 1, 'discard'); },
            exhaustRandom(n) {
                let done = 0;
                for (let i = 0; i < n && P.hand.length; i++) {
                    const [id] = P.hand.splice(Math.floor(Math.random() * P.hand.length), 1);
                    self.exhaustCard(id);
                    done++;
                }
                return done;
            },
            summon(defId) { return self.summon(defId); },
            plant(type) { self.plant(type); },
            grow(n) { self.growGarden(n); },
            harvestAll() { self.harvestAll(); },
            gardenSize() { return (P.garden || []).length; },
            // compatibilidad con cartas viejas
            dealDamage(src, target, base) { return self.dealDamage(src, target, base).damage; },
            addBlock(entity, n) { self.gainBlock(entity, n, entity === P); },
            addStatus(entity, id, n) { self.applyStatus(entity, id, n, true); }
        };
        return ctx;
    }

    // ---------- semillas (objetos de un solo uso) ----------
    useSeed(seedId, targetIndex) {
        const seed = window.SEED_DB[seedId];
        if (!seed || this.ended || this.turn !== 'player') return false;
        this.lastEvents = [];
        if (targetIndex != null && this.enemies[targetIndex]) this.target = this.enemies[targetIndex];
        this.pushEvent('seed', this.player, 0, { seedId });
        seed.use(this.makeCtx(null));
        this.checkEnd();
        this.onUpdate();
        return true;
    }

    // ---------- jugar cartas ----------
    canPlay(cardId) {
        const card = window.getCard(cardId);
        return !!card && !card.unplayable && this.player.energy >= card.cost;
    }

    // targetIndex: índice en this.enemies del enemigo al que se lanzó la carta
    playCard(handIndex, targetIndex) {
        if (this.ended || this.turn !== 'player') return;
        const p = this.player;
        const cardId = p.hand[handIndex];
        const card = window.getCard(cardId);
        if (!card || card.unplayable) return;
        if (p.energy < card.cost) { this.onUpdate(); return; }
        this.lastEvents = [];
        p.energy -= card.cost;
        p.hand.splice(handIndex, 1);
        if (targetIndex != null && this.enemies[targetIndex]) this.target = this.enemies[targetIndex];

        // Frasco de Almíbar: el primer ataque del combate pega doble
        const jar = this.relicState.frasco_almibar;
        if (card.type === 'attack' && this.hasRelic('frasco_almibar') && !(jar && jar.used)) {
            this.damageMult = 2;
            this.relicState.frasco_almibar = { used: true };
            this.pushEvent('relic', p, 0, { relicId: 'frasco_almibar' });
        }
        const ctx = this.makeCtx(card);
        const target = ctx.enemy;
        card.effect(ctx);
        this.damageMult = 1;

        if (card.type === 'attack' && p.getStatus('noble_rot') && target && target.isAlive() && card.target !== 'none') {
            this.applyStatus(target, 'poison', p.getStatus('noble_rot'), true);
        }
        this.turnState.cardsPlayed++;
        if (card.type === 'attack') this.turnState.attacksPlayed++;
        if (card.type !== 'curse' && card.type !== 'status') this.lastPlayed = cardId;

        if (card.type === 'power') { /* queda activo: no va a ninguna pila */ }
        else if (card.exhaust) this.exhaustCard(cardId);
        else p.discardPile.push(cardId);

        this.relicHook('onCardPlayed', card);
        this.enemyReactions(card);
        this.checkEnd();
        this.onUpdate();
    }

    // Lo que hacen los enemigos cuando juegas una carta
    enemyReactions(card) {
        const p = this.player;
        this.aliveEnemies().forEach((e) => {
            // Enfado: tus habilidades lo enojan
            if (card.type === 'skill' && e.getStatus('enrage')) this.applyStatus(e, 'strength', e.getStatus('enrage'));
            // Latido: cada carta te cuesta vida
            const beat = e.getStatus('beat');
            if (beat && p.isAlive()) {
                const lost = p.loseHp(beat);
                if (lost) { this.pushEvent('damage', p, lost, { poison: true }); this.relicHook('onHpLoss', lost); }
            }
            // Temporizador: cuenta tus cartas y al llegar a 0 se enfurece
            // (nunca te quita el turno: siempre decides tú cuándo terminarlo)
            const clock = e.getStatus('clock');
            if (clock) {
                if (clock <= 1) {
                    e.statuses.clock = e.def.clockEvery || 12;
                    this.applyStatus(e, 'strength', 2);
                    this.applyStatus(p, 'weak', 1);
                    this.pushEvent('clock', e, 0);
                } else e.statuses.clock = clock - 1;
            }
        });
    }

    // ---------- estados al final de un turno ----------
    endOfTurnStatuses(entity) {
        if (!entity.isAlive()) return;
        const poison = entity.getStatus('poison');
        if (poison) {
            const lost = entity.loseHp(poison);
            this.pushEvent('damage', entity, lost, { poison: true });
            entity.addStatus('poison', -1);
            if (entity === this.player && lost) this.relicHook('onHpLoss', lost);
            if (!entity.isAlive()) { if (entity !== this.player) this.onEnemyDeath(entity); return; }
        }
        const regen = entity.getStatus('regen');
        if (regen) { this.healEntity(entity, regen); entity.addStatus('regen', -1); }
        const ritual = entity.getStatus('ritual');
        if (ritual) this.applyStatus(entity, 'strength', ritual);
        const plated = entity.getStatus('plated');
        if (plated) this.gainBlock(entity, plated, false);
        ['weak', 'vulnerable', 'frail', 'jelly'].forEach((s) => {
            if (entity.statuses[s] > 0) entity.addStatus(s, -1);
        });
        // Mecha: cuenta regresiva; al llegar a 0 explota contra el jugador
        const fuse = entity.getStatus('fuse');
        if (fuse && entity !== this.player) {
            if (fuse <= 1) {
                delete entity.statuses.fuse;
                this.pushEvent('explode', entity, entity.def.explode || 25);
                this.dealDamage(entity, this.player, entity.def.explode || 25);
                entity.hp = 0;
                this.onEnemyDeath(entity);
            } else entity.addStatus('fuse', -1);
        }
    }

    endPlayerTurn() {
        if (this.ended || this.turn !== 'player') return;
        const p = this.player;
        this.lastEvents = [];
        // maldiciones que castigan si siguen en la mano
        p.hand.forEach((id) => {
            const card = window.getCard(id);
            if (card && card.endTurnDamage) {
                const lost = p.loseHp(card.endTurnDamage);
                this.pushEvent('damage', p, lost, { poison: true });
            }
        });
        // Efímeras: si siguen en la mano, se consumen
        p.hand = p.hand.filter((id) => {
            const card = window.getCard(id);
            if (card && card.ethereal) { this.exhaustCard(id); return false; }
            return true;
        });
        this.relicHook('onTurnEnd');
        const flex = p.getStatus('flex');
        if (flex) { p.addStatus('strength', -flex); delete p.statuses.flex; }
        // lo que se conserva en la mano
        const keep = [];
        const rest = [];
        p.hand.forEach((id) => ((window.getCard(id) || {}).retain ? keep : rest).push(id));
        if (this.hasRelic('canasta_tejida') && rest.length) {
            // la Canasta guarda la carta jugable más cara
            let best = -1;
            rest.forEach((id, i) => {
                const c = window.getCard(id);
                if (c && !c.unplayable && (best < 0 || c.cost > window.getCard(rest[best]).cost)) best = i;
            });
            if (best >= 0) keep.push(rest.splice(best, 1)[0]);
        }
        p.discardPile.push(...rest);
        p.hand = keep;
        this.endOfTurnStatuses(p);
        this.checkEnd();
        if (!this.ended) this.turn = 'enemy';
        this.onUpdate();
    }

    // Devuelve la jugada hecha (o 'frozen' si estaba congelado)
    enemyAct(index) {
        if (this.ended || this.turn !== 'enemy') return null;
        const enemy = this.enemies[index];
        if (!enemy || !enemy.isAlive()) return null;
        enemy.block = 0;
        this.lastEvents = [];
        if (enemy.getStatus('frozen')) {
            delete enemy.statuses.frozen;
            this.pushEvent('skip', enemy, 0);
            this.onUpdate();
            return 'frozen';
        }
        const move = enemy.nextMove;
        const ctx = this.makeCtx(null);
        const P = this.player;

        if (move.block) this.gainBlock(enemy, move.block, false);
        if (move.allyBlock) this.aliveEnemies().forEach((e) => { if (e !== enemy) this.gainBlock(e, move.allyBlock, false); });
        if (move.damage) {
            const hits = move.hits || 1;
            for (let i = 0; i < hits && P.isAlive() && enemy.isAlive(); i++) {
                const r = this.dealDamage(enemy, P, move.damage);
                // Vampírico: se cura por la vida que te quitó
                if (move.drain && r.hpLoss > 0) this.healEntity(enemy, r.hpLoss);
            }
        }
        if (move.apply && P.isAlive()) Object.keys(move.apply).forEach((id) => this.applyStatus(P, id, move.apply[id]));
        if (move.self && enemy.isAlive()) Object.keys(move.self).forEach((id) => this.applyStatus(enemy, id, move.self[id]));
        if (move.allies) {
            this.aliveEnemies().forEach((e) => Object.keys(move.allies).forEach((id) => this.applyStatus(e, id, move.allies[id])));
        }
        if (move.heal && enemy.isAlive()) this.healEntity(enemy, move.heal);
        if (move.healAll) this.aliveEnemies().forEach((e) => this.healEntity(e, move.healAll));
        if (move.stealGold && enemy.isAlive()) {
            const g = Math.min(P.gold, move.stealGold);
            if (g > 0) {
                P.gold -= g;
                enemy.stolenGold += g;
                this.pushEvent('steal', P, g, { from: this.targetKey(enemy) });
            }
        }
        if (move.addCard) this.addCards(move.addCard.id, move.addCard.n || 1, move.addCard.to || 'discard');
        if (move.summon) move.summon.forEach((id) => this.summon(id));
        if (move.special) move.special(enemy, ctx);

        enemy.history.push(move.id);
        enemy.turns++;
        this.checkEnd();
        this.onUpdate();
        return move;
    }

    endEnemyTurn() {
        if (this.ended || this.turn !== 'enemy') return;
        this.lastEvents = [];
        this.aliveEnemies().forEach((e) => this.endOfTurnStatuses(e));
        this.checkEnd();
        if (!this.ended) {
            this.aliveEnemies().forEach((e) => e.chooseMove(this));
            this.turnNumber++;
            this.startPlayerTurn();
        } else {
            this.onUpdate();
        }
    }

    checkEnd() {
        if (this.ended) return;
        if (!this.player.isAlive()) {
            this.ended = true;
            this.onEnd('lose');
        } else if (this.aliveEnemies().length === 0) {
            this.ended = true;
            this.onEnd('win');
        }
    }
}

window.Combat = Combat;
