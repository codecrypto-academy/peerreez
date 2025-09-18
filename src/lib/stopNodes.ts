/**
 * Detiene el contenedor bootnode de una red específica.
 * @param networkName Nombre de la red
 * @returns Resultado de la operación
 */
export async function stopBootnode(networkName: string): Promise<{ ok: boolean; message: string }> {
    if (!networkName) {
        return { ok: false, message: 'Falta el nombre de la red.' };
    }
    try {
        const bootnodeName = `${networkName}-bootnode`;
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        // Verifica si el contenedor existe y está en la red
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${bootnodeName}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            return { ok: false, message: `El contenedor bootnode ('${bootnodeName}') no pertenece a la red Docker '${networkName}'.` };
        }
        await execAsync(`docker stop ${bootnodeName}`);
        return { ok: true, message: `Contenedor bootnode ('${bootnodeName}') parado.` };
    } catch (e: any) {
        return { ok: false, message: `[ERROR] No se pudo parar el bootnode: ${e?.message}` };
    }
}
// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName, tipoOContenedor] = process.argv;
    stopNodes(networkName, tipoOContenedor).then(result => {
        if (result.ok) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}

import { promisify } from 'util';

export async function stopNodes(networkName: string, tipoOContenedor: string): Promise<{ ok: boolean; message: string }> {
    if (!networkName || !tipoOContenedor) {
        return { ok: false, message: 'Faltan parámetros: networkName y tipoOContenedor son requeridos.' };
    }

    // Si es un tipo conocido
    if (["rpc", "miner", "all"].includes(tipoOContenedor)) {
        let filter = '';
        if (tipoOContenedor === 'rpc') filter = '--filter "label=nodo=rpc"';
        else if (tipoOContenedor === 'miner') filter = '--filter "label=nodo=miner"';
        else filter = '--filter "label=nodo=rpc" --filter "label=nodo=miner"';
        try {
            const { exec } = await import('child_process');
            const execAsync = promisify(exec);
            const result = await execAsync(`docker ps -q --filter "label=network=${networkName}" ${filter}`);
            let ids: string[] = [];
            if (result && typeof result.stdout === 'string') {
                ids = (result.stdout as string).trim().split('\n').filter(Boolean);
            }
            if (ids.length === 0) {
                return { ok: true, message: `No se encontraron contenedores tipo '${tipoOContenedor}' en la red '${networkName}'.` };
            }
            // Log para depuración
            console.log(`[stopNodes] Deteniendo contenedores:`, ids);
            const stopCmd = `docker stop ${ids.join(' ')}`;
            console.log(`[stopNodes] Ejecutando:`, stopCmd);
            await execAsync(stopCmd);
            return { ok: true, message: `Contenedores tipo '${tipoOContenedor}' parados en la red '${networkName}'.` };
        } catch (e: any) {
            return { ok: false, message: `[ERROR] No se pudieron parar los nodos: ${e?.message}` };
        }
    }

    // Si no es tipo, se asume nombre de contenedor
    const nombreContenedor = tipoOContenedor;
    if (nombreContenedor.endsWith('-bootnode')) {
        return { ok: false, message: `El contenedor bootnode ('${nombreContenedor}') no puede ser parado por este método.` };
    }
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${nombreContenedor}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            return { ok: false, message: `El contenedor '${nombreContenedor}' no pertenece a la red Docker '${networkName}'.` };
        }
        await execAsync(`docker stop ${nombreContenedor}`);
        return { ok: true, message: `Contenedor '${nombreContenedor}' parado.` };
    } catch (e: any) {
        return { ok: false, message: `[ERROR] No se pudo parar el contenedor '${nombreContenedor}': ${e?.message}` };
    }
}
