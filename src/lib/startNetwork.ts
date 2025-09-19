
// Import dinámico dentro de la función

export async function startNetwork(networkName: string) {
    // Importar módulos según entorno
    let startNodeModule, operationsModule;
    if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('startNetwork.ts')) {
        startNodeModule = await import('./startNode.ts');
        operationsModule = await import('./operations.ts');
    } else {
        startNodeModule = await import('./startNode');
        operationsModule = await import('./operations');
    }
    // Obtiene todas las redes y filtra la deseada
    const networks = await operationsModule.getNetworks();
    const network = networks.find((n: any) => n.name === networkName);
    if (!network) throw new Error(`Red no encontrada: ${networkName}`);
    const nodes = network.nodes;
    // Arranca cada nodo
    const results = [];
    for (const node of nodes) {
        const isBootnode = node.name.includes('bootnode');
        const res = await startNodeModule.startNode(networkName, node.name, isBootnode);
        results.push({ node, res });
    }
    return results;
}

// Permite ejecutar como CLI además de librería (compatible ES modules)
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === process.argv[1]) {
    const [, , networkName] = process.argv;
    startNetwork(networkName).then(results => {
        console.log('Resultados de arranque de nodos:');
        for (const { node, res } of results) {
            console.log(`Nodo: ${node.name} - ${res.message}`);
        }
        process.exit(0);
    }).catch(err => {
        console.error('Error al arrancar la red:', err);
        process.exit(1);
    });
}
