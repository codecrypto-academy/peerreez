#!/bin/bash

# Supply Chain Network Management Script
# Gestión de red Hyperledger Fabric para trazabilidad de cadena de suministro

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
CHANNEL_NAME="supply-chain-channel"
CHAINCODE_NAME="supply-chain-cc"
NETWORK_NAME="supply-chain-network"

# Funciones de utilidad
function print_step() {
    echo -e "${GREEN}==== $1 ====${NC}"
}

function print_info() {
    echo -e "${YELLOW}INFO: $1${NC}"
}

function print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

function print_success() {
    echo -e "${BLUE}SUCCESS: $1${NC}"
}

# Función para detectar y limpiar red existente
function cleanup_existing_network() {
    print_step "Detectando y limpiando red existente"
    
    # Verificar si hay contenedores de la red corriendo
    if docker ps -a | grep -q "supplychain"; then
        print_info "Detectados contenedores de supply chain existentes"
        
        # Listar contenedores encontrados
        echo ""
        print_info "Contenedores encontrados:"
        docker ps -a | grep "supplychain" | awk '{print "  - " $NF}' || true
        echo ""
        
        # Detener contenedores corriendo
        print_info "Deteniendo contenedores corriendo..."
        docker ps | grep "supplychain" | awk '{print $1}' | xargs -r docker stop || true
        
        # Remover todos los contenedores relacionados
        print_info "Removiendo contenedores..."
        docker ps -a | grep "supplychain" | awk '{print $1}' | xargs -r docker rm || true
    else
        print_info "No se encontraron contenedores existentes de supply chain"
    fi
    
    # Verificar y remover red Docker si existe
    if docker network ls | grep -q "$NETWORK_NAME"; then
        print_info "Removiendo red Docker existente: $NETWORK_NAME"
        docker network rm "$NETWORK_NAME" || true
    fi
    
    # Verificar y limpiar volúmenes relacionados
    if docker volume ls | grep -q "supply-chain"; then
        print_info "Removiendo volúmenes existentes..."
        docker volume ls | grep "supply-chain" | awk '{print $2}' | xargs -r docker volume rm || true
    fi
    
    # Limpiar contenedores del CLI si existen
    if docker ps -a | grep -q "cli"; then
        print_info "Removiendo contenedor CLI..."
        docker rm -f cli || true
    fi
    
    # Limpiar imágenes de chaincode si existen
    print_info "Limpiando imágenes de chaincode..."
    docker images | grep "supply-chain-cc" | awk '{print $3}' | xargs -r docker rmi -f || true
    
    # Limpiar archivos generados anteriormente
    print_info "Limpiando archivos generados..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    # Intentar limpiar normalmente primero
    if ! rm -rf "$PROJECT_ROOT/crypto-config/ordererOrganizations" 2>/dev/null; then
        print_info "Usando sudo para limpiar archivos con permisos especiales..."
        sudo rm -rf "$PROJECT_ROOT/crypto-config/ordererOrganizations" || true
    fi
    
    if ! rm -rf "$PROJECT_ROOT/crypto-config/peerOrganizations" 2>/dev/null; then
        sudo rm -rf "$PROJECT_ROOT/crypto-config/peerOrganizations" || true
    fi
    
    rm -rf "$PROJECT_ROOT/channel-artifacts" || true
    
    print_success "Limpieza completada"
}

# Función para mostrar ayuda
function show_help() {
    echo ""
    echo "Supply Chain Network Management Script"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo "  up              - Iniciar la red supply chain"
    echo "  down            - Detener y limpiar la red"
    echo "  createChannel   - Crear canal supply-chain"
    echo "  deployCC        - Desplegar chaincode"
    echo "  status          - Ver estado de la red"
    echo "  clean           - Limpiar red existente solamente"
    echo "  help            - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 up                    # Limpiar e iniciar red completa"
    echo "  $0 down                  # Detener red"
    echo "  $0 clean                 # Solo limpiar sin iniciar"
    echo ""
}

