
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const chainId = 2025;
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
