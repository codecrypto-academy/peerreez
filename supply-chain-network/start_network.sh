#!/usr/bin/env bash
set -euo pipefail

# start_network.sh
# Inicia la red Hyperledger Fabric para este proyecto.
# Si no existen artefactos, ofrece ejecutar ./deploy.sh (full deploy).

PRINT_STEP(){ echo -e "\033[0;34m==>\033[0m $1"; }
PRINT_SUCCESS(){ echo -e "\033[0;32m✅ $1\033[0m"; }
PRINT_WARN(){ echo -e "\033[1;33m⚠️  $1\033[0m"; }

usage(){
  cat <<EOF
Usage: $0 [--full|-f] [--help]

Options:
  --full, -f    Run full deploy (will run ./deploy.sh)
  --help        Show this help

Behavior:
  - If --full is provided the script runs ./deploy.sh which generates
    certificates, genesis block and starts the network.
  - Otherwise, if docker artifacts (crypto-config and channel-artifacts)
    exist, it will do a `docker compose up -d` in the docker/ directory.
  - If required artifacts are missing, it will suggest running with --full.
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

FULL=0
if [ "${1:-}" = "--full" ] || [ "${1:-}" = "-f" ]; then
  FULL=1
fi

ROOT_DIR="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
cd "$ROOT_DIR"

if [ $FULL -eq 1 ]; then
  PRINT_STEP "Ejecutando deploy completo (./deploy.sh)"
  if [ ! -x ./deploy.sh ]; then
    PRINT_WARN "deploy.sh no es ejecutable, intentando ejecutarlo con bash"
    bash ./deploy.sh
  else
    ./deploy.sh
  fi
  PRINT_SUCCESS "Deploy completo finalizado"
  exit 0
fi

# Non-full path: try to start docker compose
if [ ! -d "crypto-config" ] || [ ! -d "channel-artifacts" ]; then
  PRINT_WARN "No se detectaron artefactos (crypto-config or channel-artifacts)."
  PRINT_STEP "Ejecuta: $0 --full   (o corre ./deploy.sh) para generar todos los artefactos y arrancar la red"
  exit 2
fi

if [ ! -f docker/docker-compose.yaml ]; then
  PRINT_WARN "docker/docker-compose.yaml no encontrado"
  exit 3
fi

PRINT_STEP "Iniciando contenedores con docker compose..."
cd docker
docker compose up -d
cd "$ROOT_DIR"

PRINT_SUCCESS "Contenedores iniciados. Revisa con: docker ps"

exit 0
