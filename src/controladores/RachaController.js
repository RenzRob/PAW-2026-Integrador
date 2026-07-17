const {
  CICLO_DIAS,
  DIA_BOOST_XP,
  DIA_BONUS_PUNTOS,
  MULTIPLICADOR_XP,
  MULTIPLICADOR_PUNTOS,
  fechaHoyArg,
  diaDelCiclo,
  recompensasDeRacha,
  diasHastaProximaRecompensa,
} = require('#dominio/RachaDiaria');
const logger = require('#infraestructura/shared/logger');

/**
 * Racha diaria: premia conectarse días consecutivos con un ciclo de 5 días.
 *
 * @param {Persistencia} persistencia
 */
class RachaController {
  constructor(persistencia) {
    logger.logContext(this);
    this.persistencia = persistencia;
  }

  /**
   * Registra que el jugador entró hoy. Idempotente: se llama en cada vista, pero
   * sólo la primera del día mueve la racha.
   */
  async registrarConexion(jugadorId) {
    logger.logContext(this);
    return this.persistencia.registrarConexion(jugadorId, fechaHoyArg());
  }

  /**
   * Estado del ciclo para pintar el pop up. `mostrarPopup` es true una sola vez por
   * día: lo decide la DB, no el cliente, así que un F5 no lo vuelve a abrir.
   */
  async registrarVisitaInicio(jugadorId) {
    logger.logContext(this);
    const hoy = fechaHoyArg();

    // Secuencial y en este orden: los dos son UPDATE sobre la misma fila, y la racha
    // tiene que estar registrada antes de calcular el ciclo que muestra el pop up.
    const { rachaDias } = await this.persistencia.registrarConexion(jugadorId, hoy);
    const mostrarPopup = await this.persistencia.marcarPopupVisto(jugadorId, hoy);

    return {
      ok: true,
      data: {
        rachaDias,
        diaDelCiclo: diaDelCiclo(rachaDias),
        cicloDias: CICLO_DIAS,
        diaBoostXP: DIA_BOOST_XP,
        diaBonusPuntos: DIA_BONUS_PUNTOS,
        multiplicadorXP: MULTIPLICADOR_XP,
        multiplicadorPuntos: MULTIPLICADOR_PUNTOS,
        recompensas: recompensasDeRacha(rachaDias, hoy, hoy),
        proxima: diasHastaProximaRecompensa(rachaDias),
        mostrarPopup,
      },
    };
  }
}

module.exports = RachaController;
