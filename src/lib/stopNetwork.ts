// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName] = process.argv;
    stopNetwork(networkName).then(result => {
        if (result.success) {
            console.log(result.message);
            process.exit(0);
        } else {
            console.error(result.message);
            process.exit(1);
        }
    });
}

/**
 * Detiene todos los nodos de una red específica.
 * @param networkName Nombre de la red a detener
 * @returns Resultado de la operación
 */
export async function stopNetwork(networkName: string): Promise<{ success: boolean; message: string }> {
    try {
        // Importar módulos según entorno solo dentro de la función
        let stopNodesModule, operationsModule;
        if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('stopNetwork.ts')) {
            stopNodesModule = await import('./stopNodes.ts');
            operationsModule = await import('./operations.ts');
        } else {
            stopNodesModule = await import('./stopNodes');
            operationsModule = await import('./operations');
        }
        // Obtiene todas las redes y busca la que coincide
        const networks = await operationsModule.getNetworks();
        const network = networks.find((n: any) => n.name === networkName);
        if (!network || !network.nodes || network.nodes.length === 0) {
            return { success: false, message: 'No se encontraron nodos en la red.' };
        }
        const results: string[] = [];
        const bootnodeRes = await stopNodesModule.stopBootnode(networkName);
        results.push(`[bootnode] ${bootnodeRes.message}`);
        const minerRes = await stopNodesModule.stopNodes(networkName, 'miner');
        results.push(`[miner] ${minerRes.message}`);
        const rpcRes = await stopNodesModule.stopNodes(networkName, 'rpc');
        results.push(`[rpc] ${rpcRes.message}`);
        const allOk = bootnodeRes.ok && minerRes.ok && rpcRes.ok;
        return { success: allOk, message: results.join(' | ') };
    } catch (error: any) {
        return { success: false, message: `Error al detener la red: ${error.message}` };
    }
}
