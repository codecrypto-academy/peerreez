docker run -d --rm \
 -v ./pwd.txt:/p.txt \
 -v ./datos:/data \
 -p 5556:8545 \
 ethereum/client-go:v1.13.15 \
 --datadir /data \
 --unlock 15df996781649e8a9c79d6486349ce1ca1084793 \
 --allow-insecure-unlock \
 --mine \
 --miner.etherbase 15df996781649e8a9c79d6486349ce1ca1084793 \
 --password /p.txt \
 --nodiscover \
 --http \
 --http.addr "0.0.0.0" \
 --http.api "admin,eth,debug,miner,net,txpool,personal,web3" \
 --http.corsdomain "\*"
