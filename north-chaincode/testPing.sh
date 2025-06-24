export CP_FILE=$PWD/../north.yaml
CHAINCODE_NAME=north-dev
CHANNEL_NAME=demo

kubectl hlf chaincode invoke --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=addCustomer \
  -a "CUST001" -a "David" -a "Calle Falsa 111"

kubectl hlf chaincode invoke --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=addOrder \
  -a "ORDER001" -a "CUST001" -a "1015-06-15"

kubectl hlf chaincode invoke --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=addOrderDetail \
  -a "DET001" -a "ORDER001" -a "PROD001" -a "6"

kubectl hlf chaincode query --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=queryOrdersByCustomerID \
  -a "CUST001"

kubectl hlf chaincode query --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=queryCustomerByNombre \
  -a "David"

kubectl hlf chaincode query --config=$CP_FILE \
  --user=user-org1 --peer=org1-peer0.default \
  --chaincode=$CHAINCODE_NAME --channel=$CHANNEL_NAME \
  --fcn=queryOrderById \
  -a "ORDER001"
