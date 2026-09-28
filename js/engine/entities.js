// ============================================================
// ENTITIES.JS — Clases base de combate. Sin dependencias de HTML,
// así que se pueden reutilizar aunque cambie toda la interfaz.
// Los efectos de cada estado (putrefacción, corteza, etc.) se
// aplican en js/engine/combat.js.
// ============================================================

class Entity {
    constructor(name, hp, maxHp) {
        this.name = name;
        this.hp = hp;
        this.maxHp = maxHp;
        this.block = 0;      // "cáscara"
        this.statuses = {};  // ids de js/data/statuses.js
    }
    isAlive() { return this.hp > 0; }
    getStatus(id) { return this.statuses[id] || 0; }
    addStatus(id, amount) {
        this.statuses[id] = (this.statuses[id] || 0) + amount;
        if (this.statuses[id] <= 0) delete this.statuses[id];
    }
    addBlock(amount) { this.block += Math.max(0, amount); }
    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - before;
    }
    // Devuelve cuántos PV se perdieron de verdad (después de la cáscara)
    takeDamage(amount) {
        let remaining = amount;
        if (this.block > 0) {
            const absorbed = Math.min(this.block, remaining);
            this.block -= absorbed;
            remaining -= absorbed;
        }
        const before = this.hp;
        if (remaining > 0) this.hp = Math.max(0, this.hp - remaining);
        return before - this.hp;
    }
    // pérdida de vida directa (putrefacción, cartas de sacrificio): ignora la cáscara
    loseHp(amount) {
        const before = this.hp;
        this.hp = Math.max(0, this.hp - amount);
        return before - this.hp;
    }
}

class Player extends Entity {
    constructor() {
        super('Manzano', 70, 70);
        this.characterId = 'manzana';
        this.gold = 99;
        this.maxEnergy = 3;
        this.energy = 3;
        this.relics = [];
        this.relicCounters = {}; // contadores de reliquias que duran toda la partida
        this.deck = [];          // ids de todas las cartas que posee ("id+" = madurada)
        this.drawPile = [];
        this.hand = [];
        this.discardPile = [];
        this.exhaustPile = [];   // "compost": cartas consumidas en este combate
        this.permanentStrength = 0;
        this.act = 1;            // nivel (mapa) actual: 1, 2 o 3
        this.difficulty = 'madura';
        this.removals = 0;       // cuántas cartas se han quitado en tiendas (sube el precio)
        this.seeds = [null, null, null]; // bolsa de semillas (ids o null)
        this.garden = [];        // viñedo de la Uva: [{ type, timer }]
        this.hasGoldenKey = false; // Llave Dorada del nivel actual (ver Cofre Sellado)
    }
}

class EnemyInstance extends Entity {
    // mods: { hpMult, dmgBonus } según nivel y dificultad
    constructor(def, mods) {
        mods = mods || {};
        const base = Math.floor(Math.random() * (def.hpMax - def.hpMin + 1)) + def.hpMin;
        const hp = Math.max(1, Math.round(base * (mods.hpMult || 1)));
        super(def.name, hp, hp);
        this.defId = def.id;
        this.def = def;
        this.dmgBonus = mods.dmgBonus || 0;
        this.nextMove = null;
        this.history = [];       // ids de jugadas anteriores (para la IA)
        this.turns = 0;
        this.phase = 0;          // para jefes con fases
        this.stolenGold = 0;
        if (def.start) Object.keys(def.start).forEach((id) => this.addStatus(id, def.start[id]));
    }
    // Elige la siguiente jugada. Si el enemigo tiene `ai`, decide él;
    // si no, al azar por peso sin repetir la misma jugada demasiadas veces.
    chooseMove(combat) {
        const moves = this.def.moves;
        let move = null;
        if (this.def.ai) {
            const id = this.def.ai(this, combat);
            move = moves.find((m) => m.id === id) || null;
        }
        if (!move) {
            const last = this.history[this.history.length - 1];
            const last2 = this.history[this.history.length - 2];
            const pool = moves.filter((m) => {
                if (m.once && this.history.includes(m.id)) return false;
                if (m.id === last && (m.noRepeat || m.id === last2)) return false;
                return true;
            });
            const list = pool.length ? pool : moves;
            const total = list.reduce((s, m) => s + (m.weight || 1), 0);
            let r = Math.random() * total;
            move = list[list.length - 1];
            for (const m of list) {
                if (r < (m.weight || 1)) { move = m; break; }
                r -= (m.weight || 1);
            }
        }
        this.nextMove = move;
        return move;
    }
}

window.Entity = Entity;
window.Player = Player;
window.EnemyInstance = EnemyInstance;
