import { deployNetwork } from './deployNetwork.js';

async function main() {
    try {
        const args = process.argv.slice(2);
        const networkName = args[0] || 'red1';
        const chainId = Number(args[1]) || 2025;

        await deployNetwork(networkName, chainId);
    } catch (err) {
        console.error('❌ Error al desplegar la red:', err);
        process.exit(1);
    }
}

main();
