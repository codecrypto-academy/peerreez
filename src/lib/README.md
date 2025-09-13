## 🚀 Besu Control Panel - Librería de despliegue de red Besu

Este proyecto contiene una librería TypeScript para desplegar y gestionar redes privadas Hyperledger Besu usando Docker, con lógica inspirada en el script `deploy.sh`.

### 📦 Instalación de dependencias

```bash
npm install
```

### ⚙️ Compilación

```bash
npm run tsc
```

### 🚀 Despliegue de la red Besu

```bash
npm run deploy-besu
```
Esto compila y ejecuta el flujo completo de despliegue (creación de red, claves, configuración, contenedores y transferencia de fondos a cuentas del mnemonic).

### 🧹 Limpieza de red y datos

```bash
npm run clean-besu
```
Borra contenedores, red Docker y datos de la red.

### 💰 Consultar balance de una cuenta

```bash
npm run check-balance -- <DIRECCION>
```
Ejemplo:
```bash
npm run check-balance -- 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### 📚 Estructura principal

- `src/lib/besuDeployer.ts`: Clase principal para orquestar el despliegue.
- `src/lib/deployNetwork.ts`: Script de ejemplo para lanzar la red.
- `src/scripts/operations.mjs`: Utilidades de claves y transferencias.
- `src/scripts/deploy.sh`: Script Bash original de referencia.

### 📝 Notas
- El flujo TypeScript replica el Bash, pero es parametrizable y extensible.
- Los logs muestran en tiempo real el estado de cada paso y las transferencias.
- Las primeras 10 cuentas del mnemonic reciben 1 ETH automáticamente.

---
Desarrollado por David Perez Sanchez ✨