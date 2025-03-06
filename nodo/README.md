docker run --rm \
-v ${PWD}/data:/data \
-v ${PWD}/pwd.txt:/pwd.txt \
ethereum/client-go:v1.13.15 \
account new --datadir /data --password /pwd.txt

sudo chown -R $(whoami) ./data/keystore
sudo chmod +rX ./data/keystore

docker run --rm -v ${PWD}/genesis.json:/genesis.json -v ${PWD}/data:/data ethereum/client-go:v1.13.15 init --datadir /data /genesis.json

docker run -d \
-v ${PWD}/data:/data \
-v ${PWD}/pwd.txt:/pwd.txt \
-p 8545:8545 \
--name eth2 \
ethereum/client-go:v1.13.15 \
--datadir /data \
--networkid 9988 \
--unlock 0xe323786aedd3389fdf182d2c3572df6e30fe7499 \
--password /pwd.txt \
--mine --miner.etherbase 0xe323786aedd3389fdf182d2c3572df6e30fe7499 \
--http --http.api admin,debug,web3,eth,txpool,miner,net,personal --http.addr 0.0.0.0 --http.port 8545 --http.corsdomain="\*" \
--allow-insecure-unlock --ipcdisable

{
"config": {
"chainId": 9988,
"homesteadBlock": 0,
"eip150Block": 0,
"eip155Block": 0,
"eip158Block": 0,
"byzantiumBlock": 0,
"constantinopleBlock": 0,
"petersburgBlock": 0,
"eip1559Block": null,
"eip1559Transition": 0,
"terminalTotalDifficulty": 10000000000000000000000,
"clique": {
"period": 3,
"epoch": 30000
}
},
"gasLimit": "12000000",
"difficulty": "1",
"extradata": "0x0000000000000000000000000000000000000000000000000000000000000000b4fbea84a12d97d287d973df717ebe188bb8b8020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
"alloc": {
"0x226E865Ab298e542c5e5098694eFaFfe111F93D3": {
"balance": "1000000000000000000000000000"
},
"0xf843b4412373fA3b2979F13adEb6D5adB5cD6B7b": {
"balance": "2000000000000000000000000000"
}
}
}
