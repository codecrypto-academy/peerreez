#!/bin/bash

NODE_NAME=$1
NETWORK_NAME="besu-network"
BASE_IP="172.24.0"

if [ -z "$NODE_NAME" ]; then
  echo "❌ Debes proporcionar un nombre de nodo. Uso: ./nodo_create.sh nodoX"
  exit 1
fi

# Obtener bootnode enode
BOOTNODE_ENODE=$(cat networks/${NETWORK_NAME}/bootnode/enode)

# Encontrar IP libre en el rango 172.24.0.21-254
for i in {21..254}; do
  IP="${BASE_IP}.${i}"
  if ! docker network inspect ${NETWORK_NAME} | grep -q "${IP}"; then
    NODE_IP="${IP}"
    break
  fi
done

if [ -z "$NODE_IP" ]; then
  echo "❌ No se encontró una IP libre en la red ${NETWORK_NAME}"
  exit 1
fi

echo "✅ IP asignada para ${NODE_NAME}: $NODE_IP"

# Encontrar puerto libre en el host a partir del 8888
START_PORT=8889
AVAILABLE_PORT=$START_PORT

while docker ps --format '{{.Ports}}' | grep -q "${AVAILABLE_PORT}->"; do
  ((AVAILABLE_PORT++))
done

echo "✅ Puerto HTTP disponible: $AVAILABLE_PORT"

# Crear carpeta del nodo
mkdir -p networks/${NETWORK_NAME}/${NODE_NAME}
cd networks/${NETWORK_NAME}/${NODE_NAME}

# Crear claves
node ../../../index.mjs create-keys ${NODE_IP}
cd ../../..

# Lanzar el nodo
docker run -d \
  --name ${NODE_NAME} \
  --label nodo=${NODE_NAME} \
  --label network=${NETWORK_NAME} \
  --ip ${NODE_IP} \
  --network ${NETWORK_NAME} \
  -p ${AVAILABLE_PORT}:8545 \
  -v $(pwd)/networks/${NETWORK_NAME}:/data \
  hyperledger/besu:latest \
  --config-file=/data/config.toml \
  --data-path=/data/${NODE_NAME}/data \
  --node-private-key-file=/data/${NODE_NAME}/key.priv \
  --genesis-file=/data/genesis.json \
  --bootnodes=${BOOTNODE_ENODE} \
  --rpc-http-host=0.0.0.0 \
  --rpc-http-port=8545 \
  --rpc-http-enabled=true \
  --rpc-http-cors-origins="*" \
  --rpc-http-api=ETH,NET,CLIQUE,ADMIN,TRACE,DEBUG,TXPOOL,PERM \
  --host-allowlist="*"

echo "🎉 Nodo ${NODE_NAME} desplegado en IP ${NODE_IP}, puerto HTTP ${AVAILABLE_PORT}"
