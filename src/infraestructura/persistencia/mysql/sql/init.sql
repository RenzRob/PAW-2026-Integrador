CREATE TABLE IF NOT EXISTS jugadores (
  id VARCHAR(36) PRIMARY KEY,
  nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(60) NOT NULL,
  email VARCHAR(255) UNIQUE NULL,
  xp INT DEFAULT 0 NOT NULL,
  nivel INT DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS partidas (
  id VARCHAR(36) PRIMARY KEY,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS partida_jugadores (
  partida_id VARCHAR(36) NOT NULL,
  jugador_id VARCHAR(36) NOT NULL,
  puesto TINYINT NOT NULL,
  puntaje_ronda INT NOT NULL,
  delta_global INT NOT NULL,
  PRIMARY KEY (partida_id, jugador_id),
  FOREIGN KEY (partida_id) REFERENCES partidas(id),
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
);

CREATE TABLE IF NOT EXISTS logros_desbloqueados (
  jugador_id VARCHAR(36) NOT NULL,
  logro_id VARCHAR(50) NOT NULL,
  fecha_obtenido DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (jugador_id, logro_id),
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id)
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(50) PRIMARY KEY,
  valor TEXT NOT NULL
);
