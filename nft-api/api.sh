#Instalar librerias
npm install

# Lanzar el servidor para Org1
npm run server:org1:dev

# Lanzar el servidor para Org2
npm run server:org2:dev

# Verificar conectividad con el smart contract
http GET "http://localhost:3003/ping"

# Inicializar el smart contract
http POST "http://localhost:3003/init?tokenName=Dolar&tokenSymbol=$"

# Registrar un usuario
http POST "http://localhost:3003/signup" username="user1" password="user1pw"

# Registrar un usuario
http POST "http://localhost:3003/login" username="user1" password="user1pw"

# Crear un NFT
http POST "http://localhost:3003/submit" x-user:user1 fcn=Mint "args[]=9"  \
        "args[]=https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png" "args[]=Nombre" "args[]=Descripcion"

# Obtener un NFT
http POST "http://localhost:3003/evaluate" x-user:user1 fcn=GetToken "args[]=9"

# Registrar otro usuario
http POST "http://localhost:3003/signup" username="user2" password="user2pw"

# Logearnos con otro usuario
http POST "http://localhost:3003/login" username="user2" password="user2pw"

# Mintear un NFT
http POST "http://localhost:3003/submit" x-user:user2 fcn=Mint "args[]=10"  \
        "args[]=https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png" "args[]=Nombre2" "args[]=Descripcion2"

# Obtener identidad del usuario 1
http GET "http://localhost:3003/id" x-user:user1

# Transferir token de usuario 2 a usuario 1
http POST "http://localhost:3003/submit" x-user:user1 fcn=TransferFrom \
        "args[]=x509::/OU=client/CN=user1::/C=ES/L=Alicante/=Alicante/O=Kung Fu Software/OU=Tech/CN=ca" \
        "args[]=x509::/OU=client/CN=user2::/C=ES/L=Alicante/=Alicante/O=Kung Fu Software/OU=Tech/CN=ca" \
        "args[]=9"

# Comprobar owner del token transferido
http POST "http://localhost:3003/evaluate" x-user:user2 fcn=OwnerOf "args[]=9"

# Limpiar chaincode
http POST "http://localhost:3003/submit" x-user:user2 fcn=limpiarChaincode
http POST "http://localhost:3003/init?tokenName=Dolar&tokenSymbol=$"

# Registrar otro usuario
http POST "http://localhost:3004/signup" username="user2-org2" password="user2pw"

# Logearnos con otro usuario
http POST "http://localhost:3004/login" username="user2-org2" password="user2pw"

# Obtener identidad del usuario 1
http GET "http://localhost:3004/id" x-user:user2-org2

http POST "http://localhost:3003/submit" x-user:user2 fcn=Mint "args[]=10"  \
        "args[]=https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png" "args[]=Nombre2" "args[]=Descripcion2"

# Transferir token de usuario 2 (Org1) a usuario 2 (Org2)
http POST "http://localhost:3003/submit" x-user:user2 fcn=TransferFrom \
        "args[]=x509::/OU=client/CN=user2::/C=ES/L=Alicante/=Alicante/O=Kung Fu Software/OU=Tech/CN=ca" \
        "args[]=x509::/OU=client/CN=user2-org2::/C=ES/L=Alicante/=Alicante/O=Kung Fu Software/OU=Tech/CN=ca" \
        "args[]=10"
