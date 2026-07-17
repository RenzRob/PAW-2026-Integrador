const fs = require('fs');
const path = require('path');
const pool = require('#infraestructura/persistencia/mysql/conexion');
const logger = require('#infraestructura/shared/logger');

const MAX_REINTENTOS = 10;
const ESPERA_MS = 3000;

async function esperarMySQL() {
  for (let i = 1; i <= MAX_REINTENTOS; i++) {
    try {
      await pool.execute('SELECT 1');
      return;
    } catch (err) {
      logger.registerLog('warn', `[DB] MySQL no disponible (intento ${i}/${MAX_REINTENTOS}): ${err.message}`);
      if (i === MAX_REINTENTOS) throw new Error('MySQL no respondió después de varios intentos.');
      await new Promise((r) => setTimeout(r, ESPERA_MS));
    }
  }
}

// Migraciones para bases ya creadas: cuando las tablas existen se omite init.sql,
// así que toda columna agregada después tiene que sumarse también acá o los entornos
// ya desplegados se quedan sin ella.
const COLUMNAS_JUGADORES = [
  ['foto_path', 'VARCHAR(100) NULL'],
  ['racha_dias', 'INT DEFAULT 0 NOT NULL'],
  ['ultima_conexion', 'DATE NULL'],
  ['popup_visto', 'DATE NULL'],
];

async function agregarColumnaSiFalta(tabla, columna, definicion) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [tabla, columna]
  );

  if (Number(rows[0].cnt) > 0) return;

  // El nombre y la definición son constantes del código, nunca entrada del usuario:
  // information_schema no acepta placeholders en un ALTER.
  await pool.query(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
  logger.registerLog('info', `[DB] Columna ${tabla}.${columna} agregada.`);
}

async function initDB() {
  logger.registerLog('info', '[DB] Esperando conexión con MySQL...');
  await esperarMySQL();
  logger.registerLog('info', '[DB] Conexión establecida.');

  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'jugadores'"
  );

  if (Number(rows[0].cnt) > 0) {
    logger.registerLog('info', '[DB] Tablas ya existentes, omitiendo init.');
    for (const [columna, definicion] of COLUMNAS_JUGADORES) {
      await agregarColumnaSiFalta('jugadores', columna, definicion);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(50) PRIMARY KEY,
        valor TEXT NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logros_desbloqueados (
        jugador_id VARCHAR(36) NOT NULL,
        logro_id VARCHAR(50) NOT NULL,
        fecha_obtenido DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (jugador_id, logro_id),
        FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
      )
    `);
    return;
  }

  logger.registerLog('info', '[DB] Inicializando schema...');
  const sql = fs.readFileSync(path.join(__dirname, 'sql/init.sql'), 'utf8');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await pool.query(stmt);
  }

  logger.registerLog('info', '[DB] Schema inicializado correctamente.');
}

module.exports = initDB;
