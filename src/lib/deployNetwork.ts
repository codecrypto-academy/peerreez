import { BesuDeployer, BesuNetworkOptions, BesuNodeConfig } from './besuDeployer.js';
import path from 'path';

const nodes: BesuNodeConfig[] = [
    {
        name: 'bootnode',
        ip: '172.30.0.20',
        type: 'bootnode',
        rpcPort: 8545,
        publicPort: 8888,
    },
    {
        name: 'miner',
        ip: '172.30.0.22',
        type: 'miner',
        rpcPort: 8546,
        publicPort: 8889,
    },
    // Puedes agregar nodos RPC adicionales aquí
];

const extraRpcNodes: BesuNodeConfig[] = [
    {
        name: 'rpc1',
        ip: '172.30.0.23',
        type: 'rpc',
        rpcPort: 7458,
        publicPort: 7458,
    },
    // Puedes agregar más nodos aquí
];

const options: BesuNetworkOptions = {
    networkName: 'mynet-network',
    subnet: '172.30.0.0/16',
    image: 'hyperledger/besu:latest',
    nodes,
    extraRpcNodes,
    baseDir: process.cwd(),
    genesisConfig: {
        config: {
            chainId: 554554,
            londonBlock: 0,
            clique: {
                blockperiodseconds: 4,
                epochlength: 30000,
                createemptyblocks: true,
            },
        },
        gasLimit: '0x1fffffffffffff',
        difficulty: '0x1',
    },
    mnemonic: 'test test test test test test test test test test test junk', // opcional
};

async function main() {
    const deployer = new BesuDeployer(options);
    await deployer.deploy();
}

main().catch(console.error);
