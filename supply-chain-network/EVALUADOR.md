# 🚀 INSTRUCCIONES PARA EL EVALUADOR

## ⚡ Despliegue Automatizado (3 comandos) - CON TODAS LAS MEJORAS

```bash
# 1. Entrar al directorio de la red
cd supply-chain-network

# 2. Ejecutar despliegue automático MEJORADO
./deploy.sh

# 3. Validar que funciona completamente
./validate.sh
```

**✨ Sistema 100% automatizado aplicando todas las lecciones aprendidas** 

## � Mejoras Críticas Aplicadas

### ✅ **Fixes de Timing y Conectividad:**
- **Waits TLS optimizados:** 15-30s para propagación de certificados
- **Retry logic robusto:** 3-8 reintentos en operaciones críticas
- **Timeouts configurables:** 15-60s según la operación
- **Verificación de prerequisites:** Automática antes del despliegue

### ✅ **Configuración Corregida:**
- **Nombre de canal correcto:** `supply-chain-channel` (no `supplychainchannel`)
- **Funciones chaincode:** `CreateAsset`, `InitLedger`, `ReadAsset` (nombres exactos)
- **Múltiples endorsers:** Commit con 4 organizaciones para satisfacer endorsement policy
- **Variables TLS:** Configuración correcta por organización

### ✅ **Validaciones Mejoradas:**
- **Estructura Asset:** Campos `id`, `name`, `type` requeridos
- **Endorsement policy:** Manejo correcto de múltiples peers
- **Certificados:** Regeneración automática en cada despliegue

## �📋 Prerrequisitos Mínimos

- Docker (funcionando)
- Docker Compose 
- Node.js (para compilación del chaincode)
- jq (para parsing JSON)
- curl (para descargas)
- Puertos libres: 7050, 7051, 8051, 9051, 10051

## 🎯 Resultados Esperados

### ✅ **Deploy.sh exitoso:**
```
✅ Prerrequisitos verificados
✅ Entorno limpio completamente  
✅ Binarios de Fabric descargados
✅ Certificados generados exitosamente
✅ Red Fabric iniciada (6 contenedores)
✅ Canal creado exitosamente
✅ 4 organizaciones unidas al canal
✅ Chaincode compilado y empaquetado
✅ Chaincode aprobado en 4 organizaciones
✅ Chaincode committed exitosamente
```

### ✅ **Validate.sh exitoso:**
```
🎉 ¡TODAS LAS PRUEBAS PASARON!
✅ 20+ pruebas exitosas
🚀 La red Supply Chain está completamente funcional
```

## 🔧 Si algo falla (muy raro)

```bash
# Limpiar todo y reiniciar con mejoras aplicadas
./cleanup.sh
./deploy.sh
```

## 🆘 Commit Manual (solo si es necesario)

Si el commit automático falla, ejecutar:
```bash
docker exec cli bash -c "
export CORE_PEER_LOCALMSPID=ProducerMSP
export CORE_PEER_TLS_ENABLED=true
peer lifecycle chaincode commit -o orderer.supplychain.com:7050 --channelID supply-chain-channel --name supply-chain-chaincode --version 3.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem --peerAddresses peer0.producer.supplychain.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt --peerAddresses peer0.factory.supplychain.com:8051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/factory.supplychain.com/peers/peer0.factory.supplychain.com/tls/ca.crt --peerAddresses peer0.retailer.supplychain.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/retailer.supplychain.com/peers/peer0.retailer.supplychain.com/tls/ca.crt --peerAddresses peer0.consumer.supplychain.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/consumer.supplychain.com/peers/peer0.consumer.supplychain.com/tls/ca.crt --waitForEvent
"
```

## 🐛 Si algo falla

```bash
# Limpiar y reintentar
./cleanup.sh
./deploy.sh
```

## ⏱️ Tiempos esperados

- **Despliegue**: 5-10 minutos
- **Validación**: 2-3 minutos
- **Limpieza**: 1-2 minutos

## 📞 Verificación Manual

```bash
# Ver contenedores activos (debe mostrar 6)
docker ps

# Acceder al CLI para pruebas manuales
docker exec -it cli bash
```

---
**Automatización completa basada en lecciones aprendidas** ⚡