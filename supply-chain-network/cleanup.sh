#!/bin/bash

# =============================================================================
# SCRIPT DE LIMPIEZA COMPLETA - SUPPLY CHAIN NETWORK
# =============================================================================
# Limpia completamente el entorno para un nuevo despliegue
# =============================================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "${BLUE}"
echo "================================================================================"
echo "  LIMPIEZA COMPLETA - SUPPLY CHAIN NETWORK"
echo "================================================================================"
echo -e "${NC}"

print_step "Deteniendo contenedores..."
if [ -f "docker/docker-compose.yaml" ]; then
    cd docker
    docker compose down -v 2>/dev/null || true
    cd ..
    print_success "Contenedores detenidos"
else
    print_warning "docker-compose.yaml no encontrado"
fi

print_step "Eliminando contenedores e imágenes de chaincode..."
docker system prune -f 2>/dev/null || true
docker rmi $(docker images --filter "reference=dev-*" -q) 2>/dev/null || true
print_success "Docker limpio"

print_step "Eliminando contenedores e imágenes de Hyperledger Explorer (si existen)..."
# stop and remove explorer containers
for name in explorer explorer-db; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
        docker rm -f "$name" >/dev/null 2>&1 || true
        print_success "Removed container $name"
    else
        print_warning "Container $name not present"
    fi
done
# remove explorer-related images (if present)
EXPL_IMG_IDS=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -E 'hyperledger/explorer|explorer' || true)
if [ -n "$EXPL_IMG_IDS" ]; then
    echo "$EXPL_IMG_IDS" | awk '{print $2}' | xargs -r docker rmi -f || true
    print_success "Explorer images removed"
else
    print_warning "No explorer images found"
fi

print_step "Eliminando datos y artefactos de Explorer (wallets, resolved jsons, db data)..."
rm -rf explorer/wallet explorer/connection-profile.resolved.json explorer/explorer-config.resolved.json explorer_db_data 2>/dev/null || true
print_success "Explorer artifacts removed (if present)"

print_step "Eliminando archivos generados..."
rm -rf crypto-config channel-artifacts *.tar.gz *.block *.tx config bin fabric-samples 2>/dev/null || true
rm -rf wallets 2>/dev/null || true
print_success "Archivos eliminados (incluyendo genesis.block y wallets)"

print_step "Limpiando node_modules del chaincode..."
rm -rf chaincode/supply-chain/node_modules chaincode/supply-chain/dist 2>/dev/null || true
print_success "Node_modules limpio"

print_warning "Hosts en /etc/hosts NO eliminados (pueden ser necesarios para otros proyectos)"
echo "Para eliminar hosts manualmente, ejecuta:"
echo "sudo sed -i '/# Supply Chain Network Hosts/,/127.0.0.1 peer0.consumer.supplychain.com/d' /etc/hosts"

echo ""
echo -e "${GREEN}🧹 Limpieza completa terminada${NC}"
echo -e "${BLUE}🚀 Listo para un nuevo despliegue con ./deploy.sh${NC}"