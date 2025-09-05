./nodo.sh network0 55255 172.24.0.0/16 172.24.0.20 8888 0xCB7291CAAa10683f2E8761F1e8d50F66713267D2 0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201
./nodo.sh network1 55355 172.25.0.0/16 172.25.0.21 8889 0xCB7291CAAa10683f2E8761F1e8d50F66713267D2 0x8BD4C37E1d60A8bDaa2E82e6De8568faBb346201
./nodo_create.sh nodo0 rpc network0
./nodo_create.sh nodo00 validator network0
./nodo_create.sh nodo000 signer network0
./nodo_create.sh nodo1 rpc network1
./nodo_create.sh nodo11 validator network1
./nodo_create.sh nodo111 signer network1

docker stop nodo111 nodo11 nodo1 nodo000 nodo00 nodo0 network1-bootnode network0-bootnode
docker rm nodo111 nodo11 nodo1 nodo000 nodo00 nodo0 network1-bootnode network0-bootnode
