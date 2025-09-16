
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function deleteAllRpcNodes(networkName: string): Promise<{ ok: boolean; message: string }> {
    if (!networkName) {
        return { ok: false, message: 'Falta el parámetro networkName.' };
    }
    try {
        const { exec } = await import('child_process');
        const execAsync = promisify(exec);
        // Buscar todos los contenedores rpc de la red
        const { stdout } = await execAsync(`docker ps -a --filter "label=network=${networkName}" --filter "label=nodo=rpc" --format "{{.Names}}"`);
        const nombres = stdout.trim().split('\n').filter(Boolean);
        if (nombres.length === 0) {
            return { ok: true, message: `[INFO] No hay nodos rpc para eliminar en la red '${networkName}'.` };
        }
        for (const nombreContenedor of nombres) {
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
        }
        return { ok: true, message: `[OK] Todos los nodos rpc de la red '${networkName}' han sido eliminados.` };
    } catch (e: any) {
        return { ok: false, message: `[ERROR] No se pudieron eliminar los nodos rpc: ${e?.message}` };
    }
}

// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName] = process.argv;
    deleteAllRpcNodes(networkName).then(result => {
        if (result.ok) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}
