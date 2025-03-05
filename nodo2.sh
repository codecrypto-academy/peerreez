docker run -d \
 --name nodo2 \
 --network nodos \
 -p 10002:8545 \
 -v $(pwd):/data \
 hyperledger/besu:latest \
 --config-file=/data/config.toml \
 --data-path=/data/nodo2/data \