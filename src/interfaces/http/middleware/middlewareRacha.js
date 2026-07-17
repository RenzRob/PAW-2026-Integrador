const logger = require('#infraestructura/shared/logger');

/**
 * Registra la conexión del día en cada vista autenticada. Va después de
 * requireAuthWeb, que es quien deja `req.jugadorId`.
 *
 * Se registra en todas las vistas y no sólo en la home: si sólo contara /public/,
 * el que entra directo a /public/jugar perdería la racha aunque jugara todos los
 * días. Es idempotente, así que pasada la primera visita del día no escribe nada.
 *
 * @param {RachaController} rachaController
 * @returns {Function} middleware de Express
 */
function crearMiddlewareRacha(rachaController) {
  return async function registrarRacha(req, res, next) {
    if (!req.jugadorId) return next();

    try {
      await rachaController.registrarConexion(req.jugadorId);
    } catch (err) {
      // La racha es un extra: si falla, el jugador tiene que poder seguir navegando.
      logger.registerLog('warn', `No se pudo registrar la racha: ${err.message}`);
    }

    next();
  };
}

module.exports = crearMiddlewareRacha;
