
# web25-control-panel-besu-2025

Panel de control para la gestión de redes Besu, desarrollado con Next.js.

## Índice

- [Introducción](#introducción)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Estructura del proyecto](#estructura-del-proyecto)
- [API](#api)
- [Librería (`lib/`)](#librería-lib)
- [Scripts (`scripts/`)](#scripts-scripts)
- [Testing](#testing)
- [Recursos útiles](#recursos-útiles)

---

## Introducción

Este proyecto permite gestionar redes Besu de forma sencilla a través de una interfaz web. Incluye endpoints API, una librería de utilidades y scripts para automatizar tareas.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del proyecto

- `src/app/api/`: Endpoints API para operaciones sobre la red Besu.
- `src/lib/`: Funciones y utilidades para interactuar con Besu.
- `src/scripts/`: Scripts bash para automatizar tareas.
- `src/components/`: Componentes React del panel.
- `public/`: Recursos estáticos.

## API

Los endpoints se encuentran en `src/app/api/`. Ejemplos de rutas disponibles:

- `/api/cleanNetwork`: Limpia la red.
- `/api/deleteAllRpcNodes`: Elimina todos los nodos RPC.
- `/api/deleteNodeRpc`: Elimina un nodo RPC específico.
- `/api/deploy`: Despliega una red.
- `/api/deployNodeRpc`: Despliega un nodo RPC.
- `/api/networks`: Listado y gestión de redes.
- `/api/startBootnode`: Inicia el bootnode.
- `/api/startNetwork`: Inicia la red.
- `/api/startNode`: Inicia un nodo.
- `/api/stopNetwork`: Detiene la red.
- `/api/stopNode`: Detiene un nodo.

## Librería (`lib/`)

La carpeta `src/lib/` contiene funciones reutilizables para la gestión de redes Besu:

- `cleanNetwork.ts`: Limpieza de la red.
- `deployNetwork.ts`: Despliegue de redes.
- `startNetwork.ts`, `stopNetwork.ts`: Inicio y parada de redes.
- `startNode.ts`, `stopNodes.ts`: Gestión de nodos.
- `utils.ts`: Utilidades generales.
- `networks/`: Configuración y utilidades específicas de redes.

## Scripts (`scripts/`)

Scripts bash para automatizar tareas:

- `clean.sh`: Limpia la red o nodos específicos.
- `deploy.sh`: Despliega la red.
- `operations.mjs`: Operaciones automatizadas.
- Carpeta `networks/`: Configuraciones de red.

Ejemplo de uso:

```bash
cd src/scripts
./clean.sh n1
./deploy.sh
```

## Testing

Tests disponibles en `src/lib/test/` para las funciones principales de la librería.

## Recursos útiles

- [Documentación Next.js](https://nextjs.org/docs)
- [Documentación Besu](https://besu.hyperledger.org/)
- [Vercel para despliegue](https://vercel.com/)

---
