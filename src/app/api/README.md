# API Control Panel Besu

Esta API te permite desplegar, limpiar y gestionar redes Hyperledger Besu de forma programática mediante endpoints REST.

## Requisitos

## Comandos principales


### Comandos ordenados para la API (flujo testBesuLib)

1. Limpiar la red (inicial)
> **Nota:** El endpoint `/api/deploy` realiza una limpieza automática de la red antes de desplegar. No es obligatorio limpiar manualmente antes de desplegar, pero puedes hacerlo si quieres asegurarte de que no quedan recursos previos.
```bash
curl -X POST http://localhost:3000/api/cleanNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

2. Desplegar la red
```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "chainId": 675}'
```

3. Añadir nodos rpc adicionales
```bash
curl -X POST http://localhost:3000/api/deployNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "n": 1}'
```

4. Parar todos los nodos rpc
```bash
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

5. Parar todos los nodos miner
```bash
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "miner"}'
```

6. Arrancar nodo individual miner
```bash
curl -X POST http://localhost:3000/api/startNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-miner"}'
```

7. Arrancar nodo individual rpc
```bash
curl -X POST http://localhost:3000/api/startNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

8. Eliminar nodo rpc individual
```bash
curl -X POST http://localhost:3000/api/deleteNodeRpc \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9000"}'
```

9. Eliminar todos los nodos rpc de la red
```bash
curl -X POST http://localhost:3000/api/deleteAllRpcNodes \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

10. Parar la red completa
```bash
curl -X POST http://localhost:3000/api/stopNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

11. Arrancar la red completa
```bash
curl -X POST http://localhost:3000/api/startNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
```

12. Limpiar la red (final)
```bash
curl -X POST http://localhost:3000/api/cleanNetwork \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5"}'
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
### Ejemplo de respuesta

```json
{
  "status": "ok",
  "message": "Red rr5 desplegada con chainId 675"
}
```

En caso de error:
```json
{
  "error": "networkName y chainId son requeridos"
}
```

### Parámetros esperados

- `networkName`: Nombre de la red (string)
- `chainId`: Identificador de la red (número, solo en /api/deploy)
- `n`: Número de nodos RPC a añadir (número, solo en /api/deployNodeRpc)
- `tipoOContenedor`: Tipo de nodo o nombre de contenedor (string, en /api/stopNode)
- `nombreContenedor`: Nombre del contenedor (string, en /api/startNode y /api/deleteNodeRpc)
## Notas
- Todos los endpoints devuelven un mensaje de éxito o error en formato JSON.
- Puedes adaptar los nombres de red y contenedores según tu despliegue.
- Se recomienda proteger los endpoints y validar los parámetros en producción.
