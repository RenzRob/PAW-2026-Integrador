#!/usr/bin/env bash
# Ejecutar UNA SOLA VEZ en la VM de GCP para obtener el primer certificado TLS.
# Requiere que el dominio Duck DNS ya apunte a la IP de la VM y que el puerto 80 esté abierto.
# Uso: bash init-letsencrypt.sh
set -euo pipefail

if [ -f .env ]; then
  set -a; source .env; set +a
fi

DOMAIN="${DOMAIN:?Error: DOMAIN no está definido en .env}"
EMAIL="${CERTBOT_EMAIL:?Error: CERTBOT_EMAIL no está definido en .env}"

echo "=== Configurando HTTPS para $DOMAIN ==="

# 1. Crear certificado dummy para que nginx pueda arrancar antes de tener el real.
echo "--- Generando certificado dummy..."
docker compose --profile https run --rm certbot sh -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out  /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost' 2>/dev/null
"

# 2. Levantar nginx con el certificado dummy.
echo "--- Iniciando nginx..."
docker compose --profile https up -d nginx
sleep 3

# 3. Obtener el certificado real de Let's Encrypt via webroot challenge.
echo "--- Solicitando certificado real a Let's Encrypt..."
docker compose --profile https run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --rsa-key-size 4096 \
  --agree-tos \
  --force-renewal

# 4. Recargar nginx con el certificado real.
echo "--- Recargando nginx..."
docker compose --profile https exec nginx nginx -s reload

echo "=== ¡Listo! Accedé a https://$DOMAIN ==="
