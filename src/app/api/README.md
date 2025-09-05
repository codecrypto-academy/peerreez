curl -X POST http://localhost:3000/api/network \
  -H "Content-Type: application/json" \
  -d '{
    "nameNetwork": "network1",
    "chainId": 55255,
    "subnet": "172.25.0.0",
    "founderAccounts": [
      "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2",
      "0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201"
    ],
    "rpcPort": 8888
  }'
curl -X POST http://localhost:3000/api/network \
  -H "Content-Type: application/json" \
  -d '{
    "nameNetwork": "network1",
    "chainId": 55355,
    "subnet": "172.25.0.0",
    "founderAccounts": [
      "0xCB7291CAAa10683f2E8761F1e8d50F66713267D2",
      "0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201"
    ],
    "rpcPort": 8889
  }'
  
curl -X POST http://localhost:3000/api/node -H "Content-Type: application/json" -d '{
  "networkName": "network1",
  "nodeName": "nodo1",
  "nodeType": "validator"
}'