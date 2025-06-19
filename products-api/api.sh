npm install
npm run build

# Registrar un usuario
http POST "http://localhost:3004/signup" username="user1" password="user1pw"

# Logearnos con el usuario
http POST "http://localhost:3004/login" username="user1" password="user1pw"

# Crear un Producto
http POST "http://localhost:3004/submit" x-user:user1 fcn=createProduct "args[]=1"  \
        "args[]=PS5" "args[]=Play Station 5" "args[]=699" "args[]=10"

# Obtener un Producto
http POST "http://localhost:3004/evaluate" x-user:user1 fcn=getProduct "args[]=1"

# Registrar usuario en Marketplace
http POST "http://localhost:3003/signup" username="user2" password="user2pw"

# Logearnos con otro usuario
http POST "http://localhost:3003/login" username="user2" password="user2pw"

# Add fondos a nuestra cuenta
http POST "http://localhost:3003/submit" x-user:user2 fcn=setMyBalance "args[]=3000"

# Obtener nuestros fondos
http POST "http://localhost:3003/evaluate" x-user:user2 fcn=getMyBalance

# Comprar un producto
http POST "http://localhost:3003/submit" x-user:user2 fcn=comprar "args[]=1" "args[]=1"

# Comprobar que nuestro balance ha sido actualizado
http POST "http://localhost:3003/evaluate" x-user:user2 fcn=getMyBalance

# Obtener productos comprados
http POST "http://localhost:3003/evaluate" x-user:user2 fcn=getMyVentas

# Comprobar que no podemos comprar mas de 10 productos
http POST "http://localhost:3003/submit" x-user:user2 fcn=comprar "args[]=1" "args[]=12"