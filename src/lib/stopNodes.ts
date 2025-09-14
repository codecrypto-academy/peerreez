import process from 'process';
import { promisify } from 'util';

// Uso: node --loader ts-node/esm src/lib/stopNodes.ts <networkName> <rpc|miner|all|nombreContenedor>

async function main() {
    const [, , networkName, tipoOContenedor] = process.argv;
    if (!networkName || !tipoOContenedor) {
        console.error('Uso: node --loader ts-node/esm src/lib/stopNodes.ts <networkName> <rpc|miner|all|nombreContenedor>');
        process.exit(1);
    }

    // Si es un tipo conocido
    if (["rpc", "miner", "all"].includes(tipoOContenedor)) {
        let filter = '';
        if (tipoOContenedor === 'rpc') filter = '--filter "label=nodo=rpc"';
        else if (tipoOContenedor === 'miner') filter = '--filter "label=nodo=miner"';
        else filter = '--filter "label=nodo=rpc" --filter "label=nodo=miner"';
        try {
            console.log(`[INFO] Buscando contenedores tipo '${tipoOContenedor}' en la red '${networkName}'...`);
            const { exec } = await import('child_process');
            const execAsync = promisify(exec);
            const result = await execAsync(`docker ps -q --filter "label=network=${networkName}" ${filter}`);
            let ids: string[] = [];
            if (result && typeof result.stdout === 'string') {
                ids = (result.stdout as string).trim().split('\n').filter(Boolean);
            }
            if (ids.length === 0) {
                console.log(`[INFO] No se encontraron contenedores tipo '${tipoOContenedor}' en la red '${networkName}'.`);
                return;
            }
            console.log(`[INFO] Parando contenedores: ${ids.join(', ')}`);
            await execAsync(`docker stop ${ids.join(' ')}`);
            console.log(`[OK] Contenedores tipo '${tipoOContenedor}' parados en la red '${networkName}'.`);
        } catch (e) {
            console.error('[ERROR] No se pudieron parar los nodos:', e);
            process.exit(1);
        }
        return;
    }

    // Si no es tipo, se asume nombre de contenedor
    const nombreContenedor = tipoOContenedor;
    if (nombreContenedor.endsWith('-bootnode')) {
        console.error(`[ERROR] El contenedor bootnode ('${nombreContenedor}') no puede ser parado por este script.`);
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
        console.log(`[INFO] Parando contenedor específico: ${nombreContenedor}`);
        await execAsync(`docker stop ${nombreContenedor}`);
        console.log(`[OK] Contenedor '${nombreContenedor}' parado.`);
    } catch (e) {
        console.error(`[ERROR] No se pudo parar el contenedor '${nombreContenedor}':`, e);
        process.exit(1);
    }
}

main();
