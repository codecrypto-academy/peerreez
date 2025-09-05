curl -X POST http://localhost:3000/api/networks/create \
  -H "Content-Type: application/json" \
  -d '{
    "nameNetwork": "network0",
    "chainId": 55255,
    "subnet": "172.24.0.0/16",
    "rpcPort": 8888,
    "founderAccounts": [
      "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2",
      "0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201"
    ]
  }'

curl -X POST http://localhost:3000/api/nodes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nodeName": "nodo0",
    "nodeType": "rpc",
    "networkName": "network0"
  }'

curl -X POST http://localhost:3000/api/nodes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nodeName": "nodo00",
    "nodeType": "validator",
    "networkName": "network0"
  }'

curl -X POST http://localhost:3000/api/nodes/create \
  -H "Content-Type: application/json" \
  -d '{
    "nodeName": "nodo000",
    "nodeType": "signer",
    "networkName": "network0"
  }'

curl -X DELETE http://localhost:3000/api/networks/delete \
  -H "Content-Type: application/json" \
  -d '{"networkName": "network0"}'

curl -X DELETE http://localhost:3000/api/nodes/delete \
  -H "Content-Type: application/json" \
  -d '{"networkName": "network0", "nodeName": "nodo00"}'