# Función para verificar prerrequisitos
function check_prerequisites() {
    print_step "Verificando prerrequisitos"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon no está corriendo"
        exit 1
    fi
    
    # Verificar docker-compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado"
        exit 1
    fi
    
    print_success "Prerrequisitos verificados"
}

# Función principal de limpieza
function network_down() {
    print_step "Deteniendo Supply Chain Network"
    
    cleanup_existing_network
    
    # Limpiar sistema Docker (opcional)
    print_info "Ejecutando limpieza adicional del sistema Docker..."
    docker system prune -f || true
    
    print_success "Red Supply Chain detenida y limpiada completamente"
}

# Función para mostrar estado actual
function show_status() {
    print_step "Estado actual de Supply Chain Network"
    
    echo ""
    print_info "Contenedores relacionados con supply chain:"
    if docker ps -a | grep -q "supplychain\|cli"; then
        docker ps -a | grep "supplychain\|cli" | awk 'BEGIN{print "  CONTAINER ID   IMAGE                     STATUS        PORTS                 NAMES"} {printf "  %-13s %-25s %-13s %-20s %s\n", $1, $2, $7, $NF, $NF}'
    else
        echo "  No hay contenedores de supply chain"
    fi
    
    echo ""
    print_info "Redes Docker relacionadas:"
    if docker network ls | grep -q "$NETWORK_NAME"; then
        docker network ls | grep "$NETWORK_NAME"
    else
        echo "  No hay redes de supply chain"
    fi
    
    echo ""
    print_info "Volúmenes relacionados:"
    if docker volume ls | grep -q "supply-chain"; then
        docker volume ls | grep "supply-chain"
    else
        echo "  No hay volúmenes de supply chain"
    fi
    echo ""
}

# Función para generar certificados
function generate_certificates() {
    print_step "Generando certificados cryptográficos"
    
    # Obtener directorio absoluto del proyecto
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    # Crear directorios necesarios
    mkdir -p "$PROJECT_ROOT/channel-artifacts"
    
    # Verificar que existe el archivo de configuración
    if [ ! -f "$PROJECT_ROOT/crypto-config/crypto-config.yaml" ]; then
        print_error "Archivo crypto-config.yaml no encontrado en $PROJECT_ROOT/crypto-config/"
        exit 1
    fi
    
    # Generar certificados usando cryptogen
    if command -v cryptogen &> /dev/null; then
        print_info "Usando cryptogen local..."
        cd "$PROJECT_ROOT"
        cryptogen generate --config=./crypto-config/crypto-config.yaml --output=./crypto-config
    else
        print_info "Usando cryptogen en contenedor Docker..."
        docker run --rm -v "$PROJECT_ROOT":/work -w /work hyperledger/fabric-tools:latest \
            cryptogen generate --config=./crypto-config/crypto-config.yaml --output=./crypto-config
    fi
    
    # Verificar que se generaron los certificados
    if [ ! -d "$PROJECT_ROOT/crypto-config/ordererOrganizations" ] || [ ! -d "$PROJECT_ROOT/crypto-config/peerOrganizations" ]; then
        print_error "Error al generar certificados"
        exit 1
    fi
    
    print_success "Certificados generados exitosamente"
}

# Función para generar genesis block
function generate_genesis_block() {
    print_step "Generando Genesis Block"
    
    # Obtener directorio absoluto del proyecto
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    export FABRIC_CFG_PATH="$PROJECT_ROOT/configtx"
    
    if command -v configtxgen &> /dev/null; then
        print_info "Usando configtxgen local..."
        cd "$PROJECT_ROOT"
        configtxgen -profile SupplyChainOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
    else
        print_info "Usando configtxgen en contenedor Docker..."
        docker run --rm -v "$PROJECT_ROOT":/work -w /work -e FABRIC_CFG_PATH=/work/configtx hyperledger/fabric-tools:latest \
            configtxgen -profile SupplyChainOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
    fi
    
    print_success "Genesis block generado exitosamente"
}

