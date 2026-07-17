const express = require('express');
const multer = require('multer');
const fs = require('fs');
const logger = require('#infraestructura/shared/logger');

const AVATARS_DIR = process.env.AVATARS_DIR || '/data/avatars';
fs.mkdirSync(AVATARS_DIR, { recursive: true });

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, _file, cb) => cb(null, req.jugadorId + '.' + MIME_EXT[_file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Solo se permiten imágenes JPEG, PNG, WEBP o GIF');
    err.status = 400;
    cb(err);
  },
});

function subirAvatar(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

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
      try {
        const result = await this.perfilController.obtenerPerfil(req.jugadorId);
        if (!result.ok) return res.status(result.status).json({ error: result.error });
        res.json(result.data);
      } catch (err) {
        logger.registerLog('error', `Error en GET /api/perfil: ${err.message}`);
        res.status(500).json({ error: 'Error al obtener el perfil' });
      }
    });

    // POST /api/perfil/avatar — sube o reemplaza la foto de perfil del jugador autenticado
    this.router.post('/avatar', async (req, res) => {
      try {
        await subirAvatar(req, res);
      } catch (err) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.status || 400);
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen no puede superar los 2 MB'
          : err.message;
        return res.status(status).json({ error: message });
      }

      if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

      try {
        await this.perfilController.actualizarFoto(req.jugadorId, req.file.filename);
        res.json({ fotoUrl: `/avatars/${req.file.filename}` });
      } catch (err) {
        logger.registerLog('error', `Error en POST /api/perfil/avatar: ${err.message}`);
        res.status(500).json({ error: 'Error al guardar la foto' });
      }
    });

    // GET /api/perfil/:jugadorId — perfil de cualquier jugador (público)
    this.router.get('/:jugadorId', async (req, res) => {
      try {
        const result = await this.perfilController.obtenerPerfil(req.params.jugadorId);
        if (!result.ok) return res.status(result.status).json({ error: result.error });
        res.json(result.data);
      } catch (err) {
        logger.registerLog('error', `Error en GET /api/perfil/${req.params.jugadorId}: ${err.message}`);
        res.status(500).json({ error: 'Error al obtener el perfil' });
      }
    });
  }
}

module.exports = ManejadorPerfil;
