import { ConnectionProfile, Role } from '../../../types/fabric';

export const NETWORK_CONFIG = {
    channelName: 'supply-chain-channel',
    chaincodeName: 'supply-chain-chaincode',
    chaincodeVersion: '3.0',
    organizations: {
        producer: 'ProducerMSP',
        factory: 'FactoryMSP',
        retailer: 'RetailerMSP',
        consumer: 'ConsumerMSP'
    },
    peers: {
        producer: 'peer0.producer.supplychain.com:7051',
        factory: 'peer0.factory.supplychain.com:8051',
        retailer: 'peer0.retailer.supplychain.com:9051',
        consumer: 'peer0.consumer.supplychain.com:10051'
    },
    cas: {
        producer: 'ca.producer.supplychain.com:7054',
        factory: 'ca.factory.supplychain.com:8054',
        retailer: 'ca.retailer.supplychain.com:9054',
        consumer: 'ca.consumer.supplychain.com:10054'
    },
    orderer: 'orderer.supplychain.com:7050'
};

export async function getConnectionProfile(role: Role): Promise<ConnectionProfile> {
    // For now, return mock profile until we create all profiles
    const mockProfile: ConnectionProfile = {
        name: `supply-chain-network-${role}`,
        version: "1.0.0",
        client: {
            organization: role.charAt(0).toUpperCase() + role.slice(1),
            connection: {
                timeout: {
                    peer: {
                        endorser: "300"
                    }
                }
            }
        },
        organizations: {},
        peers: {},
        certificateAuthorities: {},
        channels: {},
        orderers: {}
    };

    return mockProfile;
}

export function getMSPId(role: Role): string {
    return NETWORK_CONFIG.organizations[role];
}

export function getPeerUrl(role: Role): string {
    return NETWORK_CONFIG.peers[role];
}

export function getCAUrl(role: Role): string {
    return NETWORK_CONFIG.cas[role];
}