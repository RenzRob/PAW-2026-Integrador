const { v4: uuidv4 } = require('uuid');

class AuthController {
  constructor(persistencia) {
    this.persistencia = persistencia;
  }

  async registrar(nombreUsuario) {
    if (!nombreUsuario?.trim()) return { ok: false, status: 400, error: 'nombreUsuario requerido' };

    if (await this.persistencia.obtenerJugadorPorNombre(nombreUsuario))
      return { ok: false, status: 409, error: 'El nombre de usuario ya existe' };

    const jugadorId = uuidv4();
    const nombre = nombreUsuario.trim();
    await this.persistencia.registrarJugador(jugadorId, nombre);

    return { ok: true, data: { jugadorId, nombreUsuario: nombre } };
  }

  async ingresar(nombreUsuario) {
    if (!nombreUsuario?.trim()) return { ok: false, status: 400, error: 'nombreUsuario requerido' };

    const jugador = await this.persistencia.obtenerJugadorPorNombre(nombreUsuario.trim());
    if (!jugador) return { ok: false, status: 404, error: 'Usuario no encontrado' };

    if (this.persistencia.jugadorEstaLogueado(jugador.jugadorId)) {
      return { ok: false, status: 409, error: 'El usuario ya se encuentra logueado' };
    }

    this.persistencia.marcarJugadorLogueado(jugador.jugadorId);

    return {
      ok: true,
      data: { jugadorId: jugador.jugadorId, nombreUsuario: jugador.nombreUsuario },
    };
  }

  async salir(jugadorId) {
    if (!jugadorId?.trim()) return { ok: false, status: 400, error: 'jugadorId requerido' };

    this.persistencia.desmarcarJugadorLogueado(jugadorId.trim());
    return { ok: true };
  }
}

module.exports = AuthController;
