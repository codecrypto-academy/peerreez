
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
   -H "Content-Type: application/json" \
   http://localhost:<puerto_rpc>
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
docker network rm <network-name>
```

### Limpiar solo una red
```bash
./clean.sh <network-name>
```

---

## 🐛 Solución de Problemas

- **No puedes conectar a un nodo:**
   - Asegúrate de usar el puerto correcto mostrado en el resumen del despliegue.
- **El script falla al crear la red Docker:**
   - Puede haber conflicto de subred. El script busca automáticamente otra subred.
- **Las transferencias fallan:**
   - Espera a que los nodos estén sincronizados y usa el endpoint RPC correcto.

---

**Desarrollado por David Perez Sanchez con ayuda de GitHub Copilot.**
