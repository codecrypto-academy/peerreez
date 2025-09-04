#!/bin/bash

# =========================================
# Script para crear nodos Besu en una red existente y validar su tipo
# =========================================
# Uso:
# ./nodo_create.sh NODE_NAME NODE_TYPE NETWORK_NAME
# NODE_TYPE puede ser: rpc, validator, signer
# =========================================

NODE_NAME=$1
NODE_TYPE=$2
NETWORK_NAME=$3

if [ -z "$NODE_NAME" ] || [ -z "$NODE_TYPE" ] || [ -z "$NETWORK_NAME" ]; then
  echo "❌ Uso: ./nodo_create.sh NODE_NAME NODE_TYPE NETWORK_NAME"
  exit 1
fi

# Verificar que la red existe
if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "❌ La red $NETWORK_NAME no existe"
  exit 1
fi

# Obtener subred de la red
SUBNET=$(docker network inspect "$NETWORK_NAME" -f '{{(index .IPAM.Config 0).Subnet}}')
IFS='.' read -r a b c d <<< "$(echo $SUBNET | cut -d'/' -f1)"
BASE_IP="$a.$b.$c"

# Obtener bootnode enode
BOOTNODE_ENODE=$(cat networks/${NETWORK_NAME}/bootnode/enode)

# Encontrar IP libre en la subred
for i in {21..254}; do
  IP="${BASE_IP}.${i}"
  if ! docker network inspect "${NETWORK_NAME}" | grep -q "${IP}"; then
    NODE_IP="${IP}"
    break
  fi
done

if [ -z "$NODE_IP" ]; then
  echo "❌ No se encontró una IP libre en la red ${NETWORK_NAME}"
  exit 1
fi

echo "✅ IP asignada para ${NODE_NAME}: $NODE_IP"

# Encontrar puerto HTTP libre
START_PORT=8888
AVAILABLE_PORT=$START_PORT
while docker ps --format '{{.Ports}}' | grep -q "${AVAILABLE_PORT}->"; do
  ((AVAILABLE_PORT++))
done
echo "✅ Puerto HTTP disponible: $AVAILABLE_PORT"

# Crear carpeta del nodo
NODE_DIR="networks/${NETWORK_NAME}/${NODE_NAME}"
mkdir -p "$NODE_DIR"

# Crear claves específicas del nodo
node ./index.mjs create-keys "$NODE_IP" "$NODE_DIR"

# Lanzar el nodo
docker run -d \
  --name "$NODE_NAME" \
  --label nodo="$NODE_NAME" \
  --label network="$NETWORK_NAME" \
  --ip "$NODE_IP" \
  --network "$NETWORK_NAME" \
  -p "${AVAILABLE_PORT}:8545" \
  -v "$(pwd)/networks/${NETWORK_NAME}:/data" \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/${NODE_NAME}/data \
  --node-private-key-file=/data/${NODE_NAME}/key.priv \
  --genesis-file=/data/genesis.json \
  --bootnodes="${BOOTNODE_ENODE}" \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-enabled=true \
  --rpc-http-cors-origins="*" \
  --rpc-http-api=ETH,NET,CLIQUE,ADMIN,TRACE,DEBUG,TXPOOL,PERM \
  --host-allowlist="*"

echo "🎉 Nodo ${NODE_NAME} (${NODE_TYPE}) desplegado en IP ${NODE_IP}, puerto HTTP ${AVAILABLE_PORT}"

# Esperar a que el nodo responda
echo "⏳ Esperando a que el nodo responda en http://127.0.0.1:${AVAILABLE_PORT}..."
until curl -s "http://127.0.0.1:${AVAILABLE_PORT}" > /dev/null 2>&1; do
  sleep 3
done
echo "✅ Nodo activo!"

# Validación según tipo
echo "🔍 Validando nodo ${NODE_NAME} como ${NODE_TYPE}..."
case $NODE_TYPE in
  rpc)
    RESPONSE=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://127.0.0.1:${AVAILABLE_PORT})
    if [[ $RESPONSE == *"result"* ]]; then
      echo "✅ Nodo RPC responde correctamente: $RESPONSE"
    else
      echo "❌ Nodo RPC no responde"
    fi
    ;;
  validator)
    RESPONSE=$(docker exec "$NODE_NAME" besu public-key export 2>/dev/null)
    if [[ $RESPONSE != "" ]]; then
      echo "✅ Nodo Validator activo, clave pública: $RESPONSE"
    else
      echo "❌ Nodo Validator no responde correctamente"
    fi
    ;;
  signer)
    # Verificar que responde como nodo RPC primero
    RESPONSE=$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://127.0.0.1:${AVAILABLE_PORT})
    if [[ $RESPONSE == *"result"* ]]; then
      # Obtener clave pública para confirmar que es un signer
      PUBKEY=$(docker exec "$NODE_NAME" besu public-key export 2>/dev/null)
      if [[ $PUBKEY != "" ]]; then
        echo "✅ Nodo Signer activo, clave pública: $PUBKEY"
      else
        echo "⚠️ Nodo Signer activo pero no tiene clave de firma detectada"
      fi
    else
      echo "❌ Nodo Signer no responde correctamente"
    fi
    ;;

esac
