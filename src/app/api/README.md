# API Control Panel Besu

Esta API te permite desplegar, limpiar y gestionar redes Hyperledger Besu de forma programática mediante endpoints REST.

## Requisitos

## Comandos principales

### Comandos ordenados para la API

1. Desplegar la red
```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "chainId": 675}'
```

2. Añadir nodos rpc adicionales
```bash
curl -X POST http://localhost:3000/api/deployNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "n": 1}'
```

3. Arrancar el bootnode de una red
```bash
curl -X POST http://localhost:3000/api/startBootnode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

4. Arrancar todos los nodos de una red
```bash
curl -X POST http://localhost:3000/api/startNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

5. Arrancar un nodo específico
```bash
curl -X POST http://localhost:3000/api/startNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

6. Parar un nodo específico
```bash
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rr5-rpc9000"}'
```

7. Parar todos los nodos rpc
```bash
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

8. Parar todos los nodos de una red
```bash
curl -X POST http://localhost:3000/api/stopNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

9. Eliminar un nodo rpc específico
```bash
curl -X POST http://localhost:3000/api/deleteNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

10. Eliminar todos los nodos rpc de la red
```bash
curl -X POST http://localhost:3000/api/deleteAllRpcNodes \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

11. Limpiar la red (eliminar todos los recursos)
```bash
curl -X POST http://localhost:3000/api/cleanNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

12. Listar redes disponibles
```bash
curl -X GET http://localhost:3000/api/networks
```

## Estructura relevante

## Endpoints disponibles

- `/api/deploy`: Despliega una red Besu nueva. Requiere `networkName` y `chainId`.
- `/api/deployNodeRpc`: Añade N nodos rpc a una red existente. Requiere `networkName` y `n` (cantidad).
- `/api/startNode`: Arranca un nodo específico por nombre de contenedor. Requiere `networkName` y `nombreContenedor`.
- `/api/stopNode`: Para un nodo específico o todos los nodos de un tipo. Requiere `networkName` y `tipoOContenedor`.
- `/api/deleteNodeRpc`: Elimina un nodo rpc individual. Requiere `networkName` y `nombreContenedor`.
- `/api/deleteAllRpcNodes`: Elimina todos los nodos rpc de una red. Requiere `networkName`.
- `/api/cleanNetwork`: Limpia todos los recursos de una red. Requiere `networkName`.
- `/api/networks`: Devuelve el listado de redes disponibles (GET).
- `/api/startBootnode`: Arranca el bootnode de una red. Requiere `networkName`.
- `/api/startNetwork`: Arranca todos los nodos de una red. Requiere `networkName`.
- `/api/stopNetwork`: Para todos los nodos de una red. Requiere `networkName`.

### Ejemplos de uso de los endpoints nuevos
## Notas
- Todos los endpoints devuelven un mensaje de éxito o error en formato JSON.
- Puedes adaptar los nombres de red y contenedores según tu despliegue.
