
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const n = 2;
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Agregando ${n} nodos RPC a la red ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/deployNodeRpc.ts ${networkName} ${n}`);
        console.log(`${n} nodos RPC agregados a la red ${networkName}`);
    } catch (e) {
        console.error('Error al agregar nodos RPC:', e);
    }
}

main();
