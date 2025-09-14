
import process from 'process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uso: node --loader ts-node/esm src/lib/deleteNodeRpc.ts <networkName> <nombreContenedor>

async function main() {
    const [, , networkName, nombreContenedor] = process.argv;
    if (!networkName || !nombreContenedor) {
        console.error('Uso: node --loader ts-node/esm src/lib/deleteNodeRpc.ts <networkName> <nombreContenedor>');
        process.exit(1);
    }
    if (!/rpc\d+$/.test(nombreContenedor)) {
        console.error('[ERROR] Solo se pueden eliminar nodos rpc individuales (nombre debe contener "rpc<puerto>").');
        process.exit(1);
    }
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        // Validar que el contenedor existe y pertenece a la red
        const { stdout } = await execAsync(`docker inspect --format='{{json .NetworkSettings.Networks}}' ${nombreContenedor}`);
        const networks = JSON.parse(stdout || '{}');
        if (!networks || !Object.keys(networks).includes(networkName)) {
            console.error(`[ERROR] El contenedor '${nombreContenedor}' no pertenece a la red Docker '${networkName}'.`);
            process.exit(1);
        }
        // Parar y eliminar el contenedor
        console.log(`[INFO] Parando y eliminando contenedor '${nombreContenedor}'...`);
        await execAsync(`docker rm -f ${nombreContenedor}`);
        // Eliminar directorio y config asociados
        const path = (await import('path')).default;
        const fs = await import('fs/promises');
        const baseDir = path.resolve(__dirname, 'networks', networkName);
        // Buscar el puerto en el nombre
        const match = nombreContenedor.match(/rpc(\d+)$/);
        if (match) {
            const port = match[1];
            const dir = `${baseDir}/rpc${port}`;
            const conf = `${baseDir}/rpc${port}_config.toml`;
            try { await fs.rm(dir, { recursive: true, force: true }); } catch { }
            try { await fs.rm(conf, { force: true }); } catch { }
        }
        console.log(`[OK] Nodo RPC '${nombreContenedor}' eliminado completamente.`);
    } catch (e) {
        console.error(`[ERROR] No se pudo eliminar el nodo RPC '${nombreContenedor}':`, e);
        process.exit(1);
    }
}

main();
