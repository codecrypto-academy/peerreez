import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { deployNetwork } from '../deployNetwork.js';
import { agregarNodosRpc, obtenerSubnet, obtenerBootEnode } from '../deployNetwork.js';
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const chainId = 2025;
    const n = 3; // Número de nodos RPC a agregar
    const imagenBesu = 'hyperledger/besu:latest';
    const baseDir = path.resolve(__dirname, 'networks', networkName);


    try {
        console.log('--- Desplegando red Besu ---');
        await deployNetwork(networkName, chainId);
        console.log('--- Red desplegada correctamente ---');
    } catch (e) {
        console.error('Error en despliegue:', e);
        return;
    }

    try {
        console.log(`--- Agregando ${n} nodos RPC a la red ${networkName} ---`);
        const redSubnet = await obtenerSubnet(networkName);
        const bootEnode = await obtenerBootEnode(networkName);
        await agregarNodosRpc({
            networkName,
            n,
            baseDir,
            redSubnet,
            bootEnode,
            imagenBesu
        });
        console.log(`${n} nodos RPC agregados a la red ${networkName}`);
    } catch (e) {
        console.error('Error al agregar nodos RPC:', e);
    }

    // Probar eliminar un nodo rpc específico
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        const nombreContenedor = `${networkName}-rpc9000`;
        console.log(`--- Eliminando nodo RPC individual: ${nombreContenedor} ---`);
        await execAsync(`node --loader ts-node/esm ../deleteNodeRpc.ts ${networkName} ${nombreContenedor}`);
        console.log(`Nodo RPC ${nombreContenedor} eliminado.`);
    } catch (e) {
        console.error('Error al eliminar nodo RPC individual:', e);
    }

    // Probar eliminar todos los nodos rpc
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Eliminando todos los nodos RPC de la red ---');
        await execAsync(`node --loader ts-node/esm ../deleteAllRpcNodes.ts ${networkName}`);
        console.log('Todos los nodos RPC eliminados.');
    } catch (e) {
        console.error('Error al eliminar todos los nodos RPC:', e);
    }

    // Limpiar la red
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Limpiando la red ---');
        await execAsync(`node --loader ts-node/esm ../cleanNetwork.ts ${networkName}`);
        console.log('Red limpiada.');
    } catch (e) {
        console.error('Error al limpiar la red:', e);
    }
}

main();
