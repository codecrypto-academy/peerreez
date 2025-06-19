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
  ! -path './products-chaincode/*' \
  ! -path './products-chaincode' \
  ! -path './products-api/*' \
  ! -path './products-api' \
  -exec rm -rf {} +
export SC_NAME=standard

kind delete cluster --name=kind
sleep 20
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
kubectl create ns marketplace

# Desplegar MarketplaceMSP
# Desplegar una autoridad de certificacion
kubectl hlf ca create  --image=$CA_IMAGE --version=$CA_VERSION   --storage-class=standard --capacity=1Gi --name=marketplace-ca --namespace=marketplace \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=marketplace-ca.localho.st --istio-port=443


kubectl wait --timeout=180s --namespace=marketplace --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
curl -k https://marketplace-ca.localho.st:443/cainfo
# registrar usuario en la CA para los peers
kubectl hlf ca register --name=marketplace-ca --namespace=marketplace --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid MarketplaceMSP

sleep 5
# Desplegar los peers
kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=MarketplaceMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=marketplace-peer0 --namespace=marketplace --ca-name=marketplace-ca.marketplace \
        --hosts=peer0-marketplace.localho.st --istio-port=443


kubectl wait --timeout=180s --for=condition=Running --namespace=marketplace fabricpeers.hlf.kungfusoftware.es --all
sleep 5
openssl s_client -connect peer0-marketplace.localho.st:443

# Desplegar SonyMSP
# Desplegar una autoridad de certificacion
kubectl hlf ca create   --image=$CA_IMAGE --version=$CA_VERSION   --storage-class=standard --capacity=1Gi --name=sony-ca --namespace=marketplace \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=sony-ca.localho.st --istio-port=443


kubectl wait --timeout=180s --namespace=marketplace --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
curl -k https://sony-ca.localho.st:443/cainfo

sleep 5

# registrar usuario en la CA para los peers
kubectl hlf ca register --name=sony-ca --namespace=marketplace --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid SonyMSP

#Desplegar un peer
kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=SonyMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=sony-peer0 --namespace=marketplace --ca-name=sony-ca.marketplace \
        --hosts=peer0-sony.localho.st --istio-port=443


kubectl wait --timeout=180s --for=condition=Running --namespace=marketplace fabricpeers.hlf.kungfusoftware.es --all
openssl s_client -connect peer0-sony.localho.st:443

# Desplegar una organizacion Orderer
kubectl hlf ca create   --image=$CA_IMAGE --version=$CA_VERSION   --storage-class=standard --capacity=1Gi --name=ord-ca --namespace=marketplace \
    --enroll-id=enroll --enroll-pw=enrollpw --hosts=marketplace-ord-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --namespace=marketplace --all

curl -vik https://marketplace-ord-ca.localho.st:443/cainfo
sleep 5
# Registrar el usuario orderer
kubectl hlf ca register --name=ord-ca --namespace=marketplace --user=orderer --secret=ordererpw \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP --ca-url="https://marketplace-ord-ca.localho.st:443"

# Desplegar orderer
kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=standard --enroll-id=orderer --mspid=OrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=ord-node2 --namespace=marketplace --ca-name=ord-ca.marketplace \
    --hosts=marketplace-orderer2-ord.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --namespace=marketplace --all

sleep 15
kubectl get pods --namespace=marketplace
openssl s_client -connect marketplace-orderer2-ord.localho.st:443
sleep 5

# Crear el secreto wallet
kubectl hlf ca register  --name=ord-ca --namespace=marketplace --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP


kubectl hlf ca enroll --name=ord-ca --namespace=marketplace \
    --user=admin --secret=adminpw --mspid OrdererMSP \
    --ca-name tlsca  --output orderermsp.yaml

kubectl hlf ca register --name=marketplace-ca --namespace=marketplace --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=MarketplaceMSP


kubectl hlf ca enroll --name=marketplace-ca --namespace=marketplace \
    --user=admin --secret=adminpw --mspid MarketplaceMSP \
    --ca-name ca  --output marketplacemsp.yaml


kubectl hlf ca register --name=sony-ca --namespace=marketplace --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=SonyMSP

kubectl hlf ca enroll --name=sony-ca --namespace=marketplace \
    --user=admin --secret=adminpw --mspid SonyMSP \
    --ca-name ca  --output sonymsp.yaml

kubectl create secret generic wallet --namespace=marketplace \
        --from-file=marketplacemsp.yaml=$PWD/marketplacemsp.yaml \
        --from-file=sonymsp.yaml=$PWD/sonymsp.yaml \
        --from-file=orderermsp.yaml=$PWD/orderermsp.yaml

sleep 5 
# Crear el canal

