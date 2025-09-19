import { promisify } from 'util';

async function main() {
    const networkName = process.argv[2] || 'r1';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Arrancando la red completa: ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/startNetwork.ts ${networkName}`);
        console.log('Red arrancada correctamente.');
    } catch (e) {
        console.error('Error al arrancar la red:', e);
    }
}

main();