# Función para iniciar la red
function network_up() {
    print_step "Iniciando Supply Chain Network"
    
    # Limpiar cualquier red existente primero
    cleanup_existing_network
    
    # Generar material cryptográfico
    generate_certificates
    
    # Nota: Ya no generamos genesis block - usamos channel participation
    
    # Obtener directorio absoluto del proyecto
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    # Verificar que los archivos necesarios existen
    
    if [ ! -d "$PROJECT_ROOT/crypto-config/ordererOrganizations" ]; then
        print_error "Certificados del orderer no fueron generados"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/crypto-config/peerOrganizations" ]; then
        print_error "Certificados de peers no fueron generados"
        exit 1
    fi
    
    # Iniciar contenedores
    print_info "Iniciando contenedores Docker..."
    docker-compose -f "$PROJECT_ROOT/docker/docker-compose.yaml" up -d
    
    # Esperar a que los contenedores estén listos
    print_info "Esperando a que la red esté lista..."
    sleep 15
    
    # Verificar estado de contenedores
    print_step "Verificando estado de la red"
    
    # Contar contenedores corriendo
    RUNNING_CONTAINERS=$(docker-compose -f "$PROJECT_ROOT/docker/docker-compose.yaml" ps | grep "Up" | wc -l)
    TOTAL_CONTAINERS=6  # orderer + 4 peers + cli
    
    if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ]; then
        print_success "Todos los contenedores están corriendo exitosamente!"
        echo ""
        print_info "Estado de contenedores:"
        docker-compose -f "$PROJECT_ROOT/docker/docker-compose.yaml" ps
        echo ""
        print_info "Red Supply Chain iniciada en:"
        echo "  • Orderer: orderer.supplychain.com:7050"
        echo "  • Producer: peer0.producer.supplychain.com:7051"
        echo "  • Factory: peer0.factory.supplychain.com:8051"
        echo "  • Retailer: peer0.retailer.supplychain.com:9051"
        echo "  • Consumer: peer0.consumer.supplychain.com:10051"
        echo ""
        print_info "Próximos pasos:"
        echo "  1. ./scripts/network.sh createChannel  # Crear canal supply-chain"
        echo "  2. ./scripts/network.sh deployCC       # Desplegar chaincode"
    else
        print_error "Algunos contenedores fallaron al iniciar"
        echo ""
        print_info "Estado actual:"
        docker-compose -f "$PROJECT_ROOT/docker/docker-compose.yaml" ps
        echo ""
        print_info "Ver logs con: docker-compose -f $PROJECT_ROOT/docker/docker-compose.yaml logs [servicio]"
        exit 1
    fi
}

# Función para verificar imágenes Docker
function check_docker_images() {
    print_step "Verificando imágenes de Hyperledger Fabric"
    
    REQUIRED_IMAGES=("hyperledger/fabric-peer:latest" "hyperledger/fabric-orderer:latest" "hyperledger/fabric-tools:latest")
    
    for image in "${REQUIRED_IMAGES[@]}"; do
        if ! docker image inspect "$image" > /dev/null 2>&1; then
            print_info "Descargando imagen: $image"
            docker pull "$image"
        else
            print_info "Imagen disponible: $image"
        fi
    done
    
    print_success "Todas las imágenes están disponibles"
}

# Procesar argumentos
case "$1" in
    "up")
        check_prerequisites
        check_docker_images
        network_up
        ;;
    "clean")
        check_prerequisites
        cleanup_existing_network
        ;;
    "down")
        check_prerequisites
        network_down
        ;;
    "status")
        show_status
        ;;
    "help" | "-h" | "--help" | "")
        show_help
        ;;
    *)
        print_error "Comando no reconocido: $1"
        show_help
        exit 1
        ;;
esac