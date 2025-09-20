
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const chainId = 2025;
    const n = 3;
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);

        // 1. Limpiar red (inicial)
        console.log('--- Ejecutando testCleanNetwork.ts ---');
        let result = await execAsync(`node --loader ts-node/esm src/lib/test/testCleanNetwork.ts ${networkName}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 2. Desplegar red Besu
        console.log('--- Ejecutando testDeployNetwork.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testDeployNetwork.ts ${networkName} ${chainId}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 3. Agregar nodos RPC
        console.log('--- Ejecutando testAddRpcNodes.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testAddRpcNodes.ts ${networkName} ${n}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 4. Detener nodos tipo rpc
        console.log('--- Ejecutando testStopNodes.ts (rpc) ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStopNodes.ts ${networkName} rpc`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 4.1. Arrancar todos los nodos RPC
        console.log('--- Ejecutando testStartNodes.ts (rpc) ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStartNodes.ts ${networkName} rpc`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 5. Detener nodos tipo miner
        console.log('--- Ejecutando testStopNodes.ts (miner) ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStopNodes.ts ${networkName} miner`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 5.1. Arrancar todos los nodos miner
        console.log('--- Ejecutando testStartNodes.ts (miner) ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStartNodes.ts ${networkName} miner`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 7. Arrancar nodo individual (miner)
        const nombreContenedorMiner = `${networkName}-miner`;
        console.log('--- Ejecutando testStartMinerNode.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStartMinerNode.ts ${networkName} ${nombreContenedorMiner}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 9. Arrancar nodo individual (rpc)
        const nombreContenedorRpc = `${networkName}-rpc9000`;
        console.log('--- Ejecutando testStartNode.ts (rpc) ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStartNode.ts ${networkName} ${nombreContenedorRpc}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 10. Eliminar nodo RPC individual
        console.log('--- Ejecutando testDeleteNodeRpc.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testDeleteNodeRpc.ts ${networkName} ${nombreContenedorRpc}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 11. Eliminar todos los nodos RPC
        console.log('--- Ejecutando testDeleteAllRpcNodes.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testDeleteAllRpcNodes.ts ${networkName}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 12. Detener la red completa
        console.log('--- Ejecutando testStopNetwork.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStopNetwork.ts ${networkName}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 13. Arrancar la red completa (penúltimo paso)
        console.log('--- Ejecutando testStartNetwork.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testStartNetwork.ts ${networkName}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);

        // 14. Limpiar la red (final)
        console.log('--- Ejecutando testCleanNetworkFinal.ts ---');
        result = await execAsync(`node --loader ts-node/esm src/lib/test/testCleanNetworkFinal.ts ${networkName}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
    } catch (e) {
        console.error('Error en el test:', e);
    }
}

main();
