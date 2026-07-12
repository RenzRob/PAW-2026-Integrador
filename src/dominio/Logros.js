const DEFINICIONES_LOGROS = [
  {
    id: 'primera-partida',
    nombre: 'Debutante',
    descripcion: 'Jugaste tu primera partida.',
    emoji: '🎮',
  },
  {
    id: 'primera-victoria',
    nombre: 'Primer triunfo',
    descripcion: 'Ganaste tu primera partida.',
    emoji: '🏆',
  },
  {
    id: 'cinco-victorias',
    nombre: 'En racha',
    descripcion: 'Acumulaste 5 victorias.',
    emoji: '🔥',
  },
  {
    id: 'diez-victorias',
    nombre: 'Dominador',
    descripcion: 'Acumulaste 10 victorias.',
    emoji: '👑',
  },
  {
    id: 'diez-partidas',
    nombre: 'Habitual',
    descripcion: 'Jugaste 10 partidas.',
    emoji: '🃏',
  },
  {
    id: 'cincuenta-partidas',
    nombre: 'Veterano',
    descripcion: 'Jugaste 50 partidas.',
    emoji: '⚔️',
  },
  {
    id: 'top-10',
    nombre: 'Élite',
    descripcion: 'Llegaste al top 10 del ranking global.',
    emoji: '🌟',
  },
  {
    id: 'top-3',
    nombre: 'Podio',
    descripcion: 'Llegaste al top 3 del ranking global.',
    emoji: '🥇',
  },
  {
    id: 'nivel-5',
    nombre: 'Subiendo',
    descripcion: 'Alcanzaste el nivel 5.',
    emoji: '📈',
  },
  {
    id: 'nivel-10',
    nombre: 'Experto',
    descripcion: 'Alcanzaste el nivel 10.',
    emoji: '💎',
  },
  {
    id: 'winrate-50',
    nombre: 'Consistente',
    descripcion: 'Mantenés un winrate mayor al 50% con al menos 5 partidas.',
    emoji: '🎯',
  },
];

/**
 * @param {{ partidas: number, victorias: number, nivel: number }} stats
 * @param {number|null} posicionRanking - 1-indexed; null si no está en el ranking
 * @param {string[]} yaDesbloqueados - IDs de logros que el jugador ya tiene
 * @returns {string[]} IDs de logros a desbloquear ahora
 */
function verificarLogros(stats, posicionRanking, yaDesbloqueados = []) {
  const { partidas = 0, victorias = 0, nivel = 1 } = stats;
  const winrate = partidas > 0 ? victorias / partidas : 0;

  const condiciones = {
    'primera-partida': partidas >= 1,
    'primera-victoria': victorias >= 1,
    'cinco-victorias': victorias >= 5,
    'diez-victorias': victorias >= 10,
    'diez-partidas': partidas >= 10,
    'cincuenta-partidas': partidas >= 50,
    'top-10': posicionRanking != null && posicionRanking <= 10,
    'top-3': posicionRanking != null && posicionRanking <= 3,
    'nivel-5': nivel >= 5,
    'nivel-10': nivel >= 10,
    'winrate-50': partidas >= 5 && winrate >= 0.5,
  };

  return Object.entries(condiciones)
    .filter(([id, cumple]) => cumple && !yaDesbloqueados.includes(id))
    .map(([id]) => id);
}

module.exports = { DEFINICIONES_LOGROS, verificarLogros };
