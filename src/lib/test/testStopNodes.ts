import { promisify } from 'util';

async function main() {
    const networkName = process.argv[2] || 'r1';
    const nodeType = process.argv[3] || 'rpc';
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Parando nodos tipo ${nodeType} en la red ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/stopNodes.ts ${networkName} ${nodeType}`);
        console.log(`Nodos tipo ${nodeType} parados.`);
    } catch (e) {
        console.error('Error al parar nodos:', e);
    }
}

main();
