const db = require('../persistencia/Persistencia');

/**
 * Middleware que verifica que el jugador tiene una sesión activa.
 * Lee el jugadorId desde el header X-Jugador-Id o desde req.body.jugadorId.
 * Responde con 401 si no hay sesión válida.
 */
function requireAuth(req, res, next) {
  const jugadorId = req.headers['x-jugador-id'] || req.body?.jugadorId;

  if (!jugadorId || !db.jugadorEstaLogueado(jugadorId)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  next();
}

module.exports = requireAuth;
