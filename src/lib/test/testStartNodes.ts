import { promisify } from 'util';

async function main() {
    const networkName = process.argv[2] || 'r1';
    const tipoOContenedor = process.argv[3] || 'rpc';

    if (!networkName || !tipoOContenedor) {
        console.error('Uso: node --loader ts-node/esm src/lib/test/testStartNodes.ts <networkName> <tipoOContenedor>');
        console.error('Ejemplo: node --loader ts-node/esm src/lib/test/testStartNodes.ts r1 rpc');
        console.error('Tipos válidos: rpc, miner, all, o nombre específico de contenedor');
        process.exit(1);
    }

    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        console.log(`--- Arrancando nodos tipo ${tipoOContenedor} en la red ${networkName} ---`);
        await execAsync(`node --loader ts-node/esm src/lib/startNodes.ts ${networkName} ${tipoOContenedor}`);
        console.log(`Nodos tipo ${tipoOContenedor} arrancados.`);
    } catch (e) {
        console.error('Error al arrancar nodos:', e);
    }
}

main();
