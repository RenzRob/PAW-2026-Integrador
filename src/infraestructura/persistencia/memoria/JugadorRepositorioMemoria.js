const Usuario = require('#dominio/Usuario');
const { calcularNivel } = require('#dominio/NivelXP');
const { calcularRacha } = require('#dominio/RachaDiaria');
const logger = require('#infraestructura/shared/logger');

class JugadorRepositorioMemoria {
  constructor() {
    logger.logContext(this);
    this.jugadores = new Map();
    this.puntajes = new Map();
    this.xp = new Map();
    this.historial = new Map(); // jugadorId → [{ fecha, puesto, delta_global, puntaje_ronda }]
    this.logros = new Map(); // jugadorId → [{ logro_id, fecha_obtenido }]
    this.emails = new Map(); // jugadorId → email
    this.config = new Map(); // clave → valor
    this.rachas = new Map(); // jugadorId → { rachaDias, ultimaConexion, popupVisto }
  }

  #racha(jugadorId) {
    if (!this.rachas.has(jugadorId)) {
      this.rachas.set(jugadorId, { rachaDias: 0, ultimaConexion: null, popupVisto: null });
    }

    return this.rachas.get(jugadorId);
  }

  async registrarJugador(jugadorId, nombreUsuario, passwordHash, email = null) {
    logger.logContext(this);
    const jugador = new Usuario(jugadorId, nombreUsuario, passwordHash);

    this.jugadores.set(jugadorId, jugador);
    this.puntajes.set(jugadorId, 0);
    this.xp.set(jugadorId, 0);
    this.historial.set(jugadorId, []);
    this.logros.set(jugadorId, []);
    this.rachas.set(jugadorId, { rachaDias: 0, ultimaConexion: null, popupVisto: null });
    if (email) this.emails.set(jugadorId, email);

    return jugador;
  }

  async obtenerJugador(jugadorId) {
    logger.logContext(this);
    return this.jugadores.get(jugadorId) || null;
  }

  async obtenerJugadorPorNombre(nombreUsuario) {
    logger.logContext(this);
    for (const jugador of this.jugadores.values()) {
      if (jugador.nombreUsuario === nombreUsuario) return jugador;
    }

    return null;
  }

  async obtenerPuntajes() {
    logger.logContext(this);
    return [...this.jugadores.values()]
      .map((j) => ({
        jugadorId: j.jugadorId,
        nombreUsuario: j.nombreUsuario,
        email: this.emails.get(j.jugadorId) || null,
        nivel: calcularNivel(this.xp.get(j.jugadorId) || 0),
        puntajeGlobal: this.puntajes.get(j.jugadorId) || 0,
      }))
      .sort((a, b) => b.puntajeGlobal - a.puntajeGlobal);
  }

  async guardarResultadoPartida(_partidaId, ranking) {
    logger.logContext(this);
    for (const rank of ranking) {
      if (rank.jugadorId.startsWith('bot-')) continue;

      const actual = this.puntajes.get(rank.jugadorId) || 0;
      this.puntajes.set(rank.jugadorId, actual + rank.deltaGlobal);

      const hist = this.historial.get(rank.jugadorId) || [];
      hist.unshift({
        fecha: new Date(),
        puesto: rank.puesto,
        delta_global: rank.deltaGlobal,
        puntaje_ronda: rank.puntaje,
      });
      this.historial.set(rank.jugadorId, hist);
    }
  }

  async obtenerEstadisticasJugador(jugadorId) {
    logger.logContext(this);
    const hist = this.historial.get(jugadorId) || [];
    const partidas = hist.length;
    const victorias = hist.filter((h) => h.puesto === 1).length;
    const xpActual = this.xp.get(jugadorId) || 0;

    return {
      partidas,
      victorias,
      derrotas: partidas - victorias,
      winrate: partidas > 0 ? Math.round((victorias / partidas) * 100) : 0,
      puntajeGlobal: this.puntajes.get(jugadorId) || 0,
      xp: xpActual,
      nivel: calcularNivel(xpActual),
    };
  }

  async obtenerHistorialPartidas(jugadorId, limit = 10) {
    logger.logContext(this);
    const hist = this.historial.get(jugadorId) || [];
    return hist.slice(0, limit);
  }

  async obtenerLogrosDesbloqueados(jugadorId) {
    logger.logContext(this);
    return this.logros.get(jugadorId) || [];
  }

  async desbloquearLogros(jugadorId, logroIds) {
    logger.logContext(this);
    const existentes = this.logros.get(jugadorId) || [];
    const existentesIds = existentes.map((l) => l.logro_id);

    for (const logroId of logroIds) {
      if (!existentesIds.includes(logroId)) {
        existentes.push({ logro_id: logroId, fecha_obtenido: new Date() });
      }
    }

    this.logros.set(jugadorId, existentes);
  }

  async agregarXPyActualizarNivel(jugadorId, xpGanado) {
    logger.logContext(this);
    if (xpGanado <= 0) return;

    const actual = this.xp.get(jugadorId) || 0;
    this.xp.set(jugadorId, actual + xpGanado);
  }

  async obtenerRacha(jugadorId) {
    logger.logContext(this);
    return { ...this.#racha(jugadorId) };
  }

  async registrarConexion(jugadorId, hoy) {
    logger.logContext(this);
    const racha = this.#racha(jugadorId);

    racha.rachaDias = calcularRacha(racha.rachaDias, racha.ultimaConexion, hoy);
    racha.ultimaConexion = hoy;

    return { rachaDias: racha.rachaDias, ultimaConexion: racha.ultimaConexion };
  }

  async marcarPopupVisto(jugadorId, hoy) {
    logger.logContext(this);
    const racha = this.#racha(jugadorId);
    if (racha.popupVisto === hoy) return false;

    racha.popupVisto = hoy;

    return true;
  }

  async obtenerConfig(clave) {
    logger.logContext(this);
    return this.config.get(clave) ?? null;
  }

  async guardarConfig(clave, valor) {
    logger.logContext(this);
    this.config.set(clave, valor);
  }

  async eliminarJugador(jugadorId) {
    logger.logContext(this);
    this.jugadores.delete(jugadorId);
    this.puntajes.delete(jugadorId);
    this.xp.delete(jugadorId);
    this.historial.delete(jugadorId);
    this.logros.delete(jugadorId);
    this.emails.delete(jugadorId);
    this.rachas.delete(jugadorId);
  }

  async obtenerPosicionRanking(jugadorId) {
    logger.logContext(this);
    const ranking = await this.obtenerPuntajes();
    const idx = ranking.findIndex((r) => r.jugadorId === jugadorId);
    return idx >= 0 ? idx + 1 : null;
  }
}

module.exports = new JugadorRepositorioMemoria();
