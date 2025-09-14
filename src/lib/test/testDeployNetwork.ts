import { fileURLToPath } from 'url';
import path from 'path';
import { deployNetwork } from '../deployNetwork.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// No se usa baseDir aquí, pero si se usa en el futuro, debe ser:
// const baseDir = path.resolve(__dirname, '../networks', networkName);

async function main() {
    const networkName = 'r1';
    const chainId = 2025;
    try {
        console.log('--- Desplegando red Besu ---');
        await deployNetwork(networkName, chainId);
        console.log('--- Red desplegada correctamente ---');
    } catch (e) {
        console.error('Error en despliegue:', e);
    }
}

main();
