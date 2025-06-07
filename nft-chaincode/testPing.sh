export CP_FILE=$PWD/../nft.yaml

# Ping chaincode
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=ping
# Inicializar chaincode
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=Initialize -a 'Dolar' -a '$'

# Ejecutar chaincode
IDENTITY_ORG1=$(kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=ClientAccountID)

echo "Mi Identity es: \"$IDENTITY_ORG1\""

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=BalanceOf -a "$IDENTITY_ORG1"

# Mintear token
kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=Mint \
     -a '1' \
     -a 'https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png' \
     -a 'DPS' \
     -a 'Description'

# Obtener la URI del token por el ID
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=GetToken -a '1'

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=Symbol

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=Name


kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=TotalSupply

# Transferir
IDENTITY_ORG2=$(kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org2 --peer=org2-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=ClientAccountID)

echo "Mi Identity Org2 es: \"$IDENTITY_ORG2\""


OWNER_ID=$(kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=OwnerOf -a "1")

kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=TransferFrom \
    -a "$OWNER_ID" \
    -a "$IDENTITY_ORG2" \
    -a "1"

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org2 --peer=org2-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=OwnerOf -a "1"

# Comprobar nuestro balance token
kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org2 --peer=org2-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=ClientAccountBalance

kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=ClientAccountBalance

kubectl hlf chaincode invoke --config=$CP_FILE \
    --user=user-org2 --peer=org2-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=Burn -a "1"


kubectl hlf chaincode query --config=$CP_FILE \
    --user=user-org1 --peer=org1-peer0.default \
    --chaincode=nft-dev --channel=demo \
    --fcn=GetTokens | jq