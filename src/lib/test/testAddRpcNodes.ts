import { fileURLToPath } from 'url';
import path from 'path';
import { agregarNodosRpc, obtenerSubnet, obtenerBootEnode } from '../deployNetwork.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const networkName = 'r1';
    const n = 2;
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        console.log(`--- Agregando ${n} nodos RPC a la red ${networkName} (CLI) ---`);
        await execAsync(`node --loader ts-node/esm src/lib/deployNodeRpc.ts ${networkName} ${n}`);
        console.log(`${n} nodos RPC agregados a la red ${networkName}`);
    } catch (e) {
        console.error('Error al agregar nodos RPC:', e);
    }
}

main();
