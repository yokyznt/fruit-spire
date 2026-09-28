// ============================================================
// ENEMIES_CASTLES.JS — Enemigos, élites y jefes de los pisos nuevos de
// los 3 castillos (ver js/data/castles.js para cómo se reparten).
// Usan las mismas reglas que js/data/enemies.js: sin dibujo propio se ve
// su emoji (`icon`). Se reparten así:
//   Castillo 1 (Huerto):   Gallinero · Estanque · Invernadero · Bodega
//   Castillo 2 (Azar):     Sala de Dados · Salón de Póker · Torre de Ajedrez
//   Castillo 3 (La Torre): sala del trono con la guardia real
// Jefes "guardianes" (uno por piso, salvo el último) y jefes de castillo
// (el último piso de cada castillo).
// ============================================================

(function () {
    const cycle = (list) => (e) => list[e.turns % list.length];
    const rand = (list) => list[Math.floor(Math.random() * list.length)];
    // ¿hay lugar para invocar? (máximo 3 enemigos vivos)
    const room = (c, n) => c.aliveEnemies().length + (n || 1) <= 3;

    // ---------- cartas-estorbo nuevas que meten estos enemigos ----------
    registerCard({
        id: 'carta_marcada', name: 'Carta Marcada', type: 'status', cost: 0, rarity: 'status', unplayable: true, ethereal: true, endTurnDamage: 1,
        art: '🃏', description: 'Injugable. Si sigue en tu mano al terminar el turno, pierdes 1 ❤️ y se consume.'
    });
    registerCard({
        id: 'dado_trucado', name: 'Dado Trucado', type: 'curse', cost: 0, rarity: 'curse', unplayable: true, endTurnDamage: 1,
        art: '🎲', description: 'Injugable. Si sigue en tu mano al terminar el turno, pierdes 1 ❤️.'
    });

    // =========================================================
    // CASTILLO 1 — GALLINERO
    // =========================================================
    registerEnemy({
        id: 'gallina_clueca', name: 'Gallina Clueca', icon: '🐔', hpMin: 22, hpMax: 26, idle: 'hop',
        ai: (e, c) => (e.turns === 1 && room(c) ? 'cacareo' : null),
        moves: [
            { id: 'picoteo', name: 'Picoteo', damage: 6, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'huevazo', name: 'Huevazo', damage: 4, addCard: { id: 'pulpa_aplastada', n: 1, to: 'discard' }, weight: 2, anim: 'spit', fx: 'splat' },
            { id: 'cacareo', name: '¡Cocoricó!', summon: ['pollito_furioso'], block: 5, once: true, weight: 0.01, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'pollito_furioso', name: 'Pollito Furioso', icon: '🐥', hpMin: 8, hpMax: 11, idle: 'hop',
        moves: [
            { id: 'piar', name: 'Piar Rabioso', damage: 3, hits: 2, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'berrinche', name: 'Berrinche', self: { strength: 2 }, weight: 1, noRepeat: true, anim: 'shake' }
        ]
    });
    registerEnemy({
        id: 'zorro_astuto', name: 'Zorro Astuto', icon: '🦊', hpMin: 30, hpMax: 34, idle: 'sway',
        moves: [
            { id: 'mordida_zorro', name: 'Mordida', damage: 9, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'birlar', name: 'Birlar', damage: 5, stealGold: 10, weight: 1, noRepeat: true, anim: 'swoop', fx: 'steal' },
            { id: 'trampa_zorro', name: 'Trampa', damage: 3, apply: { vulnerable: 1, weak: 1 }, weight: 1, noRepeat: true, anim: 'lunge', fx: 'claw' }
        ]
    });
    registerEnemy({
        id: 'gallo_vigia', name: 'Gallo Vigía', icon: '🐓', hpMin: 66, hpMax: 72, tier: 'elite', idle: 'sway',
        ai: cycle(['quiquiriqui', 'espolonazo', 'picoteo_furioso']),
        moves: [
            { id: 'quiquiriqui', name: '¡Quiquiriquí!', self: { strength: 2 }, apply: { weak: 1 }, anim: 'shake', fx: 'shock' },
            { id: 'espolonazo', name: 'Espolonazo', damage: 12, apply: { vulnerable: 1 }, anim: 'lunge', fx: 'claw' },
            { id: 'picoteo_furioso', name: 'Picoteo Furioso', damage: 4, hits: 4, anim: 'bite', fx: 'bite' }
        ]
    });
    registerEnemy({
        id: 'cuervo_joven', name: 'Cuervo Joven', icon: '🐦‍⬛', sprite: 'cuervo_ladron', hpMin: 9, hpMax: 12, idle: 'flap',
        moves: [
            { id: 'picotazo_cuervo', name: 'Picotazo', damage: 4, weight: 2, anim: 'swoop', fx: 'claw' },
            { id: 'graznido_joven', name: 'Graznido', apply: { weak: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'espantapajaros', name: 'Espantapájaros Maldito', icon: '🎃', hpMin: 70, hpMax: 78, tier: 'boss', idle: 'sway', leader: true,
        ai: (e, c) => {
            const order = ['susto', 'paja_ardiente', 'llamar_cuervos', 'garrotazo'];
            let id = order[e.turns % order.length];
            if (id === 'llamar_cuervos' && !room(c, 2)) id = 'garrotazo';
            return id;
        },
        moves: [
            { id: 'susto', name: 'Susto Mortal', apply: { weak: 2, frail: 1 }, block: 8, anim: 'shake', fx: 'shock' },
            { id: 'paja_ardiente', name: 'Paja Ardiente', damage: 8, addCard: { id: 'jugo_hirviendo', n: 1, to: 'discard' }, anim: 'spit', fx: 'burst' },
            { id: 'llamar_cuervos', name: '¡Cuervos, a mí!', summon: ['cuervo_joven', 'cuervo_joven'], anim: 'cast' },
            { id: 'garrotazo', name: 'Garrotazo', damage: 15, anim: 'slam', fx: 'shock' }
        ]
    });

    // =========================================================
    // CASTILLO 1 — ESTANQUE
    // =========================================================
    registerEnemy({
        id: 'rana_toxica', name: 'Rana Tóxica', icon: '🐸', hpMin: 20, hpMax: 24, idle: 'hop',
        moves: [
            { id: 'lengua', name: 'Lengüetazo', damage: 5, apply: { weak: 1 }, weight: 2, anim: 'lunge', fx: 'splat' },
            { id: 'veneno_rana', name: 'Piel Venenosa', damage: 3, apply: { poison: 4 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'saltar', name: 'Saltar', block: 7, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'mosquito_tigre', name: 'Mosquito Tigre', icon: '🦟', hpMin: 12, hpMax: 15, idle: 'buzz',
        moves: [
            { id: 'picar', name: 'Picar', damage: 4, hits: 2, weight: 2, anim: 'sting', fx: 'sting' },
            { id: 'chupar', name: 'Chupar Sangre', damage: 5, drain: true, weight: 1, noRepeat: true, anim: 'sting', fx: 'drain' },
            { id: 'zumbido_tigre', name: 'Zumbido', self: { strength: 1 }, weight: 1, noRepeat: true, anim: 'shake' }
        ]
    });
    registerEnemy({
        id: 'pez_globo', name: 'Pez Globo', icon: '🐡', hpMin: 24, hpMax: 28, idle: 'wobble', start: { thorns: 3 },
        moves: [
            { id: 'inflarse', name: 'Inflarse', self: { thorns: 2 }, block: 8, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'embestida_globo', name: 'Embestida', damage: 8, weight: 2, anim: 'charge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'cangrejo_pinza', name: 'Cangrejo Pinzas', icon: '🦀', hpMin: 28, hpMax: 32, idle: 'scuttle', start: { plated: 3 },
        moves: [
            { id: 'pinzazo', name: 'Pinzazo', damage: 9, apply: { frail: 1 }, weight: 2, anim: 'lunge', fx: 'slash' },
            { id: 'caparazon_cangrejo', name: 'Caparazón', block: 10, self: { strength: 1 }, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'sapo_gigante', name: 'Sapo Gigante', icon: '🐸', hpMin: 76, hpMax: 84, tier: 'elite', idle: 'wobble', start: { regrow: 1 },
        ai: cycle(['tragar', 'lengua_larga', 'croar', 'salto_aplastante']),
        moves: [
            { id: 'tragar', name: 'Tragar', damage: 8, drain: true, anim: 'bite', fx: 'drain' },
            { id: 'lengua_larga', name: 'Lengua Larga', damage: 10, apply: { vulnerable: 2 }, anim: 'lunge', fx: 'splat' },
            { id: 'croar', name: 'Croar', self: { strength: 2 }, apply: { weak: 1, frail: 1 }, anim: 'shake', fx: 'shock' },
            { id: 'salto_aplastante', name: 'Salto Aplastante', damage: 16, anim: 'slam', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'lucio_gigante', name: 'Lucio Gigante', icon: '🐟', hpMin: 72, hpMax: 80, tier: 'boss', idle: 'sway',
        ai: (e, c) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'remolino'; }
            const order = ['mordisco_lucio', 'coletazo', 'llamar_cardumen', 'mordisco_lucio'];
            let id = order[e.turns % order.length];
            if (id === 'llamar_cardumen' && !room(c)) id = 'coletazo';
            return id;
        },
        moves: [
            { id: 'mordisco_lucio', name: 'Mordisco', damage: 12, anim: 'bite', fx: 'bite' },
            { id: 'coletazo', name: 'Coletazo', damage: 7, apply: { weak: 1, vulnerable: 1 }, anim: 'slam', fx: 'splat' },
            { id: 'llamar_cardumen', name: 'Cardumen', summon: ['pez_globo'], block: 8, anim: 'cast' },
            { id: 'remolino', name: '¡Remolino!', damage: 6, hits: 3, self: { strength: 2 }, anim: 'spin', fx: 'splat' }
        ]
    });

    // =========================================================
    // CASTILLO 1 — INVERNADERO
    // =========================================================
    registerEnemy({
        id: 'planta_carnivora', name: 'Planta Carnívora', icon: '🪴', hpMin: 26, hpMax: 30, idle: 'sway', start: { spores: 2 },
        moves: [
            { id: 'mordisco_planta', name: 'Mordisco Voraz', damage: 7, drain: true, weight: 2, anim: 'bite', fx: 'drain' },
            { id: 'atrapar', name: 'Atrapar', damage: 3, apply: { sticky: 1 }, weight: 1, noRepeat: true, anim: 'lunge', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'enredadera', name: 'Enredadera', icon: '🌿', hpMin: 22, hpMax: 26, idle: 'sway', start: { thorns: 2 },
        moves: [
            { id: 'latigazo', name: 'Latigazo', damage: 5, hits: 2, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'enredar', name: 'Enredar', apply: { frail: 2, sticky: 1 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'crecer', name: 'Crecer', self: { regen: 3 }, block: 4, weight: 1, noRepeat: true, anim: 'heal' }
        ]
    });
    registerEnemy({
        id: 'polen_furioso', name: 'Polen Furioso', icon: '🌼', hpMin: 12, hpMax: 15, idle: 'float',
        moves: [
            { id: 'estornudo', name: 'Estornudo', damage: 2, apply: { weak: 2 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'seeds' },
            { id: 'polvillo', name: 'Polvillo', apply: { poison: 3 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'seeds' },
            { id: 'golpe_petalo', name: 'Golpe de Pétalo', damage: 4, weight: 2, anim: 'lunge', fx: 'slash' }
        ]
    });
    registerEnemy({
        id: 'girasol_soldado', name: 'Girasol Soldado', icon: '🌻', hpMin: 30, hpMax: 34, idle: 'sway',
        moves: [
            { id: 'rayo_solar', name: 'Rayo Solar', damage: 10, weight: 2, anim: 'spit', fx: 'burst' },
            { id: 'girar', name: 'Girar al Sol', self: { strength: 1 }, block: 6, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'orquidea_letal', name: 'Orquídea Letal', icon: '🌺', hpMin: 68, hpMax: 74, tier: 'elite', idle: 'sway', start: { reflect: 1 },
        ai: cycle(['perfume', 'espinas', 'picadura_letal']),
        moves: [
            { id: 'perfume', name: 'Perfume Adormecedor', apply: { weak: 2, frail: 2 }, block: 10, anim: 'cast', fx: 'splat' },
            { id: 'espinas', name: 'Lluvia de Espinas', damage: 6, hits: 2, self: { thorns: 3 }, anim: 'shake', fx: 'sting' },
            { id: 'picadura_letal', name: 'Picadura Letal', damage: 5, apply: { poison: 8 }, anim: 'sting', fx: 'sting' }
        ]
    });
    registerEnemy({
        id: 'rosa_reina', name: 'Rosa Reina', icon: '🌹', hpMin: 70, hpMax: 78, tier: 'boss', idle: 'sway', leader: true,
        ai: (e, c) => {
            const order = ['petalos', 'espina_real', 'perfume_dulce', 'invocar_botones'];
            let id = order[e.turns % order.length];
            if (id === 'invocar_botones' && !room(c, 2)) id = 'espina_real';
            return id;
        },
        moves: [
            { id: 'petalos', name: 'Tormenta de Pétalos', damage: 5, hits: 3, anim: 'spin', fx: 'slash' },
            { id: 'espina_real', name: 'Espina Real', damage: 13, anim: 'lunge', fx: 'sting' },
            { id: 'perfume_dulce', name: 'Perfume Dulce', apply: { weak: 2, vulnerable: 1 }, heal: 6, anim: 'cast', fx: 'splat' },
            { id: 'invocar_botones', name: '¡A florecer!', summon: ['polen_furioso', 'polen_furioso'], anim: 'cast' }
        ]
    });

    // =========================================================
    // CASTILLO 1 — BODEGA
    // =========================================================
    registerEnemy({
        id: 'barril_rodante', name: 'Barril Rodante', icon: '🛢️', hpMin: 30, hpMax: 34, idle: 'rumble',
        moves: [
            { id: 'rodar_barril', name: 'Rodar', damage: 9, weight: 2, anim: 'charge', fx: 'shock' },
            { id: 'tapa_barril', name: 'Cerrar Tapa', block: 8, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'murcielago', name: 'Murciélago', icon: '🦇', hpMin: 14, hpMax: 17, idle: 'flap',
        moves: [
            { id: 'chupar_murcielago', name: 'Chupar', damage: 5, drain: true, weight: 2, anim: 'swoop', fx: 'drain' },
            { id: 'chillar', name: 'Chillido', apply: { weak: 1 }, self: { strength: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'arana_bodeguera', name: 'Araña Bodeguera', icon: '🕷️', hpMin: 22, hpMax: 26, idle: 'scuttle',
        moves: [
            { id: 'picadura_arana', name: 'Picadura', damage: 4, apply: { poison: 4 }, weight: 2, anim: 'bite', fx: 'bite' },
            { id: 'telarana', name: 'Telaraña', apply: { sticky: 1, frail: 1 }, block: 4, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'moho_viscoso', name: 'Moho Viscoso', icon: '🧫', hpMin: 28, hpMax: 32, idle: 'wobble', start: { malleable: 2 },
        moves: [
            { id: 'esporas_moho', name: 'Esporas', apply: { poison: 3, weak: 1 }, weight: 1, noRepeat: true, anim: 'spit', fx: 'splat' },
            { id: 'viscosa_moho', name: 'Baba Viscosa', damage: 7, apply: { sticky: 1 }, weight: 2, anim: 'slam', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'tonel_maldito', name: 'Tonel Maldito', icon: '🍷', hpMin: 74, hpMax: 82, tier: 'elite', idle: 'rumble', start: { cap: 12 },
        ai: cycle(['fermentar', 'chorro_vino', 'rodar_tonel']),
        moves: [
            { id: 'fermentar', name: 'Fermentar', self: { regen: 4, strength: 2 }, block: 10, anim: 'cast' },
            { id: 'chorro_vino', name: 'Chorro de Vino', damage: 5, hits: 3, apply: { poison: 2 }, anim: 'spit', fx: 'splat' },
            { id: 'rodar_tonel', name: 'Rodar', damage: 16, anim: 'charge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'sommelier_fantasma', name: 'Sommelier Fantasma', icon: '👻', hpMin: 70, hpMax: 78, tier: 'boss', idle: 'float', start: { wax: 2 },
        ai: (e, c) => {
            const order = ['catar', 'descorchar', 'anejar', 'brindis'];
            let id = order[e.turns % order.length];
            if (id === 'brindis' && !room(c)) id = 'descorchar';
            return id;
        },
        moves: [
            { id: 'catar', name: 'Catar', damage: 4, apply: { weak: 1, vulnerable: 1 }, anim: 'cast', fx: 'splat' },
            { id: 'descorchar', name: 'Descorchar', damage: 13, anim: 'charge', fx: 'burst' },
            { id: 'anejar', name: 'Añejar', block: 14, self: { strength: 2 }, anim: 'guard' },
            { id: 'brindis', name: '¡Brindis!', summon: ['murcielago'], heal: 8, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'avispon_capitan', name: 'Avispón Capitán', icon: '🐝', sprite: 'avispa_furiosa', hpMin: 68, hpMax: 74, tier: 'boss', idle: 'flap', leader: true,
        ai: (e, c) => {
            const order = ['orden_avispon', 'aguijon_doble', 'lluvia_aguijones', 'embestida_avispon'];
            let id = order[e.turns % order.length];
            if (id === 'orden_avispon' && !room(c)) id = 'aguijon_doble';
            return id;
        },
        moves: [
            { id: 'orden_avispon', name: '¡Al ataque!', summon: ['avispa_furiosa'], block: 8, anim: 'cast' },
            { id: 'aguijon_doble', name: 'Aguijón Doble', damage: 5, hits: 2, anim: 'sting', fx: 'sting' },
            { id: 'lluvia_aguijones', name: 'Lluvia de Aguijones', damage: 3, hits: 4, apply: { poison: 2 }, anim: 'swoop', fx: 'sting' },
            { id: 'embestida_avispon', name: 'Embestida', damage: 14, anim: 'charge', fx: 'shock' }
        ]
    });

    // =========================================================
    // CASTILLO 2 — SALA DE DADOS
    // =========================================================
    registerEnemy({
        id: 'dado_pequeno', name: 'Dadito', icon: '🎲', hpMin: 8, hpMax: 11, idle: 'hop',
        moves: [
            { id: 'rodadita', name: 'Rodadita', damage: 4, weight: 2, anim: 'spin', fx: 'shock' },
            { id: 'punto_uno', name: 'Un Puntito', damage: 2, weight: 1, anim: 'lunge', fx: 'punch' }
        ]
    });
    registerEnemy({
        id: 'dado_travieso', name: 'Dado Travieso', icon: '🎲', hpMin: 28, hpMax: 32, idle: 'hop',
        // la tirada se decide al azar cada turno, como un dado de verdad
        ai: () => rand(['tirada_baja', 'tirada_media', 'tirada_alta']),
        moves: [
            { id: 'tirada_baja', name: 'Tirada: 1 o 2', damage: 3, anim: 'spin', fx: 'shock' },
            { id: 'tirada_media', name: 'Tirada: 3 o 4', damage: 7, anim: 'spin', fx: 'shock' },
            { id: 'tirada_alta', name: 'Tirada: 5 o 6', damage: 12, anim: 'spin', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'dado_cargado', name: 'Dado Cargado', icon: '🎲', hpMin: 36, hpMax: 40, idle: 'wobble', start: { malleable: 2 },
        moves: [
            { id: 'cargado_uno', name: 'Ojos de Serpiente', damage: 5, hits: 2, addCard: { id: 'dado_trucado', n: 1, to: 'discard' }, weight: 1, noRepeat: true, anim: 'spin', fx: 'shock' },
            { id: 'seis_seguro', name: 'Seis Seguro', damage: 14, weight: 2, anim: 'slam', fx: 'shock' },
            { id: 'recargar_dado', name: 'Recargar', self: { strength: 2 }, block: 6, weight: 1, noRepeat: true, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'cubilete_saltarin', name: 'Cubilete Saltarín', icon: '🏺', hpMin: 30, hpMax: 34, idle: 'hop', start: { curl: 6 },
        ai: (e, c) => (e.turns % 3 === 2 && room(c) ? 'derramar' : null),
        moves: [
            { id: 'sacudir', name: 'Sacudir', damage: 6, hits: 2, weight: 2, anim: 'shake', fx: 'shock' },
            { id: 'tapar', name: 'Taparse', block: 10, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'derramar', name: 'Derramar Dados', summon: ['dado_pequeno'], weight: 0.01, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'ficha_dorada', name: 'Ficha Dorada', icon: '🪙', hpMin: 24, hpMax: 28, idle: 'spin',
        // cara o cruz: mitad ataca, mitad se cura
        ai: () => rand(['cara', 'cruz', 'apuesta_ficha']),
        moves: [
            { id: 'cara', name: 'Cara', damage: 10, anim: 'lunge', fx: 'claw' },
            { id: 'cruz', name: 'Cruz', block: 12, heal: 6, anim: 'heal' },
            { id: 'apuesta_ficha', name: 'Apuesta', damage: 3, stealGold: 12, anim: 'swoop', fx: 'steal' }
        ]
    });
    registerEnemy({
        id: 'gran_dado', name: 'Gran Dado Doble', icon: '🎲', hpMin: 72, hpMax: 80, tier: 'elite', idle: 'rumble', start: { plated: 3 },
        ai: (e, c) => {
            const roll = rand(['doble_seis', 'ojos_serpiente', 'lluvia_dados', 'doble_cinco']);
            return roll === 'lluvia_dados' && !room(c, 2) ? 'doble_seis' : roll;
        },
        moves: [
            { id: 'doble_seis', name: 'Doble Seis', damage: 12, hits: 2, anim: 'slam', fx: 'shock' },
            { id: 'ojos_serpiente', name: 'Ojos de Serpiente', damage: 2, apply: { poison: 6, weak: 1 }, block: 10, anim: 'spit', fx: 'splat' },
            { id: 'lluvia_dados', name: 'Lluvia de Dados', summon: ['dado_pequeno', 'dado_pequeno'], anim: 'cast' },
            { id: 'doble_cinco', name: 'Doble Cinco', damage: 10, hits: 2, apply: { vulnerable: 1 }, anim: 'spin', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'cubilete_maldito', name: 'Cubilete Maldito', icon: '🏺', hpMin: 92, hpMax: 100, tier: 'boss', idle: 'rumble', start: { curl: 6 },
        ai: (e, c) => {
            const order = ['agitar', 'tirada_triple', 'tapa_cubilete', 'lluvia_dados_boss'];
            let id = order[e.turns % order.length];
            if (id === 'lluvia_dados_boss' && !room(c, 2)) id = 'tirada_triple';
            return id;
        },
        moves: [
            { id: 'agitar', name: 'Agitar', apply: { weak: 1, vulnerable: 1 }, block: 10, anim: 'shake', fx: 'shock' },
            { id: 'tirada_triple', name: 'Tirada Triple', damage: 9, hits: 3, anim: 'spin', fx: 'shock' },
            { id: 'tapa_cubilete', name: 'Tapa Pesada', block: 20, self: { strength: 2 }, anim: 'guard' },
            { id: 'lluvia_dados_boss', name: 'Lluvia de Dados', summon: ['dado_pequeno', 'dado_pequeno'], anim: 'cast' }
        ]
    });

    // =========================================================
    // CASTILLO 2 — SALÓN DE PÓKER
    // =========================================================
    registerEnemy({
        id: 'as_espadas', name: 'As de Espadas', icon: '♠️', hpMin: 30, hpMax: 34, idle: 'sway',
        moves: [
            { id: 'cuchillada_as', name: 'Cuchillada', damage: 9, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'ocultarse', name: 'Ocultarse', block: 8, self: { strength: 1 }, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'joker', name: 'Comodín', icon: '🃏', hpMin: 34, hpMax: 38, idle: 'wobble',
        // un comodín es puro azar
        ai: () => rand(['travesura', 'broma_pesada', 'carcajada', 'cambio_cartas']),
        moves: [
            { id: 'travesura', name: 'Travesura', damage: 12, anim: 'lunge', fx: 'claw' },
            { id: 'broma_pesada', name: 'Broma Pesada', apply: { weak: 2, vulnerable: 2 }, anim: 'shake', fx: 'splat' },
            { id: 'carcajada', name: 'Carcajada', heal: 8, self: { strength: 1 }, anim: 'heal' },
            { id: 'cambio_cartas', name: 'Cambio de Cartas', damage: 4, addCard: { id: 'carta_marcada', n: 2, to: 'discard' }, anim: 'cast', fx: 'seeds' }
        ]
    });
    registerEnemy({
        id: 'rey_corazones', name: 'Rey de Corazones', icon: '♥️', hpMin: 38, hpMax: 42, idle: 'sway',
        moves: [
            { id: 'decreto', name: 'Decreto Real', allies: { strength: 1 }, block: 6, weight: 1, noRepeat: true, anim: 'cast' },
            { id: 'corazonada', name: 'Corazonada', damage: 10, drain: true, weight: 2, anim: 'lunge', fx: 'drain' }
        ]
    });
    registerEnemy({
        id: 'diamante_afilado', name: 'Diamante Afilado', icon: '♦️', hpMin: 28, hpMax: 32, idle: 'spin',
        moves: [
            { id: 'facetas', name: 'Facetas', damage: 4, hits: 3, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'brillo', name: 'Brillo Cegador', apply: { weak: 1 }, block: 6, weight: 1, noRepeat: true, anim: 'cast', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'trebol_tramposo', name: 'Trébol Tramposo', icon: '♣️', hpMin: 30, hpMax: 34, idle: 'hop',
        moves: [
            { id: 'mano_oculta', name: 'Mano Oculta', damage: 5, addCard: { id: 'carta_marcada', n: 1, to: 'discard' }, weight: 2, anim: 'cast', fx: 'seeds' },
            { id: 'garrote_trebol', name: 'Garrote', damage: 11, weight: 2, anim: 'slam', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'flor_imperial', name: 'Flor Imperial', icon: '🎴', hpMin: 82, hpMax: 90, tier: 'elite', idle: 'sway',
        ai: cycle(['apuesta_alta', 'escalera', 'full_house', 'poker_ases']),
        moves: [
            { id: 'apuesta_alta', name: 'Apuesta Alta', damage: 6, stealGold: 15, self: { strength: 2 }, anim: 'swoop', fx: 'steal' },
            { id: 'escalera', name: 'Escalera Real', damage: 4, hits: 5, anim: 'slash', fx: 'slash' },
            { id: 'full_house', name: 'Full House', damage: 8, hits: 2, apply: { weak: 1 }, anim: 'lunge', fx: 'claw' },
            { id: 'poker_ases', name: 'Póker de Ases', damage: 20, anim: 'charge', fx: 'burst' }
        ]
    });
    registerEnemy({
        id: 'crupier_marcado', name: 'Crupier Marcado', icon: '🎩', hpMin: 112, hpMax: 122, tier: 'boss', idle: 'sway',
        ai: (e) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'all_in'; }
            return ['repartir', 'doblar', 'ver_apuesta', 'jugada_maestra'][e.turns % 4];
        },
        moves: [
            { id: 'repartir', name: 'Repartir', damage: 4, hits: 2, addCard: { id: 'carta_marcada', n: 2, to: 'discard' }, anim: 'cast', fx: 'seeds' },
            { id: 'doblar', name: 'Doblar Apuesta', self: { strength: 2 }, block: 12, anim: 'cast' },
            { id: 'ver_apuesta', name: 'Ver la Apuesta', damage: 10, stealGold: 20, anim: 'swoop', fx: 'steal' },
            { id: 'jugada_maestra', name: 'Jugada Maestra', damage: 22, anim: 'charge', fx: 'burst' },
            { id: 'all_in', name: '¡ALL IN!', self: { ritual: 1 }, block: 20, anim: 'cast' }
        ]
    });

    // =========================================================
    // CASTILLO 2 — TORRE DE AJEDREZ
    // =========================================================
    registerEnemy({
        id: 'peon_negro', name: 'Peón Negro', icon: '♟️', hpMin: 16, hpMax: 19, idle: 'hop',
        moves: [
            { id: 'avanzar', name: 'Avanzar', damage: 5, weight: 2, anim: 'lunge', fx: 'punch' },
            { id: 'defender_peon', name: 'Defender', block: 6, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'caballo_negro', name: 'Caballo Negro', icon: '🐴', hpMin: 34, hpMax: 38, idle: 'hop',
        moves: [
            { id: 'salto_l', name: 'Salto en L', damage: 11, weight: 2, anim: 'charge', fx: 'shock' },
            { id: 'relincho', name: 'Relincho', allies: { strength: 1 }, apply: { weak: 1 }, weight: 1, noRepeat: true, anim: 'shake', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'alfil_negro', name: 'Alfil Negro', icon: '♝', hpMin: 30, hpMax: 34, idle: 'sway',
        moves: [
            { id: 'diagonal', name: 'Diagonal', damage: 7, hits: 2, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'oracion', name: 'Oración Oscura', apply: { frail: 2 }, healAll: 5, weight: 1, noRepeat: true, anim: 'cast', fx: 'splat' }
        ]
    });
    registerEnemy({
        id: 'torre_negra', name: 'Torre Negra', icon: '♜', hpMin: 44, hpMax: 50, idle: 'rumble', start: { plated: 4 },
        moves: [
            { id: 'enroque', name: 'Enroque', block: 12, allyBlock: 6, weight: 1, noRepeat: true, anim: 'guard' },
            { id: 'embestida_torre', name: 'Embestida de Torre', damage: 12, weight: 2, anim: 'charge', fx: 'shock' },
            { id: 'muro_torre', name: 'Muro de Piedra', self: { plated: 2 }, block: 6, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'reina_negra', name: 'Reina Negra', icon: '♛', hpMin: 88, hpMax: 96, tier: 'elite', idle: 'sway',
        ai: cycle(['jaque', 'captura', 'dama_ofendida', 'captura']),
        moves: [
            { id: 'jaque', name: 'Jaque', apply: { weak: 2, vulnerable: 2 }, block: 10, anim: 'cast', fx: 'shock' },
            { id: 'captura', name: 'Captura', damage: 14, drain: true, anim: 'lunge', fx: 'drain' },
            { id: 'dama_ofendida', name: 'Dama Ofendida', damage: 5, hits: 3, self: { strength: 2 }, anim: 'slash', fx: 'slash' }
        ]
    });
    registerEnemy({
        id: 'rey_ajedrez', name: 'Rey Negro', icon: '♚', hpMin: 100, hpMax: 108, tier: 'boss', idle: 'sway', leader: true,
        ai: (e, c) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'jaque_mate'; }
            const order = ['llamar_peones', 'enroque_rey', 'decreto_rey', 'enroque_rey'];
            let id = order[e.turns % order.length];
            if (id === 'llamar_peones' && !room(c, 2)) id = 'decreto_rey';
            return id;
        },
        moves: [
            { id: 'llamar_peones', name: '¡Peones, adelante!', summon: ['peon_negro', 'peon_negro'], block: 10, anim: 'cast' },
            { id: 'enroque_rey', name: 'Enroque', block: 16, allyBlock: 8, self: { strength: 1 }, anim: 'guard' },
            { id: 'decreto_rey', name: 'Decreto Real', damage: 12, apply: { weak: 1, frail: 1 }, anim: 'lunge', fx: 'shock' },
            { id: 'jaque_mate', name: '¡JAQUE MATE!', damage: 24, self: { ritual: 1 }, anim: 'charge', fx: 'burst' }
        ]
    });

    // ---------- jefes del Castillo del Azar (último piso) ----------
    registerEnemy({
        id: 'rey_azar', name: 'Rey del Azar', icon: '🎰', hpMin: 150, hpMax: 160, tier: 'boss', idle: 'menace',
        ai: (e, c) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'jackpot'; }
            const order = ['ruleta', 'tres_siete', 'tirada_real', 'llamar_fichas'];
            let id = order[e.turns % order.length];
            if (id === 'llamar_fichas' && !room(c, 2)) id = 'tres_siete';
            return id;
        },
        moves: [
            {
                id: 'ruleta', name: 'Ruleta Rusa', anim: 'spin',
                // nadie sabe qué saldrá: golpe, cura, estorbos o fuerza
                special: (e, ctx) => {
                    const r = Math.floor(Math.random() * 4);
                    if (r === 0) ctx.combat.dealDamage(e, ctx.player, 18);
                    else if (r === 1) ctx.combat.healEntity(e, 20);
                    else if (r === 2) ctx.combat.addCards('carta_marcada', 3, 'discard');
                    else ctx.combat.applyStatus(e, 'strength', 3);
                }
            },
            { id: 'tres_siete', name: 'Triple Siete', damage: 7, hits: 3, apply: { vulnerable: 1 }, anim: 'spin', fx: 'burst' },
            { id: 'tirada_real', name: 'Tirada Real', damage: 16, block: 10, anim: 'charge', fx: 'shock' },
            { id: 'llamar_fichas', name: 'Fichas al Ruedo', summon: ['ficha_dorada', 'dado_travieso'], anim: 'cast' },
            { id: 'jackpot', name: '¡JACKPOT!', damage: 26, self: { ritual: 1, strength: 2 }, block: 20, anim: 'charge', fx: 'burst' }
        ]
    });
    registerEnemy({
        id: 'dama_suerte', name: 'Dama de la Suerte', icon: '🍀', hpMin: 145, hpMax: 155, tier: 'boss', idle: 'sway', start: { reflect: 1 },
        ai: (e) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'mala_racha'; }
            return ['trebol_cuatro_hojas', 'reparto_suerte', 'golpe_de_suerte', 'espejo_suerte'][e.turns % 4];
        },
        moves: [
            { id: 'trebol_cuatro_hojas', name: 'Trébol de 4 Hojas', heal: 12, block: 12, anim: 'heal' },
            { id: 'reparto_suerte', name: 'Reparto de Suerte', damage: 6, hits: 3, addCard: { id: 'carta_marcada', n: 1, to: 'discard' }, anim: 'cast', fx: 'seeds' },
            { id: 'golpe_de_suerte', name: 'Golpe de Suerte', damage: 20, anim: 'charge', fx: 'burst' },
            { id: 'espejo_suerte', name: 'Espejo de la Suerte', self: { reflect: 2 }, apply: { weak: 2 }, block: 10, anim: 'guard' },
            { id: 'mala_racha', name: '¡Mala Racha!', damage: 10, apply: { weak: 2, vulnerable: 2, frail: 2 }, self: { ritual: 1 }, anim: 'shake', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'gran_maestro', name: 'Gran Maestro', icon: '♟️', hpMin: 155, hpMax: 165, tier: 'boss', idle: 'menace', leader: true,
        ai: (e, c) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'gambito_final'; }
            const order = ['gambito', 'torre_alfil', 'sacrificio', 'gambito'];
            let id = order[e.turns % order.length];
            if (id === 'gambito' && !room(c)) id = 'sacrificio';
            return id;
        },
        moves: [
            { id: 'gambito', name: 'Gambito', summon: ['caballo_negro'], block: 12, anim: 'cast' },
            { id: 'torre_alfil', name: 'Torre y Alfil', damage: 9, hits: 2, apply: { vulnerable: 1 }, anim: 'slash', fx: 'slash' },
            { id: 'sacrificio', name: 'Sacrificio de Dama', damage: 18, self: { strength: 2 }, anim: 'charge', fx: 'burst' },
            { id: 'gambito_final', name: '¡Gambito Final!', damage: 8, hits: 4, self: { ritual: 1 }, block: 20, anim: 'spin', fx: 'slash' }
        ]
    });

    // =========================================================
    // CASTILLO 3 — TORRE DEL REY (guardia real)
    // =========================================================
    registerEnemy({
        id: 'caballero_cuchillas', name: 'Caballero de Cuchillas', icon: '🛡️', hpMin: 46, hpMax: 52, idle: 'sway', start: { plated: 4 },
        moves: [
            { id: 'mandoble', name: 'Mandoble', damage: 14, weight: 2, anim: 'slash', fx: 'slash' },
            { id: 'guardia_alta', name: 'Guardia Alta', block: 14, self: { strength: 1 }, weight: 1, noRepeat: true, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'mayordomo_batidor', name: 'Mayordomo Batidor', icon: '🫖', hpMin: 40, hpMax: 46, idle: 'wobble',
        moves: [
            { id: 'servir_veneno', name: 'Servir el Té', damage: 6, apply: { poison: 5 }, weight: 2, anim: 'spit', fx: 'splat' },
            { id: 'aviso_real', name: 'Aviso Real', allies: { strength: 2 }, block: 8, weight: 1, noRepeat: true, anim: 'cast' }
        ]
    });
    registerEnemy({
        id: 'bufon_explosivo', name: 'Bufón Explosivo', icon: '🤡', hpMin: 30, hpMax: 34, idle: 'hop', start: { fuse: 3 }, explode: 22,
        moves: [
            { id: 'malabares', name: 'Malabares', damage: 5, hits: 2, weight: 2, anim: 'throw', fx: 'burst' },
            { id: 'cabriola', name: 'Cabriola', block: 8, weight: 1, anim: 'guard' }
        ]
    });
    registerEnemy({
        id: 'guardia_hielo', name: 'Guardia de Hielo', icon: '🥶', hpMin: 48, hpMax: 54, idle: 'rumble',
        moves: [
            { id: 'lanza_helada', name: 'Lanza Helada', damage: 12, apply: { frail: 2 }, weight: 2, anim: 'lunge', fx: 'ice' },
            { id: 'escarcha_real', name: 'Escarcha Real', block: 12, apply: { sticky: 1 }, weight: 1, noRepeat: true, anim: 'guard', fx: 'ice' }
        ]
    });
    registerEnemy({
        id: 'capitan_guardia', name: 'Capitán de la Guardia', icon: '⚔️', hpMin: 112, hpMax: 122, tier: 'elite', idle: 'sway', start: { plated: 5 },
        ai: cycle(['orden_capitan', 'estocada_real', 'carga_capitan', 'estocada_real']),
        moves: [
            { id: 'orden_capitan', name: '¡A la carga!', self: { strength: 3 }, allies: { strength: 1 }, block: 14, anim: 'cast' },
            { id: 'estocada_real', name: 'Estocada Real', damage: 9, hits: 3, anim: 'lunge', fx: 'slash' },
            { id: 'carga_capitan', name: 'Carga', damage: 22, apply: { vulnerable: 2 }, anim: 'charge', fx: 'shock' }
        ]
    });
    registerEnemy({
        id: 'verdugo_jugo', name: 'Verdugo del Jugo', icon: '🪓', hpMin: 108, hpMax: 118, tier: 'elite', idle: 'rumble', start: { enrage: 1 },
        ai: cycle(['afilar_hacha', 'hachazo', 'decapitar']),
        moves: [
            { id: 'afilar_hacha', name: 'Afilar el Hacha', self: { strength: 3 }, block: 14, anim: 'cast' },
            { id: 'hachazo', name: 'Hachazo', damage: 18, apply: { frail: 2 }, anim: 'slash', fx: 'slash' },
            { id: 'decapitar', name: 'Decapitar', damage: 30, anim: 'charge', fx: 'burst' }
        ]
    });
    registerEnemy({
        id: 'robot_gigante', name: 'Robot Limpiador Gigante', icon: '🤖', sprite: 'robot_limpiador', hpMin: 150, hpMax: 160, tier: 'boss', idle: 'rumble', start: { enrage: 1 },
        ai: (e, c) => {
            if (e.phase === 0 && e.hp < e.maxHp / 2) { e.phase = 1; return 'sobrecarga_robot'; }
            const order = ['barrer', 'aspirar_todo', 'fregona', 'barrer'];
            let id = order[e.turns % order.length];
            return id;
        },
        moves: [
            { id: 'barrer', name: 'Barrer', damage: 14, anim: 'slash', fx: 'slash' },
            { id: 'aspirar_todo', name: 'Aspirar Todo', damage: 8, drain: true, hits: 2, anim: 'lunge', fx: 'drain' },
            { id: 'fregona', name: 'Fregona Pegajosa', damage: 6, apply: { sticky: 2, frail: 2 }, block: 12, anim: 'slam', fx: 'splat' },
            { id: 'sobrecarga_robot', name: '¡SOBRECARGA!', damage: 10, hits: 3, self: { strength: 3 }, anim: 'spin', fx: 'shock' }
        ]
    });
})();
