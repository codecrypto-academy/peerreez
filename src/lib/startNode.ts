import process from 'process';
import { promisify } from 'util';

// Uso: node --loader ts-node/esm src/lib/startNode.ts <networkName> <nombreContenedor>

async function main() {
    const [, , networkName, nombreContenedor] = process.argv;
    if (!networkName || !nombreContenedor) {
        console.error('Uso: node --loader ts-node/esm src/lib/startNode.ts <networkName> <nombreContenedor>');
        process.exit(1);
    }
    if (nombreContenedor.endsWith('-bootnode')) {
        console.error(`[ERROR] El contenedor bootnode ('${nombreContenedor}') no debe ser arrancado manualmente con este script.`);
        process.exit(1);
    }
    try {
        // Validar que el contenedor pertenece a la red Docker realmente
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${nombreContenedor}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            console.error(`[ERROR] El contenedor '${nombreContenedor}' no pertenece a la red Docker '${networkName}'.`);
            process.exit(1);
        }
        console.log(`[INFO] Arrancando contenedor '${nombreContenedor}'...`);
        await execAsync(`docker start ${nombreContenedor}`);
        console.log(`[OK] Contenedor '${nombreContenedor}' arrancado.`);
    } catch (e) {
        const err = e as any;
        if (err && (err.stderr || err.message)) {
            console.error(`[ERROR] No se pudo arrancar el contenedor '${nombreContenedor}':`, err.stderr || err.message);
        } else {
            console.error(`[ERROR] No se pudo arrancar el contenedor '${nombreContenedor}':`, e);
        }
        process.exit(1);
    }
}

main();
