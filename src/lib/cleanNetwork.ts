import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const exec = promisify(execCb);

export async function cleanNetwork(networkName: string) {
    console.log(`🔎 Iniciando limpieza para la red: ${networkName}`);

    // 1) Buscar y eliminar contenedores relacionados
    try {
        const { stdout: containers } = await exec(
            `docker ps -a -q --filter "name=${networkName}-"`
        );

        if (containers.trim()) {
            const containerIds = containers.trim().split('\n');
            console.log(
                `Contenedores detectados para eliminación: [ '${containerIds.join("', '")}' ]`
            );
            console.log(
                `Ejecutando: docker rm -f ${containerIds.join(' ')}`
            );
            await exec(`docker rm -f ${containerIds.join(' ')}`);
            console.log(
                `  ✔️ Contenedores eliminados: ${containerIds.join(', ')}`
            );
        } else {
            console.log('  ℹ️ No se encontraron contenedores para eliminar.');
        }
    } catch (err) {
        console.error('  ⚠️ Error al eliminar contenedores:', err);
    }

    // 2) Eliminar la red de Docker si existe
    try {
        const { stdout: networks } = await exec('docker network ls --format "{{.Name}}"');
        const networkList = networks.trim().split('\n');
        if (networkList.includes(networkName)) {
            console.log(`🧩 Red encontrada: ${networkName} — procediendo a eliminarla...`);
            await exec(`docker network rm ${networkName}`);
            console.log(`  ✔️ Red Docker eliminada: ${networkName}`);
        } else {
            console.log('  ℹ️ No se encontró una red Docker con ese nombre.');
        }
    } catch (err) {
        console.error('  ⚠️ Error al eliminar la red:', err);
    }

    // 3) Eliminar directorios de la red (src/lib/networks)
    const possibleDirs = [
        path.resolve(__dirname, 'networks', networkName), // corregido
    ];

    const dirsEliminados: string[] = [];

    for (const dir of possibleDirs) {
        try {
            console.log('🔎 Intentando eliminar directorio:', dir);
            await rm(dir, { recursive: true, force: true });
            dirsEliminados.push(dir);
            console.log(`🗑️ Directorio eliminado: ${dir}`);
        } catch (err) {
            console.error('  ⚠️ Error al eliminar directorio:', dir, err);
        }
    }

    // 4) Resumen final
    console.log('\n===============================');
    console.log('🧹 RESUMEN DE LIMPIEZA DE RED');
    console.log('===============================');
    console.log(`Nombre de la red: ${networkName}`);
    console.log(`Red Docker eliminada: ${networkName}`);
    console.log(
        `Directorios eliminados: ${dirsEliminados.length ? dirsEliminados.join(', ') : 'Ninguno'}`
    );
    console.log('✔️ Limpieza finalizada (al menos una acción fue realizada).');
}

// CLI solo si se ejecuta directamente (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}`) {
    const networkName = process.argv[2];
    if (!networkName) {
        console.error('❌ Debes proporcionar el nombre de la red. Ejemplo: ts-node cleanNetwork.ts r1');
        process.exit(1);
    }
    cleanNetwork(networkName);
}
