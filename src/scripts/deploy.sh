#!/bin/bash
#
# 🚀 Gestor de Red Privada Besu
# Autor: David Perez Sanchez
# Email: dperezsx@gmail.com
# Fecha: September 12, 2025
#
#

set -euo pipefail
trap 'echo -e "\n❌ Oops! Algo salió mal. Revisa los logs para más detalles."' ERR

# ==============================================================================
# 🎨 ESTILOS DE LOGS PERSONALIZADOS
# ==============================================================================

readonly COLOR_ERROR="\033[1;31m"
readonly COLOR_OK="\033[1;32m"
readonly COLOR_ALERT="\033[1;33m"
readonly COLOR_STEP="\033[1;34m"
readonly COLOR_RESET="\033[0m"

msg_paso()        { echo -e "\n${COLOR_STEP}➡️ $1${COLOR_RESET}"; }
msg_exito()       { echo -e "${COLOR_OK}✔ $1${COLOR_RESET}"; }
msg_info()        { echo -e "${COLOR_ALERT}ℹ $1${COLOR_RESET}"; }
msg_advertencia() { echo -e "${COLOR_ERROR}⚠ $1${COLOR_RESET}"; }
# ==============================================================================
# ⚙️ CONFIGURACIÓN DE RED BESU (MULTI-RED)
# ==============================================================================

# Argumentos: network name y chain id
NETWORK_NAME="${1:-}"
CHAIN_ID="${2:-}"

if [[ -z "$NETWORK_NAME" || -z "$CHAIN_ID" ]]; then
    echo -e "${COLOR_ERROR}Uso: $0 <network-name> <chain-id>${COLOR_RESET}"
    exit 1
fi

# Buscar subred disponible automáticamente (172.30.X.0/24, X=hash de nombre, si está ocupada avanza)
function subred_esta_libre() {
    local subnet="$1"
    if docker network ls --format '{{.Name}}' | while read net; do docker network inspect "$net" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'; done | grep -q "^$subnet$"; then
        return 1 # ocupada
    else
        return 0 # libre
    fi
}

# Busca subred libre en 172.30-32.X.0/24 (X=1..250)
function buscar_subred_disponible() {
    local name="$1"
    local hash=$(echo -n "$name" | md5sum | cut -c1-2)
    local dec=$((0x$hash))
    if (( dec < 1 )); then dec=1; fi
    if (( dec > 250 )); then dec=250; fi
    for block in 30 31 32; do
        for ((i=0; i<250; i++)); do
            local try=$(((dec+i-1)%250+1))
            local subnet="172.${block}.$try.0/24"
            if subred_esta_libre "$subnet"; then
                echo "$subnet"
                return 0
            fi
        done
    done
    echo "" # No disponible
    return 1
}

RED_SUBNET=$(buscar_subred_disponible "$NETWORK_NAME")
if [[ -z "$RED_SUBNET" ]]; then
    echo -e "${COLOR_ERROR}No hay subredes libres disponibles en 172.30.0.0/16, 172.31.0.0/16 ni 172.32.0.0/16${COLOR_RESET}"
    exit 1
fi

# Asignar IPs en la subred
BOOT_IP="$(echo $RED_SUBNET | sed 's|0/24|20|')"
BOOT_KEY_IP="$(echo $RED_SUBNET | sed 's|0/24|21|')"
MINER_IP="$(echo $RED_SUBNET | sed 's|0/24|22|')"
MINER_KEY_IP="$MINER_IP"

# Buscar puertos libres (simple: hash+base)
function calcular_puerto() {
    local base=$1; local offset=$2
    local name="$3"
    local hash=$(echo -n "$name" | md5sum | cut -c1-2)
    local dec=$((0x$hash))
    echo $((base+dec+offset))
}

RPC_BASE=$(calcular_puerto 8500 0 "$NETWORK_NAME")
RPC_PUB=$(calcular_puerto 8800 0 "$NETWORK_NAME")
MINER_RPC=$(calcular_puerto 8500 1 "$NETWORK_NAME")
MINER_RPC_PUB=$(calcular_puerto 8800 1 "$NETWORK_NAME")


# Nodos RPC extra (puedes ampliar lógica)
RED_DOCKER="$NETWORK_NAME"
LABEL_RED="network=$NETWORK_NAME"
LABEL_TIPO="type=besu"
IMAGEN_BESU="hyperledger/besu:latest"


