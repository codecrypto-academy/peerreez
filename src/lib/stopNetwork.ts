import { stopNodes } from './stopNodes';
import { getNetworks } from './operations';

/**
 * Detiene todos los nodos de una red específica.
 * @param networkName Nombre de la red a detener
 * @returns Resultado de la operación
 */
export async function stopNetwork(networkName: string): Promise<{ success: boolean; message: string }> {
    try {
        // Obtiene todas las redes y busca la que coincide
        const networks = await getNetworks();
        const network = networks.find((n: any) => n.name === networkName);
        if (!network || !network.nodes || network.nodes.length === 0) {
            return { success: false, message: 'No se encontraron nodos en la red.' };
        }
        // Detiene bootnode, miner y rpc
        const results: string[] = [];
        const bootnodeRes = await (await import('./stopNodes')).stopBootnode(networkName);
        results.push(`[bootnode] ${bootnodeRes.message}`);
        const minerRes = await stopNodes(networkName, 'miner');
        results.push(`[miner] ${minerRes.message}`);
        const rpcRes = await stopNodes(networkName, 'rpc');
        results.push(`[rpc] ${rpcRes.message}`);
        const allOk = bootnodeRes.ok && minerRes.ok && rpcRes.ok;
        return { success: allOk, message: results.join(' | ') };
    } catch (error: any) {
        return { success: false, message: `Error al detener la red: ${error.message}` };
    }
}
