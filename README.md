```bash
# Create Network
besu --data-path=nodo1 public-key export-address --to=nodo1/address

# Permision
chmod +x nodo1.sh

# Execute
./nodo1.sh

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