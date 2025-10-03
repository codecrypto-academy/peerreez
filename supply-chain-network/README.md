# Supply Chain Network - Hyperledger Fabric

Red blockchain específica para trazabilidad de cadena de suministro con 4 organizaciones.

## 🏢 Organizaciones

1. **ProducerOrg** - Productores de materias primas
2. **FactoryOrg** - Fábricas que transforman materiales
3. **RetailerOrg** - Minoristas que distribuyen productos  
4. **ConsumerOrg** - Consumidores finales

## 📋 Configuración de Red

### Estructura de la Red
- **Orderer**: 1 nodo orderer (Solo para simplicidad)
- **Peers**: 1 peer por organización (4 peers total)
- **Canal**: `supply-chain-channel`
- **Chaincode**: `supply-chain-cc`

### Puertos Asignados
- **Orderer**: 7050
- **Producer Peer**: 7051
- **Factory Peer**: 8051  
- **Retailer Peer**: 9051
- **Consumer Peer**: 10051

## 🔐 Políticas de Endorsement

- **Register Material**: Solo ProducerOrg
- **Transform Product**: ProducerOrg + FactoryOrg
- **Distribute Product**: FactoryOrg + RetailerOrg
- **Verify Traceability**: Cualquier organización

## 📁 Estructura de Archivos

```
supply-chain-network/
├── configtx/
│   └── configtx.yaml          # Configuración de canal y organizaciones
├── crypto-config/
│   └── crypto-config.yaml     # Configuración de certificados
├── docker/
│   └── docker-compose.yaml    # Contenedores de la red
├── scripts/
│   ├── network.sh            # Script principal
│   ├── create-channel.sh     # Crear y unir canal
│   └── deploy-chaincode.sh   # Desplegar chaincode
└── chaincode/
    └── supply-chain/         # Chaincode JavaScript
```

## 🚀 Comandos

```bash
# Iniciar red
./scripts/network.sh up

# Crear canal
./scripts/network.sh createChannel

# Desplegar chaincode  
./scripts/network.sh deployCC

# Detener red
./scripts/network.sh down
```