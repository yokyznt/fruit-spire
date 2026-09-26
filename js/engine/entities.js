// ============================================================
// ENTITIES.JS — Clases base de combate.
// ============================================================

class Entity {
    constructor(name, hp, maxHp) {
        this.name = name;
        this.hp = hp;
        this.maxHp = maxHp;
        this.block = 0;
        this.statuses = {}; // strength, weak, vulnerable, poison
    }
    isAlive() { return this.hp > 0; }
    getStatus(id) { return this.statuses[id] || 0; }
    addStatus(id, amount) {
        this.statuses[id] = (this.statuses[id] || 0) + amount;
        if (this.statuses[id] <= 0) delete this.statuses[id];
    }
    addBlock(amount) { this.block += amount; }
    heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

    takeDamage(amount) {
        let remaining = amount;
        if (this.block > 0) {
            const absorbed = Math.min(this.block, remaining);
            this.block -= absorbed;
            remaining -= absorbed;
        }
        if (remaining > 0) this.hp = Math.max(0, this.hp - remaining);
        return remaining;
    }

    tickEndOfTurnStatuses() {
        if (this.statuses.poison > 0) {
            this.hp = Math.max(0, this.hp - this.statuses.poison);
        }
        ['weak', 'vulnerable'].forEach((s) => {
            if (this.statuses[s] > 0) {
                this.statuses[s]--;
                if (this.statuses[s] <= 0) delete this.statuses[s];
            }
        });
    }
}

class Player extends Entity {
    constructor() {
        super('Fruta', 70, 70);
        this.charId = 'manzana'; // Default
        this.gold = 50;
        this.maxEnergy = 3;
        this.energy = 3;
        this.relics = [];
        this.deck = [];
        this.drawPile = [];
        this.hand = [];
        this.discardPile = [];
        this.permanentStrength = 0;
    }
}

class EnemyInstance extends Entity {
    constructor(def) {
        const hp = Math.floor(Math.random() * (def.hpMax - def.hpMin + 1)) + def.hpMin;
        super(def.name, hp, hp);
        this.defId = def.id;
        this.def = def;
        this.nextMove = null;
    }
    chooseMove() {
        const moves = this.def.moves;
        const totalWeight = moves.reduce((s, m) => s + m.weight, 0);
        let r = Math.random() * totalWeight;
        for (const m of moves) {
            if (r < m.weight) { this.nextMove = m; return m; }
            r -= m.weight;
        }
        this.nextMove = moves[0];
        return moves[0];
    }
}

window.Entity = Entity;
window.Player = Player;
window.EnemyInstance = EnemyInstance;
