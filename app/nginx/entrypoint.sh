#!/bin/sh
set -e

# Sustituye solo las variables propias (DOMAIN, APP_PORT),
# dejando las variables de nginx ($host, $remote_addr, etc.) intactas.
envsubst '${DOMAIN} ${APP_PORT}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

# Recarga el certificado cada 6h para que el renew de certbot tenga efecto.
(while :; do sleep 6h; nginx -s reload 2>/dev/null || true; done) &

exec nginx -g 'daemon off;'
