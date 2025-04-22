docker run -d \
 --name nodo3 \
 -p 9997:8545 \
 --network nodos \
 -v $(pwd):/data \
 hyperledger/besu:latest \
 --config-file=/data/config.toml \
 --data-path=/data/nodo3/data \