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

# Check local host ports referenced by docker compose and try to free them if occupied
check_and_free_ports() {
    COMPOSE_FILE="docker/docker-compose.yaml"
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_warning "No se encontró $COMPOSE_FILE, omitiendo comprobación de puertos"
        return
    fi

    echo "Analizando puertos en $COMPOSE_FILE..."

    # Extract host ports from explicit docker-compose list entries like:
    #   - 7050:7050
    #   - "7050:7050"
    # This avoids picking up IP:port occurrences like 0.0.0.0:7053 inside env vars.
    ports=$(grep -E '^[[:space:]]*-[[:space:]]*"?[0-9]+:[0-9]+' "$COMPOSE_FILE" | sed -E 's/^[[:space:]"-]*//' | awk -F: '{print $1}' | sort -un)

    if [ -z "$ports" ]; then
        print_warning "No se detectaron puertos expuestos en $COMPOSE_FILE"
        return
    fi

    for p in $ports; do
        # skip empty
        [ -z "$p" ] && continue

        echo "Comprobando puerto $p..."

        # Prefer lsof if disponible
        if command -v lsof >/dev/null 2>&1; then
            pids=$(lsof -t -iTCP:${p} -sTCP:LISTEN 2>/dev/null || true)
        else
            # fallback a ss+awk (may require root to show pids)
            pids=$(ss -ltnp 2>/dev/null | awk -v PORT=":${p}" '$0 ~ PORT { if (match($0, /pid=([0-9]+)/, a)) print a[1] }' | sort -u)
        fi

        if [ -z "$pids" ]; then
            echo "Puerto $p libre"
            continue
        fi

        for pid in $pids; do
            [ -z "$pid" ] && continue
            # Get command name
            proc=$(ps -p $pid -o comm= 2>/dev/null || true)
            echo "Puerto $p está en uso por PID $pid ($proc)"

            # If it's a docker-related process, try to find and stop the container first
            if echo "$proc" | grep -Eiq "docker|containerd|dockerd|docker-proxy"; then
                echo "Proceso docker-detectado ($proc). Buscando contenedor que publica el puerto $p..."
                # Try to find container that maps this host port (heurística sobre 'docker ps' output)
                cid=$(docker ps --format '{{.ID}} {{.Names}} {{.Ports}}' 2>/dev/null | grep -E "[: ]${p}->|:${p}(,|$)" | awk '{print $1}' | head -n1 || true)
                if [ -n "$cid" ]; then
                    cname=$(docker ps --filter "id=$cid" --format '{{.Names}}' 2>/dev/null || true)
                    echo "Deteniendo contenedor $cname ($cid) que publica el puerto $p..."
                    docker rm -f "$cid" >/dev/null 2>&1 || docker stop "$cid" >/dev/null 2>&1 || true
                    sleep 1
                else
                    echo "No se encontró contenedor explícito que publique $p. Intentando terminar PID $pid..."
                fi
            fi

            # Attempt graceful stop, then force
            if kill -0 $pid 2>/dev/null; then
                echo "Enviando SIGTERM a PID $pid..."
                kill -15 $pid 2>/dev/null || true
                # wait a bit
                for i in 1 2 3 4 5; do
                    if ! kill -0 $pid 2>/dev/null; then
                        echo "PID $pid terminado"
                        break
                    fi
                    sleep 1
                done
                if kill -0 $pid 2>/dev/null; then
                    echo "PID $pid sigue vivo, enviando SIGKILL..."
                    kill -9 $pid 2>/dev/null || true
                    sleep 1
                fi
            fi

            if ! kill -0 $pid 2>/dev/null; then
                echo "PID $pid liberado (puerto $p)"
            else
                print_warning "No se pudo liberar PID $pid del puerto $p (chequear permisos)"
            fi
        done
    done
}

echo -e "${BLUE}"
echo "================================================================================"
echo "  LIMPIEZA COMPLETA - SUPPLY CHAIN NETWORK"
echo "================================================================================"
echo -e "${NC}"

# Antes de detener contenedores, comprobar puertos locales y liberar si es necesario
print_step "Comprobando puertos locales en uso y liberando si es necesario..."
check_and_free_ports

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