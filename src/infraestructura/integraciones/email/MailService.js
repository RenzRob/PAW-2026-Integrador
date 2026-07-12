const { Resend } = require('resend');
const logger = require('#infraestructura/shared/logger');

class MailService {
  constructor() {
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    this.from = process.env.RESEND_FROM_EMAIL || 'UNO Argentino <noreply@unoargentino.com>';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  estaConfigurado() {
    return this.resend !== null;
  }

  async enviarEmailTop10(nombreUsuario, email, posicion) {
    if (!this.resend) return;

    const medalla = posicion === 1 ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : `#${posicion}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `${medalla} Seguís en el top ${posicion}, ${nombreUsuario} — UNO Argentino`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#8ab3d1;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
    <div style="background:#1a4971;padding:24px;text-align:center;">
      <img src="${this.appUrl}/images/uno-logo.png" alt="UNO Argentino" style="height:60px;"/>
    </div>
    <div style="padding:28px 32px;">
      <h1 style="margin:0 0 8px;color:#1a4971;font-size:1.4rem;">¡Hola, ${nombreUsuario}!</h1>
      <p style="margin:0 0 16px;color:#444;font-size:1rem;">
        Estás en el puesto <strong>${medalla} ${posicion}</strong> del ranking global de UNO Argentino.
        ¡Seguí jugando para no perder tu lugar!
      </p>
      <div style="background:#eaf3fa;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
        <span style="font-size:2.5rem;">${medalla}</span>
        <p style="margin:8px 0 0;font-size:1.1rem;font-weight:bold;color:#1a4971;">Posición ${posicion} del ranking</p>
      </div>
      <a href="${this.appUrl}/public/"
         style="display:block;background:#ffe14b;color:#333;text-decoration:none;text-align:center;
                padding:14px;border-radius:6px;font-weight:bold;font-size:1rem;">
        IR A JUGAR
      </a>
    </div>
    <div style="background:#f5f5f5;padding:12px;text-align:center;">
      <p style="margin:0;font-size:0.75rem;color:#999;">
        Recibís este mail porque estás en el top 10. Para dejar de recibirlos, eliminá tu email desde tu perfil.
      </p>
    </div>
  </div>
</body>
</html>`,
      });
      logger.registerLog('info', `Mail top10 enviado a ${nombreUsuario} (pos ${posicion})`);
    } catch (err) {
      logger.registerLog('error', `Error enviando mail a ${nombreUsuario}: ${err.message}`);
    }
  }
}

module.exports = new MailService();
