#!/bin/bash

NAME_NETWORK=$1
CHAIN_ID=$2
SUBNET=$3
BOOTNODE_IP=$4
RPC_PORT=${5:-8888} # por defecto 8888
shift 5
CUENTAS_FOUNDED=("$@")

NETWORKS_DIR="networks/$NAME_NETWORK"
BOOTNODE_DIR="$NETWORKS_DIR/bootnode"
BOOTNODE_KEY="$BOOTNODE_DIR/key.priv"

echo "Creando red $NAME_NETWORK con CHAIN_ID=$CHAIN_ID y subnet=$SUBNET"
echo "Cuentas fundadoras: ${CUENTAS_FOUNDED[@]}"
echo "Puerto RPC: $RPC_PORT"

# Limpiar red anterior
rm -rf "$NETWORKS_DIR"
docker rm -f $(docker ps -aq --filter "label=network=$NAME_NETWORK") 2>/dev/null || true
docker network rm "$NAME_NETWORK" 2>/dev/null || true

# Crear directorios
mkdir -p "$BOOTNODE_DIR"

# Generar IP del bootnode automáticamente
IFS='.' read -r a b c d <<< "$(echo $SUBNET | cut -d'/' -f1)"
BOOTNODE_IP="$a.$b.$c.20"

# Crear llaves del bootnode
node ./index.mjs create-keys "$BOOTNODE_IP" "$BOOTNODE_DIR"

# Leer dirección del bootnode
BOOTNODE_ADDRESS=$(cat "$BOOTNODE_DIR/address")

# Crear red Docker
docker network create "$NAME_NETWORK" \
    --subnet "$SUBNET" \
    --label network="$NAME_NETWORK" \
    --label type=besu

# Construir alloc
ALLOC="\"$BOOTNODE_ADDRESS\": { \"balance\": \"0x20000000000000000000000000000000000000000000000000000000000000\" }"
for cuenta in "${CUENTAS_FOUNDED[@]}"; do
  ALLOC="$ALLOC,
\"$cuenta\": { \"balance\": \"0x20000000000000000000000000000000000000000000000000000000000000\" }"
done

# Crear genesis.json
cat > "$NETWORKS_DIR/genesis.json" << EOF
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
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000${BOOTNODE_ADDRESS}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "alloc": { $ALLOC }
}
EOF

# Config.toml
cat > "$NETWORKS_DIR/config.toml" << EOF
genesis-file = "/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "CLIQUE", "ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

# Lanzar bootnode
docker run -d \
    --name "$NAME_NETWORK-bootnode" \
    --label nodo=bootnode \
    --label network="$NAME_NETWORK" \
    --ip "$BOOTNODE_IP" \
    --network "$NAME_NETWORK" \
    -p "${RPC_PORT}:8545" \
    -v "$(pwd)/$NETWORKS_DIR:/data" \
    hyperledger/besu:latest \
    --config-file=/data/config.toml \
    --data-path=/data/bootnode/data \
    --node-private-key-file=/data/bootnode/key.priv \
    --genesis-file=/data/genesis.json

# Esperar RPC
echo "Esperando a que Besu arranque en http://127.0.0.1:$RPC_PORT..."
until curl -s "http://127.0.0.1:$RPC_PORT" > /dev/null 2>&1; do
  sleep 3
done
echo "Besu está listo!"

# Mostrar balances
echo ""
echo "=== Balances en la red $NAME_NETWORK ==="
echo "Bootnode: $BOOTNODE_ADDRESS"
node ./index.mjs balance "$BOOTNODE_ADDRESS" "http://127.0.0.1:$RPC_PORT"
for cuenta in "${CUENTAS_FOUNDED[@]}"; do
  echo "Cuenta: $cuenta"
  node ./index.mjs balance "$cuenta" "http://127.0.0.1:$RPC_PORT"
done
echo "======================================="

# Ejemplo de transfer
DESTINO=${CUENTAS_FOUNDED[0]}
CANTIDAD=10000
echo ""
echo "💸 Transfer: $CANTIDAD ETH desde bootnode $BOOTNODE_ADDRESS a $DESTINO"
node ./index.mjs transfer "$(cat $BOOTNODE_KEY)" "$DESTINO" "$CANTIDAD" "http://127.0.0.1:$RPC_PORT"

# Mostrar balances después de transfer
echo ""
echo "=== Balances tras transfer en la red $NAME_NETWORK ==="
echo "Bootnode: $BOOTNODE_ADDRESS"
node ./index.mjs balance "$BOOTNODE_ADDRESS" "http://127.0.0.1:$RPC_PORT"
echo "Cuenta destino: $DESTINO"
node ./index.mjs balance "$DESTINO" "http://127.0.0.1:$RPC_PORT"
echo "======================================="
