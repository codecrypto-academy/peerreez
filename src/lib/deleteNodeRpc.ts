

import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function deleteNodeRpc(networkName: string, nombreContenedor: string): Promise<{ ok: boolean; message: string }> {
    if (!networkName || !nombreContenedor) {
        return { ok: false, message: 'Faltan parámetros: networkName y nombreContenedor son requeridos.' };
    }
    if (!/rpc\d+$/.test(nombreContenedor)) {
        return { ok: false, message: 'Solo se pueden eliminar nodos rpc individuales (nombre debe contener "rpc<puerto>").' };
    }
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        // Validar que el contenedor existe y pertenece a la red
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${nombreContenedor}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            return { ok: false, message: `El contenedor '${nombreContenedor}' no pertenece a la red Docker '${networkName}'.` };
        }
        // Parar y eliminar el contenedor
        await execAsync(`docker rm -f ${nombreContenedor}`);
        // Eliminar directorio y config asociados
        const pathMod = (await import('path')).default;
        const fs = await import('fs/promises');
        const baseDir = pathMod.resolve(__dirname, 'networks', networkName);
        // Buscar el puerto en el nombre
        const match = nombreContenedor.match(/rpc(\d+)$/);
        if (match) {
            const port = match[1];
            const dir = `${baseDir}/rpc${port}`;
            const conf = `${baseDir}/rpc${port}_config.toml`;
            try { await fs.rm(dir, { recursive: true, force: true }); } catch { }
            try { await fs.rm(conf, { force: true }); } catch { }
        }
        return { ok: true, message: `Nodo RPC '${nombreContenedor}' eliminado completamente.` };
    } catch (e: any) {
        return { ok: false, message: `[ERROR] No se pudo eliminar el nodo RPC '${nombreContenedor}': ${e?.message}` };
    }
}

// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName, nombreContenedor] = process.argv;
    deleteNodeRpc(networkName, nombreContenedor).then(result => {
        if (result.ok) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}
