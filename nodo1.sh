docker run -d \
 --name nodo1 \
 --network nodos \
 -p 9999:8545 \
 -v $(pwd):/data \
 hyperledger/besu:latest \
 --config-file=/data/config.toml \
 --data-path=/data/nodo1/data \
 --node-private-key-file=/data/nodo1/key \
 --genesis-file=/data/genesis.json