# FRONT

npm run dev

# BACK

npx nodemon index.ts

# Listar address

docker run -v ./pwd.txt:/p.txt -v ./datos:/data ethereum/client-go:v1.13.15 account list --datadir /data

# Create Account

docker run -v ./pwd.txt:/p.txt -v ./datos:/data ethereum/client-go:v1.13.15 account new --datadir /data --password /p.txt

# Solucion que he tenido que aplicar:

sudo chown -R $(whoami) ../nodo/datos/keystore
sudo chmod +rX ../nodo/datos/keystore
