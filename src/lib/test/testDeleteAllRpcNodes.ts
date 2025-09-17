
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Eliminando todos los nodos RPC de la red ---');
        await execAsync(`node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts ${networkName}`);
        console.log('Todos los nodos RPC eliminados.');
    } catch (e) {
        console.error('Error al eliminar todos los nodos RPC:', e);
    }
}

main();
