import { deployNetwork } from './deployNetwork.js';
import { cleanNetwork } from './cleanNetwork.js';

async function main() {
    const networkName = 'testnet-demo';
    const chainId = 2025;

    try {
        console.log('--- Desplegando red Besu r1 ---');
        await deployNetwork('r1', 2025);
        console.log('--- Desplegando red Besu r2 ---');
        await deployNetwork('r2', 2026);
        console.log('--- Red desplegada correctamente ---');
    } catch (e) {
        console.error('Error en despliegue:', e);
    }

    // Descomenta para probar limpieza
    // try {
    //   console.log('--- Limpiando red Besu ---');
    //   await cleanNetwork(networkName);
    //   console.log('--- Red limpiada correctamente ---');
    // } catch (e) {
    //   console.error('Error en limpieza:', e);
    // }
}

main();
