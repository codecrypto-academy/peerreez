import { startNode } from './startNode';
import { getNetworks } from './operations';

export async function startNetwork(networkName: string) {
    // Obtiene todas las redes y filtra la deseada
    const networks = await getNetworks();
    const network = networks.find((n: any) => n.name === networkName);
    if (!network) throw new Error(`Red no encontrada: ${networkName}`);
    const nodes = network.nodes;
    // Arranca cada nodo
    const results = [];
    for (const node of nodes) {
        const res = await startNode(networkName, node.name);
        results.push({ node, res });
    }
    return results;
}
