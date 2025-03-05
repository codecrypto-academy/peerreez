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

docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' d7aaccf6f3db

curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:9999

curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:10002

curl -X POST --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:9999

curl -X POST --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:9999 | jq '.result.enode'
