# PMF Web3 — Guía completa de despliegue

Este repositorio contiene:

- Una red Hyperledger Fabric para trazabilidad (carpeta `supply-chain-network/`).
- Hyperledger Explorer para monitorización (dentro de `supply-chain-network/explorer`).
- Una app frontend Next.js en `src/` que usa el gateway Fabric incluido.
- Un puente de desarrollo (MetaMask ↔ Fabric) en `src/bridge/`.

Este README explica, con referencias a archivos del repo, cómo limpiar, crear y validar la red Fabric, desplegar Explorer con su monitor, desplegar el puente y ejecutar la app Next.js.

---

## Índice

1. Requisitos
2. Limpieza del entorno
3. Crear y validar la red Hyperledger Fabric
4. Desplegar y monitorizar Hyperledger Explorer
5. Desplegar el bridge MetaMask ↔ Fabric
6. Desplegar la app Next.js
7. Verificaciones y pruebas end-to-end
8. Mapa de archivos clave (análisis por archivo)
9. Troubleshooting y seguridad

---

## 1) Requisitos

- Docker (y `docker compose`), Docker Engine corriendo
- Node.js >= 18, npm
- curl, jq, nc (netcat)
- Permisos para usar Docker (o `sudo`)

Instalar dependencias JS (para bridge / frontend):

```bash
npm install
npx tsc --noEmit
```

---

## 2) Limpieza del entorno

El despliegue usa scripts en `supply-chain-network/`. El script `deploy.sh` incluye un paso `cleanup_environment`. También hay un script independiente `cleanup.sh`.

Para limpiar manualmente:

```bash
# Detener y eliminar containers del compose de la red
cd supply-chain-network/docker
docker compose down -v
cd ../..
# Limpiar artefactos locales
rm -rf supply-chain-network/crypto-config supply-chain-network/channel-artifacts
# Opcional: limpiar docker
docker system prune -f
```

---

## 3) Crear y validar la red Hyperledger Fabric

El script principal de despliegue es `supply-chain-network/deploy.sh`. Ejecuta todo el flujo: generar certificados, crear genesis block, arrancar contenedores, crear canal, empaquetar e instalar chaincode y ejecutar pruebas de smoke.

Uso:

```bash
cd supply-chain-network
bash deploy.sh
```

Qué hace (resumen de pasos dentro de `deploy.sh`):

- Verifica prerrequisitos (docker, node, jq, curl)
- Limpia contenedores/artefactos previos
- Descarga binarios de Fabric (`bin/`)
- Genera certificados (`crypto-config/` via cryptogen)
- Crea genesis block y artefactos con `configtxgen` (`channel-artifacts/`)
- Inicia contenedores Docker (compose en `supply-chain-network/docker/docker-compose.yaml`)
- Crea y une canal `supply-chain-channel`
- Compila y empaqueta chaincode TypeScript (en `supply-chain-network/chaincode/supply-chain/`)
- Instala, aprueba y hace commit del chaincode
- Prueba `InitLedger`, `CreateAsset`, `ReadAsset` para validar

Verificación manual:

```bash
# comprobar contenedores
docker ps
# logs de orderer/peer
docker logs orderer
docker logs peer0.producer
# pruebas con CLI (dentro del container 'cli')
docker exec -it cli bash
peer chaincode query -C supply-chain-channel -n supply-chain-chaincode -c '{"function":"AssetExists","args":["id"]}'
```

---

## 4) Desplegar y monitorizar Hyperledger Explorer

Explorer se configura en `supply-chain-network/explorer/`. El archivo `monitor.sh` automatiza la puesta en marcha y verificación.

Arrancar Explorer con monitor (opción completa `--run-all` ejecuta cleanup -> deploy -> validate -> create_wallet_local):

```bash
cd supply-chain-network
./explorer/monitor.sh --run-all
# o simplemente
./explorer/monitor.sh
```

Qué hace `monitor.sh` (resumen):

- Crea red Docker si hace falta
- Asegura directorio host para Postgres (`${HOME}/explorer_db_data`)
- Aplica el schema SQL (`explorerpg.sql`) a Postgres
- Crea/coloca la identidad admin en la wallet de Explorer (`explorer/wallet`)
- Resuelve nombres de keystore y genera archivos `connection-profile.resolved.json` y `explorer-config.resolved.json`
- Inicia contenedor Explorer y lanza `syncstart.sh` dentro del contenedor para discovery
- Ejecuta smoke tests HTTP + DB, e intenta obtener token de login y generar un token injector

Compose y rutas

- `supply-chain-network/explorer/docker-compose-explorer.yaml` — compose para `explorer-db` (Postgres) y `explorer` (UI)
- UI disponible en `http://localhost:8080`

Problemas comunes:

- Explorer puede fallar si las rutas a los keystores no se resolvieron; `monitor.sh` intenta auto-resolver.
- Revisa `supply-chain-network/explorer/explorer-monitor.log` y logs del contenedor Explorer.

---

## 5) Desplegar el bridge (MetaMask ↔ Fabric)

El bridge es un servicio de desarrollo en `src/bridge/` con estos archivos:

