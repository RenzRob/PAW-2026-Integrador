#!/usr/bin/env bash
set -euo pipefail

# Sitúa al usuario en la misma carpeta de este script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[run.sh] Instalando dependencias..."
npm ci

echo "[run.sh] Levantando docker compose..."
docker compose --env-file .env up --build
