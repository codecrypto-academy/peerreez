# Besu Network Control Library

Esta librería te permite desplegar, limpiar y gestionar redes Hyperledger Besu de forma programática y desde scripts en Node.js/TypeScript.

## Punto de entrada

Puedes importar las funciones principales desde `src/lib/index.ts`:

```typescript
import { deployNetwork, cleanNetwork } from './src/lib';
```

Además, puedes usar utilidades avanzadas desde `operations.ts`:

```typescript
import { getNetworks, generateNodeKeys, getEthBalance, sendTransaction, deriveAccounts, fundMnemonic } from './src/lib/operations';
```

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


### Comandos ordenados para la librería (flujo testBesuLib)

1. Limpiar la red (inicial)
(Opcional el deploy hace limpieza previa)
```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts test
```

2. Desplegar la red
```bash
node --loader ts-node/esm src/lib/deployNetwork.ts test 2025
```

3. Añadir nodos rpc adicionales
```bash
node --loader ts-node/esm src/lib/deployNodeRpc.ts test 1
```

4. Parar todos los nodos rpc de la red
```bash
node --loader ts-node/esm src/lib/stopNodes.ts test rpc
```

5. Parar todos los nodos miner de la red
```bash
node --loader ts-node/esm src/lib/stopNodes.ts test miner
```

6. Arrancar nodo individual miner
```bash
node --loader ts-node/esm src/lib/startNode.ts test test-miner
```

7. Arrancar nodo individual rpc
```bash
node --loader ts-node/esm src/lib/startNode.ts test test-rpc9000
```

8. Eliminar un nodo rpc específico
```bash
node --loader ts-node/esm src/lib/deleteNodeRpc.ts test test-rpc9000
```

9. Eliminar todos los nodos rpc de la red
```bash
node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts test
```

10. Parar la red completa
```bash
node --loader ts-node/esm src/lib/stopNetwork.ts test
```

11. Arrancar la red completa
```bash
node --loader ts-node/esm src/lib/startNetwork.ts test
```

12. Limpiar la red (final)
```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts test
```

---
## Tests automáticos

Puedes probar cada funcionalidad de la librería con los siguientes tests:

```bash
node --loader ts-node/esm src/lib/test/testBesuLib.ts 
```

Puedes ejecutar cada test por separado según la funcionalidad que quieras validar.

## Estructura relevante
- `index.ts`: Punto de entrada para importar la librería
- `deployNetwork.ts`: Despliega una red Besu
- `cleanNetwork.ts`: Limpia una red Besu
- `deployNodeRpc.ts`: Añade nodos rpc a una red existente
- `deleteNodeRpc.ts`: Elimina un nodo rpc individual
- `deleteAllRpcNodes.ts`: Elimina todos los nodos rpc de una red
- `startNode.ts`: Arranca un nodo específico
- `stopNodes.ts`: Para nodos específicos o por tipo
- `startBootnode.ts`: Arranca el bootnode de una red
- `startNetwork.ts`: Arranca todos los nodos de una red
- `stopNetwork.ts`: Para todos los nodos de una red
- `operations.ts`: Utilidades avanzadas y CLI (gestión, claves, balances, transferencias)
- `utils.ts`: Utilidades para componentes y estilos
- `networks/`: Configuración y datos de redes desplegadas
- `test/`: Tests automáticos
- `scripts/`: Scripts bash alternativos

## Notas
- Asegúrate de tener Docker corriendo antes de usar la librería.
- Los nombres de red (`r1`, `r2`, etc.) deben coincidir con los usados en tu configuración.
- Puedes personalizar los scripts según tus necesidades.

## Ejemplo de uso programático

```typescript
import { deployNetwork, cleanNetwork } from './src/lib';
import { getNetworks, getEthBalance } from './src/lib/operations';

// Desplegar una red
await deployNetwork('test', 2025);

// Consultar redes activas
const redes = await getNetworks();
console.log(redes);

// Consultar balance de una cuenta
const balance = await getEthBalance('http://localhost:9000', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
console.log(balance);
```

---

¿Dudas o problemas? Abre un issue o contacta con el autor.
