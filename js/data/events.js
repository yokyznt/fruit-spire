// ============================================================
// EVENTS.JS — Eventos de casillas misteriosas
// Para agregar uno nuevo: agrega un objeto al arreglo EVENT_DB.
//
// Campos:
//   id, title, icon, desc
//   options: arreglo de { text, effect(player, game) }
// ============================================================

window.EVENT_DB = [
    {
        id: 'fuente_magica',
        title: 'Fuente Mágica',
        icon: '⛲',
        desc: 'Encuentras una fuente burbujeante de jugo brillante. ¿Bebes?',
        options: [
            {
                text: 'Beber (recuperas 15 HP)',
                effect: (player) => { player.heal(15); return 'Sentiste una energía cálida recorrerte. +15 HP.'; }
            },
            {
                text: 'No arriesgarse',
                effect: () => 'Sigues tu camino sin tocar nada raro.'
            }
        ]
    },
    {
        id: 'comerciante_misterioso',
        title: 'Comerciante Misterioso',
        icon: '🎭',
        desc: 'Una figura encapuchada te ofrece una reliquia a cambio de oro.',
        options: [
            {
                text: 'Pagar 35 oro por una reliquia al azar',
                effect: (player, game) => {
                    if (player.gold < 35) return 'No traes suficiente oro.';
                    player.gold -= 35;
                    return game.grantRandomRelic(player);
                }
            },
            {
                text: 'Rechazar la oferta',
                effect: () => 'El comerciante desaparece entre las sombras.'
            }
        ]
    },
    {
        id: 'trampa_espinas',
        title: 'Trampa de Espinas',
        icon: '🌵',
        desc: 'Pisas una trampa oculta entre las hojas.',
        options: [
            {
                text: 'Forcejear (pierdes 10 HP)',
                effect: (player) => { player.hp = Math.max(1, player.hp - 10); return 'Te liberas, pero te costó 10 HP.'; }
            },
            {
                text: 'Pagar 15 oro para que alguien te ayude',
                effect: (player) => {
                    if (player.gold < 15) {
                        player.hp = Math.max(1, player.hp - 10);
                        return 'No traes oro y las espinas te lastiman igual (-10 HP).';
                    }
                    player.gold -= 15;
                    return 'Un viajero te ayuda a salir sin heridas.';
                }
            }
        ]
    },
    {
        id: 'altar_poder',
        title: 'Altar del Sabor',
        icon: '🗿',
        desc: 'Un altar antiguo promete poder a cambio de vitalidad.',
        options: [
            {
                text: 'Sacrificar 10 HP máx. por +3 de Fuerza permanente',
                effect: (player) => {
                    player.maxHp = Math.max(10, player.maxHp - 10);
                    player.hp = Math.min(player.hp, player.maxHp);
                    player.permanentStrength = (player.permanentStrength || 0) + 3;
                    return 'Sientes el poder correr por tus venas. +3 Fuerza permanente.';
                }
            },
            {
                text: 'Alejarse del altar',
                effect: () => 'Decides no arriesgar tu salud.'
            }
        ]
    },
    {
        id: 'baul_escondido',
        title: 'Baúl Escondido',
        icon: '🧰',
        desc: 'Detrás de unas hojas grandes hay un baúl semienterrado.',
        options: [
            {
                text: 'Abrirlo',
                effect: (player) => {
                    const gold = 20 + Math.floor(Math.random() * 25);
                    player.gold += gold;
                    return `Encontraste ${gold} de oro.`;
                }
            }
        ]
    }
];
