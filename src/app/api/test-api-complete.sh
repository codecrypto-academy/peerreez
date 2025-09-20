#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables de configuración
NETWORK_NAME="test-api"
CHAIN_ID=2025
SERVER_PORT=3000
SERVER_URL="http://localhost:${SERVER_PORT}"

echo -e "${CYAN}🚀 Iniciando test completo de API Control Panel Besu${NC}"
echo -e "${CYAN}======================================================${NC}"

# Función para mostrar separadores
print_separator() {
    echo -e "\n${PURPLE}$(printf '%*s' 80 '' | tr ' ' '=')${NC}"
}

# Función para mostrar el paso actual
print_step() {
    local step_num=$1
    local description=$2
    echo -e "\n${BLUE}📋 PASO ${step_num}: ${description}${NC}"
    echo -e "${YELLOW}$(printf '%*s' 60 '' | tr ' ' '-')${NC}"
}

# Función para hacer peticiones curl con manejo de errores
make_curl_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${CYAN}🔄 ${description}${NC}"
    echo -e "${YELLOW}Ejecutando: curl -X ${method} ${SERVER_URL}${endpoint}${NC}"
    
    if [ -n "$data" ]; then
        echo -e "${YELLOW}Datos: ${data}${NC}"
        response=$(curl -s -X ${method} "${SERVER_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            -w "\n%{http_code}")
    else
        response=$(curl -s -X ${method} "${SERVER_URL}${endpoint}" \
            -w "\n%{http_code}")
    fi
    
    # Extraer código de respuesta HTTP
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo -e "${GREEN}✅ Éxito (${http_code}): ${response_body}${NC}"
    else
        echo -e "${RED}❌ Error (${http_code}): ${response_body}${NC}"
    fi
    
    # Esperar un poco entre peticiones
    sleep 2
}

# Función para verificar si el servidor está corriendo
wait_for_server() {
    echo -e "${YELLOW}⏳ Esperando a que el servidor esté disponible...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "${SERVER_URL}/api/networks" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Servidor disponible en ${SERVER_URL}${NC}"
            return 0
        fi
        echo -e "${YELLOW}Intento ${attempt}/${max_attempts} - Esperando servidor...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ El servidor no está disponible después de ${max_attempts} intentos${NC}"
    return 1
}

# Función para limpiar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpiando procesos...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo -e "${GREEN}✅ Servidor detenido${NC}"
    fi
}

# Configurar trap para limpiar al salir
trap cleanup EXIT INT TERM

print_separator
echo -e "${BLUE}🔧 CONFIGURACIÓN INICIAL${NC}"
echo -e "Red: ${NETWORK_NAME}"
echo -e "Chain ID: ${CHAIN_ID}"
echo -e "Puerto servidor: ${SERVER_PORT}"
echo -e "URL servidor: ${SERVER_URL}"

# Verificar si npm está disponible
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

print_separator
echo -e "${BLUE}🚀 INICIANDO SERVIDOR DE DESARROLLO${NC}"

# Matar procesos previos en el puerto
echo -e "${YELLOW}🔄 Liberando puerto ${SERVER_PORT}...${NC}"
fuser -k ${SERVER_PORT}/tcp 2>/dev/null || true

# Iniciar servidor en background
echo -e "${CYAN}🔄 Iniciando npm run dev...${NC}"
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# Verificar que el servidor inició correctamente
if ! wait_for_server; then
    echo -e "${RED}❌ No se pudo iniciar el servidor${NC}"
    echo -e "${YELLOW}📋 Log del servidor:${NC}"
    cat server.log
    exit 1
fi

print_separator
echo -e "${BLUE}🧪 INICIANDO TESTS DE API${NC}"

# 1. Limpiar la red (inicial)
print_step "1" "Limpiar la red (inicial)"
make_curl_request "POST" "/api/cleanNetwork" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Limpiando red inicial"

# 2. Desplegar la red
print_step "2" "Desplegar la red"
make_curl_request "POST" "/api/deploy" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"chainId\": ${CHAIN_ID}}" \
    "Desplegando red Besu"

# 3. Añadir nodos RPC adicionales
print_step "3" "Añadir nodos RPC adicionales"
make_curl_request "POST" "/api/deployNodeRpc" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"n\": 3}" \
    "Añadiendo 3 nodos RPC"

