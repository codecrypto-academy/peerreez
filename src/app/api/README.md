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

4. Arrancar todos los nodos RPC (método alternativo con startNodes)
```bash
curl -X POST http://localhost:3000/api/startNodes \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

### Orden correcto para parar todos los nodos RPC

**Opción 1: Parar todos los nodos RPC de una vez**
```bash
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

**Opción 2: Parar nodos RPC individualmente (orden recomendado)**

Primero obtén la lista de redes y nodos para ver el orden actual:
```bash
curl -X GET http://localhost:3000/api/networks
```

Luego para cada nodo RPC en orden alfabético inverso (de mayor a menor número de puerto):
```bash
# Ejemplo para rr5 con múltiples nodos RPC
curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rr5-rpc9210"}'

curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rr5-rpc9209"}'

curl -X POST http://localhost:3000/api/stopNode \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rr5-rpc9002"}'
```

> **Nota importante:** Los nodos RPC se deben parar en orden inverso al de creación para evitar problemas de conectividad. El bootnode y el miner deben permanecer activos hasta el final para mantener la integridad de la red.

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
  -d '{"networkName": "rr5", "nombreContenedor": "rr5-rpc9002"}'
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
- `/api/startNodes`: Arranca todos los nodos de un tipo específico. Requiere `networkName` y `tipoOContenedor`.
- `/api/stopNode`: Para un nodo específico o todos los nodos de un tipo. Requiere `networkName` y `tipoOContenedor`.
- `/api/deleteNodeRpc`: Elimina un nodo rpc individual. Requiere `networkName` y `nombreContenedor`.
- `/api/deleteAllRpcNodes`: Elimina todos los nodos rpc de una red. Requiere `networkName`.
- `/api/cleanNetwork`: Limpia todos los recursos de una red. Requiere `networkName`.
- `/api/networks`: Devuelve el listado de redes disponibles (GET).
- `/api/startBootnode`: Arranca el bootnode de una red. Requiere `networkName`.
- `/api/startNetwork`: Arranca todos los nodos de una red. Requiere `networkName`.
- `/api/stopNetwork`: Para todos los nodos de una red. Requiere `networkName`.
- `/api/logs`: Obtiene los logs de un contenedor específico (GET). Requiere `containerName` como query param.

### Ejemplos de uso de los endpoints nuevos

#### Obtener logs de un contenedor
```bash
curl "http://localhost:3000/api/logs?containerName=rr5-rpc9002&tail=50"
```

#### Arrancar todos los nodos RPC
```bash
curl -X POST http://localhost:3000/api/startNodes \
  -H "Content-Type: application/json" \
  -d '{"networkName": "rr5", "tipoOContenedor": "rpc"}'
```

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
- `tipoOContenedor`: Tipo de nodo o nombre de contenedor (string, en /api/stopNode y /api/startNodes)
- `nombreContenedor`: Nombre del contenedor (string, en /api/startNode y /api/deleteNodeRpc)
- `containerName`: Nombre del contenedor para logs (string, query param en /api/logs)
- `tail`: Número de líneas de log a mostrar (número, query param opcional en /api/logs, por defecto 100)
## Notas

- Todos los endpoints devuelven un mensaje de éxito o error en formato JSON.
- Puedes adaptar los nombres de red y contenedores según tu despliegue.
- Se recomienda proteger los endpoints y validar los parámetros en producción.

## Mejores prácticas para gestión de nodos RPC

### Orden de parada de nodos RPC

1. **Orden recomendado**: Para los nodos RPC en orden alfabético inverso (por nombre de contenedor)
2. **Razón**: Los nodos creados más recientemente tienden a tener menos conexiones activas
3. **Verificación**: Usa `/api/networks` para obtener la lista actual ordenada alfabéticamente

### Secuencia de parada completa de red

Para parar una red completa de forma segura:

1. Parar nodos RPC (en orden inverso)
2. Parar nodo miner
3. Parar bootnode (al final)

O usar el endpoint `/api/stopNetwork` para parar todo automáticamente.

### Monitoreo

- Usa `/api/logs?containerName=NOMBRE&tail=50` para verificar el estado de parada
- Espera unos segundos entre paradas de nodos para permitir desconexiones limpias

## Tests automatizados

Para probar toda la API de forma automatizada, puedes usar los scripts de testing incluidos:

### Script de Bash (recomendado para Linux/macOS)

```bash
# Ejecutar desde la raíz del proyecto
./src/app/api/test-api-complete.sh
```

Este script:
- ✅ Inicia automáticamente el servidor de desarrollo (`npm run dev`)
- ✅ Espera a que el servidor esté disponible
- ✅ Ejecuta todos los 17 pasos de testing secuencialmente
- ✅ Muestra resultados con colores y formateo claro
- ✅ Permite detener el servidor al finalizar

### Script de TypeScript (alternativa multiplataforma)

```bash
# Ejecutar desde la raíz del proyecto
cd src/app/api
./test-api-complete.sh
```

Este script en TypeScript:
- ✅ Funciona en cualquier plataforma (Windows, Linux, macOS)
- ✅ Manejo de errores más robusto
- ✅ Interfaz orientada a objetos
- ✅ Mismo flujo de testing que el script de bash

### Configuración de los tests

Los scripts usan la siguiente configuración por defecto:
- **Red de prueba**: `test-api`
- **Chain ID**: `2025`
- **Puerto del servidor**: `3000`
- **Número de nodos RPC**: `3`

### Flujo completo de testing

Los scripts ejecutan automáticamente:
1. Limpieza inicial de la red
2. Despliegue de red Besu
3. Adición de nodos RPC
4. Verificación de estado
5. Arranque/parada de nodos por grupos
6. Gestión de nodos individuales
7. Obtención de logs
8. Eliminación de nodos
9. Gestión completa de red
10. Limpieza final

### Requisitos para los tests

- Node.js >= 18
- Docker ejecutándose
- Puerto 3000 disponible
- Dependencias del proyecto instaladas (`npm install`)
