#!/bin/bash

kubectl delete fabricorderernodes.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricpeers.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabriccas.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricchaincode.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricmainchannels --all-namespaces --all
kubectl delete fabricfollowerchannels --all-namespaces --all
find . -mindepth 1 \
  ! -wholename './create.sh' \
  ! -wholename './README.md' \
  ! -wholename './.gitignore' \
  ! -wholename './.git' \
  ! -path './north-chaincode/*' \
  ! -path './north-chaincode' \
  ! -path './north-api/*' \
  ! -path './north-api' \
  -exec rm -rf {} +
export SC_NAME=standard

kind delete cluster --name=kind
sleep 25
# Create Kubernetes Cluster
cat << EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:v1.30.2
  extraPortMappings:
  - containerPort: 30949
    hostPort: 80
  - containerPort: 30950
    hostPort: 443
EOF

kind create cluster --config=./kind-config.yaml

helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update

helm install hlf-operator --version=1.11.1 -- kfs/hlf-operator

# Install the Kubectl plugin
kubectl krew install hlf

curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.3 sh -


kubectl create namespace istio-system

export ISTIO_PATH=$(echo $PWD/istio-*/bin)
export PATH="$PATH:$ISTIO_PATH"

istioctl operator init

kubectl apply -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  addonComponents:
    grafana:
      enabled: false
    kiali:
      enabled: false
    prometheus:
      enabled: false
    tracing:
      enabled: false
  components:
    ingressGateways:
      - enabled: true
        k8s:
          hpaSpec:
            minReplicas: 1
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
          service:
            ports:
              - name: http
                port: 80
                targetPort: 8080
                nodePort: 30949
              - name: https
                port: 443
                targetPort: 8443
                nodePort: 30950
            type: NodePort
        name: istio-ingressgateway
    pilot:
      enabled: true
      k8s:
        hpaSpec:
          minReplicas: 1
        resources:
          limits:
            cpu: 300m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: false
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  profile: default

EOF
sleep 5

export PEER_IMAGE=hyperledger/fabric-peer
export PEER_VERSION=3.0.0
export ORDERER_IMAGE=hyperledger/fabric-orderer
export ORDERER_VERSION=3.0.0
export CA_IMAGE=hyperledger/fabric-ca
export CA_VERSION=1.5.13


