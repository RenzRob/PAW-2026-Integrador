const express = require('express');
const logger = require('#infraestructura/shared/logger');

/**
 * Endpoints de la racha diaria. Montado bajo /api/racha con requireAuth.
 *
 * - POST /visita : registra la visita a la home y devuelve el estado del ciclo.
 */
class ManejadorRacha {
  constructor(rachaController) {
    logger.logContext(this);
    this.rachaController = rachaController;
    this.router = express.Router();
    this.#registrarRutas();
  }

  async visita(req, res) {
    logger.logContext(this);
    try {
      const result = await this.rachaController.registrarVisitaInicio(req.jugadorId);
      if (!result.ok) return res.status(result.status).json({ error: result.error });
      res.json(result.data);
    } catch (err) {
      logger.registerLog('error', `Error en POST /api/racha/visita: ${err.message}`);
      res.status(500).json({ error: 'Error al obtener la racha' });
    }
  }

  #registrarRutas() {
    logger.logContext(this);
    // POST y no GET: consume el "una vez por día" del pop up. Con GET lo quemaría
    // cualquier prefetch del browser sin llegar a mostrarlo.
    this.router.post('/visita', (req, res) => this.visita(req, res));
  }
}

module.exports = ManejadorRacha;
