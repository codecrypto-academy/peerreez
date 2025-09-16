# API Control Panel Besu

Esta API te permite desplegar, limpiar y gestionar redes Hyperledger Besu de forma programática mediante endpoints REST.

## Requisitos

## Comandos principales

### 1. Desplegar la red
```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "chainId": 675}'
```

### 2. Añadir nodos rpc adicionales
```bash
curl -X POST http://localhost:3000/api/deployNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "n": 3}'
```

### 3. Arrancar un nodo específico
```bash
curl -X POST http://localhost:3000/api/startNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

### 4. Parar un nodo específico o todos los nodos rpc
```bash
# Parar nodo específico
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rr5-rpc9000"}'

# Parar todos los nodos rpc
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

### 5. Eliminar un nodo rpc específico
```bash
curl -X POST http://localhost:3000/api/deleteNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

### 6. Eliminar todos los nodos rpc de la red
```bash
curl -X POST http://localhost:3000/api/deleteAllRpcNodes \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

### 7. Limpiar la red (eliminar todos los recursos)
```bash
curl -X POST http://localhost:3000/api/cleanNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

### 6. Limpiar la red (eliminar todos los recursos)
```bash
curl -X POST http://localhost:3000/api/cleanNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

---

## Estructura relevante

## Endpoints disponibles
- `/api/deploy`: Despliega una red Besu
- `/api/deployNodeRpc`: Añade nodos rpc a una red existente
- `/api/startNode`: Arranca un nodo específico
- `/api/stopNode`: Para nodos específicos o por tipo
- `/api/deleteNodeRpc`: Elimina un nodo rpc individual
- `/api/deleteAllRpcNodes`: Elimina todos los nodos rpc de una red
- `/api/cleanNetwork`: Limpia una red Besu

## Notas
- Todos los endpoints devuelven un mensaje de éxito o error en formato JSON.
- Puedes adaptar los nombres de red y contenedores según tu despliegue.
