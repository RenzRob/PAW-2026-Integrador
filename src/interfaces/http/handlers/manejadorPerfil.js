const express = require('express');
const logger = require('#infraestructura/shared/logger');

class ManejadorPerfil {
  constructor(perfilController) {
    logger.logContext(this);
    this.perfilController = perfilController;
    this.router = express.Router();
    this.#registrarRutas();
  }

  #registrarRutas() {
    logger.logContext(this);

    // GET /api/perfil — perfil del jugador autenticado
    this.router.get('/', async (req, res) => {
      const result = await this.perfilController.obtenerPerfil(req.jugadorId);
      if (!result.ok) return res.status(result.status).json({ error: result.error });
      res.json(result.data);
    });

    // GET /api/perfil/:jugadorId — perfil de cualquier jugador (público)
    this.router.get('/:jugadorId', async (req, res) => {
      const result = await this.perfilController.obtenerPerfil(req.params.jugadorId);
      if (!result.ok) return res.status(result.status).json({ error: result.error });
      res.json(result.data);
    });
  }
}

module.exports = ManejadorPerfil;
