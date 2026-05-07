const { createLogger, format, transports } = require('winston');

class Logger {
  constructor() {
    if (Logger._instance) {
      return Logger._instance;
    }

    this._logger = createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
      transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/app.log' }),
      ],
    });

    Logger._instance = this;
  }

  info(message, meta = {}) {
    this._logger.info(message, meta);
  }
  warn(message, meta = {}) {
    this._logger.warn(message, meta);
  }
  error(message, meta = {}) {
    this._logger.error(message, meta);
  }
  debug(message, meta = {}) {
    this._logger.debug(message, meta);
  }
}

module.exports = new Logger();
