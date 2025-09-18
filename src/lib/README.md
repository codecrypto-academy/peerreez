# Besu Network Control Library

Esta librería te permite desplegar, limpiar y gestionar redes Hyperledger Besu de forma programática y desde scripts en Node.js/TypeScript.

## Requisitos
- Node.js >= 18
- Docker
- Acceso a la terminal con permisos para gestionar contenedores y redes Docker

## Instalación

Clona el repositorio y navega a la carpeta del proyecto:

```bash
git clone <repo-url>
cd web25-control-panel-besu-2025
npm install
```


## Ejemplo paso a paso: Despliegue, gestión y limpieza de una red Besu

Supongamos que quieres crear una red llamada `test` con chainId `2025`, detener y arrancar nodos específicos, y finalmente limpiar la red. Sigue estos pasos:



### 1. Desplegar la red

```bash
node --loader ts-node/esm src/lib/deployNetwork.ts rr3 112121
```

Esto creará la red Docker, los contenedores bootnode, miner y un rpc, y dejará todo listo para operar.

### 1b. Añadir nodos rpc adicionales

Puedes añadir más nodos rpc a la red en cualquier momento:

```bash
node --loader ts-node/esm src/lib/deployNodeRpc.ts rr3 2
```

El ejemplo anterior añade 3 nodos rpc extra a la red `test`.

### 2. Parar un nodo específico (por ejemplo, un nodo rpc)

```bash
node --loader ts-node/esm src/lib/stopNodes.ts rr3 rr3-rpc9000
```

Si el nodo pertenece a la red, será detenido aunque esté parado previamente. Si no pertenece, mostrará un error.

### 3. Arrancar un nodo específico

```bash
node --loader ts-node/esm src/lib/startNode.ts rr3 rr3-rpc9000
```

Esto arrancará el contenedor si pertenece a la red y no es un bootnode.

### 4. Parar todos los nodos rpc de la red

```bash
node --loader ts-node/esm src/lib/stopNodes.ts rr3 rpc
```

### 5. Eliminar un nodo rpc específico

```bash
node --loader ts-node/esm src/lib/deleteNodeRpc.ts rr3 rr3-rpc9000
```

Esto eliminará el contenedor, el directorio y la configuración del nodo rpc indicado.

### 6. Eliminar todos los nodos rpc de la red

```bash
node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts rr3
```

Esto eliminará todos los contenedores rpc y sus directorios/config asociados de la red indicada.



Esto eliminará todos los contenedores, la red Docker y los archivos asociados a la red `test`.

### 8. Arrancar el bootnode de una red

```bash
node --loader ts-node/esm src/lib/startBootnode.ts test
```

Esto arrancará el bootnode de la red indicada.

### 9. Arrancar todos los nodos de una red

```bash
node --loader ts-node/esm src/lib/startNetwork.ts test
```

Esto arrancará todos los nodos (bootnode, miner, rpc) de la red indicada.

### 10. Parar todos los nodos de una red

```bash
node --loader ts-node/esm src/lib/stopNetwork.ts test
```

Esto detendrá todos los nodos de la red indicada.

### 11. Listar redes disponibles

```bash
node --loader ts-node/esm src/lib/operations.ts listNetworks
```

Esto mostrará el listado de redes Besu gestionadas por la librería.
### 7. Limpiar la red (eliminar todos los recursos)

```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts rr3
```
---

## Tests automáticos

Puedes probar cada funcionalidad de la librería con los siguientes tests:

```bash
node --loader ts-node/esm src/lib/test/testDeployNetwork.ts         # Despliega la red
node --loader ts-node/esm src/lib/test/testAddRpcNodes.ts           # Añade nodos rpc
node --loader ts-node/esm src/lib/test/testStopNode.ts              # Para un nodo rpc
node --loader ts-node/esm src/lib/test/testStartNode.ts             # Arranca un nodo rpc
node --loader ts-node/esm src/lib/test/testDeleteNodeRpc.ts         # Elimina un nodo rpc individual
node --loader ts-node/esm src/lib/test/testDeleteAllRpcNodes.ts     # Elimina todos los nodos rpc
node --loader ts-node/esm src/lib/test/testCleanNetwork.ts          # Limpia la red
```

