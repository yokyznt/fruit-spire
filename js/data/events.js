// ============================================================
// EVENTS.JS — Eventos de casillas misteriosas
// Para agregar uno nuevo: agrega un objeto al arreglo EVENT_DB.
//
// Campos:
//   id, title, icon, desc
//   acts: en qué niveles puede salir (opcional, por defecto en todos)
//   options: arreglo de { text, effect(player, g), locked(player) }
//     locked devuelve un texto si la opción no se puede elegir.
//     g trae ayudantes del juego:
//       g.grantRandomRelic(player) → texto
//       g.addCard(id), g.randomCard(rareza?) → carta
//       g.upgradeRandom(n) → nombres, g.removeRandom(soloBásicas) → nombre
//       g.duplicateRandom() → nombre, g.act (nivel actual)
// Arte: sprite con el mismo id en js/art/sprites.js (si no, el emoji).
// ============================================================

window.EVENT_DB = [
    {
        id: 'fuente_magica', title: 'Fuente de Néctar', icon: '⛲',
        desc: 'Una fuente burbujea néctar dorado entre las raíces. Huele a verano.',
        options: [
            { text: 'Beber (recuperas 20 ❤️)', effect: (p) => { p.heal(20); return 'El néctar te llena de jugo. +20 ❤️.'; } },
            {
                text: 'Bañar una carta (madura 1 carta al azar)',
                effect: (p, g) => { const n = g.upgradeRandom(1); return n.length ? `${n[0]} maduró y brilla.` : 'No tenías cartas que madurar.'; }
            },
            { text: 'Seguir de largo', effect: () => 'Sigues tu camino sin tocar nada raro.' }
        ]
    },
    {
        id: 'comerciante_misterioso', title: 'Comerciante Encapuchado', icon: '🎭',
        desc: 'Una ciruela pasa con capucha te ofrece algo envuelto en hojas.',
        options: [
            {
                text: 'Pagar 40 de oro por una reliquia al azar',
                locked: (p) => (p.gold < 40 ? 'No te alcanza el oro' : ''),
                effect: (p, g) => { p.gold -= 40; return g.grantRandomRelic(p); }
            },
            {
                text: 'Pagar 25 de oro por una carta rara',
                locked: (p) => (p.gold < 25 ? 'No te alcanza el oro' : ''),
                effect: (p, g) => { p.gold -= 25; const c = g.randomCard('rare'); g.addCard(c.id); return `Desenvuelves las hojas: ¡${c.name}!`; }
            },
            { text: 'Rechazar la oferta', effect: () => 'La ciruela pasa desaparece entre las sombras.' }
        ]
    },
    {
        id: 'trampa_espinas', title: 'Zarzamora Espinosa', icon: '🌵',
        desc: 'Te enredas en una zarzamora. Hay moras jugosas… y espinas por todos lados.',
        options: [
            { text: 'Forcejear (pierdes 8 ❤️)', effect: (p) => { p.hp = Math.max(1, p.hp - 8); return 'Te liberas, pero te costó 8 ❤️.'; } },
            {
                text: 'Comerte las moras (+6 ❤️ máx. y un Gusano Interior)',
                effect: (p, g) => { p.maxHp += 6; p.hp += 6; g.addCard('gusano_interior'); return 'Deliciosas… pero algo se movió dentro de una. +6 ❤️ máx.'; }
            },
            {
                text: 'Pagarle 20 de oro a un escarabajo',
                locked: (p) => (p.gold < 20 ? 'No te alcanza el oro' : ''),
                effect: (p) => { p.gold -= 20; return 'El escarabajo corta las ramas. Sales sin un rasguño.'; }
            }
        ]
    },
    {
        id: 'altar_poder', title: 'Altar del Sabor', icon: '🗿',
        desc: 'Un altar antiguo promete madurez a cambio de pulpa.',
        options: [
            {
                text: 'Dar 8 ❤️ máx. (empiezas cada combate con +2 de Madurez)',
                effect: (p) => {
                    p.maxHp = Math.max(10, p.maxHp - 8);
                    p.hp = Math.min(p.hp, p.maxHp);
                    p.permanentStrength = (p.permanentStrength || 0) + 2;
                    return 'Te sientes más madura que nunca. +2 de Madurez en cada combate.';
                }
            },
            { text: 'Alejarse del altar', effect: () => 'Decides no arriesgar tu pulpa.' }
        ]
    },
    {
        id: 'baul_escondido', title: 'Baúl Escondido', icon: '🧰',
        desc: 'Detrás de unas hojas grandes hay un baúl semienterrado. Algo tintinea adentro.',
        options: [
            {
                text: 'Abrirlo con cuidado',
                effect: (p, g) => {
                    if (Math.random() < 0.25) { p.hp = Math.max(1, p.hp - 6); return '¡Era una trampa para ratones! Pierdes 6 ❤️.'; }
                    const gold = (20 + Math.floor(Math.random() * 25)) * g.act;
                    p.gold += gold;
                    return `Encontraste ${gold} de oro.`;
                }
            },
            { text: 'Dejarlo en paz', effect: () => 'Algunos baúles es mejor no abrirlos.' }
        ]
    },
    {
        id: 'arbol_sabio', title: 'Árbol Sabio', icon: '🌳',
        desc: 'Un árbol viejísimo abre los ojos. "Puedo enseñarte… si aguantas la lección."',
        options: [
            {
                text: 'Escuchar la lección (madura 2 cartas al azar y pierdes 10 ❤️)',
                effect: (p, g) => { p.hp = Math.max(1, p.hp - 10); const n = g.upgradeRandom(2); return n.length ? `Aprendiste mucho: ${n.join(' y ')} maduraron.` : 'No tenías nada que aprender.'; }
            },
            { text: 'Dormir a su sombra (recuperas 12 ❤️)', effect: (p) => { p.heal(12); return 'Una siesta fresca. +12 ❤️.'; } }
        ]
    },
    {
        id: 'monton_compost', title: 'Montón de Compost', icon: '🪱',
        desc: 'Un montón humeante de cáscaras viejas. Las lombrices te miran con curiosidad.',
        options: [
            {
                text: 'Enterrar una carta básica (quitas un Golpe o un Jugo)',
                effect: (p, g) => { const n = g.removeRandom(true); return n ? `Enterraste ${n}. Las lombrices están felices.` : 'No te quedan cartas básicas.'; }
            },
            {
                text: 'Hurgar (50%: una reliquia, 50%: un Gusano Interior)',
                effect: (p, g) => {
                    if (Math.random() < 0.5) return g.grantRandomRelic(p);
                    g.addCard('gusano_interior');
                    return 'Sacaste la mano… con un gusano pegado. Recibes Gusano Interior.';
                }
            },
            { text: 'Taparte la nariz y seguir', effect: () => 'Hay cosas que es mejor no oler.' }
        ]
    },
    {
        id: 'gota_rocio', title: 'Gota de Rocío', icon: '💧',
        desc: 'Una gota de rocío gigante refleja tu mazo como un espejo.',
        options: [
            { text: 'Tocar el reflejo (copia 1 carta al azar)', effect: (p, g) => { const n = g.duplicateRandom(); return n ? `Ahora tienes otra ${n}.` : 'El reflejo estaba vacío.'; } },
            { text: 'Beberla (recuperas 8 ❤️)', effect: (p) => { p.heal(8); return 'Fresquita. +8 ❤️.'; } }
        ]
    },
    {
        id: 'puesto_abandonado', title: 'Puesto Abandonado', icon: '🧺', acts: [2, 3],
        desc: 'Un puesto del mercado sin dueño. Hay fruta, una caja registradora… y nadie mirando.',
        options: [
            {
                text: 'Llevarte el oro (+60 oro y una Fruta Magullada)',
                effect: (p, g) => { p.gold += 60; g.addCard('fruta_magullada'); return 'Te llevas el oro, pero la culpa te deja magullada.'; }
            },
            {
                text: 'Ordenar el puesto (madura 1 carta al azar)',
                effect: (p, g) => { const n = g.upgradeRandom(1); return n.length ? `El trabajo honesto madura: ${n[0]}.` : 'Todo ya estaba en orden.'; }
            }
        ]
    },
    {
        id: 'nido_zumbon', title: 'Nido Zumbón', icon: '🐝',
        desc: 'Un nido escondido entre las hojas zumba fuerte. Algo ahí adentro no quiere visitas.',
        options: [
            { text: 'Sacudirlo con un palo (te espera una pelea)', fight: true },
            { text: 'Alejarte despacio', effect: () => 'Te alejas de puntitas. El zumbido se calma.' }
        ]
    },
    {
        id: 'sombra_hambrienta', title: 'Sombra Hambrienta', icon: '👤',
        desc: 'Algo se mueve entre la maleza y no parece nada amigable.',
        options: [
            { text: 'Enfrentarla (te espera una pelea)', fight: true },
            {
                text: 'Ofrecerle 15 de oro para que se vaya',
                locked: (p) => (p.gold < 15 ? 'No te alcanza el oro' : ''),
                effect: (p) => { p.gold -= 15; return 'La sombra toma el oro y desaparece entre los arbustos.'; }
            }
        ]
    },
    {
        id: 'pozo_deseos', title: 'Pozo de los Deseos', icon: '🪙', sprite: 'node_well',
        desc: 'Un pozo de piedra musgosa. El agua brilla como si tuviera algo que ofrecer.',
        options: [
            { text: 'Tirar una moneda y pedir un deseo', well: true },
            { text: 'Seguir de largo', effect: () => 'Decides no tentar tu suerte hoy.' }
        ]
    },
    {
        id: 'trampilla', title: 'Trampilla Podrida', icon: '🕳️', sprite: 'node_mystery',
        desc: 'El suelo suena hueco bajo tus pies. Una trampilla mal cerrada esconde algo debajo.',
        options: [
            { text: 'Asomarte a mirar', dungeon: true },
            { text: 'Pisar con cuidado y seguir de largo', effect: () => 'Decides no arriesgarte a caer.' }
        ]
    },
    {
        id: 'tanque_jugo', title: 'Tanque de Jugo', icon: '🛢️', acts: [3],
        desc: 'Un tanque enorme de jugo concentrado. Una válvula gotea.',
        options: [
            {
                text: 'Darte un chapuzón (+10 ❤️ máx. y pierdes 5 ❤️)',
                effect: (p) => { p.maxHp += 10; p.hp = Math.max(1, p.hp - 5); return 'Sales más jugosa que nunca. +10 ❤️ máx.'; }
            },
            { text: 'Cerrar la válvula (1 reliquia al azar y pierdes 12 ❤️)', effect: (p, g) => { p.hp = Math.max(1, p.hp - 12); return g.grantRandomRelic(p); } }
        ]
    }
];
