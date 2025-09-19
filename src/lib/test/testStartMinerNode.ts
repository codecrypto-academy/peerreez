import { promisify } from 'util';

async function main() {
    const networkName = process.argv[2] || 'r1';
    const nombreContenedorMiner = process.argv[3] || `${networkName}-miner`;
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Arrancando nodo individual miner: ${nombreContenedorMiner} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/startNode.ts ${networkName} ${nombreContenedorMiner}`);
        console.log(`Nodo miner ${nombreContenedorMiner} arrancado correctamente.`);
    } catch (e) {
        console.error('Error al arrancar nodo miner:', e);
    }
}

main();
