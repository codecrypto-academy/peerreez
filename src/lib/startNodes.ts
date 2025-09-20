import { promisify } from 'util';

export async function startNodes(networkName: string, tipoOContenedor: string): Promise<{ ok: boolean; message: string }> {
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

            // Buscar contenedores parados del tipo especificado en la red
            const result = await execAsync(`docker ps -aq --filter "status=exited" --filter "label=network=${networkName}" ${filter}`);
            let ids: string[] = [];
            if (result && typeof result.stdout === 'string') {
                ids = (result.stdout as string).trim().split('\n').filter(Boolean);
            }

            if (ids.length === 0) {
                return { ok: true, message: `No se encontraron contenedores tipo '${tipoOContenedor}' detenidos en la red '${networkName}'.` };
            }

            // Log para depuración
            console.log(`[startNodes] Arrancando contenedores:`, ids);
            const startCmd = `docker start ${ids.join(' ')}`;
            console.log(`[startNodes] Ejecutando:`, startCmd);
            await execAsync(startCmd);

            return { ok: true, message: `Contenedores tipo '${tipoOContenedor}' arrancados en la red '${networkName}'.` };
        } catch (e: any) {
            return { ok: false, message: `[ERROR] No se pudieron arrancar los nodos: ${e?.message}` };
        }
    }

    // Si no es tipo, se asume nombre de contenedor
    const nombreContenedor = tipoOContenedor;
    if (nombreContenedor.endsWith('-bootnode')) {
        return { ok: false, message: `El contenedor bootnode ('${nombreContenedor}') no puede ser arrancado por este método. Use /api/startBootnode.` };
    }

    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${nombreContenedor}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            return { ok: false, message: `El contenedor '${nombreContenedor}' no pertenece a la red Docker '${networkName}'.` };
        }
        await execAsync(`docker start ${nombreContenedor}`);
        return { ok: true, message: `Contenedor '${nombreContenedor}' arrancado.` };
    } catch (e: any) {
        return { ok: false, message: `[ERROR] No se pudo arrancar el contenedor '${nombreContenedor}': ${e?.message}` };
    }
}

// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName, tipoOContenedor] = process.argv;
    startNodes(networkName, tipoOContenedor).then(result => {
        if (result.ok) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}
