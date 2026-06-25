const express = require('express');
const logger = require('#infraestructura/shared/logger');
const { logContext } = require('#infraestructura/shared/utils');

/**
 * Manejador HTTP de la API REST de puntajes. Expone el endpoint para listar
 * los puntajes acumulados. Delega en PuntajesController y devuelve la lista
 * en JSON o un error 500 si falla la consulta.
 *
 * Endpoints (montado en `/api/puntajes`, público):
 * - `GET /api/puntajes` — lista los puntajes acumulados.
 *
 * @param {import('#controladores/PuntajesController')} controller - Controlador de acceso a puntajes.
 */
class ManejadorPuntajes {
  constructor(controller) {
    logContext(logger, this);
    this.controller = controller;

    this.router = express.Router();

    this.#registrarRutas();
  }

  async listar(req, res) {
    logContext(logger, this);
    try {
      const puntajes = await this.controller.listarPuntajes();
      res.json(puntajes);
    } catch (error) {
      res.status(500).json({ error: 'Error al cargar puntajes.' });
    }
  }

  #registrarRutas() {
    logContext(logger, this);

    this.router.get('/', (req, res) => this.listar(req, res));
  }
}

module.exports = ManejadorPuntajes;
