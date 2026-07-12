const logger = require('#infraestructura/shared/logger');
/** @typedef {import('../../dominio/Usuario')} Usuario */

class Persistencia {
  /** @type {Map<string, Sala>} partidas - Mapa de partidas activas en memoria, indexadas por su ID. */
  partidas;

  /** Interfaz para JugadorRepositorioMySQL y JugadorRepositorioMemoria. */
  repositorio;

  constructor() {
    logger.logContext(this);
    this.repositorio = process.env.DB_HOST
      ? require('#infraestructura/persistencia/mysql/JugadorRepositorioMySQL')
      : require('#infraestructura/persistencia/memoria/JugadorRepositorioMemoria');
    this.partidas = new Map();
  }

  /* ── Jugadores ─────────────────────────────────────────────────────────── */

  registrarJugador(jugadorId, nombreUsuario, passwordHash, email = null) {
    logger.logContext(this);
    return this.repositorio.registrarJugador(jugadorId, nombreUsuario, passwordHash, email);
  }

  obtenerJugador(jugadorId) {
    logger.logContext(this);
    return this.repositorio.obtenerJugador(jugadorId);
  }

  obtenerJugadorPorNombre(nombreUsuario) {
    logger.logContext(this);
    return this.repositorio.obtenerJugadorPorNombre(nombreUsuario);
  }

  /* ── Puntajes y partidas ────────────────────────────────────────────────── */

  obtenerPuntajes() {
    logger.logContext(this);
    return this.repositorio.obtenerPuntajes();
  }

  guardarResultadoPartida(partidaId, ranking) {
    logger.logContext(this);
    return this.repositorio.guardarResultadoPartida(partidaId, ranking);
  }

  /* ── Perfil ─────────────────────────────────────────────────────────────── */

  obtenerEstadisticasJugador(jugadorId) {
    logger.logContext(this);
    return this.repositorio.obtenerEstadisticasJugador(jugadorId);
  }

  obtenerHistorialPartidas(jugadorId, limit = 10) {
    logger.logContext(this);
    return this.repositorio.obtenerHistorialPartidas(jugadorId, limit);
  }

  obtenerLogrosDesbloqueados(jugadorId) {
    logger.logContext(this);
    return this.repositorio.obtenerLogrosDesbloqueados(jugadorId);
  }

  desbloquearLogros(jugadorId, logroIds) {
    logger.logContext(this);
    return this.repositorio.desbloquearLogros(jugadorId, logroIds);
  }

  agregarXPyActualizarNivel(jugadorId, xpGanado) {
    logger.logContext(this);
    return this.repositorio.agregarXPyActualizarNivel(jugadorId, xpGanado);
  }

  obtenerPosicionRanking(jugadorId) {
    logger.logContext(this);
    return this.repositorio.obtenerPosicionRanking(jugadorId);
  }

  /* ── Partidas en memoria ────────────────────────────────────────────────── */

  guardarPartida(partidaId, sala) {
    logger.logContext(this);
    this.partidas.set(partidaId, sala);
  }

  obtenerPartida(partidaId) {
    logger.logContext(this);
    return this.partidas.get(partidaId) || null;
  }

  eliminarPartida(partidaId) {
    logger.logContext(this);
    this.partidas.delete(partidaId);
  }

  listarPartidasDisponibles() {
    logger.logContext(this);
    return [...this.partidas.values()]
      .filter((s) => s.estado === 'esperando')
      .map((s) => s.resumenPublico());
  }

  jugadorEstaEnPartida(jugadorId) {
    logger.logContext(this);
    for (const sala of this.partidas.values()) {
      if (sala.jugadores.some((j) => !j.esBot && j.jugadorId === jugadorId)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = new Persistencia();
