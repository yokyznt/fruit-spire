// ============================================================
// COMBAT.JS — Motor de combate con animaciones y pasivas.
// ============================================================

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

class Combat {
    constructor(player, enemyDef, onUpdate, onEnd) {
        this.player = player;
        this.enemy = new EnemyInstance(enemyDef);
        this.onUpdate = onUpdate || function () {};
        this.onEnd = onEnd || function () {};
        this.turn = 'player';
        this.turnNumber = 1;
        this.ended = false;
        this.start();
    }

    start() {
        this.player.drawPile = shuffle([...this.player.deck]);
        this.player.hand = [];
        this.player.discardPile = [];
        this.player.block = 0;
        this.player.statuses = {};
        if (this.player.permanentStrength) {
            this.player.addStatus('strength', this.player.permanentStrength);
        }
        this.player.relics.forEach((rid) => {
            const relic = window.RELIC_DB[rid];
            if (relic && relic.onCombatStart) relic.onCombatStart(this.player, this);
        });
        this.enemy.chooseMove();
        this.startPlayerTurn();
    }

    startPlayerTurn() {
        this.turn = 'player';
        this.player.block = 0;
        this.player.energy = this.player.maxEnergy;
        this.drawCards(5);
        this.player.relics.forEach((rid) => {
            const relic = window.RELIC_DB[rid];
            if (relic && relic.onPlayerTurnStart) relic.onPlayerTurnStart(this.player, this);
        });
        this.onUpdate();
    }

    drawCards(n) {
        for (let i = 0; i < n; i++) {
            if (this.player.drawPile.length === 0) {
                if (this.player.discardPile.length === 0) return;
                this.player.drawPile = shuffle([...this.player.discardPile]);
                this.player.discardPile = [];
            }
            const cardId = this.player.drawPile.pop();
            this.player.hand.push(cardId);
        }
    }

    makeCtx() {
        const self = this;
        return {
            player: this.player,
            enemy: this.enemy,
            dealDamage(source, target, base) {
                let amount = base;
                if (source.getStatus('strength')) amount += source.getStatus('strength');
                if (source.getStatus('weak')) amount = Math.floor(amount * 0.75);
                if (target.getStatus('vulnerable')) amount = Math.floor(amount * 1.5);

                // PASIVA KIWI: Reflejo de daño
                let reflected = 0;
                if (target.charId === 'kiwi') {
                    reflected = 2;
                }

                const actualDamage = target.takeDamage(amount);

                // Animación de daño
                self.animateEffect(target, amount, 'damage');

                if (reflected > 0) {
                    source.takeDamage(reflected);
                    self.animateEffect(source, reflected, 'damage');
                }

                return amount;
            },
            addBlock(entity, amount) {
                let finalAmount = amount;
                // PASIVA PLATANIN: +1 bloqueo por carta de defensa
                if (entity.charId === 'platanin') {
                    finalAmount += 1;
                }
                entity.addBlock(finalAmount);
                self.animateEffect(entity, finalAmount, 'block');
            },
            addStatus(entity, id, amount) { entity.addStatus(id, amount); },
            draw(n) { self.drawCards(n); },
            gainEnergy(n) { self.player.energy += n; },
            heal(entity, amount) {
                entity.heal(amount);
                self.animateEffect(entity, amount, 'heal');
            }
        };
    }

    animateEffect(entity, amount, type) {
        // Llamamos a una función global en game.js para manejar el DOM
        if (window.spawnFloatingNumber) {
            window.spawnFloatingNumber(entity === this.player ? 'player-sprite' : 'enemy-sprite', amount, type);
        }
        if (type === 'block' && window.spawnShieldEffect) {
            window.spawnShieldEffect(entity === this.player ? 'player-sprite' : 'enemy-sprite');
        }
    }

    playCard(handIndex) {
        if (this.ended || this.turn !== 'player') return;
        const cardId = this.player.hand[handIndex];
        const card = window.CARD_DB[cardId];
        if (!card) return;
        if (this.player.energy < card.cost) {
            this.onUpdate();
            return;
        }
        this.player.energy -= card.cost;
        this.player.hand.splice(handIndex, 1);

        const ctx = this.makeCtx();
        card.effect(ctx);

        if (card.type !== 'power') {
            this.player.discardPile.push(cardId);
        }
        this.checkEnd();
        this.onUpdate();
    }

    endPlayerTurn() {
        if (this.ended || this.turn !== 'player') return;
        this.player.discardPile.push(...this.player.hand);
        this.player.hand = [];
        this.player.tickEndOfTurnStatuses();
        this.startEnemyTurn();
    }

    startEnemyTurn() {
        this.turn = 'enemy';
        this.enemy.block = 0;
        const move = this.enemy.nextMove;
        const ctx = this.makeCtx();

        if (move.type === 'attack') {
            const hits = move.hits || 1;
            for (let i = 0; i < hits; i++) ctx.dealDamage(this.enemy, this.player, move.value);
        } else if (move.type === 'poison_attack') {
            ctx.dealDamage(this.enemy, this.player, move.value);
            this.player.addStatus('poison', move.poison || 2);
        } else if (move.type === 'defend') {
            this.enemy.addBlock(move.value);
        } else if (move.type === 'buff') {
            this.enemy.addStatus('strength', move.value);
        } else if (move.type === 'heal') {
            this.enemy.heal(move.value);
        }

        this.enemy.tickEndOfTurnStatuses();
        this.checkEnd();
        if (!this.ended) {
            this.enemy.chooseMove();
            this.turnNumber++;
            this.startPlayerTurn();
        } else {
            this.onUpdate();
        }
    }

    checkEnd() {
        if (!this.enemy.isAlive()) {
            this.ended = true;
            // PASIVA MANZANA: Cura 5 PV al ganar
            if (this.player.charId === 'manzana') {
                this.player.heal(5);
            }
            this.onEnd('win');
        } else if (!this.player.isAlive()) {
            this.ended = true;
            this.onEnd('lose');
        }
    }
}

window.Combat = Combat;
