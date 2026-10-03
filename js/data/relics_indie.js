// ============================================================
// RELICS_INDIE.JS — Objetos con guiños a otros videojuegos indie y roguelikes
// (Balatro, The Binding of Isaac, Hades, Undertale, Slay the Spire, Hollow
// Knight, Dead Cells, Terraria, Celeste, Minecraft, Vampire Survivors…).
// Mismas reglas que js/data/relics.js. El campo `ref` es el guiño y se
// muestra en el tooltip del objeto.
// ============================================================

(function () {
    const rnd = (n) => Math.floor(Math.random() * n);
    const relic = (def) => registerRelic(def);

    // ---------- comunes ----------
    relic({
        id: 'fichas_casino', name: 'Fichas de Casino', icon: '🎰', tier: 'common', ref: 'Guiño a Balatro',
        description: 'Al ganar un combate, ganas 6 de oro extra.',
        onCombatEnd: (player) => { player.gold += 6; }
    });
    relic({
        id: 'estrella_guardado', name: 'Estrella de Guardado', icon: '⭐', tier: 'common', ref: 'Guiño a Undertale',
        description: 'Descansar cura 6 ❤️ extra.',
        onRest: () => 6
    });
    relic({
        id: 'penique_suerte', name: 'Penique de la Suerte', icon: '🪙', tier: 'common', ref: 'Guiño a The Binding of Isaac',
        description: 'Al ganar un combate, 30% de probabilidad de encontrar 20 de oro.',
        onCombatEnd: (player) => { if (Math.random() < 0.3) player.gold += 20; }
    });
    relic({
        id: 'nectar_olimpo', name: 'Néctar del Olimpo', icon: '🍯', tier: 'common', ref: 'Guiño a Hades',
        description: 'Al empezar cada combate, recuperas 2 ❤️.',
        onCombatStart: (ctx) => { ctx.heal(2); ctx.flash(); }
    });
    relic({
        id: 'cuchillo_juguete', name: 'Cuchillo de Juguete', icon: '🔪', tier: 'common', ref: 'Guiño a Undertale',
        description: 'Empiezas cada combate con 1 de Madurez.',
        onCombatStart: (ctx) => { ctx.buff('strength', 1); ctx.flash(); }
    });
    relic({
        id: 'cana_pescar', name: 'Caña de Pescar', icon: '🎣', tier: 'common', ref: 'Guiño a Stardew Valley',
        description: 'En el primer turno de cada combate, robas 1 carta extra.',
        onTurnStart: (ctx) => { if (ctx.combat.turnNumber === 1) { ctx.draw(1); ctx.flash(); } }
    });
    relic({
        id: 'corazon_alma', name: 'Corazón de Alma', icon: '🩵', tier: 'common', ref: 'Guiño a The Binding of Isaac',
        description: 'Si empiezas un combate con la mitad de vida o menos, ganas 8 de cáscara.',
        onCombatStart: (ctx) => { if (ctx.player.hp <= ctx.player.maxHp / 2) { ctx.combat.gainBlock(ctx.player, 8, false); ctx.flash(); } }
    });
    relic({
        id: 'pico_diamante', name: 'Pico de Diamante', icon: '⛏️', tier: 'common', ref: 'Guiño a Minecraft',
        description: 'Cada vez que se consume una carta, ganas 1 de oro.',
        onExhaust: (ctx) => { ctx.player.gold += 1; ctx.flash(); }
    });

    // ---------- poco comunes ----------
    relic({
        id: 'comodin_descarado', name: 'Comodín Descarado', icon: '🃏', tier: 'uncommon', ref: 'Guiño a Balatro',
        description: 'Empiezas cada combate con 1 de Madurez por cada 8 cartas de tu mazo (máx. 2).',
        onCombatStart: (ctx) => { const n = Math.min(2, Math.floor(ctx.player.deck.length / 8)); if (n) { ctx.buff('strength', n); ctx.flash(); } }
    });
    relic({
        id: 'alcancia_interes', name: 'Alcancía de Interés', icon: '🐷', tier: 'uncommon', ref: 'Guiño a Balatro',
        description: 'Al ganar un combate, ganas 1 de oro por cada 10 que tengas (máx. 3).',
        onCombatEnd: (player) => { player.gold += Math.min(3, Math.floor(player.gold / 10)); }
    });
    relic({
        id: 'tarot_luna', name: 'Carta de Tarot: La Luna', icon: '🌙', tier: 'uncommon', ref: 'Guiño a Balatro',
        description: 'Al empezar cada combate, un enemigo al azar recibe 2 de Marchitez y 1 de Magulladura.',
        onCombatStart: (ctx) => {
            const es = ctx.enemies;
            if (!es.length) return;
            const e = es[rnd(es.length)];
            ctx.apply(e, 'weak', 2);
            ctx.apply(e, 'vulnerable', 1);
            ctx.flash();
        }
    });
    relic({
        id: 'kunai_cascara', name: 'Kunai de Cáscara', icon: '🗡️', tier: 'uncommon', ref: 'Guiño a Slay the Spire',
        description: 'Cada 3 ataques en un turno, ganas 1 de Firmeza.',
        onTurnStart: (ctx) => { ctx.state.attacks = 0; },
        onCardPlayed: (ctx, card) => {
            if (card.type !== 'attack') return;
            ctx.state.attacks = (ctx.state.attacks || 0) + 1;
            if (ctx.state.attacks % 3 === 0) { ctx.buff('dexterity', 1); ctx.flash(); }
        }
    });
    relic({
        id: 'abanico_ornamental', name: 'Abanico Ornamental', icon: '🪭', tier: 'uncommon', ref: 'Guiño a Slay the Spire',
        description: 'Cada 3 ataques en un turno, ganas 4 de cáscara.',
        onTurnStart: (ctx) => { ctx.state.fan = 0; },
        onCardPlayed: (ctx, card) => {
            if (card.type !== 'attack') return;
            ctx.state.fan = (ctx.state.fan || 0) + 1;
            if (ctx.state.fan % 3 === 0) { ctx.combat.gainBlock(ctx.player, 4, false); ctx.flash(); }
        }
    });
    relic({
        id: 'pentagrama', name: 'Pentagrama de Fruta', icon: '⛧', tier: 'uncommon', ref: 'Guiño a The Binding of Isaac',
        description: 'Si no perdiste vida desde tu último turno, ganas 1 de Madurez al terminarlo (máx. 3 por combate).',
        onHpLoss: (ctx) => { ctx.state.hurt = true; },
        onTurnEnd: (ctx) => {
            if (!ctx.state.hurt && (ctx.state.gained || 0) < 3) { ctx.buff('strength', 1); ctx.state.gained = (ctx.state.gained || 0) + 1; ctx.flash(); }
            ctx.state.hurt = false;
        }
    });
    relic({
        id: 'frasco_salud', name: 'Frasco de Salud', icon: '🧪', tier: 'uncommon', ref: 'Guiño a Dead Cells',
        description: 'Una vez por combate, al bajar a un tercio de tu vida o menos, recuperas 8 ❤️.',
        onHpLoss: (ctx) => {
            if (ctx.state.used || ctx.player.hp <= 0 || ctx.player.hp > ctx.player.maxHp / 3) return;
            ctx.state.used = true;
            ctx.heal(8);
            ctx.flash();
        }
    });
    relic({
        id: 'mascara_extra', name: 'Máscara Extra', icon: '🎭', tier: 'uncommon', ref: 'Guiño a Hollow Knight',
        description: '+6 de vida máxima. Empiezas cada combate con 3 de cáscara.',
        onPickup: (player) => { player.maxHp += 6; player.hp += 6; },
        onCombatStart: (ctx) => { ctx.combat.gainBlock(ctx.player, 3, false); ctx.flash(); }
    });
    relic({
        id: 'cristal_vida', name: 'Cristal de Vida', icon: '💎', tier: 'uncommon', ref: 'Guiño a Terraria',
        description: '+10 de vida máxima.',
        onPickup: (player) => { player.maxHp += 10; player.hp += 10; }
    });
    relic({
        id: 'aura_ajo', name: 'Aura de Ajo', icon: '🧄', tier: 'uncommon', ref: 'Guiño a Vampire Survivors',
        description: 'Al empezar cada turno, todos los enemigos reciben 2 de daño.',
        onTurnStart: (ctx) => { ctx.attackAll(2); ctx.combat.checkEnd(); ctx.flash(); }
    });
    relic({
        id: 'vela_determinacion', name: 'Vela de la Determinación', icon: '🕯️', tier: 'uncommon', ref: 'Guiño a Undertale',
        description: 'Ganas 1 de energía extra en el primer turno de cada combate.',
        onTurnStart: (ctx) => { if (ctx.combat.turnNumber === 1) { ctx.gainEnergy(1); ctx.flash(); } }
    });
    relic({
        id: 'fresa_dorada', name: 'Fresa Dorada', icon: '🍓', tier: 'uncommon', ref: 'Guiño a Celeste',
        description: 'La primera vez de cada combate que juegas 4 cartas en un turno, ganas 1 de energía.',
        onCardPlayed: (ctx) => {
            if (ctx.state.done || ctx.combat.turnState.cardsPlayed < 4) return;
            ctx.state.done = true;
            ctx.gainEnergy(1);
            ctx.flash();
        }
    });

    // ---------- raras ----------
    relic({
        id: 'lagrima_sagrada', name: 'Lágrima Sagrada', icon: '😭', tier: 'rare', ref: 'Guiño a The Binding of Isaac',
        description: 'Al empezar cada turno, disparas una lágrima: 3 de daño a un enemigo al azar.',
        onTurnStart: (ctx) => { ctx.attackRandom(3); ctx.combat.checkEnd(); ctx.flash(); }
    });
    relic({
        id: 'mano_color', name: 'Mano de Color', icon: '🎴', tier: 'rare', ref: 'Guiño a Balatro',
        description: 'Cada vez que juegas 3 cartas del mismo tipo seguidas (ataque, habilidad o poder), robas 1 carta.',
        onTurnStart: (ctx) => { ctx.state.streak = 0; ctx.state.last = null; },
        onCardPlayed: (ctx, card) => {
            if (card.type === ctx.state.last) ctx.state.streak++;
            else { ctx.state.last = card.type; ctx.state.streak = 1; }
            if (ctx.state.streak >= 3) { ctx.draw(1); ctx.flash(); ctx.state.streak = 0; ctx.state.last = null; }
        }
    });
    relic({
        id: 'd6_bolsillo', name: 'D6 de Bolsillo', icon: '🎲', tier: 'rare', ref: 'Guiño a The Binding of Isaac',
        description: 'Al empezar el 2.º turno de cada combate, cambias toda tu mano por 5 cartas nuevas.',
        onTurnStart: (ctx) => {
            if (ctx.combat.turnNumber !== 2 || ctx.state.used) return;
            ctx.state.used = true;
            const p = ctx.player;
            p.discardPile.push(...p.hand);
            p.hand = [];
            ctx.draw(5);
            ctx.flash();
        }
    });
    relic({
        id: 'desafio_muerte', name: 'Desafío a la Muerte', icon: '💀', tier: 'rare', ref: 'Guiño a Hades',
        description: 'Una vez por partida, si te van a dejar sin vida, te quedas con 1 ❤️ y ganas 12 de cáscara.',
        onHpLoss: (ctx) => {
            if (ctx.player.hp > 0 || ctx.persist.used) return;
            ctx.persist.used = true;
            ctx.player.hp = 1;
            ctx.combat.gainBlock(ctx.player, 12, false);
            ctx.flash();
        }
    });

    // ---------- de jefe (con truco) ----------
    relic({
        id: 'corazon_sacrificio', name: 'Corazón del Sacrificio', icon: '🫀', tier: 'boss', ref: 'Guiño a The Binding of Isaac',
        description: '+2 de energía en el primer turno de cada combate, pero pierdes 5 ❤️ al empezar cada combate.',
        onCombatStart: (ctx) => { const lose = Math.min(5, ctx.player.hp - 1); if (lose > 0) ctx.loseHp(lose); },
        onTurnStart: (ctx) => { if (ctx.combat.turnNumber === 1) { ctx.gainEnergy(2); ctx.flash(); } }
    });
    relic({
        id: 'ojo_cthulhu', name: 'Ojo Sospechoso', icon: '👁️‍🗨️', tier: 'boss', ref: 'Guiño a Terraria',
        description: 'Robas 2 cartas extra cada turno, pero tienes 1 de energía menos.',
        drawBonus: 2,
        onPickup: (player) => { player.maxEnergy = Math.max(1, player.maxEnergy - 1); }
    });
    relic({
        id: 'azufre_infernal', name: 'Azufre Infernal', icon: '🌋', tier: 'boss', ref: 'Guiño a Cuphead y The Binding of Isaac',
        description: 'Empiezas cada combate con 2 de Madurez, pero los enemigos también empiezan con 1 de Madurez.',
        onCombatStart: (ctx) => { ctx.buff('strength', 2); ctx.applyAll('strength', 1); ctx.flash(); }
    });
})();