# Generar puertos RPC adicionales únicos por red (ejemplo: 2 nodos extra)
EXTRA_RPC_COUNT=2
EXTRA_RPC=()
EXTRA_RPC_IPS=()
for ((i=0; i<$EXTRA_RPC_COUNT; i++)); do
    # Base 9000 para evitar colisiones con los otros RPCs
    port=$(calcular_puerto 9000 $i "$NETWORK_NAME")
    EXTRA_RPC+=("$port")
    # IPs: 23, 24, ...
    ip_idx=$((23+i))
    EXTRA_RPC_IPS+=("$(echo $RED_SUBNET | sed "s|0/24|$ip_idx|")")
done

# 📂 RUTAS
DIR_BOOT="networks/${RED_DOCKER}/bootnode"
DIR_MINER="networks/${RED_DOCKER}/miner"
GENESIS="networks/${RED_DOCKER}/genesis.json"
CONF_BOOT="networks/${RED_DOCKER}/config.toml"
CONF_MINER="networks/${RED_DOCKER}/miner_config.toml"

DATA_BOOT="/data/bootnode/data"
DATA_MINER="/data/miner/data"
KEY_BOOT="/data/bootnode/key.priv"
KEY_MINER="/data/miner/key.priv"
GENESIS_DOCKER="/data/genesis.json"
CONF_BOOT_DOCKER="/data/config.toml"
CONF_MINER_DOCKER="/data/miner_config.toml"

# ==============================================================================
# 🔧 FUNCIONES AUXILIARES
# ==============================================================================

verificar_requisitos() {
    msg_paso "Verificando herramientas necesarias..."

    local dependencias=("docker" "node")
    for d in "${dependencias[@]}"; do
        if ! command -v "$d" &>/dev/null; then
            msg_advertencia "⚠ $d no está instalado. Instálalo primero."
            exit 1
        fi
    done

    if [ ! -f "operations.mjs" ]; then
        msg_advertencia "operations.mjs no encontrado. Ejecuta desde el directorio correcto."
        exit 1
    fi

    msg_exito "Todas las herramientas están disponibles"
}

limpiar_recursos() {
    msg_paso "Eliminando contenedores, red y datos previos..."

    local contenedores
    contenedores=$(docker ps -aq --filter "label=${LABEL_RED}")
    if [ -n "$contenedores" ]; then
        msg_info "Deteniendo y borrando contenedores previos..."
        docker rm -f $contenedores || true
    fi

    if docker network inspect "${RED_DOCKER}" &>/dev/null; then
        msg_info "Borrando red Docker anterior..."
        docker network rm "${RED_DOCKER}" || true
    fi

    if [ -d "networks/${RED_DOCKER}" ]; then
        msg_info "Eliminando directorios de datos previos de la red actual..."
        rm -rf "networks/${RED_DOCKER}"
    fi

    msg_exito "Limpieza completada"
}

crear_directorios() {
    msg_paso "Creando estructura de directorios para la red..."
    mkdir -p "${DIR_BOOT}" "${DIR_MINER}"
    for i in "${EXTRA_RPC[@]}"; do
        mkdir -p "networks/${RED_DOCKER}/rpc${i}"
    done
    # Crear directorio para la cuenta adicional
    mkdir -p "networks/${RED_DOCKER}/account"
    msg_exito "Directorios listos"
}

