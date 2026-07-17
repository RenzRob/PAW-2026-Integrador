// Ciclo de recompensas por conectarse días consecutivos. Se reinicia cada 5 días:
// la racha sigue creciendo, pero el día del ciclo vuelve a 1 (racha 6 => día 1).
const CICLO_DIAS = 5;
const DIA_BOOST_XP = 3;
const MULTIPLICADOR_XP = 1.5;
const DIA_BONUS_PUNTOS = 5;
const MULTIPLICADOR_PUNTOS = 1.1;

const SIN_RECOMPENSAS = Object.freeze({ boostXP: 1, bonusPuntos: 1 });

// El juego es argentino y el server corre en UTC: entre las 21:00 y la medianoche
// de Buenos Aires las dos fechas difieren y la racha se cortaría de más.
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

// 'en-CA' formatea como 'YYYY-MM-DD', que ordena y compara como string.
const formateador = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA });

// Fecha civil de hoy en Argentina, como 'YYYY-MM-DD'.
function fechaHoyArg() {
  return formateador.format(new Date());
}

// Día calendario anterior a una fecha 'YYYY-MM-DD'. Opera sobre fechas civiles en
// UTC (no sobre instantes), así que los cambios de huso horario no la afectan.
function fechaAnterior(fechaStr) {
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() - 1);

  return fecha.toISOString().slice(0, 10);
}

function esAyer(fechaStr, hoyStr) {
  if (!fechaStr) return false;
  return fechaStr === fechaAnterior(hoyStr);
}

/**
 * Racha que le corresponde al jugador al registrar una conexión.
 * @param {number} rachaDias - días consecutivos acumulados hasta ahora
 * @param {string|null} ultimaConexion - 'YYYY-MM-DD' o null si nunca se conectó
 * @param {string} hoy - 'YYYY-MM-DD'
 * @returns {number} racha ya actualizada (si faltó un día, vuelve a 1)
 */
function calcularRacha(rachaDias, ultimaConexion, hoy) {
  if (ultimaConexion === hoy) return rachaDias;
  if (esAyer(ultimaConexion, hoy)) return rachaDias + 1;

  return 1;
}

/**
 * Posición dentro del ciclo de 5 días.
 * @param {number} rachaDias
 * @returns {number} 1..5, o 0 si el jugador todavía no tiene racha
 */
function diaDelCiclo(rachaDias) {
  // El % de JS conserva el signo del dividendo, así que sin este guard una racha
  // en 0 (el estado de todos los jugadores al migrar) daría día 0.
  if (rachaDias <= 0) return 0;

  return ((rachaDias - 1) % CICLO_DIAS) + 1;
}

/**
 * Multiplicadores activos hoy. Exige que el jugador se haya conectado hoy: una
 * partida que arranca el día 3 y termina pasada la medianoche cobra lo del día en
 * que termina, no lo del día en que empezó.
 * @param {number} rachaDias
 * @param {string|null} ultimaConexion - 'YYYY-MM-DD'
 * @param {string} hoy - 'YYYY-MM-DD'
 * @returns {{ boostXP: number, bonusPuntos: number }} 1 = sin recompensa
 */
function recompensasDeRacha(rachaDias, ultimaConexion, hoy) {
  if (ultimaConexion !== hoy) return SIN_RECOMPENSAS;

  const dia = diaDelCiclo(rachaDias);

  return {
    boostXP: dia === DIA_BOOST_XP ? MULTIPLICADOR_XP : 1,
    bonusPuntos: dia === DIA_BONUS_PUNTOS ? MULTIPLICADOR_PUNTOS : 1,
  };
}

/**
 * Cuánto falta para el próximo premio del ciclo, para mostrarlo en el pop up.
 * @param {number} rachaDias
 * @returns {{ dias: number, tipo: 'xp'|'puntos' }} dias 0 = el premio es hoy
 */
function diasHastaProximaRecompensa(rachaDias) {
  const dia = diaDelCiclo(rachaDias);

  if (dia === DIA_BOOST_XP) return { dias: 0, tipo: 'xp' };
  if (dia === DIA_BONUS_PUNTOS) return { dias: 0, tipo: 'puntos' };
  if (dia < DIA_BOOST_XP) return { dias: DIA_BOOST_XP - dia, tipo: 'xp' };

  return { dias: DIA_BONUS_PUNTOS - dia, tipo: 'puntos' };
}

module.exports = {
  CICLO_DIAS,
  DIA_BOOST_XP,
  MULTIPLICADOR_XP,
  DIA_BONUS_PUNTOS,
  MULTIPLICADOR_PUNTOS,
  fechaHoyArg,
  esAyer,
  calcularRacha,
  diaDelCiclo,
  recompensasDeRacha,
  diasHastaProximaRecompensa,
};
