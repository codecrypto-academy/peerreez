# Link Video David
https://www.loom.com/share/b3dce6068843476aab500008ec90bf21

# Proyecto: Cadena de Suministros (Hyperledger Fabric + Next.js)

Este repositorio contiene una aplicación de ejemplo para una cadena de suministro construida sobre Hyperledger Fabric (red local, chaincode) y un frontend en Next.js. Además incluye utilidades para desplegar y gestionar la red de Fabric, scripts de ayuda y un puente (bridge) para exponer RPC/puertos a servicios externos.

## Análisis detallado del proyecto

- Stack principal:
  - Backend / red: Hyperledger Fabric (scripts en `supply-chain-network/`, artefactos de canal, chaincode en `chaincode/supply-chain/`).
  - Bridge: código en `src/bridge/` con `bridgeServer.ts` y `fabricRpcBridge.ts` para exponer API/RPC hacia/desde la red Fabric.
  - Frontend: aplicación Next.js en `src/app/` y componentes en `src/components/`.
  - Explorer/Monitor: utilidades y contenedores en `supply-chain-network/docker/explorer` y scripts de monitor.

- Estructura relevante (resumen):
  - `supply-chain-network/` — scripts de arranque/parada, herramientas y artefactos para la red Fabric.
  - `chaincode/supply-chain/` — código del chaincode (smart contract) que contiene la lógica de la cadena de suministro.
  - `src/bridge/` — puente / RPC para interaccionar con Fabric desde servicios externos.
  - `src/app/` — aplicación Next.js (frontend) con secciones para admin, productor, fábrica, consumidor y retailer.
  - `src/components/` — componentes React (autenticación, layout, formularios, etc.).

- Objetivos y responsabilidades de los componentes:
  - Scripts en `supply-chain-network/` — orquestan la creación de la red, CA, peers/orderers y la generación de artefactos.
  - `deploy.sh`, `start_network.sh`, `stop_network.sh` — scripts para desplegar y gestionar la red.
  - `bridgeServer.ts` — servidor Express/TS que escucha (por defecto) en el puerto 3001 y expone endpoints para la app o servicios externos.
  - `fabricRpcBridge.ts` — puente RPC para exponer ciertos métodos del ledger en otro puerto (p. ej. 7844).

## Requisitos previos

- Software necesario (instalar en la máquina donde se vaya a correr todo):
  - Node.js >= 16 (recomendado LTS actual), npm
  - Docker & docker-compose (para levantar la red y explorer)
  - Herramientas de Hyperledger Fabric utilizadas por el proyecto (binarios en `supply-chain-network/bin/` incluidos). Si no están en PATH, el repo ya trae binarios en la carpeta `bin/`.
  - Permisos de ejecución en los scripts `*.sh`.

## Manual de uso (ordenado)

Nota: He corregido y normalizado la numeración para presentar una secuencia lógica de pasos del 1 al 8 según lo indicado. Si prefieres mantener la numeración exacta original, indícalo.

1) Ejecutar limpieza previa directorio suppy-chain-network


	- Objetivo: garantizar que no haya restos de despliegues previos.
	- Comando:

	```bash
	./cleanup.sh
	```

2) Desplegar la red y artefactos directorio suppy-chain-network

	- Objetivo: crear la red Fabric, canales, peers, orderers y desplegar chaincode inicial.
	- Comando:

	```bash
	./deploy.sh
	```

3) Validar despliegue básico directorio suppy-chain-network

	- Objetivo: ejecutar chequeos y validaciones (scripts de validación incluidos en el repo).
	- Comando:

	```bash
	./validate.sh
	```

4) Testear el chaincode (si existe test npm)

	- Objetivo: ejecutar pruebas unitarias/integración relacionadas con el chaincode o el paquete npm del repo.
	- Comando (en la raíz del repo):

	```bash
	npm test --if-present
	```

5) Operativa del frontend (desarrollo)

	- Objetivo: arrancar la aplicación Next.js en modo desarrollo.
	- Comando:

	```bash
	npm install
	npm run dev
	```

6) Iniciar el monitor/explorer

	- Objetivo: arrancar el monitor/explorer que observa la red y muestra información (script dentro de `supply-chain-network/docker/explorer`/o `supply-chain-network/monitor.sh`).
	- Comando (desde la carpeta correspondiente; si el script está en la raíz del submódulo o `supply-chain-network` ajusta la ruta):

	```bash
	# Asegúrate de estar en la carpeta que contiene monitor.sh
	./supply-chain-network/explorer/monitor.sh
	```

7) Levantar el puente (bridge) — dos procesos

	- Objetivo: exponer el `bridgeServer` y el `fabricRpcBridge` para que la aplicación o servicios externos puedan comunicarse con Fabric.
	- Comandos (en la raíz del proyecto):

	```bash
	npm run bridge:start   # arranca src/bridge/bridgeServer.ts en :3001
	npm run rpc:start      # arranca src/bridge/fabricRpcBridge.ts en :7844
	```

	- Nota: revisa `package.json` para confirmar los scripts `bridge:start` y `rpc:start`; si no existen, puedes arrancarlos con `ts-node` o `node` apuntando a la compilación en `dist/` si previamente compilas con `npm run build`.

8) Parar y arrancar la red (reciclado)

	- Objetivo: procedimiento para reiniciar la red Fabric cuando sea necesario.
	- Comandos típicos (ajusta rutas si cambian):

	```bash
	# Parar
	./supply-chain-network/stop_network.sh

	# Arrancar
	./supply-chain-network/start_network.sh
	```

	- También puedes usar `deploy.sh` y `cleanup.sh` en combinación para un ciclo completo (limpieza -> deploy).

## Comprobaciones rápidas (smoke tests)

- Verificar que Docker tenga contenedores activos: `docker ps`.
- Revisar puertos abiertos: `ss -ltn | grep -E "(3000|3001|7844)"`.
- Logs de bridge: mirar `logs` en el directorio donde se ejecuta `bridgeServer`.

## Contrato (breve)

- Inputs principales: scripts shell y comandos npm; variables de entorno (p. ej. PATH para fabric binarios, URLs para explorer/bridge). 
- Outputs principales: red Fabric en ejecución, smart contracts desplegados, frontend en :3000 (Next.js), bridge en :3001 y RPC en :7844.

## Casos límite y recomendaciones

- Si faltan binarios de Fabric en PATH, usa los de `supply-chain-network/bin/` o añade su ruta a PATH.
- Si Docker falla, comprueba versión y permisos (usuario en grupo docker o usar sudo).
- Si `npm run bridge:start` falla por TypeScript, asegúrate de compilar (`npm run build`) o ejecutar con `ts-node`.

## Notas finales y próximos pasos sugeridos

- Añadir un script `make` o `npm` que orqueste los pasos más comunes (clean -> deploy -> validate) para facilitar la reproducción.
- Considerar añadir un README específico en `supply-chain-network/` y en `chaincode/supply-chain/` con instrucciones para desarrolladores de chaincode.



