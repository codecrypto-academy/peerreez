#!/bin/bash

# Remove existing networks directory
rm -rf networks

# Remove existing Docker containers and networks
docker rm -f $(docker ps -aq --filter "label=network=besu-network") 2>/dev/null || true
docker network rm besu-network 2>/dev/null || true

# Set network configuration
NETWORK="172.24.0.0/16"
BOOTNODE_IP="172.24.0.20"

# Create the necessary directory structure
mkdir -p networks/besu-network

# Create Docker network
docker network create besu-network \
    --subnet $NETWORK \
    --label network=besu-network \
    --label type=besu

# Change directory to the bootnode folder
cd networks/besu-network
mkdir -p bootnode
cd bootnode
# Create keys using index.mjs
node ../../../index.mjs create-keys ${BOOTNODE_IP}
# Go back to the networks directory
cd ../../..

BOOTNODE_ADDRESS=$(cat networks/besu-network/bootnode/address | tr -d '\n')

cat > networks/besu-network/genesis.json << EOF
{
  "config": {
    "chainId": 55255,
    "londonBlock": 0,
    "clique": {
      "blockperiodseconds": 4,
      "epochlength": 30000,
      "createemptyblocks": true
    }
  },
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000$(cat networks/besu-network/bootnode/address)0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "alloc": {
    "$(cat networks/besu-network/bootnode/address)": {
      "balance": "0x20000000000000000000000000000000000000000000000000000000000000"
    },
    "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2": {
      "balance": "0x20000000000000000000000000000000000000000000000000000000000000"
    }
  }
}
EOF


# Create config.toml
cat > networks/besu-network/config.toml << EOF
genesis-file = "/data/genesis.json"
# Networking
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
# JSON-RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "CLIQUE", "ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
EOF

# Launch besu node
docker run -d \
    --name besu-network-bootnode \
    --label nodo=bootnode \
    --label network=besu-network \
    --ip ${BOOTNODE_IP} \
    --network besu-network \
    -p 8888:8545 \
    -v $(pwd)/networks/besu-network:/data \
    hyperledger/besu:latest \
    --config-file=/data/config.toml \
    --data-path=/data/bootnode/data \
    --node-private-key-file=/data/bootnode/key.priv \
    --genesis-file=/data/genesis.json

node ./index.mjs create-keys 192.168.1.100
# Wait for bootnode to start
sleep 10

# Check balance
node ./index.mjs balance $(cat networks/besu-network/bootnode/address)

# Transfer some amount
node ./index.mjs transfer $(cat networks/besu-network/bootnode/key.priv) 0x$(cat address) 10000

# Check balance again
node ./index.mjs balance $(cat address)
