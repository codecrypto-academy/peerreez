import process from 'process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uso: node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts <networkName>

async function main() {
    const [, , networkName] = process.argv;
    if (!networkName) {
        console.error('Uso: node --loader ts-node/esm src/lib/deleteAllRpcNodes.ts <networkName>');
        process.exit(1);
    }
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        // Buscar todos los contenedores rpc de la red
        const { stdout } = await execAsync(`docker ps -a --filter "label=network=${networkName}" --filter "label=nodo=rpc" --format "{{.Names}}"`);
        const nombres = stdout.trim().split('\n').filter(Boolean);
        if (nombres.length === 0) {
            console.log(`[INFO] No hay nodos rpc para eliminar en la red '${networkName}'.`);
            return;
        }
        for (const nombreContenedor of nombres) {
            console.log(`[INFO] Eliminando nodo RPC '${nombreContenedor}'...`);
            // Parar y eliminar el contenedor
            await execAsync(`docker rm -f ${nombreContenedor}`);
            // Eliminar directorio y config asociados
            const match = nombreContenedor.match(/rpc(\d+)$/);
            if (match) {
                const port = match[1];
                const baseDir = path.resolve(__dirname, 'networks', networkName);
                const dir = `${baseDir}/rpc${port}`;
                const conf = `${baseDir}/rpc${port}_config.toml`;
                try { await (await import('fs/promises')).rm(dir, { recursive: true, force: true }); } catch { }
                try { await (await import('fs/promises')).rm(conf, { force: true }); } catch { }
            }
            console.log(`[OK] Nodo RPC '${nombreContenedor}' eliminado.`);
        }
        console.log(`[OK] Todos los nodos rpc de la red '${networkName}' han sido eliminados.`);
    } catch (e) {
        console.error(`[ERROR] No se pudieron eliminar los nodos rpc:`, e);
        process.exit(1);
    }
}

main();
