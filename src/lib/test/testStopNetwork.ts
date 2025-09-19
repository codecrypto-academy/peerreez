import { promisify } from 'util';

async function main() {
    const networkName = process.argv[2] || 'r1';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Parando la red completa: ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/stopNetwork.ts ${networkName}`);
        console.log('Red parada correctamente.');
    } catch (e) {
        console.error('Error al parar la red:', e);
    }
}

main();
