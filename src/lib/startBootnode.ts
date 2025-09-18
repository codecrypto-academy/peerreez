import { startNode } from './startNode';
import { getNetworks } from './operations';

export async function startBootnode(networkName: string) {
    const networks = await getNetworks();
    const network = networks.find((n: any) => n.name === networkName);
    if (!network) throw new Error(`Red no encontrada: ${networkName}`);
    const bootnode = network.nodes.find((node: any) => node.name.includes('bootnode'));
    if (!bootnode) throw new Error('Bootnode no encontrado');
    return await startNode(networkName, bootnode.name, true);
}
