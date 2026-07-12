const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const logger = require('#infraestructura/shared/logger');

const NOMBRE_REGEX = /^[a-zA-Z0-9_\-áéíóúñüÁÉÍÓÚÑÜ]{3,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 4;
const BCRYPT_ROUNDS = 10;

class AuthController {
  constructor(persistencia) {
    logger.logContext(this);
    this.persistencia = persistencia;
  }

  async registrar(nombreUsuario, password, email) {
    logger.logContext(this);

    const nombre = nombreUsuario?.trim();
    const clave = password?.trim();
    const correo = email?.trim() || null;

    if (!nombre) return { ok: false, status: 400, error: 'El nombre de usuario es requerido' };

    if (!NOMBRE_REGEX.test(nombre))
      return {
        ok: false,
        status: 400,
        error: 'El nombre de usuario debe tener entre 3 y 50 caracteres (letras, números, _ o -)',
      };

    if (!clave || clave.length < PASSWORD_MIN)
      return {
        ok: false,
        status: 400,
        error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`,
      };

    if (correo && !EMAIL_REGEX.test(correo))
      return { ok: false, status: 400, error: 'El email no tiene un formato válido' };

    if (await this.persistencia.obtenerJugadorPorNombre(nombre))
      return { ok: false, status: 409, error: 'El nombre de usuario ya está en uso' };

    const jugadorId = uuidv4();
    const passwordHash = await bcrypt.hash(clave, BCRYPT_ROUNDS);
    await this.persistencia.registrarJugador(jugadorId, nombre, passwordHash, correo);

    return { ok: true, data: { jugadorId, nombreUsuario: nombre } };
  }

  async ingresar(nombreUsuario, password) {
    logger.logContext(this);

    const nombre = nombreUsuario?.trim();
    const clave = password?.trim();

    if (!nombre) return { ok: false, status: 400, error: 'El nombre de usuario es requerido' };
    if (!clave) return { ok: false, status: 400, error: 'La contraseña es requerida' };

    const jugador = await this.persistencia.obtenerJugadorPorNombre(nombre);

    const credencialesInvalidas = {
      ok: false,
      status: 401,
      error: 'Usuario o contraseña incorrectos',
    };

    if (!jugador) return credencialesInvalidas;

    const passwordOk = await bcrypt.compare(clave, jugador.passwordHash);
    if (!passwordOk) return credencialesInvalidas;

    return {
      ok: true,
      data: { jugadorId: jugador.jugadorId, nombreUsuario: jugador.nombreUsuario },
    };
  }
}

module.exports = AuthController;
