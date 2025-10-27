#!/usr/bin/env bash
set -euo pipefail

# stop_network.sh
# Detiene la red y opcionalmente ejecuta limpieza ligera o completa.

PRINT_STEP(){ echo -e "\033[0;34m==>\033[0m $1"; }
PRINT_SUCCESS(){ echo -e "\033[0;32m✅ $1\033[0m"; }
PRINT_WARN(){ echo -e "\033[1;33m⚠️  $1\033[0m"; }

usage(){
  cat <<EOF
Usage: $0 [--clean|-c] [--help]

Options:
  --clean, -c   Run full cleanup (calls ./cleanup.sh)
  --help        Show this help

Behavior:
  - By default this script will STOP the containers using `docker compose stop`
    (this preserves volumes and generated artifacts so you can `start_network.sh`
    or `docker compose up -d` again without re-generating crypto/artifacts).
  - With --clean it will call ./cleanup.sh which removes artifacts (crypto-config,
    channel-artifacts, images, explorer data, etc.). Use with care.
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$ROOT_DIR"


if [ "${1:-}" = "--clean" ] || [ "${1:-}" = "-c" ]; then
  if [ -x ./cleanup.sh ]; then
    PRINT_STEP "Ejecutando limpieza completa (./cleanup.sh)"
    ./cleanup.sh
    PRINT_SUCCESS "Limpieza completa ejecutada"
    exit 0
  else
    PRINT_WARN "cleanup.sh no es ejecutable o no existe. Ejecutando limpieza ligera"
  fi
fi

if [ -f docker/docker-compose.yaml ]; then
  PRINT_STEP "Deteniendo contenedores via docker compose (preserve volumes)..."
  cd docker
  # Usamos `docker compose stop` para detener contenedores sin eliminar volúmenes ni redes
  docker compose stop || true
  cd "$ROOT_DIR"
  PRINT_SUCCESS "Contenedores detenidos (preservando volúmenes y artefactos)"
else
  PRINT_WARN "docker/docker-compose.yaml not found - intentando detener contenedores por nombres conocidos"
  for c in orderer.supplychain.com peer0.producer.supplychain.com peer0.factory.supplychain.com peer0.retailer.supplychain.com peer0.consumer.supplychain.com cli; do
    if docker ps -q -f name="^${c}$" | grep -q .; then
      docker stop "$c" || true
      PRINT_STEP "Detenido $c"
    fi
  done
  PRINT_SUCCESS "Contenedores detenidos por nombres conocidos"
fi

PRINT_SUCCESS "Red detenida (sin eliminar artefactos). Para eliminar artifacts ejecuta: $0 --clean"

exit 0