# Configure Internal DNS
kubectl apply -f - <<EOF
kind: ConfigMap
apiVersion: v1
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        rewrite name regex (.*)\.localho\.st istio-ingressgateway.istio-system.svc.cluster.local
        hosts {
          fallthrough
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
EOF
kubectl create namespace north

sleep 15
# Desplegar Org1MSP
kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard --capacity=1Gi --name=org1-ca --namespace=default \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=north-org1-ca.localho.st --istio-port=443
kubectl wait --timeout=180s --namespace=default --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
curl -k https://north-org1-ca.localho.st:443/cainfo


sleep 10
# registrar usuario en la CA para los peers
kubectl hlf ca register --name=org1-ca --namespace=default --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org1MSP

# Desplegar un peer
sleep 10
kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=Org1MSP \
        --enroll-pw=peerpw --capacity=5Gi --name=org1-peer0 --namespace=default --ca-name=org1-ca.default \
        --hosts=north-peer0-org1.localho.st --istio-port=443
kubectl wait --timeout=180s --for=condition=Running --namespace=default fabricpeers.hlf.kungfusoftware.es --all
sleep 5
openssl s_client -connect north-peer0-org1.localho.st:443

sleep 15
# Desplegar Org2MSP
kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard --capacity=1Gi --name=org2-ca --namespace=default \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=north-org2-ca.localho.st --istio-port=443
kubectl wait --timeout=180s --namespace=default --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
curl -k https://north-org2-ca.localho.st:443/cainfo

sleep 15
# registrar usuario en la CA para los peers
kubectl hlf ca register --name=org2-ca --namespace=default --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org2MSP

sleep 10
# Crear peer de Org2MSP
kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=Org2MSP \
        --enroll-pw=peerpw --capacity=5Gi --name=org2-peer0 --namespace=default --ca-name=org2-ca.default \
        --hosts=north-peer0-org2.localho.st --istio-port=443
kubectl wait --timeout=180s --for=condition=Running --namespace=default fabricpeers.hlf.kungfusoftware.es --all
openssl s_client -connect north-peer0-org2.localho.st:443
sleep 10

#Desplegar una organizacion Orderer
kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard --capacity=1Gi --name=ord-ca --namespace=default \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=north-ord-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --namespace=default --all
curl -vik https://north-ord-ca.localho.st:443/cainfo

sleep 10
#Registrar el usuario orderer
kubectl hlf ca register --name=ord-ca --namespace=default --user=orderer --secret=ordererpw \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP 
sleep 10
#Crear el nodo orderer
kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=standard --enroll-id=orderer --mspid=OrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=ord-node1 --namespace=default --ca-name=ord-ca.default \
    --hosts=north-orderer0-ord.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --namespace=default --all
sleep 25
kubectl get pods --namespace=default
sleep 15
openssl s_client -connect north-orderer0-ord.localho.st:443

# Preparar cadena de conexion para interactuar con el orderer
# 1 Obtener la cadena de conexion sin usuarios
kubectl hlf inspect --output ordservice.yaml -o OrdererMSP --namespace=default

# 2 Registrar un usuario en la autoridad de certificacion TLS
kubectl hlf ca register --name=ord-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP
sleep 10
# 3 Obtener los certificados utilizando el certificado
kubectl hlf ca enroll --name=ord-ca --namespace=default --user=admin --secret=adminpw --mspid OrdererMSP \
        --ca-name ca  --output admin-ordservice.yaml

sleep 5
# 4 Agregar el usuario a la cadena de conexion	
kubectl hlf utils adduser --userPath=admin-ordservice.yaml --config=ordservice.yaml --username=admin --mspid=OrdererMSP

sleep 10

# Crear el secreto
kubectl hlf ca register  --name=ord-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP

kubectl hlf ca enroll --name=ord-ca --namespace=default \
    --user=admin --secret=adminpw --mspid OrdererMSP \
    --ca-name tlsca  --output orderermsp.yaml


kubectl hlf ca register  --name=org1-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=Org1MSP


kubectl hlf ca enroll --name=org1-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Org1MSP \
    --ca-name ca  --output org1msp.yaml

kubectl hlf ca register  --name=org2-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=Org2MSP

kubectl hlf ca enroll --name=org2-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Org2MSP \
    --ca-name ca  --output org2msp.yaml

kubectl create secret generic wallet --namespace=default \
        --from-file=org1msp.yaml=$PWD/org1msp.yaml \
        --from-file=org2msp.yaml=$PWD/org2msp.yaml \
        --from-file=orderermsp.yaml=$PWD/orderermsp.yaml

sleep 10

# crear el canal
export PEER_ORG1_SIGN_CERT=$(kubectl get fabriccas org1-ca --namespace=default -o=jsonpath='{.status.ca_cert}')
export PEER_ORG1_TLS_CERT=$(kubectl get fabriccas org1-ca --namespace=default -o=jsonpath='{.status.tlsca_cert}')
export PEER_SONY_SIGN_CERT=$(kubectl get fabriccas org2-ca --namespace=default -o=jsonpath='{.status.ca_cert}')
export PEER_SONY_TLS_CERT=$(kubectl get fabriccas org2-ca --namespace=default -o=jsonpath='{.status.tlsca_cert}')
export IDENT_8=$(printf "%8s" "")
export ORDERER_TLS_CERT=$(kubectl get fabriccas ord-ca --namespace=default -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node1 --namespace=default -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricMainChannel
metadata:
  name: demo-north
  namespace: default
spec:
  name: demo
  adminOrdererOrganizations:
    - mspID: OrdererMSP
  adminPeerOrganizations:
    - mspID: Org1MSP
  channelConfig:
    application:
      acls: null
      capabilities:
        - V2_0
      policies: null
    capabilities:
      - V2_0
    orderer:
      batchSize:
        absoluteMaxBytes: 1048576
        maxMessageCount: 10
        preferredMaxBytes: 524288
      batchTimeout: 2s
      capabilities:
        - V2_0
      etcdRaft:
        options:
          electionTick: 10
          heartbeatTick: 1
          maxInflightBlocks: 5
          snapshotIntervalSize: 16777216
          tickInterval: 500ms
      ordererType: etcdraft
      policies: null
      state: STATE_NORMAL
    policies: null
  externalOrdererOrganizations: []
  peerOrganizations:
    - mspID: Org1MSP
      caName: "org1-ca"
      caNamespace: "default"
    - mspID: Org2MSP
      caName: "org2-ca"
      caNamespace: "default"
  identities:
    OrdererMSP:
      secretKey: orderermsp.yaml
      secretName: wallet
      secretNamespace: default
    Org1MSP:
      secretKey: org1msp.yaml
      secretName: wallet
      secretNamespace: default
    Org2MSP:
      secretKey: org2msp.yaml
      secretName: wallet
      secretNamespace: default
  externalPeerOrganizations: []
  ordererOrganizations:
    - caName: "ord-ca"
      caNamespace: "default"
      externalOrderersToJoin:
        - host: ord-node1.default
          port: 7053
      mspID: OrdererMSP
      ordererEndpoints:
        - ord-node1.default:7050
      orderersToJoin: []
  orderers:
    - host: ord-node1.default
      port: 7050
      tlsCert: |-
${ORDERER0_TLS_CERT}

EOF
sleep 15

# Unir peers de Org1MSP peer a canal
export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node1 --namespace=default -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: demo-org1msp
spec:
  anchorPeers:
    - host: org1-peer0.default
      port: 7051
  hlfIdentity:
    secretKey: org1msp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: Org1MSP
  name: demo
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://ord-node1.default:7050
  peersToJoin:
    - name: org1-peer0
      namespace: default
  externalPeersToJoin: []
EOF

sleep 10

# Unir peers de Org2MSP peer a canal
export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node1 --namespace=default -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: demo-org2msp
spec:
  anchorPeers:
    - host: org2-peer0.default
      port: 7051
  hlfIdentity:
    secretKey: org2msp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: Org2MSP
  name: demo
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://ord-node1.default:7050
  peersToJoin:
    - name: org2-peer0
      namespace: default
  externalPeersToJoin: []
EOF

# Preparar cadena de conexion para un peer
kubectl hlf inspect --output north.yaml --namespace=default

# Registrar un usuario en la autoridad de certificacion para firma
kubectl hlf ca register --name=org1-ca --namespace=default --user=admin --secret=adminpw --type=admin \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org1MSP

# Obtener los certificados utilizando el usuario creado anteriormente
kubectl hlf ca enroll --name=org1-ca --namespace=default --user=admin --secret=adminpw --mspid Org1MSP \
        --ca-name ca  --output peer-org1.yaml

# Agregar el usuario a la cadena de conexion
kubectl hlf utils adduser --userPath=peer-org1.yaml --config=north.yaml --username=admin --mspid=Org1MSP

# Registrar un usuario en la autoridad de certificacion para firma
kubectl hlf ca register --name=org2-ca --namespace=default --user=admin --secret=adminpw --type=admin \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org2MSP  

# Obtener los certificados utilizando el usuario creado anteriormente
kubectl hlf ca enroll --name=org2-ca --namespace=default --user=admin --secret=adminpw --mspid Org2MSP \
        --ca-name ca  --output peer-org2.yaml

kubectl hlf utils adduser --userPath=peer-org2.yaml --config=north.yaml --username=admin --mspid=Org2MSP

#Añadir clientes a org1 y org2:
kubectl hlf ca register --name=org1-ca --namespace=default --user=client-org1 --secret=clientpw --type=client \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org1MSP  

kubectl hlf ca enroll --name=org1-ca --namespace=default --user=client-org1 --secret=clientpw --mspid Org1MSP \
        --ca-name ca  --output user-org1.yaml

kubectl hlf ca register --name=org2-ca --namespace=default --user=client-org2 --secret=clientpw --type=client \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Org2MSP  

kubectl hlf ca enroll --name=org2-ca --namespace=default --user=client-org2 --secret=clientpw --mspid Org2MSP \
        --ca-name ca  --output user-org2.yaml

sleep 5
kubectl hlf utils adduser --userPath=user-org1.yaml --config=north.yaml --username=user-org1 --mspid=Org1MSP
kubectl hlf utils adduser --userPath=user-org2.yaml --config=north.yaml --username=user-org2 --mspid=Org2MSP