crear_red_docker() {
    msg_paso "Creando red Docker personalizada..."
    # Si existe una red con el mismo nombre, eliminarla primero
    if docker network inspect "${RED_DOCKER}" &>/dev/null; then
        msg_info "Eliminando red Docker existente con el mismo nombre (${RED_DOCKER})..."
        docker network rm "${RED_DOCKER}" || true
    fi

    # Intentar crear la red, si hay conflicto de subred, probar la siguiente
    local intentos=0
    local max_intentos=750
    local name_hash=$(echo -n "$NETWORK_NAME" | md5sum | cut -c1-2)
    local dec=$((0x$name_hash))
    if (( dec < 1 )); then dec=1; fi
    if (( dec > 250 )); then dec=250; fi
    local bloques=(30 31 32)
    for ((i=0; i<250; i++)); do
        local try=$(((dec+i-1)%250+1))
        for block in "${bloques[@]}"; do
            local subnet="172.${block}.$try.0/24"
            if docker network ls --format '{{.Name}}' | while read net; do docker network inspect "$net" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'; done | grep -q "^$subnet$"; then
                ((intentos++))
                continue
            fi
            if docker network create "${RED_DOCKER}" \
                --subnet "$subnet" \
                --label "${LABEL_RED}" \
                --label "${LABEL_TIPO}" &>/dev/null; then
                export RED_SUBNET="$subnet"
                msg_exito "Red Docker '${RED_DOCKER}' creada con subred $subnet"
                return 0
            else
                ((intentos++))
                if (( intentos == 1 )); then
                    msg_advertencia "Intento $intentos: No se pudo crear la red con subred $subnet. Probando siguiente..."
                elif (( intentos % 10 == 0 )); then
                    msg_advertencia "Intento $intentos: Aún sin éxito creando red. Última subred probada: $subnet"
                fi
            fi
        done
    done
    msg_advertencia "No se pudo crear una red Docker sin conflicto de subred tras $intentos intentos."
    exit 1
}

generar_claves_nodo() {
    local DIR=$1
    local IP=$2
    local NODO=$3

    msg_paso "Generando claves para nodo ${NODO}..."
    (cd "${DIR}" && node ../../../operations.mjs create-keys "${IP}")
    msg_exito "Claves de ${NODO} listas"
}

# Generar claves para la cuenta adicional (sin fondos)
generar_clave_account() {
    local DIR="networks/${RED_DOCKER}/account"
    local IP="172.30.0.30" # IP dummy para la cuenta adicional
    msg_paso "Generando claves para la cuenta adicional (account)..."
    (cd "${DIR}" && node ../../../operations.mjs create-keys "${IP}")
    msg_exito "Claves de account listas"
}

crear_archivos_configuracion() {
    local MINER_ADDR=$1
    local BOOT_ADDR=$2
    local BOOT_ENODE=$3

    msg_info "Creando genesis.json..."
        cat > "${GENESIS}" << EOF
{
    "config": {
        "chainId": $CHAIN_ID,
        "londonBlock": 0,
        "clique": {
            "blockperiodseconds": 4,
            "epochlength": 30000,
            "createemptyblocks": true
        }
    },
    "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000${MINER_ADDR}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "alloc": {
        "${BOOT_ADDR}": {"balance":"0x200000000000000000000000000000000000000000000000000000000000000"},
        "${MINER_ADDR}": {"balance":"0x200000000000000000000000000000000000000000000000000000000000000"}
    }
}
EOF

    msg_info "Configurando bootnode..."
    cat > "${CONF_BOOT}" << EOF
genesis-file="${GENESIS_DOCKER}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${RPC_BASE}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
sync-mode="FULL"
EOF

    msg_info "Configurando miner..."
    cat > "${CONF_MINER}" << EOF
genesis-file="${GENESIS_DOCKER}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${MINER_RPC}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
miner-enabled=true
miner-coinbase="0x${MINER_ADDR}"
bootnodes=["${BOOT_ENODE}"]
sync-mode="FULL"
EOF
}

lanzar_contenedor() {
    local NAME=$1
    local IP=$2
    local PORT_LOCAL=$3
    local PORT_PUB=$4
    local CONF_FILE=$5
    local DATA_PATH=$6
    local KEY_FILE=$7
    local LABEL=$8

    msg_paso "Lanzando contenedor ${NAME}..."
    if [[ "$LABEL" == "rpc" ]]; then
        docker run -d \
            --name "${NAME}" \
            --label nodo="${LABEL}" \
            --label "${LABEL_RED}" \
            --ip "${IP}" \
            --network "${RED_DOCKER}" \
            -p ${PORT_PUB}:${PORT_LOCAL} \
            -v "$(pwd)/networks/${RED_DOCKER}:/data" \
            "${IMAGEN_BESU}" \
            --config-file="${CONF_FILE}" \
            --data-path="${DATA_PATH}" \
            --node-private-key-file="${KEY_FILE}" \
            --genesis-file="${GENESIS_DOCKER}" &>/dev/null
    else
        docker run -d \
            --name "${NAME}" \
            --label nodo="${LABEL}" \
            --label "${LABEL_RED}" \
            --ip "${IP}" \
            --network "${RED_DOCKER}" \
            -v "$(pwd)/networks/${RED_DOCKER}:/data" \
            "${IMAGEN_BESU}" \
            --config-file="${CONF_FILE}" \
            --data-path="${DATA_PATH}" \
            --node-private-key-file="${KEY_FILE}" \
            --genesis-file="${GENESIS_DOCKER}" &>/dev/null
    fi
    msg_exito "Contenedor ${NAME} lanzado"
}

