# Objetivo: Crear un red privada Ethereum con varios nodos con consenso Proof of Autority.

# Instalar version geth 1.13.15

# Generar cuentas

geth --datadir nodo1 account new --password ./pwd.txt
geth --datadir nodo2 account new --password ./pwd.txt
geth --datadir nodo3 account new --password ./pwd.txt
geth --datadir nodo3 account new --password ./pwd.txt
geth --datadir nodo3 account new --password ./pwd.txt
geth --datadir nodo4 account new --password ./pwd.txt

# Ejecutar bootnode

bootnode --genkey=boot.key
bootnode --verbosity=9 --nodekey=boot.key

# Guardar enode

enode://502ea3647008cb371c917ca6c4661628797372528dc16d8fc3afa30bc4b277db600f92a22c67c001996471cb469a78d3ae1747d53995b8a828beeaaaffa5f0ac@127.0.0.1:0?discport=30301

# Generar .json añadir las tres cuentas seguidas al extradata

# Iniciar

geth init --datadir=nodo1 --state.scheme=hash genesis.json
geth init --datadir=nodo2 --state.scheme=hash genesis.json
geth init --datadir=nodo3 --state.scheme=hash genesis.json
geth init --datadir=nodo4 --state.scheme=hash genesis.json

# Ejecutar

# Nodo1

geth --datadir nodo1 \
 --syncmode full \
 --http \
 --http.api admin,debug,web3,eth,txpool,miner,net \
 --http.port 6016 \
 --allow-insecure-unlock \
 --unlock "5e8dc0bc3ee6f4efeb5edfd7f9740ad4f23be507" \
 --password pwd.txt \
 --port 30034 \
 --bootnodes "enode://502ea3647008cb371c917ca6c4661628797372528dc16d8fc3afa30bc4b277db600f92a22c67c001996471cb469a78d3ae1747d53995b8a828beeaaaffa5f0ac@127.0.0.1:0?discport=30301" \
 --mine \
 --miner.etherbase 0x5e8dc0bc3ee6f4efeb5edfd7f9740ad4f23be507

# Nodo2

geth --datadir nodo2 \
 --syncmode full \
 --http \
 --http.api admin,debug,web3,eth,txpool,miner,net \
 --http.port 6011 \
 --allow-insecure-unlock \
 --unlock "8b6879a64479297ab9efda6b063d6d4585598100" \
 --password pwd.txt \
 --port 30035 \
 --bootnodes "enode://502ea3647008cb371c917ca6c4661628797372528dc16d8fc3afa30bc4b277db600f92a22c67c001996471cb469a78d3ae1747d53995b8a828beeaaaffa5f0ac@127.0.0.1:0?discport=30301" \
 --authrpc.port 6012 \
 --mine \
 --miner.etherbase 0x8b6879a64479297ab9efda6b063d6d4585598100

# Nodo 3

geth --datadir nodo3 \
 --syncmode full \
 --http \
 --http.api admin,debug,web3,eth,txpool,miner,net \
 --http.port 6013 \
 --allow-insecure-unlock \
 --unlock "a61dc544ffe4565ca3c5daca6fe5eed69d01cc63" \
 --password pwd.txt \
 --port 30036 \
 --bootnodes "enode://502ea3647008cb371c917ca6c4661628797372528dc16d8fc3afa30bc4b277db600f92a22c67c001996471cb469a78d3ae1747d53995b8a828beeaaaffa5f0ac@127.0.0.1:0?discport=30301" \
 --authrpc.port 6014 \
 --mine \
 --miner.etherbase 0xa61dc544ffe4565ca3c5daca6fe5eed69d01cc63

# Nodo 4

geth --datadir nodo4 \
 --syncmode full \
 --http \
 --http.api admin,debug,web3,eth,txpool,miner,net \
 --http.port 6017 \
 --allow-insecure-unlock \
 --unlock "ccd8f475b30dd140ad78ab6a7340fbb9da099b06" \
 --password pwd.txt \
 --port 30037 \
 --bootnodes "enode://502ea3647008cb371c917ca6c4661628797372528dc16d8fc3afa30bc4b277db600f92a22c67c001996471cb469a78d3ae1747d53995b8a828beeaaaffa5f0ac@127.0.0.1:0?discport=30301" \
 --authrpc.port 6018 \
 --mine \
 --miner.etherbase 0xccd8f475b30dd140ad78ab6a7340fbb9da099b06
