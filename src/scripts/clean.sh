#!/bin/bash
# Limpieza rápida de la red y nodos Besu
# Autor: David Perez Sanchez
# Fecha: 2025-09-13

set -euo pipefail

RED_DOCKER="mynet-network"
LABEL_RED="network=mynet-network"

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


# Eliminar datos locales
# Calcular la ruta absoluta del directorio de redes basado en la ubicación del script
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
NETWORKS_DIR="$SCRIPT_DIR/networks"
if [ -d "$NETWORKS_DIR" ]; then
  echo "🧹 Eliminando estructura de directorios de redes..."
  rm -rf "$NETWORKS_DIR"
fi

echo "✔️ Limpieza completada."

# Mostrar resumen de limpieza
echo -e "\n==============================="
echo "🧹 RESUMEN DE LIMPIEZA DE RED"
echo "==============================="
echo "Nombre de la red eliminada: $RED_DOCKER"
echo "Subnet: (ver config de despliegue)"
echo "Contenedores eliminados: $CONTAINERS"
echo "Directorio de redes eliminado: $NETWORKS_DIR"
echo "✔️ Todos los recursos de la red han sido limpiados."