Puedes ejecutar cada test por separado según la funcionalidad que quieras validar.

### Comandos ordenados para la librería

1. Desplegar la red
```bash
node --loader ts-node/esm src/lib/deployNetwork.ts test 2025
```
2. Añadir nodos rpc adicionales
```bash
node --loader ts-node/esm src/lib/deployNodeRpc.ts test 2
```
3. Arrancar el bootnode de una red
```bash
node --loader ts-node/esm src/lib/startBootnode.ts test
```
4. Arrancar todos los nodos de una red
```bash
node --loader ts-node/esm src/lib/startNetwork.ts test
```
5. Arrancar un nodo específico
```bash
node --loader ts-node/esm src/lib/startNode.ts test test-rpc9000
```
6. Parar un nodo específico
```bash
node --loader ts-node/esm src/lib/stopNodes.ts test test-rpc9000
```
7. Parar todos los nodos rpc de la red
```bash
node --loader ts-node/esm src/lib/stopNodes.ts test rpc
```
8. Parar todos los nodos de una red
```bash
node --loader ts-node/esm src/lib/stopNetwork.ts test
```
9. Eliminar un nodo rpc específico
```bash
node --loader ts-node/esm src/lib/deleteNodeRpc.ts test test-rpc9000
```
10. Eliminar todos los nodos rpc de la red
```bash
node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts test
```
11. Limpiar la red (eliminar todos los recursos)
```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts test
```
12. Listar redes disponibles
```bash
node --loader ts-node/esm src/lib/operations.ts listNetworks
```

---

Puedes adaptar los nombres de red y contenedores según tu despliegue. Consulta la sección de Uso como librería para integración directa en TypeScript.

## Uso como librería en TypeScript

```typescript
import { deployNetwork } from './src/lib/deployNetwork.js';
import { cleanNetwork } from './src/lib/cleanNetwork.js';

await deployNetwork('r1', 2025);
await cleanNetwork('r1');
```

## Estructura relevante
- `src/lib/deployNetwork.ts`: Despliega una red Besu
- `src/lib/cleanNetwork.ts`: Limpia una red Besu
- `src/lib/deployNodeRpc.ts`: Añade nodos rpc a una red existente
- `src/lib/deleteNodeRpc.ts`: Elimina un nodo rpc individual
- `src/lib/deleteAllRpcNodes.ts`: Elimina todos los nodos rpc de una red
- `src/lib/startNode.ts`: Arranca un nodo específico
- `src/lib/stopNodes.ts`: Para nodos específicos o por tipo
- `src/lib/startBootnode.ts`: Arranca el bootnode de una red
- `src/lib/startNetwork.ts`: Arranca todos los nodos de una red
- `src/lib/stopNetwork.ts`: Para todos los nodos de una red
- `src/lib/operations.ts`: Operaciones utilitarias (listado de redes, etc.)
- `src/lib/test/testDeployNetwork.ts`: Test de despliegue de red
- `src/lib/test/testAddRpcNodes.ts`: Test de añadir nodos rpc
- `src/lib/test/testStopNode.ts`: Test de parar nodo
- `src/lib/test/testStartNode.ts`: Test de arrancar nodo
- `src/lib/test/testDeleteNodeRpc.ts`: Test de eliminar nodo rpc individual
- `src/lib/test/testDeleteAllRpcNodes.ts`: Test de eliminar todos los nodos rpc
- `src/lib/test/testCleanNetwork.ts`: Test de limpieza de red
- `src/scripts/`: Scripts bash alternativos

## Notas
- Asegúrate de tener Docker corriendo antes de usar la librería.
- Los nombres de red (`r1`, `r2`, etc.) deben coincidir con los usados en tu configuración.
- Puedes personalizar los scripts según tus necesidades.

---

¿Dudas o problemas? Abre un issue o contacta con el autor.