# 4. Verificar estado de redes
print_step "4" "Verificar estado de redes"
make_curl_request "GET" "/api/networks" \
    "" \
    "Obteniendo lista de redes"

# 5. Arrancar todos los nodos RPC
print_step "5" "Arrancar todos los nodos RPC"
make_curl_request "POST" "/api/startNodes" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"tipoOContenedor\": \"rpc\"}" \
    "Arrancando todos los nodos RPC"

# 6. Parar todos los nodos RPC
print_step "6" "Parar todos los nodos RPC"
make_curl_request "POST" "/api/stopNode" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"tipoOContenedor\": \"rpc\"}" \
    "Parando todos los nodos RPC"

# 7. Arrancar nodo individual RPC
print_step "7" "Arrancar nodo individual RPC"
make_curl_request "POST" "/api/startNode" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"nombreContenedor\": \"${NETWORK_NAME}-rpc9000\"}" \
    "Arrancando nodo RPC individual"

# 8. Obtener logs del nodo RPC
print_step "8" "Obtener logs del nodo RPC"
make_curl_request "GET" "/api/logs?containerName=${NETWORK_NAME}-rpc9000&tail=10" \
    "" \
    "Obteniendo logs del nodo RPC"

# 9. Parar todos los nodos miner
print_step "9" "Parar todos los nodos miner"
make_curl_request "POST" "/api/stopNode" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"tipoOContenedor\": \"miner\"}" \
    "Parando todos los nodos miner"

# 10. Arrancar nodo individual miner
print_step "10" "Arrancar nodo individual miner"
make_curl_request "POST" "/api/startNode" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"nombreContenedor\": \"${NETWORK_NAME}-miner\"}" \
    "Arrancando nodo miner individual"

# 11. Eliminar nodo RPC individual
print_step "11" "Eliminar nodo RPC individual"
make_curl_request "POST" "/api/deleteNodeRpc" \
    "{\"networkName\": \"${NETWORK_NAME}\", \"nombreContenedor\": \"${NETWORK_NAME}-rpc9000\"}" \
    "Eliminando nodo RPC individual"

# 12. Eliminar todos los nodos RPC
print_step "12" "Eliminar todos los nodos RPC"
make_curl_request "POST" "/api/deleteAllRpcNodes" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Eliminando todos los nodos RPC"

# 13. Parar la red completa
print_step "13" "Parar la red completa"
make_curl_request "POST" "/api/stopNetwork" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Parando la red completa"

# 14. Arrancar la red completa
print_step "14" "Arrancar la red completa"
make_curl_request "POST" "/api/startNetwork" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Arrancando la red completa"

# 15. Arrancar bootnode específicamente
print_step "15" "Arrancar bootnode específicamente"
make_curl_request "POST" "/api/startBootnode" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Arrancando bootnode de la red"

# 16. Verificar estado final de redes
print_step "16" "Verificar estado final de redes"
make_curl_request "GET" "/api/networks" \
    "" \
    "Verificando estado final de las redes"

# 17. Limpiar la red (final)
print_step "17" "Limpiar la red (final)"
make_curl_request "POST" "/api/cleanNetwork" \
    "{\"networkName\": \"${NETWORK_NAME}\"}" \
    "Limpieza final de la red"

print_separator
echo -e "${GREEN}🎉 TEST COMPLETO FINALIZADO${NC}"
echo -e "${CYAN}======================================================${NC}"

# Mostrar resumen
echo -e "\n${BLUE}📊 RESUMEN:${NC}"
echo -e "✅ Se ejecutaron 17 pasos de testing"
echo -e "✅ Red utilizada: ${NETWORK_NAME}"
echo -e "✅ Chain ID: ${CHAIN_ID}"
echo -e "✅ Servidor: ${SERVER_URL}"

echo -e "\n${YELLOW}📋 Log del servidor guardado en: server.log${NC}"
echo -e "${YELLOW}🔧 Para ver logs en tiempo real: tail -f server.log${NC}"

echo -e "\n${PURPLE}Presiona Enter para detener el servidor...${NC}"
read -r

echo -e "${CYAN}¡Gracias por usar el test de API Control Panel Besu!${NC}"
