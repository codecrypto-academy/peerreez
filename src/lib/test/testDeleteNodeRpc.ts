import { promisify } from 'util';

async function main() {
    const networkName = 'r1';
    const nombreContenedor = 'r1-rpc9000'; // No requiere baseDir, pero si se usa, debe ser ../networks
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Eliminando nodo RPC individual: ${nombreContenedor} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/deleteNodeRpc.ts ${networkName} ${nombreContenedor}`);
        console.log(`Nodo RPC ${nombreContenedor} eliminado.`);
    } catch (e) {
        console.error('Error al eliminar nodo RPC individual:', e);
    }
}

main();
