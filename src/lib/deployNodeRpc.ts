import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { agregarNodosRpc, obtenerSubnet, obtenerBootEnode } from './deployNetwork.js';
import process from 'process';

// Uso: node --loader ts-node/esm src/lib/deployNodeRpc.ts <networkName> <n>

async function main() {
    const [, , networkName, nStr] = process.argv;
    if (!networkName || !nStr) {
        console.error('Uso: node --loader ts-node/esm src/lib/deployNodeRpc.ts <networkName> <n>');
        process.exit(1);
    }
    const n = parseInt(nStr, 10);
    if (isNaN(n) || n <= 0) {
        console.error('El número de nodos debe ser un entero positivo.');
        process.exit(1);
    }
    const baseDir = path.resolve(__dirname, 'networks', networkName);
    const imagenBesu = 'hyperledger/besu:latest';
    try {
        console.log(`[INFO] Obteniendo subred y enode de la red '${networkName}'...`);
        const redSubnet = await obtenerSubnet(networkName);
        console.log(`[INFO] Subred detectada: ${redSubnet}`);
        const bootEnode = await obtenerBootEnode(networkName);
        console.log(`[INFO] Lanzando ${n} nodos RPC en la red '${networkName}'...`);
        await agregarNodosRpc({
            networkName,
            n,
            baseDir,
            redSubnet,
            bootEnode,
            imagenBesu
        });
        console.log(`[OK] ${n} nodos RPC agregados a la red ${networkName}`);
        console.log(`[INFO] Puedes verificar los contenedores con: docker ps --filter "label=network=${networkName}"`);
    } catch (e) {
        console.error('[ERROR] Error al agregar nodos RPC:', e);
        process.exit(1);
    }
}

main();
