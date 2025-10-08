import { Role } from '../identity/identity-manager';

export interface PeerEndpoint {
    url: string;
    grpcOptions: {
        'grpc.ssl_target_name_override': string;
        'grpc.default_authority': string;
    };
}

export interface ConnectionConfig {
    channelName: string;
    chaincodeName: string;
    mspId: string;
    peerEndpoint: PeerEndpoint;
}

/**
 * Get connection configuration for a specific role
 */
export function getConnectionConfig(role: Role): ConnectionConfig {
    const configs: Record<Role, ConnectionConfig> = {
        Producer: {
            channelName: 'supply-chain-channel',
            chaincodeName: 'supply-chain-chaincode',
            mspId: 'ProducerMSP',
            peerEndpoint: {
                url: 'localhost:7051',
                grpcOptions: {
                    'grpc.ssl_target_name_override': 'peer0.producer.supplychain.com',
                    'grpc.default_authority': 'peer0.producer.supplychain.com',
                },
            },
        },
        Factory: {
            channelName: 'supply-chain-channel',
            chaincodeName: 'supply-chain-chaincode',
            mspId: 'FactoryMSP',
            peerEndpoint: {
                url: 'localhost:8051',
                grpcOptions: {
                    'grpc.ssl_target_name_override': 'peer0.factory.supplychain.com',
                    'grpc.default_authority': 'peer0.factory.supplychain.com',
                },
            },
        },
        Retailer: {
            channelName: 'supply-chain-channel',
            chaincodeName: 'supply-chain-chaincode',
            mspId: 'RetailerMSP',
            peerEndpoint: {
                url: 'localhost:9051',
                grpcOptions: {
                    'grpc.ssl_target_name_override': 'peer0.retailer.supplychain.com',
                    'grpc.default_authority': 'peer0.retailer.supplychain.com',
                },
            },
        },
        Consumer: {
            channelName: 'supply-chain-channel',
            chaincodeName: 'supply-chain-chaincode',
            mspId: 'ConsumerMSP',
            peerEndpoint: {
                url: 'localhost:10051',
                grpcOptions: {
                    'grpc.ssl_target_name_override': 'peer0.consumer.supplychain.com',
                    'grpc.default_authority': 'peer0.consumer.supplychain.com',
                },
            },
        },
    };

    return configs[role];
}
