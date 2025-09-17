
import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const nombreContenedor = 'r1-rpc9125';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Parando nodo: ${nombreContenedor} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/stopNodes.ts ${networkName} ${nombreContenedor}`);
        console.log(`Nodo ${nombreContenedor} parado.`);
    } catch (e) {
        console.error('Error al parar el nodo:', e);
    }
}

main();
