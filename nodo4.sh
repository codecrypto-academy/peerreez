docker run -d \
 --name nodo4 \
 -p 9996:8545 \
 --network nodos \
 -v $(pwd):/data \
 hyperledger/besu:latest \
 --config-file=/data/config.toml \
 --data-path=/data/nodo4/data \