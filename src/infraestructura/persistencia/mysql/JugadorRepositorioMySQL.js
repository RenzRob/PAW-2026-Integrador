const pool = require('#infraestructura/persistencia/mysql/conexion');
const Usuario = require('#dominio/Usuario');
const { calcularNivel } = require('#dominio/NivelXP');
const logger = require('#infraestructura/shared/logger');

class JugadorRepositorioMySQL {
  async registrarJugador(jugadorId, nombreUsuario, passwordHash, email = null) {
    logger.logContext(this);
    try {
      await pool.execute(
        'INSERT INTO jugadores (id, nombre_usuario, password_hash, email) VALUES (?, ?, ?, ?)',
        [jugadorId, nombreUsuario, passwordHash, email || null]
      );
    } catch (err) {
      if (err.errno === 1062) {
        const domainError = new Error('El email ya está en uso');
        domainError.code = 'EMAIL_DUPLICADO';
        throw domainError;
      }
      throw err;
    }

    return new Usuario(jugadorId, nombreUsuario, passwordHash);
  }

  async obtenerJugador(jugadorId) {
    logger.logContext(this);
    const [rows] = await pool.execute(
      'SELECT id, nombre_usuario, password_hash FROM jugadores WHERE id = ?',
      [jugadorId]
    );

    if (!rows.length) return null;

    return new Usuario(rows[0].id, rows[0].nombre_usuario, rows[0].password_hash);
  }

  async obtenerJugadorPorNombre(nombreUsuario) {
    logger.logContext(this);
    const [rows] = await pool.execute(
      'SELECT id, nombre_usuario, password_hash FROM jugadores WHERE nombre_usuario = ?',
      [nombreUsuario]
    );

    if (!rows.length) return null;

    return new Usuario(rows[0].id, rows[0].nombre_usuario, rows[0].password_hash);
  }

  async obtenerPuntajes() {
    logger.logContext(this);
    const [rows] = await pool.execute(`
      SELECT j.id AS jugadorId, j.nombre_usuario AS nombreUsuario,
             j.email AS email,
             j.nivel AS nivel,
             COALESCE(SUM(pj.delta_global), 0) AS puntajeGlobal
      FROM jugadores j
      LEFT JOIN partida_jugadores pj ON j.id = pj.jugador_id
      GROUP BY j.id, j.nombre_usuario, j.email, j.nivel
      ORDER BY puntajeGlobal DESC
    `);

    return rows;
  }

