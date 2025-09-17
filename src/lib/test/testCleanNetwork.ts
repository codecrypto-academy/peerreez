
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log('--- Limpiando la red ---');
        await execAsync(`node --loader ts-node/esm src/lib/cleanNetwork.ts ${networkName}`);
        console.log('Red limpiada.');
    } catch (e) {
        console.error('Error al limpiar la red:', e);
    }
}

main();
