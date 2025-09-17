
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const chainId = 2025;
    const n = 3;
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Desplegando red Besu ---');
        await execAsync(`node --loader ts-node/esm src/lib/deployNetwork.ts ${networkName} ${chainId}`);
        console.log('--- Red desplegada correctamente ---');
        console.log(`--- Agregando ${n} nodos RPC a la red ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/deployNodeRpc.ts ${networkName} ${n}`);
        console.log(`${n} nodos RPC agregados a la red ${networkName}`);
        const nombreContenedor = `${networkName}-rpc9000`;
        console.log(`--- Eliminando nodo RPC individual: ${nombreContenedor} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/deleteNodeRpc.ts ${networkName} ${nombreContenedor}`);
        console.log(`Nodo RPC ${nombreContenedor} eliminado.`);
        console.log('--- Eliminando todos los nodos RPC de la red ---');
        await execAsync(`node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts ${networkName}`);
        console.log('Todos los nodos RPC eliminados.');
        console.log('--- Limpiando la red ---');
        await execAsync(`node --loader ts-node/esm src/lib/cleanNetwork.ts ${networkName}`);
        console.log('Red limpiada.');
    } catch (e) {
        console.error('Error en el test:', e);
    }
}

main();