lanzar_nodos_rpc_adicionales() {
    for i in "${!EXTRA_RPC[@]}"; do
        local PORT=${EXTRA_RPC[$i]}
        local IP=${EXTRA_RPC_IPS[$i]}
        local DIR="networks/${RED_DOCKER}/rpc${PORT}"
        local NAME="${RED_DOCKER}-rpc${PORT}"
        local DATA="/data/rpc${PORT}/data"
        local KEY="/data/rpc${PORT}/key.priv"
        local CONF="/data/rpc${PORT}_config.toml"

        msg_info "Preparando nodo RPC ${PORT}..."

    (cd "${DIR}" && node ../../../operations.mjs create-keys "${IP}")

        cat > "${DIR}_config.toml" << EOF
genesis-file="${GENESIS_DOCKER}"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${PORT}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
bootnodes=["${BOOT_ENODE}"]
sync-mode="FULL"
EOF

        lanzar_contenedor "${NAME}" "${IP}" "${PORT}" "${PORT}" "${CONF}" "${DATA}" "${KEY}" "rpc"
    done
}

esperar_sincronizacion() {
    msg_paso "Esperando a que los nodos se sincronicen..."
    local WAIT=50
    for ((i=1; i<=WAIT; i++)); do
        echo -ne "\r⏳ ${i}/${WAIT} segundos"
        sleep 1
    done
    echo -e "\n"
}

verificar_bootnode() {
    msg_paso "Verificando que el nodo RPC responde..."
    local MAX=5
    local RPC_PORT=${EXTRA_RPC[0]}
    for ((COUNT=1; COUNT<=MAX; COUNT++)); do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:${RPC_PORT} > /dev/null 2>&1; then
            msg_exito "Nodo RPC responde correctamente"
            return 0
        else
            msg_advertencia "Intento ${COUNT}/${MAX}: Nodo RPC aún no responde"
            sleep 5
        fi
    done
    msg_advertencia "Nodo RPC no respondió tras ${MAX} intentos."
}

transferir_fondos_mnemonic() {
    local MNEM="test test test test test test test test test test test junk"
    local AMOUNT="1"
    local PRIV
    PRIV=$(cat networks/${RED_DOCKER}/bootnode/key.priv)

    local RPC_PORT=${EXTRA_RPC[0]}
    msg_info "Transfiriendo ${AMOUNT} ETH a las primeras 10 cuentas del mnemonic..."
    node operations.mjs fund-mnemonic "$PRIV" "$MNEM" "$AMOUNT" "http://localhost:${RPC_PORT}" && msg_exito "Fondos transferidos"
}

# ==============================================================================
# 🔥 EJECUCIÓN PRINCIPAL
# ==============================================================================

echo -e "${COLOR_STEP}========================================${COLOR_RESET}"
echo -e "${COLOR_OK}     🚀 Iniciando Red Besu Privada       ${COLOR_RESET}"
echo -e "${COLOR_STEP}========================================${COLOR_RESET}"
echo "Autor: David Perez Sanchez"
echo "Fecha: $(date)"
echo "Network: $NETWORK_NAME"
echo "Chain ID: $CHAIN_ID"
echo "Subred: $RED_SUBNET"
echo ""

verificar_requisitos
limpiar_recursos
crear_directorios

if ! crear_red_docker; then
    echo -e "${COLOR_ERROR}Fallo al crear la red Docker. Abortando.${COLOR_RESET}"
    exit 1
fi

generar_claves_nodo "${DIR_BOOT}" "${BOOT_KEY_IP}" "Bootnode"
generar_claves_nodo "${DIR_MINER}" "${MINER_KEY_IP}" "Miner"
# Generar claves para la cuenta adicional (sin fondos)
generar_clave_account

 BOOT_ADDR=$(cat networks/${RED_DOCKER}/bootnode/address)
 MINER_ADDR=$(cat networks/${RED_DOCKER}/miner/address)
 BOOT_ENODE=$(cat networks/${RED_DOCKER}/bootnode/enode | sed "s/${BOOT_KEY_IP}/${BOOT_IP}/")