  async guardarResultadoPartida(partidaId, ranking) {
    logger.logContext(this);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('INSERT INTO partidas (id, estado) VALUES (?, ?)', [
        partidaId,
        'terminada',
      ]);

      for (const r of ranking) {
        if (r.jugadorId.startsWith('bot-')) continue;

        await conn.execute(
          'INSERT INTO partida_jugadores (partida_id, jugador_id, puesto, puntaje_ronda, delta_global) VALUES (?, ?, ?, ?, ?)',
          [partidaId, r.jugadorId, r.puesto, r.puntaje, r.deltaGlobal]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async obtenerEstadisticasJugador(jugadorId) {
    logger.logContext(this);
    const [[statsRow]] = await pool.execute(
      `SELECT
         COUNT(pj.partida_id) AS partidas,
         SUM(CASE WHEN pj.puesto = 1 THEN 1 ELSE 0 END) AS victorias,
         COALESCE(SUM(pj.delta_global), 0) AS puntajeGlobal
       FROM partida_jugadores pj
       WHERE pj.jugador_id = ?`,
      [jugadorId]
    );

    const [[jugadorRow]] = await pool.execute(
      'SELECT xp, nivel, foto_path FROM jugadores WHERE id = ?',
      [jugadorId]
    );

    const partidas = Number(statsRow.partidas) || 0;
    const victorias = Number(statsRow.victorias) || 0;

    return {
      partidas,
      victorias,
      derrotas: partidas - victorias,
      winrate: partidas > 0 ? Math.round((victorias / partidas) * 100) : 0,
      puntajeGlobal: Number(statsRow.puntajeGlobal) || 0,
      xp: jugadorRow?.xp ?? 0,
      nivel: jugadorRow?.nivel ?? 1,
      fotoPath: jugadorRow?.foto_path ?? null,
    };
  }

  async obtenerHistorialPartidas(jugadorId, limit = 10) {
    logger.logContext(this);
    // mysql2 (prepared statements) no acepta `LIMIT ?`; interpolamos un
    // entero ya saneado (seguro contra inyección al forzarlo a número).
    const lim = Number.isInteger(limit) && limit > 0 ? limit : 10;
    const [rows] = await pool.execute(
      `SELECT p.fecha, pj.puesto, pj.delta_global, pj.puntaje_ronda
       FROM partida_jugadores pj
       JOIN partidas p ON pj.partida_id = p.id
       WHERE pj.jugador_id = ?
       ORDER BY p.fecha DESC
       LIMIT ${lim}`,
      [jugadorId]
    );

    return rows;
  }

  async obtenerLogrosDesbloqueados(jugadorId) {
    logger.logContext(this);
    const [rows] = await pool.execute(
      'SELECT logro_id, fecha_obtenido FROM logros_desbloqueados WHERE jugador_id = ? ORDER BY fecha_obtenido ASC',
      [jugadorId]
    );

    return rows;
  }

  async desbloquearLogros(jugadorId, logroIds) {
    logger.logContext(this);
    for (const logroId of logroIds) {
      await pool.execute(
        'INSERT IGNORE INTO logros_desbloqueados (jugador_id, logro_id) VALUES (?, ?)',
        [jugadorId, logroId]
      );
    }
  }

  async agregarXPyActualizarNivel(jugadorId, xpGanado) {
    logger.logContext(this);
    if (xpGanado <= 0) return;

    const [[row]] = await pool.execute(
      'SELECT xp FROM jugadores WHERE id = ?',
      [jugadorId]
    );

    if (!row) return;

    const nuevoXP = (row.xp || 0) + xpGanado;
    const nuevoNivel = calcularNivel(nuevoXP);

    await pool.execute(
      'UPDATE jugadores SET xp = ?, nivel = ? WHERE id = ?',
      [nuevoXP, nuevoNivel, jugadorId]
    );
  }

  async actualizarFotoPath(jugadorId, filename) {
    logger.logContext(this);
    await pool.execute('UPDATE jugadores SET foto_path = ? WHERE id = ?', [filename, jugadorId]);
  }

  // Las fechas se leen con DATE_FORMAT en vez de configurar `dateStrings` en el pool:
  // el pool es compartido y devolver strings rompería `fecha` en el historial de partidas.
  async obtenerRacha(jugadorId) {
    logger.logContext(this);
    const [[row]] = await pool.execute(
      `SELECT racha_dias AS rachaDias,
              DATE_FORMAT(ultima_conexion, '%Y-%m-%d') AS ultimaConexion,
              DATE_FORMAT(popup_visto, '%Y-%m-%d') AS popupVisto
       FROM jugadores WHERE id = ?`,
      [jugadorId]
    );

    if (!row) return { rachaDias: 0, ultimaConexion: null, popupVisto: null };

    return {
      rachaDias: Number(row.rachaDias) || 0,
      ultimaConexion: row.ultimaConexion,
      popupVisto: row.popupVisto,
    };
  }

  /**
   * Registra la conexión de hoy y actualiza la racha. El cálculo va en SQL y el
   * WHERE la vuelve idempotente por día: dos pestañas abriendo a la vez no pueden
   * incrementar dos veces y saltearse un premio.
   */
  async registrarConexion(jugadorId, hoy) {
    logger.logContext(this);
    await pool.execute(
      `UPDATE jugadores
          SET racha_dias = CASE WHEN ultima_conexion = DATE_SUB(?, INTERVAL 1 DAY)
                                THEN racha_dias + 1 ELSE 1 END,
              ultima_conexion = ?
        WHERE id = ? AND (ultima_conexion IS NULL OR ultima_conexion <> ?)`,
      [hoy, hoy, jugadorId, hoy]
    );

    const { rachaDias, ultimaConexion } = await this.obtenerRacha(jugadorId);

    return { rachaDias, ultimaConexion };
  }

  async marcarPopupVisto(jugadorId, hoy) {
    logger.logContext(this);
    const [res] = await pool.execute(
      `UPDATE jugadores SET popup_visto = ?
        WHERE id = ? AND (popup_visto IS NULL OR popup_visto <> ?)`,
      [hoy, jugadorId, hoy]
    );

    // Sin CLIENT_FOUND_ROWS, affectedRows cuenta filas cambiadas: > 0 sólo si este
    // request fue el primero del día.
    return res.affectedRows > 0;
  }

  async obtenerConfig(clave) {
    logger.logContext(this);
    const [[row]] = await pool.execute('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
    return row?.valor ?? null;
  }

  async guardarConfig(clave, valor) {
    logger.logContext(this);
    await pool.execute(
      'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
      [clave, valor, valor]
    );
  }

  async obtenerPosicionRanking(jugadorId) {
    logger.logContext(this);
    const [rows] = await pool.execute(`
      SELECT j.id,
             RANK() OVER (ORDER BY COALESCE(SUM(pj.delta_global), 0) DESC) AS posicion
      FROM jugadores j
      LEFT JOIN partida_jugadores pj ON j.id = pj.jugador_id
      GROUP BY j.id
    `);

    const fila = rows.find((r) => r.id === jugadorId);
    return fila ? Number(fila.posicion) : null;
  }
}

module.exports = new JugadorRepositorioMySQL();
