export CP_FILE=$PWD/../marketplace.yaml
# Ejecutar chaincode
kubectl hlf chaincode query --config=$CP_FILE \
    --user=admin --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=Ping
# Obtener mi identidad
kubectl hlf chaincode query --config=$CP_FILE \
    --user=admin --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getMyIdentity

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-sony --peer=sony-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getMyIdentity

# Crear producto
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-sony --peer=sony-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=createProduct -a '1' -a 'PS5' -a 'Play Station 5' -a '699' -a '20'

# Obtener producto
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-sony --peer=sony-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getProduct -a '1'

# Add fondos a nuestra cuenta
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=setMyBalance -a '3500'

# Obtener nuestros fondos
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getMyBalance

# Comprar un producto
# Como usuario del marketplace, voy a comprar un producto
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=comprar -a '1' -a '2' 

# Obtener balance de nuevo para ver como ha bajado, tiene que estar en 2102:
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getMyBalance

# Obtener nuestros productos
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=getMyVentas

# Comprobar que no podemos comprar mas de 10 productos
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-marketplace --peer=marketplace-peer0.marketplace \
    --chaincode=product-dev --channel=demo \
    --fcn=comprar -a '1' -a '10' 
