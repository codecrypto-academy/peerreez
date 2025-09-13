#!/bin/bash
# Limpieza rápida de la red y nodos Besu
# Autor: David Perez Sanchez
# Fecha: 2025-09-13

set -euo pipefail


# Obtener el nombre de la red como argumento
RED_DOCKER="${1:-}"
if [[ -z "$RED_DOCKER" ]]; then
  echo "Uso: $0 <network-name>"
  exit 1
fi
LABEL_RED="network=${RED_DOCKER}"

# Eliminar contenedores de la red
CONTAINERS=$(docker ps -aq --filter "label=${LABEL_RED}")
if [ -n "$CONTAINERS" ]; then
  echo "🧹 Eliminando contenedores de la red..."
  docker rm -f $CONTAINERS || true
fi

# Eliminar la red Docker
if docker network inspect "$RED_DOCKER" &>/dev/null; then
  echo "🧹 Eliminando red Docker..."
  docker network rm "$RED_DOCKER" || true
fi



# Eliminar solo el directorio de la red específica
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
NETWORK_DIR="$SCRIPT_DIR/networks/$RED_DOCKER"
if [ -d "$NETWORK_DIR" ]; then
  echo "🧹 Eliminando directorio de la red: $NETWORK_DIR ..."
  rm -rf "$NETWORK_DIR"
fi

echo "✔️ Limpieza completada."

# Mostrar resumen de limpieza
echo -e "\n==============================="
echo "🧹 RESUMEN DE LIMPIEZA DE RED"
echo "==============================="
echo "Nombre de la red eliminada: $RED_DOCKER"
echo "Subnet: (ver config de despliegue)"
echo "Contenedores eliminados: $CONTAINERS"
echo "Directorio de red eliminado: $NETWORK_DIR"
echo "✔️ Todos los recursos de la red han sido limpiados."