- `src/bridge/bridgeServer.ts` — Express API con endpoints:
  - `POST /invoke` — recibe `{ message, signature, functionName, args, role }`, verifica firma con ethers y llama a Fabric (vía gatewayService o contract)
  - `GET /query` — `evaluateTransaction`.
  - `POST /map` y `GET /map/:address` — mapeo EOA → Fabric identity (file-backed en `src/bridge/identityMapper.ts`).
  - `GET /health` — estado simple.
- `src/bridge/fabricRpcBridge.ts` — pequeño JSON-RPC shim en puerto 7844 para que MetaMask pueda "añadir" la red `bridge-fabric`.

Arranque (desde la raíz del repo):

```bash
npm run bridge:start   # arranca src/bridge/bridgeServer.ts en :3001
npm run rpc:start      # arranca src/bridge/fabricRpcBridge.ts en :7844
```

Añadir la red en MetaMask:

- Network Name: `bridge-fabric`
- RPC URL: `http://localhost:7844`
- Chain ID: `334455` (decimal) / `0x51a77` (hex)

Formato de invocación esperado por `/invoke`:

```json
{
  "message": "{\"nonce\":\"<uuid>\",\"timestamp\":<ms>,\"functionName\":\"CreateAsset\",\"args\":[\"asset1\",\"blue\",\"100\"]}",
  "signature": "0x...",
  "functionName": "CreateAsset",
  "args": ["asset1","blue","100"]
}
```

Opción JSON-RPC hacia el shim:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "fabric_invoke",
  "params": [{ "message":"...","signature":"0x...","functionName":"CreateAsset","args":["asset1","blue","100"] }]
}
```

Limitaciones y seguridad:

- `/map` no está protegido: añadir autenticación (JWT/admin token) antes de usar en entornos colaborativos.
- Nonces en memoria: cambiar a Redis o DB compartida para despliegues multi-instancia.
- El shim JSON-RPC no implementa EVM completo: es solo para que MetaMask vea la red y use el método custom.

---

## 6) Desplegar la aplicación Next.js

La app Next.js se encuentra en `src/` y tiene rutas para Producer/Factory/Retailer/Consumer.

Desarrollo:

```bash
npm run dev
# abre http://localhost:3000
```

Producción (local):

```bash
npm run build
npm run start
```

Endpoints API server-side (ejemplos):

- `src/app/api/fabric/gateway/*` — endpoints que usan `src/lib/fabric/gateway/gateway-service.ts`.

Si deseas integrar la UI con el bridge para firmar en el navegador, añade llamadas desde el frontend para firmar (window.ethereum.request({ method: 'personal_sign', params: [...] })) y enviar la firma al bridge `/invoke`.

---

## 7) Verificaciones y pruebas end-to-end (sugerencia)

Prueba mínima recomendada:

1. `cd supply-chain-network && bash deploy.sh` — desplegar y validar Fabric
2. `./explorer/monitor.sh --run-all` — arrancar explorer
3. `npm run bridge:start` y `npm run rpc:start`
4. Generar un payload de prueba y firmarlo con MetaMask (o con ethers en un script) y POST a `http://localhost:3001/invoke`
5. Verificar en Explorer que la transacción aparece o usar `peer chaincode query` en la CLI

Si quieres, puedo generar un script `scripts/invoke-example.js` que use ethers para firmar localmente y haga el POST a `/invoke`.

---

## 8) Mapa de archivos clave (análisis por archivo)

- `supply-chain-network/deploy.sh` — orquesta despliegue completo (leer y usarlo tal cual para reproducibilidad).
- `supply-chain-network/cleanup.sh` — limpieza de red.
- `supply-chain-network/docker/docker-compose.yaml` — definición de contenedores Fabric.
- `supply-chain-network/chaincode/supply-chain/` — código del chaincode (TS). `start.js` es el entrypoint usado al empaquetar.
- `supply-chain-network/explorer/monitor.sh` — orquesta Explorer + DB y resuelve problemas típicos de keystore.
- `src/lib/fabric/gateway/gateway-service.ts` — gateway-service que encapsula conexiones al Fabric gateway (inyectable en bridge).
- `src/bridge/bridgeServer.ts` — servidor Express del bridge.
- `src/bridge/fabricRpcBridge.ts` — shim JSON-RPC para MetaMask.
- `src/bridge/identityMapper.ts` — mapeo EOA → identidad Fabric (almacenamiento en JSON local).

---

## 9) Troubleshooting y seguridad

Problemas comunes y soluciones:

- Error en `peer lifecycle`/`osnadmin`: espera más tiempo, revisa logs (`docker logs`) y que `crypto-config/` y `channel-artifacts/` existan.
- Explorer no inicia: revisar `explorer-monitor.log`, permisos de `explorer_db_data`, y que el wallet contenga la identidad admin.
- Bridge no responde: comprobar `npm run bridge:start` logs, puerto 3001, y que `gateway-service` esté disponible si esperas usar `submitTransactionWithIdentity`.

Seguridad:

- Nunca expongas `/map` sin autenticación.
- Usa HTTPS/TLS para cualquier despliegue remoto y una store persistente para nonces.

---

Si quieres que genere:

- Un script de ejemplo `scripts/invoke-example.js` para firmar con ethers y llamar a `/invoke`.
- Un `Makefile` para orquestar `deploy.sh`, `monitor.sh` y arranque del bridge.

Dime cuál de los anteriores prefieres y lo implemento.
