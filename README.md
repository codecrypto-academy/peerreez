# Create Network
besu --data-path=nodo1 public-key export-address --to=nodo1/address

# Permision
chmod +x nodo1.sh

# Execute
./nodo1.sh
# bootnodes=["enode://3b472810e16a371747dccc63ea6c7ddf2e64451e0d079af81d17d93250f03cda2fa9870c992b4a7c4f281065e12964a9426a08dc5da95adce6e6011c633f8f7a@0.0.0.0:30303"]

# Test Block Number
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:9999
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[], "id":1}' -H "Content-Type: application/json" http://localhost:9998

# Get block by number
curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:9999 | jq '.result'
curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:9998 | jq '.result'

# Get block by number decimal
echo $((16#$(curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:9999 | jq -r '.result' | sed 's/^0x//')))

# Get Balance
curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xCB7291CAAa10683f2E8761F1e8d50F66713267D2","latest"], "id":1}' -H "Content-Type: application/json" http://localhost:9999

curl -X POST --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xCB7291CAAa10683f2E8761F1e8d50F66713267D2","latest"], "id":1}' -H "Content-Type: application/json" http://localhost:9998