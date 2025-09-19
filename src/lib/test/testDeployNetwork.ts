

import { promisify } from 'util';

// Leer argumentos desde la línea de comandos
const networkName = process.argv[2] || 'r1';
const chainId = process.argv[3] || 2025;

async function main() {
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Desplegando red Besu ---');
        await execAsync(`node --loader ts-node/esm src/lib/deployNetwork.ts ${networkName} ${chainId}`);
        console.log('--- Red desplegada correctamente ---');
    } catch (e) {
        console.error('Error en despliegue:', e);
    }
}

main();