crear_archivos_configuracion "${MINER_ADDR}" "${BOOT_ADDR}" "${BOOT_ENODE}"

lanzar_contenedor "${RED_DOCKER}-bootnode" "${BOOT_IP}" "${RPC_BASE}" "${RPC_PUB}" "${CONF_BOOT_DOCKER}" "${DATA_BOOT}" "${KEY_BOOT}" "bootnode"
lanzar_contenedor "${RED_DOCKER}-miner" "${MINER_IP}" "${MINER_RPC}" "${MINER_RPC_PUB}" "${CONF_MINER_DOCKER}" "${DATA_MINER}" "${KEY_MINER}" "miner"

lanzar_nodos_rpc_adicionales
esperar_sincronizacion
verificar_bootnode
transferir_fondos_mnemonic

# ==============================================================================
# 🎉 RESUMEN FINAL
# ==============================================================================


echo -e "\n${COLOR_OK}🎉 Red Besu desplegada exitosamente!${COLOR_RESET}"
echo "=========================================="
echo "   David Perez Sanchez Edition ✨"
echo "   Email: dperezsx@gmail.com"
echo "=========================================="
echo "✅ ¡Todo listo para usar!"

# ==============================================================================
# 📊 RESUMEN DE LA RED
# ==============================================================================

echo -e "\n${COLOR_STEP}=== INFORMACIÓN DE LA RED ===${COLOR_RESET}"
echo "Nombre de la red: ${RED_DOCKER}"
echo "Subnet: ${RED_SUBNET}"
echo "Chain ID: ${CHAIN_ID}"

echo -e "\n${COLOR_STEP}=== NODOS DESPLEGADOS ===${COLOR_RESET}"
echo -e "• Bootnode:"
echo "  - IP interna: ${BOOT_IP}"
echo "  - Puerto RPC externo: ${RPC_PUB}"
echo "  - Address: 0x${BOOT_ADDR}"
echo -e "\n• Miner:"
echo "  - IP interna: ${MINER_IP}"
echo "  - Puerto RPC externo: ${MINER_RPC_PUB}"
echo "  - Address: 0x${MINER_ADDR}"


for i in "${!EXTRA_RPC[@]}"; do
    PORT=${EXTRA_RPC[$i]}
    IP=${EXTRA_RPC_IPS[$i]}
    RPC_ADDR_FILE="networks/${RED_DOCKER}/rpc${PORT}/address"
    if [ -f "$RPC_ADDR_FILE" ]; then
        RPC_ADDR=$(cat "$RPC_ADDR_FILE")
        echo -e "\n• Nodo RPC ${PORT}:"
        echo "  - IP interna: ${IP}"
        echo "  - Puerto RPC externo: ${PORT}"
        echo "  - Address: 0x${RPC_ADDR}"
    else
        echo -e "\n• Nodo RPC ${PORT}:"
        echo "  - IP interna: ${IP}"
        echo "  - Puerto RPC externo: ${PORT}"
        echo "  - Address: (no encontrado)"
    fi
done

echo -e "\n${COLOR_STEP}=== ENDPOINTS RPC ===${COLOR_RESET}"
for i in "${!EXTRA_RPC[@]}"; do
    PORT=${EXTRA_RPC[$i]}
    if [ "$i" -eq 0 ]; then
        echo "• RPC principal: http://localhost:${PORT}"
    else
        echo "• RPC ${PORT}: http://localhost:${PORT}"
    fi
done

echo -e "\n${COLOR_STEP}=== MNEMONIC PARA TESTING ===${COLOR_RESET}"
echo "Mnemonic: test test test test test test test test test test test junk"
echo "Derivation path: m/44'/60'/0'/0/X (donde X = 0-9)"
echo "✅ Las primeras 10 cuentas ya tienen 1 ETH cada una"

echo -e "\n${COLOR_STEP}=== COMANDOS ÚTILES ===${COLOR_RESET}"
echo "• Ver logs del bootnode: docker logs ${RED_DOCKER}-bootnode"
echo "• Ver logs del miner: docker logs ${RED_DOCKER}-miner"
echo "• Detener la red: docker rm -f \$(docker ps -aq --filter \"label=network=${RED_DOCKER}\")"
echo "• Eliminar la red: docker network rm ${RED_DOCKER}"
