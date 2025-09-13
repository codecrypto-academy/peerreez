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

## Uso básico

### Desplegar una red

Puedes desplegar una red usando el script de test o directamente:

```bash
node --loader ts-node/esm src/lib/deployNetwork.ts <networkName> <chainId>
```
Ejemplo:
```bash
node --loader ts-node/esm src/lib/deployNetwork.ts r1 2025
```

### Limpiar una red

Elimina contenedores, red Docker y archivos asociados:

```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts <networkName>
```
Ejemplo:
```bash
node --loader ts-node/esm src/lib/cleanNetwork.ts r1
```

### Probar despliegue y limpieza (test)

Ejecuta el script de test para desplegar varias redes:

```bash
node --loader ts-node/esm src/lib/testBesuLib.ts
```

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
- `src/lib/testBesuLib.ts`: Ejemplo de uso y test
- `src/scripts/`: Scripts bash alternativos

## Notas
- Asegúrate de tener Docker corriendo antes de usar la librería.
- Los nombres de red (`r1`, `r2`, etc.) deben coincidir con los usados en tu configuración.
- Puedes personalizar los scripts según tus necesidades.

---

¿Dudas o problemas? Abre un issue o contacta con el autor.
