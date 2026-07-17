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

async function initDB() {
  logger.registerLog('info', '[DB] Esperando conexión con MySQL...');
  await esperarMySQL();
  logger.registerLog('info', '[DB] Conexión establecida.');

  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'jugadores'"
  );

  if (Number(rows[0].cnt) > 0) {
    logger.registerLog('info', '[DB] Tablas ya existentes, omitiendo init.');
    await pool.execute(
      'ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS foto_path VARCHAR(100) NULL'
    );
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
