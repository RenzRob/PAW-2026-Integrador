const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('#infraestructura/shared/logger');
const { logContext } = require('#infraestructura/shared/utils');

/**
 * Manejador HTTP de autenticación. Expone las rutas de registro, ingreso,
 * cierre de sesión y consulta del jugador autenticado (`/me`).
 * Traduce peticiones REST en llamadas al controlador, emite tokens JWT en
 * cookies HTTP-only y devuelve respuestas JSON o códigos de estado apropiados.
 *
 * Endpoints (montado en `/api`):
 * - `GET /api/me` — devuelve el jugador autenticado según la cookie JWT.
 * - `POST /api/registrarse` — registra un nuevo jugador y emite sesión.
 * - `POST /api/ingresar` — inicia sesión y emite cookie JWT.
 * - `POST /api/salir` — cierra sesión y elimina las cookies.
 *
 * @param {import('#controladores/AuthController')} controller - Controlador con la lógica de registro e ingreso.
 */
class ManejadorAuth {
  constructor(controller) {
    logContext(logger, this);
    this.controller = controller;
    this.router = express.Router();
    this.#registrarRutas();
  }

  #emitirToken(res, jugadorId, nombreUsuario) {
    const token = jwt.sign(
      { jugadorId, nombreUsuario },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure });
    res.cookie('nombreUsuario', nombreUsuario, { sameSite: 'strict', secure });
  }

  async registrar(req, res) {
    logContext(logger, this);
    const result = await this.controller.registrar(req.body.nombreUsuario, req.body.password);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    this.#emitirToken(res, result.data.jugadorId, result.data.nombreUsuario);
    res.status(201).json(result.data);
  }

  async ingresar(req, res) {
    logContext(logger, this);
    const result = await this.controller.ingresar(req.body.nombreUsuario, req.body.password);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    this.#emitirToken(res, result.data.jugadorId, result.data.nombreUsuario);
    res.json(result.data);
  }

  salir(req, res) {
    logContext(logger, this);
    res.clearCookie('token');
    res.clearCookie('nombreUsuario');
    res.clearCookie('jugadorId'); // limpia cookie residual de versión anterior
    res.status(204).send();
  }

  me(req, res) {
    logContext(logger, this);
    try {
      const payload = jwt.verify(req.cookies?.token, process.env.JWT_SECRET);
      res.json({ jugadorId: payload.jugadorId, nombreUsuario: payload.nombreUsuario });
    } catch {
      res.status(401).json({ error: 'No autorizado' });
    }
  }

  #registrarRutas() {
    logContext(logger, this);
    this.router.get('/me', (req, res) => this.me(req, res));
    this.router.post('/registrarse', (req, res) => this.registrar(req, res));
    this.router.post('/ingresar', (req, res) => this.ingresar(req, res));
    this.router.post('/salir', (req, res) => this.salir(req, res));
  }
}

module.exports = ManejadorAuth;
