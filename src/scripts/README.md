
# 🚀 Besu Network Setup Script
Autor: David Perez Sanchez
Email: dperezsx@gmail.com
Fecha: 13 de Septiembre, 2025

Este script permite desplegar múltiples redes privadas de Ethereum Hyperledger Besu (consenso Clique) de forma parametrizada, con puertos y subredes automáticos y sin rutas hardcodeadas.

---

## 📋 Características Principales
- **Multi-red:** Puedes desplegar varias redes independientes pasando el nombre y chain id como argumentos.
- **Consenso:** Clique (Proof of Authority)
- **Subred Docker:** Asignación automática, sin conflictos.
- **Nodos:**
   - 1 Bootnode (no expone RPC)
   - 1 Miner (no expone RPC)
   - 2 Nodos RPC (puertos dinámicos, únicos por red)
- **Solo los nodos RPC exponen puertos para interacción externa.**

---

- **Scripts auxiliares:**
   - `clean.sh`: Limpia todos los recursos de una red específica (contenedores, red Docker y directorio de datos).
   - `operations.mjs`: CLI para consultar balances, transferir fondos, generar claves y obtener información de la red.

## ⚠️ Requisitos del Sistema
**Recomendación:** Linux o macOS para máxima compatibilidad.

### Dependencias
- Docker
- Node.js
- npm

#### Instalación de dependencias Node.js
```bash
npm install elliptic ethers buffer keccak256
```

---

## 🚀 Uso Rápido
```bash
cd src/scripts/
chmod +x deploy.sh
./deploy.sh <network-name> <chain-id>
```
Ejemplo:
```
Ejemplo:
```bash
./deploy.sh mi-red-1 12345
```

Para limpiar una red específica:
```bash
chmod +x clean.sh
./clean.sh mi-red-1
```
Consulta los endpoints y puertos generados al final del despliegue.
```bash
./deploy.sh mi-red-1 12345
```
Consulta los endpoints y puertos generados al final del despliegue.

---

## 📝 ¿Qué hace el script?
1. **Verifica dependencias** (docker, node)
2. **Limpia solo la red seleccionada** (no borra otras redes)
3. **Crea directorios por red y nodo**
4. **Asigna subred y puertos libres automáticamente**

---

## 📁 Estructura de la carpeta `networks/`

Cada red desplegada crea una subcarpeta en `networks/<network-name>/` con los datos, claves y configuración de cada nodo:

- `bootnode/`, `miner/`, `rpc<puerto>/`: Datos y claves de cada nodo.
- `genesis.json`, `config.toml`: Configuración de la red y nodos.
- `account/`: Claves de cuenta adicional.

Puedes eliminar toda la red y sus datos usando `clean.sh <network-name>`.
5. **Genera claves y archivos de configuración**
6. **Lanza contenedores Docker**
7. **Solo los nodos RPC exponen puertos a localhost**
8. **Transfiere fondos a cuentas derivadas del mnemonic de testing**

---

## 🔗 Endpoints de Conexión
Al finalizar el despliegue, el script muestra los endpoints de los nodos RPC. Ejemplo:

| Nodo      | Endpoint                        | Función                |
|-----------|----------------------------------|------------------------|
| RPC 1     | http://localhost:9000           | Interacción principal  |
| RPC 2     | http://localhost:9001           | Nodo RPC secundario    |

**Nota:** Los puertos son dinámicos y dependen del nombre de la red. Consulta el resumen final tras cada despliegue.

---

## 🧪 Testing y Verificación

### Verificar Número de Bloque
```bash
curl -X POST \
   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
   -H "Content-Type: application/json" \
   http://localhost:<puerto_rpc>
```

### Verificar Saldo de Cuenta
```bash
curl -X POST \
   --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["<address>", "latest"],"id":1}' \

### Usar el CLI `operations.mjs`
Comandos disponibles:
```bash
node operations.mjs create-keys <ip>                # Genera claves para nodo
node operations.mjs network-info [url]              # Info de la red
node operations.mjs balance <address> [url]         # Consulta balance
node operations.mjs transfer <fromPriv> <to> <amt> [url]   # Transfiere ETH
node operations.mjs fund-mnemonic <fromPriv> <mnemonic> <amt> [url] # Fondea cuentas
```
Ejemplo:
```bash
node operations.mjs balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 http://localhost:9000
```
### Usar el CLI para consultar balances
```bash
node operations.mjs balance <address> http://localhost:<puerto_rpc>
```

### Cuentas Pre-financiadas
El script transfiere 1 ETH a las primeras 10 cuentas derivadas del mnemonic:

| Índice | Dirección                                    | Derivation Path              |
|--------|----------------------------------------------|------------------------------|
| 0      | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266   | m/44'/60'/0'/0/0             |
| ...    | ...                                          | ...                          |
| 9      | ...                                          | m/44'/60'/0'/0/9             |

---

## 🔧 Configuración de Metamask

**Añadir Red Personalizada:**
- Nombre: Besu Local Network
- RPC URL: http://localhost:<puerto_rpc>
- Chain ID: <el que usaste en el despliegue>
- Símbolo: ETH

**Importar Cuenta con Mnemonic:**
```
test test test test test test test test test test test junk
```

---

## 🛠️ Gestión de la Red

### Ver Logs de los Nodos
```bash
# Logs del bootnode
docker logs <network-name>-bootnode

# Logs del miner
docker logs <network-name>-miner

# Logs de nodo RPC
docker logs <network-name>-rpc<puerto>
```

### Detener la Red
```bash
# Detener todos los contenedores de una red
docker rm -f $(docker ps -aq --filter "label=network=<network-name>")

# Eliminar la red Docker
```bash
./clean.sh <network-name>
```
Elimina todos los contenedores, la red Docker y el directorio de datos de la red indicada.
### Limpiar solo una red
```bash
./clean.sh <network-name>
```

---

## 🐛 Solución de Problemas

- **No puedes conectar a un nodo:**
   - Asegúrate de usar el puerto correcto mostrado en el resumen del despliegue.

- **No se limpia la red correctamente:**
   - Usa `./clean.sh <network-name>` para eliminar todos los recursos asociados a la red.

---

**Desarrollado por David Perez Sanchez con ayuda de GitHub Copilot.**
- **El script falla al crear la red Docker:**
   - Puede haber conflicto de subred. El script busca automáticamente otra subred.
- **Las transferencias fallan:**
   - Espera a que los nodos estén sincronizados y usa el endpoint RPC correcto.

---

**Desarrollado por David Perez Sanchez con ayuda de GitHub Copilot.**
