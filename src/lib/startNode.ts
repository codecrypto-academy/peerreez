
import { promisify } from 'util';

export async function startNode(networkName: string, nombreContenedor: string): Promise<{ ok: boolean; message: string }> {
    if (!networkName || !nombreContenedor) {
        return { ok: false, message: 'Faltan parámetros: networkName y nombreContenedor son requeridos.' };
    }
    if (nombreContenedor.endsWith('-bootnode')) {
        return { ok: false, message: `El contenedor bootnode ('${nombreContenedor}') no debe ser arrancado manualmente con este método.` };
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
        const err = e;
        const errorMsg = err?.stderr || err?.message || String(e);
        return { ok: false, message: `[ERROR] No se pudo arrancar el contenedor '${nombreContenedor}': ${errorMsg}` };
    }
}

// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName, nombreContenedor] = process.argv;
    startNode(networkName, nombreContenedor).then(result => {
        if (result.ok) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}