export IDENT_8=$(printf "%8s" "")
export ORDERER_TLS_CERT=$(kubectl get fabriccas ord-ca --namespace=marketplace -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node2 --namespace=marketplace -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricMainChannel
metadata:
  name: demo-marketplace
  namespace: marketplace
spec:
  name: demo
  adminOrdererOrganizations:
    - mspID: OrdererMSP
  adminPeerOrganizations:
    - mspID: MarketplaceMSP
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
    - mspID: MarketplaceMSP
      caName: "marketplace-ca"
      caNamespace: "marketplace"
    - mspID: SonyMSP
      caName: "sony-ca"
      caNamespace: "marketplace"
  identities:
    OrdererMSP:
      secretKey: orderermsp.yaml
      secretName: wallet
      secretNamespace: marketplace
    MarketplaceMSP:
      secretKey: marketplacemsp.yaml
      secretName: wallet
      secretNamespace: marketplace
    SonyMSP:
      secretKey: sonymsp.yaml
      secretName: wallet
      secretNamespace: marketplace
  externalPeerOrganizations: []
  ordererOrganizations:
    - caName: "ord-ca"
      caNamespace: "marketplace"
      externalOrderersToJoin:
        - host: ord-node2.marketplace
          port: 7053
      mspID: OrdererMSP
      ordererEndpoints:
        - marketplace-orderer2-ord.localho.st:443
      orderersToJoin: []
  orderers:
    - host: marketplace-orderer2-ord.localho.st
      port: 443
      tlsCert: |-
${ORDERER0_TLS_CERT}

EOF
sleep 10
kubectl get fabricmainchannels

# Unir peers de MarketplaceMSP peer a canal

export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node2 --namespace=marketplace -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: demo-marketplacemsp
spec:
  anchorPeers:
    - host: peer0-marketplace.localho.st
      port: 443
  hlfIdentity:
    secretKey: marketplacemsp.yaml
    secretName: wallet
    secretNamespace: marketplace
  mspId: MarketplaceMSP
  name: demo
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://ord-node2.marketplace:7050
  peersToJoin:
    - name: marketplace-peer0
      namespace: marketplace
  externalPeersToJoin: []
EOF
sleep 10
kubectl get fabricfollowerchannel     

# Unir peers de SonyMSP peer a canal

export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node2 --namespace=marketplace -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )

kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: demo-sonymsp
spec:
  anchorPeers:
    - host: peer0-sony.localho.st
      port: 443
  hlfIdentity:
    secretKey: sonymsp.yaml
    secretName: wallet
    secretNamespace: marketplace
  mspId: SonyMSP
  name: demo
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://ord-node2.marketplace:7050
  peersToJoin:
    - name: sony-peer0
      namespace: marketplace
  externalPeersToJoin: []
EOF

sleep 5
kubectl get fabricfollowerchannel

# Preparar cadena de conexion para un peer
kubectl hlf inspect --output marketplace.yaml --namespace=marketplace

kubectl hlf ca register --name=marketplace-ca --namespace=marketplace --user=admin --secret=adminpw --type=admin \
 --enroll-id enroll --enroll-secret=enrollpw --mspid MarketplaceMSP  

kubectl hlf ca enroll --name=marketplace-ca --namespace=marketplace --user=admin --secret=adminpw --mspid MarketplaceMSP \
        --ca-name ca  --output peer-marketplace.yaml

kubectl hlf utils adduser --userPath=peer-marketplace.yaml --config=marketplace.yaml --username=admin --mspid=MarketplaceMSP

kubectl hlf ca register --name=sony-ca --namespace=marketplace --user=admin --secret=adminpw --type=admin \
 --enroll-id enroll --enroll-secret=enrollpw --mspid SonyMSP  

kubectl hlf ca enroll --name=sony-ca --namespace=marketplace --user=admin --secret=adminpw --mspid SonyMSP \
        --ca-name ca  --output peer-sony.yaml

kubectl hlf utils adduser --userPath=peer-sony.yaml --config=marketplace.yaml --username=admin --mspid=SonyMSP

sleep 5
kubectl hlf ca register --name=marketplace-ca --namespace=marketplace --user=client-marketplace --secret=clientpw --type=client \
 --enroll-id enroll --enroll-secret=enrollpw --mspid MarketplaceMSP  

kubectl hlf ca enroll --name=marketplace-ca --namespace=marketplace --user=client-marketplace --secret=clientpw --mspid MarketplaceMSP \
        --ca-name ca  --output user-marketplace.yaml

kubectl hlf ca register --name=sony-ca --namespace=marketplace --user=client-sony --secret=clientpw --type=client \
 --enroll-id enroll --enroll-secret=enrollpw --mspid SonyMSP  

kubectl hlf ca enroll --name=sony-ca --namespace=marketplace --user=client-sony --secret=clientpw --mspid SonyMSP \
        --ca-name ca  --output user-sony.yaml


kubectl hlf utils adduser --userPath=user-marketplace.yaml --config=marketplace.yaml --username=user-marketplace --mspid=MarketplaceMSP
kubectl hlf utils adduser --userPath=user-sony.yaml --config=marketplace.yaml --username=user-sony --mspid=SonyMSP
