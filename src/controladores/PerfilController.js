const { DEFINICIONES_LOGROS } = require('#dominio/Logros');
const { xpParaNivel, xpEnNivelActual, xpTotalDelNivel } = require('#dominio/NivelXP');
const logger = require('#infraestructura/shared/logger');

class PerfilController {
  constructor(persistencia) {
    logger.logContext(this);
    this.persistencia = persistencia;
  }

  async obtenerPerfil(jugadorId) {
    logger.logContext(this);

    const jugador = await this.persistencia.obtenerJugador(jugadorId);
    if (!jugador) return { ok: false, status: 404, error: 'Jugador no encontrado' };

    const [stats, historial, logrosDesbloqueados] = await Promise.all([
      this.persistencia.obtenerEstadisticasJugador(jugadorId),
      this.persistencia.obtenerHistorialPartidas(jugadorId, 10),
      this.persistencia.obtenerLogrosDesbloqueados(jugadorId),
    ]);

    const idsDesbloqueados = logrosDesbloqueados.map((l) => l.logro_id);
    const fechasPorId = Object.fromEntries(
      logrosDesbloqueados.map((l) => [l.logro_id, l.fecha_obtenido])
    );

    const logros = DEFINICIONES_LOGROS.map((def) => ({
      ...def,
      desbloqueado: idsDesbloqueados.includes(def.id),
      fechaObtenido: fechasPorId[def.id] || null,
    }));

    const nivelActual = stats.nivel;
    const xpActual = stats.xp;
    const xpInicioNivel = xpParaNivel(nivelActual);
    const xpFinNivel = xpParaNivel(nivelActual + 1);
    const xpEnNivel = xpEnNivelActual(nivelActual, xpActual);
    const xpDelNivel = xpTotalDelNivel(nivelActual);
    const progresoNivel = xpDelNivel > 0 ? Math.round((xpEnNivel / xpDelNivel) * 100) : 100;

    return {
      ok: true,
      data: {
        nombreUsuario: jugador.nombreUsuario,
        stats,
        xpInfo: {
          xpActual,
          xpInicioNivel,
          xpFinNivel,
          xpEnNivel,
          xpDelNivel,
          progresoNivel,
        },
        historial,
        logros,
      },
    };
  }
}

module.exports = PerfilController;
